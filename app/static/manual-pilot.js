const PILOT_PROJECT_KEY = 'bizet_os_project_id';
const MANUAL_STEPS = [
  { key: 'lengthMm', path: 'room.geometry.wall_length', ru: 'Какова длина основной стены?', en: 'What is the main wall length?', helpRu: 'Введите фактический размер стены A.', helpEn: 'Enter the actual length of wall A.' },
  { key: 'widthMm', path: 'room.geometry.wall_depth', ru: 'Какова глубина помещения?', en: 'What is the room depth?', helpRu: 'Расстояние от стены A до противоположной стены.', helpEn: 'Distance from wall A to the opposite wall.' },
  { key: 'heightMm', path: 'room.geometry.room_height', ru: 'Какова высота помещения?', en: 'What is the room height?', helpRu: 'Введите высоту от чистого пола до потолка.', helpEn: 'Enter the height from finished floor to ceiling.' },
];

let manualProject = null;
let manualIndex = 0;
let manualValues = { lengthMm: 6000, widthMm: 4200, heightMm: 2800 };

function pilotRu() {
  return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru') === 'ru';
}

function pilotProjectId() {
  const fromUrl = new URLSearchParams(window.location.search).get('project');
  const id = fromUrl || window.BIZET_PROJECT_ID || sessionStorage.getItem(PILOT_PROJECT_KEY) || localStorage.getItem(PILOT_PROJECT_KEY);
  if (id) {
    sessionStorage.setItem(PILOT_PROJECT_KEY, id);
    localStorage.setItem(PILOT_PROJECT_KEY, id);
    window.BIZET_PROJECT_ID = id;
  }
  return id;
}

async function pilotRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try { const payload = await response.json(); detail = payload.detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  return response.json();
}

async function loadPilotProject() {
  const id = pilotProjectId();
  if (!id) return null;
  manualProject = await pilotRequest(`/api/v1.1/projects/${id}`);
  const geometry = manualProject?.room?.geometry || {};
  manualValues = {
    lengthMm: geometry.wall_length?.value_mm || 6000,
    widthMm: geometry.wall_depth?.value_mm || 4200,
    heightMm: geometry.room_height?.value_mm || 2800,
  };
  return manualProject;
}

