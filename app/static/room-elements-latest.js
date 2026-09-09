const CONFIGS=[
  {code:'WALL_CENTER',cls:'center',ru:'Вдоль стены по центру',en:'Along wall — centred'},
  {code:'WALL_LEFT',cls:'left',ru:'Вдоль стены в левом углу',en:'Along wall — left corner'},
  {code:'WALL_RIGHT',cls:'right',ru:'Вдоль стены в правом углу',en:'Along wall — right corner'},
  {code:'L_LEFT',cls:'l-left',ru:'Г-образная — длинное крыло влево',en:'L-shape — long wing left'},
  {code:'L_RIGHT',cls:'l-right',ru:'Г-образная — длинное крыло вправо',en:'L-shape — long wing right'},
  {code:'U_SHAPE',cls:'u',ru:'П-образная',en:'U-shape'},
  {code:'CUSTOM',cls:'custom',ru:'Кастомная конфигурация',en:'Custom configuration'}
];

function ensureStyles(){if(document.querySelector('link[href="/static/room-elements-latest.css"]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/static/room-elements-latest.css';document.head.appendChild(link);}
function isRu(){return (document.getElementById('languageSelect')?.value||document.documentElement.lang||'ru')==='ru';}
function cardLines(cls){if(cls==='center'||cls==='left'||cls==='right')return'<span class="config-line line-a"></span>';if(cls==='l-left'||cls==='l-right')return'<span class="config-line line-a"></span><span class="config-line line-b"></span>';if(cls==='u')return'<span class="config-line line-a"></span><span class="config-line line-b"></span><span class="config-line line-c"></span>';return'';}

function buildVisualQuest(){
  const select=document.getElementById('configurationSelect'); if(!select)return;
  const field=select.closest('.select-field'); if(field)field.classList.add('is-compatibility-only');
  const controls=document.querySelector('.configuration-controls'); if(!controls||document.getElementById('visualConfigQuest'))return;
  const quest=document.createElement('div');quest.id='visualConfigQuest';quest.className='visual-config-quest';
  quest.innerHTML=`<p class="visual-config-intro" id="visualConfigIntro"></p><div class="visual-config-grid">${CONFIGS.map(c=>`<button class="visual-config-card" type="button" data-visual-config="${c.code}"><div class="config-mini-plan ${c.cls}">${cardLines(c.cls)}</div><strong data-config-title="${c.code}"></strong>${c.code==='CUSTOM'?'<small id="customVisualHint"></small>':''}</button>`).join('')}</div><div class="visual-config-note" id="visualConfigNote"></div>`;
  controls.insertBefore(quest,controls.firstChild);
  quest.querySelectorAll('[data-visual-config]').forEach(card=>card.addEventListener('click',()=>{select.value=card.dataset.visualConfig;select.dispatchEvent(new Event('change',{bubbles:true}));syncSelected();}));
  applyCopy(); syncSelected();
}

function syncSelected(){const select=document.getElementById('configurationSelect');if(!select)return;document.querySelectorAll('[data-visual-config]').forEach(card=>card.classList.toggle('is-selected',card.dataset.visualConfig===select.value));}
function applyCopy(){
  const ru=isRu();
  const intro=document.getElementById('visualConfigIntro'); if(intro)intro.textContent=ru?'Как должна располагаться мебель? Выберите картинку, которая ближе всего к вашему помещению.':'How should the furniture sit in the room? Choose the picture closest to your layout.';
  const note=document.getElementById('visualConfigNote'); if(note)note.textContent=ru?'Это пилотный визуальный ряд. Финальные изображения заменим после утверждения презентации владельца.':'This is a pilot visual row. Final imagery will be replaced after the owner presentation is approved.';
  const custom=document.getElementById('customVisualHint'); if(custom)custom.textContent=ru?'Нарисовать на плане':'Draw on plan';
  for(const c of CONFIGS){const node=document.querySelector(`[data-config-title="${c.code}"]`);if(node)node.textContent=ru?c.ru:c.en;}
  const copy=document.getElementById('configurationCopy');if(copy)copy.textContent=ru?'Выберите конфигурацию визуально. Кастомную можно нарисовать прямо на плане.':'Choose the configuration visually. A custom layout can be drawn directly on plan.';
}

ensureStyles();buildVisualQuest();
document.getElementById('configurationSelect')?.addEventListener('change',()=>setTimeout(syncSelected,0));
document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(()=>{applyCopy();syncSelected();},0));
setTimeout(()=>{applyCopy();syncSelected();},500);
