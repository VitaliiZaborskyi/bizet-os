const STORAGE_KEY = 'bizet_os_project_id';
const CONFIG_SELECTION_KEY = 'bizet_pilot_configuration';
const ROOM_MODEL_TARGET = 'ROOM_MODEL';

const CONFIGS = [
  { code: 'WALL_CENTER', cls: 'center', ru: 'Линейная — по центру', en: 'Linear — centred', walls: ['A'] },
  { code: 'WALL_LEFT', cls: 'left', ru: 'Линейная — от левого края', en: 'Linear — from the left', walls: ['A'] },
  { code: 'WALL_RIGHT', cls: 'right', ru: 'Линейная — от правого края', en: 'Linear — from the right', walls: ['A'] },
  { code: 'L_LEFT', cls: 'l-left', ru: 'Г-образная — крыло слева', en: 'L-shape — wing left', walls: ['B', 'A'] },
  { code: 'L_RIGHT', cls: 'l-right', ru: 'Г-образная — крыло справа', en: 'L-shape — wing right', walls: ['A', 'C'] },
  { code: 'U_SHAPE', cls: 'u', ru: 'П-образная', en: 'U-shape', walls: ['B', 'A', 'C'] },
  { code: 'CUSTOM', cls: 'custom', ru: 'Своя конфигурация', en: 'Custom configuration', walls: [] },
];

let screenFiveActive = false;
let screenFiveMode = 'SOURCE';
let selectedConfiguration = sessionStorage.getItem(CONFIG_SELECTION_KEY) || localStorage.getItem(CONFIG_SELECTION_KEY) || '';
let savingConfiguration = false;
let roomImportObjectUrl = '';
let selectedRoomImportMeta = null;

function isRu() {
  return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru') === 'ru';
}

function currentProjectId() {
  const id = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
  if (id) {
    sessionStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function mirrorProjectId() {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const id = sessionStorage.getItem(STORAGE_KEY);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
      window.clearInterval(timer);
    } else if (attempts > 50) {
      window.clearInterval(timer);
    }
  }, 100);
}

