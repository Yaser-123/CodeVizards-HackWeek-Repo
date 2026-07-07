/**
 * Habit Tracker Pro - Ultimate Vanilla JS Implementation
 */

// --- STATE MANAGEMENT ---
const STORAGE_KEY = 'habitProData';
let state = {
    habits: [],
    theme: 'dark',
    filter: 'All'
};

// Initialize State
function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.habits = parsed.habits || [];
            state.theme = parsed.theme || 'dark';
        } catch (e) {
            console.error('Data parsing error', e);
        }
    }
    
    applyTheme(state.theme);
    updateDateDisplay();
    setupEventListeners();
    renderAll();
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
}

// --- UTILITIES ---
const Utils = {
    getTodayStr: () => {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    },
    getDateStr: (d) => {
        const offset = d.getTimezoneOffset();
        return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    },
    generateLastNDays: (n) => {
        const dates = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(Utils.getDateStr(d));
        }
        return dates;
    },
    getStreak: (habit) => {
        if (!habit.history || Object.keys(habit.history).length === 0) return 0;
        const sorted = Object.keys(habit.history)
            .filter(date => habit.history[date].completed)
            .sort((a, b) => b.localeCompare(a));
            
        if (sorted.length === 0) return 0;
        
        const today = Utils.getTodayStr();
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yesterday = Utils.getDateStr(yest);

        if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

        let streak = 1;
        let prevDate = new Date(sorted[0]);

        for (let i = 1; i < sorted.length; i++) {
            const currDate = new Date(sorted[i]);
            const diffDays = Math.round(Math.abs(prevDate - currDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak++;
                prevDate = currDate;
            } else if (diffDays > 1) {
                break;
            }
        }
        return streak;
    }
};

