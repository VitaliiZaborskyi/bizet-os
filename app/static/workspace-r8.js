(()=> {
 const $=id=>document.getElementById(id), sleep=ms=>new Promise(r=>setTimeout(r,ms));
 let rt=null,history=[],locks=new Set(JSON.parse(localStorage.getItem('bizet_r8_locks')||'[]'));
 const projectId=new URLSearchParams(location.search).get('project')||sessionStorage.getItem('bizet_os_project_id')||localStorage.getItem('bizet_os_project_id')||'pilot';
 const VARIANT_KEY='bizet_r8_variant_slots_'+projectId,VARIANT_POS_KEY='bizet_r8_variant_pos_'+projectId;
 const VARIANT_TEMPLATES=[
   {reverse_wall_a:false,module_shift:0,upper_layout:'STANDARD',upper_opening:'HINGED',tall_group_flip:false},
   {reverse_wall_a:true,module_shift:0,upper_layout:'STANDARD',upper_opening:'LIFT',tall_group_flip:false},
   {reverse_wall_a:false,module_shift:1,upper_layout:'ANTRESOL',upper_opening:'HINGED',tall_group_flip:true},
   {reverse_wall_a:true,module_shift:1,upper_layout:'ANTRESOL',upper_opening:'LIFT',tall_group_flip:true},
   {reverse_wall_a:false,module_shift:2,upper_layout:'STANDARD',upper_opening:'LIFT',tall_group_flip:true}
 ];
 let variantSlots=[],variantPos=0;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const saveLocks=()=>localStorage.setItem('bizet_r8_locks',JSON.stringify([...locks]));
 const persistVariants=()=>{if(variantSlots.length===5){localStorage.setItem(VARIANT_KEY,JSON.stringify(variantSlots));localStorage.setItem(VARIANT_POS_KEY,String(variantPos))}};

 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function option(value,label){return '<option value="'+esc(value)+'">'+esc(label)+'</option>'}
 function field(label,key,choices){const current=rt.getInputs()[key];return '<label class="r8-field"><span>'+label+'</span><select data-input="'+key+'">'+choices.map(x=>option(x[0],x[1])).join('')+'</select></label>'}
 function numberField(label,key,def,min){const current=Number(rt.getInputs()[key]??def);return '<label class="r8-field"><span>'+label+'</span><input type="number" min="'+(min||0)+'" step="1" value="'+current+'" data-number="'+key+'"></label>'}
 function propagateLockedValue(key,value){
   if(variantSlots.length!==5)return;
   variantSlots.forEach(slot=>{slot.inputs={...(slot.inputs||{}),[key]:value}});
   persistVariants();
 }
 function bindInputs(){
   document.querySelectorAll('[data-input]').forEach(el=>{
     const key=el.dataset.input;
     if(!key.startsWith('__')){
       const v=rt.getInputs()[key];if(v!==undefined&&v!==null)el.value=String(v);
       el.onchange=async()=>{
         locks.add(key);saveLocks();let value=el.value;if(/^\d+$/.test(value))value=Number(value);
         propagateLockedValue(key,value);
         await commitInputs({[key]:value},'R8 editor: '+key);
       };
     }
   });
   document.querySelectorAll('[data-number]').forEach(el=>{
     const key=el.dataset.number;
     if(key.startsWith('__room_')){
       el.onchange=async()=>{
         const map={__room_length:'lengthMm',__room_depth:'depthMm',__room_height:'heightMm'};
         pushUndo();await rt.patchRoom(map[key],Math.round(Number(el.value)||0));updateReadiness();
       };
     }else if(!key.startsWith('__')){
       el.onchange=async()=>{
         const value=Math.round(Number(el.value)||0);
         locks.add(key);saveLocks();propagateLockedValue(key,value);
         await commitInputs({[key]:value},'R8 numeric: '+key);
       };
     }
   });
   document.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>runAction(el.dataset.action));
 }
 async function commitInputs(patch,reason){const top=$('editorPanel').scrollTop;pushUndo();await rt.patchInputs(patch,reason);updateReadiness();refreshPanel();requestAnimationFrame(()=>{$('editorPanel').scrollTop=top});saveCurrentVariantSlot();}
 async function commitVariant(patch){pushUndo();await rt.patchVariant(patch);updateReadiness();saveCurrentVariantSlot();}
 function pushUndo(){
   if(!rt)return;
   history.push({...clone(rt.captureWorkspaceState()),elements:[...rt.getElements()]});
   if(history.length>20)history.shift();
   $('undoButton').disabled=history.length===0;
 }
 async function undo(){
   const s=history.pop();if(!s)return;
   await rt.replaceState(s);saveCurrentVariantSlot();
   $('undoButton').disabled=history.length===0;refreshPanel();updateReadiness();
 }
 function panelTitle(panel){return({room:['01 · ПОМЕЩЕНИЕ','Помещение'],appliances:['02 · ТЕХНИКА','Бытовая техника'],upper:['03 · ВЕРХНИЕ МОДУЛИ','Верхние модули'],communications:['04 · КОММУНИКАЦИИ','Коммуникации'],elements:['05 · ЭЛЕМЕНТЫ СТЕН','Элементы стен'],materials:['06 · МАТЕРИАЛЫ','Материалы']})[panel]}
 let activePanel=null;
 function renderPanel(panel){
   activePanel=panel;const h=panelTitle(panel);$('panelKicker').textContent=h[0];$('panelTitle').textContent=h[1];let html='';
   const I=rt.getInputs(),C=rt.getContext();
   if(panel==='room'){
     const room=rt.getRoom(),importState=rt.getVisual().room_import||{};
     html='<section class="r8-section"><h3>Как задать помещение</h3><div class="r8-choice-row r10-room-source"><button data-action="room-source-manual">Ручной ввод</button><button data-action="room-source-scan">Скан</button><button data-action="room-source-file">Загрузить файл</button></div><input id="r10RoomFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.svg,.dxf,.dwg,image/*,application/pdf" hidden><p class="r10-room-import-status" id="r10RoomImportStatus">'+esc(importState.message||'Три входа приводятся к единой Room Model.')+'</p></section>';
     html+='<section class="r8-section"><h3>Геометрия</h3><div class="r8-two">'+numberField('Длина основной стены, мм','__room_length',room.lengthMm,1000)+numberField('Глубина помещения, мм','__room_depth',room.depthMm,1000)+'</div>'+numberField('Высота помещения, мм','__room_height',room.heightMm,2000)+'</section>';
     html+='<section class="r8-section r10-file-calibration" '+(importState.source==='FILE'?'':'hidden')+'><h3>Калибровка файла</h3><p>Укажите один известный реальный размер. После анализа BIZET OS пересчитает Room Model.</p><label class="r8-field"><span>Известный размер, мм</span><input id="r10KnownDimension" type="number" inputmode="numeric" min="300" step="1" value="'+esc(importState.known_dimension_mm||room.lengthMm)+'"></label><button class="r8-save" data-action="calibrate-import">Применить масштаб</button>'+(importState.status==='ROOM_MODEL_PREVIEW_READY'?'<button class="r8-secondary" data-action="confirm-import">Подтвердить помещение</button>':'')+'</section>';
     html+='<section class="r8-section"><h3>Потолок</h3>'+field('Тип потолка','ceiling',[['STRETCH_A','Натяжной — подготовленное основание'],['STRETCH_B','Готовый натяжной'],['GYPSUM','Гипсокартон'],['OPEN_GAP','Открытый зазор']])+'</section>';
   }
   if(panel==='appliances'){
     html='<section class="r8-section"><h3>Холодильник</h3>'+field('Наличие','fridge_present',[['YES','Да'],['NO','Нет']])+field('Сторона','fridge_side',[['LEFT','Слева'],['RIGHT','Справа']])+field('Тип','fridge_type',[['BUILT_IN','Встраиваемый'],['FREESTANDING','Отдельностоящий']])+field('Ширина','fridge_width_mm',[[600,'600 мм'],[900,'900 мм'],[1200,'1200 мм']])+'</section>';
     html+='<section class="r8-section"><h3>Мойка</h3>'+field('Сторона','sink_side',[['LEFT','Слева'],['RIGHT','Справа']])+field('Монтаж','sink_mount_type',[['TOP_MOUNT','Накладная'],['FLUSH','Вровень'],['UNDERMOUNT','Под столешницей']])+field('Чаш','sink_bowl_count',[[1,'1'],[2,'2']])+field('Измельчитель','sink_disposer',[['NO','Нет'],['YES','Да']])+field('Фильтры','sink_filters',[['NO','Нет'],['YES','Да']])+'</section>';
     html+='<section class="r8-section"><h3>Варочная / ПММ</h3>'+field('Варочная','cooktop_type',[['INDUCTION','Индукционная'],['ELECTRIC','Электрическая'],['GAS','Газовая'],['COMBINED','Комбинированная']])+field('Ширина варочной','cooktop_width_mm',[[600,'600 мм'],[300,'300 мм']])+field('Посудомоечная машина','dishwasher_type',[['NO','Нет'],['BUILT_IN','Встраиваемая'],['FREESTANDING','Отдельностоящая']])+field('Ширина ПММ','dishwasher_width_mm',[[450,'450 мм'],[600,'600 мм']])+'</section>';
     html+='<section class="r8-section"><h3>Вытяжка / духовка</h3>'+field('Вытяжка','hood_type',[['BUILT_IN','Встраиваемая'],['FREESTANDING','Отдельностоящая']])+field('Ширина вытяжки','hood_width_mm',[[500,'500 мм'],[600,'600 мм'],[800,'800 мм'],[900,'900 мм'],[1000,'1000 мм']])+field('Духовка','oven_location',[['LOWER','В нижнем модуле'],['TALL','В пенале']])+field('Микроволновка','microwave_present',[['NO','Нет'],['YES','Да']])+field('Кофемашина','coffee_present',[['NO','Нет'],['YES','Да']])+'</section>';
     const walls=rt.getConfiguration()==='L_LEFT'?[['A','Стена A'],['B','Стена B']]:rt.getConfiguration()==='L_RIGHT'?[['A','Стена A'],['C','Стена C']]:rt.getConfiguration()==='U_SHAPE'?[['A','Стена A'],['B','Стена B'],['C','Стена C']]:[['A','Стена A']];
     html+='<section class="r8-section"><h3>Дополнительные настройки техники</h3>'+field('Наполнение холодильника','fridge_content',[['FRIDGE_ONLY','Только холодильник'],['FREEZER_ONLY','Только морозильник'],['FRIDGE_FREEZER','Холодильник + морозильник']])+field('Положение мойки','sink_placement',[['AT_CORNER','От угла'],['OFFSET','Со смещением'],['LINEAR_PENDING','На прямом участке']])+numberField('Смещение мойки от угла, мм','sink_offset_mm',300,0)+field('Стена варочной панели','cooktop_wall',[['AUTO','Авто'],...walls])+field('Стена ПММ','dishwasher_wall',walls)+field('Тип встраиваемой вытяжки','hood_integrated_subtype',[['FULL','Полновстраиваемая'],['TELESCOPIC','Телескопическая']])+field('Стена духового шкафа','oven_wall',[['AUTO','Авто'],...walls])+'</section>';
     html+='<section class="r8-section"><h3>СВЧ / кофемашина</h3>'+field('Тип СВЧ','microwave_type',[['BUILT_IN','Встраиваемая 600×450'],['FREESTANDING','Отдельностоящая']])+field('Тип кофемашины','coffee_type',[['BUILT_IN','Встраиваемая 600×450'],['FREESTANDING','Отдельностоящая']])+field('Опора кофемашины','coffee_support',[['FIXED_SHELF','Обычная полка'],['PULLOUT_LOCKING','Выдвижная полка с фиксатором']])+field('Отделение кофемашины','coffee_compartment',[['OPEN','Открытое'],['CLOSED','Закрытое']])+field('Открывание фасада','coffee_front_opening',[['HINGED_LEFT','Петли слева'],['HINGED_RIGHT','Петли справа'],['LIFT_UP_HL','Вертикально вверх']])+'</section>';
     html+='<section class="r8-section r8-apply-section"><h3>Техника настроена?</h3><p>Примените выбранные параметры — BIZET OS перестроит модель с учётом техники.</p><button class="r8-save" data-action="apply-appliances">Применить</button></section>';
   }
   if(panel==='upper'){
     html='<section class="r8-section"><h3>Компоновка</h3>'+field('От столешницы до верха, мм','upper_gap_mm',[[550,'550'],[600,'600'],[650,'650'],[700,'700']])+'<div class="r8-choice-row"><button data-action="upper-standard">Один ряд</button><button data-action="upper-antresol">Антресоль</button><button data-action="upper-hinged">Распашной</button><button data-action="upper-lift">Подъёмный</button></div></section>';
   }
   if(panel==='communications'){
     html='<section class="r8-section"><h3>Система ожидает</h3><p>Канализация · вода · питание варочной · вытяжка · холодильник · духовка · розетки.</p>'+field('Статус координат','communications_status',[['PENDING_COORDINATE_DETAIL','Уточнить позже'],['USER_CONFIRMED','Проверено']])+'</section>';
   }
   if(panel==='elements'){
     html='<section class="r8-section"><h3>Добавить элемент стены</h3>'+field('Тип','__element_type',[['WINDOW','Окно'],['DOOR','Дверь'],['RADIATOR','Радиатор'],['CURTAIN_RECESS','Подшторник / карниз'],['NICHE','Ниша'],['COLUMN','Колонна'],['PROJECTION','Выступ'],['BEAM','Балка'],['OTHER','Другое']])+field('Стена','__element_wall',[['A','A'],['B','B'],['C','C'],['D','D']])+'<div class="r8-two">'+numberField('Ширина, мм','__element_width',900,100)+numberField('Высота, мм','__element_height',1200,100)+'</div>'+numberField('Глубина / выступ, мм','__element_depth',0,0)+'<div class="r8-two">'+numberField('От левого края, мм','__element_x',500,0)+numberField('От пола, мм','__element_z',900,0)+'</div><button class="r8-save" data-action="add-element">Добавить к модели</button></section><section class="r8-section"><h3>Добавлено</h3><div id="elementList"></div></section>';
   }
   if(panel==='materials'){
     const dir=rt.getVisual().r8_palette||C.visual_direction||'LIGHT';
     html='<section class="r8-section"><h3>Визуальное направление</h3><p>Выбрано на стартовом экране: <strong>'+esc(dir==='DARK'?'Тёмное':dir==='OTHER'?'Другое':'Светлое')+'</strong>.</p><div class="r8-choice-row"><button data-action="palette-light">Светлое</button><button data-action="palette-dark">Тёмное</button><button data-action="palette-other">Другое</button></div></section><section class="r8-section"><h3>Материалы и фурнитура</h3><p>В этом пилоте сохраняем направление и подтверждение. Каталоги конкретных декоров подключаются следующим слоем.</p><button class="r8-save" data-action="confirm-materials">Подтвердить текущий вариант</button></section>';
   }
   $('panelBody').innerHTML=html;bindInputs();
   if(panel==='room')bindRoomImport();
   if(panel==='elements')renderElements();
   $('editorPanel').hidden=false;
 }
 function classifyRoomFile(file){
   const ext=String(file?.name||'').split('.').pop().toLowerCase(),mime=String(file?.type||'').toLowerCase();
   if(mime==='application/pdf'||ext==='pdf')return'PDF';
   if(mime.startsWith('image/')||['jpg','jpeg','png','webp'].includes(ext))return'RASTER_IMAGE';
   if(ext==='svg')return'VECTOR_IMAGE';
   if(ext==='dxf')return'DXF';
   if(ext==='dwg')return'DWG';
   return'UNSUPPORTED';
 }
 async function roomImportApi(path,options={}){
   const r=await fetch(`/api/v1.1/projects/${encodeURIComponent(projectId)}/room-import/${path}`,options);
   const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.detail||'room_import_failed');return body;
 }
 function bindRoomImport(){
   const input=$('r10RoomFileInput');if(!input)return;
   input.onchange=async()=>{
     const file=input.files?.[0];if(!file)return;
     const kind=classifyRoomFile(file);
     if(!['PDF','RASTER_IMAGE'].includes(kind)){await rt.patchVisual({room_import:{source:'FILE',file_name:file.name,file_type:kind,status:'UNSUPPORTED',target_model:'ROOM_MODEL',message:'В R10.3.2 геометрию анализируем из PDF или фото.'}});refreshPanel();return}
     const status=$('r10RoomImportStatus');if(status)status.textContent='Анализирую геометрию…';
     try{
       const form=new FormData();form.append('file',file,file.name);
       const body=await roomImportApi('analyze',{method:'POST',body:form});
       await rt.patchVisual({room_import:body.room_import});
       refreshPanel();
     }catch(error){if(status)status.textContent='Ошибка анализа: '+error.message}
   };
 }
 function selectPanel(panel){
   rt?.exitFocus?.();
   document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.classList.toggle('is-active',b.dataset.panel===panel));
   renderPanel(panel);
   $('editorPanel').scrollTop=0;
 }
 function refreshPanel(){if(activePanel)renderPanel(activePanel)}
 function renderElements(){const n=$('elementList');if(!n)return;const els=rt.getElements();n.innerHTML=els.length?els.map((e,i)=>'<div class="r8-field"><span>'+(i+1)+'. '+esc(e.type)+' · стена '+esc(e.wall)+'</span><button class="r8-save" data-remove-element="'+i+'">Удалить</button></div>').join(''):'<p>Пока нет дополнительных элементов.</p>';n.querySelectorAll('[data-remove-element]').forEach(b=>b.onclick=async()=>{pushUndo();const a=[...rt.getElements()];a.splice(Number(b.dataset.removeElement),1);await rt.patchElements(a);renderElements();updateReadiness()})}
 async function runAction(a){
   if(a==='room-source-manual'){
     await rt.patchVisual({room_import:{source:'MANUAL',status:'ACTIVE',target_model:'ROOM_MODEL',message:'Ручной ввод активен. Все размеры записываются в единую Room Model.'}});refreshPanel();return;
   }
   if(a==='room-source-scan'){
     await rt.patchVisual({room_import:{source:'SCAN',status:'SCAN_CONNECTOR_REQUIRED',target_model:'ROOM_MODEL',message:'Скан помещения выбран. Коннектор сканирования подключается отдельным слоем; Room Model уже готова принять геометрию.'}});refreshPanel();return;
   }
   if(a==='room-source-file'){$('r10RoomFileInput')?.click();return}
   if(a==='calibrate-import'){
     const known=Math.round(Number($('r10KnownDimension')?.value)||0);
     if(known<300){$('r10RoomImportStatus').textContent='Укажите реальный размер не меньше 300 мм.';return}
     pushUndo();
     try{
       const body=await roomImportApi('calibrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({known_dimension_mm:known})});
       rt=window.BizetModelRuntime;await rt.resume?.();refreshPanel();updateReadiness();
       const size=body.room_import?.canonical_room_model?.bounding_size_mm||{};
       $('r10RoomImportStatus').textContent=`Room Model применена: ${size.length||'—'} × ${size.depth||'—'} мм. Подтвердите помещение.`;
     }catch(error){$('r10RoomImportStatus').textContent='Калибровка не применена: '+error.message}
     return;
   }
   if(a==='confirm-import'){
     try{await roomImportApi('confirm',{method:'POST'});await rt.resume?.();refreshPanel();updateReadiness()}catch(error){$('r10RoomImportStatus').textContent='Не удалось подтвердить: '+error.message}
     return;
   }
   if(a==='apply-appliances'){
     pushUndo();
     const value='USER_CONFIRMED';
     locks.add('appliances_confirmation_status');saveLocks();propagateLockedValue('appliances_confirmation_status',value);
     await rt.patchInputs({appliances_confirmation_status:value},'R8 appliances applied');
     saveCurrentVariantSlot();updateReadiness();selectPanel('upper');return;
   }
   if(a==='upper-standard')return commitVariant({upper_layout:'STANDARD'});
   if(a==='upper-antresol')return commitVariant({upper_layout:'ANTRESOL'});
   if(a==='upper-hinged')return commitVariant({upper_opening:'HINGED'});
   if(a==='upper-lift')return commitVariant({upper_opening:'LIFT'});
   if(a.startsWith('palette-')){const dir=a.split('-')[1].toUpperCase();pushUndo();await rt.setPalette(dir);updateReadiness();return}
   if(a==='confirm-materials'){pushUndo();await rt.patchVisual({materials_confirmation_status:'PILOT_CONFIRMED_DEFAULTS'});updateReadiness();return}
   if(a==='add-element'){
     const q=s=>document.querySelector(s),el={type:q('[data-input="__element_type"]').value,wall:q('[data-input="__element_wall"]').value,width_mm:Number(q('[data-number="__element_width"]').value)||900,height_mm:Number(q('[data-number="__element_height"]').value)||1200,depth_mm:Number(q('[data-number="__element_depth"]').value)||0,x_mm:Number(q('[data-number="__element_x"]').value)||0,z_mm:Number(q('[data-number="__element_z"]').value)||0};
     pushUndo();await rt.patchElements([...rt.getElements(),el]);renderElements();updateReadiness();return;
   }
 }
 function updateReadiness(){
   const I=rt.getInputs(),E=rt.getElements(),V=rt.getVisual();let score=24;
   if(I.ceiling)score+=8;if(I.fridge_present)score+=8;if(I.sink_mount_type)score+=8;if(I.cooktop_type)score+=8;if(I.dishwasher_type)score+=6;if(I.hood_type)score+=6;if(I.oven_location)score+=6;if(I.appliances_confirmation_status==='USER_CONFIRMED')score+=10;if(I.communications_status==='USER_CONFIRMED')score+=8;if(E.length)score+=4;if(V.materials_confirmation_status)score+=3;
   score=Math.min(100,score);$('readinessValue').textContent=score+'%';$('readinessBar').style.width=score+'%';
 }
 async function ensureTemplate(){
   const I=rt.getInputs(),patch={};
   const defaults={ceiling:'OPEN_GAP',fridge_present:'YES',fridge_side:'LEFT',fridge_type:'BUILT_IN',fridge_width_mm:600,sink_side:'LEFT',sink_mount_type:'TOP_MOUNT',sink_bowl_count:1,sink_disposer:'NO',sink_filters:'NO',sink_placement:'LINEAR_PENDING',cooktop_type:'INDUCTION',cooktop_width_mm:600,cooktop_wall:'AUTO',dishwasher_type:'NO',dishwasher_width_mm:600,hood_type:'BUILT_IN',hood_width_mm:600,oven_location:'LOWER',oven_wall:'AUTO',microwave_present:'NO',coffee_present:'NO',upper_gap_mm:600};
   Object.keys(defaults).forEach(k=>{if(I[k]===undefined||I[k]===null||I[k]==='')patch[k]=defaults[k]});if(Object.keys(patch).length)await rt.patchInputs(patch,'R8 base template');
 }
 function renderVariantDots(){
   const host=$('variantDots');if(!host)return;
   host.innerHTML=VARIANT_TEMPLATES.map((_,i)=>'<button class="r8-variant-dot'+(i===variantPos?' is-active':'')+'" type="button" data-variant-slot="'+i+'" aria-label="Вариант '+(i+1)+'" aria-pressed="'+(i===variantPos?'true':'false')+'"></button>').join('');
   host.querySelectorAll('[data-variant-slot]').forEach(btn=>btn.onclick=()=>applyVariant(Number(btn.dataset.variantSlot)));
 }
 function saveCurrentVariantSlot(){
   if(!rt||variantSlots.length!==5)return;
   variantSlots[variantPos]=clone(rt.captureWorkspaceState());
   persistVariants();renderVariantDots();
 }
 function buildVariantSlots(base){
   return VARIANT_TEMPLATES.map((template,i)=>{
     const state=clone(base);
     state.variant={...template};
     state.inputs={...(state.inputs||{})};
     if(!locks.has('fridge_side'))state.inputs.fridge_side=i%2?'RIGHT':'LEFT';
     if(!locks.has('sink_side')&&rt.getConfiguration().startsWith('L_'))state.inputs.sink_side=i%2?'RIGHT':'LEFT';
     return state;
   });
 }
 async function initVariantSlots(){
   const base=clone(rt.captureWorkspaceState());
   let stored=null;
   try{stored=JSON.parse(localStorage.getItem(VARIANT_KEY)||'null')}catch(_){}
   const pos=Math.max(0,Math.min(4,Number(localStorage.getItem(VARIANT_POS_KEY))||0));
   if(Array.isArray(stored)&&stored.length===5){
     variantSlots=stored;variantPos=pos;
     variantSlots[variantPos]=base;
   }else{
     variantSlots=buildVariantSlots(base);variantPos=0;
   }
   persistVariants();renderVariantDots();
 }
 async function applyVariant(index){
   if(!rt||index<0||index>4||index===variantPos)return;
   saveCurrentVariantSlot();
   variantPos=index;localStorage.setItem(VARIANT_POS_KEY,String(variantPos));renderVariantDots();
   await rt.applyWorkspaceState(clone(variantSlots[variantPos]),'R8 saved variant #'+(variantPos+1));
   updateReadiness();refreshPanel();renderVariantDots();
 }
 $('randomVariant').onclick=()=>applyVariant((variantPos+1)%5);
 $('undoButton').onclick=undo;
 $('baseInfoButton').onclick=()=>{$('baseInfoPopover').hidden=false};$('baseInfoClose').onclick=()=>{$('baseInfoPopover').hidden=true};
 $('panelClose').onclick=()=>{$('editorPanel').hidden=true;activePanel=null;document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.classList.remove('is-active'));requestAnimationFrame(()=>rt?.render?.())};
 document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.onclick=()=>selectPanel(b.dataset.panel));
 async function ready(){for(let i=0;i<100;i++){if(window.BizetModelRuntime?.ready){rt=window.BizetModelRuntime;break}await sleep(80)}if(!rt)return;await ensureTemplate();await initVariantSlots();updateReadiness();activePanel=null;$('editorPanel').hidden=true;document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.classList.remove('is-active'));requestAnimationFrame(()=>{rt.render();requestAnimationFrame(()=>rt.render())})}
 ready();
})();