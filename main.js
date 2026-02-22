'use strict';

/*
  Bannerfall
  BF7:
    - Movement-only in Play:
      * selecting friendly unit shows reachable hexes (blue dashed)
      * hovering a reachable hex shows path preview
      * clicking a reachable hex moves unit + spends 1 activation
    - Demo Setup button (preset formation) for fast testing
    - Keeps: editor + export/import + build mismatch alarm + turn/acts + log
*/

const GAME_NAME = 'Bannerfall';
const BUILD_ID  = 'BF7T1';

const CONFIG = {
  hexSize: 34,
  board: {
    horizRadius: 8,  // center row = 17
    vertRadius:  5,  // top/bottom = 12
  },
  activationsPerTurn: 3,

  unitStats: {
    INF: { hp: 3, up: 3, mp: 1 },
    CAV: { hp: 2, up: 4, mp: 2 },
    SKR: { hp: 2, up: 2, mp: 2 },
    ARC: { hp: 2, up: 2, mp: 1 },
    GEN: { hp: 2, up: 5, mp: 2 }, // ✅ generals move 2
  },
};

const TERRAIN = {
  clear: { name: 'Clear', fill: 'rgba(255,255,255,0.05)' },
  hills: { name: 'Hills', fill: 'rgba(200,170,110,0.24)' },
  woods: { name: 'Woods', fill: 'rgba(120,200,140,0.24)' },
  rough: { name: 'Rough', fill: 'rgba(180,180,190,0.22)' },
  water: { name: 'Water', fill: 'rgba(120,170,255,0.28)' },
};

const SIDE_STYLE = {
  blue: { fill: 'rgba(70,150,255,0.72)', stroke: 'rgba(200,230,255,0.60)' },
  red:  { fill: 'rgba(255,90,90,0.65)',  stroke: 'rgba(255,210,210,0.55)' },
};

const QUALITY_STYLE = {
  green:   { dot: 'rgba(120,255,120,0.85)', letter: 'G' },
  regular: { dot: 'rgba(225,225,235,0.85)', letter: 'R' },
  veteran: { dot: 'rgba(255,220,120,0.85)', letter: 'V' },
};

const VALID_SIDES = new Set(['blue', 'red']);
const VALID_TYPES = new Set(['INF','CAV','SKR','ARC','GEN']);
const VALID_QUALS = new Set(['green','regular','veteran']);
const VALID_TERRAIN = new Set(Object.keys(TERRAIN));

const HEX_DIRS = [
  { q:  1, r:  0 },
  { q:  1, r: -1 },
  { q:  0, r: -1 },
  { q: -1, r:  0 },
  { q: -1, r:  1 },
  { q:  0, r:  1 },
];

const state = {
  buildId: BUILD_ID,
  htmlBuild: '?',
  buildMismatch: false,

  mode: 'play',      // 'play' | 'edit'
  tool: 'shape',     // 'shape' | 'terrain' | 'units'
  terrainBrush: 'woods',
  unitBrush: { side: 'blue', type: 'INF', quality: 'regular' },

  play: {
    turnSide: 'blue', // 'blue' | 'red'
    actsLeft: CONFIG.activationsPerTurn,
  },

  selection: {
    selectedKey: null,      // "q,r" or null
    moveTargets: new Set(), // Set<"q,r">
    moveCost: new Map(),    // Map<"q,r" -> cost>
    movePrev: new Map(),    // Map<"q,r" -> fromKey>
    hoverPath: null,        // Array<"q,r"> or null
    hoverCost: null,        // number or null
    canMove: false,
  },

  board: {
    active: new Set(),   // Set<"q,r">
    terrain: new Map(),  // Map<"q,r" -> terrainId> (absence = clear)
  },

  units: new Map(),      // Map<"q,r" -> {side,type,quality,hp,up}>

  log: [],
  lastEvent: 'boot',

  ui: {
    hover: null,
    isPainting: false,
    lastPaintedKey: null,
  },

  boardMetrics: null,
};

const view = { ox: 0, oy: 0, size: CONFIG.hexSize };

