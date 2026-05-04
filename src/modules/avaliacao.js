// ════════════════════════════════════════════════════
// Avaliação Postural IA Module
//
// Análise biomecânica via TensorFlow.js MoveNet.
// TF.js e pose-detection são carregados sob demanda (lazy)
// para evitar ~20MB desnecessários no carregamento inicial.
//
// Dependências:
//   window.AV_CONNS   → src/data/exEnMap.js
//   window.AV_PROTO   → src/data/avProto.js
//   window.avCol      → src/utils/geometry.js
//   window.avSev      → src/utils/geometry.js
//   window.avDrawLine → src/utils/geometry.js
//   window.loadExGif  → src/services/rapidApiService.js
// ════════════════════════════════════════════════════

// ─── Estado local ────────────────────────────────────────────────────────────

const avPhotos = {};
let avDetector = null;
const _isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

let _avCurrentView = null;
const _avSlotLabels = { front: 'Frente', back: 'Costas', rightSide: 'Lateral Direita', leftSide: 'Lateral Esquerda' };

let _avPendingView = null;
let _avPendingUrl  = null;

// ─── Bottom Sheet de seleção de fonte ────────────────────────────────────────

function avTriggerUpload(view) {
  _avCurrentView = view;
  document.getElementById('av-sheet-label').textContent = _avSlotLabels[view] || view;
  const sheet = document.getElementById('av-photo-sheet');
  const panel = document.getElementById('av-sheet-panel');
  sheet.classList.remove('hidden');
  panel.style.transform  = 'translateY(100%)';
  panel.style.transition = 'none';
  requestAnimationFrame(() => {
    panel.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)';
    panel.style.transform  = 'translateY(0)';
  });
}

function avCloseSheet(cb) {
  const sheet = document.getElementById('av-photo-sheet');
  const panel = document.getElementById('av-sheet-panel');
  panel.style.transition = 'transform 0.25s cubic-bezier(0.4,0,0.2,1)';
  panel.style.transform  = 'translateY(100%)';
  setTimeout(() => {
    sheet.classList.add('hidden');
    if (cb) cb();
  }, 260);
}

function avSheetCamera() {
  const view = _avCurrentView;
  // Clique SÍNCRONO dentro do gesto do usuário — Android exige isso para captura de câmera
  if (view) document.getElementById('cam-' + view).click();
  avCloseSheet();
}

function avSheetGallery() {
  const view = _avCurrentView;
  if (view) document.getElementById('file-' + view).click();
  avCloseSheet();
}

// ─── Preview e confirmação de foto ───────────────────────────────────────────

function avHandlePhoto(ev, view) {
  const file = ev.target.files[0]; if (!file) return;
  if (_avPendingUrl) { URL.revokeObjectURL(_avPendingUrl); _avPendingUrl = null; }
  _avPendingView = view;
  _avPendingUrl  = URL.createObjectURL(file);
  const labels = { front: 'Frente', back: 'Costas', rightSide: 'Lateral D', leftSide: 'Lateral E' };
  document.getElementById('av-preview-label').textContent = labels[view] || view;
  document.getElementById('av-preview-img').src = _avPendingUrl;
  document.getElementById('av-preview-modal').classList.remove('hidden');
}

function avPreviewConfirm() {
  if (!_avPendingView || !_avPendingUrl) return;
  const view = _avPendingView;
  const url  = _avPendingUrl;
  _avPendingView = null;
  _avPendingUrl  = null;
  document.getElementById('av-preview-modal').classList.add('hidden');
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    avPhotos[view] = img;
    const cv = document.getElementById('canvas-' + view);
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);
    cv.classList.remove('hidden');
    document.getElementById('slot-' + view).querySelectorAll('.av-ph').forEach(e => e.style.opacity = '0');
    const lbl = document.querySelector('.av-label-' + view);
    if (lbl) lbl.classList.remove('hidden');
    document.getElementById('av-btn-label').textContent = 'Analisar (' + Object.keys(avPhotos).length + '/4)';
    document.getElementById('av-upload-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  img.src = url;
}

