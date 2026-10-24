const $ = (id) => document.getElementById(id);

const STORAGE_KEY = 'bizet_os_project_id';
const THEME_KEY = 'bizet_os_theme';
const LANGUAGE_KEY = 'bizet_os_language';
const FEEDBACK_KEY = 'bizet_os_pilot_feedback';
const DEFAULT_DIMENSIONS = { lengthMm: 6000, widthMm: 4200, heightMm: 2800 };
const dimensions = { ...DEFAULT_DIMENSIONS };
const TAU = Math.PI * 2;

const CEILING_TYPES = ['STRETCH_A', 'STRETCH_B', 'GYPSUM', 'OPEN_GAP'];
const CEILING_LABELS = {
  STRETCH_A: { ru: 'Натяжной — подготовленное основание', en: 'Stretch — prepared base' },
  STRETCH_B: { ru: 'Готовый натяжной потолок', en: 'Finished stretch ceiling' },
  GYPSUM: { ru: 'Гипсокартонный потолок', en: 'Gypsum ceiling' },
  OPEN_GAP: { ru: 'Открытый зазор / не до потолка', en: 'Open gap / below ceiling' },
};

const SCAN_PROVIDERS = {
  POLYCAM: {
    ios: 'https://apps.apple.com/app/id1532482376',
    android: 'https://play.google.com/store/apps/details?id=ai.polycam',
    web: 'https://poly.cam/get-the-app',
  },
  SKETCHUP: {
    ios: 'https://apps.apple.com/app/id796352563',
    android: 'https://app.sketchup.com/',
    web: 'https://www.sketchup.com/',
  },
};

const COPY = {
  ru: {
    settings: 'Настройки', theme: 'Тема', light: 'Светлая', dark: 'Тёмная', language: 'Язык', login: 'Войти', register: 'Регистрация',
    feedback: 'Обратная связь', tutorial: 'Как пользоваться системой',
    eyebrow: 'Помещение', title: 'Ваше помещение', subtitle: 'Вращайте помещение на 360° пальцем или мышью. Для точного вида используйте куб справа.',
    viewport: 'Интерактивная 3D-сцена', reset: 'Исходный вид', hint: '360° вращение · куб справа переключает точные виды',
    scopeTitle: 'Геометрия помещения', scopeCopy: 'Стены обозначены A–D. Нажмите на стену или пол, чтобы проверить или изменить размеры.',
    measurement: 'Конфигурация мебели и коммуникации',
    summary: 'Ваш выбор', object: 'Объект', zone: 'Зона', category: 'Категория', styling: 'Оформление',
    wall: 'Стена', floor: 'Пол', geometry: 'Геометрия', length: 'Длина', width: 'Ширина', height: 'Высота', saveDimensions: 'Сохранить данные',
    defaultDimensions: 'Показаны размеры по умолчанию. Измените их на фактические.', savedDimensions: 'Показаны сохранённые размеры помещения.',
    dimensionsSaved: 'Данные сохранены', invalidDimensions: 'Введите корректные размеры в миллиметрах.', livePreview: '3D меняется сразу при вводе значения.',
    dimensions: 'Размеры', on: 'Вкл', off: 'Выкл', ceiling: 'Потолок', ceilingType: 'Вид потолка', scan: 'Скан',
    scanTitle: 'Скан помещения', scanCopy: 'Выберите приложение. BIZET OS откроет официальный канал приложения для вашего устройства.',
    polycamHint: '3D / LiDAR сканирование', sketchupHint: 'SketchUp для iPhone / iPad или Web',
    scanNote: 'Прямой импорт результата в BIZET OS будет подключён через независимый Input Adapter.',
    authPending: 'Вход и регистрация будут подключены отдельным слоем аккаунта. Гостевой режим остаётся доступным.',
    feedbackTitle: 'Обратная связь', feedbackCopy: 'Опишите вопрос, идею или замечание.', feedbackPlaceholder: 'Ваше сообщение', feedbackSubmit: 'Сохранить для пилота', feedbackSaved: 'Сообщение сохранено в этом браузере для текущего пилота.',
    tutorialTitle: 'Как пользоваться системой', tutorialCopy: 'Видеоинструкция будет подключена после утверждения сценария.',
    loadError: 'Не удалось загрузить текущий проект. Вернитесь на стартовый экран и повторите выбор.',
    front: 'Перед', back: 'Зад', left: 'Лево', right: 'Право', top: 'Верх', bottom: 'Низ'
  },
  en: {
    settings: 'Settings', theme: 'Theme', light: 'Light', dark: 'Dark', language: 'Language', login: 'Sign in', register: 'Register',
    feedback: 'Feedback', tutorial: 'How to use the system',
    eyebrow: 'Room', title: 'Your room', subtitle: 'Orbit the room freely through 360° with a mouse or finger. Use the view cube for exact views.',
    viewport: 'Interactive 3D scene', reset: 'Reset view', hint: '360° orbit · use the cube for exact views',
    scopeTitle: 'Room geometry', scopeCopy: 'Walls are marked A–D. Tap a wall or the floor to review or change dimensions.',
    measurement: 'Furniture configuration and communications',
    summary: 'Your choices', object: 'Object', zone: 'Zone', category: 'Category', styling: 'Styling',
    wall: 'Wall', floor: 'Floor', geometry: 'Geometry', length: 'Length', width: 'Width', height: 'Height', saveDimensions: 'Save data',
    defaultDimensions: 'Default dimensions are shown. Replace them with the actual measurements.', savedDimensions: 'Saved room dimensions are shown.',
    dimensionsSaved: 'Data saved', invalidDimensions: 'Enter valid dimensions in millimetres.', livePreview: '3D updates immediately while you type.',
    dimensions: 'Dimensions', on: 'On', off: 'Off', ceiling: 'Ceiling', ceilingType: 'Ceiling type', scan: 'Scan',
    scanTitle: 'Room scan', scanCopy: 'Choose an app. BIZET OS will open the official app channel for your device.',
    polycamHint: '3D / LiDAR scanning', sketchupHint: 'SketchUp for iPhone / iPad or Web',
    scanNote: 'Direct result import into BIZET OS will be connected through a provider-neutral Input Adapter.',
    authPending: 'Sign in and registration will be connected as a separate account layer. Guest mode remains available.',
    feedbackTitle: 'Feedback', feedbackCopy: 'Describe a question, idea, or issue.', feedbackPlaceholder: 'Your message', feedbackSubmit: 'Save for pilot', feedbackSaved: 'The message has been saved in this browser for the current pilot.',
    tutorialTitle: 'How to use the system', tutorialCopy: 'The video guide will be connected after the scenario is approved.',
    loadError: 'Could not load the current project. Return to the start screen and repeat your choices.',
    front: 'Front', back: 'Back', left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom'
  }
};

