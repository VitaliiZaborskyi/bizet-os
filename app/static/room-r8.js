(()=> {
  const KEY='bizet_os_project_id';
  const $=id=>document.getElementById(id);
  const pid=()=>new URLSearchParams(location.search).get('project')||sessionStorage.getItem(KEY)||localStorage.getItem(KEY)||'';
  async function request(url,options={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось сохранить размеры.')}
    return r.json();
  }
  async function patch(path,value){
    const id=pid();if(!id)throw new Error('Проект не найден.');
    const r=await request('/api/v1.1/projects/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({path,value:Math.round(Number(value)||0),source:'USER_ENTERED',confirmed:false,reason:'R8 minimum room dimensions'})});
    return r.project||r;
  }
  function measured(project,key,fallback){const v=project?.room?.geometry?.[key]?.value_mm;return Number.isFinite(v)&&v>0?v:fallback}
  function injectStyles(){
    if($('r8RoomStyles'))return;
    const s=document.createElement('style');s.id='r8RoomStyles';s.textContent=`
      .room-experience{max-width:1180px!important}
      .viewport-toolbar,.view-cube-shell,#r6ManualGeometry{display:none!important}
      .room-actions{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:end!important;gap:18px!important}
      .room-actions .scope-note{display:none!important}
      .r8-dimension-entry{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
      .r8-dimension-entry label{display:block}
      .r8-dimension-entry span{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}
      .r8-dimension-entry input{width:100%;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:12px;padding:11px 12px;font:inherit}
      .r8-room-error{grid-column:1/-1;margin:0;color:#a43832;font-size:12px}
      #startMeasurementButton{min-width:260px!important}
      @media(max-width:760px){.room-actions{grid-template-columns:1fr!important}.r8-dimension-entry{grid-template-columns:1fr}#startMeasurementButton{width:100%;min-width:0!important}}
    `;document.head.appendChild(s);
  }
  async function apply(){
    injectStyles();
    document.getElementById('r6ManualGeometry')?.remove();
    const actions=document.querySelector('.room-actions');if(!actions)return;
    let form=$('r8DimensionEntry');
    if(!form){
      form=document.createElement('div');form.id='r8DimensionEntry';form.className='r8-dimension-entry';
      form.innerHTML='<label><span>Длина основной стены, мм</span><input id="r8Length" type="number" min="1000" step="1" inputmode="numeric" value="6000"></label><label><span>Глубина помещения, мм</span><input id="r8Depth" type="number" min="1000" step="1" inputmode="numeric" value="4200"></label><label><span>Высота помещения, мм</span><input id="r8Height" type="number" min="2000" step="1" inputmode="numeric" value="2800"></label><p class="r8-room-error" id="r8RoomError" hidden></p>';
      actions.insertBefore(form,$('startMeasurementButton'));
      try{
        const id=pid();if(id){const p=await request('/api/v1.1/projects/'+encodeURIComponent(id));$('r8Length').value=measured(p,'wall_length',6000);$('r8Depth').value=measured(p,'wall_depth',4200);$('r8Height').value=measured(p,'room_height',2800)}
      }catch(_){}
    }
    const old=$('startMeasurementButton');if(!old)return;
    if(old.dataset.r8Final==='1')return;
    const n=old.cloneNode(true);old.replaceWith(n);n.id='startMeasurementButton';n.dataset.r8Final='1';
    const label=n.querySelector('span');if(label)label.textContent='Создать базовый вариант';
    n.onclick=async()=>{
      const L=Math.round(Number($('r8Length')?.value)),D=Math.round(Number($('r8Depth')?.value)),H=Math.round(Number($('r8Height')?.value));
      const err=$('r8RoomError');if(!Number.isFinite(L)||L<1000||!Number.isFinite(D)||D<1000||!Number.isFinite(H)||H<2000){err.textContent='Проверьте габариты помещения.';err.hidden=false;return}
      err.hidden=true;n.disabled=true;
      try{
        await patch('room.geometry.wall_length',L);await patch('room.geometry.wall_depth',D);await patch('room.geometry.room_height',H);
        const id=pid();location.assign('/workspace'+(id?'?project='+encodeURIComponent(id):''));
      }catch(e){err.textContent=e.message;err.hidden=false;n.disabled=false}
    };
    const title=$('roomTitle'),sub=$('roomSubtitle');
    if(title)title.textContent='Габариты помещения';
    if(sub)sub.textContent='Введите три базовых размера. Следующий экран — уже ваша кухня.';
    const gesture=$('gestureHint');if(gesture)gesture.textContent='3D помещения · базовые габариты';
  }
  document.addEventListener('DOMContentLoaded',apply);
  window.addEventListener('pageshow',apply);
  setTimeout(apply,80);setTimeout(apply,500);
})();