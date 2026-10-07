(()=> {
'use strict';
const $=id=>document.getElementById(id);
const host=$('webglHost');
if(!window.THREE || !window.THREE.OrbitControls){
  host.innerHTML='<div style="padding:30px;font:14px -apple-system;color:#811">WebGL engine failed to load. Reload the page.</div>';
  return;
}
const THREE=window.THREE;
const LANG_KEY='bizet_os_language';
let lang=localStorage.getItem(LANG_KEY)||'ua';
const placement=new URLSearchParams(location.search).get('placement')||'center';

const T={
ru:{
 room:'Помещение',size:'Габариты + материалы',drawers:'Ящики',shelves:'Полки',equipment:'Оснащение',lighting:'Освещение',production:'Производство',
 add:'＋ Добавить ещё изделие',price:'Стоимость',position:'Позиция',view:'VIEW',edit:'EDIT',
 hint:'Обертання за рухом пальця · pinch — масштаб · утримання виробу — рух уздовж стіни',
 move:'Перемещение вдоль стены',carcass:'Корпус',fronts:'Фасады',drawerLayer:'Ящики',shelfLayer:'Полки',hardware:'Фурнитура',fasteners:'Крепёж',holes:'Сверловка',lightLayer:'Освещение',dimensions:'Размеры',
 wallWidth:'Ширина стены, мм',roomDepth:'Глубина помещения, мм',roomHeight:'Высота помещения, мм',
 width:'Ширина, мм',height:'Высота, мм',depth:'Глубина, мм',materials:'Материалы',bodyMat:'Корпус · скандинавское белое дерево',accentMat:'Фасад / акцент · сумеречный голубой',thickness:'Толщина основных деталей: 18 мм',
 drawerCount:'Количество ящиков',drawerHeight:'Высота фасада ящика, мм',lowerShelf:'Нижняя зона / полки под ящиками',lowerShelfYes:'Есть',lowerShelfNo:'Нет',lowerZoneHeight:'Высота нижнего отделения, мм',lowerZoneCount:'Количество полок в нижнем отделении',
 drawerRule:'Жёсткое правило: верх блока обычных ящиков не выше 1200 мм от пола.',drawerBody:'Корпус каждого ящика отображается отдельно: боковины, задняя стенка и дно.',
 leftOpen:'Левая открытая секция',rightClosed:'Правая секция за фасадами',shelfCount:'Количество жёстких полок',rigidNote:'В этом пилоте все полки жёсткие. Системный ряд 32 мм не добавляется.',
 rod:'Штанга',rodOn:'Установлена',rodOff:'Нет',rodTop:'Отступ штанги от верха, мм',handles:'Управление ручками',withHandles:'С ручками',handleless:'Без ручек / push-to-open',
 handlesNote:'С ручками: обычные доводчики. Без ручек: push-to-open, беспружинные петли и соответствующие направляющие.',
 led:'LED-подсветка',ledOn:'Включена',ledOff:'Нет',ledPlace:'Расположение',ledTopIn:'На крыше внутри',ledLeftIn:'На левой боковине внутри',ledRightIn:'На правой боковине внутри',ledTopOut:'Снаружи сверху',ledOffset:'Отступ LED, мм',
 exportFormat:'Формат файла',download:'Скачать',bom:'Скачать BOM',details:'Скачать деталировку',order:'Заказать',xml:'XML .project',dwg:'DWG',dxf:'DXF',obj:'OBJ',glb:'GLB',
 xmlPilot:'XML формируется как пилотная структура Project3dc v3.0 на основе изученного образца. До сверки с .project Grande не использовать как подтверждённый производственный файл.',
 otherPending:'Для выбранного формата адаптер ещё не подключён.',apply:'Применить',close:'Закрыть',
 orderTitle:'Пилотный заказ',orderText:'Заказ сформирован в интерфейсе пилота. Канал фактической отправки производителю ещё не подключён.',
 xrayOn:'Прозрачность включена',xrayOff:'Обычный непрозрачный режим',source:'Вход: DWG → CAD-конвертер → mesh → BIZET 3D. CAD-конвертер для AC1032 подключается отдельным адаптером.',
 preliminary:'Предварительная стоимость'
},
en:{
 room:'Room',size:'Dimensions + materials',drawers:'Drawers',shelves:'Shelves',equipment:'Equipment',lighting:'Lighting',production:'Production',
 add:'＋ Add another product',price:'Price',position:'Position',view:'VIEW',edit:'EDIT',
 hint:'Rotation follows the pointer · pinch to zoom · hold product to move along wall',
 move:'Move along wall',carcass:'Carcass',fronts:'Fronts',drawerLayer:'Drawers',shelfLayer:'Shelves',hardware:'Hardware',fasteners:'Fasteners',holes:'Drilling',lightLayer:'Lighting',dimensions:'Dimensions',
 wallWidth:'Wall width, mm',roomDepth:'Room depth, mm',roomHeight:'Room height, mm',
 width:'Width, mm',height:'Height, mm',depth:'Depth, mm',materials:'Materials',bodyMat:'Carcass · Scandinavian white wood',accentMat:'Front / accent · twilight blue',thickness:'Main part thickness: 18 mm',
 drawerCount:'Drawer count',drawerHeight:'Drawer front height, mm',lowerShelf:'Lower zone / shelves below drawers',lowerShelfYes:'Yes',lowerShelfNo:'No',lowerZoneHeight:'Lower compartment height, mm',lowerZoneCount:'Shelf count in lower compartment',
 drawerRule:'Hard rule: the top of a standard drawer block cannot exceed 1200 mm from floor.',drawerBody:'Each drawer has a visible body: sides, back and bottom.',
 leftOpen:'Left open section',rightClosed:'Right section behind fronts',shelfCount:'Rigid shelf count',rigidNote:'All shelves are rigid in this pilot. No 32 mm system row is generated.',
 rod:'Clothes rail',rodOn:'Installed',rodOff:'None',rodTop:'Rail offset from top, mm',handles:'Handle control',withHandles:'With handles',handleless:'Handleless / push-to-open',
 handlesNote:'With handles: standard soft-close hardware. Handleless: push-to-open, springless hinges and compatible runners.',
 led:'LED lighting',ledOn:'On',ledOff:'Off',ledPlace:'Placement',ledTopIn:'Inside under top',ledLeftIn:'Inside left side',ledRightIn:'Inside right side',ledTopOut:'Outside on top',ledOffset:'LED offset, mm',
 exportFormat:'File format',download:'Download',bom:'Download BOM',details:'Download detailing',order:'Order',xml:'XML .project',dwg:'DWG',dxf:'DXF',obj:'OBJ',glb:'GLB',
 xmlPilot:'XML is generated as a pilot Project3dc v3.0 structure based on the reviewed sample. Do not treat it as production-confirmed until checked against Grande .project.',
 otherPending:'The selected format adapter is not connected yet.',apply:'Apply',close:'Close',
 orderTitle:'Pilot order',orderText:'The order is assembled in the pilot UI. The actual manufacturer submission channel is not connected yet.',
 xrayOn:'Transparency enabled',xrayOff:'Normal opaque mode',source:'Input: DWG → CAD converter → mesh → BIZET 3D. The AC1032 CAD adapter is connected separately.',preliminary:'Preliminary price'
},
ua:{
 room:'Приміщення',size:'Габарити + матеріали',drawers:'Шухляди',shelves:'Полиці',equipment:'Оснащення',lighting:'Освітлення',production:'Виробництво',
 add:'＋ Додати ще виріб',price:'Вартість',position:'Позиція',view:'VIEW',edit:'EDIT',
 hint:'Обертання за рухом пальця · pinch — масштаб · утримання виробу — рух уздовж стіни',
 move:'Рух уздовж стіни',carcass:'Корпус',fronts:'Фасади',drawerLayer:'Шухляди',shelfLayer:'Полиці',hardware:'Фурнітура',fasteners:'Кріплення',holes:'Свердління',lightLayer:'Освітлення',dimensions:'Розміри',
 wallWidth:'Ширина стіни, мм',roomDepth:'Глибина приміщення, мм',roomHeight:'Висота приміщення, мм',
 width:'Ширина, мм',height:'Висота, мм',depth:'Глибина, мм',materials:'Матеріали',bodyMat:'Корпус · скандинавське біле дерево',accentMat:'Фасад / акцент · сутінковий блакитний',thickness:'Товщина основних деталей: 18 мм',
 drawerCount:'Кількість шухляд',drawerHeight:'Висота фасаду шухляди, мм',lowerShelf:'Нижня зона / полиці під шухлядами',lowerShelfYes:'Є',lowerShelfNo:'Немає',lowerZoneHeight:'Висота нижнього відділення, мм',lowerZoneCount:'Кількість полиць у нижньому відділенні',
 drawerRule:'Жорстке правило: верх блоку звичайних шухляд не вище 1200 мм від підлоги.',drawerBody:'Корпус кожної шухляди відображається окремо: боковини, задня стінка та дно.',
 leftOpen:'Ліва відкрита секція',rightClosed:'Права секція за фасадами',shelfCount:'Кількість жорстких полиць',rigidNote:'У цьому пілоті всі полиці жорсткі. Системний ряд 32 мм не додається.',
 rod:'Штанга',rodOn:'Встановлена',rodOff:'Немає',rodTop:'Відступ штанги від верху, мм',handles:'Керування ручками',withHandles:'З ручками',handleless:'Без ручок / push-to-open',
 handlesNote:'З ручками: звичайні доводчики. Без ручок: push-to-open, безпружинні петлі та відповідні напрямні.',
 led:'LED-підсвітка',ledOn:'Увімкнена',ledOff:'Немає',ledPlace:'Розташування',ledTopIn:'На даху всередині',ledLeftIn:'На лівій боковині всередині',ledRightIn:'На правій боковині всередині',ledTopOut:'Зовні зверху',ledOffset:'Відступ LED, мм',
 exportFormat:'Формат файлу',download:'Завантажити',bom:'Завантажити BOM',details:'Завантажити деталювання',order:'Замовити',xml:'XML .project',dwg:'DWG',dxf:'DXF',obj:'OBJ',glb:'GLB',
 xmlPilot:'XML формується як пілотна структура Project3dc v3.0 на основі вивченого зразка. До звірки з .project Grande не використовувати як підтверджений виробничий файл.',
 otherPending:'Для вибраного формату адаптер ще не підключений.',apply:'Застосувати',close:'Закрити',
 orderTitle:'Пілотне замовлення',orderText:'Замовлення сформоване в інтерфейсі пілота. Канал фактичного відправлення виробнику ще не підключений.',
 xrayOn:'Прозорість увімкнена',xrayOff:'Звичайний непрозорий режим',source:'Вхід: DWG → CAD-конвертер → mesh → BIZET 3D. CAD-адаптер AC1032 підключається окремо.',preliminary:'Попередня вартість'
}};
const tr=k=>T[lang]?.[k]||T.ru[k]||k;

const S={
 roomW:3000,roomD:2600,roomH:2800,
 w:1100,h:1900,d:500,
 x:placement==='left'?70:placement==='right'?1830:950,
 t:18,drawerT:16.2,backT:3,
 drawerCount:2,drawerHeight:220,
 lowerZoneEnabled:false,lowerZoneHeight:260,lowerZoneShelfCount:1,
 shelvesLeft:4,shelvesRight:1,hasDivider:true,
 rodEnabled:false,rodTop:500,
 handleMode:'HANDLE',
 ledEnabled:false,ledPlace:'TOP_INNER',ledOffset:40,
 bodyColor:'#ddd4c5',accentColor:'#93abc4',
 exportFormat:'PROJECT',currency:'UAH'
};
let visibility={carcass:true,fronts:true,drawers:true,shelves:true,hardware:true,fasteners:true,holes:false,lighting:true};
let showDimensions=true,xray=false,isolated=false,activePanel=null;
let FX={UAH:1},priceData=null;

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.94;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x24262a);
scene.fog=new THREE.Fog(0x24262a,4200,8200);

const camera=new THREE.PerspectiveCamera(38,1,1,15000);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;
controls.rotateSpeed=.62;
controls.panSpeed=.65;
controls.zoomSpeed=.85;
controls.minDistance=900;controls.maxDistance=6200;
controls.minPolarAngle=.18;controls.maxPolarAngle=1.48;
controls.screenSpacePanning=true;
controls.enableKeys=false;

const hemi=new THREE.HemisphereLight(0xffffff,0x34363a,.66);scene.add(hemi);
const key=new THREE.DirectionalLight(0xffffff,.68);key.position.set(-1800,3300,2600);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-2600;key.shadow.camera.right=2600;key.shadow.camera.top=3200;key.shadow.camera.bottom=-500;key.shadow.camera.near=100;key.shadow.camera.far=8500;scene.add(key);
const fill=new THREE.DirectionalLight(0xbfd2ff,.18);fill.position.set(2600,1800,1200);scene.add(fill);

const roomGroup=new THREE.Group(), modelGroup=new THREE.Group(), dimensionGroup=new THREE.Group(), techGroup=new THREE.Group(), ledGroup=new THREE.Group();
scene.add(roomGroup,modelGroup,dimensionGroup,techGroup,ledGroup);

const bodyMat=new THREE.MeshStandardMaterial({color:S.bodyColor,roughness:.58,metalness:0,transparent:false,depthTest:true,depthWrite:true});
const accentMat=new THREE.MeshStandardMaterial({color:S.accentColor,roughness:.48,metalness:0,transparent:false,depthTest:true,depthWrite:true});
const drawerMat=new THREE.MeshStandardMaterial({color:0xd9d1c5,roughness:.62,metalness:0});
const backMat=new THREE.MeshStandardMaterial({color:0xd0cbc2,roughness:.78,metalness:0});
const metalMat=new THREE.MeshStandardMaterial({color:0x42474b,roughness:.28,metalness:.72});
const silverMat=new THREE.MeshStandardMaterial({color:0xaeb4b7,roughness:.28,metalness:.74});
const holeMat=new THREE.MeshStandardMaterial({color:0x302d2a,roughness:.8,metalness:0});
const ledMat=new THREE.MeshStandardMaterial({color:0xfff0c2,emissive:0xffd889,emissiveIntensity:1.6,roughness:.35});

let furnitureMeshes=[],categoryMeshes={},drillOps=[],fastenerOps=[],detailsCache=[];
function catPush(cat,mesh){(categoryMeshes[cat]||(categoryMeshes[cat]=[])).push(mesh);furnitureMeshes.push(mesh)}
function disposeGroup(group){
 while(group.children.length){const o=group.children.pop();o.traverse?.(n=>{if(n.geometry)n.geometry.dispose();if(n.material&&n.material.userData?.owned)n.material.dispose()})}
}
function matClone(base){const m=base.clone();m.userData.owned=true;return m}
function box(name,w,h,d,x,y,z,mat,cat,partId){
 const geo=new THREE.BoxGeometry(Math.max(.1,w),Math.max(.1,h),Math.max(.1,d));
 const mesh=new THREE.Mesh(geo,matClone(mat));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData={cat,partId,solid:true};modelGroup.add(mesh);catPush(cat,mesh);return mesh;
}
function cylinder(name,r,len,x,y,z,mat,cat,axis='x',segments=24){
 const geo=new THREE.CylinderGeometry(r,r,len,segments);
 const mesh=new THREE.Mesh(geo,matClone(mat));mesh.name=name;mesh.position.set(x,y,z);
 if(axis==='x')mesh.rotation.z=Math.PI/2;else if(axis==='z')mesh.rotation.x=Math.PI/2;
 mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={cat,solid:true};modelGroup.add(mesh);catPush(cat,mesh);return mesh;
}
function addHandle(x,y,z,orientation='H'){
 if(S.handleMode!=='HANDLE')return;
 if(orientation==='H'){
   box('Handle',130,10,14,x,y,z,metalMat,'hardware','HANDLE');
   box('Handle post L',10,10,22,x-45,y,z-15,metalMat,'hardware','HANDLE');
   box('Handle post R',10,10,22,x+45,y,z-15,metalMat,'hardware','HANDLE');
 }else{
   box('Handle',10,130,14,x,y,z,metalMat,'hardware','HANDLE');
   box('Handle post 1',10,10,22,x,y-45,z-15,metalMat,'hardware','HANDLE');
   box('Handle post 2',10,10,22,x,y+45,z-15,metalMat,'hardware','HANDLE');
 }
}
function addHole(x,y,z,axis='x',diam=5,depth=5,partId=''){
 drillOps.push({x,y,z,axis,diam,depth,partId});
}
function addFastener(x,y,z,axis='x',diam=5,len=8,type='CONFIRMAT'){
 fastenerOps.push({x,y,z,axis,diam,len,type});
}
function renderTechnical(){
 disposeGroup(techGroup);
 if(visibility.holes){
   drillOps.forEach((d,i)=>{
     const geo=new THREE.CylinderGeometry(d.diam/2,d.diam/2,Math.max(2,d.depth),18);
     const m=matClone(holeMat),mesh=new THREE.Mesh(geo,m);
     mesh.position.set(d.x,d.y,d.z);if(d.axis==='x')mesh.rotation.z=Math.PI/2;else if(d.axis==='z')mesh.rotation.x=Math.PI/2;
     mesh.userData={cat:'holes'};techGroup.add(mesh);
   });
 }
 if(visibility.fasteners){
   fastenerOps.forEach(f=>{
     const geo=new THREE.CylinderGeometry(f.diam/2,f.diam/2,f.len,16);
     const m=matClone(silverMat),mesh=new THREE.Mesh(geo,m);
     mesh.position.set(f.x,f.y,f.z);if(f.axis==='x')mesh.rotation.z=Math.PI/2;else if(f.axis==='z')mesh.rotation.x=Math.PI/2;
     mesh.userData={cat:'fasteners'};techGroup.add(mesh);
   });
 }
 techGroup.position.copy(modelGroup.position);
}

function addRigidShelfHoles(y,side){
 const D=S.d,front=85,back=D-85,t=S.t,split=S.w*.37;
 if(side==='LEFT'){
   [[t+1,front],[t+1,back],[split-t/2-1,front],[split-t/2-1,back]].forEach(([x,z])=>addHole(x,y,z,'x',5,5,side+'_SHELF'));
   addFastener(t+3,y,front,'x',5,7,'CONFIRMAT');addFastener(split-t/2-3,y,front,'x',5,7,'CONFIRMAT');
 }else{
   [[split+t/2+1,front],[split+t/2+1,back],[S.w-t-1,front],[S.w-t-1,back]].forEach(([x,z])=>addHole(x,y,z,'x',5,5,side+'_SHELF'));
   addFastener(split+t/2+3,y,front,'x',5,7,'CONFIRMAT');addFastener(S.w-t-3,y,front,'x',5,7,'CONFIRMAT');
 }
}
function addPanelJoinHoles(){
 const t=S.t,D=S.d,H=S.h,front=80,back=D-80;
 [t+1,S.w-t-1].forEach(x=>[front,back].forEach(z=>{addHole(x,t+5,z,'x',7,8,'BOTTOM');addHole(x,H-t-5,z,'x',7,8,'TOP')}));
 const split=S.w*.37;
 [front,back].forEach(z=>{addHole(split,t+5,z,'x',7,8,'DIVIDER');addHole(split,H-t-5,z,'x',7,8,'DIVIDER')});
}
function addHandleHoles(frontSpec){
 if(S.handleMode!=='HANDLE')return;
 frontSpec.forEach(f=>{
   if(f.orientation==='H'){
     addHole(f.x-45,f.y,f.z,'z',5,18,f.partId);addHole(f.x+45,f.y,f.z,'z',5,18,f.partId);
   }else{
     addHole(f.x,f.y-45,f.z,'z',5,18,f.partId);addHole(f.x,f.y+45,f.z,'z',5,18,f.partId);
   }
 });
}

function buildRoom(){
 disposeGroup(roomGroup);
 const floorMat=new THREE.MeshStandardMaterial({color:0x3b3d41,roughness:.94,metalness:0});floorMat.userData.owned=true;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(S.roomW,S.roomD),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set(0,0,0);floor.receiveShadow=true;roomGroup.add(floor);
 const wallMat=new THREE.MeshStandardMaterial({color:0x52555a,roughness:.96,metalness:0});wallMat.userData.owned=true;
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(S.roomW,S.roomH),wallMat);wall.position.set(0,S.roomH/2,-S.roomD/2);wall.receiveShadow=true;roomGroup.add(wall);
 const grid=new THREE.GridHelper(Math.max(S.roomW,S.roomD),Math.max(6,Math.round(Math.max(S.roomW,S.roomD)/500)),0x777b82,0x555960);
 grid.position.y=.5;grid.material.opacity=.20;grid.material.transparent=true;roomGroup.add(grid);
}

