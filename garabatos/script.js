// garabatos/script.js
//
// Orchestrates canvas.js (pure scratch mechanic) and gallery.js (Supabase
// glue) with the page's own DOM elements, button states, and bilingual
// status messages.

const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

const SAVE_THROTTLE_MS = 30000;
const THROTTLE_KEY = 'garabatos-last-save';

const MESSAGES = {
  es: {
    saved: '¡Guardado!',
    throttled: 'Espera un momento antes de guardar otro dibujo.',
    error: 'No se pudo guardar. Intenta de nuevo.',
  },
  en: {
    saved: 'Saved!',
    throttled: 'Wait a moment before saving another drawing.',
    error: "Couldn't save. Please try again.",
  },
};

function currentLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'es';
}

function defaultArtistName() {
  return currentLang() === 'en' ? 'Anonymous' : 'Anónimo';
}

function init() {
  const canvasEl = document.getElementById('scratch-canvas');
  const brushInput = document.getElementById('brush-size');
  const clearBtn = document.getElementById('clear-btn');
  const saveBtn = document.getElementById('save-btn');
  const nameInput = document.getElementById('artist-name');
  const statusEl = document.getElementById('save-status');
  const gridEl = document.getElementById('gallery-grid');
  if (!canvasEl || !gridEl) return;

  const painter = Garabatos.initCanvas(canvasEl, brushInput);

  clearBtn.addEventListener('click', () => {
    painter.clear();
    statusEl.textContent = '';
  });

  Garabatos.gallery.init(SUPABASE_URL, SUPABASE_ANON_KEY, gridEl).catch((error) => {
    console.error('Garabatos gallery failed to load:', error);
  });

  saveBtn.addEventListener('click', async () => {
    const msgs = MESSAGES[currentLang()];
    const lastSave = Number(localStorage.getItem(THROTTLE_KEY) || 0);
    if (Date.now() - lastSave < SAVE_THROTTLE_MS) {
      statusEl.textContent = msgs.throttled;
      return;
    }

    saveBtn.disabled = true;
    try {
      const blob = await painter.exportPNG();
      const name = nameInput.value.trim() || defaultArtistName();
      await Garabatos.gallery.save(blob, name);
      localStorage.setItem(THROTTLE_KEY, String(Date.now()));
      statusEl.textContent = msgs.saved;
      painter.clear();
      nameInput.value = '';
    } catch (error) {
      statusEl.textContent = msgs.error;
      console.error('Garabatos save failed:', error);
    } finally {
      saveBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
