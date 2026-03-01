(() => {
  'use strict';

  // ===== Bannerfall (D-Day baseline -> RB01 rules engine alignment) =====
  // This build intentionally keeps the Bannerfall UI calm/legible while
  // tightening the mechanics to the rules spec you provided.

  const GAME_NAME = 'Bannerfall';
  const BUILD_ID = (window.POLEMO_BUILD_ID || window.POLEMO_BUILD || 'DEV');

  // --- Board shape (157-hex "island")
  // Rows are r=0..10, each row is a contiguous run of q.
  const DEFAULT_ROWS = [
    { qStart: 2, len: 12 }, // r=0
    { qStart: 1, len: 13 }, // r=1
    { qStart: 1, len: 14 }, // r=2
    { qStart: 0, len: 15 }, // r=3
    { qStart: 0, len: 16 }, // r=4
    { qStart: -1, len: 17 }, // r=5
    { qStart: 0, len: 16 }, // r=6
    { qStart: 0, len: 15 }, // r=7
    { qStart: 1, len: 14 }, // r=8
    { qStart: 1, len: 13 }, // r=9
    { qStart: 2, len: 12 }, // r=10
  ];

  // --- Terrain
  const TERRAIN_DEFS = [
    { id: 'clear', label: 'Clear' },
    { id: 'hills', label: 'Hills' },
    { id: 'woods', label: 'Woods' },
    { id: 'rough', label: 'Rough' },
    { id: 'water', label: 'Water' },
  ];
  const TERRAIN_IDS = new Set(TERRAIN_DEFS.map(t => t.id));
  const TERRAIN_LABEL_BY_ID = new Map(TERRAIN_DEFS.map(t => [t.id, t.label]));

  const SCENARIO_FILTER_OPTIONS = {
    group: [
      { id: 'all', label: 'All Groups' },
      { id: 'demo', label: 'Demo' },
      { id: 'grand', label: 'Grand Battle' },
      { id: 'terrain', label: 'Terrain Pack' },
      { id: 'berserker', label: 'Berserker' },
      { id: 'other', label: 'Other' },
    ],
    lesson: [
      { id: 'all', label: 'All Lessons' },
      { id: 'lines', label: 'Line Discipline' },
      { id: 'center', label: 'Center Pressure' },
      { id: 'screen', label: 'Screen/Skirmish' },
      { id: 'envelopment', label: 'Envelopment/Flank' },
      { id: 'corridor', label: 'Corridor/Congestion' },
      { id: 'river', label: 'River/Fords' },
      { id: 'terrain', label: 'Terrain Tactics' },
      { id: 'general', label: 'General Practice' },
    ],
    size: [
      { id: 'all', label: 'Any Size' },
      { id: 'small', label: 'Small (<=20 units)' },
      { id: 'medium', label: 'Medium (21-50 units)' },
      { id: 'large', label: 'Large (51+ units)' },
    ],
    terrain: [
      { id: 'all', label: 'Any Map' },
      { id: 'open', label: 'Open Field' },
      { id: 'hills', label: 'Hills' },
      { id: 'woods', label: 'Woods' },
      { id: 'rough', label: 'Rough' },
      { id: 'water', label: 'Water' },
      { id: 'mixed', label: 'Mixed Terrain' },
    ],
  };
  const SCENARIO_FILTER_IDS = Object.fromEntries(
    Object.entries(SCENARIO_FILTER_OPTIONS).map(([k, opts]) => [k, new Set(opts.map(o => o.id))])
  );
  const HEX_DIRECTIONS = ['e', 'w', 'ur', 'ul', 'dr', 'dl'];

  // --- Core rules constants
  const ACT_LIMIT = 3; // activations per turn
  const COMMAND_RADIUS_BY_QUALITY = { green: 3, regular: 4, veteran: 5 };
  const RUNNER_COMMAND_RADIUS = 1;
  const DEFAULT_COMMAND_RADIUS = COMMAND_RADIUS_BY_QUALITY.green;
  // Angle bonuses are disabled until we tune pivot/brace and counters further.
  const ENABLE_CAV_ANGLE_BONUS = false;
  const CAV_FLANK_BONUS = 1;
  const CAV_REAR_BONUS = 2;
  // AI pace intentionally slowed so piece-by-piece actions are easier to follow.
  const AI_STEP_DELAY_MS = 400; // ~60% slower than the previous 240ms pace
  const AI_START_DELAY_MS = 300;
  const MOVE_ANIM_STEP_MS_HUMAN = 170;
  const MOVE_ANIM_STEP_MS_AI = 340;
  const ACTION_PULSE_MOVE_MS = 480;
  const ACTION_PULSE_ATTACK_MS = 900;
  const INF_SUPPORT_MAX_RANKS = 2;
  const INF_SUPPORT_DICE_PER_RANK = 1;
  const AI_DIFFICULTY_PROFILES = {
    levy: {
      label: 'Levy',
      attackScale: 0.82,
      moveScale: 0.90,
      genFocusBonus: 2,
      attackNoise: 8,
      moveNoise: 5,
      passChance: 0.18,
      attackBias: -1.0,
      moveBias: 1.4,
    },
    cohort: {
      label: 'Cohort',
      attackScale: 1.00,
      moveScale: 1.00,
      genFocusBonus: 6,
      attackNoise: 3.2,
      moveNoise: 2.3,
      passChance: 0.06,
      attackBias: 0.0,
      moveBias: 0.0,
    },
    legion: {
      label: 'Legion',
      attackScale: 1.14,
      moveScale: 1.08,
      genFocusBonus: 12,
      attackNoise: 1.0,
      moveNoise: 0.8,
      passChance: 0.01,
      attackBias: 1.5,
      moveBias: -0.2,
    },
  };
  const RANDOM_START_SCENARIO_NAME = 'Randomized Opening (Auto)';
  const RANDOM_START_UNITS_PER_SIDE = 30;
  const HISTORICAL_SCENARIO_ORDER = [
    'Terrain K — Marathon (490 BCE)',
    'Terrain L — Granicus River (334 BCE)',
    'Terrain M — Cannae Double Envelopment (216 BCE)',
    'Terrain P — Ilipa Reverse Deployment (206 BCE)',
    'Terrain O — Zama (202 BCE)',
    'Terrain Q — Carhae (Carrhae, 53 BCE)',
    'Terrain N — Pharsalus Reserve Counterstroke (48 BCE)',
    'Terrain R — Thapsus Coastal Pressure (46 BCE)',
    'Terrain S — Philippi Twin Camps (42 BCE)',
    'Terrain G — Teutoburg Ambush (9 CE)',
  ];
  const HISTORICAL_SCENARIO_INDEX = new Map(HISTORICAL_SCENARIO_ORDER.map((name, idx) => [name, idx]));
  const SCENARIO_SECTION_ORDER = ['quick', 'mirrored', 'nonMirrored', 'historical', 'demo', 'other'];
  const SCENARIO_SECTION_LABEL = {
    quick: 'Quick Start',
    mirrored: 'Mirrored Battles',
    nonMirrored: 'Non-Mirrored Battles',
    historical: 'Historical Battles',
    demo: 'Learning Demos',
    other: 'Other',
  };
  const DRAFT_BUDGET_MIN = 20;
  const DRAFT_BUDGET_MAX = 300;
  const DRAFT_BUDGET_DEFAULT = 120;

  // Dice faces: 5–6 = Hit, 4 = Retreat.
  const DIE_HIT = new Set([5, 6]);
  const DIE_RETREAT = 4;

  // --- Units (Bannerfall quality-aware stats)
  // HP and UP vary by quality (green / regular / veteran).
  const UNIT_DEFS = [
    // id, label, abbrev, symbol, MP, quality stats, combat profile
    {
      id: 'inf', label: 'Infantry', abbrev: 'INF', symbol: 'INF', move: 1,
      hpByQuality: { green: 3, regular: 4, veteran: 5 },
      upByQuality: { green: 3, regular: 5, veteran: 7 },
      meleeDice: 2, ranged: null,
    },
    {
      id: 'cav', label: 'Cavalry', abbrev: 'CAV', symbol: 'CAV', move: 2,
      hpByQuality: { green: 2, regular: 3, veteran: 4 },
      upByQuality: { green: 6, regular: 8, veteran: 10 },
      meleeDice: 3, ranged: null,
    },
    {
      id: 'skr', label: 'Skirmishers', abbrev: 'SKR', symbol: 'SKR', move: 2,
      hpByQuality: { green: 1, regular: 2, veteran: 3 },
      upByQuality: { green: 2, regular: 3, veteran: 4 },
      meleeDice: 1, ranged: { 2: 1 }, // fixed range 2
    },
    {
      id: 'arc', label: 'Archers', abbrev: 'ARC', symbol: '➶', move: 1,
      hpByQuality: { green: 1, regular: 2, veteran: 3 },
      upByQuality: { green: 2, regular: 4, veteran: 6 },
      meleeDice: 1, ranged: { 2: 2, 3: 1 }, // range 2–3 only
    },
    {
      id: 'gen', label: 'General', abbrev: 'GEN', symbol: '★', move: 2,
      hpByQuality: { green: 2, regular: 3, veteran: 4 },
      upByQuality: { green: 8, regular: 10, veteran: 12 },
      meleeDice: 1, ranged: null,
    },
    {
      id: 'run', label: 'Runner', abbrev: 'RUN', symbol: '👣', move: 3,
      hpByQuality: { green: 2, regular: 2, veteran: 2 },
      upByQuality: { green: 1, regular: 2, veteran: 3 },
      meleeDice: 0, ranged: null,
    },
    {
      // Ancient Greek "iatros" = physician. This unit is a non-combat healer.
      id: 'iat', label: 'Medic', abbrev: 'Medic', symbol: '✚', move: 1,
      hpByQuality: { green: 1, regular: 1, veteran: 1 },
      upByQuality: { green: 4, regular: 4, veteran: 4 },
      meleeDice: 0, ranged: null,
    },
  ];

  const UNIT_BY_ID = new Map(UNIT_DEFS.map(u => [u.id, u]));

  function qualityStatValue(table, quality, fallback = 0) {
    if (!table || typeof table !== 'object') return fallback;
    if (quality && Object.prototype.hasOwnProperty.call(table, quality)) return table[quality];
    if (Object.prototype.hasOwnProperty.call(table, 'green')) return table.green;
    return fallback;
  }

  function unitMaxHp(type, quality) {
    const def = UNIT_BY_ID.get(type);
    return qualityStatValue(def?.hpByQuality, quality, 1);
  }

  function unitUpValue(type, quality) {
    const def = UNIT_BY_ID.get(type);
    return qualityStatValue(def?.upByQuality, quality, 0);
  }

  function unitMovePoints(unit) {
    if (!unit) return 0;
    const def = UNIT_BY_ID.get(unit.type);
    if (!def) return 0;

    // Runner quality affects mobility only:
    // Green = base, Regular = +1, Veteran = +2.
    if (unit.type === 'run') {
      if (unit.quality === 'veteran') return def.move + 2;
      if (unit.quality === 'regular') return def.move + 1;
      return def.move;
    }

    return def.move;
  }

  const FORWARD_AXIS_IDS = new Set(['vertical', 'horizontal', 'diag_tl_br', 'diag_tr_bl']);

  function normalizeForwardAxis(axis) {
    return FORWARD_AXIS_IDS.has(axis) ? axis : 'vertical';
  }

  function forwardAxisLabel(axis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return 'Horizontal (Blue right)';
    if (a === 'diag_tl_br') return 'Diagonal TL->BR (Blue down-right)';
    if (a === 'diag_tr_bl') return 'Diagonal TR->BL (Blue down-left)';
    return 'Vertical (Blue down)';
  }

  function normalizeAiDifficulty(level) {
    return Object.prototype.hasOwnProperty.call(AI_DIFFICULTY_PROFILES, level) ? level : 'cohort';
  }

  function aiDifficultyProfile(level = state.aiDifficulty) {
    return AI_DIFFICULTY_PROFILES[normalizeAiDifficulty(level)] || AI_DIFFICULTY_PROFILES.cohort;
  }

  function aiDifficultyLabel(level = state.aiDifficulty) {
    return aiDifficultyProfile(level).label;
  }

  function sideForwardDirection(side, axis = state.forwardAxis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return (side === 'blue') ? 'e' : 'w';
    if (a === 'diag_tl_br') return (side === 'blue') ? 'dr' : 'ul';
    if (a === 'diag_tr_bl') return (side === 'blue') ? 'dl' : 'ur';
    return (side === 'blue') ? 'down' : 'up';
  }

  function oppositeDirection(dir) {
    switch (dir) {
      case 'e': return 'w';
      case 'w': return 'e';
      case 'ur': return 'dl';
      case 'dl': return 'ur';
      case 'ul': return 'dr';
      case 'dr': return 'ul';
      case 'up': return 'down';
      case 'down': return 'up';
      default: return null;
    }
  }

  function adjacentDirection(fromKey, toKey) {
    for (const d of HEX_DIRECTIONS) {
      if (stepKeyInDirection(fromKey, d) === toKey) return d;
    }
    return null;
  }

  const LINE_AXIS_PAIRS = [
    ['w', 'e'],
    ['ul', 'dr'],
    ['ur', 'dl'],
  ];
  const LINE_ADVANCE_DIRECTION_ORDER = ['ul', 'ur', 'e', 'dr', 'dl', 'w'];
  const LINE_ADVANCE_DIRECTION_LABELS = {
    e: 'Right',
    w: 'Left',
    ur: 'Up-Right',
    ul: 'Up-Left',
    dr: 'Down-Right',
    dl: 'Down-Left',
  };

  function normalizeLineAdvanceDirection(dir) {
    return HEX_DIRECTIONS.includes(dir) ? dir : null;
  }

  function lineAdvanceDirectionLabel(dir) {
    const k = normalizeLineAdvanceDirection(dir);
    if (!k) return 'Auto';
    return LINE_ADVANCE_DIRECTION_LABELS[k] || k.toUpperCase();
  }

  function axisLateralDirections(axis = state.forwardAxis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return ['up', 'down'];
    if (a === 'diag_tl_br') return ['ur', 'dl'];
    if (a === 'diag_tr_bl') return ['ul', 'dr'];
    return ['w', 'e'];
  }

  function directionDeltaAtHex(direction, hex) {
    if (!hex) return null;
    const odd = !!(hex.r & 1);

    switch (direction) {
      case 'e': return { dq: +1, dr: 0 };
      case 'w': return { dq: -1, dr: 0 };
      case 'ur': return odd ? { dq: +1, dr: -1 } : { dq: 0, dr: -1 };
      case 'ul': return odd ? { dq: 0, dr: -1 } : { dq: -1, dr: -1 };
      case 'dr': return odd ? { dq: +1, dr: +1 } : { dq: 0, dr: +1 };
      case 'dl': return odd ? { dq: 0, dr: +1 } : { dq: -1, dr: +1 };
      case 'up': return { dq: 0, dr: -1 };
      case 'down': return { dq: 0, dr: +1 };
      default: return null;
    }
  }

  function stepKeyInDirection(fromKey, direction) {
    const h = board.byKey.get(fromKey);
    if (!h) return null;

    const d = directionDeltaAtHex(direction, h);
    if (!d) return null;

    const nk = key(h.q + d.dq, h.r + d.dr);
    if (!board.activeSet.has(nk)) return null;
    if (!h.neigh.includes(nk)) return null;
    return nk;
  }

  function generalCommandRadius(generalUnit) {
    if (!generalUnit || generalUnit.type !== 'gen') return DEFAULT_COMMAND_RADIUS;
    return qualityStatValue(COMMAND_RADIUS_BY_QUALITY, generalUnit.quality, DEFAULT_COMMAND_RADIUS);
  }

  function commandRadiusForUnit(unit) {
    if (!unit) return 0;
    if (unit.type === 'gen') return generalCommandRadius(unit);
    if (unit.type === 'run') return RUNNER_COMMAND_RADIUS;
    return 0;
  }

  function isCommandSourceUnit(unit) {
    return !!unit && (unit.type === 'gen' || unit.type === 'run');
  }

  // === UNIT ICONS (Berserker) ===
  // White-on-transparent PNGs rendered over blue/red token fills.
  // Cache-busted with BUILD_ID so Safari/GitHub Pages doesn’t haunt you.
  const UNIT_ICON_SOURCES = {
    arc: 'assets/icon_arc.png', // Archer  -> arrow
    inf: 'assets/icon_inf.png', // Infantry -> sword
    skr: 'assets/icon_skr.png', // Skirmisher -> sling
    cav: 'assets/icon_cav.png', // Cavalry -> horse
  };

  const UNIT_ICONS = {};
  let UNIT_ICONS_READY = false;

  function loadUnitIcons() {
    const entries = Object.entries(UNIT_ICON_SOURCES);
    let remaining = entries.length;
    UNIT_ICONS_READY = false;

    for (const [type, src] of entries) {
      const img = new Image();
      img.onload = () => {
        remaining -= 1;
        if (remaining <= 0) {
          UNIT_ICONS_READY = true;
          // Force a redraw once icons are in memory.
          try { draw(); } catch (_) {}
        }
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining <= 0) {
          // Even if some fail, we can still draw (fallback to text).
          try { draw(); } catch (_) {}
        }
      };
      img.src = `${src}?v=${encodeURIComponent(BUILD_ID)}`;
      UNIT_ICONS[type] = img;
    }
  }

  function unitIconReady(type) {
    const img = UNIT_ICONS[type];
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  // Per-type tuning so icons feel proportional inside the token disc.
  const UNIT_ICON_TUNE = {
    arc: { scale: 1.12, y: -0.08 }, // a touch bigger + slightly up
    inf: { scale: 0.95, y:  0.00, rot: -0.616 },
    skr: { scale: 0.95, y:  0.00 },
    cav: { scale: 0.95, y:  0.00 },
  };

  loadUnitIcons();
  // === END UNIT ICONS ===


  const QUALITY_ORDER = ['green', 'regular', 'veteran'];

  // Odd-r offset neighbors (pointy-top).
  const NEIGH_EVEN = [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]];
  const NEIGH_ODD = [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];

  // --- DOM
  const elCanvas = document.getElementById('c');
  const ctx = elCanvas.getContext('2d');

  const elHudTitle = document.getElementById('hudTitle');
  const elHudMeta = document.getElementById('hudMeta');
  const elHudLast = document.getElementById('hudLast');

  const elModeBtn = document.getElementById('modeBtn');
  const elGameModeSel = document.getElementById('gameModeSel');
  const elPlayerSideSel = document.getElementById('playerSideSel');
  const elAiDifficultySel = document.getElementById('aiDifficultySel');
  const elForwardAxisSel = document.getElementById('forwardAxisSel');
  const elToolUnits = document.getElementById('toolUnits');
  const elToolTerrain = document.getElementById('toolTerrain');

  const elSideBlue = document.getElementById('sideBlue');
  const elSideRed = document.getElementById('sideRed');

  const elTypeBtns = document.getElementById('typeBtns');
  const elEraseBtn = document.getElementById('eraseBtn');

  const elQualityGreen = document.getElementById('qGreen');
  const elQualityRegular = document.getElementById('qRegular');
  const elQualityVeteran = document.getElementById('qVeteran');

  const elTerrainBtns = document.getElementById('terrainBtns');

  const elScenarioSel = document.getElementById('scenarioSel');
  const elScenarioGroupSel = document.getElementById('scenarioGroupSel');
  const elScenarioLessonSel = document.getElementById('scenarioLessonSel');
  const elScenarioSizeSel = document.getElementById('scenarioSizeSel');
  const elScenarioTerrainSel = document.getElementById('scenarioTerrainSel');
  const elDraftModeSel = document.getElementById('draftModeSel');
  const elDraftBudgetInput = document.getElementById('draftBudgetInput');
  const elStartDraftBtn = document.getElementById('startDraftBtn');
  const elDraftDoneBtn = document.getElementById('draftDoneBtn');
  const elDraftStatus = document.getElementById('draftStatus');
  const elExportStateBtn = document.getElementById('exportStateBtn');
  const elImportStateBtn = document.getElementById('importStateBtn');
  const elStateFileInput = document.getElementById('stateFileInput');
  const elDiceSummary = document.getElementById('diceSummary');
  const elPhysicalDiceRow = document.getElementById('physicalDiceRow');
  const elDicePerDie = document.getElementById('dicePerDie');
  const elDiceOutcomeBrief = document.getElementById('diceOutcomeBrief');
  const elDiceTray = document.getElementById('diceTray');
  const elInspectorTitle = document.getElementById('inspectorTitle');
  const elInspectorMeta = document.getElementById('inspectorMeta');
  const elInspectorSide = document.getElementById('inspectorSide');
  const elInspectorType = document.getElementById('inspectorType');
  const elInspectorQuality = document.getElementById('inspectorQuality');
  const elInspectorHp = document.getElementById('inspectorHp');
  const elInspectorUp = document.getElementById('inspectorUp');
  const elInspectorMove = document.getElementById('inspectorMove');
  const elInspectorAttack = document.getElementById('inspectorAttack');
  const elCombatSummary = document.getElementById('combatSummary');
  const elCombatMath = document.getElementById('combatMath');
  const elCombatTerrain = document.getElementById('combatTerrain');
  const elCombatSupport = document.getElementById('combatSupport');
  const elModifierPreview = document.getElementById('modifierPreview');
  const elVictoryTrackBody = document.getElementById('victoryTrackBody');
  const elForceTotals = document.getElementById('forceTotals');
  const elRulesOpenBtn = document.getElementById('rulesOpenBtn');
  const elRulesModal = document.getElementById('rulesModal');
  const elRulesModalTitle = document.getElementById('rulesModalTitle');
  const elRulesModalBody = document.getElementById('rulesModalBody');
  const elRulesCloseBtn = document.getElementById('rulesCloseBtn');
  const elCombatHint = document.getElementById('combatHint');
  const elCombatCols = Array.from(document.querySelectorAll('#combatRail .combatCol'));
  const COMBAT_RULE_HINT = 'Rules: 5-6 hit, 4 retreat, 1-3 miss. Woods and some hill/tree-line positions reduce attacker dice (minimum 1). ARC/SKR in woods fire only from tree-line. ARC/SKR on hills gain +1 ranged die (no range increase). Rough attacks are -1 die. Reinforcement: two adjacent friendly INF touching the defender brace opposite attack sides for -1 die (one line deep only).';
  const RULES_FULL_HTML = `
    <h4>Bannerfall At A Glance</h4>
    <p>Bannerfall is a hex-grid tactics game about cohesion, command, and collapse. The central idea is simple: an army wins by staying coordinated while forcing the enemy to lose shape. Units are formations, not heroes. Position and command matter more than flashy abilities.</p>
    <h4>How A Battle Starts</h4>
    <p>In local play, Blue always acts first. In online multiplayer, once both players connect and the battle begins, the starting side is randomized between Blue and Red.</p>
    <p>Every turn has up to 3 activations. Most units can act once each turn. You can end your turn early, but if you spend all 3 activations, the turn ends automatically.</p>
    <h4>Unit Types, Movement, And Role</h4>
    <p>Base movement: INF 1, ARC 1, CAV 2, SKR 2, GEN 2, RUN 3/4/5 by quality, MED 1. Veterans, skirmishers, and runners can withdraw 1 hex from engagement if the destination is safe.</p>
    <ul>
      <li>INF: line holder, 2 melee dice.</li>
      <li>CAV: shock unit, 3 melee dice.</li>
      <li>SKR: flexible screen, 1 melee die, 1 ranged die at range 2.</li>
      <li>ARC: ranged pressure, 1 melee die, 2 ranged dice at range 2 and 1 die at range 3.</li>
      <li>GEN: command anchor, 1 melee die.</li>
      <li>RUN: messenger/relay, no attack, command relay radius 1.</li>
      <li>MED: healer, no attack, restores +1 HP to one adjacent friendly unit as its action.</li>
    </ul>
    <h4>HP, UP, And Why They Matter</h4>
    <p>HP is durability. A unit at 0 HP is destroyed. UP is strategic value used for force totals and Clear Victory scoring. Experience (Green/Regular/Veteran) mainly changes HP/UP and command independence, not your basic hit table.</p>
    <p>Reference values:</p>
    <ul>
      <li>INF HP 3/4/5, UP 3/5/7</li>
      <li>CAV HP 2/3/4, UP 6/8/10</li>
      <li>SKR HP 1/2/3, UP 2/3/4</li>
      <li>ARC HP 1/2/3, UP 2/4/6</li>
      <li>GEN HP 2/3/4, UP 8/10/12</li>
      <li>RUN HP 2/2/2, UP 1/2/3</li>
      <li>MED HP 1/1/1, UP 4</li>
    </ul>
    <h4>Terrain And Friction</h4>
    <p>Terrain defines lanes and tempo. Clear costs 1 move for all units. INF enters Woods/Hills/Rough at cost 1 (and entering a Hill ends further movement that activation; INF also pauses next turn after entering Woods/Hills/Rough). SKR enters Woods at cost 2 and enters Hills/Rough at cost 1; SKR are not slowed by Hills. ARC enters Woods/Hills/Rough at cost 1 (entering a Hill ends further movement that activation; entering Woods still causes next-turn pause). GEN enters Hills/Rough at cost 2 (entering a Hill ends further movement that activation). CAV enters Woods/Hills/Rough at cost 2 and must pause next turn after entering any of those terrains. RUN enters Woods/Hills one hex at a time and enters Rough normally but still pauses next turn after entering Rough. MED can only enter Woods among difficult terrain, and pauses next turn after entering Woods. Water is impassable for all units.</p>
    <p>Woods provide defense: attacker rolls -1 die (minimum 1). Archers and skirmishers in Woods can only fire if their woods hex is adjacent to Clear (tree-line fire). ARC/SKR defending from tree-line also give attacker -1 die. ARC/SKR defending on Hills give attacker -1 die. ARC/SKR attacking from Hills gain +1 ranged die (no range increase). Any attack launched from Rough suffers -1 die.</p>
    <h4>Command System</h4>
    <p>Most units need command coverage to function fully. General radius: Green 3, Regular 4, Veteran 5. Runner relay radius: 1.</p>
    <ul>
      <li>Green INF/ARC/SKR out of command: cannot activate.</li>
      <li>Regular INF/ARC/SKR out of command: can attack but cannot move.</li>
      <li>CAV and all Veteran units ignore command restrictions.</li>
    </ul>
    <h4>Combat Resolution</h4>
    <p>Each die is read as: 5-6 hit, 4 retreat, 1-3 miss. Hits remove 1 HP each. Retreats push the defender away from the attacker. If a retreat is blocked by map edge, water, terrain legality, or occupation, that retreat converts into an additional hit.</p>
    <p>This makes combat about geometry as much as damage: displacement can open gaps, break fronts, and trigger collapse.</p>
    <h4>Infantry Reinforcement Rule</h4>
    <p>An infantry defender is reinforced only when it has a touching adjacent pair of friendly infantry. If the attack comes from the opposite brace directions, attacker dice are reduced by 1 (minimum 1 die). Reinforcement is one line deep only.</p>
    <p>UI cue: light cyan marks reinforced units; darker cyan marks the units providing the brace.</p>
    <h4>Line Advance</h4>
    <p>Line Advance is an infantry-only formation action. It spends 1 activation and attempts to move a contiguous eligible infantry line one step in your selected non-lateral direction based on the line's orientation. It does not include attacks. Some units may move while blocked units remain in place.</p>
    <h4>Victory Conditions</h4>
    <ul>
      <li>Clear Victory: capture at least half of the opponent's starting UP.</li>
      <li>Decapitation: eliminate all enemy generals.</li>
      <li>Annihilation: eliminate all enemy units.</li>
    </ul>
    <p>Once battle starts, the selected victory condition is locked until you return to Setup.</p>
  `;
  let diceRenderNonce = 0;

  const elVictorySel = document.getElementById('victorySel');
  const elEndTurnBtn = document.getElementById('endTurnBtn');
  const elLineAdvanceBtn = document.getElementById('lineAdvanceBtn');
  const elLineAdvanceDirSel = document.getElementById('lineAdvanceDirSel');
  const elOnlineHostBtn = document.getElementById('onlineHostBtn');
  const elOnlineJoinBtn = document.getElementById('onlineJoinBtn');
  const elOnlineLeaveBtn = document.getElementById('onlineLeaveBtn');
  const elOnlineMyCode = document.getElementById('onlineMyCode');
  const elOnlineJoinCode = document.getElementById('onlineJoinCode');
  const elOnlineRoleHint = document.getElementById('onlineRoleHint');
  const elOnlineStatus = document.getElementById('onlineStatus');

  if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // --- State
  const state = {
    mode: 'edit', // 'edit' | 'play'
    tool: 'units', // 'units' | 'terrain'

    editSide: 'blue',
    editType: 'inf',
    editQuality: 'green',
    editErase: false,
    editTerrain: 'clear',

    // Play
    gameMode: 'hvai', // 'hvh' | 'hvai' | 'online'
    humanSide: 'blue', // local player side in Human vs AI
    aiDifficulty: 'cohort', // 'levy' | 'cohort' | 'legion'
    forwardAxis: 'vertical', // 'vertical' | 'horizontal' | 'diag_tl_br' | 'diag_tr_bl'
    turn: 1,
    side: 'blue',
    actsUsed: 0,
    actedUnitIds: new Set(),

    // Visual toggles
    showCommand: true,
    terrainTheme: 'battlefield',

    selectedKey: null,

    // Current activation context (only while a unit is selected in Play)
    // { unitId, committed, moved, attacked, healed, inCommandStart, moveSpent, postAttackWithdrawOnly }
    act: null,

    victoryMode: 'clear',
    initialUP: { blue: 0, red: 0 },
    capturedUP: { blue: 0, red: 0 },

    gameOver: false,
    winner: null,

    // Minimal "event trace" (future UI can display this without changing rules)
    events: [],

    lastImport: null, // { source, at }
    aiBusy: false,
    aiTimer: null,
    lastCombat: null,
    moveAnim: null,
    moveAnimRaf: null,
    actionPulse: null,
    actionPulseRaf: null,
    lineAdvancePreviewHover: false,
    lineAdvanceDir: null,

    draft: {
      active: false,
      mode: 'off', // 'off' | 'visible' | 'fog'
      budget: DRAFT_BUDGET_DEFAULT,
      remaining: { blue: 0, red: 0 },
      done: { blue: false, red: false },
      side: 'blue',
      reveal: true,
    },

    last: 'Booting…',
  };

  const net = {
    peer: null,
    conn: null,
    isHost: false,
    connected: false,
    myCode: '',
    remoteCode: '',
    status: 'Online: idle.',
    applyingRemoteSnapshot: false,
  };

  const ONLINE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const ONLINE_CODE_LENGTH = 4;
  const ONLINE_PEER_PREFIX = 'cyb-';

  function normalizeSide(side) {
    return side === 'red' ? 'red' : 'blue';
  }

  function opposingSide(side) {
    return normalizeSide(side) === 'blue' ? 'red' : 'blue';
  }

  function aiSide() {
    return opposingSide(state.humanSide);
  }

  function randomStartSide() {
    return Math.random() < 0.5 ? 'blue' : 'red';
  }

  // --- Board model
  function key(q, r) { return `${q},${r}`; }

  function buildBoardFromRows(rows) {
    const active = [];
    const activeSet = new Set();
    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let q = row.qStart; q < row.qStart + row.len; q++) {
        const k = key(q, r);
        active.push({ q, r, k, terrain: 'clear', cx: 0, cy: 0, neigh: [] });
        activeSet.add(k);
        minQ = Math.min(minQ, q);
        maxQ = Math.max(maxQ, q);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
      }
    }

    const byKey = new Map(active.map(h => [h.k, h]));

    // Precompute ACTIVE neighbors (movement & adjacency checks)
    for (const h of active) {
      const deltas = (h.r & 1) ? NEIGH_ODD : NEIGH_EVEN;
      h.neigh = [];
      for (const [dq, dr] of deltas) {
        const nk = key(h.q + dq, h.r + dr);
        if (activeSet.has(nk)) h.neigh.push(nk);
      }
    }

    return { active, activeSet, byKey, minQ, maxQ, minR, maxR };
  }

  const board = buildBoardFromRows(DEFAULT_ROWS);

  // Units live in a Map keyed by hex key.
  const unitsByHex = new Map();
  let nextUnitId = 1;

  // --- Scenarios (tiny demos)
  // We keep the existing demos as placeholders; we can retune them into
  // "Even Lines / Encirclement / Corridor" once RB01 feels solid.
  const SCENARIOS = {
    'Empty (Island)': {
      terrain: [],
      units: [],
    },
    'Demo A — Line Clash': {
      terrain: [],
      units: [
        // Blue
        { q: 2, r: 5, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 4, side: 'blue', type: 'inf', quality: 'green' },
        { q: 3, r: 6, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 5, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 6, side: 'blue', type: 'skr', quality: 'green' },

        // Red
        { q: 13, r: 5, side: 'red', type: 'gen', quality: 'green' },
        { q: 12, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 12, r: 6, side: 'red', type: 'inf', quality: 'green' },
        { q: 11, r: 5, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 4, side: 'red', type: 'arc', quality: 'green' },
        { q: 13, r: 6, side: 'red', type: 'skr', quality: 'green' },
      ],
    },
    'Demo B — Center Push': {
      terrain: [],
      units: [
        { q: 4, r: 4, side: 'blue', type: 'gen', quality: 'green' },
        { q: 4, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'blue', type: 'cav', quality: 'green' },
        { q: 3, r: 6, side: 'blue', type: 'arc', quality: 'green' },

        { q: 11, r: 6, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'cav', quality: 'green' },
        { q: 12, r: 4, side: 'red', type: 'arc', quality: 'green' },
      ],
    },
    'Demo C — Skirmisher Screen': {
      terrain: [],
      units: [
        { q: 2, r: 5, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 5, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 5, side: 'blue', type: 'cav', quality: 'green' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 6, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 1, r: 5, side: 'blue', type: 'arc', quality: 'green' },

        { q: 13, r: 5, side: 'red', type: 'gen', quality: 'green' },
        { q: 12, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 11, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 12, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 5, side: 'red', type: 'arc', quality: 'green' },
      ],
    },
  
    'Terrain G — Teutoburg Ambush (9 CE)': {
      terrain: [
        { q: 2, r: 2, terrain: 'hills' },
        { q: 4, r: 2, terrain: 'hills' },
        { q: 6, r: 2, terrain: 'hills' },
        { q: 8, r: 2, terrain: 'hills' },
        { q: 10, r: 2, terrain: 'hills' },
        { q: 12, r: 2, terrain: 'hills' },
        { q: 14, r: 2, terrain: 'hills' },
        { q: 1, r: 8, terrain: 'hills' },
        { q: 3, r: 8, terrain: 'hills' },
        { q: 5, r: 8, terrain: 'hills' },
        { q: 7, r: 8, terrain: 'hills' },
        { q: 9, r: 8, terrain: 'hills' },
        { q: 11, r: 8, terrain: 'hills' },
        { q: 13, r: 8, terrain: 'hills' },
        { q: 0, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 4, r: 3, terrain: 'woods' },
        { q: 6, r: 3, terrain: 'woods' },
        { q: 8, r: 3, terrain: 'woods' },
        { q: 10, r: 3, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 2, r: 7, terrain: 'woods' },
        { q: 4, r: 7, terrain: 'woods' },
        { q: 6, r: 7, terrain: 'woods' },
        { q: 8, r: 7, terrain: 'woods' },
        { q: 10, r: 7, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'rough' },
        { q: 4, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 12, r: 4, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 3, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 13, r: 5, terrain: 'rough' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 4, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 12, r: 6, terrain: 'rough' },
      ],
      units: [
        { q: 1, r: 5, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 13, r: 5, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 5, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 5, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 1, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 14, r: 6, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 0, r: 5, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 14, r: 5, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 0, r: 6, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },

        { q: 7, r: 1, side: 'red', type: 'gen', quality: 'veteran' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 2, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 4, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 8, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 12, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 14, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 1, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 3, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 11, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 1, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 13, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 1, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 5, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 13, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 1, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 1, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 0, r: 3, side: 'red', type: 'cav', quality: 'green' },
        { q: 14, r: 7, side: 'red', type: 'cav', quality: 'green' },
      ],
    },

    'Terrain H — Feigned Retreat In The Narrows': {
      terrain: [
        { q: 0, r: 3, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 3, r: 3, terrain: 'woods' },
        { q: 0, r: 4, terrain: 'woods' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 3, r: 4, terrain: 'woods' },
        { q: -1, r: 5, terrain: 'woods' },
        { q: 0, r: 5, terrain: 'woods' },
        { q: 1, r: 5, terrain: 'woods' },
        { q: 2, r: 5, terrain: 'woods' },
        { q: 0, r: 6, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 3, r: 6, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 1, r: 7, terrain: 'woods' },
        { q: 2, r: 7, terrain: 'woods' },
        { q: 3, r: 7, terrain: 'woods' },
        { q: 1, r: 8, terrain: 'woods' },
        { q: 2, r: 8, terrain: 'woods' },
        { q: 3, r: 8, terrain: 'woods' },
        { q: 11, r: 3, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 15, r: 4, terrain: 'woods' },
        { q: 12, r: 5, terrain: 'woods' },
        { q: 13, r: 5, terrain: 'woods' },
        { q: 14, r: 5, terrain: 'woods' },
        { q: 15, r: 5, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 15, r: 6, terrain: 'woods' },
        { q: 11, r: 7, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
        { q: 11, r: 8, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 13, r: 8, terrain: 'woods' },
        { q: 14, r: 8, terrain: 'woods' },
        { q: 5, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 7, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 9, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 4, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 10, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 7, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 5, r: 8, terrain: 'hills' },
        { q: 6, r: 8, terrain: 'hills' },
        { q: 7, r: 8, terrain: 'hills' },
        { q: 8, r: 8, terrain: 'hills' },
        { q: 9, r: 8, terrain: 'hills' },
        { q: 10, r: 8, terrain: 'hills' },
        { q: 5, r: 9, terrain: 'hills' },
        { q: 6, r: 9, terrain: 'hills' },
        { q: 7, r: 9, terrain: 'hills' },
        { q: 8, r: 9, terrain: 'hills' },
        { q: 9, r: 9, terrain: 'hills' },
        { q: 6, r: 10, terrain: 'hills' },
        { q: 7, r: 10, terrain: 'hills' },
        { q: 8, r: 10, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'blue', type: 'run', quality: 'green' },
        { q: 4, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 3, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 11, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 1, r: 3, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'green' },
        { q: 10, r: 4, side: 'blue', type: 'skr', quality: 'green' },

        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 11, r: 9, side: 'red', type: 'run', quality: 'green' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 4, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 8, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 3, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 11, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 9, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 6, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 10, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'cav', quality: 'regular' },
      ],
    },

    'Terrain I — Veteran Ridge Breakthrough': {
      terrain: [
        { q: 4, r: 4, terrain: 'hills' },
        { q: 5, r: 4, terrain: 'hills' },
        { q: 6, r: 4, terrain: 'hills' },
        { q: 7, r: 4, terrain: 'hills' },
        { q: 8, r: 4, terrain: 'hills' },
        { q: 9, r: 4, terrain: 'hills' },
        { q: 10, r: 4, terrain: 'hills' },
        { q: 11, r: 4, terrain: 'hills' },
        { q: 3, r: 5, terrain: 'hills' },
        { q: 4, r: 5, terrain: 'hills' },
        { q: 5, r: 5, terrain: 'hills' },
        { q: 6, r: 5, terrain: 'hills' },
        { q: 7, r: 5, terrain: 'hills' },
        { q: 8, r: 5, terrain: 'hills' },
        { q: 9, r: 5, terrain: 'hills' },
        { q: 10, r: 5, terrain: 'hills' },
        { q: 11, r: 5, terrain: 'hills' },
        { q: 12, r: 5, terrain: 'hills' },
        { q: 4, r: 6, terrain: 'hills' },
        { q: 5, r: 6, terrain: 'hills' },
        { q: 6, r: 6, terrain: 'hills' },
        { q: 7, r: 6, terrain: 'hills' },
        { q: 8, r: 6, terrain: 'hills' },
        { q: 9, r: 6, terrain: 'hills' },
        { q: 10, r: 6, terrain: 'hills' },
        { q: 11, r: 6, terrain: 'hills' },
        { q: 5, r: 3, terrain: 'rough' },
        { q: 6, r: 3, terrain: 'rough' },
        { q: 7, r: 3, terrain: 'rough' },
        { q: 8, r: 3, terrain: 'rough' },
        { q: 9, r: 3, terrain: 'rough' },
        { q: 10, r: 3, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 13, r: 5, terrain: 'rough' },
        { q: 5, r: 7, terrain: 'rough' },
        { q: 6, r: 7, terrain: 'rough' },
        { q: 7, r: 7, terrain: 'rough' },
        { q: 8, r: 7, terrain: 'rough' },
        { q: 9, r: 7, terrain: 'rough' },
        { q: 10, r: 7, terrain: 'rough' },
        { q: 1, r: 2, terrain: 'woods' },
        { q: 2, r: 2, terrain: 'woods' },
        { q: 3, r: 2, terrain: 'woods' },
        { q: 4, r: 2, terrain: 'woods' },
        { q: 0, r: 3, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 3, r: 3, terrain: 'woods' },
        { q: 0, r: 4, terrain: 'woods' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 0, r: 6, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 1, r: 7, terrain: 'woods' },
        { q: 2, r: 7, terrain: 'woods' },
        { q: 3, r: 7, terrain: 'woods' },
        { q: 1, r: 8, terrain: 'woods' },
        { q: 2, r: 8, terrain: 'woods' },
        { q: 3, r: 8, terrain: 'woods' },
        { q: 4, r: 8, terrain: 'woods' },
        { q: 11, r: 2, terrain: 'woods' },
        { q: 12, r: 2, terrain: 'woods' },
        { q: 13, r: 2, terrain: 'woods' },
        { q: 14, r: 2, terrain: 'woods' },
        { q: 11, r: 3, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 15, r: 4, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 15, r: 6, terrain: 'woods' },
        { q: 11, r: 7, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
        { q: 11, r: 8, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 13, r: 8, terrain: 'woods' },
        { q: 14, r: 8, terrain: 'woods' },
      ],
      units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 1, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 11, r: 1, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 1, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 13, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 10, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 1, r: 3, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'skr', quality: 'regular' },

        { q: 9, r: 9, side: 'red', type: 'gen', quality: 'veteran' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 7, r: 9, side: 'red', type: 'run', quality: 'green' },
        { q: 3, r: 9, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 7, r: 10, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 11, r: 9, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 9, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 0, r: 7, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 7, side: 'red', type: 'skr', quality: 'regular' },
      ],
    },

    'Terrain J — Twin Fords Veteran Stand': {
      terrain: [
        { q: -1, r: 5, terrain: 'water' },
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 4, r: 5, terrain: 'water' },
        { q: 5, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 10, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 12, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 4, r: 4, terrain: 'rough' },
        { q: 5, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 7, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 9, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 4, r: 6, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 7, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 3, r: 4, terrain: 'woods' },
        { q: 11, r: 4, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 3, r: 6, terrain: 'woods' },
        { q: 11, r: 6, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 4, r: 3, terrain: 'hills' },
        { q: 5, r: 3, terrain: 'hills' },
        { q: 6, r: 3, terrain: 'hills' },
        { q: 8, r: 3, terrain: 'hills' },
        { q: 9, r: 3, terrain: 'hills' },
        { q: 10, r: 3, terrain: 'hills' },
        { q: 4, r: 7, terrain: 'hills' },
        { q: 5, r: 7, terrain: 'hills' },
        { q: 6, r: 7, terrain: 'hills' },
        { q: 8, r: 7, terrain: 'hills' },
        { q: 9, r: 7, terrain: 'hills' },
        { q: 10, r: 7, terrain: 'hills' },
        { q: 6, r: 2, terrain: 'rough' },
        { q: 8, r: 2, terrain: 'rough' },
        { q: 6, r: 8, terrain: 'rough' },
        { q: 8, r: 8, terrain: 'rough' },
      ],
      units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'blue', type: 'run', quality: 'green' },
        { q: 4, r: 0, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 6, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 0, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 10, r: 1, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 1, r: 3, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 13, r: 3, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 2, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 1, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'skr', quality: 'regular' },

        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 9, r: 9, side: 'red', type: 'run', quality: 'green' },
        { q: 4, r: 10, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 6, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 10, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 1, r: 7, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 7, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 0, r: 7, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 7, side: 'red', type: 'skr', quality: 'regular' },
      ],
    },

    'Terrain K — Marathon (490 BCE)': {
      terrain: [
        { q: 11, r: 0, terrain: 'water' },
        { q: 12, r: 0, terrain: 'water' },
        { q: 13, r: 0, terrain: 'water' },
        { q: 11, r: 1, terrain: 'water' },
        { q: 12, r: 1, terrain: 'water' },
        { q: 13, r: 1, terrain: 'water' },
        { q: 12, r: 2, terrain: 'water' },
        { q: 13, r: 2, terrain: 'water' },
        { q: 14, r: 2, terrain: 'water' },
        { q: 13, r: 3, terrain: 'water' },
        { q: 14, r: 3, terrain: 'water' },
        { q: 14, r: 4, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 0, r: 3, terrain: 'rough' },
        { q: 1, r: 3, terrain: 'rough' },
        { q: 0, r: 4, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: -1, r: 5, terrain: 'rough' },
        { q: 0, r: 5, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 0, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 12, r: 4, terrain: 'rough' },
        { q: 13, r: 4, terrain: 'rough' },
        { q: 12, r: 5, terrain: 'rough' },
        { q: 13, r: 5, terrain: 'rough' },
        { q: 3, r: 9, terrain: 'hills' },
        { q: 4, r: 9, terrain: 'hills' },
        { q: 10, r: 9, terrain: 'hills' },
        { q: 11, r: 9, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 9, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'run', quality: 'green' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 9, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 12, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 3, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 13, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 6, r: 3, side: 'red', type: 'arc', quality: 'green' },
        { q: 10, r: 3, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 14, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 5, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain L — Granicus River (334 BCE)': {
      terrain: [
        { q: -1, r: 5, terrain: 'water' },
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 5, r: 5, terrain: 'water' },
        { q: 6, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 8, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 12, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: 2, r: 4, terrain: 'rough' },
        { q: 3, r: 4, terrain: 'rough' },
        { q: 5, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 7, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 9, r: 4, terrain: 'rough' },
        { q: 11, r: 4, terrain: 'rough' },
        { q: 12, r: 4, terrain: 'rough' },
        { q: 13, r: 4, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 3, r: 6, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 7, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 11, r: 6, terrain: 'rough' },
        { q: 12, r: 6, terrain: 'rough' },
        { q: 13, r: 6, terrain: 'rough' },
        { q: 2, r: 2, terrain: 'hills' },
        { q: 4, r: 2, terrain: 'hills' },
        { q: 6, r: 2, terrain: 'hills' },
        { q: 8, r: 2, terrain: 'hills' },
        { q: 10, r: 2, terrain: 'hills' },
        { q: 12, r: 2, terrain: 'hills' },
        { q: 14, r: 2, terrain: 'hills' },
        { q: 5, r: 1, terrain: 'hills' },
        { q: 7, r: 1, terrain: 'hills' },
        { q: 9, r: 1, terrain: 'hills' },
        { q: 11, r: 1, terrain: 'hills' },
        { q: 0, r: 3, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 1, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
      ],
      units: [
        { q: 6, r: 10, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 10, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 5, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 10, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 10, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 2, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'run', quality: 'green' },
        { q: 3, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 11, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 12, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 12, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 2, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 12, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain M — Cannae Double Envelopment (216 BCE)': {
      terrain: [
        { q: 13, r: 2, terrain: 'water' },
        { q: 14, r: 2, terrain: 'water' },
        { q: 14, r: 3, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 15, r: 6, terrain: 'water' },
        { q: 14, r: 7, terrain: 'water' },
        { q: 14, r: 8, terrain: 'water' },
        { q: 13, r: 8, terrain: 'water' },
        { q: 0, r: 4, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: 0, r: 5, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 0, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 5, r: 1, terrain: 'hills' },
        { q: 7, r: 1, terrain: 'hills' },
        { q: 9, r: 1, terrain: 'hills' },
        { q: 11, r: 1, terrain: 'hills' },
      ],
      units: [
        { q: 6, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 10, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 10, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'green' },
        { q: 2, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 7, side: 'blue', type: 'inf', quality: 'green' },
        { q: 5, r: 7, side: 'blue', type: 'inf', quality: 'green' },
        { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'inf', quality: 'green' },
        { q: 10, r: 7, side: 'blue', type: 'inf', quality: 'green' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 3, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 3, r: 5, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 5, side: 'red', type: 'inf', quality: 'veteran' },
      ],
    },

    'Terrain N — Pharsalus Reserve Counterstroke (48 BCE)': {
      terrain: [
        { q: 0, r: 4, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: 2, r: 4, terrain: 'rough' },
        { q: 0, r: 5, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 3, r: 5, terrain: 'rough' },
        { q: 0, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 5, r: 3, terrain: 'hills' },
        { q: 6, r: 3, terrain: 'hills' },
        { q: 7, r: 3, terrain: 'hills' },
        { q: 8, r: 3, terrain: 'hills' },
        { q: 9, r: 3, terrain: 'hills' },
        { q: 12, r: 5, terrain: 'woods' },
        { q: 13, r: 5, terrain: 'woods' },
        { q: 14, r: 5, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 10, r: 8, terrain: 'rough' },
        { q: 11, r: 8, terrain: 'rough' },
        { q: 12, r: 8, terrain: 'rough' },
        { q: 10, r: 7, terrain: 'hills' },
        { q: 11, r: 7, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 13, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 12, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 10, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 14, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'arc', quality: 'green' },
        { q: 12, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 1, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain O — Zama (202 BCE)': {
      terrain: [
        { q: 1, r: 2, terrain: 'woods' },
        { q: 2, r: 2, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 13, r: 8, terrain: 'woods' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 3, r: 9, terrain: 'hills' },
        { q: 4, r: 9, terrain: 'hills' },
        { q: 10, r: 9, terrain: 'hills' },
        { q: 11, r: 9, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 3, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 9, r: 9, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 3, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 4, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 8, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 12, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

    'Terrain P — Ilipa Reverse Deployment (206 BCE)': {
      terrain: [
        { q: 0, r: 4, terrain: 'woods' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 0, r: 5, terrain: 'woods' },
        { q: 1, r: 5, terrain: 'woods' },
        { q: 2, r: 5, terrain: 'woods' },
        { q: 0, r: 6, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 12, r: 5, terrain: 'woods' },
        { q: 13, r: 5, terrain: 'woods' },
        { q: 14, r: 5, terrain: 'woods' },
        { q: 4, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 10, r: 5, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 5, r: 1, terrain: 'hills' },
        { q: 7, r: 1, terrain: 'hills' },
        { q: 9, r: 1, terrain: 'hills' },
        { q: 11, r: 1, terrain: 'hills' },
        { q: 4, r: 9, terrain: 'hills' },
        { q: 6, r: 9, terrain: 'hills' },
        { q: 8, r: 9, terrain: 'hills' },
        { q: 10, r: 9, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 1, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 2, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 3, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 11, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 5, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

    'Terrain Q — Carhae (Carrhae, 53 BCE)': {
      terrain: [
        { q: 4, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 3, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 12, r: 5, terrain: 'rough' },
        { q: 4, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 2, r: 2, terrain: 'hills' },
        { q: 12, r: 8, terrain: 'hills' },
      ],
      units: [
        { q: 6, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'blue', type: 'cav', quality: 'green' },
        { q: 6, r: 7, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 5, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 0, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 3, r: 2, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 10, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 12, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 2, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 4, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 10, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 12, r: 4, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain R — Thapsus Coastal Pressure (46 BCE)': {
      terrain: [
        { q: 14, r: 3, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 15, r: 6, terrain: 'water' },
        { q: 14, r: 7, terrain: 'water' },
        { q: 13, r: 8, terrain: 'water' },
        { q: 4, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 10, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'hills' },
        { q: 2, r: 6, terrain: 'hills' },
        { q: 1, r: 7, terrain: 'hills' },
        { q: 2, r: 7, terrain: 'hills' },
        { q: 11, r: 8, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 11, r: 9, terrain: 'woods' },
        { q: 12, r: 9, terrain: 'woods' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 3, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 10, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 5, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 3, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

    'Terrain S — Philippi Twin Camps (42 BCE)': {
      terrain: [
        { q: 6, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 8, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 6, r: 6, terrain: 'water' },
        { q: 7, r: 6, terrain: 'water' },
        { q: 8, r: 6, terrain: 'water' },
        { q: 9, r: 6, terrain: 'water' },
        { q: 2, r: 8, terrain: 'hills' },
        { q: 3, r: 8, terrain: 'hills' },
        { q: 4, r: 8, terrain: 'hills' },
        { q: 2, r: 9, terrain: 'hills' },
        { q: 3, r: 9, terrain: 'hills' },
        { q: 11, r: 2, terrain: 'hills' },
        { q: 12, r: 2, terrain: 'hills' },
        { q: 13, r: 2, terrain: 'hills' },
        { q: 11, r: 3, terrain: 'hills' },
        { q: 12, r: 3, terrain: 'hills' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 3, r: 6, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 12, r: 5, terrain: 'rough' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 6, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 3, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

  // === GRAND BATTLE SCENARIOS (Thor) ===
  'Grand A — Even Lines (30v30, mirrored)': {
    terrain: [
        
    ],
    units: [
        { q: 3, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 2, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 3, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 9, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 11, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 3, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Grand B — Center Push (28v28, mirrored)': {
    terrain: [
        { q: 7, r: 5, terrain: 'hills' },
        { q: 8, r: 5, terrain: 'hills' },
        { q: 9, r: 5, terrain: 'hills' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 14, r: 5, terrain: 'rough' }
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 7, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 10, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 10, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 4, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 10, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 13, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Grand C — Double Envelopment (30v30, mirrored)': {
    terrain: [
        
    ],
    units: [
        { q: 3, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 5, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 9, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 9, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 7, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 7, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },

  'Grand D — Massive Screen (26v26, mirrored)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 7, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 10, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 2, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 11, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Grand E — River Fords (24v24, mirrored)': {
    terrain: [
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 5, r: 5, terrain: 'water' },
        { q: 6, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 10, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: -1, r: 5, terrain: 'water' },
        { q: 4, r: 4, terrain: 'woods' },
        { q: 8, r: 4, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 4, r: 6, terrain: 'woods' },
        { q: 8, r: 6, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' }
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 7, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 10, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 10, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 4, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 10, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 13, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },

  'Grand F — Corridor Pass (22v22, mirrored)': {
    terrain: [
        { q: 14, r: 2, terrain: 'water' },
        { q: 1, r: 2, terrain: 'water' },
        { q: 2, r: 2, terrain: 'water' },
        { q: 3, r: 2, terrain: 'water' },
        { q: 10, r: 2, terrain: 'water' },
        { q: 11, r: 2, terrain: 'water' },
        { q: 12, r: 2, terrain: 'water' },
        { q: 13, r: 2, terrain: 'water' },
        { q: 0, r: 3, terrain: 'water' },
        { q: 1, r: 3, terrain: 'water' },
        { q: 2, r: 3, terrain: 'water' },
        { q: 3, r: 3, terrain: 'water' },
        { q: 10, r: 3, terrain: 'water' },
        { q: 11, r: 3, terrain: 'water' },
        { q: 12, r: 3, terrain: 'water' },
        { q: 13, r: 3, terrain: 'water' },
        { q: 14, r: 3, terrain: 'water' },
        { q: 0, r: 4, terrain: 'water' },
        { q: 1, r: 4, terrain: 'water' },
        { q: 2, r: 4, terrain: 'water' },
        { q: 3, r: 4, terrain: 'water' },
        { q: 10, r: 4, terrain: 'water' },
        { q: 11, r: 4, terrain: 'water' },
        { q: 12, r: 4, terrain: 'water' },
        { q: 13, r: 4, terrain: 'water' },
        { q: 14, r: 4, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 10, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 12, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: -1, r: 5, terrain: 'water' },
        { q: 0, r: 6, terrain: 'water' },
        { q: 1, r: 6, terrain: 'water' },
        { q: 2, r: 6, terrain: 'water' },
        { q: 3, r: 6, terrain: 'water' },
        { q: 10, r: 6, terrain: 'water' },
        { q: 11, r: 6, terrain: 'water' },
        { q: 12, r: 6, terrain: 'water' },
        { q: 13, r: 6, terrain: 'water' },
        { q: 14, r: 6, terrain: 'water' },
        { q: 15, r: 6, terrain: 'water' },
        { q: 0, r: 7, terrain: 'water' },
        { q: 1, r: 7, terrain: 'water' },
        { q: 2, r: 7, terrain: 'water' },
        { q: 3, r: 7, terrain: 'water' },
        { q: 10, r: 7, terrain: 'water' },
        { q: 11, r: 7, terrain: 'water' },
        { q: 12, r: 7, terrain: 'water' },
        { q: 13, r: 7, terrain: 'water' },
        { q: 14, r: 7, terrain: 'water' },
        { q: 14, r: 8, terrain: 'water' },
        { q: 1, r: 8, terrain: 'water' },
        { q: 2, r: 8, terrain: 'water' },
        { q: 3, r: 8, terrain: 'water' },
        { q: 10, r: 8, terrain: 'water' },
        { q: 11, r: 8, terrain: 'water' },
        { q: 12, r: 8, terrain: 'water' },
        { q: 13, r: 8, terrain: 'water' }
    ],
    units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 4, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },
  // === END GRAND BATTLE SCENARIOS ===,

  // === BERSERKER FORMATIONS (Berserker) ===
  'Berserker A — Wedge vs Shieldwall (26v26)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 3, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 9, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Berserker B — Crescent vs Columns (28v28)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 4, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 6, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 9, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 10, side: 'red', type: 'cav', quality: 'regular' },
        { q: 7, r: 10, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },

  'Berserker C — Checkerboard vs Line (26v26)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 2, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 11, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Berserker D — Refused Flank vs Wide Wings (28v28)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 3, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 9, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 1, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },
  // === END BERSERKER FORMATIONS ===
};

// === Terrain Pack (Berserker) ===
// Adds terrain-focused variants of the existing Grand scenarios.
// Board-aware: these generators only emit coordinates on active board hexes.
(function addTerrainPack(){
  const add = (name, baseName, terrainMaker) => {
    const base = SCENARIOS[baseName];
    if (!base) {
      console.warn('[TerrainPack] Missing base scenario:', baseName);
      return;
    }
    if (SCENARIOS[name]) return;
    SCENARIOS[name] = {
      terrain: terrainMaker(),
      units: base.units || [],
    };
  };

  const rows = new Map();
  for (const h of board.active) {
    if (!rows.has(h.r)) rows.set(h.r, []);
    rows.get(h.r).push(h);
  }
  for (const list of rows.values()) {
    list.sort((a, b) => a.q - b.q);
  }

  const centerR = Math.floor((board.minR + board.maxR) / 2);
  const centerRow = rows.get(centerR) || [];
  const centerQ = centerRow.length ? centerRow[Math.floor(centerRow.length / 2)].q : 0;

  function row(r) {
    return rows.get(r) || [];
  }

  function buildTerrain(builder) {
    const t = [];
    const seen = new Set();

    const addHex = (q, r, terrain) => {
      const hk = key(q, r);
      if (!board.activeSet.has(hk)) return;
      const tk = `${hk}:${terrain}`;
      if (seen.has(tk)) return;
      seen.add(tk);
      t.push({ q, r, terrain });
    };

    builder({ addHex, row, all: board.active, centerQ, centerR });
    return t;
  }

  // A: central ridge with two passes
  add('Terrain A — Ridge Line (30v30, mirrored)', 'Grand A — Even Lines (30v30, mirrored)', () =>
    buildTerrain(({ addHex, row, centerQ, centerR }) => {
      const passes = new Set([centerQ - 3, centerQ + 3]);
      for (const h of row(centerR)) {
        if (passes.has(h.q)) continue;
        addHex(h.q, h.r, 'hills');
      }
      for (const flankR of [centerR - 1, centerR + 1]) {
        for (const h of row(flankR)) {
          if ((h.q - centerQ) % 3 === 0) addHex(h.q, h.r, 'hills');
        }
      }
    })
  );

  // B: wide woods belt with a clear road
  add('Terrain B — Woods Belt (28v28, mirrored)', 'Grand B — Center Push (28v28, mirrored)', () =>
    buildTerrain(({ addHex, row, centerQ, centerR }) => {
      const roadQ = centerQ;
      for (const beltR of [centerR - 1, centerR, centerR + 1]) {
        for (const h of row(beltR)) {
          if (h.q === roadQ) continue;
          addHex(h.q, h.r, 'woods');
        }
      }
      for (const h of row(centerR - 2)) {
        if (h.q <= centerQ - 4) addHex(h.q, h.r, 'woods');
      }
      for (const h of row(centerR + 2)) {
        if (h.q >= centerQ + 4) addHex(h.q, h.r, 'woods');
      }
    })
  );

  // C: rough patches that punish cavalry lanes
  add('Terrain C — Broken Ground (30v30, mirrored)', 'Grand C — Double Envelopment (30v30, mirrored)', () =>
    buildTerrain(({ addHex, all, centerQ, centerR }) => {
      for (const h of all) {
        const dr = Math.abs(h.r - centerR);
        const dq = Math.abs(h.q - centerQ);
        if (dr <= 2 && dq >= 3 && ((h.q + h.r) & 1) === 0) addHex(h.q, h.r, 'rough');
      }
      for (const q of [centerQ - 4, centerQ, centerQ + 4]) {
        addHex(q, centerR, 'rough');
      }
    })
  );

  // D: marshy edge (water) that anchors flanks
  add('Terrain D — Marsh Edge (26v26, mirrored)', 'Grand D — Massive Screen (26v26, mirrored)', () =>
    buildTerrain(({ addHex, row, all, centerQ, centerR }) => {
      for (const edgeR of [board.minR, board.maxR]) {
        for (const h of row(edgeR)) {
          if (((h.q + h.r) & 1) === 1) addHex(h.q, h.r, 'water');
        }
      }
      for (const nearEdgeR of [board.minR + 1, board.maxR - 1]) {
        for (const h of row(nearEdgeR)) {
          if (((h.q + h.r) & 1) === 0) addHex(h.q, h.r, 'rough');
        }
      }
      for (const h of all) {
        const dr = Math.abs(h.r - centerR);
        const dq = Math.abs(h.q - centerQ);
        if (dr <= 1 && dq >= 7) addHex(h.q, h.r, 'water');
      }
    })
  );

  // E: mirrored river with three fords
  add('Terrain E — River Fords (24v24, mirrored)', 'Grand E — River Fords (24v24, mirrored)', () =>
    buildTerrain(({ addHex, row, centerQ, centerR }) => {
      const fords = new Set([centerQ - 4, centerQ, centerQ + 4]);
      for (const h of row(centerR)) {
        if (!fords.has(h.q)) addHex(h.q, h.r, 'water');
      }
      for (const bankR of [centerR - 1, centerR + 1]) {
        for (const h of row(bankR)) {
          if (Math.abs(h.q - centerQ) % 3 === 1) addHex(h.q, h.r, 'rough');
        }
      }
    })
  );

  // F: a corridor of clear with rough walls
  add('Terrain F — Corridor Pass (22v22, mirrored)', 'Grand F — Corridor Pass (22v22, mirrored)', () =>
    buildTerrain(({ addHex, all, centerQ, centerR }) => {
      for (const h of all) {
        const dr = Math.abs(h.r - centerR);
        const dq = Math.abs(h.q - centerQ);
        const inCorridor = dq <= 1;
        if (dr <= 2 && dq <= 6 && !inCorridor && ((h.q + h.r) & 1) === 0) {
          addHex(h.q, h.r, 'rough');
        }
      }
      for (const q of [centerQ - 2, centerQ + 2]) {
        addHex(q, centerR - 1, 'hills');
        addHex(q, centerR + 1, 'hills');
      }
      for (const q of [centerQ - 5, centerQ + 5]) {
        addHex(q, centerR, 'hills');
      }
    })
  );
})();



  // --- Geometry helpers
  function toAxial(q, r) {
    // Convert odd-r offset (q=col, r=row) to axial (x,z) where z=r.
    const x = q - ((r - (r & 1)) / 2);
    const z = r;
    return { x, z };
  }

  function axialDistance(aq, ar, bq, br) {
    const a = toAxial(aq, ar);
    const b = toAxial(bq, br);
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    const dy = (-a.x - a.z) - (-b.x - b.z);
    return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  }

  // --- Canvas layout
  let R = 28; // will be recalculated
  let HEX_W = 0;
  let HEX_H = 0;
  let STEP_Y = 0;
  let ORIGIN_X = 0;
  let ORIGIN_Y = 0;

  function resize() {
    // Canvas fills left pane.
    const wrap = document.getElementById('canvasWrap');
    const rect = wrap.getBoundingClientRect();
    elCanvas.width = Math.floor(rect.width * devicePixelRatio);
    elCanvas.height = Math.floor(rect.height * devicePixelRatio);
    elCanvas.style.width = `${Math.floor(rect.width)}px`;
    elCanvas.style.height = `${Math.floor(rect.height)}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // Fit board.
    const cols = (board.maxQ - board.minQ + 1);
    const rows = (board.maxR - board.minR + 1);
    const availW = rect.width;
    const availH = rect.height;

    // For pointy-top hexes with odd-r offset:
    // width ≈ sqrt(3)*R*(cols + 0.5)
    // height ≈ R*((rows-1)*1.5 + 2)
    const rByW = availW / (Math.sqrt(3) * (cols + 0.5));
    const rByH = availH / (((rows - 1) * 1.5) + 2);
    // On large/ultrawide displays, allow a larger token scale so the board
    // doesn't look undersized.
    const maxR = (availW >= 2200 && availH >= 900) ? 52 : 42;
    R = Math.max(18, Math.min(maxR, Math.floor(Math.min(rByW, rByH))));

    HEX_W = Math.sqrt(3) * R;
    HEX_H = 2 * R;
    STEP_Y = 1.5 * R;

    const boardW = HEX_W * (cols + 0.5);
    const boardH = R * (((rows - 1) * 1.5) + 2);

    ORIGIN_X = (availW - boardW) / 2 + HEX_W / 2;
    ORIGIN_Y = (availH - boardH) / 2 + R;

    for (const h of board.active) {
      const x = ORIGIN_X + (h.q - board.minQ) * HEX_W + ((h.r & 1) ? (HEX_W / 2) : 0);
      const y = ORIGIN_Y + (h.r - board.minR) * STEP_Y;
      h.cx = x;
      h.cy = y;
    }

    draw();
  }

  function hexPath(cx, cy) {
    const p = new Path2D();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30); // pointy top
      const x = cx + R * Math.cos(ang);
      const y = cy + R * Math.sin(ang);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    return p;
  }

  function hexCorners(cx, cy) {
    // Corner order matches hexPath (i=0..5, angle = 60*i - 30)
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      pts.push({
        x: cx + R * Math.cos(ang),
        y: cy + R * Math.sin(ang),
      });
    }
    return pts;
  }

  function edgeCornerIdx(dir) {
    // Neighbor order is [E, NE, NW, W, SW, SE]
    switch (dir) {
      case 0: return [0, 1]; // E
      case 1: return [5, 0]; // NE
      case 2: return [4, 5]; // NW
      case 3: return [3, 4]; // W
      case 4: return [2, 3]; // SW
      case 5: return [1, 2]; // SE
      default: return [0, 1];
    }
  }

  function commandOutlinePath(sourceKey) {
    const sourceHex = board.byKey.get(sourceKey);
    const sourceUnit = unitsByHex.get(sourceKey);
    if (!sourceHex) return null;
    if (!isCommandSourceUnit(sourceUnit)) return null;

    const radius = commandRadiusForUnit(sourceUnit);
    if (radius <= 0) return null;

    // Command area = all active hexes within this source unit's command radius.
    const inside = new Set();
    for (const h of board.active) {
      if (axialDistance(h.q, h.r, sourceHex.q, sourceHex.r) <= radius) inside.add(h.k);
    }

    const path = new Path2D();

    for (const h of board.active) {
      if (!inside.has(h.k)) continue;

      const corners = hexCorners(h.cx, h.cy);
      const deltas = (h.r & 1) ? NEIGH_ODD : NEIGH_EVEN;

      for (let dir = 0; dir < 6; dir++) {
        const [dq, dr] = deltas[dir];
        const nk = key(h.q + dq, h.r + dr);

        // Only draw boundary edges: inside → outside.
        if (inside.has(nk)) continue;

        const [a, b] = edgeCornerIdx(dir);
        path.moveTo(corners[a].x, corners[a].y);
        path.lineTo(corners[b].x, corners[b].y);
      }
    }

    return path;
  }

  function pickHex(px, py) {
    let best = null;
    let bestD2 = Infinity;
    for (const h of board.active) {
      const dx = px - h.cx;
      const dy = py - h.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = h;
      }
    }
    if (!best) return null;
    if (bestD2 > (R * R * 0.95)) return null;
    return best;
  }

  // --- Rendering
  // Terrain is intentionally a *tint* over a shared base, not a repaint.
  // That keeps the board calm while still making woods/hills/rough/water read instantly.
  const TERRAIN_THEMES = {
  battlefield: {
    base: '#c7c2a6',
    grid: 'rgba(0,0,0,0.28)',
    tint: {
      hills: 'rgba(176, 120, 40, 0.24)',
      woods: 'rgba(40, 120, 60, 0.22)',
      rough: 'rgba(110, 85, 70, 0.20)',
      water: 'rgba(30, 90, 170, 0.30)',
    },
  },
    // Classic tabletop parchment: subtle but readable.
    classic: {
      base: '#f4f2ea',
      grid: 'rgba(0,0,0,0.35)',
      tint: {
        hills: 'rgba(183, 131, 43, 0.18)',  // warm ochre
        woods: 'rgba(36, 122, 63, 0.20)',   // deep green
        rough: 'rgba(107, 84, 70, 0.16)',   // brown-grey
        water: 'rgba(30, 90, 170, 0.20)',   // river blue
      },
    },
    // Vivid Dusk: more saturation without turning the map into a neon quilt.
    vivid: {
      base: '#f4f2ea',
      grid: 'rgba(0,0,0,0.35)',
      tint: {
        hills: 'rgba(183, 131, 43, 0.26)',
        woods: 'rgba(36, 122, 63, 0.28)',
        rough: 'rgba(107, 84, 70, 0.22)',
        water: 'rgba(30, 90, 170, 0.28)',
      },
    },
    // Dark UI chrome option (kept because some people love it).
    dusk: {
      base: '#2f2d28',
      grid: 'rgba(255,255,255,0.14)',
      tint: {
        hills: 'rgba(183, 131, 43, 0.14)',
        woods: 'rgba(36, 122, 63, 0.16)',
        rough: 'rgba(107, 84, 70, 0.13)',
        water: 'rgba(30, 90, 170, 0.16)',
      },
    },
  };

  const TERRAIN_THEME_ORDER = ['vivid', 'classic', 'dusk'];

  function terrainTheme() {
    const theme = state.terrainTheme || 'vivid';
    return TERRAIN_THEMES[theme] || TERRAIN_THEMES.vivid;
  }

  function terrainBaseFill() {
    return terrainTheme().base || '#f4f2ea';
  }

  function terrainTint(t) {
    if (!t || t === 'clear') return null;
    const pal = terrainTheme();
    return (pal.tint && pal.tint[t]) ? pal.tint[t] : null;
  }

  function gridStroke() {
    return terrainTheme().grid || '#111';
  }
function unitColors(side) {
    return side === 'blue'
      ? { fill: '#0b3d91', stroke: '#8fb4ff', text: '#eaf2ff' }
      : { fill: '#7a1111', stroke: '#ff9a9a', text: '#ffecec' };
  }

  function drawRunnerFootGlyph(cx, cy, size) {
    const s = Math.max(8, size);
    const halfW = s * 0.42;
    const gap = s * 0.19;
    const y0 = cy - gap;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.lineCap = 'round';

    // Three clean horizontal "speed" lines.
    ctx.beginPath();
    ctx.moveTo(cx - halfW, y0);
    ctx.lineTo(cx + halfW, y0);
    ctx.moveTo(cx - halfW, y0 + gap);
    ctx.lineTo(cx + halfW, y0 + gap);
    ctx.moveTo(cx - halfW, y0 + (gap * 2));
    ctx.lineTo(cx + halfW, y0 + (gap * 2));
    ctx.stroke();
    ctx.restore();
  }

  function qualityStroke(q) {
    switch (q) {
      case 'veteran': return '#d7b84b';
      case 'regular': return '#d0d0d0';
      default: return '#57d26a';
    }
  }

  function drawQualityFramedRing(cx, cy, quality) {
    const ringR = R * 0.55;
    const ringW = Math.max(2, Math.floor(R * 0.12));
    const frameW = Math.max(1, Math.floor(ringW * 0.36));
    const frameOffset = (ringW * 0.5) - (frameW * 0.5);
    const frameColor = '#0a0a0a';

    // Quality color band.
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.lineWidth = ringW;
    ctx.strokeStyle = qualityStroke(quality);
    ctx.stroke();

    // Thin black frame on the inside of the quality band.
    ctx.beginPath();
    ctx.arc(cx, cy, ringR - frameOffset, 0, Math.PI * 2);
    ctx.lineWidth = frameW;
    ctx.strokeStyle = frameColor;
    ctx.stroke();

    // Thin black frame on the outside of the quality band.
    ctx.beginPath();
    ctx.arc(cx, cy, ringR + frameOffset, 0, Math.PI * 2);
    ctx.lineWidth = frameW;
    ctx.strokeStyle = frameColor;
    ctx.stroke();
  }

  function stopMoveAnimation() {
    if (state.moveAnimRaf) {
      cancelAnimationFrame(state.moveAnimRaf);
      state.moveAnimRaf = null;
    }
    state.moveAnim = null;
  }

  function stopActionPulse() {
    if (state.actionPulseRaf) {
      cancelAnimationFrame(state.actionPulseRaf);
      state.actionPulseRaf = null;
    }
    state.actionPulse = null;
  }

  function startActionPulse({ type = 'attack', fromKey = null, toKey = null, durationMs = 500 } = {}) {
    if (!fromKey && !toKey) return;

    stopActionPulse();

    const now = performance.now();
    state.actionPulse = {
      type,
      fromKey,
      toKey,
      startedAt: now,
      durationMs: Math.max(120, Number(durationMs) || 500),
    };

    const tick = (ts) => {
      const pulse = state.actionPulse;
      if (!pulse) {
        state.actionPulseRaf = null;
        return;
      }
      const t = (ts - pulse.startedAt) / pulse.durationMs;
      if (t >= 1) {
        state.actionPulse = null;
        state.actionPulseRaf = null;
        draw();
        return;
      }
      draw();
      state.actionPulseRaf = requestAnimationFrame(tick);
    };

    draw();
    state.actionPulseRaf = requestAnimationFrame(tick);
  }

  function moveAnimationPosition(anim) {
    if (!anim || !Array.isArray(anim.pathKeys) || anim.pathKeys.length < 2) return null;
    const totalSegments = anim.pathKeys.length - 1;
    const clamped = Math.max(0, Math.min(1, Number(anim.t || 0)));
    const segmentProgress = clamped * totalSegments;
    const segIndex = Math.min(totalSegments - 1, Math.floor(segmentProgress));
    const localT = segmentProgress - segIndex;

    const fromHex = board.byKey.get(anim.pathKeys[segIndex]);
    const toHex = board.byKey.get(anim.pathKeys[segIndex + 1]);
    if (!fromHex || !toHex) return null;

    return {
      cx: fromHex.cx + ((toHex.cx - fromHex.cx) * localT),
      cy: fromHex.cy + ((toHex.cy - fromHex.cy) * localT),
    };
  }

  function drawTokenAt(unit, cx, cy) {
    if (!unit) return;
    const c = unitColors(unit.side);
    const def = UNIT_BY_ID.get(unit.type);
    if (!def) return;

    ctx.save();
    ctx.globalAlpha = 0.96;

    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = c.fill;
    ctx.fill();

    drawQualityFramedRing(cx, cy, unit.quality);

    if (unit.type === 'run') {
      drawRunnerFootGlyph(cx, cy, R * 0.82);
    } else {
      const img = UNIT_ICONS && UNIT_ICONS[unit.type];
      const canIcon = (unit.type !== 'gen') && unitIconReady && unitIconReady(unit.type);
      if (canIcon) {
        const tune = (UNIT_ICON_TUNE && UNIT_ICON_TUNE[unit.type]) ? UNIT_ICON_TUNE[unit.type] : { scale: 0.95, y: 0 };
        const s = Math.floor((R * 0.95) * (tune.scale || 0.95));
        const yOff = Math.floor(R * (tune.y || 0));
        const rot = (typeof tune.rot === 'number') ? tune.rot : 0;
        if (rot) {
          ctx.save();
          ctx.translate(Math.floor(cx), Math.floor(cy + yOff));
          ctx.rotate(rot);
          ctx.drawImage(img, Math.floor(-s / 2), Math.floor(-s / 2), s, s);
          ctx.restore();
        } else {
          ctx.drawImage(img, Math.floor(cx - s / 2), Math.floor(cy - s / 2 + yOff), s, s);
        }
      } else {
        const textScale = (unit.type === 'inf' || unit.type === 'cav' || unit.type === 'skr') ? 0.83 : 1.0;
        const fontPx = Math.floor(R * 0.55 * textScale);
        ctx.font = `700 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = c.text;
        ctx.fillText(def.symbol, cx, cy + 1);
      }
    }

    const maxHp = unitMaxHp(unit.type, unit.quality);
    const pipR = Math.max(2, Math.floor(R * 0.07));
    const startX = cx - (pipR * 2) * (maxHp - 1) * 0.5;
    const y = cy + R * 0.78;
    for (let i = 0; i < maxHp; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * (pipR * 2), y, pipR, 0, Math.PI * 2);
      ctx.fillStyle = (i < unit.hp) ? '#fff' : '#ffffff33';
      ctx.fill();
    }

    ctx.restore();
  }

  function drawActionPulseOverlay(pulse) {
    if (!pulse) return;

    const fromHex = pulse.fromKey ? board.byKey.get(pulse.fromKey) : null;
    const toHex = pulse.toKey ? board.byKey.get(pulse.toKey) : null;
    if (!fromHex && !toHex) return;

    const now = performance.now();
    const duration = Math.max(1, Number(pulse.durationMs) || 500);
    const t = Math.max(0, Math.min(1, (now - pulse.startedAt) / duration));
    const fade = 1 - t;

    const isAttack = pulse.type === 'attack';
    const isMove = pulse.type === 'move';

    function glowHex(hex, intensity = 1, role = 'target') {
      if (!hex) return;
      const glow = (0.16 + (0.20 * fade)) * intensity;
      const ring = (0.36 + (0.38 * fade)) * intensity;
      let fill = `rgba(255, 76, 76, ${Math.max(0.08, glow)})`;
      let stroke = `rgba(255, 134, 134, ${Math.max(0.15, ring)})`;
      let shadow = `rgba(255, 70, 70, ${Math.max(0.18, 0.42 * fade)})`;

      if (isMove) {
        fill = `rgba(84, 188, 255, ${Math.max(0.08, glow)})`;
        stroke = `rgba(146, 218, 255, ${Math.max(0.15, ring)})`;
        shadow = `rgba(84, 188, 255, ${Math.max(0.18, 0.42 * fade)})`;
      } else if (isAttack && role === 'source') {
        fill = `rgba(255, 168, 108, ${Math.max(0.06, glow * 0.72)})`;
        stroke = `rgba(255, 206, 148, ${Math.max(0.10, ring * 0.65)})`;
        shadow = `rgba(255, 168, 108, ${Math.max(0.14, 0.30 * fade)})`;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(hex.cx, hex.cy, R * 0.64, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = Math.max(2, R * 0.11);
      ctx.strokeStyle = stroke;
      ctx.shadowBlur = Math.max(8, Math.floor(R * 0.75));
      ctx.shadowColor = shadow;
      ctx.stroke();
      ctx.restore();
    }

    if (isAttack) {
      if (fromHex) glowHex(fromHex, 0.55, 'source');
      if (toHex) glowHex(toHex, 1.25, 'target');
    } else {
      glowHex(fromHex, 1.0, 'source');
      if (!fromHex || !toHex || fromHex.k !== toHex.k) glowHex(toHex, 0.95, 'target');
    }

    if (fromHex && toHex && fromHex.k !== toHex.k) {
      const dx = toHex.cx - fromHex.cx;
      const dy = toHex.cy - fromHex.cy;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        const ux = dx / len;
        const uy = dy / len;
        const pad = R * 0.64;
        const sx = fromHex.cx + (ux * pad);
        const sy = fromHex.cy + (uy * pad);
        const ex = toHex.cx - (ux * pad);
        const ey = toHex.cy - (uy * pad);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(3, R * 0.17);
        ctx.strokeStyle = `rgba(255, 98, 98, ${0.30 + (0.50 * fade)})`;
        ctx.shadowBlur = Math.max(8, Math.floor(R * 0.65));
        ctx.shadowColor = `rgba(255, 70, 70, ${0.30 + (0.35 * fade)})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        const ah = Math.max(8, R * 0.34);
        const aw = Math.max(5, R * 0.20);
        const px = -uy;
        const py = ux;
        ctx.fillStyle = `rgba(255, 124, 124, ${0.32 + (0.48 * fade)})`;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - (ux * ah) + (px * aw), ey - (uy * ah) + (py * aw));
        ctx.lineTo(ex - (ux * ah) - (px * aw), ey - (uy * ah) - (py * aw));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawLineAdvancePreviewArrows(preview) {
    if (!preview || !Array.isArray(preview.moves) || preview.moves.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(122, 228, 162, 0.92)';
    ctx.fillStyle = 'rgba(122, 228, 162, 0.95)';
    ctx.lineWidth = Math.max(2, R * 0.13);

    for (const m of preview.moves) {
      const fromHex = board.byKey.get(m.fromKey);
      const toHex = board.byKey.get(m.toKey);
      if (!fromHex || !toHex) continue;

      const dx = toHex.cx - fromHex.cx;
      const dy = toHex.cy - fromHex.cy;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;

      const ux = dx / len;
      const uy = dy / len;
      const pad = R * 0.58;
      const sx = fromHex.cx + (ux * pad);
      const sy = fromHex.cy + (uy * pad);
      const ex = toHex.cx - (ux * pad);
      const ey = toHex.cy - (uy * pad);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const ah = Math.max(6, R * 0.28);
      const aw = Math.max(4, R * 0.16);
      const px = -uy;
      const py = ux;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - (ux * ah) + (px * aw), ey - (uy * ah) + (py * aw));
      ctx.lineTo(ex - (ux * ah) - (px * aw), ey - (uy * ah) - (py * aw));
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    const activeMoveAnim = state.moveAnim;
    const reinforceAnchorKey = (() => {
      if (state.mode !== 'play') return null;
      if (state.selectedKey && unitsByHex.get(state.selectedKey)?.type === 'inf') return state.selectedKey;
      if (!state.selectedKey && state._hoverKey && unitsByHex.get(state._hoverKey)?.type === 'inf') return state._hoverKey;
      return null;
    })();
    const reinforcePreview = (
      state.mode === 'play' &&
      reinforceAnchorKey
    ) ? reinforcementPreviewForAnchor(reinforceAnchorKey) : null;
    const reinforcedFrontKeys = (reinforcePreview && reinforcePreview.active) ? reinforcePreview.frontSet : null;
    const reinforcingBackKeys = (reinforcePreview && reinforcePreview.active) ? reinforcePreview.supportSet : null;
    const lineAdvancePreview = (() => {
      if (state.mode !== 'play') return null;
      if (!state.selectedKey) return null;
      const u = unitsByHex.get(state.selectedKey);
      if (!u || u.side !== state.side || u.type !== 'inf') return null;
      if (!state.lineAdvancePreviewHover && !canIssueLineAdvance()) {
        const row = collectContiguousInfantryRow(state.selectedKey);
        if (row.length <= 1) return null;
      }
      return lineAdvancePreviewForAnchor(state.selectedKey, state.lineAdvanceDir);
    })();
    ctx.clearRect(0, 0, elCanvas.width, elCanvas.height);

    // Background
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(0, 0, elCanvas.width, elCanvas.height);

    // Hexes
    for (const h of board.active) {
      const p = hexPath(h.cx, h.cy);
      ctx.fillStyle = terrainBaseFill();
      ctx.fill(p);

      const tint = terrainTint(h.terrain);
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fill(p);
      }

      // Outline
      ctx.strokeStyle = gridStroke();
      ctx.lineWidth = 2;
      ctx.stroke(p);

      // Overlays
      const k = h.k;
      if (state.mode === 'play' && state.selectedKey) {
        if (state._moveTargets?.has(k)) {
          ctx.strokeStyle = '#4aa3ff';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.stroke(p);
          ctx.setLineDash([]);
        }
        if (state._attackTargets?.has(k)) {
          ctx.strokeStyle = '#ff5050';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.stroke(p);
          ctx.setLineDash([]);
        }
        if (state._healTargets?.has(k)) {
          ctx.strokeStyle = '#35b36a';
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 5]);
          ctx.stroke(p);
          ctx.setLineDash([]);
        }
      }

      if (lineAdvancePreview) {
        if (lineAdvancePreview.rowSet.has(k)) {
          ctx.fillStyle = 'rgba(255, 198, 96, 0.11)';
          ctx.fill(p);
        }
        if (lineAdvancePreview.formationSet.has(k)) {
          ctx.fillStyle = 'rgba(93, 205, 255, 0.18)';
          ctx.fill(p);
        }
        if (lineAdvancePreview.blockedSet.has(k)) {
          ctx.fillStyle = 'rgba(255, 113, 113, 0.18)';
          ctx.fill(p);
        }
        if (lineAdvancePreview.destinationSet.has(k)) {
          ctx.fillStyle = 'rgba(110, 220, 152, 0.22)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(116, 236, 165, 0.95)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 4]);
          ctx.stroke(p);
          ctx.setLineDash([]);
        }
      }

      // Reinforcement visibility:
      // - light cyan = reinforced front
      // - darker cyan = reinforcing rear
      if (reinforcingBackKeys && reinforcingBackKeys.has(k)) {
        ctx.fillStyle = 'rgba(0, 170, 170, 0.36)';
        ctx.fill(p);
      } else if (reinforcedFrontKeys && reinforcedFrontKeys.has(k)) {
        ctx.fillStyle = 'rgba(0, 226, 214, 0.20)';
        ctx.fill(p);
      }

      // Hover
      if (state._hoverKey === k) {
        ctx.strokeStyle = '#ffffff55';
        ctx.lineWidth = 3;
        ctx.stroke(p);
      }
    }

    if (lineAdvancePreview) {
      drawLineAdvancePreviewArrows(lineAdvancePreview);
    }

    // Command radius outlines (truthy, but calm): dotted perimeter.
    if (state.mode === 'play' && state.showCommand) {
      for (const [hk, u] of unitsByHex) {
        if (!isUnitVisibleForCurrentView(u)) continue;
        if (!isCommandSourceUnit(u)) continue;

        const p = commandOutlinePath(hk);
        if (!p) continue;

        const isSel = (state.selectedKey === hk);
        const isTurnSide = (u.side === state.side);
        const alpha = isSel ? 0.95 : (isTurnSide ? 0.80 : 0.30);
        // Thicker + slightly darker so the command perimeter reads clearly.
        const lw = (isSel ? 3 : (isTurnSide ? 2.25 : 1.75)) * 2;

        ctx.save();
        const strokeRgb = (u.type === 'run') ? '65, 169, 255' : '210, 118, 0';
        ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.setLineDash(u.type === 'run' ? [2, 6] : [4, 6]);
        ctx.lineCap = 'round';
        ctx.stroke(p);
        ctx.restore();
      }
    }

    // Units
    for (const [hk, u] of unitsByHex) {
      if (!isUnitVisibleForCurrentView(u)) continue;
      if (activeMoveAnim && u.id === activeMoveAnim.unitId && hk === activeMoveAnim.toKey) continue;
      const h = board.byKey.get(hk);
      if (!h) continue;

      const isPlay = (state.mode === 'play') && !state.gameOver;
      const isTurnSide = isPlay && (u.side === state.side);
      const isSpent = isTurnSide && state.actedUnitIds.has(u.id);
      const isMovePaused = isTurnSide && !isSpent && unitMoveIsPausedThisTurn(u);
      const isCmdLocked = isTurnSide && !isSpent && (state.actsUsed < ACT_LIMIT) &&
        (!unitIgnoresCommand(u)) && (u.quality === 'green') && (!inCommandAt(hk, u.side));

      // Visual friction: spent units and unorderable greens read as "not available".
      // - spent: dim
      // - green out-of-command: dim + dashed orange ring
      const alpha = isSpent ? 0.38 : (isMovePaused ? 0.58 : (isCmdLocked ? 0.48 : 1.0));

      const c = unitColors(u.side);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Token disc
      ctx.beginPath();
      ctx.arc(h.cx, h.cy, R * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = c.fill;
      ctx.fill();

      // Token ring (quality + black framing for readability at distance)
      drawQualityFramedRing(h.cx, h.cy, u.quality);

      // Selection ring
      if (state.selectedKey === hk) {
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, R * 0.70, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
      // Unit mark (ICON preferred, text fallback)
      const def = UNIT_BY_ID.get(u.type);

      const img = UNIT_ICONS && UNIT_ICONS[u.type];
      const canIcon = (u.type !== 'gen') && unitIconReady && unitIconReady(u.type);

      if (u.type === 'run') {
        drawRunnerFootGlyph(h.cx, h.cy, R * 0.82);
      } else if (canIcon) {
        const base = R * 0.95;
        const tune = (UNIT_ICON_TUNE && UNIT_ICON_TUNE[u.type]) ? UNIT_ICON_TUNE[u.type] : { scale: 0.95, y: 0 };
        const s = Math.floor(base * (tune.scale || 0.95));
        const yOff = Math.floor(R * (tune.y || 0));

        const rot = (typeof tune.rot === 'number') ? tune.rot : 0;

        ctx.imageSmoothingEnabled = true;
        if (rot) {
          ctx.save();
          ctx.translate(Math.floor(h.cx), Math.floor(h.cy + yOff));
          ctx.rotate(rot);
          ctx.drawImage(img, Math.floor(-s / 2), Math.floor(-s / 2), s, s);
          ctx.restore();
        } else {
          ctx.drawImage(img, Math.floor(h.cx - s / 2), Math.floor(h.cy - s / 2 + yOff), s, s);
        }
} else {
        // Original text symbols (kept as a fallback)
        const textScale = (u.type === 'inf' || u.type === 'cav' || u.type === 'skr') ? 0.83 : 1.0;
        const fontPx = Math.floor(R * 0.55 * textScale);
        ctx.font = `700 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = c.text;
        ctx.fillText(def.symbol, h.cx, h.cy + 1);
      }
      // HP pips (tiny)
      const maxHp = unitMaxHp(u.type, u.quality);
      const pipR = Math.max(2, Math.floor(R * 0.07));
      const startX = h.cx - (pipR * 2) * (maxHp - 1) * 0.5;
      const y = h.cy + R * 0.78;
      for (let i = 0; i < maxHp; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * (pipR * 2), y, pipR, 0, Math.PI * 2);
        ctx.fillStyle = (i < u.hp) ? '#fff' : '#ffffff33';
        ctx.fill();
      }

      ctx.restore();

      // Extra indicator: green out-of-command can't be activated (dashed orange ring).
      if (isCmdLocked) {
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, R * 0.64, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 157, 0, 0.9)';
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (isMovePaused) {
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, R * 0.64, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(205, 221, 255, 0.92)';
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (activeMoveAnim && activeMoveAnim.unit) {
      const p = moveAnimationPosition(activeMoveAnim);
      if (p) drawTokenAt(activeMoveAnim.unit, p.cx, p.cy);
    }

    if (state.actionPulse) {
      drawActionPulseOverlay(state.actionPulse);
    }

    renderModifierPreview();
  }

  // --- UI helpers
  function setActive(btn, isActive) {
    btn.classList.toggle('active', isActive);
  }

  function compactLabel(text, maxLen = 22) {
    const s = String(text || '');
    if (s.length <= maxLen) return s;
    return `${s.slice(0, Math.max(0, maxLen - 1))}…`;
  }

  function formatClock(ts) {
    const d = new Date(ts);
    if (!Number.isFinite(d.getTime())) return '--:--';
    try {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }

  function humanizeQuality(q) {
    if (!q) return 'Green';
    return String(q).charAt(0).toUpperCase() + String(q).slice(1);
  }

  function resetCombatRailScrollPositions() {
    for (const col of elCombatCols) {
      if (!col) continue;
      col.scrollTop = 0;
      col.scrollLeft = 0;
    }
  }

  function scheduleCombatRailScrollReset() {
    resetCombatRailScrollPositions();
    requestAnimationFrame(() => resetCombatRailScrollPositions());
    setTimeout(() => resetCombatRailScrollPositions(), 80);
    setTimeout(() => resetCombatRailScrollPositions(), 260);
  }

  function setInspectorValue(el, value) {
    if (!el) return;
    el.textContent = String(value);
  }

  function unitAttackSummary(unit, def) {
    if (!unit || !def) return '-';
    if (unit.type === 'run') return 'No attack';
    if (unit.type === 'iat') return 'Heal +1 adjacent';
    const melee = def.meleeDice ? `Melee ${def.meleeDice}` : '';
    if (!def.ranged) return melee || 'No attack';
    const rangedBits = Object.entries(def.ranged)
      .map(([dist, dice]) => `R${dist}:${dice}`)
      .join(', ');
    return `${melee}; ${rangedBits}`;
  }

  function resetInspector(message = '') {
    setInspectorValue(elInspectorTitle, 'No unit selected.');
    setInspectorValue(elInspectorMeta, message || 'Click a unit to view details.');
    setInspectorValue(elInspectorSide, '-');
    setInspectorValue(elInspectorType, '-');
    setInspectorValue(elInspectorQuality, '-');
    setInspectorValue(elInspectorHp, '-');
    setInspectorValue(elInspectorUp, '-');
    setInspectorValue(elInspectorMove, '-');
    setInspectorValue(elInspectorAttack, '-');
  }

  function updateInspector() {
    if (!elInspectorTitle) return;

    const selectedKey = state.selectedKey;
    const u = selectedKey ? unitsByHex.get(selectedKey) : null;
    if (!u) {
      resetInspector();
      return;
    }

    const def = UNIT_BY_ID.get(u.type);
    if (!def) {
      resetInspector('Selected unit data is unavailable.');
      return;
    }

    const qualityText = humanizeQuality(u.quality);
    const maxHp = unitMaxHp(u.type, u.quality);
    const up = unitUpValue(u.type, u.quality);
    const mp = unitMovePoints(u);
    const moveText = unitMoveIsPausedThisTurn(u) ? `${mp} (paused)` : `${mp}`;
    setInspectorValue(elInspectorTitle, `${u.side.toUpperCase()} ${def.label}`);
    setInspectorValue(elInspectorMeta, 'Selected formation details');
    setInspectorValue(elInspectorSide, u.side.toUpperCase());
    setInspectorValue(elInspectorType, def.abbrev);
    setInspectorValue(elInspectorQuality, qualityText);
    setInspectorValue(elInspectorHp, `${u.hp}/${maxHp}`);
    setInspectorValue(elInspectorUp, up);
    setInspectorValue(elInspectorMove, moveText);
    setInspectorValue(elInspectorAttack, unitAttackSummary(u, def));
  }

  function diePipIndexes(value) {
    switch (value) {
      case 1: return [4];
      case 2: return [0, 8];
      case 3: return [0, 4, 8];
      case 4: return [0, 2, 6, 8];
      case 5: return [0, 2, 4, 6, 8];
      case 6: return [0, 2, 3, 5, 6, 8];
      default: return [];
    }
  }

  function applyDieFace(face, value) {
    const on = new Set(diePipIndexes(value));
    const pips = face.children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].className = on.has(i) ? 'pip on' : 'pip';
    }
  }

  function makeDieFace(value) {
    const face = document.createElement('div');
    face.className = 'dieFace';
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      face.appendChild(pip);
    }
    applyDieFace(face, value);
    return face;
  }

  function applyPhysicalDieFace(face, value) {
    const on = new Set(diePipIndexes(value));
    const pips = face.children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].className = on.has(i) ? 'physicalPip on' : 'physicalPip';
    }
  }

  function makePhysicalDieFace(value) {
    const face = document.createElement('div');
    face.className = 'physicalFace';
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('span');
      pip.className = 'physicalPip';
      face.appendChild(pip);
    }
    applyPhysicalDieFace(face, value);
    return face;
  }

  function makePhysicalDieShell(value, outcome = 'miss', title = '') {
    const shell = document.createElement('div');
    shell.className = `physicalDie ${outcome}`;
    const face = makePhysicalDieFace(value);
    shell.appendChild(face);
    if (title) shell.title = title;
    return { shell, face };
  }

  function renderIdlePhysicalDice() {
    if (!elPhysicalDiceRow) return;
    elPhysicalDiceRow.innerHTML = '';
    const sample = [1, 3, 5];
    for (const v of sample) {
      const { shell } = makePhysicalDieShell(v, 'miss', `Sample d6 ${v}`);
      shell.style.setProperty('--dice-rot', `${(v - 2) * 2}deg`);
      const wrap = document.createElement('div');
      wrap.className = 'physicalDieWrap';
      const label = document.createElement('div');
      label.className = 'physicalDieLabel';
      label.textContent = (v >= 5) ? 'hit' : 'miss';
      wrap.appendChild(shell);
      wrap.appendChild(label);
      elPhysicalDiceRow.appendChild(wrap);
    }
  }

  function clearDiceDisplay() {
    diceRenderNonce += 1;
    if (elDiceSummary) elDiceSummary.textContent = 'No rolls yet.';
    if (elDicePerDie) elDicePerDie.textContent = '';
    if (elDiceOutcomeBrief) elDiceOutcomeBrief.textContent = 'Outcome: -';
    if (elDiceTray) elDiceTray.innerHTML = '';
    renderIdlePhysicalDice();
    clearCombatBreakdown();
  }

  function terrainLabel(terrainId) {
    return TERRAIN_LABEL_BY_ID.get(terrainId) || 'Unknown';
  }

  function renderModifierPreview() {
    if (!elModifierPreview) return;
    if (state.mode !== 'play') {
      elModifierPreview.textContent = 'Modifier preview: start battle and hover/select a unit.';
      return;
    }

    const previewKey = (() => {
      if (state.selectedKey && unitsByHex.has(state.selectedKey)) return state.selectedKey;
      if (state._hoverKey && unitsByHex.has(state._hoverKey)) return state._hoverKey;
      return null;
    })();

    if (!previewKey) {
      elModifierPreview.textContent = 'Modifier preview: hover or select a unit.';
      return;
    }

    const u = unitsByHex.get(previewKey);
    const h = board.byKey.get(previewKey);
    if (!u || !h) {
      elModifierPreview.textContent = 'Modifier preview: -';
      return;
    }

    let terrainMod = 0;
    if (h.terrain === 'woods') terrainMod -= 1;
    if (h.terrain === 'hills' && (u.type === 'arc' || u.type === 'skr')) terrainMod -= 1;
    const terrainText = terrainMod ? `defense terrain ${terrainMod}` : 'defense terrain 0';
    const attackOutMod = (() => {
      let n = 0;
      if (h.terrain === 'rough') n -= 1;
      return n;
    })();
    const attackOutText = attackOutMod ? `attack-out ${attackOutMod}` : 'attack-out 0';

    if (u.type !== 'inf') {
      elModifierPreview.textContent =
        `Modifier preview (${u.side.toUpperCase()} ${UNIT_BY_ID.get(u.type)?.abbrev || u.type}): ${terrainText}, ${attackOutText}, reinforcement n/a, minimum 1 die.`;
      return;
    }

    const profile = reinforcementPreviewForAnchor(previewKey);
    const reinfMod = (profile && profile.active) ? -1 : 0;
    if (profile && profile.active) {
      const dirText = profile.braceDirs.map(d => d.toUpperCase()).join('/');
      elModifierPreview.textContent =
        `Modifier preview (front attack): ${terrainText}, ${attackOutText}, reinforcement ${reinfMod} ` +
        `(adjacent brace pair), active vs attacks from ${dirText}, minimum 1 die.`;
      return;
    }

    elModifierPreview.textContent =
      `Modifier preview (front attack): ${terrainText}, ${attackOutText}, reinforcement 0 ` +
      `(needs two adjacent friendly infantry touching each other), minimum 1 die.`;
  }

  function setCombatSupportStatus(text, cls = 'na') {
    if (!elCombatSupport) return;
    elCombatSupport.textContent = text;
    elCombatSupport.classList.remove('active', 'inactive', 'na');
    elCombatSupport.classList.add(cls);
  }

  function supportStatusForCombat(info) {
    const ranks = Math.max(0, Number(info?.supportRanks || 0));
    const dicePenalty = Math.abs(Number(info?.supportDiceMod || 0));
    const pairCount = Math.max(0, Number(info?.supportPairCount || 0));
    const matchingCount = Math.max(0, Number(info?.supportMatchingCount || 0));
    const attackDir = String(info?.supportAttackDir || '').toUpperCase();

    if (!info || info.kind !== 'melee' || info.defenderType !== 'inf') {
      return {
        text: 'Infantry support: not applicable (only melee attacks into Infantry).',
        cls: 'na',
      };
    }

    if (ranks > 0 && dicePenalty > 0) {
      return {
        text:
          `Infantry support ACTIVE: adjacent brace pair matched attack direction ${attackDir}. ` +
          `Attacker -${dicePenalty} die${dicePenalty === 1 ? '' : 's'}.`,
        cls: 'active',
      };
    }

    const reason = pairCount === 0
      ? 'no adjacent friendly INF pair on defender'
      : `attack direction ${attackDir || '?'} did not match braced sides (${matchingCount} matches)`;
    return {
      text: `Infantry support not active: ${reason}.`,
      cls: 'inactive',
    };
  }

  function clearCombatBreakdown() {
    state.lastCombat = null;
    if (elCombatSummary) elCombatSummary.textContent = 'No combat yet. Select a unit and attack to see exact dice math.';
    if (elCombatMath) elCombatMath.textContent = 'Dice math: -';
    if (elCombatTerrain) elCombatTerrain.textContent = 'Defense modifiers: -';
    setCombatSupportStatus('Infantry support: -', 'na');
    if (elCombatHint) elCombatHint.textContent = COMBAT_RULE_HINT;
  }

  function renderCombatBreakdown(rolls, info) {
    if (!info) {
      clearCombatBreakdown();
      return;
    }

    state.lastCombat = { info, rolls: Array.isArray(rolls) ? [...rolls] : [] };

    const posText = (info.impactPosition && info.impactPosition !== 'none') ? ` from ${info.impactPosition}` : '';
    const pivotText = info.pivoted ? ` (defender pivoted from ${info.pivotFrom})` : '';
    const terrainName = terrainLabel(info.defenderTerrain || 'clear');
    const terrainDelta = Number(info.terrainDiceMod || 0);
    const attackTerrainDelta = Number(info.attackTerrainDiceMod || 0);
    const supportDelta = Number(info.supportDiceMod || 0);
    const supportRanks = Math.max(0, Number(info.supportRanks || 0));
    const supportPairCount = Math.max(0, Number(info.supportPairCount || 0));
    const supportMatchingCount = Math.max(0, Number(info.supportMatchingCount || 0));
    const supportAttackDir = String(info.supportAttackDir || '').toUpperCase();
    const terrainMath = terrainDelta
      ? `${terrainName} ${terrainDelta > 0 ? `+${terrainDelta}` : `${terrainDelta}`} die`
      : `${terrainName}: no dice change`;
    const attackTerrainMath = attackTerrainDelta
      ? `attacker terrain ${attackTerrainDelta > 0 ? `+${attackTerrainDelta}` : `${attackTerrainDelta}`} die`
      : 'attacker terrain 0';
    const supportMath = supportDelta
      ? `${supportRanks} line ${supportDelta > 0 ? `+${supportDelta}` : `${supportDelta}`} die (matched pairs ${supportMatchingCount}, attack ${supportAttackDir})`
      : `none (available pairs ${supportPairCount}, attack ${supportAttackDir || '?'})`;
    const flankText = info.flankBonus ? ` + flank ${info.flankBonus}` : '';
    const rearText = info.rearBonus ? ` + rear ${info.rearBonus}` : '';
    const hillDiceText = Number(info.hillBonusDice || 0) ? ` + hill-shot ${Math.abs(Number(info.hillBonusDice || 0))}` : '';
    const attackTerrainText = attackTerrainDelta
      ? ` ${attackTerrainDelta > 0 ? '+' : '-'} atk-terrain ${Math.abs(attackTerrainDelta)}`
      : '';
    const terrainText = terrainDelta ? ` ${terrainDelta > 0 ? '+' : '-'} terrain ${Math.abs(terrainDelta)}` : '';
    const supportText = supportDelta ? ` - support ${Math.abs(supportDelta)}` : '';

    if (elCombatSummary) {
      elCombatSummary.textContent =
        `${info.attacker} ${info.kind.toUpperCase()} r${info.dist}${posText} vs ${info.defender}${pivotText}.`;
    }
    if (elCombatMath) {
      elCombatMath.textContent =
        `Dice math: base ${info.baseDice}${flankText}${rearText}${hillDiceText}${attackTerrainText}${terrainText}${supportText} = ${info.dice}.`;
    }
    if (elCombatTerrain) {
      elCombatTerrain.textContent =
        `Defense modifiers: ${attackTerrainMath}; terrain ${terrainMath}; infantry support ${supportMath}.`;
    }
    const supportStatus = supportStatusForCombat(info);
    setCombatSupportStatus(supportStatus.text, supportStatus.cls);

    const conciseOutcome = `Outcome: ${info.hits} hit${info.hits === 1 ? '' : 's'}, ${info.retreats} retreat${info.retreats === 1 ? '' : 's'}, ${info.misses} miss${info.misses === 1 ? '' : 'es'}.`;
    if (elDiceOutcomeBrief) elDiceOutcomeBrief.textContent = conciseOutcome;

    if (elCombatHint) elCombatHint.textContent = COMBAT_RULE_HINT;
  }

  function renderDiceDisplay(rolls, info) {
    if (!elPhysicalDiceRow && !elDicePerDie && !elDiceOutcomeBrief && !elDiceSummary) return;

    diceRenderNonce += 1;
    const renderNonce = diceRenderNonce;

    const finalSummary =
      `${info.attacker} ${info.kind.toUpperCase()} vs ${info.defender} · ${info.dice} dice`;
    const briefOutcome =
      `Outcome: ${info.hits} hit${info.hits === 1 ? '' : 's'}, ` +
      `${info.retreats} retreat${info.retreats === 1 ? '' : 's'}, ` +
      `${info.misses} miss${info.misses === 1 ? '' : 'es'}.`;
    if (elDiceSummary) elDiceSummary.textContent = `Rolling ${info.dice} dice…`;
    if (elDicePerDie) elDicePerDie.textContent = '';
    if (elDiceOutcomeBrief) elDiceOutcomeBrief.textContent = 'Outcome: resolving...';

    if (elDiceTray) elDiceTray.innerHTML = '';
    if (elPhysicalDiceRow) elPhysicalDiceRow.innerHTML = '';
    const perDieText = Array.from({ length: rolls.length }, () => '...');
    for (let i = 0; i < rolls.length; i++) {
      const roll = rolls[i];
      let die = null;
      let face = null;
      let mark = null;
      if (elDiceTray) {
        die = document.createElement('div');
        die.className = 'die rolling';
        face = makeDieFace(1 + Math.floor(Math.random() * 6));
        die.appendChild(face);
        mark = document.createElement('span');
        mark.className = 'dieBadge';
        mark.textContent = '?';
        die.appendChild(mark);
        die.title = 'Rolling…';
        elDiceTray.appendChild(die);
      }

      let physicalDie = null;
      let physicalFace = null;
      let physicalLabel = null;
      if (elPhysicalDiceRow) {
        const shell = makePhysicalDieShell(1 + Math.floor(Math.random() * 6), 'rolling', 'Rolling…');
        const wrap = document.createElement('div');
        wrap.className = 'physicalDieWrap';
        physicalDie = shell.shell;
        physicalFace = shell.face;
        physicalDie.className = 'physicalDie rolling';
        physicalDie.style.setProperty('--dice-rot', `${Math.floor(Math.random() * 19) - 9}deg`);
        physicalLabel = document.createElement('div');
        physicalLabel.className = 'physicalDieLabel';
        physicalLabel.textContent = '...';
        wrap.appendChild(physicalDie);
        wrap.appendChild(physicalLabel);
        elPhysicalDiceRow.appendChild(wrap);
      }

      const settleDelay = 180 + (i * 80);
      setTimeout(() => {
        if (renderNonce !== diceRenderNonce) return;

        let outcome = 'miss';
        let badge = 'M';
        let word = 'miss';
        if (DIE_HIT.has(roll)) {
          outcome = 'hit';
          badge = 'H';
          word = 'hit';
        } else if (roll === DIE_RETREAT) {
          outcome = 'retreat';
          badge = 'R';
          word = 'retreat';
        }

        if (die && face && mark) {
          applyDieFace(face, roll);
          die.className = `die ${outcome}`;
          mark.textContent = badge;
          die.title = `Roll ${roll} (${badge})`;
        }
        perDieText[i] = word;
        if (elDicePerDie) elDicePerDie.textContent = perDieText.join(' · ');

        if (physicalDie && physicalFace) {
          applyPhysicalDieFace(physicalFace, roll);
          physicalDie.className = `physicalDie ${outcome}`;
          physicalDie.style.setProperty('--dice-rot', `${Math.floor(Math.random() * 11) - 5}deg`);
          physicalDie.title = `Roll ${roll} (${badge})`;
        }
        if (physicalLabel) physicalLabel.textContent = word;
      }, settleDelay);
    }

    const summaryDelay = 220 + (Math.max(0, rolls.length - 1) * 80);
    setTimeout(() => {
      if (renderNonce !== diceRenderNonce) return;
      if (elDiceSummary) elDiceSummary.textContent = finalSummary;
      if (elDicePerDie) elDicePerDie.textContent = perDieText.join(' · ');
      if (elDiceOutcomeBrief) elDiceOutcomeBrief.textContent = briefOutcome;
    }, summaryDelay);
  }

  function log(msg) {
    state.last = msg;
    elHudLast.textContent = msg;

    state.events.push({ t: Date.now(), msg });
    if (state.events.length > 50) state.events.shift();
  }

  function totals(side) {
    let up = 0;
    let hp = 0;
    let gens = 0;
    let units = 0;

    for (const u of unitsByHex.values()) {
      if (u.side !== side) continue;
      up += unitUpValue(u.type, u.quality);
      hp += u.hp;
      units += 1;
      if (u.type === 'gen') gens += 1;
    }

    return { up, hp, gens, units };
  }

  function victoryModeLabel(id) {
    if (id === 'annihilation') return 'Annihilation';
    if (id === 'decapitation') return 'Decapitation';
    return 'Clear Victory';
  }

  function clampPct(v) {
    return Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
  }

  function renderVictoryTrack(blueTotals, redTotals, hideOpponent = false) {
    if (!elVictoryTrackBody) return;

    if (hideOpponent) {
      elVictoryTrackBody.innerHTML = '<div class="victoryNote">Victory track hidden during fog draft setup.</div>';
      return;
    }

    if (state.victoryMode === 'clear') {
      const needBlue = Math.max(1, Math.ceil(state.initialUP.red / 2));
      const needRed = Math.max(1, Math.ceil(state.initialUP.blue / 2));
      const blueCap = Math.max(0, state.capturedUP.blue);
      const redCap = Math.max(0, state.capturedUP.red);
      const bluePct = clampPct((blueCap / needBlue) * 100);
      const redPct = clampPct((redCap / needRed) * 100);
      elVictoryTrackBody.innerHTML = `
        <div class="victoryRow">
          <div class="victoryLabel blue">Blue</div>
          <div class="victoryBar"><div class="victoryFill blue" style="width:${bluePct.toFixed(1)}%"></div></div>
          <div class="victoryValue">
            <span class="victoryMain">${blueCap}/${needBlue} Captured UP</span>
            <span class="victorySub">${blueTotals.up} UP · ${blueTotals.hp} HP</span>
          </div>
        </div>
        <div class="victoryRow">
          <div class="victoryLabel red">Red</div>
          <div class="victoryBar"><div class="victoryFill red" style="width:${redPct.toFixed(1)}%"></div></div>
          <div class="victoryValue">
            <span class="victoryMain">${redCap}/${needRed} Captured UP</span>
            <span class="victorySub">${redTotals.up} UP · ${redTotals.hp} HP</span>
          </div>
        </div>
        <div class="victoryNote">Fill the bar to win Clear Victory.</div>
      `;
      return;
    }

    if (state.victoryMode === 'decapitation') {
      elVictoryTrackBody.innerHTML = `
        <div class="victoryRow">
          <div class="victoryLabel blue">Blue</div>
          <div class="victoryNote">Generals left</div>
          <div class="victoryValue">
            <span class="victoryMain">GEN ${blueTotals.gens}</span>
            <span class="victorySub">${blueTotals.up} UP · ${blueTotals.hp} HP</span>
          </div>
        </div>
        <div class="victoryRow">
          <div class="victoryLabel red">Red</div>
          <div class="victoryNote">Generals left</div>
          <div class="victoryValue">
            <span class="victoryMain">GEN ${redTotals.gens}</span>
            <span class="victorySub">${redTotals.up} UP · ${redTotals.hp} HP</span>
          </div>
        </div>
      `;
      return;
    }

    elVictoryTrackBody.innerHTML = `
      <div class="victoryRow">
        <div class="victoryLabel blue">Blue</div>
        <div class="victoryNote">Units left</div>
        <div class="victoryValue">
          <span class="victoryMain">UNITS ${blueTotals.units}</span>
          <span class="victorySub">${blueTotals.up} UP · ${blueTotals.hp} HP</span>
        </div>
      </div>
      <div class="victoryRow">
        <div class="victoryLabel red">Red</div>
        <div class="victoryNote">Units left</div>
        <div class="victoryValue">
          <span class="victoryMain">UNITS ${redTotals.units}</span>
          <span class="victorySub">${redTotals.up} UP · ${redTotals.hp} HP</span>
        </div>
      </div>
    `;
  }

  function openRulesModal() {
    if (!elRulesModal || !elRulesModalBody) return;
    if (elRulesModalTitle) {
      elRulesModalTitle.textContent = 'Rules Guide';
    }
    elRulesModalBody.innerHTML = RULES_FULL_HTML;
    elRulesModal.classList.add('open');
    elRulesModal.setAttribute('aria-hidden', 'false');
  }

  function closeRulesModal() {
    if (!elRulesModal) return;
    elRulesModal.classList.remove('open');
    elRulesModal.setAttribute('aria-hidden', 'true');
  }

  function normalizeDraftMode(mode) {
    if (mode === 'visible' || mode === 'fog') return mode;
    return 'off';
  }

  function parseDraftBudget(value) {
    return clampInt(value, DRAFT_BUDGET_MIN, DRAFT_BUDGET_MAX, DRAFT_BUDGET_DEFAULT);
  }

  function draftModeLabel(mode) {
    if (mode === 'visible') return 'Visible Placement';
    if (mode === 'fog') return 'Hidden Placement';
    return 'Off';
  }

  function draftMinimumUnitCost() {
    let min = Infinity;
    for (const def of UNIT_DEFS) {
      if (!def || !def.id) continue;
      const quality = normalizeQuality(def.id, 'green');
      const cost = unitUpValue(def.id, quality);
      if (cost > 0 && cost < min) min = cost;
    }
    return Number.isFinite(min) ? min : 1;
  }

  function draftCanSpend(side) {
    if (side !== 'blue' && side !== 'red') return false;
    return state.draft.remaining[side] >= draftMinimumUnitCost();
  }

  function isUnitVisibleForCurrentView(unit) {
    if (!unit) return false;
    if (!state.draft.active) return true;
    if (state.draft.mode !== 'fog') return true;
    if (state.draft.reveal) return true;
    return unit.side === state.draft.side;
  }

  function resetDraftState({ keepBudget = true } = {}) {
    const budget = keepBudget ? parseDraftBudget(state.draft.budget) : DRAFT_BUDGET_DEFAULT;
    state.draft.active = false;
    state.draft.mode = 'off';
    state.draft.budget = budget;
    state.draft.remaining.blue = 0;
    state.draft.remaining.red = 0;
    state.draft.done.blue = false;
    state.draft.done.red = false;
    state.draft.side = 'blue';
    state.draft.reveal = true;
  }

  function finalizeDraftSetup() {
    if (!state.draft.active) return;
    state.draft.active = false;
    state.draft.reveal = true;
    state.draft.done.blue = true;
    state.draft.done.red = true;
    state.editSide = 'blue';
    clearSelection();
    log('Custom army setup complete. Review the board, then click Start Battle.');
  }

  function draftSwitchTurnVisible(currentSide) {
    const other = (currentSide === 'blue') ? 'red' : 'blue';
    if (!state.draft.done[other] && draftCanSpend(other)) {
      state.draft.side = other;
      return true;
    }
    if (!state.draft.done[currentSide] && draftCanSpend(currentSide)) {
      state.draft.side = currentSide;
      return true;
    }
    return false;
  }

  function startCustomDraftSetup() {
    const mode = normalizeDraftMode(elDraftModeSel?.value);
    if (mode === 'off') {
      log('Choose a draft mode first: Visible Placement or Hidden Placement.');
      updateHud();
      return;
    }

    const budget = parseDraftBudget(elDraftBudgetInput?.value);
    stopAiLoop();
    enterEdit();
    clearUnits();
    clearDiceDisplay();
    clearSelection();

    state.draft.active = true;
    state.draft.mode = mode;
    state.draft.budget = budget;
    state.draft.remaining.blue = budget;
    state.draft.remaining.red = budget;
    state.draft.done.blue = false;
    state.draft.done.red = false;
    state.draft.side = 'blue';
    state.draft.reveal = (mode !== 'fog');
    state.gameMode = 'hvh';

    state.tool = 'units';
    state.editErase = false;
    state.editSide = 'blue';
    state.editType = 'inf';
    if (state.editType === 'iat') state.editQuality = 'regular';

    log(
      `Custom draft started (${draftModeLabel(mode)}). ` +
      `Budget: ${budget} UP per side. BLUE places first.`
    );
    updateHud();
  }

  function finishDraftForCurrentSide(manual = true) {
    if (!state.draft.active) return;
    const side = state.draft.side;
    state.draft.done[side] = true;

    if (state.draft.mode === 'visible') {
      const advanced = draftSwitchTurnVisible(side);
      if (!advanced) {
        finalizeDraftSetup();
      } else {
        state.editSide = state.draft.side;
        if (manual) {
          log(`${side.toUpperCase()} is done drafting. ${state.draft.side.toUpperCase()} continues.`);
        }
      }
      updateHud();
      return;
    }

    // Fog mode: each side drafts privately, then reveal.
    if (side === 'blue' && !state.draft.done.red && draftCanSpend('red')) {
      state.draft.side = 'red';
      state.editSide = 'red';
      clearSelection();
      log('BLUE locked in. RED drafts privately now.');
      updateHud();
      return;
    }

    finalizeDraftSetup();
    updateHud();
  }

  function handleDraftPlacement(hexKey) {
    if (!state.draft.active) return false;

    const side = state.draft.side;
    state.editSide = side;

    const existing = unitsByHex.get(hexKey);
    if (state.editErase) {
      if (!existing) {
        log('No unit to remove on that hex.');
        updateHud();
        return true;
      }
      if (existing.side !== side) {
        log('During draft, you can only remove your own units.');
        updateHud();
        return true;
      }

      const refund = unitUpValue(existing.type, existing.quality);
      unitsByHex.delete(hexKey);
      state.draft.remaining[side] += refund;
      state.draft.done[side] = false;
      log(`Removed ${side.toUpperCase()} ${UNIT_BY_ID.get(existing.type)?.abbrev || existing.type}. Refunded ${refund} UP.`);
      updateHud();
      return true;
    }

    if (state.tool !== 'units') {
      log('Custom draft only allows unit placement.');
      updateHud();
      return true;
    }
    if (state.draft.done[side]) {
      log(`${side.toUpperCase()} is already locked in.`);
      updateHud();
      return true;
    }

    const type = state.editType;
    const def = UNIT_BY_ID.get(type);
    if (!def) {
      updateHud();
      return true;
    }
    const quality = normalizeQuality(type, state.editQuality);
    const newCost = unitUpValue(type, quality);

    if (existing && existing.side !== side) {
      log('That hex is already occupied.');
      updateHud();
      return true;
    }

    const oldCost = existing ? unitUpValue(existing.type, existing.quality) : 0;
    const delta = newCost - oldCost;
    if (delta > state.draft.remaining[side]) {
      log(
        `Not enough UP: ${side.toUpperCase()} has ${state.draft.remaining[side]} UP left, ` +
        `needs ${delta} more for ${def.abbrev} (${quality}).`
      );
      updateHud();
      return true;
    }

    if (existing) {
      existing.side = side;
      existing.type = type;
      existing.quality = quality;
      existing.hp = unitMaxHp(type, quality);
      delete existing.movePauseUntilTurn;
      log(`Draft replace at ${hexKey} -> ${side.toUpperCase()} ${def.abbrev} (${newCost} UP).`);
    } else {
      unitsByHex.set(hexKey, {
        id: nextUnitId++,
        side,
        type,
        quality,
        hp: unitMaxHp(type, quality),
        movePauseUntilTurn: 0,
      });
      log(`Draft placed ${side.toUpperCase()} ${def.abbrev} at ${hexKey} (${newCost} UP).`);
    }

    state.draft.remaining[side] -= delta;

    if (!draftCanSpend(side)) {
      state.draft.done[side] = true;
    }

    if (state.draft.mode === 'visible') {
      const advanced = draftSwitchTurnVisible(side);
      if (!advanced) {
        finalizeDraftSetup();
      } else {
        state.editSide = state.draft.side;
      }
      updateHud();
      return true;
    }

    // Fog mode: current side keeps placing until Done (or no UP left).
    if (state.draft.done[side]) {
      finishDraftForCurrentSide(false);
      return true;
    }

    updateHud();
    return true;
  }

  function updateDraftStatusUi() {
    if (!elDraftStatus) return;

    if (!state.draft.active) {
      const modePreview = normalizeDraftMode(elDraftModeSel?.value);
      if (modePreview === 'off') {
        elDraftStatus.textContent = 'Draft inactive.';
      } else {
        const budget = parseDraftBudget(elDraftBudgetInput?.value);
        elDraftStatus.textContent = `${draftModeLabel(modePreview)} ready. Budget preview: ${budget} UP per side.`;
      }
      return;
    }

    const side = state.draft.side.toUpperCase();
    const fogNote = (state.draft.mode === 'fog' && !state.draft.reveal)
      ? 'Hidden setup is active.'
      : 'Placement is visible to both players.';
    if (state.draft.mode === 'fog' && !state.draft.reveal) {
      elDraftStatus.textContent =
        `${draftModeLabel(state.draft.mode)} · ${side} placing · ` +
        `${side} UP left: ${state.draft.remaining[state.draft.side]}. ${fogNote}`;
    } else {
      elDraftStatus.textContent =
        `${draftModeLabel(state.draft.mode)} · ${side} placing · ` +
        `UP left: Blue ${state.draft.remaining.blue}, Red ${state.draft.remaining.red}. ` +
        `${fogNote}`;
    }
  }

  function onlineModeActive() {
    return state.gameMode === 'online';
  }

  function onlineLibReady() {
    return typeof window.Peer === 'function';
  }

  function normalizeOnlineCode(raw) {
    const source = String(raw || '').toUpperCase();
    let out = '';
    for (const ch of source) {
      if (ONLINE_CODE_ALPHABET.includes(ch)) out += ch;
      if (out.length >= ONLINE_CODE_LENGTH) break;
    }
    return out;
  }

  function randomOnlineCode() {
    let out = '';
    for (let i = 0; i < ONLINE_CODE_LENGTH; i++) {
      const idx = Math.floor(Math.random() * ONLINE_CODE_ALPHABET.length);
      out += ONLINE_CODE_ALPHABET[idx];
    }
    return out;
  }

  function onlinePeerIdForCode(code) {
    return `${ONLINE_PEER_PREFIX}${normalizeOnlineCode(code)}`;
  }

  function onlineCodeFromPeerId(peerId) {
    const s = String(peerId || '');
    if (s.startsWith(ONLINE_PEER_PREFIX)) {
      return normalizeOnlineCode(s.slice(ONLINE_PEER_PREFIX.length));
    }
    return normalizeOnlineCode(s);
  }

  function setOnlineStatus(msg) {
    net.status = String(msg || 'Online: idle.');
    if (elOnlineStatus) {
      elOnlineStatus.textContent = '';
      elOnlineStatus.style.display = 'none';
    }
  }

  function onlineRoleHintText() {
    if (!onlineModeActive()) {
      return 'Switch Game mode to Online, then create or join a room.';
    }
    if (net.connected && net.isHost) {
      return 'You are Host (Blue). You control setup/rules and start the battle.';
    }
    if (net.connected && !net.isHost) {
      return 'You are Guest (Red). Host controls setup/rules/start.';
    }
    if (net.peer && net.isHost) {
      return 'Room created. Share the 4-character room code.';
    }
    if (net.peer && !net.isHost) {
      return `Connecting to room ${net.remoteCode || '----'}...`;
    }
    return 'Host creates a room. Guest enters the 4-character code and connects.';
  }

  function ensureOnlineMode() {
    if (state.gameMode === 'online') return;
    stopAiLoop();
    state.gameMode = 'online';
    if (elGameModeSel) elGameModeSel.value = 'online';
  }

  function onlineSendPacket(packet) {
    if (!net.conn || !net.connected) return false;
    try {
      net.conn.send(packet);
      return true;
    } catch (err) {
      setOnlineStatus(`Online send failed: ${err && err.message ? err.message : String(err)}`);
      return false;
    }
  }

  function onlineBroadcastSnapshot(reason = 'sync') {
    if (!onlineModeActive()) return;
    if (!net.isHost || !net.connected) return;
    const snapshot = buildStateSnapshot();
    snapshot.state.gameMode = 'online';
    onlineSendPacket({ kind: 'snapshot', reason, snapshot });
  }

  function onlineCloseConnection() {
    if (net.conn) {
      try { net.conn.close(); } catch (_) {}
    }
    net.conn = null;
    net.connected = false;
    net.remoteCode = '';
  }

  function onlineDestroyPeer() {
    onlineCloseConnection();
    if (net.peer) {
      try { net.peer.destroy(); } catch (_) {}
    }
    net.peer = null;
    net.myCode = '';
    net.isHost = false;
  }

  function onlineLeaveSession(statusText = 'Online: idle.') {
    onlineDestroyPeer();
    setOnlineStatus(statusText);
    updateHud();
  }

  function onlineExpectedLocalSide() {
    return net.isHost ? 'blue' : 'red';
  }

  function executeOnlineActionLocal(action) {
    if (!action || typeof action !== 'object') return false;
    switch (action.type) {
      case 'click': {
        if (typeof action.hexKey !== 'string') return false;
        if (!board.activeSet.has(action.hexKey)) return false;
        clickPlay(action.hexKey);
        return true;
      }
      case 'pass':
        passSelected();
        return true;
      case 'line_advance':
        lineAdvanceFromSelection(action.advanceDir);
        return true;
      case 'end_turn':
        endTurn();
        return true;
      default:
        return false;
    }
  }

  function forwardOnlineAction(action) {
    if (!onlineModeActive() || !net.connected) return false;

    const localSide = onlineExpectedLocalSide();
    if (state.mode !== 'play' || state.gameOver) {
      log('Online: enter Play mode to act.');
      updateHud();
      return true;
    }
    if (state.side !== localSide) {
      log(`Online: waiting for ${state.side.toUpperCase()} player.`);
      updateHud();
      return true;
    }

    if (net.isHost) {
      executeOnlineActionLocal(action);
    } else {
      const ok = onlineSendPacket({ kind: 'action', action });
      if (!ok) {
        log('Online: failed to send action to host.');
        updateHud();
      }
    }
    return true;
  }

  function onOnlinePacket(packet) {
    if (!packet || typeof packet !== 'object') return;

    if (packet.kind === 'hello') {
      if (net.isHost) onlineBroadcastSnapshot('hello');
      return;
    }

    if (packet.kind === 'snapshot') {
      if (net.isHost) return;
      net.applyingRemoteSnapshot = true;
      applyImportedState(packet.snapshot, 'online sync', { silent: true, skipAiKick: true });
      net.applyingRemoteSnapshot = false;
      return;
    }

    if (packet.kind === 'action') {
      if (!net.isHost || !onlineModeActive() || !net.connected) return;
      if (state.mode !== 'play' || state.gameOver) return;
      if (state.side !== 'red') {
        onlineBroadcastSnapshot('turn-mismatch');
        return;
      }
      executeOnlineActionLocal(packet.action);
      return;
    }
  }

  function bindOnlineConnection(conn) {
    if (!conn) return;
    onlineCloseConnection();
    net.conn = conn;
    if (typeof conn.peer === 'string') net.remoteCode = onlineCodeFromPeerId(conn.peer);

    conn.on('open', () => {
      net.connected = true;
      if (typeof conn.peer === 'string') net.remoteCode = onlineCodeFromPeerId(conn.peer);
      if (net.isHost) {
        setOnlineStatus(`Connected. Room ${net.myCode || '----'} is live.`);
      } else {
        setOnlineStatus(`Connected to room ${net.remoteCode || '----'}.`);
      }
      if (net.isHost) {
        maybeRollOnlineOpeningInitiative();
      }
      if (net.isHost) onlineBroadcastSnapshot('peer-open');
      else onlineSendPacket({ kind: 'hello' });
      updateHud();
    });
    conn.on('data', onOnlinePacket);
    conn.on('close', () => {
      if (net.conn !== conn) return;
      onlineCloseConnection();
      setOnlineStatus('Online: connection closed.');
      updateHud();
    });
    conn.on('error', (err) => {
      setOnlineStatus(`Online connection error: ${err && err.message ? err.message : String(err)}`);
      updateHud();
    });
  }

  function startOnlineHost() {
    ensureOnlineMode();
    if (!onlineLibReady()) {
      setOnlineStatus('Online unavailable: PeerJS failed to load.');
      updateHud();
      return;
    }

    onlineDestroyPeer();
    net.isHost = true;
    net.myCode = randomOnlineCode();

    function openHostPeer(triesLeft) {
      const roomCode = net.myCode || randomOnlineCode();
      const peerId = onlinePeerIdForCode(roomCode);
      let opened = false;
      const peer = new window.Peer(peerId);
      net.peer = peer;
      setOnlineStatus(`Creating room ${roomCode}...`);

      peer.on('open', (id) => {
        if (net.peer !== peer) return;
        opened = true;
        net.myCode = onlineCodeFromPeerId(id) || roomCode;
        setOnlineStatus(`Room ${net.myCode} ready. Share this code. You are BLUE.`);
        updateHud();
      });
      peer.on('connection', (incomingConn) => {
        if (net.peer !== peer || !net.isHost) {
          try { incomingConn.close(); } catch (_) {}
          return;
        }
        if (net.conn && net.connected) {
          try { incomingConn.close(); } catch (_) {}
          return;
        }
        bindOnlineConnection(incomingConn);
      });
      peer.on('error', (err) => {
        if (net.peer !== peer) return;
        const errText = String(err?.type || err?.message || err || '').toLowerCase();
        if (!opened && triesLeft > 0 && (errText.includes('unavailable') || errText.includes('taken') || errText.includes('id'))) {
          try { peer.destroy(); } catch (_) {}
          net.peer = null;
          net.myCode = randomOnlineCode();
          openHostPeer(triesLeft - 1);
          return;
        }
        setOnlineStatus(`Online host error: ${err && err.message ? err.message : String(err)}`);
        updateHud();
      });
      peer.on('close', () => {
        if (net.peer !== peer) return;
        onlineDestroyPeer();
        setOnlineStatus('Online: room closed.');
        updateHud();
      });
    }

    openHostPeer(8);
    updateHud();
  }

  function startOnlineJoin() {
    ensureOnlineMode();
    if (!onlineLibReady()) {
      setOnlineStatus('Online unavailable: PeerJS failed to load.');
      updateHud();
      return;
    }

    const hostCode = normalizeOnlineCode(elOnlineJoinCode?.value || '');
    if (elOnlineJoinCode) elOnlineJoinCode.value = hostCode;
    if (hostCode.length !== ONLINE_CODE_LENGTH) {
      setOnlineStatus(`Enter a ${ONLINE_CODE_LENGTH}-character room code.`);
      updateHud();
      return;
    }

    onlineDestroyPeer();
    net.isHost = false;
    net.remoteCode = hostCode;
    setOnlineStatus(`Connecting to room ${hostCode}...`);

    const peer = new window.Peer();
    net.peer = peer;

    peer.on('open', () => {
      if (net.peer !== peer) return;
      net.myCode = '';
      const conn = peer.connect(onlinePeerIdForCode(hostCode), { reliable: true });
      bindOnlineConnection(conn);
      updateHud();
    });
    peer.on('error', (err) => {
      if (net.peer !== peer) return;
      const errType = String(err?.type || '').toLowerCase();
      if (errType.includes('peer-unavailable')) {
        setOnlineStatus(`Room ${hostCode} not found. Check code and try again.`);
      } else {
        setOnlineStatus(`Online join error: ${err && err.message ? err.message : String(err)}`);
      }
      updateHud();
    });
    peer.on('close', () => {
      if (net.peer !== peer) return;
      onlineDestroyPeer();
      setOnlineStatus('Online: join closed.');
      updateHud();
    });

    updateHud();
  }

  function updateHud() {
    const blue = totals('blue');
    const red = totals('red');
    document.body.dataset.mode = state.mode;

    elHudTitle.textContent = GAME_NAME;
    if (elHudLast) {
      if (state.gameOver && state.winner) {
        const winnerLabel = state.winner === 'red' ? 'Red' : 'Blue';
        elHudLast.textContent = `Game Over: ${winnerLabel} wins.`;
        elHudLast.classList.add('show');
      } else {
        elHudLast.textContent = '';
        elHudLast.classList.remove('show');
      }
    }

    const hideOpponentDuringFog = state.draft.active && state.draft.mode === 'fog' && !state.draft.reveal;
    const modeLabel = (state.mode === 'play') ? 'Play Mode' : 'Setup Mode';
    const sideLabel = (state.side === 'blue') ? 'Blue' : 'Red';
    const modeMeta =
      state.gameMode === 'online' ? ' • Online mode' :
      (state.gameMode === 'hvai'
        ? ` • You ${state.humanSide.toUpperCase()} vs ${aiSide().toUpperCase()} AI (${aiDifficultyLabel()} difficulty)`
        : '');
    const meta = [
      `${modeLabel}${modeMeta}`,
      `Battle Line: ${forwardAxisLabel(state.forwardAxis)}`,
      `Turn ${state.turn}: ${sideLabel} • Actions ${state.actsUsed}/${ACT_LIMIT}`,
      hideOpponentDuringFog
        ? `Forces are hidden during fog setup`
        : `Forces • Blue ${blue.up} UP / ${blue.hp} HP • Red ${red.up} UP / ${red.hp} HP`,
      `Captured UP • Blue ${state.capturedUP.blue} • Red ${state.capturedUP.red}`,
      `Victory Goal: ${victoryModeLabel(state.victoryMode)}`,
    ];
    if (state.lastImport && state.lastImport.source) {
      meta.push(`Loaded save: ${compactLabel(state.lastImport.source)} at ${formatClock(state.lastImport.at)}`);
    }
    if (state.aiBusy) {
      meta.push('AI is choosing actions...');
    }
    if (state.draft.active) {
      if (hideOpponentDuringFog) {
        meta.push(
          `Draft: ${draftModeLabel(state.draft.mode)} • ${state.draft.side.toUpperCase()} placing • ` +
          `${state.draft.side.toUpperCase()} UP left ${state.draft.remaining[state.draft.side]}`
        );
      } else {
        meta.push(
          `Draft: ${draftModeLabel(state.draft.mode)} • ${state.draft.side.toUpperCase()} placing • ` +
          `UP B ${state.draft.remaining.blue} / R ${state.draft.remaining.red}`
        );
      }
    }
    meta.push(`Build ${BUILD_ID}`);
    elHudMeta.textContent = meta.join('  ·  ');
    renderVictoryTrack(blue, red, hideOpponentDuringFog);
    if (elForceTotals) {
      if (hideOpponentDuringFog) {
        elForceTotals.textContent = 'Force score hidden during fog draft setup.';
      } else {
        elForceTotals.textContent = `Force score: Blue ${blue.up} UP, ${blue.hp} HP · Red ${red.up} UP, ${red.hp} HP`;
      }
    }

    elModeBtn.textContent = state.mode === 'edit' ? 'Start Battle' : 'Back to Setup';
    if (elGameModeSel) {
      elGameModeSel.value = state.gameMode;
      elGameModeSel.disabled = (state.mode === 'play' && state.aiBusy) || (onlineModeActive() && net.connected);
    }
    const onlineMode = onlineModeActive();
    const guestOnlineLock = onlineMode && net.connected && !net.isHost;
    if (elPlayerSideSel) {
      elPlayerSideSel.value = normalizeSide(state.humanSide);
      elPlayerSideSel.disabled = state.gameMode !== 'hvai' || state.mode === 'play' || onlineMode;
    }
    if (elAiDifficultySel) {
      const aiLock = onlineMode && net.connected;
      elAiDifficultySel.value = normalizeAiDifficulty(state.aiDifficulty);
      elAiDifficultySel.disabled = state.gameMode !== 'hvai' || aiLock || (state.mode === 'play' && state.aiBusy);
    }
    if (elVictorySel) {
      elVictorySel.disabled = state.mode === 'play' || guestOnlineLock;
    }
    const shownCode = normalizeOnlineCode(net.isHost ? net.myCode : net.remoteCode);
    elModeBtn.disabled = guestOnlineLock;
    if (elOnlineMyCode) {
      elOnlineMyCode.textContent = shownCode || '----';
      elOnlineMyCode.classList.toggle('empty', !shownCode);
    }
    if (elOnlineRoleHint) {
      elOnlineRoleHint.textContent = '';
      elOnlineRoleHint.style.display = 'none';
    }
    if (elOnlineStatus) {
      elOnlineStatus.textContent = '';
      elOnlineStatus.style.display = 'none';
    }
    if (elOnlineHostBtn) setActive(elOnlineHostBtn, onlineMode && !!net.peer && net.isHost);
    if (elOnlineJoinBtn) setActive(elOnlineJoinBtn, onlineMode && !!net.peer && !net.isHost);
    if (elOnlineHostBtn) {
      elOnlineHostBtn.disabled = (net.connected && net.isHost) || (net.peer && !net.isHost);
    }
    if (elOnlineJoinBtn) {
      elOnlineJoinBtn.disabled = (net.connected && !net.isHost) || (net.peer && net.isHost);
    }
    if (elOnlineLeaveBtn) {
      elOnlineLeaveBtn.disabled = (!net.peer && !net.connected);
    }
    if (elOnlineJoinCode) {
      elOnlineJoinCode.disabled = (net.connected && !net.isHost) || (net.peer && net.isHost);
    }
    if (elForwardAxisSel) {
      elForwardAxisSel.value = normalizeForwardAxis(state.forwardAxis);
      elForwardAxisSel.disabled = (state.mode === 'play' && state.aiBusy) || (onlineMode && net.connected);
    }
    if (state.draft.active) {
      elToolTerrain.disabled = true;
      if (state.tool === 'terrain') state.tool = 'units';
    } else {
      elToolTerrain.disabled = guestOnlineLock;
    }
    setActive(elToolUnits, state.tool === 'units');
    setActive(elToolTerrain, state.tool === 'terrain');
    if (elToolUnits) elToolUnits.disabled = guestOnlineLock;

    if (state.draft.active) {
      elSideBlue.disabled = true;
      elSideRed.disabled = true;
      state.editSide = state.draft.side;
    } else {
      elSideBlue.disabled = guestOnlineLock;
      elSideRed.disabled = guestOnlineLock;
    }
    setActive(elSideBlue, state.editSide === 'blue');
    setActive(elSideRed, state.editSide === 'red');

    // Type buttons
    for (const b of elTypeBtns.querySelectorAll('button[data-type]')) {
      setActive(b, state.editType === b.dataset.type);
      b.disabled = guestOnlineLock;
    }
    setActive(elEraseBtn, state.editErase);
    if (elEraseBtn) elEraseBtn.disabled = guestOnlineLock;

    // Quality buttons
    const qualityLockedType = (state.editType === 'iat');
    const effectiveEditQuality = qualityLockedType ? 'regular' : state.editQuality;
    setActive(elQualityGreen, effectiveEditQuality === 'green');
    setActive(elQualityRegular, effectiveEditQuality === 'regular');
    setActive(elQualityVeteran, effectiveEditQuality === 'veteran');
    elQualityGreen.disabled = qualityLockedType || guestOnlineLock;
    elQualityRegular.disabled = qualityLockedType || guestOnlineLock;
    elQualityVeteran.disabled = qualityLockedType || guestOnlineLock;

    // Terrain buttons
    for (const b of elTerrainBtns.querySelectorAll('button[data-terrain]')) {
      setActive(b, state.editTerrain === b.dataset.terrain);
      b.disabled = state.draft.active || guestOnlineLock;
    }

    if (elDraftModeSel) {
      elDraftModeSel.value = state.draft.active ? state.draft.mode : normalizeDraftMode(elDraftModeSel.value);
      elDraftModeSel.disabled = state.draft.active || guestOnlineLock;
    }
    if (elDraftBudgetInput) {
      elDraftBudgetInput.value = String(parseDraftBudget(state.draft.active ? state.draft.budget : elDraftBudgetInput.value));
      elDraftBudgetInput.disabled = state.draft.active || guestOnlineLock;
    }
    if (elStartDraftBtn) {
      elStartDraftBtn.disabled = state.mode !== 'edit' || state.draft.active || guestOnlineLock;
    }
    if (elDraftDoneBtn) {
      elDraftDoneBtn.disabled = !state.draft.active || guestOnlineLock;
    }
    if (guestOnlineLock) {
      if (elScenarioSel) elScenarioSel.disabled = true;
      if (elScenarioGroupSel) elScenarioGroupSel.disabled = true;
      if (elScenarioLessonSel) elScenarioLessonSel.disabled = true;
      if (elScenarioSizeSel) elScenarioSizeSel.disabled = true;
      if (elScenarioTerrainSel) elScenarioTerrainSel.disabled = true;
      if (elExportStateBtn) elExportStateBtn.disabled = true;
      if (elImportStateBtn) elImportStateBtn.disabled = true;
    }

    if (guestOnlineLock && state.tool === 'terrain') {
      state.tool = 'units';
    }
    updateDraftStatusUi();

    const selectedLineAdvancePreview = (() => {
      if (state.mode !== 'play' || !state.selectedKey) return null;
      const u = unitsByHex.get(state.selectedKey);
      if (!u || u.side !== state.side || u.type !== 'inf') return null;
      return lineAdvancePreviewForAnchor(state.selectedKey, state.lineAdvanceDir);
    })();

    elEndTurnBtn.disabled = (state.mode !== 'play') || state.gameOver || isAiTurnActive();
    if (elLineAdvanceBtn) {
      elLineAdvanceBtn.disabled = !(selectedLineAdvancePreview && selectedLineAdvancePreview.anyMoves);
    }
    if (elLineAdvanceDirSel) {
      const options = selectedLineAdvancePreview?.directionOptions || [];
      if (options.length > 0) {
        if (state.lineAdvanceDir !== selectedLineAdvancePreview.advanceDir) {
          state.lineAdvanceDir = selectedLineAdvancePreview.advanceDir;
        }
        elLineAdvanceDirSel.innerHTML = '';
        for (const d of options) {
          const opt = document.createElement('option');
          opt.value = d;
          const plan = selectedLineAdvancePreview.directionPlans?.[d];
          const moved = Array.isArray(plan?.moves) ? plan.moves.length : 0;
          const total = selectedLineAdvancePreview.formation.length;
          opt.textContent = `${lineAdvanceDirectionLabel(d)} (${moved}/${total})`;
          elLineAdvanceDirSel.appendChild(opt);
        }
        elLineAdvanceDirSel.value = selectedLineAdvancePreview.advanceDir || options[0];
        elLineAdvanceDirSel.disabled = (state.mode !== 'play') || state.gameOver || isAiTurnActive();
      } else {
        elLineAdvanceDirSel.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Select INF line';
        elLineAdvanceDirSel.appendChild(opt);
        elLineAdvanceDirSel.value = '';
        elLineAdvanceDirSel.disabled = true;
      }
    }

    // Keep combat rail columns anchored at their headers.
    resetCombatRailScrollPositions();

    updateInspector();
    draw();

    if (onlineMode && net.isHost && net.connected && !net.applyingRemoteSnapshot) {
      onlineBroadcastSnapshot('hud-sync');
    }
  }

  function isAiControlledSide(side) {
    return state.gameMode === 'hvai' && normalizeSide(side) === aiSide();
  }

  function isAiTurnActive() {
    return state.mode === 'play' && !state.gameOver && isAiControlledSide(state.side);
  }

  function stopAiLoop() {
    if (state.aiTimer) {
      clearTimeout(state.aiTimer);
      state.aiTimer = null;
    }
    state.aiBusy = false;
  }

  function scheduleAiStep(delayMs = AI_STEP_DELAY_MS) {
    if (state.aiTimer) clearTimeout(state.aiTimer);
    state.aiTimer = setTimeout(() => {
      state.aiTimer = null;
      runAiTurnStep();
    }, delayMs);
  }

  function nearestEnemyDistance(fromKey, side) {
    const from = board.byKey.get(fromKey);
    if (!from) return Infinity;

    let best = Infinity;
    for (const [hk, u] of unitsByHex) {
      if (u.side === side) continue;
      const h = board.byKey.get(hk);
      if (!h) continue;
      const d = axialDistance(from.q, from.r, h.q, h.r);
      if (d < best) best = d;
    }
    return best;
  }

  function enemyPotentialDiceAt(targetKey, friendlySide) {
    let total = 0;
    let melee = 0;
    let ranged = 0;
    const attackers = [];
    for (const [attackerKey, u] of unitsByHex) {
      if (u.side === friendlySide) continue;
      const prof = attackDiceFor(attackerKey, targetKey, u);
      if (!prof) continue;
      const dice = Math.max(1, Number(prof.dice || prof.baseDice || 1));
      total += dice;
      if (prof.kind === 'melee') melee += dice;
      else ranged += dice;
      attackers.push(attackerKey);
    }
    return { total, melee, ranged, attackers };
  }

  function mostThreatenedGeneral(side) {
    let worst = null;
    for (const [hk, u] of unitsByHex) {
      if (u.side !== side || u.type !== 'gen') continue;
      const threat = enemyPotentialDiceAt(hk, side);
      const maxHp = unitMaxHp('gen', u.quality);
      const hpLoss = Math.max(0, maxHp - u.hp);
      const pressure = (threat.total * 2.2) + (threat.melee * 2.8) + (hpLoss * 2.5);
      if (!worst || pressure > worst.pressure) {
        worst = { key: hk, pressure, threat };
      }
    }
    return worst;
  }

  function sideCommandCoverageRatio(side, moveOverride = null) {
    const sources = [];
    const controlled = [];

    for (const [hk, u] of unitsByHex) {
      if (u.side !== side) continue;
      let sourceKey = hk;
      if (moveOverride && u.id === moveOverride.unitId && hk === moveOverride.fromKey) {
        sourceKey = moveOverride.toKey;
      }

      if (isCommandSourceUnit(u)) {
        const sh = board.byKey.get(sourceKey);
        if (sh) sources.push({ q: sh.q, r: sh.r, radius: commandRadiusForUnit(u) });
      }

      if ((u.type === 'inf' || u.type === 'arc' || u.type === 'skr') && u.quality !== 'veteran') {
        const th = board.byKey.get(hk);
        if (th) controlled.push({ q: th.q, r: th.r });
      }
    }

    if (controlled.length === 0) return 1;
    if (sources.length === 0) return 0;

    let covered = 0;
    for (const t of controlled) {
      const inRange = sources.some(s => axialDistance(t.q, t.r, s.q, s.r) <= s.radius);
      if (inRange) covered += 1;
    }
    return covered / controlled.length;
  }

  function aiAttackThresholdForUnit(unit, difficultyLevel = state.aiDifficulty) {
    const level = normalizeAiDifficulty(difficultyLevel);
    if (level === 'levy' || !unit) return -Infinity;
    if (unit.type === 'gen') return level === 'legion' ? 12 : 6;
    return level === 'legion' ? -1 : -4;
  }

  function aiGeneralThreatContext(side) {
    const threatened = mostThreatenedGeneral(side);
    const threateningEnemies = new Set();
    if (threatened && threatened.key) {
      for (const [ek, eu] of unitsByHex) {
        if (eu.side === side) continue;
        if (attackDiceFor(ek, threatened.key, eu)) threateningEnemies.add(ek);
      }
    }
    return {
      threatenedGeneralKey: threatened ? threatened.key : null,
      threatenedGeneralPressure: threatened ? threatened.pressure : 0,
      threateningEnemies,
      commandCoverage: sideCommandCoverageRatio(side),
    };
  }

  function aiAttackScore(attackerKey, targetKey, attackerUnit, aiCtx = null) {
    const attackProf = attackDiceFor(attackerKey, targetKey, attackerUnit);
    if (!attackProf) return -Infinity;

    const target = unitsByHex.get(targetKey);
    if (!target) return -Infinity;
    const ai = aiDifficultyProfile();

    let score = 0;
    score += attackProf.dice * 6;
    if (attackProf.kind === 'melee') score += 2;
    if (target.type === 'gen') score += 20 + ai.genFocusBonus;
    score += unitUpValue(target.type, target.quality);
    score += Math.max(0, 3 - target.hp) * 2;
    if (!retreatPick(attackerKey, targetKey)) score += 2;
    const expectedHits = attackProf.dice * 0.40;
    if (expectedHits >= target.hp) score += 8;

    // If the target is one of the enemies currently threatening our general, prioritize it.
    if (aiCtx && aiCtx.threateningEnemies && aiCtx.threateningEnemies.has(targetKey)) {
      score += 12;
    }

    // Generals should not trade themselves cheaply.
    const selfThreat = enemyPotentialDiceAt(attackerKey, attackerUnit.side);
    if (attackerUnit.type === 'gen') {
      score -= selfThreat.total * 6;
      score -= selfThreat.melee * 5;
      if (target.type !== 'gen' && target.hp > 1) score -= 7;
    } else {
      score -= selfThreat.melee * 0.4;
    }

    score *= ai.attackScale;
    score += (Math.random() * 2 - 1) * ai.attackNoise;
    return score;
  }

  function bestAiAttackFrom(attackerKey, attackerUnit, aiCtx = null) {
    let bestTargetKey = null;
    let bestScore = -Infinity;
    const targets = computeAttackTargets(attackerKey, attackerUnit);
    for (const targetKey of targets) {
      const score = aiAttackScore(attackerKey, targetKey, attackerUnit, aiCtx);
      if (score > bestScore) {
        bestScore = score;
        bestTargetKey = targetKey;
      }
    }
    if (!bestTargetKey) return null;
    return { targetKey: bestTargetKey, score: bestScore };
  }

  function aiMoveScore(fromKey, destKey, unit, actCtx, aiCtx = null) {
    const ai = aiDifficultyProfile();
    let score = 0;

    const fromDist = nearestEnemyDistance(fromKey, unit.side);
    const toDist = nearestEnemyDistance(destKey, unit.side);
    if (Number.isFinite(fromDist) && Number.isFinite(toDist)) {
      score += (fromDist - toDist) * 5;
      score += Math.max(0, 8 - toDist) * 0.5;
    }

    const follow = bestAiAttackFrom(destKey, unit, aiCtx);
    if (follow) score += 4 + follow.score * 0.2;

    if (isEngaged(destKey, unit.side)) score += 2;

    if (!unitIgnoresCommand(unit)) {
      const inCmd = inCommandAt(destKey, unit.side);
      if (!inCmd) {
        // Prefer not drifting command-dependent units away from command links.
        score -= 3;
      } else if (actCtx.inCommandStart) {
        score += 0.5;
      }
    }

    const h = board.byKey.get(destKey);
    if (h) {
      if (h.terrain === 'hills') score += 0.5;
      if (h.terrain === 'woods' && unit.type !== 'cav') score += 0.5;
      if (h.terrain === 'rough' && unit.type === 'cav') score -= 0.75;
    }

    const exposureBefore = enemyPotentialDiceAt(fromKey, unit.side);
    const exposureAfter = enemyPotentialDiceAt(destKey, unit.side);
    score += (exposureBefore.total - exposureAfter.total) * (unit.type === 'gen' ? 5.0 : 1.2);

    if (unit.type === 'gen') {
      const toDist = nearestEnemyDistance(destKey, unit.side);
      score -= exposureAfter.total * 8;
      score -= exposureAfter.melee * 8;
      if (toDist <= 1) score -= 18;
      else if (toDist <= 2) score -= 8;
    }

    if (isCommandSourceUnit(unit)) {
      const covBefore = aiCtx ? aiCtx.commandCoverage : sideCommandCoverageRatio(unit.side);
      const covAfter = sideCommandCoverageRatio(unit.side, {
        unitId: unit.id,
        fromKey,
        toKey: destKey,
      });
      const covDelta = covAfter - covBefore;
      score += covDelta * (unit.type === 'gen' ? 90 : 60);
    }

    if (aiCtx && aiCtx.threatenedGeneralKey && unit.type !== 'gen') {
      const gHex = board.byKey.get(aiCtx.threatenedGeneralKey);
      const fromHex = board.byKey.get(fromKey);
      const destHex = board.byKey.get(destKey);
      if (gHex && fromHex && destHex) {
        const dFrom = axialDistance(fromHex.q, fromHex.r, gHex.q, gHex.r);
        const dTo = axialDistance(destHex.q, destHex.r, gHex.q, gHex.r);
        if (dTo < dFrom) score += 2.5;
        if (dTo <= 1) score += 6;
      }
    }

    score *= ai.moveScale;
    score += (Math.random() * 2 - 1) * ai.moveNoise;
    return score;
  }

  function chooseAiPassPlan() {
    for (const [fromKey, u] of unitsByHex) {
      if (!unitCanActivate(u, fromKey)) continue;
      return { type: 'pass', fromKey };
    }
    return null;
  }

  function chooseAiActionPlan() {
    const ai = aiDifficultyProfile();
    const aiCtx = aiGeneralThreatContext(state.side);
    let bestAttack = null;
    let bestAttackScore = -Infinity;

    let bestMove = null;
    let bestMoveScore = -Infinity;

    let passPlan = null;

    for (const [fromKey, u] of unitsByHex) {
      if (!unitCanActivate(u, fromKey)) continue;

      if (!passPlan) passPlan = { type: 'pass', fromKey };

      const attack = bestAiAttackFrom(fromKey, u, aiCtx);
      if (attack && attack.score > bestAttackScore) {
        bestAttackScore = attack.score;
        bestAttack = {
          type: 'attack',
          fromKey,
          targetKey: attack.targetKey,
          attackerType: u.type,
          score: attack.score,
        };
      }

      const actCtx = {
        inCommandStart: unitIgnoresCommand(u) ? true : inCommandAt(fromKey, u.side),
      };
      const moveTargets = computeMoveTargets(fromKey, u, actCtx);
      for (const destKey of moveTargets) {
        const score = aiMoveScore(fromKey, destKey, u, actCtx, aiCtx);
        if (score > bestMoveScore) {
          bestMoveScore = score;
          bestMove = {
            type: 'move',
            fromKey,
            destKey,
            moverType: u.type,
            score,
          };
        }
      }
    }

    if (bestAttack) {
      const atkUnit = unitsByHex.get(bestAttack.fromKey);
      const threshold = aiAttackThresholdForUnit(atkUnit, state.aiDifficulty);
      if (bestAttack.score < threshold) bestAttack = null;
    }
    if (bestMove && bestMove.moverType === 'gen' && bestMove.score < 0) {
      // If every general move is a net blunder, prefer not to commit that move.
      bestMove = null;
    }

    if (passPlan && state.actsUsed > 0 && Math.random() < ai.passChance) {
      return passPlan;
    }

    if (bestAttack && bestMove) {
      const attackAdj = bestAttack.score + ai.attackBias;
      const moveAdj = bestMove.score + ai.moveBias;
      return attackAdj >= moveAdj ? bestAttack : bestMove;
    }
    if (bestAttack) return bestAttack;
    if (bestMove) return bestMove;
    return passPlan;
  }

  function executeAiActionPlan(plan) {
    if (!plan) return false;
    const actsBefore = state.actsUsed;

    selectUnit(plan.fromKey);
    if (state.selectedKey !== plan.fromKey) return false;

    if (plan.type === 'attack') {
      if (!state._attackTargets || !state._attackTargets.has(plan.targetKey)) {
        clearSelection();
        updateHud();
        return false;
      }
      attackFromSelection(plan.targetKey);
      return state.actsUsed > actsBefore || state.gameOver;
    }

    if (plan.type === 'move') {
      if (!state._moveTargets || !state._moveTargets.has(plan.destKey)) {
        clearSelection();
        updateHud();
        return false;
      }
      moveSelectedTo(plan.destKey);

      // Optional post-move attack: choose best available, else forfeit.
      if (state.selectedKey === plan.destKey && state._attackTargets && state._attackTargets.size > 0) {
        const movedUnit = unitsByHex.get(plan.destKey);
        let bestTargetKey = null;
        let bestScore = -Infinity;
        if (movedUnit) {
          const aiCtx = aiGeneralThreatContext(movedUnit.side);
          for (const targetKey of state._attackTargets) {
            const score = aiAttackScore(plan.destKey, targetKey, movedUnit, aiCtx);
            if (score > bestScore) {
              bestScore = score;
              bestTargetKey = targetKey;
            }
          }
        }
        const attackThreshold = aiAttackThresholdForUnit(movedUnit, state.aiDifficulty);
        if (bestTargetKey && state._attackTargets.has(bestTargetKey) && bestScore >= attackThreshold) {
          attackFromSelection(bestTargetKey);
        } else {
          clearSelection();
          updateHud();
        }
      } else {
        clearSelection();
        updateHud();
      }
      return state.actsUsed > actsBefore || state.gameOver;
    }

    if (plan.type === 'pass') {
      passSelected();
      return state.actsUsed > actsBefore || state.gameOver;
    }

    clearSelection();
    updateHud();
    return false;
  }

  function runAiTurnStep() {
    if (!isAiTurnActive()) {
      stopAiLoop();
      updateHud();
      return;
    }

    if (state.actsUsed >= ACT_LIMIT) {
      stopAiLoop();
      endTurn();
      return;
    }

    const plan = chooseAiActionPlan();
    if (!plan) {
      stopAiLoop();
      endTurn();
      return;
    }

    const acted = executeAiActionPlan(plan);
    if (!isAiTurnActive()) {
      stopAiLoop();
      updateHud();
      return;
    }

    if (!acted) {
      // Fallback once: try a pass from any legal unit, then give up turn.
      const passPlan = chooseAiPassPlan();
      if (!passPlan || !executeAiActionPlan(passPlan)) {
        stopAiLoop();
        endTurn();
        return;
      }
    }

    if (state.actsUsed >= ACT_LIMIT) {
      stopAiLoop();
      endTurn();
      return;
    }

    scheduleAiStep();
  }

  function maybeStartAiTurn() {
    if (!isAiTurnActive()) {
      stopAiLoop();
      return;
    }
    if (state.aiBusy) return;

    state.aiBusy = true;
    clearSelection();
    log(`AI turn: ${state.side.toUpperCase()} is acting...`);
    updateHud();
    scheduleAiStep(AI_START_DELAY_MS);
  }

  // --- Rules helpers
  function isOccupied(hk) {
    return unitsByHex.has(hk);
  }

  function isDifficultTerrain(terrainId) {
    return terrainId === 'woods' || terrainId === 'hills' || terrainId === 'rough';
  }

  function isRunnerSlowTerrain(terrainId) {
    return terrainId === 'woods' || terrainId === 'hills';
  }

  function isSkirmisherStepStopTerrain(terrainId) {
    return terrainId === 'woods';
  }

  function isSkirmisherStartSlowTerrain(terrainId) {
    return terrainId === 'woods';
  }

  function isHillClimbStopUnit(unitType) {
    return unitType === 'inf' || unitType === 'arc' || unitType === 'gen';
  }

  function unitMoveIsPausedThisTurn(unit) {
    if (!unit) return false;
    const until = Number(unit.movePauseUntilTurn || 0);
    return Number.isFinite(until) && until >= state.turn;
  }

  function movementPauseAppliesForEntry(unitType, terrainId) {
    if (terrainId === 'clear' || terrainId === 'water') return false;
    if (terrainId === 'rough') return true; // global rough friction
    if (unitType === 'inf' && (terrainId === 'woods' || terrainId === 'hills')) return true;
    if (unitType === 'cav' && (terrainId === 'woods' || terrainId === 'hills')) return true;
    if (unitType === 'arc' && terrainId === 'woods') return true;
    if (unitType === 'iat' && terrainId === 'woods') return true;
    return false;
  }

  function markMovementPauseIfNeeded(unit, destKey) {
    if (!unit || !destKey) return false;
    const destHex = board.byKey.get(destKey);
    if (!destHex) return false;
    if (!movementPauseAppliesForEntry(unit.type, destHex.terrain)) return false;
    unit.movePauseUntilTurn = state.turn + 1;
    return true;
  }

  function movementPauseTerrainFromPath(unit, pathKeys) {
    if (!unit || !Array.isArray(pathKeys) || pathKeys.length < 2) return null;
    for (let i = 1; i < pathKeys.length; i++) {
      const h = board.byKey.get(pathKeys[i]);
      if (!h) continue;
      if (movementPauseAppliesForEntry(unit.type, h.terrain)) return h.terrain;
    }
    return null;
  }

  function markMovementPauseFromPathIfNeeded(unit, pathKeys) {
    const terrainId = movementPauseTerrainFromPath(unit, pathKeys);
    if (!terrainId) return null;
    unit.movePauseUntilTurn = state.turn + 1;
    return terrainId;
  }

  function terrainMoveCost(unitType, terrainId) {
    if (terrainId === 'water') return Infinity;
    if (terrainId === 'clear') return 1;
    if (terrainId === 'woods') {
      if (unitType === 'cav') return 2;
      if (unitType === 'skr' || unitType === 'gen') return 2;
      if (unitType === 'iat') return 1;
      return 1;
    }
    if (terrainId === 'hills') {
      if (unitType === 'cav') return 2;
      if (unitType === 'iat') return Infinity;
      if (unitType === 'skr') return 1;
      if (unitType === 'gen') return 2;
      return 1;
    }
    if (terrainId === 'rough') {
      if (unitType === 'iat') return Infinity;
      if (unitType === 'cav' || unitType === 'gen') return 2;
      return 1;
    }
    return 1;
  }

  function hasAdjacentTerrain(hexKey, terrainId) {
    const h = board.byKey.get(hexKey);
    if (!h) return false;
    for (const nk of h.neigh) {
      const nh = board.byKey.get(nk);
      if (nh && nh.terrain === terrainId) return true;
    }
    return false;
  }

  function isEngaged(hexKey, side) {
    const h = board.byKey.get(hexKey);
    if (!h) return false;

    for (const nk of h.neigh) {
      const u = unitsByHex.get(nk);
      if (u && u.side !== side) return true;
    }

    return false;
  }

  function friendlyCommandSourceKeys(side) {
    const out = [];
    for (const [hk, u] of unitsByHex) {
      if (u.side === side && isCommandSourceUnit(u)) out.push(hk);
    }
    return out;
  }

  function inCommandAt(hexKey, side) {
    const sources = friendlyCommandSourceKeys(side);
    if (sources.length === 0) return false;

    const h = board.byKey.get(hexKey);
    if (!h) return false;

    for (const sourceKey of sources) {
      const sh = board.byKey.get(sourceKey);
      const su = unitsByHex.get(sourceKey);
      if (!sh || !su) continue;

      const radius = commandRadiusForUnit(su);
      if (radius <= 0) continue;

      const d = axialDistance(h.q, h.r, sh.q, sh.r);
      if (d <= radius) return true;
    }
    return false;
  }

  function unitIgnoresCommand(u) {
    if (u.type === 'gen') return true;
    if (u.type === 'run') return true;
    if (u.type === 'cav') return true;
    if (u.quality === 'veteran') return true;
    return false;
  }

  function unitCanActivate(u, hexKey) {
    if (state.mode !== 'play') return false;
    if (state.gameOver) return false;
    if (u.side !== state.side) return false;
    if (state.actsUsed >= ACT_LIMIT) return false;
    if (state.actedUnitIds.has(u.id)) return false;

    // Green command-dependent units out-of-command cannot be activated.
    if (!unitIgnoresCommand(u) && u.quality === 'green') {
      const cmd = inCommandAt(hexKey, u.side);
      if (!cmd) return false;
    }

    return true;
  }

  function activationBlockReason(u, hexKey) {
    if (state.mode !== 'play') return 'Not in Play mode.';
    if (state.gameOver) return 'Game over.';
    if (u.side !== state.side) return null; // stay calm; don’t narrate enemy clicks
    if (state.actsUsed >= ACT_LIMIT) return 'No activations left — End Turn.';
    if (state.actedUnitIds.has(u.id)) return 'Already acted this turn.';

    if (!unitIgnoresCommand(u) && u.quality === 'green') {
      const cmd = inCommandAt(hexKey, u.side);
      if (!cmd) return 'Out of command: Green units need GEN or RUN in range.';
    }

    return null;
  }

  function canWithdrawFromEngagement(u) {
    return u.type === 'skr' || u.type === 'run' || u.quality === 'veteran';
  }

  function disengageTargets(fromKey, u) {
    const out = new Set();
    const h = board.byKey.get(fromKey);
    if (!h) return out;

    const mp = unitMovePoints(u);

    for (const nk of h.neigh) {
      if (isOccupied(nk)) continue;
      const nh = board.byKey.get(nk);
      if (!nh) continue;

      const cost = terrainMoveCost(u.type, nh.terrain);
      if (!Number.isFinite(cost) || cost > mp) continue;

      // Withdrawal must end NOT adjacent to any enemy.
      if (isEngaged(nk, u.side)) continue;

      out.add(nk);
    }

    return out;
  }

  function unitCanMoveThisActivation(u, actCtx, startKey) {
    if (unitMoveIsPausedThisTurn(u)) return false;

    // Engagement makes the line sticky.
    const engaged = isEngaged(startKey, u.side);

    // Skirmishers and veterans may withdraw 1 hex if they can break contact.
    if (engaged) {
      return canWithdrawFromEngagement(u);
    }

    // Command dependence
    if (unitIgnoresCommand(u)) return true;

    // Regular INF/ARC/SKR require command to move.
    if (u.quality === 'regular') return !!actCtx.inCommandStart;

    // Green INF/ARC/SKR require command to move (but if green, activation gating already enforced).
    return !!actCtx.inCommandStart;
  }

  // --- Movement (MP + terrain costs)
  function computeMoveTargets(fromKey, u, actCtx) {
    const mp = unitMovePoints(u);
    const startHex = board.byKey.get(fromKey);
    const runnerStartingSlow = !!(u && u.type === 'run' && startHex && isRunnerSlowTerrain(startHex.terrain));
    const skrStartingSlow = !!(u && u.type === 'skr' && startHex && isSkirmisherStartSlowTerrain(startHex.terrain));

    // If movement isn't allowed, return empty set.
    if (!unitCanMoveThisActivation(u, actCtx, fromKey)) return new Set();

    const engaged = isEngaged(fromKey, u.side);

    // Engaged withdrawal: SKR and veterans may disengage 1 hex.
    if (engaged && canWithdrawFromEngagement(u)) {
      return disengageTargets(fromKey, u);
    }

    // Normal movement: least-cost reachability within MP budget.
    const out = new Set();
    const best = new Map();

    // Tiny board → a simple priority queue is fine.
    const pq = [{ k: fromKey, c: 0 }];
    best.set(fromKey, 0);

    while (pq.length) {
      // pop min cost
      pq.sort((a, b) => a.c - b.c);
      const cur = pq.shift();
      if (!cur) break;

      const h = board.byKey.get(cur.k);
      if (!h) continue;
      if (u.type === 'run' && cur.k !== fromKey && isRunnerSlowTerrain(h.terrain)) continue;
      if (u.type === 'run' && runnerStartingSlow && cur.k !== fromKey) continue;
      if (u.type === 'skr' && skrStartingSlow && cur.k !== fromKey) continue;

      for (const nk of h.neigh) {
        if (isOccupied(nk)) continue;
        const nh = board.byKey.get(nk);
        if (!nh) continue;

        const stepCost = terrainMoveCost(u.type, nh.terrain);
        if (!Number.isFinite(stepCost)) continue; // water/impassable

        const nc = cur.c + stepCost;
        if (nc > mp) continue;

        const prevBest = best.get(nk);
        if (prevBest !== undefined && nc >= prevBest) continue;

        best.set(nk, nc);
        out.add(nk);
        if (u.type === 'run' && isRunnerSlowTerrain(nh.terrain)) continue;
        if (u.type === 'run' && runnerStartingSlow) continue;
        if (u.type === 'skr' && (skrStartingSlow || isSkirmisherStepStopTerrain(nh.terrain))) continue;
        if (isHillClimbStopUnit(u.type) && nh.terrain === 'hills') continue;
        pq.push({ k: nk, c: nc });
      }
    }

    return out;
  }

  function movementPathCost(fromKey, toKey, unit) {
    if (fromKey === toKey) return 0;
    if (!unit) return null;
    const mp = unitMovePoints(unit);
    if (mp <= 0) return null;
    const startHex = board.byKey.get(fromKey);
    const runnerStartingSlow = !!(unit.type === 'run' && startHex && isRunnerSlowTerrain(startHex.terrain));
    const skrStartingSlow = !!(unit.type === 'skr' && startHex && isSkirmisherStartSlowTerrain(startHex.terrain));

    const best = new Map();
    const pq = [{ k: fromKey, c: 0 }];
    best.set(fromKey, 0);

    while (pq.length) {
      pq.sort((a, b) => a.c - b.c);
      const cur = pq.shift();
      if (!cur) break;
      if (cur.k === toKey) return cur.c;

      const h = board.byKey.get(cur.k);
      if (!h) continue;
      if (unit.type === 'run' && cur.k !== fromKey && isRunnerSlowTerrain(h.terrain)) continue;
      if (unit.type === 'run' && runnerStartingSlow && cur.k !== fromKey) continue;
      if (unit.type === 'skr' && skrStartingSlow && cur.k !== fromKey) continue;

      for (const nk of h.neigh) {
        if (isOccupied(nk) && nk !== toKey) continue;
        const nh = board.byKey.get(nk);
        if (!nh) continue;

        const stepCost = terrainMoveCost(unit.type, nh.terrain);
        if (!Number.isFinite(stepCost)) continue;

        const nc = cur.c + stepCost;
        if (nc > mp) continue;

        const prevBest = best.get(nk);
        if (prevBest !== undefined && nc >= prevBest) continue;

        best.set(nk, nc);
        if (unit.type === 'run' && isRunnerSlowTerrain(nh.terrain)) continue;
        if (unit.type === 'run' && runnerStartingSlow) continue;
        if (unit.type === 'skr' && (skrStartingSlow || isSkirmisherStepStopTerrain(nh.terrain))) continue;
        if (isHillClimbStopUnit(unit.type) && nh.terrain === 'hills') continue;
        pq.push({ k: nk, c: nc });
      }
    }

    return null;
  }

  function movementPathKeys(fromKey, toKey, unit) {
    if (fromKey === toKey) return [fromKey];
    if (!unit) return [fromKey, toKey];
    const mp = unitMovePoints(unit);
    if (mp <= 0) return [fromKey, toKey];
    const startHex = board.byKey.get(fromKey);
    const runnerStartingSlow = !!(unit.type === 'run' && startHex && isRunnerSlowTerrain(startHex.terrain));
    const skrStartingSlow = !!(unit.type === 'skr' && startHex && isSkirmisherStartSlowTerrain(startHex.terrain));

    const best = new Map();
    const prev = new Map();
    const pq = [{ k: fromKey, c: 0 }];
    best.set(fromKey, 0);

    while (pq.length) {
      pq.sort((a, b) => a.c - b.c);
      const cur = pq.shift();
      if (!cur) break;
      if (cur.k === toKey) break;

      const h = board.byKey.get(cur.k);
      if (!h) continue;
      if (unit.type === 'run' && cur.k !== fromKey && isRunnerSlowTerrain(h.terrain)) continue;
      if (unit.type === 'run' && runnerStartingSlow && cur.k !== fromKey) continue;
      if (unit.type === 'skr' && skrStartingSlow && cur.k !== fromKey) continue;

      for (const nk of h.neigh) {
        if (isOccupied(nk) && nk !== toKey) continue;
        const nh = board.byKey.get(nk);
        if (!nh) continue;

        const stepCost = terrainMoveCost(unit.type, nh.terrain);
        if (!Number.isFinite(stepCost)) continue;

        const nc = cur.c + stepCost;
        if (nc > mp) continue;

        const prevBest = best.get(nk);
        if (prevBest !== undefined && nc >= prevBest) continue;

        best.set(nk, nc);
        prev.set(nk, cur.k);
        if (unit.type === 'run' && isRunnerSlowTerrain(nh.terrain)) continue;
        if (unit.type === 'run' && runnerStartingSlow) continue;
        if (unit.type === 'skr' && (skrStartingSlow || isSkirmisherStepStopTerrain(nh.terrain))) continue;
        if (isHillClimbStopUnit(unit.type) && nh.terrain === 'hills') continue;
        pq.push({ k: nk, c: nc });
      }
    }

    if (!best.has(toKey)) return [fromKey, toKey];

    const path = [toKey];
    let cur = toKey;
    let guard = 0;
    while (cur !== fromKey && guard < 256) {
      const p = prev.get(cur);
      if (!p) break;
      path.push(p);
      cur = p;
      guard += 1;
    }
    path.reverse();
    if (path[0] !== fromKey) return [fromKey, toKey];
    return path;
  }

  function startMoveAnimation(pathKeys, unit, isAiMove = false) {
    if (!Array.isArray(pathKeys) || pathKeys.length < 2 || !unit) {
      stopMoveAnimation();
      return;
    }

    stopMoveAnimation();

    const perStep = isAiMove ? MOVE_ANIM_STEP_MS_AI : MOVE_ANIM_STEP_MS_HUMAN;
    const durationMs = Math.max(perStep, (pathKeys.length - 1) * perStep);
    state.moveAnim = {
      unitId: unit.id,
      toKey: pathKeys[pathKeys.length - 1],
      pathKeys: [...pathKeys],
      unit: {
        id: unit.id,
        side: unit.side,
        type: unit.type,
        quality: unit.quality,
        hp: unit.hp,
      },
      t: 0,
      startedAt: performance.now(),
      durationMs,
    };

    const tick = (ts) => {
      if (!state.moveAnim) {
        state.moveAnimRaf = null;
        return;
      }
      const anim = state.moveAnim;
      const elapsed = ts - anim.startedAt;
      anim.t = Math.max(0, Math.min(1, elapsed / anim.durationMs));
      draw();

      if (anim.t >= 1) {
        state.moveAnim = null;
        state.moveAnimRaf = null;
        draw();
        return;
      }
      state.moveAnimRaf = requestAnimationFrame(tick);
    };

    state.moveAnimRaf = requestAnimationFrame(tick);
  }

  function forwardStepKey(fromKey, side) {
    const dir = sideForwardDirection(side, state.forwardAxis);
    return stepKeyInDirection(fromKey, dir);
  }

  function isFriendlyInfAt(hexKey, side) {
    const u = unitsByHex.get(hexKey);
    return !!u && u.side === side && u.type === 'inf';
  }

  function infantryBracePairs(defenderKey, side) {
    if (!isFriendlyInfAt(defenderKey, side)) return [];
    const ring = ['e', 'ur', 'ul', 'w', 'dl', 'dr'];
    const pairs = [];

    for (let i = 0; i < ring.length; i++) {
      const d1 = ring[i];
      const d2 = ring[(i + 1) % ring.length];
      const k1 = stepKeyInDirection(defenderKey, d1);
      const k2 = stepKeyInDirection(defenderKey, d2);
      if (!k1 || !k2) continue;
      if (!isFriendlyInfAt(k1, side) || !isFriendlyInfAt(k2, side)) continue;
      const b1 = oppositeDirection(d1);
      const b2 = oppositeDirection(d2);
      if (!b1 || !b2) continue;
      pairs.push({
        dirs: [d1, d2],
        keys: [k1, k2],
        braceDirs: [b1, b2],
      });
    }
    return pairs;
  }

  function reinforcementSupportForAttack(defenderKey, attackerKey, defenderUnit) {
    if (!defenderUnit || defenderUnit.type !== 'inf') {
      return { supportRanks: 0, active: false, pairs: [], matching: [], supportSet: new Set(), attackDir: null };
    }
    const attackDir = adjacentDirection(defenderKey, attackerKey);
    if (!attackDir) {
      return { supportRanks: 0, active: false, pairs: [], matching: [], supportSet: new Set(), attackDir: null };
    }

    const pairs = infantryBracePairs(defenderKey, defenderUnit.side);
    const matching = pairs.filter(p => p.braceDirs.includes(attackDir));
    const supportSet = new Set();
    for (const p of matching) {
      for (const k of p.keys) supportSet.add(k);
    }

    const active = matching.length > 0;
    return {
      supportRanks: active ? 1 : 0, // one-line deep only
      active,
      pairs,
      matching,
      supportSet,
      attackDir,
    };
  }

  function reinforcementPreviewForAnchor(anchorKey) {
    const anchor = unitsByHex.get(anchorKey);
    if (!anchor || anchor.type !== 'inf') return null;
    const pairs = infantryBracePairs(anchorKey, anchor.side);
    const supportSet = new Set();
    const braceDirSet = new Set();
    for (const p of pairs) {
      for (const k of p.keys) supportSet.add(k);
      for (const d of p.braceDirs) braceDirSet.add(d);
    }
    return {
      active: pairs.length > 0,
      frontSet: new Set([anchorKey]),
      supportSet,
      pairs,
      braceDirs: Array.from(braceDirSet),
    };
  }

  function canLineAdvanceInfAt(hexKey, u) {
    if (state.mode !== 'play' || state.gameOver) return false;
    if (!u || u.type !== 'inf') return false;
    if (u.side !== state.side) return false;
    if (state.actsUsed >= ACT_LIMIT) return false;
    if (state.actedUnitIds.has(u.id)) return false;
    if (unitMoveIsPausedThisTurn(u)) return false;
    if (isEngaged(hexKey, u.side)) return false;
    return true;
  }

  function collectContiguousInfantryRowByDirs(anchorKey, beforeDir, afterDir) {
    const anchorUnit = unitsByHex.get(anchorKey);
    if (!anchorUnit) return [];
    if (anchorUnit.type !== 'inf') return [];
    if (anchorUnit.side !== state.side) return [];
    const before = [];
    const after = [];
    const rowSide = anchorUnit.side;

    function walk(dir, out) {
      let cur = anchorKey;
      while (true) {
        const next = stepKeyInDirection(cur, dir);
        if (!next) break;
        const u = unitsByHex.get(next);
        if (!u || u.type !== 'inf' || u.side !== rowSide) break;
        out.push(next);
        cur = next;
      }
    }

    walk(beforeDir, before);
    walk(afterDir, after);

    before.reverse();
    return [...before, anchorKey, ...after];
  }

  function detectLineAxisForAnchor(anchorKey) {
    const anchorUnit = unitsByHex.get(anchorKey);
    if (!anchorUnit || anchorUnit.type !== 'inf') return null;
    const rowSide = anchorUnit.side;

    const candidates = [];
    for (const [beforeDir, afterDir] of LINE_AXIS_PAIRS) {
      const row = collectContiguousInfantryRowByDirs(anchorKey, beforeDir, afterDir);
      const eligibleCount = row.reduce((n, hk) => {
        const u = unitsByHex.get(hk);
        return n + (canLineAdvanceInfAt(hk, u) ? 1 : 0);
      }, 0);
      candidates.push({
        dirs: [beforeDir, afterDir],
        row,
        rowLength: row.length,
        eligibleCount,
      });
    }

    candidates.sort((a, b) => {
      if (b.rowLength !== a.rowLength) return b.rowLength - a.rowLength;
      if (b.eligibleCount !== a.eligibleCount) return b.eligibleCount - a.eligibleCount;
      const sideFwd = sideForwardDirection(rowSide, state.forwardAxis);
      const aBias = a.dirs.includes(sideFwd) ? 1 : 0;
      const bBias = b.dirs.includes(sideFwd) ? 1 : 0;
      return bBias - aBias;
    });

    return candidates[0] || null;
  }

  function collectContiguousInfantryRow(anchorKey) {
    const axis = detectLineAxisForAnchor(anchorKey);
    return axis ? axis.row : [];
  }

  function lineAdvanceDirectionOptionsForRowDirs(rowDirs = []) {
    const blocked = new Set(rowDirs);
    const opts = [];
    for (const d of LINE_ADVANCE_DIRECTION_ORDER) {
      if (!blocked.has(d)) opts.push(d);
    }
    return opts;
  }

  function collectLineAdvanceFormation(anchorKey) {
    const row = collectContiguousInfantryRow(anchorKey);
    if (row.length === 0) return [];
    return row.filter((hk) => canLineAdvanceInfAt(hk, unitsByHex.get(hk)));
  }

  function lineAdvanceMovePlan(formation, advanceDir = null) {
    const formationSet = new Set(formation);
    const moves = [];
    const blocked = [];
    const infMove = UNIT_BY_ID.get('inf')?.move ?? 1;

    for (const fromKey of formation) {
      const u = unitsByHex.get(fromKey);
      if (!u) continue;

      const dir = normalizeLineAdvanceDirection(advanceDir) || sideForwardDirection(u.side, state.forwardAxis);
      const toKey = stepKeyInDirection(fromKey, dir);
      if (!toKey) {
        blocked.push({ fromKey, reason: 'off-board' });
        continue;
      }
      if (!board.activeSet.has(toKey)) {
        blocked.push({ fromKey, reason: 'off-board' });
        continue;
      }

      if (unitsByHex.has(toKey) && !formationSet.has(toKey)) {
        blocked.push({ fromKey, reason: 'occupied' });
        continue;
      }

      const toHex = board.byKey.get(toKey);
      if (!toHex) {
        blocked.push({ fromKey, reason: 'off-board' });
        continue;
      }

      const cost = terrainMoveCost('inf', toHex.terrain);
      if (!Number.isFinite(cost) || cost > infMove) {
        blocked.push({ fromKey, reason: 'terrain' });
        continue;
      }

      moves.push({ fromKey, toKey, unit: u });
    }

    return { moves, blocked, advanceDir: normalizeLineAdvanceDirection(advanceDir) };
  }

  function preferredLineAdvanceDirection(preferredDir, optionDirs, anchorSide) {
    const preferred = normalizeLineAdvanceDirection(preferredDir);
    if (preferred && optionDirs.includes(preferred)) return preferred;
    const sideFwd = sideForwardDirection(anchorSide, state.forwardAxis);
    if (optionDirs.includes(sideFwd)) return sideFwd;
    return optionDirs[0] || null;
  }

  function lineAdvancePreviewForAnchor(anchorKey, preferredDir = state.lineAdvanceDir) {
    const axis = detectLineAxisForAnchor(anchorKey);
    const row = axis ? axis.row : [];
    if (row.length === 0) return null;

    const formation = row.filter((hk) => canLineAdvanceInfAt(hk, unitsByHex.get(hk)));
    const rowDirs = axis ? axis.dirs : [];
    const directionOptions = lineAdvanceDirectionOptionsForRowDirs(rowDirs);
    const anchorUnit = unitsByHex.get(anchorKey);
    const advanceDir = preferredLineAdvanceDirection(preferredDir, directionOptions, anchorUnit?.side || state.side);
    const directionPlans = {};
    let anyMoves = false;
    for (const d of directionOptions) {
      const p = lineAdvanceMovePlan(formation, d);
      directionPlans[d] = p;
      if (p.moves.length > 0) anyMoves = true;
    }
    const plan = advanceDir ? (directionPlans[advanceDir] || lineAdvanceMovePlan(formation, advanceDir)) : { moves: [], blocked: [], advanceDir: null };
    const destinationSet = new Set(plan.moves.map(m => m.toKey));
    const movableSet = new Set(plan.moves.map(m => m.fromKey));
    const blockedSet = new Set(plan.blocked.map(b => b.fromKey));
    const rowSet = new Set(row);
    const formationSet = new Set(formation);

    return {
      anchorKey,
      row,
      rowSet,
      formation,
      formationSet,
      moves: plan.moves,
      blocked: plan.blocked,
      destinationSet,
      movableSet,
      blockedSet,
      rowDirs,
      directionOptions,
      directionPlans,
      anyMoves,
      advanceDir,
      forwardDir: sideForwardDirection(anchorUnit?.side || state.side, state.forwardAxis),
    };
  }

  function canIssueLineAdvance() {
    if (state.mode !== 'play' || state.gameOver) return false;
    if (isAiTurnActive()) return false;
    if (state.actsUsed >= ACT_LIMIT) return false;
    if (!state.selectedKey) return false;

    const u = unitsByHex.get(state.selectedKey);
    if (!u || u.side !== state.side || u.type !== 'inf') return false;
    const preview = lineAdvancePreviewForAnchor(state.selectedKey, state.lineAdvanceDir);
    if (!preview) return false;
    return !!preview.anyMoves;
  }

  function selectedLineAdvanceDirection() {
    if (!state.selectedKey) return normalizeLineAdvanceDirection(state.lineAdvanceDir);
    const preview = lineAdvancePreviewForAnchor(state.selectedKey, state.lineAdvanceDir);
    if (!preview) return normalizeLineAdvanceDirection(state.lineAdvanceDir);
    return normalizeLineAdvanceDirection(preview.advanceDir);
  }

  function lineAdvanceFromSelection(explicitAdvanceDir = null) {
    if (state.mode !== 'play') return;
    if (state.gameOver) return;
    if (isAiTurnActive()) return;
    if (state.actsUsed >= ACT_LIMIT) {
      log('No activations left — End Turn.');
      updateHud();
      return;
    }
    if (!state.selectedKey) {
      log('Line Advance: select a friendly INF first.');
      updateHud();
      return;
    }

    const anchorKey = state.selectedKey;
    const anchor = unitsByHex.get(anchorKey);
    if (!anchor || anchor.side !== state.side || anchor.type !== 'inf') {
      log('Line Advance requires a selected friendly INF.');
      updateHud();
      return;
    }

    const chosenAdvanceDir = normalizeLineAdvanceDirection(explicitAdvanceDir) || state.lineAdvanceDir;
    const preview = lineAdvancePreviewForAnchor(anchorKey, chosenAdvanceDir);
    const formation = preview ? preview.formation : [];
    const fullRow = preview ? preview.row : [];
    const advanceDir = preview ? preview.advanceDir : null;
    if (formation.length === 0) {
      log('Line Advance unavailable: selected INF cannot form an eligible line.');
      updateHud();
      return;
    }

    const plan = preview || lineAdvanceMovePlan(formation, advanceDir);
    const moves = plan.moves;
    const blocked = plan.blocked;

    if (moves.length === 0) {
      log(`Line Advance blocked toward ${lineAdvanceDirectionLabel(advanceDir)}: no INF in the line can step there.`);
      updateHud();
      return;
    }

    // Formation order consumes one activation and marks every participant as spent.
    state.actsUsed = Math.min(ACT_LIMIT, state.actsUsed + 1);
    for (const hk of formation) {
      const u = unitsByHex.get(hk);
      if (u) state.actedUnitIds.add(u.id);
    }

    for (const m of moves) unitsByHex.delete(m.fromKey);
    for (const m of moves) unitsByHex.set(m.toKey, m.unit);
    let terrainPauseCount = 0;
    for (const m of moves) {
      if (markMovementPauseIfNeeded(m.unit, m.toKey)) terrainPauseCount += 1;
    }

    clearSelection();

    const byReason = { offBoard: 0, occupied: 0, terrain: 0 };
    for (const b of blocked) {
      if (b.reason === 'off-board') byReason.offBoard += 1;
      else if (b.reason === 'occupied') byReason.occupied += 1;
      else if (b.reason === 'terrain') byReason.terrain += 1;
    }

    const blockParts = [];
    if (byReason.offBoard) blockParts.push(`off-board ${byReason.offBoard}`);
    if (byReason.occupied) blockParts.push(`occupied ${byReason.occupied}`);
    if (byReason.terrain) blockParts.push(`terrain ${byReason.terrain}`);
    const blockText = blockParts.length ? ` blocked(${blockParts.join(', ')})` : '';

    const eligibilityText = fullRow.length > formation.length ? ` (${formation.length}/${fullRow.length} eligible)` : '';
    const pauseText = terrainPauseCount > 0
      ? ` terrain-pause ${terrainPauseCount}`
      : '';
    log(`Line Advance ${lineAdvanceDirectionLabel(advanceDir)}: ${moves.length}/${formation.length} INF advanced${eligibilityText}.${blockText}${pauseText}.`);
    if (!maybeAutoEndTurnAfterAction()) updateHud();
  }

  function veteranCavPostAttackWithdrawTargets(fromKey, u, actCtx) {
    const out = new Set();
    if (!u || u.type !== 'cav' || u.quality !== 'veteran') return out;
    if (!isEngaged(fromKey, u.side)) return out;

    const moveDef = UNIT_BY_ID.get(u.type);
    const maxMp = moveDef ? moveDef.move : 0;
    const remainingMp = Math.max(0, maxMp - (actCtx?.moveSpent || 0));
    if (remainingMp <= 0) return out;

    const h = board.byKey.get(fromKey);
    if (!h) return out;

    for (const nk of h.neigh) {
      if (isOccupied(nk)) continue;
      const nh = board.byKey.get(nk);
      if (!nh) continue;

      const cost = terrainMoveCost(u.type, nh.terrain);
      if (!Number.isFinite(cost) || cost > remainingMp) continue;
      if (isEngaged(nk, u.side)) continue;

      out.add(nk);
    }
    return out;
  }

  function attackApproachPosition(attackerKey, defenderKey, defenderSide) {
    const fwdDir = sideForwardDirection(defenderSide, state.forwardAxis);
    const rearDir = oppositeDirection(fwdDir);
    const frontKey = stepKeyInDirection(defenderKey, fwdDir);
    const rearKey = rearDir ? stepKeyInDirection(defenderKey, rearDir) : null;

    if (attackerKey === frontKey) return 'front';
    if (attackerKey === rearKey) return 'rear';
    return 'flank';
  }

  function infantryCanPivotOnDefense(defenderKey, defenderUnit) {
    if (!defenderUnit || defenderUnit.type !== 'inf') return false;
    if (defenderUnit.quality === 'veteran') return true;
    return inCommandAt(defenderKey, defenderUnit.side);
  }

  function cavalryAngleBonuses(attackerUnit, defenderUnit, kind, position) {
    if (!ENABLE_CAV_ANGLE_BONUS) return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    if (kind !== 'melee') return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    if (!attackerUnit || !defenderUnit) return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    if (attackerUnit.type !== 'cav' || defenderUnit.type !== 'inf') {
      return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    }
    if (position === 'rear') {
      return { flankBonus: 0, rearBonus: CAV_REAR_BONUS, totalBonus: CAV_REAR_BONUS };
    }
    if (position === 'flank') {
      return { flankBonus: CAV_FLANK_BONUS, rearBonus: 0, totalBonus: CAV_FLANK_BONUS };
    }
    return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
  }

  // --- Attacks (melee + ranged)
  function attackDiceFor(attackerKey, defenderKey, attackerUnit) {
    const atkHex = board.byKey.get(attackerKey);
    const defHex = board.byKey.get(defenderKey);
    if (!atkHex || !defHex) return null;

    const dist = axialDistance(atkHex.q, atkHex.r, defHex.q, defHex.r);
    if (dist < 1) return null;

    const engaged = isEngaged(attackerKey, attackerUnit.side);
    const atkDef = UNIT_BY_ID.get(attackerUnit.type);

    // Melee at range 1 is always possible.
    if (dist === 1) {
      const baseDice = atkDef.meleeDice;
      if (!Number.isFinite(baseDice) || baseDice <= 0) return null;
      return {
        kind: 'melee',
        dist,
        baseDice,
        dice: baseDice,
        flankBonus: 0,
        rearBonus: 0,
        impactPosition: 'none',
      };
    }

    // Beyond range 1 requires ranged capability and NOT being engaged.
    if (engaged) return null;
    if (!atkDef.ranged) return null;
    if (
      (attackerUnit.type === 'arc' || attackerUnit.type === 'skr') &&
      atkHex.terrain === 'woods' &&
      !hasAdjacentTerrain(attackerKey, 'clear')
    ) {
      return null;
    }

    let baseRangedDice = atkDef.ranged[dist] || 0;
    let hillBonusDice = 0;

    if ((attackerUnit.type === 'arc' || attackerUnit.type === 'skr') && atkHex.terrain === 'hills') {
      // Hilltop advantage: +1 ranged die for ARC/SKR.
      hillBonusDice = 1;
    }

    if (!baseRangedDice) return null;
    const totalRangedDice = baseRangedDice + hillBonusDice;

    return {
      kind: 'ranged',
      dist,
      baseDice: baseRangedDice,
      dice: totalRangedDice,
      flankBonus: 0,
      rearBonus: 0,
      impactPosition: 'none',
      hillBonusDice,
    };
  }

  function computeAttackTargets(attackerKey, u) {
    const targets = new Set();

    for (const [hk, enemy] of unitsByHex) {
      if (enemy.side === u.side) continue;
      const prof = attackDiceFor(attackerKey, hk, u);
      if (prof) targets.add(hk);
    }

    return targets;
  }

  function computeHealTargets(sourceKey, u) {
    const targets = new Set();
    if (!u || u.type !== 'iat') return targets;

    const sourceHex = board.byKey.get(sourceKey);
    if (!sourceHex) return targets;

    for (const nk of sourceHex.neigh) {
      const ally = unitsByHex.get(nk);
      if (!ally) continue;
      if (ally.side !== u.side) continue;
      const maxHp = unitMaxHp(ally.type, ally.quality);
      if (ally.hp >= maxHp) continue;
      targets.add(nk);
    }

    return targets;
  }

  // --- Combat resolution
  function rollD6() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function retreatPick(attackerKey, defenderKey) {
    // Choose retreat direction purely by geometry (maximizes distance), then
    // if the chosen hex is invalid (off-board/water/occupied), retreat converts to a hit.

    const aHex = board.byKey.get(attackerKey);
    const dHex = board.byKey.get(defenderKey);
    if (!aHex || !dHex) return null;

    const curDist = axialDistance(aHex.q, aHex.r, dHex.q, dHex.r);

    const deltas = (dHex.r & 1) ? NEIGH_ODD : NEIGH_EVEN;

    let bestKey = null;
    let bestDist = curDist;

    for (const [dq, dr] of deltas) {
      const nq = dHex.q + dq;
      const nr = dHex.r + dr;
      const nd = axialDistance(aHex.q, aHex.r, nq, nr);
      if (nd > bestDist) {
        bestDist = nd;
        bestKey = key(nq, nr);
      }
    }

    if (!bestKey) return null;

    // Validate the chosen retreat hex.
    if (!board.activeSet.has(bestKey)) return null;

    const bh = board.byKey.get(bestKey);
    if (!bh) return null;

    if (bh.terrain === 'water') return null;
    if (isOccupied(bestKey)) return null;

    return bestKey;
  }

  function consumeActivation(unitId) {
    state.actsUsed = Math.min(ACT_LIMIT, state.actsUsed + 1);
    state.actedUnitIds.add(unitId);
  }

  function destroyUnit(defenderKey, defenderUnit, attackerSide) {
    const defDef = UNIT_BY_ID.get(defenderUnit.type);
    const destroyedUp = unitUpValue(defenderUnit.type, defenderUnit.quality);

    unitsByHex.delete(defenderKey);

    state.capturedUP[attackerSide] += destroyedUp;

    log(`☠️ ${defenderUnit.side.toUpperCase()} ${defDef.abbrev} destroyed (+${destroyedUp}u).`);
  }

  function resolveAttack(attackerKey, defenderKey) {
    const atk = unitsByHex.get(attackerKey);
    const defU = unitsByHex.get(defenderKey);
    if (!atk || !defU) return;
    if (state.gameOver) return;

    const prof = attackDiceFor(attackerKey, defenderKey, atk);
    if (!prof) {
      log('Illegal attack.');
      return;
    }

    let impactPosition = 'none';
    let pivoted = false;
    let pivotFrom = 'none';

    if (prof.kind === 'melee') {
      const rawPos = attackApproachPosition(attackerKey, defenderKey, defU.side);
      impactPosition = rawPos;
      if (rawPos !== 'front' && infantryCanPivotOnDefense(defenderKey, defU)) {
        pivoted = true;
        pivotFrom = rawPos;
        impactPosition = 'front';
      }
    }

    // Terrain modifiers:
    // - Defensive: woods / hills / tree-line cover can reduce attacker dice.
    // - Offensive: rough attacks reduce outgoing dice.
    // - Elevated missile fire (ARC/SKR) is handled in attackDiceFor().
    const atkHex = board.byKey.get(attackerKey);
    const defHex = board.byKey.get(defenderKey);
    const defenderTerrain = defHex?.terrain || 'clear';
    const attackerTerrain = atkHex?.terrain || 'clear';
    const defenderTreeLine = defenderTerrain === 'woods' && hasAdjacentTerrain(defenderKey, 'clear');

    let attackTerrainDiceMod = 0;
    const attackTerrainParts = [];
    if (attackerTerrain === 'rough') {
      attackTerrainDiceMod -= 1;
      attackTerrainParts.push('rough -1');
    }

    let terrainDiceMod = 0;
    if (defenderTerrain === 'woods') {
      terrainDiceMod -= 1;
    }
    if (defenderTerrain === 'hills' && (defU.type === 'arc' || defU.type === 'skr')) terrainDiceMod -= 1;
    const supportEval = (prof.kind === 'melee')
      ? reinforcementSupportForAttack(defenderKey, attackerKey, defU)
      : { supportRanks: 0, active: false, pairs: [], matching: [], supportSet: new Set(), attackDir: null };
    const supportRanks = supportEval.supportRanks || 0;
    const supportDiceMod = supportRanks > 0
      ? -(Math.min(INF_SUPPORT_MAX_RANKS, supportRanks) * INF_SUPPORT_DICE_PER_RANK)
      : 0;
    const defenseDiceMod = terrainDiceMod + supportDiceMod;
    const terrainRuleText = (() => {
      const parts = [];
      if (attackTerrainParts.length > 0) parts.push(`attack stance ${attackTerrainParts.join(', ')}`);
      if (defenderTerrain === 'woods' && (defU.type === 'arc' || defU.type === 'skr') && defenderTreeLine) {
        parts.push(`defender ${UNIT_BY_ID.get(defU.type)?.abbrev || defU.type} on tree-line: attacker -1 die`);
      } else if (defenderTerrain === 'woods') {
        parts.push('defender in Woods: attacker -1 die');
      }
      if (defenderTerrain === 'hills' && (defU.type === 'arc' || defU.type === 'skr')) {
        parts.push(`defender ${UNIT_BY_ID.get(defU.type)?.abbrev || defU.type} on Hills: attacker -1 die`);
      }
      return parts.length > 0
        ? `${parts.join('; ')}.`
        : `No terrain dice modifier in this exchange.`;
    })();
    const impact = cavalryAngleBonuses(atk, defU, prof.kind, impactPosition);
    const baseDice = prof.baseDice ?? prof.dice;
    const hillBonusDice = Number(prof.hillBonusDice || 0);
    const flankBonus = impact.flankBonus;
    const rearBonus = impact.rearBonus;
    const preTerrainDice = baseDice + hillBonusDice + impact.totalBonus + attackTerrainDiceMod;
    const dice = Math.max(1, preTerrainDice + defenseDiceMod);

    const rolls = [];
    for (let i = 0; i < dice; i++) rolls.push(rollD6());

    const atkDef = UNIT_BY_ID.get(atk.type);
    const defDef = UNIT_BY_ID.get(defU.type);

    const hits = rolls.filter(v => DIE_HIT.has(v)).length;
    const retreats = rolls.filter(v => v === DIE_RETREAT).length;
    const misses = Math.max(0, dice - hits - retreats);

    const tag = `${atk.side.toUpperCase()} ${atkDef.abbrev}`;
    const vs = `${defU.side.toUpperCase()} ${defDef.abbrev}`;
    if (pivoted) {
      log(`${vs} pivots to face the ${pivotFrom} attack.`);
    }
    const rollTokens = rolls.map((v) => {
      if (DIE_HIT.has(v)) return `${v}H`;
      if (v === DIE_RETREAT) return `${v}R`;
      return `${v}M`;
    });
    const modParts = [`base ${baseDice}`];
    if (hillBonusDice) modParts.push(`hill-shot +${hillBonusDice}`);
    if (flankBonus) modParts.push(`flank +${flankBonus}`);
    if (rearBonus) modParts.push(`rear +${rearBonus}`);
    if (attackTerrainDiceMod) modParts.push(`attack terrain ${attackTerrainDiceMod > 0 ? `+${attackTerrainDiceMod}` : `${attackTerrainDiceMod}`}`);
    if (terrainDiceMod) modParts.push(`${terrainLabel(defenderTerrain).toLowerCase()} ${terrainDiceMod}`);
    if (supportDiceMod) modParts.push(`inf support ${supportDiceMod}`);
    const modText = ` (${modParts.join(', ')})`;
    const combatInfo = {
      attacker: tag,
      defender: vs,
      attackerType: atk.type,
      defenderType: defU.type,
      kind: prof.kind,
      dist: prof.dist,
      dice,
      baseDice,
      flankBonus,
      rearBonus,
      attackTerrainDiceMod,
      attackerTerrain,
      hillBonusDice,
      impactPosition,
      pivoted,
      pivotFrom,
      woodsPenalty: terrainDiceMod < 0 ? Math.abs(terrainDiceMod) : 0,
      terrainDiceMod,
      supportRanks,
      supportDiceMod,
      defenseDiceMod,
      supportPairCount: Array.isArray(supportEval.pairs) ? supportEval.pairs.length : 0,
      supportMatchingCount: Array.isArray(supportEval.matching) ? supportEval.matching.length : 0,
      supportAttackDir: supportEval.attackDir || '',
      defenderTerrain,
      terrainRuleText,
      hits,
      retreats,
      misses,
      retreatMoved: 0,
      retreatBlocked: 0,
      destroyed: false,
      defenderHpAfter: defU.hp,
    };
    renderDiceDisplay(rolls, {
      ...combatInfo,
    });
    renderCombatBreakdown(rolls, combatInfo);
    log(`${tag} ${prof.kind.toUpperCase()}→${vs} r${prof.dist} · dice=${dice}${modText}`);
    log(`Rolls: [${rollTokens.join(' ')}] => hits=${hits}, retreats=${retreats}, misses=${misses}.`);
    if (prof.kind === 'melee' && defU.type === 'inf') {
      if (supportRanks > 0 && supportDiceMod < 0) {
        const ad = String(supportEval.attackDir || '').toUpperCase();
        log(
          `Infantry support ACTIVE: adjacent brace pair matched attack ${ad}, ` +
          `attacker -${Math.abs(supportDiceMod)} die.`
        );
      } else {
        const pairCount = Array.isArray(supportEval.pairs) ? supportEval.pairs.length : 0;
        const ad = String(supportEval.attackDir || '').toUpperCase();
        if (pairCount === 0) {
          log('Infantry support inactive: defender has no adjacent friendly INF brace pair.');
        } else {
          log(`Infantry support inactive: attack ${ad} not on braced opposite sides.`);
        }
      }
    }

    // Pass 1: apply hits
    if (hits > 0) {
      defU.hp -= hits;
      log(`Hits: ${hits} → ${vs} HP=${Math.max(0, defU.hp)}.`);
    }

    if (defU.hp <= 0) {
      combatInfo.destroyed = true;
      combatInfo.defenderHpAfter = 0;
      renderCombatBreakdown(rolls, combatInfo);
      destroyUnit(defenderKey, defU, atk.side);
      checkVictory();
      updateHud();
      return;
    }

    // Pass 2: resolve retreats one at a time
    let retreatMoved = 0;
    let retreatBlocked = 0;
    for (let i = 0; i < retreats; i++) {
      const curDef = unitsByHex.get(defenderKey);
      if (!curDef) break;

      const step = retreatPick(attackerKey, defenderKey);
      if (!step) {
        retreatBlocked += 1;
        curDef.hp -= 1;
        log(`Retreat blocked → 1 hit. ${vs} HP=${Math.max(0, curDef.hp)}.`);
        if (curDef.hp <= 0) {
          combatInfo.destroyed = true;
          destroyUnit(defenderKey, curDef, atk.side);
          break;
        }
      } else {
        retreatMoved += 1;
        unitsByHex.delete(defenderKey);
        unitsByHex.set(step, curDef);
        defenderKey = step;
        log(`Retreat → ${step}`);
      }
    }

    const finalDef = unitsByHex.get(defenderKey);
    combatInfo.retreatMoved = retreatMoved;
    combatInfo.retreatBlocked = retreatBlocked;
    combatInfo.destroyed = !finalDef;
    combatInfo.defenderHpAfter = finalDef ? finalDef.hp : 0;
    renderCombatBreakdown(rolls, combatInfo);

    checkVictory();
    updateHud();
  }

  // --- Victory
  function checkVictory() {
    if (state.mode !== 'play') return;

    const b = totals('blue');
    const r = totals('red');

    let blueWins = false;
    let redWins = false;

    if (state.victoryMode === 'annihilation') {
      blueWins = r.units === 0;
      redWins = b.units === 0;
    } else if (state.victoryMode === 'decapitation') {
      blueWins = r.gens === 0;
      redWins = b.gens === 0;
    } else {
      // Clear victory: capture at least half of opponent starting UP, rounded up.
      const needBlue = Math.ceil(state.initialUP.red / 2);
      const needRed = Math.ceil(state.initialUP.blue / 2);

      blueWins = state.capturedUP.blue >= needBlue;
      redWins = state.capturedUP.red >= needRed;
    }

    if (blueWins && redWins) {
      // If multiple victory conditions ever trigger simultaneously, the acting player wins.
      state.gameOver = true;
      state.winner = state.side;
      log(`Game over: ${state.side.toUpperCase()} wins (simultaneous victory).`);
    } else if (blueWins) {
      state.gameOver = true;
      state.winner = 'blue';
      log('Game over: BLUE wins.');
    } else if (redWins) {
      state.gameOver = true;
      state.winner = 'red';
      log('Game over: RED wins.');
    }
  }

  // --- Mode transitions
  function clearSelection() {
    state.selectedKey = null;
    state.act = null;
    state._moveTargets = null;
    state._attackTargets = null;
    state._healTargets = null;
  }

  function enterEdit() {
    stopAiLoop();
    stopMoveAnimation();
    stopActionPulse();
    closeRulesModal();
    state.mode = 'edit';
    state.tool = 'units';

    state.gameOver = false;
    state.winner = null;

    clearSelection();

    log('Edit: place units / paint terrain.');
    updateHud();
  }

  function enterPlay() {
    if (state.draft.active) {
      log('Finish custom army setup first (Done For Side for each player).');
      updateHud();
      return;
    }

    stopAiLoop();
    stopMoveAnimation();
    stopActionPulse();
    closeRulesModal();
    state.mode = 'play';
    state.turn = 1;
    const onlineRandomStart = state.gameMode === 'online' && net.connected && net.isHost;
    state.side = onlineRandomStart ? randomStartSide() : 'blue';
    state.actsUsed = 0;
    state.actedUnitIds = new Set();

    state.gameOver = false;
    state.winner = null;

    // Lock initial UP for Clear Victory.
    state.initialUP.blue = totals('blue').up;
    state.initialUP.red = totals('red').up;

    // Reset capture tally.
    state.capturedUP.blue = 0;
    state.capturedUP.red = 0;

    clearSelection();
    clearDiceDisplay();

    if (onlineRandomStart) {
      log(`Play: click a friendly unit. ${state.side.toUpperCase()} was randomly selected to go first.`);
    } else {
      log('Play: click a friendly unit. Blue goes first.');
    }
    updateHud();
    maybeStartAiTurn();
  }

  function maybeRollOnlineOpeningInitiative() {
    if (!net.isHost || !onlineModeActive()) return;
    if (state.mode !== 'play' || state.gameOver) return;
    if (state.turn !== 1) return;
    if (state.actsUsed !== 0 || state.actedUnitIds.size > 0) return;
    state.side = randomStartSide();
    log(`Online initiative: ${state.side.toUpperCase()} was randomly selected to act first.`);
  }

  // --- Editing actions
  function normalizeQuality(type, quality) {
    // Keep legacy signature; quality now applies to all unit types, including GEN.
    if (type === 'iat') return 'regular';
    if (!QUALITY_ORDER.includes(quality)) return 'green';
    return quality;
  }

  function placeOrReplaceUnit(hexKey) {
    const h = board.byKey.get(hexKey);
    if (!h) return;

    if (state.draft.active) {
      handleDraftPlacement(hexKey);
      return;
    }

    if (state.editErase) {
      if (unitsByHex.delete(hexKey)) log(`Erased unit at ${hexKey}`);
      updateHud();
      return;
    }

    const type = state.editType;
    const def = UNIT_BY_ID.get(type);
    if (!def) return;

    const quality = normalizeQuality(type, state.editQuality);

    const existing = unitsByHex.get(hexKey);
    if (existing) {
      existing.side = state.editSide;
      existing.type = type;
      existing.quality = quality;
      existing.hp = unitMaxHp(type, quality);
      delete existing.movePauseUntilTurn;
      log(`Replaced at ${hexKey} → ${state.editSide} ${def.abbrev}`);
    } else {
      unitsByHex.set(hexKey, {
        id: nextUnitId++,
        side: state.editSide,
        type,
        quality,
        hp: unitMaxHp(type, quality),
        movePauseUntilTurn: 0,
      });
      log(`Placed ${state.editSide} ${def.abbrev} at ${hexKey}`);
    }

    updateHud();
  }

  function paintTerrain(hexKey) {
    const h = board.byKey.get(hexKey);
    if (!h) return;
    if (state.draft.active) {
      log('Custom draft locks terrain. Place units only.');
      updateHud();
      return;
    }
    h.terrain = state.editTerrain;
    log(`Terrain ${state.editTerrain} at ${hexKey}`);
    updateHud();
  }

  function clearUnits() {
    unitsByHex.clear();
    nextUnitId = 1;
    if (state.draft.active) {
      state.draft.remaining.blue = state.draft.budget;
      state.draft.remaining.red = state.draft.budget;
      state.draft.done.blue = false;
      state.draft.done.red = false;
      state.draft.side = 'blue';
      state.editSide = 'blue';
    }
    log('Cleared all units.');
    updateHud();
  }

  function resetTerrain() {
    for (const h of board.active) h.terrain = 'clear';
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffledCopy(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function pullRandomFromPool(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const idx = randInt(0, pool.length - 1);
    return pool.splice(idx, 1)[0] || null;
  }

  function pickPreferredHex(pool, predicates) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    for (const pred of predicates || []) {
      if (typeof pred !== 'function') continue;
      const hits = [];
      for (let i = 0; i < pool.length; i++) {
        if (pred(pool[i])) hits.push(i);
      }
      if (hits.length > 0) {
        const chosenIdx = hits[randInt(0, hits.length - 1)];
        return pool.splice(chosenIdx, 1)[0] || null;
      }
    }
    return pullRandomFromPool(pool);
  }

  function randomQualityForType(type, doctrine = 'balanced') {
    if (type === 'iat') return 'regular';
    const roll = Math.random();

    if (doctrine === 'elite') {
      if (type === 'run') {
        if (roll < 0.38) return 'veteran';
        if (roll < 0.90) return 'regular';
        return 'green';
      }
      if (type === 'gen') {
        if (roll < 0.36) return 'veteran';
        if (roll < 0.90) return 'regular';
        return 'green';
      }
      if (roll < 0.34) return 'veteran';
      if (roll < 0.86) return 'regular';
      return 'green';
    }

    if (doctrine === 'levy') {
      if (type === 'run') {
        if (roll < 0.05) return 'veteran';
        if (roll < 0.30) return 'regular';
        return 'green';
      }
      if (type === 'gen') {
        if (roll < 0.10) return 'veteran';
        if (roll < 0.45) return 'regular';
        return 'green';
      }
      if (roll < 0.04) return 'veteran';
      if (roll < 0.24) return 'regular';
      return 'green';
    }

    if (type === 'run') {
      if (roll < 0.20) return 'veteran';
      if (roll < 0.60) return 'regular';
      return 'green';
    }
    if (type === 'gen') {
      if (roll < 0.20) return 'veteran';
      if (roll < 0.70) return 'regular';
      return 'green';
    }
    if (type === 'cav') {
      if (roll < 0.25) return 'veteran';
      if (roll < 0.65) return 'regular';
      return 'green';
    }
    if (type === 'inf') {
      if (roll < 0.15) return 'veteran';
      if (roll < 0.60) return 'regular';
      return 'green';
    }
    if (roll < 0.20) return 'veteran';
    if (roll < 0.55) return 'regular';
    return 'green';
  }

  function chooseRandomForwardAxis() {
    const roll = Math.random();
    // Startup weighting: 65% orthogonal (top-bottom or left-right), 35% diagonal.
    if (roll < 0.325) return 'vertical';
    if (roll < 0.65) return 'horizontal';
    if (roll < 0.825) return 'diag_tl_br';
    return 'diag_tr_bl';
  }

  function axisScalarsForHex(h, axis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return { approachRaw: h.q, lateralRaw: h.r };
    if (a === 'diag_tl_br') return { approachRaw: h.q + h.r, lateralRaw: h.r - h.q };
    if (a === 'diag_tr_bl') return { approachRaw: h.r - h.q, lateralRaw: h.q + h.r };
    return { approachRaw: h.r, lateralRaw: h.q };
  }

  function buildAxisGeometry(axis) {
    let minApproach = Infinity;
    let maxApproach = -Infinity;
    let minLateral = Infinity;
    let maxLateral = -Infinity;

    for (const h of board.active) {
      const s = axisScalarsForHex(h, axis);
      if (s.approachRaw < minApproach) minApproach = s.approachRaw;
      if (s.approachRaw > maxApproach) maxApproach = s.approachRaw;
      if (s.lateralRaw < minLateral) minLateral = s.lateralRaw;
      if (s.lateralRaw > maxLateral) maxLateral = s.lateralRaw;
    }

    const approachSpan = Math.max(1, maxApproach - minApproach);
    const lateralSpan = Math.max(1, maxLateral - minLateral);
    const byKey = new Map();
    const entries = [];

    for (const h of board.active) {
      const s = axisScalarsForHex(h, axis);
      const meta = {
        approachRaw: s.approachRaw,
        lateralRaw: s.lateralRaw,
        approachN: (s.approachRaw - minApproach) / approachSpan,
        lateralN: (s.lateralRaw - minLateral) / lateralSpan,
      };
      byKey.set(h.k, meta);
      entries.push({ h, ...meta });
    }

    return { axis: normalizeForwardAxis(axis), byKey, entries };
  }

  function sideDepthNorm(meta, side) {
    if (!meta) return 0.5;
    return (side === 'blue') ? meta.approachN : (1 - meta.approachN);
  }

  function createRandomTerrainLayout(axis, geometry) {
    const terrainByHex = new Map();
    const centerLaneHalf = 0.17 + (Math.random() * 0.05);
    const clashBandHalf = 0.20 + (Math.random() * 0.06);
    const deploymentBand = 0.18;
    const advantageRoll = Math.random();
    const advantageSide = (advantageRoll < 0.35) ? 'blue' : ((advantageRoll < 0.70) ? 'red' : 'none');

    function metaAtHex(hex) {
      return geometry.byKey.get(hex.k) || null;
    }

    function isCenterLane(meta) {
      return Math.abs(meta.lateralN - 0.5) <= centerLaneHalf;
    }

    function isClashBand(meta) {
      return Math.abs(meta.approachN - 0.5) <= clashBandHalf;
    }

    function isDeployment(meta) {
      return meta.approachN <= deploymentBand || meta.approachN >= (1 - deploymentBand);
    }

    function isFlank(meta) {
      return Math.abs(meta.lateralN - 0.5) >= 0.28;
    }

    function isEdge(meta) {
      return meta.approachN <= 0.10 || meta.approachN >= 0.90 || meta.lateralN <= 0.10 || meta.lateralN >= 0.90;
    }

    function canPaint(meta) {
      if (!meta) return false;
      if (isCenterLane(meta) && isClashBand(meta)) return false;
      if (isDeployment(meta) && isCenterLane(meta)) return false;
      return true;
    }

    function setTerrainAt(hex, terrainId) {
      if (!hex || terrainByHex.has(hex.k)) return false;
      terrainByHex.set(hex.k, terrainId);
      return true;
    }

    function filteredCandidates(predicate) {
      const out = [];
      for (const e of geometry.entries) {
        if (terrainByHex.has(e.h.k)) continue;
        if (!canPaint(e)) continue;
        if (typeof predicate === 'function' && !predicate(e)) continue;
        out.push(e.h);
      }
      return out;
    }

    function pickSeed(candidates) {
      if (!Array.isArray(candidates) || candidates.length === 0) return null;
      return candidates[randInt(0, candidates.length - 1)] || null;
    }

    function paintCluster(terrainId, seedHex, targetSize, acceptFn) {
      if (!seedHex || targetSize <= 0) return 0;

      const frontier = [seedHex.k];
      const seen = new Set(frontier);
      let placed = 0;

      while (frontier.length > 0 && placed < targetSize) {
        const idx = randInt(0, frontier.length - 1);
        const hk = frontier.splice(idx, 1)[0];
        const h = board.byKey.get(hk);
        if (!h || terrainByHex.has(hk)) continue;

        const meta = metaAtHex(h);
        if (!meta || !canPaint(meta)) continue;
        if (typeof acceptFn === 'function' && !acceptFn(meta, h)) continue;

        if (!setTerrainAt(h, terrainId)) continue;
        placed += 1;

        for (const nk of shuffledCopy(h.neigh)) {
          if (!seen.has(nk)) {
            seen.add(nk);
            frontier.push(nk);
          }
        }
      }

      return placed;
    }

    const midFlank = () => filteredCandidates(e => {
      return isFlank(e) && e.approachN >= 0.20 && e.approachN <= 0.80;
    });
    const edgeFlank = () => filteredCandidates(e => {
      return isFlank(e) && isEdge(e) && !isDeployment(e);
    });
    const roughBand = () => filteredCandidates(e => {
      return !isDeployment(e) && (!isCenterLane(e) || !isClashBand(e));
    });

    const biasMatch = (meta) => {
      if (advantageSide === 'none') return false;
      return sideDepthNorm(meta, advantageSide) <= 0.45;
    };

    // Water is intentionally sparse and pushed to flank/edge pockets.
    const waterClusters = (Math.random() < 0.45) ? 1 : 0;
    for (let i = 0; i < waterClusters; i++) {
      const seed = pickSeed(edgeFlank());
      paintCluster('water', seed, randInt(2, 4), (meta) => {
        return isEdge(meta) && isFlank(meta) && !isDeployment(meta) && Math.abs(meta.approachN - 0.5) > 0.18;
      });
    }

    // Woods: ambush-friendly flank cover.
    const woodsClusters = randInt(2, 3);
    for (let i = 0; i < woodsClusters; i++) {
      let seeds = midFlank();
      if (advantageSide !== 'none' && Math.random() < 0.55) {
        const biased = seeds.filter(h => biasMatch(metaAtHex(h)));
        if (biased.length) seeds = biased;
      }
      const seed = pickSeed(seeds);
      paintCluster('woods', seed, randInt(3, 6), (meta) => isFlank(meta) && !isDeployment(meta));
    }

    // Hills: flank high ground and approach shoulders.
    const hillsClusters = randInt(2, 3);
    for (let i = 0; i < hillsClusters; i++) {
      let seeds = midFlank();
      if (advantageSide !== 'none' && Math.random() < 0.60) {
        const biased = seeds.filter(h => biasMatch(metaAtHex(h)));
        if (biased.length) seeds = biased;
      }
      const seed = pickSeed(seeds);
      paintCluster('hills', seed, randInt(3, 5), (meta) => isFlank(meta) && meta.approachN >= 0.12 && meta.approachN <= 0.88);
    }

    // Rough: friction near the side corridors, avoiding the core clash lane.
    const roughClusters = randInt(2, 4);
    for (let i = 0; i < roughClusters; i++) {
      const seed = pickSeed(roughBand());
      paintCluster('rough', seed, randInt(2, 5), (meta) => !isDeployment(meta) && (!isCenterLane(meta) || !isClashBand(meta)));
    }

    // Final sweep: keep the center clash lane open.
    for (const [hk] of terrainByHex) {
      const meta = geometry.byKey.get(hk);
      if (!meta) continue;
      if (isCenterLane(meta) && isClashBand(meta)) {
        terrainByHex.delete(hk);
      }
    }

    // Cap density so movement stays fluid.
    const maxTerrain = randInt(24, 34);
    if (terrainByHex.size > maxTerrain) {
      const keys = shuffledCopy([...terrainByHex.keys()]);
      for (const hk of keys) {
        if (terrainByHex.size <= maxTerrain) break;
        const t = terrainByHex.get(hk);
        if (t === 'water' && Math.random() < 0.80) continue;
        terrainByHex.delete(hk);
      }
    }

    const terrain = [];
    for (const [hk, terrainId] of terrainByHex) {
      const h = board.byKey.get(hk);
      if (!h) continue;
      terrain.push({ q: h.q, r: h.r, terrain: terrainId });
    }

    return { terrain, terrainByHex, advantageSide };
  }

  function deploymentPool(side, depthNorm, terrainByHex, occupiedSet, geometry) {
    const out = [];
    for (const e of geometry.entries) {
      if (terrainByHex.get(e.h.k) === 'water') continue;
      if (occupiedSet.has(e.h.k)) continue;
      if (sideDepthNorm(e, side) <= depthNorm) out.push(e.h);
    }
    return out;
  }

  function terrainAtForLayout(hexKey, terrainByHex) {
    if (terrainByHex && terrainByHex.has(hexKey)) return terrainByHex.get(hexKey) || 'clear';
    const h = board.byKey.get(hexKey);
    return h?.terrain || 'clear';
  }

  function hasTerrainExitForType(hex, type, terrainByHex) {
    if (!hex || !type) return false;
    const moveUnit = { type, quality: 'green' };
    const mp = unitMovePoints(moveUnit);
    if (mp <= 0) return false;

    for (const nk of hex.neigh || []) {
      const nh = board.byKey.get(nk);
      if (!nh) continue;
      const nTerrain = terrainAtForLayout(nk, terrainByHex);
      const stepCost = terrainMoveCost(type, nTerrain);
      if (Number.isFinite(stepCost) && stepCost <= mp) return true;
    }

    return false;
  }

  function pickPreferredSpawnHex(pool, predicates, type, terrainByHex) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const safeCheck = (h) => hasTerrainExitForType(h, type, terrainByHex);

    for (const pred of predicates || []) {
      if (typeof pred !== 'function') continue;
      const hits = [];
      for (let i = 0; i < pool.length; i++) {
        const h = pool[i];
        if (pred(h) && safeCheck(h)) hits.push(i);
      }
      if (hits.length > 0) {
        const chosenIdx = hits[randInt(0, hits.length - 1)];
        return pool.splice(chosenIdx, 1)[0] || null;
      }
    }

    const safeFallback = [];
    for (let i = 0; i < pool.length; i++) {
      if (safeCheck(pool[i])) safeFallback.push(i);
    }
    if (safeFallback.length > 0) {
      const chosenIdx = safeFallback[randInt(0, safeFallback.length - 1)];
      return pool.splice(chosenIdx, 1)[0] || null;
    }

    return null;
  }

  function pullAnySafeHex(type, terrainByHex, occupiedSet) {
    const candidates = [];
    for (const h of board.active) {
      if (!h) continue;
      if (occupiedSet.has(h.k)) continue;
      const t = terrainAtForLayout(h.k, terrainByHex);
      if (t === 'water') continue;
      if (!hasTerrainExitForType(h, type, terrainByHex)) continue;
      candidates.push(h);
    }
    if (candidates.length === 0) return null;
    return candidates[randInt(0, candidates.length - 1)] || null;
  }

  const FORMATION_LABELS = new Map([
    ['phalanx', 'Phalanx Line'],
    ['triplex', 'Triplex Acies'],
    ['oblique', 'Oblique Order'],
    ['crescent', 'Crescent Envelopment'],
    ['refused_flank', 'Refused Flank'],
  ]);

  function formationLabel(id) {
    return FORMATION_LABELS.get(id) || String(id || 'Phalanx Line');
  }

  function weightedPick(options, fallback) {
    if (!Array.isArray(options) || options.length === 0) return fallback;
    let total = 0;
    for (const o of options) total += Math.max(0, Number(o.weight) || 0);
    if (total <= 0) return options[0]?.value ?? fallback;
    let roll = Math.random() * total;
    for (const o of options) {
      roll -= Math.max(0, Number(o.weight) || 0);
      if (roll <= 0) return o.value;
    }
    return options[options.length - 1]?.value ?? fallback;
  }

  function chooseFormationForStartup(doctrine = 'balanced', role = 'even') {
    if (doctrine === 'elite') {
      if (role === 'outnumbered') {
        return weightedPick([
          { value: 'oblique', weight: 36 },
          { value: 'refused_flank', weight: 29 },
          { value: 'triplex', weight: 21 },
          { value: 'crescent', weight: 10 },
          { value: 'phalanx', weight: 4 },
        ], 'oblique');
      }
      return weightedPick([
        { value: 'triplex', weight: 32 },
        { value: 'oblique', weight: 26 },
        { value: 'refused_flank', weight: 20 },
        { value: 'phalanx', weight: 14 },
        { value: 'crescent', weight: 8 },
      ], 'triplex');
    }

    if (doctrine === 'levy') {
      if (role === 'advantaged') {
        return weightedPick([
          { value: 'phalanx', weight: 38 },
          { value: 'crescent', weight: 26 },
          { value: 'triplex', weight: 18 },
          { value: 'refused_flank', weight: 10 },
          { value: 'oblique', weight: 8 },
        ], 'phalanx');
      }
      return weightedPick([
        { value: 'phalanx', weight: 34 },
        { value: 'triplex', weight: 24 },
        { value: 'crescent', weight: 24 },
        { value: 'refused_flank', weight: 10 },
        { value: 'oblique', weight: 8 },
      ], 'phalanx');
    }

    if (role === 'outnumbered') {
      return weightedPick([
        { value: 'triplex', weight: 29 },
        { value: 'oblique', weight: 24 },
        { value: 'refused_flank', weight: 22 },
        { value: 'phalanx', weight: 15 },
        { value: 'crescent', weight: 10 },
      ], 'triplex');
    }

    return weightedPick([
      { value: 'triplex', weight: 24 },
      { value: 'phalanx', weight: 23 },
      { value: 'crescent', weight: 20 },
      { value: 'oblique', weight: 17 },
      { value: 'refused_flank', weight: 16 },
    ], 'triplex');
  }

  function sizeLabelForUnits(maxUnits) {
    if (maxUnits <= 20) return 'small';
    if (maxUnits >= 29) return 'large';
    return 'medium';
  }

  function chooseRandomStartupProfile() {
    const modeRoll = Math.random();

    let matchup = 'even';
    let blueUnits = 24;
    let redUnits = 24;
    let blueDoctrine = 'balanced';
    let redDoctrine = 'balanced';
    let blueRole = 'even';
    let redRole = 'even';

    if (modeRoll < 0.27) {
      // Classic "quality vs quantity" setup.
      const eliteIsBlue = Math.random() < 0.5;
      const eliteUnits = randInt(15, 22);
      const levyUnits = randInt(27, 35);
      matchup = eliteIsBlue ? 'blue_elite_outnumbered' : 'red_elite_outnumbered';
      blueUnits = eliteIsBlue ? eliteUnits : levyUnits;
      redUnits = eliteIsBlue ? levyUnits : eliteUnits;
      blueDoctrine = eliteIsBlue ? 'elite' : 'levy';
      redDoctrine = eliteIsBlue ? 'levy' : 'elite';
      blueRole = eliteIsBlue ? 'outnumbered' : 'advantaged';
      redRole = eliteIsBlue ? 'advantaged' : 'outnumbered';
    } else if (modeRoll < 0.62) {
      // Even baseline battles.
      const evenUnits = randInt(18, 32);
      blueUnits = evenUnits;
      redUnits = evenUnits;
      matchup = 'even';
      if (Math.random() < 0.20) {
        blueDoctrine = 'elite';
        redDoctrine = 'balanced';
      } else if (Math.random() < 0.20) {
        redDoctrine = 'elite';
        blueDoctrine = 'balanced';
      }
    } else {
      // Moderate asymmetry (still within requested 15-35 window).
      const base = randInt(18, 30);
      const delta = randInt(3, 8);
      if (Math.random() < 0.5) {
        matchup = 'blue_advantage';
        blueUnits = clampInt(base + delta, 15, 35, base);
        redUnits = clampInt(base, 15, 35, base);
        blueRole = 'advantaged';
        redRole = 'outnumbered';
      } else {
        matchup = 'red_advantage';
        redUnits = clampInt(base + delta, 15, 35, base);
        blueUnits = clampInt(base, 15, 35, base);
        redRole = 'advantaged';
        blueRole = 'outnumbered';
      }

      if (Math.random() < 0.25) {
        if (blueRole === 'outnumbered') blueDoctrine = 'elite';
        if (redRole === 'outnumbered') redDoctrine = 'elite';
        if (blueRole === 'advantaged') blueDoctrine = 'levy';
        if (redRole === 'advantaged') redDoctrine = 'levy';
      }
    }

    const blueFormation = chooseFormationForStartup(blueDoctrine, blueRole);
    const redFormation = chooseFormationForStartup(redDoctrine, redRole);
    const size = sizeLabelForUnits(Math.max(blueUnits, redUnits));

    return {
      size,
      matchup,
      blueDoctrine,
      redDoctrine,
      blueRole,
      redRole,
      blueFormation,
      redFormation,
      blueUnits: clampInt(blueUnits, 15, 35, 24),
      redUnits: clampInt(redUnits, 15, 35, 24),
    };
  }

  function forceMixCounts(totalNeeded, doctrine = 'balanced', formation = 'phalanx', role = 'even') {
    const counts = {
      gen: totalNeeded >= 30 ? 3 : (totalNeeded >= 18 ? 2 : 1),
      run: totalNeeded >= 16 ? 1 : 0,
      iat: totalNeeded >= 22 ? 1 : 0,
      inf: 0,
      cav: 0,
      arc: 0,
      skr: 0,
    };

    const baseRatios = {
      phalanx: { inf: 0.56, cav: 0.18, arc: 0.12, skr: 0.14 },
      triplex: { inf: 0.53, cav: 0.18, arc: 0.13, skr: 0.16 },
      oblique: { inf: 0.46, cav: 0.25, arc: 0.11, skr: 0.18 },
      crescent: { inf: 0.49, cav: 0.23, arc: 0.11, skr: 0.17 },
      refused_flank: { inf: 0.51, cav: 0.22, arc: 0.11, skr: 0.16 },
    };
    const ratios = { ...(baseRatios[formation] || baseRatios.triplex) };

    if (doctrine === 'elite') {
      ratios.cav += 0.03;
      ratios.inf -= 0.01;
      ratios.arc -= 0.01;
      ratios.skr -= 0.01;
    } else if (doctrine === 'levy') {
      ratios.inf += 0.04;
      ratios.skr += 0.02;
      ratios.cav -= 0.03;
      ratios.arc -= 0.03;
    }

    if (role === 'outnumbered') {
      ratios.cav += 0.02;
      ratios.inf -= 0.01;
      ratios.arc -= 0.01;
    } else if (role === 'advantaged') {
      ratios.inf += 0.02;
      ratios.skr += 0.01;
      ratios.cav -= 0.02;
      ratios.arc -= 0.01;
    }

    let remaining = Math.max(0, totalNeeded - counts.gen - counts.run - counts.iat);
    const min = {
      inf: Math.max(4, Math.floor(remaining * 0.34)),
      cav: remaining >= 20 ? 2 : 1,
      arc: remaining >= 18 ? 2 : 1,
      skr: remaining >= 18 ? 2 : 1,
    };
    counts.inf = Math.max(min.inf, Math.floor(remaining * ratios.inf));
    counts.cav = Math.max(min.cav, Math.floor(remaining * ratios.cav));
    counts.arc = Math.max(min.arc, Math.floor(remaining * ratios.arc));
    counts.skr = Math.max(min.skr, Math.floor(remaining * ratios.skr));

    let used = counts.inf + counts.cav + counts.arc + counts.skr;
    const upOrder = (formation === 'oblique' || formation === 'refused_flank')
      ? ['inf', 'cav', 'inf', 'skr', 'arc']
      : ['inf', 'inf', 'skr', 'arc', 'cav'];
    let upIdx = 0;
    while (used < remaining) {
      const t = upOrder[upIdx % upOrder.length];
      counts[t] += 1;
      used += 1;
      upIdx += 1;
    }

    const downOrder = ['inf', 'skr', 'arc', 'cav'];
    while (used > remaining) {
      let changed = false;
      for (const t of downOrder) {
        if (counts[t] > min[t]) {
          counts[t] -= 1;
          used -= 1;
          changed = true;
          break;
        }
      }
      if (!changed) break;
    }

    return counts;
  }

  function splitByWeights(total, weights) {
    const safeWeights = Array.isArray(weights) && weights.length > 0 ? weights : [1];
    let sum = 0;
    for (const w of safeWeights) sum += Math.max(0, Number(w) || 0);
    if (sum <= 0) sum = safeWeights.length;
    const out = safeWeights.map(w => Math.floor(total * ((Math.max(0, Number(w) || 0) || 1) / sum)));
    let used = out.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (used < total) {
      out[idx % out.length] += 1;
      used += 1;
      idx += 1;
    }
    return out;
  }

  function buildRandomForce(
    side,
    terrainByHex,
    occupiedSet,
    geometry,
    totalNeeded = RANDOM_START_UNITS_PER_SIDE,
    qualityDoctrine = 'balanced',
    formation = 'triplex',
    forceRole = 'even',
  ) {
    const force = [];
    let depthNorm = 0.26;
    let pool = [];

    while (depthNorm <= 0.82) {
      pool = deploymentPool(side, depthNorm, terrainByHex, occupiedSet, geometry);
      if (pool.length >= totalNeeded) break;
      depthNorm += 0.05;
    }

    if (pool.length < totalNeeded) {
      pool = board.active.filter(h => terrainByHex.get(h.k) !== 'water' && !occupiedSet.has(h.k));
    }

    pool = shuffledCopy(pool);

    const depthAt = (h) => sideDepthNorm(geometry.byKey.get(h.k), side);
    const lateralSigned = (h) => {
      const m = geometry.byKey.get(h.k);
      return m ? (m.lateralN - 0.5) : 0;
    };
    const lateralOffset = (h) => {
      const m = geometry.byKey.get(h.k);
      return m ? Math.abs(m.lateralN - 0.5) : 0;
    };

    function shiftQuality(baseQuality, steps) {
      const idx = QUALITY_ORDER.indexOf(baseQuality);
      if (idx < 0) return baseQuality;
      const next = Math.max(0, Math.min(QUALITY_ORDER.length - 1, idx + steps));
      return QUALITY_ORDER[next] || baseQuality;
    }

    function qualityPlanForForce() {
      const plan = {
        gen: 'regular',
        run: 'green',
        iat: 'regular',
        infFront: 'regular',
        infSupport: 'regular',
        infReserve: 'regular',
        cavWing: 'regular',
        arcLine: 'regular',
        skrScreen: 'regular',
      };
      if (qualityDoctrine === 'elite') {
        plan.gen = 'veteran';
        plan.run = 'regular';
        plan.infFront = 'veteran';
        plan.infSupport = 'regular';
        plan.infReserve = 'regular';
        plan.cavWing = 'veteran';
        plan.arcLine = 'regular';
        plan.skrScreen = 'regular';
      } else if (qualityDoctrine === 'levy') {
        plan.gen = 'regular';
        plan.run = 'green';
        plan.infFront = 'green';
        plan.infSupport = 'green';
        plan.infReserve = 'green';
        plan.cavWing = 'regular';
        plan.arcLine = 'green';
        plan.skrScreen = 'green';
      }

      if (forceRole === 'outnumbered') {
        plan.gen = shiftQuality(plan.gen, +1);
        plan.cavWing = shiftQuality(plan.cavWing, +1);
        plan.infFront = shiftQuality(plan.infFront, +1);
      } else if (forceRole === 'advantaged' && qualityDoctrine === 'levy') {
        plan.infSupport = shiftQuality(plan.infSupport, -1);
        plan.infReserve = shiftQuality(plan.infReserve, -1);
      }

      if (formation === 'oblique' || formation === 'refused_flank') {
        plan.cavWing = shiftQuality(plan.cavWing, +1);
      } else if (formation === 'phalanx') {
        plan.infFront = shiftQuality(plan.infFront, +1);
      }

      plan.iat = 'regular';
      return plan;
    }

    const qPlan = qualityPlanForForce();
    const strongWing = (Math.random() < 0.5) ? 'left' : 'right';
    const frontDepthMin = Math.max(0.13, depthNorm - 0.09);
    const supportDepthMin = Math.max(0.09, frontDepthMin - 0.08);
    const rearDepthMax = Math.max(0.07, supportDepthMin - 0.02);
    const vanguardDepthMin = Math.max(frontDepthMin + 0.01, depthNorm - 0.03);

    const isCenterTight = (h) => lateralOffset(h) <= 0.14;
    const isCenter = (h) => lateralOffset(h) <= 0.23;
    const isInnerFlank = (h) => lateralOffset(h) >= 0.18 && lateralOffset(h) <= 0.34;
    const isFlank = (h) => lateralOffset(h) >= 0.30;
    const isLeftWing = (h) => lateralSigned(h) <= -0.22;
    const isRightWing = (h) => lateralSigned(h) >= 0.22;
    const isStrongWing = (h) => strongWing === 'left' ? isLeftWing(h) : isRightWing(h);
    const isWeakWing = (h) => strongWing === 'left' ? isRightWing(h) : isLeftWing(h);

    const isRear = (h) => depthAt(h) <= rearDepthMax;
    const isSupport = (h) => depthAt(h) >= supportDepthMin && depthAt(h) < frontDepthMin;
    const isFront = (h) => depthAt(h) >= frontDepthMin && depthAt(h) <= Math.max(frontDepthMin + 0.12, depthNorm + 0.03);
    const isVanguard = (h) => depthAt(h) >= vanguardDepthMin;

    const mix = forceMixCounts(totalNeeded, qualityDoctrine, formation, forceRole);

    function removeFromPool(hexKey) {
      const idx = pool.findIndex(h => h && h.k === hexKey);
      if (idx >= 0) pool.splice(idx, 1);
    }

    function pickSpotForGroup(type, groupSpots, predicates) {
      const basePreds = (Array.isArray(predicates) && predicates.length > 0) ? predicates : [() => true];
      const ordered = [];
      const nearGroup = (h) => groupSpots.some(g => g.neigh.includes(h.k));

      for (const pred of basePreds) {
        if (groupSpots.length > 0) ordered.push((h) => pred(h) && nearGroup(h));
        ordered.push(pred);
      }

      let spot = pickPreferredSpawnHex(pool, ordered, type, terrainByHex);
      if (!spot && groupSpots.length > 0) {
        spot = pickPreferredSpawnHex(pool, [(h) => nearGroup(h)], type, terrainByHex);
      }
      if (!spot) {
        spot = pickPreferredSpawnHex(pool, [() => true], type, terrainByHex);
      }
      if (!spot) {
        spot = pullAnySafeHex(type, terrainByHex, occupiedSet);
      }
      return spot;
    }

    function groupedQuality(roleName, chunkIdx, type) {
      if (type === 'iat') return 'regular';
      let q = qPlan[roleName] || randomQualityForType(type, qualityDoctrine);
      if (chunkIdx > 0 && Math.random() < 0.22) {
        if (qualityDoctrine === 'elite') q = shiftQuality(q, -1);
        else if (qualityDoctrine === 'levy') q = shiftQuality(q, +1);
      }
      return q;
    }

    function placeUnit(spot, type, quality) {
      if (!spot || !type) return false;
      if (occupiedSet.has(spot.k)) return false;
      occupiedSet.add(spot.k);
      removeFromPool(spot.k);
      force.push({
        q: spot.q,
        r: spot.r,
        side,
        type,
        quality,
      });
      return true;
    }

    function addGrouped(type, count, roleName, predicates, chunkMin = 1, chunkMax = 1) {
      let remaining = Math.max(0, count);
      let chunkIdx = 0;

      while (remaining > 0) {
        const targetChunk = Math.min(remaining, Math.max(1, randInt(chunkMin, chunkMax)));
        const groupSpots = [];
        const q = groupedQuality(roleName, chunkIdx, type);
        let placed = 0;

        for (let i = 0; i < targetChunk; i++) {
          const spot = pickSpotForGroup(type, groupSpots, predicates);
          if (!spot) break;
          if (!placeUnit(spot, type, q)) break;
          groupSpots.push(spot);
          placed += 1;
        }

        if (placed <= 0) {
          const fallback = pullAnySafeHex(type, terrainByHex, occupiedSet);
          if (!fallback) break;
          if (!placeUnit(fallback, type, q)) break;
          placed = 1;
        }

        remaining -= placed;
        chunkIdx += 1;
      }
    }

    addGrouped('gen', mix.gen, 'gen', [h => isRear(h) && isCenterTight(h), h => isRear(h) && isCenter(h)], 1, 1);
    addGrouped('run', mix.run, 'run', [h => isRear(h) && isCenter(h)], 1, 1);
    addGrouped('iat', mix.iat, 'iat', [h => isSupport(h) && isCenter(h), h => isRear(h) && isCenter(h)], 1, 1);

    const addWingCav = (count, wingPred) => {
      if (count <= 0) return;
      addGrouped('cav', count, 'cavWing', [
        h => isFront(h) && wingPred(h),
        h => isSupport(h) && wingPred(h),
        h => isFront(h) && isInnerFlank(h),
      ], 2, 3);
    };

    const [cavStrong, cavWeak] = splitByWeights(mix.cav, (formation === 'oblique' || formation === 'refused_flank') ? [0.70, 0.30] : [0.50, 0.50]);
    addWingCav(cavStrong, isStrongWing);
    addWingCav(cavWeak, isWeakWing);

    if (formation === 'phalanx') {
      const [infFront, infReserve] = splitByWeights(mix.inf, [0.68, 0.32]);
      addGrouped('inf', infFront, 'infFront', [
        h => isFront(h) && isCenter(h),
        h => isFront(h) && isInnerFlank(h),
      ], 3, 6);
      addGrouped('inf', infReserve, 'infReserve', [
        h => isSupport(h) && isCenter(h),
        h => isRear(h) && isCenter(h),
      ], 2, 4);
      addGrouped('arc', mix.arc, 'arcLine', [
        h => isRear(h) && isCenter(h),
        h => isSupport(h) && isCenter(h),
      ], 2, 4);
      addGrouped('skr', mix.skr, 'skrScreen', [
        h => isFront(h) && isInnerFlank(h),
        h => isVanguard(h) && isFlank(h),
      ], 2, 3);
    } else if (formation === 'triplex') {
      const [line1, line2, line3] = splitByWeights(mix.inf, [0.38, 0.34, 0.28]);
      addGrouped('inf', line1, 'infFront', [
        h => isFront(h) && isCenter(h),
        h => isFront(h) && isInnerFlank(h),
      ], 2, 5);
      addGrouped('inf', line2, 'infSupport', [
        h => isSupport(h) && isCenter(h),
        h => isSupport(h) && isInnerFlank(h),
      ], 2, 4);
      addGrouped('inf', line3, 'infReserve', [
        h => isRear(h) && isCenter(h),
        h => isRear(h) && isInnerFlank(h),
      ], 2, 4);
      addGrouped('skr', mix.skr, 'skrScreen', [
        h => isVanguard(h) && isCenter(h),
        h => isFront(h) && isCenter(h),
      ], 2, 3);
      addGrouped('arc', mix.arc, 'arcLine', [
        h => isRear(h) && isCenter(h),
        h => isSupport(h) && isCenter(h),
      ], 2, 4);
    } else if (formation === 'oblique') {
      const [infSpear, infCenter, infRefused] = splitByWeights(mix.inf, [0.48, 0.28, 0.24]);
      addGrouped('inf', infSpear, 'infFront', [
        h => isFront(h) && isStrongWing(h),
        h => isFront(h) && isInnerFlank(h),
      ], 2, 5);
      addGrouped('inf', infCenter, 'infSupport', [
        h => isFront(h) && isCenter(h),
        h => isSupport(h) && isCenter(h),
      ], 2, 4);
      addGrouped('inf', infRefused, 'infReserve', [
        h => isSupport(h) && isWeakWing(h),
        h => isRear(h) && isWeakWing(h),
      ], 2, 4);
      addGrouped('skr', mix.skr, 'skrScreen', [
        h => isFront(h) && isStrongWing(h),
        h => isVanguard(h) && isCenter(h),
      ], 2, 3);
      addGrouped('arc', mix.arc, 'arcLine', [
        h => isRear(h) && isCenter(h),
        h => isSupport(h) && isWeakWing(h),
      ], 2, 3);
    } else if (formation === 'crescent') {
      const [infLeft, infCenter, infRight] = splitByWeights(mix.inf, [0.36, 0.28, 0.36]);
      addGrouped('inf', infLeft, 'infFront', [
        h => isFront(h) && isLeftWing(h),
        h => isSupport(h) && isLeftWing(h),
      ], 2, 5);
      addGrouped('inf', infCenter, 'infSupport', [
        h => isSupport(h) && isCenter(h),
        h => isRear(h) && isCenter(h),
      ], 2, 4);
      addGrouped('inf', infRight, 'infFront', [
        h => isFront(h) && isRightWing(h),
        h => isSupport(h) && isRightWing(h),
      ], 2, 5);
      addGrouped('skr', mix.skr, 'skrScreen', [
        h => isVanguard(h) && isCenter(h),
        h => isFront(h) && isInnerFlank(h),
      ], 2, 3);
      addGrouped('arc', mix.arc, 'arcLine', [
        h => isRear(h) && isCenter(h),
        h => isSupport(h) && isCenter(h),
      ], 2, 4);
    } else { // refused_flank
      const [infMain, infReserve] = splitByWeights(mix.inf, [0.62, 0.38]);
      addGrouped('inf', infMain, 'infFront', [
        h => isFront(h) && isStrongWing(h),
        h => isFront(h) && isCenter(h),
      ], 2, 5);
      addGrouped('inf', infReserve, 'infReserve', [
        h => isSupport(h) && isWeakWing(h),
        h => isRear(h) && isWeakWing(h),
      ], 2, 4);
      addGrouped('skr', mix.skr, 'skrScreen', [
        h => isFront(h) && isCenter(h),
        h => isSupport(h) && isWeakWing(h),
      ], 2, 3);
      addGrouped('arc', mix.arc, 'arcLine', [
        h => isRear(h) && isCenter(h),
        h => isRear(h) && isWeakWing(h),
      ], 2, 3);
    }

    const refillTypes = ['inf', 'inf', 'skr', 'arc', 'cav', 'inf', 'skr'];
    while (force.length < totalNeeded) {
      const type = refillTypes[randInt(0, refillTypes.length - 1)];
      const role = (type === 'inf')
        ? (forceRole === 'outnumbered' ? 'infFront' : 'infSupport')
        : (type === 'cav' ? 'cavWing' : (type === 'arc' ? 'arcLine' : 'skrScreen'));
      const q = groupedQuality(role, 99, type);
      const spot = pullAnySafeHex(type, terrainByHex, occupiedSet);
      if (!spot) break;
      placeUnit(spot, type, q);
    }

    function commandRadiusForForceUnit(u) {
      if (!u) return 0;
      if (u.type === 'run') return RUNNER_COMMAND_RADIUS;
      if (u.type === 'gen') return commandRadiusForUnit(u);
      return 0;
    }

    function forceMeta(u) {
      return geometry.byKey.get(key(u.q, u.r)) || null;
    }

    function forceDepth(u) {
      return sideDepthNorm(forceMeta(u), side);
    }

    function forceLateral(u) {
      const meta = forceMeta(u);
      return meta ? meta.lateralN : 0.5;
    }

    function forceCoverageRatio() {
      const commanders = force.filter(u => u.side === side && isCommandSourceUnit(u));
      const controlled = force.filter(u => {
        if (u.side !== side) return false;
        if (u.type !== 'inf' && u.type !== 'arc' && u.type !== 'skr') return false;
        return u.quality !== 'veteran';
      });
      if (controlled.length === 0) return 1;
      if (commanders.length === 0) return 0;

      let inRange = 0;
      for (const target of controlled) {
        const covered = commanders.some((src) => {
          const radius = commandRadiusForForceUnit(src);
          if (radius <= 0) return false;
          return axialDistance(target.q, target.r, src.q, src.r) <= radius;
        });
        if (covered) inRange += 1;
      }
      return inRange / controlled.length;
    }

    function swapForcePositions(a, b) {
      if (!a || !b || a === b) return;
      const q = a.q;
      const r = a.r;
      a.q = b.q;
      a.r = b.r;
      b.q = q;
      b.r = r;
    }

    function rebalanceForceCommandNodes() {
      const commanders = force
        .filter(u => u.side === side && isCommandSourceUnit(u))
        .sort((a, b) => commandRadiusForForceUnit(b) - commandRadiusForForceUnit(a));
      if (commanders.length === 0) return;

      const originalPositions = force.map(u => ({ q: u.q, r: u.r }));
      const baseline = forceCoverageRatio();
      const strongLateralTarget = strongWing === 'left' ? 0.34 : 0.66;
      const weakLateralTarget = strongWing === 'left' ? 0.66 : 0.34;
      const desiredAnchors = [
        { depth: 0.24, lateral: 0.50 },
        { depth: 0.40, lateral: 0.50 },
        { depth: 0.38, lateral: strongLateralTarget },
        { depth: 0.35, lateral: weakLateralTarget },
      ];

      const used = new Set();
      const nonWater = force.filter(u => {
        const h = board.byKey.get(key(u.q, u.r));
        return h && h.terrain !== 'water';
      });

      function pickAnchor(targetDepth, targetLateral) {
        const candidates = nonWater.filter(u => !used.has(key(u.q, u.r)));
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => {
          const da = Math.abs(forceDepth(a) - targetDepth) * 1.9 + Math.abs(forceLateral(a) - targetLateral);
          const db = Math.abs(forceDepth(b) - targetDepth) * 1.9 + Math.abs(forceLateral(b) - targetLateral);
          return da - db;
        });
        const winner = candidates[0] || null;
        if (winner) used.add(key(winner.q, winner.r));
        return winner;
      }

      for (let i = 0; i < commanders.length; i++) {
        const cmd = commanders[i];
        const anchorSpec = desiredAnchors[Math.min(i, desiredAnchors.length - 1)];
        const anchor = pickAnchor(anchorSpec.depth, anchorSpec.lateral);
        if (!anchor) continue;
        swapForcePositions(cmd, anchor);
      }

      const mobileCommanders = [...commanders].sort((a, b) => commandRadiusForForceUnit(a) - commandRadiusForForceUnit(b));
      for (let pass = 0; pass < 2; pass++) {
        const now = forceCoverageRatio();
        if (now >= 0.78) break;

        const controlled = force.filter(u => {
          if (u.side !== side) return false;
          if (u.type !== 'inf' && u.type !== 'arc' && u.type !== 'skr') return false;
          return u.quality !== 'veteran';
        });
        if (controlled.length === 0 || mobileCommanders.length === 0) break;

        let uncovered = null;
        let bestGap = -1;
        for (const t of controlled) {
          let nearest = Infinity;
          for (const src of commanders) {
            const d = axialDistance(t.q, t.r, src.q, src.r) - commandRadiusForForceUnit(src);
            if (d < nearest) nearest = d;
          }
          if (nearest > bestGap) {
            bestGap = nearest;
            uncovered = t;
          }
        }
        if (!uncovered || bestGap <= 0) break;

        const mover = mobileCommanders[pass % mobileCommanders.length];
        if (!mover) break;
        swapForcePositions(mover, uncovered);
      }

      const after = forceCoverageRatio();
      if (after + 0.06 < baseline) {
        // If rebalancing somehow hurts command coverage badly, fall back to the original placement.
        // This keeps random starts stable.
        for (let i = 0; i < force.length; i++) {
          const saved = originalPositions[i];
          if (!saved) continue;
          force[i].q = saved.q;
          force[i].r = saved.r;
        }
      }
    }

    rebalanceForceCommandNodes();

    return force;
  }

  function buildRandomStartupScenario(axis) {
    const profile = chooseRandomStartupProfile();
    const geometry = buildAxisGeometry(axis);
    const terrainData = createRandomTerrainLayout(axis, geometry);
    const occupiedSet = new Set();
    const blue = buildRandomForce(
      'blue',
      terrainData.terrainByHex,
      occupiedSet,
      geometry,
      profile.blueUnits,
      profile.blueDoctrine || 'balanced',
      profile.blueFormation || 'triplex',
      profile.blueRole || 'even',
    );
    const red = buildRandomForce(
      'red',
      terrainData.terrainByHex,
      occupiedSet,
      geometry,
      profile.redUnits,
      profile.redDoctrine || 'balanced',
      profile.redFormation || 'triplex',
      profile.redRole || 'even',
    );

    return {
      axis: normalizeForwardAxis(axis),
      terrain: terrainData.terrain,
      units: [...blue, ...red],
      advantageSide: terrainData.advantageSide,
      size: profile.size,
      matchup: profile.matchup,
      blueDoctrine: profile.blueDoctrine || 'balanced',
      redDoctrine: profile.redDoctrine || 'balanced',
      blueRole: profile.blueRole || 'even',
      redRole: profile.redRole || 'even',
      blueFormation: profile.blueFormation || 'triplex',
      redFormation: profile.redFormation || 'triplex',
      blueUnits: profile.blueUnits,
      redUnits: profile.redUnits,
    };
  }

  function installRandomStartupScenario() {
    const axis = chooseRandomForwardAxis();
    state.forwardAxis = normalizeForwardAxis(axis);
    const generated = buildRandomStartupScenario(state.forwardAxis);
    SCENARIOS[RANDOM_START_SCENARIO_NAME] = {
      terrain: generated.terrain,
      units: generated.units,
    };
    return generated;
  }

  function loadScenario(name) {
    const sc = SCENARIOS[name];
    if (!sc) return;

    const stats = {
      terrainPlaced: 0,
      terrainSkippedOffBoard: 0,
      terrainSkippedInvalidType: 0,
      terrainDuplicates: 0,
      unitsPlaced: 0,
      unitsSkippedOffBoard: 0,
      unitsSkippedBadType: 0,
      unitsSkippedBadSide: 0,
      unitsDuplicates: 0,
    };

    resetDraftState({ keepBudget: true });
    enterEdit();
    clearUnits();
    resetTerrain();
    clearDiceDisplay();

    // Terrain paint
    const seenTerrainHexes = new Set();
    for (const t of (sc.terrain || [])) {
      const k = key(t.q, t.r);
      if (!board.activeSet.has(k)) {
        stats.terrainSkippedOffBoard += 1;
        continue;
      }
      if (!TERRAIN_IDS.has(t.terrain)) {
        stats.terrainSkippedInvalidType += 1;
        continue;
      }
      if (seenTerrainHexes.has(k)) stats.terrainDuplicates += 1;
      seenTerrainHexes.add(k);

      const h = board.byKey.get(k);
      if (!h) {
        stats.terrainSkippedOffBoard += 1;
        continue;
      }
      h.terrain = t.terrain;
      stats.terrainPlaced += 1;
    }

    // Units
    const seenUnitHexes = new Set();
    for (const u of (sc.units || [])) {
      const k = key(u.q, u.r);
      if (!board.activeSet.has(k)) {
        stats.unitsSkippedOffBoard += 1;
        continue;
      }
      if (seenUnitHexes.has(k)) stats.unitsDuplicates += 1;
      seenUnitHexes.add(k);

      const def = UNIT_BY_ID.get(u.type);
      if (!def) {
        stats.unitsSkippedBadType += 1;
        continue;
      }
      if (u.side !== 'blue' && u.side !== 'red') {
        stats.unitsSkippedBadSide += 1;
        continue;
      }

      const quality = normalizeQuality(u.type, u.quality || 'green');
      unitsByHex.set(k, {
        id: nextUnitId++,
        side: u.side,
        type: u.type,
        quality,
        hp: unitMaxHp(u.type, quality),
        movePauseUntilTurn: Number.isFinite(Number(u.movePauseUntilTurn))
          ? Math.max(0, Math.trunc(Number(u.movePauseUntilTurn)))
          : 0,
      });
      stats.unitsPlaced += 1;
    }

    log(`Loaded scenario: ${name} (units=${stats.unitsPlaced}, terrain=${stats.terrainPlaced}).`);

    const skippedTotal =
      stats.terrainSkippedOffBoard +
      stats.terrainSkippedInvalidType +
      stats.unitsSkippedOffBoard +
      stats.unitsSkippedBadType +
      stats.unitsSkippedBadSide;
    const duplicateTotal = stats.terrainDuplicates + stats.unitsDuplicates;

    if (skippedTotal > 0 || duplicateTotal > 0) {
      log(
        `Scenario warnings: skipped=${skippedTotal} ` +
        `(terrain offboard ${stats.terrainSkippedOffBoard}, terrain invalid ${stats.terrainSkippedInvalidType}, ` +
        `units offboard ${stats.unitsSkippedOffBoard}, units bad type ${stats.unitsSkippedBadType}, ` +
        `units bad side ${stats.unitsSkippedBadSide}) · duplicates=${duplicateTotal} ` +
        `(terrain ${stats.terrainDuplicates}, units ${stats.unitsDuplicates}).`
      );
    }

    updateHud();
  }

  function clampInt(v, min, max, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  }

  function nonNegNumber(v, fallback = 0) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
  }

  function buildStateSnapshot() {
    const terrain = [];
    for (const h of board.active) {
      if (h.terrain && h.terrain !== 'clear') {
        terrain.push({ q: h.q, r: h.r, terrain: h.terrain });
      }
    }

    const units = [];
    for (const [hk, u] of unitsByHex) {
      const h = board.byKey.get(hk);
      if (!h) continue;
      units.push({
        id: u.id,
        q: h.q,
        r: h.r,
        side: u.side,
        type: u.type,
        quality: u.quality,
        hp: u.hp,
        movePauseUntilTurn: Number.isFinite(Number(u.movePauseUntilTurn))
          ? Math.max(0, Math.trunc(Number(u.movePauseUntilTurn)))
          : 0,
      });
    }
    units.sort((a, b) => (a.r - b.r) || (a.q - b.q) || (a.id - b.id));

    return {
      format: 'bannerfall-state-v1',
      game: GAME_NAME,
      build: BUILD_ID,
      exportedAt: new Date().toISOString(),
      state: {
        mode: state.mode,
        gameMode: state.gameMode,
        humanSide: state.humanSide,
        aiDifficulty: state.aiDifficulty,
        forwardAxis: state.forwardAxis,
        lineAdvanceDir: state.lineAdvanceDir,
        tool: state.tool,
        turn: state.turn,
        side: state.side,
        actsUsed: state.actsUsed,
        actedUnitIds: [...state.actedUnitIds],
        victoryMode: state.victoryMode,
        initialUP: { ...state.initialUP },
        capturedUP: { ...state.capturedUP },
        gameOver: state.gameOver,
        winner: state.winner,
        showCommand: state.showCommand,
        terrainTheme: state.terrainTheme,
        terrain,
        units,
      },
    };
  }

  function exportStateToFile() {
    try {
      const snap = buildStateSnapshot();
      const text = JSON.stringify(snap, null, 2);
      const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
      const fileName = `bannerfall-state-${stamp}.json`;

      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      log(`Exported state: ${fileName} (units=${snap.state.units.length}, terrain=${snap.state.terrain.length}).`);
      updateHud();
    } catch (err) {
      log(`Export failed: ${err && err.message ? err.message : String(err)}`);
      updateHud();
    }
  }

  function resolveImportPayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'Import failed: expected a JSON object.' };
    }

    if (Object.prototype.hasOwnProperty.call(raw, 'format')) {
      if (raw.format !== 'bannerfall-state-v1') {
        return { ok: false, error: `Import failed: unsupported format "${String(raw.format)}".` };
      }
      if (!raw.state || typeof raw.state !== 'object' || Array.isArray(raw.state)) {
        return { ok: false, error: 'Import failed: bannerfall-state-v1 requires a "state" object.' };
      }
      return { ok: true, payload: raw.state };
    }

    if (Object.prototype.hasOwnProperty.call(raw, 'state')) {
      if (!raw.state || typeof raw.state !== 'object' || Array.isArray(raw.state)) {
        return { ok: false, error: 'Import failed: "state" must be a JSON object.' };
      }
      return { ok: true, payload: raw.state };
    }

    const looksLikeState =
      Array.isArray(raw.units) ||
      Array.isArray(raw.terrain) ||
      Object.prototype.hasOwnProperty.call(raw, 'turn') ||
      Object.prototype.hasOwnProperty.call(raw, 'side') ||
      Object.prototype.hasOwnProperty.call(raw, 'mode') ||
      Object.prototype.hasOwnProperty.call(raw, 'victoryMode');

    if (!looksLikeState) {
      return { ok: false, error: 'Import failed: this JSON does not look like a Bannerfall state file.' };
    }

    return { ok: true, payload: raw };
  }

  function applyImportedState(raw, sourceLabel = 'import', options = {}) {
    const silent = !!options.silent;
    const skipAiKick = !!options.skipAiKick;
    stopAiLoop();
    stopMoveAnimation();
    stopActionPulse();
    closeRulesModal();
    resetDraftState({ keepBudget: true });

    const resolved = resolveImportPayload(raw);
    if (!resolved.ok) {
      log(resolved.error);
      updateHud();
      return;
    }
    const payload = resolved.payload;

    const report = {
      terrainApplied: 0,
      terrainSkippedOffBoard: 0,
      terrainSkippedInvalidType: 0,
      terrainDuplicates: 0,
      unitsPlaced: 0,
      unitsSkippedOffBoard: 0,
      unitsSkippedBadType: 0,
      unitsSkippedBadSide: 0,
      unitsDuplicates: 0,
      unitsHpAdjusted: 0,
      unitsIdRemapped: 0,
    };

    // Reset board without "load scenario" side effects.
    unitsByHex.clear();
    nextUnitId = 1;
    resetTerrain();
    clearSelection();

    // Terrain
    const seenTerrainHexes = new Set();
    const terrainArr = Array.isArray(payload.terrain) ? payload.terrain : [];
    for (const t of terrainArr) {
      if (!t || typeof t !== 'object') continue;
      const q = Math.trunc(Number(t.q));
      const r = Math.trunc(Number(t.r));
      const k = key(q, r);

      if (!board.activeSet.has(k)) {
        report.terrainSkippedOffBoard += 1;
        continue;
      }
      if (!TERRAIN_IDS.has(t.terrain)) {
        report.terrainSkippedInvalidType += 1;
        continue;
      }
      if (seenTerrainHexes.has(k)) report.terrainDuplicates += 1;
      seenTerrainHexes.add(k);

      const h = board.byKey.get(k);
      if (!h) {
        report.terrainSkippedOffBoard += 1;
        continue;
      }
      h.terrain = t.terrain;
      report.terrainApplied += 1;
    }

    // Units
    const seenUnitHexes = new Set();
    const usedIds = new Set();
    let maxAssignedId = 0;
    let nextAutoId = 1;

    function claimUnitId(rawId) {
      const n = Number(rawId);
      if (Number.isInteger(n) && n > 0 && !usedIds.has(n)) {
        usedIds.add(n);
        maxAssignedId = Math.max(maxAssignedId, n);
        return n;
      }
      report.unitsIdRemapped += 1;
      while (usedIds.has(nextAutoId)) nextAutoId += 1;
      const id = nextAutoId++;
      usedIds.add(id);
      maxAssignedId = Math.max(maxAssignedId, id);
      return id;
    }

    const unitArr = Array.isArray(payload.units) ? payload.units : [];
    for (const u of unitArr) {
      if (!u || typeof u !== 'object') continue;
      const q = Math.trunc(Number(u.q));
      const r = Math.trunc(Number(u.r));
      const k = key(q, r);

      if (!board.activeSet.has(k)) {
        report.unitsSkippedOffBoard += 1;
        continue;
      }
      if (seenUnitHexes.has(k)) report.unitsDuplicates += 1;
      seenUnitHexes.add(k);

      const def = UNIT_BY_ID.get(u.type);
      if (!def) {
        report.unitsSkippedBadType += 1;
        continue;
      }
      if (u.side !== 'blue' && u.side !== 'red') {
        report.unitsSkippedBadSide += 1;
        continue;
      }

      const quality = normalizeQuality(u.type, u.quality || 'green');
      const maxHp = unitMaxHp(u.type, quality);
      const rawHp = Number(u.hp);
      let hp = maxHp;
      if (Number.isFinite(rawHp)) {
        hp = Math.max(1, Math.min(maxHp, Math.trunc(rawHp)));
        if (hp !== rawHp) report.unitsHpAdjusted += 1;
      } else {
        report.unitsHpAdjusted += 1;
      }

      unitsByHex.set(k, {
        id: claimUnitId(u.id),
        side: u.side,
        type: u.type,
        quality,
        hp,
        movePauseUntilTurn: Number.isFinite(Number(u.movePauseUntilTurn))
          ? Math.max(0, Math.trunc(Number(u.movePauseUntilTurn)))
          : 0,
      });
      report.unitsPlaced += 1;
    }
    nextUnitId = Math.max(1, maxAssignedId + 1);

    // Restore state fields
    const restoreMode = (payload.mode === 'play') ? 'play' : 'edit';
    state.gameMode = (payload.gameMode === 'hvh' || payload.gameMode === 'hvai' || payload.gameMode === 'online')
      ? payload.gameMode
      : 'hvai';
    state.humanSide = normalizeSide(payload.humanSide);
    state.aiDifficulty = normalizeAiDifficulty(payload.aiDifficulty);
    state.forwardAxis = normalizeForwardAxis(payload.forwardAxis);
    state.lineAdvanceDir = normalizeLineAdvanceDirection(payload.lineAdvanceDir);
    state.mode = restoreMode;
    state.tool = (payload.tool === 'terrain') ? 'terrain' : 'units';

    state.turn = Math.max(1, clampInt(payload.turn, 1, 999999, 1));
    state.side = (payload.side === 'red') ? 'red' : 'blue';
    state.actsUsed = clampInt(payload.actsUsed, 0, ACT_LIMIT, 0);

    state.actedUnitIds = new Set();
    const actedIds = Array.isArray(payload.actedUnitIds) ? payload.actedUnitIds : [];
    for (const id of actedIds) {
      const n = Number(id);
      if (Number.isInteger(n) && usedIds.has(n)) state.actedUnitIds.add(n);
    }

    const victoryModes = new Set(['clear', 'decapitation', 'annihilation']);
    state.victoryMode = victoryModes.has(payload.victoryMode) ? payload.victoryMode : 'clear';
    elVictorySel.value = state.victoryMode;

    const nowBlue = totals('blue').up;
    const nowRed = totals('red').up;
    state.initialUP = {
      blue: nonNegNumber(payload?.initialUP?.blue, nowBlue),
      red: nonNegNumber(payload?.initialUP?.red, nowRed),
    };
    state.capturedUP = {
      blue: nonNegNumber(payload?.capturedUP?.blue, 0),
      red: nonNegNumber(payload?.capturedUP?.red, 0),
    };

    state.gameOver = !!payload.gameOver;
    state.winner = (payload.winner === 'blue' || payload.winner === 'red') ? payload.winner : null;
    if (!state.gameOver) state.winner = null;

    state.showCommand = (typeof payload.showCommand === 'boolean') ? payload.showCommand : true;
    if (typeof payload.terrainTheme === 'string' && TERRAIN_THEMES[payload.terrainTheme]) {
      state.terrainTheme = payload.terrainTheme;
    }

    if (state.mode === 'edit') {
      // Keep Edit mode deterministic and uncluttered after import.
      state.actsUsed = 0;
      state.actedUnitIds = new Set();
      state.gameOver = false;
      state.winner = null;
      clearSelection();
    }

    if (!silent) {
      state.lastImport = {
        source: String(sourceLabel || 'import'),
        at: Date.now(),
      };

      log(
        `Imported state: ${sourceLabel} ` +
        `(units=${report.unitsPlaced}, terrain=${report.terrainApplied}, mode=${state.mode.toUpperCase()}, ` +
        `turn=${state.turn}, side=${state.side.toUpperCase()}).`
      );
    }

    const skippedTotal =
      report.terrainSkippedOffBoard +
      report.terrainSkippedInvalidType +
      report.unitsSkippedOffBoard +
      report.unitsSkippedBadType +
      report.unitsSkippedBadSide;
    const duplicateTotal = report.terrainDuplicates + report.unitsDuplicates;
    const adjustedTotal = report.unitsHpAdjusted + report.unitsIdRemapped;

    if (!silent && (skippedTotal > 0 || duplicateTotal > 0 || adjustedTotal > 0)) {
      log(
        `Import warnings: skipped=${skippedTotal} ` +
        `(terrain offboard ${report.terrainSkippedOffBoard}, terrain invalid ${report.terrainSkippedInvalidType}, ` +
        `units offboard ${report.unitsSkippedOffBoard}, units bad type ${report.unitsSkippedBadType}, ` +
        `units bad side ${report.unitsSkippedBadSide}) · duplicates=${duplicateTotal} ` +
        `(terrain ${report.terrainDuplicates}, units ${report.unitsDuplicates}) · adjusted=${adjustedTotal} ` +
        `(hp ${report.unitsHpAdjusted}, ids ${report.unitsIdRemapped}).`
      );
    }

    updateHud();
    if (!skipAiKick) maybeStartAiTurn();
  }

  function importStateFromText(text, sourceLabel = 'import') {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      log(`Import failed: invalid JSON (${err && err.message ? err.message : String(err)}).`);
      updateHud();
      return;
    }
    applyImportedState(parsed, sourceLabel);
  }

  function importStateFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      importStateFromText(String(reader.result || ''), file.name || 'import');
    };
    reader.onerror = () => {
      log('Import failed: could not read file.');
      updateHud();
    };
    reader.readAsText(file);
  }

  // --- Turn handling
  function endTurn() {
    if (state.mode !== 'play') return;
    if (state.gameOver) return;

    stopAiLoop();

    state.side = (state.side === 'blue') ? 'red' : 'blue';
    if (state.side === 'blue') state.turn += 1;

    state.actsUsed = 0;
    state.actedUnitIds = new Set();

    clearSelection();

    log(`Turn ${state.turn}: ${state.side.toUpperCase()}.`);
    updateHud();
    maybeStartAiTurn();
  }

  function maybeAutoEndTurnAfterAction() {
    if (state.mode !== 'play') return false;
    if (state.gameOver) return false;
    if (isAiTurnActive()) return false;
    if (state.selectedKey) return false;
    if (state.actsUsed < ACT_LIMIT) return false;

    log(`Actions ${ACT_LIMIT}/${ACT_LIMIT} spent. Auto-ending turn.`);
    endTurn();
    return true;
  }

  // --- Play interaction
  function selectUnit(hexKey) {
    const u = unitsByHex.get(hexKey);
    if (!u) return;

    if (!unitCanActivate(u, hexKey)) return;

    const inCmd = unitIgnoresCommand(u) ? true : inCommandAt(hexKey, u.side);

    state.selectedKey = hexKey;
    state.act = {
      unitId: u.id,
      committed: false,
      moved: false,
      attacked: false,
      healed: false,
      inCommandStart: inCmd,
      moveSpent: 0,
      postAttackWithdrawOnly: false,
    };

    // Precompute targets
    state._moveTargets = computeMoveTargets(hexKey, u, state.act);
    state._attackTargets = computeAttackTargets(hexKey, u);
    state._healTargets = computeHealTargets(hexKey, u);

    const def = UNIT_BY_ID.get(u.type);
    const engaged = isEngaged(hexKey, u.side);
    const notes = [];
    const movePaused = unitMoveIsPausedThisTurn(u);

    if (movePaused) {
      notes.push(`Terrain fatigue: cannot move this turn (ready again on turn ${u.movePauseUntilTurn + 1}).`);
    } else if (engaged) {
      if (u.type === 'skr') notes.push('Engaged: SKR may disengage 1 hex.');
      else if (u.type === 'run') notes.push('Engaged: RUN may disengage 1 hex.');
      else if (u.quality === 'veteran') notes.push('Engaged: Veteran may withdraw 1 hex.');
      else notes.push('Engaged: cannot move.');
    } else if (!unitIgnoresCommand(u) && u.quality === 'regular' && !inCmd) {
      notes.push('Out of command: cannot move (can attack).');
    }
    if (u.type === 'iat') {
      const healCount = state._healTargets ? state._healTargets.size : 0;
      if (healCount > 0) notes.push(`Medic can heal ${healCount} adjacent unit(s).`);
      else notes.push('Medic has no adjacent wounded ally to heal.');
    }
    if (u.type === 'arc' || u.type === 'skr') {
      const curHex = board.byKey.get(hexKey);
      if (curHex && curHex.terrain === 'woods') {
        if (hasAdjacentTerrain(hexKey, 'clear')) {
          notes.push('Tree-line: ranged attacks are enabled from this woods hex.');
        } else {
          notes.push('Deep woods: ranged attacks are disabled until on a woods hex adjacent to clear.');
        }
      } else if (curHex && curHex.terrain === 'hills') {
        notes.push('Hilltop: ranged attacks gain +1 die (range unchanged).');
      }
    }

    log(`Selected ${u.side.toUpperCase()} ${def.abbrev}.${notes.length ? ' ' + notes.join(' ') : ''}`);
    updateHud();
  }

  function moveSelectedTo(destKey) {
    const fromKey = state.selectedKey;
    if (!fromKey || !state.act) return;

    const u = unitsByHex.get(fromKey);
    if (!u) return;

    const isPostAttackWithdraw = !!state.act.postAttackWithdrawOnly;

    if (!isPostAttackWithdraw && (state.act.moved || state.act.attacked)) {
      log('Illegal move (already acted).');
      return;
    }

    if (!state._moveTargets || !state._moveTargets.has(destKey)) {
      log('Illegal move.');
      return;
    }

    // Commit activation on the FIRST real action.
    if (!state.act.committed) {
      consumeActivation(u.id);
      state.act.committed = true;
    }

    const stepCost = movementPathCost(fromKey, destKey, u);
    if (Number.isFinite(stepCost) && stepCost > 0) {
      state.act.moveSpent = (state.act.moveSpent || 0) + stepCost;
    }
    const pathKeys = movementPathKeys(fromKey, destKey, u);

    unitsByHex.delete(fromKey);
    unitsByHex.set(destKey, u);
    state.selectedKey = destKey;
    state.act.moved = true;
    const pauseTerrainId = markMovementPauseFromPathIfNeeded(u, pathKeys);
    startMoveAnimation(pathKeys, u, isAiControlledSide(u.side));
    startActionPulse({
      type: 'move',
      fromKey,
      toKey: destKey,
      durationMs: ACTION_PULSE_MOVE_MS,
    });

    if (isPostAttackWithdraw) {
      log(`Veteran CAV disengaged to ${destKey}.`);
      clearSelection();
      if (!maybeAutoEndTurnAfterAction()) updateHud();
      return;
    }

    if (u.type === 'iat') {
      log(`Medic moved to ${destKey}.`);
      clearSelection();
      if (!maybeAutoEndTurnAfterAction()) updateHud();
      return;
    }

    if (pauseTerrainId) {
      const terrainName = terrainLabel(pauseTerrainId);
      log(`Moved to ${destKey}. Terrain friction: ${UNIT_BY_ID.get(u.type)?.abbrev || u.type} must pause movement on turn ${u.movePauseUntilTurn} after entering ${terrainName}.`);
    } else {
      log(`Moved to ${destKey}.`);
    }

    // After moving, you may make at most ONE attack (same activation).
    state._moveTargets = null;
    state._attackTargets = computeAttackTargets(destKey, u);
    state._healTargets = computeHealTargets(destKey, u);
    if (!state._attackTargets || state._attackTargets.size === 0) {
      clearSelection();
      if (!maybeAutoEndTurnAfterAction()) updateHud();
      return;
    }

    updateHud();
  }

  function healFromSelection(targetKey) {
    const sourceKey = state.selectedKey;
    if (!sourceKey || !state.act) return;

    const src = unitsByHex.get(sourceKey);
    if (!src || src.type !== 'iat') return;
    if (state.act.committed || state.act.moved || state.act.attacked || state.act.healed) {
      log('Healing not available (already acted).');
      return;
    }
    if (!state._healTargets || !state._healTargets.has(targetKey)) {
      log('No valid heal target there.');
      return;
    }

    const target = unitsByHex.get(targetKey);
    if (!target || target.side !== src.side) {
      log('Invalid heal target.');
      return;
    }

    const maxHp = unitMaxHp(target.type, target.quality);
    if (target.hp >= maxHp) {
      log('Target is already at full HP.');
      return;
    }

    consumeActivation(src.id);
    state.act.committed = true;
    state.act.healed = true;
    target.hp = Math.min(maxHp, target.hp + 1);
    const tdef = UNIT_BY_ID.get(target.type);

    log(`Medic restored 1 HP to ${target.side.toUpperCase()} ${tdef ? tdef.abbrev : target.type} (${target.hp}/${maxHp}).`);
    clearSelection();
    if (!maybeAutoEndTurnAfterAction()) updateHud();
  }

  function attackFromSelection(targetKey) {
    const attackerKey = state.selectedKey;
    if (!attackerKey || !state.act) return;

    const atk = unitsByHex.get(attackerKey);
    if (!atk) return;

    if (state.act.attacked) {
      log('Illegal attack (already attacked).');
      return;
    }

    // Validate target exists and is enemy.
    const enemy = unitsByHex.get(targetKey);
    if (!enemy || enemy.side === atk.side) {
      log('Illegal attack target.');
      return;
    }

    if (!state._attackTargets || !state._attackTargets.has(targetKey)) {
      log('Illegal attack.');
      return;
    }

    // Commit activation on the FIRST real action.
    if (!state.act.committed) {
      consumeActivation(atk.id);
      state.act.committed = true;
    }

    startActionPulse({
      type: 'attack',
      fromKey: attackerKey,
      toKey: targetKey,
      durationMs: ACTION_PULSE_ATTACK_MS,
    });
    resolveAttack(attackerKey, targetKey);

    state.act.attacked = true;

    const afterAtk = unitsByHex.get(attackerKey);
    if (afterAtk) {
      const withdrawTargets = veteranCavPostAttackWithdrawTargets(attackerKey, afterAtk, state.act);
      if (withdrawTargets.size > 0) {
        state.act.postAttackWithdrawOnly = true;
        state._moveTargets = withdrawTargets;
        state._attackTargets = new Set();
        state._healTargets = new Set();
        log('Veteran CAV may disengage: choose a withdrawal hex or click selected unit to end activation.');
        updateHud();
        return;
      }
    }

    // End activation after attack.
    clearSelection();
    if (!maybeAutoEndTurnAfterAction()) updateHud();
  }

  function passSelected() {
    if (state.mode !== 'play') return;
    if (!state.selectedKey || !state.act) return;

    const u = unitsByHex.get(state.selectedKey);
    if (!u) return;

    if (state.act.committed) {
      log('Pass not available (already committed).');
      return;
    }

    consumeActivation(u.id);
    state.act.committed = true;
    log(`Pass: ${u.side.toUpperCase()} ${UNIT_BY_ID.get(u.type).abbrev}.`);

    clearSelection();
    if (!maybeAutoEndTurnAfterAction()) updateHud();
  }

  function clickPlay(hexKey) {
    const clickedUnit = unitsByHex.get(hexKey);

    // If nothing selected: try to select.
    if (!state.selectedKey) {
      if (state.actsUsed >= ACT_LIMIT && maybeAutoEndTurnAfterAction()) return;
      if (clickedUnit) {
        const reason = activationBlockReason(clickedUnit, hexKey);
        if (reason) {
          log(reason);
          updateHud();
          return;
        }
        if (unitCanActivate(clickedUnit, hexKey)) selectUnit(hexKey);
      }
      return;
    }

    const selKey = state.selectedKey;
    const selUnit = unitsByHex.get(selKey);
    if (!selUnit) {
      clearSelection();
      updateHud();
      return;
    }

    // Clicking the selected hex toggles deselect.
    if (hexKey === selKey) {
      clearSelection();
      log('Deselected.');
      if (!maybeAutoEndTurnAfterAction()) updateHud();
      return;
    }

    // Attack
    if (clickedUnit && clickedUnit.side !== selUnit.side && state._attackTargets?.has(hexKey)) {
      attackFromSelection(hexKey);
      return;
    }

    // Move
    if (!clickedUnit && state._moveTargets?.has(hexKey)) {
      moveSelectedTo(hexKey);
      return;
    }

    // Heal (Medic support unit)
    if (clickedUnit && clickedUnit.side === selUnit.side && state._healTargets?.has(hexKey)) {
      healFromSelection(hexKey);
      return;
    }

    // Switch selection to another friendly (forfeits any optional post-move attack)
    if (clickedUnit && clickedUnit.side === state.side) {
      clearSelection();
      if (maybeAutoEndTurnAfterAction()) return;
      const reason = activationBlockReason(clickedUnit, hexKey);
      if (reason) {
        log(reason);
        updateHud();
        return;
      }
      if (unitCanActivate(clickedUnit, hexKey)) selectUnit(hexKey);
      return;
    }
  }

  // --- Events
  elCanvas.addEventListener('mousemove', (e) => {
    const rect = elCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const h = pickHex(x, y);
    state._hoverKey = h ? h.k : null;
    draw();
  });

  elCanvas.addEventListener('mouseleave', () => {
    state._hoverKey = null;
    draw();
  });

  elCanvas.addEventListener('click', (e) => {
    const rect = elCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const h = pickHex(x, y);
    if (!h) return;

    if (state.mode === 'edit') {
      if (onlineModeActive() && net.connected && !net.isHost) {
        log('Online: host controls setup and mode.');
        updateHud();
        return;
      }
      if (state.tool === 'terrain') paintTerrain(h.k);
      else placeOrReplaceUnit(h.k);
    } else {
      if (onlineModeActive()) {
        if (forwardOnlineAction({ type: 'click', hexKey: h.k })) return;
      }
      if (isAiTurnActive()) return;
      clickPlay(h.k);
    }
  });

  // Keyboard: P = pass, L = line advance (with selected INF)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elRulesModal && elRulesModal.classList.contains('open')) {
        e.preventDefault();
        closeRulesModal();
        return;
      }
    }

    if (e.key === 'p' || e.key === 'P') {
      if (state.mode === 'play' && state.selectedKey && !isAiTurnActive()) {
        e.preventDefault();
        if (onlineModeActive() && forwardOnlineAction({ type: 'pass' })) return;
        passSelected();
      }
    }

    if (e.key === 'l' || e.key === 'L') {
      if (state.mode === 'play' && !isAiTurnActive()) {
        e.preventDefault();
        const advanceDir = selectedLineAdvanceDirection();
        if (onlineModeActive() && forwardOnlineAction({ type: 'line_advance', advanceDir })) return;
        lineAdvanceFromSelection(advanceDir);
      }
    }

    // Toggle command radius overlay
    if (e.key === 'c' || e.key === 'C') {
      if (state.mode === 'play') {
        state.showCommand = !state.showCommand;
        log(`Command radius: ${state.showCommand ? 'ON' : 'OFF'}.`);
        updateHud();
      }
    }
    // Toggle terrain palette (visual only)
    if (e.key === 't' || e.key === 'T') {
      const cur = state.terrainTheme || 'vivid';
      const i = TERRAIN_THEME_ORDER.indexOf(cur);
      state.terrainTheme = TERRAIN_THEME_ORDER[(i + 1) % TERRAIN_THEME_ORDER.length];
      log(`Terrain palette: ${state.terrainTheme.toUpperCase()}.`);
      updateHud();
    }
  });

  window.addEventListener('resize', () => {
    resize();
    scheduleCombatRailScrollReset();
  });
  window.addEventListener('load', scheduleCombatRailScrollReset);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleCombatRailScrollReset();
  });

  elModeBtn.addEventListener('click', () => {
    if (onlineModeActive() && net.connected && !net.isHost) {
      log('Online: host controls setup and mode.');
      updateHud();
      return;
    }
    if (state.mode === 'edit') enterPlay();
    else enterEdit();
  });

  if (elOnlineHostBtn) {
    elOnlineHostBtn.addEventListener('click', startOnlineHost);
  }
  if (elOnlineJoinBtn) {
    elOnlineJoinBtn.addEventListener('click', startOnlineJoin);
  }
  if (elOnlineLeaveBtn) {
    elOnlineLeaveBtn.addEventListener('click', () => {
      onlineLeaveSession('Online: left session.');
    });
  }
  if (elOnlineJoinCode) {
    elOnlineJoinCode.addEventListener('input', () => {
      const normalized = normalizeOnlineCode(elOnlineJoinCode.value);
      if (elOnlineJoinCode.value !== normalized) {
        elOnlineJoinCode.value = normalized;
      }
      updateHud();
    });
    elOnlineJoinCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        startOnlineJoin();
      }
    });
  }

  if (elRulesOpenBtn) {
    elRulesOpenBtn.addEventListener('click', () => openRulesModal());
  }
  if (elRulesCloseBtn) {
    elRulesCloseBtn.addEventListener('click', closeRulesModal);
  }
  if (elRulesModal) {
    elRulesModal.addEventListener('click', (e) => {
      if (e.target === elRulesModal) closeRulesModal();
    });
  }

  if (elGameModeSel) {
    elGameModeSel.addEventListener('change', () => {
      const rawMode = elGameModeSel.value;
      const nextMode = (rawMode === 'hvai' || rawMode === 'online') ? rawMode : 'hvh';
      if (nextMode === state.gameMode) return;

      if (state.gameMode === 'online' && nextMode !== 'online') {
        onlineLeaveSession('Online: idle.');
      }

      state.gameMode = nextMode;
      if (nextMode === 'hvai') {
        log(`Game mode: Human vs AI. You are ${state.humanSide.toUpperCase()}, ${aiSide().toUpperCase()} is AI (${aiDifficultyLabel()} difficulty). Blue goes first.`);
      } else if (nextMode === 'online') {
        stopAiLoop();
        log('Game mode: Online (Host = Blue, Guest = Red). First side is randomized when battle starts.');
      } else {
        stopAiLoop();
        log('Game mode: Human vs Human.');
      }
      updateHud();
      maybeStartAiTurn();
    });
  }

  if (elPlayerSideSel) {
    elPlayerSideSel.addEventListener('change', () => {
      const nextSide = normalizeSide(elPlayerSideSel.value);
      if (nextSide === state.humanSide) return;
      state.humanSide = nextSide;
      log(`Player side set to ${state.humanSide.toUpperCase()}. ${aiSide().toUpperCase()} is AI. Blue still acts first.`);
      updateHud();
      maybeStartAiTurn();
    });
  }

  if (elAiDifficultySel) {
    elAiDifficultySel.addEventListener('change', () => {
      const next = normalizeAiDifficulty(elAiDifficultySel.value);
      if (next === state.aiDifficulty) return;
      state.aiDifficulty = next;
      log(`AI difficulty set to ${aiDifficultyLabel()}${state.gameMode === 'hvai' ? '.' : ' (will apply in Human vs AI mode).'}`);
      updateHud();
    });
  }

  if (elForwardAxisSel) {
    elForwardAxisSel.addEventListener('change', () => {
      const nextAxis = normalizeForwardAxis(elForwardAxisSel.value);
      if (nextAxis === state.forwardAxis) return;
      state.forwardAxis = nextAxis;
      clearSelection();
      log(`Advance axis: ${forwardAxisLabel(nextAxis)}.`);
      updateHud();
    });
  }

  elToolUnits.addEventListener('click', () => {
    if (onlineModeActive() && net.connected && !net.isHost) {
      log('Online: host controls setup and mode.');
      updateHud();
      return;
    }
    if (state.mode !== 'edit') {
      enterEdit();
    }
    state.tool = 'units';
    updateHud();
  });
  elToolTerrain.addEventListener('click', () => {
    if (onlineModeActive() && net.connected && !net.isHost) {
      log('Online: host controls setup and mode.');
      updateHud();
      return;
    }
    if (state.mode !== 'edit') {
      enterEdit();
    }
    if (state.draft.active) {
      log('Custom draft locks terrain editing.');
      updateHud();
      return;
    }
    state.tool = 'terrain';
    updateHud();
  });

  elSideBlue.addEventListener('click', () => {
    if (state.draft.active) {
      log(`Custom draft locks side to ${state.draft.side.toUpperCase()} this turn.`);
      updateHud();
      return;
    }
    state.editSide = 'blue';
    updateHud();
  });
  elSideRed.addEventListener('click', () => {
    if (state.draft.active) {
      log(`Custom draft locks side to ${state.draft.side.toUpperCase()} this turn.`);
      updateHud();
      return;
    }
    state.editSide = 'red';
    updateHud();
  });

  elTypeBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    state.editType = btn.dataset.type;
    if (state.editType === 'iat') state.editQuality = 'regular';
    state.editErase = false;
    updateHud();
  });

  elEraseBtn.addEventListener('click', () => { state.editErase = !state.editErase; updateHud(); });

  function setEditQualitySafe(nextQuality) {
    if (state.editType === 'iat') {
      state.editQuality = 'regular';
      updateHud();
      return;
    }
    state.editQuality = nextQuality;
    updateHud();
  }
  elQualityGreen.addEventListener('click', () => { setEditQualitySafe('green'); });
  elQualityRegular.addEventListener('click', () => { setEditQualitySafe('regular'); });
  elQualityVeteran.addEventListener('click', () => { setEditQualitySafe('veteran'); });

  elTerrainBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-terrain]');
    if (!btn) return;
    state.editTerrain = btn.dataset.terrain;
    updateHud();
  });

  elVictorySel.addEventListener('change', () => {
    if (state.mode === 'play') {
      elVictorySel.value = state.victoryMode;
      log('Victory condition is locked once battle starts. Use Back to Setup to change it.');
      updateHud();
      return;
    }
    state.victoryMode = elVictorySel.value;
    updateHud();
  });

  elEndTurnBtn.addEventListener('click', () => {
    if (onlineModeActive() && forwardOnlineAction({ type: 'end_turn' })) return;
    endTurn();
  });
  if (elLineAdvanceDirSel) {
    elLineAdvanceDirSel.addEventListener('change', () => {
      const next = normalizeLineAdvanceDirection(elLineAdvanceDirSel.value);
      if (!next) return;
      state.lineAdvanceDir = next;
      updateHud();
    });
  }
  if (elLineAdvanceBtn) {
    const setLineAdvancePreviewHover = (isHovering) => {
      const next = !!isHovering;
      if (state.lineAdvancePreviewHover === next) return;
      state.lineAdvancePreviewHover = next;
      draw();
    };
    elLineAdvanceBtn.addEventListener('mouseenter', () => setLineAdvancePreviewHover(true));
    elLineAdvanceBtn.addEventListener('mouseleave', () => setLineAdvancePreviewHover(false));
    elLineAdvanceBtn.addEventListener('focus', () => setLineAdvancePreviewHover(true));
    elLineAdvanceBtn.addEventListener('blur', () => setLineAdvancePreviewHover(false));
    elLineAdvanceBtn.addEventListener('click', () => {
      const advanceDir = selectedLineAdvanceDirection();
      if (onlineModeActive() && forwardOnlineAction({ type: 'line_advance', advanceDir })) return;
      lineAdvanceFromSelection(advanceDir);
    });
  }

  if (elScenarioSel) {
    elScenarioSel.addEventListener('change', () => {
      const scenarioName = elScenarioSel.value;
      if (!scenarioName || !SCENARIOS[scenarioName]) return;
      const wasPlay = state.mode === 'play';
      loadScenario(scenarioName);
      if (wasPlay) enterPlay();
    });
  }

  if (elDraftModeSel) {
    elDraftModeSel.addEventListener('change', () => {
      elDraftModeSel.value = normalizeDraftMode(elDraftModeSel.value);
      updateHud();
    });
  }

  if (elDraftBudgetInput) {
    elDraftBudgetInput.addEventListener('change', () => {
      elDraftBudgetInput.value = String(parseDraftBudget(elDraftBudgetInput.value));
      updateHud();
    });
  }

  if (elStartDraftBtn) {
    elStartDraftBtn.addEventListener('click', startCustomDraftSetup);
  }

  if (elDraftDoneBtn) {
    elDraftDoneBtn.addEventListener('click', () => {
      if (!state.draft.active) return;
      finishDraftForCurrentSide(true);
    });
  }

  if (elExportStateBtn) {
    elExportStateBtn.addEventListener('click', exportStateToFile);
  }

  if (elImportStateBtn && elStateFileInput) {
    elImportStateBtn.addEventListener('click', () => {
      elStateFileInput.value = '';
      elStateFileInput.click();
    });

    elStateFileInput.addEventListener('change', (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      importStateFromFile(file);
      e.target.value = '';
    });
  }

  for (const filterEl of [elScenarioGroupSel, elScenarioLessonSel, elScenarioSizeSel, elScenarioTerrainSel]) {
    if (!filterEl) continue;
    filterEl.addEventListener('change', () => {
      populateScenarioSelect();
      updateHud();
    });
  }

  // --- Populate scenario & victory dropdowns
  function populateFilterSelect(el, options) {
    if (!el) return;
    const prev = el.value;
    el.innerHTML = '';
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.label;
      el.appendChild(opt);
    }
    if (prev && [...el.options].some(o => o.value === prev)) el.value = prev;
    else el.value = 'all';
  }

  function populateScenarioFilters() {
    populateFilterSelect(elScenarioGroupSel, SCENARIO_FILTER_OPTIONS.group);
    populateFilterSelect(elScenarioLessonSel, SCENARIO_FILTER_OPTIONS.lesson);
    populateFilterSelect(elScenarioSizeSel, SCENARIO_FILTER_OPTIONS.size);
    populateFilterSelect(elScenarioTerrainSel, SCENARIO_FILTER_OPTIONS.terrain);
  }

  function readFilterValue(el, key) {
    const v = el?.value || 'all';
    return SCENARIO_FILTER_IDS[key].has(v) ? v : 'all';
  }

  function readScenarioFilters() {
    return {
      group: readFilterValue(elScenarioGroupSel, 'group'),
      lesson: readFilterValue(elScenarioLessonSel, 'lesson'),
      size: readFilterValue(elScenarioSizeSel, 'size'),
      terrain: readFilterValue(elScenarioTerrainSel, 'terrain'),
    };
  }

  function scenarioGroupTag(name) {
    if (name.startsWith('Demo ')) return 'demo';
    if (name.startsWith('Grand ')) return 'grand';
    if (name.startsWith('Terrain ')) return 'terrain';
    if (name.startsWith('Berserker ')) return 'berserker';
    return 'other';
  }

  function scenarioSizeTag(totalUnits) {
    if (totalUnits <= 20) return 'small';
    if (totalUnits <= 50) return 'medium';
    return 'large';
  }

  function scenarioTerrainTag(sc) {
    const tags = new Set();
    for (const t of (sc.terrain || [])) {
      if (TERRAIN_IDS.has(t.terrain) && t.terrain !== 'clear') tags.add(t.terrain);
    }
    if (tags.size === 0) return 'open';
    if (tags.size === 1) return [...tags][0];
    return 'mixed';
  }

  function scenarioLessonTag(name, group, terrainTag) {
    const n = name.toLowerCase();
    if (group === 'terrain' || terrainTag === 'mixed' || (terrainTag !== 'open' && /terrain|marsh|woods|ridge|broken ground/.test(n))) {
      return 'terrain';
    }
    if (/river|ford/.test(n)) return 'river';
    if (/corridor|pass/.test(n)) return 'corridor';
    if (/screen|skirmisher/.test(n)) return 'screen';
    if (/envelopment|encircle|crescent|flank|wedge|wide wings|columns/.test(n)) return 'envelopment';
    if (/center|push/.test(n)) return 'center';
    if (/line|checkerboard/.test(n)) return 'lines';
    return 'general';
  }

  function scenarioMeta(name) {
    const sc = SCENARIOS[name] || { terrain: [], units: [] };
    const totalUnits = Array.isArray(sc.units) ? sc.units.length : 0;
    const group = scenarioGroupTag(name);
    const terrain = scenarioTerrainTag(sc);
    const size = scenarioSizeTag(totalUnits);
    const lesson = scenarioLessonTag(name, group, terrain);
    return { group, lesson, size, terrain, totalUnits };
  }

  function scenarioMatchesFilters(meta, filters) {
    if (filters.group !== 'all' && meta.group !== filters.group) return false;
    if (filters.lesson !== 'all' && meta.lesson !== filters.lesson) return false;
    if (filters.size !== 'all' && meta.size !== filters.size) return false;
    if (filters.terrain !== 'all' && meta.terrain !== filters.terrain) return false;
    return true;
  }

  function scenarioSectionTag(name) {
    if (name === RANDOM_START_SCENARIO_NAME || name === 'Empty (Island)') return 'quick';
    if (name.startsWith('Grand ')) return 'mirrored';
    if (HISTORICAL_SCENARIO_INDEX.has(name)) return 'historical';
    if (name.startsWith('Berserker ') || name.startsWith('Terrain ')) return 'nonMirrored';
    if (name.startsWith('Demo ')) return 'demo';
    return 'other';
  }

  function scenarioNaturalCompare(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
  }

  function sortScenarioNamesForSection(section, names) {
    const list = Array.isArray(names) ? names.slice() : [];
    if (section === 'quick') {
      const quickPriority = new Map([
        [RANDOM_START_SCENARIO_NAME, 0],
        ['Empty (Island)', 1],
      ]);
      return list.sort((a, b) => {
        const pa = quickPriority.has(a) ? quickPriority.get(a) : 99;
        const pb = quickPriority.has(b) ? quickPriority.get(b) : 99;
        if (pa !== pb) return pa - pb;
        return scenarioNaturalCompare(a, b);
      });
    }
    if (section === 'historical') {
      return list.sort((a, b) => {
        const pa = HISTORICAL_SCENARIO_INDEX.has(a) ? HISTORICAL_SCENARIO_INDEX.get(a) : 999;
        const pb = HISTORICAL_SCENARIO_INDEX.has(b) ? HISTORICAL_SCENARIO_INDEX.get(b) : 999;
        if (pa !== pb) return pa - pb;
        return scenarioNaturalCompare(a, b);
      });
    }
    if (section === 'nonMirrored') {
      const rank = (name) => {
        if (name.startsWith('Berserker ')) return 0;
        if (name.startsWith('Terrain ')) return 1;
        return 2;
      };
      return list.sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return scenarioNaturalCompare(a, b);
      });
    }
    return list.sort((a, b) => scenarioNaturalCompare(a, b));
  }

  function populateScenarioSelect() {
    const prev = elScenarioSel.value;
    const filters = readScenarioFilters();
    elScenarioSel.innerHTML = '';

    const namesBySection = new Map(SCENARIO_SECTION_ORDER.map((section) => [section, []]));
    for (const name of Object.keys(SCENARIOS)) {
      const meta = scenarioMeta(name);
      if (!scenarioMatchesFilters(meta, filters)) continue;
      const section = scenarioSectionTag(name);
      if (!namesBySection.has(section)) namesBySection.set(section, []);
      namesBySection.get(section).push({ name, meta });
    }

    let shown = 0;
    for (const section of SCENARIO_SECTION_ORDER) {
      const items = namesBySection.get(section) || [];
      if (items.length === 0) continue;

      const orderedNames = sortScenarioNamesForSection(
        section,
        items.map(item => item.name),
      );
      const metaByName = new Map(items.map(item => [item.name, item.meta]));
      const groupEl = document.createElement('optgroup');
      groupEl.label = SCENARIO_SECTION_LABEL[section] || section;

      for (const name of orderedNames) {
        const meta = metaByName.get(name) || scenarioMeta(name);
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        opt.title = `Group=${meta.group} · Lesson=${meta.lesson} · Size=${meta.size} · Map=${meta.terrain}`;
        groupEl.appendChild(opt);
        shown += 1;
      }

      elScenarioSel.appendChild(groupEl);
    }

    if (shown === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No scenarios match filters';
      opt.disabled = true;
      opt.selected = true;
      elScenarioSel.appendChild(opt);
      elScenarioSel.disabled = true;
      return;
    }

    elScenarioSel.disabled = false;

    if (prev && [...elScenarioSel.options].some(o => o.value === prev)) {
      elScenarioSel.value = prev;
      return;
    }

    if ([...elScenarioSel.options].some(o => o.value === 'Empty (Island)')) {
      elScenarioSel.value = 'Empty (Island)';
    } else {
      elScenarioSel.value = elScenarioSel.options[0].value;
    }
  }

  function populateVictorySelect() {
    elVictorySel.innerHTML = '';
    const modes = [
      { id: 'clear', label: 'Clear Victory (halve UP)' },
      { id: 'decapitation', label: 'Decapitation (kill all generals)' },
      { id: 'annihilation', label: 'Annihilation (kill all units)' },
    ];
    for (const m of modes) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      elVictorySel.appendChild(opt);
    }
    elVictorySel.value = 'clear';
    state.victoryMode = 'clear';
  }

  function boot() {
    resetDraftState({ keepBudget: false });
    populateScenarioFilters();
    populateVictorySelect();
    const randomScenario = installRandomStartupScenario();
    populateScenarioSelect();
    if (elDraftModeSel) elDraftModeSel.value = 'off';
    if (elDraftBudgetInput) elDraftBudgetInput.value = String(state.draft.budget);

    if ([...elScenarioSel.options].some(o => o.value === RANDOM_START_SCENARIO_NAME)) {
      elScenarioSel.value = RANDOM_START_SCENARIO_NAME;
    }

    loadScenario(RANDOM_START_SCENARIO_NAME);
    enterPlay();

    const biasLabel = (randomScenario.advantageSide === 'none')
      ? 'balanced terrain'
      : `${randomScenario.advantageSide} flank-terrain bias`;
    let matchupLabel = 'even forces';
    if (randomScenario.matchup === 'blue_advantage') matchupLabel = 'blue-advantaged forces';
    else if (randomScenario.matchup === 'red_advantage') matchupLabel = 'red-advantaged forces';
    else if (randomScenario.matchup === 'blue_elite_outnumbered') matchupLabel = 'blue elite outnumbered by red levy';
    else if (randomScenario.matchup === 'red_elite_outnumbered') matchupLabel = 'red elite outnumbered by blue levy';

    const doctrineLabel = `doctrine B:${randomScenario.blueDoctrine || 'balanced'} / R:${randomScenario.redDoctrine || 'balanced'}`;
    const formationLabelText =
      `formation B:${formationLabel(randomScenario.blueFormation || 'triplex')} / ` +
      `R:${formationLabel(randomScenario.redFormation || 'triplex')}`;
    const roleLabelText = `roles B:${randomScenario.blueRole || 'even'} / R:${randomScenario.redRole || 'even'}`;

    log(
      `Booted ${GAME_NAME}. Randomized startup loaded and battle started ` +
      `(${randomScenario.size} battle, ${matchupLabel}, ` +
      `B ${randomScenario.blueUnits} / R ${randomScenario.redUnits}, ` +
      `${doctrineLabel}, ${formationLabelText}, ${roleLabelText}, ` +
      `terrain=${randomScenario.terrain.length}, ` +
      `axis=${forwardAxisLabel(randomScenario.axis)}, ${biasLabel}).`
    );
    updateHud();
    resize();
    scheduleCombatRailScrollReset();
  }

  boot();
})();