function makeDetail(code,name,length,width,thick,material,materialId,klass='18',qty=1,group='CARCASS',drillings=[]){
 return{code,name,length:Math.round(length*10)/10,width:Math.round(width*10)/10,thick,material,materialId,klass,qty,group,drillings};
}
function buildModel(){
 disposeGroup(modelGroup);disposeGroup(ledGroup);disposeGroup(dimensionGroup);
 furnitureMeshes=[];categoryMeshes={};drillOps=[];fastenerOps=[];
 bodyMat.color.set(S.bodyColor);accentMat.color.set(S.accentColor);
 const W=S.w,H=S.h,D=S.d,t=S.t,backT=S.backT,split=W*.37;
 const leftInner=Math.max(120,split-1.5*t),rightInner=Math.max(160,W-split-1.5*t);
 const zCenter=D/2;
 const frontZ=D-3-t/2;
 const detail=[];
 const frontSpecs=[];

 box('Left side',t,H,D,t/2,H/2,zCenter,bodyMat,'carcass','SIDE_L');
 box('Right side',t,H,D,W-t/2,H/2,zCenter,bodyMat,'carcass','SIDE_R');
 box('Bottom',W-2*t,t,D,W/2,t/2,zCenter,bodyMat,'carcass','BOTTOM');
 box('Top',W-2*t,t,D,W/2,H-t/2,zCenter,bodyMat,'carcass','TOP');
 box('Divider',t,H,D,split,H/2,zCenter,bodyMat,'carcass','DIVIDER');
 box('Back',W-2*t,H-2*t,backT,W/2,H/2,backT/2,backMat,'carcass','BACK');
 detail.push(makeDetail('GR.SL','Side left',H,D,t,'Chipboard 18 mm','202:2'));
 detail.push(makeDetail('GR.SR','Side right',H,D,t,'Chipboard 18 mm','202:2'));
 detail.push(makeDetail('GR.BT','Bottom',W-2*t,D,t,'Chipboard 18 mm','202:2'));
 detail.push(makeDetail('GR.TP','Top',W-2*t,D,t,'Chipboard 18 mm','202:2'));
 detail.push(makeDetail('GR.DV','Divider',H,D,t,'Chipboard 18 mm','202:2'));
 detail.push(makeDetail('GR.BK','Back',H-2*t,W-2*t,backT,'HDF 3 mm','202:9'));

 addPanelJoinHoles();

 for(let i=1;i<=S.shelvesLeft;i++){
   const y=t+(H-2*t)*i/(S.shelvesLeft+1);
   box('Left shelf '+i,leftInner,t,D-28,t+leftInner/2,y,D/2-4,bodyMat,'shelves','SHELF_L_'+i);
   addRigidShelfHoles(y,'LEFT');
   detail.push(makeDetail('GR.LS'+i,'Rigid shelf · left '+i,leftInner,D-28,t,'Chipboard 18 mm','202:2'));
 }
 const drawerBase=S.lowerZoneEnabled?Math.max(t,S.lowerZoneHeight):t;
 if(S.lowerZoneEnabled && S.lowerZoneShelfCount>0){
   for(let i=1;i<=S.lowerZoneShelfCount;i++){
     const y=t+(Math.max(t,S.lowerZoneHeight)-2*t)*i/(S.lowerZoneShelfCount+1);
     box('Lower shelf '+i,rightInner,t,D-28,split+t/2+rightInner/2,y,D/2-4,bodyMat,'shelves','LOWER_SHELF_'+i);
     addRigidShelfHoles(y,'RIGHT');
     detail.push(makeDetail('GR.BS'+i,'Rigid shelf below drawers '+i,rightInner,D-28,t,'Chipboard 18 mm','202:2'));
   }
 }
 const drawerTop=Math.min(1200,drawerBase+S.drawerCount*S.drawerHeight);
 for(let i=1;i<=S.shelvesRight;i++){
   const low=Math.max(drawerTop+90,H*.54),high=H-t-90;
   const y=low+(high-low)*i/(S.shelvesRight+1);
   box('Right shelf '+i,rightInner,t,D-28,split+t/2+rightInner/2,y,D/2-4,bodyMat,'shelves','SHELF_R_'+i);
   addRigidShelfHoles(y,'RIGHT');
   detail.push(makeDetail('GR.RS'+i,'Rigid shelf · right '+i,rightInner,D-28,t,'Chipboard 18 mm','202:2'));
 }

 const dw=Math.max(160,rightInner-14),drawerDepth=Math.max(220,D-70),dt=S.drawerT,drawerSideH=Math.min(125,Math.max(80,S.drawerHeight-55));
 for(let i=0;i<S.drawerCount;i++){
   const base=drawerBase+i*S.drawerHeight;
   const frontY=base+S.drawerHeight/2;
   const boxY=base+26+drawerSideH/2;
   const cx=split+t/2+rightInner/2;
   const cz=18+drawerDepth/2;
   box('Drawer '+(i+1)+' left side',dt,drawerSideH,drawerDepth,cx-dw/2+dt/2,boxY,cz,drawerMat,'drawers','DR'+(i+1)+'_SIDE_L');
   box('Drawer '+(i+1)+' right side',dt,drawerSideH,drawerDepth,cx+dw/2-dt/2,boxY,cz,drawerMat,'drawers','DR'+(i+1)+'_SIDE_R');
   box('Drawer '+(i+1)+' back',dw-2*dt,drawerSideH,dt,cx,boxY,18+dt/2,drawerMat,'drawers','DR'+(i+1)+'_BACK');
   box('Drawer '+(i+1)+' inner front',dw-2*dt,drawerSideH,dt,cx,boxY,18+drawerDepth-dt/2,drawerMat,'drawers','DR'+(i+1)+'_INNER_FRONT');
   box('Drawer '+(i+1)+' bottom',dw-2*dt,3,drawerDepth-2*dt,cx,base+22,cz,backMat,'drawers','DR'+(i+1)+'_BOTTOM');
   const frontW=rightInner-6,frontH=Math.max(110,S.drawerHeight-4);
   box('Drawer facade '+(i+1),frontW,frontH,t,split+t/2+rightInner/2,frontY,frontZ,accentMat,'fronts','DR'+(i+1)+'_FACADE');
   addHandle(split+t/2+rightInner/2,frontY,frontZ+t/2+12,'H');
   frontSpecs.push({x:split+t/2+rightInner/2,y:frontY,z:frontZ+t/2,orientation:'H',partId:'DR'+(i+1)+'_FACADE'});
   detail.push(makeDetail('GR.D'+(i+1)+'.SL','Drawer side L '+(i+1),drawerDepth,drawerSideH,dt,'Chipboard drawers 16.2 mm','202:90'));
   detail.push(makeDetail('GR.D'+(i+1)+'.SR','Drawer side R '+(i+1),drawerDepth,drawerSideH,dt,'Chipboard drawers 16.2 mm','202:90'));
   detail.push(makeDetail('GR.D'+(i+1)+'.BK','Drawer back '+(i+1),dw-2*dt,drawerSideH,dt,'Chipboard drawers 16.2 mm','202:90'));
   detail.push(makeDetail('GR.D'+(i+1)+'.IF','Drawer inner front '+(i+1),dw-2*dt,drawerSideH,dt,'Chipboard drawers 16.2 mm','202:90'));
   detail.push(makeDetail('GR.D'+(i+1)+'.BT','Drawer bottom '+(i+1),drawerDepth-2*dt,dw-2*dt,3,'HDF 3 mm','202:9'));
   detail.push(makeDetail('GR.D'+(i+1)+'.FA','Drawer facade '+(i+1),frontW,frontH,t,'MDF 18 mm','202:58','50',1,'FACADE'));
   const slideY=base+55;
   [[split+t/2+2,100],[split+t/2+2,D-120],[W-t-2,100],[W-t-2,D-120]].forEach(([x,z])=>addHole(x,slideY,z,'x',5,5,'DRAWER_SLIDE'));
 }

 const doorBottom=drawerTop+4,doorH=Math.max(180,H-t-doorBottom-4),gap=4,doorW=Math.max(90,(rightInner-gap-6)/2);
 const doorY=doorBottom+doorH/2;
 const doorX1=split+t/2+3+doorW/2,doorX2=doorX1+doorW+gap;
 box('Inset door left',doorW,doorH,t,doorX1,doorY,frontZ,accentMat,'fronts','DOOR_L');
 box('Inset door right',doorW,doorH,t,doorX2,doorY,frontZ,accentMat,'fronts','DOOR_R');
 addHandle(doorX1+doorW/2-42,doorY,frontZ+t/2+12,'V');
 addHandle(doorX2-doorW/2+42,doorY,frontZ+t/2+12,'V');
 frontSpecs.push({x:doorX1+doorW/2-42,y:doorY,z:frontZ+t/2,orientation:'V',partId:'DOOR_L'});
 frontSpecs.push({x:doorX2-doorW/2+42,y:doorY,z:frontZ+t/2,orientation:'V',partId:'DOOR_R'});
 detail.push(makeDetail('GR.F1','Inset door left',doorH,doorW,t,'MDF 18 mm','202:58','50',1,'FACADE'));
 detail.push(makeDetail('GR.F2','Inset door right',doorH,doorW,t,'MDF 18 mm','202:58','50',1,'FACADE'));
 addHandleHoles(frontSpecs);
 // hinge cups and mounting drillings
 [doorX1-doorW/2+35,doorX2+doorW/2-35].forEach((x,idx)=>[doorBottom+120,doorY,H-150].forEach(y=>{
   addHole(x,y,frontZ,'z',35,12,idx===0?'DOOR_L':'DOOR_R');
 }));

 if(S.rodEnabled){
   const rodY=H-Math.max(100,S.rodTop),x1=split+t/2+34,x2=W-t-34,z=D*.56;
   cylinder('Clothes rail',8,x2-x1,(x1+x2)/2,rodY,z,silverMat,'hardware','x');
   cylinder('Rail support left',21,12,x1-7,rodY,z,metalMat,'hardware','x');
   cylinder('Rail support right',21,12,x2+7,rodY,z,metalMat,'hardware','x');
   addHole(x1-10,rodY,z,'x',4,8,'ROD_SUPPORT');addHole(x2+10,rodY,z,'x',4,8,'ROD_SUPPORT');
   addFastener(x1-7,rodY,z,'x',4,9,'SCREW');addFastener(x2+7,rodY,z,'x',4,9,'SCREW');
 }

 if(S.ledEnabled)buildLed();
 detailsCache=detail;
 modelGroup.position.set(S.x-S.roomW/2,0,-S.roomD/2+12);
 ledGroup.position.copy(modelGroup.position);
 renderTechnical();
 buildDimensions();
 applyVisibility();
 updatePrice();
}

