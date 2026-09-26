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
  const WORKTOP_RULES=Object.freeze({
    MAX_UNSPLICED_MM:4100,
    JOINT_POLICY:'NEAREST_MODULE_BOUNDARY_NOT_EXCEEDING_MAX',
    classification:'HARD_CATEGORY_I'
  });
  function worktopRunPlan(group=[]){
    const base=group.filter(m=>m&&m.level!=='upper'&&!m.tall);
    if(!base.length)return{start:0,end:0,span:0,joints:[],segments:[]};
    const wall=base[0].wall||'A',startOf=m=>wall==='A'?Number(m.x)||0:Number(m.y)||0,sizeOf=m=>wall==='A'?Number(m.w)||0:Number(m.d)||0;
    const ordered=[...base].sort((a,b)=>startOf(a)-startOf(b));
    const start=Math.min(...ordered.map(startOf)),end=Math.max(...ordered.map(m=>startOf(m)+sizeOf(m))),span=Math.max(0,end-start);
    const boundaries=[...new Set(ordered.slice(0,-1).map(m=>Math.round(startOf(m)+sizeOf(m))))].filter(v=>v>start+.5&&v<end-.5).sort((a,b)=>a-b);
    const joints=[],MAX=WORKTOP_RULES.MAX_UNSPLICED_MM;
    let cursor=start,guard=0;
    while(end-cursor>MAX+.5&&guard++<100){
      const target=cursor+MAX;
      const eligible=boundaries.filter(v=>v>cursor+.5&&v<=target+.5);
      if(!eligible.length)break;
      const joint=eligible[eligible.length-1];
      joints.push(joint);cursor=joint;
    }
    const cuts=[start,...joints,end],segments=[];
    for(let i=0;i<cuts.length-1;i++)segments.push({start:cuts[i],end:cuts[i+1],length:cuts[i+1]-cuts[i]});
    return{wall,start,end,span,boundaries,joints,segments};
  }
  window.BizetR10Rules=Object.freeze({
    hingeVerticalMm:HINGE_VERTICAL_MM,
    moduleLimitsMm:MODULE_LIMITS_MM,
    ergonomicsMm:ERGONOMICS_MM,
    handleRules:HANDLE_RULES,
    cornerRules:CORNER_RULES,
    compositionRules:COMPOSITION_RULES,
    worktopRules:WORKTOP_RULES,
    worktopRunPlan,
    hingeSideCupPosition:Object.freeze({status:'DEFERRED_REQUIRES_OWNER_FREEZE'}),
    additionalHingeCount:Object.freeze({status:'HUMAN_OPEN'})
  });
})();