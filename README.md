# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a7771b79-58f1-48fd-89cc-00999cd175dc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a7771b79-58f1-48fd-89cc-00999cd175dc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Document Picture-in-Picture API

## Features

### Picture-in-Picture Mode

The GoatedAI floating bar now supports Picture-in-Picture (PiP) mode using the Document Picture-in-Picture API. When you click "Start GoatedAI":

1. **Screen Sharing**: The browser prompts you to select a screen, window, or tab to share
2. **PiP Window**: A compact Picture-in-Picture window opens that stays on top of other applications
3. **Always Visible**: The PiP window remains visible even when you click elsewhere on your desktop
4. **Compact Interface**: Optimized layout for the small PiP window with category buttons and AI insights
5. **Easy Close**: Click the × button in the top-right corner to close the PiP window

**Browser Support**: The PiP feature works in modern browsers that support the Document Picture-in-Picture API. For unsupported browsers, it falls back to a regular popup window.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a7771b79-58f1-48fd-89cc-00999cd175dc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
