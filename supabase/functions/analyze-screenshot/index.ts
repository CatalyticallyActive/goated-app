import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.69.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Parse request body: expects { userId: string, screenshot_id: string (uuid) }
    const { userId, screenshot_id } = await req.json();

    if (!userId || !screenshot_id) {
      throw new Error('Missing userId or screenshot_id');
    }

    // Initialize Supabase client with service role (full access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch user settings
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new Error('User not found or settings missing');
    }

    const settings = userData.settings || {};

    // Fetch the storage path from the temp-screenshots table using screenshot_id
    const { data: screenshotData, error: screenshotError } = await supabase
      .from('temp_screenshots')
      .select('screenshot_url')  // Assuming there's a 'screenshot_url' column storing the public URL
      .eq('id', screenshot_id)
      .single();

    if (screenshotError || !screenshotData || !screenshotData.screenshot_url) {
      throw new Error('Failed to fetch screenshot URL');
    }

    const imageUrl = screenshotData.screenshot_url;

    // Build personalized system prompt
    const systemPrompt = `
You are a trading AI assistant personalized for the user.
User's trading preferences:
- Style: ${settings.trading_style || 'N/A'}
- Timeframes: ${settings.timeframes || 'N/A'}
- Portfolio size: ${settings.portfolio_size || 'N/A'}
- Risk tolerance: ${settings.risk_tolerance || 'N/A'}
- Max positions: ${settings.max_positions || 'N/A'}
- Daily loss limit: ${settings.daily_loss_limit || 'N/A'}
- Psychological flaws: ${settings.psychological_flaws || 'N/A'}
- Other instructions: ${settings.other_instructions || 'N/A'}

Analyze the screenshot of a trading screen. Categorize it as one of: [Chart], [Indicators], [Orderbook], or [General].
Provide one actionable insight (max 2 sentences) tailored to the user's preferences.
Include specific price levels, indicator values, or orderbook data if visible.
Always end with "Not financial advice".
`;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    });

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this trading screenshot:' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 300,
    });

    const rawOutput = response.choices[0].message.content || 'No analysis generated';

    // Parse category and insight (assuming analysis starts with [Category] followed by insight)
    const categoryMatch = rawOutput.match(/\[(Chart|Indicators|Orderbook|General)\]/);
    const category = categoryMatch ? categoryMatch[1] : 'General';
    const insight = rawOutput.replace(/\[(Chart|Indicators|Orderbook|General)\]/, '').trim();

    // Prepare parsed_analysis as JSONB
    const parsedAnalysis = {
      category,
      insight
    };

    // Store in llm_analyses table
    const { error: insertError } = await supabase.from('llm_analyses').insert({
      screenshot_id,
      llm_model_used: 'gpt-4o',
      user_id: userId,
      prompt_used: systemPrompt,
      llm_raw_output: rawOutput,
      parsed_analysis: parsedAnalysis,
      confidence_score: null  // Set to null for now; can add parsing logic later if needed
    });

    if (insertError) {
      throw new Error('Failed to insert analysis: ' + insertError.message);
    }

    // Return results
    return new Response(
      JSON.stringify({ category, insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});