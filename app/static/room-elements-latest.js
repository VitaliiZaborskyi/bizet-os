const CONFIGS=[
  {code:'WALL_CENTER',cls:'center',ru:'Вдоль стены по центру',en:'Along wall — centred'},
  {code:'WALL_LEFT',cls:'left',ru:'Вдоль стены в левом углу',en:'Along wall — left corner'},
  {code:'WALL_RIGHT',cls:'right',ru:'Вдоль стены в правом углу',en:'Along wall — right corner'},
  {code:'L_LEFT',cls:'l-left',ru:'Г-образная — длинное крыло влево',en:'L-shape — long wing left'},
  {code:'L_RIGHT',cls:'l-right',ru:'Г-образная — длинное крыло вправо',en:'L-shape — long wing right'},
  {code:'U_SHAPE',cls:'u',ru:'П-образная',en:'U-shape'},
  {code:'CUSTOM',cls:'custom',ru:'Кастомная конфигурация',en:'Custom configuration'}
];
const CONFIG_WALLS={WALL_CENTER:['A'],WALL_LEFT:['A'],WALL_RIGHT:['A'],L_LEFT:['B','A'],L_RIGHT:['A','C'],U_SHAPE:['B','A','C']};
const STORAGE_KEY='bizet_os_project_id';
let detectedZone='ZONE_KITCHEN';
let projectGeometry={lengthMm:6000,widthMm:4200,heightMm:2800};
let currentProject=null;
let symbolTimer=null;
let dragState=null;

