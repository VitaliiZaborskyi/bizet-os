(() => {
  const PROJECT_KEY='bizet_os_project_id',CONFIG_KEY='bizet_pilot_configuration';
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  let project=null,visual={},inputs={},activeModule=null,modules=[],scene=null,drag=null,dragMoved=false,dimensionsVisible=true;

  // Visual pilot proportions only. Furniture hard rules remain in the backend engine.
  const LOWER_DEPTH=560,PLINTH_H=100,WORKTOP_H=38,LOWER_TOTAL_H=900,LOWER_BODY_H=LOWER_TOTAL_H-PLINTH_H-WORKTOP_H;
  const UPPER_DEPTH=320,UPPER_HOOD_DEPTH=350,UPPER_MAX_H=1000,CUTLERY_W=400;

  async function request(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось загрузить модель.')}return r.json()}
  async function saveVisual(next,reason){visual=next;const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason})});project=result.project||result;visual={...(project.scene?.visual_settings||visual)};inputs={...(visual.guided_inputs||inputs)}}
  function measured(key,fallback){const value=project?.room?.geometry?.[key]?.value_mm;return Number.isFinite(value)&&value>0?value:fallback}
  function roomValues(){return{lengthMm:measured('wall_length',6000),depthMm:measured('wall_depth',4200),heightMm:measured('room_height',2800)}}
  function configuration(){return sessionStorage.getItem(CONFIG_KEY)||localStorage.getItem(CONFIG_KEY)||'WALL_CENTER'}
  function activeWalls(){const map={WALL_CENTER:['A'],WALL_LEFT:['A'],WALL_RIGHT:['A'],L_LEFT:['A','B'],L_RIGHT:['A','C'],U_SHAPE:['A','B','C'],CUSTOM:['A']};return map[configuration()]||['A']}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

  let camera={yaw:0,pitch:.33,distanceScale:1};
  function resetCamera(){camera=window.BizetPilot3D?.cameraDefaults?.(configuration())||{yaw:0,pitch:.33,distanceScale:1}}

  function sinkWall(){const config=configuration(),side=inputs.sink_side;if(config==='L_LEFT')return side==='LEFT'?'B':'A';if(config==='L_RIGHT')return side==='RIGHT'?'C':'A';if(config==='U_SHAPE')return side==='LEFT'?'B':'C';return'A'}
  function baseModule(id,label,width,kind,wall='A',extra={}){return{id,label,kind,wall,w:Math.max(100,Number(width)||600),d:LOWER_DEPTH,h:LOWER_BODY_H,z:PLINTH_H,level:'lower',anchor:true,...extra}}

  function collectedLower(){
    const list=[],walls=activeWalls();
    if(inputs.fridge_present==='YES'){
      const width=Number(inputs.fridge_width_mm)||600,tallHeight=Math.max(1500,Math.min(roomValues().heightMm-140,2100));
      if(inputs.fridge_type==='BUILT_IN'&&width===1200){list.push(baseModule('fridge-left','Холодильник L',600,'FRIDGE','A',{tall:true,h:tallHeight,content:inputs.fridge_left_unit||'PENDING'}));list.push(baseModule('fridge-right','Холодильник R',600,'FRIDGE','A',{tall:true,h:tallHeight,content:inputs.fridge_right_unit||'PENDING'}))}
      else list.push(baseModule('fridge','Холодильник',width,'FRIDGE','A',{tall:true,h:tallHeight,content:inputs.fridge_content||'PENDING'}));
    }
    list.push(baseModule('sink','Мойка',600,'SINK',sinkWall(),{widthStatus:'PILOT_VISUAL_PLACEHOLDER',sink_mount_type:inputs.sink_mount_type,sink_bowl_count:inputs.sink_bowl_count,sink_disposer:inputs.sink_disposer,sink_filters:inputs.sink_filters}));
    if(inputs.dishwasher_type){const wall=walls.includes(inputs.dishwasher_wall)?inputs.dishwasher_wall:'A';list.push(baseModule('dishwasher','Посудомоечная машина',Number(inputs.dishwasher_width_mm)||600,'DISHWASHER',wall))}
    const cooktopWall=walls.includes(inputs.cooktop_wall)?inputs.cooktop_wall:'A';list.push(baseModule('cooktop','Варочная панель',Number(inputs.cooktop_width_mm)||600,'COOKTOP',cooktopWall,{widthStatus:inputs.cooktop_width_mm==='CUSTOM'?'PILOT_VISUAL_PLACEHOLDER':'USER_SELECTED'}));
    if(inputs.oven_location){const wall=walls.includes(inputs.oven_wall)?inputs.oven_wall:'A';if(inputs.oven_location==='TALL'){const tallHeight=Math.max(1500,Math.min(roomValues().heightMm-140,2100));list.push(baseModule('oven','Пенал с духовкой',600,'TALL_OVEN',wall,{tall:true,h:tallHeight,widthStatus:'PILOT_VISUAL_PLACEHOLDER',microwave_present:inputs.microwave_present,microwave_type:inputs.microwave_type,coffee_present:inputs.coffee_present,coffee_type:inputs.coffee_type,coffee_support:inputs.coffee_support,coffee_compartment:inputs.coffee_compartment,coffee_front_opening:inputs.coffee_front_opening}))}else list.push(baseModule('oven','Духовой шкаф',600,'OVEN',wall,{widthStatus:'PILOT_VISUAL_PLACEHOLDER'}))}
    return list;
  }

  function wallSpan(wall,room){return wall==='A'?room.lengthMm:room.depthMm}
  function runBounds(wall,room){
    const full=wallSpan(wall,room);
    if(wall==='A'&&configuration().startsWith('WALL_')){const left=Math.max(0,Number(inputs.linear_left_offset_mm)||0),right=Math.max(0,Number(inputs.linear_right_offset_mm)||0);return{start:left,end:Math.max(left+300,full-right),span:Math.max(300,full-left-right)}}
    return{start:0,end:full,span:full};
  }

  function arrangeWall(wall,list,room){
    const bounds=runBounds(wall,room);let ordered=[...list];
    if(wall==='A'&&inputs.fridge_present==='YES'){
      const fridge=ordered.filter(m=>m.kind==='FRIDGE'),other=ordered.filter(m=>m.kind!=='FRIDGE');ordered=inputs.fridge_side==='RIGHT'?other.concat(fridge):fridge.concat(other);
    }
    let used=ordered.reduce((sum,m)=>sum+m.w,0);
    if(wall==='A'&&bounds.span-used>=CUTLERY_W){const cutlery=baseModule('cutlery','Ящики для приборов',CUTLERY_W,'DRAWERS','A',{anchor:false,system:true});const idx=ordered.findIndex(m=>m.kind==='SINK');ordered.splice(idx>=0?idx+1:ordered.length,0,cutlery);used+=CUTLERY_W}
    const remaining=bounds.span-used;if(remaining>=300)ordered.push(baseModule(`system-fill-${wall}`,'Модуль',remaining,'HINGED',wall,{anchor:false,pending:true,system:true}));
    let cursor=bounds.start;
    return ordered.map(m=>{
      const runSize=m.w,offset=Number((visual.module_offsets_mm||{})[m.id])||0;let placed={...m,runSize,runPosition:cursor};
      if(wall==='A'){placed.x=clamp(cursor+offset,bounds.start,Math.max(bounds.start,bounds.end-runSize));placed.y=room.depthMm-LOWER_DEPTH}
      else if(wall==='B'){placed.x=0;placed.y=clamp(room.depthMm-cursor-runSize-offset,0,room.depthMm-runSize);placed.d=runSize;placed.w=LOWER_DEPTH}
      else{placed.x=room.lengthMm-LOWER_DEPTH;placed.y=clamp(room.depthMm-cursor-runSize-offset,0,room.depthMm-runSize);placed.d=runSize;placed.w=LOWER_DEPTH}
      cursor+=runSize;return placed;
    });
  }

  function buildLower(){const room=roomValues(),raw=collectedLower(),walls=activeWalls(),grouped={A:[],B:[],C:[]};raw.forEach(m=>(grouped[m.wall]||grouped.A).push(m));return walls.flatMap(w=>arrangeWall(w,grouped[w],room))}

  function upperFromLower(lower){
    const room=roomValues(),gap=Math.max(550,Number(inputs.upper_gap_mm)||600),bottom=LOWER_TOTAL_H+gap,height=Math.min(UPPER_MAX_H,room.heightMm-bottom-50);if(height<220)return[];
    const result=[],hoodWidth=Number(inputs.hood_width_mm)||600,hoodDepth=inputs.hood_type==='BUILT_IN'?UPPER_HOOD_DEPTH:UPPER_DEPTH;
    lower.filter(m=>!m.tall&&m.level==='lower').forEach(m=>{
      if(m.kind==='COOKTOP'){
        if(m.wall==='A'){const center=m.x+m.w/2,x=clamp(center-hoodWidth/2,0,room.lengthMm-hoodWidth);result.push({id:`upper-hood-${m.wall}`,label:'Вытяжка',kind:'UPPER_HOOD',wall:m.wall,x,y:room.depthMm-hoodDepth,z:bottom,w:hoodWidth,d:hoodDepth,h:height,level:'upper',anchor:true,hood_type:inputs.hood_type,hood_subtype:inputs.hood_integrated_subtype,hood_width_mm:hoodWidth})}
        else{const center=m.y+m.d/2,y=clamp(center-hoodWidth/2,0,room.depthMm-hoodWidth),x=m.wall==='B'?0:room.lengthMm-hoodDepth;result.push({id:`upper-hood-${m.wall}`,label:'Вытяжка',kind:'UPPER_HOOD',wall:m.wall,x,y,z:bottom,w:hoodDepth,d:hoodWidth,h:height,level:'upper',anchor:true,hood_type:inputs.hood_type,hood_subtype:inputs.hood_integrated_subtype,hood_width_mm:hoodWidth})}
        return;
      }
      if(m.wall==='A')result.push({id:`upper-${m.id}`,label:'Верхний модуль',kind:'UPPER',wall:'A',x:m.x,y:room.depthMm-UPPER_DEPTH,z:bottom,w:m.w,d:UPPER_DEPTH,h:height,level:'upper',anchor:false,system:true,pending:m.pending});
      else result.push({id:`upper-${m.id}`,label:'Верхний модуль',kind:'UPPER',wall:m.wall,x:m.wall==='B'?0:room.lengthMm-UPPER_DEPTH,y:m.y,z:bottom,w:UPPER_DEPTH,d:m.d,h:height,level:'upper',anchor:false,system:true,pending:m.pending});
    });
    return result;
  }

  function numbered(all){
    const wallRank={B:0,A:1,C:2};
    const sorted=[...all].sort((a,b)=>{const la=a.level==='upper'?1:0,lb=b.level==='upper'?1:0;if(la!==lb)return la-lb;const wa=wallRank[a.wall]??1,wb=wallRank[b.wall]??1;if(wa!==wb)return wa-wb;const pa=a.wall==='A'?a.x:a.y,pb=b.wall==='A'?b.x:b.y;return pa-pb});
    sorted.forEach((m,i)=>m.number=i+1);return sorted;
  }

  function buildModules(){const lower=buildLower(),upper=upperFromLower(lower);return numbered(lower.concat(upper))}

  function renderStrip(){
    $('moduleStrip').innerHTML=modules.map(m=>`<button class="module-strip-button${m.system||m.pending?' is-system':''}" type="button" data-module="${m.id}"><strong>${m.number}</strong><span>${m.label}</span></button>`).join('');
    $('moduleStrip').querySelectorAll('[data-module]').forEach(btn=>btn.addEventListener('click',()=>openModule(btn.dataset.module)));
  }
  function renderScene(engineOk=false){modules=buildModules();scene=window.BizetPilot3D.drawKitchenScene($('modelCanvas'),{room:roomValues(),configuration:configuration(),activeWalls:activeWalls(),modules,camera,showDimensions:dimensionsVisible});renderStrip();$('modelStatus').textContent=engineOk?'Module Engine доступен · текущий 3D уже использует подтверждённые исходные точки; остаточное деление ещё не заморожено.':'3D-пилот · исходные точки собраны, незакреплённое остаточное деление остаётся визуальным слоем.'}

  function offsets(){return{...(visual.module_offsets_mm||{})}}
  function detailText(m){
    if(m.kind==='SINK'){const mount={TOP_MOUNT:'накладная',FLUSH:'вровень',UNDERMOUNT:'под столешницей'}[m.sink_mount_type]||'тип монтажа не указан';return `Мойка: ${mount}, чаш: ${m.sink_bowl_count||'—'}, измельчитель: ${m.sink_disposer==='YES'?'да':'нет'}, фильтры: ${m.sink_filters==='YES'?'да':'нет'}.`}
    if(m.kind==='TALL_OVEN'){const parts=['духовка'];if(m.microwave_present==='YES')parts.push(m.microwave_type==='BUILT_IN'?'встраиваемая микроволновка 600×450':'отдельностоящая микроволновка, отделение H350');if(m.coffee_present==='YES')parts.push(m.coffee_type==='BUILT_IN'?'встраиваемая кофемашина 600×450':'отдельностоящая кофемашина');return `Пенал: ${parts.join(' · ')}.`}
    if(m.kind==='UPPER_HOOD')return `Вытяжка ${m.hood_width_mm||'—'} мм · ${m.hood_type==='BUILT_IN'?'встраиваемая':'отдельностоящая'}.`;
    if(m.pending)return'Остаточное пространство. Финальное количество и ширины модулей должен определить Module Engine, а не интерфейс.';
    return'Пилот прямого редактирования модуля. Положение сохраняется относительно базовой точки.';
  }
  function openModule(id){activeModule=modules.find(m=>m.id===id)||null;if(!activeModule)return;$('moduleTitle').textContent=`${activeModule.number}. ${activeModule.label}`;$('moduleCopy').textContent=detailText(activeModule);$('moduleOffset').textContent=`${Number(offsets()[activeModule.id])||0} мм`;$('moduleDialog').showModal?.()}
  async function nudge(delta){if(!activeModule||activeModule.pending||activeModule.level==='upper')return;const next=offsets();next[activeModule.id]=(Number(next[activeModule.id])||0)+delta;await saveVisual({...visual,module_offsets_mm:next,module_direct_edit_status:'PILOT_USER_OFFSET'},`Direct module offset ${activeModule.id}`);$('moduleOffset').textContent=`${next[activeModule.id]} мм`;renderScene(false);$('modelStatus').textContent='Смещение сохранено и сразу видно в 3D. Полный зависимый пересчёт соседних модулей — следующий слой.'}

  const canvas=$('modelCanvas');
  canvas.addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:camera.yaw,pitch:camera.pitch};dragMoved=false;canvas.setPointerCapture?.(event.pointerId)});
  canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>4)dragMoved=true;if(!dragMoved)return;camera.yaw=drag.yaw-dx*.008;camera.pitch=clamp(drag.pitch+dy*.006,.08,.85);renderScene(false)});
  function endPointer(event){if(!drag||drag.id!==event.pointerId)return;const wasMoved=dragMoved;drag=null;canvas.releasePointerCapture?.(event.pointerId);if(!wasMoved&&scene){const rect=canvas.getBoundingClientRect(),id=scene.hitTest(event.clientX-rect.left,event.clientY-rect.top);if(id)openModule(id)}}
  canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',()=>{drag=null});
  canvas.addEventListener('wheel',event=>{event.preventDefault();camera.distanceScale=clamp(camera.distanceScale+(event.deltaY>0?.08:-.08),.58,1.75);renderScene(false)},{passive:false});

  $('modelDimensionsToggle').addEventListener('click',()=>{dimensionsVisible=!dimensionsVisible;$('modelDimensionsToggle').textContent=`Размеры · ${dimensionsVisible?'вкл':'выкл'}`;$('modelDimensionsToggle').setAttribute('aria-pressed',String(dimensionsVisible));renderScene(false)});
  $('moduleClose').addEventListener('click',()=>$('moduleDialog').close?.());document.querySelectorAll('[data-nudge]').forEach(btn=>btn.addEventListener('click',()=>nudge(Number(btn.dataset.nudge)).catch(()=>{})));
  $('materialsButton').addEventListener('click',()=>location.assign(`/materials?project=${encodeURIComponent(projectId)}`));$('backButton').addEventListener('click',()=>history.back());
  window.addEventListener('resize',()=>requestAnimationFrame(()=>renderScene(false)));window.addEventListener('bizet:themechange',()=>requestAnimationFrame(()=>renderScene(false)));

  (async()=>{
    if(!projectId){$('modelStatus').textContent='Проект не найден';return}let engineOk=false;
    try{const recalc=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});project=recalc.project;engineOk=!!recalc.legacy_engine_candidate_count}catch(_){project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`)}
    visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};resetCamera();renderScene(engineOk);
  })().catch(error=>{$('modelStatus').textContent=error.message});
})();