function avPreviewCancel() {
  if (_avPendingUrl) { URL.revokeObjectURL(_avPendingUrl); _avPendingUrl = null; }
  _avPendingView = null;
  document.getElementById('av-preview-img').src = '';
  document.getElementById('av-preview-modal').classList.add('hidden');
  ['file-', 'cam-'].forEach(pfx => {
    ['front', 'back', 'rightSide', 'leftSide'].forEach(v => {
      const el = document.getElementById(pfx + v); if (el) el.value = '';
    });
  });
}

// ─── Carregamento lazy de TF.js e MoveNet ────────────────────────────────────

async function _avLoadTFJS() {
  if (window.tf && window.poseDetection) return;
  avSetMsg('Baixando biblioteca de IA (~11MB)...');
  avSetProg(5);
  await new Promise((resolve, reject) => {
    const s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js';
      s2.onload  = resolve;
      s2.onerror = reject;
      document.head.appendChild(s2);
    };
    s1.onerror = reject;
    document.head.appendChild(s1);
  });
}

async function avGetDetector() {
  if (avDetector) return avDetector;
  avSetMsg('Inicializando IA...');
  avSetProg(10);
  await _avLoadTFJS();
  avSetProg(20);
  try { await tf.ready(); } catch (e) {}
  avSetProg(30);
  const modelType = _isMobile
    ? poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    : poseDetection.movenet.modelType.SINGLEPOSE_THUNDER;
  avSetMsg(_isMobile
    ? 'Baixando modelo mobile (~3MB)...'
    : 'Baixando modelo MoveNet (~8MB)...');
  avDetector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType, enableSmoothing: false }
  );
  avSetProg(40);
  return avDetector;
}

function avSetMsg(m) { document.getElementById('av-loading-msg').textContent = m; }
function avSetProg(p) { document.getElementById('av-progress-bar').style.width = p + '%'; }

// ─── Análise principal ───────────────────────────────────────────────────────

async function avRunAnalysis() {
  const views = Object.keys(avPhotos);
  if (!views.length) { alert('Adicione ao menos 1 foto.'); return; }
  const name = document.getElementById('av-client-name').value.trim() || 'Paciente';
  document.getElementById('av-upload-panel').classList.add('hidden');
  document.getElementById('av-loading').classList.remove('hidden');
  document.getElementById('av-results').classList.add('hidden');
  document.getElementById('av-result-canvases').innerHTML = '';
  try {
    const det = await avGetDetector();
    const allM = {};
    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      const vl = { front: 'Frente', back: 'Costas', rightSide: 'Lateral D', leftSide: 'Lateral E' };
      avSetMsg('Analisando ' + (vl[view] || view) + '...');
      avSetProg(45 + i * (45 / views.length));
      const img   = avPhotos[view];
      const poses = await det.estimatePoses(img, { flipHorizontal: false });
      if (poses && poses.length > 0) {
        Object.assign(allM, avCalcM(poses[0], view));
        avDrawCanvas(view, img, poses[0]);
      }
    }
    avSetProg(100); avSetMsg('Gerando protocolo...');
    await new Promise(r => setTimeout(r, 500));
    document.getElementById('av-loading').classList.add('hidden');
    document.getElementById('av-results').classList.remove('hidden');
    document.getElementById('av-result-name').textContent = name;
    avRenderM(allM);
    avRenderProto(allM, name);
    _avSaveAndHistory(allM, name);
  } catch (e) {
    console.error('[Windson PT] Erro IA:', e);
    document.getElementById('av-loading').classList.add('hidden');
    document.getElementById('av-upload-panel').classList.remove('hidden');
    const msg = e && e.message ? e.message : String(e);
    alert('Erro ao carregar IA de postura:\n\n' + msg + '\n\nVerifique:\n• Conexao com internet (modelo ~8MB do Google)\n• Permissao de camera/GPU no navegador\n• Tente no Chrome ou Edge (melhor suporte WebGL)');
  }
}

// ─── Canvas: desenho de esqueleto e anotações ────────────────────────────────

