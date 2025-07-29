import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { screenShareService } from '@/lib/ScreenShareService';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { supabase } from '@/lib/supabaseClient';
import FloatingBar from './FloatingBar';
import { useToast } from '@/hooks/use-toast';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { debug } from '@/lib/utils';
import { PromptSchema, PromptType } from '@/lib/promptSchema';
import { useUser } from '@/context/UserContext';

const Analysis = () => {
  const { user: authUser, session } = useAuth();
  const { user: userData } = useUser();  // Add this line to get user preferences
  const [isSharing, setIsSharing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const floatingBarRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Convert screenshot_interval from seconds to milliseconds, default to 10 seconds
  const screenshotIntervalMs = (userData?.screenshot_interval || 10) * 1000;

  const screenshot = useScreenCapture(
    isSharing ? screenShareService.getStream() : null, 
    screenshotIntervalMs
  );

  useEffect(() => {
    if (isSharing) {
      // Show interval info when sharing starts
      const intervalSeconds = screenshotIntervalMs / 1000;
      toast({
        title: "Analysis Interval",
        description: `Taking screenshots every ${intervalSeconds} seconds`,
      });
    }
  }, [isSharing, screenshotIntervalMs]);

  // Updated saveScreenshotToSupabase (copied/adapted from Settings.tsx)
  const saveScreenshotToSupabase = async (screenshotData: string, userId: string) => {
    try {
      // Extract base64 data (remove data:image/png;base64, prefix)
      const base64Data = screenshotData.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Convert base64 to binary data for upload
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Generate unique file path
      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}.png`;
      
      debug.log('Attempting to upload screenshot to temp-screenshots bucket...');
      
      // Upload to temp-screenshots bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-screenshots')
        .upload(filePath, binaryData, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        debug.error('Error uploading screenshot to storage:', uploadError);
        throw uploadError;
      }

      debug.log('Screenshot uploaded successfully:', uploadData);

      // Get public URL using the correct path
      const { data: urlData } = supabase.storage
        .from('temp-screenshots')
        .getPublicUrl(uploadData.path);

      debug.log('Public URL generated:', urlData.publicUrl);

      // Insert record with the correct URL
      const { data: dbData, error: dbError } = await supabase
        .from('temp-screenshots')  // Use hyphenated name to match what's in Supabase
        .insert({
          user_id: userId,
          screenshot_url: urlData.publicUrl,
          captured_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        debug.error('Database insert failed:', dbError);
        debug.error('Error details:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        throw dbError;
      }

      debug.log('Screenshot saved to database:', dbData);
      return dbData;

    } catch (error) {
      debug.error('Failed to save screenshot to Supabase:', error);
      throw error;
    }
  };

  // Handler for Start GoatedAI button
  const handleStartGoatedAI = async () => {
    setIsStarting(true);
    debug.log('Starting GoatedAI...');
    
    try {
      // Store session start time with 1 second buffer
      const sessionStartTime = new Date(Date.now() - 1000).toISOString();
      localStorage.setItem('goatedai_session_start', sessionStartTime);
      
      // First, create the PiP window while we still have user activation
      let pipWin: Window | null = null;
      if ('documentPictureInPicture' in window) {
        debug.log('Document PiP API is supported, creating PiP window...');
        try {
          pipWin = await window.documentPictureInPicture!.requestWindow({
            width: 520,
            height: 120,
            initialAspectRatio: 520 / 120
          });
          debug.log('PiP window created:', pipWin);
          setPipWindow(pipWin);
        } catch (error) {
          debug.error('Failed to create PiP window:', error);
          toast({
            title: "Feature Error",
            description: "Failed to create Picture-in-Picture window. Please try again.",
            variant: "destructive"
          });
          setIsStarting(false);
          return;
        }
      } else {
        debug.log('Document PiP API not supported');
        toast({
          title: "Browser Support",
          description: "Your browser does not support Document Picture-in-Picture.",
          variant: "destructive"
        });
        setIsStarting(false);
        return;
      }
      
      // Then start screen sharing
      const stream = await screenShareService.startCapture();
      if (stream) {
        debug.log('Screen sharing started successfully');
        setIsSharing(true);
        toast({
          title: "Screen Sharing Started",
          description: "GoatedAI is now analyzing your trading screen.",
        });
      } else {
        debug.log('Screen sharing failed or was cancelled');
        // Close the PiP window if screen sharing failed
        if (pipWin && !pipWin.closed) {
          pipWin.close();
          setPipWindow(null);
        }
        localStorage.removeItem('goatedai_session_start'); // Clean up session time if failed
        toast({
          title: "Screen Sharing",
          description: "Screen sharing failed or was cancelled.",
          variant: "destructive"
        });
      }
    } catch (error) {
      debug.error('Error starting GoatedAI:', error);
      toast({
        title: "Error",
        description: "Failed to start GoatedAI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Handler for stopping screen sharing
  const handleStopGoatedAI = useCallback(() => {
    debug.log('Stopping GoatedAI...');
    screenShareService.stopCapture();
    setIsSharing(false);
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
      setPipWindow(null);
    }
    localStorage.removeItem('goatedai_session_start');
    toast({
      title: "Screen Sharing Stopped",
      description: "GoatedAI analysis has been stopped.",
    });
  }, [pipWindow, toast]);

  // Render the floating bar into the PiP window when it opens
  React.useEffect(() => {
    debug.log('PiP window useEffect triggered, pipWindow:', pipWindow);
    if (pipWindow && floatingBarRef.current) {
      debug.log('Setting up PiP window content...');
      // Clear the PiP window and add necessary styles
      pipWindow.document.body.innerHTML = '';
      
      // Copy all styles from the main window
      const styles = Array.from(document.styleSheets).map(styleSheet => {
        try {
          const cssRules = Array.from(styleSheet.cssRules || styleSheet.rules || [])
            .map(rule => rule.cssText)
            .join('\n');
          return cssRules;
        } catch (e) {
          // If we can't access the rules (e.g., for external stylesheets), copy the link instead
          if (styleSheet.href) {
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
          return '';
        }
      }).filter(Boolean);

      // Combine and inject all accessible styles
      const combinedStyles = pipWindow.document.createElement('style');
      combinedStyles.textContent = styles.join('\n');
      pipWindow.document.head.appendChild(combinedStyles);
      
      // Add base styles
      const style = pipWindow.document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; background: #000; }
        .pip-window { background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #000000 100%); }
        .pip-backdrop-blur { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        .pip-glow-border { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.2); }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
      `;
      pipWindow.document.head.appendChild(style);
      
      // Create and append a root div for React
      const mount = pipWindow.document.createElement('div');
      mount.id = 'pip-root';
      mount.className = 'w-full h-full bg-background';
      pipWindow.document.body.appendChild(mount);
      
      // Render the FloatingBar component into the PiP window
      import('react-dom/client').then(ReactDOMClient => {
        const { createRoot } = ReactDOMClient;
        if (typeof createRoot === 'function') {
          createRoot(mount).render(
            <FloatingBar 
              pipMode={true} 
              onStopSharing={handleStopGoatedAI} 
            />
          );
        }
      });
    }
  }, [pipWindow, handleStopGoatedAI]);

  // Analyze screenshots when they're captured
  useEffect(() => {
    let cancelled = false;
    async function analyze() {
      if (screenshot && !cancelled && isSharing) {  // Only analyze if we're still sharing
        debug.log('Screenshot captured, starting analysis...');
        debug.log('Screenshot data length:', screenshot.length);
        
        try {
          if (authUser?.id) {
            const dbData = await saveScreenshotToSupabase(screenshot, authUser.id);
            
            if (dbData) {
              const screenshotId = typeof dbData === 'string' ? dbData : dbData.id;

              // Fetch user settings for variables
              const { data: userSettingsData, error: userError } = await supabase
                .from('users')
                .select('settings')
                .eq('id', authUser.id)
                .single()
                .setHeader('Accept', 'application/json');

              if (userError) {
                throw new Error('Failed to fetch user settings');
              }

              const settings = userSettingsData?.settings || {};

              // Fetch the user's prompt or fall back to system prompt
              const { data: userPromptData, error: userPromptError } = await supabase
                .from('prompts')
                .select('id, prompt_template, version, description, structured_prompt, created_at')
                .eq('user_id', authUser.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
                .setHeader('Accept', 'application/json');

              debug.log('User prompt data:', userPromptData);
              if (userPromptError) {
                debug.error('Error fetching user prompt:', userPromptError);
              }

              let promptData;
              if (userPromptData && userPromptData.prompt_template) {
                debug.log('Using user prompt:', userPromptData);
                promptData = userPromptData;
              } else {
                debug.log('Falling back to system prompt');
                const { data: systemPromptData, error: systemPromptError } = await supabase
                  .from('prompts')
                  .select('id, prompt_template, version, description, structured_prompt, created_at')
                  .is('user_id', null)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()  // Changed from single() to maybeSingle()
                  .setHeader('Accept', 'application/json');

                debug.log('Raw system prompt response:', {
                  data: systemPromptData,
                  error: systemPromptError,
                  type: typeof systemPromptData,
                  isArray: Array.isArray(systemPromptData)
                });

                if (systemPromptError) {
                  debug.error('Error fetching system prompt:', systemPromptError);
                  throw new Error('Failed to fetch system prompt');
                }

                if (!systemPromptData) {
                  debug.error('No system prompt found');
                  throw new Error('No system prompt found in database');
                }

                if (!systemPromptData.prompt_template) {
                  debug.error('System prompt found but missing template:', systemPromptData);
                  throw new Error('System prompt is missing template');
                }

                promptData = {
                  id: systemPromptData.id,
                  prompt_template: systemPromptData.prompt_template,
                  version: systemPromptData.version || 'v1.0',
                  description: systemPromptData.description || 'Initial standard system prompt for all users',
                  structured_prompt: systemPromptData.structured_prompt || null
                };

                debug.log('Constructed system prompt data:', promptData);
              }

              debug.log('Final prompt data before validation:', {
                id: promptData.id,
                prompt_template: promptData.prompt_template,
                prompt_template_length: promptData.prompt_template?.length,
                version: promptData.version,
                description: promptData.description,
                structured_prompt: promptData.structured_prompt
              });

              // Validate and structure the prompt
              let structuredPrompt: PromptType;
              try {
                if (!promptData.prompt_template) {
                  throw new Error('Prompt template is empty');
                }

                structuredPrompt = PromptSchema.parse({
                  prompt_template: promptData.prompt_template,
                  version: promptData.version || undefined,
                  description: promptData.description || undefined,
                  variables: {
                    ...(promptData.structured_prompt?.variables || {}),
                    trading_style: settings.tradingStyle || userData.tradingStyle || 'undefined',
                    risk_tolerance: settings.riskTolerance || userData.riskTolerance || 'undefined',
                    max_positions: settings.maxPositions || userData.maxPositions || 'undefined',
                    daily_loss_limit: settings.dailyLossLimit || userData.dailyLossLimit || 'undefined',
                    timeframes: settings.timeframes || userData.timeframes || 'undefined',
                    portfolio_size: settings.portfolioSize || userData.portfolioSize || 'undefined'
                  }
                });

                debug.log('Final structured prompt:', JSON.stringify(structuredPrompt, null, 2));
              } catch (error) {
                debug.error('Prompt validation error:', error);
                debug.error('Prompt data that failed validation:', promptData);
                throw new Error('Invalid prompt structure');
              }
              
              // Normalize prompt template - convert Windows line endings to Unix
              const originalPrompt = structuredPrompt.prompt_template || '';
              const normalizedPrompt = originalPrompt.replace(/\r\n/g, '\n');
              
              // Debug logging to verify normalization
              console.log('Original Prompt (first 200 chars):', originalPrompt.substring(0, 200));
              console.log('Normalized Prompt (first 200 chars):', normalizedPrompt.substring(0, 200));
              console.log('Contains \\r\\n before normalization:', originalPrompt.includes('\r\n'));
              console.log('Contains \\r\\n after normalization:', normalizedPrompt.includes('\r\n'));
              
              const body = { 
                userId: authUser.id, 
                screenshot_id: screenshotId,
                prompts: [{
                  prompt_template: normalizedPrompt,
                  version: structuredPrompt.version,
                  description: structuredPrompt.description,
                  variables: structuredPrompt.variables
                }]
              };

              debug.log('Sending to edge function:', JSON.stringify(body, null, 2));
              
              try {
                const response = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-screenshot`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${session?.access_token}`,
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    body: JSON.stringify(body)
                  }
                );

                if (!response.ok) {
                  const errorText = await response.text();
                  debug.error('Edge function error response:', errorText);
                  throw new Error(`Edge function returned ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                debug.log('Analysis response:', data);
                toast({
                  title: 'Analysis Complete',
                  description: 'Screenshot analyzed successfully.',
                });
              } catch (error) {
                debug.error('Failed to invoke analyze-screenshot:', error);
                debug.error('Error details:', {
                  message: error.message,
                  name: error.name,
                  status: error.status,
                  stack: error.stack
                });
                toast({
                  title: 'Analysis Failed',
                  description: 'Unable to analyze screenshot. Please try again.',
                  variant: 'destructive'
                });
              }
            } else {
              debug.error('No screenshot data returned from upload');
            }
          }
        } catch (error) {
          debug.error('Error processing screenshot:', error);
          toast({
            title: 'Analysis Error',
            description: error instanceof Error ? error.message : 'An error occurred during analysis',
            variant: 'destructive'
          });
        }
      }
    }
    if (screenshot && isSharing) {
      analyze();
    }
    return () => { 
      cancelled = true;
      debug.log('Cleaning up analysis effect');
    };
  }, [screenshot, authUser?.id, session, toast, userData, isSharing]);  // Add isSharing to dependencies

  return (
    <Layout>
      {/* Hidden floating bar container for PiP */}
      <div ref={floatingBarRef} style={{ display: 'none' }} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mt-12 mb-20">
          <Button 
            className="neon-blue px-8 py-3 text-lg" 
            onClick={handleStartGoatedAI} 
            disabled={isSharing || isStarting}
          >
            {isStarting ? 'Starting...' : isSharing ? 'Sharing...' : 'Start Goated AI'}
          </Button>
          
          {isSharing && (
            <div className="mt-4">
              <Button 
                className="neon-blue" 
                variant="outline" 
                onClick={handleStopGoatedAI}
              >
                Stop Sharing
              </Button>
            </div>
          )}
        </div>

        {/* Add Analysis History */}
        {authUser && <AnalysisHistory userId={authUser.id} />}
      </div>
    </Layout>
  );
};

export default Analysis; 