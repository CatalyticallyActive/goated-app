import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { screenShareService } from '@/lib/ScreenShareService';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import FloatingBar from '@/pages/FloatingBar';

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
      console.log('Attempting to upload screenshot to temp-screenshots bucket...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-screenshots')
        .upload(filename, binaryData, { contentType: 'image/png', upsert: false });
      if (uploadError) {
        console.error('Error uploading screenshot to storage:', uploadError);
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('400')) {
          throw new Error('Storage bucket not configured. Please contact support.');
        }
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('403')) {
          throw new Error('Access denied. Please check your permissions.');
        }
        throw uploadError;
      }
      console.log('Screenshot uploaded successfully:', uploadData);
      const { data: urlData } = supabase.storage.from('temp-screenshots').getPublicUrl(filename);
      console.log('Public URL generated:', urlData.publicUrl);
      let dbData = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('insert_screenshot', {
          p_screenshot_url: urlData.publicUrl,
          p_user_id: userId
        });
        if (rpcError) {
          console.error('RPC function not found, trying direct insert:', rpcError);
          const { data: directData, error: directError } = await supabase.from('temp_screenshots').insert({
            screenshot_url: urlData.publicUrl,
            status: 'received'
          }).select().single();
          if (directError) throw directError;
          dbData = directData;
          console.log('Screenshot saved via direct insert:', dbData);
        } else {
          dbData = rpcData;
          console.log('Screenshot saved via RPC:', dbData);
        }
      } catch (error) {
        console.error('All database insert methods failed:', error);
        console.log('Continuing with AI analysis despite database insert failure');
      }
      return dbData;
    } catch (error) {
      console.error('Failed to save screenshot to Supabase:', error);
      throw error;
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function analyze() {
      if (screenshot) {
        console.log('Screenshot captured, starting analysis...');
        console.log('Screenshot data length:', screenshot.length);
        
        try {
          if (authUser?.id) {
            const dbData = await saveScreenshotToSupabase(screenshot, authUser.id);
            
            if (dbData?.id) {
              const screenshotId = dbData.id;
              
              const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
                body: { userId: authUser.id, screenshot_id: screenshotId },
                headers: { Authorization: `Bearer ${session?.access_token}` },
                method: 'POST'
              });
              
              if (error) {
                console.error('Failed to invoke analyze-screenshot:', error);
                toast({
                  title: 'Analysis Failed',
                  description: 'Unable to analyze screenshot. Please try again.',
                  variant: 'destructive'
                });
              } else {
                console.log('Analysis response:', data);
              }
            } else {
              console.error('No screenshot ID returned from upload');
            }
          }
        } catch (error) {
          console.error('Error processing screenshot:', error);
        }
      }
    }
    analyze();
    return () => { cancelled = true; };
  }, [screenshot, authUser?.id, session, toast]);

  // Full handleStartGoatedAI
  const handleStartGoatedAI = async () => {
    console.log('Starting GoatedAI...');
    let pipWin: Window | null = null;
    if ('documentPictureInPicture' in window) {
      try {
        pipWin = await window.documentPictureInPicture!.requestWindow({ width: 520, height: 120 });
        console.log('PiP window created:', pipWin);
        setPipWindow(pipWin);
      } catch (error) {
        console.error('Failed to create PiP window:', error);
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
      }).catch(error => console.error('Failed to render PiP:', error));
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