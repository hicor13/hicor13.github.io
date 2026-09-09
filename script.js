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

function initParallaxBg() {
  const layers = document.querySelectorAll('.parallax-layer');
  if (!layers.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const apply = () => {
    const y = window.scrollY;
    layers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.depth) || 0;
      layer.style.transform = `translateY(${y * depth}px)`;
    });
  };

  window.addEventListener('scroll', apply, { passive: true });
  apply();
}

function initResumeModal() {
  const trigger = document.querySelector('.card-link[href*="resume"]');
  const modal = document.getElementById('resume-modal');
  if (!trigger || !modal) return;

  const iframe = modal.querySelector('iframe');
  const PDF_SRC = '/media/documents/resume.pdf';

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

function init() {
  initHeroIntro();
  initParallaxBg();
  initResumeModal();
  initScrollReveal();
  initNavSmoothScroll();
  initLangToggle();
}

document.addEventListener('DOMContentLoaded', init);
