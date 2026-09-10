const STORAGE_KEY = 'bizet_os_project_id';
const STANDARD_WALLS = {
  WALL_CENTER: ['A'],
  WALL_LEFT: ['A'],
  WALL_RIGHT: ['A'],
  L_LEFT: ['B', 'A'],
  L_RIGHT: ['A', 'C'],
  U_SHAPE: ['B', 'A', 'C'],
};

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

function safeMessage(error) {
  if (typeof error?.message === 'string' && error.message && error.message !== '[object Object]') return error.message;
  return 'Не удалось открыть коммуникации. Вернитесь к размерам помещения и повторите попытку.';
}

function applyCommunicationsCopy() {
  document.body.classList.add('communications-only');
  const title = document.getElementById('elementsTitle');
  const subtitle = document.getElementById('elementsSubtitle');
  const eyebrow = document.getElementById('elementsEyebrow');
  if (title) title.textContent = 'Укажите коммуникации';
  if (subtitle) subtitle.textContent = 'Добавьте коммуникации на задействованные стены.';
  if (eyebrow) eyebrow.hidden = true;
  document.querySelector('.configuration-card')?.setAttribute('hidden', '');

  const back = document.querySelector('.topbar .back-button');
  const id = projectId();
  if (back && id) back.href = `/room?project=${encodeURIComponent(id)}`;
}

function customPlaceholder() {
  let card = document.getElementById('customCommunicationsPlaceholder');
  if (card) return card;
  card = document.createElement('section');
  card.id = 'customCommunicationsPlaceholder';
  card.className = 'custom-communications-placeholder';
  card.innerHTML = `
    <h2>Укажите коммуникации</h2>
    <p>Кастомная траектория сохранена и подтверждена. Привязка коммуникаций к её распознанным стенам будет подключена после слоя распознавания конфигурации.</p>
    <button type="button" class="primary-button" id="customCommunicationsBack">Вернуться к конфигурации</button>`;
  const heading = document.querySelector('.elements-heading');
  heading?.insertAdjacentElement('afterend', card);
  card.querySelector('#customCommunicationsBack')?.addEventListener('click', () => {
    const id = projectId();
    window.location.assign(`/${id ? `?project=${encodeURIComponent(id)}` : ''}`);
  });
  return card;
}

async function loadCurrentProject() {
  const id = projectId();
  if (!id) throw new Error('Текущий проект не найден. Вернитесь к выбору конфигурации.');
  const response = await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Текущий проект не найден. Вернитесь к выбору конфигурации.');
  return response.json();
}

async function prepareCommunicationsScreen() {
  applyCommunicationsCopy();
  const errorBanner = document.getElementById('errorBanner');
  if (errorBanner) errorBanner.hidden = true;

  try {
    const project = await loadCurrentProject();
    const configuration = project?.room?.configuration || project?.scene?.visual_settings?.furniture_configuration || '';
    const persistedWalls = project?.scene?.visual_settings?.configuration_walls;
    const walls = Array.isArray(persistedWalls) && persistedWalls.length ? persistedWalls : (STANDARD_WALLS[configuration] || []);

    if (configuration === 'CUSTOM' && !walls.length) {
      document.getElementById('wallWorkflow')?.setAttribute('hidden', '');
      customPlaceholder();
      return;
    }

    const select = document.getElementById('configurationSelect');
    if (select && configuration && select.value !== configuration) {
      select.value = configuration;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Existing wall engine remains the source of truth. We only expose it as the dedicated next screen.
    window.setTimeout(() => {
      const workflow = document.getElementById('wallWorkflow');
      if (workflow && walls.length) workflow.hidden = false;
      applyCommunicationsCopy();
    }, 120);
  } catch (error) {
    if (errorBanner) {
      errorBanner.textContent = safeMessage(error);
      errorBanner.hidden = false;
    }
  }
}

const copyObserver = new MutationObserver(() => applyCommunicationsCopy());
copyObserver.observe(document.documentElement, { childList: true, subtree: true });
applyCommunicationsCopy();
window.setTimeout(prepareCommunicationsScreen, 0);
