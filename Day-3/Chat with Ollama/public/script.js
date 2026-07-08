const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatWindow = document.getElementById('chatWindow');
const welcomeScreen = document.getElementById('welcomeScreen');
const clearChatBtn = document.getElementById('clearChatBtn');
const newChatBtn = document.getElementById('newChatBtn');
const sidebarContent = document.querySelector('.sidebar-content');

let sessions = JSON.parse(localStorage.getItem('ollama_chat_sessions')) || [];
let currentSessionId = localStorage.getItem('ollama_current_session_id') || null;
let messages = [];

// Initialize Markdown parser with Highlight.js
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true
});

// Session Management
function initSessions() {
    const oldMessages = JSON.parse(localStorage.getItem('ollama_chat_history'));
    if (oldMessages && sessions.length === 0) {
        sessions.push({
            id: Date.now().toString(),
            title: oldMessages[0] ? oldMessages[0].content.substring(0, 25) + '...' : 'Old Chat',
            messages: oldMessages
        });
        localStorage.removeItem('ollama_chat_history');
    }

    if (sessions.length === 0) {
        createNewSession();
    } else {
        if (!currentSessionId || !sessions.find(s => s.id == currentSessionId)) {
            currentSessionId = sessions[0].id;
        }
        loadSession(currentSessionId);
    }
}

function createNewSession() {
    const newSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: []
    };
    sessions.unshift(newSession);
    currentSessionId = newSession.id;
    messages = [];
    saveSessions();
    clearChatUI();
    renderSidebar();
}

function loadSession(id) {
    currentSessionId = id;
    const session = sessions.find(s => s.id == id);
    messages = session ? session.messages : [];
    
    clearChatUI();
    if (messages.length > 0) {
        welcomeScreen.style.display = 'none';
        messages.forEach(msg => appendMessage(msg.role, msg.content, true));
    }
    
    saveSessions();
    renderSidebar();
}

function saveSessions() {
    const session = sessions.find(s => s.id == currentSessionId);
    if (session) {
        session.messages = messages;
        if (messages.length > 0) {
            const firstMsg = messages.find(m => m.role === 'user');
            if (firstMsg) {
                session.title = firstMsg.content.length > 25 ? firstMsg.content.substring(0, 25) + '...' : firstMsg.content;
            }
        } else {
            session.title = 'New Chat';
        }
    }
    localStorage.setItem('ollama_chat_sessions', JSON.stringify(sessions));
    localStorage.setItem('ollama_current_session_id', currentSessionId);
    renderSidebar();
}