const LABELS = {
  object_type: {
    NEW_BUILD: { ru: 'Новострой', en: 'New build' }, OLD_STOCK: { ru: 'Старый фонд', en: 'Historic building' },
    PRIVATE_HOUSE: { ru: 'Частный дом', en: 'Private house' }, COMMERCIAL: { ru: 'Коммерция', en: 'Commercial' }
  },
  product_type: {
    ZONE_KITCHEN: { ru: 'Кухня', en: 'Kitchen' }, ZONE_BEDROOM: { ru: 'Спальная', en: 'Bedroom' },
    ZONE_LIVING_ROOM: { ru: 'Гостиная', en: 'Living room' }, ZONE_WARDROBE: { ru: 'Гардеробная', en: 'Wardrobe' },
    ZONE_OTHER: { ru: 'Другое', en: 'Other' }, COMMERCIAL_ZONE_PENDING: { ru: 'Коммерческая зона', en: 'Commercial zone' }
  },
  complexity_category: { I:{ru:'Категория I',en:'Category I'}, II:{ru:'Категория II',en:'Category II'}, III:{ru:'Категория III',en:'Category III'}, IV:{ru:'Категория IV',en:'Category IV'}, V:{ru:'Категория V',en:'Category V'} },
  visual_direction: { LIGHT:{ru:'Light',en:'Light'}, DARK:{ru:'Dark',en:'Dark'}, OTHER:{ru:'Другое',en:'Other'} }
};

let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'ru';
let currentTheme = localStorage.getItem(THEME_KEY) || 'light';
let project = null;
let toastTimer = null;
let saveTimer = null;
let activeSurface = null;
let previewSnapshot = null;
let previewCommitted = false;
let showDimensions = true;
let selectedCeiling = null;
let cameraAnimation = null;

const camera = { yaw: 0, pitch: 0.34, distance: 8.2 };
const DEFAULT_CAMERA = { ...camera };
const canvas = $('roomCanvas');
const ctx = canvas.getContext('2d');
const pointers = new Map();
let dragStart = null;
let pinchStart = null;
let surfaceHitAreas = [];
let labelHitAreas = [];

function copy(key){ return COPY[currentLanguage]?.[key] || COPY.ru[key] || key; }
function label(group,value){ return LABELS[group]?.[value]?.[currentLanguage] || LABELS[group]?.[value]?.ru || value || '—'; }
function ceilingLabel(value){ return CEILING_LABELS[value]?.[currentLanguage] || CEILING_LABELS[value]?.ru || copy('ceiling'); }
function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
function wrapAngle(value){ let v = value % TAU; if(v > Math.PI) v -= TAU; if(v < -Math.PI) v += TAU; return v; }
function shortestAngle(from,to){ return wrapAngle(to - from); }
function add(a,b){ return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function mul(a,s){ return [a[0]*s,a[1]*s,a[2]*s]; }
function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function length(a){ return Math.hypot(a[0],a[1],a[2]); }
function norm(a){ const l = length(a)||1; return mul(a,1/l); }

function request(url, options={}){
  return fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options}).then(async response=>{
    if(!response.ok){ let detail=`${response.status} ${response.statusText}`; try{const p=await response.json(); detail=p.detail||detail;}catch(_){} throw new Error(detail); }
    return response.json();
  });
}
function showToast(message){ clearTimeout(toastTimer); $('toast').textContent=message; $('toast').hidden=false; toastTimer=setTimeout(()=>{$('toast').hidden=true;},2600); }
function showError(message){ $('errorBanner').textContent=message; $('errorBanner').hidden=!message; }
function openDialog(dialog){ closeSettings(); closeQuestSummary(); closeCeilingMenu(); if(typeof dialog.showModal==='function') dialog.showModal(); else dialog.setAttribute('open',''); }
function closeDialog(dialog){ if(typeof dialog.close==='function') dialog.close(); else dialog.removeAttribute('open'); }

