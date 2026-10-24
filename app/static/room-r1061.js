/* BIZET OS 10.6.1 - scan remains unverified until real measurement / author sign-off. */
(()=>{'use strict';
 let selected=0,draft=null;
 const copy=v=>JSON.parse(JSON.stringify(v));
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function source(v){
  const choice=v?.room_source_r1061;
  if(choice==='TEMPLATE')return 'TEMPLATE';
  if(choice==='FILE'&&v?.room_import?.source==='FILE')return 'FILE';
  if(choice==='SCAN'&&v?.scan_import_r1060?.walls?.length)return 'SCAN';
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
  const depths=points.map(behind),minDepth=Math.min(...depths),maxDepth=Math.max(...depths);
  // The primary wall is always at the BACK of the modeled room. Other walls face inward.
  const interiorSign=Math.abs(minDepth)>Math.abs(maxDepth)?-1:1;
  const inward=depths.map(d=>d*interiorSign),spread=Math.max(...inward);
  const available=spread>=900&&spread<=30000?Math.round(spread):null;
  return {lengthMm:Math.round(len),depthMm:available||4200,heightMm:Math.round(Math.max(2000,...s.walls.map(w=>Number(w.height_mm)||2800))),
   frame:{ux,uz,mx,mz,depthOrigin:0,interiorSign,along,behind},
   primary:p,source:'SCAN',provisional:!available,rotation_deg:Number(s.rotation_deg)||0};
 }
 function wallModuleIntersections(visual,modules){
  const g=room(visual),scan=live(visual);if(!g||!scan)return [];
  const {frame,depthMm,lengthMm}=g,primaryId=g.primary.id,out=[];
  const rects=(modules||[]).filter(m=>!m.freestanding&&m.kind!=='FILLER').map(m=>{
    const x=Number(m.x),y=Number(m.y),w=Number(m.w),d=Number(m.d);
    return {id:m.id,minX:x-12,maxX:x+w+12,minY:y-12,maxY:y+d+12};
  }).filter(r=>[r.minX,r.minY,r.maxX,r.maxY].every(Number.isFinite));
  function inside(p,r){return p[0]>=r.minX&&p[0]<=r.maxX&&p[1]>=r.minY&&p[1]<=r.maxY}
  function crosses(a,b,r){
    if(inside(a,r)||inside(b,r))return true;
    const corners=[[r.minX,r.minY],[r.maxX,r.minY],[r.maxX,r.maxY],[r.minX,r.maxY]];
    const orient=(p,q,t)=>(q[0]-p[0])*(t[1]-p[1])-(q[1]-p[1])*(t[0]-p[0]);
    return corners.some((p,i)=>{
      const q=corners[(i+1)%4],d1=orient(a,b,p),d2=orient(a,b,q),d3=orient(p,q,a),d4=orient(p,q,b);
      return d1*d2<=0&&d3*d4<=0;
    });
  }
  scan.walls.forEach(w=>{
    if(w.id===primaryId)return; // The main wall is the cabinet's rear boundary.
    const project=(x,z)=>{
      const pt=[Number(x),Number(z)];
      return [frame.along(pt)+lengthMm/2,depthMm-frame.behind(pt)*frame.interiorSign];
    };
    const a=project(w.x1_mm,w.z1_mm),b=project(w.x2_mm,w.z2_mm);
    if(![...a,...b].every(Number.isFinite))return;
    rects.forEach(r=>{if(crosses(a,b,r))out.push({wall_id:w.id,module_id:r.id})});
  });
  return out;
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
   const x1=frame.along(a),x2=frame.along(b),z1=depthMm/2-frame.behind(a)*frame.interiorSign,z2=depthMm/2-frame.behind(b)*frame.interiorSign;
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
  const sourcePicker='<section class="r8-section r1061-source-chooser"><label class="r8-field"><span>'+t('Активный источник геометрии','Active geometry source')+'</span><select id="r1061Source"><option value="TEMPLATE" '+(src==='TEMPLATE'?'selected':'')+'>'+t('Шаблон','Template')+'</option>'+
   (v?.room_import?.source==='FILE'?'<option value="FILE" '+(src==='FILE'?'selected':'')+'>'+t('Импортированный файл','Imported file')+'</option>':'')+
   (v?.scan_import_r1060?.walls?.length?'<option value="SCAN" '+(src==='SCAN'?'selected':'')+'>'+t('Реальный скан','Real scan')+'</option>':'')+'</select></label></section>';
  if(src==='FILE')return sourcePicker+ '<section class="r8-section"><h3>'+t('Геометрия импортированного файла','Imported file geometry')+'</h3><p>'+t('Редактирование файла выполняется через калибровку ниже.','Use calibration controls below to edit imported geometry.')+'</p></section>';
  if(src!=='SCAN')return sourcePicker;
  const s=live(v),w=s.walls[clamp(selected,0,s.walls.length-1)],cv=w.curve_mm||{};
  const slider=(k,ru,eng)=>'<label class="r1061-curve-range"><span>'+t(ru,eng)+'</span><input type="range" min="-150" max="150" step="1" data-r1061-curve="'+k+'" value="'+(Number(cv[k])||0)+'"><output>'+(Number(cv[k])||0)+' mm</output></label>';
  return sourcePicker+'<section class="r8-section r1061-room"><h3>'+t('Стены реального скана','Real scan walls')+'</h3>'+
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
 function bind(rt,rerender){const v=rt.getVisual(),s=live(v);
  document.getElementById('r1061Source')?.addEventListener('change',async e=>{
   const chosen=e.target.value;if(!['SCAN','FILE','TEMPLATE'].includes(chosen))return;
   draft=null;await rt.patchVisual({room_source_r1061:chosen});rt.render();rerender();
  });
  if(!s)return;
  const $=id=>document.getElementById(id),edit=()=>{if(!draft)draft=copy(rt.getVisual().scan_import_r1060);return draft};
  $('r1061Select')?.addEventListener('change',e=>{choose(Number(e.target.value));rerender()});
  $('r1061Primary')?.addEventListener('change',e=>{edit().primary_wall_id=e.target.value;rt.render()});
  function updateWall(){
   const state=edit(),w=state.walls[selected],len=Number($('r1061Length')?.value),h=Number($('r1061Height')?.value),thick=Number($('r1061Thickness')?.value);
    const originalEnd=[Number(w.x2_mm),Number(w.z2_mm)];
   if(Number.isFinite(len)&&len>=100&&len<=30000){
    const prior=length(w)||1,t=len/prior;
    w.x2_mm=Math.round(Number(w.x1_mm)+(Number(w.x2_mm)-Number(w.x1_mm))*t);
    w.z2_mm=Math.round(Number(w.z1_mm)+(Number(w.z2_mm)-Number(w.z1_mm))*t);
    // Preserve any scan junction originally sharing this endpoint.
    // The unchanged owner source is still retained as the original scan registration.
    state.walls.forEach((other,j)=>{
      if(j===selected)return;
      for(const point of ['1','2']){
        if(Math.hypot(Number(other['x'+point+'_mm'])-originalEnd[0],Number(other['z'+point+'_mm'])-originalEnd[1])<=3){
          other['x'+point+'_mm']=w.x2_mm;other['z'+point+'_mm']=w.z2_mm;
        }
      }
    });
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
 window.BizetRoomR1061={source,room,primary,length,wallModuleIntersections,renderWalls,markup,bind,choose,current:live,selectIndex:()=>selected,hasUnsavedChanges:()=>!!draft};
})();