function buildLed(){
 disposeGroup(ledGroup);
 const W=S.w,H=S.h,D=S.d,t=S.t,split=W*.37;
 const m=matClone(ledMat);let strip;
 if(S.ledPlace==='TOP_INNER'){
   strip=new THREE.Mesh(new THREE.BoxGeometry(W-split-70,6,12),m);strip.position.set(split+(W-split)/2,H-t-14,D-S.ledOffset);
 }else if(S.ledPlace==='LEFT_INNER'){
   strip=new THREE.Mesh(new THREE.BoxGeometry(6,H-100,12),m);strip.position.set(split+t/2+16,H/2,D-S.ledOffset);
 }else if(S.ledPlace==='RIGHT_INNER'){
   strip=new THREE.Mesh(new THREE.BoxGeometry(6,H-100,12),m);strip.position.set(W-t/2-16,H/2,D-S.ledOffset);
 }else{
   strip=new THREE.Mesh(new THREE.BoxGeometry(W-80,6,12),m);strip.position.set(W/2,H+18,D-S.ledOffset);
 }
 strip.castShadow=false;ledGroup.add(strip);
 const light1=new THREE.PointLight(0xffe6b0,.55,1400,1.7);light1.position.copy(strip.position);ledGroup.add(light1);
 const light2=new THREE.PointLight(0xffe6b0,.30,1000,1.7);light2.position.copy(strip.position);light2.position.x+=120;ledGroup.add(light2);
 ledGroup.position.copy(modelGroup.position);
}