function measured(path,fallback){
  let value=project;
  for(const part of path.split('.')) value=value?.[part];
  return Number.isFinite(value?.value_mm)&&value.value_mm>0 ? value.value_mm : fallback;
}
function loadDimensionsFromProject(){
  dimensions.lengthMm=measured('room.geometry.wall_length',DEFAULT_DIMENSIONS.lengthMm);
  dimensions.widthMm=measured('room.geometry.wall_depth',DEFAULT_DIMENSIONS.widthMm);
  dimensions.heightMm=measured('room.geometry.room_height',DEFAULT_DIMENSIONS.heightMm);
  renderDimensionSummary();
}
function renderDimensionSummary(){ $('dimensionSummary').textContent=`${dimensions.lengthMm} × ${dimensions.widthMm} × H ${dimensions.heightMm} mm`; }
function roomBounds(){ return {left:-dimensions.lengthMm/2000,right:dimensions.lengthMm/2000,front:0,back:dimensions.widthMm/1000,floor:0,top:dimensions.heightMm/1000}; }
function targetPoint(){ const b=roomBounds(); return [0,b.back*.5,b.top*.48]; }
function cameraPosition(){
  const target=targetPoint(); const cp=Math.cos(camera.pitch); const sp=Math.sin(camera.pitch);
  return add(target,[camera.distance*cp*Math.sin(camera.yaw),-camera.distance*cp*Math.cos(camera.yaw),camera.distance*sp]);
}
function buildView(){
  const target=targetPoint(); const position=cameraPosition(); const forward=norm(sub(target,position));
  // Stable spherical basis: unlike world-up cross products this remains valid through both vertical poles.
  const right=norm([Math.cos(camera.yaw),Math.sin(camera.yaw),0]);
  let up=norm([
    -Math.sin(camera.pitch)*Math.sin(camera.yaw),
    Math.sin(camera.pitch)*Math.cos(camera.yaw),
    Math.cos(camera.pitch)
  ]);
  // Keep handedness stable for complete 360° vertical orbits.
  if(dot(up,[0,0,1]) < -0.999999 && Math.abs(Math.cos(camera.pitch)) < 1e-6) up=[0,0,-1];
  return {position,forward,right,up};
}
function projectPoint(point,view,width,height){
  const rel=sub(point,view.position); const x=dot(rel,view.right); const y=dot(rel,view.up); const z=dot(rel,view.forward);
  if(z<=0.04) return null; const focal=Math.min(width,height)*1.08; return [width/2+focal*x/z,height/2-focal*y/z,z];
}

