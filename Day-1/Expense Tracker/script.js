const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Education', 'Other'];

let state = { expenses: [], budgets: {} };

function loadState() {
  try {
    const saved = localStorage.getItem('expenseTracker');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.expenses = parsed.expenses || [];
      state.budgets = parsed.budgets || {};
    }
  } catch (e) { /* ignore */ }
}

function saveState() {
  localStorage.setItem('expenseTracker', JSON.stringify({ expenses: state.expenses, budgets: state.budgets }));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function formatAmt(n) {
  return '\u20B9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getCategoryClass(cat) {
  return 'cat-' + cat.replace(/\s+/g, '');
}

function addExpense() {
  const desc = document.getElementById('expenseDesc').value.trim();
  const amt = parseFloat(document.getElementById('expenseAmt').value);
  const category = document.getElementById('expenseCategory').value;
  let date = document.getElementById('expenseDate').value;
  if (!date) date = todayStr();

  if (!desc) { alert('Please enter a description.'); return; }
  if (!amt || amt <= 0) { alert('Please enter a valid amount.'); return; }

  state.expenses.push({ id: Date.now(), desc, amt, category, date });
  document.getElementById('expenseDesc').value = '';
  document.getElementById('expenseAmt').value = '';
  saveState();
  render();
}

function editExpense(id) {
  const exp = state.expenses.find(e => e.id === id);
  if (!exp) return;
  const newDesc = prompt('Description:', exp.desc);
  if (newDesc === null) return;
  const newAmt = parseFloat(prompt('Amount:', exp.amt));
  if (isNaN(newAmt) || newAmt <= 0) { alert('Invalid amount.'); return; }
  exp.desc = newDesc.trim();
  exp.amt = newAmt;
  saveState();
  render();
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  state.expenses = state.expenses.filter(e => e.id !== id);
  saveState();
  render();
}

function setBudget() {
  const amt = parseFloat(document.getElementById('budgetInput').value);
  const category = document.getElementById('budgetCategory').value;
  if (!amt || amt < 0) { alert('Enter a valid budget amount.'); return; }
  state.budgets[category] = amt;
  document.getElementById('budgetInput').value = '';
  saveState();
  render();
}

function getFilteredExpenses() {
  const monthFilter = document.getElementById('filterMonth').value;
  const catFilter = document.getElementById('filterCategory').value;
  return state.expenses.filter(e => {
    if (monthFilter && monthKey(e.date) !== monthFilter) return false;
    if (catFilter && e.category !== catFilter) return false;
    return true;
  });
}

function getMonthlySpending(month) {
  return state.expenses
    .filter(e => monthKey(e.date) === month)
    .reduce((sum, e) => sum + e.amt, 0);
}

function getCategorySpending(month) {
  const result = {};
  for (const cat of CATEGORIES) result[cat] = 0;
  const items = month ? state.expenses.filter(e => monthKey(e.date) === month) : state.expenses;
  for (const e of items) {
    if (!result[e.category]) result[e.category] = 0;
    result[e.category] += e.amt;
  }
  return result;
}

function renderBudgetBars() {
  const container = document.getElementById('budgetBars');
  const keys = Object.keys(state.budgets);
  if (keys.length === 0) {
    container.innerHTML = '<p style="color:#64748b;font-size:0.85rem;">No budgets set. Add a monthly budget above.</p>';
    return;
  }
  const thisMonth = todayStr().slice(0, 7);
  const html = keys.map(key => {
    const limit = state.budgets[key];
    const spent = key === '__overall__'
      ? getMonthlySpending(thisMonth)
      : state.expenses.filter(e => monthKey(e.date) === thisMonth && e.category === key).reduce((s, e) => s + e.amt, 0);
    const pct = Math.min((spent / limit) * 100, 100);
    const cls = pct > 90 ? 'danger' : pct > 70 ? 'warn' : 'safe';
    const label = key === '__overall__' ? 'Overall' : key;
    return `<div class="budget-bar-item">
      <span class="budget-bar-label">${label}</span>
      <div class="budget-bar-track"><div class="budget-bar-fill ${cls}" style="width:${pct}%"></div></div>
      <span class="budget-bar-text">${formatAmt(spent)} / ${formatAmt(limit)}</span>
    </div>`;
  }).join('');
  container.innerHTML = html;
}

let categoryChartInstance = null;
let monthlyChartInstance = null;

function renderCharts() {
  // Category pie chart - show ALL expenses (not filtered by month)
  const catData = getCategorySpending(null);
  const labels = CATEGORIES.filter(c => catData[c] > 0);
  const values = labels.map(c => catData[c]);
  const colors = ['#22c55e','#38bdf8','#e879f9','#fbbf24','#f97316','#f87171','#67e8f9','#64748b'];

  if (categoryChartInstance) categoryChartInstance.destroy();
  const ctx1 = document.getElementById('categoryChart').getContext('2d');
  categoryChartInstance = new Chart(ctx1, {
    type: 'pie',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [{ data: labels.length ? values : [1], backgroundColor: colors.slice(0, labels.length || 1), borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 12, padding: 12, font: { size: 11 } } }
      }
    }
  });

  // Monthly bar chart - show all months
  const allMonths = [...new Set(state.expenses.map(e => monthKey(e.date)))].sort();
  const monthlyTotals = allMonths.map(m => getMonthlySpending(m));
  if (monthlyChartInstance) monthlyChartInstance.destroy();
  const ctx2 = document.getElementById('monthlyChart').getContext('2d');
  monthlyChartInstance = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: allMonths.length ? allMonths : ['No data'],
      datasets: [{
        label: 'Spending',
        data: allMonths.length ? monthlyTotals : [0],
        backgroundColor: '#38bdf8',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => '\u20B9' + v }, grid: { color: '#1e293b' } }
      }
    }
  });
}

