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
  const selected=candidates().filter(n=>n.visible!==false);
  if(!selected.length)return null;
  viewer.scene.updateMatrixWorld(true);
  const box=new THREE.Box3();selected.forEach(n=>box.expandByObject(n));
  if(box.isEmpty())return null;
  const center=box.getCenter(new THREE.Vector3());
  // Print-specific camera and WebGLRenderTarget, never create a second WebGL context.
  const width=768,height=1032,aspect=width/height;
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,1,100000);
  camera.position.copy(center).add(new THREE.Vector3(9000,7200,-11000));
  camera.lookAt(center);camera.updateMatrixWorld(true);
  const corners=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])
    corners.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const minX=Math.min(...corners.map(q=>q.x)),maxX=Math.max(...corners.map(q=>q.x));
  const minY=Math.min(...corners.map(q=>q.y)),maxY=Math.max(...corners.map(q=>q.y));
  const halfH=Math.max(120,(maxY-minY)*.535,(maxX-minX)*.535/aspect);
  camera.left=-halfH*aspect;camera.right=halfH*aspect;
  camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();
  const renderer=viewer.renderer,oldTarget=renderer.getRenderTarget(),oldBg=viewer.scene.background;
  const oldViewport=renderer.getViewport(new THREE.Vector4()),oldScissor=renderer.getScissor(new THREE.Vector4()),
   oldScissorTest=renderer.getScissorTest();
  const vis=[],keep=new Set(selected),pixel=new Uint8Array(width*height*4);
  let target=null,result=null;
  try{
   viewer.scene.traverse(n=>{
    if((n.isMesh||n.isSprite||n.isLine||n.isPoints)&&!keep.has(n)){vis.push([n,n.visible]);n.visible=false}
   });
   viewer.scene.background=new THREE.Color(0xffffff);
   target=new THREE.WebGLRenderTarget(width,height,{depthBuffer:true,stencilBuffer:false});
   renderer.setRenderTarget(target);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);
   renderer.render(viewer.scene,camera);
   renderer.readRenderTargetPixels(target,0,0,width,height,pixel);
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d');
   const frame=ctx.createImageData(width,height);
   for(let y=0;y<height;y++)frame.data.set(pixel.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);
   ctx.putImageData(frame,0,0);
   result=canvas.toDataURL('image/png');
   if(result.length<5000)result=null;
  }catch(error){console.error('R1065_PRINT_CAPTURE_FAILED',error);result=null}
  finally{
   renderer.setRenderTarget(oldTarget);
   renderer.setViewport(oldViewport);
   renderer.setScissor(oldScissor);renderer.setScissorTest(oldScissorTest);
   viewer.scene.background=oldBg;vis.forEach(([n,visible])=>{n.visible=visible});
   target?.dispose();
   try{renderer.render(viewer.scene,viewer.camera)}catch(error){console.warn('R1065_RESTORE_VIEWER',error)}
  }
  return result;
 }
 function snapshot(modules,room){
  const data={modules:JSON.parse(JSON.stringify(modules||rt()?.getModules?.()||[])),
   room:JSON.parse(JSON.stringify(room||rt()?.getRoom?.()||{})),
   inputs:JSON.parse(JSON.stringify(rt()?.getInputs?.()||{})),
   visual:JSON.parse(JSON.stringify(rt()?.getVisual?.()||{})),
   units:'mm',source:'CURRENT_ENGINEERING_STATE',forApprovalOnly:true};
  const serialized=JSON.stringify(data);
  let h=2166136261;
  for(let i=0;i<serialized.length;i++){h^=serialized.charCodeAt(i);h=Math.imul(h,16777619)}
  data.stateHash='R1065-'+(h>>>0).toString(16).padStart(8,'0');
  return Object.freeze(data);
 }
 function sectionSlices(modulesArg,roomArg){
  const viewer=v(),modules=modulesArg||rt()?.getModules?.()||[],room=roomArg||rt()?.getRoom?.()||{};
  if(!viewer?.scene||!modules.length)return[];
  const THREE=T();if(!THREE)return[];
  viewer.scene.updateMatrixWorld(true);
  const L=Number(room.lengthMm||6000),D=Number(room.depthMm||4200);
  const all=candidates().filter(n=>n.geometry?.attributes?.position);
  const results=[];
  // Centre plane for carcass and assembly; real leg plane through 16% width,
  // otherwise the usual centre plane never intersects physically offset feet.
  for(const m of modules.filter(q=>q.wall==='A'&&!q.freestanding&&q.kind!=='FILLER').slice(0,64)){
   for(const role of ['ASSEMBLY','FOOT']){
    const x=Number(m.x)+(role==='FOOT'?Number(m.w)*.16:Number(m.w)/2)-L/2;
    const minY=Number(m.y)-D/2-125,maxY=Number(m.y)+Number(m.d)-D/2+125;
    const minZ=-12,maxZ=Number(m.z)+Number(m.h)+140;
    const segments=[],seen=new Set(),flags=[];
    for(const n of all){
     if(!n.visible)continue;
     const cat=String(n.userData?.cat||'');
     const own=String(n.userData?.moduleId||'')===String(m.id);
     const common=/(worktop|plinth|foot|end-panel|carcass|front|body|handle|shelf)/i.test(cat);
     if(!own&&!common)continue;
     const bbox=new THREE.Box3().setFromObject(n);
     if(bbox.max.x<x-.01||bbox.min.x>x+.01||bbox.max.z<minY||bbox.min.z>maxY||bbox.max.y<minZ||bbox.min.y>maxZ)continue;
     const geometry=n.geometry,pos=geometry.attributes.position,ind=geometry.getIndex?.();
     const tri=Math.floor((ind?.count||pos.count)/3);
     if(tri>100000){flags.push('TRIANGLE_BUDGET:'+cat);continue}
     const vertex=i=>new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld);
     for(let k=0;k<tri;k++){
      const pts=[0,1,2].map(j=>vertex(ind?ind.getX(k*3+j):k*3+j)),cross=[];
      for(let j=0;j<3;j++){
       const p=pts[j],q=pts[(j+1)%3],d0=p.x-x,d1=q.x-x;
       if(Math.abs(d0-d1)<1e-7)continue;
       const t=d0/(d0-d1);if(t<0||t>1)continue;
       const hit=p.clone().lerp(q,t);
       if(!cross.some(v=>v.distanceToSquared(hit)<.0025))cross.push(hit);
      }
      if(cross.length<2)continue;
      const p=cross[0],q=cross[1];
      const z0=p.z+D/2,z1=q.z+D/2,h0=p.y,h1=q.y;
      if(Math.abs(z0-z1)<.02&&Math.abs(h0-h1)<.02)continue;
      const key=[z0,h0,z1,h1].map(v=>Math.round(v*10)).join(','),
        reverse=[z1,h1,z0,h0].map(v=>Math.round(v*10)).join(',');
      if(seen.has(key)||seen.has(reverse))continue;
      seen.add(key);
      segments.push({depth0:z0,height0:h0,depth1:z1,height1:h1,
       cat,module_id:m.id,part_id:n.userData?.partRole||n.userData?.moduleId||cat,
       source:'LIVE_THREE_TRIANGLE_CUT',productionReady:n.userData?.productionProxy!==false});
      if(segments.length>=7500){flags.push('SEGMENT_BUDGET');break}
     }
     if(segments.length>=7500)break;
    }
    results.push({module_id:m.id,number:m.number||m.id,role,
     plane_x_mm:Math.round(x+L/2),section_segments:segments,
     has_geometry:segments.length>0,measured:segments.length>0&&flags.length===0,
     unverified:flags.length>0||!segments.length,flags});
   }
  }
  return results;
 }
 window.BizetApprovalCaptureR1065={isometric,sectionSlices,snapshot,version:'R10.6.5',productionReady:false};
})();