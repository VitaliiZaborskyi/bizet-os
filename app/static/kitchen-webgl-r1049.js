(() => {
  'use strict';
  if (!window.THREE || !window.THREE.OrbitControls || !window.BizetPilot3D) return;

  const THREE = window.THREE;
  const legacyDraw = window.BizetPilot3D.drawKitchenScene;
  const stage = document.getElementById('modelStage');
  const normalCanvas = document.getElementById('modelCanvas');
  const focusCanvas = document.getElementById('focusCanvas');
  if (!stage || !normalCanvas || !focusCanvas || typeof legacyDraw !== 'function') return;

  const style = document.createElement('style');
  style.id = 'r1049KitchenWebGLStyle';
  style.textContent = `
    #r1049KitchenWebGL{position:absolute;inset:0;z-index:1;overflow:hidden;border-radius:inherit;background:#24262a}
    #r1049KitchenWebGL canvas{width:100%!important;height:100%!important;display:block;touch-action:none}
    #modelCanvas,#focusCanvas{position:absolute!important;inset:0!important;opacity:0!important;pointer-events:none!important}
    .r8-stage-top,.r10-constraint-banner,.r104-focus-module-nav,.r8-variant-controls{z-index:12!important}
  `;
  document.head.appendChild(style);

  const host = document.createElement('div');
  host.id = 'r1049KitchenWebGL';
  stage.insertBefore(host, stage.firstChild);

  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x24262a);
  scene.fog = new THREE.Fog(0x24262a, 4800, 11000);

  const camera = new THREE.PerspectiveCamera(39, 1, 1, 18000);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.rotateSpeed = .62;
  controls.zoomSpeed = .82;
  controls.panSpeed = .68;
  controls.screenSpacePanning = true;
  controls.minDistance = 800;
  controls.maxDistance = 12000;
  controls.minPolarAngle = .12;
  controls.maxPolarAngle = 1.53;
  controls.enableKeys = false;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x34363a, .66);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, .72);
  key.position.set(-2600, 4200, -2800);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5200;
  key.shadow.camera.right = 5200;
  key.shadow.camera.top = 5200;
  key.shadow.camera.bottom = -1500;
  key.shadow.camera.near = 100;
  key.shadow.camera.far = 14000;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd2ff, .16);
  fill.position.set(3800, 2300, 2600);
  scene.add(fill);

  const roomGroup = new THREE.Group();
  const furnitureGroup = new THREE.Group();
  const annotationGroup = new THREE.Group();
  scene.add(roomGroup, furnitureGroup, annotationGroup);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selectable = [];
  let lastOptions = null;
  let lastMode = '';
  let lastRoomKey = '';
  let down = null;

  function ownMat(params){
    const m = new THREE.MeshStandardMaterial(params);
    m.userData.owned = true;
    return m;
  }
  function clearGroup(group){
    while(group.children.length){
      const child = group.children.pop();
      child.traverse?.(node => {
        if(node.geometry) node.geometry.dispose();
        if(node.material){
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach(m => { if(m?.userData?.owned){m.map?.dispose?.();m.dispose?.();} });
        }
      });
    }
  }
  function roomToWorld(room,x,y,z){
    return new THREE.Vector3(
      Number(x) - Number(room.lengthMm || 6000) / 2,
      Number(z),
      Number(y) - Number(room.depthMm || 4200) / 2
    );
  }
  function moduleCenter(room,m){
    return roomToWorld(room,
      Number(m.x||0) + Number(m.w||0)/2,
      Number(m.y||0) + Number(m.d||0)/2,
      Number(m.z||0) + Number(m.h||0)/2
    );
  }
  function boxMesh(room,m,mat,cat='body'){
    const w=Math.max(1,Number(m.w)||1),h=Math.max(1,Number(m.h)||1),d=Math.max(1,Number(m.d)||1);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.copy(moduleCenter(room,m));
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={moduleId:m.id||'',cat};
    furnitureGroup.add(mesh);
    return mesh;
  }
  function shade(hex,delta){
    const c=new THREE.Color(hex);
    c.offsetHSL(0,0,delta);
    return '#'+c.getHexString();
  }
  function materialColors(){
    const dark=document.documentElement.dataset.furniturePalette==='dark';
    const facadePreset=document.documentElement.dataset.facadePreset||'';
    const carcassPreset=document.documentElement.dataset.carcassPreset||'';
    const worktopPreset=document.documentElement.dataset.worktopPreset||'';
    const facades={IVORY:'#eee8dc',OAK:'#c7a77e',GRAPHITE:'#45484c',SAGE:'#aab49f',WHITE:'#f3f2ed'};
    const carcass={WHITE:'#e9e8e3',GREY:'#a9abad',OAK:'#bd9b73',GRAPHITE:'#505256'};
    const worktops={BLACK:'#242424',STONE:'#77746e',OAK:'#9d7851',LIGHT_STONE:'#c9c3b7'};
    return{
      body:carcass[carcassPreset]||(dark?'#404246':'#d7cfc1'),
      front:facades[facadePreset]||(dark?'#505359':'#f0ece4'),
      worktop:worktops[worktopPreset]||'#282828',
      metal:'#43484d'
    };
  }
  function addFront(room,m,color){
    if(m.kind==='FILLER') return;
    const gap=4,wall=String(m.wall||'A');
    const count=Math.max(1,Math.min(5,Number(m.kind==='DRAWERS'?m.drawer_count:m.facade_count)||1));
    const mat=ownMat({color,roughness:.5,metalness:0});
    if(wall==='A'){
      const fw=Math.max(20,(Number(m.w)-gap*(count-1))/count);
      for(let i=0;i<count;i++){
        const front={...m,w:fw-2,d:8,x:Number(m.x)+i*(fw+gap)+1,y:Number(m.y)-10};
        const mesh=boxMesh(room,front,mat.clone(),'front');mesh.material.userData.owned=true;mesh.userData.moduleId=m.id;
      }
    }else{
      const fd=Math.max(20,(Number(m.d)-gap*(count-1))/count);
      for(let i=0;i<count;i++){
        const front={...m,d:fd-2,w:8,y:Number(m.y)+i*(fd+gap)+1,x:wall==='B'?Number(m.x)+Number(m.w)+2:Number(m.x)-10};
        const mesh=boxMesh(room,front,mat.clone(),'front');mesh.material.userData.owned=true;mesh.userData.moduleId=m.id;
      }
    }
    mat.dispose();
  }
  function addHandle(room,m,index,count,color){
    const wall=String(m.wall||'A'),metal=ownMat({color,roughness:.28,metalness:.7});
    const vertical=m.kind!=='DRAWERS';
    if(wall==='A'){
      const fw=Number(m.w)/count,cx=Number(m.x)+fw*(index+.5),cy=Number(m.y)-18,cz=Number(m.z)+Number(m.h)*(vertical?.57:.78);
      const handle={x:cx-(vertical?5:55),y:cy,z:cz-(vertical?65:5),w:vertical?10:110,d:9,h:vertical?130:10};
      boxMesh(room,handle,metal,'hardware').userData.moduleId=m.id;
    }else{
      const fd=Number(m.d)/count,cy=Number(m.y)+fd*(index+.5),cz=Number(m.z)+Number(m.h)*(vertical?.57:.78);
      const x=wall==='B'?Number(m.x)+Number(m.w)+9:Number(m.x)-18;
      const handle={x,y:cy-(vertical?5:55),z:cz-(vertical?65:5),w:9,d:vertical?10:110,h:vertical?130:10};
      boxMesh(room,handle,metal,'hardware').userData.moduleId=m.id;
    }
  }
  function addWorktop(room,modules,color){
    const mat=ownMat({color,roughness:.46,metalness:0});
    modules.filter(m=>m.level!=='upper'&&!m.tall&&!m.freestanding&&m.kind!=='FILLER').forEach(m=>{
      const slab={...m,z:Number(m.z)+Number(m.h),h:28};
      const mesh=boxMesh(room,slab,mat.clone(),'worktop');mesh.material.userData.owned=true;mesh.userData.moduleId=m.id;
    });
    mat.dispose();
  }
  function addApplianceHints(room,m){
    const wall=String(m.wall||'A');
    if(m.kind==='COOKTOP'){
      const mat=ownMat({color:'#151617',roughness:.28,metalness:.1});
      const top={...m,z:Number(m.z)+Number(m.h)+29,h:7,x:Number(m.x)+Number(m.w)*.1,w:Number(m.w)*.8,y:Number(m.y)+Number(m.d)*.16,d:Number(m.d)*.68};
      boxMesh(room,top,mat,'appliance').userData.moduleId=m.id;
    }
    if(m.kind==='SINK'){
      const mat=ownMat({color:'#aeb4b7',roughness:.28,metalness:.72});
      const top={...m,z:Number(m.z)+Number(m.h)+30,h:12,x:Number(m.x)+Number(m.w)*.18,w:Number(m.w)*.64,y:Number(m.y)+Number(m.d)*.22,d:Number(m.d)*.52};
      boxMesh(room,top,mat,'appliance').userData.moduleId=m.id;
    }
    if(m.kind==='FRIDGE'&&m.freestanding){
      const list=furnitureGroup.children.filter(x=>x.userData?.moduleId===m.id);
      list.forEach(mesh=>mesh.material.color.set('#666c72'));
    }
  }
  function textSprite(text,scale=.78){
    const c=document.createElement('canvas');c.width=320;c.height=88;
    const ctx=c.getContext('2d');
    ctx.fillStyle='rgba(248,248,245,.94)';ctx.beginPath();ctx.roundRect?.(4,10,312,68,18);ctx.fill();
    ctx.fillStyle='#171717';ctx.font='700 30px -apple-system,BlinkMacSystemFont,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(text),160,44);
    const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
    const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});mat.userData.owned=true;
    const s=new THREE.Sprite(mat);s.scale.set(320*scale,88*scale,1);return s;
  }
  function addNumber(room,m){
    const s=textSprite(m.number,.42);
    const p=moduleCenter(room,m);
    p.y+=Number(m.h)*.12;
    if(m.wall==='A')p.z-=Number(m.d)/2+70;
    else if(m.wall==='B')p.x+=Number(m.w)/2+70;
    else p.x-=Number(m.w)/2+70;
    s.position.copy(p);annotationGroup.add(s);
  }
  function addDimension(room,a,b,label,labelPos){
    const geo=new THREE.BufferGeometry().setFromPoints([roomToWorld(room,...a),roomToWorld(room,...b)]);
    const mat=new THREE.LineBasicMaterial({color:0xe7e5df,transparent:true,opacity:.82});mat.userData.owned=true;
    annotationGroup.add(new THREE.Line(geo,mat));
    const sp=textSprite(label,.46);sp.position.copy(roomToWorld(room,...labelPos));annotationGroup.add(sp);
  }
  function buildRoom(options){
    clearGroup(roomGroup);
    const room=options.room||{},L=Number(room.lengthMm)||6000,D=Number(room.depthMm)||4200,H=Number(room.heightMm)||2800;
    if(options.focusMode) return;
    const floorMat=ownMat({color:0x383b40,roughness:.96,metalness:0});
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(L,D),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;roomGroup.add(floor);
    const grid=new THREE.GridHelper(Math.max(L,D),Math.max(8,Math.round(Math.max(L,D)/500)),0x6b6f76,0x4d5157);
    grid.position.y=.8;grid.material.opacity=.18;grid.material.transparent=true;roomGroup.add(grid);
    const wallMat=ownMat({color:0x51545a,roughness:.97,metalness:0,side:THREE.DoubleSide});
    const active=new Set(options.activeWalls||[]);
    if(active.has('A')){
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(L,H),wallMat.clone());wall.material.userData.owned=true;wall.position.set(0,H/2,D/2);roomGroup.add(wall);
    }
    if(active.has('B')){
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wallMat.clone());wall.material.userData.owned=true;wall.rotation.y=Math.PI/2;wall.position.set(-L/2,H/2,0);roomGroup.add(wall);
    }
    if(active.has('C')){
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wallMat.clone());wall.material.userData.owned=true;wall.rotation.y=-Math.PI/2;wall.position.set(L/2,H/2,0);roomGroup.add(wall);
    }
    wallMat.dispose();
  }
  function buildFurniture(options){
    clearGroup(furnitureGroup);clearGroup(annotationGroup);selectable=[];
    const room=options.room||{},mods=Array.isArray(options.modules)?options.modules:[],colors=materialColors();
    const body=ownMat({color:colors.body,roughness:.6,metalness:0});
    mods.forEach(m=>{
      const mesh=boxMesh(room,m,body.clone(),'module');mesh.material.userData.owned=true;mesh.userData.moduleId=m.id;selectable.push(mesh);
      if(!options.focusMode) addFront(room,m,colors.front);
      else{
        const ghost=mesh.material;ghost.transparent=true;ghost.opacity=.42;ghost.depthWrite=false;
      }
      const handleCount=Math.max(1,Math.min(5,Number(m.kind==='DRAWERS'?m.drawer_count:m.facade_count)||1));
      if(!options.focusMode) for(let i=0;i<handleCount;i++)addHandle(room,m,i,handleCount,colors.metal);
      addApplianceHints(room,m);
      if(options.showNumbers!==false&&!options.focusMode)addNumber(room,m);
    });
    body.dispose();
    if(!options.focusMode)addWorktop(room,mods,colors.worktop);
    if(options.showDimensions!==false){
      if(options.focusMode&&mods[0]){
        const m=mods[0];
        addDimension(room,[m.x,m.y,m.z+m.h+80],[m.x+m.w,m.y,m.z+m.h+80],Math.round(m.w)+' mm',[m.x+m.w/2,m.y,m.z+m.h+130]);
        addDimension(room,[m.x+m.w+80,m.y,m.z],[m.x+m.w+80,m.y,m.z+m.h],Math.round(m.h)+' mm',[m.x+m.w+145,m.y,m.z+m.h/2]);
      }else{
        const L=Number(room.lengthMm)||6000,D=Number(room.depthMm)||4200,H=Number(room.heightMm)||2800;
        addDimension(room,[0,D,40],[L,D,40],Math.round(L)+' mm',[L/2,D,105]);
        addDimension(room,[L,D,0],[L,D,H],Math.round(H)+' mm',[L,D,H/2]);
      }
    }
  }
  function frame(options,force=false){
    const room=options.room||{},mods=Array.isArray(options.modules)?options.modules:[],mode=options.focusMode?'focus':'normal';
    const roomKey=[room.lengthMm,room.depthMm,room.heightMm,mode].join(':');
    if(!force&&lastMode===mode&&lastRoomKey===roomKey)return;
    lastMode=mode;lastRoomKey=roomKey;
    if(!mods.length)return;
    const minX=Math.min(...mods.map(m=>Number(m.x)||0)),maxX=Math.max(...mods.map(m=>(Number(m.x)||0)+(Number(m.w)||0)));
    const minY=Math.min(...mods.map(m=>Number(m.y)||0)),maxY=Math.max(...mods.map(m=>(Number(m.y)||0)+(Number(m.d)||0)));
    const minZ=Math.min(...mods.map(m=>Number(m.z)||0)),maxZ=Math.max(...mods.map(m=>(Number(m.z)||0)+(Number(m.h)||0)));
    const center=roomToWorld(room,(minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2);
    controls.target.copy(center);
    const span=Math.max(maxX-minX,maxY-minY,maxZ-minZ,1200);
    const dist=options.focusMode?Math.max(1300,span*1.5):Math.max(2400,span*1.22);
    camera.position.set(center.x+dist*.78,center.y+dist*.38,center.z-dist*.96);
    camera.near=1;camera.far=18000;camera.updateProjectionMatrix();controls.update();
  }
  function resize(){
    const r=host.getBoundingClientRect();if(!r.width||!r.height)return;
    renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  window.addEventListener('resize',resize);

  function draw(options){
    lastOptions=options;
    buildRoom(options);buildFurniture(options);frame(options,false);resize();
    host.style.display='';
    normalCanvas.style.opacity='0';focusCanvas.style.opacity='0';
  }

  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId};});
  renderer.domElement.addEventListener('pointercancel',()=>{down=null});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||down.id!==e.pointerId){down=null;return}
    const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;
    if(moved>8||lastOptions?.focusMode||window.BIZET_KITCHEN_UI_MODE==='VIEW')return;
    const r=renderer.domElement.getBoundingClientRect();
    pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(selectable.filter(m=>m.visible),false)[0];
    const id=hit?.object?.userData?.moduleId;
    if(id){
      const btn=document.querySelector('#moduleStrip [data-module="'+CSS.escape(String(id))+'"]');
      btn?.click();
    }
  });

  function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}
  animate();

  window.BizetPilot3D.drawKitchenScene = function(canvas,options={}){
    const legacyScene=legacyDraw(canvas,options);
    try{draw(options)}catch(error){console.error('R10.4.9 WebGL kitchen fallback',error);host.style.display='none';canvas.style.opacity='1';}
    return legacyScene;
  };
  window.BizetKitchenWebGL={renderer,scene,camera,controls,host,redraw:()=>lastOptions&&draw(lastOptions),frame:()=>lastOptions&&frame(lastOptions,true)};
})();