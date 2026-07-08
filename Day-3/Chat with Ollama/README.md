# Chat with Ollama

A sleek, premium, and private chat interface for interacting with local LLMs via Ollama. 
This project uses a lightweight Node.js backend to stream responses from your local `qwen2.5-coder:3b` model directly to a beautiful Vanilla HTML/CSS/JS frontend, completely bypassing CORS issues.

## Features
- 🚀 **100% Local & Private:** No API keys, no cloud costs. Powered by Ollama.
- ✨ **Real-time Streaming:** See the AI type its response character-by-character, just like ChatGPT.
- 💅 **Premium UI/UX:** A gorgeous dark-mode interface with glassmorphism, custom scrollbars, and Phosphor icons.
- 📝 **Markdown & Code Highlighting:** Fully parses markdown and applies GitHub Dark syntax highlighting to code blocks.
- 🧹 **Clear Chat & History Context:** Maintains conversational history and provides a one-click reset option.

---

## Setup Instructions

### Prerequisites
1. **Node.js**: Make sure you have Node.js installed on your machine.
2. **Ollama**: Download and install [Ollama](https://ollama.com/).

### 1. Download the Local Model
Open your terminal and pull the Qwen coder model:
```bash
ollama pull qwen2.5-coder:3b
```

### 2. Install Project Dependencies
Navigate to this project directory (`Day-3/Chat with Ollama`) and install the Node server dependencies (Express and CORS):
```bash
npm install
```

### 3. Start the Backend Server
Run the lightweight proxy server. This bridges the frontend safely to your local Ollama instance.
```bash
node server.js
```
*You should see a message saying "Server running at http://localhost:3001"*

### 4. Open the App!
Open your web browser and navigate to:
**http://localhost:3001**

You are now ready to chat securely and locally!

---

## Architecture Overview
- **`server.js`**: A Node/Express server acting as a proxy. It takes POST requests from the UI, forwards them to the local `http://127.0.0.1:11434/api/chat` endpoint, and streams the chunked response back using Node's native `fetch` API.
- **`public/index.html`**: The UI skeleton, utilizing Phosphor Icons, Marked.js, and Highlight.js via CDN.
- **`public/style.css`**: Pure CSS variables and flexbox layouts to create a highly responsive, premium dark-mode app.
- **`public/script.js`**: Handles the auto-expanding textarea, tracks conversational message history, manages the streaming `ReadableStream` reader, and renders Markdown on-the-fly.
