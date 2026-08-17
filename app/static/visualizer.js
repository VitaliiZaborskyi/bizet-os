const NS='http://www.w3.org/2000/svg';
const svgEl=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n};
const addText=(svg,x,y,text,cls='viz-text',anchor='start')=>{const t=svgEl('text',{x,y,class:cls,'text-anchor':anchor});t.textContent=text;svg.append(t);return t};

const ITEM_STYLE={
  FILLER:{front:'var(--sk-filler)',side:'var(--sk-filler-side)',top:'var(--sk-filler-top)'},
  TALL:{front:'var(--sk-tall)',side:'var(--sk-tall-side)',top:'var(--sk-tall-top)'},
  APPLIANCE:{front:'var(--sk-appliance)',side:'var(--sk-appliance-side)',top:'var(--sk-appliance-top)'},
  HINGED:{front:'var(--sk-module)',side:'var(--sk-module-side)',top:'var(--sk-module-top)'},
  DRAWERS:{front:'var(--sk-drawer)',side:'var(--sk-drawer-side)',top:'var(--sk-drawer-top)'},
  FUNCTIONAL:{front:'var(--sk-functional)',side:'var(--sk-functional-side)',top:'var(--sk-functional-top)'}
};

function clear(svg){while(svg.firstChild)svg.removeChild(svg.firstChild)}
function poly(svg,pts,attrs={}){const p=svgEl('polygon',{points:pts.map(p=>p.join(',')).join(' '),...attrs});svg.append(p);return p}
function line(svg,x1,y1,x2,y2,attrs={}){const l=svgEl('line',{x1,y1,x2,y2,...attrs});svg.append(l);return l}

function depthFor(project,item){
  if(item.kind==='FILLER') return 80;
  if(item.kind==='TALL') return 600; // visualization envelope only; not a furniture rule
  return project?.opening_system==='GOLA'?580:560;
}
function heightFor(item){
  // Visualization-only display envelopes. Real lower vertical system is deliberately open in OQ-03/OQ-04.
  if(item.kind==='TALL') return 2200;
  return 850;
}

function drawDim(svg,x1,y1,x2,y2,label,offset=0){
  const yy1=y1+offset,yy2=y2+offset;
  line(svg,x1,yy1,x2,yy2,{class:'viz-dim-line'});
  line(svg,x1,yy1-5,x1,yy1+5,{class:'viz-dim-line'});line(svg,x2,yy2-5,x2,yy2+5,{class:'viz-dim-line'});
  addText(svg,(x1+x2)/2,(yy1+yy2)/2-6,label,'viz-dim-label','middle');
}

function drawFront(svg,candidate,room){
  const W=1000,H=470,left=65,right=950,base=375,top=70;
  const sx=(right-left)/room.wall_length_mm, sz=(base-top)/room.room_height_mm;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.append(svgEl('rect',{x:left,y:top,width:right-left,height:base-top,class:'viz-room-back'}));
  if(room.active_wall_sides.includes('LEFT'))line(svg,left,top,left,base,{class:'viz-wall-edge'});
  if(room.active_wall_sides.includes('RIGHT'))line(svg,right,top,right,base,{class:'viz-wall-edge'});
  room.obstacles.forEach(o=>{
    const x=left+o.x_mm*sx,w=Math.max(2,o.width_mm*sx),h=Math.max(5,Math.min(o.height_mm||200,room.room_height_mm)*sz),y=base-(o.bottom_mm||0)*sz-h;
    svg.append(svgEl('rect',{x,y,width:w,height:h,class:`viz-obstacle obstacle-${o.type.toLowerCase()}`}));
  });
  room.communications.forEach(c=>{
    const x=left+c.x_mm*sx,y=base-Math.min(c.z_mm,room.room_height_mm)*sz;
    svg.append(svgEl('circle',{cx:x,cy:y,r:5,class:c.confirmed?'viz-comm confirmed':'viz-comm'}));
    addText(svg,x+8,y+4,c.type,'viz-mini');
  });
  if(candidate){candidate.items.forEach(item=>{
    const x=left+item.x_mm*sx,w=Math.max(2,item.width_mm*sx),height=heightFor(item),h=height*sz,y=base-h;
    const style=ITEM_STYLE[item.kind]||ITEM_STYLE.HINGED;
    svg.append(svgEl('rect',{x,y,width:w,height:h,rx:2,fill:style.front,class:'viz-item-outline'}));
    if(w>40)addText(svg,x+w/2,y+h/2,item.label,'viz-item-label','middle');
    drawDim(svg,x,base+14,x+w,base+14,`${item.width_mm}`,15);
  })}
  drawDim(svg,left,top-12,right,top-12,`${room.wall_length_mm} мм`,0);
  addText(svg,left,28,`Фронт • ${room.wall_length_mm} × ${room.room_height_mm} мм • ${room.ceiling_type}`,'viz-title');
}

