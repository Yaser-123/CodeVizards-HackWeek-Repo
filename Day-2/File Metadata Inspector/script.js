document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const resultsSection = document.getElementById('resultsSection');
    const fileName = document.getElementById('fileName');
    const fileTypeBadge = document.getElementById('fileTypeBadge');
    const fileIcon = document.getElementById('fileIcon');
    const metadataGrid = document.getElementById('metadataGrid');

    // --- Drag & Drop Logic ---
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
            processFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    });

    // --- File Processing ---
    async function processFile(file) {
        // Reset UI
        metadataGrid.innerHTML = '';
        const filePreviewContainer = document.getElementById('filePreviewContainer');
        filePreviewContainer.innerHTML = '';
        filePreviewContainer.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        
        // Basic Info
        fileName.textContent = file.name;
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        
        if (isImage) {
            fileTypeBadge.textContent = 'IMAGE';
            fileIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
        } else if (isPDF) {
            fileTypeBadge.textContent = 'PDF DOCUMENT';
            fileIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
        } else {
            fileTypeBadge.textContent = 'UNKNOWN';
            fileIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>`;
        }

        // 1. Core Browser File API Metadata
        addMetaCard('File Size', formatBytes(file.size), 'highlight');
        addMetaCard('MIME Type', file.type || 'Unknown');
        
        if (file.lastModified) {
            const date = new Date(file.lastModified);
            addMetaCard('Last Modified', date.toLocaleString());
        }

        // 2. Image Specific Metadata (Dimensions + EXIF)
        if (isImage) {
            const objectUrl = URL.createObjectURL(file);
            
            // Render Image Preview
            filePreviewContainer.classList.remove('hidden');
            const imgPreview = document.createElement('img');
            imgPreview.src = objectUrl;
            filePreviewContainer.appendChild(imgPreview);

            // Get Dimensions via DOM Image object
            const img = new Image();
            img.onload = function() {
                addMetaCard('Dimensions', `${this.naturalWidth} × ${this.naturalHeight} px`);
                // Note: we don't revoke here because the preview img tag is using it
            };
            img.src = objectUrl;

            // Get EXIF via EXIF.js
            EXIF.getData(file, function() {
                const allTags = EXIF.getAllTags(this);
                
                if (allTags) {
                    if (allTags.Make || allTags.Model) {
                        const cameraInfo = `${allTags.Make || ''} ${allTags.Model || ''}`.trim();
                        if (cameraInfo) addMetaCard('Camera', cameraInfo, 'success');
                    }
                    if (allTags.DateTimeOriginal) {
                        addMetaCard('Date Taken', allTags.DateTimeOriginal);
                    }
                    if (allTags.ISOSpeedRatings) {
                        addMetaCard('ISO', allTags.ISOSpeedRatings);
                    }
                    if (allTags.FocalLength) {
                        addMetaCard('Focal Length', `${allTags.FocalLength}mm`);
                    }
                    if (allTags.FNumber) {
                        addMetaCard('Aperture', `f/${allTags.FNumber}`);
                    }
                    if (allTags.ExposureTime) {
                        let exposure = allTags.ExposureTime;
                        if (exposure < 1) {
                            exposure = `1/${Math.round(1/exposure)}`;
                        }
                        addMetaCard('Exposure', `${exposure}s`);
                    }

                    // GPS Data
                    if (allTags.GPSLatitude && allTags.GPSLongitude) {
                        const lat = convertDMSToDD(allTags.GPSLatitude, allTags.GPSLatitudeRef);
                        const lng = convertDMSToDD(allTags.GPSLongitude, allTags.GPSLongitudeRef);
                        
                        if (!isNaN(lat) && !isNaN(lng)) {
                            addGPSCard(lat.toFixed(5), lng.toFixed(5));
                        }
                    }
                }
            });
        }

        // 3. PDF Specific Metadata (via pdf.js)
        if (isPDF) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                
                // Render PDF Page 1 Preview
                try {
                    filePreviewContainer.classList.remove('hidden');
                    const canvas = document.createElement('canvas');
                    filePreviewContainer.appendChild(canvas);
                    
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                } catch (e) {
                    console.error("Failed to render PDF preview:", e);
                    filePreviewContainer.classList.add('hidden');
                }
                
                addMetaCard('Pages', pdf.numPages.toString(), 'success');
                
                const metaData = await pdf.getMetadata();
                if (metaData && metaData.info) {
                    const info = metaData.info;
                    if (info.Title) addMetaCard('Title', info.Title);
                    if (info.Author) addMetaCard('Author', info.Author);
                    if (info.Creator) addMetaCard('Creator', info.Creator);
                    if (info.Producer) addMetaCard('Producer', info.Producer);
                    
                    if (info.CreationDate) {
                        // PDF dates often look like D:20201026132402Z
                        let cleanDate = info.CreationDate.replace('D:', '').substring(0, 14);
                        if (cleanDate.length === 14) {
                            const year = cleanDate.substring(0,4);
                            const month = cleanDate.substring(4,6);
                            const day = cleanDate.substring(6,8);
                            addMetaCard('Created (PDF)', `${year}-${month}-${day}`);
                        }
                    }
                }
            } catch (err) {
                console.error("PDF Parsing error:", err);
            }
        }
    }

    // --- Helpers ---
    
    function addMetaCard(label, value, extraClass = '') {
        const card = document.createElement('div');
        card.className = `meta-card glass-card ${extraClass}`;
        card.innerHTML = `
            <span class="meta-label">${label}</span>
            <span class="meta-value">${value}</span>
        `;
        metadataGrid.appendChild(card);
    }
    
    function addGPSCard(lat, lng) {
        const card = document.createElement('div');
        card.className = `meta-card glass-card`;
        
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        
        card.innerHTML = `
            <span class="meta-label">GPS Location</span>
            <span class="meta-value">${lat}, ${lng}</span>
            <a href="${mapsLink}" target="_blank" class="map-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                View on Maps
            </a>
        `;
        metadataGrid.appendChild(card);
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function convertDMSToDD(dms, ref) {
        // EXIF GPS data is usually an array of 3 rational numbers: [degrees, minutes, seconds]
        if (!dms || dms.length < 3) return NaN;
        
        let dd = dms[0].valueOf() + (dms[1].valueOf() / 60) + (dms[2].valueOf() / 3600);
        
        if (ref == "S" || ref == "W") {
            dd = dd * -1;
        }
        return dd;
    }
});
