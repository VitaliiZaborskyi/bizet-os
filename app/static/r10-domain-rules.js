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
  window.BizetR10Rules=Object.freeze({
    hingeVerticalMm:HINGE_VERTICAL_MM,
    moduleLimitsMm:MODULE_LIMITS_MM,
    ergonomicsMm:ERGONOMICS_MM,
    handleRules:HANDLE_RULES,
    cornerRules:CORNER_RULES,
    compositionRules:COMPOSITION_RULES,
    hingeSideCupPosition:Object.freeze({status:'DEFERRED_REQUIRES_OWNER_FREEZE'}),
    additionalHingeCount:Object.freeze({status:'HUMAN_OPEN'})
  });
})();