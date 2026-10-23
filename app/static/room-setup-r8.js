(()=> {
  const KEY='bizet_os_project_id',CONFIG='bizet_pilot_configuration',LANG='bizet_os_language';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||sessionStorage.getItem(KEY)||localStorage.getItem(KEY)||'';
  if(projectId){sessionStorage.setItem(KEY,projectId);localStorage.setItem(KEY,projectId)}
  const configuration=sessionStorage.getItem(CONFIG)||localStorage.getItem(CONFIG)||'WALL_CENTER';
  const labels={
    ru:{WALL_CENTER:'Линейная · по центру',WALL_LEFT:'Линейная · слева',WALL_RIGHT:'Линейная · справа',L_LEFT:'Г-образная · крыло слева',L_RIGHT:'Г-образная · крыло справа',U_SHAPE:'П-образная'},
    en:{WALL_CENTER:'Linear · centered',WALL_LEFT:'Linear · left',WALL_RIGHT:'Linear · right',L_LEFT:'L-shape · left wing',L_RIGHT:'L-shape · right wing',U_SHAPE:'U-shape'}
  };
  const copy={
    ru:{kicker:'БАЗОВАЯ ГЕОМЕТРИЯ',title:'Три размера —<br>и строим кухню.',intro:'Укажите только основные габариты помещения. Остальные параметры вы будете менять уже рядом с готовой моделью.',length:'Длина основной стены',depth:'Глубина помещения',height:'Высота помещения',configuration:'Конфигурация',create:'Создать базовый вариант',missing:'Проект не найден. Вернитесь на первый экран.',invalid:'Проверьте три размера помещения.',save:'Не удалось сохранить данные'},
    en:{kicker:'BASE GEOMETRY',title:'Three dimensions —<br>and we build the kitchen.',intro:'Enter only the main room dimensions. You will refine the remaining parameters next to the generated model.',length:'Main wall length',depth:'Room depth',height:'Room height',configuration:'Configuration',create:'Create base variant',missing:'Project not found. Return to the first screen.',invalid:'Check the three room dimensions.',save:'Could not save data'}
  };
  const language=()=>localStorage.getItem(LANG)==='en'?'en':'ru';
  const t=key=>copy[language()][key]||copy.ru[key]||key;
  function applyLanguage(){
    const lang=language();document.documentElement.lang=lang;
    document.querySelector('.setup-kicker').textContent=t('kicker');
    document.querySelector('.setup-copy h1').innerHTML=t('title');
    document.querySelector('.setup-copy>p:last-child').textContent=t('intro');
    const fieldLabels=document.querySelectorAll('.setup-field>label');
    if(fieldLabels[0])fieldLabels[0].textContent=t('length');
    if(fieldLabels[1])fieldLabels[1].textContent=t('depth');
    if(fieldLabels[2])fieldLabels[2].textContent=t('height');
    const configLabel=document.querySelector('.setup-config>span');if(configLabel)configLabel.textContent=t('configuration');
    $('configurationLabel').textContent=labels[lang][configuration]||configuration;
    $('createBaseModel').querySelector('span').textContent=t('create');
    $('setupBack').setAttribute('aria-label',lang==='en'?'Back':'Назад');
    $('settingsButton')?.setAttribute('aria-label',lang==='en'?'Settings':'Настройки');
  }
  applyLanguage();
  window.addEventListener('bizet:languagechange',applyLanguage);

  async function request(url,options={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    if(!r.ok){let p={};try{p=await r.json()}catch(_){};throw new Error(typeof p.detail==='string'?p.detail:t('save'))}
    return r.json();
  }
  function measured(p,key,fallback){const v=p?.room?.geometry?.[key]?.value_mm;return Number.isFinite(v)&&v>0?v:fallback}
  async function load(){
    if(!projectId)return;
    try{
      const p=await request('/api/v1.1/projects/'+encodeURIComponent(projectId));
      $('roomLength').value=measured(p,'wall_length',6000);
      $('roomDepth').value=measured(p,'wall_depth',4200);
      $('roomHeight').value=measured(p,'room_height',2800);
    }catch(_){}
  }
  async function patch(path,value){
    return request('/api/v1.1/projects/'+encodeURIComponent(projectId),{method:'PATCH',body:JSON.stringify({path,value:Math.round(value),source:'USER_ENTERED',confirmed:false,reason:'R8 minimal geometry before base model'})});
  }

  $('setupBack').onclick=()=>history.back();
  $('createBaseModel').onclick=async()=>{
    const L=Math.round(Number($('roomLength').value)),D=Math.round(Number($('roomDepth').value)),H=Math.round(Number($('roomHeight').value)),err=$('setupError'),btn=$('createBaseModel');
    if(!projectId){err.textContent=t('missing');err.hidden=false;return}
    if(!Number.isFinite(L)||L<1000||!Number.isFinite(D)||D<1000||!Number.isFinite(H)||H<2000){err.textContent=t('invalid');err.hidden=false;return}
    err.hidden=true;btn.disabled=true;
    try{
      await patch('room.geometry.wall_length',L);
      await patch('room.geometry.wall_depth',D);
      await patch('room.geometry.room_height',H);
      await window.BizetTransition?.play({duration:2500});
      location.assign('/workspace?project='+encodeURIComponent(projectId));
    }catch(e){err.textContent=e.message;err.hidden=false;btn.disabled=false}
  };
  load();
})();