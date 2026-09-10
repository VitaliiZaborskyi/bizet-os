(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const CONFIG_KEY='bizet_pilot_configuration';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  let project=null,visual={},inputs={},activeModule=null,modules=[],scene=null;

  const LOWER_DEPTH=560;
  const PLINTH_H=100;
  const WORKTOP_H=38;
  const LOWER_TOTAL_H=900;
  const LOWER_BODY_H=LOWER_TOTAL_H-PLINTH_H-WORKTOP_H;
  const CUTLERY_W=400;

  async function request(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось загрузить модель.')}return r.json()}
  async function saveVisual(next,reason){visual=next;const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason})});project=result.project||result;visual={...(project.scene?.visual_settings||visual)};inputs={...(visual.guided_inputs||inputs)}}

  function measured(key,fallback){const value=project?.room?.geometry?.[key]?.value_mm;return Number.isFinite(value)&&value>0?value:fallback}
  function roomValues(){return{lengthMm:measured('wall_length',6000),depthMm:measured('wall_depth',4200),heightMm:measured('room_height',2800)}}
  function configuration(){return sessionStorage.getItem(CONFIG_KEY)||localStorage.getItem(CONFIG_KEY)||project?.room?.configuration||'WALL_CENTER'}
  function activeWalls(){const map={WALL_CENTER:['A'],WALL_LEFT:['A'],WALL_RIGHT:['A'],L_LEFT:['A','B'],L_RIGHT:['A','C'],U_SHAPE:['A','B','C'],CUSTOM:['A']};return map[configuration()]||['A']}

  function sinkWall(){
    const config=configuration(),side=inputs.sink_side;
    if(config==='L_LEFT')return side==='LEFT'?'B':'A';
    if(config==='L_RIGHT')return side==='RIGHT'?'C':'A';
    if(config==='U_SHAPE')return side==='LEFT'?'B':'C';
    return'A';
  }

  function baseModule(id,label,width,kind,wall='A',extra={}){
    return{id,label,shortLabel:label,kind,wall,w:Math.max(100,Number(width)||600),d:LOWER_DEPTH,h:LOWER_BODY_H,z:PLINTH_H,anchor:true,...extra};
  }

  function collectedModules(){
    const list=[];
    const walls=activeWalls();
    if(inputs.fridge_present==='YES'){
      const width=Number(inputs.fridge_width_mm)||600;
      const tallHeight=Math.max(1500,Math.min(roomValues().heightMm-140,2100));
      if(inputs.fridge_type==='BUILT_IN'&&width===1200){
        list.push(baseModule('fridge-left','Холод. L',600,'FRIDGE','A',{tall:true,h:tallHeight,content:inputs.fridge_left_unit||'PENDING'}));
        list.push(baseModule('fridge-right','Холод. R',600,'FRIDGE','A',{tall:true,h:tallHeight,content:inputs.fridge_right_unit||'PENDING'}));
      }else{
        list.push(baseModule('fridge','Холодильник',width,'FRIDGE','A',{tall:true,h:tallHeight,content:inputs.fridge_content||'PENDING'}));
      }
    }

    list.push(baseModule('sink','Мойка',600,'SINK',sinkWall(),{widthStatus:'PILOT_VISUAL_PLACEHOLDER'}));

    if(inputs.dishwasher_type){
      const dwWall=walls.includes(inputs.dishwasher_wall)?inputs.dishwasher_wall:'A';
      list.push(baseModule('dishwasher','ПММ',Number(inputs.dishwasher_width_mm)||600,'DISHWASHER',dwWall));
    }

    const cooktopWall=walls.includes(inputs.cooktop_wall)?inputs.cooktop_wall:'A';
    const cooktopWidth=Number(inputs.cooktop_width_mm)||600;
    list.push(baseModule('cooktop','Варочная',cooktopWidth,'COOKTOP',cooktopWall,{widthStatus:inputs.cooktop_width_mm==='CUSTOM'?'PILOT_VISUAL_PLACEHOLDER':'USER_SELECTED'}));

    if(inputs.oven_location){
      const ovenWall=walls.includes(inputs.oven_wall)?inputs.oven_wall:'A';
      if(inputs.oven_location==='TALL'){
        const tallHeight=Math.max(1500,Math.min(roomValues().heightMm-140,2100));
        list.push(baseModule('oven','Пенал + духовка',600,'TALL_OVEN',ovenWall,{tall:true,h:tallHeight,widthStatus:'PILOT_VISUAL_PLACEHOLDER'}));
      }else{
        list.push(baseModule('oven','Духовка',600,'OVEN',ovenWall,{widthStatus:'PILOT_VISUAL_PLACEHOLDER'}));
      }
    }
    return list;
  }

  function spanForWall(wall,room){return wall==='A'?room.lengthMm:room.depthMm}

  function arrangeWall(wall,list,room){
    const span=spanForWall(wall,room);
    let ordered=[...list];
    if(wall==='A'&&inputs.fridge_present==='YES'&&inputs.fridge_side==='RIGHT'){
      const fridge=ordered.filter(m=>m.kind==='FRIDGE');
      ordered=ordered.filter(m=>m.kind!=='FRIDGE').concat(fridge);
    }
    if(wall==='A'&&inputs.fridge_present==='YES'&&inputs.fridge_side==='LEFT'){
      const fridge=ordered.filter(m=>m.kind==='FRIDGE');
      ordered=fridge.concat(ordered.filter(m=>m.kind!=='FRIDGE'));
    }

    let used=ordered.reduce((sum,m)=>sum+m.w,0);
    if(wall==='A'&&span-used>=CUTLERY_W){
      const cutlery=baseModule('cutlery','Ящики',CUTLERY_W,'DRAWERS','A',{anchor:false,system:true});
      const sinkIndex=ordered.findIndex(m=>m.kind==='SINK');
      ordered.splice(sinkIndex>=0?sinkIndex+1:ordered.length,0,cutlery);
      used+=CUTLERY_W;
    }
    const remaining=span-used;
    if(remaining>=300){ordered.push(baseModule(`system-fill-${wall}`,'Заполнение системой',remaining,'HINGED',wall,{anchor:false,pending:true,system:true}))}

    let cursor=0;
    return ordered.map(m=>{
      const offset=Number((visual.module_offsets_mm||{})[m.id])||0;
      let placed={...m};
      if(wall==='A'){
        placed.x=Math.max(0,Math.min(room.lengthMm-m.w,cursor+offset));
        placed.y=room.depthMm-LOWER_DEPTH;
      }else if(wall==='B'){
        placed.x=0;
        placed.y=Math.max(0,room.depthMm-cursor-m.w-offset);
        placed.d=m.w; placed.w=LOWER_DEPTH;
      }else{
        placed.x=room.lengthMm-LOWER_DEPTH;
        placed.y=Math.max(0,room.depthMm-cursor-m.w-offset);
        placed.d=m.w; placed.w=LOWER_DEPTH;
      }
      cursor+=m.w;
      return placed;
    });
  }

  function buildVisualModules(){
    const room=roomValues();
    const raw=collectedModules();
    const grouped={A:[],B:[],C:[]};
    raw.forEach(m=>(grouped[m.wall]||grouped.A).push(m));
    return ['A','B','C'].flatMap(wall=>arrangeWall(wall,grouped[wall],room));
  }

  function renderScene(engineOk=false){
    modules=buildVisualModules();
    const canvas=$('modelCanvas');
    if(!canvas||!window.BizetPilot3D)return;
    scene=window.BizetPilot3D.drawKitchenScene(canvas,{room:roomValues(),configuration:configuration(),modules});
    $('modelStatus').textContent=engineOk
      ? 'Module Engine вызван · 3D показывает подтверждённые якоря и безопасный остаточный placeholder'
      : '3D UX-пилот · якорные модули видимы, незакреплённое заполнение не имитируется';
  }

  function offsets(){return{...(visual.module_offsets_mm||{})}}
  function openModule(id){
    activeModule=modules.find(m=>m.id===id)||{id,label:'Модуль'};
    const value=Number(offsets()[id])||0;
    $('moduleTitle').textContent=activeModule.label;
    $('moduleCopy').textContent=activeModule.pending
      ? 'Это остаточное пространство, которое позже делит утверждённый Module Engine. Сейчас мы не придумываем количество и ширины модулей.'
      : activeModule.widthStatus==='PILOT_VISUAL_PLACEHOLDER'
        ? 'Модуль уже виден в 3D, но его точная ширина пока не была запрошена у клиента и остаётся визуальным placeholder.'
        : 'Пилот прямого редактирования модуля. Смещение сохраняется относительно базовой точки; полноценный параметрический пересчёт подключается следующим слоем.';
    $('moduleOffset').textContent=`${value} мм`;
    $('moduleDialog').showModal?.();
  }

  async function nudge(delta){
    if(!activeModule||activeModule.pending)return;
    const nextOffsets=offsets();
    nextOffsets[activeModule.id]=(Number(nextOffsets[activeModule.id])||0)+delta;
    await saveVisual({...visual,module_offsets_mm:nextOffsets,module_direct_edit_status:'PILOT_USER_OFFSET'},`Direct module offset ${activeModule.id}`);
    $('moduleOffset').textContent=`${nextOffsets[activeModule.id]} мм`;
    renderScene(false);
    $('modelStatus').textContent='Смещение сохранено и видно в 3D · полный зависимый пересчёт подключается следующим слоем';
  }

  $('modelCanvas').addEventListener('click',event=>{
    if(!scene)return;
    const rect=$('modelCanvas').getBoundingClientRect();
    const id=scene.hitTest(event.clientX-rect.left,event.clientY-rect.top);
    if(id)openModule(id);
  });
  $('moduleClose').addEventListener('click',()=>$('moduleDialog').close?.());
  document.querySelectorAll('[data-nudge]').forEach(btn=>btn.addEventListener('click',()=>nudge(Number(btn.dataset.nudge)).catch(()=>{})));
  $('materialsButton').addEventListener('click',()=>location.assign(`/materials?project=${encodeURIComponent(projectId)}`));
  $('backButton').addEventListener('click',()=>history.back());
  $('settingsButton').addEventListener('click',()=>alert('BIZET OS · пилот маршрута'));
  window.addEventListener('resize',()=>requestAnimationFrame(()=>renderScene(false)));

  (async()=>{
    if(!projectId){$('modelStatus').textContent='Проект не найден';return}
    let engineOk=false;
    try{
      const recalc=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});
      project=recalc.project;engineOk=!!recalc.legacy_engine_candidate_count;
    }catch(_){project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`)}
    visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};
    renderScene(engineOk);
  })().catch(error=>{$('modelStatus').textContent=error.message});
})();
