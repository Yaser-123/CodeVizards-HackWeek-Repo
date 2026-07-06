(() => {
  const originalSrcs = new Map();
  const originalBg = new Map();
  let catIndex = 0;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'replace') {
      replaceImages(msg.catUrls);
    } else if (msg.action === 'restore') {
      restoreImages();
    }
  });

  function replaceImages(catUrls) {
    catIndex = 0;

    // Replace <img> tags
    document.querySelectorAll('img').forEach(img => {
      const newSrc = catUrls[catIndex % catUrls.length];
      if (!originalSrcs.has(img)) {
        originalSrcs.set(img, img.src);
      }
      img.src = newSrc;
      img.removeAttribute('srcset');
      img.removeAttribute('data-src');
      img.removeAttribute('data-lazy-src');
      img.style.objectFit = 'cover';
      catIndex++;
    });

    // Replace CSS background images on divs, sections, articles, etc.
    const bgElements = document.querySelectorAll('div, section, article, figure, header, main, aside, a, li, span, hero, [style*="background"]');
    bgElements.forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        if (!originalBg.has(el)) {
          originalBg.set(el, el.style.backgroundImage || '');
        }
        const newSrc = catUrls[catIndex % catUrls.length];
        el.style.backgroundImage = `url('${newSrc}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        catIndex++;
      }
    });

    // Also check inline style background images
    document.querySelectorAll('[style*="background-image"]').forEach(el => {
      if (!originalBg.has(el)) {
        originalBg.set(el, el.style.backgroundImage);
      }
      const newSrc = catUrls[catIndex % catUrls.length];
      el.style.backgroundImage = `url('${newSrc}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      catIndex++;
    });

    // Handle picture/source elements
    document.querySelectorAll('picture source').forEach(source => {
      source.removeAttribute('srcset');
    });

    // Handle lazy-loaded images in iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.querySelectorAll('img').forEach(img => {
          if (!originalSrcs.has(img)) {
            originalSrcs.set(img, img.src);
          }
          img.src = catUrls[catIndex % catUrls.length];
          img.removeAttribute('srcset');
          catIndex++;
        });
      } catch (e) {}
    });
  }

  function restoreImages() {
    originalSrcs.forEach((src, img) => {
      img.src = src;
    });
    originalSrcs.clear();

    originalBg.forEach((bg, el) => {
      el.style.backgroundImage = bg;
      el.style.backgroundSize = '';
      el.style.backgroundPosition = '';
    });
    originalBg.clear();

    catIndex = 0;
  }
})();
