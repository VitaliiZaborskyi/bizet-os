const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'bizet_os_project_id';
const THEME_KEY = 'bizet_os_theme';
const LANGUAGE_KEY = 'bizet_os_language';
const FEEDBACK_KEY = 'bizet_os_pilot_feedback';

const DEFAULT_DIMENSIONS = { lengthMm: 6000, widthMm: 4200, heightMm: 2800 };
const dimensions = { ...DEFAULT_DIMENSIONS };

const COPY = {
  ru: {
    settings: 'Настройки', theme: 'Тема', light: 'Светлая', dark: 'Тёмная', language: 'Язык', login: 'Войти', register: 'Регистрация',
    feedback: 'Обратная связь', tutorial: 'Как пользоваться системой',
    eyebrow: 'Помещение', title: 'Ваше помещение', subtitle: 'Поверните сцену пальцем или мышью. Нажмите на стену или пол, чтобы указать размеры.',
    viewport: 'Интерактивная 3D-сцена', reset: 'Исходный вид', hint: 'Проведите пальцем для вращения · нажмите стену или пол для размеров',
    scopeTitle: 'Геометрия помещения', scopeCopy: 'Стены обозначены A–D. Нажмите на стену или пол, чтобы проверить или изменить размеры.', measurement: 'Продолжить замер помещения',
    measurePending: 'Следующий шаг — детальный замер помещения и его элементов.',
    summary: 'Ваш выбор', object: 'Объект', zone: 'Зона', category: 'Категория', styling: 'Оформление',
    wall: 'Стена', floor: 'Пол', geometry: 'Геометрия', length: 'Длина', width: 'Ширина', height: 'Высота', saveDimensions: 'Сохранить размеры',
    defaultDimensions: 'Показаны размеры по умолчанию. Измените их на фактические.', savedDimensions: 'Показаны сохранённые размеры помещения.', dimensionsSaved: 'Размеры сохранены', invalidDimensions: 'Введите корректные размеры в миллиметрах.',
    authPending: 'Вход и регистрация будут подключены отдельным слоем аккаунта. Гостевой режим остаётся доступным.',
    feedbackTitle: 'Обратная связь', feedbackCopy: 'Опишите вопрос, идею или замечание.', feedbackPlaceholder: 'Ваше сообщение', feedbackSubmit: 'Сохранить для пилота', feedbackSaved: 'Сообщение сохранено в этом браузере для текущего пилота.',
    tutorialTitle: 'Как пользоваться системой', tutorialCopy: 'Видеоинструкция будет подключена после утверждения сценария.',
    loadError: 'Не удалось загрузить текущий проект. Вернитесь на стартовый экран и повторите выбор.'
  },
  en: {
    settings: 'Settings', theme: 'Theme', light: 'Light', dark: 'Dark', language: 'Language', login: 'Sign in', register: 'Register',
    feedback: 'Feedback', tutorial: 'How to use the system',
    eyebrow: 'Room', title: 'Your room', subtitle: 'Rotate the scene with a mouse or finger. Tap a wall or the floor to enter dimensions.',
    viewport: 'Interactive 3D scene', reset: 'Reset view', hint: 'Drag to rotate · tap a wall or floor for dimensions',
    scopeTitle: 'Room geometry', scopeCopy: 'Walls are marked A–D. Tap a wall or the floor to review or change dimensions.', measurement: 'Continue room measurement',
    measurePending: 'The next step is detailed room and element measurement.',
    summary: 'Your choices', object: 'Object', zone: 'Zone', category: 'Category', styling: 'Styling',
    wall: 'Wall', floor: 'Floor', geometry: 'Geometry', length: 'Length', width: 'Width', height: 'Height', saveDimensions: 'Save dimensions',
    defaultDimensions: 'Default dimensions are shown. Replace them with the actual measurements.', savedDimensions: 'Saved room dimensions are shown.', dimensionsSaved: 'Dimensions saved', invalidDimensions: 'Enter valid dimensions in millimetres.',
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
let activeSurface = null;

const camera = { yaw: 0, pitch: 0.34, distance: 8.2 };
const DEFAULT_CAMERA = { ...camera };
const canvas = $('roomCanvas');
const ctx = canvas.getContext('2d');
const pointers = new Map();
let dragStart = null;
let pinchStart = null;
let surfaceHitAreas = [];
let labelHitAreas = [];

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
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try { const payload = await response.json(); detail = payload.detail || detail; } catch (_) {}
      throw new Error(detail);
    }
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

function measured(path, fallback) {
  const parts = path.split('.');
  let value = project;
  for (const part of parts) value = value?.[part];
  return Number.isFinite(value?.value_mm) && value.value_mm > 0 ? value.value_mm : fallback;
}

function loadDimensionsFromProject() {
  dimensions.lengthMm = measured('room.geometry.wall_length', DEFAULT_DIMENSIONS.lengthMm);
  dimensions.widthMm = measured('room.geometry.wall_depth', DEFAULT_DIMENSIONS.widthMm);
  dimensions.heightMm = measured('room.geometry.room_height', DEFAULT_DIMENSIONS.heightMm);
  renderDimensionSummary();
}

function renderDimensionSummary() {
  $('dimensionSummary').textContent = `${dimensions.lengthMm} × ${dimensions.widthMm} × H ${dimensions.heightMm} mm`;
}

function roomBounds() {
  return {
    left: -dimensions.lengthMm / 2000,
    right: dimensions.lengthMm / 2000,
    front: 0,
    back: dimensions.widthMm / 1000,
    floor: 0,
    top: dimensions.heightMm / 1000,
  };
}

function targetPoint() {
  const b = roomBounds();
  return [0, b.back * .5, b.top * .48];
}

function cameraPosition() {
  const target = targetPoint();
  const cp = Math.cos(camera.pitch);
  return add(target, [camera.distance * cp * Math.sin(camera.yaw), -camera.distance * cp * Math.cos(camera.yaw), camera.distance * Math.sin(camera.pitch)]);
}

function buildView() {
  const target = targetPoint();
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
    bg: '#1d1d1b', floor: '#2c2b28', back: '#34332f', side: '#292925', ceiling: 'rgba(74,72,66,.34)', line: 'rgba(235,231,222,.28)', grid: 'rgba(235,231,222,.10)', accent: 'rgba(235,231,222,.46)', shadow: 'rgba(0,0,0,.28)', labelBg: 'rgba(246,243,236,.92)', labelInk: '#171716'
  } : {
    bg: '#efede7', floor: '#d8d4ca', back: '#e4e1d8', side: '#d1cdc3', ceiling: 'rgba(245,243,237,.58)', line: 'rgba(54,51,46,.28)', grid: 'rgba(54,51,46,.10)', accent: 'rgba(54,51,46,.42)', shadow: 'rgba(80,72,60,.12)', labelBg: 'rgba(23,23,22,.82)', labelInk: '#f6f3ec'
  };
}

