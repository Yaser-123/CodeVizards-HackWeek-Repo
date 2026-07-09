document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const appTitle = document.getElementById('app-title');

    // Fetch config to demonstrate env variables usage
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            appTitle.textContent = data.appName;
            document.title = data.appName;
        });

    const loadTasks = async () => {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        taskList.innerHTML = '';
        tasks.forEach(task => addTaskToDOM(task));
    };

    const addTaskToDOM = (task) => {
        const li = document.createElement('li');
        if (task.completed) li.classList.add('completed');
        
        li.innerHTML = `
            <div>
                <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <span>${task.title}</span>
            </div>
            <button class="delete-btn" data-id="${task.id}">Delete</button>
        `;
        taskList.appendChild(li);
    };

    addBtn.addEventListener('click', async () => {
        const title = taskInput.value.trim();
        if (!title) return;

        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        const newTask = await res.json();
        addTaskToDOM(newTask);
        taskInput.value = '';
    });

    taskList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            loadTasks();
        } else if (e.target.classList.contains('checkbox')) {
            const id = e.target.dataset.id;
            const completed = e.target.checked;
            await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            loadTasks();
        }
    });

    loadTasks();
});
