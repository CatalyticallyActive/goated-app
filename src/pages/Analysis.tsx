import React, { useState, useEffect } from 'react';
import Layout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { screenShareService } from '@/lib/ScreenShareService';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { getVisionInsight } from '@/lib/openaiVision';
import { supabase } from '@/lib/supabaseClient';
import FloatingBar from './FloatingBar';

const Analysis = () => {
  const { user: authUser } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const floatingBarRef = React.useRef<HTMLDivElement>(null);

  const screenshot = useScreenCapture(isSharing ? screenShareService.getStream() : null, 10000);

  // Save screenshot to Supabase
  const saveScreenshotToSupabase = async (screenshotData: string, userId: string) => {
    try {
      const { data: dbData, error } = await supabase
        .from('screenshots')
        .insert({
          user_id: userId,
          screenshot_data: screenshotData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      return dbData;
    } catch (error) {
      console.error('Failed to save screenshot to Supabase:', error);
      throw error;
    }
  };

  // Handler for Start GoatedAI button
  const handleStartGoatedAI = async () => {
    console.log('Starting GoatedAI...');
    
    // First, create the PiP window while we still have user activation
    let pipWin: Window | null = null;
    if ('documentPictureInPicture' in window) {
      console.log('Document PiP API is supported, creating PiP window...');
      try {
        pipWin = await window.documentPictureInPicture!.requestWindow({
          width: 520,
          height: 120,
          initialAspectRatio: 520 / 120,
        });
        console.log('PiP window created:', pipWin);
        setPipWindow(pipWin);
      } catch (error) {
        console.error('Failed to create PiP window:', error);
        alert('Failed to create Picture-in-Picture window. Please try again.');
        return;
      }
    } else {
      console.log('Document PiP API not supported');
      alert('Your browser does not support Document Picture-in-Picture.');
      return;
    }
    
    // Then start screen sharing
    const stream = await screenShareService.startCapture();
    if (stream) {
      console.log('Screen sharing started successfully');
      setIsSharing(true);
    } else {
      console.log('Screen sharing failed or was cancelled');
      // Close the PiP window if screen sharing failed
      if (pipWin && !pipWin.closed) {
        pipWin.close();
        setPipWindow(null);
      }
      alert('Screen sharing failed or was cancelled.');
    }
  };

  // Handler for stopping screen sharing
  const handleStopGoatedAI = () => {
    screenShareService.stopCapture();
    setIsSharing(false);
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  // Render the floating bar into the PiP window when it opens
  React.useEffect(() => {
    console.log('PiP window useEffect triggered, pipWindow:', pipWindow);
    if (pipWindow && floatingBarRef.current) {
      console.log('Setting up PiP window content...');
      // Clear the PiP window and add necessary styles
      pipWindow.document.body.innerHTML = '';
      
      // Add Tailwind CSS to the PiP window
      const tailwindLink = pipWindow.document.createElement('link');
      tailwindLink.rel = 'stylesheet';
      tailwindLink.href = 'http://localhost:8080/src/index.css';
      pipWindow.document.head.appendChild(tailwindLink);
      console.log('Added Tailwind CSS to PiP window');
      
      // Add base styles
      const style = pipWindow.document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        .pip-window { background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #000000 100%); }
        .pip-backdrop-blur { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        .pip-glow-border { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.2); }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
      `;
      pipWindow.document.head.appendChild(style);
      console.log('Added base styles to PiP window');
      
      const mount = pipWindow.document.createElement('div');
      mount.id = 'pip-root';
      pipWindow.document.body.appendChild(mount);
      console.log('Created mount element in PiP window');
      
      // Render the FloatingBar component into the PiP window
      console.log('Importing react-dom/client and rendering FloatingBar...');
      import('react-dom/client').then(ReactDOMClient => {
        console.log('ReactDOMClient imported:', ReactDOMClient);
        const { createRoot } = ReactDOMClient;
        if (typeof createRoot === 'function') {
          console.log('Using createRoot...');
          createRoot(mount).render(<FloatingBar pipMode={true} />);
        } else {
          console.error('createRoot not found in react-dom/client');
        }
      }).catch(error => {
        console.error('Failed to import react-dom/client:', error);
      });
    }
  }, [pipWindow]);

  // Analyze screenshots when they're captured
  useEffect(() => {
    let cancelled = false;
    async function analyze() {
      if (screenshot) {
        console.log('Screenshot captured, starting analysis...');
        console.log('Screenshot data length:', screenshot.length);
        
        try {
          // First, save screenshot to Supabase
          if (authUser?.id) {
            await saveScreenshotToSupabase(screenshot, authUser.id);
          }
          
          // Then proceed with AI analysis
          const insight = await getVisionInsight(screenshot);
          if (!cancelled && insight) {
            console.log('Analysis completed, insight received:', insight);
            // Extract category from [Category] at start
            const match = insight.match(/^\[(Chart|Indicators|Orderbook|General)\]/i);
            const category = match ? match[1] : null;
            console.log('Extracted category:', category || 'none');
            // Pass to popup via localStorage (simple cross-window comms)
            localStorage.setItem('goatedai_latest_insight', insight);
            localStorage.setItem('goatedai_latest_category', category || '');
            console.log('Insight saved to localStorage');
            // Save to history
            const historyRaw = localStorage.getItem('goatedai_insight_history');
            let history = [];
            try { history = historyRaw ? JSON.parse(historyRaw) : []; } catch {}
            history.push({
              insight,
              category,
              timestamp: Date.now()
            });
            localStorage.setItem('goatedai_insight_history', JSON.stringify(history));
            console.log('Insight appended to history');
          } else if (!cancelled) {
            console.log('Analysis failed or returned null');
          }
        } catch (error) {
          console.error('Error processing screenshot:', error);
        }
      }
    }
    analyze();
    return () => { cancelled = true; };
  }, [screenshot, authUser?.id]);

  return (
    <Layout>
      {/* Hidden floating bar container for PiP */}
      <div ref={floatingBarRef} style={{ display: 'none' }} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Button 
            className="neon-blue px-8 py-3 text-lg" 
            onClick={handleStartGoatedAI} 
            disabled={isSharing}
          >
            {isSharing ? 'Sharing...' : 'Start Goated AI'}
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

        {/* Analysis History */}
        <Card className="glass-effect border border-white/20 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b border-white/20 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">Chart Analysis - EURUSD</h4>
                    <p className="text-gray-400 text-sm">AI identified bullish pattern</p>
                  </div>
                  <span className="text-gray-500 text-sm">2 hours ago</span>
                </div>
              </div>
              <div className="border-b border-white/20 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">Settings Updated</h4>
                    <p className="text-gray-400 text-sm">Risk tolerance changed to 7</p>
                  </div>
                  <span className="text-gray-500 text-sm">1 day ago</span>
                </div>
              </div>
              <div className="border-b border-white/20 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">Chart Analysis - BTCUSD</h4>
                    <p className="text-gray-400 text-sm">AI suggested position adjustment</p>
                  </div>
                  <span className="text-gray-500 text-sm">2 days ago</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Analysis; 