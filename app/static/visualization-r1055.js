/* R10.5.6 Visualization - visible, real provider path, owner-gated.
   The backend builds the uneditable engineering instruction. */
(()=>{'use strict';
const $=id=>document.getElementById(id), lang=()=>String(localStorage.getItem('bizet_os_language')||'ua').toLowerCase();
const tx=(ru,en,ua)=>lang()==='en'?en:lang()==='ru'?ru:ua;
const projectId=()=>new URLSearchParams(location.search).get('project')||sessionStorage.getItem('bizet_os_project_id')||localStorage.getItem('bizet_os_project_id')||'pilot';
let lastSnapshot='',lastResultHash='',lastResult=null,serverStatus=null;
function material(m){return{type:m?.type||null,preset:m?.preset||null,custom_texture_name:m?.custom_texture_name||null,
 // A texture may be user-provided: the screenshot includes its actual appearance.
 custom_texture_present:!!m?.custom_texture_data_url};}
function snapshot(){
 const rt=window.BizetModelRuntime;if(!rt?.ready)return null;
 const I=rt.getInputs?.()||{},V=rt.getVisual?.()||{},R=rt.getRoom?.()||{};
 const raw=rt.getModules?.()||[];
 const applianceKeys=['fridge_present','fridge_type','fridge_width_mm','dishwasher_type','dishwasher_width_mm','sink_mount_type','oven_location','oven_height_mm','hood_type','cooktop_type','lighting_enabled','lighting_upper_inside','lighting_lower_inside','lighting_kelvin','handle_system'];
 return {
   source:'BIZET_OS_CANONICAL_PROJECT_STATE',project_id:projectId(),source_version:'R10.5.6',
   configuration:rt.getConfiguration?.(),
   room_mm:{length:R.lengthMm,depth:R.depthMm,height:R.heightMm},
   room_elements:rt.getElements?.()||[],
   modules:raw.map(m=>({id:m.id,kind:m.kind,wall:m.wall,x_mm:m.x,y_mm:m.y,z_mm:m.z,
     width_mm:m.w,depth_mm:m.d,height_mm:m.h,facade_count:m.facade_count||null,
     facade_openings:m.facade_openings||[],shelf_count:m.shelf_count||0,
     material:m.material||null,handle_override_mode:m.handle_override_mode||null})),
   room_surfaces:{floor:material(V.room_surface_materials?.floor),walls:material(V.room_surface_materials?.walls),ceiling:material(V.room_surface_materials?.ceiling)},
   furniture_surfaces:{front:material(V.furniture_materials?.facade),body:material(V.furniture_materials?.carcass),worktop:material(V.furniture_materials?.worktop)},
   fixtures:Object.fromEntries(applianceKeys.filter(k=>I[k]!==undefined).map(k=>[k,I[k]])),
   invariant:'Image may not modify module geometry, room dimensions, appliances, placements or selected material names.'
 };
}
function promptFor(scene){
 return 'BIZET OS · ENGINEERING LOCKED PROMPT / R10.5.6\n'+
  'Render a photorealistic interior from the existing BIZET engineering scene without changing a single element. '+ 
  'The attached WebGL camera image is the spatial reference; preserve furniture silhouette, dimensions, positions, appliances, wall openings, colors, selected textures, handle system, plinth and lighting Kelvin. '+ 
  'No additions or structural transformations. An extra user request may only modify mood, decor and atmosphere without covering or modifying the engineered project.\n\n'+
  'CANONICAL SCENE (read only)\n'+JSON.stringify(scene,null,2);
}
function referenceCapture(){
 const v=window.BizetKitchenWebGL;
 if(!v?.renderer?.domElement)throw Error('WEBGL_REFERENCE_NOT_AVAILABLE');
 v.redraw?.();v.renderer.render(v.scene,v.camera);
 const canvas=v.renderer.domElement;
 if(canvas.width<400||canvas.height<200)throw Error('CANVAS_NOT_READY');
 // Downsample source for API payload safety, while using real rendered geometry.
 const output=document.createElement('canvas'),ratio=Math.min(1,1400/canvas.width,900/canvas.height);
 output.width=Math.round(canvas.width*ratio);output.height=Math.round(canvas.height*ratio);
 output.getContext('2d').drawImage(canvas,0,0,output.width,output.height);
 return output.toDataURL('image/png');
}
async function sha(s){if(!crypto?.subtle)return'N/A';const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(v=>v.toString(16).padStart(2,'0')).join('')}
function buildDialog(){
 if($('r1056VisualizationDialog'))return;
 const d=document.createElement('dialog');d.id='r1056VisualizationDialog';d.className='r1055-visualization r1056-visualization';
 d.innerHTML='<div class="r1055-visual-card"><header><h2 id="r1056Title"></h2><button id="r1056Close" type="button" aria-label="Close">×</button></header>'+
 '<section class="r1055-visual-preview"><img id="r1056Image" alt="Photorealistic result" hidden><p id="r1056Status"></p><small id="r1056Verification"></small></section>'+
 '<div class="r1055-visual-prompt"><strong id="r1056PromptLabel"></strong><textarea id="r1056Prompt" readonly aria-readonly="true" rows="5"></textarea>'+
 '<label id="r1056ExtraLabel" for="r1056Extra"></label><textarea id="r1056Extra" maxlength="2000" rows="3"></textarea>'+
 '<label id="r1056CodeLabel" for="r1056Code"></label><input id="r1056Code" type="password" autocomplete="off" placeholder="Owner access code">'+
 '<small id="r1056Snapshot"></small><button id="r1056Generate" type="button"></button></div></div>';
 document.body.appendChild(d);
 $('r1056Close').onclick=()=>d.close();
 d.onclick=e=>{if(e.target===d)d.close()};
 $('r1056Generate').onclick=()=>generate().catch(e=>statusMsg(e.message,true));
 $('r1056Extra').value=localStorage.getItem('bizet_visual_addendum_'+projectId())||'';
 $('r1056Extra').addEventListener('input',e=>localStorage.setItem('bizet_visual_addendum_'+projectId(),e.target.value));
 $('r1056Code').value=sessionStorage.getItem('bizet_visual_owner_code')||'';
 $('r1056Code').addEventListener('change',e=>sessionStorage.setItem('bizet_visual_owner_code',e.target.value));
}
function localize(){
 $('r1056Title').textContent=tx('Фотореалистичная визуализация','Photorealistic visualization','Фотореалістична візуалізація');
 $('r1056PromptLabel').textContent=tx('Инженерный промт · редактирование запрещено','Engineering prompt · read only','Інженерний промт · лише читання');
 $('r1056ExtraLabel').textContent=tx('Дополнительные пожелания (только декор, свет, атмосфера)','Additional requirements (mood, decor, atmosphere)','Додаткові побажання (декор, світло, атмосфера)');
 $('r1056Extra').placeholder=tx('Тёплый вечерний свет, минимальный декор…','Warm evening light, subtle decor…','Тепле вечірнє світло, мінімальний декор…');
 $('r1056CodeLabel').textContent=tx('Код доступа владельца · не является ключом API','Owner access code · not an API key','Код доступу власника · не є ключем API');
 $('r1056Generate').textContent=tx('Сгенерировать фотореалистичный рендер','Generate photorealistic render','Створити фотореалістичний рендер');
 $('r1056Verification').textContent=tx('AI-изображение не подтверждает инженерную точность и производство.','AI image is not proof of manufacturing precision.','AI-зображення не підтверджує виробничу точність.');
}
function statusMsg(msg,error=false){const s=$('r1056Status');if(!s)return;s.textContent=msg;s.classList.toggle('r1056-error',error)}
async function refresh(){
 const scene=snapshot(),serialized=JSON.stringify(scene),hash=await sha(serialized);
 lastSnapshot=hash;$('r1056Prompt').value=promptFor(scene);
 $('r1056Snapshot').textContent='Scene SHA-256: '+hash.slice(0,28)+'…';
 if(lastResult&&lastResultHash!==hash){
   $('r1056Image').hidden=true;
   statusMsg(tx('Изменения проекта: предыдущий результат устарел.','Scene changed: previous result is outdated.','Зміни проєкту: попередній результат застарів.'));
 }
 try{
   const r=await fetch('/api/v1.1/visualization/status',{cache:'no-store'});serverStatus=await r.json();
   if(!serverStatus.ready){
     statusMsg(tx('Генерация ожидает подключения провайдера и кода доступа в Render.','Generation needs a provider and owner access setup in Render.','Генерація очікує підключення провайдера та коду доступу в Render.'));
   }else if(!lastResult||lastResultHash!==hash){
     statusMsg(tx('Готово: инженерная сцена зафиксирована. Можно генерировать.','Ready: engineering scene captured. Generate when ready.','Готово: інженерну сцену зафіксовано. Можна генерувати.'));
   }
   $('r1056Generate').disabled=!serverStatus.ready||!scene;
 }catch(error){$('r1056Generate').disabled=true;statusMsg('PROVIDER_STATUS_UNAVAILABLE',true)}
}
async function generate(){
 if(!serverStatus?.ready)throw Error('PROVIDER_NOT_CONFIGURED');
 const scene=snapshot();if(!scene)throw Error('ENGINEERING_SCENE_NOT_READY');
 const sceneHash=await sha(JSON.stringify(scene)),reference=referenceCapture(),btn=$('r1056Generate');
 const code=$('r1056Code').value.trim();if(!code)throw Error('OWNER_ACCESS_CODE_REQUIRED');
 btn.disabled=true;statusMsg(tx('Генерация выполняется. Сцена зафиксирована.','Generating, engineering scene frozen.','Створюється зображення. Інженерну сцену зафіксовано.'));
 try{
   const res=await fetch('/api/v1.1/visualization/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Bizet-Visualization-Code':code},
     body:JSON.stringify({scene,reference_image:reference,additional_requirements:$('r1056Extra').value})});
   const out=await res.json();if(!res.ok)throw Error(out.detail||'IMAGE_PROVIDER_ERROR');
   const liveHash=await sha(JSON.stringify(snapshot()));
   if(liveHash!==sceneHash)throw Error('SCENE_CHANGED_DURING_RENDER_REFRESH_REQUIRED');
   $('r1056Image').src=out.image_data_url;$('r1056Image').hidden=false;lastResult=out;lastResultHash=sceneHash;
   statusMsg(tx('Фотореалистичная визуализация получена. Геометрия требует визуальной сверки.','Photorealistic result ready. Verify geometry visually.','Фотореалістичне зображення готове. Перевірте геометрію.'));
 }finally{btn.disabled=!serverStatus?.ready}
}
async function open(){buildDialog();localize();$('r1056VisualizationDialog').showModal();await refresh()}
window.BizetVisualizationR1056={open,refresh,snapshot,promptFor,referenceCapture,version:'10.5.6'};
document.addEventListener('click',event=>{
 const b=event.target.closest('#openVisualizationR1056,#openVisualizationTop,[data-panel="visualization"]');
 if(!b)return;if(b.tagName==='BUTTON'){event.preventDefault();event.stopImmediatePropagation()}
 open().catch(e=>{console.error(e);statusMsg(e.message,true)});
},true);
window.addEventListener('bizet:modelchange',()=>{if($('r1056VisualizationDialog')?.open)refresh()});
})();
