(() => {
  const DEG = Math.PI / 180;

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function cameraFor(configuration) {
    const map = {
      WALL_CENTER: -18 * DEG,
      WALL_LEFT: -28 * DEG,
      WALL_RIGHT: 28 * DEG,
      L_LEFT: -42 * DEG,
      L_RIGHT: 42 * DEG,
      U_SHAPE: 0,
      CUSTOM: -24 * DEG,
    };
    return map[configuration] ?? -18 * DEG;
  }

  function createProjector(width, height, room, configuration, verticalBias = 0.53) {
    const L = Math.max(1000, Number(room.lengthMm) || 6000);
    const D = Math.max(1000, Number(room.depthMm) || 4200);
    const H = Math.max(1200, Number(room.heightMm) || 2800);
    const yaw = cameraFor(configuration);
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);

    function raw(point) {
      const x = point[0] - L / 2;
      const y = point[1] - D / 2;
      const z = point[2];
      const rx = x * c - y * s;
      const ry = x * s + y * c;
      return [rx, z + ry * verticalBias];
    }

    const boundsPoints = [
      [0, 0, 0], [L, 0, 0], [L, D, 0], [0, D, 0],
      [0, 0, H], [L, 0, H], [L, D, H], [0, D, H],
    ].map(raw);
    const xs = boundsPoints.map(p => p[0]);
    const ys = boundsPoints.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((width * 0.82) / spanX, (height * 0.72) / spanY);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const centerY = height * 0.53;

    return {
      L, D, H,
      point(point) {
        const p = raw(point);
        return [width / 2 + (p[0] - midX) * scale, centerY - (p[1] - midY) * scale];
      },
    };
  }

  function polygon(ctx, points, fill, stroke = 'rgba(23,23,22,.22)', lineWidth = 1.2) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function line(ctx, a, b, stroke = 'rgba(23,23,22,.22)', width = 1, dash = []) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function label(ctx, point, text, active = false) {
    ctx.save();
    ctx.font = '800 12px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';
    const padX = 8;
    const width = ctx.measureText(text).width + padX * 2;
    const height = 28;
    ctx.fillStyle = active ? '#171716' : 'rgba(255,255,255,.88)';
    ctx.strokeStyle = 'rgba(23,23,22,.13)';
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(point[0] - width / 2, point[1] - height / 2, width, height, 14);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.fillRect(point[0] - width / 2, point[1] - height / 2, width, height);
      ctx.strokeRect(point[0] - width / 2, point[1] - height / 2, width, height);
    }
    ctx.fillStyle = active ? '#f5f4f1' : '#171716';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, point[0], point[1] + 0.5);
    ctx.restore();
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], yi = points[i][1];
      const xj = points[j][0], yj = points[j][1];
      const hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 0.00001) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }

  function drawGrid(ctx, p, room, projector) {
    const step = Math.max(500, Math.round(Math.min(projector.L, projector.D) / 7 / 500) * 500);
    for (let x = step; x < projector.L; x += step) {
      line(ctx, p([x, 0, 2]), p([x, projector.D, 2]), 'rgba(23,23,22,.055)', 0.8);
    }
    for (let y = step; y < projector.D; y += step) {
      line(ctx, p([0, y, 2]), p([projector.L, y, 2]), 'rgba(23,23,22,.055)', 0.8);
    }
  }

  function drawRoomScene(canvas, options = {}) {
    const { ctx, width, height } = setupCanvas(canvas);
    const configuration = options.configuration || 'WALL_CENTER';
    const room = options.room || {};
    const activeWalls = options.activeWalls || [];
    const projector = createProjector(width, height, room, configuration);
    const p = projector.point;
    const active = new Set(activeWalls);
    const hits = [];

    const floor = [p([0,0,0]), p([projector.L,0,0]), p([projector.L,projector.D,0]), p([0,projector.D,0])];
    polygon(ctx, floor, '#e9e4d9', 'rgba(23,23,22,.18)', 1.2);
    drawGrid(ctx, p, room, projector);
    hits.push({ id: 'FLOOR', points: floor });

    const walls = {
      A: [p([0,projector.D,0]), p([projector.L,projector.D,0]), p([projector.L,projector.D,projector.H]), p([0,projector.D,projector.H])],
      B: [p([0,0,0]), p([0,projector.D,0]), p([0,projector.D,projector.H]), p([0,0,projector.H])],
      C: [p([projector.L,projector.D,0]), p([projector.L,0,0]), p([projector.L,0,projector.H]), p([projector.L,projector.D,projector.H])],
    };

    const order = configuration === 'L_RIGHT' || configuration === 'WALL_RIGHT' ? ['B','A','C'] : ['C','A','B'];
    for (const id of order) {
      const isActive = active.has(id);
      polygon(
        ctx,
        walls[id],
        isActive ? 'rgba(242,201,76,.78)' : 'rgba(213,208,198,.25)',
        isActive ? 'rgba(23,23,22,.78)' : 'rgba(23,23,22,.14)',
        isActive ? 1.8 : 1,
      );
      if (isActive) hits.push({ id, points: walls[id] });
    }

    const labels = {
      A: p([projector.L*.5, projector.D, projector.H*.58]),
      B: p([0, projector.D*.52, projector.H*.56]),
      C: p([projector.L, projector.D*.52, projector.H*.56]),
      FLOOR: p([projector.L*.52, projector.D*.42, 15]),
    };
    label(ctx, labels.FLOOR, 'Пол', true);
    ['A','B','C'].forEach(id => label(ctx, labels[id], `Стена ${id}`, active.has(id)));

    ctx.save();
    ctx.font = '700 12px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';
    ctx.fillStyle = 'rgba(23,23,22,.62)';
    ctx.textAlign = 'center';
    ctx.fillText('Фиксированный 3D-ракурс · вращение будет доступно позже', width / 2, height - 20);
    ctx.restore();

    return {
      hitAreas: hits,
      hitTest(x, y) {
        for (let i = hits.length - 1; i >= 0; i -= 1) {
          if (pointInPolygon(x, y, hits[i].points)) return hits[i].id;
        }
        return null;
      },
    };
  }

  function boxFaces(projector, box) {
    const { x, y, z, w, d, h } = box;
    const p = projector.point;
    const a = p([x,y,z]);
    const b = p([x+w,y,z]);
    const c = p([x+w,y+d,z]);
    const d0 = p([x,y+d,z]);
    const aT = p([x,y,z+h]);
    const bT = p([x+w,y,z+h]);
    const cT = p([x+w,y+d,z+h]);
    const dT = p([x,y+d,z+h]);
    return {
      top: [aT,bT,cT,dT],
      frontYMin: [a,b,bT,aT],
      backYMax: [d0,c,cT,dT],
      left: [a,d0,dT,aT],
      right: [b,c,cT,bT],
    };
  }

  function drawBox(ctx, projector, box, style = {}) {
    const faces = boxFaces(projector, box);
    const body = style.body || '#d9d1c3';
    polygon(ctx, faces.backYMax, body, 'rgba(23,23,22,.25)', 1);
    polygon(ctx, faces.left, style.side || '#c9c0b2', 'rgba(23,23,22,.28)', 1);
    polygon(ctx, faces.right, style.side || '#c9c0b2', 'rgba(23,23,22,.28)', 1);
    polygon(ctx, faces.top, style.top || '#eee9df', 'rgba(23,23,22,.26)', 1);
    polygon(ctx, faces.frontYMin, style.front || '#f2eee6', 'rgba(23,23,22,.55)', 1.2);
    return faces;
  }

  function frontLineForA(projector, module, ratio) {
    const x = module.x + module.w * ratio;
    const y = module.y;
    return [projector.point([x,y,module.z+8]), projector.point([x,y,module.z+module.h-8])];
  }

  function horizontalFrontLineForA(projector, module, ratio) {
    const z = module.z + module.h * ratio;
    return [projector.point([module.x+8,module.y,z]), projector.point([module.x+module.w-8,module.y,z])];
  }

  function drawModuleDetails(ctx, projector, module) {
    if (module.wall !== 'A') return;
    if (module.kind === 'DRAWERS') {
      [0.34, 0.67].forEach(r => {
        const seg = horizontalFrontLineForA(projector, module, r);
        line(ctx, seg[0], seg[1], 'rgba(23,23,22,.42)', 1);
      });
    } else if (module.kind === 'HINGED' || module.kind === 'SINK') {
      const seg = frontLineForA(projector, module, 0.5);
      line(ctx, seg[0], seg[1], 'rgba(23,23,22,.42)', 1);
    } else if (module.kind === 'FRIDGE' || module.kind === 'TALL_OVEN') {
      if (module.kind === 'FRIDGE' && module.content !== 'FRIDGE_ONLY' && module.content !== 'FREEZER_ONLY') {
        const seg = horizontalFrontLineForA(projector, module, 0.48);
        line(ctx, seg[0], seg[1], 'rgba(23,23,22,.42)', 1);
      }
      if (module.kind === 'TALL_OVEN') {
        const z0 = module.z + module.h * .43;
        const z1 = module.z + module.h * .68;
        const p = projector.point;
        polygon(ctx, [
          p([module.x+module.w*.12,module.y-1,z0]), p([module.x+module.w*.88,module.y-1,z0]),
          p([module.x+module.w*.88,module.y-1,z1]), p([module.x+module.w*.12,module.y-1,z1]),
        ], '#292929', 'rgba(0,0,0,.55)', 1);
      }
    }
  }

  function drawWorktop(ctx, projector, group) {
    if (!group.length) return;
    const base = group.filter(m => !m.tall);
    if (!base.length) return;
    const minX = Math.min(...base.map(m => m.x));
    const maxX = Math.max(...base.map(m => m.x + m.w));
    const y = base[0].y - 18;
    const depth = base[0].d + 36;
    const z = Math.max(...base.map(m => m.z + m.h));
    drawBox(ctx, projector, {x:minX,y,z,w:maxX-minX,d:depth,h:26}, {body:'#242424',side:'#1d1d1d',top:'#383838',front:'#222'});
  }

  function drawPlinth(ctx, projector, group) {
    const base = group.filter(m => !m.tall);
    if (!base.length) return;
    const minX = Math.min(...base.map(m => m.x));
    const maxX = Math.max(...base.map(m => m.x + m.w));
    const y = base[0].y + 35;
    drawBox(ctx, projector, {x:minX,y,z:0,w:maxX-minX,d:Math.max(80,base[0].d-70),h:Math.max(55,base[0].h*.08)}, {body:'#30302e',side:'#272725',top:'#383836',front:'#2d2d2b'});
  }

  function drawTopAppliance(ctx, projector, module) {
    if (module.wall !== 'A') return;
    const p = projector.point;
    const topZ = module.z + module.h + 30;
    if (module.kind === 'COOKTOP') {
      polygon(ctx, [
        p([module.x+module.w*.12,module.y+module.d*.18,topZ]),
        p([module.x+module.w*.88,module.y+module.d*.18,topZ]),
        p([module.x+module.w*.88,module.y+module.d*.78,topZ]),
        p([module.x+module.w*.12,module.y+module.d*.78,topZ]),
      ], '#1e1e1e', '#050505', 1.2);
    }
    if (module.kind === 'SINK') {
      polygon(ctx, [
        p([module.x+module.w*.18,module.y+module.d*.22,topZ]),
        p([module.x+module.w*.82,module.y+module.d*.22,topZ]),
        p([module.x+module.w*.82,module.y+module.d*.72,topZ]),
        p([module.x+module.w*.18,module.y+module.d*.72,topZ]),
      ], '#b8bdbe', '#74797b', 1.2);
    }
  }

  function drawKitchenScene(canvas, options = {}) {
    const { ctx, width, height } = setupCanvas(canvas);
    const room = options.room || {};
    const configuration = options.configuration || 'WALL_CENTER';
    const projector = createProjector(width, height, room, configuration, 0.50);
    const p = projector.point;
    const modules = Array.isArray(options.modules) ? options.modules : [];
    const hits = [];

    const floor = [p([0,0,0]), p([projector.L,0,0]), p([projector.L,projector.D,0]), p([0,projector.D,0])];
    polygon(ctx, floor, '#e9e4d9', 'rgba(23,23,22,.14)', 1);
    drawGrid(ctx, p, room, projector);
    polygon(ctx,[p([0,projector.D,0]),p([projector.L,projector.D,0]),p([projector.L,projector.D,projector.H]),p([0,projector.D,projector.H])],'rgba(223,219,211,.72)','rgba(23,23,22,.14)',1);
    if (configuration === 'L_LEFT' || configuration === 'U_SHAPE') {
      polygon(ctx,[p([0,0,0]),p([0,projector.D,0]),p([0,projector.D,projector.H]),p([0,0,projector.H])],'rgba(218,214,205,.56)','rgba(23,23,22,.12)',1);
    }
    if (configuration === 'L_RIGHT' || configuration === 'U_SHAPE') {
      polygon(ctx,[p([projector.L,projector.D,0]),p([projector.L,0,0]),p([projector.L,0,projector.H]),p([projector.L,projector.D,projector.H])],'rgba(218,214,205,.56)','rgba(23,23,22,.12)',1);
    }

    const groupA = modules.filter(m => m.wall === 'A');
    drawPlinth(ctx, projector, groupA);
    for (const module of modules) {
      if (module.wall !== 'A') continue;
      const faces = drawBox(ctx, projector, module, module.pending ? {body:'#ded8cd',front:'#ece8df',top:'#f0ece4'} : {body:'#d9d1c3',front:module.anchor?'#e9c95e':'#f2eee6',top:'#eee9df'});
      if (module.pending) {
        ctx.save();
        ctx.setLineDash([6,5]);
        polygon(ctx, faces.frontYMin, null, 'rgba(23,23,22,.55)', 1.2);
        ctx.restore();
      }
      drawModuleDetails(ctx, projector, module);
      hits.push({ id: module.id, points: faces.frontYMin });
    }
    drawWorktop(ctx, projector, groupA);
    groupA.forEach(module => drawTopAppliance(ctx, projector, module));

    for (const module of modules) {
      if (module.wall === 'A') continue;
      const faces = drawBox(ctx, projector, module, module.pending ? {body:'#ded8cd',front:'#ece8df'} : {body:'#d9d1c3',front:module.anchor?'#e9c95e':'#f2eee6'});
      hits.push({ id: module.id, points: faces.frontYMin });
    }

    modules.forEach(module => {
      const center = module.wall === 'A'
        ? p([module.x + module.w/2, module.y, module.z + module.h*.55])
        : p([module.x + module.w/2, module.y + module.d/2, module.z + module.h*.55]);
      label(ctx, [center[0], center[1] - 8], module.shortLabel || module.label || 'Модуль', !!module.anchor);
    });

    ctx.save();
    ctx.font = '700 12px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif';
    ctx.fillStyle = 'rgba(23,23,22,.62)';
    ctx.textAlign = 'center';
    ctx.fillText('Первый 3D-срез BIZET · вертикальные пропорции корпуса и цоколя пока не заморожены', width/2, height-20);
    ctx.restore();

    return {
      hitAreas: hits,
      hitTest(x,y) {
        for (let i=hits.length-1;i>=0;i-=1) if(pointInPolygon(x,y,hits[i].points)) return hits[i].id;
        return null;
      },
    };
  }

  window.BizetPilot3D = { drawRoomScene, drawKitchenScene, pointInPolygon };
})();
