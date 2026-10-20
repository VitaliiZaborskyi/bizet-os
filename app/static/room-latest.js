const STORAGE_KEY = 'bizet_os_project_id';
const SCAN_CONFIRM_KEY = 'bizet_scan_confirm_pending';
const MAX_REFERENCE_SEGMENTS = 700;
const MAX_TRIANGLES_PER_PRIMITIVE = 90000;

const SCAN_DOWNLOADS = {
  POLYCAM: {
    ios: 'https://apps.apple.com/app/id1532482376',
    android: 'https://play.google.com/store/apps/details?id=ai.polycam',
    web: 'https://poly.cam/get-the-app',
  },
  SKETCHUP: {
    ios: 'https://apps.apple.com/app/id796352563',
    android: 'https://app.sketchup.com/',
    web: 'https://www.sketchup.com/',
  },
};

let roomProject = null;
let scanImport = null;
let overlayCamera = { yaw: 0, pitch: 0.34, distance: 8.2 };
let overlayDrag = null;
let overlayPointers = new Map();
let overlayPinch = null;

function isRussian() {
  return (document.getElementById('languageSelect')?.value || document.documentElement.lang || 'ru') === 'ru';
}

function devicePlatform() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function wrapAngle(value) {
  const tau = Math.PI * 2;
  let v = value % tau;
  if (v > Math.PI) v -= tau;
  if (v < -Math.PI) v += tau;
  return v;
}
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul(a, scalar) { return [a[0] * scalar, a[1] * scalar, a[2] * scalar]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vecLength(a) { return Math.hypot(a[0], a[1], a[2]); }
function norm(a) { const length = vecLength(a) || 1; return mul(a, 1 / length); }

async function patchProject(path, value, extra = {}) {
  const id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) throw new Error('project_not_found');
  const response = await fetch(`/api/v1.1/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, value, ...extra }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'patch_failed');
  }
  const result = await response.json();
  return result.project || result;
}

async function fetchProject() {
  const id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) return null;
  const response = await fetch(`/api/v1.1/projects/${id}`);
  if (!response.ok) return null;
  return response.json();
}

function measured(geometry, key, fallback) {
  const value = geometry?.[key]?.value_mm;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function applyPilotCopy() {
  const ru = isRussian();
  const subtitle = document.getElementById('roomSubtitle');
  const hint = document.getElementById('gestureHint');
  const scopeTitle = document.getElementById('scopeTitle');
  const scopeCopy = document.getElementById('scopeCopy');
  const measurement = document.getElementById('measurementLabel');
  if (subtitle) subtitle.textContent = ru ? '3D появляется после выбора конфигурации. Теперь уточняем реальную геометрию помещения.' : '3D starts after configuration. Now we verify the real room geometry.';
  if (hint) hint.textContent = ru ? '360° вращение · контур скана остаётся поверх модели' : '360° orbit · the scan contour stays over the model';
  if (scopeTitle) scopeTitle.textContent = ru ? 'Геометрия помещения' : 'Room geometry';
  if (scopeCopy) scopeCopy.textContent = ru ? 'Один вопрос за один шаг. Скан — источник данных, а не готовая комната.' : 'One question per step. A scan is a data source, not the final room model.';
  if (measurement) measurement.textContent = ru ? 'Перейти к коммуникациям' : 'Continue to communications';

  const title = document.getElementById('scanTitle');
  const copy = document.getElementById('scanCopy');
  const note = document.getElementById('scanNote');
  if (title) title.textContent = ru ? 'Скан помещения' : 'Room scan';
  if (copy) copy.textContent = ru ? 'Загрузите GLB/GLTF. BIZET OS выделит устойчивые плоскости стен и построит свой контур помещения.' : 'Load GLB/GLTF. BIZET OS will detect stable wall planes and build its own room contour.';
  if (note) note.textContent = ru ? 'GLB остаётся референсом. В расчётную модель передаётся нормализованный контур BIZET.' : 'The GLB remains a reference. The normalized BIZET contour becomes the calculation model.';
  document.querySelectorAll('[data-latest-i18n]').forEach(node => {
    const value = node.dataset[ru ? 'ru' : 'en'];
    if (value) node.textContent = value;
  });
}

function parseGlb(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error(isRussian() ? 'Это не GLB-файл.' : 'This is not a GLB file.');
  if (view.getUint32(4, true) !== 2) throw new Error(isRussian() ? 'Поддерживается GLB 2.0.' : 'Only GLB 2.0 is supported.');
  let offset = 12;
  let json = null;
  let glbBin = null;
  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    offset += 8;
    const bytes = new Uint8Array(buffer, offset, length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(bytes).replace(/\u0000+$/g, ''));
    if (type === 0x004e4942) glbBin = bytes.slice().buffer;
    offset += length;
  }
  if (!json) throw new Error(isRussian() ? 'JSON-блок GLB не найден.' : 'GLB JSON chunk was not found.');
  return { json, glbBin };
}

function parseGlbJson(buffer) { return parseGlb(buffer).json; }

function analyzeGltf(json) {
  const meshes = Array.isArray(json.meshes) ? json.meshes : [];
  const accessors = Array.isArray(json.accessors) ? json.accessors : [];
  let primitives = 0;
  let positions = 0;
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) {
    for (const primitive of mesh.primitives || []) {
      primitives += 1;
      const index = primitive?.attributes?.POSITION;
      if (!Number.isInteger(index)) continue;
      const accessor = accessors[index];
      if (!accessor || !Array.isArray(accessor.min) || !Array.isArray(accessor.max)) continue;
      positions += 1;
      for (let axis = 0; axis < 3; axis += 1) {
        mins[axis] = Math.min(mins[axis], Number(accessor.min[axis]));
        maxs[axis] = Math.max(maxs[axis], Number(accessor.max[axis]));
      }
    }
  }
  let bounds = null;
  if (positions && mins.every(Number.isFinite) && maxs.every(Number.isFinite)) {
    const ext = maxs.map((value, axis) => Math.abs(value - mins[axis]));
    const lengthMm = Math.round(ext[0]*1000);
    const widthMm = Math.round(ext[2]*1000);
    const heightMm = Math.round(ext[1]*1000);
    if ([lengthMm, widthMm, heightMm].every(value => value >= 100 && value <= 100000)) bounds = { lengthMm, widthMm, heightMm };
  }
  return { meshes: meshes.length, primitives, positionAccessors: positions, bounds };
}

function decodeDataUri(uri) {
  const comma = uri.indexOf(',');
  if (comma < 0) return null;
  const meta = uri.slice(0, comma);
  const data = uri.slice(comma + 1);
  if (meta.includes(';base64')) {
    const raw = atob(data);
    const out = new Uint8Array(raw.length);
    for (let index = 0; index < raw.length; index += 1) out[index] = raw.charCodeAt(index);
    return out.buffer;
  }
  return new TextEncoder().encode(decodeURIComponent(data)).buffer;
}

async function loadGltfBuffers(json, files, glbBin) {
  const fileMap = new Map();
  for (const file of files) {
    fileMap.set(file.name, file);
    fileMap.set(decodeURIComponent(file.name), file);
  }
  const buffers = [];
  for (let index = 0; index < (json.buffers || []).length; index += 1) {
    const definition = json.buffers[index] || {};
    if (index === 0 && glbBin && !definition.uri) {
      buffers.push(glbBin);
      continue;
    }
    if (typeof definition.uri === 'string' && definition.uri.startsWith('data:')) {
      buffers.push(decodeDataUri(definition.uri));
      continue;
    }
    if (typeof definition.uri === 'string') {
      const decoded = decodeURIComponent(definition.uri.split('/').pop());
      const file = fileMap.get(definition.uri) || fileMap.get(decoded);
      buffers.push(file ? await file.arrayBuffer() : null);
      continue;
    }
    buffers.push(null);
  }
  return buffers;
}

const COMPONENT_INFO = {
  5120: ['getInt8', 1],
  5121: ['getUint8', 1],
  5122: ['getInt16', 2],
  5123: ['getUint16', 2],
  5125: ['getUint32', 4],
  5126: ['getFloat32', 4],
};
const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function createAccessorReader(json, buffers, index) {
  const accessor = json.accessors?.[index];
  if (!accessor || accessor.sparse || !Number.isInteger(accessor.bufferView)) return null;
  const viewDefinition = json.bufferViews?.[accessor.bufferView];
  const buffer = buffers[viewDefinition?.buffer];
  const component = COMPONENT_INFO[accessor.componentType];
  const size = TYPE_SIZE[accessor.type];
  if (!viewDefinition || !buffer || !component || !size) return null;
  const [getter, bytes] = component;
  const base = (viewDefinition.byteOffset || 0) + (accessor.byteOffset || 0);
  const stride = viewDefinition.byteStride || bytes * size;
  const dataView = new DataView(buffer);
  return {
    count: accessor.count || 0,
    size,
    get(row, componentIndex = 0) {
      const offset = base + row * stride + componentIndex * bytes;
      return dataView[getter](offset, true);
    },
    vector(row) {
      const result = [];
      for (let componentIndex = 0; componentIndex < size; componentIndex += 1) result.push(this.get(row, componentIndex));
      return result;
    },
  };
}

function identity() { return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]; }
function multiply(a, b) {
  const output = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      for (let k = 0; k < 4; k += 1) output[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  }
  return output;
}
function nodeMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.map(Number);
  const t = node.translation || [0, 0, 0];
  const s = node.scale || [1, 1, 1];
  const q = node.rotation || [0, 0, 0, 1];
  const [x, y, z, w] = q;
  const rotation = [
    1-2*y*y-2*z*z, 2*x*y+2*z*w, 2*x*z-2*y*w, 0,
    2*x*y-2*z*w, 1-2*x*x-2*z*z, 2*y*z+2*x*w, 0,
    2*x*z+2*y*w, 2*y*z-2*x*w, 1-2*x*x-2*y*y, 0,
    0,0,0,1,
  ];
  const scale = [s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,0,0,0,1];
  const translation = identity();
  translation[12] = t[0]; translation[13] = t[1]; translation[14] = t[2];
  return multiply(translation, multiply(rotation, scale));
}
function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    matrix[0]*x + matrix[4]*y + matrix[8]*z + matrix[12],
    matrix[1]*x + matrix[5]*y + matrix[9]*z + matrix[13],
    matrix[2]*x + matrix[6]*y + matrix[10]*z + matrix[14],
  ];
}
function gltfToBizet(point) { return [point[0], point[2], point[1]]; }

function collectMeshInstances(json) {
  const nodes = json.nodes || [];
  const instances = [];
  const roots = json.scenes?.[json.scene || 0]?.nodes || nodes.map((_, index) => index);
  function walk(index, parent) {
    const node = nodes[index] || {};
    const world = multiply(parent, nodeMatrix(node));
    if (Number.isInteger(node.mesh)) instances.push({ mesh: node.mesh, matrix: world });
    for (const child of node.children || []) walk(child, world);
  }
  if (nodes.length) {
    for (const root of roots) walk(root, identity());
  } else {
    for (let index = 0; index < (json.meshes || []).length; index += 1) instances.push({ mesh: index, matrix: identity() });
  }
  return instances;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.round((sorted.length - 1) * ratio), 0, sorted.length - 1);
  return sorted[index];
}

function detectFloorLevel(heights) {
  if (!heights.length) return { value: 0, source: 'FALLBACK' };
  const min = Math.min(...heights);
  const max = Math.max(...heights);
  const span = Math.max(0.2, max - min);
  const bucketSize = 0.05;
  const buckets = new Map();
  const upperSearch = min + span * 0.38;
  for (const height of heights) {
    if (height > upperSearch) continue;
    const bucket = Math.round(height / bucketSize);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }
  let bestBucket = null;
  let bestCount = 0;
  for (const [bucket, count] of buckets) {
    if (count > bestCount) { bestBucket = bucket; bestCount = count; }
  }
  if (bestBucket !== null && bestCount >= 5) return { value: bestBucket * bucketSize, source: 'DENSE_LOW_HORIZONTAL_BAND' };
  return { value: percentile(heights, 0.04), source: 'LOW_PERCENTILE' };
}

function sampleGeometry(json, buffers, instances) {
  const xs = [];
  const ys = [];
  const zs = [];
  for (const instance of instances) {
    const mesh = json.meshes?.[instance.mesh];
    if (!mesh) continue;
    for (const primitive of mesh.primitives || []) {
      const positionIndex = primitive?.attributes?.POSITION;
      if (!Number.isInteger(positionIndex)) continue;
      const reader = createAccessorReader(json, buffers, positionIndex);
      if (!reader || reader.size < 3) continue;
      const step = Math.max(1, Math.ceil(reader.count / 6000));
      for (let row = 0; row < reader.count; row += step) {
        const point = gltfToBizet(transformPoint(instance.matrix, reader.vector(row)));
        if (!point.every(Number.isFinite)) continue;
        xs.push(point[0]); ys.push(point[1]); zs.push(point[2]);
      }
    }
  }
  if (!xs.length) return null;
  return {
    xs, ys, zs,
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    minZ: Math.min(...zs), maxZ: Math.max(...zs),
  };
}

function triangleNormal(a, b, c) {
  const ab = sub(b, a);
  const ac = sub(c, a);
  return [
    ab[1]*ac[2] - ab[2]*ac[1],
    ab[2]*ac[0] - ab[0]*ac[2],
    ab[0]*ac[1] - ab[1]*ac[0],
  ];
}

function horizontalTriangleIntersection(points, height) {
  const hits = [];
  const edges = [[0,1], [1,2], [2,0]];
  for (const [aIndex, bIndex] of edges) {
    const a = points[aIndex];
    const b = points[bIndex];
    const da = a[2] - height;
    const db = b[2] - height;
    if (Math.abs(da) < 1e-6) hits.push([a[0], a[1]]);
    if (da * db < 0) {
      const t = (height - a[2]) / (b[2] - a[2]);
      hits.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  const unique = [];
  for (const hit of hits) {
    if (!unique.some(existing => Math.hypot(existing[0] - hit[0], existing[1] - hit[1]) < 0.003)) unique.push(hit);
  }
  if (unique.length < 2) return null;
  let best = null;
  let bestLength = 0;
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      const length = Math.hypot(unique[j][0] - unique[i][0], unique[j][1] - unique[i][1]);
      if (length > bestLength) { bestLength = length; best = [unique[i], unique[j]]; }
    }
  }
  return bestLength >= 0.08 ? best : null;
}

function addWallSegment(groups, segment, sliceIndex) {
  const [a, b] = segment;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.22 || length > 20) return;
  let angle = Math.atan2(dy, dx);
  while (angle < 0) angle += Math.PI;
  while (angle >= Math.PI) angle -= Math.PI;
  const angleStep = Math.PI / 36;
  const angleBin = Math.round(angle / angleStep);
  const snappedAngle = angleBin * angleStep;
  const direction = [Math.cos(snappedAngle), Math.sin(snappedAngle)];
  const normal = [-direction[1], direction[0]];
  const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const offset = midpoint[0] * normal[0] + midpoint[1] * normal[1];
  const offsetBin = Math.round(offset / 0.12);
  const key = `${angleBin}:${offsetBin}`;
  if (!groups.has(key)) groups.set(key, { angle: snappedAngle, offsets: [], intervals: [], slices: new Set() });
  const group = groups.get(key);
  group.offsets.push(offset);
  group.slices.add(sliceIndex);
  const ta = a[0] * direction[0] + a[1] * direction[1];
  const tb = b[0] * direction[0] + b[1] * direction[1];
  group.intervals.push([Math.min(ta, tb), Math.max(ta, tb)]);
}

function mergeWallGroups(groups, sample) {
  const candidates = [];
  for (const group of groups.values()) {
    if (group.slices.size < 2) continue;
    const direction = [Math.cos(group.angle), Math.sin(group.angle)];
    const normal = [-direction[1], direction[0]];
    const offset = group.offsets.reduce((sum, value) => sum + value, 0) / group.offsets.length;
    const intervals = [...group.intervals].sort((a, b) => a[0] - b[0]);
    if (!intervals.length) continue;
    let current = [...intervals[0]];
    const merged = [];
    for (const interval of intervals.slice(1)) {
      if (interval[0] <= current[1] + 0.28) current[1] = Math.max(current[1], interval[1]);
      else { merged.push(current); current = [...interval]; }
    }
    merged.push(current);
    for (const interval of merged) {
      const length = interval[1] - interval[0];
      if (length < 0.52) continue;
      const a = [direction[0] * interval[0] + normal[0] * offset, direction[1] * interval[0] + normal[1] * offset];
      const b = [direction[0] * interval[1] + normal[0] * offset, direction[1] * interval[1] + normal[1] * offset];
      const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const edgeDistance = Math.min(
        Math.abs(midpoint[0] - sample.minX), Math.abs(midpoint[0] - sample.maxX),
        Math.abs(midpoint[1] - sample.minY), Math.abs(midpoint[1] - sample.maxY),
      );
      candidates.push({ a, b, length, support: group.slices.size, outer: edgeDistance < 0.55 || length > 1.35 });
    }
  }
  const outer = candidates.filter(candidate => candidate.outer);
  const source = outer.length >= 3 ? outer : candidates;
  return source.sort((a, b) => (b.length * b.support) - (a.length * a.support)).slice(0, 48);
}

function extractScanContour(json, buffers) {
  const instances = collectMeshInstances(json);
  const sample = sampleGeometry(json, buffers, instances);
  if (!sample) throw new Error(isRussian() ? 'В скане не найдена доступная геометрия.' : 'No readable geometry was found in the scan.');

  const floor = detectFloorLevel(sample.zs);
  const high = percentile(sample.zs, 0.985);
  let detectedHeight = high - floor.value;
  if (!Number.isFinite(detectedHeight) || detectedHeight < 1.4) detectedHeight = sample.maxZ - floor.value;
  const relativeSlices = [0.45, 0.90, 1.35, 1.80, 2.20].filter(height => height < detectedHeight * 0.88);
  if (relativeSlices.length < 2) relativeSlices.splice(0, relativeSlices.length, Math.max(0.25, detectedHeight * 0.25), Math.max(0.5, detectedHeight * 0.55));
  const slices = relativeSlices.map(height => floor.value + height);
  const groups = new Map();
  const referenceRaw = [];
  let primitiveCount = 0;
  let sampledTriangles = 0;

  for (const instance of instances) {
    const mesh = json.meshes?.[instance.mesh];
    if (!mesh) continue;
    for (const primitive of mesh.primitives || []) {
      primitiveCount += 1;
      if ((primitive.mode ?? 4) !== 4) continue;
      const positionIndex = primitive?.attributes?.POSITION;
      if (!Number.isInteger(positionIndex)) continue;
      const positions = createAccessorReader(json, buffers, positionIndex);
      if (!positions || positions.size < 3) continue;
      const indices = Number.isInteger(primitive.indices) ? createAccessorReader(json, buffers, primitive.indices) : null;
      const triangleCount = Math.floor((indices ? indices.count : positions.count) / 3);
      const triangleStep = Math.max(1, Math.ceil(triangleCount / MAX_TRIANGLES_PER_PRIMITIVE));
      const vertexIndex = index => indices ? indices.get(index, 0) : index;

      for (let triangle = 0; triangle < triangleCount; triangle += triangleStep) {
        sampledTriangles += 1;
        const base = triangle * 3;
        const ids = [vertexIndex(base), vertexIndex(base + 1), vertexIndex(base + 2)];
        if (ids.some(id => !Number.isInteger(id) || id < 0 || id >= positions.count)) continue;
        const points = ids.map(id => gltfToBizet(transformPoint(instance.matrix, positions.vector(id))));
        if (points.some(point => !point.every(Number.isFinite))) continue;

        const normal = triangleNormal(points[0], points[1], points[2]);
        const normalLength = vecLength(normal) || 1;
        const verticalSurface = Math.abs(normal[2]) / normalLength < 0.38;
        const minHeight = Math.min(points[0][2], points[1][2], points[2][2]);
        const maxHeight = Math.max(points[0][2], points[1][2], points[2][2]);
        if (verticalSurface) {
          slices.forEach((slice, sliceIndex) => {
            if (slice < minHeight - 0.005 || slice > maxHeight + 0.005) return;
            const segment = horizontalTriangleIntersection(points, slice);
            if (segment) addWallSegment(groups, segment, sliceIndex);
          });
        }

        if (referenceRaw.length < MAX_REFERENCE_SEGMENTS && sampledTriangles % 7 === 0) {
          const edges = [[0,1],[1,2],[2,0]];
          for (const [a, b] of edges) {
            if (referenceRaw.length >= MAX_REFERENCE_SEGMENTS) break;
            referenceRaw.push([...points[a], ...points[b]]);
          }
        }
      }
    }
  }

  const walls = mergeWallGroups(groups, sample);
  let footprintPoints = walls.flatMap(wall => [wall.a, wall.b]);
  if (!footprintPoints.length) footprintPoints = [[sample.minX, sample.minY], [sample.maxX, sample.maxY]];
  let minX = Math.min(...footprintPoints.map(point => point[0]));
  let maxX = Math.max(...footprintPoints.map(point => point[0]));
  let minY = Math.min(...footprintPoints.map(point => point[1]));
  let maxY = Math.max(...footprintPoints.map(point => point[1]));
  if (maxX - minX < 0.5 || maxY - minY < 0.5) {
    minX = sample.minX; maxX = sample.maxX; minY = sample.minY; maxY = sample.maxY;
  }
  const centerX = (minX + maxX) / 2;
  const normalize2 = point => [point[0] - centerX, point[1] - minY];
  const contourSegments = walls.map(wall => {
    const a = normalize2(wall.a);
    const b = normalize2(wall.b);
    return [a[0], a[1], b[0], b[1]].map(value => Math.round(value * 10000) / 10000);
  });
  const referenceSegments = referenceRaw.map(segment => [
    segment[0] - centerX, segment[1] - minY, segment[2] - floor.value,
    segment[3] - centerX, segment[4] - minY, segment[5] - floor.value,
  ].map(value => Math.round(value * 10000) / 10000));

  const lengthMm = Math.round((maxX - minX) * 1000);
  const widthMm = Math.round((maxY - minY) * 1000);
  const heightMm = Math.round(detectedHeight * 1000);
  const bounds = [lengthMm, widthMm, heightMm].every(value => value >= 100 && value <= 100000)
    ? { lengthMm, widthMm, heightMm }
    : analyzeGltf(json).bounds;

  return {
    contourSegments,
    referenceSegments,
    bounds,
    floorLevelM: Math.round(floor.value * 10000) / 10000,
    floorSource: floor.source,
    sliceHeightsM: relativeSlices.map(value => Math.round(value * 1000) / 1000),
    primitiveCount,
    sampledTriangles,
    wallSegmentCount: contourSegments.length,
  };
}

async function readScanFiles(fileList) {
  const files = [...fileList];
  const main = files.find(file => /\.(glb|gltf)$/i.test(file.name));
  if (!main) throw new Error(isRussian() ? 'Выберите файл .glb или .gltf.' : 'Choose a .glb or .gltf file.');
  const buffer = await main.arrayBuffer();
  let json;
  let glbBin = null;
  let format;
  if (/\.glb$/i.test(main.name)) {
    const parsed = parseGlb(buffer);
    json = parsed.json;
    glbBin = parsed.glbBin;
    format = 'GLB';
  } else {
    json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer)));
    format = 'GLTF';
  }
  const extensions = new Set(json.extensionsUsed || []);
  if (extensions.has('KHR_draco_mesh_compression') || extensions.has('EXT_meshopt_compression')) {
    throw new Error(isRussian()
      ? 'Этот файл использует сжатую геометрию Draco/Meshopt. Для пилота экспортируйте GLB без сжатия.'
      : 'This file uses Draco/Meshopt compressed geometry. Export an uncompressed GLB for this pilot.');
  }
  const buffers = await loadGltfBuffers(json, files, glbBin);
  const missingBuffer = buffers.some((value, index) => !value && (json.buffers?.[index]?.byteLength || 0) > 0);
  if (missingBuffer) throw new Error(isRussian() ? 'GLTF ссылается на отдельный BIN. Выберите GLTF и BIN одновременно.' : 'The GLTF references a separate BIN. Select GLTF and BIN together.');
  const contour = extractScanContour(json, buffers);
  return {
    main,
    format,
    meshes: (json.meshes || []).length,
    ...contour,
  };
}

async function persistScanCandidate(info) {
  if (!info.bounds) throw new Error(isRussian() ? 'Не удалось определить рабочий габарит помещения.' : 'Could not determine usable room bounds.');
  const metadata = {
    file_name: info.main.name,
    format: info.format,
    mesh_count: info.meshes,
    primitive_count: info.primitiveCount,
    sampled_triangles: info.sampledTriangles,
    preliminary_bounds_mm: info.bounds,
    contour_segments_m: info.contourSegments,
    reference_segments_m: info.referenceSegments,
    slice_heights_m: info.sliceHeightsM,
    floor_level_m: info.floorLevelM,
    floor_detection: info.floorSource,
    wall_segment_count: info.wallSegmentCount,
    status: 'CONTOUR_CANDIDATE',
    recognition_method: 'MULTI_SLICE_VERTICAL_PLANES',
  };
  await patchProject('scene.visual_settings.scan_import', metadata, { reason: 'GLB multi-slice wall contour recognition' });
  await patchProject('scene.visual_settings.geometry_input_mode', 'SCAN', { reason: 'Room geometry input mode' });
  for (const [path, value] of [
    ['room.geometry.wall_length', info.bounds.lengthMm],
    ['room.geometry.wall_depth', info.bounds.widthMm],
    ['room.geometry.room_height', info.bounds.heightMm],
  ]) await patchProject(path, value, { source:'IMPORTED', confirmed: false, reason: 'Unconfirmed scan contour bounds' });
  sessionStorage.setItem(SCAN_CONFIRM_KEY, '1');
  window.location.assign('/room?scan=confirm');
}

function setProgress(host, text) {
  const status = host.querySelector('[data-scan-status]');
  if (status) { status.textContent = text; status.hidden = false; }
}

async function processScanSelection(fileInput, host, explicitApplyButton = null) {
  if (!fileInput.files?.length) return;
  const ru = isRussian();
  try {
    setProgress(host, ru ? 'Загружаем…' : 'Loading…');
    await new Promise(resolve => setTimeout(resolve, 40));
    setProgress(host, ru ? 'Распознаём геометрию стен…' : 'Recognizing wall geometry…');
    const info = await readScanFiles(fileInput.files);
    setProgress(host, ru ? `Проверяем контур · найдено стеновых сегментов: ${info.wallSegmentCount}` : `Checking contour · wall segments found: ${info.wallSegmentCount}`);
    if (explicitApplyButton) {
      explicitApplyButton.hidden = false;
      explicitApplyButton.disabled = false;
      explicitApplyButton.onclick = () => persistScanCandidate(info).catch(error => setProgress(host, error.message));
    } else {
      await new Promise(resolve => setTimeout(resolve, 80));
      await persistScanCandidate(info);
    }
  } catch (error) {
    setProgress(host, error.message || String(error));
  }
}

function buildGeometryInputQuestion() {
  if (document.getElementById('geometryInputQuestion')) return;
  const viewport = document.querySelector('.viewport-card');
  if (!viewport) return;
  const layer = document.createElement('div');
  layer.id = 'geometryInputQuestion';
  layer.className = 'scan-question-layer scan-input-question';
  layer.innerHTML = `
    <div class="scan-question-panel">
      <p class="scan-question-kicker">BIZET OS · 3D</p>
      <h2>${isRussian() ? 'Как получим геометрию помещения?' : 'How should we get the room geometry?'}</h2>
      <p>${isRussian() ? 'Загрузите скан или перейдите к ручному вводу. Сейчас нужен только один ответ.' : 'Load a scan or continue with manual input. Only one answer is needed now.'}</p>
      <div class="scan-question-actions">
        <button class="scan-question-primary" id="initialScanChoose" type="button">${isRussian() ? 'Загрузить скан' : 'Load scan'}</button>
        <button class="scan-question-secondary" id="manualGeometryPath" type="button">${isRussian() ? 'Ввести вручную' : 'Enter manually'}</button>
      </div>
      <input id="initialScanFileInput" type="file" accept=".gltf,.glb,.bin,model/gltf+json,model/gltf-binary,application/octet-stream" multiple hidden>
      <p class="scan-question-status" data-scan-status hidden></p>
    </div>`;
  viewport.appendChild(layer);
  const input = layer.querySelector('#initialScanFileInput');
  layer.querySelector('#initialScanChoose').addEventListener('click', () => input.click());
  input.addEventListener('change', () => processScanSelection(input, layer));
  layer.querySelector('#manualGeometryPath').addEventListener('click', async () => {
    try { await patchProject('scene.visual_settings.geometry_input_mode', 'MANUAL', { reason: 'Manual room geometry selected' }); } catch (_) {}
    layer.remove();
  });
}

function buildScanPilot() {
  const dialog = document.getElementById('scanDialog');
  if (!dialog) return;
  const card = dialog.querySelector('.modal-card');
  card?.querySelector('.scan-options')?.remove();
  card?.querySelector('#latestScanPaths')?.remove();
  const note = document.getElementById('scanNote');
  const host = document.createElement('div');
  host.id = 'latestScanPaths';
  host.innerHTML = `
    <div class="scan-paths">
      <button class="scan-path-button is-active" id="existingScanPath" type="button"><strong>${isRussian() ? 'У меня уже есть скан' : 'I already have a scan'}</strong><span>${isRussian() ? 'Выбрать GLB/GLTF на устройстве' : 'Choose GLB/GLTF from this device'}</span></button>
      <button class="scan-path-button" id="newScanPath" type="button"><strong>${isRussian() ? 'Мне нужно отсканировать' : 'I need to scan the room'}</strong><span>${isRussian() ? 'Открыть приложение для сканирования' : 'Open a scanning app'}</span></button>
    </div>
    <section class="scan-path-panel" id="existingScanPanel">
      <input id="scanFileInput" type="file" accept=".gltf,.glb,.bin,model/gltf+json,model/gltf-binary,application/octet-stream" multiple hidden>
      <button class="scan-file-button" id="chooseScanFile" type="button"><strong>${isRussian() ? 'Выбрать файл скана' : 'Choose scan file'}</strong><span>GLB / GLTF${isRussian() ? ' · BIN при необходимости' : ' · BIN if required'}</span></button>
      <div class="scan-progress" id="scanProgress"><span>Загружаем</span><span>Распознаём</span><span>Проверяем</span></div>
      <p class="scan-question-status" data-scan-status hidden></p>
      <button class="primary-button scan-apply-button" id="scanApplyDimensions" type="button" hidden>${isRussian() ? 'Показать контур в 3D' : 'Show contour in 3D'}</button>
      <p class="scan-file-note">${isRussian() ? 'Для GLTF с отдельным BIN выберите оба файла одновременно. Сжатие Draco/Meshopt пока не поддерживается.' : 'For GLTF with a separate BIN, select both files. Draco/Meshopt compression is not supported yet.'}</p>
    </section>
    <section class="scan-path-panel" id="newScanPanel" hidden>
      <div class="scan-download-grid">
        <button class="scan-download-button" type="button" data-download-provider="POLYCAM"><strong>Polycam</strong><span>${isRussian() ? 'Сканировать и экспортировать GLB без сжатия' : 'Scan and export an uncompressed GLB'}</span></button>
        <button class="scan-download-button" type="button" data-download-provider="SKETCHUP"><strong>SketchUp</strong><span>${isRussian() ? 'Открыть доступный вариант для устройства' : 'Open the available option for this device'}</span></button>
      </div>
    </section>`;
  if (note) card.insertBefore(host, note); else card.appendChild(host);

  const existingButton = host.querySelector('#existingScanPath');
  const newButton = host.querySelector('#newScanPath');
  const existingPanel = host.querySelector('#existingScanPanel');
  const newPanel = host.querySelector('#newScanPanel');
  function choosePath(existing) {
    existingButton.classList.toggle('is-active', existing);
    newButton.classList.toggle('is-active', !existing);
    existingPanel.hidden = !existing;
    newPanel.hidden = existing;
  }
  existingButton.addEventListener('click', () => choosePath(true));
  newButton.addEventListener('click', () => choosePath(false));
  host.querySelectorAll('[data-download-provider]').forEach(button => button.addEventListener('click', () => {
    const provider = SCAN_DOWNLOADS[button.dataset.downloadProvider];
    const platform = devicePlatform();
    if (provider) window.open(provider[platform] || provider.web, '_blank', 'noopener,noreferrer');
  }));
  const input = host.querySelector('#scanFileInput');
  const apply = host.querySelector('#scanApplyDimensions');
  host.querySelector('#chooseScanFile').addEventListener('click', () => input.click());
  input.addEventListener('change', () => processScanSelection(input, host, apply));
}

function roomGeometry() {
  const geometry = roomProject?.room?.geometry || {};
  return {
    lengthMm: measured(geometry, 'wall_length', scanImport?.preliminary_bounds_mm?.lengthMm || 6000),
    widthMm: measured(geometry, 'wall_depth', scanImport?.preliminary_bounds_mm?.widthMm || 4200),
    heightMm: measured(geometry, 'room_height', scanImport?.preliminary_bounds_mm?.heightMm || 2800),
  };
}

function overlayTarget() {
  const geometry = roomGeometry();
  return [0, geometry.widthMm / 2000, geometry.heightMm / 2000 * 0.48];
}
function overlayCameraPosition() {
  const target = overlayTarget();
  const cp = Math.cos(overlayCamera.pitch);
  const sp = Math.sin(overlayCamera.pitch);
  return add(target, [overlayCamera.distance * cp * Math.sin(overlayCamera.yaw), -overlayCamera.distance * cp * Math.cos(overlayCamera.yaw), overlayCamera.distance * sp]);
}
function overlayView() {
  const target = overlayTarget();
  const position = overlayCameraPosition();
  const forward = norm(sub(target, position));
  const right = norm([Math.cos(overlayCamera.yaw), Math.sin(overlayCamera.yaw), 0]);
  const up = norm([-Math.sin(overlayCamera.pitch)*Math.sin(overlayCamera.yaw), Math.sin(overlayCamera.pitch)*Math.cos(overlayCamera.yaw), Math.cos(overlayCamera.pitch)]);
  return { position, forward, right, up };
}
function projectOverlayPoint(point, view, width, height) {
  const relative = sub(point, view.position);
  const x = dot(relative, view.right);
  const y = dot(relative, view.up);
  const z = dot(relative, view.forward);
  if (z <= 0.04) return null;
  const focal = Math.min(width, height) * 1.08;
  return [width / 2 + focal * x / z, height / 2 - focal * y / z, z];
}

function ensureContourCanvas() {
  const base = document.getElementById('roomCanvas');
  if (!base) return null;
  let overlay = document.getElementById('scanContourCanvas');
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'scanContourCanvas';
    overlay.setAttribute('aria-hidden', 'true');
    base.insertAdjacentElement('afterend', overlay);
  }
  return overlay;
}

function drawScanContour() {
  const canvas = ensureContourCanvas();
  if (!canvas) return;
  const contour = scanImport?.contour_segments_m || [];
  const reference = scanImport?.reference_segments_m || [];
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  if (!contour.length && !reference.length) return;
  const view = overlayView();
  const dark = document.documentElement.dataset.theme === 'dark';

  if (reference.length) {
    context.save();
    context.strokeStyle = dark ? 'rgba(244,196,78,.18)' : 'rgba(126,91,19,.18)';
    context.lineWidth = 0.8;
    context.beginPath();
    for (const segment of reference) {
      const a = projectOverlayPoint(segment.slice(0,3), view, width, height);
      const b = projectOverlayPoint(segment.slice(3,6), view, width, height);
      if (!a || !b) continue;
      context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]);
    }
    context.stroke();
    context.restore();
  }

  if (contour.length) {
    const roomHeight = roomGeometry().heightMm / 1000;
    context.save();
    context.strokeStyle = dark ? 'rgba(249,201,74,.96)' : 'rgba(205,137,0,.96)';
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    for (const segment of contour) {
      const [x1, y1, x2, y2] = segment;
      const lines = [
        [[x1,y1,0.01], [x2,y2,0.01]],
        [[x1,y1,roomHeight], [x2,y2,roomHeight]],
        [[x1,y1,0.01], [x1,y1,roomHeight]],
      ];
      for (const [from, to] of lines) {
        const a = projectOverlayPoint(from, view, width, height);
        const b = projectOverlayPoint(to, view, width, height);
        if (!a || !b) continue;
        context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]);
      }
    }
    context.stroke();
    context.restore();
    context.save();
    context.font = '700 11px Inter, sans-serif';
    context.fillStyle = dark ? 'rgba(249,201,74,.96)' : 'rgba(151,96,0,.96)';
    context.fillText(isRussian() ? 'КОНТУР СКАНА → BIZET' : 'SCAN CONTOUR → BIZET', 18, height - 22);
    context.restore();
  }
}

function bindContourCameraSync() {
  const canvas = document.getElementById('roomCanvas');
  if (!canvas || canvas.dataset.contourSync === '1') return;
  canvas.dataset.contourSync = '1';
  canvas.addEventListener('pointerdown', event => {
    overlayPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (overlayPointers.size === 1) overlayDrag = { x: event.clientX, y: event.clientY, yaw: overlayCamera.yaw, pitch: overlayCamera.pitch };
    if (overlayPointers.size === 2) {
      const points = [...overlayPointers.values()];
      overlayPinch = { distance: Math.hypot(points[1].x-points[0].x, points[1].y-points[0].y), cameraDistance: overlayCamera.distance };
    }
  }, { passive: true });
  canvas.addEventListener('pointermove', event => {
    if (!overlayPointers.has(event.pointerId)) return;
    overlayPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (overlayPointers.size === 1 && overlayDrag) {
      const dx = event.clientX - overlayDrag.x;
      const dy = event.clientY - overlayDrag.y;
      overlayCamera.yaw = wrapAngle(overlayDrag.yaw - dx * .005);
      overlayCamera.pitch = wrapAngle(overlayDrag.pitch + dy * .004);
      drawScanContour();
    } else if (overlayPointers.size === 2 && overlayPinch) {
      const points = [...overlayPointers.values()];
      const distance = Math.hypot(points[1].x-points[0].x, points[1].y-points[0].y) || 1;
      overlayCamera.distance = clamp(overlayPinch.cameraDistance * overlayPinch.distance / distance, 3.5, 30);
      drawScanContour();
    }
  }, { passive: true });
  const end = event => {
    overlayPointers.delete(event.pointerId);
    if (!overlayPointers.size) { overlayDrag = null; overlayPinch = null; }
  };
  canvas.addEventListener('pointerup', end, { passive: true });
  canvas.addEventListener('pointercancel', end, { passive: true });
  canvas.addEventListener('wheel', event => {
    overlayCamera.distance = clamp(overlayCamera.distance * Math.exp(event.deltaY * .001), 3.5, 30);
    drawScanContour();
  }, { passive: true });
  document.getElementById('resetViewButton')?.addEventListener('click', () => {
    overlayCamera = { yaw: 0, pitch: 0.34, distance: 8.2 };
    setTimeout(drawScanContour, 10);
  });
  if ('ResizeObserver' in window) new ResizeObserver(drawScanContour).observe(canvas);
  else window.addEventListener('resize', drawScanContour);
}

function buildContourConfirmation() {
  if (document.getElementById('scanContourConfirmation')) return;
  const viewport = document.querySelector('.viewport-card');
  if (!viewport || !scanImport?.contour_segments_m?.length) return;
  const layer = document.createElement('div');
  layer.id = 'scanContourConfirmation';
  layer.className = 'scan-confirm-layer';
  layer.innerHTML = `
    <div class="scan-question-panel scan-confirm-panel">
      <p class="scan-question-kicker">BIZET OS · Scan → Spatial Model</p>
      <h2>${isRussian() ? 'Контур помещения определён верно?' : 'Is the detected room contour correct?'}</h2>
      <p>${isRussian() ? 'Жёлтые линии — контур, который BIZET выделил из GLB. Тонкая сетка — исходный скан-референс.' : 'Yellow lines are the BIZET contour extracted from GLB. The faint mesh is the original scan reference.'}</p>
      <div class="scan-question-actions">
        <button class="scan-question-primary" id="confirmScanContour" type="button">${isRussian() ? 'Да, верно' : 'Yes, correct'}</button>
        <button class="scan-question-secondary" id="correctScanContour" type="button">${isRussian() ? 'Исправить вручную' : 'Correct manually'}</button>
      </div>
    </div>`;
  viewport.appendChild(layer);
  layer.querySelector('#confirmScanContour').addEventListener('click', async () => {
    const button = layer.querySelector('#confirmScanContour');
    button.disabled = true;
    try {
      const bounds = scanImport.preliminary_bounds_mm;
      const confirmed = { ...scanImport, status: 'CONFIRMED' };
      await patchProject('scene.visual_settings.scan_import', confirmed, { reason: 'Client confirmed recognized room contour' });
      await patchProject('scene.visual_settings.geometry_input_mode', 'SCAN_CONFIRMED', { reason: 'Confirmed scan geometry' });
      for (const [path, value] of [
        ['room.geometry.wall_length', bounds.lengthMm],
        ['room.geometry.wall_depth', bounds.widthMm],
        ['room.geometry.room_height', bounds.heightMm],
      ]) await patchProject(path, value, { source:'IMPORTED', confirmed: true, reason: 'Confirmed scan contour bounds' });
      scanImport = confirmed;
      sessionStorage.removeItem(SCAN_CONFIRM_KEY);
      layer.remove();
    } catch (error) {
      button.disabled = false;
      const paragraph = layer.querySelector('p:last-of-type');
      if (paragraph) paragraph.textContent = error.message;
    }
  });
  layer.querySelector('#correctScanContour').addEventListener('click', async () => {
    try {
      scanImport = { ...scanImport, status: 'NEEDS_CORRECTION' };
      await patchProject('scene.visual_settings.scan_import', scanImport, { reason: 'Client requested manual contour correction' });
      await patchProject('scene.visual_settings.geometry_input_mode', 'MANUAL_CORRECTION', { reason: 'Manual correction after scan recognition' });
    } catch (_) {}
    sessionStorage.removeItem(SCAN_CONFIRM_KEY);
    layer.remove();
    const hint = document.getElementById('gestureHint');
    if (hint) hint.textContent = isRussian() ? 'Сверяйте жёлтый контур со сканом · нажмите стену или пол для ручной правки размеров' : 'Compare the yellow contour with the scan · tap a wall or floor to correct dimensions';
  });
}

function clampCeilingPopup() {
  const menu = document.getElementById('ceilingMenu');
  if (!menu) return;
  const portrait = window.matchMedia('(orientation: portrait)').matches && window.innerWidth <= 700;
  menu.style.removeProperty('--ceiling-extra-shift');
  if (!portrait || menu.hidden) return;
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const safe = 12;
    let extra = 0;
    if (rect.left < safe) extra += safe - rect.left;
    if (rect.right + extra > window.innerWidth - safe) extra -= (rect.right + extra) - (window.innerWidth - safe);
    menu.style.setProperty('--ceiling-extra-shift', `${Math.round(extra)}px`);
  });
}

function bindCeilingPopupFix() {
  document.getElementById('ceilingButton')?.addEventListener('click', () => setTimeout(clampCeilingPopup, 0));
  window.addEventListener('resize', () => setTimeout(clampCeilingPopup, 0));
  window.addEventListener('orientationchange', () => setTimeout(clampCeilingPopup, 80));
}

function bindCommunicationsRoute() {
  const button = document.getElementById('startMeasurementButton');
  if (!button) return;
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign('/room-elements?step=communications');
  }, true);
}

async function initialize() {
  applyPilotCopy();
  buildScanPilot();
  bindCeilingPopupFix();
  bindCommunicationsRoute();
  try {
    roomProject = await fetchProject();
    scanImport = roomProject?.scene?.visual_settings?.scan_import || null;
    const camera = roomProject?.scene?.camera || {};
    if (Number.isFinite(camera.yaw)) overlayCamera.yaw = wrapAngle(camera.yaw);
    if (Number.isFinite(camera.pitch)) overlayCamera.pitch = wrapAngle(camera.pitch);
    if (Number.isFinite(camera.distance)) overlayCamera.distance = clamp(camera.distance, 3.5, 30);
  } catch (_) {}

  bindContourCameraSync();
  drawScanContour();
  const params = new URLSearchParams(window.location.search);
  const inputMode = roomProject?.scene?.visual_settings?.geometry_input_mode;
  const needsConfirmation = params.get('scan') === 'confirm' || sessionStorage.getItem(SCAN_CONFIRM_KEY) === '1' || scanImport?.status === 'CONTOUR_CANDIDATE';
  if (needsConfirmation && scanImport?.contour_segments_m?.length) buildContourConfirmation();
  else if (!['MANUAL', 'MANUAL_CORRECTION', 'SCAN_CONFIRMED'].includes(inputMode) && scanImport?.status !== 'CONFIRMED') buildGeometryInputQuestion();
  setTimeout(() => { applyPilotCopy(); drawScanContour(); }, 450);
}

document.getElementById('languageSelect')?.addEventListener('change', () => setTimeout(applyPilotCopy, 0));
document.getElementById('themeSelect')?.addEventListener('change', () => setTimeout(drawScanContour, 0));
initialize();
