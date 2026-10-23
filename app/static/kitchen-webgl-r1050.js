(() => {
'use strict';
if(!window.THREE||!window.THREE.OrbitControls||!window.BizetPilot3D)return;
const THREE=window.THREE,legacyDraw=window.BizetPilot3D.drawKitchenScene;
const stage=document.getElementById('modelStage'),normalCanvas=document.getElementById('modelCanvas'),focusCanvas=document.getElementById('focusCanvas');
if(!stage||!normalCanvas||!focusCanvas||typeof legacyDraw!=='function')return;

const style=document.createElement('style');style.id='r1050KitchenWebGLStyle';style.textContent=`
#r1050KitchenWebGL{position:absolute;inset:0;z-index:1;overflow:hidden;border-radius:inherit;background:#34383d;transition:inset .42s cubic-bezier(.2,.8,.2,1),border-radius .42s}
#r1050KitchenWebGL canvas{width:100%!important;height:100%!important;display:block;touch-action:none}
#modelCanvas,#focusCanvas{position:absolute!important;inset:0!important;opacity:0!important;pointer-events:none!important}
.r8-stage-top,.r10-constraint-banner,.r104-focus-module-nav,.r8-variant-controls{z-index:12!important}
`;document.head.appendChild(style);
const host=document.createElement('div');host.id='r1050KitchenWebGL';stage.insertBefore(host,stage.firstChild);

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x34383d);scene.fog=null;
const camera=new THREE.PerspectiveCamera(39,1,1,18000);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.rotateSpeed=.62;controls.zoomSpeed=.82;controls.panSpeed=.68;controls.screenSpacePanning=true;controls.minDistance=800;controls.maxDistance=12000;controls.minPolarAngle=.12;controls.maxPolarAngle=1.53;controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.enableRotate=true;controls.enableKeys=false;
const hemi=new THREE.HemisphereLight(0xffffff,0xa7a39a,1.0),key=new THREE.DirectionalLight(0xffffff,.52),fill=new THREE.DirectionalLight(0xd9e5ff,.2);
key.position.set(-2600,4200,-2800);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5200;key.shadow.camera.right=5200;key.shadow.camera.top=5200;key.shadow.camera.bottom=-1500;key.shadow.camera.near=100;key.shadow.camera.far=14000;
fill.position.set(3800,2300,2600);scene.add(hemi,key,fill);
const roomGroup=new THREE.Group(),furnitureGroup=new THREE.Group(),annotationGroup=new THREE.Group(),hardwareGroup=new THREE.Group(),lightingGroup=new THREE.Group();scene.add(roomGroup,furnitureGroup,hardwareGroup,lightingGroup,annotationGroup);
let composer=null,saoPass=null;
if(THREE.EffectComposer&&THREE.RenderPass&&THREE.SAOPass){
  composer=new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene,camera));
  saoPass=new THREE.SAOPass(scene,camera,false,true);
  // Soft contact depth: deliberately restrained so white fronts stay clean.
  saoPass.params.saoBias=.55;
  saoPass.params.saoIntensity=.014;
  saoPass.params.saoScale=52;
  saoPass.params.saoKernelRadius=20;
  saoPass.params.saoMinResolution=0;
  saoPass.params.saoBlur=true;
  saoPass.params.saoBlurRadius=8;
  saoPass.params.saoBlurStdDev=4;
  saoPass.params.saoBlurDepthCutoff=.02;
  composer.addPass(saoPass);
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let selectable=[],movables=[],lastOptions=null,lastMode='',lastRoomKey='',down=null,motionEnabled=true,deepShadow=false,lastFacadeTap={id:'',at:0};
let r1056LightingVisible=true;
const openState=new Map();

