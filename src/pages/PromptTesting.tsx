import React, { useState } from 'react';
import Layout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { debug } from '@/lib/utils';
import { PromptSchema, PromptType } from '@/lib/promptSchema';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

interface PromptTest {
  prompt: string;
  variables?: Record<string, string>;
  result?: string;
  isLoading?: boolean;
  [key: string]: string | Record<string, string> | boolean | undefined;
}

const PromptTesting = () => {
  const { user: authUser } = useAuth();
  const { user: userData } = useUser();
  const { toast } = useToast();
  const [tests, setTests] = useState<PromptTest[]>([
    { prompt: '', variables: {} },
    { prompt: '', variables: {} },
    { prompt: '', variables: {} }
  ]);
  const [globalFields, setGlobalFields] = useState<Record<string, string>>({ 
    system_prompt: '' 
  });
  const [screenshotId, setScreenshotId] = useState('');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [newGlobalField, setNewGlobalField] = useState('');
  const [newTestFields, setNewTestFields] = useState<Record<number, string>>({});

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

  // Helper functions for managing tests and fields
  const addTestSlot = () => {
    if (tests.length < 10) {
      setTests([...tests, { prompt: '', variables: {} }]);
    }
  };

  const removeTest = (index: number) => {
    if (tests.length > 1) {
      const newTests = tests.filter((_, i) => i !== index);
      setTests(newTests);
    }
  };

  const duplicateTest = (index: number) => {
    if (tests.length < 10) {
      const testToDuplicate = { ...tests[index] };
      const newTests = [...tests];
      newTests.splice(index + 1, 0, testToDuplicate);
      setTests(newTests);
    }
  };

  const clearAllTests = () => {
    setTests([{ prompt: '', variables: {} }]);
  };

  const updateTest = (index: number, field: string, value: string | Record<string, string>) => {
    const newTests = [...tests];
    newTests[index] = { ...newTests[index], [field]: value };
    if (field === 'prompt') {
      newTests[index].variables = extractVariables(value as string);
    }
    setTests(newTests);
  };

  const addField = (index: number, fieldName: string) => {
    if (fieldName.trim()) {
      updateTest(index, fieldName, '');
      setNewTestFields({ ...newTestFields, [index]: '' });
    }
  };

  const removeField = (index: number, fieldName: string) => {
    const newTests = [...tests];
    const { [fieldName]: removed, ...rest } = newTests[index];
    newTests[index] = rest;
    setTests(newTests);
  };

  const addGlobalField = (fieldName: string) => {
    if (fieldName.trim() && !globalFields[fieldName]) {
      setGlobalFields({ ...globalFields, [fieldName]: '' });
      setNewGlobalField('');
    }
  };

  const updateGlobalField = (field: string, value: string) => {
    setGlobalFields({ ...globalFields, [field]: value });
  };

  const removeGlobalField = (fieldName: string) => {
    if (fieldName !== 'system_prompt') { // Keep system_prompt as default
      const { [fieldName]: removed, ...rest } = globalFields;
      setGlobalFields(rest);
    }
  };

  // Helper function to extract variables from prompt template
  const extractVariables = (template: string): Record<string, string> => {
    const matches = template.match(/\{([^}]+)\}/g) || [];
    return matches.reduce((acc, match) => {
      const key = match.slice(1, -1); // Remove { and }
      return { ...acc, [key]: '' };
    }, {});
  };

  const runTests = async () => {
    setIsRunningTests(true);
    
    try {
      // First capture and save the screenshot
      const screenshotRecord = await captureScreenshot();
      setScreenshotId(screenshotRecord.id);
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

      // Call the new edge function for batch testing
      const { data, error } = await supabase.functions.invoke('test-prompts', {
        body: {
          userId: authUser?.id,
          screenshot_id: screenshotRecord.id,
          prompts: validTests,
          global: globalFields
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to run tests');
      }

      // Update results
      const results = tests.map((test, index) => {
        const validTestIndex = validTests.findIndex(vt => vt.prompt === test.prompt);
        if (validTestIndex !== -1 && data && data[validTestIndex]) {
          return {
            ...test,
            result: data[validTestIndex].insight || 'No result returned',
            isLoading: false
          };
        } else {
          return {
            ...test,
            result: test.prompt.trim() ? 'No result returned' : '',
            isLoading: false
          };
        }
      });

      setTests(results);

      toast({
        title: "Tests Completed",
        description: `Successfully ran ${validTests.length} test(s)`,
        variant: "default"
      });

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

  const savePrompt = async (test: PromptTest) => {
    if (!test.prompt.trim()) {
      toast({
        title: "Save Error",
        description: "Cannot save empty prompt",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.from('prompts').insert({
        user_id: authUser?.id,
        prompt_template: test.prompt,
        version: (test.version as string) || 'v1',
        description: (test.description as string) || '',
        structured_prompt: {
          ...test,
          prompt: undefined // Remove prompt from structured_prompt as it's stored separately
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Prompt Saved",
        description: "Prompt has been saved successfully",
        variant: "default"
      });
    } catch (error) {
      debug.error('Failed to save prompt:', error);
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : 'Failed to save prompt',
        variant: "destructive"
      });
    }
  };



  return (
    <Layout>
      <div className="container py-8">
        <div className="text-center mb-8">
          <h1 className="title-xl text-white mb-2">Enhanced Prompt Testing</h1>
          <p className="subtitle">Test and compare different prompts with flexible configurations</p>
        </div>

        {/* Global Fields Section */}
        <Card className="glass-effect border border-blue/30 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              🌐 Global Configuration
              <Badge variant="secondary">Applied to all tests</Badge>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Fields applied to all test prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(globalFields).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-gray-300 capitalize">{key.replace('_', ' ')}</Label>
                  <Textarea 
                    value={value}
                    onChange={(e) => updateGlobalField(key, e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder={`Enter ${key.replace('_', ' ')}...`}
                    rows={3}
                  />
                </div>
                {key !== 'system_prompt' && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeGlobalField(key)}
                    className="mt-6 text-red-400 hover:text-red-300"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            
            {/* Add new global field */}
            <div className="flex gap-2">
              <Input 
                value={newGlobalField}
                onChange={(e) => setNewGlobalField(e.target.value)}
                placeholder="New global field name (e.g., 'context', 'instructions')"
                className="bg-white/5 border-white/20 text-white focus:border-white/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGlobalField.trim()) {
                    addGlobalField(newGlobalField);
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addGlobalField(newGlobalField)}
                disabled={!newGlobalField.trim() || globalFields[newGlobalField]}
              >
                + Add Field
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Slots */}
        <div className="space-y-6">
          {tests.map((test, index) => (
            <Card key={index} className="glass-effect border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Test #{index + 1}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => duplicateTest(index)}>
                    📋 Duplicate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => savePrompt(test)}>
                    💾 Save
                  </Button>
                  {tests.length > 1 && (
                    <Button size="sm" variant="destructive" onClick={() => removeTest(index)}>
                      🗑️
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Core prompt field */}
                <div>
                  <Label className="text-gray-300">Prompt Template *</Label>
                  <Textarea 
                    value={test.prompt}
                    onChange={(e) => updateTest(index, 'prompt', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="Enter your prompt template... (use {variable_name} for variables)"
                    rows={4}
                  />
                </div>

                {/* Dynamic custom fields */}
                {Object.entries(test)
                  .filter(([key]) => !['prompt', 'variables', 'result', 'isLoading'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-gray-300 capitalize">{key.replace('_', ' ')}</Label>
                        <Input 
                          value={value as string}
                          onChange={(e) => updateTest(index, key, e.target.value)}
                          className="bg-white/5 border-white/20 text-white focus:border-white/40"
                          placeholder={`Enter ${key.replace('_', ' ')}...`}
                        />
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeField(index, key)}
                        className="mt-6 text-red-400 hover:text-red-300"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}

                {/* Add custom field */}
                <div className="flex gap-2">
                  <Input 
                    value={newTestFields[index] || ''}
                    onChange={(e) => setNewTestFields({ ...newTestFields, [index]: e.target.value })}
                    placeholder="New field name (e.g., 'description', 'category', 'version')"
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTestFields[index]?.trim()) {
                        addField(index, newTestFields[index]);
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => addField(index, newTestFields[index] || '')}
                    disabled={!newTestFields[index]?.trim()}
                  >
                    + Add Field
                  </Button>
                </div>

                {/* Auto-detected variables */}
                {Object.keys(test.variables || {}).length > 0 && (
                  <div>
                    <Label className="text-gray-300">🔧 Variables Detected</Label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(test.variables || {}).map(([key, value]) => (
                        <div key={key} className="flex gap-2 items-center">
                          <Badge variant="secondary" className="min-w-fit">{key}</Badge>
                          <Input 
                            value={value}
                            placeholder={`Value for {${key}}`}
                            onChange={(e) => updateTest(index, 'variables', { 
                              ...(test.variables || {}), 
                              [key]: e.target.value 
                            })}
                            className="bg-white/5 border-white/20 text-white text-sm focus:border-white/40"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results */}
                {(test.result || test.isLoading) && (
                  <div>
                    <Label className="text-gray-300">📊 Result</Label>
                    <div className="mt-2 p-4 bg-white/5 border border-white/20 rounded-md">
                      {test.isLoading ? (
                        <div className="flex justify-center items-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span className="text-white text-sm">Testing prompt...</span>
                        </div>
                      ) : (
                        <pre className="text-white whitespace-pre-wrap text-sm">{test.result}</pre>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mt-8">
          <div className="flex gap-2">
            <Button 
              onClick={addTestSlot} 
              disabled={tests.length >= 10}
              variant="outline"
            >
              + Add Test Slot ({tests.length}/10)
            </Button>
            <Button onClick={clearAllTests} variant="outline">
              🗑️ Clear All
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runTests} 
              disabled={!tests.some(t => t.prompt.trim()) || isRunningTests}
              className="neon-blue"
            >
              {isRunningTests ? 'Running Tests...' : '🚀 Run All Tests'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PromptTesting; 