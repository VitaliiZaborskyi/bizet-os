/* BIZET OS R10.6.3: independently enabled furniture render embellishment.
 * Legacy renderer, camera, geometry generator and 2D fallback remain immutable.
 * Any preflight error leaves the ORIGINAL 10.6.0 scene intact.
 */
(()=>{'use strict';
 let accessories=null,lights=null,bound=null,queued=false,refreshing=false,attached=[];
 const rt=()=>window.BizetModelRuntime,viewer=()=>window.BizetKitchenWebGL,THREE=()=>window.THREE;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const contents=()=>rt()?.getModules?.()||window.BizetR1063QA?.modules||[];
 const room=()=>rt()?.getRoom?.()||window.BizetR1063QA?.options?.room||{lengthMm:6000,depthMm:4200};
 const inputs=()=>rt()?.getInputs?.()||{},visual=()=>rt()?.getVisual?.()||{};
 function thickness(){
  const surface=visual().furniture_materials?.facade||{},i=inputs();
  const n=Number(surface.thickness_mm??surface.board_thickness_mm??i.facade_thickness_mm??18);
  return Number.isFinite(n)?clamp(n,10,45):18;
 }
 function makeMat(p){return new (THREE().MeshStandardMaterial)({...p,roughness:.24,metalness:.8})}
 function coreWorld(x,y,z){const r=room();return new (THREE().Vector3)(x-Number(r.lengthMm||6000)/2,z,y-Number(r.depthMm||4200)/2)}
 function clear(root){
  if(!root)return;
  root.parent?.remove(root);
  root.traverse(n=>{n.geometry?.dispose?.();if(n.material?.userData?.r1063Owned)n.material.dispose()});
 }
 function owned(material){material.userData.r1063Owned=true;return material}
 function readRealFronts(scene){const result=[];scene.traverse(n=>{
  if(n.isMesh&&n.userData?.cat==='front'&&n.geometry?.parameters?.height>0)result.push(n);
 });return result}
 function applyFacade(front,module){
  const t=thickness(),axis=module.wall==='A'||!module.wall?'z':'x';
  // Preserve the interior-facing plane at the original 10.6.0 gap.
  if(front.userData.r1063Original){
    const old=front.userData.r1063Original;
    front.scale[axis]=old.scale;front.position[axis]=old.position;
  }else front.userData.r1063Original={scale:front.scale[axis],position:front.position[axis]};
  const dimension=axis==='z'?Number(front.geometry.parameters.depth):Number(front.geometry.parameters.width);
  if(!dimension||dimension>70)return;
  const delta=t-dimension,direction=axis==='z'?-1:module.wall==='B'?1:-1;
  const start=front.userData.r1063Original;
  front.scale[axis]=start.scale*t/dimension;
  front.position[axis]=start.position+direction*delta/2;
  front.userData.r1063ThicknessMm=t;
  front.userData.r1063Source='FACIAL_BOARD_THICKNESS';
 }
 // R10.6.4 #40: ONE physically hinged side for EACH real swinging facade.
 // 35-mm concealed cup follows the door; stamped arm follows door; base plate remains fixed.
 function hinge(front,module,root){
  const pivot=front.parent;
  if(pivot?.userData?.type!=='door'||String(pivot.userData.moduleId)!==String(module.id))return 0;
  const T=THREE(),side=pivot.userData.side==='right'?'right':'left',wall=module.wall||'A';
  const geo=front.geometry?.parameters||{},width=wall==='A'?Number(geo.width):Number(geo.depth);
  const height=Number(geo.height),t=thickness();
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<70||height<170)return 0;
  const count=height>1100?3:2,levels=count===3?[.13,.5,.87]:[.17,.83];
  const steel=owned(new T.MeshStandardMaterial({color:0xc2c9cc,metalness:.84,roughness:.27})),
   rimMat=owned(new T.MeshStandardMaterial({color:0xe0e4e6,metalness:.78,roughness:.23})),
   screwMat=owned(new T.MeshStandardMaterial({color:0x818c93,metalness:.88,roughness:.33}));
  const faceNormal=wall==='A'?new T.Vector3(0,0,1):new T.Vector3(wall==='B'?-1:1,0,0);
  const fastener=(parent,at,rotation)=>{
   const mesh=new T.Mesh(new T.CylinderGeometry(2.3,2.3,2.4,12),screwMat);
   mesh.position.copy(at);mesh.rotation.copy(rotation);
   mesh.userData={cat:'r1064-hinge-screw',moduleId:module.id,visualizationProxy:true};
   parent.add(mesh);attached.push(mesh);
  };
  levels.forEach((fr)=>{
   const edge=side==='left'?-width/2+22.5:width/2-22.5;
   const vertical=-height/2+height*fr;
   const local=wall==='A'?new T.Vector3(edge,vertical,t/2-6):
     new T.Vector3(wall==='B'?-t/2+6:t/2-6,vertical,edge);
   // Cup centres measured from the pivot-side edge, never from cabinet left by default.
   const rotation=new T.Euler(wall==='A'?Math.PI/2:0,0,wall==='A'?0:Math.PI/2);
   const cup=new T.Mesh(new T.CylinderGeometry(17.5,17.5,11,32),steel);
   cup.position.copy(local);cup.rotation.copy(rotation);
   cup.userData={cat:'r1064-35mm-door-cup',moduleId:module.id,hingeSide:side,certified:false};
   front.add(cup);attached.push(cup);
   const lip=new T.Mesh(new T.TorusGeometry(18.5,2.1,8,32),rimMat);
   lip.position.copy(local).addScaledVector(faceNormal,6);
   lip.rotation.copy(rotation);lip.userData={cat:'r1064-hinge-cup-lip',moduleId:module.id};
   front.add(lip);attached.push(lip);
   // Cup flange screw pair on correct door side, invariant under LEFT/RIGHT mirroring.
   for(const sign of [-1,1]){
    const offset=wall==='A'?new T.Vector3(sign*24,0,0):new T.Vector3(0,0,sign*24);
    fastener(front,local.clone().add(offset).addScaledVector(faceNormal,6),rotation);
   }
   const arm=new T.Mesh(new T.BoxGeometry(wall==='A'?12:44,10,wall==='A'?44:12),steel);
   arm.position.copy(local).addScaledVector(faceNormal,22);
   arm.userData={cat:'r1064-articulating-hinge-arm',moduleId:module.id,hingeSide:side};
   front.add(arm);attached.push(arm);
   const knuckle=new T.Mesh(new T.CylinderGeometry(7.5,7.5,19,20),rimMat);
   knuckle.position.copy(local).addScaledVector(faceNormal,34);
   knuckle.userData={cat:'r1064-hinge-pivot',moduleId:module.id};
   front.add(knuckle);attached.push(knuckle);
   // Mounting plate stays attached to cabinet; world point taken from actual cup.
   front.updateMatrixWorld(true);
   const mount=front.localToWorld(local.clone().addScaledVector(faceNormal,61));
   const plate=new T.Mesh(new T.BoxGeometry(33,35,6),steel);
   plate.position.copy(mount);plate.userData={cat:'r1064-fixed-cabinet-plate',moduleId:module.id,hingeSide:side};
   root.add(plate);
   const head=plate.position.clone();
   for(const dy of [-11,11]){
    const p=new T.Mesh(new T.CylinderGeometry(2.5,2.5,3,12),screwMat);
    p.position.copy(head).add(new T.Vector3(0,dy,4));
    p.rotation.x=Math.PI/2;
    p.userData={cat:'r1064-plate-fastener',moduleId:module.id};
    root.add(p);
   }
  });
  return count;
 }
 function createLed(root){
  const T=THREE(),schedule=window.BizetLED1063?.manifest?.(inputs(),contents());
  if(!schedule?.included)return schedule;
  const i=inputs(),v=visual(),bright=clamp(Number(v.led_brightness_pct_r1063??75),0,100)/100;
  const kelvin=Number(i.lighting_kelvin)||3000,color=kelvin<=3000?0xffd19a:0xf2f7ff;
  let count=0;
  for(const seg of schedule.segments.slice(0,28)){
   const m=contents().find(q=>q.id===seg.module_id);if(!m||!seg.length_mm)continue;
   const wall=m.wall||'A', upper=m.level==='upper';
   const z=seg.zone==='PLINTH'?Number(m.z)+70:seg.zone==='WORKTOP'?Number(m.z)+5:
    Number(m.z)+Number(m.h)*.5;
   const px=Number(m.x)+Number(m.w)/2,py=Number(m.y)+(seg.zone==='WORKTOP'?-40:Number(m.d)/2);
   const point=coreWorld(px,py,z),light=new T.PointLight(color,bright*2.6,Math.max(1000,Math.min(3600,seg.length_mm*2)),0);
   light.position.copy(point);light.userData={cat:'r1063-led-light',moduleId:m.id,segmentId:seg.id};root.add(light);
   const spec=wall==='A'?[Math.max(70,seg.length_mm),9,9]:[9,9,Math.max(70,seg.length_mm)];
   const mat=owned(new T.MeshBasicMaterial({color,transparent:true,opacity:clamp(bright*1.3,.07,1)}));
   const line=new T.Mesh(new T.BoxGeometry(...spec),mat);
   line.position.copy(point);line.userData={cat:'r1063-led-emissive-line',moduleId:m.id,segmentId:seg.id};root.add(line);
   count++;
  }
  root.userData={cat:'r1063-led-visual-group',segments:count,priceUnverified:true};
  return schedule;
 }
 function addControls(){
  const panel=document.getElementById('panelBody');
  if(!panel||!document.querySelector('#workspaceTools [data-panel="upper"].is-active'))return;
  if(panel.querySelector('#r1063LedBrightness'))return;
  const sec=document.createElement('section');sec.className='r8-section r1063-led-controls';
  const lang=localStorage.getItem('bizet_os_language')==='en';
  sec.innerHTML='<h3>'+(lang?'3D LED brightness':'Яркость LED в 3D')+'</h3>'+
    '<label class="r8-field"><span>'+(lang?'Visual brightness only (0–100%)':'Только визуальная яркость (0–100%)')+'</span>'+
    '<input type="range" id="r1063LedBrightness" min="0" max="100" step="5" value="'+
    clamp(Number(visual().led_brightness_pct_r1063??75),0,100)+'"></label>'+
    '<p>'+(lang?'Lighting in BOM and project cost is independent of this slider.':'Комплектация LED, BOM и цена не зависят от визуальной яркости.')+'</p>';
  panel.append(sec);
  sec.querySelector('input').addEventListener('input',async e=>{
   await rt()?.patchVisual?.({led_brightness_pct_r1063:Number(e.target.value)});
   refresh();
  });
 }
 function refresh(){
  if(refreshing)return;
  const v=viewer(),T=THREE();
  if(!v?.scene||!T)return;
  refreshing=true;
  try{
   // Build everything first. If an extension throws, old renderer stays untouched.
   attached.forEach(n=>{n.parent?.remove(n);n.geometry?.dispose();if(n.material?.userData?.r1063Owned)n.material.dispose()});attached=[];clear(accessories);clear(lights);
   accessories=new T.Group();accessories.name='BIZET_R1063_REAL_HINGES';
   lights=new T.Group();lights.name='BIZET_R1063_LED_PREVIEW';
   const mods=contents(),fronts=readRealFronts(v.scene);
   const byId=new Map(mods.map(m=>[String(m.id),m]));
   let hinges=0;
   for(const front of fronts){
    const module=byId.get(String(front.userData.moduleId));if(!module)continue;
    applyFacade(front,module);
    hinges+=hinge(front,module,accessories);
   }
   // Suppress only the old cosmetic hinge PROXIES for modules with new cups.
   if(hinges){
    v.scene.traverse(o=>{
     if(o.isMesh&&String(o.userData?.cat||'').startsWith('hinge-')&&!String(o.userData?.cat||'').startsWith('r1063-')){
      o.userData.r1063LegacyVisible=o.visible;o.visible=false;
     }
    });
   }
   v.scene.add(accessories);
   const manifest=createLed(lights);v.scene.add(lights);
   const active=v.isLightingVisible?.()!==false;
   lights.visible=active;
   if(!bound&&typeof v.setLightingVisible==='function'){
    const old=v.setLightingVisible.bind(v);
    v.setLightingVisible=on=>{old(on);if(lights)lights.visible=!!on};
    bound=v;
   }
   window.BizetVisualR1063.status={hinges,fronts:fronts.length,
     leds:manifest?.segments?.length||0,thicknessMm:thickness(),
     protectedCore:true,productionReady:false};
  }catch(error){console.error('R1063_PROTECTED_VISUAL_EXTENSION_FAILED',error);
    window.BizetVisualR1063.status={ok:false,error:String(error),protectedCore:true};
    attached.forEach(n=>{n.parent?.remove(n);n.geometry?.dispose();if(n.material?.userData?.r1063Owned)n.material.dispose()});attached=[];clear(accessories);clear(lights);accessories=lights=null;
  }finally{refreshing=false}
 }
 function schedule(){
  if(queued)return;queued=true;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;refresh();addControls()}));
 }
 function init(){
  if(rt()?.ready){
   ['render','patchInputs','patchVisual','patchRoom','applyWorkspaceState'].forEach(name=>{
    const orig=rt()[name];if(typeof orig!=='function'||orig.r1063Wrapped)return;
    const wrapped=function(...args){
     const output=orig.apply(this,args);
     if(output&&typeof output.then==='function')return output.then(result=>{schedule();return result});
     schedule();return output;
    };
    wrapped.r1063Wrapped=true;rt()[name]=wrapped;
   });
  }
  document.addEventListener('click',e=>{
   if(e.target.closest('#workspaceTools [data-panel="upper"]'))requestAnimationFrame(addControls);
   if(e.target.closest('#moduleStrip [data-module]')||e.target.closest('#focusNextModule,#focusPrevModule,#moduleClose'))schedule();
  });
  document.addEventListener('change',e=>{
   if(e.target.closest('#panelBody,#moduleEditPanel'))schedule();
  });
  schedule();
 }
 window.BizetVisualR1063={refresh,schedule,thickness,status:{protectedCore:true,ready:false}};
 window.addEventListener('bizet:modelready',init,{once:true});
})();