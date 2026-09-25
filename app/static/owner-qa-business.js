(()=> {
  const PRODUCERS=[
    {id:'BIZET_FURNITURE',name:'BIZET Furniture',multiplier:2.0,rating:'4.9',aboutRu:'Базовый производитель BIZET OS.',aboutEn:'Default BIZET OS manufacturing profile.'},
    {id:'ZABORSKY_KITCHENS',name:'Zaborsky Kitchens',multiplier:2.3,rating:'4.8',aboutRu:'Демонстрационный профиль кухонного производства.',aboutEn:'Demo kitchen manufacturer profile.'},
    {id:'BIZET_SOFA',name:'BIZET Sofa',multiplier:1.8,rating:'4.7',aboutRu:'Демонстрационный профиль мебельного производства.',aboutEn:'Demo furniture manufacturer profile.'},
    {id:'NORDLINE_INTERIORS',name:'Nordline Interiors',multiplier:2.6,rating:'4.6',aboutRu:'Демонстрационный профиль интерьерного производства.',aboutEn:'Demo interior manufacturer profile.'}
  ];
  const ROLE_KEY='bizet_os_demo_role',PRODUCER_KEY='bizet_os_producer',LANG_KEY='bizet_os_language';
  const PROJECT_KEY='bizet_os_project_id',COUNTRY_KEY='bizet_order_country_code',CITY_KEY='bizet_order_city_code';
  let identityCache=null;
  const $=id=>document.getElementById(id);
  const lang=()=>String(localStorage.getItem(LANG_KEY)||document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
  const role=()=>localStorage.getItem(ROLE_KEY)||'CUSTOMER';
  const producer=()=>PRODUCERS.find(p=>p.id===(localStorage.getItem(PRODUCER_KEY)||'BIZET_FURNITURE'))||PRODUCERS[0];
  const money=n=>new Intl.NumberFormat(lang()==='en'?'en-US':'ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' грн';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const t=(ru,en)=>lang()==='en'?en:ru;
  const projectId=()=>new URLSearchParams(location.search).get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  const identityRef=(identity=identityCache)=>{if(!identity)return'';return `${identity.order_no||identity.session_id||''} /${identity.order_stage||'A'}`};
  function updateIdentityBadge(identity=identityCache){const el=$('orderIdentityBadge');if(!el||!identity)return;el.textContent=identityRef(identity);el.hidden=false}
  async function loadIdentity(){const id=projectId();if(!id)return null;try{const r=await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}`,{cache:'no-store'});if(!r.ok)return null;const p=await r.json();identityCache=p.identity||null;updateIdentityBadge();return identityCache}catch(_){return null}}
  async function ensureOrderIdentity(){const id=projectId();if(!id)return null;if(identityCache?.order_no){updateIdentityBadge();return identityCache}const country=(localStorage.getItem(COUNTRY_KEY)||'UA').toUpperCase(),city=(localStorage.getItem(CITY_KEY)||'ODS').toUpperCase();const r=await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}/activate-order`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({country_code:country,city_code:city})});if(!r.ok)throw new Error(t('Не удалось присвоить номер заказа','Could not assign order number'));const p=await r.json();identityCache=p.identity||null;updateIdentityBadge();return identityCache}
  async function confirmStageC(){const id=projectId();if(!id)return;await ensureOrderIdentity();const r=await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}/order-stage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:'C'})});if(!r.ok)throw new Error(t('Не удалось подтвердить заказ','Could not confirm order'));const p=await r.json();identityCache=p.identity||identityCache;updateIdentityBadge();refresh()}

  function data(){
    const rt=window.BizetModelRuntime,pb=window.BizetPointB;if(!rt?.ready||!pb)return null;
    const modules=rt.getModules(),details=pb.detailsFor(modules),bom=pb.buildBOM(modules,details),p=producer();
    return{rt,pb,modules,details,bom,p,clientPrice:bom.cost*p.multiplier};
  }
  function moduleSpec(modules){
    return modules.map(m=>{
      const run=m.wall==='A'?m.w:m.d,depth=m.wall==='A'?m.d:m.w;
      return{no:m.number,name:m.label||m.kind,w:Math.round(run),h:Math.round(m.h),d:Math.round(depth)};
    }).sort((a,b)=>a.no-b.no);
  }
  function specTable(modules){
    const rows=moduleSpec(modules).map(m=>`<tr><td>${m.no}</td><td>${esc(m.name)}</td><td>${m.w} × ${m.h} × ${m.d}</td></tr>`).join('');
    return `<div class="r9-client-table"><table><thead><tr><th>№</th><th>${t('Модуль','Module')}</th><th>W × H × D, mm</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function producerCards(){
    const active=producer().id;
    return PRODUCERS.map(p=>`<button class="r9-producer-card ${p.id===active?'is-active':''}" data-producer="${p.id}" type="button"><span class="r9-demo">DEMO PROFILE</span><strong>${esc(p.name)}</strong><span>★ ${p.rating}</span><small>${esc(lang()==='en'?p.aboutEn:p.aboutRu)}</small></button>`).join('');
  }
  function ensureUI(){
    if($('r9ProducerButton'))return;
    const host=$('pointBFinalActions'); if(!host)return;
    const producerBtn=document.createElement('button');producerBtn.id='r9ProducerButton';producerBtn.type='button';producerBtn.textContent=t('Производитель','Manufacturer');
    host.appendChild(producerBtn);
    const roleTag=document.createElement('button');roleTag.id='r9RoleButton';roleTag.className='r9-role-tag';roleTag.type='button';host.appendChild(roleTag);
    const dialog=document.createElement('dialog');dialog.id='r9ProducerDialog';dialog.className='r9-business-dialog';
    dialog.innerHTML=`<div class="r9-business-card"><button class="r9-business-close" type="button">×</button><p class="r9-kicker">BIZET OS · MANUFACTURER HUB</p><h2>${t('Выберите производителя','Choose manufacturer')}</h2><p class="r9-muted">${t('В пилоте профили демонстрационные. Цена пересчитывается по настройкам выбранной компании.','Profiles are demo-only in this pilot. Price recalculates using the selected company profile.')}</p><div class="r9-producer-grid">${producerCards()}</div><hr><label class="r9-role-demo"><span>${t('Демо-режим доступа','Demo access role')}</span><select id="r9RoleSelect"><option value="CUSTOMER">${t('Покупатель','Customer')}</option><option value="MANUFACTURER">${t('Производитель','Manufacturer')}</option><option value="ADMIN">Admin</option></select></label></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.r9-business-close').onclick=()=>dialog.close();
    dialog.querySelectorAll('[data-producer]').forEach(b=>b.onclick=()=>{localStorage.setItem(PRODUCER_KEY,b.dataset.producer);dialog.close();refresh()});
    $('r9RoleSelect').value=role();$('r9RoleSelect').onchange=e=>{localStorage.setItem(ROLE_KEY,e.target.value);dialog.close();refresh()};
    producerBtn.onclick=()=>{dialog.querySelectorAll('[data-producer]').forEach(b=>b.classList.toggle('is-active',b.dataset.producer===producer().id));$('r9RoleSelect').value=role();dialog.showModal()};
  }
  function showCustomer(){
    const d=data();if(!d)return;
    const warning=d.bom.unpriced?.length? `<p class="r8-pointb-warning">${t('Часть сервисных тарифов ещё не включена и требует подтверждения.','Some service tariffs are not included yet and require confirmation.')}</p>`:'';
    $('pointBReport').innerHTML=`<p class="r8-pointb-kicker">ZABORSKY · BIZET OS${identityCache?' · '+esc(identityRef()):''}</p><h2>${t('Ваш проект кухни','Your kitchen project')}</h2><div class="r9-customer-price"><span>${esc(d.p.name)}</span><strong>${money(d.clientPrice)}</strong></div>${warning}<h3>${t('Спецификация кухни','Kitchen specification')}</h3>${specTable(d.modules)}<div class="r8-doc-actions"><button id="r9ProposalPrint">${t('Коммерческое предложение / PDF','Commercial proposal / PDF')}</button></div><p class="r9-muted">${t('Себестоимость, внутренние коэффициенты, крепёж и технологические операции доступны только производителю/администратору.','Internal cost, coefficients, fasteners and manufacturing operations are restricted to manufacturer/admin access.')}</p>`;
    $('pointBDialog').showModal();
    $('r9ProposalPrint').onclick=()=>printProposal().catch(error=>alert(error.message));
  }
  function showManufacturer(){
    const d=data();if(!d)return;
    const rows=d.details.map(x=>`<tr><td>${x.code}</td><td>${esc(x.name)}</td><td>${x.length} × ${x.width}</td><td>${x.qty}</td><td>${esc(x.material)}</td></tr>`).join('');
    $('pointBReport').innerHTML=`<p class="r8-pointb-kicker">BIZET OS · MANUFACTURER${identityCache?' · '+esc(identityRef()):''}</p><h2>${t('Производственная спецификация','Manufacturing specification')}</h2><p><strong>${esc(d.p.name)}</strong> · ${t('клиентская цена','client price')}: ${money(d.clientPrice)}</p><div class="r8-table-wrap"><table><thead><tr><th>Code</th><th>${t('Деталь','Part')}</th><th>mm</th><th>Qty</th><th>${t('Материал','Material')}</th></tr></thead><tbody>${rows}</tbody></table></div><div class="r8-doc-actions"><button id="r9FullDocs">${t('Полный производственный комплект','Full production package')}</button></div>`;
    $('pointBDialog').showModal();
    $('r9FullDocs').onclick=()=>window.BizetPointBOriginalDocs?.();
  }
  function showAdmin(){
    const d=data();if(!d)return;
    const rows=d.bom.rows.map(r=>`<tr><td>${esc(r.group)}</td><td>${esc(r.item)}</td><td>${Number(r.qty).toFixed(2)}</td><td>${money(r.rate)}</td><td>${money(r.total)}</td><td>${esc(r.note||'')}</td></tr>`).join('');
    $('pointBReport').innerHTML=`<p class="r8-pointb-kicker">BIZET OS · ADMIN${identityCache?' · '+esc(identityRef()):''}</p><h2>Cost / Pricing</h2><div class="r8-price-grid"><div><span>COST</span><strong>${money(d.bom.cost)}</strong></div><div><span>${esc(d.p.name)} · ×${d.p.multiplier.toFixed(1)}</span><strong>${money(d.clientPrice)}</strong></div></div><div class="r8-table-wrap"><table><thead><tr><th>Group</th><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div><div class="r8-doc-actions"><button id="r10ConfirmSale" type="button">${t('Подтвердить заказ · C','Confirm sale · C')}</button></div>`;
    $('pointBDialog').showModal();
    $('r10ConfirmSale').onclick=()=>confirmStageC().catch(error=>alert(error.message));
  }
  function configurationLabel(code){
    const labels={
      WALL_CENTER:[ 'Прямая · по центру','Linear · centered' ],
      WALL_LEFT:[ 'Прямая · от левого края','Linear · from left' ],
      WALL_RIGHT:[ 'Прямая · от правого края','Linear · from right' ],
      L_LEFT:[ 'Г-образная · крыло слева','L-shaped · left return' ],
      L_RIGHT:[ 'Г-образная · крыло справа','L-shaped · right return' ],
      U_SHAPE:[ 'П-образная','U-shaped' ],
      CUSTOM:[ 'Индивидуальная конфигурация','Custom configuration' ]
    };
    const pair=labels[code]||[code||'—',code||'—'];return lang()==='en'?pair[1]:pair[0];
  }
  function runSummary(d){
    const walls={};
    d.modules.filter(m=>m.level!=='upper').forEach(m=>{
      const wall=m.wall||'A',start=wall==='A'?Number(m.x)||0:Number(m.y)||0,size=wall==='A'?Number(m.w)||0:Number(m.d)||0;
      if(!walls[wall])walls[wall]={min:start,max:start+size};else{walls[wall].min=Math.min(walls[wall].min,start);walls[wall].max=Math.max(walls[wall].max,start+size)}
    });
    const cfg=d.rt.getConfiguration(),order=cfg==='L_LEFT'?['A','B']:cfg==='L_RIGHT'?['A','C']:cfg==='U_SHAPE'?['A','B','C']:['A'];
    return order.filter(w=>walls[w]).map(w=>`${t('Стена','Wall')} ${w}: ${Math.round(walls[w].max-walls[w].min)} mm`).join(' · ');
  }
  function proposalFeatures(d){
    const drawers=d.modules.some(m=>m.kind==='DRAWERS'),uppers=d.modules.some(m=>m.level==='upper'),handles=d.bom.rows.some(r=>/ручк|handle/i.test(String(r.item||'')));
    const lines=[
      t('Корпус — ЛДСП 18 мм','Carcass — 18 mm laminated board'),
      t('Фасады — по текущей комплектации Category I','Fronts — current Category I specification'),
      t('Столешница — 38 мм','Worktop — 38 mm'),
      drawers?t('Выдвижные ящики — по текущей конфигурации','Drawers — according to current configuration'):null,
      uppers?t('Верхние модули — по текущей 3D-компоновке','Upper cabinets — according to current 3D layout'):null,
      handles?t('Ручки и крепёж — согласно спецификации','Handles and fasteners — according to specification'):null
    ].filter(Boolean);
    return lines;
  }
  function proposalSnapshot(){
    try{return document.getElementById('modelCanvas')?.toDataURL('image/png')||''}catch(_){return''}
  }
  // DEFERRED: one-sheet comparison across multiple manufacturers and/or alternative kitchen configurations.
  async function printProposal(){
    const d=data();if(!d)return;
    const w=window.open('','_blank');
    if(!w)throw new Error(t('Браузер заблокировал окно коммерческого предложения','Browser blocked the commercial proposal window'));
    w.document.write('<!doctype html><title>BIZET OS</title><body style="font-family:Arial,sans-serif;padding:24px">BIZET OS · preparing document…</body>');
    const identity=await ensureOrderIdentity();
    const today=new Intl.DateTimeFormat(lang()==='en'?'en-GB':'ru-RU').format(new Date());
    const cfg=configurationLabel(d.rt.getConfiguration()),runs=runSummary(d),features=proposalFeatures(d),snapshot=proposalSnapshot(),orderRef=identityRef(identity);
    const featureHtml=features.map(x=>`<div class="feature">- ${esc(x)}</div>`).join('');
    const imageHtml=snapshot?`<img class="kitchen-shot" src="${snapshot}" alt="3D kitchen">`:`<div class="image-placeholder">${t('3D модель кухни','Kitchen 3D model')}</div>`;
    const unit=t('компл.','set'),price=money(d.clientPrice);
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>BIZET Commercial Proposal</title><style>
      @page{size:A4;margin:8mm}
      *{box-sizing:border-box}html,body{margin:0;padding:0;color:#171717;background:#fff}
      body{font-family:"Century Gothic",CenturyGothic,"Avenir Next","Trebuchet MS",Arial,sans-serif;font-size:9.5px}
      .page{width:100%;min-height:270mm;display:flex;flex-direction:column}
      header{display:flex;justify-content:space-between;align-items:flex-end;padding:0 2mm 4mm;border-bottom:1.4px solid #4b4b4b}
      .logo-box{width:58mm;height:18mm;border-radius:2.5mm;background:#07111f;display:flex;align-items:center;justify-content:center;overflow:hidden}.logo-box img{display:block;width:52mm;height:auto}
      .meta{text-align:right;font-size:8px;line-height:1.5;color:#5a5a5a}.meta strong{color:#171717;font-size:10px}
      h1{font-size:15px;text-align:center;margin:4mm 0 2.5mm;letter-spacing:.02em}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      th,td{border:1px solid #555;padding:2.2mm 1.6mm;vertical-align:middle}
      th{background:#5c5c5c;color:#fff;font-size:8px;font-weight:700;text-align:center}
      td{text-align:center}.item{text-align:left}.features{text-align:left;line-height:1.5}.feature{margin:0 0 1.2mm}.feature:last-child{margin-bottom:0}
      .kitchen-shot{display:block;width:100%;height:40mm;object-fit:contain;background:#f0efeb}.image-placeholder{height:40mm;display:grid;place-items:center;background:#f0efeb;color:#777}
      .item strong{display:block;font-size:12px;margin-bottom:2mm}.item .sub{font-size:8.5px;line-height:1.5;color:#555}
      .num{font-size:11px;background:#5c5c5c;color:#fff;font-weight:800}.price{font-weight:700;font-size:10px;white-space:nowrap}
      .total-row td{border-top:1.8px solid #333;font-size:10px}.total-label{text-align:right;font-weight:700}.total{font-size:12px;font-weight:800}
      .notes{margin-top:5mm;padding-top:3mm;border-top:1px solid #aaa;font-size:8px;line-height:1.55;color:#4d4d4d}
      .notes p{margin:0 0 1.5mm}.notes strong{color:#171717}
      .footer{margin-top:auto;padding-top:4mm;border-top:1px solid #aaa;display:flex;justify-content:space-between;gap:8mm;font-size:7.5px;color:#666}
      @media print{.page{min-height:auto}}
    </style></head><body><div class="page">
      <header><div class="logo-box"><img src="/static/bizet-os-zaborsky-document-logo.svg" alt="ZABORSKY BIZET OS"></div><div class="meta"><strong>${t('Коммерческое предложение','Commercial Proposal')}</strong><br>${esc(orderRef)}<br>${today}<br>${t('Производитель','Manufacturer')}: ${esc(d.p.name)}</div></header>
      <h1>${t('Список изделий','List of products')}</h1>
      <table>
        <colgroup><col style="width:4%"><col style="width:13%"><col style="width:21%"><col style="width:34%"><col style="width:7%"><col style="width:5%"><col style="width:8%"><col style="width:8%"></colgroup>
        <thead><tr><th>№</th><th>${t('Изделие','Item')}</th><th>${t('Изображение / схема','Image / scheme')}</th><th>${t('Комплектация','Specification')}</th><th>${t('Ед.изм.','Unit')}</th><th>${t('Кол-во','Qty')}</th><th>${t('Цена','Price')}</th><th>${t('Сумма','Amount')}</th></tr></thead>
        <tbody>
          <tr>
            <td class="num">1</td>
            <td class="item"><strong>${t('Кухня','Kitchen')}</strong><div class="sub">${esc(cfg)}<br>${esc(runs)}</div></td>
            <td>${imageHtml}</td>
            <td class="features">${featureHtml}</td>
            <td>${unit}</td><td>1</td><td class="price">${price}</td><td class="price">${price}</td>
          </tr>
          <tr class="total-row"><td colspan="7" class="total-label">${t('Всего','Total')}</td><td class="total">${price}</td></tr>
        </tbody>
      </table>
      <div class="notes">
        <p><strong>${t('Примечание:','Note:')}</strong> ${t('предложение сформировано по текущей конфигурации BIZET OS и является предварительным до окончательной инженерной и производственной проверки.','this proposal is generated from the current BIZET OS configuration and remains preliminary until final engineering and manufacturing validation.')}</p>
        <p>${t('Детальная разбивка по модулям, деталям, фурнитуре и крепежу вынесена в отдельную спецификацию.','The module, part, hardware and fastener breakdown is provided in a separate specification.')}</p>
      </div>
      <div class="footer"><span>BIZET OS · ${t('проектирование и комплектация мебели','furniture design and specification')}</span><span>${esc(d.p.name)}</span></div>
    </div><script>window.onload=()=>setTimeout(()=>window.print(),260)</script></body></html>`;
    w.document.open();w.document.write(html);w.document.close();
  }
  function refresh(){
    ensureUI();loadIdentity();const d=data();if(!d)return;
    const r=role(),p=d.p;
    $('pointBPrice').textContent=money(d.clientPrice);
    const label=$('pointBFinalActions')?.querySelector('.r8-final-price span');if(label)label.textContent=t('Предварительная цена ','Estimated price ')+p.name;
    $('r9RoleButton').textContent=r==='ADMIN'?'ADMIN':r==='MANUFACTURER'?t('Производитель','Manufacturer'):t('Покупатель','Customer');
    $('pointBPriceButton').textContent=t('Итоговая стоимость','Final price');
    $('pointBDocsButton').textContent=r==='CUSTOMER'?t('Коммерческое предложение','Commercial proposal'):t('Комплект документов','Document package');
    $('pointBPriceButton').onclick=()=>r==='ADMIN'?showAdmin():r==='MANUFACTURER'?showManufacturer():showCustomer();
    $('pointBDocsButton').onclick=()=>r==='ADMIN'?showAdmin():r==='MANUFACTURER'?showManufacturer():showCustomer();
  }
  function boot(){
    let tries=0,timer=setInterval(()=>{tries++;if(window.BizetPointB&&window.BizetModelRuntime?.ready){clearInterval(timer);refresh()}else if(tries>160)clearInterval(timer)},100);
    window.addEventListener('bizet:modelready',()=>setTimeout(refresh,80));
    window.addEventListener('bizet:resume',()=>setTimeout(refresh,300));
    document.addEventListener('click',e=>{if(e.target.closest('#workspaceTools,.r8-variant-controls,.r8-module-card'))setTimeout(refresh,400)},true);
  }
  window.BizetOwnerBusiness={refresh,producers:PRODUCERS,role,producer,loadIdentity,ensureOrderIdentity,identityRef:()=>identityRef(),getIdentity:()=>identityCache};
  boot();
})();