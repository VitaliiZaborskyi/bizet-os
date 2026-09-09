const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'bizet_os_project_id';
const START_ACTIONS = [
  'SELECT_OBJECT_TYPE',
  'SELECT_PRODUCT_TYPE',
  'SELECT_COMPLEXITY_CATEGORY',
  'SELECT_VISUAL_DIRECTION',
];

const STEPS = [
  {
    field: 'object_type',
    actionId: 'SELECT_OBJECT_TYPE',
    title: 'Где находится ваш будущий интерьер?',
    subtitle: 'Выберите тип объекта. Это поможет BIZET OS правильно выстроить дальнейший маршрут.',
    options: [
      { value: 'NEW_BUILD', title: 'Новострой', kicker: 'Тип объекта', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#d9dde2,#7f8790)' },
      { value: 'OLD_STOCK', title: 'Старый фонд', kicker: 'Тип объекта', image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#b5a89c,#5f554d)' },
      { value: 'PRIVATE_HOUSE', title: 'Частный дом', kicker: 'Тип объекта', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#d7d0c4,#857764)' },
      { value: 'COMMERCIAL', title: 'Коммерческое помещение', kicker: 'Тип объекта', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#c6c4bf,#6b6b69)' },
    ],
  },
  {
    field: 'product_type',
    actionId: 'SELECT_PRODUCT_TYPE',
    title: 'Что проектируем?',
    subtitle: 'Один выбор — и система продолжит уже в контексте конкретного типа мебели.',
    options: [
      { value: 'KITCHEN', title: 'Кухня', kicker: 'Изделие', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#d8d1c7,#8f806e)' },
      { value: 'WARDROBE', title: 'Шкаф', kicker: 'Изделие', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#d4c6b5,#766553)' },
      { value: 'CABINET', title: 'Тумба', kicker: 'Изделие', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#cbc5bc,#76716a)' },
      { value: 'LIVING_ROOM', title: 'Гостиная', kicker: 'Изделие', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#d8d2ca,#847a70)' },
      { value: 'OTHER', title: 'Другое', kicker: 'Изделие', note: 'Отдельный сценарий', image: 'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#d9d8d4,#7d7c78)' },
    ],
  },
  {
    field: 'complexity_category',
    actionId: 'SELECT_COMPLEXITY_CATEGORY',
    title: 'Выберите уровень комплектации',
    subtitle: 'Сейчас фиксируем только уровень. Точные материалы, фурнитура и производственные правила будут определяться данными BIZET OS на следующих этапах.',
    options: [
      { value: 'I', title: 'I', kicker: 'Категория', note: 'Уровень I', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=82', fallback: 'linear-gradient(145deg,#e2ddd5,#a89e91)' },
      { value: 'II', title: 'II', kicker: 'Категория', note: 'Уровень II', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=82', fallback: 'linear-gradient(145deg,#d8d0c7,#8c7e70)' },
      { value: 'III', title: 'III', kicker: 'Категория', note: 'Уровень III', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=82', fallback: 'linear-gradient(145deg,#c9c1b8,#6e6359)' },
      { value: 'IV', title: 'IV', kicker: 'Категория', note: 'Уровень IV', image: 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&w=1000&q=82', fallback: 'linear-gradient(145deg,#c6bdae,#65594d)' },
      { value: 'V', title: 'V', kicker: 'Категория', note: 'Уровень V', image: 'https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=1000&q=82', fallback: 'linear-gradient(145deg,#b9afa3,#4d4540)' },
    ],
  },
  {
    field: 'visual_direction',
    actionId: 'SELECT_VISUAL_DIRECTION',
    title: 'Какое направление вам ближе?',
    subtitle: 'Это не выбор конкретного цвета — только общее визуальное направление проекта.',
    options: [
      { value: 'LIGHT', title: 'Light', kicker: 'Направление', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#f0ece4,#c9c0b4)' },
      { value: 'DARK', title: 'Dark', kicker: 'Направление', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#65615e,#242322)' },
      { value: 'OTHER', title: 'Другое', kicker: 'Направление', note: 'Свой сценарий', image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=82', fallback: 'linear-gradient(145deg,#c7c4bd,#74716b)' },
    ],
  },
];

const LABELS = {
  object_type: { NEW_BUILD: 'Новострой', OLD_STOCK: 'Старый фонд', PRIVATE_HOUSE: 'Частный дом', COMMERCIAL: 'Коммерция' },
  product_type: { KITCHEN: 'Кухня', WARDROBE: 'Шкаф', CABINET: 'Тумба', LIVING_ROOM: 'Гостиная', OTHER: 'Другое' },
  complexity_category: { I: 'Категория I', II: 'Категория II', III: 'Категория III', IV: 'Категория IV', V: 'Категория V' },
  visual_direction: { LIGHT: 'Light', DARK: 'Dark', OTHER: 'Другое' },
};

let project = null;
let currentStep = 0;
let busy = false;

function showError(message) {
  const el = $('errorBanner');
  el.textContent = message;
  el.hidden = !message;
}

async function request(url, options = {}) {
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

async function createProject() {
  project = await request('/api/v1.1/projects', { method: 'POST', body: JSON.stringify({}) });
  sessionStorage.setItem(STORAGE_KEY, project.identity.internal_id);
}

async function loadProject() {
  const projectId = sessionStorage.getItem(STORAGE_KEY);
  if (!projectId) return createProject();
  try {
    project = await request(`/api/v1.1/projects/${projectId}`);
  } catch (_) {
    sessionStorage.removeItem(STORAGE_KEY);
    await createProject();
  }
}

function firstIncompleteStep() {
  const index = STEPS.findIndex((step) => !project.context?.[step.field]);
  return index === -1 ? STEPS.length : index;
}

function renderProgress(stepIndex) {
  $('progress').innerHTML = STEPS.map((_, i) => `<span class="progress-dot ${i === stepIndex ? 'active' : ''}"></span>`).join('');
}

function renderStep() {
  showError('');
  $('summaryCard').hidden = true;
  $('introBlock').hidden = false;
  $('choiceGrid').hidden = false;

  const step = STEPS[currentStep];
  $('stepMeta').textContent = `Шаг ${currentStep + 1} из ${STEPS.length}`;
  $('stepTitle').textContent = step.title;
  $('stepSubtitle').textContent = step.subtitle;
  renderProgress(currentStep);
  $('backButton').hidden = currentStep === 0;

  const selected = project.context?.[step.field];
  const grid = $('choiceGrid');
  grid.dataset.count = String(step.options.length);
  grid.innerHTML = step.options.map((option) => {
    const image = option.image ? `url("${option.image}")` : 'none';
    const fallback = option.fallback || 'linear-gradient(145deg,#ddd,#777)';
    const selectedClass = option.value === selected ? ' selected' : '';
    return `<button class="choice-card${selectedClass}" type="button" data-value="${option.value}" style='--card-image:${image};--card-fallback:${fallback}'>
      <span class="card-content">
        <span class="card-kicker">${option.kicker || ''}</span>
        <span class="card-title">${option.title}</span>
        <span class="card-note">${option.note || ''}</span>
      </span>
    </button>`;
  }).join('');

  grid.querySelectorAll('.choice-card').forEach((button) => {
    button.addEventListener('click', () => choose(button.dataset.value));
  });
}

async function choose(value) {
  if (busy) return;
  busy = true;
  showError('');
  const step = STEPS[currentStep];
  try {
    const result = await request(`/api/v1.1/projects/${project.identity.internal_id}/quest/actions/${step.actionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer: value }),
    });
    project = result.project;
    if (currentStep < STEPS.length - 1) {
      currentStep += 1;
      renderStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      await renderSummary();
    }
  } catch (error) {
    showError(`Не удалось сохранить выбор: ${error.message}`);
  } finally {
    busy = false;
  }
}

async function renderSummary() {
  $('introBlock').hidden = true;
  $('choiceGrid').hidden = true;
  $('backButton').hidden = false;
  $('summaryCard').hidden = false;
  const fields = STEPS.map((step) => step.field);
  $('summaryValues').innerHTML = fields.map((field) => {
    const value = project.context?.[field];
    const label = LABELS[field]?.[value] || value || '—';
    return `<span class="summary-chip">${label}</span>`;
  }).join('');

  try {
    const decision = await request(`/api/v1.1/projects/${project.identity.internal_id}/quest/next`);
    const next = decision.next_action?.action_id;
    $('handoffNote').textContent = next === 'ASK_ROOM_WALL_LENGTH'
      ? 'Стартовый блок завершён. Adaptive Quest готов перейти к геометрии помещения.'
      : 'Стартовый блок завершён. Следующий этап определит Adaptive Quest.';
  } catch (_) {
    $('handoffNote').textContent = 'Стартовый блок завершён. Следующий слой BIZET OS — геометрия помещения.';
  }
}

$('backButton').addEventListener('click', () => {
  if (currentStep >= STEPS.length) currentStep = STEPS.length - 1;
  else currentStep = Math.max(0, currentStep - 1);
  renderStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

$('continueButton').addEventListener('click', () => {
  $('handoffNote').textContent = 'BUILD 1.1-C заканчивается здесь. Геометрия помещения будет открыта в BUILD 1.1-D / 1.1-E.';
});

(async function init() {
  try {
    await loadProject();
    currentStep = firstIncompleteStep();
    if (currentStep >= STEPS.length) await renderSummary();
    else renderStep();
  } catch (error) {
    $('stepTitle').textContent = 'Не удалось открыть проект';
    $('stepSubtitle').textContent = 'Проверьте подключение к BIZET OS и повторите попытку.';
    $('choiceGrid').innerHTML = '';
    showError(error.message);
  }
})();