async function pilotPatch(path, value, extra = {}) {
  const id = pilotProjectId();
  if (!id) throw new Error(pilotRu() ? 'Текущий проект не найден.' : 'Current project was not found.');
  const result = await pilotRequest(`/api/v1.1/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ path, value, ...extra }),
  });
  manualProject = result.project || result;
  return manualProject;
}

function disableScanUi() {
  const toolbar = document.getElementById('scanButton');
  if (toolbar) {
    toolbar.disabled = true;
    toolbar.setAttribute('aria-disabled', 'true');
    toolbar.title = pilotRu() ? 'Скан временно отключён в этом пилоте' : 'Scan is temporarily disabled in this pilot';
  }
  const toolbarLabel = document.getElementById('scanButtonLabel');
  if (toolbarLabel) toolbarLabel.textContent = pilotRu() ? 'Скан · позже' : 'Scan · later';

  const layer = document.getElementById('geometryInputQuestion');
  if (layer) {
    const scan = layer.querySelector('#initialScanChoose');
    const manual = layer.querySelector('#manualGeometryPath');
    const title = layer.querySelector('h2');
    const copy = layer.querySelector('.scan-question-panel > p:not(.scan-question-kicker):not(.scan-question-status)');
    if (scan) {
      scan.disabled = true;
      scan.textContent = pilotRu() ? 'Скан · позже' : 'Scan · later';
      scan.classList.remove('scan-question-primary');
      scan.classList.add('scan-question-secondary');
    }
    if (manual) {
      manual.classList.remove('scan-question-secondary');
      manual.classList.add('scan-question-primary');
      manual.textContent = pilotRu() ? 'Ввести размеры вручную' : 'Enter dimensions manually';
    }
    if (title) title.textContent = pilotRu() ? 'Как введём геометрию помещения?' : 'How should we enter the room geometry?';
    if (copy) copy.textContent = pilotRu() ? 'В этом пилоте настраиваем ручной ввод. Скан временно не используется.' : 'This pilot focuses on manual input. Scan is temporarily unavailable.';
    layer.querySelector('#initialScanFileInput')?.remove();
  }
  document.getElementById('scanContourConfirmation')?.remove();
}

function manualLayer() {
  return document.getElementById('manualGeometryLayer');
}

function renderManualStep() {
  const layer = manualLayer();
  if (!layer) return;
  const step = MANUAL_STEPS[manualIndex];
  const input = layer.querySelector('#manualGeometryValue');
  layer.querySelector('#manualGeometryKicker').textContent = `${pilotRu() ? 'Ручной ввод' : 'Manual input'} · ${manualIndex + 1}/${MANUAL_STEPS.length}`;
  layer.querySelector('#manualGeometryTitle').textContent = pilotRu() ? step.ru : step.en;
  layer.querySelector('#manualGeometryHelp').textContent = pilotRu() ? step.helpRu : step.helpEn;
  input.value = String(manualValues[step.key] || '');
  layer.querySelector('#manualGeometryNext').textContent = manualIndex === MANUAL_STEPS.length - 1
    ? (pilotRu() ? 'Сохранить геометрию' : 'Save geometry')
    : (pilotRu() ? 'Сохранить и дальше' : 'Save and continue');
  layer.querySelector('#manualGeometryBack').textContent = manualIndex === 0 ? (pilotRu() ? 'Отмена' : 'Cancel') : (pilotRu() ? 'Назад' : 'Back');
  layer.querySelector('#manualGeometryError').textContent = '';
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

async function startManualWizard() {
  document.getElementById('geometryInputQuestion')?.remove();
  document.getElementById('scanContourConfirmation')?.remove();
  if (manualLayer()) return;
  try { await loadPilotProject(); } catch (_) {}
  manualIndex = 0;
  const viewport = document.querySelector('.viewport-card');
  if (!viewport) return;
  const layer = document.createElement('div');
  layer.id = 'manualGeometryLayer';
  layer.className = 'manual-geometry-layer';
  layer.innerHTML = `
    <div class="manual-geometry-card">
      <p class="manual-geometry-kicker" id="manualGeometryKicker"></p>
      <h2 id="manualGeometryTitle"></h2>
      <p class="manual-geometry-help" id="manualGeometryHelp"></p>
      <label class="manual-geometry-input-wrap">
        <input id="manualGeometryValue" type="number" min="100" max="50000" step="1" inputmode="numeric" autocomplete="off" />
        <span>mm</span>
      </label>
      <div class="manual-geometry-actions">
        <button class="manual-geometry-back" id="manualGeometryBack" type="button"></button>
        <button class="manual-geometry-next" id="manualGeometryNext" type="button"></button>
      </div>
      <p class="manual-geometry-error" id="manualGeometryError"></p>
    </div>`;
  viewport.appendChild(layer);

  layer.querySelector('#manualGeometryBack').addEventListener('click', () => {
    if (manualIndex > 0) {
      manualIndex -= 1;
      renderManualStep();
      return;
    }
    const id = pilotProjectId();
    window.location.assign(`/room${id ? `?project=${encodeURIComponent(id)}` : ''}`);
  });

  const saveCurrent = async () => {
    const button = layer.querySelector('#manualGeometryNext');
    const errorNode = layer.querySelector('#manualGeometryError');
    const input = layer.querySelector('#manualGeometryValue');
    const value = Math.round(Number(input.value));
    if (!Number.isFinite(value) || value < 100 || value > 50000) {
      errorNode.textContent = pilotRu() ? 'Введите корректный размер в миллиметрах.' : 'Enter a valid dimension in millimetres.';
      return;
    }
    button.disabled = true;
    errorNode.textContent = '';
    const step = MANUAL_STEPS[manualIndex];
    try {
      manualValues[step.key] = value;
      await pilotPatch(step.path, value, { source: 'USER', confirmed: true, reason: 'Manual geometry pilot' });
      if (manualIndex < MANUAL_STEPS.length - 1) {
        manualIndex += 1;
        renderManualStep();
        return;
      }
      await pilotPatch('scene.visual_settings.geometry_input_mode', 'MANUAL', { reason: 'Manual room geometry completed' });
      await pilotPatch('scene.visual_settings.manual_geometry_complete', true, { reason: 'Manual room geometry completed' });
      const id = pilotProjectId();
      window.location.replace(`/room?project=${encodeURIComponent(id)}&manual=done`);
    } catch (error) {
      errorNode.textContent = error.message || String(error);
      button.disabled = false;
    }
  };
  layer.querySelector('#manualGeometryNext').addEventListener('click', saveCurrent);
  layer.querySelector('#manualGeometryValue').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); saveCurrent(); }
  });
  renderManualStep();
}

function showManualReadyNote() {
  if (document.getElementById('manualReadyNote')) return;
  const viewport = document.querySelector('.viewport-card');
  if (!viewport) return;
  const note = document.createElement('div');
  note.id = 'manualReadyNote';
  note.className = 'manual-ready-note';
  note.textContent = pilotRu() ? 'Размеры помещения введены вручную. Теперь выберите тип потолка.' : 'Room dimensions were entered manually. Now choose the ceiling type.';
  viewport.appendChild(note);
}

async function routeToCommunications() {
  try {
    const project = await loadPilotProject();
    if (!project || project?.scene?.visual_settings?.geometry_input_mode !== 'MANUAL') {
      await startManualWizard();
      return;
    }
    if (!project?.room?.ceiling?.type) {
      const note = document.getElementById('manualReadyNote');
      if (note) note.textContent = pilotRu() ? 'Перед продолжением выберите тип потолка.' : 'Choose the ceiling type before continuing.';
      document.getElementById('ceilingButton')?.click();
      return;
    }
    const id = pilotProjectId();
    window.location.assign(`/room-elements?step=communications&project=${encodeURIComponent(id)}`);
  } catch (error) {
    const banner = document.getElementById('errorBanner');
    if (banner) {
      banner.textContent = error.message || String(error);
      banner.hidden = false;
    }
  }
}

document.addEventListener('click', event => {
  if (event.target.closest('#initialScanChoose') || event.target.closest('#scanButton')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    disableScanUi();
    return;
  }
  if (event.target.closest('#manualGeometryPath')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    startManualWizard();
    return;
  }
  if (event.target.closest('#startMeasurementButton')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    routeToCommunications();
  }
}, true);

const observer = new MutationObserver(() => disableScanUi());
observer.observe(document.documentElement, { childList: true, subtree: true });

disableScanUi();
loadPilotProject().then(project => {
  if (project?.scene?.visual_settings?.geometry_input_mode === 'MANUAL') showManualReadyNote();
}).catch(() => {});

document.getElementById('languageSelect')?.addEventListener('change', () => {
  setTimeout(() => {
    disableScanUi();
    if (manualLayer()) renderManualStep();
    const note = document.getElementById('manualReadyNote');
    if (note) note.textContent = pilotRu() ? 'Размеры помещения введены вручную. Теперь выберите тип потолка.' : 'Room dimensions were entered manually. Now choose the ceiling type.';
  }, 0);
});