function themeColors(){
  const dark=currentTheme==='dark';
  return dark ? {
    bg:'#1d1d1b',floor:'#2c2b28',back:'#34332f',side:'#292925',ceiling:'rgba(74,72,66,.34)',line:'rgba(235,231,222,.28)',grid:'rgba(235,231,222,.10)',accent:'rgba(235,231,222,.46)',shadow:'rgba(0,0,0,.28)',labelBg:'rgba(246,243,236,.92)',labelInk:'#171716',dimension:'rgba(246,243,236,.84)'
  } : {
    bg:'#efede7',floor:'#d8d4ca',back:'#e4e1d8',side:'#d1cdc3',ceiling:'rgba(245,243,237,.58)',line:'rgba(54,51,46,.28)',grid:'rgba(54,51,46,.10)',accent:'rgba(54,51,46,.42)',shadow:'rgba(80,72,60,.12)',labelBg:'rgba(23,23,22,.82)',labelInk:'#f6f3ec',dimension:'rgba(23,23,22,.78)'
  };
}
function ceilingFill(colors){
  if(selectedCeiling==='STRETCH_A') return currentTheme==='dark'?'rgba(110,108,100,.36)':'rgba(250,248,242,.46)';
  if(selectedCeiling==='STRETCH_B') return currentTheme==='dark'?'rgba(116,114,108,.62)':'rgba(250,249,245,.80)';
  if(selectedCeiling==='GYPSUM') return currentTheme==='dark'?'rgba(91,90,86,.72)':'rgba(228,226,220,.88)';
  if(selectedCeiling==='OPEN_GAP') return null;
  return colors.ceiling;
}
function projectedPolygon(points,view,width,height){ const projected=points.map(p=>projectPoint(p,view,width,height)); return projected.some(p=>!p)?null:projected; }
function drawPolygon(projected,fill,stroke){
  if(!projected) return; ctx.beginPath(); ctx.moveTo(projected[0][0],projected[0][1]); projected.slice(1).forEach(p=>ctx.lineTo(p[0],p[1])); ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function line3d(a,b,view,color,lineWidth,width,height,dash=[]){ const pa=projectPoint(a,view,width,height),pb=projectPoint(b,view,width,height); if(!pa||!pb)return; ctx.save();ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();ctx.restore(); }
function drawSurfaceLabel(point,text,surfaceId,view,width,height){
  const p=projectPoint(point,view,width,height); if(!p)return; const colors=themeColors(); ctx.save();ctx.font='700 13px Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const tw=Math.max(18,ctx.measureText(text).width),w=tw+18,h=30,x=p[0]-w/2,y=p[1]-h/2;ctx.fillStyle=colors.labelBg;ctx.beginPath();ctx.roundRect(x,y,w,h,15);ctx.fill();ctx.fillStyle=colors.labelInk;ctx.fillText(text,p[0],p[1]+.5);ctx.restore();labelHitAreas.push({id:surfaceId,x,y,w,h});
}
function drawDimensionLine(a,b,text,view,color,width,height,offset=[0,0]){
  const pa=projectPoint(a,view,width,height),pb=projectPoint(b,view,width,height); if(!pa||!pb)return;
  const x1=pa[0]+offset[0],y1=pa[1]+offset[1],x2=pb[0]+offset[0],y2=pb[1]+offset[1];ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
  const angle=Math.atan2(y2-y1,x2-x1),tick=5; for(const [x,y] of [[x1,y1],[x2,y2]]){ctx.beginPath();ctx.moveTo(x-Math.sin(angle)*tick,y+Math.cos(angle)*tick);ctx.lineTo(x+Math.sin(angle)*tick,y-Math.cos(angle)*tick);ctx.stroke();}
  const mx=(x1+x2)/2,my=(y1+y2)/2;ctx.font='650 11px Inter, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const tw=ctx.measureText(text).width+12;ctx.fillStyle=currentTheme==='dark'?'rgba(29,29,27,.9)':'rgba(244,243,239,.92)';ctx.fillRect(mx-tw/2,my-10,tw,20);ctx.fillStyle=color;ctx.fillText(text,mx,my);ctx.restore();
}

function drawRoom(){
  const ratio=window.devicePixelRatio||1,width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
  ctx.setTransform(ratio,0,0,ratio,0,0);const colors=themeColors();ctx.clearRect(0,0,width,height);ctx.fillStyle=colors.bg;ctx.fillRect(0,0,width,height);surfaceHitAreas=[];labelHitAreas=[];
  const view=buildView();const {left,right,front,back,floor,top}=roomBounds();
  ctx.save();ctx.filter='blur(24px)';ctx.fillStyle=colors.shadow;ctx.beginPath();ctx.ellipse(width/2,height*.76,width*.27,height*.055,0,0,TAU);ctx.fill();ctx.restore();

  const surfaces=[
    {id:'FLOOR',points:[[left,front,floor],[right,front,floor],[right,back,floor],[left,back,floor]],fill:colors.floor},
    {id:'A',points:[[left,back,floor],[right,back,floor],[right,back,top],[left,back,top]],fill:colors.back},
    {id:'B',points:[[left,front,floor],[left,back,floor],[left,back,top],[left,front,top]],fill:colors.side},
    {id:'C',points:[[right,back,floor],[right,front,floor],[right,front,top],[right,back,top]],fill:colors.side},
    {id:'CEILING',points:[[left,front,top],[left,back,top],[right,back,top],[right,front,top]],fill:ceilingFill(colors)}
  ].map(s=>{
    const projected=projectedPolygon(s.points,view,width,height); const depth=projected?projected.reduce((a,p)=>a+p[2],0)/projected.length:-1; return {...s,projected,depth};
  }).filter(s=>s.projected).sort((a,b)=>b.depth-a.depth);

  for(const s of surfaces){ drawPolygon(s.projected,s.fill,colors.line); if(['A','B','C','FLOOR'].includes(s.id)) surfaceHitAreas.push({id:s.id,points:s.projected.map(p=>[p[0],p[1]]),depth:s.depth}); }

  for(let x=Math.ceil(left*2)/2;x<right;x+=.5) line3d([x,front,floor+.002],[x,back,floor+.002],view,colors.grid,.7,width,height);
  for(let y=front+.5;y<back;y+=.5) line3d([left,y,floor+.002],[right,y,floor+.002],view,colors.grid,.7,width,height);

  // Open front wall D remains selectable through its label and dashed frame.
  line3d([left,front,floor],[left,front,top],view,colors.accent,1.1,width,height,[5,5]);
  line3d([right,front,floor],[right,front,top],view,colors.accent,1.1,width,height,[5,5]);
  line3d([left,front,top],[right,front,top],view,colors.accent,1.1,width,height,[5,5]);
  drawSurfaceLabel([0,back,top*.52],'A','A',view,width,height);drawSurfaceLabel([left,back*.52,top*.52],'B','B',view,width,height);drawSurfaceLabel([right,back*.52,top*.52],'C','C',view,width,height);drawSurfaceLabel([0,front,top*.52],'D','D',view,width,height);drawSurfaceLabel([0,back*.5,floor+.02],'FLOOR','FLOOR',view,width,height);

  if(showDimensions){
    drawDimensionLine([left,front,floor],[right,front,floor],`${dimensions.lengthMm} mm`,view,colors.dimension,width,height,[0,18]);
    drawDimensionLine([right,front,floor],[right,back,floor],`${dimensions.widthMm} mm`,view,colors.dimension,width,height,[16,8]);
    drawDimensionLine([right,back,floor],[right,back,top],`${dimensions.heightMm} mm`,view,colors.dimension,width,height,[22,0]);
  }
  updateViewCube();
}

function pointInPolygon(x,y,points){ let inside=false; for(let i=0,j=points.length-1;i<points.length;j=i++){const xi=points[i][0],yi=points[i][1],xj=points[j][0],yj=points[j][1];const intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||.00001)+xi);if(intersect)inside=!inside;}return inside; }
function surfaceAtPoint(x,y){
  for(let i=labelHitAreas.length-1;i>=0;i--){const a=labelHitAreas[i];if(x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h)return a.id;}
  const hits=surfaceHitAreas.filter(a=>pointInPolygon(x,y,a.points)).sort((a,b)=>a.depth-b.depth); return hits[0]?.id||null;
}

