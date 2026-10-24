/* BIZET OS 10.6.3 — drawing data extracted from the ALREADY RUNNING 10.6.0 renderer.
 * No renderer creation, no camera replacement, no mutation of manufacturing state.
 * Captures are explicitly FOR APPROVAL / NOT PRODUCTION. */
(()=>{'use strict';
 const T=()=>window.THREE,v=()=>window.BizetKitchenWebGL,rt=()=>window.BizetModelRuntime;
 function candidates(){
  const viewer=v(),r=rt(),ids=new Set((r?.getModules?.()||[]).map(m=>String(m.id)));
  const meshes=[];viewer?.scene?.updateMatrixWorld(true);
  viewer?.scene?.traverse(n=>{
   if(!n.isMesh||!n.geometry?.attributes?.position)return;
   const id=String(n.userData?.moduleId??'');
   if(ids.has(id)||/(worktop|plinth|end-panel|front|handle)/i.test(String(n.userData?.cat||'')))meshes.push(n);
  });return meshes;
 }
 function isometric(){
  const viewer=v(),THREE=T();if(!viewer?.scene||!viewer?.renderer||!THREE)return null;
  const selected=candidates();if(!selected.length)return null;
  const box=new THREE.Box3();selected.forEach(n=>box.expandByObject(n));
  if(box.isEmpty())return null;
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const dir=new THREE.Vector3(1,.84,-1).normalize(),old=viewer.scene.background;
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,1,100000);
  camera.position.copy(center).addScaledVector(dir,20000);camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const corners=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])
   corners.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const minX=Math.min(...corners.map(q=>q.x)),maxX=Math.max(...corners.map(q=>q.x)),
    minY=Math.min(...corners.map(q=>q.y)),maxY=Math.max(...corners.map(q=>q.y));
  const dom=viewer.renderer.domElement,aspect=Math.max(.3,dom.width/dom.height||1);
  const halfHeight=Math.max(250,(maxY-minY)*.57,(maxX-minX)*.57/aspect);
  camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;
  camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
  // Draw ONLY current furniture (not walls/floor/annotations) and restore before return.
  const keep=new Set(selected),vis=[];
  viewer.scene.traverse(n=>{
   if(n.isMesh&&!keep.has(n)){vis.push([n,n.visible]);n.visible=false}
  });
  let result=null;
  try{
   viewer.scene.background=new THREE.Color(0xffffff);
   viewer.renderer.render(viewer.scene,camera);
   result=dom.toDataURL('image/png');
   if(!result.startsWith('data:image/png')||result.length<5000)result=null;
  }catch(e){console.error('R1063_ISOMETRIC_NONDESTRUCTIVE_CAPTURE_FAILED',e)}
  finally{
   viewer.scene.background=old;
   vis.forEach(([n,s])=>n.visible=s);
   try{viewer.renderer.render(viewer.scene,viewer.camera)}catch(e){console.error('R1063_SCENE_RESTORE_FAILED',e)}
  }
  return result;
 }
 function sectionSlices(){
  const viewer=v(),modules=rt()?.getModules?.()||[],room=rt()?.getRoom?.()||{};
  if(!viewer?.scene||!modules.length)return[];
  const THREE=T();if(!THREE)return[];
  const world=Number(room.lengthMm||6000)/2,depth=Number(room.depthMm||4200)/2;
  const mesh=candidates(),sections=[];
  for(const module of modules.filter(m=>m.wall==='A'&&!m.freestanding).slice(0,32)){
   const plane=Number(module.x)+Number(module.w)/2-world,segments=[];
   for(const n of mesh){
    if(String(n.userData?.moduleId)!==String(module.id))continue;
    const pos=n.geometry?.attributes?.position,idx=n.geometry?.getIndex?.();
    if(!pos||pos.count>100000)continue;
    const tri=Math.floor((idx?.count||pos.count)/3);
    const vertex=i=>new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld);
    for(let j=0;j<tri;j++){
     const vertices=[0,1,2].map(k=>vertex(idx?idx.getX(j*3+k):j*3+k)),hits=[];
     for(let k=0;k<3;k++){
      const p=vertices[k],q=vertices[(k+1)%3],dp=p.x-plane,dq=q.x-plane;
      if(dp*dq>0||Math.abs(dp-dq)<1e-7)continue;
      const fraction=dp/(dp-dq);if(fraction<0||fraction>1)continue;
      const hit=p.clone().lerp(q,fraction);
      if(!hits.some(v=>v.distanceToSquared(hit)<.01))hits.push(hit);
     }
     if(hits.length>=2){
      const [a,b]=hits;
      segments.push({depth0:a.z+depth,height0:a.y,depth1:b.z+depth,height1:b.y,
       cat:n.userData?.cat||'cabinet',module_id:module.id,source:'TRIANGLE_MESH_CUT'});
     }
     if(segments.length>=5000)break;
    }
    if(segments.length>=5000)break;
   }
   sections.push({module_id:module.id,number:module.number||module.id,
     plane_x_mm:Number(module.x)+Number(module.w)/2,
     section_segments:segments,has_geometry:segments.length>0,measured:true});
  }
  return sections;
 }
 window.BizetApprovalCaptureR1063={isometric,sectionSlices,version:'R10.6.3',productionReady:false};
})();