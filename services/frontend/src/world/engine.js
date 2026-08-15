import ASMap from "./map.js";
import AS_DATA from "../data.js";
const ASWorld = (() => {
  const M = ASMap,
    D = AS_DATA;
  const T = M.T;
  const ZONES = [
    { t: "VĂN PHÒNG 02 · OPEN OFFICE", x: 15, y: 11.4, in: 1 },
    { t: "MEETING ROOM", x: 39, y: 3.4, in: 1 },
    { t: "GAME CORNER", x: 41.5, y: 7.6, in: 1 },
    { t: "ATRIUM", x: 41.5, y: 11.6, in: 1 },
    { t: "MAIN LOBBY", x: 44.5, y: 23.6, in: 1 },
    { t: "SEATING AREA", x: 31, y: 12.6, in: 1 },
    { t: "IT HELPDESK", x: 51, y: 11.4, in: 1 },
    { t: "PANTRY", x: 56, y: 14.4, in: 1 },
    { t: "PHÒNG Y TẾ", x: 56, y: 19.4, in: 1 },
    { t: "PHÒNG ĐA NĂNG · GYM", x: 56, y: 23.4, in: 1 },
    { t: "SWIMMING POOL", x: 57, y: 1.4 },
    { t: "7-ELEVEN", x: 9.5, y: 23.4 },
    { t: "CÂY LỘC VỪNG SIUUU TO", x: 5.5, y: 22.6 },
    { t: "BASKETBALL", x: 6.5, y: 32.4 },
    { t: "BÃI XE Ô TÔ · 8 CHỖ", x: 17.5, y: 40.4 },
    { t: "BÃI XE Ô TÔ · 10 CHỖ", x: 54.5, y: 40.4 },
    { t: "CỬA CHÍNH", x: 44.5, y: 44.4 }
  ];
  const utc7Minutes = () => {
    const d = new Date();
    return ((d.getUTCHours() + 7) * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60) % 1440;
  };
  function findPath(sx, sy, tx, ty, blocked) {
    if (sx === tx && sy === ty) return [];
    const key = (x, y) => y * M.W + x;
    const prev = new Map();
    const q = [[sx, sy]];
    prev.set(key(sx, sy), null);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) {
        const out = [];
        let k = key(tx, ty);
        while (k != null && prev.get(k) != null) {
          out.unshift([k % M.W, k / M.W | 0]);
          k = prev.get(k);
        }
        return out;
      }
      for (const [dx, dy] of dirs) {
        const nx = x + dx,
          ny = y + dy,
          nk = key(nx, ny);
        if (!prev.has(nk) && M.walkable(nx, ny) && !(blocked && blocked(nx, ny))) {
          prev.set(nk, key(x, y));
          q.push([nx, ny]);
        }
      }
    }
    return null;
  }
  const inWater = (x, y) => M.g(x, y) === M.POOL;
  function nearestWalkable(x, y) {
    if (M.walkable(x, y)) return [x, y];
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (M.walkable(x + dx, y + dy)) return [x + dx, y + dy];
    return [x, y];
  }
  function nearestSpawn(x, y) {
    if (M.walkable(x, y) && M.g(x, y) !== M.POOL) return [x, y];
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (M.walkable(x + dx, y + dy) && M.g(x + dx, y + dy) !== M.POOL) return [x + dx, y + dy];
    return [x, y];
  }
  function losWalkable(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(Math.abs(dx), Math.abs(dy)) * 4;
    if (!n) return M.walkable(x0, y0);
    for (let i = 0; i <= n; i++) if (!M.walkable(Math.round(x0 + dx * i / n), Math.round(y0 + dy * i / n))) return false;
    return true;
  }
  function smoothPath(p) {
    if (!p || p.length < 3) return p;
    const out = [p[0]];
    let anchor = 0;
    for (let i = 2; i < p.length; i++) {
      if (!losWalkable(p[anchor][0], p[anchor][1], p[i][0], p[i][1])) { out.push(p[i - 1]); anchor = i - 1; }
    }
    out.push(p[p.length - 1]);
    return out;
  }
  function shadeHex(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g2 = Math.max(0, Math.min(255, (n >> 8 & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g2},${b})`;
  }
  function mixHex(a, b, k) {
    const A = parseInt(a.slice(1), 16),
      B = parseInt(b.slice(1), 16);
    const r = (A >> 16) + ((B >> 16) - (A >> 16)) * k | 0;
    const g2 = (A >> 8 & 255) + ((B >> 8 & 255) - (A >> 8 & 255)) * k | 0;
    const bl = (A & 255) + ((B & 255) - (A & 255)) * k | 0;
    return `rgb(${r},${g2},${bl})`;
  }
  function g5tones(base) {
    return {
      o: mixHex(base, "#1A2036", 0.66),
      d: mixHex(base, "#232840", 0.32),
      b: base,
      l: mixHex(base, "#FFE9A8", 0.26),
      h: mixHex(base, "#FFF6D8", 0.5)
    };
  }
  const PANTS = g5tones("#4A4440");
  const LEAF_COLORS = ["#63B04A", "#C9A04E", "#D98E5A", "#8CCB6D", "#E0A458", "#F2A6C6", "#F2D06B"];
  const BFLY_COLORS = ["#F2A6C6", "#F2D06B", "#F8F6EC"];
  const TILE_WATER = 2;
  const TILE_FLOWER = 4;
  const FLOWER_TILES = [];
  for (let fy = 0; fy < M.H; fy++) for (let fx2 = 0; fx2 < M.W; fx2++) if (M.g(fx2, fy) === TILE_FLOWER) FLOWER_TILES.push([fx2 * T + 8, fy * T + 8]);
  const DESK_GLINTS = [];
  const COFFEE_MACHINES = [];
  const DESK_BY_TILE = {};
  const ARCADE_PX = [];
  const SOFA_SEATS = {};
  const SHELVES = [];
  for (const fu of M.FURNITURE) {
    if (fu.kind === "desk") {
      const dg = { x: fu.x * T, y: fu.y * T, h: M.hash(fu.x * 11, fu.y * 17), on: false, boot: -1, _occ: false };
      DESK_GLINTS.push(dg);
      DESK_BY_TILE[fu.y * M.W + fu.x] = dg;
    } else if (fu.kind === "coffee") COFFEE_MACHINES.push({ x: fu.x * T, y: fu.y * T });
    else if (fu.kind === "arcade") ARCADE_PX.push(fu.x * T);
    else if (fu.kind === "sofa") SOFA_SEATS[(fu.y + 1) * M.W + fu.x] = { x: fu.x * T + 16, y: fu.y * T + 6 };
    else if (fu.kind === "shelf") SHELVES.push({ x: fu.x * T, y: fu.y * T });
  }
  const CUP_CREAM = "#F4F1E6";
  const CUP_BAND = "#6B3A12";
  const SNACK_COLORS = ["#D9514E", "#E59A3C", "#4D86C9", "#5FA86A"];
  const ARCADE_FLASH = ["#DFF6FF", "#FFE08A"];
  const BENCH_TILES = [[5, 29], [10, 35]];
  const STORE_COUNTER = { x: 8, y: 26 };
  const MED_TILE_X = 56;
  const MED_TILE_Y = 21;
  const MED_BED_X = 912;
  const MED_BED_Y = 328;
  const CAR_BAY_X = 368;
  const CAR_BAY_Y = 658;
  const CAR_ROAD_Y = 672;
  const CAR_IN_X = 752;
  const CAR_CC = "#2E4A78";
  const CAR_CO = shadeHex(CAR_CC, -70);
  const CAR_HL = shadeHex(CAR_CC, 28);
  const CAR_DK = shadeHex(CAR_CC, -22);
  const PETAL_A = "#F2A6C6";
  const PETAL_B = "#E8557A";
  const PETAL_FADE = "#DCA8C4";
  const DOORS = [];
  for (let dy = 0; dy < M.H; dy++) for (let dx = 0; dx < M.W; dx++) if (M.g(dx, dy) === 8) DOORS.push({ x: dx * T, y: dy * T, cx: dx * T + 8, cy: dy * T + 8, sr: dx % 2 === 1, o: 0, f: -1 });
  const DOOR_DARK = "#2A241C";
  const DOOR_FLOOR = "#54483A";
  const DOOR_EDGE = "#9A7E52";
  const NIGHT_LIGHTS = [[632, 246], [712, 246], [632, 298], [712, 298], [664, 436], [716, 436], [768, 436], [200, 546], [280, 546], [360, 546], [488, 498], [600, 498]];
  const NL_ROW_X = [-2, -4, -5, -4, -2];
  const NL_ROW_W = [4, 8, 10, 8, 4];
  const NL_FILL = "rgba(255,204,110,0.18)";
  const NL_CORE = "rgba(255,214,130,0.16)";
  const NL_POOL_GLOW = "rgba(191,232,255,0.22)";
  const VIG_STEPS = [0.05, 0.03, 0.02, 0.01];
  const FOOT_FRESH = "#A5A495";
  const FOOT_FADE = "#B59F80";
  const GLINT_CX = [5, 8, 8, 5];
  const GLINT_CY = [5, 5, 7, 7];
  const PULL_SEQ = [-1, -4, -6, -6];
  const BENCH_SEQ = [-1, -3, -5, -5, -3];
  const DB_SEQ = [-3, -1, 0, -1];
  const WEATHER = {
    clear: [0, 0, 0, 0],
    storm: [64, 74, 92, 0.26],
    warm: [255, 176, 92, 0.17],
    cool: [86, 128, 196, 0.2]
  };
  const CONFETTI_COLORS = ["#EC5E27", "#00B14F", "#0068FF", "#00C160", "#F5C518", "#7C5CE0", "#FF6FAE"];
  const OUTDOOR_TIDS = [0, 1, 4, 10, 14, 15, 16, 21];
  const CAT_C = "#6A6F7E";
  const CAT_O = "#383E52";
  const CAT_D = "#545A6C";
  const CAT_L = "#8A90A4";
  const CAT_W = "#F5F4EF";
  const CAT_EYE = "#9ED45C";
  const RAIN_COL = "rgba(96,126,172,0.6)";
  const RAIN_COL2 = "rgba(148,176,212,0.5)";
  const PUD_BASE = "#9CC6E8";
  const PUD_DK = "#5E82AC";
  const PUD_GL = "#F6FBFF";
  const RAIN_N = 120;
  const PUD_N = 6;
  let SH_MUL = 1;
  let SH_HW0 = 5;
  let SH_HW1 = 3;
  const CAT_NAPS = [];
  for (const fu of M.FURNITURE) {
    if (fu.kind === "sofa") CAT_NAPS.push({ x: fu.x, y: fu.y + 1, sx: fu.x * T + 16, sy: fu.y * T + 6 });
    else if (fu.kind === "planterbox") {
      const c4 = [[fu.x + 1, fu.y], [fu.x - 1, fu.y], [fu.x, fu.y + 1], [fu.x, fu.y - 1]];
      for (const [ex, ey] of c4) if (M.walkable(ex, ey) && M.g(ex, ey) !== M.POOL) CAT_NAPS.push({ x: ex, y: ey, sx: ex * T + 8, sy: ey * T + 8 });
    }
  }
  const CAT_BLOCKED = (x, y) => M.g(x, y) === M.POOL;
  function drawCat(ctx, c, frame, t) {
    const x = Math.round(c.px),
      y = Math.round(c.py);
    const s = c.faceLR === "left" ? -1 : 1;
    const f = (ox2, oy2, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(s > 0 ? x + ox2 : x - ox2 - w, y + oy2, w, h);
    };
    ctx.fillStyle = "rgba(38,28,14,0.16)";
    ctx.fillRect(x - SH_HW1 - 1, y + 4, SH_HW1 * 2 + 2, 2);
    const f2 = frame >> 1 & 1;
    if (c.state === "sleep") {
      const br = f2;
      f(-4, -2 - br, 8, 1, CAT_O);
      f(-5, -1 - br, 10, 3 + br, CAT_O);
      f(-4, -1 - br, 8, 2 + br, CAT_C);
      f(-3, -1 - br, 5, 1, CAT_L);
      f(-4, 1, 8, 1, CAT_D);
      f(2, 0, 2, 1, CAT_D);
      f(-3, 0, 1, 1, CAT_W);
      return;
    }
    if (c.state === "sit") {
      const tf = f2;
      f(-2, -6, 1, 1, CAT_O);
      f(1, -6, 1, 1, CAT_O);
      f(-2, -5, 4, 3, CAT_O);
      f(-1, -4, 2, 1, CAT_C);
      f(-1, -5, 2, 1, CAT_L);
      f(0, -4, 1, 1, CAT_EYE);
      f(-3, -2, 6, 6, CAT_O);
      f(-2, -1, 4, 4, CAT_C);
      f(-2, -1, 4, 1, CAT_L);
      f(-1, 1, 2, 2, CAT_W);
      f(-2, 3, 4, 1, CAT_D);
      f(3, 1 - tf, 2, 1, CAT_O);
      f(3 + tf, 2 - tf, 1, 2, CAT_O);
      return;
    }
    const lp = c.path.length ? f2 : 0;
    f(-6, -3, 1, 1, CAT_O);
    f(-5 - lp, -2, 2, 1, CAT_D);
    f(-4, -4, 8, 1, CAT_O);
    f(-5, -3, 10, 3, CAT_O);
    f(-4, -3, 8, 2, CAT_C);
    f(-3, -3, 6, 1, CAT_L);
    f(-4, -1, 8, 1, CAT_D);
    f(2, -6, 1, 1, CAT_O);
    f(4, -6, 1, 1, CAT_O);
    f(1, -5, 5, 3, CAT_O);
    f(2, -4, 3, 2, CAT_C);
    f(2, -5, 3, 1, CAT_L);
    f(4, -4, 1, 1, CAT_EYE);
    f(2, -2, 1, 1, CAT_W);
    f(-4 + lp, 0, 1, 4, CAT_O);
    f(-1, 0, 1, 4 - lp, CAT_O);
    f(1, 0, 1, 4 - (1 - lp), CAT_O);
    f(3 - lp, 0, 1, 4, CAT_O);
  }
  let _audioCtx = null;
  const ensureAudio = () => {
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (_audioCtx.state === "suspended") _audioCtx.resume();
    } catch {
      _audioCtx = null;
    }
    return _audioCtx;
  };
  function lerpC(a, b, k) {
    return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
  }
  function dayTint(m) {
    const night = [16, 22, 58],
      dusk = [242, 148, 64];
    let c, a;
    if (m < 300) {
      c = night;
      a = 0.4;
    } else if (m < 390) {
      const k = (m - 300) / 90;
      c = lerpC(night, dusk, k);
      a = 0.4 - 0.18 * k;
    } else if (m < 450) {
      const k = (m - 390) / 60;
      c = dusk;
      a = 0.22 * (1 - k);
    } else if (m < 1020) {
      c = [0, 0, 0];
      a = 0;
    } else if (m < 1110) {
      const k = (m - 1020) / 90;
      c = dusk;
      a = 0.24 * k;
    } else if (m < 1170) {
      const k = (m - 1110) / 60;
      c = lerpC(dusk, night, k);
      a = 0.24 + 0.16 * k;
    } else {
      c = night;
      a = 0.4;
    }
    return { r: c[0], g: c[1], b: c[2], a };
  }
  function drawFace(ctx, a, x, y, oy, frame, t) {
    const f = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const ink = "#2A2622";
    const mood = a.state === "down" || a.state === "reviving" ? "neutral" : a.mood || "neutral";
    const eo = a.dir === "left" ? -1 : a.dir === "right" ? 1 : 0;
    const lk = t !== undefined && !a.moving && (t + a._h * 1.3) % 8 < 0.5 ? a._h % 2 ? 1 : -1 : 0;
    const eoc = Math.max(-1, Math.min(1, eo + lk));
    const ey = y - 10 + oy;
    const lx = x - 2 + eoc,
      rx = x + 1 + eoc;
    if ((frame + a._h * 5) % (20 + a._h % 9) < 1) {
      f(lx, ey + 1, 2, 1, ink);
      f(rx, ey + 1, 2, 1, ink);
    } else if (mood === "happy" || mood === "celebrate") {
      f(lx, ey, 2, 1, ink);
      f(lx, ey + 1, 1, 1, ink);
      f(rx, ey, 2, 1, ink);
      f(rx + 1, ey + 1, 1, 1, ink);
    } else {
      f(lx, ey, 1, 2, ink);
      f(rx, ey, 1, 2, ink);
    }
    if (mood === "skeptical") f(x - 3 + eo, ey - 2, 3, 1, ink);else if (mood === "worried" || mood === "sad") {
      f(x - 3, ey - 2, 2, 1, ink);
      f(x + 1, ey - 2, 2, 1, ink);
    } else if (mood === "focused") {
      f(x - 3, ey - 1, 2, 1, ink);
      f(x + 1, ey - 1, 2, 1, ink);
    }
    const my = y - 7 + oy;
    if (mood === "happy" || mood === "celebrate") {
      f(x - 2, my, 1, 1, ink);
      f(x - 1, my + 1, 3, 1, ink);
      f(x + 2, my, 1, 1, ink);
    } else if (mood === "worried" || mood === "sad") {
      f(x - 1, my + 1, 3, 1, ink);
      f(x - 2, my, 1, 1, ink);
      f(x + 2, my, 1, 1, ink);
    } else if (mood === "idea") f(x - 1, my, 2, 2, ink);else if (mood === "talk") f(x - 1, my, 3, frame % 2 ? 2 : 1, ink);else f(x - 1, my, 2, 1, ink);
  }
  function drawProp(ctx, a, x, y, oy) {
    const f = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const role = a.def.agentRole,
      ink = "#2A2622";
    if (role === "orchestrator") {
      f(x - 5, y - 14 + oy, 10, 1, ink);
      f(x - 6, y - 12 + oy, 1, 3, ink);
      f(x + 5, y - 12 + oy, 1, 3, ink);
      f(x - 6, y - 8 + oy, 3, 1, ink);
      f(x + 5, y - 12 + oy, 1, 1, shadeHex(ink, 40));
    } else if (role === "research") {
      f(x + 6, y - 5 + oy, 4, 4, "#BFE6F2");
      f(x + 6, y - 5 + oy, 4, 1, ink);
      f(x + 6, y - 2 + oy, 4, 1, ink);
      f(x + 6, y - 5 + oy, 1, 4, ink);
      f(x + 9, y - 5 + oy, 1, 4, ink);
      f(x + 7, y - 4 + oy, 1, 1, "#FFFFFF");
      f(x + 9, y - 1 + oy, 2, 2, "#6B4A2F");
      f(x + 10, y + oy, 1, 1, shadeHex("#6B4A2F", -45));
    } else if (role === "analyst") {
      const eo = a.dir === "left" ? -1 : a.dir === "right" ? 1 : 0;
      f(x - 3 + eo, y - 11 + oy, 3, 1, "#3A3531");
      f(x - 3 + eo, y - 9 + oy, 3, 1, "#3A3531");
      f(x - 3 + eo, y - 11 + oy, 1, 3, "#3A3531");
      f(x - 1 + eo, y - 11 + oy, 1, 3, "#3A3531");
      f(x + 1 + eo, y - 11 + oy, 3, 1, "#3A3531");
      f(x + 1 + eo, y - 9 + oy, 3, 1, "#3A3531");
      f(x + 1 + eo, y - 11 + oy, 1, 3, "#3A3531");
      f(x + 3 + eo, y - 11 + oy, 1, 3, "#3A3531");
      f(x + eo, y - 10 + oy, 1, 1, "#3A3531");
    } else if (role === "critic") {
      f(x - 5, y - 6 + oy, 10, 1, "#DC2626");
      f(x - 5, y - 5 + oy, 2, 3, "#DC2626");
      f(x - 5, y - 6 + oy, 3, 1, shadeHex("#DC2626", 25));
      f(x + 4, y - 6 + oy, 1, 1, shadeHex("#DC2626", -50));
      f(x - 5, y - 3 + oy, 2, 1, shadeHex("#DC2626", -50));
    } else if (role === "creative") {
      f(x - 5, y - 15 + oy, 10, 2, "#E0457B");
      f(x + 3, y - 16 + oy, 2, 1, "#E0457B");
      f(x - 4, y - 15 + oy, 4, 1, shadeHex("#E0457B", 25));
      f(x - 5, y - 14 + oy, 10, 1, shadeHex("#E0457B", -30));
      f(x - 5, y - 15 + oy, 1, 1, shadeHex("#E0457B", -55));
      f(x + 4, y - 15 + oy, 1, 1, shadeHex("#E0457B", -55));
    } else if (role === "reporter") {
      f(x + 5, y - 4 + oy, 5, 7, "#FFFDF7");
      f(x + 5, y - 4 + oy, 5, 1, ink);
      f(x + 5, y - 4 + oy, 1, 7, ink);
      f(x + 9, y - 3 + oy, 1, 6, shadeHex("#FFFDF7", -60));
      f(x + 6, y + 2 + oy, 4, 1, shadeHex("#FFFDF7", -60));
      f(x + 6, y - 3 + oy, 1, 1, "#FFFFFF");
      f(x + 6, y - 2 + oy, 3, 1, "#9AA0A6");
      f(x + 6, y + oy, 3, 1, "#9AA0A6");
    }
  }
  function drawStanding(ctx, a, frame, t = frame / 6) {
    let x = Math.round(a.px);
    const y = Math.round(a.py);
    const p = a.def.palette;
    const tg = a.gesture;
    const gOn = tg && t >= (tg.t0 || 0) && t < tg.until;
    const hb = gOn && tg.kind === "nod" ? (t * 5 | 0) % 2 : 0;
    const lean = gOn && tg.kind === "lean" ? (a.dir === "left" ? -1 : a.dir === "right" ? 1 : 0) : 0;
    const playing = a.state === "social" && a.relaxKind === "court";
    const mv = a.moving || playing;
    const sw = a.moving ? Math.sin((a.stride || 0) + a._h) : playing ? Math.sin(t * 7 + a._h) : 0;
    const gait = mv ? Math.round(sw * 2) : 0;
    const bob = mv ? Math.round(1 - Math.abs(sw)) : 0;
    const headSettle = mv && Math.abs(sw) > 0.82 ? 1 : 0;
    const fx = (ctx2, X, Y, w, h, c) => {
      ctx2.fillStyle = c;
      ctx2.fillRect(X, Y, w, h);
    };
    const shw = mv ? Math.round(Math.abs(sw) * 2) - 1 : 0;
    ctx.fillStyle = "rgba(30,44,72,0.26)";
    ctx.fillRect(x - 4 - shw, y + 5, 10 + shw * 2, 3);
    if (a.def.lead) {
      ctx.strokeStyle = "rgba(30,215,96,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 9, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!mv) x += Math.floor((t + a._h) / (5 + a._h % 3)) % 2;
    let oy = -bob;
    if (gOn && tg.kind === "hifive" && (t * 6 | 0) % 2) oy -= 1;
    const bre = mv ? 0 : Math.sin(t * 2.42 + a._h) > 0.35 ? 1 : 0;
    const tn = a._tn || (a._tn = { s: g5tones(p.shirt), h: g5tones(p.hair), k: g5tones(p.skin) });
    const oP = PANTS.o;
    const oS = tn.s.o;
    const oH = tn.h.o;
    const lStride = gait;
    const rStride = -gait;
    const lLift = Math.max(0, -lStride);
    const rLift = Math.max(0, -rStride);
    const lReach = Math.max(0, lStride);
    const rReach = Math.max(0, rStride);
    const lLegY = y + 1 + oy;
    const rLegY = y + 1 + oy;
    const lFootY = y + 5 + oy + (lReach > 1 ? 1 : 0) - lLift;
    const rFootY = y + 5 + oy + (rReach > 1 ? 1 : 0) - rLift;
    const lLegH = Math.max(3, lFootY - lLegY + 1);
    const rLegH = Math.max(3, rFootY - rLegY + 1);
    fx(ctx, x - 4, lLegY, 3, lLegH, PANTS.b);
    fx(ctx, x + 1, rLegY, 3, rLegH, PANTS.b);
    fx(ctx, x - 5, lLegY, 1, lLegH, oP);
    fx(ctx, x + 4, rLegY, 1, rLegH, oP);
    fx(ctx, x - 4 - (lReach > 0 ? 1 : 0), lFootY, 3 + (lReach > 0 ? 1 : 0), 1, oP);
    fx(ctx, x + 1, rFootY, 3 + (rReach > 0 ? 1 : 0), 1, oP);
    if (mv) {
      const armSwing = gait;
      const side = a.dir === "left" ? -1 : a.dir === "right" ? 1 : 0;
      const lArmX = x - 7 + (side > 0 ? 1 : 0);
      const rArmX = x + 5 + (side < 0 ? -1 : 0);
      const lArmY = y - 5 + oy - armSwing;
      const rArmY = y - 5 + oy + armSwing;
      fx(ctx, lArmX, lArmY, 1, 6, oS);
      fx(ctx, lArmX + 1, lArmY + 1, 1, 5, tn.k.b);
      fx(ctx, rArmX + 1, rArmY, 1, 6, oS);
      fx(ctx, rArmX, rArmY + 1, 1, 5, tn.k.b);
    } else {
      fx(ctx, x - 6, y - 5 + oy, 1, 7, oS);
      fx(ctx, x + 5, y - 5 + oy, 1, 7, oS);
    }
    fx(ctx, x - 5, y - 5 + oy, 10, 7, tn.s.b);
    fx(ctx, x - 5, y - 5 - bre + oy, 10, 2, tn.s.l);
    fx(ctx, x - 5, y - 5 - bre + oy, 3, 1, tn.s.h);
    fx(ctx, x + 3, y - 4 + oy, 2, 5, tn.s.d);
    fx(ctx, x - 4, y + 1 + oy, 8, 1, tn.s.d);
    fx(ctx, x - 5, y - 5 + oy, 1, 1, oS);
    fx(ctx, x + 4, y - 5 + oy, 1, 1, oS);
    const hOy = oy + hb + headSettle;
    fx(ctx, x - 5 + lean, y - 14 + hOy, 10, 9, tn.k.b);
    fx(ctx, x - 5 + lean, y - 14 + hOy, 10, 3, tn.h.b);
    fx(ctx, x - 5 + lean, y - 12 + hOy, 2, 3, tn.h.b);
    fx(ctx, x + 3 + lean, y - 12 + hOy, 2, 3, tn.h.b);
    fx(ctx, x - 4 + lean, y - 14 + hOy, 4, 1, tn.h.l);
    fx(ctx, x - 3 + lean, y - 13 + hOy, 2, 1, tn.h.l);
    fx(ctx, x - 4 + lean, y - 7 + hOy, 8, 1, tn.k.d);
    fx(ctx, x - 5 + lean, y - 6 + hOy, 2, 1, tn.k.d);
    fx(ctx, x + 3 + lean, y - 6 + hOy, 2, 1, tn.k.d);
    fx(ctx, x - 6 + lean, y - 14 + hOy, 1, 9, oH);
    fx(ctx, x + 5 + lean, y - 14 + hOy, 1, 9, oH);
    fx(ctx, x - 5 + lean, y - 15 + hOy, 10, 1, oH);
    fx(ctx, x - 6 + lean, y - 15 + hOy, 1, 1, tn.h.d);
    fx(ctx, x + 5 + lean, y - 15 + hOy, 1, 1, tn.h.d);
    drawFace(ctx, a, x + lean, y, hOy, frame, t);
    drawProp(ctx, a, x + lean, y, hOy);
    if (a.petalUntil && t < a.petalUntil) fx(ctx, x + lean, y - 16 + hOy, 1, 1, PETAL_A);
    if (a.coffeeUntil && t < a.coffeeUntil) {
      fx(ctx, x + 5, y - 4 + oy, 2, 2, CUP_CREAM);
      fx(ctx, x + 5, y - 3 + oy, 2, 1, CUP_BAND);
    }
    if (a.snackStage >= 4) {
      fx(ctx, x + 5, y - 2 + oy, 3, 3, CUP_CREAM);
      fx(ctx, x + 5, y - 1 + oy, 3, 1, "#E8853C");
    }
    if (gOn && tg.kind === "wave") {
      const wv = (t * 8 | 0) % 2;
      fx(ctx, x + 5, y - 9 + oy - wv, 2, 5, tn.k.b);
      fx(ctx, x + 6, y - 11 + oy - wv, 1, 2, tn.k.b);
    } else if (gOn && tg.kind === "hifive") {
      fx(ctx, x - 6, y - 12 + oy, 2, 6, tn.k.b);
      fx(ctx, x + 4, y - 12 + oy, 2, 6, tn.k.b);
    }
    if (a.state === "working" && (frame >> 1) % 2) fx(ctx, x + 6, y - 15 + oy, 2, 2, "#1ED760");
    if (a.state === "social" && !a.moving) {
      const tnow = performance.now() / 1000;
      if (a.relaxKind === "court") {
        if (a.shootUntil && tnow < a.shootUntil) {
          fx(ctx, x - 6, y - 13 + oy, 2, 7, tn.k.b);
          fx(ctx, x + 4, y - 13 + oy, 2, 7, tn.k.b);
          fx(ctx, x - 3, y - 19 + oy, 6, 6, shadeHex("#E8853C", -55));
          fx(ctx, x - 2, y - 18 + oy, 4, 4, "#E8853C");
          fx(ctx, x - 2, y - 16 + oy, 4, 1, "#B95F22");
          fx(ctx, x - 2, y - 18 + oy, 1, 1, "#FFD9B8");
        } else if (a.recvUntil && tnow < a.recvUntil) {
          fx(ctx, x - 7, y - 10 + oy, 2, 5, tn.k.b);
          fx(ctx, x + 5, y - 10 + oy, 2, 5, tn.k.b);
        } else if (a.hasBall) {
          const bb = frame % 2 ? 5 : 0;
          fx(ctx, x + 6, y - 6 + oy, 2, 4, tn.k.b);
          fx(ctx, x + 4, y - 2 + bb, 6, 6, shadeHex("#E8853C", -55));
          fx(ctx, x + 5, y - 1 + bb, 4, 4, "#E8853C");
          fx(ctx, x + 5, y + 1 + bb, 4, 1, "#B95F22");
          fx(ctx, x + 5, y - 1 + bb, 1, 1, "#FFD9B8");
        }
      } else if (a.relaxKind === "game") {
        if (a.gameUntil && tnow < a.gameUntil) {
          const jit = (tnow * 8 | 0) % 2;
          fx(ctx, x - 6, y - 4 + oy + jit, 2, 2, tn.k.b);
          fx(ctx, x + 4, y - 3 + oy - jit, 2, 2, tn.k.b);
        } else if (a.gameResUntil && tnow < a.gameResUntil && a.gameWin) {
          fx(ctx, x - 6, y - 12 + oy, 2, 7, tn.k.b);
          fx(ctx, x + 4, y - 12 + oy, 2, 7, tn.k.b);
        }
      } else if (a.snackStage === 5) {
        const hf = (tnow * 3 | 0) % 2;
        fx(ctx, x + 4, y - (hf ? 9 : 5) + oy, 2, 2, tn.k.b);
        if ((tnow * 2 | 0) % 3 < 1) {
          fx(ctx, x - 1, y + 6, 1, 1, "#C9A04E");
          fx(ctx, x + 2, y + 7, 1, 1, "#E0A458");
        }
      }
    }
  }
  function drawDown(ctx, a, frame) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const tn = a._tn || (a._tn = { s: g5tones(p.shirt), h: g5tones(p.hair), k: g5tones(p.skin) });
    const oP = PANTS.o;
    const oS = tn.s.o;
    const oH = tn.h.o;
    fx(x - 11, y + 4, 24, 3, "rgba(40,60,45,0.22)");
    fx(x + 6, y - 1, 5, 2, PANTS.b);
    fx(x + 6, y + 2, 5, 2, PANTS.b);
    fx(x + 11, y - 1, 1, 2, oP);
    fx(x + 11, y + 2, 1, 2, oP);
    fx(x - 4, y - 3, 10, 1, oS);
    fx(x - 4, y + 4, 10, 1, oS);
    fx(x - 4, y - 2, 10, 6, tn.s.b);
    fx(x - 4, y - 2, 2, 6, tn.s.l);
    fx(x - 1, y - 4, 4, 2, tn.s.d);
    fx(x - 12, y - 3, 8, 8, tn.k.b);
    fx(x - 13, y - 3, 2, 8, tn.h.b);
    fx(x - 12, y - 3, 8, 2, tn.h.b);
    fx(x - 13, y - 2, 1, 3, tn.h.l);
    fx(x - 14, y - 3, 1, 8, oH);
    fx(x - 13, y - 4, 9, 1, oH);
    fx(x - 13, y + 5, 9, 1, oH);
    ctx.fillStyle = "#2A2622";
    fx(x - 9, y - 1, 1, 1, "#2A2622");
    fx(x - 8, y, 1, 1, "#2A2622");
    fx(x - 9, y + 2, 1, 1, "#2A2622");
    fx(x - 8, y + 3, 1, 1, "#2A2622");
    for (let i = 0; i < 3; i++) {
      const ang = frame * 0.55 + i * 2.094;
      const px = Math.round(x - 8 + Math.cos(ang) * 6);
      const py = Math.round(y - 9 + Math.sin(ang) * 2);
      fx(px, py, 2, 2, i ? "#F5C542" : "#F59E0B");
      fx(px + 1, py + 1, 1, 1, shadeHex(i ? "#F5C542" : "#F59E0B", -50));
      if (i === 0) fx(px, py, 1, 1, "#FFEDBB");
    }
  }
  function drawRevive(ctx, a, frame, t = frame / 6) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    if (frame % 2 === 0) ctx.globalAlpha = 0.55;
    drawStanding(ctx, a, frame, t);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const sx = x - 8 + (i * 5 + frame * 2) % 16;
      const sy = y + 4 - (frame * 2 + i * 5) % 20;
      ctx.fillStyle = i % 2 ? "#1ED760" : "#7CF2A8";
      ctx.fillRect(sx, sy, 1, 1);
      ctx.fillStyle = i % 2 ? shadeHex("#1ED760", -55) : shadeHex("#7CF2A8", -55);
      ctx.fillRect(sx, sy + 1, 1, 1);
      if (i === 0) {
        ctx.fillStyle = "#EAFBF0";
        ctx.fillRect(sx, sy - 1, 1, 1);
      }
    }
  }
  function drawSwim(ctx, a, frame, t = frame / 6) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const tn = a._tn || (a._tn = { s: g5tones(p.shirt), h: g5tones(p.hair), k: g5tones(p.skin) });
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const bob = Math.sin(t * 2.4 + a._h) > 0 ? 1 : 0;
    const oS = tn.s.o;
    const oH = tn.h.o;
    fx(x - 8, y + 1, 16, 2, "rgba(255,255,255,0.3)");
    fx(x - 6, y - 4 + bob, 1, 3, oS);
    fx(x + 5, y - 4 + bob, 1, 3, oS);
    fx(x - 5, y - 4 + bob, 10, 3, tn.s.b);
    fx(x - 5, y - 4 + bob, 10, 1, tn.s.l);
    fx(x - 4, y - 12 + bob, 8, 8, tn.k.b);
    fx(x - 4, y - 13 + bob, 8, 3, tn.h.b);
    fx(x - 4, y - 11 + bob, 2, 3, tn.h.b);
    fx(x + 2, y - 11 + bob, 2, 3, tn.h.b);
    fx(x - 3, y - 13 + bob, 3, 1, tn.h.l);
    fx(x - 5, y - 13 + bob, 1, 8, oH);
    fx(x + 4, y - 13 + bob, 1, 8, oH);
    fx(x - 4, y - 14 + bob, 8, 1, oH);
    fx(x - 2, y - 9 + bob, 1, 2, "#2A2622");
    fx(x + 1, y - 9 + bob, 1, 2, "#2A2622");
    const ph = Math.floor(t * 4 + a._h) % 4;
    if (ph === 0) {
      fx(x - 9, y - 9, 3, 3, tn.k.b);
      fx(x - 12, y - 10, 3, 2, "#EAF8FD");
    } else if (ph === 1) {
      fx(x - 7, y - 6, 3, 3, tn.k.b);
    } else if (ph === 2) {
      fx(x + 6, y - 9, 3, 3, tn.k.b);
      fx(x + 9, y - 10, 3, 2, "#EAF8FD");
    } else {
      fx(x + 4, y - 6, 3, 3, tn.k.b);
    }
    fx(x - 6, y - 2 + bob, 12, 3, "rgba(143,220,242,0.65)");
    const kf = frame % 2;
    fx(x - 2 + (kf ? 3 : 0), y + 2, 2, 1, "#EAF8FD");
    fx(x - 5, y + 1, 2, 1, "rgba(255,255,255,0.55)");
    fx(x + 3, y + 2, 1, 1, "rgba(255,255,255,0.45)");
    fx(x - 9 + (frame * 3 & 7), y + 2, 1, 1, "#EAF8FD");
    fx(x + 8 - (frame * 2 & 7), y - 1, 1, 1, "#CFF0FA");
  }
  function drawExercise(ctx, a, frame, t = frame / 6) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const ph = (frame >> 1) % 2;
    const fast = frame % 2;
    const tn = a._tn || (a._tn = { s: g5tones(p.shirt), h: g5tones(p.hair), k: g5tones(p.skin) });
    const oP = PANTS.o;
    const oS = tn.s.o;
    const oH = tn.h.o;
    ctx.fillStyle = "rgba(40,60,45,0.22)";
    switch (a.exercise) {
      case "pullup":
        {
          const lift = PULL_SEQ[Math.floor(t * 2.4 + a._h) % 4];
          ctx.fillRect(x - 4, y + 5, 10, 3);
          fx(x - 5, y - 14 + lift, 2, 7, tn.k.b);
          fx(x + 3, y - 14 + lift, 2, 7, tn.k.b);
          fx(x - 6, y - 5 + lift, 1, 7, oS);
          fx(x + 5, y - 5 + lift, 1, 7, oS);
          fx(x - 5, y - 5 + lift, 10, 7, tn.s.b);
          fx(x - 5, y - 5 + lift, 10, 2, tn.s.l);
          fx(x - 4, y + 1 + lift, 8, 1, tn.s.d);
          fx(x - 4, y - 13 + lift, 8, 8, tn.k.b);
          fx(x - 4, y - 14 + lift, 8, 3, tn.h.b);
          fx(x - 3, y - 14 + lift, 3, 1, tn.h.l);
          fx(x - 4, y - 15 + lift, 8, 1, oH);
          fx(x - 4, y + 2 + lift, 3, 3, PANTS.b);
          fx(x + 1, y + 2 + lift, 3, 3, PANTS.b);
          fx(x - 4, y + 4 + lift, 3, 1, oP);
          fx(x + 1, y + 4 + lift, 3, 1, oP);
          break;
        }
      case "bench":
        {
          const press = BENCH_SEQ[Math.floor(t * 3 + a._h) % 5];
          ctx.fillRect(x - 9, y + 4, 20, 3);
          fx(x - 7, y - 2, 12, 5, tn.s.b);
          fx(x - 7, y - 2, 12, 1, tn.s.l);
          fx(x - 7, y + 2, 12, 1, tn.s.d);
          fx(x + 5, y - 3, 6, 6, tn.k.b);
          fx(x + 9, y - 4, 3, 7, tn.h.b);
          fx(x + 9, y - 4, 1, 2, tn.h.l);
          fx(x + 12, y - 4, 1, 7, oH);
          fx(x + 9, y - 5, 3, 1, oH);
          fx(x - 4, y - 6 + press, 2, 5, tn.k.b);
          fx(x + 1, y - 6 + press, 2, 5, tn.k.b);
          fx(x - 8, y - 7 + press, 16, 2, "#8B8F96");
          fx(x - 8, y - 7 + press, 16, 1, shadeHex("#8B8F96", 26));
          fx(x - 6, y - 7 + press, 1, 1, "#F4F7FA");
          fx(x - 11, y - 9 + press, 3, 5, "#2E3440");
          fx(x + 8, y - 9 + press, 3, 5, "#2E3440");
          fx(x - 9, y - 9 + press, 1, 5, shadeHex("#2E3440", 28));
          fx(x + 8, y - 9 + press, 1, 5, shadeHex("#2E3440", 28));
          break;
        }
      case "pushup":
        {
          const dip = fast ? 2 : 0;
          ctx.fillRect(x - 8, y + 5, 18, 3);
          fx(x - 8, y + dip, 12, 4, tn.s.b);
          fx(x - 8, y + dip, 12, 1, tn.s.l);
          fx(x - 8, y + 3 + dip, 12, 1, tn.s.d);
          fx(x + 3, y - 3 + dip, 6, 6, tn.k.b);
          fx(x + 4, y - 4 + dip, 6, 2, tn.h.b);
          fx(x + 4, y - 4 + dip, 2, 1, tn.h.l);
          fx(x + 4, y - 5 + dip, 6, 1, oH);
          fx(x - 7, y + 3, 2, 4, tn.k.b);
          fx(x + 1, y + 3, 2, 4, tn.k.b);
          fx(x - 8, y + 4 + dip, 4, 2, PANTS.b);
          fx(x - 8, y + 5 + dip, 4, 1, oP);
          break;
        }
      case "run":
        {
          const rf = Math.floor(t * 8 + a._h) % 2;
          const ln = rf ? a.dir === "left" ? -1 : 1 : 0;
          const oy = -rf;
          ctx.fillRect(x - 4, y + 5, 10, 3);
          if (rf) {
            fx(x - 4, y + 1 + oy, 3, 5, PANTS.b);
            fx(x + 1, y + 2 + oy, 3, 4, PANTS.b);
            fx(x - 5, y + 1 + oy, 1, 5, oP);
            fx(x + 4, y + 2 + oy, 1, 4, oP);
          } else {
            fx(x - 4, y + 2 + oy, 3, 4, PANTS.b);
            fx(x + 1, y + 1 + oy, 3, 5, PANTS.b);
            fx(x - 5, y + 2 + oy, 1, 4, oP);
            fx(x + 4, y + 1 + oy, 1, 5, oP);
          }
          fx(x - 4, y + 5 + oy, 3, 1, oP);
          fx(x + 1, y + 5 + oy, 3, 1, oP);
          fx(x - 6 + ln, y - 5 + oy, 1, 7, oS);
          fx(x + 5 + ln, y - 5 + oy, 1, 7, oS);
          fx(x - 5 + ln, y - 5 + oy, 10, 7, tn.s.b);
          fx(x - 5 + ln, y - 5 + oy, 10, 2, tn.s.l);
          fx(x + 4 + ln, y - 3 + oy, 1, 4, tn.s.d);
          fx(x - 4 + ln, y + 1 + oy, 8, 1, tn.s.d);
          fx(x - 4 + ln, y - 13 + oy, 8, 8, tn.k.b);
          fx(x - 4 + ln, y - 14 + oy, 8, 3, tn.h.b);
          fx(x - 4 + ln, y - 12 + oy, 2, 3, tn.h.b);
          fx(x + 2 + ln, y - 12 + oy, 2, 3, tn.h.b);
          fx(x - 3 + ln, y - 14 + oy, 3, 1, tn.h.l);
          fx(x - 5 + ln, y - 14 + oy, 1, 9, oH);
          fx(x + 4 + ln, y - 14 + oy, 1, 9, oH);
          fx(x - 4 + ln, y - 15 + oy, 8, 1, oH);
          if (ph) fx(x + 5 + ln, y - 12 + oy, 1, 2, "#8FDCF2");
          break;
        }
      default:
        {
          const di = Math.floor(t * 2.2 + a._h) % 4;
          const lo = DB_SEQ[di];
          const ro = DB_SEQ[(di + 2) % 4];
          ctx.fillRect(x - 4, y + 5, 10, 3);
          fx(x - 4, y + 1, 3, 5, PANTS.b);
          fx(x + 1, y + 1, 3, 5, PANTS.b);
          fx(x - 5, y + 1, 1, 5, oP);
          fx(x + 4, y + 1, 1, 5, oP);
          fx(x - 4, y + 5, 3, 1, oP);
          fx(x + 1, y + 5, 3, 1, oP);
          fx(x - 6, y - 5, 1, 7, oS);
          fx(x + 5, y - 5, 1, 7, oS);
          fx(x - 5, y - 5, 10, 7, tn.s.b);
          fx(x - 5, y - 5, 10, 2, tn.s.l);
          fx(x - 4, y + 1, 8, 1, tn.s.d);
          fx(x - 4, y - 13, 8, 8, tn.k.b);
          fx(x - 4, y - 14, 8, 3, tn.h.b);
          fx(x - 3, y - 14, 3, 1, tn.h.l);
          fx(x - 5, y - 14, 1, 9, oH);
          fx(x + 4, y - 14, 1, 9, oH);
          fx(x - 4, y - 15, 8, 1, oH);
          fx(x - 7, y - 4 + lo, 2, 4, tn.k.b);
          fx(x + 5, y - 4 + ro, 2, 4, tn.k.b);
          fx(x - 9, y - 5 + lo, 4, 3, "#2E3440");
          fx(x + 5, y - 5 + ro, 4, 3, "#2E3440");
          fx(x - 9, y - 5 + lo, 4, 1, shadeHex("#2E3440", 28));
          fx(x + 5, y - 5 + ro, 4, 1, shadeHex("#2E3440", 28));
          fx(x - 9, y - 5 + lo, 1, 1, "#AEB6C2");
          break;
        }
    }
    const swp = (t + a._h * 0.7) % 6;
    if (swp < 0.6) {
      const hx = a.exercise === "bench" ? x + 10 : a.exercise === "pushup" ? x + 9 : x + 5;
      const hy = a.exercise === "bench" ? y - 6 : a.exercise === "pushup" ? y - 2 : y - 12;
      fx(hx, hy + Math.round(swp * 15), 1, 1, "#8FDCF2");
    }
  }
  function drawSit(ctx, a, frame, t = frame / 6) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const paused = (t + a._h) % (9 + a._h % 6) < 0.7;
    const ho = paused ? a._h % 2 ? 1 : -1 : 0;
    const tg = a.gesture;
    const hb = tg && tg.kind === "nod" && t >= (tg.t0 || 0) && t < tg.until ? (t * 5 | 0) % 2 : 0;
    const p = a.def.palette;
    const tn = a._tn || (a._tn = { s: g5tones(p.shirt), h: g5tones(p.hair), k: g5tones(p.skin) });
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    fx(x - 4, y + 5, 10, 3, "rgba(40,60,45,0.22)");
    if (a.def.lead) {
      ctx.strokeStyle = "rgba(30,215,96,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 9, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const oS = tn.s.o;
    const oH = tn.h.o;
    fx(x - 5, y - 1, 10, 4, "#6B6B6B");
    fx(x - 5, y + 2, 10, 1, shadeHex("#6B6B6B", -45));
    fx(x - 6, y - 4, 1, 6, oS);
    fx(x + 5, y - 4, 1, 6, oS);
    fx(x - 5, y - 4, 10, 6, tn.s.b);
    fx(x - 5, y - 4, 10, 2, tn.s.l);
    fx(x + 4, y - 2, 1, 3, tn.s.d);
    fx(x - 4, y + 1, 8, 1, tn.s.d);
    fx(x - 5, y - 4, 1, 1, oS);
    fx(x + 4, y - 4, 1, 1, oS);
    fx(x - 4 + ho, y - 12 + hb, 8, 8, tn.k.b);
    fx(x - 4 + ho, y - 13 + hb, 8, 3, tn.h.b);
    fx(x - 4 + ho, y - 11 + hb, 2, 3, tn.h.b);
    fx(x + 2 + ho, y - 11 + hb, 2, 3, tn.h.b);
    fx(x - 3 + ho, y - 13 + hb, 3, 1, tn.h.l);
    fx(x - 5 + ho, y - 13 + hb, 1, 9, oH);
    fx(x + 4 + ho, y - 13 + hb, 1, 9, oH);
    fx(x - 4 + ho, y - 14 + hb, 8, 1, oH);
    drawFace(ctx, a, x + ho, y, 1 + hb, frame, t);
    drawProp(ctx, a, x + ho, y, 1);
    const tb = paused ? 0 : Math.floor(t * 7 + a._h) % 2;
    const rb = paused ? 0 : 1 - tb;
    fx(x - 4, y + 1 - tb, 2, 2, tn.k.b);
    fx(x + 2, y + 1 - rb, 2, 2, tn.k.b);
    fx(x - 4, y + 3, 8, 2, "#3A3531");
    fx(x - 4, y + 4, 8, 1, shadeHex("#3A3531", -35));
    fx(x - 3, y + 1, 6, 2, "#23303A");
    if ((frame >> 1) % 2) fx(x - 3, y + 1, 6, 1, "#1ED760");
    fx(Math.floor(t / 1.6 + a._h) % 2 ? x + 1 : x - 3, y + 1, 1, 1, "#DCEAF2");
    if (a.coffeeUntil && t < a.coffeeUntil) {
      if ((t + a._h) % 12 < 0.6) {
        fx(x + 3 + ho, y - 8 + hb, 2, 2, CUP_CREAM);
        fx(x + 3 + ho, y - 7 + hb, 2, 1, CUP_BAND);
        fx(x + 4 + ho, y - 6 + hb, 1, 2, tn.k.b);
      } else {
        fx(x + 5, y - 2, 2, 2, CUP_CREAM);
        fx(x + 5, y - 1, 2, 1, CUP_BAND);
      }
    }
  }
  function drawSofaSit(ctx, a, frame, t = frame / 6) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const tg = a.gesture;
    const hb = tg && tg.kind === "nod" && t >= (tg.t0 || 0) && t < tg.until ? (t * 5 | 0) % 2 : 0;
    const bre = Math.sin(t * 2.42 + a._h) > 0.35 ? 1 : 0;
    const tn = a._tn || (a._tn = { s: g5tones(p.shirt), h: g5tones(p.hair), k: g5tones(p.skin) });
    const oP = PANTS.o;
    const oS = tn.s.o;
    const oH = tn.h.o;
    fx(x - 6, y - 4, 1, 6, oS);
    fx(x + 5, y - 4, 1, 6, oS);
    fx(x - 5, y - 4, 10, 6, tn.s.b);
    fx(x - 5, y - 4 - bre, 10, 2, tn.s.l);
    fx(x + 4, y - 2, 1, 3, tn.s.d);
    fx(x - 4, y + 1, 8, 1, tn.s.d);
    fx(x - 4, y - 12 + hb, 8, 8, tn.k.b);
    fx(x - 4, y - 13 + hb, 8, 3, tn.h.b);
    fx(x - 4, y - 11 + hb, 2, 3, tn.h.b);
    fx(x + 2, y - 11 + hb, 2, 3, tn.h.b);
    fx(x - 3, y - 13 + hb, 3, 1, tn.h.l);
    fx(x - 5, y - 13 + hb, 1, 9, oH);
    fx(x + 4, y - 13 + hb, 1, 9, oH);
    fx(x - 4, y - 14 + hb, 8, 1, oH);
    drawFace(ctx, a, x, y, 1 + hb, frame, t);
    drawProp(ctx, a, x, y, 1);
    fx(x - 4, y + 2, 3, 2, PANTS.b);
    fx(x + 1, y + 2, 3, 2, PANTS.b);
    fx(x - 4, y + 4, 3, 1, oP);
    fx(x + 1, y + 4, 3, 1, oP);
    if (a.petalUntil && t < a.petalUntil) fx(x, y - 15 + hb, 1, 1, PETAL_A);
    if (a.coffeeUntil && t < a.coffeeUntil) {
      fx(x + 5, y - 3, 2, 2, CUP_CREAM);
      fx(x + 5, y - 2, 2, 1, CUP_BAND);
    }
  }
  function drawRest(ctx, a, frame) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const tn = a._tn || (a._tn = { s: g5tones(p.shirt), h: g5tones(p.hair), k: g5tones(p.skin) });
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const oS = tn.s.o;
    const oH = tn.h.o;
    fx(x + 6, y - 1, 5, 2, PANTS.b);
    fx(x + 6, y + 2, 5, 2, PANTS.b);
    fx(x - 4, y - 3, 10, 1, oS);
    fx(x - 4, y + 4, 10, 1, oS);
    fx(x - 4, y - 2, 10, 6, tn.s.b);
    fx(x - 4, y - 2, 2, 6, tn.s.l);
    fx(x - 12, y - 3, 8, 8, tn.k.b);
    fx(x - 13, y - 3, 2, 8, tn.h.b);
    fx(x - 12, y - 3, 8, 2, tn.h.b);
    fx(x - 14, y - 3, 1, 8, oH);
    fx(x - 13, y - 4, 9, 1, oH);
    fx(x - 13, y + 5, 9, 1, oH);
    fx(x - 9, y, 2, 1, "#2A2622");
    fx(x - 9, y + 2, 2, 1, "#2A2622");
    fx(x - 2, y - 2, 15, 6, "#BFD9EA");
    fx(x - 2, y - 2, 15, 1, "#D7E9F4");
    fx(x - 2, y + 3, 15, 1, "#9FBFD4");
    if ((frame >> 1) % 2) {
      fx(x - 1, y - 15, 1, 3, "#1ED760");
      fx(x - 2, y - 14, 3, 1, "#1ED760");
    }
  }
  const CRITTER_DEFS = [["_mascot", "laotter"], ["_navi", "navi"], ["_toro", "toro"], ["_green", "greennode"], ["_capy", "capy"]];
  const CRITTER_NAME = { laotter: "Laotter", navi: "Navi", toro: "Toro", greennode: "TêTê", capy: "CapyZalo" };
  const CRITTER_LABEL = { laotter: "#FFB23E", navi: "#FFB23E", toro: "#FFB23E", greennode: "#54D06B", capy: "#3FA9F5" };
  const CRIT_SHADOW = { laotter: 2, navi: -4, toro: 1, greennode: 2, capy: 2 };
  const MASCOT_KEYS = ["_mascot", "_navi", "_toro", "_green"];
  const CRIT = {
    _mascot: { key: "laotter", amp: 0.7, breath: 0.02, hopH: 7, wob: 0.05, idleMood: "neutral", faves: ["coffee", "think", "cool"], scanGap: [10, 16], engageP: 0.4, followP: 0.1, idleFlourish: 0.15 },
    _navi: { key: "navi", amp: 1.5, breath: 0.045, hopH: 13, wob: 0.13, idleMood: "happy", faves: ["fire", "idea", "party", "star"], scanGap: [5, 9], engageP: 0.8, followP: 0.3, idleFlourish: 0.5 },
    _toro: { key: "toro", amp: 1.2, breath: 0.035, hopH: 11, wob: 0.1, idleMood: "mischief", faves: ["grin", "ball", "star", "heart"], scanGap: [6, 10], engageP: 0.7, followP: 0.22, idleFlourish: 0.4 },
    _green: { key: "greennode", amp: 0.9, breath: 0.028, hopH: 8, wob: 0.07, idleMood: "curious", faves: ["question", "idea", "think", "cool"], scanGap: [8, 13], engageP: 0.55, followP: 0.16, idleFlourish: 0.35 },
    _capy: { key: "capy", amp: 0.8, breath: 0.03, hopH: 7, wob: 0.05, idleMood: "happy", faves: ["heart", "music", "cool", "star"], scanGap: [9, 15], engageP: 0.5, followP: 0.14, idleFlourish: 0.25 }
  };
  const SP = { _mascot: 0.72, _navi: 0.82, _toro: 0.8, _green: 0.74, _capy: 0.66 };
  const NP = { _mascot: 0.1, _navi: 0.06, _toro: 0.08, _green: 0.1, _capy: 0.12 };
  const SIP = { _mascot: 0.22, _navi: 0.18, _toro: 0.2, _green: 0.22, _capy: 0.26 };
  const pick = arr => arr[Math.random() * arr.length | 0];
  const TORO_PAL = { body: "#4FB8F5", bodyLt: "#74C8F8", bodyDk: "#2E93D6", belly: "#FFFFFF", bellyDk: "#CFE6F7", white: "#FFFFFF", outline: "#2A6CA0", ear: "#FF9EC4", eye: "#1B2733", eyeW: "#FFFFFF", hl: "#FFFFFF", nose: "#E8557A", leaf: "#5BC24A", leafDk: "#3DA02E", pink: "#FF8FB0", paw: "#FFFFFF" };
  const NAVI_PAL = { flame: "#F79A1E", flameLt: "#FFC94E", flameDk: "#E0520E", tipRed: "#F2552A", folder: "#FFD23E", folderLt: "#FFE68C", folderDk: "#D99A14", eye: "#2A1A10", eyeW: "#FFFFFF", hl: "#FFFFFF", blush: "#FF8A7A", mouth: "#A0220C", tongue: "#F2552A", white: "#FFFFFF", pink: "#FF6FA5" };
  const LAOTTER_PAL = { fur: "#A87B4E", furLt: "#C0966A", furDk: "#86603A", muzzle: "#C49A6E", cream: "#E8D6BC", shirt: "#2E3441", shirtLt: "#3C4350", shirtDk: "#222732", outline: "#5A3A22", eye: "#2A1E14", eyeW: "#FFFFFF", hl: "#FFFFFF", nose: "#3A2A1E", blush: "#E0917C", case: "#C8943E", caseDk: "#9A6E28", clasp: "#EAC972", z: "#FFFFFF", pink: "#FF6FA5" };
  const GREEN_PAL = { body: "#4FBF6A", bodyLt: "#74CE86", bodyDk: "#2E9C4C", belly: "#D9F2D2", bellyDk: "#A9DDAE", ol: "#173A8C", blue: "#2D6FE3", blueLt: "#5A93F0", lens: "#DCF3F0", eye: "#16242A", eyeW: "#FFFFFF", hl: "#CFEFFF", glass: "#173A8C", orange: "#F5A623", orangeLt: "#FFC24A", orangeDk: "#E0760D", pink: "#FF6FA5" };
  const CAPY_PAL = { fur: "#B07C44", furLt: "#C69460", furDk: "#8A5E30", cream: "#EFDDBA", creamDk: "#D8C496", ol: "#3A2415", shirt: "#23283A", shirtLt: "#333A50", shirtDk: "#181C2A", z: "#FFFFFF", eye: "#2A1E14", eyeW: "#FFFFFF", hl: "#FFFFFF", nose: "#4A2E1E", noseHl: "#6E4A30", blush: "#F2A0A8", mouth: "#7A2A1E", tongue: "#F08AA0", paw: "#7A5230", earIn: "#7A5230", pink: "#FF8FB0" };
  function pxRect(ctx, U, gx, gy, gw, gh, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round((gx - 10) * U), Math.round(gy * U), Math.max(1, Math.round(gw * U)), Math.max(1, Math.round(gh * U)));
  }
  function drawLimb(ctx, U, jx, jy, angle, len, w, col, bend, endR, endCol) {
    const steps = Math.max(2, Math.round(len));
    const half = bend > 0.01 ? steps >> 1 : steps + 1;
    const a2 = angle + bend * 0.9;
    let x = jx, y = jy, a = angle;
    for (let i = 0; i < steps; i++) {
      if (i === half) a = a2;
      const taper = Math.max(1.6, w - w * 0.32 * (i / steps));
      ctx.fillStyle = col;
      ctx.fillRect(Math.round((x - taper / 2 - 10) * U), Math.round((y - 0.6) * U), Math.max(1, Math.round(taper * U)), Math.max(1, Math.round(1.35 * U)));
      x += Math.sin(a);
      y += Math.cos(a);
    }
    if (endR && endR > 0) {
      ctx.fillStyle = endCol || col;
      ctx.fillRect(Math.round((x - endR - 10) * U), Math.round((y - endR) * U), Math.max(1, Math.round(endR * 2 * U)), Math.max(1, Math.round(endR * 2 * U)));
    }
    return [x, y];
  }
  function pose(c, tp, ws, an, animP, state, mood) {
    let aF = 0.15, aB = -0.15, lF = 0, lB = 0, bend = 0;
    if (state === "walk" && c.path && c.path.length) {
      const s = Math.sin(ws);
      lF = s * 0.5;
      lB = -s * 0.5;
      aF = -s * 0.45;
      aB = s * 0.45;
    } else if (state === "sit") {
      lF = 1.25;
      lB = 1.05;
      aF = 0.35;
      aB = 0.3;
    } else if (state === "nap") {
      lF = 1.45;
      lB = 1.55;
      aF = 0.9;
      aB = 0.7;
    } else {
      const b = Math.sin(tp * 1.6) * 0.12;
      aF = 0.18 + b;
      aB = -0.18 - b;
      lF = 0.04;
      lB = -0.04;
    }
    if (mood === "happy") {
      aF -= 0.22;
      aB -= 0.22;
    } else if (mood === "excited") {
      const w = Math.sin(tp * 9);
      aF = -2.1 + w * 0.25;
      aB = -2.1 - w * 0.25;
      bend = 0.55;
    } else if (mood === "proud") {
      aF = 0.95;
      aB = 0.95;
      bend = 1;
    } else if (mood === "sad") {
      aF = 0.5;
      aB = 0.5;
    } else if (mood === "sleepy") {
      aF = 0.45;
      aB = 0.45;
    } else if (mood === "love") {
      aF = -1.7 + Math.sin(tp * 4) * 0.15;
      aB = -1.7 - Math.sin(tp * 4) * 0.15;
      bend = 0.5;
    } else if (mood === "scared") {
      aF = -1.4;
      aB = -1.4;
      bend = 0.7;
    } else if (mood === "curious") {
      aF = -0.4;
      bend = 0.4;
    } else if (mood === "mischief") {
      aF = 0.55;
      aB = -0.45;
    }
    if (an && animP >= 0) {
      const k = an.kind, p = animP, e = Math.sin(Math.PI * p);
      if (k === "hop" || k === "startle") {
        const n = an.n || 1, hp = p * n - Math.floor(Math.min(n - 1e-3, p * n)), up = Math.sin(Math.PI * hp);
        lF = 0.7 * up;
        lB = 0.7 * up;
        aF = -0.5 * up + 0.15;
        aB = -0.5 * up - 0.15;
      } else if (k === "tailwag" || k === "jiggle") {
        aF += Math.sin(p * 6.28 * 3) * 0.25 * (1 - p);
        aB -= Math.sin(p * 6.28 * 3) * 0.25 * (1 - p);
      } else if (k === "nod" || k === "headtilt") {
        aF += e * 0.2;
      } else if (k === "shake") {
        const w = Math.sin(p * 6.28 * 8) * (1 - p);
        aF += w * 0.3;
        aB += w * 0.3;
      } else if (k === "spin") {
        aF = -1.6;
        aB = -1.6;
        bend = 0.8;
      } else if (k === "wave") {
        aF = -2.2 + Math.sin(p * 6.28 * 3) * 0.4;
        bend = 0.6;
      }
    }
    if (c.act === "wave" || c.emote && c.emote.kind === "wave") {
      aF = -2.25 + Math.sin(tp * 7) * 0.45;
      bend = 0.6;
    }
    _POSE.aF = aF;
    _POSE.aB = aB;
    _POSE.lF = lF;
    _POSE.lB = lB;
    _POSE.armBend = bend;
    return _POSE;
  }
  const _POSE = { aF: 0, aB: 0, lF: 0, lB: 0, armBend: 0 };
  function drawToro(ctx, U, h, P, c, frame, tp) {
    const Q = TORO_PAL, pr = (x, y, w, hh, col) => pxRect(ctx, U, x, y, w, hh, col);
    drawLimb(ctx, U, 7, 17, P.aB, 6, 2.4, Q.bodyDk, P.armBend, 2, Q.white);
    drawLimb(ctx, U, 8, 24, P.lB, 5, 2.8, Q.bodyDk, 0, 2, Q.white);
    const tw = Math.sin(tp * 4) * 0.5;
    drawLimb(ctx, U, 13, 21, 2.2 + tw, 7, 2.2, Q.body, 0.6, 1.8, Q.body);
    pr(6, 15, 8, 10, Q.body);
    pr(6, 15, 8, 2, Q.bodyLt);
    pr(7, 17, 6, 7, Q.white);
    pr(7, 17, 6, 1, Q.bellyDk);
    pr(5, 4, 10, 9, Q.body);
    pr(5, 4, 10, 2, Q.bodyLt);
    pr(4, 1, 2, 3, Q.body);
    pr(5, 0, 1, 1, Q.body);
    pr(5, 2, 1, 1, Q.ear);
    pr(14, 1, 2, 3, Q.body);
    pr(14, 0, 1, 1, Q.body);
    pr(14, 2, 1, 1, Q.ear);
    pr(9, 1, 2, 2, Q.leaf);
    pr(8, 2, 1, 1, Q.leaf);
    pr(11, 1, 1, 1, Q.leafDk);
    pr(6, 9, 8, 4, Q.white);
    const blink = frame % 23 === 0;
    if (blink) {
      pr(6, 7, 3, 1, Q.eye);
      pr(11, 7, 3, 1, Q.eye);
    } else {
      pr(6, 5, 4, 4, Q.white);
      pr(10, 5, 4, 4, Q.white);
      pr(7, 6, 2, 2, Q.eye);
      pr(11, 6, 2, 2, Q.eye);
      pr(7, 6, 1, 1, Q.hl);
      pr(11, 6, 1, 1, Q.hl);
    }
    pr(9, 9, 2, 1, Q.nose);
    const happy = c.mood === "happy" || c.mood === "excited" || c.mood === "love";
    if (happy) {
      pr(8, 10, 4, 1, Q.eye);
      pr(9, 11, 2, 1, Q.eye);
    } else pr(9, 10, 2, 1, Q.eye);
    drawLimb(ctx, U, 13, 17, P.aF, 6, 2.4, Q.body, P.armBend, 2, Q.white);
    drawLimb(ctx, U, 12, 24, P.lF, 5, 2.8, Q.body, 0, 2, Q.white);
  }
  function drawNavi(ctx, U, h, P, c, frame, tp) {
    const Q = NAVI_PAL, pr = (x, y, w, hh, col) => pxRect(ctx, U, x, y, w, hh, col);
    drawLimb(ctx, U, 3, 15, P.aB, 2.5, 2.4, Q.flameDk, P.armBend, 1.8, Q.flameLt);
    const fk = frame >> 1 & 1, ex = c.mood === "excited" ? 1 : 0;
    pr(9, 2 - ex, 2, 1, Q.flameLt);
    pr(8, 3, 4, 1, Q.flame);
    pr(7, 4, 6, 1, Q.flame);
    pr(6, 5, 8, 1, Q.flame);
    pr(5, 6, 10, 2, Q.flame);
    pr(4, 8, 12, 2, Q.flame);
    pr(3, 10, 14, 2, Q.flame);
    pr(2, 12, 16, 4, Q.flame);
    pr(3, 16, 14, 1, Q.flame);
    pr(4, 17, 12, 1, Q.flame);
    pr(5, 18, 10, 1, Q.flame);
    pr(6, 19, 8, 1, Q.flame);
    pr(7, 20, 6, 1, Q.flame);
    pr(5, 7, 4, 4, Q.flameLt);
    pr(13, 12, 3, 5, Q.flameDk);
    pr(10, 17, 4, 2, Q.flameDk);
    pr(5, 9, 4, 1, Q.folderDk);
    pr(5, 9, 3, 1, Q.folder);
    pr(4, 10, 12, 8, Q.folderDk);
    pr(5, 11, 10, 7, Q.folder);
    pr(5, 11, 10, 1, Q.folderLt);
    const blink = (frame + 1) % 26 === 0;
    if (blink) {
      pr(6, 13, 2, 1, Q.eye);
      pr(12, 13, 2, 1, Q.eye);
    } else {
      pr(6, 12, 1, 1, Q.eye);
      pr(7, 13, 1, 1, Q.eye);
      pr(6, 14, 1, 1, Q.eye);
      pr(13, 12, 1, 1, Q.eye);
      pr(12, 13, 1, 1, Q.eye);
      pr(13, 14, 1, 1, Q.eye);
    }
    pr(5, 13, 1, 1, Q.blush);
    pr(14, 13, 1, 1, Q.blush);
    pr(7, 15, 6, 3, Q.mouth);
    pr(8, 15, 4, 1, Q.white);
    pr(9, 17, 2, 1, Q.tongue);
    drawLimb(ctx, U, 8, 20, P.lB * 0.25, 1, 3.4, Q.flameDk, 0, 1.8, Q.flameDk);
    drawLimb(ctx, U, 12, 20, P.lF * 0.25, 1, 3.4, Q.flameDk, 0, 1.8, Q.flameDk);
    drawLimb(ctx, U, 17, 15, P.aF, 2.5, 2.4, Q.flameDk, P.armBend, 1.8, Q.flameLt);
  }
  function drawLaotter(ctx, U, h, P, c, frame, tp) {
    const Q = LAOTTER_PAL, pr = (x, y, w, hh, col) => pxRect(ctx, U, x, y, w, hh, col);
    drawLimb(ctx, U, 6, 18, P.aB, 5, 2.6, Q.furDk, P.armBend, 2, Q.furDk);
    drawLimb(ctx, U, 8, 25, P.lB, 4, 3.2, Q.furDk, 0, 2.1, Q.furDk);
    pr(7, 12, 6, 3, Q.fur);
    pr(5, 14, 10, 11, Q.shirt);
    pr(5, 14, 10, 2, Q.shirtLt);
    pr(5, 24, 10, 1, Q.shirtDk);
    pr(4, 16, 2, 3, Q.shirt);
    pr(14, 16, 2, 3, Q.shirt);
    pr(8, 18, 4, 1, Q.z);
    pr(10, 19, 2, 1, Q.z);
    pr(8, 20, 2, 1, Q.z);
    pr(8, 21, 4, 1, Q.z);
    pr(5, 3, 10, 10, Q.fur);
    pr(4, 5, 1, 6, Q.fur);
    pr(15, 5, 1, 6, Q.fur);
    pr(5, 3, 10, 2, Q.furLt);
    pr(6, 2, 8, 1, Q.fur);
    pr(4, 2, 2, 2, Q.fur);
    pr(14, 2, 2, 2, Q.fur);
    pr(4, 2, 1, 1, Q.furLt);
    pr(14, 2, 1, 1, Q.furLt);
    pr(6, 9, 8, 4, Q.muzzle);
    pr(8, 9, 4, 2, Q.nose);
    const blink = (frame + 10) % 23 === 0;
    const closed = blink || c.mood === "sleepy" || c.mood === "sad";
    if (closed) {
      pr(6, 7, 2, 1, Q.eye);
      pr(12, 7, 2, 1, Q.eye);
    } else if (c.mood === "happy" || c.mood === "proud" || c.mood === "excited") {
      pr(6, 7, 1, 1, Q.eye);
      pr(7, 6, 1, 1, Q.eye);
      pr(13, 6, 1, 1, Q.eye);
      pr(12, 7, 1, 1, Q.eye);
    } else {
      pr(6, 6, 2, 2, Q.eye);
      pr(12, 6, 2, 2, Q.eye);
      pr(6, 6, 1, 1, Q.hl);
      pr(12, 6, 1, 1, Q.hl);
    }
    pr(5, 9, 2, 1, Q.blush);
    pr(13, 9, 2, 1, Q.blush);
    pr(9, 12, 2, 1, Q.nose);
    drawLimb(ctx, U, 14, 18, P.aF, 5, 2.6, Q.fur, P.armBend, 2, Q.furDk);
    drawLimb(ctx, U, 12, 25, P.lF, 4, 3.2, Q.fur, 0, 2.1, Q.furDk);
    if (Math.abs(P.aF) < 0.6) {
      pr(13, 22, 4, 3, Q.case);
      pr(13, 22, 4, 1, Q.clasp);
      pr(14, 21, 1, 1, Q.caseDk);
    }
  }
  function drawGreen(ctx, U, h, P, c, frame, tp) {
    const Q = GREEN_PAL, pr = (x, y, w, hh, col) => pxRect(ctx, U, x, y, w, hh, col);
    pr(14, 7, 3, 2, Q.ol);
    pr(15, 4, 3, 3, Q.ol);
    pr(16, 2, 2, 3, Q.ol);
    pr(14, 7, 2, 2, Q.body);
    pr(15, 5, 2, 2, Q.body);
    pr(16, 3, 2, 2, Q.blue);
    pr(16, 2, 1, 2, Q.blueLt);
    pr(18, 1, 1, 2, Q.orange);
    pr(19, 3, 1, 2, Q.orangeLt);
    pr(18, 4, 1, 1, Q.orange);
    pr(2, 18, 4, 4, Q.ol);
    pr(2, 18, 4, 3, Q.blue);
    pr(3, 18, 2, 2, Q.blueLt);
    drawLimb(ctx, U, 8, 20, P.lB, 3, 3.2, Q.bodyDk, 0, 2.6, Q.orange);
    drawLimb(ctx, U, 12, 20, P.lF, 3, 3.2, Q.body, 0, 2.6, Q.orange);
    pr(4, 12, 12, 10, Q.ol);
    pr(5, 12, 10, 9, Q.body);
    pr(5, 12, 10, 2, Q.bodyLt);
    pr(5, 20, 10, 1, Q.bodyDk);
    pr(5, 13, 3, 7, Q.blue);
    pr(5, 13, 3, 1, Q.blueLt);
    pr(6, 19, 2, 1, Q.bodyDk);
    pr(10, 15, 1, 1, Q.blue);
    pr(12, 15, 1, 1, Q.blue);
    pr(9, 17, 1, 1, Q.blue);
    pr(11, 17, 1, 1, Q.blue);
    pr(13, 17, 1, 1, Q.blue);
    pr(4, 3, 11, 10, Q.ol);
    pr(5, 3, 9, 9, Q.body);
    pr(5, 3, 9, 2, Q.bodyLt);
    pr(7, 1, 3, 2, Q.body);
    pr(5, 0, 3, 2, Q.bodyLt);
    pr(4, 1, 2, 2, Q.blue);
    pr(6, 6, 3, 3, Q.lens);
    pr(10, 6, 3, 3, Q.lens);
    pr(6, 5, 3, 1, Q.ol);
    pr(6, 9, 3, 1, Q.ol);
    pr(5, 6, 1, 3, Q.ol);
    pr(9, 6, 1, 3, Q.ol);
    pr(10, 5, 3, 1, Q.ol);
    pr(10, 9, 3, 1, Q.ol);
    pr(13, 6, 1, 3, Q.ol);
    pr(9, 6, 1, 1, Q.ol);
    const blink = (frame + 3) % 31 === 0;
    if (!blink) {
      pr(7, 7, 2, 2, Q.eye);
      pr(11, 7, 2, 2, Q.eye);
      pr(7, 7, 1, 1, Q.hl);
      pr(11, 7, 1, 1, Q.hl);
    } else {
      pr(6, 7, 3, 1, Q.eye);
      pr(10, 7, 3, 1, Q.eye);
    }
    pr(8, 9, 4, 2, Q.orange);
    pr(8, 9, 4, 1, Q.orangeLt);
    pr(8, 11, 3, 1, Q.orangeDk);
    pr(11, 10, 1, 2, Q.orangeDk);
  }
  function drawCapy(ctx, U, h, P, c, frame, tp) {
    const Q = CAPY_PAL, pr = (x, y, w, hh, col) => pxRect(ctx, U, x, y, w, hh, col);
    drawLimb(ctx, U, 4, 18, P.aB, 4, 2.8, Q.furDk, P.armBend, 2.3, Q.fur);
    drawLimb(ctx, U, 7, 25, P.lB, 2, 3.4, Q.furDk, 0, 2.3, Q.fur);
    pr(3, 15, 14, 11, Q.ol);
    pr(4, 15, 12, 10, Q.shirt);
    pr(4, 15, 12, 2, Q.shirtLt);
    pr(4, 24, 12, 1, Q.shirtDk);
    pr(5, 23, 10, 3, Q.cream);
    pr(5, 23, 10, 1, Q.creamDk);
    pr(8, 18, 5, 1, Q.z);
    pr(11, 19, 1, 1, Q.z);
    pr(10, 20, 1, 1, Q.z);
    pr(9, 21, 1, 1, Q.z);
    pr(8, 22, 5, 1, Q.z);
    drawLimb(ctx, U, 13, 25, P.lF, 2, 3.4, Q.furDk, 0, 2.3, Q.fur);
    pr(2, 3, 16, 13, Q.ol);
    pr(3, 4, 14, 11, Q.fur);
    pr(3, 4, 14, 2, Q.furLt);
    pr(5, 3, 10, 2, Q.furDk);
    pr(3, 2, 3, 3, Q.ol);
    pr(14, 2, 3, 3, Q.ol);
    pr(4, 2, 2, 2, Q.furDk);
    pr(15, 2, 2, 2, Q.furDk);
    pr(6, 9, 8, 6, Q.cream);
    pr(6, 9, 8, 1, Q.creamDk);
    const blink = (frame + 7) % 26 === 0;
    if (blink) {
      pr(4, 8, 4, 1, Q.eye);
      pr(12, 8, 4, 1, Q.eye);
    } else {
      pr(4, 7, 3, 1, Q.eye);
      pr(3, 8, 1, 1, Q.eye);
      pr(7, 8, 1, 1, Q.eye);
      pr(13, 7, 3, 1, Q.eye);
      pr(12, 8, 1, 1, Q.eye);
      pr(16, 8, 1, 1, Q.eye);
    }
    pr(8, 10, 4, 3, Q.nose);
    pr(9, 10, 2, 1, Q.noseHl);
    pr(8, 13, 4, 1, Q.eye);
    pr(9, 14, 3, 1, Q.mouth);
    pr(10, 14, 1, 1, Q.tongue);
    pr(3, 11, 2, 2, Q.blush);
    pr(15, 11, 2, 2, Q.blush);
    pr(0, 10, 3, 1, Q.furDk);
    pr(0, 12, 3, 1, Q.furDk);
    pr(17, 10, 3, 1, Q.furDk);
    pr(17, 12, 3, 1, Q.furDk);
    drawLimb(ctx, U, 16, 18, P.aF, 4, 2.8, Q.furDk, P.armBend, 2.3, Q.fur);
  }
  const MASCOT_DRAW = { laotter: drawLaotter, navi: drawNavi, toro: drawToro, greennode: drawGreen, capy: drawCapy };
  function drawCritterImg(ctx, c, key, sx, sy, z, frame, t) {
    const cfg = CRIT[c._key] || CRIT._mascot;
    const h = 30 * z;
    const ph = c._h || 0,
      tp = t + ph;
    const top = sy + 8 * z - h;
    let ty = 0,
      tx = 0,
      sX = 1,
      sY = 1,
      rot = 0,
      wag = 0;
    if (c.state === "walk" && c.path && c.path.length) {
      const ws = tp * 9,
        stride = Math.sin(ws),
        land = 1 - Math.abs(stride);
      ty += -Math.abs(stride) * 2 * z;
      sY *= 1 - land * 0.05;
      sX *= 1 + land * 0.04;
      rot += Math.cos(ws) * 0.03 * cfg.amp;
    } else if (c.state === "nap") {
      const b = Math.sin(tp * 0.7) * 0.05;
      sY *= 1 + b;
      sX *= 1 - b * 0.6;
      ty += 1 * z;
    } else if (c.state === "sit") {
      sY *= 0.9;
      sX *= 1.06;
      sY *= 1 + Math.sin(tp * 1.2) * 0.015;
    } else {
      const b = Math.sin(tp * 1.6) * cfg.breath;
      sY *= 1 + b;
      sX *= 1 - b * 0.5;
    }
    const m = c.mood,
      A = cfg.amp;
    if (m === "happy") ty += -Math.abs(Math.sin(tp * 5)) * 3 * A * z;
    else if (m === "excited") {
      ty += -Math.abs(Math.sin(tp * 9)) * 4 * A * z;
      tx += Math.sin(tp * 22) * 1 * A * z;
    } else if (m === "curious") rot += Math.sin(tp * 3) * 0.12 * A;
    else if (m === "sleepy") {
      sY *= 0.97;
      rot += 0.05;
    } else if (m === "sad") {
      sY *= 0.92;
      sX *= 1.05;
      rot += -0.04;
    } else if (m === "love") {
      ty += -Math.abs(Math.sin(tp * 4)) * 2.5 * z;
      rot += Math.sin(tp * 4) * 0.05;
    } else if (m === "scared") {
      tx += Math.sin(tp * 40) * 1.3 * A * z;
      sY *= 1.06;
    } else if (m === "proud") {
      sX *= 1.06;
      sY *= 1.03;
    } else if (m === "mischief") rot += Math.sin(tp * 6) * 0.08;
    const an = c.anim;
    const animP = an ? Math.max(0, Math.min(1, (t - an.t0) / an.dur)) : -1;
    if (an) {
      const p = Math.max(0, Math.min(1, (t - an.t0) / an.dur)),
        k = an.kind,
        n = an.n || 1;
      if (k === "hop") {
        const seg = p * n,
          hp = seg - Math.floor(Math.min(n - 1e-3, seg)),
          up = Math.sin(Math.PI * hp);
        ty += -up * cfg.hopH * z * an.amp;
        sY *= 1 + up * 0.1 - (1 - up) * 0.04;
        sX *= 1 - up * 0.06 + (1 - up) * 0.03;
      } else if (k === "jiggle") {
        const d = 1 - p;
        rot += Math.sin(p * 6.28 * 3) * cfg.wob * d;
        sY *= 1 + Math.sin(p * 6.28 * 3) * 0.02 * d;
      } else if (k === "shake") {
        const d = 1 - p;
        tx += Math.sin(p * 6.28 * 8) * 2.2 * z * d * an.amp;
      } else if (k === "headtilt") rot += Math.sin(Math.PI * p) * 0.16 * an.amp;
      else if (k === "nod") {
        const dip = Math.abs(Math.sin(p * 6.28));
        sY *= 1 - dip * 0.07;
        ty += dip * 1.5 * z;
      } else if (k === "spin") {
        sX *= Math.cos(Math.PI * 2 * p);
        ty += -Math.sin(Math.PI * p) * 3 * z;
      } else if (k === "startle") {
        const j = p < 0.25 ? p / 0.25 : (1 - p) / 0.75;
        ty += -j * cfg.hopH * 1.3 * z * an.amp;
        sY *= 1 + (p < 0.25 ? 0.12 * j : -0.05 * j);
      } else if (k === "tailwag") wag += Math.sin(p * 6.28 * 2) * (1 - p) * 0.1 * an.amp;
    }
    sY = Math.max(0.4, Math.min(1.8, sY));
    const facing = c.path && c.path.length ? c.faceLR || c.dir : c.faceDir || c.faceLR || c.dir;
    const dir = facing === "left" ? -1 : 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(sx + tx * dir, top + ty);
    if (dir < 0) ctx.scale(-1, 1);
    if (wag) ctx.transform(1, 0, -wag, 1, wag * h, 0);
    ctx.translate(0, h);
    if (rot) ctx.rotate(rot);
    ctx.scale(sX, sY);
    ctx.translate(0, -h);
    const P = pose(c, tp, tp * 9, an, animP, c.state, c.mood);
    (MASCOT_DRAW[key] || drawToro)(ctx, z, h, P, c, frame, tp);
    ctx.restore();
    if (c.state === "nap" && (frame >> 3) % 2) {
      ctx.fillStyle = "rgba(42,38,34,0.82)";
      ctx.font = "800 " + Math.round(7 * z) + "px ui-monospace, monospace";
      ctx.fillText("z", sx + 9 * z, top);
    }
    drawCritterFx(ctx, c, sx, top + ty, z, frame, tp);
  }
  function drawCritterFx(ctx, c, sx, top, z, frame, tp) {
    const m = c.mood;
    if (m === "scared" || m === "sad") {
      const dy = (tp * 60) % 14;
      ctx.fillStyle = "rgba(127,181,230,0.9)";
      ctx.beginPath();
      ctx.arc(sx + 9 * z, top + 6 * z + dy, 1.6 * z, 0, 6.283);
      ctx.fill();
    }
    if (m === "love") {
      for (let i = 0; i < 2; i++) {
        const f = (tp * 1.2 + i * 0.6) % 1;
        ctx.globalAlpha = 1 - f;
        ctx.fillStyle = "#E0457B";
        ctx.fillRect(sx - 6 * z + i * 10 * z, top - f * 16 * z, 2 * z, 2 * z);
      }
      ctx.globalAlpha = 1;
    }
    if (m === "proud" && (frame >> 1) % 2) {
      ctx.fillStyle = "#F5C542";
      ctx.fillRect(sx + 7 * z, top + 2 * z, 2 * z, 2 * z);
      ctx.fillRect(sx - 9 * z, top + 5 * z, 1.5 * z, 1.5 * z);
    }
    if (c.anim && c.anim.kind === "spin") {
      const a = (tp * 4) % 6.283;
      ctx.fillStyle = "#F5C542";
      for (let i = 0; i < 3; i++) {
        const aa = a + i * 2.09;
        ctx.fillRect(sx + Math.cos(aa) * 8 * z, top + Math.sin(aa) * 3 * z, 1.5 * z, 1.5 * z);
      }
    }
    if (c.landFx && performance.now() / 1000 < c.landFx) {
      ctx.fillStyle = "rgba(140,120,90,0.5)";
      ctx.fillRect(sx - 7 * z, top + 28 * z, 14 * z, 2 * z);
    }
  }
  function drawAgent(ctx, a, frame, t = frame / 6) {
    if (a.state === "down") return drawDown(ctx, a, frame);
    if (a.state === "reviving") return drawRevive(ctx, a, frame, t);
    if (a.restUntil && t < a.restUntil) return drawRest(ctx, a, frame);
    if (M.g(a.tx, a.ty) === M.POOL) return drawSwim(ctx, a, frame, t);
    if ((a.state === "social" || a.state === "idle") && !a.moving && !a.exercise) {
      const seat = SOFA_SEATS[a.ty * M.W + a.tx];
      if (seat && Math.round(a.px) === seat.x && Math.round(a.py) === seat.y) return drawSofaSit(ctx, a, frame, t);
    }
    if (a.state === "social" && !a.moving && a.exercise) return drawExercise(ctx, a, frame, t);
    if (a.state === "working" && !a.moving && a.tx === a.deskTile[0] && a.ty === a.deskTile[1]) return drawSit(ctx, a, frame, t);
    if (a.gameResUntil && t < a.gameResUntil && !a.gameWin && !a.moving) {
      ctx.save();
      ctx.translate(0, 1);
      drawStanding(ctx, a, frame, t);
      ctx.restore();
      return;
    }
    const cel = a.emote && (a.emote.kind === "idea" || a.emote.kind === "party" || a.emote.kind === "fire" || a.emote.kind === "love" || a.emote.kind === "mindblown" || a.emote.kind === "star");
    if (cel && !a.moving) {
      const hop = Math.abs(Math.sin(frame * 0.5 + a._h)) * 5;
      ctx.save();
      ctx.translate(0, -hop);
      drawStanding(ctx, a, frame, t);
      ctx.restore();
      return;
    }
    drawStanding(ctx, a, frame, t);
  }
  const EMOTE_COLORS = {
    k: "#2A2622",
    w: "#FFFDF7",
    b: "#7A4A2B",
    g: "#1F8A48",
    y: "#F5C542",
    r: "#DC2626",
    o: "#F5A623",
    c: "#7FB5E6",
    p: "#E0457B"
  };
  const EMOTE_MAPS = {
    coffee: ["..w..w..", ".w..w...", "kkkkkk..", "kbbbbk.k", "kbbbbkkk", "kbbbbk.k", "kkkkkk..", "........"],
    music: ["...kkkk.", "...k..k.", "...k..k.", "...k..k.", "...k..k.", ".kkk.kkk", ".kkk.kkk", "........"],
    ball: ["..kkkk..", ".kwwwwk.", "kwwwkwwk", "kwwkkkwk", "kwwwkwwk", ".kwwwwk.", "..kkkk..", "........"],
    think: ["..kkkk..", ".kwwwwk.", "kwwwwwwk", "kwwwwwwk", ".kwwwwk.", "..kkkk..", "..k.....", ".k......"],
    idea: ["..kkk...", ".kyyyk..", "kyoyoyk.", "kyyyyyk.", ".kyyyk..", "..kkk...", "..kkk...", "...k...."],
    party: ["r..g..y.", ".k.r.k..", "..kkk.g.", ".kyyyk..", "y.kkk.r.", "g.k.k.y.", ".r...g..", "k..y..r."],
    worry: ["...c....", "...c....", "..ccc...", ".ccwcc..", ".ccccc..", ".ccccc..", "..ccc...", "........"],
    mindblown: ["y..r..y.", ".y.r.y..", "..rrr...", "rryoyrr.", "..rrr...", ".y.r.y..", "y..r..y.", "........"],
    fire: ["...r....", "...ro...", "..rro...", ".rroyo..", ".royyo..", "royyyyo.", ".oyyyo..", "..ooo..."],
    cool: [".wwwwww.", "wwwwwwww", "wwwwwwww", "kkkkkkkk", "kk.kk.kk", "wwwwwwww", "ww.kk.ww", ".wwwwww."],
    love: [".pp.pp..", "pppppppp", "pppppppp", "pppppppp", ".pppppp.", "..pppp..", "...pp...", "........"],
    question: ["..kkk...", ".kwwwk..", "kw..wk..", "...kwk..", "...kw...", "...k....", "........", "...k...."],
    exclaim: ["...kk...", "..kwwk..", "..kwwk..", "..kwwk..", "...kk...", "........", "...kk...", "...kk..."],
    heart: [".rr.rr..", "rrrrrrrr", "rrrrrrrr", "rrrrrrrr", ".rrrrrr.", "..rrrr..", "...rr...", "........"],
    star: ["...y....", "...y....", ".yyyyy..", "..yyy...", ".yy.yy..", "y.....y.", "........", "........"],
    wave: ["..o..o..", "..o..o..", "..oooo..", "k.oooo..", "kkoooo..", ".kooooo.", "..ooooo.", "...oooo."],
    grin: ["kk....kk", ".k....k.", "........", "..kkkk..", "kwwwwwwk", ".wkkkkw.", "..wwww..", "........"],
    dot3: ["........", "........", "........", "........", "........", "........", "k..k..k.", "........"]
  };
  const RELAX_EMOTE = {
    cafe: "coffee",
    park: "music",
    courtyard: "music",
    atrium: "idea",
    lobby: "music",
    store: "coffee",
    game: "grin"
  };
  function drawEmote(ctx2, a, sx, sy, z, frame) {
    const e = a.emote;
    const u = Math.max(2, Math.round(z * 0.9));
    const bob = (frame >> 1) % 2 ? -u * 0.5 : 0;
    const ex = Math.round(sx + 10 * (z / 3)),
      ey = Math.round(sy - 34 * (z / 3) + bob);
    if (e.kind === "zzz") {
      ctx2.font = "700 " + (10 + z * 1.4) + "px ui-monospace, Menlo, monospace";
      ctx2.fillStyle = "rgba(42,38,34,0.85)";
      const ph = (frame >> 1) % 4;
      for (let i = 0; i < 3; i++) {
        if (i > ph) break;
        ctx2.fillText("z", ex + i * (4 + z * 1.6), ey - i * (3 + z * 1.8));
      }
      return;
    }
    const map = EMOTE_MAPS[e.kind];
    if (!map) return;
    const pad = u;
    const w = 8 * u + pad * 2,
      h = 8 * u + pad * 2;
    ctx2.fillStyle = "#FFFDF7";
    ctx2.fillRect(ex - pad, ey - h + pad, w, h);
    ctx2.strokeStyle = "#2A2622";
    ctx2.lineWidth = 2;
    ctx2.strokeRect(ex - pad + 1, ey - h + pad + 1, w - 2, h - 2);
    const steamOff = e.kind === "coffee" && (frame >> 1) % 2 === 0;
    for (let ry = 0; ry < 8; ry++) {
      if (steamOff && ry < 2) continue;
      const row = map[ry];
      for (let rx = 0; rx < 8; rx++) {
        const c = row[rx];
        if (c === ".") continue;
        ctx2.fillStyle = EMOTE_COLORS[c] || "#2A2622";
        ctx2.fillRect(ex + rx * u, ey - h + pad + u + ry * u, u, u);
      }
    }
  }
  function drawAlert(ctx2, sx, sy, z, frame) {
    const r = 8 + z;
    const y = sy - 34 * (z / 3) - ((frame >> 1) % 2 ? 2 : 0);
    ctx2.beginPath();
    ctx2.arc(sx, y, r, 0, Math.PI * 2);
    ctx2.fillStyle = "#DC2626";
    ctx2.fill();
    ctx2.strokeStyle = "rgba(255,255,255,0.92)";
    ctx2.lineWidth = 2;
    ctx2.stroke();
    ctx2.fillStyle = "#fff";
    ctx2.font = "800 " + (r + 4) + "px var(--font-body), -apple-system, sans-serif";
    ctx2.textAlign = "center";
    ctx2.fillText("!", sx, y + r * 0.42);
    ctx2.textAlign = "left";
  }
  function create(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const mapCanvas = M.renderMap();
    const stampBlocks = () => {
      try {
        M.stampLogoBlocks(mapCanvas);
      } catch (e) {}
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(stampBlocks);else stampBlocks();
    const SPEED = 48;
    const agents = D.AGENTS.map(def => {
      const [dx, dy] = nearestSpawn(def.desk.x, def.desk.y + 1);
      return {
        id: def.id,
        def,
        tx: dx,
        ty: dy,
        px: dx * T + 8,
        py: dy * T + 8,
        path: [],
        moving: false,
        dir: "down",
        state: "working",
        mood: "neutral",
        moodUntil: 0,
        _h: (def.id.charCodeAt(0) + (def.id.charCodeAt(2) || 7)) % 17,
        stateUntil: 0,
        bubble: null,
        scripted: false,
        emote: null,
        relaxKind: null,
        pendingRelax: null,
        inHuddle: false,
        inDuo: false,
        gesture: null,
        pauseUntil: 0,
        _duoCd: 0,
        _handoff: null,
        crashErr: null,
        reviveUntil: 0,
        _wet: 0,
        coffeeUntil: 0,
        brewUntil: 0,
        _bmx: 0,
        _bmy: 0,
        gameUntil: 0,
        gameResUntil: 0,
        gameWin: false,
        _gameM: 0,
        _vsId: null,
        snackStage: 0,
        snackAt: 0,
        _snX: 0,
        _snY: 0,
        _snC: 0,
        restPending: false,
        restUntil: 0,
        petalUntil: 0,
        _ry: 0,
        _nodT: 0,
        deskTile: [dx, dy],
        stats: {
          tasks: 0,
          tokens: 0,
          uptime: null
        }
      };
    });
    const byId = {};
    agents.forEach(a => byId[a.id] = a);
    const world = {
      agents,
      byId,
      _navi: {
        px: 41 * T + 8,
        py: 19 * T + 8,
        tx: 41,
        ty: 19,
        path: [],
        dir: "right",
        state: "idle",
        until: 0,
        meow: null,
        _key: "_navi",
        faceX: null,
        _h: 1.6,
        mood: "neutral",
        moodUntil: 0,
        emote: null,
        anim: null,
        aiState: "",
        target: null,
        faceDir: null,
        faceLR: "right",
        social: 0,
        nextScan: 0,
        cd: 0,
        partnerCd: 0,
        _mode: null,
        act: null,
        actUntil: 0,
        hold: 0,
        landFx: 0,
        _toolCd: 0
      },
      _capy: {
        px: 44 * T + 8,
        py: 27 * T + 8,
        tx: 44,
        ty: 27,
        path: [],
        dir: "left",
        state: "idle",
        until: 0,
        meow: null,
        _key: "_capy",
        faceX: null,
        _h: 2.4,
        mood: "neutral",
        moodUntil: 0,
        emote: null,
        anim: null,
        aiState: "",
        target: null,
        faceDir: null,
        faceLR: "left",
        social: 0,
        nextScan: 0,
        cd: 0,
        partnerCd: 0,
        _mode: null,
        act: null,
        actUntil: 0,
        hold: 0,
        landFx: 0,
        _toolCd: 0
      },
      _green: {
        px: 39 * T + 8,
        py: 16 * T + 8,
        tx: 39,
        ty: 16,
        path: [],
        dir: "left",
        state: "idle",
        until: 0,
        meow: null,
        _key: "_green",
        faceX: null,
        _h: 3.1,
        mood: "neutral",
        moodUntil: 0,
        emote: null,
        anim: null,
        aiState: "",
        target: null,
        faceDir: null,
        faceLR: "left",
        social: 0,
        nextScan: 0,
        cd: 0,
        partnerCd: 0,
        _mode: null,
        act: null,
        actUntil: 0,
        hold: 0,
        landFx: 0,
        _toolCd: 0
      },
      cam: {
        x: M.W * T / 2,
        y: M.H * T / 2 - 40,
        zoom: 3
      },
      settings: {
        labels: true,
        bubbles: true,
        speed: 1,
        night: false,
        incidents: false,
        liveliness: 1,
        sound: true
      },
      onActivity: opts.onActivity || (() => {}),
      onAgentClick: opts.onAgentClick || (() => {}),
      onTick: opts.onTick || (() => {}),
      time: utc7Minutes(),
      fx: [],
      selected: null,
      _raf: 0,
      _last: 0,
      _frame: 0,
      _bubbleSeq: 0
    };
    function say(a, text, dur = 4.5, opts2 = {}) {
      if (!world.settings.bubbles && !a.scripted && !opts2.force) return;
      a.bubble = {
        text,
        until: now() + dur,
        tone: opts2.tone || null,
        t0: now()
      };
    }
    function now() {
      return performance.now() / 1000;
    }
    function sendTo(a, tile, state) {
      const [tx2, ty2] = nearestWalkable(tile.x ?? tile[0], tile.y ?? tile[1]);
      const p = findPath(a.tx, a.ty, tx2, ty2);
      a.emote = null;
      a.relaxKind = null;
      a.exercise = null;
      a.hasBall = false;
      a.pauseUntil = 0;
      a._handoff = null;
      if (p) {
        a.path = smoothPath([[a.tx, a.ty], ...p]).slice(1);
        a.moving = a.path.length > 0;
        a.nextState = state || a.state;
        if (p.length) a.state = "moving";
      }
      if (!p || !p.length) {
        a.state = state || a.state;
        a.moving = false;
        applyArrival(a);
      }
    }
    function applyArrival(a) {
      if (!M.walkable(a.tx, a.ty) && !SOFA_SEATS[a.ty * M.W + a.tx]) {
        const [wx, wy] = nearestWalkable(a.tx, a.ty);
        a.tx = wx;
        a.ty = wy;
        a.px = wx * T + 8;
        a.py = wy * T + 8;
      }
      if (a.pendingRelax) {
        a.relaxKind = a.pendingRelax;
        a.pendingRelax = null;
        if (a.relaxKind === "gym") {
          a.exercise = a.relaxSpot?.ex || "run";
        } else if (a.relaxKind !== "pool") {
          const fun = ["cool", "love", "fire", "party"];
          const kind = Math.random() < 0.35 ? fun[Math.random() * fun.length | 0] : RELAX_EMOTE[a.relaxKind];
          if (kind) a.emote = {
            kind,
            until: now() + 12 + Math.random() * 8
          };
        }
        a.relaxSpot = null;
        if (a.relaxKind === "cafe") {
          let bm = null,
            bd = 1e9;
          for (let i = 0; i < COFFEE_MACHINES.length; i++) {
            const cd = Math.abs(COFFEE_MACHINES[i].x + 8 - a.px) + Math.abs(COFFEE_MACHINES[i].y + 8 - a.py);
            if (cd < bd) {
              bd = cd;
              bm = COFFEE_MACHINES[i];
            }
          }
          if (bm) {
            a._bmx = bm.x;
            a._bmy = bm.y;
            a.brewUntil = now() + 2.5;
            const bdx = bm.x + 8 - a.px,
              bdy = bm.y + 8 - a.py;
            a.dir = Math.abs(bdx) > Math.abs(bdy) ? bdx > 0 ? "right" : "left" : bdy > 0 ? "down" : "up";
          }
        } else if (a.relaxKind === "game") {
          let gm = ARCADE_PX[0],
            gd = 1e9;
          for (let i = 0; i < ARCADE_PX.length; i++) {
            const cd = Math.abs(ARCADE_PX[i] + 8 - a.px);
            if (cd < gd) {
              gd = cd;
              gm = ARCADE_PX[i];
            }
          }
          a._gameM = gm;
          a.gameUntil = now() + 6 + Math.random() * 4;
          a.gameResUntil = 0;
          a.dir = "up";
        } else if (a.relaxKind === "store") {
          if (!a.snackStage) {
            let sh = null,
              sd = 1e9;
            for (let i = 0; i < SHELVES.length; i++) {
              const cd = Math.abs(SHELVES[i].x + 8 - a.px) + Math.abs(SHELVES[i].y + 8 - a.py);
              if (cd < sd) {
                sd = cd;
                sh = SHELVES[i];
              }
            }
            if (sh) {
              a._snX = sh.x;
              a._snY = sh.y;
              a._snC = a._h % 4;
              a.snackStage = 1;
              a.snackAt = now() + 0.6;
              a.stateUntil = now() + 22;
              const sdx = sh.x + 8 - a.px,
                sdy = sh.y + 8 - a.py;
              a.dir = Math.abs(sdx) > Math.abs(sdy) ? sdx > 0 ? "right" : "left" : sdy > 0 ? "down" : "up";
            }
          } else if (a.snackStage === 2) {
            a.snackStage = 3;
            a.snackAt = now() + 0.5;
          } else if (a.snackStage === 4) {
            a.snackStage = 5;
            a.snackAt = now() + 4;
            a.dir = "down";
          }
        }
      }
      const seat = SOFA_SEATS[a.ty * M.W + a.tx];
      if (seat && (a.state === "social" || a.state === "idle")) {
        a.px = seat.x;
        a.py = seat.y;
        a.dir = "down";
      }
    }
    function busy(a) {
      return a.scripted || a.inHuddle || a.inDuo || !!a._ry || a.state === "down" || a.state === "reviving";
    }
    function ambient(a, t) {
      if (busy(a)) return;
      if (a.pauseUntil && t < a.pauseUntil) return;
      if (t < a.stateUntil || a.moving) return;
      const live = world.settings.liveliness;
      const r = Math.random();
      if (a.state === "working") {
        const relaxP = (a.scripted ? 0.18 : 0.55) * live;
        if (r < relaxP) {
          const hr = world.time / 60;
          const byHour = hr < 10 ? ["cafe", "cafe", "lobby", "atrium", "park", "store"] : hr < 14 ? ["court", "gym", "pool", "pool", "cafe", "game"] : hr < 18 ? ["park", "court", "atrium", "courtyard", "gym", "game"] : ["park", "cafe", "lobby", "pool", "atrium"];
          const keys = byHour.filter(k => D.PLACES[k] && D.PLACES[k].spots);
          const key = keys[Math.random() * keys.length | 0];
          const place = D.PLACES[key];
          const spot = place.spots[Math.random() * place.spots.length | 0];
          a.pendingRelax = key;
          a.relaxSpot = spot;
          sendTo(a, spot, "social");
          a.stateUntil = t + 14 + Math.random() * 10;
          world.onActivity({
            agentId: a.id,
            kind: key
          });
        } else if (r < relaxP + 0.06) {
          a.state = "idle";
          a.emote = {
            kind: "zzz",
            until: t + 8 + Math.random() * 4
          };
          a.stateUntil = t + 9 + Math.random() * 5;
          world.onActivity({
            agentId: a.id,
            kind: "nap"
          });
        } else {
          if (a.scripted && r > 0.45) say(a, D.AMBIENT_WORK[Math.random() * D.AMBIENT_WORK.length | 0]);
          else if (!a.scripted && r > 0.6) say(a, D.AMBIENT_CHAT[Math.random() * D.AMBIENT_CHAT.length | 0]);
          a.stateUntil = t + 7 + Math.random() * 9;
        }
      } else if (a.state === "social" || a.state === "idle") {
        if (a.relaxKind === "pool" && r < 0.8) {
          const targetX = a.tx >= 57 ? 54 + (Math.random() * 2 | 0) : 59 + (Math.random() * 2 | 0);
          const targetY = 4 + (Math.random() * 6 | 0);
          a.pendingRelax = "pool";
          sendTo(a, {
            x: targetX,
            y: targetY
          }, "social");
          a.stateUntil = t + 3 + Math.random() * 3;
          return;
        }
        if (a.relaxKind === "court" && r < 0.75) {
          a.stateUntil = t + 2 + Math.random() * 3;
          return;
        }
        if (r < 0.5 && !a.emote) say(a, D.AMBIENT_CHAT[Math.random() * D.AMBIENT_CHAT.length | 0]);
        if (r < (a.scripted ? 0.4 : 0.18)) {
          sendTo(a, {
            x: a.deskTile[0],
            y: a.deskTile[1]
          }, "working");
          a.stateUntil = t + 16 + Math.random() * 14;
          world.onActivity({
            agentId: a.id,
            kind: "resume"
          });
        } else a.stateUntil = t + 6 + Math.random() * 6;
      }
    }
    const SPORT_VENUES = ["court"];
    world._sport = world._sport || { court: null };
    const venuePlayers = venue => agents.filter(a => a.relaxKind === venue && !a.moving && (a.state === "social" || a.state === "idle") && M.g(a.tx, a.ty) !== M.POOL);
    function sportTick(t) {
      if (!world.fx) world.fx = [];
      for (const venue of SPORT_VENUES) {
        const players = venuePlayers(venue);
        if (players.length < 2) {
          players.forEach(p => { p.hasBall = false; });
          world._sport[venue] = null;
          continue;
        }
        let g = world._sport[venue];
        const holderOk = g && byId[g.holderId] && byId[g.holderId].relaxKind === venue && !byId[g.holderId].moving && M.g(byId[g.holderId].tx, byId[g.holderId].ty) !== M.POOL;
        if (!holderOk) {
          const h = players[Math.random() * players.length | 0];
          g = world._sport[venue] = { holderId: h.id, nextAt: t + 0.6 + Math.random(), inFlight: false, handoffAt: 0, pendingId: null };
        }
        if (g.handoffAt && t >= g.handoffAt) {
          if (g.pendingId && byId[g.pendingId] && byId[g.pendingId].relaxKind === venue) g.holderId = g.pendingId;
          g.handoffAt = 0;
          g.pendingId = null;
          g.inFlight = false;
          g.nextAt = t + 0.9 + Math.random() * 1.1;
        }
        players.forEach(p => { p.hasBall = p.id === g.holderId && !g.inFlight; });
        if (g.inFlight || t < g.nextAt) continue;
        const holder = byId[g.holderId];
        const others = players.filter(p => p.id !== holder.id);
        if (!others.length) { g.nextAt = t + 1; continue; }
        if (Math.random() < 0.45) {
          const runner = others[Math.random() * others.length | 0];
          const spots = D.PLACES[venue].spots || [];
          const sp = spots[Math.random() * spots.length | 0];
          if (sp && Math.abs(runner.tx - sp.x) + Math.abs(runner.ty - sp.y) > 1) {
            runner.pendingRelax = venue;
            sendTo(runner, sp, "social");
          }
        }
        if (Math.random() < 0.32) {
          const goal = { x: 6 * T + 8, y: 33 * T + 4 };
          const dur = 0.8;
          holder.shootUntil = now() + 0.7;
          world.fx.push({ kind: "bball", x0: holder.px, y0: holder.py - 10, x1: goal.x, y1: goal.y, t0: now(), dur });
          world.fx.push({ kind: "flash", x0: goal.x, y0: goal.y, x1: goal.x, y1: goal.y, t0: now() + dur, dur: 0.6, hw: 13 });
          if (Math.random() < 0.6) say(holder, "Up top!", 1.5);
          g.inFlight = true;
          g.handoffAt = t + dur + 0.5;
          g.pendingId = others[Math.random() * others.length | 0].id;
        } else {
          const recv = others[Math.random() * others.length | 0];
          const dur = 0.42;
          holder.passUntil = now() + 0.3;
          world.fx.push({ kind: "bball", x0: holder.px, y0: holder.py - 8, x1: recv.px, y1: recv.py - 8, t0: now(), dur });
          recv.recvUntil = now() + dur + 0.35;
          g.inFlight = true;
          g.handoffAt = t + dur;
          g.pendingId = recv.id;
        }
      }
    }
    let huddle = null;
    let nextHuddleT = 18 + Math.random() * 25;
    let nextPlaneT = 14 + Math.random() * 16;
    let nextPhotoT = 55 + Math.random() * 40;
    const PHOTO_SPOTS = [{ x: 40, y: 16 }, { x: 43, y: 18 }, { x: 55, y: 12 }, { x: 58, y: 12 }, { x: 44, y: 37 }, { x: 46, y: 40 }, { x: 7, y: 24 }, { x: 4, y: 27 }];
    function tryPhoto(t) {
      if (t < nextPhotoT) return;
      nextPhotoT = t + (70 + Math.random() * 60) / Math.max(0.5, world.settings.liveliness);
      if (world.settings.night || _missionActive || _meetingNow) return;
      const keys = ["_navi", "_capy", "_green"].filter(k => {
        const c = world[k];
        return c && !c.act && !c.aiState && (c.state === "idle" || c.state === "sit" || c.state === "walk") && !c.path.length;
      });
      if (!keys.length) return;
      const key = pick(keys),
        c = world[key];
      const pred = a => !a.scripted && !a.inHuddle && !a._ry && !a.moving && (a.state === "working" || a.state === "idle" || a.state === "social");
      const a = nearestAgent(c, pred, 12) || pick(agents.filter(pred));
      if (!a) return;
      let spot = PHOTO_SPOTS[0],
        bd = 1e9;
      for (const s of PHOTO_SPOTS) {
        const d2 = Math.hypot(s.x - a.tx, s.y - a.ty);
        if (d2 < bd) {
          bd = d2;
          spot = s;
        }
      }
      world.takePhoto(key, [a.id], { tile: spot });
    }
    function tryPlane(t) {
      if (t < nextPlaneT) return;
      nextPlaneT = t + (32 + Math.random() * 55) / Math.max(0.5, world.settings.liveliness);
      if (world.settings.night) return;
      const ry = () => (33 + (Math.random() * 8 | 0)) * T + 6;
      const ax = (10 + (Math.random() * 31 | 0)) * T + 8,
        bx = (10 + (Math.random() * 31 | 0)) * T + 8;
      if (Math.abs(ax - bx) < 5 * T) return;
      world.fx.push({ kind: "plane", x0: ax, y0: ry(), x1: bx, y1: ry(), t0: performance.now() / 1000, dur: 1.5 + Math.random() * 0.6 });
    }
    function tryHuddle(t) {
      if (t < nextHuddleT) return;
      if (agents.some(a => a.scripted)) {
        nextHuddleT = t + 15;
        return;
      }
      const free = agents.filter(a => !busy(a) && !a.moving && (a.state === "working" || a.state === "idle" || a.state === "social"));
      if (free.length < 2) {
        nextHuddleT = t + 10;
        return;
      }
      let group = null;
      const teams = D.TEAMS.filter(tm => tm.members.filter(id => free.find(f => f.id === id)).length >= 2);
      if (teams.length && Math.random() < 0.7) {
        const tm = teams[Math.random() * teams.length | 0];
        const ids = tm.members.filter(id => free.find(f => f.id === id));
        group = ids.slice(0, 2 + (Math.random() * 2 | 0)).map(id => byId[id]);
      } else {
        const shuffled = [...free].sort(() => Math.random() - 0.5);
        group = shuffled.slice(0, Math.random() < 0.3 ? 3 : 2);
      }
      if (!group || group.length < 2) {
        nextHuddleT = t + 10;
        return;
      }
      const topic = D.HUDDLES[Math.random() * D.HUDDLES.length | 0];
      const placeKey = topic.places[Math.random() * topic.places.length | 0];
      const spots = D.PLACES[placeKey].spots || [D.PLACES[placeKey].door];
      group.forEach((a, i) => {
        a.inHuddle = true;
        sendTo(a, spots[i % spots.length], "social");
      });
      huddle = {
        group,
        placeKey,
        lines: topic.lines,
        li: 0,
        nextLineAt: 0,
        phase: "gather",
        endAt: 0,
        gatherDeadline: t + 25
      };
      world.onActivity({
        kind: "huddle",
        agents: group.map(a => a.id),
        place: placeKey
      });
    }
    function endHuddle(t) {
      hifivePairs(huddle.group);
      huddle.group.forEach(a => {
        a.inHuddle = false;
        if (a.state !== "down" && a.state !== "reviving") {
          sendTo(a, {
            x: a.deskTile[0],
            y: a.deskTile[1]
          }, "working");
          a.stateUntil = t + 14 + Math.random() * 12;
        }
      });
      huddle = null;
      nextHuddleT = t + (45 + Math.random() * 60) / world.settings.liveliness;
    }
    function stepHuddle(t) {
      tryPlane(t);
      tryPhoto(t);
      if (!huddle) {
        tryHuddle(t);
        return;
      }
      const g = huddle.group;
      if (g.some(a => a.state === "down")) {
        endHuddle(t);
        return;
      }
      if (huddle.phase === "gather") {
        if (g.every(a => !a.moving) || t > huddle.gatherDeadline) {
          huddle.phase = "talk";
          huddle.nextLineAt = t + 0.8;
          const cx = g.reduce((s, a) => s + a.px, 0) / g.length;
          const cy = g.reduce((s, a) => s + a.py, 0) / g.length;
          g.forEach(a => {
            const dx = cx - a.px,
              dy = cy - a.py;
            if (Math.abs(dx) + Math.abs(dy) < 1) return;
            a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
          });
        }
      } else {
        if (huddle.li >= huddle.lines.length) {
          if (!huddle.endAt) huddle.endAt = t + 3.5;
          if (t > huddle.endAt) endHuddle(t);
        } else if (t >= huddle.nextLineAt) {
          const speaker = g[huddle.li % g.length];
          say(speaker, huddle.lines[huddle.li], 4.2, {
            force: true
          });
          huddle.li++;
          huddle.nextLineAt = t + 3.6 / Math.max(0.5, world.settings.speed);
        }
      }
    }
    let nextDuoT = 20 + Math.random() * 18;
    function faceEach(a, b2) {
      const dx = b2.px - a.px,
        dy = b2.py - a.py;
      if (Math.abs(dx) > Math.abs(dy)) {
        a.dir = dx > 0 ? "right" : "left";
        b2.dir = dx > 0 ? "left" : "right";
      } else {
        a.dir = dy > 0 ? "down" : "up";
        b2.dir = dy > 0 ? "up" : "down";
      }
    }
    function hifivePairs(list) {
      const t = now();
      let n = 0;
      for (let i = 0; i < list.length - 1 && n < 2; i++) {
        const a = list[i];
        if (a.state === "down" || a.state === "reviving" || a.gesture) continue;
        for (let j = i + 1; j < list.length; j++) {
          const p2 = list[j];
          if (p2.state === "down" || p2.state === "reviving" || p2.gesture) continue;
          if (Math.hypot(a.px - p2.px, a.py - p2.py) > 1.6 * T) continue;
          faceEach(a, p2);
          a.gesture = { kind: "hifive", t0: t, until: t + 0.55 };
          p2.gesture = { kind: "hifive", t0: t, until: t + 0.55 };
          const mx = (a.px + p2.px) / 2,
            my = Math.min(a.py, p2.py) - 16;
          world.fx.push({ kind: "stars", x0: mx, y0: my, x1: mx, y1: my, t0: t + 0.12, dur: 0.6 });
          n++;
          break;
        }
      }
    }
    function handoffArrive(a, t) {
      const b2 = byId[a._handoff];
      a._handoff = null;
      if (!b2 || b2.state === "down" || b2.state === "reviving") return;
      faceEach(a, b2);
      a.gesture = { kind: "lean", t0: t, until: t + 0.9 };
      b2.gesture = { kind: "nod", t0: t + 0.5, until: t + 1.4 };
      const off = b2.px >= a.px ? 4 : -4;
      world.fx.push({ kind: "paper", x0: a.px + off, y0: a.py - 8, x1: b2.px - off, y1: b2.py - 8, t0: t + 0.1, dur: 0.4 });
    }
    function duoBlocked(a) {
      return a.scripted || a.inHuddle || a.state === "down" || a.state === "reviving";
    }
    function endDuo(d, t, abort) {
      d.pair.forEach((a, i) => {
        a.inDuo = false;
        a._duoCd = t + 80 + Math.random() * 25;
        if (abort || duoBlocked(a)) return;
        a.gesture = { kind: "wave", t0: t, until: t + 0.6 };
        sendTo(a, { x: a.deskTile[0], y: a.deskTile[1] }, "working");
        a.pauseUntil = t + 0.7 + i * 0.7;
        a.stateUntil = t + 14 + Math.random() * 10;
      });
      world._duos = world._duos.filter(x => x !== d);
    }
    function stepDuo(d, t) {
      const [a, b2] = d.pair;
      if (duoBlocked(a) || duoBlocked(b2)) {
        endDuo(d, t, true);
        return;
      }
      if (d.phase === "gather") {
        if ((!a.moving && !b2.moving) || t > d.deadline) {
          d.phase = "talk";
          d.nextLineAt = t + 0.6;
          faceEach(a, b2);
        }
        return;
      }
      if (d.li >= d.lines.length) {
        if (!d.endAt) d.endAt = t + 1.2;
        if (t >= d.endAt) endDuo(d, t, false);
        return;
      }
      if (t >= d.nextLineAt) {
        const sp = d.pair[d.li % 2],
          ls = d.pair[(d.li + 1) % 2];
        const dur = 3.5 + Math.random();
        say(sp, d.lines[d.li], dur, { force: true });
        const r = Math.random();
        if (r < 0.55) ls.gesture = { kind: "nod", t0: t + 0.5, until: t + 1.3 };
        else if (r < 0.8) {
          ls.emote = { kind: "grin", until: t + 1.8 };
          ls.mood = "happy";
          ls.moodUntil = t + 2.2;
        }
        d.li++;
        d.nextLineAt = t + dur;
      }
    }
    function stepDuos(t) {
      if (!world._duos) world._duos = [];
      for (let i = world._duos.length - 1; i >= 0; i--) stepDuo(world._duos[i], t);
      if (t < nextDuoT) return;
      nextDuoT = t + 6 + Math.random() * 7;
      if (world._duos.length >= 2 || Math.random() > 0.4) return;
      if (agents.some(a => a.scripted)) return;
      const free = agents.filter(a => !busy(a) && !a.moving && t > a._duoCd && M.g(a.tx, a.ty) !== M.POOL && (a.state === "working" || a.state === "idle" || a.state === "social"));
      if (free.length < 2) return;
      const inviter = free[Math.random() * free.length | 0];
      const rest = free.filter(a => a !== inviter);
      const partner = rest[Math.random() * rest.length | 0];
      const hr = world.time / 60;
      const placePool = hr < 10 ? ["lobby", "lobby", "atrium", "atrium", "courtyard", "cafe"] : ["lobby", "atrium", "courtyard", "cafe"];
      const keys = placePool.filter(k => D.PLACES[k] && D.PLACES[k].spots && D.PLACES[k].spots.length >= 2);
      if (!keys.length) return;
      const spots = D.PLACES[keys[Math.random() * keys.length | 0]].spots;
      const near = [];
      for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) if (Math.abs(spots[i].x - spots[j].x) + Math.abs(spots[i].y - spots[j].y) <= 2) near.push([spots[i], spots[j]]);
      if (!near.length) return;
      const [s1, s2] = near[Math.random() * near.length | 0];
      const n = 3 + (Math.random() * 3 | 0);
      const lines = [];
      while (lines.length < n) {
        const pr = D.AMBIENT_DUO[Math.random() * D.AMBIENT_DUO.length | 0];
        lines.push(pr[0], pr[1]);
      }
      lines.length = n;
      inviter.inDuo = true;
      partner.inDuo = true;
      sendTo(inviter, s1, "social");
      sendTo(partner, s2, "social");
      world._duos.push({ pair: [inviter, partner], lines, li: 0, nextLineAt: 0, phase: "gather", deadline: t + 22, endAt: 0 });
      world.onActivity({ kind: "duo", agentId: inviter.id, with: partner.id });
    }
    const GREET_WORDS = ["Chào!", "Yo!", "☕?"];
    function stepGreets(t) {
      if (world._greet) {
        if (t < world._greet.until) return;
        world._greet = null;
      }
      if (t < (world._greetNext || 0)) return;
      world._greetNext = t + 0.5;
      if (!world._greetCd) world._greetCd = {};
      const movers = agents.filter(a => a.moving && a.path.length && !busy(a) && !a.pauseUntil && M.g(a.tx, a.ty) !== M.POOL);
      for (let i = 0; i < movers.length - 1; i++) {
        for (let j = i + 1; j < movers.length; j++) {
          const a = movers[i],
            b2 = movers[j];
          if (Math.hypot(a.px - b2.px, a.py - b2.py) > 1.2 * T) continue;
          const key = a.id < b2.id ? a.id + "|" + b2.id : b2.id + "|" + a.id;
          if (t < (world._greetCd[key] || 0)) continue;
          world._greetCd[key] = t + 60;
          a.pauseUntil = t + 0.5;
          b2.pauseUntil = t + 0.5;
          faceEach(a, b2);
          a.gesture = { kind: "wave", t0: t, until: t + 0.5 };
          b2.gesture = { kind: "wave", t0: t, until: t + 0.5 };
          if (Math.random() < 0.3) say(Math.random() < 0.5 ? a : b2, GREET_WORDS[Math.random() * GREET_WORDS.length | 0], 1.2);
          world._greet = { until: t + 0.5 };
          return;
        }
      }
    }
    let nextCrashT = 35 + Math.random() * 45;
    function stepIncidents(t) {
      if (!world.settings.incidents) {
        nextCrashT = Math.max(nextCrashT, t + 20);
        return;
      }
      if (t < nextCrashT) return;
      if (agents.some(a => a.scripted || a.state === "down" || a.state === "reviving")) {
        nextCrashT = t + 18;
        return;
      }
      const candidates = agents.filter(a => !a.def.lead && !a.inHuddle);
      if (candidates.length) crash(candidates[Math.random() * candidates.length | 0].id);
      nextCrashT = t + 70 + Math.random() * 80;
    }
    function crash(id, errText) {
      const a = byId[id];
      if (!a || a.state === "down" || a.state === "reviving") return;
      if (a.inHuddle && huddle) {}
      a.path = [];
      a.moving = false;
      a.emote = null;
      a.relaxKind = null;
      a.pendingRelax = null;
      a.exercise = null;
      a.brewUntil = 0;
      a.coffeeUntil = 0;
      a.gameUntil = 0;
      a.gameResUntil = 0;
      a._vsId = null;
      a.snackStage = 0;
      a.restPending = false;
      a.restUntil = 0;
      a.state = "down";
      a.crashErr = errText || D.CRASH_ERRORS[Math.random() * D.CRASH_ERRORS.length | 0];
      a.bubble = {
        text: "⚠ " + a.crashErr,
        until: now() + 7,
        tone: "error",
        t0: now()
      };
      world.onActivity({
        kind: "crash",
        agentId: id,
        err: a.crashErr
      });
    }
    function revive(id) {
      const a = byId[id];
      if (!a || a.state !== "down") return;
      a.state = "reviving";
      a.reviveUntil = now() + 2.8;
      a.bubble = {
        text: "Reviving — loading checkpoint…",
        until: a.reviveUntil,
        tone: null,
        t0: now()
      };
      world.onActivity({
        kind: "revive",
        agentId: id
      });
    }
    function stepRevive(t) {
      agents.forEach(a => {
        if (a.state === "reviving" && t > a.reviveUntil) {
          a.state = "working";
          a.crashErr = null;
          const line = D.BACK_ONLINE[Math.random() * D.BACK_ONLINE.length | 0];
          say(a, line, 4.5, {
            force: true
          });
          a.stateUntil = t + 10 + Math.random() * 8;
          if (!a.scripted && !agents.some(o => o.restPending || o.restUntil > t)) {
            a.restPending = true;
            sendTo(a, {
              x: MED_TILE_X,
              y: MED_TILE_Y
            }, "social");
            a.stateUntil = t + 26;
          } else sendTo(a, {
            x: a.deskTile[0],
            y: a.deskTile[1]
          }, "working");
          world.onActivity({
            kind: "reviveDone",
            agentId: a.id
          });
        }
      });
    }
    function finishGame(a, win, t) {
      a.gameResUntil = t + 1.3;
      a.gameWin = win;
      if (win) {
        a.mood = "celebrate";
        a.moodUntil = t + 2;
        a.emote = { kind: "star", until: t + 2 };
        world.fx.push({ kind: "stars", x0: a._gameM + 8, y0: 130, x1: a._gameM + 8, y1: 130, t0: t, dur: 0.7 });
      } else {
        a.mood = "sad";
        a.moodUntil = t + 2;
        a.emote = { kind: "worry", until: t + 2 };
      }
    }
    function stepChoreo(a, dt, t) {
      if (a.scripted || a.inHuddle || a.inDuo || a.state === "down" || a.state === "reviving") {
        a.brewUntil = 0;
        a.gameUntil = 0;
        a.gameResUntil = 0;
        a._vsId = null;
        a.snackStage = 0;
        a.restPending = false;
        a.restUntil = 0;
        return;
      }
      if (a.brewUntil) {
        if (a.relaxKind !== "cafe") a.brewUntil = 0;
        else if (!a.moving && t >= a.brewUntil) {
          a.brewUntil = 0;
          a.coffeeUntil = t + 63;
          sendTo(a, {
            x: a.deskTile[0],
            y: a.deskTile[1]
          }, "working");
          a.stateUntil = t + 66;
        }
      }
      if (a.gameUntil) {
        if (a.relaxKind !== "game") {
          a.gameUntil = 0;
          a._vsId = null;
        } else if (!a.moving && t >= a.gameUntil) {
          let mate = null;
          for (let i = 0; i < agents.length; i++) {
            const o = agents[i];
            if (o !== a && o.gameUntil && o.relaxKind === "game" && !o.moving && o.ty === a.ty && Math.abs(o.tx - a.tx) === 2) {
              mate = o;
              break;
            }
          }
          a.gameUntil = 0;
          const win = Math.random() < 0.5;
          finishGame(a, win, t);
          if (mate) {
            mate.gameUntil = 0;
            finishGame(mate, !win, t);
            a._vsId = mate.id;
            mate._vsId = a.id;
          }
        }
      }
      if (a.gameResUntil && t >= a.gameResUntil) {
        a.gameResUntil = 0;
        const m = a._vsId ? byId[a._vsId] : null;
        a._vsId = null;
        if (m && !m.moving && m.relaxKind === "game") faceEach(a, m);
      }
      if (a.snackStage) {
        if (!a.moving && a.relaxKind !== "store" && !a.pendingRelax) a.snackStage = 0;
        else if (!a.moving && t >= a.snackAt) {
          if (a.snackStage === 1) {
            a.snackStage = 2;
            a.pendingRelax = "store";
            sendTo(a, STORE_COUNTER, "social");
          } else if (a.snackStage === 3) {
            a.snackStage = 4;
            a.pendingRelax = "store";
            const d0 = Math.abs(BENCH_TILES[0][0] - a.tx) + Math.abs(BENCH_TILES[0][1] - a.ty);
            const d1 = Math.abs(BENCH_TILES[1][0] - a.tx) + Math.abs(BENCH_TILES[1][1] - a.ty);
            const bt = d0 <= d1 ? BENCH_TILES[0] : BENCH_TILES[1];
            sendTo(a, {
              x: bt[0],
              y: bt[1]
            }, "social");
          } else if (a.snackStage === 5) {
            a.snackStage = 0;
            a.mood = "happy";
            a.moodUntil = t + 2.5;
            a.stateUntil = t + 3;
          }
        }
      }
      if (a.restPending && !a.moving) {
        a.restPending = false;
        if (a.tx === MED_TILE_X && a.ty === MED_TILE_Y) {
          a.restUntil = t + 3 + Math.random();
          a.px = MED_BED_X;
          a.py = MED_BED_Y;
          a.dir = "right";
        } else sendTo(a, {
          x: a.deskTile[0],
          y: a.deskTile[1]
        }, "working");
      }
      if (a.restUntil && t >= a.restUntil) {
        a.restUntil = 0;
        a.mood = "happy";
        a.moodUntil = t + 3;
        a.emote = { kind: "star", until: t + 2 };
        sendTo(a, {
          x: a.deskTile[0],
          y: a.deskTile[1]
        }, "working");
        a.stateUntil = t + 16;
      }
      if (a.relaxKind === "park" && !a.moving && !a.petalUntil && Math.random() < dt * 0.07) {
        a.petalUntil = t + 2;
        a.mood = "happy";
        a.moodUntil = t + 2.4;
        a.emote = { kind: "love", until: t + 2 };
      }
      if (a.petalUntil && t >= a.petalUntil) a.petalUntil = 0;
    }
    function stepCommute(dt, t) {
      const day = Date.now() / 864e5 | 0;
      const min = world.time;
      let cm = world._commute;
      if (!cm) {
        if (min >= 495 && min <= 570 && world._cAM !== day) {
          world._cAM = day;
          cm = world._commute = { ph: 1, cx: CAR_IN_X, cy: CAR_ROAD_Y, path: null, pi: 0, ex: 0, ey: 0 };
        } else if (min >= 1050 && min <= 1110 && world._cPM !== day) {
          world._cPM = day;
          cm = world._commute = { ph: 5, cx: CAR_BAY_X, cy: CAR_BAY_Y, path: findPath(44, 24, 24, 42), pi: 0, ex: 712, ey: 392 };
          if (!cm.path || !cm.path.length) cm.ph = 6;
        } else return;
      }
      if (cm.ph === 4) {
        if (min >= 1050 && min <= 1110 && world._cPM !== day) {
          world._cPM = day;
          cm.ph = 5;
          cm.path = findPath(44, 24, 24, 42);
          cm.pi = 0;
          cm.ex = 712;
          cm.ey = 392;
          if (!cm.path || !cm.path.length) cm.ph = 6;
        }
        return;
      }
      const adv = dt * world.settings.speed;
      if (cm.ph === 1) {
        cm.cx -= 52 * adv;
        if (world._dust.length < 10 && Math.random() < dt * 4) world._dust.push({
          x: Math.round(cm.cx) + 33,
          y: Math.round(cm.cy) + 10,
          dx: 1,
          t0: t,
          c: "#C7CBD1",
          life: 0.5
        });
        if (cm.cx <= CAR_BAY_X) {
          cm.cx = CAR_BAY_X;
          cm.ph = 2;
        }
      } else if (cm.ph === 2) {
        cm.cy -= 24 * adv;
        if (cm.cy <= CAR_BAY_Y) {
          cm.cy = CAR_BAY_Y;
          cm.ph = 3;
          cm.path = findPath(24, 42, 44, 24);
          cm.pi = 0;
          cm.ex = 392;
          cm.ey = 680;
          if (!cm.path || !cm.path.length) cm.ph = 4;
        }
      } else if (cm.ph === 3 || cm.ph === 5) {
        const wp = cm.path[cm.pi];
        const gx = wp[0] * T + 8,
          gy = wp[1] * T + 8;
        const dx = gx - cm.ex,
          dy = gy - cm.ey;
        const dist = Math.hypot(dx, dy);
        const wadv = 58 * adv;
        if (dist <= wadv) {
          cm.ex = gx;
          cm.ey = gy;
          cm.pi++;
          if (cm.pi >= cm.path.length) {
            cm.path = null;
            cm.ph = cm.ph === 3 ? 4 : 6;
          }
        } else {
          cm.ex += dx / dist * wadv;
          cm.ey += dy / dist * wadv;
        }
      } else if (cm.ph === 6) {
        cm.cy += 24 * adv;
        if (cm.cy >= CAR_ROAD_Y) {
          cm.cy = CAR_ROAD_Y;
          cm.ph = 7;
        }
      } else if (cm.ph === 7) {
        cm.cx += 52 * adv;
        if (world._dust.length < 10 && Math.random() < dt * 4) world._dust.push({
          x: Math.round(cm.cx) - 2,
          y: Math.round(cm.cy) + 10,
          dx: -1,
          t0: t,
          c: "#C7CBD1",
          life: 0.5
        });
        if (cm.cx >= CAR_IN_X + 40) world._commute = null;
      }
    }
    function stepWave(t) {
      if (!world._wave) return;
      const W = world._wave,
        head = (t - W.t0) * 4,
        idx = Math.floor(head);
      if (idx !== W.last) {
        W.last = idx;
        const a = W.list[idx % W.list.length];
        if (a && !busy(a) && a.state !== "down" && a.state !== "reviving") {
          a.emote = { kind: Math.random() < 0.5 ? "star" : "party", until: t + 1.2 };
          a.mood = "celebrate";
          a.moodUntil = t + 1.4;
        }
        [world._navi, world._capy, world._green].forEach(c => {
          if (!c || c.act) return;
          if (a && Math.abs(a.px - c.px) < 24) {
            critAnim(c, "wave", 0.6, CRIT[c._key].amp);
            critFeel(c, "happy", "star", 1.5);
          }
        });
      }
      if (head > W.list.length * W.passes) world._wave = null;
    }
    let vpOx = 0,
      vpOy = 0,
      vpW = 0,
      vpH = 0;
    const MEET_SEATS = ((D.PLACES.meeting && D.PLACES.meeting.spots) || []).map(sp => {
      const [mx, my] = nearestWalkable(sp.x, sp.y);
      return { x: mx, y: my };
    });
    let meetCX = 39 * T + 8,
      meetCY = 5 * T + 8;
    if (MEET_SEATS.length) {
      let sxx = 0,
        syy = 0;
      for (const sp of MEET_SEATS) {
        sxx += sp.x;
        syy += sp.y;
      }
      sxx /= MEET_SEATS.length;
      syy /= MEET_SEATS.length;
      let bt = null,
        bd = 1e9;
      for (const fu of M.FURNITURE) {
        if (fu.kind !== "table") continue;
        const d2 = Math.hypot(fu.x - sxx, fu.y - syy);
        if (d2 < bd) {
          bd = d2;
          bt = fu;
        }
      }
      if (bt && bd < 6) {
        meetCX = bt.x * T + 8;
        meetCY = bt.y * T + 8;
      } else {
        meetCX = sxx * T + 8;
        meetCY = syy * T + 8;
      }
    }
    function freeMeetSeat() {
      for (let k = 0; k < MEET_SEATS.length; k++) {
        const st = MEET_SEATS[k];
        let taken = false;
        for (let i = 0; i < agents.length && !taken; i++) {
          const o = agents[i];
          if (o.state !== "meeting" && !(o.moving && o.nextState === "meeting")) continue;
          if (o.tx === st.x && o.ty === st.y) taken = true;
          else if (o.path.length) {
            const pe = o.path[o.path.length - 1];
            if (pe[0] === st.x && pe[1] === st.y) taken = true;
          }
        }
        if (!taken) return st;
      }
      return null;
    }
    function stepMeeting(t) {
      if (!_meetingNow) return;
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        if (a.state !== "meeting" || a.moving) continue;
        for (let j = 0; j < i; j++) {
          const o = agents[j];
          if (o.state !== "meeting" || o.moving) continue;
          if (o.tx === a.tx && o.ty === a.ty) {
            const st = freeMeetSeat();
            if (st) sendTo(a, st, "meeting");
            break;
          }
        }
        if (a.moving) continue;
        if (!a.gesture) {
          const dx = meetCX - a.px,
            dy = meetCY - a.py;
          if (Math.abs(dx) + Math.abs(dy) >= 4) a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
        }
        if (a.bubble) {
          a._nodT = t + 2 + Math.random() * 3;
          continue;
        }
        if (!a._nodT) {
          a._nodT = t + 2 + Math.random() * 4;
          continue;
        }
        if (t >= a._nodT && !a.gesture) {
          a.gesture = { kind: "nod", t0: t, until: t + 0.8 };
          a._nodT = t + 4 + Math.random() * 3;
        }
      }
    }
    const RY_WIN = { standup: [540, 585], lunch: [720, 770], winddown: [1080, 1125] };
    const RY_SU_LINES = ["Standup nhanh — 60 giây thôi.", "Có blocker gì nói luôn nha.", "OK, quay lại việc thôi!"];
    const RY_LN_LINES = ["Đi ăn trưa không?", "Pantry hay 7-Eleven đây?", "Cơm trưa đêêê."];
    const RY_WD_LINES = ["Hết giờ rồi — về thôi!", "Mai chiến tiếp nha.", "Chốt sổ, nghỉ ngơi thôi."];
    const RY_STAND_OFF = [[-1, 1], [1, 1], [0, 2], [-1, 2], [1, 2], [-2, 1], [2, 1], [0, 3]];
    const RY_GATE = [[43, 43], [44, 43], [45, 43], [46, 43], [44, 44], [45, 44], [43, 44], [46, 44]];
    let ry = null,
      ryScanT = 0;
    const ryDay = { standup: -1, lunch: -1, winddown: -1 };
    function endRhythm(t) {
      if (!ry) return;
      for (const a of ry.members) {
        a._ry = 0;
        if (a.scripted || a.state === "down" || a.state === "reviving" || a.state === "meeting") continue;
        a.snackStage = 0;
        sendTo(a, { x: a.deskTile[0], y: a.deskTile[1] }, "working");
        a.stateUntil = t + 12 + Math.random() * 10;
      }
      if (ry.lead) ry.lead._ry = 0;
      ry = null;
    }
    function startRhythm(kind, t) {
      if (ry) endRhythm(t);
      const free = agents.filter(a => !busy(a) && a.state !== "meeting");
      if (kind === "standup") {
        const lead = agents.find(a => a.def.lead);
        if (!lead) return false;
        const members = free.filter(a => a !== lead).slice(0, RY_STAND_OFF.length);
        if (members.length < 2) return false;
        const ax = lead.deskTile[0],
          ay = lead.deskTile[1];
        for (let i = 0; i < members.length; i++) {
          const a = members[i];
          a._ry = 1;
          a._duoCd = Math.max(a._duoCd || 0, t + 90);
          const [gx, gy] = nearestWalkable(ax + RY_STAND_OFF[i][0], ay + RY_STAND_OFF[i][1]);
          sendTo(a, { x: gx, y: gy }, "social");
          a.stateUntil = t + 70;
        }
        let leadIn = false;
        if (!busy(lead) && lead.state !== "meeting") {
          lead._ry = 1;
          leadIn = true;
          sendTo(lead, { x: ax, y: ay }, "working");
          lead.stateUntil = t + 70;
        }
        ry = { kind, ph: "go", members, lead, leadIn, axp: ax * T + 8, ayp: ay * T + 8, dl: t + 16, li: 0, lineAt: 0, endAt: 0 };
        return true;
      }
      if (kind === "lunch") {
        const venues = ["cafe", "store", "lobby"].filter(k => D.PLACES[k] && D.PLACES[k].spots && D.PLACES[k].spots.length);
        if (!venues.length) return false;
        const members = free.slice(0, 6);
        if (members.length < 2) return false;
        const ng = Math.min(venues.length, members.length >= 5 ? 3 : 2);
        for (let i = 0; i < members.length; i++) {
          const a = members[i];
          const vk = venues[i % ng];
          const spots = D.PLACES[vk].spots;
          a._ry = 1;
          a._duoCd = Math.max(a._duoCd || 0, t + 120);
          a.pendingRelax = vk;
          sendTo(a, spots[(i / ng | 0) % spots.length], "social");
          a.stateUntil = t + 90;
        }
        say(members[0], RY_LN_LINES[Math.random() * RY_LN_LINES.length | 0], 4);
        ry = { kind, ph: "linger", members, lead: null, dl: 0, li: 0, lineAt: 0, endAt: t + 42 + Math.random() * 16 };
        return true;
      }
      const members = free.slice(0, Math.max(2, Math.ceil(free.length / 2)));
      if (members.length < 2) return false;
      for (let i = 0; i < members.length; i++) {
        const a = members[i];
        a._ry = 1;
        a._duoCd = Math.max(a._duoCd || 0, t + 90);
        const [gx, gy] = nearestWalkable(RY_GATE[i % RY_GATE.length][0], RY_GATE[i % RY_GATE.length][1]);
        sendTo(a, { x: gx, y: gy }, "social");
        a.stateUntil = t + 70;
      }
      ry = { kind: "winddown", ph: "go", members, lead: null, dl: t + 24, li: 0, lineAt: 0, endAt: 0 };
      return true;
    }
    function stepRhythm(t) {
      if (!ry) {
        if (t < ryScanT) return;
        ryScanT = t + 2;
        const day = Date.now() / 864e5 | 0;
        const m = world.time;
        for (const k in RY_WIN) {
          const w = RY_WIN[k];
          if (m >= w[0] && m <= w[1] && ryDay[k] !== day) {
            if (startRhythm(k, t)) ryDay[k] = day;
            else ryScanT = t + 10;
            return;
          }
        }
        return;
      }
      const g = ry.members;
      for (let i = g.length - 1; i >= 0; i--) {
        const a = g[i];
        if (a.scripted || a.inHuddle || a.inDuo || a.state === "down" || a.state === "reviving" || a.state === "meeting" || a.nextState === "meeting" && a.moving) {
          a._ry = 0;
          g.splice(i, 1);
        }
      }
      if (ry.lead && ry.leadIn && (ry.lead.scripted || ry.lead.state === "down" || ry.lead.state === "reviving" || ry.lead.state === "meeting")) {
        ry.lead._ry = 0;
        ry.leadIn = false;
      }
      if (g.length < 2) {
        endRhythm(t);
        return;
      }
      if (ry.kind === "standup") {
        if (ry.ph === "go") {
          let settled = true;
          for (let i = 0; i < g.length && settled; i++) if (g[i].moving) settled = false;
          if (settled || t > ry.dl) {
            ry.ph = "talk";
            ry.endAt = t + 25;
            ry.lineAt = t + 0.6;
            const fx2 = ry.leadIn ? ry.lead.px : ry.axp,
              fy2 = ry.leadIn ? ry.lead.py : ry.ayp;
            for (const a of g) {
              const dx = fx2 - a.px,
                dy = fy2 - a.py;
              if (Math.abs(dx) + Math.abs(dy) < 2) continue;
              a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
            }
            if (ry.leadIn) ry.lead.dir = "down";
          }
          return;
        }
        if (t >= ry.endAt) {
          endRhythm(t);
          return;
        }
        if (ry.li < 3 && t >= ry.lineAt) {
          const own = ry.li !== 1;
          const speaker = own && ry.leadIn ? ry.lead : g[(ry.li * 3 + 1) % g.length];
          say(speaker, RY_SU_LINES[ry.li], 4);
          if (!own && g.length > 1) {
            const nd = g[(ry.li * 5 + 2) % g.length];
            if (nd !== speaker && !nd.gesture) nd.gesture = { kind: "nod", t0: t + 0.5, until: t + 1.3 };
          }
          ry.li++;
          ry.lineAt = t + 5.5;
        }
        return;
      }
      if (ry.kind === "lunch") {
        if (t >= ry.endAt) endRhythm(t);
        return;
      }
      if (ry.ph === "go") {
        let settled = true;
        for (let i = 0; i < g.length && settled; i++) if (g[i].moving) settled = false;
        if (settled || t > ry.dl) {
          ry.ph = "pause";
          ry.endAt = t + 5 + Math.random() * 3;
          let cx = 0,
            cy = 0;
          for (const a of g) {
            cx += a.px;
            cy += a.py;
          }
          cx /= g.length;
          cy /= g.length;
          for (const a of g) {
            const dx = cx - a.px,
              dy = cy - a.py;
            if (Math.abs(dx) + Math.abs(dy) < 2) continue;
            a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
          }
          say(g[Math.random() * g.length | 0], RY_WD_LINES[Math.random() * RY_WD_LINES.length | 0], 3.5);
        }
        return;
      }
      if (t >= ry.endAt) endRhythm(t);
    }
    const cat = {
      px: 0,
      py: 0,
      tx: 41,
      ty: 21,
      path: [],
      state: "sit",
      until: 0,
      faceLR: "left",
      followId: null,
      repT: 0,
      seat: null
    };
    {
      const [cx0, cy0] = nearestWalkable(41, 21);
      cat.tx = cx0;
      cat.ty = cy0;
      cat.px = cx0 * T + 8;
      cat.py = cy0 * T + 8;
    }
    world.cat = cat;
    function stepCat(dt, t) {
      const c = cat;
      if (c.path.length) {
        const wp = c.path[0];
        const gx = wp[0] * T + 8,
          gy = wp[1] * T + 8;
        const dx = gx - c.px,
          dy = gy - c.py;
        const dist = Math.hypot(dx, dy);
        const adv = 26 * dt * world.settings.speed;
        if (Math.abs(dx) > 0.5) c.faceLR = dx > 0 ? "right" : "left";
        if (dist <= adv) {
          c.px = gx;
          c.py = gy;
          c.tx = wp[0];
          c.ty = wp[1];
          c.path.shift();
        } else {
          c.px += dx / dist * adv;
          c.py += dy / dist * adv;
        }
        if (!c.path.length) {
          if (c.state === "sleepgo") {
            c.state = "sleep";
            if (c.seat) {
              c.px = c.seat.sx;
              c.py = c.seat.sy;
            }
            c.until = t + 24 + Math.random() * 22;
          } else if (c.state === "wander") {
            c.state = "sit";
            c.until = t + 2 + Math.random() * 3;
          }
        }
      }
      if (c.state === "follow") {
        const a = byId[c.followId];
        if (!a || !a.moving || t > c.until || a.state === "down") {
          c.path.length = 0;
          c.followId = null;
          c.state = "sit";
          c.until = t + 3 + Math.random() * 4;
          return;
        }
        if (t >= c.repT) {
          c.repT = t + 0.8;
          const md = Math.abs(a.tx - c.tx) + Math.abs(a.ty - c.ty);
          if (md > 2) {
            const p = findPath(c.tx, c.ty, a.tx, a.ty, CAT_BLOCKED);
            if (p && p.length) {
              if (p.length > 1) p.pop();
              c.path = p;
            }
          } else c.path.length = 0;
        }
        return;
      }
      if (c.path.length || t < c.until) return;
      const r = Math.random();
      if (r < 0.34) {
        let tries = 8;
        while (tries--) {
          const nx = c.tx + (Math.random() * 17 | 0) - 8,
            ny = c.ty + (Math.random() * 13 | 0) - 6;
          if (nx < 1 || ny < 1 || nx >= M.W - 1 || ny >= M.H - 1) continue;
          if (!M.walkable(nx, ny) || M.g(nx, ny) === M.POOL) continue;
          const p = findPath(c.tx, c.ty, nx, ny, CAT_BLOCKED);
          if (p && p.length) {
            c.path = p;
            c.state = "wander";
            break;
          }
        }
        c.until = t + 2;
      } else if (r < 0.52 && CAT_NAPS.length) {
        const sp = CAT_NAPS[Math.random() * CAT_NAPS.length | 0];
        const p = findPath(c.tx, c.ty, sp.x, sp.y, CAT_BLOCKED);
        if (p && p.length) {
          c.path = p;
          c.seat = sp;
          c.state = "sleepgo";
          c.until = t + 40;
        } else if (c.tx === sp.x && c.ty === sp.y) {
          c.seat = sp;
          c.state = "sleep";
          c.px = sp.sx;
          c.py = sp.sy;
          c.until = t + 24 + Math.random() * 22;
        } else c.until = t + 2;
      } else if (r < 0.7) {
        let mv = null;
        const off = Math.random() * agents.length | 0;
        for (let i = 0; i < agents.length && !mv; i++) {
          const a2 = agents[(i + off) % agents.length];
          if (a2.moving && a2.path.length && a2.state !== "down") mv = a2;
        }
        if (mv) {
          c.state = "follow";
          c.followId = mv.id;
          c.until = t + 10;
          c.repT = 0;
        } else c.until = t + 2 + Math.random() * 2;
      } else {
        c.state = "sit";
        c.until = t + 4 + Math.random() * 5;
      }
    }
    let cloudCv = null;
    const CLOUDS = [{ x: 140, y: 120, vx: 3.4, vy: 1.1, s: 1 }, { x: 520, y: 380, vx: 2.5, vy: -0.8, s: 1.5 }, { x: 860, y: 620, vx: 3.9, vy: 0.6, s: 1.2 }];
    function cloudCanvas() {
      if (cloudCv) return cloudCv;
      cloudCv = document.createElement("canvas");
      cloudCv.width = 160;
      cloudCv.height = 100;
      const cc = cloudCv.getContext("2d");
      const grd = cc.createRadialGradient(80, 50, 8, 80, 50, 78);
      grd.addColorStop(0, "rgba(24,30,40,0.9)");
      grd.addColorStop(0.7, "rgba(24,30,40,0.45)");
      grd.addColorStop(1, "rgba(24,30,40,0)");
      cc.save();
      cc.translate(80, 50);
      cc.scale(1, 0.62);
      cc.translate(-80, -50);
      cc.fillStyle = grd;
      cc.fillRect(0, 0, 160, 100);
      cc.restore();
      return cloudCv;
    }
    let rain = null,
      rainDrops = null;
    const PUDS = [];
    for (let i = 0; i < PUD_N; i++) PUDS.push({ x: 0, y: 0, t0: -1e9, h: 0 });
    function startRain(t, dur) {
      if (!rainDrops) {
        rainDrops = [];
        for (let i = 0; i < RAIN_N; i++) rainDrops.push({ x: 0, y: 1e9, v: 150 + Math.random() * 70 });
      }
      rain = { t0: t, dur: dur || 45 + Math.random() * 30, k: 0 };
    }
    function spawnPuddles(t) {
      if (!vpW) return;
      const tx0 = Math.max(1, vpOx >> 4),
        ty0 = Math.max(1, vpOy >> 4);
      const tx1 = Math.min(M.W - 2, (vpOx + vpW >> 4) + 2),
        ty1 = Math.min(M.H - 2, (vpOy + vpH >> 4) + 2);
      const want = 4 + (Math.random() * 3 | 0);
      let placed = 0;
      for (let tries = 0; tries < 70 && placed < want && placed < PUD_N; tries++) {
        const tx2 = tx0 + (Math.random() * (tx1 - tx0 + 1) | 0),
          ty2 = ty0 + (Math.random() * (ty1 - ty0 + 1) | 0);
        if (!M.walkable(tx2, ty2)) continue;
        if (OUTDOOR_TIDS.indexOf(M.g(tx2, ty2)) < 0) continue;
        const p = PUDS[placed];
        p.x = tx2 * T + 3 + (M.hash(tx2 * 5, ty2 * 3) * 6 | 0);
        p.y = ty2 * T + 6 + (M.hash(tx2 * 3, ty2 * 7) * 5 | 0);
        p.h = M.hash(tx2, ty2);
        p.t0 = t;
        placed++;
      }
    }
    function stepRain(dt, t) {
      for (let i = 0; i < CLOUDS.length; i++) {
        const cl = CLOUDS[i];
        cl.x += cl.vx * dt;
        cl.y += cl.vy * dt;
        if (cl.x > M.W * T + 130) cl.x = -130;
        if (cl.y > M.H * T + 90) cl.y = -90;
        if (cl.y < -100) cl.y = M.H * T + 80;
      }
      if (!rain) {
        if (!document.hidden && Math.random() < dt / 7200) startRain(t);
        return;
      }
      const rt = t - rain.t0;
      if (rt >= rain.dur) {
        spawnPuddles(t);
        rain = null;
        return;
      }
      rain.k = Math.max(0, Math.min(1, Math.min(rt / 5, (rain.dur - rt) / 5)));
      if (document.hidden || !vpW) return;
      const n = Math.round(rain.k * RAIN_N);
      for (let i = 0; i < n; i++) {
        const d = rainDrops[i];
        d.y += d.v * dt;
        d.x += 14 * dt;
        if (d.y > vpOy + vpH + 4 || d.x < vpOx - 30 || d.x > vpOx + vpW + 30) {
          d.x = vpOx + Math.random() * vpW;
          d.y = vpOy - 6 - Math.random() * 40;
        }
      }
    }
    world.forceRhythm = kind => {
      if (!RY_WIN[kind]) return false;
      ryDay[kind] = Date.now() / 864e5 | 0;
      return startRhythm(kind, now());
    };
    world.forceWeather = on => {
      const t = now();
      if (on) {
        if (!rain) startRain(t);
        else rain.dur = Math.max(rain.dur, t - rain.t0 + 30);
      } else if (rain) rain.dur = Math.min(rain.dur, t - rain.t0 + 4);
      return !!rain;
    };
    function critAnim(c, kind, dur, amp = 1, n = 1) {
      c.anim = { kind, t0: now(), dur, amp, n };
    }
    function critFeel(c, mood, emote, dur = 5) {
      if (mood) {
        c.mood = mood;
        c.moodUntil = now() + dur;
      }
      if (emote) c.emote = { kind: emote, until: now() + 2.6 };
    }
    function critFaceTo(c, wx, wy) {
      const dx = wx - c.px,
        dy = wy - c.py;
      c.faceDir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
    }
    function adjWalkable(c, tx, ty) {
      const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      let best = null,
        bd = 1e9;
      for (const [dx, dy] of ring) {
        const x = tx + dx,
          y = ty + dy;
        if (!M.walkable(x, y) || inWater(x, y)) continue;
        const d = Math.hypot(c.tx - x, c.ty - y);
        if (d < bd) {
          bd = d;
          best = [x, y];
        }
      }
      return best;
    }
    function nearestAgent(c, pred, maxTiles) {
      let best = null,
        bd = 1e9;
      for (const a of agents) {
        if (!pred(a)) continue;
        const d = Math.hypot(a.tx - c.tx, a.ty - c.ty);
        if (d < bd) {
          bd = d;
          best = a;
        }
      }
      return best && (!maxTiles || bd <= maxTiles) ? best : null;
    }
    function moveAlong(c, dt, t, speedMul) {
      const [nx, ny] = c.path[0];
      const gx = nx * T + 8,
        gy = ny * T + 8;
      const dx = gx - c.px,
        dy = gy - c.py,
        dist = Math.hypot(dx, dy);
      const adv = SPEED * speedMul * dt * world.settings.speed;
      c.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
      if (c.dir === "left" || c.dir === "right") c.faceLR = c.dir;
      if (dist <= adv) {
        c.px = gx;
        c.py = gy;
        c.tx = nx;
        c.ty = ny;
        c.path.shift();
      } else {
        c.px += dx / dist * adv;
        c.py += dy / dist * adv;
      }
      if (!c.path.length) {
        c.state = "idle";
        c.until = t + 1 + Math.random() * 3;
      }
    }
    function wanderCritter(c, dt, t, speedMul, napP, sitP) {
      if (!c) return;
      if (c.meow && t > c.meow) c.meow = null;
      if (c.path.length) {
        moveAlong(c, dt, t, speedMul);
        return;
      }
      if (t < c.until) return;
      const cfg = CRIT[c._key];
      const r = Math.random();
      if (r < napP) {
        c.state = "nap";
        c.until = t + 6 + Math.random() * 9;
        if (t > c.moodUntil) c.mood = "sleepy";
      } else if (r < napP + sitP) {
        c.state = "sit";
        c.until = t + 2 + Math.random() * 4;
        if (t > c.moodUntil) c.mood = cfg.idleMood;
        if (Math.random() < 0.5) {
          c.meow = t + 2.2;
          c.emote = { kind: pick(cfg.faves), until: t + 2.4 };
        }
      } else {
        if (t > c.moodUntil) c.mood = cfg.idleMood;
        if (Math.random() < cfg.idleFlourish) critAnim(c, pick(c._key === "_green" ? ["headtilt", "nod"] : c._key === "_mascot" ? ["tailwag", "nod"] : ["hop", "jiggle"]), 0.6, cfg.amp);
        let tx, ty, tries = 0;
        do {
          tx = 3 + (Math.random() * 58 | 0);
          ty = 3 + (Math.random() * 42 | 0);
          tries++;
        } while ((!M.walkable(tx, ty) || inWater(tx, ty)) && tries < 40);
        const p = M.walkable(tx, ty) && !inWater(tx, ty) ? findPath(c.tx, c.ty, tx, ty, inWater) : null;
        if (p && p.length) {
          c.path = p;
          c.state = "walk";
        } else c.until = t + 1;
      }
    }
    let _missionActive = false,
      _meetingNow = false;
    function reactAgent(a, c, missionActive) {
      if (missionActive || !a || a.scripted || a.inHuddle) return;
      if (a.state === "down" || a.state === "reviving" || a.state === "meeting") return;
      if (a.emote) return;
      world.command(a.id, { emote: pick(["cool", "music", "idea", "love"]), emoteDur: 2.2, mood: "happy", moodDur: 4 });
      a.dir = a.px > c.px ? "left" : "right";
    }
    function beginApproach(c, target, mode, t, dur) {
      const a = target.id ? byId[target.id] : world[target.m];
      if (!a) return;
      const spot = adjWalkable(c, a.tx, a.ty);
      if (!spot) return;
      const p = findPath(c.tx, c.ty, spot[0], spot[1], inWater);
      if (!p) return;
      c.path = p;
      c.state = "walk";
      c.aiState = "approach";
      c.target = target;
      c.social = dur;
      c._mode = mode;
    }
    function endSocial(c, t, extra = 0) {
      c.aiState = "";
      c.target = null;
      c._mode = null;
      c.faceDir = null;
      c.state = "idle";
      c.until = t + 0.8 + Math.random() * 1.5;
      c.cd = t + 5 + Math.random() * 5;
      c.partnerCd = t + 8 + extra;
      c.nextScan = t + 4 + Math.random() * 6;
    }
    function tryStartSocial(c, key, cfg, t, missionActive) {
      const down = nearestAgent(c, a => a.state === "down", 22);
      if (down) {
        beginApproach(c, { id: down.id }, "comfort", t, 1.3);
        return true;
      }
      if (t > c.partnerCd) {
        for (const pk of MASCOT_KEYS) {
          if (pk === key) continue;
          const pp = world[pk];
          if (pp && !pp.aiState && !pp.act && (pp.state === "idle" || pp.state === "sit") && Math.hypot(pp.tx - c.tx, pp.ty - c.ty) <= 4 && t > pp.partnerCd) {
            beginApproach(c, { m: pk }, "play", t, 2.4);
            return true;
          }
        }
      }
      if (missionActive) return false;
      if (Math.random() > cfg.engageP) return false;
      const pred = a => !a.scripted && !a.inHuddle && a.state !== "down" && a.state !== "reviving" && a.state !== "meeting";
      const tgt = nearestAgent(c, pred, 18) || pick(agents.filter(pred));
      if (!tgt) return false;
      const mode = Math.random() < cfg.followP ? "follow" : "greet";
      beginApproach(c, { id: tgt.id }, mode, t, mode === "follow" ? 5 + Math.random() * 4 : 1.6);
      return true;
    }
    function runOverlay(c, key, cfg, dt, t, missionActive, meetingNow) {
      if (c.aiState === "approach") {
        if (c.path.length) {
          moveAlong(c, dt, t, SP[key]);
          return;
        }
        const a = c.target.id ? byId[c.target.id] : world[c.target.m];
        if (!a) {
          endSocial(c, t);
          return;
        }
        critFaceTo(c, a.px, a.py);
        c.aiState = c._mode;
        if (c._mode === "comfort") {
          critFeel(c, "sad", "worry", 2.4);
          critAnim(c, "nod", 0.5, cfg.amp);
        } else if (c._mode === "play") {
          critAnim(c, "jiggle", 0.6, cfg.amp);
          critFeel(c, c.mood, pick(cfg.faves), 1.8);
        } else {
          critAnim(c, c._mode === "follow" ? "hop" : key === "_green" || key === "_mascot" ? "wave" : "hop", 1, cfg.amp);
          critFeel(c, key === "_navi" ? "excited" : key === "_toro" ? "mischief" : "happy", pick(cfg.faves), 2);
          if (c.target.id) reactAgent(byId[c.target.id], c, missionActive);
        }
        return;
      }
      if (c.aiState === "greet") {
        const a = byId[c.target.id];
        if (!a) {
          endSocial(c, t);
          return;
        }
        critFaceTo(c, a.px, a.py);
        c.social -= dt;
        if (c.social <= 0) endSocial(c, t);
        return;
      }
      if (c.aiState === "comfort") {
        const a = byId[c.target.id];
        if (!a) {
          endSocial(c, t);
          return;
        }
        critFaceTo(c, a.px, a.py);
        if (a.state !== "down") {
          critFeel(c, "happy", "heart", 1.6);
          endSocial(c, t, 4);
          return;
        }
        if (Math.random() < 0.02) critAnim(c, "hop", 0.45, cfg.amp * 0.7);
        if (Math.random() < 0.015) critFeel(c, "sad", "worry", 2);
        return;
      }
      if (c.aiState === "play") {
        const pp = world[c.target.m];
        c.social -= dt;
        if (!pp) {
          endSocial(c, t);
          return;
        }
        critFaceTo(c, pp.px, pp.py);
        if (Math.random() < 0.05) critAnim(c, "hop", 0.45, cfg.amp);
        if (Math.random() < 0.03) critFeel(c, c.mood, pick(cfg.faves), 1.4);
        if (c.social <= 0) endSocial(c, t, 5);
        return;
      }
      if (c.aiState === "follow") {
        const a = byId[c.target.id];
        c.social -= dt;
        if (!a || a.scripted || a.inHuddle || a.state === "down" || a.state === "meeting" || c.social <= 0) {
          endSocial(c, t);
          return;
        }
        critFaceTo(c, a.px, a.py);
        if (!c.path.length && Math.hypot(a.tx - c.tx, a.ty - c.ty) > 1) {
          const spot = adjWalkable(c, a.tx, a.ty);
          const p = spot && findPath(c.tx, c.ty, spot[0], spot[1], inWater);
          if (p && p.length) c.path = p;
        }
        if (c.path.length) moveAlong(c, dt, t, SP[key]);
        if (Math.random() < 0.008) critFeel(c, c.mood, pick(cfg.faves), 1.6);
        return;
      }
    }
    function runAct(c, key, dt, t) {
      if (c.act === "spinpop") {
        if (c.path.length) {
          moveAlong(c, dt, t, SP[key]);
          return;
        }
        c.state = "idle";
        if (c.faceX != null) c.faceDir = c.faceX < c.px ? "left" : "right";
        const sp = world._spinPop;
        if (sp) {
          const beat = Math.floor((world._last - sp.t0) / 1.6);
          if (beat > sp.popped && beat < 2) {
            sp.popped = beat;
            critAnim(c, "spin", 0.55, CRIT[key].amp, 1);
            critFeel(c, "excited", "star", 2.5);
            if (key === "_navi" || !world._navi && key === "_capy") {
              world.celebrate(sp.cx * T + 8, sp.cy * T + 8);
              for (let i = 0; i < 6; i++) {
                const ang = i * 1.047;
                world.fx.push({ kind: "discobeam", x0: sp.cx * T + 8, y0: sp.cy * T + 8, x1: sp.cx * T + 8 + Math.cos(ang) * 40, y1: sp.cy * T + 8 + Math.sin(ang) * 20, t0: world._last, dur: 0.6, c: CONFETTI_COLORS[i % CONFETTI_COLORS.length] });
              }
            }
          }
        }
        return;
      }
      const fast = c.act === "rush" || c.act === "party";
      const slow = c.act === "droop" || c.act === "subdued";
      if (c.path.length) {
        moveAlong(c, dt, t, SP[key] * (fast ? 1.7 : slow ? 0.5 : 1));
        return;
      }
      c.state = "idle";
      if (c.faceX != null) c.faceDir = c.faceX < c.px ? "left" : "right";
    }
    function stepCritterAI(c, key, dt, t, missionActive, meetingNow) {
      if (!c) return;
      const cfg = CRIT[key];
      if (c.act && t > c.actUntil) {
        c.act = null;
        c.faceDir = null;
        c.hold = 0;
        c.anim = null;
        if (t > c.moodUntil) c.mood = cfg.idleMood;
      }
      if (c.act) {
        runAct(c, key, dt, t);
        return;
      }
      if (c.aiState) {
        runOverlay(c, key, cfg, dt, t, missionActive, meetingNow);
        return;
      }
      if (t >= c.nextScan && t > c.cd && !c.path.length && (c.state === "idle" || c.state === "sit")) {
        if (tryStartSocial(c, key, cfg, t, missionActive)) return;
        c.nextScan = t + cfg.scanGap[0] + Math.random() * (cfg.scanGap[1] - cfg.scanGap[0]);
      }
      wanderCritter(c, dt, t, SP[key], NP[key], SIP[key]);
    }
    function stepMascot(dt, t) {
      stepCritterAI(world._mascot, "_mascot", dt, t, _missionActive, _meetingNow);
    }
    function stepNavi(dt, t) {
      stepCritterAI(world._navi, "_navi", dt, t, _missionActive, _meetingNow);
    }
    function stepCapy(dt, t) {
      stepCritterAI(world._capy, "_capy", dt, t, _missionActive, _meetingNow);
    }
    function stepToro(dt, t) {
      stepCritterAI(world._toro, "_toro", dt, t, _missionActive, _meetingNow);
    }
    function stepGreen(dt, t) {
      stepCritterAI(world._green, "_green", dt, t, _missionActive, _meetingNow);
    }
    function step(dt, t) {
      world.time = world.timeOverride ?? utc7Minutes();
      world.settings.night = world.time < 6 * 60 || world.time >= 18 * 60;
      {
        const m = world.time;
        let sm = 1;
        if (m >= 360 && m < 1080) {
          sm = 0.8 + 0.45 * Math.abs(Math.cos((m - 360) / 720 * Math.PI));
          if (m < 390) sm = 1 + (sm - 1) * ((m - 360) / 30);
          else if (m >= 1050) sm += (1 - sm) * ((m - 1050) / 30);
        }
        SH_MUL = sm;
        SH_HW0 = Math.round(5 * sm);
        SH_HW1 = Math.round(3 * sm);
      }
      if (world.camTarget) {
        const k = Math.min(1, dt * 2.6);
        world.cam.x += (world.camTarget.x - world.cam.x) * k;
        world.cam.y += (world.camTarget.y - world.cam.y) * k;
        if (Math.hypot(world.camTarget.x - world.cam.x, world.camTarget.y - world.cam.y) < 2) world.camTarget = null;
      }
      if (!world.weatherTint) world.weatherTint = {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
        tr: 0,
        tg: 0,
        tb: 0,
        ta: 0
      };
      {
        const wt = world.weatherTint;
        const wk = Math.min(1, dt * 1.1);
        wt.r += (wt.tr - wt.r) * wk;
        wt.g += (wt.tg - wt.g) * wk;
        wt.b += (wt.tb - wt.b) * wk;
        wt.a += (wt.ta - wt.a) * wk;
      }
      if (!world._aurora) world._aurora = {
        conf: 0.5,
        confTo: 0.5,
        lit: 0
      };
      {
        const au = world._aurora;
        au.conf += (au.confTo - au.conf) * Math.min(1, dt * 1.3);
        au.lit = Math.max(0, au.lit - dt * 0.05);
      }
      if (!world._sparkles) world._sparkles = [];
      if (world._sparkles.length < 26 && Math.random() < 0.5) world._sparkles.push({
        x: Math.random() * M.W * T,
        y: Math.random() * M.H * T,
        vy: -(4 + Math.random() * 10),
        life: 0,
        dur: 4 + Math.random() * 4,
        sw: Math.random() * 6.28,
        cool: Math.random() > 0.5
      });
      for (const s of world._sparkles) {
        s.life += dt;
        s.sw += dt * 1.5;
        s.y += s.vy * dt;
        s.x += Math.sin(s.sw) * 6 * dt;
      }
      world._sparkles = world._sparkles.filter(s => s.life < s.dur);
      if (!world._leaves) world._leaves = [];
      if (world._leaves.length < 16 && Math.random() < 0.35) world._leaves.push({
        x: Math.random() * M.W * T,
        y: -4,
        vy: 7 + Math.random() * 9,
        sw: Math.random() * 6.28,
        ph: Math.random() * 6.28,
        spin: 1.4 + Math.random() * 1.4,
        c: LEAF_COLORS[Math.random() * LEAF_COLORS.length | 0]
      });
      for (const lf of world._leaves) {
        lf.sw += dt * (lf.spin || 2);
        lf.y += lf.vy * dt;
        lf.x += Math.sin(lf.sw) * 10 * dt;
      }
      world._leaves = world._leaves.filter(lf => lf.y < M.H * T + 6);
      if (!world._splash) world._splash = [];
      while (world._splash.length && t - world._splash[0].t0 >= 0.5) world._splash.shift();
      if (!world._dust) world._dust = [];
      while (world._dust.length && t - world._dust[0].t0 >= (world._dust[0].life || 0.42)) world._dust.shift();
      if (!world._foot) world._foot = [];
      while (world._foot.length && t - world._foot[0].t0 >= 2) world._foot.shift();
      if (!world._petals) world._petals = [];
      {
        const pvz = world.cam.zoom || 3;
        const pvw = canvas.clientWidth / pvz / 2 + 48;
        const pvh = canvas.clientHeight / pvz / 2 + 48;
        if (world._petals.length < 6 && Math.random() < dt * 0.9 && Math.abs(96 - world.cam.x) < pvw && Math.abs(408 - world.cam.y) < pvh) world._petals.push({
          x: 82 + Math.random() * 28,
          y: 396 + Math.random() * 10,
          gy: 420 + Math.random() * 12,
          vy: 5 + Math.random() * 4,
          sw: Math.random() * 6.28,
          land: 0,
          c: Math.random() < 0.7 ? PETAL_A : PETAL_B
        });
        for (const pt of world._petals) {
          if (pt.land) continue;
          pt.sw += dt * 2;
          pt.y += pt.vy * dt;
          pt.x += Math.sin(pt.sw) * 6 * dt;
          if (pt.y >= pt.gy) {
            pt.y = pt.gy;
            pt.land = t + 1.4;
          }
        }
        world._petals = world._petals.filter(pt => !pt.land || t < pt.land);
      }
      for (const a of agents) {
        if (a.state === "down" || a.state === "reviving") continue;
        const tid = M.g(a.tx, a.ty);
        if (tid === M.POOL) {
          a._wet = 6;
          if (world._splash.length < 8 && Math.random() < dt * 3) world._splash.push({
            x: a.px + (a.dir === "right" ? -7 : a.dir === "left" ? 7 : a._h % 2 ? 3 : -3),
            y: a.py + (a.dir === "down" ? -6 : a.dir === "up" ? 6 : 2),
            t0: t
          });
        } else if (a.state === "social" && !a.moving && a.exercise === "run") {
          const rp = t * 8 + a._h;
          if (world._dust.length < 10 && rp - Math.floor(rp) < dt * 8) world._dust.push({
            x: a.px + (Math.floor(rp) % 2 ? 3 : -3),
            y: a.py + 6,
            dx: a.dir === "left" ? 1 : -1,
            t0: t
          });
        } else if (a.moving && a.path.length) {
          if (a._wet > 0) {
            if (tid === 16) {
              const fp = t * 7 + a._h;
              if (fp - Math.floor(fp) < dt * 7 && world._foot.length < 12) {
                world._foot.push({
                  x: Math.round(a.px) + (a._wet % 2 ? 2 : -3),
                  y: Math.round(a.py) + 5,
                  t0: t
                });
                a._wet--;
              }
            } else a._wet = 0;
          }
          if (world._dust.length < 10) {
            if (tid === 0 || tid === 1) {
              const wp = t * 7 + a._h;
              if (wp - Math.floor(wp) < dt * 7 && Math.random() < 0.45) world._dust.push({
                x: a.px,
                y: a.py + 6,
                dx: a.dir === "left" ? 1 : a.dir === "right" ? -1 : 0,
                t0: t
              });
            } else if (tid === 18 || tid === 19) {
              const wp = t * 7 + a._h;
              if (wp - Math.floor(wp) < dt * 7) world._dust.push({
                x: Math.round(a.px),
                y: Math.round(a.py) + 6,
                dx: 0,
                t0: t,
                c: "#E8F0F6",
                life: 0.25
              });
            }
          }
        }
      }
      if (!world._bflies) world._bflies = [];
      if (FLOWER_TILES.length && world._bflies.length < 4 && Math.random() < dt * 0.35) {
        const f0 = FLOWER_TILES[Math.random() * FLOWER_TILES.length | 0];
        world._bflies.push({
          x: f0[0],
          y: f0[1] - 8,
          tx: f0[0],
          ty: f0[1],
          h: Math.random() * 6.28,
          land: 0,
          c: BFLY_COLORS[Math.random() * BFLY_COLORS.length | 0],
          die: t + 30 + Math.random() * 30
        });
      }
      for (let i = world._bflies.length - 1; i >= 0; i--) {
        const bf = world._bflies[i];
        if (t > bf.die && !bf.land) {
          world._bflies.splice(i, 1);
          continue;
        }
        if (bf.land) {
          if (t >= bf.land) {
            bf.land = 0;
            const nf = FLOWER_TILES[Math.random() * FLOWER_TILES.length | 0];
            bf.tx = nf[0];
            bf.ty = nf[1];
          }
          continue;
        }
        const bdx = bf.tx - bf.x,
          bdy = bf.ty - bf.y;
        const bd = Math.hypot(bdx, bdy);
        if (bd < 2) {
          bf.x = bf.tx;
          bf.y = bf.ty;
          bf.land = t + 1 + Math.random();
        } else {
          const sp = 26;
          bf.x += bdx / bd * sp * dt;
          bf.y += bdy / bd * sp * dt + Math.sin(t * 5 + bf.h) * 14 * dt;
        }
      }
      if (!world._birdNext) world._birdNext = t + 8 + Math.random() * 12;
      if (!world._birdFlock && t >= world._birdNext) {
        const bdir = Math.random() < 0.5 ? 1 : -1;
        const vz = world.cam.zoom || 3;
        const vhw = canvas.clientWidth / vz / 2,
          vhh = canvas.clientHeight / vz / 2;
        world._birdFlock = {
          x: world.cam.x - bdir * (vhw + 30),
          y: Math.max(6, world.cam.y - vhh + 18 + Math.random() * 34),
          dir: bdir,
          sp: 60 + Math.random() * 30,
          n: 2 + (Math.random() < 0.5 ? 1 : 0),
          trav: 0,
          dist: vhw * 2 + 90
        };
      }
      if (world._birdFlock) {
        const fl = world._birdFlock;
        fl.x += fl.dir * fl.sp * dt;
        fl.trav += fl.sp * dt;
        if (fl.trav > fl.dist) {
          world._birdFlock = null;
          world._birdNext = t + 25 + Math.random() * 20;
        }
      }
      if (world._confetti && world._confetti.length) {
        for (const cp of world._confetti) {
          cp.life += dt;
          cp.vy += 230 * dt;
          cp.x += cp.vx * dt;
          cp.y += cp.vy * dt;
          cp.sw += dt * 9;
        }
        world._confetti = world._confetti.filter(cp => cp.life < cp.dur);
      }
      stepHuddle(t);
      stepDuos(t);
      stepGreets(t);
      _missionActive = agents.some(a => a.scripted);
      _meetingNow = agents.some(a => a.state === "meeting");
      stepNavi(dt, t);
      stepCapy(dt, t);
      stepGreen(dt, t);
      MASCOT_KEYS.forEach(k => {
        const c = world[k];
        if (!c) return;
        if (c.moodUntil && t > c.moodUntil) {
          c.mood = CRIT[k].idleMood;
          c.moodUntil = 0;
        }
        if (c.emote && t > c.emote.until) c.emote = null;
        if (c.anim && t > c.anim.t0 + c.anim.dur) {
          if (c.anim.kind === "hop" || c.anim.kind === "startle") c.landFx = t + 0.35;
          c.anim = null;
        }
      });
      stepIncidents(t);
      stepRevive(t);
      stepCommute(dt, t);
      stepWave(t);
      stepRhythm(t);
      stepMeeting(t);
      stepCat(dt, t);
      stepRain(dt, t);
      agents.forEach(a => {
        ambient(a, t);
        stepChoreo(a, dt, t);
        if (a.bubble && t > a.bubble.until) a.bubble = null;
        if (a.emote && t > a.emote.until) a.emote = null;
        if (a.gesture && t > a.gesture.until) a.gesture = null;
        if (a.moodUntil && t > a.moodUntil) {
          a.mood = "neutral";
          a.moodUntil = 0;
        }
        if (a.state === "down" || a.state === "reviving") return;
        if (a.path.length) {
          if (a.pauseUntil) {
            if (t < a.pauseUntil) {
              a.moving = false;
              return;
            }
            a.pauseUntil = 0;
            a.moving = true;
          }
          const [nx, ny] = a.path[0];
          const gx = nx * T + 8,
            gy = ny * T + 8;
          const dx = gx - a.px,
            dy = gy - a.py;
          const dist = Math.hypot(dx, dy);
          const ease = a.path.length === 1 ? Math.max(0.4, Math.min(1, dist / 14)) : 1;
          const adv = SPEED * dt * world.settings.speed * (M.g(a.tx, a.ty) === M.POOL ? 0.45 : 1) * ease;
          a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
          a.stride = (a.stride || 0) + Math.min(dist, adv) * 0.36;
          if (dist <= adv) {
            a.px = gx;
            a.py = gy;
            a.tx = nx;
            a.ty = ny;
            a.path.shift();
          } else if (a.path.length > 1 && dist <= 5) {
            a.tx = nx;
            a.ty = ny;
            a.path.shift();
          } else {
            a.px += dx / dist * adv;
            a.py += dy / dist * adv;
          }
          if (!a.path.length) {
            a.moving = false;
            a.state = a.nextState || "idle";
            applyArrival(a);
            if (a._handoff) handoffArrive(a, t);
          }
        }
      });
      sportTick(t);
    }
    function render() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = canvas.clientWidth,
        vh = canvas.clientHeight;
      if (canvas.width !== vw * dpr || canvas.height !== vh * dpr) {
        canvas.width = vw * dpr;
        canvas.height = vh * dpr;
      }
      const z = world.cam.zoom;
      const bw = Math.ceil(vw / z),
        bh = Math.ceil(vh / z);
      if (!world._buf || world._buf.width !== bw || world._buf.height !== bh) {
        world._buf = document.createElement("canvas");
        world._buf.width = bw;
        world._buf.height = bh;
      }
      const b = world._buf.getContext("2d");
      b.imageSmoothingEnabled = false;
      world.cam.x = Math.max(bw / 2, Math.min(M.W * T - bw / 2, world.cam.x));
      world.cam.y = Math.max(bh / 2, Math.min(M.H * T - bh / 2, world.cam.y));
      const ox = Math.round(world.cam.x - bw / 2),
        oy = Math.round(world.cam.y - bh / 2);
      vpOx = ox;
      vpOy = oy;
      vpW = bw;
      vpH = bh;
      b.fillStyle = "#F2EFE6";
      b.fillRect(0, 0, bw, bh);
      b.drawImage(mapCanvas, -ox, -oy);
      {
        const tw = world._last;
        const drift = Math.floor(tw);
        const tx0 = Math.max(0, ox >> 4),
          ty0 = Math.max(0, oy >> 4);
        const tx1 = Math.min(M.W - 1, (ox + bw >> 4) + 1),
          ty1 = Math.min(M.H - 1, (oy + bh >> 4) + 1);
        for (let ty2 = ty0; ty2 <= ty1; ty2++) for (let tx2 = tx0; tx2 <= tx1; tx2++) {
          const tid = M.g(tx2, ty2);
          if (tid !== TILE_WATER && tid !== M.POOL) continue;
          const pool = tid === M.POOL;
          const h1 = M.hash(tx2 * 7, ty2 * 13);
          if (Math.sin(tw * 1.7 + h1 * 40) > 0.95) {
            b.fillStyle = pool ? "#C8EEFB" : "#F4FCFF";
            b.fillRect(tx2 * T + 2 + ((h1 * 11 | 0) + drift) % 12 - ox, ty2 * T + 2 + (h1 * 23 | 0) % 12 - oy, 1, 1);
          }
          const h2 = M.hash(tx2 * 7 + 1, ty2 * 13);
          if (h2 > 0.93 && Math.sin(tw * 1.1 + h2 * 60) > 0.55) {
            b.fillStyle = pool ? "#9ADDF4" : "#90CDE8";
            b.fillRect(tx2 * T + 2 + ((h2 * 17 | 0) + drift) % 10 - ox, ty2 * T + 3 + (h2 * 29 | 0) % 11 - oy, 3, 1);
          }
        }
        for (let i = 0; i < DOORS.length; i++) {
          const dr = DOORS[i];
          let near = false;
          for (let j = 0; j < agents.length && !near; j++) {
            const ax = agents[j].px - dr.cx,
              ay = agents[j].py - dr.cy;
            if (ax * ax + ay * ay <= 433) near = true;
          }
          if (!near) for (let j = 0; j < CRITTER_DEFS.length && !near; j++) {
            const cc = world[CRITTER_DEFS[j][0]];
            if (!cc) continue;
            const cx = cc.px - dr.cx,
              cy = cc.py - dr.cy;
            if (cx * cx + cy * cy <= 433) near = true;
          }
          if (!near && world._commute && (world._commute.ph === 3 || world._commute.ph === 5)) {
            const ex = world._commute.ex - dr.cx,
              ey = world._commute.ey - dr.cy;
            if (ex * ex + ey * ey <= 433) near = true;
          }
          const want = near ? 2 : 0;
          if (dr.o !== want) {
            if (dr.o === 1) {
              if (world._frame !== dr.f) dr.o = want;
            } else {
              dr.o = 1;
              dr.f = world._frame;
            }
          }
          if (!dr.o || dr.x < ox - T || dr.x > ox + bw || dr.y < oy - T || dr.y > oy + bh) continue;
          const DX = dr.x - ox,
            DY = dr.y - oy;
          const dw = dr.o === 2 ? 10 : 7;
          const d0 = dr.sr ? 1 : 15 - dw;
          b.fillStyle = DOOR_DARK;
          b.fillRect(DX + d0, DY + 3, dw, 13);
          b.fillStyle = DOOR_FLOOR;
          b.fillRect(DX + d0, DY + 14, dw, 2);
          b.fillStyle = DOOR_EDGE;
          b.fillRect(DX + (dr.sr ? d0 + dw : d0 - 1), DY + 3, 1, 13);
        }
        for (let i = 0; i < DESK_GLINTS.length; i++) DESK_GLINTS[i]._occ = false;
        for (let i = 0; i < agents.length; i++) {
          const oa = agents[i];
          if (oa.state === "working" && !oa.moving && oa.tx === oa.deskTile[0] && oa.ty === oa.deskTile[1]) {
            const odg = DESK_BY_TILE[(oa.ty - 1) * M.W + oa.tx];
            if (odg) odg._occ = true;
          }
        }
        for (let i = 0; i < DESK_GLINTS.length; i++) {
          const dg = DESK_GLINTS[i];
          if (dg._occ !== dg.on) {
            dg.on = dg._occ;
            if (dg.on) dg.boot = world._frame + 1;
          }
          if (dg.x < ox - T || dg.x > ox + bw || dg.y < oy - T || dg.y > oy + bh) continue;
          if (!dg.on) {
            b.fillStyle = "#23262B";
            b.fillRect(dg.x + 5 - ox, dg.y + 5 - oy, 4, 3);
            continue;
          }
          if (world._frame <= dg.boot) {
            b.fillStyle = "#DCEAF2";
            b.fillRect(dg.x + 5 - ox, dg.y + 5 - oy, 4, 3);
            continue;
          }
          const gi = tw * 0.5 + dg.h * 5 | 0;
          const gc = M.hash(gi + (dg.x >> 4), dg.y) * 5 | 0;
          b.fillStyle = "#83DEAC";
          b.fillRect(dg.x + 5 - ox, dg.y + 5 - oy, 2, 1);
          if (gc < 4) {
            b.fillStyle = "#F2FFF7";
            b.fillRect(dg.x + GLINT_CX[gc] - ox, dg.y + GLINT_CY[gc] - oy, 1, 1);
          }
        }
        if (world._foot) for (let i = 0; i < world._foot.length; i++) {
          const fp = world._foot[i];
          if (fp.x < ox || fp.x > ox + bw || fp.y < oy || fp.y > oy + bh) continue;
          b.fillStyle = tw - fp.t0 < 1.2 ? FOOT_FRESH : FOOT_FADE;
          b.fillRect(fp.x - ox, fp.y - oy, 1, 1);
        }
        let steamN = 0;
        for (let i = 0; i < COFFEE_MACHINES.length && steamN < 6; i++) {
          const cm = COFFEE_MACHINES[i];
          if (cm.x < ox - T || cm.x > ox + bw || cm.y < oy - T || cm.y > oy + bh) continue;
          b.fillStyle = "#EAF6EF";
          for (let k = 0; k < 3 && steamN < 6; k++) {
            const sd = M.hash(cm.x + k * 31, cm.y + k * 17);
            const ph = (tw / 1.2 + sd) % 1;
            if (ph > 0.8) continue;
            b.fillRect(cm.x + 10 + (Math.sin(ph * 9 + sd * 20) > 0 ? 1 : 0) - ox, cm.y + 4 - Math.round(ph * 11) - oy, 1, 1);
            steamN++;
          }
        }
        for (let i = 0; i < agents.length; i++) {
          const oa = agents[i];
          if (oa.brewUntil && oa.brewUntil > tw && !oa.moving) {
            const BX = oa._bmx - ox,
              BY = oa._bmy - oy;
            if (BX >= -T && BX <= bw && BY >= -T && BY <= bh) {
              const bp = 1 - (oa.brewUntil - tw) / 2.5;
              b.fillStyle = CUP_BAND;
              b.fillRect(BX + 10, BY + 8 + (tw * 10 | 0) % 3, 1, 1);
              if (bp > 0.66) b.fillRect(BX + 10, BY + 10, 2, 2);
              else if (bp > 0.33) b.fillRect(BX + 10, BY + 11, 2, 1);
            }
          }
          if (oa._gameM && oa.relaxKind === "game" && !oa.moving && (oa.gameUntil > tw || oa.gameResUntil > tw)) {
            const GX = oa._gameM - ox,
              GY = 128 - oy;
            if (GX >= -T && GX <= bw && GY >= -T && GY <= bh) {
              b.fillStyle = ARCADE_FLASH[world._frame >> 1 & 1];
              b.fillRect(GX + 5, GY + 5, 6, 3);
            }
          }
          if (oa.snackStage === 1) {
            const sp = Math.max(0, Math.min(1, 1 - (oa.snackAt - tw) / 0.6));
            const ix = Math.round(oa._snX + 7 + (oa.px + 5 - (oa._snX + 7)) * sp);
            const iy = Math.round(oa._snY + 9 + (oa.py - 4 - (oa._snY + 9)) * sp - Math.sin(Math.PI * sp) * 5);
            b.fillStyle = SNACK_COLORS[oa._snC];
            b.fillRect(ix - ox, iy - oy, 2, 2);
          } else if (oa.snackStage === 3 && world._frame & 1) {
            b.fillStyle = "#3FA9F5";
            b.fillRect(Math.round(oa.px) + 5 - ox, Math.round(oa.py) - 16 - oy, 2, 2);
          }
        }
      }
      {
        const ccv = cloudCanvas();
        b.globalAlpha = 0.06;
        for (let i = 0; i < CLOUDS.length; i++) {
          const cl = CLOUDS[i];
          const cw = Math.round(160 * cl.s),
            ch = Math.round(100 * cl.s);
          const cx2 = Math.round(cl.x - cw / 2) - ox,
            cy2 = Math.round(cl.y - ch / 2) - oy;
          if (cx2 > bw || cy2 > bh || cx2 + cw < 0 || cy2 + ch < 0) continue;
          b.drawImage(ccv, cx2, cy2, cw, ch);
        }
        b.globalAlpha = 1;
        const tw2 = world._last;
        for (let i = 0; i < PUD_N; i++) {
          const p = PUDS[i];
          const age = tw2 - p.t0;
          if (age < 0 || age > 120) continue;
          const px2 = p.x - ox,
            py2 = p.y - oy;
          if (px2 < -8 || px2 > bw + 8 || py2 < -6 || py2 > bh + 6) continue;
          b.globalAlpha = age < 90 ? 0.85 : 0.85 * (1 - (age - 90) / 30);
          const w2 = 5 + (p.h * 3 | 0);
          b.fillStyle = PUD_DK;
          b.fillRect(px2 - 1, py2, w2 + 2, 2);
          b.fillRect(px2, py2 - 1, w2, 4);
          b.fillStyle = PUD_BASE;
          b.fillRect(px2, py2, w2, 2);
          b.fillStyle = PUD_GL;
          b.fillRect(px2 + 1 + (p.h * w2 * 0.6 | 0), py2, 1, 1);
          b.globalAlpha = 1;
        }
      }
      if (world._commute) {
        const cm = world._commute;
        const CX = Math.round(cm.cx) - ox,
          CY = Math.round(cm.cy) - oy;
        if (CX > -34 && CX < bw + 2 && CY > -18 && CY < bh + 2) {
          b.fillStyle = "rgba(48,36,20,0.18)";
          b.fillRect(CX + 3, CY + 12, 28, 3);
          b.fillStyle = CAR_CO;
          b.fillRect(CX + 9, CY + 3, 14, 1);
          b.fillRect(CX + 8, CY + 4, 16, 3);
          b.fillStyle = CAR_CC;
          b.fillRect(CX + 9, CY + 4, 14, 3);
          b.fillStyle = "#9CC6DE";
          b.fillRect(CX + 10, CY + 4, 5, 3);
          b.fillRect(CX + 17, CY + 4, 5, 3);
          b.fillStyle = "#E8F6FF";
          b.fillRect(CX + 10, CY + 4, 2, 1);
          b.fillStyle = CAR_CO;
          b.fillRect(CX + 3, CY + 6, 26, 1);
          b.fillRect(CX + 2, CY + 7, 28, 5);
          b.fillRect(CX + 3, CY + 12, 26, 1);
          b.fillStyle = CAR_CC;
          b.fillRect(CX + 3, CY + 7, 26, 5);
          b.fillStyle = CAR_HL;
          b.fillRect(CX + 4, CY + 7, 24, 1);
          b.fillStyle = CAR_DK;
          b.fillRect(CX + 3, CY + 10, 26, 2);
          b.fillStyle = "#1C2026";
          b.fillRect(CX + 6, CY + 11, 5, 4);
          b.fillRect(CX + 21, CY + 11, 5, 4);
          b.fillStyle = "#4A5160";
          b.fillRect(CX + 8, CY + 12, 1, 2);
          b.fillRect(CX + 23, CY + 12, 1, 2);
          b.fillStyle = "#F2D06B";
          b.fillRect(CX + 2, CY + 8, 1, 2);
          b.fillStyle = "#E0685C";
          b.fillRect(CX + 29, CY + 8, 1, 2);
          if ((cm.ph === 1 || cm.ph === 7) && world._frame & 1) {
            b.fillStyle = "#DCE6F0";
            b.fillRect(CX + 7, CY + 12, 1, 1);
            b.fillRect(CX + 22, CY + 12, 1, 1);
          }
        }
        if (cm.ph === 3 || cm.ph === 5) {
          const EX = Math.round(cm.ex) - ox,
            EY = Math.round(cm.ey) - oy;
          if (EX > -12 && EX < bw + 12 && EY > -16 && EY < bh + 16) {
            const ef = (world._last * 7 | 0) & 1;
            b.fillStyle = "rgba(38,28,14,0.16)";
            b.fillRect(EX - 3, EY + 6, 8, 2);
            b.fillStyle = "#3A3F47";
            b.fillRect(EX - 3, EY + 1 + ef, 2, 5 - ef);
            b.fillRect(EX + 1, EY + 2 - ef, 2, 4 + ef);
            b.fillStyle = "#5A7D9A";
            b.fillRect(EX - 4, EY - 5, 8, 6);
            b.fillStyle = "#E8C49A";
            b.fillRect(EX - 3, EY - 11, 6, 6);
            b.fillStyle = "#3A3F47";
            b.fillRect(EX - 3, EY - 12, 6, 2);
          }
        }
      }
      const sorted = [...agents].sort((p, q) => p.py - q.py);
      let catDrawn = false;
      const paintCat = () => {
        catDrawn = true;
        if (cat.px < ox - 20 || cat.px > ox + bw + 20 || cat.py < oy - 20 || cat.py > oy + bh + 20) return;
        b.save();
        b.translate(-ox, -oy);
        drawCat(b, cat, world._frame, world._last);
        b.restore();
      };
      sorted.forEach(a => {
        if (!catDrawn && cat.py <= a.py) paintCat();
        b.save();
        b.translate(-ox, -oy);
        if (a.state !== "swim") {
          const fx = Math.round(a.px),
            fy = Math.round(a.py) + 7;
          b.fillStyle = "rgba(38,28,14,0.16)";
          b.fillRect(fx + 1 - SH_HW0, fy - 1, SH_HW0 * 2, 2);
          b.fillRect(fx + 1 - SH_HW1, fy - 2, SH_HW1 * 2, 1);
          b.fillRect(fx + 1 - SH_HW1, fy + 1, SH_HW1 * 2, 1);
        }
        if (a.state === "meeting" && a.bubble && !a.moving) {
          const rc = D.PROVIDERS[a.def.provider].color;
          const pu = world._frame >> 1 & 1;
          const rx = Math.round(a.px),
            ryy = Math.round(a.py) + 6;
          b.lineWidth = 1;
          b.strokeStyle = shadeHex(rc, -55);
          b.strokeRect(rx - 6.5 - pu, ryy - 2.5 - pu, 13 + pu * 2, 5 + pu * 2);
          b.strokeStyle = shadeHex(rc, 20);
          b.strokeRect(rx - 5.5, ryy - 1.5, 11, 3);
        }
        if (world.selected === a.id) {
          b.strokeStyle = D.PROVIDERS[a.def.provider].color;
          b.lineWidth = 1;
          b.strokeRect(Math.round(a.px) - 7.5, Math.round(a.py) - 16.5, 15, 24);
        }
        drawAgent(b, a, world._frame, world._last);
        b.restore();
      });
      if (!catDrawn) paintCat();
      {
        const tnow = performance.now() / 1000;
        world.fx = world.fx.filter(f => tnow - f.t0 < f.dur + 0.4);
        world.fx.forEach(f => {
          if (tnow < f.t0) return;
          const p2 = Math.min(1, (tnow - f.t0) / f.dur);
          const fxp = Math.round(f.x0 + (f.x1 - f.x0) * p2);
          const arcH = f.kind === "bball" ? 30 : f.kind === "plane" ? 16 : f.kind === "paper" ? 4 : f.kind === "camera" || f.kind === "flash" || f.kind === "polaroid" || f.kind === "discobeam" || f.kind === "stars" ? 0 : 9;
          const fyp = Math.round(f.y0 + (f.y1 - f.y0) * p2 - Math.sin(Math.PI * p2) * arcH);
          b.save();
          b.translate(-ox, -oy);
          if (f.kind === "plane") {
            const dr = f.x1 >= f.x0;
            b.strokeStyle = "rgba(200,194,180,0.45)";
            b.lineWidth = 1;
            b.beginPath();
            b.moveTo(fxp + (dr ? -6 : 6), fyp);
            b.lineTo(fxp + (dr ? -15 : 15), fyp - 1);
            b.stroke();
            b.fillStyle = "#F7F5EE";
            b.beginPath();
            if (dr) {
              b.moveTo(fxp + 5, fyp);
              b.lineTo(fxp - 5, fyp - 3);
              b.lineTo(fxp - 2, fyp);
              b.lineTo(fxp - 5, fyp + 3);
            } else {
              b.moveTo(fxp - 5, fyp);
              b.lineTo(fxp + 5, fyp - 3);
              b.lineTo(fxp + 2, fyp);
              b.lineTo(fxp + 5, fyp + 3);
            }
            b.closePath();
            b.fill();
            b.strokeStyle = "#C8C2B4";
            b.stroke();
            b.fillStyle = "#FFFFFF";
            b.fillRect(fxp + (dr ? 2 : -3), fyp - 1, 1, 1);
          } else if (f.kind === "bball") {
            b.fillStyle = shadeHex("#E8853C", -55);
            b.fillRect(fxp - 3, fyp - 3, 6, 6);
            b.fillStyle = "#E8853C";
            b.fillRect(fxp - 2, fyp - 2, 4, 4);
            b.fillStyle = "#B95F22";
            b.fillRect(fxp - 2, fyp, 4, 1);
            b.fillStyle = "#FFD9B8";
            b.fillRect(fxp - 2, fyp - 2, 1, 1);
            if (p2 >= 1) {
              b.fillStyle = "rgba(255,255,255,0.85)";
              b.fillRect(fxp - 4, fyp + 3, 8, 1);
            }
          } else if (f.kind === "paper") {
            b.fillStyle = "#FFFDF7";
            b.fillRect(fxp - 1, fyp - 1, 3, 2);
            b.fillStyle = "#C8C2B4";
            b.fillRect(fxp + 1, fyp, 1, 1);
          } else if (f.kind === "stars") {
            b.globalAlpha = Math.max(0, 1 - p2);
            b.fillStyle = "#F5C542";
            b.fillRect(fxp - 4, fyp - 1 - Math.round(p2 * 4), 2, 2);
            b.fillRect(fxp + 3, fyp - 2 - Math.round(p2 * 5), 2, 2);
            b.fillRect(fxp - 1, fyp - 4 - Math.round(p2 * 6), 2, 2);
            b.fillStyle = "#FFEDBB";
            b.fillRect(fxp - 1, fyp - 4 - Math.round(p2 * 6), 1, 1);
            b.globalAlpha = 1;
          } else if (f.kind === "camera") {
            const ccx = fxp, ccy = fyp, bob = Math.round(Math.sin(tnow * 4));
            b.fillStyle = shadeHex("#3A3531", -35);
            b.fillRect(ccx - 4, ccy - 3 + bob, 8, 6);
            b.fillRect(ccx - 3, ccy - 5 + bob, 6, 2);
            b.fillStyle = "#3A3531";
            b.fillRect(ccx - 3, ccy - 2 + bob, 6, 4);
            b.fillStyle = shadeHex("#3A3531", 26);
            b.fillRect(ccx - 3, ccy - 2 + bob, 6, 1);
            b.fillStyle = "#2E3440";
            b.fillRect(ccx - 2, ccy - 4 + bob, 4, 2);
            b.fillStyle = "#7FB5E6";
            b.fillRect(ccx - 1, ccy - 1 + bob, 2, 2);
            b.fillStyle = "#FFFFFF";
            b.fillRect(ccx - 1, ccy - 1 + bob, 1, 1);
            b.fillStyle = "#DC2626";
            b.fillRect(ccx + 2, ccy - 3 + bob, 1, 1);
            const ph = tnow - f.t0,
              cd = ph < 2.8 ? 3 - Math.floor(Math.min(2.99, ph / 0.9)) : 0;
            if (cd > 0) {
              b.fillStyle = "#F5C542";
              for (let i = 0; i < cd; i++) b.fillRect(ccx - 2 + i * 2, ccy + 4 + bob, 1, 1);
            }
          } else if (f.kind === "flash") {
            const a = Math.max(0, 1 - Math.sqrt(p2)),
              hw = f.hw || 22;
            b.fillStyle = "rgba(255,255,255," + a + ")";
            b.fillRect(fxp - hw, fyp - 26, hw * 2, 36);
            b.strokeStyle = "rgba(255,255,255," + a * 0.9 + ")";
            b.lineWidth = 2;
            b.beginPath();
            b.arc(fxp, fyp - 6, 2 + p2 * hw, 0, 6.283);
            b.stroke();
          } else if (f.kind === "polaroid") {
            const a = 1 - p2,
              yy = fyp - p2 * 26,
              big = f.big ? 2 : 0;
            b.globalAlpha = a;
            b.fillStyle = "#FFFDF7";
            b.fillRect(fxp - 4 - big, yy - 5 - big, 8 + big * 2, 10 + big * 2);
            b.strokeStyle = "#2A2622";
            b.lineWidth = 1;
            b.strokeRect(fxp - 4 - big + 0.5, yy - 5 - big + 0.5, 8 + big * 2 - 1, 10 + big * 2 - 1);
            (f.dots || []).forEach((c, i) => {
              b.fillStyle = c;
              b.fillRect(fxp - 3 - big + i % 3 * 2, yy - 3 - big + (i > 2 ? 2 : 0), 1, 1);
            });
            b.fillStyle = "#9AA0A6";
            b.fillRect(fxp - 3 - big, yy + 2 + big, 6 + big * 2, 1);
            b.globalAlpha = 1;
            for (let i = 0; i < 3; i++) {
              const ff = (p2 * 1.3 + i * 0.33) % 1;
              b.fillStyle = "rgba(224,69,123," + (1 - ff) * a + ")";
              b.fillRect(fxp - 3 + i * 3, yy - ff * 12, 2, 2);
            }
            b.fillStyle = "rgba(255,255,255," + a + ")";
            b.fillRect(fxp + 2, yy - Math.round(p2 * 8), 1, 1);
            b.fillRect(fxp - 3, yy - Math.round(p2 * 6), 1, 1);
          } else if (f.kind === "discobeam") {
            const a = Math.sin(Math.PI * p2) * 0.4;
            b.globalAlpha = a;
            b.strokeStyle = f.c;
            b.lineWidth = 2;
            b.beginPath();
            b.moveTo(f.x0, f.y0);
            b.lineTo(f.x1, f.y1);
            b.stroke();
            b.globalAlpha = 1;
          } else {
            b.fillStyle = shadeHex("#F4F1E6", -60);
            b.fillRect(fxp - 3, fyp - 3, 6, 6);
            b.fillStyle = "#F4F1E6";
            b.fillRect(fxp - 2, fyp - 2, 4, 4);
            b.fillStyle = "#3A3531";
            b.fillRect(fxp - 1, fyp - 1, 2, 2);
            b.fillStyle = "#FFFFFF";
            b.fillRect(fxp - 2, fyp - 2, 1, 1);
          }
          b.restore();
        });
      }
      if (world._sparkles && world._sparkles.length) {
        b.save();
        b.translate(-ox, -oy);
        world._sparkles.forEach(s => {
          const a = Math.sin(Math.PI * (s.life / s.dur));
          if (a <= 0) return;
          b.fillStyle = s.cool ? `rgba(255,224,150,${a * 0.5})` : `rgba(255,188,120,${a * 0.5})`;
          b.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3);
          b.fillStyle = `rgba(255,250,235,${a * 0.9})`;
          b.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
        });
        b.restore();
      }
      {
        const TURB = [[3 * T + 8, 42 * T + 8], [61 * T + 8, 17 * T + 8]];
        const ang = world._frame * 0.5;
        b.save();
        b.translate(-ox, -oy);
        TURB.forEach(([tx, ty]) => {
          b.fillStyle = "rgba(40,60,45,0.16)";
          b.fillRect(tx - 2, ty + 2, 9, 2);
          b.fillStyle = "#8FA0AE";
          b.fillRect(tx - 1, ty - 28, 4, 30);
          b.fillStyle = "#E6EAEE";
          b.fillRect(tx, ty - 28, 2, 30);
          b.fillStyle = "#F4F7FA";
          b.fillRect(tx, ty - 28, 1, 30);
          for (let k = 0; k < 3; k++) {
            const a = ang + k * 2.0944;
            b.strokeStyle = "#8FA0AE";
            b.lineWidth = 3.5;
            b.beginPath();
            b.moveTo(tx + 1, ty - 28);
            b.lineTo(tx + 1 + Math.cos(a) * 12, ty - 28 + Math.sin(a) * 12);
            b.stroke();
            b.strokeStyle = "#F4F7FA";
            b.lineWidth = 2;
            b.beginPath();
            b.moveTo(tx + 1, ty - 28);
            b.lineTo(tx + 1 + Math.cos(a) * 12, ty - 28 + Math.sin(a) * 12);
            b.stroke();
          }
          b.fillStyle = "#6E8090";
          b.fillRect(tx - 1, ty - 30, 4, 4);
          b.fillStyle = "#9DB0C0";
          b.fillRect(tx, ty - 29, 2, 2);
          b.fillStyle = "#FFFFFF";
          b.fillRect(tx, ty - 29, 1, 1);
        });
        b.restore();
      }
      if (world._leaves && world._leaves.length) {
        b.save();
        b.translate(-ox, -oy);
        world._leaves.forEach(lf => {
          const x = Math.round(lf.x),
            y = Math.round(lf.y);
          b.fillStyle = lf.c;
          b.fillRect(x, y, 2, 2);
          b.fillRect(x + (Math.sin(lf.sw * 1.6 + (lf.ph || 0)) > 0 ? 1 : -1), y - 1, 1, 1);
        });
        b.restore();
      }
      if (world._petals && world._petals.length) {
        b.save();
        b.translate(-ox, -oy);
        for (const pt of world._petals) {
          b.fillStyle = pt.land && pt.land - world._last < 0.6 ? PETAL_FADE : pt.c;
          b.fillRect(Math.round(pt.x), Math.round(pt.y), 1, 1);
        }
        b.restore();
      }
      if (world._splash && world._splash.length || world._dust && world._dust.length) {
        const tp = world._last;
        b.save();
        b.translate(-ox, -oy);
        if (world._splash) for (const s of world._splash) {
          const ag = tp - s.t0;
          const sz = ag < 0.3 ? 2 : 1;
          b.fillStyle = ag < 0.15 ? "#FFFFFF" : "#EAF8FD";
          b.fillRect(Math.round(s.x), Math.round(s.y) + (ag < 0.25 ? -1 : 0), sz, sz);
        }
        if (world._dust) for (const d of world._dust) {
          const ag = tp - d.t0;
          if (ag >= (d.life || 0.42)) continue;
          if (d.c) {
            b.fillStyle = d.c;
            b.fillRect(Math.round(d.x), Math.round(d.y) - 1, 1, 1);
            continue;
          }
          b.fillStyle = "#BFB298";
          if (ag < 0.2) b.fillRect(Math.round(d.x) - 1, Math.round(d.y), 2, 2);else b.fillRect(Math.round(d.x) + d.dx, Math.round(d.y) - 1, 1, 1);
        }
        b.restore();
      }
      if (world._bflies && world._bflies.length) {
        const tw = world._last;
        b.save();
        b.translate(-ox, -oy);
        for (const bf of world._bflies) {
          const bx = Math.round(bf.x),
            by = Math.round(bf.y);
          if (bx < ox - 6 || bx > ox + bw + 6 || by < oy - 6 || by > oy + bh + 6) continue;
          b.fillStyle = "#2A2622";
          b.fillRect(bx, by, 1, 2);
          b.fillStyle = bf.c;
          if (bf.land) {
            b.fillRect(bx, by - 1, 1, 1);
          } else if (Math.floor(tw * 16 + bf.h * 3) % 2) {
            b.fillRect(bx - 2, by, 2, 1);
            b.fillRect(bx + 1, by, 2, 1);
          } else {
            b.fillRect(bx - 1, by - 1, 1, 1);
            b.fillRect(bx + 1, by - 1, 1, 1);
          }
        }
        b.restore();
      }
      if (world._birdFlock) {
        const fl = world._birdFlock;
        const tw = world._last;
        b.save();
        b.translate(-ox, -oy);
        for (let i = 0; i < fl.n; i++) {
          const bx = Math.round(fl.x - fl.dir * i * 7);
          const by = Math.round(fl.y + i % 2 * 3);
          b.fillStyle = "rgba(38,28,14,0.16)";
          b.fillRect(bx, by + 26, 2, 1);
          b.fillStyle = "#3A3531";
          if (Math.floor(tw * 7 + i) % 2) {
            b.fillRect(bx - 1, by - 1, 1, 1);
            b.fillRect(bx, by, 1, 1);
            b.fillRect(bx + 1, by - 1, 1, 1);
          } else {
            b.fillRect(bx - 1, by, 3, 1);
          }
        }
        b.restore();
      }
      {
        const atmo = b.createLinearGradient(0, 0, 0, bh);
        atmo.addColorStop(0, "rgba(255,240,206,0.20)");
        atmo.addColorStop(0.5, "rgba(255,250,238,0.04)");
        atmo.addColorStop(1, "rgba(255,214,150,0.12)");
        b.fillStyle = atmo;
        b.fillRect(0, 0, bw, bh);
        const vig = b.createRadialGradient(bw / 2, bh / 2, Math.min(bw, bh) * 0.36, bw / 2, bh / 2, Math.max(bw, bh) * 0.74);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(150,96,30,0.10)");
        b.fillStyle = vig;
        b.fillRect(0, 0, bw, bh);
      }
      {
        const tint = dayTint(world.time);
        if (tint.a > 0.002) {
          b.fillStyle = `rgba(${tint.r},${tint.g},${tint.b},${tint.a})`;
          b.fillRect(0, 0, bw, bh);
        }
        if (world.settings.night || tint.a >= 0.2) {
          for (let i = 0; i < NIGHT_LIGHTS.length; i++) {
            const nl = NIGHT_LIGHTS[i];
            const lx = nl[0] - ox,
              ly = nl[1] - oy;
            if (lx < -8 || lx > bw + 8 || ly < -4 || ly > bh + 4) continue;
            b.fillStyle = NL_FILL;
            for (let r = 0; r < 5; r++) b.fillRect(lx + NL_ROW_X[r], ly + r - 2, NL_ROW_W[r], 1);
            b.fillStyle = NL_CORE;
            b.fillRect(lx - 3, ly, 6, 1);
          }
          const pgx = 866 - ox,
            pgy = 104 - oy;
          if (pgx < bw && pgx + 108 > 0 && pgy >= 0 && pgy + 3 <= bh) {
            b.fillStyle = NL_POOL_GLOW;
            b.fillRect(pgx, pgy, 108, 1);
            b.fillRect(pgx + 6, pgy + 3, 96, 1);
          }
        }
      }
      if (rain && rain.k > 0.01 && !document.hidden) {
        const rn = Math.round(rain.k * RAIN_N);
        b.fillStyle = RAIN_COL;
        for (let i = 0; i < rn; i++) {
          const d = rainDrops[i];
          const rx = (d.x | 0) - ox,
            ryy = (d.y | 0) - oy;
          if (rx < 0 || rx > bw || ryy < -3 || ryy > bh) continue;
          b.fillRect(rx, ryy, 1, 3);
        }
        b.fillStyle = `rgba(36,48,70,${(rain.k * 0.1).toFixed(3)})`;
        b.fillRect(0, 0, bw, bh);
      }
      {
        for (let i = 0; i < 4; i++) {
          const ins = i * 10;
          b.fillStyle = `rgba(30,26,20,${VIG_STEPS[i]})`;
          b.fillRect(ins, ins, bw - ins * 2, 10);
          b.fillRect(ins, bh - ins - 10, bw - ins * 2, 10);
          b.fillRect(ins, ins, 10, bh - ins * 2);
          b.fillRect(bw - ins - 10, ins, 10, bh - ins * 2);
        }
      }
      {
        const wt = world.weatherTint;
        if (wt && wt.a > 0.004) {
          b.fillStyle = `rgba(${Math.round(wt.r)},${Math.round(wt.g)},${Math.round(wt.b)},${wt.a})`;
          b.fillRect(0, 0, bw, bh);
        }
      }
      {
        const au = world._aurora;
        if (au && au.lit > 0.01) {
          const conf = au.conf;
          let r, g, bl;
          if (conf >= 0.5) {
            const t = (conf - 0.5) * 2;
            r = 235 - 175 * t;
            g = 180 + 30 * t;
            bl = 70 + 70 * t;
          } else {
            const t = conf * 2;
            r = 225 + 10 * t;
            g = 90 + 90 * t;
            bl = 80 - 10 * t;
          }
          r = r | 0;
          g = g | 0;
          bl = bl | 0;
          const fr = world._frame * 0.05;
          const flicker = 0.78 + 0.22 * Math.sin(fr) + (conf < 0.45 ? 0.16 * Math.sin(fr * 3.3) : 0);
          const peak = (0.05 + au.lit * 0.17) * Math.max(0.4, flicker);
          const bandH = Math.round(bh * 0.42);
          const grad = b.createLinearGradient(0, 0, 0, bandH);
          grad.addColorStop(0, `rgba(${r},${g},${bl},${peak.toFixed(3)})`);
          grad.addColorStop(0.55, `rgba(${r},${g},${bl},${(peak * 0.4).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
          b.fillStyle = grad;
          b.fillRect(0, 0, bw, bandH);
          b.save();
          b.globalAlpha = au.lit * 0.5;
          b.strokeStyle = `rgba(${Math.min(255, r + 35)},${Math.min(255, g + 35)},${Math.min(255, bl + 35)},0.55)`;
          b.lineWidth = 2;
          b.beginPath();
          const ry = bandH * 0.5;
          for (let x = 0; x <= bw; x += 10) {
            const y = ry + Math.sin(x * 0.018 + fr) * 8 + Math.sin(x * 0.05 + fr * 1.8) * 3;
            if (x === 0) b.moveTo(x, y);else b.lineTo(x, y);
          }
          b.stroke();
          b.restore();
        }
      }
      if (world._confetti && world._confetti.length) {
        b.save();
        b.translate(-ox, -oy);
        world._confetti.forEach(cp => {
          b.globalAlpha = Math.min(1, 1 - cp.life / cp.dur * 0.65);
          b.fillStyle = cp.c;
          const h = Math.sin(cp.sw) > 0 ? cp.w : 1;
          b.fillRect(Math.round(cp.x), Math.round(cp.y), cp.w, Math.max(1, h));
        });
        b.globalAlpha = 1;
        b.restore();
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, vw, vh);
      ctx.drawImage(world._buf, 0, 0, bw, bh, 0, 0, bw * z, bh * z);
      const toScreen = (wx, wy) => [(wx - ox) * z, (wy - oy) * z];
      CRITTER_DEFS.forEach(([k, key]) => {
        const c = world[k];
        if (!c) return;
        const [sx, sy] = toScreen(c.px, c.py);
        if (sx < -80 || sx > vw + 80 || sy < -80 || sy > vh + 80) return;
        ctx.fillStyle = "rgba(38,28,14,0.15)";
        ctx.beginPath();
        ctx.ellipse(sx + z, sy + (CRIT_SHADOW[key] || 0) * z, 6.5 * z * SH_MUL, 2.4 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        drawCritterImg(ctx, c, key, sx, sy, z, world._frame, world._last);
        if (c.emote) drawEmote(ctx, c, sx, sy - 13 * z, z, world._frame);
        if (world.settings.labels) drawCritterLabel(ctx, sx, sy, z, CRITTER_NAME[key] || "", CRITTER_LABEL[key]);
      });
      {
        const lz = z <= 3 ? 1 : z >= 4.5 ? 0 : (4.5 - z) / 1.5;
        if (lz > 0.03) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ZONES.forEach(zn => {
            const [zx, zyRaw] = toScreen(zn.x * T, zn.y * T);
            if (zx < -100 || zx > vw + 100 || zyRaw < -40 || zyRaw > vh + 40) return;
            ctx.font = zn.in ? "700 7.6px ui-monospace, Menlo, monospace" : "700 9.5px ui-monospace, Menlo, monospace";
            const tw = ctx.measureText(zn.t).width;
            const cx = Math.round(zx);
            ctx.globalAlpha = lz;
            if (zn.in) {
              const bw2 = Math.round(tw) + 12,
                bh2 = 13,
                by = Math.round(zyRaw) - 7;
              ctx.fillStyle = "#4A4234";
              ctx.fillRect(cx - bw2 / 2 - 1, by - 1, bw2 + 2, bh2 + 2);
              ctx.fillStyle = "#F4F1E6";
              ctx.fillRect(cx - bw2 / 2, by, bw2, bh2);
              ctx.fillStyle = "#E0D8C6";
              ctx.fillRect(cx - bw2 / 2, by + bh2 - 2, bw2, 2);
              ctx.fillStyle = "#3A2614";
              ctx.fillText(zn.t, cx, by + bh2 / 2 + 1);
              return;
            }
            const bw2 = tw + 16,
              bh2 = 17,
              ground = Math.round(zyRaw) + 16,
              by = ground - 40,
              postTop = by + bh2;
            ctx.fillStyle = "rgba(38,28,14,0.18)";
            ctx.fillRect(cx - 4, ground - 1, 10, 2);
            ctx.fillStyle = "#3F7A4C";
            ctx.fillRect(cx - 4, ground - 3, 3, 3);
            ctx.fillRect(cx + 1, ground - 3, 3, 3);
            ctx.fillStyle = "#4A3018";
            ctx.fillRect(cx - 2, postTop, 4, ground - postTop);
            ctx.fillStyle = "#9C6B3C";
            ctx.fillRect(cx - 1, postTop, 2, ground - postTop);
            ctx.fillStyle = "#4A3018";
            ctx.fillRect(cx - bw2 / 2 - 1, by - 1, bw2 + 2, bh2 + 2);
            ctx.fillStyle = "#C8A06E";
            ctx.fillRect(cx - bw2 / 2, by, bw2, bh2);
            ctx.fillStyle = "#DDBB88";
            ctx.fillRect(cx - bw2 / 2, by, bw2, 3);
            ctx.fillStyle = "#A87E4E";
            ctx.fillRect(cx - bw2 / 2, by + bh2 - 3, bw2, 3);
            ctx.fillStyle = "#3A2614";
            ctx.fillText(zn.t, cx, by + bh2 / 2 + 1);
          });
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
      let bn = 0;
      sorted.forEach(a => {
        const [sx, sy] = toScreen(a.px, a.py);
        if (world.settings.labels) drawLabel(ctx, a, sx, sy, z);
        if (a.bubble) {
          if (bn < BUB_MAX) {
            const s = BUBS[bn];
            s.a = a;
            s.sx = sx;
            s.sy = sy;
            layoutBubble(ctx, s, z);
            if (s.bx <= vw && s.bx + s.w >= 0 && s.by <= vh && s.by + s.h >= 0) bn++;
          }
        } else if (a.emote) drawEmote(ctx, a, sx, sy, z, world._frame);
        if (a.state === "down") drawAlert(ctx, sx, sy, z, world._frame);
      });
      if (bn) {
        for (let i = 1; i < bn; i++) for (let j = i; j > 0 && BUBS[j].t0 < BUBS[j - 1].t0; j--) {
          const tmp = BUBS[j];
          BUBS[j] = BUBS[j - 1];
          BUBS[j - 1] = tmp;
        }
        for (let i = 0; i < bn; i++) BUBS[i].dy = 0;
        for (let i = 1; i < bn; i++) {
          let guard = 0,
            moved = true;
          while (moved && guard++ <= bn) {
            moved = false;
            for (let j = 0; j < i; j++) {
              const A = BUBS[i],
                B2 = BUBS[j];
              const ay0 = A.by + A.dy,
                by0 = B2.by + B2.dy;
              if (A.bx < B2.bx + B2.w && A.bx + A.w > B2.bx && ay0 < by0 + B2.h && ay0 + A.h > by0) {
                A.dy = by0 - 2 - A.h - A.by;
                moved = true;
              }
            }
          }
        }
        for (let i = 0; i < bn; i++) {
          paintBubble(ctx, BUBS[i]);
          BUBS[i].a = null;
        }
      }
    }
    function drawLabel(ctx2, a, sx, sy, z) {
      const c = D.PROVIDERS[a.def.provider].color;
      const label = (a.def.lead ? "★ " : "") + a.def.name;
      ctx2.font = "700 11px ui-monospace, Menlo, monospace";
      const w = ctx2.measureText(label).width + 14;
      const yTop = sy + 8 * (z / 3) + 6;
      const bx = Math.round(sx - w / 2),
        by = Math.round(yTop),
        bwd = Math.round(w);
      ctx2.fillStyle = "rgba(26,32,54,0.9)";
      ctx2.fillRect(bx, by + 1, bwd, 18);
      ctx2.fillRect(bx + 1, by, bwd - 2, 20);
      ctx2.fillStyle = "rgba(255,246,216,0.22)";
      ctx2.fillRect(bx + 1, by, bwd - 2, 1);
      ctx2.fillStyle = "rgba(12,16,32,0.6)";
      ctx2.fillRect(bx + 1, by + 19, bwd - 2, 1);
      ctx2.fillStyle = a.state === "down" ? "#F09A93" : c;
      ctx2.textAlign = "center";
      ctx2.fillText(label, sx, yTop + 13);
      ctx2.textAlign = "left";
    }
    function drawCritterLabel(ctx2, sx, sy, z, name, col) {
      ctx2.font = "700 11px ui-monospace, Menlo, monospace";
      const w = ctx2.measureText(name).width + 14;
      const yTop = Math.round(sy + 8 * z - 30 * z - 22);
      const cbx = Math.round(sx - w / 2),
        cbw = Math.round(w);
      ctx2.fillStyle = "rgba(26,32,54,0.9)";
      ctx2.fillRect(cbx, yTop + 1, cbw, 16);
      ctx2.fillRect(cbx + 1, yTop, cbw - 2, 18);
      ctx2.fillStyle = "rgba(255,246,216,0.22)";
      ctx2.fillRect(cbx + 1, yTop, cbw - 2, 1);
      ctx2.fillStyle = col || "#FFB23E";
      ctx2.textAlign = "center";
      ctx2.fillText(name, sx, yTop + 13);
      ctx2.textAlign = "left";
    }
    const BUB_MAX = 8;
    const BUBS = [];
    for (let i = 0; i < BUB_MAX; i++) BUBS.push({ a: null, sx: 0, sy: 0, w: 0, h: 0, bx: 0, by: 0, dy: 0, t0: 0, err: false, grow: false, txtOn: true, lines: [] });
    function layoutBubble(ctx2, s, z) {
      const a = s.a;
      const text = a.bubble.text || "";
      s.err = a.bubble.tone === "error";
      ctx2.font = "12px ui-monospace, Menlo, monospace";
      const maxW = 190;
      const words = text.split(" ");
      s.lines.length = 0;
      let cur = "";
      for (let i = 0; i < words.length; i++) {
        const tryLine = cur ? cur + " " + words[i] : words[i];
        if (ctx2.measureText(tryLine).width > maxW && cur) {
          s.lines.push(cur);
          cur = words[i];
        } else cur = tryLine;
      }
      if (cur) s.lines.push(cur);
      let lw = 0;
      for (let i = 0; i < s.lines.length; i++) {
        const w2 = ctx2.measureText(s.lines[i]).width;
        if (w2 > lw) lw = w2;
      }
      s.w = Math.min(maxW, lw) + 16;
      s.h = s.lines.length * 15 + 12;
      s.bx = Math.round(s.sx - s.w / 2);
      s.by = Math.round(s.sy - 16 * (z / 3) - s.h - 14);
      s.t0 = a.bubble.t0 ?? -1;
      const age = now() - s.t0;
      s.grow = age < 0.08;
      s.txtOn = age >= 0.15;
      s.dy = 0;
    }
    function paintBubble(ctx2, s) {
      const err = s.err;
      const bx = s.bx,
        by = s.by + s.dy,
        w = s.w,
        h = s.h;
      ctx2.font = "12px ui-monospace, Menlo, monospace";
      if (s.grow) {
        const w2 = Math.round(w / 2),
          h2 = Math.round(h / 2);
        const bx2 = Math.round(s.sx - w2 / 2),
          by2 = by + h - h2;
        ctx2.fillStyle = err ? "#FFF1F1" : "#FFFDF7";
        ctx2.fillRect(bx2, by2, w2, h2);
        ctx2.strokeStyle = err ? "#DC2626" : "#2A2622";
        ctx2.lineWidth = 2;
        ctx2.strokeRect(bx2 + 1, by2 + 1, w2 - 2, h2 - 2);
        ctx2.fillStyle = err ? "#FFF1F1" : "#FFFDF7";
        ctx2.fillRect(Math.round(s.sx) - 3, by + h, 6, 3);
        return;
      }
      ctx2.fillStyle = err ? "#FFF1F1" : "#FFFDF7";
      ctx2.fillRect(bx, by, w, h);
      ctx2.strokeStyle = err ? "#DC2626" : "#2A2622";
      ctx2.lineWidth = 2;
      ctx2.strokeRect(bx + 1, by + 1, w - 2, h - 2);
      ctx2.fillStyle = err ? "#FFF1F1" : "#FFFDF7";
      ctx2.fillRect(Math.round(s.sx) - 5, by + h, 10, 4);
      ctx2.fillRect(Math.round(s.sx) - 2, by + h + 4, 4, 4);
      if (!s.txtOn) return;
      ctx2.fillStyle = err ? "#B91C1C" : "#2A2622";
      for (let i = 0; i < s.lines.length; i++) ctx2.fillText(s.lines[i], bx + 8, by + 17 + i * 15);
    }
    let drag = null,
      downAt = null;
    canvas.addEventListener("pointerdown", e => {
      ensureAudio();
      world.camTarget = null;
      drag = {
        x: e.clientX,
        y: e.clientY,
        cx: world.cam.x,
        cy: world.cam.y
      };
      downAt = {
        x: e.clientX,
        y: e.clientY
      };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
      if (!drag) {
        canvas.style.cursor = agentAtScreen(e.clientX, e.clientY) ? "pointer" : "grab";
        return;
      }
      world.cam.x = drag.cx - (e.clientX - drag.x) / world.cam.zoom;
      world.cam.y = drag.cy - (e.clientY - drag.y) / world.cam.zoom;
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointerup", e => {
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 5) {
        const a = agentAtScreen(e.clientX, e.clientY);
        world.selected = a ? a.id : null;
        world.onAgentClick(a ? a.id : null);
      }
      drag = null;
      downAt = null;
      canvas.style.cursor = "grab";
    });
    canvas.addEventListener("wheel", e => {
      e.preventDefault();
      const zooms = [2, 3, 4, 5];
      const i = zooms.indexOf(world.cam.zoom);
      const ni = Math.max(0, Math.min(zooms.length - 1, i + (e.deltaY < 0 ? 1 : -1)));
      world.cam.zoom = zooms[ni];
    }, {
      passive: false
    });
    function agentAtScreen(cx, cy) {
      const r = canvas.getBoundingClientRect();
      const z = world.cam.zoom;
      const bw = Math.ceil(canvas.clientWidth / z),
        bh = Math.ceil(canvas.clientHeight / z);
      const ox = Math.round(world.cam.x - bw / 2),
        oy = Math.round(world.cam.y - bh / 2);
      const wx = (cx - r.left) / z + ox,
        wy = (cy - r.top) / z + oy;
      return agents.find(a => Math.abs(a.px - wx) < 9 && Math.abs(a.py - wy + 5) < 13) || null;
    }
    world.command = (id, cmd) => {
      const a = byId[id];
      if (!a) return;
      if (cmd.scripted && (a.state === "down" || a.state === "reviving")) {
        a.state = "working";
        a.crashErr = null;
        a.bubble = null;
      }
      if (cmd.scripted != null) a.scripted = cmd.scripted;
      if (a.state === "down" || a.state === "reviving") return;
      if (cmd.say) say(a, cmd.say, cmd.dur || 5);
      if (cmd.goto) {
        sendTo(a, cmd.goto, cmd.state || "working");
        if (cmd.relax) a.pendingRelax = cmd.relax;
      } else if (cmd.state) a.state = cmd.state;
      if (cmd.mood) {
        a.mood = cmd.mood;
        a.moodUntil = cmd.moodDur ? now() + cmd.moodDur : 0;
      }
      if (cmd.emote) a.emote = {
        kind: cmd.emote,
        until: now() + (cmd.emoteDur || 3)
      };
    };
    world.walkTo = (id, targetId) => {
      const a = byId[id],
        t = byId[targetId];
      if (!a || !t) return;
      sendTo(a, { x: t.tx, y: t.ty }, "social");
      a._handoff = targetId;
      if (!a.moving) handoffArrive(a, now());
    };
    world.crash = crash;
    world.revive = revive;
    world.focusAgent = id => {
      const a = byId[id];
      if (!a) return;
      world.selected = id;
      world.cam.x = a.px;
      world.cam.y = a.py;
    };
    world.setZoom = z => {
      world.cam.zoom = z;
    };
    world.centerOnHQ = () => {
      world.cam.x = 41.5 * T;
      world.cam.y = 17 * T;
    };
    world.glide = (x, y) => {
      world.camTarget = {
        x,
        y
      };
    };
    world.celebrate = (cx, cy) => {
      if (!world._confetti) world._confetti = [];
      const spawn = (bx, by, n) => {
        for (let i = 0; i < n; i++) {
          const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.3;
          const sp = 55 + Math.random() * 130;
          world._confetti.push({
            x: bx + (Math.random() - 0.5) * 12,
            y: by - 6,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 0,
            dur: 1.5 + Math.random() * 1.3,
            c: CONFETTI_COLORS[Math.random() * CONFETTI_COLORS.length | 0],
            sw: Math.random() * 6.28,
            w: 2 + Math.random() * 2 | 0
          });
        }
      };
      if (typeof cx === "number") spawn(cx, cy, 36);else agents.forEach(a => spawn(a.px, a.py - 10, 13));
      if (world._confetti.length > 280) world._confetti.splice(0, world._confetti.length - 280);
      hifivePairs(typeof cx === "number" ? agents.filter(a => Math.hypot(a.px - cx, a.py - cy) < 4 * T) : agents);
    };
    const eachMascot = fn => MASCOT_KEYS.forEach(k => world[k] && fn(world[k], CRIT[k], k));
    function mascotSendTile(c, x, y) {
      const [tx, ty] = nearestWalkable(x, y);
      const p = findPath(c.tx, c.ty, tx, ty, inWater);
      if (p && p.length) {
        c.path = p;
        c.state = "walk";
      }
    }
    world.feelCritter = (key, mood, emote, dur = 5) => {
      const c = world[key];
      if (c) critFeel(c, mood, emote, dur);
    };
    world.mascotClear = () => eachMascot(c => {
      c.act = null;
      c.actUntil = 0;
      c.hold = 0;
      c.anim = null;
      c.faceX = null;
      c.aiState = "";
      c.target = null;
      c.faceDir = null;
    });
    world.mascotReact = (kind, opts = {}) => {
      const t = now();
      const dur = opts.dur || ({ perk: 5, question: 5, worryFlag: 5, relieved: 5, reportHi: 6, reportLo: 5, completed: 8, failed: 7, progress: 3.5 }[kind] || 4.5);
      const ring = [[-1, 0], [1, 0], [-1, 1], [1, 1]];
      switch (kind) {
        case "perk":
          eachMascot((c, cfg) => {
            c.act = "perk";
            c.actUntil = t + dur;
            critFeel(c, "curious", cfg.faves[0], dur * 0.7);
            critAnim(c, "hop", 0.45, cfg.amp, 2);
            c.faceX = (opts.x == null ? 18 : opts.x) * T + 8;
          });
          break;
        case "progress":
          {
            const k = pick(MASCOT_KEYS),
              c = world[k],
              cfg = CRIT[k];
            if (c && t > c.actUntil) {
              c.act = "cheer";
              c.actUntil = t + dur;
              critAnim(c, "hop", 0.45, cfg.amp * 0.8);
              critFeel(c, "happy", cfg.faves[0], dur * 0.8);
            }
            break;
          }
        case "question":
          {
            const c = world._toro,
              cfg = CRIT._toro;
            if (c) {
              c.act = "tilt";
              c.actUntil = t + dur;
              critAnim(c, "headtilt", 0.9, cfg.amp);
              critFeel(c, "curious", "question", dur * 0.8);
              if (opts.x != null) c.faceX = opts.x * T + 8;
            }
            break;
          }
        case "worryFlag":
          eachMascot((c, cfg) => {
            c.act = "worry";
            c.actUntil = t + dur;
            critAnim(c, "shake", 0.4, cfg.amp * 0.6);
            critFeel(c, "scared", "exclaim", dur * 0.8);
          });
          break;
        case "relieved":
          eachMascot((c, cfg) => {
            c.act = "relieved";
            c.actUntil = t + dur;
            critAnim(c, "hop", 0.45, cfg.amp, 2);
            critFeel(c, "happy", cfg.faves[0], dur * 0.8);
          });
          break;
        case "reportHi":
          {
            const d = opts.desk;
            eachMascot((c, cfg, k) => {
              c.act = "rush";
              c.actUntil = t + dur + 2.5;
              if (d) {
                const o = ring[MASCOT_KEYS.indexOf(k)];
                mascotSendTile(c, d.x + o[0], d.y + 1);
                c.faceX = d.x * T + 8;
              }
              critAnim(c, "hop", 0.45, cfg.amp * 1.2, 2);
              critFeel(c, "love", "heart", dur);
            });
            break;
          }
        case "reportLo":
          eachMascot((c, cfg) => {
            c.act = "subdued";
            c.actUntil = t + dur;
            critFeel(c, "sad", "dot3", dur * 0.7);
          });
          break;
        case "completed":
          {
            const px = opts.x == null ? 18 : opts.x,
              py = opts.y == null ? 13 : opts.y;
            eachMascot((c, cfg, k) => {
              c.act = "party";
              c.actUntil = t + dur;
              const o = ring[MASCOT_KEYS.indexOf(k)];
              mascotSendTile(c, px + o[0], py + o[1]);
              c.hold = t + dur;
              critAnim(c, "spin", 0.55, cfg.amp, 1);
              critFeel(c, "excited", cfg.faves[1] || "party", dur);
              c.faceX = px * T + 8;
            });
            if (world.celebrate) setTimeout(() => world.celebrate(px * T + 8, py * T + 8), 1100);
            break;
          }
        case "failed":
          eachMascot((c, cfg) => {
            c.act = "droop";
            c.actUntil = t + dur;
            critFeel(c, "sad", "dot3", dur * 0.7);
          });
          break;
        case "photo":
          {
            const k = opts.key || (world._navi ? "_navi" : "_capy"),
              c = world[k],
              cfg = CRIT[k];
            if (!c || c.act && t < c.actUntil) break;
            c.act = "photo";
            c.actUntil = t + (opts.dur || 6.2);
            c.hold = c.actUntil;
            if (opts.tile) mascotSendTile(c, opts.tile.x, opts.tile.y);
            c.faceX = opts.faceX != null ? opts.faceX : (opts.x == null ? 18 : opts.x) * T + 8;
            critAnim(c, "wave", 1, cfg.amp);
            critFeel(c, "happy", "cool", (opts.dur || 6.2) * 0.5);
            setTimeout(() => {
              const cc = world[k];
              if (cc && cc.act === "photo") {
                critAnim(cc, "hop", 0.45, CRIT[k].amp, 1);
                critFeel(cc, "love", "heart", 2.2);
              }
            }, opts.flashMs || 3200);
            break;
          }
        case "spinpop":
          {
            const sx = opts.x == null ? 18 : opts.x,
              sy = opts.y == null ? 13 : opts.y;
            eachMascot((c, cfg, k) => {
              if (c.act && t < c.actUntil && c.act !== "party") return;
              c.act = "spinpop";
              c.actUntil = t + 4;
              c.hold = t + 4;
              const side = k === "_navi" ? -1 : 1;
              mascotSendTile(c, sx + side, sy);
              c.faceX = sx * T + 8;
            });
            world._spinPop = { cx: sx, cy: sy, t0: t, popped: -1 };
            break;
          }
      }
    };
    world.takePhoto = (key, agentIds, opts = {}) => {
      const c = world[key];
      if (!c) return;
      const t = now();
      if (c.act && t < c.actUntil) return;
      agentIds = (agentIds || []).map(id => byId[id]).filter(a => a && a.state !== "down" && a.state !== "reviving" && !a.inHuddle);
      if (!agentIds.length) return;
      const base = nearestWalkable(c.tx, c.ty),
        ax = base[0],
        ay = base[1];
      agentIds.forEach((a, i) => {
        const dx = (i % 2 ? 1 : -1) * (1 + (i >> 1));
        world.command(a.id, { scripted: true, goto: { x: ax + dx, y: ay }, state: "social" });
      });
      const dur = opts.dur || (agentIds.length > 1 ? 6.5 : 6.2);
      world.mascotReact("photo", { key, tile: { x: ax, y: ay }, faceX: ax * T + 8, dur, flashMs: 3200 });
      const lensX = ax * T + 8,
        lensTopY = ay * T - 18,
        hw = 14 + agentIds.length * 6;
      let tries = 0;
      const arm = () => {
        const ready = !c.path.length && agentIds.every(a => !a.path.length);
        if (!ready && tries++ < 30) return setTimeout(arm, 180);
        agentIds.forEach((a, i) => {
          a.dir = "down";
          setTimeout(() => world.command(a.id, { mood: "happy", moodDur: 4, emote: ["cool", "love", "star", "party"][i % 4], emoteDur: 2.6 }), i * 200);
        });
        critFaceTo(c, lensX, c.py);
        world.fx.push({ kind: "camera", x0: lensX, y0: lensTopY, x1: lensX, y1: lensTopY, t0: now(), dur: 4 });
        const dots = [c._key === "_navi" ? "#F79A1E" : "#B07C44", ...agentIds.map(a => a.def.palette && a.def.palette.shirt || "#5A6BFF")];
        setTimeout(() => {
          world.fx.push({ kind: "flash", x0: lensX, y0: ay * T + 2, x1: lensX, y1: ay * T + 2, t0: now(), dur: 0.5, hw });
          world.fx.push({ kind: "polaroid", x0: lensX, y0: lensTopY, x1: lensX, y1: lensTopY, t0: now(), dur: 2.2, dots, big: agentIds.length > 1 });
          if (world.celebrate) world.celebrate(lensX, ay * T - 4);
          if (world.playChime) world.playChime();
        }, 3200);
        setTimeout(() => agentIds.forEach(a => world.command(a.id, { scripted: false })), Math.round(dur * 1000));
      };
      setTimeout(arm, 700);
    };
    world.groupPhoto = (opts = {}) => world.takePhoto(world._navi ? "_navi" : "_capy", opts.agentIds || agents.slice(0, 4).map(a => a.id), { dur: 6.5, ...opts });
    world.cheerWave = (ids, passes = 2) => {
      const list = (ids && ids.length ? ids : agents.filter(a => !busy(a)).map(a => a.id)).map(id => byId[id]).filter(Boolean).sort((p, q) => p.px - q.px);
      if (list.length < 2) return;
      world._wave = { list, t0: now(), passes, last: -1 };
    };
    world.playChime = () => {
      if (world.settings.sound === false) return;
      const ac = _audioCtx;
      if (!ac || ac.state !== "running") return;
      const now = ac.currentTime;
      [[783.99, 0], [1046.5, 0.11], [1318.5, 0.22]].forEach(([f, t]) => {
        const o = ac.createOscillator(),
          g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.1, now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.55);
        o.connect(g);
        g.connect(ac.destination);
        o.start(now + t);
        o.stop(now + t + 0.6);
      });
    };
    world.setWeather = name => {
      const w = WEATHER[name] || WEATHER.clear;
      if (!world.weatherTint) world.weatherTint = {
        r: w[0],
        g: w[1],
        b: w[2],
        a: 0,
        tr: w[0],
        tg: w[1],
        tb: w[2],
        ta: w[3]
      };else {
        world.weatherTint.tr = w[0];
        world.weatherTint.tg = w[1];
        world.weatherTint.tb = w[2];
        world.weatherTint.ta = w[3];
      }
    };
    world.faceCenter = ids => {
      const grp = (ids || []).map(id => byId[id]).filter(Boolean);
      if (grp.length < 2) return;
      const cx = grp.reduce((s, a) => s + a.px, 0) / grp.length,
        cy = grp.reduce((s, a) => s + a.py, 0) / grp.length;
      grp.forEach(a => {
        const dx = cx - a.px,
          dy = cy - a.py;
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
      });
    };
    world.placeTile = name => {
      const p = D.PLACES[name];
      return p ? p.door : {
        x: 41,
        y: 19
      };
    };
    world.placeSpots = name => D.PLACES[name] && D.PLACES[name].spots;
    world.deskOf = id => ({
      x: byId[id].deskTile[0],
      y: byId[id].deskTile[1]
    });
    world.clockText = () => {
      const m = (world.time % 1440 + 1440) % 1440;
      const hh = String(m / 60 | 0).padStart(2, "0");
      const mm = String(m % 60 | 0).padStart(2, "0");
      return hh + ":" + mm;
    };
    world.destroy = () => {
      cancelAnimationFrame(world._raf);
      clearInterval(world._iv);
    };
    function loop(ts) {
      const t = ts / 1000;
      const dt = Math.min(0.05, world._last ? t - world._last : 0.016);
      world._last = t;
      world._lastRafMs = performance.now();
      world._frame = t * 6 | 0;
      step(dt, t);
      render();
      world.onTick();
      world._raf = requestAnimationFrame(loop);
    }
    world.centerOnHQ();
    world._raf = requestAnimationFrame(loop);
    window.__asWorld = world;
    world._mapCanvas = mapCanvas;
    world._lastRafMs = 0;
    try {
      render();
    } catch (e) {}
    world._iv = setInterval(() => {
      if (performance.now() - world._lastRafMs > 600) {
        const t = performance.now() / 1000;
        world._frame = t * 6 | 0;
        step(0.25, t);
        render();
      }
    }, 250);
    return world;
  }
  return {
    create,
    findPath
  };
})();
export default ASWorld;
export { ASWorld };
