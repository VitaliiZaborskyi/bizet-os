/* BIZET OS 10.6.1: fixed external module span, end panels independent of carcass.
   Explicitly do NOT compress refrigerator nominal 600 mm. */
(()=>{'use strict';
 function panelThickness(m){
  const t=Number(m?.end_panel_thickness_mm)||18;
  return Math.max(8,Math.min(45,t));
 }
 function body(m){
  const edges=Array.isArray(m?.end_panel_edges)?m.end_panel_edges:[];
  if(!edges.length||m.kind==='FRIDGE'||m.kind==='FILLER'||m.kind==='DISHWASHER'||m.freestanding)return m;
  const t=panelThickness(m),left=edges.includes('START')?t:0,right=edges.includes('END')?t:0;
  const axis=m.wall==='A'?'w':'d',coord=m.wall==='A'?'x':'y',outer=Number(m[axis])||0;
  const net=outer-left-right;
  if(net<Math.max(250,Number(m.carcass_min_span_mm)||250))return m;
  return{...m,[axis]:net,[coord]:(Number(m[coord])||0)+left,
   outer_run_mm:outer,carcass_run_mm:net,panel_sum_mm:left+right,panel_start_mm:left,panel_end_mm:right};
 }
 function validate(m){
  const edges=Array.isArray(m?.end_panel_edges)?m.end_panel_edges:[];
  if(!edges.length)return{ok:true};
  if(m.kind==='FRIDGE')return{ok:false,code:'STOP_FRIDGE_PANEL_EXTERNAL_COMPENSATION_UNRESOLVED',
    message:'Refrigerator min 600 mm: external panel must be absorbed by valid adjustable neighbor'};
  const b=body(m);
  if(b===m)return{ok:false,code:'STOP_END_PANEL_MINIMUM_CARCASS_SPAN',message:'No valid carcass span after end panels'};
  return{ok:true,outer_mm:b.outer_run_mm,carcass_mm:b.carcass_run_mm,panel_mm:b.panel_sum_mm};
 }
 window.BizetPanelsR1061={panelThickness,body,validate};
})();