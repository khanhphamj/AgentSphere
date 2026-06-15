const ASMap = (() => {
  const T = 16;
  const W = 64,
    H = 48;
  const GRASS = 0,
    PATH = 1,
    WATER = 2,
    TREE = 3,
    FLOWER = 4,
    FLOOR = 5,
    WALL = 6,
    ROOF = 7,
    DOOR = 8,
    CARPET = 9,
    SAND = 10,
    HEDGE = 11,
    PITCH = 12,
    GLASS = 13,
    PLAZA = 14,
    COURT = 15,
    DECK = 16,
    POOL = 17;
  const grid = new Array(W * H).fill(GRASS);
  const g = (x, y) => grid[y * W + x];
  const s = (x, y, v) => {
    if (x >= 0 && y >= 0 && x < W && y < H) grid[y * W + x] = v;
  };
  const rect = (x0, y0, x1, y1, v) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, v);
  };
  const hash = (x, y) => {
    let h = x * 374761393 + y * 668265263 ^ 88339;
    h = (h ^ h >> 13) * 1274126177;
    return ((h ^ h >> 16) >>> 0) / 4294967295;
  };
  const BUILDINGS = {
    office: {
      x0: 6,
      y0: 5,
      x1: 29,
      y1: 19,
      roof: "#C8D2CC",
      name: "office",
      solar: true
    },
    lab: {
      x0: 36,
      y0: 5,
      x1: 56,
      y1: 15,
      roof: "#8FA8CE",
      name: "lab",
      solar: true
    },
    library: {
      x0: 5,
      y0: 27,
      x1: 18,
      y1: 35,
      roof: "#C9A07E",
      name: "library",
      solar: false
    },
    cafe: {
      x0: 24,
      y0: 26,
      x1: 38,
      y1: 33,
      roof: "#D8A4B8",
      name: "cafe",
      solar: false
    }
  };
  function carveBuilding(b, doorX, doorY, wallTile) {
    rect(b.x0, b.y0, b.x1, b.y1, FLOOR);
    for (let x = b.x0; x <= b.x1; x++) {
      s(x, b.y0, wallTile);
      s(x, b.y1, wallTile);
    }
    for (let y = b.y0; y <= b.y1; y++) {
      s(b.x0, y, wallTile);
      s(b.x1, y, wallTile);
    }
    for (let x = b.x0; x <= b.x1; x++) {
      s(x, b.y0, ROOF);
      s(x, b.y0 + 1, ROOF);
    }
    s(doorX, doorY, DOOR);
  }
  carveBuilding(BUILDINGS.office, 18, 19, GLASS);
  carveBuilding(BUILDINGS.lab, 46, 15, GLASS);
  carveBuilding(BUILDINGS.library, 11, 35, WALL);
  carveBuilding(BUILDINGS.cafe, 30, 33, GLASS);
  rect(25, 11, 28, 16, CARPET);
  rect(4, 21, 59, 23, PLAZA);
  rect(31, 21, 32, 22, WATER);
  rect(39, 27, 44, 32, DECK);
  rect(47, 26, 56, 32, COURT);
  rect(42, 35, 58, 43, PITCH);
  rect(9, 38, 21, 45, SAND);
  rect(10, 39, 20, 44, WATER);
  rect(24, 38, 31, 44, DECK);
  rect(25, 39, 30, 43, POOL);
  const path = (x0, y0, x1, y1) => {
    const xa = Math.min(x0, x1),
      xb = Math.max(x0, x1);
    for (let x = xa; x <= xb; x++) if (g(x, y0) === GRASS || g(x, y0) === FLOWER) s(x, y0, PATH);
    const ya = Math.min(y0, y1),
      yb = Math.max(y0, y1);
    for (let y = ya; y <= yb; y++) if (g(x1, y) === GRASS || g(x1, y) === FLOWER) s(x1, y, PATH);
  };
  path(18, 20, 18, 20);
  for (let y = 16; y <= 20; y++) if (g(46, y) === GRASS) s(46, y, PATH);
  for (let y = 24; y <= 25; y++) {
    if (g(30, y) === GRASS) s(30, y, PATH);
  }
  for (let y = 24; y <= 37; y++) if (g(21, y) === GRASS) s(21, y, PATH);
  for (let x = 11; x <= 23; x++) if (g(x, 37) === GRASS) s(x, 37, PATH);
  for (let y = 37; y <= 38; y++) if (g(24, y) === GRASS) s(24, y, PATH);
  s(11, 36, PATH);
  for (let y = 24; y <= 25; y++) if (g(51, y) === GRASS) s(51, y, PATH);
  for (let y = 33; y <= 34; y++) if (g(45, y) === GRASS) s(45, y, PATH);
  for (let x = 30; x <= 30; x++) if (g(30, 34) === GRASS) s(30, 34, PATH);
  for (let x = 0; x < W; x++) {
    s(x, 0, TREE);
    s(x, 1, TREE);
    s(x, H - 1, TREE);
    s(x, H - 2, TREE);
  }
  for (let y = 0; y < H; y++) {
    s(0, y, TREE);
    s(1, y, TREE);
    s(W - 1, y, TREE);
    s(W - 2, y, TREE);
  }
  const scatter = [[4, 4], [33, 3], [34, 4], [59, 4], [60, 16], [3, 17], [4, 25], [40, 24], [44, 24], [23, 25], [23, 38], [24, 42], [28, 44], [35, 40], [38, 44], [60, 33], [59, 44], [45, 33], [6, 37], [3, 30], [20, 25], [58, 18], [33, 36], [26, 36]];
  scatter.forEach(([x, y]) => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  [[16, 20], [20, 20], [4, 20], [59, 20], [36, 25], [46, 25]].forEach(([x, y]) => {
    if (g(x, y) === GRASS) s(x, y, HEDGE);
  });
  for (let y = 2; y < H - 1; y += 2) [2, 3, W - 3, W - 2].forEach(x => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  for (let x = 4; x < W - 3; x += 3) [2, H - 2].forEach(y => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  [[6, 6], [8, 7], [55, 6], [53, 7], [6, 41], [8, 42], [55, 41], [53, 42]].forEach(([x, y]) => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (g(x, y) === GRASS && hash(x * 3, y * 7) > 0.86) s(x, y, FLOWER);
  const FURNITURE = [{
    kind: "desk",
    x: 9,
    y: 15
  }, {
    kind: "desk",
    x: 16,
    y: 7
  }, {
    kind: "desk",
    x: 24,
    y: 7
  }, {
    kind: "pullupbar",
    x: 39,
    y: 8
  }, {
    kind: "benchpress",
    x: 43,
    y: 8
  }, {
    kind: "treadmill",
    x: 49,
    y: 8
  }, {
    kind: "treadmill",
    x: 51,
    y: 8
  }, {
    kind: "dumbbells",
    x: 54,
    y: 8
  }, {
    kind: "mat",
    x: 41,
    y: 12
  }, {
    kind: "mat",
    x: 44,
    y: 12
  }, {
    kind: "desk",
    x: 9,
    y: 9
  }, {
    kind: "desk",
    x: 20,
    y: 7
  }, {
    kind: "desk",
    x: 9,
    y: 12
  }, {
    kind: "plant",
    x: 7,
    y: 17
  }, {
    kind: "plant",
    x: 28,
    y: 7
  }, {
    kind: "whiteboard",
    x: 15,
    y: 7
  }, {
    kind: "table",
    x: 26,
    y: 13
  }, {
    kind: "whiteboard",
    x: 28,
    y: 11
  }, {
    kind: "plant",
    x: 37,
    y: 13
  }, {
    kind: "plant",
    x: 55,
    y: 13
  }, {
    kind: "shelf",
    x: 7,
    y: 29
  }, {
    kind: "shelf",
    x: 11,
    y: 29
  }, {
    kind: "shelf",
    x: 15,
    y: 29
  }, {
    kind: "shelf",
    x: 7,
    y: 32
  }, {
    kind: "shelf",
    x: 15,
    y: 32
  }, {
    kind: "plant",
    x: 16,
    y: 33
  }, {
    kind: "coffee",
    x: 26,
    y: 29
  }, {
    kind: "table",
    x: 29,
    y: 30
  }, {
    kind: "table",
    x: 33,
    y: 30
  }, {
    kind: "table",
    x: 36,
    y: 31
  }, {
    kind: "plant",
    x: 25,
    y: 31
  }, {
    kind: "patio",
    x: 41,
    y: 29
  }, {
    kind: "patio",
    x: 43,
    y: 31
  }, {
    kind: "patio",
    x: 39,
    y: 31
  }, {
    kind: "bench",
    x: 26,
    y: 22
  }, {
    kind: "bench",
    x: 37,
    y: 22
  }, {
    kind: "bike",
    x: 24,
    y: 20
  }, {
    kind: "bike",
    x: 25,
    y: 20
  }, {
    kind: "bike",
    x: 26,
    y: 20
  }, {
    kind: "bike",
    x: 43,
    y: 20
  }, {
    kind: "bike",
    x: 44,
    y: 20
  }, {
    kind: "hoop",
    x: 47,
    y: 29
  }, {
    kind: "hoop",
    x: 56,
    y: 29
  }, {
    kind: "bench",
    x: 11,
    y: 38
  }, {
    kind: "bench",
    x: 19,
    y: 38
  }, {
    kind: "bench",
    x: 8,
    y: 42
  }];
  const OPEN_ZONE = f => f.x >= 7 && f.x <= 24 && f.y >= 6 && f.y <= 18;
  for (let i = FURNITURE.length - 1; i >= 0; i--) if (OPEN_ZONE(FURNITURE[i])) FURNITURE.splice(i, 1);
  for (const ry of [7, 11, 15]) for (let x = 9; x <= 23; x++) {
    const anchor = x === 9 || x === 15 || x === 21;
    const r = hash(x * 3 + 1, ry * 5 + 2);
    if (anchor || r > 0.68) FURNITURE.push({ kind: "desk", x, y: ry });
    else if (r > 0.46) FURNITURE.push({ kind: "plant", x, y: ry });
    else if (r > 0.4) FURNITURE.push({ kind: "coffee", x, y: ry });
  }
  for (const py of [9, 13]) for (let x = 9; x <= 23; x++) FURNITURE.push({
    kind: "planterbox",
    x,
    y: py
  });
  const BLOCKING = new Set(["desk", "table", "shelf", "server", "coffee", "whiteboard", "patio", "hoop", "bike", "pullupbar", "benchpress", "treadmill", "dumbbells", "planterbox"]);
  const GROUND_SHADOW = new Set(["desk", "table", "shelf", "server", "coffee", "bench", "plant", "bike", "benchpress", "treadmill", "dumbbells", "mat", "pullupbar"]);
  const furnAt = {};
  FURNITURE.forEach(f => {
    if (BLOCKING.has(f.kind)) furnAt[f.y * W + f.x] = f;
  });
  for (const yy of [20, 21]) {
    for (let xx = 6; xx <= 16; xx++) furnAt[yy * W + xx] = {
      kind: "logo"
    };
    for (let xx = 20; xx <= 29; xx++) furnAt[yy * W + xx] = {
      kind: "logo"
    };
  }
  function walkable(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const t = g(x, y);
    if (t === GRASS || t === PATH || t === FLOWER || t === FLOOR || t === DOOR || t === CARPET || t === SAND || t === PITCH || t === PLAZA || t === COURT || t === DECK || t === POOL) {
      return !furnAt[y * W + x];
    }
    return false;
  }
  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }
  function drawTile(ctx, x, y) {
    const t = g(x, y),
      X = x * T,
      Y = y * T,
      n = hash(x, y);
    switch (t) {
      case GRASS:
      case FLOWER:
      case TREE:
      case HEDGE:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#7CC474" : "#72BC6A");
          if (hash(x + 9, y + 4) > 0.72) px(ctx, X + (n * 11 | 0) % 12 + 2, Y + (n * 23 | 0) % 12 + 2, 2, 2, "#64AE5C");
          if (hash(x + 5, y + 8) > 0.85) px(ctx, X + (n * 31 | 0) % 13 + 1, Y + (n * 17 | 0) % 13 + 1, 1, 2, "#96D687");
          if (t === GRASS && hash(x + 3, y + 7) > 0.92) {
            const fx = X + (n * 13 | 0) % 10 + 3,
              fy = Y + (n * 7 | 0) % 8 + 4;
            px(ctx, fx, fy + 2, 1, 2, "#5E9E63");
            px(ctx, fx - 1, fy, 3, 2, n > 0.6 ? "#F2D06B" : n > 0.3 ? "#EF9BB1" : "#F4F1E6");
          }
          break;
        }
      case PITCH:
        {
          const band = (x / 2 | 0) % 2;
          px(ctx, X, Y, T, T, band ? "#7DC470" : "#75BC68");
          if (hash(x + 7, y + 2) > 0.86) px(ctx, X + (n * 13 | 0) % 13 + 1, Y + (n * 21 | 0) % 13 + 1, 2, 1, band ? "#74BB67" : "#6DB360");
          break;
        }
      case COURT:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#D98E54" : "#D3884E");
          if (hash(x + 3, y + 5) > 0.8) px(ctx, X + (n * 17 | 0) % 13 + 1, Y + (n * 11 | 0) % 13 + 1, 2, 1, "#C77F47");
          break;
        }
      case PATH:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#D9CDB4" : "#D2C6AC");
          if (hash(x + 2, y + 6) > 0.7) px(ctx, X + (n * 13 | 0) % 12 + 2, Y + (n * 29 | 0) % 12 + 2, 2, 1, "#C4B79B");
          if (g(x, y - 1) !== PATH && g(x, y - 1) !== DOOR && g(x, y - 1) !== SAND) px(ctx, X, Y, T, 1, "#BFB298");
          break;
        }
      case PLAZA:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#DDD4C2" : "#D6CDBA");
          px(ctx, X, Y, T, 1, "#C8BFAB");
          px(ctx, X, Y, 1, T, "#CDC4B0");
          if (hash(x + 4, y + 9) > 0.84) px(ctx, X + (n * 19 | 0) % 12 + 2, Y + (n * 7 | 0) % 12 + 2, 2, 1, "#C8BFAB");
          break;
        }
      case DECK:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#C49A6C" : "#BE9466");
          px(ctx, X, Y + 3, T, 1, "#AC8458");
          px(ctx, X, Y + 8, T, 1, "#AC8458");
          px(ctx, X, Y + 13, T, 1, "#AC8458");
          break;
        }
      case SAND:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#E3D9BE" : "#DDD2B5");
          if (hash(x + 1, y + 3) > 0.75) px(ctx, X + (n * 19 | 0) % 13 + 1, Y + (n * 7 | 0) % 13 + 1, 1, 1, "#CEC2A3");
          break;
        }
      case WATER:
        {
          px(ctx, X, Y, T, T, "#5FAAD0");
          if (hash(x + 4, y + 1) > 0.55) px(ctx, X + (n * 9 | 0) % 10 + 2, Y + (n * 27 | 0) % 10 + 2, 5, 1, "#90CDE8");
          if (g(x, y - 1) !== WATER) {
            px(ctx, X, Y, T, 2, "#3E86AE");
            px(ctx, X, Y + 2, T, 1, "#86C4E0");
          }
          if (g(x, y + 1) !== WATER) px(ctx, X, Y + T - 2, T, 2, "#3E86AE");
          if (g(x - 1, y) !== WATER) px(ctx, X, Y, 2, T, "#3E86AE");
          if (g(x + 1, y) !== WATER) px(ctx, X + T - 2, Y, 2, T, "#3E86AE");
          break;
        }
      case POOL:
        {
          px(ctx, X, Y, T, T, "#49B4E2");
          if ((y % 2 === 0) && hash(x + 8, y + 3) > 0.35) px(ctx, X + 2, Y + 6, 12, 2, "#9ADDF4");
          if (hash(x + 2, y + 9) > 0.5) px(ctx, X + (n * 11 | 0) % 10 + 3, Y + (n * 19 | 0) % 10 + 3, 3, 1, "#C8EEFB");
          if (g(x, y - 1) !== POOL) {
            px(ctx, X, Y, T, 2, "#2E8FC4");
            px(ctx, X, Y + 2, T, 1, "#7FD2F0");
          }
          if (g(x, y + 1) !== POOL) px(ctx, X, Y + T - 2, T, 2, "#2E8FC4");
          if (g(x - 1, y) !== POOL) px(ctx, X, Y, 2, T, "#2E8FC4");
          if (g(x + 1, y) !== POOL) px(ctx, X + T - 2, Y, 2, T, "#2E8FC4");
          break;
        }
      case FLOOR:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#F0E7D6" : "#EBE1CE");
          px(ctx, X, Y + T - 1, T, 1, "#DCD0BB");
          px(ctx, X + T - 1, Y, 1, T, "#E2D7C2");
          break;
        }
      case CARPET:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#A9D8C0" : "#A2D2B9");
          if ((x + y) % 2) px(ctx, X + 6, Y + 6, 4, 4, "#97C8AE");
          break;
        }
      case WALL:
        {
          px(ctx, X, Y, T, T, "#B9AE9C");
          px(ctx, X, Y, T, 4, "#CCC2B1");
          px(ctx, X, Y + T - 2, T, 2, "#9E9381");
          break;
        }
      case GLASS:
        {
          px(ctx, X, Y, T, T, "#9CC6DE");
          px(ctx, X, Y, T, 2, "#BCDEF0");
          px(ctx, X + 5, Y, 1, T, "#7FA9C2");
          px(ctx, X + 10, Y, 1, T, "#7FA9C2");
          px(ctx, X, Y + T - 2, T, 2, "#6E94AC");
          if (hash(x + 6, y + 2) > 0.6) px(ctx, X + 1 + (n * 7 | 0) % 3, Y + 3, 2, 7, "rgba(255,255,255,0.5)");
          break;
        }
      case ROOF:
        {
          px(ctx, X, Y, T, T, "#C8D2CC");
          break;
        }
      case DOOR:
        {
          px(ctx, X, Y, T, T, "#D2C6AC");
          px(ctx, X + 1, Y, T - 2, 3, "#8A7A63");
          break;
        }
    }
  }
  function drawTree(ctx, x, y) {
    const X = x * T,
      Y = y * T,
      n = hash(x, y);
    px(ctx, X + 3, Y + 13, 11, 2, "rgba(54,40,22,0.20)");
    px(ctx, X + 6, Y + 9, 4, 6, "#4A3018");
    px(ctx, X + 7, Y + 9, 2, 5, "#7A5A3C");
    const OL = "#2E5638",
      c1 = n > 0.5 ? "#56AB62" : "#4FA45B",
      c2 = n > 0.5 ? "#73C079" : "#69B870",
      c3 = "#3C7849";
    px(ctx, X + 2, Y + 1, 12, 11, OL);
    px(ctx, X + 4, Y - 1, 8, 3, OL);
    px(ctx, X + 3, Y + 2, 10, 9, c1);
    px(ctx, X + 5, Y, 6, 3, c1);
    px(ctx, X + 4, Y + 2, 5, 3, c2);
    px(ctx, X + 5, Y, 4, 2, c2);
    px(ctx, X + 8, Y + 6, 4, 4, c3);
  }
  function drawHedge(ctx, x, y) {
    const X = x * T,
      Y = y * T;
    px(ctx, X + 1, Y + 13, 14, 2, "rgba(54,40,22,0.16)");
    px(ctx, X + 1, Y + 3, 14, 11, "#2E5638");
    px(ctx, X + 2, Y + 4, 12, 9, "#52A65D");
    px(ctx, X + 3, Y + 4, 10, 2, "#69B870");
  }
  function drawFlower(ctx, x, y) {
    const X = x * T,
      Y = y * T,
      n = hash(x * 5, y * 3);
    const c = n > 0.66 ? "#F2D06B" : n > 0.33 ? "#EF9BB1" : "#F4F1E6";
    px(ctx, X + 5, Y + 7, 2, 2, c);
    px(ctx, X + 10, Y + 4, 2, 2, c);
    px(ctx, X + 5, Y + 9, 1, 2, "#5E9E63");
    px(ctx, X + 10, Y + 6, 1, 2, "#5E9E63");
  }
  function drawFurniture(ctx, f) {
    const X = f.x * T,
      Y = f.y * T;
    const n = hash(f.x * 7, f.y * 5);
    if (GROUND_SHADOW.has(f.kind)) px(ctx, X + 2, Y + 13, 12, 2, "rgba(48,36,20,0.15)");
    switch (f.kind) {
      case "desk":
        px(ctx, X + 1, Y + 4, 14, 9, "#B0814F");
        px(ctx, X + 1, Y + 4, 14, 2, "#CA9961");
        px(ctx, X + 1, Y + 12, 14, 1, "#80582F");
        px(ctx, X + 4, Y + 4, 6, 6, "#26303C");
        px(ctx, X + 5, Y + 5, 4, 3, "#83DEAC");
        px(ctx, X + 11, Y + 8, 3, 2, "#EFE5D4");
        break;
      case "table":
        px(ctx, X + 1, Y + 3, 14, 11, "#5A3D24");
        px(ctx, X + 2, Y + 4, 12, 9, "#B98F62");
        px(ctx, X + 2, Y + 4, 12, 2, "#D0A674");
        px(ctx, X + 2, Y + 12, 12, 1, "#8A6038");
        px(ctx, X + 6, Y + 7, 4, 3, "#EDE6D6");
        break;
      case "patio":
        px(ctx, X + 4, Y + 8, 8, 6, "#B98F62");
        px(ctx, X + 4, Y + 8, 8, 2, "#D0A674");
        px(ctx, X + 7, Y + 1, 2, 9, "#8A7A63");
        px(ctx, X + 1, Y + 1, 14, 4, n > 0.5 ? "#E66A5C" : "#00B14F");
        px(ctx, X + 1, Y + 1, 14, 1, "rgba(255,255,255,0.55)");
        px(ctx, X + 3, Y + 5, 10, 1, n > 0.5 ? "#C9554A" : "#03A249");
        break;
      case "shelf":
        px(ctx, X + 1, Y, 14, 15, "#4A3018");
        px(ctx, X + 2, Y + 1, 12, 13, "#9C7142");
        px(ctx, X + 2, Y + 1, 12, 1, "#B5895A");
        px(ctx, X + 2, Y + 7, 12, 1, "#5A3D24");
        px(ctx, X + 2, Y + 13, 12, 1, "#5A3D24");
        px(ctx, X + 3, Y + 2, 2, 5, "#D9514E");
        px(ctx, X + 5, Y + 3, 2, 4, "#E59A3C");
        px(ctx, X + 7, Y + 2, 2, 5, "#4D86C9");
        px(ctx, X + 9, Y + 3, 2, 4, "#5FA86A");
        px(ctx, X + 11, Y + 2, 2, 5, "#9B6FD0");
        px(ctx, X + 3, Y + 8, 2, 5, "#4D86C9");
        px(ctx, X + 5, Y + 8, 2, 5, "#E5C24E");
        px(ctx, X + 7, Y + 9, 2, 4, "#D9514E");
        px(ctx, X + 9, Y + 8, 2, 5, "#5FA86A");
        px(ctx, X + 11, Y + 9, 2, 4, "#E59A3C");
        break;
      case "bench":
        px(ctx, X + 1, Y + 5, 14, 6, "#5A3D24");
        px(ctx, X + 1, Y + 6, 14, 4, "#A8814F");
        px(ctx, X + 1, Y + 6, 14, 1, "#C09A66");
        px(ctx, X + 2, Y + 10, 2, 4, "#5A3D24");
        px(ctx, X + 12, Y + 10, 2, 4, "#5A3D24");
        break;
      case "plant":
        px(ctx, X + 5, Y + 9, 6, 5, "#B5703F");
        px(ctx, X + 4, Y + 3, 8, 7, "#4E9657");
        px(ctx, X + 6, Y + 1, 4, 4, "#5FA868");
        break;
      case "coffee":
        px(ctx, X + 1, Y + 3, 14, 11, "#5C5650");
        px(ctx, X + 3, Y + 5, 4, 6, "#3A3531");
        px(ctx, X + 9, Y + 5, 4, 4, "#C9A07E");
        px(ctx, X + 10, Y + 10, 2, 2, "#F4F1E6");
        break;
      case "whiteboard":
        px(ctx, X, Y + 1, 16, 11, "#5A4A36");
        px(ctx, X + 1, Y + 2, 14, 9, "#F7F5EE");
        px(ctx, X + 1, Y + 2, 14, 1, "#FFFFFF");
        px(ctx, X + 3, Y + 4, 6, 1, "#5FA86A");
        px(ctx, X + 3, Y + 6, 8, 1, "#4D86C9");
        px(ctx, X + 3, Y + 8, 5, 1, "#D9514E");
        break;
      case "server":
        px(ctx, X + 3, Y + 2, 10, 12, "#3E4450");
        px(ctx, X + 5, Y + 4, 2, 2, "#7FD9A8");
        px(ctx, X + 9, Y + 4, 2, 2, "#E5C46B");
        px(ctx, X + 5, Y + 8, 6, 1, "#566074");
        px(ctx, X + 5, Y + 11, 6, 1, "#566074");
        break;
      case "bike":
        {
          const frame = n > 0.75 ? "#4D6BFE" : n > 0.5 ? "#E66A5C" : n > 0.25 ? "#00B14F" : "#E5C46B";
          px(ctx, X + 2, Y + 9, 5, 5, "#2E3440");
          px(ctx, X + 9, Y + 9, 5, 5, "#2E3440");
          px(ctx, X + 3, Y + 10, 3, 3, "#79B97E");
          px(ctx, X + 10, Y + 10, 3, 3, "#79B97E");
          px(ctx, X + 4, Y + 7, 8, 2, frame);
          px(ctx, X + 4, Y + 4, 2, 4, frame);
          px(ctx, X + 10, Y + 4, 2, 4, frame);
          px(ctx, X + 3, Y + 3, 4, 2, "#3A3531");
          px(ctx, X + 10, Y + 3, 3, 2, "#3A3531");
          break;
        }
      case "hoop":
        {
          px(ctx, X + 7, Y + 4, 2, 11, "#3A3F4A");
          px(ctx, X + 2, Y, 12, 7, "#2A2E36");
          px(ctx, X + 3, Y + 1, 10, 5, "#F7F5EE");
          px(ctx, X + 3, Y + 1, 10, 1, "#FFFFFF");
          px(ctx, X + 6, Y + 3, 4, 2, "#E0685C");
          px(ctx, X + 5, Y + 6, 6, 2, "#E0685C");
          px(ctx, X + 5, Y + 6, 6, 1, "#F2897A");
          break;
        }
      case "pullupbar":
        {
          px(ctx, X + 2, Y + 2, 12, 2, "#3A3F4A");
          px(ctx, X + 3, Y + 2, 9, 1, "#9AA0AC");
          px(ctx, X + 2, Y + 4, 2, 10, "#3A3F4A");
          px(ctx, X + 12, Y + 4, 2, 10, "#3A3F4A");
          px(ctx, X + 2, Y + 4, 1, 10, "#6E7686");
          px(ctx, X + 12, Y + 4, 1, 10, "#6E7686");
          break;
        }
      case "benchpress":
        {
          px(ctx, X + 2, Y + 7, 12, 4, "#2A2E36");
          px(ctx, X + 3, Y + 8, 10, 2, "#C24A40");
          px(ctx, X + 3, Y + 8, 10, 1, "#E0685C");
          px(ctx, X + 4, Y + 11, 2, 3, "#2A2E36");
          px(ctx, X + 10, Y + 11, 2, 3, "#2A2E36");
          px(ctx, X + 1, Y + 3, 2, 6, "#3A3F4A");
          px(ctx, X + 13, Y + 3, 2, 6, "#3A3F4A");
          px(ctx, X + 1, Y + 4, 14, 2, "#3A3F4A");
          px(ctx, X + 2, Y + 4, 12, 1, "#9AA0AC");
          px(ctx, X + 0, Y + 3, 2, 5, "#2A2E36");
          px(ctx, X + 14, Y + 3, 2, 5, "#2A2E36");
          break;
        }
      case "treadmill":
        {
          px(ctx, X + 2, Y + 6, 12, 9, "#2A2E36");
          px(ctx, X + 3, Y + 7, 10, 7, "#566074");
          px(ctx, X + 3, Y + 9, 10, 1, "#3A3F4A");
          px(ctx, X + 3, Y + 12, 10, 1, "#3A3F4A");
          px(ctx, X + 3, Y + 2, 2, 5, "#3A3F4A");
          px(ctx, X + 3, Y + 2, 6, 2, "#3A3F4A");
          px(ctx, X + 4, Y + 2, 4, 1, "#7FD9A8");
          break;
        }
      case "dumbbells":
        {
          px(ctx, X + 1, Y + 7, 14, 3, "#5A3D24");
          px(ctx, X + 1, Y + 8, 14, 1, "#9C7142");
          px(ctx, X + 2, Y + 10, 2, 4, "#5A3D24");
          px(ctx, X + 12, Y + 10, 2, 4, "#5A3D24");
          px(ctx, X + 2, Y + 4, 3, 3, "#2A2E36");
          px(ctx, X + 6, Y + 4, 3, 3, "#3A6BD0");
          px(ctx, X + 10, Y + 4, 3, 3, "#C24A40");
          px(ctx, X + 3, Y + 4, 1, 1, "#8B96A6");
          px(ctx, X + 7, Y + 4, 1, 1, "#8B96A6");
          px(ctx, X + 11, Y + 4, 1, 1, "#8B96A6");
          break;
        }
      case "mat":
        {
          px(ctx, X + 1, Y + 3, 14, 11, "#5A4DB0");
          px(ctx, X + 2, Y + 4, 12, 9, "#8170E0");
          px(ctx, X + 2, Y + 4, 12, 2, "#9B8BEC");
          px(ctx, X + 4, Y + 8, 8, 1, "#6A5AC8");
          break;
        }
      case "planterbox":
        {
          px(ctx, X, Y + 8, T, 8, "#ECE8E0");
          px(ctx, X, Y + 8, T, 1, "#F6F2EA");
          px(ctx, X, Y + 15, T, 1, "#CFC9BD");
          px(ctx, X + T - 1, Y + 8, 1, 8, "#DAD4C8");
          px(ctx, X, Y + 3, T, 6, "#B5895A");
          px(ctx, X, Y + 3, T, 2, "#CA9C69");
          px(ctx, X, Y + 8, T, 1, "#946B40");
          const pg1 = n > 0.5 ? "#5FA868" : "#4E9657";
          const pg2 = n > 0.5 ? "#7CC074" : "#69B073";
          px(ctx, X + 1, Y + 1, 5, 5, pg1);
          px(ctx, X + 8, Y, 6, 5, pg2);
          px(ctx, X + 4, Y, 3, 3, pg2);
          px(ctx, X + 10, Y + 2, 3, 3, pg1);
          px(ctx, X + 5, Y + 1, 1, 1, "#9AD49B");
          px(ctx, X + 12, Y + 1, 1, 1, "#9AD49B");
          break;
        }
    }
  }
  function renderMap() {
    const cv = document.createElement("canvas");
    cv.width = W * T;
    cv.height = H * T;
    const ctx = cv.getContext("2d");
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drawTile(ctx, x, y);
    Object.values(BUILDINGS).forEach(b => {
      for (let x = b.x0; x <= b.x1; x++) {
        px(ctx, x * T, b.y0 * T, T, T, b.roof);
        px(ctx, x * T, b.y0 * T, T, 3, shade(b.roof, 18));
        px(ctx, x * T, (b.y0 + 1) * T, T, T, shade(b.roof, -8));
        px(ctx, x * T, (b.y0 + 1) * T + T - 3, T, 3, shade(b.roof, -22));
      }
      px(ctx, b.x0 * T, b.y0 * T, 2, 2 * T, shade(b.roof, 14));
      px(ctx, b.x1 * T + T - 2, b.y0 * T, 2, 2 * T, shade(b.roof, -18));
      if (b.solar) {
        for (let x = b.x0 + 1; x <= b.x1 - 2; x += 2) {
          px(ctx, x * T + 2, b.y0 * T + 5, 2 * T - 8, T - 4, "#2F4666");
          px(ctx, x * T + 2, b.y0 * T + 5, 2 * T - 8, 2, "#4D6B94");
          px(ctx, x * T + 2 + (2 * T - 8 >> 1), b.y0 * T + 5, 1, T - 4, "#22354F");
          px(ctx, x * T + 2, b.y0 * T + 5 + (T - 4 >> 1), 2 * T - 8, 1, "#22354F");
        }
      } else {
        px(ctx, b.x0 * T + 2, b.y0 * T + 4, (b.x1 - b.x0 + 1) * T - 4, T - 2, "#74A86E");
        px(ctx, b.x0 * T + 2, b.y0 * T + 4, (b.x1 - b.x0 + 1) * T - 4, 2, "#8FC487");
        for (let x = b.x0 + 1; x <= b.x1 - 1; x += 2) {
          px(ctx, x * T + 3, b.y0 * T + 3, 5, 5, "#5C9657");
          px(ctx, x * T + 4, b.y0 * T + 2, 3, 3, "#7CC074");
        }
      }
      const rx = b.x0 * T,
        ry = b.y0 * T,
        rw = (b.x1 - b.x0 + 1) * T,
        rh = 2 * T,
        rol = shade(b.roof, -48);
      px(ctx, rx, ry, rw, 1, rol);
      px(ctx, rx, ry, 1, rh, rol);
      px(ctx, rx + rw - 1, ry, 1, rh, rol);
      px(ctx, rx, ry + rh - 1, rw, 1, rol);
      px(ctx, rx + 1, ry + rh, rw - 1, 2, "rgba(38,34,28,0.18)");
    });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = g(x, y);
      if (t === FLOWER) drawFlower(ctx, x, y);
      if (t === HEDGE) drawHedge(ctx, x, y);
    }
    FURNITURE.forEach(f => drawFurniture(ctx, f));
    {
      const FX = 31 * T,
        FY = 21 * T,
        FW = 2 * T,
        FH = 2 * T;
      ctx.fillStyle = "#B9B6AD";
      ctx.fillRect(FX - 4, FY - 4, FW + 8, 4);
      ctx.fillRect(FX - 4, FY + FH, FW + 8, 4);
      ctx.fillRect(FX - 4, FY, 4, FH);
      ctx.fillRect(FX + FW, FY, 4, FH);
      ctx.fillStyle = "#9D9A91";
      ctx.fillRect(FX - 4, FY + FH + 2, FW + 8, 2);
      ctx.fillStyle = "#F4F1E6";
      ctx.fillRect(FX + T - 2, FY + T - 6, 4, 6);
      ctx.fillRect(FX + T - 5, FY + T - 3, 10, 2);
      ctx.fillStyle = "#BCE0F0";
      ctx.fillRect(FX + T - 7, FY + T, 3, 2);
      ctx.fillRect(FX + T + 4, FY + T, 3, 2);
    }
    {
      for (let r = 0; r < 3; r++) for (let cc = 0; cc < 2; cc++) {
        const sx = (31 + cc * 2) * T + 1,
          sy = (7 + r * 2) * T + 1;
        px(ctx, sx, sy, 2 * T - 2, T + 4, "#2F4666");
        px(ctx, sx, sy, 2 * T - 2, 2, "#4D6B94");
        px(ctx, sx + T - 1, sy, 1, T + 4, "#22354F");
        px(ctx, sx, sy + (T >> 1), 2 * T - 2, 1, "#22354F");
      }
      for (let x = 10; x <= 20; x++) {
        px(ctx, x * T, 41 * T + 4, T, T - 2, "#9C7B4F");
        px(ctx, x * T, 41 * T + 4, T, 2, "#B5945F");
        if (x % 2) px(ctx, x * T + 2, 41 * T + 4, 1, T - 2, "#7E6240");
        px(ctx, x * T + 2, 41 * T + 1, 2, 3, "#7E6240");
      }
      [[12, 39], [16, 43], [18, 40], [13, 44], [19, 42]].forEach(([lx, ly]) => {
        px(ctx, lx * T + 4, ly * T + 5, 7, 5, "#4FA85C");
        px(ctx, lx * T + 6, ly * T + 4, 2, 2, "#E86A98");
      });
    }
    {
      const CX0 = 47 * T + 5,
        CY0 = 26 * T + 5,
        CW = 10 * T - 10,
        CH = 7 * T - 10;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(CX0, CY0, CW, CH);
      ctx.beginPath();
      ctx.moveTo(CX0 + CW / 2, CY0);
      ctx.lineTo(CX0 + CW / 2, CY0 + CH);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX0 + CW / 2, CY0 + CH / 2, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX0, CY0 + CH / 2, 26, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX0 + CW, CY0 + CH / 2, 26, Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
    }
    {
      const PX0 = 42 * T + 6,
        PY0 = 35 * T + 6,
        PW = 17 * T - 12,
        PH = 9 * T - 12;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(PX0, PY0, PW, PH);
      ctx.beginPath();
      ctx.moveTo(PX0 + PW / 2, PY0);
      ctx.lineTo(PX0 + PW / 2, PY0 + PH);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PX0 + PW / 2, PY0 + PH / 2, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(PX0, PY0 + PH / 2 - 22, 16, 44);
      ctx.strokeRect(PX0 + PW - 16, PY0 + PH / 2 - 22, 16, 44);
      ctx.fillStyle = "#F4F1E6";
      ctx.fillRect(PX0 - 4, PY0 + PH / 2 - 12, 3, 24);
      ctx.fillRect(PX0 + PW + 1, PY0 + PH / 2 - 12, 3, 24);
    }
    {
      ctx.fillStyle = "#AC8458";
      ctx.fillRect(15 * T - 4, 39 * T, 8, 2 * T);
      ctx.fillStyle = "#9C7850";
      ctx.fillRect(15 * T - 4, 39 * T + 2 * T - 2, 8, 2);
    }
    {
      ctx.fillStyle = "#E8E5DC";
      ctx.fillRect(25 * T + 2, 39 * T - 3, 2, 9);
      ctx.fillRect(25 * T + 7, 39 * T - 3, 2, 9);
      ctx.fillRect(25 * T + 2, 39 * T - 1, 7, 2);
      ctx.fillRect(25 * T + 2, 39 * T + 3, 7, 2);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28 * T, 39 * T + 2);
      ctx.lineTo(28 * T, 44 * T - 2);
      ctx.stroke();
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g(x, y) === TREE) drawTree(ctx, x, y);
    return cv;
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const gg = Math.max(0, Math.min(255, (n >> 8 & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${gg},${b})`;
  }
  function drawBlockSegments(ctx, segs, cx, cy, h) {
    ctx.save();
    ctx.font = `900 ${h}px "Inter Tight", "Arial Rounded MT Bold", Arial, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const depth = Math.max(2, Math.round(h * 0.18));
    const widths = segs.map(s => ctx.measureText(s.t).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const x0 = cx - total / 2;
    let x = x0;
    ctx.fillStyle = "rgba(40,30,70,0.16)";
    for (let i = 0; i < segs.length; i++) {
      ctx.fillText(segs[i].t, x, cy + depth + 4);
      x += widths[i];
    }
    x = x0;
    for (let i = 0; i < segs.length; i++) {
      ctx.fillStyle = shade(segs[i].c, -50);
      for (let d = depth; d > 0; d--) ctx.fillText(segs[i].t, x + d, cy + d);
      ctx.fillStyle = segs[i].c;
      ctx.fillText(segs[i].t, x, cy);
      x += widths[i];
    }
    ctx.restore();
  }
  function stampLogoBlocks(cv) {
    const ctx = cv.getContext("2d");
    const items = [{
      segs: [{ t: "VNG", c: "#F26F21" }],
      cx: 8 * T,
      max: Math.round(3.7 * T)
    }, {
      segs: [{ t: "GREEN", c: "#2E2E2E" }, { t: "NODE", c: "#00B14F" }],
      cx: Math.round(13.2 * T),
      max: Math.round(6.2 * T)
    }, {
      segs: [{ t: "ZALO", c: "#0068FF" }],
      cx: Math.round(21.7 * T),
      max: Math.round(3.4 * T)
    }, {
      segs: [{ t: "ZALO", c: "#0046E5" }, { t: "PAY", c: "#00C160" }],
      cx: Math.round(26.4 * T),
      max: Math.round(5.4 * T)
    }];
    const y = Math.round(20.6 * T);
    const base = (x0t, x1t) => {
      const bx = x0t * T,
        bw = (x1t - x0t + 1) * T,
        by = 20 * T + 1;
      px(ctx, bx, by, bw, 2 * T - 2, "#C9C6BD");
      px(ctx, bx, by, bw, 3, "#DCD9D0");
      px(ctx, bx, by + 2 * T - 4, bw, 2, "#9D9A91");
    };
    base(6, 16);
    base(20, 29);
    items.forEach(it => {
      let h = Math.round(T * 1.5);
      const full = it.segs.map(s => s.t).join("");
      ctx.font = `900 ${h}px "Inter Tight", Arial, sans-serif`;
      const w = ctx.measureText(full).width;
      if (w > it.max) h = Math.max(7, Math.floor(h * it.max / w));
      drawBlockSegments(ctx, it.segs, it.cx, y, h);
    });
  }
  function stampLogo(cv, img, buildingKey = "office") {
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const b = BUILDINGS[buildingKey] || BUILDINGS.office;
    const maxW = 8 * T,
      maxH = T * 1.35;
    const sc = Math.min(maxW / img.width, maxH / img.height);
    const w = Math.round(img.width * sc),
      h = Math.round(img.height * sc);
    const cx = Math.round((b.x0 + b.x1 + 1) / 2 * T - w / 2);
    const cy = Math.round(b.y0 * T + T - h / 2 + 2);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fillRect(cx - 5, cy - 4, w + 10, h + 8);
    ctx.fillStyle = "rgba(53,53,53,0.25)";
    ctx.fillRect(cx - 5, cy + h + 4, w + 10, 2);
    ctx.drawImage(img, cx, cy, w, h);
  }
  return {
    T,
    W,
    H,
    grid,
    g,
    walkable,
    renderMap,
    stampLogo,
    stampLogoBlocks,
    BUILDINGS,
    FURNITURE,
    hash,
    POOL
  };
})();
export default ASMap;
export { ASMap };
