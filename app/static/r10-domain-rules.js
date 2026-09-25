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
  window.BizetR10Rules=Object.freeze({
    hingeVerticalMm:HINGE_VERTICAL_MM,
    moduleLimitsMm:MODULE_LIMITS_MM,
    hingeSideCupPosition:Object.freeze({status:'DEFERRED_REQUIRES_OWNER_FREEZE'}),
    additionalHingeCount:Object.freeze({status:'HUMAN_OPEN'})
  });
})();