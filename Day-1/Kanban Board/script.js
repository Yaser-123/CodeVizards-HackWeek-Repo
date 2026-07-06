const STORAGE_KEY = 'kanbanBoard';
const WIP_LIMIT = 2;
const STATUSES = ['requested', 'in-progress', 'in-review', 'done'];
const SWIM_LANES = ['feature', 'bug', 'chore'];

let tasks = [];
let draggedId = null;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) tasks = JSON.parse(saved);
  } catch (e) { tasks = []; }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function openModal(taskId) {
  const modal = document.getElementById('modalOverlay');
  const form = document.getElementById('taskForm');
  form.reset();

  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description || '';
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskDeadline').value = task.deadline || '';
    document.getElementById('taskPriority').value = task.priority || 'medium';
    document.getElementById('taskSwim').value = task.swim || 'feature';
    document.getElementById('taskStatus').value = task.status || 'requested';
  } else {
    document.getElementById('modalTitle').textContent = 'New Task';
    document.getElementById('taskId').value = '';
  }

  modal.classList.add('active');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modalOverlay').classList.remove('active');
}

function saveTask(e) {
  e.preventDefault();
  const id = document.getElementById('taskId').value;
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDesc').value.trim();
  const assignee = document.getElementById('taskAssignee').value.trim();
  const deadline = document.getElementById('taskDeadline').value;
  const priority = document.getElementById('taskPriority').value;
  const swim = document.getElementById('taskSwim').value;
  const status = document.getElementById('taskStatus').value;

  if (!title) return;

  if (id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, { title, description, assignee, deadline, priority, swim, status });
      showToast('Task updated');
    }
  } else {
    tasks.push({
      id: genId(),
      title,
      description,
      assignee,
      deadline,
      priority,
      swim,
      status,
      createdAt: new Date().toISOString()
    });
    showToast('Task created');
  }

  saveTasks();
  closeModal();
  render();
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
  showToast('Task deleted');
}

function onDragStart(e, id) {
  draggedId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
  setTimeout(() => {
    document.querySelectorAll('.card').forEach(c => {
      if (c.dataset.id !== id) c.style.opacity = '0.5';
    });
  }, 0);
}

function onDragEnd(e) {
  draggedId = null;
  e.target.classList.remove('dragging');
  document.querySelectorAll('.card').forEach(c => c.style.opacity = '');
  document.querySelectorAll('.card-list').forEach(l => l.classList.remove('drag-over'));
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e, newStatus) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!draggedId) return;

  const task = tasks.find(t => t.id === draggedId);
  if (!task) return;

  if (task.status === newStatus) return;

  if (newStatus === 'in-progress') {
    const count = tasks.filter(t => t.status === 'in-progress' && t.id !== draggedId).length;
    if (count >= WIP_LIMIT) {
      showToast(`WIP limit reached! Max ${WIP_LIMIT} tasks in In Progress.`);
      return;
    }
  }

  task.status = newStatus;
  saveTasks();
  render();
  showToast(`Moved to ${formatStatus(newStatus)}`);
}

function formatStatus(s) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

function isOverdue(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function render() {
  const filter = document.getElementById('swimFilter').value;

  STATUSES.forEach(status => {
    const list = document.getElementById(`list-${status}`);
    let statusTasks = tasks.filter(t => t.status === status);

    if (filter !== 'all') {
      statusTasks = statusTasks.filter(t => t.swim === filter);
    }

    const countEl = document.getElementById(`count-${status}`);
    const allCount = tasks.filter(t => t.status === status).length;
    countEl.textContent = allCount;

    if (status === 'in-progress') {
      const badge = document.getElementById('wip-badge');
      badge.textContent = `WIP: ${allCount}/${WIP_LIMIT}`;
      badge.classList.toggle('exceeded', allCount > WIP_LIMIT);
    }

    const grouped = {};
    SWIM_LANES.forEach(lane => grouped[lane] = []);
    statusTasks.forEach(t => {
      if (grouped[t.swim]) grouped[t.swim].push(t);
      else grouped['feature'].push(t);
    });

    let html = '';
    SWIM_LANES.forEach(lane => {
      const items = grouped[lane];
      if (items.length === 0) return;

      html += `<div class="swim-divider ${lane}"><span>${lane}</span></div>`;
      items.forEach(task => {
        html += renderCard(task);
      });
    });

    list.innerHTML = html;
  });

  document.querySelectorAll('.card-list').forEach(list => {
    list.addEventListener('dragover', onDragOver);
    list.addEventListener('dragleave', onDragLeave);
    list.addEventListener('drop', e => onDrop(e, list.dataset.status));
  });

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', e => onDragStart(e, card.dataset.id));
    card.addEventListener('dragend', onDragEnd);
  });
}

function renderCard(task) {
  const deadlineClass = isOverdue(task.deadline) ? 'overdue' : '';
  const deadlineText = task.deadline
    ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return `
    <div class="card" draggable="true" data-id="${task.id}">
      <div class="card-top">
        <span class="card-title">${escHtml(task.title)}</span>
        <div class="card-actions">
          <button onclick="openModal('${task.id}')" title="Edit">&#9998;</button>
          <button onclick="deleteTask('${task.id}')" title="Delete">&#10005;</button>
        </div>
      </div>
      ${task.description ? `<div class="card-desc">${escHtml(task.description)}</div>` : ''}
      <div class="card-meta">
        <span class="card-badge badge-${task.swim}">${task.swim}</span>
        <span class="priority-dot priority-${task.priority}" title="${task.priority}"></span>
        ${deadlineText ? `<span class="card-deadline ${deadlineClass}">${deadlineText}</span>` : ''}
      </div>
      ${task.assignee ? `
        <div class="card-footer">
          <div class="card-assignee">
            <span class="assignee-avatar">${getInitials(task.assignee)}</span>
            <span>${escHtml(task.assignee)}</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

document.getElementById('swimFilter').addEventListener('change', render);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

loadTasks();
render();
