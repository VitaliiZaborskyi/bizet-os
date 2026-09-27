(() => {
  const DEG=Math.PI/180;

  function setupCanvas(canvas,forceReset=false){
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
    const targetWidth=Math.max(1,Math.round(width*dpr)),targetHeight=Math.max(1,Math.round(height*dpr));
    if(forceReset){
      // R10.3.7: iOS/WebKit can keep presenting the previous 2D backing store until the next pointer paint.
      // Reallocate the surface explicitly during focus transitions so the new scene is committed without a tap.
      canvas.width=1;canvas.height=1;void canvas.offsetWidth;
      canvas.width=targetWidth;canvas.height=targetHeight;
    }else if(canvas.width!==targetWidth||canvas.height!==targetHeight){
      canvas.width=targetWidth;canvas.height=targetHeight;
    }
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);return{ctx,width,height};
  }
  function flushCanvas(ctx,force=false){
    if(!force)return;
    try{ctx.getImageData(0,0,1,1)}catch(_){}
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
    const screenXOffset=Number(cameraOverride.screenXOffset)||0;
    const screenYOffset=Number(cameraOverride.screenYOffset)||0;
    const target=[
      Number.isFinite(Number(cameraOverride.targetX))?Number(cameraOverride.targetX):L*.5,
      Number.isFinite(Number(cameraOverride.targetY))?Number(cameraOverride.targetY):D*.58,
      Number.isFinite(Number(cameraOverride.targetZ))?Number(cameraOverride.targetZ):H*.43
    ];
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
      return[width/2+screenXOffset+focal*x/zz,height*.51+screenYOffset-focal*y/zz,zz];
    }
    return{L,D,H,point,position,yaw,pitch,distanceScale,screenXOffset,screenYOffset,target};
  }

  function colors(){
    const dark=document.documentElement.dataset.theme==='dark';
    const palette=document.documentElement.dataset.furniturePalette||'light';
    const floorPreset=document.documentElement.dataset.floorPreset||'';
    const wallPreset=document.documentElement.dataset.wallPreset||'';
    const facadePreset=document.documentElement.dataset.facadePreset||'';
    const carcassPreset=document.documentElement.dataset.carcassPreset||'';
    const worktopPreset=document.documentElement.dataset.worktopPreset||'';
    const lightSet={module:'#d7cfc1',moduleSide:'#c2b9aa',moduleFront:'#f0ece4',moduleTop:'#e8e2d7',system:'#d8d2c7',anchor:'#e7c858'};
    const darkSet={module:'#383a3d',moduleSide:'#292b2e',moduleFront:'#4a4d52',moduleTop:'#55585e',system:'#34363a',anchor:'#5f6f91'};
    const otherSet={module:'#b8b19f',moduleSide:'#8d8779',moduleFront:'#d7d0bc',moduleTop:'#cbc3ad',system:'#aaa391',anchor:'#789074'};
    const furniture={...(palette==='dark'?darkSet:palette==='other'?otherSet:lightSet)};
    const facadeMap={IVORY:'#eee8dc',OAK:'#c7a77e',GRAPHITE:'#45484c',SAGE:'#aab49f',WHITE:'#f3f2ed'};
    const carcassMap={WHITE:'#e9e8e3',GREY:'#a9abad',OAK:'#bd9b73',GRAPHITE:'#505256'};
    const worktopMap={BLACK:'#242424',STONE:'#77746e',OAK:'#9d7851',LIGHT_STONE:'#c9c3b7'};
    if(facadeMap[facadePreset])furniture.moduleFront=facadeMap[facadePreset];
    if(carcassMap[carcassPreset]){
      furniture.module=carcassMap[carcassPreset];
      furniture.moduleSide=carcassMap[carcassPreset];
      furniture.moduleTop=carcassMap[carcassPreset];
    }
    const roomLight={
      floor:{OAK_NATURAL:'#cbb58f',STONE_LIGHT:'#d1cec5',TILE_SAND:'#d7c9ad',CONCRETE_WARM:'#bbb7ae'}[floorPreset]||'#ddd7ca',
      wall:{WARM_WHITE:'#e9e5db',SAND:'#d9ccb7',GREIGE:'#c9c4b9',STONE:'#bebbb4'}[wallPreset]||'#e5e0d6'
    };
    const roomDark={
      floor:{OAK_NATURAL:'#5b4c38',STONE_LIGHT:'#4b4b48',TILE_SAND:'#544b3d',CONCRETE_WARM:'#464541'}[floorPreset]||'#2a2925',
      wall:{WARM_WHITE:'#4a4842',SAND:'#4f4639',GREIGE:'#45443f',STONE:'#42413f'}[wallPreset]||'#34322e'
    };
    const worktop=worktopMap[worktopPreset]||(dark?'#111':'#242424');
    return dark?{
      bg:'#1c1c1a',floor:roomDark.floor,wall:roomDark.wall,wallSoft:'rgba(67,64,58,.32)',wallActive:'rgba(189,157,66,.30)',grid:'rgba(245,240,230,.08)',line:'rgba(245,240,230,.25)',dimension:'rgba(245,240,230,.86)',ink:'#f3f1ec',module:furniture.module,moduleSide:furniture.moduleSide,moduleFront:furniture.moduleFront,moduleTop:furniture.moduleTop,system:furniture.system,anchor:furniture.anchor,worktop,badgeBg:'#f3f1ec',badgeInk:'#171716'
    }:{
      bg:'#eeebe3',floor:roomLight.floor,wall:roomLight.wall,wallSoft:'rgba(208,202,191,.27)',wallActive:'rgba(242,201,76,.25)',grid:'rgba(23,23,22,.065)',line:'rgba(23,23,22,.22)',dimension:'rgba(23,23,22,.78)',ink:'#171716',module:furniture.module,moduleSide:furniture.moduleSide,moduleFront:furniture.moduleFront,moduleTop:furniture.moduleTop,system:furniture.system,anchor:furniture.anchor,worktop,badgeBg:'#171716',badgeInk:'#f5f4f1'
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
    const avgDepth=face=>face.reduce((sum,p)=>sum+(Number(p?.[2])||0),0)/(face.length||1);
    const drawList=[
      {face:faces.backYMax,fill:body,width:1,priority:0},
      {face:faces.left,fill:side,width:1,priority:1},
      {face:faces.right,fill:side,width:1,priority:1},
      {face:faces.top,fill:top,width:1,priority:2},
      {face:faces.frontYMin,fill:front,width:1.1,priority:3}
    ].sort((a,b)=>avgDepth(b.face)-avgDepth(a.face)||a.priority-b.priority);
    drawList.forEach(item=>polygon(ctx,item.face,item.fill,stroke,item.width));
    return faces;
  }

  function faceCenter(face){const pts=validPoints(face);return[pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length]}
  function drawNumber(ctx,face,number,c){if(!number)return;const m=faceCenter(face),size=24;ctx.save();ctx.beginPath();if(ctx.roundRect)ctx.roundRect(m[0]-size/2,m[1]-size/2,size,size,7);else ctx.rect(m[0]-size/2,m[1]-size/2,size,size);ctx.fillStyle=c.badgeBg;ctx.fill();ctx.font='800 12px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c.badgeInk;ctx.fillText(String(number),m[0],m[1]+.5);ctx.restore()}

  function drawModuleDetails(ctx,projector,module,c){
    if(module.wall!=='A')return;const p=projector.point,y=module.y-2;
    const vline=ratio=>line(ctx,p([module.x+module.w*ratio,y,module.z+8]),p([module.x+module.w*ratio,y,module.z+module.h-8]),c.line,1);
    const hline=ratio=>line(ctx,p([module.x+8,y,module.z+module.h*ratio]),p([module.x+module.w-8,y,module.z+module.h*ratio]),c.line,1);
    const handle=(x,z,orientation='HORIZONTAL',length=110)=>{
      if(orientation==='VERTICAL')line(ctx,p([x,y-2,z-length/2]),p([x,y-2,z+length/2]),'rgba(24,24,24,.82)',3);
      else line(ctx,p([x-length/2,y-2,z]),p([x+length/2,y-2,z]),'rgba(24,24,24,.82)',3);
    };
    if(module.kind==='DRAWERS'){
      const count=Math.max(2,Math.min(5,Number(module.drawer_count)||2)),layout=module.drawer_layout||'EQUAL';
      let weights=Array(count).fill(1/count);
      if(count===3&&layout==='SMALL_TOP')weights=[.2,.4,.4];
      else if(count===3&&layout==='TWO_SMALL_TOP')weights=[.25,.25,.5];
      else if(count===4&&layout==='LARGE_BOTTOM')weights=[.2,.2,.2,.4];
      let acc=0;for(let i=0;i<count-1;i++){acc+=weights[i];hline(acc)}
      const offset=Math.max(40,Number(module.handle_offset_mm)||50);
      acc=0;for(let i=0;i<count;i++){
        const bottom=acc,top=acc+weights[i],faceH=module.h*weights[i],edgeInset=Math.min(Math.max(40,offset),Math.max(40,faceH-40));
        const hz=module.z+module.h*top-edgeInset;
        handle(module.x+module.w*.5,hz,'HORIZONTAL',Math.min(150,Math.max(40,module.w-80)));acc=top
      }
    }
    else if(['HINGED','SINK','UPPER','UPPER_TOP','UPPER_DRYER'].includes(module.kind)&&!module.tall){
      const count=Math.max(1,Number(module.facade_count)||1),horizontal=module.level==='upper'&&module.facade_orientation==='HORIZONTAL';
      if(horizontal){for(let i=1;i<count;i++)hline(i/count)}
      else{for(let i=1;i<count;i++)vline(i/count)}
      const orient=module.handle_orientation||'HORIZONTAL',offset=Math.max(40,Number(module.handle_offset_mm)||50),opens=Array.isArray(module.facade_openings)?module.facade_openings:[];
      for(let i=0;i<count;i++){
        if(horizontal){
          const low=module.z+module.h*i/count,high=module.z+module.h*(i+1)/count;
          handle(module.x+module.w*.5,low+Math.max(40,Math.min(offset,(high-low)*.35)),'HORIZONTAL',Math.min(180,Math.max(40,module.w-80)));
          continue;
        }
        const left=module.x+module.w*i/count,right=module.x+module.w*(i+1)/count,cx=(left+right)/2,opening=opens[i]||((module.opening||'').includes('RIGHT')?'RIGHT':'LEFT');
        if(orient==='VERTICAL'){
          const onRight=opening==='LEFT',x=onRight?right-offset:left+offset;
          const len=Math.min(150,module.h*.22),half=len/2;
          const target=module.level==='upper'?module.z+Math.min(140,module.h*.26):module.z+module.h*.72;
          const hz=Math.max(module.z+40+half,Math.min(module.z+module.h-40-half,target));
          handle(x,hz,'VERTICAL',len);
        }else{
          const len=Math.min(110,(right-left)*.42),edgeGap=40+len/2;
          const x=opening==='LEFT'?right-edgeGap:left+edgeGap;
          const hz=module.level==='upper'?module.z+40:module.z+module.h-40;
          handle(x,hz,'HORIZONTAL',len);
        }
      }
    }
    if(module.tall&&!['TALL_OVEN','FRIDGE'].includes(module.kind)){
      const mode=module.tall_drawer_mode||'NONE',drawerCount=Math.max(1,Math.min(3,Number(module.tall_drawer_count)||2));
      const stack=mode==='VISIBLE'?Math.min(module.h,Math.max(0,Number(module.visible_drawer_stack_height_mm)||0)):0;
      if(stack>0){
        for(let i=1;i<=drawerCount;i++){
          const ratio=(stack*i/drawerCount)/module.h;
          if(i<drawerCount)hline(ratio);
          const low=module.z+stack*(i-1)/drawerCount,high=module.z+stack*i/drawerCount;
          handle(module.x+module.w*.5,high-Math.max(40,Math.min(50,(high-low)*.3)),'HORIZONTAL',Math.min(150,Math.max(40,module.w-80)));
        }
        if(stack<module.h)hline(stack/module.h);
      }
      const facadeCount=Math.max(1,Math.min(3,Number(module.tall_facade_count||module.facade_count)||1)),remaining=Math.max(100,module.h-stack),opens=Array.isArray(module.facade_openings)?module.facade_openings:[];
      for(let i=1;i<facadeCount;i++)hline((stack+remaining*i/facadeCount)/module.h);
      for(let i=0;i<facadeCount;i++){
        const low=module.z+stack+remaining*i/facadeCount,high=module.z+stack+remaining*(i+1)/facadeCount,opening=opens[i]||(['LEFT','RIGHT'][i%2]);
        const x=opening==='LEFT'?module.x+module.w-40:module.x+40;
        const len=Math.min(160,Math.max(40,(high-low)-80));
        handle(x,(low+high)/2,'VERTICAL',len);
      }
    }
    if(module.kind==='FRIDGE'&&Number(module.lower_facade_height_mm)>0)hline(Math.max(.05,Math.min(.95,Number(module.lower_facade_height_mm)/Math.max(1,module.h))));
    else if(module.kind==='FRIDGE'&&module.content==='FRIDGE_FREEZER')hline(.34);
    const ovenFace=(z0,z1)=>{
      polygon(ctx,[p([module.x+module.w*.11,module.y-3,z0]),p([module.x+module.w*.89,module.y-3,z0]),p([module.x+module.w*.89,module.y-3,z1]),p([module.x+module.w*.11,module.y-3,z1])],'#202327','#08090a',1.2);
      line(ctx,p([module.x+module.w*.20,module.y-4,z1-22]),p([module.x+module.w*.80,module.y-4,z1-22]),'#b9bdc0',2.4);
      const mid=(z0+z1)/2;line(ctx,p([module.x+module.w*.25,module.y-4,mid]),p([module.x+module.w*.75,module.y-4,mid]),'rgba(150,165,176,.65)',1);
    };
    if(module.kind==='COOKTOP'&&module.oven_appliance_present)ovenFace(module.z+module.h*.12,module.z+module.h*.76);
    if(module.kind==='TALL_OVEN'){
      hline(.16);
      handle(module.x+module.w*.5,module.z+module.h*.16-42,'HORIZONTAL',Math.min(150,module.w*.36));
      let cursor=module.z+module.h*.34;ovenFace(cursor,cursor+module.h*.20);cursor+=module.h*.23;
      if(module.microwave_present==='YES'){ovenFace(cursor,cursor+module.h*.14);cursor+=module.h*.17}
      if(module.coffee_present==='YES')ovenFace(cursor,cursor+module.h*.14);
      handle(module.x+module.w*.5,module.z+module.h-55,'HORIZONTAL',Math.min(150,module.w*.36));
    }
  }

  function drawFocusDot(ctx,projector,world,fill='rgba(45,48,50,.86)',r=2.5){
    const p=projector.point(world);ctx.save();ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.restore();
  }

  function drawScilmLegProxy(ctx,projector,x,y,z,height){
    const size=22,stem=8,footH=6,style={body:'#333638',side:'#26292b',front:'#414548',top:'#5a5e61',stroke:'rgba(0,0,0,.42)'};
    drawBox(ctx,projector,{x:x-size/2,y:y-size/2,z,w:size,d:size,h:footH},style);
    drawBox(ctx,projector,{x:x-stem/2,y:y-stem/2,z:z+footH,w:stem,d:stem,h:Math.max(18,height-footH-4)},style);
  }

  function drawBlumHingeProxy(ctx,projector,module,centerZ,facadeIndex=0,facadeCount=1,opening='LEFT'){
    const p=projector.point,count=Math.max(1,facadeCount),fw=module.w/count,left=module.x+fw*facadeIndex,right=left+fw,y=module.y-12;
    const cupX=opening==='RIGHT'?right-35:left+35,cup=p([cupX,y,centerZ]),edge=p([cupX+17.5,y,centerZ]);
    const radius=Math.max(1.6,Math.min(9,Math.hypot(edge[0]-cup[0],edge[1]-cup[1])));
    // Ø35 is projected from model space so the cup scales together with the cabinet.
    ctx.save();ctx.beginPath();ctx.arc(cup[0],cup[1],radius,0,Math.PI*2);
    ctx.fillStyle='rgba(162,166,168,.92)';ctx.fill();ctx.lineWidth=Math.max(.7,Math.min(1.4,radius*.18));ctx.strokeStyle='#4f5457';ctx.stroke();
    ctx.beginPath();ctx.arc(cup[0],cup[1],Math.max(.7,radius*.42),0,Math.PI*2);ctx.strokeStyle='rgba(70,74,76,.72)';ctx.lineWidth=Math.max(.6,radius*.12);ctx.stroke();ctx.restore();
  }

  function drawFocusedModuleDimensions(ctx,projector,module,c){
    const p=projector.point,x=module.x,y=module.y,z=module.z,w=module.w,d=module.d,h=module.h;
    dimensionLine(ctx,p([x,y-55,z]),p([x+w,y-55,z]),`W ${Math.round(w)} мм`,[0,15],c);
    dimensionLine(ctx,p([x-55,y,z]),p([x-55,y,z+h]),`H ${Math.round(h)} мм`,[-18,0],c);
    dimensionLine(ctx,p([x+w+40,y,z]),p([x+w+40,y+d,z]),`D ${Math.round(d)} мм`,[16,4],c);
  }

  function drawTechnicalFocus(ctx,projector,module,c){
    const t=18,x=module.x,y=module.y,z=module.z,w=Math.max(120,module.w),d=Math.max(120,module.d),h=Math.max(180,module.h);
    const edge='rgba(55,58,60,.72)',body='rgba(207,211,211,.22)',side='rgba(160,166,168,.28)',top='rgba(229,231,228,.20)';
    const panel=(b,front=body)=>drawBox(ctx,projector,b,{body,side,front,top,stroke:edge});

    // Technical carcass: explicit 18 mm panels.
    panel({x,y,z,w:t,d,h});
    panel({x:x+w-t,y,z,w:t,d,h});
    panel({x:x+t,y,z,w:Math.max(20,w-2*t),d,h:t});
    panel({x:x+t,y,z:z+h-t,w:Math.max(20,w-2*t),d,h:t});
    panel({x:x+t,y:y+d-t,z:z+t,w:Math.max(20,w-2*t),d:t,h:Math.max(20,h-2*t)},'rgba(175,181,181,.17)');

    // Ghosted facade remains visually separate from carcass.
    const facadeFaces=drawBox(ctx,projector,{x:x+3,y:y-10,z:z+3,w:w-6,d:8,h:h-6},{
      body:'rgba(245,245,242,.06)',side:'rgba(245,245,242,.07)',front:'rgba(245,245,242,.10)',top:'rgba(245,245,242,.06)',stroke:'rgba(55,58,60,.38)'
    });
    const front=moduleFrontFace(facadeFaces,module);

    // Structural rails/ribs — R10.4.0: ordinary lower carcasses always have two, front and rear.
    // Sink and lower-oven modules keep their own construction rules; ordinary upper modules have none.
    if(module.level!=='upper'){
      if(!module.tall){
        const railT=t,ordinaryOven=module.kind==='COOKTOP'&&module.oven_appliance_present;
        if(module.kind==='SINK'){
          const railH=100,innerW=Math.max(20,w-2*t);
          panel({x:x+t,y:y,z:z+h-railH,w:innerW,d:railT,h:railH},'rgba(175,180,180,.30)');
          panel({x:x+t,y:y+d-railT,z:z+h-150-railH,w:innerW,d:railT,h:railH},'rgba(175,180,180,.30)');
        }else if(!ordinaryOven){
          panel({x:x+t,y:y+26,z:z+h-railT*2,w:Math.max(20,w-2*t),d:45,h:railT},'rgba(175,180,180,.24)');
          panel({x:x+t,y:y+d-70,z:z+h-railT*2,w:Math.max(20,w-2*t),d:45,h:railT},'rgba(175,180,180,.24)');
        }
      }
    }
    if(module.kind==='COOKTOP'&&module.oven_appliance_present){
      const frozenShelf=Number(module.oven_support_shelf_offset_from_top_mm)===600;
      const shelfTop=frozenShelf?z+h-600:z+70;
      if(frozenShelf)panel({x:x+t,y:y+22,z:shelfTop-t,w:Math.max(20,w-2*t),d:Math.max(30,d-44),h:t},'rgba(205,208,205,.32)');
      const oh=Math.max(300,Math.min(560,z+h-shelfTop-18));
      drawBox(ctx,projector,{x:x+45,y:y+45,z:shelfTop,w:Math.max(120,w-90),d:Math.max(120,d-90),h:oh},{body:'#25282b',side:'#161819',front:'#151719',top:'#3c4043',stroke:'rgba(0,0,0,.7)'});
    }
    if(module.kind==='TALL_OVEN'){
      const oz=z+h*.34,oh=Math.min(600,Math.max(520,h*.20));
      panel({x:x+t,y:y+22,z:oz-t,w:Math.max(20,w-2*t),d:Math.max(30,d-44),h:t},'rgba(205,208,205,.28)');
      drawBox(ctx,projector,{x:x+45,y:y+45,z:oz,w:Math.max(120,w-90),d:Math.max(120,d-90),h:oh},{body:'#25282b',side:'#161819',front:'#151719',top:'#3c4043',stroke:'rgba(0,0,0,.7)'});
      module.oven_support_shelf_position='BELOW_OVEN';
      module.oven_nominal_zone_mm=600;
    }

    // Shelves: 0–2 for ordinary lower/upper modules, 0–3 for tall modules.
    if(!['DRAWERS','DISHWASHER','OVEN','TALL_OVEN','FRIDGE'].includes(module.kind)&&!(module.kind==='COOKTOP'&&module.oven_appliance_present)){
      const maxShelves=module.tall?3:2,rawShelves=module.shelf_count===undefined?1:Number(module.shelf_count),count=Math.max(0,Math.min(maxShelves,Number.isFinite(rawShelves)?rawShelves:1));
      const facadeCount=Math.max(1,Number(module.facade_count)||1),boundaries=Array.isArray(module.middle_side_boundaries)?module.middle_side_boundaries.filter(v=>v>0&&v<facadeCount):[];
      const cuts=boundaries.length?[0,...boundaries,facadeCount]:[0,facadeCount],innerW=Math.max(20,w-2*t);
      for(let i=1;i<=count;i++){
        const sz=z+h*i/(count+1);
        for(let s=0;s<cuts.length-1;s++){
          const a=cuts[s]/facadeCount,b=cuts[s+1]/facadeCount;
          const sx=x+t+innerW*a+(s>0?t/2:0),sw=Math.max(20,innerW*(b-a)-(s>0?t/2:0)-(s<cuts.length-2?t/2:0));
          panel({x:sx,y:y+22,z:sz-t/2,w:sw,d:Math.max(30,d-44),h:t},'rgba(205,208,205,.24)');
        }
      }
    }

    if(module.kind==='FRIDGE'&&!module.freestanding&&Number(module.fridge_bottom_vent_diameter_mm)===250){
      const radius=125,cx=x+w/2,cy=y+d/2,cz=z+t+1,pts=[];
      for(let i=0;i<=32;i++){const a=Math.PI*2*i/32;pts.push(projector.point([cx+Math.cos(a)*radius,cy+Math.sin(a)*radius,cz]))}
      for(let i=1;i<pts.length;i++)line(ctx,pts[i-1],pts[i],'rgba(56,61,64,.78)',1.4);
    }
    // A middle side is generated only where an internal facade boundary actually carries hinges.
    if(Array.isArray(module.middle_side_boundaries)&&module.middle_side_boundaries.length&&module.facade_orientation!=='HORIZONTAL'){
      const facadeCount=Math.max(1,Number(module.facade_count)||1);
      module.middle_side_boundaries.forEach(boundary=>{
        const px=x+w*boundary/facadeCount-t/2;
        panel({x:px,y:y+18,z:z+t,w:t,d:Math.max(40,d-36),h:Math.max(40,h-2*t)},'rgba(188,194,194,.25)');
      });
    }

    if(module.kind==='TALL_OVEN'&&module.mandatory_lower_drawer){
      const dz=z+34,dh=Math.max(110,h*.12),innerD=Math.max(80,d-90);
      panel({x:x+34,y:y+42,z:dz,w:Math.max(40,w-68),d:innerD,h:t},'rgba(122,132,136,.28)');
      panel({x:x+34,y:y+42,z:dz+t,w:t,d:innerD,h:Math.min(90,dh)},'rgba(122,132,136,.26)');
      panel({x:x+w-52,y:y+42,z:dz+t,w:t,d:innerD,h:Math.min(90,dh)},'rgba(122,132,136,.26)');
      panel({x:x+34,y:y+42,z:dz+t,w:Math.max(40,w-68),d:t,h:Math.min(90,dh)},'rgba(130,138,141,.30)');
      panel({x:x+34,y:y+42+innerD-t,z:dz+t,w:Math.max(40,w-68),d:t,h:Math.min(90,dh)},'rgba(112,120,123,.30)');
      panel({x:x+20,y:y+64,z:dz+25,w:10,d:Math.max(40,d-120),h:12},'rgba(65,70,74,.55)');
      panel({x:x+w-30,y:y+64,z:dz+25,w:10,d:Math.max(40,d-120),h:12},'rgba(65,70,74,.55)');
    }

    // Phase 8 drawer internals: complete box + slides. HARD rule: box height = facade height minus exactly 50 mm.
    if(module.kind==='DRAWERS'){
      const count=Math.max(2,Math.min(5,Number(module.drawer_count)||2));
      const facadeH=Math.floor((h-5-3*(count-1))/count),boxH=Math.max(1,facadeH-50),innerD=Math.max(60,d-82);
      for(let i=0;i<count;i++){
        const dz=z+3+i*(facadeH+3);
        panel({x:x+34,y:y+42,z:dz,w:Math.max(40,w-68),d:innerD,h:t},'rgba(122,132,136,.28)');
        panel({x:x+34,y:y+42,z:dz+t,w:t,d:innerD,h:boxH},'rgba(122,132,136,.26)');
        panel({x:x+w-52,y:y+42,z:dz+t,w:t,d:innerD,h:boxH},'rgba(122,132,136,.26)');
        panel({x:x+34,y:y+42,z:dz+t,w:Math.max(40,w-68),d:t,h:boxH},'rgba(130,138,141,.30)');
        panel({x:x+34,y:y+42+innerD-t,z:dz+t,w:Math.max(40,w-68),d:t,h:boxH},'rgba(112,120,123,.30)');
        panel({x:x+20,y:y+64,z:dz+25,w:10,d:Math.max(40,d-120),h:12},'rgba(65,70,74,.55)');
        panel({x:x+w-30,y:y+64,z:dz+25,w:10,d:Math.max(40,d-120),h:12},'rgba(65,70,74,.55)');
      }
    }

    // Tall cabinet drawers: hidden drawers stay behind the hinged facade; visible drawers own the lower facade zone.
    if(module.tall&&!['TALL_OVEN','FRIDGE'].includes(module.kind)&&module.tall_drawer_mode&&module.tall_drawer_mode!=='NONE'){
      const count=Math.max(1,Math.min(3,Number(module.tall_drawer_count)||2));
      const stack=module.tall_drawer_mode==='VISIBLE'?Math.min(h,Math.max(180,Number(module.visible_drawer_stack_height_mm)||Math.min(760,h*.4))):Math.min(h*.42,760);
      const facadeH=Math.floor((stack-3*(count-1))/count),boxH=Math.max(1,facadeH-50),innerD=Math.max(60,d-82);
      for(let i=0;i<count;i++){
        const dz=z+3+i*(facadeH+3);
        panel({x:x+34,y:y+42,z:dz,w:Math.max(40,w-68),d:innerD,h:t},'rgba(122,132,136,.28)');
        panel({x:x+34,y:y+42,z:dz+t,w:t,d:innerD,h:boxH},'rgba(122,132,136,.26)');
        panel({x:x+w-52,y:y+42,z:dz+t,w:t,d:innerD,h:boxH},'rgba(122,132,136,.26)');
        panel({x:x+34,y:y+42,z:dz+t,w:Math.max(40,w-68),d:t,h:boxH},'rgba(130,138,141,.30)');
        panel({x:x+34,y:y+42+innerD-t,z:dz+t,w:Math.max(40,w-68),d:t,h:boxH},'rgba(112,120,123,.30)');
      }
    }

    const hardware=window.BizetHardwareAssets||{};
    if(module.level!=='upper'&&!module.tall){
      const legAsset=hardware.SCILM_ADJUSTABLE_LEG,legH=Math.max(80,Math.min(150,z||100)),legZ=Math.max(0,z-legH);
      const ix=Math.min(72,w*.14),iy=Math.min(72,d*.16);
      [[x+ix,y+iy],[x+w-ix,y+iy],[x+ix,y+d-iy],[x+w-ix,y+d-iy]].forEach(([lx,ly])=>drawScilmLegProxy(ctx,projector,lx,ly,legZ,legH));
      module.hardware_leg_asset_status=legAsset?.geometry_status||'VERIFIED_DIMENSIONAL_PROXY';
    }
    if(['HINGED','SINK','UPPER','UPPER_TOP','UPPER_DRYER'].includes(module.kind)&&!(module.level==='upper'&&module.facade_orientation==='HORIZONTAL')){
      const rules=window.BizetR10Rules?.hingeVerticalMm||{};
      const hingeRule=module.kind==='SINK'?(rules.SINK_BASE||{top:150,bottom:100}):(rules.STANDARD||{top:100,bottom:100});
      const count=Math.max(1,Number(module.facade_count)||1),opens=Array.isArray(module.facade_openings)?module.facade_openings:[];
      const bottomZ=z+Math.min(h-20,Math.max(20,Number(hingeRule.bottom)||100));
      const topZ=z+h-Math.min(h-20,Math.max(20,Number(hingeRule.top)||100));
      const hingeZ=[bottomZ,topZ].filter((value,index,array)=>index===0||Math.abs(value-array[0])>40);
      for(let i=0;i<count;i++){
        const opening=opens[i]||(['LEFT','RIGHT'][i%2]);
        hingeZ.forEach(centerZ=>drawBlumHingeProxy(ctx,projector,module,centerZ,i,count,opening));
      }
      module.hardware_hinge_asset_status=hardware.BLUM_HINGE_STRAIGHT_PLATE?.geometry_status||'CAD_IDENTIFIED_EXTERNAL_PROXY';
      module.hinge_vertical_rule={top_mm:Number(hingeRule.top),bottom_mm:Number(hingeRule.bottom)};
    }
    if(module.tall&&!['TALL_OVEN','FRIDGE'].includes(module.kind)){
      const count=Math.max(1,Math.min(3,Number(module.tall_facade_count||module.facade_count)||1)),opens=Array.isArray(module.facade_openings)?module.facade_openings:[],stack=module.tall_drawer_mode==='VISIBLE'?Math.max(0,Number(module.visible_drawer_stack_height_mm)||0):0;
      const faceH=Math.max(120,(h-stack)/count);
      for(let i=0;i<count;i++){
        const low=z+stack+faceH*i,high=Math.min(z+h,low+faceH),opening=opens[i]||(['LEFT','RIGHT'][i%2]);
        [low+Math.min(100,faceH*.22),high-Math.min(100,faceH*.22)].forEach(centerZ=>drawBlumHingeProxy(ctx,projector,module,centerZ,0,1,opening));
      }
    }
    if(module.level==='upper'){
      const hangerW=32,hangerD=24,hangerH=38,hangerY=y+d-hangerD-t;
      const levels=[z+h-hangerH-22];
      if(module.kind!=='UPPER_TOP'&&h>900)levels.push(z+Math.max(80,h*.48)-hangerH/2);
      levels.forEach(hangerZ=>[x+t+6,x+w-t-hangerW-6].forEach(hx=>{
        drawBox(ctx,projector,{x:hx,y:hangerY,z:hangerZ,w:hangerW,d:hangerD,h:hangerH},{body:'#73787b',side:'#565b5e',front:'#8a8f92',top:'#a1a5a7',stroke:'rgba(0,0,0,.45)'});
      }));
      module.upper_hanger_visual=levels.length>1?'DOUBLE_SET_LEFT_RIGHT_REAR':'LEFT_RIGHT_REAR_TOP';
    }
    return front;
  }

  function drawModuleRunDimensions(ctx,projector,modules,c){
    const p=projector.point;
    modules.filter(m=>m.level!=='upper').forEach(m=>{
      const size=m.wall==='A'?m.w:m.d;
      if(!Number.isFinite(size)||size<80)return;
      if(m.wall==='A'){
        const y=m.y-30,z=Math.max(0,m.z-20);
        dimensionLine(ctx,p([m.x,y,z]),p([m.x+m.w,y,z]),`${Math.round(size)} мм`,[0,11],c);
      }else{
        const x=m.wall==='B'?m.x-28:m.x+m.w+28,z=Math.max(0,m.z-20);
        dimensionLine(ctx,p([x,m.y,z]),p([x,m.y+m.d,z]),`${Math.round(size)} мм`,[m.wall==='B'?-6:6,4],c);
      }
    });
  }

  function drawWorktop(ctx,projector,group,avoidSinkJoint=false){
    const base=group.filter(m=>m.level!=='upper'&&!m.tall);if(!base.length)return;const c=colors(),p=projector.point;
    const plan=window.BizetR10Rules?.worktopRunPlan?.(base,{avoidSinkJoint})||{segments:[],joints:[]};
    if(!plan.segments.length)return;
    if(base[0].wall==='A'){
      const minY=Math.min(...base.map(m=>m.y)),depth=Math.max(...base.map(m=>m.d)),z=Math.max(...base.map(m=>m.z+m.h));
      plan.segments.forEach(seg=>drawBox(ctx,projector,{x:seg.start,y:minY-18,z,w:seg.length,d:depth+36,h:26},{body:c.worktop,side:c.worktop,front:c.worktop,top:'#373737',stroke:'rgba(0,0,0,.25)'}));
      plan.joints.forEach(j=>line(ctx,p([j,minY-18,z+27]),p([j,minY+depth+18,z+27]),'#e8e8e8',2.3));
    }else{
      const x=Math.min(...base.map(m=>m.x))-18,w=Math.max(...base.map(m=>m.w))+36,z=Math.max(...base.map(m=>m.z+m.h));
      plan.segments.forEach(seg=>drawBox(ctx,projector,{x,y:seg.start,z,w,d:seg.length,h:26},{body:c.worktop,side:c.worktop,front:c.worktop,top:'#373737',stroke:'rgba(0,0,0,.25)'}));
      plan.joints.forEach(j=>line(ctx,p([x,j,z+27]),p([x+w,j,z+27]),'#e8e8e8',2.3));
    }
  }
  function drawPlinth(ctx,projector,group){
    const base=group.filter(m=>m.level!=='upper'&&!m.freestanding&&Number(m.z)>0);if(!base.length)return;
    const c=colors(),p=projector.point,plinthH=Math.max(0,Math.min(300,Math.max(...base.map(m=>Number(m.z)||0))));
    if(plinthH<=0)return;
    const plan=window.BizetR10Rules?.plinthRunPlan?.(base)||{segments:[],joints:[]};if(!plan.segments.length)return;
    if(base[0].wall==='A'){
      const minY=Math.min(...base.map(m=>m.y));
      plan.segments.forEach(seg=>drawBox(ctx,projector,{x:seg.start,y:minY+45,z:0,w:seg.length,d:Math.max(80,Math.max(...base.map(m=>m.d))-90),h:plinthH},{body:'#30302e',side:'#272725',front:'#2d2d2b',top:'#383836',stroke:c.line}));
      plan.joints.forEach(j=>line(ctx,p([j,minY+42,0]),p([j,minY+42,plinthH]),'#686864',1.4));
    }else{
      const x=base[0].wall==='B'?45:Math.min(...base.map(m=>m.x))+45,w=Math.max(80,Math.max(...base.map(m=>m.w))-90);
      plan.segments.forEach(seg=>drawBox(ctx,projector,{x,y:seg.start,z:0,w,d:seg.length,h:plinthH},{body:'#30302e',side:'#272725',front:'#2d2d2b',top:'#383836',stroke:c.line}));
      plan.joints.forEach(j=>line(ctx,p([x,j,0]),p([x,j,plinthH]),'#686864',1.4));
    }
  }
  function drawTopAppliance(ctx,projector,module){
    if(module.wall!=='A'||module.level==='upper')return;const p=projector.point,topZ=module.z+module.h+30;
    if(module.kind==='COOKTOP'){
      polygon(ctx,[p([module.x+module.w*.12,module.y+module.d*.18,topZ]),p([module.x+module.w*.88,module.y+module.d*.18,topZ]),p([module.x+module.w*.88,module.y+module.d*.78,topZ]),p([module.x+module.w*.12,module.y+module.d*.78,topZ])],'#161616','#050505',1.1);
      [[.32,.36],[.68,.36],[.32,.63],[.68,.63]].forEach(([rx,ry])=>{const q=p([module.x+module.w*rx,module.y+module.d*ry,topZ+2]);ctx.save();ctx.beginPath();ctx.arc(q[0],q[1],4.2,0,Math.PI*2);ctx.strokeStyle='#777';ctx.lineWidth=1.4;ctx.stroke();ctx.restore()});
    }
    if(module.kind==='SINK'){
      const bowls=Number(module.sink_bowl_count)||1;
      if(bowls===2){
        [[.20,.49],[.51,.80]].forEach(([a,b])=>polygon(ctx,[p([module.x+module.w*a,module.y+module.d*.24,topZ]),p([module.x+module.w*b,module.y+module.d*.24,topZ]),p([module.x+module.w*b,module.y+module.d*.70,topZ]),p([module.x+module.w*a,module.y+module.d*.70,topZ])],'#aeb3b4','#707577',1.1));
      }else polygon(ctx,[p([module.x+module.w*.18,module.y+module.d*.22,topZ]),p([module.x+module.w*.82,module.y+module.d*.22,topZ]),p([module.x+module.w*.82,module.y+module.d*.72,topZ]),p([module.x+module.w*.18,module.y+module.d*.72,topZ])],'#aeb3b4','#707577',1.1);
      const base=p([module.x+module.w*.72,module.y+module.d*.76,topZ+4]),stem=p([module.x+module.w*.72,module.y+module.d*.76,topZ+150]),spout=p([module.x+module.w*.55,module.y+module.d*.63,topZ+150]);
      line(ctx,base,stem,'#aeb4b7',3.2);line(ctx,stem,spout,'#aeb4b7',3.2);const tip=p([module.x+module.w*.55,module.y+module.d*.63,topZ+118]);line(ctx,spout,tip,'#aeb4b7',3.2);
    }
  }

  function drawFreestandingFridge(ctx,projector,module,c){
    const gap=Math.max(15,Number(module.appliance_clearance_mm)||15),appliance=Math.max(450,Number(module.appliance_width_mm)||600),fullH=module.z+module.h;
    let box;
    if(module.wall==='A')box={x:module.x+gap,y:module.y+6,z:0,w:Math.min(appliance,Math.max(100,module.w-gap*2)),d:Math.max(100,module.d-6),h:fullH};
    else box={x:module.x+6,y:module.y+gap,z:0,w:Math.max(100,module.w-6),d:Math.min(appliance,Math.max(100,module.d-gap*2)),h:fullH};
    const faces=drawBox(ctx,projector,box,{body:'#5b6065',side:'#484d51',front:'#6c7277',top:'#7e8489',stroke:'rgba(0,0,0,.38)'});
    const front=moduleFrontFace(faces,module),p=projector.point,splitZ=fullH*.34;
    if(module.wall==='A'){
      const y=box.y-2;
      line(ctx,p([box.x+box.w*.04,y,splitZ]),p([box.x+box.w*.96,y,splitZ]),'rgba(20,20,20,.58)',1.4);
      line(ctx,p([box.x+box.w*.88,y,splitZ+40]),p([box.x+box.w*.88,y,fullH*.88]),'rgba(15,15,15,.72)',3);
      line(ctx,p([box.x+box.w*.88,y,fullH*.08]),p([box.x+box.w*.88,y,splitZ-35]),'rgba(15,15,15,.72)',3);
    }else{
      const x=module.wall==='B'?box.x+box.w+2:box.x-2;
      line(ctx,p([x,box.y+box.d*.04,splitZ]),p([x,box.y+box.d*.96,splitZ]),'rgba(20,20,20,.58)',1.4);
    }
    return front;
  }

  function drawFreestandingDishwasher(ctx,projector,module,c){
    const panel=Math.max(0,Number(module.side_panel_mm)||18),gap=Math.max(15,Number(module.appliance_clearance_mm)||15),appliance=Math.max(300,Number(module.appliance_width_mm)||600);
    let applianceBox=null,leftPanel=null,rightPanel=null;
    const fullH=module.z+module.h;
    if(module.wall==='A'){
      leftPanel={x:module.x,y:module.y,z:0,w:panel,d:module.d,h:fullH};
      applianceBox={x:module.x+panel+gap,y:module.y+10,z:0,w:appliance,d:Math.max(100,module.d-10),h:fullH};
      rightPanel={x:module.x+panel+gap+appliance+gap,y:module.y,z:0,w:panel,d:module.d,h:fullH};
    }else{
      leftPanel={x:module.x,y:module.y,z:0,w:module.w,d:panel,h:fullH};
      applianceBox={x:module.x+8,y:module.y+panel+gap,z:0,w:Math.max(100,module.w-8),d:appliance,h:fullH};
      rightPanel={x:module.x,y:module.y+panel+gap+appliance+gap,z:0,w:module.w,d:panel,h:fullH};
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

  function drawEndPanel(ctx,projector,module,c){
    if(!module.end_panel_side)return;
    const sides=module.end_panel_side==='BOTH'?['LEFT','RIGHT']:[module.end_panel_side];
    const mat=module.end_panel_material==='FACADE'?'rgba(226,222,214,.88)':'rgba(196,200,198,.84)';
    sides.forEach(side=>{
      const left=side==='LEFT',px=left?module.x:module.x+module.w-18;
      if(module.end_panel_shape==='L_SHAPE'){
        drawBox(ctx,projector,{x:px,y:module.y,z:module.z,w:18,d:40,h:module.h},{body:mat,side:mat,front:mat,top:mat,stroke:'rgba(45,48,50,.52)'});
        drawBox(ctx,projector,{x:left?module.x:module.x+module.w-40,y:module.y,z:module.z,w:40,d:18,h:module.h},{body:mat,side:mat,front:mat,top:mat,stroke:'rgba(45,48,50,.52)'});
      }else{
        drawBox(ctx,projector,{x:px,y:module.y,z:module.z,w:18,d:module.d,h:module.h},{body:mat,side:mat,front:mat,top:mat,stroke:'rgba(45,48,50,.52)'});
      }
    });
  }

  function drawBuiltInHood(ctx,projector,module,c){
    const t=18,h=Math.min(150,Math.max(90,module.h*.18)),margin=Math.min(45,Math.max(24,module.w*.08));
    let box;
    if(module.wall==='A')box={x:module.x+margin,y:module.y+12,z:module.z+18,w:Math.max(120,module.w-margin*2),d:Math.max(100,Math.min(230,module.d-24)),h};
    else box={x:module.x+12,y:module.y+margin,z:module.z+18,w:Math.max(100,Math.min(230,module.w-24)),d:Math.max(120,module.d-margin*2),h};
    const faces=drawBox(ctx,projector,box,{body:'#3d4245',side:'#2b2f31',front:'#50565a',top:'#5e6468',stroke:'rgba(0,0,0,.52)'});
    if(module.wall==='A'){
      const p=projector.point,pipeR=75,pipeCx=module.x+module.w/2,pipeCy=module.y+module.d-110;
      const lowerShelfZ=box.z+box.h+18,upperShelfZ=Math.min(module.z+module.h-170,Math.max(lowerShelfZ+150,module.z+module.h*.58)),topZ=module.z+module.h-t;
      const shelfBox=zv=>drawBox(ctx,projector,{x:module.x+t,y:module.y+18,z:zv,w:Math.max(30,module.w-2*t),d:Math.max(50,module.d-36),h:t},{body:'rgba(205,208,205,.52)',side:'rgba(180,184,184,.48)',front:'rgba(218,220,216,.56)',top:'rgba(232,232,228,.48)',stroke:'rgba(55,58,60,.58)'});
      shelfBox(lowerShelfZ);shelfBox(upperShelfZ);
      const circle=zv=>{
        const pts=[];for(let i=0;i<=24;i++){const a=Math.PI*2*i/24;pts.push(p([pipeCx+Math.cos(a)*pipeR,pipeCy+Math.sin(a)*pipeR,zv+t+2]))}
        for(let i=1;i<pts.length;i++)line(ctx,pts[i-1],pts[i],'rgba(75,80,82,.86)',1.5);
      };
      circle(lowerShelfZ);circle(upperShelfZ);circle(topZ);
      const cylinderTop=module.z+module.h-6,ring=(zv)=>Array.from({length:24},(_,i)=>{const a=Math.PI*2*i/24;return p([pipeCx+Math.cos(a)*pipeR,pipeCy+Math.sin(a)*pipeR,zv])});
      const r1=ring(lowerShelfZ+t),r2=ring(cylinderTop);for(let i=0;i<24;i++){line(ctx,r1[i],r1[(i+1)%24],'rgba(125,130,132,.72)',1);line(ctx,r2[i],r2[(i+1)%24],'rgba(125,130,132,.72)',1)}
      [0,6,12,18].forEach(i=>line(ctx,r1[i],r2[i],'rgba(125,130,132,.72)',1));
      const uCover=(z0,z1)=>{
        const hh=Math.max(40,z1-z0),frontY=pipeCy-105,sideDepth=210;
        drawBox(ctx,projector,{x:pipeCx-105,y:frontY,z:z0,w:18,d:sideDepth,h:hh},{body:'rgba(194,198,196,.36)',side:'rgba(175,180,178,.34)',front:'rgba(205,208,205,.36)',top:'rgba(220,222,218,.30)',stroke:'rgba(65,68,70,.54)'});
        drawBox(ctx,projector,{x:pipeCx+87,y:frontY,z:z0,w:18,d:sideDepth,h:hh},{body:'rgba(194,198,196,.36)',side:'rgba(175,180,178,.34)',front:'rgba(205,208,205,.36)',top:'rgba(220,222,218,.30)',stroke:'rgba(65,68,70,.54)'});
        drawBox(ctx,projector,{x:pipeCx-87,y:frontY,z:z0,w:174,d:18,h:hh},{body:'rgba(194,198,196,.36)',side:'rgba(175,180,178,.34)',front:'rgba(205,208,205,.36)',top:'rgba(220,222,218,.30)',stroke:'rgba(65,68,70,.54)'});
      };
      uCover(lowerShelfZ+t,upperShelfZ);uCover(upperShelfZ+t,topZ);
      const y=box.y-2,z=box.z+18;for(let i=1;i<=4;i++){const xx=box.x+box.w*i/5;line(ctx,p([xx,y,z]),p([xx,y,z+box.h*.52]),'rgba(185,190,192,.75)',1)}
    }
    return moduleFrontFace(faces,module);
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
    const forceCanvasReset=options.forceCanvasReset===true;
    const {ctx,width,height}=setupCanvas(canvas,forceCanvasReset),configuration=options.configuration||'WALL_CENTER',room=options.room||{};
    const projector=createProjector(width,height,room,configuration,options.camera||{}),activeWalls=options.activeWalls||[],c=colors();
    const modules=Array.isArray(options.modules)?options.modules:[],hits=[];
    const lower=modules.filter(m=>m.level!=='upper'),upper=modules.filter(m=>m.level==='upper');

    if(options.focusMode){
      ctx.fillStyle=c.bg;ctx.fillRect(0,0,width,height);
      modules.forEach(module=>{
        let front;
        if(module.kind==='UPPER_HOOD'&&module.hood_type==='FREESTANDING'){
          front=drawFreestandingHood(ctx,projector,module,c);
        }else{
          front=drawTechnicalFocus(ctx,projector,module,c);
          drawModuleDetails(ctx,projector,module,c);
          drawEndPanel(ctx,projector,module,c);
          if(module.kind==='UPPER_HOOD'&&module.hood_type==='BUILT_IN')drawBuiltInHood(ctx,projector,module,c);
          drawTopAppliance(ctx,projector,module);
        }
        if(options.showModuleDimensions)drawFocusedModuleDimensions(ctx,projector,module,c);
        // No navigation number in MODULE_FOCUS_MODE; numbering belongs to the full-kitchen view.
        hits.push({id:module.id,points:front});
      });
      flushCanvas(ctx,forceCanvasReset);
      return{camera:{yaw:projector.yaw,pitch:projector.pitch,distanceScale:projector.distanceScale},hitAreas:hits,hitTest(x,y){for(let i=hits.length-1;i>=0;i--)if(pointInPolygon(x,y,hits[i].points))return hits[i].id;return null}};
    }

    drawRoomBase(ctx,projector,configuration,activeWalls,options.showDimensions!==false);drawArchitecturalElements(ctx,projector,options.architecturalElements||[]);
    activeWalls.forEach(wall=>drawPlinth(ctx,projector,lower.filter(m=>m.wall===wall)));
    const drawModule=module=>{
      let front=null;
      if(module.kind==='FRIDGE'&&module.freestanding){
        front=drawFreestandingFridge(ctx,projector,module,c);
      }else if(module.kind==='DISHWASHER'&&module.freestanding){
        front=drawFreestandingDishwasher(ctx,projector,module,c);
      }else if(module.kind==='UPPER_HOOD'&&module.hood_type==='FREESTANDING'){
        front=drawFreestandingHood(ctx,projector,module,c);
      }else{
        const system=module.pending||module.system,anchor=module.anchor&&!system;
        const freeFridge=module.kind==='FRIDGE'&&module.freestanding;
        const style=freeFridge?{body:'#5b6065',side:'#484d51',front:'#6c7277',top:'#7e8489',stroke:'rgba(0,0,0,.38)'}:system?{body:c.system,side:c.moduleSide,front:c.system,top:c.moduleTop}:anchor?{body:c.module,side:c.moduleSide,front:c.anchor,top:c.moduleTop}:{};
        const faces=drawBox(ctx,projector,module,style);front=moduleFrontFace(faces,module);
        drawModuleDetails(ctx,projector,module,c);
        drawEndPanel(ctx,projector,module,c);
        if(module.kind==='UPPER_HOOD'&&module.hood_type==='BUILT_IN')drawBuiltInHood(ctx,projector,module,c);
      }
      if(options.showNumbers!==false)drawNumber(ctx,front,module.number,c);hits.push({id:module.id,points:front,center:faceCenter(front)});
    };
    lower.forEach(drawModule);activeWalls.forEach(wall=>drawWorktop(ctx,projector,lower.filter(m=>m.wall===wall),options.worktopAvoidSinkJoint===true));lower.forEach(m=>drawTopAppliance(ctx,projector,m));upper.forEach(drawModule);if(options.showModuleDimensions===true)drawModuleRunDimensions(ctx,projector,lower,c);
    flushCanvas(ctx,forceCanvasReset);
    return{camera:{yaw:projector.yaw,pitch:projector.pitch,distanceScale:projector.distanceScale},hitAreas:hits,hitTest(x,y){
      const candidates=hits.filter(hit=>pointInPolygon(x,y,hit.points));
      if(!candidates.length)return null;
      candidates.sort((a,b)=>{
        const ac=a.center||faceCenter(a.points),bc=b.center||faceCenter(b.points);
        return Math.hypot(ac[0]-x,ac[1]-y)-Math.hypot(bc[0]-x,bc[1]-y);
      });
      return candidates[0].id;
    }};
  }

  window.BizetPilot3D={drawRoomScene,drawKitchenScene,pointInPolygon,cameraDefaults};
})();