function updateViewCube(){
  const cube=$('viewCube'); if(!cube)return; const yawDeg=camera.yaw*180/Math.PI,pitchDeg=camera.pitch*180/Math.PI;
  cube.style.transform=`rotateX(${pitchDeg}deg) rotateY(${-yawDeg}deg)`;
  $('viewCubeReadout').textContent=`${Math.round((yawDeg%360+360)%360)}° / ${Math.round((pitchDeg%360+360)%360)}°`;
}
function animateCameraTo(targetYaw,targetPitch){
  if(cameraAnimation) cancelAnimationFrame(cameraAnimation); const startYaw=camera.yaw,startPitch=camera.pitch,dy=shortestAngle(startYaw,targetYaw),dp=shortestAngle(startPitch,targetPitch),started=performance.now(),duration=320;
  const tick=(now)=>{const t=clamp((now-started)/duration,0,1),e=1-Math.pow(1-t,3);camera.yaw=wrapAngle(startYaw+dy*e);camera.pitch=wrapAngle(startPitch+dp*e);drawRoom();if(t<1)cameraAnimation=requestAnimationFrame(tick);else{cameraAnimation=null;scheduleCameraSave();}};cameraAnimation=requestAnimationFrame(tick);
}
const VIEW_PRESETS={front:[0,0],back:[Math.PI,0],left:[Math.PI/2,0],right:[-Math.PI/2,0],top:[0,Math.PI/2],bottom:[0,-Math.PI/2],isoNW:[-.7,.55],isoNE:[.7,.55],isoSW:[-.7,-.55],isoSE:[.7,-.55]};
document.querySelectorAll('[data-view-preset]').forEach(button=>button.addEventListener('click',e=>{e.stopPropagation();const p=VIEW_PRESETS[button.dataset.viewPreset];if(p)animateCameraTo(p[0],p[1]);}));

function scheduleCameraSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveCamera,300);}
async function saveCamera(){if(!project?.identity?.internal_id)return;try{const result=await request(`/api/v1.1/projects/${project.identity.internal_id}`,{method:'PATCH',body:JSON.stringify({path:'scene.camera',value:{yaw:camera.yaw,pitch:camera.pitch,distance:camera.distance},reason:'360 viewport camera'})});project=result.project;}catch(_){} }
function restoreCameraFromProject(){const saved=project?.scene?.camera;if(!saved||typeof saved!=='object')return;if(Number.isFinite(saved.yaw))camera.yaw=wrapAngle(saved.yaw);if(Number.isFinite(saved.pitch))camera.pitch=wrapAngle(saved.pitch);if(Number.isFinite(saved.distance))camera.distance=clamp(saved.distance,3.5,30);}

