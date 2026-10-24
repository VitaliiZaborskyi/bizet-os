/* BIZET OS R10.6.3 owner 25–29: engineering APPROVAL views from the current model.
 * A4 landscape at 100% print. All numbers derived from current modules.
 * Strictly NOT FOR PRODUCTION, no invented construction details. */
(()=>{'use strict';
 const PXMM=1120/282,scaleSet=[10,15,20,25,30,40,50,75,100,125,150,200,250,300,400];
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const round=v=>Math.round(num(v));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const scale=(w,pxW,h,pxH)=>scaleSet.find(n=>num(w)*PXMM/n<=pxW&&num(h)*PXMM/n<=pxH)||400;
 const dim=(x1,y1,x2,y2,label,offset=0)=>{
  const horizontal=Math.abs(x2-x1)>=Math.abs(y2-y1);
  const xA=x1+(horizontal?0:offset),yA=y1+(horizontal?offset:0),xB=x2+(horizontal?0:offset),yB=y2+(horizontal?offset:0);
  const labelX=(xA+xB)/2,labelY=(yA+yB)/2-5;
  return '<g stroke="#d21c25" fill="none" stroke-width="1">'+
   '<line x1="'+xA+'" y1="'+yA+'" x2="'+xB+'" y2="'+yB+'"/>'+
   '<line x1="'+(xA-3)+'" y1="'+(yA-3)+'" x2="'+(xA+3)+'" y2="'+(yA+3)+'"/>'+
   '<line x1="'+(xB-3)+'" y1="'+(yB-3)+'" x2="'+(xB+3)+'" y2="'+(yB+3)+'"/></g>'+
   '<text x="'+labelX+'" y="'+labelY+'" fill="#c41b22" font-size="10" text-anchor="middle" font-weight="700">'+esc(label)+'</text>';
 };
 const defs='<defs><pattern id="r1063Hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#666" stroke-width="1"/></pattern></defs>';
 const premiumShade=()=>{
   const source=window.BizetModelRuntime?.getVisual?.()?.furniture_materials?.facade||{};
   const raw=String(source.color||source.hex||source.value||'');
   if(!/^#[0-9a-fA-F]{6}$/.test(raw))return '#f7f7f6';
   const val=parseInt(raw.slice(1),16),parts=[(val>>16)&255,(val>>8)&255,val&255];
   return '#'+parts.map(x=>Math.round(248*.9+x*.1).toString(16).padStart(2,'0')).join('');
 };
 const sheetStart=(name)=>'<svg viewBox="0 0 1120 790" xmlns="http://www.w3.org/2000/svg">'+defs+
  '<rect x="5" y="5" width="1110" height="780" fill="white" stroke="#111" stroke-width="1.5"/>'+
  '<text x="42" y="38" font-size="17" font-weight="800" fill="#111">BIZET OS · '+esc(name)+'</text>';
 const moduleRun=m=>m.wall==='A'?num(m.w):num(m.d);
 const isLower=m=>m.level!=='upper'&&!m.freestanding&&m.kind!=='FILLER';
 const unique=mods=>{
  const map=new Map();
  mods.filter(m=>!m.freestanding&&m.kind!=='FILLER').forEach(m=>{
   const signature=[m.kind,m.level,num(m.d),num(m.h),num(m.shelf_count),num(m.drawer_count),
    num(m.facade_count),m.opening,m.end_panel_edges?.join(',')||'',num(m.end_panel_width_mm)].join('|');
   if(!map.has(signature))map.set(signature,{module:m,members:[]});
   map.get(signature).members.push('M'+(m.number||m.id));
  });return [...map.values()];
 };
 const modulesA=modules=>modules.filter(m=>(m.wall||'A')==='A'&&!m.freestanding).sort((a,b)=>num(a.x)-num(b.x));
 const hinges=m=>Math.max(1,Math.min(2,round(m.facade_count)||1));
 function facades(m,x,y,w,h,showHidden=true){
   const count=hinges(m),isDrawer=m.kind==='DRAWERS',isLift=m.opening==='LIFT'||m.facade_orientation==='HORIZONTAL';
   let r='',segments=isDrawer?Math.max(2,round(m.drawer_count)||2):count;
   for(let i=0;i<segments;i++){
    if(isDrawer||isLift){
     const yy=y+i*h/segments,hh=h/segments;
     r+='<line x1="'+x+'" y1="'+yy+'" x2="'+(x+w)+'" y2="'+yy+'" stroke="#222"/>';
     r+='<rect x="'+(x+w*.35)+'" y="'+(yy+hh*.11)+'" width="'+(w*.3)+'" height="2.8" fill="#23282b"/>';
     continue;
    }
    const fx=x+i*w/segments,fw=w/segments;
    const side=String(m.facade_openings?.[i]|| (i===0?'LEFT':'RIGHT')).toUpperCase();
    const margin=Math.min(3,fw*.04),X=fx+margin,W=Math.max(4,fw-2*margin),Y=y+margin,H=Math.max(4,h-2*margin);
    // Owner #27: triangle APEX RIGHT is LEFT-opening; apex LEFT is RIGHT-opening.
    // The apex encodes the FREE edge; the wide vertical base is at the hinge.
    const path=side==='LEFT'?'M '+X+' '+Y+' L '+(X+W)+' '+(Y+H/2)+' L '+X+' '+(Y+H):
      'M '+(X+W)+' '+Y+' L '+X+' '+(Y+H/2)+' L '+(X+W)+' '+(Y+H);
    r+='<path d="'+path+'" fill="none" stroke="#c41b24" stroke-width="1.1" stroke-dasharray="7 4"/>';
    const handleX=side==='LEFT'?X+W-5:X+5;
    r+='<rect x="'+handleX+'" y="'+(Y+H/2-12)+'" width="3.4" height="24" fill="#24292b"/>';
    if(i)r+='<line x1="'+fx+'" y1="'+y+'" x2="'+fx+'" y2="'+(y+h)+'" stroke="#111" stroke-width="1.2"/>';
   }
   if(showHidden){
    for(let k=1;k<=Math.min(5,num(m.shelf_count));k++){const yy=y+h*k/(num(m.shelf_count)+1);
     r+='<line class="approval-hidden" x1="'+(x+4)+'" y1="'+yy+'" x2="'+(x+w-4)+'" y2="'+yy+'" stroke="#aaa" stroke-dasharray="5 3"/>';}
   }
   return r;
 }
 function top(modules,room,area){
  const lower=modules.filter(isLower),all=lower.length?lower:modulesA(modules);
  const mX=Math.min(...all.map(m=>num(m.x))),MX=Math.max(...all.map(m=>num(m.x)+num(m.w)));
  const mY=Math.min(...all.map(m=>num(m.y))),MY=Math.max(...all.map(m=>num(m.y)+num(m.d)));
  const zoneX1=Math.max(0,mX-90),zoneX2=Math.min(num(room.lengthMm)||MX+90,MX+90);
  const zoneY1=Math.max(0,mY-110),zoneY2=Math.min(num(room.depthMm)||MY+110,MY+110);
  const width=Math.max(500,zoneX2-zoneX1),depth=Math.max(450,zoneY2-zoneY1);
  const n=scale(width,area.w-45,depth,area.h-82),s=PXMM/n;
  const ox=area.x+15,oy=area.y+44;
  let svg='<text x="'+area.x+'" y="'+(area.y+13)+'" font-size="13" font-weight="800">TOP VIEW · 1:'+n+' · INSTALLATION ZONE</text>';
  svg+='<rect x="'+(ox-8)+'" y="'+(oy-17)+'" width="'+(width*s+16)+'" height="'+(depth*s+24)+'" fill="none" stroke="#b2b2b2" stroke-dasharray="4 3"/>';
  const primaryY=Math.min(num(room.depthMm)||MY,zoneY2),wallMark=oy+(zoneY2-primaryY)*s;
  svg+='<rect x="'+ox+'" y="'+(wallMark-10)+'" width="'+(width*s)+'" height="10" fill="url(#r1063Hatch)" stroke="#111"/>';
  if(modules.some(m=>m.wall==='B'||m.wall==='C')){
   svg+='<rect x="'+ox+'" y="'+oy+'" width="9" height="'+(depth*s)+'" fill="url(#r1063Hatch)" stroke="#111"/>';
  }
  const ordered=all.filter(m=>(m.wall||'A')==='A').sort((a,b)=>num(a.x)-num(b.x));
  ordered.forEach((m,i)=>{
   const x=ox+(num(m.x)-zoneX1)*s,y=oy+(zoneY2-(num(m.y)+num(m.d)))*s;
   const w=num(m.w)*s,d=num(m.d)*s;
   svg+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+d+'" fill="'+premiumShade()+'" stroke="#111" stroke-width="1.25"/>'+
    '<text x="'+(x+w/2)+'" y="'+(y+d/2+3)+'" text-anchor="middle" font-size="9">M'+esc(m.number)+'</text>';
   if(w>=20)svg+=dim(x,y+d+12,x+w,y+d+12,round(m.w));
  });
  svg+=dim(ox+(mX-zoneX1)*s,oy+depth*s+30,ox+(MX-zoneX1)*s,oy+depth*s+30,round(MX-mX));
  svg+='<text x="'+ox+'" y="'+(oy+depth*s+49)+'" font-size="9" fill="#555">WALL A · '+round(zoneX2-zoneX1)+' mm visible zone · not entire room</text>';
  return svg;
 }
 function front(modules,room,area,sections=true){
  const selected=modulesA(modules),left=Math.min(...selected.map(m=>num(m.x))),right=Math.max(...selected.map(m=>num(m.x)+num(m.w)));
  const maxTop=Math.max(...selected.map(m=>num(m.z)+num(m.h)),num(room.heightMm)||2800),minZ=0;
  const span=Math.max(600,right-left),height=Math.max(1200,maxTop-minZ);
  const n=scale(span,area.w-70,height,area.h-95),s=PXMM/n;
  const bx=area.x+30,base=area.y+area.h-55,wallPad=9;
  let svg='<text x="'+area.x+'" y="'+(area.y+14)+'" font-size="13" font-weight="800">FRONT VIEW · 1:'+n+' · WALL A</text>';
  svg+='<rect x="'+(bx-wallPad-8)+'" y="'+(base-height*s)+'" width="9" height="'+(height*s)+'" fill="url(#r1063Hatch)" stroke="#333"/>'+
    '<rect x="'+(bx+span*s+wallPad)+'" y="'+(base-height*s)+'" width="9" height="'+(height*s)+'" fill="url(#r1063Hatch)" stroke="#333"/>';
  const items=selected.map(m=>{
   const x=bx+(num(m.x)-left)*s,y=base-(num(m.z)+num(m.h))*s,w=Math.max(3,num(m.w)*s),h=Math.max(4,num(m.h)*s);
   const z=num(m.z),p=num(m.end_panel_width_mm)||18;
   let out='<g><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+premiumShade()+'" stroke="#111" stroke-width="1.65"/>';
   if(m.kind==='FILLER')out+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="url(#r1063Hatch)" stroke="#111"/>';
   else out+=facades(m,x,y,w,h);
   for(const side of (m.end_panel_edges||[])){
    const stripX=side==='START'?x:x+w-p*s,xx=m.kind==='FRIDGE'&&side==='START'?x-p*s:stripX;
    out+='<rect x="'+xx+'" y="'+y+'" width="'+(p*s)+'" height="'+h+'" fill="#e3e3e3" stroke="#111" stroke-width="1.1"/>';
   }
   if(m.level!=='upper'&&z>40){
    out+='<rect x="'+(x+4)+'" y="'+base+'" width="'+(w-8)+'" height="'+Math.max(3,z*s)+'" fill="none" stroke="#555" stroke-dasharray="4 3" class="approval-hidden"/>';
    out+='<line x1="'+(x+4)+'" y1="'+(base-4)+'" x2="'+(x+w-4)+'" y2="'+(base-4)+'" stroke="#111"/>';
   }
   out+='<text x="'+(x+w/2)+'" y="'+(y+h/2+3)+'" font-size="8" fill="#444" text-anchor="middle">M'+esc(m.number)+'</text></g>';
   return out;
  }).join('');
  svg+=items+'<line x1="'+bx+'" y1="'+base+'" x2="'+(bx+span*s)+'" y2="'+base+'" stroke="#111" stroke-width="2"/>';
  const worktop=num(window.BizetModelRuntime?.getInputs?.().worktop_thickness_mm)||38;
  const lower=selected.filter(m=>m.level!=='upper'&&!m.tall&&!['FILLER','FRIDGE'].includes(m.kind));
  if(lower.length){const x1=Math.min(...lower.map(m=>num(m.x))),x2=Math.max(...lower.map(m=>num(m.x)+num(m.w)));
    const topZ=Math.max(...lower.map(m=>num(m.z)+num(m.h)));
    svg+='<rect x="'+(bx+(x1-left)*s-4)+'" y="'+(base-topZ*s-worktop*s)+'" width="'+((x2-x1)*s+8)+'" height="'+Math.max(3,worktop*s)+'" fill="#e2e2e2" stroke="#111" stroke-width="1.4"/>';
    svg+='<text x="'+(bx+(x1-left)*s)+'" y="'+(base-topZ*s-worktop*s-7)+'" font-size="9">'+round(worktop)+' mm WORKTOP</text>';
  }
  selected.filter(m=>m.level!=='upper').forEach(m=>{
   const x=bx+(num(m.x)-left)*s,w=num(m.w)*s;if(w<17)return;
   svg+=dim(x,base+18,x+w,base+18,round(m.w));
  });
  svg+=dim(bx,base+42,bx+span*s,base+42,round(span));
  svg+=dim(bx-16,base,bx-16,base-height*s,round(height));
  if(sections)unique(selected).slice(0,7).forEach((u,i)=>{
   const m=u.module,x=bx+(num(m.x)-left+num(m.w)/2)*s;
   const label=String.fromCharCode(65+i)+'–'+String.fromCharCode(65+i);
   svg+='<line x1="'+x+'" y1="'+(base+3)+'" x2="'+x+'" y2="'+(base-height*s+1)+'" stroke="#777" stroke-dasharray="6 3"/>'+
    '<text x="'+(x+3)+'" y="'+(base-height*s-5)+'" font-size="10" fill="#222">'+label+'</text>';
  });
  const led=window.BizetLED1061?.manifest(window.BizetModelRuntime?.getInputs?.()||{},modules);
  for(const item of led?.segments||[]){
   if(item.zone!=='WORKTOP')continue;
   const m=modules.find(q=>q.id===item.module_id);if(!m||m.wall!=='A')continue;
   const xx=bx+(num(m.x)-left)*s,yy=base-(num(m.z)+10)*s;
   svg+='<line x1="'+(xx+5)+'" y1="'+yy+'" x2="'+(xx+num(m.w)*s-5)+'" y2="'+yy+'" stroke="#c7a000" stroke-width="2" stroke-dasharray="6 4"/>'+
    '<text x="'+(xx+3)+'" y="'+(yy-6)+'" font-size="9" fill="#a18300">'+esc(item.id)+' '+round(item.length_mm)+' mm</text>';
  }
  return svg;
 }
 function overview(modules,room,stamp,ref){
  const image=window.BizetApprovalCaptureR1063?.isometric?.();
  let svg=sheetStart('EXTERIOR VIEWS / FOR APPROVAL');
  svg+=top(modules,room,{x:52,y:71,w:659,h:258});
  svg+=front(modules,room,{x:52,y:354,w:659,h:326},true);
  svg+='<text x="742" y="82" font-size="13" font-weight="800">AXONOMETRIC · ORTHOGRAPHIC</text>';
  svg+=image?'<image x="738" y="106" width="345" height="474" preserveAspectRatio="xMidYMid meet" href="'+image+'"/>':
   '<text x="741" y="178" font-size="15">LIVE 3D CAPTURE UNAVAILABLE — NOT APPROVED</text>';
  svg+='<text x="739" y="603" font-size="10">Actual scene exterior: fronts, handles, worktop, plinth and end panels.</text>';
  svg+='<text x="739" y="621" font-size="10">No hidden-line overlay in axonometry · geometry not redrawn by hand.</text>';
  svg+='<text x="739" y="639" font-size="9" fill="#a11">AXO: NTS · all dimensional scales pending physical A4 verification.</text>';
  svg+=stamp(1,'EXTERIOR: TOP + FRONT + AXONOMETRIC',ref,'TOP/FRONT NUMERIC',3);
  return svg+'</svg>';
 }
 function elevation(modules,room,stamp,ref){
  let svg=sheetStart('DIMENSIONED FRONT + LEFT VIEW');
  svg+=front(modules,room,{x:65,y:77,w:960,h:490},true);
  const lead=modulesA(modules)[0],d=lead?num(lead.d):0,h=lead?num(lead.h):0;
  const maxDepth=Math.max(200,d),maxHeight=Math.max(350,h),n=scale(maxDepth,300,maxHeight,125),s=PXMM/n;
  const x=82,y=660,ww=maxDepth*s,hh=maxHeight*s;
  svg+='<text x="65" y="585" font-size="13" font-weight="800">LEFT VIEW · 1:'+n+'</text>'+
   '<rect x="'+x+'" y="'+(y-hh)+'" width="'+ww+'" height="'+hh+'" fill="none" stroke="#111" stroke-width="1.6"/>'+
   '<rect x="'+(x+ww+3)+'" y="'+(y-hh)+'" width="8" height="'+hh+'" fill="url(#r1063Hatch)" stroke="#111"/>'+
   dim(x,y+13,x+ww,y+13,round(d))+dim(x-16,y,x-16,y-hh,round(h));
  svg+=stamp(2,'FRONT CHAINS + LEFT VIEW',ref,'VARIES',3);
  return svg+'</svg>';
 }
 function sourceSections(){return window.BizetApprovalCaptureR1063?.sectionSlices?.()||[]}
 function sectionSegmentsHtml(segments,x,y,width,height,range,fill=false){
  const minD=range.minD,maxD=range.maxD,minH=range.minH,maxH=range.maxH;
  const dx=Math.max(1,maxD-minD),dy=Math.max(1,maxH-minH);
  const ratio=Math.min(width/dx,height/dy)*.9;
  const x0=x+(width-dx*ratio)/2,y0=y+(height-dy*ratio)/2;
  let svg='';
  for(const q of segments){
   const x1=x0+(num(q.depth0)-minD)*ratio,x2=x0+(num(q.depth1)-minD)*ratio,
     y1=y0+(maxH-num(q.height0))*ratio,y2=y0+(maxH-num(q.height1))*ratio;
   if(![x1,x2,y1,y2].every(Number.isFinite))continue;
   if(Math.abs(x1-x2)<.02&&Math.abs(y1-y2)<.02)continue;
   const wall=/room|wall/i.test(q.cat||'');
   const hardware=/foot|hinge|handle/i.test(q.cat||'');
   svg+='<line x1="'+x1.toFixed(2)+'" y1="'+y1.toFixed(2)+'" x2="'+x2.toFixed(2)+'" y2="'+y2.toFixed(2)+'" stroke="'+(wall?'#888':hardware?'#555':'#141414')+'" stroke-width="'+(wall?.7:hardware?.9:1.2)+'"/>';
  }
  return svg;
 }
 function getRange(segments){
  const d=segments.flatMap(q=>[num(q.depth0),num(q.depth1)]),h=segments.flatMap(q=>[num(q.height0),num(q.height1)]);
  return{minD:Math.min(...d),maxD:Math.max(...d),minH:Math.min(...h),maxH:Math.max(...h)};
 }
 function sections(modules,room,stamp,ref){
  const modelSlices=sourceSections(),groups=unique(modulesA(modules)).slice(0,6);
  let svg=sheetStart('REAL MESH SECTIONS / FOR APPROVAL');
  groups.forEach((g,i)=>{
    const m=g.module,found=modelSlices.find(q=>String(q.module_id)===String(m.id)),segments=found?.section_segments||[];
    const x=52+(i%3)*348,y=82+Math.floor(i/3)*302,letter=String.fromCharCode(65+i);
    svg+='<text x="'+x+'" y="'+(y-11)+'" font-size="12" font-weight="800">SECTION '+letter+'–'+letter+'</text>'+
      '<text x="'+(x+132)+'" y="'+(y-11)+'" font-size="10">'+esc(g.members.join(', '))+'</text>';
    if(segments.length){
      const range=getRange(segments),den=scale(Math.max(100,range.maxD-range.minD),290,Math.max(100,range.maxH-range.minH),220);
      svg+=sectionSegmentsHtml(segments,x+4,y+10,290,219,range)+
       '<text x="'+(x+4)+'" y="'+(y+246)+'" font-size="9">CUT REAL 3D MESH TRIANGLES · 1:'+den+' nominal</text>'+
       '<text x="'+(x+4)+'" y="'+(y+260)+'" font-size="9" fill="#b1242b">D '+round(range.maxD-range.minD)+' · H '+round(range.maxH-range.minH)+' mm</text>';
    }else svg+='<text x="'+(x+3)+'" y="'+(y+83)+'" font-size="12" fill="#a11">LIVE MESH SECTION UNAVAILABLE — STOP</text>';
  });
  svg+='<text x="51" y="704" font-size="9" fill="#666">Intersections of current rendered construction meshes at module centre planes. NOMINAL scales require printed calibration.</text>';
  svg+=stamp(3,'REAL MESH SECTIONS · PRODUCTION STOP',ref,'VARIES',4);
  return svg+'</svg>';
 }
 function detailSheet(modules,room,stamp,ref){
  const chosen=sourceSections().find(q=>q.has_geometry&&q.section_segments.length),segments=chosen?.section_segments||[];
  const inputs=window.BizetModelRuntime?.getInputs?.()||{},visual=window.BizetModelRuntime?.getVisual?.()||{};
  const number=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key)&&Number.isFinite(Number(obj[key]))?round(obj[key]):null;
  const rear=number(inputs,'lower_wall_gap_mm');
  const topT=number(inputs,'worktop_thickness_mm');
  const facadeT=number(visual.furniture_materials?.facade||{},'thickness_mm')??number(inputs,'facade_thickness_mm');
  const plinth=number(inputs,'plinth_height_mm');
  let svg=sheetStart('ENLARGED CONSTRUCTION NODES 38.A / 38.B / 38.C');
  const details=[
   {id:'38.A',label:'REAR TECHNOLOGICAL / VENTILATION GAP',cat:'wall',
    notes:['Rear wall clearance: '+(rear===null?'UNVERIFIED':rear+' mm'),'Wall and cabinet rear must be checked in actual scan']},
   {id:'38.B',label:'WORKTOP / FACADE JUNCTURE',cat:'worktop',
    notes:['Worktop thickness: '+(topT===null?'UNVERIFIED':topT+' mm'),
      'Facade thickness: '+(facadeT===null?'UNVERIFIED':facadeT+' mm'),
      'Actual front overhang / vertical clearance: VERIFY FROM MESH']},
   {id:'38.C',label:'ADJUSTABLE FOOT / PLINTH RECESS',cat:'foot',
    notes:['Plinth height: '+(plinth===null?'UNVERIFIED':plinth+' mm'),
      'Foot position / plinth recess: VERIFY FROM MESH']}];
  details.forEach((item,i)=>{
   const x=58+i*349,y=99,ringX=x+134,ringY=y+177,r=114;
   svg+='<text x="'+x+'" y="'+(y-28)+'" font-size="12" font-weight="800">'+item.id+' · '+esc(item.label)+'</text>';
   svg+='<circle cx="'+ringX+'" cy="'+ringY+'" r="'+r+'" fill="#fff" stroke="#111" stroke-width="1.5"/>';
   const feature=segments.filter(q=>new RegExp(item.cat,'i').test(q.cat||''));
   const showing=feature.length?feature:segments;
   if(showing.length){
     const range=getRange(showing),dx=range.maxD-range.minD,dy=range.maxH-range.minH;
     const padding=Math.max(dx,dy,65)*.18;const focus={minD:range.minD-padding,maxD:range.maxD+padding,minH:range.minH-padding,maxH:range.maxH+padding};
     const id='detail-clip-'+i;
     svg+='<defs><clipPath id="'+id+'"><circle cx="'+ringX+'" cy="'+ringY+'" r="'+(r-3)+'"/></clipPath></defs>'+
       '<g clip-path="url(#'+id+')">'+sectionSegmentsHtml(showing,ringX-r,ringY-r,r*2,r*2,focus)+'</g>';
   }else svg+='<text x="'+(ringX-99)+'" y="'+ringY+'" font-size="10" fill="#a11">SECTION MESH UNAVAILABLE</text>';
   const nx=x+7,ny=425;
   svg+='<path d="M '+(ringX+65)+' '+(ringY+92)+' L '+(x+260)+' '+(ny-12)+'" stroke="#b21e27" stroke-width="1.1" fill="none"/>';
   item.notes.forEach((note,j)=>svg+='<text x="'+nx+'" y="'+(ny+j*22)+'" font-size="10">'+esc(note)+'</text>');
  });
  svg+='<text x="52" y="665" font-size="10" fill="#a11">PARAMETERS NOT PRESENT IN LIVE MODEL ARE UNVERIFIED — NO BORROWED DIMENSIONS FROM QUINTESSENTIAL.</text>';
  svg+=stamp(4,'ENLARGED NODES · FOR APPROVAL REVIEW',ref,'NTS DETAILS',4);
  return svg+'</svg>';
 }

 // R10.6.5 #38/#39/#47/#48. All drawings built from ONE frozen current snapshot.
 let activeSnapshot=null,activeSections=null;
 const freeze=(modules,room)=>window.BizetApprovalCaptureR1065?.snapshot?.(modules,room)||{
  modules:JSON.parse(JSON.stringify(modules)),room:JSON.parse(JSON.stringify(room)),
  inputs:{},visual:{},stateHash:'UNVERIFIED',units:'mm'};
 const palettePreset={
  WHITE:'#ecebe8',IVORY:'#eae3d4',GRAPHITE:'#44474a',OAK:'#be986c',SAGE:'#a6ad98',
  BLACK:'#27292b',STONE:'#8b857e',LIGHT_STONE:'#c7c1b7',GREY:'#a9a9a6'
 };
 function rawFinish(role){
  const v=activeSnapshot?.visual||{};
  const f=v.furniture_materials?.[role]||{},key=String(f.preset||f.code||f.material||'').toUpperCase();
  const literal=String(f.color||f.hex||f.value||'');
  const cssColor=typeof document!=='undefined'?document.documentElement.dataset[
    role==='facade'?'facadePreset':role==='carcass'?'carcassPreset':'worktopPreset']:null;
  const picked=literal.match(/^#[0-9a-f]{6}$/i)?literal:palettePreset[key]||palettePreset[String(cssColor||'').toUpperCase()];
  return picked||null;
 }
 function tinted(role){
  const hex=rawFinish(role)||'#efeeeb',n=parseInt(hex.slice(1),16);
  return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(v=>Math.round(v*.86+255*.14).toString(16).padStart(2,'0')).join('');
 }
 const title=(text,x,y)=>'<text x="'+x+'" y="'+y+'" font-size="12" font-weight="800" fill="#111">'+esc(text)+'</text>';
 function frozenA(){
  return(activeSnapshot?.modules||[]).filter(m=>(m.wall||'A')==='A'&&!m.freestanding&&m.kind!=='FILLER').sort((a,b)=>num(a.x)-num(b.x));
 }
 function layout(){
  const m=frozenA(),room=activeSnapshot.room||{},low=m.filter(q=>q.level!=='upper');
  if(!m.length)return null;
  const first=Math.min(...m.map(q=>num(q.x))),last=Math.max(...m.map(q=>num(q.x)+num(q.w)));
  const longest=last-first,maxH=Math.max(900,...m.map(q=>num(q.z)+num(q.h)));
  const depth=Math.max(350,...m.map(q=>num(q.d))),minY=Math.min(...m.map(q=>num(q.y)));
  const maxY=Math.max(...m.map(q=>num(q.y)+num(q.d)));
  const n=scale(Math.max(400,longest),405,Math.max(1100,maxH),236);
  const ns=scale(Math.max(500,depth),115,Math.max(1100,maxH),236);
  const den=Math.max(n,ns);
  const s=PXMM/den;
  return{m,low,first,last,longest,maxH,depth,minY,maxY,s,den,room};
 }
 function orthoFront(L,area,colored=false,sections=true){
  const{m,first,longest,maxH,s,den}=L,base=area.y+area.h-48,x0=area.x+33;
  let svg=title(colored?'FRONT MATERIAL ELEVATION · '+('1:'+den):'FRONT VIEW · 1:'+den,area.x,area.y+13);
  const room=activeSnapshot.room||{};
  const x=x0-7;
  svg+='<rect x="'+x+'" y="'+(base-maxH*s)+'" width="7" height="'+maxH*s+'" fill="url(#r1063Hatch)" stroke="#222"/>';
  svg+='<rect x="'+(x0+longest*s+7)+'" y="'+(base-maxH*s)+'" width="7" height="'+maxH*s+'" fill="url(#r1063Hatch)" stroke="#222"/>';
  for(const q of m){
   const x=x0+(num(q.x)-first)*s,y=base-(num(q.z)+num(q.h))*s,w=Math.max(3,num(q.w)*s),h=Math.max(3,num(q.h)*s);
   const name='M'+esc(q.number||q.id);
   svg+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+(colored?tinted('facade'):'#fbfbfa')+'" stroke="#111" stroke-width="1.25"/>';
   svg+=facades(q,x,y,w,h,true);
   if((q.end_panel_edges||[]).length)for(const edge of q.end_panel_edges){
    const t=Math.min(w,(num(q.end_panel_width_mm)||18)*s);
    svg+='<rect x="'+(edge==='START'?x:x+w-t)+'" y="'+y+'" width="'+t+'" height="'+h+'" fill="'+(colored?tinted('carcass'):'#eee')+'" stroke="#222"/>';
   }
   svg+='<text x="'+(x+w/2)+'" y="'+(y+h-5)+'" text-anchor="middle" font-size="8">'+name+'</text>';
   if(!colored&&q.level!=='upper')svg+=dim(x,base+16,x+w,base+16,round(q.w));
  }
  const lower=m.filter(q=>q.level!=='upper'&&!q.tall&&q.kind!=='FRIDGE');
  if(lower.length){
   const a=Math.min(...lower.map(q=>num(q.x))),b=Math.max(...lower.map(q=>num(q.x)+num(q.w)));
   const z=Math.max(...lower.map(q=>num(q.z)+num(q.h)));
   const t=num(activeSnapshot.inputs.worktop_thickness_mm);
   if(t>0){
    svg+='<rect x="'+(x0+(a-first)*s)+'" y="'+(base-(z+t)*s)+'" width="'+((b-a)*s)+'" height="'+Math.max(2,t*s)+'" fill="'+(colored?tinted('worktop'):'#dadada')+'" stroke="#111" stroke-width="1.2"/>';
   }else svg+=title('WORKTOP THICKNESS UNVERIFIED',x0,base-(z+20)*s);
  }
  svg+='<line x1="'+x0+'" y1="'+base+'" x2="'+(x0+longest*s)+'" y2="'+base+'" stroke="#111" stroke-width="1.5"/>';
  if(!colored){
   svg+=dim(x0,base+33,x0+longest*s,base+33,round(longest));
   svg+=dim(x0-16,base,x0-16,base-maxH*s,round(maxH));
   if(sections){
    const groups=uniqueR1065(activeSnapshot.modules),labels=groups.slice(0,26);
    for(let i=0;i<labels.length;i++){
     const q=labels[i].module;if((q.wall||'A')!=='A')continue;
     const mark=x0+(num(q.x)-first+num(q.w)/2)*s;
     if(mark<x0||mark>x0+longest*s)continue;
     const letter=String.fromCharCode(65+i);
     svg+='<line x1="'+mark+'" y1="'+(base+2)+'" x2="'+mark+'" y2="'+(base-maxH*s)+'" stroke="#777" stroke-dasharray="6 4"/>'+
      title(letter+'–'+letter,mark+3,base-maxH*s-4);
    }
   }
  }
  return svg;
 }
 function orthoTop(L,area,colored=false){
  const{low,m,first,longest,minY,maxY,s,den}=L;
  const tops=low.length?low:m,x0=area.x+33,y0=area.y+44;
  let svg=title(colored?'PLAN / SECTION LOCATIONS · 1:'+den:'TOP VIEW · 1:'+den+' · INSTALLATION ZONE',area.x,area.y+14);
  for(const q of tops){
   const x=x0+(num(q.x)-first)*s,y=y0+(maxY-num(q.y)-num(q.d))*s,w=num(q.w)*s,h=num(q.d)*s;
   svg+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+(colored?tinted('carcass'):'#f6f6f5')+'" stroke="#111" stroke-width="1.2"/>'+
      '<text x="'+(x+w/2)+'" y="'+(y+h/2+3)+'" text-anchor="middle" font-size="8">M'+esc(q.number||q.id)+'</text>';
   if(!colored)svg+=dim(x,y+h+14,x+w,y+h+14,round(q.w));
  }
  const wallY=y0-7;
  svg+='<line x1="'+x0+'" y1="'+wallY+'" x2="'+(x0+longest*s)+'" y2="'+wallY+'" stroke="#111" stroke-width="2"/>';
  if(!colored)svg+=dim(x0,y0+(maxY-minY)*s+40,x0+longest*s,y0+(maxY-minY)*s+40,round(longest));
  return svg;
 }
 function orthoLeft(L,area,colored=false){
  const{m,depth,maxH,s,den}=L,base=area.y+area.h-48,x=area.x+21,y=base-maxH*s;
  let svg=title((colored?'END MATERIAL ELEVATION':'LEFT VIEW')+' · 1:'+den,area.x,area.y+13);
  // Side elevation is union of every actual Wall A module's [depth, z] outline,
  // not the legacy rectangle for the first module only.
  for(const q of m){
   const d=num(q.d),y=base-(num(q.z)+num(q.h))*s;
   const h=num(q.h)*s,dx=num(q.y)-L.minY;
   svg+='<rect x="'+(x+dx*s)+'" y="'+y+'" width="'+Math.max(2,d*s)+'" height="'+Math.max(2,h)+'" fill="'+(colored?tinted('carcass'):'#f9f9f8')+'" stroke="#222" stroke-width="1"/>';
  }
  svg+='<line x1="'+x+'" y1="'+base+'" x2="'+(x+Math.max(depth,L.maxY-L.minY)*s)+'" y2="'+base+'" stroke="#222" stroke-width="1.4"/>';
  if(!colored)svg+=dim(x,base+21,x+depth*s,base+21,round(depth));
  return svg;
 }
 function uniqueR1065(mods){
  const results=new Map();
  for(const m of(mods||[]).filter(q=>!q.freestanding&&q.kind!=='FILLER')){
   const sig=JSON.stringify([m.wall,m.kind,m.level,num(m.w),num(m.d),num(m.h),num(m.z),
    num(m.shelf_count),m.shelf_positions_mm||[],num(m.drawer_count),m.facade_openings||[],
    m.end_panel_edges||[],num(m.end_panel_width_mm),m.support_positions_mm||[],m.cutouts||[]]);
   if(!results.has(sig))results.set(sig,{module:m,members:[]});
   results.get(sig).members.push('M'+(m.number||m.id));
  }
  return [...results.values()];
 }
 function drawingStart(text,hash){
  return sheetStart(text)+
   '<text x="760" y="38" font-size="9" fill="#666">SNAPSHOT '+esc(hash)+'</text>'+
   '<text x="760" y="52" font-size="8" fill="#777">FOR APPROVAL · NOT FOR PRODUCTION</text>';
 }
 function overviewR1065(mods,room,stamp,ref,total=4){
  const L=layout();
  if(!L)return drawingStart('EXTERIOR / NO WALL A GEOMETRY',activeSnapshot.stateHash)+stamp(1,'NO WALL A',ref,'NTS',total)+'</svg>';
  const image=window.BizetApprovalCaptureR1065?.isometric?.();
  let svg=drawingStart('ENGINEERING PROJECTIONS + AXONOMETRY',activeSnapshot.stateHash);
  svg+=orthoTop(L,{x:43,y:76,w:639,h:219});
  svg+=orthoFront(L,{x:43,y:342,w:475,h:315},false,true);
  svg+=orthoLeft(L,{x:539,y:342,w:143,h:315});
  svg+=title('ORTHOGRAPHIC AXONOMETRY · FRONT',711,83);
  svg+=image?'<image x="711" y="102" width="384" height="516" preserveAspectRatio="xMidYMid meet" href="'+image+'"/>':
     title('LIVE 3D CAPTURE UNAVAILABLE — STOP',714,198);
  svg+='<line x1="711" y1="630" x2="1095" y2="630" stroke="#aaa"/>'+
    '<text x="711" y="645" font-size="9">Shared TOP/FRONT/LEFT scale: 1:'+L.den+'</text>'+
    '<text x="711" y="660" font-size="9">Axonometric: orthographic / NTS</text>';
  svg+=stamp(1,'TOP + FRONT + LEFT + AXON',ref,'1:'+L.den,total);
  return svg+'</svg>';
 }
 function elevationsR1065(mods,room,stamp,ref,total=4){
  const L=layout();let svg=drawingStart('COLOURED MATERIAL ELEVATIONS',activeSnapshot.stateHash);
  if(!L)return svg+title('MATERIAL VIEWS UNAVAILABLE',50,170)+stamp(2,'MATERIALS STOP',ref,'NTS',total)+'</svg>';
  svg+=orthoFront(L,{x:52,y:95,w:700,h:490},true,false);
  svg+=orthoLeft(L,{x:773,y:95,w:300,h:490},true);
  svg+=orthoTop(L,{x:52,y:586,w:700,h:90},true);
  svg+=title('COLOURED TECHNICAL MATERIALS / FINISH SCHEDULE',770,588);
  const rows=[['FACADE',rawFinish('facade')],['CARCASS',rawFinish('carcass')],['WORKTOP',rawFinish('worktop')]];
  rows.forEach(([name,col],i)=>{
   const y=605+i*23;
   svg+='<rect x="770" y="'+y+'" width="22" height="15" stroke="#222" fill="'+(col?tinted(name.toLowerCase()):'#fff')+'"/>'+
     '<text x="803" y="'+(y+12)+'" font-size="10">'+name+' · '+esc(col||'UNVERIFIED')+'</text>';
  });
  svg+=stamp(2,'COLOURED TECHNICAL MATERIALS',ref,'1:'+L.den,total);
  return svg+'</svg>';
 }
 function ranges(segments){
  const arr=segments.flatMap(q=>[num(q.depth0),num(q.depth1)]),hs=segments.flatMap(q=>[num(q.height0),num(q.height1)]);
  return{minD:Math.min(...arr),maxD:Math.max(...arr),minH:Math.min(...hs),maxH:Math.max(...hs)};
 }
 function cutPaths(segments,area,den,ext=null){
  if(!segments.length)return'';
  const r=ext||ranges(segments),s=PXMM/den,centerD=(r.minD+r.maxD)/2,centerH=(r.minH+r.maxH)/2;
  let path='';
  for(const q of segments){
   const x1=area.x+area.w/2+(num(q.depth0)-centerD)*s,
    x2=area.x+area.w/2+(num(q.depth1)-centerD)*s,
    y1=area.y+area.h/2+(centerH-num(q.height0))*s,
    y2=area.y+area.h/2+(centerH-num(q.height1))*s;
   if(![x1,x2,y1,y2].every(Number.isFinite))continue;
   if(Math.max(x1,x2)<area.x||Math.min(x1,x2)>area.x+area.w||
      Math.max(y1,y2)<area.y||Math.min(y1,y2)>area.y+area.h)continue;
   const thin=/foot|handle|hinge/i.test(q.cat||'');
   path+='<line x1="'+x1.toFixed(2)+'" y1="'+y1.toFixed(2)+'" x2="'+x2.toFixed(2)+'" y2="'+y2.toFixed(2)+
     '" stroke="'+(thin?'#555':'#111')+'" stroke-width="'+(thin?.85:1.2)+'"/>';
  }
  return path;
 }
 function sectionsR1065(mods,room,stamp,ref,page=3,total=4,groupsArg=null){
  const all=activeSections||[],groups=groupsArg||uniqueR1065(activeSnapshot.modules).slice(0,6);
  let svg=drawingStart('REAL PART SECTIONS · '+page+'/'+total,activeSnapshot.stateHash);
  groups.forEach((g,i)=>{
   const m=g.module,found=all.find(s=>String(s.module_id)===String(m.id)&&s.role==='ASSEMBLY');
   const x=48+(i%3)*354,y=95+Math.floor(i/3)*292;
   const letter=String.fromCharCode(65+(page-3)*6+i);
   svg+=title('SECTION '+letter+'–'+letter+'   '+g.members.join(', '),x,y);
   if(!found?.section_segments?.length){
    svg+=title('NO CUT GEOMETRY · STOP',x+5,y+110);return;
   }
   const seg=found.section_segments,r=ranges(seg);
   const denominator=scale(Math.max(100,r.maxD-r.minD),300,Math.max(100,r.maxH-r.minH),215);
   svg+=cutPaths(seg,{x:x,y:y+20,w:310,h:215},denominator)+
     '<text x="'+x+'" y="'+(y+247)+'" font-size="10" fill="#b01c26">D '+round(r.maxD-r.minD)+
     ' mm · H '+round(r.maxH-r.minH)+' mm</text>'+
     '<text x="'+x+'" y="'+(y+263)+'" font-size="9">TRUE 3D TRIANGLE CUT · 1:'+denominator+
     (found.unverified?' · UNVERIFIED':'')+'</text>';
  });
  svg+=stamp(page,'PART SECTIONS',ref,'PER SECTION',total);
  return svg+'</svg>';
 }
 function nodeR1065(mods,room,stamp,ref,page=4,total=4){
  const m=activeSnapshot.modules.find(q=>q.wall==='A'&&q.level!=='upper'&&!q.freestanding),
   sets=(activeSections||[]).filter(q=>String(q.module_id)===String(m?.id));
  let svg=drawingStart('ENLARGED REAL CONSTRUCTION DETAILS 38.A/B/C',activeSnapshot.stateHash);
  const nodes=[
   {id:'38.A',label:'CABINET REAR / WALL',role:'ASSEMBLY',rx:0,cz:'rear',cats:/carcass|body|wall|back/i,needs:['carcass','wall']},
   {id:'38.B',label:'WORKTOP / FACADE JUNCTURE',role:'ASSEMBLY',rx:1,cz:'front',cats:/worktop|facade|front|carcass|body/i,needs:['worktop','front']},
   {id:'38.C',label:'SUPPORT / RECESSED PLINTH',role:'FOOT',rx:2,cz:'bottom',cats:/foot|plinth|carcass|body/i,needs:['foot','plinth']}
  ];
  nodes.forEach((n,i)=>{
   const X=45+i*352,CX=X+156,CY=304,R=130;
   svg+=title(n.id+' · '+n.label,X,100)+
    '<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="#fff" stroke="#111" stroke-width="1.4"/>';
   const cut=sets.find(s=>s.role===n.role);
   const matching=(cut?.section_segments||[]).filter(q=>n.cats.test(q.cat||''));
   const present=new Set(matching.map(q=>q.cat));
   const relevant=n.needs.filter(cat=>[...present].some(s=>s.toLowerCase().includes(cat)));
   const wantedDepth=n.cz==='rear'?num(m?.y)+num(m?.d):
     n.cz==='front'?num(m?.y):num(m?.y)+Math.min(80,num(m?.d));
   const wantedHeight=n.cz==='bottom'?num(m?.z)*.6:
      num(m?.z)+num(m?.h)+(n.cz==='front'?num(activeSnapshot.inputs.worktop_thickness_mm)*.5:-70);
   const bandD=n.cz==='bottom'?135:165,bandH=n.cz==='bottom'?num(m?.z)+125:225;
   const focused=matching.filter(q=>{
     const d=(num(q.depth0)+num(q.depth1))/2,h=(num(q.height0)+num(q.height1))/2;
     return Math.abs(d-wantedDepth)<bandD&&Math.abs(h-wantedHeight)<bandH;
   });
   const actual=focused.length?focused:[]; // NEVER silently substitute entire section.
   if(actual.length){
    const range=ranges(actual),den=scale(Math.max(50,range.maxD-range.minD),220,Math.max(50,range.maxH-range.minH),210);
    const clip='r1065-node-'+i;
    svg+='<defs><clipPath id="'+clip+'"><circle cx="'+CX+'" cy="'+CY+'" r="'+(R-3)+'"/></clipPath></defs>'+
      '<g clip-path="url(#'+clip+')">'+cutPaths(actual,{x:CX-R,y:CY-R,w:2*R,h:2*R},den)+'</g>'+
      '<text x="'+X+'" y="464" font-size="10">CUT: '+n.role+' · 1:'+den+'</text>';
   }else svg+=title('PART GEOMETRY NOT FOUND · STOP',CX-115,CY);
   const input=activeSnapshot.inputs||{},vis=activeSnapshot.visual||{};
   const fmt=(v)=>Number.isFinite(Number(v))&&v!==undefined&&v!==null?round(v)+' mm':'UNVERIFIED';
   const data=i===0?['Design rear allowance: '+fmt(input.lower_wall_gap_mm),'Wall source: UNVERIFIED unless surveyed']:
     i===1?['Top thickness: '+fmt(input.worktop_thickness_mm),
             'Facade thickness: '+fmt(vis.furniture_materials?.facade?.thickness_mm??input.facade_thickness_mm)]:
     ['Support X: '+fmt(m?num(m.x)+num(m.w)*.16:null),
      'Plinth nominal height: '+fmt(input.plinth_height_mm??m?.z)];
   data.forEach((line,j)=>svg+='<text x="'+X+'" y="'+(510+j*19)+'" font-size="10">'+esc(line)+'</text>');
   svg+='<text x="'+X+'" y="580" font-size="10" fill="#b31b25">'+(relevant.length<n.needs.length?
     'STOP: MISSING '+esc(n.needs.filter(c=>!relevant.includes(c)).join('/')):'REAL PART CONTOURS · REVIEW')+'</text>';
   svg+='<line x1="'+(CX+80)+'" y1="'+(CY+97)+'" x2="'+(X+272)+'" y2="495" stroke="#b31b25" stroke-width="1"/>';
  });
  svg+='<text x="48" y="670" font-size="10" fill="#b31b25">DETAILS MUST BE VERIFIED ON SAVED MEASUREMENTS · manufacturing and boring remain STOP.</text>';
  svg+=stamp(page,'CONSTRUCTION DETAILS',ref,'NTS REVIEW',total);
  return svg+'</svg>';
 }
 function buildR1065(mods,room,stamp,ref){
  activeSnapshot=freeze(mods,room);
  activeSections=window.BizetApprovalCaptureR1065?.sectionSlices?.(activeSnapshot.modules,activeSnapshot.room)||[];
  const groups=uniqueR1065(activeSnapshot.modules),groupsA=groups.filter(q=>(q.module.wall||'A')==='A');
  const extra=Math.max(1,Math.ceil(groupsA.length/6)),total=3+extra;
  const pages=[overviewR1065(mods,room,stamp,ref,total),elevationsR1065(mods,room,stamp,ref,total)];
  for(let i=0;i<extra;i++)pages.push(sectionsR1065(mods,room,stamp,ref,3+i,total,groupsA.slice(i*6,i*6+6)));
  pages.push(nodeR1065(mods,room,stamp,ref,total,total));
  return pages;
 }
 window.BizetApprovalR1065={build:buildR1065,overview:overviewR1065,elevation:elevationsR1065,
  sections:sectionsR1065,detailSheet:nodeR1065,unique:uniqueR1065,scale,dim,version:'10.6.5'};
 // Compatibility for existing caller tests; actual Point B uses the explicit R1065 build().
 window.BizetApprovalR1063=window.BizetApprovalR1065;
})();