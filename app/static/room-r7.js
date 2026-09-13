(()=>{
 const actions=document.querySelector('.room-actions');
 const old=document.getElementById('startMeasurementButton');
 if(!actions||!old)return;
 const clone=old.cloneNode(true);
 old.replaceWith(clone);
 clone.id='startMeasurementButton';
 const label=clone.querySelector('#measurementLabel')||clone.querySelector('span');
 if(label)label.textContent='Выбор бытовой техники';
 clone.addEventListener('click',e=>{e.preventDefault();window.location.assign('/guided')});
 const wrap=document.createElement('div');wrap.className='r7-room-actions';
 const extra=document.createElement('button');extra.type='button';extra.className='r7-secondary-button';extra.innerHTML='<span>Элементы стен</span><span aria-hidden="true">+</span>';
 extra.title='Окна, выступы, ниши, колонны';
 extra.addEventListener('click',()=>window.location.assign('/room-elements'));
 const parent=clone.parentNode;parent.insertBefore(wrap,clone);wrap.appendChild(extra);wrap.appendChild(clone);
 const scopeTitle=document.getElementById('scopeTitle');const scopeCopy=document.getElementById('scopeCopy');
 if(scopeTitle)scopeTitle.textContent='Данные помещения готовы';
 if(scopeCopy)scopeCopy.textContent='Можно перейти к технике или дополнительно уточнить элементы каждой стены.';
})();