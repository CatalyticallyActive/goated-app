import React, { useState } from 'react';
import Layout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { debug } from '@/lib/utils';
import { PromptSchema, PromptType } from '@/lib/promptSchema';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

interface PromptTest {
  description: string;
  prompt_template: string;
  version?: string;
  variables?: Record<string, string>;
  result: string;
  isLoading: boolean;
}

const PromptTesting = () => {
  const { user: authUser } = useAuth();
  const { user: userData } = useUser();
  const { toast } = useToast();
  const [tests, setTests] = useState<PromptTest[]>(Array(5).fill({
    description: '',
    prompt_template: '',
    version: 'v1',
    variables: {},
    result: '',
    isLoading: false
  }));
  const [isRunningTests, setIsRunningTests] = useState(false);

  const captureScreenshot = async () => {
    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Create video element and wait for it to load
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const screenshotData = canvas.toDataURL('image/png');

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());

      // Save to Supabase
      const base64Data = screenshotData.replace(/^data:image\/[a-z]+;base64,/, '');
      const timestamp = Date.now();
      const filename = `${authUser?.id}/${timestamp}.png`;
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to temp-screenshots bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-screenshots')
        .upload(filename, binaryData, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('temp-screenshots')
        .getPublicUrl(filename);

      // Insert into temp-screenshots table
      const { data: dbData, error: insertError } = await supabase
        .from('temp-screenshots')
        .insert({
          screenshot_url: urlData.publicUrl,
          user_id: authUser?.id
        })
        .select()
        .single();

      if (insertError) {
        debug.error('Database insert error:', insertError);
        throw insertError;
      }

      return dbData;
    } catch (error) {
      debug.error('Failed to capture/save screenshot:', error);
      throw error;
    }
  };

  const validatePrompt = (test: PromptTest): PromptType | null => {
    try {
      return PromptSchema.parse({
        prompt_template: test.prompt_template,
        version: test.version,
        description: test.description || undefined,
        variables: {
          ...test.variables,
          trading_style: userData.tradingStyle || 'undefined',
          risk_tolerance: userData.riskTolerance || 'undefined',
          max_positions: userData.maxPositions || 'undefined',
          daily_loss_limit: userData.dailyLossLimit || 'undefined',
          timeframes: userData.timeframes || 'undefined',
          portfolio_size: userData.portfolioSize || 'undefined'
        }
      });
    } catch (error) {
      debug.error('Prompt validation error:', error);
      return null;
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    debug.log('Starting to run all tests:', tests);
    
    try {
      // First capture and save the screenshot
      const screenshotRecord = await captureScreenshot();
      debug.log('Screenshot saved:', screenshotRecord);

      // Set all tests to loading state
      const updatedTests = tests.map(test => ({
        ...test,
        isLoading: true
      }));
      setTests(updatedTests);

      // Filter out empty prompts and validate
      const validTests = tests
        .filter(test => test.prompt_template.trim())
        .map(test => validatePrompt(test))
        .filter((test): test is PromptType => test !== null);

      if (validTests.length === 0) {
        throw new Error('No valid prompts to test');
      }
      if (validTests.length > 5) {
        throw new Error('Maximum of 5 prompts allowed');
      }

      debug.log('Final structured prompts:', JSON.stringify(validTests, null, 2));

      // Normalize prompts and add debugging
      const normalizedTests = validTests.map((test, index) => {
        const originalPrompt = test.prompt_template || '';
        const normalizedPrompt = originalPrompt.replace(/\r\n/g, '\n');
        
        console.log(`Test ${index + 1} - Original contains \\r\\n:`, originalPrompt.includes('\r\n'));
        console.log(`Test ${index + 1} - Normalized contains \\r\\n:`, normalizedPrompt.includes('\r\n'));
        
        return {
          template: normalizedPrompt,
          structured_prompt: test
        };
      });

      // Call the edge function with all prompts
      const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
        body: {
          userId: authUser?.id,
          screenshot_id: screenshotRecord.id,
          prompts: normalizedTests
        }
      });

      if (error) throw error;

      // Update results
      const results = [...tests];
      validTests.forEach((test, index) => {
        const testIndex = tests.findIndex(t => t.prompt_template === test.prompt_template);
        if (testIndex !== -1) {
          results[testIndex] = {
            ...tests[testIndex],
            result: Array.isArray(data) ? data[index].insight : 'No result returned',
            isLoading: false
          };
        }
      });

      setTests(results);
    } catch (error) {
      debug.error('Error running tests:', error);
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : 'An error occurred while running tests',
        variant: "destructive"
      });
      // Reset loading state and show error
      setTests(tests.map(test => ({
        ...test,
        result: test.isLoading ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}` : test.result,
        isLoading: false
      })));
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleInputChange = (index: number, field: keyof PromptTest, value: string) => {
    const newTests = [...tests];
    if (field === 'prompt_template') {
      newTests[index] = { 
        ...newTests[index], 
        [field]: value,
        variables: extractVariables(value)
      };
    } else {
      newTests[index] = { ...newTests[index], [field]: value };
    }
    setTests(newTests);
  };

  // Helper function to extract variables from prompt template
  const extractVariables = (template: string): Record<string, string> => {
    const matches = template.match(/\{([^}]+)\}/g) || [];
    return matches.reduce((acc, match) => {
      const key = match.slice(1, -1); // Remove { and }
      return { ...acc, [key]: '' };
    }, {});
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="text-center mb-8">
          <h1 className="title-xl text-white mb-2">Prompt Testing</h1>
          <p className="subtitle">Test and compare different prompts</p>
        </div>

        <div className="flex justify-end mb-6">
          <Button
            onClick={runAllTests}
            disabled={isRunningTests || !tests.some(test => test.prompt_template.trim())}
            className="neon-blue"
          >
            {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>

        <div className="space-y-6">
          {tests.map((test, index) => (
            <Card key={index} className="glass-effect border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Test #{index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`description-${index}`} className="text-gray-300">Description</Label>
                  <Input
                    id={`description-${index}`}
                    value={test.description}
                    onChange={(e) => handleInputChange(index, 'description', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="Enter a description for this test"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`prompt-${index}`} className="text-gray-300">Prompt Template</Label>
                  <Textarea
                    id={`prompt-${index}`}
                    value={test.prompt_template}
                    onChange={(e) => handleInputChange(index, 'prompt_template', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="Enter your prompt template here (use {variable_name} for variables)"
                    rows={3}
                  />
                </div>

                {Object.keys(test.variables || {}).length > 0 && (
                  <div>
                    <Label className="text-gray-300">Variables Detected</Label>
                    <div className="mt-2 p-4 bg-white/5 border border-white/20 rounded-md">
                      <pre className="text-white whitespace-pre-wrap">
                        {JSON.stringify(test.variables, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {(test.result || test.isLoading) && (
                  <div>
                    <Label className="text-gray-300">Result</Label>
                    <div className="mt-2 p-4 bg-white/5 border border-white/20 rounded-md">
                      {test.isLoading ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      ) : (
                        <pre className="text-white whitespace-pre-wrap">{test.result}</pre>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PromptTesting; 