function avDrawCanvas(view, img, pose) {
  const W = _isMobile ? 240 : 360, H = _isMobile ? 320 : 480;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.className = 'w-full rounded-2xl';
  cv.style.background = '#050505';
  const ctx = cv.getContext('2d');
  const sc  = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  const dw  = img.naturalWidth * sc,  dh = img.naturalHeight * sc;
  const dx  = (W - dw) / 2,           dy = (H - dh) / 2;
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, dx, dy, dw, dh);
  const kp = {};
  pose.keypoints.forEach(k => { kp[k.name] = { x: dx + k.x * sc, y: dy + k.y * sc, s: k.score }; });
  ctx.strokeStyle = 'rgba(212,175,55,0.55)'; ctx.lineWidth = 2;
  AV_CONNS.forEach(([a, b]) => {
    const ka = kp[a], kb = kp[b];
    if (ka && kb && ka.s > 0.25 && kb.s > 0.25) {
      ctx.beginPath(); ctx.moveTo(ka.x, ka.y); ctx.lineTo(kb.x, kb.y); ctx.stroke();
    }
  });
  pose.keypoints.forEach(k => {
    const p = kp[k.name];
    if (p && p.s > 0.25) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#D4AF37'; ctx.fill(); }
  });
  avAnnotate(ctx, kp, view);
  const vl   = { front: 'Frente', back: 'Costas', rightSide: 'Lateral D', leftSide: 'Lateral E' };
  const wrap = document.createElement('div');
  wrap.className  = 'flex flex-col gap-2'; wrap.dataset.view = view;
  const lbl = document.createElement('p');
  lbl.className   = 'text-center text-xs font-label text-on-surface-variant uppercase';
  lbl.textContent = vl[view] || view;
  wrap.appendChild(cv); wrap.appendChild(lbl);
  document.getElementById('av-result-canvases').appendChild(wrap);
}

function avAnnotate(ctx, kp, view) {
  ctx.font = 'bold 11px Inter,sans-serif';
  const ok = n => kp[n] && kp[n].s > 0.25;
  if (view === 'front' || view === 'back') {
    if (ok('left_shoulder') && ok('right_shoulder')) {
      const ls = kp['left_shoulder'], rs = kp['right_shoulder'];
      const a  = Math.abs(Math.atan2(rs.y - ls.y, rs.x - ls.x) * 180 / Math.PI);
      avDrawLine(ctx, ls, rs, a.toFixed(1) + '°', avCol(a, 3, 6));
    }
    if (ok('left_hip') && ok('right_hip')) {
      const lh = kp['left_hip'], rh = kp['right_hip'];
      const a  = Math.abs(Math.atan2(rh.y - lh.y, rh.x - lh.x) * 180 / Math.PI);
      avDrawLine(ctx, lh, rh, a.toFixed(1) + '°', avCol(a, 3, 6));
    }
  }
  if (view === 'rightSide' || view === 'leftSide') {
    const ek  = view === 'rightSide' ? 'right_ear'     : 'left_ear';
    const sk  = view === 'rightSide' ? 'right_shoulder' : 'left_shoulder';
    const hk2 = view === 'rightSide' ? 'right_hip'     : 'left_hip';
    const ak2 = view === 'rightSide' ? 'right_ankle'   : 'left_ankle';
    if (ok(ek) && ok(sk)) {
      const ear = kp[ek], sh = kp[sk];
      const hOff = view === 'rightSide' ? ear.x - sh.x : sh.x - ear.x;
      const a    = Math.abs(Math.atan2(Math.abs(hOff), Math.abs(ear.y - sh.y)) * 180 / Math.PI);
      const c    = avCol(a, 5, 12);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y - 70); ctx.lineTo(sh.x, sh.y); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = c; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ear.x, ear.y); ctx.lineTo(sh.x, sh.y); ctx.stroke();
      ctx.fillStyle = c; ctx.textAlign = 'right';
      ctx.fillText(a.toFixed(1) + '°', Math.min(ear.x, sh.x) - 4, (ear.y + sh.y) / 2);
      ctx.textAlign = 'left';
    }
    if (ok(hk2) && ok(ak2)) {
      const hi   = kp[hk2], an = kp[ak2];
      const hOff2 = view === 'rightSide' ? hi.x - an.x : an.x - hi.x;
      const legH  = Math.abs(hi.y - an.y) || 1;
      const a2    = Math.abs(Math.atan2(Math.abs(hOff2), legH) * 180 / Math.PI);
      const c2    = avCol(a2, 5, 12);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(an.x, an.y); ctx.lineTo(an.x, hi.y); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = c2; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(an.x, an.y); ctx.lineTo(hi.x, hi.y); ctx.stroke();
      ctx.fillStyle = c2; ctx.textAlign = 'right';
      ctx.fillText('Pelve ' + a2.toFixed(1) + '°', Math.min(an.x, hi.x) - 4, (an.y + hi.y) / 2);
      ctx.textAlign = 'left';
    }
  }
}

