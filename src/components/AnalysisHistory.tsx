import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

interface Analysis {
  id: string;
  analysis_timestamp: string;
  parsed_analysis: any;
  confidence_score: number;
}

interface AnalysisHistoryProps {
  userId: string;
}

const ITEMS_PER_PAGE = 20;

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ userId }) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalyses = async (page: number) => {
    setIsLoading(true);
    try {
      // First get the total count
      const { count } = await supabase
        .from('llm_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Calculate total pages
      const total = count || 0;
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));

      // Fetch the actual data for the current page
      const { data, error } = await supabase
        .from('llm_analyses')
        .select('id, analysis_timestamp, parsed_analysis, confidence_score')
        .eq('user_id', userId)
        .order('analysis_timestamp', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses(currentPage);
  }, [currentPage, userId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && <PaginationEllipsis />}
            </>
          )}
          
          {pages}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <PaginationEllipsis />}
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Analysis History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No analysis history found
          </div>
        ) : (
          <div className="space-y-6">
            {analyses.map((analysis) => (
              <Card key={analysis.id} className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-sm text-gray-500">
                    {format(new Date(analysis.analysis_timestamp), 'MMM d, yyyy HH:mm:ss')}
                  </div>
                  {analysis.confidence_score && (
                    <div className="text-sm text-gray-500">
                      Confidence: {analysis.confidence_score}%
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-base leading-relaxed">
                    {typeof analysis.parsed_analysis === 'object' && 
                     analysis.parsed_analysis.insight && 
                     typeof analysis.parsed_analysis.insight === 'string' 
                       ? analysis.parsed_analysis.insight.replace(/^"(.*)"$/, '$1')  // Remove quotes if present
                       : ''}
                  </div>
                </div>
              </Card>
            ))}
            <div className="mt-4">
              {renderPagination()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 