import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

const AnalysisDisplay = () => {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [latestAnalysis, setLatestAnalysis] = useState<{ category: string; insight: string } | null>(null);

  const fetchLatestAnalysis = async () => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('llm_analyses')
        .select('parsed_analysis')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.parsed_analysis) {
        setLatestAnalysis(data.parsed_analysis);
      } else {
        setLatestAnalysis(null);
      }
    } catch (error) {
      console.error('Failed to fetch latest analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to load latest analysis.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchLatestAnalysis();
    const interval = setInterval(fetchLatestAnalysis, 5000);
    return () => clearInterval(interval);
  }, [authUser?.id]);

  if (!latestAnalysis) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg border border-gray-600 shadow-lg">
      <h3 className="font-bold mb-2">[{latestAnalysis.category}]</h3>
      <p>{latestAnalysis.insight}</p>
    </div>
  );
};

export default AnalysisDisplay; 