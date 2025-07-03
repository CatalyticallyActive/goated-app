import React, { useState, useEffect } from 'react';

const categories = [
  { key: 'chart', label: 'Chart' },
  { key: 'indicators', label: 'Indicators' },
  { key: 'orderbook', label: 'Orderbook' },
  { key: 'general', label: 'General' },
];

const FloatingBar: React.FC = () => {
  const [selected, setSelected] = useState('chart');
  const [insight, setInsight] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    // Read from localStorage on mount
    const storedInsight = localStorage.getItem('goatedai_latest_insight');
    const storedCategory = localStorage.getItem('goatedai_latest_category');
    console.log('FloatingBar: Reading from localStorage:', { storedInsight, storedCategory });
    setInsight(storedInsight);
    setCategory(storedCategory);
    
    // Listen for storage events
    const onStorage = () => {
      const newInsight = localStorage.getItem('goatedai_latest_insight');
      const newCategory = localStorage.getItem('goatedai_latest_category');
      console.log('FloatingBar: Storage event triggered:', { newInsight, newCategory });
      setInsight(newInsight);
      setCategory(newCategory);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Show the latest insight if its category matches the selected one
  const showInsight = category && category.toLowerCase() === selected ? insight : null;
  console.log('FloatingBar: Current state:', { selected, category, insight, showInsight });

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