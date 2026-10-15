(()=> {
  const HINGE_VERTICAL_MM=Object.freeze({
    STANDARD:Object.freeze({top:100,bottom:100,status:'HARD'}),
    SINK_BASE:Object.freeze({top:150,bottom:100,status:'HARD'})
  });
  const MODULE_LIMITS_MM=Object.freeze({
    STRAIGHT_MAX:900,
    CORNER_MAX:1250,
    PREFERRED_FILL:600,
    HINGED_FACADE_MAX:597,
    MIN_STANDARD_MODULE:300,
    status:'HARD'
  });
  const ERGONOMICS_MM=Object.freeze({
    SINK_COOKTOP_HARD_MIN:500,
    SINK_COOKTOP_PREFERRED:900,
    SINK_OVEN_SAME_WALL_MIN:1000,
    TRIANGLE_LEG_MIN:1200,
    TRIANGLE_LEG_MAX:2700,
    TRIANGLE_SUM_MAX:7900,
    classification:'PILOT_ERGONOMIC_WITH_HARD_SINK_COOKTOP_MIN'
  });
  const HANDLE_RULES=Object.freeze({
    visibleInNormalView:true,
    defaultType:'STANDARD',
    hingedDefaultOrientation:'HORIZONTAL',
    drawerOrientation:'HORIZONTAL',
    defaultEdgeOffsetMm:50,
    drawerCountDefault:2,
    fastenersPerHandle:2,
    drillingPerHandle:2,
    drillingDiameterMm:5,
    classification:'PILOT_VISUAL_PRODUCTION_LINK'
  });
  const CORNER_RULES=Object.freeze({
    ZONE_DEPTH:600,
    MAX_CORNER_MODULE:1250,
    ALLOWED_KINDS:Object.freeze(['SINK','CORNER']),
    FORBIDDEN_APPLIANCES:Object.freeze(['COOKTOP','DISHWASHER','FRIDGE','TALL_OVEN','OVEN','MICROWAVE','TALL']),
    classification:'HARD'
  });
  const COMPOSITION_RULES=Object.freeze({
    centerPrimaryApplianceOnLongRun:true,
    skipWhenCommunicationsConfirmed:true,
    classification:'PILOT_COMPOSITION_SCORE'
  });
  const OVEN_RULES=Object.freeze({
    DEFAULT_APPLIANCE_HEIGHT_MM:600,
    TECHNICAL_GAP_MM:3,
    DRAWER_BOX_REDUCTION_FROM_FACADE_MM:50,
    BODY_HEIGHT_FORMULA:'LOWER_OVERALL_MINUS_WORKTOP_MINUS_SUPPORTS',
    classification:'HARD'
  });
  const DISHWASHER_RULES=Object.freeze({
    TEMPLATE_REQUIRED:true,
    ALLOWED_WIDTHS_MM:Object.freeze([450,600]),
    PLACEMENT_PRIORITY:'IMMEDIATELY_AFTER_SINK_ELSE_NEAREST',
    OPENING:'FLAP_DOWN',
    HANDLE_ORIENTATION:'HORIZONTAL',
    HANDLE_TOP_OFFSET_MM:40,
    classification:'HARD_TEMPLATE'
  });
  const SINK_BASE_RULES=Object.freeze({
    RAIL_COUNT:3,
    RAIL_ORIENTATION:'VERTICAL_ON_EDGE',
    FRONT_RAIL:'UNDER_TOP_AT_FRONT_EDGE',
    REAR_LOWER_RAIL:'JOINS_BOTTOM_AT_BACK',
    REAR_UPPER_RAIL_FROM_TOP_MM:150,
    DEFAULT_TRAY:true,
    TRAY_SUPPLIER:'KRONAS',
    TRAY_FAMILY:'VOLPATO_ALUMINIUM',
    TRAYS_BY_FACADE_WIDTH_MM:Object.freeze({
      600:Object.freeze({article:'08773',name:'Volpato L=600 aluminium'}),
      800:Object.freeze({article:'08774',name:'Volpato L=800 aluminium'}),
      900:Object.freeze({article:'08775',name:'Volpato L=900 aluminium'}),
      1000:Object.freeze({article:'110433',name:'Volpato L=1000 aluminium'})
    }),
    classification:'HARD_WITH_SUPPLIER_PROFILE'
  });
  const WORKTOP_RULES=Object.freeze({
    MAX_UNSPLICED_MM:4100,
    JOINT_POLICY:'NEAREST_ALLOWED_MODULE_BOUNDARY_NOT_EXCEEDING_MAX',
    JOINT_FORBIDDEN_ADJACENT_KINDS:Object.freeze(['SINK','COOKTOP']),
    ZONE_POLICY:'NO_JOINT_ON_EITHER_BOUNDARY_TOUCHING_SINK_OR_COOKTOP',
    classification:'HARD'
  });
  const PLINTH_RULES=Object.freeze({
    MAX_UNSPLICED_MM:4100,
    JOINT_POLICY:'NEAREST_MODULE_BOUNDARY_NOT_EXCEEDING_MAX',
    CONNECTOR_POLICY:'ONE_UNIVERSAL_CONNECTOR_PER_JOINT_STRAIGHT_OR_CORNER',
    classification:'HARD_CATEGORY_I'
  });
  const CLOTHES_ROD_RULES=Object.freeze({
    CENTER_BELOW_UPPER_SHELF_MM:80,
    ANCHOR:'NEAREST_UPPER_SHELF_UNDERSIDE',
    FALLBACK:'TOP_PANEL_UNDERSIDE',
    classification:'HARD'
  });
  function clothesRodCenterFromUpperShelf(shelfCenterMm,shelfThicknessMm=18){
    return (Number(shelfCenterMm)||0)-Math.max(0,Number(shelfThicknessMm)||0)/2-CLOTHES_ROD_RULES.CENTER_BELOW_UPPER_SHELF_MM;
  }
  function plinthRunPlan(group=[]){
    const base=group.filter(m=>m&&m.level!=='upper'&&!m.freestanding&&Number(m.z)>0);
    if(!base.length)return{start:0,end:0,span:0,joints:[],segments:[]};
    const wall=base[0].wall||'A',startOf=m=>wall==='A'?Number(m.x)||0:Number(m.y)||0,sizeOf=m=>wall==='A'?Number(m.w)||0:Number(m.d)||0;
    const ordered=[...base].sort((a,b)=>startOf(a)-startOf(b));
    const start=Math.min(...ordered.map(startOf)),end=Math.max(...ordered.map(m=>startOf(m)+sizeOf(m))),span=Math.max(0,end-start);
    const boundaries=[...new Set(ordered.slice(0,-1).map(m=>Math.round(startOf(m)+sizeOf(m))))].filter(v=>v>start+.5&&v<end-.5).sort((a,b)=>a-b);
    const joints=[],MAX=PLINTH_RULES.MAX_UNSPLICED_MM;
    let cursor=start,guard=0;
    while(end-cursor>MAX+.5&&guard++<100){
      const target=cursor+MAX,eligible=boundaries.filter(v=>v>cursor+.5&&v<=target+.5);
      if(!eligible.length)break;
      const joint=eligible[eligible.length-1];joints.push(joint);cursor=joint;
    }
    const cuts=[start,...joints,end],segments=[];
    for(let i=0;i<cuts.length-1;i++)segments.push({start:cuts[i],end:cuts[i+1],length:cuts[i+1]-cuts[i]});
    return{wall,start,end,span,boundaries,joints,segments};
  }

  function worktopRunPlan(group=[],options={}){
    const base=group.filter(m=>m&&m.level!=='upper'&&!m.tall);
    if(!base.length)return{start:0,end:0,span:0,joints:[],segments:[],forbiddenBoundaries:[]};
    const wall=base[0].wall||'A',startOf=m=>wall==='A'?Number(m.x)||0:Number(m.y)||0,sizeOf=m=>wall==='A'?Number(m.w)||0:Number(m.d)||0;
    const ordered=[...base].sort((a,b)=>startOf(a)-startOf(b));
    const start=Math.min(...ordered.map(startOf)),end=Math.max(...ordered.map(m=>startOf(m)+sizeOf(m))),span=Math.max(0,end-start);
    const descriptors=ordered.slice(0,-1).map((left,i)=>({
      value:Math.round(startOf(left)+sizeOf(left)),
      left,
      right:ordered[i+1]
    })).filter(x=>x.value>start+.5&&x.value<end-.5);
    const forbiddenKinds=new Set(WORKTOP_RULES.JOINT_FORBIDDEN_ADJACENT_KINDS);
    const enforceCriticalZones=options.enforceCriticalZones!==false;
    const forbiddenBoundaries=enforceCriticalZones?descriptors.filter(x=>forbiddenKinds.has(x.left?.kind)||forbiddenKinds.has(x.right?.kind)).map(x=>x.value):[];
    const forbiddenSet=new Set(forbiddenBoundaries);
    const boundaries=[...new Set(descriptors.map(x=>x.value))].sort((a,b)=>a-b);
    const allowedBoundaries=boundaries.filter(v=>!forbiddenSet.has(v));
    const joints=[],MAX=WORKTOP_RULES.MAX_UNSPLICED_MM;
    let cursor=start,guard=0,blockedByCriticalZone=false;
    while(end-cursor>MAX+.5&&guard++<100){
      const target=cursor+MAX;
      const eligible=allowedBoundaries.filter(v=>v>cursor+.5&&v<=target+.5);
      if(!eligible.length){
        blockedByCriticalZone=enforceCriticalZones&&boundaries.some(v=>v>cursor+.5&&v<=target+.5&&forbiddenSet.has(v));
        break;
      }
      const joint=eligible[eligible.length-1];
      joints.push(joint);cursor=joint;
    }
    const cuts=[start,...joints,end],segments=[];
    for(let i=0;i<cuts.length-1;i++)segments.push({start:cuts[i],end:cuts[i+1],length:cuts[i+1]-cuts[i]});
    return{wall,start,end,span,boundaries,allowedBoundaries,forbiddenBoundaries,joints,segments,blockedByCriticalZone};
  }
  window.BizetR10Rules=Object.freeze({
    hingeVerticalMm:HINGE_VERTICAL_MM,
    moduleLimitsMm:MODULE_LIMITS_MM,
    ergonomicsMm:ERGONOMICS_MM,
    handleRules:HANDLE_RULES,
    cornerRules:CORNER_RULES,
    compositionRules:COMPOSITION_RULES,
    ovenRules:OVEN_RULES,
    dishwasherRules:DISHWASHER_RULES,
    sinkBaseRules:SINK_BASE_RULES,
    worktopRules:WORKTOP_RULES,
    worktopRunPlan,
    plinthRules:PLINTH_RULES,
    plinthRunPlan,
    clothesRodRules:CLOTHES_ROD_RULES,
    clothesRodCenterFromUpperShelf,
    hingeSideCupPosition:Object.freeze({status:'DEFERRED_REQUIRES_OWNER_FREEZE'}),
    additionalHingeCount:Object.freeze({status:'HUMAN_OPEN'})
  });
})();