function ownMat(p){const m=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,...p});m.userData.owned=true;return m}
function clearGroup(g){while(g.children.length){const c=g.children.pop();c.traverse?.(n=>{n.geometry?.dispose?.();const ms=n.material?(Array.isArray(n.material)?n.material:[n.material]):[];ms.forEach(m=>{if(m?.userData?.owned){m.map?.dispose?.();m.dispose?.()}})})}}
function roomToWorld(room,x,y,z){return new THREE.Vector3(Number(x)-Number(room.lengthMm||6000)/2,Number(z),Number(y)-Number(room.depthMm||4200)/2)}
function center(room,m){return roomToWorld(room,Number(m.x||0)+Number(m.w||0)/2,Number(m.y||0)+Number(m.d||0)/2,Number(m.z||0)+Number(m.h||0)/2)}
function addVisibleEdges(mesh,cat,id){
 const edgeGeo=new THREE.EdgesGeometry(mesh.geometry,28);
 const edgeMat=new THREE.LineBasicMaterial({color:0x202326,transparent:true,opacity:.86});
 edgeMat.userData.owned=true;
 const edges=new THREE.LineSegments(edgeGeo,edgeMat);
 edges.renderOrder=7;
 edges.userData={moduleId:id||'',cat:(cat||'body')+'-edges',viewerEdge:true};
 mesh.add(edges);
 return edges;
}
function meshBox(room,m,mat,group=furnitureGroup,cat='body',id=''){const w=Math.max(1,+m.w||1),h=Math.max(1,+m.h||1),d=Math.max(1,+m.d||1),o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.copy(center(room,m));o.castShadow=true;o.receiveShadow=true;o.userData={moduleId:id||m.id||'',cat};addVisibleEdges(o,cat,id||m.id||'');group.add(o);return o}
const PRESETS={
 floor:{TILE_MARBLE_WHITE:'#f7f6f3',TILE_SAND:'#d7c9ad',STONE_LIGHT:'#d1cec5',TILE_GREY:'#aeb0ae',OAK_NATURAL:'#cbb58f',OAK_SMOKED:'#8c7358',ASH_LIGHT:'#d5c29f',LAMINATE_OAK:'#b99c72',LAMINATE_GREY:'#aaa59b',LAMINATE_DARK:'#655b50',CONCRETE_WARM:'#bbb7ae',CONCRETE_GREY:'#9d9e9c',CONCRETE_LIGHT:'#d0cec8'},
 walls:{WARM_WHITE:'#e9e5db',SAND:'#d9ccb7',GREIGE:'#c9c4b9',STONE:'#bebbb4',WALL_TILE_LIGHT:'#ddd8ce',WALL_TILE_GRAPHITE:'#777775',PLASTER_WARM:'#d2c6b5',PLASTER_GREY:'#b2b0a9',PLASTER_WHITE:'#e8e5de',PANEL_OAK:'#b69268',PANEL_WALNUT:'#7a5b42',PANEL_LIGHT:'#d7cbb8'},
 facade:{IVORY:'#eee8dc',OAK:'#c7a77e',GRAPHITE:'#45484c',SAGE:'#aab49f',WHITE:'#f3f2ed'},
 carcass:{WHITE:'#e9e8e3',GREY:'#a9abad',OAK:'#bd9b73',GRAPHITE:'#505256'},
 worktop:{BLACK:'#242424',STONE:'#77746e',OAK:'#9d7851',LIGHT_STONE:'#c9c3b7'}
};
function colors(){const dark=document.documentElement.dataset.furniturePalette==='dark',pick=(set,key,fall)=>PRESETS[set][document.documentElement.dataset[key]||'']||fall;return{
 floor:pick('floor','floorPreset','#f7f6f3'),wall:pick('walls','wallPreset','#565b61'),front:pick('facade','facadePreset',dark?'#505359':'#f0ece4'),body:pick('carcass','carcassPreset',dark?'#404246':'#d7cfc1'),worktop:pick('worktop','worktopPreset','#343434'),metal:'#575b5f',glass:'#1f2429'
}}
function setDeepShadow(){
 deepShadow=false;
 localStorage.setItem('bizet_deep_shadow','0');
 hemi.intensity=1.0;key.intensity=.52;fill.intensity=.2;
 renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;
 if(saoPass)saoPass.enabled=false;
 window.dispatchEvent(new CustomEvent('bizet:deepshadowchange',{detail:{enabled:false,ao:false,disabled:true}}));
}
function makeWalnutTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
 x.fillStyle='#67462f';x.fillRect(0,0,512,512);
 const plank=64;
 for(let y=0;y<512;y+=plank){
   x.fillStyle=(y/plank)%2?'rgba(255,220,170,.035)':'rgba(0,0,0,.055)';x.fillRect(0,y,512,plank);
   x.strokeStyle='rgba(20,12,8,.28)';x.lineWidth=2;x.beginPath();x.moveTo(0,y+.5);x.lineTo(512,y+.5);x.stroke();
   for(let k=0;k<8;k++){const yy=y+8+k*6;x.strokeStyle='rgba(220,175,125,.055)';x.lineWidth=1;x.beginPath();x.moveTo(0,yy);for(let xx=0;xx<=512;xx+=32)x.lineTo(xx,yy+Math.sin((xx+k*17)*.035)*2);x.stroke();}
 }
 const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(4,4);tex.encoding=THREE.sRGBEncoding;return tex;
}
const r1056TextureCache=new Map();
function r1056Texture(preset,base,domain){
 if(!preset||preset==='CUSTOM')return null;
 const key=domain+':'+preset+':'+base;if(r1056TextureCache.has(key))return r1056TextureCache.get(key);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
 const hash=(x,y)=>{let n=(x*374761393+y*668265263+preset.length*1442695041)|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295};
 const isFloor=domain==='floor',isTile=/TILE|STONE/.test(preset),isWood=/OAK|ASH|WALNUT|PARQUET|LAMINATE|PANEL/.test(preset);
 if(isFloor&&preset==='TILE_MARBLE_WHITE'){
   ctx.fillStyle='#f8f7f5';ctx.fillRect(0,0,512,512);
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const ox=col*128,oy=row*128;
    ctx.fillStyle=hash(col,row)>.5?'#f6f5f2':'#fcfbf9';ctx.fillRect(ox+2,oy+2,124,124);
    for(let v=0;v<5;v++){
     const start=ox+8+hash(row*4+col,v+8)*94;
     ctx.beginPath();ctx.moveTo(start,oy+3);
     for(let j=1;j<=9;j++){
      const yy=oy+3+j*13.3,xx=start+Math.sin(j*.77+v+col)*14+(hash(v+j,col+row)-.5)*16;
      ctx.lineTo(Math.max(ox+3,Math.min(ox+125,xx)),yy);
     }
     ctx.strokeStyle=v%3===0?'rgba(23,24,28,.73)':'rgba(49,52,58,.30)';
     ctx.lineWidth=v%3===0?1.7:.8;ctx.stroke();
    }
   }
   ctx.strokeStyle='#a9aaa9';ctx.lineWidth=3;
   for(let j=0;j<=512;j+=128){ctx.beginPath();ctx.moveTo(j+.5,0);ctx.lineTo(j+.5,512);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,j+.5);ctx.lineTo(512,j+.5);ctx.stroke()}
  }else if(isTile){
   const size=preset.includes('TILE')?128:170;
   ctx.strokeStyle='rgba(31,27,20,.36)';ctx.lineWidth=4;
   for(let y=0;y<=512;y+=size)for(let x=0;x<=512;x+=size){
     ctx.fillStyle=hash(x,y)>.5?'rgba(255,255,255,.04)':'rgba(0,0,0,.045)';
     ctx.fillRect(x+2,y+2,size-4,size-4);ctx.strokeRect(x+.5,y+.5,size,size);
   }
 }else if(isWood){
   const plank=isFloor?80:105;
   for(let y=0;y<512;y+=plank){
     const shift=Math.floor((y/plank)%2)*135;
     ctx.strokeStyle='rgba(40,23,8,.20)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();
     for(let x=-shift;x<512;x+=185){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+plank);ctx.stroke()}
     for(let n=0;n<15;n++){
       const yy=y+hash(y,n)*plank;ctx.beginPath();ctx.moveTo(0,yy);
       for(let x=0;x<=512;x+=8)ctx.lineTo(x,yy+Math.sin(x*.025+n)*2.6);
       ctx.strokeStyle=n%2?'rgba(23,15,8,.06)':'rgba(255,255,230,.10)';ctx.lineWidth=1;ctx.stroke();
     }
   }
 }else{
   for(let i=0;i<9000;i++){const x=Math.floor(hash(i,14)*512),y=Math.floor(hash(i,26)*512);
     ctx.fillStyle=hash(i,33)>.5?'rgba(255,255,255,.055)':'rgba(0,0,0,.045)';ctx.fillRect(x,y,1.8,1.8)}
 }
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(isFloor?3:1,isFloor?3:1);texture.encoding=THREE.sRGBEncoding;r1056TextureCache.set(key,texture);return texture;
}
function r1056MaterialTexture(mat,target,color){
 const V=window.BizetModelRuntime?.getVisual?.()||{};
 const item=['floor','walls','ceiling'].includes(target)?V.room_surface_materials?.[target]:V.furniture_materials?.[target];
 const preset=item?.preset||document.documentElement.dataset[target==='walls'?'wallPreset':target==='facade'?'facadePreset':target==='carcass'?'carcassPreset':target==='worktop'?'worktopPreset':'floorPreset']||(target==='floor'?'TILE_MARBLE_WHITE':'');
 if(item?.custom_texture_data_url&&String(item.custom_texture_data_url).startsWith('data:image/')){
   mat.map=new THREE.TextureLoader().load(item.custom_texture_data_url,()=>{mat.needsUpdate=true});
   mat.map.encoding=THREE.sRGBEncoding;mat.color.set('#ffffff');mat.needsUpdate=true;return;
 }
 if(preset&&preset!=='CUSTOM'){
   mat.map=r1056Texture(preset,color,target);mat.color.set('#ffffff');mat.needsUpdate=true;
 }
}
function scanActive(){return window.BizetRoomR1061?.source(window.BizetModelRuntime?.getVisual?.())==='SCAN'}
 function buildRoom(options){clearGroup(roomGroup);const focus=!!options.focusMode;scene.background=new THREE.Color(focus?0xd9dde1:0x34383d);if(focus)return;const r=options.room||{},L=+r.lengthMm||6000,D=+r.depthMm||4200,H=+r.heightMm||2800,c=colors();
 const fm=ownMat({color:c.floor,roughness:.74});r1056MaterialTexture(fm,'floor',c.floor);
 if(fm.map&&((window.BizetModelRuntime?.getVisual?.().room_surface_materials?.floor?.preset||document.documentElement.dataset.floorPreset||'TILE_MARBLE_WHITE')==='TILE_MARBLE_WHITE')){
  fm.map.wrapS=fm.map.wrapT=THREE.RepeatWrapping;fm.map.repeat.set(Math.max(1,L/2400),Math.max(1,D/2400));
 }
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(L,D),fm);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;roomGroup.add(floor);
 const wm=ownMat({color:c.wall,roughness:.91,side:THREE.DoubleSide}),active=new Set(scanActive()?[]:(options.activeWalls||[]));r1056MaterialTexture(wm,'walls',c.wall);
 if(active.has('A')){const w=new THREE.Mesh(new THREE.PlaneGeometry(L,H),wm.clone());w.material.userData.owned=true;w.position.set(0,H/2,D/2);w.receiveShadow=true;roomGroup.add(w)}
 if(active.has('B')){const w=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wm.clone());w.material.userData.owned=true;w.rotation.y=Math.PI/2;w.position.set(-L/2,H/2,0);w.receiveShadow=true;roomGroup.add(w)}
 if(active.has('C')){const w=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wm.clone());w.material.userData.owned=true;w.rotation.y=-Math.PI/2;w.position.set(L/2,H/2,0);w.receiveShadow=true;roomGroup.add(w)}
 const scan=window.BizetModelRuntime?.getVisual?.().scan_import_r1060;
 if(false&&scan?.status==='PRELIMINARY_UNVERIFIED'&&Array.isArray(scan.walls)){
  scan.walls.forEach(w=>{
   const ax=Number(w.x1_mm),az=Number(w.z1_mm),bx=Number(w.x2_mm),bz=Number(w.z2_mm);
   const height=Number(w.height_mm)||2800,len=Math.hypot(bx-ax,bz-az);
   if(![ax,az,bx,bz,height].every(Number.isFinite)||len<100||len>30000||height<200||height>10000)return;
   const mat=ownMat({color:0xed5350,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide});
   const wall=new THREE.Mesh(new THREE.PlaneGeometry(len,height),mat);
   wall.rotation.y=-Math.atan2(bz-az,bx-ax);wall.position.set((ax+bx)/2,height/2,(az+bz)/2);
   wall.userData={cat:'scanned-wall-preview',label:w.label,productionReady:false};
   wall.renderOrder=4;roomGroup.add(wall);
   const edge=new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry),new THREE.LineBasicMaterial({color:0xae2028}));
   edge.renderOrder=5;wall.add(edge);
  });
 }
 if(scan?.walls?.length)window.BizetRoomR1061?.renderWalls({THREE,group:roomGroup,visual:window.BizetModelRuntime.getVisual()});
 wm.dispose();
}
// R10.5.6 owner-supplied reference: rectangular black matte bridge with two end feet.
// World-space alignment is based on facade normal, never on mobile viewport width.
function addHandleBar(pos,vertical=true,parent=hardwareGroup,wall='A'){
 const dark=ownMat({color:'#292a2a',roughness:.76,metalness:.12});
 const g=new THREE.Group(),railLength=154,railHeight=13,railDepth=13;
 const rail=new THREE.Mesh(new THREE.BoxGeometry(railLength,railHeight,railDepth),dark.clone());
 rail.material.userData.owned=true;rail.position.z=14;rail.castShadow=true;g.add(rail);
 [-1,1].forEach(sign=>{
   const foot=new THREE.Mesh(new THREE.BoxGeometry(23,railHeight+17,27),dark.clone());
   foot.material.userData.owned=true;foot.position.set(sign*(railLength/2-11.5),-8,-2);foot.castShadow=true;g.add(foot);
 });
 if(vertical)g.rotation.z=Math.PI/2;
 // Local face normal is +Z; rotate toward real cabinet front.
 const yaw=wall==='A'?Math.PI:wall==='B'?Math.PI/2:-Math.PI/2;
 g.rotation.order='YXZ';
 const oriented=new THREE.Group();oriented.rotation.y=yaw;oriented.add(g);
 oriented.position.copy(pos);oriented.userData.visualization='HANDLE_REFERENCE_20261020';
 oriented.userData.canonicalNormal=wall;parent.add(oriented);
 dark.dispose();return oriented;
}
function frontVector(wall){return wall==='A'?new THREE.Vector3(0,0,-1):wall==='B'?new THREE.Vector3(1,0,0):new THREE.Vector3(-1,0,0)}
function doorOpenSign(wall,side){
 const base=side==='left'?1:-1;
 return wall==='C'?-base:base;
}
function addDrawerBox(room,m,spec,index,id,group){
 const wall=String(m.wall||'A'),t=16,clear=26,boxH=Math.max(70,spec.h-50),boxZ=+spec.z+18,parts=[];
 if(wall==='A'){
   const depth=Math.max(180,+m.d-70),x0=+m.x+clear,x1=+m.x+ +m.w-clear,y0=+m.y+26;
   parts.push(
    {x:x0,y:y0,z:boxZ,w:t,d:depth,h:boxH},
    {x:x1-t,y:y0,z:boxZ,w:t,d:depth,h:boxH},
    {x:x0+t,y:y0+depth-t,z:boxZ,w:Math.max(40,x1-x0-2*t),d:t,h:boxH},
    {x:x0+t,y:y0,z:boxZ,w:Math.max(40,x1-x0-2*t),d:t,h:boxH},
    {x:x0+t,y:y0+t,z:boxZ,w:Math.max(40,x1-x0-2*t),d:Math.max(60,depth-2*t),h:4}
   );
 }else{
   const depth=Math.max(180,+m.w-70),y0=+m.y+clear,y1=+m.y+ +m.d-clear,x0=wall==='B'?+m.x+26:+m.x+ +m.w-26-depth;
   parts.push(
    {x:x0,y:y0,z:boxZ,w:depth,d:t,h:boxH},
    {x:x0,y:y1-t,z:boxZ,w:depth,d:t,h:boxH},
    {x:wall==='B'?x0:x0+depth-t,y:y0+t,z:boxZ,w:t,d:Math.max(40,y1-y0-2*t),h:boxH},
    {x:wall==='B'?x0+depth-t:x0,y:y0+t,z:boxZ,w:t,d:Math.max(40,y1-y0-2*t),h:boxH},
    {x:x0+t,y:y0+t,z:boxZ,w:Math.max(60,depth-2*t),d:Math.max(40,y1-y0-2*t),h:4}
   );
 }
 const mat=ownMat({color:'#d7d0c6',roughness:.64});
 parts.forEach((p,i)=>{const q=meshBox(room,p,mat.clone(),furnitureGroup,'drawer-box',m.id);q.material.userData.owned=true;q.userData={...q.userData,movableId:id,drawerIndex:index,partRole:['SIDE_A','SIDE_B','REAR','INNER_FRONT','BOTTOM'][i]};group.attach(q)});
 mat.dispose();
}
function makeFront(room,m,index,count,mat){
 const wall=String(m.wall||'A'),gap=4,isDrawer=m.kind==='DRAWERS',isLift=m.level==='upper'&&(m.opening==='LIFT'||m.facade_orientation==='HORIZONTAL'||m.upper_opening==='LIFT'),stacked=isDrawer||isLift;
 let spec;
 if(stacked){
   const fh=Math.max(70,(+m.h-gap*(count-1))/count);
   spec={...m,h:fh-2,z:+m.z+index*(fh+gap)};
   if(wall==='A'){spec.x=+m.x+1;spec.w=Math.max(20,+m.w-2);spec.d=8;spec.y=+m.y-9}
   else{spec.y=+m.y+1;spec.d=Math.max(20,+m.d-2);spec.w=8;spec.x=wall==='B'?+m.x+ +m.w+1:+m.x-9}
 }else if(wall==='A'){
   const fw=Math.max(20,(+m.w-gap*(count-1))/count);spec={...m,w:fw-2,d:8,x:+m.x+index*(fw+gap)+1,y:+m.y-9}
 }else{
   const fd=Math.max(20,(+m.d-gap*(count-1))/count);spec={...m,d:fd-2,w:8,y:+m.y+index*(fd+gap)+1,x:wall==='B'?+m.x+ +m.w+1:+m.x-9}
 }
 const mesh=meshBox(room,spec,mat,furnitureGroup,'front',m.id),id=(m.id||'M')+':F'+index;
 mesh.userData.movableId=id;selectable.push(mesh);
 const type=isDrawer?'drawer':isLift?'lift':'door',requested=String(m.facade_openings?.[index]||'').toUpperCase(),side=requested==='RIGHT'?'right':requested==='LEFT'?'left':index%2===0?'left':'right';
 let mover=null;
 if(type==='door'){
   const pivot=new THREE.Group(),world=mesh.position.clone(),half=(wall==='A'?spec.w:spec.d)/2;furnitureGroup.add(pivot);
   if(wall==='A')pivot.position.set(world.x+(side==='left'?-half:half),world.y,world.z);else pivot.position.set(world.x,world.y,world.z+(side==='left'?-half:half));
   pivot.attach(mesh);pivot.userData={movableId:id,type,moduleId:m.id,side,wall};
   mover={id,type,pivot,mesh,side,wall,sign:doorOpenSign(wall,side),target:openState.get(id)?1:0,current:openState.get(id)?1:0};movables.push(mover);
 }else if(type==='lift'){
   const pivot=new THREE.Group(),world=mesh.position.clone();furnitureGroup.add(pivot);pivot.position.set(world.x,world.y+spec.h/2,world.z);pivot.attach(mesh);pivot.userData={movableId:id,type,moduleId:m.id,side,wall};
   mover={id,type,pivot,mesh,side,wall,target:openState.get(id)?1:0,current:openState.get(id)?1:0};movables.push(mover);
 }else{
   const group=new THREE.Group();group.userData={movableId:id,type,moduleId:m.id,side,wall};furnitureGroup.add(group);group.attach(mesh);addDrawerBox(room,m,spec,index,id,group);
   mover={id,type,group,mesh,side,wall,base:group.position.clone(),target:openState.get(id)?1:0,current:openState.get(id)?1:0};movables.push(mover);
 }
 const handlePolicy=window.BizetR10Rules?.resolveModuleHandle?.(m,viewerInputs())||{system:viewerInputs().handle_system==='GOLA'?'GOLA':'STANDARD',placement:'OPPOSITE_HINGES',applied:viewerInputs().handle_system!=='GOLA'};
 if(handlePolicy.applied){
   const fv=frontVector(wall),p=center(room,spec);
   if(type==='drawer'){p.y+=(spec.h/2)-40;p.add(fv.clone().multiplyScalar(18));const h=addHandleBar(p,false,hardwareGroup,wall);h.userData.movableId=id;mover.group?.attach(h)}
   else if(type==='lift'){p.y-=spec.h/2-40;p.add(fv.clone().multiplyScalar(18));const h=addHandleBar(p,false);h.userData.movableId=id;mover.pivot?.attach(h)}
   else{
     const handleHalf=62.5;
     if(m.tall||(+m.z<100&&+m.h>1500))p.y=1000;else p.y+=(m.level==='upper'?(-spec.h/2+40+handleHalf):(spec.h/2-40-handleHalf));
     const sideOffset=window.BizetR10Rules?.appliedHandleOffset?.(side,handlePolicy.placement,(wall==='A'?spec.w:spec.d)/2,40)??(side==='left'?spec.w/2-40:-spec.w/2+40);
     if(wall==='A')p.x+=sideOffset;else p.z+=sideOffset;
     p.add(fv.clone().multiplyScalar(18));const h=addHandleBar(p,true,hardwareGroup,wall);h.userData.movableId=id;mover.pivot?.attach(h)
   }
 }else if(handlePolicy.profile){
   addProfileHandle(room,spec,mover,handlePolicy,id);
 }
 return mesh;
}
function addProfileHandle(room,spec,mover,policy,id){
 // Visual-only profile: never produce unconfirmed machining or hardware BOM.
 const wall=spec.wall||'A',p=center(room,spec),fv=frontVector(wall),vertical=policy.system==='EDGE'&&Number(spec.h)>Number(wall==='A'?spec.w:spec.d)*1.3;
 const span=wall==='A'?+spec.w:+spec.d,thickness=12,length=Math.max(35,span-12);
 const mat=ownMat({color:'#44484a',metalness:.35,roughness:.45});
 const shape=vertical?new THREE.BoxGeometry(12,Math.max(60,+spec.h-20),14):new THREE.BoxGeometry(length,thickness,14);
 const mesh=new THREE.Mesh(shape,mat);
 mesh.userData={cat:'profile-handle-proxy',movableId:id,moduleId:id.split(':')[0],visualizationProxy:true};
 p.add(fv.multiplyScalar(17));
 if(vertical)p.y+=0;else p.y+=(+spec.h)/2-18;
 mesh.position.copy(p);
 if(wall!=='A'){mesh.rotation.y=Math.PI/2}
 hardwareGroup.add(mesh);
 mover.group?.attach(mesh);mover.pivot?.attach(mesh);
}
function plinthRecess(){
 const I=window.BizetModelRuntime?.getInputs?.()||{};
 return I.dishwasher_type&&I.dishwasher_type!=='NO'?90:40;
}
function addSupportLeg(room,x,y,h,id,recess){
 // Furniture foot, not a pipe: screwed rectangular fixing plate, adjustable
 // tapered housing, knurled spindle, and a flat rubber base. Visual geometry
 // only; catalog article / mounting drill pattern remains unverified.
 const height=Math.max(55,Number(h)||100);
 const steel=ownMat({color:'#414447',roughness:.43,metalness:.42});
 const dark=ownMat({color:'#1f2326',roughness:.76,metalness:.08});
 const plate=meshBox(room,{x:x-24,y:y-24,z:height-7,w:48,d:48,h:7},steel.clone(),hardwareGroup,'foot-mounting-plate',id);
 plate.material.userData.owned=true;plate.userData.visualizationProxy=true;plate.userData.nominalFrontOffsetMm=recess;
 function cylinder(radTop,radBottom,from,to,mat,role,sides=12){
   const obj=new THREE.Mesh(new THREE.CylinderGeometry(radTop,radBottom,to-from,sides),mat);
   obj.position.copy(roomToWorld(room,x,y,(from+to)/2));obj.castShadow=true;obj.receiveShadow=true;
   obj.userData={cat:'foot-'+role,moduleId:id,visualizationProxy:true,productionProxy:false};
   hardwareGroup.add(obj);return obj;
 }
 cylinder(19,23,17,height-7,steel.clone(),'tapered-body');
 cylinder(10,10,9,26,dark.clone(),'height-thread',10);
 cylinder(24,25,2,9,dark.clone(),'flat-ground-pad',16);
 cylinder(14,14,10,15,steel.clone(),'adjustment-ring',10);
 steel.dispose();dark.dispose();return plate;
}
function addLegs(room,m){
 if(!(window.BizetR10Rules?.requiresFloorSupports?.(m)??(m.level!=='upper'&&!m.freestanding&&m.kind!=='FILLER'&&Number(m.z)>0)))return;
 const h=Math.max(40,+m.z||100),recess=plinthRecess(),wall=m.wall||'A';
 if(wall==='A'){
   const ys=[+m.y+recess+38,Math.max(+m.y+recess+38,+m.y+ +m.d-56)]; // leg front >= plinth back + cylinder radius + clearance
   [0.16,0.84].forEach(ax=>ys.forEach(y=>addSupportLeg(room,+m.x+(+m.w)*ax,y,h,m.id,recess)));
 }else{
   const front=wall==='B'?+m.x+ +m.w:+m.x;
   const xs=wall==='B'?[front-recess-38,+m.x+28]:[front+recess+38,+m.x+ +m.w-28]; // keep physical cylinder behind plinth
   [0.16,0.84].forEach(ay=>xs.forEach(x=>addSupportLeg(room,x,+m.y+(+m.d)*ay,h,m.id,recess)));
 }
}

