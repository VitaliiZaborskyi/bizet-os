(() => {
  const PROJECT_KEY = 'bizet_os_project_id';

  function projectId() {
    return sessionStorage.getItem(PROJECT_KEY) || localStorage.getItem(PROJECT_KEY) || '';
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('#configurationContinue5');
    if (!button || button.disabled) return;
    const configuration = sessionStorage.getItem('bizet_pilot_configuration') || localStorage.getItem('bizet_pilot_configuration') || '';
    if (!configuration || configuration === 'CUSTOM') return;
    const id = projectId();
    if (!id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = configuration.startsWith('WALL_') ? '/linear-span' : '/dimensions';
    window.location.assign(`${target}?project=${encodeURIComponent(id)}`);
  }, true);
})();
