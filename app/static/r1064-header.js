/* BIZET 10.6.4 #42 — move live controls, not duplicate them. */
(()=>{'use strict';
 function arrange(){
  const bar=document.querySelector('.r8-topbar'),help=document.getElementById('r1063HelpButton'),
   info=document.getElementById('baseInfoButton'),more=document.querySelector('.r8-topbar .settings-wrap');
  if(!bar||!help||!info||!more)return false;
  let row=bar.querySelector('.r1064-header-actions');
  if(!row){row=document.createElement('div');row.className='r1064-header-actions';bar.appendChild(row)}
  for(const element of [help,info,more])if(element.parentElement!==row)row.appendChild(element);
  const duplicates=[...bar.querySelectorAll('button')].filter(b=>
    b!==help&&b!==info&&b.id!=='settingsButton'&&b.id!=='backButton'&&
    (b.textContent.trim()==='?'||/topbar.?help/i.test(b.id)));
  duplicates.forEach(b=>{b.hidden=true;b.setAttribute('aria-hidden','true')});
  help.setAttribute('aria-label','Справка');info.setAttribute('aria-label','Информация');
  const b=bar.querySelector('#settingsButton');if(b)b.setAttribute('aria-label','Дополнительное меню');
  return true;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrange,{once:true});else arrange();
 const watch=new MutationObserver(()=>{if(arrange())watch.disconnect()});
 watch.observe(document.documentElement,{subtree:true,childList:true});
 window.BizetHeaderR1064={arrange};
})();