function ensureConfigurationStyles() {
  if (document.getElementById('configFirstPilotStyles')) return;
  const style = document.createElement('style');
  style.id = 'configFirstPilotStyles';
  style.textContent = `
    .pilot-disabled-choice {
      opacity:.34 !important;
      filter:grayscale(.45);
      cursor:not-allowed !important;
      pointer-events:none !important;
    }
    .pilot-disabled-choice::after {
      content:'Позже';
      position:absolute;
      right:12px;
      top:12px;
      padding:5px 8px;
      border-radius:999px;
      background:rgba(23,23,22,.78);
      color:#fff;
      font-size:9px;
      font-weight:750;
      letter-spacing:.03em;
    }

    /* Screen 5 is a real standalone Start Experience screen, not content appended below screen 4. */
    body.config-screen-five-open .topbar {
      z-index:140 !important;
      pointer-events:auto !important;
    }
    body.config-screen-five-open .topbar .icon-button,
    body.config-screen-five-open .topbar .settings-wrap,
    body.config-screen-five-open .topbar .settings-panel {
      pointer-events:auto !important;
    }
    body.config-screen-five-open .footer { display:none !important; }
    .experience.screen-five-active {
      width:min(1280px, calc(100% - 48px));
      min-height:calc(100svh - 78px);
      margin:0 auto;
      padding:34px 0 60px;
      display:block;
    }
    .experience.screen-five-active #introBlock,
    .experience.screen-five-active #choiceGrid,
    .experience.screen-five-active #summaryCard {
      display:none !important;
    }
    .configuration-screen-five {
      width:100%;
      margin:0 auto;
    }
    .configuration-screen-five .screen-five-head {
      text-align:center;
      max-width:820px;
      margin:0 auto 34px;
    }
    .configuration-screen-five .config-screen-kicker {
      margin:0 0 12px;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.08em;
      font-size:13px;
    }
    .configuration-screen-five .screen-five-progress {
      display:flex;
      justify-content:center;
      gap:7px;
      margin:0 0 28px;
    }
    .configuration-screen-five .screen-five-progress span {
      width:7px;
      height:7px;
      border-radius:999px;
      background:color-mix(in srgb, var(--ink) 14%, transparent);
    }
    .configuration-screen-five .screen-five-progress span.active {
      width:22px;
      background:var(--ink);
    }
    .configuration-screen-five h1 {
      margin:0;
      font-size:clamp(34px,5vw,64px);
      line-height:.98;
      letter-spacing:-.045em;
      font-weight:650;
    }
    .configuration-screen-five .config-screen-help {
      margin:17px auto 0;
      max-width:620px;
      color:var(--muted);
      font-size:17px;
      line-height:1.5;
    }

    .configuration-choice-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:16px;
      max-width:1180px;
      margin:0 auto;
    }
    .configuration-choice-card {
      position:relative;
      min-height:330px;
      padding:18px;
      border:1px solid var(--line);
      border-radius:28px;
      background:var(--surface);
      color:var(--ink);
      text-align:left;
      cursor:pointer;
      overflow:hidden;
      box-shadow:0 10px 0 color-mix(in srgb,var(--ink) 10%,transparent), var(--shadow);
      transform:translateY(0) scale(1);
      transition:transform .14s ease, box-shadow .14s ease, border-color .14s ease, background .14s ease;
      -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    }
    .configuration-choice-card:hover {
      transform:translateY(-3px);
      box-shadow:0 12px 0 color-mix(in srgb,var(--ink) 10%,transparent), 0 24px 58px rgba(32,29,24,.13);
    }
    .configuration-choice-card:active {
      transform:translateY(8px) scale(.99);
      box-shadow:0 2px 0 color-mix(in srgb,var(--ink) 15%,transparent), inset 0 2px 8px color-mix(in srgb,var(--ink) 8%,transparent), 0 8px 18px rgba(32,29,24,.08);
    }
    .configuration-choice-card:focus-visible {
      outline:3px solid var(--ink);
      outline-offset:3px;
    }
    .configuration-choice-card.is-selected {
      border-color:color-mix(in srgb,var(--ink) 72%,var(--line));
      background:color-mix(in srgb,var(--surface) 88%,var(--ink) 4%);
      box-shadow:0 7px 0 color-mix(in srgb,var(--ink) 17%,transparent), 0 0 0 2px color-mix(in srgb,var(--ink) 28%,transparent), var(--shadow);
    }
    .configuration-choice-card .config-card-title {
      display:block;
      margin-top:16px;
      font-size:22px;
      line-height:1.1;
      letter-spacing:-.025em;
      font-weight:650;
    }
    .configuration-choice-card .config-card-note {
      display:block;
      margin-top:7px;
      color:var(--muted);
      font-size:12px;
      line-height:1.35;
    }

    /* Owner reference: clear top-view room outline + broad kitchen runs. No pseudo-3D cabinets. */
    .config-reference-plan {
      position:relative;
      height:205px;
      border-radius:18px;
      overflow:hidden;
      background:color-mix(in srgb,var(--bg) 88%,#d8d5cf 12%);
      border:1px solid color-mix(in srgb,var(--ink) 12%,var(--line));
    }
    .config-reference-plan::before {
      content:'';
      position:absolute;
      left:9%;
      right:9%;
      top:10%;
      bottom:10%;
      border:3px solid color-mix(in srgb,var(--ink) 52%,transparent);
      border-bottom-width:2px;
      border-radius:3px;
    }
    .config-reference-plan::after {
      content:'';
      position:absolute;
      left:16%;
      right:16%;
      top:26%;
      bottom:20%;
      background:repeating-linear-gradient(90deg, color-mix(in srgb,var(--ink) 6%,transparent) 0 1px, transparent 1px 12px);
      opacity:.7;
      pointer-events:none;
    }
    .config-run {
      position:absolute;
      z-index:2;
      border-radius:4px;
      background:color-mix(in srgb,var(--ink) 78%,#4d5962 22%);
      box-shadow:inset 0 0 0 1px color-mix(in srgb,#fff 22%,transparent), 0 3px 8px rgba(0,0,0,.10);
    }
    .config-run.back { top:16%; height:18%; }
    .config-run.left-side { left:11%; top:16%; width:14%; height:63%; }
    .config-run.right-side { right:11%; top:16%; width:14%; height:63%; }
    .config-reference-plan.center .config-run.back { left:28%; right:28%; }
    .config-reference-plan.left .config-run.back { left:11%; right:39%; }
    .config-reference-plan.right .config-run.back { left:39%; right:11%; }
    .config-reference-plan.l-left .config-run.back { left:11%; right:24%; }
    .config-reference-plan.l-right .config-run.back { left:24%; right:11%; }
    .config-reference-plan.u .config-run.back { left:11%; right:11%; }
    .config-reference-plan.custom::before { border-style:dashed; }
    .config-custom-path {
      position:absolute;
      z-index:3;
      left:22%;
      top:22%;
      width:54%;
      height:52%;
      border-left:12px solid color-mix(in srgb,var(--ink) 70%,#4d5962 30%);
      border-bottom:12px solid color-mix(in srgb,var(--ink) 70%,#4d5962 30%);
      border-radius:0 0 0 18px;
      transform:skewX(-12deg);
      opacity:.8;
    }
    .config-custom-pencil {
      position:absolute;
      z-index:4;
      right:16%;
      bottom:14%;
      width:42px;
      height:42px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:var(--surface);
      border:1px solid var(--line);
      box-shadow:0 6px 16px rgba(0,0,0,.08);
      font-size:22px;
    }

    .configuration-screen-five .screen-five-footer {
      display:flex;
      justify-content:center;
      margin-top:28px;
    }
    .configuration-screen-five .screen-five-continue {
      min-width:280px;
      justify-content:center;
      min-height:58px;
      box-shadow:0 6px 0 color-mix(in srgb,var(--ink) 18%,transparent), 0 12px 26px rgba(0,0,0,.10);
      transition:transform .12s ease, box-shadow .12s ease;
    }
    .configuration-screen-five .screen-five-continue:active:not(:disabled) {
      transform:translateY(5px);
      box-shadow:0 1px 0 color-mix(in srgb,var(--ink) 18%,transparent), 0 5px 12px rgba(0,0,0,.08);
    }
    .configuration-screen-five .screen-five-continue:disabled {
      opacity:.32;
      cursor:not-allowed;
      transform:none;
      box-shadow:none;
    }
    .configuration-screen-five .screen-five-error {
      max-width:720px;
      margin:18px auto 0;
      padding:11px 13px;
      border-radius:14px;
      background:#fff0ef;
      color:#8e2922;
      text-align:center;
      font-size:13px;
    }
    .configuration-screen-five .config-auto-note {
      margin:22px auto 0;
      color:var(--muted);
      text-align:center;
      font-size:12px;
      line-height:1.45;
    }

    @media (max-width:1000px) {
      .configuration-choice-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }

    .room-source-choice-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:16px;
      max-width:980px;
      margin:0 auto;
    }
    .room-source-card{
      min-height:220px;
      border:1px solid var(--line);
      border-radius:26px;
      background:color-mix(in srgb,var(--surface) 92%,transparent);
      color:var(--ink);
      padding:22px 18px;
      text-align:left;
      cursor:pointer;
      box-shadow:0 8px 0 color-mix(in srgb,var(--ink) 10%,transparent),var(--shadow);
      transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;
      -webkit-tap-highlight-color:transparent;
    }
    .room-source-card:active{transform:translateY(6px);box-shadow:0 2px 0 color-mix(in srgb,var(--ink) 14%,transparent),0 8px 18px rgba(0,0,0,.08)}
    .room-source-card:focus-visible{outline:3px solid #2f7cff;outline-offset:3px}
    .room-source-visual{
      height:118px;
      border-radius:18px;
      margin-bottom:17px;
      position:relative;
      overflow:hidden;
      background:color-mix(in srgb,var(--bg) 80%,#2f7cff 20%);
      border:1px solid color-mix(in srgb,var(--ink) 10%,transparent);
    }
    .room-source-visual.template::before{content:'';position:absolute;inset:22px;border:2px solid color-mix(in srgb,var(--ink) 58%,transparent);border-radius:8px;box-shadow:inset 0 0 0 10px color-mix(in srgb,#2f7cff 12%,transparent)}
    .room-source-visual.file::before{content:'PDF  JPG';position:absolute;inset:0;display:grid;place-items:center;font-size:20px;font-weight:800;letter-spacing:.08em;color:color-mix(in srgb,var(--ink) 80%,#2f7cff)}
    .room-source-visual.scan::before{content:'';position:absolute;inset:22px;border:2px dashed #2f7cff;border-radius:14px}
    .room-source-visual.scan::after{content:'';position:absolute;left:18px;right:18px;top:50%;height:2px;background:#2f7cff;box-shadow:0 0 18px rgba(47,124,255,.65)}
    .room-source-card strong{display:block;font-size:24px;letter-spacing:-.025em}
    .room-source-card small{display:block;margin-top:8px;color:var(--muted);font-size:13px;line-height:1.4}
    .room-source-status{max-width:760px;margin:20px auto 0;text-align:center;color:var(--muted);font-size:13px;min-height:20px}
    .room-source-file-wrap{max-width:760px;margin:22px auto 0}
    .room-source-next{display:block;min-width:280px;margin:18px auto 0}
    @media(max-width:700px){
      .room-source-choice-grid{grid-template-columns:1fr;gap:12px}
      .room-source-card{min-height:148px;display:grid;grid-template-columns:112px 1fr;column-gap:16px;align-items:center;padding:12px 14px}
      .room-source-visual{height:112px;margin:0}
      .room-source-card strong{font-size:22px}
      .room-source-card small{margin-top:5px}
    }

    @media (max-width:700px) {
      body.config-screen-five-open .topbar { z-index:160 !important; }
      .experience.screen-five-active {
        width:min(100% - 24px,620px);
        min-height:calc(100svh - 66px);
        padding:18px 0 36px;
      }
      .configuration-screen-five .screen-five-head { margin-bottom:23px; }
      .configuration-screen-five .config-screen-kicker { font-size:12px; }
      .configuration-screen-five .config-screen-help { font-size:15px; }
      .configuration-choice-grid { grid-template-columns:1fr; gap:14px; }
      .configuration-choice-card {
        min-height:285px;
        border-radius:22px;
        padding:14px;
      }
      .config-reference-plan { height:185px; border-radius:15px; }
      .configuration-choice-card .config-card-title { font-size:24px; }
      .configuration-screen-five .screen-five-footer { position:sticky; bottom:max(10px,env(safe-area-inset-bottom)); z-index:12; padding-top:8px; }
      .configuration-screen-five .screen-five-continue { width:100%; min-width:0; }
    }
  `;
  document.head.appendChild(style);
}