function renderSidebar() {
    sidebarContent.innerHTML = '<div class="history-label">Recent Chats</div>';
    
    sessions.forEach(session => {
        const div = document.createElement('div');
        div.className = `history-item ${session.id == currentSessionId ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.innerHTML = `<i class="ph ph-chat-teardrop-text"></i> ${session.title}`;
        titleSpan.style.flex = "1";
        titleSpan.style.overflow = "hidden";
        titleSpan.style.textOverflow = "ellipsis";
        titleSpan.style.whiteSpace = "nowrap";

        const delBtn = document.createElement('i');
        delBtn.className = 'ph ph-x';
        delBtn.style.opacity = "0.5";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteSession(session.id);
        };

        div.appendChild(titleSpan);
        div.appendChild(delBtn);
        
        div.onclick = () => loadSession(session.id);
        sidebarContent.appendChild(div);
    });
}

function deleteSession(id) {
    sessions = sessions.filter(s => s.id != id);
    if (sessions.length === 0) {
        createNewSession();
    } else if (currentSessionId == id) {
        loadSession(sessions[0].id);
    } else {
        saveSessions();
    }
}

function clearChatUI() {
    const messageRows = chatWindow.querySelectorAll('.message-row');
    messageRows.forEach(row => row.remove());
    welcomeScreen.style.display = 'flex';
}

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.value.trim().length > 0) {
        sendBtn.disabled = false;
    } else {
        sendBtn.disabled = true;
    }
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
            sendMessage();
        }
    }
});

newChatBtn.addEventListener('click', createNewSession);

clearChatBtn.addEventListener('click', () => {
    messages = [];
    saveSessions();
    clearChatUI();
});
sendBtn.addEventListener('click', sendMessage);

// Suggested Prompts
document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const title = btn.querySelector('.suggestion-title').textContent;
        const desc = btn.querySelector('.suggestion-desc').textContent;
        messageInput.value = `${title} ${desc}`;
        sendBtn.disabled = false;
        sendMessage();
    });
});

function appendMessage(role, content, skipSave = false) {
    welcomeScreen.style.display = 'none';
    
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-content';
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${role}`;
    if(role === 'user') {
        avatar.innerHTML = '<i class="ph ph-user"></i>';
    } else {
        avatar.innerHTML = '<i class="ph ph-sparkle"></i>';
    }
    
    const textContainer = document.createElement('div');
    textContainer.className = 'message-text';
    
    if (role === 'user') {
        textContainer.textContent = content;
    } else {
        textContainer.innerHTML = marked.parse(content);
        addCodeCopyButtons(textContainer);
        addMessageToolbar(wrapper, content);
    }
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(textContainer);
    row.appendChild(wrapper);
    chatWindow.appendChild(row);
    
    // Add extra padding at the bottom of the chat window to make room for absolute input
    chatWindow.style.paddingBottom = '120px';
    
    scrollToBottom();
}

function addMessageToolbar(wrapper, fullText) {
    const toolbar = document.createElement('div');
    toolbar.className = 'message-toolbar';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'toolbar-btn';
    copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy';
    copyBtn.title = "Copy response";
    
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(fullText);
        copyBtn.innerHTML = '<i class="ph ph-check"></i> Copied';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy';
        }, 2000);
    };
    
    toolbar.appendChild(copyBtn);
    wrapper.appendChild(toolbar);
}

function addCodeCopyButtons(container) {
    container.querySelectorAll('pre').forEach((pre) => {
        const codeBlock = pre.querySelector('code');
        hljs.highlightElement(codeBlock);
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy code';
        
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(codeBlock.innerText);
            copyBtn.innerHTML = '<i class="ph ph-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy code';
            }, 2000);
        };
        
        wrapper.appendChild(copyBtn);
    });
}

function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    appendMessage('user', text);
    messages.push({ role: 'user', content: text });
    saveSessions();

    welcomeScreen.style.display = 'none';
    const row = document.createElement('div');
    row.className = 'message-row ai';
    const wrapper = document.createElement('div');
    wrapper.className = 'message-content';
    const avatar = document.createElement('div');
    avatar.className = 'avatar ai';
    avatar.innerHTML = '<i class="ph ph-sparkle"></i>';
    const textContainer = document.createElement('div');
    textContainer.className = 'message-text';
    
    // Processing Indicator
    textContainer.innerHTML = `
        <div class="processing-indicator">
            <div class="processing-dot"></div>
            <div class="processing-dot"></div>
            <div class="processing-dot"></div>
        </div>
    `;
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(textContainer);
    row.appendChild(wrapper);
    chatWindow.appendChild(row);
    chatWindow.style.paddingBottom = '120px';
    scrollToBottom();

    let fullResponse = "";
    let startedStreaming = false;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: 'qwen2.5-coder:3b', 
                messages: messages 
            })
        });

        if (!response.ok) {
            let errorMsg = `Server error: ${response.status}`;
            try {
                const errData = await response.json();
                if (errData.error) errorMsg = errData.error;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message && parsed.message.content) {
                            if (!startedStreaming) {
                                startedStreaming = true;
                                textContainer.innerHTML = '<span class="cursor-blink"></span>';
                            }
                            fullResponse += parsed.message.content;
                            textContainer.innerHTML = marked.parse(fullResponse) + '<span class="cursor-blink"></span>';
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error("Error parsing JSON chunk:", e, line);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Fetch error:', error);
        fullResponse = error.message || "Sorry, there was an error connecting to the Ollama server.";
    }

    // Final render
    textContainer.innerHTML = marked.parse(fullResponse);
    addCodeCopyButtons(textContainer);
    addMessageToolbar(wrapper, fullResponse);
    
    messages.push({ role: 'assistant', content: fullResponse });
    saveSessions();
    scrollToBottom();
}

// Start up
initSessions();
