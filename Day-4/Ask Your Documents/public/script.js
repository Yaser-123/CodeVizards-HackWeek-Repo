const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');
const docList = document.getElementById('docList');
const clearDocsBtn = document.getElementById('clearDocsBtn');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatHistory = document.getElementById('chatHistory');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');

let uploadedFiles = [];
let knowledgeBaseImages = []; // Base64 images from sidebar
let chatImages = []; // Base64 images from chat input

// --- Initialize State ---
async function init() {
    try {
        const res = await fetch('/api/documents');
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
            data.documents.forEach(doc => addDocumentToList(doc, false));
        }
    } catch (e) {
        console.error("Failed to fetch initial documents:", e);
    }
}
init();

// --- File Upload Logic (Sidebar) ---
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-primary)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        handleFiles(fileInput.files);
    }
});

async function handleFiles(files) {
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            // Handle image for knowledge base with compression
            compressImage(file, (dataUrl) => {
                knowledgeBaseImages.push({ name: file.name, data: dataUrl });
                addDocumentToList(file.name, true);
                setStatus(`Added image ${file.name}`, 'success');
            });
            continue;
        }

        if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.docx')) {
            setStatus('Unsupported file format.', 'error');
            continue;
        }

        setStatus(`Uploading ${file.name}...`, 'loading');
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setStatus(`Processed ${file.name} (${data.chunks} chunks)`, 'success');
                addDocumentToList(file.name, false);
            } else {
                setStatus(`Error: ${data.error}`, 'error');
            }
        } catch (err) {
            setStatus('Upload failed. Server might be down.', 'error');
        }
    }
    fileInput.value = '';
}

function setStatus(msg, type) {
    uploadStatus.textContent = msg;
    uploadStatus.className = `status-msg ${type}`;
    setTimeout(() => { uploadStatus.textContent = ''; }, 4000);
}

function addDocumentToList(filename, isImage) {
    if (uploadedFiles.length === 0 && knowledgeBaseImages.length === 1) {
        docList.innerHTML = '';
    } else if (docList.querySelector('.empty-state')) {
        docList.innerHTML = '';
    }

    if (!uploadedFiles.includes(filename) && !knowledgeBaseImages.some(img => img.name === filename && !isImage)) {
        if (!isImage) uploadedFiles.push(filename);
        
        const li = document.createElement('li');
        li.innerHTML = `<span class="filename" title="${escapeHtml(filename)}">${escapeHtml(filename)}</span>`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-doc-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove';
        removeBtn.onclick = () => removeDocument(filename, isImage, li);
        
        li.appendChild(removeBtn);
        docList.appendChild(li);
    }
}

async function removeDocument(filename, isImage, listItemElement) {
    if (isImage) {
        knowledgeBaseImages = knowledgeBaseImages.filter(img => img.name !== filename);
        listItemElement.remove();
        checkEmptyList();
        return;
    }

    try {
        const res = await fetch('/api/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        if (res.ok) {
            uploadedFiles = uploadedFiles.filter(f => f !== filename);
            listItemElement.remove();
            checkEmptyList();
        } else {
            setStatus(`Failed to remove ${filename}`, 'error');
        }
    } catch (e) {
        setStatus(`Error removing ${filename}`, 'error');
    }
}

function checkEmptyList() {
    if (uploadedFiles.length === 0 && knowledgeBaseImages.length === 0) {
        docList.innerHTML = '<li class="empty-state">No documents uploaded yet.</li>';
    }
}

clearDocsBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/clear', { method: 'POST' });
        uploadedFiles = [];
        knowledgeBaseImages = [];
        checkEmptyList();
        setStatus('All documents cleared.', 'success');
    } catch (e) {
        setStatus('Failed to clear documents.', 'error');
    }
});

// --- Chat Image Attachment Logic ---
attachBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', () => {
    if (imageInput.files.length) {
        for (let file of imageInput.files) {
            if (file.type.startsWith('image/')) {
                compressImage(file, (dataUrl) => {
                    chatImages.push(dataUrl);
                    renderImagePreviews();
                });
            }
        }
    }
    imageInput.value = '';
});

function renderImagePreviews() {
    imagePreviewContainer.innerHTML = '';
    chatImages.forEach((dataUrl, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'input-image-preview';
        previewDiv.style.backgroundImage = `url(${dataUrl})`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-img';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            chatImages.splice(index, 1);
            renderImagePreviews();
        };
        
        previewDiv.appendChild(removeBtn);
        imagePreviewContainer.appendChild(previewDiv);
    });
}