function planMarkup(config) {
  if (config.cls === 'custom') {
    return `<div class="config-reference-plan custom"><span class="config-custom-path"></span><span class="config-custom-pencil" aria-hidden="true">✎</span></div>`;
  }
  const runs = ['<span class="config-run back"></span>'];
  if (config.cls === 'l-left' || config.cls === 'u') runs.push('<span class="config-run left-side"></span>');
  if (config.cls === 'l-right' || config.cls === 'u') runs.push('<span class="config-run right-side"></span>');
  return `<div class="config-reference-plan ${config.cls}">${runs.join('')}</div>`;
}

function lockPilotToKitchen() {
  const grid = document.getElementById('choiceGrid');
  if (!grid) return;
  const inspect = () => {
    const buttons = [...grid.querySelectorAll('button')];
    if (!buttons.length) return;
    const texts = buttons.map(button => (button.textContent || '').trim().toLowerCase());
    const isZoneScreen = texts.some(text => text.includes('кухня') || text.includes('kitchen')) &&
      texts.some(text => text.includes('спаль') || text.includes('bedroom') || text.includes('гостин') || text.includes('living'));
    if (!isZoneScreen) return;
    buttons.forEach(button => {
      const text = (button.textContent || '').trim().toLowerCase();
      const kitchen = text.includes('кухня') || text.includes('kitchen');
      if (kitchen) {
        button.disabled = false;
        button.classList.remove('pilot-disabled-choice');
        button.removeAttribute('aria-disabled');
      } else {
        button.disabled = true;
        button.classList.add('pilot-disabled-choice');
        button.setAttribute('aria-disabled', 'true');
        button.title = isRu() ? 'В текущем пилоте доступна только кухня' : 'Only Kitchen is active in this pilot';
      }
    });
  };
  new MutationObserver(inspect).observe(grid, { childList: true, subtree: true });
  inspect();
}