function addHinges(room,m,count){
 if(m.kind==='DRAWERS'||m.kind==='FILLER'||(m.level==='upper'&&(m.opening==='LIFT'||m.facade_orientation==='HORIZONTAL')))return;
 const mat=ownMat({color:'#858b8f',roughness:.3,metalness:.7}),plan=window.BizetR10Rules?.planHingePositions?.(m),ys=plan?.positions?.length?plan.positions.map(v=>(v-(Number(m.z)||0))/Math.max(1,Number(m.h)||1)):[.18,.5,.82],wall=m.wall||'A',run=wall==='A'?+m.w:+m.d;
 if(plan&&!plan.ok){m.hinge_layout_conflict=plan.reason;window.dispatchEvent(new CustomEvent('bizet:engineering-stop',{detail:{module_id:m.id,reason:plan.reason}}));return}
 ys.forEach(fr=>{for(let i=0;i<count;i++){
   const requested=String(m.facade_openings?.[i]||'').toUpperCase();
   const side=requested==='RIGHT'?'right':requested==='LEFT'?'left':i%2===0?'left':'right';
   const hingeAt=(i+(side==='right'?1:0))*run/count+(side==='right'?-16:14);
   const z=+m.z+(+m.h)*fr,part=wall==='A'
     ?{x:+m.x+hingeAt,y:+m.y+8,z,w:22,d:30,h:12}
     :{x:+m.x+8,y:+m.y+hingeAt,z,w:30,d:22,h:12};
   // Compact European concealed hinge proxy: 35 mm circular cup, compact
   // articulated arm and two-point mounting plate (not yet CNC drilling).
   const isA=wall==='A',frame=part;
   const hingeCase=meshBox(room,frame,mat.clone(),hardwareGroup,'hinge-cup-housing',m.id);
   hingeCase.material.userData.owned=true;hingeCase.userData.hingeSide=side;
   hingeCase.userData.visualizationProxy=true;
   const cup=new THREE.Mesh(new THREE.CylinderGeometry(15,15,8,16),mat.clone());
   const centerPos=center(room,frame);cup.rotation.x=Math.PI/2;
   cup.position.copy(centerPos);cup.position.y+=9;cup.userData={cat:'hinge-35mm-cup',moduleId:m.id,
     hingeSide:side,visualizationProxy:true,productionProxy:false};hardwareGroup.add(cup);
   const arm=isA
    ?{x:frame.x+4,y:frame.y+20,z:frame.z-5,w:14,d:43,h:7}
    :{x:frame.x+20,y:frame.y+4,z:frame.z-5,w:43,d:14,h:7};
   const lever=meshBox(room,arm,mat.clone(),hardwareGroup,'hinge-articulating-arm',m.id);
   lever.material.userData.owned=true;lever.userData.visualizationProxy=true;
   const plate=isA
    ?{x:frame.x-3,y:frame.y+52,z:frame.z-10,w:28,d:8,h:30}
    :{x:frame.x+52,y:frame.y-3,z:frame.z-10,w:8,d:28,h:30};
   const mount=meshBox(room,plate,mat.clone(),hardwareGroup,'hinge-mounting-plate',m.id);
   mount.material.userData.owned=true;mount.userData.visualizationProxy=true;
 }});mat.dispose();
}
function addHardwareRod(room,a,b,radius=6,cat='hardware-proxy',id=''){
 const A=roomToWorld(room,...a),B=roomToWorld(room,...b),mid=A.clone().add(B).multiplyScalar(.5),len=A.distanceTo(B);
 const mat=ownMat({color:'#8e9498',roughness:.28,metalness:.72}),g=new THREE.CylinderGeometry(radius,radius,Math.max(2,len),12),mesh=new THREE.Mesh(g,mat);
 mesh.position.copy(mid);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());mesh.userData={cat,moduleId:id,visualizationProxy:true,productionProxy:false};hardwareGroup.add(mesh);return mesh;
}
function addLiftHardware(room,m){
 if(!(m.level==='upper'&&(m.opening==='LIFT'||m.facade_orientation==='HORIZONTAL')))return;
 const wall=m.wall||'A',x=+m.x,y=+m.y,z=+m.z,W=+m.w,D=+m.d,H=+m.h,metal=ownMat({color:'#777d82',roughness:.3,metalness:.72});
 if(m.lift_mechanism==='HINGE_PLUS_LIFT'){
   if(wall==='A'){
     [[x+34,y+45],[x+W-34,y+45]].forEach(([px,py])=>addHardwareRod(room,[px,py,z+H*.35],[px,Math.max(y+8,py-24),z+H-70],7,'gas-lift-proxy',m.id));
     [[x+55,y+10],[x+W-55,y+10]].forEach(([px,py])=>{const q=meshBox(room,{x:px-18,y:py,z:z+H-28,w:36,d:28,h:14},metal.clone(),hardwareGroup,'lift-hinge-proxy',m.id);q.material.userData.owned=true;q.userData.visualizationProxy=true});
   }else{
     const fx=wall==='B'?x+W-45:x+45;
     [y+34,y+D-34].forEach(py=>addHardwareRod(room,[fx,py,z+H*.35],[wall==='B'?x+W-12:x+12,py,z+H-70],7,'gas-lift-proxy',m.id));
   }
 }else{
   if(wall==='A'){
     [x+22,x+W-64].forEach(px=>{const q=meshBox(room,{x:px,y:y+16,z:z+H*.62,w:42,d:70,h:112},metal.clone(),hardwareGroup,'aventos-hk-proxy',m.id);q.material.userData.owned=true;q.userData.visualizationProxy=true;addHardwareRod(room,[px+21,y+42,z+H*.72],[px+21,y-6,z+H-54],5,'aventos-hk-arm',m.id)});
   }else{
     [y+22,y+D-64].forEach(py=>{const q=meshBox(room,{x:wall==='B'?x+W-86:x+16,y:py,z:z+H*.62,w:70,d:42,h:112},metal.clone(),hardwareGroup,'aventos-hk-proxy',m.id);q.material.userData.owned=true;q.userData.visualizationProxy=true});
   }
 }
 metal.dispose();
}
function addFridgeFacade(room,m,z,h,index,mat){
 const wall=m.wall||'A',gap=4;let spec={...m,z:z+(index?gap/2:0),h:Math.max(120,h-gap/2)};
 if(wall==='A'){spec.x=+m.x+1;spec.w=Math.max(20,+m.w-2);spec.y=+m.y-9;spec.d=8}
 else{spec.y=+m.y+1;spec.d=Math.max(20,+m.d-2);spec.x=wall==='B'?+m.x+ +m.w+1:+m.x-9;spec.w=8}
 const mesh=meshBox(room,spec,mat,furnitureGroup,'fridge-front',m.id),id=(m.id||'FRIDGE')+':F'+index;
 mesh.userData.movableId=id;selectable.push(mesh);
 const requested=String(m.facade_openings?.[index]||m.facade_openings?.[0]||'LEFT').toUpperCase(),side=requested==='RIGHT'?'right':'left';
 const pivot=new THREE.Group();furnitureGroup.add(pivot);const world=mesh.position.clone(),half=(wall==='A'?spec.w:spec.d)/2;
 if(wall==='A')pivot.position.set(world.x+(side==='left'?-half:half),world.y,world.z);else pivot.position.set(world.x,world.y,world.z+(side==='left'?-half:half));
 pivot.attach(mesh);pivot.userData={movableId:id,type:'door',moduleId:m.id,side,wall};
 movables.push({id,type:'door',pivot,mesh,side,wall,sign:doorOpenSign(wall,side),target:openState.get(id)?1:0,current:openState.get(id)?1:0});
 const handlePolicy=window.BizetR10Rules?.resolveModuleHandle?.(m,viewerInputs())||{system:viewerInputs().handle_system==='GOLA'?'GOLA':'STANDARD',placement:'OPPOSITE_HINGES',applied:viewerInputs().handle_system!=='GOLA'};
 if(handlePolicy.applied){
   const fv=frontVector(wall),p=center(room,spec);p.y=index===0?z+h-135:z+135;
   const sideOffset=window.BizetR10Rules?.appliedHandleOffset?.(side,handlePolicy.placement,(wall==='A'?spec.w:spec.d)/2,40)??(side==='left'?spec.w/2-40:-spec.w/2+40);
   if(wall==='A')p.x+=sideOffset;else p.z+=sideOffset;
   p.add(fv.clone().multiplyScalar(18));const handle=addHandleBar(p,true,hardwareGroup,wall);handle.userData.movableId=id;pivot.attach(handle);
 }else if(handlePolicy.profile){addProfileHandle(room,spec,{pivot},handlePolicy,id)}
}
function addFridgeHinges(room,m){
 // Fridge facades are stacked vertically: hinge cups follow the facade opening side.
 const wall=m.wall||'A',x=+m.x,y=+m.y,z=+m.z,h=+m.h,lower=Math.max(100,Number(m.lower_facade_height_mm)||700);
 const zones=[{bottom:z,height:lower},{bottom:z+lower+4,height:Math.max(120,h-lower-4)}];
 const metal=ownMat({color:'#858b8f',roughness:.3,metalness:.7});
 zones.forEach((zone,index)=>{
   const side=String(m.facade_openings?.[index]||m.facade_openings?.[0]||'LEFT').toUpperCase()==='RIGHT'?'RIGHT':'LEFT';
   [.20,.80].forEach(f=>{
     const zz=zone.bottom+zone.height*f;
     const p=wall==='A'
       ?{x:side==='LEFT'?x+14:x+(+m.w)-36,y:y+8,z:zz,w:22,d:30,h:12}
       :{x:x+8,y:side==='LEFT'?y+14:y+(+m.d)-36,z:zz,w:30,d:22,h:12};
     const q=meshBox(room,p,metal.clone(),hardwareGroup,'fridge-hinge',m.id);
     q.material.userData.owned=true;q.userData.hingeSide=side;q.userData.frontZone=index;
   });
 });
 metal.dispose();
}
function addBuiltInFridge(room,m,bodyMat,frontMat){
 const t=18,x=+m.x,y=+m.y,z=+m.z,W=+m.w,D=+m.d,H=+m.h,wall=m.wall||'A',parts=[];
 if(wall==='A')parts.push({x,y,z,w:t,d:D,h:H},{x:x+W-t,y,z,w:t,d:D,h:H},{x:x+t,y,z:z+H-t,w:W-2*t,d:D,h:t});
 else parts.push({x,y,z,w:W,d:t,h:H},{x,y:y+D-t,z,w:W,d:t,h:H},{x,y:y+t,z:z+H-t,w:W,d:D-2*t,h:t});
 parts.forEach(p=>meshBox(room,p,bodyMat.clone(),furnitureGroup,'fridge-carcass',m.id).material.userData.owned=true);
 const bottom=wall==='A'?{x:x+t,y,z,w:W-2*t,d:D,h:t}:{x,y:y+t,z,w:W,d:D-2*t,h:t};
 meshBox(room,bottom,bodyMat.clone(),furnitureGroup,'fridge-bottom',m.id).material.userData.owned=true;
 const ventR=(Number(m.fridge_bottom_vent_diameter_mm)||250)/2,ringMat=new THREE.MeshBasicMaterial({color:0x111111,side:THREE.DoubleSide});ringMat.userData.owned=true;
 const ring=new THREE.Mesh(new THREE.RingGeometry(Math.max(20,ventR-4),ventR,40),ringMat);ring.rotation.x=Math.PI/2;ring.position.copy(roomToWorld(room,x+W/2,y+D/2,z+t+1));ring.userData={cat:'fridge-bottom-vent-cutout',diameter_mm:ventR*2,moduleId:m.id,engineeringMarker:true};hardwareGroup.add(ring);
 const applianceH=Math.min(H-180,Math.max(1500,Number(m.fridge_appliance_height_mm)||1800)),shelfZ=Math.min(z+H-t-90,z+applianceH);
 const shelf=wall==='A'?{x:x+t,y:y+10,z:shelfZ,w:W-2*t,d:D-20,h:t}:{x:x+10,y:y+t,z:shelfZ,w:W-20,d:D-2*t,h:t};
 meshBox(room,shelf,bodyMat.clone(),furnitureGroup,'fridge-upper-shelf',m.id).material.userData.owned=true;
 const upperH=Math.max(60,z+H-t-(shelfZ+t));
 if(upperH>70){const back=wall==='A'?{x:x+t,y:y+D-5,z:shelfZ+t,w:W-2*t,d:5,h:upperH}:{x:wall==='B'?x:x+W-5,y:y+t,z:shelfZ+t,w:5,d:D-2*t,h:upperH};meshBox(room,back,bodyMat.clone(),furnitureGroup,'fridge-upper-back',m.id).material.userData.owned=true}
 const steel=ownMat({color:'#7e8589',roughness:.35,metalness:.45}),appliance=wall==='A'?{x:x+t+16,y:y+24,z:z+t,w:W-2*t-32,d:D-48,h:Math.max(500,applianceH-t)}:{x:x+24,y:y+t+16,z:z+t,w:W-48,d:D-2*t-32,h:Math.max(500,applianceH-t)};
 const app=meshBox(room,appliance,steel,furnitureGroup,'fridge-appliance-inner',m.id);app.userData.visualizationProxy=true;
 const lowerH=Math.min(H-260,Math.max(100,Number(m.lower_facade_height_mm)||700)),upperFacadeH=Math.max(256,H-lowerH-4);
 addFridgeFacade(room,m,z,lowerH,0,frontMat.clone());addFridgeFacade(room,m,z+lowerH+4,upperFacadeH,1,frontMat.clone());
 // Grille is a REAL void in the shared plinth mesh generated by addFloorPlinth.
 // No overlay plane is drawn here: it caused hidden geometry overlap in 10.5.5.
 m.plinth_grille_cutout_mm={width:460,height:60,center_offset_mm:0,center_z_mm:Math.max(60,z)/2,subject:m.kind};

}

