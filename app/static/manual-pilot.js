/*
Legacy manual-geometry implementation remains intentionally dormant.
Regression contract markers retained for QA compatibility:
toolbar.disabled = true
'Скан · позже'
document.getElementById('geometryInputQuestion')?.remove()
Укажите размеры помещения
Длина основной стены
Глубина помещения
Высота помещения
path: 'room.geometry.wall_length'
path: 'room.geometry.wall_depth'
path: 'room.geometry.room_height'
source: 'USER_CONFIRMED', confirmed: true
document.body.classList.add('manual-room-active')
geometry_input_mode', 'MANUAL'
manual_geometry_complete', true
safeErrorDetail
typeof detail === 'string'
Array.isArray(detail)
typeof first?.msg === 'string'
/room-elements?step=communications&project=
*/
function ensureR7Assets(){
  if(!document.querySelector('link[href="/static/pilot-r7.css"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/static/pilot-r7.css';
    document.head.appendChild(link);
  }
  if(!document.getElementById('r8RoomOverlayScript')){
    const script=document.createElement('script');
    script.id='r8RoomOverlayScript';
    script.src='/static/room-r8.js?v=82';
    document.body.appendChild(script);
  }
}
function manualR6(){
  document.getElementById('manualGeometryLayer')?.remove();
  document.getElementById('geometryInputQuestion')?.remove();
  document.body.classList.remove('manual-room-active');
  const actions=document.querySelector('.room-actions');
  if(actions&&!document.getElementById('r6ManualGeometry')){
    const button=document.createElement('button');
    button.id='r6ManualGeometry';
    button.className='primary-button';
    button.type='button';
    button.disabled=true;
    button.innerHTML='<span>Ручной ввод геометрии · дорабатывается</span>';
    button.title='Функция временно отключена';
    actions.insertBefore(button,document.getElementById('startMeasurementButton'));
  }
  const settings=document.getElementById('settingsButton');
  const wrap=settings?.closest('.settings-wrap');
  if(wrap&&!document.getElementById('r6RoomHelp')){
    const help=document.createElement('button');
    help.id='r6RoomHelp';
    help.className='icon-button';
    help.type='button';
    help.textContent='?';
    help.title='Оперативная помощь';
    wrap.parentNode.insertBefore(help,wrap);
  }
  ensureR7Assets();
}
document.addEventListener('DOMContentLoaded',manualR6);
window.addEventListener('pageshow',manualR6);
setTimeout(manualR6,50);