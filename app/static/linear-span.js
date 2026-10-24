(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const CONFIG_KEY='bizet_pilot_configuration';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  const configuration=sessionStorage.getItem(CONFIG_KEY)||localStorage.getItem(CONFIG_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  let project=null,visual={},inputs={},selectedMode=null,busy=false;

  const choices=[
    {value:'FULL_WALL',label:'На всю стену',symbol:'↔',note:'Без свободного расстояния слева и справа'},
    {value:'LEFT_OFFSET',label:'Отступ слева',symbol:'←',note:'Справа кухня доходит до края выбранного участка'},
    {value:'RIGHT_OFFSET',label:'Отступ справа',symbol:'→',note:'Слева кухня начинается от края выбранного участка'},
    {value:'BOTH_OFFSETS',label:'Отступы с двух сторон',symbol:'⇆',note:'Укажите свободное расстояние слева и справа'}
  ];

  async function request(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось сохранить положение кухни.')}return r.json()}
  async function save(nextInputs){inputs=nextInputs;visual={...visual,guided_inputs:inputs,guided_route_version:'2026-09-10-r4'};const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason:'Linear kitchen wall span'})});project=result.project||result;visual={...(project.scene?.visual_settings||visual)}}
  function goDimensions(){location.assign(`/dimensions?project=${encodeURIComponent(projectId)}`)}

  function renderChoices(){
    $('cards').hidden=false;$('inputStage').hidden=true;
    $('cards').innerHTML=choices.map(item=>`<button class="guided-card" type="button" data-value="${item.value}" data-symbol="${item.symbol}"><strong>${item.label}</strong><small>${item.note}</small></button>`).join('');
    $('cards').querySelectorAll('[data-value]').forEach(card=>card.addEventListener('click',async()=>{
      if(busy)return;busy=true;$('errorNode').hidden=true;selectedMode=card.dataset.value;
      try{
        if(selectedMode==='FULL_WALL'){
          await save({...inputs,linear_span_mode:selectedMode,linear_left_offset_mm:0,linear_right_offset_mm:0});goDimensions();return;
        }
        renderOffsets(selectedMode);
      }catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}finally{busy=false}
    }));
  }

  function field(label,id,value=0){return `<label>${label}<div class="input-wrap"><input id="${id}" type="number" min="0" step="1" inputmode="numeric" value="${value}"><span>мм</span></div></label>`}
  function renderOffsets(mode){
    $('title').textContent='Укажите свободное расстояние';$('subtitle').textContent='Эти размеры задают фактический участок стены, который займёт прямая кухня.';$('cards').hidden=true;$('inputStage').hidden=false;
    const left=Number(inputs.linear_left_offset_mm)||0,right=Number(inputs.linear_right_offset_mm)||0;
    let fields='';
    if(mode==='LEFT_OFFSET'||mode==='BOTH_OFFSETS')fields+=field('Отступ слева','linearLeft',left);
    if(mode==='RIGHT_OFFSET'||mode==='BOTH_OFFSETS')fields+=field('Отступ справа','linearRight',right);
    $('inputStage').innerHTML=`<div style="display:grid;gap:14px">${fields}</div><button class="primary-action" id="saveSpan" type="button">Сохранить и продолжить</button>`;
    $('saveSpan').addEventListener('click',async()=>{
      if(busy)return;
      const leftValue=mode==='RIGHT_OFFSET'?0:Math.round(Number($('linearLeft')?.value||0));
      const rightValue=mode==='LEFT_OFFSET'?0:Math.round(Number($('linearRight')?.value||0));
      if(!Number.isFinite(leftValue)||!Number.isFinite(rightValue)||leftValue<0||rightValue<0){$('errorNode').textContent='Введите корректные расстояния в миллиметрах.';$('errorNode').hidden=false;return}
      const wallLength=Number(project?.room?.geometry?.wall_length?.value_mm)||6000;
      if(leftValue+rightValue>=wallLength-300){$('errorNode').textContent='После отступов должно остаться не менее 300 мм для кухни.';$('errorNode').hidden=false;return}
      busy=true;
      try{await save({...inputs,linear_span_mode:mode,linear_left_offset_mm:leftValue,linear_right_offset_mm:rightValue});goDimensions()}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}finally{busy=false}
    });
  }

  $('backButton').addEventListener('click',()=>history.back());
  (async()=>{
    if(!projectId){$('errorNode').textContent='Проект не найден.';$('errorNode').hidden=false;return}
    if(!configuration.startsWith('WALL_')){goDimensions();return}
    try{project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};renderChoices()}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}
  })();
})();
