(()=> {
 const $=id=>document.getElementById(id), sleep=ms=>new Promise(r=>setTimeout(r,ms));
 let rt=null,history=[],historyIndex=0,locks=new Set(JSON.parse(localStorage.getItem('bizet_r8_locks')||'[]'));
 const saveLocks=()=>localStorage.setItem('bizet_r8_locks',JSON.stringify([...locks]));
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function option(value,label){return '<option value="'+esc(value)+'">'+esc(label)+'</option>'}
 function field(label,key,choices){const current=rt.getInputs()[key];return '<label class="r8-field"><span>'+label+'</span><select data-input="'+key+'">'+choices.map(x=>option(x[0],x[1])).join('')+'</select></label>'}
 function numberField(label,key,def,min){const current=Number(rt.getInputs()[key]??def);return '<label class="r8-field"><span>'+label+'</span><input type="number" min="'+(min||0)+'" step="1" value="'+current+'" data-number="'+key+'"></label>'}
 function bindInputs(){
   document.querySelectorAll('[data-input]').forEach(el=>{const key=el.dataset.input;if(!key.startsWith('__')){const v=rt.getInputs()[key];if(v!==undefined&&v!==null)el.value=String(v);el.onchange=async()=>{locks.add(key);saveLocks();let value=el.value;if(/^\d+$/.test(value))value=Number(value);await commitInputs({[key]:value},'R8 editor: '+key)}}});
   document.querySelectorAll('[data-number]').forEach(el=>{const key=el.dataset.number;if(key.startsWith('__room_')){el.onchange=async()=>{const map={__room_length:'lengthMm',__room_depth:'depthMm',__room_height:'heightMm'};pushUndo();await rt.patchRoom(map[key],Math.round(Number(el.value)||0));updateReadiness()}}else if(!key.startsWith('__')){el.onchange=async()=>{locks.add(key);saveLocks();await commitInputs({[key]:Math.round(Number(el.value)||0)},'R8 numeric: '+key)}}});
   document.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>runAction(el.dataset.action));
 }
 async function commitInputs(patch,reason){pushUndo();await rt.patchInputs(patch,reason);updateReadiness();refreshPanel();}
 async function commitVariant(patch){pushUndo();await rt.patchVariant(patch);updateReadiness();}
 function pushUndo(){history.push({inputs:{...rt.getInputs()},variant:{...rt.getVariant()},elements:[...rt.getElements()]});if(history.length>20)history.shift();$('undoButton').disabled=history.length===0}
 async function undo(){const s=history.pop();if(!s)return;await rt.replaceState(s);$('undoButton').disabled=history.length===0;refreshPanel();updateReadiness()}
 function panelTitle(panel){return({room:['01 · ПОМЕЩЕНИЕ','Помещение'],appliances:['02 · ТЕХНИКА','Бытовая техника'],upper:['03 · ВЕРХНИЕ МОДУЛИ','Верхние модули'],communications:['04 · КОММУНИКАЦИИ','Коммуникации'],elements:['05 · ЭЛЕМЕНТЫ СТЕН','Элементы стен'],materials:['06 · МАТЕРИАЛЫ','Материалы']})[panel]}
 let activePanel='room';
 function renderPanel(panel){
   activePanel=panel;const h=panelTitle(panel);$('panelKicker').textContent=h[0];$('panelTitle').textContent=h[1];let html='';
   const I=rt.getInputs(),C=rt.getContext();
   if(panel==='room'){
     const room=rt.getRoom();
     html='<section class="r8-section"><h3>Геометрия</h3><div class="r8-two">'+numberField('Длина основной стены, мм','__room_length',room.lengthMm,1000)+numberField('Глубина помещения, мм','__room_depth',room.depthMm,1000)+'</div>'+numberField('Высота помещения, мм','__room_height',room.heightMm,2000)+'</section>';
     html+='<section class="r8-section"><h3>Потолок</h3>'+field('Тип потолка','ceiling',[['STRETCH_A','Натяжной — подготовленное основание'],['STRETCH_B','Готовый натяжной'],['GYPSUM','Гипсокартон'],['OPEN_GAP','Открытый зазор']])+'</section>';
   }
   if(panel==='appliances'){
     html='<section class="r8-section"><h3>Холодильник</h3>'+field('Наличие','fridge_present',[['YES','Да'],['NO','Нет']])+field('Сторона','fridge_side',[['LEFT','Слева'],['RIGHT','Справа']])+field('Тип','fridge_type',[['BUILT_IN','Встраиваемый'],['FREESTANDING','Отдельностоящий']])+field('Ширина','fridge_width_mm',[[600,'600 мм'],[900,'900 мм'],[1200,'1200 мм']])+'</section>';
     html+='<section class="r8-section"><h3>Мойка</h3>'+field('Сторона','sink_side',[['LEFT','Слева'],['RIGHT','Справа']])+field('Монтаж','sink_mount_type',[['TOP_MOUNT','Накладная'],['FLUSH','Вровень'],['UNDERMOUNT','Под столешницей']])+field('Чаш','sink_bowl_count',[[1,'1'],[2,'2']])+field('Измельчитель','sink_disposer',[['NO','Нет'],['YES','Да']])+field('Фильтры','sink_filters',[['NO','Нет'],['YES','Да']])+'</section>';
     html+='<section class="r8-section"><h3>Варочная / ПММ</h3>'+field('Варочная','cooktop_type',[['INDUCTION','Индукционная'],['ELECTRIC','Электрическая'],['GAS','Газовая'],['COMBINED','Комбинированная']])+field('Ширина варочной','cooktop_width_mm',[[600,'600 мм'],[300,'300 мм']])+field('Посудомоечная машина','dishwasher_type',[['BUILT_IN','Встраиваемая'],['FREESTANDING','Отдельностоящая']])+field('Ширина ПММ','dishwasher_width_mm',[[450,'450 мм'],[600,'600 мм']])+'</section>';
     html+='<section class="r8-section"><h3>Вытяжка / духовка</h3>'+field('Вытяжка','hood_type',[['BUILT_IN','Встраиваемая'],['FREESTANDING','Отдельностоящая']])+field('Ширина вытяжки','hood_width_mm',[[500,'500 мм'],[600,'600 мм'],[800,'800 мм'],[900,'900 мм'],[1000,'1000 мм']])+field('Духовка','oven_location',[['LOWER','В нижнем модуле'],['TALL','В пенале']])+field('Микроволновка','microwave_present',[['NO','Нет'],['YES','Да']])+field('Кофемашина','coffee_present',[['NO','Нет'],['YES','Да']])+'</section>';
   }
   if(panel==='upper'){
     html='<section class="r8-section"><h3>Компоновка</h3>'+field('От столешницы до верха, мм','upper_gap_mm',[[550,'550'],[600,'600'],[650,'650'],[700,'700']])+'<div class="r8-choice-row"><button data-action="upper-standard">Один ряд</button><button data-action="upper-antresol">Антресоль</button><button data-action="upper-hinged">Распашной</button><button data-action="upper-lift">Подъёмный</button></div></section>';
   }
   if(panel==='communications'){
     html='<section class="r8-section"><h3>Система ожидает</h3><p>Канализация · вода · питание варочной · вытяжка · холодильник · духовка · розетки.</p>'+field('Статус координат','communications_status',[['PENDING_COORDINATE_DETAIL','Уточнить позже'],['USER_CONFIRMED','Проверено']])+'</section>';
   }
   if(panel==='elements'){
     html='<section class="r8-section"><h3>Добавить элемент стены</h3>'+field('Тип','__element_type',[['WINDOW','Окно'],['DOOR','Дверь'],['RADIATOR','Радиатор'],['CURTAIN_RECESS','Подшторник / карниз'],['NICHE','Ниша'],['COLUMN','Колонна'],['PROJECTION','Выступ'],['BEAM','Балка'],['OTHER','Другое']])+field('Стена','__element_wall',[['A','A'],['B','B'],['C','C'],['D','D']])+'<div class="r8-two">'+numberField('Ширина, мм','__element_width',900,100)+numberField('Высота, мм','__element_height',1200,100)+'</div><div class="r8-two">'+numberField('От левого края, мм','__element_x',500,0)+numberField('От пола, мм','__element_z',900,0)+'</div><button class="r8-save" data-action="add-element">Добавить к модели</button></section><section class="r8-section"><h3>Добавлено</h3><div id="elementList"></div></section>';
   }
   if(panel==='materials'){
     const dir=C.visual_direction||'LIGHT';
     html='<section class="r8-section"><h3>Визуальное направление</h3><p>Выбрано на стартовом экране: <strong>'+esc(dir==='DARK'?'Тёмное':dir==='OTHER'?'Другое':'Светлое')+'</strong>.</p><div class="r8-choice-row"><button data-action="palette-light">Светлое</button><button data-action="palette-dark">Тёмное</button><button data-action="palette-other">Другое</button></div></section><section class="r8-section"><h3>Материалы и фурнитура</h3><p>В этом пилоте сохраняем направление и подтверждение. Каталоги конкретных декоров подключаются следующим слоем.</p><button class="r8-save" data-action="confirm-materials">Подтвердить текущий вариант</button></section>';
   }
   $('panelBody').innerHTML=html;bindInputs();
   if(panel==='elements')renderElements();
   $('editorPanel').hidden=false;
 }
 function refreshPanel(){renderPanel(activePanel)}
 function renderElements(){const n=$('elementList');if(!n)return;const els=rt.getElements();n.innerHTML=els.length?els.map((e,i)=>'<div class="r8-field"><span>'+(i+1)+'. '+esc(e.type)+' · стена '+esc(e.wall)+'</span><button class="r8-save" data-remove-element="'+i+'">Удалить</button></div>').join(''):'<p>Пока нет дополнительных элементов.</p>';n.querySelectorAll('[data-remove-element]').forEach(b=>b.onclick=async()=>{pushUndo();const a=[...rt.getElements()];a.splice(Number(b.dataset.removeElement),1);await rt.patchElements(a);renderElements();updateReadiness()})}
 async function runAction(a){
   if(a==='upper-standard')return commitVariant({upper_layout:'STANDARD'});
   if(a==='upper-antresol')return commitVariant({upper_layout:'ANTRESOL'});
   if(a==='upper-hinged')return commitVariant({upper_opening:'HINGED'});
   if(a==='upper-lift')return commitVariant({upper_opening:'LIFT'});
   if(a.startsWith('palette-')){const dir=a.split('-')[1].toUpperCase();pushUndo();await rt.setPalette(dir);updateReadiness();return}
   if(a==='confirm-materials'){pushUndo();await rt.patchVisual({materials_confirmation_status:'PILOT_CONFIRMED_DEFAULTS'});updateReadiness();return}
   if(a==='add-element'){
     const q=s=>document.querySelector(s),el={type:q('[data-input="__element_type"]').value,wall:q('[data-input="__element_wall"]').value,width_mm:Number(q('[data-number="__element_width"]').value)||900,height_mm:Number(q('[data-number="__element_height"]').value)||1200,x_mm:Number(q('[data-number="__element_x"]').value)||0,z_mm:Number(q('[data-number="__element_z"]').value)||0};
     pushUndo();await rt.patchElements([...rt.getElements(),el]);renderElements();updateReadiness();return;
   }
 }
 function updateReadiness(){
   const I=rt.getInputs(),E=rt.getElements(),V=rt.getVisual();let score=24;
   if(I.ceiling)score+=8;if(I.fridge_present)score+=10;if(I.sink_mount_type)score+=10;if(I.cooktop_type)score+=10;if(I.dishwasher_type)score+=8;if(I.hood_type)score+=8;if(I.oven_location)score+=7;if(I.communications_status==='USER_CONFIRMED')score+=8;if(E.length)score+=4;if(V.materials_confirmation_status)score+=3;
   score=Math.min(100,score);$('readinessValue').textContent=score+'%';$('readinessBar').style.width=score+'%';
 }
 async function ensureTemplate(){
   const I=rt.getInputs(),patch={};
   const defaults={ceiling:'OPEN_GAP',fridge_present:'YES',fridge_side:'LEFT',fridge_type:'BUILT_IN',fridge_width_mm:600,sink_side:'LEFT',sink_mount_type:'TOP_MOUNT',sink_bowl_count:1,sink_disposer:'NO',sink_filters:'NO',cooktop_type:'INDUCTION',cooktop_width_mm:600,dishwasher_type:'BUILT_IN',dishwasher_width_mm:600,hood_type:'BUILT_IN',hood_width_mm:600,oven_location:'LOWER',microwave_present:'NO',coffee_present:'NO',upper_gap_mm:600};
   Object.keys(defaults).forEach(k=>{if(I[k]===undefined||I[k]===null||I[k]==='')patch[k]=defaults[k]});if(Object.keys(patch).length)await rt.patchInputs(patch,'R8 base template');
 }
 async function generateVariant(){
   const C=rt.getConfiguration(),I=rt.getInputs(),seq=(historyIndex+1)%4;historyIndex=seq;
   const v=[{reverse_wall_a:false,module_shift:0,upper_layout:'STANDARD',upper_opening:'HINGED'},{reverse_wall_a:true,module_shift:0,upper_layout:'STANDARD',upper_opening:'LIFT'},{reverse_wall_a:false,module_shift:1,upper_layout:'ANTRESOL',upper_opening:'HINGED'},{reverse_wall_a:true,module_shift:2,upper_layout:'ANTRESOL',upper_opening:'LIFT'}][seq];
   const patch={};if(!locks.has('fridge_side'))patch.fridge_side=seq%2?'RIGHT':'LEFT';if(!locks.has('sink_side')&&C.startsWith('L_'))patch.sink_side=seq%2?'RIGHT':'LEFT';
   pushUndo();if(Object.keys(patch).length)await rt.patchInputs(patch,'R8 generated variant');await rt.patchVariant(v);
   const sig=JSON.stringify({v,patch});let idx=variantHistory.findIndex(x=>x.sig===sig);if(idx<0){variantHistory.push({sig,state:{v,patch}});idx=variantHistory.length-1}variantPos=idx;syncVariantCounter();updateReadiness();
 }
 const variantHistory=[{sig:'base',state:{}}];let variantPos=0;
 function syncVariantCounter(){$('variantCounter').textContent=(variantPos+1)+' / '+variantHistory.length}
 $('randomVariant').onclick=()=>generateVariant();
 $('prevVariant').onclick=()=>{if(variantPos>0){variantPos--;syncVariantCounter()}};
 $('nextVariant').onclick=()=>{if(variantPos<variantHistory.length-1){variantPos++;syncVariantCounter()}};
 $('undoButton').onclick=undo;
 $('baseInfoButton').onclick=()=>{$('baseInfoPopover').hidden=false};$('baseInfoClose').onclick=()=>{$('baseInfoPopover').hidden=true};
 $('panelClose').onclick=()=>{$('editorPanel').hidden=true};
 document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.onclick=()=>{document.querySelectorAll('#workspaceTools button').forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');renderPanel(b.dataset.panel)});
 async function ready(){for(let i=0;i<100;i++){if(window.BizetModelRuntime?.ready){rt=window.BizetModelRuntime;break}await sleep(80)}if(!rt)return;await ensureTemplate();updateReadiness();renderPanel('room');syncVariantCounter()}
 ready();
})();