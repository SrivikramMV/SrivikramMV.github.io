/**
 * Locally bundled, lazy-loaded PDF.js reader.
 * initReader({ id: { title, subtitle, url, kind } }).open(id)
 * No network requests until a document is opened. No third-party services.
 */
export function initReader(documents) {
  const icons = {
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    prev: '<path d="m14 6-6 6 6 6"/>',
    next: '<path d="m10 6 6 6-6 6"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    fit: '<path d="M3 7v10M21 7v10M6 12h12m-9-3-3 3 3 3m6-6 3 3-3 3"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  const dialog = document.createElement('dialog');
  dialog.className = 'reader';
  dialog.setAttribute('aria-labelledby', 'reader-title');
  dialog.innerHTML = `
    <header class="reader__header">
      <div class="reader__identity"><span class="reader__eyebrow">DOCUMENT READER</span><h2 id="reader-title" class="reader__title"></h2><p class="reader__subtitle"></p></div>
      <div class="reader__actions">
        <a class="reader__button reader__original" target="_blank" rel="noopener noreferrer" aria-label="Open original PDF in a new tab" title="Open original PDF">${svg('external')}<span>Original</span></a>
        <a class="reader__button reader__download" download>${svg('download')}<span>Download</span></a>
        <button class="reader__button reader__close" type="button" aria-label="Close reader" title="Close (Escape)">${svg('close')}</button>
      </div>
    </header>
    <div class="reader__toolbar" aria-label="Document controls">
      <div class="reader__page-controls">
        <button class="reader__tool reader__prev" type="button" aria-label="Previous page" title="Previous page">${svg('prev')}</button>
        <label class="reader__page-label">Page <input class="reader__page-input" aria-label="Page number" type="number" inputmode="numeric" min="1" value="1"><span class="reader__count">/ —</span></label>
        <button class="reader__tool reader__next" type="button" aria-label="Next page" title="Next page">${svg('next')}</button>
      </div>
      <div class="reader__zoom-controls">
        <button class="reader__tool reader__zoom-out" type="button" aria-label="Zoom out" title="Zoom out">${svg('minus')}</button>
        <span class="reader__zoom" aria-live="off">100%</span>
        <button class="reader__tool reader__zoom-in" type="button" aria-label="Zoom in" title="Zoom in">${svg('plus')}</button>
        <span class="reader__divider"></span>
        <button class="reader__tool reader__fit" type="button" aria-label="Fit pages to width" title="Fit to width">${svg('fit')}</button>
        <button class="reader__tool reader__fullscreen" type="button" aria-label="Enter fullscreen" title="Fullscreen">${svg('expand')}</button>
      </div>
    </div>
    <div class="reader__stage" tabindex="0" aria-label="Scrollable document">
      <div class="reader__status" role="status" aria-live="polite"></div>
      <div class="reader__pages"></div>
    </div>
    <footer class="reader__footer"><span class="reader__footer-kind">RESEARCH ARCHIVE</span><span>Srivikram MV · Research & CV</span></footer>`;
  document.body.appendChild(dialog);
  const $ = (selector) => dialog.querySelector(selector);
  const stage = $('.reader__stage');
  const pages = $('.reader__pages');
  const status = $('.reader__status');
  const pageInput = $('.reader__page-input');
  const controls = [...dialog.querySelectorAll('.reader__tool'), pageInput];
  let current = null;
  let pdfjsPromise = null;
  let previousFocus = null;
  let bodyOverflow = '';
  let resizeTimer;
  let scrollFrame;
  let ownsFullscreen = false;
  let readerExpanded = false;

  function getLibrary() {
    if (!pdfjsPromise) {
      pdfjsPromise = import('./assets/vendor/pdfjs/pdf.mjs').then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('./assets/vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
        return pdfjs;
      }).catch((error) => { pdfjsPromise = null; throw error; });
    }
    return pdfjsPromise;
  }

  function dispose(s) {
    if (!s) return;
    s.disposed = true;
    s.observer?.disconnect();
    s.queue.length = 0;
    for (const task of s.tasks.values()) task.cancel();
    for (const layer of s.textLayers.values()) layer.cancel();
    s.loading?.destroy().catch(() => {});
    s.tasks.clear();
  }

  function setStatus(message, isError = false) {
    status.replaceChildren();
    status.hidden = !message;
    status.classList.toggle('reader__status--error', isError);
    if (!message) return;
    if (!isError) {
      const spinner = document.createElement('span');
      spinner.className = 'reader__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      status.append(spinner);
    }
    const text = document.createElement('p');
    text.textContent = message;
    status.append(text);
    if (isError && current) {
      const link = document.createElement('a');
      link.href = current.doc.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open the original PDF ↗';
      status.append(link);
    }
  }

  function syncControls(s) {
    if (current !== s) return;
    pageInput.value = String(s.page);
    $('.reader__prev').disabled = s.page <= 1;
    $('.reader__next').disabled = s.page >= s.pdf.numPages;
    $('.reader__zoom').textContent = `${Math.round(s.scale * 100)}%`;
    $('.reader__zoom-out').disabled = s.scale <= 0.35;
    $('.reader__zoom-in').disabled = s.scale >= 2.6;
    $('.reader__fit').setAttribute('aria-pressed', String(s.fit));
  }

  function scrollToPage(number) {
    const s = current;
    if (!s?.pdf) return;
    const n = Math.max(1, Math.min(s.pdf.numPages, Math.round(Number(number) || 1)));
    s.page = n;
    const element = s.elements[n - 1];
    stage.scrollTo({ top: Math.max(0, element.offsetTop - pages.offsetTop - 20), behavior: 'instant' });
    enqueue(s, n);
    if (n < s.pdf.numPages) enqueue(s, n + 1);
    syncControls(s);
  }

  function enqueue(s, number) {
    if (s.disposed || s.rendered.has(number) || s.pending.get(number) === s.revision || s.queue.includes(number)) return;
    s.queue.push(number);
    pump(s);
  }

  function pump(s) {
    while (!s.disposed && s.active < 2 && s.queue.length) {
      const number = s.queue.shift();
      s.pending.set(number, s.revision);
      const revision = s.revision;
      s.active += 1;
      renderPage(s, number, revision).finally(() => {
        if (s.pending.get(number) === revision) s.pending.delete(number);
        s.active -= 1;
        pump(s);
      });
    }
  }

  async function renderPage(s, number, revision) {
    const element = s.elements[number - 1];
    if (!element) return;
    let renderTask;
    try {
      const page = await s.pdf.getPage(number);
      if (s.disposed || revision !== s.revision) return;
      const viewport = page.getViewport({ scale: s.scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      element.style.setProperty('--total-scale-factor', String(s.scale));
      const canvas = document.createElement('canvas');
      canvas.className = 'reader__canvas';
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.setAttribute('aria-hidden', 'true');
      renderTask = page.render({
        canvasContext: canvas.getContext('2d', { alpha: false }),
        canvas,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        background: '#ffffff',
      });
      s.tasks.set(number, renderTask);
      await renderTask.promise;
      if (s.disposed || revision !== s.revision) return;
      element.replaceChildren(canvas);
      element.classList.add('reader__sheet--ready');
      s.rendered.add(number);
      const textContainer = document.createElement('div');
      textContainer.className = 'reader__text-layer';
      element.append(textContainer);
      const textLayer = new s.pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: textContainer, viewport });
      s.textLayers.set(number, textLayer);
      await textLayer.render();
    } catch (error) {
      if (s.disposed || revision !== s.revision || error?.name === 'RenderingCancelledException' || error?.name === 'AbortException') return;
      // A canvas remains usable if a PDF's optional text layer fails.
      if (!s.rendered.has(number)) {
        element.textContent = `Page ${number} could not be displayed. Use “Original” to read the PDF.`;
        element.classList.add('reader__sheet--error');
      }
    } finally {
      if (s.tasks.get(number) === renderTask) s.tasks.delete(number);
    }
  }

  function layout(s, preservePage = true) {
    if (s.disposed || !s.pdf) return;
    const target = preservePage ? s.page : 1;
    s.revision += 1;
    s.observer?.disconnect();
    s.queue.length = 0;
    for (const task of s.tasks.values()) task.cancel();
    for (const layer of s.textLayers.values()) layer.cancel();
    s.tasks.clear();
    s.textLayers.clear();
    s.rendered.clear();
    if (s.fit) s.scale = Math.max(0.3, Math.min((stage.clientWidth - (window.innerWidth < 600 ? 24 : 64)) / s.base.width, 1.5));
    for (const element of s.elements) {
      element.style.width = `${s.base.width * s.scale}px`;
      element.style.height = `${s.base.height * s.scale}px`;
      element.classList.remove('reader__sheet--ready', 'reader__sheet--error');
      element.replaceChildren();
    }
    s.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) enqueue(s, Number(entry.target.dataset.page));
    }, { root: stage, rootMargin: '650px 100px' });
    for (const element of s.elements) s.observer.observe(element);
    scrollToPage(target);
    syncControls(s);
  }

  async function open(id, initialPage = 1) {
    const doc = documents[id];
    if (!doc) return false;
    if (!dialog.open) {
      previousFocus = document.activeElement;
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    }
    dispose(current);
    const s = {
      id, doc, disposed: false, pdf: null, loading: null, page: 1, scale: 1, fit: true,
      base: null, revision: 0, elements: [], rendered: new Set(), queue: [], active: 0,
      tasks: new Map(), textLayers: new Map(), pending: new Map(), observer: null,
    };
    current = s;
    $('.reader__title').textContent = doc.title;
    $('.reader__subtitle').textContent = doc.subtitle || '';
    $('.reader__footer-kind').textContent = doc.kind || 'RESEARCH ARCHIVE';
    $('.reader__download').href = doc.url;
    $('.reader__download').setAttribute('download', doc.url.split('/').pop());
    $('.reader__download').setAttribute('aria-label', `Download ${id === 'cv' ? 'CV' : 'paper'} PDF`);
    $('.reader__original').href = doc.url;
    $('.reader__count').textContent = '/ —';
    pageInput.value = '1';
    pages.replaceChildren();
    stage.scrollTop = 0;
    controls.forEach((control) => { control.disabled = true; });
    setStatus('Opening the document…');
    $('.reader__close').focus({ preventScroll: true });
    try {
      s.pdfjs = await getLibrary();
      if (s.disposed) return false;
      s.loading = s.pdfjs.getDocument({
        url: doc.url,
        cMapUrl: new URL('./assets/vendor/pdfjs/cmaps/', import.meta.url).href,
        cMapPacked: true,
        standardFontDataUrl: new URL('./assets/vendor/pdfjs/standard_fonts/', import.meta.url).href,
        wasmUrl: new URL('./assets/vendor/pdfjs/wasm/', import.meta.url).href,
      });
      s.pdf = await s.loading.promise;
      if (s.disposed) return false;
      const firstPage = await s.pdf.getPage(1);
      if (s.disposed) return false;
      s.base = firstPage.getViewport({ scale: 1 });
      pageInput.max = String(s.pdf.numPages);
      $('.reader__count').textContent = `/ ${s.pdf.numPages}`;
      controls.forEach((control) => { control.disabled = false; });
      for (let i = 1; i <= s.pdf.numPages; i += 1) {
        const sheet = document.createElement('section');
        sheet.className = 'reader__sheet';
        sheet.dataset.page = String(i);
        sheet.setAttribute('aria-label', `Page ${i} of ${s.pdf.numPages}`);
        pages.append(sheet);
        s.elements.push(sheet);
      }
      setStatus('');
      layout(s, false);
      if (initialPage > 1) scrollToPage(initialPage);
      return true;
    } catch (error) {
      if (s.disposed) return false;
      setStatus('The embedded reader could not open this document. You can still read or download the original PDF.', true);
      return false;
    }
  }

  function close() {
    if (!dialog.open) return;
    if (ownsFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    dialog.close();
  }

  dialog.addEventListener('close', () => {
    if (ownsFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    dialog.classList.remove('reader--fullscreen');
    ownsFullscreen = false;
    readerExpanded = false;
    $('.reader__fullscreen').setAttribute('aria-label', 'Enter fullscreen');
    $('.reader__fullscreen').setAttribute('title', 'Fullscreen');
    dispose(current);
    current = null;
    pages.replaceChildren();
    document.body.style.overflow = bodyOverflow;
    previousFocus?.focus?.({ preventScroll: true });
    dialog.dispatchEvent(new CustomEvent('readerclose', { bubbles: true }));
  });
  $('.reader__close').addEventListener('click', close);
  $('.reader__prev').addEventListener('click', () => scrollToPage(current.page - 1));
  $('.reader__next').addEventListener('click', () => scrollToPage(current.page + 1));
  pageInput.addEventListener('change', () => scrollToPage(pageInput.value));
  pageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { scrollToPage(pageInput.value); pageInput.blur(); stage.focus(); }
  });
  const zoom = (change) => {
    const s = current;
    if (!s?.pdf) return;
    s.fit = false;
    s.scale = Math.min(2.6, Math.max(0.35, s.scale + change));
    layout(s);
  };
  $('.reader__zoom-in').addEventListener('click', () => zoom(0.2));
  $('.reader__zoom-out').addEventListener('click', () => zoom(-0.2));
  $('.reader__fit').addEventListener('click', () => {
    if (current?.pdf) { current.fit = true; layout(current); }
  });
  function setExpanded(full) {
    readerExpanded = full;
    dialog.classList.toggle('reader--fullscreen', full);
    $('.reader__fullscreen').setAttribute('aria-label', full ? 'Exit fullscreen' : 'Enter fullscreen');
    $('.reader__fullscreen').setAttribute('title', full ? 'Exit fullscreen' : 'Fullscreen');
  }
  $('.reader__fullscreen').addEventListener('click', async () => {
    if (readerExpanded) {
      setExpanded(false);
      if (ownsFullscreen && document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      ownsFullscreen = false;
    } else {
      setExpanded(true);
      try {
        ownsFullscreen = true;
        await document.documentElement.requestFullscreen();
      } catch {
        // Keep the full-window reading view when native fullscreen is unavailable.
        ownsFullscreen = false;
      }
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && ownsFullscreen) { ownsFullscreen = false; setExpanded(false); }
  });
  stage.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      const s = current;
      if (!s?.pdf) return;
      const focusY = stage.scrollTop + Math.min(stage.clientHeight * 0.3, 220);
      let index = s.elements.findIndex((sheet) => sheet.offsetTop - pages.offsetTop + sheet.offsetHeight > focusY);
      if (index < 0) index = s.elements.length - 1;
      s.page = index + 1;
      syncControls(s);
      // Release canvases far outside the viewport when reading long papers.
      for (const n of s.rendered) {
        if (Math.abs(n - s.page) <= 6) continue;
        s.textLayers.get(n)?.cancel();
        s.textLayers.delete(n);
        s.elements[n - 1].replaceChildren();
        s.elements[n - 1].classList.remove('reader__sheet--ready');
        s.rendered.delete(n);
      }
    });
  }, { passive: true });
  dialog.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || !current?.pdf) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); scrollToPage(current.page + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); scrollToPage(current.page - 1); }
  });
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (current?.pdf && current.fit) layout(current);
    }, 160);
  });
  resizeObserver.observe(stage);
  return { open, close };
}
