(() => {
  const PROJECT_KEY='bizet_os_project_id',CONFIG_KEY='bizet_pilot_configuration';
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  const VIEW_NORMAL='NORMAL_KITCHEN_VIEW',VIEW_FOCUS='MODULE_FOCUS_MODE';
  let project=null,visual={},inputs={},activeModule=null,modules=[],scene=null,drag=null,dragMoved=false;
  let moduleDraft=null,moduleDraftBase=null,moduleDraftBasePrice=0;
  let viewMode=VIEW_NORMAL,focusCamera={yaw:-.36,pitch:.34,distanceScale:.72},focusDimensionsVisible=true,normalDimensionsVisible=true;
  let layoutWarnings=[],preparedViewMode=null,stageResizeFrame=0,lastStageSize='',focusCanvasResetFrames=0,focusPaintToken=0;
  const LIMITS=window.BizetR10Rules?.moduleLimitsMm||{STRAIGHT_MAX:900,CORNER_MAX:1250,PREFERRED_FILL:600,HINGED_FACADE_MAX:597,MIN_STANDARD_MODULE:300};
  const ERGO=window.BizetR10Rules?.ergonomicsMm||{SINK_COOKTOP_HARD_MIN:500,SINK_COOKTOP_PREFERRED:900,SINK_OVEN_SAME_WALL_MIN:1000,TRIANGLE_LEG_MIN:1200,TRIANGLE_LEG_MAX:2700,TRIANGLE_SUM_MAX:7900};
  const CORNER=window.BizetR10Rules?.cornerRules||{ZONE_DEPTH:600,MAX_CORNER_MODULE:1250,ALLOWED_KINDS:['SINK','CORNER']};
  const COMPOSITION=window.BizetR10Rules?.compositionRules||{centerPrimaryApplianceOnLongRun:true,skipWhenCommunicationsConfirmed:true};

  // Visual pilot proportions only. Furniture hard rules remain in the backend engine.
  const LOWER_DEPTH=560,DEFAULT_PLINTH_H=100,WORKTOP_H=38,LOWER_TOTAL_H=900;
  const UPPER_DEPTH=320,UPPER_HOOD_DEPTH=350,UPPER_MAX_H=1000,CUTLERY_W=400;
  function plinthHeight(){return clamp(Math.round(Number(inputs.plinth_height_mm??DEFAULT_PLINTH_H)||DEFAULT_PLINTH_H),0,300)}
  function lowerBodyHeight(){return Math.max(300,LOWER_TOTAL_H-plinthHeight()-WORKTOP_H)}
  function visibleTallDrawerLimit(){return LOWER_TOTAL_H-WORKTOP_H}

  async function request(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось загрузить модель.')}return r.json()}
  async function saveVisual(next,reason){visual=next;const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason})});project=result.project||result;visual={...(project.scene?.visual_settings||visual)};inputs={...(visual.guided_inputs||inputs)}}
  function measured(key,fallback){const value=project?.room?.geometry?.[key]?.value_mm;return Number.isFinite(value)&&value>0?value:fallback}
  function roomValues(){return{lengthMm:measured('wall_length',6000),depthMm:measured('wall_depth',4200),heightMm:measured('room_height',2800)}}
  function configuration(){return sessionStorage.getItem(CONFIG_KEY)||localStorage.getItem(CONFIG_KEY)||'WALL_CENTER'}
  function activeWalls(){const map={WALL_CENTER:['A'],WALL_LEFT:['A'],WALL_RIGHT:['A'],L_LEFT:['A','B'],L_RIGHT:['A','C'],U_SHAPE:['A','B','C'],CUSTOM:['A']};return map[configuration()]||['A']}
  function autoWall(requested,avoidWall=null,preferWall='A'){
    const walls=activeWalls();
    if(requested&&requested!=='AUTO'&&walls.includes(requested))return requested;
    if(preferWall&&walls.includes(preferWall)&&preferWall!==avoidWall)return preferWall;
    return walls.find(w=>w!==avoidWall)||walls[0]||'A';
  }
  function cornerEdgesForWall(wall){
    const cfg=configuration(),edges=new Set();
    if((cfg==='L_LEFT'||cfg==='U_SHAPE')&&wall==='A')edges.add('START');
    if((cfg==='L_RIGHT'||cfg==='U_SHAPE')&&wall==='A')edges.add('END');
    if((cfg==='L_LEFT'||cfg==='U_SHAPE')&&wall==='B')edges.add('START');
    if((cfg==='L_RIGHT'||cfg==='U_SHAPE')&&wall==='C')edges.add('START');
    return edges;
  }
  function isOvenModule(m){return !!m&&(m.kind==='TALL_OVEN'||(m.kind==='COOKTOP'&&m.oven_appliance_present))}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function freestandingGap(width){
    const w=Math.max(300,Number(width)||600);
    if(w<=600)return 15;
    if(w<=900)return 30;
    return 50;
  }
  function isCornerModule(m){return !!m&&(m.kind==='CORNER'||m.corner===true)}
  function runWidth(m){return m?.wall==='A'?Number(m.w)||0:Number(m.d||m.w)||0}
  function maxRunFor(m){
    if(m?.freestanding===true)return Math.max(LIMITS.STRAIGHT_MAX,Number(m?.runSize)||Number(m?.w)||runWidth(m)||LIMITS.STRAIGHT_MAX);
    return isCornerModule(m)?LIMITS.CORNER_MAX:LIMITS.STRAIGHT_MAX;
  }
  function hingedFacadeCountFor(m){
    const run=Math.max(100,runWidth(m)||Number(m?.w)||600),available=Math.max(100,run-3);
    return Math.max(1,Math.ceil(available/LIMITS.HINGED_FACADE_MAX));
  }
  function pushWarning(code,text){if(!layoutWarnings.some(w=>w.code===code&&w.text===text))layoutWarnings.push({code,text})}
  function syncConstraintBanner(){
    const el=$('constraintBanner'),btn=$('constraintButton');if(!el||!btn)return;
    if(!layoutWarnings.length){
      el.hidden=true;el.innerHTML='';btn.hidden=true;btn.classList.remove('is-warning');btn.setAttribute('aria-expanded','false');return;
    }
    btn.hidden=false;btn.classList.add('is-warning');btn.title=`Предупреждения проекта: ${layoutWarnings.length}`;
    el.innerHTML='<strong>ПРОВЕРЬТЕ КОНФИГУРАЦИЮ</strong>'+layoutWarnings.map(w=>'<p>'+w.text+'</p>').join('');
    if(btn.getAttribute('aria-expanded')!=='true')el.hidden=true;
  }
  function syncFocusControls(){
    const inFocus=viewMode===VIEW_FOCUS;
    document.body.classList.toggle('r10-module-focus',inFocus);
    const back=$('focusBackButton'),dims=$('modelDimensionsToggle'),label=$('focusModuleLabel'),ribbon=$('focusVariantRibbon'),editor=$('moduleEditPanel');
    const normalCanvas=$('modelCanvas'),focusCanvas=$('focusCanvas');
    const kitchenVariants=document.querySelector('.r8-variant-controls');
    if(normalCanvas)normalCanvas.setAttribute('aria-hidden',String(inFocus));
    if(focusCanvas)focusCanvas.setAttribute('aria-hidden',String(!inFocus));
    if(back)back.hidden=!inFocus;
    if(kitchenVariants)kitchenVariants.hidden=inFocus;
    if(label){
      label.hidden=!inFocus||!activeModule;
      if(inFocus&&activeModule)label.textContent=`${activeModule.number} · ${activeModule.label}`;
    }
    if(ribbon)ribbon.hidden=!inFocus;
    if(editor)editor.hidden=!inFocus||!activeModule;
    if(dims){
      const on=inFocus?focusDimensionsVisible:normalDimensionsVisible;
      dims.hidden=false;dims.textContent='📏';dims.setAttribute('aria-label',on?'Скрыть размеры':'Показать размеры');dims.title=on?'Скрыть размеры':'Показать размеры';dims.setAttribute('aria-pressed',String(on));
    }
  }
  function prepareRenderLayout(){
    // R10.3.6: focus/normal CSS changes the canvas geometry. Apply the UI state BEFORE sizing/drawing the canvas.
    syncFocusControls();
    if(preparedViewMode!==viewMode){
      preparedViewMode=viewMode;
      const stage=$('modelStage');
      if(stage)void stage.offsetHeight;
    }
  }
  function scheduleRenderAfterLayout(reason='layout'){
    cancelAnimationFrame(stageResizeFrame);
    stageResizeFrame=requestAnimationFrame(()=>{
      if(!project||!window.BizetPilot3D)return;
      const stage=$('modelStage');
      if(stage){
        const rect=stage.getBoundingClientRect(),key=`${Math.round(rect.width)}x${Math.round(rect.height)}:${viewMode}`;
        lastStageSize=key;
      }
      renderScene(false);
    });
  }

  function variantState(){return {...(visual.r8_variant||{})}}
  function sizeOverrides(){return {...(visual.module_size_overrides||{})}}
  function openingOverrides(){return {...(visual.module_opening_overrides||{})}}
  function moduleVariantOverrides(){return {...(visual.module_variant_overrides||{})}}
  function moduleEditOverrides(){return {...(visual.module_edit_overrides||{})}}
  function moduleEditFor(id){
    const saved=moduleEditOverrides()[id]||{};
    return moduleDraft?.id===id?{...saved,...moduleDraft}:saved;
  }
  function offsetOverrides(){return {...(visual.module_offsets_mm||{})}}
  function normalizeOpenings(count,value){
    const source=Array.isArray(value)?value:[];
    return Array.from({length:Math.max(1,count)},(_,i)=>source[i]||(['LEFT','RIGHT'][i%2]));
  }
  function middleSideBoundaries(count,openings){
    if(count<2)return[];
    const normalized=normalizeOpenings(count,openings),boundaries=[];
    for(let i=0;i<count-1;i++){
      if(normalized[i]==='RIGHT'||normalized[i+1]==='LEFT')boundaries.push(i+1);
    }
    return boundaries;
  }
  function applyModuleEdit(module,positioned=false){
    const edit=moduleEditFor(module.id);if(!edit||!Object.keys(edit).length)return module;
    const run=Math.round(Number(edit.run_mm)||0);
    if(run>0){
      if(positioned&&module.wall!=='A')module.d=Math.max(100,run);else module.w=Math.max(100,run);
    }
    if(edit.configuration==='DRAWERS'&&module.level!=='upper'&&!module.tall&&!['SINK','DISHWASHER','COOKTOP','FRIDGE'].includes(module.kind)){
      module.kind='DRAWERS';module.label=`Ящики · ${clamp(Math.round(Number(edit.drawer_count)||2),2,5)}`;module.drawer_count=clamp(Math.round(Number(edit.drawer_count)||2),2,5);
      module.drawer_layout='EQUAL';module.drawer_structure={components:['bottom','left_side','right_side','box_front','box_rear','slides'],facade_separate:true};
      module.facade_count=undefined;module.opening='DRAWERS';
    }else if(edit.configuration==='HINGED'&&module.level!=='upper'&&!module.tall&&!['SINK','DISHWASHER','COOKTOP','FRIDGE'].includes(module.kind)){
      module.kind='HINGED';module.label='Распашной';module.drawer_count=undefined;
    }
    if(Number(edit.facade_count)>0){
      module.facade_count=clamp(Math.round(Number(edit.facade_count)),1,3);module.facade_count_user=true;
    }
    if(edit.facade_orientation)module.facade_orientation=edit.facade_orientation;
    if(edit.facade_orientation==='HORIZONTAL'){module.opening='LIFT';module.lift_mechanism=edit.lift_mechanism||'LIFT_ONLY'}
    if(edit.opening)module.opening=edit.opening;
    if(Array.isArray(edit.facade_openings)){
      module.facade_openings=normalizeOpenings(module.facade_count||edit.facade_openings.length,edit.facade_openings);
      module.middle_side_boundaries=middleSideBoundaries(module.facade_count||module.facade_openings.length,module.facade_openings);
    }
    if(edit.shelf_count!==undefined)module.shelf_count=clamp(Math.round(Number(edit.shelf_count)||0),0,module.tall?3:2);
    if(edit.shelf_type)module.shelf_type=edit.shelf_type;
    if(edit.drawer_count!==undefined)module.drawer_count=clamp(Math.round(Number(edit.drawer_count)||2),2,5);
    if(module.tall&&!['TALL_OVEN','FRIDGE'].includes(module.kind)){
      module.tall_facade_count=clamp(Math.round(Number(edit.tall_facade_count)||module.facade_count||1),1,3);
      module.facade_count=module.tall_facade_count;module.facade_count_user=true;
      module.tall_drawer_mode=edit.tall_drawer_mode||'NONE';
      module.tall_drawer_count=module.tall_drawer_mode==='NONE'?0:clamp(Math.round(Number(edit.tall_drawer_count)||2),1,3);
      module.visible_drawer_stack_height_mm=module.tall_drawer_mode==='VISIBLE'?visibleTallDrawerLimit():0;
      module.facade_openings=normalizeOpenings(module.facade_count,edit.facade_openings);
      module.middle_side_boundaries=middleSideBoundaries(module.facade_count,module.facade_openings);
    }
    if(module.kind==='FILLER'){
      module.filler_shape=edit.filler_shape||module.filler_shape||'FLAT';
      module.filler_material=edit.filler_material||module.filler_material||'CARCASS';
    }
    module.module_edit_status=moduleDraft?.id===module.id?'DRAFT_PREVIEW':'SAVED';
    return module;
  }
  function setFurniturePalette(){
    const d=String(visual.r8_palette||project?.context?.visual_direction||'LIGHT').toLowerCase();document.documentElement.dataset.furniturePalette=d;
    const surfaces=visual.room_surface_materials||{},furniture=visual.furniture_materials||{};
    document.documentElement.dataset.floorPreset=String(surfaces.floor?.preset||'');
    document.documentElement.dataset.wallPreset=String(surfaces.walls?.preset||'');
    document.documentElement.dataset.ceilingPreset=String(surfaces.ceiling?.preset||'');
    document.documentElement.dataset.facadePreset=String(furniture.facade?.preset||'');
    document.documentElement.dataset.carcassPreset=String(furniture.carcass?.preset||'');
    document.documentElement.dataset.worktopPreset=String(furniture.worktop?.preset||'');
  }
  function fridgeWall(){
    const cfg=configuration(),side=inputs.fridge_side||'LEFT';
    if(cfg==='L_LEFT'&&side==='LEFT')return'B';
    if(cfg==='L_RIGHT'&&side==='RIGHT')return'C';
    if(cfg==='U_SHAPE')return side==='LEFT'?'B':'C';
    return'A';
  }
  function edgeForWall(wall){
    if(wall==='A')return inputs.fridge_side==='RIGHT'?'END':'START';
    return'END';
  }
  function applyBaseOverride(module){
    const o=sizeOverrides()[module.id]||{};
    if(Number(o.run_mm)>0)module.w=Math.max(100,Number(o.run_mm));
    if(Number(o.depth_mm)>0)module.d=Math.max(100,Number(o.depth_mm));
    if(Number(o.height_mm)>0)module.h=Math.max(100,Number(o.height_mm));
    module.opening=openingOverrides()[module.id]||module.opening||'AUTO';
    const preset=moduleVariantOverrides()[module.id];
    if(preset&&module.level!=='upper'&&!module.tall&&['HINGED','DRAWERS'].includes(module.kind)){
      module.module_variant_preset=preset.type||'';
      if(preset.type==='DRAWERS'){
        const count=clamp(Math.round(Number(preset.drawer_count)||2),2,5);
        module.kind='DRAWERS';module.label=`Ящики · ${count}`;module.drawer_count=count;module.drawer_layout='EQUAL';
        module.drawer_structure={components:['bottom','left_side','right_side','box_front','box_rear','slides'],facade_separate:true};
        module.facade_count=undefined;module.opening='DRAWERS';
      }else if(preset.type==='HINGED_2'){
        module.kind='HINGED';module.label='Распашной · 2 фасада';module.facade_count=2;module.opening='HINGED';module.drawer_count=undefined;
      }
    }
    return applyModuleEdit(module,false);
  }

  let camera={yaw:0,pitch:.33,distanceScale:1};
  function resetCamera(){camera=window.BizetPilot3D?.cameraDefaults?.(configuration())||{yaw:0,pitch:.33,distanceScale:1}}

  function enterNormalKitchenView(){
    viewMode=VIEW_NORMAL;activeModule=null;moduleDraft=null;moduleDraftBase=null;moduleDraftBasePrice=0;drag=null;focusCanvasResetFrames=0;focusPaintToken++;
  }
  function enterModuleFocus(module){
    if(!module)return false;
    activeModule=module;viewMode=VIEW_FOCUS;focusCamera={yaw:-.36,pitch:.34,distanceScale:.72};
    focusCanvasResetFrames=8;focusPaintToken++;
    return true;
  }

  function sinkWall(){const config=configuration(),side=inputs.sink_side;if(config==='L_LEFT')return side==='LEFT'?'B':'A';if(config==='L_RIGHT')return side==='RIGHT'?'C':'A';if(config==='U_SHAPE')return side==='LEFT'?'B':'C';return'A'}
  function resolvedCooktopWall(){
    const sink=sinkWall(),requested=inputs.cooktop_wall;
    return autoWall(requested,sink,'A');
  }
  function resolvedOvenWall(){
    const sink=sinkWall(),cook=resolvedCooktopWall(),requested=inputs.oven_wall;
    return autoWall(requested,sink,cook);
  }
  function baseModule(id,label,width,kind,wall='A',extra={}){
    const module={id,label,kind,wall,w:Math.max(100,Number(width)||600),d:LOWER_DEPTH,h:lowerBodyHeight(),z:plinthHeight(),level:'lower',anchor:true,...extra};
    if(kind==='DRAWERS')module.drawer_structure={components:['bottom','left_side','right_side','box_front','box_rear','slides'],facade_separate:true};
    module.module_run_limit_mm=maxRunFor(module);
    module.facade_width_limit_mm=LIMITS.HINGED_FACADE_MAX;
    module.handle_type=module.handle_type||'STANDARD';
    module.handle_orientation=module.handle_orientation||(kind==='DRAWERS'?'HORIZONTAL':'HORIZONTAL');
    module.handle_offset_mm=Number(module.handle_offset_mm)||50;
    if(isOvenModule(module))module.corner_forbidden=true;
    if(['HINGED','SINK','UPPER','UPPER_TOP','UPPER_DRYER','TALL_OVEN'].includes(kind))module.facade_count=hingedFacadeCountFor(module);
    return applyBaseOverride(module);
  }

  function collectedLower(){
    const list=[],walls=activeWalls(),fWall=fridgeWall();
    if(inputs.fridge_present==='YES'){
      const width=Number(inputs.fridge_width_mm)||600,tallHeight=Math.max(1500,Math.min(roomValues().heightMm-140,2100));
      const freeFridge=inputs.fridge_type==='FREESTANDING',clearance=freeFridge?freestandingGap(width):0,runWidth=freeFridge?width+clearance*2:width;
      const fridgeExtra={tall:true,h:tallHeight,z:freeFridge?0:plinthHeight(),content:freeFridge?'FRIDGE_FREEZER':(inputs.fridge_content||'PENDING'),freestanding:freeFridge,appliance_width_mm:width,appliance_clearance_mm:clearance,freezer_bottom:true};
      if(inputs.fridge_type==='BUILT_IN'&&width===1200){
        list.push(baseModule('fridge-left','Холодильник L',600,'FRIDGE',fWall,{...fridgeExtra,freestanding:false,content:inputs.fridge_left_unit||'PENDING'}));
        list.push(baseModule('fridge-right','Холодильник R',600,'FRIDGE',fWall,{...fridgeExtra,freestanding:false,content:inputs.fridge_right_unit||'PENDING'}));
      }else{
        list.push(baseModule('fridge','Холодильник',runWidth,'FRIDGE',fWall,fridgeExtra));
      }
    }
    list.push(baseModule('sink','Мойка',600,'SINK',sinkWall(),{widthStatus:'PILOT_VISUAL_PLACEHOLDER',sink_mount_type:inputs.sink_mount_type,sink_bowl_count:inputs.sink_bowl_count,sink_disposer:inputs.sink_disposer,sink_filters:inputs.sink_filters}));
    if(inputs.dishwasher_type&&inputs.dishwasher_type!=='NO'){
      const wall=walls.includes(inputs.dishwasher_wall)?inputs.dishwasher_wall:'A';
      const applianceWidth=Number(inputs.dishwasher_width_mm)||600;
      const free=inputs.dishwasher_type==='FREESTANDING';
      const sidePanel=free?18:0,clearance=free?freestandingGap(applianceWidth):0;
      list.push(baseModule('dishwasher','Посудомоечная машина',applianceWidth+sidePanel*2+clearance*2,'DISHWASHER',wall,{freestanding:free,appliance_width_mm:applianceWidth,side_panel_mm:sidePanel,appliance_clearance_mm:clearance}));
    }
    const cooktopWall=resolvedCooktopWall();
    list.push(baseModule('cooktop',inputs.oven_location==='LOWER'?'Варочная + духовка':'Варочная панель',Number(inputs.cooktop_width_mm)||600,'COOKTOP',cooktopWall,{widthStatus:inputs.cooktop_width_mm==='CUSTOM'?'PILOT_VISUAL_PLACEHOLDER':'USER_SELECTED',oven_appliance_present:inputs.oven_location==='LOWER',corner_forbidden:inputs.oven_location==='LOWER'}));
    if(inputs.oven_location==='TALL'){
      const wall=resolvedOvenWall();
      const tallHeight=Math.max(900,Math.min(roomValues().heightMm-140,2100));
      list.push(baseModule('oven','Пенал с духовкой',600,'TALL_OVEN',wall,{tall:true,h:tallHeight,widthStatus:'PILOT_VISUAL_PLACEHOLDER',oven_appliance_present:true,mandatory_lower_drawer:true,lower_drawer_count:1,corner_forbidden:true,lower_drawer_structure:{components:['bottom','left_side','right_side','box_front','box_rear','slides'],facade_separate:true},microwave_present:inputs.microwave_present,microwave_type:inputs.microwave_type,coffee_present:inputs.coffee_present,coffee_type:inputs.coffee_type,coffee_support:inputs.coffee_support,coffee_compartment:inputs.coffee_compartment,coffee_front_opening:inputs.coffee_front_opening}));
    }
    return list;
  }

  function wallSpan(wall,room){return wall==='A'?room.lengthMm:room.depthMm}
  function runBounds(wall,room){
    const full=Math.max(0,wallSpan(wall,room));
    if(wall==='A'&&configuration().startsWith('WALL_')){
      const left=clamp(Math.max(0,Number(inputs.linear_left_offset_mm)||0),0,full);
      const right=clamp(Math.max(0,Number(inputs.linear_right_offset_mm)||0),0,Math.max(0,full-left));
      const end=clamp(full-right,left,full);
      return{start:left,end,span:Math.max(0,end-left)};
    }
    return{start:0,end:full,span:full};
  }

  function systemFillModules(wall,remaining){
    const out=[];let rest=Math.max(0,Math.round(remaining)),i=1;
    while(rest>LIMITS.STRAIGHT_MAX){
      const width=Math.min(LIMITS.PREFERRED_FILL,rest);
      out.push(baseModule(`system-fill-${wall}-${i++}`,'Модуль',width,'HINGED',wall,{anchor:false,pending:true,system:true}));
      rest-=width;
    }
    if(rest>=LIMITS.MIN_STANDARD_MODULE){
      out.push(baseModule(`system-fill-${wall}-${i++}`,'Модуль',rest,'HINGED',wall,{anchor:false,pending:true,system:true}));
      rest=0;
    }
    if(rest>0){
      out.push(baseModule(`system-filler-${wall}`,'Филлер',rest,'FILLER',wall,{anchor:false,pending:true,system:true,filler:true}));
    }
    return out;
  }

  function totalRun(list){return list.reduce((sum,m)=>sum+Math.min(Number(m.w)||0,maxRunFor(m)),0)}
  function ergonomicRegularOrder(list,edge){
    const rankStart={SINK:10,DISHWASHER:20,DRAWERS:30,HINGED:30,COOKTOP:50};
    const rankEnd={COOKTOP:10,DRAWERS:30,HINGED:30,DISHWASHER:40,SINK:50};
    const rank=edge==='END'?rankEnd:rankStart;
    return list.map((m,i)=>({m,i,r:rank[m.kind]??30})).sort((a,b)=>a.r-b.r||a.i-b.i).map(x=>x.m);
  }
  function separationBetween(list,aIndex,bIndex){
    const lo=Math.min(aIndex,bIndex),hi=Math.max(aIndex,bIndex);
    return list.slice(lo+1,hi).reduce((sum,m)=>sum+Math.min(Number(m.w)||0,maxRunFor(m)),0);
  }
  function separationModules(wall,width,prefix,label){
    const out=[];let rest=Math.max(0,Math.round(width)),i=1;
    while(rest>LIMITS.STRAIGHT_MAX){
      const w=Math.min(LIMITS.PREFERRED_FILL,rest);
      out.push(baseModule(`${prefix}-${wall}-${i++}`,label,w,'HINGED',wall,{anchor:false,system:true,ergonomic_spacer:true,pending:false}));
      rest-=w;
    }
    if(rest>=LIMITS.MIN_STANDARD_MODULE)out.push(baseModule(`${prefix}-${wall}-${i++}`,label,rest,'HINGED',wall,{anchor:false,system:true,ergonomic_spacer:true,pending:false}));
    else if(rest>0)out.push(baseModule(`${prefix}-${wall}-filler`,label,rest,'FILLER',wall,{anchor:false,system:true,ergonomic_spacer:true,pending:false,filler:true}));
    return out;
  }
  function ensurePairSpacing(ordered,wall,bounds,kindA,kindB,hardMin,preferred,prefix,label){
    const ia=ordered.findIndex(m=>m.kind===kindA),ib=ordered.findIndex(m=>m.kind===kindB);
    if(ia<0||ib<0)return ordered;
    const between=separationBetween(ordered,ia,ib);
    if(between>=preferred)return ordered;
    const free=Math.max(0,bounds.span-totalRun(ordered));
    const hardDeficit=Math.max(0,hardMin-between),preferredDeficit=Math.max(0,preferred-between);
    if(hardDeficit<=0){
      if(preferredDeficit>0&&free>0){
        const add=Math.min(preferredDeficit,free),at=Math.max(ia,ib);
        ordered.splice(at,0,...separationModules(wall,add,prefix,label));
      }
      return ordered;
    }
    const add=Math.max(hardDeficit,Math.min(preferredDeficit,free));
    const at=Math.max(ia,ib);
    ordered.splice(at,0,...separationModules(wall,add,prefix,label));
    if(free<hardDeficit)pushWarning(`ERGONOMIC_HARD_${kindA}_${kindB}_${wall}`,`По стене ${wall} недостаточно места для обязательного расстояния ${hardMin} мм между ${kindA==='SINK'?'мойкой':kindA} и ${kindB==='COOKTOP'?'варочной панелью':'духовкой'}. Система не должна выдавать производственный вариант без изменения конфигурации.`);
    return ordered;
  }
  function promoteDrawerCadence(ordered){
    let i=0;
    while(i<ordered.length){
      const first=ordered[i];
      if(first.kind!=='HINGED'||!first.system||first.ergonomic_spacer||first.corner_guard||first.module_variant_preset){i++;continue}
      const width=Math.round(first.w);let j=i+1;
      while(j<ordered.length&&ordered[j].kind==='HINGED'&&ordered[j].system&&!ordered[j].ergonomic_spacer&&!ordered[j].corner_guard&&!ordered[j].module_variant_preset&&Math.round(ordered[j].w)===width)j++;
      const count=j-i;
      for(let start=i;start+2<j;start+=3){
        const idx=start+1,m=ordered[idx];
        ordered[idx]={...m,kind:'DRAWERS',label:'Ящики · 2',drawer_count:2,drawer_layout:'EQUAL',facade_count:undefined,drawer_structure:{components:['bottom','left_side','right_side','box_front','box_rear','slides'],facade_separate:true},auto_drawer_cadence:true};
      }
      i=j;
    }
    return ordered;
  }
  function sinkCornerEdgeForWall(wall){
    if(inputs.sink_placement!=='AT_CORNER'||sinkWall()!==wall)return null;
    const edges=[...cornerEdgesForWall(wall)];
    if(edges.length<=1)return edges[0]||null;
    return inputs.sink_side==='RIGHT'?'END':'START';
  }
  function makeCornerModule(wall,edge){
    return baseModule(`corner-${wall}-${edge.toLowerCase()}`,'Угловой модуль',Number(CORNER.ZONE_DEPTH)||600,'CORNER',wall,{
      anchor:false,system:true,pending:true,corner:true,corner_guard:true,
      module_run_limit_mm:Number(CORNER.MAX_CORNER_MODULE)||LIMITS.CORNER_MAX,
      corner_edge:edge
    });
  }
  function ensureCornerZones(ordered,wall){
    const edges=cornerEdgesForWall(wall),sinkEdge=sinkCornerEdgeForWall(wall);
    const moveSink=edge=>{
      const idx=ordered.findIndex(m=>m.kind==='SINK');
      if(idx<0)return false;
      const [sink]=ordered.splice(idx,1);
      if(edge==='START')ordered.unshift(sink);else ordered.push(sink);
      sink.corner=true;sink.corner_edge=edge;sink.module_run_limit_mm=Number(CORNER.MAX_CORNER_MODULE)||LIMITS.CORNER_MAX;
      return true;
    };
    if(edges.has('START')){
      if(sinkEdge==='START')moveSink('START');
      if(!ordered[0]||!CORNER.ALLOWED_KINDS.includes(ordered[0].kind))ordered.unshift(makeCornerModule(wall,'START'));
    }
    if(edges.has('END')){
      if(sinkEdge==='END')moveSink('END');
      const last=ordered[ordered.length-1];
      if(!last||!CORNER.ALLOWED_KINDS.includes(last.kind))ordered.push(makeCornerModule(wall,'END'));
    }
    ['START','END'].forEach(edge=>{
      if(!edges.has(edge))return;
      const m=edge==='START'?ordered[0]:ordered[ordered.length-1];
      if(m&&!CORNER.ALLOWED_KINDS.includes(m.kind)){
        pushWarning(`CORNER_HARD_${wall}_${edge}`,`HARD: в угловой зоне стены ${wall} допускается только мойка или угловой модуль. ${m.label||m.kind} перенесён из угла.`);
      }
    });
    return ordered;
  }
  function centerCompositionAnchor(ordered,wall,bounds){
    if(!COMPOSITION.centerPrimaryApplianceOnLongRun||inputs.communications_status==='USER_CONFIRMED')return ordered;
    const anchorIndex=ordered.findIndex(m=>m.kind==='TALL_OVEN')>=0?ordered.findIndex(m=>m.kind==='TALL_OVEN'):ordered.findIndex(m=>m.kind==='COOKTOP');
    if(anchorIndex<0)return ordered;
    const anchor=ordered[anchorIndex];
    const base=ordered.filter((_,i)=>i!==anchorIndex);
    const hasStartCorner=base[0]?.kind==='CORNER'||(base[0]?.kind==='SINK'&&base[0]?.corner_edge==='START');
    const hasEndCorner=base[base.length-1]?.kind==='CORNER'||(base[base.length-1]?.kind==='SINK'&&base[base.length-1]?.corner_edge==='END');
    const startReserve=hasStartCorner?(Number(base[0].w)||0):0,endReserve=hasEndCorner?(Number(base[base.length-1].w)||0):0;
    const target=bounds.start+(bounds.span-startReserve-endReserve)/2+startReserve;
    const minPos=hasStartCorner?1:0,maxPos=base.length-(hasEndCorner?1:0);
    let best=null;
    for(let pos=minPos;pos<=maxPos;pos++){
      const candidate=[...base.slice(0,pos),anchor,...base.slice(pos)];
      const ai=candidate.indexOf(anchor),si=candidate.findIndex(m=>m.kind==='SINK');
      if(si>=0&&anchor.kind==='COOKTOP'&&separationBetween(candidate,ai,si)<ERGO.SINK_COOKTOP_HARD_MIN)continue;
      if(si>=0&&anchor.kind==='TALL_OVEN'&&separationBetween(candidate,ai,si)<ERGO.SINK_OVEN_SAME_WALL_MIN)continue;
      const before=candidate.slice(0,ai).reduce((s,m)=>s+Math.min(Number(m.w)||0,maxRunFor(m)),0);
      const center=bounds.start+before+Math.min(Number(anchor.w)||0,maxRunFor(anchor))/2;
      const score=Math.abs(center-target);
      if(!best||score<best.score)best={candidate,score};
    }
    if(best){
      anchor.composition_target='RUN_CENTER';
      anchor.composition_score_mm=Math.round(best.score);
      return best.candidate;
    }
    return ordered;
  }

  function arrangeWall(wall,list,room){
    const bounds=runBounds(wall,room),variant=variantState(),edge=edgeForWall(wall);
    let regular=list.filter(m=>!m.tall),tall=list.filter(m=>m.tall);
    if(wall==='A'&&variant.reverse_wall_a)regular=[...regular].reverse();
    if(wall==='A'&&Number(variant.module_shift)>0&&regular.length>2){
      const n=Number(variant.module_shift)%regular.length;
      regular=regular.slice(n).concat(regular.slice(0,n));
    }
    regular=ergonomicRegularOrder(regular,edge);

    if(tall.length){
      const fridge=tall.filter(m=>m.kind==='FRIDGE'),otherTall=tall.filter(m=>m.kind!=='FRIDGE');
      if(fridge.length&&inputs.fridge_type==='FREESTANDING'){
        tall=edge==='START'?fridge.concat(otherTall):otherTall.concat(fridge);
      }else if(variant.tall_group_flip){
        tall=[...tall].reverse();
      }
    }

    let ordered=edge==='START'?tall.concat(regular):regular.concat(tall);
    let used=totalRun(ordered);

    if(wall==='A'&&bounds.span-used>=CUTLERY_W){
      const cutlery=baseModule('cutlery','Ящики для приборов',CUTLERY_W,'DRAWERS','A',{anchor:false,system:true,drawer_count:2});
      let idx=ordered.findIndex(m=>m.kind==='SINK');
      if(idx<0)idx=edge==='END'&&tall.length?ordered.findIndex(m=>m.tall):ordered.length;
      ordered.splice(idx>=0?idx+1:ordered.length,0,cutlery);
    }

    ordered=ensurePairSpacing(ordered,wall,bounds,'SINK','COOKTOP',ERGO.SINK_COOKTOP_HARD_MIN,ERGO.SINK_COOKTOP_PREFERRED,'prep-zone','Рабочая зона');
    ordered=ensurePairSpacing(ordered,wall,bounds,'SINK','TALL_OVEN',ERGO.SINK_OVEN_SAME_WALL_MIN,ERGO.SINK_OVEN_SAME_WALL_MIN,'oven-separation','Разделительный модуль');
    used=totalRun(ordered);
    const remaining=bounds.span-used;
    if(remaining>0){
      const fills=systemFillModules(wall,remaining);
      if(tall.length&&edge==='END'){
        const firstTall=ordered.findIndex(m=>m.tall);
        ordered.splice(firstTall<0?ordered.length:firstTall,0,...fills);
      }else if(tall.length&&edge==='START'){
        let lastTall=-1;ordered.forEach((m,i)=>{if(m.tall)lastTall=i});
        ordered.splice(lastTall+1,0,...fills);
      }else ordered.push(...fills);
      used+=remaining;
    }else if(remaining<0){
      pushWarning(`RUN_OVERFLOW_${wall}`,`По стене ${wall} выбранный обязательный набор длиннее доступного участка на ${Math.round(-remaining)} мм. Модули, которые физически не помещаются, не выводятся за границы комнаты — требуется изменить состав или конфигурацию.`);
    }

    ordered=promoteDrawerCadence(ordered);
    ordered=ensureCornerZones(ordered,wall);
    ordered=centerCompositionAnchor(ordered,wall,bounds);
    let cursor=bounds.start;
    return ordered.map(m=>{
      const runSize=Math.min(m.w,maxRunFor(m)),offset=Number(offsetOverrides()[m.id])||0;
      if(cursor+runSize>bounds.end+0.5){
        pushWarning(`OMITTED_${m.id}`,`${m.label} не помещается в доступный участок стены ${wall} и временно исключён из 3D до изменения конфигурации.`);
        return null;
      }
      let placed={...m,w:runSize,runSize,runPosition:cursor,module_run_limit_mm:maxRunFor(m)};
      if(wall==='A'){
        placed.x=clamp(cursor+offset,bounds.start,Math.max(bounds.start,bounds.end-runSize));
        placed.y=room.depthMm-placed.d;
      }else if(wall==='B'){
        const depth=placed.d;
        placed.x=0;
        placed.y=clamp(room.depthMm-cursor-runSize-offset,0,room.depthMm-runSize);
        placed.d=runSize;placed.w=depth;
      }else{
        const depth=placed.d;
        placed.x=room.lengthMm-depth;
        placed.y=clamp(room.depthMm-cursor-runSize-offset,0,room.depthMm-runSize);
        placed.d=runSize;placed.w=depth;
      }
      cursor+=runSize;
      if(['HINGED','SINK','UPPER','UPPER_TOP','UPPER_DRYER','TALL_OVEN'].includes(placed.kind)&&!placed.facade_count_user)placed.facade_count=hingedFacadeCountFor(placed);
      return placed;
    }).filter(Boolean);
  }

  function buildLower(){const room=roomValues(),raw=collectedLower(),walls=activeWalls(),grouped={A:[],B:[],C:[]};raw.forEach(m=>(grouped[m.wall]||grouped.A).push(m));return walls.flatMap(w=>arrangeWall(w,grouped[w],room))}

  function upperFromLower(lower){
    const room=roomValues(),gap=Math.max(550,Number(inputs.upper_gap_mm)||600),bottom=LOWER_TOTAL_H+gap,height=Math.min(UPPER_MAX_H,room.heightMm-bottom-50);if(height<220)return[];
    const result=[],hoodWidth=Number(inputs.hood_width_mm)||600,hoodDepth=inputs.hood_type==='BUILT_IN'?UPPER_HOOD_DEPTH:UPPER_DEPTH;
    lower.filter(m=>!m.tall&&m.level==='lower'&&m.kind!=='FILLER').forEach(m=>{
      if(m.kind==='COOKTOP'){
        if(m.wall==='A'){const center=m.x+m.w/2,x=clamp(center-hoodWidth/2,0,room.lengthMm-hoodWidth);result.push({id:`upper-hood-${m.wall}`,label:'Вытяжка',kind:'UPPER_HOOD',wall:m.wall,x,y:room.depthMm-hoodDepth,z:bottom,w:hoodWidth,d:hoodDepth,h:height,level:'upper',anchor:true,hood_type:inputs.hood_type,hood_subtype:inputs.hood_integrated_subtype,hood_width_mm:hoodWidth})}
        else{const center=m.y+m.d/2,y=clamp(center-hoodWidth/2,0,room.depthMm-hoodWidth),x=m.wall==='B'?0:room.lengthMm-hoodDepth;result.push({id:`upper-hood-${m.wall}`,label:'Вытяжка',kind:'UPPER_HOOD',wall:m.wall,x,y,z:bottom,w:hoodDepth,d:hoodWidth,h:height,level:'upper',anchor:true,hood_type:inputs.hood_type,hood_subtype:inputs.hood_integrated_subtype,hood_width_mm:hoodWidth})}
        return;
      }
      if(m.wall==='A')result.push({id:`upper-${m.id}`,label:'Верхний модуль',kind:'UPPER',wall:'A',x:m.x,y:room.depthMm-UPPER_DEPTH,z:bottom,w:m.w,d:UPPER_DEPTH,h:height,level:'upper',anchor:false,system:true,pending:m.pending});
      else result.push({id:`upper-${m.id}`,label:'Верхний модуль',kind:'UPPER',wall:m.wall,x:m.wall==='B'?0:room.lengthMm-UPPER_DEPTH,y:m.y,z:bottom,w:UPPER_DEPTH,d:m.d,h:height,level:'upper',anchor:false,system:true,pending:m.pending});
    });
    const variant=variantState();
    result.forEach(m=>{if(m.kind==='UPPER'){m.label=variant.upper_opening==='LIFT'?'Верхний · подъёмный':'Верхний · распашной'}});
    if(variant.upper_layout==='ANTRESOL'){
      const top=[];
      result.filter(m=>m.kind==='UPPER').forEach(m=>{const h=Math.min(300,Math.max(220,m.h*.32));m.h=Math.max(260,m.h-h);top.push({...m,id:'top-'+m.id,label:'Антресоль',kind:'UPPER_TOP',z:m.z+m.h,h,system:true})});
      result.push(...top);
    }
    result.forEach(m=>{
      const o=sizeOverrides()[m.id]||{};
      if(Number(o.run_mm)>0){if(m.wall==='A')m.w=Math.max(100,Number(o.run_mm));else m.d=Math.max(100,Number(o.run_mm))}
      if(Number(o.depth_mm)>0){if(m.wall==='A')m.d=Math.max(100,Number(o.depth_mm));else m.w=Math.max(100,Number(o.depth_mm))}
      if(Number(o.height_mm)>0)m.h=Math.max(100,Number(o.height_mm));
      m.opening=openingOverrides()[m.id]||m.opening||'AUTO';
      applyModuleEdit(m,true);
      if(['UPPER','UPPER_TOP','UPPER_DRYER'].includes(m.kind)&&!m.facade_count_user)m.facade_count=hingedFacadeCountFor(m);
    });
    return result;
  }

  function numbered(all){
    const wallRank={B:0,A:1,C:2};
    const sorted=[...all].sort((a,b)=>{const la=a.level==='upper'?1:0,lb=b.level==='upper'?1:0;if(la!==lb)return la-lb;const wa=wallRank[a.wall]??1,wb=wallRank[b.wall]??1;if(wa!==wb)return wa-wb;const pa=a.wall==='A'?a.x:a.y,pb=b.wall==='A'?b.x:b.y;return pa-pb});
    sorted.forEach((m,i)=>m.number=i+1);return sorted;
  }

  function moduleCenter(m){return{x:(Number(m.x)||0)+(Number(m.w)||0)/2,y:(Number(m.y)||0)+(Number(m.d)||0)/2}}
  function sameWallGap(a,b){
    if(!a||!b||a.wall!==b.wall)return Infinity;
    const sa=a.wall==='A'?Number(a.x)||0:Number(a.y)||0,ea=sa+(a.wall==='A'?(Number(a.w)||0):(Number(a.d)||0));
    const sb=b.wall==='A'?Number(b.x)||0:Number(b.y)||0,eb=sb+(b.wall==='A'?(Number(b.w)||0):(Number(b.d)||0));
    if(ea<=sb)return sb-ea;if(eb<=sa)return sa-eb;return 0;
  }
  function evaluateErgonomics(list){
    const lower=list.filter(m=>m.level!=='upper'),sink=lower.find(m=>m.kind==='SINK'),cook=lower.find(m=>m.kind==='COOKTOP'),oven=lower.find(m=>m.kind==='TALL_OVEN'),fridge=lower.find(m=>m.kind==='FRIDGE');
    if(sink&&cook&&sink.wall===cook.wall){
      const gap=sameWallGap(sink,cook);
      if(gap<ERGO.SINK_COOKTOP_HARD_MIN)pushWarning('SINK_COOKTOP_HARD',`Между мойкой и варочной только ${Math.round(gap)} мм. HARD минимум — ${ERGO.SINK_COOKTOP_HARD_MIN} мм; производственный вариант запрещён без перестройки.`);
      else if(gap<ERGO.SINK_COOKTOP_PREFERRED)pushWarning('SINK_COOKTOP_PREFERRED',`Между мойкой и варочной ${Math.round(gap)} мм. Допустимо, но предпочтительная рабочая зона — ${ERGO.SINK_COOKTOP_PREFERRED} мм.`);
    }
    if(sink&&oven&&sink.wall===oven.wall){
      const gap=sameWallGap(sink,oven);
      if(gap<ERGO.SINK_OVEN_SAME_WALL_MIN)pushWarning('SINK_OVEN_SPACING',`Мойка и пенал с духовкой на одной стене должны быть разнесены минимум на ${ERGO.SINK_OVEN_SAME_WALL_MIN} мм. Сейчас: ${Math.round(gap)} мм.`);
    }
  }

  function buildModules(){
    layoutWarnings=[];
    const room=roomValues(),lower=buildLower(),upper=upperFromLower(lower),all=numbered(lower.concat(upper));
    evaluateErgonomics(all);
    const standardPackageH=LOWER_TOTAL_H+Math.max(550,Number(inputs.upper_gap_mm)||600)+750;
    if(room.heightMm<standardPackageH&&upper.length){
      pushWarning('ROOM_HEIGHT_ADAPTED',`Высота помещения ${Math.round(room.heightMm)} мм ниже стандартной схемы. Верхние/высокие модули адаптированы по высоте; производителю нужна проверка, возможна корректировка стоимости.`);
    }
    all.forEach(m=>{
      if(m.x<-.5||m.y<-.5||m.z<-.5||m.x+m.w>room.lengthMm+.5||m.y+m.d>room.depthMm+.5||m.z+m.h>room.heightMm+.5){
        pushWarning(`BOUNDS_${m.id}`,`${m.label}: геометрия адаптируется к границам помещения; требуется проверка нестандартного размера.`);
      }
    });
    return all;
  }

  function renderStrip(){
    $('moduleStrip').innerHTML=modules.map(m=>`<button class="module-strip-button${m.system||m.pending?' is-system':''}" type="button" data-module="${m.id}"><strong>${m.number}</strong><span>${m.label}</span></button>`).join('');
    $('moduleStrip').querySelectorAll('[data-module]').forEach(btn=>btn.addEventListener('click',()=>openModule(btn.dataset.module)));
  }
  const FOCUS_PRESETS=[
    {id:'DRAWERS_2',type:'DRAWERS',drawer_count:2,label:'2 ящика',thumb:'drawers-2'},
    {id:'DRAWERS_3',type:'DRAWERS',drawer_count:3,label:'3 ящика',thumb:'drawers-3'},
    {id:'DRAWERS_4',type:'DRAWERS',drawer_count:4,label:'4 ящика',thumb:'drawers-4'},
    {id:'DRAWERS_5',type:'DRAWERS',drawer_count:5,label:'5 ящиков',thumb:'drawers-5'},
    {id:'HINGED_2',type:'HINGED_2',label:'2 распашных',thumb:'hinged-2'}
  ];
  function currentFocusPreset(module){
    const edit=module?.id?moduleEditFor(module.id):{};
    if(edit?.configuration==='DRAWERS')return `DRAWERS_${clamp(Math.round(Number(edit.drawer_count)||2),2,5)}`;
    if(edit?.configuration==='HINGED'&&Number(edit.facade_count)===2)return'HINGED_2';
    const saved=moduleVariantOverrides()[module?.id];
    if(saved?.type==='DRAWERS')return `DRAWERS_${clamp(Math.round(Number(saved.drawer_count)||2),2,5)}`;
    if(saved?.type==='HINGED_2')return'HINGED_2';
    if(module?.kind==='DRAWERS')return `DRAWERS_${clamp(Math.round(Number(module.drawer_count)||2),2,5)}`;
    return module?.kind==='HINGED'&&Number(module.facade_count)===2?'HINGED_2':'';
  }
  function renderFocusVariantRibbon(module){
    const host=$('focusVariantOptions'),status=$('focusVariantStatus');if(!host)return;
    if(!module){host.innerHTML='';if(status)status.hidden=true;return}
    const compatible=module.level!=='upper'&&!module.tall&&['HINGED','DRAWERS'].includes(module.kind);
    const selected=currentFocusPreset(module);
    host.innerHTML=FOCUS_PRESETS.map(p=>`<button class="r10-focus-variant-card${selected===p.id?' is-selected':''}" type="button" data-focus-preset="${p.id}" ${compatible?'':'disabled'}><span class="r10-module-thumb ${p.thumb}" aria-hidden="true"></span><strong>${p.label}</strong></button>`).join('');
    if(status){
      status.hidden=compatible;
      status.textContent=compatible?'':'Для этого типа модуля варианты конфигурации задаются его собственными параметрами.';
    }
  }
  function modulePriceOf(module){
    try{
      const quote=window.BizetPointB?.modulePrice?.(module);
      return Number(quote?.client??quote?.price??quote)||0;
    }catch(_){return 0}
  }
  function money(value){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(value)||0))+' грн'}
  function moduleEditorKind(module){
    if(!module)return'SPECIAL';
    if(module.kind==='FILLER')return'FILLER';
    if(module.tall&&!['TALL_OVEN','FRIDGE'].includes(module.kind))return'TALL_PLAIN';
    if(module.level==='upper'&&['UPPER','UPPER_TOP'].includes(module.kind))return'UPPER';
    if(module.level!=='upper'&&!module.tall&&['HINGED','DRAWERS'].includes(module.kind))return'LOWER';
    return'SPECIAL';
  }
  function draftFromModule(module){
    const kind=moduleEditorKind(module),run=Math.round(runDimension(module)),facades=clamp(Math.round(Number(module.facade_count)||hingedFacadeCountFor(module)||1),1,3);
    const configuration=module.kind==='DRAWERS'?'DRAWERS':'HINGED';
    return{
      id:module.id,run_mm:run,configuration,
      facade_count:facades,
      facade_orientation:module.facade_orientation||'VERTICAL',
      facade_openings:normalizeOpenings(facades,module.facade_openings),
      shelf_count:module.shelf_count!==undefined?Number(module.shelf_count):(kind==='TALL_PLAIN'?3:1),
      shelf_type:module.shelf_type||'ADJUSTABLE',
      drawer_count:clamp(Math.round(Number(module.drawer_count)||2),2,5),
      lift_mechanism:module.lift_mechanism||'LIFT_ONLY',
      tall_facade_count:clamp(Math.round(Number(module.tall_facade_count)||facades),1,3),
      tall_drawer_mode:module.tall_drawer_mode||'NONE',
      tall_drawer_count:clamp(Math.round(Number(module.tall_drawer_count)||2),1,3),
      visible_drawer_stack_height_mm:Math.min(visibleTallDrawerLimit(),Math.max(250,Number(module.visible_drawer_stack_height_mm)||lowerBodyHeight())),
      filler_shape:module.filler_shape||'FLAT',
      filler_material:module.filler_material||'CARCASS'
    };
  }
  function validateModuleDraft(draft,module){
    if(!draft||!module)return'Модуль не выбран.';
    const kind=moduleEditorKind(module),run=Math.round(Number(draft.run_mm)||0);
    if(widthLocked(module))return'';
    if(kind==='FILLER'){
      if(run<20||run>900)return'Филлер: ширина 20–900 мм.';
      return'';
    }
    if(kind==='LOWER'&&draft.configuration==='DRAWERS'){
      if(run<300||run>900)return'Модуль с ящиками: ширина только 300–900 мм.';
      const count=Math.round(Number(draft.drawer_count)||0);
      if(count<2||count>5)return'Количество ящиков: от 2 до 5.';
      return'';
    }
    if((kind==='LOWER'&&draft.configuration==='HINGED')||kind==='UPPER'){
      const horizontal=kind==='UPPER'&&draft.facade_orientation==='HORIZONTAL';
      const fc=clamp(Math.round(Number(draft.facade_count)||1),1,3);
      if(!horizontal){
        if(fc===1&&(run<150||run>600))return'1 распашной фасад: ширина модуля 150–600 мм.';
        if(fc===2&&(run<600||run>900))return'2 распашных фасада: ширина модуля 600–900 мм.';
        if(fc===3&&run!==900)return'3 распашных фасада допускаются только при ширине 900 мм.';
      }else if(run<150||run>900)return'Верхний модуль с горизонтальными фасадами: ширина 150–900 мм.';
      const shelves=Math.round(Number(draft.shelf_count)||0);
      if(shelves<0||shelves>2)return'Полок может быть не больше двух.';
      return'';
    }
    if(kind==='TALL_PLAIN'){
      if(run<300||run>900)return'Пенал без техники: ширина 300–900 мм.';
      const fc=Math.round(Number(draft.tall_facade_count)||0),shelves=Math.round(Number(draft.shelf_count)||0);
      if(fc<1||fc>3)return'Пенал: от 1 до 3 распашных фасадов по высоте.';
      if(shelves<0||shelves>3)return'Пенал: не больше 3 полок.';
      if(draft.tall_drawer_mode==='VISIBLE'){
        const stack=Math.round(Number(draft.visible_drawer_stack_height_mm)||0);
        if(stack<=0||stack>visibleTallDrawerLimit())return`Суммарная высота видимых ящиков не может превышать ${visibleTallDrawerLimit()} мм (высота нижних модулей минус столешница).`;
      }
      return'';
    }
    const minRun=module.kind==='SINK'&&Number(module.sink_bowl_count)===2?900:150;
    if(run&&run<minRun)return`Минимальная ширина этого модуля: ${minRun} мм.`;
    if(run>maxRunFor(module))return`Максимальная ширина: ${maxRunFor(module)} мм.`;
    return'';
  }
  function editField(label,key,value,type='number',options=[]){
    if(type==='select')return`<label class="r104-edit-field"><span>${label}</span><select data-module-edit="${key}">${options.map(([v,l])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${l}</option>`).join('')}</select></label>`;
    return`<label class="r104-edit-field"><span>${label}</span><input data-module-edit="${key}" type="number" inputmode="numeric" step="10" value="${Math.round(Number(value)||0)}"></label>`;
  }
  function facadeOpeningFields(count,values){
    const opens=normalizeOpenings(count,values);
    return`<div class="r104-facade-openings">${opens.map((value,i)=>editField(`Фасад ${i+1} · петли`,`facade_opening_${i}`,value,'select',[['LEFT','Слева'],['RIGHT','Справа']])).join('')}</div>`;
  }
  function renderModuleEditor(module=activeModule){
    const panel=$('moduleEditPanel'),body=$('moduleEditBody'),rule=$('moduleEditRule');if(!panel||!body||!module)return;
    if(!moduleDraft||moduleDraft.id!==module.id)moduleDraft=draftFromModule(module);
    const d=moduleDraft,kind=moduleEditorKind(module),locked=widthLocked(module);
    $('moduleEditTitle').textContent=`${module.number}. ${module.label}`;
    let html=editField('Ширина, мм','run_mm',d.run_mm);
    if(locked)html=html.replace('data-module-edit="run_mm"','data-module-edit="run_mm" disabled');
    if(kind==='LOWER'){
      html+=editField('Конфигурация','configuration',d.configuration,'select',[['HINGED','Распашной'],['DRAWERS','Ящики']]);
      if(d.configuration==='DRAWERS'){
        html+=editField('Ящиков','drawer_count',d.drawer_count,'select',[[2,'2'],[3,'3'],[4,'4'],[5,'5']]);
        const facadeH=Math.floor((Math.max(300,module.h)-5-3*(Number(d.drawer_count)-1))/Number(d.drawer_count));
        html+=`<div class="r104-module-info">Фасад ≈ ${facadeH} мм · высота короба строго ${facadeH-50} мм.</div>`;
      }else{
        html+=editField('Фасадов','facade_count',d.facade_count,'select',[[1,'1'],[2,'2'],[3,'3']]);
        html+=editField('Полок','shelf_count',d.shelf_count,'select',[[0,'0'],[1,'1'],[2,'2']]);
        html+=editField('Тип полок','shelf_type',d.shelf_type,'select',[['ADJUSTABLE','Регулируемые'],['FIXED','Жёсткие']]);
        html+=facadeOpeningFields(Number(d.facade_count)||1,d.facade_openings);
      }
    }else if(kind==='UPPER'){
      html+=editField('Ориентация фасада','facade_orientation',d.facade_orientation,'select',[['VERTICAL','Вертикальная'],['HORIZONTAL','Горизонтальная']]);
      html+=editField('Фасадов','facade_count',d.facade_count,'select',[[1,'1'],[2,'2'],[3,'3']]);
      html+=editField('Полок','shelf_count',d.shelf_count,'select',[[0,'0'],[1,'1'],[2,'2']]);
      html+=editField('Тип полок','shelf_type',d.shelf_type,'select',[['ADJUSTABLE','Регулируемые'],['FIXED','Жёсткие']]);
      if(d.facade_orientation==='HORIZONTAL'){
        html+=editField('Механизм','lift_mechanism',d.lift_mechanism,'select',[['LIFT_ONLY','Подъёмный механизм'],['HINGE_PLUS_LIFT','Петли + подъёмник']]);
        html+='<div class="r104-module-info">Верх с горизонтальными фасадами использует подъёмную механику. Точный тариф механизма остаётся параметром библиотеки фурнитуры.</div>';
      }else html+=facadeOpeningFields(Number(d.facade_count)||1,d.facade_openings);
    }else if(kind==='TALL_PLAIN'){
      html+=editField('Фасадов по высоте','tall_facade_count',d.tall_facade_count,'select',[[1,'1'],[2,'2'],[3,'3']]);
      html+=editField('Полок','shelf_count',d.shelf_count,'select',[[0,'0'],[1,'1'],[2,'2'],[3,'3']]);
      html+=editField('Тип полок','shelf_type',d.shelf_type,'select',[['ADJUSTABLE','Регулируемые'],['FIXED','Жёсткие']]);
      html+=editField('Ящики','tall_drawer_mode',d.tall_drawer_mode,'select',[['NONE','Нет'],['HIDDEN','Скрытые за фасадом'],['VISIBLE','Видимые снизу']]);
      if(d.tall_drawer_mode!=='NONE')html+=editField('Количество ящиков','tall_drawer_count',d.tall_drawer_count,'select',[[1,'1'],[2,'2'],[3,'3']]);
      if(d.tall_drawer_mode==='VISIBLE')html+=editField('Высота блока, мм','visible_drawer_stack_height_mm',d.visible_drawer_stack_height_mm);
      html+=facadeOpeningFields(Number(d.tall_facade_count)||1,d.facade_openings);
      html+=`<div class="r104-module-info">Видимые ящики занимают нижнюю зону пенала. Их суммарная высота ≤ ${visibleTallDrawerLimit()} мм.</div>`;
    }else if(kind==='FILLER'){
      html+=editField('Форма','filler_shape',d.filler_shape,'select',[['FLAT','Плашмя'],['L_SHAPE','Г-образный']]);
      html+=editField('Материал','filler_material',d.filler_material,'select',[['CARCASS','Материал корпуса'],['FACADE','Материал фасада']]);
    }else{
      html+='<div class="r104-module-info">Для специализированного модуля в R10.4.0 меняется только разрешённая ширина. Пеналы с техникой, вытяжка и сушка остаются по текущей библиотечной логике.</div>';
    }
    body.innerHTML=html;
    const error=validateModuleDraft(d,module);rule.hidden=!error;rule.textContent=error;$('moduleEditSave').disabled=!!error;
    body.querySelectorAll('[data-module-edit]').forEach(el=>{
      const structural=['configuration','facade_count','facade_orientation','tall_facade_count','tall_drawer_mode'];
      const eventName=el.tagName==='INPUT'?'input':'change';
      let timer=0;
      el.addEventListener(eventName,()=>{
        clearTimeout(timer);timer=window.setTimeout(()=>readModuleEditor(structural.includes(el.dataset.moduleEdit)),el.tagName==='INPUT'?90:0);
      });
    });
    refreshModuleDraftPrice();
  }
  function readModuleEditor(structural=false){
    if(!activeModule||!moduleDraft)return;
    const next={...moduleDraft},openingMap={};
    $('moduleEditBody')?.querySelectorAll('[data-module-edit]').forEach(el=>{
      const key=el.dataset.moduleEdit;if(el.disabled)return;
      const value=el.tagName==='INPUT'?Number(el.value):el.value;
      const match=key.match(/^facade_opening_(\d+)$/);
      if(match)openingMap[Number(match[1])]=value;else next[key]=value;
    });
    if(Object.keys(openingMap).length){
      const count=Number(next.tall_facade_count||next.facade_count)||1;
      next.facade_openings=Array.from({length:count},(_,i)=>openingMap[i]||next.facade_openings?.[i]||(['LEFT','RIGHT'][i%2]));
    }
    moduleDraft=next;
    const error=validateModuleDraft(moduleDraft,moduleDraftBase||activeModule),rule=$('moduleEditRule');
    if(rule){rule.hidden=!error;rule.textContent=error}$('moduleEditSave').disabled=!!error;
    const keepId=activeModule.id;
    renderScene(false);
    activeModule=modules.find(m=>m.id===keepId)||activeModule;
    if(structural)renderModuleEditor(activeModule);else refreshModuleDraftPrice();
  }
  function refreshModuleDraftPrice(){
    const price=$('moduleDraftPrice'),delta=$('moduleDraftDelta');if(!price||!activeModule)return;
    const current=modulePriceOf(activeModule);
    price.textContent=current?money(current):'—';
    if(delta){
      const diff=current-moduleDraftBasePrice;
      delta.textContent=current&&moduleDraftBasePrice?(diff===0?'Без изменения':(diff>0?'+':'')+money(diff)):'';
    }
  }
  async function saveModuleDraft(){
    if(!activeModule||!moduleDraft)return;
    const error=validateModuleDraft(moduleDraft,moduleDraftBase||activeModule);if(error){const rule=$('moduleEditRule');rule.hidden=false;rule.textContent=error;return}
    const id=activeModule.id,overrides=moduleEditOverrides(),payload={...moduleDraft};delete payload.id;
    overrides[id]=payload;
    await saveVisual({...visual,module_edit_overrides:overrides,module_direct_edit_status:'R10.4.0_MODULE_SAVED'},`R10.4.0 module edit ${id}`);
    moduleDraft=null;moduleDraftBase=null;moduleDraftBasePrice=0;
    enterNormalKitchenView();renderScene(false);
    window.dispatchEvent(new CustomEvent('bizet:modelchange',{detail:{reason:'module-edit-save',module_id:id}}));
  }
  function cancelModuleDraft(){
    moduleDraft=null;moduleDraftBase=null;moduleDraftBasePrice=0;
    enterNormalKitchenView();syncFocusControls();renderScene(false);
  }
  function applyFocusPreset(id){
    if(viewMode!==VIEW_FOCUS||!activeModule||!moduleDraft)return;
    const preset=FOCUS_PRESETS.find(p=>p.id===id);if(!preset)return;
    if(moduleEditorKind(activeModule)!=='LOWER')return;
    if(preset.type==='DRAWERS'){
      moduleDraft={...moduleDraft,configuration:'DRAWERS',drawer_count:preset.drawer_count};
    }else{
      moduleDraft={...moduleDraft,configuration:'HINGED',facade_count:2,facade_openings:normalizeOpenings(2,moduleDraft.facade_openings)};
    }
    const keepId=activeModule.id;renderScene(false);activeModule=modules.find(m=>m.id===keepId)||activeModule;renderModuleEditor(activeModule);
  }

  function renderNormalKitchen(engineOk=false){
    viewMode=VIEW_NORMAL;
    prepareRenderLayout();
    scene=window.BizetPilot3D.drawKitchenScene($('modelCanvas'),{
      room:roomValues(),configuration:configuration(),activeWalls:activeWalls(),
      modules,camera:{...camera,screenYOffset:window.innerWidth<=820?-38:0},showDimensions:normalDimensionsVisible,showModuleDimensions:false,
      architecturalElements:project?.room?.architectural_elements||[]
    });
    syncConstraintBanner();renderFocusVariantRibbon(null);
    $('modelStatus').textContent=engineOk?'Module Engine доступен · полная кухня активна.':'3D-пилот · полная кухня активна.';
  }
  function renderModuleFocus(){
    if(!activeModule){renderNormalKitchen(false);return}
    const current=modules.find(m=>m.id===activeModule.id);
    if(!current){activeModule=null;renderNormalKitchen(false);return}
    activeModule=current;
    const run=Math.max(300,runDimension(current)),dep=Math.max(280,depthDimension(current));
    const room={lengthMm:run+1000,depthMm:dep+1000,heightMm:Math.max(1200,current.h+520)};
    const clone={...current,wall:'A',x:500,y:room.depthMm-dep-320,z:120,w:run,d:dep,number:current.number};
    prepareRenderLayout();
    const forceCanvasReset=focusCanvasResetFrames>0;
    if(forceCanvasReset)focusCanvasResetFrames--;
    scene=window.BizetPilot3D.drawKitchenScene($('focusCanvas'),{
      room,configuration:'WALL_CENTER',activeWalls:[],modules:[clone],
      camera:focusCamera,showDimensions:focusDimensionsVisible,showModuleDimensions:focusDimensionsVisible,architecturalElements:[],focusMode:true,
      forceCanvasReset
    });
    syncConstraintBanner();renderFocusVariantRibbon(activeModule);
    $('modelStatus').textContent='Режим модуля · «Вся кухня» вернёт общий вид.';
  }
  function renderScene(engineOk=false){
    setFurniturePalette();
    modules=buildModules();
    renderStrip();
    if(viewMode===VIEW_FOCUS&&activeModule)renderModuleFocus();
    else renderNormalKitchen(engineOk);
  }

  function offsets(){return{...(visual.module_offsets_mm||{})}}
  function runDimension(m){return m.wall==='A'?m.w:m.d}
  function depthDimension(m){return m.wall==='A'?m.d:m.w}
  function widthLocked(m){return['FRIDGE','DISHWASHER','UPPER_HOOD'].includes(m.kind)}
  function detailText(m){
    if(m.kind==='SINK'){const mount={TOP_MOUNT:'накладная',FLUSH:'вровень',UNDERMOUNT:'под столешницей'}[m.sink_mount_type]||'тип монтажа не указан';return `Мойка: ${mount}, чаш: ${m.sink_bowl_count||'—'}, измельчитель: ${m.sink_disposer==='YES'?'да':'нет'}, фильтры: ${m.sink_filters==='YES'?'да':'нет'}.`}
    if(m.kind==='TALL_OVEN'){const parts=['духовка'];if(m.microwave_present==='YES')parts.push(m.microwave_type==='BUILT_IN'?'встраиваемая микроволновка 600×450':'отдельностоящая микроволновка, отделение H350');if(m.coffee_present==='YES')parts.push(m.coffee_type==='BUILT_IN'?'встраиваемая кофемашина 600×450':'отдельностоящая кофемашина');return `Пенал: ${parts.join(' · ')}.`}
    if(m.kind==='UPPER_HOOD')return `Вытяжка ${m.hood_width_mm||'—'} мм · ${m.hood_type==='BUILT_IN'?'встраиваемая':'отдельностоящая'}.`;
    if(m.kind==='FRIDGE'&&m.freestanding)return`Отдельностоящий холодильник · верх холодильник / нижняя морозилка · технологический зазор ${m.appliance_clearance_mm||15} мм с каждой стороны.`;
    if(m.kind==='DISHWASHER'&&m.freestanding)return'Отдельностоящая ПММ с двумя видимыми боковинами по 18 мм.';
    if(m.pending)return'Остаточное пространство. Этот модуль пока формируется системным алгоритмом.';
    return'Локальная настройка модуля. После применения BIZET OS перестраивает зависимую модель.';
  }
  function runFocusPaintBurst(moduleId){
    const token=focusPaintToken;
    let frames=0;
    const paint=()=>{
      if(token!==focusPaintToken||viewMode!==VIEW_FOCUS||activeModule?.id!==moduleId)return;
      renderScene(false);
      frames++;
      if(frames<6)requestAnimationFrame(paint);
    };
    requestAnimationFrame(paint);
    [70,160,280].forEach(delay=>window.setTimeout(()=>{
      if(token===focusPaintToken&&viewMode===VIEW_FOCUS&&activeModule?.id===moduleId)renderScene(false);
    },delay));
  }
  function setValidation(message=''){
    const el=$('moduleValidation');if(!el)return;el.textContent=message;el.hidden=!message;
  }
  function openModule(id){
    const selected=modules.find(m=>m.id===id)||null;if(!enterModuleFocus(selected))return;
    moduleDraftBase={...selected,facade_openings:Array.isArray(selected.facade_openings)?[...selected.facade_openings]:selected.facade_openings};
    moduleDraft=draftFromModule(selected);
    moduleDraftBasePrice=modulePriceOf(selected);
    $('moduleTitle').textContent=`${activeModule.number}. ${activeModule.label}`;
    $('moduleCopy').textContent=detailText(activeModule);
    const w=$('moduleWidth'),h=$('moduleHeight'),d=$('moduleDepth'),o=$('moduleOpening'),pos=$('moduleOffsetInput');
    w.value=Math.round(runDimension(activeModule));h.value=Math.round(activeModule.h);d.value=Math.round(depthDimension(activeModule));
    w.disabled=widthLocked(activeModule)||!!activeModule.pending;
    w.title=w.disabled?'Ширина определяется техникой или системным остатком в текущем пилоте.':'';
    o.value=openingOverrides()[activeModule.id]||activeModule.opening||'AUTO';
    pos.value=Number(offsets()[activeModule.id])||0;
    setValidation('');

    // R10.3.8: isolation owns a dedicated canvas. Do not open the legacy dialog during the transition.
    const dialog=$('moduleDialog');
    if(dialog.open)dialog.close();
    renderScene(false);
    renderModuleEditor(activeModule);
    scheduleRenderAfterLayout('focus-entry');
    requestAnimationFrame(()=>scheduleRenderAfterLayout('focus-entry-second-frame'));
    runFocusPaintBurst(activeModule.id);
  }
  async function applyModuleCustomization(){
    if(!activeModule)return;
    const w=Math.round(Number($('moduleWidth').value)),h=Math.round(Number($('moduleHeight').value)),d=Math.round(Number($('moduleDepth').value)),off=Math.round(Number($('moduleOffsetInput').value)||0);
    const minRun=activeModule.level==='upper'?200:300;
    const requiredRun=activeModule.kind==='SINK'&&Number(activeModule.sink_bowl_count)===2?900:minRun;
    if(!Number.isFinite(h)||h<100||!Number.isFinite(d)||d<100){setValidation('Высота и глубина должны быть не меньше 100 мм.');return}
    if(!widthLocked(activeModule)&&!activeModule.pending&&(!Number.isFinite(w)||w<requiredRun)){setValidation(`Минимальная допустимая ширина для этого модуля: ${requiredRun} мм.`);return}
    const maxRun=maxRunFor(activeModule);if(!widthLocked(activeModule)&&!activeModule.pending&&w>maxRun){setValidation(`Максимальная ширина ${isCornerModule(activeModule)?'углового':'прямого'} модуля: ${maxRun} мм.`);return}
    if(Math.abs(off)>600){setValidation('Смещение больше 600 мм требует проверки конструктора.');return}
    const sizes=sizeOverrides(),opens=openingOverrides(),offs=offsets();
    const currentRun=Math.round(runDimension(activeModule));
    sizes[activeModule.id]={
      run_mm:(widthLocked(activeModule)||activeModule.pending)?currentRun:w,
      height_mm:h,
      depth_mm:d
    };
    opens[activeModule.id]=$('moduleOpening').value||'AUTO';
    offs[activeModule.id]=off;
    const editedId=activeModule.id;
    await saveVisual({...visual,module_size_overrides:sizes,module_opening_overrides:opens,module_offsets_mm:offs,module_direct_edit_status:'PILOT_PARAMETRIC_EDIT'},`Module customization ${editedId}`);
    enterNormalKitchenView();
    $('moduleDialog').close?.();
    renderScene(false);
    $('modelStatus').textContent='Модуль обновлён. Полная кухня восстановлена; зависимые остаточные модули перестроены.';
  }
  async function resetModuleCustomization(){
    if(!activeModule)return;
    const sizes=sizeOverrides(),opens=openingOverrides(),offs=offsets();
    delete sizes[activeModule.id];delete opens[activeModule.id];delete offs[activeModule.id];
    const resetId=activeModule.id;
    await saveVisual({...visual,module_size_overrides:sizes,module_opening_overrides:opens,module_offsets_mm:offs},`Reset module customization ${resetId}`);
    enterNormalKitchenView();$('moduleDialog').close?.();renderScene(false);
  }

  async function patchInputs(patch,reason='R8 workspace'){
    inputs={...inputs,...patch};await saveVisual({...visual,guided_inputs:inputs,r8_workspace:true},reason);renderScene(false);
    window.dispatchEvent(new CustomEvent('bizet:modelchange',{detail:{reason:'inputs',patch}}));return snapshot();
  }
  async function patchVariant(patch){await saveVisual({...visual,r8_variant:{...(visual.r8_variant||{}),...patch}},'R8 variant');renderScene(false);window.dispatchEvent(new CustomEvent('bizet:modelchange',{detail:{reason:'variant'}}));return snapshot()}
  async function patchVisual(patch){await saveVisual({...visual,...patch},'R8 visual');setFurniturePalette();renderScene(false);window.dispatchEvent(new CustomEvent('bizet:modelchange',{detail:{reason:'visual'}}));return snapshot()}
  async function patchElements(elements){const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'room.architectural_elements',value:elements,source:'USER_ENTERED',confirmed:true,reason:'R8 wall elements'})});project=result.project||result;renderScene(false);return snapshot()}
  async function patchRoom(key,value){const path={lengthMm:'room.geometry.wall_length',depthMm:'room.geometry.wall_depth',heightMm:'room.geometry.room_height'}[key];if(!path)return snapshot();const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path,value:Math.round(Number(value)||0),source:'USER_ENTERED',confirmed:false,reason:'R8 room geometry'})});project=result.project||result;renderScene(false);window.dispatchEvent(new CustomEvent('bizet:modelchange',{detail:{reason:'room'}}));return snapshot()}
  async function setPalette(value){visual={...visual,r8_palette:value};if(project?.context)project.context.visual_direction=value;await saveVisual(visual,'R8 palette');setFurniturePalette();renderScene(false);window.dispatchEvent(new CustomEvent('bizet:modelchange',{detail:{reason:'palette'}}));return snapshot()}
  function captureWorkspaceState(){return{
    inputs:{...inputs},
    variant:{...(visual.r8_variant||{})},
    module_offsets_mm:{...(visual.module_offsets_mm||{})},
    module_size_overrides:{...(visual.module_size_overrides||{})},
    module_opening_overrides:{...(visual.module_opening_overrides||{})},
    module_variant_overrides:{...(visual.module_variant_overrides||{})},
    module_edit_overrides:{...(visual.module_edit_overrides||{})}
  }}
  async function applyWorkspaceState(state,reason='R8 saved variant'){
    enterNormalKitchenView();
    const next={...visual};
    if(state.inputs)next.guided_inputs={...state.inputs};
    if(state.variant)next.r8_variant={...state.variant};
    if(state.module_offsets_mm)next.module_offsets_mm={...state.module_offsets_mm};
    if(state.module_size_overrides)next.module_size_overrides={...state.module_size_overrides};
    if(state.module_opening_overrides)next.module_opening_overrides={...state.module_opening_overrides};
    if(state.module_variant_overrides)next.module_variant_overrides={...state.module_variant_overrides};
    if(state.module_edit_overrides)next.module_edit_overrides={...state.module_edit_overrides};
    await saveVisual(next,reason);renderScene(false);return snapshot();
  }
  function snapshot(){return{...captureWorkspaceState(),visual:{...visual},elements:[...(project?.room?.architectural_elements||[])],context:{...(project?.context||{})},room:roomValues(),modules:[...modules]}}
  async function replaceState(state){await applyWorkspaceState(state,'R8 restore state');if(state.elements)await patchElements(state.elements);return snapshot()}
  async function resumeFromSleep(){
    if(resumeFromSleep.busy||!projectId)return;resumeFromSleep.busy=true;
    try{
      const fresh=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{cache:'no-store'});
      project=fresh.project||fresh;visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};setFurniturePalette();
      enterNormalKitchenView();$('moduleDialog')?.close?.();
      requestAnimationFrame(()=>{renderScene(false);requestAnimationFrame(()=>renderScene(false))});
      $('modelStatus').textContent='Проект восстановлен после паузы.';
    }catch(error){
      $('modelStatus').textContent='Восстанавливаем соединение…';
      window.setTimeout(()=>{resumeFromSleep.busy=false;resumeFromSleep()},1200);return;
    }
    resumeFromSleep.busy=false;
  }
  window.BizetModelRuntime={ready:false,getViewMode:()=>viewMode,getActiveModule:()=>activeModule?{...activeModule}:null,exitFocus:()=>{if($('moduleDialog')?.open)$('moduleDialog').close();exitModuleFocus()},getInputs:()=>({...inputs}),getVisual:()=>({...visual}),getVariant:()=>({...visual.r8_variant}),getElements:()=>[...(project?.room?.architectural_elements||[])],getContext:()=>({...project?.context}),getRoom:roomValues,getConfiguration:configuration,getModules:()=>[...modules],patchInputs,patchVariant,patchVisual,patchElements,patchRoom,setPalette,replaceState,captureWorkspaceState,applyWorkspaceState,resume:resumeFromSleep,render:()=>scheduleRenderAfterLayout('runtime-render')};

  const normalCanvas=$('modelCanvas'),focusCanvas=$('focusCanvas');
  function activeCanvas(){return viewMode===VIEW_FOCUS?focusCanvas:normalCanvas}
  function beginCanvasGesture(event){
    const surface=event.currentTarget;
    if(surface!==activeCanvas())return;
    if(event.pointerType==='touch'&&event.isPrimary===false)return;
    const cam=viewMode===VIEW_FOCUS?focusCamera:camera;
    drag={
      id:event.pointerId,
      surface,
      pointerType:event.pointerType||'mouse',
      x:event.clientX,y:event.clientY,
      yaw:cam.yaw,pitch:cam.pitch,
      mode:null
    };
    dragMoved=false;
    try{surface.setPointerCapture?.(event.pointerId)}catch(_){}
  }
  function moveCanvasGesture(event){
    if(!drag||drag.id!==event.pointerId||drag.surface!==event.currentTarget)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y,dist=Math.hypot(dx,dy);
    if(dist<5)return;

    if(!drag.mode){
      drag.mode='ROTATE';
      dragMoved=true;
    }

    // The active canvas owns the gesture; page scroll remains available outside the 3D stage.
    if(event.cancelable)event.preventDefault();
    const cam=viewMode===VIEW_FOCUS?focusCamera:camera;
    cam.yaw=drag.yaw-dx*.0095;
    if(viewMode===VIEW_FOCUS)cam.pitch=clamp(drag.pitch+dy*.006,-1.12,1.12);
    else cam.pitch=drag.pitch;
    renderScene(false);
  }
  function endCanvasGesture(event){
    if(!drag||drag.id!==event.pointerId||drag.surface!==event.currentTarget)return;
    const surface=drag.surface,mode=drag.mode,wasMoved=dragMoved;
    drag=null;
    try{surface.releasePointerCapture?.(event.pointerId)}catch(_){}
    if(!wasMoved&&!mode&&scene&&viewMode===VIEW_NORMAL&&surface===normalCanvas){
      const rect=normalCanvas.getBoundingClientRect(),id=scene.hitTest(event.clientX-rect.left,event.clientY-rect.top);
      if(id)window.setTimeout(()=>openModule(id),0);
    }
  }
  function bindCanvasSurface(surface){
    if(!surface)return;
    surface.addEventListener('pointerdown',beginCanvasGesture,{passive:false});
    surface.addEventListener('pointermove',moveCanvasGesture,{passive:false});
    surface.addEventListener('pointerup',endCanvasGesture,{passive:false});
    surface.addEventListener('pointercancel',event=>{if(drag?.id===event.pointerId&&drag.surface===surface)drag=null});
    surface.addEventListener('wheel',event=>{
      if(surface!==activeCanvas())return;
      event.preventDefault();
      const cam=viewMode===VIEW_FOCUS?focusCamera:camera;
      cam.distanceScale=clamp(cam.distanceScale+(event.deltaY>0?.08:-.08),.58,1.75);
      renderScene(false);
    },{passive:false});
  }
  bindCanvasSurface(normalCanvas);
  bindCanvasSurface(focusCanvas);

  $('focusVariantOptions')?.addEventListener('click',event=>{
    const btn=event.target.closest('[data-focus-preset]');if(!btn||btn.disabled)return;
    try{applyFocusPreset(btn.dataset.focusPreset)}catch(error){const status=$('focusVariantStatus');if(status){status.hidden=false;status.textContent=error.message}}
  });

  $('modelDimensionsToggle').addEventListener('click',()=>{
    if(viewMode===VIEW_FOCUS)focusDimensionsVisible=!focusDimensionsVisible;
    else normalDimensionsVisible=!normalDimensionsVisible;
    syncFocusControls();renderScene(false);
  });
  $('constraintButton')?.addEventListener('click',()=>{
    const btn=$('constraintButton'),el=$('constraintBanner'),open=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',String(!open));el.hidden=open;
  });
  $('focusBackButton')?.addEventListener('click',()=>{
    if($('moduleDialog')?.open)$('moduleDialog').close();
    cancelModuleDraft();
  });
  $('focusBackInline')?.addEventListener('click',()=>{
    const dialog=$('moduleDialog');
    if(dialog?.open)dialog.close();
    cancelModuleDraft();
  });
  function exitModuleFocus(){
    cancelModuleDraft();
  }
  $('moduleClose').addEventListener('click',()=>{
    const dialog=$('moduleDialog');
    if(dialog?.open)dialog.close();else exitModuleFocus();
  });
  $('moduleDialog').addEventListener('close',()=>{if(viewMode===VIEW_FOCUS)exitModuleFocus()});
  $('moduleApply')?.addEventListener('click',()=>applyModuleCustomization().catch(error=>setValidation(error.message)));
  $('moduleReset')?.addEventListener('click',()=>resetModuleCustomization().catch(error=>setValidation(error.message)));
  $('moduleEditSave')?.addEventListener('click',()=>saveModuleDraft().catch(error=>{const rule=$('moduleEditRule');if(rule){rule.hidden=false;rule.textContent=error.message}}));
  $('moduleEditCancel')?.addEventListener('click',()=>cancelModuleDraft());
  $('materialsButton').addEventListener('click',()=>location.assign(`/materials?project=${encodeURIComponent(projectId)}`));$('backButton').addEventListener('click',()=>history.back());
  function redrawForViewportChange(){scheduleRenderAfterLayout('viewport')}
  window.addEventListener('resize',redrawForViewportChange);
  window.visualViewport?.addEventListener('resize',redrawForViewportChange);
  window.addEventListener('orientationchange',()=>scheduleRenderAfterLayout('orientation'));
  const stageResizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{
    const entry=entries[0];if(!entry||!project)return;
    const rect=entry.contentRect,key=`${Math.round(rect.width)}x${Math.round(rect.height)}:${viewMode}`;
    if(key===lastStageSize)return;
    lastStageSize=key;
    scheduleRenderAfterLayout('stage-resize');
  }):null;
  stageResizeObserver?.observe($('modelStage'));
  window.addEventListener('bizet:themechange',()=>requestAnimationFrame(()=>renderScene(false)));
  window.addEventListener('bizet:resume',()=>resumeFromSleep());

  (async()=>{
    if(!projectId){$('modelStatus').textContent='Проект не найден';return}let engineOk=false;
    try{const recalc=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});project=recalc.project;engineOk=!!recalc.legacy_engine_candidate_count}catch(_){project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`)}
    visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};setFurniturePalette();resetCamera();renderScene(engineOk);window.BizetModelRuntime.ready=true;window.dispatchEvent(new CustomEvent('bizet:modelready'));
  })().catch(error=>{$('modelStatus').textContent=error.message});
})();
