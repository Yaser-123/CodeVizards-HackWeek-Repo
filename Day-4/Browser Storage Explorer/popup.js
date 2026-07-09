let storageData = [];

function formatValue(val) {
  try {
    const parsed = JSON.parse(val);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return val;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const isMock = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isMock && !window.chrome?.tabs) {
    // Generate mock data for the demo video if not running inside an extension
    storageData = [
      { key: 'theme', value: 'dark', type: 'local', size: calculateSize('theme', 'dark') },
      { key: 'user_session', value: 'a8f9c2d1e4b5...', type: 'cookie', size: calculateSize('user_session', 'a8f9c2d1e4b5...'), cookieUrl: 'http://example.com' },
      { key: 'cart_items', value: '[{"id":1,"qty":2}]', type: 'local', size: calculateSize('cart_items', '[{"id":1,"qty":2}]') },
      { key: 'tracking_id', value: 'tk_998213', type: 'session', size: calculateSize('tracking_id', 'tk_998213') },
      { key: 'visited_pages', value: 'home,about,contact', type: 'session', size: calculateSize('visited_pages', 'home,about,contact') },
      { key: '_ga', value: 'GA1.2.123456789.1234567890', type: 'cookie', size: calculateSize('_ga', 'GA1.2.123456789.1234567890'), cookieUrl: 'http://example.com' }
    ];
    renderTable();
  } else {
    // Real extension logic
    await fetchStorageData();
  }

  // Setup event listeners for search and filters
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('filterLocal').addEventListener('change', renderTable);
  document.getElementById('filterSession').addEventListener('change', renderTable);
  document.getElementById('filterCookies').addEventListener('change', renderTable);
});

async function fetchStorageData() {
  storageData = [];
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
      renderTable(); 
      return;
    }

    const domain = new URL(tab.url).hostname;

    // Fetch Cookies
    const cookies = await chrome.cookies.getAll({ url: tab.url });
    cookies.forEach(cookie => {
      const cookieUrl = (cookie.secure ? "https://" : "http://") + cookie.domain.replace(/^\./, '') + cookie.path;
      storageData.push({
        key: cookie.name,
        value: cookie.value,
        type: 'cookie',
        size: calculateSize(cookie.name, cookie.value),
        cookieUrl: cookieUrl
      });
    });

    // Fetch Local and Session Storage
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          local: { ...localStorage },
          session: { ...sessionStorage }
        };
      }
    });

    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
      const { local, session } = injectionResults[0].result;
      
      Object.entries(local).forEach(([k, v]) => {
        storageData.push({ key: k, value: v, type: 'local', size: calculateSize(k, v) });
      });

      Object.entries(session).forEach(([k, v]) => {
        storageData.push({ key: k, value: v, type: 'session', size: calculateSize(k, v) });
      });
    }
  } catch (error) {
    console.error("Error fetching storage data:", error);
  }

  renderTable();
}

function calculateSize(key, value) {
  // Approximate size in bytes (UTF-16 chars are 2 bytes)
  return (String(key).length + String(value).length) * 2;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(2) + ' KB';
}

function renderTable() {
  const tbody = document.getElementById('storageTableBody');
  const emptyState = document.getElementById('emptyState');
  const query = document.getElementById('searchInput').value.toLowerCase();
  
  const showLocal = document.getElementById('filterLocal').checked;
  const showSession = document.getElementById('filterSession').checked;
  const showCookies = document.getElementById('filterCookies').checked;

  tbody.innerHTML = '';

  const filteredData = storageData.filter(item => {
    // Filter by type
    if (item.type === 'local' && !showLocal) return false;
    if (item.type === 'session' && !showSession) return false;
    if (item.type === 'cookie' && !showCookies) return false;

    // Filter by search query
    if (query) {
      return item.key.toLowerCase().includes(query) || item.value.toLowerCase().includes(query);
    }
    return true;
  });

  if (filteredData.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    filteredData.forEach(item => {
      const tr = document.createElement('tr');
      
      const typeBadge = item.type === 'local' ? 'Local' : (item.type === 'session' ? 'Session' : 'Cookie');
      
      // Escape HTML to prevent XSS
      const escapeHTML = (str) => {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
      };

      const safeKey = escapeHTML(item.key);
      const safeValue = escapeHTML(item.value);
      
      tr.innerHTML = `
        <td class="key-cell">
          <div class="key-cell-content">
            <span title="${safeKey}">${safeKey}</span>
            <span class="badge ${item.type}">${typeBadge}</span>
          </div>
        </td>
        <td class="value-cell">
          <div class="value-content" title="Click to view full value">${safeValue}</div>
        </td>
        <td class="size-text">${formatSize(item.size)}</td>
        <td><button class="delete-btn" data-key="${safeKey}" data-type="${item.type}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });

    // Add event listeners for full value view
    document.querySelectorAll('.value-content').forEach((el, index) => {
      el.addEventListener('click', () => {
        const modal = document.getElementById('valueModal');
        const contentPre = document.getElementById('modalValueContent');
        contentPre.textContent = formatValue(filteredData[index].value);
        modal.style.display = 'flex';
      });
    });

    // Add delete event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDelete);
    });
  }
}

// Modal Event Listeners
document.getElementById('closeModalBtn').addEventListener('click', () => {
  document.getElementById('valueModal').style.display = 'none';
});

document.getElementById('valueModal').addEventListener('click', (e) => {
  if (e.target.id === 'valueModal') {
    document.getElementById('valueModal').style.display = 'none';
  }
});

document.getElementById('copyValueBtn').addEventListener('click', async (e) => {
  const text = document.getElementById('modalValueContent').textContent;
  try {
    await navigator.clipboard.writeText(text);
    const btn = e.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = originalText, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
});

async function handleDelete(e) {
  const key = e.target.getAttribute('data-key');
  const type = e.target.getAttribute('data-type');
  
  const isMock = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isMock && !window.chrome?.tabs) {
    storageData = storageData.filter(i => !(i.key === key && i.type === type));
    renderTable();
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (type === 'cookie') {
      const item = storageData.find(i => i.key === key && i.type === 'cookie');
      if (item && item.cookieUrl) {
        await chrome.cookies.remove({ url: item.cookieUrl, name: key });
      }
    } else {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (storageType, itemKey) => {
          if (storageType === 'local') {
            localStorage.removeItem(itemKey);
          } else if (storageType === 'session') {
            sessionStorage.removeItem(itemKey);
          }
        },
        args: [type, key]
      });
    }

    // Refresh data after deletion
    await fetchStorageData();
  } catch (error) {
    console.error("Error deleting item:", error);
  }
}
