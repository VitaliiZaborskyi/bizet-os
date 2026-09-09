const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'bizet_os_project_id';
const THEME_KEY = 'bizet_os_theme';
const LANGUAGE_KEY = 'bizet_os_language';
const FEEDBACK_KEY = 'bizet_os_pilot_feedback';

const STEPS = [
  {
    field: 'object_type',
    actionId: 'SELECT_OBJECT_TYPE',
    title: { ru: 'Где находится ваш будущий интерьер?', en: 'Where is your future interior located?' },
    subtitle: { ru: 'Выберите тип объекта. Это поможет BIZET OS правильно выстроить дальнейший маршрут.', en: 'Choose the property type so BIZET OS can build the right route.' },
    options: [
      {
        value: 'NEW_BUILD',
        title: { ru: 'Новострой', en: 'New build' },
        image: 'https://images.unsplash.com/photo-1781512436292-f2687f67f605?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#d9dde2,#7f8790)'
      },
      {
        value: 'OLD_STOCK',
        title: { ru: 'Старый фонд', en: 'Historic building' },
        image: 'https://images.unsplash.com/photo-1778222014071-9234e2a36472?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#c8b7a5,#66574b)'
      },
      {
        value: 'PRIVATE_HOUSE',
        title: { ru: 'Частный дом', en: 'Private house' },
        image: 'https://images.unsplash.com/photo-1704019389380-de15b712656b?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#d7d0c4,#857764)'
      },
      {
        value: 'COMMERCIAL',
        title: { ru: 'Коммерческое помещение', en: 'Commercial space' },
        image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#c6c4bf,#6b6b69)'
      },
    ],
  },
  {
    field: 'product_type',
    actionId: 'SELECT_PRODUCT_TYPE',
    title: { ru: 'Выберите зону', en: 'Choose a zone' },
    subtitle: { ru: 'Сначала определяем зону объекта. Конкретные изделия внутри неё BIZET OS будет уточнять дальше.', en: 'First choose the zone. BIZET OS will define the specific furniture inside it later.' },
    options: [
      {
        value: 'ZONE_KITCHEN',
        title: { ru: 'Кухня', en: 'Kitchen' },
        image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#d8d1c7,#8f806e)'
      },
      {
        value: 'ZONE_BEDROOM',
        title: { ru: 'Спальная', en: 'Bedroom' },
        image: 'https://images.unsplash.com/photo-1748679979588-dfd926667927?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#d4c6b5,#766553)'
      },
      {
        value: 'ZONE_LIVING_ROOM',
        title: { ru: 'Гостиная', en: 'Living room' },
        image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#d8d2ca,#847a70)'
      },
      {
        value: 'ZONE_WARDROBE',
        title: { ru: 'Гардеробная', en: 'Wardrobe' },
        image: 'https://images.unsplash.com/photo-1778731660303-1fa5ede75477?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#c9c1b8,#6e6359)'
      },
      {
        value: 'ZONE_OTHER',
        title: { ru: 'Другое', en: 'Other' },
        image: 'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1400&q=82',
        fallback: 'linear-gradient(145deg,#d9d8d4,#7d7c78)'
      },
    ],
  },
  {
    field: 'complexity_category',
    actionId: 'SELECT_COMPLEXITY_CATEGORY',
    title: { ru: 'Выберите уровень комплектации', en: 'Choose the configuration level' },
    subtitle: { ru: 'Сравните один и тот же образ изделия — от более простого исполнения к более насыщенному.', en: 'Compare the same product image from a simpler to a richer level.' },
    options: [
      { value: 'I', title: { ru: 'I', en: 'I' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(1.14) saturate(.58) contrast(.88)', fallback: 'linear-gradient(145deg,#e2ddd5,#a89e91)' },
      { value: 'II', title: { ru: 'II', en: 'II' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(1.08) saturate(.76) contrast(.94)', fallback: 'linear-gradient(145deg,#d8d0c7,#8c7e70)' },
      { value: 'III', title: { ru: 'III', en: 'III' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(1.00) saturate(.94) contrast(1.00)', fallback: 'linear-gradient(145deg,#c9c1b8,#6e6359)' },
      { value: 'IV', title: { ru: 'IV', en: 'IV' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(.92) saturate(1.05) contrast(1.08)', fallback: 'linear-gradient(145deg,#c6bdae,#65594d)' },
      { value: 'V', title: { ru: 'V', en: 'V' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(.83) saturate(1.16) contrast(1.16)', fallback: 'linear-gradient(145deg,#b9afa3,#4d4540)' },
    ],
  },
  {
    field: 'visual_direction',
    actionId: 'SELECT_VISUAL_DIRECTION',
    title: { ru: 'Какое оформление вам ближе?', en: 'Which styling feels closer to you?' },
    subtitle: { ru: 'Это не выбор конкретного цвета — только общее оформление проекта.', en: 'This is not a specific color choice, only the overall styling of the project.' },
    options: [
      { value: 'LIGHT', title: { ru: 'Light', en: 'Light' }, image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=82', fallback: 'linear-gradient(145deg,#f0ece4,#c9c0b4)' },
      { value: 'DARK', title: { ru: 'Dark', en: 'Dark' }, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=82', fallback: 'linear-gradient(145deg,#65615e,#242322)' },
      { value: 'OTHER', title: { ru: 'Другое', en: 'Other' }, image: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1400&q=82', fallback: 'linear-gradient(145deg,#c7c4bd,#74716b)' },
    ],
  },
];

const COMMERCIAL_ZONE_STEP = {
  title: { ru: 'Коммерческий сценарий', en: 'Commercial scenario' },
  subtitle: { ru: 'Коммерческие зоны будут проработаны отдельной веткой. Сейчас сохраняем этот выбор без выдумывания неподтверждённых сценариев.', en: 'Commercial zones will be designed as a separate branch. For now we preserve the choice without inventing unconfirmed scenarios.' },
  options: [
    {
      value: 'COMMERCIAL_ZONE_PENDING',
      title: { ru: 'Продолжить', en: 'Continue' },
      note: { ru: 'Отдельная коммерческая ветка — позже', en: 'Dedicated commercial branch — later' },
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=82',
      fallback: 'linear-gradient(145deg,#c6c4bf,#6b6b69)'
    },
  ],
};

const STATIC_COPY = {
  ru: {
    settings: 'Настройки', theme: 'Тема', light: 'Светлая', dark: 'Тёмная', language: 'Язык', login: 'Войти', register: 'Регистрация',
    feedback: 'Обратная связь', tutorial: 'Как пользоваться системой',
    step: 'Шаг', of: 'из', summaryTitle: 'Ваш выбор', continue: 'Детали вашего помещения',
    legacy: 'Технический стенд', authPending: 'Вход и регистрация будут подключены отдельным слоем аккаунта. Гостевой режим остаётся доступным.',
    feedbackTitle: 'Обратная связь', feedbackCopy: 'Опишите вопрос, идею или замечание. Канал отправки будет подключён после утверждения интерфейса.',
    feedbackPlaceholder: 'Ваше сообщение', feedbackSubmit: 'Сохранить для пилота', feedbackSaved: 'Сообщение сохранено в этом браузере для текущего пилота.',
    tutorialTitle: 'Как пользоваться системой', tutorialCopy: 'Здесь будет запускаться видеоинструкция. Видео подключим после утверждения сценария.',
    roomDetailsPending: 'Следующий экран — детали помещения. Его подключим в следующем слое BIZET OS.',
    changeSelection: 'Изменить', saveError: 'Не удалось сохранить выбор', loadErrorTitle: 'Не удалось открыть проект', loadErrorSubtitle: 'Проверьте подключение к BIZET OS и повторите попытку.'
  },
  en: {
    settings: 'Settings', theme: 'Theme', light: 'Light', dark: 'Dark', language: 'Language', login: 'Sign in', register: 'Register',
    feedback: 'Feedback', tutorial: 'How to use the system',
    step: 'Step', of: 'of', summaryTitle: 'Your choices', continue: 'Your room details',
    legacy: 'Technical stand', authPending: 'Sign in and registration will be connected as a separate account layer. Guest mode remains available.',
    feedbackTitle: 'Feedback', feedbackCopy: 'Describe a question, idea, or issue. The sending channel will be connected after the interface is approved.',
    feedbackPlaceholder: 'Your message', feedbackSubmit: 'Save for pilot', feedbackSaved: 'The message has been saved in this browser for the current pilot.',
    tutorialTitle: 'How to use the system', tutorialCopy: 'The video guide will launch here. We will connect the video after the script is approved.',
    roomDetailsPending: 'The next screen is room details. It will be connected in the next BIZET OS layer.',
    changeSelection: 'Change', saveError: 'Could not save the selection', loadErrorTitle: 'Could not open the project', loadErrorSubtitle: 'Check the BIZET OS connection and try again.'
  }
};

const LABELS = {
  object_type: {
    NEW_BUILD: { ru: 'Новострой', en: 'New build' }, OLD_STOCK: { ru: 'Старый фонд', en: 'Historic building' },
    PRIVATE_HOUSE: { ru: 'Частный дом', en: 'Private house' }, COMMERCIAL: { ru: 'Коммерция', en: 'Commercial' }
  },
  product_type: {
    ZONE_KITCHEN: { ru: 'Кухня', en: 'Kitchen' }, ZONE_BEDROOM: { ru: 'Спальная', en: 'Bedroom' },
    ZONE_LIVING_ROOM: { ru: 'Гостиная', en: 'Living room' }, ZONE_WARDROBE: { ru: 'Гардеробная', en: 'Wardrobe' },
    ZONE_OTHER: { ru: 'Другое', en: 'Other' }, COMMERCIAL_ZONE_PENDING: { ru: 'Коммерческая зона', en: 'Commercial zone' },
    KITCHEN: { ru: 'Кухня', en: 'Kitchen' }, WARDROBE: { ru: 'Гардеробная', en: 'Wardrobe' }, CABINET: { ru: 'Корпусное изделие', en: 'Cabinet' },
    LIVING_ROOM: { ru: 'Гостиная', en: 'Living room' }, OTHER: { ru: 'Другое', en: 'Other' }
  },
  complexity_category: { I: { ru: 'Категория I', en: 'Category I' }, II: { ru: 'Категория II', en: 'Category II' }, III: { ru: 'Категория III', en: 'Category III' }, IV: { ru: 'Категория IV', en: 'Category IV' }, V: { ru: 'Категория V', en: 'Category V' } },
  visual_direction: { LIGHT: { ru: 'Light', en: 'Light' }, DARK: { ru: 'Dark', en: 'Dark' }, OTHER: { ru: 'Другое', en: 'Other' } },
};

let project = null;
let currentStep = 0;
let busy = false;
let editingFromSummary = false;
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'ru';
let currentTheme = localStorage.getItem(THEME_KEY) || 'light';
let toastTimer = null;

function t(value) {
  if (typeof value === 'string') return value;
  return value?.[currentLanguage] || value?.ru || '';
}

function copy(key) {
  return STATIC_COPY[currentLanguage]?.[key] || STATIC_COPY.ru[key] || key;
}

function showError(message) {
  const el = $('errorBanner');
  el.textContent = message;
  el.hidden = !message;
}

function showToast(message) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
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

function activeStepDefinition() {
  const step = STEPS[currentStep];
  if (currentStep === 1 && project.context?.object_type === 'COMMERCIAL') {
    return { ...step, title: COMMERCIAL_ZONE_STEP.title, subtitle: COMMERCIAL_ZONE_STEP.subtitle, options: COMMERCIAL_ZONE_STEP.options };
  }
  return step;
}

function renderStep() {
  showError('');
  $('summaryCard').hidden = true;
  $('introBlock').hidden = false;
  $('choiceGrid').hidden = false;

  const step = activeStepDefinition();
  $('stepMeta').textContent = `${copy('step')} ${currentStep + 1} ${copy('of')} ${STEPS.length}`;
  $('stepTitle').textContent = t(step.title);
  $('stepSubtitle').textContent = t(step.subtitle);
  renderProgress(currentStep);

  // There is intentionally no back arrow on the very first question.
  $('backButton').hidden = currentStep === 0;

  const selected = project.context?.[step.field];
  const grid = $('choiceGrid');
  grid.dataset.count = String(step.options.length);
  grid.dataset.kind = step.field;
  grid.innerHTML = step.options.map((option) => {
    const image = option.image ? `url("${option.image}")` : 'none';
    const fallback = option.fallback || 'linear-gradient(145deg,#ddd,#777)';
    const selectedClass = option.value === selected ? ' selected' : '';
    const variantFilter = option.variantFilter || 'none';
    const kicker = option.kicker ? `<span class="card-kicker">${t(option.kicker)}</span>` : '';
    const note = option.note ? `<span class="card-note">${t(option.note)}</span>` : '';
    return `<button class="choice-card${selectedClass}" type="button" data-value="${option.value}" data-variant="${option.value}" style='--card-image:${image};--card-fallback:${fallback};--variant-filter:${variantFilter}'>
      <span class="card-content">
        ${kicker}
        <span class="card-title">${t(option.title)}</span>
        ${note}
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

    if (editingFromSummary) {
      editingFromSummary = false;
      currentStep = STEPS.length;
      await renderSummary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep < STEPS.length - 1) {
      currentStep += 1;
      renderStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      currentStep = STEPS.length;
      await renderSummary();
    }
  } catch (error) {
    showError(`${copy('saveError')}: ${error.message}`);
  } finally {
    busy = false;
  }
}

async function editSummaryStep(index) {
  if (busy || index < 0 || index >= STEPS.length) return;
  busy = true;
  showError('');
  const step = STEPS[index];
  try {
    const result = await request(`/api/v1.1/projects/${project.identity.internal_id}/quest/actions/${step.actionId}/reopen`, {
      method: 'POST',
    });
    project = result.project;
    editingFromSummary = true;
    currentStep = index;
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(`${copy('saveError')}: ${error.message}`);
  } finally {
    busy = false;
  }
}

async function renderSummary() {
  $('introBlock').hidden = true;
  $('choiceGrid').hidden = true;
  $('backButton').hidden = false;
  $('summaryCard').hidden = false;
  $('summaryTitle').textContent = copy('summaryTitle');
  $('continueLabel').textContent = copy('continue');

  const fields = STEPS.map((step) => step.field);
  $('summaryValues').innerHTML = fields.map((field, index) => {
    const value = project.context?.[field];
    const label = t(LABELS[field]?.[value]) || value || '—';
    return `<button class="summary-chip" type="button" data-step-index="${index}" aria-label="${copy('changeSelection')}: ${label}">${label}</button>`;
  }).join('');

  $('summaryValues').querySelectorAll('.summary-chip').forEach((button) => {
    button.addEventListener('click', () => editSummaryStep(Number(button.dataset.stepIndex)));
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = currentTheme;
  $('themeSelect').value = currentTheme;
  localStorage.setItem(THEME_KEY, currentTheme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', currentTheme === 'dark' ? '#171716' : '#f5f4f1');
}

function applyStaticLanguage() {
  document.documentElement.lang = currentLanguage;
  $('settingsTitle').textContent = copy('settings');
  $('themeLabel').textContent = copy('theme');
  $('languageLabel').textContent = copy('language');
  $('feedbackButton').textContent = copy('feedback');
  $('tutorialButton').textContent = copy('tutorial');
  $('loginButton').textContent = copy('login');
  $('registerButton').textContent = copy('register');
  $('legacyLink').textContent = copy('legacy');
  $('themeSelect').options[0].textContent = copy('light');
  $('themeSelect').options[1].textContent = copy('dark');
  $('languageSelect').value = currentLanguage;
  $('feedbackTitle').textContent = copy('feedbackTitle');
  $('feedbackCopy').textContent = copy('feedbackCopy');
  $('feedbackMessage').placeholder = copy('feedbackPlaceholder');
  $('feedbackSubmit').textContent = copy('feedbackSubmit');
  $('tutorialTitle').textContent = copy('tutorialTitle');
  $('tutorialCopy').textContent = copy('tutorialCopy');
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
}

function closeSettings() {
  $('settingsPanel').hidden = true;
  $('settingsButton').setAttribute('aria-expanded', 'false');
}

function openDialog(dialog) {
  closeSettings();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

$('settingsButton').addEventListener('click', (event) => {
  event.stopPropagation();
  const willOpen = $('settingsPanel').hidden;
  $('settingsPanel').hidden = !willOpen;
  $('settingsButton').setAttribute('aria-expanded', String(willOpen));
});
$('settingsPanel').addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', closeSettings);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSettings(); });

$('themeSelect').addEventListener('change', (event) => {
  currentTheme = event.target.value;
  applyTheme();
});

$('languageSelect').addEventListener('change', async (event) => {
  currentLanguage = event.target.value;
  applyStaticLanguage();
  $('settingsNotice').hidden = true;
  if (currentStep >= STEPS.length) await renderSummary();
  else renderStep();
});

[$('loginButton'), $('registerButton')].forEach((button) => {
  button.addEventListener('click', () => {
    $('settingsNotice').textContent = copy('authPending');
    $('settingsNotice').hidden = false;
  });
});

$('feedbackButton').addEventListener('click', () => {
  $('feedbackStatus').hidden = true;
  $('feedbackMessage').value = localStorage.getItem(FEEDBACK_KEY) || '';
  openDialog($('feedbackDialog'));
});
$('tutorialButton').addEventListener('click', () => openDialog($('tutorialDialog')));
$('feedbackClose').addEventListener('click', () => closeDialog($('feedbackDialog')));
$('tutorialClose').addEventListener('click', () => closeDialog($('tutorialDialog')));

$('feedbackSubmit').addEventListener('click', () => {
  localStorage.setItem(FEEDBACK_KEY, $('feedbackMessage').value.trim());
  $('feedbackStatus').textContent = copy('feedbackSaved');
  $('feedbackStatus').hidden = false;
});

[$('feedbackDialog'), $('tutorialDialog')].forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

$('backButton').addEventListener('click', () => {
  editingFromSummary = false;
  if (currentStep >= STEPS.length) currentStep = STEPS.length - 1;
  else currentStep = Math.max(0, currentStep - 1);
  renderStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

$('continueButton').addEventListener('click', () => {
  showToast(copy('roomDetailsPending'));
});

(async function init() {
  applyTheme();
  applyStaticLanguage();
  try {
    await loadProject();
    currentStep = firstIncompleteStep();
    if (currentStep >= STEPS.length) await renderSummary();
    else renderStep();
  } catch (error) {
    $('stepTitle').textContent = copy('loadErrorTitle');
    $('stepSubtitle').textContent = copy('loadErrorSubtitle');
    $('choiceGrid').innerHTML = '';
    showError(error.message);
  }
})();
