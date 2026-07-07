const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for rooms
// Structure: { roomId: { password: 'xyz', history: [] } }
const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Handle Room Auth (Join / Create)
    socket.on('join-room', ({ roomId, password, isCreating }, callback) => {
        // Prevent empty names
        if (!roomId || !roomId.trim()) {
            return callback({ success: false, message: 'Room ID cannot be empty.' });
        }
        
        if (isCreating) {
            if (rooms[roomId]) {
                return callback({ success: false, message: 'Room already exists.' });
            }
            if (!password || !password.trim()) {
                return callback({ success: false, message: 'Password is required to create a room.' });
            }
            // Create new room
            rooms[roomId] = { password, history: [], undoneStrokes: [] };
        } else {
            // Join existing room
            if (!rooms[roomId]) {
                return callback({ success: false, message: 'Room does not exist.' });
            }
            if (rooms[roomId].password !== password) {
                return callback({ success: false, message: 'Incorrect password.' });
            }
        }
        
        socket.join(roomId);
        socket.roomId = roomId; // Store room id on the socket object
        
        // Send success back with the drawing history and undone strokes
        callback({ success: true, history: rooms[roomId].history, undoneStrokes: rooms[roomId].undoneStrokes });
        
        // Broadcast to other users that someone joined
        socket.to(roomId).emit('user-joined', socket.id);
    });
    
    // Handle Drawing Actions (e.g. { type: 'beginPath', x, y, color, size })
    socket.on('draw-action', (data) => {
        if (!socket.roomId || !rooms[socket.roomId]) return;
        
        // Save to history for new users who join later
        rooms[socket.roomId].history.push(data);
        
        // Broadcast to everyone else in the room
        socket.to(socket.roomId).emit('draw-action', data);
    });
    
    // Handle Canvas Clearing
    socket.on('clear-canvas', () => {
        if (!socket.roomId || !rooms[socket.roomId]) return;
        
        // Wipe history for this room
        rooms[socket.roomId].history = [];
        rooms[socket.roomId].undoneStrokes = [];
        
        // Tell everyone to clear
        socket.to(socket.roomId).emit('clear-canvas');
    });

    // Handle Undo
    socket.on('undo-stroke', (strokeId) => {
        if (!socket.roomId || !rooms[socket.roomId]) return;
        rooms[socket.roomId].undoneStrokes.push(strokeId);
        // Tell everyone to re-render
        io.to(socket.roomId).emit('re-render', {
            history: rooms[socket.roomId].history,
            undoneStrokes: rooms[socket.roomId].undoneStrokes
        });
    });

    // Handle Redo
    socket.on('redo-stroke', (strokeId) => {
        if (!socket.roomId || !rooms[socket.roomId]) return;
        
        rooms[socket.roomId].undoneStrokes = rooms[socket.roomId].undoneStrokes.filter(id => id !== strokeId);
        
        // Tell everyone to re-render
        io.to(socket.roomId).emit('re-render', {
            history: rooms[socket.roomId].history,
            undoneStrokes: rooms[socket.roomId].undoneStrokes
        });
    });
    
    // Handle Live Cursor Moving
    socket.on('cursor-move', (data) => {
        if (!socket.roomId) return;
        
        // We do NOT save cursors to history, we just bounce them to others in the room
        socket.to(socket.roomId).emit('cursor-move', { id: socket.id, ...data });
    });
    
    // Handle Disconnection
    socket.on('disconnect', () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('user-left', socket.id);
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
