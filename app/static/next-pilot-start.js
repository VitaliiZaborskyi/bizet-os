const CTA_BY_KIND = {
  object_type: { ru: 'Выберите тип объекта', en: 'Choose the property type' },
  product_type: { ru: 'Выберите тип изделия', en: 'Choose the furniture type' },
  complexity_category: { ru: 'Выберите уровень комплектации', en: 'Choose the configuration level' },
  visual_direction: { ru: 'Выберите оформление', en: 'Choose the styling' },
};

function isRu() {
  return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru') === 'ru';
}

function applyStartPilotCopy() {
  const grid = document.getElementById('choiceGrid');
  const title = document.getElementById('stepTitle');
  const kind = grid?.dataset?.kind;
  const copy = CTA_BY_KIND[kind];
  if (title && copy) title.textContent = isRu() ? copy.ru : copy.en;

  document.querySelectorAll('.step-meta,.progress,.configuration-screen-five .config-screen-kicker,.configuration-screen-five .screen-five-progress')
    .forEach(node => { node.hidden = true; node.style.display = 'none'; });

  const screenFiveTitle = document.querySelector('#configurationScreenFive h1');
  if (screenFiveTitle) screenFiveTitle.textContent = isRu() ? 'Выберите конфигурацию кухни' : 'Choose the kitchen configuration';
  const screenFiveHelp = document.querySelector('#configurationScreenFive .config-screen-help');
  if (screenFiveHelp) screenFiveHelp.textContent = isRu()
    ? 'Выберите схему, которая ближе всего к вашему помещению.'
    : 'Choose the layout closest to your room.';
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

const observer = new MutationObserver(applyStartPilotCopy);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-kind','hidden'] });

document.getElementById('languageSelect')?.addEventListener('change', () => setTimeout(applyStartPilotCopy, 0));
applyStartPilotCopy();
