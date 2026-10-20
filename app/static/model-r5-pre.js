(() => {
  if(!window.BizetPilot3D)return;
  const originalDraw=window.BizetPilot3D.drawKitchenScene;
  const originalDefaults=window.BizetPilot3D.cameraDefaults;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const clone=m=>({...m});

  window.BizetPilot3D.cameraDefaults=function(configuration){
    const base=originalDefaults(configuration);
    const narrow=window.matchMedia?.('(max-width: 700px)')?.matches;
    return {...base,distanceScale:Math.max(Number(base.distanceScale)||1,narrow?1.14:1.06)};
  };

  function runPosition(m){return m.wall==='A'?m.x:m.y;}
  function setRunPosition(m,value){
    if(m.wall==='A')m.x=value;
    else m.y=value;
  }
  function runSize(m){return m.wall==='A'?m.w:m.d;}

  function dishwasherPreference(){return {
    present:localStorage.getItem('bizet_r5_dishwasher_present')||'',
    near:localStorage.getItem('bizet_r5_dishwasher_near_sink')||'',
    side:localStorage.getItem('bizet_r5_dishwasher_side')||''
  }}

  function reorderDishwasher(order){
    const pref=dishwasherPreference();
    const sinkIndex=order.findIndex(m=>m.kind==='SINK');
    const dwIndex=order.findIndex(m=>m.kind==='DISHWASHER');
    if(sinkIndex<0||dwIndex<0)return order;
    const sink=order[sinkIndex],dw=order[dwIndex];
    if(sink.wall!==dw.wall)return order;
    const rest=order.filter(m=>m!==sink&&m!==dw);
    const anchor=Math.max(0,Math.min(rest.length,sinkIndex));
    if(pref.near==='YES'){
      const pair=pref.side==='LEFT'?[dw,sink]:[sink,dw];
      rest.splice(anchor,0,...pair);return rest;
    }
    if(pref.near==='NO'){
      const spacerIndex=rest.findIndex(m=>!m.tall&&(m.pending||m.system||m.kind==='HINGED'||m.kind==='DRAWERS'));
      const spacer=spacerIndex>=0?rest.splice(spacerIndex,1)[0]:null;
      const group=spacer?[sink,spacer,dw]:[sink,dw];
      rest.splice(anchor,0,...group);return rest;
    }
    return order;
  }

  function normalizeHighRun(modules,wall){
    const run=modules.filter(m=>m.level!=='upper'&&m.wall===wall&&!m.__r5Overlay);
    const fridges=run.filter(m=>m.kind==='FRIDGE');
    const oven=run.find(m=>m.kind==='TALL_OVEN');
    if(!run.length)return;
    let ordered=[...run].sort((a,b)=>runPosition(a)-runPosition(b));
    ordered=reorderDishwasher(ordered);
    if(fridges.length&&oven){
      const fridgeMin=Math.min(...fridges.map(runPosition));
      const fridgeMax=Math.max(...fridges.map(m=>runPosition(m)+runSize(m)));
      const runMin=Math.min(...run.map(runPosition));
      const runMax=Math.max(...run.map(m=>runPosition(m)+runSize(m)));
      const onLeft=Math.abs(fridgeMin-runMin)<=Math.abs(runMax-fridgeMax);
      const fridgeOrder=[...fridges].sort((a,b)=>runPosition(a)-runPosition(b));
      const others=ordered.filter(m=>!fridges.includes(m)&&m!==oven);
      ordered=onLeft?[...fridgeOrder,oven,...others]:[...others,oven,...fridgeOrder];
    }
    const start=Math.min(...run.map(runPosition));
    let cursor=start;
    for(const item of ordered){setRunPosition(item,cursor);cursor+=runSize(item);}
  }

  function blackOverlayFor(tall,z,h,kind,id){
    const inset=.12;
    if(tall.wall==='A')return {id,kind:'UPPER_HOOD',hood_type:'FREESTANDING',wall:'A',x:tall.x+tall.w*inset,y:tall.y-14,z,w:tall.w*(1-inset*2),d:14,h,level:'overlay',tall:true,anchor:false,__r5Overlay:true,__r5Appliance:kind};
    const verticalInset=tall.d*inset;
    const x=tall.wall==='B'?tall.x+tall.w-14:tall.x;
    return {id,kind:'UPPER_HOOD',hood_type:'FREESTANDING',wall:tall.wall,x,y:tall.y+verticalInset,z,w:14,d:tall.d*(1-inset*2),h,level:'overlay',tall:true,anchor:false,__r5Overlay:true,__r5Appliance:kind};
  }

  function ovenOverlays(modules){
    const extra=[];
    const lowerNeighbours=modules.filter(m=>m.level!=='upper'&&!m.tall&&!m.__r5Overlay);
    for(const tall of modules.filter(m=>m.kind==='TALL_OVEN')){
      const neighbours=lowerNeighbours.filter(m=>m.wall===tall.wall);
      const reference=neighbours[0];
      const facadeTop=reference?reference.z+reference.h:tall.z+tall.h*.42;
      const facadeHeight=reference?reference.h:tall.h*.34;
      const hasExtra=tall.microwave_present==='YES'||tall.coffee_present==='YES';
      const ovenBase=clamp(hasExtra?facadeTop-facadeHeight*.5:facadeTop,tall.z+tall.h*.12,tall.z+tall.h*.68);
      const applianceH=Math.min(tall.h*.20,Math.max(180,tall.h*.15));
      tall.__r5OvenVerticalMode=hasExtra?'LOWERED_HALF_LOWER_FACADE':'RAISED_TO_LOWER_FACADE_TOP';
      tall.kind='TALL_OVEN_SHELL';
      extra.push(blackOverlayFor(tall,ovenBase,applianceH,'OVEN',`${tall.id}-r5-oven`));
      let cursor=ovenBase+applianceH+tall.h*.035;
      if(tall.microwave_present==='YES'){
        const h=tall.h*.14;extra.push(blackOverlayFor(tall,cursor,h,'MICROWAVE',`${tall.id}-r5-microwave`));cursor+=h+tall.h*.025;
      }
      if(tall.coffee_present==='YES')extra.push(blackOverlayFor(tall,cursor,tall.h*.14,'COFFEE',`${tall.id}-r5-coffee`));
    }
    return extra;
  }

  function topFillerOverlays(modules,room){
    const ceiling=localStorage.getItem('bizet_r5_ceiling')||'';
    const h=ceiling==='STRETCH_A'?120:(ceiling==='STRETCH_B'||ceiling==='GYPSUM'?18:0);
    if(!h)return[];
    const out=[];
    for(const wall of ['A','B','C']){
      const candidates=modules.filter(m=>m.wall===wall&&(m.level==='upper'||m.tall)&&!m.__r5Overlay);
      if(!candidates.length)continue;
      const z=Math.min(Number(room.heightMm)||2800,Math.max(...candidates.map(m=>m.z+m.h)));
      if(wall==='A'){
        const x0=Math.min(...candidates.map(m=>m.x)),x1=Math.max(...candidates.map(m=>m.x+m.w));
        out.push({id:`r5-top-filler-${wall}`,kind:'FILLER',wall,x:x0,y:(Number(room.depthMm)||4200)-18,z:z-h,w:x1-x0,d:18,h,level:'upper',system:true,anchor:false,__r5Overlay:true,filler_rule:ceiling==='STRETCH_A'?'STRETCH_PROFILE_L_120':'MIN_TOP_FILLER_18'});
      }else{
        const y0=Math.min(...candidates.map(m=>m.y)),y1=Math.max(...candidates.map(m=>m.y+m.d));
        out.push({id:`r5-top-filler-${wall}`,kind:'FILLER',wall,x:wall==='B'?0:(Number(room.lengthMm)||6000)-18,y:y0,z:z-h,w:18,d:y1-y0,h,level:'upper',system:true,anchor:false,__r5Overlay:true,filler_rule:ceiling==='STRETCH_A'?'STRETCH_PROFILE_L_120':'MIN_TOP_FILLER_18'});
      }
    }
    return out;
  }

  function addRuleMetadata(snapshot,configuration){
    snapshot.rules={
      refrigerator_edge_default:true,
      fridge_oven_adjacent_same_wall:true,
      dishwasher_near_sink_priority:true,
      corner_front_l_filler_required:['L_LEFT','L_RIGHT','U_SHAPE'].includes(configuration),
      wall_l_filler_required:true,
      ceiling_filler:localStorage.getItem('bizet_r5_ceiling')||null
    };
  }

  window.BizetPilot3D.drawKitchenScene=function(canvas,options={}){
    const cloned=(options.modules||[]).map(clone);
    ['A','B','C'].forEach(w=>normalizeHighRun(cloned,w));
    const overlays=ovenOverlays(cloned);
    const fillers=topFillerOverlays(cloned,options.room||{});
    const all=[...cloned,...fillers,...overlays];
    try{
      const snapshot={room:options.room||{},configuration:options.configuration||'WALL_CENTER',activeWalls:options.activeWalls||[],modules:cloned.map(m=>({...m}))};
      addRuleMetadata(snapshot,snapshot.configuration);
      sessionStorage.setItem('bizet_r5_model_snapshot',JSON.stringify(snapshot));
    }catch(_){}
    return originalDraw(canvas,{...options,modules:all});
  };
})();
