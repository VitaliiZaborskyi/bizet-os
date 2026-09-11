(() => {
  const LANG_KEY='bizet_os_language';
  const THEME_KEY='bizet_os_theme';
  const lang=()=>localStorage.getItem(LANG_KEY)||document.documentElement.lang||'ru';
  const map={
    'Ваша кухня':'Your kitchen','Проверить коммуникации →':'Check communications →','Размеры · вкл':'Dimensions · on','Формируем 3D-модель…':'Building 3D model…',
    'Выберите подход к потолку':'Choose the ceiling approach','Будет ли холодильник?':'Will there be a refrigerator?','Выберите положение холодильника':'Choose refrigerator position',
    'Выберите тип холодильника':'Choose refrigerator type','Выберите ширину холодильника':'Choose refrigerator width','Выберите наполнение холодильника':'Choose refrigerator configuration',
    'Выберите положение мойки':'Choose sink position','Укажите положение мойки относительно угла':'Set sink position relative to the corner','Выберите тип монтажа мойки':'Choose sink installation type','Сколько чаш у мойки?':'How many sink bowls?',
    'Планируется измельчитель отходов?':'Will there be a waste disposer?','Будут фильтры под мойкой?':'Will there be filters under the sink?',
    'Выберите тип варочной панели':'Choose cooktop type','Выберите размер варочной панели':'Choose cooktop size','Выберите тип посудомоечной машины':'Choose dishwasher type','Выберите ширину посудомоечной машины':'Choose dishwasher width',
    'Выберите тип вытяжки':'Choose hood type','Выберите ширину вытяжки':'Choose hood width','Выберите положение духового шкафа':'Choose oven position',
    'Будет микроволновая печь в пенале?':'Will there be a microwave in the tall unit?','Будет кофемашина в пенале?':'Will there be a coffee machine in the tall unit?',
    'Проверка коммуникаций':'Communication check','Уточнение помещения':'Room clarification','Есть дополнительные элементы?':'Any additional room elements?',
    'PDF для строителей':'PDF for builders','Оставить системные значения':'Keep system values','Подтвердить и перейти к материалам →':'Confirm and continue to materials →',
    'Назад':'Back','Настройки':'Settings','Тема':'Theme','Светлая':'Light','Тёмная':'Dark','Язык':'Language','Обратная связь':'Feedback','Как пользоваться системой':'How to use the system','Войти':'Sign in','Регистрация':'Register'
  };
  function translateTree(root=document){
    const english=lang()==='en';
    document.documentElement.lang=english?'en':'ru';
    root.querySelectorAll?.('h1,h2,h3,p,span,strong,small,button,label,option').forEach(el=>{
      if(el.children.length && !['BUTTON','LABEL'].includes(el.tagName)) return;
      const key=(el.textContent||'').trim();
      if(!key)return;
      if(english && map[key]){if(!el.dataset.r6Ru)el.dataset.r6Ru=key;el.textContent=map[key];}
      else if(!english && el.dataset.r6Ru){el.textContent=el.dataset.r6Ru;delete el.dataset.r6Ru;}
    });
  }
  function addHelp(){
    const settings=document.getElementById('settingsButton');if(!settings||document.getElementById('r6HelpButton'))return;
    const help=document.createElement('button');help.id='r6HelpButton';help.className='icon-button r6-help-button';help.type='button';help.setAttribute('aria-label',lang()==='en'?'Live support':'Оперативная помощь');help.textContent='?';
    const wrap=settings.closest('.settings-wrap');(wrap?.parentNode||settings.parentNode).insertBefore(help,wrap||settings);
    help.addEventListener('click',()=>{
      let d=document.getElementById('r6HelpDialog');if(!d){d=document.createElement('dialog');d.id='r6HelpDialog';d.className='support-dialog';d.innerHTML='<div class="dialog-card"><button class="dialog-close" data-r6-close type="button">×</button><p class="dialog-eyebrow">BIZET OS · SUPPORT</p><h2 id="r6HelpTitle"></h2><p class="dialog-copy" id="r6HelpCopy"></p><button class="dialog-primary" type="button" disabled id="r6HelpChat"></button></div>';document.body.appendChild(d);d.querySelector('[data-r6-close]').addEventListener('click',()=>d.close?.());}
      const en=lang()==='en';document.getElementById('r6HelpTitle').textContent=en?'Live assistance':'Оперативная помощь';document.getElementById('r6HelpCopy').textContent=en?'A live chat with the BIZET assistant or engineer will open here. The entry point is active in the pilot; the messaging channel is connected later.':'Здесь будет открываться живой чат с помощником BIZET или конструктором. Точка входа уже есть в пилоте; сам канал сообщений подключим следующим слоем.';document.getElementById('r6HelpChat').textContent=en?'Open chat · soon':'Открыть чат · скоро';d.showModal?.();
    });
  }
  function style(){if(document.getElementById('r6GlobalStyle'))return;const s=document.createElement('style');s.id='r6GlobalStyle';s.textContent='.r6-help-button{font-weight:850;font-size:18px;margin-left:auto}.settings-wrap+.r6-help-button{margin-left:8px}.topbar>.r6-help-button{order:8;margin-left:auto;margin-right:6px}@media(max-width:700px){.r6-help-button{font-size:17px}}';document.head.appendChild(s)}
  function recover(){document.querySelectorAll('button[disabled]').forEach(b=>{if(b.dataset.r6PermanentDisabled==='true'||b.classList.contains('pilot-disabled-choice'))return;if(b.closest('.placeholder-options'))return;const text=(b.textContent||'').toLowerCase();if(text.includes('позже')||text.includes('soon'))return;if(!b.hasAttribute('aria-busy'))b.disabled=false;});}
  function apply(){style();addHelp();translateTree();}
  window.addEventListener('bizet:languagechange',()=>setTimeout(apply,0));
  window.addEventListener('pageshow',event=>{if(event.persisted)setTimeout(()=>{recover();apply();},20)});
  new MutationObserver(()=>translateTree()).observe(document.body,{subtree:true,childList:true});
  apply();
})();