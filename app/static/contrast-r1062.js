/* BIZET OS R10.6.2 owner #33: actual rendered control contrast, not theme-name guessing.
 * Preserve button backgrounds and application state. CSS foreground changes only. */
(()=>{'use strict';
 const luminance=rgb=>{
  const l=rgb.map(n=>{const v=n/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*l[0]+.7152*l[1]+.0722*l[2];
 };
 const parse=str=>{
  const m=String(str||'').match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*([\d.]+))?/i);
  return m?{c:[Number(m[1]),Number(m[2]),Number(m[3])],a:m[4]===undefined?1:Number(m[4])}:null;
 };
 const background=element=>{
  const layers=[];let n=element;
  while(n&&n.nodeType===1){
   const style=getComputedStyle(n),col=parse(style.backgroundColor);
   if(col&&col.a>0)layers.push(col);
   n=n.parentElement;
  }
  let out=[255,255,255];
  for(let i=layers.length-1;i>=0;i--)out=layers[i].c.map((v,k)=>v*layers[i].a+out[k]*(1-layers[i].a));
  return out;
 };
 let scheduled=false,active=false;
 function update(){
  scheduled=false;if(active)return;active=true;
  try{
   document.querySelectorAll('button:not([hidden]),input:not([type=range]):not([type=checkbox]),select,textarea,[role="button"]').forEach(el=>{
    const s=getComputedStyle(el);
    if(s.display==='none'||s.visibility==='hidden')return;
    const light=luminance(background(el)),blackRatio=(light+.05)/.05,whiteRatio=1.05/(light+.05);
    const desired=blackRatio>=whiteRatio?'rgb(21, 22, 24)':'rgb(255, 255, 255)';
    if(el.style.color!==desired)el.style.color=desired;
   });
  }catch(e){console.warn('R1062_CONTRAST_SCAN_FAILED',e)}
  finally{active=false}
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update)}}
 document.addEventListener('DOMContentLoaded',schedule,{once:true});
 document.addEventListener('change',e=>{if(/theme|palette|language/i.test(e.target.id||''))schedule()});
 window.addEventListener('bizet:languagechange',schedule);
 new MutationObserver(mutations=>{
  if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&m.attributeName!=='style')))schedule();
 }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-theme','data-furniture-palette','hidden']});
 schedule();
 window.BizetContrastR1062={refresh:schedule};
})();