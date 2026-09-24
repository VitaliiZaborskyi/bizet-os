(()=> {
  const PRODUCERS=[
    {id:'BIZET_FURNITURE',name:'BIZET Furniture',multiplier:2.0,rating:'4.9',aboutRu:'Базовый производитель BIZET OS.',aboutEn:'Default BIZET OS manufacturing profile.'},
    {id:'ZABORSKY_KITCHENS',name:'Zaborsky Kitchens',multiplier:2.3,rating:'4.8',aboutRu:'Демонстрационный профиль кухонного производства.',aboutEn:'Demo kitchen manufacturer profile.'},
    {id:'BIZET_SOFA',name:'BIZET Sofa',multiplier:1.8,rating:'4.7',aboutRu:'Демонстрационный профиль мебельного производства.',aboutEn:'Demo furniture manufacturer profile.'},
    {id:'NORDLINE_INTERIORS',name:'Nordline Interiors',multiplier:2.6,rating:'4.6',aboutRu:'Демонстрационный профиль интерьерного производства.',aboutEn:'Demo interior manufacturer profile.'}
  ];
  const ROLE_KEY='bizet_os_demo_role',PRODUCER_KEY='bizet_os_producer',LANG_KEY='bizet_os_language';
  const $=id=>document.getElementById(id);
  const lang=()=>String(localStorage.getItem(LANG_KEY)||document.documentElement.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';
  const role=()=>localStorage.getItem(ROLE_KEY)||'CUSTOMER';
  const producer=()=>PRODUCERS.find(p=>p.id===(localStorage.getItem(PRODUCER_KEY)||'BIZET_FURNITURE'))||PRODUCERS[0];
  const money=n=>new Intl.NumberFormat(lang()==='en'?'en-US':'ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' грн';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const t=(ru,en)=>lang()==='en'?en:ru;

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
    $('pointBReport').innerHTML=`<p class="r8-pointb-kicker">ZABORSKY · BIZET OS</p><h2>${t('Ваш проект кухни','Your kitchen project')}</h2><div class="r9-customer-price"><span>${esc(d.p.name)}</span><strong>${money(d.clientPrice)}</strong></div>${warning}<h3>${t('Спецификация кухни','Kitchen specification')}</h3>${specTable(d.modules)}<div class="r8-doc-actions"><button id="r9ProposalPrint">${t('Коммерческое предложение / PDF','Commercial proposal / PDF')}</button></div><p class="r9-muted">${t('Себестоимость, внутренние коэффициенты, крепёж и технологические операции доступны только производителю/администратору.','Internal cost, coefficients, fasteners and manufacturing operations are restricted to manufacturer/admin access.')}</p>`;
    $('pointBDialog').showModal();
    $('r9ProposalPrint').onclick=printProposal;
  }
  function showManufacturer(){
    const d=data();if(!d)return;
    const rows=d.details.map(x=>`<tr><td>${x.code}</td><td>${esc(x.name)}</td><td>${x.length} × ${x.width}</td><td>${x.qty}</td><td>${esc(x.material)}</td></tr>`).join('');
    $('pointBReport').innerHTML=`<p class="r8-pointb-kicker">BIZET OS · MANUFACTURER</p><h2>${t('Производственная спецификация','Manufacturing specification')}</h2><p><strong>${esc(d.p.name)}</strong> · ${t('клиентская цена','client price')}: ${money(d.clientPrice)}</p><div class="r8-table-wrap"><table><thead><tr><th>Code</th><th>${t('Деталь','Part')}</th><th>mm</th><th>Qty</th><th>${t('Материал','Material')}</th></tr></thead><tbody>${rows}</tbody></table></div><div class="r8-doc-actions"><button id="r9FullDocs">${t('Полный производственный комплект','Full production package')}</button></div>`;
    $('pointBDialog').showModal();
    $('r9FullDocs').onclick=()=>window.BizetPointBOriginalDocs?.();
  }
  function showAdmin(){
    const d=data();if(!d)return;
    const rows=d.bom.rows.map(r=>`<tr><td>${esc(r.group)}</td><td>${esc(r.item)}</td><td>${Number(r.qty).toFixed(2)}</td><td>${money(r.rate)}</td><td>${money(r.total)}</td><td>${esc(r.note||'')}</td></tr>`).join('');
    $('pointBReport').innerHTML=`<p class="r8-pointb-kicker">BIZET OS · ADMIN</p><h2>Cost / Pricing</h2><div class="r8-price-grid"><div><span>COST</span><strong>${money(d.bom.cost)}</strong></div><div><span>${esc(d.p.name)} · ×${d.p.multiplier.toFixed(1)}</span><strong>${money(d.clientPrice)}</strong></div></div><div class="r8-table-wrap"><table><thead><tr><th>Group</th><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    $('pointBDialog').showModal();
  }
  function printProposal(){
    const d=data();if(!d)return;
    const spec=moduleSpec(d.modules);
    const rows=spec.map(m=>`<tr><td>${m.no}</td><td>${esc(m.name)}</td><td>${m.w} × ${m.h} × ${m.d}</td><td>1</td></tr>`).join('');
    const today=new Intl.DateTimeFormat(lang()==='en'?'en-GB':'ru-RU').format(new Date());
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>BIZET Commercial Proposal</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:"Century Gothic",CenturyGothic,Arial,sans-serif;color:#171717;margin:0}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #171717;padding-bottom:12px;margin-bottom:24px}.logo small{display:block;letter-spacing:.28em;font-size:8px}.logo strong{font-size:28px}.logo i{font-style:normal;color:#2f68ff}h1{font-size:23px;margin:0 0 8px}p{font-size:11px;line-height:1.5}.price{font-size:25px;font-weight:700;margin:16px 0}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #cfcfcf;padding:8px;font-size:10px;text-align:left}th{background:#f1f1ef}.footer{margin-top:28px;border-top:1px solid #ccc;padding-top:12px;color:#666}.badge{font-size:9px;letter-spacing:.1em;color:#666}</style></head><body><header><div class="logo"><small>ZABORSKY</small><strong>BIZET <i>OS</i></strong></div><div class="badge">${today}</div></header><h1>${t('Коммерческое предложение','Commercial Proposal')}</h1><p>${t('Проект подготовлен системой BIZET OS. Производитель:','Project prepared by BIZET OS. Manufacturer:')} <strong>${esc(d.p.name)}</strong></p><div class="price">${money(d.clientPrice)}</div><table><thead><tr><th>№</th><th>${t('Изделие / модуль','Item / module')}</th><th>W × H × D, mm</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table><p>${t('Предложение является предварительным до окончательной инженерной и производственной проверки.','Proposal is preliminary until final engineering and manufacturing validation.')}</p><div class="footer"><strong>BIZET OS</strong><br>${t('Контактные данные BIZET подставляются из профиля компании.','BIZET contact details are supplied from the company profile.')}</div><script>window.onload=()=>setTimeout(()=>window.print(),150)</script></body></html>`;
    const w=window.open('','_blank','noopener,noreferrer');if(w){w.document.write(html);w.document.close();}
  }
  function refresh(){
    ensureUI();const d=data();if(!d)return;
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
  window.BizetOwnerBusiness={refresh,producers:PRODUCERS,role,producer};
  boot();
})();