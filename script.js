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

function initCvDownloadStub() {
  const link = document.getElementById('cv-download');
  if (!link) return;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    // Mockup only: no real PDF to download yet.
  });
}

function init() {
  initScrollReveal();
  initNavSmoothScroll();
  initLangToggle();
  initCvDownloadStub();
}

document.addEventListener('DOMContentLoaded', init);
