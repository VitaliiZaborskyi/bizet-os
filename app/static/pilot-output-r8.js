(() => {
  const $=id=>document.getElementById(id);
  const PROJECT_KEY='bizet_os_project_id';
  const projectId=new URLSearchParams(location.search).get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'pilot';
  const FX_KEY='bizet_r8_fx_usd_uah';
  const round=(v,p=2)=>{const m=10**p;return Math.round((Number(v)||0)*m)/m};
  const mm2m2=(a,b,q=1)=>((Number(a)||0)*(Number(b)||0)*(Number(q)||1))/1e6;
  const mm2m=v=>(Number(v)||0)/1000;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const lang=()=>localStorage.getItem('bizet_os_language')==='en'?'en':'ru';
  const T={
    ru:{result:'ИТОГ',title:'Стоимость и документы',cost:'Предварительная себестоимость',price:'Стоимость BIZET Furniture',open:'Позиции с ценой OPEN',details:'Деталировка CSV',bom:'BOM CSV',kitchen:'Схема кухни SVG',comms:'Коммуникации SVG',print:'Печатный комплект',refresh:'Пересчитать',fx:'USD / UAH для сервисных операций',pilot:'Категория I · пилотный расчёт',note:'Предварительный расчёт. Позиции со статусом OPEN не входят в стоимость до фиксации цены.'},
    en:{result:'RESULT',title:'Price and documents',cost:'Preliminary cost',price:'BIZET Furniture price',open:'OPEN price items',details:'Cut list CSV',bom:'BOM CSV',kitchen:'Kitchen elevation SVG',comms:'Services drawing SVG',print:'Printable package',refresh:'Recalculate',fx:'USD / UAH for service operations',pilot:'Category I · pilot estimate',note:'Preliminary calculation. OPEN-price items are excluded until a price is fixed.'}
  };
  const t=k=>T[lang()][k]||T.ru[k]||k;

  const PRICE={
    carcass_m2:776,
    facade_m2:1200,
    hdf_m2:120,
    cut_lm:20,
    edge_labor_lm:30,
    edge_material_lm:30,
    hole_regular:7,
    hole_hinge:40,
    groove_lm:40,
    hinge_set:200,
    leg:25,
    clip:12,
    confirmat:1,
    minifix:5,
    dowel:0.8,
    rafix:10,
    euro_screw:1.5,
    screw_selftap:0.30,
    handle:200,
    shelf_support:12,
    m4x25:0.50,
    runner_hidden_set:1200,
    drawer_metal_set:2200,
    countertop_slab:8000,
    countertop_length_mm:4100,
    assembly_usd_m2:4,
    packaging_usd_m2:1,
    installation_usd_m2:6,
    delivery_usd_hour:20,
    delivery_min_hours:2,
    loader_uah_hour:350,
    loader_count:2,
    loader_min_hours:2
  };

  const EDGE='PVC 22×0.8';
  const CARCASS='LDSP 18 Carcas';
  const FACADE='LDSP 18 Facade';
  const DRAWER='LDSP 18 Drawer';
  const HDF='HDF 3 mm';

  function rt(){return window.BizetModelRuntime}
  function run(m){return m.wall==='A'?Number(m.w)||0:Number(m.d)||0}
  function depth(m){return m.wall==='A'?Number(m.d)||0:Number(m.w)||0}
  function dims(a,b){const x=Math.round(Number(a)||0),y=Math.round(Number(b)||0);return{x:Math.max(x,y),y:Math.min(x,y)}}
  function detailCode(modNo,idx,drawerNo=null){
    return drawerNo==null?`${modNo}.${String(idx).padStart(3,'0')}`:`${modNo}.${drawerNo}.${String(idx).padStart(3,'0')}`;
  }
  function makePart(modNo,idx,material,name,a,b,qty=1,edge=EDGE,longEdge=2,shortEdge=2,processing='',note='',drawerNo=null){
    const d=dims(a,b);
    return{no:0,material,code:detailCode(modNo,idx,drawerNo),name,length_mm:d.x,width_mm:d.y,qty,unit:'pcs',edge_name:edge,long_edge:edge?longEdge:'',short_edge:edge?shortEdge:'',processing,note,module_no:modNo,area_m2:mm2m2(d.x,d.y,qty)};
  }
  function facadeParts(parts,m,indexRef,heightOverride=null,countOverride=null){
    const W=run(m),H=Math.max(100,Math.round(heightOverride??m.h)-5),gap=3;
    const count=countOverride??(W<=597?1:2);
    const fw=count===1?Math.max(100,W-3):Math.max(100,Math.floor((W-gap)/2));
    for(let i=0;i<count;i++)parts.push(makePart(m.number,indexRef.value++,FACADE,'Facade',H,fw,1,EDGE,2,2,'',count>1?'BFG_V 3 mm':''));
    return{count,width:fw,height:H};
  }
  function hingeCountForHeight(h){return h<=900?2:(h<=1500?3:4)}
  function legsForWidth(w){return w<=600?4:6}
  function structuralConnectorCount(depthMm,joints=6){
    const fastenersPerJoint=depthMm<=550?2:(depthMm<=600?3:(depthMm<=1000?4:Math.max(4,Math.ceil(depthMm/250))));
    return{joints,fastenersPerJoint,total:joints*fastenersPerJoint};
  }
  function grooveProcessing(){return'Groove HDF 10×4; offset 16 (Pаз 20)'}
  function shelfCountUpper(h){if(h<=750)return 1;return 1+Math.ceil((h-750)/350)}
  function pushBasicLower(parts,bom,m,opt={}){
    const W=run(m),D=Math.round(depth(m)||510),H=Math.round(m.h||762),inner=Math.max(100,W-36),ix={value:1};
    const groove=grooveProcessing();
    parts.push(makePart(m.number,ix.value++,CARCASS,'Left',H,D,1,EDGE,2,2,groove));
    parts.push(makePart(m.number,ix.value++,CARCASS,'Right',H,D,1,EDGE,2,2,groove));
    if(opt.dishwasherOnly)return{ix,W,D,H,inner};
    parts.push(makePart(m.number,ix.value++,CARCASS,'Bottom',inner,Math.max(100,D-1),1,EDGE,2,2,groove));
    if(opt.adjustableShelf!==false)parts.push(makePart(m.number,ix.value++,CARCASS,'Shelf',inner,Math.max(100,D-1),1,EDGE,2,2,'Adjustable shelf','4 shelf supports'));
    const rails=Number(opt.rails??2);
    if(rails>0)parts.push(makePart(m.number,ix.value++,CARCASS,'Rail',inner,100,rails,EDGE,2,2,'',`${rails} rails`));
    if(opt.back!==false)parts.push(makePart(m.number,ix.value++,HDF,'Back',Math.max(100,H-2),Math.max(100,W-2),1,'','','','Back in groove'));
    const c=structuralConnectorCount(D,opt.joints??6);
    addBom(bom,'FASTENER','Confirmat','pcs',c.total,PRICE.confirmat,'UAH',`${c.joints} joints × ${c.fastenersPerJoint}`);
    addBom(bom,'OPERATION','Regular drilling','hole',c.total*2,PRICE.hole_regular,'UAH','end + face');
    const legCount=legsForWidth(W),clipCount=Math.ceil(legCount/2);
    addBom(bom,'HARDWARE','Leg','pcs',legCount,PRICE.leg,'UAH','4 self-tapping screws / leg');
    addBom(bom,'HARDWARE','Plinth clip','pcs',clipCount,PRICE.clip,'UAH','front legs only; 2 screws / clip');
    addBom(bom,'FASTENER','Self-tapping screw','pcs',legCount*4+clipCount*2,PRICE.screw_selftap,'UAH','legs + clips');
    return{ix,W,D,H,inner};
  }
  function pushDrawers(parts,bom,m,count=2){
    const base=pushBasicLower(parts,bom,m,{adjustableShelf:false,rails:2,back:true,joints:6});
    const gap=3,facadeH=Math.max(100,Math.floor((base.H-5-gap*(count-1))/count));
    const facadeW=base.W<=597?base.W-3:Math.floor((base.W-3)/2);
    for(let d=1;d<=count;d++){
      const ix={value:1};
      const drawerH=Math.max(70,facadeH-50),sideH=Math.max(70,drawerH),frontBackH=Math.max(60,drawerH-32);
      const sideL=Math.max(200,base.D-20),frontBackW=Math.max(200,base.W-85);
      parts.push(makePart(m.number,ix.value++,DRAWER,'Drawer Left',sideL,sideH,1,EDGE,2,2,'','',d));
      parts.push(makePart(m.number,ix.value++,DRAWER,'Drawer Right',sideL,sideH,1,EDGE,2,2,'','',d));
      parts.push(makePart(m.number,ix.value++,DRAWER,'Drawer Front',frontBackW,frontBackH,1,EDGE,2,2,'','',d));
      parts.push(makePart(m.number,ix.value++,DRAWER,'Drawer Back',frontBackW,frontBackH,1,EDGE,2,2,'','',d));
      parts.push(makePart(m.number,ix.value++,DRAWER,'Drawer Bottom',frontBackW,sideL,1,EDGE,2,2,'','Internal between sides; overlaps front/back',d));

      const short=drawerH<150;
      const miniPerJoint=short?1:2,dowelPerJoint=1,joints=4;
      addBom(bom,'FASTENER','Minifix','pcs',miniPerJoint*joints,PRICE.minifix,'UAH',short?'drawer H <150':'drawer H 150–200');
      addBom(bom,'FASTENER','Dowel','pcs',dowelPerJoint*joints+4,PRICE.dowel,'UAH','drawer joints + bottom-to-sides');
      addBom(bom,'FASTENER','Confirmat','pcs',4,PRICE.confirmat,'UAH','bottom to front/back');
      addBom(bom,'HARDWARE','Blum concealed runner set','set',1,PRICE.runner_hidden_set,'UAH','2 runners');
      addBom(bom,'FASTENER','Euro screw 6.3×11','pcs',6,PRICE.euro_screw,'UAH','runner set');
      addBom(bom,'FASTENER','Self-tapping screw','pcs',4,PRICE.screw_selftap,'UAH','runner locks');
      addBom(bom,'OPERATION','Regular drilling','hole',12,PRICE.hole_regular,'UAH','runner: 6 euro + 4 locks + 2 rear fixing');
      addBom(bom,'OPERATION','Regular drilling','hole',(miniPerJoint*3+dowelPerJoint*2)*joints+8,PRICE.hole_regular,'UAH','drawer joinery pilot formula');
      parts.push(makePart(m.number,900+d,FACADE,'Facade',facadeH,Math.max(100,base.W-3),1,EDGE,2,2,'',`Drawer facade ${d}`));
      addBom(bom,'HARDWARE','Handle','pcs',1,PRICE.handle,'UAH','1 per drawer facade');
      addBom(bom,'FASTENER','M4×25','pcs',2,PRICE.m4x25,'UAH','handle');
    }
  }
  function pushUpper(parts,bom,m,opt={}){
    const W=run(m),D=Math.round(depth(m)||320),H=Math.round(m.h||750),inner=Math.max(100,W-36),ix={value:1};
    const groove=grooveProcessing();
    parts.push(makePart(m.number,ix.value++,CARCASS,'Left',H,D,1,EDGE,2,2,groove));
    parts.push(makePart(m.number,ix.value++,CARCASS,'Right',H,D,1,EDGE,2,2,groove));
    if(opt.noBottom!==true)parts.push(makePart(m.number,ix.value++,CARCASS,'Bottom',inner,Math.max(100,D-1),1,EDGE,2,2,groove));
    const sc=opt.shelfCount??shelfCountUpper(H);
    if(sc>0)parts.push(makePart(m.number,ix.value++,CARCASS,opt.fixedShelf?'Fixed Shelf':'Shelf',inner,Math.max(100,D-21),sc,EDGE,2,2,opt.fixedShelf?'Fixed':'Adjustable',opt.fixedShelf?'':'4 shelf supports / shelf'));
    parts.push(makePart(m.number,ix.value++,CARCASS,'Top',inner,Math.max(100,D-1),1,EDGE,2,2,'',''));
    parts.push(makePart(m.number,ix.value++,HDF,'Back',Math.max(100,H-2),Math.max(100,W-2),1,'','','','L-cutouts 44×30 for hangers; back enters grooves and overlaps top'));
    const f=facadeParts(parts,m,ix,H,undefined);
    const hinges=hingeCountForHeight(f.height)*f.count;
    addBom(bom,'HARDWARE','Blum hinge + plate','set',hinges,PRICE.hinge_set,'UAH','soft close');
    addBom(bom,'OPERATION','Hinge cup drilling','hole',hinges,PRICE.hole_hinge,'UAH','facades');
    addBom(bom,'FASTENER','Self-tapping screw','pcs',hinges*4+4,PRICE.screw_selftap,'UAH','hinges + hangers');
    addBom(bom,'HARDWARE','Cabinet hanger','pcs',2,null,'UAH','PRICE OPEN');
    addBom(bom,'HARDWARE','Hanger mounting plate','pcs',2,null,'UAH','PRICE OPEN');
    addBom(bom,'FASTENER','Concrete dowel 8×60','pcs',4,null,'UAH','PRICE OPEN');
    addBom(bom,'FASTENER','Wall screw 5/6×50','pcs',4,null,'UAH','PRICE OPEN');
    if(!opt.fixedShelf) addBom(bom,'HARDWARE','Shelf support','pcs',sc*4,PRICE.shelf_support,'UAH','4 per shelf up to D600');
    const c=structuralConnectorCount(D,6);
    addBom(bom,'FASTENER','Confirmat','pcs',c.total,PRICE.confirmat,'UAH','upper carcass pilot');
    addBom(bom,'OPERATION','Regular drilling','hole',c.total*2,PRICE.hole_regular,'UAH','end + face');
    return{ix,W,D,H,inner};
  }
  function pushHood(parts,bom,m){
    const b=pushUpper(parts,bom,m,{fixedShelf:true,shelfCount:1});
    parts.push(makePart(m.number,80,CARCASS,'Hood Front Wall',Math.max(100,b.W-70),100,1,EDGE,2,2,'','covers hood; side hinge clearance'));
    parts.push(makePart(m.number,81,CARCASS,'Vent Front Wall',Math.max(100,b.W-36),100,1,EDGE,2,2,'','between inner sides'));
    parts.push(makePart(m.number,82,CARCASS,'Vent Inner Side',Math.max(100,b.H-140),200,2,EDGE,2,2,'Duct cut 170×200','2 inner sides around duct'));
    addBom(bom,'OPERATION','Regular drilling','hole',12,PRICE.hole_regular,'UAH','3 new details × min 4 holes');
  }
  function pushSink(parts,bom,m){
    const b=pushBasicLower(parts,bom,m,{adjustableShelf:false,back:false,rails:3,joints:8});
    facadeParts(parts,m,b.ix,b.H,undefined);
    addFacadeHardware(bom,m,b.H);
  }
  function addFacadeHardware(bom,m,facadeH,facadeCount=null){
    const W=run(m),count=facadeCount??(W<=597?1:2),hinges=hingeCountForHeight(facadeH)*count;
    addBom(bom,'HARDWARE','Blum hinge + plate','set',hinges,PRICE.hinge_set,'UAH','soft close');
    addBom(bom,'OPERATION','Hinge cup drilling','hole',hinges,PRICE.hole_hinge,'UAH','facade');
    addBom(bom,'FASTENER','Self-tapping screw','pcs',hinges*4,PRICE.screw_selftap,'UAH','hinges');
    addBom(bom,'HARDWARE','Handle','pcs',count,PRICE.handle,'UAH','1 per facade');
    addBom(bom,'FASTENER','M4×25','pcs',count*2,PRICE.m4x25,'UAH','handles');
  }
  function pushPantry(parts,bom,m,isFridge=false){
    const W=run(m),D=Math.round(depth(m)||510),H=Math.round(m.h||2100),inner=Math.max(100,W-36),ix={value:1},groove=grooveProcessing();
    parts.push(makePart(m.number,ix.value++,CARCASS,'Left',H,D,1,EDGE,2,2,isFridge?'':groove));
    parts.push(makePart(m.number,ix.value++,CARCASS,'Right',H,D,1,EDGE,2,2,isFridge?'':groove));
    parts.push(makePart(m.number,ix.value++,CARCASS,'Bottom',inner,Math.max(100,D-1),1,EDGE,2,2,isFridge?'Ø150 ventilation cut':groove));
    parts.push(makePart(m.number,ix.value++,CARCASS,'Top',inner,Math.max(100,D-1),1,EDGE,2,2,'',''));
    const shelfCount=isFridge?1:Math.max(1,Math.floor((H-500)/375));
    parts.push(makePart(m.number,ix.value++,CARCASS,isFridge?'Fridge Fixing Shelf':'Shelf',inner,Math.max(100,D-21),shelfCount,EDGE,2,2,isFridge?'Fixed':'Mixed fixed/adjustable',`approx. ${shelfCount} shelves`));
    if(!isFridge)parts.push(makePart(m.number,ix.value++,HDF,'Back',Math.max(100,H-2),Math.max(100,W-2),1,'','','','Back in groove'));
    const facadeCount=isFridge?(String(m.content||'').includes('FRIDGE')&&String(m.content||'').includes('FREEZER')?2:1):Math.max(1,Math.ceil(H/900));
    const fh=Math.floor((H-3*(facadeCount-1))/facadeCount);
    for(let i=0;i<facadeCount;i++)parts.push(makePart(m.number,ix.value++,FACADE,'Facade',fh,Math.max(100,W-3),1,EDGE,2,2,'',isFridge?'appliance configuration defines count':''));
    addFacadeHardware(bom,m,fh,facadeCount);
    const c=structuralConnectorCount(D,8);
    addBom(bom,'FASTENER','Confirmat','pcs',c.total,PRICE.confirmat,'UAH','tall carcass pilot');
    addBom(bom,'OPERATION','Regular drilling','hole',c.total*2,PRICE.hole_regular,'UAH','end + face');
  }
  function pushDishwasher(parts,bom,m){
    if(m.freestanding)return;
    const W=Math.max(100,Number(m.appliance_width_mm)||run(m));
    const H=Math.max(100,Number(m.h)||762)-5;
    parts.push(makePart(m.number,1,FACADE,'Facade',H,Math.max(100,W-3),1,EDGE,2,2,'','Built-in dishwasher facade only'));
    addBom(bom,'HARDWARE','Handle','pcs',1,PRICE.handle,'UAH','dishwasher facade');
    addBom(bom,'FASTENER','M4×25','pcs',2,PRICE.m4x25,'UAH','handle');
  }
  function pushOven(parts,bom,m){
    const b=pushBasicLower(parts,bom,m,{adjustableShelf:false,rails:2,back:false,joints:6});
    parts.push(makePart(m.number,b.ix.value++,CARCASS,'Oven Support Shelf',b.inner,Math.max(100,b.D-21),1,EDGE,2,2,'Fixed',''));
  }
  function pushHinged(parts,bom,m){
    const b=pushBasicLower(parts,bom,m,{adjustableShelf:true,rails:2,back:true,joints:6});
    const f=facadeParts(parts,m,b.ix,b.H,undefined);
    addFacadeHardware(bom,m,f.height,f.count);
  }

  function addBom(bom,category,item,unit,qty,unitPrice,currency='UAH',note=''){
    const q=round(qty,3),price=unitPrice==null?null:Number(unitPrice),amount=price==null?0:round(q*price,2);
    bom.push({category,item,unit,qty:q,unit_price:price,currency,amount,note,status:price==null?'OPEN':'OK'});
  }
  function aggregateBom(rows){
    const map=new Map();
    rows.forEach(r=>{const key=[r.category,r.item,r.unit,r.unit_price,r.currency,r.note,r.status].join('|');const x=map.get(key)||{...r,qty:0,amount:0};x.qty=round(x.qty+r.qty,3);x.amount=round(x.amount+r.amount,2);map.set(key,x)});
    return [...map.values()];
  }
  function buildPackage(){
    const runtime=rt();if(!runtime?.ready)return null;
    const modules=runtime.getModules().filter(m=>m.wall==='A').sort((a,b)=>(a.level==='upper')-(b.level==='upper')||Number(a.x||0)-Number(b.x||0));
    const parts=[],rawBom=[];
    modules.forEach(m=>{
      if(m.kind==='DISHWASHER')pushDishwasher(parts,rawBom,m);
      else if(m.kind==='DRAWERS')pushDrawers(parts,rawBom,m,2);
      else if(m.kind==='SINK')pushSink(parts,rawBom,m);
      else if(m.kind==='OVEN'||m.kind==='COOKTOP')pushOven(parts,rawBom,m);
      else if(m.kind==='UPPER_HOOD')pushHood(parts,rawBom,m);
      else if(['UPPER','UPPER_TOP','DISH_DRYING'].includes(m.kind))pushUpper(parts,rawBom,m,{noBottom:m.kind==='DISH_DRYING'});
      else if(m.kind==='FRIDGE')pushPantry(parts,rawBom,m,true);
      else if(m.kind==='TALL_OVEN'||m.kind==='TALL_OVEN_SHELL')pushPantry(parts,rawBom,m,false);
      else if(m.level==='lower')pushHinged(parts,rawBom,m);
    });
    parts.forEach((p,i)=>p.no=i+1);

    const carcassArea=parts.filter(p=>p.material===CARCASS||p.material===DRAWER).reduce((s,p)=>s+p.area_m2,0);
    const facadeArea=parts.filter(p=>p.material===FACADE).reduce((s,p)=>s+p.area_m2,0);
    const hdfArea=parts.filter(p=>p.material===HDF).reduce((s,p)=>s+p.area_m2,0);
    const serviceArea=carcassArea+facadeArea;
    const cutLm=carcassArea*6;
    const bodyEdgeLm=carcassArea*6*1.2;
    const facadeEdgeLm=parts.filter(p=>p.material===FACADE).reduce((s,p)=>s+((p.long_edge||0)*mm2m(p.length_mm)+(p.short_edge||0)*mm2m(p.width_mm))*p.qty,0);
    const grooveLm=parts.reduce((s,p)=>s+(String(p.processing).includes('Groove')?mm2m(p.length_mm)*p.qty:0),0);

    addBom(rawBom,'MATERIAL','LDSP 18 Carcas / Drawer','m²',carcassArea,PRICE.carcass_m2,'UAH','Category I');
    addBom(rawBom,'MATERIAL','LDSP 18 Facade','m²',facadeArea,PRICE.facade_m2,'UAH','Category I');
    addBom(rawBom,'MATERIAL','HDF 3 mm','m²',hdfArea,PRICE.hdf_m2,'UAH','laminated');
    addBom(rawBom,'OPERATION','Cutting','lm',cutLm,PRICE.cut_lm,'UAH','carcass area × 6');
    addBom(rawBom,'MATERIAL','PVC edge Carcas','lm',bodyEdgeLm,PRICE.edge_material_lm,'UAH','carcass area × 6 × 1.20');
    addBom(rawBom,'OPERATION','Edgebanding Carcas','lm',bodyEdgeLm,PRICE.edge_labor_lm,'UAH','same length as carcass edge');
    addBom(rawBom,'MATERIAL','PVC edge Facade','lm',facadeEdgeLm,PRICE.edge_material_lm,'UAH','from detail perimeter');
    addBom(rawBom,'OPERATION','Edgebanding Facade','lm',facadeEdgeLm,PRICE.edge_labor_lm,'UAH','from detail perimeter');
    addBom(rawBom,'OPERATION','Groove machining','lm',grooveLm,PRICE.groove_lm,'UAH','HDF grooves');

    const lowerRun=modules.filter(m=>m.level!=='upper'&&!m.tall&&m.kind!=='FRIDGE').reduce((s,m)=>s+run(m),0);
    const slabs=lowerRun>0?Math.ceil(lowerRun/PRICE.countertop_length_mm):0;
    addBom(rawBom,'MATERIAL','EGGER worktop 4100×600×38','slab',slabs,PRICE.countertop_slab,'UAH','whole slab billed; remainder not deducted');

    const fx=Math.max(1,Number(localStorage.getItem(FX_KEY))||44.5);
    addBom(rawBom,'SERVICE','Assembly','m²',serviceArea,PRICE.assembly_usd_m2*fx,'UAH',`$4/m² × FX ${fx}`);
    addBom(rawBom,'SERVICE','Packaging','m²',serviceArea,PRICE.packaging_usd_m2*fx,'UAH',`$1/m² × FX ${fx}`);
    addBom(rawBom,'SERVICE','Installation','m²',serviceArea,PRICE.installation_usd_m2*fx,'UAH',`$6/m² × FX ${fx}`);
    addBom(rawBom,'SERVICE','Delivery transport','hour',PRICE.delivery_min_hours,PRICE.delivery_usd_hour*fx,'UAH',`minimum 2h · $20/h × FX ${fx}`);
    addBom(rawBom,'SERVICE','Loaders','man-hour',PRICE.loader_count*PRICE.loader_min_hours,PRICE.loader_uah_hour,'UAH','2 loaders × minimum 2h');

    const bom=aggregateBom(rawBom);
    const knownCost=round(bom.reduce((s,r)=>s+(r.status==='OK'?r.amount:0),0),2);
    const openCount=bom.filter(r=>r.status==='OPEN'&&r.qty>0).length;
    const sellingPrice=round(knownCost*2,2);
    const room=runtime.getRoom(),inputs=runtime.getInputs();
    const comms=communicationPoints(modules,room,inputs);
    return{modules,parts,bom,knownCost,sellingPrice,openCount,room,inputs,fx,carcassArea,facadeArea,hdfArea,serviceArea,lowerRun,slabs,comms};
  }

  function communicationPoints(modules,room,inputs){
    const one=kind=>modules.find(m=>m.kind===kind),center=m=>Number(m.x||0)+run(m)/2;
    const z=(m,ratio)=>Math.round((Number(m.z||0)+Number(m.h||700)*ratio)/10)*10;
    const pts=[],push=(label,device,m,zz)=>{if(m)pts.push({wall:'A',label,device,x:Math.round(center(m)/10)*10,z:Math.max(0,Math.round(zz))})};
    const sink=one('SINK'),cook=one('COOKTOP'),fridge=one('FRIDGE'),dw=one('DISHWASHER'),oven=one('TALL_OVEN')||one('OVEN'),hood=one('UPPER_HOOD');
    if(sink){push('Канализация','Мойка',sink,z(sink,.38));push('Подача воды','Мойка',sink,z(sink,.38)+80)}
    if(cook){if(inputs.cooktop_type==='GAS'||inputs.cooktop_type==='COMBINED')push('Газ','Варочная панель',cook,z(cook,.30));if(inputs.cooktop_type!=='GAS')push('Питание варочной','Варочная панель',cook,z(cook,.30))}
    if(hood)push('Вытяжка / вентиляция','Вытяжка',hood,z(hood,.55));
    if(fridge)push('Питание холодильника','Холодильник',fridge,z(fridge,.16));
    if(dw)push('Питание ПММ','ПММ',dw,z(dw,.26));
    if(oven)push('Питание духовки','Духовой шкаф',oven,z(oven,.24));
    return pts;
  }

  function kitchenSvg(pkg){
    const W=1200,H=660,pad=70,wallL=Math.max(1000,pkg.room.lengthMm),wallH=Math.max(2000,pkg.room.heightMm);
    const sx=(W-2*pad)/wallL,sy=(H-2*pad)/wallH,baseY=H-pad;
    const rects=pkg.modules.map(m=>{
      const x=pad+Number(m.x||0)*sx,y=baseY-(Number(m.z||0)+Number(m.h||0))*sy,w=Math.max(2,run(m)*sx),h=Math.max(2,Number(m.h||0)*sy);
      return `<g><rect x="${round(x,1)}" y="${round(y,1)}" width="${round(w,1)}" height="${round(h,1)}" fill="none" stroke="#171717" stroke-width="1.5"/><text x="${round(x+w/2,1)}" y="${round(y+h/2,1)}" text-anchor="middle" font-size="16" font-family="Arial" font-weight="700">M${m.number}</text><text x="${round(x+w/2,1)}" y="${round(baseY+22,1)}" text-anchor="middle" font-size="11" font-family="Arial">${Math.round(run(m))}</text></g>`;
    }).join('');
    const maxTop=Math.max(0,...pkg.modules.map(m=>Number(m.z||0)+Number(m.h||0)));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="white"/><text x="${pad}" y="32" font-size="18" font-family="Arial" font-weight="700">BIZET OS · WALL A · ${esc(projectId)}</text><line x1="${pad}" y1="${baseY}" x2="${W-pad}" y2="${baseY}" stroke="#171717" stroke-width="2"/><rect x="${pad}" y="${baseY-wallH*sy}" width="${wallL*sx}" height="${wallH*sy}" fill="none" stroke="#999" stroke-width="1"/>${rects}<text x="${W-pad}" y="32" text-anchor="end" font-size="12" font-family="Arial">Wall ${Math.round(wallL)} mm · H ${Math.round(wallH)} mm · Furniture H ${Math.round(maxTop)} mm</text></svg>`;
  }
  function commsSvg(pkg){
    const W=1200,H=660,pad=70,wallL=Math.max(1000,pkg.room.lengthMm),wallH=Math.max(2000,pkg.room.heightMm),sx=(W-2*pad)/wallL,sy=(H-2*pad)/wallH,baseY=H-pad;
    const colors=['#2563eb','#0f766e','#b45309','#7c3aed','#be123c','#475569'];
    const dots=pkg.comms.map((p,i)=>{const x=pad+p.x*sx,y=baseY-p.z*sy,c=colors[i%colors.length];return `<g><circle cx="${round(x,1)}" cy="${round(y,1)}" r="8" fill="${c}"/><text x="${round(x+12,1)}" y="${round(y-8,1)}" font-size="11" font-family="Arial" fill="#171717">${esc(p.label)}</text><text x="${round(x+12,1)}" y="${round(y+8,1)}" font-size="10" font-family="Arial" fill="#555">X ${p.x} · Z ${p.z}</text></g>`}).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="white"/><text x="${pad}" y="32" font-size="18" font-family="Arial" font-weight="700">BIZET OS · COMMUNICATIONS · WALL A</text><rect x="${pad}" y="${baseY-wallH*sy}" width="${wallL*sx}" height="${wallH*sy}" fill="#f7f7f5" stroke="#999"/>${dots}<text x="${pad}" y="${H-18}" font-size="10" font-family="Arial" fill="#777">Pilot automatic coordinates. Verify before construction.</text></svg>`;
  }
  function csv(rows,cols){
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    return '\uFEFF'+[cols.map(c=>q(c[0])).join(';'),...rows.map(r=>cols.map(c=>q(r[c[1]])).join(';'))].join('\r\n');
  }
  function download(name,text,mime='text/plain;charset=utf-8'){
    const blob=new Blob([text],{type:mime}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},400);
  }
  function detailsCsv(pkg){return csv(pkg.parts,[['№','no'],['Material','material'],['Unique code','code'],['Part name','name'],['Length','length_mm'],['Width','width_mm'],['Qty','qty'],['Unit','unit'],['Edge','edge_name'],['Edge long side','long_edge'],['Edge short side','short_edge'],['Additional processing','processing'],['Note','note']])}
  function bomCsv(pkg){return csv(pkg.bom,[['Category','category'],['Item','item'],['Unit','unit'],['Qty','qty'],['Unit price','unit_price'],['Currency','currency'],['Amount','amount'],['Status','status'],['Note','note']])}

  function printHtml(pkg){
    const rows=pkg.parts.map(p=>`<tr><td>${p.no}</td><td>${esc(p.material)}</td><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${p.length_mm}</td><td>${p.width_mm}</td><td>${p.qty}</td><td>${p.unit}</td><td>${esc(p.edge_name)}</td><td>${p.long_edge}</td><td>${p.short_edge}</td><td>${esc(p.processing)}</td><td>${esc(p.note)}</td></tr>`).join('');
    const b=pkg.bom.map(r=>`<tr><td>${esc(r.category)}</td><td>${esc(r.item)}</td><td>${r.qty}</td><td>${esc(r.unit)}</td><td>${r.unit_price??'OPEN'}</td><td>${r.amount}</td><td>${esc(r.note)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>BIZET OS Pilot Package</title><style>body{font:12px Arial;margin:24px;color:#111}h1{font-size:24px}h2{margin-top:28px}table{width:100%;border-collapse:collapse;font-size:9px}th,td{border:1px solid #bbb;padding:4px;text-align:left}.cards{display:flex;gap:12px}.card{border:1px solid #bbb;padding:12px;min-width:180px}.svg{page-break-inside:avoid;margin:18px 0}.note{color:#666}@media print{button{display:none}}</style></head><body><h1>BIZET OS · Category I · Pilot package</h1><p>Project: ${esc(projectId)}</p><div class="cards"><div class="card"><b>Cost</b><br>${pkg.knownCost.toLocaleString('uk-UA')} UAH</div><div class="card"><b>BIZET Furniture</b><br>${pkg.sellingPrice.toLocaleString('uk-UA')} UAH</div><div class="card"><b>OPEN</b><br>${pkg.openCount}</div></div><p class="note">${esc(t('note'))}</p><h2>Kitchen elevation</h2><div class="svg">${kitchenSvg(pkg)}</div><h2>Communications</h2><div class="svg">${commsSvg(pkg)}</div><h2>Details</h2><table><thead><tr><th>№</th><th>Material</th><th>Code</th><th>Name</th><th>L</th><th>W</th><th>Qty</th><th>Unit</th><th>Edge</th><th>Long</th><th>Short</th><th>Processing</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table><h2>BOM</h2><table><thead><tr><th>Category</th><th>Item</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Amount</th><th>Note</th></tr></thead><tbody>${b}</tbody></table><script>setTimeout(()=>window.print(),350)<\/script></body></html>`;
  }

  function renderOutput(){
    const pkg=buildPackage(),body=$('panelBody');if(!pkg||!body)return;
    $('panelKicker').textContent='07 · '+t('result');$('panelTitle').textContent=t('title');
    body.innerHTML=`<section class="r8-section"><p class="r8-output-kicker">${t('pilot')}</p><div class="r8-output-price"><div><span>${t('cost')}</span><strong>${pkg.knownCost.toLocaleString('uk-UA')} ₴</strong></div><div class="is-price"><span>${t('price')} · COST × 2</span><strong>${pkg.sellingPrice.toLocaleString('uk-UA')} ₴</strong></div></div><div class="r8-output-meta"><span>${t('open')}: <b>${pkg.openCount}</b></span><span>LDSP: <b>${round(pkg.carcassArea,2)} m²</b></span><span>Facade: <b>${round(pkg.facadeArea,2)} m²</b></span><span>Worktop: <b>${pkg.slabs} × 4100</b></span></div><label class="r8-field"><span>${t('fx')}</span><input id="pilotFxRate" type="number" step="0.01" min="1" value="${pkg.fx}"></label><button class="r8-save" id="pilotRecalc" type="button">${t('refresh')}</button><p class="r8-output-note">${t('note')}</p></section><section class="r8-section"><h3>WALL A · ${lang()==='en'?'Kitchen elevation':'Схема кухни'}</h3><div class="r8-output-svg">${kitchenSvg(pkg)}</div></section><section class="r8-section"><h3>${lang()==='en'?'Communications':'Коммуникации'}</h3><div class="r8-output-svg">${commsSvg(pkg)}</div></section><section class="r8-section"><h3>${lang()==='en'?'Documents':'Документы'}</h3><div class="r8-output-actions"><button type="button" id="pilotDetails">${t('details')}</button><button type="button" id="pilotBom">${t('bom')}</button><button type="button" id="pilotKitchen">${t('kitchen')}</button><button type="button" id="pilotComms">${t('comms')}</button><button type="button" class="is-primary" id="pilotPrint">${t('print')}</button></div></section>`;
    $('pilotFxRate').onchange=()=>{localStorage.setItem(FX_KEY,String(Math.max(1,Number($('pilotFxRate').value)||44.5)));renderOutput()};
    $('pilotRecalc').onclick=renderOutput;
    $('pilotDetails').onclick=()=>download('BIZET_OS_Details_'+projectId+'.csv',detailsCsv(pkg),'text/csv;charset=utf-8');
    $('pilotBom').onclick=()=>download('BIZET_OS_BOM_'+projectId+'.csv',bomCsv(pkg),'text/csv;charset=utf-8');
    $('pilotKitchen').onclick=()=>download('BIZET_OS_Kitchen_Wall_A_'+projectId+'.svg',kitchenSvg(pkg),'image/svg+xml;charset=utf-8');
    $('pilotComms').onclick=()=>download('BIZET_OS_Communications_Wall_A_'+projectId+'.svg',commsSvg(pkg),'image/svg+xml;charset=utf-8');
    $('pilotPrint').onclick=()=>{const w=window.open('','_blank');if(!w)return;w.document.open();w.document.write(printHtml(pkg));w.document.close()};
    $('editorPanel').hidden=false;$('editorPanel').scrollTop=0;
  }

  function install(){
    const nav=$('workspaceTools');if(!nav||$('pilotResultButton'))return;
    const b=document.createElement('button');b.id='pilotResultButton';b.type='button';b.innerHTML='<span>07</span>'+t('result');nav.appendChild(b);
    b.onclick=()=>{document.querySelectorAll('#workspaceTools button').forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');rt()?.suppressModuleOpen?.(700);renderOutput()};
    window.addEventListener('bizet:modelrendered',()=>{if(b.classList.contains('is-active'))renderOutput()});
    window.addEventListener('bizet:languagechange',()=>{b.innerHTML='<span>07</span>'+t('result');if(b.classList.contains('is-active'))renderOutput()});
    const variants=$('randomVariant')?.closest('.r8-variant-controls');if(variants){['pointerdown','pointerup','click'].forEach(ev=>variants.addEventListener(ev,e=>e.stopPropagation()))}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.BizetPilotOutput={buildPackage,renderOutput,kitchenSvg,commsSvg,detailsCsv,bomCsv};
})();