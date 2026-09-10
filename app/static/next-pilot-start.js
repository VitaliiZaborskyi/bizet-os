const CTA_BY_KIND = {
  object_type: { ru: 'Выберите тип объекта', en: 'Choose the property type' },
  product_type: { ru: 'Выберите тип изделия', en: 'Choose the furniture type' },
  complexity_category: { ru: 'Выберите уровень комплектации', en: 'Choose the configuration level' },
  visual_direction: { ru: 'Выберите оформление', en: 'Choose the styling' },
};

function isRu() {
  return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru') === 'ru';
}

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function hideIfVisible(node) {
  if (!node) return;
  if (!node.hidden) node.hidden = true;
  if (node.style.display !== 'none') node.style.display = 'none';
}

function applyStartPilotCopy() {
  const grid = document.getElementById('choiceGrid');
  const title = document.getElementById('stepTitle');
  const kind = grid?.dataset?.kind;
  const cta = CTA_BY_KIND[kind];
  if (title && cta) setTextIfChanged(title, isRu() ? cta.ru : cta.en);

  document.querySelectorAll('.step-meta,.progress,.configuration-screen-five .config-screen-kicker,.configuration-screen-five .screen-five-progress')
    .forEach(hideIfVisible);

  const screenFiveTitle = document.querySelector('#configurationScreenFive h1');
  if (screenFiveTitle) {
    setTextIfChanged(screenFiveTitle, isRu() ? 'Выберите конфигурацию кухни' : 'Choose the kitchen configuration');
  }
  const screenFiveHelp = document.querySelector('#configurationScreenFive .config-screen-help');
  if (screenFiveHelp) {
    setTextIfChanged(
      screenFiveHelp,
      isRu() ? 'Выберите схему, которая ближе всего к вашему помещению.' : 'Choose the layout closest to your room.'
    );
  }
}

function projectId() {
  return sessionStorage.getItem('bizet_os_project_id') || localStorage.getItem('bizet_os_project_id') || '';
}

/* Custom configuration is a real separate page. Capture before the old card handler. */
document.addEventListener('click', event => {
  const custom = event.target.closest('[data-start-config="CUSTOM"]');
  if (!custom) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const id = projectId();
  const query = id ? `?project=${encodeURIComponent(id)}` : '';
  window.location.assign(`/custom-configuration${query}`);
}, true);

/*
 * Keep CTA overrides reactive without observing the whole document.
 * The previous documentElement/subtree observer watched the same title/hidden
 * mutations it created itself, which could create an endless MutationObserver
 * microtask loop and crash constrained mobile webviews.
 */
let applyScheduled = false;
function scheduleApplyStartPilotCopy() {
  if (applyScheduled) return;
  applyScheduled = true;
  const run = () => {
    applyScheduled = false;
    applyStartPilotCopy();
  };
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
  else window.setTimeout(run, 0);
}

const grid = document.getElementById('choiceGrid');
if (grid) {
  const gridObserver = new MutationObserver(scheduleApplyStartPilotCopy);
  gridObserver.observe(grid, {
    childList: true,
    attributes: true,
    attributeFilter: ['data-kind'],
  });
}

const experience = document.getElementById('experience');
if (experience) {
  const experienceObserver = new MutationObserver(scheduleApplyStartPilotCopy);
  experienceObserver.observe(experience, { childList: true });
}

document.getElementById('languageSelect')?.addEventListener('change', scheduleApplyStartPilotCopy);
window.addEventListener('pageshow', scheduleApplyStartPilotCopy);
applyStartPilotCopy();
