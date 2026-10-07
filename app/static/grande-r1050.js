(() => {
'use strict';
const $=id=>document.getElementById(id);
let motion=false,deep=localStorage.getItem('bizet_deep_shadow')==='1',lastTap={t:0,id:''},animations=[],composer=null,saoPass=null;
function bridge(){return window.BizetGrandeR1050Bridge}
function ensureComposer(){
 const b=bridge();if(composer||!b||!THREE.EffectComposer||!THREE.RenderPass||!THREE.SAOPass)return;
 composer=new THREE.EffectComposer(b.renderer);composer.addPass(new THREE.RenderPass(b.scene,b.camera));
 saoPass=new THREE.SAOPass(b.scene,b.camera,false,true);saoPass.params.saoBias=.35;saoPass.params.saoIntensity=.032;saoPass.params.saoScale=85;saoPass.params.saoKernelRadius=34;saoPass.params.saoBlur=true;saoPass.params.saoBlurRadius=12;saoPass.params.saoBlurStdDev=5;saoPass.enabled=deep;composer.addPass(saoPass);
 window.BizetGrandeR1050Post={render(){if(!(deep&&composer))return false;const r=b.renderer.domElement.getBoundingClientRect();composer.setSize(r.width||1,r.height||1);composer.render();return true}};
}
function setDeep(on){
 const b=bridge();deep=!!on;localStorage.setItem('bizet_deep_shadow',deep?'1':'0');ensureComposer();
 if(b){b.hemi.intensity=deep?.92:1;b.key.intensity=deep?.62:.52;b.fill.intensity=deep?.18:.2;b.renderer.toneMappingExposure=deep?1.0:1.02}
 if(saoPass)saoPass.enabled=deep;
 $('deepShadowGrande')?.classList.toggle('active',deep);
}
function ensureButtons(){
 const hud=document.querySelector('.hud.top');if(!hud)return;
 if(!$('deepShadowGrande')){const b=document.createElement('button');b.id='deepShadowGrande';b.type='button';b.textContent='DS';b.title='Deep Shadow';hud.appendChild(b);b.onclick=()=>setDeep(!deep)}
 if(!$('motionGrande')){const b=document.createElement('button');b.id='motionGrande';b.type='button';b.textContent='↔';b.title='Анімація фасадів і шухляд';hud.appendChild(b);b.onclick=()=>{motion=!motion;b.classList.toggle('active',motion)}}
 setDeep(deep);
}
function syncMode(){document.body.classList.toggle('grande-view-full',document.body.classList.contains('view-mode'))}
function bindProduction(){
 const body=$('panelBody');if(!body||!$('downloadExport')||body.querySelector('.r1050-grande-production'))return;
 const block=document.createElement('div');block.className='r1050-grande-production';
 block.innerHTML='<span class="r1050-grande-source">IMPORT · CAD adapter pending</span><label>Виробничий підрядник<select id="grandeProductionProfile"><option value="QUADRO">Quadro · active</option><option disabled>Viyar · soon</option><option disabled>Kronas · soon</option></select></label><small>Grande поки є параметричною реконструкцією, а не розібраним DWG. Строгий preflight не дозволить видати непідтверджений production XML.</small><button type="button" id="grandeQuadroReproR1051">Quadro · мінімальний тест</button><div id="grandePreflightR1051" aria-live="polite"></div>';
 body.insertBefore(block,body.firstChild);
 const sel=$('grandeProductionProfile');if(sel){sel.value=window.BizetProductionR1050?.profile?.().id||'QUADRO';sel.onchange=()=>window.BizetProductionR1050?.setProfile?.(sel.value)}
 $('grandeQuadroReproR1051')?.addEventListener('click',()=>window.BizetProductionR1050?.downloadQuadroRepro?.());
}
function buildDoorPivot(mesh){
 const b=bridge(),part=mesh.userData?.partId;if(!b||!part)return null;
 const left=part==='DOOR_L',half=mesh.geometry?.parameters?.width/2||100,pivot=new THREE.Group();
 pivot.position.copy(mesh.position);pivot.position.x+=left?-half:half;
 b.modelGroup.add(pivot);b.modelGroup.remove(mesh);mesh.position.x=left?half:-half;mesh.position.y=0;mesh.position.z=0;pivot.add(mesh);
 const hardware=(b.getCategories?.().hardware||[]).filter(h=>h!==mesh&&h.position.distanceTo(pivot.position)<240&&/Handle|Hinge cup/i.test(h.name));
 hardware.forEach(h=>{b.modelGroup.remove(h);h.position.sub(pivot.position);pivot.add(h)});
 return{kind:'door',id:part,pivot,target:0,current:0,sign:left?-1:1};
}
function buildDrawerMove(mesh){
 const b=bridge(),m=String(mesh.userData?.partId||'').match(/^DR(\d+)_FACADE$/);if(!b||!m)return null;const no=m[1],members=b.getFurniture().filter(x=>String(x.userData?.partId||'').startsWith('DR'+no+'_')||String(x.name||'').startsWith('Drawer '+no+' '));
 const handle=(b.getCategories?.().hardware||[]).filter(h=>/Handle/.test(h.name)&&h.position.distanceTo(mesh.position)<180);members.push(...handle);
 const bases=members.map(x=>x.position.clone());return{kind:'drawer',id:'DR'+no,members,bases,target:0,current:0};
}
function hit(e){
 const b=bridge();if(!b)return null;const r=b.renderer.domElement.getBoundingClientRect(),p=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,b.camera);return ray.intersectObjects(b.getFurniture().filter(x=>x.visible),false)[0]?.object||null;
}
function setupMotion(){
 const b=bridge();if(!b)return;
 b.renderer.domElement.addEventListener('pointerup',e=>{if(!motion||!document.body.classList.contains('view-mode'))return;const m=hit(e);if(!m)return;const id=m.userData?.partId||'';const now=performance.now();if(lastTap.id===id&&now-lastTap.t<430){
   let a=animations.find(x=>x.id===id||x.id===String(id).replace('_FACADE',''));
   if(!a){if(/^DOOR_[LR]$/.test(id))a=buildDoorPivot(m);else if(/^DR\d+_FACADE$/.test(id))a=buildDrawerMove(m);if(a)animations.push(a)}
   if(a)a.target=a.target>.5?0:1;lastTap={t:0,id:''};
 }else lastTap={t:now,id};
 });
 function tick(){requestAnimationFrame(tick);animations.forEach(a=>{a.current+=(a.target-a.current)*.11;if(a.kind==='door')a.pivot.rotation.y=a.sign*a.current*Math.PI*.58;else a.members.forEach((m,i)=>m.position.copy(a.bases[i]).add(new THREE.Vector3(0,0,300*a.current)))})}tick();
}
function boot(){ensureComposer();ensureButtons();syncMode();setupMotion();
 window.addEventListener('bizet:export-preflight',e=>{const el=$('grandePreflightR1051');if(!el)return;const r=e.detail?.report;if(!r)return;el.className=r.ok?'r1051-export-ok':'r1051-export-error';el.textContent=r.ok?'Preflight OK':('Export blocked: '+(r.errors||[]).slice(0,5).join(' · '))});
const panel=$('panelBody');if(panel)new MutationObserver(()=>setTimeout(bindProduction,0)).observe(panel,{childList:true,subtree:true});new MutationObserver(syncMode).observe(document.body,{attributes:true,attributeFilter:['class']});document.addEventListener('dblclick',e=>{if(e.target.closest('.stage'))e.preventDefault()},{capture:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();