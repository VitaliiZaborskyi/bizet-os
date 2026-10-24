/* R10.6.3 approval scene bridge: READ the verified live THREE scene.
 * A second WebGLRenderer / second GPU context is FORBIDDEN.
 * All temporary render-target, visibility and color state restored in finally.
 */
(()=>{'use strict';
 const api=()=>window.BizetKitchenWebGL;
 const currentIds=()=>new Set((window.BizetModelRuntime?.getModules?.()||[]).map(m=>String(m.id)));
 function sceneBox(viewer,THREE){
  const ids=currentIds(),box=new THREE.Box3(),item=new THREE.Box3();let found=0;
  viewer.scene.updateMatrixWorld(true);
  viewer.scene.traverse(node=>{
   if(!node.isMesh||!ids.has(String(node.userData?.moduleId||'')))return;
   item.setFromObject(node);if(!item.isEmpty()){box.union(item);found++}
  });
  return found?box:null;
 }
 function iso(){
  const viewer=api(),THREE=window.THREE;if(!viewer?.renderer||!THREE)return null;
  const bbox=sceneBox(viewer,THREE);if(!bbox)return null;
  const center=bbox.getCenter(new THREE.Vector3()),cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100000),
    direction=new THREE.Vector3(.72,.9,-1.15).normalize();
  cam.position.copy(center).addScaledVector(direction,15000);cam.lookAt(center);cam.updateMatrixWorld(true);
  const projected=[];
  for(const x of [bbox.min.x,bbox.max.x])
   for(const y of [bbox.min.y,bbox.max.y])
    for(const z of [bbox.min.z,bbox.max.z])
     projected.push(new THREE.Vector3(x,y,z).applyMatrix4(cam.matrixWorldInverse));
  const W=960,H=760,ratio=W/H,spreadX=Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)),
    spreadY=Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y)),
    half=Math.max(270,spreadY/.90/2,spreadX/.90/ratio/2);
  cam.left=-half*ratio;cam.right=half*ratio;cam.top=half;cam.bottom=-half;cam.updateProjectionMatrix();
  const renderer=viewer.renderer,scene=viewer.scene;
  const groupVisibility=scene.children.filter(c=>c.isGroup).map(g=>[g,g.visible]);
  const oldBackground=scene.background,oldTarget=renderer.getRenderTarget();
  let target=null;
  try{
    // From actual 3D, no hidden room lines or geometry proxies from other projects.
    groupVisibility.forEach(([group,v],i)=>{if(i===0||i===3||i===4)group.visible=false});
    scene.background=new THREE.Color(0xffffff);
    target=new THREE.WebGLRenderTarget(W,H,{depthBuffer:true,stencilBuffer:false});
    renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,cam);
    const bytes=new Uint8Array(W*H*4);
    renderer.readRenderTargetPixels(target,0,0,W,H,bytes);
    const buffer=document.createElement('canvas');buffer.width=W;buffer.height=H;
    const ctx=buffer.getContext('2d',{willReadFrequently:true});
    const img=ctx.createImageData(W,H);
    // Flip WebGL bottom-origin rows into an ordinary PNG for vector PDF composition.
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=(y*W+x)*4,j=((H-1-y)*W+x)*4;
      img.data[j]=bytes[i];img.data[j+1]=bytes[i+1];img.data[j+2]=bytes[i+2];img.data[j+3]=255;
    }
    ctx.putImageData(img,0,0);
    return buffer.toDataURL('image/png');
  }catch(e){console.error('R1063_REAL_ISOMETRIC_CAPTURE_FAILED',e);return null}
  finally{
    renderer.setRenderTarget(oldTarget);
    groupVisibility.forEach(([g,visible])=>g.visible=visible);
    scene.background=oldBackground;target?.dispose();
  }
 }
 function slices(){
  const viewer=api(),THREE=window.THREE,rt=window.BizetModelRuntime;
  const room=rt?.getRoom?.()||{},modules=rt?.getModules?.()||[];
  if(!viewer?.scene||!THREE)return[];
  viewer.scene.updateMatrixWorld(true);
  const L=Number(room.lengthMm)||6000,D=Number(room.depthMm)||4200;
  const output=[];
  for(const module of modules.filter(m=>m.wall==='A'&&!m.freestanding).slice(0,30)){
    const plane=Number(module.x)+Number(module.w)/2-L/2,segments=[];
    viewer.scene.traverse(node=>{
      if(!node.isMesh||!node.geometry?.attributes?.position)return;
      const id=String(node.userData?.moduleId||''),kind=String(node.userData?.cat||'');
      if(id!==String(module.id)&&!['worktop','plinth','r1063-scan-wall'].includes(kind))return;
      const bounds=new THREE.Box3().setFromObject(node);
      if(plane<bounds.min.x-.3||plane>bounds.max.x+.3)return;
      const geo=node.geometry,idx=geo.index,pos=geo.attributes.position;
      if(pos.count>150000)return;
      const get=k=>new THREE.Vector3().fromBufferAttribute(pos,k).applyMatrix4(node.matrixWorld);
      const triangles=Math.min(25000,Math.floor((idx?idx.count:pos.count)/3));
      for(let i=0;i<triangles;i++){
        const verts=[0,1,2].map(j=>get(idx?idx.getX(i*3+j):i*3+j)),hits=[];
        for(let j=0;j<3;j++){
          const a=verts[j],b=verts[(j+1)%3],da=a.x-plane,db=b.x-plane;
          if(Math.abs(da)<.001&&Math.abs(db)<.001||da*db>0)continue;
          const t=Math.abs(da-db)<1e-9?0:da/(da-db);
          if(t<0||t>1)continue;
          const p=a.clone().lerp(b,t);
          if(!hits.some(q=>q.distanceToSquared(p)<.1))hits.push(p);
        }
        if(hits.length===2){
          segments.push({depth0:hits[0].z+D/2,height0:hits[0].y,
           depth1:hits[1].z+D/2,height1:hits[1].y,
           cat:kind,source:'LIVE_TRIANGLE_MESH_INTERSECTION',module_id:module.id});
        }
      }
    });
    output.push({module_id:module.id,number:module.number,plane_x_mm:Number(module.x)+Number(module.w)/2,
      section_segments:segments.slice(0,4500),has_geometry:segments.length>0,production_ready:false});
  }
  return output;
 }
 window.BizetApprovalSceneR1063={iso,slices};
})();