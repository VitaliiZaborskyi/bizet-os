const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'bizet_os_project_id';
const THEME_KEY = 'bizet_os_theme';
const LANGUAGE_KEY = 'bizet_os_language';
const FEEDBACK_KEY = 'bizet_os_pilot_feedback';

const COPY = {
  ru: {
    settings: 'Настройки', theme: 'Тема', light: 'Светлая', dark: 'Тёмная', language: 'Язык', login: 'Войти', register: 'Регистрация',
    feedback: 'Обратная связь', tutorial: 'Как пользоваться системой',
    eyebrow: 'Помещение', title: 'Ваше помещение', subtitle: 'Поверните сцену пальцем или мышью. Масштабируйте колесом или жестом двумя пальцами.',
    viewport: 'Интерактивная 3D-сцена', reset: 'Исходный вид', hint: 'Перетащите, чтобы осмотреть помещение',
    scopeTitle: 'Сейчас — только пространство', scopeCopy: 'Размеры и элементы помещения появятся на следующем этапе замера.', measurement: 'Начать замер помещения',
    measurePending: 'Следующий слой — замер помещения. Его откроем в BUILD 1.1-E.',
    authPending: 'Вход и регистрация будут подключены отдельным слоем аккаунта. Гостевой режим остаётся доступным.',
    feedbackTitle: 'Обратная связь', feedbackCopy: 'Опишите вопрос, идею или замечание.', feedbackPlaceholder: 'Ваше сообщение', feedbackSubmit: 'Сохранить для пилота', feedbackSaved: 'Сообщение сохранено в этом браузере для текущего пилота.',
    tutorialTitle: 'Как пользоваться системой', tutorialCopy: 'Видеоинструкция будет подключена после утверждения сценария.',
    loadError: 'Не удалось загрузить текущий проект. Вернитесь на стартовый экран и повторите выбор.'
  },
  en: {
    settings: 'Settings', theme: 'Theme', light: 'Light', dark: 'Dark', language: 'Language', login: 'Sign in', register: 'Register',
    feedback: 'Feedback', tutorial: 'How to use the system',
    eyebrow: 'Room', title: 'Your room', subtitle: 'Rotate the scene with a mouse or finger. Zoom with the wheel or a two-finger gesture.',
    viewport: 'Interactive 3D scene', reset: 'Reset view', hint: 'Drag to look around the room',
    scopeTitle: 'For now — space only', scopeCopy: 'Dimensions and room elements will appear in the next measurement stage.', measurement: 'Start room measurement',
    measurePending: 'The next layer is room measurement. It will open in BUILD 1.1-E.',
    authPending: 'Sign in and registration will be connected as a separate account layer. Guest mode remains available.',
    feedbackTitle: 'Feedback', feedbackCopy: 'Describe a question, idea, or issue.', feedbackPlaceholder: 'Your message', feedbackSubmit: 'Save for pilot', feedbackSaved: 'The message has been saved in this browser for the current pilot.',
    tutorialTitle: 'How to use the system', tutorialCopy: 'The video guide will be connected after the scenario is approved.',
    loadError: 'Could not load the current project. Return to the start screen and repeat your choices.'
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
    ZONE_OTHER: { ru: 'Другое', en: 'Other' }, COMMERCIAL_ZONE_PENDING: { ru: 'Коммерческая зона', en: 'Commercial zone' }
  },
  complexity_category: { I: { ru: 'Категория I', en: 'Category I' }, II: { ru: 'Категория II', en: 'Category II' }, III: { ru: 'Категория III', en: 'Category III' }, IV: { ru: 'Категория IV', en: 'Category IV' }, V: { ru: 'Категория V', en: 'Category V' } },
  visual_direction: { LIGHT: { ru: 'Light', en: 'Light' }, DARK: { ru: 'Dark', en: 'Dark' }, OTHER: { ru: 'Другое', en: 'Other' } }
};

let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'ru';
let currentTheme = localStorage.getItem(THEME_KEY) || 'light';
let project = null;
let toastTimer = null;
let saveTimer = null;

