(()=> {
  const THEME_KEY='bizet_os_theme';
  const initialTheme=localStorage.getItem(THEME_KEY)||'dark';
  document.documentElement.dataset.theme=initialTheme;
  if(!localStorage.getItem(THEME_KEY)) localStorage.setItem(THEME_KEY,initialTheme);

  function ensureAppMeta(){
    if(!document.querySelector('link[rel="manifest"]')){
      const link=document.createElement('link');link.rel='manifest';link.href='/static/manifest.webmanifest';document.head.appendChild(link);
    }
    const metas=[
      ['mobile-web-app-capable','yes'],
      ['apple-mobile-web-app-capable','yes'],
      ['apple-mobile-web-app-status-bar-style','black-translucent'],
      ['apple-mobile-web-app-title','BIZET OS']
    ];
    metas.forEach(([name,content])=>{if(!document.querySelector('meta[name="'+name+'"]')){const m=document.createElement('meta');m.name=name;m.content=content;document.head.appendChild(m)}});
    if(!document.querySelector('link[rel="apple-touch-icon"]')){const i=document.createElement('link');i.rel='apple-touch-icon';i.href='/static/bizet-app-icon.svg';document.head.appendChild(i)}
    const standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
    document.documentElement.classList.toggle('bizet-standalone',!!standalone);
  }
  ensureAppMeta();

  let hiddenAt=0,lastResume=0,resumeTimer=0;
  function signalResume(reason){
    if(document.visibilityState==='hidden')return;
    const now=Date.now();
    if(now-lastResume<700)return;
    lastResume=now;
    clearTimeout(resumeTimer);
    resumeTimer=setTimeout(()=>window.dispatchEvent(new CustomEvent('bizet:resume',{detail:{reason,hidden_ms:hiddenAt?Math.max(0,Date.now()-hiddenAt):0}})),70);
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')hiddenAt=Date.now();else signalResume('visibility')});
  window.addEventListener('pageshow',event=>signalResume(event.persisted?'bfcache':'pageshow'));
  window.addEventListener('focus',()=>{if(hiddenAt&&Date.now()-hiddenAt>1500)signalResume('focus')});


  const BACKGROUND_KEY='bizet_os_background';
  const BACKGROUNDS=[
    {id:'BIZET_BLUE',name:'BIZET Blue',tone:'dark',css:'radial-gradient(circle at 18% 12%,rgba(47,124,255,.58),transparent 31%),radial-gradient(circle at 82% 78%,rgba(30,73,145,.42),transparent 34%),linear-gradient(145deg,#07111f 0%,#10294d 46%,#06101d 100%)'},
    {id:'GRAPHITE',name:'Graphite',tone:'dark',css:'radial-gradient(circle at 76% 14%,rgba(150,154,164,.20),transparent 30%),radial-gradient(circle at 20% 82%,rgba(82,87,96,.28),transparent 32%),linear-gradient(150deg,#101113,#2d3035 52%,#141517 100%)'},
    {id:'ARCTIC',name:'Arctic',tone:'light',css:'radial-gradient(circle at 15% 20%,rgba(124,184,255,.34),transparent 30%),radial-gradient(circle at 82% 68%,rgba(210,232,255,.78),transparent 35%),linear-gradient(145deg,#f8fbff,#e7f1fb 52%,#dce9f6)'},
    {id:'AURORA',name:'Aurora',tone:'dark',css:'radial-gradient(circle at 18% 70%,rgba(46,226,195,.30),transparent 34%),radial-gradient(circle at 72% 22%,rgba(117,77,255,.40),transparent 36%),radial-gradient(circle at 88% 78%,rgba(47,124,255,.34),transparent 32%),linear-gradient(145deg,#061218,#14142a 52%,#07111f)'},
    {id:'SAND',name:'Sand',tone:'light',css:'radial-gradient(circle at 18% 18%,rgba(255,255,255,.74),transparent 30%),radial-gradient(circle at 82% 78%,rgba(178,137,90,.20),transparent 34%),linear-gradient(145deg,#f3eadc,#ddc9ad 52%,#eee3d3)'},
    {id:'DEEP_NIGHT',name:'Deep Night',tone:'dark',css:'radial-gradient(circle at 50% 12%,rgba(47,124,255,.22),transparent 28%),radial-gradient(circle at 78% 70%,rgba(61,76,115,.20),transparent 32%),linear-gradient(160deg,#01040a,#07101f 52%,#02050b)'}
  ];
  function wallpaperById(id){return BACKGROUNDS.find(x=>x.id===id)||BACKGROUNDS[0]}
  function ensureWallpaperStyle(){
    if(document.getElementById('bizetWallpaperStyle'))return;
    const style=document.createElement('style');style.id='bizetWallpaperStyle';style.textContent=`
      html{min-height:100%;background:#07111f}
      body{min-height:100%;background-image:var(--bizet-wallpaper)!important;background-color:var(--bizet-wallpaper-base,#07111f)!important;background-attachment:fixed!important;background-size:cover!important;background-position:center!important}
      .app-shell,.r8-shell{background:transparent!important}
      .bizet-background-field{display:block;padding:10px 0 4px;border-top:1px solid var(--line,rgba(127,127,127,.2));margin-top:8px}
      .bizet-background-label{display:block;color:var(--muted,var(--r8-muted,#777));font-size:13px;margin-bottom:9px}
      .bizet-background-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      .bizet-background-choice{position:relative;height:50px;border:2px solid transparent;border-radius:12px;cursor:pointer;padding:0;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22),0 3px 10px rgba(0,0,0,.12)}
      .bizet-background-choice[aria-pressed="true"]{border-color:#2f7cff;box-shadow:0 0 0 2px rgba(47,124,255,.20),inset 0 0 0 1px rgba(255,255,255,.28)}
      .bizet-background-choice span{position:absolute;left:7px;right:7px;bottom:5px;color:#fff;font-size:9px;font-weight:750;text-shadow:0 1px 4px rgba(0,0,0,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .r10-workspace-settings-panel{width:min(330px,calc(100vw - 24px));z-index:150}
      @media(max-width:620px){.bizet-background-grid{grid-template-columns:repeat(2,1fr)}}
    `;document.head.appendChild(style);
  }
  function syncWallpaperButtons(id){document.querySelectorAll('[data-bizet-background]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bizetBackground===id)))}
  function applyWallpaper(id,{syncTheme=false}={}){
    const preset=wallpaperById(id);
    document.documentElement.dataset.bizetBackground=preset.id;
    document.documentElement.style.setProperty('--bizet-wallpaper',preset.css);
    document.documentElement.style.setProperty('--bizet-wallpaper-base',preset.tone==='light'?'#e8edf3':'#07111f');
    localStorage.setItem(BACKGROUND_KEY,preset.id);
    syncWallpaperButtons(preset.id);
    if(syncTheme){
      const theme=preset.tone;
      document.documentElement.dataset.theme=theme;
      localStorage.setItem(THEME_KEY,theme);
      const selects=[document.getElementById('themeSelect'),document.getElementById('workspaceThemeSelect')].filter(Boolean);
      selects.forEach(sel=>{sel.value=theme;sel.dispatchEvent(new Event('change',{bubbles:true}))});
      window.dispatchEvent(new CustomEvent('bizet:themechange',{detail:{theme,source:'background'}}));
    }
  }
  function pickerMarkup(){
    const selected=localStorage.getItem(BACKGROUND_KEY)||'BIZET_BLUE';
    return '<div class="bizet-background-grid">'+BACKGROUNDS.map(p=>'<button class="bizet-background-choice" type="button" data-bizet-background="'+p.id+'" aria-pressed="'+String(p.id===selected)+'" title="'+p.name+'" style="background:'+p.css.replace(/"/g,'&quot;')+'"><span>'+p.name+'</span></button>').join('')+'</div>';
  }
  function bindPicker(host){
    if(!host||host.dataset.bizetWallpaperReady==='1')return;
    host.dataset.bizetWallpaperReady='1';
    host.innerHTML='<div class="bizet-background-field"><span class="bizet-background-label">'+((document.getElementById('languageSelect')?.value||document.documentElement.lang)==='en'?'Background':'Фон')+'</span>'+pickerMarkup()+'</div>';
    host.querySelectorAll('[data-bizet-background]').forEach(btn=>btn.addEventListener('click',()=>applyWallpaper(btn.dataset.bizetBackground,{syncTheme:true})));
  }
  function ensureWallpaperUI(){
    ensureWallpaperStyle();
    applyWallpaper(localStorage.getItem(BACKGROUND_KEY)||'BIZET_BLUE');
    const startPanel=document.getElementById('settingsPanel');
    if(startPanel&&!startPanel.querySelector('.bizet-background-host')){
      const host=document.createElement('div');host.className='bizet-background-host';
      const themeField=document.getElementById('themeSelect')?.closest('.settings-field');
      if(themeField)themeField.insertAdjacentElement('afterend',host);else startPanel.appendChild(host);
      bindPicker(host);
      document.getElementById('languageSelect')?.addEventListener('change',()=>{host.dataset.bizetWallpaperReady='0';bindPicker(host)});
    }
    const workspacePanel=document.getElementById('workspaceSettingsPanel');
    if(workspacePanel){
      bindPicker(document.getElementById('workspaceBackgroundHost'));
      const select=document.getElementById('workspaceThemeSelect');
      if(select){
        select.value=document.documentElement.dataset.theme||initialTheme;
        select.addEventListener('change',()=>{document.documentElement.dataset.theme=select.value;localStorage.setItem(THEME_KEY,select.value);window.dispatchEvent(new CustomEvent('bizet:themechange',{detail:{theme:select.value,source:'settings'}}))});
      }
      const button=document.getElementById('settingsButton');
      if(button&&!button.dataset.bizetSettingsBound){
        button.dataset.bizetSettingsBound='1';
        button.addEventListener('click',event=>{event.stopPropagation();const open=workspacePanel.hidden;workspacePanel.hidden=!open;button.setAttribute('aria-expanded',String(open))});
        workspacePanel.addEventListener('click',event=>event.stopPropagation());
        document.addEventListener('click',()=>{workspacePanel.hidden=true;button.setAttribute('aria-expanded','false')});
        document.addEventListener('keydown',event=>{if(event.key==='Escape'){workspacePanel.hidden=true;button.setAttribute('aria-expanded','false')}});
      }
    }
  }
  ensureWallpaperUI();

  if(window.BizetTransition) return;
  if(!document.getElementById('r8SplashStyle')){
    const s=document.createElement('style');
    s.id='r8SplashStyle';
    s.textContent=`
      #backButton[hidden]{display:none!important}
      .topbar .settings-wrap,.setup-topbar .settings-wrap,.r8-topbar .settings-wrap{
        position:absolute!important;right:18px!important;top:50%!important;transform:translateY(-50%)!important;
        margin:0!important;display:flex!important;align-items:center!important;gap:6px!important;z-index:70!important
      }
      @media(max-width:820px){.topbar .settings-wrap,.setup-topbar .settings-wrap,.r8-topbar .settings-wrap{right:10px!important}}
      .settings-panel{
        background:#fff!important;background-color:#fff!important;opacity:1!important;
        backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
      }
      html[data-theme="dark"] .settings-panel{background:#242422!important;background-color:#242422!important}
      .r8-transition{
        position:fixed;inset:0;z-index:99999;background:
          radial-gradient(circle at 50% 46%,rgba(255,255,255,.045),transparent 28%),
          radial-gradient(circle at 50% 48%,#132746 0%,#091423 34%,#030912 72%,#02060c 100%);
        overflow:hidden;display:grid;place-items:center;opacity:1;transition:opacity .34s ease;
      }
      .r8-transition.is-leaving{opacity:0;pointer-events:none}
      .r8-transition-stage{position:relative;width:100%;height:100%;display:grid;place-items:center;perspective:1200px}
      .r8-word{
        position:absolute;left:50%;top:50%;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
        color:#f5f7fb;background:none;
        text-shadow:0 8px 30px rgba(54,114,196,.10),0 18px 70px rgba(0,0,0,.72);
        filter:none;
      }
      .r8-word-z{
        font-size:clamp(22px,2.3vw,34px);font-weight:650;letter-spacing:.38em;
        animation:r8FlyZ var(--r8-duration) cubic-bezier(.16,.82,.18,1) both;
      }
      .r8-word-b{
        font-size:clamp(88px,13vw,164px);font-weight:820;letter-spacing:-.072em;
        animation:r8FlyB var(--r8-duration) cubic-bezier(.16,.82,.18,1) both;
      }
      .r8-word-os{
        font-size:clamp(58px,8vw,102px);font-weight:700;letter-spacing:-.06em;color:#2f7cff;
        text-shadow:0 0 30px rgba(47,124,255,.20),0 18px 70px rgba(0,0,0,.72);
        animation:r8FlyOS var(--r8-duration) cubic-bezier(.16,.82,.18,1) both;
      }
      .r8-flash{
        position:absolute;left:50%;top:50%;width:12px;height:12px;border-radius:50%;
        transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;filter:blur(4px);
        box-shadow:0 0 30px 12px rgba(255,255,255,.9),0 0 110px 42px rgba(160,190,255,.28);
        animation:r8Flash var(--r8-duration) ease-out both;pointer-events:none;
      }
      @keyframes r8FlyZ{
        0%{transform:translate(-150vw,-42vh) rotate(-8deg) scale(.82);opacity:0;background-position:220% 0;filter:blur(15px)}
        24%{opacity:1}
        50%,76%{transform:translate(-50%,-112px) rotate(0) scale(1);opacity:1;background-position:-35% 0;filter:blur(0)}
        100%{transform:translate(-50%,-112px) scale(1.02);opacity:0;background-position:-120% 0}
      }
      @keyframes r8FlyB{
        0%{transform:translate(145vw,-50%) rotateY(-18deg) scale(.82);opacity:0;background-position:240% 0;filter:blur(18px)}
        25%{opacity:1}
        50%,76%{transform:translate(-64%,-42%) rotateY(0) scale(1);opacity:1;background-position:-20% 0;filter:blur(0)}
        100%{transform:translate(-64%,-42%) scale(1.02);opacity:0;background-position:-125% 0}
      }
      @keyframes r8FlyOS{
        0%{transform:translate(-50%,145vh) rotateX(16deg) scale(.72);opacity:0;background-position:220% 0;filter:blur(16px)}
        26%{opacity:1}
        50%,76%{transform:translate(155px,-42%) rotateX(0) scale(1);opacity:1;background-position:-10% 0;filter:blur(0)}
        100%{transform:translate(155px,-42%) scale(1.02);opacity:0;background-position:-130% 0}
      }
      @keyframes r8Flash{
        0%,61%{opacity:0;transform:translate(-50%,-50%) scale(.1)}
        67%{opacity:1;transform:translate(-50%,-50%) scale(22)}
        75%{opacity:.23;transform:translate(-50%,-50%) scale(62)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(90)}
      }
      @media(max-width:620px){
        .r8-word-z{font-size:18px;letter-spacing:.29em}
        .r8-word-b{font-size:78px}
        .r8-word-os{font-size:48px}
        @keyframes r8FlyZ{
          0%{transform:translate(-145vw,-38vh) rotate(-7deg) scale(.8);opacity:0;background-position:220% 0;filter:blur(14px)}
          24%{opacity:1}
          50%,76%{transform:translate(-50%,-82px);opacity:1;background-position:-35% 0;filter:blur(0)}
          100%{transform:translate(-50%,-82px);opacity:0;background-position:-120% 0}
        }
        @keyframes r8FlyB{
          0%{transform:translate(140vw,-50%) scale(.8);opacity:0;background-position:240% 0;filter:blur(16px)}
          25%{opacity:1}
          50%,76%{transform:translate(-63%,-42%);opacity:1;background-position:-20% 0;filter:blur(0)}
          100%{transform:translate(-63%,-42%);opacity:0;background-position:-125% 0}
        }
        @keyframes r8FlyOS{
          0%{transform:translate(-50%,140vh) scale(.7);opacity:0;background-position:220% 0;filter:blur(16px)}
          26%{opacity:1}
          50%,76%{transform:translate(102px,-42%);opacity:1;background-position:-10% 0;filter:blur(0)}
          100%{transform:translate(102px,-42%);opacity:0;background-position:-130% 0}
        }
      }
      @media(prefers-reduced-motion:reduce){
        .r8-word-z,.r8-word-b,.r8-word-os,.r8-flash{animation-duration:.35s!important}
      }
    `;
    document.head.appendChild(s);
  }

  let playing=false;
  const SPLASH_FAILSAFE_MS=4200;
  function play({duration=2500}={}){
    if(playing)return Promise.resolve();
    playing=true;
    return new Promise(resolve=>{
      const overlay=document.createElement('div');
      overlay.className='r8-transition';
      overlay.style.setProperty('--r8-duration',duration+'ms');
      overlay.innerHTML='<div class="r8-transition-stage"><div class="r8-word r8-word-z">ZABORSKY</div><div class="r8-word r8-word-b">BIZET</div><div class="r8-word r8-word-os">OS</div><div class="r8-flash"></div></div>';
      document.body.appendChild(overlay);
      const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      const effective=reduced?420:duration;
      setTimeout(()=>overlay.classList.add('is-leaving'),Math.max(220,effective-300));
      const finish=()=>{if(!overlay.isConnected)return;overlay.remove();playing=false;resolve()};
      setTimeout(finish,effective+80);
      setTimeout(finish,Math.max(SPLASH_FAILSAFE_MS,effective+600));
    });
  }
  window.BizetTransition={play};
  try{
    if(sessionStorage.getItem('bizet_route_splash')==='1'){
      sessionStorage.removeItem('bizet_route_splash');
      requestAnimationFrame(()=>play({duration:3400}).finally(()=>document.documentElement.classList.remove('r10-route-loading')));
      setTimeout(()=>document.documentElement.classList.remove('r10-route-loading'),SPLASH_FAILSAFE_MS+500);
    }
  }catch(_){document.documentElement.classList.remove('r10-route-loading')}

  function forceFirstBackHidden(){
    const grid=document.getElementById('choiceGrid'),back=document.getElementById('backButton');
    if(!grid||!back)return;
    const first=grid.dataset.kind==='object_type';
    back.hidden=first;
    if(first)back.style.setProperty('display','none','important');else back.style.removeProperty('display');
  }
  function installBackGuard(){
    const grid=document.getElementById('choiceGrid');
    if(!grid)return;
    forceFirstBackHidden();
    new MutationObserver(forceFirstBackHidden).observe(grid,{attributes:true,attributeFilter:['data-kind'],childList:true});
  }

  const boot=()=>{
    installBackGuard();
    if(location.pathname==='/')play({duration:2500});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();