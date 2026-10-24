(()=> {
  const registry={
    SCILM_ADJUSTABLE_LEG:{
      manufacturer:'SCILM',
      product_family:'Legs for base cabinet',
      candidate_product:'250 PR50',
      representative_code:'250PR5010',
      product_status:'PILOT_ASSET_IDENTITY_VERIFIED_NOT_OWNER_FROZEN',
      geometry_status:'VERIFIED_DIMENSIONAL_PROXY',
      source:'https://www.scilm.it/en/en/products/leg-with-multi-adjustment-integrated-base-250-pr50.htm',
      verified_dimensions_mm:{height_min:100,height_max:150,upper_diameter:60,shaft_diameter:28,foot_diameter:50},
      verified_notes:'Official SCILM 250 PR50 data: code 250PR5010, H 100–150 mm, multi-adjustment range 5 cm; official catalogue shows Ø60 upper base, Ø28 shaft and Ø50 foot. Renderer uses these verified dimensions as a technical proxy until native CAD mesh import is available.',
      renderer_fallback:'SCILM_250PR5010_VERIFIED_DIMENSIONAL_PROXY'
    },
    BLUM_HINGE_STRAIGHT_PLATE:{
      manufacturer:'Blum',
      product_family:'CLIP top 110°',
      representative_hinge:'70T3550.TL',
      mounting_plate:'175H3100',
      plate_type:'Horizontal cam mounting plate 20/32',
      product_status:'PILOT_ASSET_IDENTITY_VERIFIED_NOT_OWNER_FROZEN',
      geometry_status:'CAD_IDENTIFIED_EXTERNAL_PROXY',
      source:'https://shop-ua.blum.com/catalog/clip-zavisy/70t3550-tlmbv50ni',
      plate_source:'https://publications.blum.com/2024/catalogue/en/62/',
      verified_cad_source:'https://www.bullerltd.co.uk/blum-clip-top-full-overlay-unsprung-hinge-for-tip-on-70t3550.html',
      verified_notes:'Blum official sources verify CLIP top 110° screw-on hinge 70T3550.TL and straight 0 mm mounting plate 175H3100. A downloadable DXF is identified externally; current 2D projected renderer cannot consume ACIS 3D solids directly, so it renders a recognizable manufacturer-specific technical proxy rather than claiming a native CAD mesh.',
      renderer_fallback:'BLUM_70T3550TL_175H3100_VERIFIED_TECHNICAL_PROXY'
    }
  };
  window.BizetHardwareAssets=Object.freeze(registry);
})();