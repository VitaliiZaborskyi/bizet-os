/* BIZET OS 10.6.3 - UI-only extension, never touches the 3D runtime. */
(()=>{'use strict';
 const lang=()=>localStorage.getItem('bizet_ui_language')||localStorage.getItem('bizet_language')||document.documentElement.lang||'ru';
 const en=()=>lang().toLowerCase().startsWith('en');
 const t=(ru,english)=>en()?english:ru;
 const $=id=>document.getElementById(id);
 function refresh(){
  const help=$('r1063HelpButton');
  if(help){help.title=t('Справка','Help');help.setAttribute('aria-label',help.title)}
  const back=$('backButton');if(back)back.setAttribute('aria-label',t('Назад','Back'));
  const info=$('baseInfoButton');if(info)info.setAttribute('aria-label',t('О базовом варианте','About base variant'));
  const dots=$('settingsButton');if(dots)dots.setAttribute('aria-label',t('Дополнительное меню','More options'));
  const scan=$('workspaceScanLink');if(scan)scan.textContent=t('Открыть скан помещения ↗','Open room scan ↗');
  const file=$('workspaceFileImport');if(file)file.textContent=t('Импортировать PDF / фото','Import PDF / photo');
 }
 function init(){
  $('r1063HelpButton')?.addEventListener('click',()=>{
    const popup=$('baseInfoPopover');
    if(popup){popup.hidden=false;popup.setAttribute('aria-live','polite')}
    else window.alert(t('Управление: вращайте кухню жестом или мышью. Редактирование — EDIT, просмотр — VIEW.','Rotate the kitchen by drag or touch. Use EDIT to change and VIEW to inspect.'));
  });
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.addEventListener('bizet:languagechange',refresh);
 window.BizetR1063UI={refresh,version:'R10.6.3'};
})();