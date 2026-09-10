(() => {
  const title = document.getElementById('stepTitle');
  const subtitle = document.getElementById('stepSubtitle');
  const grid = document.getElementById('choiceGrid');
  const intro = document.getElementById('introBlock');
  if (!title || !subtitle || !grid || !intro) return;

  const lang = localStorage.getItem('bizet_os_language') || 'ru';
  const ru = lang === 'ru';
  document.documentElement.lang = lang;

  title.textContent = ru ? 'Выберите тип объекта' : 'Choose the property type';
  subtitle.textContent = ru
    ? 'Выберите подходящий вариант. Остальные данные BIZET OS подготовит после вашего выбора.'
    : 'Choose the option that fits. BIZET OS will prepare the rest after your selection.';

  const items = ru
    ? ['Новострой', 'Старый фонд', 'Частный дом', 'Коммерческое помещение']
    : ['New build', 'Historic building', 'Private house', 'Commercial space'];
  const values = ['NEW_BUILD', 'OLD_STOCK', 'PRIVATE_HOUSE', 'COMMERCIAL'];
  const fallbacks = [
    'linear-gradient(145deg,#d9dde2,#7f8790)',
    'linear-gradient(145deg,#c8b7a5,#66574b)',
    'linear-gradient(145deg,#d7d0c4,#857764)',
    'linear-gradient(145deg,#c6c4bf,#6b6b69)'
  ];

  grid.dataset.count = '4';
  grid.dataset.kind = 'object_type';
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = items.map((label, index) => `
    <button class="choice-card fast-paint-card" type="button" data-fast-value="${values[index]}"
      aria-disabled="true" tabindex="-1"
      style="--card-image:none;--card-fallback:${fallbacks[index]};--variant-filter:none;pointer-events:none">
      <span class="card-content"><span class="card-title">${label}</span></span>
    </button>`).join('');

  document.body.classList.add('fast-first-paint');

  // If the API/bootstrap is merely slow, keep the full first screen visible rather than a loading placeholder.
  window.addEventListener('bizet-start-ready', () => {
    document.body.classList.remove('fast-first-paint');
    grid.removeAttribute('aria-busy');
  }, { once: true });
})();
