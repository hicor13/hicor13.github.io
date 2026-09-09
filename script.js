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

  const iframe = modal.querySelector('iframe');
  // #view=Fit shrinks the whole page to fit both dimensions of the iframe
  // (FitH only matched the width, so a tall page still overflowed
  // vertically and needed its own scroll inside the panel).
  const PDF_SRC = '/media/documents/resume.pdf#view=Fit';

  const open = () => {
    if (!iframe.src) iframe.src = PDF_SRC;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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
