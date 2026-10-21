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
  // Owner-approved pilot defaults, per wall A lower carcass depth:
  // 600 countertop depth - 40 cabinet-front allowance - 45 wall gap = 515.
  // Groove geometry is not yet a supplier validated machining profile.
  const R1059_CARCASS_RULES=Object.freeze({
    WORKTOP_WALL_TO_FRONT_MM:600,
    FRONT_OVERHANG_FACADE_MM:20,
    FRONT_OVERHANG_CARCASS_MM:40,
    LOWER_WALL_CLEARANCE_MM:45,
    LOWER_CARCASS_DEPTH_MM:515,
    DRAWER_SLIDE_500_MIN_CARCASS_MM:513,
    DEFAULT_SLIDE_LENGTH_MM:500,
    ALTERNATIVE_SLIDE_LENGTH_MM:450,
    UPPER_ROOF_FRONT_RECESS_MM:1,
    UPPER_ROOF_REAR_RECESS_MM:20,
    UPPER_ROOF_DEPTH_REDUCTION_MM:21,
    UPPER_BACK_RECESS_MM:20,
    UPPER_BOTTOM_FULL_DEPTH:true,
    UPPER_BACK_GROOVES:'SIDE_AND_BOTTOM_PENDING_CNC_PROFILE',
    classification:'HARD_OWNER_DIMENSIONS_PILOT_UNVERIFIED_MACHINING'
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
  // R10.5.4: shared policy for face hardware and floor-standing modules.
  const R1054_HANDLE_POLICY=Object.freeze({
    APPLIED_ALLOWED_PLACEMENTS:Object.freeze(['CENTER','OPPOSITE_HINGES']),
    LOCAL_OVERRIDE_KINDS:Object.freeze(['FRIDGE','TALL_OVEN']),
    LOCAL_OVERRIDE_MODES:Object.freeze(['INHERIT','INDIVIDUAL']),
    INDIVIDUAL_SYSTEMS:Object.freeze(['STANDARD','GOLA','EDGE','PROFILE','PUSH']),
    EXCLUSIVE_APPLIED_AND_PROFILE:true,
    classification:'HARD_OWNER_2026_10_20'
  });
  const R1054_FRIDGE_POLICY=Object.freeze({
    SUPPORTS_REQUIRED:true,
    COMMON_PLINTH_REQUIRED:true,
    PLINTH_GRILLE_WIDTH_MM:460,
    PLINTH_GRILLE_HEIGHT_MM:60,
    BOTTOM_VENT_DIAMETER_MM:250,
    classification:'HARD_OWNER_2026_10_20'
  });
  function normalizeHandleSystem(value){
    const v=String(value??'STANDARD').trim().toUpperCase();
    if(['YES','TRUE','GOLA','HANDLELESS_PROFILE'].includes(v))return'GOLA';
    if(['NO','FALSE','STANDARD','HANDLE','APPLIED'].includes(v))return'STANDARD';
    if(['PUSH','PUSH_TO_OPEN','HANDLELESS'].includes(v))return'PUSH';
    return ['EDGE','PROFILE'].includes(v)?v:'STANDARD';
  }
  function permitsLocalHandleOverride(m={}){
    return !!m.tall||R1054_HANDLE_POLICY.LOCAL_OVERRIDE_KINDS.includes(m.kind);
  }
  function resolveModuleHandle(m={},inputs={}){
    const mode=permitsLocalHandleOverride(m)&&String(m.handle_override_mode||'INHERIT').toUpperCase()==='INDIVIDUAL'?'INDIVIDUAL':'INHERIT';
    const globalRaw=inputs.handle_system==='GOLA'||String(inputs.gola_system||'').toUpperCase()==='YES'?'GOLA':inputs.handle_system;
    const system=normalizeHandleSystem(mode==='INDIVIDUAL'?m.individual_handle_system:(globalRaw||'STANDARD'));
    const placement=String(m.handle_placement||'OPPOSITE_HINGES').toUpperCase()==='CENTER'?'CENTER':'OPPOSITE_HINGES';
    return {mode,system,placement,applied:system==='STANDARD',profile:['GOLA','EDGE','PROFILE'].includes(system)};
  }
  function appliedHandleOffset(hingeSide='LEFT',placement='OPPOSITE_HINGES',halfSpanMm=250,edgeOffsetMm=40){
    if(String(placement).toUpperCase()==='CENTER')return 0;
    const available=Math.max(0,(Number(halfSpanMm)||0)-(Number(edgeOffsetMm)||0));
    return String(hingeSide).toUpperCase()==='RIGHT'?-available:available;
  }
  function requiresFloorSupports(m={}){
    return m.level!=='upper'&&!m.freestanding&&m.kind!=='FILLER'&&!m.wall_mounted&&!m.suspended&&!m.console_mount&&Number(m.z)>0;
  }
  function requiresCommonPlinth(m={}){return requiresFloorSupports(m)}
  // R10.5.5 #27–#28: conservative PILOT geometry guard, NOT a BLUM catalogue profile.
  // Approved hardware series, plate projections and bore templates remain HUMAN OPEN.
  const R1055_SHELF_RULES=Object.freeze({
    STEP_MM:64,SHELF_THICKNESS_MM:18,EDGE_CLEARANCE_MM:38,
    MAX_SHELVES:5,POSITION_EDITING:'FROZEN_EQUAL_COMPARTMENTS_R1059',
    HINGE_CLEARANCE_PROXY_MM:60,MIN_HINGE_SPACING_PROXY_MM:120,
    classification:'PILOT_NO_MANUFACTURING_CERTIFICATION'
  });
  function fixedShelfCenters(m={}){
    const h=Number(m.h)||0,z=Number(m.z)||0,t=18;
    const count=Math.max(0,Math.min(5,Math.round(Number(m.shelf_count??1)||0)));
    // Equal CLEAR heights (not equal centre-to-centre distances). Explicit
    // positions are intentionally ignored while owner shelf movement is frozen.
    const free=Math.max(0,h-2*t-count*t),opening=free/(count+1);
    return Array.from({length:count},(_,i)=>z+t+(i+1)*opening+i*t+t/2);
  }
  function planHingePositions(m={},shelfCenters=fixedShelfCenters(m)){
    const z=Number(m.z)||0,h=Number(m.h)||0;
    const manual=Number(m.hinge_count),nominal=manual>=2&&manual<=6?manual:h>1100?3:2;
    const ends=Number(m.kind==='SINK'?150:100),minGap=R1055_SHELF_RULES.MIN_HINGE_SPACING_PROXY_MM;
    if(h<=2*ends||!Number.isFinite(h))return{ok:false,positions:[],count:nominal,reason:'HARD_GEOMETRY_INVALID'};
    const min=z+ends,max=z+h-ends,placed=[];
    for(let i=0;i<nominal;i++){
      const target=min+(max-min)*i/Math.max(1,nominal-1),candidates=[];
      for(let d=0;d<=max-min;d+=16){candidates.push(target+d);if(d)candidates.push(target-d)}
      const valid=candidates.find(y=>y>=min&&y<=max&&shelfCenters.every(sz=>Math.abs(y-sz)>=R1055_SHELF_RULES.HINGE_CLEARANCE_PROXY_MM)&&placed.every(py=>Math.abs(y-py)>=minGap));
      if(valid===undefined)return{ok:false,positions:placed,count:nominal,reason:'HINGE_SHELF_COLLISION_STOP',catalog:'UNCONFIRMED'};
      placed.push(Math.round(valid));
    }
    return{ok:true,positions:placed,count:nominal,catalog:'UNCONFIRMED_PROXY',classification:'PILOT'};
  }
  function allowedShelfPositions(m={},index=0){
    const current=fixedShelfCenters(m),z=Number(m.z)||0,h=Number(m.h)||0,t=R1055_SHELF_RULES.SHELF_THICKNESS_MM;
    if(index<0||index>=current.length||m.shelf_type!=='FIXED'||R1055_SHELF_RULES.POSITION_EDITING.startsWith('FROZEN'))return[];
    const lo=z+t+R1055_SHELF_RULES.EDGE_CLEARANCE_MM,hi=z+h-t-R1055_SHELF_RULES.EDGE_CLEARANCE_MM;
    const prev=index>0?current[index-1]+t+R1055_SHELF_RULES.EDGE_CLEARANCE_MM:lo;
    const next=index<current.length-1?current[index+1]-t-R1055_SHELF_RULES.EDGE_CLEARANCE_MM:hi;
    const result=[];
    for(let n=-12;n<=12;n++){
      const proposed=Math.round(current[index]+n*R1055_SHELF_RULES.STEP_MM);
      if(proposed<Math.max(lo,prev)||proposed>Math.min(hi,next))continue;
      const centers=current.map((v,i)=>i===index?proposed:v);
      if(!planHingePositions(m,centers).ok)continue;
      result.push({z_mm:proposed,delta_mm:n*R1055_SHELF_RULES.STEP_MM});
    }
    return result;
  }
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
    r1054HandlePolicy:R1054_HANDLE_POLICY,
    r1054FridgePolicy:R1054_FRIDGE_POLICY,
    normalizeHandleSystem,
    permitsLocalHandleOverride,
    resolveModuleHandle,
    appliedHandleOffset,
    requiresFloorSupports,
    requiresCommonPlinth,
    r1055ShelfRules:R1055_SHELF_RULES,
    fixedShelfCenters,
    planHingePositions,
    allowedShelfPositions,
    cornerRules:CORNER_RULES,
    compositionRules:COMPOSITION_RULES,
    r1059CarcassRules:R1059_CARCASS_RULES,
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