function polygon(points, view, fill, stroke, width, height, surfaceId = null) {
  const projected = points.map(p => projectPoint(p, view, width, height));
  if (projected.some(p => !p)) return null;
  ctx.beginPath();
  ctx.moveTo(projected[0][0], projected[0][1]);
  projected.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  if (surfaceId) surfaceHitAreas.push({ id: surfaceId, points: projected.map(p => [p[0], p[1]]) });
  return projected;
}

function line3d(a, b, view, color, lineWidth, width, height, dash = []) {
  const pa = projectPoint(a, view, width, height);
  const pb = projectPoint(b, view, width, height);
  if (!pa || !pb) return;
  ctx.save();
  ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(pa[0],pa[1]); ctx.lineTo(pb[0],pb[1]); ctx.strokeStyle=color; ctx.lineWidth=lineWidth; ctx.stroke();
  ctx.restore();
}

function drawSurfaceLabel(point, text, surfaceId, view, width, height) {
  const p = projectPoint(point, view, width, height);
  if (!p) return;
  const colors = themeColors();
  ctx.save();
  ctx.font = '700 13px Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textWidth = Math.max(18, ctx.measureText(text).width);
  const w = textWidth + 18;
  const h = 30;
  const x = p[0] - w / 2;
  const y = p[1] - h / 2;
  ctx.fillStyle = colors.labelBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 15);
  ctx.fill();
  ctx.fillStyle = colors.labelInk;
  ctx.fillText(text, p[0], p[1] + .5);
  ctx.restore();
  labelHitAreas.push({ id: surfaceId, x, y, w, h });
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
  surfaceHitAreas = [];
  labelHitAreas = [];

  const view = buildView();
  const { left, right, front, back, floor, top } = roomBounds();

  ctx.save();
  ctx.filter = 'blur(24px)';
  ctx.fillStyle = colors.shadow;
  ctx.beginPath(); ctx.ellipse(width/2, height*.76, width*.27, height*.055, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  polygon([[left,front,floor],[right,front,floor],[right,back,floor],[left,back,floor]], view, colors.floor, colors.line, width, height, 'FLOOR');
  polygon([[left,back,floor],[right,back,floor],[right,back,top],[left,back,top]], view, colors.back, colors.line, width, height, 'A');
  polygon([[left,front,floor],[left,back,floor],[left,back,top],[left,front,top]], view, colors.side, colors.line, width, height, 'B');
  polygon([[right,back,floor],[right,front,floor],[right,front,top],[right,back,top]], view, colors.side, colors.line, width, height, 'C');
  polygon([[left,front,top],[left,back,top],[right,back,top],[right,front,top]], view, colors.ceiling, colors.line, width, height);

  for (let x = Math.ceil(left * 2) / 2; x < right; x += .5) line3d([x,front,floor+.002],[x,back,floor+.002],view,colors.grid,.7,width,height);
  for (let y = front + .5; y < back; y += .5) line3d([left,y,floor+.002],[right,y,floor+.002],view,colors.grid,.7,width,height);

  line3d([left,front,floor],[left,front,top],view,colors.accent,1.1,width,height,[5,5]);
  line3d([right,front,floor],[right,front,top],view,colors.accent,1.1,width,height,[5,5]);
  line3d([left,front,top],[right,front,top],view,colors.accent,1.1,width,height,[5,5]);

  drawSurfaceLabel([0, back, top*.52], 'A', 'A', view, width, height);
  drawSurfaceLabel([left, back*.52, top*.52], 'B', 'B', view, width, height);
  drawSurfaceLabel([right, back*.52, top*.52], 'C', 'C', view, width, height);
  drawSurfaceLabel([0, front, top*.52], 'D', 'D', view, width, height);
  drawSurfaceLabel([0, back*.5, floor+.02], 'FLOOR', 'FLOOR', view, width, height);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj-xi) * (y-yi) / ((yj-yi) || .00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function surfaceAtPoint(x, y) {
  for (let i = labelHitAreas.length - 1; i >= 0; i -= 1) {
    const a = labelHitAreas[i];
    if (x >= a.x && x <= a.x+a.w && y >= a.y && y <= a.y+a.h) return a.id;
  }
  for (let i = surfaceHitAreas.length - 1; i >= 0; i -= 1) {
    const area = surfaceHitAreas[i];
    if (pointInPolygon(x, y, area.points)) return area.id;
  }
  return null;
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
  } catch (_) {}
}

