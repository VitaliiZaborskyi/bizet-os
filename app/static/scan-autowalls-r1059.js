/* BIZET OS R10.5.9 — deterministic client-only vertical-plane detector.
 * Non-AI candidate extraction from textured or wall-only GLB meshes. EVERY
 * candidate is unverified and must be reviewed against the actual room.
 * No provider keys, server storage, machining, BOM or canonical room edits.
 */
(()=>{'use strict';
function analyze(root,group,THREE){
 if(!root||!THREE)return[];
 root.updateMatrixWorld(true);group.updateMatrixWorld(true);
 const toLocal=new THREE.Matrix4().copy(group.matrixWorld).invert();
 const p=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
 const v=[new THREE.Vector3(),new THREE.Vector3()],cross=new THREE.Vector3();
 const bins=new Map();let budget=27000,triSeen=0,valid=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||budget<=0)return;
  const attr=mesh.geometry?.getAttribute?.('position');if(!attr||attr.count<3)return;
  const idx=mesh.geometry.index,triCount=Math.floor((idx?idx.count:attr.count)/3);
  const stride=Math.max(1,Math.ceil(triCount/Math.max(1,budget)));
  for(let t=0;t<triCount&&budget>0;t+=stride,budget--){
   triSeen++;
   for(let k=0;k<3;k++){
    const i=idx?idx.getX(3*t+k):3*t+k;
    p[k].fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toLocal);
   }
   v[0].subVectors(p[1],p[0]);v[1].subVectors(p[2],p[0]);cross.crossVectors(v[0],v[1]);
   const area=.5*cross.length();
   if(area<.001||!Number.isFinite(area))continue;
   const nx=cross.x/cross.length(),ny=cross.y/cross.length(),nz=cross.z/cross.length();
   if(Math.abs(ny)>.26)continue; // floor/sloping surfaces cannot be walls
   const len=Math.hypot(nx,nz);if(len<.85)continue;
   let vx=nx/len,vz=nz/len;
   if(vx<-.0001||(Math.abs(vx)<.0001&&vz<0)){vx=-vx;vz=-vz;}
   const angle=Math.atan2(vz,vx),qAngle=Math.round(angle/(Math.PI/36)); // 5 degrees
   const a=qAngle*(Math.PI/36),ax=Math.cos(a),az=Math.sin(a);
   const mid=p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1/3);
   const d=Math.round((mid.x*ax+mid.z*az)/.065); // ~65 mm plane tolerance
   const key=qAngle+':'+d;
   let bin=bins.get(key);
   if(!bin){bin={angle:a,offset:d*.065,tris:[],support:0};bins.set(key,bin);}
   const tx=-az,tz=ax;
   const tt=p.map(pt=>pt.x*tx+pt.z*tz);
   const lo=Math.min(...tt),hi=Math.max(...tt);
   const bottom=Math.min(...p.map(pt=>pt.y)),top=Math.max(...p.map(pt=>pt.y));
   bin.tris.push({lo,hi,bottom,top,area});
   bin.support+=area;valid++;
  }
 });
 const candidates=[];
 for(const bin of bins.values()){
  if(bin.support<.48)continue;
  const sorted=bin.tris.sort((a,b)=>a.lo-b.lo);
  const clusters=[];
  for(const tri of sorted){
   let last=clusters[clusters.length-1];
   if(!last||tri.lo>last.hi+.22){
    last={lo:tri.lo,hi:tri.hi,bottom:tri.bottom,top:tri.top,area:0,count:0};clusters.push(last);
   }
   last.hi=Math.max(last.hi,tri.hi);last.bottom=Math.min(last.bottom,tri.bottom);last.top=Math.max(last.top,tri.top);last.area+=tri.area;last.count++;
  }
  const n=[Math.cos(bin.angle),Math.sin(bin.angle)],dir=[-n[1],n[0]];
  for(const cl of clusters){
   const length=cl.hi-cl.lo,height=cl.top-cl.bottom;
   if(length<.46||height<.65||cl.area<.35)continue;
   const p1=[bin.offset*n[0]+cl.lo*dir[0],bin.offset*n[1]+cl.lo*dir[1]];
   const p2=[bin.offset*n[0]+cl.hi*dir[0],bin.offset*n[1]+cl.hi*dir[1]];
   candidates.push({
    points:[p1,p2].map(p=>p.map(v=>+v.toFixed(5))),
    bottom:+cl.bottom.toFixed(4),top:+cl.top.toFixed(4),
    height:+height.toFixed(4),length:+length.toFixed(4),
    support:+cl.area.toFixed(3),
    confidence:cl.area>2&&cl.count>=3?'HIGH':'REVIEW',
    source:'MESH_VERTICAL_PLANE_CANDIDATE_UNVERIFIED'
   });
  }
 }
 candidates.sort((a,b)=>b.support-a.support);
 const picked=[];
 for(const c of candidates){
  const mx=(c.points[0][0]+c.points[1][0])/2,mz=(c.points[0][1]+c.points[1][1])/2;
  const dir=[(c.points[1][0]-c.points[0][0])/c.length,(c.points[1][1]-c.points[0][1])/c.length];
  if(picked.some(prev=>{
   const pmx=(prev.points[0][0]+prev.points[1][0])/2,pmz=(prev.points[0][1]+prev.points[1][1])/2;
   const pd=[(prev.points[1][0]-prev.points[0][0])/prev.length,(prev.points[1][1]-prev.points[0][1])/prev.length];
   return Math.abs(Math.abs(pd[0]*dir[0]+pd[1]*dir[1])-1)<.025&&Math.hypot(mx-pmx,mz-pmz)<.14&&Math.abs(prev.length-c.length)<.30;
  }))continue;
  picked.push(c);if(picked.length>=32)break;
 }
 return picked;
}
function overlay(group,THREE,candidates,selectedIndex){
 const g=new THREE.Group();g.name='BIZET_R1059_AUTO_WALL_CANDIDATES';
 for(let i=0;i<candidates.length;i++){
  const c=candidates[i],dx=c.points[1][0]-c.points[0][0],dz=c.points[1][1]-c.points[0][1];
  const length=Math.hypot(dx,dz),height=Math.max(.35,c.height||1.7),angle=Math.atan2(-dz,dx);
  const red=i===selectedIndex?0xf33d44:0xdd856d;
  const vertical=new THREE.Mesh(new THREE.BoxGeometry(length,.015,Math.max(.012,height)),new THREE.MeshBasicMaterial({
    color:red,transparent:true,opacity:i===selectedIndex?.43:.11,side:THREE.DoubleSide,depthWrite:false
  }));
  // Plane uses local X along the segment, local Y world-up after rotation.
  // PlaneGeometry is easier to orient precisely than depth/height swapped box.
  vertical.geometry.dispose();vertical.geometry=new THREE.PlaneGeometry(length,height);
  vertical.material.depthTest=false;
  vertical.position.set((c.points[0][0]+c.points[1][0])/2,c.bottom+height/2,(c.points[0][1]+c.points[1][1])/2);
  vertical.rotation.y=angle;
  vertical.renderOrder=13;vertical.userData.scanAutoWallIndex=i;
  g.add(vertical);
  const line=new THREE.Mesh(new THREE.PlaneGeometry(length,Math.max(.075,length*.015)),
   new THREE.MeshBasicMaterial({color:red,transparent:true,opacity:i===selectedIndex?.9:.28,side:THREE.DoubleSide,depthWrite:false,depthTest:false}));
  line.rotation.x=-Math.PI/2;line.rotation.z=angle;
  line.position.set(vertical.position.x,c.bottom+.035,vertical.position.z);
  line.renderOrder=14;line.userData.scanAutoWallIndex=i;g.add(line);
 }
 group.add(g);return g;
}
window.BizetScanAutoWallsR1059={analyze,overlay,version:'PRELIMINARY_DETERMINISTIC_MESH_PLANES'};
})();