(() => {
  const PROJECT_KEY='bizet_os_project_id',CONFIG_KEY='bizet_pilot_configuration';
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  const VIEW_NORMAL='NORMAL_KITCHEN_VIEW',VIEW_FOCUS='MODULE_FOCUS_MODE';
  let project=null,visual={},inputs={},activeModule=null,modules=[],scene=null,drag=null,dragMoved=false,dimensionsVisible=true;
  let viewMode=VIEW_NORMAL,focusCamera={yaw:-.36,pitch:.34,distanceScale:.72};

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
  function baseModule(id,label,width,kind,wall='A',extra={}){
    const module={id,label,kind,wall,w:Math.max(100,Number(width)||600),d:LOWER_DEPTH,h:LOWER_BODY_H,z:PLINTH_H,level:'lower',anchor:true,...extra};
    if(kind==='DRAWERS')module.drawer_structure={components:['bottom','left_side','right_side','box_front','box_rear','slides'],facade_separate:true};
    return applyBaseOverride(module);
  }

  function collectedLower(){
    const list=[],walls=activeWalls(),fWall=fridgeWall();
    if(inputs.fridge_present==='YES'){
      const width=Number(inputs.fridge_width_mm)||600,tallHeight=Math.max(1500,Math.min(roomValues().heightMm-140,2100));
      const freeFridge=inputs.fridge_type==='FREESTANDING';
      const fridgeExtra={tall:true,h:tallHeight,z:freeFridge?0:PLINTH_H,content:inputs.fridge_content||'PENDING',freestanding:freeFridge,appliance_width_mm:width};
      if(inputs.fridge_type==='BUILT_IN'&&width===1200){
        list.push(baseModule('fridge-left','Холодильник L',600,'FRIDGE',fWall,{...fridgeExtra,freestanding:false,content:inputs.fridge_left_unit||'PENDING'}));
        list.push(baseModule('fridge-right','Холодильник R',600,'FRIDGE',fWall,{...fridgeExtra,freestanding:false,content:inputs.fridge_right_unit||'PENDING'}));
      }else{
        list.push(baseModule('fridge','Холодильник',width,'FRIDGE',fWall,fridgeExtra));
      }
    }
    list.push(baseModule('sink','Мойка',600,'SINK',sinkWall(),{widthStatus:'PILOT_VISUAL_PLACEHOLDER',sink_mount_type:inputs.sink_mount_type,sink_bowl_count:inputs.sink_bowl_count,sink_disposer:inputs.sink_disposer,sink_filters:inputs.sink_filters}));
    if(inputs.dishwasher_type){
      const wall=walls.includes(inputs.dishwasher_wall)?inputs.dishwasher_wall:'A';
      const applianceWidth=Number(inputs.dishwasher_width_mm)||600;
      const free=inputs.dishwasher_type==='FREESTANDING';
      const sidePanel=free?18:0;
      list.push(baseModule('dishwasher','Посудомоечная машина',applianceWidth+sidePanel*2,'DISHWASHER',wall,{freestanding:free,appliance_width_mm:applianceWidth,side_panel_mm:sidePanel}));
    }
    const cooktopWall=walls.includes(inputs.cooktop_wall)?inputs.cooktop_wall:'A';
    list.push(baseModule('cooktop','Варочная панель',Number(inputs.cooktop_width_mm)||600,'COOKTOP',cooktopWall,{widthStatus:inputs.cooktop_width_mm==='CUSTOM'?'PILOT_VISUAL_PLACEHOLDER':'USER_SELECTED'}));
    if(inputs.oven_location){
      const wall=walls.includes(inputs.oven_wall)?inputs.oven_wall:'A';
      if(inputs.oven_location==='TALL'){
        const tallHeight=Math.max(1500,Math.min(roomValues().heightMm-140,2100));
        list.push(baseModule('oven','Пенал с духовкой',600,'TALL_OVEN',wall,{tall:true,h:tallHeight,widthStatus:'PILOT_VISUAL_PLACEHOLDER',oven_appliance_present:true,mandatory_lower_drawer:true,lower_drawer_count:1,lower_drawer_structure:{components:['bottom','left_side','right_side','box_front','box_rear','slides'],facade_separate:true},microwave_present:inputs.microwave_present,microwave_type:inputs.microwave_type,coffee_present:inputs.coffee_present,coffee_type:inputs.coffee_type,coffee_support:inputs.coffee_support,coffee_compartment:inputs.coffee_compartment,coffee_front_opening:inputs.coffee_front_opening}));
      }else list.push(baseModule('oven','Духовой шкаф',600,'OVEN',wall,{widthStatus:'PILOT_VISUAL_PLACEHOLDER'}));
    }
    return list;
  }

  function wallSpan(wall,room){return wall==='A'?room.lengthMm:room.depthMm}
  function runBounds(wall,room){
    const full=wallSpan(wall,room);
    if(wall==='A'&&configuration().startsWith('WALL_')){const left=Math.max(0,Number(inputs.linear_left_offset_mm)||0),right=Math.max(0,Number(inputs.linear_right_offset_mm)||0);return{start:left,end:Math.max(left+300,full-right),span:Math.max(300,full-left-right)}}
    return{start:0,end:full,span:full};
  }

  function arrangeWall(wall,list,room){
    const bounds=runBounds(wall,room),variant=variantState(),edge=edgeForWall(wall);
    let regular=list.filter(m=>!m.tall),tall=list.filter(m=>m.tall);
    if(wall==='A'&&variant.reverse_wall_a)regular=[...regular].reverse();
    if(wall==='A'&&Number(variant.module_shift)>0&&regular.length>2){
      const n=Number(variant.module_shift)%regular.length;
      regular=regular.slice(n).concat(regular.slice(0,n));
    }

    if(tall.length){
      const fridge=tall.filter(m=>m.kind==='FRIDGE'),otherTall=tall.filter(m=>m.kind!=='FRIDGE');
      if(fridge.length&&inputs.fridge_type==='FREESTANDING'){
        tall=edge==='START'?fridge.concat(otherTall):otherTall.concat(fridge);
      }else if(variant.tall_group_flip){
        tall=[...tall].reverse();
      }
    }

    let ordered=edge==='START'?tall.concat(regular):regular.concat(tall);
    let used=ordered.reduce((sum,m)=>sum+m.w,0);

    if(wall==='A'&&bounds.span-used>=CUTLERY_W){
      const cutlery=baseModule('cutlery','Ящики для приборов',CUTLERY_W,'DRAWERS','A',{anchor:false,system:true});
      let idx=ordered.findIndex(m=>m.kind==='SINK');
      if(idx<0)idx=edge==='END'&&tall.length?ordered.findIndex(m=>m.tall):ordered.length;
      ordered.splice(idx>=0?idx+1:ordered.length,0,cutlery);
      used+=CUTLERY_W;
    }

    const remaining=bounds.span-used;
    if(remaining>=300){
      const fill=baseModule(`system-fill-${wall}`,'Модуль',remaining,'HINGED',wall,{anchor:false,pending:true,system:true});
      if(tall.length&&edge==='END'){
        const firstTall=ordered.findIndex(m=>m.tall);
        ordered.splice(firstTall<0?ordered.length:firstTall,0,fill);
      }else if(tall.length&&edge==='START'){
        let lastTall=-1;ordered.forEach((m,i)=>{if(m.tall)lastTall=i});
        ordered.splice(lastTall+1,0,fill);
      }else ordered.push(fill);
    }

    let cursor=bounds.start;
    return ordered.map(m=>{
      const runSize=m.w,offset=Number(offsetOverrides()[m.id])||0;
      let placed={...m,runSize,runPosition:cursor};
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
      return placed;
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
  function renderNormalKitchen(engineOk=false){
    viewMode=VIEW_NORMAL;
    scene=window.BizetPilot3D.drawKitchenScene($('modelCanvas'),{
      room:roomValues(),configuration:configuration(),activeWalls:activeWalls(),
      modules,camera,showDimensions:dimensionsVisible,
      architecturalElements:project?.room?.architectural_elements||[]
    });
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
      camera:focusCamera,showDimensions:false,architecturalElements:[],focusMode:true
    });
    $('modelStatus').textContent='Режим модуля · закройте редактор, чтобы вернуться к полной кухне.';
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
    if(m.kind==='FRIDGE'&&m.freestanding)return'Отдельностоящий холодильник. В автоконфигураторе он всегда остаётся крайним.';
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
    $('modelStatus').textContent='Модуль обновлён. Полная кухня восстановлена.';
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
      requestAnimationFrame(()=>{renderScene(false);requestAnimationFrame(()=>renderScene(false))});
      $('modelStatus').textContent='Проект восстановлен после паузы.';
    }catch(error){
      $('modelStatus').textContent='Восстанавливаем соединение…';
      window.setTimeout(()=>{resumeFromSleep.busy=false;resumeFromSleep()},1200);return;
    }
    resumeFromSleep.busy=false;
  }
  window.BizetModelRuntime={ready:false,getViewMode:()=>viewMode,getActiveModule:()=>activeModule?{...activeModule}:null,getInputs:()=>({...inputs}),getVisual:()=>({...visual}),getVariant:()=>({...visual.r8_variant}),getElements:()=>[...(project?.room?.architectural_elements||[])],getContext:()=>({...project?.context}),getRoom:roomValues,getConfiguration:configuration,getModules:()=>[...modules],patchInputs,patchVariant,patchVisual,patchElements,patchRoom,setPalette,replaceState,captureWorkspaceState,applyWorkspaceState,resume:resumeFromSleep,render:()=>renderScene(false)};

  const canvas=$('modelCanvas');
  canvas.addEventListener('pointerdown',event=>{const cam=viewMode===VIEW_FOCUS?focusCamera:camera;drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:cam.yaw,pitch:cam.pitch};dragMoved=false;canvas.setPointerCapture?.(event.pointerId)});
  canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>4)dragMoved=true;if(!dragMoved)return;const cam=viewMode===VIEW_FOCUS?focusCamera:camera;cam.yaw=drag.yaw-dx*.008;cam.pitch=clamp(drag.pitch+dy*.006,.08,.85);renderScene(false)});
  function endPointer(event){if(!drag||drag.id!==event.pointerId)return;const wasMoved=dragMoved;drag=null;canvas.releasePointerCapture?.(event.pointerId);if(!wasMoved&&scene&&viewMode===VIEW_NORMAL){const rect=canvas.getBoundingClientRect(),id=scene.hitTest(event.clientX-rect.left,event.clientY-rect.top);if(id)openModule(id)}}
  canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',()=>{drag=null});
  canvas.addEventListener('wheel',event=>{event.preventDefault();const cam=viewMode===VIEW_FOCUS?focusCamera:camera;cam.distanceScale=clamp(cam.distanceScale+(event.deltaY>0?.08:-.08),.58,1.75);renderScene(false)},{passive:false});

  $('modelDimensionsToggle').addEventListener('click',()=>{dimensionsVisible=!dimensionsVisible;$('modelDimensionsToggle').textContent=`Размеры · ${dimensionsVisible?'вкл':'выкл'}`;$('modelDimensionsToggle').setAttribute('aria-pressed',String(dimensionsVisible));renderScene(false)});
  function exitModuleFocus(){
    enterNormalKitchenView();
    renderScene(false);
  }
  $('moduleClose').addEventListener('click',()=>{$('moduleDialog').close?.();exitModuleFocus()});
  $('moduleDialog').addEventListener('close',()=>{if(viewMode===VIEW_FOCUS)exitModuleFocus()});
  $('moduleApply')?.addEventListener('click',()=>applyModuleCustomization().catch(error=>setValidation(error.message)));
  $('moduleReset')?.addEventListener('click',()=>resetModuleCustomization().catch(error=>setValidation(error.message)));
  $('materialsButton').addEventListener('click',()=>location.assign(`/materials?project=${encodeURIComponent(projectId)}`));$('backButton').addEventListener('click',()=>history.back());
  window.addEventListener('resize',()=>requestAnimationFrame(()=>renderScene(false)));window.addEventListener('bizet:themechange',()=>requestAnimationFrame(()=>renderScene(false)));window.addEventListener('bizet:resume',()=>resumeFromSleep());

  (async()=>{
    if(!projectId){$('modelStatus').textContent='Проект не найден';return}let engineOk=false;
    try{const recalc=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});project=recalc.project;engineOk=!!recalc.legacy_engine_candidate_count}catch(_){project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`)}
    visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};setFurniturePalette();resetCamera();renderScene(engineOk);window.BizetModelRuntime.ready=true;window.dispatchEvent(new CustomEvent('bizet:modelready'));
  })().catch(error=>{$('modelStatus').textContent=error.message});
})();
