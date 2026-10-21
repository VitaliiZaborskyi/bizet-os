/* BIZET OS 10.5.9 — local automatic vertical-plane proposals from a GLB mesh.
   No cloud AI, no fabricated room boundary. These are geometric candidate surfaces,
   not architectural or CNC-certified walls. Works on textured AND clean-wall GLB.
*/
(()=>{'use strict';
const MAX_TRIANGLES=120000,MAX_CANDIDATES=24,OFFSET_STEP=.075,ANGLE_DEG=8;
const vec=(p)=>[p.x,p.y,p.z];
const round=(v,d=4)=>Number(v.toFixed(d));
function analyze(sceneRoot,THREE){
 if(!sceneRoot||!THREE)return {candidates:[],stats:{reason:'NO_MESH'}};
 sceneRoot.updateWorldMatrix(true,true);
 const bins=new Map();
 const point=new THREE.Vector3(),q=new THREE.Vector3(),r=new THREE.Vector3(),v01=new THREE.Vector3(),v02=new THREE.Vector3(),normal=new THREE.Vector3();
 let inspected=0,verticalTriangles=0,totalTri=0,sourceMeshes=0;
 const meshData=[];
 sceneRoot.traverse(obj=>{
  if(!obj.isMesh||!obj.geometry)return;
  const g=obj.geometry,attr=g.getAttribute('position'),idx=g.getIndex();
  if(!attr||attr.count<3)return;
  const total=idx?Math.floor(idx.count/3):Math.floor(attr.count/3);
  totalTri+=total;sourceMeshes++;
  meshData.push({obj,attr,idx,total});
 });
 const stride=Math.max(1,Math.ceil(totalTri/MAX_TRIANGLES));
 for(const {obj,attr,idx,total} of meshData){
  for(let k=0;k<total;k+=stride){
   const ids=idx?[idx.getX(3*k),idx.getX(3*k+1),idx.getX(3*k+2)]:[3*k,3*k+1,3*k+2];
   point.fromBufferAttribute(attr,ids[0]).applyMatrix4(obj.matrixWorld);
   q.fromBufferAttribute(attr,ids[1]).applyMatrix4(obj.matrixWorld);
   r.fromBufferAttribute(attr,ids[2]).applyMatrix4(obj.matrixWorld);
   inspected++;
   v01.subVectors(q,point);v02.subVectors(r,point);normal.crossVectors(v01,v02);
   const area=normal.length()*.5;
   if(!Number.isFinite(area)||area<1e-7||area>10)continue;
   normal.normalize();
   if(Math.abs(normal.y)>.3)continue;
   const length=Math.hypot(normal.x,normal.z);if(length<.95)continue;
   let nx=normal.x/length,nz=normal.z/length;
   if(nx<-.00001||(Math.abs(nx)<.00001&&nz<0)){nx=-nx;nz=-nz;}
   const angle=Math.atan2(nz,nx),offset=nx*point.x+nz*point.z;
   const alpha=Math.round(angle*180/Math.PI/ANGLE_DEG),
      offsetBin=Math.round(offset/OFFSET_STEP),
      key=alpha+':'+offsetBin;
   let bin=bins.get(key);
   if(!bin){
    bin={nx,nz,offset,area:0,triangles:0,lo:Infinity,hi:-Infinity,minY:Infinity,maxY:-Infinity,
     dot:0,dx:0,dz:0};
    bins.set(key,bin);
   }
   const tx=-nz,tz=nx;
   for(const v of [point,q,r]){
    const u=v.x*tx+v.z*tz;
    bin.lo=Math.min(bin.lo,u);bin.hi=Math.max(bin.hi,u);
    bin.minY=Math.min(bin.minY,v.y);bin.maxY=Math.max(bin.maxY,v.y);
   }
   bin.nx+=nx*area;bin.nz+=nz*area;bin.dot+=offset*area;
   bin.area+=area;bin.triangles++;verticalTriangles++;
  }
 }
 const candidates=[];
 for(const b of bins.values()){
  const len=b.hi-b.lo,height=b.maxY-b.minY;
  if(len<.65||height<.9||b.area<.24||b.triangles<3)continue;
  const nx=b.nx/Math.hypot(b.nx,b.nz),nz=b.nz/Math.hypot(b.nx,b.nz);
  const dist=b.dot/b.area,tx=-nz,tz=nx;
  const from=[round(nx*dist+tx*b.lo),round(nz*dist+tz*b.lo)];
  const to=[round(nx*dist+tx*b.hi),round(nz*dist+tz*b.hi)];
  const completeness=Math.min(1,b.area/Math.max(.15,len*height));
  const quality=Math.min(.95,Math.max(.15,completeness*.85));
  candidates.push({
    id:'plane-'+candidates.length,
    from,to,base_y:round(b.minY),height_m:round(height),
    length_m:round(len),estimated_mm:Math.round(len*1000),
    confidence:round(quality,2),support_area_m2:round(b.area,3),
    triangles:b.triangles,source:'LOCAL_MESH_VERTICAL_PLANE_PROPOSAL',
    verified:false
  });
 }
 candidates.sort((a,b)=>b.support_area_m2-a.support_area_m2);
 // Small different normal bins may trace the same wall, keep strongest.
 const distinct=[];
 for(const c of candidates){
  const ux=c.to[0]-c.from[0],uz=c.to[1]-c.from[1],dl=Math.hypot(ux,uz);
  if(!dl)continue;
  const cx=(c.from[0]+c.to[0])/2,cz=(c.from[1]+c.to[1])/2;
  const duplic=distinct.some(p=>{
   const vx=p.to[0]-p.from[0],vz=p.to[1]-p.from[1],pl=Math.hypot(vx,vz);
   const cosine=Math.abs((ux*vx+uz*vz)/(dl*pl));
   const signedDist=Math.abs((cx-p.from[0])*(-vz/pl)+(cz-p.from[1])*(vx/pl));
   const along=Math.abs((cx-(p.from[0]+p.to[0])/2)*(vx/pl)+(cz-(p.from[1]+p.to[1])/2)*(vz/pl));
   return cosine>.976&&signedDist<.13&&along<(dl+pl)/4;
  });
  if(!duplic){c.id='S'+String(distinct.length+1);distinct.push(c)}
  if(distinct.length>=MAX_CANDIDATES)break;
 }
 return {
  candidates:distinct,
  stats:{source_meshes:sourceMeshes,source_triangles:totalTri,inspected_triangles:inspected,
   vertical_triangle_samples:verticalTriangles,plane_bins:bins.size,
   candidate_count:distinct.length,semantic_status:'GEOMETRY_PROPOSALS_UNVERIFIED'}
 };
}
window.BizetScanAutoR1059=Object.freeze({version:'R10.5.9',analyze});
})();