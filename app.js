'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const KEY = 'oring-items-v1';
  const COLORS = ['#f5a623', '#22c55e', '#38bdf8'];
  const STEP_NAMES = ['1 Referencia', '2 Interior', '3 Exterior'];
  // Secciones (grosores) comunes, métricas y de series en pulgadas
  const STD_CS = [1, 1.5, 1.78, 2, 2.4, 2.5, 2.62, 3, 3.1, 3.53, 4, 5, 5.33, 5.7, 6, 6.99, 7, 8, 10];
  const LOUPE = 110, MAG = 3, HIT = 30;

  // ---------- estado ----------
  let img = null, imgW = 0, imgH = 0, scale = 1, cssW = 0, cssH = 0, dpr = 1;
  const pts = [[], [], []];      // puntos en coordenadas de la imagen
  let step = 0, drag = null, editingUid = null, odMm = null;
  let items = load();

  // ---------- utilidades ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { toast('No se pudo guardar'); }
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const fmt = n => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const fnum = n => (Math.round(n * 100) / 100).toString();
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function refMm() {
    const v = $('#refSel').value;
    return v === 'custom' ? (parseFloat($('#refCustom').value) || 0) : parseFloat(v);
  }

  // ---------- pestañas ----------
  function showView(name) {
    $('#viewMeasure').hidden = name !== 'measure';
    $('#viewList').hidden = name !== 'list';
    $('#tabMeasure').classList.toggle('active', name === 'measure');
    $('#tabList').classList.toggle('active', name === 'list');
    window.scrollTo(0, 0);
    if (name === 'measure' && img) { layout(); render(); }
  }
  $('#tabMeasure').onclick = () => showView('measure');
  $('#tabList').onclick = () => showView('list');

  // ---------- carga de imagen ----------
  function loadFile(f) {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      img = im; imgW = im.naturalWidth; imgH = im.naturalHeight;
      pts.forEach(a => a.length = 0);
      step = 0; odMm = null;
      $('#stage').hidden = false;
      layout(); renderSteps(); render(); compute();
      URL.revokeObjectURL(url);
      $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    im.onerror = () => toast('No se pudo abrir la imagen');
    im.src = url;
  }
  $('#cam').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; };
  $('#gal').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; };

  // ---------- canvas ----------
  function layout() {
    if (!img) return;
    cssW = $('#wrap').clientWidth;
    if (!cssW) return;
    scale = cssW / imgW;
    cssH = Math.round(imgH * scale);
    dpr = window.devicePixelRatio || 1;
    const cv = $('#cv');
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    const lp = $('#loupe');
    lp.style.width = LOUPE + 'px';
    lp.style.height = LOUPE + 'px';
    lp.width = Math.round(LOUPE * dpr);
    lp.height = Math.round(LOUPE * dpr);
  }

  function render() {
    if (!img || !cssW) return;
    const c = $('#cv').getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.drawImage(img, 0, 0, cssW, cssH);
    pts.forEach((p, si) => {
      const col = COLORS[si];
      const q = p.map(a => ({ x: a.x * scale, y: a.y * scale }));
      if (q.length === 2) {
        c.lineWidth = 2; c.strokeStyle = col;
        c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[1].x, q[1].y); c.stroke();
        if (si > 0) {   // círculo que pasa por los dos puntos (para verificar que calza)
          const m = { x: (q[0].x + q[1].x) / 2, y: (q[0].y + q[1].y) / 2 };
          const r = dist(q[0], q[1]) / 2;
          c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.stroke();
        }
      }
      q.forEach(a => {
        c.beginPath(); c.arc(a.x, a.y, 7, 0, Math.PI * 2);
        c.fillStyle = col; c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
        c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
      });
    });
  }

  function drawLoupe(p) {
    const L = $('#loupe');
    const c = L.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, LOUPE, LOUPE);
    const side = LOUPE / (scale * MAG);
    c.drawImage(img, p.x - side / 2, p.y - side / 2, side, side, 0, 0, LOUPE, LOUPE);
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(LOUPE / 2, 0); c.lineTo(LOUPE / 2, LOUPE);
    c.moveTo(0, LOUPE / 2); c.lineTo(LOUPE, LOUPE / 2);
    c.stroke();
    const onRight = p.x * scale > cssW / 2;
    L.style.left = onRight ? '6px' : 'auto';
    L.style.right = onRight ? 'auto' : '6px';
    L.hidden = false;
  }

  function toImg(e) {
    const r = $('#cv').getBoundingClientRect();
    const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    return { x: Math.max(0, Math.min(imgW, x)), y: Math.max(0, Math.min(imgH, y)) };
  }

  const cv = $('#cv');
  cv.addEventListener('pointerdown', e => {
    if (!img) return;
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    const p = toImg(e);
    let best = null, bd = Infinity;
    pts.forEach((a, si) => a.forEach((q, i) => {
      const d = Math.hypot((q.x - p.x) * scale, (q.y - p.y) * scale);
      if (d < bd) { bd = d; best = { s: si, i }; }
    }));
    if (best && bd <= HIT) {
      drag = best;
    } else if (pts[step].length < 2) {
      pts[step].push(p);
      drag = { s: step, i: pts[step].length - 1 };
    } else {
      return;
    }
    drawLoupe(pts[drag.s][drag.i]);
    render();
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    const p = toImg(e);
    pts[drag.s][drag.i] = p;
    drawLoupe(p);
    render();
    compute();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    $('#loupe').hidden = true;
    if (step < 2 && pts[step].length === 2) step++;
    renderSteps(); render(); compute();
  };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  // ---------- pasos ----------
  function helpText() {
    if (step === 0) {
      const v = $('#refSel').value;
      const what = v === '53.98' ? 'lado corto de la tarjeta' : v === 'custom' ? 'tramo de referencia' : 'lado largo de la tarjeta';
      return `Tocá los dos extremos del ${what}, de borde a borde.`;
    }
    if (step === 1) return 'Tocá dos puntos opuestos del borde INTERIOR del O-ring. El círculo verde debe calzar con el hueco.';
    return 'Tocá dos puntos opuestos del borde EXTERIOR. El círculo celeste debe calzar con el borde externo.';
  }
  function renderSteps() {
    const box = $('#steps');
    box.innerHTML = '';
    STEP_NAMES.forEach((n, i) => {
      const b = document.createElement('button');
      b.textContent = n;
      b.style.borderColor = COLORS[i];
      if (i === step) b.classList.add('active');
      if (pts[i].length === 2) b.classList.add('done');
      b.onclick = () => { step = i; renderSteps(); };
      box.appendChild(b);
    });
    $('#stepHelp').textContent = helpText();
  }
  $('#undoBtn').onclick = () => {
    while (step > 0 && pts[step].length === 0) step--;
    if (pts[step].length) pts[step].pop();
    renderSteps(); render(); compute();
  };
  $('#resetBtn').onclick = () => {
    pts.forEach(a => a.length = 0);
    step = 0; odMm = null;
    renderSteps(); render(); compute();
  };
  $('#refSel').onchange = () => {
    $('#refCustomBox').hidden = $('#refSel').value !== 'custom';
    renderSteps(); compute();
  };
  $('#refCustom').oninput = compute;

  // ---------- cálculo ----------
  function compute() {
    const ro = $('#readout');
    const r = pts[0], ref = refMm();
    odMm = null;
    if (!img || r.length < 2 || !ref) { ro.textContent = ''; updateOdInfo(); return; }
    const refPx = dist(r[0], r[1]);
    if (refPx < 5) { ro.textContent = ''; updateOdInfo(); return; }
    const mmpx = ref / refPx;
    let txt = `Escala: ${(1 / mmpx).toFixed(1)} px/mm`;
    let idv = null;
    if (pts[1].length === 2) {
      idv = dist(pts[1][0], pts[1][1]) * mmpx;
      txt += ` · Interior: ${fmt(idv)} mm`;
      $('#idIn').value = idv.toFixed(1);
    }
    if (pts[2].length === 2) {
      odMm = dist(pts[2][0], pts[2][1]) * mmpx;
      txt += ` · Exterior: ${fmt(odMm)} mm`;
    }
    if (idv != null && odMm != null && odMm > idv) {
      const cs = (odMm - idv) / 2;
      $('#csIn').value = cs.toFixed(1);
      txt += ` · Grosor: ${fmt(cs)} mm`;
    }
    ro.textContent = txt;
    updateSuggest();
    updateOdInfo();
  }
  function updateOdInfo() {
    const i = parseFloat($('#idIn').value), c = parseFloat($('#csIn').value);
    $('#odInfo').textContent = (i > 0 && c > 0)
      ? `Diámetro exterior resultante: ${fmt(i + 2 * c)} mm`
      : '';
  }
  function updateSuggest() {
    const box = $('#sugg');
    box.innerHTML = '';
    const cs = parseFloat($('#csIn').value);
    if (!(cs > 0)) return;
    const near = STD_CS.map(s => ({ s, d: Math.abs(s - cs) }))
      .filter(x => x.d <= 0.2 && x.d > 0.004)
      .sort((a, b) => a.d - b.d).slice(0, 3);
    if (!near.length) return;
    const lab = document.createElement('span');
    lab.textContent = 'Grosor estándar cercano:';
    box.appendChild(lab);
    near.forEach(x => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = fmt(x.s) + ' mm';
      b.onclick = () => { $('#csIn').value = x.s; updateSuggest(); updateOdInfo(); };
      box.appendChild(b);
    });
  }
  $('#csIn').oninput = () => { updateSuggest(); updateOdInfo(); };
  $('#idIn').oninput = updateOdInfo;

  // ---------- formulario ----------
  $('#qtyMinus').onclick = () => { $('#qty').value = Math.max(1, (parseInt($('#qty').value) || 1) - 1); };
  $('#qtyPlus').onclick = () => { $('#qty').value = (parseInt($('#qty').value) || 0) + 1; };

  function resetForm() {
    editingUid = null;
    $('#idIn').value = ''; $('#csIn').value = '';
    $('#mat').value = ''; $('#qty').value = 1; $('#note').value = '';
    $('#addBtn').textContent = 'Agregar a la lista';
    $('#cancelEdit').hidden = true;
    $('#formTitle').textContent = '2. Medida';
    $('#sugg').innerHTML = ''; $('#odInfo').textContent = '';
    $('#readout').textContent = '';
    pts.forEach(a => a.length = 0);
    step = 0; odMm = null;
    if (img) { renderSteps(); render(); }
  }

  $('#addBtn').onclick = () => {
    const idv = parseFloat($('#idIn').value);
    const cs = parseFloat($('#csIn').value);
    if (!(idv > 0) || !(cs > 0)) { toast('Completá diámetro interior y grosor'); return; }
    const qty = Math.max(1, parseInt($('#qty').value) || 1);
    const mat = $('#mat').value;
    const note = $('#note').value.trim();

    if (editingUid) {
      const it = items.find(x => x.uid === editingUid);
      if (it) Object.assign(it, { idMm: idv, csMm: cs, mat, note, qty });
      toast('Cambios guardados');
    } else {
      const same = items.find(x => x.idMm === idv && x.csMm === cs && x.mat === mat && x.note === note);
      if (same) { same.qty += qty; toast(`Ya estaba: ahora ${same.qty} u.`); }
      else {
        items.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), idMm: idv, csMm: cs, mat, note, qty });
        toast('Agregado a la lista');
      }
    }
    save(); renderList(); resetForm();
  };
  $('#cancelEdit').onclick = resetForm;

  // ---------- lista ----------
  function renderList() {
    const box = $('#listBox');
    box.innerHTML = '';
    const total = items.reduce((s, x) => s + x.qty, 0);
    $('#emptyMsg').hidden = items.length > 0;
    $('#exportCard').hidden = items.length === 0;
    $('#totals').textContent = items.length
      ? `${items.length} ${items.length === 1 ? 'medida' : 'medidas'} distintas · ${total} unidades en total`
      : '';
    const badge = $('#badge');
    badge.hidden = items.length === 0;
    badge.textContent = total;

    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'item';
      d.dataset.uid = it.uid;
      const sub = [it.mat, it.note].filter(Boolean).join(' · ');
      d.innerHTML = `
        <div>
          <div class="item-title">${fmt(it.idMm)} × ${fmt(it.csMm)} mm</div>
          <div class="item-sub">Int. × grosor · Ext. ${fmt(it.idMm + 2 * it.csMm)} mm${sub ? ' · ' + esc(sub) : ''}</div>
        </div>
        <div class="qty">
          <button data-act="minus" aria-label="Menos">−</button>
          <input data-act="qty" type="number" inputmode="numeric" min="1" value="${it.qty}">
          <button data-act="plus" aria-label="Más">+</button>
        </div>
        <div class="item-actions">
          <button data-act="edit">Editar</button>
          <button data-act="del" class="del">Quitar</button>
        </div>`;
      box.appendChild(d);
    });
  }
  function esc(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  $('#listBox').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const row = b.closest('.item');
    const it = items.find(x => x.uid === row.dataset.uid);
    if (!it) return;
    const act = b.dataset.act;
    if (act === 'plus') it.qty++;
    else if (act === 'minus') it.qty = Math.max(1, it.qty - 1);
    else if (act === 'del') {
      if (!confirm(`¿Quitar ${fmt(it.idMm)} × ${fmt(it.csMm)} mm de la lista?`)) return;
      items = items.filter(x => x !== it);
    } else if (act === 'edit') {
      startEdit(it); return;
    }
    save(); renderList();
  });
  $('#listBox').addEventListener('change', e => {
    if (e.target.dataset.act !== 'qty') return;
    const it = items.find(x => x.uid === e.target.closest('.item').dataset.uid);
    if (!it) return;
    it.qty = Math.max(1, parseInt(e.target.value) || 1);
    save(); renderList();
  });

  function startEdit(it) {
    editingUid = it.uid;
    $('#idIn').value = it.idMm; $('#csIn').value = it.csMm;
    $('#mat').value = it.mat; $('#qty').value = it.qty; $('#note').value = it.note;
    $('#addBtn').textContent = 'Guardar cambios';
    $('#cancelEdit').hidden = false;
    $('#formTitle').textContent = 'Editando medida';
    updateSuggest(); updateOdInfo();
    showView('measure');
    $('#formTitle').scrollIntoView({ block: 'start' });
  }

  // ---------- exportar ----------
  function asText() {
    const total = items.reduce((s, x) => s + x.qty, 0);
    const lines = items.map(it => {
      const extra = [it.mat, it.note].filter(Boolean).join(', ');
      return `- ${it.qty} u.  ${fmt(it.idMm)} x ${fmt(it.csMm)} mm (int x grosor)${extra ? '  [' + extra + ']' : ''}`;
    });
    return `O-rings (${new Date().toLocaleDateString('es-AR')})\n${lines.join('\n')}\nTotal: ${total} unidades`;
  }
  $('#copyBtn').onclick = async () => {
    const t = asText();
    try { await navigator.clipboard.writeText(t); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) { /* nada */ }
      ta.remove();
    }
    toast('Lista copiada');
  };
  $('#shareBtn').onclick = async () => {
    const t = asText();
    if (navigator.share) {
      try { await navigator.share({ title: 'Lista de O-rings', text: t }); } catch (e) { /* cancelado */ }
    } else { $('#copyBtn').click(); }
  };
  $('#csvBtn').onclick = () => {
    const q = s => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [['Diametro_interior_mm', 'Grosor_mm', 'Diametro_exterior_mm', 'Material', 'Cantidad', 'Nota'].join(',')];
    items.forEach(it => rows.push([fnum(it.idMm), fnum(it.csMm), fnum(it.idMm + 2 * it.csMm), q(it.mat), it.qty, q(it.note)].join(',')));
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'orings.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#clearBtn').onclick = () => {
    if (!items.length || !confirm('¿Vaciar toda la lista?')) return;
    items = []; save(); renderList();
  };

  // ---------- instalación / offline ----------
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e; $('#installBtn').hidden = false;
  });
  $('#installBtn').onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null; $('#installBtn').hidden = true;
  };
  window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin offline */ });
  }

  window.addEventListener('resize', () => { layout(); render(); });

  // ---------- inicio ----------
  renderList();
})();
