/* BIZET OS 10.6.4 #41: suppress non-interactive floating sprite markers
   with number overlay switched off, and tiny unreadable labels above upper cabinets.
   Never remove actual cabinet hardware, scan geometry, or 3D renderer assets. */
(()=>{'use strict';
 let scheduled=false;
 function clean(){
  scheduled=false;
  const scene=window.BizetKitchenWebGL?.scene;
  if(!scene)return;
  const toggle=document.getElementById('moduleNumbersToggle');
  const showNumbers=toggle?.getAttribute('aria-pressed')==='true';
  const camera=window.BizetKitchenWebGL?.camera;
  let hidden=0;
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{
   if(!o.isSprite)return;
   const sprite=o,belongsToNumber=!sprite.userData?.cat;
   if(!belongsToNumber)return;
   // Original number sprites are optional annotations, never furniture.
   // Turning numbers OFF must hide them in VIEW, EDIT and ISOLATION.
   if(!showNumbers){if(sprite.visible){sprite.visible=false;hidden++}return}
   // An accidentally tiny sprite is an artifact rather than a legible label.
   const p=sprite.getWorldPosition(new window.THREE.Vector3());
   const range=camera?.position.distanceTo(p)||3000;
   const fov=(camera?.fov||39)*Math.PI/180;
   const canvas=window.BizetKitchenWebGL?.renderer?.domElement;
   const canvasHeight=canvas?.getBoundingClientRect().height||600;
   const apparent=Math.abs(sprite.scale.y)*canvasHeight/(Math.max(1,range)*2*Math.tan(fov/2));
   sprite.visible=apparent>=9;
   if(!sprite.visible)hidden++;
  });
  window.BizetR1064SceneClean={markersHidden:hidden,numberLabels:showNumbers};
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>requestAnimationFrame(clean))}
 function install(){
  schedule();
  document.getElementById('moduleNumbersToggle')?.addEventListener('click',()=>requestAnimationFrame(schedule));
  window.addEventListener('resize',schedule,{passive:true});
  const v=window.BizetVisualR1063;
  if(v&&typeof v.refresh==='function'&&!v.refresh.r1064Wrapped){
   const orig=v.refresh;
   const fn=(...args)=>{const result=orig.apply(v,args);schedule();return result};
   fn.r1064Wrapped=true;v.refresh=fn;
  }
  document.addEventListener('click',e=>{
   if(e.target.closest('#workspaceTools,#moduleStrip,#focusPrevModule,#focusNextModule,#moduleClose'))schedule()
  });
 }
 window.addEventListener('bizet:modelready',install,{once:true});
 window.BizetSceneCleanR1064={clean,schedule};
})();