function textSprite(text){
 const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=320;c.height=80;
 ctx.fillStyle='rgba(255,255,255,.94)';ctx.roundRect?.(4,8,312,64,18);ctx.fill();
 ctx.strokeStyle='rgba(0,0,0,.16)';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#171717';ctx.font='700 30px -apple-system, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,160,40);
 const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
 const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});mat.userData.owned=true;
 const s=new THREE.Sprite(mat);s.scale.set(320,80,1);return s;
}
function dimLine(a,b,label,labelPos){
 const geo=new THREE.BufferGeometry().setFromPoints([a,b]);const mat=new THREE.LineBasicMaterial({color:0x262626,transparent:true,opacity:.78});mat.userData.owned=true;
 const l=new THREE.Line(geo,mat);dimensionGroup.add(l);const sp=textSprite(label);sp.position.copy(labelPos);dimensionGroup.add(sp);
}
function buildDimensions(){
 disposeGroup(dimensionGroup);
 if(!showDimensions)return;
 const W=S.w,H=S.h,D=S.d;
 dimLine(new THREE.Vector3(0,H+80,D+40),new THREE.Vector3(W,H+80,D+40),Math.round(W)+' mm',new THREE.Vector3(W/2,H+110,D+40));
 dimLine(new THREE.Vector3(W+80,0,D+40),new THREE.Vector3(W+80,H,D+40),Math.round(H)+' mm',new THREE.Vector3(W+130,H/2,D+40));
 dimLine(new THREE.Vector3(-70,35,0),new THREE.Vector3(-70,35,D),Math.round(D)+' mm',new THREE.Vector3(-110,70,D/2));
 dimensionGroup.position.copy(modelGroup.position);
}

