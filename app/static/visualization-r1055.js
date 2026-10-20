/* BIZET OS 10.5.5 #32 — locked canonical visualization request.
   No image-generation provider is connected. Never fabricate photorealistic output. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),KEY='bizet_os_language';
 const lang=()=>{const l=String(localStorage.getItem(KEY)||'ua').toLowerCase();return l==='en'?'en':l==='ru'?'ru':'ua'};
 const label=(ru,en,ua)=>lang()==='en'?en:lang()==='ua'?ua:ru;
 const projectId=()=>new URLSearchParams(location.search).get('project')||localStorage.getItem('bizet_os_project_id')||'pilot';
 const esc=v=>String(v??'');
 const fields=['fridge_type','fridge_present','fridge_width_mm','dishwasher_type','dishwasher_width_mm','sink_bowl_count','sink_mount_type','oven_location','oven_width_mm','oven_height_mm','cooktop_type','cooktop_width_mm','hood_type','hood_width_mm','microwave_present','coffee_present','lighting_enabled','lighting_upper_inside','lighting_lower_inside','lighting_kelvin','handle_system','gola_system'];
 const material=(o)=>({type:o?.type||null,preset:o?.preset||null,custom_texture_name:o?.custom_texture_name||null,custom_texture_data_url:o?.custom_texture_data_url||null});
 function snapshot(){
   const rt=window.BizetModelRuntime;
   if(!rt?.ready)return null;
   const I=rt.getInputs?.()||{},V=rt.getVisual?.()||{},R=rt.getRoom?.()||{},mods=rt.getModules?.()||[];
   return{
     project_id:projectId(),source:'BIZET_CANONICAL_PILOT_SCENE',source_version:'R10.5.5',configuration:rt.getConfiguration?.()||null,
     room_geometry_mm:{length:R.lengthMm,depth:R.depthMm,height:R.heightMm},
     room_elements:rt.getElements?.()||[],
     modules:mods.map(m=>({id:m.id,kind:m.kind,wall:m.wall,x_mm:m.x,y_mm:m.y,z_mm:m.z,width_mm:m.w,depth_mm:m.d,height_mm:m.h,facades:m.facade_count,facade_openings:m.facade_openings||null,shelves:m.shelf_count||0,doors:m.opening,handle_type:m.handle_type,handle_override_mode:m.handle_override_mode||null,material:m.material||null})),
     surfaces:{floor:material(V.room_surface_materials?.floor),walls:material(V.room_surface_materials?.walls),ceiling:material(V.room_surface_materials?.ceiling)},
     furniture:{facade:material(V.furniture_materials?.facade),carcass:material(V.furniture_materials?.carcass),worktop:material(V.furniture_materials?.worktop)},
     appliance_and_lighting:Object.fromEntries(fields.filter(k=>I[k]!==undefined).map(k=>[k,I[k]])),
     visual_settings:{palette:V.r8_palette||null,room:V.room_surface_materials||null},
     strict:'Do not add, delete, displace, resize or substitute any recorded architectural or furniture item; user style addendum cannot override this scene descriptor.'
   };
 }
 function promptFor(d){
   if(!d)return label('Инженерная модель ещё загружается.','Engineering model is loading.','Інженерна модель ще завантажується.');
   return[
     'BIZET OS / LOCKED ENGINEERING VISUALIZATION PROMPT v10.5.5',
     'Create a physically plausible photorealistic interior photograph strictly reproducing the engineering scene below.',
     'Preserve exactly: room dimensions, walls/openings, cabinet count/order, positions, widths/heights/depths, doors and opening sides, countertops, worktop joints, plinth, lighting, all appliances and material/texture identities.',
     'Do not improvise, omit, distort, shift, redesign, recolor or add functional furniture. Do not invent appliance brands. Respect actual custom textures as image reference data, not just a material name.',
     'Decorative objects are allowed only when not concealing geometry, limiting access, or changing engineering facts. Appearance must not override the source geometry. Lighting Kelvin reflects the selected inputs.',
     'A text prompt alone cannot guarantee pixel-exact geometry. A real provider must receive geometry-grounded reference images and validate output; these data are not manufacturing instructions.',
     'CANONICAL_SCENE_DESCRIPTOR_JSON:',
     JSON.stringify(d,null,2),
     'USER_ADDENDUM_FOLLOWS_AS_NONSTRUCTURAL_STYLE_REQUIREMENTS_ONLY.'
   ].join('\n\n');
 }
 async function digest(text){
   if(!crypto?.subtle)return'NOT_AVAILABLE';
   const bytes=new TextEncoder().encode(text),raw=await crypto.subtle.digest('SHA-256',bytes);
   return Array.from(new Uint8Array(raw)).map(b=>b.toString(16).padStart(2,'0')).join('');
 }
 let currentHash='',lastGenerated=null;
 async function refresh(){
   const data=snapshot(),prompt=promptFor(data);
   if($('r1055LockedPrompt'))$('r1055LockedPrompt').value=prompt;
   currentHash=await digest(JSON.stringify(data));
   const stamp=$('r1055Snapshot');
   if(stamp)stamp.textContent='Scene SHA-256: '+currentHash.slice(0,20)+'…';
   const notice=$('r1055VizStatus');
   if(notice)notice.textContent=label('Фотореалистичный рендер недоступен: провайдер генерации пока не подключён. Защищённый промт готов.','Photorealistic render unavailable: the generation provider is not connected. Locked prompt is ready.','Фотореалістичний рендер недоступний: провайдер генерації ще не підключений. Захищений промт готовий.');
   const stale=$('r1055RenderStale');
   if(stale){stale.hidden=!lastGenerated||lastGenerated.sceneHash===currentHash}
   const btn=$('r1055Generate');
   if(btn){btn.disabled=true;btn.title=label('Провайдер не подключён','No render provider connected','Провайдер не підключений')}
 }
 function buildDialog(){
   if($('r1055VisualizationDialog'))return;
   const dlg=document.createElement('dialog');dlg.id='r1055VisualizationDialog';dlg.className='r1055-visualization';
   dlg.innerHTML='<section class="r1055-visual-card">'+
      '<header><h2 id="r1055VizTitle"></h2><button type="button" id="r1055VizClose" aria-label="Close">×</button></header>'+
      '<div class="r1055-visual-preview" aria-live="polite"><div id="r1055VizStatus"></div><div id="r1055RenderStale" hidden></div></div>'+
      '<div class="r1055-visual-prompt"><strong id="r1055LockedLabel"></strong><textarea id="r1055LockedPrompt" readonly aria-readonly="true" rows="8"></textarea>'+
      '<label id="r1055AddendumLabel" for="r1055Addendum"></label><textarea id="r1055Addendum" rows="3" maxlength="2500"></textarea>'+
      '<small id="r1055Snapshot"></small><button id="r1055Generate" type="button" disabled></button></div></section>';
   document.body.appendChild(dlg);
   $('r1055VizClose').onclick=()=>dlg.close();
   dlg.onclick=e=>{if(e.target===dlg)dlg.close()};
   $('r1055Addendum').value=localStorage.getItem('bizet_visual_addendum_'+projectId())||'';
   $('r1055Addendum').addEventListener('input',e=>localStorage.setItem('bizet_visual_addendum_'+projectId(),e.target.value));
 }
 function localize(){
   if(!$('r1055VisualizationDialog'))return;
   $('r1055VizTitle').textContent=label('Фотореалистичная визуализация','Photorealistic visualization','Фотореалістична візуалізація');
   $('r1055LockedLabel').textContent=label('Базовый системный промт (нельзя изменить)','Locked base prompt (read only)','Базовий системний промт (лише читання)');
   $('r1055AddendumLabel').textContent=label('Дополнительные пожелания','Additional visualization requirements','Додаткові побажання');
   $('r1055Addendum').placeholder=label('Например: вечерний свет и небольшой декор без изменения конструкции','For example: evening light and decor without changing furniture','Наприклад: вечірнє світло й декор без зміни конструкції');
   $('r1055Generate').textContent=label('Создать фотореалистичный рендер','Generate photorealistic render','Створити фотореалістичний рендер');
   $('r1055RenderStale').textContent=label('Рендер устарел после изменения проекта','Render outdated after project change','Рендер застарів після зміни проєкту');
 }
 async function open(){buildDialog();localize();await refresh();$('r1055VisualizationDialog').showModal()}
 window.BizetVisualizationR1055={open,refresh,snapshot,promptFor,version:'10.5.5',providerStatus:'NOT_CONFIGURED'};
 window.addEventListener('bizet:modelchange',()=>{if($('r1055VisualizationDialog')?.open)refresh()});
 window.addEventListener('bizet:languagechange',()=>{localize();if($('r1055VisualizationDialog')?.open)refresh()});
})();
