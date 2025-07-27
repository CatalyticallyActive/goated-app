import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.69.0/mod.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Max-Age': '86400'
};
async function processAnalysis(supabase, openai, userId, screenshot_id, imageUrl, promptData, settings) {
  let promptTemplate = promptData.prompt_template;
  promptTemplate = promptTemplate.replace('{trading_style}', settings.trading_style || 'N/A').replace('{timeframes}', settings.timeframes || 'N/A').replace('{portfolio_size}', settings.portfolio_size || 'N/A').replace('{risk_tolerance}', settings.risk_tolerance || 'N/A').replace('{max_positions}', settings.max_positions || 'N/A').replace('{daily_loss_limit}', settings.daily_loss_limit || 'N/A').replace('{psychological_flaws}', settings.psychological_flaws || 'N/A').replace('{other_instructions}', settings.other_instructions || 'N/A');
  // Add more replacements if you expand settings (e.g., .replace('{holding_period}', settings.holding_period || 'N/A'))
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: promptTemplate
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
    ],
    max_tokens: 1000  // Increased from 300 to 1000
  });
  const rawOutput = response.choices[0].message.content || 'No analysis generated';
  // Check for the specific refusal messages and skip insertion if found
  const lowerOutput = rawOutput.trim().toLowerCase();
  if (lowerOutput.includes("i'm sorry, i can't help with that") || lowerOutput.includes("i'm sorry, i can't assist with the request")) {
    return {
      promptId: promptData.id,
      rawOutput,
      category: "General",
      insight: "No valid analysis generated",
      parsedAnalysis: {
        category: "General",
        insight: "No valid analysis generated"
      }
    };
  }
  // Parse category and insight
  const categoryMatch = rawOutput.match(/\[(Chart|Indicators|Orderbook|General)\]/);
  const category = categoryMatch ? categoryMatch[1] : 'General';
  const insight = rawOutput.replace(/\[(Chart|Indicators|Orderbook|General)\]/, '').trim();
  // Prepare parsed_analysis as JSONB
  const parsedAnalysis = {
    category,
    insight
  };
  return {
    promptId: promptData.id,
    rawOutput,
    category,
    insight,
    parsedAnalysis
  };
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
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
    // Parse request body: expects { userId: string, screenshot_id: string (uuid), prompts?: array }
    const { userId, screenshot_id, prompts } = await req.json();
    if (!userId || !screenshot_id) {
      throw new Error('Missing userId or screenshot_id');
    }
    // Initialize Supabase client with service role (full access)
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // Fetch user settings and role
    const { data: userData, error: userError } = await supabase.from('users').select('settings, role').eq('id', userId).single();
    if (userError || !userData) {
      throw new Error('User not found or settings missing');
    }
    const settings = userData.settings || {};
    // For batch mode, check if user is admin
    if (prompts && userData.role !== 'admin') {
      throw new Error('Batch processing is available to admins only');
    }
    // Fetch the screenshot URL from temp-screenshots table
    const { data: screenshotData, error: screenshotError } = await supabase.from('temp-screenshots').select('screenshot_url').eq('id', screenshot_id).single();
    if (screenshotError || !screenshotData || !screenshotData.screenshot_url) {
      throw new Error('Failed to fetch screenshot URL');
    }
    const imageUrl = screenshotData.screenshot_url;
    // Prepare prompt list
    let promptList = [];
    if (prompts && Array.isArray(prompts) && prompts.length > 0) {
      // Batch mode: up to 5 prompts
      if (prompts.length > 5) {
        throw new Error('Maximum of 5 prompts allowed for batch processing');
      }
      for (const p of prompts){
        if (p.id) {
          // Fetch by ID from DB
          const { data: promptData, error: promptError } = await supabase.from('prompts').select('id, prompt_template').eq('id', p.id).single();
          if (promptError || !promptData) {
            throw new Error(`Failed to fetch prompt with ID ${p.id}`);
          }
          promptList.push(promptData);
        } else if (p.template) {
          // Inline template for testing (no DB fetch, id null)
          promptList.push({
            id: null,
            prompt_template: p.template
          });
        } else {
          throw new Error('Invalid prompt format: must provide id or template');
        }
      }
    } else {
      // Single mode: Fetch user-specific or system prompt
      let promptId;
      let promptTemplate;
      const { data: userPromptData, error: userPromptError } = await supabase.from('prompts').select('id, prompt_template').eq('user_id', userId).order('created_at', {
        ascending: false
      }).limit(1).single();
      if (userPromptData && userPromptData.prompt_template) {
        promptId = userPromptData.id;
        promptTemplate = userPromptData.prompt_template;
      } else {
        const { data: systemPromptData, error: systemPromptError } = await supabase.from('prompts').select('id, prompt_template').is('user_id', null).order('created_at', {
          ascending: false
        }).limit(1).single();
        if (systemPromptError || !systemPromptData || !systemPromptData.prompt_template) {
          throw new Error('Failed to fetch prompt template');
        }
        promptId = systemPromptData.id;
        promptTemplate = systemPromptData.prompt_template;
      }
      promptList = [
        {
          id: promptId,
          prompt_template: promptTemplate
        }
      ];
    }
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });
    // Process in parallel
    const results = await Promise.all(promptList.map((p)=>processAnalysis(supabase, openai, userId, screenshot_id, imageUrl, p, settings)));
    // Batch insert to DB (skip if promptId is null for inline tests)
    const inserts = results.filter((r)=>r.promptId !== null).map((r)=>({
        screenshot_id,
        llm_model_used: 'gpt-4o',
        user_id: userId,
        prompt_used: promptList.find((p)=>p.id === r.promptId)?.prompt_template,
        prompt_id: r.promptId,
        llm_raw_output: r.rawOutput,
        parsed_analysis: r.parsedAnalysis,
        confidence_score: null // Set to null for now; can add parsing logic later if needed
      }));
    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('llm_analyses').insert(inserts);
      if (insertError) {
        throw new Error('Failed to insert analyses: ' + insertError.message);
      }
    }
    // Return results: array for batch, single object for non-batch
    const responseData = prompts ? results.map((r)=>({
        category: r.category,
        insight: r.insight
      })) : {
      category: results[0].category,
      insight: results[0].insight
    };
    // Return results with CORS headers
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error(error);
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
