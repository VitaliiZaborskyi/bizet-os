/* BIZET OS 10.6.3 owner #11-15 - OPTIONAL Room Model adapter.
 * Preserves the verified 10.6.0 renderer and original scan observations.
 * Scanner remains PRELIMINARY_UNVERIFIED / factory STOP until measured sign-off.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id),copy=v=>JSON.parse(JSON.stringify(v));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rt=()=>window.BizetModelRuntime,visual=()=>rt()?.getVisual?.()||{};
 const source=v=>{
  const val=v.room_source_r1063;
  if(val==='TEMPLATE')return'TEMPLATE';
  if(val==='FILE'&&v.room_import?.source==='FILE')return'FILE';
  if(val==='SCAN'&&v.scan_import_r1060?.walls?.length)return'SCAN';
  return v.scan_import_r1060?.walls?.length?'SCAN':v.room_import?.source==='FILE'?'FILE':'TEMPLATE';
 };
 const length=w=>Math.hypot(Number(w.x2_mm)-Number(w.x1_mm),Number(w.z2_mm)-Number(w.z1_mm));
 let selected=0,draft=null,wallRoot=null,lastWarn='';
 function scan(v=visual()){return draft||v.scan_import_r1060||null}
 function primary(s){if(!s?.walls?.length)return null;
  return s.walls.find(w=>w.id===s.primary_wall_id)||[...s.walls].sort((a,b)=>length(b)-length(a))[0]}
 function fitted(v=visual()){
  const s=scan(v),p=primary(s);if(!p)return null;
  const len=length(p);if(!Number.isFinite(len)||len<250)return null;
  const ax=Number(p.x1_mm),az=Number(p.z1_mm),bx=Number(p.x2_mm),bz=Number(p.z2_mm),
    ux=(bx-ax)/len,uz=(bz-az)/len,mx=(ax+bx)/2,mz=(az+bz)/2;
  const project=(x,z)=>{const dx=Number(x)-mx,dz=Number(z)-mz;
    return [dx*ux+dz*uz,-dx*uz+dz*ux]};
  const pts=s.walls.flatMap(w=>[project(w.x1_mm,w.z1_mm),project(w.x2_mm,w.z2_mm)]),
    signed=pts.map(p=>p[1]),min=Math.min(...signed),max=Math.max(...signed);
  const sign=Math.abs(min)>Math.abs(max)?-1:1,depth=Math.max(...signed.map(v=>v*sign));
  return{lengthMm:Math.round(len),depthMm:depth>=900&&depth<=30000?Math.round(depth):null,
   heightMm:Math.round(Math.max(2000,...s.walls.map(w=>Number(w.height_mm)||2800))),
   p,sign,project,scan:s};
 }
 function intersectionWarnings(g,modules){
  if(!g?.depthMm)return[];
  const warnings=[],L=g.lengthMm,D=g.depthMm;
  const r=(m)=>{let x=Number(m.x),y=Number(m.y),w=Number(m.w),d=Number(m.d);
   return {id:m.id,loX:x-8,hiX:x+w+8,loY:y-8,hiY:y+d+8}};
  const cross=(a,b,rect)=>{
   const inside=p=>p[0]>=rect.loX&&p[0]<=rect.hiX&&p[1]>=rect.loY&&p[1]<=rect.hiY;
   if(inside(a)||inside(b))return true;
   const corners=[[rect.loX,rect.loY],[rect.hiX,rect.loY],[rect.hiX,rect.hiY],[rect.loX,rect.hiY]];
   const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
   return corners.some((c,i)=>{const d=corners[(i+1)%4];return orient(a,b,c)*orient(a,b,d)<=0&&orient(c,d,a)*orient(c,d,b)<=0});
  };
  g.scan.walls.filter(w=>w.id!==g.p.id).forEach(w=>{
   const p1=g.project(w.x1_mm,w.z1_mm),p2=g.project(w.x2_mm,w.z2_mm);
   const a=[p1[0]+L/2,D-p1[1]*g.sign],b=[p2[0]+L/2,D-p2[1]*g.sign];
   (modules||[]).filter(m=>!m.freestanding&&m.kind!=='FILLER').forEach(m=>{
    if(cross(a,b,r(m)))warnings.push({module_id:m.id,wall_id:w.id});
   });
  });return warnings;
 }
 function curve(w,u,y){
  const m=w.curve_mm||{},ht=Math.max(1,Number(w.height_mm)||2800),t=clamp(y/ht,0,1),
   top=Number(m.top)||0,mid=Number(m.middle)||0,bot=Number(m.bottom)||0;
  return Math.sin(Math.PI*clamp(u,0,1))*(t<.5?bot+(mid-bot)*t*2:mid+(top-mid)*(t*2-1));
 }
 function rebuild(){
  const viewer=window.BizetKitchenWebGL,THREE=window.THREE,v=visual();
  if(!viewer?.scene||!THREE||!viewer.renderer)return;
  if(wallRoot){viewer.scene.remove(wallRoot);wallRoot.traverse(o=>{o.geometry?.dispose?.();if(o.material&&o.userData?.ownedMaterial)o.material.dispose()});wallRoot=null}
  const groups=viewer.scene.children.filter(o=>o.isGroup);
  const g=source(v)==='SCAN'?fitted(v):null;
  const radians=g?(Number(g.scan.rotation_deg)||0)*Math.PI/180:0;
  groups.slice(0,5).forEach(gr=>gr.rotation.y=radians);
  if(!g)return;
  const room=rt()?.getRoom?.()||{},L=Number(room.lengthMm)||g.lengthMm,D=Number(room.depthMm)||g.depthMm||4200;
  wallRoot=new THREE.Group();wallRoot.name='BIZET_SCAN_PREVIEW_R1063';wallRoot.rotation.y=radians;
  g.scan.walls.forEach((w,i)=>{
   const p=g.project(w.x1_mm,w.z1_mm),q=g.project(w.x2_mm,w.z2_mm);
   const x1=p[0]+L/2,x2=q[0]+L/2,z1=D-p[1]*g.sign,z2=D-q[1]*g.sign;
   const len=Math.hypot(x2-x1,z2-z1),h=Number(w.height_mm)||2800,
     thick=clamp(Number(w.thickness_mm)||100,20,700);
   if(![x1,x2,z1,z2,len,h].every(Number.isFinite)||len<100||len>35000||h<200||h>12000)return;
   const geo=new THREE.BoxGeometry(len,h,thick,18,8,1),pos=geo.attributes.position;
   for(let j=0;j<pos.count;j++){const x=pos.getX(j),y=pos.getY(j);
    pos.setZ(j,pos.getZ(j)+curve(w,(x+len/2)/len,y+h/2));}
   pos.needsUpdate=true;geo.computeVertexNormals();
   const material=new THREE.MeshStandardMaterial({color:i===selected?0x518ef5:0xc96565,
     transparent:true,opacity:i===selected?.68:.38,side:THREE.DoubleSide,depthWrite:false});
   const mesh=new THREE.Mesh(geo,material);
   mesh.position.set((x1+x2)/2-L/2,h/2,(z1+z2)/2-D/2);
   mesh.rotation.y=-Math.atan2(z2-z1,x2-x1);
   mesh.userData={cat:'r1063-scan-wall',scanWallIndex:i,ownedMaterial:true,manufacturingReady:false};
   wallRoot.add(mesh);
   if(i===selected)[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]].forEach(([dx,dy])=>{
    const handle=new THREE.Mesh(new THREE.SphereGeometry(13,9,8),new THREE.MeshBasicMaterial({color:0x1475ed,depthTest:false}));
    handle.position.set(dx*len/2,dy*h/2,thick/2+12);
    handle.userData={cat:'r1063-wall-handle',ownedMaterial:true};mesh.add(handle);
   });
  });
  viewer.scene.add(wallRoot);
  const collisions=intersectionWarnings(g,rt()?.getModules?.()||[]);
  window.BizetR1063ScanStop={status:'PRELIMINARY_UNVERIFIED',
   manufacturingStop:true,collisions};
  const warning=collisions.length?'STOP: '+collisions.length+' scan-wall / furniture intersections':'';
  if(warning&&warning!==lastWarn){console.warn('BIZET_OS_R1063',warning);lastWarn=warning}
 }
 async function persist(){
  if(!draft)return;
  const v=visual(),s=copy(draft);
  s.production_ready=false;s.status='PRELIMINARY_UNVERIFIED';
  s.export_stop='STOP_UNCONFIRMED_SCANNED_GEOMETRY';
  const patch={room_source_r1063:'SCAN',scan_import_r1060:s};
  if(!v.scan_original_walls_r1063?.length)patch.scan_original_walls_r1063=copy(v.scan_import_r1060.walls);
  await rt().patchVisual(patch);draft=null;rebuild();
 }
 function viewText(ru,en){return localStorage.getItem('bizet_os_language')==='en'?en:ru}
 function markup(){
  const v=visual(),src=source(v),s=scan(v),g=fitted(v);
  const option=(id,label,show=true)=>show?'<option value="'+id+'" '+(id===src?'selected':'')+'>'+label+'</option>':'';
  let html='<section class="r8-section r1063-active-room"><h3>'+viewText('Источник помещения','Room geometry source')+'</h3>'+
   '<label class="r8-field"><span>'+viewText('Активный источник','Active source')+'</span><select id="r1063Source">'+
   option('TEMPLATE',viewText('Шаблон','Template'))+
   option('FILE',viewText('Импортированный файл','Imported file'),v.room_import?.source==='FILE')+
   option('SCAN',viewText('Реальный скан','Real scan'),!!v.scan_import_r1060?.walls?.length)+'</select></label>';
  if(src==='SCAN'&&s?.walls?.length&&g){
   selected=clamp(selected,0,s.walls.length-1);const w=s.walls[selected],c=w.curve_mm||{};
   const field=(id,label,value,min,max)=>'<label class="r8-field"><span>'+label+'</span><input id="'+id+'" type="number" min="'+min+'" max="'+max+'" value="'+value+'"></label>';
   const slider=(key,ru,en)=>'<label class="r8-field r1063-curve"><span>'+viewText(ru,en)+'</span><input data-r1063-curve="'+key+'" type="range" min="-150" max="150" step="1" value="'+(Number(c[key])||0)+'"><output>'+(Number(c[key])||0)+' mm</output></label>';
   html+='<p class="r1063-stop">'+viewText('Скан предварительный — производство STOP','Scan unverified — manufacturing STOP')+'</p>'+
    '<label class="r8-field"><span>'+viewText('Стена','Wall')+'</span><select id="r1063Wall">'+s.walls.map((wall,i)=>'<option value="'+i+'" '+(i===selected?'selected':'')+'>'+esc(wall.label||'W'+(i+1))+'</option>').join('')+'</select></label>'+
    '<label class="r8-field"><span>'+viewText('Основная стена','Primary wall')+'</span><select id="r1063Primary">'+s.walls.map(w=>'<option value="'+esc(w.id)+'" '+(w.id===g.p.id?'selected':'')+'>'+esc(w.label||w.id)+'</option>').join('')+'</select></label>'+
    field('r1063Length',viewText('Длина стены, мм','Wall length, mm'),Math.round(length(w)),100,35000)+
    field('r1063Height',viewText('Высота стены, мм','Wall height, mm'),Number(w.height_mm)||2800,200,12000)+
    field('r1063Thickness',viewText('Толщина стены, мм','Wall thickness, mm'),Number(w.thickness_mm)||100,20,700)+
    '<label class="r8-field"><span>'+viewText('Повернуть помещение, °','Rotate room, °')+'</span><input id="r1063Rotation" type="range" min="-180" max="180" value="'+(Number(s.rotation_deg)||0)+'"><output id="r1063Angle">'+(Number(s.rotation_deg)||0)+'°</output></label>'+
    '<details><summary>'+viewText('Кривая стена · 8 контрольных точек','Curved wall · 8 control points')+'</summary>'+
    slider('top','Верхний прогиб','Upper bow')+slider('middle','Центральный прогиб','Centre bow')+
    slider('bottom','Нижний прогиб','Lower bow')+'</details>'+
    '<div class="r1063-room-actions"><button id="r1063Cancel">'+viewText('Отменить','Cancel')+'</button>'+
    '<button id="r1063Reset">'+viewText('Сбросить прогиб','Reset bow')+'</button>'+
    '<button class="r1063-apply" id="r1063Apply">'+viewText('Применить','Apply')+'</button></div>'+
    '<button id="r1063Adopt" type="button">'+viewText('Использовать размеры скана для кухни (предварительно)','Apply scan room size to kitchen (provisional)')+'</button>';
  }
  return html+'</section>';
 }
 function inject(){
  const panel=$('panelBody');if(!panel||!rt()?.ready||!document.querySelector('#workspaceTools [data-panel="room"].is-active'))return;
  panel.querySelector('.r1063-active-room')?.remove();
  const wrapper=document.createElement('div');wrapper.innerHTML=markup();
  panel.prepend(wrapper.firstElementChild);
  const v=visual(),src=source(v);
  panel.querySelectorAll('.r1060-scan-walls,.r8-section').forEach(section=>{
   if(section.classList.contains('r1063-active-room'))return;
   const h=section.querySelector('h3')?.textContent||'';
   if(src==='SCAN'&&(/Геометрия|Geometry|Скан|Scan|Калибровка|Calibration/.test(h)))section.hidden=true;
   if(src==='TEMPLATE'&&section.classList.contains('r1060-scan-walls'))section.hidden=true;
  });
  const $p=id=>panel.querySelector('#'+id);
  $p('r1063Source')?.addEventListener('change',async e=>{
    const chosen=e.target.value;if(!['SCAN','FILE','TEMPLATE'].includes(chosen))return;
    draft=null;await rt().patchVisual({room_source_r1063:chosen});rebuild();inject();
  });
  const editable=()=>{if(!draft)draft=copy(visual().scan_import_r1060);return draft};
  $p('r1063Wall')?.addEventListener('change',e=>{selected=Number(e.target.value);draft=null;rebuild();inject()});
  $p('r1063Primary')?.addEventListener('change',e=>{editable().primary_wall_id=e.target.value;rebuild()});
  $p('r1063Rotation')?.addEventListener('input',e=>{editable().rotation_deg=Number(e.target.value);$p('r1063Angle').textContent=e.target.value+'°';rebuild()});
  const updateShape=()=>{
   const w=editable().walls[selected],oldX=Number(w.x2_mm),oldZ=Number(w.z2_mm);
   const nextLen=Number($p('r1063Length')?.value),before=length(w)||1;
   if(Number.isFinite(nextLen)&&nextLen>=100&&nextLen<=35000){
    w.x2_mm=Math.round(Number(w.x1_mm)+(Number(w.x2_mm)-Number(w.x1_mm))*nextLen/before);
    w.z2_mm=Math.round(Number(w.z1_mm)+(Number(w.z2_mm)-Number(w.z1_mm))*nextLen/before);
    editable().walls.forEach((other,i)=>{if(i===selected)return;
     for(const point of ['1','2'])if(Math.hypot(Number(other['x'+point+'_mm'])-oldX,Number(other['z'+point+'_mm'])-oldZ)<=3){
      other['x'+point+'_mm']=w.x2_mm;other['z'+point+'_mm']=w.z2_mm;
     }
    });
   }
   const h=Number($p('r1063Height')?.value),t=Number($p('r1063Thickness')?.value);
   if(Number.isFinite(h)&&h>=200&&h<=12000)w.height_mm=h;
   if(Number.isFinite(t)&&t>=20&&t<=700)w.thickness_mm=t;
   rebuild();
  };
  for(const name of ['r1063Length','r1063Height','r1063Thickness'])$p(name)?.addEventListener('change',updateShape);
  panel.querySelectorAll('[data-r1063-curve]').forEach(el=>el.addEventListener('input',()=>{
   const w=editable().walls[selected];w.curve_mm={...(w.curve_mm||{}),[el.dataset.r1063Curve]:Number(el.value)};
   el.nextElementSibling.textContent=el.value+' mm';rebuild();
  }));
  $p('r1063Reset')?.addEventListener('click',()=>{editable().walls[selected].curve_mm={top:0,middle:0,bottom:0};rebuild();inject()});
  $p('r1063Cancel')?.addEventListener('click',()=>{draft=null;rebuild();inject()});
  $p('r1063Apply')?.addEventListener('click',async()=>{await persist();inject()});
  $p('r1063Adopt')?.addEventListener('click',async()=>{
   const g=fitted();if(!g||!g.depthMm)return window.alert(viewText('Необходимо подтвердить размеры скана','Scan dimensions unavailable'));
   await rt().patchRoom('lengthMm',g.lengthMm);
   await rt().patchRoom('depthMm',g.depthMm);
   await rt().patchRoom('heightMm',g.heightMm);
   rebuild();inject();
  });
 }
 function init(){
  document.addEventListener('click',e=>{
   if(e.target.closest('#workspaceTools [data-panel="room"]'))requestAnimationFrame(inject);
  });
  const stage=window.BizetKitchenWebGL?.renderer?.domElement;
  stage?.addEventListener('pointerup',e=>{
   if(window.BIZET_KITCHEN_UI_MODE!=='EDIT'||source(visual())!=='SCAN'||!wallRoot)return;
   const viewer=window.BizetKitchenWebGL,rect=stage.getBoundingClientRect();
   if(!rect.width||!rect.height)return;
   const hit=new window.THREE.Raycaster(),xy=new window.THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
   hit.setFromCamera(xy,viewer.camera);
   const walls=[];wallRoot.traverse(o=>{if(o.isMesh&&o.userData?.cat==='r1063-scan-wall')walls.push(o)});
   const found=hit.intersectObjects(walls,false)[0];
   if(found){selected=found.object.userData.scanWallIndex;rebuild();
    document.querySelector('#workspaceTools [data-panel="room"]')?.click();requestAnimationFrame(inject);
    e.stopImmediatePropagation();e.preventDefault();
   }
  },true);
  rebuild();
 }
 window.addEventListener('bizet:modelready',init,{once:true});
 window.addEventListener('bizet:languagechange',()=>requestAnimationFrame(inject));
 window.BizetRoomR1063={source,primary,fitted,length,intersectionWarnings,rebuild,inject};
})();