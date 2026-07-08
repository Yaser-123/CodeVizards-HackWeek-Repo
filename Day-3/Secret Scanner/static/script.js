// State Variables
let currentFile = null;
let pollInterval = null;

// UI Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const resultsArea = document.getElementById('resultsArea');
const loadingState = document.getElementById('loadingState');
const loadingMsg = document.getElementById('loadingMsg');
const safeState = document.getElementById('safeState');
const dangerState = document.getElementById('dangerState');
const violationsList = document.getElementById('violationsList');

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.add('hidden'));
        hideResults();
        
        // Add active class
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.remove('hidden');

        // Manage Polling
        if (tabId === 'monitor-tab') {
            startPolling();
        } else {
            stopPolling();
        }
    });
});

// --- Text Scanning ---
const codeInput = document.getElementById('codeInput');
document.querySelector('.clearBtn').addEventListener('click', () => {
    codeInput.value = '';
    hideResults();
});
document.getElementById('scanTextBtn').addEventListener('click', async () => {
    const text = codeInput.value.trim();
    if (!text) return;
    await performScan('/scan-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
});

// --- File Scanning ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileName');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent)';
});
dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
    }
});

function handleFileSelect() {
    if (fileInput.files.length > 0) {
        currentFile = fileInput.files[0];
        fileNameDisplay.textContent = currentFile.name;
        fileInfo.classList.remove('hidden');
    }
}

document.getElementById('scanFileBtn').addEventListener('click', async () => {
    if (!currentFile) {
        alert("Please select a file first.");
        return;
    }
    const formData = new FormData();
    formData.append('file', currentFile);
    await performScan('/scan-file', {
        method: 'POST',
        body: formData
    });
});

// --- GitHub Repo Scanning ---
const repoInput = document.getElementById('repoInput');
document.getElementById('scanRepoBtn').addEventListener('click', async () => {
    const url = repoInput.value.trim();
    if (!url) return;
    
    // Switch loading message
    loadingMsg.textContent = "Cloning repository and scanning history. This may take a moment...";
    
    showLoading();
    try {
        const response = await fetch('/scan-repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || "Server error");
        
        setTimeout(() => {
            hideLoading();
            // Instead of just showing results, switch to the Live Monitoring tab!
            // This ensures the user sees the real-time polling immediately.
            document.querySelector('[data-tab="monitor-tab"]').click();
        }, 800);
    } catch (error) {
        hideLoading();
        alert("Error: " + error.message);
    }
    
    loadingMsg.textContent = "Scanning lines..."; // Reset
});

// --- Live Monitoring ---
const monitorList = document.getElementById('monitorList');

function startPolling() {
    fetchStatus(); // fetch immediately
    if (!pollInterval) {
        pollInterval = setInterval(fetchStatus, 10000); // every 10 seconds
    }
}
function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

async function fetchStatus() {
    try {
        const response = await fetch('/monitoring-status');
        const data = await response.json();
        renderMonitorList(data);
    } catch (e) {
        console.error("Polling error", e);
    }
}

function renderMonitorList(data) {
    monitorList.innerHTML = '';
    const urls = Object.keys(data);
    
    if (urls.length === 0) {
        monitorList.innerHTML = '<div class="empty-state">No repositories currently monitored.</div>';
        return;
    }

    urls.forEach(url => {
        const repo = data[url];
        const item = document.createElement('div');
        item.className = `monitor-item ${repo.status === 'danger' ? 'danger-state' : ''}`;
        
        let statusHtml = '';
        let violationsHtml = '';
        
        if (repo.status === 'danger') {
            statusHtml = `<div class="monitor-status danger"><i class="ph ph-warning"></i> ${repo.violations.length} Secrets Leaked</div>`;
            
            violationsHtml = '<div class="monitor-violations" style="margin-top: 1rem; width: 100%;">';
            repo.violations.forEach(v => {
                violationsHtml += `
                    <div class="violation-card" style="margin-bottom: 0.5rem; background: rgba(0,0,0,0.3);">
                        <div class="violation-header">
                            <span class="violation-type" style="font-size: 0.85rem;"><i class="ph ph-warning"></i> ${v.type}</span>
                            <span class="violation-line" style="font-size: 0.85rem;">${v.file} : Line ${v.line_num}</span>
                        </div>
                        <div class="violation-code" style="padding: 0.4rem;">${escapeHtml(v.content)}</div>
                    </div>
                `;
            });
            violationsHtml += '</div>';
            
        } else {
            statusHtml = `<div class="monitor-status safe"><i class="ph ph-check"></i> Safe</div>`;
        }

        item.innerHTML = `
            <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        <div class="monitor-url"><i class="ph ph-github-logo"></i> ${url}</div>
                        <div class="monitor-commit"><i class="ph ph-git-commit"></i> HEAD: ${repo.last_commit || 'Fetching...'}</div>
                    </div>
                    ${statusHtml}
                </div>
                ${violationsHtml}
            </div>
        `;
        monitorList.appendChild(item);
    });
}

// --- Common UI Functions ---
async function performScan(endpoint, options) {
    showLoading();
    try {
        const response = await fetch(endpoint, options);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || "Server error");
        
        setTimeout(() => {
            hideLoading();
            if (data.violations && data.violations.length > 0) {
                renderViolations(data.violations);
            } else {
                safeState.classList.remove('hidden');
            }
        }, 800);
    } catch (error) {
        hideLoading();
        alert("Error: " + error.message);
    }
}

function hideResults() {
    resultsArea.classList.add('hidden');
    loadingState.classList.add('hidden');
    safeState.classList.add('hidden');
    dangerState.classList.add('hidden');
}

function showLoading() {
    resultsArea.classList.remove('hidden');
    loadingState.classList.remove('hidden');
    safeState.classList.add('hidden');
    dangerState.classList.add('hidden');
}

function hideLoading() {
    loadingState.classList.add('hidden');
}

function renderViolations(violations) {
    violationsList.innerHTML = '';
    
    // Group violations by file
    const byFile = {};
    violations.forEach(v => {
        if(!byFile[v.file]) byFile[v.file] = [];
        byFile[v.file].push(v);
    });

    Object.keys(byFile).forEach(file => {
        const fileGroup = byFile[file];
        
        fileGroup.forEach(v => {
            const card = document.createElement('div');
            card.className = 'violation-card';
            
            card.innerHTML = `
                <div class="violation-header">
                    <span class="violation-type"><i class="ph ph-warning"></i> ${v.type}</span>
                    <span class="violation-line">${file} : Line ${v.line_num}</span>
                </div>
                <div class="violation-code">${escapeHtml(v.content)}</div>
            `;
            violationsList.appendChild(card);
        });
    });
    
    dangerState.classList.remove('hidden');
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
