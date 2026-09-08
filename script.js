function initHeroIntro() {
  const heroPlate = document.getElementById('hero-plate');

  // Two rAFs: one to let the initial (hidden) styles paint, one to flip the
  // classes on the next frame so the CSS transition actually runs instead of
  // being coalesced with the initial paint.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('is-ready');
      if (heroPlate) heroPlate.classList.add('is-visible');
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
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  });
}

function initNavScrollSpy() {
  const sections = ['about', 'projects', 'notes', 'cv']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const pills = document.querySelectorAll('.nav-pill[href^="#"]');

  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  const setActive = (id) => {
    pills.forEach((pill) => {
      pill.classList.toggle('is-active', pill.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { threshold: 0, rootMargin: '-50% 0px -50% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}

function initLangToggleStub() {
  const button = document.querySelector('.lang-toggle');
  if (!button) return;
  button.addEventListener('click', () => {
    button.dataset.lang = button.dataset.lang === 'es' ? 'en' : 'es';
    // Mockup only: no real translation wired up yet — CSS bolds whichever
    // span matches the current data-lang.
  });
}

function initCvDownloadStub() {
  const link = document.getElementById('cv-download');
  if (!link) return;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    // Mockup only: no real PDF to download yet.
  });
}

function init() {
  initHeroIntro();
  initScrollReveal();
  initNavSmoothScroll();
  initNavScrollSpy();
  initLangToggleStub();
  initCvDownloadStub();
}

document.addEventListener('DOMContentLoaded', init);