function ensureStyles(){if(document.querySelector('link[href="/static/room-elements-latest.css"]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='/static/room-elements-latest.css';document.head.appendChild(link);}
function isRu(){return (document.getElementById('languageSelect')?.value||document.documentElement.lang||'ru')==='ru';}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function uid(){return crypto.randomUUID?crypto.randomUUID():`bizet-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function zoneLabel(){const ru=isRu();const labels={ZONE_KITCHEN:ru?'Кухня':'Kitchen',ZONE_BEDROOM:ru?'Спальная':'Bedroom',ZONE_LIVING_ROOM:ru?'Гостиная':'Living room',ZONE_WARDROBE:ru?'Гардеробная':'Wardrobe',ZONE_OTHER:ru?'Мебель':'Furniture'};return labels[detectedZone]||labels.ZONE_OTHER;}

function request(url,options={}){return fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options}).then(async r=>{if(!r.ok){let d=`${r.status} ${r.statusText}`;try{const p=await r.json();d=p.detail||d;}catch(_){}throw new Error(d);}return r.json();});}
async function patchProject(path,value,reason){const id=sessionStorage.getItem(STORAGE_KEY);if(!id)return null;const result=await request(`/api/v1.1/projects/${id}`,{method:'PATCH',body:JSON.stringify({path,value,reason})});currentProject=result.project;return result.project;}
async function fetchProject(){const id=sessionStorage.getItem(STORAGE_KEY);if(!id)return null;return request(`/api/v1.1/projects/${id}`);}

function planBars(code){
  const common='<span class="ref-furniture back"></span>';
  if(code==='WALL_CENTER')return'<span class="ref-furniture back center-run"></span>';
  if(code==='WALL_LEFT')return'<span class="ref-furniture back left-run"></span>';
  if(code==='WALL_RIGHT')return'<span class="ref-furniture back right-run"></span>';
  if(code==='L_LEFT')return common+'<span class="ref-furniture left"></span>';
  if(code==='L_RIGHT')return common+'<span class="ref-furniture right"></span>';
  if(code==='U_SHAPE')return common+'<span class="ref-furniture left"></span><span class="ref-furniture right"></span>';
  return'<span class="custom-pencil">✎</span>';
}
function sceneMarkup(config){return `<div class="config-reference-stage ${config.cls}"><div class="ref-room"><span class="ref-wall back"></span><span class="ref-wall left"></span><span class="ref-wall right"></span><span class="ref-floor"></span>${planBars(config.code)}</div><span class="config-zone-badge">${zoneLabel()}</span></div>`;}

function buildVisualQuest(){
  const select=document.getElementById('configurationSelect');if(!select)return;select.closest('.select-field')?.classList.add('is-compatibility-only');
  const controls=document.querySelector('.configuration-controls');if(!controls)return;document.getElementById('visualConfigQuest')?.remove();
  const quest=document.createElement('div');quest.id='visualConfigQuest';quest.className='visual-config-quest';quest.innerHTML=`
    <p class="visual-config-intro" id="visualConfigIntro"></p>
    <div class="visual-config-grid">${CONFIGS.map(c=>`<button class="visual-config-card" type="button" data-visual-config="${c.code}">${sceneMarkup(c)}<strong data-config-title="${c.code}"></strong>${c.code==='CUSTOM'?'<small id="customVisualHint"></small>':''}</button>`).join('')}</div>
    <p class="configuration-selection-hint" id="configurationSelectionHint" hidden></p>
    <button class="configuration-continue" id="configurationContinue" type="button" aria-disabled="true"><span>${isRu()?'Далее':'Continue'}</span><span>→</span></button>`;
  controls.insertBefore(quest,controls.firstChild);
  quest.querySelectorAll('[data-visual-config]').forEach(card=>card.addEventListener('click',()=>{select.value=card.dataset.visualConfig;select.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{syncSelected();keepConfigurationOnly();},0);}));
  document.getElementById('configurationContinue')?.addEventListener('click',continueToCommunications);
  applyCopy();syncSelected();keepConfigurationOnly();
}

function syncSelected(){
  const select=document.getElementById('configurationSelect');if(!select)return;const value=select.value;
  document.querySelectorAll('[data-visual-config]').forEach(card=>card.classList.toggle('is-selected',card.dataset.visualConfig===value));
  const next=document.getElementById('configurationContinue');if(next){const ready=Boolean(value);next.classList.toggle('is-ready',ready);next.setAttribute('aria-disabled',String(!ready));}
}
function applyCopy(){
  const ru=isRu();
  const title=document.getElementById('configurationTitle');if(title)title.textContent=ru?'Выберите конфигурацию':'Choose a configuration';
  const copy=document.getElementById('configurationCopy');if(copy)copy.textContent=ru?'Одна задача: выберите картинку, которая ближе всего к расположению вашей мебели.':'One task: choose the picture closest to your furniture layout.';
  const intro=document.getElementById('visualConfigIntro');if(intro)intro.textContent=ru?'Нажмите на один вариант. Жёлтая зона показывает реальное расположение мебели вдоль стен.':'Tap one option. The yellow zone shows where the furniture sits along the walls.';
  const custom=document.getElementById('customVisualHint');if(custom)custom.textContent=ru?'Нарисовать свой вариант':'Draw your own';
  for(const c of CONFIGS){const node=document.querySelector(`[data-config-title="${c.code}"]`);if(node)node.textContent=ru?c.ru:c.en;}
  document.querySelectorAll('.config-zone-badge').forEach(n=>n.textContent=zoneLabel());
  const next=document.querySelector('#configurationContinue span:first-child');if(next)next.textContent=ru?'Далее':'Continue';
  const heading=document.getElementById('elementsSubtitle');if(heading&&!isCommunicationMode())heading.textContent=ru?'Сначала только конфигурация. После подтверждения перейдём к коммуникациям.':'First choose only the layout. Communications come after confirmation.';
  updateCommunicationCopy();
}

function isCommunicationMode(){return new URLSearchParams(window.location.search).get('step')==='communications';}
function keepConfigurationOnly(){
  if(isCommunicationMode()){showCommunicationsMode();return;}
  const workflow=document.getElementById('wallWorkflow');if(workflow)workflow.hidden=true;
  const completion=document.getElementById('completionCard');if(completion)completion.hidden=true;
  document.querySelector('.configuration-card')?.classList.remove('is-hidden-step');
}
function showCommunicationsMode(){
  document.querySelector('.configuration-card')?.classList.add('is-hidden-step');
  const workflow=document.getElementById('wallWorkflow');if(workflow)workflow.hidden=false;
  const title=document.getElementById('elementsTitle'),subtitle=document.getElementById('elementsSubtitle'),eyebrow=document.getElementById('elementsEyebrow');
  if(eyebrow)eyebrow.textContent=isRu()?'Следующий шаг':'Next step';
  if(title)title.textContent=isRu()?'Коммуникации':'Communications';
  if(subtitle)subtitle.textContent=isRu()?'Проверьте предложенные точки, добавьте свои или переместите их прямо на стене.':'Check suggested points, add your own, or drag them directly on the wall.';
  if(workflow&&!document.getElementById('backToConfiguration')){const btn=document.createElement('button');btn.id='backToConfiguration';btn.className='back-to-config';btn.type='button';btn.textContent=isRu()?'← Конфигурация':'← Configuration';btn.addEventListener('click',()=>window.location.assign('/room-elements'));workflow.prepend(btn);}
  setTimeout(()=>{workflow?.scrollIntoView({behavior:'smooth',block:'start'});scheduleServiceSymbolDraw();updateWaterLinkControl();},100);
}

async function continueToCommunications(){
  const select=document.getElementById('configurationSelect'),code=select?.value;
  if(!code){const hint=document.getElementById('configurationSelectionHint');if(hint){hint.textContent=isRu()?'Сначала выберите конфигурацию.':'Choose a configuration first.';hint.hidden=false;}return;}
  const btn=document.getElementById('configurationContinue');if(btn)btn.disabled=true;
  try{await seedDefaultCommunications(code);window.location.assign('/room-elements?step=communications');}catch(error){const hint=document.getElementById('configurationSelectionHint');if(hint){hint.textContent=error.message;hint.hidden=false;}if(btn)btn.disabled=false;}
}

function parseWallNote(note){if(typeof note!=='string'||!note.startsWith('BIZET_WALL:'))return null;try{return JSON.parse(note.slice('BIZET_WALL:'.length));}catch(_){return null;}}
function wallLengthMm(wall,g){const L=g?.wall_length?.value_mm||projectGeometry.lengthMm,W=g?.wall_depth?.value_mm||projectGeometry.widthMm;return wall==='A'||wall==='D'?L:W;}
function localToGlobal(wall,x,z,g){const L=g?.wall_length?.value_mm||projectGeometry.lengthMm,W=g?.wall_depth?.value_mm||projectGeometry.widthMm;if(wall==='A')return[Math.round(-L/2+x),W,z];if(wall==='D')return[Math.round(-L/2+x),0,z];if(wall==='B')return[-Math.round(L/2),x,z];return[Math.round(L/2),x,z];}
function managedCommunication(type,wall,x,z,g,auto=true){return{id:uid(),type,coordinates_mm:localToGlobal(wall,x,z,g),tolerance_radius_mm:null,provenance:{source:auto?'ESTIMATED':'USER_ENTERED',confidence:auto?0.65:null,confirmed:false,note:auto?'BIZET pilot default — verify on site':null},confirmation_state:'UNCONFIRMED',notes:`BIZET_WALL:${JSON.stringify({wall,x_mm:x,z_mm:z,auto_default:auto})}`};}
async function seedDefaultCommunications(code){
  currentProject=await fetchProject();if(!currentProject)return;detectedZone=currentProject?.context?.zone_type||currentProject?.context?.product_type||detectedZone;
  const existing=currentProject.communications||[];if(existing.some(c=>parseWallNote(c.notes)))return;
  if(detectedZone!=='ZONE_KITCHEN')return;
  const g=currentProject?.room?.geometry||{},savedWalls=currentProject?.scene?.visual_settings?.configuration_walls;let walls=Array.isArray(savedWalls)&&savedWalls.length?savedWalls:(CONFIG_WALLS[code]||[]);if(!walls.length)walls=['A'];const primary=walls.includes('A')?'A':walls[0],L=wallLengthMm(primary,g);
  const auto=[];
  auto.push(managedCommunication('SEWER',primary,Math.round(L*.42),600,g));
  auto.push(managedCommunication('WATER',primary,Math.round(L*.46),600,g));
  auto.push(managedCommunication('LIGHTING_POWER',primary,Math.round(L*.52),1500,g));
  auto.push(managedCommunication('HOOD',primary,Math.round(L*.56),1800,g));
  auto.push(managedCommunication('COOKTOP_POWER',primary,Math.round(L*.60),700,g));
  for(const wall of walls){const WL=wallLengthMm(wall,g);auto.push(managedCommunication('SOCKET',wall,Math.round(WL*.68),1100,g));}
  await patchProject('communications',[...existing,...auto],'Kitchen communication pilot defaults after configuration');
  await patchProject('scene.visual_settings.communication_default_profile',{profile:'KITCHEN_PILOT_2026_09',values_mm:{sewer_z:600,water_z:600,counter_socket_z:1100,lighting_power_z:1500,hood_z:1800,cooktop_power_z:700},status:'SUGGESTED_VERIFY'},'Store configurable pilot defaults');
}

function addLightingOption(){
  const select=document.getElementById('elementSelect');if(!select||select.querySelector('option[value="COMM:LIGHTING_POWER"]'))return;const group=document.getElementById('communicationsGroup')||select.querySelector('optgroup');const option=document.createElement('option');option.value='COMM:LIGHTING_POWER';option.textContent=isRu()?'Вывод для подсветки':'Lighting power outlet';group?.appendChild(option);
}

function serviceSymbolKind(label){
  const s=String(label||'').toLowerCase();
  if(s.includes('канализац')||s.includes('sewer'))return'sewer';
  if(s==='вода'||s==='water')return'water';
  if(s.includes('розет')||s.includes('socket'))return'socket';
  if(s.includes('подсвет')||s.includes('lighting power'))return'wire';
  if(s.includes('питание варочной')||s.includes('cooktop / oven power')||s.includes('питание холодильника')||s.includes('fridge power'))return'wire';
  if(s.includes('вентканал')||s.includes('hood')||s.includes('vent'))return'vent';
  return null;
}
function activeWallLetter(){return(document.getElementById('activeWallTitle')?.textContent||'').match(/[ABCD]/)?.[0]||'A';}
function activeWallLength(){const wall=activeWallLetter();return wall==='A'||wall==='D'?projectGeometry.lengthMm:projectGeometry.widthMm;}
function wallCanvasGeometry(canvas){return{x:90,y:50,w:canvas.width-150,h:canvas.height-120};}
function parseWallRows(){return[...document.querySelectorAll('#wallItemsList .wall-item-row')].map(row=>{const label=row.querySelector('span')?.textContent?.trim()||'',pos=row.querySelector('small')?.textContent||'',m=pos.match(/X\s*(-?\d+).*Z\s*(-?\d+)/i);return m?{row,label,xMm:Number(m[1]),zMm:Number(m[2]),kind:serviceSymbolKind(label)}:null;}).filter(Boolean);}
function drawServiceSymbol(ctx,item,px,py,dark,all){
  if(!item.kind)return;const wallFill=dark?'#302f2b':'#e4e1d8',ink=dark?'#f8d65f':'#b57900',neutral=dark?'#f4f0e7':'#171716',soft=dark?'#b7b1a5':'#666158';
  if(item.kind==='water'&&all.some(x=>x!==item&&x.kind==='sewer'&&Math.abs(x.xMm-item.xMm)<5&&Math.abs(x.zMm-item.zMm)<5))px+=18;
  ctx.save();ctx.lineWidth=2;ctx.strokeStyle=neutral;ctx.fillStyle=wallFill;
  if(item.kind==='sewer'){ctx.fillStyle=neutral;ctx.beginPath();ctx.arc(px,py,10.5,0,Math.PI*2);ctx.fill();}
  else if(item.kind==='water'){ctx.fillStyle=ink;ctx.beginPath();ctx.arc(px-5,py,4.6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px+5,py,4.6,0,Math.PI*2);ctx.fill();}
  else if(item.kind==='socket'){ctx.fillStyle=wallFill;ctx.strokeStyle=neutral;ctx.beginPath();ctx.roundRect(px-12,py-9,24,18,5);ctx.fill();ctx.stroke();ctx.fillStyle=neutral;ctx.beginPath();ctx.arc(px-5,py,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px+5,py,2,0,Math.PI*2);ctx.fill();}
  else if(item.kind==='wire'){ctx.strokeStyle=neutral;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(px-10,py-7);ctx.bezierCurveTo(px-6,py+3,px+6,py+7,px+10,py-4);ctx.stroke();ctx.fillStyle=neutral;ctx.beginPath();ctx.arc(px-10,py-7,2.7,0,Math.PI*2);ctx.fill();}
  else if(item.kind==='vent'){ctx.strokeStyle=neutral;ctx.strokeRect(px-11,py-8,22,16);ctx.strokeStyle=soft;for(let y=-4;y<=4;y+=4){ctx.beginPath();ctx.moveTo(px-7,py+y);ctx.lineTo(px+7,py+y);ctx.stroke();}}
  ctx.restore();
}
function drawServiceSymbols(){
  const canvas=document.getElementById('communicationCanvas');if(!canvas)return;const rows=parseWallRows();if(!rows.length)return;const ctx=canvas.getContext('2d'),g=wallCanvasGeometry(canvas),L=Math.max(1,activeWallLength()),H=Math.max(1,projectGeometry.heightMm),dark=document.documentElement.dataset.theme==='dark';
  for(const item of rows){if(!item.kind)continue;const px=g.x+clamp(item.xMm/L,0,1)*g.w,py=g.y+g.h-clamp(item.zMm/H,0,1)*g.h;drawServiceSymbol(ctx,item,px,py,dark,rows);}
}
function scheduleServiceSymbolDraw(){clearTimeout(symbolTimer);symbolTimer=setTimeout(drawServiceSymbols,35);}

function updateWaterLinkControl(){
  const panel=document.getElementById('selectedPosition');if(!panel)return;let button=document.getElementById('linkWaterToSewer');if(!button){button=document.createElement('button');button.id='linkWaterToSewer';button.type='button';button.className='link-water-button';button.addEventListener('click',linkWaterToSewer);panel.appendChild(button);}const label=document.getElementById('selectedElementName')?.textContent||'';button.hidden=serviceSymbolKind(label)!=='water';button.textContent=isRu()?'Привязать к канализации':'Link to sewer';
}
function linkWaterToSewer(){
  const sewer=parseWallRows().find(x=>x.kind==='sewer');const x=document.getElementById('coordinateX'),z=document.getElementById('coordinateZ'),btn=document.getElementById('linkWaterToSewer');if(!sewer||!x||!z){if(btn)btn.textContent=isRu()?'Сначала добавьте канализацию':'Add sewer first';return;}
  x.value=sewer.xMm;z.value=sewer.zMm;x.dispatchEvent(new Event('input',{bubbles:true}));z.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));z.dispatchEvent(new Event('change',{bubbles:true}));if(btn)btn.textContent=isRu()?'Привязано ✓':'Linked ✓';scheduleServiceSymbolDraw();
}

function bindWallDrag(){
  const canvas=document.getElementById('communicationCanvas');if(!canvas)return;canvas.classList.add('direct-drag-enabled');
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
  canvas.addEventListener('pointerdown',e=>{if(!isCommunicationMode())return;const p=point(e),g=wallCanvasGeometry(canvas),L=Math.max(1,activeWallLength()),H=Math.max(1,projectGeometry.heightMm);let hit=null,best=Infinity;for(const item of parseWallRows()){const px=g.x+clamp(item.xMm/L,0,1)*g.w,py=g.y+g.h-clamp(item.zMm/H,0,1)*g.h,d=Math.hypot(p.x-px,p.y-py);if(d<best&&d<30){hit=item;best=d;}}if(!hit)return;e.preventDefault();hit.row.click();canvas.setPointerCapture?.(e.pointerId);dragState={id:e.pointerId};});
  canvas.addEventListener('pointermove',e=>{if(!dragState||dragState.id!==e.pointerId)return;e.preventDefault();const p=point(e),g=wallCanvasGeometry(canvas),L=Math.max(1,activeWallLength()),H=Math.max(1,projectGeometry.heightMm),x=document.getElementById('coordinateX'),z=document.getElementById('coordinateZ');if(!x||!z)return;x.value=Math.round(clamp((p.x-g.x)/g.w,0,1)*L);z.value=Math.round(clamp(1-(p.y-g.y)/g.h,0,1)*H);x.dispatchEvent(new Event('input',{bubbles:true}));z.dispatchEvent(new Event('input',{bubbles:true}));scheduleServiceSymbolDraw();});
  const finish=e=>{if(!dragState||dragState.id!==e.pointerId)return;const x=document.getElementById('coordinateX'),z=document.getElementById('coordinateZ');x?.dispatchEvent(new Event('change',{bubbles:true}));z?.dispatchEvent(new Event('change',{bubbles:true}));dragState=null;};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
}

function updateCommunicationCopy(){
  if(!isCommunicationMode())return;const copy=document.getElementById('wallWorkflowCopy');if(copy)copy.textContent=isRu()?'BIZET уже может предложить базовые точки для кухни. Перетащите точку пальцем или мышью, либо задайте X/Z.':'BIZET can suggest base kitchen points. Drag a point or enter X/Z.';
  const origin=document.getElementById('wallOriginNote');if(origin)origin.textContent=isRu()?'Перетаскивайте точки прямо по стене. X — от левого края, Z — от пола.':'Drag points directly on the wall. X is from the left edge, Z from the floor.';
  if(!document.getElementById('defaultsNotice')){const stage=document.querySelector('.wall-stage-card');const note=document.createElement('div');note.id='defaultsNotice';note.className='defaults-notice';note.textContent=isRu()?'Жёлтые/чёрные точки — рекомендуемые стартовые позиции. Их нужно проверить по фактическому проекту и инструкции техники.':'Suggested starting positions must be checked against the real project and appliance instructions.';stage?.appendChild(note);}
}

async function loadProjectContext(){
  const id=sessionStorage.getItem(STORAGE_KEY);if(!id)return;try{currentProject=await fetchProject();if(!currentProject)return;detectedZone=currentProject?.context?.zone_type||currentProject?.context?.product_type||detectedZone;const g=currentProject?.room?.geometry||{};projectGeometry={lengthMm:g.wall_length?.value_mm||6000,widthMm:g.wall_depth?.value_mm||4200,heightMm:g.room_height?.value_mm||2800};buildVisualQuest();addLightingOption();if(isCommunicationMode())showCommunicationsMode();scheduleServiceSymbolDraw();}catch(_){ }}

ensureStyles();
buildVisualQuest();addLightingOption();bindWallDrag();loadProjectContext();
document.getElementById('configurationSelect')?.addEventListener('change',()=>setTimeout(()=>{syncSelected();keepConfigurationOnly();},0));
document.getElementById('acceptCustomPlanButton')?.addEventListener('click',()=>setTimeout(()=>{syncSelected();keepConfigurationOnly();},180));
document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(()=>{applyCopy();syncSelected();addLightingOption();updateWaterLinkControl();scheduleServiceSymbolDraw();},0));
document.getElementById('themeSelect')?.addEventListener('change',scheduleServiceSymbolDraw);
const list=document.getElementById('wallItemsList');if(list)new MutationObserver(()=>{scheduleServiceSymbolDraw();updateWaterLinkControl();}).observe(list,{childList:true,subtree:true,characterData:true});
const selected=document.getElementById('selectedPosition');if(selected)new MutationObserver(updateWaterLinkControl).observe(selected,{attributes:true,childList:true,subtree:true,characterData:true});
document.addEventListener('click',e=>{if(e.target.closest('#wallWorkflow'))setTimeout(()=>{scheduleServiceSymbolDraw();updateWaterLinkControl();},0);});
document.addEventListener('input',e=>{if(e.target.closest('#wallWorkflow'))scheduleServiceSymbolDraw();});
setTimeout(()=>{applyCopy();syncSelected();keepConfigurationOnly();updateWaterLinkControl();scheduleServiceSymbolDraw();},650);
