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
  let project=null,visual={},inputs={},busy=false;

  const choice=(value,label,symbol,note='')=>({value,label,symbol,note});
  const yesNo=[choice('YES','Да','✓'),choice('NO','Нет','×')];
  const contentChoices=[
    choice('FRIDGE_ONLY','Только холодильник','❄','Цельный фасад'),
    choice('FREEZER_ONLY','Только морозильник','▣','Цельный фасад'),
    choice('FRIDGE_FREEZER','Холодильник + морозильник','◫','Комбинированное наполнение')
  ];
  const hoodSizes=[500,600,800,900,1000].map(v=>choice(v,`${v} мм`,String(v)));

  const definitions={
    ceiling:{title:'Выберите подход к потолку',subtitle:'Выберите вариант примыкания мебели к потолку.',choices:[
      choice('STRETCH_A','Натяжной — подготовленное основание','⌂'),choice('STRETCH_B','Готовый натяжной потолок','▱'),choice('GYPSUM','Гипсокартонный потолок','□'),choice('OPEN_GAP','Открытый зазор / не до потолка','↕')
    ]},
    'fridge-present':{title:'Будет ли холодильник?',subtitle:'Если нет — холодильник полностью исключается из текущей композиции.',choices:yesNo},
    'fridge-side':{title:'Выберите положение холодильника',subtitle:'Холодильник располагается на одном из крайних краёв композиции.',choices:[choice('LEFT','Крайний слева','←'),choice('RIGHT','Крайний справа','→')]},
    'fridge-type':{title:'Выберите тип холодильника',subtitle:'Тип влияет на мебельный модуль и дальнейшие технические решения.',choices:[choice('BUILT_IN','Встраиваемый','▥'),choice('FREESTANDING','Отдельностоящий','▤')]},
    'fridge-width':{title:'Выберите ширину холодильника',subtitle:'Фиксируем базовый габарит.',choices:[choice(600,'600 мм','600'),choice(900,'900 мм','900'),choice(1200,'1200 мм','1200','Для встраиваемого сценария — два блока по 600 мм')]},
    'fridge-content':{title:'Выберите наполнение холодильника',subtitle:'Функциональный тип влияет на построение фасадов.',choices:contentChoices},
    'fridge-dual-left':{title:'Выберите левый блок холодильника',subtitle:'Сценарий 1200 мм состоит из двух встраиваемых блоков по 600 мм.',choices:contentChoices},
    'fridge-dual-right':{title:'Выберите правый блок холодильника',subtitle:'Левый и правый блоки могут иметь разное наполнение.',choices:contentChoices},

    'sink-side':{title:'Выберите положение мойки',subtitle:activeWalls.length>1?'Укажите, с какой стороны от угла располагается модуль с мойкой.':'Укажите сторону мойки в прямой композиции.',choices:[choice('LEFT','Слева','←'),choice('RIGHT','Справа','→')]},
    'sink-placement':{title:'Укажите положение мойки относительно угла',subtitle:activeWalls.length>1?'Мойка может работать от самого угла или быть смещена от него.':'Для прямой кухни точная линейная координата остаётся следующим слоем.',choices:activeWalls.length>1?[choice('AT_CORNER','От угла','⌜','Часть модуля работает с угловой зоной'),choice('OFFSET','Со смещением от угла','↔','Следующим экраном укажите расстояние')]:[choice('LINEAR_PENDING','Продолжить','→','Положение будет уточняться внутри прямого участка')]},
    'sink-mount':{title:'Выберите тип монтажа мойки',subtitle:'Тип монтажа влияет на столешницу и конструктив модуля.',choices:[choice('TOP_MOUNT','Накладная на столешницу','▱'),choice('FLUSH','Вровень со столешницей','＝'),choice('UNDERMOUNT','Под столешницей','▾')]},
    'sink-bowls':{title:'Сколько чаш у мойки?',subtitle:'Фиксируем геометрию мойки как исходное условие.',choices:[choice(1,'Одна чаша','1'),choice(2,'Две чаши','2')]},
    'sink-disposer':{title:'Планируется измельчитель отходов?',subtitle:'Измельчитель занимает место под мойкой и влияет на мусорную систему.',choices:yesNo},
    'sink-filters':{title:'Будут фильтры под мойкой?',subtitle:'Например, обратный осмос. Это влияет на свободное место и расположение мусорного ведра.',choices:yesNo},

    'cooktop-type':{title:'Выберите тип варочной панели',subtitle:'Тип панели задаёт технические требования и коммуникации.',choices:[choice('GAS','Газовая','G'),choice('ELECTRIC','Электрическая','E'),choice('INDUCTION','Индукционная','I'),choice('COMBINED','Комбинированная','C')]},
    'cooktop-size':{title:'Выберите размер варочной панели',subtitle:'Фиксируем габарит модуля варочной панели.',choices:[choice(600,'600 мм','600'),choice(300,'300 мм · Domino','300'),choice('CUSTOM','Другой размер','+','Кастомный сценарий детализируем позже')]},
    'cooktop-custom':{title:'Кастомный размер варочной панели',subtitle:'Пока сохраняем сам факт кастомного решения без выдумывания размера.',choices:[choice('CONFIRM','Продолжить','→')]},

    'dishwasher-type':{title:'Выберите тип посудомоечной машины',subtitle:'Фиксируем установочный тип.',choices:[choice('BUILT_IN','Встраиваемая','▥'),choice('FREESTANDING','Отдельностоящая','▤')]},
    'dishwasher-size':{title:'Выберите ширину посудомоечной машины',subtitle:'Два базовых размера текущего сценария.',choices:[choice(450,'450 мм','450'),choice(600,'600 мм','600')]},

    'hood-type':{title:'Выберите тип вытяжки',subtitle:'Тип вытяжки влияет на построение верхних модулей.',choices:[choice('BUILT_IN','Встраиваемая','▥'),choice('FREESTANDING','Отдельностоящая','▤')]},
    'hood-integrated-subtype':{title:'Выберите тип встраиваемой вытяжки',subtitle:'Полновстраиваемая и телескопическая требуют разной геометрии верхнего модуля.',choices:[choice('FULL','Полновстраиваемая','□'),choice('TELESCOPIC','Телескопическая','⇆','Учитываем выдвижную часть')]},
    'hood-size':{title:'Выберите ширину вытяжки',subtitle:'Размер задаёт системе ширину зоны вытяжки и верхнего модуля.',choices:hoodSizes},

    'oven-location':{title:'Выберите положение духового шкафа',subtitle:'Укажите, где духовка находится в композиции.',choices:[choice('LOWER','В нижнем модуле','▱'),choice('TALL','В пенале','▥')]},
    'microwave-present':{title:'Будет микроволновая печь в пенале?',subtitle:'Дополнительная техника меняет внутреннюю разбивку пенала.',choices:yesNo},
    'microwave-type':{title:'Выберите тип микроволновой печи',subtitle:'Встраиваемая: стандартная зона 600 × 450 мм. Для отдельно стоящей закладываем отделение высотой 350 мм.',choices:[choice('BUILT_IN','Встраиваемая','▥','600 × 450 мм'),choice('FREESTANDING','Отдельностоящая','▤','Отделение H 350 мм')]},
    'coffee-present':{title:'Будет кофемашина в пенале?',subtitle:'Фиксируем дополнительную технику до построения внутренней структуры пенала.',choices:yesNo},
    'coffee-type':{title:'Выберите тип кофемашины',subtitle:'Встраиваемая имеет стандартную зону 600 × 450 мм; отдельно стоящая получает отдельный сценарий размещения.',choices:[choice('BUILT_IN','Встраиваемая','▥','600 × 450 мм'),choice('FREESTANDING','Отдельностоящая','▤')]},
    'coffee-support':{title:'Как размещается отдельно стоящая кофемашина?',subtitle:'Выбор влияет на фурнитуру, удобство и стоимость.',choices:[choice('FIXED_SHELF','На обычной полке','▬'),choice('PULLOUT_LOCKING','На выдвижной полке с фиксатором','⇆','Blum или аналог')]},
    'coffee-compartment':{title:'Отделение кофемашины открытое или закрытое?',subtitle:'Если закрытое — следующим шагом выберите тип открывания фасада.',choices:[choice('OPEN','Открытое','□'),choice('CLOSED','Закрытое','▣')]},
    'coffee-front-opening':{title:'Выберите открывание фасада кофемашины',subtitle:'Фиксируем направление и механизм.',choices:[choice('HINGED_LEFT','Петли слева','←'),choice('HINGED_RIGHT','Петли справа','→'),choice('LIFT_UP_HL','Вертикально вверх','↑','Aventos HL или аналог')]}
  };

  async function request(url,options={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось сохранить выбор.')}return r.json();
  }
  async function saveInputsPatch(patch){
    if(busy)throw new Error('Подождите завершения сохранения.');
    busy=true;
    try{
      inputs={...inputs,...patch};
      visual={...visual,guided_inputs:inputs,guided_route_version:'2026-09-10-r4'};
      const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason:`Guided pilot: ${Object.keys(patch).join(',')}`})});
      project=result.project||result;visual={...(project.scene?.visual_settings||visual)};inputs={...(visual.guided_inputs||inputs)};
    }finally{busy=false}
  }
  async function saveCeiling(value){
    await saveInputsPatch({ceiling:value});
    const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'room.ceiling.type',value,reason:'Guided ceiling choice'})});
    project=result.project||result;
  }
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
    if(['fridge-content','fridge-dual-right'].includes(current))return'sink-side';
    if(current==='fridge-dual-left')return'fridge-dual-right';
    if(current==='sink-side')return'sink-placement';
    if(current==='sink-placement')return value==='OFFSET'?'sink-offset':'sink-mount';
    if(current==='sink-offset')return'sink-mount';
    if(current==='sink-mount')return'sink-bowls';
    if(current==='sink-bowls')return'sink-disposer';
    if(current==='sink-disposer')return'sink-filters';
    if(current==='sink-filters')return'cooktop-type';
    if(current==='cooktop-type')return'cooktop-size';
    if(current==='cooktop-size')return value==='CUSTOM'?'cooktop-custom':'cooktop-wall';
    if(current==='cooktop-custom')return'cooktop-wall';
    if(current==='cooktop-wall')return'dishwasher-type';
    if(current==='dishwasher-type')return'dishwasher-size';
    if(current==='dishwasher-size')return'dishwasher-wall';
    if(current==='dishwasher-wall')return'hood-type';
    if(current==='hood-type')return value==='BUILT_IN'?'hood-integrated-subtype':'hood-size';
    if(current==='hood-integrated-subtype')return'hood-size';
    if(current==='hood-size')return'oven-location';
    if(current==='oven-location')return'oven-wall';
    if(current==='oven-wall')return inputs.oven_location==='TALL'?'microwave-present':'upper-gap';
    if(current==='microwave-present')return value==='YES'?'microwave-type':'coffee-present';
    if(current==='microwave-type')return'coffee-present';
    if(current==='coffee-present')return value==='YES'?'coffee-type':'upper-gap';
    if(current==='coffee-type')return value==='FREESTANDING'?'coffee-support':'upper-gap';
    if(current==='coffee-support')return'coffee-compartment';
    if(current==='coffee-compartment')return value==='CLOSED'?'coffee-front-opening':'upper-gap';
    if(current==='coffee-front-opening')return'upper-gap';
    if(current==='upper-gap')return'communications';
    return'communications';
  }

  const keyForStage={
    ceiling:'ceiling','fridge-present':'fridge_present','fridge-side':'fridge_side','fridge-type':'fridge_type','fridge-width':'fridge_width_mm','fridge-content':'fridge_content','fridge-dual-left':'fridge_left_unit','fridge-dual-right':'fridge_right_unit',
    'sink-side':'sink_side','sink-placement':'sink_placement','sink-mount':'sink_mount_type','sink-bowls':'sink_bowl_count','sink-disposer':'sink_disposer','sink-filters':'sink_filters',
    'cooktop-type':'cooktop_type','cooktop-size':'cooktop_width_mm','cooktop-custom':'cooktop_custom_status','cooktop-wall':'cooktop_wall',
    'dishwasher-type':'dishwasher_type','dishwasher-size':'dishwasher_width_mm','dishwasher-wall':'dishwasher_wall',
    'hood-type':'hood_type','hood-integrated-subtype':'hood_integrated_subtype','hood-size':'hood_width_mm',
    'oven-location':'oven_location','oven-wall':'oven_wall','microwave-present':'microwave_present','microwave-type':'microwave_type','coffee-present':'coffee_present','coffee-type':'coffee_type','coffee-support':'coffee_support','coffee-compartment':'coffee_compartment','coffee-front-opening':'coffee_front_opening'
  };

  function wallDefinition(kind){
    const labels={cooktop:'варочной панели',dishwasher:'посудомоечной машины',oven:'духового шкафа'};
    return{title:`Выберите стену для ${labels[kind]}`,subtitle:activeWalls.length?`Доступны стены выбранной конфигурации: ${activeWalls.join(', ')}.`:'Для кастомной конфигурации распознавание стен пока placeholder.',choices:activeWalls.length?activeWalls.map(w=>choice(w,`Стена ${w}`,w)):[choice('CUSTOM_PENDING','Определим после распознавания','—')]};
  }

  function derivedPatch(current,value){
    const patch={[keyForStage[current]]:value};
    if(current==='microwave-present'&&value==='NO')Object.assign(patch,{microwave_type:null,microwave_width_mm:null,microwave_height_mm:null,microwave_compartment_height_mm:null});
    if(current==='microwave-type'&&value==='BUILT_IN')Object.assign(patch,{microwave_width_mm:600,microwave_height_mm:450,microwave_compartment_height_mm:null});
    if(current==='microwave-type'&&value==='FREESTANDING')Object.assign(patch,{microwave_width_mm:null,microwave_height_mm:null,microwave_compartment_height_mm:350});
    if(current==='coffee-present'&&value==='NO')Object.assign(patch,{coffee_type:null,coffee_width_mm:null,coffee_height_mm:null,coffee_support:null,coffee_compartment:null,coffee_front_opening:null});
    if(current==='coffee-type'&&value==='BUILT_IN')Object.assign(patch,{coffee_width_mm:600,coffee_height_mm:450,coffee_support:null,coffee_compartment:null,coffee_front_opening:null});
    if(current==='coffee-type'&&value==='FREESTANDING')Object.assign(patch,{coffee_width_mm:null,coffee_height_mm:null});
    return patch;
  }

  function renderCards(def){
    $('cards').hidden=false;$('inputStage').hidden=true;$('summaryStage').hidden=true;
    $('cards').innerHTML=def.choices.map(item=>`<button class="guided-card${item.value==='CUSTOM'||item.value==='CUSTOM_PENDING'?' is-placeholder':''}" type="button" data-value="${String(item.value)}" data-symbol="${item.symbol}"><strong>${item.label}</strong>${item.note?`<small>${item.note}</small>`:''}</button>`).join('');
    $('cards').querySelectorAll('.guided-card').forEach(card=>card.addEventListener('click',async()=>{
      if(busy)return;const raw=card.dataset.value;const value=/^\d+$/.test(raw)?Number(raw):raw;card.disabled=true;$('errorNode').hidden=true;
      try{if(stage==='ceiling')await saveCeiling(value);else await saveInputsPatch(derivedPatch(stage,value));go(nextStage(stage,value))}catch(error){card.disabled=false;$('errorNode').textContent=error.message;$('errorNode').hidden=false}
    }));
  }

  function inputField(label,id,value,min=0){return `<label>${label}<div class="input-wrap"><input id="${id}" type="number" min="${min}" step="1" inputmode="numeric" value="${value}"><span>мм</span></div></label>`}
  function renderInput(){
    $('cards').hidden=true;$('summaryStage').hidden=true;$('inputStage').hidden=false;
    if(stage==='sink-offset'){
      $('title').textContent='Укажите смещение мойки от угла';$('subtitle').textContent='Введите фактическое расстояние. Оно станет исходной координатой модуля мойки.';
      $('inputStage').innerHTML=`${inputField('Смещение от угла','inputValue',Number(inputs.sink_offset_mm)||300,0)}<button class="primary-action" id="saveInput" type="button">Сохранить и продолжить</button>`;
      $('saveInput').addEventListener('click',async()=>{const value=Math.round(Number($('inputValue').value));if(!Number.isFinite(value)||value<0){$('errorNode').textContent='Введите корректное расстояние.';$('errorNode').hidden=false;return}try{await saveInputsPatch({sink_offset_mm:value});go('sink-mount')}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}});return;
    }
    if(stage==='upper-gap'){
      $('title').textContent='Расстояние до верхних модулей';$('subtitle').textContent='От столешницы до низа верхних модулей. По умолчанию 600 мм, минимально 550 мм.';
      $('inputStage').innerHTML=`${inputField('Расстояние от столешницы','inputValue',Number(inputs.upper_gap_mm)||600,550)}<p style="color:var(--muted);font-size:13px;line-height:1.4">Если указать меньше 550 мм, BIZET OS автоматически вернёт значение к 550 мм.</p><button class="primary-action" id="saveInput" type="button">Сохранить и продолжить</button>`;
      $('saveInput').addEventListener('click',async()=>{let value=Math.round(Number($('inputValue').value));if(!Number.isFinite(value)){value=600}value=Math.max(550,value);$('inputValue').value=String(value);try{await saveInputsPatch({upper_gap_mm:value});go('communications')}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}});return;
    }
  }

  function renderCommunications(){
    $('title').textContent='Укажите коммуникации';$('subtitle').textContent='Система уже знает состав техники. Точные координаты точек останутся отдельным 3D-слоем.';$('cards').hidden=true;$('inputStage').hidden=true;$('summaryStage').hidden=false;
    const needs=['Канализация','Вода'];
    if(inputs.sink_disposer==='YES')needs.push('Питание измельчителя');
    if(inputs.cooktop_type==='GAS'||inputs.cooktop_type==='COMBINED')needs.push('Газ / питание варочной панели');else needs.push('Питание варочной панели');
    if(inputs.fridge_present==='YES')needs.push('Питание холодильника');
    needs.push('Вытяжка / вентиляция','Питание духового шкафа');
    if(inputs.microwave_present==='YES')needs.push('Питание микроволновой печи');
    if(inputs.coffee_present==='YES')needs.push('Питание кофемашины');
    $('summaryStage').innerHTML=`<h2>Точки, которые система уже ожидает</h2><div class="summary-grid">${needs.map(x=>`<div class="summary-row"><span>Коммуникация</span><strong>${x}</strong></div>`).join('')}</div><p style="color:var(--muted);line-height:1.45">Координаты коммуникаций пока не придумываем — этот слой подключим отдельно.</p><button class="primary-action" id="toModel" type="button">Перейти к модели →</button>`;
    $('toModel').addEventListener('click',async()=>{try{await saveInputsPatch({communications_status:'PENDING_COORDINATE_DETAIL'});location.assign(`/model?project=${encodeURIComponent(projectId)}`)}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}});
  }

  function render(){
    if(stage==='sink-offset'||stage==='upper-gap'){renderInput();return}
    if(stage==='communications'){renderCommunications();return}
    let def=definitions[stage];
    if(stage==='cooktop-wall')def=wallDefinition('cooktop');
    if(stage==='dishwasher-wall')def=wallDefinition('dishwasher');
    if(stage==='oven-wall')def=wallDefinition('oven');
    if(!def){$('title').textContent='Маршрут не найден';$('subtitle').textContent='Вернитесь на предыдущий экран.';return}
    $('title').textContent=def.title;$('subtitle').textContent=def.subtitle;renderCards(def);
  }

  $('backButton').addEventListener('click',()=>history.back());
  (async()=>{if(!projectId){$('errorNode').textContent='Проект не найден. Вернитесь на стартовый экран.';$('errorNode').hidden=false;return}try{project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};render()}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}})();
})();
