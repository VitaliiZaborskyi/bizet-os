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
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.rotateSpeed=.62;controls.zoomSpeed=.82;controls.panSpeed=.68;controls.screenSpacePanning=true;controls.minDistance=800;controls.maxDistance=12000;controls.minPolarAngle=.12;controls.maxPolarAngle=1.53;controls.enableKeys=false;
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
let selectable=[],movables=[],lastOptions=null,lastMode='',lastRoomKey='',down=null,motionEnabled=true,deepShadow=false;
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
 floor:{TILE_SAND:'#d7c9ad',STONE_LIGHT:'#d1cec5',TILE_GREY:'#aeb0ae',OAK_NATURAL:'#cbb58f',OAK_SMOKED:'#8c7358',ASH_LIGHT:'#d5c29f',LAMINATE_OAK:'#b99c72',LAMINATE_GREY:'#aaa59b',LAMINATE_DARK:'#655b50',CONCRETE_WARM:'#bbb7ae',CONCRETE_GREY:'#9d9e9c',CONCRETE_LIGHT:'#d0cec8'},
 walls:{WARM_WHITE:'#e9e5db',SAND:'#d9ccb7',GREIGE:'#c9c4b9',STONE:'#bebbb4',WALL_TILE_LIGHT:'#ddd8ce',WALL_TILE_GRAPHITE:'#777775',PLASTER_WARM:'#d2c6b5',PLASTER_GREY:'#b2b0a9',PLASTER_WHITE:'#e8e5de',PANEL_OAK:'#b69268',PANEL_WALNUT:'#7a5b42',PANEL_LIGHT:'#d7cbb8'},
 facade:{IVORY:'#eee8dc',OAK:'#c7a77e',GRAPHITE:'#45484c',SAGE:'#aab49f',WHITE:'#f3f2ed'},
 carcass:{WHITE:'#e9e8e3',GREY:'#a9abad',OAK:'#bd9b73',GRAPHITE:'#505256'},
 worktop:{BLACK:'#242424',STONE:'#77746e',OAK:'#9d7851',LIGHT_STONE:'#c9c3b7'}
};
function colors(){const dark=document.documentElement.dataset.furniturePalette==='dark',pick=(set,key,fall)=>PRESETS[set][document.documentElement.dataset[key]||'']||fall;return{
 floor:pick('floor','floorPreset','#694932'),wall:pick('walls','wallPreset','#565b61'),front:pick('facade','facadePreset',dark?'#505359':'#f0ece4'),body:pick('carcass','carcassPreset',dark?'#404246':'#d7cfc1'),worktop:pick('worktop','worktopPreset','#343434'),metal:'#575b5f',glass:'#1f2429'
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
function buildRoom(options){clearGroup(roomGroup);const focus=!!options.focusMode;scene.background=new THREE.Color(focus?0xd9dde1:0x34383d);if(focus)return;const r=options.room||{},L=+r.lengthMm||6000,D=+r.depthMm||4200,H=+r.heightMm||2800,c=colors();
 const fm=ownMat({color:c.floor,roughness:.86});if(!document.documentElement.dataset.floorPreset)fm.map=makeWalnutTexture();const floor=new THREE.Mesh(new THREE.PlaneGeometry(L,D),fm);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;roomGroup.add(floor);
 const wm=ownMat({color:c.wall,roughness:.91,side:THREE.DoubleSide}),active=new Set(options.activeWalls||[]);
 if(active.has('A')){const w=new THREE.Mesh(new THREE.PlaneGeometry(L,H),wm.clone());w.material.userData.owned=true;w.position.set(0,H/2,D/2);w.receiveShadow=true;roomGroup.add(w)}
 if(active.has('B')){const w=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wm.clone());w.material.userData.owned=true;w.rotation.y=Math.PI/2;w.position.set(-L/2,H/2,0);w.receiveShadow=true;roomGroup.add(w)}
 if(active.has('C')){const w=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wm.clone());w.material.userData.owned=true;w.rotation.y=-Math.PI/2;w.position.set(L/2,H/2,0);w.receiveShadow=true;roomGroup.add(w)}
 wm.dispose();
}
function addHandleBar(pos,vertical=true,parent=hardwareGroup){const c=colors(),mat=ownMat({color:c.metal,roughness:.25,metalness:.7}),g=new THREE.Group(),bar=new THREE.Mesh(new THREE.CylinderGeometry(5,5,vertical?125:150,12),mat.clone());bar.material.userData.owned=true;if(!vertical)bar.rotation.z=Math.PI/2;g.add(bar);[-1,1].forEach(s=>{const post=new THREE.Mesh(new THREE.CylinderGeometry(4,4,18,10),mat.clone());post.material.userData.owned=true;post.rotation.x=Math.PI/2;/* posts face back toward the facade */post.position.set(vertical?0:s*52,vertical?s*42:0,10);g.add(post)});g.position.copy(pos);g.userData.visualization='HANDLE';parent.add(g);mat.dispose();return g}
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
 if(window.BizetModelRuntime?.getInputs?.()?.handle_system!=='GOLA'){
   const fv=frontVector(wall),p=center(room,spec);
   if(type==='drawer'){p.y+=(spec.h/2)-40;p.add(fv.clone().multiplyScalar(18));const h=addHandleBar(p,false);h.userData.movableId=id;mover.group?.attach(h)}
   else if(type==='lift'){p.y-=spec.h/2-40;p.add(fv.clone().multiplyScalar(18));const h=addHandleBar(p,false);h.userData.movableId=id;mover.pivot?.attach(h)}
   else{
     const handleHalf=62.5;
     if(m.tall||(+m.z<100&&+m.h>1500))p.y=1000;else p.y+=(m.level==='upper'?(-spec.h/2+40+handleHalf):(spec.h/2-40-handleHalf));
     if(wall==='A')p.x+=side==='left'?spec.w/2-40:-spec.w/2+40;else p.z+=side==='left'?spec.d/2-40:-spec.d/2+40;
     p.add(fv.clone().multiplyScalar(18));const h=addHandleBar(p,true);h.userData.movableId=id;mover.pivot?.attach(h)
   }
 }
 return mesh;
}
function plinthRecess(){
 const I=window.BizetModelRuntime?.getInputs?.()||{};
 return I.dishwasher_type&&I.dishwasher_type!=='NO'?90:40;
}
function addSupportLeg(room,x,y,h,id,recess){
 const mat=ownMat({color:'#252627',roughness:.45,metalness:.4}),geo=new THREE.CylinderGeometry(14,14,Math.max(40,h),16),mesh=new THREE.Mesh(geo,mat);
 mesh.position.copy(roomToWorld(room,x,y,Math.max(40,h)/2));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={moduleId:id,cat:'leg',nominalFrontOffsetMm:recess};hardwareGroup.add(mesh);return mesh;
}
function addLegs(room,m){
 if(m.level==='upper'||m.tall||m.freestanding||m.kind==='FILLER')return;
 const h=Math.max(40,+m.z||100),recess=plinthRecess(),wall=m.wall||'A';
 if(wall==='A'){
   const ys=[+m.y+recess+14,Math.max(+m.y+recess+14,+m.y+ +m.d-56)];
   [0.16,0.84].forEach(ax=>ys.forEach(y=>addSupportLeg(room,+m.x+(+m.w)*ax,y,h,m.id,recess)));
 }else{
   const front=wall==='B'?+m.x+ +m.w:+m.x;
   const xs=wall==='B'?[front-recess-14,+m.x+28]:[front+recess+14,+m.x+ +m.w-28];
   [0.16,0.84].forEach(ay=>xs.forEach(x=>addSupportLeg(room,x,+m.y+(+m.d)*ay,h,m.id,recess)));
 }
}

