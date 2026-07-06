// API_KEY and API_URL are loaded from config.js
let currentCatUrls = [];

function canInject(url) {
  return url &&
    !url.startsWith('chrome://') &&
    !url.startsWith('chrome-extension://') &&
    !url.startsWith('about:') &&
    !url.startsWith('https://chromewebstore.google.com') &&
    !url.startsWith('https://accounts.google.com');
}

document.getElementById('replaceBtn').addEventListener('click', async () => {
  const count = parseInt(document.getElementById('catCount').value) || 50;
  setStatus('Fetching cat images...', '#ffffff');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!canInject(tab.url)) {
      setStatus('Cannot run on this page. Try a regular website.', '#ef4444');
      return;
    }

    currentCatUrls = await fetchCats(count);
    if (currentCatUrls.length === 0) {
      setStatus('Failed to fetch cats.', '#ef4444');
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: replaceAllImages,
      args: [currentCatUrls]
    });

    setStatus(`Replaced with ${currentCatUrls.length} cats!`, '#4ade80');
  } catch (err) {
    setStatus('Error: ' + err.message, '#ef4444');
  }
});

document.getElementById('restoreBtn').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!canInject(tab.url)) {
      setStatus('Cannot run on this page.', '#ef4444');
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: restoreAllImages
    });

    setStatus('Original images restored.', '#60a5fa');
  } catch (err) {
    setStatus('Error: ' + err.message, '#ef4444');
  }
});

async function fetchCats(limit) {
  const url = `${API_URL}?limit=${limit}&order=RAND`;
  const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
  if (!res.ok) throw new Error('API request failed');
  const data = await res.json();
  return data.map(cat => cat.url);
}

function setStatus(msg, color) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = color;
}

// Injected into the page
function replaceAllImages(catUrls) {
  window.__kittyOriginals = window.__kittyOriginals || { imgs: new Map(), bgs: new Map() };
  let idx = 0;

  document.querySelectorAll('img').forEach(img => {
    if (!window.__kittyOriginals.imgs.has(img)) {
      window.__kittyOriginals.imgs.set(img, img.src);
    }
    img.src = catUrls[idx % catUrls.length];
    img.removeAttribute('srcset');
    img.removeAttribute('data-src');
    img.removeAttribute('data-lazy-src');
    img.removeAttribute('loading');
    img.style.objectFit = 'cover';
    idx++;
  });

  document.querySelectorAll('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      if (!window.__kittyOriginals.bgs.has(el)) {
        window.__kittyOriginals.bgs.set(el, el.style.backgroundImage);
      }
      el.style.backgroundImage = `url('${catUrls[idx % catUrls.length]}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      idx++;
    }
  });

  document.querySelectorAll('picture source').forEach(s => s.removeAttribute('srcset'));

  document.querySelectorAll('[data-src]').forEach(el => {
    el.setAttribute('data-src', catUrls[idx % catUrls.length]);
    idx++;
  });

  document.querySelectorAll('[data-lazy-src]').forEach(el => {
    el.setAttribute('data-lazy-src', catUrls[idx % catUrls.length]);
    idx++;
  });

  document.querySelectorAll('video[poster]').forEach(v => {
    if (!window.__kittyOriginals.imgs.has(v)) {
      window.__kittyOriginals.imgs.set(v, v.poster);
    }
    v.poster = catUrls[idx % catUrls.length];
    idx++;
  });

  if (window.__kittyObserver) window.__kittyObserver.disconnect();
  window.__kittyObserver = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'IMG') {
          if (!window.__kittyOriginals.imgs.has(node)) {
            window.__kittyOriginals.imgs.set(node, node.src);
          }
          node.src = catUrls[idx % catUrls.length];
          node.removeAttribute('srcset');
          idx++;
        }
        node.querySelectorAll?.('img').forEach(img => {
          if (!window.__kittyOriginals.imgs.has(img)) {
            window.__kittyOriginals.imgs.set(img, img.src);
          }
          img.src = catUrls[idx % catUrls.length];
          img.removeAttribute('srcset');
          idx++;
        });
      });
    });
  });
  window.__kittyObserver.observe(document.body, { childList: true, subtree: true });
}

function restoreAllImages() {
  if (window.__kittyObserver) {
    window.__kittyObserver.disconnect();
    window.__kittyObserver = null;
  }
  if (!window.__kittyOriginals) return;

  window.__kittyOriginals.imgs.forEach((src, el) => {
    if (el.tagName === 'VIDEO' && el.poster !== undefined) {
      el.poster = src;
    } else {
      el.src = src;
    }
  });

  window.__kittyOriginals.bgs.forEach((bg, el) => {
    el.style.backgroundImage = bg || '';
    el.style.backgroundSize = '';
    el.style.backgroundPosition = '';
  });

  window.__kittyOriginals = { imgs: new Map(), bgs: new Map() };
}