// ─── Cálculo de métricas biomecânicas ────────────────────────────────────────

function avCalcM(pose, view) {
  const kp  = {}; pose.keypoints.forEach(k => { kp[k.name] = k; });
  const ok  = n => kp[n] && kp[n].score > 0.25;
  const res = {};
  if (view === 'front' || view === 'back') {
    if (ok('left_shoulder') && ok('right_shoulder')) {
      const dy = kp['right_shoulder'].y - kp['left_shoulder'].y, dx = kp['right_shoulder'].x - kp['left_shoulder'].x;
      res.shoulderAsymmetry = { value: Math.abs(Math.atan2(dy, dx) * 180 / Math.PI), label: 'Assimetria de Ombros', icon: 'compare_arrows', warnAt: 3, critAt: 6, key: 'shoulderAsymmetry' };
    }
    if (ok('left_hip') && ok('right_hip')) {
      const dy = kp['right_hip'].y - kp['left_hip'].y, dx = kp['right_hip'].x - kp['left_hip'].x;
      res.hipAsymmetry = { value: Math.abs(Math.atan2(dy, dx) * 180 / Math.PI), label: 'Báscula Pélvica / Assimetria Quadril', icon: 'accessibility_new', warnAt: 3, critAt: 6, key: 'hipSymmetry' };
    }
    if (ok('left_shoulder') && ok('right_shoulder') && ok('left_hip') && ok('right_hip')) {
      const msx = (kp['left_shoulder'].x + kp['right_shoulder'].x) / 2, msy = (kp['left_shoulder'].y + kp['right_shoulder'].y) / 2;
      const mhx = (kp['left_hip'].x + kp['right_hip'].x) / 2,          mhy = (kp['left_hip'].y + kp['right_hip'].y) / 2;
      res.trunkInclination = { value: Math.abs(Math.atan2(mhx - msx, mhy - msy) * 180 / Math.PI), label: 'Inclinação de Tronco', icon: 'straighten', warnAt: 3, critAt: 6, key: 'trunkInclination' };
    }
    if (ok('left_ear') && ok('right_ear')) {
      const dy = kp['right_ear'].y - kp['left_ear'].y, dx = kp['right_ear'].x - kp['left_ear'].x;
      res.headTilt = { value: Math.abs(Math.atan2(dy, dx) * 180 / Math.PI), label: 'Inclinação de Cabeça', icon: 'rotate_right', warnAt: 3, critAt: 6, key: 'headTilt' };
    }
  }
  if (view === 'rightSide' || view === 'leftSide') {
    const ek = view === 'rightSide' ? 'right_ear'      : 'left_ear';
    const sk = view === 'rightSide' ? 'right_shoulder' : 'left_shoulder';
    const hk = view === 'rightSide' ? 'right_hip'      : 'left_hip';
    if (ok(ek) && ok(sk)) {
      const ear  = kp[ek], sh = kp[sk];
      const hOff = view === 'rightSide' ? ear.x - sh.x : sh.x - ear.x;
      res.forwardHead = { value: Math.abs(Math.atan2(Math.abs(hOff), Math.abs(ear.y - sh.y)) * 180 / Math.PI), label: 'Anteriorização Cervical (Cabeça à Frente)', icon: 'arrow_forward', warnAt: 5, critAt: 12, key: 'forwardHead' };
    }
    if (ok(sk) && ok(hk)) {
      const sh = kp[sk], hi = kp[hk];
      res.trunkLean = { value: Math.abs(Math.atan2(hi.x - sh.x, hi.y - sh.y) * 180 / Math.PI), label: 'Projeção Anterior de Tronco (Lateral)', icon: 'leaderboard', warnAt: 3, critAt: 7, key: 'trunkInclination' };
    }
    const ak = view === 'rightSide' ? 'right_ankle' : 'left_ankle';
    if (ok(hk) && ok(ak)) {
      const hi   = kp[hk], an = kp[ak];
      const hOff = view === 'rightSide' ? hi.x - an.x : an.x - hi.x;
      const legH = Math.abs(hi.y - an.y) || 1;
      res.anteriorPelvicTilt = { value: Math.abs(Math.atan2(Math.abs(hOff), legH) * 180 / Math.PI), label: 'Anteversão Pélvica / Hiperlordose Lombar', icon: 'pivot_table_chart', warnAt: 5, critAt: 12, key: 'anteriorPelvicTilt' };
    }
  }
  return res;
}

