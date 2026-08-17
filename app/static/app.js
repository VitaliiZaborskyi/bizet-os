import { drawSkeleton } from './visualizer.js';
const $=id=>document.getElementById(id);
let objectType='NEW_BUILD', configuration='LEFT_WALL', lastProject=null, applicationNo=null;
const SOURCE_OPTIONS=[['USER_ENTERED','Введено'],['USER_CONFIRMED','Подтверждено'],['SCAN_DETECTED','Из скана'],['ESTIMATED','Оценка']];
const COMM_TYPES=[['DRAIN','Канализация'],['WATER','Вода'],['COOKTOP_POWER','Питание варочной'],['GAS','Газ'],['VENT','Вентиляция'],['APPLIANCE_POWER','Питание техники'],['LIGHT_POWER','Подсветка']];
const OBSTACLE_TYPES=[['RETURN','Заплечник'],['PROJECTION','Выступ/короб'],['COLUMN','Колонна'],['WINDOW','Окно'],['SILL','Подоконник'],['DOOR','Дверь'],['OPENING','Проём'],['RADIATOR','Радиатор'],['SKIRTING','Плинтус'],['OTHER','Другое']];

function options(arr,selected){return arr.map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${l}</option>`).join('')}
document.querySelectorAll('select.source').forEach(s=>s.innerHTML=options(SOURCE_OPTIONS,'USER_ENTERED'));

function cards(id,setter){$(id).querySelectorAll('.card:not(.disabled)').forEach(b=>b.onclick=()=>{ $(id).querySelectorAll('.card').forEach(x=>x.classList.remove('active')); b.classList.add('active'); setter(b.dataset.value); scheduleGenerate(); });}
cards('objectCards',v=>objectType=v); cards('configCards',v=>{configuration=v; syncWallDefaults();});

function syncWallDefaults(){
  if(configuration==='LEFT_WALL'){ if(+$('leftDepth').value===0) $('leftDepth').value=600; $('rightDepth').value=0; }
  if(configuration==='RIGHT_WALL'){ $('leftDepth').value=0; if(+$('rightDepth').value===0) $('rightDepth').value=600; }
  if(configuration==='BETWEEN_WALLS'){ if(+$('leftDepth').value===0) $('leftDepth').value=600; if(+$('rightDepth').value===0) $('rightDepth').value=600; }
}

function addObstacle(data={type:'PROJECTION',x_mm:800,width_mm:200,depth_mm:200,height_mm:2700,bottom_mm:0,source:'USER_ENTERED',confirmed:true}){
  const row=document.createElement('div'); row.className='data-row obstacle-row'; row.innerHTML=`
    <select class="o-type">${options(OBSTACLE_TYPES,data.type)}</select>
    <input class="o-x" type="number" value="${data.x_mm}" min="0" title="X, мм" placeholder="X">
    <input class="o-w" type="number" value="${data.width_mm}" min="1" title="Ширина, мм" placeholder="Ширина">
    <input class="o-d" type="number" value="${data.depth_mm}" min="0" title="Глубина, мм" placeholder="Глубина">
    <input class="o-h" type="number" value="${data.height_mm}" min="0" title="Высота, мм" placeholder="Высота">
    <select class="o-source">${options(SOURCE_OPTIONS,data.source)}</select>
    <button class="row-remove" type="button">×</button>`;
  row.querySelector('.row-remove').onclick=()=>{row.remove();scheduleGenerate()}; row.querySelectorAll('input,select').forEach(x=>{x.addEventListener('change',scheduleGenerate);x.addEventListener('input',scheduleGenerate)}); $('obstacleRows').append(row);
}
function addCommunication(data={type:'DRAIN',x_mm:1100,y_mm:0,z_mm:450,tolerance_radius_mm:125,source:'USER_ENTERED',confirmed:true}){
  const row=document.createElement('div'); row.className='data-row comm-row'; row.innerHTML=`
    <select class="c-type">${options(COMM_TYPES,data.type)}</select>
    <input class="c-x" type="number" value="${data.x_mm}" min="0" title="X, мм" placeholder="X">
    <input class="c-z" type="number" value="${data.z_mm}" min="0" title="Высота Z, мм" placeholder="Z">
    <input class="c-tol" type="number" value="${data.tolerance_radius_mm}" min="0" title="Допуск, мм" placeholder="±">
    <select class="c-source">${options(SOURCE_OPTIONS,data.source)}</select>
    <label class="tiny-check"><input class="c-confirmed" type="checkbox" ${data.confirmed?'checked':''}>✓</label>
    <button class="row-remove" type="button">×</button>`;
  row.querySelector('.row-remove').onclick=()=>{row.remove();scheduleGenerate()}; row.querySelectorAll('input,select').forEach(x=>{x.addEventListener('change',scheduleGenerate);x.addEventListener('input',scheduleGenerate)}); $('communicationRows').append(row);
}
$('addObstacle').onclick=()=>addObstacle(); $('addCommunication').onclick=()=>addCommunication();

function obstacles(){return [...document.querySelectorAll('.obstacle-row')].map((r,i)=>({id:`obs-${i+1}`,type:r.querySelector('.o-type').value,x_mm:+r.querySelector('.o-x').value,width_mm:+r.querySelector('.o-w').value,depth_mm:+r.querySelector('.o-d').value,height_mm:+r.querySelector('.o-h').value,bottom_mm:0,source:r.querySelector('.o-source').value,confirmed:true}))}
function communications(){return [...document.querySelectorAll('.comm-row')].map((r,i)=>({id:`comm-${i+1}`,type:r.querySelector('.c-type').value,x_mm:+r.querySelector('.c-x').value,y_mm:0,z_mm:+r.querySelector('.c-z').value,tolerance_radius_mm:+r.querySelector('.c-tol').value,source:r.querySelector('.c-source').value,confirmed:r.querySelector('.c-confirmed').checked}))}
function appliances(){const a=[];if($('fridgeOn').checked)a.push({type:$('fridgeType').value,width_mm:+$('fridgeWidth').value,side:$('fridgeSide').value,built_in:$('fridgeType').value==='FRIDGE_BUILTIN'});if($('sinkOn').checked)a.push({type:'SINK',width_mm:+$('sinkWidth').value});if($('dwOn').checked)a.push({type:'DISHWASHER',width_mm:+$('dwWidth').value});if($('cookOn').checked)a.push({type:'COOKTOP',width_mm:+$('cookWidth').value});if($('ovenOn').checked)a.push({type:'OVEN',width_mm:600});return a}
function payload(){
 const p={application_no:applicationNo,object_type:objectType,configuration,opening_system:$('openingSystem').value,
 room:{wall_length:{value_mm:+$('wallLength').value,source:$('wallSource').value},room_height:{value_mm:+$('roomHeight').value,source:$('heightSource').value},wall_depth:{value_mm:+$('wallDepth').value,source:$('depthSource').value},left_wall:{depth_mm:+$('leftDepth').value,deviation_mm:+$('leftDeviation').value,is_deep_wall:+$('leftDepth').value>=560,source:'USER_ENTERED'},right_wall:{depth_mm:+$('rightDepth').value,deviation_mm:+$('rightDeviation').value,is_deep_wall:+$('rightDepth').value>=560,source:'USER_ENTERED'},horizontal_deviation_mm:+$('horizontalDeviation').value,vertical_deviation_mm:+$('verticalDeviation').value,finished_floor:$('finishedFloor').checked,skirting_present:$('skirtingPresent').checked,ceiling_type:$('ceilingType').value,ceiling_gap_mm:+$('ceilingGap').value,obstacles:obstacles()},
 communications:communications(),appliances:appliances(),preferences:{budget_priority:true,users_count:+$('usersCount').value,cutlery_tray:$('cutleryOn').checked,comfort_mode:false,mezzanine:false}}; lastProject=p; return p;
}

let skeletonView='PERSPECTIVE';
function renderRoom(room){$('roomSummary').innerHTML=`<span>${room.wall_length_mm} мм</span><span>${room.room_height_mm} мм высота</span><span>${room.obstacles.length} препятствий</span><span>${room.communications.length} выводов</span>`}
function renderCandidate(data,room,c){$('layoutTitle').textContent=c?`Заявка ${data.application_no} • ${c.candidate_id}`:'Конфигурация не построена';const status=c?.validation.status||'STOP',badge=$('validationBadge');badge.textContent=status;badge.className='validation '+({VALID:'valid',VALID_WITH_WARNINGS:'warning',HUMAN_REVIEW:'review',STOP:'stop'}[status]||'neutral');drawSkeleton($('kitchenSvg'),c,room,lastProject,skeletonView);renderRoom(room);$('metrics').innerHTML=c?`<div class="metric"><strong>${c.room_length_mm}</strong><span>стена, мм</span></div><div class="metric"><strong>${c.used_length_mm}</strong><span>занято, мм</span></div><div class="metric"><strong>${c.residual_mm}</strong><span>остаток, мм</span></div><div class="metric"><strong>${data.candidates.length}</strong><span>кандидатов</span></div>`:'';const msgs=[];[...(data.global_warnings||[]),...(c?.validation.warnings||[])].forEach(x=>msgs.push(`<div class="message">⚠ ${x}</div>`));(c?.validation.human_review||[]).forEach(x=>msgs.push(`<div class="message review">👤 ${x}</div>`));(c?.validation.stops||[]).forEach(x=>msgs.push(`<div class="message stop">⛔ ${x}</div>`));$('messages').innerHTML=msgs.join('')||'<div class="message good">✓ Жёстких конфликтов не найдено</div>';$('ruleTrace').textContent=[...(room.rule_trace||[]),...(c?.applied_rules||[])].map(r=>`${r.rule_id} [${r.classification}]\n${r.message}${Object.keys(r.data||{}).length?'\n'+JSON.stringify(r.data):''}`).join('\n\n')||'—';document.querySelectorAll('.candidate-pill').forEach(x=>x.classList.toggle('active',x.dataset.id===c?.candidate_id));renderResultScreen(data,room,c)}
function render(data,room){const list=$('candidateList');list.innerHTML=(data.candidates||[]).map((c,i)=>{const b=c.score_breakdown||{};return `<button class="candidate-pill ${i===0?'active':''}" data-id="${c.candidate_id}"><b>${c.candidate_id}</b><span>${c.validation.status}</span><small>F ${Math.round(b.FUNCTION||0)} · B ${Math.round(b.BUDGET||0)} · E ${Math.round(b.EFFICIENT_SPACE||0)} · S ${Math.round(b.SYMMETRY||0)}</small></button>`}).join('');list.querySelectorAll('.candidate-pill').forEach(btn=>btn.onclick=()=>{const c=data.candidates.find(x=>x.candidate_id===btn.dataset.id);renderCandidate(data,room,c)});window.__bizetRender={data,room};renderCandidate(data,room,data.selected)}

function resultStatusText(status){return ({VALID:'Готово к пилотному согласованию',VALID_WITH_WARNINGS:'Готово с предупреждениями',HUMAN_REVIEW:'Нужна проверка специалиста',STOP:'Расчёт заблокирован'})[status]||status}
function renderResultScreen(data,room,c){
 const box=$('resultScreen'); if(!box||!c)return;
 $('resultApplicationNo').textContent=data.application_no;
 $('resultStatus').textContent=resultStatusText(c.validation.status);
 $('resultStatus').className='result-status '+c.validation.status.toLowerCase().replaceAll('_','-');
 $('resultMeta').textContent=`${room.wall_length_mm} мм • ${c.candidate_id} • ${data.rule_set_version}`;
 const rows=c.items.map(i=>`<tr><td>${i.label}</td><td>${i.kind}</td><td>${i.width_mm}</td><td>${i.x_mm}</td><td>${i.standard_width?'STD':'NONSTD'}</td></tr>`).join('');
 $('resultModules').innerHTML=rows;
 const warnings=[...(data.global_warnings||[]),...(c.validation.warnings||[])];
 const flags=[...(c.validation.human_review||[]).map(x=>'HUMAN REVIEW: '+x),...(c.validation.stops||[]).map(x=>'STOP: '+x)];
 $('resultNotes').innerHTML=[...warnings,...flags].map(x=>`<li>${x}</li>`).join('')||'<li>Blocking issues not found.</li>';
 drawSkeleton($('resultPerspective'),c,room,lastProject,'PERSPECTIVE');
 drawSkeleton($('resultFront'),c,room,lastProject,'FRONT');
 drawSkeleton($('resultPlan'),c,room,lastProject,'PLAN');
 box.hidden=false;
}

let timer;function scheduleGenerate(){clearTimeout(timer);timer=setTimeout(generate,220)}
async function generate(){const p=payload();$('generateBtn').disabled=true;$('generateBtn').textContent='Считаю…';try{const [rr,gr]=await Promise.all([fetch('/api/room/resolve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)}),fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)})]);if(!rr.ok)throw new Error(await rr.text());if(!gr.ok)throw new Error(await gr.text());const room=await rr.json(), data=await gr.json();if(!applicationNo)applicationNo=data.application_no;render(data,room)}catch(e){$('messages').innerHTML=`<div class="message stop">${e.message}</div>`}finally{$('generateBtn').disabled=false;$('generateBtn').textContent='Собрать конфигурацию'}}
async function health(){try{const r=await fetch('/api/health'),d=await r.json();$('health').textContent=`ENGINE ${d.rule_set_version}`;$('health').classList.add('online')}catch{$('health').textContent='ENGINE OFFLINE'}}
function seed(){ $('obstacleRows').innerHTML='';$('communicationRows').innerHTML='';addCommunication({type:'DRAIN',x_mm:1100,z_mm:450,tolerance_radius_mm:125,source:'USER_CONFIRMED',confirmed:true});addCommunication({type:'WATER',x_mm:1100,z_mm:500,tolerance_radius_mm:125,source:'USER_CONFIRMED',confirmed:true});addCommunication({type:'COOKTOP_POWER',x_mm:2200,z_mm:150,tolerance_radius_mm:125,source:'USER_ENTERED',confirmed:true});addCommunication({type:'APPLIANCE_POWER',x_mm:700,z_mm:150,tolerance_radius_mm:125,source:'USER_CONFIRMED',confirmed:true}); }
$('generateBtn').onclick=generate;$('loadExampleBtn').onclick=()=>{location.reload()};document.querySelectorAll('input,select').forEach(x=>{x.addEventListener('change',scheduleGenerate);x.addEventListener('input',scheduleGenerate)});seed();health();generate();

function redrawCurrent(){const r=window.__bizetRender;if(!r)return;const active=document.querySelector('.candidate-pill.active');const c=(r.data.candidates||[]).find(x=>x.candidate_id===active?.dataset.id)||r.data.selected;drawSkeleton($('kitchenSvg'),c,r.room,lastProject,skeletonView)}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');skeletonView=btn.dataset.view;redrawCurrent()}));

const printBtn=document.getElementById('printResultBtn');if(printBtn)printBtn.onclick=()=>window.print();
