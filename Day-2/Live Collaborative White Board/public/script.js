const socket = io();

// --- DOM ELEMENTS ---
// Lobby
const lobbyScreen = document.getElementById('lobbyScreen');
const tabJoin = document.getElementById('tabJoin');
const tabCreate = document.getElementById('tabCreate');
const roomIdInput = document.getElementById('roomIdInput');
const roomPasswordInput = document.getElementById('roomPasswordInput');
const lobbyActionBtn = document.getElementById('lobbyActionBtn');
const lobbyError = document.getElementById('lobbyError');

// Whiteboard
const whiteboardScreen = document.getElementById('whiteboardScreen');
const board = document.getElementById('board');
const ctx = board.getContext('2d', { willReadFrequently: true });
const roomNameDisplay = document.getElementById('roomNameDisplay');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const cursorsContainer = document.getElementById('cursorsContainer');

// Tools
const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
const colorSwatches = document.querySelectorAll('.color-swatch');
const colorPicker = document.getElementById('colorPicker');
const sizeSlider = document.getElementById('sizeSlider');
const sizePreview = document.getElementById('sizePreview');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');

// --- STATE ---
let isCreatingRoom = false;
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#FDFCF0';
let currentSize = 4;

let lastX = 0;
let lastY = 0;

let currentStrokeId = null;
let myStrokes = []; // Array of strokeIds drawn by this user
let undoneStack = []; // Array of undone strokeIds

// Store live cursors of other users
const cursors = {};

// --- LOBBY LOGIC ---
tabJoin.addEventListener('click', () => {
    isCreatingRoom = false;
    tabJoin.classList.add('active');
    tabCreate.classList.remove('active');
    lobbyActionBtn.textContent = 'Join Room';
    lobbyError.textContent = '';
});

tabCreate.addEventListener('click', () => {
    isCreatingRoom = true;
    tabCreate.classList.add('active');
    tabJoin.classList.remove('active');
    lobbyActionBtn.textContent = 'Create Room';
    lobbyError.textContent = '';
});

lobbyActionBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    const password = roomPasswordInput.value.trim();
    
    if (!roomId) {
        lobbyError.textContent = 'Please enter a Room ID.';
        return;
    }
    
    lobbyActionBtn.disabled = true;
    lobbyActionBtn.textContent = 'Connecting...';
    
    socket.emit('join-room', { roomId, password, isCreating: isCreatingRoom }, (response) => {
        lobbyActionBtn.disabled = false;
        lobbyActionBtn.textContent = isCreatingRoom ? 'Create Room' : 'Join Room';
        
        if (response.success) {
            // Join successful
            lobbyScreen.classList.add('hidden');
            whiteboardScreen.classList.remove('hidden');
            roomNameDisplay.textContent = roomId;
            
            // Resize canvas to fill window
            resizeCanvas();
            
            // Replay history
            if (response.history && response.history.length > 0) {
                replayHistory(response.history, response.undoneStrokes || []);
            }
        } else {
            // Join failed
            lobbyError.textContent = response.message;
        }
    });
});

leaveRoomBtn.addEventListener('click', () => {
    // Reload page to disconnect and return to lobby
    window.location.reload();
});

// --- CANVAS RESIZING ---
function resizeCanvas() {
    // Save current image data before resize
    const imageData = ctx.getImageData(0, 0, board.width, board.height);
    
    board.width = window.innerWidth;
    board.height = window.innerHeight;
    
    // Set default canvas styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Restore image data
    ctx.putImageData(imageData, 0, 0);
}

window.addEventListener('resize', () => {
    if (!whiteboardScreen.classList.contains('hidden')) {
        resizeCanvas();
    }
});

// --- DRAWING LOGIC ---

// Mouse/Touch start
function startDrawing(e) {
    isDrawing = true;
    currentStrokeId = socket.id + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    myStrokes.push(currentStrokeId);
    undoneStack = []; // Clear redo stack on new action
    
    const { x, y } = getCoordinates(e);
    lastX = x;
    lastY = y;
    
    // Draw a single dot if they just click
    draw(lastX, lastY, x, y, currentTool, currentColor, currentSize, currentStrokeId, true);
}

// Mouse/Touch move
function drawMove(e) {
    if (!isDrawing) {
        // Broadcast cursor position even if not drawing
        const { x, y } = getCoordinates(e);
        socket.emit('cursor-move', { x, y, color: currentColor });
        return;
    }
    
    const { x, y } = getCoordinates(e);
    draw(lastX, lastY, x, y, currentTool, currentColor, currentSize, currentStrokeId, true);
    
    lastX = x;
    lastY = y;
    
    // Also broadcast cursor while drawing
    socket.emit('cursor-move', { x, y, color: currentColor });
}

