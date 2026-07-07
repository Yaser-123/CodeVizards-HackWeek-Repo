document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const tabViewVault = document.getElementById('tabViewVault');
    const tabCreate = document.getElementById('tabCreate');
    const viewVaultSection = document.getElementById('viewVault');
    const createCapsuleSection = document.getElementById('createCapsule');
    
    const capsuleForm = document.getElementById('capsuleForm');
    const imageInput = document.getElementById('imageInput');
    const fileLabel = document.getElementById('fileLabel');
    const formStatus = document.getElementById('formStatus');
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    
    const capsulesGrid = document.getElementById('capsulesGrid');
    
    const unlockModal = document.getElementById('unlockModal');
    const closeModal = document.getElementById('closeModal');
    const modalBody = document.getElementById('modalBody');

    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const authPasswordInput = document.getElementById('authPasswordInput');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authStatus = document.getElementById('authStatus');
    const authModalTitle = document.getElementById('authModalTitle');

    const confirmModal = document.getElementById('confirmModal');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');

    let countdownInterval;
    let editingCapsuleId = null; // Track if we are editing
    let currentAuthAction = null; // { type: 'unlock'|'edit', id: 123 }

    // --- Tab Navigation ---
    tabViewVault.addEventListener('click', () => {
        tabViewVault.classList.add('active');
        tabCreate.classList.remove('active');
        viewVaultSection.classList.remove('hidden');
        createCapsuleSection.classList.add('hidden');
        loadCapsules();
        cancelEditMode();
    });

    tabCreate.addEventListener('click', () => {
        tabCreate.classList.add('active');
        tabViewVault.classList.remove('active');
        createCapsuleSection.classList.remove('hidden');
        viewVaultSection.classList.add('hidden');
    });

    // --- File Input UI ---
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileLabel.textContent = e.target.files[0].name;
            fileLabel.style.color = 'var(--primary)';
        } else {
            fileLabel.textContent = 'Click or drag an image here';
            fileLabel.style.color = 'var(--text-secondary)';
        }
    });

    // --- Form Submission (Create or Edit) ---
    capsuleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('titleInput').value;
        const message = document.getElementById('messageInput').value;
        const unlockDate = document.getElementById('dateInput').value;
        const password = document.getElementById('passwordInput').value;
        const imageFile = imageInput.files[0];

        // Convert datetime-local string to timestamp
        const unlockTimestamp = new Date(unlockDate).getTime();
        if (unlockTimestamp <= Date.now() && !editingCapsuleId) {
            showFormStatus('Unlock date must be in the future!', 'var(--danger)');
            return;
        }

        submitBtn.disabled = true;
        submitBtnText.innerHTML = editingCapsuleId ? 'Updating...' : 'Burying...';

        const formData = new FormData();
        formData.append('title', title);
        formData.append('message', message);
        formData.append('unlock_date', unlockTimestamp);
        formData.append('password', password);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            let url = '/api/capsules';
            let method = 'POST';

            if (editingCapsuleId) {
                url = `/api/capsules/${editingCapsuleId}`;
                method = 'PUT';
                if (!imageFile) {
                    // Keep existing image if not uploading a new one
                    formData.append('keep_existing_image', 'true');
                }
            }

            const response = await fetch(url, { method, body: formData });
            const data = await response.json();
            
            if (response.ok) {
                showFormStatus(editingCapsuleId ? 'Capsule Updated!' : 'Memory successfully buried!', 'var(--success)');
                
                setTimeout(() => {
                    tabViewVault.click();
                    showFormStatus('', 'transparent');
                }, 1500);
            } else {
                showFormStatus(data.error || 'Failed to process capsule.', 'var(--danger)');
            }
        } catch (error) {
            console.error(error);
            showFormStatus('Network error occurred.', 'var(--danger)');
        } finally {
            submitBtn.disabled = false;
            submitBtnText.innerHTML = editingCapsuleId ? 'Update Capsule' : 'Bury Capsule';
        }
    });

    function showFormStatus(msg, color) {
        formStatus.textContent = msg;
        formStatus.style.color = color;
    }

    cancelEditBtn.addEventListener('click', cancelEditMode);

    function cancelEditMode() {
        editingCapsuleId = null;
        capsuleForm.reset();
        fileLabel.textContent = 'Click or drag an image here';
        fileLabel.style.color = 'var(--text-secondary)';
        submitBtnText.innerHTML = 'Bury Capsule';
        cancelEditBtn.classList.add('hidden');
        tabCreate.textContent = 'Bury a Memory';
    }

    // --- Vault Loading & Countdown Logic ---
    async function loadCapsules() {
        try {
            const response = await fetch('/api/capsules');
            const capsules = await response.json();
            
            if (capsules.length === 0) {
                capsulesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">Your vault is empty. Bury a memory first!</div>';
                return;
            }

            renderCapsules(capsules);
            
            if (countdownInterval) clearInterval(countdownInterval);
            countdownInterval = setInterval(() => updateCountdowns(capsules), 1000);

        } catch (error) {
            console.error('Failed to load vault', error);
            capsulesGrid.innerHTML = '<div class="error-msg">Failed to load vault. Make sure the server is running.</div>';
        }
    }

    function renderCapsules(capsules) {
        capsulesGrid.innerHTML = '';
        const now = Date.now();

        capsules.forEach(capsule => {
            const card = document.createElement('div');
            card.className = 'capsule-card glass-card';
            card.id = `capsule-${capsule.id}`;
            
            const unlockDate = new Date(capsule.unlock_date);
            const dateString = unlockDate.toLocaleDateString() + ' ' + unlockDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const isReady = now >= capsule.unlock_date;
            
            card.innerHTML = `
                <div class="capsule-header">
                    <div>
                        <h3>${capsule.title}</h3>
                        <div class="capsule-date">Unlocks: ${dateString}</div>
                    </div>
                    <span class="status-badge ${isReady ? 'status-unlocked' : 'status-locked'}">
                        ${isReady ? 'Ready' : 'Locked'}
                    </span>
                </div>
                
                <div class="capsule-body">
                    ${isReady 
                        ? `<button class="unlock-btn w-100" onclick="promptAuth('unlock', ${capsule.id}, ${capsule.has_password})">Unlock Memory</button>`
                        : `<div class="countdown-timer" id="timer-${capsule.id}">${getCountdownString(capsule.unlock_date, now)}</div>`
                    }
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button class="edit-btn w-100" onclick="promptAuth('edit', ${capsule.id}, ${capsule.has_password})">Edit</button>
                        <button class="delete-btn w-100" onclick="promptAuth('delete', ${capsule.id}, ${capsule.has_password})">Delete</button>
                    </div>
                </div>
            `;
            
            capsulesGrid.appendChild(card);
        });
    }

    function updateCountdowns(capsules) {
        const now = Date.now();
        let needsFullReRender = false;

        capsules.forEach(capsule => {
            const timerEl = document.getElementById(`timer-${capsule.id}`);
            if (timerEl) {
                if (now >= capsule.unlock_date) {
                    needsFullReRender = true;
                } else {
                    timerEl.textContent = getCountdownString(capsule.unlock_date, now);
                }
            }
        });

        if (needsFullReRender) {
            loadCapsules();
        }
    }

    function getCountdownString(unlockTime, now) {
        let diff = unlockTime - now;
        if (diff <= 0) return "00:00:00";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
        
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }

    // --- Auth Modal Logic ---
    window.promptAuth = function(type, id, hasPassword) {
        currentAuthAction = { type, id, hasPassword };
        
        if (!hasPassword) {
            if (type === 'delete') {
                confirmModal.classList.remove('hidden');
                
                confirmOkBtn.onclick = () => {
                    confirmModal.classList.add('hidden');
                    authPasswordInput.value = '';
                    authSubmitBtn.click();
                };
                
                confirmCancelBtn.onclick = () => {
                    confirmModal.classList.add('hidden');
                };
                return;
            }
            // Bypass modal, use empty password
            authPasswordInput.value = '';
            authSubmitBtn.click();
            return;
        }

        let title = 'Unlock Capsule';
        if (type === 'edit') title = 'Edit Capsule';
        if (type === 'delete') title = 'Delete Capsule';
        
        authModalTitle.textContent = title;
        authPasswordInput.value = '';
        authStatus.textContent = '';
        authModal.classList.remove('hidden');
        authPasswordInput.focus();
    };

    closeAuthModal.addEventListener('click', () => {
        authModal.classList.add('hidden');
    });

    authSubmitBtn.addEventListener('click', async () => {
        const password = authPasswordInput.value;
        if (!password && currentAuthAction.hasPassword) {
            authStatus.textContent = "Password required.";
            return;
        }

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Verifying...';

        try {
            if (currentAuthAction.type === 'delete') {
                const response = await fetch(`/api/capsules/${currentAuthAction.id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                
                const data = await response.json();
                if (!response.ok) {
                    authStatus.textContent = data.error || 'Access Denied.';
                } else {
                    authModal.classList.add('hidden');
                    loadCapsules();
                }
                return;
            }

            // Both Unlock and Edit need to fetch the full capsule data. 
            // The /api/capsules/:id/unlock endpoint does exactly this if password is correct.
            const response = await fetch(`/api/capsules/${currentAuthAction.id}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (!response.ok) {
                authStatus.textContent = data.error || 'Access Denied.';
            } else {
                if (currentAuthAction.type === 'unlock') {
                    if (data.is_locked) {
                        authStatus.textContent = "Time has not arrived yet!";
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Submit';
                        return; // Don't close the modal, let them see the message
                    } else {
                        authModal.classList.add('hidden');
                        showUnlockModal(data);
                    }
                } else if (currentAuthAction.type === 'edit') {
                    authModal.classList.add('hidden');
                    setupEditMode(data, password);
                }
            }
        } catch (error) {
            authStatus.textContent = 'Network error.';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Submit';
        }
    });

    // Handle enter key in auth modal
    authPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') authSubmitBtn.click();
    });

    function setupEditMode(capsule, password) {
        editingCapsuleId = capsule.id;
        
        document.getElementById('titleInput').value = capsule.title;
        document.getElementById('messageInput').value = capsule.message;
        document.getElementById('passwordInput').value = password; // Pre-fill password for convenience

        // Convert timestamp to YYYY-MM-DDTHH:MM for datetime-local
        const d = new Date(capsule.unlock_date);
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0,16);
        document.getElementById('dateInput').value = localISOTime;

        if (capsule.image_url) {
            fileLabel.textContent = "Existing image saved. Upload new to replace.";
        }

        tabCreate.textContent = 'Edit Capsule';
        submitBtnText.innerHTML = 'Update Capsule';
        cancelEditBtn.classList.remove('hidden');
        
        tabCreate.click(); // Switch to form tab
    }

    // --- Content Modal Logic ---
    function showUnlockModal(capsule) {
        let html = `<h2>${capsule.title}</h2>`;
        if (capsule.image_url) {
            html += `<img src="${capsule.image_url}" class="memory-image" alt="Memory Image">`;
        }
        if (capsule.message) {
            html += `<div class="memory-message">${capsule.message}</div>`;
        }
        const unlockDate = new Date(capsule.unlock_date);
        html += `<div style="color: var(--text-secondary); font-size: 0.85rem; text-align: center; margin-top: 1rem;">
            Buried: ${new Date(capsule.created_at).toLocaleDateString()} • Unlocked: ${unlockDate.toLocaleDateString()}
        </div>`;

        modalBody.innerHTML = html;
        unlockModal.classList.remove('hidden');
    }

    closeModal.addEventListener('click', () => {
        unlockModal.classList.add('hidden');
        modalBody.innerHTML = '';
    });

    loadCapsules();
});
