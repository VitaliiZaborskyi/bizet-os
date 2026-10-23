(() => {
  const stage=new URLSearchParams(location.search).get('stage')||'';
  const keys={
    'upper-gap':'base_total_height_mm',
    'base-depth-r6':'base_depth_mm',
    'inter-gap-r6':'upper_gap_mm',
    'upper-height-r6':'upper_total_height_mm',
    'upper-depth-r6':'upper_depth_mm'
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('#r6s');
    if(!button||!keys[stage])return;
    const value=Math.round(Number(document.getElementById('r6d')?.value));
    if(Number.isFinite(value)&&value>0)localStorage.setItem(`bizet_r6_${keys[stage]}`,String(value));
  },true);
})();