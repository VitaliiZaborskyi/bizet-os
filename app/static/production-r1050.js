(() => {
'use strict';
const EDGE_MM=.8;
const PROFILE_KEY='bizet_production_profile';
const SOURCE={
  IMPORT:'IMPORT',
  GENERATED:'BIZET GENERATED'
};
const PROFILES={
  QUADRO:{id:'QUADRO',name:'Quadro',active:true,country:'UA',project3dc:true},
  VIYAR:{id:'VIYAR',name:'Viyar',active:false,country:'UA',project3dc:false},
  KRONAS:{id:'KRONAS',name:'Kronas',active:false,country:'UA',project3dc:false}
};
/* Confirmat geometry is derived from the known-good Project3dc reference supplied for Quadro.
   Keep it as a profile/template value, never as an unchangeable universal constant. */
const FASTENER_TEMPLATES={
  CONFIRMAT_6_3X50:{
    id:'CONFIRMAT_6_3X50',
    materialId:'101:2',
    code:'019556',
    name:'Confirmat 6.3x50',
    diameter:6.3,
    length:50,
    face:{diameter:7,depth:18,type:'FACE'},
    edge:{diameter:5,depth:52,type:'EDGE'}
  },
  DOWEL_8X30:{
    id:'DOWEL_8X30',
    materialId:'110:1',
    code:'DOWEL/8/30',
    name:'Dowel 8x30',
    diameter:8,
    length:30,
    face:{diameter:8,depth:12,type:'FACE'},
    edge:{diameter:8,depth:22,type:'EDGE'}
  }
};
const MATERIALS={
  '202:2':{id:'202:2',type:'sheet',code:'CBD_WHITE18',name:'Chipboard 18 mm',thick:18},
  '202:58':{id:'202:58',type:'sheet',code:'MDF18',name:'MDF 18 mm',thick:18},
  '202:90':{id:'202:90',type:'sheet',code:'CBD_DRAWERS_16_2',name:'Chipboard drawers 16.2 mm',thick:16.2},
  '202:9':{id:'202:9',type:'sheet',code:'HDF_3',name:'HDF 3 mm',thick:3},
  'BIZET:BAND:08':{id:'BIZET:BAND:08',type:'band',code:'BAND_08_GENERIC',name:'PVC edge 0.8 mm',thick:.8},
  '101:2':{id:'101:2',type:'fastener',code:'019556',name:'Confirmat 6.3x50'},
  '110:1':{id:'110:1',type:'fastener',code:'DOWEL/8/30',name:'Dowel 8x30'}
};
const CLASSES=[
 ['0','Not defined'],['1','Assembly'],['4','Miscellaneous materials'],['6','Operation'],['18','Sheet Part'],['19','Fittings'],['34','Worktop'],['50','Sheet Door'],['51','Fastener'],['66','Other Parts'],['82','Extruded Door'],['114','Bent Sheet'],['130','Profile Part'],['146','Sheet layer'],['200','Door-Assembly'],['210','Drawer']
];
const UNITS=[['0','Piece','pcs'],['1','Meter','m'],['2','Square meter','m2'],['3','Kilogram','kg'],['4','Litre','l'],['5','Millimetre','mm'],['6','Set','set'],['8','Cubic meters','m3'],['10','Unit of calculation','calc.u.']];
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const f=(v,d=5)=>n(v).toFixed(d);
function profile(){const id=localStorage.getItem(PROFILE_KEY)||'QUADRO';return PROFILES[id]||PROFILES.QUADRO}
function setProfile(id){if(PROFILES[id]?.active)localStorage.setItem(PROFILE_KEY,id);return profile()}
function defaultEdges(part){
  if(n(part.thick)<=3||/HDF|BACK/i.test(String(part.material||'')+' '+String(part.name||'')))return{L:null,T:null,R:null,B:null};
  return{
    L:{materialId:'BIZET:BAND:08',thickness:EDGE_MM},
    T:{materialId:'BIZET:BAND:08',thickness:EDGE_MM},
    R:{materialId:'BIZET:BAND:08',thickness:EDGE_MM},
    B:{materialId:'BIZET:BAND:08',thickness:EDGE_MM}
  };
}
function normalizeEdges(edges,part){
  const base=defaultEdges(part),src=edges||{};
  return ['L','T','R','B'].reduce((o,k)=>{
    const e=src[k]===false?null:(src[k]||base[k]);
    o[k]=e?{materialId:e.materialId||'BIZET:BAND:08',thickness:n(e.thickness,EDGE_MM)}:null;
    return o;
  },{});
}
function normalizePart(raw,index,source=SOURCE.GENERATED){
  const length=Math.max(0,n(raw.length??raw.l)),width=Math.max(0,n(raw.width??raw.w)),thick=Math.max(.1,n(raw.thick??raw.dtt,18));
  const materialId=raw.materialId||raw.material||'202:2';
  const part={id:raw.id||'P'+(index+1),code:raw.code||'BIZET.'+String(index+1).padStart(3,'0'),name:raw.name||'Part '+(index+1),klass:String(raw.klass||'18'),qty:Math.max(1,n(raw.qty??raw.quantity,1)),materialId,material:raw.materialName||raw.material||MATERIALS[materialId]?.name||'Material',length,width,thick,source,drillings:Array.isArray(raw.drillings)?raw.drillings.map(normalizeDrilling):[],operations:Array.isArray(raw.operations)?raw.operations:[],edges:null};
  part.edges=normalizeEdges(raw.edges,part);
  const lr=n(part.edges.L?.thickness)+n(part.edges.R?.thickness),tb=n(part.edges.T?.thickness)+n(part.edges.B?.thickness);
  part.finished={length,width};
  part.cut={length:Math.max(0,length-lr),width:Math.max(0,width-tb)};
  return part;
}
function normalizeDrilling(h){
  const type=String(h.type||((h.axis==='z'||Math.abs(n(h.vectorZ))>.5)?'FACE':'EDGE')).toUpperCase();
  const vector=type==='FACE'?{x:0,y:0,z:n(h.vectorZ,-1)||-1}:{x:n(h.vectorX,h.axis==='x'?1:0),y:n(h.vectorY,h.axis==='y'?1:0),z:n(h.vectorZ,0)};
  return{id:h.id||'',x:n(h.x),y:n(h.y),z:n(h.z),diameter:n(h.diameter??h.diam,5),depth:n(h.depth,12),type:type==='FACE'?'FACE':'EDGE',vector,connectionId:h.connectionId||h.ProjMark||'UNRESOLVED',status:h.status||'RESOLVED'};
}
function generatedConnectionsFromModules(modules,parts){
  const out=[];let seq=1;
  (modules||[]).filter(m=>!m.freestanding&&m.kind!=='FILLER').forEach(m=>{
    const prefix=String(m.number||'');
    const related=parts.filter(p=>String(p.code||'').startsWith(prefix+'.')||String(p.code||'').startsWith('M'+prefix+'.'));
    const left=related.find(p=>/Left/i.test(p.name)),right=related.find(p=>/Right/i.test(p.name));
    const bottom=related.find(p=>/Bottom/i.test(p.name)&&!/Drawer/i.test(p.name)),top=related.find(p=>/^Top$| Top$/i.test(p.name));
    [[left,bottom,'LB'],[right,bottom,'RB'],[left,top,'LT'],[right,top,'RT']].forEach(([facePart,edgePart,suffix])=>{
      if(!facePart||!edgePart)return;
      [30,70].forEach((offset,j)=>{
        const id='CN-'+String(seq++).padStart(5,'0');
        const face={id:id+'-F',x:Math.max(9,facePart.length-27),y:Math.min(facePart.width-9,offset),z:facePart.thick,diameter:7,depth:facePart.thick,type:'FACE',vector:{x:0,y:0,z:-1},connectionId:id,status:'RESOLVED'};
        const edge={id:id+'-E',x:0,y:Math.min(edgePart.width-9,offset),z:edgePart.thick/2,diameter:5,depth:52,type:'EDGE',vector:{x:1,y:0,z:0},connectionId:id,status:'RESOLVED'};
        facePart.drillings.push(face);edgePart.drillings.push(edge);
        out.push({id,source:SOURCE.GENERATED,fastener:{...FASTENER_TEMPLATES.CONFIRMAT_6_3X50},parts:[facePart.id,edgePart.id],holes:[face,edge],moduleId:m.id||'',tag:suffix+'-'+(j+1)});
      });
    });
  });
  // Drawer box dowels are canonical BIZET GENERATED connections, not viewer-only decoration.
  const drawerGroups=new Map();
  (parts||[]).filter(p=>/^Drawer (Left|Right|Front|Back)/i.test(String(p.name||''))).forEach(p=>{
    const m=String(p.code||'').match(/^(.*?\.\d+)\.(?:00)?[1-4]$/);
    const key=m?m[1]:String(p.code||'').replace(/\.(?:00)?[1-4]$/,'');
    if(!drawerGroups.has(key))drawerGroups.set(key,[]);
    drawerGroups.get(key).push(p);
  });
  drawerGroups.forEach(group=>{
    const left=group.find(p=>/Drawer Left/i.test(p.name)),right=group.find(p=>/Drawer Right/i.test(p.name));
    const front=group.find(p=>/Drawer Front/i.test(p.name)),back=group.find(p=>/Drawer Back/i.test(p.name));
    [[left,front,'LF'],[right,front,'RF'],[left,back,'LB'],[right,back,'RB']].forEach(([facePart,edgePart,tag])=>{
      if(!facePart||!edgePart)return;
      [35,Math.max(55,Math.min(facePart.length-35,facePart.length-35))].forEach((offset,j)=>{
        const id='DW-'+String(seq++).padStart(5,'0');
        const face={id:id+'-F',x:Math.min(facePart.length-10,Math.max(10,offset)),y:Math.min(facePart.width-10,30),z:facePart.thick,diameter:8,depth:12,type:'FACE',vector:{x:0,y:0,z:-1},connectionId:id,status:'RESOLVED'};
        const edge={id:id+'-E',x:0,y:Math.min(edgePart.width-10,30),z:edgePart.thick/2,diameter:8,depth:22,type:'EDGE',vector:{x:1,y:0,z:0},connectionId:id,status:'RESOLVED'};
        facePart.drillings.push(face);edgePart.drillings.push(edge);
        out.push({id,source:SOURCE.GENERATED,fastener:{...FASTENER_TEMPLATES.DOWEL_8X30},parts:[facePart.id,edgePart.id],holes:[face,edge],tag:'DRAWER-'+tag+'-'+(j+1)});
      });
    });
  });
  return out;
}
function connectionsFromGrandeBridge(bridge,parts){
  const ops=bridge?.getFasteners?.()||[],drills=bridge?.getDrills?.()||[],out=[];let seq=1;
  const byPart=new Map(parts.map(p=>[p.id,p]));
  drills.forEach((d,i)=>{
    const part=byPart.get(d.partId)||parts.find(p=>String(p.code).includes(String(d.partId||'')));
    if(!part)return;
    const hole=normalizeDrilling({...d,id:'IMP-H'+(i+1),status:'RESOLVED',connectionId:'UNRESOLVED'});
    part.drillings.push(hole);
  });
  ops.filter(o=>o.type==='CONFIRMAT').forEach(o=>{
    const id='CN-'+String(seq++).padStart(5,'0');
    out.push({id,source:SOURCE.GENERATED,fastener:{...FASTENER_TEMPLATES.CONFIRMAT_6_3X50},parts:[],holes:[],position:{x:n(o.x),y:n(o.y),z:n(o.z)},status:'PILOT_POSITION_ONLY'});
  });
  return out;
}
function shape(l,w,sign=''){
  const id=x=>sign+String(x);
  return '<Shape>'+
    '<EdgeLine id="'+id(1)+'" X1="0.00000" Y1="0.00000" X2="'+f(l)+'" Y2="0.00000"/>'+
    '<EdgeLine id="'+id(2)+'" X1="'+f(l)+'" Y1="0.00000" X2="'+f(l)+'" Y2="'+f(w)+'"/>'+
    '<EdgeLine id="'+id(3)+'" X1="'+f(l)+'" Y1="'+f(w)+'" X2="0.00000" Y2="'+f(w)+'"/>'+
    '<EdgeLine id="'+id(4)+'" X1="0.00000" Y1="'+f(w)+'" X2="0.00000" Y2="0.00000"/>'+
  '</Shape>';
}
const EDGE_ID={B:1,R:2,T:3,L:4};
function bandsXml(part){
  const attrs=[],rows=[];
  for(const side of ['L','T','R','B']){
    const e=part.edges[side];if(!e)continue;
    attrs.push('band'+side+'="'+esc(e.materialId)+'" band'+side+'type="0"');
    const q=(side==='L'||side==='R')?part.finished.width:part.finished.length;
    rows.push('<Band id="'+esc(e.materialId)+'" quantity="'+f(q)+'" edgeType="0" edgeId="'+EDGE_ID[side]+'"/>');
  }
  return{attrs:attrs.join(' '),xml:rows.length?'<Bands>'+rows.join('')+'</Bands>':''};
}
function drillXml(part,connectionIdMap){
  return (part.drillings||[]).map(h=>{
    const v=h.vector||{x:0,y:0,z:h.type==='FACE'?-1:0};
    const raw=String(h.connectionId||'');
    const mark=connectionIdMap?.get(raw)||'';
    return '<Drilling X="'+f(h.x)+'" Y="'+f(h.y)+'" Z="'+f(h.z)+'" vectorX="'+f(v.x)+'" vectorY="'+f(v.y)+'" vectorZ="'+f(v.z)+'"'+(mark?' ProjMark="'+esc(mark)+'"':'')+' DrilType="'+(h.type==='FACE'?'2':'1')+'" depth="'+f(h.depth)+'" diam="'+n(h.diameter).toFixed(2)+'"/>';
  }).join('');
}
function partXml(part,parentId,xmlId,connectionIdMap){
  const b=bandsXml(part),dr=drillXml(part,connectionIdMap),overallL=part.finished.length,overallW=part.finished.width,cutL=part.cut.length,cutW=part.cut.width;
  return '<Obj id="'+esc(xmlId)+'" class="'+esc(part.klass)+'" code="'+esc(part.code)+'" name="'+esc(part.name)+'" position="" quantity="'+part.qty+'" unit="0" l="'+f(overallL,3)+'" w="'+f(overallW,3)+'" dtt="'+f(part.thick,3)+'" manipulation="0" dl="'+f(cutL,3)+'" dw="'+f(cutW,3)+'" dtl="'+f(cutL,3)+'" dtw="'+f(cutW,3)+'" material="'+esc(part.materialId)+'" txt="false" cutting="true" FactAngle="true" parent="'+esc(parentId)+'" cost="0" costFlag="false" opFlag="" barcode="" '+b.attrs+' machine="">'+
    b.xml+
    '<ShapeOverallCS><Side id="base" FaceProp="true">'+shape(overallL,overallW)+'</Side><Side id="2">'+shape(overallL,overallW,'-')+'</Side><Drillings>'+dr+'</Drillings></ShapeOverallCS>'+
    '<ShapeCuttingCS><Side id="base" FaceProp="true">'+shape(cutL,cutW)+'</Side><Side id="2">'+shape(cutL,cutW,'-')+'</Side><Drillings>'+dr+'</Drillings></ShapeCuttingCS>'+
  '</Obj>';
}
function dictionaries(parts){
  const ids=new Set(parts.map(p=>p.materialId));ids.add('BIZET:BAND:08');ids.add('101:2');ids.add('110:1');
  const mats=[...ids].map(id=>MATERIALS[id]||{id,type:'sheet',code:id,name:id,thick:parts.find(p=>p.materialId===id)?.thick||18});
  return '<Dictionary><Classes>'+CLASSES.map(([id,description])=>'<Item id="'+id+'" description="'+description+'"/>').join('')+'</Classes>'+
    '<Units>'+UNITS.map(([id,description,name])=>'<Item id="'+id+'" description="'+description+'" name="'+name+'"/>').join('')+'</Units>'+
    '<Materials>'+mats.map(m=>'<Item id="'+esc(m.id)+'" type="'+esc(m.type)+'" code="'+esc(m.code)+'" name="'+esc(m.name)+'"'+(m.thick!=null?' thick="'+n(m.thick)+'"':'')+' cost="0"/>').join('')+'</Materials></Dictionary>';
}
function preflight(model,{allowUnresolved=false}={}){
 const errors=[],warnings=[],parts=Array.isArray(model?.parts)?model.parts:[],connections=Array.isArray(model?.connections)?model.connections:[];
 if(!parts.length)errors.push('NO_PARTS');
 const partIds=new Set(),connectionIds=new Set();
 parts.forEach((p,i)=>{
   if(!p?.id)errors.push('PART_ID_MISSING:'+i); else if(partIds.has(p.id))errors.push('PART_ID_DUPLICATE:'+p.id); else partIds.add(p.id);
   if(!(n(p?.finished?.length)>0&&n(p?.finished?.width)>0&&n(p?.thick)>0))errors.push('PART_GEOMETRY_INVALID:'+(p?.code||i));
   ['L','T','R','B'].forEach(side=>{const e=p?.edges?.[side];if(e&&!(n(e.thickness)>0))errors.push('EDGE_INVALID:'+(p?.code||i)+':'+side)});
 });
 connections.forEach((x,i)=>{
   if(!x?.id)errors.push('CONNECTION_ID_MISSING:'+i); else if(connectionIds.has(x.id))errors.push('CONNECTION_ID_DUPLICATE:'+x.id); else connectionIds.add(x.id);
   if(!x?.fastener?.code)errors.push('FASTENER_CODE_MISSING:'+(x?.id||i));
 });
 parts.forEach(p=>(p.drillings||[]).forEach(h=>{
   const id=String(h.connectionId||'');
   if(!id||id==='UNRESOLVED'||h.status==='UNRESOLVED'){
     if(allowUnresolved)warnings.push('UNRESOLVED_DRILLING:'+(p.code||p.id)); else errors.push('UNRESOLVED_DRILLING:'+(p.code||p.id));
   } else if(!connectionIds.has(id))errors.push('DRILLING_CONNECTION_MISSING:'+id);
 }));
 connections.forEach(x=>{
   (x.parts||[]).forEach(id=>{if(id&&!partIds.has(id))errors.push('CONNECTION_PART_MISSING:'+x.id+':'+id)});
   if(x.status==='PILOT_POSITION_ONLY'&&!allowUnresolved)errors.push('CONNECTION_NOT_PART_BOUND:'+x.id);
 });
 return{ok:errors.length===0,errors:[...new Set(errors)],warnings:[...new Set(warnings)],counts:{parts:parts.length,connections:connections.length,drillings:parts.reduce((s,p)=>s+(p.drillings||[]).length,0)}};
}
function projectXml({name='BIZET_Project',parts=[],connections=[],source=SOURCE.GENERATED,dimensions={}}={}){
  // Quadro's known-good sample uses numeric project-object IDs. Keep BIZET IDs internally,
  // but map every exported Obj and ProjMark to stable numeric IDs.
  const parentId='1';
  const partIdMap=new Map(parts.map((p,i)=>[String(p.id),String(1000+i)]));
  const connectionIdMap=new Map(connections.map((x,i)=>[String(x.id),String(500000+i)]));
  const fasteners=(connections||[]).map((x,i)=>{
    const xid=connectionIdMap.get(String(x.id));
    const mid=x.fastener?.materialId||'101:2';
    return '<Obj id="'+esc(xid)+'" class="51" code="'+esc(x.fastener?.code||'019556')+'" name="'+esc(x.fastener?.name||'Confirmat 6.3x50')+'" position="" quantity="1" unit="0" parent="'+parentId+'" cost="0" costFlag="false" material="'+esc(mid)+'"/>';
  }).join('');
  const assembly='<Obj id="'+parentId+'" class="1" code="ASS1.00.000" name="'+esc(name)+'" position="" quantity="1" unit="0" dtl="'+f(dimensions.length||0,3)+'" dtw="'+f(dimensions.width||0,3)+'" dtt="'+f(dimensions.height||0,3)+'" cost="0" costFlag="false"></Obj>';
  const partRows=parts.map(p=>partXml(p,parentId,partIdMap.get(String(p.id)),connectionIdMap)).join('');
  return '<?xml version="1.0" encoding="UTF-8" ?>\n<Project3dc name="'+esc(name)+'" date="'+new Date().toISOString().slice(0,10).replace(/-/g,'.')+'" version="3.0">'+
    dictionaries(parts)+'<ProjectStructure>'+fasteners+partRows+assembly+'</ProjectStructure></Project3dc>';
}

function download(name,type,text){
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},300);
}
function engineeringFromGrande(){
 const b=window.BizetGrandeR1050Bridge;if(!b)return null;
 const parts=(b.getDetails?.()||[]).map((p,i)=>normalizePart({...p,id:p.partId||p.code||'GR:'+i},i,SOURCE.IMPORT));
 const connections=connectionsFromGrandeBridge(b,parts);
 return{source:SOURCE.IMPORT,source_status:'PARAMETRIC_PILOT_NO_DWG_PARSE',parts,connections,dimensions:{length:n(b.state?.w),width:n(b.state?.d),height:n(b.state?.h)},name:'Grande'};
}
function engineeringFromKitchen(){
 const rt=window.BizetModelRuntime,pb=window.BizetPointB;if(!rt?.ready||!pb?.detailsFor)return null;
 const modules=rt.getModules?.()||[],raw=pb.detailsFor(modules)||[];
 const parts=raw.map((p,i)=>normalizePart({...p,id:p.code||'K:'+i,materialId:materialIdFor(p)},i,SOURCE.GENERATED));
 const connections=generatedConnectionsFromModules(modules,parts);
 const room=rt.getRoom?.()||{};
 return{source:SOURCE.GENERATED,source_status:'RULE_GENERATED',parts,connections,modules,dimensions:{length:n(room.lengthMm),width:n(room.depthMm),height:n(room.heightMm)},name:'BIZET_Kitchen'};
}
function materialIdFor(p){
 const s=String(p.material||'').toUpperCase();
 if(s.includes('HDF'))return'202:9';if(s.includes('16.2')||s.includes('DRAWER'))return'202:90';if(s.includes('FACADE')||s.includes('MDF'))return'202:58';return'202:2';
}
function exportEngineering(model,filename,options={}){
 if(!model)return false;
 const p=profile();if(!p.active||!p.project3dc)return false;
 const report=preflight(model,{allowUnresolved:!!options.allowUnresolved});
 window.dispatchEvent(new CustomEvent('bizet:export-preflight',{detail:{profile:p.id,report,model:model.name}}));
 if(!report.ok){console.error('BIZET Project3dc preflight failed',report);return false}
 const xml=projectXml({name:model.name,parts:model.parts,connections:model.connections,source:model.source,dimensions:model.dimensions});
 download(filename||model.name+'.project','application/xml;charset=utf-8',xml);return true;
}
function quadroMinimalRepro(){
 const p1=normalizePart({id:'REPRO:A',code:'R.001',name:'Side',l:500,w:100,thick:18,materialId:'202:2'},0,SOURCE.GENERATED);
 const p2=normalizePart({id:'REPRO:B',code:'R.002',name:'Bottom',l:500,w:100,thick:18,materialId:'202:2'},1,SOURCE.GENERATED);
 const id='REPRO-CONFIRMAT-1';
 const face={id:'RH1',x:32,y:50,z:18,diameter:7,depth:18,type:'FACE',vector:{x:0,y:0,z:-1},connectionId:id,status:'RESOLVED'};
 const edge={id:'RH2',x:0,y:50,z:9,diameter:5,depth:52,type:'EDGE',vector:{x:1,y:0,z:0},connectionId:id,status:'RESOLVED'};
 p1.drillings.push(face);p2.drillings.push(edge);
 const model={name:'BIZET_Quadro_Repro',source:SOURCE.GENERATED,parts:[p1,p2],connections:[{id,source:SOURCE.GENERATED,fastener:{...FASTENER_TEMPLATES.CONFIRMAT_6_3X50},parts:[p1.id,p2.id],holes:[face,edge]}],dimensions:{length:500,width:100,height:500}};
 return model;
}
function downloadQuadroRepro(){const m=quadroMinimalRepro(),report=preflight(m);if(!report.ok)return false;download('BIZET_Quadro_Minimal_Repro_R1051.project','application/xml;charset=utf-8',projectXml({...m}));return true}
function csvDetail(model){
 if(!model)return'';
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const rows=[['Код','Деталь','Материал','Готовый L','Готовый W','Раскрой L','Раскрой W','Толщина','Кромка L','Кромка T','Кромка R','Кромка B','Отверстий']];
 model.parts.forEach(p=>rows.push([p.code,p.name,p.material,p.finished.length,p.finished.width,p.cut.length,p.cut.width,p.thick,...['L','T','R','B'].map(k=>p.edges[k]?p.edges[k].thickness:''),p.drillings.length]));
 return '\ufeff'+rows.map(r=>r.map(q).join(';')).join('\n');
}
window.BizetProductionR1050={
 version:'R10.5.1',SOURCE,PROFILES,FASTENER_TEMPLATES,EDGE_MM,profile,setProfile,normalizePart,normalizeDrilling,generatedConnectionsFromModules,projectXml,preflight,quadroMinimalRepro,downloadQuadroRepro,
 engineeringFromGrande,engineeringFromKitchen,exportEngineering,
 exportGrande(){return exportEngineering(engineeringFromGrande(),'Grande_R1051_Quadro.project')},
 exportKitchen(){return exportEngineering(engineeringFromKitchen(),'BIZET_Kitchen_R1051_Quadro.project')},
 downloadDetail(model,name='BIZET_Detailing_R1051.csv'){download(name,'text/csv;charset=utf-8',csvDetail(model))},
 buildCutSize(length,width,edges={L:EDGE_MM,T:EDGE_MM,R:EDGE_MM,B:EDGE_MM}){return{length:n(length)-n(edges.L)-n(edges.R),width:n(width)-n(edges.T)-n(edges.B)}}
};
})();