// Mouse/Touch end
function stopDrawing() {
    isDrawing = false;
    currentStrokeId = null;
}

// Helper: Normalize Mouse & Touch coords
function getCoordinates(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

// Core drawing function (used locally and remotely)
function draw(x0, y0, x1, y1, tool, color, size, strokeId, emit = false) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
    }
    
    ctx.lineWidth = size;
    ctx.stroke();
    ctx.closePath();
    
    if (emit) {
        socket.emit('draw-action', { x0, y0, x1, y1, tool, color, size, strokeId });
    }
}

// Event Listeners for Canvas
board.addEventListener('mousedown', startDrawing);
board.addEventListener('mousemove', drawMove);
window.addEventListener('mouseup', stopDrawing);

board.addEventListener('touchstart', startDrawing, { passive: false });
board.addEventListener('touchmove', drawMove, { passive: false });
window.addEventListener('touchend', stopDrawing);

// Prevent scrolling on touch devices while drawing
document.body.addEventListener('touchstart', (e) => {
    if (e.target === board) e.preventDefault();
}, { passive: false });
document.body.addEventListener('touchmove', (e) => {
    if (e.target === board) e.preventDefault();
}, { passive: false });


// --- SOCKET.IO EVENT HANDLERS ---

socket.on('draw-action', (data) => {
    draw(data.x0, data.y0, data.x1, data.y1, data.tool, data.color, data.size, data.strokeId, false);
});

socket.on('clear-canvas', () => {
    ctx.clearRect(0, 0, board.width, board.height);
});

socket.on('re-render', (data) => {
    ctx.clearRect(0, 0, board.width, board.height);
    replayHistory(data.history, data.undoneStrokes);
});

// Replay history upon joining or undo/redo
function replayHistory(history, undoneStrokes) {
    history.forEach(data => {
        if (!undoneStrokes.includes(data.strokeId)) {
            draw(data.x0, data.y0, data.x1, data.y1, data.tool, data.color, data.size, data.strokeId, false);
        }
    });
}

// --- LIVE CURSORS LOGIC ---
socket.on('cursor-move', (data) => {
    if (!cursors[data.id]) {
        // Create new cursor element
        const el = document.createElement('div');
        el.className = 'live-cursor';
        // SVG Pointer
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${data.color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>`;
        cursorsContainer.appendChild(el);
        cursors[data.id] = el;
    }
    
    // Update cursor element
    const cursorEl = cursors[data.id];
    cursorEl.style.left = `${data.x}px`;
    cursorEl.style.top = `${data.y}px`;
    // Update color if they change it
    cursorEl.querySelector('svg').setAttribute('fill', data.color);
});

socket.on('user-left', (id) => {
    if (cursors[id]) {
        cursors[id].remove();
        delete cursors[id];
    }
});


// --- TOOLBAR LOGIC ---

toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
    });
});

const customColorBtn = document.getElementById('customColorBtn');
const customColorIcon = document.getElementById('customColorIcon');

colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        customColorBtn.classList.remove('active');
        swatch.classList.add('active');
        currentColor = swatch.dataset.color;
        
        // Auto-switch back to pen if eraser was active
        if (currentTool === 'eraser') {
            document.querySelector('.tool-btn[data-tool="pen"]').click();
        }
    });
});

colorPicker.addEventListener('input', (e) => {
    colorSwatches.forEach(s => s.classList.remove('active'));
    customColorBtn.classList.add('active');
    currentColor = e.target.value;
    
    // Update the SVG icon color to reflect the chosen color
    customColorIcon.setAttribute('stroke', currentColor);
    
    if (currentTool === 'eraser') {
        document.querySelector('.tool-btn[data-tool="pen"]').click();
    }
});

sizeSlider.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizePreview.style.width = `${currentSize}px`;
    sizePreview.style.height = `${currentSize}px`;
});

clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, board.width, board.height);
    socket.emit('clear-canvas');
});

undoBtn.addEventListener('click', () => {
    if (myStrokes.length > 0) {
        const strokeIdToUndo = myStrokes.pop();
        undoneStack.push(strokeIdToUndo);
        socket.emit('undo-stroke', strokeIdToUndo);
    }
});

redoBtn.addEventListener('click', () => {
    if (undoneStack.length > 0) {
        const strokeIdToRedo = undoneStack.pop();
        myStrokes.push(strokeIdToRedo);
        socket.emit('redo-stroke', strokeIdToRedo);
    }
});