function applyVisibility(){
 Object.entries(categoryMeshes).forEach(([cat,list])=>list.forEach(m=>m.visible=visibility[cat]!==false));
 techGroup.visible=visibility.holes||visibility.fasteners;
 ledGroup.visible=S.ledEnabled && visibility.lighting!==false;
 dimensionGroup.visible=showDimensions;
 if(isolated){
   (categoryMeshes.fronts||[]).forEach(m=>m.visible=false);
   roomGroup.visible=false;
 }else roomGroup.visible=true;
 furnitureMeshes.forEach(mesh=>{
   const base=mesh.material;
   const shouldXray=xray && ['carcass','shelves','drawers'].includes(mesh.userData.cat);
   base.transparent=shouldXray;base.opacity=shouldXray ? .28 : 1;base.depthWrite=!shouldXray;base.needsUpdate=true;
 });
}

function frameModel(){
 const center=new THREE.Vector3(S.x-S.roomW/2+S.w/2,S.h*.50,-S.roomD/2+12+S.d*.48);
 controls.target.copy(center);
 const max=Math.max(S.w,S.h,S.d);
 const dist=Math.max(1550,max*1.35);
 camera.position.set(center.x+dist*.72,center.y+dist*.38,center.z+dist*.95);
 camera.near=1;camera.far=15000;camera.updateProjectionMatrix();controls.update();
}
function resize(){
 const r=host.getBoundingClientRect();if(!r.width||!r.height)return;
 renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
}
const ro=new ResizeObserver(resize);ro.observe(host);

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let holdTimer=null,moving=false,moveStart=null,controlsWas=true;
function hitFurniture(clientX,clientY){
 const r=renderer.domElement.getBoundingClientRect();pointer.x=((clientX-r.left)/r.width)*2-1;pointer.y=-((clientY-r.top)/r.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 return raycaster.intersectObjects(furnitureMeshes.filter(m=>m.visible),false)[0]||null;
}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 const hit=hitFurniture(e.clientX,e.clientY);if(!hit)return;
 moveStart={clientX:e.clientX,x:S.x};
 holdTimer=setTimeout(()=>{moving=true;controlsWas=controls.enabled;controls.enabled=false;$('hint').textContent=tr('move')},420);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!moveStart)return;
 if(!moving && Math.abs(e.clientX-moveStart.clientX)>10){clearTimeout(holdTimer);holdTimer=null;return}
 if(moving){
   const mmPerPx=Math.max(1.5,S.roomW/Math.max(500,renderer.domElement.clientWidth)*.68);
   S.x=Math.max(0,Math.min(S.roomW-S.w,moveStart.x+(e.clientX-moveStart.clientX)*mmPerPx));
   modelGroup.position.x=S.x-S.roomW/2;techGroup.position.x=modelGroup.position.x;dimensionGroup.position.x=modelGroup.position.x;ledGroup.position.x=modelGroup.position.x;
   $('positionLabel').textContent=tr('position')+': '+Math.round(S.x)+' mm';
 }
});
function endMove(){clearTimeout(holdTimer);holdTimer=null;moveStart=null;if(moving){moving=false;controls.enabled=controlsWas;$('hint').textContent=tr('hint')}}
renderer.domElement.addEventListener('pointerup',endMove);renderer.domElement.addEventListener('pointercancel',endMove);