async function patchProject(path, value, reason) {
  const projectId = currentProjectId();
  if (!projectId) throw new Error('project_not_found');
  const response = await fetch(`/api/v1.1/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, value, reason }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'patch_failed');
  }
  return response.json();
}

async function roomImportRequest(path, options={}) {
  const projectId=currentProjectId();
  if(!projectId)throw new Error('project_not_found');
  const response=await fetch(`/api/v1.1/projects/${encodeURIComponent(projectId)}/room-import/${path}`,options);
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.detail||'room_import_failed');
  return payload;
}

function roomImportOverlay(analysis) {
  const segments=Array.isArray(analysis?.segments_norm)?analysis.segments_norm:[];
  const contour=Array.isArray(analysis?.contour_norm)?analysis.contour_norm:[];
  const lineHtml=segments.slice(0,40).map(s=>`<line x1="${s[0]*1000}" y1="${s[1]*1000}" x2="${s[2]*1000}" y2="${s[3]*1000}"/>`).join('');
  const poly=contour.length?contour.map(p=>`${p[0]*1000},${p[1]*1000}`).join(' '):'';
  return `<svg class="start-room-analysis-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">${poly?`<polygon points="${poly}"/>`:''}${lineHtml}</svg>`;
}

function roomImportKind(file) {
  const name = String(file?.name || '').toLowerCase();
  const mime = String(file?.type || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  if (mime.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(name)) return 'PHOTO';
  return 'UNSUPPORTED';
}

function clearRoomImportPreview() {
  if (roomImportObjectUrl) URL.revokeObjectURL(roomImportObjectUrl);
  roomImportObjectUrl = '';
}

async function handleStartRoomFile(file) {
  const panel = document.getElementById('startRoomFilePanel');
  const preview = document.getElementById('startRoomFilePreview');
  const meta = document.getElementById('startRoomFileMeta');
  const status = document.getElementById('startRoomFileStatus');
  if (!panel || !preview || !meta || !status || !file) return;
  const kind = roomImportKind(file);
  panel.hidden = false;
  status.textContent = '';
  if (kind === 'UNSUPPORTED') {
    preview.innerHTML = '';
    meta.textContent = isRu() ? 'Этот формат пока не поддерживается. Используйте PDF или фотографию.' : 'This format is not supported yet. Use PDF or an image.';
    selectedRoomImportMeta = null;
    return;
  }
  clearRoomImportPreview();
  roomImportObjectUrl = URL.createObjectURL(file);
  preview.innerHTML = kind === 'PDF'
    ? `<object data="${roomImportObjectUrl}" type="application/pdf" class="start-room-file-object"><div class="start-room-pdf-fallback">PDF · ${file.name}</div></object>`
    : `<img src="${roomImportObjectUrl}" alt="${file.name.replace(/"/g,'&quot;')}" class="start-room-file-image">`;
  meta.textContent = `${file.name} · ${kind} · ${Math.max(1, Math.round(file.size / 1024))} KB`;
  status.textContent = isRu() ? 'Анализирую геометрию…' : 'Analyzing geometry…';

  try {
    const form=new FormData();form.append('file',file,file.name);
    const response=await roomImportRequest('analyze',{method:'POST',body:form});
    selectedRoomImportMeta=response.room_import;
    const analysis=selectedRoomImportMeta?.analysis||{};
    preview.insertAdjacentHTML('beforeend',roomImportOverlay(analysis));
    const confidence=Math.round((Number(analysis.confidence)||0)*100);
    status.textContent = isRu()
      ? `BIZET нашёл предварительный контур и ${analysis.segments_norm?.length||0} опорных линий · confidence ${confidence}%. Укажите один известный размер.`
      : `BIZET found a preliminary contour and ${analysis.segments_norm?.length||0} reference lines · confidence ${confidence}%. Enter one known dimension.`;
  } catch (error) {
    selectedRoomImportMeta=null;
    status.textContent = (isRu() ? 'Не удалось проанализировать файл: ' : 'Could not analyze file: ') + error.message;
  }
}

