/* BIZET OS R10.5.7: provider-backed locked photorealistic visualization.
 * Save/download works after an actual provider result. No fake render is produced.
 * Never write an API key to client code.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const lang=()=>String(localStorage.getItem('bizet_os_language')||'ua').toLowerCase();
const tx=(ru,en,ua)=>lang()==='en'?en:lang()==='ru'?ru:ua;
const projectId=()=>new URLSearchParams(location.search).get('project')||
  sessionStorage.getItem('bizet_os_project_id')||localStorage.getItem('bizet_os_project_id')||'pilot';
const API='/api/v1.1/visualization';
let provider=null,phase='IDLE',lastSceneHash='',lastDataUrl=null,lastOutputHash='',busy=false;
let warnings=[],sceneDescriptor=null,lastReference=null;

function material(m){return{type:m?.type||null,preset:m?.preset||null,
 custom_texture_name:m?.custom_texture_name||null,custom_texture_present:!!m?.custom_texture_data_url};}
function snapshot(){
 const rt=window.BizetModelRuntime;
 if(!rt?.ready)return null;
 const I=rt.getInputs?.()||{},V=rt.getVisual?.()||{},R=rt.getRoom?.()||{};
 const keys=['fridge_present','fridge_type','fridge_width_mm','dishwasher_type','dishwasher_width_mm',
 'sink_mount_type','oven_location','oven_width_mm','oven_height_mm','cooktop_type','cooktop_width_mm',
 'hood_type','lighting_enabled','lighting_upper_inside','lighting_lower_inside','lighting_kelvin',
 'handle_system','gola_system'];
 const raw=rt.getModules?.()||[];
 return{
   source:'BIZET_OS_CANONICAL_PROJECT_STATE',project_id:projectId(),source_version:'R10.5.7',
   configuration:rt.getConfiguration?.(),
   room_mm:{length:R.lengthMm,depth:R.depthMm,height:R.heightMm},
   room_elements:rt.getElements?.()||[],
   modules:raw.map(m=>({id:m.id,kind:m.kind,wall:m.wall,
      x_mm:m.x,y_mm:m.y,z_mm:m.z,width_mm:m.w,depth_mm:m.d,height_mm:m.h,
      facade_count:m.facade_count??null,facade_openings:m.facade_openings||[],
      shelf_count:m.shelf_count||0,handle_override_mode:m.handle_override_mode||null,
      handle_placement:m.handle_placement||null,
      individual_handle_system:m.individual_handle_system||null,
      plinth_grille_cutout_mm:m.plinth_grille_cutout_mm||null,
      material:m.material||null})),
   room_surfaces:{floor:material(V.room_surface_materials?.floor),
     walls:material(V.room_surface_materials?.walls),ceiling:material(V.room_surface_materials?.ceiling)},
   furniture_surfaces:{front:material(V.furniture_materials?.facade),
     body:material(V.furniture_materials?.carcass),worktop:material(V.furniture_materials?.worktop)},
   fixtures:Object.fromEntries(keys.filter(k=>I[k]!==undefined).map(k=>[k,I[k]])),
   invariant:'Image may not change room, modules, appliance placements, handles, materials or engineering data.'
 };
}
// Offline read-only placeholder is only displayed with an explicit network error.
// The server is the final authority for the actual locked prompt.
function promptFor(scene){
 return 'BIZET OS · ENGINEERING LOCKED PROMPT / R10.5.7\n'+
  'Preserve the attached WebGL scene and canonical geometry. No changing cabinet dimensions, '+
  'appliances, openings, material colors, worktop or handles. No sockets or switches near sink '+
  'or hob. If LED lighting is disabled, do not add it. User addendum may adjust only nonstructural '+
  'interior ambience. Do not invent a 40 mm fridge filler that is absent from the model.\n'+
  'CANONICAL SCENE (read only)\n'+JSON.stringify(scene,null,2);
}
function referenceCapture(){
 const v=window.BizetKitchenWebGL;
 if(!v?.renderer?.domElement)throw Error('WEBGL_REFERENCE_NOT_AVAILABLE');
 // preserveDrawingBuffer=true is required by the existing WebGL constructor.
 v.redraw?.();v.renderer.render(v.scene,v.camera);
 const canvas=v.renderer.domElement;
 if(canvas.width<400||canvas.height<200)throw Error('CANVAS_NOT_READY');
 const output=document.createElement('canvas'),ratio=Math.min(1,1400/canvas.width,900/canvas.height);
 output.width=Math.max(1,Math.round(canvas.width*ratio));
 output.height=Math.max(1,Math.round(canvas.height*ratio));
 output.getContext('2d').drawImage(canvas,0,0,output.width,output.height);
 const data=output.toDataURL('image/png');
 if(data.length<600||data==='data:,')throw Error('WEBGL_REFERENCE_CAPTURE_FAILED');
 return data;
}
async function sha(value){
 if(!crypto?.subtle)return 'N/A';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function statusMsg(message,error=false){
 const el=$('r1056Status');if(!el)return;
 el.textContent=message;el.classList.toggle('r1056-error',error);
}
function phaseUpdate(value){
 phase=value;const stage=$('r1057Phase');if(stage)stage.textContent=value;
 const btn=$('r1056Generate'),save=$('r1057Save');
 if(btn){btn.disabled=busy||!provider?.ready||!sceneDescriptor;
   btn.textContent=value==='SUCCESS'
    ?tx('Сгенерировать повторно','Generate again','Згенерувати повторно')
    :tx('Сгенерировать','Generate','Згенерувати');}
 if(save)save.disabled=!lastDataUrl||lastOutputHash!==lastSceneHash;
 const progress=$('r1057Progress');if(progress)progress.hidden=!busy;
}
function renderWarnings(){
 const el=$('r1057Warnings');if(!el)return;
 el.hidden=!warnings.length;
 el.textContent=warnings.length?tx('Нужна инженерная проверка: ','Engineering review: ','Потрібна інженерна перевірка: ')+warnings.join(' · '):'';
}
function buildDialog(){
 if($('r1056VisualizationDialog'))return;
 const d=document.createElement('dialog');d.id='r1056VisualizationDialog';d.className='r1055-visualization r1056-visualization r1057-visualization';
 d.innerHTML='<section class="r1055-visual-card">'+
  '<header><h2 id="r1056Title"></h2><button id="r1056Close" type="button" aria-label="Close">×</button></header>'+
  '<div class="r1055-visual-preview" aria-live="polite">'+
  '<img id="r1056Image" alt="Photorealistic visualization" hidden>'+
  '<img id="r1057Source" alt="Current engineering 3D reference" hidden>'+
  '<p id="r1056Status"></p><span id="r1057Phase" aria-label="Render status"></span>'+
  '<div id="r1057Progress" hidden class="r1057-progress"></div>'+
  '<small id="r1056Verification"></small></div>'+
  '<div class="r1055-visual-prompt">'+
  '<strong id="r1056PromptLabel"></strong>'+
  '<textarea id="r1056Prompt" readonly aria-readonly="true" rows="5"></textarea>'+
  '<label id="r1056ExtraLabel" for="r1056Extra"></label>'+
  '<textarea id="r1056Extra" maxlength="2000" rows="3"></textarea>'+
  '<label id="r1056CodeLabel" for="r1056Code"></label>'+
  '<input id="r1056Code" type="password" autocomplete="off" placeholder="Owner access code">'+
  '<div id="r1057Warnings" role="status" hidden></div>'+
  '<small id="r1056Snapshot"></small>'+
  '<div class="r1057-actions"><button id="r1056Generate" type="button"></button>'+
  '<button id="r1057Save" type="button" disabled></button></div>'+
  '</div></section>';
 document.body.appendChild(d);
 $('r1056Close').onclick=()=>d.close();
 d.onclick=e=>{if(e.target===d)d.close()};
 $('r1056Generate').onclick=()=>generate().catch(error=>{
   busy=false;phaseUpdate('ERROR');statusMsg(error.message||'IMAGE_PROVIDER_ERROR',true);
 });
 $('r1057Save').onclick=()=>downloadImage();
 const userExtraKey='bizet_visual_addendum_'+projectId();
 $('r1056Extra').value=localStorage.getItem(userExtraKey)||'';
 $('r1056Extra').addEventListener('input',e=>localStorage.setItem(userExtraKey,e.target.value));
 $('r1056Code').value=sessionStorage.getItem('bizet_visual_owner_code')||'';
 $('r1056Code').addEventListener('change',e=>sessionStorage.setItem('bizet_visual_owner_code',e.target.value));
}
function localize(){
 $('r1056Title').textContent=tx('Фотореалистичная визуализация','Photorealistic visualization','Фотореалістична візуалізація');
 $('r1056PromptLabel').textContent=tx('Инженерный промт · только чтение','Locked engineering prompt · read only','Інженерний промт · лише читання');
 $('r1056ExtraLabel').textContent=tx('Дополнительные пожелания (декор и атмосфера)','Additional requirements (decor and mood)','Додаткові побажання (декор і атмосфера)');
 $('r1056Extra').placeholder=tx('Например: мягкий дневной свет, минимальный декор…','e.g. soft daylight, minimal decor…','Наприклад: м’яке денне світло, мінімальний декор…');
 $('r1056CodeLabel').textContent=tx('Код доступа владельца (не API-ключ)','Owner access code (not API key)','Код доступу власника (не API-ключ)');
 $('r1057Save').textContent=tx('Сохранить изображение','Save image','Зберегти зображення');
 $('r1056Verification').textContent=tx('Рендер — визуальная гипотеза. Производственные размеры и XML остаются в инженерной модели.','Image is a visual proposal. Only the engineering model defines manufacturing and XML.','Рендер — візуальна пропозиція. Виробничі дані й XML беруться лише з інженерної моделі.');
 phaseUpdate(phase);
}
async function refresh(){
 sceneDescriptor=snapshot();
 if(!sceneDescriptor){
   phaseUpdate('ERROR');statusMsg('ENGINEERING_SCENE_NOT_READY',true);return;
 }
 const serialized=JSON.stringify(sceneDescriptor);
 const hash=await sha(serialized);
 lastSceneHash=hash;
 $('r1056Snapshot').textContent='Scene SHA-256: '+hash.slice(0,32)+'…';
 if(lastDataUrl&&lastOutputHash!==hash){
   $('r1056Image').hidden=true;lastDataUrl=null;
   phaseUpdate('READY');
   statusMsg(tx('Проект изменён — предыдущая визуализация устарела.','Project changed — previous result is stale.','Проєкт змінено — попередня візуалізація застаріла.'));
 }
 const promptReq=fetch(API+'/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene:sceneDescriptor}),cache:'no-store'});
 const statusReq=fetch(API+'/status',{cache:'no-store'});
 const [promptResult,statusResult]=await Promise.allSettled([promptReq,statusReq]);
 if(promptResult.status==='fulfilled'&&promptResult.value.ok){
   const body=await promptResult.value.json();
   $('r1056Prompt').value=body.prompt||promptFor(sceneDescriptor);
   warnings=body.warnings||[];
 }else{
   $('r1056Prompt').value=promptFor(sceneDescriptor);
   warnings=['LOCKED_PROMPT_SERVER_UNAVAILABLE'];
 }
 renderWarnings();
 if(statusResult.status==='fulfilled'&&statusResult.value.ok){
   provider=await statusResult.value.json();
 }else{
   provider={ready:false,reason:'PROVIDER_STATUS_UNAVAILABLE'};
 }
 if(!lastDataUrl){
   try {
     lastReference=referenceCapture();
     $('r1057Source').src=lastReference;
     $('r1057Source').hidden=false;
   }catch(e){
     lastReference=null;$('r1057Source').hidden=true;
     warnings.push('WEBGL_REFERENCE_NOT_AVAILABLE');renderWarnings();
   }
 }
 if(!provider.ready){
   phaseUpdate('ERROR');
   statusMsg(tx('Сервер готов, но генерация ожидает API-ключ и код доступа в Render.','UI ready; image generation awaits provider key and access code in Render.','Інтерфейс готовий; генерація очікує ключ провайдера та код доступу в Render.'));
 }else if(warnings.includes('LOCKED_PROMPT_SERVER_UNAVAILABLE')){
   phaseUpdate('ERROR');statusMsg('LOCKED_PROMPT_SERVER_UNAVAILABLE',true);
 }else if(!busy){
   phaseUpdate(lastDataUrl?'SUCCESS':'READY');
   if(!lastDataUrl)statusMsg(tx('Исходная 3D-сцена готова. Нажмите «Сгенерировать».','3D reference ready. Press Generate.','3D-сцена готова. Натисніть «Згенерувати».'));
 }
 phaseUpdate(phase);
}
async function generate(){
 if(busy)return;
 if(!provider?.ready)throw Error('PROVIDER_NOT_CONFIGURED');
 const scene=snapshot();if(!scene)throw Error('ENGINEERING_SCENE_NOT_READY');
 if(warnings.includes('LOCKED_PROMPT_SERVER_UNAVAILABLE'))throw Error('LOCKED_PROMPT_UNAVAILABLE');
 const code=$('r1056Code').value.trim();if(!code)throw Error('OWNER_ACCESS_CODE_REQUIRED');
 const captured=referenceCapture(),sceneHash=await sha(JSON.stringify(scene));
 lastReference=captured;$('r1057Source').src=captured;
 const extra=$('r1056Extra').value.trim();
 busy=true;phaseUpdate('GENERATING');
 statusMsg(tx('Создаём изображение, это может занять несколько минут…','Generating image; this can take a few minutes…','Створюємо зображення, це може тривати кілька хвилин…'));
 try {
   const response=await fetch(API+'/generate',{
     method:'POST',headers:{'Content-Type':'application/json','X-Bizet-Visualization-Code':code},
     body:JSON.stringify({scene,reference_image:captured,additional_requirements:extra})});
   let result={};try{result=await response.json()}catch(_){}
   if(!response.ok)throw Error(result.detail||('RENDER_HTTP_'+response.status));
   if(!result.image_data_url?.startsWith('data:image/png;base64,'))throw Error('IMAGE_PROVIDER_EMPTY_RESULT');
   const currentHash=await sha(JSON.stringify(snapshot()));
   if(currentHash!==sceneHash)throw Error('SCENE_CHANGED_DURING_RENDER_REFRESH_REQUIRED');
   lastDataUrl=result.image_data_url;
   lastOutputHash=sceneHash;
   $('r1056Image').src=lastDataUrl;
   $('r1056Image').hidden=false;
   $('r1057Source').hidden=true;
   warnings=Array.from(new Set([...(warnings||[]),...(result.warnings||[])]));renderWarnings();
   phaseUpdate('SUCCESS');
   statusMsg(tx('Фотореалистичный рендер готов! Проверьте детали и сохраните изображение.','Photorealistic render ready. Check details and save image.','Фотореалістичний рендер готовий! Перевірте деталі й збережіть зображення.'));
 }catch(error){
   phaseUpdate('ERROR');statusMsg(error.message||'RENDER_FAILED',true);
 }finally{busy=false;phaseUpdate(phase)}
}
async function downloadImage(){
 if(!lastDataUrl||lastOutputHash!==lastSceneHash)return;
 try{
   const blob=await (await fetch(lastDataUrl)).blob();
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;
   a.download='BIZET_OS_'+projectId().replace(/[^a-z0-9-]/gi,'_')+'_visualization_10.5.7.png';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),15000);
 }catch(error){
   statusMsg(tx('Не удалось сохранить файл — откройте изображение и сохраните его вручную.','Save failed — open the result and save manually.','Не вдалося зберегти — відкрийте зображення та збережіть вручну.'),true);
 }
}
async function open(){
 buildDialog();localize();
 if(!$('r1056VisualizationDialog').open)$('r1056VisualizationDialog').showModal();
 phaseUpdate('IDLE');
 try{await refresh()}catch(error){phaseUpdate('ERROR');statusMsg(error.message||'VISUALIZATION_UNAVAILABLE',true)}
}
window.BizetVisualizationR1056={open,refresh,snapshot,promptFor,referenceCapture,
 downloadImage,version:'10.5.7'};
document.addEventListener('click',event=>{
 const el=event.target.closest('#openVisualizationR1056,#openVisualizationTop,#openVisualizationFromExportR1056,[data-panel="visualization"]');
 if(!el)return;
 event.preventDefault();event.stopImmediatePropagation();
 open();
},true);
window.addEventListener('bizet:modelchange',()=>{
 if($('r1056VisualizationDialog')?.open&&!busy)refresh().catch(error=>statusMsg(error.message,true));
});
})();
