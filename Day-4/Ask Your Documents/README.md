# Ask Your Documents (Aura QA)

An Enterprise-Grade AI Document Question Answering System built for HackWeek 2026.
This project uses Retrieval-Augmented Generation (RAG) to allow users to interact with their documents using natural language, featuring a sleek, high-end user interface.

## Tech Stack
- **Backend**: Python, Flask
- **AI Framework**: LangChain
- **Embeddings**: HuggingFace (`all-MiniLM-L6-v2`) - 100% Local & Free
- **Vector Database**: ChromaDB
- **LLM**: NVIDIA API (`minimaxai/minimax-m3`)
- **Frontend**: HTML5, CSS3 (Glassmorphism UI), Vanilla JS

## Setup Instructions

1. **Clone the repository and navigate to the project directory:**
   ```bash
   cd "Day-4/Ask Your Documents"
   ```

2. **Create a Python Virtual Environment & Install Dependencies:**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Configure your API Key:**
   Make sure you have an `.env` file in the root directory with your NVIDIA API key:
   ```env
   NVIDIA_API_KEY=your_api_key_here
   ```

4. **Run the Application:**
   ```bash
   python app.py
   ```
   Open your browser and navigate to `http://127.0.0.1:5000` to start asking your documents questions!