function viewerInputs(){return window.BizetModelRuntime?.getInputs?.()||{}}
function worktopThickness(){return Math.max(10,Math.min(120,Number(viewerInputs().worktop_thickness_mm)||38))}
function addSinkCarcass(room,m,mat){
 const wall=m.wall||'A',t=18,x=+m.x,y=+m.y,z=+m.z,W=+m.w,D=+m.d,H=+m.h,innerRun=(wall==='A'?W:D)-2*t,railH=100,parts=[];
 if(wall==='A'){
   parts.push({x,y,z,w:t,d:D,h:H},{x:x+W-t,y,z,w:t,d:D,h:H},{x:x+t,y,z,w:W-2*t,d:D,h:t});
   parts.forEach((p,i)=>{const q=meshBox(room,p,mat.clone(),furnitureGroup,'sink-carcass',m.id);q.material.userData.owned=true;q.userData.partRole=['SIDE_L','SIDE_R','BOTTOM'][i]});
   const rails=[
     {x:x+t,y:y+6,z:z+H-railH,w:W-2*t,d:t,h:railH,role:'FRONT_TOP_RAIL'},
     {x:x+t,y:y+D-t-4,z:z+t,w:W-2*t,d:t,h:railH,role:'REAR_BOTTOM_RAIL'},
     {x:x+t,y:y+D-t-4,z:z+H-150-railH,w:W-2*t,d:t,h:railH,role:'REAR_UPPER_RAIL'}
   ];
   rails.forEach(r=>{const q=meshBox(room,r,mat.clone(),furnitureGroup,'sink-rail',m.id);q.material.userData.owned=true;q.userData.partRole=r.role});
   const trayMat=ownMat({color:'#b9bec1',roughness:.28,metalness:.68}),tray=meshBox(room,{x:x+t+4,y:y+18,z:z+t+2,w:Math.max(80,W-2*t-8),d:Math.max(100,D-36),h:2},trayMat,hardwareGroup,'sink-tray',m.id);
   tray.userData={...tray.userData,supplier:'KRONAS',article:m.sink_tray_article||'',canonicalAccessory:true};
 }else{
   parts.push({x,y,z,w:W,d:t,h:H},{x,y:y+D-t,z,w:W,d:t,h:H},{x,y:y+t,z,w:W,d:D-2*t,h:t});
   parts.forEach((p,i)=>{const q=meshBox(room,p,mat.clone(),furnitureGroup,'sink-carcass',m.id);q.material.userData.owned=true;q.userData.partRole=['SIDE_L','SIDE_R','BOTTOM'][i]});
   const frontX=wall==='B'?x+W-t-6:x+6,rearX=wall==='B'?x+4:x+W-t-4;
   const rails=[
     {x:frontX,y:y+t,z:z+H-railH,w:t,d:D-2*t,h:railH,role:'FRONT_TOP_RAIL'},
     {x:rearX,y:y+t,z:z+t,w:t,d:D-2*t,h:railH,role:'REAR_BOTTOM_RAIL'},
     {x:rearX,y:y+t,z:z+H-150-railH,w:t,d:D-2*t,h:railH,role:'REAR_UPPER_RAIL'}
   ];
   rails.forEach(r=>{const q=meshBox(room,r,mat.clone(),furnitureGroup,'sink-rail',m.id);q.material.userData.owned=true;q.userData.partRole=r.role});
   const trayMat=ownMat({color:'#b9bec1',roughness:.28,metalness:.68}),tray=meshBox(room,{x:x+18,y:y+t+4,z:z+t+2,w:Math.max(100,W-36),d:Math.max(80,D-2*t-8),h:2},trayMat,hardwareGroup,'sink-tray',m.id);
   tray.userData={...tray.userData,supplier:'KRONAS',article:m.sink_tray_article||'',canonicalAccessory:true};
 }
}
function addCarcassShelves(room,m,mat){
 if(['SINK','COOKTOP','TALL_OVEN','UPPER_HOOD','UPPER_DRYER','DISHWASHER','FRIDGE','FILLER'].includes(m.kind))return;
 const wall=m.wall||'A',t=18,x=+m.x,y=+m.y,z=+m.z,W=+m.w,D=+m.d,H=+m.h;
 const defaultCount=1; // shared with R1059 equal compartment policy
 const count=Math.max(0,Math.min(5,Number.isFinite(Number(m.shelf_count))?Number(m.shelf_count):defaultCount));
 for(let i=1;i<=count;i++){
   const sz=window.BizetR10Rules?.fixedShelfCenters?.(m)?.[i-1]??(z+t+(i*(H-2*t-count*t)/(count+1))+i*t+t/2);
   const s=wall==='A'?{x:x+t,y:y+8,z:sz,w:Math.max(40,W-2*t),d:Math.max(80,D-16),h:t}:{x:x+8,y:y+t,z:sz,w:Math.max(80,W-16),d:Math.max(40,D-2*t),h:t};
   const q=meshBox(room,s,mat.clone(),furnitureGroup,'shelf',m.id);q.material.userData.owned=true;q.userData.partRole='SHELF_'+i;
 }
}
function addDishDryingRack(room,m){
 if(m.kind!=='UPPER_DRYER')return;
 // Two-tier low-poly metal drying basket. Lower supports plates; upper
 // grid supports cups/glasses. NOT a verified article or drilling template.
 const t=18,run=Math.max(150,m.wall==='A'?+m.w:+m.d),
   depth=Math.max(120,m.wall==='A'?+m.d:+m.w);
 const variant=String(m.dish_dryer_variant||'TWO_TIER_STANDARD');
 const margin=variant==='TWO_TIER_WIDE'?25:34;
 const usable=Math.max(90,run-2*t-margin*2),innerD=Math.max(90,depth-2*t-28);
 const h=+m.h,zz=+m.z,zs=[zz+Math.max(100,h*.28),zz+Math.max(220,h*.68)];
 const pos=(u,v,z)=>m.wall==='A'
   ?[+m.x+t+margin+u,+m.y+t+14+v,z]
   :[+m.x+t+14+v,+m.y+t+margin+u,z];
 for(let tier=0;tier<2;tier++){
  const z=zs[tier],left=pos(0,0,z),right=pos(usable,0,z);
  const rearLeft=pos(0,innerD,z),rearRight=pos(usable,innerD,z);
  addHardwareRod(room,left,right,4,'dish-dryer-frame',m.id);
  addHardwareRod(room,rearLeft,rearRight,4,'dish-dryer-frame',m.id);
  addHardwareRod(room,left,rearLeft,3,'dish-dryer-side',m.id);
  addHardwareRod(room,right,rearRight,3,'dish-dryer-side',m.id);
  const ribs=Math.max(5,Math.min(14,Math.floor(usable/(tier===0?73:65))));
  for(let i=1;i<ribs;i++){
   const u=(usable*i)/ribs;
   const lower=pos(u,0,z),higher=pos(u,innerD,tier===0?z+48:z);
   addHardwareRod(room,lower,higher,tier===0?3.2:2.8,tier===0?'dish-dryer-plate-divider':'dish-dryer-cup-grid',m.id);
  }
 }
}
function addCarcass(room,m,mat){
 if(m.kind==='SINK'){addSinkCarcass(room,m,mat);return}
 const wall=m.wall||'A',t=18,x=+m.x,y=+m.y,z=+m.z,W=+m.w,D=+m.d,H=+m.h,parts=[];
 const ordinaryBase=m.level!=='upper'&&!m.tall&&!(m.kind==='COOKTOP'&&m.oven_appliance_present);
 const wallBackClearance=m.level==='upper'?20:0;
 const skipOvenBack=m.kind==='TALL_OVEN'||(m.kind==='COOKTOP'&&m.oven_appliance_present);
 const shortenUpperRoof=m.level==='upper';
 const explicitTop=m.top_panel_override==='YES'; // manual engineering override only
 const hasTop=!ordinaryBase||explicitTop;
 const push=(spec,role)=>parts.push({spec,role});
 if(wall==='A'){
   push({x,y,z,w:t,d:D,h:H},'SIDE_A');push({x:x+W-t,y,z,w:t,d:D,h:H},'SIDE_B');
   push({x:x+t,y,z,w:Math.max(20,W-2*t),d:D,h:t},'BOTTOM');
   if(hasTop)push({x:x+t,y:y+(shortenUpperRoof?1:0),z:z+H-t,w:Math.max(20,W-2*t),d:shortenUpperRoof?Math.max(80,D-21):D,h:t},'TOP');
   else{
     // #26: FLAT 100 mm horizontal stretchers, not upright vertical rails.
     push({x:x+t,y:y+4,z:z+H-t,w:Math.max(20,W-2*t),d:100,h:t},'FRONT_STRETCHER');
     push({x:x+t,y:y+D-104,z:z+H-t,w:Math.max(20,W-2*t),d:100,h:t},'REAR_STRETCHER');
   }
   if(!skipOvenBack)push({x:x+t,y:y+D-4-wallBackClearance,z:z+t,w:Math.max(20,W-2*t),d:4,h:Math.max(20,H-2*t)},'BACK');
 }else{
   push({x,y,z,w:W,d:t,h:H},'SIDE_A');push({x,y:y+D-t,z,w:W,d:t,h:H},'SIDE_B');
   push({x,y:y+t,z,w:W,d:Math.max(20,D-2*t),h:t},'BOTTOM');
   if(hasTop)push({x:x+(shortenUpperRoof?(wall==='B'?20:1):0),y:y+t,z:z+H-t,w:shortenUpperRoof?Math.max(80,W-21):W,d:Math.max(20,D-2*t),h:t},'TOP');
   else{
     const isB=wall==='B';
     push({x:isB?x+W-104:x+4,y:y+t,z:z+H-t,w:100,d:Math.max(20,D-2*t),h:t},'FRONT_STRETCHER');
     push({x:isB?x+4:x+W-104,y:y+t,z:z+H-t,w:100,d:Math.max(20,D-2*t),h:t},'REAR_STRETCHER');
   }
   if(!skipOvenBack)push({x:wall==='B'?x+wallBackClearance:x+W-4-wallBackClearance,y:y+t,z:z+t,w:4,d:Math.max(20,D-2*t),h:Math.max(20,H-2*t)},'BACK');
 }
 const made=parts.map(p=>{const q=meshBox(room,p.spec,mat.clone(),furnitureGroup,'carcass-part',m.id);q.material.userData.owned=true;q.userData.partRole=p.role;return q});
 addCarcassShelves(room,m,mat);
 // Rear back-panel groove in bottom/side sheets is a parametric feature awaiting
 // verified library milling. Visibility of full-depth bottom is preserved.
 if(m.level==='upper')made.forEach(q=>{
  if(['BOTTOM','SIDE_A','SIDE_B'].includes(q.userData.partRole)){
   q.userData.rear_groove_mm=20;
   q.userData.groove_status='PARAMETRIC_PENDING_MACHINING_PROFILE';
  }
 });
 return made;
}
function addTallOvenVisual(room,m,darkMat,steelMat){
 const wall=m.wall||'A',z=+m.z,H=+m.h,openingH=Math.min(600,Math.max(500,H*.28)),ovenZ=z+Math.max(180,Math.min(H-openingH-220,H*.32));
 const frontMat=ownMat({color:colors().front,roughness:.5}),trimMat=steelMat.clone();trimMat.userData.owned=true;
 const makeFrontPanel=(pz,ph,id)=>{
   if(ph<90)return;
   let s={...m,z:pz,h:ph};
   if(wall==='A'){s.x=+m.x+2;s.w=Math.max(20,+m.w-4);s.y=+m.y-9;s.d=8}else{s.y=+m.y+2;s.d=Math.max(20,+m.d-4);s.x=wall==='B'?+m.x+ +m.w+1:+m.x-9;s.w=8}
   const q=meshBox(room,s,frontMat.clone(),furnitureGroup,'oven-cabinet-front',m.id);q.material.userData.owned=true;q.userData.partRole=id;
 };
 makeFrontPanel(z,ovenZ-z-4,'LOWER_FRONT');makeFrontPanel(ovenZ+openingH+4,z+H-(ovenZ+openingH+4),'UPPER_FRONT');
 let glass={...m,z:ovenZ+18,h:openingH-36};
 if(wall==='A'){glass.x=+m.x+24;glass.w=Math.max(80,+m.w-48);glass.y=+m.y-16;glass.d=10}else{glass.y=+m.y+24;glass.d=Math.max(80,+m.d-48);glass.x=wall==='B'?+m.x+ +m.w+6:+m.x-16;glass.w=10}
 const oven=meshBox(room,glass,darkMat.clone(),hardwareGroup,'oven-3d',m.id);oven.material.userData.owned=true;oven.userData.visualizationProxy=true;
 const addTrim=s=>{const q=meshBox(room,s,trimMat.clone(),hardwareGroup,'oven-frame',m.id);q.material.userData.owned=true;q.userData.visualizationProxy=true};
 if(wall==='A'){
   const fy=+m.y-19,W=Math.max(100,+m.w-16);
   addTrim({x:+m.x+8,y:fy,z:ovenZ,w:W,d:5,h:18});addTrim({x:+m.x+8,y:fy,z:ovenZ+openingH-18,w:W,d:5,h:18});
   addTrim({x:+m.x+8,y:fy,z:ovenZ+18,w:18,d:5,h:openingH-36});addTrim({x:+m.x+ +m.w-26,y:fy,z:ovenZ+18,w:18,d:5,h:openingH-36});
 }else{
   const fx=wall==='B'?+m.x+ +m.w+9:+m.x-19,D=Math.max(100,+m.d-16);
   addTrim({x:fx,y:+m.y+8,z:ovenZ,w:5,d:D,h:18});addTrim({x:fx,y:+m.y+8,z:ovenZ+openingH-18,w:5,d:D,h:18});
   addTrim({x:fx,y:+m.y+8,z:ovenZ+18,w:5,d:18,h:openingH-36});addTrim({x:fx,y:+m.y+ +m.d-26,z:ovenZ+18,w:5,d:18,h:openingH-36});
 }
 const p=center(room,glass),fv=frontVector(wall);p.y+=openingH*.34;p.add(fv.clone().multiplyScalar(24));const handle=addHandleBar(p,false);handle.scale.set(.78,.78,.78);handle.userData.visualization='OVEN_HANDLE';
 frontMat.dispose();trimMat.dispose();
}