function drawPlan(svg,candidate,room,project){
  const W=1000,H=470,left=65,right=950,back=105,front=365;
  const sx=(right-left)/room.wall_length_mm, sy=(front-back)/Math.max(room.wall_depth_mm,650);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.append(svgEl('rect',{x:left,y:back,width:right-left,height:front-back,class:'viz-floor'}));
  line(svg,left,back,right,back,{class:'viz-wall-back'});
  if(room.active_wall_sides.includes('LEFT'))line(svg,left,back,left,front,{class:'viz-wall-edge'});
  if(room.active_wall_sides.includes('RIGHT'))line(svg,right,back,right,front,{class:'viz-wall-edge'});
  room.obstacles.forEach(o=>{const x=left+o.x_mm*sx,w=Math.max(2,o.width_mm*sx),d=Math.max(5,(o.depth_mm||80)*sy);svg.append(svgEl('rect',{x,y:back,width:w,height:d,class:`viz-obstacle obstacle-${o.type.toLowerCase()}`}))});
  if(candidate) candidate.items.forEach(item=>{
    const x=left+item.x_mm*sx,w=Math.max(2,item.width_mm*sx),d=Math.max(8,depthFor(project,item)*sy),style=ITEM_STYLE[item.kind]||ITEM_STYLE.HINGED;
    svg.append(svgEl('rect',{x,y:back,width:w,height:d,rx:2,fill:style.top,class:'viz-item-outline'}));
    if(w>38)addText(svg,x+w/2,back+d/2+4,item.label,'viz-item-label','middle');
  });
  room.communications.forEach(c=>{const x=left+c.x_mm*sx,y=back+Math.min(c.y_mm||0,room.wall_depth_mm)*sy;svg.append(svgEl('circle',{cx:x,cy:y,r:5,class:c.confirmed?'viz-comm confirmed':'viz-comm'}));});
  drawDim(svg,left,front+18,right,front+18,`${room.wall_length_mm} мм`,0);
  addText(svg,left,40,`План • глубина зоны ${room.wall_depth_mm} мм`,'viz-title');
}