function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();

function field(label,key,value,min,max,step=10){
 return '<label class="field"><span>'+label+'</span><input data-key="'+key+'" type="number" value="'+value+'" min="'+min+'" max="'+max+'" step="'+step+'"></label>';
}
function select(label,key,options,value){
 return '<label class="field"><span>'+label+'</span><select data-key="'+key+'">'+options.map(o=>'<option value="'+o[0]+'" '+(String(o[0])===String(value)?'selected':'')+'>'+o[1]+'</option>').join('')+'</select></label>';
}
function checkbox(label,key,checked){
 return '<label class="field inline"><span>'+label+'</span><input data-key="'+key+'" type="checkbox" '+(checked?'checked':'')+'></label>';
}
function closePanel(){
 activePanel=null;$('panel').hidden=true;[...$('tools').children].forEach(b=>b.classList.remove('active'));
}
function openPanel(name){
 activePanel=name;$('panel').hidden=false;
 [...$('tools').children].forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
 $('panelTitle').textContent=tr(name);let html='';
 if(name==='room')html='<div class="section">'+field(tr('wallWidth'),'roomW',S.roomW,1800,10000)+field(tr('roomDepth'),'roomD',S.roomD,1800,8000)+field(tr('roomHeight'),'roomH',S.roomH,1800,5000)+'</div>';
 if(name==='size')html='<div class="section">'+field(tr('width'),'w',S.w,500,2780)+field(tr('height'),'h',S.h,800,2780)+field(tr('depth'),'d',S.d,250,900)+'</div><div class="section"><div class="subhead">'+tr('materials')+'</div><label class="field"><span>'+tr('bodyMat')+'</span><input data-key="bodyColor" type="color" value="'+S.bodyColor+'"></label><label class="field"><span>'+tr('accentMat')+'</span><input data-key="accentColor" type="color" value="'+S.accentColor+'"></label><p class="note">'+tr('thickness')+'</p></div>';
 if(name==='drawers'){
   html='<div class="section">'+field(tr('drawerCount'),'drawerCount',S.drawerCount,1,5,1)+field(tr('drawerHeight'),'drawerHeight',S.drawerHeight,120,420)+select(tr('lowerShelf'),'lowerZoneEnabled',[['0',tr('lowerShelfNo')],['1',tr('lowerShelfYes')]],S.lowerZoneEnabled?'1':'0');
   if(S.lowerZoneEnabled)html+=field(tr('lowerZoneHeight'),'lowerZoneHeight',S.lowerZoneHeight,180,800)+field(tr('lowerZoneCount'),'lowerZoneShelfCount',S.lowerZoneShelfCount,1,4,1);
   html+='<p class="warn">'+tr('drawerRule')+'</p><p class="note">'+tr('drawerBody')+'</p></div>';
 }
 if(name==='shelves'){
   html='<div class="section"><div class="subhead">'+tr('leftOpen')+'</div>'+field(tr('shelfCount'),'shelvesLeft',S.shelvesLeft,0,12,1)+'</div>';
   html+='<div class="section"><div class="subhead">'+tr('rightClosed')+'</div>'+field(tr('shelfCount'),'shelvesRight',S.shelvesRight,0,12,1)+'</div><p class="note">'+tr('rigidNote')+'</p>';
 }
 if(name==='equipment'){
   html='<div class="section">'+select(tr('rod'),'rodEnabled',[['0',tr('rodOff')],['1',tr('rodOn')]],S.rodEnabled?'1':'0')+(S.rodEnabled?field(tr('rodTop'),'rodTop',S.rodTop,100,1800):'')+'</div>';
   html+='<div class="section">'+select(tr('handles'),'handleMode',[['HANDLE',tr('withHandles')],['PUSH',tr('handleless')]],S.handleMode)+'<p class="note">'+tr('handlesNote')+'</p></div>';
 }
 if(name==='lighting'){
   html='<div class="section">'+select(tr('led'),'ledEnabled',[['0',tr('ledOff')],['1',tr('ledOn')]],S.ledEnabled?'1':'0');
   if(S.ledEnabled)html+=select(tr('ledPlace'),'ledPlace',[['TOP_INNER',tr('ledTopIn')],['LEFT_INNER',tr('ledLeftIn')],['RIGHT_INNER',tr('ledRightIn')],['TOP_OUTER',tr('ledTopOut')]],S.ledPlace)+field(tr('ledOffset'),'ledOffset',S.ledOffset,10,180);
   html+='</div>';
 }
 if(name==='production'){
   html='<div class="section">'+select(tr('exportFormat'),'exportFormat',[['PROJECT',tr('xml')],['DWG',tr('dwg')],['DXF',tr('dxf')],['OBJ',tr('obj')],['GLB',tr('glb')]],S.exportFormat)+'<button class="primary" id="downloadExport">'+tr('download')+'</button></div>';
   html+='<div class="out"><button id="downloadBom">'+tr('bom')+'</button><button id="downloadDetails">'+tr('details')+'</button><button id="orderBtn">'+tr('order')+'</button></div><p class="note">'+tr('xmlPilot')+'</p><p class="note">'+tr('source')+'</p>';
 }
 $('panelBody').innerHTML=html+'<button class="secondary" id="apply">'+tr('apply')+'</button>';
 bindPanel();
}
function bindPanel(){
 $('panelBody').querySelectorAll('[data-key]').forEach(el=>{
   const event=el.type==='color'||el.type==='number'?'input':'change';
   el.addEventListener(event,()=>{
     const k=el.dataset.key;let v=el.type==='number'?Number(el.value):el.type==='checkbox'?el.checked:el.value;
     if(k==='rodEnabled'||k==='ledEnabled'||k==='lowerZoneEnabled')v=v==='1'||v===1||v===true;
     S[k]=v;
     if(S.lowerZoneEnabled===false){S.lowerZoneShelfCount=Math.max(1,S.lowerZoneShelfCount)}
     if(S.drawerCount*S.drawerHeight+(S.lowerZoneEnabled?S.lowerZoneHeight:S.t)>1200){
       S.drawerHeight=Math.max(120,Math.floor((1200-(S.lowerZoneEnabled?S.lowerZoneHeight:S.t))/Math.max(1,S.drawerCount)));
     }
     S.x=Math.max(0,Math.min(S.x,Math.max(0,S.roomW-S.w)));
     if(['roomW','roomD','roomH'].includes(k))buildRoom();
     buildModel();
     if(['lowerZoneEnabled','rodEnabled','ledEnabled'].includes(k))openPanel(activePanel);
   });
 });
 $('apply').onclick=closePanel;
 const ex=$('downloadExport');if(ex)ex.onclick=()=>downloadExport();
 const bom=$('downloadBom');if(bom)bom.onclick=()=>downloadBom();
 const det=$('downloadDetails');if(det)det.onclick=()=>downloadDetails();
 const ord=$('orderBtn');if(ord)ord.onclick=()=>showOrder();
}