// ─── Score + persistência + histórico ────────────────────────────────────────

function _avCalcScore(meas) {
  const items = Object.values(meas);
  if (!items.length) return null;
  const pts = items.map(m => avSev(m) === 'normal' ? 10 : avSev(m) === 'mild' ? 6 : 2);
  return +(pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(2);
}

async function _avSaveAndHistory(meas, nome) {
  const score = _avCalcScore(meas);
  const sbClient = window.sbClient;
  if (!sbClient) return;

  // Salva avaliação no banco
  await sbClient.from('avaliacoes_historico').insert([{
    cliente_nome: nome,
    score:        score,
    medicoes:     meas
  }]);

  // Busca histórico para exibir
  const hist = document.getElementById('av-historico');
  const list = document.getElementById('av-historico-list');
  if (!hist || !list) return;

  if (typeof window.fetchAvaliacoesCliente === 'function') {
    const data = await window.fetchAvaliacoesCliente(nome);
    if (data && data.length > 1) { // só mostra se houver avaliações anteriores
      const scoreColor = s => s >= 8 ? '#D4AF37' : s >= 5 ? '#F0A020' : '#ffb4ab';
      list.innerHTML = data.map((av, i) => {
        const dt    = new Date(av.created_at).toLocaleDateString('pt-BR');
        const s     = av.score != null ? av.score.toFixed(1) : '—';
        const delta = i < data.length - 1 && av.score != null && data[i+1].score != null
          ? (av.score - data[i+1].score).toFixed(1) : null;
        const deltaStr = delta != null
          ? `<span style="color:${parseFloat(delta) >= 0 ? '#D4AF37' : '#ffb4ab'};">${parseFloat(delta) >= 0 ? '+' : ''}${delta}</span>`
          : '';
        return `<div class="flex items-center justify-between px-3 py-2 rounded-xl text-xs" style="background:#141414;">
          <span style="color:#666;">${dt}</span>
          <div class="flex items-center gap-2">
            <span class="font-bold text-base" style="color:${scoreColor(av.score)};font-family:'Sora',sans-serif;">${s}<span class="text-[10px]">/10</span></span>
            ${deltaStr}
          </div>
        </div>`;
      }).join('');
      hist.classList.remove('hidden');
    } else {
      hist.classList.add('hidden');
    }
  }
}

// ─── Renderização de resultados ───────────────────────────────────────────────

function avRenderM(meas) {
  const c = document.getElementById('av-measurements'); c.innerHTML = '';
  const items = Object.values(meas);
  if (!items.length) {
    c.innerHTML = '<p class="text-on-surface-variant text-sm font-label">Nenhum keypoint detectado com confiança. Use fotos bem iluminadas com corpo inteiro visível.</p>';
    return;
  }
  const cls = {
    normal:   { t: 'text-primary',  b: 'bg-primary/10 text-primary border-primary/30' },
    mild:     { t: 'text-tertiary', b: 'bg-tertiary/10 text-tertiary border-tertiary/30' },
    moderate: { t: 'text-error',    b: 'bg-error/10 text-error border-error/30' }
  };
  const lbl = { normal: 'Normal', mild: 'Atenção', moderate: 'Crítico' };
  items.forEach(m => {
    const s = avSev(m), cl = cls[s];
    const div = document.createElement('div');
    div.className = 'flex items-center gap-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/10';
    div.innerHTML =
      '<span class="material-symbols-outlined text-2xl ' + cl.t + '">' + m.icon + '</span>'
      + '<div class="flex-1 min-w-0">'
      + '<p class="font-label font-bold text-sm text-on-surface truncate">' + m.label + '</p>'
      + '<p class="font-body text-xs text-on-surface-variant">Normal &lt; ' + m.warnAt + '° &nbsp;·&nbsp; Atenção ' + m.warnAt + '–' + m.critAt + '° &nbsp;·&nbsp; Crítico &gt; ' + m.critAt + '°</p>'
      + '</div>'
      + '<div class="flex flex-col items-end gap-1 shrink-0">'
      + '<span class="font-headline font-bold text-lg ' + cl.t + '">' + m.value.toFixed(1) + '°</span>'
      + '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ' + cl.b + '">' + lbl[s] + '</span>'
      + '</div>';
    c.appendChild(div);
  });
}

// Mapeamento: chave do desvio → músculos a buscar no banco
const _AV_MUSCLE_MAP = {
  anteriorPelvicTilt:  ['glutes', 'abdominals', 'hip flexors', 'lower back'],
  shoulderAsymmetry:   ['trapezius', 'shoulders', 'middle back', 'rotator cuff'],
  hipAsymmetry:        ['glutes', 'abductors', 'adductors', 'hip flexors'],
  trunkInclination:    ['abdominals', 'obliques', 'lower back'],
  headTilt:            ['trapezius', 'neck', 'shoulders'],
  cervicalForwardHead: ['trapezius', 'chest', 'neck', 'middle back'],
  kneeAlignment:       ['quadriceps', 'glutes', 'abductors', 'hamstrings'],
};

function _avBankRecs(exercises, key, severity) {
  const muscles = _AV_MUSCLE_MAP[key] || [];
  if (!muscles.length || !exercises.length) return [];
  const cats = severity === 'moderate'
    ? ['strength', 'stretching']
    : ['stretching', 'strength'];
  return exercises
    .filter(ex => {
      const t = (ex.target_muscle      || '').toLowerCase();
      const s = (ex.secondary_muscles  || '').toLowerCase();
      return muscles.some(ms => t.includes(ms) || s.includes(ms));
    })
    .filter(ex => cats.includes(ex.category))
    .sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category))
    .slice(0, 4);
}

