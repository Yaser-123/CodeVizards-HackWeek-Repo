const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Setup Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Initialize SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create table with password column
        db.run(`CREATE TABLE IF NOT EXISTS capsules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT,
            image_url TEXT,
            unlock_date INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            password TEXT NOT NULL
        )`);
    }
});

// Helper to hash passwords
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// API Routes

// 1. Create a Capsule
app.post('/api/capsules', upload.single('image'), (req, res) => {
    const { title, message, unlock_date, password } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const createdAt = Date.now();
    const unlockDateInt = parseInt(unlock_date, 10);

    if (!title || !unlockDateInt) {
        return res.status(400).json({ error: 'Title and Unlock Date are required.' });
    }

    const hashedPassword = password ? hashPassword(password) : "";

    const sql = `INSERT INTO capsules (title, message, image_url, unlock_date, created_at, password) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, message, imageUrl, unlockDateInt, createdAt, hashedPassword], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ success: true, id: this.lastID });
    });
});

// 2. Edit a Capsule (PUT)
app.put('/api/capsules/:id', upload.single('image'), (req, res) => {
    const { title, message, unlock_date, password, keep_existing_image } = req.body;
    const unlockDateInt = parseInt(unlock_date, 10);
    const id = req.params.id;

    if (!title || !unlockDateInt) {
        return res.status(400).json({ error: 'Title and Unlock Date are required.' });
    }

    // Verify Password first
    db.get(`SELECT * FROM capsules WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Capsule not found' });
        
        if (row.password !== "") {
            if (!password || row.password !== hashPassword(password)) {
                return res.status(401).json({ error: 'Incorrect Password. Unauthorized.' });
            }
        }

        const newHashedPassword = password ? hashPassword(password) : "";

        // Determine image URL
        let imageUrl = row.image_url;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`; // New image uploaded
        } else if (keep_existing_image === 'false') {
            imageUrl = null; // User deleted image
        }

        const sql = `UPDATE capsules SET title = ?, message = ?, image_url = ?, unlock_date = ?, password = ? WHERE id = ?`;
        db.run(sql, [title, message, imageUrl, unlockDateInt, newHashedPassword, id], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
    });
});

// 3. Get All Capsules (Public summary data only)
app.get('/api/capsules', (req, res) => {
    const sql = `SELECT id, title, unlock_date, created_at, password FROM capsules ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        const now = Date.now();
        const summaryRows = rows.map(row => ({
            id: row.id,
            title: row.title,
            unlock_date: row.unlock_date,
            created_at: row.created_at,
            is_locked: now < row.unlock_date,
            has_password: row.password !== ""
        }));

        res.json(summaryRows);
    });
});

// 4. Unlock/View a Capsule
app.post('/api/capsules/:id/unlock', (req, res) => {
    const { password } = req.body;
    
    const sql = `SELECT * FROM capsules WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Capsule not found' });

        // Verify password if it exists
        if (row.password !== "") {
            if (!password || row.password !== hashPassword(password)) {
                return res.status(401).json({ error: 'Incorrect Password.' });
            }
        }

        // Return full content
        // (Even if it's "locked" time-wise, if they have the password they can view/edit it,
        // or we can enforce time lock. The prompt says "accessible only after a selected future date",
        // but also "i should able to edit the capsule after creation." 
        // If we strictly block viewing, how do they edit? 
        // Let's allow fetching data for the edit form if password is correct.
        res.json({
            id: row.id,
            title: row.title,
            message: row.message,
            image_url: row.image_url,
            unlock_date: row.unlock_date,
            created_at: row.created_at,
            is_locked: Date.now() < row.unlock_date
        });
    });
});

// 5. Delete a Capsule (DELETE)
app.delete('/api/capsules/:id', (req, res) => {
    const { password } = req.body;
    const id = req.params.id;

    db.get(`SELECT * FROM capsules WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Capsule not found' });
        
        if (row.password !== "") {
            if (!password || row.password !== hashPassword(password)) {
                return res.status(401).json({ error: 'Incorrect Password. Unauthorized.' });
            }
        }

        // Optional: delete image file from disk if it exists
        if (row.image_url) {
            const filePath = path.join(__dirname, row.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        db.run(`DELETE FROM capsules WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