const camera = { yaw: 0, pitch: 0.34, distance: 8.2 };
const DEFAULT_CAMERA = { ...camera };
const target = [0, 2.1, 1.25];
const canvas = $('roomCanvas');
const ctx = canvas.getContext('2d');
const pointers = new Map();
let dragStart = null;
let pinchStart = null;

function copy(key) { return COPY[currentLanguage]?.[key] || COPY.ru[key] || key; }
function label(group, value) { return LABELS[group]?.[value]?.[currentLanguage] || LABELS[group]?.[value]?.ru || value || '—'; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function add(a,b){ return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function mul(a,s){ return [a[0]*s,a[1]*s,a[2]*s]; }
function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
function length(a){ return Math.hypot(a[0],a[1],a[2]); }
function norm(a){ const l=length(a)||1; return mul(a,1/l); }

function request(url, options = {}) {
  return fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }).then(async response => {
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  });
}

function showToast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2800);
}

function showError(message) {
  $('errorBanner').textContent = message;
  $('errorBanner').hidden = !message;
}

function cameraPosition() {
  const cp = Math.cos(camera.pitch);
  return add(target, [camera.distance * cp * Math.sin(camera.yaw), -camera.distance * cp * Math.cos(camera.yaw), camera.distance * Math.sin(camera.pitch)]);
}

function buildView() {
  const position = cameraPosition();
  const forward = norm(sub(target, position));
  const right = norm(cross(forward, [0,0,1]));
  const up = norm(cross(right, forward));
  return { position, forward, right, up };
}

function projectPoint(point, view, width, height) {
  const rel = sub(point, view.position);
  const x = dot(rel, view.right);
  const y = dot(rel, view.up);
  const z = dot(rel, view.forward);
  if (z <= 0.08) return null;
  const focal = Math.min(width, height) * 1.08;
  return [width / 2 + focal * x / z, height / 2 - focal * y / z, z];
}

function themeColors() {
  const dark = currentTheme === 'dark';
  return dark ? {
    bg: '#1d1d1b', floor: '#2c2b28', back: '#34332f', side: '#292925', ceiling: 'rgba(74,72,66,.34)', line: 'rgba(235,231,222,.28)', grid: 'rgba(235,231,222,.10)', accent: 'rgba(235,231,222,.46)', shadow: 'rgba(0,0,0,.28)'
  } : {
    bg: '#efede7', floor: '#d8d4ca', back: '#e4e1d8', side: '#d1cdc3', ceiling: 'rgba(245,243,237,.58)', line: 'rgba(54,51,46,.28)', grid: 'rgba(54,51,46,.10)', accent: 'rgba(54,51,46,.42)', shadow: 'rgba(80,72,60,.12)'
  };
}

function polygon(points, view, fill, stroke, width, height) {
  const projected = points.map(p => projectPoint(p, view, width, height));
  if (projected.some(p => !p)) return;
  ctx.beginPath();
  ctx.moveTo(projected[0][0], projected[0][1]);
  projected.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function line3d(a, b, view, color, lineWidth, width, height) {
  const pa = projectPoint(a, view, width, height);
  const pb = projectPoint(b, view, width, height);
  if (!pa || !pb) return;
  ctx.beginPath(); ctx.moveTo(pa[0],pa[1]); ctx.lineTo(pb[0],pb[1]); ctx.strokeStyle=color; ctx.lineWidth=lineWidth; ctx.stroke();
}

function drawRoom() {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const colors = themeColors();
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0,0,width,height);

  const view = buildView();
  const left = -3, right = 3, front = 0, back = 4.2, floor = 0, top = 2.8;

  // soft grounding shadow behind the normalized room shell
  ctx.save();
  ctx.filter = 'blur(24px)';
  ctx.fillStyle = colors.shadow;
  ctx.beginPath(); ctx.ellipse(width/2, height*.76, width*.27, height*.055, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  polygon([[left,front,floor],[right,front,floor],[right,back,floor],[left,back,floor]], view, colors.floor, colors.line, width, height);
  polygon([[left,back,floor],[right,back,floor],[right,back,top],[left,back,top]], view, colors.back, colors.line, width, height);
  polygon([[left,front,floor],[left,back,floor],[left,back,top],[left,front,top]], view, colors.side, colors.line, width, height);
  polygon([[right,back,floor],[right,front,floor],[right,front,top],[right,back,top]], view, colors.side, colors.line, width, height);
  polygon([[left,front,top],[left,back,top],[right,back,top],[right,front,top]], view, colors.ceiling, colors.line, width, height);

  // floor grid is visual only: no dimensions are implied by the normalized spacing
  for (let x = left + .5; x < right; x += .5) line3d([x,front,floor+.002],[x,back,floor+.002],view,colors.grid,.7,width,height);
  for (let y = front + .5; y < back; y += .5) line3d([left,y,floor+.002],[right,y,floor+.002],view,colors.grid,.7,width,height);

  // quiet architectural seams on the back wall
  line3d([0,back,.02],[0,back,top-.02],view,colors.grid,.7,width,height);
  line3d([left+.02,back,1.4],[right-.02,back,1.4],view,colors.grid,.7,width,height);

  // open front edges define the room without closing the viewer in
  line3d([left,front,floor],[left,front,top],view,colors.accent,1.1,width,height);
  line3d([right,front,floor],[right,front,top],view,colors.accent,1.1,width,height);
  line3d([left,front,top],[right,front,top],view,colors.accent,1.1,width,height);
}

function scheduleCameraSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCamera, 320);
}

