document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewSection = document.getElementById('preview-section');
    const thumbnailsContainer = document.getElementById('thumbnails');
    const fileCount = document.getElementById('file-count');
    const analyzeBtn = document.getElementById('analyze-btn');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');
    const matchesGrid = document.getElementById('matches-grid');
    const noMatches = document.getElementById('no-matches');

    // Modal elements
    const modal = document.getElementById('image-modal');
    const modalContent = document.getElementById('modal-content');
    const closeModal = document.getElementById('close-modal');

    let selectedFiles = [];
    let fileUrls = {}; // Map filename to local object URL for instant display

    // Setup Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        selectedFiles = [...selectedFiles, ...imageFiles];
        
        // Render thumbnails
        previewSection.style.display = 'block';
        fileCount.textContent = selectedFiles.length;
        
        thumbnailsContainer.innerHTML = '';
        selectedFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            fileUrls[file.name] = url; // Store for later

            const wrapper = document.createElement('div');
            wrapper.classList.add('thumbnail-wrapper');
            
            const img = document.createElement('img');
            img.src = url;
            
            wrapper.appendChild(img);
            thumbnailsContainer.appendChild(wrapper);
        });
    }

    // Modal close logic
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    analyzeBtn.addEventListener('click', async () => {
        if (selectedFiles.length < 2) {
            alert('Please upload at least 2 images to compare.');
            return;
        }

        previewSection.style.display = 'none';
        dropZone.style.display = 'none';
        loader.style.display = 'block';
        resultsSection.style.display = 'none';

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            renderResults(data.clusters);
        } catch (error) {
            alert('Error during analysis: ' + error.message);
            dropZone.style.display = 'block';
            previewSection.style.display = 'block';
        } finally {
            loader.style.display = 'none';
        }
    });

    function renderResults(clusters) {
        resultsSection.style.display = 'block';
        matchesGrid.innerHTML = '';

        if (!clusters || clusters.length === 0) {
            noMatches.style.display = 'block';
            return;
        }
        noMatches.style.display = 'none';

        clusters.forEach(cluster => {
            const card = document.createElement('div');
            card.className = 'match-card';
            card.title = "Click to view images side-by-side";
            
            let imagesHtml = '';
            let namesHtml = '';
            
            cluster.images.forEach(imgName => {
                imagesHtml += `<img src="${fileUrls[imgName]}" alt="${imgName}">`;
                namesHtml += `<span title="${imgName}">${imgName}</span>`;
            });

            card.innerHTML = `
                <div class="match-images">
                    ${imagesHtml}
                </div>
                <div class="match-info">
                    <div class="match-names">
                        ${namesHtml}
                    </div>
                    <div class="similarity-badge badge-high">
                        ${cluster.similarity}% Match
                    </div>
                </div>
            `;
            
            // Open modal on click
            card.addEventListener('click', () => {
                modalContent.innerHTML = imagesHtml;
                modal.style.display = 'flex';
            });

            matchesGrid.appendChild(card);
        });
    }
});
