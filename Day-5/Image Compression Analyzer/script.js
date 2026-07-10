document.addEventListener('DOMContentLoaded', () => {
    const screens = {
        upload: document.getElementById('upload-screen'),
        dashboard: document.getElementById('dashboard-screen')
    };

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const addMoreInput = document.getElementById('add-more-input');
    const addMoreBtn = document.getElementById('add-more-btn');
    const thumbnailList = document.getElementById('thumbnail-list');
    const downloadSingleBtn = document.getElementById('download-single-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    
    // Workspace Elements
    const currentFilenameEl = document.getElementById('current-filename');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const comparisonContainer = document.getElementById('comparison-container');
    const imgOriginal = document.getElementById('img-original');
    const imgCompressed = document.getElementById('img-compressed');
    const compressedWrapper = document.getElementById('compressed-wrapper');
    const sliderHandle = document.getElementById('slider-handle');

    // Metrics
    const mOriginal = document.getElementById('metric-original');
    const mCompressed = document.getElementById('metric-compressed');
    const mSaved = document.getElementById('metric-saved');
    const mDimensions = document.getElementById('metric-dimensions');

    let imagesData = []; // Store uploaded images { id, name, originalFile, originalDataUrl, compressedBlob, compressedDataUrl, quality, width, height }
    let activeImageId = null;

    // --- Upload Logic ---
    function handleFiles(files) {
        if (files.length === 0) return;
        
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) return alert("Only images are supported.");

        // Switch to dashboard
        screens.upload.classList.remove('active');
        screens.dashboard.classList.add('active');

        validFiles.forEach(file => {
            const id = Date.now() + Math.random().toString(36).substr(2, 9);
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const data = {
                        id: id,
                        name: file.name,
                        originalFile: file,
                        originalDataUrl: e.target.result,
                        quality: 0.8, // Default 80%
                        width: img.width,
                        height: img.height,
                        compressedBlob: null,
                        compressedDataUrl: null
                    };
                    imagesData.push(data);
                    renderThumbnails();
                    
                    // Compress it immediately
                    compressImage(data, () => {
                        if (activeImageId === null) {
                            setActiveImage(id);
                        }
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Drag and Drop Events
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    // Add More
    addMoreBtn.addEventListener('click', () => addMoreInput.click());
    addMoreInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // --- UI Logic ---
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function renderThumbnails() {
        thumbnailList.innerHTML = '';
        imagesData.forEach(img => {
            const div = document.createElement('div');
            div.className = `thumbnail-item ${img.id === activeImageId ? 'active' : ''}`;
            div.onclick = () => setActiveImage(img.id);
            
            div.innerHTML = `
                <img src="${img.originalDataUrl}" class="thumb-img">
                <div class="thumb-info">
                    <div class="thumb-name">${img.name}</div>
                    <div class="thumb-size" id="thumb-size-${img.id}">...</div>
                </div>
                <button class="thumb-remove" onclick="event.stopPropagation(); removeImage('${img.id}')">✕</button>
            `;
            thumbnailList.appendChild(div);
            
            if (img.compressedBlob) {
                updateThumbnailSize(img.id, img.compressedBlob.size);
            }
        });
        
        downloadAllBtn.style.display = imagesData.length > 1 ? 'block' : 'none';
        downloadSingleBtn.style.display = imagesData.length === 1 ? 'block' : 'none';
        
        if (imagesData.length === 0) {
            screens.dashboard.classList.remove('active');
            screens.upload.classList.add('active');
        }
    }

    function updateThumbnailSize(id, size) {
        const el = document.getElementById(`thumb-size-${id}`);
        if (el) el.textContent = formatBytes(size);
    }

    window.removeImage = (id) => {
        imagesData = imagesData.filter(img => img.id !== id);
        if (activeImageId === id) {
            activeImageId = imagesData.length > 0 ? imagesData[0].id : null;
        }
        renderThumbnails();
        if (activeImageId) setActiveImage(activeImageId);
    };

    function setActiveImage(id) {
        activeImageId = id;
        renderThumbnails();
        const img = imagesData.find(i => i.id === id);
        if (!img) return;

        currentFilenameEl.textContent = img.name;
        qualitySlider.value = img.quality * 100;
        qualityValue.textContent = qualitySlider.value;
        
        imgOriginal.src = img.originalDataUrl;
        
        if (img.compressedDataUrl) {
            updateWorkspaceView(img);
        } else {
            compressImage(img, () => updateWorkspaceView(img));
        }
    }

    function updateWorkspaceView(img) {
        imgCompressed.src = img.compressedDataUrl;
        
        // Sync inner image width to container
        const rect = comparisonContainer.getBoundingClientRect();
        imgCompressed.style.width = `${rect.width}px`;
        imgCompressed.style.height = `${rect.height}px`;

        mOriginal.textContent = formatBytes(img.originalFile.size);
        mCompressed.textContent = formatBytes(img.compressedBlob.size);
        
        const ratio = (1 - (img.compressedBlob.size / img.originalFile.size)) * 100;
        mSaved.textContent = ratio > 0 ? `${ratio.toFixed(1)}%` : '0%';
        mDimensions.textContent = `${img.width} x ${img.height}`;
        
        updateThumbnailSize(img.id, img.compressedBlob.size);
    }

    // --- Compression Engine ---
    function compressImage(imgData, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = imgData.width;
            canvas.height = imgData.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Compress to JPEG
            canvas.toBlob((blob) => {
                imgData.compressedBlob = blob;
                const url = URL.createObjectURL(blob);
                
                // Cleanup old url
                if (imgData.compressedDataUrl && imgData.compressedDataUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(imgData.compressedDataUrl);
                }
                
                imgData.compressedDataUrl = url;
                if (callback) callback();
            }, 'image/jpeg', imgData.quality);
        };
        img.src = imgData.originalDataUrl;
    }

    // Quality Slider Change
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
    });

    qualitySlider.addEventListener('change', (e) => {
        if (!activeImageId) return;
        const img = imagesData.find(i => i.id === activeImageId);
        img.quality = e.target.value / 100;
        
        // Re-compress
        compressImage(img, () => {
            if (activeImageId === img.id) {
                updateWorkspaceView(img);
            }
        });
    });

    // --- Side by Side Slider Logic ---
    let isDragging = false;

    // Keep internal image width synced on resize
    window.addEventListener('resize', () => {
        if (activeImageId) {
            const rect = comparisonContainer.getBoundingClientRect();
            imgCompressed.style.width = `${rect.width}px`;
            imgCompressed.style.height = `${rect.height}px`;
        }
    });

    function moveSlider(e) {
        if (!isDragging) return;
        let x;
        const rect = comparisonContainer.getBoundingClientRect();
        if (e.type.includes('touch')) {
            x = e.touches[0].clientX - rect.left;
        } else {
            x = e.clientX - rect.left;
        }
        
        x = Math.max(0, Math.min(x, rect.width));
        const percent = (x / rect.width) * 100;
        
        compressedWrapper.style.width = `${percent}%`;
        sliderHandle.style.left = `${percent}%`;
    }

    sliderHandle.addEventListener('mousedown', () => isDragging = true);
    sliderHandle.addEventListener('touchstart', () => isDragging = true);
    
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('touchend', () => isDragging = false);
    
    window.addEventListener('mousemove', moveSlider);
    window.addEventListener('touchmove', moveSlider);

    // --- Downloading ---
    downloadSingleBtn.addEventListener('click', () => {
        if (!activeImageId) return;
        const img = imagesData.find(i => i.id === activeImageId);
        triggerDownload(img.compressedDataUrl, getCompressedName(img.name));
    });

    downloadAllBtn.addEventListener('click', async () => {
        if (imagesData.length === 0) return;
        
        const zip = new JSZip();
        
        imagesData.forEach(img => {
            // Add blob to zip
            zip.file(getCompressedName(img.name), img.compressedBlob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        triggerDownload(url, "compressed_images.zip");
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    function getCompressedName(originalName) {
        const parts = originalName.split('.');
        parts.pop(); // remove ext
        return parts.join('.') + '_compressed.jpg';
    }

    function triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});