function addHinges(room,m,count){if(m.kind==='DRAWERS'||m.kind==='FILLER'||(m.level==='upper'&&(m.opening==='LIFT'||m.facade_orientation==='HORIZONTAL')))return;const mat=ownMat({color:'#858b8f',roughness:.3,metalness:.7}),ys=[.18,.5,.82];ys.forEach(fr=>{for(let i=0;i<count;i++){const wall=m.wall||'A';let s;if(wall==='A')s={x:+m.x+(i%2?+m.w-28:14),y:+m.y+8,z:+m.z+(+m.h)*fr,w:22,d:30,h:12};else s={x:+m.x+8,y:+m.y+(i%2?+m.d-28:14),z:+m.z+(+m.h)*fr,w:30,d:22,h:12};meshBox(room,s,mat.clone(),hardwareGroup,'hinge',m.id).material.userData.owned=true}});mat.dispose()}
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
 if(window.BizetModelRuntime?.getInputs?.()?.handle_system!=='GOLA'){
   const fv=frontVector(wall),p=center(room,spec);p.y=index===0?z+h-135:z+135;
   if(wall==='A')p.x+=side==='left'?spec.w/2-40:-spec.w/2+40;else p.z+=side==='left'?spec.d/2-40:-spec.d/2+40;
   p.add(fv.clone().multiplyScalar(18));const handle=addHandleBar(p,true);handle.userData.movableId=id;pivot.attach(handle);
 }
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
 const gw=Math.min(Number(m.fridge_plinth_grille_width_mm)||460,Math.max(120,(wall==='A'?W:D)-40)),gh=Number(m.fridge_plinth_grille_height_mm)||60,gm=ownMat({color:'#111111',roughness:.7});
 let grille;if(wall==='A')grille={x:x+(W-gw)/2,y:y-13,z:Math.max(8,(z-gh)/2),w:gw,d:8,h:gh};else grille={x:wall==='B'?x+W+5:x-13,y:y+(D-gw)/2,z:Math.max(8,(z-gh)/2),w:8,d:gw,h:gh};
 const g=meshBox(room,grille,gm,hardwareGroup,'fridge-plinth-grille',m.id);g.userData.visualizationProxy=false;
}

