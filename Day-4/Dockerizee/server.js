const express = require('express');
const path = require('path');
const app = express();

// Use environment variables (Loaded by Docker/Docker Compose)
const PORT = process.env.PORT || 8080;
const APP_NAME = process.env.APP_NAME || 'Task Manager';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
let tasks = [
    { id: 1, title: 'Learn Docker', completed: true },
    { id: 2, title: 'Containerize an application', completed: false }
];

// API Routes
app.get('/api/config', (req, res) => {
    res.json({ appName: APP_NAME });
});

app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const newTask = {
        id: tasks.length ? tasks[tasks.length - 1].id + 1 : 1,
        title: req.body.title,
        completed: false
    };
    tasks.push(newTask);
    res.status(201).json(newTask);
});

app.delete('/api/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    tasks = tasks.filter(task => task.id !== id);
    res.status(204).send();
});

app.put('/api/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = req.body.completed;
        res.json(task);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
