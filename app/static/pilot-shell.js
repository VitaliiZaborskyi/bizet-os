(() => {
  const THEME_KEY = 'bizet_os_theme';
  const LANGUAGE_KEY = 'bizet_os_language';
  const FEEDBACK_KEY = 'bizet_os_pilot_feedback';
  const button = document.getElementById('settingsButton');

  let theme = localStorage.getItem(THEME_KEY) || 'light';
  let language = localStorage.getItem(LANGUAGE_KEY) || 'ru';

  const COPY = {
    ru: {
      settings:'Настройки', theme:'Тема', light:'Светлая', dark:'Тёмная', language:'Язык',
      feedback:'Обратная связь', tutorial:'Как пользоваться системой', login:'Войти', register:'Регистрация',
      auth:'Вход и регистрация будут подключены отдельным слоем аккаунта. Гостевой режим остаётся доступным.',
      feedbackTitle:'Обратная связь', feedbackCopy:'Опишите вопрос, идею или замечание.', feedbackPlaceholder:'Ваше сообщение', feedbackSubmit:'Сохранить для пилота', feedbackSaved:'Сообщение сохранено в этом браузере для текущего пилота.',
      tutorialTitle:'Как пользоваться системой', tutorialCopy:'Видеоинструкция будет подключена после утверждения сценария.'
    },
    en: {
      settings:'Settings', theme:'Theme', light:'Light', dark:'Dark', language:'Language',
      feedback:'Feedback', tutorial:'How to use the system', login:'Sign in', register:'Register',
      auth:'Sign in and registration will be connected as a separate account layer. Guest mode remains available.',
      feedbackTitle:'Feedback', feedbackCopy:'Describe a question, idea, or issue.', feedbackPlaceholder:'Your message', feedbackSubmit:'Save for pilot', feedbackSaved:'The message has been saved in this browser for the current pilot.',
      tutorialTitle:'How to use the system', tutorialCopy:'The video guide will be connected after the scenario is approved.'
    }
  };
  const t = key => COPY[language]?.[key] || COPY.ru[key] || key;

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#171716' : '#f5f4f1');
    window.dispatchEvent(new CustomEvent('bizet:themechange', {detail:{theme}}));
  }

  applyTheme();
  document.documentElement.lang = language;
  if (!button) return;

  let wrap = button.closest('.settings-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'settings-wrap';
    button.parentNode.insertBefore(wrap, button);
    wrap.appendChild(button);
  }
  button.classList.add('menu-button');
  button.setAttribute('aria-expanded', 'false');

  let panel = document.getElementById('settingsPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.id = 'settingsPanel';
    panel.hidden = true;
    wrap.appendChild(panel);
  }

  function panelMarkup() {
    panel.innerHTML = `
      <div class="settings-title" id="pilotSettingsTitle">${t('settings')}</div>
      <label class="settings-field"><span>${t('theme')}</span><select id="pilotThemeSelect"><option value="light">${t('light')}</option><option value="dark">${t('dark')}</option></select></label>
      <label class="settings-field"><span>${t('language')}</span><select id="pilotLanguageSelect"><option value="ru">Русский</option><option value="en">English</option></select></label>
      <div class="settings-links"><button class="settings-link" id="pilotFeedbackButton" type="button">${t('feedback')}</button><button class="settings-link" id="pilotTutorialButton" type="button">${t('tutorial')}</button></div>
      <div class="account-actions"><button class="account-button" id="pilotLoginButton" type="button">${t('login')}</button><button class="account-button primary-account" id="pilotRegisterButton" type="button">${t('register')}</button></div>
      <p class="settings-notice" id="pilotSettingsNotice" hidden></p>`;
    const themeSelect = document.getElementById('pilotThemeSelect');
    const languageSelect = document.getElementById('pilotLanguageSelect');
    themeSelect.value = theme;
    languageSelect.value = language;

    themeSelect.addEventListener('change', event => {
      theme = event.target.value === 'dark' ? 'dark' : 'light';
      applyTheme();
    });
    languageSelect.addEventListener('change', event => {
      language = event.target.value === 'en' ? 'en' : 'ru';
      localStorage.setItem(LANGUAGE_KEY, language);
      document.documentElement.lang = language;
      panelMarkup();
      window.dispatchEvent(new CustomEvent('bizet:languagechange', {detail:{language}}));
    });
    ['pilotLoginButton','pilotRegisterButton'].forEach(id => document.getElementById(id).addEventListener('click', () => {
      const notice = document.getElementById('pilotSettingsNotice');
      notice.textContent = t('auth'); notice.hidden = false;
    }));
    document.getElementById('pilotFeedbackButton').addEventListener('click', openFeedback);
    document.getElementById('pilotTutorialButton').addEventListener('click', openTutorial);
  }

  function closeSettings() { panel.hidden = true; button.setAttribute('aria-expanded','false'); }
  button.addEventListener('click', event => {
    event.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });
  panel.addEventListener('click', event => event.stopPropagation());
  document.addEventListener('click', closeSettings);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSettings(); });

  function ensureDialogs() {
    if (!document.getElementById('pilotFeedbackDialog')) {
      const feedback = document.createElement('dialog');
      feedback.className = 'support-dialog'; feedback.id = 'pilotFeedbackDialog';
      feedback.innerHTML = `<div class="dialog-card"><button class="dialog-close" data-close-dialog type="button">×</button><p class="dialog-eyebrow">BIZET OS</p><h2 id="pilotFeedbackTitle"></h2><p class="dialog-copy" id="pilotFeedbackCopy"></p><textarea id="pilotFeedbackMessage" rows="5"></textarea><button class="dialog-primary" id="pilotFeedbackSubmit" type="button"></button><p class="dialog-status" id="pilotFeedbackStatus" hidden></p></div>`;
      document.body.appendChild(feedback);
      feedback.querySelector('[data-close-dialog]').addEventListener('click',()=>feedback.close?.());
      feedback.addEventListener('click',event=>{if(event.target===feedback)feedback.close?.()});
      document.getElementById('pilotFeedbackSubmit').addEventListener('click',()=>{
        localStorage.setItem(FEEDBACK_KEY,document.getElementById('pilotFeedbackMessage').value.trim());
        const status=document.getElementById('pilotFeedbackStatus');status.textContent=t('feedbackSaved');status.hidden=false;
      });
    }
    if (!document.getElementById('pilotTutorialDialog')) {
      const tutorial = document.createElement('dialog');
      tutorial.className='support-dialog'; tutorial.id='pilotTutorialDialog';
      tutorial.innerHTML=`<div class="dialog-card tutorial-card"><button class="dialog-close" data-close-dialog type="button">×</button><p class="dialog-eyebrow">BIZET OS</p><h2 id="pilotTutorialTitle"></h2><div class="video-placeholder"><span class="play-mark">▶</span></div><p class="dialog-copy" id="pilotTutorialCopy"></p></div>`;
      document.body.appendChild(tutorial);
      tutorial.querySelector('[data-close-dialog]').addEventListener('click',()=>tutorial.close?.());
      tutorial.addEventListener('click',event=>{if(event.target===tutorial)tutorial.close?.()});
    }
  }

  function refreshDialogCopy() {
    ensureDialogs();
    document.getElementById('pilotFeedbackTitle').textContent=t('feedbackTitle');
    document.getElementById('pilotFeedbackCopy').textContent=t('feedbackCopy');
    document.getElementById('pilotFeedbackMessage').placeholder=t('feedbackPlaceholder');
    document.getElementById('pilotFeedbackSubmit').textContent=t('feedbackSubmit');
    document.getElementById('pilotTutorialTitle').textContent=t('tutorialTitle');
    document.getElementById('pilotTutorialCopy').textContent=t('tutorialCopy');
  }
  function openFeedback() {
    closeSettings(); refreshDialogCopy();
    document.getElementById('pilotFeedbackStatus').hidden=true;
    document.getElementById('pilotFeedbackMessage').value=localStorage.getItem(FEEDBACK_KEY)||'';
    document.getElementById('pilotFeedbackDialog').showModal?.();
  }
  function openTutorial() { closeSettings(); refreshDialogCopy(); document.getElementById('pilotTutorialDialog').showModal?.(); }

  panelMarkup();
  refreshDialogCopy();
})();
