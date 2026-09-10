function initHeroIntro() {
  const heroPlate = document.getElementById('hero-plate');
  if (!heroPlate) return;
  // Two rAFs: one to let the initial (hidden) styles paint, one to flip the
  // class on the next frame so the CSS transition actually runs instead of
  // being coalesced with the initial paint.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      heroPlate.classList.add('is-visible');
    });
  });
}

function initResumeModal() {
  const trigger = document.querySelector('.card-link[href*="resume"]');
  const modal = document.getElementById('resume-modal');
  if (!trigger || !modal) return;

  const pagesContainer = modal.querySelector('.resume-pdf-pages');
  const PDF_SRC = '/media/documents/resume.pdf';
  // Own rendering via PDF.js instead of the browser's native PDF viewer
  // (iframe + #view=Fit): that always drew its own toolbar, which Safari
  // ignores every attempt to suppress via URL fragment. Rendering each
  // page to a plain <canvas> means there's no viewer chrome at all, and
  // it always matches the real resume.pdf (no separate export step).
  const PDFJS_VERSION = '6.3.289';
  const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

  let renderPromise = null;
  let renderedWidth = 0;

  const renderPages = async () => {
    const pdfjsLib = await import(`${PDFJS_BASE}/pdf.min.mjs`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;

    const pdf = await pdfjsLib.getDocument({ url: PDF_SRC }).promise;
    const containerWidth = pagesContainer.clientWidth;
    // Rendered at CSS width * devicePixelRatio, then displayed at
    // width:100% (CSS) — crisp on retina instead of a fixed raster size.
    const dpr = window.devicePixelRatio || 1;
    renderedWidth = containerWidth;

    pagesContainer.replaceChildren();
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = (containerWidth / page.getViewport({ scale: 1 }).width) * dpr;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      pagesContainer.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  };

  const ensureRendered = () => {
    // Re-render (not just re-open) if the panel's width changed enough
    // since the last render (e.g. orientation change) to look blurry
    // or leave letterboxing at the new width.
    const widthChanged = Math.abs(pagesContainer.clientWidth - renderedWidth) > 8;
    if (!renderPromise || widthChanged) {
      renderPromise = renderPages().catch((error) => {
        renderPromise = null; // allow retry on next open
        pagesContainer.replaceChildren();
        const message = document.createElement('p');
        message.style.padding = '1rem';
        message.textContent = 'No se pudo cargar la vista previa. Usa "Ver documento completo".';
        pagesContainer.appendChild(message);
        console.error('Resume PDF render failed:', error);
      });
    }
    return renderPromise;
  };

  const open = () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    ensureRendered();
  };

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    open();
  });

  modal.querySelectorAll('[data-modal-dismiss]').forEach((el) => {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
  });

  window.addEventListener('orientationchange', () => {
    if (modal.classList.contains('is-open')) ensureRendered();
  });
}

function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal:not(#hero-plate)');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const groups = new Map(); // parent element -> ordered list of its .reveal children

  targets.forEach((el) => {
    const parent = el.closest('section');
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });

  groups.forEach((children) => {
    children.forEach((el, index) => {
      el.style.setProperty('--reveal-delay', `${Math.min(index * 60, 300)}ms`);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

function initNavSmoothScroll() {
  document.querySelectorAll('.nav-pill[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;
      event.preventDefault();
      // Computing the destination ourselves (rather than letting
      // scrollIntoView apply scroll-margin-top) avoids a cross-browser
      // quirk where smooth-behavior scrollIntoView can land short of the
      // scroll-margin offset.
      const scrollMarginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - scrollMarginTop;
      window.scrollTo({
        top,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  });
}

function initScrollOffset() {
  const nav = document.getElementById('hero-nav');
  const section = document.querySelector('.content-section');
  if (!nav) return;
  // Measures the sticky nav's actual rendered box (its own height plus its
  // sticky `top` gap) instead of guessing a fixed rem value, so section
  // anchors land clear of the nav at any screen size/breakpoint.
  const update = () => {
    const navHeight = nav.getBoundingClientRect().height;
    const stickyTop = parseFloat(getComputedStyle(nav).top) || 0;
    const navClearance = stickyTop + navHeight + 16;
    // .content-section already has its own top padding, which lands
    // between the nav and the heading once scroll-margin-top places the
    // section. Reserving the full nav height on top of that padding
    // double-counts the gap — headings ended up ~nav-height further below
    // the nav than needed. Only reserve what the padding doesn't already
    // cover, so the section's own padding supplies most/all of the
    // clearance instead of stacking a second one underneath it.
    const sectionPaddingTop = section ? parseFloat(getComputedStyle(section).paddingTop) || 0 : 0;
    const offset = Math.max(0, navClearance - sectionPaddingTop);
    document.documentElement.style.setProperty('--nav-offset', `${offset}px`);
    // .hero's min-height subtracts this (its own rendered height, no
    // sticky-top gap) so hero + nav sum to one viewport instead of a
    // hardcoded rem guess going stale against the nav's real height.
    document.documentElement.style.setProperty('--hero-nav-h', `${navHeight}px`);
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
}

function init() {
  initHeroIntro();
  initResumeModal();
  initScrollReveal();
  initNavSmoothScroll();
  initScrollOffset();
}

document.addEventListener('DOMContentLoaded', init);
