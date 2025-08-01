import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { debug } from '@/lib/utils';

const SCREENSHOT_INTERVAL = 30000; // 30 seconds
const PROCESSING_BUFFER = 5000;  // 5 seconds buffer for backend processing
const POLLING_INTERVAL = 2000;   // 2 seconds - faster polling for responsiveness
const INITIAL_DELAY = PROCESSING_BUFFER;

interface FloatingBarProps {
  pipMode?: boolean;
  onStopSharing?: () => void;
  isActive?: boolean; // Control whether to poll for analyses
  userId?: string; // User ID passed from parent (needed for PiP context)
}

interface Analysis {
  id: string;
  analysis_timestamp: string;
  parsed_analysis: {
    insight: string;
  };
}

const FloatingBar: React.FC<FloatingBarProps> = ({ pipMode = false, onStopSharing, isActive = true, userId }) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const sessionStartTime = localStorage.getItem('goatedai_session_start');
  const [isDragging, setIsDragging] = useState(false);

  // Dragging functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pipMode) return;
    
    // Only allow dragging from the header area
    const target = e.target as HTMLElement;
    if (!target.closest('.window-drag-handle')) return;

    setIsDragging(true);
    const win = window;
    const startX = e.screenX - win.screenX;
    const startY = e.screenY - win.screenY;

    const handleMouseMove = (e: MouseEvent) => {
      win.moveTo(e.screenX - startX, e.screenY - startY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [pipMode]);

  const fetchNewAnalyses = async () => {
    if (!sessionStartTime) {
      debug.log('FloatingBar: No sessionStartTime, skipping fetch');
      return;
    }

    if (!userId) {
      debug.log('FloatingBar: No user ID provided, skipping fetch');
      return;
    }

    try {
      debug.log(`FloatingBar: Fetching analyses for user ${userId} since ${sessionStartTime}`);
      
      // First, let's see ALL recent analyses for this user (last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: allRecentData } = await supabase
        .from('llm_analyses')
        .select('id, analysis_timestamp, parsed_analysis, user_id')
        .eq('user_id', userId)
        .gt('analysis_timestamp', tenMinutesAgo)
        .order('analysis_timestamp', { ascending: false });
      
      debug.log(`FloatingBar: Found ${allRecentData?.length || 0} analyses in last 10 minutes for user ${userId}`);
      if (allRecentData && allRecentData.length > 0) {
        allRecentData.forEach((analysis, i) => {
          debug.log(`  Analysis ${i+1}: ${analysis.analysis_timestamp} - ${analysis.parsed_analysis?.insight?.substring(0, 50)}...`);
        });
      }
      
      // Now the filtered query
      const { data, error } = await supabase
        .from('llm_analyses')
        .select('id, analysis_timestamp, parsed_analysis')
        .eq('user_id', userId)
        .gte('analysis_timestamp', sessionStartTime)  // Changed to gte (greater than or equal)
        .order('analysis_timestamp', { ascending: false });

      if (error) {
        debug.error('Error fetching analyses:', error);
        return;
      }

      debug.log(`FloatingBar: Fetched ${data?.length || 0} analyses since session start (${sessionStartTime})`);
      
      if (data && data.length > 0) {
        // Filter valid analyses
        const validAnalyses = data.filter(a => a.parsed_analysis?.insight);
        debug.log(`FloatingBar: ${validAnalyses.length} valid analyses found`);
        
        if (validAnalyses.length > 0) {
          // Merge new analyses with existing ones, avoiding duplicates
          setAnalyses(prevAnalyses => {
            const existingIds = new Set(prevAnalyses.map(a => a.id));
            const newAnalyses = validAnalyses.filter(a => !existingIds.has(a.id));
            debug.log(`FloatingBar: Adding ${newAnalyses.length} new analyses`);
            return [...newAnalyses, ...prevAnalyses];
          });
        }
      } else {
        debug.log('FloatingBar: No new analyses found');
      }
    } catch (error) {
      debug.error('Failed to fetch analyses:', error);
    }
  };

  useEffect(() => {
    debug.log(`FloatingBar: useEffect triggered - isActive=${isActive}, sessionStartTime=${sessionStartTime}, userId=${userId}`);
    
    // Only fetch if active and have session time
    if (!isActive || !sessionStartTime) {
      debug.log('FloatingBar: Not active or no session time, skipping polling');
      return;
    }

    debug.log('FloatingBar: Starting polling...');
    // Fetch immediately first
    fetchNewAnalyses();
    
    // Then start regular polling
    const interval = setInterval(fetchNewAnalyses, POLLING_INTERVAL);
    
    return () => {
      debug.log('FloatingBar: Cleaning up interval...');
      clearInterval(interval);
      debug.log('FloatingBar: Stopped polling');
    };
  }, [sessionStartTime, isActive, userId]);

  // PiP-optimized layout with frameless styling
  if (pipMode) {
    return (
      <div 
        className="pip-container w-full h-full bg-background flex flex-col relative"
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        {/* Header with controls - frameless optimized */}
        <div 
          className="window-drag-handle absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-2 bg-card/95 backdrop-blur-md select-none z-10"
          onMouseDown={handleMouseDown}
          style={{ cursor: 'grab' }}
        >
          {/* Logo and Live indicator */}
          <div className="flex items-center space-x-5">
            <img 
              src="/images/Goated Final Logo.png" 
              alt="Goated AI" 
              className="h-6 w-auto"
              draggable={false}
            />
            <div className="flex items-center space-x-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-500 font-medium">LIVE</span>
            </div>
          </div>
          
          {/* Controls */}
          <Button 
            onClick={onStopSharing}
            variant="outline"
            size="sm"
            className="h-6 text-xs"
          >
            Stop Sharing
          </Button>
        </div>
        
        {/* Main content - maintains scrolling for analyses */}
        <div className="w-full h-full overflow-y-auto pt-12" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-2">
            {analyses.length === 0 && (
              <div className="text-[10px] text-muted-foreground text-center p-2">
                Waiting for first analysis...
              </div>
            )}
            {analyses.map((analysis) => (
              <div 
                key={analysis.id} 
                className="bg-card/95 backdrop-blur border rounded-md p-2 mx-2 shadow-sm"
              >
                <pre className="text-[10px] text-card-foreground leading-normal whitespace-pre-wrap font-sans">
                  {analysis.parsed_analysis.insight}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Regular window fallback (shouldn't be used)
  return null;
};

export default FloatingBar; 