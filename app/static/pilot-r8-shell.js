(()=> {
  if(window.BizetTransition) return;
  if(!document.getElementById('r8SplashStyle')){
    const s=document.createElement('style');
    s.id='r8SplashStyle';
    s.textContent=`
      #backButton[hidden]{display:none!important}
      .settings-panel{
        background:#ffffff!important;
        background-color:#ffffff!important;
        opacity:1!important;
        backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }
      html[data-theme="dark"] .settings-panel{
        background:#242422!important;
        background-color:#242422!important;
      }
      .r8-transition{
        position:fixed;inset:0;z-index:99999;background:#101010;overflow:hidden;
        display:grid;place-items:center;opacity:1;transition:opacity .34s ease;
      }
      .r8-transition.is-leaving{opacity:0;pointer-events:none}
      .r8-transition-stage{position:relative;width:100%;height:100%;display:grid;place-items:center}
      .r8-word{position:absolute;color:#fff;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}
      .r8-word-z{font-size:clamp(13px,1.5vw,18px);font-weight:560;letter-spacing:.42em;animation:r8FlyZ var(--r8-duration) cubic-bezier(.18,.78,.2,1) both}
      .r8-word-b{font-size:clamp(46px,8vw,94px);font-weight:790;letter-spacing:-.065em;animation:r8FlyB var(--r8-duration) cubic-bezier(.18,.78,.2,1) both}
      .r8-word-os{font-size:clamp(28px,5vw,58px);font-weight:520;letter-spacing:-.05em;color:#5d82ff;animation:r8FlyOS var(--r8-duration) cubic-bezier(.18,.78,.2,1) both}
      .r8-flash{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;filter:blur(5px);animation:r8Flash var(--r8-duration) ease-out both;pointer-events:none}
      @keyframes r8FlyZ{
        0%{transform:translate(-145vw,-38vh) rotate(-7deg);opacity:0;filter:blur(12px)}
        34%{opacity:1}
        48%,76%{transform:translate(-50%,-86px) rotate(0);opacity:1;filter:blur(0)}
        100%{transform:translate(-50%,-86px);opacity:0}
      }
      @keyframes r8FlyB{
        0%{transform:translate(125vw,-50%);opacity:0;filter:blur(16px)}
        38%{opacity:1}
        50%,76%{transform:translate(-58%,-50%);opacity:1;filter:blur(0)}
        100%{transform:translate(-58%,-50%);opacity:0}
      }
      @keyframes r8FlyOS{
        0%{transform:translate(-50%,120vh) scale(.75);opacity:0;filter:blur(14px)}
        38%{opacity:1}
        50%,76%{transform:translate(118px,-47%) scale(1);opacity:1;filter:blur(0)}
        100%{transform:translate(118px,-47%);opacity:0}
      }
      @keyframes r8Flash{
        0%,58%{opacity:0;transform:translate(-50%,-50%) scale(.1)}
        66%{opacity:.96;transform:translate(-50%,-50%) scale(18)}
        76%{opacity:.18;transform:translate(-50%,-50%) scale(45)}
        100%{opacity:0;transform:translate(-50%,-50%) scale(70)}
      }
      @media(max-width:600px){
        .r8-word-os{font-size:35px}
        @keyframes r8FlyOS{
          0%{transform:translate(-50%,120vh) scale(.75);opacity:0;filter:blur(14px)}
          38%{opacity:1}
          50%,76%{transform:translate(82px,-47%) scale(1);opacity:1;filter:blur(0)}
          100%{transform:translate(82px,-47%);opacity:0}
        }
      }
      @media(prefers-reduced-motion:reduce){
        .r8-word-z,.r8-word-b,.r8-word-os,.r8-flash{animation-duration:.3s!important}
      }
    `;
    document.head.appendChild(s);
  }

  let playing=false;
  function play({duration=2400}={}){
    if(playing) return Promise.resolve();
    playing=true;
    return new Promise(resolve=>{
      const overlay=document.createElement('div');
      overlay.className='r8-transition';
      overlay.style.setProperty('--r8-duration',duration+'ms');
      overlay.innerHTML='<div class="r8-transition-stage"><div class="r8-word r8-word-z">ZABORSKY</div><div class="r8-word r8-word-b">BIZET</div><div class="r8-word r8-word-os">OS</div><div class="r8-flash"></div></div>';
      document.body.appendChild(overlay);
      const reduced=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const effective=reduced?360:duration;
      setTimeout(()=>overlay.classList.add('is-leaving'),Math.max(200,effective-320));
      setTimeout(()=>{overlay.remove();playing=false;resolve()},effective+60);
    });
  }
  window.BizetTransition={play};

  function forceFirstBackHidden(){
    const grid=document.getElementById('choiceGrid');
    const back=document.getElementById('backButton');
    if(!grid||!back)return;
    const first=grid.dataset.kind==='object_type';
    back.hidden=first;
    if(first) back.style.setProperty('display','none','important');
    else back.style.removeProperty('display');
  }
  function installBackGuard(){
    const grid=document.getElementById('choiceGrid');
    if(!grid)return;
    forceFirstBackHidden();
    new MutationObserver(forceFirstBackHidden).observe(grid,{attributes:true,attributeFilter:['data-kind'],childList:true});
  }

  const launch=()=>{installBackGuard();play({duration:2400})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
})();