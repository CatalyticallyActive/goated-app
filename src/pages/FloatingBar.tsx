import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

const SCREENSHOT_INTERVAL = 10000; // 10 seconds
const PROCESSING_BUFFER = 5000;  // 5 seconds buffer for backend processing
const POLLING_INTERVAL = SCREENSHOT_INTERVAL;
const INITIAL_DELAY = PROCESSING_BUFFER;

interface FloatingBarProps {
  pipMode?: boolean;
  onStopSharing?: () => void;
}

interface Analysis {
  id: string;
  analysis_timestamp: string;
  parsed_analysis: {
    insight: string;
  };
}

const FloatingBar: React.FC<FloatingBarProps> = ({ pipMode = false, onStopSharing }) => {
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
    if (!sessionStartTime) return;

    try {
      const { data, error } = await supabase
        .from('llm_analyses')
        .select('id, analysis_timestamp, parsed_analysis')
        .gt('analysis_timestamp', sessionStartTime)
        .order('analysis_timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching analyses:', error);
        return;
      }

      if (data && data.length > 0) {
        // Filter valid analyses
        const validAnalyses = data.filter(a => a.parsed_analysis?.insight);
        if (validAnalyses.length > 0) {
          // Merge new analyses with existing ones, avoiding duplicates
          setAnalyses(prevAnalyses => {
            const existingIds = new Set(prevAnalyses.map(a => a.id));
            const newAnalyses = validAnalyses.filter(a => !existingIds.has(a.id));
            return [...newAnalyses, ...prevAnalyses];
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    }
  };

  useEffect(() => {
    // Fetch immediately first
    fetchNewAnalyses();
    
    // Then start regular polling
    const interval = setInterval(fetchNewAnalyses, POLLING_INTERVAL);
    
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // PiP-optimized layout with main app styling
  if (pipMode) {
    return (
      <div 
        className="w-full h-full bg-background flex flex-col justify-center items-center relative overflow-hidden rounded-lg shadow-2xl border border-border/20"
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        {/* Header with controls */}
        <div 
          className="window-drag-handle absolute top-0 left-0 right-0 flex justify-between items-center px-3 py-2 bg-card/80 backdrop-blur-md border-b select-none"
          onMouseDown={handleMouseDown}
          style={{ cursor: 'grab' }}
        >
          {/* Logo and Live indicator */}
          <div className="flex items-center space-x-3">
            <img 
              src="/images/Goated Final Logo.png" 
              alt="Goated AI" 
              className="h-4 w-auto"
              draggable={false}
            />
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] text-emerald-500 font-medium">LIVE</span>
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
        
        {/* Main content */}
        <div className="w-full h-full overflow-y-auto pt-10">
          <div className="space-y-2">
            {analyses.length === 0 && (
              <div className="text-[10px] text-muted-foreground text-center p-2">
                Waiting for first analysis...
              </div>
            )}
            {analyses.map((analysis) => (
              <div 
                key={analysis.id} 
                className="bg-card/95 backdrop-blur border rounded-md p-2 shadow-sm"
              >
                <div className="text-[10px] text-card-foreground leading-normal">
                  {analysis.parsed_analysis.insight}
                </div>
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