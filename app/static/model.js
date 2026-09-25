(() => {
  const PROJECT_KEY='bizet_os_project_id',CONFIG_KEY='bizet_pilot_configuration';
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  const VIEW_NORMAL='NORMAL_KITCHEN_VIEW',VIEW_FOCUS='MODULE_FOCUS_MODE';
  let project=null,visual={},inputs={},activeModule=null,modules=[],scene=null,drag=null,dragMoved=false;
  let viewMode=VIEW_NORMAL,focusCamera={yaw:-.36,pitch:.34,distanceScale:.72},focusDimensionsVisible=true,normalDimensionsVisible=true;
  let layoutWarnings=[];
  const LIMITS=window.BizetR10Rules?.moduleLimitsMm||{STRAIGHT_MAX:900,CORNER_MAX:1250,PREFERRED_FILL:600,HINGED_FACADE_MAX:597,MIN_STANDARD_MODULE:300};
  const ERGO=window.BizetR10Rules?.ergonomicsMm||{SINK_COOKTOP_HARD_MIN:500,SINK_COOKTOP_PREFERRED:900,SINK_OVEN_SAME_WALL_MIN:1000,TRIANGLE_LEG_MIN:1200,TRIANGLE_LEG_MAX:2700,TRIANGLE_SUM_MAX:7900};
  const CORNER=window.BizetR10Rules?.cornerRules||{ZONE_DEPTH:600,MAX_CORNER_MODULE:1250,ALLOWED_KINDS:['SINK','CORNER']};
  const COMPOSITION=window.BizetR10Rules?.compositionRules||{centerPrimaryApplianceOnLongRun:true,skipWhenCommunicationsConfirmed:true};

  // Visual pilot proportions only. Furniture hard rules remain in the backend engine.
  const LOWER_DEPTH=560,PLINTH_H=100,WORKTOP_H=38,LOWER_TOTAL_H=900,LOWER_BODY_H=LOWER_TOTAL_H-PLINTH_H-WORKTOP_H;
  const UPPER_DEPTH=320,UPPER_HOOD_DEPTH=350,UPPER_MAX_H=1000,CUTLERY_W=400;

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
    if(m?.freestanding===true)return Math.max(LIMITS.STRAIGHT_MAX,runWidth(m)||LIMITS.STRAIGHT_MAX);
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
    const back=$('focusBackButton'),dims=$('modelDimensionsToggle');
    if(back)back.hidden=!inFocus;
    if(dims){
      const on=inFocus?focusDimensionsVisible:normalDimensionsVisible;
      dims.hidden=false;dims.textContent='📏';dims.setAttribute('aria-label',on?'Скрыть размеры':'Показать размеры');dims.title=on?'Скрыть размеры':'Показать размеры';dims.setAttribute('aria-pressed',String(on));
    }
  }
  function variantState(){return {...(visual.r8_variant||{})}}
  function sizeOverrides(){return {...(visual.module_size_overrides||{})}}
  function openingOverrides(){return {...(visual.module_opening_overrides||{})}}
  function offsetOverrides(){return {...(visual.module_offsets_mm||{})}}
  function setFurniturePalette(){const d=String(visual.r8_palette||project?.context?.visual_direction||'LIGHT').toLowerCase();document.documentElement.dataset.furniturePalette=d}
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
    return module;
  }

  let camera={yaw:0,pitch:.33,distanceScale:1};
  function resetCamera(){camera=window.BizetPilot3D?.cameraDefaults?.(configuration())||{yaw:0,pitch:.33,distanceScale:1}}

  function enterNormalKitchenView(){
    viewMode=VIEW_NORMAL;activeModule=null;drag=null;
  }
  function enterModuleFocus(module){
    if(!module)return false;
    activeModule=module;viewMode=VIEW_FOCUS;focusCamera={yaw:-.36,pitch:.34,distanceScale:.72};
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
    const module={id,label,kind,wall,w:Math.max(100,Number(width)||600),d:LOWER_DEPTH,h:LOWER_BODY_H,z:PLINTH_H,level:'lower',anchor:true,...extra};
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
      const fridgeExtra={tall:true,h:tallHeight,z:freeFridge?0:PLINTH_H,content:freeFridge?'FRIDGE_FREEZER':(inputs.fridge_content||'PENDING'),freestanding:freeFridge,appliance_width_mm:width,appliance_clearance_mm:clearance,freezer_bottom:true};
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
      if(first.kind!=='HINGED'||!first.system||first.ergonomic_spacer||first.corner_guard){i++;continue}
      const width=Math.round(first.w);let j=i+1;
      while(j<ordered.length&&ordered[j].kind==='HINGED'&&ordered[j].system&&!ordered[j].ergonomic_spacer&&!ordered[j].corner_guard&&Math.round(ordered[j].w)===width)j++;
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
      if(['HINGED','SINK','UPPER','UPPER_TOP','UPPER_DRYER','TALL_OVEN'].includes(placed.kind))placed.facade_count=hingedFacadeCountFor(placed);
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
      if(['UPPER','UPPER_TOP','UPPER_DRYER'].includes(m.kind))m.facade_count=hingedFacadeCountFor(m);
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
  function renderNormalKitchen(engineOk=false){
    viewMode=VIEW_NORMAL;
    scene=window.BizetPilot3D.drawKitchenScene($('modelCanvas'),{
      room:roomValues(),configuration:configuration(),activeWalls:activeWalls(),
      modules,camera,showDimensions:normalDimensionsVisible,showModuleDimensions:false,
      architecturalElements:project?.room?.architectural_elements||[]
    });
    syncFocusControls();syncConstraintBanner();
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
    scene=window.BizetPilot3D.drawKitchenScene($('modelCanvas'),{
      room,configuration:'WALL_CENTER',activeWalls:[],modules:[clone],
      camera:focusCamera,showDimensions:focusDimensionsVisible,showModuleDimensions:focusDimensionsVisible,architecturalElements:[],focusMode:true
    });
    syncFocusControls();syncConstraintBanner();
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
  function setValidation(message=''){
    const el=$('moduleValidation');if(!el)return;el.textContent=message;el.hidden=!message;
  }
  function openModule(id){
    const selected=modules.find(m=>m.id===id)||null;if(!enterModuleFocus(selected))return;
    $('moduleTitle').textContent=`${activeModule.number}. ${activeModule.label}`;
    $('moduleCopy').textContent=detailText(activeModule);
    const w=$('moduleWidth'),h=$('moduleHeight'),d=$('moduleDepth'),o=$('moduleOpening'),pos=$('moduleOffsetInput');
    w.value=Math.round(runDimension(activeModule));h.value=Math.round(activeModule.h);d.value=Math.round(depthDimension(activeModule));
    w.disabled=widthLocked(activeModule)||!!activeModule.pending;
    w.title=w.disabled?'Ширина определяется техникой или системным остатком в текущем пилоте.':'';
    o.value=openingOverrides()[activeModule.id]||activeModule.opening||'AUTO';
    pos.value=Number(offsets()[activeModule.id])||0;
    setValidation('');
    renderScene(false);
    const dialog=$('moduleDialog');
    if(dialog.open)dialog.close();
    if(typeof dialog.show==='function')dialog.show();else dialog.showModal?.();
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
    inputs={...inputs,...patch};await saveVisual({...visual,guided_inputs:inputs,r8_workspace:true},reason);renderScene(false);return snapshot();
  }
  async function patchVariant(patch){await saveVisual({...visual,r8_variant:{...(visual.r8_variant||{}),...patch}},'R8 variant');renderScene(false);return snapshot()}
  async function patchVisual(patch){await saveVisual({...visual,...patch},'R8 visual');renderScene(false);return snapshot()}
  async function patchElements(elements){const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'room.architectural_elements',value:elements,source:'USER_ENTERED',confirmed:true,reason:'R8 wall elements'})});project=result.project||result;renderScene(false);return snapshot()}
  async function patchRoom(key,value){const path={lengthMm:'room.geometry.wall_length',depthMm:'room.geometry.wall_depth',heightMm:'room.geometry.room_height'}[key];if(!path)return snapshot();const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path,value:Math.round(Number(value)||0),source:'USER_ENTERED',confirmed:false,reason:'R8 room geometry'})});project=result.project||result;renderScene(false);return snapshot()}
  async function setPalette(value){visual={...visual,r8_palette:value};if(project?.context)project.context.visual_direction=value;await saveVisual(visual,'R8 palette');setFurniturePalette();renderScene(false);return snapshot()}
  function captureWorkspaceState(){return{
    inputs:{...inputs},
    variant:{...(visual.r8_variant||{})},
    module_offsets_mm:{...(visual.module_offsets_mm||{})},
    module_size_overrides:{...(visual.module_size_overrides||{})},
    module_opening_overrides:{...(visual.module_opening_overrides||{})}
  }}
  async function applyWorkspaceState(state,reason='R8 saved variant'){
    enterNormalKitchenView();
    const next={...visual};
    if(state.inputs)next.guided_inputs={...state.inputs};
    if(state.variant)next.r8_variant={...state.variant};
    if(state.module_offsets_mm)next.module_offsets_mm={...state.module_offsets_mm};
    if(state.module_size_overrides)next.module_size_overrides={...state.module_size_overrides};
    if(state.module_opening_overrides)next.module_opening_overrides={...state.module_opening_overrides};
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
  window.BizetModelRuntime={ready:false,getViewMode:()=>viewMode,getActiveModule:()=>activeModule?{...activeModule}:null,exitFocus:()=>{if($('moduleDialog')?.open)$('moduleDialog').close();else exitModuleFocus()},getInputs:()=>({...inputs}),getVisual:()=>({...visual}),getVariant:()=>({...visual.r8_variant}),getElements:()=>[...(project?.room?.architectural_elements||[])],getContext:()=>({...project?.context}),getRoom:roomValues,getConfiguration:configuration,getModules:()=>[...modules],patchInputs,patchVariant,patchVisual,patchElements,patchRoom,setPalette,replaceState,captureWorkspaceState,applyWorkspaceState,resume:resumeFromSleep,render:()=>renderScene(false)};

  const canvas=$('modelCanvas');
  canvas.addEventListener('pointerdown',event=>{
    const cam=viewMode===VIEW_FOCUS?focusCamera:camera;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:cam.yaw,pitch:cam.pitch,mode:null};
    dragMoved=false;
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y,dist=Math.hypot(dx,dy);
    if(dist<10)return;
    if(!drag.mode){
      if(Math.abs(dy)>Math.abs(dx)*1.12){drag.mode='SCROLL';return}
      drag.mode='ROTATE';dragMoved=true;canvas.setPointerCapture?.(event.pointerId);
    }
    if(drag.mode!=='ROTATE')return;
    const cam=viewMode===VIEW_FOCUS?focusCamera:camera;
    cam.yaw=drag.yaw-dx*.008;cam.pitch=clamp(drag.pitch+dy*.0045,.08,.85);renderScene(false);
  });
  function endPointer(event){
    if(!drag||drag.id!==event.pointerId)return;
    const mode=drag.mode,wasMoved=dragMoved;drag=null;
    try{canvas.releasePointerCapture?.(event.pointerId)}catch(_){}
    if(mode!=='ROTATE'&&!wasMoved&&scene&&viewMode===VIEW_NORMAL){
      const rect=canvas.getBoundingClientRect(),id=scene.hitTest(event.clientX-rect.left,event.clientY-rect.top);if(id)openModule(id);
    }
  }
  canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',()=>{drag=null});
  canvas.addEventListener('wheel',event=>{event.preventDefault();const cam=viewMode===VIEW_FOCUS?focusCamera:camera;cam.distanceScale=clamp(cam.distanceScale+(event.deltaY>0?.08:-.08),.58,1.75);renderScene(false)},{passive:false});

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
    const dialog=$('moduleDialog');
    if(dialog?.open)dialog.close();else exitModuleFocus();
  });
  $('focusBackInline')?.addEventListener('click',()=>{
    const dialog=$('moduleDialog');
    if(dialog?.open)dialog.close();else exitModuleFocus();
  });
  function exitModuleFocus(){
    enterNormalKitchenView();syncFocusControls();
    renderScene(false);
  }
  $('moduleClose').addEventListener('click',()=>{
    const dialog=$('moduleDialog');
    if(dialog?.open)dialog.close();else exitModuleFocus();
  });
  $('moduleDialog').addEventListener('close',()=>{if(viewMode===VIEW_FOCUS)exitModuleFocus()});
  $('moduleApply')?.addEventListener('click',()=>applyModuleCustomization().catch(error=>setValidation(error.message)));
  $('moduleReset')?.addEventListener('click',()=>resetModuleCustomization().catch(error=>setValidation(error.message)));
  $('materialsButton').addEventListener('click',()=>location.assign(`/materials?project=${encodeURIComponent(projectId)}`));$('backButton').addEventListener('click',()=>history.back());
  window.addEventListener('resize',()=>{if(viewMode===VIEW_FOCUS){$('moduleDialog')?.close?.();enterNormalKitchenView()}requestAnimationFrame(()=>renderScene(false))});
  window.addEventListener('bizet:themechange',()=>requestAnimationFrame(()=>renderScene(false)));
  window.addEventListener('bizet:resume',()=>resumeFromSleep());

  (async()=>{
    if(!projectId){$('modelStatus').textContent='Проект не найден';return}let engineOk=false;
    try{const recalc=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});project=recalc.project;engineOk=!!recalc.legacy_engine_candidate_count}catch(_){project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`)}
    visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};setFurniturePalette();resetCamera();renderScene(engineOk);window.BizetModelRuntime.ready=true;window.dispatchEvent(new CustomEvent('bizet:modelready'));
  })().catch(error=>{$('modelStatus').textContent=error.message});
})();