function addCarcass(room,m,mat){
 const wall=m.wall||'A',t=18,x=+m.x,y=+m.y,z=+m.z,W=+m.w,D=+m.d,H=+m.h,parts=[];
 if(wall==='A')parts.push(
  {x,y,z,w:t,d:D,h:H},{x:x+W-t,y,z,w:t,d:D,h:H},
  {x:x+t,y,z,w:Math.max(20,W-2*t),d:D,h:t},{x:x+t,y,z:z+H-t,w:Math.max(20,W-2*t),d:D,h:t},
  {x:x+t,y:y+D-4,z:z+t,w:Math.max(20,W-2*t),d:4,h:Math.max(20,H-2*t)}
 );
 else parts.push(
  {x,y,z,w:W,d:t,h:H},{x,y:y+D-t,z,w:W,d:t,h:H},
  {x,y:y+t,z,w:W,d:Math.max(20,D-2*t),h:t},{x,y:y+t,z:z+H-t,w:W,d:Math.max(20,D-2*t),h:t},
  {x:wall==='B'?x:x+W-4,y:y+t,z:z+t,w:4,d:Math.max(20,D-2*t),h:Math.max(20,H-2*t)}
 );
 return parts.map((p,i)=>{const q=meshBox(room,p,mat.clone(),furnitureGroup,'carcass-part',m.id);q.material.userData.owned=true;q.userData.partRole=['SIDE_A','SIDE_B','BOTTOM','TOP','BACK'][i];return q});
}
function addTallOvenVisual(room,m,darkMat,steelMat){
 const wall=m.wall||'A',z=+m.z,H=+m.h,openingH=Math.min(600,Math.max(500,H*.28)),ovenZ=z+Math.max(180,Math.min(H-openingH-220,H*.32));
 const frontMat=ownMat({color:colors().front,roughness:.5}),frameMat=steelMat.clone();frameMat.userData.owned=true;
 const makeFrontPanel=(pz,ph,id)=>{
   if(ph<90)return;
   let s={...m,z:pz,h:ph};
   if(wall==='A'){s.x=+m.x+2;s.w=Math.max(20,+m.w-4);s.y=+m.y-9;s.d=8}else{s.y=+m.y+2;s.d=Math.max(20,+m.d-4);s.x=wall==='B'?+m.x+ +m.w+1:+m.x-9;s.w=8}
   const q=meshBox(room,s,frontMat.clone(),furnitureGroup,'oven-cabinet-front',m.id);q.material.userData.owned=true;q.userData.partRole=id;
 };
 makeFrontPanel(z,ovenZ-z-4,'LOWER_FRONT');makeFrontPanel(ovenZ+openingH+4,z+H-(ovenZ+openingH+4),'UPPER_FRONT');
 let glass={...m,z:ovenZ+8,h:openingH-16};
 if(wall==='A'){glass.x=+m.x+18;glass.w=Math.max(80,+m.w-36);glass.y=+m.y-14;glass.d=12}else{glass.y=+m.y+18;glass.d=Math.max(80,+m.d-36);glass.x=wall==='B'?+m.x+ +m.w+2:+m.x-14;glass.w=12}
 const oven=meshBox(room,glass,darkMat.clone(),hardwareGroup,'oven-3d',m.id);oven.material.userData.owned=true;oven.userData.visualizationProxy=true;
 let frame={...glass,z:ovenZ,h:openingH};if(wall==='A'){frame.x=+m.x+8;frame.w=Math.max(100,+m.w-16);frame.d=5}else{frame.y=+m.y+8;frame.d=Math.max(100,+m.d-16);frame.w=5}
 const trim=meshBox(room,frame,frameMat,hardwareGroup,'oven-frame',m.id);trim.userData.visualizationProxy=true;
 const p=center(room,glass),fv=frontVector(wall);p.y+=openingH*.34;p.add(fv.clone().multiplyScalar(22));const handle=addHandleBar(p,false);handle.scale.set(.78,.78,.78);handle.userData.visualization='OVEN_HANDLE';
 frontMat.dispose();
}

