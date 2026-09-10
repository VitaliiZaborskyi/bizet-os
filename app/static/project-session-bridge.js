(function () {
  const KEY = 'bizet_os_project_id';
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('project');
  const fromSession = sessionStorage.getItem(KEY);
  const fromLocal = localStorage.getItem(KEY);
  const projectId = fromUrl || fromSession || fromLocal;

  if (projectId) {
    sessionStorage.setItem(KEY, projectId);
    localStorage.setItem(KEY, projectId);
    window.BIZET_PROJECT_ID = projectId;
  }
})();
