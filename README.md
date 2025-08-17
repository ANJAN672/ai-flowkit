# AGEN8

🚀 **Advanced Visual AI Workflow Builder** with autonomous copilot and drag-and-drop blocks.

## ✨ Features

- **🤖 AI-Powered Copilot**: Autonomous workflow creation using OpenAI GPT-4o-mini
- **🎨 Modern UI/UX**: Enhanced design with tooltips, animations, and responsive layouts  
- **🔧 Dynamic Blocks**: Comprehensive block library with real-time configuration
- **⚡ Real-time Execution**: Live workflow execution with status tracking
- **💾 Auto-save**: Automatic persistence with localStorage
- **🌙 Dark/Light Mode**: Full theme support
- **📱 Responsive**: Works on desktop and tablet devices

### 1. Clone and Install

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd ai-flowkit

# Install dependencies
npm install
```

### 2. Configure OpenAI API

Create a `.env.local` file in the root directory:

```env
# OpenAI API Configuration (Required for AI Copilot)
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Custom API endpoint
VITE_OPENAI_API_URL=https://api.openai.com/v1

# Default model for copilot (cost-efficient)
VITE_DEFAULT_MODEL=gpt-4o-mini
```

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

## 🤖 AI Copilot Usage

The AI Copilot can autonomously create workflows for you:

1. **Open Copilot**: Click the AI Copilot button in the top bar or press `Ctrl+K`
2. **Describe Your Workflow**: Type what you want to build, e.g.:
   - "Create a customer support chatbot"
   - "Build an API data processor with email notifications"
   - "Make a content analysis workflow"
3. **Watch It Build**: The AI will automatically select blocks, configure them, and connect them
4. **Customize**: Modify the generated workflow as needed

## 🔧 Development

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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b1a8eecf-eb2e-4d6e-b5cb-247f65840385) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