function drawPerspective(svg,candidate,room,project){
  const W=1000,H=500,originX=115,originY=390;
  const sx=720/room.wall_length_mm, sz=285/room.room_height_mm, depthPx=145;
  const projectPt=(x,y,z)=>[originX+x*sx+y*(depthPx/650),originY-z*sz+y*(depthPx/650)*0.42];
  const p=(x,y,z)=>projectPt(x,y,z);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const roomDepth=Math.max(650,Math.min(room.wall_depth_mm,1200));
  poly(svg,[p(0,0,0),p(room.wall_length_mm,0,0),p(room.wall_length_mm,roomDepth,0),p(0,roomDepth,0)],{class:'viz-floor'});
  poly(svg,[p(0,0,0),p(room.wall_length_mm,0,0),p(room.wall_length_mm,0,room.room_height_mm),p(0,0,room.room_height_mm)],{class:'viz-room-back'});
  if(room.active_wall_sides.includes('LEFT'))poly(svg,[p(0,0,0),p(0,roomDepth,0),p(0,roomDepth,room.room_height_mm),p(0,0,room.room_height_mm)],{class:'viz-side-wall'});
  if(room.active_wall_sides.includes('RIGHT'))poly(svg,[p(room.wall_length_mm,0,0),p(room.wall_length_mm,roomDepth,0),p(room.wall_length_mm,roomDepth,room.room_height_mm),p(room.wall_length_mm,0,room.room_height_mm)],{class:'viz-side-wall'});

  room.obstacles.forEach(o=>{
    const x=o.x_mm,w=o.width_mm,d=Math.max(40,o.depth_mm||80),z0=o.bottom_mm||0,h=Math.min(o.height_mm||200,room.room_height_mm);
    const front=[p(x,d,z0),p(x+w,d,z0),p(x+w,d,z0+h),p(x,d,z0+h)];
    const side=[p(x+w,0,z0),p(x+w,d,z0),p(x+w,d,z0+h),p(x+w,0,z0+h)];
    const topFace=[p(x,0,z0+h),p(x+w,0,z0+h),p(x+w,d,z0+h),p(x,d,z0+h)];
    poly(svg,side,{class:`viz-obstacle obstacle-${o.type.toLowerCase()}`});poly(svg,topFace,{class:`viz-obstacle obstacle-${o.type.toLowerCase()}`});poly(svg,front,{class:`viz-obstacle obstacle-${o.type.toLowerCase()}`});
  });

  if(candidate) candidate.items.forEach(item=>{
    const x=item.x_mm,w=item.width_mm,d=depthFor(project,item),h=heightFor(item),style=ITEM_STYLE[item.kind]||ITEM_STYLE.HINGED;
    const front=[p(x,d,0),p(x+w,d,0),p(x+w,d,h),p(x,d,h)];
    const side=[p(x+w,0,0),p(x+w,d,0),p(x+w,d,h),p(x+w,0,h)];
    const topFace=[p(x,0,h),p(x+w,0,h),p(x+w,d,h),p(x,d,h)];
    poly(svg,side,{fill:style.side,class:'viz-item-outline'});poly(svg,topFace,{fill:style.top,class:'viz-item-outline'});poly(svg,front,{fill:style.front,class:'viz-item-outline'});
    const center=p(x+w/2,d+8,h*.48); if(w*sx>38)addText(svg,center[0],center[1],item.label,'viz-item-label','middle');
    const dimA=p(x,d+35,0),dimB=p(x+w,d+35,0);drawDim(svg,dimA[0],dimA[1]+10,dimB[0],dimB[1]+10,`${item.width_mm}`,10);
  });

  room.communications.forEach(c=>{const q=p(c.x_mm,8,Math.min(c.z_mm,room.room_height_mm));svg.append(svgEl('circle',{cx:q[0],cy:q[1],r:5,class:c.confirmed?'viz-comm confirmed':'viz-comm'}));addText(svg,q[0]+7,q[1]-7,c.type,'viz-mini');});
  const a=p(0,roomDepth+55,0),b=p(room.wall_length_mm,roomDepth+55,0);drawDim(svg,a[0],a[1]+12,b[0],b[1]+12,`${room.wall_length_mm} мм`,12);
  addText(svg,45,34,`Перспектива • ${room.ceiling_type}`,'viz-title');
  addText(svg,45,54,'Высоты нижних/пенальных корпусов показаны схематично до закрытия OQ-03/OQ-04','viz-note');
}

export function drawSkeleton(svg,candidate,room,project,view='PERSPECTIVE'){
  clear(svg);if(!room){addText(svg,40,60,'Ожидаю данные помещения','viz-title');return}
  if(view==='FRONT')drawFront(svg,candidate,room);else if(view==='PLAN')drawPlan(svg,candidate,room,project);else drawPerspective(svg,candidate,room,project);
}
