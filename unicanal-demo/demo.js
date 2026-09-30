(() => {
  'use strict';
  // Deterministic PRNG so every visitor sees the same fake dataset.
  let seed = 20260930;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const CORES = ['1', '11', '21'];
  const CARTERAS = ['Hogar', 'Movil', 'Fija', 'Prestamo'];
  const REACT = ['Alta', 'Media', 'Baja'];
  const today = new Date().toISOString().slice(0, 10);

  const phones = Array.from({ length: 48 }, (_, i) => ({
    telefono: '9' + String(10000000 + Math.floor(rnd() * 89999999)),
    core: CORES[i % 3],
    descripcion: `${pick(CARTERAS)} ${String(i + 1).padStart(2, '0')}${rnd() < 0.3 ? ' I' : ' P'}`,
    reactividad: pick(REACT),
    envios: Math.floor(rnd() * 900),
    bloqueo: null,
  }));
  // A few start blocked so Alertas has something to show.
  [3, 9, 14, 22, 31].forEach((i) => { phones[i].bloqueo = 'Bloqueado'; });
  const log = [];

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tag = (e) => e ? `<span class="uc-tag ${e === 'Activo' ? 'ok' : e === 'Bloqueado' ? 'bad' : 'warn'}">${esc(e)}</span>` : '<span class="uc-tag">—</span>';
  const table = (el, head, rows) => {
    el.innerHTML = `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  };

  // Tabs
  const tabs = document.querySelectorAll('.uc-nav [role=tab]');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', x === t));
    document.querySelectorAll('.uc-panel').forEach((p) => { p.hidden = p.id !== 'tab-' + t.dataset.tab; });
  }));

  // Búsqueda
  const renderSearch = () => {
    const q = $('#q').value.trim().toLowerCase();
    const rows = phones.filter((p) => !q || [p.telefono, p.descripcion, p.core].some((v) => v.toLowerCase().includes(q)));
    $('#q-count').textContent = `${rows.length} resultado(s)`;
    table($('#q-table'), ['Teléfono', 'Core', 'Descripción', 'Reactividad', 'Bloqueo hoy'],
      rows.map((p) => [p.telefono, p.core, esc(p.descripcion), p.reactividad, tag(p.bloqueo)]));
  };
  $('#q').addEventListener('input', renderSearch);

  // Bloqueos
  $('#b-list').innerHTML = phones.map((p) => `<option value="${p.telefono}">`).join('');
  const renderLog = () => {
    table($('#b-table'), ['Fecha', 'Teléfono', 'Estado'], log.map((l) => [l.fecha, l.telefono, tag(l.estado)]));
  };
  $('#b-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = phones.find((x) => x.telefono === $('#b-tel').value.trim());
    if (!p) { $('#b-msg').textContent = 'Teléfono no encontrado en la demo.'; return; }
    const estado = $('#b-estado').value;
    const prev = log.find((l) => l.telefono === p.telefono && l.fecha === today);
    if (prev) prev.estado = estado; else log.unshift({ fecha: today, telefono: p.telefono, estado });
    p.bloqueo = estado;
    $('#b-msg').textContent = `${p.telefono} → ${estado}`;
    renderAll();
  });

  // Reportes
  $('#r-core').insertAdjacentHTML('beforeend', CORES.map((c) => `<option>${c}</option>`).join(''));
  const reportRows = () => phones.filter((p) => !$('#r-core').value || p.core === $('#r-core').value);
  const renderReport = () => {
    const rows = reportRows();
    const blocked = rows.filter((p) => p.bloqueo === 'Bloqueado').length;
    $('#r-kpis').innerHTML = [
      ['Chips', rows.length], ['Bloqueados hoy', blocked],
      ['Envíos', rows.reduce((s, p) => s + p.envios, 0)],
      ['% bloqueo', rows.length ? Math.round(blocked * 100 / rows.length) + '%' : '0%'],
    ].map(([l, v]) => `<div class="uc-kpi"><b>${v}</b><span>${l}</span></div>`).join('');
    table($('#r-table'), ['Core', 'Teléfono', 'Descripción', 'Reactividad', 'Envíos', 'Bloqueo'],
      rows.map((p) => [p.core, p.telefono, esc(p.descripcion), p.reactividad, p.envios, tag(p.bloqueo)]));
  };
  $('#r-core').addEventListener('change', renderReport);
  $('#r-csv').addEventListener('click', () => {
    const csv = ['core,telefono,descripcion,reactividad,envios,bloqueo']
      .concat(reportRows().map((p) => [p.core, p.telefono, p.descripcion, p.reactividad, p.envios, p.bloqueo || ''].join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'reporte-demo.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Alertas: one per (kind, entity); opens/closes from data state, never acknowledged away.
  const alerted = new Map(); // telefono -> resolved?
  const renderAlerts = () => {
    phones.forEach((p) => {
      if (p.bloqueo === 'Bloqueado') alerted.set(p.telefono, false);
      else if (alerted.has(p.telefono)) alerted.set(p.telefono, true);
    });
    const items = [...alerted].sort((a, b) => a[1] - b[1]);
    const open = items.filter(([, r]) => !r).length;
    $('#badge').hidden = !open;
    $('#badge').textContent = open;
    $('#a-list').innerHTML = items.length
      ? items.map(([t, r]) => `<li class="${r ? 'closed' : ''}"><b>Chip bloqueado</b> ${t}<small>${r ? 'Resuelta: el chip ya no está bloqueado' : 'Abierta: sigue bloqueado hoy'}</small></li>`).join('')
      : '<li>Sin alertas.</li>';
  };

  function renderAll() { renderSearch(); renderReport(); renderLog(); renderAlerts(); }
  renderAll();
})();