function layerPanel(){
 const rows=[['carcass','carcass'],['fronts','fronts'],['drawers','drawerLayer'],['shelves','shelfLayer'],['hardware','hardware'],['fasteners','fasteners'],['holes','holes'],['lighting','lightLayer']];
 $('layerPanel').innerHTML=rows.map(([k,l])=>'<label>'+tr(l)+'<input type="checkbox" data-layer="'+k+'" '+(visibility[k]?'checked':'')+'></label>').join('')+'<div class="sep"></div><label>'+tr('dimensions')+'<input type="checkbox" id="dimToggle" '+(showDimensions?'checked':'')+'></label>';
 $('layerPanel').querySelectorAll('[data-layer]').forEach(el=>el.onchange=()=>{visibility[el.dataset.layer]=el.checked;applyVisibility();renderTechnical()});
 $('dimToggle').onchange=e=>{showDimensions=e.target.checked;buildDimensions();applyVisibility()};
}

const PRICES={CARCAS_M2:776,FACADE_M2:1200,HDF_M2:120,CUT_M:20,EDGE_LABOR_M:30,EDGE_MATERIAL_M:30,HOLE:7,HINGE_CUP:40,GROOVE_M:40,HINGE_BLUM:200,HANDLE:200,CONFIRMAT:1,DOWEL:.8,DRAWER_SLIDE:1200};
function area(d){return d.length*d.width*d.qty/1e6}
function buildBom(){
 const rows=[],add=(group,item,qty,unit,rate,note='')=>rows.push({group,item,qty,unit,rate,total:qty*rate,note});
 const carcass=detailsCache.filter(d=>d.group==='CARCASS').reduce((s,d)=>s+area(d),0);
 const facade=detailsCache.filter(d=>d.group==='FACADE').reduce((s,d)=>s+area(d),0);
 const drawer=detailsCache.filter(d=>d.materialId==='202:90').reduce((s,d)=>s+area(d),0);
 const hdf=detailsCache.filter(d=>d.materialId==='202:9').reduce((s,d)=>s+area(d),0);
 const panelArea=carcass+facade+drawer+hdf,cutM=panelArea*6,edgeM=(carcass+facade+drawer)*6*1.2;
 add('Материалы','ЛДСП / корпус 18 мм',carcass,'м²',PRICES.CARCAS_M2);
 add('Материалы','ЛДСП ящиков 16.2 мм',drawer,'м²',PRICES.CARCAS_M2);
 add('Материалы','MDF / фасады 18 мм',facade,'м²',PRICES.FACADE_M2);
 add('Материалы','HDF 3 мм',hdf,'м²',PRICES.HDF_M2);
 add('Материалы','PVC кромка',edgeM,'п.м',PRICES.EDGE_MATERIAL_M);
 add('Работы','Распил',cutM,'п.м',PRICES.CUT_M);
 add('Работы','Кромкование',edgeM,'п.м',PRICES.EDGE_LABOR_M);
 add('Работы','Сверление',drillOps.length,'шт',PRICES.HOLE);
 add('Фурнитура','Петли + ответные планки',6,'компл',PRICES.HINGE_BLUM);
 add('Работы','Чашка петли',6,'шт',PRICES.HINGE_CUP);
 add('Фурнитура','Направляющие скрытого монтажа',S.drawerCount,'компл',PRICES.DRAWER_SLIDE);
 if(S.handleMode==='HANDLE')add('Фурнитура','Ручка',S.drawerCount+2,'шт',PRICES.HANDLE);
 else add('Фурнитура','Push-to-open / Tip-On',S.drawerCount+2,'шт',0,'Тариф не заморожен');
 add('Крепёж','Конфирмат',fastenerOps.filter(x=>x.type==='CONFIRMAT').length,'шт',PRICES.CONFIRMAT);
 add('Крепёж','Шкант / технологический крепёж',Math.max(8,S.shelvesLeft*4+S.shelvesRight*4),'шт',PRICES.DOWEL);
 if(S.rodEnabled)add('Фурнитура','Штанга + 2 крепления',1,'компл',0,'Тариф Tree Art не получен');
 if(S.ledEnabled)add('Освещение','LED комплект',1,'компл',0,'Тариф не заморожен');
 const cost=rows.reduce((s,r)=>s+r.total,0),client=cost*2;
 return{rows,cost,client,unpriced:rows.filter(r=>r.qty>0&&r.rate===0)};
}
function convertMoney(n,code=S.currency){if(code==='UAH')return n;const rate=Number(FX[code]);return Number.isFinite(rate)&&rate>0?n*rate:null}
function formatMoney(n,code=S.currency){const v=convertMoney(n,code);if(v==null)return '— '+code;return new Intl.NumberFormat(code==='UAH'?'uk-UA':'en-US',{style:'currency',currency:code,maximumFractionDigits:0}).format(v)}
function updatePrice(){
 priceData=buildBom();$('priceLabel').textContent=priceData.unpriced.length?tr('preliminary'):tr('price');$('priceValue').textContent=formatMoney(priceData.client);
}
async function loadFx(){
 try{const r=await fetch('/api/v1.1/fx-rates',{cache:'no-store'});if(r.ok){const b=await r.json();FX={UAH:1,...(b.rates||{})};updatePrice()}}catch(_){}
}