// --- DOM ELEMENTS ---
const DOM = {
    tabs: document.querySelectorAll('.nav-links li'),
    panes: document.querySelectorAll('.tab-pane'),
    themeBtn: document.getElementById('themeToggle'),
    dateDisplay: document.getElementById('currentDateDisplay'),
    
    // Modal
    modalOverlay: document.getElementById('modalOverlay'),
    addBtn: document.getElementById('openAddModalBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    cancelBtn: document.getElementById('cancelFormBtn'),
    habitForm: document.getElementById('habitForm'),
    hasTargetCheckbox: document.getElementById('hasTarget'),
    targetFields: document.getElementById('targetFields'),
    
    // Dashboard
    habitsList: document.getElementById('habitsList'),
    emptyState: document.getElementById('emptyState'),
    filters: document.getElementById('filtersContainer'),
    statTotalStreak: document.getElementById('statTotalStreak'),
    statCompletionRate: document.getElementById('statCompletionRate'),
    statTotalHabits: document.getElementById('statTotalHabits'),
    
    // Settings
    exportBtn: document.getElementById('exportDataBtn'),
    importInput: document.getElementById('importDataInput'),
    wipeBtn: document.getElementById('wipeDataBtn')
};

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Navigation
    DOM.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.tabs.forEach(t => t.classList.remove('active'));
            DOM.panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            if(tab.dataset.tab === 'analytics' || tab.dataset.tab === 'calendar') {
                renderAll(); // Re-render charts/heatmaps to ensure correct dimensions
            }
        });
    });

    // Theme Toggle
    DOM.themeBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(state.theme);
        saveState();
    });

    // Custom Confirm Modal
    let pendingConfirmAction = null;
    const confirmModal = document.getElementById('confirmModalOverlay');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMsg = document.getElementById('confirmMessage');

    function showConfirm(title, message, onConfirm = null) {
        confirmTitle.textContent = title;
        confirmMsg.textContent = message;
        pendingConfirmAction = onConfirm;
        
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const acceptBtn = document.getElementById('confirmAcceptBtn');
        
        if (!onConfirm) {
            cancelBtn.classList.add('hidden');
            acceptBtn.textContent = 'OK';
        } else {
            cancelBtn.classList.remove('hidden');
            acceptBtn.textContent = 'Confirm';
        }
        
        confirmModal.classList.add('visible');
    }

    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
        pendingConfirmAction = null;
        confirmModal.classList.remove('visible');
    });

    document.getElementById('confirmAcceptBtn').addEventListener('click', () => {
        if (pendingConfirmAction) pendingConfirmAction();
        confirmModal.classList.remove('visible');
    });

    // Modal
    const openModal = () => {
        DOM.habitForm.reset();
        DOM.targetFields.classList.add('hidden');
        DOM.modalOverlay.classList.add('visible');
        document.getElementById('habitName').focus();
    };
    
    DOM.addBtn.addEventListener('click', openModal);
    DOM.emptyAddBtn.addEventListener('click', openModal);
    DOM.cancelBtn.addEventListener('click', () => DOM.modalOverlay.classList.remove('visible'));
    
    DOM.hasTargetCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) DOM.targetFields.classList.remove('hidden');
        else DOM.targetFields.classList.add('hidden');
    });

    // Add Habit Form Submit
    DOM.habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('habitName').value.trim();
        if (!name) return;
        const category = document.getElementById('habitCategory').value;
        const frequency = document.getElementById('habitFrequency').value;
        const hasTarget = DOM.hasTargetCheckbox.checked;
        
        let targetValue = 1;
        let targetUnit = '';
        
        if (hasTarget) {
            const parsedVal = parseInt(document.getElementById('targetValue').value);
            if (isNaN(parsedVal) || parsedVal < 1) {
                showConfirm("Invalid Input", "Please enter a valid numeric Daily Goal (e.g. 10).");
                return;
            }
            targetValue = parsedVal;
            targetUnit = document.getElementById('targetUnit').value.trim();
        }

        const newHabit = {
            id: Date.now().toString(),
            name,
            category,
            frequency,
            hasTarget,
            targetValue: hasTarget ? targetValue : 1,
            targetUnit: hasTarget ? targetUnit : '',
            createdAt: new Date().toISOString(),
            history: {} // { 'YYYY-MM-DD': { current: 2, completed: true } }
        };

        state.habits.push(newHabit);
        DOM.modalOverlay.classList.remove('visible');
        
        // Reset filter to see new habit
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="All"]').classList.add('active');
        state.filter = 'All';
        
        saveState();
    });

    // Filters
    DOM.filters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.filter = e.target.dataset.filter;
            renderDashboard();
        }
    });

    // Habit List Interactions (Event Delegation)
    DOM.habitsList.addEventListener('click', (e) => {
        // Toggle simple habit complete
        const checkCircle = e.target.closest('.check-circle');
        if (checkCircle) {
            const id = checkCircle.dataset.id;
            toggleHabitComplete(id);
            return;
        }
        
        // Target increment/decrement
        const targetBtn = e.target.closest('.target-btn');
        if (targetBtn) {
            const id = targetBtn.dataset.id;
            const action = targetBtn.dataset.action;
            updateHabitTarget(id, action);
            return;
        }

        // Delete habit
        const deleteBtn = e.target.closest('.icon-btn.delete');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            showConfirm('Delete Habit', 'Are you sure you want to delete this habit permanently? This action cannot be undone.', () => {
                state.habits = state.habits.filter(h => h.id !== id);
                saveState();
            });
        }
    });

    // Data Management
    DOM.exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `habitpro_backup_${Utils.getTodayStr()}.json`);
        dlAnchorElem.click();
    });

    DOM.importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported && imported.habits) {
                    state = imported;
                    saveState();
                    showConfirm("Success", "Data imported successfully!");
                } else {
                    showConfirm("Import Failed", "Invalid backup file format.");
                }
            } catch (err) {
                showConfirm("Error", "Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
    });

    DOM.wipeBtn.addEventListener('click', () => {
        showConfirm('Wipe All Data', 'WARNING: This will delete ALL your data. This cannot be undone. Are you sure?', () => {
            state.habits = [];
            saveState();
        });
    });
}

// --- ACTIONS ---
function toggleHabitComplete(id) {
    const habit = state.habits.find(h => h.id === id);
    const today = Utils.getTodayStr();
    
    if (!habit.history) habit.history = {};
    if (!habit.history[today]) habit.history[today] = { current: 0, completed: false };

    const isDone = habit.history[today].completed;
    
    if (isDone) {
        habit.history[today].completed = false;
        habit.history[today].current = 0;
    } else {
        habit.history[today].completed = true;
        habit.history[today].current = habit.hasTarget ? habit.targetValue : 1;
        triggerConfetti();
    }
    
    saveState();
}

function updateHabitTarget(id, action) {
    const habit = state.habits.find(h => h.id === id);
    const today = Utils.getTodayStr();
    
    if (!habit.history) habit.history = {};
    if (!habit.history[today]) habit.history[today] = { current: 0, completed: false };
    
    let current = habit.history[today].current;
    
    if (action === 'plus' && current < habit.targetValue) {
        current++;
    } else if (action === 'minus' && current > 0) {
        current--;
    }
    
    habit.history[today].current = current;
    
    const wasCompleted = habit.history[today].completed;
    habit.history[today].completed = (current >= habit.targetValue);
    
    if(!wasCompleted && habit.history[today].completed) {
        triggerConfetti();
    }
    
    saveState();
}