function renderContext(){if(!project?.context)return;const values=[{name:copy('object'),value:label('object_type',project.context.object_type)},{name:copy('zone'),value:label('product_type',project.context.product_type)},{name:copy('category'),value:label('complexity_category',project.context.complexity_category)},{name:copy('styling'),value:label('visual_direction',project.context.visual_direction)}];$('questSummaryList').innerHTML=values.map(item=>`<div class="quest-summary-row"><span>${item.name}</span><strong>${item.value}</strong></div>`).join('');}
function applyTheme(){document.documentElement.dataset.theme=currentTheme;localStorage.setItem(THEME_KEY,currentTheme);$('themeSelect').value=currentTheme;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',currentTheme==='dark'?'#171716':'#f5f4f1');drawRoom();}
function applyLanguage(){
  document.documentElement.lang=currentLanguage;localStorage.setItem(LANGUAGE_KEY,currentLanguage);$('settingsTitle').textContent=copy('settings');$('themeLabel').textContent=copy('theme');$('languageLabel').textContent=copy('language');$('themeSelect').options[0].textContent=copy('light');$('themeSelect').options[1].textContent=copy('dark');$('languageSelect').value=currentLanguage;
  $('feedbackButton').textContent=copy('feedback');$('tutorialButton').textContent=copy('tutorial');$('loginButton').textContent=copy('login');$('registerButton').textContent=copy('register');$('eyebrow').textContent=copy('eyebrow');$('roomTitle').textContent=copy('title');$('roomSubtitle').textContent=copy('subtitle');$('viewportBadge').textContent=copy('viewport');$('resetViewLabel').textContent=copy('reset');$('gestureHint').textContent=copy('hint');$('scopeTitle').textContent=copy('scopeTitle');$('scopeCopy').textContent=copy('scopeCopy');$('measurementLabel').textContent=copy('measurement');$('questSummaryLabel').textContent=copy('summary');
  $('dimensionsToggleLabel').textContent=copy('dimensions');$('dimensionsToggleState').textContent=showDimensions?copy('on'):copy('off');$('ceilingButtonLabel').textContent=selectedCeiling?ceilingLabel(selectedCeiling):copy('ceiling');$('ceilingMenuTitle').textContent=copy('ceilingType');$('scanButtonLabel').textContent=copy('scan');
  document.querySelectorAll('[data-ceiling]').forEach(button=>button.textContent=ceilingLabel(button.dataset.ceiling));
  $('dimensionEyebrow').textContent=copy('geometry');$('dimensionSave').textContent=copy('saveDimensions');$('dimensionPreviewNote').textContent=copy('livePreview');
  $('scanTitle').textContent=copy('scanTitle');$('scanCopy').textContent=copy('scanCopy');$('polycamHint').textContent=copy('polycamHint');$('sketchupHint').textContent=copy('sketchupHint');$('scanNote').textContent=copy('scanNote');
  $('feedbackTitle').textContent=copy('feedbackTitle');$('feedbackCopy').textContent=copy('feedbackCopy');$('feedbackMessage').placeholder=copy('feedbackPlaceholder');$('feedbackSubmit').textContent=copy('feedbackSubmit');$('tutorialTitle').textContent=copy('tutorialTitle');$('tutorialCopy').textContent=copy('tutorialCopy');renderContext();if(activeSurface)populateDimensionDialog(activeSurface);drawRoom();
}
function closeSettings(){$('settingsPanel').hidden=true;$('settingsButton').setAttribute('aria-expanded','false');}
function closeQuestSummary(){$('questSummaryPanel').hidden=true;$('questSummaryButton').setAttribute('aria-expanded','false');}
function closeCeilingMenu(){$('ceilingMenu').hidden=true;$('ceilingButton').setAttribute('aria-expanded','false');}

$('settingsButton').addEventListener('click',e=>{e.stopPropagation();closeQuestSummary();closeCeilingMenu();const open=$('settingsPanel').hidden;$('settingsPanel').hidden=!open;$('settingsButton').setAttribute('aria-expanded',String(open));});
$('settingsPanel').addEventListener('click',e=>e.stopPropagation());
$('questSummaryButton').addEventListener('click',e=>{e.stopPropagation();closeSettings();closeCeilingMenu();const open=$('questSummaryPanel').hidden;$('questSummaryPanel').hidden=!open;$('questSummaryButton').setAttribute('aria-expanded',String(open));});$('questSummaryPanel').addEventListener('click',e=>e.stopPropagation());
$('ceilingButton').addEventListener('click',e=>{e.stopPropagation();closeSettings();closeQuestSummary();const open=$('ceilingMenu').hidden;$('ceilingMenu').hidden=!open;$('ceilingButton').setAttribute('aria-expanded',String(open));});$('ceilingMenu').addEventListener('click',e=>e.stopPropagation());
document.addEventListener('click',()=>{closeSettings();closeQuestSummary();closeCeilingMenu();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSettings();closeQuestSummary();closeCeilingMenu();}});
$('themeSelect').addEventListener('change',e=>{currentTheme=e.target.value;applyTheme();});$('languageSelect').addEventListener('change',e=>{currentLanguage=e.target.value;applyLanguage();});
[$('loginButton'),$('registerButton')].forEach(button=>button.addEventListener('click',()=>{$('settingsNotice').textContent=copy('authPending');$('settingsNotice').hidden=false;}));
$('feedbackButton').addEventListener('click',()=>{$('feedbackStatus').hidden=true;$('feedbackMessage').value=localStorage.getItem(FEEDBACK_KEY)||'';openDialog($('feedbackDialog'));});$('tutorialButton').addEventListener('click',()=>openDialog($('tutorialDialog')));$('feedbackClose').addEventListener('click',()=>closeDialog($('feedbackDialog')));$('tutorialClose').addEventListener('click',()=>closeDialog($('tutorialDialog')));$('scanClose').addEventListener('click',()=>closeDialog($('scanDialog')));$('dimensionClose').addEventListener('click',()=>{restorePreviewSnapshot();closeDialog($('dimensionDialog'));});
$('feedbackSubmit').addEventListener('click',()=>{localStorage.setItem(FEEDBACK_KEY,$('feedbackMessage').value.trim());$('feedbackStatus').textContent=copy('feedbackSaved');$('feedbackStatus').hidden=false;});
[$('feedbackDialog'),$('tutorialDialog'),$('scanDialog'),$('dimensionDialog')].forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){if(dialog===$('dimensionDialog'))restorePreviewSnapshot();closeDialog(dialog);}}));

