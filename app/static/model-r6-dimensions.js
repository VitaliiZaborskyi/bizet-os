(() => {
  if(!window.BizetPilot3D)return;
  const original=window.BizetPilot3D.drawKitchenScene;
  const num=(key,fallback)=>{const value=Number(localStorage.getItem(`bizet_r6_${key}`));return Number.isFinite(value)&&value>0?value:fallback};
  const baseTotal=()=>Math.max(850,num('base_total_height_mm',900));
  const baseDepth=()=>Math.max(580,num('base_depth_mm',580));
  const gap=()=>Math.max(550,num('upper_gap_mm',600));
  const upperTotal=()=>Math.max(550,num('upper_total_height_mm',900));
  const upperDepth=()=>Math.max(320,Math.min(450,num('upper_depth_mm',320)));

  function fittedHeights(room){
    const roomH=Math.max(300,Number(room.heightMm)||2800),requestedBase=baseTotal(),requestedGap=gap(),requestedUpper=upperTotal();
    const bt=Math.min(requestedBase,Math.max(250,roomH-30));
    const availableAfterBase=Math.max(0,roomH-bt-30);
    const g=Math.min(requestedGap,Math.max(300,availableAfterBase-220));
    const ut=Math.max(0,Math.min(requestedUpper,roomH-bt-g-30));
    return{bt,g,ut,roomH,adapted:bt<requestedBase||g<requestedGap||ut<requestedUpper};
  }
  function resize(module,room){
    const {bt,g,ut,roomH,adapted}=fittedHeights(room);
    const roomL=Math.max(100,Number(room.lengthMm)||6000),roomD=Math.max(100,Number(room.depthMm)||4200);
    const bd=Math.min(baseDepth(),module.wall==='A'?roomD:roomL),ud=Math.min(upperDepth(),module.wall==='A'?roomD:roomL);
    if(module.level==='lower'&&!module.tall){
      module.z=Math.min(100,Math.max(0,roomH-100));
      module.h=Math.max(1,Math.min(roomH-module.z,Math.max(100,bt-100-38)));
      if(module.wall==='A'){module.d=bd;module.y=roomD-bd;}
      else{module.w=bd;module.x=module.wall==='B'?0:roomL-bd;}
    }
    if(module.level==='upper'){
      module.z=bt+g;
      module.h=Math.max(0,Math.min(900,ut));
      module.room_height_adapted=adapted;
      if(module.wall==='A'){module.d=ud;module.y=roomD-ud;}
      else{module.w=ud;module.x=module.wall==='B'?0:roomL-ud;}
    }
    if(module.tall&&module.level!=='upper'){
      module.z=Math.min(100,Math.max(0,roomH-100));
      module.h=Math.max(1,Math.min(roomH-module.z,bt+g+ut-module.z));
      module.room_height_adapted=adapted;
      if(module.wall==='A'){module.d=bd;module.y=roomD-bd;}
      else{module.w=bd;module.x=module.wall==='B'?0:roomL-bd;}
    }
  }
  function mezzanines(modules,room){
    const {bt,g,ut}=fittedHeights(room),extra=Math.max(0,ut-900);if(extra<=0)return[];
    return modules.filter(m=>m.level==='upper').map(m=>{
      const clone={...m,id:`${m.id}-r6-mezz`,number:null,label:'Антресоль',kind:'UPPER',system:true,pending:false,z:bt+g+900,h:extra};
      resize(clone,room);clone.z=bt+g+900;clone.h=extra;return clone;
    });
  }
  window.BizetPilot3D.drawKitchenScene=function(canvas,options={}){
    if(options.focusMode)return original(canvas,options);
    const room=options.room||{},modules=(options.modules||[]).map(m=>({...m}));
    modules.forEach(m=>resize(m,room));
    const extra=mezzanines(modules,room);
    return original(canvas,{...options,modules:[...modules,...extra]});
  };
})();