function $(id){
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function setStatus(text){
  $('statusLine').textContent = text;
}

function ioSetStatus(msg){
  const el = document.getElementById('ioStatus');
  if (el) el.textContent = msg;
}

function hexKey(q, r){ return `${q},${r}`; }
function parseKey(k){
  const [qs, rs] = k.split(',');
  return { q: Number(qs), r: Number(rs) };
}

function keyCompare(a, b){
  const A = parseKey(a);
  const B = parseKey(b);
  return (A.r - B.r) || (A.q - B.q);
}

function nowStamp(){
  try{
    return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }catch{
    return String(Date.now());
  }
}

function logEvent(msg){
  const line = `${nowStamp()} ${msg}`;
  state.log.unshift(line);
  if (state.log.length > 60) state.log.pop();
  state.lastEvent = msg;
  syncLogUI();
}

function syncLogUI(){
  const box = document.getElementById('logList');
  if (!box) return;
  box.innerHTML = '';
  const n = Math.min(state.log.length, 25);
  for (let i = 0; i < n; i++){
    const div = document.createElement('div');
    div.className = 'logItem';
    div.textContent = state.log[i];
    box.appendChild(div);
  }
}

// pointy-top axial -> pixel
function axialToPixel(q, r, size){
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

function pixelToAxial(x, y, size){
  const q = (Math.sqrt(3)/3 * x - 1/3 * y) / size;
  const r = (2/3 * y) / size;
  return { q, r };
}

function axialRound(fracQ, fracR){
  const x = fracQ;
  const z = fracR;
  const y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);

  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;

  return { q: rx, r: rz };
}

function hexCorners(cx, cy, size){
  const pts = [];
  for (let i = 0; i < 6; i++){
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return pts;
}

function drawHexPath(ctx, pts){
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function makeFrameHexes(){
  const R = CONFIG.board.horizRadius;
  const V = CONFIG.board.vertRadius;
  const out = [];
  for (let r = -V; r <= V; r++){
    const qMin = Math.max(-R, -r - R);
    const qMax = Math.min( R, -r + R);
    for (let q = qMin; q <= qMax; q++) out.push({ q, r });
  }
  out.sort((a,b) => (a.r - b.r) || (a.q - b.q));
  return out;
}

function isWithinFrame(q, r){
  const R = CONFIG.board.horizRadius;
  const V = CONFIG.board.vertRadius;
  if (r < -V || r > V) return false;
  const qMin = Math.max(-R, -r - R);
  const qMax = Math.min( R, -r + R);
  return q >= qMin && q <= qMax;
}

function computeBoardMetricsFromActive(activeSet){
  const counts = new Map(); // r -> count
  for (const k of activeSet){
    const { r } = parseKey(k);
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  if (counts.size === 0) return { rows: 0, minRow: 0, maxRow: 0, centerRow: 0 };

  let minRow = Infinity, maxRow = -Infinity;
  for (const c of counts.values()){
    if (c < minRow) minRow = c;
    if (c > maxRow) maxRow = c;
  }
  const centerRow = counts.get(0) || 0;
  return { rows: counts.size, minRow, maxRow, centerRow };
}

function resizeCanvas(canvas, ctx){
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function computeLayout(frameHexes, canvas){
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const hex of frameHexes){
    const p = axialToPixel(hex.q, hex.r, CONFIG.hexSize);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  const islandW = (maxX - minX) + CONFIG.hexSize * 2;
  const islandH = (maxY - minY) + CONFIG.hexSize * 2;

  view.ox = (w - islandW) / 2 + CONFIG.hexSize - minX;
  view.oy = (h - islandH) / 2 + CONFIG.hexSize - minY;
  view.size = CONFIG.hexSize;
}

function getCanvasPoint(ev, canvas){
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function pickHexAt(canvasX, canvasY){
  const localX = canvasX - view.ox;
  const localY = canvasY - view.oy;
  const frac = pixelToAxial(localX, localY, view.size);
  const h = axialRound(frac.q, frac.r);
  if (!isWithinFrame(h.q, h.r)) return null;
  return h;
}

function getTerrainIdAtKey(k){
  return state.board.terrain.get(k) || 'clear';
}

function setTerrainAtKey(k, terrainId){
  if (terrainId === 'clear') state.board.terrain.delete(k);
  else state.board.terrain.set(k, terrainId);
}

function moveCostFor(type, terrainId){
  if (terrainId === 'water') return Infinity;
  if (terrainId === 'clear') return 1;
  if (terrainId === 'hills' || terrainId === 'woods' || terrainId === 'rough'){
    return (type === 'CAV') ? 3 : 2;
  }
  return 1;
}

function clearMoveOverlay(){
  state.selection.moveTargets = new Set();
  state.selection.moveCost = new Map();
  state.selection.movePrev = new Map();
  state.selection.hoverPath = null;
  state.selection.hoverCost = null;
  state.selection.canMove = false;
}

function canMoveSelected(){
  if (state.mode !== 'play') return false;
  if (state.play.actsLeft <= 0) return false;
  const k = state.selection.selectedKey;
  if (!k) return false;
  const u = state.units.get(k);
  if (!u) return false;
  if (u.side !== state.play.turnSide) return false;
  return true;
}

function computeReachable(startKey, unitType, mpBudget){
  const dist = new Map(); // key -> cost
  const prev = new Map(); // key -> fromKey
  const open = [];        // {k,c}

  dist.set(startKey, 0);
  open.push({ k: startKey, c: 0 });

  while (open.length){
    // tiny board => linear scan PQ is fine
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++){
      if (open[i].c < open[bestIdx].c) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    const curBest = dist.get(cur.k);
    if (curBest !== cur.c) continue;

    const { q, r } = parseKey(cur.k);
    for (const d of HEX_DIRS){
      const nq = q + d.q;
      const nr = r + d.r;
      const nk = hexKey(nq, nr);

      if (!state.board.active.has(nk)) continue;
      if (nk !== startKey && state.units.has(nk)) continue;

      const terrainId = getTerrainIdAtKey(nk);
      const step = moveCostFor(unitType, terrainId);
      if (!Number.isFinite(step)) continue;

      const newCost = cur.c + step;
      if (newCost > mpBudget) continue;

      const old = dist.get(nk);
      if (old === undefined || newCost < old){
        dist.set(nk, newCost);
        prev.set(nk, cur.k);
        open.push({ k: nk, c: newCost });
      }
    }
  }

  const targets = new Set();
  for (const [k] of dist){
    if (k !== startKey) targets.add(k);
  }

  return { targets, dist, prev };
}

function buildPath(prevMap, startKey, destKey){
  const path = [];
  let cur = destKey;
  while (cur && cur !== startKey){
    path.push(cur);
    cur = prevMap.get(cur);
  }
  if (cur !== startKey) return null;
  path.push(startKey);
  path.reverse();
  return path;
}

function recomputeMoveOverlay(){
  clearMoveOverlay();
  if (!canMoveSelected()) return;

  const k = state.selection.selectedKey;
  const u = state.units.get(k);
  if (!u) return;

  const stats = CONFIG.unitStats[u.type];
  const mp = stats ? stats.mp : 0;

  const res = computeReachable(k, u.type, mp);
  state.selection.moveTargets = res.targets;
  state.selection.moveCost = res.dist;
  state.selection.movePrev = res.prev;
  state.selection.canMove = true;
}

function toggleActiveHex(q, r){
  const k = hexKey(q, r);
  if (state.board.active.has(k)){
    state.board.active.delete(k);
    state.board.terrain.delete(k);
    state.units.delete(k);
    if (state.selection.selectedKey === k) state.selection.selectedKey = null;
    logEvent(`shape:off ${k}`);
  }else{
    state.board.active.add(k);
    logEvent(`shape:on ${k}`);
  }
  state.boardMetrics = computeBoardMetricsFromActive(state.board.active);
}

function paintTerrainAt(q, r){
  const k = hexKey(q, r);
  if (!state.board.active.has(k)) return;
  setTerrainAtKey(k, state.terrainBrush);
  logEvent(`terrain:${state.terrainBrush} ${k}`);
}

function setMode(nextMode){
  if (state.mode === nextMode) return;
  state.mode = nextMode;

  state.ui.isPainting = false;
  state.ui.lastPaintedKey = null;

  if (nextMode === 'play'){
    logEvent('mode:play');
  }else{
    // entering edit: clear selection + move overlay to avoid confusing stale highlights
    state.selection.selectedKey = null;
    clearMoveOverlay();
    logEvent('mode:edit');
  }

  syncSidebar();
}

function setTool(nextTool){
  state.tool = nextTool;
  logEvent(`tool:${nextTool}`);
  syncSidebar();
}

function setTerrainBrush(nextBrush){
  state.terrainBrush = nextBrush;
  logEvent(`brush:${nextBrush}`);
  syncSidebar();
}

function setUnitBrushSide(side){
  state.unitBrush.side = side;
  logEvent(`ubSide:${side}`);
  syncSidebar();
}

function setUnitBrushType(type){
  state.unitBrush.type = type;
  if (type === 'GEN') state.unitBrush.quality = 'green';
  logEvent(`ubType:${type}`);
  syncSidebar();
}

function setUnitBrushQuality(q){
  if (state.unitBrush.type === 'GEN') return;
  state.unitBrush.quality = q;
  logEvent(`ubQual:${q}`);
  syncSidebar();
}

function placeUnitDirect(q, r, side, type, quality){
  const k = hexKey(q, r);
  if (!state.board.active.has(k)) return false;
  if (state.units.has(k)) return false;
  if (!VALID_SIDES.has(side) || !VALID_TYPES.has(type)) return false;

  const finalQuality = (type === 'GEN') ? 'green' : (VALID_QUALS.has(quality) ? quality : 'regular');
  const stats = CONFIG.unitStats[type];

  state.units.set(k, { side, type, quality: finalQuality, hp: stats.hp, up: stats.up });
  return true;
}

function placeUnitAt(q, r){
  const k = hexKey(q, r);
  if (!state.board.active.has(k)) return;

  const type = state.unitBrush.type;
  const side = state.unitBrush.side;
  const quality = (type === 'GEN') ? 'green' : state.unitBrush.quality;
  const stats = CONFIG.unitStats[type];

  state.units.set(k, { side, type, quality, hp: stats.hp, up: stats.up });
  logEvent(`unit:place ${side} ${type} ${quality} ${k}`);
}

function removeUnitAt(q, r){
  const k = hexKey(q, r);
  if (state.units.delete(k)){
    if (state.selection.selectedKey === k) state.selection.selectedKey = null;
    clearMoveOverlay();
    logEvent(`unit:remove ${k}`);
  }
}

function clearUnits(){
  const n = state.units.size;
  state.units.clear();
  state.selection.selectedKey = null;
  clearMoveOverlay();
  logEvent(`units:clear (${n})`);

  // reset turn state for sanity when building scenarios
  state.play.turnSide = 'blue';
  state.play.actsLeft = CONFIG.activationsPerTurn;
  logEvent(`TURN BLUE (acts=${state.play.actsLeft})`);
}

function applyDemoSetup(){
  clearUnits();

  const P = [
    // BLUE (bottom / +r)
    { q: 0, r: 4, side: 'blue', type: 'GEN', quality: 'green' },
    { q: -1, r: 3, side: 'blue', type: 'INF', quality: 'regular' },
    { q: 0, r: 3, side: 'blue', type: 'INF', quality: 'regular' },
    { q: 1, r: 3, side: 'blue', type: 'INF', quality: 'regular' },
    { q: 0, r: 5, side: 'blue', type: 'ARC', quality: 'regular' },
    { q: -3, r: 2, side: 'blue', type: 'CAV', quality: 'regular' },
    { q: 3, r: 2, side: 'blue', type: 'CAV', quality: 'regular' },
    { q: -2, r: 4, side: 'blue', type: 'SKR', quality: 'regular' },
    { q: 2, r: 4, side: 'blue', type: 'SKR', quality: 'regular' },

    // RED (top / -r)
    { q: 0, r: -4, side: 'red', type: 'GEN', quality: 'green' },
    { q: -1, r: -3, side: 'red', type: 'INF', quality: 'regular' },
    { q: 0, r: -3, side: 'red', type: 'INF', quality: 'regular' },
    { q: 1, r: -3, side: 'red', type: 'INF', quality: 'regular' },
    { q: 0, r: -5, side: 'red', type: 'ARC', quality: 'regular' },
    { q: -3, r: -2, side: 'red', type: 'CAV', quality: 'regular' },
    { q: 3, r: -2, side: 'red', type: 'CAV', quality: 'regular' },
    { q: -2, r: -4, side: 'red', type: 'SKR', quality: 'regular' },
    { q: 2, r: -4, side: 'red', type: 'SKR', quality: 'regular' },
  ];

  let placed = 0;
  for (const u of P){
    if (placeUnitDirect(u.q, u.r, u.side, u.type, u.quality)) placed++;
  }

  ioSetStatus(`Demo Setup placed ${placed} units.`);
  logEvent(`demo:setup placed=${placed}`);
}

/* ========= Play scaffold ========= */

function selectedUnit(){
  const k = state.selection.selectedKey;
  if (!k) return null;
  return state.units.get(k) || null;
}

function selectAtKey(k){
  state.selection.selectedKey = null;
  clearMoveOverlay();

  if (!k){
    logEvent('select:clear');
    return;
  }
  if (!state.units.has(k)){
    logEvent(`select:empty ${k}`);
    return;
  }

  state.selection.selectedKey = k;
  const u = state.units.get(k);
  logEvent(`select:${u.side} ${u.type} ${k}`);

  // compute move overlay if eligible
  recomputeMoveOverlay();
}

function canPassSelected(){
  if (state.mode !== 'play') return false;
  if (state.play.actsLeft <= 0) return false;
  const u = selectedUnit();
  if (!u) return false;
  return u.side === state.play.turnSide;
}

function passActivation(){
  if (!canPassSelected()){
    logEvent('pass:blocked');
    return;
  }
  const k = state.selection.selectedKey;
  const u = selectedUnit();
  state.play.actsLeft = Math.max(0, state.play.actsLeft - 1);
  logEvent(`PASS ${u.side.toUpperCase()} ${u.type} ${k} (acts=${state.play.actsLeft})`);

  recomputeMoveOverlay();

  if (state.play.actsLeft === 0){
    logEvent(`${state.play.turnSide.toUpperCase()} has 0 acts. End Turn.`);
  }
}

function endTurn(){
  if (state.mode !== 'play'){
    logEvent('endTurn:blocked (not in play)');
    return;
  }
  const prev = state.play.turnSide;
  const next = (prev === 'blue') ? 'red' : 'blue';
  state.play.turnSide = next;
  state.play.actsLeft = CONFIG.activationsPerTurn;

  state.selection.selectedKey = null;
  clearMoveOverlay();

  logEvent(`TURN ${next.toUpperCase()} (acts=${state.play.actsLeft})`);
}

function tryMoveTo(destKey){
  if (!canMoveSelected()){
    logEvent('move:blocked');
    return false;
  }
  if (!state.selection.moveTargets.has(destKey)){
    logEvent(`move:blocked destNotReachable ${destKey}`);
    return false;
  }

  const startKey = state.selection.selectedKey;
  const u = selectedUnit();
  if (!u) return false;

  if (state.units.has(destKey)){
    logEvent(`move:blocked occupied ${destKey}`);
    return false;
  }

  const cost = state.selection.moveCost.get(destKey);
  state.units.delete(startKey);
  state.units.set(destKey, u);

  state.play.actsLeft = Math.max(0, state.play.actsLeft - 1);
  state.selection.selectedKey = destKey;

  logEvent(`MOVE ${u.side.toUpperCase()} ${u.type} ${startKey} -> ${destKey} cost=${cost} (acts=${state.play.actsLeft})`);

  // recompute from new position if still has acts
  recomputeMoveOverlay();

  if (state.play.actsLeft === 0){
    logEvent(`${state.play.turnSide.toUpperCase()} has 0 acts. End Turn.`);
  }
  return true;
}

/* ========= Unit rendering ========= */

function drawTokenShape(ctx, type, cx, cy, size){
  ctx.beginPath();
  if (type === 'INF'){
    const s = size * 0.95;
    ctx.rect(cx - s/2, cy - s/2, s, s);
  }else if (type === 'CAV'){
    ctx.moveTo(cx, cy - size * 0.62);
    ctx.lineTo(cx + size * 0.62, cy + size * 0.55);
    ctx.lineTo(cx - size * 0.62, cy + size * 0.55);
    ctx.closePath();
  }else if (type === 'SKR'){
    ctx.moveTo(cx, cy - size * 0.70);
    ctx.lineTo(cx + size * 0.70, cy);
    ctx.lineTo(cx, cy + size * 0.70);
    ctx.lineTo(cx - size * 0.70, cy);
    ctx.closePath();
  }else{
    ctx.arc(cx, cy, size * 0.70, 0, Math.PI * 2);
  }
}

function drawUnit(ctx, cx, cy, unit){
  const sideStyle = SIDE_STYLE[unit.side] || SIDE_STYLE.blue;
  const qStyle = QUALITY_STYLE[unit.quality] || QUALITY_STYLE.regular;
  const size = CONFIG.hexSize * 0.62;

  ctx.save();

  drawTokenShape(ctx, unit.type, cx, cy, size);
  ctx.fillStyle = sideStyle.fill;
  ctx.strokeStyle = sideStyle.stroke;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(245,245,250,0.92)';
  ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(unit.type, cx, cy + 1);

  const bx = cx + size * 0.48;
  const by = cy + size * 0.42;
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fillStyle = qStyle.dot;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(10,10,14,0.92)';
  ctx.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  ctx.fillText(qStyle.letter, bx, by + 0.5);

  if (unit.type === 'GEN'){
    ctx.fillStyle = 'rgba(255,220,120,0.90)';
    ctx.font = 'bold 12px ui-sans-serif, system-ui, -apple-system';
    ctx.fillText('★', cx, cy - size * 0.62);
  }

  ctx.restore();
}

/* ========= Scenario Export / Import ========= */

function scenarioFromState(){
  const active = Array.from(state.board.active).sort(keyCompare);

  const terrainObj = {};
  for (const [k, t] of state.board.terrain.entries()){
    if (state.board.active.has(k)) terrainObj[k] = t;
  }

  const units = [];
  for (const [k, u] of state.units.entries()){
    const { q, r } = parseKey(k);
    units.push({ q, r, side: u.side, type: u.type, quality: u.quality });
  }
  units.sort((a,b) => (a.r - b.r) || (a.q - b.q) || (a.side.localeCompare(b.side)) || (a.type.localeCompare(b.type)));

  return {
    version: 1,
    game: GAME_NAME,
    build: BUILD_ID,
    savedAt: new Date().toISOString(),
    board: { active, terrain: terrainObj },
    units,
  };
}

function normalizeActiveItem(item){
  if (typeof item === 'string'){
    if (!item.includes(',')) return null;
    const { q, r } = parseKey(item);
    if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
    return { q, r };
  }
  if (item && typeof item === 'object'){
    const q = Number(item.q);
    const r = Number(item.r);
    if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
    return { q, r };
  }
  return null;
}

function importScenario(obj){
  if (!obj || typeof obj !== 'object') throw new Error('Scenario JSON root must be an object.');
  if (!obj.board || typeof obj.board !== 'object') throw new Error('Scenario missing "board" object.');
  if (!Array.isArray(obj.board.active)) throw new Error('Scenario "board.active" must be an array.');

  const nextActive = new Set();
  let skippedActive = 0;

  for (const item of obj.board.active){
    const h = normalizeActiveItem(item);
    if (!h) { skippedActive++; continue; }
    if (!isWithinFrame(h.q, h.r)) { skippedActive++; continue; }
    nextActive.add(hexKey(h.q, h.r));
  }
  if (nextActive.size === 0) throw new Error('Scenario "board.active" produced zero valid hexes.');

  const nextTerrain = new Map();
  let skippedTerrain = 0;

  const srcTerrain = obj.board.terrain || {};
  if (srcTerrain && typeof srcTerrain === 'object'){
    for (const [k, t] of Object.entries(srcTerrain)){
      if (!nextActive.has(k)) { skippedTerrain++; continue; }
      if (!VALID_TERRAIN.has(String(t))) { skippedTerrain++; continue; }
      if (String(t) === 'clear') continue;
      nextTerrain.set(k, String(t));
    }
  }

  const nextUnits = new Map();
  let skippedUnits = 0;

  const srcUnits = Array.isArray(obj.units) ? obj.units : [];
  for (const u of srcUnits){
    if (!u || typeof u !== 'object'){ skippedUnits++; continue; }
    const q = Number(u.q);
    const r = Number(u.r);
    if (!Number.isFinite(q) || !Number.isFinite(r)){ skippedUnits++; continue; }

    const k = hexKey(q, r);
    if (!nextActive.has(k)) { skippedUnits++; continue; }
    if (nextUnits.has(k)) { skippedUnits++; continue; }

    const side = String(u.side || '');
    const type = String(u.type || '');
    let quality = String(u.quality || '');

    if (!VALID_SIDES.has(side) || !VALID_TYPES.has(type)){ skippedUnits++; continue; }
    if (type === 'GEN') quality = 'green';
    if (!VALID_QUALS.has(quality)) quality = (type === 'GEN') ? 'green' : 'regular';

    const stats = CONFIG.unitStats[type];
    nextUnits.set(k, { side, type, quality, hp: stats.hp, up: stats.up });
  }

  state.board.active.clear();
  for (const k of nextActive) state.board.active.add(k);

  state.board.terrain.clear();
  for (const [k, t] of nextTerrain) state.board.terrain.set(k, t);

  state.units.clear();
  for (const [k, u] of nextUnits) state.units.set(k, u);

  state.boardMetrics = computeBoardMetricsFromActive(state.board.active);

  state.selection.selectedKey = null;
  clearMoveOverlay();

  state.play.turnSide = 'blue';
  state.play.actsLeft = CONFIG.activationsPerTurn;

  ioSetStatus(`Imported: active=${nextActive.size}, terrain=${nextTerrain.size}, units=${nextUnits.size}. Skipped: active=${skippedActive}, terrain=${skippedTerrain}, units=${skippedUnits}.`);
  logEvent(`io:import ok (active=${nextActive.size} terrain=${nextTerrain.size} units=${nextUnits.size})`);
  logEvent(`TURN BLUE (acts=${state.play.actsLeft})`);
}

/* ========= UI Sync ========= */

function syncTurnUI(){
  const badge = document.getElementById('turnSideBadge');
  const acts = document.getElementById('actsLeft');
  const hint = document.getElementById('turnHint');
  const passBtn = document.getElementById('passBtn');
  const endBtn = document.getElementById('endTurnBtn');

  if (badge) badge.textContent = state.play.turnSide.toUpperCase();
  if (acts) acts.textContent = String(state.play.actsLeft);

  const playOn = (state.mode === 'play');
  const canPass = canPassSelected();

  if (passBtn) passBtn.disabled = !(playOn && canPass);
  if (endBtn) endBtn.disabled = !playOn;

  if (hint){
    if (!playOn){
      hint.textContent = 'Turn controls are active in Play mode only.';
    }else if (state.play.actsLeft === 0){
      hint.textContent = 'No activations left. Click End Turn.';
    }else if (!state.selection.selectedKey){
      hint.textContent = 'Click a unit to select it. Move hexes show for friendly units.';
    }else{
      const u = selectedUnit();
      if (!u) hint.textContent = 'Selection empty. Click a unit.';
      else if (u.side !== state.play.turnSide) hint.textContent = 'Selected unit is not on the current side. No moves.';
      else hint.textContent = 'Click a blue-dashed hex to move (spends 1 act).';
    }
  }
}

function syncSidebar(){
  // Mode buttons
  const playBtn = $('modePlayBtn');
  const editBtn = $('modeEditBtn');
  playBtn.classList.toggle('isActive', state.mode === 'play');
  editBtn.classList.toggle('isActive', state.mode === 'edit');

  $('modeHint').textContent = (state.mode === 'play')
    ? 'Play mode (editor disabled)'
    : 'Edit mode (tools enabled)';

  const editOn = (state.mode === 'edit');

  // Tools
  const shapeBtn = $('toolShape');
  const terrBtn  = $('toolTerrain');
  const unitsBtn = $('toolUnits');

  shapeBtn.disabled = !editOn;
  terrBtn.disabled  = !editOn;
  unitsBtn.disabled = !editOn;

  shapeBtn.classList.toggle('isActive', editOn && state.tool === 'shape');
  terrBtn.classList.toggle('isActive',  editOn && state.tool === 'terrain');
  unitsBtn.classList.toggle('isActive', editOn && state.tool === 'units');

  const toolHint = $('toolHint');
  if (!editOn) toolHint.textContent = 'Switch to Edit mode to use tools.';
  else if (state.tool === 'shape') toolHint.textContent = 'Shape: hover highlights; click toggles active/inactive.';
  else if (state.tool === 'terrain') toolHint.textContent = 'Terrain: click or click-drag to paint. Clear erases.';
  else toolHint.textContent = 'Units: click empty hex to place; click unit to remove.';

  // Terrain palette
  for (const btn of document.querySelectorAll('#terrainPalette .terrainBtn')){
    btn.disabled = !editOn;
    const t = btn.getAttribute('data-terrain') || 'clear';
    btn.classList.toggle('isActive', editOn && t === state.terrainBrush);
  }

  // Unit palette
  const typeIsGen = (state.unitBrush.type === 'GEN');

  for (const btn of document.querySelectorAll('.unitBtn[data-side]')){
    btn.disabled = !editOn;
    const s = btn.getAttribute('data-side');
    btn.classList.toggle('isActive', editOn && s === state.unitBrush.side);
  }

  for (const btn of document.querySelectorAll('.unitBtn[data-utype]')){
    btn.disabled = !editOn;
    const t = btn.getAttribute('data-utype');
    btn.classList.toggle('isActive', editOn && t === state.unitBrush.type);
  }

  for (const btn of document.querySelectorAll('.unitBtn[data-quality]')){
    const q = btn.getAttribute('data-quality');
    btn.disabled = !editOn || (typeIsGen && q !== 'green');
    btn.classList.toggle('isActive', editOn && q === (typeIsGen ? 'green' : state.unitBrush.quality));
  }

  // Scenario IO
  $('exportBtn').disabled = false;
  $('importBtn').disabled = !editOn;
  $('demoSetupBtn').disabled = !editOn;
  $('clearUnitsBtn').disabled = !editOn;

  syncTurnUI();
}

function render(canvas, ctx, frameHexes){
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0b0b0e';
  ctx.fillRect(0, 0, w, h);

  computeLayout(frameHexes, canvas);

  // frame outlines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (const hex of frameHexes){
    const p = axialToPixel(hex.q, hex.r, CONFIG.hexSize);
    const cx = p.x + view.ox;
    const cy = p.y + view.oy;
    const pts = hexCorners(cx, cy, CONFIG.hexSize - 1);
    drawHexPath(ctx, pts);
    ctx.stroke();
  }

  // active + terrain tint
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2a2a36';
  for (const k of state.board.active){
    const hex = parseKey(k);
    const p = axialToPixel(hex.q, hex.r, CONFIG.hexSize);
    const cx = p.x + view.ox;
    const cy = p.y + view.oy;
    const pts = hexCorners(cx, cy, CONFIG.hexSize - 1);

    const tid = getTerrainIdAtKey(k);
    ctx.fillStyle = (TERRAIN[tid] ? TERRAIN[tid].fill : TERRAIN.clear.fill);

    drawHexPath(ctx, pts);
    ctx.fill();
    ctx.stroke();
  }

  // MOVE TARGETS overlay (Play)
  if (state.mode === 'play' && state.selection.canMove && state.selection.moveTargets.size > 0){
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(120,170,255,0.55)';

    for (const k of state.selection.moveTargets){
      const hex = parseKey(k);
      const p = axialToPixel(hex.q, hex.r, CONFIG.hexSize);
      const cx = p.x + view.ox;
      const cy = p.y + view.oy;
      const pts = hexCorners(cx, cy, CONFIG.hexSize - 1);
      drawHexPath(ctx, pts);
      ctx.stroke();
    }

    ctx.restore();
  }

  // PATH PREVIEW (Play hover)
  if (state.mode === 'play' && state.selection.hoverPath && state.selection.hoverPath.length >= 2){
    ctx.save();
    ctx.setLineDash([3, 7]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(140,200,255,0.35)';

    ctx.beginPath();
    for (let i = 0; i < state.selection.hoverPath.length; i++){
      const k = state.selection.hoverPath[i];
      const hex = parseKey(k);
      const p = axialToPixel(hex.q, hex.r, CONFIG.hexSize);
      const cx = p.x + view.ox;
      const cy = p.y + view.oy;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // units
  for (const [k, unit] of state.units){
    const hex = parseKey(k);
    const p = axialToPixel(hex.q, hex.r, CONFIG.hexSize);
    drawUnit(ctx, p.x + view.ox, p.y + view.oy, unit);
  }

  // selection outline (Play) — friend vs enemy color
  if (state.mode === 'play' && state.selection.selectedKey){
    const k = state.selection.selectedKey;
    const u = selectedUnit();
    const hex = parseKey(k);
    const p = axialToPixel(hex.q, hex.r, CONFIG.hexSize);
    const cx = p.x + view.ox;
    const cy = p.y + view.oy;
    const pts = hexCorners(cx, cy, CONFIG.hexSize - 1);

    ctx.lineWidth = 3;
    if (u && u.side === state.play.turnSide) ctx.strokeStyle = 'rgba(255,220,120,0.65)'; // friendly
    else ctx.strokeStyle = 'rgba(200,200,215,0.35)'; // not current side
    drawHexPath(ctx, pts);
    ctx.stroke();
  }

  // hover outline (Edit only)
  if (state.mode === 'edit' && state.ui.hover){
    const hh = state.ui.hover;
    const p = axialToPixel(hh.q, hh.r, CONFIG.hexSize);
    const cx = p.x + view.ox;
    const cy = p.y + view.oy;
    const pts = hexCorners(cx, cy, CONFIG.hexSize - 1);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(180,200,255,0.45)';
    drawHexPath(ctx, pts);
    ctx.stroke();
  }

  const hoverTxt = state.ui.hover ? `(${state.ui.hover.q},${state.ui.hover.r})` : '-';
  const mismatchTxt = state.buildMismatch ? ' !!MISMATCH!!' : '';
  const selTxt = state.selection.selectedKey ? state.selection.selectedKey : '-';
  const selU = selectedUnit();
  const selSide = selU ? selU.side.toUpperCase() : '-';
  const mv = state.selection.moveTargets.size;
  const canMoveTxt = state.selection.canMove ? 'YES' : 'NO';
  const hCost = (state.selection.hoverCost != null) ? state.selection.hoverCost : '-';

  setStatus(
    `${GAME_NAME} | BUILD ${state.buildId} | HTML=${state.htmlBuild} JS=${state.buildId}${mismatchTxt} | ` +
    `MODE ${state.mode.toUpperCase()} | TURN ${state.play.turnSide.toUpperCase()} acts=${state.play.actsLeft} | ` +
    `sel=${selTxt} selSide=${selSide} canMove=${canMoveTxt} mv=${mv} hoverCost=${hCost} | last=${state.lastEvent}`
  );
}

function getHtmlBuild(){
  const meta = document.querySelector('meta[name="bannerfall-build"]');
  return meta ? (meta.getAttribute('content') || '(empty)') : '(missing)';
}

function boot(){
  state.htmlBuild = getHtmlBuild();
  state.buildMismatch = (state.htmlBuild !== BUILD_ID);
  if (state.buildMismatch){
    ioSetStatus(`WARNING: Build mismatch (HTML=${state.htmlBuild}, JS=${BUILD_ID}). You are not seeing a coherent build.`);
    state.lastEvent = `BUILD_MISMATCH html=${state.htmlBuild} js=${BUILD_ID}`;
  }

  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const frameHexes = makeFrameHexes();

  // init: all active
  for (const h of frameHexes) state.board.active.add(hexKey(h.q, h.r));
  state.boardMetrics = computeBoardMetricsFromActive(state.board.active);

  // initial log
  logEvent(`TURN ${state.play.turnSide.toUpperCase()} (acts=${state.play.actsLeft})`);

  // Mode
  $('modePlayBtn').addEventListener('click', () => { setMode('play'); rerender(); });
  $('modeEditBtn').addEventListener('click', () => { setMode('edit'); rerender(); });

  // Turn controls
  $('passBtn').addEventListener('click', () => {
    passActivation();
    syncSidebar();
    rerender();
  });
  $('endTurnBtn').addEventListener('click', () => {
    endTurn();
    syncSidebar();
    rerender();
  });

  // Tools
  $('toolShape').addEventListener('click', () => { if (state.mode==='edit'){ setTool('shape'); rerender(); } });
  $('toolTerrain').addEventListener('click', () => { if (state.mode==='edit'){ setTool('terrain'); rerender(); } });
  $('toolUnits').addEventListener('click', () => { if (state.mode==='edit'){ setTool('units'); rerender(); } });

  // Terrain palette
  for (const btn of document.querySelectorAll('#terrainPalette .terrainBtn')){
    btn.addEventListener('click', () => {
      if (state.mode !== 'edit') return;
      const t = btn.getAttribute('data-terrain') || 'clear';
      if (!VALID_TERRAIN.has(t)) return;
      setTerrainBrush(t);
      rerender();
    });
  }

  // Unit palette
  for (const btn of document.querySelectorAll('.unitBtn[data-side]')){
    btn.addEventListener('click', () => {
      if (state.mode !== 'edit') return;
      const s = btn.getAttribute('data-side') || 'blue';
      if (!VALID_SIDES.has(s)) return;
      setUnitBrushSide(s);
      rerender();
    });
  }
  for (const btn of document.querySelectorAll('.unitBtn[data-utype]')){
    btn.addEventListener('click', () => {
      if (state.mode !== 'edit') return;
      const t = btn.getAttribute('data-utype') || 'INF';
      if (!VALID_TYPES.has(t)) return;
      setUnitBrushType(t);
      rerender();
    });
  }
  for (const btn of document.querySelectorAll('.unitBtn[data-quality]')){
    btn.addEventListener('click', () => {
      if (state.mode !== 'edit') return;
      const q = btn.getAttribute('data-quality') || 'regular';
      if (!VALID_QUALS.has(q)) return;
      setUnitBrushQuality(q);
      rerender();
    });
  }

  // Scenario IO
  $('exportBtn').addEventListener('click', () => {
    const box = $('ioBox');
    const s = scenarioFromState();
    box.value = JSON.stringify(s, null, 2);
    ioSetStatus(`Exported JSON (${box.value.length} chars).`);
    logEvent(`io:export (chars=${box.value.length})`);
    rerender();
  });

  $('importBtn').addEventListener('click', () => {
    if (state.mode !== 'edit'){
      ioSetStatus('Import is disabled in Play mode. Click Edit first.');
      return;
    }
    const box = $('ioBox');
    const txt = box.value.trim();
    if (!txt){
      ioSetStatus('Import failed: textbox is empty.');
      return;
    }
    try{
      const obj = JSON.parse(txt);
      importScenario(obj);
      syncSidebar();
      rerender();
    }catch(e){
      ioSetStatus(`Import failed: ${String(e && e.message ? e.message : e)}`);
      logEvent('io:import error');
      rerender();
    }
  });

  $('demoSetupBtn').addEventListener('click', () => {
    if (state.mode !== 'edit'){
      ioSetStatus('Demo Setup requires Edit mode.');
      return;
    }
    applyDemoSetup();
    syncSidebar();
    rerender();
  });

  $('clearUnitsBtn').addEventListener('click', () => {
    if (state.mode !== 'edit'){
      ioSetStatus('Clear Units requires Edit mode.');
      return;
    }
    clearUnits();
    ioSetStatus('Units cleared (turn reset to BLUE).');
    syncSidebar();
    rerender();
  });

  // Render helpers
  function rerender(){
    resizeCanvas(canvas, ctx);
    render(canvas, ctx, frameHexes);
  }

  // Hover + terrain drag-paint + play path preview
  canvas.addEventListener('mousemove', (ev) => {
    const pt = getCanvasPoint(ev, canvas);
    const h = pickHexAt(pt.x, pt.y);

    const prev = state.ui.hover ? hexKey(state.ui.hover.q, state.ui.hover.r) : null;
    const next = h ? hexKey(h.q, h.r) : null;

    let didChange = false;
    if (prev !== next){
      state.ui.hover = h;
      didChange = true;
    }

    // Play hover path preview
    if (state.mode === 'play'){
      state.selection.hoverPath = null;
      state.selection.hoverCost = null;

      if (h && state.selection.canMove){
        const hk = hexKey(h.q, h.r);
        if (state.selection.moveTargets.has(hk)){
          const startKey = state.selection.selectedKey;
          const path = buildPath(state.selection.movePrev, startKey, hk);
          if (path){
            state.selection.hoverPath = path;
            state.selection.hoverCost = state.selection.moveCost.get(hk) ?? null;
          }
        }
      }
      didChange = true; // we want immediate path feedback
    }

    // Edit drag-paint
    if (state.mode === 'edit' && state.tool === 'terrain' && state.ui.isPainting && (ev.buttons & 1) === 1){
      if (h){
        const k = hexKey(h.q, h.r);
        if (k !== state.ui.lastPaintedKey){
          paintTerrainAt(h.q, h.r);
          state.ui.lastPaintedKey = k;
          didChange = true;
        }
      }
    }

    if (didChange) rerender();
  });

  canvas.addEventListener('mouseleave', () => {
    state.ui.hover = null;
    state.ui.isPainting = false;
    state.ui.lastPaintedKey = null;

    state.selection.hoverPath = null;
    state.selection.hoverCost = null;

    rerender();
  });

  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;

    const pt = getCanvasPoint(ev, canvas);
    const h = pickHexAt(pt.x, pt.y);
    if (!h) return;

    const k = hexKey(h.q, h.r);

    // PLAY MODE: select OR move
    if (state.mode === 'play'){
      if (state.units.has(k)){
        selectAtKey(k);
        syncSidebar();
        rerender();
        return;
      }

      // click reachable destination
      if (state.selection.canMove && state.selection.moveTargets.has(k)){
        tryMoveTo(k);
        syncSidebar();
        rerender();
        return;
      }

      // click empty = clear selection
      selectAtKey(null);
      syncSidebar();
      rerender();
      return;
    }

    // EDIT MODE actions
    if (state.mode !== 'edit') return;

    if (state.tool === 'shape'){
      toggleActiveHex(h.q, h.r);
      syncSidebar();
      rerender();
      return;
    }

    if (state.tool === 'terrain'){
      state.ui.isPainting = true;
      state.ui.lastPaintedKey = null;
      paintTerrainAt(h.q, h.r);
      state.ui.lastPaintedKey = k;
      syncSidebar();
      rerender();
      return;
    }

    if (state.tool === 'units'){
      if (!state.board.active.has(k)) return;
      if (state.units.has(k)) removeUnitAt(h.q, h.r);
      else placeUnitAt(h.q, h.r);
      syncSidebar();
      rerender();
      return;
    }
  });

  window.addEventListener('mouseup', () => {
    if (state.ui.isPainting){
      state.ui.isPainting = false;
      state.ui.lastPaintedKey = null;
      logEvent('paint:up');
      rerender();
    }
  });

  syncSidebar();
  rerender();

  window.BANNERFALL = { state, CONFIG, TERRAIN };
}

window.addEventListener('DOMContentLoaded', () => {
  try{
    boot();
  }catch(err){
    console.error(err);
    const msg = (err && err.message) ? err.message : String(err);
    const status = document.getElementById('statusLine');
    if (status) status.textContent = `BOOT ERROR | BUILD ${BUILD_ID} | ${msg}`;
  }
});