function addBaseOvenAssembly(room,m,darkMat,steelMat){
 const frontMat=ownMat({color:colors().front,roughness:.5}),gap=Math.max(0,Number(m.oven_technical_gap_mm)||3),drawerFacadeH=Math.max(0,Number(m.oven_drawer_facade_height_mm)||0),ovenH=Math.max(300,Number(m.oven_appliance_height_mm)||600);
 if(drawerFacadeH>=70){
   const drawerModule={...m,id:m.id+'-oven-drawer',kind:'DRAWERS',z:+m.z,h:drawerFacadeH,drawer_count:1};
   makeFront(room,drawerModule,0,1,frontMat.clone());
 }
 const wall=m.wall||'A',ovenZ=+m.z+drawerFacadeH+gap;
 let glass={...m,z:ovenZ+16,h:Math.max(220,ovenH-32)};
 if(wall==='A'){glass.x=+m.x+22;glass.w=Math.max(80,+m.w-44);glass.y=+m.y-15;glass.d=10}
 else{glass.y=+m.y+22;glass.d=Math.max(80,+m.d-44);glass.x=wall==='B'?+m.x+ +m.w+5:+m.x-15;glass.w=10}
 const oven=meshBox(room,glass,darkMat.clone(),hardwareGroup,'oven-3d',m.id);oven.material.userData.owned=true;oven.userData.visualizationProxy=true;
 const p=center(room,glass),fv=frontVector(wall);p.y+=Math.max(80,ovenH*.34);p.add(fv.clone().multiplyScalar(24));const handle=addHandleBar(p,false);handle.scale.set(.78,.78,.78);handle.userData.visualization='OVEN_HANDLE';
 const controlMat=steelMat.clone();controlMat.userData.owned=true;
 let panel={...glass,z:ovenZ+ovenH-92,h:72};
 if(wall==='A'){panel.x=+m.x+16;panel.w=Math.max(80,+m.w-32);panel.y=+m.y-17;panel.d=6}
 else{panel.y=+m.y+16;panel.d=Math.max(80,+m.d-32);panel.x=wall==='B'?+m.x+ +m.w+7:+m.x-17;panel.w=6}
 const cp=meshBox(room,panel,controlMat,hardwareGroup,'oven-control-panel',m.id);cp.userData.visualizationProxy=true;
 frontMat.dispose();
}
function addDishwasherFacade(room,m,mat){
 if(m.freestanding)return;
 const wall=m.wall||'A',spec={...m},id=(m.id||'dishwasher')+':FRONT';
 if(wall==='A'){spec.x=+m.x+1;spec.w=Math.max(20,+m.w-2);spec.d=8;spec.y=+m.y-9}
 else{spec.y=+m.y+1;spec.d=Math.max(20,+m.d-2);spec.w=8;spec.x=wall==='B'?+m.x+ +m.w+1:+m.x-9}
 const mesh=meshBox(room,spec,mat,furnitureGroup,'dishwasher-front',m.id);mesh.userData.movableId=id;selectable.push(mesh);
 const pivot=new THREE.Group(),world=mesh.position.clone();furnitureGroup.add(pivot);
 pivot.position.set(world.x,world.y-spec.h/2,world.z);pivot.attach(mesh);pivot.userData={movableId:id,type:'dishwasher',moduleId:m.id,wall};
 const mover={id,type:'dishwasher',pivot,mesh,wall,target:openState.get(id)?1:0,current:openState.get(id)?1:0};movables.push(mover);
 const fv=frontVector(wall),p=center(room,spec);p.y+=spec.h/2-40;p.add(fv.clone().multiplyScalar(18));
 const h=addHandleBar(p,false,hardwareGroup,wall);h.userData.movableId=id;pivot.attach(h);
}
function addHoodVisual(room,m,steelMat,darkMat){
 const wall=m.wall||'A',builtIn=m.hood_type!=='FREESTANDING',x=+m.x,y=+m.y,z=+m.z,W=+m.w,D=+m.d,H=+m.h;
 const stages=builtIn?[
   {w:.88,d:.82,h:80,z:35},{w:.68,d:.78,h:80,z:115},{w:.48,d:.74,h:80,z:195}
 ]:[
   {w:.96,d:.88,h:100,z:-130},{w:.72,d:.80,h:100,z:-30},{w:.50,d:.72,h:100,z:70}
 ];
 stages.forEach((s,i)=>{
   let p;if(wall==='A')p={x:x+(W-W*s.w)/2,y:y+(D-D*s.d)/2,z:z+s.z,w:W*s.w,d:D*s.d,h:s.h};
   else p={x:x+(W-W*s.d)/2,y:y+(D-D*s.w)/2,z:z+s.z,w:W*s.d,d:D*s.w,h:s.h};
   const q=meshBox(room,p,(i===0?darkMat:steelMat).clone(),hardwareGroup,'hood-body',m.id);q.material.userData.owned=true;q.userData.visualizationProxy=true;
 });
 const pipeH=Math.max(120,H-(builtIn?300:180)),pipeZ=z+(builtIn?275:150);
 const pipeMat=steelMat.clone();pipeMat.userData.owned=true;
 const pipe=new THREE.Mesh(new THREE.CylinderGeometry(48,48,pipeH,20),pipeMat);
 const runCenter=wall==='A'?roomToWorld(room,x+W/2,y+D*.55,pipeZ+pipeH/2):roomToWorld(room,x+W*.5,y+D/2,pipeZ+pipeH/2);
 pipe.position.copy(runCenter);pipe.userData={cat:'hood-duct',moduleId:m.id,visualizationProxy:true};hardwareGroup.add(pipe);
}
function addAppliance(room,m){
 const c=colors(),steel=ownMat({color:'#9ea3a6',roughness:.28,metalness:.68}),dark=ownMat({color:'#17191b',roughness:.12,metalness:.18}),wall=m.wall||'A';
 const front=frontVector(wall);
 if(m.kind==='FRIDGE'&&m.freestanding){const main={...m};const mm=meshBox(room,main,steel.clone(),furnitureGroup,'appliance',m.id);mm.material.userData.owned=true;selectable.push(mm)}
 if(m.kind==='DISHWASHER'){
   const inner={...m};if((m.wall||'A')==='A'){inner.x=+m.x+18;inner.w=Math.max(80,+m.w-36);inner.y=+m.y+18;inner.d=Math.max(100,+m.d-36)}else{inner.x=+m.x+18;inner.w=Math.max(100,+m.w-36);inner.y=+m.y+18;inner.d=Math.max(80,+m.d-36)}
   const mm=meshBox(room,inner,steel.clone(),furnitureGroup,'dishwasher-appliance',m.id);mm.material.userData.owned=true;mm.userData.visualizationProxy=true;selectable.push(mm);
   addDishwasherFacade(room,m,ownMat({color:colors().front,roughness:.5}));
 }
 if(m.kind==='COOKTOP'){
   const top={...m,z:+m.z+ +m.h+39,h:8,x:+m.x+(+m.w)*.08,w:(+m.w)*.84,y:+m.y+(+m.d)*.15,d:(+m.d)*.7};
   const plate=meshBox(room,top,dark.clone(),hardwareGroup,'cooktop',m.id);plate.material.userData.owned=true;plate.userData.productionProxy=false;
   const center=plate.position.clone(),rw=Math.max(45,(+top.w)*.13),rd=Math.max(45,(+top.d)*.16);
   [[-.24,-.22],[.24,-.22],[-.24,.22],[.24,.22]].forEach(([ax,az])=>{
     const ring=new THREE.Mesh(new THREE.TorusGeometry(Math.min(rw,rd),3,8,24),ownMat({color:'#777',roughness:.3,metalness:.55}));
     ring.rotation.x=Math.PI/2;ring.position.set(center.x+ax*(+top.w),center.y+7,center.z+az*(+top.d));hardwareGroup.add(ring);
   });
 }
 if(m.kind==='SINK'){
   // Recognisable visualization proxy only; no production cutout is inferred from this mesh.
   const W=(+m.w)*.64,D=(+m.d)*.54,X=+m.x+(+m.w-W)/2,Y=+m.y+(+m.d-D)/2,Z=+m.z+ +m.h+39, rim=16;
   const parts=[
     {x:X,y:Y,z:Z,w:W,d:rim,h:10},{x:X,y:Y+D-rim,z:Z,w:W,d:rim,h:10},
     {x:X,y:Y+rim,z:Z,w:rim,d:D-2*rim,h:10},{x:X+W-rim,y:Y+rim,z:Z,w:rim,d:D-2*rim,h:10}
   ];
   parts.forEach(p=>{const q=meshBox(room,p,steel.clone(),hardwareGroup,'sink-proxy',m.id);q.material.userData.owned=true;q.userData.visualizationProxy=true});
   const basin={x:X+rim,y:Y+rim,z:Z-105,w:W-2*rim,d:D-2*rim,h:105};const b=meshBox(room,basin,ownMat({color:'#777d80',roughness:.34,metalness:.55}),hardwareGroup,'sink-proxy',m.id);b.userData.visualizationProxy=true;
   // Faucet is a visualization proxy too: it never implies machining, cutout or BOM.
   const faucetMat=ownMat({color:'#aab0b3',roughness:.22,metalness:.78});
   const stem=new THREE.Mesh(new THREE.CylinderGeometry(10,12,190,16),faucetMat.clone());stem.material.userData.owned=true;stem.position.copy(roomToWorld(room,X+W*.72,Y+D*.84,Z+95));stem.userData={cat:'faucet-proxy',visualizationProxy:true};hardwareGroup.add(stem);
   const spout=new THREE.Mesh(new THREE.CylinderGeometry(8,8,150,14),faucetMat.clone());spout.material.userData.owned=true;spout.rotation.x=Math.PI/2;spout.position.copy(roomToWorld(room,X+W*.72,Y+D*.70,Z+172));spout.userData={cat:'faucet-proxy',visualizationProxy:true};hardwareGroup.add(spout);faucetMat.dispose();
 }
 if(m.kind==='COOKTOP'&&m.oven_appliance_present)addBaseOvenAssembly(room,m,dark,steel);
 if(m.kind==='TALL_OVEN')addTallOvenVisual(room,m,dark,steel);
 if(m.kind==='UPPER_HOOD')addHoodVisual(room,m,steel,dark)
 steel.dispose();dark.dispose();
}

