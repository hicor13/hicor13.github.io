// garabatos/gallery.js
//
// Supabase glue: a Postgres table for drawing metadata, a Storage bucket
// for the PNGs. Depends on the Supabase UMD script (window.supabase)
// already being loaded via a <script> tag in index.html's <head>.
window.Garabatos = window.Garabatos || {};

Garabatos.gallery = (function () {
  let client, projectUrl, gridEl;

  function downloadUrlFor(storagePath) {
    return `${projectUrl}/storage/v1/object/public/drawings/${storagePath}`;
  }

  function renderCard(drawing) {
    const figure = document.createElement('figure');
    figure.className = 'garabato-card';
    const img = document.createElement('img');
    img.src = downloadUrlFor(drawing.storage_path);
    img.alt = drawing.name;
    img.title = drawing.name;
    img.loading = 'lazy';
    const caption = document.createElement('figcaption');
    caption.textContent = drawing.name;
    figure.appendChild(img);
    figure.appendChild(caption);
    return figure;
  }

  function prepend(drawing) {
    gridEl.prepend(renderCard(drawing));
    const empty = gridEl.querySelector('.garabatos-empty');
    if (empty) empty.remove();
  }

  // Rendered by script.js when Garabatos.gallery.init() rejects (Supabase
  // down, CDN script failed to load, RLS misconfigured, etc.) so a visitor
  // sees "broken" rather than a silent, empty gallery section.
  function renderError(gridElement) {
    gridElement.innerHTML = '';
    const error = document.createElement('p');
    error.className = 'garabatos-empty garabatos-error';
    error.innerHTML =
      '<span data-i18n-es>No se pudo cargar la galería.</span>' +
      '<span data-i18n-en>Couldn’t load the gallery.</span>';
    gridElement.appendChild(error);
  }

  async function init(url, anonKey, gridElement) {
    gridEl = gridElement;
    projectUrl = url;
    client = window.supabase.createClient(url, anonKey);

    const { data, error } = await client
      .from('drawings')
      .select('name, storage_path, created_at')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) throw error;

    if (data.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'garabatos-empty';
      empty.innerHTML =
        '<span data-i18n-es>Sé el primero en dejar un garabato</span>' +
        '<span data-i18n-en>Be the first to leave a doodle</span>';
      gridEl.appendChild(empty);
      return;
    }

    data.forEach((drawing) => {
      gridEl.appendChild(renderCard(drawing));
    });
  }

  async function save(blob, name) {
    const id = crypto.randomUUID();
    const storagePath = `${id}.png`;

    const { error: uploadError } = await client.storage
      .from('drawings')
      .upload(storagePath, blob, { contentType: 'image/png' });
    if (uploadError) throw uploadError;

    const { error: insertError } = await client
      .from('drawings')
      .insert({ id, name, storage_path: storagePath });
    if (insertError) throw insertError;

    const drawing = { name, storage_path: storagePath };
    prepend(drawing);
    return drawing;
  }

  return { init, save, renderError };
})();
