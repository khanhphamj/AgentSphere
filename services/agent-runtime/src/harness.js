const V = l => l === "vi";

export function synthesizeByCode(outputs, { phaseIndex = 0, maxPhases = 1, informational = false, language = "en" } = {}) {
  const vi = V(language);
  const specs = (outputs || []).filter(Boolean);
  if (!specs.length) return { phaseSummary: vi ? "Chưa có kết quả để tổng hợp." : "No results to synthesize.", concerns: [], sufficient: false, nextPhase: null, simulated: true };
  const stanceCount = s => specs.filter(o => o.stance === s).length;
  const summaryLine = vi
    ? `${specs.length} luồng việc đã xong: ${stanceCount("support")} ủng hộ, ${stanceCount("oppose")} phản đối, ${stanceCount("conditional")} có điều kiện.`
    : `${specs.length} workstreams done: ${stanceCount("support")} support, ${stanceCount("oppose")} oppose, ${stanceCount("conditional")} conditional.`;
  const concerns = specs.flatMap(o => (o.flags || []).map(f => vi ? `${o.name || o.agentId}: ${f}` : `${o.name || o.agentId}: ${f}`)).slice(0, 4);
  return { phaseSummary: summaryLine, concerns, sufficient: true, nextPhase: null, simulated: true };
}

export function scenariosByCode(outputs, language) {
  const specs = (outputs || []).filter(Boolean);
  const confs = specs.map(o => typeof o.confidence === "number" ? o.confidence : 50);
  const avg = confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 50;
  const vi = language === "vi";
  const likely = Math.min(80, Math.max(40, avg));
  const best = Math.max(10, Math.round((100 - likely) * 0.6));
  const worst = Math.max(5, 100 - likely - best);
  return {
    scenarios: [
      { name: vi ? "Khả quan" : "Best case", probability: best, outcome: vi ? "Các giả định thuận lợi đều đúng; lợi ích đạt mức cao của khoảng ước tính." : "Favorable assumptions hold; benefits land at the high end of the range.", drivers: [vi ? "giả định lạc quan đúng" : "optimistic assumptions hold"] },
      { name: vi ? "Khả năng cao" : "Most likely", probability: likely, outcome: vi ? "Kết quả bám sát khuyến nghị của đội, kèm vài điều kiện." : "Plays out close to the squad's recommendation, with a few caveats.", drivers: [vi ? "theo phân tích chính" : "base-case analysis"] },
      { name: vi ? "Bất lợi" : "Worst case", probability: worst, outcome: vi ? "Các rủi ro đã nêu xảy ra; cần phương án dự phòng." : "The flagged risks materialize; a fallback plan is needed.", drivers: [vi ? "rủi ro đã gắn cờ" : "flagged risks"] }
    ],
    sensitivity: vi ? "Kết quả nhạy nhất với các giả định có độ tin cậy thấp nhất của đội." : "Most sensitive to the lowest-confidence assumptions in the squad's analysis.",
    simulated: true
  };
}