function surfaceUsesDefault(surfaceId){const geometry=project?.room?.geometry||{};if(surfaceId==='FLOOR')return!geometry.wall_length?.value_mm||!geometry.wall_depth?.value_mm;if(surfaceId==='A'||surfaceId==='D')return!geometry.wall_length?.value_mm||!geometry.room_height?.value_mm;return!geometry.wall_depth?.value_mm||!geometry.room_height?.value_mm;}
function populateDimensionDialog(surfaceId){activeSurface=surfaceId;const isFloor=surfaceId==='FLOOR';$('dimensionTitle').textContent=isFloor?copy('floor'):`${copy('wall')} ${surfaceId}`;$('dimensionPrimaryLabel').textContent=copy('length');$('dimensionSecondaryLabel').textContent=isFloor?copy('width'):copy('height');$('dimensionPrimary').value=isFloor||surfaceId==='A'||surfaceId==='D'?dimensions.lengthMm:dimensions.widthMm;$('dimensionSecondary').value=isFloor?dimensions.widthMm:dimensions.heightMm;$('dimensionDefaultNote').textContent=surfaceUsesDefault(surfaceId)?copy('defaultDimensions'):copy('savedDimensions');}
function openSurfaceEditor(surfaceId){if(!surfaceId)return;previewSnapshot={...dimensions};previewCommitted=false;populateDimensionDialog(surfaceId);openDialog($('dimensionDialog'));}
function restorePreviewSnapshot(){if(previewSnapshot&&!previewCommitted){Object.assign(dimensions,previewSnapshot);renderDimensionSummary();drawRoom();}previewSnapshot=null;previewCommitted=false;activeSurface=null;}
function previewDimensionInputs(){if(!activeSurface)return;const p=Math.round(Number($('dimensionPrimary').value)),s=Math.round(Number($('dimensionSecondary').value));if(!Number.isFinite(p)||!Number.isFinite(s)||p<100||s<100)return;if(activeSurface==='FLOOR'){dimensions.lengthMm=p;dimensions.widthMm=s;}else if(activeSurface==='A'||activeSurface==='D'){dimensions.lengthMm=p;dimensions.heightMm=s;}else{dimensions.widthMm=p;dimensions.heightMm=s;}renderDimensionSummary();drawRoom();}
$('dimensionPrimary').addEventListener('input',previewDimensionInputs);$('dimensionSecondary').addEventListener('input',previewDimensionInputs);
async function patchGeometry(path,value){const result=await request(`/api/v1.1/projects/${project.identity.internal_id}`,{method:'PATCH',body:JSON.stringify({path,value,source:'USER_ENTERED',confirmed:false,reason:'Room surface dimension editor'})});project=result.project;}
$('dimensionSave').addEventListener('click',async()=>{if(!project?.identity?.internal_id||!activeSurface)return;const p=Math.round(Number($('dimensionPrimary').value)),s=Math.round(Number($('dimensionSecondary').value));if(!Number.isFinite(p)||!Number.isFinite(s)||p<100||s<100){showToast(copy('invalidDimensions'));return;}$('dimensionSave').disabled=true;try{if(activeSurface==='FLOOR'){await patchGeometry('room.geometry.wall_length',p);await patchGeometry('room.geometry.wall_depth',s);}else{await patchGeometry(activeSurface==='A'||activeSurface==='D'?'room.geometry.wall_length':'room.geometry.wall_depth',p);await patchGeometry('room.geometry.room_height',s);}loadDimensionsFromProject();const fit=Math.max(dimensions.lengthMm,dimensions.widthMm,dimensions.heightMm)/1000*1.35;camera.distance=clamp(fit,3.5,30);previewCommitted=true;previewSnapshot=null;const dialog=$('dimensionDialog');activeSurface=null;drawRoom();scheduleCameraSave();closeDialog(dialog);showToast(copy('dimensionsSaved'));}catch(error){showError(error.message);}finally{$('dimensionSave').disabled=false;}});

