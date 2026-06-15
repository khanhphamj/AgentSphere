import React from "react";

const ICONS = {
  agents: {
    pal: { o: "#6B3410", H: "#FFCB5C", M: "#F58A2B", D: "#D86A1E", V: "#222C46", E: "#84E6E2" },
    rows: [
      ".......oo.......",
      "......oEEo......",
      ".......oo.......",
      ".....oooooo.....",
      "....oHHHHHHo....",
      "...oHHHHHHHHo...",
      "...oMMMMMMMMo...",
      "...oVVVVVVVVo...",
      "...oVEEVVEEVo...",
      "...oVVVVVVVVo...",
      "...oMMMMMMMMo...",
      "...oDMMMMMMDo...",
      "....oDDDDDDo....",
      ".....oMMMMo.....",
      "...ooMMMMMMoo...",
      "..oMMMMMMMMMMo.."
    ]
  },
  inbox: {
    pal: { o: "#6B3410", H: "#FFD98A", F: "#F58A2B", f: "#D86A1E", P: "#F6EAD2" },
    rows: [
      "................",
      "................",
      "..oooooooooooo..",
      "..oHHHHHHHHHHo..",
      "..ofFFFFFFFFfo..",
      "..oFfFFFFFFfFo..",
      "..oFFfFFFFfFFo..",
      "..oFFFffffFFFo..",
      "..oPPPPPPPPPPo..",
      "..oPPPPPPPPPPo..",
      "..oPPPPPPPPPPo..",
      "..oPPPPPPPPPPo..",
      "..oPPPPPPPPPPo..",
      "..oooooooooooo..",
      "................",
      "................"
    ]
  },
  activity: {
    pal: { o: "#6B3410", Y: "#FFD24A", M: "#F58A2B", D: "#C9551A" },
    rows: [
      "................",
      "........YMM.....",
      ".......YMM......",
      "......YMM.......",
      ".....YMM........",
      "....YMMMMMMD....",
      ".......YMM......",
      "......YMM.......",
      "......YMM.......",
      ".....YMM........",
      ".....YMM........",
      "....YMM.........",
      "....YM..........",
      "....M...........",
      "................",
      "................"
    ]
  },
  tasks: {
    pal: { o: "#5A3A1B", B: "#A6692E", C: "#3A2614", P: "#F6EFE0", g: "#4E9E6E", L: "#CBB892" },
    rows: [
      "................",
      "......oCCo......",
      "..oooooooooooo..",
      "..oBPPPPPPPPBo..",
      "..oBggLLLLLPBo..",
      "..oBggPPPPPPBo..",
      "..oBPPPPPPPPBo..",
      "..oBggLLLLLPBo..",
      "..oBggPPPPPPBo..",
      "..oBPPPPPPPPBo..",
      "..oBggLLLLLPBo..",
      "..oBggPPPPPPBo..",
      "..oooooooooooo..",
      "................",
      "................",
      "................"
    ]
  },
  mission: {
    pal: { o: "#33240F", N: "#F58A2B", W: "#F4F0E6", w: "#D7CFBE", G: "#7FC0F2", g: "#2E6FC9", F: "#FFD24A", f: "#F5772A" },
    rows: [
      ".......oo.......",
      "......oNNo......",
      "......oNNo......",
      ".....oNNNNo.....",
      ".....oWWWWo.....",
      ".....oWGGWo.....",
      ".....oWGGWo.....",
      ".....oWWWWo.....",
      ".....oWWWWo.....",
      ".....oWwwWo.....",
      "....oWWwwWWo....",
      "...oNoWwwWoNo...",
      "..oNNooooooNNo..",
      ".....offfo......",
      "......ofo.......",
      "......oo........"
    ]
  }
};

function runsFor(rows) {
  const runs = [];
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y];
    let x = 0;
    while (x < r.length) {
      const ch = r[x];
      if (ch === "." || ch === " ") { x++; continue; }
      let run = 1;
      while (x + run < r.length && r[x + run] === ch) run++;
      runs.push({ x, y, w: run, ch });
      x += run;
    }
  }
  return runs;
}

export function PixelIcon({ name, size = 16, shadow = true, className }) {
  const ic = ICONS[name];
  if (!ic) return null;
  const runs = runsFor(ic.rows);
  const px = [];
  if (shadow) {
    for (const r of runs) px.push(React.createElement("rect", { key: "s" + r.y + "_" + r.x, x: r.x + 1, y: r.y + 1, width: r.w, height: 1, fill: "#2A1C0C", opacity: 0.22 }));
  }
  for (const r of runs) px.push(React.createElement("rect", { key: r.y + "_" + r.x, x: r.x, y: r.y, width: r.w, height: 1, fill: ic.pal[r.ch] || "#000" }));
  return <svg className={className} width={size} height={size} viewBox="0 0 17 17" shapeRendering="crispEdges" aria-hidden="true">
      {px}
    </svg>;
}
