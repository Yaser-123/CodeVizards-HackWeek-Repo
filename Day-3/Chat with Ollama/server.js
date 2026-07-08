const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model } = req.body;
        
        // Forward the request to the local Ollama instance
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || 'qwen2.5-coder:3b',
                messages: messages,
                stream: true // Ask Ollama to stream the response
            })
        });

        if (!response.ok) {
            let errorText = response.statusText;
            try {
                const errorData = await response.json();
                if (errorData.error) errorText = errorData.error;
            } catch (e) {}
            throw new Error(`Ollama API error: ${errorText}`);
        }

        // Set headers for chunked streaming transfer
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Read the stream from Ollama
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            // Send the exact chunk back to the client
            res.write(chunk);
        }
        
        res.end();
    } catch (error) {
        console.error('Error proxying to Ollama:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Failed to connect to local Ollama instance.' });
        } else {
            res.end();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Ollama API proxy ready.`);
});
