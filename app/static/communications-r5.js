(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  const $=id=>document.getElementById(id);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const uid=()=>crypto.randomUUID?crypto.randomUUID():`r5-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const LABELS={DRAIN:'Канализация',WATER:'Подача воды',COOKTOP_POWER:'Питание варочной панели',GAS:'Газ',VENT:'Вытяжка / вентиляция',APPLIANCE_POWER:'Питание техники'};
  let project=null,visual={},inputs={},snapshot=null,points=[],features=[],activeWall='A',selectedPointId=null,hitAreas=[];
  let questType=null,questDraft={},questIndex=0;

  async function request(url,options={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось сохранить изменения.');}
    return r.json();
  }
  async function patch(path,value,reason){
    const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path,value,reason})});
    project=result.project||result;return project;
  }
  function showError(error){$('errorNode').textContent=error?.message||String(error);$('errorNode').hidden=false;}
  function room(){const g=project?.room?.geometry||{},fallback=snapshot?.room||{};return{lengthMm:Number(g.wall_length?.value_mm)||Number(fallback.lengthMm)||6000,depthMm:Number(g.wall_depth?.value_mm)||Number(fallback.depthMm)||4200,heightMm:Number(g.room_height?.value_mm)||Number(fallback.heightMm)||2800};}
  function activeWalls(){return snapshot?.activeWalls?.length?snapshot.activeWalls:(visual.configuration_walls?.length?visual.configuration_walls:['A']);}
  function wallLength(wall){const r=room();return wall==='A'||wall==='D'?r.lengthMm:r.depthMm;}
  function runCenter(m){return m.wall==='A'?Number(m.x||0)+Number(m.w||0)/2:Number(m.y||0)+Number(m.d||0)/2;}
  function localToGlobal(wall,x,z){const r=room();if(wall==='A')return[Math.round(-r.lengthMm/2+x),r.depthMm,Math.round(z)];if(wall==='B')return[-Math.round(r.lengthMm/2),Math.round(x),Math.round(z)];if(wall==='C')return[Math.round(r.lengthMm/2),Math.round(x),Math.round(z)];return[Math.round(-r.lengthMm/2+x),0,Math.round(z)];}
  function metaFor(point){return{wall:point.wall,x_mm:point.xMm,z_mm:point.zMm,label:point.label,device:point.device,generated_by:'BIZET_OS_1.1_R5'};}
  function noteFor(point){return `BIZET_R5_AUTO:${JSON.stringify(metaFor(point))}`;}
  function parseAutoNote(note){if(typeof note!=='string'||!note.startsWith('BIZET_R5_AUTO:'))return null;try{return JSON.parse(note.slice('BIZET_R5_AUTO:'.length));}catch(_){return null;}}
  function parseFeature(f){return f?.source==='BIZET_R5_ROOM_FEATURE'?f:null;}
  function module(kind){return (snapshot?.modules||[]).find(m=>m.kind===kind);}
  function modules(kind){return (snapshot?.modules||[]).filter(m=>m.kind===kind);}
  function preliminaryZ(m,ratio=.35){if(!m)return Math.round(room().heightMm*.2/10)*10;return Math.round((Number(m.z||0)+Number(m.h||700)*ratio)/10)*10;}
  function point(type,label,device,m,z){if(!m)return null;const wall=m.wall||'A',x=clamp(Math.round(runCenter(m)/10)*10,0,wallLength(wall));return{id:uid(),type,label,device,wall,xMm:x,zMm:clamp(Math.round(z),0,room().heightMm),edited:false};}

  function generateAutomaticPoints(){
    const out=[];
    const sink=module('SINK'),cooktop=module('COOKTOP'),fridge=module('FRIDGE'),dw=module('DISHWASHER'),oven=module('TALL_OVEN_SHELL')||module('TALL_OVEN')||module('OVEN'),hood=module('UPPER_HOOD');
    if(sink){const z=preliminaryZ(sink,.38);out.push(point('DRAIN','Канализация','Мойка',sink,z));out.push(point('WATER','Подача воды','Мойка',sink,z+80));if(sink.sink_disposer==='YES')out.push(point('APPLIANCE_POWER','Питание измельчителя','Измельчитель',sink,preliminaryZ(sink,.28)));}
    if(cooktop){if(inputs.cooktop_type==='GAS'||inputs.cooktop_type==='COMBINED')out.push(point('GAS','Газ','Варочная панель',cooktop,preliminaryZ(cooktop,.30)));if(inputs.cooktop_type!=='GAS')out.push(point('COOKTOP_POWER','Питание варочной панели','Варочная панель',cooktop,preliminaryZ(cooktop,.30)));}
    if(hood)out.push(point('VENT','Вытяжка / вентиляция','Вытяжка',hood,preliminaryZ(hood,.55)));
    if(fridge)out.push(point('APPLIANCE_POWER','Питание холодильника','Холодильник',fridge,preliminaryZ(fridge,.16)));
    if(dw)out.push(point('APPLIANCE_POWER','Питание ПММ','Посудомоечная машина',dw,preliminaryZ(dw,.26)));
    if(oven)out.push(point('APPLIANCE_POWER','Питание духовки','Духовой шкаф',oven,preliminaryZ(oven,.24)));
    if(oven&&oven.microwave_present==='YES')out.push(point('APPLIANCE_POWER','Питание микроволновой печи','Микроволновая печь',oven,preliminaryZ(oven,.56)));
    if(oven&&oven.coffee_present==='YES')out.push(point('APPLIANCE_POWER','Питание кофемашины','Кофемашина',oven,preliminaryZ(oven,.70)));
    return out.filter(Boolean);
  }
  function loadManagedPoints(){
    const managed=[];
    for(const c of project?.communications||[]){const meta=parseAutoNote(c.notes);if(!meta)continue;managed.push({id:c.id,type:c.type,label:meta.label||LABELS[c.type]||c.type,device:meta.device||'',wall:meta.wall||'A',xMm:Number(meta.x_mm)||0,zMm:Number(meta.z_mm)||0,edited:c.provenance?.source==='USER_ENTERED'||c.confirmation_state==='CONFIRMED'});}
    return managed;
  }
  function buildCommunicationsPayload(state='UNCONFIRMED'){
    const retained=(project?.communications||[]).filter(c=>!parseAutoNote(c.notes));
    const managed=points.map(p=>({id:p.id,type:p.type,coordinates_mm:localToGlobal(p.wall,p.xMm,p.zMm),tolerance_radius_mm:null,provenance:{source:p.edited?'USER_ENTERED':'SYSTEM_CALCULATED',confidence:p.edited?1:.55,confirmed:state==='CONFIRMED',note:p.edited?'Положение скорректировано пользователем.':'Предварительное автоматическое положение BIZET OS; требует проверки перед строительными работами.'},confirmation_state:state,notes:noteFor(p)}));
    return [...retained,...managed];
  }
  function buildFeaturesPayload(){const retained=(project?.room?.architectural_elements||[]).filter(f=>!parseFeature(f));return [...retained,...features];}
  async function persistPoints(state='UNCONFIRMED'){await patch('communications',buildCommunicationsPayload(state),'BIZET OS r5 automatic communication map');}
  async function persistFeatures(){await patch('room.architectural_elements',buildFeaturesPayload(),'BIZET OS r5 room clarification');sessionStorage.setItem('bizet_r5_room_features',JSON.stringify(features));}

  function renderTabs(){const walls=activeWalls();if(!walls.includes(activeWall))activeWall=walls[0]||'A';$('wallTabs').innerHTML=walls.map(w=>`<button class="wall-tab${w===activeWall?' is-active':''}" data-wall="${w}" type="button">Стена ${w}</button>`).join('');$('wallTabs').querySelectorAll('[data-wall]').forEach(b=>b.addEventListener('click',()=>{activeWall=b.dataset.wall;render();}));}
  function canvasGeom(){const c=$('wallCanvas');return{x:78,y:48,w:c.width-138,h:c.height-112};}
  function drawWall(){
    const canvas=$('wallCanvas'),ctx=canvas.getContext('2d'),g=canvasGeom(),r=room(),L=wallLength(activeWall),H=r.heightMm,dark=document.documentElement.dataset.theme==='dark';ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=dark?'#1d1d1b':'#f2efe8';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=dark?'#34322e':'#e7e2d8';ctx.strokeStyle=dark?'rgba(245,240,230,.28)':'rgba(23,23,22,.22)';ctx.lineWidth=2;ctx.fillRect(g.x,g.y,g.w,g.h);ctx.strokeRect(g.x,g.y,g.w,g.h);ctx.fillStyle=dark?'#f3f1ec':'#171716';ctx.font='800 22px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif';ctx.fillText(`WALL ${activeWall}`,g.x+18,g.y+31);ctx.font='700 12px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif';ctx.fillStyle=dark?'#b7b1a5':'#69645d';ctx.fillText(`${Math.round(L)} мм`,g.x+g.w/2,g.y+g.h+34);ctx.save();ctx.translate(g.x-35,g.y+g.h/2);ctx.rotate(-Math.PI/2);ctx.fillText(`${Math.round(H)} мм`,0,0);ctx.restore();hitAreas=[];
    for(const p of points.filter(x=>x.wall===activeWall)){const px=g.x+clamp(p.xMm/L,0,1)*g.w,py=g.y+g.h-clamp(p.zMm/H,0,1)*g.h;ctx.save();ctx.fillStyle=p.edited?(dark?'#e7c858':'#171716'):(dark?'#d2b54e':'#e7c858');ctx.strokeStyle=dark?'#171716':'rgba(23,23,22,.48)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='750 11px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif';ctx.textAlign='center';ctx.fillStyle=dark?'#f3f1ec':'#171716';ctx.fillText(p.label,px,py-22);ctx.font='650 10px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif';ctx.fillStyle=dark?'#aaa69d':'#77736b';ctx.fillText(`X ${p.xMm} · Z ${p.zMm}`,px,py+30);ctx.restore();hitAreas.push({id:p.id,x:px,y:py,r:26});}
  }
  function renderPointList(){const list=points.filter(p=>p.wall===activeWall);$('pointList').innerHTML=list.length?list.map(p=>`<button class="point-chip${p.edited?' is-edited':''}" type="button" data-point="${p.id}"><strong>${p.label}</strong><span>X ${p.xMm} · Z ${p.zMm} мм</span></button>`).join(''):'<span style="color:var(--muted);font-size:12px;padding:8px">На этой стене системных точек нет.</span>';$('pointList').querySelectorAll('[data-point]').forEach(b=>b.addEventListener('click',()=>openPoint(b.dataset.point)));}
  function renderFeatures(){const names={WINDOW:'Окно',RADIATOR:'Радиатор',CURTAIN_RECESS:'Подшторник',PROJECTION:'Выступ',COLUMN:'Колонна',NICHE:'Ниша'};$('featureList').innerHTML=features.length?features.map(f=>`<div class="feature-row"><strong>${names[f.type]||f.type} · стена ${f.wall}</strong><span>${f.width_mm||'—'} × ${f.height_mm||'—'} мм${f.depth_mm?` · глубина ${f.depth_mm} мм`:''}</span></div>`).join(''):'';}
  function renderPrint(){const meta=`Проект ${project?.identity?.order_no||project?.identity?.internal_id||'—'} · автоматическая карта BIZET OS 1.1`;$('printMeta').textContent=meta;const rows=points.map(p=>`<tr><td>${p.wall}</td><td>${p.label}</td><td>${p.device||'—'}</td><td>${p.xMm}</td><td>${p.zMm}</td><td>${p.edited?'проверено/изменено':'системное предварительное'}</td></tr>`).join('');const featureRows=features.map(f=>`<tr><td>${f.wall}</td><td>${f.type}</td><td>${f.x_mm??'—'}</td><td>${f.z_mm??'—'}</td><td>${f.width_mm??'—'}</td><td>${f.height_mm??'—'}</td><td>${f.depth_mm??'—'}</td></tr>`).join('');$('printContent').innerHTML=`<h2>Коммуникации</h2><table><thead><tr><th>Стена</th><th>Точка</th><th>Оборудование</th><th>X, мм</th><th>Z, мм</th><th>Статус</th></tr></thead><tbody>${rows}</tbody></table>${features.length?`<h2>Элементы помещения</h2><table><thead><tr><th>Стена</th><th>Элемент</th><th>X</th><th>Z</th><th>Ширина</th><th>Высота</th><th>Глубина</th></tr></thead><tbody>${featureRows}</tbody></table>`:''}`;}
  function render(){renderTabs();$('activeWallLabel').textContent=`Стена ${activeWall}`;$('pointCount').textContent=String(points.length);$('autoStatus').textContent='Автоматическая карта готова';$('autoStatusCopy').textContent='Нажмите на любую точку, если нужно изменить X или Z. Случайное перетаскивание отключено.';drawWall();renderPointList();renderFeatures();renderPrint();}

  function openPoint(id){const p=points.find(x=>x.id===id);if(!p)return;selectedPointId=id;$('pointTitle').textContent=p.label;$('pointCopy').textContent=`Стена ${p.wall} · ${p.device||'коммуникация'}`;$('pointX').value=p.xMm;$('pointZ').value=p.zMm;$('pointDialog').showModal?.();}
  function savePoint(){const p=points.find(x=>x.id===selectedPointId);if(!p)return;p.xMm=clamp(Math.round(Number($('pointX').value)||0),0,wallLength(p.wall));p.zMm=clamp(Math.round(Number($('pointZ').value)||0),0,room().heightMm);p.edited=true;$('pointDialog').close?.();persistPoints('UNCONFIRMED').catch(showError);render();}
  $('wallCanvas').addEventListener('click',e=>{const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)*e.currentTarget.width/rect.width,y=(e.clientY-rect.top)*e.currentTarget.height/rect.height;const hit=hitAreas.find(a=>Math.hypot(x-a.x,y-a.y)<=a.r);if(hit)openPoint(hit.id);});
  $('pointClose').addEventListener('click',()=>$('pointDialog').close?.());$('pointSave').addEventListener('click',savePoint);document.querySelectorAll('[data-axis]').forEach(b=>b.addEventListener('click',()=>{const field=$(b.dataset.axis==='x'?'pointX':'pointZ');field.value=String(Math.max(0,(Number(field.value)||0)+Number(b.dataset.delta||0)));}));

  function featureName(type){return{WINDOW:'окна',PROJECTION:'выступа',COLUMN:'колонны',NICHE:'ниши'}[type]||'элемента';}
  function numberStep(key,title,subtitle,{min=0,max=null}={}){return{key,kind:'number',title,subtitle,min,max};}
  function choiceStep(key,title,subtitle,choices){return{key,kind:'choice',title,subtitle,choices};}
  function stepsFor(type){
    const wallChoices=activeWalls().map(w=>({value:w,label:`Стена ${w}`}));
    const commonWall=choiceStep('wall',`На какой стене находится ${featureName(type)}?`,'Выберите стену текущей конфигурации.',wallChoices);
    if(type==='WINDOW')return[
      commonWall,
      numberStep('width_mm','Укажите ширину окна','Фактический размер окна в миллиметрах.',{min:1}),
      numberStep('height_mm','Укажите высоту окна','Фактическая высота оконного проёма.',{min:1}),
      numberStep('x_mm','Положение окна по стене','X — расстояние от начала выбранной стены до левого края окна.',{min:0}),
      numberStep('z_mm','Высота низа окна от пола','Укажите положение нижнего края окна.',{min:0}),
      choiceStep('radiator_present','Есть ли радиатор под окном?','Если да, BIZET OS примет ширину радиатора равной ширине окна, а вылет от стены — 130 мм.',[{value:'YES',label:'Да'},{value:'NO',label:'Нет'}]),
      numberStep('radiator_height_mm','Укажите высоту радиатора','Ширина уже берётся по ширине окна; вылет — 130 мм.',{min:1}),
      choiceStep('curtain_present','Есть штора и подшторник?','Если да: вылет подшторника 200 мм, опуск от потолка 100 мм, длина — ширина окна + 200 мм.',[{value:'YES',label:'Да'},{value:'NO',label:'Нет'}])
    ];
    return[
      commonWall,
      numberStep('width_mm',`Укажите ширину ${featureName(type)}`,'Фактический размер по стене.',{min:1}),
      numberStep('height_mm',`Укажите высоту ${featureName(type)}`,'Фактическая высота элемента.',{min:1}),
      numberStep('depth_mm',`Укажите глубину ${featureName(type)}`,'Для ниши — глубина внутрь стены; для выступа/колонны — вылет в помещение.',{min:1}),
      numberStep('x_mm',`Положение ${featureName(type)} по стене`,'X — от начала выбранной стены до элемента.',{min:0}),
      numberStep('z_mm',`Положение ${featureName(type)} по высоте`,'Z — от пола до нижней точки элемента.',{min:0})
    ];
  }
  function currentQuestSteps(){return stepsFor(questType).filter(s=>!(s.key==='radiator_height_mm'&&questDraft.radiator_present!=='YES'));}
  function startFeature(type){questType=type;questDraft={type};questIndex=0;$('commMain').hidden=true;$('featureQuest').hidden=false;renderQuest();window.scrollTo({top:0,behavior:'instant'});}
  function closeQuest(){questType=null;questDraft={};questIndex=0;$('featureQuest').hidden=true;$('commMain').hidden=false;render();window.scrollTo({top:0,behavior:'smooth'});}
  function renderQuest(){
    const steps=currentQuestSteps(),step=steps[questIndex];if(!step){finishFeature().catch(showError);return;}
    $('questProgress').textContent=`Шаг ${questIndex+1} из ${steps.length}`;$('questTitle').textContent=step.title;$('questSubtitle').textContent=step.subtitle||'';
    if(step.kind==='choice'){$('questBody').innerHTML=`<div class="quest-choices">${step.choices.map(c=>`<button class="quest-choice" type="button" data-choice="${c.value}">${c.label}</button>`).join('')}</div>`;$('questBody').querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{questDraft[step.key]=b.dataset.choice;questIndex+=1;renderQuest();}));return;}
    const max=step.key==='x_mm'?wallLength(questDraft.wall||activeWall):(step.key==='z_mm'?room().heightMm:step.max);$('questBody').innerHTML=`<div class="quest-number"><label>${step.title}</label><div><input id="questNumber" type="number" inputmode="numeric" step="1" ${step.min!=null?`min="${step.min}"`:''} ${max!=null?`max="${max}"`:''} value="${questDraft[step.key]??''}" autofocus><b>мм</b></div><button class="primary-action" id="questNext" type="button">Сохранить и дальше →</button></div>`;$('questNext').addEventListener('click',()=>{const value=Math.round(Number($('questNumber').value));if(!Number.isFinite(value)||value<(step.min??0)||(max!=null&&value>max))return;$('questNumber').value=String(value);questDraft[step.key]=value;questIndex+=1;renderQuest();});
  }
  async function finishFeature(){
    const base={id:uid(),source:'BIZET_R5_ROOM_FEATURE',type:questType,wall:questDraft.wall,x_mm:Number(questDraft.x_mm)||0,z_mm:Number(questDraft.z_mm)||0,width_mm:Number(questDraft.width_mm)||0,height_mm:Number(questDraft.height_mm)||0,depth_mm:Number(questDraft.depth_mm)||0,confirmed:true};
    if(questType==='NICHE')base.direction='INWARD';if(questType==='PROJECTION')base.direction='OUTWARD';features.push(base);
    if(questType==='WINDOW'&&questDraft.radiator_present==='YES')features.push({id:uid(),source:'BIZET_R5_ROOM_FEATURE',type:'RADIATOR',wall:base.wall,parent_id:base.id,x_mm:base.x_mm,z_mm:0,width_mm:base.width_mm,height_mm:Number(questDraft.radiator_height_mm)||0,depth_mm:130,confirmed:true,derived_rule:'WIDTH_EQUALS_WINDOW;DEPTH_130'});
    if(questType==='WINDOW'&&questDraft.curtain_present==='YES')features.push({id:uid(),source:'BIZET_R5_ROOM_FEATURE',type:'CURTAIN_RECESS',wall:base.wall,parent_id:base.id,x_mm:Math.max(0,base.x_mm-100),z_mm:Math.max(0,room().heightMm-100),width_mm:base.width_mm+200,height_mm:100,depth_mm:200,confirmed:true,derived_rule:'WINDOW_PLUS_100_EACH_SIDE;PROJECTION_200;CEILING_DROP_100'});
    await persistFeatures();
    try{await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});}catch(_){}
    visual={...(project.scene?.visual_settings||visual),room_geometry_review_status:'RECALCULATED_AFTER_ROOM_FEATURE'};
    try{await patch('scene.visual_settings',visual,'Reanalyse room after architectural feature');}catch(_){}
    closeQuest();$('autoStatus').textContent='Помещение уточнено · модель отмечена на пересчёт';$('autoStatusCopy').textContent='Новые конструкционные элементы сохранены. BIZET OS повторно анализирует геометрию перед следующим построением.';
  }
  document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>startFeature(b.dataset.feature)));$('questCancel').addEventListener('click',closeQuest);

  async function continueToMaterials(reviewState){
    $('errorNode').hidden=true;
    try{
      await persistPoints(reviewState==='CONFIRMED'?'CONFIRMED':'UNCONFIRMED');
      await persistFeatures();
      visual={...(project.scene?.visual_settings||visual),communications_review_status:reviewState,communications_auto_version:'2026-09-10-r5'};
      await patch('scene.visual_settings',visual,'Communication verification complete');
      try{await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}/recalculate`,{method:'POST'});}catch(_){}
      location.assign(`/materials?project=${encodeURIComponent(projectId)}`);
    }catch(error){showError(error);}
  }
  $('confirmButton').addEventListener('click',()=>continueToMaterials('CONFIRMED'));
  $('skipReviewButton').addEventListener('click',()=>continueToMaterials('ACCEPTED_SYSTEM_DEFAULTS'));
  $('printButton').addEventListener('click',()=>{renderPrint();window.print();});
  $('backButton').addEventListener('click',()=>location.assign(`/model?project=${encodeURIComponent(projectId)}`));
  window.addEventListener('bizet:themechange',()=>drawWall());window.addEventListener('resize',()=>drawWall());

  async function init(){
    if(!projectId){showError('Проект не найден. Вернитесь к 3D-модели.');return;}
    try{
      project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);visual={...(project.scene?.visual_settings||{})};inputs={...(visual.guided_inputs||{})};
      try{snapshot=JSON.parse(sessionStorage.getItem('bizet_r5_model_snapshot')||'null');}catch(_){snapshot=null;}
      features=(project.room?.architectural_elements||[]).filter(parseFeature).map(f=>({...f}));
      points=loadManagedPoints();
      if(!points.length){points=generateAutomaticPoints();await persistPoints('UNCONFIRMED');}
      activeWall=activeWalls()[0]||'A';render();
    }catch(error){showError(error);}
  }
  init();
})();
