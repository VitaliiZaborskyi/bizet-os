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
  const money=n=>window.BizetPointB?.formatMoney?.(n)||new Intl.NumberFormat(lang()==='en'?'en-US':'ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' UAH';
  const currencyCode=()=>String(window.BizetPointB?.displayCurrency?.()||window.BizetModelRuntime?.getInputs?.().display_currency||'UAH').toUpperCase();
  const offerMoney=n=>money(n)+' '+currencyCode();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const t=(ru,en)=>lang()==='en'?en:ru;
  const projectId=()=>new URLSearchParams(location.search).get('project')||sessionStorage.getItem(PROJECT_KEY)||localStorage.getItem(PROJECT_KEY)||'';
  const identityRef=(identity=identityCache)=>{
    if(!identity)return'';
    let ref=String(identity.order_no||identity.session_id||'');
    const match=ref.match(/^([A-Z]{2,3})-([A-Z]{2,3})-(\d{2})\.(\d{2})\.(\d{3})$/);
    if(match)ref=`${match[1]}-${match[2]}-20${match[3]}.${match[4]}.${match[5]}`;
    return `${ref} /${identity.order_stage||'A'}`;
  };
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
      const display=window.BizetModelRuntime?.displayModuleName?.(m)||m.label||m.kind;
      return{no:m.number,name:display,w:Math.round(run),h:Math.round(m.h),d:Math.round(depth)};
    }).sort((a,b)=>a.no-b.no);
  }
  function specTable(modules){
    const rows=moduleSpec(modules).map(m=>`<tr><td>${m.no}</td><td>${esc(m.name)}</td><td>${m.w} × ${m.h} × ${m.d}</td></tr>`).join('');
    return `<div class="r9-client-table"><table><thead><tr><th>№</th><th>${t('Модуль','Module')}</th><th>W × H × D, mm</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function producerCards(baseCost=null){
    const active=producer().id;
    return PRODUCERS.map(p=>`<button class="r9-producer-card ${p.id===active?'is-active':''}" data-producer="${p.id}" type="button"><span class="r9-demo">DEMO PROFILE</span><strong>${esc(p.name)}</strong><span>★ ${p.rating}${baseCost!==null?' · '+money(baseCost*p.multiplier):''}</span><small>${esc(lang()==='en'?p.aboutEn:p.aboutRu)}</small></button>`).join('');
  }
  async function patchProject(path,value,reason){
    const id=projectId();if(!id)return null;
    const r=await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,value,reason})});
    if(!r.ok)throw new Error(t('Не удалось сохранить данные проекта','Could not save project data'));
    return r.json();
  }
  function commerceDialog(){
    let dialog=$('r10CommerceDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='r10CommerceDialog';dialog.className='r10-commerce-dialog';
    dialog.innerHTML='<div class="r10-commerce-card"><button class="r10-commerce-close" type="button" aria-label="Закрыть">×</button><div id="r10CommerceBody"></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('.r10-commerce-close').onclick=()=>dialog.close();
    return dialog;
  }
  function ensureUI(){
    commerceDialog();
    const oldProducer=$('r9ProducerButton'),oldRole=$('r9RoleButton');oldProducer?.remove();oldRole?.remove();
  }
  async function transitionThen(fn){
    const dialog=commerceDialog();if(dialog.open)dialog.close();
    if(window.BizetTransition?.play)await window.BizetTransition.play({duration:1450});
    fn();
  }
  function openCommerce(html){
    const dialog=commerceDialog();$('r10CommerceBody').innerHTML=html;if(!dialog.open)dialog.showModal();
  }
  function visualizationPayload(d){
    const visual=d.rt.getVisual?.()||{},inputs=d.rt.getInputs?.()||{},room=d.rt.getRoom?.()||{};
    return{
      schema:'BIZET_VISUALIZATION_PAYLOAD_V1',
      geometry:{configuration:d.rt.getConfiguration(),room,modules:d.modules.map(m=>({id:m.id,no:m.number,kind:m.kind,wall:m.wall,x:m.x,y:m.y,z:m.z,w:m.w,d:m.d,h:m.h,facade_count:m.facade_count,drawer_count:m.drawer_count}))},
      materials:{room:visual.room_surface_materials||{},furniture:visual.furniture_materials||{},palette:visual.r8_palette||''},
      appliances:d.modules.filter(m=>['FRIDGE','DISHWASHER','COOKTOP','TALL_OVEN','UPPER_HOOD'].includes(m.kind)).map(m=>({kind:m.kind,wall:m.wall,x:m.x,y:m.y,w:m.w,d:m.d,h:m.h})),
      camera:{view:'current_engineering_view'},
      display_currency:inputs.display_currency||'UAH'
    };
  }
  function visualizationMasterPrompt(d){
    const payload=visualizationPayload(d);
    return `Create a premium photorealistic kitchen visualization from the supplied BIZET OS engineering scene.
STRICT GEOMETRY LOCK: preserve the exact room proportions, cabinet count, cabinet widths/heights/depths, appliance positions, worktop geometry, wall positions and camera composition. Do not redesign, add, remove, widen, narrow or relocate any module.
Use the supplied facade, carcass, worktop, floor, wall and ceiling materials faithfully. Preserve openings and visible appliance types.
Lighting: realistic high-end interior photography, natural soft daylight plus plausible practical lighting, physically believable reflections and shadows, no fantasy styling.
The render is for a commercial proposal, so the final image must look finished and aspirational while remaining geometrically identical to the engineering model.
No people, no text, no labels, no watermarks, no extra decor that hides furniture geometry.
BIZET_VISUALIZATION_PAYLOAD:
${JSON.stringify(payload)}`;
  }
  async function sendProposalEmail(recipient,d,options={}){
    const id=projectId();if(!id)throw new Error('project_not_found');
    const includeProposal=options.includeProposal!==false,includeApproval=options.includeApproval===true;
    const payload={
      recipient,
      price:offerMoney(d.clientPrice),
      currency:currencyCode(),
      manufacturer:d.p.name,
      configuration:configurationLabel(d.rt.getConfiguration()),
      runs:runSummary(d),
      features:proposalFeatures(d),
      include_proposal:includeProposal,
      include_approval_drawings:includeApproval,
      visualization_data_url:proposalSnapshot(),
      approval_svg_pages:includeApproval?(d.pb.approvalSheets?.(d.modules,d.rt.getRoom(),identityRef())||[]):[]
    };
    const r=await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}/proposal/send`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok){
      if(body.detail==='MAIL_PROVIDER_NOT_CONFIGURED')throw new Error(t('Почтовый маршрут готов, но на Render ещё нужны RESEND_API_KEY и подтверждённый RESEND_FROM. Ответы клиента будут направляться на cdbbizet@gmail.com.','Mail delivery is ready, but Render still needs RESEND_API_KEY and a verified RESEND_FROM. Client replies are routed to cdbbizet@gmail.com.'));
      throw new Error(typeof body.detail==='string'?body.detail:t('Не удалось отправить OFFER','Could not send OFFER'));
    }
    return body;
  }
  async function downloadOfferDocument(kind,d){
    const id=projectId();if(!id)throw new Error('project_not_found');
    const payload={
      recipient:'',
      price:offerMoney(d.clientPrice),
      currency:currencyCode(),
      manufacturer:d.p.name,
      configuration:configurationLabel(d.rt.getConfiguration()),
      runs:runSummary(d),
      features:proposalFeatures(d),
      include_proposal:kind==='proposal',
      include_approval_drawings:kind==='approval',
      visualization_data_url:proposalSnapshot(),
      approval_svg_pages:kind==='approval'?(d.pb.approvalSheets?.(d.modules,d.rt.getRoom(),identityRef())||[]):[]
    };
    const response=await fetch(`/api/v1.1/projects/${encodeURIComponent(id)}/offer/document/${encodeURIComponent(kind)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    if(!response.ok){
      const body=await response.json().catch(()=>({}));
      throw new Error(typeof body.detail==='string'?body.detail:t('Не удалось сформировать PDF','Could not build PDF'));
    }
    const blob=await response.blob(),disposition=response.headers.get('Content-Disposition')||'';
    const match=disposition.match(/filename="([^"]+)"/i),name=match?.[1]||(kind==='proposal'?'BIZET_OFFER.pdf':'BIZET_APPROVAL.pdf');
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }

  async function showThinkFlow(){
    const d=data();if(!d)return;
    const identity=await ensureOrderIdentity(),ref=identityRef(identity),prompt=visualizationMasterPrompt(d);
    await patchProject('commerce.proposal_status','DRAFT_READY','R10.4.3 OFFER opened');
    openCommerce(`
      <p class="r9-kicker">BIZET OS · ${esc(ref)}</p>
      <h2>${t('Скачать предложение','OFFER')}</h2>
      <p class="r9-muted">${t('Выберите пакет для клиента. КП и чертежи для согласования формируются из текущей модели.','Choose the client package. The proposal and approval drawings are generated from the current model.')}</p>
      <div class="r104-offer-docs">
        <label><input id="r104OfferProposal" type="checkbox" checked><span><strong>${t('Коммерческое предложение','Commercial proposal')}</strong><small>${t('Цена, комплектация и визуализация','Price, specification and visualization')}</small></span></label>
        <label><input id="r104OfferApproval" type="checkbox" checked><span><strong>${t('Чертежи для согласования','Approval drawings')}</strong><small>${t('План · фасад · характерные сечения','Plan · elevation · typical sections')}</small></span></label>
      </div>
      <label class="r10-commerce-field"><span>E-mail</span><input id="r10ProposalEmail" type="email" autocomplete="email" placeholder="name@example.com"></label>
      <label class="r10-commerce-field"><span>${t('Телефон / WhatsApp','Phone / WhatsApp')}</span><input id="r10ProposalPhone" type="tel" autocomplete="tel" placeholder="+380…"></label>
      <details class="r104-visualization-pilot"><summary>${t('Визуализация · PILOT PROMPT','Visualization · PILOT PROMPT')}</summary><p>${t('Промт блокирует геометрию и передаёт материалы текущего проекта. Внешний render-provider подключается отдельным ключом.','The prompt locks geometry and passes the current project materials. An external render provider requires its own connection.')}</p><button type="button" id="r104CopyVisualPrompt">${t('Скопировать промт','Copy prompt')}</button></details>
      <div class="r104-offer-actions"><button class="r10-commerce-primary" id="r104OfferDownload" type="button">${t('Скачать','Download')}</button><button class="r10-commerce-primary" id="r104OfferSend" type="button">${t('Отправить','Send')}</button></div>
      <button class="r10-commerce-secondary" id="r104OfferWhatsApp" type="button">WhatsApp · +380 97 458 7676</button>
      <p class="r10-commerce-status" id="r10ProposalStatus" hidden></p>`);
    $('r104CopyVisualPrompt').onclick=async()=>{try{await navigator.clipboard.writeText(prompt);$('r10ProposalStatus').hidden=false;$('r10ProposalStatus').textContent=t('Промт визуализации скопирован.','Visualization prompt copied.')}catch(_){$('r10ProposalStatus').hidden=false;$('r10ProposalStatus').textContent=prompt}};
    const selections=()=>({proposal:$('r104OfferProposal').checked,approval:$('r104OfferApproval').checked});
    const contact=()=>({email:String($('r10ProposalEmail').value||'').trim(),phone:String($('r10ProposalPhone').value||'').trim()});
    $('r104OfferDownload').onclick=()=>{
      const s=selections(),ct=contact(),status=$('r10ProposalStatus');
      if(!s.proposal&&!s.approval){status.hidden=false;status.textContent=t('Выберите хотя бы один документ.','Select at least one document.');return}
      if(!ct.email&&!ct.phone){status.hidden=false;status.textContent=t('Введите e-mail или телефон.','Enter an e-mail or phone number.');return}
      patchProject('commerce.contact',ct.email||ct.phone,'R10.4.2 OFFER contact').catch(()=>{});
      (async()=>{
        try{
          if(s.proposal)await downloadOfferDocument('proposal',d);
          if(s.approval)await downloadOfferDocument('approval',d);
          status.hidden=false;status.textContent=t('Документы готовы к загрузке.','Documents are ready for download.');
        }catch(error){status.hidden=false;status.textContent=error.message}
      })();
    };
    $('r104OfferSend').onclick=async()=>{
      const button=$('r104OfferSend'),s=selections(),ct=contact(),status=$('r10ProposalStatus');
      if(!s.proposal&&!s.approval){status.hidden=false;status.textContent=t('Выберите хотя бы один документ.','Select at least one document.');return}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email)){status.hidden=false;status.textContent=t('Для отправки документов укажите корректный e-mail.','Enter a valid e-mail to send the documents.');return}
      button.disabled=true;status.hidden=false;status.textContent=t('Формирую PDF и отправляю…','Building PDFs and sending…');
      try{
        await patchProject('commerce.contact',ct.email,'R10.4.2 OFFER email');
        const sent=await sendProposalEmail(ct.email,d,{includeProposal:s.proposal,includeApproval:s.approval});
        status.textContent=t(`Документы отправлены на ${ct.email}. ID: ${sent.message_id||'—'}`,`Documents sent to ${ct.email}. ID: ${sent.message_id||'—'}`);
      }catch(error){status.textContent=error.message}finally{button.disabled=false}
    };
    $('r104OfferWhatsApp').onclick=()=>{
      const ct=contact(),text=encodeURIComponent(`BIZET OS · ${ref}\nOFFER prepared${ct.phone?' · client '+ct.phone:''}`);
      window.open(`https://wa.me/380974587676?text=${text}`,'_blank','noopener,noreferrer');
    };
  }
  async function showBuyFlow(){
    const d=data();if(!d)return;
    await ensureOrderIdentity();
    await transitionThen(()=>{
      openCommerce(`<p class="r9-kicker">BIZET OS · BUY</p><h2>${t('Выберите производителя','Choose manufacturer')}</h2><p class="r9-muted">${t('DEMO PROFILE — цена пересчитывается сразу после выбора.','DEMO PROFILE — price recalculates immediately after selection.')}</p><div class="r9-producer-grid">${producerCards(d.bom.cost)}</div>`);
      $('r10CommerceBody').querySelectorAll('[data-producer]').forEach(btn=>btn.onclick=async()=>{
        localStorage.setItem(PRODUCER_KEY,btn.dataset.producer);
        await patchProject('commerce.selected_manufacturer',btn.dataset.producer,'R10.3 manufacturer selected after Buy');
        refresh();
        await transitionThen(showPaymentFlow);
      });
    });
  }
  function showPaymentFlow(){
    const d=data();if(!d)return;
    patchProject('commerce.payment_status','FORM_OPEN','R10.3 payment form opened').catch(()=>{});
    openCommerce(`<p class="r9-kicker">BIZET OS · PAYMENT</p><h2>${t('Оплата','Payment')}</h2><div class="r10-payment-summary"><span>${esc(d.p.name)}</span><strong>${money(d.clientPrice)}</strong></div><p class="r9-muted">${t('Производитель выбран. Платёжный провайдер для реальной транзакции пока не подключён к пилоту.','Manufacturer selected. A payment provider for a real transaction is not connected to this pilot yet.')}</p><label class="r10-commerce-field"><span>${t('E-mail','E-mail')}</span><input id="r10PaymentEmail" type="email" autocomplete="email"></label><label class="r10-commerce-field"><span>${t('Телефон','Phone')}</span><input id="r10PaymentPhone" type="tel" autocomplete="tel"></label><button class="r10-commerce-primary" id="r10PaymentContinue" type="button">${t('Продолжить к оплате','Continue to payment')}</button><p class="r10-commerce-status" id="r10PaymentStatus" hidden></p>`);
    $('r10PaymentContinue').onclick=async()=>{
      await patchProject('commerce.payment_status','PAYMENT_PROVIDER_REQUIRED','R10.3 payment provider gate');
      const status=$('r10PaymentStatus');status.hidden=false;status.textContent=t('PAYMENT_PROVIDER_REQUIRED — форма и маршрут готовы, реальная транзакция не выполняется.','PAYMENT_PROVIDER_REQUIRED — the form and route are ready; no real transaction is executed.');
    };
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
      t('Фасады — согласно текущей конфигурации проекта','Fronts — according to the current project configuration'),
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
  function proposalVisualization(d){
    const visual=d?.rt?.getVisual?.()||{},external=String(visual.visualization_render_url||'').trim();
    if(external)return{src:external,kind:'RENDER'};
    const snapshot=proposalSnapshot();
    return{src:snapshot,kind:'ENGINEERING_PREVIEW'};
  }
  // DEFERRED: one-sheet comparison across multiple manufacturers and/or alternative kitchen configurations.
  async function printProposal(){
    const d=data();if(!d)return;
    const w=window.open('','_blank');
    if(!w)throw new Error(t('Браузер заблокировал окно коммерческого предложения','Browser blocked the commercial proposal window'));
    w.document.write('<!doctype html><title>BIZET OS</title><body style="font-family:Arial,sans-serif;padding:24px">BIZET OS · preparing document…</body>');
    const identity=await ensureOrderIdentity();
    const today=new Intl.DateTimeFormat(lang()==='en'?'en-GB':'ru-RU').format(new Date());
    const cfg=configurationLabel(d.rt.getConfiguration()),runs=runSummary(d),features=proposalFeatures(d),visualization=proposalVisualization(d),orderRef=identityRef(identity);
    const featureHtml=features.map(x=>`<div class="feature">- ${esc(x)}</div>`).join('');
    const imageHtml=visualization.src?`<img class="kitchen-shot" src="${visualization.src}" alt="Kitchen visualization">`:`<div class="image-placeholder">${t('3D модель кухни','Kitchen 3D model')}</div>`;
    const visualLabel=visualization.kind==='RENDER'?t('Визуализация проекта','Project visualization'):t('Инженерная 3D-модель · фотореалистичный рендер подключается отдельным визуализатором','Engineering 3D model · photoreal render uses a separate visualizer');
    const unit=t('компл.','set'),price=offerMoney(d.clientPrice);
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>BIZET Commercial Proposal</title><style>
      @page{size:A4;margin:8mm}
      *{box-sizing:border-box}html,body{margin:0;padding:0;color:#171717;background:#fff}
      body{font-family:"Century Gothic",CenturyGothic,"Avenir Next","Trebuchet MS",Arial,sans-serif;font-size:9.5px}
      .page{width:100%;min-height:270mm;display:flex;flex-direction:column}
      header{display:flex;justify-content:space-between;align-items:flex-end;padding:0 2mm 4mm;border-bottom:1.4px solid #4b4b4b}
      .logo-box{width:58mm;height:18mm;border-radius:2.5mm;background:#07111f;display:flex;align-items:center;justify-content:center;overflow:hidden}.logo-box img{display:block;width:52mm;height:auto}
      .meta{text-align:right;font-size:8px;line-height:1.5;color:#5a5a5a}.meta strong{color:#171717;font-size:10px}
      h1{font-size:15px;text-align:center;margin:4mm 0 2.5mm;letter-spacing:.02em}
      .hero{margin:0 0 4mm;border:1px solid #777;overflow:hidden;background:#f0efeb}.hero .kitchen-shot{height:88mm}.hero-label{padding:1.5mm 2mm;font-size:7.5px;color:#666;background:#fff;border-top:1px solid #aaa}.price-hero{display:flex;justify-content:space-between;align-items:end;margin:0 0 4mm;padding:3mm 4mm;border:1.4px solid #333}.price-hero span{font-size:9px;color:#555}.price-hero strong{font-size:22px;line-height:1}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      th,td{border:1px solid #555;padding:2.2mm 1.6mm;vertical-align:middle}
      th{background:#5c5c5c;color:#fff;font-size:8px;font-weight:700;text-align:center}
      td{text-align:center}.item{text-align:left}.features{text-align:left;line-height:1.5}.feature{margin:0 0 1.2mm}.feature:last-child{margin-bottom:0}
      .kitchen-shot{display:block;width:100%;height:40mm;object-fit:contain;background:#f0efeb}.image-placeholder{height:88mm;display:grid;place-items:center;background:#f0efeb;color:#777}
      .item strong{display:block;font-size:12px;margin-bottom:2mm}.item .sub{font-size:8.5px;line-height:1.5;color:#555}
      .num{font-size:11px;background:#5c5c5c;color:#fff;font-weight:800}.price{font-weight:700;font-size:10px;white-space:nowrap}
      .total-row td{border-top:1.8px solid #333;font-size:10px}.total-label{text-align:right;font-weight:700}.total{font-size:12px;font-weight:800}
      .notes{margin-top:5mm;padding-top:3mm;border-top:1px solid #aaa;font-size:8px;line-height:1.55;color:#4d4d4d}
      .notes p{margin:0 0 1.5mm}.notes strong{color:#171717}
      .footer{margin-top:auto;padding-top:4mm;border-top:1px solid #aaa;display:flex;justify-content:space-between;gap:8mm;font-size:7.5px;color:#666}
      @media print{.page{min-height:auto}}
    </style></head><body><div class="page">
      <header><div class="logo-box"><img src="/static/bizet-os-zaborsky-document-logo.svg" alt="ZABORSKY BIZET OS"></div><div class="meta"><strong>${t('Коммерческое предложение','Commercial Proposal')}</strong><br>${esc(orderRef)}<br>${today}<br>${t('Производитель','Manufacturer')}: ${esc(d.p.name)}</div></header>
      <div class="hero">${imageHtml}<div class="hero-label">${t('Изображение / схема','Image / scheme')} · ${esc(visualLabel)}</div></div>
      <div class="price-hero"><span>${t('Стоимость проекта','Project price')} · ${esc(d.p.name)}</span><strong>${price}</strong></div>
      <h1>${t('Список изделий','List of products')}</h1>
      <table>
        <colgroup><col style="width:5%"><col style="width:22%"><col style="width:47%"><col style="width:8%"><col style="width:6%"><col style="width:12%"></colgroup>
        <thead><tr><th>№</th><th>${t('Изделие','Item')}</th><th>${t('Комплектация','Specification')}</th><th>${t('Ед.изм.','Unit')}</th><th>${t('Кол-во','Qty')}</th><th>${t('Сумма','Amount')}</th></tr></thead>
        <tbody>
          <tr>
            <td class="num">1</td>
            <td class="item"><strong>${t('Кухня','Kitchen')}</strong><div class="sub">${esc(cfg)}<br>${esc(runs)}</div></td>
            <td class="features">${featureHtml}</td>
            <td>${unit}</td><td>1</td><td class="price">${price}</td>
          </tr>
          <tr class="total-row"><td colspan="5" class="total-label">${t('Всего','Total')}</td><td class="total">${price}</td></tr>
        </tbody>
      </table>
      <div class="notes">
        <p><strong>${t('Примечание:','Note:')}</strong> ${t('состав и стоимость соответствуют текущей сохранённой конфигурации BIZET OS на дату формирования.','the contents and price reflect the current saved BIZET OS configuration on the date of issue.')}</p>
        <p>${t('Чертежи для согласования и производственная документация формируются отдельными документами.','Approval drawings and manufacturing documentation are generated as separate documents.')}</p>
      </div>
      <div class="footer"><span>BIZET OS · ${t('проектирование и комплектация мебели','furniture design and specification')}</span><span>${esc(d.p.name)}</span></div>
    </div><script>window.onload=()=>setTimeout(()=>window.print(),260)</script></body></html>`;
    w.document.open();w.document.write(html);w.document.close();
  }
  function refresh(){
    ensureUI();loadIdentity();const d=data();if(!d)return;
    $('pointBPrice').textContent=money(d.clientPrice);
    const label=$('pointBFinalActions')?.querySelector('.r8-final-price span');if(label)label.textContent=t('Итоговая стоимость','Final price');
    $('pointBPriceButton').textContent=t('Скачать предложение','OFFER');
    $('pointBDocsButton').textContent=t('Купить','Buy');
    $('pointBPriceButton').onclick=()=>showThinkFlow().catch(error=>alert(error.message));
    $('pointBDocsButton').onclick=()=>showBuyFlow().catch(error=>alert(error.message));
  }
  function boot(){
    let tries=0,timer=setInterval(()=>{tries++;if(window.BizetPointB&&window.BizetModelRuntime?.ready){clearInterval(timer);refresh()}else if(tries>160)clearInterval(timer)},100);
    window.addEventListener('bizet:modelready',()=>setTimeout(refresh,80));
    window.addEventListener('bizet:resume',()=>setTimeout(refresh,300));
    window.addEventListener('bizet:modelchange',()=>setTimeout(refresh,100));
    document.addEventListener('click',e=>{if(e.target.closest('#workspaceTools,.r8-variant-controls,.r8-module-card'))setTimeout(refresh,400)},true);
  }
  window.BizetOwnerBusiness={refresh,producers:PRODUCERS,role,producer,loadIdentity,ensureOrderIdentity,identityRef:()=>identityRef(),getIdentity:()=>identityCache,showBuyFlow,showThinkFlow,showPaymentFlow,visualizationPayload:()=>{const d=data();return d?visualizationPayload(d):null},visualizationMasterPrompt:()=>{const d=data();return d?visualizationMasterPrompt(d):''}};
  boot();
})();