function restoreCameraFromProject() {
  const saved = project?.scene?.camera;
  if (!saved || typeof saved !== 'object') return;
  if (Number.isFinite(saved.yaw)) camera.yaw = clamp(saved.yaw, -1.2, 1.2);
  if (Number.isFinite(saved.pitch)) camera.pitch = clamp(saved.pitch, .08, .82);
  if (Number.isFinite(saved.distance)) camera.distance = clamp(saved.distance, 5.4, 20);
}

function renderContext() {
  if (!project?.context) return;
  const values = [
    { name: copy('object'), value: label('object_type', project.context.object_type) },
    { name: copy('zone'), value: label('product_type', project.context.product_type) },
    { name: copy('category'), value: label('complexity_category', project.context.complexity_category) },
    { name: copy('styling'), value: label('visual_direction', project.context.visual_direction) }
  ];
  $('questSummaryList').innerHTML = values.map(item => `<div class="quest-summary-row"><span>${item.name}</span><strong>${item.value}</strong></div>`).join('');
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
  $('questSummaryLabel').textContent = copy('summary');
  $('feedbackTitle').textContent = copy('feedbackTitle'); $('feedbackCopy').textContent = copy('feedbackCopy'); $('feedbackMessage').placeholder = copy('feedbackPlaceholder'); $('feedbackSubmit').textContent = copy('feedbackSubmit');
  $('tutorialTitle').textContent = copy('tutorialTitle'); $('tutorialCopy').textContent = copy('tutorialCopy');
  $('dimensionEyebrow').textContent = copy('geometry'); $('dimensionSave').textContent = copy('saveDimensions');
  renderContext();
  if (activeSurface) populateDimensionDialog(activeSurface);
}

