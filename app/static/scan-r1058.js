/* BIZET OS 10.5.8 — Polycam/GLTF source-preserving scan registration.
 * Data remains on the client; only unconfirmed spatial markup is saved in ProjectState.
 * The source photo texture and mesh are displayed by THREE.GLTFLoader, NOT replaced
 * with sparse triangle line "point cloud" samples or a fabricated room rectangle.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const MAX_SCAN_BYTES=85*1024*1024;
const STORE='bizet_os_project_id';
const ROLE={A:{label:'А',description:'Выступ · грань А',color:0xe0ad66,kind:'PROTRUSION_FACE'},
 B:{label:'Б',description:'Выступ · грань Б',color:0xe0ad66,kind:'PROTRUSION_FACE'},
 V:{label:'В',description:'Основная стена В',color:0x5acba3,kind:'PRIMARY_WALL'},
 G:{label:'Г',description:'Основная стена Г',color:0x5acba3,kind:'PRIMARY_WALL'},
 ENTRY:{label:'Вход',description:'Вход / дверь',color:0x87bdf3,kind:'ENTRANCE_ANCHOR'},
 TURN_CABINET:{label:'Шкаф ↷',description:'Поворотный высокий блок',color:0xaeb5f6,kind:'FURNITURE_TURN_ANCHOR'}};
const PROVIDERS={
 POLYCAM:{ios:'https://apps.apple.com/app/id1532482376',android:'https://play.google.com/store/apps/details?id=ai.polycam',web:'https://poly.cam/get-the-app'},
 SKETCHUP:{ios:'https://apps.apple.com/app/id796352563',android:'https://app.sketchup.com/',web:'https://app.sketchup.com/'}
};
const projectId=()=>new URLSearchParams(location.search).get('project')||
 sessionStorage.getItem(STORE)||localStorage.getItem(STORE)||'';
let engine=null,scanObject=null,meshGroup=null,annotationsGroup=null;
let fileHash='',fileName='',fileSize=0,loaded=false;
let localLinks=[],savedRegistration=null;
let bound={width:0,depth:0,height:0,center:[0,0,0],floor_y:0};
let orient={quarter_turns:0,mirror_x:false};
let mode='TOP',activeRole='A',first=null,marks=[],textureOn=true,wireOn=false;
let pointerDown=null;
const finite=n=>Number.isFinite(n);
const clean=(n,k=5)=>Number(n.toFixed(k));
const hashHex=buffer=>crypto.subtle.digest('SHA-256',buffer).then(v=>Array.from(new Uint8Array(v)).map(x=>x.toString(16).padStart(2,'0')).join(''));
const text=(value,error=false,success=false)=>{const e=$('scanStatus');if(!e)return;e.textContent=value;e.classList.toggle('is-error',error);e.classList.toggle('is-success',success)};
function projectReturn(){
 const id=projectId();
 $('scanReturn').href='/room'+(id?'?project='+encodeURIComponent(id):'');
 $('scanContinueToRoom').onclick=()=>location.assign('/room'+(id?'?project='+encodeURIComponent(id):''));
}
function providerUrl(kind){
 const ua=navigator.userAgent||'',device=/iPhone|iPad|iPod/.test(ua)?'ios':/Android/i.test(ua)?'android':'web';
 return PROVIDERS[kind]?.[device]||PROVIDERS[kind]?.web;
}
function selectPath(kind){
 const provider=kind==='PROVIDER';
 $('scanChooseImport').classList.toggle('is-active',!provider);
 $('scanChooseProvider').classList.toggle('is-active',provider);
 $('scanChooseImport').setAttribute('aria-pressed',String(!provider));
 $('scanChooseProvider').setAttribute('aria-pressed',String(provider));
 $('scanImportPanel').hidden=provider;$('scanProviderPanel').hidden=!provider;
}
function revokeLocalURLs(){localLinks.forEach(u=>URL.revokeObjectURL(u));localLinks=[]}
function activateExternal(kind){
 const url=providerUrl(kind);if(!url)return;
 const tab=window.open(url,'_blank','noopener,noreferrer');
 if(!tab)text('Браузер заблокировал новую вкладку — разреши всплывающее окно для открытия приложения.',true);
}

function ensureEngine(){
 if(engine)return engine;
 const THREE=window.THREE;
 if(!THREE||!THREE.OrbitControls||!THREE.GLTFLoader)throw Error('THREE_VIEWER_NOT_AVAILABLE: проверь загрузку библиотек, подключение к сети и WebGL');
 const host=$('scanViewport');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.setClearColor(0x243543,1);
 renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.28;
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0x263846);
 const camera=new THREE.PerspectiveCamera(44,1,.015,600);
 const controls=new THREE.OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.08;
 controls.screenSpacePanning=true;controls.minDistance=.12;controls.maxDistance=150;
 controls.maxPolarAngle=Math.PI-.001;
 scene.add(new THREE.HemisphereLight(0xffffff,0x587080,1.15));
 const light=new THREE.DirectionalLight(0xffffff,1.00);light.position.set(6,12,7);scene.add(light);
 const orientationGroup=new THREE.Group();scene.add(orientationGroup);
 const helper=new THREE.GridHelper(20,40,0x758c99,0x49606a);
 helper.position.y=-.025;scene.add(helper);
 annotationsGroup=new THREE.Group();orientationGroup.add(annotationsGroup);
 host.insertBefore(renderer.domElement,host.firstChild);
 const ray=new THREE.Raycaster();
 function resize(){
  const w=Math.max(2,host.clientWidth),h=Math.max(2,host.clientHeight);
  const current=renderer.getSize(new THREE.Vector2());
  if(current.x!==w||current.y!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 }
 const onResize=()=>resize();
 if('ResizeObserver' in window)new ResizeObserver(onResize).observe(host);
 else window.addEventListener('resize',onResize);
 const loop=()=>{requestAnimationFrame(loop);resize();controls.update();renderer.render(scene,camera);};loop();
 engine={THREE,scene,camera,renderer,controls,ray,orientationGroup,helper,host};
 bindCanvasInteraction();resize();return engine;
}
function setCamera(next){
 if(!loaded)return;
 const e=ensureEngine(),radius=Math.max(bound.width,bound.depth,bound.height,1);
 mode=next;
 $('scanTop').classList.toggle('is-active',next==='TOP');
 $('scanOrbit').classList.toggle('is-active',next==='ORBIT');
 $('scanTop').setAttribute('aria-pressed',String(next==='TOP'));
 $('scanOrbit').setAttribute('aria-pressed',String(next==='ORBIT'));
 e.controls.enableRotate=next!=='TOP';
 e.controls.target.set(0,Math.min(.35,bound.height*.35),0);
 const gap=next==='TOP'?Math.max(radius*1.9,2):Math.max(radius*1.4,2);
 if(next==='TOP'){
  e.camera.up.set(0,0,-1); // From POSITIVE Y: true ceiling-down floor plan, not underside.
  e.camera.position.set(0,gap,0.00001);
  e.controls.target.set(0,0,0);
 }else{
  e.camera.up.set(0,1,0);
  e.camera.position.set(gap*.8,gap*.7,gap*.88);
 }
 e.camera.lookAt(e.controls.target);e.controls.update();
 if(annotationsGroup)annotationsGroup.visible=next==='TOP';
 $('scanPointerHint').textContent=next==='TOP'?'План сверху: выбери А / Б / В / Г и отметь две точки линии (или одну точку входа / шкафа). Колесо / щипок — масштаб.'
 :'3D-осмотр с реальными текстурами: вращай, приближай и изучай стены, проводку и розетки.';
}
function setOrientation(){
 if(!engine)return;
 engine.orientationGroup.rotation.y=orient.quarter_turns*Math.PI/2;
 engine.orientationGroup.scale.x=orient.mirror_x?-1:1;
 engine.orientationGroup.scale.z=1;
 engine.orientationGroup.updateMatrixWorld(true);
 renderMarks();
}
function setMaterialStyle(){
 if(!scanObject)return;
 scanObject.traverse(o=>{
  if(!o.isMesh)return;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const mat of materials){if(!mat)continue;
   if(!mat.userData.bizetInitial){mat.userData.bizetInitial={map:mat.map||null,wireframe:!!mat.wireframe};}
   mat.map=textureOn?mat.userData.bizetInitial.map:null;
   mat.wireframe=wireOn;mat.side=engine.THREE.DoubleSide;mat.needsUpdate=true;
  }
 });
 $('scanToggleTexture').textContent='Текстура: '+(textureOn?'ВКЛ':'ВЫКЛ');
 $('scanToggleTexture').setAttribute('aria-pressed',String(textureOn));
 $('scanToggleMesh').textContent='Сетка: '+(wireOn?'ВКЛ':'ВЫКЛ');
 $('scanToggleMesh').setAttribute('aria-pressed',String(wireOn));
}
function cleanOldScene(){
 if(!engine)return;
 if(scanObject){
  engine.orientationGroup.remove(scanObject);
  scanObject.traverse(o=>{if(o.isMesh){o.geometry?.dispose?.();}});
  scanObject=null;
 }
 marks=[];first=null;
 while(annotationsGroup.children.length){const child=annotationsGroup.children[0];annotationsGroup.remove(child);child.traverse(o=>{
  o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose?.();m.dispose?.()})}
 })}
 revokeLocalURLs();loaded=false;fileHash='';
}
function fileListAsLocalResources(files){
 const allowed=new Map();
 for(const f of files){
  const name=f.name.toLowerCase();
  if(!/\.(glb|gltf|bin|png|jpg|jpeg|webp)$/i.test(name))continue;
  allowed.set(name,f);
 }
 const manager=new engine.THREE.LoadingManager();
 manager.setURLModifier(url=>{
  if(url.startsWith('data:')||url.startsWith('blob:'))return url;
  const plain=decodeURIComponent(url.split('?')[0].split('/').pop()||'').toLowerCase();
  const file=allowed.get(plain);
  if(!file){return 'data:text/plain;base64,'+btoa('MISSING_GLTF_RESOURCE_'+plain);}
  const target=URL.createObjectURL(file);localLinks.push(target);return target;
 });
 return manager;
}
function parseModel(bytes,manager){
 return new Promise((resolve,reject)=>{
  const loader=new engine.THREE.GLTFLoader(manager);
  loader.parse(bytes,'',resolve,error=>reject(error instanceof Error?error:new Error(String(error))));
 });
}
async function onFiles(fileList){
 const files=Array.from(fileList||[]);
 const main=files.find(f=>/\.(glb|gltf)$/i.test(f.name));
 if(!main)throw Error('Выбери GLB или GLTF. Архив ZIP сначала распакуй.');
 if(main.size>MAX_SCAN_BYTES)throw Error('Файл больше лимита пилота 85 МБ. Для больших сцен нужен отдельный потоковый импорт.');
 if(files.some(f=>f.size>MAX_SCAN_BYTES))throw Error('Слишком большой ресурс GLTF.');
 ensureEngine();cleanOldScene();
 $('scanWorkspace').hidden=true;
 text('Читаю GLB/GLTF и исходные текстуры. Ничего не отправляется на сервер…');
 const bytes=await main.arrayBuffer();
 const model=await parseModel(bytes,fileListAsLocalResources(files));
 if(!model.scene)throw Error('GLTF_SCENE_NOT_FOUND');
 fileHash=await hashHex(bytes);fileName=main.name;fileSize=main.size;
 scanObject=model.scene;
 const e=engine,box=new e.THREE.Box3().setFromObject(scanObject);
 if(box.isEmpty())throw Error('SOURCE_MESH_GEOMETRY_EMPTY');
 const size=box.getSize(new e.THREE.Vector3()),center=box.getCenter(new e.THREE.Vector3());
 if(!(size.x>.08&&size.z>.08&&size.y>.08)||![size.x,size.y,size.z].every(finite))
  throw Error('SCAN_GEOMETRY_INVALID_OR_AXIS_UNKNOWN');
 if(Math.max(size.x,size.y,size.z)>200)throw Error('SCAN_SCALE_UNSUPPORTED: подтвердите единицы GLTF');
 bound={width:size.x,depth:size.z,height:size.y,center:[center.x,center.y,center.z],floor_y:box.min.y};
 // Preserve source mesh and textures. Only a reversible display transform is applied:
 // XZ origin=center-of-source-bounds; Y origin=lowest observed mesh vertex.
 scanObject.position.sub(new e.THREE.Vector3(center.x,box.min.y,center.z));
 e.orientationGroup.add(scanObject);
 const maxDim=Math.max(bound.width,bound.depth);
 e.helper.scale.set(Math.max(.35,maxDim/8),1,Math.max(.35,maxDim/8));
 orient={quarter_turns:0,mirror_x:false};
 marks=[];activeRole='A';first=null;textureOn=true;wireOn=false;
 setMaterialStyle();
 loaded=true;$('scanWorkspace').hidden=false;
 $('scanFileName').textContent=fileName;
 const meshes=[];scanObject.traverse(o=>{if(o.isMesh)meshes.push(o)});
 $('scanStats').textContent=meshes.length+' меш(ей) · '+(bytes.byteLength/1048576).toFixed(2)+' МБ · SHA256 '+fileHash.slice(0,14)+'…';
 $('scanDimensions').textContent=[bound.width,bound.depth,bound.height].map(v=>Math.round(v*1000).toLocaleString('ru-RU')).join(' × ')+' мм';
 const existing=savedRegistration;
 if(existing?.source?.sha256===fileHash){
  orient=existing.orientation||orient;
  marks=(existing.segments||[]).filter(v=>ROLE[v.role]&&Array.isArray(v.points)&&v.points.length>0).map(v=>({
   role:v.role,points:v.points.map(p=>[+p[0],+p[1]]).filter(p=>p.every(finite)).slice(0,2)
  })).filter(v=>v.points.length===(ROLE[v.role].kind.endsWith('ANCHOR')?1:2));
  const measure=existing.known_dimension||{};
  if(finite(+measure.mm)&&+measure.mm>0){$('scanKnownMm').value=measure.mm;$('scanKnownRole').value=measure.role||'V';}
  text('Скан загружен. Восстановил разметку этого же файла из проекта (непроверенная).',false,true);
 }else if(existing?.source?.sha256&&existing.source.sha256!==fileHash){
  text('Новый скан не совпадает с ранее размеченным. Старую разметку не применяю.',false);
 }else{
  text('Исходный текстурированный скан загружен. Переключись в вид сверху и отметь стены А / Б / В / Г.',false,true);
 }
 setOrientation();setCamera('TOP');selectRole('A');updateList();
}
function renderMarks(){
 if(!engine||!annotationsGroup)return;
 const THREE=engine.THREE;
 while(annotationsGroup.children.length){const o=annotationsGroup.children[0];annotationsGroup.remove(o);
  o.traverse(v=>{v.geometry?.dispose?.();if(v.material){(Array.isArray(v.material)?v.material:[v.material]).forEach(m=>{m.map?.dispose?.();m.dispose?.()})}})}
 const h=bound.height+.10;
 const drawDisc=(point,color)=>{
  const disk=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshBasicMaterial({color,depthTest:false}));
  disk.position.set(point[0],h,point[1]);disk.renderOrder=11;annotationsGroup.add(disk);
 };
 const drawText=(point,text,color)=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(15,26,36,.91)';ctx.fillRect(10,8,235,111);
  ctx.lineWidth=4;ctx.strokeStyle='#dae5ec';ctx.strokeRect(10,8,235,111);
  ctx.fillStyle='#fff';ctx.font='bold 54px system-ui';ctx.textAlign='center';ctx.fillText(text,128,83);
  const map=new THREE.CanvasTexture(canvas);map.encoding=THREE.sRGBEncoding;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthTest:false}));
  sprite.position.set(point[0],h+.07,point[1]);sprite.scale.set(.65,.34,1);sprite.renderOrder=15;annotationsGroup.add(sprite);
 };
 const addLine=(p1,p2,color)=>{
  const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p1[0],h,p1[1]),new THREE.Vector3(p2[0],h,p2[1])]);
  const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,depthTest:false,linewidth:3}));
  line.renderOrder=12;annotationsGroup.add(line);
 };
 for(const m of marks){
  const cfg=ROLE[m.role];if(!cfg)continue;
  m.points.forEach(p=>drawDisc(p,cfg.color));
  if(m.points.length===2){addLine(m.points[0],m.points[1],cfg.color);
   const mid=[(m.points[0][0]+m.points[1][0])/2,(m.points[0][1]+m.points[1][1])/2];drawText(mid,cfg.label,cfg.color);
  }else drawText(m.points[0],cfg.label,cfg.color);
 }
 if(first)drawDisc(first,ROLE[activeRole].color);
 annotationsGroup.visible=mode==='TOP';
}
function selectRole(role){
 if(!ROLE[role])return;
 activeRole=role;first=null;
 document.querySelectorAll('[data-scan-role]').forEach(b=>b.classList.toggle('is-active',b.dataset.scanRole===role));
 document.querySelectorAll('[data-scan-anchor]').forEach(b=>b.classList.toggle('is-active',b.dataset.scanAnchor===role));
 const cfg=ROLE[role];
 $('scanDrawingHint').textContent='Выбрано: '+cfg.label+' · '+cfg.description+'. '+(cfg.kind.endsWith('ANCHOR')?'Нажми одну точку на плане сверху.':'Нажми начало и конец линии на плане сверху.');
 renderMarks();
}
function hitPlan(event){
 const e=engine,rect=e.renderer.domElement.getBoundingClientRect();
 const pos=new e.THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1));
 e.ray.setFromCamera(pos,e.camera);
 const plane=new e.THREE.Plane(new e.THREE.Vector3(0,1,0),0);
 const world=new e.THREE.Vector3();
 if(!e.ray.ray.intersectPlane(plane,world))return null;
 e.orientationGroup.updateMatrixWorld(true);
 const local=e.orientationGroup.worldToLocal(world.clone());
 return [clean(local.x),clean(local.z)];
}
function assignPoint(event){
 if(!loaded||mode!=='TOP')return;
 const p=hitPlan(event);if(!p)return;
 const type=ROLE[activeRole];if(type.kind.endsWith('ANCHOR')){
  marks=marks.filter(v=>v.role!==activeRole);marks.push({role:activeRole,points:[p]});
  $('scanDrawingHint').textContent=type.label+' отмечен на плане.';
 }else if(!first){
  first=p;$('scanDrawingHint').textContent=type.label+': первая точка отмечена. Отметь второй конец стены.';
 }else{
  if(Math.hypot(first[0]-p[0],first[1]-p[1])<.09){
   $('scanDrawingHint').textContent='Сегмент слишком короткий. Отметь вторую точку дальше от первой.';return;
  }
  marks=marks.filter(v=>v.role!==activeRole);marks.push({role:activeRole,points:[first,p]});
  first=null;$('scanDrawingHint').textContent=type.label+' размечена. Выбери следующий участок.';
 }
 renderMarks();updateList();
}
function bindCanvasInteraction(){
 const canvas=engine.renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY,t:Date.now()}});
 canvas.addEventListener('pointerup',e=>{
  if(!pointerDown)return;
  const d=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);
  if(d<8&&Date.now()-pointerDown.t<900)assignPoint(e);
  pointerDown=null;
 });
 canvas.addEventListener('pointercancel',()=>{pointerDown=null});
}
function updateList(){
 const list=$('scanMarkupList');list.textContent='';
 marks.forEach((m,i)=>{
  const role=ROLE[m.role];if(!role)return;
  const row=document.createElement('div');row.className='scan-markup-row';
  const label=document.createElement('b');label.textContent=role.label;
  const desc=document.createElement('span');
  const mm=m.points.length===2?Math.round(Math.hypot(m.points[0][0]-m.points[1][0],m.points[0][1]-m.points[1][1])*1000)+' мм (скан)':'маркер';
  desc.textContent=role.description+' · '+mm;
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Удалить отметку';
  remove.onclick=()=>{marks.splice(i,1);updateList();renderMarks()};
  row.append(label,desc,remove);list.appendChild(row);
 });
 $('scanRegistrationState').textContent='Размечено участков: '+marks.length+' · всё предварительно · экспорт производства STOP';
}
async function loadSaved(){
 const id=projectId();if(!id)return;
 try{
  const r=await fetch('/api/v1.1/projects/'+encodeURIComponent(id),{cache:'no-store'});
  if(!r.ok)return;
  const p=await r.json();savedRegistration=p?.scene?.visual_settings?.scan_registration_r1058||null;
 }catch(e){/* Offline preview is usable even if project API is unavailable. */}
}
function registrationPayload(){
 const mm=$('scanKnownMm').value.trim(),role=$('scanKnownRole').value;
 if(mm&&(!finite(+mm)||+mm<100||+mm>100000))throw Error('Укажи допустимый контрольный размер 100–100000 мм.');
 const known=mm?{role,mm:Math.round(+mm),source:'USER_MEASURED_UNVERIFIED',confirmed:false}:null;
 const segment=marks.find(m=>m.role===role&&m.points.length===2);
 if(known&&!segment)throw Error('Сначала разметь двумя точками стену '+ROLE[role].label+' для сопоставления с реальным размером.');
 const len=segment?Math.hypot(segment.points[1][0]-segment.points[0][0],segment.points[1][1]-segment.points[0][1])*1000:null;
 const ratio=known&&len>0?clean(known.mm/len,6):null;
 return{
  schema:'BIZET_SCAN_REGISTRATION_R10_5_8',
  status:'PRELIMINARY_UNVERIFIED',
  source:{file_name:fileName,byte_size:fileSize,sha256:fileHash,format:/\.glb$/i.test(fileName)?'GLB':'GLTF',storage:'CLIENT_ONLY_NOT_UPLOADED'},
  coordinate_system:{source:'GLTF_METERS_Y_UP',view_top_from:'POSITIVE_Y',
   source_bounds_m:{length:clean(bound.width),depth:clean(bound.depth),height:clean(bound.height)},
   display_translation_m:[clean(-bound.center[0]),clean(-bound.floor_y),clean(-bound.center[2])],
   semantic_plan_axis:'XZ',engineering_mapping:'PENDING_OWNER_CONFIRMATION'},
  orientation:{quarter_turns:orient.quarter_turns,mirror_x:orient.mirror_x},
  segments:marks.map(m=>({role:m.role,kind:ROLE[m.role].kind,points:m.points.map(p=>[clean(p[0]),clean(p[1])]),
    unit:'M',confirmed:false})),
  known_dimension:known,
  tentative_scale_ratio:ratio,
  production_ready:false,
  export_stop:'STOP_UNCONFIRMED_SCANNED_GEOMETRY',
  note:'А/Б = one architectural protrusion; В/Г = two primary walls. Kitchen along В; tall turn cabinet near Г. All markings require owner review.'
 };
}
async function saveRegistration(){
 if(!loaded)throw Error('Сначала загрузи исходный скан.');
 if(!marks.some(m=>m.role==='V')||!marks.some(m=>m.role==='G'))
  throw Error('Отметь основные стены В и Г двумя точками каждая.');
 const id=projectId();if(!id)throw Error('Нет активного проекта. Открой Скан с начального экрана BIZET OS.');
 const payload=registrationPayload();
 $('scanSaveRegistration').disabled=true;text('Сохраняю предварительную разметку. Файл GLB остаётся на устройстве…');
 try{
  const url='/api/v1.1/projects/'+encodeURIComponent(id);
  const patch=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({path:'scene.visual_settings.scan_registration_r1058',value:payload,
      source:'IMPORTED',confirmed:false,reason:'10.5.8 Polycam user-scoped preliminary scan wall markup'})});
  const body=await patch.json().catch(()=>({}));
  if(!patch.ok)throw Error(body.detail||'PROJECT_SAVE_FAILED_'+patch.status);
  savedRegistration=payload;
  text('Разметка сохранена в проект. Экспорт BOM/XML НЕ подтверждён; рабочие размеры кухни не изменены.',false,true);
 }finally{$('scanSaveRegistration').disabled=false}
}
function bind(){
 $('scanChooseImport').onclick=()=>selectPath('IMPORT');
 $('scanChooseProvider').onclick=()=>selectPath('PROVIDER');
 $('scanBackToImport').onclick=()=>selectPath('IMPORT');
 $('scanOpenPolycam').onclick=()=>activateExternal('POLYCAM');
 $('scanOpenSketchup').onclick=()=>activateExternal('SKETCHUP');
 $('scanOpenPicker').onclick=()=>$('scanFileInput').click();
 $('scanFileInput').onchange=e=>onFiles(e.target.files).catch(err=>text('Ошибка импорта: '+(err.message||String(err)),true));
 $('scanDropZone').addEventListener('dragover',e=>{e.preventDefault();$('scanDropZone').classList.add('is-drop')});
 $('scanDropZone').addEventListener('dragleave',()=>$('scanDropZone').classList.remove('is-drop'));
 $('scanDropZone').addEventListener('drop',e=>{e.preventDefault();$('scanDropZone').classList.remove('is-drop');onFiles(e.dataTransfer.files).catch(err=>text(err.message,true))});
 $('scanTop').onclick=()=>setCamera('TOP');
 $('scanOrbit').onclick=()=>setCamera('ORBIT');
 $('scanResetCamera').onclick=()=>setCamera(mode);
 $('scanRotateLeft').onclick=()=>{orient.quarter_turns=(orient.quarter_turns+3)%4;setOrientation()};
 $('scanRotateRight').onclick=()=>{orient.quarter_turns=(orient.quarter_turns+1)%4;setOrientation()};
 $('scanMirrorHorizontal').onclick=()=>{orient.mirror_x=!orient.mirror_x;setOrientation()};
 $('scanResetOrientation').onclick=()=>{orient={quarter_turns:0,mirror_x:false};setOrientation()};
 $('scanToggleTexture').onclick=()=>{textureOn=!textureOn;setMaterialStyle()};
 $('scanToggleMesh').onclick=()=>{wireOn=!wireOn;setMaterialStyle()};
 document.querySelectorAll('[data-scan-role]').forEach(b=>b.onclick=()=>selectRole(b.dataset.scanRole));
 document.querySelectorAll('[data-scan-anchor]').forEach(b=>b.onclick=()=>selectRole(b.dataset.scanAnchor));
 $('scanCancelMark').onclick=()=>{first=null;renderMarks();$('scanDrawingHint').textContent='Текущая первая точка сброшена. Укажи начало линии.'};
 $('scanUndoMark').onclick=()=>{first=null;marks.pop();renderMarks();updateList()};
 $('scanSaveRegistration').onclick=()=>saveRegistration().catch(err=>text('Сохранение: '+(err.message||String(err)),true));
 projectReturn();
}
document.addEventListener('DOMContentLoaded',async()=>{bind();await loadSaved()});
})();