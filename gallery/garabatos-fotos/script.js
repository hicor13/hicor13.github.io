// gallery/garabatos-fotos/script.js
//
// Same masonry-grid + lightbox behavior as gallery/pajaritos/script.js,
// adapted for live data: `images` is built here from a Supabase fetch
// instead of being read from a static images-data.js. Everything below
// the data-loading section (reveal stagger, lightbox nav/swipe/keyboard)
// is unchanged from pajaritos's version.
let images = [];
let currentImageIndex = 0;

const REVEAL_STEP_MS = 30;
const REVEAL_MAX_DELAY_MS = 300;

const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

const MESSAGES = {
    empty: {
        es: 'Todavía no hay garabatos guardados.',
        en: 'No doodles saved yet.',
    },
    error: {
        es: 'No se pudo cargar la galería.',
        en: "Couldn't load the gallery.",
    },
};

function downloadUrlFor(storagePath) {
    return `${SUPABASE_URL}/storage/v1/object/public/drawings/${storagePath}`;
}

function formatDate(isoString) {
    try {
        return new Date(isoString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    } catch {
        return '';
    }
}

async function loadImages() {
    if (!window.supabase) return null;
    try {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await client
            .from('drawings')
            .select('name, storage_path, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map((row) => ({
            src: downloadUrlFor(row.storage_path),
            title: row.name,
            date: formatDate(row.created_at),
            description: '',
            order: 1,
        }));
    } catch (error) {
        console.error('Garabatos fotos: failed to fetch drawings:', error);
        return null;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function currentLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'es';
}

function renderGalleryMessage(key) {
    const gallery = document.getElementById('gallery');
    const msgs = MESSAGES[key];
    gallery.innerHTML = `
        <p class="gallery-empty">
            <span data-i18n-es>${msgs.es}</span><span data-i18n-en>${msgs.en}</span>
        </p>
    `;
}

function renderGallery() {
    const gallery = document.getElementById('gallery');

    if (images.length === 0) {
        renderGalleryMessage('empty');
        return;
    }

    gallery.innerHTML = images.map((img, index) => `
        <div class="gallery-item" onclick="openLightbox(${index})">
            <img src="${img.src}" alt="${escapeHtml(img.title)}" loading="lazy">
            <div class="gallery-item-title">${escapeHtml(img.title)}</div>
        </div>
    `).join('');
}

// CSS column-count fills the first column completely (top to bottom)
// before starting the next one, so an item's position in `images` doesn't
// match its visual column. Staggering by that flat index made whichever
// column got the earlier indices finish revealing before the next column
// had even started, which read as the columns not being top-aligned.
// Stagger by each item's position within its own column instead, so every
// column starts cascading in from the top at the same time. Must run after
// every image has actually loaded (see waitForGalleryImages) — column
// membership depends on each image's real height, which isn't known yet
// right after the markup is inserted.
function applyRevealStagger() {
    const columns = new Map();
    document.querySelectorAll('.gallery-item').forEach((el) => {
        const left = Math.round(el.getBoundingClientRect().left);
        if (!columns.has(left)) columns.set(left, []);
        columns.get(left).push(el);
    });
    columns.forEach((items) => {
        items.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        items.forEach((el, i) => {
            el.style.setProperty('--reveal-delay', `${Math.min(i * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS)}ms`);
        });
    });
}

// Waits on the actual gallery <img> elements (not a duplicate fetch) so the
// grid can stay hidden until every photo is genuinely ready to paint.
function waitForGalleryImages() {
    const imgs = Array.from(document.querySelectorAll('.gallery-item img'));
    return Promise.all(imgs.map((el) => {
        if (el.complete) return Promise.resolve();
        return new Promise((resolve) => {
            el.addEventListener('load', resolve, { once: true });
            el.addEventListener('error', resolve, { once: true });
        });
    }));
}

function revealGallery() {
    document.getElementById('gallery').classList.add('is-ready');
}

function renderCaption(img) {
    const caption = document.getElementById('lightbox-caption');
    const parts = [];
    if (img.title) parts.push(`<div class="lightbox-caption-title">${escapeHtml(img.title)}</div>`);
    if (img.date) parts.push(`<div class="lightbox-caption-date">${escapeHtml(img.date)}</div>`);
    if (img.description) parts.push(`<div class="lightbox-caption-description">${escapeHtml(img.description)}</div>`);
    caption.innerHTML = parts.join('');
}

function openLightbox(index) {
    currentImageIndex = index;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = images[index].src;
    img.alt = `Photo: ${images[index].title}`;
    renderCaption(images[index]);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    lightbox.focus();
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % images.length;
    const img = images[currentImageIndex];
    document.getElementById('lightbox-img').src = img.src;
    document.getElementById('lightbox-img').alt = `Photo: ${img.title}`;
    renderCaption(img);
}

function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    const img = images[currentImageIndex];
    document.getElementById('lightbox-img').src = img.src;
    document.getElementById('lightbox-img').alt = `Photo: ${img.title}`;
    renderCaption(img);
}

// Touch swipe support
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    if (document.getElementById('lightbox').classList.contains('active')) {
        touchStartX = e.changedTouches[0].screenX;
    }
}, false);

document.addEventListener('touchend', (e) => {
    if (document.getElementById('lightbox').classList.contains('active')) {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextImage();
        if (touchEndX - touchStartX > 50) prevImage();
    }
}, false);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (document.getElementById('lightbox').classList.contains('active')) {
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'Escape') closeLightbox();
    }
});

// Close on background click. The layout wrappers between #lightbox and the
// photo (.lightbox-content, .lightbox-image-row) have their own box area —
// e.g. the image's padding, or the gap left/right of a narrow photo — so a
// click there lands on the wrapper, not #lightbox itself. Treat anything
// that isn't the photo, a control, or the caption as background instead.
document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.closest('#lightbox-img, .lightbox-close, .lightbox-nav, .lightbox-caption')) return;
    closeLightbox();
});

// Initialize: fetch drawings, render markup, wait for every photo to be
// ready, then reveal the grid in one staggered cascade.
(async function init() {
    const fetched = await loadImages();
    if (fetched === null) {
        renderGalleryMessage('error');
        revealGallery();
        return;
    }

    images = fetched;
    renderGallery();

    if (images.length > 0) {
        await waitForGalleryImages();
        applyRevealStagger();
    }
    revealGallery();
})();