function closeSettings() { $('settingsPanel').hidden = true; $('settingsButton').setAttribute('aria-expanded','false'); }
function closeQuestSummary() { $('questSummaryPanel').hidden = true; $('questSummaryButton').setAttribute('aria-expanded','false'); }
function openDialog(dialog) { closeSettings(); closeQuestSummary(); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open',''); }
function closeDialog(dialog) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }

$('settingsButton').addEventListener('click', event => {
  event.stopPropagation();
  closeQuestSummary();
  const open = $('settingsPanel').hidden;
  $('settingsPanel').hidden = !open;
  $('settingsButton').setAttribute('aria-expanded', String(open));
});
$('settingsPanel').addEventListener('click', event => event.stopPropagation());
$('questSummaryButton').addEventListener('click', event => {
  event.stopPropagation();
  closeSettings();
  const open = $('questSummaryPanel').hidden;
  $('questSummaryPanel').hidden = !open;
  $('questSummaryButton').setAttribute('aria-expanded', String(open));
});
$('questSummaryPanel').addEventListener('click', event => event.stopPropagation());
document.addEventListener('click', () => { closeSettings(); closeQuestSummary(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeSettings(); closeQuestSummary(); } });

$('themeSelect').addEventListener('change', event => { currentTheme = event.target.value; applyTheme(); });
$('languageSelect').addEventListener('change', event => { currentLanguage = event.target.value; applyLanguage(); });
[$('loginButton'), $('registerButton')].forEach(button => button.addEventListener('click', () => { $('settingsNotice').textContent = copy('authPending'); $('settingsNotice').hidden = false; }));
$('feedbackButton').addEventListener('click', () => { $('feedbackStatus').hidden = true; $('feedbackMessage').value = localStorage.getItem(FEEDBACK_KEY) || ''; openDialog($('feedbackDialog')); });
$('tutorialButton').addEventListener('click', () => openDialog($('tutorialDialog')));
$('feedbackClose').addEventListener('click', () => closeDialog($('feedbackDialog')));
$('tutorialClose').addEventListener('click', () => closeDialog($('tutorialDialog')));
$('dimensionClose').addEventListener('click', () => closeDialog($('dimensionDialog')));
$('feedbackSubmit').addEventListener('click', () => { localStorage.setItem(FEEDBACK_KEY, $('feedbackMessage').value.trim()); $('feedbackStatus').textContent = copy('feedbackSaved'); $('feedbackStatus').hidden = false; });
[$('feedbackDialog'), $('tutorialDialog'), $('dimensionDialog')].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); }));

function surfaceUsesDefault(surfaceId) {
  const geometry = project?.room?.geometry || {};
  if (surfaceId === 'FLOOR') return !geometry.wall_length?.value_mm || !geometry.wall_depth?.value_mm;
  if (surfaceId === 'A' || surfaceId === 'D') return !geometry.wall_length?.value_mm || !geometry.room_height?.value_mm;
  return !geometry.wall_depth?.value_mm || !geometry.room_height?.value_mm;
}

function populateDimensionDialog(surfaceId) {
  activeSurface = surfaceId;
  const floor = surfaceId === 'FLOOR';
  $('dimensionTitle').textContent = floor ? copy('floor') : `${copy('wall')} ${surfaceId}`;
  $('dimensionPrimaryLabel').textContent = copy('length');
  $('dimensionSecondaryLabel').textContent = floor ? copy('width') : copy('height');
  $('dimensionPrimary').value = floor || surfaceId === 'A' || surfaceId === 'D' ? dimensions.lengthMm : dimensions.widthMm;
  $('dimensionSecondary').value = floor ? dimensions.widthMm : dimensions.heightMm;
  $('dimensionDefaultNote').textContent = surfaceUsesDefault(surfaceId) ? copy('defaultDimensions') : copy('savedDimensions');
}

function openSurfaceEditor(surfaceId) {
  if (!surfaceId) return;
  populateDimensionDialog(surfaceId);
  openDialog($('dimensionDialog'));
}

