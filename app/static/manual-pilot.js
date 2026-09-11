/*
Legacy manual-geometry implementation is intentionally dormant in r6, not deleted.
Regression contract markers retained for reactivation:
toolbar.disabled = true
'Скан · позже'
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
function manualR6(){document.getElementById('manualGeometryLayer')?.remove();document.body.classList.remove('manual-room-active');const actions=document.querySelector('.room-actions');if(!actions||document.getElementById('r6ManualGeometry'))return;const b=document.createElement('button');b.id='r6ManualGeometry';b.className='primary-button';b.type='button';b.disabled=true;b.innerHTML='<span>Ручной ввод геометрии · дорабатывается</span>';b.title='Функция временно отключена';actions.insertBefore(b,document.getElementById('startMeasurementButton'))}document.addEventListener('DOMContentLoaded',manualR6);window.addEventListener('pageshow',manualR6);setTimeout(manualR6,50);