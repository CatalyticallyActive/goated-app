const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You will receive a screenshot from a trading platform.

### 🔷 Output Format:

1. Start with the correct category in square brackets: [Chart], [Indicators], [Orderbook], or [General]  
2. Then, write **one short actionable insight** (max 2 sentences) using clear, professional language  
3. If visible in the image, include:
   - Exact price levels
   - Key indicator values
   - Orderbook imbalances or liquidity zones
4. Use simple logic that can be understood by a serious retail trader
5. Never include more than one insight
6. Never use generic statements
7. Always end with: **"Not financial advice."**

---

### 🔷 Examples:

✅ [Chart] BTC forming an ascending triangle above $62,500 with decreasing downside wicks; watch for breakout on volume surge. Not financial advice.

✅ [Indicators] RSI at 78 on the 15m chart and showing divergence vs price action; overextension likely. Not financial advice.

✅ [Orderbook] Thick buy wall at $31,000 with low ask liquidity above; potential short squeeze setup forming. Not financial advice.

✅ [General] Funding turning negative on ETH while price holds strong above support; sentiment is shifting bearish too quickly. Not financial advice.

---

### ❌ Never do this:
- ❌ No bullet points
- ❌ No explanations of what RSI or Orderbook is
- ❌ No long descriptions of the chart
- ❌ Never say "it seems" or "maybe" or "looks like"
- ❌ Don't include more than one idea

---

Your only job is to look at the screenshot and return the single strongest trading insight in the correct format.`;

export async function getVisionInsight(base64Image: string): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not set in VITE_OPENAI_API_KEY');
    throw new Error('OpenAI API key not set in VITE_OPENAI_API_KEY');
  }
  
  console.log('Starting OpenAI Vision analysis...');
  console.log('API Key available:', !!OPENAI_API_KEY);
  console.log('Image data length:', base64Image.length);
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this trading screenshot and return one insight in the required format.'
        },
        {
          type: 'image_url',
          image_url: {
            url: base64Image
          }
        }
      ]
    }
  ];
  
  const body = {
    model: 'gpt-4o',
    messages,
    max_tokens: 256,
    temperature: 0.2
  };
  
  try {
    console.log('Sending request to OpenAI...');
    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    
    console.log('OpenAI response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    console.log('OpenAI response data:', data);
    
    const insight = data.choices?.[0]?.message?.content;
    console.log('Extracted insight:', insight);
    
    return insight || null;
  } catch (err) {
    console.error('OpenAI Vision API error:', err);
    return null;
  }
} 