(() => {
  const PROJECT_KEY='bizet_os_project_id';
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  const canvas=document.getElementById('modelCanvas');
  const oldNext=document.getElementById('materialsButton');

  if(oldNext){
    const next=oldNext.cloneNode(true);
    next.textContent='Проверить коммуникации →';
    next.setAttribute('aria-label','Проверить автоматически расставленные коммуникации');
    oldNext.replaceWith(next);
    next.addEventListener('click',()=>location.assign(`/communications?project=${encodeURIComponent(projectId)}`));
  }

  const head=document.querySelector('.model-head p');
  if(head)head.textContent='3D можно вращать одним пальцем и масштабировать щипком. Сцена автоматически вписывается в экран при открытии.';

  if(canvas){
    const touches=new Map();
    let lastDistance=0;
    const distance=()=>{const p=[...touches.values()];return p.length>=2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;};
    document.addEventListener('pointerdown',event=>{
      if(event.target!==canvas||event.pointerType!=='touch')return;
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(touches.size>=2){lastDistance=distance();event.preventDefault();event.stopPropagation();}
    },true);
    document.addEventListener('pointermove',event=>{
      if(!touches.has(event.pointerId))return;
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(touches.size<2)return;
      event.preventDefault();event.stopPropagation();
      const current=distance();
      if(lastDistance>0&&current>0){
        const delta=current-lastDistance;
        if(Math.abs(delta)>1.4){
          canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:delta>0?-90:90,bubbles:false,cancelable:true}));
          lastDistance=current;
        }
      }else lastDistance=current;
    },true);
    const end=event=>{if(!touches.has(event.pointerId))return;touches.delete(event.pointerId);lastDistance=touches.size>=2?distance():0;};
    document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);

    const hint=document.createElement('div');
    hint.className='r5-camera-hint';
    hint.textContent='↻ вращение · ⇆ щипок — масштаб';
    canvas.parentElement?.appendChild(hint);
  }

  async function syncRules(){
    if(!projectId)return;
    try{
      const response=await fetch(`/api/v1.1/projects/${encodeURIComponent(projectId)}`);
      if(!response.ok)return;
      const project=await response.json();
      const visual={...(project.scene?.visual_settings||{})};
      const inputs={...(visual.guided_inputs||{})};
      if(inputs.ceiling)localStorage.setItem('bizet_r5_ceiling',inputs.ceiling);
      const nextRules={
        ...(visual.r5_rules||{}),
        refrigerator_edge_default:true,
        fridge_oven_adjacent_same_wall:true,
        dishwasher_near_sink_priority:true,
        oven_vertical_mode:inputs.oven_vertical_mode||null,
        top_filler_min_mm:(inputs.ceiling==='STRETCH_B'||inputs.ceiling==='GYPSUM')?18:null,
        stretch_profile_filler_height_mm:inputs.ceiling==='STRETCH_A'?120:null,
        wall_l_filler_required:true,
        corner_front_l_filler_required:['L_LEFT','L_RIGHT','U_SHAPE'].includes(sessionStorage.getItem('bizet_pilot_configuration')||localStorage.getItem('bizet_pilot_configuration')||'')
      };
      const changed=JSON.stringify(nextRules)!==JSON.stringify(visual.r5_rules||{});
      if(changed){
        visual.r5_rules=nextRules;
        await fetch(`/api/v1.1/projects/${encodeURIComponent(projectId)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:'scene.visual_settings',value:visual,reason:'BIZET OS 1.1 r5 placement and filler rules'})});
      }
      window.dispatchEvent(new CustomEvent('bizet:themechange',{detail:{theme:document.documentElement.dataset.theme||'light'}}));
    }catch(_){}
  }
  setTimeout(syncRules,120);
})();
