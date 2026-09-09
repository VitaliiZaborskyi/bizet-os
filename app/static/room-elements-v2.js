const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'bizet_os_project_id';
const THEME_KEY = 'bizet_os_theme';
const LANGUAGE_KEY = 'bizet_os_language';
const FEEDBACK_KEY = 'bizet_os_pilot_feedback';
const WALL_ORDER = ['B','A','C','D']; // client traversal: left → centre → right → front if used
const NUDGE_MM = 10;

const CONFIG_WALLS = {
  WALL_CENTER: ['A'],
  WALL_LEFT: ['A'],
  WALL_RIGHT: ['A'],
  L_LEFT: ['B','A'],
  L_RIGHT: ['A','C'],
  U_SHAPE: ['B','A','C'],
};

const CONFIG_LABELS = {
  WALL_CENTER:{ru:'Вдоль стены по центру',en:'Along wall — centred'},
  WALL_LEFT:{ru:'Вдоль стены в левом углу',en:'Along wall — left corner'},
  WALL_RIGHT:{ru:'Вдоль стены в правом углу',en:'Along wall — right corner'},
  L_LEFT:{ru:'Буквой «Г» — длинное крыло влево',en:'L-shape — long wing left'},
  L_RIGHT:{ru:'Буквой «Г» — длинное крыло вправо',en:'L-shape — long wing right'},
  U_SHAPE:{ru:'Буквой «П»',en:'U-shape'},
  CUSTOM:{ru:'Кастомная конфигурация',en:'Custom configuration'}
};

const ELEMENT_LABELS = {
  SEWER:{ru:'Канализация',en:'Sewer'}, WATER:{ru:'Вода',en:'Water'}, COOKTOP_POWER:{ru:'Питание варочной / духовки',en:'Cooktop / oven power'},
  HOOD:{ru:'Вентканал / вытяжка',en:'Vent / hood'}, FRIDGE_POWER:{ru:'Питание холодильника',en:'Fridge power'}, SOCKET:{ru:'Розетки / выводы',en:'Sockets / outlets'},
  WINDOW:{ru:'Окно',en:'Window'}, DOOR:{ru:'Дверь',en:'Door'}, RADIATOR:{ru:'Радиатор',en:'Radiator'}, CURTAIN_RECESS:{ru:'Подшторник / карниз',en:'Curtain recess'},
  NICHE:{ru:'Ниша',en:'Niche'}, COLUMN:{ru:'Колонна',en:'Column'}, PROJECTION:{ru:'Выступ',en:'Projection'}, BEAM:{ru:'Балка',en:'Beam'}, OTHER:{ru:'Другое',en:'Other'}
};

const COPY = {
  ru:{
    settings:'Настройки',theme:'Тема',light:'Светлая',dark:'Тёмная',language:'Язык',feedback:'Обратная связь',tutorial:'Как пользоваться системой',login:'Войти',register:'Регистрация',
    eyebrow:'Следующий шаг',title:'Конфигурация мебели и коммуникации',subtitle:'Сначала выберите расположение мебели. Затем BIZET OS проведёт вас по задействованным стенам слева направо.',
    configuration:'Конфигурация мебели',configurationCopy:'Выберите схему. Кастомную конфигурацию можно нарисовать прямо на плане.',walls:'Стены',wall:'Стена',
    workflow:'Коммуникации по стенам',workflowCopy:'Каждая задействованная стена показывается отдельно. Добавьте элементы или отметьте стену пустой.',
    positionDimensions:'Размеры положения',on:'Вкл',off:'Выкл',origin:'X — от левого края стены, Z — от пола. Значения в мм.',
    add:'Добавить на стену',addButton:'Добавить элемент',empty:'Пустая стена',confirm:'Подтвердить стену →',previous:'← Предыдущая',
    communication:'Коммуникация',feature:'Конструкционная особенность',delete:'Удалить',complete:'Карта стен собрана',completeCopy:'Конфигурация и положение элементов сохранены в текущем проекте.',
    customTitle:'Нарисуйте конфигурацию',customCopy:'Проведите линию вдоль стен, где должна располагаться мебель. Система распознает стены и подпишет их.',detected:'Распознаны стены:',clear:'Очистить',use:'Использовать конфигурацию',
    chooseElement:'Сначала выберите элемент.',emptyBlocked:'На этой стене уже есть элементы. Удалите их или подтвердите стену.',saved:'Сохранено',loadError:'Не удалось загрузить текущий проект.',noWalls:'Нарисуйте линию ближе к одной или нескольким стенам.'
  },
  en:{
    settings:'Settings',theme:'Theme',light:'Light',dark:'Dark',language:'Language',feedback:'Feedback',tutorial:'How to use the system',login:'Sign in',register:'Register',
    eyebrow:'Next step',title:'Furniture configuration and communications',subtitle:'Choose the furniture layout first. BIZET OS will then take you through the relevant walls from left to right.',
    configuration:'Furniture configuration',configurationCopy:'Choose a layout. A custom configuration can be drawn directly on plan.',walls:'Walls',wall:'Wall',
    workflow:'Wall communications',workflowCopy:'Each relevant wall is shown separately. Add elements or mark the wall as empty.',
    positionDimensions:'Position dimensions',on:'On',off:'Off',origin:'X is measured from the left edge, Z from the floor. Values are in mm.',
    add:'Add to wall',addButton:'Add element',empty:'Empty wall',confirm:'Confirm wall →',previous:'← Previous',
    communication:'Communication',feature:'Room feature',delete:'Delete',complete:'Wall map complete',completeCopy:'Configuration and element positions are saved in the current project.',
    customTitle:'Draw the configuration',customCopy:'Draw along the walls where furniture should be placed. The system will recognize and label those walls.',detected:'Detected walls:',clear:'Clear',use:'Use configuration',
    chooseElement:'Choose an element first.',emptyBlocked:'This wall already has elements. Delete them or confirm the wall.',saved:'Saved',loadError:'Could not load the current project.',noWalls:'Draw closer to one or more room walls.'
  }
};

