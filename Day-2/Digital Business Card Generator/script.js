/* ═══════════════════════════════════════════
   CardCraft — Application Logic
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ───
  const state = {
    template: 'executive',
    uploadedImage: null,
    isDownloading: false,
  };

  // ─── Template Config ───
  const TEMPLATES = ['executive', 'apex', 'pristine', 'radiance'];

  // ─── SVG Icons ───
  const ICONS = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  };

  const SOCIAL_LABELS = {
    linkedin: 'LinkedIn',
    twitter: 'X',
    github: 'GitHub',
    instagram: 'Instagram',
  };

  // ─── DOM Refs ───
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const dom = {};
  function cacheDom () {
    dom.cardContainer = $('#card-capture');
    dom.name = $('#name');
    dom.title = $('#title');
    dom.company = $('#company');
    dom.email = $('#email');
    dom.phone = $('#phone');
    dom.website = $('#website');
    dom.location = $('#location');
    dom.imageInput = $('#imageInput');
    dom.uploadBtn = $('#uploadBtn');
    dom.clearImage = $('#clearImage');
    dom.imagePreview = $('#imagePreview');
    dom.previewInitials = $('#previewInitials');
    dom.templateBtns = $$('.template-btn');
    dom.socialToggles = $$('.social-toggle');
    dom.socialInputs = $$('.social-input');
    dom.downloadPng = $('#downloadPng');
    dom.downloadPdf = $('#downloadPdf');
    dom.toastContainer = $('#toastContainer');
    dom.header = $('#header');
  }

  // ─── Helpers ───
  function escapeHtml (s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function debounce (fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function getInitials (name) {
    return name
      .split(/\s+/)
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  }

  // ─── Toast System ───
  function showToast (message, type) {
    const el = document.createElement('div');
    el.className = `toast ${type || ''}`;
    el.innerHTML = `
      <span class="toast-icon">
        ${type === 'success'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
      </span>
      ${escapeHtml(message)}
    `;
    dom.toastContainer.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add('visible');
    });

    setTimeout(() => {
      el.classList.add('toast-hiding');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 2800);
  }

  // ─── Card Rendering ───
  function collectContactItems () {
    const items = [];
    const email = dom.email.value.trim();
    const phone = dom.phone.value.trim();
    const website = dom.website.value.trim();
    const location = dom.location.value.trim();

    if (email) items.push({ icon: ICONS.email, text: email });
    if (phone) items.push({ icon: ICONS.phone, text: phone });
    if (website) items.push({ icon: ICONS.website, text: website });
    if (location) items.push({ icon: ICONS.location, text: location });
    return items;
  }

  function collectSocialLinks () {
    const links = [];
    dom.socialToggles.forEach(toggle => {
      const platform = toggle.dataset.social;
      const input = $(`.social-input[data-social="${platform}"]`);
      const active = toggle.classList.contains('active');
      const url = input ? input.value.trim() : '';
      if (active && url) {
        links.push({ platform, url, label: SOCIAL_LABELS[platform] });
      }
    });
    return links;
  }

  function renderContact (items, wrapperClass, itemClass) {
    if (!items.length) return '';
    return `<div class="${wrapperClass}">${items.map(i =>
      `<div class="${itemClass}">${i.icon}<span>${escapeHtml(i.text)}</span></div>`
    ).join('')}</div>`;
  }

  function extractHandle (platform, url) {
    try {
      let u = url.trim();
      if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
      const parsed = new URL(u);
      const parts = parsed.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      const handle = parts[parts.length - 1] || '';
      return handle;
    } catch {
      return url.trim();
    }
  }

  function formatSocialDisplay (platform, url) {
    const handle = extractHandle(platform, url);
    if (!handle) return '';
    switch (platform) {
      case 'linkedin': return handle;
      case 'twitter': return `@${handle}`;
      case 'github': return handle;
      case 'instagram': return handle;
      default: return handle;
    }
  }

  const SOCIAL_ICONS = {
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
  };

  function renderSocialLinks (links) {
    if (!links.length) return '';
    const items = links.map(l => {
      const display = formatSocialDisplay(l.platform, l.url);
      if (!display) return null;
      const icon = SOCIAL_ICONS[l.platform] || '';
      return `<span class="card-social-item">${icon}<span class="card-social-handle">${escapeHtml(display)}</span></span>`;
    }).filter(Boolean);
    if (!items.length) return '';
    return `<div class="card-social">${items.join('')}</div>`;
  }

  function renderAvatarImg (alt) {
    return state.uploadedImage;
  }

  function renderAvatar (name, imgClass, placeholderClass, options = {}) {
    const { round = true, size = '68px' } = options;
    if (state.uploadedImage) {
      return `<img class="${imgClass}" src="${state.uploadedImage}" alt="${escapeHtml(name)}" />`;
    }
    const initials = getInitials(name);
    const br = round ? '50%' : '16px';
    return `<div class="${placeholderClass}" style="border-radius:${br}">${initials}</div>`;
  }

  function renderCard () {
    const name = dom.name.value.trim() || 'Your Name';
    const title = dom.title.value.trim() || 'Job Title';
    const company = dom.company.value.trim() || 'Company';
    const contactItems = collectContactItems();
    const socialLinks = collectSocialLinks();
    const template = state.template;

    let html = '';

    // ── Executive ──
    if (template === 'executive') {
      html = `
        <div class="card card-executive">
          <div class="card-accent"></div>
          <div class="card-body">
            <div class="card-row">
              ${renderAvatar(name, 'card-avatar', 'card-avatar-placeholder', { round: true, size: '68px' })}
              <div>
                <div class="card-name">${escapeHtml(name)}</div>
                <div class="card-title">${escapeHtml(title)}</div>
                <div class="card-company">${escapeHtml(company)}</div>
              </div>
            </div>
            ${contactItems.length ? '<div class="card-divider"></div>' : ''}
            ${renderContact(contactItems, 'card-contact', 'card-contact-item')}
            ${socialLinks.length ? renderSocialLinks(socialLinks) : ''}
          </div>
        </div>`;
    }

    // ── Apex ──
    else if (template === 'apex') {
      html = `
        <div class="card card-apex">
          <div class="card-top">
            ${renderAvatar(name, 'card-avatar', 'card-avatar-placeholder', { round: true, size: '64px' })}
            <div>
              <div class="card-name">${escapeHtml(name)}</div>
              <div class="card-title">${escapeHtml(title)}</div>
              <div class="card-company">${escapeHtml(company)}</div>
            </div>
          </div>
          ${contactItems.length ? '<div class="card-divider"></div>' : ''}
          ${renderContact(contactItems, 'card-contact', 'card-contact-item')}
          ${socialLinks.length ? renderSocialLinks(socialLinks) : ''}
        </div>`;
    }

    // ── Pristine ──
    else if (template === 'pristine') {
      html = `
        <div class="card card-pristine">
          <div class="card-row">
            ${renderAvatar(name, 'card-avatar', 'card-avatar-placeholder', { round: false, size: '60px' })}
            <div>
              <div class="card-name">${escapeHtml(name)}</div>
              <div class="card-title">${escapeHtml(title)}</div>
              <div class="card-company">${escapeHtml(company)}</div>
            </div>
          </div>
          ${contactItems.length ? '<div class="card-divider"></div>' : ''}
          ${renderContact(contactItems, 'card-grid', 'card-contact-item')}
          ${socialLinks.length ? renderSocialLinks(socialLinks) : ''}
        </div>`;
    }

    // ── Radiance ──
    else if (template === 'radiance') {
      html = `
        <div class="card card-radiance">
          <div class="card-avatar-col">
            ${renderAvatar(name, 'card-avatar', 'card-avatar-placeholder', { round: true, size: '80px' })}
          </div>
          <div class="card-info">
            <div class="card-name">${escapeHtml(name)}</div>
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="card-company">${escapeHtml(company)}</div>
            ${contactItems.length ? '<div class="card-divider"></div>' : ''}
            ${renderContact(contactItems, 'card-contact', 'card-contact-item')}
            ${socialLinks.length ? renderSocialLinks(socialLinks) : ''}
          </div>
        </div>`;
    }

    dom.cardContainer.innerHTML = html;
    dom.cardContainer.classList.remove('card-switching');
    void dom.cardContainer.offsetWidth; // force reflow
    dom.cardContainer.classList.add('card-switching');
  }

  // ─── Debounced render ───
  const renderCardDebounced = debounce(renderCard, 60);

  // ─── Image Upload ───
  function handleImageUpload (file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      state.uploadedImage = e.target.result;
      dom.imagePreview.innerHTML = `<img src="${state.uploadedImage}" alt="" />`;
      dom.imagePreview.classList.add('has-image');
      dom.previewInitials.textContent = '';
      renderCard();
      showToast('Photo uploaded successfully', 'success');
    };
    reader.onerror = () => {
      showToast('Failed to load image. Please try again.', 'error');
    };
    reader.readAsDataURL(file);
  }

  function clearImage () {
    state.uploadedImage = null;
    dom.imageInput.value = '';
    const initials = getInitials(dom.name.value.trim() || 'Your Name');
    dom.imagePreview.innerHTML = `<span class="image-preview-initials">${initials}</span>`;
    dom.imagePreview.classList.remove('has-image');
    renderCard();
  }

  // ─── Template Switch ───
  function setTemplate (templateName) {
    if (!TEMPLATES.includes(templateName)) return;
    state.template = templateName;
    dom.templateBtns.forEach(btn => {
      const isActive = btn.dataset.template === templateName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    renderCard();
  }

  // ─── Social Toggle ───
  function toggleSocial (toggleEl) {
    const isActive = toggleEl.classList.contains('active');
    toggleEl.classList.toggle('active', !isActive);
    toggleEl.classList.toggle('inactive', isActive);
    const platform = toggleEl.dataset.social;
    const input = $(`.social-input[data-social="${platform}"]`);
    if (input) {
      input.style.opacity = isActive ? '0.4' : '1';
    }
    renderCardDebounced();
  }

  function syncSocialState () {
    dom.socialToggles.forEach(toggle => {
      const isActive = toggle.classList.contains('active');
      toggle.classList.toggle('inactive', !isActive);
      const platform = toggle.dataset.social;
      const input = $(`.social-input[data-social="${platform}"]`);
      if (input) {
        input.style.opacity = isActive ? '1' : '0.4';
      }
    });
  }

  // ─── Download ───
  function setDownloadLoading (btn, loading) {
    if (loading) {
      btn.classList.add('btn-loading');
      btn.insertAdjacentHTML('beforeend', '<span class="btn-spinner"></span>');
    } else {
      btn.classList.remove('btn-loading');
      const spinner = btn.querySelector('.btn-spinner');
      if (spinner) spinner.remove();
    }
  }

  async function downloadAsPng () {
    if (state.isDownloading) return;
    state.isDownloading = true;
    setDownloadLoading(dom.downloadPng, true);

    try {
      const el = dom.cardContainer;
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: 600,
        height: 340,
      });
      const link = document.createElement('a');
      link.download = 'business-card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('PNG downloaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to generate PNG. Please try again.', 'error');
    } finally {
      state.isDownloading = false;
      setDownloadLoading(dom.downloadPng, false);
    }
  }

  async function downloadAsPdf () {
    if (state.isDownloading) return;
    state.isDownloading = true;
    setDownloadLoading(dom.downloadPdf, true);

    try {
      const el = dom.cardContainer;
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: 600,
        height: 340,
      });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
      pdf.save('business-card.pdf');
      showToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      state.isDownloading = false;
      setDownloadLoading(dom.downloadPdf, false);
    }
  }

  // ─── Header scroll effect ───
  function handleScroll () {
    dom.header.classList.toggle('scrolled', window.scrollY > 8);
  }

  // ─── Init ───
  function init () {
    cacheDom();

    // Form inputs
    const formInputs = $$('.form-input, input:not([type=file])');
    formInputs.forEach(el => {
      el.addEventListener('input', renderCardDebounced);
    });

    // Image upload
    dom.uploadBtn.addEventListener('click', () => dom.imageInput.click());
    dom.imageInput.addEventListener('change', (e) => {
      handleImageUpload(e.target.files[0]);
    });
    dom.clearImage.addEventListener('click', clearImage);
    // Drag-and-drop support
    dom.uploadBtn.addEventListener('dragover', (e) => {
      e.preventDefault();
      dom.uploadBtn.style.borderColor = 'var(--brand-500)';
      dom.uploadBtn.style.background = 'var(--brand-50)';
    });
    dom.uploadBtn.addEventListener('dragleave', () => {
      dom.uploadBtn.style.borderColor = '';
      dom.uploadBtn.style.background = '';
    });
    dom.uploadBtn.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.uploadBtn.style.borderColor = '';
      dom.uploadBtn.style.background = '';
      const files = e.dataTransfer.files;
      if (files.length) handleImageUpload(files[0]);
    });

    // Template switching
    dom.templateBtns.forEach(btn => {
      btn.addEventListener('click', () => setTemplate(btn.dataset.template));
    });

    // Social toggles
    dom.socialToggles.forEach(toggle => {
      toggle.addEventListener('click', () => toggleSocial(toggle));
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSocial(toggle);
        }
      });
    });
    dom.socialInputs.forEach(inp => {
      inp.addEventListener('input', renderCardDebounced);
    });

    // Downloads
    dom.downloadPng.addEventListener('click', downloadAsPng);
    dom.downloadPdf.addEventListener('click', downloadAsPdf);

    // Scroll effect
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Sync initial social state
    syncSocialState();

    // Initial render
    renderCard();

    // Fix the previewInitials reference (typo in cacheDom)
    dom.previewInitials = dom.imagePreview.querySelector('.image-preview-initials');
    if (!dom.previewInitials) {
      // Recreate if missing
      dom.imagePreview.innerHTML = '<span class="image-preview-initials">' + getInitials(dom.name.value.trim() || 'Your Name') + '</span>';
      dom.previewInitials = dom.imagePreview.querySelector('.image-preview-initials');
    }
  }

  // ─── Boot ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