// --- RENDERING ---
function renderAll() {
    renderDashboard();
    renderAnalytics();
    renderCalendar();
}

function renderDashboard() {
    // Stats Update
    DOM.statTotalHabits.textContent = state.habits.length;
    
    let bestStreak = 0;
    let total30Days = 0;
    let completed30Days = 0;
    const last30 = Utils.generateLastNDays(30);

    state.habits.forEach(h => {
        // Find best streak
        bestStreak = Math.max(bestStreak, Utils.getStreak(h)); // Note: this is current streak for simplicity, but logic could be expanded
        
        // Calculate 30-day completion rate
        total30Days += 30;
        last30.forEach(date => {
            if (h.history && h.history[date] && h.history[date].completed) {
                completed30Days++;
            }
        });
    });

    DOM.statTotalStreak.innerHTML = `${bestStreak} <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; vertical-align:middle; color:var(--primary);"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
    const completionPercentage = total30Days === 0 ? 0 : Math.round((completed30Days / total30Days) * 100);
    DOM.statCompletionRate.textContent = `${completionPercentage}%`;

    // Filter List
    let displayHabits = state.habits;
    if (state.filter !== 'All') {
        displayHabits = displayHabits.filter(h => h.category === state.filter);
    }

    if (displayHabits.length === 0) {
        DOM.habitsList.innerHTML = '';
        DOM.emptyState.classList.remove('hidden');
        if(state.habits.length > 0) {
            DOM.emptyState.querySelector('h2').textContent = 'No habits in this category';
            DOM.emptyState.querySelector('p').textContent = 'Try selecting another category or add a new habit.';
            DOM.emptyAddBtn.classList.add('hidden');
        } else {
            DOM.emptyState.querySelector('h2').textContent = 'Your Journey Starts Here';
            DOM.emptyAddBtn.classList.remove('hidden');
        }
        return;
    }

    DOM.emptyState.classList.add('hidden');
    const today = Utils.getTodayStr();
    const last7 = Utils.generateLastNDays(7);

    // Build HTML
    DOM.habitsList.innerHTML = displayHabits.map(habit => {
        const historyObj = habit.history || {};
        const todayData = historyObj[today] || { current: 0, completed: false };
        const streak = Utils.getStreak(habit);
        
        let interactionUI = '';
        
        if (habit.hasTarget) {
            const percentage = Math.min((todayData.current / habit.targetValue) * 100, 100);
            const isDone = todayData.completed;
            
            interactionUI = `
                <div class="target-tracker">
                    <div class="target-header">
                        <span>Progress: ${todayData.current} / ${habit.targetValue} ${habit.targetUnit}</span>
                        <div class="target-controls">
                            <button class="target-btn" data-id="${habit.id}" data-action="minus">-</button>
                            <button class="target-btn" data-id="${habit.id}" data-action="plus">+</button>
                        </div>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percentage}%; ${isDone ? 'background: var(--success);' : ''}"></div>
                    </div>
                </div>
            `;
        } else {
            interactionUI = `
                <div class="check-circle ${todayData.completed ? 'completed' : ''}" data-id="${habit.id}"></div>
            `;
        }

        // Mini 7-day history for the card
        const miniHistory = last7.map(d => {
            const done = historyObj[d] && historyObj[d].completed;
            // if date is in future (not possible with last7) or today and not done, it's pending. If past and not done, missed.
            const isPast = d < today;
            let className = 'mini-day';
            if (done) className += ' done';
            else if (isPast) className += ' missed';
            return `<div class="${className}" title="${d}"></div>`;
        }).join('');

        return `
            <div class="glass-card habit-item" data-category="${habit.category}">
                <div class="habit-main-row">
                    <div class="habit-info-group">
                        ${!habit.hasTarget ? interactionUI : ''}
                        <div class="habit-details">
                            <h3>${habit.name}</h3>
                            <div class="habit-meta">
                                <span class="streak-badge"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> ${streak}</span>
                                <span>• ${habit.category}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="habit-actions">
                        <div class="history-mini-grid" style="margin-right: 1rem;">
                            ${miniHistory}
                        </div>
                        <button class="icon-btn delete" data-id="${habit.id}" title="Delete Habit">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                ${habit.hasTarget ? interactionUI : ''}
            </div>
        `;
    }).join('');
}

function renderAnalytics() {
    if (state.habits.length === 0) return;
    
    const today = Utils.getTodayStr();
    
    // 1. Donut Chart (Today's Progress)
    let completedToday = 0;
    state.habits.forEach(h => {
        if (h.history && h.history[today] && h.history[today].completed) {
            completedToday++;
        }
    });
    
    const todayPercentage = Math.round((completedToday / Math.max(state.habits.length, 1)) * 100);
    const donutEl = document.getElementById('todayDonut');
    donutEl.style.setProperty('--percentage', todayPercentage);
    document.getElementById('todayDonutLabel').textContent = `${todayPercentage}%`;

    // 2. Pie Chart (Category Distribution)
    const categoryCounts = {};
    const categoryColors = {
        'Health': 'var(--cat-health)',
        'Productivity': 'var(--cat-prod)',
        'Learning': 'var(--cat-learn)',
        'Mindfulness': 'var(--cat-mind)',
        'Other': 'var(--cat-other)'
    };
    
    state.habits.forEach(h => {
        categoryCounts[h.category] = (categoryCounts[h.category] || 0) + 1;
    });
    
    let conicGradients = [];
    let currentDegree = 0;
    let legendHTML = '';
    
    for (const [cat, count] of Object.entries(categoryCounts)) {
        const percentage = (count / state.habits.length) * 100;
        const degrees = (percentage / 100) * 360;
        const color = categoryColors[cat] || 'var(--primary)';
        
        conicGradients.push(`${color} ${currentDegree}deg ${currentDegree + degrees}deg`);
        currentDegree += degrees;
        
        legendHTML += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${color}"></div>
                <span>${cat} (${count})</span>
            </div>
        `;
    }
    
    document.getElementById('categoryPie').style.background = `conic-gradient(${conicGradients.join(', ')})`;
    document.getElementById('categoryLegend').innerHTML = legendHTML;

    // 3. Bar Chart (Last 7 Days)
    const last7 = Utils.generateLastNDays(7).reverse(); // oldest to newest
    const barChartEl = document.getElementById('weeklyBarChart');
    
    let barHTML = '';
    last7.forEach(date => {
        let dayComplete = 0;
        state.habits.forEach(h => {
            if (h.history && h.history[date] && h.history[date].completed) dayComplete++;
        });
        
        const dayPct = Math.round((dayComplete / Math.max(state.habits.length, 1)) * 100);
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        
        barHTML += `
            <div class="bar-col">
                <div class="bar" style="height: ${dayPct}%">
                    <div class="bar-tooltip">${dayComplete}/${state.habits.length}</div>
                </div>
                <div class="bar-label">${dayName}</div>
            </div>
        `;
    });
    barChartEl.innerHTML = barHTML;
}