const JUNK_HOST = /(^|\.)(cambridge\.org|dictionary\.com|merriam-webster\.com|thefreedictionary\.com|vocabulary\.com|wordreference\.com|collinsdictionary\.com|urbandictionary\.com|schema\.org|w3\.org|wiktionary\.org|translate\.google\.com|bing\.com|google\.com|duckduckgo\.com|yahoo\.com\/search)$/i;
const JUNK_PATH = /\/dictionary\/|\/translate\b|\/define\b|\/spell\b|\/(sign[\- ]?in|signup|sign[\- ]?up|log[\- ]?in|login|register|account|cart|checkout|subscribe)\b/i;
export function isJunkSource(u) {
  try {
    const { hostname, pathname } = new URL(u);
    if (JUNK_HOST.test(hostname)) return true;
    if (JUNK_PATH.test(pathname)) return true;
    if (u.includes("example.org")) return true;
    return false;
  } catch {
    return true;
  }
}
export function buildSources(dataNotes, language) {
  const MODEL_TOOL = /^mcp-data\/data\.simulate$/;
  const realTools = new Set();
  const synthTools = new Set();
  const urls = new Set();
  for (const note of dataNotes) {
    const tool = note.match(/([a-z-]+\/[a-z]+\.[a-z]+) →/i);
    if (tool) (MODEL_TOOL.test(tool[1]) || /synthetic|"synthetic"\s*:\s*true/i.test(note) ? synthTools : realTools).add(tool[1]);
    if (/"lowRelevance"\s*:\s*true/.test(note)) continue;
    for (const u of note.match(/https?:\/\/[^\s"\\)]+/g) || []) {
      const clean = u.replace(/[.,;]+$/, "");
      if (!isJunkSource(clean)) urls.add(clean);
    }
  }
  if (!realTools.size && !synthTools.size && !urls.size) return "";
  const vi = V(language);
  const out = [];
  const realLines = [...[...urls].slice(0, 8).map(u => `- ${u}`), ...[...realTools].map(t => `- \`${t}\``)];
  if (realLines.length) out.push(`## ${vi ? "Nguồn dữ liệu thật" : "Real data sources"}\n${realLines.join("\n")}`);
  if (synthTools.size) out.push(`## ${vi ? "Dữ liệu mô phỏng (không phải nguồn thật)" : "Modeled / synthetic inputs (not real sources)"}\n${[...synthTools].map(t => `- \`${t}\``).join("\n")}`);
  return out.join("\n\n");
}

export function triageByCode(title, language) {
  void language;
  const t = String(title || "").toLowerCase();
  const decision = /(có\s+nên|nên\b[^?]{0,40}\bkhông|should\s+(we|i)|có\s+đáng|đáng\s+(đầu\s*tư|làm|để)|liệu\s+có\s+nên)/i.test(t);
  const info = /(là\s+gì|là\s+ai|nghĩa\s+là|có\s+gì\s+mới|gì\s+mới|mới\s+gì|cải\s+thi[ếệe]n\s+gì|như\s+thế\s+nào|ra\s+sao|khi\s+nào|ở\s+đâu|bao\s+nhiêu|liệt\s+kê|tin\s+tức|cập\s+nhật\s+gì|có\s+[^?]{1,40}\bnào\b|\bnào\b\s*(không|hay)|what\s+(is|are|'s)|what(?:'s)?\s+new|which\b|who\b|when\b|where\b|how\s+(many|much|do|does)|\blist\s+(the|all|of|out)?|explain\b|tell\s+me\s+about)/i.test(t);
  return { type: "work", informational: !decision && info };
}

export function planByCode({
  title,
  language,
  informational
}) {
  const vi = V(language);
  const goal = vi ? `Trả lời/đánh giá: ${title}` : `Answer/assess: ${title}`;
  const decisionAssignments = vi ? [
    { focus: "Thu thập dữ kiện & nguồn", lens: "evidence" },
    { focus: "Định lượng chi phí/lợi ích", lens: "quantify" },
    { focus: "Rà soát rủi ro & tiền lệ", lens: "risk" },
    { focus: "Đề xuất phương án thay thế", lens: "options" }
  ] : [
    { focus: "Gather facts & sources", lens: "evidence" },
    { focus: "Quantify costs & benefits", lens: "quantify" },
    { focus: "Review risks & precedents", lens: "risk" },
    { focus: "Propose alternatives", lens: "options" }
  ];
  const infoAssignments = [{ focus: vi ? "Tìm & tổng hợp thông tin" : "Find & synthesize information", lens: "evidence" }];
  return {
    approach: vi ? `Phân rã "${title}" theo nhiều góc rồi tổng hợp.` : `Decompose "${title}" across angles, then synthesize.`,
    phase: { goal, assignments: informational ? infoAssignments : decisionAssignments },
    handler: "code"
  };
}

export function decideConsensus({
  missionTitle,
  positions = [],
  transcript = [],
  language
}) {
  const vi = V(language);
  const by = s => positions.filter(p => p.stance === s);
  const support = by("support"),
    oppose = by("oppose"),
    conditional = by("conditional");
  let decision;
  if (oppose.length >= support.length + conditional.length) decision = "do-not-proceed";else if (oppose.length > 0 || conditional.length > 0) decision = "proceed-with-conditions";else decision = "proceed";
  const conditions = [];
  for (const p of [...conditional, ...oppose]) {
    const out = p.keyPoints || [];
    for (const k of out.slice(0, 2)) if (!conditions.includes(k)) conditions.push(k);
  }
  if (decision === "proceed-with-conditions" && conditions.length === 0) {
    conditions.push(vi ? "Thí điểm trước, mở rộng theo cột mốc" : "Pilot first, expand on milestones");
    conditions.push(vi ? "Rà soát tại cổng dừng sau giai đoạn đầu" : "Stop-gate review after the first phase");
  }
  const names = list => list.map(p => p.name || p.agentId).join(", ");
  const lastTurn = transcript[transcript.length - 1];
  const rationale = vi ? `Kết quả họp: ${support.length} ủng hộ (${names(support) || "—"}), ${conditional.length} đồng ý có điều kiện (${names(conditional) || "—"}), ${oppose.length} phản đối (${names(oppose) || "—"}). ${lastTurn ? `Điểm chốt: ${lastTurn.argument}` : ""}` : `Meeting outcome: ${support.length} support (${names(support) || "—"}), ${conditional.length} conditional (${names(conditional) || "—"}), ${oppose.length} oppose (${names(oppose) || "—"}). ${lastTurn ? `Closing point: ${lastTurn.argument}` : ""}`;
  const sayMap = {
    "proceed": vi ? "Chốt: cả đội thống nhất tiến hành." : "Settled: the squad agrees — proceed.",
    "proceed-with-conditions": vi ? "Chốt: tiến hành có điều kiện — đã ghi rõ các cổng kiểm soát." : "Settled: proceed with conditions — control gates recorded.",
    "do-not-proceed": vi ? "Chốt: chưa tiến hành ở thời điểm này." : "Settled: do not proceed at this time."
  };
  return {
    decision,
    conditions,
    rationale: rationale.trim(),
    say: sayMap[decision],
    handler: "code"
  };
}

export function clampWords(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s.,;:…]+$/, "") + "…";
}

const RISK_LENS = /risk|critic|precedent|skeptic|threat|hidden|failure|downside|compliance/i;
const titleCase = s => { const t = String(s || "").trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; };

export function assembleReport({
  missionTitle,
  outputs = [],
  meeting = null,
  informational = false,
  language
}) {
  const vi = V(language);
  const contributions = outputs.filter(Boolean);
  const real = contributions.filter(o => !o.simulated);
  const abstainers = real.filter(o => o.stance === "insufficient");
  const voters = real.filter(o => o.stance !== "insufficient");
  const considered = voters.length ? voters : real.length ? real : contributions;
  const conditionals = considered.filter(o => o.stance === "conditional");
  const decision = informational ? "informational" : meeting?.decision || (considered.some(o => o.stance === "oppose") ? "do-not-proceed" : conditionals.length ? "proceed-with-conditions" : "proceed");
  const conditions = meeting?.conditions?.length ? meeting.conditions : conditionals.flatMap(o => (o.keyPoints || []).slice(0, 2)).slice(0, 4);
  const infoLead = [...considered].sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).find(o => o.summary) || considered[0];
  const recommendation = informational ? (infoLead?.summary ? clampWords(String(infoLead.summary).split(/(?<=[.!?。])\s/)[0], 180) : vi ? `Thông tin cho “${missionTitle}” — xem chi tiết bên dưới.` : `Information on “${missionTitle}” — see details below.`) : decision === "proceed" ? vi ? `Tiến hành “${missionTitle}”.` : `Proceed with “${missionTitle}”.` : decision === "do-not-proceed" ? vi ? `Chưa nên tiến hành “${missionTitle}” ở thời điểm này.` : `Do not proceed with “${missionTitle}” at this time.` : vi ? `Tiến hành “${missionTitle}” có điều kiện: ${conditions.slice(0, 2).join("; ") || "thí điểm trước"}.` : `Proceed with “${missionTitle}” under conditions: ${conditions.slice(0, 2).join("; ") || "pilot first"}.`;
  const weightOf = o => RISK_LENS.test(o.lens || o.focus || "") ? 2 : 1;
  const RISK_WEIGHT = 2;
  const confBase = voters.flatMap(o => Array(weightOf(o)).fill(o.confidence)).filter(n => typeof n === "number");
  let confidence, confidenceRationale;
  if (!confBase.length) {
    confidence = abstainers.length ? 35 : 45;
    confidenceRationale = abstainers.length ? vi ? "Không đủ bằng chứng — các agent abstain do tool không trả về dữ liệu" : "Insufficient evidence — agents abstained because tools returned nothing" : vi ? "Không có kết luận thật — toàn bộ chạy offline-fallback" : "No real conclusions — every output came from offline fallback";
  } else {
    let c = confBase.reduce((a, b) => a + b, 0) / confBase.length;
    const voterCount = voters.filter(o => typeof o.confidence === "number").length;
    const camps = new Set(voters.filter(o => o.stance).map(o => o.stance)).size;
    const flaggedReal = voters.filter(o => o.flags?.length).length;
    const anySim = contributions.some(o => o.simulated);
    const hasRisk = voters.some(o => weightOf(o) > 1);
    const notes = [];
    if (camps >= 2) {
      c -= 8;
      notes.push(vi ? "bất đồng −8" : "disagreement −8");
    }
    if (flaggedReal) {
      const p = Math.min(15, 4 * flaggedReal);
      c -= p;
      notes.push(vi ? `flag ${flaggedReal} −${p}` : `${flaggedReal} flagged −${p}`);
    }
    if (abstainers.length) {
      const p = Math.min(12, 6 * abstainers.length);
      c -= p;
      notes.push(vi ? `${abstainers.length} abstain −${p}` : `${abstainers.length} abstained −${p}`);
    }
    if (anySim) {
      c = Math.min(c, 60);
      notes.push(vi ? "có offline-fallback, trần 60" : "offline-fallback present, cap 60");
    }
    confidence = Math.max(5, Math.min(100, Math.round(c)));
    confidenceRationale = (vi ? `Trung bình có trọng số${hasRisk ? ` (góc rủi ro ×${RISK_WEIGHT})` : ""} trên ${voterCount} kết luận thật` : `Weighted mean${hasRisk ? ` (risk angle ×${RISK_WEIGHT})` : ""} over ${voterCount} real conclusions`) + (notes.length ? ` · ${notes.join(" · ")}` : "");
  }
  const sectionFor = o => {
    const heading = o.focus ? `${titleCase(o.focus)} — ${o.name || o.agentId}` : (o.name || o.agentId);
    return `## ${heading}\n${o.summary || ""}\n${(o.keyPoints || []).map(k => `- ${k}`).join("\n")}`;
  };
  const gapsSection = abstainers.length ? `## ${vi ? "Khoảng trống bằng chứng" : "Evidence gaps"}\n${abstainers.map(o => `- **${o.name || o.agentId}**: ${o.insufficientReason || (vi ? "không đủ dữ liệu để kết luận" : "insufficient data to conclude")}`).join("\n")}` : "";
  const T = vi ? { tldr: "TL;DR", meet: "Họp đồng thuận", rec: informational ? "Trả lời" : "Khuyến nghị", next: "Bước tiếp theo", nextLine: "Duyệt phạm vi triển khai và chỉ số kiểm soát trong tuần này." } : { tldr: "TL;DR", meet: "Consensus meeting", rec: informational ? "Answer" : "Recommendation", next: "Next step", nextLine: "Approve the scope and control metrics this week." };
  const condSection = !meeting && decision === "proceed-with-conditions" && conditions.length ? `## ${vi ? "Điều kiện" : "Conditions"}\n${conditions.map(c => `- ${c}`).join("\n")}` : "";
  const flagged = contributions.filter(o => o.flags?.length);
  const verifySection = flagged.length ? `## ${vi ? "Kiểm chứng" : "Verification"}\n${flagged.map(o => `**${o.name || o.agentId}**${o.verifyNote ? ` — ${o.verifyNote}` : ""}\n${o.flags.map(f => `- ⚑ ${f}`).join("\n")}`).join("\n")}` : "";
  const confBasis = !informational && confidenceRationale ? `_${vi ? "Cơ sở đánh giá" : "Confidence basis"}: ${confidenceRationale}._` : "";
  const markdown = [
    `## ${T.tldr}\n**${recommendation}**`,
    ...considered.map(sectionFor),
    verifySection,
    gapsSection,
    informational ? "" : meeting ? `## ${T.meet}\n${meeting.rationale}\n${(meeting.conditions || []).map(c => `- ${c}`).join("\n")}` : condSection,
    `## ${T.rec}\n${recommendation}`,
    confBasis,
    informational ? "" : `## ${T.next}\n${T.nextLine}`
  ].filter(Boolean).join("\n\n");
  const say = vi ? `Báo cáo cuối đã xong — khuyến nghị kèm độ tin cậy ${confidence}%.` : `Final report is out — recommendation at ${confidence}% confidence.`;
  return {
    markdown,
    recommendation,
    confidence,
    confidenceRationale,
    say,
    handler: "code"
  };
}
