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

interface PromptTest {
  description: string;
  prompt: string;
  result: string;
  isLoading: boolean;
}

const PromptTesting = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<PromptTest[]>(Array(5).fill({
    description: '',
    prompt: '',
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
      const filename = `${user?.id}/${timestamp}.png`;
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
          user_id: user?.id
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

      // Filter out empty prompts
      const validTests = tests.filter(test => test.prompt.trim());
      if (validTests.length === 0) {
        throw new Error('No valid prompts to test');
      }
      if (validTests.length > 5) {
        throw new Error('Maximum of 5 prompts allowed');
      }

      // Call the edge function with all prompts
      const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
        body: {
          userId: user?.id,
          screenshot_id: screenshotRecord.id,
          prompts: validTests.map(test => ({
            template: test.prompt
          }))
        }
      });

      if (error) throw error;

      // Update results
      const results = [...tests];
      validTests.forEach((test, index) => {
        const testIndex = tests.findIndex(t => t.prompt === test.prompt);
        if (testIndex !== -1) {
          results[testIndex] = {
            ...test,
            result: Array.isArray(data) ? data[index].insight : 'No result returned',
            isLoading: false
          };
        }
      });

      setTests(results);
    } catch (error) {
      debug.error('Error running tests:', error);
      // Reset loading state and show error
      setTests(tests.map(test => ({
        ...test,
        result: test.isLoading ? `Error: ${error.message}` : test.result,
        isLoading: false
      })));
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleInputChange = (index: number, field: keyof PromptTest, value: string) => {
    const newTests = [...tests];
    newTests[index] = { ...newTests[index], [field]: value };
    setTests(newTests);
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
            disabled={isRunningTests || !tests.some(test => test.prompt.trim())}
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
                  <Label htmlFor={`prompt-${index}`} className="text-gray-300">Prompt</Label>
                  <Textarea
                    id={`prompt-${index}`}
                    value={test.prompt}
                    onChange={(e) => handleInputChange(index, 'prompt', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="Enter your prompt here"
                    rows={3}
                  />
                </div>

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