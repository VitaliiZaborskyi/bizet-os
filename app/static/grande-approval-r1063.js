/* BIZET OS R10.6.3 - Tree Art / Grande live parametric For Approval sheets.
 * Driven by THIS wardrobe model only; never fall back to kitchen or invent imported DWG.
 * Source DWG calibration, hinge boring and production XML remain UNVERIFIED. */
(()=>{'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const r=v=>Math.round(Number(v)||0);
 const n=v=>Number.isFinite(Number(v))?Number(v):0;
 const dim=(x,y,xx,yy,value)=>'<g stroke="#c4212b" stroke-width="1" fill="none"><path d="M '+x+' '+y+' L '+xx+' '+yy+'"/></g><text x="'+((x+xx)/2)+'" y="'+(Math.min(y,yy)-6)+'" font-size="10" text-anchor="middle" fill="#c4212b">'+r(value)+'</text>';
 const stamp=(page,name,tag)=>'<g><rect x="757" y="699" width="345" height="74" fill="white" stroke="#111"/>'+
  '<line x1="757" y1="724" x2="1102" y2="724" stroke="#111"/>'+
  '<text x="768" y="716" font-size="11" font-weight="800">BIZET by Zaborsky</text>'+
  '<text x="768" y="744" font-size="9">'+esc(name)+'</text>'+
  '<text x="768" y="760" font-size="9">'+esc(tag)+'</text>'+
  '<text x="977" y="716" font-size="9">FOR APPROVAL</text>'+
  '<text x="977" y="741" font-size="8">NOT FOR PRODUCTION</text>'+
  '<text x="977" y="760" font-size="8">Page '+page+'/2</text></g>';
 const base=(caption)=>'<svg viewBox="0 0 1120 790" xmlns="http://www.w3.org/2000/svg">'+
  '<rect x="8" y="8" width="1104" height="774" fill="#fff" stroke="#111" stroke-width="1.5"/>'+
  '<text x="54" y="42" font-size="17" font-weight="800">BIZET OS · '+esc(caption)+'</text>';
 function sheets(S,product){
  if(!['GRANDE','TREE_ART_WARDROBE'].includes(product))throw new Error('Unsupported wardrobe category');
  const W=n(S.w),H=n(S.h),D=n(S.d);if(W<250||W>10000||H<400||H>5000||D<150||D>2500)throw new Error('Invalid current wardrobe geometry');
  const left=W*.37,right=W-left,x=100,y=120,scale=Math.min(490/W,435/H),ww=W*scale,hh=H*scale;
  let front='<rect x="'+x+'" y="'+y+'" width="'+ww+'" height="'+hh+'" fill="#f5f7f8" stroke="#111" stroke-width="2"/>'+
    '<line x1="'+(x+left*scale)+'" y1="'+y+'" x2="'+(x+left*scale)+'" y2="'+(y+hh)+'" stroke="#111" stroke-width="1.5"/>';
  const shelves=(count,start,width)=>{
   let out='';for(let i=1;i<=count;i++){const sy=y+hh-i*hh/(count+1);
    out+='<line x1="'+start+'" y1="'+sy+'" x2="'+(start+width)+'" y2="'+sy+'" stroke="#888" stroke-dasharray="5 4"/>';}
   return out;
  };
  front+=shelves(Math.max(0,Math.min(16,r(S.shelvesL))),x,left*scale);
  front+=shelves(Math.max(0,Math.min(16,r(S.shelvesR))),x+left*scale,right*scale);
  const count=Math.max(1,Math.min(5,r(S.drawers)));
  for(let i=0;i<count;i++){
   const top=y+hh-(n(S.drawerStart)+(i+1)*n(S.drawerHeight))*scale;
   front+='<rect x="'+(x+2)+'" y="'+top+'" width="'+(left*scale-4)+'" height="'+(n(S.drawerHeight)*scale-2)+'" fill="none" stroke="#666"/>';
  }
  if(S.rod)front+='<line x1="'+(x+left*scale+15)+'" y1="'+(y+n(S.rodTop)*scale)+'" x2="'+(x+ww-15)+'" y2="'+(y+n(S.rodTop)*scale)+'" stroke="#444" stroke-width="4"/>';
  front+=dim(x,y+hh+42,x+ww,y+hh+42,W)+
   '<line x1="'+(x-26)+'" y1="'+y+'" x2="'+(x-26)+'" y2="'+(y+hh)+'" stroke="#c4212b"/>'+
   '<text x="'+(x-37)+'" y="'+(y+hh/2)+'" transform="rotate(-90 '+(x-37)+' '+(y+hh/2)+')" font-size="11" fill="#c4212b">'+r(H)+'</text>';
  let svg=base('TREE ART / GRANDE · FRONT / TOP / LEFT · 1:20');
  svg+='<text x="98" y="91" font-size="13" font-weight="800">FRONT VIEW · PARAMETRIC</text>'+front;
  const planX=705,planY=127,planW=W*scale*.48,planD=D*scale*.48;
  svg+='<text x="704" y="92" font-size="13" font-weight="800">TOP VIEW · PARAMETRIC</text>'+
   '<rect x="'+planX+'" y="'+planY+'" width="'+planW+'" height="'+planD+'" fill="#f6f8f9" stroke="#111" stroke-width="1.5"/>'+
   dim(planX,planY+planD+26,planX+planW,planY+planD+26,W)+
   '<text x="'+planX+'" y="'+(planY+planD+44)+'" font-size="10">Depth: '+r(D)+' mm</text>';
  const lx=711,ly=435,lw=Math.min(250,D*scale),lh=Math.min(185,H*scale*.44);
  svg+='<text x="706" y="408" font-size="13" font-weight="800">LEFT VIEW · PARAMETRIC</text>'+
    '<rect x="'+lx+'" y="'+ly+'" width="'+lw+'" height="'+lh+'" fill="#f6f8f9" stroke="#111" stroke-width="1.5"/>'+
    dim(lx,ly+lh+22,lx+lw,ly+lh+22,D);
  svg+='<text x="54" y="664" font-size="11" fill="#a21">CURRENT GRANDE PARAMETRIC MODEL · imported Grande.dwg not reverse engineered</text>';
  svg+=stamp(1,'GRANDE · PARAMETRIC EXTERIOR','W '+r(W)+' / H '+r(H)+' / D '+r(D)+' mm')+'</svg>';
  let detail=base('TREE ART / GRANDE · INTERNAL LAYOUT / FOR APPROVAL');
  detail+='<text x="94" y="82" font-size="14" font-weight="800">INTERNAL LEFT & RIGHT SECTIONS — PROJECT DATA</text>';
  detail+='<rect x="110" y="116" width="330" height="450" fill="#fff" stroke="#111" stroke-width="1.8"/>'+
    '<rect x="510" y="116" width="330" height="450" fill="#fff" stroke="#111" stroke-width="1.8"/>';
  for(let i=1;i<=Math.max(0,Math.min(16,r(S.shelvesL)));i++){
   const yy=116+450-i*450/(r(S.shelvesL)+1);
   detail+='<line x1="114" y1="'+yy+'" x2="436" y2="'+yy+'" stroke="#888" stroke-dasharray="5 3"/>';
  }
  for(let i=1;i<=Math.max(0,Math.min(16,r(S.shelvesR)));i++){
   const yy=116+450-i*450/(r(S.shelvesR)+1);
   detail+='<line x1="514" y1="'+yy+'" x2="836" y2="'+yy+'" stroke="#888" stroke-dasharray="5 3"/>';
  }
  detail+='<text x="118" y="595" font-size="12">LEFT: '+r(S.shelvesL)+' shelves · '+r(left)+' mm</text>'+
    '<text x="516" y="595" font-size="12">RIGHT: '+r(S.shelvesR)+' shelves · '+r(right)+' mm</text>'+
    '<text x="92" y="650" font-size="11" fill="#a21">Manufacturing profiles, drilling and verified source DWG remain STOP.</text>';
  detail+=stamp(2,'GRANDE · PARAMETRIC SECTIONS','FOR APPROVAL ONLY')+'</svg>';
  return [svg,detail];
 }
 function open(S,product='GRANDE'){
  const popup=window.open('','_blank');if(!popup){window.alert('Safari blocked the drawing tab. Enable popups for BIZET OS.');return false}
  try{
   const pages=sheets(S,product);
   const html='<!doctype html><html><head><meta charset="utf-8"><title>Grande · BIZET For Approval</title>'+
    '<style>@page{size:A4 landscape;margin:5mm 7.5mm}body{margin:0;color:#111;background:#ddd;font-family:Arial}.sheet{background:white;margin-bottom:10mm;page-break-after:always}.sheet svg{display:block;width:282mm;height:198.94mm;max-width:100%}@media print{body{background:white}.sheet{margin:0}}</style></head><body>'+
    pages.map(p=>'<div class="sheet">'+p+'</div>').join('')+
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>';
   popup.document.open();popup.document.write(html);popup.document.close();return true;
  }catch(error){console.error('GRANDE_FOR_APPROVAL_EXPORT_FAILED',error);popup.document.body.textContent='Export error: '+error.message;return false}
 }
 window.BizetGrandeApprovalR1063={sheets,open};
})();