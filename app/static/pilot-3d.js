(() => {
  const DEG=Math.PI/180;

  function setupCanvas(canvas){
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr)}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);return{ctx,width,height};
  }

  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return mul(a,1/l)};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  function cameraDefaults(configuration){
    const yawMap={WALL_CENTER:0,WALL_LEFT:12*DEG,WALL_RIGHT:-12*DEG,L_LEFT:30*DEG,L_RIGHT:-30*DEG,U_SHAPE:0,CUSTOM:16*DEG};
    return{yaw:yawMap[configuration]??0,pitch:19*DEG,distanceScale:1};
  }

  function createProjector(width,height,room,configuration,cameraOverride={}){
    const L=Math.max(1000,Number(room.lengthMm)||6000),D=Math.max(1000,Number(room.depthMm)||4200),H=Math.max(1200,Number(room.heightMm)||2800);
    const defaults=cameraDefaults(configuration);
    const yaw=Number.isFinite(cameraOverride.yaw)?cameraOverride.yaw:defaults.yaw;
    const pitch=clamp(Number.isFinite(cameraOverride.pitch)?cameraOverride.pitch:defaults.pitch,4*DEG,55*DEG);
    const distanceScale=clamp(Number(cameraOverride.distanceScale)||1,.58,1.75);
    const target=[L*.5,D*.58,H*.43];
    const baseDistance=Math.max(L,D)*1.42+H*.48;
    const distance=baseDistance*distanceScale;
    const cp=Math.cos(pitch);
    const position=add(target,[distance*cp*Math.sin(yaw),-distance*cp*Math.cos(yaw),distance*Math.sin(pitch)]);
    const forward=norm(sub(target,position));
    const right=norm(cross(forward,[0,0,1]));
    const up=norm(cross(right,forward));
    const focal=Math.min(width,height)*1.28;
    function point(world){
      const rel=sub(world,position);const x=dot(rel,right),y=dot(rel,up),z=dot(rel,forward);
      const zz=Math.max(80,z);
      return[width/2+focal*x/zz,height*.51-focal*y/zz,zz];
    }
    return{L,D,H,point,position,yaw,pitch,distanceScale};
  }

  function colors(){
    const dark=document.documentElement.dataset.theme==='dark';
    const palette=document.documentElement.dataset.furniturePalette||'light';
    const lightSet={module:'#d7cfc1',moduleSide:'#c2b9aa',moduleFront:'#f0ece4',moduleTop:'#e8e2d7',system:'#d8d2c7',anchor:'#e7c858'};
    const darkSet={module:'#383a3d',moduleSide:'#292b2e',moduleFront:'#4a4d52',moduleTop:'#55585e',system:'#34363a',anchor:'#5f6f91'};
    const otherSet={module:'#b8b19f',moduleSide:'#8d8779',moduleFront:'#d7d0bc',moduleTop:'#cbc3ad',system:'#aaa391',anchor:'#789074'};
    const furniture=palette==='dark'?darkSet:palette==='other'?otherSet:lightSet;
    return dark?{
      bg:'#1c1c1a',floor:'#2a2925',wall:'#34322e',wallSoft:'rgba(67,64,58,.32)',wallActive:'rgba(189,157,66,.30)',grid:'rgba(245,240,230,.08)',line:'rgba(245,240,230,.25)',dimension:'rgba(245,240,230,.86)',ink:'#f3f1ec',module:furniture.module,moduleSide:furniture.moduleSide,moduleFront:furniture.moduleFront,moduleTop:furniture.moduleTop,system:furniture.system,anchor:furniture.anchor,worktop:'#111',badgeBg:'#f3f1ec',badgeInk:'#171716'
    }:{
      bg:'#eeebe3',floor:'#ddd7ca',wall:'#e5e0d6',wallSoft:'rgba(208,202,191,.27)',wallActive:'rgba(242,201,76,.25)',grid:'rgba(23,23,22,.065)',line:'rgba(23,23,22,.22)',dimension:'rgba(23,23,22,.78)',ink:'#171716',module:furniture.module,moduleSide:furniture.moduleSide,moduleFront:furniture.moduleFront,moduleTop:furniture.moduleTop,system:furniture.system,anchor:furniture.anchor,worktop:'#242424',badgeBg:'#171716',badgeInk:'#f5f4f1'
    };
  }

  function validPoints(points){return points.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))}
  function polygon(ctx,points,fill,stroke,lineWidth=1.1){const pts=validPoints(points);if(pts.length<3)return;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}}
  function line(ctx,a,b,stroke,width=1,dash=[]){if(!a||!b)return;ctx.save();ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();ctx.restore()}
  function pointInPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const xi=points[i][0],yi=points[i][1],xj=points[j][0],yj=points[j][1];const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||.00001)+xi);if(hit)inside=!inside}return inside}

  function drawGrid(ctx,p,projector,c){
    const step=Math.max(500,Math.round(Math.min(projector.L,projector.D)/7/500)*500);
    for(let x=step;x<projector.L;x+=step)line(ctx,p([x,0,2]),p([x,projector.D,2]),c.grid,.8);
    for(let y=step;y<projector.D;y+=step)line(ctx,p([0,y,2]),p([projector.L,y,2]),c.grid,.8);
  }

  function dimensionLine(ctx,a,b,text,offset,c){
    if(!a||!b)return;const ax=a[0]+offset[0],ay=a[1]+offset[1],bx=b[0]+offset[0],by=b[1]+offset[1];
    line(ctx,[ax,ay],[bx,by],c.dimension,1.25);
    const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    line(ctx,[ax-nx*5,ay-ny*5],[ax+nx*5,ay+ny*5],c.dimension,1.25);line(ctx,[bx-nx*5,by-ny*5],[bx+nx*5,by+ny*5],c.dimension,1.25);
    const mx=(ax+bx)/2,my=(ay+by)/2;
    ctx.save();ctx.font='700 12px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle=c.bg;ctx.strokeText(text,mx,my-7);ctx.fillStyle=c.dimension;ctx.fillText(text,mx,my-7);ctx.restore();
  }

  function drawRoomDimensions(ctx,p,projector,c){
    dimensionLine(ctx,p([0,projector.D,0]),p([projector.L,projector.D,0]),`${Math.round(projector.L)} мм`,[0,14],c);
    dimensionLine(ctx,p([0,0,0]),p([0,projector.D,0]),`${Math.round(projector.D)} мм`,[-12,3],c);
    dimensionLine(ctx,p([projector.L,projector.D,0]),p([projector.L,projector.D,projector.H]),`${Math.round(projector.H)} мм`,[15,0],c);
  }

  function wallPolygons(p,P){return{
    A:[p([0,P.D,0]),p([P.L,P.D,0]),p([P.L,P.D,P.H]),p([0,P.D,P.H])],
    B:[p([0,0,0]),p([0,P.D,0]),p([0,P.D,P.H]),p([0,0,P.H])],
    C:[p([P.L,P.D,0]),p([P.L,0,0]),p([P.L,0,P.H]),p([P.L,P.D,P.H])]
  }}

  function drawRoomBase(ctx,projector,configuration,activeWalls,showDimensions){
    const c=colors(),p=projector.point,active=new Set(activeWalls||[]);
    ctx.fillStyle=c.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    const floor=[p([0,0,0]),p([projector.L,0,0]),p([projector.L,projector.D,0]),p([0,projector.D,0])];
    polygon(ctx,floor,c.floor,c.line,1.1);drawGrid(ctx,p,projector,c);
    const walls=wallPolygons(p,projector);
    const order=(configuration==='L_LEFT'||configuration==='WALL_LEFT')?['C','A','B']:(configuration==='L_RIGHT'||configuration==='WALL_RIGHT')?['B','A','C']:['B','C','A'];
    order.forEach(id=>polygon(ctx,walls[id],active.has(id)?c.wallActive:(id==='A'?c.wall:c.wallSoft),active.has(id)?c.dimension:c.line,active.has(id)?1.4:1));
    if(showDimensions)drawRoomDimensions(ctx,p,projector,c);
    return{floor,walls,c};
  }

  function drawRoomScene(canvas,options={}){
    const {ctx,width,height}=setupCanvas(canvas);const configuration=options.configuration||'WALL_CENTER';
    const projector=createProjector(width,height,options.room||{},configuration,options.camera||{});const activeWalls=options.activeWalls||[];
    const base=drawRoomBase(ctx,projector,configuration,activeWalls,options.showDimensions!==false);const hits=[{id:'FLOOR',points:base.floor}];
    activeWalls.forEach(id=>{if(base.walls[id])hits.push({id,points:base.walls[id]})});
    ctx.save();ctx.font='700 11px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';ctx.fillStyle=base.c.dimension;ctx.textAlign='center';
    const p=projector.point;const centers={A:p([projector.L*.5,projector.D,projector.H*.56]),B:p([0,projector.D*.5,projector.H*.52]),C:p([projector.L,projector.D*.5,projector.H*.52])};
    activeWalls.forEach(id=>ctx.fillText(id,centers[id][0],centers[id][1]));ctx.fillText('Перспективное 3D · камера зафиксирована',width/2,height-18);ctx.restore();
    return{camera:{yaw:projector.yaw,pitch:projector.pitch,distanceScale:projector.distanceScale},hitAreas:hits,hitTest(x,y){for(let i=hits.length-1;i>=0;i--)if(pointInPolygon(x,y,hits[i].points))return hits[i].id;return null}};
  }

  function boxFaces(projector,box){
    const{x,y,z,w,d,h}=box,p=projector.point;
    const a=p([x,y,z]),b=p([x+w,y,z]),c=p([x+w,y+d,z]),d0=p([x,y+d,z]),aT=p([x,y,z+h]),bT=p([x+w,y,z+h]),cT=p([x+w,y+d,z+h]),dT=p([x,y+d,z+h]);
    return{top:[aT,bT,cT,dT],frontYMin:[a,b,bT,aT],backYMax:[d0,c,cT,dT],left:[a,d0,dT,aT],right:[b,c,cT,bT]};
  }
  function moduleFrontFace(faces,module){return module.wall==='B'?faces.right:module.wall==='C'?faces.left:faces.frontYMin}
  function drawBox(ctx,projector,box,style={}){
    const c=colors(),faces=boxFaces(projector,box),body=style.body||c.module,side=style.side||c.moduleSide,front=style.front||c.moduleFront,top=style.top||c.moduleTop,stroke=style.stroke||c.line;
    polygon(ctx,faces.backYMax,body,stroke,1);polygon(ctx,faces.left,side,stroke,1);polygon(ctx,faces.right,side,stroke,1);polygon(ctx,faces.top,top,stroke,1);polygon(ctx,faces.frontYMin,front,stroke,1.1);return faces;
  }

  function faceCenter(face){const pts=validPoints(face);return[pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length]}
  function drawNumber(ctx,face,number,c){if(!number)return;const m=faceCenter(face),size=24;ctx.save();ctx.beginPath();if(ctx.roundRect)ctx.roundRect(m[0]-size/2,m[1]-size/2,size,size,7);else ctx.rect(m[0]-size/2,m[1]-size/2,size,size);ctx.fillStyle=c.badgeBg;ctx.fill();ctx.font='800 12px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c.badgeInk;ctx.fillText(String(number),m[0],m[1]+.5);ctx.restore()}

  function drawModuleDetails(ctx,projector,module,c){
    if(module.wall!=='A')return;const p=projector.point;
    const vline=ratio=>line(ctx,p([module.x+module.w*ratio,module.y-1,module.z+8]),p([module.x+module.w*ratio,module.y-1,module.z+module.h-8]),c.line,1);
    const hline=ratio=>line(ctx,p([module.x+8,module.y-1,module.z+module.h*ratio]),p([module.x+module.w-8,module.y-1,module.z+module.h*ratio]),c.line,1);
    if(module.kind==='DRAWERS'){hline(.34);hline(.67)}else if(['HINGED','SINK','DISHWASHER','OVEN'].includes(module.kind)){vline(.5)}
    if(module.kind==='FRIDGE'&&module.content&&!['FRIDGE_ONLY','FREEZER_ONLY'].includes(module.content))hline(.48);
    if(module.kind==='TALL_OVEN'){
      const rect=(z0,z1,fill)=>polygon(ctx,[p([module.x+module.w*.12,module.y-2,z0]),p([module.x+module.w*.88,module.y-2,z0]),p([module.x+module.w*.88,module.y-2,z1]),p([module.x+module.w*.12,module.y-2,z1])],fill,'rgba(0,0,0,.48)',1);
      let cursor=module.z+module.h*.34;rect(cursor,cursor+module.h*.20,'#252525');cursor+=module.h*.23;
      if(module.microwave_present==='YES'){rect(cursor,cursor+module.h*.14,module.microwave_type==='BUILT_IN'?'#303030':'#555');cursor+=module.h*.17}
      if(module.coffee_present==='YES')rect(cursor,cursor+module.h*.14,module.coffee_type==='BUILT_IN'?'#292929':'#595959');
    }
  }

  function drawWorktop(ctx,projector,group){
    const base=group.filter(m=>m.level!=='upper'&&!m.tall);if(!base.length)return;const c=colors();
    if(base[0].wall==='A'){const minX=Math.min(...base.map(m=>m.x)),maxX=Math.max(...base.map(m=>m.x+m.w)),minY=Math.min(...base.map(m=>m.y)),depth=Math.max(...base.map(m=>m.d));const z=Math.max(...base.map(m=>m.z+m.h));drawBox(ctx,projector,{x:minX,y:minY-18,z,w:maxX-minX,d:depth+36,h:26},{body:c.worktop,side:c.worktop,front:c.worktop,top:'#373737',stroke:'rgba(0,0,0,.25)'})}
    else{const minY=Math.min(...base.map(m=>m.y)),maxY=Math.max(...base.map(m=>m.y+m.d)),x=base[0].wall==='B'?Math.min(...base.map(m=>m.x))-18:Math.min(...base.map(m=>m.x))-18,w=Math.max(...base.map(m=>m.w))+36,z=Math.max(...base.map(m=>m.z+m.h));drawBox(ctx,projector,{x,y:minY,z,w,d:maxY-minY,h:26},{body:c.worktop,side:c.worktop,front:c.worktop,top:'#373737',stroke:'rgba(0,0,0,.25)'})}
  }
  function drawPlinth(ctx,projector,group){
    const base=group.filter(m=>m.level!=='upper'&&!m.tall);if(!base.length)return;const c=colors();
    if(base[0].wall==='A'){const minX=Math.min(...base.map(m=>m.x)),maxX=Math.max(...base.map(m=>m.x+m.w)),minY=Math.min(...base.map(m=>m.y));drawBox(ctx,projector,{x:minX,y:minY+45,z:0,w:maxX-minX,d:Math.max(80,base[0].d-90),h:90},{body:'#30302e',side:'#272725',front:'#2d2d2b',top:'#383836',stroke:c.line})}
    else{const minY=Math.min(...base.map(m=>m.y)),maxY=Math.max(...base.map(m=>m.y+m.d)),x=base[0].wall==='B'?45:base[0].x+45,w=Math.max(80,base[0].w-90);drawBox(ctx,projector,{x,y:minY,z:0,w,d:maxY-minY,h:90},{body:'#30302e',side:'#272725',front:'#2d2d2b',top:'#383836',stroke:c.line})}
  }
  function drawTopAppliance(ctx,projector,module){
    if(module.wall!=='A'||module.level==='upper')return;const p=projector.point,topZ=module.z+module.h+30;
    if(module.kind==='COOKTOP')polygon(ctx,[p([module.x+module.w*.12,module.y+module.d*.18,topZ]),p([module.x+module.w*.88,module.y+module.d*.18,topZ]),p([module.x+module.w*.88,module.y+module.d*.78,topZ]),p([module.x+module.w*.12,module.y+module.d*.78,topZ])],'#161616','#050505',1.1);
    if(module.kind==='SINK')polygon(ctx,[p([module.x+module.w*.18,module.y+module.d*.22,topZ]),p([module.x+module.w*.82,module.y+module.d*.22,topZ]),p([module.x+module.w*.82,module.y+module.d*.72,topZ]),p([module.x+module.w*.18,module.y+module.d*.72,topZ])],'#aeb3b4','#707577',1.1);
  }

  function drawFreestandingDishwasher(ctx,projector,module,c){
    const panel=Math.max(0,Number(module.side_panel_mm)||18),appliance=Math.max(300,Number(module.appliance_width_mm)||600);
    let applianceBox=null,leftPanel=null,rightPanel=null;
    const fullH=module.z+module.h;
    if(module.wall==='A'){
      leftPanel={x:module.x,y:module.y,z:0,w:panel,d:module.d,h:fullH};
      applianceBox={x:module.x+panel,y:module.y+10,z:0,w:appliance,d:Math.max(100,module.d-10),h:fullH};
      rightPanel={x:module.x+panel+appliance,y:module.y,z:0,w:panel,d:module.d,h:fullH};
    }else{
      leftPanel={x:module.x,y:module.y,z:0,w:module.w,d:panel,h:fullH};
      applianceBox={x:module.x+8,y:module.y+panel,z:0,w:Math.max(100,module.w-8),d:appliance,h:fullH};
      rightPanel={x:module.x,y:module.y+panel+appliance,z:0,w:module.w,d:panel,h:fullH};
    }
    drawBox(ctx,projector,leftPanel,{body:c.module,side:c.moduleSide,front:c.moduleFront,top:c.moduleTop});
    const applianceFaces=drawBox(ctx,projector,applianceBox,{body:'#60656a',side:'#4b5054',front:'#72777c',top:'#858a8e',stroke:'rgba(0,0,0,.36)'});
    drawBox(ctx,projector,rightPanel,{body:c.module,side:c.moduleSide,front:c.moduleFront,top:c.moduleTop});
    const face=moduleFrontFace(applianceFaces,module),p=projector.point;
    if(module.wall==='A'){
      const y=applianceBox.y-2,z=fullH*.78;
      line(ctx,p([applianceBox.x+applianceBox.w*.12,y,z]),p([applianceBox.x+applianceBox.w*.88,y,z]),'rgba(20,20,20,.72)',2);
    }
    return face;
  }

  function drawFreestandingHood(ctx,projector,module,c){
    const canopyH=Math.min(190,Math.max(120,module.h*.22));
    const chimneyH=Math.max(160,module.h-canopyH);
    if(module.wall==='A'){
      const canopy=drawBox(ctx,projector,{x:module.x,y:module.y,z:module.z,w:module.w,d:module.d,h:canopyH},{body:'#2c2f31',side:'#222527',front:'#383c3f',top:'#464a4d',stroke:'rgba(0,0,0,.4)'});
      const cw=Math.max(120,module.w*.32),cd=Math.max(90,module.d*.42);
      drawBox(ctx,projector,{x:module.x+(module.w-cw)/2,y:module.y+(module.d-cd)/2,z:module.z+canopyH,w:cw,d:cd,h:chimneyH},{body:'#33373a',side:'#25292b',front:'#41464a',top:'#50555a',stroke:'rgba(0,0,0,.4)'});
      return moduleFrontFace(canopy,module);
    }
    return moduleFrontFace(drawBox(ctx,projector,module,{body:'#2c2f31',side:'#222527',front:'#383c3f',top:'#464a4d',stroke:'rgba(0,0,0,.4)'}),module);
  }

  function drawArchitecturalElements(ctx,projector,elements=[]){
    const p=projector.point,c=colors();
    elements.forEach((e,i)=>{
      const wall=String(e.wall||'A'),w=Math.max(100,Number(e.width_mm)||900),h=Math.max(100,Number(e.height_mm)||1200),offset=Math.max(0,Number(e.x_mm)||0),z=Math.max(0,Number(e.z_mm)||0),depth=Math.max(0,Number(e.depth_mm)||0);
      const solid=depth>0&&['RADIATOR','COLUMN','PROJECTION','BEAM','CURTAIN_RECESS','OTHER'].includes(String(e.type||''));
      let pts=null,box=null;
      if(wall==='A'){
        pts=[p([offset,projector.D-2,z]),p([Math.min(projector.L,offset+w),projector.D-2,z]),p([Math.min(projector.L,offset+w),projector.D-2,Math.min(projector.H,z+h)]),p([offset,projector.D-2,Math.min(projector.H,z+h)])];
        if(solid)box={x:offset,y:Math.max(0,projector.D-depth),z,w:Math.min(w,projector.L-offset),d:depth,h:Math.min(h,projector.H-z)};
      }
      if(wall==='D'){
        pts=[p([offset,2,z]),p([Math.min(projector.L,offset+w),2,z]),p([Math.min(projector.L,offset+w),2,Math.min(projector.H,z+h)]),p([offset,2,Math.min(projector.H,z+h)])];
        if(solid)box={x:offset,y:0,z,w:Math.min(w,projector.L-offset),d:depth,h:Math.min(h,projector.H-z)};
      }
      if(wall==='B'){
        const y0=Math.max(0,projector.D-offset-w),y1=Math.min(projector.D,projector.D-offset);
        pts=[p([2,y1,z]),p([2,y0,z]),p([2,y0,Math.min(projector.H,z+h)]),p([2,y1,Math.min(projector.H,z+h)])];
        if(solid)box={x:0,y:y0,z,w:depth,d:y1-y0,h:Math.min(h,projector.H-z)};
      }
      if(wall==='C'){
        const y0=Math.max(0,projector.D-offset-w),y1=Math.min(projector.D,projector.D-offset);
        pts=[p([projector.L-2,y1,z]),p([projector.L-2,y0,z]),p([projector.L-2,y0,Math.min(projector.H,z+h)]),p([projector.L-2,y1,Math.min(projector.H,z+h)])];
        if(solid)box={x:Math.max(0,projector.L-depth),y:y0,z,w:depth,d:y1-y0,h:Math.min(h,projector.H-z)};
      }
      if(!pts)return;
      if(box&&box.w>0&&box.d>0)drawBox(ctx,projector,box,{body:'rgba(95,111,145,.28)',side:'rgba(75,91,125,.32)',front:'rgba(110,126,160,.34)',top:'rgba(130,143,170,.30)',stroke:'rgba(70,92,140,.78)'});
      else polygon(ctx,pts,'rgba(95,111,145,.14)','rgba(70,92,140,.72)',1.5);
      const m=faceCenter(pts);ctx.save();ctx.fillStyle=c.ink;ctx.font='700 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';ctx.textAlign='center';ctx.fillText(String(e.type||'ELEMENT'),m[0],m[1]);ctx.restore();
    });
  }

  function drawKitchenScene(canvas,options={}){
    const {ctx,width,height}=setupCanvas(canvas),configuration=options.configuration||'WALL_CENTER',room=options.room||{};
    const projector=createProjector(width,height,room,configuration,options.camera||{}),activeWalls=options.activeWalls||[],c=colors();
    drawRoomBase(ctx,projector,configuration,activeWalls,options.showDimensions!==false);drawArchitecturalElements(ctx,projector,options.architecturalElements||[]);
    const modules=Array.isArray(options.modules)?options.modules:[],hits=[];
    const lower=modules.filter(m=>m.level!=='upper'),upper=modules.filter(m=>m.level==='upper');
    activeWalls.forEach(wall=>drawPlinth(ctx,projector,lower.filter(m=>m.wall===wall)));
    const drawModule=module=>{
      let front=null;
      if(module.kind==='DISHWASHER'&&module.freestanding){
        front=drawFreestandingDishwasher(ctx,projector,module,c);
      }else if(module.kind==='UPPER_HOOD'&&module.hood_type==='FREESTANDING'){
        front=drawFreestandingHood(ctx,projector,module,c);
      }else{
        const system=module.pending||module.system,anchor=module.anchor&&!system;
        const freeFridge=module.kind==='FRIDGE'&&module.freestanding;
        const style=freeFridge?{body:'#5b6065',side:'#484d51',front:'#6c7277',top:'#7e8489',stroke:'rgba(0,0,0,.38)'}:system?{body:c.system,side:c.moduleSide,front:c.system,top:c.moduleTop}:anchor?{body:c.module,side:c.moduleSide,front:c.anchor,top:c.moduleTop}:{};
        const faces=drawBox(ctx,projector,module,style);front=moduleFrontFace(faces,module);
        drawModuleDetails(ctx,projector,module,c);
        if(freeFridge&&module.wall==='A'){
          const p=projector.point,y=module.y-2,mid=module.x+module.w*.5;
          line(ctx,p([mid,y,module.z+module.h*.06]),p([mid,y,module.z+module.h*.94]),'rgba(20,20,20,.48)',1.1);
          line(ctx,p([module.x+module.w*.82,y,module.z+module.h*.33]),p([module.x+module.w*.82,y,module.z+module.h*.67]),'rgba(15,15,15,.72)',3);
        }
      }
      drawNumber(ctx,front,module.number,c);hits.push({id:module.id,points:front});
    };
    lower.forEach(drawModule);activeWalls.forEach(wall=>drawWorktop(ctx,projector,lower.filter(m=>m.wall===wall)));lower.forEach(m=>drawTopAppliance(ctx,projector,m));upper.forEach(drawModule);
    ctx.save();ctx.font='700 11px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';ctx.textAlign='center';ctx.fillStyle=c.dimension;ctx.fillText('Проведите пальцем по сцене, чтобы вращать 3D',width/2,height-18);ctx.restore();
    return{camera:{yaw:projector.yaw,pitch:projector.pitch,distanceScale:projector.distanceScale},hitAreas:hits,hitTest(x,y){for(let i=hits.length-1;i>=0;i--)if(pointInPolygon(x,y,hits[i].points))return hits[i].id;return null}};
  }

  window.BizetPilot3D={drawRoomScene,drawKitchenScene,pointInPolygon,cameraDefaults};
})();