async function patchGeometry(path, value) {
  const result = await request(`/api/v1.1/projects/${project.identity.internal_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ path, value, source: 'USER_ENTERED', confirmed: false, reason: 'Room surface dimension editor' })
  });
  project = result.project;
}

$('dimensionSave').addEventListener('click', async () => {
  if (!project?.identity?.internal_id || !activeSurface) return;
  const primary = Math.round(Number($('dimensionPrimary').value));
  const secondary = Math.round(Number($('dimensionSecondary').value));
  if (!Number.isFinite(primary) || !Number.isFinite(secondary) || primary < 100 || secondary < 100) {
    showToast(copy('invalidDimensions'));
    return;
  }
  $('dimensionSave').disabled = true;
  try {
    if (activeSurface === 'FLOOR') {
      await patchGeometry('room.geometry.wall_length', primary);
      await patchGeometry('room.geometry.wall_depth', secondary);
    } else {
      const lengthPath = activeSurface === 'A' || activeSurface === 'D' ? 'room.geometry.wall_length' : 'room.geometry.wall_depth';
      await patchGeometry(lengthPath, primary);
      await patchGeometry('room.geometry.room_height', secondary);
    }
    loadDimensionsFromProject();
    const fit = Math.max(dimensions.lengthMm, dimensions.widthMm, dimensions.heightMm) / 1000 * 1.35;
    camera.distance = clamp(fit, 5.4, 20);
    drawRoom();
    scheduleCameraSave();
    closeDialog($('dimensionDialog'));
    showToast(copy('dimensionsSaved'));
  } catch (error) {
    showError(error.message);
  } finally {
    $('dimensionSave').disabled = false;
  }
});

function markInteracted() { $('gestureHint').classList.add('used'); }

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  canvas.classList.add('dragging');
  markInteracted();
  if (pointers.size === 1) dragStart = { x: event.clientX, y: event.clientY, yaw: camera.yaw, pitch: camera.pitch, moved: false };
  if (pointers.size === 2) {
    const pts = [...pointers.values()];
    pinchStart = { distance: Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y), cameraDistance: camera.distance };
  }
});

canvas.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1 && dragStart) {
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (Math.hypot(dx, dy) > 6) dragStart.moved = true;
    // Inverted orbit: the room follows the finger rather than the camera following the drag.
    camera.yaw = clamp(dragStart.yaw - dx * .005, -1.2, 1.2);
    camera.pitch = clamp(dragStart.pitch + dy * .004, .08, .82);
    drawRoom();
  } else if (pointers.size === 2 && pinchStart) {
    const pts = [...pointers.values()];
    const distance = Math.max(20, Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y));
    camera.distance = clamp(pinchStart.cameraDistance * (pinchStart.distance / distance), 5.4, 20);
    drawRoom();
  }
});

function finishPointer(event) {
  const wasTap = pointers.size === 1 && dragStart && !dragStart.moved;
  const rect = canvas.getBoundingClientRect();
  const tapX = event.clientX - rect.left;
  const tapY = event.clientY - rect.top;
  pointers.delete(event.pointerId);
  if (pointers.size === 0) {
    canvas.classList.remove('dragging');
    dragStart = null;
    pinchStart = null;
    scheduleCameraSave();
    if (wasTap) openSurfaceEditor(surfaceAtPoint(tapX, tapY));
  } else if (pointers.size === 1) {
    const point = [...pointers.values()][0];
    dragStart = { x: point.x, y: point.y, yaw: camera.yaw, pitch: camera.pitch, moved: true };
    pinchStart = null;
  }
}
canvas.addEventListener('pointerup', finishPointer);
canvas.addEventListener('pointercancel', finishPointer);

canvas.addEventListener('wheel', event => {
  event.preventDefault();
  markInteracted();
  camera.distance = clamp(camera.distance * Math.exp(event.deltaY * .001), 5.4, 20);
  drawRoom();
  scheduleCameraSave();
}, { passive: false });

$('resetViewButton').addEventListener('click', () => {
  Object.assign(camera, DEFAULT_CAMERA);
  const fit = Math.max(dimensions.lengthMm, dimensions.widthMm, dimensions.heightMm) / 1000 * 1.35;
  camera.distance = clamp(fit, 5.4, 20);
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
    loadDimensionsFromProject();
    restoreCameraFromProject();
    renderContext();
    drawRoom();
  } catch (_) {
    showError(copy('loadError'));
  }
}

init();
