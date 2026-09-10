const STORAGE_KEY = 'bizet_os_project_id';
const CONFIG_SELECTION_KEY = 'bizet_pilot_configuration';

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
let selectedConfiguration = sessionStorage.getItem(CONFIG_SELECTION_KEY) || localStorage.getItem(CONFIG_SELECTION_KEY) || '';
let savingConfiguration = false;

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

    @media (max-width:1000px) {
      .configuration-choice-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
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

function syncConfigurationSelection() {
  document.querySelectorAll('[data-start-config]').forEach(card => {
    const selected = card.dataset.startConfig === selectedConfiguration;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  const button = document.getElementById('configurationContinue5');
  if (button) button.disabled = !selectedConfiguration || savingConfiguration;
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
  try {
    await patchProject('room.configuration', code, 'Start screen 5 kitchen configuration');
    await patchProject('scene.visual_settings.furniture_configuration', code, 'Start screen 5 kitchen configuration');
    await patchProject('scene.visual_settings.configuration_walls', config.walls, 'Start screen 5 kitchen wall sequence');
  } catch (_) {
    if (error) {
      error.textContent = isRu() ? 'Не удалось сохранить конфигурацию. Повторите выбор.' : 'Could not save the configuration. Please try again.';
      error.hidden = false;
    }
  } finally {
    savingConfiguration = false;
    syncConfigurationSelection();
  }
}

function buildScreenFive() {
  const summaryCard = document.getElementById('summaryCard');
  const experience = document.getElementById('experience');
  if (!summaryCard || summaryCard.hidden || !experience || screenFiveActive) return;

  screenFiveActive = true;
  summaryCard.hidden = true;
  experience.classList.add('screen-five-active');
  document.body.classList.add('config-screen-five-open');
  document.getElementById('backButton').hidden = false;

  const screen = document.createElement('section');
  screen.id = 'configurationScreenFive';
  screen.className = 'configuration-screen-five';
  screen.setAttribute('aria-label', isRu() ? 'Шаг 5. Конфигурация кухни' : 'Step 5. Kitchen configuration');
  screen.innerHTML = `
    <div class="screen-five-head">
      <p class="config-screen-kicker">${isRu() ? 'Шаг 5 из 5' : 'Step 5 of 5'}</p>
      <div class="screen-five-progress" aria-hidden="true"><span></span><span></span><span></span><span></span><span class="active"></span></div>
      <h1>${isRu() ? 'Выберите конфигурацию кухни' : 'Choose the kitchen configuration'}</h1>
      <p class="config-screen-help">${isRu() ? 'Вид сверху. Выберите схему, которая ближе всего к вашему помещению.' : 'Top view. Choose the plan closest to your room.'}</p>
    </div>
    <div class="configuration-choice-grid" id="startConfigurationQuest">
      ${CONFIGS.map(config => `
        <button class="configuration-choice-card" type="button" data-start-config="${config.code}" aria-pressed="false">
          ${planMarkup(config)}
          <strong class="config-card-title">${isRu() ? config.ru : config.en}</strong>
          ${config.code === 'CUSTOM' ? `<small class="config-card-note">${isRu() ? 'Нестандартная форма — уточним дальше' : 'Non-standard layout — refine it later'}</small>` : ''}
        </button>`).join('')}
    </div>
    <p class="screen-five-error" id="configurationScreenFiveError" hidden></p>
    <div class="screen-five-footer">
      <button class="primary-button screen-five-continue" id="configurationContinue5" type="button" disabled>
        <span>${isRu() ? 'Перейти в 3D' : 'Open 3D room'}</span><span aria-hidden="true">→</span>
      </button>
    </div>`;
  experience.appendChild(screen);

  screen.querySelectorAll('[data-start-config]').forEach(card => {
    card.addEventListener('click', () => saveConfiguration(card.dataset.startConfig));
  });
  screen.querySelector('#configurationContinue5').addEventListener('click', () => {
    if (!selectedConfiguration || savingConfiguration) return;
    const id = currentProjectId();
    if (!id) return;
    window.location.assign(`/room?project=${encodeURIComponent(id)}`);
  });
  syncConfigurationSelection();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function destroyScreenFive() {
  screenFiveActive = false;
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
document.getElementById('backButton')?.addEventListener('click', () => {
  if (screenFiveActive) destroyScreenFive();
}, true);

document.getElementById('languageSelect')?.addEventListener('change', () => {
  if (!screenFiveActive) return;
  destroyScreenFive();
  const summary = document.getElementById('summaryCard');
  if (summary) {
    summary.hidden = false;
    queueMicrotask(buildScreenFive);
  }
});

ensureConfigurationStyles();
mirrorProjectId();
lockPilotToKitchen();
watchForScreenFive();
