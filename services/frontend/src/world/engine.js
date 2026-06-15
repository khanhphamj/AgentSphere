import ASMap from "./map.js";
import AS_DATA from "../data.js";
const ASWorld = (() => {
  const M = ASMap,
    D = AS_DATA;
  const T = M.T;
  const ZONES = [
    { t: "HQ · OPEN OFFICE", x: 17, y: 5.4 },
    { t: "MEETING ROOM", x: 26.5, y: 10.4 },
    { t: "GREENNODE GYM", x: 46, y: 5.4 },
    { t: "FOOD HALL", x: 31, y: 25.4 },
    { t: "LIBRARY", x: 11.5, y: 26.4 },
    { t: "BASKETBALL", x: 51.5, y: 25 },
    { t: "FOOTBALL PITCH", x: 50, y: 34.4 },
    { t: "SWIMMING POOL", x: 27, y: 37.4 },
    { t: "LAKE & TRAIL", x: 15, y: 37.4 }
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
    for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (M.walkable(x + dx, y + dy)) return [x + dx, y + dy];
    return [x, y];
  }
  function shadeHex(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g2 = Math.max(0, Math.min(255, (n >> 8 & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g2},${b})`;
  }
  const LEAF_COLORS = ["#7FB069", "#C9A04E", "#D98E5A", "#9CC97A", "#E0A458"];
  const WEATHER = {
    clear: [0, 0, 0, 0],
    storm: [64, 74, 92, 0.26],
    warm: [255, 176, 92, 0.17],
    cool: [86, 128, 196, 0.2]
  };
  const CONFETTI_COLORS = ["#EC5E27", "#00B14F", "#0068FF", "#00C160", "#F5C518", "#7C5CE0", "#FF6FAE"];
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
    const night = [20, 30, 62],
      dusk = [240, 140, 70];
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
  function drawFace(ctx, a, x, y, oy, frame) {
    const f = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const ink = "#2A2622";
    const mood = a.state === "down" || a.state === "reviving" ? "neutral" : a.mood || "neutral";
    const eo = a.dir === "left" ? -1 : a.dir === "right" ? 1 : 0;
    const ey = y - 10 + oy;
    const lx = x - 2 + eo,
      rx = x + 1 + eo;
    if ((frame + a._h) % 24 < 1) {
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
    } else if (role === "research") {
      f(x + 6, y - 5 + oy, 4, 4, "#BFE6F2");
      f(x + 6, y - 5 + oy, 4, 1, ink);
      f(x + 6, y - 2 + oy, 4, 1, ink);
      f(x + 6, y - 5 + oy, 1, 4, ink);
      f(x + 9, y - 5 + oy, 1, 4, ink);
      f(x + 9, y - 1 + oy, 2, 2, "#6B4A2F");
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
    } else if (role === "creative") {
      f(x - 5, y - 15 + oy, 10, 2, "#E0457B");
      f(x + 3, y - 16 + oy, 2, 1, "#E0457B");
    } else if (role === "reporter") {
      f(x + 5, y - 4 + oy, 5, 7, "#FFFDF7");
      f(x + 5, y - 4 + oy, 5, 1, ink);
      f(x + 5, y - 4 + oy, 1, 7, ink);
      f(x + 6, y - 2 + oy, 3, 1, "#9AA0A6");
      f(x + 6, y + oy, 3, 1, "#9AA0A6");
    }
  }
  function drawStanding(ctx, a, frame) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const playing = a.state === "social" && (a.relaxKind === "field" || a.relaxKind === "court");
    const bob = a.moving || playing ? frame % 2 : 0;
    const fx = (ctx2, X, Y, w, h, c) => {
      ctx2.fillStyle = c;
      ctx2.fillRect(X, Y, w, h);
    };
    ctx.fillStyle = "rgba(40,60,45,0.22)";
    ctx.fillRect(x - 5, y + 5, 10, 3);
    if (a.def.lead) {
      ctx.strokeStyle = "rgba(30,215,96,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 9, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const oy = -bob;
    if ((a.moving || playing) && frame % 2) {
      fx(ctx, x - 4, y + 1 + oy, 3, 5, "#4A4440");
      fx(ctx, x + 1, y + 2 + oy, 3, 4, "#4A4440");
    } else {
      fx(ctx, x - 4, y + 1 + oy, 3, 5, "#4A4440");
      fx(ctx, x + 1, y + 1 + oy, 3, 5, "#4A4440");
    }
    fx(ctx, x - 5, y - 5 + oy, 10, 7, p.shirt);
    fx(ctx, x - 5, y - 5 + oy, 10, 2, shadeHex(p.shirt, 20));
    fx(ctx, x - 6, y - 4 + oy, 1, 5, shadeHex(p.shirt, -18));
    fx(ctx, x + 5, y - 4 + oy, 1, 5, shadeHex(p.shirt, -18));
    fx(ctx, x - 4, y - 13 + oy, 8, 8, p.skin);
    fx(ctx, x - 4, y - 14 + oy, 8, 3, p.hair);
    fx(ctx, x - 4, y - 12 + oy, 2, 3, p.hair);
    fx(ctx, x + 2, y - 12 + oy, 2, 3, p.hair);
    drawFace(ctx, a, x, y, oy, frame);
    drawProp(ctx, a, x, y, oy);
    if (a.state === "working" && (frame >> 1) % 2) fx(ctx, x + 6, y - 15 + oy, 2, 2, "#1ED760");
    if (a.state === "social" && !a.moving) {
      const tnow = performance.now() / 1000;
      if (a.relaxKind === "court") {
        if (a.shootUntil && tnow < a.shootUntil + 0.4) {
          fx(ctx, x - 6, y - 12 + oy, 2, 6, p.skin);
          fx(ctx, x + 4, y - 12 + oy, 2, 6, p.skin);
        } else {
          const bb = frame % 2 ? 5 : 0;
          fx(ctx, x + 6, y - 6 + oy, 2, 4, p.skin);
          fx(ctx, x + 5, y - 1 + bb, 4, 4, "#E8853C");
          fx(ctx, x + 5, y + 1 + bb, 4, 1, "#B95F22");
        }
      } else if (a.relaxKind === "field") {
        const kb = frame % 2 ? 2 : 0;
        fx(ctx, x + 4 + kb, y + 3, 4, 4, "#F4F1E6");
        fx(ctx, x + 5 + kb, y + 4, 2, 2, "#3A3531");
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
    fx(x - 12, y + 4, 24, 3, "rgba(40,60,45,0.22)");
    fx(x + 6, y - 1, 5, 2, "#4A4440");
    fx(x + 6, y + 2, 5, 2, "#4A4440");
    fx(x - 4, y - 2, 10, 6, p.shirt);
    fx(x - 4, y - 2, 2, 6, shadeHex(p.shirt, 20));
    fx(x - 1, y - 4, 4, 2, shadeHex(p.shirt, -18));
    fx(x - 12, y - 3, 8, 8, p.skin);
    fx(x - 13, y - 3, 2, 8, p.hair);
    fx(x - 12, y - 3, 8, 2, p.hair);
    ctx.fillStyle = "#2A2622";
    fx(x - 9, y - 1, 1, 1, "#2A2622");
    fx(x - 8, y, 1, 1, "#2A2622");
    fx(x - 9, y + 2, 1, 1, "#2A2622");
    fx(x - 8, y + 3, 1, 1, "#2A2622");
    for (let i = 0; i < 3; i++) {
      const ang = frame * 0.55 + i * 2.094;
      const px = x - 8 + Math.cos(ang) * 6;
      const py = y - 9 + Math.sin(ang) * 2;
      fx(Math.round(px), Math.round(py), 2, 2, i ? "#F5C542" : "#F59E0B");
    }
  }
  function drawRevive(ctx, a, frame) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    if (frame % 2 === 0) ctx.globalAlpha = 0.55;
    drawStanding(ctx, a, frame);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const sx = x - 8 + (i * 5 + frame * 2) % 16;
      const sy = y + 4 - (frame * 2 + i * 5) % 20;
      ctx.fillStyle = i % 2 ? "#1ED760" : "#7CF2A8";
      ctx.fillRect(sx, sy, 1, 1);
    }
  }
  function drawSwim(ctx, a, frame) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const bob = (frame >> 1) % 2;
    fx(x - 8, y + 1, 16, 2, "rgba(255,255,255,0.3)");
    fx(x - 5, y - 4 + bob, 10, 3, p.shirt);
    fx(x - 4, y - 12 + bob, 8, 8, p.skin);
    fx(x - 4, y - 13 + bob, 8, 3, p.hair);
    fx(x - 4, y - 11 + bob, 2, 3, p.hair);
    fx(x + 2, y - 11 + bob, 2, 3, p.hair);
    fx(x - 2, y - 9 + bob, 1, 2, "#2A2622");
    fx(x + 1, y - 9 + bob, 1, 2, "#2A2622");
    if (frame % 2) {
      fx(x - 8, y - 7, 3, 3, p.skin);
      fx(x - 11, y - 8, 3, 2, "#EAF8FD");
    } else {
      fx(x + 5, y - 7, 3, 3, p.skin);
      fx(x + 8, y - 8, 3, 2, "#EAF8FD");
    }
    fx(x - 6, y - 2 + bob, 12, 3, "rgba(143,220,242,0.65)");
    fx(x - 9 + (frame * 3 & 7), y + 2, 1, 1, "#EAF8FD");
    fx(x + 8 - (frame * 2 & 7), y - 1, 1, 1, "#CFF0FA");
  }
  function drawExercise(ctx, a, frame) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    const ph = (frame >> 1) % 2;
    const fast = frame % 2;
    ctx.fillStyle = "rgba(40,60,45,0.22)";
    switch (a.exercise) {
      case "pullup":
        {
          const lift = ph ? -6 : -1;
          ctx.fillRect(x - 5, y + 5, 10, 3);
          fx(x - 5, y - 14 + lift, 2, 7, p.skin);
          fx(x + 3, y - 14 + lift, 2, 7, p.skin);
          fx(x - 5, y - 5 + lift, 10, 7, p.shirt);
          fx(x - 4, y - 13 + lift, 8, 8, p.skin);
          fx(x - 4, y - 14 + lift, 8, 3, p.hair);
          fx(x - 4, y + 2 + lift, 3, 3, "#4A4440");
          fx(x + 1, y + 2 + lift, 3, 3, "#4A4440");
          break;
        }
      case "bench":
        {
          const press = ph ? -5 : -1;
          ctx.fillRect(x - 10, y + 4, 20, 3);
          fx(x - 7, y - 2, 12, 5, p.shirt);
          fx(x + 5, y - 3, 6, 6, p.skin);
          fx(x + 9, y - 4, 3, 7, p.hair);
          fx(x - 4, y - 6 + press, 2, 5, p.skin);
          fx(x + 1, y - 6 + press, 2, 5, p.skin);
          fx(x - 8, y - 7 + press, 16, 2, "#8B8F96");
          fx(x - 11, y - 9 + press, 3, 5, "#2E3440");
          fx(x + 8, y - 9 + press, 3, 5, "#2E3440");
          break;
        }
      case "pushup":
        {
          const dip = fast ? 2 : 0;
          ctx.fillRect(x - 9, y + 5, 18, 3);
          fx(x - 8, y + dip, 12, 4, p.shirt);
          fx(x + 3, y - 3 + dip, 6, 6, p.skin);
          fx(x + 4, y - 4 + dip, 6, 2, p.hair);
          fx(x - 7, y + 3, 2, 4, p.skin);
          fx(x + 1, y + 3, 2, 4, p.skin);
          fx(x - 8, y + 4 + dip, 4, 2, "#4A4440");
          break;
        }
      case "run":
        {
          const oy = -fast;
          ctx.fillRect(x - 5, y + 5, 10, 3);
          if (fast) {
            fx(x - 4, y + 1 + oy, 3, 5, "#4A4440");
            fx(x + 1, y + 2 + oy, 3, 4, "#4A4440");
          } else {
            fx(x - 4, y + 2 + oy, 3, 4, "#4A4440");
            fx(x + 1, y + 1 + oy, 3, 5, "#4A4440");
          }
          fx(x - 5, y - 5 + oy, 10, 7, p.shirt);
          fx(x - 4, y - 13 + oy, 8, 8, p.skin);
          fx(x - 4, y - 14 + oy, 8, 3, p.hair);
          fx(x - 4, y - 12 + oy, 2, 3, p.hair);
          fx(x + 2, y - 12 + oy, 2, 3, p.hair);
          if (ph) fx(x + 5, y - 12 + oy, 1, 2, "#8FDCF2");
          break;
        }
      default:
        {
          const lo = ph ? -3 : 0;
          const ro = ph ? 0 : -3;
          ctx.fillRect(x - 5, y + 5, 10, 3);
          fx(x - 4, y + 1, 3, 5, "#4A4440");
          fx(x + 1, y + 1, 3, 5, "#4A4440");
          fx(x - 5, y - 5, 10, 7, p.shirt);
          fx(x - 4, y - 13, 8, 8, p.skin);
          fx(x - 4, y - 14, 8, 3, p.hair);
          fx(x - 7, y - 4 + lo, 2, 4, p.skin);
          fx(x + 5, y - 4 + ro, 2, 4, p.skin);
          fx(x - 9, y - 5 + lo, 4, 3, "#2E3440");
          fx(x + 5, y - 5 + ro, 4, 3, "#2E3440");
          break;
        }
    }
  }
  function drawSit(ctx, a, frame) {
    const x = Math.round(a.px),
      y = Math.round(a.py);
    const p = a.def.palette;
    const fx = (X, Y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(X, Y, w, h);
    };
    fx(x - 5, y + 5, 10, 3, "rgba(40,60,45,0.22)");
    if (a.def.lead) {
      ctx.strokeStyle = "rgba(30,215,96,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 9, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    fx(x - 5, y - 1, 10, 4, "#6B6B6B");
    fx(x - 5, y - 4, 10, 6, p.shirt);
    fx(x - 5, y - 4, 10, 2, shadeHex(p.shirt, 20));
    fx(x - 6, y - 3, 1, 4, shadeHex(p.shirt, -18));
    fx(x + 5, y - 3, 1, 4, shadeHex(p.shirt, -18));
    fx(x - 4, y - 12, 8, 8, p.skin);
    fx(x - 4, y - 13, 8, 3, p.hair);
    fx(x - 4, y - 11, 2, 3, p.hair);
    fx(x + 2, y - 11, 2, 3, p.hair);
    drawFace(ctx, a, x, y, 1, frame);
    drawProp(ctx, a, x, y, 1);
    const tb = frame % 2 ? 1 : 0;
    fx(x - 4, y + 1 - tb, 2, 2, p.skin);
    fx(x + 2, y + 1 - (1 - tb), 2, 2, p.skin);
    fx(x - 4, y + 3, 8, 2, "#3A3531");
    fx(x - 3, y + 1, 6, 2, "#23303A");
    if ((frame >> 1) % 2) fx(x - 3, y + 1, 6, 1, "#1ED760");
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
  const SOCIAL_CENTER = { x: 26, y: 13 };
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
  function drawAgent(ctx, a, frame) {
    if (a.state === "down") return drawDown(ctx, a, frame);
    if (a.state === "reviving") return drawRevive(ctx, a, frame);
    if (M.g(a.tx, a.ty) === M.POOL) return drawSwim(ctx, a, frame);
    if (a.state === "social" && !a.moving && a.exercise) return drawExercise(ctx, a, frame);
    if (a.state === "working" && !a.moving && a.tx === a.deskTile[0] && a.ty === a.deskTile[1]) return drawSit(ctx, a, frame);
    const cel = a.emote && (a.emote.kind === "idea" || a.emote.kind === "party" || a.emote.kind === "fire" || a.emote.kind === "love" || a.emote.kind === "mindblown" || a.emote.kind === "star");
    if (cel && !a.moving) {
      const hop = Math.abs(Math.sin(frame * 0.5 + a._h)) * 5;
      ctx.save();
      ctx.translate(0, -hop);
      drawStanding(ctx, a, frame);
      ctx.restore();
      return;
    }
    drawStanding(ctx, a, frame);
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
    courtyard: "music"
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
    const SPEED = 78;
    const agents = D.AGENTS.map(def => {
      const [dx, dy] = nearestWalkable(def.desk.x, def.desk.y + 1);
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
        crashErr: null,
        reviveUntil: 0,
        deskTile: [dx, dy],
        stats: {
          tasks: 12 + (M.hash(dx, dy) * 30 | 0),
          tokens: 180 + (M.hash(dy, dx) * 600 | 0) + "K",
          uptime: "99.9" + (M.hash(dx * 2, dy) * 9 | 0) + "%"
        }
      };
    });
    const byId = {};
    agents.forEach(a => byId[a.id] = a);
    const world = {
      agents,
      byId,
      _navi: {
        px: 30 * T + 8,
        py: 22 * T + 8,
        tx: 30,
        ty: 22,
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
        px: 26 * T + 8,
        py: 22 * T + 8,
        tx: 26,
        ty: 22,
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
        px: 30 * T + 8,
        py: 24 * T + 8,
        tx: 30,
        ty: 24,
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
        tone: opts2.tone || null
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
      if (p) {
        a.path = p;
        a.moving = p.length > 0;
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
      }
    }
    function busy(a) {
      return a.scripted || a.inHuddle || a.state === "down" || a.state === "reviving";
    }
    function ambient(a, t) {
      if (busy(a)) return;
      if (t < a.stateUntil || a.moving) return;
      const live = world.settings.liveliness;
      const r = Math.random();
      if (a.state === "working") {
        const relaxP = (a.scripted ? 0.18 : 0.55) * live;
        if (r < relaxP) {
          const hr = world.time / 60;
          const byHour = hr < 10 ? ["cafe", "cafe", "courtyard", "park", "gym"] : hr < 14 ? ["field", "court", "gym", "pool", "pool", "cafe"] : hr < 18 ? ["park", "court", "field", "courtyard", "gym"] : ["park", "cafe", "courtyard", "pool"];
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
          const targetX = a.tx >= 28 ? 25 + (Math.random() * 2 | 0) : 29 + (Math.random() * 2 | 0);
          const targetY = 40 + (Math.random() * 4 | 0);
          a.pendingRelax = "pool";
          sendTo(a, {
            x: targetX,
            y: targetY
          }, "social");
          a.stateUntil = t + 3 + Math.random() * 3;
          return;
        }
        if (a.relaxKind === "court" && r < 0.6) {
          const hoopX = Math.abs(a.tx - 47) < Math.abs(a.tx - 56) ? 47 : 56;
          world.fx.push({
            kind: "bball",
            x0: a.px,
            y0: a.py - 10,
            x1: hoopX * T + 8,
            y1: 29 * T + 4,
            t0: now(),
            dur: 0.8
          });
          a.shootUntil = now() + 0.8;
          a.stateUntil = t + 2.5 + Math.random() * 4;
          return;
        }
        if (a.relaxKind === "field" && r < 0.6) {
          const spots = D.PLACES.field.spots;
          const sp = spots[Math.random() * spots.length | 0];
          world.fx.push({
            kind: "fball",
            x0: a.px,
            y0: a.py + 4,
            x1: sp.x * T + 8,
            y1: sp.y * T + 8,
            t0: now(),
            dur: 0.7
          });
          a.stateUntil = t + 2.5 + Math.random() * 4;
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
    let huddle = null;
    let nextHuddleT = 18 + Math.random() * 25;
    let nextPlaneT = 14 + Math.random() * 16;
    let nextPhotoT = 55 + Math.random() * 40;
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
      const pred = a => !a.scripted && !a.inHuddle && !a.moving && (a.state === "working" || a.state === "idle" || a.state === "social");
      const a = nearestAgent(c, pred, 12) || pick(agents.filter(pred));
      if (!a) return;
      world.takePhoto(key, [a.id]);
    }
    function tryPlane(t) {
      if (t < nextPlaneT) return;
      nextPlaneT = t + (32 + Math.random() * 55) / Math.max(0.5, world.settings.liveliness);
      if (world.settings.night) return;
      const ry = () => (Math.random() < 0.5 ? 8 : 12) * T + 6;
      const ax = (9 + (Math.random() * 14 | 0)) * T + 8,
        bx = (9 + (Math.random() * 14 | 0)) * T + 8;
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
      a.state = "down";
      a.crashErr = errText || D.CRASH_ERRORS[Math.random() * D.CRASH_ERRORS.length | 0];
      a.bubble = {
        text: "⚠ " + a.crashErr,
        until: now() + 7,
        tone: "error"
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
        tone: null
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
          sendTo(a, {
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
    function enterSpectate(c, t) {
      const spot = adjWalkable(c, SOCIAL_CENTER.x, SOCIAL_CENTER.y) || nearestWalkable(SOCIAL_CENTER.x + 2, SOCIAL_CENTER.y + 2);
      const p = findPath(c.tx, c.ty, spot[0], spot[1], inWater);
      if (!p) return;
      c.path = p;
      c.state = "walk";
      c.aiState = "spectate";
      c.target = null;
      c.social = 0;
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
      if (c.aiState === "spectate") {
        if (c.path.length) {
          moveAlong(c, dt, t, SP[key]);
          return;
        }
        if (!meetingNow) {
          endSocial(c, t);
          return;
        }
        critFaceTo(c, SOCIAL_CENTER.x * T + 8, SOCIAL_CENTER.y * T + 8);
        if (Math.random() < 0.01) critFeel(c, null, pick(cfg.faves), 2.2);
        if (Math.random() < 0.012) critAnim(c, "hop", 0.45, cfg.amp);
        return;
      }
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
      if (meetingNow && c.aiState !== "spectate" && !c.path.length && t > c.cd) enterSpectate(c, t);
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
      world.time = utc7Minutes();
      world.settings.night = world.time < 6 * 60 || world.time >= 18 * 60;
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
      if (world._tug && world._tug.active) {
        const tg = world._tug;
        tg.pos += (tg.target - tg.pos) * Math.min(1, dt * (tg.snap ? 6 : 2.2));
        tg.jolt = Math.max(0, tg.jolt - dt * 2.4);
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
        c: LEAF_COLORS[Math.random() * LEAF_COLORS.length | 0]
      });
      for (const lf of world._leaves) {
        lf.sw += dt * 2;
        lf.y += lf.vy * dt;
        lf.x += Math.sin(lf.sw) * 10 * dt;
      }
      world._leaves = world._leaves.filter(lf => lf.y < M.H * T + 6);
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
      stepWave(t);
      agents.forEach(a => {
        ambient(a, t);
        if (a.bubble && t > a.bubble.until) a.bubble = null;
        if (a.emote && t > a.emote.until) a.emote = null;
        if (a.moodUntil && t > a.moodUntil) {
          a.mood = "neutral";
          a.moodUntil = 0;
        }
        if (a.state === "down" || a.state === "reviving") return;
        if (a.path.length) {
          const [nx, ny] = a.path[0];
          const gx = nx * T + 8,
            gy = ny * T + 8;
          const dx = gx - a.px,
            dy = gy - a.py;
          const dist = Math.hypot(dx, dy);
          const adv = SPEED * dt * world.settings.speed * (M.g(a.tx, a.ty) === M.POOL ? 0.45 : 1);
          a.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
          if (dist <= adv) {
            a.px = gx;
            a.py = gy;
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
          }
        }
      });
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
      b.fillStyle = "#F2EFE6";
      b.fillRect(0, 0, bw, bh);
      b.drawImage(mapCanvas, -ox, -oy);
      const sorted = [...agents].sort((p, q) => p.py - q.py);
      sorted.forEach(a => {
        b.save();
        b.translate(-ox, -oy);
        if (a.state !== "swim") {
          const fx = Math.round(a.px),
            fy = Math.round(a.py) + 7;
          b.fillStyle = "rgba(38,28,14,0.16)";
          b.fillRect(fx - 5, fy - 1, 10, 2);
          b.fillRect(fx - 3, fy - 2, 6, 1);
          b.fillRect(fx - 3, fy + 1, 6, 1);
        }
        if (world.selected === a.id) {
          b.strokeStyle = D.PROVIDERS[a.def.provider].color;
          b.lineWidth = 1;
          b.strokeRect(Math.round(a.px) - 7.5, Math.round(a.py) - 16.5, 15, 24);
        }
        drawAgent(b, a, world._frame);
        b.restore();
      });
      {
        const tnow = performance.now() / 1000;
        world.fx = world.fx.filter(f => tnow - f.t0 < f.dur + 0.4);
        world.fx.forEach(f => {
          const p2 = Math.min(1, (tnow - f.t0) / f.dur);
          const fxp = Math.round(f.x0 + (f.x1 - f.x0) * p2);
          const arcH = f.kind === "bball" ? 30 : f.kind === "plane" ? 16 : f.kind === "camera" || f.kind === "flash" || f.kind === "polaroid" || f.kind === "discobeam" ? 0 : 9;
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
          } else if (f.kind === "bball") {
            b.fillStyle = "#E8853C";
            b.fillRect(fxp - 2, fyp - 2, 4, 4);
            b.fillStyle = "#B95F22";
            b.fillRect(fxp - 2, fyp, 4, 1);
            if (p2 >= 1) {
              b.fillStyle = "rgba(255,255,255,0.85)";
              b.fillRect(fxp - 4, fyp + 3, 8, 1);
            }
          } else if (f.kind === "camera") {
            const ccx = fxp, ccy = fyp, bob = Math.round(Math.sin(tnow * 4));
            b.fillStyle = "#3A3531";
            b.fillRect(ccx - 3, ccy - 2 + bob, 6, 4);
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
            b.fillStyle = "#F4F1E6";
            b.fillRect(fxp - 2, fyp - 2, 4, 4);
            b.fillStyle = "#3A3531";
            b.fillRect(fxp - 1, fyp - 1, 2, 2);
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
        const TURB = [[33 * T, 4 * T], [5 * T, 25 * T], [58 * T, 17 * T]];
        const ang = world._frame * 0.5;
        b.save();
        b.translate(-ox, -oy);
        TURB.forEach(([tx, ty]) => {
          b.fillStyle = "rgba(40,60,45,0.16)";
          b.fillRect(tx - 3, ty + 2, 9, 2);
          b.fillStyle = "#E6EAEE";
          b.fillRect(tx, ty - 28, 2, 30);
          b.strokeStyle = "#F4F7FA";
          b.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            const a = ang + k * 2.0944;
            b.beginPath();
            b.moveTo(tx + 1, ty - 28);
            b.lineTo(tx + 1 + Math.cos(a) * 12, ty - 28 + Math.sin(a) * 12);
            b.stroke();
          }
          b.fillStyle = "#9DB0C0";
          b.fillRect(tx, ty - 29, 2, 2);
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
          b.fillRect(x + (Math.sin(lf.sw) > 0 ? 1 : -1), y - 1, 1, 1);
        });
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
        ctx.ellipse(sx, sy + (CRIT_SHADOW[key] || 0) * z, 6.5 * z, 2.4 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        drawCritterImg(ctx, c, key, sx, sy, z, world._frame, world._last);
        if (c.emote) drawEmote(ctx, c, sx, sy - 13 * z, z, world._frame);
        if (world.settings.labels) drawCritterLabel(ctx, sx, sy, z, CRITTER_NAME[key] || "", CRITTER_LABEL[key]);
      });
      sorted.forEach(a => {
        const [sx, sy] = toScreen(a.px, a.py);
        if (world.settings.labels) drawLabel(ctx, a, sx, sy, z);
        if (a.bubble) drawBubble(ctx, a, sx, sy, z);else if (a.emote) drawEmote(ctx, a, sx, sy, z, world._frame);
        if (a.state === "down") drawAlert(ctx, sx, sy, z, world._frame);
      });
      if (world._tug && world._tug.active) {
        const tg = world._tug;
        const [cxS, cyS] = toScreen(26 * T + 8, 12 * T + 2);
        const R = 46 * z;
        const jx = tg.jolt > 0.02 ? Math.sin(world._frame * 1.7) * tg.jolt * 7 * z : 0;
        ctx.save();
        ctx.strokeStyle = "rgba(70,58,44,0.55)";
        ctx.lineWidth = Math.max(2, 2 * z);
        ctx.beginPath();
        ctx.moveTo(cxS - R, cyS);
        ctx.lineTo(cxS + R, cyS);
        ctx.stroke();
        ctx.fillStyle = "#E8A53C";
        ctx.fillRect(cxS - R - 4 * z, cyS - 6 * z, 4 * z, 12 * z);
        ctx.fillStyle = "#1ED760";
        ctx.fillRect(cxS + R, cyS - 6 * z, 4 * z, 12 * z);
        const tokenX = cxS + tg.pos * R + jx;
        const warm = tg.pos < -0.05,
          cool = tg.pos > 0.05;
        const tc = warm ? "#E8A53C" : cool ? "#1ED760" : "#E5C46B";
        ctx.fillStyle = warm ? "rgba(232,165,60,0.34)" : cool ? "rgba(30,215,96,0.34)" : "rgba(229,196,107,0.3)";
        ctx.beginPath();
        ctx.arc(tokenX, cyS, (8 + tg.jolt * 5) * z, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = tc;
        ctx.beginPath();
        ctx.arc(tokenX, cyS, 4.5 * z, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(tokenX - 1.4 * z, cyS - 1.4 * z, 1.5 * z, 0, 6.283);
        ctx.fill();
        ctx.restore();
      }
      {
        const lz = z <= 3 ? 1 : z >= 4.5 ? 0 : (4.5 - z) / 1.5;
        if (lz > 0.03) {
          ctx.save();
          ctx.font = "700 9.5px ui-monospace, Menlo, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ZONES.forEach(zn => {
            const [zx, zyRaw] = toScreen(zn.x * T, zn.y * T);
            if (zx < -100 || zx > vw + 100 || zyRaw < -40 || zyRaw > vh + 40) return;
            const tw = ctx.measureText(zn.t).width;
            const bw2 = tw + 16,
              bh2 = 17,
              cx = Math.round(zx),
              ground = Math.round(zyRaw) + 16,
              by = ground - 40,
              postTop = by + bh2;
            ctx.globalAlpha = lz;
            ctx.fillStyle = "rgba(38,28,14,0.18)";
            ctx.fillRect(cx - 5, ground - 1, 10, 2);
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
    }
    function drawLabel(ctx2, a, sx, sy, z) {
      const c = D.PROVIDERS[a.def.provider].color;
      const label = (a.def.lead ? "★ " : "") + a.def.name;
      ctx2.font = "700 11px ui-monospace, Menlo, monospace";
      const w = ctx2.measureText(label).width + 14;
      const yTop = sy + 8 * (z / 3) + 6;
      ctx2.fillStyle = "rgba(20,28,24,0.80)";
      ctx2.fillRect(Math.round(sx - w / 2), Math.round(yTop), Math.round(w), 20);
      ctx2.fillStyle = a.state === "down" ? "#F87171" : c;
      ctx2.textAlign = "center";
      ctx2.fillText(label, sx, yTop + 13);
      ctx2.textAlign = "left";
    }
    function drawCritterLabel(ctx2, sx, sy, z, name, col) {
      ctx2.font = "700 11px ui-monospace, Menlo, monospace";
      const w = ctx2.measureText(name).width + 14;
      const yTop = Math.round(sy + 8 * z - 30 * z - 22);
      ctx2.fillStyle = "rgba(20,28,24,0.80)";
      ctx2.fillRect(Math.round(sx - w / 2), yTop, Math.round(w), 18);
      ctx2.fillStyle = col || "#FFB23E";
      ctx2.textAlign = "center";
      ctx2.fillText(name, sx, yTop + 13);
      ctx2.textAlign = "left";
    }
    function drawBubble(ctx2, a, sx, sy, z) {
      const text = a.bubble.text || "";
      const err = a.bubble.tone === "error";
      ctx2.font = "12px ui-monospace, Menlo, monospace";
      const maxW = 190;
      const words = text.split(" ");
      const lines = [];
      let cur = "";
      words.forEach(wd => {
        const tryLine = cur ? cur + " " + wd : wd;
        if (ctx2.measureText(tryLine).width > maxW && cur) {
          lines.push(cur);
          cur = wd;
        } else cur = tryLine;
      });
      if (cur) lines.push(cur);
      const w = Math.min(maxW, Math.max(...lines.map(l => ctx2.measureText(l).width))) + 16;
      const h = lines.length * 15 + 12;
      const bx = Math.round(sx - w / 2),
        by = Math.round(sy - 16 * (z / 3) - h - 14);
      ctx2.fillStyle = err ? "#FFF1F1" : "#FFFDF7";
      ctx2.fillRect(bx, by, w, h);
      ctx2.strokeStyle = err ? "#DC2626" : "#2A2622";
      ctx2.lineWidth = 2;
      ctx2.strokeRect(bx + 1, by + 1, w - 2, h - 2);
      ctx2.fillStyle = err ? "#FFF1F1" : "#FFFDF7";
      ctx2.fillRect(Math.round(sx) - 5, by + h, 10, 4);
      ctx2.fillRect(Math.round(sx) - 2, by + h + 4, 4, 4);
      ctx2.fillStyle = err ? "#B91C1C" : "#2A2622";
      lines.forEach((l, i) => ctx2.fillText(l, bx + 8, by + 17 + i * 15));
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
      world.cam.x = 18 * T;
      world.cam.y = 12 * T;
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
      const dur = opts.dur || ({ perk: 5, question: 5, worryFlag: 5, relieved: 5, reportHi: 6, reportLo: 5, completed: 8, failed: 7, progress: 3.5, spectate: 30 }[kind] || 4.5);
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
        case "spectate":
          eachMascot((c, cfg, k) => {
            c.act = "spectate";
            const sd = Math.min(40, dur);
            c.actUntil = t + sd;
            const o = ring[MASCOT_KEYS.indexOf(k)];
            mascotSendTile(c, SOCIAL_CENTER.x + o[0] * 2, SOCIAL_CENTER.y + o[1]);
            c.hold = t + sd;
            c.faceX = SOCIAL_CENTER.x * T + 8;
            critFeel(c, "curious", cfg.faves[0], 4);
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
        x: 28,
        y: 20
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
