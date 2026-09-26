(()=> {
  const VERSION='R10.3.2-POINT-B-2026-09-26';
  const PRICES={
    CARCAS_M2:776,FACADE_M2:1200,HDF_M2:120,
    CUT_M:20,EDGE_LABOR_M:30,EDGE_MATERIAL_M:30,
    HOLE:7,HINGE_CUP:40,GROOVE_M:40,
    HINGE_BLUM:200,LEG:25,LEG_CLIP:12,SCREW:0.30,HANDLE:200,SHELF_SUPPORT:12,
    CONFIRMAT:1,MINIFIX:5,DOWEL:0.8,RAFIX:10,
    DRAWER_SLIDE:1200,METAL_DRAWER:2200,EURO_SCREW:1.5,
    WORKTOP_SLAB:8000,WORKTOP_LENGTH_MM:4100,
    ASSEMBLY_M2:0,PACKING_M2:0,INSTALL_M2:0,DELIVERY_TRIP:0,RPR_HOUR:0
  };
  const GAP=3,TOP_GAP=5,BODY_T=18,EDGE='PVC 22×0.8';
  const $=id=>document.getElementById(id);
  const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(n)||0);
  const money=n=>fmt(n)+' грн';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const round=n=>Math.round(Number(n)||0);
  const area=(l,w,q=1)=>Math.max(0,l)*Math.max(0,w)*q/1e6;
  const runW=m=>m.wall==='A'?m.w:m.d;
  const depth=m=>m.wall==='A'?m.d:m.w;

  function detail(module,index,seq,material,name,l,w,q=1,edgeName=EDGE,longEdge=2,shortEdge=2,processing='',note='',codePrefix=''){
    return{
      no:index,
      material,
      code:codePrefix||`${module.number}.${String(seq).padStart(3,'0')}`,
      name,
      length:round(Math.max(l,w)),
      width:round(Math.min(l,w)),
      qty:q,
      unit:'шт',
      edge:edgeName,
      edge_long:longEdge,
      edge_short:shortEdge,
      processing,
      note
    };
  }
  function facadePieces(module,h){
    const W=runW(module),available=Math.max(100,W-GAP),requested=Math.max(1,Math.min(3,Number(module.facade_count)||0));
    if(requested){
      const fw=Math.floor((W-GAP*(requested-1))/requested);
      if(fw<=597)return[{w:fw,h,count:requested}];
    }
    if(available<=597)return[{w:available,h,count:1}];
    const count=Math.min(3,Math.max(2,Math.ceil(available/597))),fw=Math.floor((W-GAP*(count-1))/count);
    return[{w:fw,h,count}];
  }
  function fastenersPerSide(d){if(d<=550)return 2;if(d<1000)return 3;return 4+Math.floor((d-1000)/400)}
  function shelfCountForUpper(h){if(h<=750)return 1;if(h<=1100)return 2;return Math.max(2,Math.ceil(h/400)-1)}
  function shelfCountForTall(h){return Math.max(1,Math.floor(h/380)-1)}

  function ordinaryBase(module,startNo){
    const out=[],W=runW(module),H=round(module.h),D=depth(module),inner=W-BODY_T*2,partD=Math.max(100,D-1);
    let s=1,n=startNo;
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Left',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Right',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Bottom',inner,partD));
    const shelfCount=Math.max(1,Math.min(2,Number(module.shelf_count)||1)),shelfType=module.shelf_type==='FIXED'?'Жёсткая полка':'Регулируемая полка; полкодержатели';
    for(let i=0;i<shelfCount;i++)out.push(detail(module,n++,s++,'ЛДСП 18 Carcas',shelfCount>1?`Shelf ${i+1}`:'Shelf',inner,partD,1,EDGE,2,2,shelfType));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Rail',inner,100));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Rail',inner,100));
    out.push(detail(module,n++,s++,'HDF 3 mm','Back',Math.max(100,W-2),Math.max(100,H-2),1,'',0,0,'Паз под заднюю стенку','PILOT: размер HDF требует финальной заморозки'));
    const f=facadePieces(module,Math.max(100,H-TOP_GAP));
    f.forEach(x=>out.push(detail(module,n++,s++,'ЛДСП 18 Facade','Facade',x.h,x.w,x.count,EDGE,2,2,'Петли + чашки Ø35','Макс. цельный фасад 597 мм')));
    return out;
  }
  function sinkBase(module,startNo){
    const out=[],W=runW(module),H=round(module.h),D=depth(module),inner=W-BODY_T*2,partD=Math.max(100,D-1);
    let s=1,n=startNo;
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Left',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Right',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Bottom',inner,partD));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Rail Front',inner,100));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Rail Back Lower',inner,100,1,EDGE,2,2,'Вертикально; верх заднего ребра ниже на 200–250 мм'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Rail Additional',inner,100));
    facadePieces(module,Math.max(100,H-TOP_GAP)).forEach(x=>out.push(detail(module,n++,s++,'ЛДСП 18 Facade','Facade',x.h,x.w,x.count,EDGE,2,2,'Петли + чашки Ø35','Без задней стенки')));
    return out;
  }
  function drawerParts(module,drawerNo,facadeH,startNo){
    const out=[],W=runW(module),D=depth(module),drawerH=Math.max(80,round(facadeH-50)),dw=Math.max(200,W-85),dd=Math.max(200,D-20);
    let n=startNo,s=1;const p=`${module.number}.${drawerNo}.`;
    out.push(detail(module,n++,s++,'ЛДСП 18 Drawer','Drawer Left',dd,drawerH,1,EDGE,2,2,'Минификс + шкант', '',p+'001'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Drawer','Drawer Right',dd,drawerH,1,EDGE,2,2,'Минификс + шкант','',p+'002'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Drawer','Drawer Front',dw,Math.max(80,drawerH-32),1,EDGE,2,2,'Минификс + шкант','',p+'003'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Drawer','Drawer Back',dw,Math.max(80,drawerH-32),1,EDGE,2,2,'Минификс + шкант','',p+'004'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Drawer','Drawer Bottom',dw,dd,1,EDGE,2,2,'4 шканта к боковинам + 4 конфирмата к Front/Back; 2 отверстия с тыла под фиксацию','',p+'005'));
    return out;
  }
  function drawersBase(module,startNo,count=2){
    const out=[],W=runW(module),H=round(module.h),D=depth(module),inner=W-BODY_T*2;
    let n=startNo,s=1;
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Left',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Right',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Bottom',inner,Math.max(100,D-1)));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Rail',inner,100));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Rail',inner,100));
    out.push(detail(module,n++,s++,'HDF 3 mm','Back',Math.max(100,W-2),Math.max(100,H-2),1,'',0,0,'Паз под заднюю стенку','PILOT: размер HDF требует финальной заморозки'));
    const facadeH=Math.floor((H-TOP_GAP-GAP*(count-1))/count);
    for(let i=0;i<count;i++)out.push(detail(module,n++,s++,'ЛДСП 18 Facade',`Facade Drawer ${i+1}`,facadeH,Math.max(100,W-GAP),1,EDGE,2,2,'Ручка'));
    for(let i=1;i<=count;i++){const parts=drawerParts(module,i,facadeH,n);out.push(...parts);n+=parts.length}
    return out;
  }
  function upper(module,startNo,dryer=false,hood=false){
    const out=[],W=runW(module),H=round(module.h),D=depth(module),inner=W-BODY_T*2;
    let n=startNo,s=1;
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Left',H,D,1,EDGE,2,2,'Паз 20 по длинной стороне, 4×10 мм'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Right',H,D,1,EDGE,2,2,'Паз 20 по длинной стороне, 4×10 мм'));
    if(!dryer)out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Bottom',inner,Math.max(100,D-1),1,EDGE,2,2,'Паз 20 по длинной стороне, 4×10 мм'));
    const sc=shelfCountForUpper(H);
    for(let i=0;i<sc;i++)out.push(detail(module,n++,s++,'ЛДСП 18 Carcas',dryer?'Shelf Adjustable':'Shelf',inner,Math.max(100,D-21),1,EDGE,2,2,dryer?'Полкодержатели':'Жёсткая/регулируемая по правилу'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Top',inner,Math.max(100,D-21)));
    out.push(detail(module,n++,s++,'HDF 3 mm','Back',Math.max(100,W-2),Math.max(100,H-2),1,'',0,0,'В пазы боковин/дна, нахлёст на крышу; Г-вырезы 44×30 под навесы'));
    if(dryer){
      out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Light Rail',inner,60,1,EDGE,2,2,'Паз под заднюю стенку','Модуль с сушкой без дна для вентиляции'));
    }
    if(hood){
      out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Hood Front Wall',Math.max(100,W-70),100,1,EDGE,2,2,'Экран вытяжки'));
      out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Duct Side Left',Math.max(100,H-180),180,1,EDGE,2,2,'Вырез вентканала 170×200'));
      out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Duct Side Right',Math.max(100,H-180),180,1,EDGE,2,2,'Вырез вентканала 170×200'));
      out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Duct Front Wall',Math.max(100,W-70),100,1,EDGE,2,2,'Закрывает вентканал'));
    }
    facadePieces(module,Math.max(100,H-GAP)).forEach(x=>out.push(detail(module,n++,s++,'ЛДСП 18 Facade','Facade',x.h,x.w,x.count,EDGE,2,2,'Петли + чашки Ø35','Макс. цельный фасад 597 мм')));
    return out;
  }
  function tall(module,startNo,fridge=false,oven=false){
    const out=[],W=runW(module),H=round(module.h),D=depth(module),inner=W-BODY_T*2;
    let n=startNo,s=1;
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Left',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Right',H,D));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Bottom',inner,Math.max(100,D-1),1,EDGE,2,2,fridge?'Круглый вырез Ø150 для вентиляции':'Паз 20'));
    out.push(detail(module,n++,s++,'ЛДСП 18 Carcas','Top',inner,Math.max(100,D-21)));
    const shelves=fridge?1:oven?Math.min(4,Math.max(3,shelfCountForTall(H))):shelfCountForTall(H);
    for(let i=0;i<shelves;i++)out.push(detail(module,n++,s++,'ЛДСП 18 Carcas',`Shelf ${i+1}`,inner,Math.max(100,D-21),1,EDGE,2,2,oven?'Положение зависит от техники':'Шаг ориентир 350–400 мм'));
    if(!fridge)out.push(detail(module,n++,s++,'HDF 3 mm','Back',Math.max(100,W-2),Math.max(100,H-2),1,'',0,0,'Паз 20'));
    if(oven){
      const drawerFacadeH=360;
      out.push(detail(module,n++,s++,'ЛДСП 18 Facade','Facade Drawer',drawerFacadeH,Math.max(100,W-GAP),1,EDGE,2,2,'Ручка','Нижний выдвижной ящик под духовкой'));
      const drawer=drawerParts(module,1,drawerFacadeH,n);out.push(...drawer);n+=drawer.length;
      const upperH=Math.max(300,H-drawerFacadeH-600-GAP*2);
      out.push(detail(module,n++,s++,'ЛДСП 18 Facade','Facade Upper',upperH,Math.max(100,W-GAP),1,EDGE,2,2,'Петли + чашки Ø35','Над зоной духовки'));
    }else{
      const faceCount=fridge?(module.content==='FRIDGE_FREEZER'?2:1):Math.max(1,Math.ceil(H/900));
      const fh=Math.floor((H-GAP*(faceCount-1))/faceCount);
      for(let i=0;i<faceCount;i++)out.push(detail(module,n++,s++,'ЛДСП 18 Facade',`Facade ${i+1}`,fh,Math.max(100,W-GAP),1,EDGE,2,2,'Петли + чашки Ø35'));
    }
    return out;
  }
  function dishwasher(module,startNo){
    const W=Number(module.appliance_width_mm)||runW(module);
    if(module.freestanding){
      return[
        detail(module,startNo,1,'ЛДСП 18 Carcas','Side Panel Left',module.h+module.z,depth(module)),
        detail(module,startNo+1,2,'ЛДСП 18 Carcas','Side Panel Right',module.h+module.z,depth(module))
      ];
    }
    return[detail(module,startNo,1,'ЛДСП 18 Facade','Facade Dishwasher',Math.max(100,module.h+module.z-TOP_GAP),Math.max(100,W-GAP),1,EDGE,2,2,'Крепление к фасаду ПММ')];
  }
  function fillerDetail(module,startNo){
    const W=Math.max(20,runW(module)),H=Math.max(100,round(module.h));
    return[detail(module,startNo,1,'ЛДСП 18 Carcas','Filler Panel',H,W,1,EDGE,2,2,'','PILOT: конструкция/привязка филлера требует финального freeze')];
  }

  function detailsFor(modules){
    const all=[];let no=1;
    modules.filter(m=>m.wall==='A').forEach(m=>{
      let rows=[];
      if(m.kind==='FILLER')rows=fillerDetail(m,no);
      else if(m.kind==='DISHWASHER')rows=dishwasher(m,no);
      else if(m.kind==='SINK')rows=sinkBase(m,no);
      else if(m.kind==='DRAWERS')rows=drawersBase(m,no,Math.max(2,Math.min(5,Number(m.drawer_count)||2)));
      else if(m.kind==='UPPER_HOOD')rows=upper(m,no,false,true);
      else if(m.kind==='UPPER_DRYER')rows=upper(m,no,true,false);
      else if(m.kind==='UPPER'||m.kind==='UPPER_TOP')rows=upper(m,no,false,false);
      else if(m.kind==='FRIDGE'&&!m.freestanding)rows=tall(m,no,true,false);
      else if(m.kind==='TALL_OVEN')rows=tall(m,no,false,true);
      else if(m.tall)rows=tall(m,no,false,false);
      else if(m.kind==='FRIDGE'&&m.freestanding)rows=[];
      else rows=ordinaryBase(m,no);
      all.push(...rows);no+=rows.length;
    });
    return all.map((r,i)=>({...r,no:i+1}));
  }

  function countHardware(modules,details){
    const H={CONFIRMAT:0,MINIFIX:0,DOWEL:0,RAFIX:0,SCREW:0,HINGE:0,HINGE_CUP:0,LEG:0,LEG_CLIP:0,HANDLE:0,SHELF_SUPPORT:0,DRAWER_SLIDE:0,METAL_DRAWER:0,EURO_SCREW:0,HOLE:0,GROOVE_M:0,HANGER:0,HANGER_PLATE:0,WALL_DOWEL:0};
    modules.filter(m=>m.wall==='A').forEach(m=>{
      const D=depth(m),perSide=fastenersPerSide(D);
      if(m.level!=='upper'&&!m.tall&&!['DISHWASHER','FRIDGE','FILLER'].includes(m.kind)){
        let addedConfirmats=0;
        if(m.kind==='SINK')addedConfirmats=2*perSide+6;
        else if(m.kind==='DRAWERS')addedConfirmats=2*perSide+4;
        else addedConfirmats=4*perSide+4;
        H.CONFIRMAT+=addedConfirmats;
        H.HOLE+=addedConfirmats;
        const legs=runW(m)>700?6:4;H.LEG+=legs;H.LEG_CLIP+=Math.ceil(legs/2);H.SCREW+=legs*4+Math.ceil(legs/2)*2;
      }
      if(m.level==='upper'){
        H.HANGER+=2;H.HANGER_PLATE+=2;H.SCREW+=4;H.WALL_DOWEL+=4;
        const grooved=details.filter(d=>d.code.startsWith(m.number+'.')&&/Паз/i.test(d.processing||''));
        H.GROOVE_M+=grooved.reduce((sum,d)=>sum+(d.length*d.qty/1000),0);
      }
      if(m.kind==='TALL_OVEN'){H.DRAWER_SLIDE+=1;H.EURO_SCREW+=6;H.SCREW+=4;H.HOLE+=12;H.MINIFIX+=4;H.DOWEL+=8;H.CONFIRMAT+=4;}
      if(m.kind==='DRAWERS'){
        const drawers=Math.max(2,Math.min(5,Number(m.drawer_count)||2));H.DRAWER_SLIDE+=drawers;H.EURO_SCREW+=drawers*6;H.SCREW+=drawers*4;H.HOLE+=drawers*12;
        const facadeH=Math.floor((m.h-TOP_GAP-GAP)/2),tallDrawer=facadeH>=150;
        H.MINIFIX+=drawers*(tallDrawer?8:4);H.DOWEL+=drawers*(4+4);H.CONFIRMAT+=drawers*4;
      }
    });
    const facades=details.filter(d=>/Facade/i.test(d.name));
    facades.forEach(d=>{
      const h=d.length,w=d.width,qty=d.qty;
      const each=Math.max(h,w)>900?4:2;H.HINGE+=each*qty;H.HINGE_CUP+=each*qty;H.HANDLE+=qty;H.SCREW+=0;
    });
    const shelves=details.filter(d=>/Shelf/i.test(d.name)&&/регули/i.test((d.processing||'')+(d.note||'')));
    H.SHELF_SUPPORT+=shelves.reduce((s,d)=>s+d.qty*4,0);
    H.HOLE+=H.HINGE_CUP+H.HANDLE*2;
    H.M4_HANDLE=H.HANDLE*2;
    return H;
  }

  function buildBOM(modules,details){
    const areas={CARCAS:0,FACADE:0,DRAWER:0,HDF:0};
    details.forEach(d=>{
      const a=area(d.length,d.width,d.qty);
      if(/HDF/i.test(d.material))areas.HDF+=a;
      else if(/Facade/i.test(d.material))areas.FACADE+=a;
      else if(/Drawer/i.test(d.material))areas.DRAWER+=a;
      else areas.CARCAS+=a;
    });
    const panelArea=areas.CARCAS+areas.FACADE+areas.DRAWER;
    const cutM=panelArea*6;
    const edgeM=panelArea*6*1.2;
    const hw=countHardware(modules,details);
    const worktopGroups={};
    modules.filter(m=>m.level!=='upper'&&!m.tall&&m.kind!=='FRIDGE').forEach(m=>{
      const wall=m.wall||'A';(worktopGroups[wall]||(worktopGroups[wall]=[])).push(m);
    });
    const worktopPlans=Object.values(worktopGroups).map(group=>window.BizetR10Rules?.worktopRunPlan?.(group)||{segments:[],joints:[]});
    const worktopSlabs=Math.max(1,worktopPlans.reduce((sum,plan)=>sum+Math.max(1,plan.segments.length),0));
    const worktopJoints=worktopPlans.reduce((sum,plan)=>sum+plan.joints.length,0);
    const worktopJointMap=Object.fromEntries(Object.entries(worktopGroups).map(([wall,group])=>{
      const plan=window.BizetR10Rules?.worktopRunPlan?.(group)||{joints:[]};return[wall,plan.joints.map(v=>Math.round(v))];
    }));
    const rows=[];
    const add=(group,item,qty,unit,rate,note='')=>rows.push({group,item,qty,unit,rate,total:qty*rate,note});
    add('Материалы','ЛДСП 18 Carcas',areas.CARCAS,'м²',PRICES.CARCAS_M2);
    add('Материалы','ЛДСП 18 Drawer',areas.DRAWER,'м²',PRICES.CARCAS_M2);
    add('Материалы','ЛДСП 18 Facade',areas.FACADE,'м²',PRICES.FACADE_M2);
    add('Материалы','HDF 3 mm',areas.HDF,'м²',PRICES.HDF_M2);
    add('Материалы','PVC 22×0.8',edgeM,'п.м',PRICES.EDGE_MATERIAL_M,'Эмпирика: площадь плит × 6 + 20%');
    add('Материалы','Столешница EGGER 4100×600×38',worktopSlabs,'шт',PRICES.WORKTOP_SLAB,`Максимум 4100 мм без стыка; стыков по текущим прогонам: ${worktopJoints}`);
    add('Работы','Распил',cutM,'п.м',PRICES.CUT_M,'Площадь плит × 6');
    add('Работы','Кромкование',edgeM,'п.м',PRICES.EDGE_LABOR_M);
    add('Работы','Обычные отверстия',hw.HOLE,'шт',PRICES.HOLE);
    add('Работы','Чашка петли',hw.HINGE_CUP,'шт',PRICES.HINGE_CUP);
    add('Работы','Пазование',hw.GROOVE_M,'п.м',PRICES.GROOVE_M);
    add('Фурнитура','Петля BLUM + ответная планка',hw.HINGE,'компл',PRICES.HINGE_BLUM);
    add('Фурнитура','Ножка',hw.LEG,'шт',PRICES.LEG);
    add('Фурнитура','Клипса цоколя',hw.LEG_CLIP,'шт',PRICES.LEG_CLIP);
    add('Фурнитура','Ручка',hw.HANDLE,'шт',PRICES.HANDLE);
    if(hw.M4_HANDLE)add('Крепёж','Винт ручки M4×25',hw.M4_HANDLE,'шт',0,'OPEN — цена расходника не заморожена; 2 шт на ручку');
    add('Фурнитура','Полкодержатель',hw.SHELF_SUPPORT,'шт',PRICES.SHELF_SUPPORT);
    add('Крепёж','Конфирмат',hw.CONFIRMAT,'шт',PRICES.CONFIRMAT);
    add('Крепёж','Минификс',hw.MINIFIX,'шт',PRICES.MINIFIX);
    add('Крепёж','Шкант',hw.DOWEL,'шт',PRICES.DOWEL);
    add('Крепёж','Саморез',hw.SCREW,'шт',PRICES.SCREW);
    add('Крепёж','Евровинт 6.3×11',hw.EURO_SCREW,'шт',PRICES.EURO_SCREW);
    add('Фурнитура','Направляющие скрытого монтажа BLUM',hw.DRAWER_SLIDE,'компл',PRICES.DRAWER_SLIDE);
    if(hw.HANGER)add('Фурнитура','Навес верхнего модуля',hw.HANGER,'шт',0,'PRICE TBD — количество учитывается');
    if(hw.HANGER_PLATE)add('Фурнитура','Монтажная пластина навеса',hw.HANGER_PLATE,'шт',0,'PRICE TBD — количество учитывается');
    if(hw.WALL_DOWEL)add('Крепёж','Дюбель 8×60 + саморез 5/6×50',hw.WALL_DOWEL,'компл',0,'PRICE TBD — количество учитывается');
    add('Работы','Сборка',panelArea,'м²',PRICES.ASSEMBLY_M2,'OPEN / NOT INCLUDED — тариф не заморожен');
    add('Работы','Упаковка',panelArea,'м²',PRICES.PACKING_M2,'OPEN / NOT INCLUDED — тариф не заморожен');
    add('Работы','Установка',panelArea,'м²',PRICES.INSTALL_M2,'OPEN / NOT INCLUDED — тариф не заморожен');
    const cost=rows.reduce((s,r)=>s+r.total,0),client=cost*2;
    return{rows,cost,client,areas,cutM,edgeM,worktopSlabs,worktopJoints,worktopJointMap,unpriced:rows.filter(r=>r.rate===0&&r.qty>0)};
  }

  function moduleDrawing(modules,room,orderRef=''){
    const list=modules.filter(m=>m.wall==='A').sort((a,b)=>a.x-b.x);
    const W=1000,H=430,pad=60,scale=(W-pad*2)/Math.max(room.lengthMm,1),baseY=350;
    const rects=list.map(m=>{
      const x=pad+m.x*scale,w=Math.max(2,runW(m)*scale),h=Math.min(270,(m.z+m.h)*.11);
      return `<g><rect x="${x}" y="${baseY-h}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="2"/><text x="${x+w/2}" y="${baseY-h/2}" text-anchor="middle" font-size="15">M${m.number}</text><line x1="${x}" y1="${baseY+16}" x2="${x+w}" y2="${baseY+16}" stroke="currentColor"/><text x="${x+w/2}" y="${baseY+36}" text-anchor="middle" font-size="12">${round(runW(m))}</text></g>`;
    }).join('');
    const maxH=Math.max(0,...list.map(m=>m.z+m.h));
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:'Century Gothic',CenturyGothic,Arial,sans-serif;fill:currentColor}</style><text x="60" y="34" font-size="18" font-weight="700">BIZET OS · WALL A · KITCHEN ASSEMBLY SCHEME</text><text x="60" y="56" font-size="12">Pilot ${VERSION}${orderRef?' · '+esc(orderRef):''} · module numbers are generated automatically</text><line x1="${pad}" y1="${baseY}" x2="${W-pad}" y2="${baseY}" stroke="currentColor" stroke-width="2"/>${rects}<line x1="35" y1="${baseY}" x2="35" y2="${baseY-maxH*.11}" stroke="currentColor"/><text x="15" y="${baseY-maxH*.055}" font-size="12" transform="rotate(-90 15 ${baseY-maxH*.055})">H ${round(maxH)} mm</text><text x="${W/2}" y="415" text-anchor="middle" font-size="12">WALL A = ${round(room.lengthMm)} mm</text></svg>`;
  }
  function communicationsDrawing(modules,room,orderRef=''){
    const W=1000,H=430,pad=60,scale=(W-pad*2)/Math.max(room.lengthMm,1),baseY=350;
    const points=[];
    const add=(kind,label,m)=>{if(!m)return;const cx=m.x+runW(m)/2;points.push({kind,label,x:cx})};
    const list=modules.filter(m=>m.wall==='A');
    add('SEWER','Канализация',list.find(m=>m.kind==='SINK'));
    add('WATER','Вода',list.find(m=>m.kind==='SINK'));
    add('COOKTOP','Питание варочной',list.find(m=>m.kind==='COOKTOP'));
    add('HOOD','Вытяжка',list.find(m=>m.kind==='UPPER_HOOD'));
    add('FRIDGE','Холодильник',list.find(m=>m.kind==='FRIDGE'));
    add('OVEN','Духовка',list.find(m=>m.kind==='OVEN'||m.kind==='TALL_OVEN'));
    const lines=points.map((p,i)=>{const x=pad+p.x*scale,y=95+(i%3)*65;return `<g><line x1="${x}" y1="${baseY}" x2="${x}" y2="${y+10}" stroke="currentColor" stroke-dasharray="6 5"/><circle cx="${x}" cy="${y}" r="8" fill="none" stroke="currentColor" stroke-width="2"/><text x="${x+12}" y="${y+4}" font-size="12">${esc(p.label)} · X ${round(p.x)} mm</text></g>`}).join('');
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:'Century Gothic',CenturyGothic,Arial,sans-serif;fill:currentColor}</style><text x="60" y="34" font-size="18" font-weight="700">BIZET OS · WALL A · COMMUNICATIONS SCHEME</text><text x="60" y="56" font-size="12">${orderRef?esc(orderRef)+' · ':''}X is calculated from generated modules. Z/elevation remains USER CONFIRMATION REQUIRED in this pilot.</text><line x1="${pad}" y1="${baseY}" x2="${W-pad}" y2="${baseY}" stroke="currentColor" stroke-width="2"/>${lines}<text x="${W/2}" y="410" text-anchor="middle" font-size="12">WALL A = ${round(room.lengthMm)} mm</text></svg>`;
  }

  function productionModuleSheet(modules,room,selectedId='',orderRef=''){
    const lower=modules.filter(m=>m.level!=='upper'&&m.kind!=='FILLER').sort((a,b)=>(a.wall||'A').localeCompare(b.wall||'A')||(a.x||a.y||0)-(b.x||b.y||0));
    const module=lower.find(m=>m.id===selectedId)||lower.find(m=>m.kind==='DRAWERS')||lower.find(m=>m.kind==='HINGED')||lower.find(m=>m.kind==='SINK')||lower[0];
    if(!module)return'<svg viewBox="0 0 1200 840" xmlns="http://www.w3.org/2000/svg"><text x="60" y="80">No module selected</text></svg>';
    const W=1200,H=840,run=Math.max(100,runW(module)),dep=Math.max(100,depth(module)),mh=Math.max(100,module.h),scale=Math.min(350/run,330/mh,250/dep);
    const fw=run*scale,fh=mh*scale,sd=dep*scale,td=dep*scale,frontX=70,frontY=100,sideX=510,sideY=100,topX=70,topY=510;
    const red='#d71920',blue='#1746d1',ink='#111',grey='#d7d7d7',code=`ASS${module.number}.00.000`;
    const line=(x1,y1,x2,y2,stroke=ink,w=1.4,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
    const dimH=(x,y,w,label)=>`${line(x,y,x+w,y,red,1)}${line(x,y-6,x,y+6,red,1)}${line(x+w,y-6,x+w,y+6,red,1)}<text x="${x+w/2}" y="${y-6}" text-anchor="middle" class="dim">${label}</text>`;
    const dimV=(x,y,h,label)=>`${line(x,y,x,y+h,red,1)}${line(x-6,y,x+6,y,red,1)}${line(x-6,y+h,x+6,y+h,red,1)}<text x="${x-8}" y="${y+h/2}" text-anchor="middle" class="dim" transform="rotate(-90 ${x-8} ${y+h/2})">${label}</text>`;
    const facadeLines=module.kind==='DRAWERS'?[`<line x1="${frontX}" y1="${frontY+fh/2}" x2="${frontX+fw}" y2="${frontY+fh/2}" stroke="${ink}"/>`]:Array.from({length:Math.max(0,(module.facade_count||1)-1)},(_,i)=>`<line x1="${frontX+fw*(i+1)/(module.facade_count||1)}" y1="${frontY}" x2="${frontX+fw*(i+1)/(module.facade_count||1)}" y2="${frontY+fh}" stroke="${ink}"/>`).join('');
    const runModules=modules.filter(m=>m.wall==='A'&&m.level!=='upper').sort((a,b)=>a.x-b.x),runScale=330/Math.max(room.lengthMm||1,1),runX=790,runY=215;
    const assembly=runModules.map(m=>{const x=runX+(m.x||0)*runScale,w=Math.max(3,runW(m)*runScale),h=Math.min(105,(m.z+m.h)*.07),active=m.id===module.id;return`<rect x="${x}" y="${runY-h}" width="${w}" height="${h}" fill="${active?red:grey}" stroke="#666" stroke-width="1"/>`}).join('');
    const isoX=800,isoY=390,iw=Math.min(260,run*.28),ih=Math.min(210,mh*.17),id=Math.min(100,dep*.13);
    const iso=`<polygon points="${isoX},${isoY} ${isoX+iw},${isoY} ${isoX+iw+id},${isoY-id*.55} ${isoX+id},${isoY-id*.55}" fill="none" stroke="${ink}" stroke-width="2"/><polygon points="${isoX},${isoY} ${isoX+iw},${isoY} ${isoX+iw},${isoY+ih} ${isoX},${isoY+ih}" fill="none" stroke="${ink}" stroke-width="2"/><polygon points="${isoX+iw},${isoY} ${isoX+iw+id},${isoY-id*.55} ${isoX+iw+id},${isoY+ih-id*.55} ${isoX+iw},${isoY+ih}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    const leaders=[
      ['Left',isoX,isoY+ih*.55,730,360],
      ['Right',isoX+iw+id,isoY+ih*.55-id*.55,1110,360],
      ['Bottom',isoX+iw*.45,isoY+ih,720,625],
      ['Top',isoX+iw*.45+id*.5,isoY-id*.55,1080,330],
      ['Back',isoX+iw+id,isoY+ih*.2-id*.55,1110,470]
    ].map((a,i)=>`${line(a[1],a[2],a[3],a[4],blue,1.2)}<text x="${a[3]+(a[3]<isoX?-4:4)}" y="${a[4]-3}" text-anchor="${a[3]<isoX?'end':'start'}" class="leader">ASS${module.number}.00.00${i+1}/${a[0]}</text>`).join('');
    const drawerNote=module.kind==='DRAWERS'?'<text x="795" y="650" class="note">Nested subassembly: SDWD / drawer box</text>':'';
    const titleName=esc(module.label||module.kind),mat=module.kind==='DRAWERS'?'BASE Drawer unit':'BASE '+String(module.kind||'cabinet').replaceAll('_',' ');
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text{font-family:"Century Gothic",CenturyGothic,"Avenir Next","Trebuchet MS",Arial,sans-serif;fill:#111}
        .dim{fill:${red};font-size:14px}.leader{fill:${blue};font-size:11px;font-weight:700}.note{font-size:10px;fill:#555}.title{font-size:18px}.small{font-size:11px}
      </style>
      <rect x="8" y="8" width="1184" height="824" fill="#fff" stroke="#777"/>
      <text x="70" y="45" class="title">${esc(titleName)}</text><text x="70" y="65" class="small">${esc(orderRef||'BIZET OS · PRODUCTION DRAWING PILOT')}</text>
      <rect x="${frontX}" y="${frontY}" width="${fw}" height="${fh}" fill="none" stroke="${ink}" stroke-width="3"/>${facadeLines}
      ${dimH(frontX,frontY-26,fw,Math.round(run))}${dimV(frontX-28,frontY,fh,Math.round(mh))}
      <rect x="${sideX}" y="${sideY}" width="${sd}" height="${fh}" fill="none" stroke="${ink}" stroke-width="3"/>
      ${dimH(sideX,sideY-26,sd,Math.round(dep))}${dimV(sideX-28,sideY,fh,Math.round(mh))}
      <rect x="${topX}" y="${topY}" width="${fw}" height="${td}" fill="none" stroke="${ink}" stroke-width="3"/>
      ${dimH(topX,topY-24,fw,Math.round(run))}${dimV(topX-26,topY,td,Math.round(dep))}
      <text x="790" y="82" class="small">Assembly position</text>${assembly}
      ${iso}${leaders}${drawerNote}
      <rect x="70" y="705" width="430" height="105" fill="none" stroke="#555"/>
      <line x1="70" y1="730" x2="500" y2="730" stroke="#555"/><line x1="70" y1="755" x2="500" y2="755" stroke="#555"/>
      <text x="80" y="722" class="small">Pos. ${module.number}</text><text x="170" y="722" class="small">Qnt. 1</text><text x="250" y="722" class="small">Sc 1:15</text>
      <text x="80" y="748" class="small">Code ${code}</text><text x="80" y="774" class="small">Name ${esc(titleName)}</text>
      <text x="80" y="796" class="small">Mat. ${esc(mat)}</text><text x="320" y="796" class="small">Length ${Math.round(run)} · Height ${Math.round(mh)}</text>
      <text x="790" y="690" class="note">Reference layout: owner Production pack Bev Kitchen · PILOT VECTOR SHEET</text>
    </svg>`;
  }

  function csv(rows,headers,map){
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    return '\ufeff'+[headers.map(q).join(';'),...rows.map(r=>map(r).map(q).join(';'))].join('\n');
  }
  function download(name,type,text){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},300);
  }
  function downloadDetail(details){
    const headers=['№','Материал','Уникальный код','Наименование детали','Длина','Ширина','Количество','Ед. изм.','Наименование кромки','Кромка по длинной стороне','Кромка по короткой стороне','Дополнительные обработки','Примечание'];
    download('BIZET_Detailing_PointB.csv','text/csv;charset=utf-8',csv(details,headers,d=>[d.no,d.material,d.code,d.name,d.length,d.width,d.qty,d.unit,d.edge,d.edge_long,d.edge_short,d.processing,d.note]));
  }
  function downloadBOM(bom){download('BIZET_BOM_PointB.csv','text/csv;charset=utf-8',csv(bom.rows,['Группа','Позиция','Количество','Ед.','Цена','Сумма','Примечание'],r=>[r.group,r.item,fmt(r.qty),r.unit,fmt(r.rate),fmt(r.total),r.note]))}
  function downloadSvg(name,svg){download(name,'image/svg+xml;charset=utf-8',svg)}

  function ensureUI(){
    if($('pointBFinalActions'))return;
    const host=document.createElement('div');host.id='pointBFinalActions';host.className='r8-final-actions';
    host.innerHTML='<div class="r8-final-price"><span>Итоговая стоимость</span><strong id="pointBPrice">—</strong></div><button id="pointBPriceButton" type="button">Подумаю</button><button id="pointBDocsButton" type="button">Купить</button>';
    $('modelStatus').insertAdjacentElement('afterend',host);
    const dialog=document.createElement('dialog');dialog.id='pointBDialog';dialog.className='r8-pointb-dialog';
    dialog.innerHTML='<div class="r8-pointb-card"><button id="pointBClose" class="r8-pointb-close" type="button">×</button><div id="pointBReport"></div></div>';
    document.body.appendChild(dialog);
    $('pointBClose').onclick=()=>dialog.close();
    $('pointBPriceButton').onclick=()=>showReport('price');
    $('pointBDocsButton').onclick=()=>showReport('docs');
  }
  function current(){
    const rt=window.BizetModelRuntime;if(!rt?.ready)return null;
    const modules=rt.getModules(),room=rt.getRoom(),details=detailsFor(modules),bom=buildBOM(modules,details);
    const selectedId=rt.getActiveModule?.()?.id||'',orderRef=window.BizetOwnerBusiness?.identityRef?.()||'';
    return{rt,modules,room,details,bom,orderRef,kitchenSvg:moduleDrawing(modules,room,orderRef),commSvg:communicationsDrawing(modules,room,orderRef),productionSvg:productionModuleSheet(modules,room,selectedId,orderRef)};
  }
  function detailTable(details){
    return '<div class="r8-table-wrap"><table><thead><tr><th>№</th><th>Материал</th><th>Код</th><th>Наименование</th><th>Длина</th><th>Ширина</th><th>Кол.</th><th>Ед.</th><th>Кромка</th><th>Длин.</th><th>Корот.</th><th>Доп. обработки</th><th>Примечание</th></tr></thead><tbody>'+details.map(d=>`<tr><td>${d.no}</td><td>${esc(d.material)}</td><td><b>${esc(d.code)}</b></td><td>${esc(d.name)}</td><td>${d.length}</td><td>${d.width}</td><td>${d.qty}</td><td>${d.unit}</td><td>${esc(d.edge)}</td><td>${d.edge_long}</td><td>${d.edge_short}</td><td>${esc(d.processing)}</td><td>${esc(d.note)}</td></tr>`).join('')+'</tbody></table></div>';
  }
  function bomTable(bom){
    return '<div class="r8-table-wrap"><table><thead><tr><th>Группа</th><th>Позиция</th><th>Количество</th><th>Ед.</th><th>Цена</th><th>Сумма</th><th>Примечание</th></tr></thead><tbody>'+bom.rows.map(r=>`<tr><td>${esc(r.group)}</td><td>${esc(r.item)}</td><td>${fmt(r.qty)}</td><td>${esc(r.unit)}</td><td>${money(r.rate)}</td><td>${money(r.total)}</td><td>${esc(r.note)}</td></tr>`).join('')+'</tbody></table></div>';
  }
  function showReport(mode){
    const data=current();if(!data)return;
    const {bom,details,kitchenSvg,commSvg,productionSvg,orderRef}=data;
    const warning=bom.unpriced.length?'<p class="r8-pointb-warning">Предварительная цена: '+bom.unpriced.length+' позиции учтены по количеству, но ещё без тарифа.</p>':'';
    let html=`<p class="r8-pointb-kicker">BIZET OS · ${VERSION}${orderRef?' · '+esc(orderRef):''}</p><h2>${mode==='price'?'Итоговая стоимость':'Комплект документов'}</h2><div class="r8-price-grid"><div><span>Себестоимость</span><strong>${money(bom.cost)}</strong></div><div><span>BIZET Furniture · COST × 2</span><strong>${money(bom.client)}</strong></div></div>${warning}`;
    if(mode==='price')html+=bomTable(bom);
    else html+=`<div class="r8-doc-actions"><button id="dlProduction">Производственный лист SVG</button><button id="dlDetail">Деталировка CSV</button><button id="dlBom">BOM CSV</button><button id="dlKitchen">Схема кухни SVG</button><button id="dlComm">Коммуникации SVG</button><button id="printPointB">Печать / PDF</button></div><h3>1. Production Drawing Engine · пилотный лист модуля</h3><div class="r8-drawing">${productionSvg}</div><h3>2. Схема кухни · стена A</h3><div class="r8-drawing">${kitchenSvg}</div><h3>3. Коммуникации · стена A</h3><div class="r8-drawing">${commSvg}</div><h3>4. Деталировка · 13 столбцов</h3>${detailTable(details)}<h3>5. BOM</h3>${bomTable(bom)}`;
    $('pointBReport').innerHTML=html;
    $('pointBDialog').showModal();
    if(mode==='docs'){
      $('dlProduction').onclick=()=>downloadSvg('BIZET_Production_Module_Pilot.svg',productionSvg);$('dlDetail').onclick=()=>downloadDetail(details);$('dlBom').onclick=()=>downloadBOM(bom);
      $('dlKitchen').onclick=()=>downloadSvg('BIZET_Wall_A_Kitchen.svg',kitchenSvg);$('dlComm').onclick=()=>downloadSvg('BIZET_Wall_A_Communications.svg',commSvg);
      $('printPointB').onclick=()=>window.print();
    }
  }
  function refresh(){
    ensureUI();const data=current();if(!data)return;
    $('pointBPrice').textContent=money(data.bom.client);
  }
  function boot(){
    ensureUI();
    let n=0;const timer=setInterval(()=>{n++;if(window.BizetModelRuntime?.ready){clearInterval(timer);refresh()}else if(n>120)clearInterval(timer)},100);
    window.addEventListener('bizet:modelready',refresh);window.addEventListener('bizet:resume',()=>setTimeout(refresh,250));
    document.addEventListener('click',e=>{if(e.target.closest('#workspaceTools,.r8-variant-controls,.r8-module-card'))setTimeout(refresh,350)},true);
  }
  window.BizetPointB={version:VERSION,prices:PRICES,detailsFor,buildBOM,moduleDrawing,communicationsDrawing,productionModuleSheet,refresh};
  window.BizetPointBOriginalDocs=()=>showReport('docs');
  boot();
})();