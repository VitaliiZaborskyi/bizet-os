(()=> {
  const $=id=>document.getElementById(id), canvas=$('canvas');
  const LANG_KEY='bizet_os_language';
  let lang=localStorage.getItem(LANG_KEY)||'ru';
  const q=new URLSearchParams(location.search);

  const L={
    ru:{room:'Помещение',size:'Габариты',drawers:'Ящики',shelves:'Полки',equipment:'Оснащение',materials:'Материалы',output:'Выход',
      add:'＋ Добавить ещё изделие',hint:'Поверните модель пальцем · pinch — масштаб · удержание — перемещение вдоль стены',
      carcass:'Корпус',fronts:'Фасады',drawerLayer:'Ящики',shelfLayer:'Полки',hardware:'Фурнитура',fasteners:'Крепёж',holes:'Сверловка',dimensions:'Размеры',
      wallWidth:'Ширина стены, мм',roomDepth:'Глубина помещения, мм',roomHeight:'Высота помещения, мм',
      width:'Ширина, мм',height:'Высота, мм',depth:'Глубина, мм',apply:'Применить',drawerCount:'Количество ящиков',drawerStart:'Отступ блока снизу, мм',drawerHeight:'Высота ящика, мм',
      drawerRule:'Hard rule: верх блока обычных ящиков не выше 1200 мм от пола.',shelvesLeft:'Полки · левое отделение',shelvesRight:'Полки · правое отделение',
      rod:'Штанга',none:'Нет',installed:'Установлена',rodTop:'Отступ штанги от верха, мм',bodyMat:'Корпус · скандинавское белое дерево',accentMat:'Фасад / акцент · сумеречный голубой',
      project:'XML .project',projectNote:'Выход BIZET: производственный XML с расширением .project. Экспортер включим только после проверки схемы на эталонном файле Tree Art.',
      source:'Источник модели: Grande.dwg',position:'Позиция',move:'Перемещение вдоль стены',view:'VIEW',edit:'EDIT'},
    en:{room:'Room',size:'Dimensions',drawers:'Drawers',shelves:'Shelves',equipment:'Equipment',materials:'Materials',output:'Output',
      add:'＋ Add another product',hint:'Drag to orbit · pinch to zoom · hold to move along the wall',
      carcass:'Carcass',fronts:'Fronts',drawerLayer:'Drawers',shelfLayer:'Shelves',hardware:'Hardware',fasteners:'Fasteners',holes:'Drilling',dimensions:'Dimensions',
      wallWidth:'Wall width, mm',roomDepth:'Room depth, mm',roomHeight:'Room height, mm',
      width:'Width, mm',height:'Height, mm',depth:'Depth, mm',apply:'Apply',drawerCount:'Drawer count',drawerStart:'Drawer block bottom offset, mm',drawerHeight:'Drawer height, mm',
      drawerRule:'Hard rule: the top of a standard drawer block cannot exceed 1200 mm from floor.',shelvesLeft:'Shelves · left compartment',shelvesRight:'Shelves · right compartment',
      rod:'Clothes rail',none:'None',installed:'Installed',rodTop:'Rail offset from top, mm',bodyMat:'Carcass · Scandinavian white wood',accentMat:'Front / accent · twilight blue',
      project:'XML .project',projectNote:'BIZET output: production XML with .project extension. Export stays locked until the Tree Art reference schema is validated.',
      source:'Model source: Grande.dwg',position:'Position',move:'Move along wall',view:'VIEW',edit:'EDIT'},
    ua:{room:'Приміщення',size:'Габарити',drawers:'Шухляди',shelves:'Полиці',equipment:'Оснащення',materials:'Матеріали',output:'Вихід',
      add:'＋ Додати ще виріб',hint:'Оберніть модель пальцем · pinch — масштаб · утримання — рух уздовж стіни',
      carcass:'Корпус',fronts:'Фасади',drawerLayer:'Шухляди',shelfLayer:'Полиці',hardware:'Фурнітура',fasteners:'Кріплення',holes:'Свердління',dimensions:'Розміри',
      wallWidth:'Ширина стіни, мм',roomDepth:'Глибина приміщення, мм',roomHeight:'Висота приміщення, мм',
      width:'Ширина, мм',height:'Висота, мм',depth:'Глибина, мм',apply:'Застосувати',drawerCount:'Кількість шухляд',drawerStart:'Відступ блоку знизу, мм',drawerHeight:'Висота шухляди, мм',
      drawerRule:'Hard rule: верх блоку звичайних шухляд не вище 1200 мм від підлоги.',shelvesLeft:'Полиці · ліве відділення',shelvesRight:'Полиці · праве відділення',
      rod:'Штанга',none:'Немає',installed:'Встановлена',rodTop:'Відступ штанги від верху, мм',bodyMat:'Корпус · скандинавське біле дерево',accentMat:'Фасад / акцент · сутінковий блакитний',
      project:'XML .project',projectNote:'Вихід BIZET: виробничий XML з розширенням .project. Експортер увімкнемо лише після перевірки схеми на еталонному файлі Tree Art.',
      source:'Джерело моделі: Grande.dwg',position:'Позиція',move:'Рух уздовж стіни',view:'VIEW',edit:'EDIT'}
  };
  const t=k=>L[lang]?.[k]||L.ru[k]||k;

  const placement=q.get('placement')||'center';
  const initialX=placement==='left'?80:placement==='right'?1820:950;
  const S={
    roomW:3000,roomD:2600,roomH:2800,
    w:1100,h:1900,d:500,x:initialX,
    drawers:2,drawerStart:0,drawerHeight:220,
    shelvesL:4,shelvesR:1,rod:false,rodTop:500,
    body:'#ddd4c5',accent:'#9fb3c8'
  };
  const vis={carcass:true,fronts:true,drawers:true,shelves:true,hardware:true,fasteners:true,holes:true};
  let showDims=true,isolated=false,activePanel=null;
  let camera={yaw:-.35,pitch:.32,distanceScale:.64,targetX:S.x+S.w/2,targetY:S.roomD-S.d*.45,targetZ:S.h*.48,screenYOffset:-34};
  let scene=null;
  const pointers=new Map();
  let gesture=null,holdTimer=null,moving=false;

  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function fitCamera(){
    camera.targetX=S.x+S.w/2;
    camera.targetY=S.roomD-S.d*.48;
    camera.targetZ=S.h*.48;
    const size=Math.max(S.w/1100,S.h/1900,S.d/500);
    camera.distanceScale=clamp(.62*size,.58,1.18);
    camera.screenYOffset=window.innerWidth<=760?-48:-34;
  }
  function model(){
    return {width:S.w,height:S.h,depth:S.d,x:S.x,drawerCount:S.drawers,drawerStart:S.drawerStart,drawerHeight:S.drawerHeight,
      shelvesLeft:S.shelvesL,shelvesRight:S.shelvesR,rodEnabled:S.rod,rodOffsetTop:S.rodTop,bodyColor:S.body,sideColor:S.body,frontColor:S.accent,splitRatio:.37};
  }
  function render(force=false){
    if(!window.BizetPilot3D?.drawWardrobeScene)return;
    scene=window.BizetPilot3D.drawWardrobeScene(canvas,{
      room:{lengthMm:S.roomW,depthMm:S.roomD,heightMm:S.roomH},
      model:model(),camera,visibility:vis,showDimensions:showDims,showRoomDimensions:false,isolated,forceCanvasReset:force
    });
    if(scene?.camera)camera={...camera,...scene.camera};
    $('positionLabel').textContent=t('position')+': '+Math.round(S.x)+' мм';
  }
  function resize(){render(true)}
  function input(label,key,value,min,max,step=10){
    return '<label class="field"><span>'+label+'</span><input data-key="'+key+'" type="number" value="'+value+'" min="'+min+'" max="'+max+'" step="'+step+'"></label>';
  }
  function select(label,key,options,value){
    return '<label class="field"><span>'+label+'</span><select data-key="'+key+'">'+options.map(o=>'<option value="'+o[0]+'" '+(String(o[0])===String(value)?'selected':'')+'>'+o[1]+'</option>').join('')+'</select></label>';
  }
  function closePanel(){
    activePanel=null;$('panel').hidden=true;document.body.classList.remove('panel-open');
    [...$('tools').children].forEach(b=>b.classList.remove('active'));
    requestAnimationFrame(()=>render(true));
  }
  function openPanel(name){
    activePanel=name;$('panel').hidden=false;document.body.classList.add('panel-open');
    $('viewMode').classList.remove('active');$('editMode').classList.add('active');
    [...$('tools').children].forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
    $('panelKicker').textContent='TREE ART · GRANDE';
    $('panelTitle').textContent=t(name);
    let html='';
    if(name==='room')html='<div class="section">'+input(t('wallWidth'),'roomW',S.roomW,1800,10000)+input(t('roomDepth'),'roomD',S.roomD,1800,8000)+input(t('roomHeight'),'roomH',S.roomH,1800,5000)+'</div>';
    if(name==='size')html='<div class="section">'+input(t('width'),'w',S.w,500,2780)+input(t('height'),'h',S.h,800,2780)+input(t('depth'),'d',S.d,250,900)+'</div>';
    if(name==='drawers')html='<div class="section">'+input(t('drawerCount'),'drawers',S.drawers,1,5,1)+input(t('drawerStart'),'drawerStart',S.drawerStart,0,1000)+input(t('drawerHeight'),'drawerHeight',S.drawerHeight,120,500)+'<p class="warn">'+t('drawerRule')+'</p></div>';
    if(name==='shelves')html='<div class="section">'+input(t('shelvesLeft'),'shelvesL',S.shelvesL,0,12,1)+input(t('shelvesRight'),'shelvesR',S.shelvesR,0,12,1)+'</div>';
    if(name==='equipment')html='<div class="section">'+select(t('rod'),'rod',[['0',t('none')],['1',t('installed')]],S.rod?'1':'0')+input(t('rodTop'),'rodTop',S.rodTop,100,1800)+'</div>';
    if(name==='materials')html='<div class="section"><label class="field"><span>'+t('bodyMat')+'</span><input data-key="body" type="color" value="'+S.body+'"></label><label class="field"><span>'+t('accentMat')+'</span><input data-key="accent" type="color" value="'+S.accent+'"></label></div>';
    if(name==='output')html='<div class="out"><button id="projectExport">'+t('project')+'</button></div><p class="note">'+t('projectNote')+'</p><p class="note">'+t('source')+'</p>';
    $('panelBody').innerHTML=html+'<button class="primary" id="apply">'+t('apply')+'</button>';
    $('panelBody').querySelectorAll('[data-key]').forEach(el=>{
      el.addEventListener('input',()=>{
        const key=el.dataset.key;let value=el.type==='number'?Number(el.value):el.value;
        if(key==='rod')S.rod=value==='1';else S[key]=value;
        if(S.drawerStart+S.drawers*S.drawerHeight>1200){
          S.drawerStart=Math.max(0,1200-S.drawers*S.drawerHeight);
          const ds=$('panelBody').querySelector('[data-key="drawerStart"]');if(ds)ds.value=S.drawerStart;
        }
        S.x=clamp(S.x,0,Math.max(0,S.roomW-S.w));
        if(['w','h','d','roomW','roomD','roomH'].includes(key))fitCamera();
        render();
      });
    });
    const ex=$('projectExport');if(ex)ex.onclick=()=>{ex.textContent=t('project')+' · schema check';ex.disabled=true};
    $('apply').onclick=closePanel;
    requestAnimationFrame(()=>render(true));
  }
  function layerPanel(){
    const rows=[['carcass','carcass'],['fronts','fronts'],['drawers','drawerLayer'],['shelves','shelfLayer'],['hardware','hardware'],['fasteners','fasteners'],['holes','holes']];
    $('layerPanel').innerHTML=rows.map(([k,label])=>'<label>'+t(label)+'<input type="checkbox" data-layer="'+k+'" '+(vis[k]?'checked':'')+'></label>').join('')+
      '<label>'+t('dimensions')+'<input type="checkbox" id="dimToggle" '+(showDims?'checked':'')+'></label>';
    $('layerPanel').querySelectorAll('[data-layer]').forEach(el=>el.onchange=()=>{vis[el.dataset.layer]=el.checked;render()});
    $('dimToggle').onchange=e=>{showDims=e.target.checked;render()};
  }
  function applyLanguage(){
    document.documentElement.lang=lang==='ua'?'uk':lang;$('lang').value=lang;
    const labels=['room','size','drawers','shelves','equipment','materials','output'];
    [...$('tools').children].forEach((b,i)=>b.querySelector('span').textContent=t(labels[i]));
    $('addProduct').textContent=t('add');$('hint').textContent=t('hint');
    $('viewMode').textContent=t('view');$('editMode').textContent=t('edit');
    layerPanel();if(activePanel)openPanel(activePanel);else render(true);
  }
  function setView(){
    closePanel();$('viewMode').classList.add('active');$('editMode').classList.remove('active');
  }
  function cancelHold(){clearTimeout(holdTimer);holdTimer=null}
  function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  canvas.addEventListener('pointerdown',e=>{
    canvas.setPointerCapture(e.pointerId);const p=canvasPoint(e);pointers.set(e.pointerId,p);
    if(pointers.size===1){
      gesture={start:p,last:p,yaw:camera.yaw,pitch:camera.pitch,scale:camera.distanceScale,startX:S.x,hit:scene?.hitTest?.(p.x,p.y)||null,moved:false};
      if(gesture.hit)holdTimer=setTimeout(()=>{moving=true;$('hint').textContent=t('move')},380);
    }else if(pointers.size===2){
      cancelHold();const a=[...pointers.values()];gesture={pinch:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),scale:camera.distanceScale};
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;const p=canvasPoint(e);pointers.set(e.pointerId,p);
    if(pointers.size===2){
      cancelHold();moving=false;const a=[...pointers.values()],dist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      if(!gesture?.pinch)gesture={pinch:dist,scale:camera.distanceScale};
      camera.distanceScale=clamp(gesture.scale*gesture.pinch/dist,.58,1.55);render();return;
    }
    if(!gesture)return;
    const dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;
    if(Math.hypot(dx,dy)>8){gesture.moved=true;if(!moving)cancelHold()}
    if(moving){
      const mmPerPx=Math.max(2.5,S.roomW/Math.max(420,canvas.clientWidth)*.72);
      S.x=clamp(gesture.startX+dx*mmPerPx,0,Math.max(0,S.roomW-S.w));
      camera.targetX=S.x+S.w/2;render();
    }else{
      camera.yaw=gesture.yaw+dx*.0065;camera.pitch=clamp(gesture.pitch-dy*.0045,.08,.92);render();
    }
  });
  function pointerEnd(e){
    pointers.delete(e.pointerId);cancelHold();moving=false;$('hint').textContent=t('hint');
    if(!pointers.size)gesture=null;
  }
  canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);
  canvas.addEventListener('wheel',e=>{e.preventDefault();camera.distanceScale=clamp(camera.distanceScale*(e.deltaY>0?1.08:.92),.58,1.55);render()},{passive:false});

  $('dims').onclick=()=>{showDims=!showDims;layerPanel();render()};
  $('layers').onclick=()=>{$('layerPanel').hidden=!$('layerPanel').hidden;if(!$('layerPanel').hidden)layerPanel()};
  $('reset').onclick=()=>{fitCamera();camera.yaw=-.35;camera.pitch=.32;render(true)};
  $('isolate').onclick=()=>{isolated=!isolated;render()};
  $('viewMode').onclick=setView;
  $('editMode').onclick=()=>{$('editMode').classList.add('active');$('viewMode').classList.remove('active')};
  $('panelClose').onclick=closePanel;
  [...$('tools').children].forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));
  $('addProduct').onclick=()=>location.href='/wardrobes?manufacturer=treeart&add=1';
  $('back').onclick=()=>location.href='/wardrobes?manufacturer=treeart';
  $('lang').onchange=e=>{lang=e.target.value;localStorage.setItem(LANG_KEY,lang);applyLanguage()};
  addEventListener('resize',resize);
  fitCamera();applyLanguage();requestAnimationFrame(()=>render(true));
})();