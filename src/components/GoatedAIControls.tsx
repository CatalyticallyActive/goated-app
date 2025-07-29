import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { screenShareService } from '@/lib/ScreenShareService';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import FloatingBar from '@/pages/FloatingBar';
import { debug } from '@/lib/utils';
import { PromptSchema } from '@/lib/promptSchema';

const GoatedAIControls = () => {
  const { user: authUser, session } = useAuth();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const floatingBarRef = React.useRef<HTMLDivElement>(null);

  const screenshot = useScreenCapture(isSharing ? screenShareService.getStream() : null, 10000);

  // Full saveScreenshotToSupabase
  const saveScreenshotToSupabase = async (screenshotData: string, userId: string) => {
    try {
      const base64Data = screenshotData.replace(/^data:image\/[a-z]+;base64,/, '');
      const timestamp = Date.now();
      const filename = `${userId}/${timestamp}.png`;
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      debug.log('Attempting to upload screenshot to temp-screenshots bucket...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-screenshots')
        .upload(filename, binaryData, { contentType: 'image/png', upsert: false });
      if (uploadError) {
        debug.error('Error uploading screenshot to storage:', uploadError);
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('400')) {
          throw new Error('Storage bucket not configured. Please contact support.');
        }
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('403')) {
          throw new Error('Access denied. Please check your permissions.');
        }
        throw uploadError;
      }
      debug.log('Screenshot uploaded successfully:', uploadData);
      const { data: urlData } = supabase.storage.from('temp-screenshots').getPublicUrl(filename);
      debug.log('Public URL generated:', urlData.publicUrl);
      let dbData = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('insert_screenshot', {
          p_screenshot_url: urlData.publicUrl,
          p_user_id: userId
        });
        if (rpcError) {
          debug.error('RPC function not found, trying direct insert:', rpcError);
          const { data: directData, error: directError } = await supabase.from('temp_screenshots').insert({
            screenshot_url: urlData.publicUrl,
            status: 'received'
          }).select().single();
          if (directError) throw directError;
          dbData = directData;
          debug.log('Screenshot saved via direct insert:', dbData);
        } else {
          dbData = rpcData;
          debug.log('Screenshot saved via RPC:', dbData);
        }
      } catch (error) {
        debug.error('All database insert methods failed:', error);
        debug.log('Continuing with AI analysis despite database insert failure');
      }
      return dbData;
    } catch (error) {
      debug.error('Failed to save screenshot to Supabase:', error);
      throw error;
    }
  };

  const processScreenshot = async (screenshot: string) => {
    try {
      debug.log('Screenshot captured, starting analysis...');
      debug.log('Screenshot data length:', screenshot.length);

      const screenshotData = await saveScreenshotToSupabase(screenshot, authUser?.id);
      if (!screenshotData) {
        debug.error('No screenshot ID returned from upload');
        return;
      }

      // Fetch user settings for variables
      const { data: userSettingsData, error: userError } = await supabase
        .from('users')
        .select('settings')
        .eq('id', authUser?.id)
        .single();

      if (userError) {
        throw new Error('Failed to fetch user settings');
      }

      const settings = userSettingsData?.settings || {};

      // Fetch the user's prompt or fall back to system prompt
      const { data: userPromptData, error: userPromptError } = await supabase
        .from('prompts')
        .select('id, prompt_template, version, description, structured_prompt, created_at')
        .eq('user_id', authUser?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let promptData;
      if (userPromptData && userPromptData.prompt_template) {
        promptData = userPromptData;
      } else {
        const { data: systemPromptData, error: systemPromptError } = await supabase
          .from('prompts')
          .select('id, prompt_template, version, description, structured_prompt, created_at')
          .is('user_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (systemPromptError || !systemPromptData?.prompt_template) {
          throw new Error('Failed to fetch system prompt');
        }

        promptData = {
          id: systemPromptData.id,
          prompt_template: systemPromptData.prompt_template,
          version: systemPromptData.version || 'v1.0',
          description: systemPromptData.description || 'Initial standard system prompt for all users',
          structured_prompt: systemPromptData.structured_prompt || null
        };
      }

      // Structure the prompt with user variables
      const structuredPrompt = PromptSchema.parse({
        prompt_template: promptData.prompt_template,
        version: promptData.version || undefined,
        description: promptData.description || undefined,
        variables: {
          ...(promptData.structured_prompt?.variables || {}),
          trading_style: settings.tradingStyle || 'undefined',
          risk_tolerance: settings.riskTolerance || 'undefined',
          max_positions: settings.maxPositions || 'undefined',
          daily_loss_limit: settings.dailyLossLimit || 'undefined',
          timeframes: settings.timeframes || 'undefined',
          portfolio_size: settings.portfolioSize || 'undefined'
        }
      });

      // Normalize prompt template - convert Windows line endings to Unix
      const originalPrompt = structuredPrompt.prompt_template || '';
      const normalizedPrompt = originalPrompt.replace(/\r\n/g, '\n');
      
      // Debug logging to verify normalization
      console.log('GoatedAI - Original contains \\r\\n:', originalPrompt.includes('\r\n'));
      console.log('GoatedAI - Normalized contains \\r\\n:', normalizedPrompt.includes('\r\n'));

      const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
        body: {
          userId: authUser?.id,
          screenshot_id: screenshotData.id,
          prompts: [{
            prompt_template: normalizedPrompt,
            version: structuredPrompt.version,
            description: structuredPrompt.description,
            variables: structuredPrompt.variables
          }]
        }
      });

      if (error) {
        debug.error('Failed to invoke analyze-screenshot:', error);
        toast({
          title: 'Analysis Failed',
          description: 'Unable to analyze screenshot. Please try again.',
          variant: 'destructive'
        });
      } else {
        debug.log('Analysis response:', data);
      }
    } catch (error) {
      debug.error('Error processing screenshot:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function analyze() {
      if (screenshot) {
        await processScreenshot(screenshot);
      }
    }
    analyze();
    return () => { cancelled = true; };
  }, [screenshot, authUser?.id, session, toast]);

  // Full handleStartGoatedAI
  const handleStartGoatedAI = async () => {
    debug.log('Starting GoatedAI...');
    let pipWin: Window | null = null;
    if ('documentPictureInPicture' in window) {
      try {
        pipWin = await window.documentPictureInPicture!.requestWindow({ width: 520, height: 120 });
        debug.log('PiP window created:', pipWin);
        setPipWindow(pipWin);
      } catch (error) {
        debug.error('Failed to create PiP window:', error);
        toast({ title: 'Error', description: 'Failed to create PiP window.', variant: 'destructive' });
        return;
      }
    } else {
      toast({ title: 'Unsupported', description: 'Your browser does not support PiP.', variant: 'destructive' });
      return;
    }
    const stream = await screenShareService.startCapture();
    if (stream) {
      setIsSharing(true);
    } else {
      if (pipWin && !pipWin.closed) pipWin.close();
      setPipWindow(null);
      toast({ title: 'Error', description: 'Screen sharing failed or was cancelled.', variant: 'destructive' });
    }
  };

  // Full handleStopGoatedAI
  const handleStopGoatedAI = () => {
    screenShareService.stopCapture();
    setIsSharing(false);
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  // Full PiP useEffect
  React.useEffect(() => {
    if (pipWindow && floatingBarRef.current) {
      pipWindow.document.body.innerHTML = '';
      const tailwindLink = pipWindow.document.createElement('link');
      tailwindLink.rel = 'stylesheet';
      tailwindLink.href = '/src/index.css';  // Adjust if needed for production
      pipWindow.document.head.appendChild(tailwindLink);
      const style = pipWindow.document.createElement('style');
      style.textContent = `* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: system-ui; } /* ... other styles ... */`;
      pipWindow.document.head.appendChild(style);
      const mount = pipWindow.document.createElement('div');
      mount.id = 'pip-root';
      pipWindow.document.body.appendChild(mount);
      import('react-dom/client').then(ReactDOMClient => {
        ReactDOMClient.createRoot(mount).render(<FloatingBar pipMode={true} />);
      }).catch(error => debug.error('Failed to render PiP:', error));
    }
  }, [pipWindow]);

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-white mb-4">Goated AI Controls</h2>
      <Button
        onClick={isSharing ? handleStopGoatedAI : handleStartGoatedAI}
        className="neon-blue"
      >
        {isSharing ? 'Stop GoatedAI' : 'Start GoatedAI'}
      </Button>
      <div ref={floatingBarRef} style={{ display: 'none' }} />
    </div>
  );
};

export default GoatedAIControls; 