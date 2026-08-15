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
    POOL = 17,
    ATRIUM = 18,
    LOBBY = 19,
    SLAT = 20,
    PARK = 21,
    CORR = 22;
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
      x0: 8,
      y0: 12,
      x1: 22,
      y1: 22,
      roof: "#4F7FD0",
      name: "office",
      solar: true,
      rows: 1
    },
    lab: {
      x0: 36,
      y0: 4,
      x1: 49,
      y1: 7,
      roof: "#6E96D8",
      name: "lab",
      solar: true,
      rows: 1
    },
    library: {
      x0: 8,
      y0: 4,
      x1: 32,
      y1: 9,
      roof: "#C8894E",
      name: "library",
      solar: false,
      rows: 2
    },
    cafe: {
      x0: 40,
      y0: 24,
      x1: 49,
      y1: 30,
      roof: "#D8809C",
      name: "cafe",
      solar: false,
      rows: 0
    },
    wing: {
      x0: 52,
      y0: 15,
      x1: 58,
      y1: 15,
      roof: "#C8894E",
      name: "wing",
      solar: false,
      rows: 1
    }
  };
  const inA = (x, y) => x >= 4 && x <= 52 && y >= 4 && y <= 30 && !(x <= 7 && y >= 23);
  const inWing = (x, y) => x >= 52 && x <= 58 && y >= 15 && y <= 29;
  const inC = (x, y) => x >= 8 && x <= 26 && y >= 30 && y <= 33;
  const inside = (x, y) => inA(x, y) || inWing(x, y) || inC(x, y);
  rect(2, 4, 3, 40, PATH);
  rect(3, 23, 8, 28, PATH);
  rect(5, 25, 6, 26, GRASS);
  rect(4, 33, 9, 38, COURT);
  rect(53, 2, 61, 13, DECK);
  rect(54, 3, 60, 10, POOL);
  rect(56, 11, 57, 12, POOL);
  rect(59, 14, 60, 40, PATH);
  rect(48, 33, 58, 33, PATH);
  rect(42, 31, 47, 45, PATH);
  rect(10, 41, 25, 44, PARK);
  rect(48, 41, 61, 44, PARK);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) s(x, y, FLOOR);
  rect(8, 10, 49, 11, CORR);
  rect(8, 23, 52, 23, CORR);
  rect(34, 5, 35, 23, CORR);
  rect(48, 8, 49, 23, CORR);
  rect(52, 16, 53, 29, CORR);
  rect(36, 12, 47, 22, ATRIUM);
  rect(29, 14, 33, 20, CARPET);
  rect(37, 5, 41, 6, CARPET);
  rect(45, 5, 48, 6, CARPET);
  rect(40, 24, 49, 30, LOBBY);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) s(x, y, WALL);
  rect(8, 4, 32, 5, ROOF);
  rect(36, 4, 49, 4, ROOF);
  rect(8, 12, 22, 12, ROOF);
  rect(52, 15, 58, 15, ROOF);
  rect(8, 6, 8, 9, WALL);
  rect(20, 6, 20, 9, WALL);
  rect(8, 9, 20, 9, WALL);
  rect(21, 6, 21, 9, WALL);
  rect(22, 6, 22, 9, WALL);
  rect(32, 6, 32, 9, WALL);
  rect(33, 5, 33, 9, WALL);
  rect(22, 9, 32, 9, WALL);
  rect(36, 5, 36, 7, WALL);
  rect(42, 5, 42, 7, WALL);
  rect(43, 5, 43, 7, WALL);
  rect(44, 5, 44, 7, WALL);
  rect(49, 5, 49, 7, WALL);
  rect(37, 7, 41, 7, GLASS);
  rect(45, 7, 48, 7, GLASS);
  rect(8, 13, 8, 21, WALL);
  rect(22, 13, 22, 21, WALL);
  rect(8, 22, 22, 22, WALL);
  rect(24, 14, 27, 14, WALL);
  rect(24, 17, 27, 17, WALL);
  rect(24, 14, 24, 17, WALL);
  rect(27, 14, 27, 17, WALL);
  rect(24, 19, 27, 19, WALL);
  rect(24, 22, 27, 22, WALL);
  rect(24, 19, 24, 22, WALL);
  rect(27, 19, 27, 22, WALL);
  rect(8, 24, 11, 24, WALL);
  rect(8, 27, 11, 27, WALL);
  rect(11, 24, 11, 27, WALL);
  rect(13, 24, 26, 24, WALL);
  rect(13, 25, 13, 29, WALL);
  rect(26, 25, 26, 29, WALL);
  rect(40, 25, 40, 29, WALL);
  rect(49, 25, 49, 29, WALL);
  s(40, 24, SLAT);
  s(41, 24, SLAT);
  s(47, 24, SLAT);
  s(48, 24, SLAT);
  s(49, 24, SLAT);
  rect(50, 12, 52, 12, WALL);
  rect(50, 14, 52, 14, WALL);
  rect(50, 12, 50, 14, WALL);
  rect(54, 16, 54, 28, WALL);
  rect(54, 19, 58, 19, WALL);
  rect(54, 23, 58, 23, WALL);
  s(14, 9, DOOR);
  s(27, 9, DOOR);
  s(39, 7, DOOR);
  s(46, 7, DOOR);
  s(15, 22, DOOR);
  s(25, 17, DOOR);
  s(25, 22, DOOR);
  s(19, 24, DOOR);
  s(8, 26, DOOR);
  s(50, 13, DOOR);
  s(54, 16, DOOR);
  s(54, 21, DOOR);
  s(54, 26, DOOR);
  s(44, 30, DOOR);
  s(45, 30, DOOR);
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
  const scatter = [[11, 34], [24, 35], [13, 39], [23, 39], [28, 32], [33, 32], [30, 39], [36, 40], [39, 33], [49, 35], [53, 36], [57, 31], [5, 30], [6, 42], [4, 45], [61, 30], [54, 32], [28, 44], [35, 44], [39, 44]];
  scatter.forEach(([x, y]) => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  [[41, 31], [48, 31], [26, 41], [9, 41], [41, 40], [27, 33]].forEach(([x, y]) => {
    if (g(x, y) === GRASS) s(x, y, HEDGE);
  });
  for (let y = 2; y < H - 1; y += 2) [2, 3, W - 3, W - 2].forEach(x => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  for (let x = 4; x < W - 3; x += 3) [2, H - 2].forEach(y => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  [[27, 32], [29, 33], [50, 36], [52, 35], [10, 36], [11, 39]].forEach(([x, y]) => {
    if (g(x, y) === GRASS) s(x, y, TREE);
  });
  for (let y = 34; y <= 37; y++) for (let x = 22; x <= 41; x++) if (g(x, y) === TREE) s(x, y, GRASS);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (g(x, y) === GRASS && hash(x * 3, y * 7) > 0.86) s(x, y, FLOWER);
  const FURNITURE = [];
  const F = (kind, x, y) => FURNITURE.push({ kind, x, y });
  [[10, 14], [14, 14], [18, 14], [10, 18], [14, 18], [18, 18]].forEach(([x, y]) => F("desk", x, y));
  F("whiteboard", 20, 13);
  F("server", 9, 13);
  F("coffee", 21, 13);
  [9, 10, 12, 13, 14, 16, 17, 18, 20, 21].forEach(x => F("planterbox", x, 16));
  F("plant", 9, 21);
  F("plant", 21, 21);
  [[10, 6], [13, 6], [16, 6], [19, 6], [24, 6], [27, 6], [30, 6]].forEach(([x, y]) => F("desk", x, y));
  F("plant", 9, 8);
  F("plant", 19, 8);
  F("plant", 23, 8);
  F("plant", 31, 8);
  F("coffee", 31, 6);
  F("whiteboard", 38, 5);
  F("table", 39, 5);
  F("plant", 45, 5);
  F("table", 46, 5);
  F("whiteboard", 47, 5);
  [37, 38, 41, 43, 45].forEach(x => F("arcade", x, 8));
  F("table", 26, 15);
  F("table", 26, 20);
  F("sofa", 30, 15);
  F("sofa", 32, 15);
  F("sofa", 30, 18);
  F("sofa", 32, 18);
  F("table", 31, 16);
  F("plant", 29, 14);
  F("plant", 33, 14);
  F("atrium", 41, 16);
  F("shelf", 9, 25);
  F("shelf", 10, 24);
  [[15, 26], [18, 26], [21, 26], [24, 26], [11, 31], [15, 31], [19, 31], [23, 31]].forEach(([x, y]) => F("desk", x, y));
  F("plant", 14, 25);
  F("plant", 25, 29);
  F("plant", 10, 32);
  F("desk", 51, 13);
  F("coffee", 56, 16);
  F("coffee", 57, 16);
  F("table", 56, 18);
  F("shelf", 57, 18);
  F("shelf", 55, 20);
  F("medbed", 56, 20);
  F("pullupbar", 56, 24);
  F("treadmill", 55, 25);
  F("benchpress", 57, 25);
  F("dumbbells", 55, 27);
  F("mat", 57, 27);
  F("desk", 42, 26);
  F("bench", 47, 26);
  F("plant", 41, 25);
  F("plant", 48, 25);
  F("loctree", 5, 25);
  F("hoop", 6, 33);
  F("patio", 55, 2);
  F("patio", 59, 2);
  F("bench", 53, 12);
  F("bench", 61, 12);
  F("bench", 41, 33);
  F("bench", 10, 35);
  F("bench", 5, 29);
  F("bench", 61, 33);
  F("bike", 48, 31);
  F("bike", 49, 31);
  F("bike", 50, 31);
  F("bench", 41, 15);
  F("bench", 42, 18);
  F("bench", 40, 17);
  F("bench", 43, 17);
  [[36, 12], [47, 12], [36, 22], [47, 22]].forEach(([x, y]) => F("planterlow", x, y));
  [11, 12, 13, 15, 16, 17].forEach(x => F("lowshelf", x, 13));
  F("counter", 55, 16);
  [[5, 5], [6, 5]].forEach(([x, y]) => F("lowshelf", x, y));
  [[5, 8], [5, 9], [5, 13], [5, 14], [5, 19], [5, 20]].forEach(([x, y]) => F("crate", x, y));
  F("plant", 14, 29);
  F("plant", 29, 20);
  F("plant", 33, 20);
  [[11, 41], [14, 41], [17, 41], [20, 41], [12, 43], [15, 43], [18, 43], [21, 43]].forEach(([x, y]) => F("car", x, y));
  [[49, 41], [51, 41], [53, 41], [55, 41], [57, 41], [59, 41], [50, 43], [53, 43], [56, 43], [59, 43]].forEach(([x, y]) => F("car", x, y));
  const BLOCKING = new Set(["desk", "table", "shelf", "server", "coffee", "whiteboard", "patio", "hoop", "bike", "benchpress", "treadmill", "dumbbells", "planterbox", "arcade", "sofa", "car", "medbed", "atrium", "loctree"]);
  const GROUND_SHADOW = new Set(["desk", "table", "shelf", "server", "coffee", "bench", "plant", "bike", "benchpress", "treadmill", "dumbbells", "mat", "pullupbar", "arcade"]);
  const SPAN = {
    car: [2, 1],
    medbed: [2, 1],
    sofa: [2, 1],
    loctree: [2, 2],
    atrium: [2, 2]
  };
  const furnAt = {};
  FURNITURE.forEach(f => {
    if (!BLOCKING.has(f.kind)) return;
    const [sw, sh] = SPAN[f.kind] || [1, 1];
    for (let dy = 0; dy < sh; dy++) for (let dx = 0; dx < sw; dx++) furnAt[(f.y + dy) * W + (f.x + dx)] = f;
  });
  for (const yy of [35, 36]) for (let xx = 22; xx <= 41; xx++) furnAt[yy * W + xx] = {
    kind: "logo"
  };
  for (const yy of [38, 39]) for (let xx = 48; xx <= 59; xx++) furnAt[yy * W + xx] = {
    kind: "logo"
  };
  function walkable(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const t = g(x, y);
    if (t === GRASS || t === PATH || t === FLOWER || t === FLOOR || t === DOOR || t === CARPET || t === SAND || t === PLAZA || t === COURT || t === DECK || t === POOL || t === ATRIUM || t === LOBBY || t === PARK || t === CORR) {
      return !furnAt[y * W + x];
    }
    return false;
  }
  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }
  const wallish = v => v === WALL || v === GLASS;
  function ao(ctx, x, y, c) {
    const X = x * T,
      Y = y * T;
    if (wallish(g(x, y - 1))) px(ctx, X, Y, T, 3, c);
    if (wallish(g(x - 1, y))) px(ctx, X, Y, 2, T, c);
    if (wallish(g(x + 1, y))) px(ctx, X + T - 2, Y, 2, T, c);
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
          const band = (x + ((y / 3) | 0)) / 3 % 2 | 0;
          px(ctx, X, Y, T, T, band ? n > 0.5 ? "#6FB44C" : "#6BB048" : n > 0.5 ? "#68AC46" : "#65A843");
          if (hash(x + 9, y + 4) > 0.7) {
            const tx2 = X + (n * 11 | 0) % 11 + 2,
              ty2 = Y + (n * 23 | 0) % 11 + 3;
            px(ctx, tx2, ty2, 3, 1, "#4E9138");
            px(ctx, tx2 + 1, ty2 - 1, 1, 1, "#4E9138");
          }
          if (hash(x + 2, y + 12) > 0.8) px(ctx, X + (n * 29 | 0) % 12 + 2, Y + (n * 13 | 0) % 12 + 2, 2, 1, "#57A03E");
          if (hash(x + 5, y + 8) > 0.86) {
            const bx2 = X + (n * 31 | 0) % 13 + 1,
              by2 = Y + (n * 17 | 0) % 13 + 1;
            px(ctx, bx2, by2, 1, 2, "#A6DC7E");
            px(ctx, bx2 + 1, by2 + 1, 1, 1, "#8CCB6D");
          }
          if (t === GRASS && hash(x + 3, y + 7) > 0.92) {
            const fx = X + (n * 13 | 0) % 10 + 3,
              fy = Y + (n * 7 | 0) % 8 + 4;
            px(ctx, fx, fy + 2, 1, 2, "#3F8A34");
            px(ctx, fx - 1, fy, 3, 2, n > 0.6 ? "#F2D06B" : n > 0.3 ? "#F2A6C6" : "#F8F6EC");
            px(ctx, fx, fy, 1, 1, n > 0.6 ? "#FFE9A0" : n > 0.3 ? "#FFCFE0" : "#FFFFFF");
          }
          break;
        }
      case ATRIUM:
        {
          const sky = (x + y) % 9 < 2;
          const chk = (x + y) % 2;
          px(ctx, X, Y, T, T, sky ? chk ? "#E7EFF6" : "#E2EAF2" : chk ? "#DDE5EE" : "#D8E0E9");
          if (x % 2 === 0) px(ctx, X, Y, 1, T, "#BFCDDC");
          if (y % 2 === 0) px(ctx, X, Y, T, 1, "#BFCDDC");
          if (hash(x + 6, y + 11) > 0.9) px(ctx, X + (n * 13 | 0) % 11 + 2, Y + (n * 29 | 0) % 11 + 2, 2, 1, "#F8FBFE");
          ao(ctx, x, y, "#B2BDD2");
          break;
        }
      case LOBBY:
        {
          const chk = (x + y) % 2;
          px(ctx, X, Y, T, T, chk ? n > 0.5 ? "#4C525E" : "#495059" : n > 0.5 ? "#474D57" : "#444A54");
          if (x % 2 === 0) px(ctx, X, Y, 1, T, "#3A404C");
          if (y % 2 === 0) px(ctx, X, Y, T, 1, "#3A404C");
          if (hash(x + 8, y + 5) > 0.88) px(ctx, X + (n * 17 | 0) % 11 + 2, Y + (n * 23 | 0) % 11 + 2, 2, 1, "#5C6472");
          if (y >= 28 && x >= 42 && x <= 47) {
            px(ctx, X + 4, Y, 1, T, "#5A6270");
            px(ctx, X + 11, Y, 1, T, "#586070");
          }
          ao(ctx, x, y, "#343A46");
          break;
        }
      case SLAT:
        {
          px(ctx, X, Y, T, T, "#EFEAD9");
          px(ctx, X + 3, Y, 1, T, "#D3C9B0");
          px(ctx, X + 7, Y, 1, T, "#D3C9B0");
          px(ctx, X + 11, Y, 1, T, "#D3C9B0");
          px(ctx, X + 15, Y, 1, T, "#D3C9B0");
          px(ctx, X, Y, T, 1, "#9AA4BC");
          px(ctx, X, Y + T - 2, T, 1, "#E2E2DC");
          px(ctx, X, Y + T - 1, T, 1, "#B2B8C6");
          break;
        }
      case PARK:
        {
          const grassy = v => v === GRASS || v === FLOWER || v === TREE || v === HEDGE;
          const chk = (x + y) % 2;
          px(ctx, X, Y, T, T, chk ? n > 0.5 ? "#9A948A" : "#968F85" : n > 0.5 ? "#928C82" : "#8E887E");
          px(ctx, X + 5 + (n * 5 | 0) % 4, Y + 2 + (n * 7 | 0) % 3, 1, 5, "#7E786E");
          px(ctx, X + 2, Y + 8, 5, 1, "#7E786E");
          px(ctx, X + 10, Y + 11 + (n * 3 | 0) % 2, 4, 1, "#7E786E");
          px(ctx, X + 3 + (n * 9 | 0) % 3, Y + 3, 2, 1, "#B4AEA2");
          if (hash(x + 5, y + 3) > 0.82) px(ctx, X + (n * 19 | 0) % 12 + 2, Y + (n * 11 | 0) % 12 + 2, 2, 1, "#78726A");
          if (grassy(g(x, y - 1))) px(ctx, X, Y, T, 1, "#D8D2C0");else if (g(x, y - 1) !== PARK) px(ctx, X, Y, T, 1, "#6E6860");
          if (grassy(g(x - 1, y))) px(ctx, X, Y, 1, T, "#D8D2C0");else if (g(x - 1, y) !== PARK) px(ctx, X, Y, 1, T, "#6E6860");
          if (grassy(g(x + 1, y))) px(ctx, X + T - 1, Y, 1, T, "#D8D2C0");
          if (grassy(g(x, y + 1))) px(ctx, X, Y + T - 1, T, 1, "#D8D2C0");
          if (x % 3 === 1) {
            px(ctx, X, Y + 2, 2, 5, "#EEF0EA");
            px(ctx, X, Y + 9, 2, 5, "#EEF0EA");
          }
          break;
        }
      case CORR:
        {
          const chk = (x + y) % 2;
          px(ctx, X, Y, T, T, chk ? n > 0.5 ? "#EAE3D2" : "#E7E0CE" : n > 0.5 ? "#E4DDCA" : "#E1D9C5");
          px(ctx, X, Y + T - 1, T, 1, "#CFC7B2");
          px(ctx, X + T - 1, Y, 1, T, "#CFC7B2");
          if (hash(x + 3, y + 9) > 0.9) px(ctx, X + (n * 11 | 0) % 12 + 2, Y + (n * 7 | 0) % 12 + 2, 2, 1, "#D2CAB5");
          ao(ctx, x, y, "#B4AC9A");
          break;
        }
      case COURT:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#D28A4E" : "#CC8448");
          if (hash(x + 3, y + 5) > 0.78) px(ctx, X + (n * 17 | 0) % 13 + 1, Y + (n * 11 | 0) % 13 + 1, 2, 1, "#B9713C");
          if (hash(x + 8, y + 2) > 0.9) px(ctx, X + (n * 7 | 0) % 13 + 1, Y + (n * 23 | 0) % 13 + 1, 1, 1, "#E2A468");
          break;
        }
      case PATH:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#C9AC7E" : "#C3A676");
          if (hash(x + 2, y + 6) > 0.68) px(ctx, X + (n * 13 | 0) % 12 + 2, Y + (n * 29 | 0) % 12 + 2, 2, 1, "#A98B62");
          if (hash(x + 7, y + 1) > 0.86) px(ctx, X + (n * 23 | 0) % 12 + 2, Y + (n * 5 | 0) % 12 + 2, 1, 1, "#DCC392");
          if (g(x, y - 1) !== PATH && g(x, y - 1) !== DOOR && g(x, y - 1) !== SAND) {
            px(ctx, X, Y, T, 1, "#8A6D4C");
            px(ctx, X, Y + 1, T, 1, "#DCC392");
          }
          if (g(x, y + 1) !== PATH && g(x, y + 1) !== DOOR && g(x, y + 1) !== SAND) px(ctx, X, Y + T - 1, T, 1, "#A9906A");
          break;
        }
      case PLAZA:
        {
          px(ctx, X, Y, T, T, (x + y) % 2 ? "#9A948A" : "#948E84");
          px(ctx, X, Y, T, 1, "#7E786E");
          px(ctx, X, Y, 1, T, "#867F76");
          if (hash(x + 4, y + 9) > 0.84) px(ctx, X + (n * 19 | 0) % 12 + 2, Y + (n * 7 | 0) % 12 + 2, 2, 1, "#B4AEA2");
          break;
        }
      case DECK:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#C09468" : "#BA8E62");
          px(ctx, X, Y + 3, T, 1, "#94704A");
          px(ctx, X, Y + 8, T, 1, "#94704A");
          px(ctx, X, Y + 13, T, 1, "#94704A");
          px(ctx, X, Y + 4, T, 1, "#D8B27E");
          px(ctx, X, Y + 9, T, 1, "#D2AC78");
          if (hash(x + 4, y + 6) > 0.88) px(ctx, X + (n * 13 | 0) % 13 + 1, Y + 5, 1, 1, "#7A5A3C");
          break;
        }
      case SAND:
        {
          px(ctx, X, Y, T, T, n > 0.5 ? "#E8DCB2" : "#E2D6AA");
          if (hash(x + 1, y + 3) > 0.72) px(ctx, X + (n * 19 | 0) % 13 + 1, Y + (n * 7 | 0) % 13 + 1, 2, 1, "#C9BC8E");
          if (hash(x + 6, y + 9) > 0.9) px(ctx, X + (n * 11 | 0) % 13 + 1, Y + (n * 27 | 0) % 13 + 1, 1, 1, "#F6EED2");
          break;
        }
      case WATER:
        {
          px(ctx, X, Y, T, T, "#3F93D6");
          if (hash(x + 4, y + 1) > 0.55) px(ctx, X + (n * 9 | 0) % 10 + 2, Y + (n * 27 | 0) % 10 + 2, 5, 1, "#6FB0E8");
          if (hash(x + 11, y + 6) > 0.62) px(ctx, X + (n * 17 | 0) % 9 + 3, Y + (n * 13 | 0) % 9 + 4, 4, 1, "#2568B0");
          if (hash(x + 13, y + 9) > 0.92) px(ctx, X + (n * 23 | 0) % 11 + 2, Y + (n * 29 | 0) % 11 + 2, 1, 1, "#FFFFFF");
          if (g(x, y - 1) !== WATER) {
            px(ctx, X, Y, T, 2, "#2568B0");
            px(ctx, X, Y, T, 1, "#1B4E8A");
            px(ctx, X, Y + 2, T, 1, "#EEF6FB");
          }
          if (g(x, y + 1) !== WATER) {
            px(ctx, X, Y + T - 2, T, 1, "#EEF6FB");
            px(ctx, X, Y + T - 1, T, 1, "#1B4E8A");
          }
          if (g(x - 1, y) !== WATER) {
            px(ctx, X, Y, 1, T, "#1B4E8A");
            px(ctx, X + 1, Y, 1, T, "#EEF6FB");
          }
          if (g(x + 1, y) !== WATER) {
            px(ctx, X + T - 1, Y, 1, T, "#1B4E8A");
            px(ctx, X + T - 2, Y, 1, T, "#EEF6FB");
          }
          break;
        }
      case POOL:
        {
          px(ctx, X, Y, T, T, "#45A0DE");
          if ((y % 2 === 0) && hash(x + 8, y + 3) > 0.35) px(ctx, X + 2, Y + 6, 12, 1, "#7CC0EE");
          if (hash(x + 2, y + 9) > 0.55) px(ctx, X + (n * 11 | 0) % 10 + 3, Y + (n * 19 | 0) % 10 + 3, 3, 1, "#A6D8F4");
          if (g(x, y - 1) !== POOL) {
            px(ctx, X, Y, T, 2, "#2568B0");
            px(ctx, X, Y, T, 1, "#1B4E8A");
            px(ctx, X, Y + 2, T, 1, "#EEF6FB");
          }
          if (g(x, y + 1) !== POOL) {
            px(ctx, X, Y + T - 2, T, 1, "#EEF6FB");
            px(ctx, X, Y + T - 1, T, 1, "#1B4E8A");
          }
          if (g(x - 1, y) !== POOL) {
            px(ctx, X, Y, 1, T, "#1B4E8A");
            px(ctx, X + 1, Y, 1, T, "#EEF6FB");
          }
          if (g(x + 1, y) !== POOL) {
            px(ctx, X + T - 1, Y, 1, T, "#1B4E8A");
            px(ctx, X + T - 2, Y, 1, T, "#EEF6FB");
          }
          break;
        }
      case FLOOR:
        {
          const chk = (x + y) % 2;
          px(ctx, X, Y, T, T, chk ? n > 0.5 ? "#EDE7D6" : "#EAE4D2" : n > 0.5 ? "#E8E1CE" : "#E5DECA");
          px(ctx, X, Y + T - 1, T, 1, "#D6CEB8");
          px(ctx, X + T - 1, Y, 1, T, "#D6CEB8");
          if (hash(x + 8, y + 3) > 0.94) px(ctx, X + (n * 9 | 0) % 12 + 2, Y + (n * 21 | 0) % 12 + 2, 2, 1, "#DAD2BD");
          ao(ctx, x, y, "#B6AE9C");
          break;
        }
      case CARPET:
        {
          if (x >= 29 && x <= 33 && y >= 14 && y <= 20) {
            px(ctx, X, Y, T, T, n > 0.5 ? "#DCCFB4" : "#D7CAAE");
            if ((x + y) % 2) px(ctx, X + 7, Y + 7, 2, 2, "#CBBC9E");
            if (g(x, y - 1) !== CARPET) {
              px(ctx, X, Y, T, 2, "#B9A882");
              for (let i = 2; i < T; i += 4) px(ctx, X + i, Y + 2, 1, 1, "#B9A882");
            }
            if (g(x, y + 1) !== CARPET) {
              px(ctx, X, Y + T - 2, T, 2, "#B9A882");
              for (let i = 2; i < T; i += 4) px(ctx, X + i, Y + T - 3, 1, 1, "#B9A882");
            }
            if (g(x - 1, y) !== CARPET) px(ctx, X, Y, 2, T, "#B9A882");
            if (g(x + 1, y) !== CARPET) px(ctx, X + T - 2, Y, 2, T, "#B9A882");
          } else {
            px(ctx, X, Y, T, T, n > 0.5 ? "#C9DEC0" : "#C3D8BA");
            if (g(x, y - 1) !== CARPET) px(ctx, X, Y, T, 1, "#A8C6A0");
            if (g(x, y + 1) !== CARPET) px(ctx, X, Y + T - 1, T, 1, "#A8C6A0");
            if (g(x - 1, y) !== CARPET) px(ctx, X, Y, 1, T, "#A8C6A0");
            if (g(x + 1, y) !== CARPET) px(ctx, X + T - 1, Y, 1, T, "#A8C6A0");
            if ((x + y) % 2) px(ctx, X + 7, Y + 7, 2, 2, "#A8C6A0");
          }
          ao(ctx, x, y, "#A2B2A4");
          break;
        }
      case WALL:
        {
          px(ctx, X, Y, T, T, "#D5CBB4");
          if (wallish(g(x, y - 1))) {
            px(ctx, X + 2, Y + 5, 1, 1, "#C6BCA6");
            px(ctx, X + 9, Y + 11, 1, 1, "#C6BCA6");
            px(ctx, X + 5, Y + 8, 2, 1, "#E2D9C4");
          } else {
            px(ctx, X, Y, T, 4, "#7E7262");
            px(ctx, X, Y, T, 1, "#262A36");
            px(ctx, X, Y + 1, T, 1, "#968872");
            px(ctx, X, Y + 4, T, 1, "#EAE2CE");
          }
          const fs = g(x, y + 1);
          if (fs === FLOOR || fs === CORR || fs === CARPET || fs === ATRIUM || fs === LOBBY || fs === DOOR) {
            px(ctx, X, Y + T - 3, T, 1, "#262A36");
            px(ctx, X, Y + T - 2, T, 2, "#A29478");
            px(ctx, X, Y + T - 1, T, 1, "#8E8068");
          } else if (!wallish(fs)) {
            px(ctx, X, Y + T - 2, T, 2, "#7E7262");
            px(ctx, X, Y + T - 1, T, 1, "#262A36");
          }
          if (!wallish(g(x - 1, y))) px(ctx, X, Y, 1, T, "#262A36");
          if (!wallish(g(x + 1, y))) px(ctx, X + T - 1, Y, 1, T, "#262A36");
          break;
        }
      case GLASS:
        {
          px(ctx, X, Y, T, T, "#4E7EC0");
          px(ctx, X, Y, T, 2, "#9CC6E8");
          px(ctx, X + 5, Y, 1, T, "#2E5490");
          px(ctx, X + 10, Y, 1, T, "#2E5490");
          px(ctx, X, Y + T - 2, T, 2, "#2E5490");
          px(ctx, X, Y + T - 1, T, 1, "#20304E");
          if (g(x - 1, y) !== GLASS) px(ctx, X, Y, 1, T, "#20304E");
          if (g(x + 1, y) !== GLASS) px(ctx, X + T - 1, Y, 1, T, "#20304E");
          if (hash(x + 6, y + 2) > 0.6) {
            const gx = X + 2 + (n * 7 | 0) % 4;
            px(ctx, gx + 4, Y + 3, 2, 2, "rgba(255,255,255,0.6)");
            px(ctx, gx + 2, Y + 5, 2, 2, "rgba(255,255,255,0.55)");
            px(ctx, gx, Y + 7, 2, 2, "rgba(255,255,255,0.5)");
          }
          break;
        }
      case ROOF:
        {
          px(ctx, X, Y, T, T, "#4F7FD0");
          break;
        }
      case DOOR:
        {
          px(ctx, X, Y, T, T, "#EAE2CE");
          px(ctx, X + 1, Y, T - 2, 3, "#6E4A26");
          px(ctx, X + 1, Y, T - 2, 1, "#262A36");
          px(ctx, X + 2, Y + 1, 3, 1, "#9A6E3E");
          break;
        }
    }
  }
  function drawTree(ctx, x, y) {
    const X = x * T,
      Y = y * T,
      n = hash(x, y);
    const OL = "#1F4A1C",
      DK = "#2E6E2A",
      MID = n > 0.5 ? "#3F8A34" : "#3C8531",
      LT = n > 0.5 ? "#63B04A" : "#5EAB46",
      HI = "#8CCB6D",
      GL = "#C8ECAA";
    const big = tx => hash(tx * 13 + 5, y * 17 + 3) < 0.12 && tx % 4 === 0 && g(tx + 1, y) === TREE;
    if (x % 4 === 1 && g(x - 1, y) === TREE && big(x - 1)) return;
    if (big(x)) {
      px(ctx, X - 2, Y + 12, 22, 3, "rgba(28,42,68,0.24)");
      px(ctx, X + 5, Y + 7, 7, 8, "#3A2410");
      px(ctx, X + 6, Y + 7, 5, 7, "#5C3E20");
      px(ctx, X + 7, Y + 7, 2, 7, "#7A5A3C");
      px(ctx, X + 4, Y - 6, 8, 1, OL);
      px(ctx, X + 1, Y - 5, 14, 1, OL);
      px(ctx, X - 2, Y - 4, 20, 1, OL);
      px(ctx, X - 3, Y - 3, 22, 11, OL);
      px(ctx, X - 2, Y + 8, 20, 1, OL);
      px(ctx, X + 1, Y + 9, 14, 1, OL);
      px(ctx, X + 5, Y - 5, 6, 1, MID);
      px(ctx, X + 2, Y - 4, 12, 1, MID);
      px(ctx, X - 1, Y - 3, 18, 1, MID);
      px(ctx, X - 2, Y - 2, 20, 9, MID);
      px(ctx, X - 1, Y + 7, 18, 1, DK);
      px(ctx, X + 2, Y + 8, 12, 1, DK);
      px(ctx, X + 5, Y - 5, 4, 1, LT);
      px(ctx, X + 2, Y - 4, 8, 1, LT);
      px(ctx, X - 1, Y - 3, 9, 2, LT);
      px(ctx, X - 2, Y - 1, 6, 5, LT);
      px(ctx, X + 6, Y - 2, 4, 3, LT);
      px(ctx, X + 3, Y - 4, 3, 1, HI);
      px(ctx, X, Y - 2, 3, 2, HI);
      px(ctx, X + 11, Y + 1, 8, 6, DK);
      px(ctx, X + 3, Y + 5, 12, 2, DK);
      px(ctx, X + 13, Y - 2, 4, 2, LT);
      px(ctx, X + 4, Y - 3, 2, 1, GL);
      px(ctx, X + 8, Y - 5, 2, 1, GL);
      return;
    }
    if (hash(x * 7 + 11, y * 5 + 2) > 0.42) {
      px(ctx, X + 3, Y + 13, 10, 2, "rgba(28,42,68,0.2)");
      px(ctx, X + 7, Y + 10, 2, 4, "#5C3E20");
      px(ctx, X + 6, Y + 2, 4, 1, OL);
      px(ctx, X + 4, Y + 3, 8, 1, OL);
      px(ctx, X + 2, Y + 4, 12, 8, OL);
      px(ctx, X + 4, Y + 12, 8, 1, OL);
      px(ctx, X + 6, Y + 3, 4, 1, MID);
      px(ctx, X + 5, Y + 4, 6, 1, MID);
      px(ctx, X + 3, Y + 5, 10, 6, MID);
      px(ctx, X + 5, Y + 11, 6, 1, DK);
      px(ctx, X + 6, Y + 3, 3, 1, LT);
      px(ctx, X + 5, Y + 4, 4, 1, LT);
      px(ctx, X + 3, Y + 5, 4, 3, LT);
      px(ctx, X + 6, Y + 4, 2, 1, HI);
      px(ctx, X + 9, Y + 8, 4, 3, DK);
      px(ctx, X + 4, Y + 10, 8, 1, DK);
      px(ctx, X + 5, Y + 5, 2, 1, GL);
      return;
    }
    px(ctx, X + 2, Y + 13, 12, 2, "rgba(28,42,68,0.22)");
    px(ctx, X + 5, Y + 9, 6, 6, "#3A2410");
    px(ctx, X + 6, Y + 9, 4, 5, "#5C3E20");
    px(ctx, X + 7, Y + 9, 1, 5, "#7A5A3C");
    px(ctx, X + 6, Y - 2, 4, 1, OL);
    px(ctx, X + 4, Y - 1, 8, 1, OL);
    px(ctx, X + 3, Y, 10, 1, OL);
    px(ctx, X + 2, Y + 1, 12, 10, OL);
    px(ctx, X + 3, Y + 11, 10, 1, OL);
    px(ctx, X + 6, Y - 1, 4, 1, MID);
    px(ctx, X + 4, Y, 8, 1, MID);
    px(ctx, X + 3, Y + 1, 10, 9, MID);
    px(ctx, X + 4, Y + 10, 8, 1, DK);
    px(ctx, X + 6, Y - 1, 3, 1, LT);
    px(ctx, X + 4, Y, 5, 1, LT);
    px(ctx, X + 3, Y + 1, 4, 4, LT);
    px(ctx, X + 8, Y + 1, 3, 2, LT);
    px(ctx, X + 5, Y, 2, 1, HI);
    px(ctx, X + 3, Y + 2, 2, 2, HI);
    px(ctx, X + 9, Y + 5, 4, 5, DK);
    px(ctx, X + 4, Y + 8, 4, 2, DK);
    px(ctx, X + 5, Y + 1, 2, 1, GL);
    if (hash(x * 3 + 1, y * 11 + 4) > 0.93) {
      px(ctx, X + 5, Y + 3, 2, 2, "#F2A6C6");
      px(ctx, X + 10, Y + 2, 2, 2, "#F2A6C6");
      px(ctx, X + 8, Y + 6, 2, 2, "#F2A6C6");
      px(ctx, X + 5, Y + 3, 1, 1, "#FFCFE0");
      px(ctx, X + 10, Y + 2, 1, 1, "#FFCFE0");
    }
  }
  function drawHedge(ctx, x, y) {
    const X = x * T,
      Y = y * T;
    px(ctx, X + 1, Y + 13, 14, 2, "rgba(28,42,68,0.18)");
    px(ctx, X + 2, Y + 3, 12, 1, "#1F4A1C");
    px(ctx, X + 1, Y + 4, 14, 9, "#1F4A1C");
    px(ctx, X + 2, Y + 13, 12, 1, "#1F4A1C");
    px(ctx, X + 3, Y + 4, 10, 1, "#3F8A34");
    px(ctx, X + 2, Y + 5, 12, 7, "#3F8A34");
    px(ctx, X + 3, Y + 12, 10, 1, "#2E6E2A");
    px(ctx, X + 3, Y + 4, 6, 1, "#63B04A");
    px(ctx, X + 2, Y + 5, 4, 2, "#63B04A");
    px(ctx, X + 8, Y + 5, 4, 1, "#63B04A");
    px(ctx, X + 3, Y + 5, 2, 1, "#8CCB6D");
    px(ctx, X + 9, Y + 9, 5, 3, "#2E6E2A");
    px(ctx, X + 3, Y + 10, 4, 2, "#2E6E2A");
    px(ctx, X + 4, Y + 5, 2, 1, "#C8ECAA");
  }
  function drawFlower(ctx, x, y) {
    const X = x * T,
      Y = y * T,
      n = hash(x * 5, y * 3);
    const c = n > 0.66 ? "#F2D06B" : n > 0.33 ? "#F2A6C6" : "#F8F6EC";
    const o = shade(c, -70),
      hl = shade(c, 26),
      ce = shade(c, -26);
    px(ctx, X + 5, Y + 11, 1, 2, "#2E6E2A");
    px(ctx, X + 6, Y + 12, 2, 1, "#57A03E");
    px(ctx, X + 4, Y + 6, 3, 1, o);
    px(ctx, X + 4, Y + 10, 3, 1, o);
    px(ctx, X + 3, Y + 7, 1, 3, o);
    px(ctx, X + 7, Y + 7, 1, 3, o);
    px(ctx, X + 4, Y + 7, 3, 3, c);
    px(ctx, X + 4, Y + 7, 1, 1, hl);
    px(ctx, X + 5, Y + 8, 1, 1, ce);
    px(ctx, X + 10, Y + 7, 1, 2, "#2E6E2A");
    px(ctx, X + 10, Y + 3, 2, 1, o);
    px(ctx, X + 10, Y + 6, 2, 1, o);
    px(ctx, X + 9, Y + 4, 1, 2, o);
    px(ctx, X + 12, Y + 4, 1, 2, o);
    px(ctx, X + 10, Y + 4, 2, 2, c);
    px(ctx, X + 10, Y + 4, 1, 1, hl);
  }
  function drawFurniture(ctx, f) {
    const X = f.x * T,
      Y = f.y * T;
    const n = hash(f.x * 7, f.y * 5);
    if (GROUND_SHADOW.has(f.kind)) px(ctx, X + 2, Y + 13, 12, 2, "rgba(28,42,68,0.18)");
    switch (f.kind) {
      case "desk":
        px(ctx, X + 2, Y + 3, 12, 1, "#794A18");
        px(ctx, X, Y + 4, 16, 9, "#794A18");
        px(ctx, X + 2, Y + 13, 12, 1, "#794A18");
        px(ctx, X + 1, Y + 4, 14, 9, "#B0814F");
        px(ctx, X + 1, Y + 4, 14, 2, "#CA9961");
        px(ctx, X + 1, Y + 11, 14, 2, "#80582F");
        px(ctx, X + 3, Y + 3, 8, 8, "#161D26");
        px(ctx, X + 4, Y + 4, 6, 6, "#26303C");
        px(ctx, X + 5, Y + 5, 4, 3, "#83DEAC");
        px(ctx, X + 5, Y + 5, 2, 1, "#F2FFF7");
        px(ctx, X + 11, Y + 8, 3, 2, "#EFE5D4");
        px(ctx, X + 11, Y + 10, 3, 1, "#D6CBB4");
        break;
      case "table":
        px(ctx, X + 2, Y + 3, 12, 1, "#4A2F12");
        px(ctx, X + 1, Y + 4, 14, 9, "#4A2F12");
        px(ctx, X + 2, Y + 13, 12, 1, "#4A2F12");
        px(ctx, X + 2, Y + 4, 12, 9, "#B98F62");
        px(ctx, X + 2, Y + 4, 12, 2, "#D0A674");
        px(ctx, X + 2, Y + 11, 12, 2, "#8A6038");
        px(ctx, X + 6, Y + 7, 4, 3, "#EDE6D6");
        px(ctx, X + 6, Y + 7, 2, 1, "#FFFFFF");
        break;
      case "patio":
        {
          const cn = n > 0.5 ? "#E66A5C" : "#00B14F";
          const co = shade(cn, -62);
          const cs = n > 0.5 ? "#C9554A" : "#03A249";
          px(ctx, X + 3, Y + 8, 10, 7, "#4A2F12");
          px(ctx, X + 4, Y + 9, 8, 5, "#B98F62");
          px(ctx, X + 4, Y + 9, 8, 1, "#D0A674");
          px(ctx, X + 4, Y + 13, 8, 1, "#8A6038");
          px(ctx, X + 7, Y + 1, 2, 9, "#8A7A63");
          px(ctx, X + 8, Y + 2, 1, 8, "#6B5C47");
          px(ctx, X + 2, Y, 12, 1, co);
          px(ctx, X + 1, Y + 1, 14, 4, co);
          px(ctx, X + 2, Y + 5, 12, 1, co);
          px(ctx, X + 2, Y + 1, 12, 3, cn);
          px(ctx, X + 2, Y + 1, 12, 1, shade(cn, 30));
          px(ctx, X + 3, Y + 4, 10, 1, cs);
          px(ctx, X + 3, Y + 1, 2, 1, "rgba(255,255,255,0.75)");
          break;
        }
      case "shelf":
        px(ctx, X + 2, Y, 12, 1, "#33200D");
        px(ctx, X + 1, Y + 1, 14, 13, "#33200D");
        px(ctx, X + 2, Y + 14, 12, 1, "#33200D");
        px(ctx, X + 2, Y + 1, 12, 13, "#9C7142");
        px(ctx, X + 2, Y + 1, 12, 1, "#B5895A");
        px(ctx, X + 13, Y + 2, 1, 12, "#7A5630");
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
        px(ctx, X + 7, Y + 2, 1, 1, "#DCE9F8");
        break;
      case "bench":
        px(ctx, X + 2, Y + 5, 12, 1, "#3E2812");
        px(ctx, X + 1, Y + 6, 1, 4, "#3E2812");
        px(ctx, X + 14, Y + 6, 1, 4, "#3E2812");
        px(ctx, X + 2, Y + 10, 12, 1, "#3E2812");
        px(ctx, X + 2, Y + 6, 12, 4, "#A8814F");
        px(ctx, X + 2, Y + 6, 12, 1, "#C09A66");
        px(ctx, X + 2, Y + 9, 12, 1, "#8A6038");
        px(ctx, X + 3, Y + 11, 2, 3, "#5A3D24");
        px(ctx, X + 11, Y + 11, 2, 3, "#5A3D24");
        px(ctx, X + 3, Y + 11, 1, 3, "#6E4C2E");
        break;
      case "plant":
        px(ctx, X + 4, Y + 9, 8, 6, "#6E3D1C");
        px(ctx, X + 5, Y + 10, 6, 4, "#B5703F");
        px(ctx, X + 5, Y + 10, 1, 4, "#CE8A52");
        px(ctx, X + 6, Y, 4, 1, "#1F4A1C");
        px(ctx, X + 5, Y + 1, 6, 2, "#1F4A1C");
        px(ctx, X + 3, Y + 2, 10, 8, "#1F4A1C");
        px(ctx, X + 6, Y + 1, 4, 3, "#63B04A");
        px(ctx, X + 4, Y + 3, 8, 6, "#3F8A34");
        px(ctx, X + 5, Y + 3, 3, 2, "#8CCB6D");
        px(ctx, X + 9, Y + 6, 3, 3, "#2E6E2A");
        px(ctx, X + 6, Y + 1, 2, 1, "#C8ECAA");
        break;
      case "coffee":
        px(ctx, X + 2, Y + 2, 12, 1, "#3A342E");
        px(ctx, X + 1, Y + 3, 14, 10, "#3A342E");
        px(ctx, X + 2, Y + 13, 12, 1, "#3A342E");
        px(ctx, X + 2, Y + 3, 12, 10, "#5C5650");
        px(ctx, X + 2, Y + 3, 12, 1, "#736C64");
        px(ctx, X + 2, Y + 12, 12, 1, "#4A443E");
        px(ctx, X + 3, Y + 5, 4, 6, "#3A3531");
        px(ctx, X + 3, Y + 5, 2, 1, "#EAF6EF");
        px(ctx, X + 9, Y + 5, 4, 4, "#C9A07E");
        px(ctx, X + 9, Y + 8, 4, 1, "#A67F5C");
        px(ctx, X + 10, Y + 10, 2, 2, "#F4F1E6");
        break;
      case "whiteboard":
        px(ctx, X + 1, Y, 14, 1, "#3E3222");
        px(ctx, X, Y + 1, 16, 11, "#3E3222");
        px(ctx, X + 1, Y + 12, 14, 1, "#3E3222");
        px(ctx, X + 1, Y + 2, 14, 9, "#F7F5EE");
        px(ctx, X + 1, Y + 2, 14, 1, "#FFFFFF");
        px(ctx, X + 1, Y + 10, 14, 1, "#E2DECF");
        px(ctx, X + 3, Y + 4, 6, 1, "#5FA86A");
        px(ctx, X + 3, Y + 6, 8, 1, "#4D86C9");
        px(ctx, X + 3, Y + 8, 5, 1, "#D9514E");
        break;
      case "server":
        px(ctx, X + 4, Y + 1, 8, 1, "#232833");
        px(ctx, X + 3, Y + 2, 10, 12, "#232833");
        px(ctx, X + 4, Y + 3, 8, 10, "#3E4450");
        px(ctx, X + 4, Y + 3, 8, 1, "#525A6A");
        px(ctx, X + 11, Y + 4, 1, 9, "#2E3440");
        px(ctx, X + 5, Y + 4, 2, 2, "#7FD9A8");
        px(ctx, X + 9, Y + 4, 2, 2, "#E5C46B");
        px(ctx, X + 5, Y + 4, 1, 1, "#EFFFF5");
        px(ctx, X + 5, Y + 8, 6, 1, "#566074");
        px(ctx, X + 5, Y + 11, 6, 1, "#566074");
        break;
      case "bike":
        {
          const frame = n > 0.75 ? "#4D6BFE" : n > 0.5 ? "#E66A5C" : n > 0.25 ? "#00B14F" : "#E5C46B";
          px(ctx, X + 2, Y + 9, 5, 5, "#2E3440");
          px(ctx, X + 9, Y + 9, 5, 5, "#2E3440");
          px(ctx, X + 2, Y + 13, 5, 1, "#232833");
          px(ctx, X + 9, Y + 13, 5, 1, "#232833");
          px(ctx, X + 6, Y + 9, 1, 5, "#232833");
          px(ctx, X + 13, Y + 9, 1, 5, "#232833");
          px(ctx, X + 3, Y + 9, 3, 1, "#454E60");
          px(ctx, X + 10, Y + 9, 3, 1, "#454E60");
          px(ctx, X + 3, Y + 10, 3, 3, "#79B97E");
          px(ctx, X + 10, Y + 10, 3, 3, "#79B97E");
          px(ctx, X + 4, Y + 6, 8, 1, shade(frame, -60));
          px(ctx, X + 4, Y + 7, 8, 2, frame);
          px(ctx, X + 4, Y + 7, 8, 1, shade(frame, 26));
          px(ctx, X + 4, Y + 4, 2, 4, frame);
          px(ctx, X + 10, Y + 4, 2, 4, frame);
          px(ctx, X + 4, Y + 4, 1, 4, shade(frame, 26));
          px(ctx, X + 11, Y + 4, 1, 4, shade(frame, -40));
          px(ctx, X + 3, Y + 3, 4, 2, "#3A3531");
          px(ctx, X + 10, Y + 3, 3, 2, "#3A3531");
          px(ctx, X + 3, Y + 3, 4, 1, "#57504A");
          px(ctx, X + 5, Y + 7, 1, 1, "rgba(255,255,255,0.8)");
          break;
        }
      case "hoop":
        {
          px(ctx, X + 7, Y + 4, 2, 11, "#3A3F4A");
          px(ctx, X + 7, Y + 4, 1, 11, "#4A5160");
          px(ctx, X + 8, Y + 5, 1, 10, "#262B34");
          px(ctx, X + 3, Y, 10, 1, "#1C2026");
          px(ctx, X + 2, Y + 1, 12, 5, "#1C2026");
          px(ctx, X + 3, Y + 6, 10, 1, "#1C2026");
          px(ctx, X + 3, Y + 1, 10, 5, "#F7F5EE");
          px(ctx, X + 3, Y + 1, 10, 1, "#FFFFFF");
          px(ctx, X + 6, Y + 3, 4, 2, "#E0685C");
          px(ctx, X + 5, Y + 6, 6, 1, "#E0685C");
          px(ctx, X + 5, Y + 6, 2, 1, "#F2897A");
          px(ctx, X + 5, Y + 7, 6, 1, "#B84A40");
          break;
        }
      case "pullupbar":
        {
          px(ctx, X + 2, Y + 1, 12, 1, "#262B34");
          px(ctx, X + 2, Y + 2, 12, 2, "#3A3F4A");
          px(ctx, X + 3, Y + 2, 9, 1, "#9AA0AC");
          px(ctx, X + 4, Y + 2, 2, 1, "#D8DEE8");
          px(ctx, X + 2, Y + 4, 2, 10, "#3A3F4A");
          px(ctx, X + 12, Y + 4, 2, 10, "#3A3F4A");
          px(ctx, X + 2, Y + 4, 1, 10, "#6E7686");
          px(ctx, X + 3, Y + 4, 1, 10, "#262B34");
          px(ctx, X + 12, Y + 4, 1, 10, "#6E7686");
          px(ctx, X + 13, Y + 4, 1, 10, "#262B34");
          break;
        }
      case "benchpress":
        {
          px(ctx, X + 2, Y + 6, 12, 1, "#1C2026");
          px(ctx, X + 2, Y + 7, 12, 4, "#2A2E36");
          px(ctx, X + 3, Y + 8, 10, 2, "#C24A40");
          px(ctx, X + 3, Y + 8, 10, 1, "#E0685C");
          px(ctx, X + 4, Y + 11, 2, 3, "#1C2026");
          px(ctx, X + 10, Y + 11, 2, 3, "#1C2026");
          px(ctx, X + 1, Y + 3, 2, 6, "#3A3F4A");
          px(ctx, X + 13, Y + 3, 2, 6, "#3A3F4A");
          px(ctx, X + 1, Y + 4, 14, 2, "#3A3F4A");
          px(ctx, X + 2, Y + 4, 12, 1, "#9AA0AC");
          px(ctx, X + 3, Y + 4, 2, 1, "#D8DEE8");
          px(ctx, X + 0, Y + 3, 2, 5, "#1C2026");
          px(ctx, X + 14, Y + 3, 2, 5, "#1C2026");
          px(ctx, X + 0, Y + 3, 1, 1, "#454C5A");
          px(ctx, X + 14, Y + 3, 1, 1, "#454C5A");
          break;
        }
      case "treadmill":
        {
          px(ctx, X + 3, Y + 5, 10, 1, "#1C2026");
          px(ctx, X + 2, Y + 6, 12, 9, "#2A2E36");
          px(ctx, X + 2, Y + 6, 1, 9, "#1C2026");
          px(ctx, X + 13, Y + 6, 1, 9, "#1C2026");
          px(ctx, X + 2, Y + 14, 12, 1, "#1C2026");
          px(ctx, X + 3, Y + 7, 10, 7, "#566074");
          px(ctx, X + 3, Y + 7, 10, 1, "#6B7690");
          px(ctx, X + 3, Y + 9, 10, 1, "#3A3F4A");
          px(ctx, X + 3, Y + 12, 10, 1, "#3A3F4A");
          px(ctx, X + 3, Y + 2, 2, 5, "#3A3F4A");
          px(ctx, X + 3, Y + 2, 6, 2, "#3A3F4A");
          px(ctx, X + 4, Y + 2, 4, 1, "#7FD9A8");
          px(ctx, X + 4, Y + 2, 1, 1, "#EAFFF3");
          break;
        }
      case "dumbbells":
        {
          px(ctx, X + 1, Y + 6, 14, 1, "#3E2812");
          px(ctx, X + 1, Y + 7, 14, 3, "#5A3D24");
          px(ctx, X + 1, Y + 8, 14, 1, "#9C7142");
          px(ctx, X + 1, Y + 10, 14, 1, "#3E2812");
          px(ctx, X + 2, Y + 10, 2, 4, "#5A3D24");
          px(ctx, X + 12, Y + 10, 2, 4, "#5A3D24");
          px(ctx, X + 2, Y + 10, 1, 4, "#6E4C2E");
          px(ctx, X + 2, Y + 4, 3, 3, "#2A2E36");
          px(ctx, X + 6, Y + 4, 3, 3, "#3A6BD0");
          px(ctx, X + 10, Y + 4, 3, 3, "#C24A40");
          px(ctx, X + 2, Y + 6, 3, 1, "#1C2026");
          px(ctx, X + 6, Y + 6, 3, 1, "#2B4E9C");
          px(ctx, X + 10, Y + 6, 3, 1, "#93342C");
          px(ctx, X + 3, Y + 4, 1, 1, "#8B96A6");
          px(ctx, X + 7, Y + 4, 1, 1, "#B9CBEE");
          px(ctx, X + 11, Y + 4, 1, 1, "#EFB6B0");
          break;
        }
      case "mat":
        {
          px(ctx, X + 2, Y + 3, 12, 1, "#3F3295");
          px(ctx, X + 1, Y + 4, 14, 9, "#3F3295");
          px(ctx, X + 2, Y + 13, 12, 1, "#3F3295");
          px(ctx, X + 2, Y + 4, 12, 9, "#8170E0");
          px(ctx, X + 2, Y + 4, 12, 2, "#9B8BEC");
          px(ctx, X + 2, Y + 11, 12, 2, "#6A5AC8");
          px(ctx, X + 4, Y + 8, 8, 1, "#6A5AC8");
          break;
        }
      case "planterbox":
        {
          px(ctx, X, Y + 8, T, 8, "#ECE8E0");
          px(ctx, X, Y + 8, T, 1, "#F6F2EA");
          px(ctx, X, Y + 15, T, 1, "#BFB9AC");
          px(ctx, X + T - 1, Y + 8, 1, 8, "#DAD4C8");
          px(ctx, X, Y + 2, T, 1, "#7E5930");
          px(ctx, X, Y + 3, T, 6, "#B5895A");
          px(ctx, X, Y + 3, T, 2, "#CA9C69");
          px(ctx, X, Y + 8, T, 1, "#946B40");
          const pg1 = n > 0.5 ? "#3F8A34" : "#57A03E";
          const pg2 = n > 0.5 ? "#63B04A" : "#4E9138";
          px(ctx, X + 1, Y + 1, 5, 5, pg1);
          px(ctx, X + 8, Y, 6, 5, pg2);
          px(ctx, X + 4, Y, 3, 3, pg2);
          px(ctx, X + 10, Y + 2, 3, 3, pg1);
          px(ctx, X + 1, Y + 5, 5, 1, "#2E6E2A");
          px(ctx, X + 8, Y + 4, 6, 1, "#2E6E2A");
          const bc1 = n > 0.5 ? "#F2A6C6" : "#F2D06B";
          const bc2 = n > 0.5 ? "#F8F6EC" : "#F2A6C6";
          px(ctx, X + 5, Y, 2, 1, shade(bc1, -70));
          px(ctx, X + 5, Y + 3, 2, 1, shade(bc1, -70));
          px(ctx, X + 4, Y + 1, 1, 2, shade(bc1, -70));
          px(ctx, X + 7, Y + 1, 1, 2, shade(bc1, -70));
          px(ctx, X + 5, Y + 1, 2, 2, bc1);
          px(ctx, X + 5, Y + 1, 1, 1, shade(bc1, 30));
          px(ctx, X + 12, Y, 2, 1, shade(bc2, -70));
          px(ctx, X + 12, Y + 3, 2, 1, shade(bc2, -70));
          px(ctx, X + 11, Y + 1, 1, 2, shade(bc2, -70));
          px(ctx, X + 14, Y + 1, 1, 2, shade(bc2, -70));
          px(ctx, X + 12, Y + 1, 2, 2, bc2);
          px(ctx, X + 12, Y + 1, 1, 1, shade(bc2, 30));
          break;
        }
      case "sofa":
        {
          px(ctx, X + 2, Y + 13, 28, 2, "rgba(28,42,68,0.18)");
          px(ctx, X + 2, Y + 2, 28, 1, "#7C3A24");
          px(ctx, X + 1, Y + 3, 1, 10, "#7C3A24");
          px(ctx, X + 30, Y + 3, 1, 10, "#7C3A24");
          px(ctx, X + 2, Y + 12, 28, 1, "#7C3A24");
          px(ctx, X + 2, Y + 3, 28, 9, "#C9705A");
          px(ctx, X + 2, Y + 3, 28, 2, "#E08D74");
          px(ctx, X + 2, Y + 10, 28, 2, "#A85742");
          px(ctx, X + 2, Y + 4, 3, 8, "#B4593F");
          px(ctx, X + 27, Y + 4, 3, 8, "#B4593F");
          px(ctx, X + 2, Y + 4, 3, 1, "#D67D62");
          px(ctx, X + 27, Y + 4, 3, 1, "#D67D62");
          px(ctx, X + 11, Y + 6, 1, 5, "#A85742");
          px(ctx, X + 20, Y + 6, 1, 5, "#A85742");
          px(ctx, X + 6, Y + 3, 3, 1, "#F7E3DB");
          px(ctx, X + 4, Y + 13, 2, 2, "#5A3D24");
          px(ctx, X + 26, Y + 13, 2, 2, "#5A3D24");
          break;
        }
      case "lowshelf":
        {
          px(ctx, X + 1, Y + 10, 14, 2, "rgba(28,42,68,0.16)");
          px(ctx, X + 1, Y, 14, 1, "#4A3823");
          px(ctx, X, Y + 1, 16, 9, "#4A3823");
          px(ctx, X + 1, Y + 1, 14, 8, "#9C7142");
          px(ctx, X + 1, Y + 1, 14, 1, "#B5895A");
          px(ctx, X + 1, Y + 8, 14, 1, "#6E4C2E");
          const bcs = ["#D9514E", "#4D86C9", "#5FA86A", "#E59A3C", "#9B6FD0", "#E5C24E"];
          for (let i = 0; i < 4; i++) {
            const bh = 4 + (hash(f.x * 3 + i, f.y + i) * 3 | 0);
            px(ctx, X + 2 + i * 3, Y + 8 - bh, 2, bh, bcs[(f.x + i) % 6]);
          }
          px(ctx, X + 2, Y + 2, 2, 1, "#F2EADC");
          break;
        }
      case "counter":
        {
          px(ctx, X + 1, Y + 11, 14, 2, "rgba(28,42,68,0.16)");
          px(ctx, X + 1, Y + 1, 14, 1, "#4A3823");
          px(ctx, X, Y + 2, 16, 9, "#4A3823");
          px(ctx, X + 1, Y + 2, 14, 8, "#B98F62");
          px(ctx, X + 1, Y + 2, 14, 2, "#D0A674");
          px(ctx, X + 1, Y + 9, 14, 1, "#8A6038");
          px(ctx, X + 3, Y + 4, 3, 3, "#F4F1E6");
          px(ctx, X + 6, Y + 5, 1, 1, "#F4F1E6");
          px(ctx, X + 8, Y + 4, 3, 3, "#EF9BB1");
          px(ctx, X + 11, Y + 5, 1, 1, "#EF9BB1");
          px(ctx, X + 3, Y + 4, 1, 1, "#FFFFFF");
          px(ctx, X + 8, Y + 4, 1, 1, "#FBE4EA");
          break;
        }
      case "crate":
        {
          px(ctx, X + 2, Y + 12, 12, 2, "rgba(28,42,68,0.18)");
          px(ctx, X + 2, Y + 3, 12, 1, "#5A3D24");
          px(ctx, X + 1, Y + 4, 14, 9, "#5A3D24");
          px(ctx, X + 2, Y + 13, 12, 1, "#5A3D24");
          px(ctx, X + 2, Y + 4, 12, 9, "#B0814F");
          px(ctx, X + 2, Y + 4, 12, 2, "#CA9961");
          px(ctx, X + 2, Y + 11, 12, 2, "#80582F");
          px(ctx, X + 2, Y + 7, 12, 1, "#8A6038");
          px(ctx, X + 7, Y + 4, 2, 9, "#8A6038");
          px(ctx, X + 3, Y + 4, 2, 1, "#E2C298");
          break;
        }
      case "planterlow":
        {
          px(ctx, X + 1, Y + 13, 14, 2, "rgba(28,42,68,0.18)");
          px(ctx, X + 2, Y + 7, 12, 1, "#6E7278");
          px(ctx, X + 1, Y + 8, 14, 6, "#6E7278");
          px(ctx, X + 2, Y + 8, 12, 5, "#B8BDC4");
          px(ctx, X + 2, Y + 8, 12, 1, "#D0D4DA");
          px(ctx, X + 2, Y + 12, 12, 1, "#9AA0A8");
          px(ctx, X + 5, Y + 1, 6, 1, "#1F4A1C");
          px(ctx, X + 3, Y + 2, 10, 6, "#1F4A1C");
          px(ctx, X + 4, Y + 2, 8, 5, "#3F8A34");
          px(ctx, X + 4, Y + 2, 4, 2, "#63B04A");
          px(ctx, X + 10, Y + 4, 3, 3, "#2E6E2A");
          px(ctx, X + 5, Y + 2, 2, 1, "#C8ECAA");
          break;
        }
      case "arcade":
        {
          const ac = ["#3FA9F5", "#EF9BB1", "#F2D06B"][(f.x >> 1) % 3];
          px(ctx, X + 3, Y, 10, 1, "#14171B");
          px(ctx, X + 2, Y + 1, 12, 13, "#14171B");
          px(ctx, X + 3, Y + 14, 10, 1, "#14171B");
          px(ctx, X + 3, Y + 1, 10, 13, "#23262B");
          px(ctx, X + 3, Y + 1, 1, 13, "#31353C");
          px(ctx, X + 3, Y + 1, 10, 2, shade(ac, -30));
          px(ctx, X + 4, Y + 1, 4, 1, shade(ac, 20));
          px(ctx, X + 4, Y + 4, 8, 5, "#0E1116");
          px(ctx, X + 5, Y + 5, 6, 3, ac);
          px(ctx, X + 5, Y + 5, 2, 1, "#FFFFFF");
          px(ctx, X + 4, Y + 10, 8, 2, "#3A3F47");
          px(ctx, X + 5, Y + 10, 1, 1, "#E0685C");
          px(ctx, X + 7, Y + 10, 1, 1, "#F2D06B");
          px(ctx, X + 9, Y + 10, 1, 1, "#7FD9A8");
          break;
        }
      case "car":
        {
          const cc = ["#F2F2EE", "#C7CCD2", "#C93B33", "#2E4A78", "#3E4450"][hash(f.x * 13, f.y * 7) * 5 | 0];
          const co = shade(cc, -70);
          px(ctx, X + 2, Y + 12, 28, 3, "rgba(28,42,68,0.2)");
          px(ctx, X + 9, Y + 3, 14, 1, co);
          px(ctx, X + 8, Y + 4, 16, 3, co);
          px(ctx, X + 9, Y + 4, 14, 3, cc);
          px(ctx, X + 10, Y + 4, 5, 3, "#9CC6DE");
          px(ctx, X + 17, Y + 4, 5, 3, "#9CC6DE");
          px(ctx, X + 10, Y + 4, 2, 1, "#E8F6FF");
          px(ctx, X + 3, Y + 6, 26, 1, co);
          px(ctx, X + 2, Y + 7, 28, 5, co);
          px(ctx, X + 3, Y + 12, 26, 1, co);
          px(ctx, X + 3, Y + 7, 26, 5, cc);
          px(ctx, X + 4, Y + 7, 24, 1, shade(cc, 28));
          px(ctx, X + 3, Y + 10, 26, 2, shade(cc, -22));
          px(ctx, X + 6, Y + 11, 5, 4, "#1C2026");
          px(ctx, X + 21, Y + 11, 5, 4, "#1C2026");
          px(ctx, X + 8, Y + 12, 1, 2, "#4A5160");
          px(ctx, X + 23, Y + 12, 1, 2, "#4A5160");
          px(ctx, X + 2, Y + 8, 1, 2, "#F2D06B");
          px(ctx, X + 29, Y + 8, 1, 2, "#E0685C");
          break;
        }
      case "medbed":
        {
          px(ctx, X + 2, Y + 13, 28, 2, "rgba(28,42,68,0.18)");
          px(ctx, X + 2, Y + 4, 28, 1, "#8E969E");
          px(ctx, X + 1, Y + 5, 30, 8, "#8E969E");
          px(ctx, X + 2, Y + 5, 28, 7, "#F7F9FB");
          px(ctx, X + 2, Y + 5, 28, 1, "#FFFFFF");
          px(ctx, X + 2, Y + 11, 28, 1, "#DDE3E8");
          px(ctx, X + 3, Y + 6, 6, 5, "#FFFFFF");
          px(ctx, X + 3, Y + 10, 6, 1, "#DDE3E8");
          px(ctx, X + 9, Y + 6, 1, 5, "#C6CED6");
          px(ctx, X + 14, Y + 6, 15, 6, "#BFD9EA");
          px(ctx, X + 14, Y + 6, 15, 1, "#D7E9F4");
          px(ctx, X + 14, Y + 11, 15, 1, "#9FBFD4");
          px(ctx, X + 20, Y + 8, 5, 1, "#D8150B");
          px(ctx, X + 22, Y + 6, 1, 5, "#D8150B");
          px(ctx, X + 3, Y + 13, 2, 2, "#6E7681");
          px(ctx, X + 27, Y + 13, 2, 2, "#6E7681");
          break;
        }
      case "loctree":
        {
          const OL = "#1F4A1C";
          px(ctx, X + 3, Y + 26, 26, 4, "rgba(28,42,68,0.24)");
          px(ctx, X + 13, Y + 14, 6, 13, "#4A2E14");
          px(ctx, X + 14, Y + 14, 4, 12, "#8A5220");
          px(ctx, X + 15, Y + 14, 1, 12, "#A86A30");
          px(ctx, X + 12, Y - 7, 8, 1, OL);
          px(ctx, X + 8, Y - 6, 16, 1, OL);
          px(ctx, X + 4, Y - 5, 24, 1, OL);
          px(ctx, X + 2, Y - 4, 28, 2, OL);
          px(ctx, X + 1, Y - 2, 30, 14, OL);
          px(ctx, X + 2, Y + 12, 28, 2, OL);
          px(ctx, X + 6, Y + 14, 20, 1, OL);
          px(ctx, X + 12, Y - 6, 8, 1, "#63B04A");
          px(ctx, X + 8, Y - 5, 16, 1, "#63B04A");
          px(ctx, X + 4, Y - 4, 24, 2, "#63B04A");
          px(ctx, X + 2, Y - 2, 28, 13, "#3F8A34");
          px(ctx, X + 3, Y - 2, 12, 6, "#63B04A");
          px(ctx, X + 5, Y - 3, 6, 3, "#8CCB6D");
          px(ctx, X + 13, Y - 6, 5, 1, "#8CCB6D");
          px(ctx, X + 18, Y + 4, 10, 8, "#2E6E2A");
          px(ctx, X + 4, Y + 11, 24, 2, "#2E6E2A");
          px(ctx, X + 7, Y + 14, 18, 1, "#2E6E2A");
          px(ctx, X + 6, Y - 3, 3, 1, "#C8ECAA");
          px(ctx, X + 13, Y - 5, 2, 1, "#C8ECAA");
          [[5, 0], [10, 2], [16, 1], [22, 2], [27, 0]].forEach(([tx, tl]) => {
            px(ctx, X + tx, Y + 12 - tl, 1, 4 + tl, "#F2A6C6");
            px(ctx, X + tx, Y + 15, 1, 2, "#E8557A");
          });
          px(ctx, X + 8, Y + 6, 2, 2, "#F2A6C6");
          px(ctx, X + 24, Y + 2, 2, 2, "#F2A6C6");
          px(ctx, X + 24, Y + 2, 1, 1, "#FFCFE0");
          px(ctx, X + 8, Y + 7, 1, 1, "#E8557A");
          break;
        }
      case "atrium":
        {
          px(ctx, X + 8, Y + 13, 16, 19, "#3A3E44");
          px(ctx, X + 4, Y + 14, 24, 17, "#3A3E44");
          px(ctx, X + 2, Y + 15, 28, 15, "#3A3E44");
          px(ctx, X + 1, Y + 16, 30, 13, "#3A3E44");
          px(ctx, X, Y + 18, 32, 9, "#3A3E44");
          px(ctx, X + 9, Y + 14, 14, 17, "#6E7681");
          px(ctx, X + 5, Y + 15, 22, 15, "#6E7681");
          px(ctx, X + 3, Y + 16, 26, 13, "#6E7681");
          px(ctx, X + 2, Y + 17, 28, 11, "#6E7681");
          px(ctx, X + 1, Y + 19, 30, 7, "#6E7681");
          px(ctx, X + 10, Y + 16, 12, 13, "#17191D");
          px(ctx, X + 7, Y + 17, 18, 11, "#17191D");
          px(ctx, X + 5, Y + 18, 22, 9, "#17191D");
          px(ctx, X + 3, Y + 20, 26, 5, "#17191D");
          px(ctx, X + 5, Y + 19, 2, 1, "#33383F");
          px(ctx, X + 8, Y + 18, 1, 1, "#4A4F55");
          px(ctx, X + 13, Y + 16, 2, 1, "#33383F");
          px(ctx, X + 19, Y + 17, 1, 1, "#4A4F55");
          px(ctx, X + 24, Y + 18, 2, 1, "#33383F");
          px(ctx, X + 27, Y + 20, 1, 1, "#4A4F55");
          px(ctx, X + 26, Y + 23, 2, 1, "#33383F");
          px(ctx, X + 22, Y + 25, 1, 1, "#4A4F55");
          px(ctx, X + 9, Y + 26, 2, 1, "#33383F");
          px(ctx, X + 16, Y + 27, 2, 1, "#4A4F55");
          px(ctx, X + 6, Y + 24, 1, 1, "#33383F");
          px(ctx, X + 11, Y + 19, 10, 7, "#217A3A");
          px(ctx, X + 8, Y + 20, 16, 5, "#217A3A");
          px(ctx, X + 6, Y + 21, 20, 3, "#217A3A");
          px(ctx, X + 9, Y + 21, 2, 1, "#2E9C4C");
          px(ctx, X + 14, Y + 22, 3, 1, "#2E9C4C");
          px(ctx, X + 20, Y + 21, 2, 1, "#2E9C4C");
          px(ctx, X + 12, Y + 24, 2, 1, "#17431F");
          px(ctx, X + 18, Y + 23, 2, 1, "#17431F");
          px(ctx, X + 13, Y + 8, 6, 13, "#4A2E14");
          px(ctx, X + 14, Y + 8, 4, 12, "#8A5220");
          px(ctx, X + 15, Y + 8, 1, 12, "#A86A30");
          px(ctx, X + 12, Y + 19, 1, 2, "#4A2E14");
          px(ctx, X + 19, Y + 19, 1, 2, "#4A2E14");
          px(ctx, X + 6, Y + 15, 1, 5, "#2E9C4C");
          px(ctx, X + 8, Y + 14, 1, 6, "#4FBF6A");
          px(ctx, X + 10, Y + 13, 1, 7, "#2E9C4C");
          px(ctx, X + 12, Y + 13, 1, 7, "#74CE86");
          px(ctx, X + 14, Y + 12, 1, 8, "#2E9C4C");
          px(ctx, X + 17, Y + 12, 1, 8, "#4FBF6A");
          px(ctx, X + 19, Y + 13, 1, 7, "#2E9C4C");
          px(ctx, X + 21, Y + 13, 1, 7, "#74CE86");
          px(ctx, X + 23, Y + 14, 1, 6, "#2E9C4C");
          px(ctx, X + 25, Y + 15, 1, 5, "#4FBF6A");
          px(ctx, X + 27, Y + 16, 1, 4, "#2E9C4C");
          px(ctx, X + 4, Y + 17, 1, 3, "#2E9C4C");
          px(ctx, X + 3, Y + 15, 1, 2, "#2E9C4C");
          px(ctx, X + 28, Y + 17, 1, 3, "#4FBF6A");
          px(ctx, X + 29, Y + 15, 1, 2, "#4FBF6A");
          px(ctx, X + 9, Y + 22, 1, 3, "#4FBF6A");
          px(ctx, X + 13, Y + 23, 1, 3, "#2E9C4C");
          px(ctx, X + 17, Y + 23, 1, 3, "#4FBF6A");
          px(ctx, X + 21, Y + 22, 1, 3, "#2E9C4C");
          px(ctx, X + 24, Y + 21, 1, 3, "#74CE86");
          px(ctx, X + 10, Y - 10, 12, 1, "#17431F");
          px(ctx, X + 6, Y - 9, 20, 2, "#17431F");
          px(ctx, X + 3, Y - 7, 26, 3, "#17431F");
          px(ctx, X + 1, Y - 4, 30, 8, "#17431F");
          px(ctx, X + 3, Y + 4, 26, 3, "#17431F");
          px(ctx, X + 6, Y + 7, 20, 2, "#17431F");
          px(ctx, X + 11, Y + 9, 10, 1, "#17431F");
          px(ctx, X + 11, Y - 9, 10, 1, "#2E9C4C");
          px(ctx, X + 7, Y - 8, 18, 2, "#2E9C4C");
          px(ctx, X + 4, Y - 6, 24, 3, "#2E9C4C");
          px(ctx, X + 2, Y - 3, 28, 6, "#2E9C4C");
          px(ctx, X + 4, Y + 3, 24, 3, "#2E9C4C");
          px(ctx, X + 7, Y + 6, 18, 2, "#2E9C4C");
          px(ctx, X + 12, Y + 8, 8, 1, "#2E9C4C");
          px(ctx, X + 7, Y - 8, 12, 2, "#4FBF6A");
          px(ctx, X + 4, Y - 6, 15, 3, "#4FBF6A");
          px(ctx, X + 2, Y - 3, 13, 4, "#4FBF6A");
          px(ctx, X + 11, Y - 9, 8, 1, "#74CE86");
          px(ctx, X + 8, Y - 8, 7, 2, "#74CE86");
          px(ctx, X + 5, Y - 6, 5, 2, "#74CE86");
          px(ctx, X + 25, Y - 3, 5, 6, "#217A3A");
          px(ctx, X + 21, Y + 3, 7, 3, "#217A3A");
          px(ctx, X + 4, Y + 5, 24, 1, "#217A3A");
          px(ctx, X + 7, Y + 7, 18, 1, "#217A3A");
          px(ctx, X + 12, Y + 8, 8, 1, "#217A3A");
          px(ctx, X + 9, Y - 7, 3, 1, "#E9F5E2");
          px(ctx, X + 14, Y - 9, 2, 1, "#E9F5E2");
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
    {
      const lit = {
        [FLOOR]: "#FBF6EA",
        [CORR]: "#F8F4EA",
        [CARPET]: "#DCE9D8"
      };
      for (let y = 1; y < H - 2; y++) for (let x = 1; x < W - 1; x++) {
        if (g(x, y) !== WALL || x % 3 !== 1) continue;
        if (g(x - 1, y) !== WALL && g(x + 1, y) !== WALL) continue;
        const b1 = lit[g(x, y + 1)];
        if (!b1) continue;
        const X = x * T,
          Y = y * T;
        px(ctx, X + 3, Y + 5, 10, 6, "#20304E");
        px(ctx, X + 4, Y + 6, 8, 4, "#BCDEF0");
        px(ctx, X + 8, Y + 6, 1, 4, "#4E7EC0");
        px(ctx, X + 4, Y + 6, 3, 1, "#F4FAFF");
        px(ctx, X + 4, Y + T + 3, 8, T - 3, b1);
        const b2 = lit[g(x, y + 2)];
        if (b2) px(ctx, X + 3, Y + 2 * T, 10, 9, b2);
      }
    }
    {
      for (const yy of [42, 43]) for (let xx = 42; xx <= 47; xx++) if (g(xx, yy) === PATH) {
        px(ctx, xx * T, yy * T + 3, T, 4, "#EDEFEA");
        px(ctx, xx * T, yy * T + 10, T, 4, "#EDEFEA");
      }
      const DIG = {
        "1": ["010", "110", "010", "010", "111"],
        "2": ["110", "001", "010", "100", "111"],
        "3": ["110", "001", "010", "001", "110"],
        "4": ["101", "101", "111", "001", "001"],
        "5": ["111", "100", "110", "001", "110"],
        "6": ["011", "100", "110", "101", "010"],
        "7": ["111", "001", "010", "010", "010"],
        "8": ["010", "101", "010", "101", "010"],
        "9": ["010", "101", "011", "001", "110"],
        "0": ["010", "101", "101", "101", "010"]
      };
      const bay = (numStr, bx, by) => {
        let dx = bx;
        for (const ch of numStr) {
          const gl = DIG[ch];
          for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (gl[r][c] === "1") px(ctx, dx + c, by + r, 1, 1, "#9BA0A8");
          dx += 4;
        }
      };
      [[11, 1], [14, 2], [17, 3], [20, 4]].forEach(([tx, num]) => bay(String(num), tx * T + 13, 42 * T + 2));
      [[12, 5], [15, 6], [18, 7], [21, 8]].forEach(([tx, num]) => bay(String(num), tx * T + 13, 42 * T + 9));
      [[49, 1], [51, 2], [53, 3], [55, 4], [57, 5], [59, 6]].forEach(([tx, num]) => bay(String(num), tx * T + 13, 42 * T + 2));
      [[50, 7], [53, 8], [56, 9], [59, 10]].forEach(([tx, num]) => bay(String(num), tx * T + 13, 42 * T + 9));
    }
    Object.values(BUILDINGS).forEach(b => {
      const rows = b.rows;
      if (!rows) return;
      for (let x = b.x0; x <= b.x1; x++) {
        px(ctx, x * T, b.y0 * T, T, T, b.roof);
        px(ctx, x * T, b.y0 * T, T, 3, shade(b.roof, 18));
        if (rows === 2) {
          px(ctx, x * T, (b.y0 + 1) * T, T, T, shade(b.roof, -8));
          px(ctx, x * T, (b.y0 + 1) * T + T - 3, T, 3, shade(b.roof, -22));
        } else {
          px(ctx, x * T, b.y0 * T + T - 3, T, 3, shade(b.roof, -22));
        }
      }
      px(ctx, b.x0 * T, b.y0 * T, 2, rows * T, shade(b.roof, 14));
      px(ctx, b.x1 * T + T - 2, b.y0 * T, 2, rows * T, shade(b.roof, -18));
      if (rows === 2) px(ctx, b.x0 * T, (b.y0 + 1) * T, (b.x1 - b.x0 + 1) * T, 1, shade(b.roof, -30));
      if (b.solar) {
        for (let x = b.x0 + 1; x <= b.x1 - 2; x += 2) {
          const sx = x * T + 2,
            sy = b.y0 * T + (rows === 2 ? 5 : 3),
            pw = 2 * T - 8,
            ph = rows === 2 ? T - 4 : T - 8;
          px(ctx, sx, sy, pw, ph, "#2F4666");
          px(ctx, sx, sy, pw, 2, "#4D6B94");
          px(ctx, sx + (pw >> 1), sy, 1, ph, "#22354F");
          px(ctx, sx, sy + (ph >> 1), pw, 1, "#22354F");
          px(ctx, sx, sy, pw, 1, "#1B2A42");
          px(ctx, sx, sy + ph - 1, pw, 1, "#1B2A42");
          px(ctx, sx, sy, 1, ph, "#1B2A42");
          px(ctx, sx + pw - 1, sy, 1, ph, "#1B2A42");
          px(ctx, sx + 2, sy + 3, 2, 1, "#E8F2FC");
        }
      } else if (rows === 2) {
        const gw = (b.x1 - b.x0 + 1) * T - 4;
        px(ctx, b.x0 * T + 2, b.y0 * T + 4, gw, T - 2, "#57A03E");
        px(ctx, b.x0 * T + 2, b.y0 * T + 4, gw, 2, "#6DB24A");
        px(ctx, b.x0 * T + 2, b.y0 * T + T + 1, gw, 1, "#4E9138");
        for (let x = b.x0 + 1; x <= b.x1 - 1; x += 2) {
          px(ctx, x * T + 2, b.y0 * T + 1, 7, 8, "#1F4A1C");
          px(ctx, x * T + 3, b.y0 * T + 3, 5, 5, "#3F8A34");
          px(ctx, x * T + 4, b.y0 * T + 2, 3, 3, "#63B04A");
          px(ctx, x * T + 4, b.y0 * T + 2, 1, 1, "#C8ECAA");
        }
      }
      const rx = b.x0 * T,
        ry = b.y0 * T,
        rw = (b.x1 - b.x0 + 1) * T,
        rh = rows * T,
        rol = shade(b.roof, -48);
      px(ctx, rx, ry, rw, 1, rol);
      px(ctx, rx, ry, 1, rh, rol);
      px(ctx, rx + rw - 1, ry, 1, rh, rol);
      px(ctx, rx, ry + rh - 1, rw, 1, rol);
      px(ctx, rx + 1, ry + rh, rw - 1, 2, "rgba(28,42,68,0.18)");
    });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = g(x, y);
      if (t === FLOWER) drawFlower(ctx, x, y);
      if (t === HEDGE) drawHedge(ctx, x, y);
    }
    {
      const artPal = [["#DCE9F2", "#5E86C4", "#E8B84E"], ["#F7F3E8", "#D9705A", "#F2D06B"], ["#CFE0CC", "#5FA86A", "#2E5638"], ["#F2D06B", "#4A4F55", "#E66A5C"], ["#EF9BB1", "#F7F3E8", "#5E86C4"]];
      [[12, 9], [18, 9], [29, 9], [12, 22], [17, 22]].forEach(([tx, ty], i) => {
        const X = tx * T,
          Y = ty * T,
          p = artPal[i];
        px(ctx, X + 4, Y + 5, 8, 7, "#4A4234");
        px(ctx, X + 5, Y + 6, 6, 5, p[0]);
        px(ctx, X + 5, Y + 8, 6, 3, p[1]);
        px(ctx, X + 7, Y + 6, 2, 3, p[2]);
      });
      for (const tx of [17, 18]) {
        const X = tx * T,
          Y = 24 * T;
        px(ctx, X + 1, Y + 4, 6, 5, "#1C2026");
        px(ctx, X + 2, Y + 5, 4, 3, "#3FA9F5");
        px(ctx, X + 9, Y + 4, 6, 5, "#1C2026");
        px(ctx, X + 10, Y + 5, 4, 3, "#7FD9A8");
        px(ctx, X + 2, Y + 5, 1, 1, "#DCF2FF");
      }
      px(ctx, 16 * T, 28 * T + 4, 4 * T, 8, "#7E8894");
      px(ctx, 16 * T, 28 * T + 4, 4 * T, 1, "#98A2AE");
      px(ctx, 16 * T, 28 * T + 11, 4 * T, 1, "#69727D");
      for (let i = 8; i < 4 * T; i += 12) px(ctx, 16 * T + i, 28 * T + 6, 1, 4, "#98A2AE");
      px(ctx, 41 * T + 2, 27 * T + 1, 3 * T - 4, T - 2, "#B08252");
      px(ctx, 41 * T + 2, 27 * T + 1, 3 * T - 4, 1, "#C89C64");
      px(ctx, 41 * T + 2, 27 * T + T - 2, 3 * T - 4, 1, "#8A6038");
      px(ctx, 41 * T + 2, 27 * T + 1, 1, T - 2, "#8A6038");
      px(ctx, 44 * T - 3, 27 * T + 1, 1, T - 2, "#8A6038");
      px(ctx, 41 * T + 6, 27 * T + 5, 2 * T + 4, 6, "#A07444");
      const pool = (cx, cy) => {
        px(ctx, cx - 8, cy - 3, 16, 7, "#5E5850");
        px(ctx, cx - 6, cy - 2, 12, 5, "#7E786E");
        px(ctx, cx - 3, cy - 1, 6, 3, "#9A948A");
      };
      pool(716, 436);
      pool(768, 436);
    }
    FURNITURE.forEach(f => drawFurniture(ctx, f));
    {
      const pend = (cx, cy) => {
        px(ctx, cx - 1, cy - 15, 2, 9, "#23262B");
        px(ctx, cx - 4, cy - 7, 8, 3, "#3A3E44");
        px(ctx, cx - 4, cy - 7, 8, 1, "#5A6068");
        px(ctx, cx - 2, cy - 4, 4, 1, "#E6B23C");
        px(ctx, cx - 1, cy - 4, 1, 1, "#FFE9A0");
      };
      pend(716, 436);
      pend(768, 436);
    }
    {
      const drawSpot = (tx, ty) => {
        const sx = tx * T,
          sy = ty * T;
        px(ctx, sx + 3, sy + 4, 10, 8, "#E8E4D2");
        px(ctx, sx + 2, sy + 6, 12, 4, "#E8E4D2");
        px(ctx, sx + 5, sy + 3, 6, 10, "#E8E4D2");
        px(ctx, sx + 5, sy + 6, 6, 4, "#F2EFE2");
      };
      drawSpot(40, 15);
      drawSpot(43, 18);
      drawSpot(43, 27);
      drawSpot(46, 28);
    }
    {
      const CX = 4 * T,
        CY = 33 * T,
        CW = 6 * T,
        CH = 6 * T;
      ctx.strokeStyle = "#F0470F";
      ctx.lineWidth = 2;
      ctx.strokeRect(CX + 4, CY + 4, CW - 8, CH - 8);
      ctx.strokeRect(CX + CW / 2 - 12, CY + 4, 24, 22);
      ctx.beginPath();
      ctx.arc(CX + CW / 2, CY + 26, 9, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX + CW / 2, CY + CH - 24, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    {
      px(ctx, 60 * T + 8, 4 * T + 2, 2, 12, "#E8E5DC");
      px(ctx, 60 * T + 13, 4 * T + 2, 2, 12, "#E8E5DC");
      px(ctx, 60 * T + 8, 4 * T + 4, 7, 2, "#E8E5DC");
      px(ctx, 60 * T + 8, 4 * T + 9, 7, 2, "#E8E5DC");
      px(ctx, 60 * T + 9, 4 * T + 2, 1, 12, "#B4AFA2");
      px(ctx, 60 * T + 14, 4 * T + 2, 1, 12, "#B4AFA2");
      for (let lx = 54 * T + 4; lx < 61 * T - 8; lx += 12) {
        px(ctx, lx, 7 * T - 1, 7, 2, "#F4F1E6");
        px(ctx, lx + 7, 7 * T - 1, 5, 2, "#E0685C");
      }
      const dk = "#C49A6C";
      px(ctx, 56 * T, 11 * T, 4, 2, dk);
      px(ctx, 56 * T, 11 * T, 2, 4, dk);
      px(ctx, 58 * T - 4, 11 * T, 4, 2, dk);
      px(ctx, 58 * T - 2, 11 * T, 2, 4, dk);
      px(ctx, 56 * T, 13 * T - 2, 4, 2, dk);
      px(ctx, 56 * T, 13 * T - 4, 2, 4, dk);
      px(ctx, 58 * T - 4, 13 * T - 2, 4, 2, dk);
      px(ctx, 58 * T - 2, 13 * T - 4, 2, 4, dk);
    }
    {
      const F5 = {
        W: ["101", "101", "101", "111", "101"],
        E: ["111", "100", "110", "100", "111"],
        A: ["010", "101", "111", "101", "101"],
        R: ["110", "101", "110", "101", "101"],
        V: ["101", "101", "101", "101", "010"],
        N: ["101", "111", "111", "101", "101"],
        G: ["111", "100", "101", "101", "111"]
      };
      const msg = "WE ARE VNG";
      const sc = 2;
      let tw = 0;
      for (const ch of msg) tw += (ch === " " ? 2 : 4) * sc;
      tw -= sc;
      let lx = Math.round(45 * T - tw / 2);
      const ly = 30 * T + 3;
      for (const ch of msg) {
        if (ch === " ") {
          lx += 2 * sc;
          continue;
        }
        const gl = F5[ch];
        for (let ry = 0; ry < 5; ry++) for (let rx = 0; rx < 3; rx++) if (gl[ry][rx] === "1") {
          px(ctx, lx + rx * sc + 1, ly + ry * sc + 1, sc, sc, "#A80E08");
          px(ctx, lx + rx * sc, ly + ry * sc, sc, sc, "#D8150B");
        }
        lx += 4 * sc;
      }
    }
    {
      ctx.strokeStyle = "#A98B62";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(6 * T, 26 * T, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#F2EADC";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(6 * T, 26 * T, 33, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    {
      const fx = 8 * T;
      px(ctx, fx, 24 * T + 2, 3, 9, "#FF7A21");
      px(ctx, fx, 24 * T + 11, 3, 9, "#00A651");
      px(ctx, fx, 24 * T + 20, 3, 9, "#D8150B");
      px(ctx, fx, 27 * T + 2, 3, 4, "#FF7A21");
      px(ctx, fx, 27 * T + 6, 3, 4, "#00A651");
      px(ctx, fx, 27 * T + 10, 3, 4, "#D8150B");
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
  const LOGO_GLYPHS = {
    Z: { top: 0, rows: ["111111111", "111111111", "111111111", ".....1111", "....1111.", "...1111..", "..1111...", ".1111....", "1111.....", "111111111", "111111111", "111111111"] },
    a: { top: 2, rows: ["..1111.11", ".11111.11", "111111111", "111...111", "111...111", "111...111", "111...111", "111111111", ".11111111", "..1111111"] },
    l: { top: 0, rows: ["111", "111", "111", "111", "111", "111", "111", "111", "111", "111", "111", "111"] },
    o: { top: 2, rows: ["..11111..", ".1111111.", "111111111", "111...111", "111...111", "111...111", "111...111", "111111111", ".1111111.", "..11111.."] },
    P: { top: 0, rows: ["1111111.", "11111111", "111..111", "111..111", "111..111", "11111111", "1111111.", "111.....", "111.....", "111.....", "111.....", "111....."] },
    y: { top: 2, rows: ["111...111", "111...111", "111...111", "111...111", "111...111", "111...111", "111111111", ".11111111", "......111", ".1111111.", ".111111.."] },
    V: { top: 0, rows: ["111.....111","111.....111",".111...111.",".111...111.",".111...111.","..111.111..","..111.111..","...11111...","...11111...","...11111...","....111....","....111...."] },
    N: { top: 0, rows: ["111...111","1111..111","1111..111","11111.111","11111.111","111.11111","111.11111","111..1111","111..1111","111...111","111...111","111...111"] },
    G: { top: 0, rows: [".1111111.","111111111","111111111","111......","111......","111.11111","111.11111","111...111","111...111","111111111","111111111",".1111111."] },
    R: { top: 0, rows: ["11111111.","111...111","111...111","111...111","11111111.","111.111..","111..111.","111...111","111...111","111...111","111...111","111...111"] },
    E: { top: 0, rows: [".11111111","111111111","111111111","111......","111......","111111...","111111...","111......","111......","111111111","111111111",".11111111"] },
    E3: { top: 0, rows: ["111111111","111111111","111111111",".........",".........","111111111","111111111",".........",".........","111111111","111111111","111111111"] },
    O: { top: 0, rows: [".1111111.","111111111","111111111","111...111","111...111","111...111","111...111","111...111","111...111","111111111","111111111",".1111111."] },
    Odot: { top: 0, rows: [".1111111.","111111111","111111111","111...111","111222111","111222111","111222111","111222111","111...111","111111111","111111111",".1111111."] },
    D: { top: 0, rows: [".111111..","1111111..","111111111","111...111","111...111","111...111","111...111","111...111","111...111","111111111","1111111..",".111111.."] }
  };
  function stampWordSeg(ctx, keys, x0, y0, sc, pal) {
    const glyphs = keys.map(k => LOGO_GLYPHS[k]);
    const gap = 1;
    let w = 0;
    glyphs.forEach((gl, i) => {
      w += gl.rows[0].length * sc + (i ? gap : 0);
    });
    px(ctx, x0 - 1, y0 + 12 * sc + 2, w + 2, 2, "rgba(35,38,43,0.22)");
    const stamp = (dx, dy, color) => {
      let gx = x0;
      glyphs.forEach(gl => {
        const gw = gl.rows[0].length;
        gl.rows.forEach((row, r) => {
          for (let c = 0; c < gw; c++) if (row[c] === "1") px(ctx, gx + c * sc + dx, y0 + (gl.top + r) * sc + dy, sc, sc, color);
        });
        gx += gw * sc + gap;
      });
    };
    stamp(3, 3, pal.ex);
    stamp(2, 2, pal.ex);
    [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].forEach(([dx, dy]) => stamp(dx, dy, pal.ol));
    stamp(0, 0, pal.face);
    let gx = x0;
    glyphs.forEach(gl => {
      const gw = gl.rows[0].length;
      const at = (r, c) => r >= 0 && r < gl.rows.length && c >= 0 && c < gw && gl.rows[r][c] === "1";
      gl.rows.forEach((row, r) => {
        for (let c = 0; c < gw; c++) {
          const cx = gx + c * sc,
            cy = y0 + (gl.top + r) * sc;
          if (row[c] === "2") {
            px(ctx, cx, cy, sc, sc, pal.dot);
            continue;
          }
          if (row[c] !== "1") continue;
          if (!at(r - 1, c)) px(ctx, cx, cy, sc, 2, pal.bev);
          if (!at(r, c - 1)) px(ctx, cx, cy, 1, sc, pal.bev);
          if (!at(r + 1, c)) px(ctx, cx, cy + sc - 1, sc, 1, pal.sh);
          if (!at(r, c + 1)) px(ctx, cx + sc - 1, cy, 1, sc, pal.sh);
        }
      });
      gx += gw * sc + gap;
    });
    return w;
  }
  function stampLogoBlocks(cv) {
    const ctx = cv.getContext("2d");
    const base = (x0t, x1t, y0t) => {
      const bx = x0t * T,
        bw = (x1t - x0t + 1) * T,
        by = y0t * T + 1;
      px(ctx, bx, by, bw, 2 * T - 2, "#C9C6BD");
      px(ctx, bx, by, bw, 3, "#DCD9D0");
      px(ctx, bx, by + 2 * T - 4, bw, 2, "#9D9A91");
      px(ctx, bx, by, 1, 2 * T - 2, "#B0ADA4");
      px(ctx, bx + bw - 1, by, 1, 2 * T - 2, "#B0ADA4");
      px(ctx, bx, by + 2 * T - 3, bw, 1, "#8B887F");
    };
    base(48, 59, 38);
    const grn = { face: "#26B44A", bev: "#74CE86", sh: "#1F8F3C", ol: "#17431F", ex: "#17431F", dot: "#3A3E44" };
    const blu = { face: "#2D7BE8", bev: "#6BA3F2", sh: "#1F5FC4", ol: "#173A8C", ex: "#142C6B" };
    const vng = { face: "#F5811E", bev: "#FFC24A", sh: "#C85A10", ol: "#7A2A0E", ex: "#8F2A10" };
    const chr = { face: "#3B4046", bev: "#5A626B", sh: "#26292E", ol: "#141619", ex: "#0E0F12" };
    const nod = { face: "#26B44A", bev: "#74CE86", sh: "#1C8F3C", ol: "#124A22", ex: "#0E3A1B", dot: "#141619" };
    base(22, 41, 35);
    let x1 = 372;
    x1 += stampWordSeg(ctx, ["V", "N", "G"], x1, 562, 2, vng) + 10;
    x1 += stampWordSeg(ctx, ["G", "R", "E", "E", "N"], x1, 562, 2, chr) + 2;
    stampWordSeg(ctx, ["N", "Odot", "D", "E3"], x1, 562, 2, nod);
    let x2 = 769;
    x2 += stampWordSeg(ctx, ["Z", "a", "l", "o"], x2, 610, 2, blu) + 6;
    x2 += stampWordSeg(ctx, ["Z", "a", "l", "o"], x2, 610, 2, blu) + 1;
    stampWordSeg(ctx, ["P", "a", "y"], x2, 610, 2, grn);
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