async function avRenderProto(meas, name) {
  const cont = document.getElementById('av-protocol'); cont.innerHTML = '';

  // Carrega cache de exercícios uma vez
  const exercises = (typeof window.fetchExercises === 'function')
    ? await window.fetchExercises().catch(() => [])
    : [];
  const devs = {};
  Object.values(meas).forEach(m => {
    const s = avSev(m); if (s === 'normal') return;
    if (!devs[m.key] || (avSev(devs[m.key]) === 'mild' && s === 'moderate')) devs[m.key] = m;
  });
  if (!Object.keys(devs).length) {
    cont.innerHTML = '<div class="glass-panel rounded-2xl p-8 text-center"><span class="material-symbols-outlined text-4xl text-primary mb-3 block">check_circle</span><h3 class="font-headline font-bold text-xl mb-2">Postura dentro dos parâmetros</h3><p class="text-on-surface-variant text-sm font-label">Manter fortalecimento geral. Reavaliar em 3 meses.</p></div>';
    return;
  }
  const hdr = document.createElement('div'); hdr.className = 'flex items-center gap-3';
  hdr.innerHTML = '<div class="w-10 h-10 rounded-full primary-gradient-bg flex items-center justify-center"><span class="material-symbols-outlined text-surface-container-lowest">fitness_center</span></div>'
    + '<div><h3 class="font-headline font-bold text-xl">Protocolo Corretivo — ' + name + '</h3>'
    + '<p class="text-on-surface-variant text-xs font-label">' + Object.keys(devs).length + ' desvio(s) identificado(s) · ordenado por prioridade</p></div>';
  cont.appendChild(hdr);

  const sorted   = Object.values(devs).sort((a, b) => (avSev(b) === 'moderate' ? 2 : 1) - (avSev(a) === 'moderate' ? 2 : 1));
  const gifQueue = [];

  sorted.forEach((m, idx) => {
    const s = avSev(m), proto = AV_PROTO[m.key]; if (!proto) return;
    const exs   = proto[s] || proto.mild;
    const brd   = s === 'moderate' ? 'border-l-error' : 'border-l-tertiary';
    const bdg   = s === 'moderate' ? 'bg-error/10 text-error border-error/30' : 'bg-tertiary/10 text-tertiary border-tertiary/30';
    const sl    = s === 'moderate' ? 'Crítico' : 'Atenção';
    const ciHtml = proto.ci
      ? proto.ci.map(c => '<div class="flex items-start gap-2 px-3 py-2 bg-error/5 border border-error/15 rounded-lg"><span class="material-symbols-outlined text-error text-sm mt-0.5">warning</span><p class="text-xs text-error font-label">' + c + '</p></div>').join('')
      : '';

    const exHtml = exs.map((e, ei) => {
      const gid = 'gx-' + idx + '-' + ei;
      gifQueue.push({ name: e.n, id: gid });
      return '<div class="flex items-start gap-3 p-3 bg-surface-container-low rounded-xl">'
        + '<div id="' + gid + '" class="shrink-0 rounded-xl overflow-hidden" style="width:60px;height:60px;min-width:60px;background:linear-gradient(135deg,#111,#1A1A1A);border-radius:12px;border:1px solid rgba(212,175,55,0.1);"></div>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="font-label font-bold text-sm text-on-surface">' + e.n + '</p>'
        + '<p class="text-xs text-on-surface-variant mt-0.5">' + e.d + '</p>'
        + '</div></div>';
    }).join('');

    const card = document.createElement('div');
    card.className = 'glass-panel rounded-2xl p-6 space-y-5 border-l-4 ' + brd;
    card.innerHTML = '<div><div class="flex items-center gap-2 flex-wrap mb-2"><span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ' + bdg + '">Prioridade ' + (idx + 1) + ' — ' + sl + '</span></div>'
      + '<h4 class="font-headline font-bold text-lg">' + proto.label + '</h4>'
      + '<p class="text-on-surface-variant text-sm font-label">' + m.value.toFixed(1) + '° medido · referência normal &lt; ' + m.warnAt + '°</p></div>'
      + '<div class="space-y-2"><p class="text-xs font-label text-on-surface-variant uppercase tracking-widest font-semibold">Exercícios Prescritos</p>' + exHtml + '</div>'
      + (ciHtml ? '<div class="space-y-2"><p class="text-xs font-label text-error uppercase tracking-widest font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-sm">block</span> Contra-indicado neste ciclo</p>' + ciHtml + '</div>' : '');
    cont.appendChild(card);

    // ── Recomendações do banco de exercícios ──────────────────────────────────
    const recs = _avBankRecs(exercises, m.key, s);
    if (recs.length) {
      const recWrap = document.createElement('div');
      recWrap.className = 'mt-4 space-y-2';
      recWrap.innerHTML = '<p class="text-xs font-label uppercase tracking-widest font-semibold" style="color:rgba(212,175,55,0.65);">Exercícios do Banco Recomendados</p>';

      const recList = document.createElement('div');
      recList.className = 'flex gap-3 overflow-x-auto pb-1';
      recList.style.scrollbarWidth = 'none';

      recs.forEach(ex => {
        const label    = ex.name_pt || ex.name;
        const safeName = label.replace(/'/g, "\\'");
        const img0     = ex.gif_url     || '';
        const img1     = ex.image_url_2 || '';

        const imgHtml = (img0 && img1)
          ? `<div class="ex-img-wrap rounded-xl overflow-hidden" style="aspect-ratio:1/1;">
               <img src="${img0}" class="fr-a" loading="lazy" onerror="this.style.display='none'"/>
               <img src="${img1}" class="fr-b" loading="lazy" onerror="this.style.display='none'"/>
             </div>`
          : img0
            ? `<div class="ex-img-wrap rounded-xl overflow-hidden" style="aspect-ratio:1/1;">
                 <img src="${img0}" class="solo" loading="lazy" onerror="this.style.display='none'"/>
               </div>`
            : `<div class="rounded-xl flex items-center justify-center" style="aspect-ratio:1/1;background:#0a0a0a;">
                 <span class="material-symbols-outlined" style="color:#333;font-size:20px;">fitness_center</span>
               </div>`;

        const mini = document.createElement('div');
        mini.className = 'flex-shrink-0 flex flex-col gap-1.5 rounded-xl p-2';
        mini.style.cssText = 'background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.12);width:112px;';
        mini.innerHTML = imgHtml
          + `<p class="text-[10px] font-bold text-on-surface leading-tight" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${label}</p>`
          + `<button onclick="exBankAddToWorkout('${safeName}')"
                     class="w-full py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all active:scale-95"
                     style="background:rgba(212,175,55,0.1);color:#D4AF37;border:1px solid rgba(212,175,55,0.2);">
               + Protocolo
             </button>`;
        recList.appendChild(mini);
      });

      recWrap.appendChild(recList);
      card.appendChild(recWrap);
    }
  });

  // GIFs carregados escalonados (400ms entre cada) para não estourar cota da API
  gifQueue.forEach(({ name, id }, i) => setTimeout(() => loadExGif(name, id), i * 400));
}

// ─── Reset ───────────────────────────────────────────────────────────────────

function avReset() {
  Object.keys(avPhotos).forEach(k => delete avPhotos[k]);
  ['front', 'back', 'rightSide', 'leftSide'].forEach(view => {
    const cv = document.getElementById('canvas-' + view);
    if (cv) { cv.classList.add('hidden'); const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); }
    document.getElementById('slot-' + view).querySelectorAll('.av-ph').forEach(e => { e.style.opacity = ''; });
    const lbl = document.querySelector('.av-label-' + view); if (lbl) lbl.classList.add('hidden');
    const fi  = document.getElementById('file-' + view); if (fi) fi.value = '';
    const fc  = document.getElementById('cam-' + view);  if (fc) fc.value = '';
  });
  document.getElementById('av-result-canvases').innerHTML = '';
  document.getElementById('av-results').classList.add('hidden');
  document.getElementById('av-upload-panel').classList.remove('hidden');
  document.getElementById('av-btn-label').textContent        = 'Analisar Postura';
  document.getElementById('av-progress-bar').style.width     = '5%';
  document.getElementById('av-client-name').value            = '';
}

// ─── Exposição global ────────────────────────────────────────────────────────
window.avTriggerUpload  = avTriggerUpload;
window.avCloseSheet     = avCloseSheet;
window.avSheetCamera    = avSheetCamera;
window.avSheetGallery   = avSheetGallery;
window.avHandlePhoto    = avHandlePhoto;
window.avPreviewConfirm = avPreviewConfirm;
window.avPreviewCancel  = avPreviewCancel;
window.avGetDetector    = avGetDetector;
window.avSetMsg         = avSetMsg;
window.avSetProg        = avSetProg;
window.avRunAnalysis    = avRunAnalysis;
window.avDrawCanvas     = avDrawCanvas;
window.avAnnotate       = avAnnotate;
window.avCalcM          = avCalcM;
window.avRenderM        = avRenderM;
window.avRenderProto    = avRenderProto;
window.avReset          = avReset;
