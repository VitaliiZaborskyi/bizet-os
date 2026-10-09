const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'bizet_os_project_id';
const THEME_KEY = 'bizet_os_theme';
const LANGUAGE_KEY = 'bizet_os_language';
const FEEDBACK_KEY = 'bizet_os_pilot_feedback';

const STEPS = [
  {
    field: 'object_type',
    actionId: 'SELECT_OBJECT_TYPE',
    title: { ru: 'Тип дома', en: 'Home type' },
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
        title: { ru: 'Шкафы', en: 'Wardrobes', ua: 'Шафи' },
        note: { ru: 'Tree Art · активно', en: 'Tree Art · active', ua: 'Tree Art · активно' },
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
      { value: 'II', disabled: true, note: {ru:'Недоступно в пилоте',en:'Disabled in pilot',ua:'Недоступно в пілоті'}, title: { ru: 'II', en: 'II' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(1.08) saturate(.76) contrast(.94)', fallback: 'linear-gradient(145deg,#d8d0c7,#8c7e70)' },
      { value: 'III', disabled: true, note: {ru:'Недоступно в пилоте',en:'Disabled in pilot',ua:'Недоступно в пілоті'}, title: { ru: 'III', en: 'III' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(1.00) saturate(.94) contrast(1.00)', fallback: 'linear-gradient(145deg,#c9c1b8,#6e6359)' },
      { value: 'IV', disabled: true, note: {ru:'Недоступно в пилоте',en:'Disabled in pilot',ua:'Недоступно в пілоті'}, title: { ru: 'IV', en: 'IV' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(.92) saturate(1.05) contrast(1.08)', fallback: 'linear-gradient(145deg,#c6bdae,#65594d)' },
      { value: 'V', disabled: true, note: {ru:'Недоступно в пилоте',en:'Disabled in pilot',ua:'Недоступно в пілоті'}, title: { ru: 'Своя конфигурация', en: 'Custom configuration' }, image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82', variantFilter: 'brightness(.83) saturate(1.16) contrast(1.16)', fallback: 'linear-gradient(145deg,#b9afa3,#4d4540)' },
    ],
  },
  {
    field: 'visual_direction',
    actionId: 'SELECT_VISUAL_DIRECTION',
    title: { ru: 'Какое оформление вам ближе?', en: 'Which styling feels closer to you?' },
    subtitle: { ru: 'Это не выбор конкретного цвета — только общее оформление проекта.', en: 'This is not a specific color choice, only the overall styling of the project.' },
    options: [
      { value: 'LIGHT', title: { ru: 'Светлое', en: 'Light' }, image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=82', fallback: 'linear-gradient(145deg,#f0ece4,#c9c0b4)' },
      { value: 'DARK', title: { ru: 'Тёмное', en: 'Dark' }, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=82', fallback: 'linear-gradient(145deg,#65615e,#242322)' },
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
    customDevelopment: 'Мы работаем над этой функцией. Своя конфигурация пока в стадии разработки.',
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
    customDevelopment: 'We are working on this feature. Custom configuration is currently in development.',
    changeSelection: 'Change', saveError: 'Could not save the selection', loadErrorTitle: 'Could not open the project', loadErrorSubtitle: 'Check the BIZET OS connection and try again.'
  }
};

const UA_AUTO = {
  'Тип дома':'Тип будинку',
  'Выберите тип объекта. Это поможет BIZET OS правильно выстроить дальнейший маршрут.':'Оберіть тип об’єкта. Це допоможе BIZET OS правильно побудувати подальший маршрут.',
  'Новострой':'Новобудова','Старый фонд':'Старий фонд','Частный дом':'Приватний будинок','Коммерческое помещение':'Комерційне приміщення',
  'Выберите зону':'Оберіть зону',
  'Сначала определяем зону объекта. Конкретные изделия внутри неё BIZET OS будет уточнять дальше.':'Спочатку визначаємо зону об’єкта. Конкретні вироби всередині неї BIZET OS уточнюватиме далі.',
  'Кухня':'Кухня','Спальная':'Спальня','Гостиная':'Вітальня','Шкафы':'Шафи','Другое':'Інше',
  'Выберите уровень комплектации':'Оберіть рівень комплектації',
  'Сравните один и тот же образ изделия — от более простого исполнения к более насыщенному.':'Порівняйте той самий виріб — від простішого виконання до більш насиченого.',
  'Своя конфигурация':'Власна конфігурація',
  'Какое оформление вам ближе?':'Яке оформлення вам ближче?',
  'Это не выбор конкретного цвета — только общее оформление проекта.':'Це не вибір конкретного кольору — лише загальне оформлення проєкту.',
  'Светлое':'Світле','Тёмное':'Темне',
  'Tree Art · активно':'Tree Art · активно','Недоступно в пилоте':'Недоступно в пілоті'
};
const UA_COPY = {
  settings:'Налаштування',theme:'Тема',light:'Світла',dark:'Темна',language:'Мова',login:'Увійти',register:'Реєстрація',
  feedback:'Зворотний зв’язок',tutorial:'Як користуватися системою',step:'Крок',of:'з',summaryTitle:'Ваш вибір',continue:'Деталі вашого приміщення',
  legacy:'Технічний стенд',authPending:'Вхід і реєстрацію буде підключено окремим шаром акаунта. Гостьовий режим залишається доступним.',
  feedbackTitle:'Зворотний зв’язок',feedbackCopy:'Опишіть питання, ідею або зауваження.',feedbackPlaceholder:'Ваше повідомлення',feedbackSubmit:'Зберегти для пілота',
  feedbackSaved:'Повідомлення збережено в цьому браузері для поточного пілота.',tutorialTitle:'Як користуватися системою',tutorialCopy:'Тут запускатиметься відеоінструкція.',
  roomDetailsPending:'Наступний екран — деталі приміщення.',customDevelopment:'Ми працюємо над цією функцією.',changeSelection:'Змінити',saveError:'Не вдалося зберегти вибір',
  loadErrorTitle:'Не вдалося відкрити проєкт',loadErrorSubtitle:'Перевірте підключення до BIZET OS і повторіть спробу.'
};

const LABELS = {
  object_type: {
    NEW_BUILD: { ru: 'Новострой', en: 'New build' }, OLD_STOCK: { ru: 'Старый фонд', en: 'Historic building' },
    PRIVATE_HOUSE: { ru: 'Частный дом', en: 'Private house' }, COMMERCIAL: { ru: 'Коммерция', en: 'Commercial' }
  },
  product_type: {
    ZONE_KITCHEN: { ru: 'Кухня', en: 'Kitchen' }, ZONE_BEDROOM: { ru: 'Спальная', en: 'Bedroom' },
    ZONE_LIVING_ROOM: { ru: 'Гостиная', en: 'Living room' }, ZONE_WARDROBE: { ru: 'Шкафы', en: 'Wardrobes' },
    ZONE_OTHER: { ru: 'Другое', en: 'Other' }, COMMERCIAL_ZONE_PENDING: { ru: 'Коммерческая зона', en: 'Commercial zone' },
    KITCHEN: { ru: 'Кухня', en: 'Kitchen' }, WARDROBE: { ru: 'Гардеробная', en: 'Wardrobe' }, CABINET: { ru: 'Корпусное изделие', en: 'Cabinet' },
    LIVING_ROOM: { ru: 'Гостиная', en: 'Living room' }, OTHER: { ru: 'Другое', en: 'Other' }
  },
  complexity_category: { I: { ru: 'Категория I', en: 'Category I' }, II: { ru: 'Категория II', en: 'Category II' }, III: { ru: 'Категория III', en: 'Category III' }, IV: { ru: 'Категория IV', en: 'Category IV' }, V: { ru: 'Своя конфигурация', en: 'Custom configuration' } },
  visual_direction: { LIGHT: { ru: 'Светлое', en: 'Light' }, DARK: { ru: 'Тёмное', en: 'Dark' }, OTHER: { ru: 'Другое', en: 'Other' } },
};

let project = null;
let currentStep = 0;
let busy = false;
let editingFromSummary = false;
let directionGateOpen = false;
let designPlaceholderOpen = false;
const LANGUAGE_DEFAULT_MARK='bizet_os_language_v1049_default';
if(!localStorage.getItem(LANGUAGE_DEFAULT_MARK)){localStorage.setItem(LANGUAGE_KEY,'ua');localStorage.setItem(LANGUAGE_DEFAULT_MARK,'1');}
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'ua';
let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
let toastTimer = null;

function t(value) {
  if (typeof value === 'string') return currentLanguage === 'ua' ? (UA_AUTO[value] || value) : value;
  if (currentLanguage === 'ua') return value?.ua || UA_AUTO[value?.ru] || value?.ru || '';
  return value?.[currentLanguage] || value?.ru || '';
}

function copy(key) {
  if (currentLanguage === 'ua') return UA_COPY[key] || STATIC_COPY.ru[key] || key;
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

function directionText(ru, en, ua) {
  return currentLanguage === 'en' ? en : currentLanguage === 'ua' ? ua : ru;
}

function renderDirectionGate() {
  directionGateOpen = true;
  designPlaceholderOpen = false;
  showError('');
  $('summaryCard').hidden = true;
  $('introBlock').hidden = false;
  $('choiceGrid').hidden = false;
  document.body.dataset.startKind = 'bizet_direction';
  $('stepMeta').textContent = 'BIZET OS';
  $('stepTitle').textContent = directionText('Направление', 'Direction', 'Напрям роботи');
  $('stepSubtitle').textContent = directionText(
    'Выберите, с чем будем работать. Сейчас полноценная ветка — мебель.',
    'Choose what you want to work with. Furniture is the full pilot route today.',
    'Оберіть напрям роботи. Зараз повноцінна гілка — меблі.'
  );
  $('backButton').hidden = false;
  $('backButton').style.removeProperty('display');
  const grid = $('choiceGrid');
  grid.dataset.count = '4';
  grid.dataset.kind = 'bizet_direction';
  const soon = directionText('Скоро', 'Soon', 'Незабаром');
  const placeholder = directionText('Предпросмотр ветки', 'Branch preview', 'Попередній перегляд гілки');
  grid.innerHTML = [
    ['FURNITURE', directionText('Мебель','Furniture','Меблі'), '', false],
    ['DESIGN', directionText('Дизайн','Design','Дизайн'), placeholder, false],
    ['REPAIR', directionText('Ремонт','Renovation','Ремонт'), soon, true],
    ['ENGINEERING', directionText('Инженерия','Engineering','Інженерія'), soon, true],
  ].map(([value,title,note,disabled]) =>
    '<button type="button" class="choice-card bizet-direction-card'+(disabled?' pilot-disabled-choice':'')+'" data-direction="'+value+'" '+(disabled?'disabled aria-disabled="true"':'')+'>'+
      '<span class="card-content"><span class="card-title">'+title+'</span>'+(note?'<span class="card-note">'+note+'</span>':'')+'</span>'+
    '</button>'
  ).join('');
  grid.querySelector('[data-direction="FURNITURE"]')?.addEventListener('click', () => {
    directionGateOpen = false;
    currentStep = 1;
    renderStep();
    window.scrollTo({top:0,behavior:'smooth'});
  });
  grid.querySelector('[data-direction="DESIGN"]')?.addEventListener('click', renderDesignPlaceholder);
}

function renderDesignPlaceholder() {
  directionGateOpen = false;
  designPlaceholderOpen = true;
  $('summaryCard').hidden = true;
  $('introBlock').hidden = false;
  $('choiceGrid').hidden = false;
  document.body.dataset.startKind = 'bizet_design_placeholder';
  $('stepMeta').textContent = 'BIZET OS';
  $('stepTitle').textContent = directionText('Дизайн', 'Design', 'Дизайн');
  $('stepSubtitle').textContent = directionText(
    'Ветка заложена в архитектуру BIZET OS. Инструменты дизайна подключим отдельным этапом.',
    'This branch is reserved in BIZET OS. Design tools will be connected in a dedicated stage.',
    'Гілку закладено в архітектуру BIZET OS. Інструменти дизайну підключимо окремим етапом.'
  );
  $('backButton').hidden = false;
  $('backButton').style.removeProperty('display');
  const grid = $('choiceGrid');
  grid.dataset.count = '1';
  grid.dataset.kind = 'bizet_design_placeholder';
  grid.innerHTML = '<button type="button" class="choice-card bizet-design-placeholder" disabled aria-disabled="true"><span class="card-content"><span class="card-title">'+directionText('Раздел в разработке','Section in development','Розділ у розробці')+'</span><span class="card-note">'+directionText('Вернуться можно кнопкой «Назад»','Use Back to return','Повернутися можна кнопкою «Назад»')+'</span></span></button>';
}

function renderStep() {
  directionGateOpen = false;
  designPlaceholderOpen = false;
  showError('');
  $('summaryCard').hidden = true;
  $('introBlock').hidden = false;
  $('choiceGrid').hidden = false;

  const step = activeStepDefinition();
  document.body.dataset.startKind=step.field;
  $('stepMeta').textContent = `${copy('step')} ${currentStep + 1} ${copy('of')} ${STEPS.length}`;
  $('stepTitle').textContent = t(step.title);
  $('stepSubtitle').textContent = t(step.subtitle);
  renderProgress(currentStep);

  // First screen: no back control exists visually or interactively.
  $('backButton').hidden = currentStep === 0;
  const back=$('backButton');
  const first=currentStep===0;
  if(first)back.style.setProperty('display','none','important');else back.style.removeProperty('display');

  const selected = project.context?.[step.field];
  const grid = $('choiceGrid');
  grid.dataset.count = String(step.options.length);
  grid.dataset.kind = step.field;
  grid.innerHTML = step.options.map((option) => {
    const image = option.image ? `url("${option.image}")` : 'none';
    const fallback = option.fallback || 'linear-gradient(145deg,#ddd,#777)';
    const selectedClass = option.value === selected ? ' selected' : '';
    const wideSpecial = (step.field === 'product_type' && option.value === 'ZONE_OTHER') ||
      (step.field === 'complexity_category' && option.value === 'V');
    const layoutClass = (wideSpecial ? ' r1039-wide-choice' : '') + (option.value === 'ZONE_WARDROBE' ? ' wardrobe-active' : '');
    const variantFilter = option.variantFilter || 'none';
    const kicker = option.kicker ? `<span class="card-kicker">${t(option.kicker)}</span>` : '';
    const note = option.note ? `<span class="card-note">${t(option.note)}</span>` : '';
    const isWardrobeRoute = step.field === 'product_type' && option.value === 'ZONE_WARDROBE';
    const tag = isWardrobeRoute ? 'a' : 'button';
    const typeAttr = isWardrobeRoute ? '' : ' type="button"';
    const hrefAttr = isWardrobeRoute ? ' href="/wardrobes"' : '';
    const disabledAttr = option.disabled && tag==='button' ? ' disabled aria-disabled="true"' : '';
    const disabledClass = option.disabled ? ' pilot-disabled-choice' : '';
    return `<${tag} class="choice-card${selectedClass}${layoutClass}${disabledClass}"${typeAttr}${hrefAttr}${disabledAttr} data-value="${option.value}" data-variant="${option.value}" style='--card-image:${image};--card-fallback:${fallback};--variant-filter:${variantFilter}'>
      <span class="card-content">
        ${kicker}
        <span class="card-title">${t(option.title)}</span>
        ${note}
      </span>
    </${tag}>`;
  }).join('');

  grid.querySelectorAll('.choice-card').forEach((button) => {
    button.addEventListener('click', () => choose(button.dataset.value));
  });
}

async function choose(value) {
  if (busy) return;
  if (STEPS[currentStep]?.field === 'product_type' && value === 'ZONE_WARDROBE') { window.location.assign('/wardrobes'); return; }
  if (STEPS[currentStep]?.field==='complexity_category'&&value!=='I'){showToast(currentLanguage==='ua'?'У пілоті активна лише категорія I.':currentLanguage==='en'?'Only category I is active in this pilot.':'В пилоте активна только категория I.');return}
  if (STEPS[currentStep]?.field==='complexity_category'&&value==='V'){
    showToast(copy('customDevelopment'));
    return;
  }
  busy = true;
  showError('');
  const step = STEPS[currentStep];
  try {
    if (project.context?.[step.field]) {
      const reopened = await request(`/api/v1.1/projects/${project.identity.internal_id}/quest/actions/${step.actionId}/reopen`, { method: 'POST' });
      project = reopened.project || reopened;
    }
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

    if (currentStep === 0) {
      renderDirectionGate();
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
  document.body.dataset.startKind='summary';
  $('introBlock').hidden = true;
  $('choiceGrid').hidden = true;
  $('backButton').hidden = false;
  $('backButton').style.removeProperty('display');
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
  if (designPlaceholderOpen) {
    renderDirectionGate();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (directionGateOpen) {
    directionGateOpen = false;
    currentStep = 0;
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
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
    // R10.5.1: "/" is always the true first screen. Existing project data is kept,
    // but the route itself never resumes in the middle of onboarding.
    currentStep = 0;
    renderStep();
  } catch (error) {
    $('stepTitle').textContent = copy('loadErrorTitle');
    $('stepSubtitle').textContent = copy('loadErrorSubtitle');
    $('choiceGrid').innerHTML = '';
    showError(error.message);
  }
})();
