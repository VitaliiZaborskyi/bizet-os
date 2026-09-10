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
let selectedConfiguration = sessionStorage.getItem(CONFIG_SELECTION_KEY) || '';
let savingConfiguration = false;

function isRu() {
  return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru') === 'ru';
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
    .summary-card.config-screen-five { max-width:1180px; width:100%; }
    .summary-card.config-screen-five #summaryValues { display:block; }
    .summary-card.config-screen-five .visual-config-quest { margin-top:10px; }
    .summary-card.config-screen-five .visual-config-grid { margin-top:2px; }
    .summary-card.config-screen-five #continueButton { margin-top:18px; }
    .summary-card.config-screen-five #continueButton:disabled { opacity:.34; cursor:not-allowed; transform:none; }
    .config-screen-kicker { color:var(--muted); text-transform:uppercase; letter-spacing:.13em; font-size:11px; margin:0 0 7px; }
    .config-screen-help { margin:6px 0 0; color:var(--muted); font-size:13px; line-height:1.45; }
    @media (max-width:700px){
      .summary-card.config-screen-five { padding-left:0; padding-right:0; }
      .summary-card.config-screen-five > h1,
      .summary-card.config-screen-five > .config-screen-kicker,
      .summary-card.config-screen-five > .config-screen-help,
      .summary-card.config-screen-five > #continueButton { margin-left:4px; margin-right:4px; }
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
  const projectId = sessionStorage.getItem(STORAGE_KEY);
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
    card.classList.toggle('is-selected', card.dataset.startConfig === selectedConfiguration);
    card.setAttribute('aria-pressed', String(card.dataset.startConfig === selectedConfiguration));
  });
  const continueButton = document.getElementById('continueButton');
  if (continueButton && screenFiveActive) continueButton.disabled = !selectedConfiguration || savingConfiguration;
}

async function saveConfiguration(code) {
  const config = CONFIGS.find(item => item.code === code);
  if (!config) return;
  selectedConfiguration = code;
  sessionStorage.setItem(CONFIG_SELECTION_KEY, code);
  savingConfiguration = true;
  syncConfigurationSelection();
  try {
    await patchProject('room.configuration', code, 'Start screen 5 kitchen configuration');
    await patchProject('scene.visual_settings.furniture_configuration', code, 'Start screen 5 kitchen configuration');
    await patchProject('scene.visual_settings.configuration_walls', config.walls, 'Start screen 5 kitchen wall sequence');
  } catch (error) {
    const banner = document.getElementById('errorBanner');
    if (banner) {
      banner.textContent = isRu() ? 'Не удалось сохранить конфигурацию. Повторите выбор.' : 'Could not save the configuration. Please try again.';
      banner.hidden = false;
    }
  } finally {
    savingConfiguration = false;
    syncConfigurationSelection();
  }
}

function buildScreenFive() {
  const summaryCard = document.getElementById('summaryCard');
  const summaryTitle = document.getElementById('summaryTitle');
  const summaryValues = document.getElementById('summaryValues');
  const continueButton = document.getElementById('continueButton');
  const continueLabel = document.getElementById('continueLabel');
  if (!summaryCard || summaryCard.hidden || !summaryValues || !continueButton || screenFiveActive) return;

  screenFiveActive = true;
  summaryCard.classList.add('config-screen-five');
  if (summaryTitle) summaryTitle.textContent = isRu() ? 'Выберите конфигурацию кухни' : 'Choose the kitchen configuration';

  const oldKicker = summaryCard.querySelector('.config-screen-kicker');
  if (!oldKicker) {
    const kicker = document.createElement('p');
    kicker.className = 'config-screen-kicker';
    kicker.textContent = isRu() ? 'Шаг 5 из 5' : 'Step 5 of 5';
    summaryCard.insertBefore(kicker, summaryTitle || summaryCard.firstChild);
  }

  const help = document.createElement('p');
  help.className = 'config-screen-help';
  help.textContent = isRu()
    ? 'Вид сверху. Выберите схему, которая ближе всего к расположению вашей кухни.'
    : 'Top view. Choose the plan closest to your kitchen layout.';
  summaryTitle?.insertAdjacentElement('afterend', help);

  summaryValues.innerHTML = `
    <div class="visual-config-quest" id="startConfigurationQuest">
      <div class="visual-config-grid">
        ${CONFIGS.map(config => `
          <button class="visual-config-card" type="button" data-start-config="${config.code}" aria-pressed="false">
            <div class="config-mini-plan ${config.cls}">${cardLines(config.cls)}</div>
            <strong>${isRu() ? config.ru : config.en}</strong>
            ${config.code === 'CUSTOM' ? `<small>${isRu() ? 'Нестандартная форма' : 'Non-standard layout'}</small>` : ''}
          </button>`).join('')}
      </div>
    </div>`;

  summaryValues.querySelectorAll('[data-start-config]').forEach(card => {
    card.addEventListener('click', () => saveConfiguration(card.dataset.startConfig));
  });

  if (continueLabel) continueLabel.textContent = isRu() ? 'Перейти в 3D' : 'Open 3D room';
  syncConfigurationSelection();
  window.setTimeout(() => summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function watchForScreenFive() {
  const summaryCard = document.getElementById('summaryCard');
  if (!summaryCard) return;
  const maybeBuild = () => {
    if (!summaryCard.hidden) window.setTimeout(buildScreenFive, 40);
  };
  new MutationObserver(maybeBuild).observe(summaryCard, { attributes: true, attributeFilter: ['hidden'] });
  maybeBuild();
}

function bindContinue() {
  const continueButton = document.getElementById('continueButton');
  if (!continueButton) return;
  continueButton.addEventListener('click', event => {
    if (!screenFiveActive) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!selectedConfiguration || savingConfiguration) return;
    window.location.assign('/room');
  }, true);
}

function refreshScreenFiveCopy() {
  if (!screenFiveActive) return;
  const title = document.getElementById('summaryTitle');
  const help = document.querySelector('.config-screen-help');
  const kicker = document.querySelector('.config-screen-kicker');
  const label = document.getElementById('continueLabel');
  if (title) title.textContent = isRu() ? 'Выберите конфигурацию кухни' : 'Choose the kitchen configuration';
  if (help) help.textContent = isRu() ? 'Вид сверху. Выберите схему, которая ближе всего к расположению вашей кухни.' : 'Top view. Choose the plan closest to your kitchen layout.';
  if (kicker) kicker.textContent = isRu() ? 'Шаг 5 из 5' : 'Step 5 of 5';
  if (label) label.textContent = isRu() ? 'Перейти в 3D' : 'Open 3D room';
  CONFIGS.forEach(config => {
    const card = document.querySelector(`[data-start-config="${config.code}"] strong`);
    if (card) card.textContent = isRu() ? config.ru : config.en;
  });
}

ensureConfigurationStyles();
lockPilotToKitchen();
watchForScreenFive();
bindContinue();
document.getElementById('languageSelect')?.addEventListener('change', () => setTimeout(refreshScreenFiveCopy, 0));