function addEndPanels(room,m,bodyMat,frontMat){
 const edges=Array.isArray(m.end_panel_edges)?m.end_panel_edges:[];if(!edges.length||m.kind==='FRIDGE')return;
 const wall=m.wall||'A',t=Math.max(8,Number(m.end_panel_width_mm)||18),mat=(m.end_panel_material==='FACADE'?frontMat:bodyMat);
 edges.forEach(edge=>{
   let p;
   if(wall==='A')p={x:edge==='START'?+m.x:+m.x+ +m.w-t,y:+m.y-9,z:+m.z,w:t,d:+m.d+9,h:+m.h};
   else{const frontX=wall==='B'?+m.x:+m.x-9,depth=+m.w+9;p={x:frontX,y:edge==='START'?+m.y:+m.y+ +m.d-t,z:+m.z,w:depth,d:t,h:+m.h}}
   const q=meshBox(room,p,mat.clone(),furnitureGroup,'end-panel',m.id);q.material.userData.owned=true;q.userData.frontFlush=true;
 });
}

function lowerRuns(modules){const out=[];['A','B','C'].forEach(wall=>{const list=modules.filter(m=>(m.wall||'A')===wall&&m.level!=='upper'&&!m.tall&&!m.freestanding&&m.kind!=='FILLER').sort((a,b)=>wall==='A'?(+a.x-+b.x):(+a.y-+b.y));if(list.length)out.push([wall,list])});return out}
function plinthRuns(modules){
 const out=[];['A','B','C'].forEach(wall=>{
   const list=modules.filter(m=>(m.wall||'A')===wall&&((m.kind==='FILLER'&&m.level!=='upper'&&!m.freestanding&&Number(m.z)>0)||(window.BizetR10Rules?.requiresCommonPlinth?.(m)??(m.level!=='upper'&&!m.freestanding&&m.kind!=='FILLER')))).sort((a,b)=>wall==='A'?(+a.x-+b.x):(+a.y-+b.y));
   if(list.length)out.push([wall,list]);
 });return out;
}
// R10.5.6: exact front-face plinth opening from constructive sub-panels.
// PART roles persist in the renderer and can be handed to a verified CNC adapter later.
function addFloorPlinth(room,m,material){
 const recess=plinthRecess(),wall=m.wall||'A',ph=Math.max(60,Number(m.z)||100);
 const run=wall==='A'?Number(m.w):Number(m.d);
 const opening=['FRIDGE','TALL_OVEN'].includes(m.kind)&&!m.freestanding;
 const cutW=460,cutH=60,th=12;
 const origin=wall==='A'?{x:+m.x,y:+m.y+recess}:
   {x:wall==='B'?+m.x+ +m.w-recess-th:+m.x+recess,y:+m.y};
 function panel(start,length,bottom,height,role){
   if(length<=.01||height<=.01)return;
   const spec=wall==='A'
     ?{x:origin.x+start,y:origin.y,z:bottom,w:length,d:th,h:height}
     :{x:origin.x,y:origin.y+start,z:bottom,w:th,d:length,h:height};
   const box=meshBox(room,spec,material.clone(),furnitureGroup,'plinth','PLINTH-'+m.id);
   box.material.userData.owned=true;box.userData.recess_mm=recess;box.userData.partRole=role;
   box.userData.nominalSource='BIZET_PLINTH_SUBPART';
 }
 if(!opening){panel(0,run,0,ph,'PLINTH_FULL');return}
 if(run<cutW+20||ph<cutH+8){
   console.warn('R10.5.6 PLINTH_GRILLE_NO_SPACE: STOP geometry',m.id,run,ph);
   window.dispatchEvent(new CustomEvent('bizet:engineering-stop',{detail:{module_id:m.id,reason:'PLINTH_GRILLE_NO_SPACE'}}));
   panel(0,run,0,ph,'PLINTH_UNCUT_REQUIRES_REVIEW');return;
 }
 const left=(run-cutW)/2,lower=(ph-cutH)/2;
 panel(0,left,0,ph,'PLINTH_GRILLE_LEFT');
 panel(left+cutW,run-left-cutW,0,ph,'PLINTH_GRILLE_RIGHT');
 panel(left,cutW,0,lower,'PLINTH_GRILLE_BELOW');
 panel(left,cutW,lower+cutH,ph-lower-cutH,'PLINTH_GRILLE_ABOVE');
 m.plinth_grille_cutout_mm={width:cutW,height:cutH,run_center_mm:run/2,z_center_mm:ph/2,
    wall,center_module_id:m.id,manufacturing_status:'UNVERIFIED_CUTOUT_ADAPTER'};
 // Dark recessed louvers are physical meshes in the opening, NOT a covering black rectangle.
 const gm=ownMat({color:'#111315',roughness:.81,metalness:.06});
 for(let index=0;index<4;index++){
   const h=5,zz=lower+7+index*13,spec=wall==='A'
     ?{x:+m.x+left+5,y:origin.y+th+3,z:zz,w:cutW-10,d:4,h}
     :{x:wall==='B'?origin.x-7:origin.x+th+3,y:+m.y+left+5,z:zz,w:4,d:cutW-10,h};
   const bar=meshBox(room,spec,gm.clone(),hardwareGroup,'grille-louver',m.id);
   bar.material.userData.owned=true;bar.userData.visualizationProxy=true;
 }
 gm.dispose();
}
function addPlinthEndReturns(room,wall,list,material){
 // #30: finish every visible plinth end by returning to the back wall / end panel.
 // A return is an actual panel mesh, never a hidden "floating" surface.
 const sorted=[...list].sort((a,b)=>wall==='A'?(+a.x-+b.x):(+a.y-+b.y));
 const ends=[{module:sorted[0],end:'START'},{module:sorted.at(-1),end:'END'}];
 const recess=plinthRecess(),th=12;
 ends.forEach(({module:m,end})=>{
   const ph=Math.max(60,+m.z||100);
   let spec;
   if(wall==='A'){
     const xx=end==='START'?+m.x:+m.x+ +m.w-th;
     spec={x:xx,y:+m.y+recess,z:0,w:th,d:Math.max(12,+m.d-recess),h:ph};
   }else{
     const yy=end==='START'?+m.y:+m.y+ +m.d-th;
     const front=wall==='B'?+m.x+ +m.w:+m.x;
     const start=wall==='B'?+m.x:front+recess;
     spec={x:start,y:yy,z:0,w:Math.max(12,+m.w-recess),d:th,h:ph};
   }
   const q=meshBox(room,spec,material.clone(),furnitureGroup,'plinth-end-return','PLINTH-RETURN-'+wall+'-'+end);
   q.material.userData.owned=true;q.userData.partRole='PLINTH_END_RETURN';q.userData.visualizationProxy=false;
 });
}
function segmentBy4100(wall,list){
 const plan=window.BizetR10Rules?.worktopRunPlan?.(list,{enforceCriticalZones:true});
 if(plan?.segments?.length){
   const pos=m=>wall==='A'?+m.x:+m.y,run=m=>wall==='A'?+m.w:+m.d;
   return plan.segments.map(seg=>list.filter(m=>{
     const s=pos(m),e=s+run(m);return s>=seg.start-.5&&e<=seg.end+.5
   })).filter(seg=>seg.length);
 }
 const out=[];let i=0,pos=m=>wall==='A'?+m.x:+m.y,run=m=>wall==='A'?+m.w:+m.d;
 while(i<list.length){const start=pos(list[i]);let best=i;for(let j=i;j<list.length;j++){const end=pos(list[j])+run(list[j]);if(end-start<=4100+.001)best=j;else break}out.push(list.slice(i,best+1));i=best+1}
 return out;
}
function r1056SubtractRect(a,b){
 const left=Math.max(a.x,b.x),right=Math.min(a.x+a.w,b.x+b.w),
   front=Math.max(a.y,b.y),back=Math.min(a.y+a.d,b.y+b.d);
 if(right-left<=.4||back-front<=.4)return[a];
 const out=[],push=(x,y,w,d)=>{if(w>1&&d>1)out.push({...a,x,y,w,d})};
 push(a.x,a.y,a.w,front-a.y);
 push(a.x,back,a.w,a.y+a.d-back);
 push(a.x,front,left-a.x,back-front);
 push(right,front,a.x+a.w-right,back-front);
 return out;
}
function r1056WorktopMesh(room,spec,mat,occupied,id){
 let pieces=[spec];
 for(const previous of occupied)pieces=pieces.flatMap(p=>r1056SubtractRect(p,previous));
 pieces.forEach((p,i)=>{
   const mesh=meshBox(room,p,mat.clone(),furnitureGroup,'worktop','WORKTOP-'+id+'-'+i);
   mesh.material.userData.owned=true;mesh.userData.partRole='VISUAL_WORKTOP_CLIP';
 });
 occupied.push(...pieces.map(({x,y,w,d})=>({x,y,w,d})));
 if(pieces.length!==1||Math.abs(pieces[0].w-spec.w)>.4||Math.abs(pieces[0].d-spec.d)>.4){
   window.BizetR1056WorktopClips=(window.BizetR1056WorktopClips||0)+1;
   window.dispatchEvent(new CustomEvent('bizet:engineering-stop',
     {detail:{reason:'WORKTOP_CORNER_TRIM_REQUIRES_APPROVED_PART_GEOMETRY',subject:id}}));
 }
}
function addWorktopAndPlinth(room,modules){
 const c=colors(),wm=ownMat({color:c.worktop,roughness:.42}),pm=ownMat({color:c.body,roughness:.6}),seamMat=ownMat({color:'#292929',roughness:.75}),recess=plinthRecess(),wt=worktopThickness();
 const worktopOccupied=[];window.BizetR1056WorktopClips=0;
 r1056MaterialTexture(wm,'worktop',c.worktop);r1056MaterialTexture(pm,'carcass',c.body);
 lowerRuns(modules).forEach(([wall,list])=>{
   const segments=segmentBy4100(wall,list);
   segments.forEach((seg,si)=>{const first=seg[0],last=seg.at(-1),topZ=Math.max(...seg.map(m=>+m.z+ +m.h))+1;
     if(wall==='A'){
       const x=+first.x-2,w=(+last.x+ +last.w)-+first.x+4,y=Math.min(room.depthMm-600,Math.min(...seg.map(m=>+m.y))-40),d=Math.max(room.depthMm,...seg.map(m=>+m.y+ +m.d))-y;
       r1056WorktopMesh(room,{x,y,z:topZ,w,d,h:wt},wm,worktopOccupied,wall+'-'+si);
       if(si>0){const seamX=+first.x;const seam=meshBox(room,{x:seamX-1.5,y,z:topZ+wt,w:3,d,h:1.6},seamMat.clone(),hardwareGroup,'worktop-seam','SEAM-'+wall+'-'+si);seam.material.userData.owned=true}
       seg.forEach(m=>{const ph=Math.max(60,+m.z||100),pl=meshBox(room,{x:+m.x,y:+m.y+recess,z:0,w:+m.w,d:12,h:ph},pm.clone(),furnitureGroup,'plinth','PLINTH-'+m.id);pl.material.userData.owned=true;pl.userData.recess_mm=recess});
     }else{
       const y=+first.y-2,d=(+last.y+ +last.d)-+first.y+4,x=wall==='B'?0:Math.min(...seg.map(m=>+m.x))-40,w=wall==='B'?Math.max(600,Math.max(...seg.map(m=>+m.x+ +m.w))-x):Math.max(room.lengthMm,...seg.map(m=>+m.x+ +m.w))-x;
       r1056WorktopMesh(room,{x,y,z:topZ,w,d,h:wt},wm,worktopOccupied,wall+'-'+si);
       if(si>0){const seamY=+first.y;const seam=meshBox(room,{x,y:seamY-1.5,z:topZ+wt,w,d:3,h:1.6},seamMat.clone(),hardwareGroup,'worktop-seam','SEAM-'+wall+'-'+si);seam.material.userData.owned=true}
       seg.forEach(m=>{const ph=Math.max(60,+m.z||100),front=wall==='B'?+m.x+ +m.w:+m.x,px=wall==='B'?front-recess-12:front+recess,pl=meshBox(room,{x:px,y:+m.y,z:0,w:12,d:+m.d,h:ph},pm.clone(),furnitureGroup,'plinth','PLINTH-'+m.id);pl.material.userData.owned=true;pl.userData.recess_mm=recess});
     }
   });
 });
 // Tall floor modules, including the built-in fridge, have continuous frontage on the same recess.
 plinthRuns(modules).forEach(([wall,list])=>{
   list.filter(m=>m.tall||m.kind==='FILLER').forEach(m=>addFloorPlinth(room,m,pm)); // reach wall through filler run
   addPlinthEndReturns(room,wall,list,pm);
 });
 plinthRuns(modules).forEach(([wall,list])=>{
   const plan=window.BizetR10Rules?.plinthRunPlan?.(list);if(!plan?.joints?.length)return;
   plan.joints.forEach((joint,i)=>{
     const first=list[0],ph=Math.max(60,...list.map(m=>+m.z||100));
     let seam;
     if(wall==='A')seam={x:joint-1.5,y:+first.y+recess-1,z:0,w:3,d:14,h:ph};
     else{const front=wall==='B'?+first.x+ +first.w:+first.x,px=wall==='B'?front-recess-13:front+recess-1;seam={x:px,y:joint-1.5,z:0,w:14,d:3,h:ph}}
     const s=meshBox(room,seam,seamMat.clone(),hardwareGroup,'plinth-seam','PLINTH-SEAM-'+wall+'-'+i);s.material.userData.owned=true;s.renderOrder=9;
   });
 });
 wm.dispose();pm.dispose();seamMat.dispose();
}

