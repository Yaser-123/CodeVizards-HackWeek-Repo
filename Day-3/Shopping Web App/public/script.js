const socket = io();

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const statusText = document.getElementById('statusText');
const liveScreenshot = document.getElementById('liveScreenshot');
const placeholderText = document.getElementById('placeholderText');
const resultsContainer = document.getElementById('resultsContainer');

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    // Reset UI
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <span class="pulse-dot" style="display:inline-block; margin-right: 8px;"></span>
            Searching across the web...
        </div>
    `;
    placeholderText.style.display = 'block';
    placeholderText.textContent = 'Connecting to hidden browser...';
    liveScreenshot.style.display = 'none';
    searchBtn.disabled = true;
    searchBtn.style.opacity = '0.5';

    // Start search
    socket.emit('search', query);
});

socket.on('status', (msg) => {
    statusText.textContent = msg;
});

socket.on('screenshot', (base64Image) => {
    placeholderText.style.display = 'none';
    liveScreenshot.style.display = 'block';
    liveScreenshot.src = `data:image/jpeg;base64,${base64Image}`;
});

socket.on('results', (products) => {
    resultsContainer.innerHTML = '';
    
    if (!products || products.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state">No products found.</div>';
    } else {
        products.forEach(product => {
            const card = document.createElement('a');
            card.href = product.url || '#';
            card.target = '_blank';
            card.className = 'product-card';
            
            // Fallback image if none scraped
            const imgSrc = product.imageUrl || 'https://via.placeholder.com/120?text=No+Image';

            card.innerHTML = `
                <img src="${imgSrc}" alt="Product Image" class="product-img" onerror="this.src='https://via.placeholder.com/120?text=No+Image'">
                <div class="product-info">
                    <div class="product-title" style="display: block; width: 100%; min-height: 1.5rem; color: #1e293b !important; font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem; white-space: normal; overflow: hidden; word-wrap: break-word;">${product.title || 'Unknown Product'}</div>
                    <div style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 0.5rem;">★ ${product.rating || '4.0'}</div>
                    <div class="product-meta">
                        <span class="product-price">${product.priceStr}</span>
                        <span class="platform-badge platform-${product.platform}">${product.platform}</span>
                    </div>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    }

    // Reset state
    searchBtn.disabled = false;
    searchBtn.style.opacity = '1';
    setTimeout(() => {
        statusText.textContent = 'Ready for commands...';
        liveScreenshot.style.display = 'none';
        placeholderText.style.display = 'block';
        placeholderText.textContent = 'Task completed.';
    }, 2000);
});

socket.on('error', (msg) => {
    statusText.textContent = `Error: ${msg}`;
    searchBtn.disabled = false;
    searchBtn.style.opacity = '1';
});
