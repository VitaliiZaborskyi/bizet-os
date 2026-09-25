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