let theme = localStorage.getItem(THEME_KEY) || 'light';
let language = localStorage.getItem(LANGUAGE_KEY) || 'ru';
let project = null;
let dimensions = { lengthMm:6000,widthMm:4200,heightMm:2800 };
let configuration = '';
let wallSequence = [];
let wallIndex = 0;
let showPositionDimensions = true;
let selectedItemId = null;
let wallItems = [];
let customPoints = [];
let customDetectedWalls = [];
let drawingCustom = false;
let wallStatuses = {};
let markerHitAreas = [];
let toastTimer = null;

const communicationCanvas = $('communicationCanvas');
const wallCtx = communicationCanvas.getContext('2d');
const configCanvas = $('configurationPreview');
const configCtx = configCanvas.getContext('2d');
const customCanvas = $('customPlanCanvas');
const customCtx = customCanvas.getContext('2d');

function t(key){ return COPY[language]?.[key] || COPY.ru[key] || key; }
function elabel(type){ return ELEMENT_LABELS[type]?.[language] || ELEMENT_LABELS[type]?.ru || type; }
function cfgLabel(code){ return CONFIG_LABELS[code]?.[language] || CONFIG_LABELS[code]?.ru || code; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function uid(){ return crypto.randomUUID ? crypto.randomUUID() : `bizet-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function request(url,options={}){ return fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options}).then(async r=>{if(!r.ok){let d=`${r.status} ${r.statusText}`;try{const p=await r.json();d=p.detail||d;}catch(_){}throw new Error(d);}return r.json();}); }
function showToast(message){ clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},2400); }
function showError(message){ $('errorBanner').textContent=message;$('errorBanner').hidden=!message; }
function openDialog(d){ $('settingsPanel').hidden=true; if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open',''); }
function closeDialog(d){ if(typeof d.close==='function')d.close();else d.removeAttribute('open'); }
async function patch(path,value,reason){ if(!project?.identity?.internal_id)return;const result=await request(`/api/v1.1/projects/${project.identity.internal_id}`,{method:'PATCH',body:JSON.stringify({path,value,reason})});project=result.project;return project; }

function applyTheme(){ document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);$('themeSelect').value=theme;drawConfigurationPreview();drawCustomPlan();drawWall(); }
function applyLanguage(){
  document.documentElement.lang=language;localStorage.setItem(LANGUAGE_KEY,language);$('settingsTitle').textContent=t('settings');$('themeLabel').textContent=t('theme');$('languageLabel').textContent=t('language');$('themeSelect').options[0].textContent=t('light');$('themeSelect').options[1].textContent=t('dark');$('languageSelect').value=language;$('feedbackButton').textContent=t('feedback');$('tutorialButton').textContent=t('tutorial');$('loginButton').textContent=t('login');$('registerButton').textContent=t('register');
  $('elementsEyebrow').textContent=t('eyebrow');$('elementsTitle').textContent=t('title');$('elementsSubtitle').textContent=t('subtitle');$('configurationTitle').textContent=t('configuration');$('configurationCopy').textContent=t('configurationCopy');$('wallWorkflowTitle').textContent=t('workflow');$('wallWorkflowCopy').textContent=t('workflowCopy');$('positionDimensionsLabel').textContent=t('positionDimensions');$('positionDimensionsState').textContent=showPositionDimensions?t('on'):t('off');$('wallOriginNote').textContent=t('origin');$('addElementTitle').textContent=t('add');$('addElementButton').textContent=t('addButton');$('emptyWallButton').textContent=t('empty');$('confirmWallButton').textContent=t('confirm');$('previousWallButton').textContent=t('previous');$('deleteElementButton').textContent=t('delete');$('completionTitle').textContent=t('complete');$('completionCopy').textContent=t('completeCopy');$('customPlanTitle').textContent=t('customTitle');$('customPlanCopy').textContent=t('customCopy');$('customDetectedLabel').textContent=t('detected');$('clearCustomPlanButton').textContent=t('clear');$('acceptCustomPlanButton').textContent=t('use');
  renderConfigurationText();renderWallUi();renderSelectedItem();drawConfigurationPreview();drawCustomPlan();drawWall();
}

$('settingsButton').addEventListener('click',e=>{e.stopPropagation();$('settingsPanel').hidden=!$('settingsPanel').hidden;});$('settingsPanel').addEventListener('click',e=>e.stopPropagation());document.addEventListener('click',()=>{$('settingsPanel').hidden=true;});
$('themeSelect').addEventListener('change',e=>{theme=e.target.value;applyTheme();});$('languageSelect').addEventListener('change',e=>{language=e.target.value;applyLanguage();});
[$('loginButton'),$('registerButton')].forEach(b=>b.addEventListener('click',()=>{$('settingsNotice').textContent=language==='ru'?'Аккаунт подключим отдельным слоем. Гостевой режим остаётся доступным.':'Account features will be connected separately. Guest mode remains available.';$('settingsNotice').hidden=false;}));
$('feedbackButton').addEventListener('click',()=>{$('feedbackMessage').value=localStorage.getItem(FEEDBACK_KEY)||'';openDialog($('feedbackDialog'));});$('tutorialButton').addEventListener('click',()=>openDialog($('tutorialDialog')));$('feedbackClose').addEventListener('click',()=>closeDialog($('feedbackDialog')));$('tutorialClose').addEventListener('click',()=>closeDialog($('tutorialDialog')));$('feedbackSubmit').addEventListener('click',()=>{localStorage.setItem(FEEDBACK_KEY,$('feedbackMessage').value.trim());$('feedbackStatus').textContent=t('saved');$('feedbackStatus').hidden=false;});
[$('feedbackDialog'),$('tutorialDialog')].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)closeDialog(d);}));

function readDimensions(){ const g=project?.room?.geometry||{};dimensions.lengthMm=g.wall_length?.value_mm||6000;dimensions.widthMm=g.wall_depth?.value_mm||4200;dimensions.heightMm=g.room_height?.value_mm||2800; }
function activeWall(){ return wallSequence[wallIndex] || null; }
function wallLengthMm(wall=activeWall()){ return wall==='A'||wall==='D'?dimensions.lengthMm:dimensions.widthMm; }
function normalizeWallSequence(walls){ const set=new Set(walls);return WALL_ORDER.filter(w=>set.has(w)); }

function configurationWallsFor(code){ return code==='CUSTOM'?customDetectedWalls:(CONFIG_WALLS[code]||[]); }
function renderConfigurationText(){ const walls=wallSequence.length?wallSequence.join(' → '):'—';$('configurationWalls').textContent=`${t('walls')}: ${walls}`; }
function drawPlanBase(ctx,canvas){
  const dark=theme==='dark',w=canvas.width,h=canvas.height,padX=w*.11,padY=h*.16,rw=w-padX*2,rh=h-padY*2;ctx.clearRect(0,0,w,h);ctx.fillStyle=dark?'#1b1b19':'#f4f3ef';ctx.fillRect(0,0,w,h);ctx.strokeStyle=dark?'rgba(245,242,235,.38)':'rgba(23,23,22,.30)';ctx.lineWidth=2;ctx.strokeRect(padX,padY,rw,rh);ctx.font='700 12px Inter, sans-serif';ctx.fillStyle=dark?'rgba(245,242,235,.72)':'rgba(23,23,22,.68)';ctx.textAlign='center';ctx.fillText('A',w/2,padY-7);ctx.fillText('D',w/2,padY+rh+18);ctx.fillText('B',padX-14,padY+rh/2);ctx.fillText('C',padX+rw+14,padY+rh/2);return {x:padX,y:padY,w:rw,h:rh};
}
function drawConfigurationPreview(){
  const box=drawPlanBase(configCtx,configCanvas),dark=theme==='dark';configCtx.strokeStyle=dark?'#f3efe5':'#171716';configCtx.lineWidth=9;configCtx.lineCap='round';configCtx.lineJoin='round';configCtx.beginPath();
  const x=box.x,y=box.y,w=box.w,h=box.h;
  if(configuration==='WALL_CENTER'){configCtx.moveTo(x+w*.25,y+6);configCtx.lineTo(x+w*.75,y+6);}
  else if(configuration==='WALL_LEFT'){configCtx.moveTo(x+7,y+6);configCtx.lineTo(x+w*.64,y+6);}
  else if(configuration==='WALL_RIGHT'){configCtx.moveTo(x+w*.36,y+6);configCtx.lineTo(x+w-7,y+6);}
  else if(configuration==='L_LEFT'){configCtx.moveTo(x+7,y+h*.73);configCtx.lineTo(x+7,y+7);configCtx.lineTo(x+w*.78,y+7);}
  else if(configuration==='L_RIGHT'){configCtx.moveTo(x+w*.22,y+7);configCtx.lineTo(x+w-7,y+7);configCtx.lineTo(x+w-7,y+h*.73);}
  else if(configuration==='U_SHAPE'){configCtx.moveTo(x+7,y+h*.72);configCtx.lineTo(x+7,y+7);configCtx.lineTo(x+w-7,y+7);configCtx.lineTo(x+w-7,y+h*.72);}
  else if(configuration==='CUSTOM'&&customPoints.length>1){customPoints.forEach((p,i)=>{const px=x+p.x*w,py=y+p.y*h;if(i===0)configCtx.moveTo(px,py);else configCtx.lineTo(px,py);});}
  configCtx.stroke();
  for(const wall of wallSequence){configCtx.fillStyle=dark?'#f3efe5':'#171716';let px=x+w/2,py=y-8;if(wall==='B'){px=x-8;py=y+h/2;}if(wall==='C'){px=x+w+8;py=y+h/2;}if(wall==='D'){px=x+w/2;py=y+h+8;}configCtx.beginPath();configCtx.arc(px,py,5,0,Math.PI*2);configCtx.fill();}
}

async function applyConfiguration(code,walls,customPlan=null){
  configuration=code;wallSequence=normalizeWallSequence(walls);wallIndex=0;selectedItemId=null;renderConfigurationText();drawConfigurationPreview();$('wallWorkflow').hidden=!wallSequence.length;$('completionCard').hidden=true;
  if(project?.identity?.internal_id){try{await patch('room.configuration',code,'Furniture configuration selection');await patch('scene.visual_settings.configuration_walls',wallSequence,'Furniture configuration wall sequence');if(customPlan)await patch('scene.visual_settings.custom_furniture_plan',customPlan,'Custom furniture plan draft');}catch(error){showError(error.message);}}
  renderWallUi();drawWall();
}

$('configurationSelect').addEventListener('change',()=>{const code=$('configurationSelect').value;if(code==='CUSTOM'){customPoints=[];customDetectedWalls=[];drawCustomPlan();$('customDetectedWalls').textContent='—';$('acceptCustomPlanButton').disabled=true;openDialog($('customPlanDialog'));return;}applyConfiguration(code,configurationWallsFor(code));});

function customPlanBox(){ const w=customCanvas.width,h=customCanvas.height;return {x:w*.12,y:h*.12,w:w*.76,h:h*.76}; }
function drawCustomPlan(){
  const dark=theme==='dark',w=customCanvas.width,h=customCanvas.height,b=customPlanBox();customCtx.clearRect(0,0,w,h);customCtx.fillStyle=dark?'#1b1b19':'#f4f3ef';customCtx.fillRect(0,0,w,h);customCtx.strokeStyle=dark?'rgba(245,242,235,.48)':'rgba(23,23,22,.34)';customCtx.lineWidth=3;customCtx.strokeRect(b.x,b.y,b.w,b.h);
  customCtx.fillStyle=dark?'rgba(245,242,235,.74)':'rgba(23,23,22,.70)';customCtx.font='800 14px Inter,sans-serif';customCtx.textAlign='center';customCtx.fillText('A',b.x+b.w/2,b.y-12);customCtx.fillText('D',b.x+b.w/2,b.y+b.h+24);customCtx.fillText('B',b.x-20,b.y+b.h/2);customCtx.fillText('C',b.x+b.w+20,b.y+b.h/2);
  if(customPoints.length>1){customCtx.strokeStyle=dark?'#f4f0e7':'#171716';customCtx.lineWidth=13;customCtx.lineCap='round';customCtx.lineJoin='round';customCtx.beginPath();customPoints.forEach((p,i)=>{const px=b.x+p.x*b.w,py=b.y+p.y*b.h;if(i===0)customCtx.moveTo(px,py);else customCtx.lineTo(px,py);});customCtx.stroke();}
  for(const wall of customDetectedWalls){customCtx.fillStyle=dark?'#f4f0e7':'#171716';let x=b.x+b.w/2,y=b.y;if(wall==='B'){x=b.x;y=b.y+b.h/2;}if(wall==='C'){x=b.x+b.w;y=b.y+b.h/2;}if(wall==='D'){x=b.x+b.w/2;y=b.y+b.h;}customCtx.beginPath();customCtx.arc(x,y,9,0,Math.PI*2);customCtx.fill();}
}
function recognizeCustomWalls(){
  if(!customPoints.length){customDetectedWalls=[];return;}
  const threshold=.13,detected=[];
  for(const p of customPoints){const distances={A:Math.abs(p.y),D:Math.abs(1-p.y),B:Math.abs(p.x),C:Math.abs(1-p.x)};const [wall,d]=Object.entries(distances).sort((a,b)=>a[1]-b[1])[0];if(d<=threshold&&!detected.includes(wall))detected.push(wall);}
  customDetectedWalls=normalizeWallSequence(detected);$('customDetectedWalls').textContent=customDetectedWalls.length?customDetectedWalls.join(' → '):'—';$('acceptCustomPlanButton').disabled=!customDetectedWalls.length;drawCustomPlan();
}
function customPointer(e){const rect=customCanvas.getBoundingClientRect(),sx=customCanvas.width/rect.width,sy=customCanvas.height/rect.height,b=customPlanBox(),x=(e.clientX-rect.left)*sx,y=(e.clientY-rect.top)*sy;return {x:clamp((x-b.x)/b.w,0,1),y:clamp((y-b.y)/b.h,0,1)};}
customCanvas.addEventListener('pointerdown',e=>{drawingCustom=true;customCanvas.setPointerCapture(e.pointerId);customPoints=[customPointer(e)];drawCustomPlan();});customCanvas.addEventListener('pointermove',e=>{if(!drawingCustom)return;const p=customPointer(e),last=customPoints[customPoints.length-1];if(!last||Math.hypot(p.x-last.x,p.y-last.y)>.01){customPoints.push(p);recognizeCustomWalls();}});function endCustom(){if(!drawingCustom)return;drawingCustom=false;recognizeCustomWalls();}customCanvas.addEventListener('pointerup',endCustom);customCanvas.addEventListener('pointercancel',endCustom);
$('clearCustomPlanButton').addEventListener('click',()=>{customPoints=[];customDetectedWalls=[];$('customDetectedWalls').textContent='—';$('acceptCustomPlanButton').disabled=true;drawCustomPlan();});$('customPlanClose').addEventListener('click',()=>{closeDialog($('customPlanDialog'));$('configurationSelect').value=configuration||'';});$('customPlanDialog').addEventListener('click',e=>{if(e.target===$('customPlanDialog')){$('configurationSelect').value=configuration||'';closeDialog($('customPlanDialog'));}});
$('acceptCustomPlanButton').addEventListener('click',async()=>{if(!customDetectedWalls.length){showToast(t('noWalls'));return;}const payload={wall_sequence:customDetectedWalls,normalized_points:customPoints};closeDialog($('customPlanDialog'));$('configurationSelect').value='CUSTOM';await applyConfiguration('CUSTOM',customDetectedWalls,payload);});

function parseWallNote(note){if(typeof note!=='string'||!note.startsWith('BIZET_WALL:'))return null;try{return JSON.parse(note.slice('BIZET_WALL:'.length));}catch(_){return null;}}
function loadWallItems(){
  wallItems=[];for(const c of project?.communications||[]){const meta=parseWallNote(c.notes);if(meta?.wall)wallItems.push({id:c.id,kind:'COMM',type:c.type,wall:meta.wall,xMm:Number(meta.x_mm)||0,zMm:Number(meta.z_mm)||0});}
  for(const f of project?.room?.architectural_elements||[]){if(f?.source==='BIZET_WALL_FEATURE'&&f.wall)wallItems.push({id:f.id,kind:'FEATURE',type:f.type,wall:f.wall,xMm:Number(f.x_mm)||0,zMm:Number(f.z_mm)||0});}
  wallStatuses=project?.quest?.confirmations?.communication_walls||{};
}
function localToGlobal(item){const L=dimensions.lengthMm,W=dimensions.widthMm,x=item.xMm,z=item.zMm;if(item.wall==='A')return [Math.round(-L/2+x),W,z];if(item.wall==='D')return [Math.round(-L/2+x),0,z];if(item.wall==='B')return [-Math.round(L/2),x,z];return [Math.round(L/2),x,z];}
function buildCommunicationsPayload(){
  const retained=(project?.communications||[]).filter(c=>!parseWallNote(c.notes));const managed=wallItems.filter(i=>i.kind==='COMM').map(i=>({id:i.id,type:i.type,coordinates_mm:localToGlobal(i),tolerance_radius_mm:null,provenance:{source:'USER_ENTERED',confidence:null,confirmed:false,note:null},confirmation_state:'UNCONFIRMED',notes:`BIZET_WALL:${JSON.stringify({wall:i.wall,x_mm:i.xMm,z_mm:i.zMm})}`}));return [...retained,...managed];
}
function buildFeaturesPayload(){const retained=(project?.room?.architectural_elements||[]).filter(f=>f?.source!=='BIZET_WALL_FEATURE');const managed=wallItems.filter(i=>i.kind==='FEATURE').map(i=>({id:i.id,source:'BIZET_WALL_FEATURE',type:i.type,wall:i.wall,x_mm:i.xMm,z_mm:i.zMm}));return [...retained,...managed];}
async function persistItems(){try{await patch('communications',buildCommunicationsPayload(),'Wall communication placement');await patch('room.architectural_elements',buildFeaturesPayload(),'Wall structural feature placement');}catch(error){showError(error.message);}}
async function persistStatuses(){try{await patch('quest.confirmations.communication_walls',wallStatuses,'Wall communication confirmations');}catch(error){showError(error.message);}}

function itemsForWall(wall=activeWall()){return wallItems.filter(i=>i.wall===wall);}
function selectedItem(){return wallItems.find(i=>i.id===selectedItemId)||null;}
function renderWallUi(){
  if(!wallSequence.length){$('wallWorkflow').hidden=true;return;}$('wallWorkflow').hidden=false;const wall=activeWall();$('activeWallTitle').textContent=`${t('wall')} ${wall}`;$('wallProgress').textContent=`${t('wall')} ${wall} · ${wallIndex+1}/${wallSequence.length}`;$('previousWallButton').disabled=wallIndex===0;const hasItems=itemsForWall().length>0;$('emptyWallButton').disabled=hasItems;
  const list=itemsForWall();$('wallItemsList').innerHTML=list.map(i=>`<button class="wall-item-row ${i.id===selectedItemId?'is-selected':''}" type="button" data-item-id="${i.id}"><span>${elabel(i.type)}</span><small>X ${i.xMm} · Z ${i.zMm}</small></button>`).join('');document.querySelectorAll('[data-item-id]').forEach(b=>b.addEventListener('click',()=>{selectedItemId=b.dataset.itemId;renderSelectedItem();renderWallUi();drawWall();}));renderSelectedItem();drawWall();
}
function renderSelectedItem(){const item=selectedItem();$('selectedPosition').hidden=!item;if(!item)return;$('selectedElementKind').textContent=item.kind==='COMM'?t('communication'):t('feature');$('selectedElementName').textContent=elabel(item.type);$('coordinateX').value=item.xMm;$('coordinateZ').value=item.zMm;}

function wallCanvasGeometry(){const w=communicationCanvas.width,h=communicationCanvas.height,margin={l:90,r:60,t:50,b:70};return {x:margin.l,y:margin.t,w:w-margin.l-margin.r,h:h-margin.t-margin.b};}
function drawDimension(ctx,x1,y1,x2,y2,text,color){ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);const mx=(x1+x2)/2,my=(y1+y2)/2;ctx.font='650 12px Inter,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const tw=ctx.measureText(text).width+12;ctx.fillStyle=theme==='dark'?'rgba(25,25,23,.9)':'rgba(247,246,242,.94)';ctx.fillRect(mx-tw/2,my-10,tw,20);ctx.fillStyle=color;ctx.fillText(text,mx,my);ctx.restore();}
function drawWall(){
  if(!communicationCanvas||!wallSequence.length)return;const dark=theme==='dark',g=wallCanvasGeometry(),w=communicationCanvas.width,h=communicationCanvas.height,L=wallLengthMm(),H=dimensions.heightMm;wallCtx.clearRect(0,0,w,h);wallCtx.fillStyle=dark?'#1b1b19':'#f4f3ef';wallCtx.fillRect(0,0,w,h);wallCtx.fillStyle=dark?'#302f2b':'#e4e1d8';wallCtx.strokeStyle=dark?'rgba(245,242,235,.30)':'rgba(23,23,22,.24)';wallCtx.lineWidth=2;wallCtx.fillRect(g.x,g.y,g.w,g.h);wallCtx.strokeRect(g.x,g.y,g.w,g.h);wallCtx.fillStyle=dark?'rgba(245,242,235,.75)':'rgba(23,23,22,.68)';wallCtx.font='800 22px Inter,sans-serif';wallCtx.fillText(`WALL ${activeWall()}`,g.x+18,g.y+32);markerHitAreas=[];
  const color=dark?'rgba(245,242,235,.86)':'rgba(23,23,22,.80)';drawDimension(wallCtx,g.x,g.y+g.h+38,g.x+g.w,g.y+g.h+38,`${L} mm`,color);drawDimension(wallCtx,g.x-38,g.y+g.h,g.x-38,g.y,`${H} mm`,color);
  for(const item of itemsForWall()){const px=g.x+clamp(item.xMm/L,0,1)*g.w,py=g.y+g.h-clamp(item.zMm/H,0,1)*g.h;const selected=item.id===selectedItemId;wallCtx.save();wallCtx.fillStyle=selected?(dark?'#f4f0e7':'#171716'):(dark?'#9d988d':'#6e695f');wallCtx.beginPath();wallCtx.arc(px,py,selected?13:10,0,Math.PI*2);wallCtx.fill();wallCtx.font='700 11px Inter,sans-serif';wallCtx.textAlign='center';wallCtx.fillStyle=dark?'#f4f0e7':'#171716';wallCtx.fillText(elabel(item.type),px,py-20);wallCtx.restore();markerHitAreas.push({id:item.id,x:px,y:py,r:20});if(showPositionDimensions){drawDimension(wallCtx,g.x,g.y+g.h+15,px,g.y+g.h+15,`X ${item.xMm}`,color);drawDimension(wallCtx,px+20,g.y+g.h,px+20,py,`Z ${item.zMm}`,color);}}
}
communicationCanvas.addEventListener('click',e=>{const rect=communicationCanvas.getBoundingClientRect(),x=(e.clientX-rect.left)*communicationCanvas.width/rect.width,y=(e.clientY-rect.top)*communicationCanvas.height/rect.height;const hit=markerHitAreas.find(a=>Math.hypot(x-a.x,y-a.y)<=a.r);if(hit){selectedItemId=hit.id;renderWallUi();}});

$('positionDimensionsToggle').addEventListener('click',()=>{showPositionDimensions=!showPositionDimensions;$('positionDimensionsToggle').classList.toggle('is-active',showPositionDimensions);$('positionDimensionsToggle').setAttribute('aria-pressed',String(showPositionDimensions));$('positionDimensionsState').textContent=showPositionDimensions?t('on'):t('off');drawWall();if(project?.identity?.internal_id)patch('scene.visual_settings.show_communication_dimensions',showPositionDimensions,'Communication dimension visibility').catch(()=>{});});
$('addElementButton').addEventListener('click',async()=>{const raw=$('elementSelect').value;if(!raw){showToast(t('chooseElement'));return;}const [kind,type]=raw.split(':'),wall=activeWall(),L=wallLengthMm();const item={id:uid(),kind,type,wall,xMm:Math.round(L/2),zMm:Math.round(dimensions.heightMm/2)};wallItems.push(item);selectedItemId=item.id;wallStatuses[wall]='IN_PROGRESS';renderWallUi();await persistItems();await persistStatuses();});
function updateSelectedCoordinates(persist=true){const item=selectedItem();if(!item)return;item.xMm=clamp(Math.round(Number($('coordinateX').value)||0),0,wallLengthMm(item.wall));item.zMm=clamp(Math.round(Number($('coordinateZ').value)||0),0,dimensions.heightMm);renderSelectedItem();renderWallUi();drawWall();if(persist)persistItems();}
$('coordinateX').addEventListener('input',()=>updateSelectedCoordinates(false));$('coordinateZ').addEventListener('input',()=>updateSelectedCoordinates(false));$('coordinateX').addEventListener('change',()=>updateSelectedCoordinates(true));$('coordinateZ').addEventListener('change',()=>updateSelectedCoordinates(true));
document.querySelectorAll('[data-nudge-axis]').forEach(button=>button.addEventListener('click',()=>{const item=selectedItem();if(!item)return;const delta=Number(button.dataset.nudge)||0;if(button.dataset.nudgeAxis==='x')item.xMm=clamp(item.xMm+delta,0,wallLengthMm(item.wall));else item.zMm=clamp(item.zMm+delta,0,dimensions.heightMm);renderSelectedItem();renderWallUi();drawWall();persistItems();}));
$('deleteElementButton').addEventListener('click',async()=>{if(!selectedItemId)return;wallItems=wallItems.filter(i=>i.id!==selectedItemId);selectedItemId=null;renderWallUi();await persistItems();});

async function moveNext(mark){const wall=activeWall();wallStatuses[wall]=mark;await persistStatuses();if(wallIndex<wallSequence.length-1){wallIndex+=1;selectedItemId=null;renderWallUi();}else{$('completionCard').hidden=false;$('completionCard').scrollIntoView({behavior:'smooth',block:'nearest'});showToast(t('complete'));}}
$('emptyWallButton').addEventListener('click',async()=>{if(itemsForWall().length){showToast(t('emptyBlocked'));return;}await moveNext('EMPTY');});$('confirmWallButton').addEventListener('click',async()=>{await persistItems();await moveNext(itemsForWall().length?'COMPLETE':'EMPTY');});$('previousWallButton').addEventListener('click',()=>{if(wallIndex>0){wallIndex-=1;selectedItemId=null;$('completionCard').hidden=true;renderWallUi();}});

function restoreConfiguration(){configuration=project?.room?.configuration||'';wallSequence=project?.scene?.visual_settings?.configuration_walls||CONFIG_WALLS[configuration]||[];wallSequence=normalizeWallSequence(wallSequence);const saved=project?.scene?.visual_settings?.custom_furniture_plan;if(configuration==='CUSTOM'&&saved){customPoints=Array.isArray(saved.normalized_points)?saved.normalized_points:[];customDetectedWalls=normalizeWallSequence(saved.wall_sequence||wallSequence);wallSequence=customDetectedWalls;}$('configurationSelect').value=configuration||'';showPositionDimensions=project?.scene?.visual_settings?.show_communication_dimensions!==false;$('positionDimensionsToggle').classList.toggle('is-active',showPositionDimensions);$('positionDimensionsToggle').setAttribute('aria-pressed',String(showPositionDimensions));}

async function init(){applyTheme();applyLanguage();drawCustomPlan();const projectId=sessionStorage.getItem(STORAGE_KEY);if(!projectId){showError(t('loadError'));return;}try{project=await request(`/api/v1.1/projects/${projectId}`);readDimensions();loadWallItems();restoreConfiguration();renderConfigurationText();drawConfigurationPreview();if(wallSequence.length){$('wallWorkflow').hidden=false;const firstIncomplete=wallSequence.findIndex(w=>!['COMPLETE','EMPTY'].includes(wallStatuses[w]));wallIndex=firstIncomplete>=0?firstIncomplete:0;renderWallUi();if(wallSequence.every(w=>['COMPLETE','EMPTY'].includes(wallStatuses[w])))$('completionCard').hidden=false;}applyLanguage();}catch(error){showError(t('loadError'));}}
init();
