const STORAGE_KEY = 'bizet_os_project_id';
const SCAN_PREVIEW_LIMIT = 1400;

function ensureLatestStyles(){
  if(document.querySelector('link[href="/static/room-latest.css"]')) return;
  const link=document.createElement('link'); link.rel='stylesheet'; link.href='/static/room-latest.css'; document.head.appendChild(link);
}

const SCAN_DOWNLOADS={
  POLYCAM:{ios:'https://apps.apple.com/app/id1532482376',android:'https://play.google.com/store/apps/details?id=ai.polycam',web:'https://poly.cam/get-the-app'},
  SKETCHUP:{ios:'https://apps.apple.com/app/id796352563',android:'https://app.sketchup.com/',web:'https://www.sketchup.com/'}
};

const CONFIG_ROUTE='/room-elements';
let roomProject=null;
let selectedCeiling=null;
let scanPreview=null;
let scanProjectGeometry={lengthMm:6000,widthMm:4200,heightMm:2800};
let scanCamera={yaw:0,pitch:.34,distance:8.2};
const scanPointers=new Map();
let scanDragStart=null;
let scanPinchStart=null;

function isRussian(){ return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru')==='ru'; }
function devicePlatform(){const ua=navigator.userAgent||'';if(/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'ios';if(/Android/i.test(ua))return'android';return'web';}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function wrapAngle(v){const tau=Math.PI*2;v%=tau;if(v>Math.PI)v-=tau;if(v<-Math.PI)v+=tau;return v;}
function uid(){return crypto.randomUUID?crypto.randomUUID():`scan-${Date.now()}-${Math.random().toString(16).slice(2)}`;}

function applyPilotCopy(){
  const ru=isRussian();
  const subtitle=document.getElementById('roomSubtitle');
  const hint=document.getElementById('gestureHint');
  const measurementLabel=document.getElementById('measurementLabel');
  const scopeTitle=document.getElementById('scopeTitle');
  const scopeCopy=document.getElementById('scopeCopy');
  if(subtitle) subtitle.textContent=ru?'Проверьте размеры помещения, загрузите скан и выберите тип потолка.':'Check room dimensions, load a scan, and choose the ceiling type.';
  if(hint) hint.textContent=ru?'Вращайте 3D пальцем · нажмите стену или пол для размеров':'Orbit the 3D view · tap a wall or floor for dimensions';
  if(measurementLabel) measurementLabel.textContent=ru?'Далее':'Continue';
  if(scopeTitle) scopeTitle.textContent=ru?'Геометрия помещения':'Room geometry';
  if(scopeCopy) scopeCopy.textContent=ru?'На этом шаге только размеры, скан и потолок.':'This step contains only dimensions, scan, and ceiling.';
  const title=document.getElementById('scanTitle');
  const copy=document.getElementById('scanCopy');
  const note=document.getElementById('scanNote');
  if(title) title.textContent=ru?'Скан помещения':'Room scan';
  if(copy) copy.textContent=ru?'Загрузите готовый скан или откройте приложение для сканирования.':'Load an existing scan or open a scanning app.';
  if(note) note.textContent=ru?'BIZET накладывает распознанную геометрию на наше 3D-пространство. Перед применением проверьте результат.':'BIZET overlays recognized geometry in the existing 3D workspace. Check the result before applying.';
  document.querySelectorAll('[data-latest-i18n]').forEach(node=>{const value=node.dataset[ru?'ru':'en'];if(value)node.textContent=value;});
  syncCeilingGate();
}

function patchProject(path,value,extra={}){
  const id=sessionStorage.getItem(STORAGE_KEY); if(!id) return Promise.reject(new Error('project_not_found'));
  return fetch(`/api/v1.1/projects/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,value,...extra})}).then(async r=>{if(!r.ok)throw new Error((await r.json().catch(()=>({}))).detail||'patch_failed');return r.json();});
}

async function fetchRoomProject(){
  const id=sessionStorage.getItem(STORAGE_KEY);if(!id)return null;
  const r=await fetch(`/api/v1.1/projects/${id}`);if(!r.ok)return null;return r.json();
}

function measured(g,key,fallback){const value=g?.[key]?.value_mm;return Number.isFinite(value)&&value>0?value:fallback;}
async function loadProjectSnapshot(){
  try{
    roomProject=await fetchRoomProject();if(!roomProject)return;
    const g=roomProject?.room?.geometry||{};
    scanProjectGeometry={lengthMm:measured(g,'wall_length',6000),widthMm:measured(g,'wall_depth',4200),heightMm:measured(g,'room_height',2800)};
    const cam=roomProject?.scene?.camera||{};
    if(Number.isFinite(cam.yaw))scanCamera.yaw=wrapAngle(cam.yaw);
    if(Number.isFinite(cam.pitch))scanCamera.pitch=wrapAngle(cam.pitch);
    if(Number.isFinite(cam.distance))scanCamera.distance=clamp(cam.distance,3.5,30);
    selectedCeiling=roomProject?.room?.ceiling?.type||selectedCeiling;
    scanPreview=roomProject?.scene?.visual_settings?.scan_import?.geometry_preview||null;
    syncCeilingGate();drawScanOverlay();
  }catch(_){ }
}

function buildCeilingGate(){
  const next=document.getElementById('startMeasurementButton');if(!next)return;
  next.classList.add('geometry-next-button');
  next.setAttribute('aria-disabled','true');
  if(!document.getElementById('ceilingGateHint')){
    const hint=document.createElement('p');hint.id='ceilingGateHint';hint.className='ceiling-gate-hint';hint.hidden=true;
    next.parentElement?.appendChild(hint);
  }
  next.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!selectedCeiling){
      const hint=document.getElementById('ceilingGateHint');
      if(hint){hint.textContent=isRussian()?'Чтобы продолжить, выберите тип потолка.':'Choose a ceiling type to continue.';hint.hidden=false;}
      document.getElementById('ceilingButton')?.classList.add('needs-attention');
      document.getElementById('ceilingButton')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    window.location.assign(CONFIG_ROUTE);
  },true);
  document.querySelectorAll('[data-ceiling]').forEach(button=>button.addEventListener('click',()=>{
    selectedCeiling=button.dataset.ceiling||selectedCeiling;
    syncCeilingGate();
  }));
}

function syncCeilingGate(){
  const next=document.getElementById('startMeasurementButton');if(!next)return;
  const ready=Boolean(selectedCeiling);
  next.classList.toggle('is-ready',ready);next.classList.toggle('needs-ceiling',!ready);next.setAttribute('aria-disabled',String(!ready));
  if(ready){const hint=document.getElementById('ceilingGateHint');if(hint)hint.hidden=true;document.getElementById('ceilingButton')?.classList.remove('needs-attention');}
}

function parseGlb(buffer){
  const view=new DataView(buffer);if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67)throw new Error('Это не GLB-файл.');
  if(view.getUint32(4,true)!==2)throw new Error('Поддерживается GLB 2.0.');
  let offset=12,json=null,bin=null;
  while(offset+8<=view.byteLength){const len=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;const bytes=new Uint8Array(buffer,offset,len);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(bytes).replace(/\u0000+$/g,''));else if(type===0x004e4942)bin=bytes.slice().buffer;offset+=len;}
  if(!json)throw new Error('JSON-блок GLB не найден.');return{json,glbBin:bin};
}
function parseGlbJson(buffer){return parseGlb(buffer).json;}

function analyzeGltf(json){
  const meshes=Array.isArray(json.meshes)?json.meshes:[];const accessors=Array.isArray(json.accessors)?json.accessors:[];
  let primitives=0;const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];let positions=0;
  for(const mesh of meshes){for(const primitive of mesh.primitives||[]){primitives++;const index=primitive?.attributes?.POSITION;if(!Number.isInteger(index))continue;const acc=accessors[index];if(!acc||!Array.isArray(acc.min)||!Array.isArray(acc.max))continue;positions++;for(let i=0;i<3;i++){mins[i]=Math.min(mins[i],Number(acc.min[i]));maxs[i]=Math.max(maxs[i],Number(acc.max[i]));}}}
  let bounds=null;if(positions&&mins.every(Number.isFinite)&&maxs.every(Number.isFinite)){const ext=maxs.map((v,i)=>Math.abs(v-mins[i]));const lengthMm=Math.round(ext[0]*1000),widthMm=Math.round(ext[2]*1000),heightMm=Math.round(ext[1]*1000);if([lengthMm,widthMm,heightMm].every(v=>v>=100&&v<=100000))bounds={lengthMm,widthMm,heightMm};}
  return{meshes:meshes.length,primitives,positionAccessors:positions,bounds};
}

function decodeDataUri(uri){const comma=uri.indexOf(',');if(comma<0)return null;const meta=uri.slice(0,comma),data=uri.slice(comma+1);if(meta.includes(';base64')){const raw=atob(data),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out.buffer;}return new TextEncoder().encode(decodeURIComponent(data)).buffer;}
async function loadGltfBuffers(json,files,glbBin){
  const map=new Map([...files].map(f=>[f.name,f]));const buffers=[];
  for(let i=0;i<(json.buffers||[]).length;i++){
    const def=json.buffers[i]||{};
    if(i===0&&glbBin&&!def.uri){buffers.push(glbBin);continue;}
    if(typeof def.uri==='string'&&def.uri.startsWith('data:')){buffers.push(decodeDataUri(def.uri));continue;}
    if(typeof def.uri==='string'&&map.has(def.uri)){buffers.push(await map.get(def.uri).arrayBuffer());continue;}
    buffers.push(null);
  }
  return buffers;
}
const COMPONENT_INFO={5120:[Int8Array,1],5121:[Uint8Array,1],5122:[Int16Array,2],5123:[Uint16Array,2],5125:[Uint32Array,4],5126:[Float32Array,4]};
const TYPE_SIZE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function readAccessor(json,buffers,index){
  const acc=json.accessors?.[index],bv=json.bufferViews?.[acc?.bufferView];if(!acc||!bv)return null;const buffer=buffers[bv.buffer];if(!buffer)return null;const info=COMPONENT_INFO[acc.componentType],size=TYPE_SIZE[acc.type];if(!info||!size)return null;
  const [,bytes]=info,base=(bv.byteOffset||0)+(acc.byteOffset||0),stride=bv.byteStride||bytes*size,count=acc.count||0,out=[];
  const dv=new DataView(buffer);
  const getter={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[acc.componentType];
  for(let i=0;i<count;i++){const row=[];for(let j=0;j<size;j++){const off=base+i*stride+j*bytes;row.push(dv[getter](off,true));}out.push(size===1?row[0]:row);}return out;
}
function identity(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function multiply(a,b){const o=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function nodeMatrix(node){
  if(Array.isArray(node.matrix)&&node.matrix.length===16)return node.matrix.map(Number);
  const t=node.translation||[0,0,0],s=node.scale||[1,1,1],q=node.rotation||[0,0,0,1],x=q[0],y=q[1],z=q[2],w=q[3];
  const r=[1-2*y*y-2*z*z,2*x*y+2*z*w,2*x*z-2*y*w,0,2*x*y-2*z*w,1-2*x*x-2*z*z,2*y*z+2*x*w,0,2*x*z+2*y*w,2*y*z-2*x*w,1-2*x*x-2*y*y,0,0,0,0,1];
  const sm=[s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,0,0,0,1],tm=identity();tm[12]=t[0];tm[13]=t[1];tm[14]=t[2];return multiply(tm,multiply(r,sm));
}
function transformPoint(m,p){const x=p[0],y=p[1],z=p[2];return[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
function gltfToBizet(p){return[p[0],p[2],p[1]];}

function collectMeshInstances(json){
  const instances=[];const nodes=json.nodes||[];const roots=(json.scenes?.[json.scene||0]?.nodes)||(nodes.map((_,i)=>i));
  function walk(index,parent){const node=nodes[index]||{};const world=multiply(parent,nodeMatrix(node));if(Number.isInteger(node.mesh))instances.push({mesh:node.mesh,matrix:world});for(const child of node.children||[])walk(child,world);}
  if(nodes.length)for(const r of roots)walk(r,identity());else for(let i=0;i<(json.meshes||[]).length;i++)instances.push({mesh:i,matrix:identity()});return instances;
}
function extractGeometryPreview(json,buffers){
  const segments=[];const points=[];const instances=collectMeshInstances(json);let primitiveCount=0;
  for(const inst of instances){const mesh=json.meshes?.[inst.mesh];if(!mesh)continue;for(const primitive of mesh.primitives||[]){primitiveCount++;const pIndex=primitive?.attributes?.POSITION;if(!Number.isInteger(pIndex))continue;const pos=readAccessor(json,buffers,pIndex);if(!pos?.length)continue;const world=pos.map(p=>gltfToBizet(transformPoint(inst.matrix,p)));points.push(...world);
      const idx=Number.isInteger(primitive.indices)?readAccessor(json,buffers,primitive.indices):null;const addEdge=(a,b)=>{if(segments.length>=SCAN_PREVIEW_LIMIT)return;const p1=world[a],p2=world[b];if(p1&&p2)segments.push([...p1,...p2]);};
      if(idx?.length){for(let i=0;i+2<idx.length&&segments.length<SCAN_PREVIEW_LIMIT;i+=3){const a=idx[i],b=idx[i+1],c=idx[i+2];addEdge(a,b);addEdge(b,c);addEdge(c,a);}}
      else{for(let i=0;i+2<world.length&&segments.length<SCAN_PREVIEW_LIMIT;i+=3){addEdge(i,i+1);addEdge(i+1,i+2);addEdge(i+2,i);}}
  }}
  if(!points.length)return{segments:[],bounds:null,primitiveCount};
  const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];for(const p of points)for(let i=0;i<3;i++){mins[i]=Math.min(mins[i],p[i]);maxs[i]=Math.max(maxs[i],p[i]);}
  const centerX=(mins[0]+maxs[0])/2,baseY=mins[1],baseZ=mins[2];const normalizePoint=p=>[p[0]-centerX,p[1]-baseY,p[2]-baseZ];
  const normalized=segments.map(s=>{const a=normalizePoint(s.slice(0,3)),b=normalizePoint(s.slice(3,6));return[...a,...b].map(v=>Math.round(v*10000)/10000);});
  const ext=[maxs[0]-mins[0],maxs[1]-mins[1],maxs[2]-mins[2]],bounds={lengthMm:Math.round(ext[0]*1000),widthMm:Math.round(ext[1]*1000),heightMm:Math.round(ext[2]*1000)};
  return{segments:normalized,bounds,primitiveCount};
}

async function readScanFiles(fileList){
  const files=[...fileList],main=files.find(f=>/\.(glb|gltf)$/i.test(f.name));if(!main)throw new Error(isRussian()?'Выберите файл .gltf или .glb.':'Choose a .gltf or .glb file.');
  const buffer=await main.arrayBuffer();let json,glbBin=null,format;
  if(/\.glb$/i.test(main.name)){const parsed=parseGlb(buffer);json=parsed.json;glbBin=parsed.glbBin;format='GLB';}
  else{json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer)));format='GLTF';}
  const buffers=await loadGltfBuffers(json,files,glbBin),geometry=extractGeometryPreview(json,buffers),fallback=analyzeGltf(json);
  const missingBuffers=buffers.some((b,i)=>!b&&(json.buffers?.[i]?.byteLength||0)>0);
  return{main,format,json,meshes:(json.meshes||[]).length,primitives:geometry.primitiveCount||fallback.primitives,bounds:geometry.bounds||fallback.bounds,segments:geometry.segments,missingBuffers};
}

function buildScanPilot(){
  const dialog=document.getElementById('scanDialog');if(!dialog)return;const card=dialog.querySelector('.modal-card');card?.querySelector('.scan-options')?.remove();if(card?.querySelector('#latestScanPaths'))return;const note=document.getElementById('scanNote');
  const host=document.createElement('div');host.id='latestScanPaths';host.innerHTML=`
    <div class="scan-paths">
      <button class="scan-path-button" id="existingScanPath" type="button"><strong data-latest-i18n data-ru="У меня уже есть скан" data-en="I already have a scan">У меня уже есть скан</strong><span data-latest-i18n data-ru="Выбрать GLTF/GLB на устройстве" data-en="Choose GLTF/GLB from this device">Выбрать GLTF/GLB на устройстве</span></button>
      <button class="scan-path-button" id="newScanPath" type="button"><strong data-latest-i18n data-ru="Мне нужно отсканировать" data-en="I need to scan the room">Мне нужно отсканировать</strong><span data-latest-i18n data-ru="Открыть приложение или страницу установки" data-en="Open an app or its install page">Открыть приложение или страницу установки</span></button>
    </div>
    <section class="scan-path-panel" id="existingScanPanel" hidden>
      <input id="scanFileInput" type="file" accept=".gltf,.glb,.bin,model/gltf+json,model/gltf-binary,application/octet-stream" multiple hidden>
      <button class="scan-file-button" id="chooseScanFile" type="button"><strong data-latest-i18n data-ru="Выбрать файл скана" data-en="Choose scan file">Выбрать файл скана</strong><span>GLTF / GLB</span></button>
      <div class="scan-progress" id="scanProgress" hidden><span class="scan-progress-step" data-step="upload" data-latest-i18n data-ru="Загружаем" data-en="Loading">Загружаем</span><span class="scan-progress-step" data-step="recognize" data-latest-i18n data-ru="Распознаём геометрию" data-en="Recognizing geometry">Распознаём геометрию</span><span class="scan-progress-step" data-step="check" data-latest-i18n data-ru="Накладываем на 3D" data-en="Overlaying in 3D">Накладываем на 3D</span></div>
      <div class="scan-import-result" id="scanImportResult" hidden></div>
      <button class="primary-button scan-apply-button" id="scanApplyDimensions" type="button" hidden data-latest-i18n data-ru="Применить скан в 3D" data-en="Apply scan in 3D">Применить скан в 3D</button>
      <p class="scan-file-note" data-latest-i18n data-ru="Если GLTF использует отдельный BIN-файл, выберите GLTF и BIN одновременно." data-en="If the GLTF uses a separate BIN file, select the GLTF and BIN together.">Если GLTF использует отдельный BIN-файл, выберите GLTF и BIN одновременно.</p>
    </section>
    <section class="scan-path-panel" id="newScanPanel" hidden>
      <div class="scan-download-grid">
        <button class="scan-download-button" type="button" data-download-provider="POLYCAM"><strong>Polycam</strong><span data-latest-i18n data-ru="Сканировать помещение и экспортировать GLTF" data-en="Scan the room and export GLTF">Сканировать помещение и экспортировать GLTF</span></button>
        <button class="scan-download-button" type="button" data-download-provider="SKETCHUP"><strong>SketchUp</strong><span data-latest-i18n data-ru="Открыть доступный вариант для вашего устройства" data-en="Open the available option for your device">Открыть доступный вариант для вашего устройства</span></button>
      </div>
      <p class="scan-file-note" data-latest-i18n data-ru="После сканирования вернитесь: Скан → «У меня уже есть скан»." data-en="After scanning, return to Scan → ‘I already have a scan’. ">После сканирования вернитесь и загрузите файл.</p>
    </section>`;
  if(note)card.insertBefore(host,note);else card.appendChild(host);
  const existingButton=document.getElementById('existingScanPath'),newButton=document.getElementById('newScanPath'),existingPanel=document.getElementById('existingScanPanel'),newPanel=document.getElementById('newScanPanel');
  const choosePath=which=>{const existing=which==='existing';existingButton.classList.toggle('is-active',existing);newButton.classList.toggle('is-active',!existing);existingPanel.hidden=!existing;newPanel.hidden=existing;};
  existingButton.addEventListener('click',()=>choosePath('existing'));newButton.addEventListener('click',()=>choosePath('new'));
  document.querySelectorAll('[data-download-provider]').forEach(button=>button.addEventListener('click',()=>{const provider=SCAN_DOWNLOADS[button.dataset.downloadProvider],platform=devicePlatform();if(provider)window.open(provider[platform]||provider.web,'_blank','noopener,noreferrer');}));
  const fileInput=document.getElementById('scanFileInput'),chooseFile=document.getElementById('chooseScanFile'),progress=document.getElementById('scanProgress'),result=document.getElementById('scanImportResult'),apply=document.getElementById('scanApplyDimensions');let estimate=null,pendingPreview=null,pendingMeta=null;
  chooseFile.addEventListener('click',()=>fileInput.click());
  function setStep(name){progress.hidden=false;let reached=true;progress.querySelectorAll('.scan-progress-step').forEach(step=>{step.classList.remove('is-active','is-done');if(step.dataset.step===name){step.classList.add('is-active');reached=false;}else if(reached)step.classList.add('is-done');});}
  fileInput.addEventListener('change',async()=>{if(!fileInput.files?.length)return;estimate=null;pendingPreview=null;pendingMeta=null;apply.hidden=true;result.hidden=true;try{
    setStep('upload');await new Promise(r=>setTimeout(r,60));setStep('recognize');const info=await readScanFiles(fileInput.files);await new Promise(r=>setTimeout(r,60));setStep('check');estimate=info.bounds;
    pendingPreview=info.segments?.length?{segments_m:info.segments,source_format:info.format}:null;pendingMeta={file_name:info.main.name,format:info.format,mesh_count:info.meshes,primitive_count:info.primitives,preliminary_bounds_mm:info.bounds,geometry_preview:pendingPreview,status:pendingPreview?'GEOMETRY_READY':'BOUNDS_ONLY'};
    const ru=isRussian(),dims=info.bounds?`${info.bounds.lengthMm} × ${info.bounds.widthMm} × H ${info.bounds.heightMm} mm`:(ru?'габарит не найден':'bounds not found');
    const geometryText=pendingPreview?(ru?`Геометрия: ${info.segments.length} сегментов для 3D-превью`:`Geometry: ${info.segments.length} preview segments`):(ru?'Геометрия не извлечена. Если рядом со сканом есть .bin — выберите оба файла.':'Geometry was not extracted. If the scan has a .bin companion, select both files.');
    result.innerHTML=`<strong>${info.main.name}</strong><p>${info.format} · ${info.meshes} mesh · ${info.primitives} primitives<br>${ru?'Габарит':'Bounds'}: ${dims}<br>${geometryText}</p>`;result.hidden=false;apply.hidden=!info.bounds;
  }catch(error){result.innerHTML=`<strong>${isRussian()?'Не удалось прочитать скан':'Could not read scan'}</strong><p>${error.message}</p>`;result.hidden=false;}});
  apply.addEventListener('click',async()=>{if(!estimate||!pendingMeta)return;apply.disabled=true;try{
    await patchProject('scene.visual_settings.scan_import',pendingMeta,{reason:'GLTF geometry import preview'});
    for(const [path,value] of [['room.geometry.wall_length',estimate.lengthMm],['room.geometry.wall_depth',estimate.widthMm],['room.geometry.room_height',estimate.heightMm]])await patchProject(path,value,{source:'IMPORTED',confirmed:false,reason:'Scan geometry bounds'});
    if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
    window.location.assign('/room?scan=applied');
  }catch(error){result.innerHTML+=`<p>${error.message}</p>`;apply.disabled=false;}});
  choosePath('existing');applyPilotCopy();
}

function add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}function mul(a,s){return[a[0]*s,a[1]*s,a[2]*s];}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}function len(a){return Math.hypot(...a);}function norm(a){const l=len(a)||1;return mul(a,1/l);}
function scanTarget(){return[0,scanProjectGeometry.widthMm/2000,scanProjectGeometry.heightMm/2000*.48];}
function scanCameraPosition(){const target=scanTarget(),cp=Math.cos(scanCamera.pitch),sp=Math.sin(scanCamera.pitch);return add(target,[scanCamera.distance*cp*Math.sin(scanCamera.yaw),-scanCamera.distance*cp*Math.cos(scanCamera.yaw),scanCamera.distance*sp]);}
function scanView(){const target=scanTarget(),position=scanCameraPosition(),forward=norm(sub(target,position)),right=norm([Math.cos(scanCamera.yaw),Math.sin(scanCamera.yaw),0]),up=norm([-Math.sin(scanCamera.pitch)*Math.sin(scanCamera.yaw),Math.sin(scanCamera.pitch)*Math.cos(scanCamera.yaw),Math.cos(scanCamera.pitch)]);return{position,forward,right,up};}
function projectScanPoint(p,view,w,h){const rel=sub(p,view.position),x=dot(rel,view.right),y=dot(rel,view.up),z=dot(rel,view.forward);if(z<=.04)return null;const focal=Math.min(w,h)*1.08;return[w/2+focal*x/z,h/2-focal*y/z,z];}
function ensureScanCanvas(){
  const base=document.getElementById('roomCanvas');if(!base)return null;let overlay=document.getElementById('scanOverlayCanvas');if(!overlay){overlay=document.createElement('canvas');overlay.id='scanOverlayCanvas';overlay.setAttribute('aria-hidden','true');base.insertAdjacentElement('afterend',overlay);}return overlay;
}
function drawScanOverlay(){
  const overlay=ensureScanCanvas();if(!overlay)return;const segs=scanPreview?.segments_m||[];const w=Math.max(1,overlay.clientWidth),h=Math.max(1,overlay.clientHeight),ratio=window.devicePixelRatio||1;if(overlay.width!==Math.round(w*ratio)||overlay.height!==Math.round(h*ratio)){overlay.width=Math.round(w*ratio);overlay.height=Math.round(h*ratio);}const ctx=overlay.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);if(!segs.length)return;
  const view=scanView(),dark=document.documentElement.dataset.theme==='dark';ctx.save();ctx.strokeStyle=dark?'rgba(249,201,74,.92)':'rgba(214,145,0,.92)';ctx.lineWidth=1.2;ctx.globalAlpha=.9;ctx.beginPath();let count=0;for(const s of segs){const a=projectScanPoint(s.slice(0,3),view,w,h),b=projectScanPoint(s.slice(3,6),view,w,h);if(!a||!b)continue;ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);count++;}ctx.stroke();ctx.restore();
  if(count){ctx.save();ctx.font='700 11px Inter, sans-serif';ctx.fillStyle=dark?'rgba(249,201,74,.95)':'rgba(164,103,0,.95)';ctx.fillText(isRussian()?'СКАН · геометрия':'SCAN · geometry',18,h-22);ctx.restore();}
}
function bindScanCameraSync(){
  const canvas=document.getElementById('roomCanvas');if(!canvas)return;
  canvas.addEventListener('pointerdown',e=>{scanPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(scanPointers.size===1)scanDragStart={x:e.clientX,y:e.clientY,yaw:scanCamera.yaw,pitch:scanCamera.pitch};if(scanPointers.size===2){const p=[...scanPointers.values()];scanPinchStart={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),cameraDistance:scanCamera.distance};}});
  canvas.addEventListener('pointermove',e=>{if(!scanPointers.has(e.pointerId))return;scanPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(scanPointers.size===1&&scanDragStart){scanCamera.yaw=wrapAngle(scanDragStart.yaw-(e.clientX-scanDragStart.x)*.005);scanCamera.pitch=wrapAngle(scanDragStart.pitch+(e.clientY-scanDragStart.y)*.004);drawScanOverlay();}else if(scanPointers.size===2&&scanPinchStart){const p=[...scanPointers.values()],d=Math.max(20,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y));scanCamera.distance=clamp(scanPinchStart.cameraDistance*(scanPinchStart.distance/d),3.5,30);drawScanOverlay();}});
  const finish=e=>{scanPointers.delete(e.pointerId);if(scanPointers.size===0){scanDragStart=null;scanPinchStart=null;}else if(scanPointers.size===1){const p=[...scanPointers.values()][0];scanDragStart={x:p.x,y:p.y,yaw:scanCamera.yaw,pitch:scanCamera.pitch};}};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  canvas.addEventListener('wheel',e=>{scanCamera.distance=clamp(scanCamera.distance*Math.exp(e.deltaY*.001),3.5,30);drawScanOverlay();},{passive:true});
  document.getElementById('resetViewButton')?.addEventListener('click',()=>{scanCamera.yaw=0;scanCamera.pitch=.34;const fit=Math.max(scanProjectGeometry.lengthMm,scanProjectGeometry.widthMm,scanProjectGeometry.heightMm)/1000*1.35;scanCamera.distance=clamp(fit,3.5,30);drawScanOverlay();});
  document.getElementById('dimensionSave')?.addEventListener('click',()=>setTimeout(loadProjectSnapshot,800));
  window.addEventListener('resize',drawScanOverlay);document.getElementById('themeSelect')?.addEventListener('change',()=>setTimeout(drawScanOverlay,0));
}

ensureLatestStyles();
applyPilotCopy();
buildCeilingGate();
buildScanPilot();
bindScanCameraSync();
loadProjectSnapshot();
document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(applyPilotCopy,0));
setTimeout(()=>{applyPilotCopy();loadProjectSnapshot();},500);