async function saveCamera() {
  if (!project?.identity?.internal_id) return;
  try {
    const result = await request(`/api/v1.1/projects/${project.identity.internal_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ path: 'scene.camera', value: { yaw: camera.yaw, pitch: camera.pitch, distance: camera.distance }, reason: 'BUILD 1.1-D viewport camera' })
    });
    project = result.project;
  } catch (_) {
    // Camera persistence is useful but must never block interaction.
  }
}

function restoreCameraFromProject() {
  const saved = project?.scene?.camera;
  if (!saved || typeof saved !== 'object') return;
  if (Number.isFinite(saved.yaw)) camera.yaw = clamp(saved.yaw, -1.05, 1.05);
  if (Number.isFinite(saved.pitch)) camera.pitch = clamp(saved.pitch, .08, .78);
  if (Number.isFinite(saved.distance)) camera.distance = clamp(saved.distance, 5.4, 12.5);
}

function renderContext() {
  if (!project?.context) return;
  const values = [
    label('object_type', project.context.object_type),
    label('product_type', project.context.product_type),
    label('complexity_category', project.context.complexity_category),
    label('visual_direction', project.context.visual_direction)
  ].filter(Boolean);
  $('projectContext').innerHTML = values.map(value => `<span class="context-chip">${value}</span>`).join('');
}

function applyTheme() {
  document.documentElement.dataset.theme = currentTheme;
  localStorage.setItem(THEME_KEY, currentTheme);
  $('themeSelect').value = currentTheme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', currentTheme === 'dark' ? '#171716' : '#f5f4f1');
  drawRoom();
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  $('settingsTitle').textContent = copy('settings'); $('themeLabel').textContent = copy('theme'); $('languageLabel').textContent = copy('language');
  $('themeSelect').options[0].textContent = copy('light'); $('themeSelect').options[1].textContent = copy('dark'); $('languageSelect').value = currentLanguage;
  $('feedbackButton').textContent = copy('feedback'); $('tutorialButton').textContent = copy('tutorial'); $('loginButton').textContent = copy('login'); $('registerButton').textContent = copy('register');
  $('eyebrow').textContent = copy('eyebrow'); $('roomTitle').textContent = copy('title'); $('roomSubtitle').textContent = copy('subtitle');
  $('viewportBadge').textContent = copy('viewport'); $('resetViewLabel').textContent = copy('reset'); $('gestureHint').textContent = copy('hint');
  $('scopeTitle').textContent = copy('scopeTitle'); $('scopeCopy').textContent = copy('scopeCopy'); $('measurementLabel').textContent = copy('measurement');
  $('feedbackTitle').textContent = copy('feedbackTitle'); $('feedbackCopy').textContent = copy('feedbackCopy'); $('feedbackMessage').placeholder = copy('feedbackPlaceholder'); $('feedbackSubmit').textContent = copy('feedbackSubmit');
  $('tutorialTitle').textContent = copy('tutorialTitle'); $('tutorialCopy').textContent = copy('tutorialCopy');
  renderContext();
}

function closeSettings() { $('settingsPanel').hidden = true; $('settingsButton').setAttribute('aria-expanded','false'); }
function openDialog(dialog) { closeSettings(); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open',''); }
function closeDialog(dialog) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }

$('settingsButton').addEventListener('click', event => { event.stopPropagation(); const open = $('settingsPanel').hidden; $('settingsPanel').hidden = !open; $('settingsButton').setAttribute('aria-expanded', String(open)); });
$('settingsPanel').addEventListener('click', event => event.stopPropagation());
document.addEventListener('click', closeSettings);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSettings(); });
$('themeSelect').addEventListener('change', event => { currentTheme = event.target.value; applyTheme(); });
$('languageSelect').addEventListener('change', event => { currentLanguage = event.target.value; applyLanguage(); });
[$('loginButton'), $('registerButton')].forEach(button => button.addEventListener('click', () => { $('settingsNotice').textContent = copy('authPending'); $('settingsNotice').hidden = false; }));
$('feedbackButton').addEventListener('click', () => { $('feedbackStatus').hidden = true; $('feedbackMessage').value = localStorage.getItem(FEEDBACK_KEY) || ''; openDialog($('feedbackDialog')); });
$('tutorialButton').addEventListener('click', () => openDialog($('tutorialDialog')));
$('feedbackClose').addEventListener('click', () => closeDialog($('feedbackDialog')));
$('tutorialClose').addEventListener('click', () => closeDialog($('tutorialDialog')));
$('feedbackSubmit').addEventListener('click', () => { localStorage.setItem(FEEDBACK_KEY, $('feedbackMessage').value.trim()); $('feedbackStatus').textContent = copy('feedbackSaved'); $('feedbackStatus').hidden = false; });
[$('feedbackDialog'), $('tutorialDialog')].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); }));

function markInteracted() { $('gestureHint').classList.add('used'); }

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  canvas.classList.add('dragging');
  markInteracted();
  if (pointers.size === 1) dragStart = { x: event.clientX, y: event.clientY, yaw: camera.yaw, pitch: camera.pitch };
  if (pointers.size === 2) {
    const pts = [...pointers.values()];
    pinchStart = { distance: Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y), cameraDistance: camera.distance };
  }
});

canvas.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1 && dragStart) {
    camera.yaw = clamp(dragStart.yaw + (event.clientX - dragStart.x) * .005, -1.05, 1.05);
    camera.pitch = clamp(dragStart.pitch - (event.clientY - dragStart.y) * .004, .08, .78);
    drawRoom();
  } else if (pointers.size === 2 && pinchStart) {
    const pts = [...pointers.values()];
    const distance = Math.max(20, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y));
    camera.distance = clamp(pinchStart.cameraDistance * (pinchStart.distance / distance), 5.4, 12.5);
    drawRoom();
  }
});

function endPointer(event) {
  pointers.delete(event.pointerId);
  if (pointers.size === 0) { canvas.classList.remove('dragging'); dragStart = null; pinchStart = null; scheduleCameraSave(); }
  else if (pointers.size === 1) {
    const point = [...pointers.values()][0];
    dragStart = { x: point.x, y: point.y, yaw: camera.yaw, pitch: camera.pitch };
    pinchStart = null;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', event => {
  event.preventDefault();
  markInteracted();
  camera.distance = clamp(camera.distance * Math.exp(event.deltaY * .001), 5.4, 12.5);
  drawRoom();
  scheduleCameraSave();
}, { passive: false });

$('resetViewButton').addEventListener('click', () => {
  Object.assign(camera, DEFAULT_CAMERA);
  drawRoom();
  scheduleCameraSave();
});

$('startMeasurementButton').addEventListener('click', () => showToast(copy('measurePending')));
window.addEventListener('resize', drawRoom);

async function init() {
  applyTheme();
  applyLanguage();
  drawRoom();
  const projectId = sessionStorage.getItem(STORAGE_KEY);
  if (!projectId) { showError(copy('loadError')); return; }
  try {
    project = await request(`/api/v1.1/projects/${projectId}`);
    restoreCameraFromProject();
    renderContext();
    drawRoom();
  } catch (_) {
    showError(copy('loadError'));
  }
}

init();
