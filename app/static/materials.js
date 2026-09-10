(() => {
  const KEY='bizet_os_project_id';
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(KEY)||localStorage.getItem(KEY)||'';
  if(projectId){sessionStorage.setItem(KEY,projectId);localStorage.setItem(KEY,projectId)}
  const $=id=>document.getElementById(id);

  async function request(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!r.ok)throw new Error('Не удалось сохранить подтверждение.');return r.json()}

  $('backButton').addEventListener('click',()=>history.back());
  $('confirmMaterials').addEventListener('click',async()=>{
    if(!projectId){$('status').textContent='Проект не найден.';return}
    $('confirmMaterials').disabled=true;$('status').textContent='Сохраняем…';
    try{
      const project=await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);
      const visual={...(project.scene?.visual_settings||{}),materials_confirmation_status:'PILOT_CONFIRMED_DEFAULTS'};
      await request(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',body:JSON.stringify({path:'scene.visual_settings',value:visual,reason:'Pilot materials and hardware confirmation'})});
      $('status').textContent='Подтверждено. Детальный выбор материалов и фурнитуры будет следующим слоем.';
      $('confirmMaterials').textContent='Подтверждено ✓';
    }catch(error){$('status').textContent=error.message;$('confirmMaterials').disabled=false}
  });
})();
