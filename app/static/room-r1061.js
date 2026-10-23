/* BIZET OS 10.6.1 - scan remains unverified until real measurement / author sign-off. */
(()=>{'use strict';
 let selected=0,draft=null;
 const copy=v=>JSON.parse(JSON.stringify(v));
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function source(v){
  if(v?.scan_import_r1060?.walls?.length)return 'SCAN';
  if(v?.room_import?.source==='FILE')return 'FILE';
  return 'TEMPLATE';
 }
 function live(v){return source(v)==='SCAN'?(draft||v.scan_import_r1060):null}
 function primary(s){
  if(!s?.walls?.length)return null;
  return s.walls.find(w=>w.id===s.primary_wall_id)||
   [...s.walls].filter(w=>w.kind==='PRIMARY_WALL').sort((a,b)=>length(b)-length(a))[0]||
   [...s.walls].sort((a,b)=>length(b)-length(a))[0];
 }
 function length(w){return Math.hypot(Number(w.x2_mm)-Number(w.x1_mm),Number(w.z2_mm)-Number(w.z1_mm))}
 function room(v){
  const s=live(v),p=primary(s);if(!p)return null;
  const len=length(p);if(!Number.isFinite(len)||len<300)return null;
  const ux=(p.x2_mm-p.x1_mm)/len,uz=(p.z2_mm-p.z1_mm)/len;
  const mx=(Number(p.x1_mm)+Number(p.x2_mm))/2,mz=(Number(p.z1_mm)+Number(p.z2_mm))/2;
  const along=pt=>(pt[0]-mx)*ux+(pt[1]-mz)*uz;
  const behind=pt=>(pt[0]-mx)*(-uz)+(pt[1]-mz)*ux;
  const points=s.walls.flatMap(w=>[[Number(w.x1_mm),Number(w.z1_mm)],[Number(w.x2_mm),Number(w.z2_mm)]]);
  const depths=points.map(behind);const spread=Math.max(...depths)-Math.min(...depths);
  const available=spread>=900&&spread<=30000?Math.round(spread):null;
  return {lengthMm:Math.round(len),depthMm:available||4200,heightMm:Math.round(Math.max(2000,...s.walls.map(w=>Number(w.height_mm)||2800))),
   frame:{ux,uz,mx,mz,depthOrigin:available?Math.min(...depths): -4200,along,behind},
   primary:p,source:'SCAN',provisional:!available,rotation_deg:Number(s.rotation_deg)||0};
 }
 function bend(w,x,h){
  const c=w.curve_mm||{},t=clamp(h/Math.max(1,Number(w.height_mm)||2800),0,1);
  const top=Number(c.top)||0,mid=Number(c.middle)||0,bottom=Number(c.bottom)||0;
  return Math.sin(Math.PI*clamp(x,0,1))*(t<.5?bottom+(mid-bottom)*2*t:mid+(top-mid)*(2*t-1));
 }
 function renderWalls({THREE,group,visual}){
  const g=room(visual),s=live(visual);if(!g||!s)return 0;
  const {frame,lengthMm,depthMm}=g;
  s.walls.forEach((w,i)=>{
   const a=[Number(w.x1_mm),Number(w.z1_mm)],b=[Number(w.x2_mm),Number(w.z2_mm)];
   const x1=frame.along(a),x2=frame.along(b),z1=depthMm/2-(frame.behind(a)-frame.depthOrigin),z2=depthMm/2-(frame.behind(b)-frame.depthOrigin);
   const len=Math.hypot(x2-x1,z2-z1),h=Number(w.height_mm)||2800,t=clamp(Number(w.thickness_mm)||100,20,1000);
   if(![x1,x2,z1,z2,len,h].every(Number.isFinite)||len<100||len>30000||h<200||h>10000)return;
   const geo=new THREE.BoxGeometry(len,h,t,24,12,1);
   const pos=geo.attributes.position;
   for(let j=0;j<pos.count;j++){const x=pos.getX(j),y=pos.getY(j);
     pos.setZ(j,pos.getZ(j)+bend(w,(x+len/2)/len,y+h/2));}
   pos.needsUpdate=true;geo.computeVertexNormals();
   const chosen=i===selected,mat=new THREE.MeshStandardMaterial({color:chosen?0xe97674:0xb53b3b,transparent:true,opacity:chosen?.7:.35,depthWrite:false,side:THREE.DoubleSide});
   mat.userData.owned=true;
   const mesh=new THREE.Mesh(geo,mat);mesh.rotation.y=-Math.atan2(z2-z1,x2-x1);
   mesh.position.set((x1+x2)/2,h/2,(z1+z2)/2);
   mesh.userData={cat:'scan-wall-r1061',scanWallIndex:i,wallId:w.id,productionReady:false};
   group.add(mesh);
   const border=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:chosen?0x1475ee:0x902326}));
   border.userData={scanWallIndex:i};mesh.add(border);
   if(chosen)[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]].forEach(([x,y])=>{
    const c=new THREE.Mesh(new THREE.SphereGeometry(14,10,8),new THREE.MeshBasicMaterial({color:0x1475ee,depthTest:false}));
    c.position.set(x*len/2,y*h/2,t/2+bend(w,(x+1)/2,(y+1)*h/2)+10);mesh.add(c);
   });
  });
  return s.walls.length;
 }
 async function save(rt,scan){const s=copy(scan);s.status='PRELIMINARY_UNVERIFIED';s.production_ready=false;
  s.export_stop='STOP_UNCONFIRMED_SCANNED_GEOMETRY';await rt.patchVisual({scan_import_r1060:s});draft=null}
 function choose(i){selected=i;draft=null;window.dispatchEvent(new CustomEvent('bizet:scan-wall-selected',{detail:{index:i}}))}
 function markup(v,lang){
  const src=source(v),en=lang==='en';const t=(ru,eng)=>en?eng:ru;
  if(src==='FILE')return '<section class="r8-section"><h3>'+t('Геометрия импортированного файла','Imported file geometry')+'</h3><p>'+t('Редактирование файла выполняется через калибровку ниже.','Use calibration controls below to edit imported geometry.')+'</p></section>';
  if(src!=='SCAN')return '';
  const s=live(v),w=s.walls[clamp(selected,0,s.walls.length-1)],cv=w.curve_mm||{};
  const slider=(k,ru,eng)=>'<label class="r1061-curve-range"><span>'+t(ru,eng)+'</span><input type="range" min="-150" max="150" step="1" data-r1061-curve="'+k+'" value="'+(Number(cv[k])||0)+'"><output>'+(Number(cv[k])||0)+' mm</output></label>';
  return '<section class="r8-section r1061-room"><h3>'+t('Стены реального скана','Real scan walls')+'</h3>'+
   '<p class="r1061-notice">'+t('Предварительные размеры · производство STOP','Unverified dimensions · manufacturing STOP')+'</p>'+
   '<label class="r8-field"><span>'+t('Стена','Wall')+'</span><select id="r1061Select">'+s.walls.map((z,i)=>'<option value="'+i+'" '+(i===selected?'selected':'')+'>'+esc(z.label||'W'+i)+'</option>').join('')+'</select></label>'+
   '<label class="r8-field"><span>'+t('Основная стена','Primary wall')+'</span><select id="r1061Primary">'+s.walls.map(z=>'<option value="'+esc(z.id)+'" '+(primary(s)?.id===z.id?'selected':'')+'>'+esc(z.label||z.id)+'</option>').join('')+'</select></label>'+
   '<label class="r8-field"><span>'+t('Длина стены, мм','Wall length, mm')+'</span><input id="r1061Length" type="number" min="100" max="30000" value="'+Math.round(length(w))+'"></label>'+
   '<label class="r8-field"><span>'+t('Высота, мм','Height, mm')+'</span><input id="r1061Height" type="number" min="200" max="10000" value="'+Number(w.height_mm||2800)+'"></label>'+
   '<label class="r8-field"><span>'+t('Толщина стены, мм','Wall thickness, mm')+'</span><input id="r1061Thickness" type="number" min="20" max="1000" value="'+Number(w.thickness_mm||100)+'"></label>'+
   '<label class="r8-field"><span>'+t('Повернуть помещение, °','Rotate room, °')+'</span><input id="r1061Rotation" type="range" min="-180" max="180" value="'+Number(s.rotation_deg||0)+'"><output id="r1061RotationText">'+Number(s.rotation_deg||0)+'°</output></label>'+
   '<details class="r1061-curve"><summary>'+t('Кривая стена · 8 контрольных точек','Curved wall · 8 control points')+'</summary>'+
   slider('top','Верхний прогиб','Upper bow')+slider('middle','Центральный прогиб','Centre bow')+slider('bottom','Нижний прогиб','Lower bow')+
   '<div class="r1061-button-row"><button type="button" id="r1061Reset">'+t('Сброс','Reset')+'</button><button type="button" id="r1061Cancel">'+t('Отмена','Cancel')+'</button></div></details>'+
   '<button type="button" class="r8-save r1061-apply" id="r1061Apply">'+t('Применить','Apply')+'</button></section>';
 }
 function bind(rt,rerender){const v=rt.getVisual(),s=live(v);if(!s)return;
  const $=id=>document.getElementById(id),edit=()=>{if(!draft)draft=copy(rt.getVisual().scan_import_r1060);return draft};
  $('r1061Select')?.addEventListener('change',e=>{choose(Number(e.target.value));rerender()});
  $('r1061Primary')?.addEventListener('change',e=>{edit().primary_wall_id=e.target.value;rt.render()});
  function updateWall(){
   const w=edit().walls[selected],len=Number($('r1061Length')?.value),h=Number($('r1061Height')?.value),thick=Number($('r1061Thickness')?.value);
   if(Number.isFinite(len)&&len>=100&&len<=30000){
    const prior=length(w)||1,t=len/prior;
    w.x2_mm=Math.round(Number(w.x1_mm)+(Number(w.x2_mm)-Number(w.x1_mm))*t);
    w.z2_mm=Math.round(Number(w.z1_mm)+(Number(w.z2_mm)-Number(w.z1_mm))*t);
   }
   if(Number.isFinite(h)&&h>=200&&h<=10000)w.height_mm=h;
   if(Number.isFinite(thick)&&thick>=20&&thick<=1000)w.thickness_mm=thick;
   rt.render();
  }
  ['r1061Length','r1061Height','r1061Thickness'].forEach(id=>$(id)?.addEventListener('change',updateWall));
  $('r1061Rotation')?.addEventListener('input',e=>{edit().rotation_deg=Number(e.target.value);
    if($('r1061RotationText'))$('r1061RotationText').textContent=e.target.value+'°';rt.render()});
  document.querySelectorAll('[data-r1061-curve]').forEach(el=>el.addEventListener('input',()=>{
   const w=edit().walls[selected],k=el.dataset.r1061Curve;
   w.curve_mm={...(w.curve_mm||{}),[k]:Number(el.value)};el.nextElementSibling.textContent=el.value+' mm';rt.render();
  }));
  $('r1061Reset')?.addEventListener('click',()=>{const w=edit().walls[selected];w.curve_mm={top:0,middle:0,bottom:0};rt.render();rerender()});
  $('r1061Cancel')?.addEventListener('click',()=>{draft=null;rt.render();rerender()});
  $('r1061Apply')?.addEventListener('click',async()=>{if(draft)await save(rt,draft);rt.render();rerender()});
 }
 window.BizetRoomR1061={source,room,primary,length,renderWalls,markup,bind,choose,current:live,selectIndex:()=>selected,hasUnsavedChanges:()=>!!draft};
})();