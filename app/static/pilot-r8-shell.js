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
      html,body,button,a,input,select,textarea,label{font-family:"Century Gothic",CenturyGothic,AppleGothic,Arial,sans-serif!important}
      .topbar .settings-wrap,.setup-topbar .settings-wrap,.r8-topbar .settings-wrap{right:18px!important}
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
        color:transparent;background:
          linear-gradient(110deg,#4b4b4b 0%,#f8f8f8 15%,#777 27%,#fff 42%,#5f5f5f 55%,#e9e9e9 70%,#696969 82%,#f6f6f6 100%);
        background-size:260% 100%;-webkit-background-clip:text;background-clip:text;
        text-shadow:0 10px 36px rgba(255,255,255,.08),0 18px 70px rgba(0,0,0,.7);
        filter:drop-shadow(0 1px 0 rgba(255,255,255,.34));
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
        font-size:clamp(58px,8vw,102px);font-weight:610;letter-spacing:-.06em;
        animation:r8FlyOS var(--r8-duration) cubic-bezier(.16,.82,.18,1) both;
      }
      .r8-flash{
        position:absolute;left:50%;top:50%;width:12px;height:12px;border-radius:50%;
        transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;filter:blur(4px);
        box-shadow:0 0 30px 12px rgba(255,255,255,.9),0 0 110px 42px rgba(160,190,255,.28);
        animation:r8Flash var(--r8-duration) ease-out both;pointer-events:none;
      }
      @keyframes r8FlyZ{
        0%{transform:translate(-50%,-72vh) scale(.94);opacity:0;filter:blur(10px)}
        26%{opacity:1}
        50%,78%{transform:translate(-50%,-112px) scale(1);opacity:1;filter:blur(0)}
        100%{transform:translate(-50%,-112px) scale(1.01);opacity:0}
      }
      @keyframes r8FlyB{
        0%{transform:translate(-145vw,-42%) scale(.92);opacity:0;filter:blur(14px)}
        24%{opacity:1}
        50%,78%{transform:translate(-64%,-42%) scale(1);opacity:1;filter:blur(0)}
        100%{transform:translate(-64%,-42%) scale(1.01);opacity:0}
      }
      @keyframes r8FlyOS{
        0%{transform:translate(145vw,-42%) scale(.92);opacity:0;filter:blur(14px)}
        24%{opacity:1}
        50%,78%{transform:translate(155px,-42%) scale(1);opacity:1;filter:blur(0)}
        100%{transform:translate(155px,-42%) scale(1.01);opacity:0}
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
          0%{transform:translate(-50%,-70vh) scale(.92);opacity:0;filter:blur(10px)}
          24%{opacity:1}
          50%,78%{transform:translate(-50%,-82px);opacity:1;filter:blur(0)}
          100%{transform:translate(-50%,-82px);opacity:0}
        }
        @keyframes r8FlyB{
          0%{transform:translate(-145vw,-42%) scale(.9);opacity:0;filter:blur(12px)}
          24%{opacity:1}
          50%,78%{transform:translate(-63%,-42%);opacity:1;filter:blur(0)}
          100%{transform:translate(-63%,-42%);opacity:0}
        }
        @keyframes r8FlyOS{
          0%{transform:translate(145vw,-42%) scale(.9);opacity:0;filter:blur(12px)}
          24%{opacity:1}
          50%,78%{transform:translate(102px,-42%);opacity:1;filter:blur(0)}
          100%{transform:translate(102px,-42%);opacity:0}
        }
      }
      @media(prefers-reduced-motion:reduce){
        .r8-word-z,.r8-word-b,.r8-word-os,.r8-flash{animation-duration:.35s!important}
      }
    `;
    document.head.appendChild(s);
  }

  let playing=false;
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
      setTimeout(()=>{overlay.remove();playing=false;resolve()},effective+80);
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