function switchChart(chartId, btn) {
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('categoryChart').style.display = chartId === 'categoryChart' ? 'block' : 'none';
  document.getElementById('monthlyChart').style.display = chartId === 'monthlyChart' ? 'block' : 'none';
}

function render() {
  const filtered = getFilteredExpenses();

  // Summary
  const thisMonth = todayStr().slice(0, 7);
  const thisMonthTotal = getMonthlySpending(thisMonth);
  document.getElementById('thisMonthAmt').textContent = formatAmt(thisMonthTotal);

  const totalAll = state.expenses.reduce((s, e) => s + e.amt, 0);
  document.getElementById('totalExpenses').textContent = formatAmt(totalAll);

  const usedCats = new Set(state.expenses.map(e => e.category));
  document.getElementById('categoriesUsed').textContent = usedCats.size;

  // Budget
  const overallBudget = state.budgets['__overall__'] || 0;
  const budgetLeft = overallBudget - totalAll;
  const budgetLeftEl = document.getElementById('budgetLeft');
  budgetLeftEl.textContent = formatAmt(budgetLeft);
  budgetLeftEl.style.color = budgetLeft >= 0 ? '#4ade80' : '#ef4444';

  renderBudgetBars();

  // Table
  const tbody = document.getElementById('expenseTable');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No expenses found</td></tr>';
    document.getElementById('filteredTotal').textContent = formatAmt(0);
  } else {
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    tbody.innerHTML = sorted.map(e => {
      const catClass = getCategoryClass(e.category);
      return `<tr>
        <td style="white-space:nowrap;">${e.date}</td>
        <td>${escHtml(e.desc)}</td>
        <td><span class="cat-badge ${catClass}">${e.category}</span></td>
        <td class="amt negative">${formatAmt(e.amt)}</td>
        <td>
          <button class="edit-btn" onclick="editExpense(${e.id})" title="Edit">\u270E</button>
          <button class="delete-btn" onclick="deleteExpense(${e.id})" title="Delete">\u2715</button>
        </td>
      </tr>`;
    }).join('');
    const filteredSum = filtered.reduce((s, e) => s + e.amt, 0);
    document.getElementById('filteredTotal').textContent = formatAmt(filteredSum);
  }

  // Filter dropdowns
  populateFilters();
  renderCharts();
}

function populateFilters() {
  const monthSelect = document.getElementById('filterMonth');
  const catSelect = document.getElementById('filterCategory');
  const currentMonth = monthSelect.value;
  const currentCat = catSelect.value;

  const months = [...new Set(state.expenses.map(e => monthKey(e.date)))].sort();
  monthSelect.innerHTML = '<option value="">All Months</option>' +
    months.map(m => `<option value="${m}">${m}</option>`).join('');
  monthSelect.value = currentMonth || '';

  catSelect.innerHTML = '<option value="">All Categories</option>' +
    CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  catSelect.value = currentCat || '';
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Init
loadState();
render();
