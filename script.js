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

function initLangToggle() {
  const button = document.querySelector('.lang-toggle');
  if (!button) return;
  button.addEventListener('click', () => {
    const newLang = button.dataset.lang === 'es' ? 'en' : 'es';
    button.dataset.lang = newLang;
    // CSS shows/hides every [data-i18n-es]/[data-i18n-en] pair based on
    // this attribute, and bolds the matching ES/EN label on the button
    // itself.
    document.documentElement.lang = newLang;
    document.documentElement.dataset.lang = newLang;
  });
}

function initThemeToggle() {
  const button = document.querySelector('.theme-toggle');
  if (!button) return;

  const current = () => {
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  button.dataset.theme = current();

  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    button.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
  });
}

function initScrollOffset() {
  const nav = document.getElementById('hero-nav');
  if (!nav) return;
  // Measures the sticky nav's actual rendered box (its own height plus its
  // sticky `top` gap) instead of guessing a fixed rem value, so section
  // anchors land clear of the nav at any screen size/breakpoint.
  const update = () => {
    const stickyTop = parseFloat(getComputedStyle(nav).top) || 0;
    const offset = stickyTop + nav.getBoundingClientRect().height + 16;
    document.documentElement.style.setProperty('--nav-offset', `${offset}px`);
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
}

function init() {
  initHeroIntro();
  initScrollReveal();
  initNavSmoothScroll();
  initLangToggle();
  initThemeToggle();
  initScrollOffset();
}

document.addEventListener('DOMContentLoaded', init);
