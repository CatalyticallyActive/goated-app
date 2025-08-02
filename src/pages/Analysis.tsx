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
  const [screenshotCount, setScreenshotCount] = useState(0);
  const floatingBarRef = React.useRef<HTMLDivElement>(null);
  const pipRootRef = React.useRef<any>(null); // Store React root for PiP window
  const { toast } = useToast();

  // Configuration for auto-stop (will be user configurable later)
  const MAX_SCREENSHOTS = 100;

  // Convert screenshot_interval from seconds to milliseconds, default to 30 seconds
  const screenshotIntervalMs = (userData?.screenshot_interval || 30) * 1000;

  const screenshot = useScreenCapture(
    isSharing ? screenShareService.getStream() : null, 
    screenshotIntervalMs
  );

  useEffect(() => {
    if (isSharing) {
      // Analysis started - no popup needed
      const intervalSeconds = screenshotIntervalMs / 1000;
      debug.log(`Analysis interval: Taking screenshots every ${intervalSeconds} seconds`);
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
      try {
        debug.log('Creating PiP window using ScreenShareService...');
        pipWin = await screenShareService.createPiPWindow();
        debug.log('PiP window created:', pipWin);
        setPipWindow(pipWin);
      } catch (error) {
        debug.error('Failed to create PiP window:', error);
        const isUnsupportedError = error instanceof Error && error.message.includes('not supported');
        toast({
          title: isUnsupportedError ? "Browser Support" : "Feature Error",
          description: isUnsupportedError 
            ? "Your browser does not support Document Picture-in-Picture."
            : "Failed to create Picture-in-Picture window. Please try again.",
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
        setScreenshotCount(0); // Reset screenshot counter when starting
        // Screen sharing started - no popup needed
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
  const handleStopGoatedAI = useCallback(async () => {
    debug.log('Stopping GoatedAI...');
    debug.log('Setting isSharing to false...');
    setIsSharing(false);
    
    // Update PiP with isActive=false FIRST to stop polling
    if (pipRootRef.current && pipWindow && !pipWindow.closed) {
      debug.log('Stopping PiP polling before closing...');
      pipRootRef.current.render(
        <FloatingBar 
          pipMode={true} 
          onStopSharing={handleStopGoatedAI}
          isActive={false}  // Force stop polling
          userId={authUser?.id}
        />
      );
      
      // Wait a moment for the polling to stop
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    debug.log('Stopping screen capture...');
    screenShareService.stopCapture();
    
    if (pipWindow && !pipWindow.closed) {
      debug.log('Closing PiP window...');
      pipWindow.close();
      setPipWindow(null);
    }
    
    localStorage.removeItem('goatedai_session_start');
    debug.log('GoatedAI stopped completely');
    // Screen sharing stopped - no popup needed
  }, [pipWindow, authUser?.id]);

  // Set up PiP window DOM structure once when window opens
  React.useEffect(() => {
    if (pipWindow && !pipRootRef.current) {
      debug.log('Setting up PiP window DOM structure...');
      
      // Clear body content
      pipWindow.document.body.innerHTML = '';
      
      // Add Tailwind CSS link - detect correct path for production vs development
      const tailwindLink = pipWindow.document.createElement('link');
      tailwindLink.rel = 'stylesheet';
      
      // In production, find the built CSS file; in development, use source file
      if (import.meta.env.PROD) {
        // In production, look for the built CSS in the document's existing links
        const existingCssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const mainCssLink = existingCssLinks.find(link => 
          link.href.includes('index') && link.href.includes('.css')
        );
        tailwindLink.href = mainCssLink?.href || '/assets/index.css'; // fallback
      } else {
        tailwindLink.href = '/src/index.css'; // development path
      }
      
      pipWindow.document.head.appendChild(tailwindLink);
      
      // Create React mount point
      const mount = pipWindow.document.createElement('div');
      mount.id = 'pip-root';
      pipWindow.document.body.appendChild(mount);
      
      // Create React root and render FloatingBar
      import('react-dom/client').then(ReactDOMClient => {
        const { createRoot } = ReactDOMClient;
        if (typeof createRoot === 'function') {
          pipRootRef.current = createRoot(mount);
          pipRootRef.current.render(
            <FloatingBar 
              pipMode={true} 
              onStopSharing={handleStopGoatedAI}
              isActive={isSharing}
              userId={authUser?.id}
            />
          );
        }
      });
    }

    // Clean up when PiP window closes
    return () => {
      if (!pipWindow) {
        pipRootRef.current = null;
        debug.log('PiP window closed, cleaned up React root');
      }
    };
  }, [pipWindow]);

  // Update FloatingBar props when isSharing changes
  React.useEffect(() => {
    if (pipRootRef.current && pipWindow) {
      debug.log(`Updating PiP FloatingBar with isActive=${isSharing}`);
      pipRootRef.current.render(
        <FloatingBar 
          pipMode={true} 
          onStopSharing={handleStopGoatedAI}
          isActive={isSharing}
          userId={authUser?.id}
        />
      );
    }
  }, [isSharing, handleStopGoatedAI, authUser?.id, pipWindow]);

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
                .maybeSingle()
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
                prompt: normalizedPrompt
              };

              debug.log('Sending to edge function:', JSON.stringify(body, null, 2));
              debug.log('Request details:', {
                userId: authUser.id,
                screenshot_id: screenshotId,
                promptLength: normalizedPrompt?.length,
                promptPreview: normalizedPrompt?.substring(0, 100)
              });
              
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
                
                // Increment screenshot counter and check for auto-stop
                const newCount = screenshotCount + 1;
                setScreenshotCount(newCount);
                debug.log(`Screenshot ${newCount}/${MAX_SCREENSHOTS} completed`);
                
                if (newCount >= MAX_SCREENSHOTS) {
                  debug.log(`Reached maximum screenshots (${MAX_SCREENSHOTS}), auto-stopping GoatedAI...`);
                  handleStopGoatedAI();
                  toast({
                    title: "Auto-Stop",
                    description: `GoatedAI automatically stopped after ${MAX_SCREENSHOTS} screenshots.`,
                    variant: "default"
                  });
                }
                
                // Analysis completed silently - no popup needed
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
  }, [screenshot, authUser?.id, session, toast, userData, isSharing, screenshotCount, handleStopGoatedAI]);  // Add dependencies

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