/**
 * Color Blindness Simulator - JavaScript Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const compareZone = document.getElementById('compareZone');
    const resetUploadBtn = document.getElementById('resetUploadBtn');
    
    const imageWrapper = document.getElementById('imageWrapper');
    const originalImg = document.getElementById('originalImg');
    const simulatedImg = document.getElementById('simulatedImg');
    const originalOverlay = document.getElementById('originalOverlay');
    const sliderHandle = document.getElementById('sliderHandle');
    
    const modeBtns = document.querySelectorAll('.mode-btn');
    const simBadge = document.getElementById('simBadge');
    
    const downloadBtn = document.getElementById('downloadBtn');
    const exportCanvas = document.getElementById('exportCanvas');
    const exportCtx = exportCanvas.getContext('2d', { willReadFrequently: true });
    
    // State
    let currentMode = 'protanopia';
    let isDraggingSlider = false;
    let originalImageObj = null; // Store Image object for exporting
    let currentFileName = 'image.png';
    
    // Matrix definitions for Export processing
    const colorMatrices = {
        protanopia: [
            0.112, 0.888, 0.000,
            0.112, 0.888, 0.000,
            0.002, -0.002, 1.000
        ],
        deuteranopia: [
            0.367, 0.633, 0.000,
            0.280, 0.720, 0.000,
            -0.012, 0.012, 1.000
        ],
        tritanopia: [
            1.000, 0.171, -0.171,
            0.000, 0.910, 0.090,
            0.000, 0.883, 0.117
        ],
        achromatopsia: [
            0.299, 0.587, 0.114,
            0.299, 0.587, 0.114,
            0.299, 0.587, 0.114
        ]
    };

    // --- File Upload Logic ---
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    function handleFileUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }
        
        currentFileName = file.name;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            // Set image sources
            originalImg.src = dataUrl;
            simulatedImg.src = dataUrl;
            
            // Keep a reference for canvas export
            originalImageObj = new Image();
            originalImageObj.src = dataUrl;
            
            // Switch UI states
            uploadZone.classList.add('hidden');
            compareZone.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
            
            // Initialize filters & layout
            updateMode(currentMode);
            
            // Wait for image to load to set width
            originalImg.onload = () => {
                resizeOverlayImage();
                // Set slider to middle
                setSliderPosition(imageWrapper.clientWidth / 2);
            };
        };
        
        reader.readAsDataURL(file);
    }
    
    resetUploadBtn.addEventListener('click', () => {
        compareZone.classList.add('hidden');
        downloadBtn.classList.add('hidden');
        uploadZone.classList.remove('hidden');
        fileInput.value = '';
    });
    
    // --- Mode Selection Logic ---
    
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const mode = btn.dataset.filter;
            updateMode(mode);
        });
    });
    
    function updateMode(mode) {
        currentMode = mode;
        
        // Remove all filter classes
        simulatedImg.className = '';
        // Add new filter class
        simulatedImg.classList.add(`filter-${mode}`);
        
        // Update Badge Text
        const formattedMode = mode.charAt(0).toUpperCase() + mode.slice(1);
        simBadge.textContent = formattedMode;
    }
    
    // --- Interactive Slider Logic ---
    
    // We must ensure the inner originalImg always spans the full width of the wrapper,
    // even though its parent (originalOverlay) will have its width animated/changed.
    function resizeOverlayImage() {
        const wrapperRect = imageWrapper.getBoundingClientRect();
        originalImg.style.width = `${wrapperRect.width}px`;
        originalImg.style.height = `${wrapperRect.height}px`;
    }
    
    window.addEventListener('resize', () => {
        if (!compareZone.classList.contains('hidden')) {
            resizeOverlayImage();
            // Reset to middle on resize
            setSliderPosition(imageWrapper.clientWidth / 2);
        }
    });
    
    function setSliderPosition(x) {
        const width = imageWrapper.clientWidth;
        let clampedX = Math.max(0, Math.min(x, width));
        
        // Move the handle
        sliderHandle.style.left = `${clampedX}px`;
        // Clip the original image overlay
        originalOverlay.style.width = `${clampedX}px`;
    }
    
    function onSliderMove(e) {
        if (!isDraggingSlider) return;
        
        // Get touch or mouse position
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const rect = imageWrapper.getBoundingClientRect();
        const x = clientX - rect.left;
        
        setSliderPosition(x);
    }
    
    // Mouse Events
    sliderHandle.addEventListener('mousedown', (e) => {
        isDraggingSlider = true;
        e.preventDefault(); // Prevent text selection
    });
    
    window.addEventListener('mouseup', () => {
        isDraggingSlider = false;
    });
    
    window.addEventListener('mousemove', onSliderMove);
    
    // Touch Events for mobile
    sliderHandle.addEventListener('touchstart', (e) => {
        isDraggingSlider = true;
        e.preventDefault(); // Prevent scrolling while dragging
    }, { passive: false });
    
    window.addEventListener('touchend', () => {
        isDraggingSlider = false;
    });
    
    window.addEventListener('touchmove', onSliderMove, { passive: false });


    // --- High-Performance Canvas Export Logic ---
    
    downloadBtn.addEventListener('click', () => {
        if (!originalImageObj) return;
        
        // Temporarily change button state to show loading
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = 'Processing...';
        downloadBtn.disabled = true;
        
        // Use a slight timeout to allow the UI to update to "Processing..."
        setTimeout(() => {
            processAndDownload();
            // Restore button
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }, 50);
    });
    
    function processAndDownload() {
        // Set canvas to original image dimensions
        const width = originalImageObj.naturalWidth;
        const height = originalImageObj.naturalHeight;
        
        exportCanvas.width = width;
        exportCanvas.height = height;
        
        // Draw original
        exportCtx.drawImage(originalImageObj, 0, 0);
        
        // Get image data
        const imageData = exportCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const m = colorMatrices[currentMode];
        
        // Apply Color Matrix Transformation
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            data[i]     = (r * m[0]) + (g * m[1]) + (b * m[2]); // Red channel
            data[i + 1] = (r * m[3]) + (g * m[4]) + (b * m[5]); // Green channel
            data[i + 2] = (r * m[6]) + (g * m[7]) + (b * m[8]); // Blue channel
            // Alpha (data[i+3]) remains unchanged
        }
        
        // Put modified data back to canvas
        exportCtx.putImageData(imageData, 0, 0);
        
        // Export to Blob and download
        const ext = currentFileName.split('.').pop() || 'png';
        const nameWithoutExt = currentFileName.replace(/\.[^/.]+$/, "");
        const newFileName = `${nameWithoutExt}-${currentMode}.${ext}`;
        
        // Create an anchor and trigger download
        const dataUrl = exportCanvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = newFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});
