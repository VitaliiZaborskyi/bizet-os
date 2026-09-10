const PILOT_PROJECT_KEY = 'bizet_os_project_id';
const MANUAL_STEPS = [
  { key: 'lengthMm', path: 'room.geometry.wall_length', labelRu: 'Длина основной стены', labelEn: 'Main wall length', helpRu: 'Введите фактический размер стены A.', helpEn: 'Enter the actual length of wall A.' },
  { key: 'widthMm', path: 'room.geometry.wall_depth', labelRu: 'Глубина помещения', labelEn: 'Room depth', helpRu: 'Расстояние от стены A до противоположной стены.', helpEn: 'Distance from wall A to the opposite wall.' },
  { key: 'heightMm', path: 'room.geometry.room_height', labelRu: 'Высота помещения', labelEn: 'Room height', helpRu: 'Введите высоту от чистого пола до потолка.', helpEn: 'Enter the height from finished floor to ceiling.' },
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

function safeErrorDetail(payload, fallback) {
  const detail = payload?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    if (typeof first?.msg === 'string') return first.msg;
  }
  return fallback;
}

async function pilotRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const fallback = pilotRu() ? 'Не удалось сохранить данные. Повторите попытку.' : 'Could not save the data. Please try again.';
    let message = fallback;
    try { message = safeErrorDetail(await response.json(), fallback); } catch (_) {}
    throw new Error(message);
  }
  return response.json();
}

async function loadPilotProject() {
  const id = pilotProjectId();
  if (!id) throw new Error(pilotRu() ? 'Текущий проект не найден. Вернитесь к выбору конфигурации.' : 'Current project was not found. Return to configuration selection.');
  manualProject = await pilotRequest(`/api/v1.1/projects/${encodeURIComponent(id)}`);
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
  if (!id) throw new Error(pilotRu() ? 'Текущий проект не найден. Вернитесь к выбору конфигурации.' : 'Current project was not found. Return to configuration selection.');
  const result = await pilotRequest(`/api/v1.1/projects/${encodeURIComponent(id)}`, {
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
    toolbar.title = pilotRu() ? 'Скан будет доступен позже' : 'Scan will be available later';
  }
  const toolbarLabel = document.getElementById('scanButtonLabel');
  if (toolbarLabel) toolbarLabel.textContent = pilotRu() ? 'Скан · позже' : 'Scan · later';
  document.getElementById('geometryInputQuestion')?.remove();
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
  layer.querySelector('#manualGeometryTitle').textContent = pilotRu() ? 'Укажите размеры помещения' : 'Enter the room dimensions';
  layer.querySelector('#manualGeometryQuestion').textContent = pilotRu() ? step.labelRu : step.labelEn;
  layer.querySelector('#manualGeometryHelp').textContent = pilotRu() ? step.helpRu : step.helpEn;
  input.value = String(manualValues[step.key] || '');
  layer.querySelector('#manualGeometryNext').textContent = manualIndex === MANUAL_STEPS.length - 1
    ? (pilotRu() ? 'Сохранить и продолжить' : 'Save and continue')
    : (pilotRu() ? 'Сохранить и дальше' : 'Save and continue');
  layer.querySelector('#manualGeometryBack').textContent = manualIndex === 0 ? (pilotRu() ? 'Назад' : 'Back') : (pilotRu() ? 'Предыдущий размер' : 'Previous dimension');
  layer.querySelector('#manualGeometryError').textContent = '';
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

async function startManualWizard() {
  disableScanUi();
  document.body.classList.add('manual-room-active');
  if (manualLayer()) return;

  try {
    await loadPilotProject();
  } catch (error) {
    const banner = document.getElementById('errorBanner');
    if (banner) {
      banner.textContent = error?.message || (pilotRu() ? 'Не удалось открыть проект.' : 'Could not open the project.');
      banner.hidden = false;
    }
    return;
  }

  manualIndex = 0;
  const viewport = document.querySelector('.viewport-card');
  if (!viewport) return;
  const layer = document.createElement('div');
  layer.id = 'manualGeometryLayer';
  layer.className = 'manual-geometry-layer';
  layer.innerHTML = `
    <div class="manual-geometry-card">
      <h2 id="manualGeometryTitle"></h2>
      <strong class="manual-geometry-question" id="manualGeometryQuestion"></strong>
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
    window.location.assign(`/${id ? `?project=${encodeURIComponent(id)}` : ''}`);
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
      await pilotPatch(step.path, value, { source: 'USER_CONFIRMED', confirmed: true, reason: 'Manual geometry pilot' });
      if (manualIndex < MANUAL_STEPS.length - 1) {
        manualIndex += 1;
        renderManualStep();
        return;
      }
      await pilotPatch('scene.visual_settings.geometry_input_mode', 'MANUAL', { reason: 'Manual room geometry completed' });
      await pilotPatch('scene.visual_settings.manual_geometry_complete', true, { reason: 'Manual room geometry completed' });
      const id = pilotProjectId();
      window.location.assign(`/room-elements?step=communications&project=${encodeURIComponent(id)}`);
    } catch (error) {
      errorNode.textContent = error?.message || (pilotRu() ? 'Не удалось сохранить размер. Повторите попытку.' : 'Could not save the dimension. Please try again.');
      button.disabled = false;
    }
  };

  layer.querySelector('#manualGeometryNext').addEventListener('click', saveCurrent);
  layer.querySelector('#manualGeometryValue').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveCurrent();
    }
  });
  renderManualStep();
}

document.addEventListener('click', event => {
  if (event.target.closest('#scanButton') || event.target.closest('#initialScanChoose')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    disableScanUi();
  }
}, true);

document.getElementById('languageSelect')?.addEventListener('change', () => {
  setTimeout(() => {
    disableScanUi();
    if (manualLayer()) renderManualStep();
  }, 0);
});

disableScanUi();
startManualWizard();
