(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const CONFIG_KEY='bizet_pilot_configuration';
  const CONFIG_WALLS={WALL_CENTER:['A'],WALL_LEFT:['A'],WALL_RIGHT:['A'],L_LEFT:['A','B'],L_RIGHT:['A','C'],U_SHAPE:['A','B','C'],CUSTOM:[]};
  const CONFIG_LABELS={WALL_CENTER:'Линейная — по центру',WALL_LEFT:'Линейная — от левого края',WALL_RIGHT:'Линейная — от правого края',L_LEFT:'Г-образная — крыло слева',L_RIGHT:'Г-образная — крыло справа',U_SHAPE:'П-образная',CUSTOM:'Своя конфигурация'};
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  if(projectId){sessionStorage.setItem(PROJECT_KEY,projectId);localStorage.setItem(PROJECT_KEY,projectId)}
  const configuration=sessionStorage.getItem(CONFIG_KEY)||localStorage.getItem(CONFIG_KEY)||'WALL_CENTER';
  const activeWalls=CONFIG_WALLS[configuration]||['A'];
  let project=null,visual={},activeSurface=null,dimensionsVisible=true,roomScene=null;

  function errorText(payload,fallback){if(typeof payload?.detail==='string')return payload.detail;if(Array.isArray(payload?.detail)&&typeof payload.detail[0]?.msg==='string')return payload.detail[0].msg;return fallback}
  async function request(url,options={}){const response=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!response.ok){let payload=null;try{payload=await response.json()}catch(_){}throw new Error(errorText(payload,'Не удалось сохранить данные. Повторите попытку.'))}return response.json()}
  async function patch(path,value,extra={}){const result=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path,value,...extra})});project=result.project||result;visual={...(project.scene?.visual_settings||{})}}
  function measured(key,fallback){const value=project?.room?.geometry?.[key]?.value_mm;return Number.isFinite(value)&&value>0?value:fallback}
  function wallHeights(){return{...(visual.wall_heights||{})}}
  function values(){const baseHeight=measured('room_height',2800),heights=wallHeights();return{length:measured('wall_length',6000),depth:measured('wall_depth',4200),heightA:Number(heights.A)||baseHeight,heightB:Number(heights.B)||baseHeight,heightC:Number(heights.C)||baseHeight}}
  function wallLength(wall,v){return wall==='A'?v.length:v.depth}
  function wallHeight(wall,v){return v[`height${wall}`]||measured('room_height',2800)}

  function draw3D(){
    if(!project||!window.BizetPilot3D)return;const v=values();const maxHeight=Math.max(v.heightA,v.heightB,v.heightC,1200);
    roomScene=window.BizetPilot3D.drawRoomScene($('roomCanvas'),{configuration,activeWalls,showDimensions:dimensionsVisible,room:{lengthMm:v.length,depthMm:v.depth,heightMm:maxHeight}});
  }
  function render(){
    const v=values();$('activeConfigLabel').textContent=CONFIG_LABELS[configuration]||'Выбранная конфигурация';
    const rows=[`<div class="surface-row"><div><strong>Пол</strong><span>${v.length} × ${v.depth} мм</span></div><button type="button" data-edit="FLOOR">Изменить</button></div>`,...activeWalls.map(wall=>`<div class="surface-row"><div><strong>Стена ${wall}</strong><span>${wallLength(wall,v)} × H ${wallHeight(wall,v)} мм</span></div><button type="button" data-edit="${wall}">Изменить</button></div>`)];
    if(!activeWalls.length)rows.push('<div class="surface-row"><div><strong>Своя конфигурация</strong><span>Распознавание стен — следующий слой. Сейчас доступен размер пола.</span></div></div>');
    $('surfaceList').innerHTML=rows.join('');$('surfaceList').querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>openEditor(btn.dataset.edit)));draw3D();
  }
  function field(label,id,value){return `<label class="field"><span>${label}</span><div class="field-wrap"><input id="${id}" type="number" min="100" max="50000" step="1" inputmode="numeric" value="${value}"><em>мм</em></div></label>`}
  function openEditor(surface){
    if(surface!=='FLOOR'&&!activeWalls.includes(surface))return;activeSurface=surface;const v=values();
    if(surface==='FLOOR'){$('dialogTitle').textContent='Укажите размеры пола';$('dialogHelp').textContent='Размеры пола автоматически обновляют связанные длины стен. Стены затем можно уточнить отдельно.';$('dialogFields').innerHTML=`<div class="field-grid">${field('Длина','fieldPrimary',v.length)}${field('Глубина','fieldSecondary',v.depth)}</div>`}
    else{$('dialogTitle').textContent=`Укажите размеры стены ${surface}`;$('dialogHelp').textContent=surface==='A'?'Изменение длины стены A обновит длину пола.':'Изменение длины боковой стены обновит глубину пола. Высота хранится отдельно для этой стены.';$('dialogFields').innerHTML=`<div class="field-grid">${field('Длина','fieldPrimary',wallLength(surface,v))}${field('Высота','fieldSecondary',wallHeight(surface,v))}</div>`}
    $('dialogError').hidden=true;$('dimensionDialog').showModal?.();
  }
  async function saveEditor(){
    const p=Math.round(Number($('fieldPrimary')?.value)),s=Math.round(Number($('fieldSecondary')?.value));if(![p,s].every(n=>Number.isFinite(n)&&n>=100&&n<=50000)){$('dialogError').textContent='Введите корректные размеры в миллиметрах.';$('dialogError').hidden=false;return}
    $('saveDimension').disabled=true;
    try{
      if(activeSurface==='FLOOR'){await patch('room.geometry.wall_length',p,{source:'USER_CONFIRMED',confirmed:true,reason:'Configuration-aware floor dimensions'});await patch('room.geometry.wall_depth',s,{source:'USER_CONFIRMED',confirmed:true,reason:'Configuration-aware floor dimensions'})}
      else{const lengthPath=activeSurface==='A'?'room.geometry.wall_length':'room.geometry.wall_depth';await patch(lengthPath,p,{source:'USER_CONFIRMED',confirmed:true,reason:`Wall ${activeSurface} linked length`});const heights=wallHeights();heights[activeSurface]=s;await patch('scene.visual_settings',{...visual,wall_heights:heights,active_configuration_walls:activeWalls,dimension_input_mode:'SURFACE_DIRECT',dimension_camera_mode:'LOCKED_PERSPECTIVE_3D'},{reason:`Wall ${activeSurface} height`});if(activeSurface==='A')await patch('room.geometry.room_height',s,{source:'USER_CONFIRMED',confirmed:true,reason:'Primary wall height compatibility'})}
      render();$('dimensionDialog').close?.();
    }catch(error){$('dialogError').textContent=error.message;$('dialogError').hidden=false}finally{$('saveDimension').disabled=false}
  }

  $('roomCanvas').addEventListener('click',event=>{if(!roomScene)return;const rect=$('roomCanvas').getBoundingClientRect();const surface=roomScene.hitTest(event.clientX-rect.left,event.clientY-rect.top);if(surface)openEditor(surface)});
  $('saveDimension').addEventListener('click',saveEditor);
  $('toggleDimensions').addEventListener('click',()=>{dimensionsVisible=!dimensionsVisible;$('toggleDimensions').textContent=`Размеры: ${dimensionsVisible?'видно':'скрыто'}`;$('toggleDimensions').setAttribute('aria-pressed',String(dimensionsVisible));draw3D()});
  $('continueButton').addEventListener('click',()=>location.assign(`/guided?stage=ceiling&project=${encodeURIComponent(projectId)}`));
  $('backButton').addEventListener('click',()=>history.back());
  window.addEventListener('resize',()=>requestAnimationFrame(draw3D));
  window.addEventListener('bizet:themechange',()=>requestAnimationFrame(draw3D));

  (async()=>{
    if(!projectId){$('errorNode').textContent='Проект не найден. Вернитесь к выбору конфигурации.';$('errorNode').hidden=false;return}
    try{project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);visual={...(project.scene?.visual_settings||{})};await patch('scene.visual_settings',{...visual,active_configuration_walls:activeWalls,dimension_input_mode:'SURFACE_DIRECT',dimension_camera_mode:'LOCKED_PERSPECTIVE_3D'},{reason:'Enter locked perspective 3D dimension pilot'});render()}catch(error){$('errorNode').textContent=error.message;$('errorNode').hidden=false}
  })();
})();
