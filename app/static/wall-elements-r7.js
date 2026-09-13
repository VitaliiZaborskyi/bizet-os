(()=>{
  const mode=new URLSearchParams(location.search).get('mode');
  if(mode!=='architectural') return;

  const PROJECT_KEY='bizet_os_project_id';
  const STORAGE_KEY='bizet_r7_wall_elements';
  const TYPES={WINDOW:'Окно',DOOR:'Дверь',RADIATOR:'Радиатор',CURTAIN_RECESS:'Подшторник / карниз',NICHE:'Ниша',COLUMN:'Колонна',PROJECTION:'Выступ',BEAM:'Балка',OTHER:'Другое'};
  const WALLS=['A','B','C','D'];
  let activeWall='A'; let activeType=''; let elements=[];
  try{elements=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')||[]}catch{elements=[]}

  document.body.classList.remove('communications-only');
  const root=document.querySelector('.elements-experience');
  if(!root) return;
  root.innerHTML=`
    <section class="wall-editor-head"><p class="step-meta">Дополнительно · необязательно</p><h1>Элементы стен</h1><p>Выберите стену. Сначала задайте габарит элемента, затем его положение относительно базового размера стены.</p></section>
    <nav class="wall-tabs" id="r7WallTabs"></nav>
    <section class="wall-card">
      <h2 id="r7WallTitle">Стена A</h2><p class="muted">Добавьте только элементы, которые влияют на мебель.</p>
      <div class="element-types" id="r7ElementTypes"></div>
      <form class="element-form" id="r7ElementForm" hidden>
        <strong id="r7SelectedType">Окно</strong>
        <label>Ширина элемента, мм<input id="r7Width" type="number" min="1" step="1" required></label>
        <label>Высота элемента, мм<input id="r7Height" type="number" min="1" step="1" required></label>
        <label>Глубина / выступ, мм<input id="r7Depth" type="number" min="0" step="1"></label>
        <label>От левого края стены, мм<input id="r7X" type="number" min="0" step="1" required></label>
        <label>От пола, мм<input id="r7Z" type="number" min="0" step="1" required></label>
        <div class="form-actions"><button class="r7-secondary-button" id="r7Cancel" type="button">Отмена</button><button class="primary-button" type="submit">Добавить</button></div>
      </form>
      <div class="elements-list" id="r7ElementsList"></div>
    </section>
    <div class="wall-editor-footer"><a class="r7-secondary-button" href="/room">К помещению</a><a class="primary-button" href="/guided">Выбор бытовой техники →</a></div>
    <p class="save-note" id="r7SaveNote">Элементы сохраняются в проекте. Логику обхода и филлеров настроим отдельным правилом.</p>`;
  root.classList.add('wall-editor');

  const $=id=>document.getElementById(id);
  function renderTabs(){const node=$('r7WallTabs');node.innerHTML='';WALLS.forEach(w=>{const b=document.createElement('button');b.type='button';b.className='wall-tab'+(w===activeWall?' is-active':'');b.textContent='Стена '+w;b.onclick=()=>{activeWall=w;$('r7WallTitle').textContent='Стена '+w;renderTabs();renderList()};node.appendChild(b)})}
  function renderTypes(){const node=$('r7ElementTypes');node.innerHTML='';Object.entries(TYPES).forEach(([key,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>openForm(key);node.appendChild(b)})}
  function renderList(){const node=$('r7ElementsList');const list=elements.filter(x=>x.wall===activeWall);if(!list.length){node.innerHTML='<div class="empty-state">На этой стене дополнительных элементов нет.</div>';return}node.innerHTML='';list.forEach(item=>{const row=document.createElement('div');row.className='element-row';row.innerHTML=`<div><strong>${TYPES[item.type]||item.type}</strong><small>${item.width} × ${item.height}${item.depth?` × ${item.depth}`:''} мм · X ${item.x} · Z ${item.z}</small></div><button class="delete-element" type="button" aria-label="Удалить">×</button>`;row.querySelector('button').onclick=()=>{elements=elements.filter(x=>x.id!==item.id);persist();renderList()};node.appendChild(row)})}
  function openForm(type){activeType=type;$('r7SelectedType').textContent=TYPES[type];$('r7ElementForm').hidden=false;$('r7Width').focus()}
  async function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(elements));const id=sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY);if(!id)return;try{const response=await fetch(`/api/v1.1/projects/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:'room.architectural_elements',value:elements,source:'USER_ENTERED',confirmed:true,reason:'r7_architectural_wall_elements'})});if(!response.ok)throw new Error('save_failed');$('r7SaveNote').textContent='Сохранено. Элементы привязаны к стенам текущего проекта.'}catch(error){console.warn(error);$('r7SaveNote').textContent='Данные сохранены в пилоте. Синхронизация с проектом повторится на следующем шаге.'}}
  $('r7Cancel').onclick=()=>{$('r7ElementForm').hidden=true;activeType=''};
  $('r7ElementForm').onsubmit=async event=>{event.preventDefault();if(!activeType)return;const item={id:'arch_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),wall:activeWall,type:activeType,width:Number($('r7Width').value),height:Number($('r7Height').value),depth:Number($('r7Depth').value||0),x:Number($('r7X').value),z:Number($('r7Z').value)};if(!(item.width>0&&item.height>0&&item.x>=0&&item.z>=0))return;elements.push(item);await persist();event.target.reset();event.target.hidden=true;activeType='';renderList()};
  renderTabs();renderTypes();renderList();
})();