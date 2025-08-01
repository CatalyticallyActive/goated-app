# Goated AI

## Set it up on your machine

# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Document Picture-in-Picture API

## Features

## Main Feature Process
1. Fetch system prompt from database (user_id IS NULL)
2. Populate user variables (trading_style, risk_tolerance, etc.)
3. Send to Supabase edge function
4. Edge function → OpenAI with your database prompt

JSON prompt for ChatGPT APi:
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "Your prompt text from database goes here..."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text", 
          "text": "Analyze this trading screenshot:"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://supabase-storage-url/screenshot.png"
          }
        }
      ]
    }
  ],
  "max_tokens": 1000
}

### Picture-in-Picture Mode

The GoatedAI floating bar now supports Picture-in-Picture (PiP) mode using the Document Picture-in-Picture API. When you click "Start GoatedAI":

1. **Screen Sharing**: The browser prompts you to select a screen, window, or tab to share
2. **PiP Window**: A compact Picture-in-Picture window opens that stays on top of other applications
3. **Always Visible**: The PiP window remains visible even when you click elsewhere on your desktop
4. **Compact Interface**: Optimized layout for the small PiP window with AI insights display
5. **Easy Close**: Click the × button in the top-right corner to close the PiP window

**Browser Support**: The PiP feature works in modern browsers that support the Document Picture-in-Picture API. For unsupported browsers, it falls back to a regular popup window.