function bindStartRoomImport(screen) {
  const button = screen.querySelector('#startUploadFileButton');
  const input = screen.querySelector('#startRoomFileInput');
  const apply = screen.querySelector('#startRoomScaleApply');
  const confirm = screen.querySelector('#startRoomConfirm');
  if (!button || !input || !apply || !confirm) return;
  button.onclick = () => input.click();
  input.onchange = () => handleStartRoomFile(input.files?.[0]);
  apply.onclick = async () => {
    const status = screen.querySelector('#startRoomFileStatus');
    const known = Math.round(Number(screen.querySelector('#startRoomKnownDimension')?.value) || 0);
    if (!selectedRoomImportMeta) {
      status.textContent = isRu() ? 'Сначала загрузите PDF или фотографию.' : 'Upload a PDF or image first.';
      return;
    }
    if (known < 300) {
      status.textContent = isRu() ? 'Укажите известный размер не меньше 300 мм.' : 'Enter a known dimension of at least 300 mm.';
      return;
    }
    try{
      const response=await roomImportRequest('calibrate',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({known_dimension_mm:known})
      });
      selectedRoomImportMeta=response.room_import;
      const size=selectedRoomImportMeta?.canonical_room_model?.bounding_size_mm||{};
      const walls=selectedRoomImportMeta?.canonical_room_model?.walls||[];
      status.innerHTML = isRu()
        ? `<strong>Room Model:</strong> ${size.length||'—'} × ${size.depth||'—'} мм · стены ${walls.map(w=>w.label).join(', ')}. Это уже записано в геометрию проекта. Проверьте и подтвердите.`
        : `<strong>Room Model:</strong> ${size.length||'—'} × ${size.depth||'—'} mm · walls ${walls.map(w=>w.label).join(', ')}. It is now applied to project geometry. Review and confirm.`;
      confirm.hidden=false;
    }catch(error){
      status.textContent=(isRu()?'Калибровка не применена: ':'Calibration failed: ')+error.message;
    }
  };
  confirm.onclick=async()=>{
    const status=screen.querySelector('#startRoomFileStatus');
    try{
      const project=await roomImportRequest('confirm',{method:'POST'});
      selectedRoomImportMeta=project.scene?.visual_settings?.room_import||selectedRoomImportMeta;
      confirm.hidden=true;
      status.textContent=isRu()?'Помещение подтверждено. Эти размеры будут использованы при построении 3D.':'Room confirmed. These dimensions will be used for the 3D model.';
      const next=screen.querySelector('#startRoomSourceContinue');if(next)next.hidden=false;
    }catch(error){status.textContent=(isRu()?'Не удалось подтвердить: ':'Could not confirm: ')+error.message}
  };
}


