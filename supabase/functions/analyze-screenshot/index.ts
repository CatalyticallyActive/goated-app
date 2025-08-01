import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.69.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Max-Age': '86400'
};

async function processAnalysis(supabase, openai, userId, screenshot_id, imageUrl, prompt) {
  console.log('Received Prompt:', prompt); // Debugging log
  // Normalize the prompt by replacing \r\n with \n
  const normalizedPrompt = prompt.replace(/\r\n/g, '\n');
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: normalizedPrompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ];
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 1000
  });
  const rawOutput = response.choices[0].message.content || 'No analysis generated';
  const lowerOutput = rawOutput.trim().toLowerCase();
  if (lowerOutput.includes("i'm sorry, i can't help with that") || lowerOutput.includes("i'm sorry, i can't assist with the request")) {
    return {
      promptId: null,
      rawOutput,
      insight: 'No valid analysis generated',
      parsedAnalysis: { insight: 'No valid analysis generated' }
    };
  }
  // Use the raw output as the insight (no category parsing)
  const insight = rawOutput.trim();
  const parsedAnalysis = { insight };
  return { promptId: null, rawOutput, insight, parsedAnalysis };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
  }

  try {
    console.log('Received request headers:', Object.fromEntries(req.headers));
    const bodyText = await req.text();
    console.log('Raw body received:', bodyText);
    if (!bodyText) throw new Error('Empty request body');

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.error('Body parse error:', e);
      throw new Error('Invalid JSON body');
    }

    const { userId, screenshot_id, prompt } = body;
    if (!userId || !screenshot_id || !prompt) {
      throw new Error('Missing userId, screenshot_id, or prompt');
    }

    const supabase = createClient(Deno.env.get('VITE_SUPABASE_URL'), Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY'));
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authentication required');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user || userId !== user.id) throw new Error('Invalid or missing authentication token');

    const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', userId).single();
    if (userError || !userData) throw new Error('User not found');

    const { data: screenshotData, error: screenshotError } = await supabase.from('temp-screenshots').select('screenshot_url').eq('id', screenshot_id).single();
    if (screenshotError || !screenshotData || !screenshotData.screenshot_url) {
      throw new Error('Failed to fetch screenshot URL');
    }
    const imageUrl = screenshotData.screenshot_url;

    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split('/storage/v1/object/public/temp-screenshots/');
    let storagePath;
    if (pathParts.length > 1) {
      storagePath = pathParts[1];
    } else {
      throw new Error('Unable to parse storage path from URL');
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('VITE_OPENAI_API_KEY') });
    const result = await processAnalysis(supabase, openai, userId, screenshot_id, imageUrl, prompt);

    if (result.rawOutput !== 'No analysis generated') {
      const insert = {
        screenshot_id,
        llm_model_used: 'gpt-4o',
        user_id: userId,
        prompt_used: prompt,
        prompt_id: null,
        llm_raw_output: result.rawOutput,
        parsed_analysis: result.parsedAnalysis,
        confidence_score: null
      };
      const { error: insertError } = await supabase.from('llm_analyses').insert([insert]);
      if (insertError) throw new Error('Failed to insert analysis: ' + insertError.message);
    }

    const { error: storageDeleteError } = await supabase.storage.from('temp-screenshots').remove([storagePath]);
    if (storageDeleteError) console.error('Failed to delete storage file:', storageDeleteError);

    const { error: rowDeleteError } = await supabase.from('temp-screenshots').delete().eq('id', screenshot_id);
    if (rowDeleteError) console.error('Failed to delete database row:', rowDeleteError);

    const responseData = {
      insight: result.insight
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});