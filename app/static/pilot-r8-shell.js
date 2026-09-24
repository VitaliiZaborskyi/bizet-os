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
      .topbar,.r8-topbar{position:sticky!important;top:0!important}
      .setup-topbar{position:relative!important}
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
      .r8-logo-piece{
        position:absolute;left:50%;top:50%;display:block;background:#f5f7fb;
        -webkit-mask-position:center;-webkit-mask-repeat:no-repeat;-webkit-mask-size:contain;
        mask-position:center;mask-repeat:no-repeat;mask-size:contain;
        filter:drop-shadow(0 8px 22px rgba(54,114,196,.12)) drop-shadow(0 18px 40px rgba(0,0,0,.58));
        animation-play-state:paused!important;
      }
      .r8-transition.is-playing .r8-logo-piece,.r8-transition.is-playing .r8-flash{animation-play-state:running!important}
      .r8-word-z{
        width:clamp(220px,27vw,338px);aspect-ratio:338/36;
        -webkit-mask-image:url('/static/brand/zaborsky_clean_mask.png');mask-image:url('/static/brand/zaborsky_clean_mask.png');
        animation:r8FlyZ var(--r8-duration) cubic-bezier(.16,.82,.18,1) both;
      }
      .r8-word-b{
        width:clamp(360px,48vw,547px);aspect-ratio:547/98;
        -webkit-mask-image:url('/static/brand/bizet_clean_mask.png');mask-image:url('/static/brand/bizet_clean_mask.png');
        animation:r8FlyB var(--r8-duration) cubic-bezier(.16,.82,.18,1) both;
      }
      .r8-word-os{
        width:clamp(176px,24vw,271px);aspect-ratio:271/99;background:#2f7cff;color:#2f7cff;
        -webkit-mask-image:url('/static/brand/os_clean_mask.png');mask-image:url('/static/brand/os_clean_mask.png');
        filter:drop-shadow(0 0 26px rgba(47,124,255,.22)) drop-shadow(0 18px 40px rgba(0,0,0,.58));
        animation:r8FlyOS var(--r8-duration) cubic-bezier(.16,.82,.18,1) both;
      }
      .r8-sound-prompt{
        position:absolute;left:50%;bottom:max(32px,env(safe-area-inset-bottom));transform:translateX(-50%);
        border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:9px 14px;background:rgba(0,0,0,.28);
        color:rgba(255,255,255,.78);font:600 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        letter-spacing:.03em;opacity:0;transition:opacity .2s ease;pointer-events:none
      }
      .r8-transition.needs-gesture .r8-sound-prompt{opacity:1}
      .r8-flash{
        position:absolute;left:50%;top:50%;width:12px;height:12px;border-radius:50%;
        transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;filter:blur(4px);
        box-shadow:0 0 30px 12px rgba(255,255,255,.9),0 0 110px 42px rgba(160,190,255,.28);
        animation:r8Flash var(--r8-duration) ease-out both;animation-play-state:paused;pointer-events:none;
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
        .r8-word-z{width:min(72vw,270px)}
        .r8-word-b{width:min(80vw,410px)}
        .r8-word-os{width:min(39vw,205px)}
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
  const SPLASH_AUDIO="data:audio/mpeg;base64,SUQzBAAAAAABCVRYWFgAAAASAAADbWFqb3JfYnJhbmQAaXNvbQBUWFhYAAAAEwAAA21pbm9yX3ZlcnNpb24ANTEyAFRYWFgAAAAkAAADY29tcGF0aWJsZV9icmFuZHMAaXNvbWlzbzJhdmMxbXA0MQBUU1NFAAAADgAAA0xhdmY2MS43LjEwMwAAAAAAAAAAAAAA//NYwAAAAAAAAAAAAEluZm8AAAAPAAAAQAAACbQAFhkZHSEhJSgoLDAwMzM3Ozs/QkJGSkpNUVFVVVlcXGBkZGdra29vc3Z2en5+gYWFiYyMkJCUmJibn5+jpqaqqq6ysrW5ub3AwMTIyMzMz9PT19ra3uLi5ubp7e3x9PT4/Pz/AAAAAExhdmM2MS4xOQAAAAAAAAAAAAAAACQEQAAAAAAAAAm0y4KP8wAAAAAAAAAAAAAA//MYxAAEaDoYAEjGBQwSMV3dwMAAAAAQAAA8P/0gAkwCgBAy//MYxAUFACoUAEpMAEpCAQCEkgaHqBrzv///61QCokiMqAv///MYxAgE6BXQABjAAP///////////93sXXd30TcIAAAAgAAC//MYxAsHWFXwAUMYACgAggf8EAQc7icHwfB8oCAIAgry6XvH//MYxAQFyJpcAZBoAABvm7uMx3wSNN/8vlND5QBk/wPV1jNM//MYxAMF4JLcAZgQAG3bGl25ZNQ7Y/ntxxs36w6zu3l4pTpO//MYxAIFEHbUAdAoAADYAxE8fL5aRSSqLA97LdavwRUQkYRY//MYxAQFqHbiQHnEKFgRg8kKrUqMTU3DzvTb3BBe4NqOGDgH//MYxAQF8HrEAMvUFBDuazagKLWvRTkVenbpsRfnB1+qRVAI//MYxAMFcHbMwMLEDBZkRUDWMOURo5FY/HSHZPsoB6JBVCIC//MYxAQEqHrYwMHKDLjtQoHSa3EJDhbp00BfXXwDIM6vgeHa//MYxAgEiHrYAHpKDEkvRUIdR9/oB/WquCpIQ9YYWxUv1Bhc//MYxAwEYHbcAMIKDEB6/qDemkBQQZ6VTnQJ+lDOUG4Vt9QT//MYxBEEeHrkwHmKDNeGAylPJbC9P1m+KL2RUMW7uUDPm7Ba//MYxBYFAHbcAHgOgBHR+B59m4+Zw/zy19XcoE/pwEKVHuGB//MYxBkEwHbkAHpODPkNZpQn2FbX+VDT9SGoNxb+WKSPQpZo//MYxB0EsHrkAHoODK4COqaPVBh3FZQrylZl6fIh0aOYoeW//MYxCEEwHbgAGCSUNHlAl//rYQJg273RrdQoOv2b/OQp26u//MYxCUE8HbkAHhOSFAPv/Kf9SowpNhy3YDg2JwOLJwEjaH2//MYxCgFyJ7cAHpUFE/KgW/yiS+69SQEdGM9QjowEDPwqMs8//MYxCcH4J8aWDBOLhA0gU7PjJlS28F1t7qQgWG/WTFv/7al//MYxB4IcObpkHmUFEk+/6aGH6T+nnjnRKIIDpZtKiNCEt0V//MYxBMHAJ7cAHpaDDkQHaz/mP/KGrB+F6sNowcOYKD8yPX1//MYxA4FWHboAHjaDLOZBvv4Z/01RFCQdxeDNtZBVl3xW3y0//MYxA8FaJ7wyHhOBE4On/lG/1qoCw9SyDb5FfuRXxX9NKQY//MYxBAFCHbsAGDWEHcHf8rVEAKRhCAaKXmZcqtmkWUen6AX//MYxBIFwJsCOGBKKPxv/Z/rkBkODm9J0dteMzFXMHDXf3SE//MYxBIFmHroAEhWwPfQ//IKwRhVnBSLik5jbiAy/qVF3+U///MYxBIE0Jr0AHjODOSqRaiECRSpAlQ5lgZQWL6yoYdzX+vJ//MYxBUFAHb86DhOLN5HbEiMrVXja7ewz59Av+H///B1dCwd//MYxBgFGObwAHmEFALNcZsanoEy2tKyBr/IP/w2lkEnNegj//MYxBoE+Jr4KElOGLxrW14Kk7aZzf0DN/qqsAgoOy60jmBu//MYxB0E0J7wAGHETGNOiobeyat/nHf66slMr9yVo76NMlwI//MYxCAFEJ7wAGDKSBK/5b/FbZRkvKF1F1HXa0FCy++DeG/9//MYxCIEOJ7wAHhORF/2KrggP+XqYdyzfDZSLhlu8wP/iA////MYxCgEyHb0AHnGGC/AfGfinD4UI7s3A8j8you/xU3+hZGY//MYxCsFOJ7wAGGKDLTcw0dKifHqeGJPf5UWP6j8c/0qqAOr//MYxC0E4J7wAHmOCKNPr3+FiYK9VAB/8L/ULf/mKsFKhFls//MYxDAFWJ7sAHmUCFpQEEue26goZ6cZ/zS9sfDccOqsYcsn//MYxDEFEJr0AGCKVMw39U/wX//6FckiZlGYJ3jySXwPN+ZQ//MYxDMEqJ7wAHmODFv+Of9n+pWpQmLlcDW41SIvwNL+jUN///MYxDcEUJr4AGDEBMl/3f6FxaEyCQWaGjYSbWODbd6D/8MF//MYxDwFEJrwAHmOBD/t/xSwgB8s4ZeEIwn7hAGtx+P/xYd///MYxD4FIJrwAHmOBNP////QkEiaHYWHr0PjS+4gL21f/1A0//MYxEAFgKL0AFhKAN93V/rq4QxhFgVaSKS9+ChBPbJ/4iF///MYxEEF+KLwAGIKCPT/08kZjvGLUY8a/MGI/Lin+Eif6P+z//MYxEAFkJ70AHjOCP/+pZshNnzR5b2Lb14HrfZ6FbKw5R+n//MYxEAFOJ7wAGDOBP1qWGw6V09STGi35NLf6lf6Jv+FJYCi//MYxEIFoJ70AHiKDAGgo0GLvwgq1ej/4hP//rIKqUbiGwY1//MYxEIFWHbwAEgOgNFCXpFNa3UN/qML/lv+TtCUt12NvqCE//MYxEMEqTb0AGgFKKtTBlt3hQD+ohb/X/wzX8TBQ9UQrQby//MYxEcEmJ74ADhECFktf1HwXzP//6XAmROgkKNALD2Tc3Or//MYxEsFMJ70AHiKFOL/x3/1/9bJM2h46jRNAVlxd1El+j/t//MYxE0FeJ7wAGCOVP9VsBTeaNHSHtwsf6av/QSZwHDZo1kr//MYxE4EsHcAyGCKGAkZFkH9H2/wbsFEqLF0ggF2DJiA5WwR//MYxFIE+Jr0AGDEBPhD/T/01R8BYMRi7tNVXcgmcLP8fwj///MYxFUEaFL4AHiMEKP+USE1HM8FPnl3GfsER/uZ+wRB2qH5//MYxFoDsJ74AEiKDEyb4g/kd/TRTl+bV/Zi+vq+pQMtAoIx//MYxGIDuJ74AGCEAGwyKZ+LJFO8JqLUKl+J6PExJL/KSP5Y//MYxGoEyE70AHjODEv+VR/nkT3/9SpMQU1FMy4xMDCqqqqq//MYxG0E8Hb4AUcQAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MYxHAJYJLwAY9IAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MYxGEJSKbEAZNoAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//MYxFIAAANIAcAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
  const MIN_SPLASH_MS=5600;
  function play({duration=MIN_SPLASH_MS}={}){
    if(playing)return Promise.resolve();
    playing=true;
    return new Promise(resolve=>{
      const overlay=document.createElement('div');
      overlay.className='r8-transition';
      overlay.innerHTML='<div class="r8-transition-stage"><span class="r8-logo-piece r8-word-z" aria-label="ZABORSKY"></span><span class="r8-logo-piece r8-word-b" aria-label="BIZET"></span><span class="r8-logo-piece r8-word-os" aria-label="OS"></span><div class="r8-flash"></div><div class="r8-sound-prompt">'+((localStorage.getItem('bizet_os_language')||'ru')==='en'?'Tap to start':'Нажмите для запуска')+'</div></div>';
      document.body.appendChild(overlay);

      const audio=new Audio(SPLASH_AUDIO);
      audio.preload='auto';audio.volume=.82;audio.currentTime=0;
      let finished=false,fallbackTimer=0,started=false;
      const requested=Math.max(MIN_SPLASH_MS,Number(duration)||0);
      const resolvedDuration=()=>Math.max(requested,Number.isFinite(audio.duration)&&audio.duration>0?Math.ceil(audio.duration*1000)+420:requested);
      const finish=()=>{
        if(finished)return;finished=true;clearTimeout(fallbackTimer);
        overlay.classList.add('is-leaving');
        setTimeout(()=>{overlay.remove();playing=false;resolve()},420);
      };
      const run=()=>{
        if(started)return;started=true;
        const ms=resolvedDuration();
        overlay.style.setProperty('--r8-duration',ms+'ms');
        overlay.classList.remove('needs-gesture');
        overlay.classList.add('is-playing');
        fallbackTimer=setTimeout(finish,ms+180);
        audio.addEventListener('ended',()=>{clearTimeout(fallbackTimer);setTimeout(finish,420)},{once:true});
      };
      const startAudio=()=>{
        let attempt;
        try{attempt=audio.play()}catch(_){attempt=null}
        if(attempt&&typeof attempt.then==='function'){
          attempt.then(run).catch(()=>{
            overlay.classList.add('needs-gesture');
            const resume=()=>{
              overlay.removeEventListener('pointerdown',resume);
              const retry=audio.play();
              if(retry&&typeof retry.then==='function')retry.then(run).catch(()=>{run()});else run();
            };
            overlay.addEventListener('pointerdown',resume,{once:true});
          });
        }else run();
      };
      if(audio.readyState>=1)startAudio();
      else{
        const ready=()=>startAudio();
        audio.addEventListener('loadedmetadata',ready,{once:true});
        setTimeout(()=>{if(!started&&!overlay.classList.contains('needs-gesture'))startAudio()},450);
      }
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
    if(location.pathname==='/')play({duration:MIN_SPLASH_MS});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();