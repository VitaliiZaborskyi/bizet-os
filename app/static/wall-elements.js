const PROJECT_KEY='bizet_os_project_id';
const STORAGE_KEY='bizet_r7_wall_elements';
const TYPES={WINDOW:'Окно',PROJECTION:'Выступ',NICHE:'Ниша',COLUMN:'Колонна'};
const WALLS=['A','B','C','D'];
let activeWall='A'; let activeType='';
let elements=[];
try{elements=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')||[]}catch{elements=[]}
const $=id=>document.getElementById(id);
function renderTabs(){const root=$('wallTabs');root.innerHTML='';WALLS.forEach(w=>{const b=document.createElement('button');b.type='button';b.className='wall-tab'+(w===activeWall?' is-active':'');b.textContent='Стена '+w;b.onclick=()=>{activeWall=w;renderTabs();renderList();$('wallTitle').textContent='Стена '+w};root.appendChild(b)})}
function renderList(){const root=$('elementsList');const list=elements.filter(x=>x.wall===activeWall);if(!list.length){root.innerHTML='<div class="empty-state">На этой стене дополнительных элементов нет.</div>';return}root.innerHTML='';list.forEach(item=>{const row=document.createElement('div');row.className='element-row';row.innerHTML=`<div><strong>${TYPES[item.type]||item.type}</strong><small>${item.width} × ${item.height}${item.depth?` × ${item.depth}`:''} мм · X ${item.x} · Z ${item.z}</small></div><button class="delete-element" type="button" aria-label="Удалить">×</button>`;row.querySelector('button').onclick=()=>{elements=elements.filter(x=>x.id!==item.id);persist();renderList()};root.appendChild(row)})}
async function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(elements));const id=sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY);if(!id)return;try{await fetch(`/api/v1.1/projects/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:'room.architectural_elements',value:elements,source:'USER_ENTERED',confirmed:true,reason:'r7_wall_elements'})})}catch(e){console.warn('wall elements patch deferred',e)}}
function openForm(type){activeType=type;$('selectedTypeLabel').textContent=TYPES[type];$('elementForm').hidden=false;$('elDepth').value=type==='WINDOW'?'':100;$('elWidth').focus()}
$('elementTypes').querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>openForm(b.dataset.type)));
$('cancelElement').onclick=()=>{$('elementForm').hidden=true;activeType=''};
$('elementForm').addEventListener('submit',async e=>{e.preventDefault();if(!activeType)return;const item={id:'we_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),wall:activeWall,type:activeType,width:Number($('elWidth').value),height:Number($('elHeight').value),depth:Number($('elDepth').value||0),x:Number($('elX').value),z:Number($('elZ').value)};if(!item.width||!item.height||item.x<0||item.z<0)return;elements.push(item);await persist();e.target.reset();e.target.hidden=true;activeType='';renderList();$('saveNote').textContent='Сохранено. BIZET учтёт элемент при последующем построении.'});
$('toAppliances').onclick=async()=>{await persist();window.location.assign('/guided')};
renderTabs();renderList();