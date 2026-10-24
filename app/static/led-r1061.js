/* BIZET OS 10.6.1 - provisional LED engineering schedule.
   Market rates are OWNER REFERENCES ONLY and never promoted to supplier-confirmed prices. */
(()=>{'use strict';
const REFERENCE={tape_uah_m:152,profile_2m_uah:169.83,psu_60w_uah:675,
 dimmer_uah:100,cable_uah_m:15,mount_uah_m:314,watts_per_m:10,voltage_v:24};
function manifest(inputs={},modules=[]){
 if(inputs.lighting_enabled!=='YES')return{included:false,segments:[],total_mm:0,total_m:0,watts:0,drivers:0,materials:[]};
 const kelvin=[2700,3000,4000].includes(Number(inputs.lighting_kelvin))?Number(inputs.lighting_kelvin):3000;
 const segments=[];let id=0;
 const emit=(module,zone,lengthMm,placement)=>{
  if(!Number.isFinite(lengthMm)||lengthMm<70)return;
  segments.push({id:'LED-'+String(++id).padStart(3,'0'),module_id:module.id,zone,
   length_mm:Math.round(lengthMm),kelvin,power_w:Math.round(lengthMm/1000*REFERENCE.watts_per_m*100)/100,
   voltage_v:24,profile:'ALUMINIUM_DIFFUSER_UNVERIFIED',switching:'ZONED_CONTROL',
   placement,confirmed:false,production_ready:false});
 };
 const safe=modules.filter(m=>m.kind!=='FILLER'&&!m.freestanding&&!['DISHWASHER'].includes(m.kind));
 if(inputs.lighting_worktop==='YES')safe.filter(m=>m.level==='upper'&&!m.tall).forEach(m=>
   emit(m,'WORKTOP',Math.max(80,(m.wall==='A'?Number(m.w):Number(m.d))-36),'UNDER_UPPER_TO_WORKTOP'));
 if(inputs.lighting_plinth==='YES')safe.filter(m=>m.level!=='upper'&&!m.tall).forEach(m=>
   emit(m,'PLINTH',Math.max(80,(m.wall==='A'?Number(m.w):Number(m.d))-36),'BEHIND_PLINTH'));
 if(inputs.lighting_upper_inside==='YES')safe.filter(m=>m.level==='upper').forEach(m=>
   emit(m,'UPPER_INSIDE',Math.max(80,Number(m.h)-60),'INSIDE_VERTICAL'));
 if(inputs.lighting_lower_inside==='YES')safe.filter(m=>m.level==='lower').forEach(m=>
   emit(m,'LOWER_INSIDE',Math.max(80,Number(m.h)-60),'INSIDE_VERTICAL'));
 const total_mm=segments.reduce((s,x)=>s+x.length_mm,0),total_m=total_mm/1000;
 const watts=segments.reduce((s,x)=>s+x.power_w,0),requiredWatts=watts*1.25;
 const drivers=watts>0?Math.ceil(requiredWatts/60):0,profileCount=Math.ceil(total_m/2),
 cableM=total_m>0?Math.max(3,Math.ceil(total_m*1.2)):0;
 return{included:segments.length>0,segments,total_mm,total_m,watts,requiredWatts,drivers,
  kelvin,power_margin_pct:25,reference_status:'UNVERIFIED_UA_MARKET_OCT_2026',
  materials:total_mm?[{item:'24V COB LED 10 W/m',qty:total_m,unit:'m',price:REFERENCE.tape_uah_m},
   {item:'Aluminium profile + diffuser 2m',qty:profileCount,unit:'pcs',price:REFERENCE.profile_2m_uah},
   {item:'24V PSU 60W',qty:drivers,unit:'pcs',price:REFERENCE.psu_60w_uah},
   {item:'Dimming/sensor controller',qty:1,unit:'pcs',price:REFERENCE.dimmer_uah},
   {item:'2×0.5mm² cable',qty:cableM,unit:'m',price:REFERENCE.cable_uah_m},
   {item:'LED installation',qty:total_m,unit:'m',price:REFERENCE.mount_uah_m}]:[]};
}
function estimate(schedule){return schedule.materials.reduce((s,x)=>s+x.qty*x.price,0)}
window.BizetLED1061={REFERENCE,manifest,estimate};
})();