import React, { useState, useEffect } from 'react';

const categories = [
  { key: 'chart', label: 'Chart' },
  { key: 'indicators', label: 'Indicators' },
  { key: 'orderbook', label: 'Orderbook' },
  { key: 'general', label: 'General' },
];

interface FloatingBarProps {
  pipMode?: boolean;
}

const FloatingBar: React.FC<FloatingBarProps> = ({ pipMode = false }) => {
  const [selected, setSelected] = useState('chart');
  const [insight, setInsight] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [isPiP, setIsPiP] = useState(false);

  useEffect(() => {
    // Check if we're in Picture-in-Picture mode
    const checkPiP = () => {
      try {
        if (window.documentPictureInPicture && window.documentPictureInPicture.window) {
          setIsPiP(true);
        }
      } catch (e) {
        setIsPiP(false);
      }
    };
    
    checkPiP();

    // Read from localStorage on mount
    const storedInsight = localStorage.getItem('goatedai_latest_insight');
    const storedCategory = localStorage.getItem('goatedai_latest_category');
    setInsight(storedInsight);
    setCategory(storedCategory);
    
    // Listen for storage events
    const onStorage = () => {
      const newInsight = localStorage.getItem('goatedai_latest_insight');
      const newCategory = localStorage.getItem('goatedai_latest_category');
      setInsight(newInsight);
      setCategory(newCategory);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Show the latest insight if its category matches the selected one
  const showInsight = category && category.toLowerCase() === selected ? insight : null;

  const handleClose = () => {
    if (window.opener) {
      window.close();
    }
  };

  // PiP-optimized layout with enhanced UI
  if (pipMode || isPiP) {
    return (
      <div className="w-full h-full pip-window flex flex-col justify-center items-center p-3 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
        </div>
        
        {/* Close button for PiP */}
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-lg z-10"
          title="Close PiP"
        >
          ×
        </button>
        
        {/* Main content container */}
        <div className="w-full max-w-sm relative z-10">
          {/* Header with logo/brand */}
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-blue-400 tracking-wide">GOATED AI</span>
            </div>
          </div>
          
          {/* Compact category buttons with better styling */}
          <div className="flex flex-wrap gap-1 justify-center mb-3">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelected(cat.key)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 focus:outline-none border ${
                  selected === cat.key 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md scale-105' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border-white/20 hover:border-white/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          {/* Enhanced insight display */}
          <div className="pip-backdrop-blur bg-black/40 border border-white/20 rounded-lg p-3 text-center min-h-[50px] flex items-center justify-center shadow-xl">
            <span className="text-xs font-medium text-white leading-relaxed">
              {showInsight ? (
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {showInsight}
                </span>
              ) : (
                <span className="text-gray-400">
                  [{categories.find(c => c.key === selected)?.label}] Waiting for analysis...
                </span>
              )}
            </span>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center justify-center mt-2 space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400 font-medium">LIVE</span>
            </div>
            <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-500/30">
              PiP Mode
            </span>
          </div>
        </div>
        
        {/* Subtle border glow */}
        <div className="absolute inset-0 rounded-lg pip-glow-border pointer-events-none"></div>
      </div>
    );
  }

  // Regular popup layout (fallback)
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'rgba(20,20,30,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="flex flex-col gap-4 items-center w-full max-w-xl">
        <div className="w-full flex flex-row gap-2 items-center justify-center">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelected(cat.key)}
              className={`px-4 py-2 rounded-full glass-effect border border-white/20 text-base font-medium transition-all duration-200 focus:outline-none min-w-[100px] max-w-[140px] w-auto text-center ${selected === cat.key ? 'bg-white/10 text-white border-white/40 shadow-md scale-105' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              style={{ margin: 0 }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="w-full mt-4 p-4 rounded-xl glass-effect border border-white/20 text-white text-center min-h-[80px] flex items-center justify-center shadow-lg">
          <span className="text-lg font-medium">
            {showInsight ? showInsight : `[${categories.find(c => c.key === selected)?.label}] Insight Placeholder`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FloatingBar; 