function addAppliance(room,m){
 const c=colors(),steel=ownMat({color:'#9ea3a6',roughness:.28,metalness:.68}),dark=ownMat({color:'#17191b',roughness:.12,metalness:.18}),wall=m.wall||'A';
 const front=frontVector(wall);
 if(m.kind==='FRIDGE'&&m.freestanding){const main={...m};const mm=meshBox(room,main,steel.clone(),furnitureGroup,'appliance',m.id);mm.material.userData.owned=true;selectable.push(mm)}
 if(m.kind==='DISHWASHER'){const mm=meshBox(room,m,steel.clone(),furnitureGroup,'appliance',m.id);mm.material.userData.owned=true;selectable.push(mm)}
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
 if(m.kind==='TALL_OVEN')addTallOvenVisual(room,m,dark,steel);
 if(m.kind==='UPPER_HOOD'){const hood={...m,z:+m.z-65,h:60};const q=meshBox(room,hood,steel.clone(),hardwareGroup,'appliance',m.id);q.material.userData.owned=true}
 steel.dispose();dark.dispose();
}

function addFocusInternals(room,m,bodyMat){
 const t=18,W=+m.w,H=+m.h,D=+m.d,x=+m.x,y=+m.y,z=+m.z;
 const pieces=[
  {x,y,z,w:t,d:D,h:H},{x:x+W-t,y,z,w:t,d:D,h:H},{x:x+t,y,z,w:W-2*t,d:D,h:t},{x:x+t,y,z:z+H-t,w:W-2*t,d:D,h:t},
  {x:x+t,y:y+D-4,z:z+t,w:W-2*t,d:4,h:H-2*t}
 ];
 if(H>500)pieces.push({x:x+t,y:y+12,z:z+H*.5,w:W-2*t,d:D-24,h:t});
 pieces.forEach(p=>meshBox(room,p,bodyMat.clone(),furnitureGroup,'body',m.id).material.userData.owned=true);
 const metal=ownMat({color:'#a8adb0',roughness:.3,metalness:.7});
 const fastener=window.BizetProductionR1050?.FASTENER_TEMPLATES?.CONFIRMAT_6_3X50;
 [30,70,D-70,D-30].filter(v=>v>20&&v<D-20).forEach(depth=>{
   [x+t/2,x+W-t/2].forEach(px=>{
     [z+9,z+H-9].forEach(pz=>{
       const c=new THREE.Mesh(new THREE.CylinderGeometry(3.15,3.15,50,10),metal.clone());
       c.material.userData.owned=true;c.rotation.z=Math.PI/2;
       c.position.copy(roomToWorld(room,px,y+depth,pz));hardwareGroup.add(c);
     });
   });
 });
 metal.dispose();
 addLegs(room,m);
 addHinges(room,m,Math.max(1,Number(m.facade_count)||1));
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
function segmentBy4100(wall,list){
 const pos=m=>wall==='A'?+m.x:+m.y,run=m=>wall==='A'?+m.w:+m.d,out=[];let i=0;
 while(i<list.length){
   const start=pos(list[i]);let best=i,bestEnd=pos(list[i])+run(list[i]);
   // 4100 mm is a hard maximum. Among valid module boundaries, the closest
   // boundary to 4100 from below is therefore the last boundary <= 4100.
   for(let j=i;j<list.length;j++){
     const end=pos(list[j])+run(list[j]),span=end-start;
     if(span<=4100+.001){best=j;bestEnd=end;continue}
     break;
   }
   // A single oversize module cannot be split at a module joint; keep it intact
   // and let engineering validation flag that exceptional case.
   if(best===i&&bestEnd-start>4100)best=i;
   out.push(list.slice(i,best+1));i=best+1;
 }
 return out;
}
function addWorktopAndPlinth(room,modules){
 const c=colors(),wm=ownMat({color:c.worktop,roughness:.42}),pm=ownMat({color:c.body,roughness:.6}),seamMat=ownMat({color:'#292929',roughness:.75}),recess=plinthRecess();
 lowerRuns(modules).forEach(([wall,list])=>{
   const segments=segmentBy4100(wall,list);
   segments.forEach((seg,si)=>{const first=seg[0],last=seg.at(-1),topZ=Math.max(...seg.map(m=>+m.z+ +m.h))+1;
     if(wall==='A'){
       const x=+first.x-2,w=(+last.x+ +last.w)-+first.x+4,y=Math.min(...seg.map(m=>+m.y))-20,d=Math.max(...seg.map(m=>+m.y+ +m.d))-y;
       const top=meshBox(room,{x,y,z:topZ,w,d,h:38},wm.clone(),furnitureGroup,'worktop','WORKTOP-'+wall+'-'+si);top.material.userData.owned=true;
       if(si>0){const seamX=+first.x;const seam=meshBox(room,{x:seamX-1.5,y,z:topZ+38,w:3,d,h:1.6},seamMat.clone(),hardwareGroup,'worktop-seam','SEAM-'+wall+'-'+si);seam.material.userData.owned=true}
       seg.forEach(m=>{const ph=Math.max(60,+m.z||100),pl=meshBox(room,{x:+m.x,y:+m.y+recess,z:0,w:+m.w,d:12,h:ph},pm.clone(),furnitureGroup,'plinth','PLINTH-'+m.id);pl.material.userData.owned=true;pl.userData.recess_mm=recess});
     }else{
       const y=+first.y-2,d=(+last.y+ +last.d)-+first.y+4,x=wall==='B'?Math.min(...seg.map(m=>+m.x))-20:Math.min(...seg.map(m=>+m.x)),w=Math.max(...seg.map(m=>+m.x+ +m.w))-x+(wall==='C'?20:0);
       const top=meshBox(room,{x,y,z:topZ,w,d,h:38},wm.clone(),furnitureGroup,'worktop','WORKTOP-'+wall+'-'+si);top.material.userData.owned=true;
       if(si>0){const seamY=+first.y;const seam=meshBox(room,{x,y:seamY-1.5,z:topZ+38,w,d:3,h:1.6},seamMat.clone(),hardwareGroup,'worktop-seam','SEAM-'+wall+'-'+si);seam.material.userData.owned=true}
       seg.forEach(m=>{const ph=Math.max(60,+m.z||100),front=wall==='B'?+m.x+ +m.w:+m.x,px=wall==='B'?front-recess-12:front+recess,pl=meshBox(room,{x:px,y:+m.y,z:0,w:12,d:+m.d,h:ph},pm.clone(),furnitureGroup,'plinth','PLINTH-'+m.id);pl.material.userData.owned=true;pl.userData.recess_mm=recess});
     }
   });
 });
 wm.dispose();pm.dispose();seamMat.dispose();
}

function textSprite(text,scale=2.4){const c=document.createElement('canvas');c.width=420;c.height=120;const x=c.getContext('2d');x.fillStyle='rgba(255,255,252,.96)';x.beginPath();x.roundRect?.(6,12,408,96,22);x.fill();x.fillStyle='#111';x.font='800 42px -apple-system,BlinkMacSystemFont,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(text),210,60);const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});mat.userData.owned=true;const s=new THREE.Sprite(mat);s.scale.set(420*scale,120*scale,1);return s}
function addNumber(room,m){const s=textSprite(m.number,.62),p=center(room,m);p.y+=+m.h*.12;if((m.wall||'A')==='A')p.z-=+m.d/2+90;else p.x+=(m.wall==='B'?1:-1)*(+m.w/2+90);s.position.copy(p);annotationGroup.add(s)}
function addDimension(room,a,b,label,pos,focus=false){const g=new THREE.BufferGeometry().setFromPoints([roomToWorld(room,...a),roomToWorld(room,...b)]),mat=new THREE.LineBasicMaterial({color:0x161616,transparent:true,opacity:.9});mat.userData.owned=true;annotationGroup.add(new THREE.Line(g,mat));const s=textSprite(label,focus?2.8:2.35);s.position.copy(roomToWorld(room,...pos));annotationGroup.add(s)}
function makeLightingGradient(){
 const c=document.createElement('canvas');c.width=128;c.height=8;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,128,0);
 g.addColorStop(0,'rgba(255,201,92,.88)');g.addColorStop(.52,'rgba(255,239,196,.96)');g.addColorStop(1,'rgba(255,255,255,.92)');x.fillStyle=g;x.fillRect(0,0,128,8);
 const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;return tex;
}
function addLightingStrip(room,spec,id){
 const mat=new THREE.MeshBasicMaterial({map:makeLightingGradient(),transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});mat.userData.owned=true;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(2,+spec.w||2),Math.max(2,+spec.h||2),Math.max(2,+spec.d||2)),mat);mesh.position.copy(center(room,spec));mesh.renderOrder=6;mesh.userData={cat:'lighting-proxy',moduleId:id||'',visualizationProxy:true,productionProxy:false};lightingGroup.add(mesh);
}
function buildLighting(room,mods){
 clearGroup(lightingGroup);
 const I=window.BizetModelRuntime?.getInputs?.()||{};if(I.lighting_enabled!=='YES')return;
 mods.forEach(m=>{
   if(m.kind==='FILLER'||m.freestanding)return;
   const wall=String(m.wall||'A'),front=frontVector(wall),isUpper=m.level==='upper',isLower=!isUpper&&!m.tall;
   const run=wall==='A'?+m.w:+m.d,th=10,depth=10;
   const strip=(z,offset,zone)=>{
     let s;if(wall==='A')s={x:+m.x,y:+m.y+(front.z<0?-offset:+m.d+offset),z,w:run,d:depth,h:th};
     else s={x:+m.x+(front.x<0?-offset:+m.w+offset),y:+m.y,z,w:depth,d:run,h:th};
     addLightingStrip(room,s,m.id+':'+zone);
   };
   if(I.lighting_plinth==='YES'&&isLower)strip(Math.max(12,(+m.z||100)*.24),10,'plinth');
   if(I.lighting_worktop==='YES'&&isUpper)strip(+m.z-18,12,'worktop');
   if(I.lighting_upper_inside==='YES'&&isUpper)strip(+m.z+ +m.h-45,20,'upper-inside');
   if(I.lighting_lower_inside==='YES'&&isLower)strip(+m.z+ +m.h-55,20,'lower-inside');
 });
}
function buildFurniture(options){clearGroup(furnitureGroup);clearGroup(hardwareGroup);clearGroup(annotationGroup);clearGroup(lightingGroup);selectable=[];movables=[];const room=options.room||{},mods=options.modules||[],c=colors(),body=ownMat({color:c.body,roughness:.58}),front=ownMat({color:c.front,roughness:.5}),focus=!!options.focusMode;
 const buildOne=m=>{
   if(m.kind==='FRIDGE'&&!m.freestanding){addBuiltInFridge(room,m,body,front);addEndPanels(room,m,body,front);if(options.showNumbers!==false&&!focus)addNumber(room,m);return}
   if(m.kind==='FRIDGE'&&m.freestanding){addAppliance(room,m);if(options.showNumbers!==false&&!focus)addNumber(room,m);return}
   if(m.kind==='DISHWASHER'){addAppliance(room,m);if(options.showNumbers!==false&&!focus)addNumber(room,m);return}
   addCarcass(room,m,body);
   const count=Math.max(1,Math.min(5,Number(m.kind==='DRAWERS'?m.drawer_count:m.facade_count)||1));
   const localFront=front.clone();localFront.userData.owned=true;
   if(focus){localFront.transparent=true;localFront.opacity=.58;localFront.depthWrite=false}
   if(!m.freestanding&&!['COOKTOP','SINK','TALL_OVEN'].includes(m.kind))for(let i=0;i<count;i++)makeFront(room,m,i,count,localFront.clone());
   localFront.dispose();
   addLegs(room,m);addHinges(room,m,count);addLiftHardware(room,m);addEndPanels(room,m,body,front);addAppliance(room,m);
   if(options.showNumbers!==false&&!focus)addNumber(room,m);
 };
 mods.forEach(buildOne);
 if(!focus){addWorktopAndPlinth(room,mods);buildLighting(room,mods)}
 if(options.showDimensions!==false){if(focus&&mods[0]){const m=mods[0],safe=360;addDimension(room,[m.x,+m.y+ +m.d+safe,m.z+m.h+100],[+m.x+ +m.w,+m.y+ +m.d+safe,+m.z+ +m.h+100],Math.round(+m.w)+' mm',[+m.x+ +m.w/2,+m.y+ +m.d+safe+140,+m.z+ +m.h+220],true);addDimension(room,[+m.x+ +m.w+safe,+m.y+ +m.d+120,m.z],[+m.x+ +m.w+safe,+m.y+ +m.d+120,+m.z+ +m.h],Math.round(+m.h)+' mm',[+m.x+ +m.w+safe+160,+m.y+ +m.d+120,+m.z+ +m.h/2],true)}
 else{const L=+room.lengthMm||6000,D=+room.depthMm||4200,H=+room.heightMm||2800,safe=520;addDimension(room,[0,D+safe,80],[L,D+safe,80],Math.round(L)+' mm',[L/2,D+safe+180,180]);addDimension(room,[L+safe,D+safe*.35,0],[L+safe,D+safe*.35,H],Math.round(H)+' mm',[L+safe+200,D+safe*.35,H/2])}}
 body.dispose();front.dispose();
}
function frame(options,force=false){const room=options.room||{},mods=options.modules||[],mode=options.focusMode?'focus':'normal',key=[room.lengthMm,room.depthMm,room.heightMm,mode].join(':');if(!force&&lastMode===mode&&lastRoomKey===key)return;lastMode=mode;lastRoomKey=key;if(!mods.length)return;const minX=Math.min(...mods.map(m=>+m.x||0)),maxX=Math.max(...mods.map(m=>(+m.x||0)+(+m.w||0))),minY=Math.min(...mods.map(m=>+m.y||0)),maxY=Math.max(...mods.map(m=>(+m.y||0)+(+m.d||0))),minZ=Math.min(...mods.map(m=>+m.z||0)),maxZ=Math.max(...mods.map(m=>(+m.z||0)+(+m.h||0))),ct=roomToWorld(room,(minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2),span=Math.max(maxX-minX,maxY-minY,maxZ-minZ,1200),dist=options.focusMode?Math.max(1500,span*1.55):Math.max(2600,span*1.25);controls.target.copy(ct);camera.position.set(ct.x+dist*.78,ct.y+dist*.38,ct.z-dist*.96);camera.updateProjectionMatrix();controls.update()}
function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);composer?.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);addEventListener('resize',resize);
function draw(options){lastOptions=options;setDeepShadow(false);buildRoom(options);buildFurniture(options);frame(options,false);resize();normalCanvas.style.opacity='0';focusCanvas.style.opacity='0'}
renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,id:e.pointerId});
renderer.domElement.addEventListener('pointercancel',()=>down=null);
renderer.domElement.addEventListener('pointerup',e=>{
 if(!down||down.id!==e.pointerId){down=null;return}
 const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>8)return;
 const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);
 const hit=raycaster.intersectObjects(selectable,true)[0],id=hit?.object?.userData?.movableId||hit?.object?.parent?.userData?.movableId||hit?.object?.userData?.moduleId||'';
 if(window.BIZET_KITCHEN_UI_MODE==='VIEW'&&id){const mv=movables.find(x=>x.id===id);if(mv){mv.target=mv.target>.5?0:1;openState.set(mv.id,mv.target>0);return}}
 if(window.BIZET_KITCHEN_UI_MODE!=='VIEW'&&!lastOptions?.focusMode&&id){document.querySelector('#moduleStrip [data-module="'+CSS.escape(String(id).split(':')[0])+'"]')?.click()}
});
function animate(){requestAnimationFrame(animate);controls.update();movables.forEach(m=>{m.current+=(m.target-m.current)*.12;if(m.type==='door'){m.pivot.rotation.y=(m.sign??doorOpenSign(m.wall,m.side))*m.current*Math.PI*.58}else if(m.type==='lift'){if(m.pivot){if(m.wall==='A')m.pivot.rotation.x=m.current*Math.PI*.48;else m.pivot.rotation.z=(m.wall==='B'?-1:1)*m.current*Math.PI*.48}}else if(m.type==='drawer'){const fv=frontVector(m.wall),base=m.base||new THREE.Vector3();m.group.position.copy(base).add(fv.multiplyScalar(360*m.current))}});renderer.render(scene,camera)}animate();
window.BizetPilot3D.drawKitchenScene=(canvas,options={})=>{const legacy=legacyDraw(canvas,options);try{draw(options)}catch(e){console.error('R10.5.1 kitchen WebGL fallback',e);host.style.display='none';canvas.style.opacity='1'}return legacy};
window.BizetKitchenWebGL={version:'R10.5.1+FURNITURE-INTERACTION-PILOT-20261011',renderer,scene,camera,controls,host,composer,saoPass,redraw:()=>lastOptions&&draw(lastOptions),frame:()=>lastOptions&&frame(lastOptions,true),setDeepShadow,isDeepShadow:()=>false,setMotion:()=>{motionEnabled=true},isMotion:()=>true};
})();