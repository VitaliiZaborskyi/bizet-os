const STORAGE_KEY = 'bizet_os_project_id';
const CONFIG_KEY = 'bizet_pilot_configuration';
const canvas = document.getElementById('customDrawCanvas');
const preview = document.getElementById('customPreviewCanvas');
const clearButton = document.getElementById('clearDrawingButton');
const prepareButton = document.getElementById('preparePreviewButton');
const editButton = document.getElementById('editDrawingButton');
const confirmButton = document.getElementById('confirmDrawingButton');
const previewCard = document.getElementById('customPreviewCard');
const drawCard = document.querySelector('.custom-draw-card');
const errorNode = document.getElementById('customError');
const settingsButton = document.getElementById('settingsButton');
const settingsPanel = document.getElementById('settingsPanel');
let points = [];
let drawing = false;

function projectId() {
  const fromUrl = new URLSearchParams(window.location.search).get('project');
  const id = fromUrl || window.BIZET_PROJECT_ID || sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '';
  if (id) {
    sessionStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(STORAGE_KEY, id);
    window.BIZET_PROJECT_ID = id;
  }
  return id;
}

function resizeCanvas(target) {
  const rect = target.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  target.width = Math.round(rect.width * ratio);
  target.height = Math.round(rect.height * ratio);
  const ctx = target.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function normalizedPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

function simplifiedPoints(input) {
  if (input.length < 2) return input.slice();
  const out = [input[0]];
  for (const point of input.slice(1)) {
    const last = out[out.length - 1];
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    if (Math.hypot(dx, dy) >= 0.012) out.push(point);
  }
  if (out.length > 1 && out[out.length - 1] !== input[input.length - 1]) out.push(input[input.length - 1]);
  return out;
}

function drawPath(target, path) {
  resizeCanvas(target);
  const ctx = target.getContext('2d');
  const rect = target.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (path.length < 2) return;
  ctx.save();
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#151515';
  ctx.beginPath();
  ctx.moveTo(path[0].x * rect.width, path[0].y * rect.height);
  for (const point of path.slice(1)) ctx.lineTo(point.x * rect.width, point.y * rect.height);
  ctx.stroke();
  ctx.restore();
}

function refreshDrawing() {
  drawPath(canvas, points);
  prepareButton.disabled = points.length < 2;
}

canvas.addEventListener('pointerdown', event => {
  drawing = true;
  canvas.setPointerCapture?.(event.pointerId);
  points = [normalizedPoint(event)];
  refreshDrawing();
});
canvas.addEventListener('pointermove', event => {
  if (!drawing) return;
  const point = normalizedPoint(event);
  const last = points[points.length - 1];
  if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 0.005) {
    points.push(point);
    refreshDrawing();
  }
});
function finishDrawing(event) {
  if (!drawing) return;
  drawing = false;
  canvas.releasePointerCapture?.(event.pointerId);
  points = simplifiedPoints(points);
  refreshDrawing();
}
canvas.addEventListener('pointerup', finishDrawing);
canvas.addEventListener('pointercancel', finishDrawing);

clearButton.addEventListener('click', () => {
  points = [];
  refreshDrawing();
});

prepareButton.addEventListener('click', () => {
  points = simplifiedPoints(points);
  drawPath(preview, points);
  drawCard.hidden = true;
  previewCard.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

editButton.addEventListener('click', () => {
  previewCard.hidden = true;
  drawCard.hidden = false;
  requestAnimationFrame(refreshDrawing);
});

async function patch(path, value, reason) {
  const id = projectId();
  if (!id) throw new Error('Текущий проект не найден. Вернитесь к выбору конфигурации.');
  const response = await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, value, reason }),
  });
  if (!response.ok) {
    let message = 'Не удалось сохранить конфигурацию. Повторите попытку.';
    try {
      const payload = await response.json();
      if (typeof payload?.detail === 'string') message = payload.detail;
    } catch (_) {}
    throw new Error(message);
  }
  return response.json();
}

confirmButton.addEventListener('click', async () => {
  confirmButton.disabled = true;
  errorNode.hidden = true;
  try {
    const clean = simplifiedPoints(points);
    await patch('room.configuration', 'CUSTOM', 'Owner-confirmed custom configuration pilot');
    await patch('scene.visual_settings.furniture_configuration', 'CUSTOM', 'Owner-confirmed custom configuration pilot');
    await patch('scene.visual_settings.configuration_walls', [], 'Custom wall recognition deferred');
    await patch('scene.visual_settings.custom_configuration_drawing', {
      status: 'USER_DRAWN_UNCLASSIFIED',
      points_normalized: clean.map(point => ({ x: Number(point.x.toFixed(4)), y: Number(point.y.toFixed(4)) })),
      confirmed: true,
      recognition: 'DEFERRED_PLACEHOLDER',
    }, 'Custom configuration drawing placeholder');
    sessionStorage.setItem(CONFIG_KEY, 'CUSTOM');
    localStorage.setItem(CONFIG_KEY, 'CUSTOM');
    const id = projectId();
    window.location.assign(`/room?project=${encodeURIComponent(id)}&configuration=custom-confirmed`);
  } catch (error) {
    errorNode.textContent = error?.message || 'Не удалось сохранить конфигурацию. Повторите попытку.';
    errorNode.hidden = false;
    confirmButton.disabled = false;
  }
});

document.getElementById('customBackButton').addEventListener('click', () => {
  const id = projectId();
  window.location.assign(`/${id ? `?project=${encodeURIComponent(id)}` : ''}`);
});

settingsButton.addEventListener('click', event => {
  event.stopPropagation();
  const open = settingsPanel.hidden;
  settingsPanel.hidden = !open;
  settingsButton.setAttribute('aria-expanded', String(open));
});
settingsPanel.addEventListener('click', event => event.stopPropagation());
document.addEventListener('click', () => { settingsPanel.hidden = true; settingsButton.setAttribute('aria-expanded', 'false'); });
window.addEventListener('resize', () => {
  if (previewCard.hidden) refreshDrawing();
  else drawPath(preview, points);
});
requestAnimationFrame(refreshDrawing);
