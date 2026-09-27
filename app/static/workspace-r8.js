(()=> {
 const $=id=>document.getElementById(id), sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const LANG_KEY='bizet_os_language',uiLang=()=>String(localStorage.getItem(LANG_KEY)||document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru',tr=(ru,en)=>uiLang()==='en'?en:ru;
 const PROJECT_I18N={
   'Общие':'General','Как задать помещение':'How to define the room','Шаблон':'Template','Скан':'Scan','Загрузить файл':'Upload file',
   'Три входа приводятся к единой Room Model.':'All three methods create the same Room Model.','Геометрия':'Geometry',
   'Длина основной стены, мм':'Main wall length, mm','Глубина помещения, мм':'Room depth, mm','Высота помещения, мм':'Room height, mm','Высота цоколя, мм':'Plinth height, mm',
   'Поверхности помещения':'Room surfaces','Выберите тип и тестовый материал или загрузите свою текстуру.':'Choose a surface type and material, or upload your own texture.',
   'Пол':'Floor','Стены':'Walls','Потолок':'Ceiling','Не выбрано':'Not selected','Своя текстура':'Custom texture',
   'Калибровка файла':'File calibration','Укажите один известный реальный размер. После анализа BIZET OS пересчитает Room Model.':'Enter one known real dimension. BIZET OS will then rescale the Room Model.',
   'Известный размер, мм':'Known dimension, mm','Применить масштаб':'Apply scale','Подтвердить помещение':'Confirm room','Тип потолка':'Ceiling type',
   'Натяжной — подготовленное основание':'Prepared for stretch ceiling','Готовый натяжной':'Finished stretch ceiling','Гипсокартон':'Drywall','Открытый зазор':'Open gap',
   'Холодильник':'Refrigerator','Наличие':'Included','Да':'Yes','Нет':'No','Сторона':'Side','Слева':'Left','Справа':'Right','Тип':'Type',
   'Встраиваемый':'Built-in','Отдельностоящий':'Freestanding','Ширина':'Width','Мойка':'Sink','Монтаж':'Installation','Накладная':'Top-mount','Вровень':'Flush-mount','Под столешницей':'Undermount',
   'Чаш':'Bowls','Измельчитель':'Waste disposer','Фильтры':'Water filters','Варочная / ПММ':'Cooktop / dishwasher','Варочная':'Cooktop','Ширина варочной':'Cooktop width',
   'Индукционная':'Induction','Электрическая':'Electric','Газовая':'Gas','Комбинированная':'Combined','Посудомоечная машина':'Dishwasher','Ширина ПММ':'Dishwasher width',
   'Вытяжка / духовка':'Hood / oven','Вытяжка':'Hood','Ширина вытяжки':'Hood width','Духовка':'Oven','Ширина духовки':'Oven width','В нижнем модуле':'Base cabinet','В пенале':'Tall cabinet',
   'Микроволновка':'Microwave','Кофемашина':'Coffee machine','Дополнительные настройки техники':'Additional appliance settings',
   'Наполнение холодильника':'Refrigerator configuration','Только холодильник':'Refrigerator only','Только морозильник':'Freezer only','Холодильник + морозильник':'Refrigerator + freezer',
   'Положение мойки':'Sink position','От угла':'At corner','Со смещением':'Offset','На прямом участке':'Straight run','Смещение мойки от угла, мм':'Sink offset from corner, mm',
   'Стена варочной панели':'Cooktop wall','Стена ПММ':'Dishwasher wall','Авто':'Auto','Полновстраиваемая':'Fully integrated','Телескопическая':'Telescopic','Тип встраиваемой вытяжки':'Integrated hood type','Стена духового шкафа':'Oven wall',
   'Стена A':'Wall A','Стена B':'Wall B','Стена C':'Wall C','Стена D':'Wall D','Встраиваемая 600×450':'Built-in 600×450','Отдельностоящая':'Freestanding',
   'СВЧ / кофемашина':'Microwave / coffee machine','Тип СВЧ':'Microwave type','Тип кофемашины':'Coffee machine type','Опора кофемашины':'Coffee machine support',
   'Обычная полка':'Fixed shelf','Выдвижная полка с фиксатором':'Locking pull-out shelf','Отделение кофемашины':'Coffee machine compartment','Открытое':'Open','Закрытое':'Closed',
   'Открывание фасада':'Facade opening','Петли слева':'Left-hinged','Петли справа':'Right-hinged','Вертикально вверх':'Lift-up',
   'Техника настроена?':'Appliances ready?','Примените выбранные параметры — BIZET OS перестроит модель с учётом техники.':'Apply the selected parameters and BIZET OS will rebuild the model with the appliances included.','Применить':'Apply',
   'Настройка модулей':'Module settings','Параметры модулей':'Module dimensions','Общая высота нижних модулей, мм':'Overall base cabinet height, mm','Общая высота верхних модулей, мм':'Wall cabinet height, mm','Расстояние между нижними и верхними модулями, мм':'Clearance between base and wall cabinets, mm','Глубина нижних модулей, мм':'Base cabinet depth, mm','Глубина верхних модулей, мм':'Wall cabinet depth, mm','Высота цоколя меняет высоту корпуса, сохраняя общую высоту нижнего ряда.':'Changing plinth height changes carcass height while keeping the overall base-cabinet height fixed.','Компоновка':'Layout','От столешницы до низа верхних модулей, мм':'Countertop-to-wall-cabinet clearance, mm','Один ряд':'Single row','Антресоль':'Mezzanine','Распашной':'Hinged','Подъёмный':'Lift-up',
   'Система ожидает':'Required utility points','Канализация · вода · питание варочной · вытяжка · холодильник · духовка · розетки.':'Drainage · water · cooktop power · hood · refrigerator · oven · outlets.',
   'Статус координат':'Coordinates status','Уточнить позже':'Specify later','Проверено':'Confirmed',
   'Добавить элемент стены':'Add wall element','Окно':'Window','Дверь':'Door','Радиатор':'Radiator','Подшторник / карниз':'Curtain recess / track','Ниша':'Niche','Колонна':'Column','Выступ':'Projection','Балка':'Beam','Другое':'Other',
   'Стена':'Wall','Ширина, мм':'Width, mm','Высота, мм':'Height, mm','Глубина / выступ, мм':'Depth / projection, mm','От левого края, мм':'Offset from left edge, mm','От пола, мм':'Height above floor, mm',
   'Добавить к модели':'Add to model','Добавлено':'Added','Удалить':'Remove','Пока нет дополнительных элементов.':'No additional elements yet.',
   'Визуальное направление':'Visual direction','Выбрано на стартовом экране:':'Selected on the start screen:','Светлое':'Light','Тёмное':'Dark',
   'Материалы мебели':'Furniture materials','Тестовый набор для связки модель → спецификация → будущая визуализация.':'Pilot set linking the model → specification → future visualization.',
   'Фасады':'Facades','Корпус':'Carcass','Столешница':'Worktop','Подтверждение':'Confirmation','Подтвердить текущий вариант':'Confirm current selection',
   'Ручки':'Handles','Ручки и цоколь':'Handles and plinth','Распашные модули':'Hinged cabinets','Ящики':'Drawers','Вертикальные ручки':'Vertical handles','Горизонтальные ручки':'Horizontal handles',
   'Валюта отображения':'Display currency','Документы · тест':'Documents · test','Открыть BOM · TEST':'Open BOM · TEST','Чертежи для согласования · TEST':'Approval drawings · TEST',
   'Плитка':'Tile','Паркет':'Parquet','Ламинат':'Laminate','Микроцемент':'Microcement','Краска':'Paint','Штукатурка':'Plaster','Панели':'Panels','Натяжной':'Stretch ceiling','Плитный материал':'Board material','Древесный':'Wood finish','ЛДСП':'Laminated board','Камень':'Stone','Дерево':'Wood',
   'Песочная':'Sand','Светлый камень':'Light stone','Серая':'Grey','Тёплая':'Warm','Ясень':'Ash','Серый камень':'Grey stone','Дуб натуральный':'Natural oak','Дуб дымчатый':'Smoked oak','Ясень светлый':'Light ash','Дуб':'Oak','Серо-бежевый':'Greige','Тёмный':'Dark',
   'Тёплый':'Warm','Серый':'Grey','Светлый':'Light','Тёплый белый':'Warm white','Песочный':'Sand','Грейдж':'Greige','Графит':'Graphite','Белая':'White','Орех':'Walnut','Светлая':'Light','Матовый':'Matte','Сатин':'Satin','Белый':'White','Светло-серый':'Light grey','Айвори':'Ivory','Шалфей':'Sage','Чёрный':'Black'
 };
 const ui=value=>uiLang()==='en'?(PROJECT_I18N[String(value)]||String(value)):String(value);
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
 const MATERIAL_LIBRARY={
   floor:{title:'Пол',types:{
     TILE:{label:'Плитка',presets:[['TILE_SAND','Песочная','#d7c9ad'],['STONE_LIGHT','Светлый камень','#d1cec5'],['TILE_GREY','Серая','#aeb0ae']]},
     PARQUET:{label:'Паркет',presets:[['OAK_NATURAL','Дуб натуральный','#cbb58f'],['OAK_SMOKED','Дуб дымчатый','#8c7358'],['ASH_LIGHT','Ясень светлый','#d5c29f']]},
     LAMINATE:{label:'Ламинат',presets:[['LAMINATE_OAK','Дуб','#b99c72'],['LAMINATE_GREY','Серо-бежевый','#aaa59b'],['LAMINATE_DARK','Тёмный','#655b50']]},
     MICROCEMENT:{label:'Микроцемент',presets:[['CONCRETE_WARM','Тёплый','#bbb7ae'],['CONCRETE_GREY','Серый','#9d9e9c'],['CONCRETE_LIGHT','Светлый','#d0cec8']]}
   }},
   walls:{title:'Стены',types:{
     PAINT:{label:'Краска',presets:[['WARM_WHITE','Тёплый белый','#e9e5db'],['SAND','Песочный','#d9ccb7'],['GREIGE','Грейдж','#c9c4b9']]},
     TILE:{label:'Плитка',presets:[['STONE','Камень','#bebbb4'],['WALL_TILE_LIGHT','Светлая','#ddd8ce'],['WALL_TILE_GRAPHITE','Графит','#777775']]},
     PLASTER:{label:'Штукатурка',presets:[['PLASTER_WARM','Тёплая','#d2c6b5'],['PLASTER_GREY','Серая','#b2b0a9'],['PLASTER_WHITE','Белая','#e8e5de']]},
     PANEL:{label:'Панели',presets:[['PANEL_OAK','Дуб','#b69268'],['PANEL_WALNUT','Орех','#7a5b42'],['PANEL_LIGHT','Светлая','#d7cbb8']]}
   }},
   ceiling:{title:'Потолок',types:{
     PAINT:{label:'Краска',presets:[['CEILING_WHITE','Белый','#f1efe9'],['CEILING_WARM','Тёплый белый','#e8e1d4'],['CEILING_GREY','Светло-серый','#d0d0cd']]},
     STRETCH:{label:'Натяжной',presets:[['STRETCH_MATTE','Матовый','#efeee9'],['STRETCH_SATIN','Сатин','#e5e3dd'],['STRETCH_GREY','Серый','#c8c9c7']]},
     GYPSUM:{label:'Гипсокартон',presets:[['GYPSUM_WHITE','Белый','#eceae4'],['GYPSUM_WARM','Тёплый','#e2dbce'],['GYPSUM_GREY','Серый','#c9c9c5']]}
   }},
   facade:{title:'Фасады',types:{
     BOARD:{label:'Плитный материал',presets:[['IVORY','Айвори','#eee8dc'],['GRAPHITE','Графит','#45484c'],['SAGE','Шалфей','#aab49f']]},
     WOOD:{label:'Древесный',presets:[['OAK','Дуб','#c7a77e'],['WALNUT','Орех','#7a5b42'],['ASH','Ясень','#d1b58c']]}
   }},
   carcass:{title:'Корпус',types:{
     BOARD:{label:'ЛДСП',presets:[['WHITE','Белый','#e9e8e3'],['GREY','Серый','#a9abad'],['GRAPHITE','Графит','#505256'],['OAK','Дуб','#bd9b73']]}
   }},
   worktop:{title:'Столешница',types:{
     STONE:{label:'Камень',presets:[['LIGHT_STONE','Светлый камень','#c9c3b7'],['STONE','Серый камень','#77746e'],['BLACK','Чёрный','#242424']]},
     WOOD:{label:'Дерево',presets:[['OAK','Дуб','#9d7851'],['WALNUT_TOP','Орех','#6c4c37'],['ASH_TOP','Ясень','#b89a74']]}
   }}
 };
 let materialPickerDraft=null;

 let variantSlots=[],variantPos=0;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const saveLocks=()=>localStorage.setItem('bizet_r8_locks',JSON.stringify([...locks]));
 const persistVariants=()=>{if(variantSlots.length===5){localStorage.setItem(VARIANT_KEY,JSON.stringify(variantSlots));localStorage.setItem(VARIANT_POS_KEY,String(variantPos))}};

 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function localizeWorkspaceChrome(){
   const en=uiLang()==='en';document.documentElement.lang=en?'en':'ru';
   const nav={
     room:['Помещение','Room'],appliances:['Техника','Appliances'],upper:['Настройка модулей','Module settings'],
     communications:['Коммуникации','Utilities'],elements:['Элементы стен','Wall elements'],materials:['Материалы','Materials'],general:['Общие','General']
   };
   document.querySelectorAll('#workspaceTools [data-panel]').forEach(btn=>{
     const pair=nav[btn.dataset.panel];if(!pair)return;
     const n=btn.querySelector('span')?.textContent||'';btn.innerHTML='<span>'+esc(n)+'</span>'+esc(en?pair[1]:pair[0]);
   });
   const toolsLabel=document.querySelector('.r8-tools-label');if(toolsLabel)toolsLabel.textContent=tr('Настройки проекта','Project settings');
   const stripLabel=document.querySelector('.r8-module-strip-label');if(stripLabel)stripLabel.textContent=tr('Список модулей','Module list');
   const random=$('randomVariant');if(random)random.textContent=tr('Другой вариант','Another variant');
   const focusHead=document.querySelector('.r10-focus-variants-head');if(focusHead)focusHead.textContent=tr('Варианты модуля','Module variants');
   const settingsTitle=document.querySelector('.settings-title');if(settingsTitle)settingsTitle.textContent=tr('Настройки','Settings');
   const themeLabel=document.querySelector('.settings-field>span');if(themeLabel)themeLabel.textContent=tr('Тема','Theme');
   const theme=$('workspaceThemeSelect');if(theme){
     const light=theme.querySelector('option[value="light"]'),dark=theme.querySelector('option[value="dark"]');
     if(light)light.textContent=tr('Светлая','Light');if(dark)dark.textContent=tr('Тёмная','Dark');
   }
   const projectState=document.querySelector('.r8-project-state>span');if(projectState)projectState.textContent=tr('Базовый вариант','Base variant');
   const baseInfo=$('baseInfoButton');if(baseInfo)baseInfo.setAttribute('aria-label',tr('О базовом варианте','About base variant'));
   const panelClose=$('panelClose');if(panelClose)panelClose.setAttribute('aria-label',tr('Свернуть','Collapse'));
   const basePopover=$('baseInfoPopover');
   if(basePopover){
     const strong=basePopover.querySelector('strong'),p=basePopover.querySelector('p');
     if(strong)strong.textContent=tr('Базовый вариант','Base variant');
     if(p)p.textContent=tr('Сформирован автоматически по выбранной конфигурации, размерам помещения и уже известным системе данным. Уточняйте параметры — модель будет перестраиваться.','Generated from the selected configuration, room dimensions and current project data. Adjust parameters and the model will rebuild.');
   }
   const materialClose=$('surfaceMaterialClose');if(materialClose)materialClose.setAttribute('aria-label',tr('Закрыть','Close'));
   const materialTypeLabel=$('surfaceMaterialType')?.closest('label')?.querySelector('span');if(materialTypeLabel)materialTypeLabel.textContent=tr('Тип','Type');
   const customTexture=$('surfaceTextureInput')?.closest('label')?.querySelector('span');if(customTexture)customTexture.textContent=tr('Своя текстура','Custom texture');
   if($('surfaceMaterialCancel'))$('surfaceMaterialCancel').textContent=tr('Отмена','Cancel');
   if($('surfaceMaterialApply'))$('surfaceMaterialApply').textContent=tr('Применить','Apply');
 }
 function option(value,label){return '<option value="'+esc(value)+'">'+esc(ui(label))+'</option>'}
 function field(label,key,choices){const current=rt.getInputs()[key];return '<label class="r8-field"><span>'+esc(ui(label))+'</span><select data-input="'+key+'">'+choices.map(x=>option(x[0],x[1])).join('')+'</select></label>'}
 function numberField(label,key,def,min){const current=Number(rt.getInputs()[key]??def);return '<label class="r8-field"><span>'+esc(ui(label))+'</span><input type="number" min="'+(min||0)+'" step="1" value="'+current+'" data-number="'+key+'"></label>'}
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
   const undoButton=$('undoButton');if(undoButton)undoButton.disabled=history.length===0;
 }
 async function undo(){
   const s=history.pop();if(!s)return;
   await rt.replaceState(s);saveCurrentVariantSlot();
   const undoButton=$('undoButton');if(undoButton)undoButton.disabled=history.length===0;refreshPanel();updateReadiness();
 }
 function panelTitle(panel){
   const map={
     room:[tr('01 · ПОМЕЩЕНИЕ','01 · ROOM'),tr('Помещение','Room')],
     appliances:[tr('02 · ТЕХНИКА','02 · APPLIANCES'),tr('Бытовая техника','Appliances')],
     upper:[tr('03 · НАСТРОЙКА МОДУЛЕЙ','03 · MODULE SETTINGS'),tr('Настройка модулей','Module settings')],
     communications:[tr('04 · КОММУНИКАЦИИ','04 · UTILITIES'),tr('Коммуникации','Utilities')],
     elements:[tr('05 · ЭЛЕМЕНТЫ СТЕН','05 · WALL ELEMENTS'),tr('Элементы стен','Wall elements')],
     materials:[tr('06 · МАТЕРИАЛЫ','06 · MATERIALS'),tr('Материалы','Materials')],
     general:[tr('07 · ОБЩИЕ','07 · GENERAL'),tr('Общие настройки','General settings')]
   };return map[panel]
 }
 function materialState(target){
   const V=rt.getVisual(),room=V.room_surface_materials||{},furniture=V.furniture_materials||{};
   return target==='floor'||target==='walls'||target==='ceiling'?{...(room[target]||{})}:{...(furniture[target]||{})};
 }
 function materialLabel(target){
   const lib=MATERIAL_LIBRARY[target],state=materialState(target);
   if(!lib)return ui('Не выбрано');
   if(state.preset==='CUSTOM')return state.custom_texture_name||ui('Своя текстура');
   for(const type of Object.values(lib.types)){
     const found=type.presets.find(p=>p[0]===state.preset);
     if(found)return ui(found[1]);
   }
   return ui('Не выбрано');
 }
 function materialButton(target){
   const lib=MATERIAL_LIBRARY[target];
   return '<button type="button" data-material-target="'+target+'">'+esc(ui(lib.title))+'<strong>'+esc(materialLabel(target))+'</strong></button>';
 }
 function renderMaterialPicker(){
   if(!materialPickerDraft)return;
   const lib=MATERIAL_LIBRARY[materialPickerDraft.target],typeKey=materialPickerDraft.type||Object.keys(lib.types)[0],type=lib.types[typeKey];
   materialPickerDraft.type=typeKey;
   $('surfaceMaterialTitle').textContent=ui(lib.title);
   $('surfaceMaterialType').innerHTML=Object.entries(lib.types).map(([key,v])=>'<option value="'+key+'" '+(key===typeKey?'selected':'')+'>'+esc(ui(v.label))+'</option>').join('');
   $('surfaceMaterialSwatches').innerHTML=type.presets.map(([id,label,color])=>'<button class="r104-material-swatch '+(materialPickerDraft.preset===id?'is-selected':'')+'" type="button" data-material-preset="'+id+'" style="--swatch:'+color+'"><strong>'+esc(ui(label))+'</strong></button>').join('');
   $('surfaceMaterialSwatches').querySelectorAll('[data-material-preset]').forEach(btn=>btn.onclick=()=>{
     materialPickerDraft={...materialPickerDraft,preset:btn.dataset.materialPreset,custom_texture_data_url:'',custom_texture_name:''};
     renderMaterialPicker();
   });
   const status=$('surfaceTextureStatus');
   if(status)status.textContent=materialPickerDraft.custom_texture_name||tr('JPG / PNG / WEBP · до 1.5 MB','JPG / PNG / WEBP · up to 1.5 MB');
 }
 function openMaterialPicker(target){
   const lib=MATERIAL_LIBRARY[target];if(!lib)return;
   const current=materialState(target),defaultType=Object.keys(lib.types)[0];
   let type=current.type&&lib.types[current.type]?current.type:defaultType;
   if(current.preset&&current.preset!=='CUSTOM'){
     for(const [key,value] of Object.entries(lib.types))if(value.presets.some(p=>p[0]===current.preset))type=key;
   }
   materialPickerDraft={target,type,preset:current.preset||lib.types[type].presets[0][0],custom_texture_name:current.custom_texture_name||'',custom_texture_data_url:current.custom_texture_data_url||''};
   renderMaterialPicker();
   const dialog=$('surfaceMaterialDialog');if(dialog&&!dialog.open)dialog.showModal();
 }
 async function applyMaterialPicker(){
   if(!materialPickerDraft)return;
   const target=materialPickerDraft.target,V=rt.getVisual(),value={type:materialPickerDraft.type,preset:materialPickerDraft.preset,custom_texture_name:materialPickerDraft.custom_texture_name||'',custom_texture_data_url:materialPickerDraft.custom_texture_data_url||''};
   pushUndo();
   if(target==='floor'||target==='walls'||target==='ceiling'){
     await rt.patchVisual({room_surface_materials:{...(V.room_surface_materials||{}),[target]:value}});
   }else{
     await rt.patchVisual({furniture_materials:{...(V.furniture_materials||{}),[target]:value}});
   }
   materialPickerDraft=null;$('surfaceMaterialDialog')?.close();refreshPanel();saveCurrentVariantSlot();
 }
 function bindMaterialTargets(){
   document.querySelectorAll('[data-material-target]').forEach(btn=>btn.onclick=()=>openMaterialPicker(btn.dataset.materialTarget));
 }
 function localizePanelBody(){
   if(uiLang()!=='en')return;
   const root=$('panelBody');if(!root)return;
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
   nodes.forEach(node=>{
     const raw=node.nodeValue||'',trim=raw.trim();if(!trim)return;
     const translated=PROJECT_I18N[trim];if(translated)node.nodeValue=raw.replace(trim,translated);
   });
 }
 let activePanel=null;
 function renderPanel(panel){
   activePanel=panel;const h=panelTitle(panel);$('panelKicker').textContent=h[0];$('panelTitle').textContent=h[1];let html='';
   const I=rt.getInputs(),C=rt.getContext();
   if(panel==='room'){
     const room=rt.getRoom(),importState=rt.getVisual().room_import||{};
     html='<section class="r8-section"><h3>Как задать помещение</h3><div class="r8-choice-row r10-room-source"><button data-action="room-source-manual">Шаблон</button><button data-action="room-source-scan">Скан</button><button data-action="room-source-file">Загрузить файл</button></div><input id="r10RoomFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.svg,.dxf,.dwg,image/*,application/pdf" hidden><p class="r10-room-import-status" id="r10RoomImportStatus">'+esc(importState.message||'Три входа приводятся к единой Room Model.')+'</p></section>';
     html+='<section class="r8-section"><h3>Геометрия</h3><div class="r8-two">'+numberField('Длина основной стены, мм','__room_length',room.lengthMm,1000)+numberField('Глубина помещения, мм','__room_depth',room.depthMm,1000)+'</div>'+numberField('Высота помещения, мм','__room_height',room.heightMm,2000)+'</section>';
     html+='<section class="r8-section"><h3>Поверхности помещения</h3><p>Выберите тип и тестовый материал или загрузите свою текстуру.</p><div class="r104-surface-buttons">'+materialButton('floor')+materialButton('walls')+materialButton('ceiling')+'</div></section>';
     html+='<section class="r8-section r10-file-calibration" '+(importState.source==='FILE'?'':'hidden')+'><h3>Калибровка файла</h3><p>Укажите один известный реальный размер. После анализа BIZET OS пересчитает Room Model.</p><label class="r8-field"><span>Известный размер, мм</span><input id="r10KnownDimension" type="number" inputmode="numeric" min="300" step="1" value="'+esc(importState.known_dimension_mm||room.lengthMm)+'"></label><button class="r8-save" data-action="calibrate-import">Применить масштаб</button>'+(importState.status==='ROOM_MODEL_PREVIEW_READY'?'<button class="r8-secondary" data-action="confirm-import">Подтвердить помещение</button>':'')+'</section>';
     html+='<section class="r8-section"><h3>Потолок</h3>'+field('Тип потолка','ceiling',[['STRETCH_A','Натяжной — подготовленное основание'],['STRETCH_B','Готовый натяжной'],['GYPSUM','Гипсокартон'],['OPEN_GAP','Открытый зазор']])+'</section>';
   }
   if(panel==='appliances'){
     html='<section class="r8-section"><h3>Холодильник</h3>'+field('Наличие','fridge_present',[['YES','Да'],['NO','Нет']])+field('Сторона','fridge_side',[['LEFT','Слева'],['RIGHT','Справа']])+field('Тип','fridge_type',[['BUILT_IN','Встраиваемый'],['FREESTANDING','Отдельностоящий']])+field('Ширина','fridge_width_mm',[[600,'600 мм'],[900,'900 мм'],[1200,'1200 мм']])+'</section>';
     html+='<section class="r8-section"><h3>Мойка</h3>'+field('Сторона','sink_side',[['LEFT','Слева'],['RIGHT','Справа']])+field('Монтаж','sink_mount_type',[['TOP_MOUNT','Накладная'],['FLUSH','Вровень'],['UNDERMOUNT','Под столешницей']])+field('Чаш','sink_bowl_count',[[1,'1'],[2,'2']])+field('Измельчитель','sink_disposer',[['NO','Нет'],['YES','Да']])+field('Фильтры','sink_filters',[['NO','Нет'],['YES','Да']])+'</section>';
     html+='<section class="r8-section"><h3>Варочная / ПММ</h3>'+field('Варочная','cooktop_type',[['INDUCTION','Индукционная'],['ELECTRIC','Электрическая'],['GAS','Газовая'],['COMBINED','Комбинированная']])+field('Ширина варочной','cooktop_width_mm',[[600,'600 мм'],[300,'300 мм']])+field('Посудомоечная машина','dishwasher_type',[['NO','Нет'],['BUILT_IN','Встраиваемая'],['FREESTANDING','Отдельностоящая']])+field('Ширина ПММ','dishwasher_width_mm',[[450,'450 мм'],[600,'600 мм']])+'</section>';
     html+='<section class="r8-section"><h3>Вытяжка / духовка</h3>'+field('Вытяжка','hood_type',[['BUILT_IN','Встраиваемая'],['FREESTANDING','Отдельностоящая']])+field('Ширина вытяжки','hood_width_mm',[[500,'500 мм'],[600,'600 мм'],[800,'800 мм'],[900,'900 мм'],[1000,'1000 мм']])+field('Духовка','oven_location',[['LOWER','В нижнем модуле'],['TALL','В пенале']])+field('Ширина духовки','oven_width_mm',[[600,'600 мм'],[900,'900 мм']])+field('Микроволновка','microwave_present',[['NO','Нет'],['YES','Да']])+field('Кофемашина','coffee_present',[['NO','Нет'],['YES','Да']])+'</section>';
     const walls=rt.getConfiguration()==='L_LEFT'?[['A','Стена A'],['B','Стена B']]:rt.getConfiguration()==='L_RIGHT'?[['A','Стена A'],['C','Стена C']]:rt.getConfiguration()==='U_SHAPE'?[['A','Стена A'],['B','Стена B'],['C','Стена C']]:[['A','Стена A']];
     html+='<section class="r8-section"><h3>Дополнительные настройки техники</h3>'+field('Наполнение холодильника','fridge_content',[['FRIDGE_ONLY','Только холодильник'],['FREEZER_ONLY','Только морозильник'],['FRIDGE_FREEZER','Холодильник + морозильник']])+field('Положение мойки','sink_placement',[['AT_CORNER','От угла'],['OFFSET','Со смещением'],['LINEAR_PENDING','На прямом участке']])+numberField('Смещение мойки от угла, мм','sink_offset_mm',300,0)+field('Стена варочной панели','cooktop_wall',[['AUTO','Авто'],...walls])+field('Стена ПММ','dishwasher_wall',walls)+field('Тип встраиваемой вытяжки','hood_integrated_subtype',[['FULL','Полновстраиваемая'],['TELESCOPIC','Телескопическая']])+field('Стена духового шкафа','oven_wall',[['AUTO','Авто'],...walls])+'</section>';
     html+='<section class="r8-section"><h3>СВЧ / кофемашина</h3>'+field('Тип СВЧ','microwave_type',[['BUILT_IN','Встраиваемая 600×450'],['FREESTANDING','Отдельностоящая']])+field('Тип кофемашины','coffee_type',[['BUILT_IN','Встраиваемая 600×450'],['FREESTANDING','Отдельностоящая']])+field('Опора кофемашины','coffee_support',[['FIXED_SHELF','Обычная полка'],['PULLOUT_LOCKING','Выдвижная полка с фиксатором']])+field('Отделение кофемашины','coffee_compartment',[['OPEN','Открытое'],['CLOSED','Закрытое']])+field('Открывание фасада','coffee_front_opening',[['HINGED_LEFT','Петли слева'],['HINGED_RIGHT','Петли справа'],['LIFT_UP_HL','Вертикально вверх']])+'</section>';
     html+='<section class="r8-section r8-apply-section"><h3>Техника настроена?</h3><p>Примените выбранные параметры — BIZET OS перестроит модель с учётом техники.</p><button class="r8-save" data-action="apply-appliances">Применить</button></section>';
   }
   if(panel==='upper'){
     html='<section class="r8-section"><h3>Параметры модулей</h3><div class="r104-general-grid">'
       +numberField('Общая высота нижних модулей, мм','lower_total_height_mm',900,650)
       +numberField('Общая высота верхних модулей, мм','upper_height_mm',1000,220)
       +numberField('Расстояние между нижними и верхними модулями, мм','upper_gap_mm',600,300)
       +numberField('Глубина нижних модулей, мм','lower_depth_mm',560,300)
       +numberField('Глубина верхних модулей, мм','upper_depth_mm',320,200)
       +numberField('Высота цоколя, мм','plinth_height_mm',100,0)
       +'</div><p>Высота цоколя меняет высоту корпуса, сохраняя общую высоту нижнего ряда.</p></section>';
   }
   if(panel==='communications'){
     html='<section class="r8-section"><h3>Система ожидает</h3><p>Канализация · вода · питание варочной · вытяжка · холодильник · духовка · розетки.</p>'+field('Статус координат','communications_status',[['PENDING_COORDINATE_DETAIL','Уточнить позже'],['USER_CONFIRMED','Проверено']])+'</section>';
   }
   if(panel==='elements'){
     html='<section class="r8-section"><h3>Добавить элемент стены</h3>'+field('Тип','__element_type',[['WINDOW','Окно'],['DOOR','Дверь'],['RADIATOR','Радиатор'],['CURTAIN_RECESS','Подшторник / карниз'],['NICHE','Ниша'],['COLUMN','Колонна'],['PROJECTION','Выступ'],['BEAM','Балка'],['OTHER','Другое']])+field('Стена','__element_wall',[['A','A'],['B','B'],['C','C'],['D','D']])+'<div class="r8-two">'+numberField('Ширина, мм','__element_width',900,100)+numberField('Высота, мм','__element_height',1200,100)+'</div>'+numberField('Глубина / выступ, мм','__element_depth',0,0)+'<div class="r8-two">'+numberField('От левого края, мм','__element_x',500,0)+numberField('От пола, мм','__element_z',900,0)+'</div><button class="r8-save" data-action="add-element">Добавить к модели</button></section><section class="r8-section"><h3>Добавлено</h3><div id="elementList"></div></section>';
   }
   if(panel==='materials'){
     const dir=rt.getVisual().r8_palette||C.visual_direction||'LIGHT';
     html='<section class="r8-section"><h3>Визуальное направление</h3><p>Выбрано на стартовом экране: <strong>'+esc(dir==='DARK'?'Тёмное':dir==='OTHER'?'Другое':'Светлое')+'</strong>.</p><div class="r8-choice-row"><button data-action="palette-light">Светлое</button><button data-action="palette-dark">Тёмное</button><button data-action="palette-other">Другое</button></div></section>';
     html+='<section class="r8-section"><h3>Материалы мебели</h3><p>Тестовый набор для связки модель → спецификация → будущая визуализация.</p><div class="r104-surface-buttons">'+materialButton('facade')+materialButton('carcass')+materialButton('worktop')+'</div></section>';
     html+='<section class="r8-section"><h3>Подтверждение</h3><button class="r8-save" data-action="confirm-materials">Подтвердить текущий вариант</button></section>';
   }
   if(panel==='general'){
     html='<section class="r8-section"><h3>Ручки</h3><div class="r104-general-grid">'
       +field('Распашные модули','hinged_handle_orientation',[['VERTICAL','Вертикальные ручки'],['HORIZONTAL','Горизонтальные ручки']])
       +field('Ящики','drawer_handle_orientation',[['HORIZONTAL','Горизонтальные ручки'],['VERTICAL','Вертикальные ручки']])
       +field('Валюта отображения','display_currency',[['UAH','UAH'],['EUR','EUR'],['USD','USD'],['AUD','AUD']])
       +'</div></section>';
     html+='<section class="r8-section"><h3>Документы · тест</h3><div class="r104-test-actions"><button class="r8-secondary" data-action="bom-test">Открыть BOM · TEST</button><button class="r8-secondary" data-action="approval-test">Чертежи для согласования · TEST</button></div></section>';
   }
   $('panelBody').innerHTML=html;localizePanelBody();bindInputs();bindMaterialTargets();
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
     const status=$('r10RoomImportStatus');if(status)status.textContent=tr('Анализирую геометрию…','Analyzing geometry…');
     try{
       const form=new FormData();form.append('file',file,file.name);
       const body=await roomImportApi('analyze',{method:'POST',body:form});
       await rt.patchVisual({room_import:body.room_import});
       refreshPanel();
     }catch(error){if(status)status.textContent=tr('Ошибка анализа: ','Analysis error: ')+error.message}
   };
 }
 function selectPanel(panel){
   rt?.exitFocus?.();
   document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.classList.toggle('is-active',b.dataset.panel===panel));
   renderPanel(panel);
   $('editorPanel').scrollTop=0;
 }
 function refreshPanel(){if(activePanel)renderPanel(activePanel)}
 function renderElements(){const n=$('elementList');if(!n)return;const els=rt.getElements();n.innerHTML=els.length?els.map((e,i)=>'<div class="r8-field"><span>'+(i+1)+'. '+esc(e.type)+' · '+tr('стена','wall')+' '+esc(e.wall)+'</span><button class="r8-save" data-remove-element="'+i+'">'+tr('Удалить','Remove')+'</button></div>').join(''):'<p>'+tr('Пока нет дополнительных элементов.','No additional elements yet.')+'</p>';n.querySelectorAll('[data-remove-element]').forEach(b=>b.onclick=async()=>{pushUndo();const a=[...rt.getElements()];a.splice(Number(b.dataset.removeElement),1);await rt.patchElements(a);renderElements();updateReadiness()})}
 async function runAction(a){
   if(a==='room-source-manual'){
     await rt.patchVisual({room_import:{source:'TEMPLATE',status:'ACTIVE',target_model:'ROOM_MODEL',message:'Шаблон активен. Размеры уточняются в параметрах помещения.'}});refreshPanel();return;
   }
   if(a==='room-source-scan'){
     const status=$('r10RoomImportStatus');if(status)status.textContent=tr('Скан — в стадии разработки.','Scan is in development.');return;
   }
   if(a==='room-source-file'){$('r10RoomFileInput')?.click();return}
   if(a==='calibrate-import'){
     const known=Math.round(Number($('r10KnownDimension')?.value)||0);
     if(known<300){$('r10RoomImportStatus').textContent=tr('Укажите реальный размер не меньше 300 мм.','Enter a real dimension of at least 300 mm.');return}
     pushUndo();
     try{
       const body=await roomImportApi('calibrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({known_dimension_mm:known})});
       rt=window.BizetModelRuntime;await rt.resume?.();refreshPanel();updateReadiness();
       const size=body.room_import?.canonical_room_model?.bounding_size_mm||{};
       $('r10RoomImportStatus').textContent=tr(`Room Model применена: ${size.length||'—'} × ${size.depth||'—'} мм. Подтвердите помещение.`,`Room Model applied: ${size.length||'—'} × ${size.depth||'—'} mm. Confirm the room.`);
     }catch(error){$('r10RoomImportStatus').textContent=tr('Калибровка не применена: ','Calibration was not applied: ')+error.message}
     return;
   }
   if(a==='confirm-import'){
     try{await roomImportApi('confirm',{method:'POST'});await rt.resume?.();refreshPanel();updateReadiness()}catch(error){$('r10RoomImportStatus').textContent=tr('Не удалось подтвердить: ','Could not confirm: ')+error.message}
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
   if(a==='bom-test'){window.BizetPointB?.showBOMTest?.();return}
   if(a==='approval-test'){window.BizetPointB?.openApprovalDrawings?.();return}
   if(a==='add-element'){
     const q=s=>document.querySelector(s),el={type:q('[data-input="__element_type"]').value,wall:q('[data-input="__element_wall"]').value,width_mm:Number(q('[data-number="__element_width"]').value)||900,height_mm:Number(q('[data-number="__element_height"]').value)||1200,depth_mm:Number(q('[data-number="__element_depth"]').value)||0,x_mm:Number(q('[data-number="__element_x"]').value)||0,z_mm:Number(q('[data-number="__element_z"]').value)||0};
     pushUndo();await rt.patchElements([...rt.getElements(),el]);renderElements();updateReadiness();return;
   }
 }
 function updateReadiness(){ /* R10.3.4: no visible project-readiness UI. */ }
 async function ensureTemplate(){
   const I=rt.getInputs(),patch={};
   const defaults={ceiling:'OPEN_GAP',plinth_height_mm:100,lower_total_height_mm:900,upper_height_mm:1000,lower_depth_mm:560,upper_depth_mm:320,hinged_handle_orientation:'VERTICAL',drawer_handle_orientation:'HORIZONTAL',display_currency:'UAH',oven_width_mm:600,fridge_present:'YES',fridge_side:'LEFT',fridge_type:'BUILT_IN',fridge_width_mm:600,sink_side:'LEFT',sink_mount_type:'TOP_MOUNT',sink_bowl_count:1,sink_disposer:'NO',sink_filters:'NO',sink_placement:'LINEAR_PENDING',cooktop_type:'INDUCTION',cooktop_width_mm:600,cooktop_wall:'AUTO',dishwasher_type:'NO',dishwasher_width_mm:600,hood_type:'BUILT_IN',hood_width_mm:600,oven_location:'LOWER',oven_wall:'AUTO',microwave_present:'NO',coffee_present:'NO',upper_gap_mm:600};
   Object.keys(defaults).forEach(k=>{if(I[k]===undefined||I[k]===null||I[k]==='')patch[k]=defaults[k]});if(Object.keys(patch).length)await rt.patchInputs(patch,'R8 base template');
 }
 function renderVariantDots(){
   const host=$('variantDots');if(!host)return;
   host.innerHTML=VARIANT_TEMPLATES.map((_,i)=>'<button class="r8-variant-dot'+(i===variantPos?' is-active':'')+'" type="button" data-variant-slot="'+i+'" aria-label="'+tr('Вариант ','Variant ')+(i+1)+'" aria-pressed="'+(i===variantPos?'true':'false')+'"></button>').join('');
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
 window.addEventListener('bizet:projectsettingchange',event=>{
   const detail=event.detail||{};
   if(detail.key==='display_currency')propagateLockedValue('display_currency',detail.value);
 });
 window.addEventListener('bizet:languagechange',()=>{
   localizeWorkspaceChrome();
   if(activePanel)renderPanel(activePanel);
   const materialDialog=$('surfaceMaterialDialog');
   if(materialDialog?.open&&materialPickerDraft)renderMaterialPicker();
   renderVariantDots();updateReadiness();
   rt?.render?.();
   window.BizetPointB?.refresh?.();window.BizetOwnerBusiness?.refresh?.();
 });
 $('surfaceMaterialClose')?.addEventListener('click',()=>{materialPickerDraft=null;$('surfaceMaterialDialog')?.close()});
 $('surfaceMaterialCancel')?.addEventListener('click',()=>{materialPickerDraft=null;$('surfaceMaterialDialog')?.close()});
 $('surfaceMaterialApply')?.addEventListener('click',()=>applyMaterialPicker().catch(error=>alert(error.message)));
 $('surfaceMaterialType')?.addEventListener('change',event=>{
   if(!materialPickerDraft)return;
   const type=event.target.value,lib=MATERIAL_LIBRARY[materialPickerDraft.target];
   materialPickerDraft={...materialPickerDraft,type,preset:lib.types[type].presets[0][0],custom_texture_name:'',custom_texture_data_url:''};
   renderMaterialPicker();
 });
 $('surfaceTextureInput')?.addEventListener('change',event=>{
   const file=event.target.files?.[0];if(!file||!materialPickerDraft)return;
   const status=$('surfaceTextureStatus');
   if(file.size>1572864){if(status)status.textContent=tr('Файл больше 1.5 MB — выберите меньший.','File is larger than 1.5 MB — choose a smaller file.');event.target.value='';return}
   const reader=new FileReader();
   reader.onload=()=>{materialPickerDraft={...materialPickerDraft,preset:'CUSTOM',custom_texture_name:file.name,custom_texture_data_url:String(reader.result||'')};renderMaterialPicker()};
   reader.onerror=()=>{if(status)status.textContent=tr('Не удалось прочитать текстуру.','Could not read the texture.')};
   reader.readAsDataURL(file);
 });
 $('baseInfoButton').onclick=()=>{$('baseInfoPopover').hidden=false};$('baseInfoClose').onclick=()=>{$('baseInfoPopover').hidden=true};
 $('panelClose').onclick=()=>{$('editorPanel').hidden=true;activePanel=null;document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.classList.remove('is-active'));requestAnimationFrame(()=>rt?.render?.())};
 document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.onclick=()=>selectPanel(b.dataset.panel));
 async function ready(){localizeWorkspaceChrome();for(let i=0;i<100;i++){if(window.BizetModelRuntime?.ready){rt=window.BizetModelRuntime;break}await sleep(80)}if(!rt)return;await ensureTemplate();await initVariantSlots();updateReadiness();activePanel=null;$('editorPanel').hidden=true;document.querySelectorAll('#workspaceTools [data-panel]').forEach(b=>b.classList.remove('is-active'));requestAnimationFrame(()=>{rt.render();requestAnimationFrame(()=>rt.render())})}
 ready();
})();