$('dimensionsToggleButton').addEventListener('click',async()=>{showDimensions=!showDimensions;$('dimensionsToggleButton').classList.toggle('is-active',showDimensions);$('dimensionsToggleButton').setAttribute('aria-pressed',String(showDimensions));$('dimensionsToggleState').textContent=showDimensions?copy('on'):copy('off');drawRoom();if(project?.identity?.internal_id){try{const result=await request(`/api/v1.1/projects/${project.identity.internal_id}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings.show_dimensions',value:showDimensions,reason:'Viewport dimension visibility'})});project=result.project;}catch(_){}}});

document.querySelectorAll('[data-ceiling]').forEach(button=>button.addEventListener('click',async()=>{selectedCeiling=button.dataset.ceiling;if(!CEILING_TYPES.includes(selectedCeiling))return;$('ceilingButtonLabel').textContent=ceilingLabel(selectedCeiling);closeCeilingMenu();drawRoom();if(project?.identity?.internal_id){try{const result=await request(`/api/v1.1/projects/${project.identity.internal_id}`,{method:'PATCH',body:JSON.stringify({path:'room.ceiling.type',value:selectedCeiling,reason:'Ceiling selector'})});project=result.project;}catch(error){showError(error.message);}}}));
$('scanButton').addEventListener('click',()=>openDialog($('scanDialog')));
function devicePlatform(){const ua=navigator.userAgent||'';if(/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'ios';if(/Android/i.test(ua))return'android';return'web';}
document.querySelectorAll('[data-scan-provider]').forEach(button=>button.addEventListener('click',()=>{const provider=SCAN_PROVIDERS[button.dataset.scanProvider],platform=devicePlatform();if(provider)window.open(provider[platform]||provider.web,'_blank','noopener,noreferrer');}));

function markInteracted(){$('gestureHint').classList.add('used');}
canvas.addEventListener('pointerdown',event=>{if(cameraAnimation){cancelAnimationFrame(cameraAnimation);cameraAnimation=null;}canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.classList.add('dragging');markInteracted();if(pointers.size===1)dragStart={x:event.clientX,y:event.clientY,yaw:camera.yaw,pitch:camera.pitch,moved:false};if(pointers.size===2){const pts=[...pointers.values()];pinchStart={distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),cameraDistance:camera.distance};}});
canvas.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===1&&dragStart){const dx=event.clientX-dragStart.x,dy=event.clientY-dragStart.y;if(Math.hypot(dx,dy)>6)dragStart.moved=true;camera.yaw=wrapAngle(dragStart.yaw-dx*.005);camera.pitch=wrapAngle(dragStart.pitch+dy*.004);drawRoom();}else if(pointers.size===2&&pinchStart){const pts=[...pointers.values()],distance=Math.max(20,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));camera.distance=clamp(pinchStart.cameraDistance*(pinchStart.distance/distance),3.5,30);drawRoom();}});
function finishPointer(event){const wasTap=pointers.size===1&&dragStart&&!dragStart.moved,rect=canvas.getBoundingClientRect(),tapX=event.clientX-rect.left,tapY=event.clientY-rect.top;pointers.delete(event.pointerId);if(pointers.size===0){canvas.classList.remove('dragging');dragStart=null;pinchStart=null;scheduleCameraSave();if(wasTap)openSurfaceEditor(surfaceAtPoint(tapX,tapY));}else if(pointers.size===1){const point=[...pointers.values()][0];dragStart={x:point.x,y:point.y,yaw:camera.yaw,pitch:camera.pitch,moved:true};pinchStart=null;}}
canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);canvas.addEventListener('wheel',event=>{event.preventDefault();markInteracted();camera.distance=clamp(camera.distance*Math.exp(event.deltaY*.001),3.5,30);drawRoom();scheduleCameraSave();},{passive:false});
$('resetViewButton').addEventListener('click',()=>{Object.assign(camera,DEFAULT_CAMERA);const fit=Math.max(dimensions.lengthMm,dimensions.widthMm,dimensions.heightMm)/1000*1.35;camera.distance=clamp(fit,3.5,30);drawRoom();scheduleCameraSave();});
$('startMeasurementButton').addEventListener('click',()=>window.location.assign('/room-elements'));window.addEventListener('resize',drawRoom);

async function init(){applyTheme();applyLanguage();drawRoom();const projectId=sessionStorage.getItem(STORAGE_KEY);if(!projectId){showError(copy('loadError'));return;}try{project=await request(`/api/v1.1/projects/${projectId}`);loadDimensionsFromProject();restoreCameraFromProject();showDimensions=project?.scene?.visual_settings?.show_dimensions!==false;$('dimensionsToggleButton').classList.toggle('is-active',showDimensions);$('dimensionsToggleButton').setAttribute('aria-pressed',String(showDimensions));selectedCeiling=project?.room?.ceiling?.type||null;renderContext();applyLanguage();drawRoom();}catch(_){showError(copy('loadError'));}}
init();