// --- Chat Logic ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query && chatImages.length === 0) return;

    // Build the array of all images to send
    const imagesToSend = [...knowledgeBaseImages.map(img => img.data), ...chatImages];

    appendMessage('user', query, [], chatImages);
    
    // Clear chat input images after sending
    chatImages = [];
    renderImagePreviews();
    chatInput.value = '';
    sendBtn.disabled = true;

    const typingIndicator = showTypingIndicator();
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: query || "Describe the image.", 
                images: imagesToSend 
            })
        });

        typingIndicator.remove();
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({error: "Unknown error"}));
            appendMessage('ai', `Error: ${errData.error || res.statusText}`);
            return;
        }

        // Setup streaming reader
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        // Create an empty AI message block to live-update
        const messageId = 'msg-' + Date.now();
        appendMessage('ai', '', [], [], messageId);
        const msgContentDiv = document.getElementById(messageId).querySelector('.markdown-body');
        const sourcesContainer = document.getElementById(messageId).querySelector('.sources');
        
        let accumulatedText = "";
        let streamBuffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            streamBuffer += decoder.decode(value, { stream: true });
            
            let boundaryIndex;
            while ((boundaryIndex = streamBuffer.indexOf('\n\n')) >= 0) {
                const eventStr = streamBuffer.slice(0, boundaryIndex).trim();
                streamBuffer = streamBuffer.slice(boundaryIndex + 2);
                
                if (eventStr.startsWith('data:')) {
                    const dataStr = eventStr.replace(/^data:\s*/, '');
                    if (!dataStr) continue;
                    
                    try {
                        const parsed = JSON.parse(dataStr);
                        
                        if (parsed.type === 'sources') {
                            if (parsed.data && parsed.data.length > 0) {
                                let sourceHtml = '';
                                parsed.data.forEach(src => {
                                    sourceHtml += `<span class="source-badge">${escapeHtml(src)}</span>`;
                                });
                                sourcesContainer.innerHTML = sourceHtml;
                            }
                        } else if (parsed.type === 'text') {
                            accumulatedText += parsed.data;
                            // Re-parse the full markdown every time
                            msgContentDiv.innerHTML = marked.parse(accumulatedText);
                            chatHistory.scrollTop = chatHistory.scrollHeight;
                        } else if (parsed.type === 'error') {
                            msgContentDiv.innerHTML += `<br><span style="color:red;">Error: ${parsed.data}</span>`;
                        }
                    } catch (e) {
                        console.error("Error parsing stream chunk:", e, dataStr);
                    }
                }
            }
        }
        
    } catch (err) {
        if (typingIndicator.parentNode) typingIndicator.remove();
        appendMessage('ai', 'Failed to connect to the AI engine.');
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});

function appendMessage(role, text, sources = [], attachedImages = [], id = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    if (id) msgDiv.id = id;
    
    let avatar = role === 'ai' ? 'N' : 'U';
    
    let contentHtml = `<div class="content">`;
    
    // Render images in user bubble if they attached any
    if (attachedImages.length > 0) {
        attachedImages.forEach(imgData => {
            contentHtml += `<img src="${imgData}" class="chat-image-preview"><br>`;
        });
    }
    
    if (role === 'ai') {
        contentHtml += `<div class="markdown-body">${marked.parse(text || '')}</div>`;
        contentHtml += `<div class="sources">`;
        if (sources && sources.length > 0) {
            sources.forEach(src => {
                contentHtml += `<span class="source-badge">${escapeHtml(src)}</span>`;
            });
        }
        contentHtml += `</div>`;
    } else {
        if (text) contentHtml += escapeHtml(text);
    }

    contentHtml += `</div>`;

    msgDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        ${contentHtml}
    `;
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ai`;
    msgDiv.innerHTML = `
        <div class="avatar">N</div>
        <div class="content typing-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    chatHistory.appendChild(msgDiv);
    return msgDiv;
}

// Utility to compress images before sending to LLM
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 800; // Limit to 800px max

            if (width > height && width > maxDim) {
                height *= maxDim / width;
                width = maxDim;
            } else if (height > maxDim) {
                width *= maxDim / height;
                height = maxDim;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to 70% quality JPEG
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
