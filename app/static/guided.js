(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const CONFIG_KEY='bizet_pilot_configuration';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  const stage=params.get('stage')||'ceiling';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  const configuration=sessionStorage.getItem(CONFIG_KEY)||localStorage.getItem(CONFIG_KEY)||'WALL_CENTER';
  const wallMap={WALL_CENTER:['A'],WALL_LEFT:['A'],WALL_RIGHT:['A'],L_LEFT:['A','B'],L_RIGHT:['A','C'],U_SHAPE:['A','B','C'],CUSTOM:[]};
  const activeWalls=wallMap[configuration]||['A'];
  let project=null;
  let visual={};
  let inputs={};
  let busy=false;

  const choice=(value,label,symbol,note='')=>({value,label,symbol,note});
  const contentChoices=[
    choice('FRIDGE_ONLY','Только холодильник','❄','Цельный фасад'),
    choice('FREEZER_ONLY','Только морозильник','▣','Цельный фасад'),
    choice('FRIDGE_FREEZER','Холодильник + морозильник','◫','Комбинированное наполнение')
  ];

  const definitions={
    ceiling:{title:'Выберите подход к потолку',subtitle:'Выберите вариант примыкания мебели к потолку. Картинки добавим после утверждения логики.',choices:[
      choice('STRETCH_A','Натяжной — подготовленное основание','⌂'),choice('STRETCH_B','Готовый натяжной потолок','▱'),choice('GYPSUM','Гипсокартонный потолок','□'),choice('OPEN_GAP','Открытый зазор / не до потолка','↕')
    ]},
    'fridge-present':{title:'Укажите, будет ли холодильник',subtitle:'Если холодильник не участвует в композиции, BIZET OS полностью исключит его из текущего сценария.',choices:[choice('YES','Да','✓'),choice('NO','Нет','×')]},
    'fridge-side':{title:'Выберите положение холодильника',subtitle:'Холодильник ставится на одном из крайних краёв композиции.',choices:[choice('LEFT','Крайний слева','←'),choice('RIGHT','Крайний справа','→')]},
    'fridge-type':{title:'Выберите тип холодильника',subtitle:'Тип влияет на построение мебельного модуля и дальнейшие технические решения.',choices:[choice('BUILT_IN','Встраиваемый','▥'),choice('FREESTANDING','Отдельностоящий','▤')]},
    'fridge-width':{title:'Выберите ширину холодильника',subtitle:'Для пилота фиксируем три базовых габаритных сценария.',choices:[choice(600,'600 мм','600'),choice(900,'900 мм','900'),choice(1200,'1200 мм','1200','Для встраиваемого сценария трактуется как два модуля по 600 мм')]},
    'fridge-content':{title:'Выберите наполнение холодильника',subtitle:'Для встраиваемого модуля 600/900 фиксируем функциональный тип.',choices:contentChoices},
    'fridge-dual-left':{title:'Выберите левый модуль холодильника',subtitle:'Сценарий 1200 мм = два отдельных встраиваемых модуля по 600 мм.',choices:contentChoices},
    'fridge-dual-right':{title:'Выберите правый модуль холодильника',subtitle:'Левый и правый модули могут иметь разное наполнение.',choices:contentChoices},
    'sink-side':{title:'Выберите положение мойки',subtitle:activeWalls.length>1?'Укажите, с какой стороны от угла располагается модуль с мойкой.':'Для линейной кухни пока фиксируем сторону мойки в общей композиции.',choices:[choice('LEFT','Слева','←'),choice('RIGHT','Справа','→')]},
    'sink-placement':{title:'Укажите положение мойки относительно угла',subtitle:activeWalls.length>1?'Мойка может примыкать к угловой зоне или быть смещена от неё.':'Для линейной кухни угловой сценарий не применяется; используем безопасный placeholder до уточнения точной координаты.',choices:activeWalls.length>1?[choice('AT_CORNER','От угла','⌜','Часть модуля работает с угловой зоной'),choice('OFFSET','Со смещением от угла','↔','Следующим экраном укажите размер смещения')]:[choice('LINEAR_PENDING','Позицию уточним позже','—','Линейная координата будет отдельным UX-слоем')]},
    'cooktop-type':{title:'Выберите тип варочной панели',subtitle:'Тип панели влияет на технические требования и коммуникации.',choices:[choice('GAS','Газовая','G'),choice('ELECTRIC','Электрическая','E'),choice('INDUCTION','Индукционная','I'),choice('COMBINED','Комбинированная','C')]},
    'cooktop-size':{title:'Выберите размер варочной панели',subtitle:'Кастомный размер пока сохраняем как отдельный незавершённый сценарий.',choices:[choice(600,'600 мм','600'),choice(300,'300 мм · Domino','300'),choice('CUSTOM','Другой размер','+','Сценарий кастома проработаем позже')]},
    'cooktop-custom':{title:'Подтвердите кастомный размер',subtitle:'Точный кастомный сценарий пока не определён. В пилоте сохраняем выбор и не придумываем правило.',choices:[choice('CONFIRM','Продолжить с placeholder','→')]},
    'dishwasher-type':{title:'Выберите тип посудомоечной машины',subtitle:'Фиксируем установочный тип как исходные данные системы.',choices:[choice('BUILT_IN','Встраиваемая','▥'),choice('FREESTANDING','Отдельностоящая','▤')]},
    'dishwasher-size':{title:'Выберите ширину посудомоечной машины',subtitle:'Доступные базовые размеры текущего сценария.',choices:[choice(450,'450 мм','450'),choice(600,'600 мм','600')]},
    'hood-type':{title:'Выберите тип вытяжки',subtitle:'Тип вытяжки влияет на построение верхнего модуля.',choices:[choice('BUILT_IN','Встраиваемая','▥'),choice('FREESTANDING','Отдельностоящая','▤')]},
    'hood-integrated-subtype':{title:'Выберите тип встраиваемой вытяжки',subtitle:'Телескопическая вытяжка требует отдельной логики высоты верхнего модуля.',choices:[choice('FULL','Полновстраиваемая','□'),choice('TELESCOPIC','Телескопическая','⇆','Модуль обычно ниже на высоту выдвижной части')]},
    'hood-size':{title:'Выберите ширину вытяжки',subtitle:'Для отдельностоящей вытяжки ограничиваем выбор базовыми размерами пилота.',choices:[choice(500,'500 мм','500'),choice(600,'600 мм','600'),choice(800,'800 мм','800'),choice(900,'900 мм','900')]},
    'oven-location':{title:'Выберите положение духового шкафа',subtitle:'Укажите, где духовка должна находиться в композиции.',choices:[choice('LOWER','В нижнем модуле','▱'),choice('TALL','В пенале','▥')]}
  };

  async function request(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось сохранить выбор.')}return r.json()}
  async function saveInputs(key,value){if(busy)return;busy=true;try{inputs={...inputs,[key]:value};visual={...visual,guided_inputs:inputs,guided_route_version:'2026-09-10'};const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason:`Guided pilot: ${key}`})});project=result.project||result;visual={...(project.scene?.visual_settings||visual)};inputs={...(visual.guided_inputs||inputs)}}finally{busy=false}}
  async function saveCeiling(value){await saveInputs('ceiling',value);const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'room.ceiling.type',value,reason:'Guided ceiling choice'})});project=result.project||result}
  function go(next){location.assign(`/guided?stage=${encodeURIComponent(next)}&project=${encodeURIComponent(projectId)}`)}

  function nextStage(current,value){
    if(current==='ceiling')return'fridge-present';
    if(current==='fridge-present')return value==='YES'?'fridge-side':'sink-side';
    if(current==='fridge-side')return'fridge-type';
    if(current==='fridge-type')return'fridge-width';
    if(current==='fridge-width'){
      if(inputs.fridge_type==='BUILT_IN'&&Number(value)===1200)return'fridge-dual-left';
      if(inputs.fridge_type==='BUILT_IN')return'fridge-content';
      return'sink-side';
    }
    if(current==='fridge-content')return'sink-side';
    if(current==='fridge-dual-left')return'fridge-dual-right';
    if(current==='fridge-dual-right')return'sink-side';
    if(current==='sink-side')return'sink-placement';
    if(current==='sink-placement')return value==='OFFSET'?'sink-offset':'cooktop-type';
    if(current==='sink-offset')return'cooktop-type';
    if(current==='cooktop-type')return'cooktop-size';
    if(current==='cooktop-size')return value==='CUSTOM'?'cooktop-custom':'cooktop-wall';
    if(current==='cooktop-custom')return'cooktop-wall';
    if(current==='cooktop-wall')return'dishwasher-type';
    if(current==='dishwasher-type')return'dishwasher-size';
    if(current==='dishwasher-size')return'dishwasher-wall';
    if(current==='dishwasher-wall')return'hood-type';
    if(current==='hood-type')return value==='BUILT_IN'?'hood-integrated-subtype':'hood-size';
    if(current==='hood-integrated-subtype'||current==='hood-size')return'oven-location';
    if(current==='oven-location')return'oven-wall';
    if(current==='oven-wall')return'communications';
    return'communications';
  }

  const keyForStage={
    ceiling:'ceiling','fridge-present':'fridge_present','fridge-side':'fridge_side','fridge-type':'fridge_type','fridge-width':'fridge_width_mm','fridge-content':'fridge_content','fridge-dual-left':'fridge_left_unit','fridge-dual-right':'fridge_right_unit','sink-side':'sink_side','sink-placement':'sink_placement','sink-offset':'sink_offset_mm','cooktop-type':'cooktop_type','cooktop-size':'cooktop_width_mm','cooktop-custom':'cooktop_custom_status','cooktop-wall':'cooktop_wall','dishwasher-type':'dishwasher_type','dishwasher-size':'dishwasher_width_mm','dishwasher-wall':'dishwasher_wall','hood-type':'hood_type','hood-integrated-subtype':'hood_integrated_subtype','hood-size':'hood_width_mm','oven-location':'oven_location','oven-wall':'oven_wall'};

  function wallDefinition(kind){
    const labels={cooktop:'варочной панели',dishwasher:'посудомоечной машины',oven:'духового шкафа'};
    const title=`Выберите стену для ${labels[kind]}`;
    const subtitle=activeWalls.length?`Доступны только стены выбранной конфигурации: ${activeWalls.join(', ')}.`:'Для кастомной конфигурации распознавание стен пока placeholder.';
    return{title,subtitle,choices:activeWalls.length?activeWalls.map(w=>choice(w,`Стена ${w}`,w)):[choice('CUSTOM_PENDING','Стена будет определена после распознавания','—','Placeholder кастомной конфигурации')]};
  }

  function renderCards(def){
    $('cards').hidden=false;$('inputStage').hidden=true;$('summaryStage').hidden=true;
    $('cards').innerHTML=def.choices.map(item=>`<button class="guided-card${item.value==='CUSTOM'||item.value==='CUSTOM_PENDING'?' is-placeholder':''}" type="button" data-value="${String(item.value)}" data-symbol="${item.symbol}"><strong>${item.label}</strong>${item.note?`<small>${item.note}</small>`:''}</button>`).join('');
    $('cards').querySelectorAll('.guided-card').forEach(card=>card.addEventListener('click',async()=>{
      if(busy)return;const raw=card.dataset.value;const value=/^\d+$/.test(raw)?Number(raw):raw;card.disabled=true;$('errorNode').hidden=true;
      try{if(stage==='ceiling')await saveCeiling(value);else await saveInputs(keyForStage[stage],value);go(nextStage(stage,value))}catch(error){card.disabled=false;$('errorNode').textContent=error.message;$('errorNode').hidden=false}
    }));
  }

  function renderInput(){
    $('title').textContent='Укажите смещение мойки от угла';$('subtitle').textContent='Введите фактическое расстояние. Значение станет исходной координатой для модуля мойки.';$('cards').hidden=true;$('summaryStage').hidden=true;$('inputStage').hidden=false;
    $('inputStage').innerHTML='<label>Смещение от угла<div class="input-wrap"><input id="offsetValue" type="number" min="0" max="10000" step="1" inputmode="numeric" value="300"><span>мм</span></div></label><button class="primary-action" id="saveOffset" type="button">Сохранить и продолжить</button>';
    $('saveOffset').addEventListener('click',async()=>{const value=Math.round(Number($('offsetValue').value));if(!Number.isFinite(value)||value<0||value>10000){$('errorNode').textContent='Введите корректное смещение в миллиметрах.';$('errorNode').hidden=false;return}try{await saveInputs('sink_offset_mm',value);go('cooktop-type')}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}})
  }

  function renderCommunications(){
    $('title').textContent='Укажите коммуникации';$('subtitle').textContent='На этом пилоте фиксируем отдельный экран и состав необходимых точек. Точные координаты на 3D проработаем следующим слоем.';$('cards').hidden=true;$('inputStage').hidden=true;$('summaryStage').hidden=false;
    const needs=['Канализация','Вода'];
    if(inputs.cooktop_type==='GAS'||inputs.cooktop_type==='COMBINED')needs.push('Газ / питание панели');else needs.push('Питание варочной панели');
    if(inputs.fridge_present==='YES')needs.push('Питание холодильника');
    needs.push('Вытяжка / вентиляция','Питание духового шкафа');
    $('summaryStage').innerHTML=`<h2>Точки, которые система уже ожидает</h2><div class="summary-grid">${needs.map(x=>`<div class="summary-row"><span>Коммуникация</span><strong>${x}</strong></div>`).join('')}</div><p style="color:var(--muted);line-height:1.45">Координаты коммуникаций пока оставлены как UI-first placeholder — без выдумывания неподтверждённых правил.</p><button class="primary-action" id="toModel" type="button">Перейти к модели →</button>`;
    $('toModel').addEventListener('click',async()=>{try{await saveInputs('communications_status','PENDING_COORDINATE_DETAIL');location.assign(`/model?project=${encodeURIComponent(projectId)}`)}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}})
  }

  function createMenu(){const p=document.createElement('div');p.className='mini-menu';p.hidden=true;p.innerHTML='<div style="padding:7px 9px;font-weight:750">BIZET OS · маршрут</div><button type="button">Закрыть</button>';document.body.appendChild(p);p.querySelector('button').onclick=()=>p.hidden=true;$('settingsButton').onclick=e=>{e.stopPropagation();p.hidden=!p.hidden};document.addEventListener('click',()=>p.hidden=true)}

  function render(){
    if(stage==='sink-offset'){renderInput();return}
    if(stage==='communications'){renderCommunications();return}
    let def=definitions[stage];
    if(stage==='cooktop-wall')def=wallDefinition('cooktop');
    if(stage==='dishwasher-wall')def=wallDefinition('dishwasher');
    if(stage==='oven-wall')def=wallDefinition('oven');
    if(!def){$('title').textContent='Маршрут не найден';$('subtitle').textContent='Вернитесь на предыдущий экран.';return}
    $('title').textContent=def.title;$('subtitle').textContent=def.subtitle;renderCards(def)
  }

  $('backButton').addEventListener('click',()=>history.back());createMenu();
  (async()=>{if(!projectId){$('errorNode').textContent='Проект не найден. Вернитесь на стартовый экран.';$('errorNode').hidden=false;return}try{project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};render()}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}})();
})();
