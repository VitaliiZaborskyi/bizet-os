const CONFIGS=[
  {code:'WALL_CENTER',cls:'center',ru:'Вдоль стены по центру',en:'Along wall — centred'},
  {code:'WALL_LEFT',cls:'left',ru:'Вдоль стены в левом углу',en:'Along wall — left corner'},
  {code:'WALL_RIGHT',cls:'right',ru:'Вдоль стены в правом углу',en:'Along wall — right corner'},
  {code:'L_LEFT',cls:'l-left',ru:'Г-образная — длинное крыло влево',en:'L-shape — long wing left'},
  {code:'L_RIGHT',cls:'l-right',ru:'Г-образная — длинное крыло вправо',en:'L-shape — long wing right'},
  {code:'U_SHAPE',cls:'u',ru:'П-образная',en:'U-shape'},
  {code:'CUSTOM',cls:'custom',ru:'Кастомная конфигурация',en:'Custom configuration'}
];

const STORAGE_KEY='bizet_os_project_id';
let detectedZone='ZONE_KITCHEN';
let projectGeometry={lengthMm:6000,widthMm:4200,heightMm:2800};

function ensureStyles(){if(document.querySelector('link[href="/static/room-elements-latest.css"]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/static/room-elements-latest.css';document.head.appendChild(link);}
function isRu(){return (document.getElementById('languageSelect')?.value||document.documentElement.lang||'ru')==='ru';}
function zoneClass(){const value=String(detectedZone||'').toLowerCase().replace('zone_','').replaceAll('_','-');return `zone-${value}`;}
function zoneLabel(){const ru=isRu();const labels={ZONE_KITCHEN:ru?'Кухня':'Kitchen',ZONE_BEDROOM:ru?'Спальная':'Bedroom',ZONE_LIVING_ROOM:ru?'Гостиная':'Living room',ZONE_WARDROBE:ru?'Гардеробная':'Wardrobe',ZONE_OTHER:ru?'Мебель':'Furniture'};return labels[detectedZone]||labels.ZONE_OTHER;}
function units(count=4){return Array.from({length:count},()=>'<span class="cabinet-unit"></span>').join('');}
function run(name,count=4){return `<div class="config-run ${name}">${units(count)}</div>`;}
function sceneMarkup(config){
  if(config.code==='CUSTOM')return `<div class="config-3d-stage custom ${zoneClass()}"><div class="config-zone-badge">${zoneLabel()}</div><div class="config-custom-mark">✎</div></div>`;
  let runs='';
  if(config.code==='WALL_CENTER')runs=run('run-back',4);
  if(config.code==='WALL_LEFT')runs=run('run-back',4);
  if(config.code==='WALL_RIGHT')runs=run('run-back',4);
  if(config.code==='L_LEFT')runs=run('run-back',4)+run('run-left',3);
  if(config.code==='L_RIGHT')runs=run('run-back',4)+run('run-right',3);
  if(config.code==='U_SHAPE')runs=run('run-back',4)+run('run-left',3)+run('run-right',3);
  return `<div class="config-3d-stage ${config.cls} ${zoneClass()}"><div class="config-zone-badge">${zoneLabel()}</div><div class="config-3d-room"><div class="config-back-wall"></div><div class="config-side-wall"></div><div class="config-floor"></div>${runs}</div></div>`;
}

function buildVisualQuest(){
  const select=document.getElementById('configurationSelect'); if(!select)return;
  const field=select.closest('.select-field'); if(field)field.classList.add('is-compatibility-only');
  const controls=document.querySelector('.configuration-controls'); if(!controls)return;
  document.getElementById('visualConfigQuest')?.remove();
  const quest=document.createElement('div');quest.id='visualConfigQuest';quest.className='visual-config-quest';
  quest.innerHTML=`<p class="visual-config-intro" id="visualConfigIntro"></p><div class="visual-config-grid">${CONFIGS.map(c=>`<button class="visual-config-card" type="button" data-visual-config="${c.code}">${sceneMarkup(c)}<strong data-config-title="${c.code}"></strong>${c.code==='CUSTOM'?'<small id="customVisualHint"></small>':''}</button>`).join('')}</div><div class="visual-config-note" id="visualConfigNote"></div>`;
  controls.insertBefore(quest,controls.firstChild);
  quest.querySelectorAll('[data-visual-config]').forEach(card=>card.addEventListener('click',()=>{select.value=card.dataset.visualConfig;select.dispatchEvent(new Event('change',{bubbles:true}));syncSelected();}));
  applyCopy(); syncSelected();
}

function syncSelected(){const select=document.getElementById('configurationSelect');if(!select)return;document.querySelectorAll('[data-visual-config]').forEach(card=>card.classList.toggle('is-selected',card.dataset.visualConfig===select.value));}
function applyCopy(){
  const ru=isRu();
  const intro=document.getElementById('visualConfigIntro'); if(intro)intro.textContent=ru?'Как должна располагаться мебель? Выберите объёмную сцену, которая ближе всего к вашему помещению.':'How should the furniture sit in the room? Choose the 3D scene closest to your layout.';
  const note=document.getElementById('visualConfigNote'); if(note)note.textContent=ru?'Это пилотный 3D-ряд. Система уже учитывает выбранную ранее зону; финальные профессиональные сцены заменим после утверждения визуального стандарта.':'This is the pilot 3D row. It already follows the previously selected zone; final professional scenes will replace it after the visual standard is approved.';
  const custom=document.getElementById('customVisualHint'); if(custom)custom.textContent=ru?'Нарисовать на плане':'Draw on plan';
  for(const c of CONFIGS){const node=document.querySelector(`[data-config-title="${c.code}"]`);if(node)node.textContent=ru?c.ru:c.en;}
  const copy=document.getElementById('configurationCopy');if(copy)copy.textContent=ru?'Выберите конфигурацию в объёмном визуальном квесте. Кастомную можно нарисовать прямо на плане.':'Choose the configuration in the 3D visual quest. A custom layout can still be drawn directly on plan.';
  document.querySelectorAll('.config-zone-badge').forEach(node=>node.textContent=zoneLabel());
}

async function loadProjectContext(){
  const id=sessionStorage.getItem(STORAGE_KEY);if(!id)return;
  try{
    const response=await fetch(`/api/v1.1/projects/${id}`);if(!response.ok)return;const project=await response.json();
    detectedZone=project?.context?.zone_type||project?.context?.product_type||detectedZone;
    const g=project?.room?.geometry||{};
    projectGeometry={lengthMm:g.wall_length?.value_mm||6000,widthMm:g.wall_depth?.value_mm||4200,heightMm:g.room_height?.value_mm||2800};
    buildVisualQuest();scheduleServiceSymbolDraw();
  }catch(_){ }
}

function serviceSymbolKind(label){
  const s=String(label||'').toLowerCase();
  if(s.includes('канализац')||s.includes('sewer'))return'sewer-water';
  if(s.includes('розет')||s.includes('socket'))return'socket';
  if(s.includes('питание варочной')||s.includes('cooktop / oven power')||s.includes('питание холодильника')||s.includes('fridge power'))return'wire';
  if(s.includes('вентканал')||s.includes('hood')||s.includes('vent'))return'vent';
  if(s==='вода'||s==='water')return'water';
  return null;
}
function activeWallLetter(){return (document.getElementById('activeWallTitle')?.textContent||'').match(/[ABCD]/)?.[0]||'A';}
function activeWallLength(){const wall=activeWallLetter();return wall==='A'||wall==='D'?projectGeometry.lengthMm:projectGeometry.widthMm;}
function wallCanvasGeometry(canvas){return {x:90,y:50,w:canvas.width-150,h:canvas.height-120};}
function parseWallRows(){return [...document.querySelectorAll('#wallItemsList .wall-item-row')].map(row=>{const label=row.querySelector('span')?.textContent?.trim()||'';const pos=row.querySelector('small')?.textContent||'';const match=pos.match(/X\s*(-?\d+).*Z\s*(-?\d+)/i);return match?{label,xMm:Number(match[1]),zMm:Number(match[2]),kind:serviceSymbolKind(label)}:null;}).filter(Boolean);}
function drawServiceSymbol(ctx,item,px,py,dark){
  if(!item.kind)return;
  const wallFill=dark?'#302f2b':'#e4e1d8',ink=dark?'#f4f0e7':'#171716',soft=dark?'#b7b1a5':'#666158';
  ctx.save();ctx.lineWidth=2;ctx.strokeStyle=ink;ctx.fillStyle=wallFill;
  ctx.beginPath();ctx.arc(px,py,16,0,Math.PI*2);ctx.fill();
  if(item.kind==='sewer-water'){
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(px,py+3,10,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(px-9,py-10,4.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(px+9,py-10,4.2,0,Math.PI*2);ctx.fill();
  } else if(item.kind==='socket'){
    ctx.fillStyle=wallFill;ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(px-12,py-9,24,18,5);ctx.fill();ctx.stroke();
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(px-5,py,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px+5,py,2,0,Math.PI*2);ctx.fill();
  } else if(item.kind==='wire'){
    ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(px-10,py-7);ctx.bezierCurveTo(px-6,py+3,px+6,py+7,px+10,py-4);ctx.stroke();
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(px-10,py-7,2.7,0,Math.PI*2);ctx.fill();
  } else if(item.kind==='vent'){
    ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.strokeRect(px-11,py-8,22,16);ctx.strokeStyle=soft;for(let y=-4;y<=4;y+=4){ctx.beginPath();ctx.moveTo(px-7,py+y);ctx.lineTo(px+7,py+y);ctx.stroke();}
  } else if(item.kind==='water'){
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(px-6,py,4.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px+6,py,4.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawServiceSymbols(){
  const canvas=document.getElementById('communicationCanvas');if(!canvas)return;const rows=parseWallRows();if(!rows.length)return;
  const ctx=canvas.getContext('2d'),g=wallCanvasGeometry(canvas),L=Math.max(1,activeWallLength()),H=Math.max(1,projectGeometry.heightMm),dark=document.documentElement.dataset.theme==='dark';
  for(const item of rows){if(!item.kind)continue;const px=g.x+Math.max(0,Math.min(1,item.xMm/L))*g.w,py=g.y+g.h-Math.max(0,Math.min(1,item.zMm/H))*g.h;drawServiceSymbol(ctx,item,px,py,dark);}
}
let symbolTimer=null;
function scheduleServiceSymbolDraw(){clearTimeout(symbolTimer);symbolTimer=setTimeout(drawServiceSymbols,35);}

ensureStyles();
buildVisualQuest();
loadProjectContext();
document.getElementById('configurationSelect')?.addEventListener('change',()=>setTimeout(syncSelected,0));
document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(()=>{applyCopy();syncSelected();scheduleServiceSymbolDraw();},0));
document.getElementById('themeSelect')?.addEventListener('change',scheduleServiceSymbolDraw);
const list=document.getElementById('wallItemsList');if(list)new MutationObserver(scheduleServiceSymbolDraw).observe(list,{childList:true,subtree:true,characterData:true});
const wallTitle=document.getElementById('activeWallTitle');if(wallTitle)new MutationObserver(scheduleServiceSymbolDraw).observe(wallTitle,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',event=>{if(event.target.closest('#wallWorkflow'))setTimeout(scheduleServiceSymbolDraw,0);});
document.addEventListener('input',event=>{if(event.target.closest('#wallWorkflow'))scheduleServiceSymbolDraw();});
setTimeout(()=>{applyCopy();syncSelected();scheduleServiceSymbolDraw();},650);
