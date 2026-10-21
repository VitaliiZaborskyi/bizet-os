/* BIZET OS 10.5.8 — Polycam/GLTF source-preserving scan registration.
 * Data remains on the client; only unconfirmed spatial markup is saved in ProjectState.
 * The source photo texture and mesh are displayed by THREE.GLTFLoader, NOT replaced
 * with sparse triangle line "point cloud" samples or a fabricated room rectangle.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const MAX_SCAN_BYTES=85*1024*1024;
const MAX_ZIP_BYTES=90*1024*1024;
const MAX_UNPACKED_BYTES=112*1024*1024;
const MAX_ZIP_ENTRIES=128;
const STORE='bizet_os_project_id';
// Semantic wall list is project-specific, NOT limited to four owner sample walls.
const ROLE={ENTRY:{label:'Вход',description:'Вход / дверь',color:0x87bdf3,kind:'ENTRANCE_ANCHOR'}};
const WALL_KINDS={
 PRIMARY_WALL:{title:'Основная стена',color:0x5acba3},
 PROTRUSION_FACE:{title:'Выступ / короб',color:0xe0ad66},
 PARTITION:{title:'Перегородка',color:0x8cb5e9},
 OTHER_SURFACE:{title:'Другая поверхность',color:0xc3bdba}
};
const OLD_SAMPLE_ROLES={
 A:{label:'А',kind:'PROTRUSION_FACE'}, B:{label:'Б',kind:'PROTRUSION_FACE'},
 V:{label:'В',kind:'PRIMARY_WALL'}, G:{label:'Г',kind:'PRIMARY_WALL'}
};
let wallIds=[],wallSequence=0;
const PROVIDERS={
 POLYCAM:{ios:'https://poly.cam/',android:'https://poly.cam/',web:'https://poly.cam/'},
 SKETCHUP:{ios:'https://apps.apple.com/app/id796352563',android:'https://app.sketchup.com/',web:'https://app.sketchup.com/'}
};
const projectId=()=>new URLSearchParams(location.search).get('project')||
 sessionStorage.getItem(STORE)||localStorage.getItem(STORE)||'';
let engine=null,scanObject=null,meshGroup=null,annotationsGroup=null;
let fileHash='',fileName='',fileSize=0,loaded=false;
let localLinks=[],savedRegistration=null;
let archiveModels=[],archiveFiles=[],archiveName='';
let bound={width:0,depth:0,height:0,center:[0,0,0],floor_y:0};
let orient={quarter_turns:0,mirror_x:false};
let mode='TOP',activeRole='W1',first=null,marks=[],textureOn=true,wireOn=false;
let autoCandidates=[],autoStats=null;
let pointerDown=null,dragWallEnabled=false,dragWallData=null;
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
 // Official deep-link to the installed native application is NOT confirmed.
 // HTTPS may be claimed as a Universal Link by the app, otherwise it opens Web.
 window.open(url,'_blank','noopener,noreferrer');
 text(kind==='POLYCAM'
   ?'Открыта ссылка Polycam. Если iOS не передал её установленному приложению, запусти Polycam с домашнего экрана. Это ограничение внешнего приложения, а не загрузки BIZET.'
   :'Открыт SketchUp; доступные функции зависят от установленной версии.',false);
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
 if(annotationsGroup)annotationsGroup.visible=true; // Red wall plane also visible while orbiting in 3D
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
function inspectZipCentralDirectory(data){
 // Before decompression, inspect ZIP central directory to reject oversized
 // payloads and unsupported encrypted/ZIP64 entries. No filesystem extraction.
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
 const end=view.byteLength, min=Math.max(0,end-65557);
 let eocd=-1;
 for(let n=end-22;n>=min;n--)if(view.getUint32(n,true)===0x06054b50){eocd=n;break;}
 if(eocd<0)throw Error('ZIP_END_OF_CENTRAL_DIRECTORY_MISSING');
 const count=view.getUint16(eocd+10,true),cdLength=view.getUint32(eocd+12,true),cdOffset=view.getUint32(eocd+16,true);
 if(count<1||count>MAX_ZIP_ENTRIES||cdLength===0xffffffff||cdOffset===0xffffffff||cdOffset+cdLength>eocd)
   throw Error('ZIP_UNSUPPORTED_OR_TOO_MANY_FILES');
 let offset=cdOffset,total=0;
 const decoder=new TextDecoder('utf-8');
 const names=new Set();
 for(let i=0;i<count;i++){
  if(offset+46>end||view.getUint32(offset,true)!==0x02014b50)throw Error('ZIP_CENTRAL_DIRECTORY_CORRUPT');
  const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true);
  const size=view.getUint32(offset+24,true),packed=view.getUint32(offset+20,true);
  const nameSize=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true);
  if(flags&1)throw Error('ENCRYPTED_ZIP_NOT_SUPPORTED');
  if(method!==0&&method!==8)throw Error('ZIP_COMPRESSION_METHOD_UNSUPPORTED');
  const finish=offset+46+nameSize+extra+comment;
  if(finish>end||size===0xffffffff||packed===0xffffffff)throw Error('ZIP64_OR_CORRUPT_ARCHIVE_UNSUPPORTED');
  const path=decoder.decode(new Uint8Array(data.buffer,data.byteOffset+offset+46,nameSize));
  if(path.startsWith('/')||path.split(/[\\/]/).includes('..')||path.includes('\0'))
    throw Error('UNSAFE_ZIP_FILE_PATH');
  if(!path.endsWith('/')){
   total+=size;
   if(size>MAX_SCAN_BYTES||total>MAX_UNPACKED_BYTES)throw Error('ZIP_DECOMPRESSED_DATA_TOO_LARGE');
   names.add(path);
  }
  offset=finish;
 }
 return {count:count,total:total,names:[...names]};
}
async function expandZipIfNeeded(fileList){
 const files=Array.from(fileList||[]);
 const zip=files.find(f=>/\.zip$/i.test(f.name));
 if(!zip){
  if(!archiveModels.length)$('scanArchiveChoice').hidden=true;
  return files;
 }
 if(zip.size>MAX_ZIP_BYTES)throw Error('ZIP больше лимита 90 МБ для мобильного пилота.');
 if(!window.fflate?.unzip)throw Error('ZIP_READER_UNAVAILABLE: проверь загрузку библиотеки ZIP');
 text('Проверяю и распаковываю ZIP на устройстве, без передачи в облако…');
 const raw=new Uint8Array(await zip.arrayBuffer());
 const meta=inspectZipCentralDirectory(raw);
 const extracted=await new Promise((resolve,reject)=>window.fflate.unzip(raw,(err,items)=>err?reject(err):resolve(items)));
 const available=Object.entries(extracted).filter(([name,bytes])=>
  !name.endsWith('/')&&/\.(glb|gltf|bin|png|jpg|jpeg|webp)$/i.test(name));
 const aliases=new Set();
 archiveFiles=available.map(([name,bytes])=>{
  const base=name.split(/[\\/]/).pop();
  const normalized=base.toLowerCase();
  if(aliases.has(normalized))throw Error('В архиве несколько файлов с одинаковым именем '+base+'. Используй GLB-экспорт.');
  aliases.add(normalized);
  if(bytes.length>MAX_SCAN_BYTES)throw Error('Ресурс '+base+' слишком большой для пилота');
  return new File([bytes],base,{type:/\.glb$/i.test(base)?'model/gltf-binary':'application/octet-stream'});
 });
 archiveModels=archiveFiles.filter(f=>/\.(glb|gltf)$/i.test(f.name));
 archiveName=zip.name;
 if(!archiveModels.length)throw Error('В ZIP нет GLB или GLTF. Выгрузи в Polycam 3D-модель в GLTF/GLB, а не только чертёж PDF/SVG.');
 const selection=$('scanArchiveModel');selection.textContent='';
 archiveModels.forEach((model,i)=>{
  const option=document.createElement('option');option.value=String(i);
  option.textContent=model.name+' · '+(model.size/1048576).toFixed(2)+' МБ';
  selection.appendChild(option);
 });
 // Choose largest mesh by default rather than silently treating first entry
 // in the ZIP as the project. Owner can select a clean floorplan alternative.
 const largest=archiveModels.reduce((best,m,i)=>m.size>archiveModels[best].size?i:best,0);
 selection.value=String(largest);
 $('scanArchiveChoice').hidden=archiveModels.length<2;
 text('ZIP Polycam распакован локально: '+meta.count+' файл(ов), 3D-моделей: '+archiveModels.length+'.');
 return selectArchiveModel(largest);
}
function selectArchiveModel(index){
 const main=archiveModels[Number(index)];
 if(!main)throw Error('ARCHIVE_MODEL_NOT_FOUND');
 return [main,...archiveFiles.filter(f=>f!==main&&!/\.(glb|gltf)$/i.test(f.name))];
}
async function onFiles(fileList,fromArchive=false){
 const files=fromArchive?Array.from(fileList||[]):await expandZipIfNeeded(fileList);
 const main=files.find(f=>/\.(glb|gltf)$/i.test(f.name));
 if(!main)throw Error('Выбери ZIP, GLB или GLTF.');
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
 marks=[];first=null;textureOn=true;wireOn=false;
 setMaterialStyle();
 loaded=true;$('scanWorkspace').hidden=false;
 $('scanFileName').textContent=fileName;
 const meshes=[];let textured=0;scanObject.traverse(o=>{if(o.isMesh){meshes.push(o);const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>!!m?.map))textured++}});
 $('scanStats').textContent=meshes.length+' меш(ей) · текстуры у '+textured+' · '+(bytes.byteLength/1048576).toFixed(2)+' МБ · SHA256 '+fileHash.slice(0,14)+'…';
 if(textured===0)text('Загружена упрощённая геометрия стен Polycam без фототекстуры. Это полезный исходник для разметки, но не фотофиксация.',false,true);
 $('scanDimensions').textContent=[bound.width,bound.depth,bound.height].map(v=>Math.round(v*1000).toLocaleString('ru-RU')).join(' × ')+' мм';
 const existing=savedRegistration;
 if(existing?.source?.sha256===fileHash){
  orient=existing.orientation||orient;
  resetWallDefinitions(existing.wall_definitions||existing.segments||[]);
  marks=(existing.segments||[]).filter(v=>ROLE[v.role]&&Array.isArray(v.points)).map(v=>({
   role:v.role,points:v.points.map(p=>[+p[0],+p[1]]).filter(p=>p.every(finite)).slice(0,2),
   source:v.source||'MANUAL',owner_reviewed:!!v.owner_reviewed,height_mm:Number(v.height_mm)||null,
   communications:Array.isArray(v.communications)?v.communications.filter(c=>c&&typeof c.kind==='string').slice(0,30):[],
   confidence:Number(v.confidence)||null
  })).filter(v=>v.points.length===(ROLE[v.role].kind.endsWith('ANCHOR')?1:2));
  const measure=existing.known_dimension||{};
  if(finite(+measure.mm)&&+measure.mm>0){
   $('scanKnownMm').value=measure.mm;
   if(wallIds.includes(measure.role))$('scanKnownRole').value=measure.role;
  }
  text('Скан загружен. Восстановил разметку этого же файла из проекта (непроверенная).',false,true);
 }else if(existing?.source?.sha256&&existing.source.sha256!==fileHash){
  resetWallDefinitions([]);
  text('Новый скан не совпадает с ранее размеченным. Старую разметку не применяю.',false);
 }else{
  resetWallDefinitions([]);
  if(textured>0)text('3D-скан с фотофиксацией загружен. Отмечай нужные стены на виде сверху.',false,true);
  else text('Упрощённая 3D-модель стен загружена. Фототекстуры в этом экспорте нет. Добавляй и размечай любые стены.',false,true);
 }
 setOrientation();setCamera('TOP');selectRole(wallIds[0]);updateList();
 // First attempt offline automatic wall detection for EVERY imported GLB.
 // No candidate is approved as a production wall without user review.
 try{runAutoDetection()}catch(error){$('scanDetectStatus').textContent='Автоматические плоскости не определены: '+error.message+' · используй ручную разметку.';}
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
   const mid=[(m.points[0][0]+m.points[1][0])/2,(m.points[0][1]+m.points[1][1])/2];drawText(mid,cfg.label.slice(0,8),cfg.color);
  }else drawText(m.points[0],cfg.label.slice(0,8),cfg.color);
 }
 if(first&&ROLE[activeRole])drawDisc(first,ROLE[activeRole].color);
 const selected=marks.find(m=>m.role===activeRole&&m.points?.length===2);
 if(selected){
   const a=selected.points[0],b=selected.points[1],
     len=Math.hypot(b[0]-a[0],b[1]-a[1]),centerX=(a[0]+b[0])/2,centerZ=(a[1]+b[1])/2,
     angle=-Math.atan2(b[1]-a[1],b[0]-a[0]);
   if(len>.05){
     const red=new THREE.MeshBasicMaterial({color:0xef3740,transparent:true,opacity:.32,
        side:THREE.DoubleSide,depthWrite:false,depthTest:false});
     const wallHeight=Math.max(.4,(selected.height_mm||bound.height*1000)/1000);
     const vertical=new THREE.Mesh(new THREE.PlaneGeometry(len,wallHeight),red.clone());
     vertical.rotation.y=angle;
     vertical.position.set(centerX,wallHeight/2,centerZ);
     vertical.renderOrder=18;vertical.visible=mode!=='TOP';annotationsGroup.add(vertical);
     const flat=new THREE.Mesh(new THREE.PlaneGeometry(len,.13),red.clone());
     flat.rotation.set(-Math.PI/2,0,angle);
     flat.position.set(centerX,h+.09,centerZ);flat.renderOrder=18;
     flat.visible=mode==='TOP';annotationsGroup.add(flat);
     red.dispose();
   }
 }
 annotationsGroup.visible=true;
}
function runAutoDetection(){
 if(!loaded||!scanObject)throw Error('Сначала загрузи GLB/GLTF.');
 if(!window.BizetScanAutoR1059)throw Error('SCAN_PLANE_ANALYZER_NOT_AVAILABLE');
 const result=window.BizetScanAutoR1059.analyze(scanObject,engine.THREE);
 autoCandidates=result.candidates||[];
 autoStats=result.stats||null;
 const info=$('scanDetectStatus');
 info.textContent=autoCandidates.length
  ?'Найдено предложений: '+autoCandidates.length+'. Это геометрические плоскости, не готовые подтверждённые стены. Выбери нужную.'
  :'Подходящих больших плоскостей автоматически не обнаружено. Сохраняется возможность ручной разметки.';
 const list=$('scanDetectedCandidates');list.textContent='';
 for(const [index,c] of autoCandidates.entries()){
  const button=document.createElement('button');
  button.type='button';button.className='scan-detected-surface';
  button.textContent='Плоскость '+(index+1)+' · ≈ '+c.estimated_mm+' мм · уверенность '+Math.round(c.confidence*100)+'%';
  button.onclick=()=>activateCandidate(index);
  list.appendChild(button);
 }
 if(autoCandidates.length)text('Скан проанализирован локально: '+autoCandidates.length+
   ' возможных стен. Выбери каждую и проверь красную плоскость, размеры и коммуникации.',false,true);
}
function activateCandidate(index){
 const c=autoCandidates[index];if(!c)return;
 let found=marks.find(m=>m.source_candidate_id===c.id);
 if(!found){
  const role=createWall(null,'Стена '+(wallIds.length+1),'PRIMARY_WALL');
  found={role,points:[c.from.slice(),c.to.slice()],
   height_mm:Math.round(c.height_m*1000),owner_reviewed:false,source:'AUTO_PLANE_PROPOSAL',
   source_candidate_id:c.id,confidence:c.confidence,communications:[]};
  marks.push(found);paintWallButtons();
 }
 selectRole(found.role);setCamera('TOP');renderMarks();updateList();
 document.querySelectorAll('.scan-detected-surface').forEach((b,i)=>b.classList.toggle('is-active',i===index));
 $('scanDrawingHint').textContent=ROLE[found.role].label+
  ': автоматически предложенная поверхность. Красный прямоугольник можно переместить, повернуть и изменить его длину ниже.';
 $('scanSelectedEdit').scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function updateSelectedEditor(){
 const el=$('scanSelectedEdit');if(!el)return;
 const cfg=ROLE[activeRole],m=marks.find(v=>v.role===activeRole&&v.points?.length===2);
 el.hidden=!m||!cfg||cfg.kind.endsWith('ANCHOR');
 if(el.hidden)return;
 const dx=m.points[1][0]-m.points[0][0],dz=m.points[1][1]-m.points[0][1];
 const length=Math.max(100,Math.round(Math.hypot(dx,dz)*1000));
 const lengthField=$('scanWallLengthMm'),heightField=$('scanWallHeightMm');
 if(document.activeElement!==lengthField)lengthField.value=String(length);
 if(document.activeElement!==heightField)heightField.value=String(Math.round(m.height_mm||bound.height*1000));
 const button=$('scanAcceptWall');
 button.textContent=m.owner_reviewed?'✓ Предварительная геометрия проверена':'Подтвердить как предварительную стену';
 renderWallUtilities(m);
}
function applyWallAdjustment(){
 const m=marks.find(v=>v.role===activeRole&&v.points?.length===2);
 if(!m)return text('Сначала выбери обнаруженную или вручную размеченную стену.',true);
 const newLength=Number($('scanWallLengthMm').value),offset=Number($('scanWallOffsetMm').value)||0,
  rot=Number($('scanWallAngleDeg').value)||0,height=Number($('scanWallHeightMm').value);
 if(![newLength,offset,rot,height].every(finite)||newLength<100||newLength>30000||
   Math.abs(offset)>5000||Math.abs(rot)>180||height<200||height>10000)
   return text('Недопустимые корректировки стены; проверь длину, высоту, угол и смещение.',true);
 const a=m.points[0],b=m.points[1],
   angle=Math.atan2(b[1]-a[1],b[0]-a[0])+rot*Math.PI/180;
 const dx=Math.cos(angle),dz=Math.sin(angle),
   mx=(-dz*offset)/1000,mz=(dx*offset)/1000;
 const point=[clean(a[0]+mx),clean(a[1]+mz)];
 m.points=[point,[clean(point[0]+dx*newLength/1000),clean(point[1]+dz*newLength/1000)]];
 m.height_mm=Math.round(height);m.owner_reviewed=false;
 $('scanWallAngleDeg').value='0';$('scanWallOffsetMm').value='0';
 $('scanDrawingHint').textContent='Красная плоскость изменена. Перед сохранением проверь совмещение с исходным сканом.';
 renderMarks();updateList();updateSelectedEditor();
}
function renderWallUtilities(m){
 const list=$('scanUtilityList');list.textContent='';
 for(const [index,c] of (m.communications||[]).entries()){
  const row=document.createElement('div');row.className='scan-utility-row';
  const span=document.createElement('span');
  span.textContent=c.kind+' · '+Math.round(c.from_start_mm)+' мм от начала · '+Math.round(c.height_mm)+' мм высота';
  const del=document.createElement('button');del.textContent='×';del.title='Удалить коммуникацию';del.type='button';
  del.onclick=()=>{m.communications.splice(index,1);renderWallUtilities(m)};
  row.append(span,del);list.appendChild(row);
 }
}
function addWallUtility(){
 const m=marks.find(v=>v.role===activeRole&&v.points?.length===2);
 if(!m)return text('Сначала выбери стену.',true);
 const kind=$('scanUtilityKind').value,offset=Number($('scanUtilityOffset').value),
   height=Number($('scanUtilityHeight').value);
 const len=Math.hypot(m.points[1][0]-m.points[0][0],m.points[1][1]-m.points[0][1])*1000;
 if(!finite(offset)||!finite(height)||offset<0||offset>len||height<0||height>10000)
  return text('Коммуникация выходит за границы сегмента или имеет неверную высоту.',true);
 m.communications=m.communications||[];
 m.communications.push({kind,from_start_mm:Math.round(offset),
   height_mm:Math.round(height),source:'OWNER_ANNOTATION',confirmed:false});
 renderWallUtilities(m);updateList();
 text('Коммуникация сохранена в предварительной разметке стены. Координаты требуют подтверждения замером.',false,true);
}

function createWall(id=null,label=null,kind='PRIMARY_WALL'){
 if(!WALL_KINDS[kind])kind='OTHER_SURFACE';
 if(!id)id='W'+(++wallSequence);
 if(ROLE[id])return id;
 const matched=/^W([0-9]+)$/.exec(id);
 if(matched)wallSequence=Math.max(wallSequence,Number(matched[1]));
 const fallback=OLD_SAMPLE_ROLES[id];
 const textLabel=String(label||fallback?.label||('Стена '+wallSequence)).slice(0,24);
 const actualKind=WALL_KINDS[kind]?kind:(fallback?.kind||'PRIMARY_WALL');
 ROLE[id]={label:textLabel,description:WALL_KINDS[actualKind].title,
  color:WALL_KINDS[actualKind].color,kind:actualKind};
 wallIds.push(id);return id;
}
function resetWallDefinitions(definitions=[]){
 for(const id of wallIds)delete ROLE[id];
 wallIds=[];wallSequence=0;
 for(const item of definitions){
  if(!item||typeof item.role!=='string'||!item.role||item.role==='ENTRY')continue;
  const legacy=OLD_SAMPLE_ROLES[item.role];
  createWall(item.role,item.label||legacy?.label, item.kind||legacy?.kind||'PRIMARY_WALL');
 }
 if(!wallIds.length)createWall();
 paintWallButtons();
}
function paintWallButtons(){
 const host=$('scanRoleGrid');host.textContent='';
 for(const id of wallIds){
  const cfg=ROLE[id],button=document.createElement('button');
  button.type='button';button.className='scan-role';
  button.dataset.scanRole=id;button.classList.toggle('is-active',activeRole===id);
  const letter=document.createElement('b');letter.textContent=cfg.label.length>3?String(wallIds.indexOf(id)+1):cfg.label;
  const name=document.createElement('span');name.textContent=cfg.label+' · '+cfg.description;
  button.append(letter,name);button.onclick=()=>selectRole(id);host.appendChild(button);
 }
 const list=$('scanKnownRole'),old=list.value;
 list.textContent='';
 for(const id of wallIds){
  const o=document.createElement('option');o.value=id;o.textContent=ROLE[id].label;
  list.appendChild(o);
 }
 if(wallIds.includes(old))list.value=old;
}
function selectRole(role){
 if(!ROLE[role])return;
 if(dragWallEnabled){
   dragWallEnabled=false;dragWallData=null;
   if(engine)engine.controls.enabled=true;
   $('scanDragWall').setAttribute('aria-pressed','false');
   $('scanDragWall').textContent='✥ Переместить красную плоскость пальцем';
 }
 activeRole=role;first=null;
 document.querySelectorAll('[data-scan-role]').forEach(b=>b.classList.toggle('is-active',b.dataset.scanRole===role));
 document.querySelectorAll('[data-scan-anchor]').forEach(b=>b.classList.toggle('is-active',b.dataset.scanAnchor===role));
 const cfg=ROLE[role],isAnchor=cfg.kind.endsWith('ANCHOR');
 $('scanWallEditor').hidden=isAnchor;
 if(!isAnchor){$('scanWallLabel').value=cfg.label;$('scanWallKind').value=cfg.kind;}
 updateSelectedEditor();
 $('scanDrawingHint').textContent='Выбрано: '+cfg.label+' · '+cfg.description+'. '+(isAnchor
  ?'Нажми одну точку на плане сверху.'
  :'Коснись первой точки в начале стены, затем второй — в её конце. Между точками появится линия; повтори для следующих стен.');
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
 renderMarks();updateList();updateSelectedEditor();
}
function bindCanvasInteraction(){
 const canvas=engine.renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{
  const m=marks.find(v=>v.role===activeRole&&v.points?.length===2);
  if(dragWallEnabled&&mode==='TOP'&&m){
   const p=hitPlan(e);
   if(p){
    dragWallData={id:e.pointerId,from:p,points:m.points.map(q=>q.slice()),role:activeRole};
    try{canvas.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault();return;
   }
  }
  pointerDown={x:e.clientX,y:e.clientY,t:Date.now()};
 });
 canvas.addEventListener('pointermove',e=>{
  if(!dragWallData||e.pointerId!==dragWallData.id||mode!=='TOP')return;
  const p=hitPlan(e),m=marks.find(v=>v.role===dragWallData.role&&v.points.length===2);
  if(!p||!m)return;
  const dx=p[0]-dragWallData.from[0],dz=p[1]-dragWallData.from[1];
  m.points=dragWallData.points.map(q=>[clean(q[0]+dx),clean(q[1]+dz)]);
  m.owner_reviewed=false;
  renderMarks();e.preventDefault();
 });
 canvas.addEventListener('pointerup',e=>{
  if(dragWallData&&dragWallData.id===e.pointerId){
   dragWallData=null;pointerDown=null;
   $('scanDrawingHint').textContent='Красная плоскость перемещена. Проверь совмещение и подтверди предварительную стену.';
   updateSelectedEditor();updateList();return;
  }
  if(!pointerDown)return;
  const d=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);
  if(d<8&&Date.now()-pointerDown.t<900)assignPoint(e);
  pointerDown=null;
 });
 canvas.addEventListener('pointercancel',()=>{pointerDown=null;dragWallData=null});
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
  remove.onclick=()=>{marks.splice(i,1);updateList();renderMarks();updateSelectedEditor()};
  row.append(label,desc,remove);list.appendChild(row);
 });
 $('scanRegistrationState').textContent='Размечено участков: '+marks.filter(m=>m.points?.length===2).length+' · всё предварительно · экспорт производства STOP';
 updateSelectedEditor();
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
  source:{file_name:fileName,archive_name:archiveName||null,byte_size:fileSize,sha256:fileHash,format:/\.glb$/i.test(fileName)?'GLB':'GLTF',storage:'CLIENT_ONLY_NOT_UPLOADED'},
  coordinate_system:{source:'GLTF_METERS_Y_UP',view_top_from:'POSITIVE_Y',
   source_bounds_m:{length:clean(bound.width),depth:clean(bound.depth),height:clean(bound.height)},
   display_translation_m:[clean(-bound.center[0]),clean(-bound.floor_y),clean(-bound.center[2])],
   semantic_plan_axis:'XZ',engineering_mapping:'PENDING_OWNER_CONFIRMATION'},
  orientation:{quarter_turns:orient.quarter_turns,mirror_x:orient.mirror_x},
  wall_definitions:wallIds.map(id=>({role:id,label:ROLE[id].label,kind:ROLE[id].kind})),
  segments:marks.map(m=>({role:m.role,label:ROLE[m.role].label,kind:ROLE[m.role].kind,
    points:m.points.map(p=>[clean(p[0]),clean(p[1])]),unit:'M',confirmed:false,
    source:m.source||'MANUAL',owner_reviewed:!!m.owner_reviewed,
    height_mm:m.height_mm||null,confidence:m.confidence||null,
    communications:(m.communications||[]).map(c=>({...c,confirmed:false}))})),
  auto_detection_stats:autoStats,
  known_dimension:known,
  tentative_scale_ratio:ratio,
  production_ready:false,
  export_stop:'STOP_UNCONFIRMED_SCANNED_GEOMETRY',
  note:'User-defined arbitrary wall list; kind and labels assigned by owner. Scanned coordinates, rotations and measurements are preliminary. All walls require owner review.'
 };
}
async function saveRegistration(){
 if(!loaded)throw Error('Сначала загрузи исходный скан.');
 if(!marks.some(m=>ROLE[m.role]&&!ROLE[m.role].kind.endsWith('ANCHOR')&&m.points.length===2))
  throw Error('Сначала разметь хотя бы одну стену двумя точками на плане сверху.');
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
 $('scanChooseImport').onclick=()=>{
   selectPath('IMPORT');
   // One primary upload action: immediately invoke the file chooser.
   $('scanFileInput').click();
 };
 $('scanChooseProvider').onclick=()=>selectPath('PROVIDER');
 $('scanBackToImport').onclick=()=>selectPath('IMPORT');
 $('scanOpenPolycam').onclick=()=>activateExternal('POLYCAM');
 $('scanOpenSketchup').onclick=()=>activateExternal('SKETCHUP');
 // The historical second file-picker button is intentionally removed.
 $('scanFileInput').onchange=e=>{
   if(!Array.from(e.target.files||[]).some(f=>/.zip$/i.test(f.name))){
     archiveModels=[];archiveFiles=[];archiveName='';$('scanArchiveChoice').hidden=true;
   }
   onFiles(e.target.files).catch(err=>text('Ошибка импорта: '+(err.message||String(err)),true));
 }; 
 $('scanArchiveModel').onchange=e=>onFiles(selectArchiveModel(e.target.value),true)
  .catch(err=>text('Ошибка выбора модели ZIP: '+(err.message||String(err)),true));
 $('scanDropZone').addEventListener('dragover',e=>{e.preventDefault();$('scanDropZone').classList.add('is-drop')});
 $('scanDropZone').addEventListener('dragleave',()=>$('scanDropZone').classList.remove('is-drop'));
 $('scanDropZone').addEventListener('drop',e=>{
   e.preventDefault();$('scanDropZone').classList.remove('is-drop');
   archiveModels=[];archiveFiles=[];archiveName='';
   onFiles(e.dataTransfer.files).catch(err=>text(err.message,true));
 });
 $('scanTop').onclick=()=>setCamera('TOP');
 $('scanOrbit').onclick=()=>setCamera('ORBIT');
 $('scanResetCamera').onclick=()=>setCamera(mode);
 $('scanRotateLeft').onclick=()=>{orient.quarter_turns=(orient.quarter_turns+3)%4;setOrientation()};
 $('scanRotateRight').onclick=()=>{orient.quarter_turns=(orient.quarter_turns+1)%4;setOrientation()};
 $('scanMirrorHorizontal').onclick=()=>{orient.mirror_x=!orient.mirror_x;setOrientation()};
 $('scanResetOrientation').onclick=()=>{orient={quarter_turns:0,mirror_x:false};setOrientation()};
 $('scanToggleTexture').onclick=()=>{textureOn=!textureOn;setMaterialStyle()};
 $('scanToggleMesh').onclick=()=>{wireOn=!wireOn;setMaterialStyle()};
 $('scanDetectWalls').onclick=()=>{
   try{runAutoDetection()}catch(error){text('Распознавание: '+error.message,true)}
 };
 $('scanApplyWallAdjust').onclick=applyWallAdjustment;
 $('scanDragWall').onclick=()=>{
   if(!marks.some(m=>m.role===activeRole&&m.points?.length===2))return text('Сначала выбери существующую размеченную стену.',true);
   if(mode!=='TOP')setCamera('TOP');
   dragWallEnabled=!dragWallEnabled;dragWallData=null;
   engine.controls.enabled=!dragWallEnabled;
   $('scanDragWall').setAttribute('aria-pressed',String(dragWallEnabled));
   $('scanDragWall').textContent=dragWallEnabled?
     '✓ Перемещение активно · проведи пальцем по плану':'✥ Переместить красную плоскость пальцем';
   $('scanDrawingHint').textContent=dragWallEnabled?
     'Коснись плана и веди пальцем — красная плоскость будет двигаться. Нажми кнопку ещё раз для обычного просмотра.':
     'Режим перемещения завершён. Стена пока предварительная.';
 };
 $('scanAcceptWall').onclick=()=>{
   const m=marks.find(v=>v.role===activeRole&&v.points.length===2);
   if(!m)return;
   m.owner_reviewed=true;
   $('scanDrawingHint').textContent=ROLE[activeRole].label+
      ': геометрия проверена владельцем как предварительная, не как производственный замер.';
   updateSelectedEditor();updateList();
 };
 $('scanUtilityAdd').onclick=addWallUtility;
 document.querySelectorAll('[data-scan-role]').forEach(b=>b.onclick=()=>selectRole(b.dataset.scanRole));
 document.querySelectorAll('[data-scan-anchor]').forEach(b=>b.onclick=()=>selectRole(b.dataset.scanAnchor));
 $('scanCancelMark').onclick=()=>{first=null;renderMarks();$('scanDrawingHint').textContent='Первая точка сброшена. Укажи начало линии.'};
 $('scanAddWall').onclick=()=>{
   const id=createWall();
   paintWallButtons();selectRole(id);updateList();
   $('scanDrawingHint').textContent='Добавлена '+ROLE[id].label+'. Отметь на виде сверху начало и конец новой стены.';
 };
 $('scanWallLabel').oninput=e=>{
   const cfg=ROLE[activeRole];if(!cfg||cfg.kind.endsWith('ANCHOR'))return;
   const label=e.target.value.trim().slice(0,24);
   if(label){cfg.label=label;paintWallButtons();renderMarks();updateList();}
 };
 $('scanWallKind').onchange=e=>{
   const cfg=ROLE[activeRole],kind=e.target.value;
   if(!cfg||!WALL_KINDS[kind])return;
   cfg.kind=kind;cfg.description=WALL_KINDS[kind].title;cfg.color=WALL_KINDS[kind].color;
   paintWallButtons();renderMarks();updateList();
 };
 $('scanUndoMark').onclick=()=>{first=null;marks.pop();renderMarks();updateList()};
 $('scanSaveRegistration').onclick=()=>saveRegistration().catch(err=>text('Сохранение: '+(err.message||String(err)),true));
 resetWallDefinitions([]);selectRole(wallIds[0]);
 projectReturn();
}
document.addEventListener('DOMContentLoaded',async()=>{bind();await loadSaved()});
})();