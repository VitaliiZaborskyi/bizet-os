(()=> {
  const registry={
    SCILM_ADJUSTABLE_LEG:{
      manufacturer:'SCILM',
      product_family:'Legs for base cabinet',
      candidate_product:'250 PR50',
      product_status:'PILOT_CANDIDATE_NOT_FROZEN',
      geometry_status:'ASSET_REQUIRED',
      source:'https://www.scilm.it/en/en/products/leg-with-multi-adjustment-integrated-base-250-pr50.htm',
      verified_notes:'Official SCILM page confirms 250 PR50 adjustable integrated-base leg, 5 cm adjustment range. Exact CAD geometry file not yet acquired.',
      renderer_fallback:'TEMPORARY_PLACEHOLDER_NOT_SCILM_GEOMETRY'
    },
    BLUM_HINGE_STRAIGHT_PLATE:{
      manufacturer:'Blum',
      product_family:'CLIP top 110°',
      representative_hinge:'70T3550.TL',
      mounting_plate:'175H3100',
      plate_type:'Horizontal cam mounting plate 20/32',
      product_status:'PILOT_ASSET_IDENTITY_VERIFIED_NOT_OWNER_FROZEN',
      geometry_status:'ASSET_REQUIRED',
      source:'https://publications.blum.com/2024/catalogue/en/62/',
      plate_source:'https://publications.blum.com/2026/catalogue/en/144/',
      verified_notes:'Official Blum catalogue identifies CLIP top 110° screw-on hinge 70T3550.TL and horizontal mounting plate 175H3100. CAD geometry file must still be acquired from official Product Configurator/CAD source.',
      renderer_fallback:'TEMPORARY_PLACEHOLDER_NOT_BLUM_GEOMETRY'
    }
  };
  window.BizetHardwareAssets=Object.freeze(registry);
})();