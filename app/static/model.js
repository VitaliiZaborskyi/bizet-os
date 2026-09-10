(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  let project=null,visual={},inputs={},activeModule=null;

  async function request(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось загрузить модель.')}return r.json()}
  async function saveVisual(next,reason){visual=next;const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason})});project=result.project||result;visual={...(project.scene?.visual_settings||visual)};inputs={...(visual.guided_inputs||inputs)}}

  function fallbackModules(){
    const list=[];
    if(inputs.fridge_present==='YES')list.push({id:'fridge',label:'Холодильник',anchor:true});
    list.push({id:'sink',label:'Мойка',anchor:true});
    if(inputs.dishwasher_type)list.push({id:'dishwasher',label:'ПММ',anchor:true});
    list.push({id:'cooktop',label:'Варочная',anchor:true});
    if(inputs.oven_location==='TALL')list.push({id:'oven',label:'Пенал',anchor:true});
    list.push({id:'system-fill',label:'Заполнение системой',pending:true});
    return list;
  }

  function candidateModules(){
    const direct=project?.furniture?.modules;
    if(Array.isArray(direct)&&direct.length)return direct.map((m,i)=>({id:m.id||`module-${i+1}`,label:m.type||m.name||`Модуль ${i+1}`,anchor:false,raw:m}));
    return null;
  }

  function renderModules(mods,engineOk){
    $('modules').innerHTML=mods.map(m=>`<button class="module-block${m.anchor?' anchor':''}${m.pending?' pending':''}" data-module="${m.id}" type="button"><span>${m.label}</span></button>`).join('');
    $('modules').querySelectorAll('[data-module]').forEach(btn=>btn.addEventListener('click',()=>openModule(btn.dataset.module,mods)));
    $('modelStatus').textContent=engineOk?'Алгоритм пересчёта вызван · модель доступна для QA':'UI-пилот · точное заполнение пустот не имитируется';
  }

  function offsets(){return {...(visual.module_offsets_mm||{})}}
  function openModule(id,mods){
    activeModule=mods.find(m=>m.id===id)||{id,label:'Модуль'};
    const value=Number(offsets()[id])||0;
    $('moduleTitle').textContent=activeModule.label;
    $('moduleCopy').textContent=activeModule.pending?'Это место, где должен отработать утверждённый алгоритм заполнения пустот. Количество и размеры модулей в placeholder не придумываются.':'Пилот прямого редактирования модуля. Изменение координаты сохраняется как пользовательское смещение и должно запускать зависимый параметрический пересчёт.';
    $('moduleOffset').textContent=`${value} мм`;
    $('moduleDialog').showModal?.();
  }

  async function nudge(delta){
    if(!activeModule||activeModule.pending)return;
    const nextOffsets=offsets();
    nextOffsets[activeModule.id]=(Number(nextOffsets[activeModule.id])||0)+delta;
    await saveVisual({...visual,module_offsets_mm:nextOffsets,module_direct_edit_status:'PILOT_USER_OFFSET'},`Direct module offset ${activeModule.id}`);
    $('moduleOffset').textContent=`${nextOffsets[activeModule.id]} мм`;
    $('modelStatus').textContent='Смещение сохранено · полный параметрический пересчёт подключается следующим слоем';
  }

  $('moduleClose').addEventListener('click',()=>$('moduleDialog').close?.());
  document.querySelectorAll('[data-nudge]').forEach(btn=>btn.addEventListener('click',()=>nudge(Number(btn.dataset.nudge)).catch(()=>{})));
  $('materialsButton').addEventListener('click',()=>location.assign(`/materials?project=${encodeURIComponent(projectId)}`));
  $('backButton').addEventListener('click',()=>history.back());
  $('settingsButton').addEventListener('click',()=>alert('BIZET OS · пилот маршрута'));

  (async()=>{
    if(!projectId){$('modelStatus').textContent='Проект не найден';return}
    let engineOk=false;
    try{
      const recalc=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});
      project=recalc.project;engineOk=!!recalc.legacy_engine_candidate_count;
    }catch(_){project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`)}
    visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};
    const mods=candidateModules()||fallbackModules();renderModules(mods,engineOk);
  })().catch(error=>{$('modelStatus').textContent=error.message});
})();
