(()=> {
  const KEY='bizet_os_project_id',CONFIG='bizet_pilot_configuration';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(KEY)||localStorage.getItem(KEY)||'';
  if(projectId){sessionStorage.setItem(KEY,projectId);localStorage.setItem(KEY,projectId)}
  const configuration=sessionStorage.getItem(CONFIG)||localStorage.getItem(CONFIG)||'WALL_CENTER';
  const labels={WALL_CENTER:'Линейная · по центру',WALL_LEFT:'Линейная · слева',WALL_RIGHT:'Линейная · справа',L_LEFT:'Г-образная · крыло слева',L_RIGHT:'Г-образная · крыло справа',U_SHAPE:'П-образная'};
  $('configurationLabel').textContent=labels[configuration]||configuration;

  async function request(url,options={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:'Не удалось сохранить данные')}
    return r.json();
  }
  function measured(p,key,fallback){const v=p?.room?.geometry?.[key]?.value_mm;return Number.isFinite(v)&&v>0?v:fallback}
  async function load(){
    if(!projectId)return;
    try{
      const p=await request('/api/v1.1/projects/'+encodeURIComponent(projectId));
      $('roomLength').value=measured(p,'wall_length',6000);
      $('roomDepth').value=measured(p,'wall_depth',4200);
      $('roomHeight').value=measured(p,'room_height',2800);
    }catch(_){}
  }
  async function patch(path,value){
    return request('/api/v1.1/projects/'+encodeURIComponent(projectId),{method:'PATCH',body:JSON.stringify({path,value:Math.round(value),source:'USER_ENTERED',confirmed:false,reason:'R8 minimal geometry before base model'})});
  }

  $('setupBack').onclick=()=>history.back();
  $('createBaseModel').onclick=async()=>{
    const L=Math.round(Number($('roomLength').value)),D=Math.round(Number($('roomDepth').value)),H=Math.round(Number($('roomHeight').value)),err=$('setupError'),btn=$('createBaseModel');
    if(!projectId){err.textContent='Проект не найден. Вернитесь на первый экран.';err.hidden=false;return}
    if(!Number.isFinite(L)||L<1000||!Number.isFinite(D)||D<1000||!Number.isFinite(H)||H<2000){err.textContent='Проверьте три размера помещения.';err.hidden=false;return}
    err.hidden=true;btn.disabled=true;
    try{
      await patch('room.geometry.wall_length',L);
      await patch('room.geometry.wall_depth',D);
      await patch('room.geometry.room_height',H);
      await window.BizetTransition?.play({duration:2500});
      location.assign('/workspace?project='+encodeURIComponent(projectId));
    }catch(e){err.textContent=e.message;err.hidden=false;btn.disabled=false}
  };
  load();
})();