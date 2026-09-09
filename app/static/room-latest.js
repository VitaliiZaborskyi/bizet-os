const STORAGE_KEY = 'bizet_os_project_id';

function ensureLatestStyles(){
  if(document.querySelector('link[href="/static/room-latest.css"]')) return;
  const link=document.createElement('link'); link.rel='stylesheet'; link.href='/static/room-latest.css'; document.head.appendChild(link);
}

const SCAN_DOWNLOADS={
  POLYCAM:{ios:'https://apps.apple.com/app/id1532482376',android:'https://play.google.com/store/apps/details?id=ai.polycam',web:'https://poly.cam/get-the-app'},
  SKETCHUP:{ios:'https://apps.apple.com/app/id796352563',android:'https://app.sketchup.com/',web:'https://www.sketchup.com/'}
};

function isRussian(){ return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru')==='ru'; }
function devicePlatform(){const ua=navigator.userAgent||'';if(/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'ios';if(/Android/i.test(ua))return'android';return'web';}

function applyPilotCopy(){
  const ru=isRussian();
  const subtitle=document.getElementById('roomSubtitle');
  const hint=document.getElementById('gestureHint');
  if(subtitle) subtitle.textContent=ru?'Вращайте помещение на 360° пальцем или мышью.':'Orbit the room freely through 360° with a mouse or finger.';
  if(hint) hint.textContent=ru?'360° вращение · нажмите стену или пол для размеров':'360° orbit · tap a wall or floor for dimensions';
  const title=document.getElementById('scanTitle');
  const copy=document.getElementById('scanCopy');
  const note=document.getElementById('scanNote');
  if(title) title.textContent=ru?'Скан помещения':'Room scan';
  if(copy) copy.textContent=ru?'Выберите, что хотите сделать со сканом.':'Choose what you want to do with a scan.';
  if(note) note.textContent=ru?'Пилот принимает GLTF/GLB. Распознавание габарита предварительное — перед применением размеры нужно проверить.':'The pilot accepts GLTF/GLB. Dimension recognition is preliminary and must be checked before applying.';
  document.querySelectorAll('[data-latest-i18n]').forEach(node=>{ const value=node.dataset[ru?'ru':'en']; if(value) node.textContent=value; });
}

function patchProject(path,value,extra={}){
  const id=sessionStorage.getItem(STORAGE_KEY); if(!id) return Promise.reject(new Error('project_not_found'));
  return fetch(`/api/v1.1/projects/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,value,...extra})}).then(async r=>{if(!r.ok)throw new Error((await r.json().catch(()=>({}))).detail||'patch_failed');return r.json();});
}

function parseGlbJson(buffer){
  const view=new DataView(buffer); if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67) throw new Error('Это не GLB-файл.');
  const version=view.getUint32(4,true); if(version!==2) throw new Error('Поддерживается GLB 2.0.');
  const chunkLength=view.getUint32(12,true),chunkType=view.getUint32(16,true); if(chunkType!==0x4e4f534a) throw new Error('JSON-блок GLB не найден.');
  const bytes=new Uint8Array(buffer,20,chunkLength); return JSON.parse(new TextDecoder().decode(bytes).replace(/\u0000+$/g,''));
}

function analyzeGltf(json){
  const meshes=Array.isArray(json.meshes)?json.meshes:[]; const accessors=Array.isArray(json.accessors)?json.accessors:[];
  let primitives=0; const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity]; let positions=0;
  for(const mesh of meshes){ for(const primitive of mesh.primitives||[]){ primitives+=1; const index=primitive?.attributes?.POSITION; if(!Number.isInteger(index)) continue; const acc=accessors[index]; if(!acc||!Array.isArray(acc.min)||!Array.isArray(acc.max)||acc.min.length<3||acc.max.length<3) continue; positions+=1; for(let i=0;i<3;i++){mins[i]=Math.min(mins[i],Number(acc.min[i]));maxs[i]=Math.max(maxs[i],Number(acc.max[i]));} } }
  let bounds=null;
  if(positions&&mins.every(Number.isFinite)&&maxs.every(Number.isFinite)){
    const ext=maxs.map((v,i)=>Math.abs(v-mins[i]));
    // glTF uses metres and Y-up: X/Z are horizontal, Y is vertical.
    const lengthMm=Math.round(ext[0]*1000),widthMm=Math.round(ext[2]*1000),heightMm=Math.round(ext[1]*1000);
    if([lengthMm,widthMm,heightMm].every(v=>v>=100&&v<=100000)) bounds={lengthMm,widthMm,heightMm};
  }
  return {meshes:meshes.length,primitives,positionAccessors:positions,bounds};
}

async function readScanFile(file){
  const lower=file.name.toLowerCase(); const buffer=await file.arrayBuffer(); let json;
  if(lower.endsWith('.glb')) json=parseGlbJson(buffer);
  else if(lower.endsWith('.gltf')) json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer)));
  else throw new Error('Выберите файл .gltf или .glb.');
  return {format:lower.endsWith('.glb')?'GLB':'GLTF',...analyzeGltf(json)};
}

function buildScanPilot(){
  const dialog=document.getElementById('scanDialog'); if(!dialog) return;
  const card=dialog.querySelector('.modal-card'); const old=card?.querySelector('.scan-options'); if(old) old.remove();
  if(card?.querySelector('#latestScanPaths')) return;
  const note=document.getElementById('scanNote');
  const host=document.createElement('div'); host.id='latestScanPaths';
  host.innerHTML=`
    <div class="scan-paths">
      <button class="scan-path-button" id="existingScanPath" type="button"><strong data-latest-i18n data-ru="У меня уже есть скан" data-en="I already have a scan">У меня уже есть скан</strong><span data-latest-i18n data-ru="Выбрать GLTF/GLB на устройстве" data-en="Choose GLTF/GLB from this device">Выбрать GLTF/GLB на устройстве</span></button>
      <button class="scan-path-button" id="newScanPath" type="button"><strong data-latest-i18n data-ru="Мне нужно отсканировать" data-en="I need to scan the room">Мне нужно отсканировать</strong><span data-latest-i18n data-ru="Открыть приложение или страницу установки" data-en="Open an app or its install page">Открыть приложение или страницу установки</span></button>
    </div>
    <section class="scan-path-panel" id="existingScanPanel" hidden>
      <input id="scanFileInput" type="file" accept=".gltf,.glb,model/gltf+json,model/gltf-binary" hidden>
      <button class="scan-file-button" id="chooseScanFile" type="button"><strong data-latest-i18n data-ru="Выбрать файл скана" data-en="Choose scan file">Выбрать файл скана</strong><span>GLTF / GLB</span></button>
      <div class="scan-progress" id="scanProgress" hidden><span class="scan-progress-step" data-step="upload" data-latest-i18n data-ru="Загружаем" data-en="Loading">Загружаем</span><span class="scan-progress-step" data-step="recognize" data-latest-i18n data-ru="Распознаём" data-en="Recognizing">Распознаём</span><span class="scan-progress-step" data-step="check" data-latest-i18n data-ru="Проверяем" data-en="Checking">Проверяем</span></div>
      <div class="scan-import-result" id="scanImportResult" hidden></div>
      <button class="primary-button scan-apply-button" id="scanApplyDimensions" type="button" hidden data-latest-i18n data-ru="Применить габарит и обновить 3D" data-en="Apply dimensions and update 3D">Применить габарит и обновить 3D</button>
      <p class="scan-file-note" data-latest-i18n data-ru="Для первого теста достаточно одного GLTF/GLB. Если GLTF использует внешние BIN/текстуры, пилот всё равно попробует прочитать встроенные границы геометрии." data-en="For the first test, one GLTF/GLB is enough. If GLTF references external BIN/textures, the pilot will still try to read embedded geometry bounds.">Для первого теста достаточно одного GLTF/GLB.</p>
    </section>
    <section class="scan-path-panel" id="newScanPanel" hidden>
      <div class="scan-download-grid">
        <button class="scan-download-button" type="button" data-download-provider="POLYCAM"><strong>Polycam</strong><span data-latest-i18n data-ru="Сканировать помещение и экспортировать GLTF" data-en="Scan the room and export GLTF">Сканировать помещение и экспортировать GLTF</span></button>
        <button class="scan-download-button" type="button" data-download-provider="SKETCHUP"><strong>SketchUp</strong><span data-latest-i18n data-ru="Открыть доступный вариант для вашего устройства" data-en="Open the available option for your device">Открыть доступный вариант для вашего устройства</span></button>
      </div>
      <p class="scan-file-note" data-latest-i18n data-ru="После сканирования вернитесь в BIZET OS → Скан → «У меня уже есть скан» и выберите экспортированный файл." data-en="After scanning, return to BIZET OS → Scan → ‘I already have a scan’ and choose the exported file.">После сканирования вернитесь и загрузите файл.</p>
    </section>`;
  if(note) card.insertBefore(host,note); else card.appendChild(host);

  const existingButton=document.getElementById('existingScanPath'),newButton=document.getElementById('newScanPath');
  const existingPanel=document.getElementById('existingScanPanel'),newPanel=document.getElementById('newScanPanel');
  function choosePath(which){const existing=which==='existing';existingButton.classList.toggle('is-active',existing);newButton.classList.toggle('is-active',!existing);existingPanel.hidden=!existing;newPanel.hidden=existing;}
  existingButton.addEventListener('click',()=>choosePath('existing')); newButton.addEventListener('click',()=>choosePath('new'));
  document.querySelectorAll('[data-download-provider]').forEach(button=>button.addEventListener('click',()=>{const provider=SCAN_DOWNLOADS[button.dataset.downloadProvider],platform=devicePlatform();if(provider)window.open(provider[platform]||provider.web,'_blank','noopener,noreferrer');}));

  const fileInput=document.getElementById('scanFileInput'),chooseFile=document.getElementById('chooseScanFile'),progress=document.getElementById('scanProgress'),result=document.getElementById('scanImportResult'),apply=document.getElementById('scanApplyDimensions'); let estimate=null;
  chooseFile.addEventListener('click',()=>fileInput.click());
  function setStep(name){progress.hidden=false;let reached=true;progress.querySelectorAll('.scan-progress-step').forEach(step=>{step.classList.remove('is-active','is-done');if(step.dataset.step===name){step.classList.add('is-active');reached=false;}else if(reached)step.classList.add('is-done');});}
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0]; if(!file)return; estimate=null;apply.hidden=true;result.hidden=true;
    try{
      setStep('upload'); await new Promise(r=>setTimeout(r,80)); setStep('recognize'); const info=await readScanFile(file); await new Promise(r=>setTimeout(r,80)); setStep('check');
      estimate=info.bounds;
      const ru=isRussian();
      const dims=info.bounds?`${info.bounds.lengthMm} × ${info.bounds.widthMm} × H ${info.bounds.heightMm} mm`:(ru?'габарит пока не найден':'bounds not available yet');
      result.innerHTML=`<strong>${file.name}</strong><p>${info.format} · ${info.meshes} mesh · ${info.primitives} primitives<br>${ru?'Предварительный габарит':'Preliminary bounds'}: ${dims}</p>`; result.hidden=false; apply.hidden=!info.bounds;
      await patchProject('scene.visual_settings.scan_import',{file_name:file.name,format:info.format,mesh_count:info.meshes,primitive_count:info.primitives,preliminary_bounds_mm:info.bounds,status:'PRELIMINARY'},{reason:'Experimental GLTF scan import'}).catch(()=>{});
    }catch(error){result.innerHTML=`<strong>${isRussian()?'Не удалось прочитать файл':'Could not read file'}</strong><p>${error.message}</p>`;result.hidden=false;}
  });
  apply.addEventListener('click',async()=>{if(!estimate)return;apply.disabled=true;try{for(const [path,value] of [['room.geometry.wall_length',estimate.lengthMm],['room.geometry.wall_depth',estimate.widthMm],['room.geometry.room_height',estimate.heightMm]])await patchProject(path,value,{source:'IMPORTED',confirmed:false,reason:'Experimental GLTF scan bounds'});window.location.reload();}catch(error){result.innerHTML+=`<p>${error.message}</p>`;apply.disabled=false;}});
  choosePath('existing'); applyPilotCopy();
}

ensureLatestStyles();
applyPilotCopy();
buildScanPilot();
document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(applyPilotCopy,0));
// room-v2 init is async and can rewrite copy once more after project load.
setTimeout(applyPilotCopy,450);
