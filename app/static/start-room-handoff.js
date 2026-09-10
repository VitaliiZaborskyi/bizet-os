const STORAGE_KEY = 'bizet_os_project_id';
const CONFIG_SELECTION_KEY = 'bizet_pilot_configuration';

const CONFIGS = [
  { code: 'WALL_CENTER', cls: 'center', ru: 'Вдоль стены по центру', en: 'Along wall — centred', walls: ['A'] },
  { code: 'WALL_LEFT', cls: 'left', ru: 'Вдоль стены в левом углу', en: 'Along wall — left corner', walls: ['A'] },
  { code: 'WALL_RIGHT', cls: 'right', ru: 'Вдоль стены в правом углу', en: 'Along wall — right corner', walls: ['A'] },
  { code: 'L_LEFT', cls: 'l-left', ru: 'Г-образная — длинное крыло влево', en: 'L-shape — long wing left', walls: ['B', 'A'] },
  { code: 'L_RIGHT', cls: 'l-right', ru: 'Г-образная — длинное крыло вправо', en: 'L-shape — long wing right', walls: ['A', 'C'] },
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
  if (!document.querySelector('link[href="/static/room-elements-latest.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/room-elements-latest.css';
    document.head.appendChild(link);
  }
  if (document.getElementById('configFirstPilotStyles')) return;
  const style = document.createElement('style');
  style.id = 'configFirstPilotStyles';
  style.textContent = `
    .pilot-disabled-choice { opacity:.34 !important; filter:grayscale(.45); cursor:not-allowed !important; pointer-events:none !important; }
    .pilot-disabled-choice::after { content:'Позже'; position:absolute; right:12px; top:12px; padding:5px 8px; border-radius:999px; background:rgba(23,23,22,.78); color:#fff; font-size:9px; font-weight:750; letter-spacing:.03em; }
    .configuration-screen-five { width:min(1180px,100%); margin:0 auto; padding:18px 0 42px; }
    .configuration-screen-five .screen-five-head { margin-bottom:18px; }
    .configuration-screen-five .config-screen-kicker { color:var(--muted); text-transform:uppercase; letter-spacing:.13em; font-size:11px; margin:0 0 8px; }
    .configuration-screen-five h1 { margin:0; }
    .configuration-screen-five .config-screen-help { margin:10px 0 0; max-width:720px; color:var(--muted); font-size:14px; line-height:1.5; }
    .configuration-screen-five .visual-config-quest { margin-top:18px; }
    .configuration-screen-five .screen-five-footer { display:flex; justify-content:flex-end; margin-top:22px; }
    .configuration-screen-five .screen-five-continue { min-width:240px; justify-content:center; }
    .configuration-screen-five .screen-five-continue:disabled { opacity:.34; cursor:not-allowed; transform:none; }
    .configuration-screen-five .screen-five-error { margin:14px 0 0; padding:11px 13px; border-radius:14px; background:#fff0ef; color:#8e2922; font-size:13px; }
    .experience.screen-five-active { min-height:calc(100vh - 150px); display:block; }
    .experience.screen-five-active #summaryCard { display:none !important; }
    @media (max-width:700px){
      .configuration-screen-five { padding:6px 0 30px; }
      .configuration-screen-five .screen-five-head { padding:0 4px; }
      .configuration-screen-five .screen-five-footer { padding:0 4px; }
      .configuration-screen-five .screen-five-continue { width:100%; }
    }
  `;
  document.head.appendChild(style);
}

function cardLines(cls) {
  if (cls === 'center' || cls === 'left' || cls === 'right') return '<span class="config-line line-a"></span>';
  if (cls === 'l-left' || cls === 'l-right') return '<span class="config-line line-a"></span><span class="config-line line-b"></span>';
  if (cls === 'u') return '<span class="config-line line-a"></span><span class="config-line line-b"></span><span class="config-line line-c"></span>';
  return '';
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
  document.getElementById('backButton').hidden = false;

  const screen = document.createElement('section');
  screen.id = 'configurationScreenFive';
  screen.className = 'configuration-screen-five';
  screen.innerHTML = `
    <div class="screen-five-head">
      <p class="config-screen-kicker">${isRu() ? 'Шаг 5 из 5' : 'Step 5 of 5'}</p>
      <h1>${isRu() ? 'Выберите конфигурацию кухни' : 'Choose the kitchen configuration'}</h1>
      <p class="config-screen-help">${isRu() ? 'Вид сверху. Выберите схему, которая ближе всего к расположению вашей кухни.' : 'Top view. Choose the plan closest to your kitchen layout.'}</p>
    </div>
    <div class="visual-config-quest" id="startConfigurationQuest">
      <div class="visual-config-grid">
        ${CONFIGS.map(config => `
          <button class="visual-config-card" type="button" data-start-config="${config.code}" aria-pressed="false">
            <div class="config-mini-plan ${config.cls}">${cardLines(config.cls)}</div>
            <strong>${isRu() ? config.ru : config.en}</strong>
            ${config.code === 'CUSTOM' ? `<small>${isRu() ? 'Нестандартная форма' : 'Non-standard layout'}</small>` : ''}
          </button>`).join('')}
      </div>
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
