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
  // Use the prompt directly as provided by the frontend
  const messages = [
    {
      role: 'system',
      content: prompt
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this trading screenshot:'
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        }
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
      category: 'General',
      insight: 'No valid analysis generated',
      parsedAnalysis: {
        category: 'General',
        insight: 'No valid analysis generated'
      }
    };
  }
  const categoryMatch = rawOutput.match(/\[(Chart|Indicators|Orderbook|General)\]/);
  const category = categoryMatch ? categoryMatch[1] : 'General';
  const insight = rawOutput.replace(/\[(Chart|Indicators|Orderbook|General)\]/, '').trim();
  const parsedAnalysis = {
    category,
    insight
  };
  return {
    promptId: null,
    rawOutput,
    category,
    insight,
    parsedAnalysis
  };
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  }
  try {
    // Log request headers and body for debugging
    console.log('Received request headers:', Object.fromEntries(req.headers));
    const bodyText = await req.text();
    console.log('Raw body received:', bodyText);
    let body = {};
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        console.error('Body parse error:', e);
        throw new Error('Invalid JSON body');
      }
    } else {
      throw new Error('Empty request body');
    }
    const { userId, screenshot_id, prompt, prompts } = body;
    if (!userId || !screenshot_id) {
      throw new Error('Missing userId or screenshot_id');
    }
    // Initialize Supabase client with anon key
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authentication required');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid or missing authentication token');
    if (userId !== user.id) throw new Error('User ID mismatch');
    // Check admin role for batch mode
    const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', userId).single();
    if (userError || !userData) throw new Error('User not found');
    if (prompts && userData.role !== 'admin') {
      throw new Error('Batch processing is available to admins only');
    }
    // Fetch screenshot URL
    const { data: screenshotData, error: screenshotError } = await supabase.from('temp-screenshots').select('screenshot_url').eq('id', screenshot_id).single();
    if (screenshotError || !screenshotData || !screenshotData.screenshot_url) {
      throw new Error('Failed to fetch screenshot URL');
    }
    const imageUrl = screenshotData.screenshot_url;
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });
    // Process prompts (single or batch)
    let results;
    if (prompts && Array.isArray(prompts) && prompts.length > 0) {
      if (prompts.length > 5) throw new Error('Maximum of 5 prompts allowed');
      results = await Promise.all(prompts.map((p)=>processAnalysis(supabase, openai, userId, screenshot_id, imageUrl, p)));
    } else {
      if (!prompt) throw new Error('Missing prompt for single mode');
      results = [
        await processAnalysis(supabase, openai, userId, screenshot_id, imageUrl, prompt)
      ];
    }
    // Store results in llm_analyses (no prompts table updates)
    const inserts = results.filter((r)=>r.rawOutput !== 'No analysis generated').map((r)=>({
        screenshot_id,
        llm_model_used: 'gpt-4o',
        user_id: userId,
        prompt_used: prompts ? prompts[results.indexOf(r)] : prompt,
        prompt_id: null,
        llm_raw_output: r.rawOutput,
        parsed_analysis: r.parsedAnalysis,
        confidence_score: null
      }));
    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('llm_analyses').insert(inserts);
      if (insertError) throw new Error('Failed to insert analyses: ' + insertError.message);
    }
    // Return results
    const responseData = prompts ? results.map((r)=>({
        category: r.category,
        insight: r.insight
      })) : {
      category: results[0].category,
      insight: results[0].insight
    };
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
