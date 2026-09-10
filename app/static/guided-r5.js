(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const params=new URLSearchParams(location.search);
  const stage=params.get('stage')||'ceiling';
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  const $=id=>document.getElementById(id);
  let project=null,visual={},inputs={},busy=false;

  async function request(url,options={}){
    const response=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    if(!response.ok){let payload={};try{payload=await response.json()}catch(_){};throw new Error(typeof payload.detail==='string'?payload.detail:'Не удалось сохранить выбор.');}
    return response.json();
  }
  async function load(){
    if(!projectId)return false;
    project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);
    visual={...(project.scene?.visual_settings||{})};
    inputs={...(visual.guided_inputs||{})};
    return true;
  }
  async function save(patch,reason='Guided r5'){
    if(busy)return;busy=true;
    try{
      inputs={...inputs,...patch};
      visual={...visual,guided_inputs:inputs,guided_route_version:'2026-09-10-r5'};
      const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason})});
      project=result.project||result;visual={...(project.scene?.visual_settings||visual)};inputs={...(visual.guided_inputs||inputs)};
    }finally{busy=false;}
  }
  function go(next){location.assign(`/guided?stage=${encodeURIComponent(next)}&project=${encodeURIComponent(projectId)}`)}
  function clearStages(){
    if($('cards')){$('cards').hidden=false;$('cards').innerHTML='';}
    if($('inputStage')){$('inputStage').hidden=true;$('inputStage').innerHTML='';}
    if($('summaryStage')){$('summaryStage').hidden=true;$('summaryStage').innerHTML='';}
    if($('errorNode'))$('errorNode').hidden=true;
  }
  function showError(error){if(!$('errorNode'))return;$('errorNode').textContent=error?.message||String(error);$('errorNode').hidden=false;}
  function card(value,label,note=''){return `<button class="guided-card" type="button" data-r5-value="${value}"><strong>${label}</strong>${note?`<small>${note}</small>`:''}</button>`}
  function renderQuestion(title,subtitle,choices,onChoose){
    clearStages();$('title').textContent=title;$('subtitle').textContent=subtitle;
    $('cards').innerHTML=choices.map(c=>card(c.value,c.label,c.note||'')).join('');
    $('cards').querySelectorAll('[data-r5-value]').forEach(button=>button.addEventListener('click',async()=>{
      if(busy)return;button.disabled=true;try{await onChoose(button.dataset.r5Value);}catch(error){button.disabled=false;showError(error);}
    }));
  }
  function rememberDishwasher(){
    localStorage.setItem('bizet_r5_dishwasher_present',inputs.dishwasher_present||'');
    localStorage.setItem('bizet_r5_dishwasher_near_sink',inputs.dishwasher_near_sink||'');
    localStorage.setItem('bizet_r5_dishwasher_side',inputs.dishwasher_side||'');
  }
  async function renderDishwasherPresence(){
    renderQuestion('Будет ли посудомоечная машина?','Если нет — BIZET OS полностью исключит ПММ из текущей композиции.',[
      {value:'YES',label:'Да'},{value:'NO',label:'Нет'}
    ],async value=>{
      if(value==='YES')await save({dishwasher_present:'YES'},'Dishwasher presence');
      else await save({dishwasher_present:'NO',dishwasher_type:null,dishwasher_width_mm:null,dishwasher_wall:null,dishwasher_near_sink:null,dishwasher_side:null},'Dishwasher excluded');
      rememberDishwasher();
      if(value==='YES')go('dishwasher-type');else go('hood-type');
    });
  }
  async function renderDishwasherProximity(){
    renderQuestion('Должна ли ПММ стоять рядом с мойкой?','Если выбрать «Нет», система всё равно расположит её максимально близко к мойке — при необходимости через один модуль или на соседней стене.',[
      {value:'YES',label:'Да · рядом'},{value:'NO',label:'Нет · максимально близко'}
    ],async value=>{
      await save({dishwasher_near_sink:value,dishwasher_side:value==='NO'?null:inputs.dishwasher_side||null},'Dishwasher proximity to sink');rememberDishwasher();go('hood-type');
    });
  }
  async function renderDishwasherSide(){
    renderQuestion('С какой стороны от мойки поставить ПММ?','Сторона задаётся относительно модуля с мойкой.',[
      {value:'LEFT',label:'Слева'},{value:'RIGHT',label:'Справа'}
    ],async value=>{await save({dishwasher_side:value},'Dishwasher side relative to sink');rememberDishwasher();go('hood-type');});
  }
  async function renderReadyForModel(){
    clearStages();$('cards').hidden=true;$('summaryStage').hidden=false;
    $('title').textContent='Исходные точки собраны';
    $('subtitle').textContent='Сначала BIZET OS построит параметрическую 3D-модель. Коммуникации система расставит автоматически уже по фактическому положению мебели и техники.';
    const extraTall=inputs.oven_location==='TALL'&&(inputs.microwave_present==='YES'||inputs.coffee_present==='YES');
    const ovenMode=inputs.oven_location==='TALL'?(extraTall?'LOWERED_HALF_LOWER_FACADE':'RAISED_TO_LOWER_FACADE_TOP'):null;
    await save({communications_status:'AUTO_AFTER_MODEL',oven_vertical_mode:ovenMode,high_unit_order_rule:'FRIDGE_OUTERMOST_OVEN_ADJACENT_IF_SAME_WALL'},'Prepare model before communication verification');
    $('summaryStage').innerHTML=`<h2>Можно строить кухню</h2><div class="summary-grid"><div class="summary-row"><span>Следующий шаг</span><strong>3D-модель</strong></div><div class="summary-row"><span>После модели</span><strong>Проверка коммуникаций</strong></div></div><button class="primary-action" id="r5ToModel" type="button">Собрать 3D-модель →</button>`;
    $('r5ToModel').addEventListener('click',()=>location.assign(`/model?project=${encodeURIComponent(projectId)}`));
  }

  async function init(){
    try{if(!await load())return;
      rememberDishwasher();
      if(stage==='dishwasher-type'&&!inputs.dishwasher_present){await renderDishwasherPresence();return;}
      if(stage==='hood-type'&&inputs.dishwasher_present==='YES'&&!inputs.dishwasher_near_sink){await renderDishwasherProximity();return;}
      if(stage==='hood-type'&&inputs.dishwasher_present==='YES'&&inputs.dishwasher_near_sink==='YES'&&!inputs.dishwasher_side){await renderDishwasherSide();return;}
      if(stage==='communications'){await renderReadyForModel();return;}
    }catch(error){showError(error);}
  }
  setTimeout(init,40);
})();