function textSprite(text,scale=2.4){const c=document.createElement('canvas');c.width=420;c.height=120;const x=c.getContext('2d');x.fillStyle='rgba(255,255,252,.96)';x.beginPath();x.roundRect?.(6,12,408,96,22);x.fill();x.fillStyle='#111';x.font='800 42px -apple-system,BlinkMacSystemFont,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(text),210,60);const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});mat.userData.owned=true;const s=new THREE.Sprite(mat);s.scale.set(420*scale,120*scale,1);return s}
function addNumber(room,m){const s=textSprite(m.number,.62),p=center(room,m);p.y+=+m.h*.12;if((m.wall||'A')==='A')p.z-=+m.d/2+90;else p.x+=(m.wall==='B'?1:-1)*(+m.w/2+90);s.position.copy(p);annotationGroup.add(s)}
function addDimension(room,a,b,label,pos,focus=false){const g=new THREE.BufferGeometry().setFromPoints([roomToWorld(room,...a),roomToWorld(room,...b)]),mat=new THREE.LineBasicMaterial({color:0x161616,transparent:true,opacity:.9});mat.userData.owned=true;annotationGroup.add(new THREE.Line(g,mat));const s=textSprite(label,focus?2.8:2.35);s.position.copy(roomToWorld(room,...pos));annotationGroup.add(s)}
// 10.5.5 #24: standard opaque, depth-tested physical profile + diffuser,
// behind the closed facade; never additive foreground billboards.
function lightingRgb(k){
 return k===2700?'#ffce91':k===4000?'#f3f5ff':'#ffe1b2';
}
// Controlled near-source light falloff from selected Kelvin to full transparency.
// Diffuser and glow remain inside the carcass and obey depth testing.
const r1056GlowTextures=new Map();
function makeR1056Glow(kelvin,reverse=false){
 const key=kelvin+'_'+reverse;if(r1056GlowTextures.has(key))return r1056GlowTextures.get(key);
 const c=document.createElement('canvas');c.width=256;c.height=32;const x=c.getContext('2d');
 const hex=lightingRgb(kelvin),r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
 const gradient=x.createLinearGradient(reverse?256:0,0,reverse?0:256,0);
 gradient.addColorStop(0,'rgba('+r+','+g+','+b+',0.52)');
 gradient.addColorStop(.35,'rgba('+r+','+g+','+b+',0.20)');
 gradient.addColorStop(1,'rgba('+r+','+g+','+b+',0)');
 x.fillStyle=gradient;x.fillRect(0,0,256,32);
 const texture=new THREE.CanvasTexture(c);texture.encoding=THREE.sRGBEncoding;
 r1056GlowTextures.set(key,texture);return texture;
}
function addR1056Glow(room,spec,module,kelvin,partKey){
 const wall=module.wall||'A',reverse=String(module.facade_openings?.[0]||'LEFT').toUpperCase()==='RIGHT';
 const glowLength=Math.max(70,Math.min(180,(wall==='A'?+module.w:+module.d)*.42));
 const height=Math.max(20,spec.h-10);
 const mat=new THREE.MeshBasicMaterial({map:makeR1056Glow(kelvin,reverse),transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
 mat.userData.owned=true;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(glowLength,height),mat);
 const start=wall==='A'?+spec.x:+spec.y;
 const runCenter=start+(reverse?-glowLength/2:glowLength/2);
 const pos=wall==='A'
   ?roomToWorld(room,runCenter,+module.y+(+module.d)/2, +spec.z+spec.h/2)
   :roomToWorld(room,+module.x+(+module.w)/2,runCenter,+spec.z+spec.h/2);
 mesh.position.copy(pos);if(wall!=='A')mesh.rotation.y=Math.PI/2;
 mesh.userData={cat:'led-gradient',moduleId:module.id,partRole:'R1056_KELVIN_GLOW_'+partKey,visualizationProxy:true,productionProxy:false};
 lightingGroup.add(mesh);
}
function addInternalLED(room,spec,module,kelvin,partKey){
 const led=ownMat({color:lightingRgb(kelvin),emissive:lightingRgb(kelvin),emissiveIntensity:.65,roughness:.48,metalness:0,depthTest:true,depthWrite:true});
 const aluminum=ownMat({color:'#899094',roughness:.4,metalness:.6,depthTest:true,depthWrite:true});
 const q=meshBox(room,spec,aluminum,lightingGroup,'led-profile',module.id);q.userData.visualizationProxy=true;q.userData.partRole='LED_PROFILE_'+partKey;
 const line={...spec};
 if(module.wall==='A'){line.x+=3;line.w=Math.max(3,line.w-6);line.d=4;line.y+=3}
 else{line.y+=3;line.d=Math.max(3,line.d-6);line.w=4;line.x+=3}
 const l=meshBox(room,line,led,lightingGroup,'led-diffuser',module.id);l.userData.visualizationProxy=true;l.userData.kelvin=kelvin;l.userData.partRole='LED_DIFFUSER_'+partKey;
 addR1056Glow(room,spec,module,kelvin,partKey);
}
function buildLighting(room,mods){
 clearGroup(lightingGroup);
 const I=viewerInputs();if(I.lighting_enabled!=='YES')return;
 const kelvin=[2700,3000,4000].includes(Number(I.lighting_kelvin))?Number(I.lighting_kelvin):3000;
 mods.forEach(m=>{
   if(m.kind==='FILLER'||m.freestanding||m.kind==='DISHWASHER')return;
   const wall=m.wall||'A',upper=m.level==='upper',lower=!upper&&!m.tall;
   if(!((upper&&I.lighting_upper_inside==='YES')||(lower&&I.lighting_lower_inside==='YES')))return;
   const t=18,base=Number(m.z)||0,H=Number(m.h)||0;if(H<95)return;
   const front=String(m.facade_openings?.[0]||'LEFT').toUpperCase()==='RIGHT'?'RIGHT':'LEFT';
   const count=Math.max(0,Math.min(5,Number(m.shelf_count??(upper?1:1))||0));
   const boundaries=[base+t+15],stops=[];
   for(let index=1;index<=count;index++){
     const center=window.BizetR10Rules?.fixedShelfCenters?.(m)?.[index-1]??(base+t+(H-2*t)*index/(count+1));
     stops.push([center-12,center+12]); // shelf must not intersect LED profile
   }
   const end=base+H-t-15,intervals=[];
   let cur=boundaries[0];stops.forEach(([a,b])=>{if(a-cur>=35)intervals.push([cur,a]);cur=Math.max(cur,b)});
   if(end-cur>=35)intervals.push([cur,end]);
   intervals.forEach(([lo,hi],index)=>{
     const height=hi-lo,run=wall==='A'?+m.w:+m.d,place=front==='LEFT'?t+8:run-t-20;
     const spec=wall==='A'?{x:+m.x+place,y:+m.y+(+m.d)/2-7,z:lo,w:12,d:14,h:height}
       :{x:+m.x+(+m.w)/2-7,y:+m.y+place,z:lo,w:14,d:12,h:height};
     addInternalLED(room,spec,m,kelvin,index);
   });
 });
}
function addR1056CornerFalseFront(room,m,frontMaterial){
 // Geometry-visible 40 mm return where the perpendicular wall run meets wall A.
 // Pilot only: section/profile needs owner's drawing before production machining.
 if(!['B','C'].includes(m.wall)||m.level==='upper'&&m.kind==='UPPER_TOP'||m.corner_edge!=='START')return;
 const t=18,returnLength=40,front=m.wall==='B'?+m.x+ +m.w:+m.x;
 const spec={x:m.wall==='B'?front-returnLength:front,y:+m.y+ +m.d-t,z:+m.z,
   w:returnLength,d:t,h:+m.h};
 const strip=meshBox(room,spec,frontMaterial.clone(),furnitureGroup,'corner-false-front',m.id);
 strip.material.userData.owned=true;strip.userData.partRole='CORNER_PERPENDICULAR_FALSE_40';
 strip.userData.visualizationProxy=true;strip.userData.manufacturingStatus='OWNER_PROFILE_DRAWING_OPEN';
}
function buildFurniture(options){clearGroup(furnitureGroup);clearGroup(hardwareGroup);clearGroup(annotationGroup);clearGroup(lightingGroup);selectable=[];movables=[];const room=options.room||{},mods=options.modules||[],c=colors(),body=ownMat({color:c.body,roughness:.58}),front=ownMat({color:c.front,roughness:.5}),focus=!!options.focusMode;
 r1056MaterialTexture(body,'carcass',c.body);r1056MaterialTexture(front,'facade',c.front);
 const buildOne=m=>{
   if(m.kind==='FRIDGE'&&!m.freestanding){
     addBuiltInFridge(room,m,body,front);addLegs(room,m);addFridgeHinges(room,m);
     if(focus)addFloorPlinth(room,m,body);
     addEndPanels(room,m,body,front);if(options.showNumbers!==false&&!focus)addNumber(room,m);return
   }
   if(m.kind==='FRIDGE'&&m.freestanding){addAppliance(room,m);if(options.showNumbers!==false&&!focus)addNumber(room,m);return}
   if(m.kind==='DISHWASHER'){addAppliance(room,m);if(options.showNumbers!==false&&!focus)addNumber(room,m);return}
   if(m.kind==='UPPER_HOOD'&&m.hood_type==='FREESTANDING'){addAppliance(room,m);if(options.showNumbers!==false&&!focus)addNumber(room,m);return}
   const shellParts=addCarcass(room,m,body)||[];
   shellParts.forEach(part=>{if(part?.userData?.cat==='carcass-part')selectable.push(part)});
   if(m.kind==='UPPER_DRYER')addDishDryingRack(room,m);
   const count=Math.max(1,Math.min(5,Number(m.kind==='DRAWERS'?m.drawer_count:m.facade_count)||1));
   const localFront=front.clone();localFront.userData.owned=true;
   if(focus){localFront.transparent=true;localFront.opacity=.58;localFront.depthWrite=false}
   if(!m.freestanding&&!['COOKTOP','TALL_OVEN'].includes(m.kind))for(let i=0;i<count;i++)makeFront(room,m,i,count,localFront.clone());
   localFront.dispose();
   addLegs(room,m);
   if(focus&&m.tall&&window.BizetR10Rules?.requiresCommonPlinth?.(m))addFloorPlinth(room,m,body);
   addHinges(room,m,count);addLiftHardware(room,m);addEndPanels(room,m,body,front);addR1056CornerFalseFront(room,m,front);addAppliance(room,m);
   if(options.showNumbers!==false&&!focus)addNumber(room,m);
 };
 mods.forEach(buildOne);
 if(!focus){addWorktopAndPlinth(room,mods)}
 buildLighting(room,mods); // hidden behind solid front in VIEW, exposed in isolation
 lightingGroup.visible=r1056LightingVisible;
 if(options.showDimensions!==false){if(focus&&mods[0]){const m=mods[0],safe=360;addDimension(room,[m.x,+m.y+ +m.d+safe,m.z+m.h+100],[+m.x+ +m.w,+m.y+ +m.d+safe,+m.z+ +m.h+100],Math.round(+m.w)+' mm',[+m.x+ +m.w/2,+m.y+ +m.d+safe+140,+m.z+ +m.h+220],true);addDimension(room,[+m.x+ +m.w+safe,+m.y+ +m.d+120,m.z],[+m.x+ +m.w+safe,+m.y+ +m.d+120,+m.z+ +m.h],Math.round(+m.h)+' mm',[+m.x+ +m.w+safe+160,+m.y+ +m.d+120,+m.z+ +m.h/2],true)}
 else{const L=+room.lengthMm||6000,D=+room.depthMm||4200,H=+room.heightMm||2800,safe=520;addDimension(room,[0,D+safe,80],[L,D+safe,80],Math.round(L)+' mm',[L/2,D+safe+180,180]);addDimension(room,[L+safe,D+safe*.35,0],[L+safe,D+safe*.35,H],Math.round(H)+' mm',[L+safe+200,D+safe*.35,H/2])}}
 body.dispose();front.dispose();
}
function frame(options,force=false){const room=options.room||{},mods=options.modules||[],mode=options.focusMode?'focus':'normal',key=[room.lengthMm,room.depthMm,room.heightMm,mode,options.focusMode?mods.map(m=>[m.id,m.w,m.d,m.h].join('/')).join('|'):''].join(':');if(!force&&lastMode===mode&&lastRoomKey===key)return;lastMode=mode;lastRoomKey=key;if(!mods.length)return;const minX=Math.min(...mods.map(m=>+m.x||0)),maxX=Math.max(...mods.map(m=>(+m.x||0)+(+m.w||0))),minY=Math.min(...mods.map(m=>+m.y||0)),maxY=Math.max(...mods.map(m=>(+m.y||0)+(+m.d||0))),minZ=Math.min(...mods.map(m=>+m.z||0)),maxZ=Math.max(...mods.map(m=>(+m.z||0)+(+m.h||0))),ct=roomToWorld(room,(minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2),span=Math.max(maxX-minX,maxY-minY,maxZ-minZ,1200),dist=options.focusMode?Math.max(1500,span*1.55):Math.max(2600,span*1.25);controls.target.copy(ct);camera.position.set(ct.x+dist*.78,ct.y+dist*.38,ct.z-dist*.96);camera.updateProjectionMatrix();controls.update()}
function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);composer?.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();controls.update()}
new ResizeObserver(resize).observe(host);addEventListener('resize',resize);
function draw(options){
   lastOptions=options;setDeepShadow(false);buildRoom(options);buildFurniture(options);
   const spin=scanActive()?Number(window.BizetRoomR1061?.current(window.BizetModelRuntime?.getVisual?.())?.rotation_deg||0)*Math.PI/180:0;
   [roomGroup,furnitureGroup,hardwareGroup,annotationGroup,lightingGroup].forEach(group=>group.rotation.y=spin);
   frame(options,false);resize();normalCanvas.style.opacity='0';focusCanvas.style.opacity='0'
 }
// #27: the viewer only starts shelf editing after a hold in EDIT/isolation.
let shelfHoldTimer=0,shelfHoldDown=null;
renderer.domElement.addEventListener('pointerdown',e=>{
 if(window.BIZET_KITCHEN_UI_MODE!=='EDIT'||!lastOptions?.focusMode)return;
 const r=renderer.domElement.getBoundingClientRect();
 pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 const shelves=[];furnitureGroup.traverse(o=>{if(o.isMesh&&o.userData?.cat==='shelf')shelves.push(o)});
 const hit=raycaster.intersectObjects(shelves,false)[0];
 if(!hit)return;
 const role=String(hit.object.userData.partRole||''),index=Math.max(0,(Number(role.replace(/\D/g,''))||1)-1);
 shelfHoldDown={id:e.pointerId,x:e.clientX,y:e.clientY,partRole:role,moduleId:hit.object.userData.moduleId,index};
 clearTimeout(shelfHoldTimer);
 shelfHoldTimer=window.setTimeout(()=>{
   if(!shelfHoldDown)return;
   window.dispatchEvent(new CustomEvent('bizet:shelfhold',{detail:{module_id:shelfHoldDown.moduleId,shelf_index:shelfHoldDown.index}}));
   shelfHoldDown=null;
 },480);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(shelfHoldDown?.id===e.pointerId&&Math.hypot(e.clientX-shelfHoldDown.x,e.clientY-shelfHoldDown.y)>9){clearTimeout(shelfHoldTimer);shelfHoldDown=null}
});
renderer.domElement.addEventListener('pointerup',()=>{clearTimeout(shelfHoldTimer);shelfHoldDown=null});
renderer.domElement.addEventListener('pointercancel',()=>{clearTimeout(shelfHoldTimer);shelfHoldDown=null});
renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,id:e.pointerId});
renderer.domElement.addEventListener('pointercancel',()=>down=null);
renderer.domElement.addEventListener('pointerup',e=>{
 if(!down||down.id!==e.pointerId){down=null;return}
 const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>8)return;
 const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);
 const scanTargets=[];roomGroup.traverse(o=>{if(o.isMesh&&o.userData?.cat==='scan-wall-r1061')scanTargets.push(o)});
  if(window.BIZET_KITCHEN_UI_MODE==='EDIT'&&scanTargets.length){
    const hitWall=raycaster.intersectObjects(scanTargets,false)[0];
    if(hitWall){window.BizetRoomR1061?.choose(hitWall.object.userData.scanWallIndex);document.querySelector('#workspaceTools [data-panel="room"]')?.click();return}
  }
  const hit=raycaster.intersectObjects(selectable,true)[0],id=hit?.object?.userData?.movableId||hit?.object?.parent?.userData?.movableId||hit?.object?.userData?.moduleId||'';
 const moduleId=String(id).split(':')[0];
 if(window.BIZET_KITCHEN_UI_MODE==='VIEW'&&id){
   const mv=movables.find(x=>x.id===id);
   if(mv){
     const now=Date.now(),doubleTap=lastFacadeTap.id===moduleId&&now-lastFacadeTap.at<370;
     lastFacadeTap={id:moduleId,at:now};
     if(doubleTap){
       document.querySelector('#moduleStrip [data-module="'+CSS.escape(moduleId)+'"]')?.click();
       lastFacadeTap={id:'',at:0};return;
     }
     mv.target=mv.target>.5?0:1;openState.set(mv.id,mv.target>0);return;
   }
   document.querySelector('#moduleStrip [data-module="'+CSS.escape(moduleId)+'"]')?.click();return;
 }
 if(window.BIZET_KITCHEN_UI_MODE!=='VIEW'&&!lastOptions?.focusMode&&id){document.querySelector('#moduleStrip [data-module="'+CSS.escape(moduleId)+'"]')?.click()}
});
function animate(){requestAnimationFrame(animate);controls.update();movables.forEach(m=>{m.current+=(m.target-m.current)*.12;if(m.type==='door'){m.pivot.rotation.y=(m.sign??doorOpenSign(m.wall,m.side))*m.current*Math.PI*.58}else if(m.type==='lift'){if(m.pivot){if(m.wall==='A')m.pivot.rotation.x=m.current*Math.PI*.48;else m.pivot.rotation.z=(m.wall==='B'?-1:1)*m.current*Math.PI*.48}}else if(m.type==='dishwasher'){if(m.wall==='A')m.pivot.rotation.x=-m.current*Math.PI*.48;else m.pivot.rotation.z=(m.wall==='B'?-1:1)*m.current*Math.PI*.48}else if(m.type==='drawer'){const fv=frontVector(m.wall),base=m.base||new THREE.Vector3();m.group.position.copy(base).add(fv.multiplyScalar(360*m.current))}});renderer.render(scene,camera)}animate();
window.BizetPilot3D.drawKitchenScene=(canvas,options={})=>{const legacy=legacyDraw(canvas,options);try{draw(options)}catch(e){console.error('R10.5.1 kitchen WebGL fallback',e);host.style.display='none';canvas.style.opacity='1'}return legacy};
window.BizetKitchenWebGL={version:'R10.6.1',setLightingVisible:v=>{r1056LightingVisible=!!v;lightingGroup.visible=r1056LightingVisible;},isLightingVisible:()=>r1056LightingVisible,renderer,scene,camera,controls,host,composer,saoPass,redraw:()=>lastOptions&&draw(lastOptions),frame:()=>lastOptions&&frame(lastOptions,true),setDeepShadow,isDeepShadow:()=>false,setMotion:()=>{motionEnabled=true},isMotion:()=>true};
})();