function csv(rows,headers,map){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\ufeff'+[headers.map(q).join(';'),...rows.map(r=>map(r).map(q).join(';'))].join('\n')}
function download(name,type,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},300)}
function downloadBom(){
 const b=buildBom(),code=S.currency;
 download('BIZET_Grande_BOM.csv','text/csv;charset=utf-8',csv(b.rows,['Группа','Позиция','Количество','Ед.','Валюта','Цена','Сумма','Примечание'],r=>[r.group,r.item,r.qty,r.unit,code,convertMoney(r.rate,code)??r.rate,convertMoney(r.total,code)??r.total,r.note]));
}
function downloadDetails(){
 download('BIZET_Grande_Detailing.csv','text/csv;charset=utf-8',csv(detailsCache,['Код','Деталь','Материал','Длина','Ширина','Толщина','Количество'],d=>[d.code,d.name,d.material,d.length,d.width,d.thick,d.qty]));
}
function escXml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function rectShape(l,w,sign=''){
 const id=n=>sign+String(n);return '<Shape>'+
 '<EdgeLine id="'+id(1)+'" X1="0.00000" Y1="0.00000" X2="'+l.toFixed(5)+'" Y2="0.00000" />'+
 '<EdgeLine id="'+id(2)+'" X1="'+l.toFixed(5)+'" Y1="0.00000" X2="'+l.toFixed(5)+'" Y2="'+w.toFixed(5)+'" />'+
 '<EdgeLine id="'+id(3)+'" X1="'+l.toFixed(5)+'" Y1="'+w.toFixed(5)+'" X2="0.00000" Y2="'+w.toFixed(5)+'" />'+
 '<EdgeLine id="'+id(4)+'" X1="0.00000" Y1="'+w.toFixed(5)+'" X2="0.00000" Y2="0.00000" />'+
 '</Shape>';
}
function projectXml(){
 const parts=detailsCache.map((d,i)=>{
   const localDrills=d.drillings||[];
   const drills=localDrills.map((h,j)=>'<Drilling X="'+Number(h.x||20).toFixed(5)+'" Y="'+Number(h.y||20).toFixed(5)+'" Z="'+Number(d.thick).toFixed(5)+'" vectorX="0.00000" vectorY="0.00000" vectorZ="-1.00000" ProjMark="BIZET'+(i+1)+'_'+(j+1)+'" DrilType="2" depth="'+Math.min(12,Number(d.thick)).toFixed(5)+'" diam="'+Number(h.diam||5).toFixed(2)+'" />').join('');
   const cls=d.klass||'18';
   return '<Obj id="BIZET:'+String(i+1)+'" class="'+cls+'" code="'+escXml(d.code)+'" name="'+escXml(d.name)+'" position="'+String(i+1)+'" quantity="'+d.qty+'" unit="0" l="'+Number(d.length).toFixed(3)+'" w="'+Number(d.width).toFixed(3)+'" dtt="'+Number(d.thick).toFixed(3)+'" manipulation="0" dl="'+Number(d.length).toFixed(3)+'" dw="'+Number(d.width).toFixed(3)+'" dtl="'+Number(d.length).toFixed(3)+'" dtw="'+Number(d.width).toFixed(3)+'" material="'+d.materialId+'" txt="false" cutting="true" FactAngle="true" parent="GRANDE" cost="0" costFlag="false" opFlag="" barcode="" machine="">'+
    '<ShapeOverallCS><Side id="base" FaceProp="true">'+rectShape(d.length,d.width)+'</Side><Side id="2">'+rectShape(d.length,d.width,'-')+'</Side><Drillings>'+drills+'</Drillings></ShapeOverallCS>'+
    '<ShapeCuttingCS><Side id="base" FaceProp="true">'+rectShape(d.length,d.width)+'</Side><Side id="2">'+rectShape(d.length,d.width,'-')+'</Side><Drillings>'+drills+'</Drillings></ShapeCuttingCS></Obj>';
 }).join('\n');
 return '<?xml version="1.0" encoding="UTF-8" ?>\n<Project3dc name="Grande_BIZET_PILOT" date="'+new Date().toISOString().slice(0,10).replace(/-/g,'.')+'" version="3.0">\n'+
 '<Dictionary><Classes><Item id="1" description="Assembly" /><Item id="18" description="Sheet Part" /><Item id="50" description="Sheet Door" /></Classes><Units><Item id="0" description="Piece" name="pcs" /><Item id="5" description="Millimetre" name="mm" /></Units><Materials>'+
 '<Item id="202:2" type="sheet" code="CBD_WHITE18" name="Scandinavian white wood 18 mm" thick="18" cost="0" />'+
 '<Item id="202:58" type="sheet" code="MDF18" name="Twilight blue MDF 18 mm" thick="18" cost="0" />'+
 '<Item id="202:90" type="sheet" code="CBD_DRAWERS_16_2" name="Chipboard drawers 16.2 mm" thick="16.2" cost="0" />'+
 '<Item id="202:9" type="sheet" code="HDF_3" name="HDF 3 mm" thick="3" cost="0" />'+
 '</Materials></Dictionary>\n<ProjectStructure><Obj id="GRANDE" class="1" code="GRANDE" name="Grande" position="" quantity="1" unit="0" dtl="'+S.w+'" dtw="'+S.d+'" dtt="'+S.h+'" cost="0" costFlag="false" />\n'+parts+'\n</ProjectStructure>\n</Project3dc>';
}
function toast(msg){const e=document.createElement('div');e.className='toast';e.textContent=msg;$('stage').appendChild(e);setTimeout(()=>e.remove(),2400)}
function downloadExport(){
 if(S.exportFormat==='PROJECT'){download('Grande_BIZET_PILOT.project','application/xml;charset=utf-8',projectXml());return}
 toast(tr('otherPending'));
}
function showOrder(){
 const b=buildBom();$('orderTitle').textContent=tr('orderTitle');
 $('orderBody').innerHTML='<p class="note">'+tr('orderText')+'</p><table class="summaryTable"><tr><th>Grande</th><td>'+S.w+'×'+S.h+'×'+S.d+' mm</td></tr><tr><th>'+tr('price')+'</th><td>'+formatMoney(b.client)+'</td></tr><tr><th>BOM</th><td>'+b.rows.length+' pos.</td></tr></table>';
 $('orderDialog').showModal();
}

function applyLanguage(){
 document.documentElement.lang=lang==='ua'?'uk':lang;$('lang').value=lang;
 const names=['room','size','drawers','shelves','equipment','lighting','production'];
 [...$('tools').children].forEach((b,i)=>b.querySelector('span').textContent=tr(names[i]));
 $('addProduct').textContent=tr('add');$('hint').textContent=tr('hint');$('priceLabel').textContent=tr('price');
 $('viewMode').textContent=tr('view');$('editMode').textContent=tr('edit');layerPanel();
 if(activePanel)openPanel(activePanel);updatePrice();
}

$('layers').onclick=()=>{$('layerPanel').hidden=!$('layerPanel').hidden;if(!$('layerPanel').hidden)layerPanel()};
$('dims').onclick=()=>{showDimensions=!showDimensions;$('dims').classList.toggle('active',showDimensions);buildDimensions();applyVisibility();layerPanel()};
$('xray').onclick=()=>{xray=!xray;$('xray').classList.toggle('active',xray);applyVisibility();toast(xray?tr('xrayOn'):tr('xrayOff'))};
$('reset').onclick=frameModel;
$('isolate').onclick=()=>{isolated=!isolated;$('isolate').classList.toggle('active',isolated);applyVisibility()};
$('viewMode').onclick=()=>{document.body.classList.add('view-mode');$('viewMode').classList.add('active');$('editMode').classList.remove('active');closePanel()};
$('editMode').onclick=()=>{document.body.classList.remove('view-mode');$('editMode').classList.add('active');$('viewMode').classList.remove('active')};
[...$('tools').children].forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));
$('panelClose').onclick=closePanel;
$('addProduct').onclick=()=>location.href='/wardrobes?manufacturer=treeart&add=1';
$('back').onclick=()=>location.href='/wardrobes?manufacturer=treeart';
$('lang').onchange=e=>{lang=e.target.value;localStorage.setItem(LANG_KEY,lang);applyLanguage()};
window.addEventListener('bizet:languagechange',e=>{const next=e.detail?.language;if(['ua','ru','en'].includes(next)){lang=next;applyLanguage()}});
window.addEventListener('bizet:themechange',()=>{renderer.domElement.style.filter=document.documentElement.dataset.theme==='dark'?'none':'brightness(1.03)'});
$('currencySelect').onchange=e=>{S.currency=e.target.value;updatePrice()};
$('orderClose').onclick=()=>$('orderDialog').close();

buildRoom();buildModel();resize();frameModel();layerPanel();applyLanguage();loadFx();
})();