function renderCalendar() {
    // Generate GitHub style heatmap for last 119 days (17 weeks * 7 days)
    const totalDays = 119; 
    const dates = Utils.generateLastNDays(totalDays).reverse(); // Oldest first
    
    const grid = document.getElementById('heatmapGrid');
    
    // Group by day of week to create the matrix column-wise
    // CSS Grid grid-auto-flow: column handles the flow. We just append cells.
    
    let html = '';
    dates.forEach(date => {
        let completions = 0;
        state.habits.forEach(h => {
            if (h.history && h.history[date] && h.history[date].completed) completions++;
        });
        
        let intensity = 0;
        if (state.habits.length > 0) {
            const pct = completions / state.habits.length;
            if (pct > 0) intensity = 1;
            if (pct >= 0.25) intensity = 2;
            if (pct >= 0.5) intensity = 3;
            if (pct >= 0.8) intensity = 4;
        }
        
        html += `<div class="heatmap-cell level-${intensity}" title="${date}: ${completions} habits completed"></div>`;
    });
    
    grid.innerHTML = html;
}

function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
}

function applyTheme(themeName) {
    if (themeName === 'light') {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        DOM.themeBtn.innerHTML = '<span class="icon">☀️</span><span class="text">Light Mode</span>';
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        DOM.themeBtn.innerHTML = '<span class="icon">🌙</span><span class="text">Dark Mode</span>';
    }
}

// --- VISUAL FX (CONFETTI) ---
function triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const pieces = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    
    for(let i=0; i<80; i++) {
        pieces.push({
            x: canvas.width / 2,
            y: canvas.height / 2 + 100,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 1) * 20 - 5,
            size: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
    
    let animationId;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        
        pieces.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5; // gravity
            p.rotation += p.rotationSpeed;
            
            if(p.y < canvas.height) active = true;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        });
        
        if(active) {
            animationId = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    animate();
}

// Boot
document.addEventListener('DOMContentLoaded', init);
