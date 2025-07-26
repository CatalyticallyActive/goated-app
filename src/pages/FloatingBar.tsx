import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SCREENSHOT_INTERVAL = 10000; // 10 seconds
const PROCESSING_BUFFER = 5000;  // 5 seconds buffer for backend processing

// Use same interval as screenshots, but start fetching after buffer time
const POLLING_INTERVAL = SCREENSHOT_INTERVAL;
const INITIAL_DELAY = PROCESSING_BUFFER;

interface FloatingBarProps {
  pipMode?: boolean;
}

interface Analysis {
  id: string;
  analysis_timestamp: string;
  parsed_analysis: {
    insight: string;
  };
}

const FloatingBar: React.FC<FloatingBarProps> = ({ pipMode = false }) => {
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null);
  const sessionStartTime = localStorage.getItem('goatedai_session_start');

  const fetchNewAnalyses = async () => {
    if (!sessionStartTime) return;

    try {
      const { data, error } = await supabase
        .from('llm_analyses')
        .select('id, analysis_timestamp, parsed_analysis')
        .gt('analysis_timestamp', sessionStartTime)
        .order('analysis_timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching analyses:', error);
        return;
      }

      if (data?.[0] && data[0].parsed_analysis?.insight) {
        setLatestAnalysis(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    }
  };

  useEffect(() => {
    // Initial fetch after buffer time
    const initialFetchTimeout = setTimeout(() => {
      fetchNewAnalyses();
      // Then start regular polling
      const interval = setInterval(fetchNewAnalyses, POLLING_INTERVAL);
      return () => clearInterval(interval);
    }, INITIAL_DELAY);

    return () => clearTimeout(initialFetchTimeout);
  }, [sessionStartTime]);

  // PiP-optimized layout with main app styling
  if (pipMode) {
    return (
      <div className="w-full h-full bg-background flex flex-col justify-center items-center p-3 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => window.close()}
          className="absolute top-2 right-2 w-6 h-6 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-sm font-bold transition-colors"
          title="Close"
        >
          ×
        </button>
        
        {/* Main content */}
        <div className="w-full relative">
          {/* Header */}
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-primary tracking-wide">GOATED AI</span>
            </div>
          </div>
          
          {/* Analysis display */}
          <div className="bg-card/95 backdrop-blur border rounded-lg p-4 shadow-lg">
            <div className="text-sm text-card-foreground leading-relaxed">
              {latestAnalysis ? (
                <div className="animate-fadeIn">
                  {latestAnalysis.parsed_analysis.insight}
                </div>
              ) : (
                <div className="text-muted-foreground text-center">
                  Waiting for analysis...
                </div>
              )}
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center justify-center mt-3 space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-500 font-medium">LIVE</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular window fallback (shouldn't be used)
  return null;
};

export default FloatingBar; 