function syncConfigurationSelection() {
  document.querySelectorAll('[data-start-config]').forEach(card => {
    const selected = card.dataset.startConfig === selectedConfiguration;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
}

async function saveConfiguration(code) {
  const config = CONFIGS.find(item => item.code === code);
  if (!config) return;
  selectedConfiguration = code;
  sessionStorage.setItem(CONFIG_SELECTION_KEY, code);
  localStorage.setItem(CONFIG_SELECTION_KEY, code);
  savingConfiguration = true;
  syncConfigurationSelection();
  const error = document.getElementById('configurationScreenFiveError');
  if (error) error.hidden = true;
  let saved = false;
  try {
    await patchProject('room.configuration', code, 'Start screen 5 kitchen configuration');
    await patchProject('scene.visual_settings.furniture_configuration', code, 'Start screen 5 kitchen configuration');
    await patchProject('scene.visual_settings.configuration_walls', config.walls, 'Start screen 5 kitchen wall sequence');
    saved = true;
  } catch (_) {
    if (error) {
      error.textContent = isRu() ? 'Не удалось сохранить конфигурацию. Повторите выбор.' : 'Could not save the configuration. Please try again.';
      error.hidden = false;
    }
  } finally {
    savingConfiguration = false;
    syncConfigurationSelection();
  }
  if (saved) {
    const id = currentProjectId();
    if (id) {
      sessionStorage.setItem('bizet_route_splash','1');
      window.location.assign('/workspace?project=' + encodeURIComponent(id));
    }
  }
}

function renderConfigurationScreen(screen) {
  screenFiveMode='CONFIGURATION';
  document.body.dataset.startKind='configuration';
  screen.setAttribute('aria-label',isRu()?'Конфигурация кухни':'Kitchen configuration');
  screen.innerHTML=`
    <div class="screen-five-head">
      <h1>${isRu()?'Выберите конфигурацию кухни':'Choose the kitchen configuration'}</h1>
      <p class="config-screen-help">${isRu()?'Вид сверху. Выберите схему, которая ближе всего к вашему помещению.':'Top view. Choose the plan closest to your room.'}</p>
    </div>
    <div class="configuration-choice-grid" id="startConfigurationQuest">
      ${CONFIGS.filter(config=>config.code!=='CUSTOM').map(config=>`
        <button class="configuration-choice-card" type="button" data-start-config="${config.code}" aria-pressed="false">
          ${planMarkup(config)}
          <strong class="config-card-title">${isRu()?config.ru:config.en}</strong>
        </button>`).join('')}
      <button class="configuration-choice-card configuration-custom-choice" type="button" data-start-config="CUSTOM" aria-pressed="false">
        <span class="configuration-custom-pencil" aria-hidden="true">✎</span>
        <strong class="config-card-title">${isRu()?'Своя конфигурация · скоро':'Custom configuration · soon'}</strong>
      </button>
    </div>
    <p class="screen-five-error" id="configurationScreenFiveError" hidden></p>
    <p class="config-auto-note">${isRu()?'После выбора конфигурации BIZET OS откроет первый 3D-вариант.':'After choosing a configuration BIZET OS opens the first 3D option.'}</p>`;
  screen.querySelectorAll('[data-start-config]').forEach(card=>card.addEventListener('click',()=>saveConfiguration(card.dataset.startConfig)));
  const custom=screen.querySelector('[data-start-config="CUSTOM"]');
  if(custom){custom.disabled=true;custom.classList.add('pilot-disabled-choice');custom.title=isRu()?'Временно недоступно · дорабатывается':'Temporarily unavailable';}
  syncConfigurationSelection();
  window.scrollTo({top:0,behavior:'auto'});
}

function renderRoomSourceScreen(screen) {
  screenFiveMode='SOURCE';
  document.body.dataset.startKind='room_source';
  screen.setAttribute('aria-label',isRu()?'Исходные данные помещения':'Room input source');
  screen.innerHTML=`
    <div class="screen-five-head">
      <h1>${isRu()?'Как начнём работу с помещением?':'How should we start with the room?'}</h1>
      <p class="config-screen-help">${isRu()?'Выберите источник исходных данных. Этот шаг используется до выбора конфигурации изделия.':'Choose the input source before selecting the product configuration.'}</p>
    </div>
    <div class="room-source-choice-grid">
      <button class="room-source-card" id="startTemplateButton" type="button">
        <span class="room-source-visual template"></span>
        <span><strong>${isRu()?'Шаблон':'Template'}</strong><small>${isRu()?'Работаем с базовой геометрией и уточняем размеры вручную.':'Start from base geometry and refine dimensions.'}</small></span>
      </button>
      <button class="room-source-card" id="startUploadFileButton" type="button">
        <span class="room-source-visual file"></span>
        <span><strong>${isRu()?'Загрузить файл':'Upload file'}</strong><small>${isRu()?'PDF или фотография помещения.':'PDF or room photo.'}</small></span>
      </button>
      <button class="room-source-card" id="startScanButton" type="button">
        <span class="room-source-visual scan"></span>
        <span><strong>${isRu()?'Скан':'Scan'}</strong><small>${isRu()?'Сканирование помещения будет подключено отдельным слоем.':'Room scanning will be connected as a separate layer.'}</small></span>
      </button>
    </div>
    <input id="startRoomFileInput" type="file" accept=".pdf,image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" hidden>
    <div class="room-source-file-wrap">
      <div class="start-room-file-panel" id="startRoomFilePanel" hidden>
        <div class="start-room-file-preview" id="startRoomFilePreview"></div>
        <p class="start-room-file-meta" id="startRoomFileMeta"></p>
        <label class="start-room-known-dimension"><span>${isRu()?'Один известный реальный размер, мм':'One known real dimension, mm'}</span><input id="startRoomKnownDimension" type="number" inputmode="numeric" min="300" step="1" placeholder="3000"></label>
        <button class="start-room-scale-apply" id="startRoomScaleApply" type="button">${isRu()?'Применить масштаб':'Apply scale'}</button>
        <button class="start-room-confirm" id="startRoomConfirm" type="button" hidden>${isRu()?'Подтвердить помещение':'Confirm room'}</button>
        <p class="start-room-file-status" id="startRoomFileStatus"></p>
      </div>
    </div>
    <p class="room-source-status" id="roomSourceStatus"></p>
    <button class="primary-button room-source-next" id="startRoomSourceContinue" type="button" hidden><span>${isRu()?'Далее к конфигурации':'Continue to configuration'}</span><span class="button-arrow" aria-hidden="true">→</span></button>`;

  screen.querySelector('#startTemplateButton')?.addEventListener('click',async()=>{
    try{await patchProject('scene.visual_settings.room_input_mode','TEMPLATE','Room input source: template')}catch(_){}
    renderConfigurationScreen(screen);
  });
  screen.querySelector('#startScanButton')?.addEventListener('click',()=>{
    const status=screen.querySelector('#roomSourceStatus');
    if(status)status.textContent=isRu()?'Скан — в стадии разработки.':'Scan — in development.';
  });
  screen.querySelector('#startRoomSourceContinue')?.addEventListener('click',()=>renderConfigurationScreen(screen));
  bindStartRoomImport(screen);
  window.scrollTo({top:0,behavior:'auto'});
}

function buildScreenFive() {
  const summaryCard=document.getElementById('summaryCard');
  const experience=document.getElementById('experience');
  if(!summaryCard||summaryCard.hidden||!experience||screenFiveActive)return;
  screenFiveActive=true;
  summaryCard.hidden=true;
  experience.classList.add('screen-five-active');
  document.body.classList.add('config-screen-five-open');
  document.getElementById('backButton').hidden=false;
  const screen=document.createElement('section');
  screen.id='configurationScreenFive';
  screen.className='configuration-screen-five';
  experience.appendChild(screen);
  renderRoomSourceScreen(screen);
}
function destroyScreenFive() {
  screenFiveActive = false;
  screenFiveMode = 'SOURCE';
  clearRoomImportPreview();
  document.getElementById('configurationScreenFive')?.remove();
  document.getElementById('experience')?.classList.remove('screen-five-active');
  document.body.classList.remove('config-screen-five-open');
}

function watchForScreenFive() {
  const summaryCard = document.getElementById('summaryCard');
  if (!summaryCard) return;
  const maybeBuild = () => {
    if (!summaryCard.hidden && !screenFiveActive) buildScreenFive();
  };
  new MutationObserver(maybeBuild).observe(summaryCard, { attributes: true, attributeFilter: ['hidden'] });
  maybeBuild();
}

/* Let start.js own navigation. Capture only removes screen 5 so its regular Back handler can restore screen 4. */
document.getElementById('backButton')?.addEventListener('click', (event) => {
  if (!screenFiveActive) return;
  if (screenFiveMode==='CONFIGURATION') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const screen=document.getElementById('configurationScreenFive');
    if(screen)renderRoomSourceScreen(screen);
    return;
  }
  destroyScreenFive();
}, true);

document.getElementById('languageSelect')?.addEventListener('change', () => {
  if (!screenFiveActive) return;
  const screen=document.getElementById('configurationScreenFive');
  if(!screen)return;
  if(screenFiveMode==='CONFIGURATION')renderConfigurationScreen(screen);else renderRoomSourceScreen(screen);
});

ensureConfigurationStyles();
mirrorProjectId();
lockPilotToKitchen();
watchForScreenFive();
