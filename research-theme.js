/** Small, finite typographic gestures. All content remains in the document. */
export function initResearchTheme() {
  const root = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  let userChoice = null;
  try { userChoice = localStorage.getItem('sv-motion'); } catch (_) {}
  let motionOff = preference.matches || userChoice === 'off';
  const activeTimers = new Set();
  const stopAnimations = () => {
    document.querySelectorAll('.streaming,.boundary-arriving').forEach(el => el.classList.remove('streaming','boundary-arriving'));
    activeTimers.forEach(clearTimeout);
    activeTimers.clear();
  };
  function applyMotion() {
    root.classList.toggle('motion-off', motionOff);
    if (motionOff) stopAnimations();
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(motionOff));
      toggle.setAttribute('aria-label', motionOff ? 'Enable animations' : 'Pause animations');
      toggle.querySelector('.motion-label').textContent = motionOff ? 'MOTION OFF' : 'MOTION ON';
    }
  }
  applyMotion();
  root.classList.add('theme-ready');
  toggle?.addEventListener('click', () => {
    motionOff = !motionOff;
    userChoice = motionOff ? 'off' : 'on';
    try { localStorage.setItem('sv-motion', userChoice); } catch (_) {}
    applyMotion();
  });
  preference.addEventListener('change', e => { motionOff = e.matches || userChoice === 'off'; applyMotion(); });

  // A long, tapered stroke follows the actual glyph contours. All dash lengths
  // and stroke widths use the SVG's own units, so scaling cannot turn it into a dot.
  const contours = [...document.querySelectorAll('.sv-outline')];
  if (contours.length) {
    contours.forEach(path => path.removeAttribute('pathLength'));
    const lengths = contours.map(path => path.getTotalLength());
    const total = lengths.reduce((sum, length) => sum + length, 0);
    const starts = lengths.map((_, i) => lengths.slice(0,i).reduce((sum,length) => sum + length,0));
    const bands = 12;
    const tailLength = total * .20;
    const layers = contours.map(path => {
      const pieces = Array.from({length:bands}, (_, band) => {
        const piece = path.cloneNode(false);
        piece.setAttribute('class','sv-trail');
        piece.style.stroke = `rgb(${110 + band * 9},${140 + band * 8},255)`;
        piece.style.strokeWidth = String(33 + band * 1.6);
        piece.style.opacity = String(.10 + .86 * Math.pow((band + 1) / bands,.8));
        path.parentNode.append(piece);
        return piece;
      });
      path.remove();
      return pieces;
    });
    let elapsedCycle = 4800;
    let lastFrame = 0;
    function traceFrame(time) {
      const elapsed = lastFrame ? Math.min(time - lastFrame, 50) : 0;
      lastFrame = time;
      if (!motionOff && !document.hidden) {
        elapsedCycle = (elapsedCycle + elapsed) % 28000;
        const phase = elapsedCycle / 28000;
        // Smooth, periodic acceleration with no pause or speed jump at the loop.
        const travel = phase + .08*Math.sin(phase*Math.PI*2) + .025*Math.sin(phase*Math.PI*4);
        const head = travel * total;
        layers.forEach((pieces, letter) => pieces.forEach((piece, band) => {
          const bandStart = head - tailLength + band * tailLength/bands;
          const bandEnd = bandStart + tailLength/bands + 1.5;
          let from = 0, to = 0;
          for (const wrap of [-total,0,total]) {
            const a = Math.max(starts[letter],bandStart + wrap);
            const b = Math.min(starts[letter]+lengths[letter],bandEnd + wrap);
            if (b > a) { from = a-starts[letter]; to = b-starts[letter]; break; }
          }
          piece.style.display = to > from ? '' : 'none';
          piece.style.strokeDasharray = `${to-from} ${lengths[letter]*2}`;
          piece.style.strokeDashoffset = String(-from);
        }));
      }
      requestAnimationFrame(traceFrame);
    }
    requestAnimationFrame(traceFrame);
  }

  // Preserve the original words, markup, whitespace and accessible text.
  const streams = [...document.querySelectorAll('[data-stream]')];
  streams.forEach(element => {
    if (/^H[1-6]$/.test(element.tagName)) {
      const labelCopy = element.cloneNode(true);
      labelCopy.querySelectorAll('br').forEach(br => br.replaceWith(' '));
      element.setAttribute('aria-label', labelCopy.textContent.trim().replace(/\s+/g, ' '));
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word => {
        if (!word || /^\s+$/.test(word)) { fragment.append(document.createTextNode(word)); return; }
        const token = document.createElement('span');
        token.className = 'stream-word';
        token.textContent = word;
        token.style.setProperty('--token-delay', `${Math.min(index++ * 30, 1100)}ms`);
        fragment.append(token);
      });
      node.replaceWith(fragment);
    });
  });
  // Re-arm each element after it leaves the viewport, including collapsed prose.
  const arrivals = new WeakMap();
  const elementTimers = new Map();
  function resetArrival(el) {
    arrivals.set(el, false);
    el.classList.remove('streaming','boundary-arriving');
    const timer = elementTimers.get(el);
    if (timer) { clearTimeout(timer); activeTimers.delete(timer); elementTimers.delete(el); }
  }
  function arrive(el) {
    if (arrivals.get(el)) return;
    arrivals.set(el, true);
    if (motionOff) return;
    const cls = el.matches('[data-stream]') ? 'streaming' : 'boundary-arriving';
    el.classList.add(cls);
    const timer = setTimeout(() => {
      el.classList.remove(cls); activeTimers.delete(timer); elementTimers.delete(el);
    }, 1800);
    elementTimers.set(el, timer);
    activeTimers.add(timer);
  }
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) arrive(entry.target);
      else resetArrival(entry.target);
    }), { threshold: .08 });
    [...streams,...document.querySelectorAll('.paper,.experience-entry,.education-entry')].forEach(el => observer.observe(el));
  }

  // Disclosure content stays in the page, with reversible height transitions.
  document.querySelectorAll('[data-disclosure]').forEach(disclosure => {
    const button = disclosure.querySelector('.disclosure-toggle');
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    let animation = null;
    let revision = 0;
    async function setOpen(open, fromBottom = false) {
      const ticket = ++revision;
      const startHeight = panel.hidden ? 0 : panel.getBoundingClientRect().height;
      animation?.cancel();
      button.setAttribute('aria-expanded', String(open));
      const focusWasOnButton = document.activeElement === button;
      button.hidden = open;
      button.querySelector('.disclosure-label').textContent = button.dataset.openLabel;
      disclosure.classList.toggle('is-open', open);
      disclosure.closest('.paper')?.classList.toggle('is-expanded', open);
      panel.inert = !open;
      panel.hidden = false;
      panel.style.height = 'auto';
      const endHeight = open ? panel.scrollHeight : 0;
      if (open) {
        panel.tabIndex = -1;
        if (focusWasOnButton) panel.focus({preventScroll:true});
      } else button.focus({preventScroll:true});
      panel.querySelectorAll('[data-stream]').forEach(el => {
        resetArrival(el);
        if (observer) { observer.unobserve(el); observer.observe(el); }
      });
      if (!motionOff && startHeight !== endHeight) {
        animation = panel.animate([{height:`${startHeight}px`,opacity:open ? .35 : 1},{height:`${endHeight}px`,opacity:open ? 1 : 0}],{duration:Math.min(620,360 + Math.abs(endHeight-startHeight)*.12),easing:'cubic-bezier(.22,.8,.22,1)',fill:'both'});
        try { await animation.finished; } catch (_) { return; }
      }
      if (ticket !== revision) return;
      animation?.cancel();
      animation = null;
      panel.hidden = !open;
      panel.style.removeProperty('height');
      window.dispatchEvent(new Event('resize'));
      const paper = disclosure.closest('.paper');
      const target = paper?.querySelector('h3') || (open ? disclosure : document.getElementById('hero-title'));
      const readingTarget = !paper && open ? panel.querySelector('p') : target;
      requestAnimationFrame(() => {
        if (ticket !== revision) return;
        const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
        window.scrollTo({top:Math.max(0,scrollY + readingTarget.getBoundingClientRect().top - headerHeight - 34),behavior:motionOff ? 'instant' : 'smooth'});
      });
    }
    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
    disclosure.querySelector('.disclosure-close').addEventListener('click', () => setOpen(false, true));
    toggle?.addEventListener('click', () => { if (motionOff && animation) animation.finish(); });
    preference.addEventListener('change', () => { if (motionOff && animation) animation.finish(); });
  });

  // The collection has one prominent control at a time, with the same reversible
  // motion and replayable typography as the rest of the page.
  const projectPanel = document.getElementById('more-projects');
  const projectOpener = document.querySelector('#project-discovery .projects-toggle');
  if (projectPanel && projectOpener) {
    const openerWrap = document.getElementById('project-discovery');
    const closer = projectPanel.querySelector('.projects-collapse');
    let animation = null;
    let revision = 0;
    async function expandProjects(open) {
      const ticket = ++revision;
      const start = projectPanel.hidden ? 0 : projectPanel.getBoundingClientRect().height;
      animation?.cancel();
      projectOpener.setAttribute('aria-expanded',String(open));
      openerWrap.hidden = open;
      projectPanel.hidden = false;
      projectPanel.inert = !open;
      if (open) projectPanel.focus({preventScroll:true});
      else projectOpener.focus({preventScroll:true});
      projectPanel.querySelectorAll('[data-stream]').forEach(el => {
        resetArrival(el);
        if (observer) { observer.unobserve(el); observer.observe(el); }
      });
      const end = open ? projectPanel.scrollHeight : 0;
      if (!motionOff) {
        animation = projectPanel.animate([{height:`${start}px`,opacity:open?.2:1},{height:`${end}px`,opacity:open?1:0}],{duration:650,easing:'cubic-bezier(.22,.8,.22,1)',fill:'both'});
        try { await animation.finished; } catch (_) { return; }
      }
      if (ticket !== revision) return;
      animation?.cancel();
      animation = null;
      projectPanel.hidden = !open;
      window.dispatchEvent(new Event('resize'));
      const target = open ? projectPanel.querySelector('.project-card') : document.getElementById('projects-title');
      requestAnimationFrame(() => {
        if (ticket !== revision) return;
        const header = document.querySelector('.site-header').getBoundingClientRect().height;
        window.scrollTo({top:Math.max(0,scrollY+target.getBoundingClientRect().top-header-34),behavior:motionOff?'instant':'smooth'});
      });
    }
    projectOpener.addEventListener('click',() => expandProjects(true));
    closer.addEventListener('click',() => expandProjects(false));
    toggle?.addEventListener('click',() => { if (motionOff) animation?.finish(); });
    preference.addEventListener('change',() => { if (motionOff) animation?.finish(); });
  }
  document.querySelectorAll('.status-wrap').forEach(wrap => {
    const button = wrap.querySelector('.status');
    const close = () => { wrap.classList.remove('tooltip-open'); button.setAttribute('aria-expanded','false'); };
    button.addEventListener('click', () => {
      const open = !wrap.classList.contains('tooltip-open');
      wrap.classList.toggle('tooltip-open',open);
      button.setAttribute('aria-expanded',String(open));
    });
    wrap.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); button.blur(); } });
    document.addEventListener('pointerdown', event => { if (!wrap.contains(event.target)) close(); });
    wrap.addEventListener('focusout', event => { if (!wrap.contains(event.relatedTarget)) close(); });
  });

  const sections = [...document.querySelectorAll('main > section[id]')];
  const navContainer = document.querySelector('nav[aria-label="Main navigation"]');
  const nav = [...navContainer.querySelectorAll('a[href^="#"]')];
  const allNav = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
  const highlight = navContainer.querySelector('.nav-highlight');
  let selectedUntil = 0;
  let selectedId = null;
  function selectSection(id) {
    allNav.forEach(link => {
      if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    const active = nav.find(link => link.getAttribute('href') === `#${id}`);
    if (active && highlight && navContainer.offsetWidth) {
      highlight.style.width = `${active.offsetWidth}px`;
      highlight.style.height = `${active.offsetHeight}px`;
      highlight.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      highlight.style.opacity = '1';
    }
  }
  allNav.forEach(link => link.addEventListener('click', () => {
    selectedId = link.hash.slice(1);
    selectedUntil = performance.now() + 1100;
    selectSection(selectedId);
  }));
  let scheduled = false;
  function updateReadingPosition() {
    scheduled = false;
    const available = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--reading-progress', available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0);
    let current = sections[0]?.id;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) current = section.id; });
    selectSection(performance.now() < selectedUntil ? selectedId : current);
  }
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateReadingPosition); } };
  addEventListener('scroll', schedule, { passive:true });
  addEventListener('resize', schedule);
  updateReadingPosition();
  document.fonts?.ready.then(updateReadingPosition);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(navContainer);
  const hero = document.querySelector('.profile-hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => entries.forEach(entry => hero.classList.toggle('ambient-paused', !entry.isIntersecting))).observe(hero);
  }
  document.addEventListener('visibilitychange', () => root.classList.toggle('page-hidden', document.hidden));
}
