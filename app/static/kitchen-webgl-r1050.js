(() => {
'use strict';
if(!window.THREE||!window.THREE.OrbitControls||!window.BizetPilot3D)return;
const THREE=window.THREE,legacyDraw=window.BizetPilot3D.drawKitchenScene;
const stage=document.getElementById('modelStage'),normalCanvas=document.getElementById('modelCanvas'),focusCanvas=document.getElementById('focusCanvas');
if(!stage||!normalCanvas||!focusCanvas||typeof legacyDraw!=='function')return;

const style=document.createElement('style');style.id='r1050KitchenWebGLStyle';style.textContent=`
#r1050KitchenWebGL{position:absolute;inset:0;z-index:1;overflow:hidden;border-radius:inherit;background:#efede7;transition:inset .42s cubic-bezier(.2,.8,.2,1),border-radius .42s}
#r1050KitchenWebGL canvas{width:100%!important;height:100%!important;display:block;touch-action:none}
#modelCanvas,#focusCanvas{position:absolute!important;inset:0!important;opacity:0!important;pointer-events:none!important}
.r8-stage-top,.r10-constraint-banner,.r104-focus-module-nav,.r8-variant-controls{z-index:12!important}
`;document.head.appendChild(style);
const host=document.createElement('div');host.id='r1050KitchenWebGL';stage.insertBefore(host,stage.firstChild);

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xefede7);scene.fog=null;
const camera=new THREE.PerspectiveCamera(39,1,1,18000);
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.rotateSpeed=.62;controls.zoomSpeed=.82;controls.panSpeed=.68;controls.screenSpacePanning=true;controls.minDistance=800;controls.maxDistance=12000;controls.minPolarAngle=.12;controls.maxPolarAngle=1.53;controls.enableKeys=false;
const hemi=new THREE.HemisphereLight(0xffffff,0xa7a39a,1.0),key=new THREE.DirectionalLight(0xffffff,.52),fill=new THREE.DirectionalLight(0xd9e5ff,.2);
key.position.set(-2600,4200,-2800);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5200;key.shadow.camera.right=5200;key.shadow.camera.top=5200;key.shadow.camera.bottom=-1500;key.shadow.camera.near=100;key.shadow.camera.far=14000;
fill.position.set(3800,2300,2600);scene.add(hemi,key,fill);
const roomGroup=new THREE.Group(),furnitureGroup=new THREE.Group(),annotationGroup=new THREE.Group(),hardwareGroup=new THREE.Group();scene.add(roomGroup,furnitureGroup,hardwareGroup,annotationGroup);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let selectable=[],movables=[],lastOptions=null,lastMode='',lastRoomKey='',down=null,lastTap={time:0,id:''},motionEnabled=false,deepShadow=localStorage.getItem('bizet_deep_shadow')==='1';
const openState=new Map();

function ownMat(p){const m=new THREE.MeshStandardMaterial(p);m.userData.owned=true;return m}
function clearGroup(g){while(g.children.length){const c=g.children.pop();c.traverse?.(n=>{n.geometry?.dispose?.();const ms=n.material?(Array.isArray(n.material)?n.material:[n.material]):[];ms.forEach(m=>{if(m?.userData?.owned){m.map?.dispose?.();m.dispose?.()}})})}}
function roomToWorld(room,x,y,z){return new THREE.Vector3(Number(x)-Number(room.lengthMm||6000)/2,Number(z),Number(y)-Number(room.depthMm||4200)/2)}
function center(room,m){return roomToWorld(room,Number(m.x||0)+Number(m.w||0)/2,Number(m.y||0)+Number(m.d||0)/2,Number(m.z||0)+Number(m.h||0)/2)}
function meshBox(room,m,mat,group=furnitureGroup,cat='body',id=''){const w=Math.max(1,+m.w||1),h=Math.max(1,+m.h||1),d=Math.max(1,+m.d||1),o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.copy(center(room,m));o.castShadow=true;o.receiveShadow=true;o.userData={moduleId:id||m.id||'',cat};group.add(o);return o}
const PRESETS={
 floor:{TILE_SAND:'#d7c9ad',STONE_LIGHT:'#d1cec5',TILE_GREY:'#aeb0ae',OAK_NATURAL:'#cbb58f',OAK_SMOKED:'#8c7358',ASH_LIGHT:'#d5c29f',LAMINATE_OAK:'#b99c72',LAMINATE_GREY:'#aaa59b',LAMINATE_DARK:'#655b50',CONCRETE_WARM:'#bbb7ae',CONCRETE_GREY:'#9d9e9c',CONCRETE_LIGHT:'#d0cec8'},
 walls:{WARM_WHITE:'#e9e5db',SAND:'#d9ccb7',GREIGE:'#c9c4b9',STONE:'#bebbb4',WALL_TILE_LIGHT:'#ddd8ce',WALL_TILE_GRAPHITE:'#777775',PLASTER_WARM:'#d2c6b5',PLASTER_GREY:'#b2b0a9',PLASTER_WHITE:'#e8e5de',PANEL_OAK:'#b69268',PANEL_WALNUT:'#7a5b42',PANEL_LIGHT:'#d7cbb8'},
 facade:{IVORY:'#eee8dc',OAK:'#c7a77e',GRAPHITE:'#45484c',SAGE:'#aab49f',WHITE:'#f3f2ed'},
 carcass:{WHITE:'#e9e8e3',GREY:'#a9abad',OAK:'#bd9b73',GRAPHITE:'#505256'},
 worktop:{BLACK:'#242424',STONE:'#77746e',OAK:'#9d7851',LIGHT_STONE:'#c9c3b7'}
};
function colors(){const dark=document.documentElement.dataset.furniturePalette==='dark',pick=(set,key,fall)=>PRESETS[set][document.documentElement.dataset[key]||'']||fall;return{
 floor:pick('floor','floorPreset','#c9c4bb'),wall:pick('walls','wallPreset','#e4dfd6'),front:pick('facade','facadePreset',dark?'#505359':'#f0ece4'),body:pick('carcass','carcassPreset',dark?'#404246':'#d7cfc1'),worktop:pick('worktop','worktopPreset','#343434'),metal:'#575b5f',glass:'#1f2429'
}}
function setDeepShadow(on){deepShadow=!!on;localStorage.setItem('bizet_deep_shadow',deepShadow?'1':'0');hemi.intensity=deepShadow?.63:1.0;key.intensity=deepShadow?.88:.52;fill.intensity=deepShadow?.13:.2;renderer.toneMappingExposure=deepShadow?.96:1.02;renderer.shadowMap.enabled=true;window.dispatchEvent(new CustomEvent('bizet:deepshadowchange',{detail:{enabled:deepShadow}}))}
function buildRoom(options){clearGroup(roomGroup);if(options.focusMode)return;const r=options.room||{},L=+r.lengthMm||6000,D=+r.depthMm||4200,H=+r.heightMm||2800,c=colors();
 const fm=ownMat({color:c.floor,roughness:.9}),floor=new THREE.Mesh(new THREE.PlaneGeometry(L,D),fm);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;roomGroup.add(floor);
 const wm=ownMat({color:c.wall,roughness:.94,side:THREE.DoubleSide}),active=new Set(options.activeWalls||[]);
 if(active.has('A')){const w=new THREE.Mesh(new THREE.PlaneGeometry(L,H),wm.clone());w.material.userData.owned=true;w.position.set(0,H/2,D/2);w.receiveShadow=true;roomGroup.add(w)}
 if(active.has('B')){const w=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wm.clone());w.material.userData.owned=true;w.rotation.y=Math.PI/2;w.position.set(-L/2,H/2,0);w.receiveShadow=true;roomGroup.add(w)}
 if(active.has('C')){const w=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wm.clone());w.material.userData.owned=true;w.rotation.y=-Math.PI/2;w.position.set(L/2,H/2,0);w.receiveShadow=true;roomGroup.add(w)}
 wm.dispose();
}
function addHandleBar(pos,vertical=true,parent=hardwareGroup){const c=colors(),mat=ownMat({color:c.metal,roughness:.25,metalness:.7}),g=new THREE.Group(),bar=new THREE.Mesh(new THREE.CylinderGeometry(5,5,vertical?125:150,12),mat.clone());bar.material.userData.owned=true;if(!vertical)bar.rotation.z=Math.PI/2;g.add(bar);[-1,1].forEach(s=>{const post=new THREE.Mesh(new THREE.CylinderGeometry(4,4,18,10),mat.clone());post.material.userData.owned=true;post.rotation.x=Math.PI/2;post.position.set(vertical?0:s*52,vertical?s*42:0,-10);g.add(post)});g.position.copy(pos);parent.add(g);mat.dispose();return g}
function frontVector(wall){return wall==='A'?new THREE.Vector3(0,0,-1):wall==='B'?new THREE.Vector3(1,0,0):new THREE.Vector3(-1,0,0)}
function makeFront(room,m,index,count,mat){
 const wall=String(m.wall||'A'),gap=4,isDrawer=m.kind==='DRAWERS',isLift=m.level==='upper'&&(m.opening==='LIFT'||m.facade_orientation==='HORIZONTAL'||m.upper_opening==='LIFT');
 let spec;
 if(wall==='A'){const fw=Math.max(20,(+m.w-gap*(count-1))/count);spec={...m,w:fw-2,d:8,x:+m.x+index*(fw+gap)+1,y:+m.y-9}}
 else{const fd=Math.max(20,(+m.d-gap*(count-1))/count);spec={...m,d:fd-2,w:8,y:+m.y+index*(fd+gap)+1,x:wall==='B'?+m.x+ +m.w+1:+m.x-9}}
 if(isDrawer)spec.h=Math.max(80,(+m.h-gap*(count-1))/count),spec.z=+m.z+index*(spec.h+gap);
 const mesh=meshBox(room,spec,mat,furnitureGroup,'front',m.id),id=(m.id||'M')+':F'+index;
 mesh.userData.movableId=id;selectable.push(mesh);
 let pivot=null,type=isDrawer?'drawer':isLift?'lift':'door',side=index%2===0?'left':'right';
 if(type==='door'){
   pivot=new THREE.Group();scene.add(pivot);const world=mesh.position.clone(),half=(wall==='A'?spec.w:spec.d)/2;
   if(wall==='A')pivot.position.set(world.x+(side==='left'?-half:half),world.y,world.z);else pivot.position.set(world.x,world.y,world.z+(side==='left'?-half:half));
   furnitureGroup.remove(mesh);mesh.position.sub(pivot.position);pivot.add(mesh);pivot.userData={movableId:id,type,moduleId:m.id,side,wall};movables.push({id,type,pivot,mesh,side,wall,target:openState.get(id)?1:0,current:openState.get(id)?1:0});
 }else movables.push({id,type,mesh,side,wall,base:mesh.position.clone(),target:openState.get(id)?1:0,current:openState.get(id)?1:0});
 // handle placement
 if(window.BizetModelRuntime?.getInputs?.()?.handle_system==='GOLA')return mesh;
 const v=frontVector(wall),p=mesh.getWorldPosition(new THREE.Vector3());
 if(type==='drawer'){p.y+=(spec.h/2)-40;p.add(v.clone().multiplyScalar(13));addHandleBar(p,false)}
 else if(type==='lift'){p.y-=spec.h/2-40;p.add(v.clone().multiplyScalar(13));addHandleBar(p,false)}
 else{
   if(m.tall||(+m.z<100&&+m.h>1500))p.y=1000;else p.y+=(m.level==='upper'?-spec.h/2+40:spec.h/2-40);
   if(wall==='A')p.x+=side==='left'?spec.w/2-40:-spec.w/2+40;else p.z+=side==='left'?spec.d/2-40:-spec.d/2+40;
   p.add(v.clone().multiplyScalar(13));addHandleBar(p,true)
 }
 return mesh;
}
function addLegs(room,m){if(m.level==='upper'||m.tall||m.freestanding||m.kind==='FILLER')return;const mat=ownMat({color:'#252627',roughness:.45,metalness:.4}),z=+m.z||100,h=Math.max(40,z),pts=[[.16,.18],[.84,.18],[.16,.82],[.84,.82]];pts.forEach(([ax,ay])=>{const leg={x:+m.x+(+m.w)*ax-14,y:+m.y+(+m.d)*ay-14,z:0,w:28,d:28,h};meshBox(room,leg,mat.clone(),hardwareGroup,'leg',m.id).material.userData.owned=true});mat.dispose()}
function addHinges(room,m,count){if(m.kind==='DRAWERS'||m.kind==='FILLER')return;const mat=ownMat({color:'#858b8f',roughness:.3,metalness:.7}),ys=[.18,.5,.82];ys.forEach(fr=>{for(let i=0;i<count;i++){const wall=m.wall||'A';let s;if(wall==='A')s={x:+m.x+(i%2?+m.w-28:14),y:+m.y+8,z:+m.z+(+m.h)*fr,w:22,d:30,h:12};else s={x:+m.x+8,y:+m.y+(i%2?+m.d-28:14),z:+m.z+(+m.h)*fr,w:30,d:22,h:12};meshBox(room,s,mat.clone(),hardwareGroup,'hinge',m.id).material.userData.owned=true}});mat.dispose()}
function addAppliance(room,m){
 const c=colors(),steel=ownMat({color:'#9ea3a6',roughness:.28,metalness:.68}),dark=ownMat({color:c.glass,roughness:.18,metalness:.25}),wall=m.wall||'A';
 const front=frontVector(wall);
 if(m.kind==='FRIDGE'){const main={...m};const mm=meshBox(room,main,steel,furnitureGroup,'appliance',m.id);selectable.push(mm);const p=mm.position.clone().add(front.clone().multiplyScalar(Math.min(+m.d,+m.w)*.5+6));const panel={x:p.x-((wall==='A'?+m.w:10)/2),y:p.z,z:p.y-+m.h*.15,w:wall==='A'?+m.w-24:8,d:wall==='A'?8:+m.d-24,h:+m.h*.7};meshBox(room,panel,dark,hardwareGroup,'appliance',m.id)}
 if(m.kind==='DISHWASHER'){const mm=meshBox(room,m,steel,furnitureGroup,'appliance',m.id);selectable.push(mm)}
 if(m.kind==='COOKTOP'){const top={...m,z:+m.z+ +m.h+28,h:7,x:+m.x+(+m.w)*.08,w:(+m.w)*.84,y:+m.y+(+m.d)*.15,d:(+m.d)*.7};meshBox(room,top,dark,hardwareGroup,'appliance',m.id)}
 if(m.kind==='SINK'){const top={...m,z:+m.z+ +m.h+29,h:14,x:+m.x+(+m.w)*.18,w:(+m.w)*.64,y:+m.y+(+m.d)*.2,d:(+m.d)*.54};meshBox(room,top,steel,hardwareGroup,'appliance',m.id)}
 if(m.kind==='TALL_OVEN'){const panel={...m,z:+m.z+(+m.h)*.35,h:520,y:wall==='A'?+m.y-10:+m.y};const oven=meshBox(room,panel,dark,hardwareGroup,'appliance',m.id);oven.scale.set(.86,1,.96)}
 if(m.kind==='UPPER_HOOD'){const hood={...m,z:+m.z-65,h:60};meshBox(room,hood,steel,hardwareGroup,'appliance',m.id)}
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
 const c=colors(),wm=ownMat({color:c.worktop,roughness:.42}),pm=ownMat({color:c.body,roughness:.6});
 lowerRuns(modules).forEach(([wall,list])=>segmentBy4100(wall,list).forEach(seg=>{const first=seg[0],last=seg.at(-1),topZ=Math.max(...seg.map(m=>+m.z+ +m.h))+1;
   if(wall==='A'){const x=+first.x-2,w=(+last.x+ +last.w)-+first.x+4,y=Math.min(...seg.map(m=>+m.y))-20,d=Math.max(...seg.map(m=>+m.y+ +m.d))-y;meshBox(room,{x,y,z:topZ,w,d,h:38},wm.clone(),furnitureGroup,'worktop','WORKTOP').material.userData.owned=true;const ph=Math.max(60,Math.min(...seg.map(m=>+m.z||100)));meshBox(room,{x:+first.x,y:+first.y+ +first.d-18,z:0,w:(+last.x+ +last.w)-+first.x,d:18,h:ph},pm.clone(),furnitureGroup,'plinth','PLINTH').material.userData.owned=true}
   else{const y=+first.y-2,d=(+last.y+ +last.d)-+first.y+4,x=wall==='B'?Math.min(...seg.map(m=>+m.x))-20:Math.min(...seg.map(m=>+m.x)),w=Math.max(...seg.map(m=>+m.x+ +m.w))-x+(wall==='C'?20:0);meshBox(room,{x,y,z:topZ,w,d,h:38},wm.clone(),furnitureGroup,'worktop','WORKTOP').material.userData.owned=true}
 }));wm.dispose();pm.dispose();
}
function textSprite(text,scale=2.4){const c=document.createElement('canvas');c.width=420;c.height=120;const x=c.getContext('2d');x.fillStyle='rgba(255,255,252,.96)';x.beginPath();x.roundRect?.(6,12,408,96,22);x.fill();x.fillStyle='#111';x.font='800 42px -apple-system,BlinkMacSystemFont,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(text),210,60);const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});mat.userData.owned=true;const s=new THREE.Sprite(mat);s.scale.set(420*scale,120*scale,1);return s}
function addNumber(room,m){const s=textSprite(m.number,.62),p=center(room,m);p.y+=+m.h*.12;if((m.wall||'A')==='A')p.z-=+m.d/2+90;else p.x+=(m.wall==='B'?1:-1)*(+m.w/2+90);s.position.copy(p);annotationGroup.add(s)}
function addDimension(room,a,b,label,pos,focus=false){const g=new THREE.BufferGeometry().setFromPoints([roomToWorld(room,...a),roomToWorld(room,...b)]),mat=new THREE.LineBasicMaterial({color:0x161616,transparent:true,opacity:.9});mat.userData.owned=true;annotationGroup.add(new THREE.Line(g,mat));const s=textSprite(label,focus?2.8:2.35);s.position.copy(roomToWorld(room,...pos));annotationGroup.add(s)}
function buildFurniture(options){clearGroup(furnitureGroup);clearGroup(hardwareGroup);clearGroup(annotationGroup);selectable=[];movables=[];const room=options.room||{},mods=options.modules||[],c=colors(),body=ownMat({color:c.body,roughness:.58}),front=ownMat({color:c.front,roughness:.5});
 if(options.focusMode&&mods[0]){const ghost=body.clone();ghost.userData.owned=true;ghost.transparent=true;ghost.opacity=.22;ghost.depthWrite=false;addFocusInternals(room,mods[0],ghost);addHinges(room,mods[0],2)}
 else mods.forEach(m=>{const main=meshBox(room,m,body.clone(),furnitureGroup,'body',m.id);main.material.userData.owned=true;selectable.push(main);const count=Math.max(1,Math.min(5,Number(m.kind==='DRAWERS'?m.drawer_count:m.facade_count)||1));if(!m.freestanding&&!['COOKTOP','SINK'].includes(m.kind))for(let i=0;i<count;i++)makeFront(room,m,i,count,front.clone());addLegs(room,m);addHinges(room,m,count);addAppliance(room,m);if(options.showNumbers!==false)addNumber(room,m)});
 if(!options.focusMode)addWorktopAndPlinth(room,mods);
 if(options.showDimensions!==false){if(options.focusMode&&mods[0]){const m=mods[0];addDimension(room,[m.x,m.y,m.z+m.h+120],[+m.x+ +m.w,m.y,+m.z+ +m.h+120],Math.round(+m.w)+' mm',[+m.x+ +m.w/2,m.y,+m.z+ +m.h+240],true);addDimension(room,[+m.x+ +m.w+130,m.y,m.z],[+m.x+ +m.w+130,m.y,+m.z+ +m.h],Math.round(+m.h)+' mm',[+m.x+ +m.w+280,m.y,+m.z+ +m.h/2],true)}
 else{const L=+room.lengthMm||6000,D=+room.depthMm||4200,H=+room.heightMm||2800;addDimension(room,[0,D,60],[L,D,60],Math.round(L)+' mm',[L/2,D,230]);addDimension(room,[L,D,0],[L,D,H],Math.round(H)+' mm',[L,D,H/2])}}
 body.dispose();front.dispose();
}
function frame(options,force=false){const room=options.room||{},mods=options.modules||[],mode=options.focusMode?'focus':'normal',key=[room.lengthMm,room.depthMm,room.heightMm,mode].join(':');if(!force&&lastMode===mode&&lastRoomKey===key)return;lastMode=mode;lastRoomKey=key;if(!mods.length)return;const minX=Math.min(...mods.map(m=>+m.x||0)),maxX=Math.max(...mods.map(m=>(+m.x||0)+(+m.w||0))),minY=Math.min(...mods.map(m=>+m.y||0)),maxY=Math.max(...mods.map(m=>(+m.y||0)+(+m.d||0))),minZ=Math.min(...mods.map(m=>+m.z||0)),maxZ=Math.max(...mods.map(m=>(+m.z||0)+(+m.h||0))),ct=roomToWorld(room,(minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2),span=Math.max(maxX-minX,maxY-minY,maxZ-minZ,1200),dist=options.focusMode?Math.max(1500,span*1.55):Math.max(2600,span*1.25);controls.target.copy(ct);camera.position.set(ct.x+dist*.78,ct.y+dist*.38,ct.z-dist*.96);camera.updateProjectionMatrix();controls.update()}
function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);addEventListener('resize',resize);
function draw(options){lastOptions=options;buildRoom(options);buildFurniture(options);frame(options,false);resize();normalCanvas.style.opacity='0';focusCanvas.style.opacity='0';setDeepShadow(deepShadow)}
renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY,id:e.pointerId});
renderer.domElement.addEventListener('pointercancel',()=>down=null);
renderer.domElement.addEventListener('pointerup',e=>{if(!down||down.id!==e.pointerId){down=null;return}const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>8)return;const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(selectable,true)[0];const id=hit?.object?.userData?.movableId||hit?.object?.userData?.moduleId||'';const now=performance.now();
 if(motionEnabled&&window.BIZET_KITCHEN_UI_MODE==='VIEW'&&lastTap.id===id&&now-lastTap.time<420){const mv=movables.find(x=>x.id===id);if(mv){mv.target=mv.target>.5?0:1;openState.set(mv.id,mv.target>0);lastTap={time:0,id:''};return}}
 lastTap={time:now,id};
 if(window.BIZET_KITCHEN_UI_MODE!=='VIEW'&&!lastOptions?.focusMode&&id){document.querySelector('#moduleStrip [data-module="'+CSS.escape(String(id).split(':')[0])+'"]')?.click()}
});
function animate(){requestAnimationFrame(animate);controls.update();movables.forEach(m=>{m.current+=(m.target-m.current)*.12;if(m.type==='door'){const sign=m.side==='left'?-1:1;m.pivot.rotation.y=sign*m.current*Math.PI*.58}else if(m.type==='lift'){m.mesh.rotation.x=-m.current*Math.PI*.52;m.mesh.position.y=m.base?m.base.y+m.current*120:m.mesh.position.y}else if(m.type==='drawer'){const v=frontVector(m.wall);const base=m.base||m.mesh.position;m.mesh.position.copy(base).add(v.multiplyScalar(360*m.current))}});renderer.render(scene,camera)}animate();
window.BizetPilot3D.drawKitchenScene=(canvas,options={})=>{const legacy=legacyDraw(canvas,options);try{draw(options)}catch(e){console.error('R10.5.0 kitchen WebGL fallback',e);host.style.display='none';canvas.style.opacity='1'}return legacy};
window.BizetKitchenWebGL={version:'R10.5.0',renderer,scene,camera,controls,host,redraw:()=>lastOptions&&draw(lastOptions),frame:()=>lastOptions&&frame(lastOptions,true),setDeepShadow,isDeepShadow:()=>deepShadow,setMotion:on=>{motionEnabled=!!on},isMotion:()=>motionEnabled};
})();