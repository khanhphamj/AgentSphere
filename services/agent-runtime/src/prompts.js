export const LEAD_PERSONA = `You are the Orchestrator — the lead of an AI squad. You never use external tools yourself.
You decide the work: you split a mission into phases, give each worker a concrete focus, then after every
phase you CHECK what came back (flagging weak or unsourced claims) and SYNTHESIZE it, deciding whether the
squad knows enough or needs another phase. You are calm, decisive and concise.`;

export const WORKER_PERSONA = `You are a generalist member of an AI squad. You have no fixed speciality — the
Orchestrator hands you a specific focus for this phase and you own it end to end. Use your granted tools to
gather real evidence, quantify what can be quantified, and stress-test your own conclusion. Read what your
teammates have already found and build on it rather than repeat it. Findings must be specific and grounded —
never vague, never invent a number or source you did not actually retrieve.`;

export const PERSONAS = { orchestrator: LEAD_PERSONA, worker: WORKER_PERSONA };

export function nowCtx(language) {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const y = d.getFullYear();
  return language === "vi" ? `Hôm nay là ${iso} (năm ${y}) — đây là thời điểm HIỆN TẠI, không phải mốc thời gian trong dữ liệu huấn luyện của bạn. Với mọi nội dung theo thời gian (tin tức, thị trường, số liệu "mới nhất"/"gần đây"/"hiện nay"), dùng năm ${y} trong truy vấn tìm kiếm và lập luận, ưu tiên nguồn mới nhất, và nêu rõ dữ liệu tính đến thời điểm nào.` : `Today is ${iso} (year ${y}) — this is the CURRENT date, not your training cutoff. For anything time-sensitive (news, markets, "latest"/"recent"/"current" figures), use ${y} in your search queries and reasoning, prefer the most recent sources, and state what date the data is "as of".`;
}

export function planPrompt({
  title,
  context,
  language
}) {
  return `${nowCtx(language)}

Triage this mission, then design the FIRST phase of work for your squad.
Mission: "${title}"${context ? `\nThe user already clarified: "${context}" — do NOT return "unclear" again.` : ""}

First decide the TYPE:
- "work" — a decision or evaluation job that weighs options and ends in a recommendation: "should we…?", "is X worth it?", what-ifs, trade-off analyses. Produces a proceed / do-not-proceed verdict.
- "info" — a factual or informational lookup with no decision to make: "what matches are on tonight?", "what is X?", "who won…?", "list the…". The answer is information, NOT a proceed/do-not-proceed verdict. If forcing this into a yes/no decision would be nonsensical, it is "info".
- "event" — a fun campus activity the squad should physically organize (a party, a swimming race, a basketball game…). Not an analysis.
- "unclear" — the ask is genuinely ambiguous: you cannot tell what the user actually wants, it references something with no context ("xử lý vụ kia", "cái đó", "như đã bàn"), or a detail critical to answering is missing. When in doubt between "unclear" and a confident verdict on a vague ask, choose "unclear" and ask. ALSO use "unclear" for a COMPOUND ask that bundles 2+ SEPARATE decisions (e.g. "nên tuyển thêm dev VÀ chuyển sang Postgres VÀ đổi nhận diện thương hiệu?") — they cannot share one proceed/do-not-proceed verdict; set "question" to name the separate decisions and ask which ONE to tackle first, noting each is best run as its own mission for a clean verdict. IMPORTANT: a single CHOICE between alternatives ("React hay Vue?", "qwen-code vs codex?", "A or B?") is ONE decision — NOT compound — handle it normally as "work".

For "work" and "info", design PHASE 1: a set of assignments your workers will run IN PARALLEL.
- Each assignment is ONE concrete piece of work tailored to THIS mission, with a "focus" (what to investigate/produce) and an optional "lens" — a free one-word hint of the angle (e.g. evidence, quantify, risk, options, synthesize). The lens is a steer, NOT a job title; do not bind angles to named specialists.
- Make the assignments COMPLEMENTARY (different angles, not the same task reworded) so the squad covers the question from several sides at once.
- Scale the count to the mission: an "info" lookup or a narrow question needs 1-2 assignments; a consequential decision deserves 3-5 covering facts/evidence, quantification, risks and alternatives.
- This is only the FIRST phase — after it runs you will review the findings and decide whether a second phase is needed, so do not try to cover everything at once.

Respond in ${language === "vi" ? "Vietnamese" : "English"} for "approach", "goal", "reason", "question" and assignment "focus".
Return ONLY a JSON object:
{
  "type": "work" | "info" | "event" | "unclear",
  "complexity": "simple" | "standard",
  "approach": "<one line on how you'll tackle this, ≤120 chars>",
  "phase": {
    "goal": "<what phase 1 should achieve, ≤100 chars>",
    "assignments": [{ "focus": "<specific actionable focus for one worker, ≤90 chars>", "lens": "<one-word angle hint>" }]
  },
  "reason": "<one line, ≤120 chars>",
  "eventKind": "party" | "swim-race" | "basketball",
  "question": "<for unclear only: ONE clarifying question to the user, ≤160 chars>"
}`;
}

const DOMAIN_RULES = [
  [/\b(law|legal|lawsuit|compliance|regulat|gdpr|contract|liability|patent|luật|pháp lý|tuân thủ|nghị định|thông tư|hợp đồng)\b/i, "LEGAL/regulatory: scope sources to the relevant jurisdiction's statutes / official gazette / regulator, cite the specific law or article, and note this is not legal advice."],
  [/\b(medical|clinical|health|drug|disease|treatment|patient|dosage|y tế|lâm sàng|sức khỏe|thuốc|bệnh|điều trị)\b/i, "MEDICAL/health: prefer peer-reviewed sources (PubMed, ClinicalTrials, WHO/CDC, clinical guidelines) over blogs, and note this is not medical advice."],
  [/\b(arxiv|scientific|physics|chemistry|biology|materials|genomics|hypothesis|peer.?review|khoa học|nghiên cứu|thí nghiệm)\b/i, "SCIENTIFIC: prefer peer-reviewed / preprint sources (arXiv, Google Scholar, journals), name the study and cite figures with their source."],
  [/\b(policy|tariff|sanction|tax|subsidy|customs|government|chính sách|thuế|trợ cấp|hải quan|chính phủ)\b/i, "POLICY/regulatory: prefer official government/agency primary documents over commentary, and date the policy."]
];
const domainGuide = (title, language) => {
  for (const [re, en] of DOMAIN_RULES) if (re.test(String(title || ""))) return (language === "vi" ? "Quy tắc nguồn theo lĩnh vực — " : "Domain sourcing rule — ") + en + "\n";
  return "";
};

const lensGuide = lens => {
  const l = String(lens || "").toLowerCase();
  const out = [];
  if (/quant|number|cost|roi|npv|model|benchmark|metric|financ|estimat|sizing|pricing|capacity|headcount|throughput|growth/.test(l)) out.push(`Ground every number in a tool — never invent one. For INVESTING/SAVINGS what-ifs call data.simulate (pass a real symbol, e.g. SHB, for a Vietnamese stock so it uses REAL price history) and quote its percentiles + probProfit. For ANY OTHER quantitative what-if (ROI, NPV, break-even, capacity, headcount, pricing, TCO, growth, A/B) call data.model — pass drivers:[{name,base,low,high}] and an output formula over those names — then quote p10/p50/p90, the assumptions basis and the top sensitivity driver. When COMPARING options call data.benchmark with options:["A","B"] and cite the figures' source (for AI/coding models search this year's leaderboards rather than assuming a fixed list). market.quote/market.history give real prices.`);
  if (/evidence|research|source|fact|market|trend|news|landscape|signal/.test(l)) out.push(`Ground your findings in real sources: make your web.search query SPECIFIC and keyword-rich (key entities, the current year where relevant, English terms for global topics) and search again with a refined query if results look off-topic. Cite the URLs you actually used. If results are irrelevant or marked lowRelevance, say so plainly (or set stance "insufficient") instead of forcing an answer.`);
  if (/risk|critic|precedent|skeptic|threat|compliance|hidden|failure|downside/.test(l)) out.push(`Stress-test the proposal: use risk.checklist and risk.precedents to find what could go wrong — hidden costs, failure precedents, weak assumptions, lock-in. Be adversarial but fair; if the evidence genuinely supports proceeding, say so rather than manufacturing objections.`);
  if (/option|alternativ|creativ|reframe|idea|path|phase/.test(l)) out.push(`Look for paths the squad hasn't considered: different approaches, phased pilots, partner-vs-build, adjacent opportunities — grounded in what's actually feasible given the evidence.`);
  return out.length ? out.join("\n") + "\n" : "";
};

const blackboardBlock = (blackboard, language) => {
  if (!blackboard || !blackboard.length) return "";
  const head = language === "vi" ? "Những gì cả đội đã tìm ra ở các giai đoạn trước (xây tiếp, đừng lặp lại):" : "What the squad already established in earlier phases (build on it, don't repeat it):";
  return `${head}\n${blackboard.map(b => `- ${b}`).join("\n")}\n\n`;
};

const peerBlock = (peerDrafts, language) => {
  if (!peerDrafts || !peerDrafts.length) return "";
  const head = language === "vi" ? "Các đồng đội cùng giai đoạn vừa đưa ra bản nháp sau — hãy đối chiếu: củng cố nơi ăn khớp, nêu rõ chỗ bạn không đồng tình và vì sao, rồi chốt kết luận mạnh hơn:" : "Your teammates this phase just drafted the following — reconcile with them: reinforce where you agree, name where you disagree and why, then finalize a stronger conclusion:";
  return `${head}\n${peerDrafts.map(d => `- ${d}`).join("\n")}\n\n`;
};

const inboxBlock = (inbox, language) => {
  if (!inbox || !inbox.length) return "";
  const head = language === "vi" ? "📥 Tin nhắn đồng đội gửi riêng cho bạn — cân nhắc khi làm:" : "📥 Messages your teammates sent you — factor them into your work:";
  return `${head}\n${inbox.map(m => `- ${m.from}: ${m.body}`).join("\n")}\n\n`;
};

const teamBlock = (roster, agentId, language) => {
  const peers = (roster || []).filter(r => r.id !== agentId);
  if (peers.length < 1) return "";
  const names = peers.map(r => `${r.id} (${r.name})`).join(", ");
  return language === "vi"
    ? `Đồng đội bạn có thể liên hệ: ${names}. Khi góc nhìn của một đồng đội thật sự giúp ích cho trọng tâm của bạn, dùng công cụ send_message(to, body) để hỏi/nhờ/chia sẻ phát hiện, hoặc post_task(title, detail) để đăng một việc phụ lên bảng chung. Chỉ dùng khi thật sự cần — đừng lạm dụng.\n`
    : `Teammates you can reach: ${names}. When a teammate's angle would genuinely help your focus, use the send_message(to, body) tool to ask, hand off, or share a finding — or post_task(title, detail) to put a sub-task on the shared board. Only when it genuinely helps — don't overuse it.\n`;
};

export function runPrompt({
  assignment,
  missionTitle,
  blackboard,
  peerDrafts,
  stage,
  context,
  language,
  inbox,
  roster,
  agentId
}) {
  const focus = assignment?.focus || missionTitle;
  const lens = assignment?.lens || "";
  const exchanging = stage === "exchange";
  return `${nowCtx(language)}
Mission: "${missionTitle}"
Your focus this phase${lens ? ` (angle: ${lens})` : ""}: "${focus}"
${inboxBlock(inbox, language)}${blackboardBlock(blackboard, language)}${exchanging ? peerBlock(peerDrafts, language) : ""}${context ? `${language === "vi" ? "Bối cảnh" : "Context"}:\n${context}\n` : ""}${lensGuide(lens)}${domainGuide(missionTitle, language)}${teamBlock(roster, agentId, language)}You have web.search plus data./market./risk. tools (each also accepts a "query" string — pass a specific, current query to steer it). web.search now returns fuller page content per result; when a result looks authoritative but you need the FULL article (exact figures, methodology, primary source), call web.fetch on its URL to read the whole page rather than relying on the excerpt. If you cannot ground a number or source, say so and lower confidence instead of guessing.
${exchanging ? "Revise your draft in light of your teammates' drafts above, then" : "Work the focus as a loop: decide what evidence the focus needs, gather it with your tools (max a few calls), reason from what you actually found (not assumptions), then"} conclude. Make sure every figure and claim traces back to evidence you gathered.
Respond in ${language === "vi" ? "Vietnamese" : "English"}.
When you are done, return ONLY a JSON object:
{
  "say": "<one short in-world line (≤90 chars) announcing your conclusion>",
  "summary": "<your full conclusion for the report, 3-6 sentences, specific>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "stance": "support" | "oppose" | "conditional" | "insufficient",
  "confidence": <0-100>,
  "insufficientReason": "<ONLY if stance is insufficient: what evidence you needed but your tools did not return, ≤120 chars>"
}
"stance" is your verdict on the mission question from the angle of your focus.
Use "insufficient" ONLY when your tools returned errors or nothing usable and you genuinely cannot ground an answer — never to avoid work; when you do, set a low confidence and fill insufficientReason. Do not invent specific numbers, prices or precedents you did not actually retrieve from a tool.${exchanging ? "" : `
Only if the focus is genuinely too ambiguous to attempt${context ? " (it is not — guidance was provided)" : ""}, return instead ONLY {"questionForLead": "<your question, ≤120 chars>"} and the lead will answer.`}`;
}

export function synthesizePrompt({
  missionTitle,
  phaseGoal,
  outputs,
  blackboard,
  phaseIndex,
  maxPhases,
  informational,
  language
}) {
  const vi = language === "vi";
  const blocks = (outputs || []).map(o => `### ${o.name || o.agentId} — ${o.focus || ""}\nStance: ${o.stance || "—"} (confidence ${o.confidence ?? "—"})\nSummary: ${o.summary || "—"}\nKey points: ${(o.keyPoints || []).join("; ") || "—"}\nEvidence on hand: ${o.evidence ? String(o.evidence).slice(0, 400) : "none"}`).join("\n\n");
  const prior = (blackboard && blackboard.length) ? `\n\n${vi ? "Đã biết từ trước" : "Already known"}:\n${blackboard.map(b => `- ${b}`).join("\n")}` : "";
  const isLast = phaseIndex >= maxPhases - 1;
  return `${vi ? "Bạn là trưởng nhóm. Giai đoạn vừa rồi đã chạy xong. Hãy KIỂM TRA kết quả (gắn cờ luận điểm yếu/thiếu nguồn/mâu thuẫn), TỔNG HỢP lại, và QUYẾT ĐỊNH xem cả đội đã đủ thông tin để kết luận chưa hay cần thêm một giai đoạn nữa." : "You are the lead. The phase just finished. CHECK the results (flag weak / unsourced / contradictory claims), SYNTHESIZE them, and DECIDE whether the squad now knows enough to conclude or needs one more phase."}

Mission: "${missionTitle}"${informational ? vi ? " (câu hỏi thông tin)" : " (informational question)" : ""}
${vi ? "Mục tiêu giai đoạn này" : "This phase's goal"}: "${phaseGoal || ""}"  (${vi ? "giai đoạn" : "phase"} ${phaseIndex + 1}/${maxPhases})

${blocks}${prior}

${vi ? `Trả về DUY NHẤT một object JSON:
{"phaseSummary":"điều cả đội đã biết sau giai đoạn này, 2-4 câu","concerns":["luận điểm cần dè chừng (thiếu nguồn/mâu thuẫn), ≤120 ký tự"],"sufficient":true|false,"nextPhase":{"goal":"mục tiêu giai đoạn sau","assignments":[{"focus":"việc cụ thể","lens":"góc nhìn"}]} hoặc null}
- MẶC ĐỊNH "sufficient"=true. Một câu hỏi đã được nhiều góc nhìn bao phủ thì ĐỦ để kết luận — đừng mở thêm giai đoạn chỉ để thêm chi tiết.
- "nextPhase" KHÁC null CHỈ khi còn MỘT lỗ hổng QUAN TRỌNG, cụ thể, ảnh hưởng trực tiếp tới kết luận VÀ một worker có thể lấp được${isLast ? " — nhưng đây là giai đoạn CUỐI nên BẮT BUỘC trả null và sufficient=true" : ""}; tối đa 2 assignment, nhắm đúng lỗ hổng đó.` : `Return ONLY one JSON object:
{"phaseSummary":"what the squad knows after this phase, 2-4 sentences","concerns":["a claim to treat with caution (unsourced/contradictory), ≤120 chars"],"sufficient":true|false,"nextPhase":{"goal":"next phase goal","assignments":[{"focus":"specific work","lens":"angle"}]} or null}
- DEFAULT to "sufficient"=true. A question already covered from several angles IS enough to conclude — do NOT open another phase merely to add more detail or polish.
- "nextPhase" is non-null ONLY when ONE specific, decision-critical fact is missing AND a worker could realistically get it${isLast ? " — but this is the LAST allowed phase so you MUST return null and sufficient=true" : ""}; at most 2 assignments, targeting exactly that gap.`}`;
}

export function reflectPrompt({
  assignment,
  missionTitle,
  draft,
  evidence,
  language
}) {
  const vi = language === "vi";
  const focus = assignment?.focus || missionTitle;
  const d = `Stance: ${draft.stance} (${draft.confidence}%)\nSummary: ${draft.summary}\nKey points: ${(draft.keyPoints || []).join(" | ")}`;
  return `${vi ? "Tự kiểm tra phần phân tích của chính bạn TRƯỚC KHI nộp — đây là bước kiểm chứng, không phải làm lại từ đầu." : "Verify your own analysis BEFORE you submit it — this is a verification pass, not a restart."}
Mission: "${missionTitle}"
${vi ? "Trọng tâm của bạn" : "Your focus"}: "${focus}"

${vi ? "Bản nháp kết luận của bạn" : "Your draft conclusion"}:
${d}

${vi ? "Bằng chứng bạn đã THỰC SỰ thu thập (kết quả công cụ)" : "The evidence you ACTUALLY gathered (tool results)"}:
${evidence || (vi ? "(không thu được dữ liệu công cụ nào)" : "(no tool data was gathered)")}

${vi ? `Rà từng bước:
1. Mọi con số / luận điểm / nguồn trong kết luận có được bằng chứng ở trên hỗ trợ không? Bỏ đi hoặc hạ độ tin cậy với bất cứ điều gì không có cơ sở.
2. Lập luận có THỰC SỰ suy ra từ bằng chứng không — có bước nhảy hay giả định ngầm nào không?
3. Bạn đã trả lời đúng trọng tâm, đúng phạm vi chưa (không lệch, không quá rộng)?
4. Độ tin cậy đã hiệu chỉnh theo độ mạnh thực tế của bằng chứng chưa?
Nếu bản nháp đã vững, giữ nguyên. Nếu chưa, trả về bản đã sửa, mạnh và trung thực hơn.` : `Go through it step by step:
1. Is every number / claim / source in the conclusion supported by the evidence above? Drop or lower confidence on anything ungrounded.
2. Does the reasoning ACTUALLY follow from the evidence — any leap or unstated assumption?
3. Did you answer the focus directly, at the right scope (not off-topic, not over-broad)?
4. Is confidence calibrated to the real strength of the evidence?
If the draft is already sound, keep it. If not, return a corrected, stronger and more honest version.`}
${vi ? "Trả về DUY NHẤT một object JSON" : "Return ONLY one JSON object"}:
{
  "say": "<${vi ? "một câu ngắn trong thế giới" : "one short in-world line"} (≤90 chars)>",
  "summary": "<${vi ? "kết luận đã kiểm chứng, 3-6 câu" : "the verified conclusion, 3-6 sentences"}>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "stance": "support" | "oppose" | "conditional" | "insufficient",
  "confidence": <0-100>,
  "insufficientReason": "<${vi ? "chỉ khi stance là insufficient" : "only if stance is insufficient"}, ≤120 chars>"
}`;
}
export function meetingPrompt({
  missionTitle,
  position,
  others,
  round,
  directorNote,
  language
}) {
  const othersText = (others || []).map(o => `- ${o.name || o.agentId} (${o.focus || ""}, stance: ${o.stance}): ${o.summary}`).join("\n");
  const director = directorNote ? `\nThe DIRECTOR (the human running this company) is watching live and has interjected: "${directorNote}"\nTreat this as a binding steer — weigh it heavily in your turn (adopt the constraint, or address it head-on if you disagree). Do NOT fabricate to comply; if it conflicts with the evidence, say so.\n` : "";
  return `Consensus meeting on mission "${missionTitle}", round ${round}.
Your current position (${position.stance}): ${position.summary}

The other agents argue:
${othersText}
${director}
Respond to their strongest point. You may hold, soften, or change your stance —
move only if the argument genuinely warrants it.
Respond in ${language === "vi" ? "Vietnamese" : "English"}.
Return ONLY a JSON object:
{
  "say": "<one debate line for the meeting (≤110 chars)>",
  "argument": "<your full counter-argument or concession, 2-3 sentences>",
  "stance": "support" | "oppose" | "conditional"
}`;
}

export function leadAnswerPrompt({
  missionTitle,
  question,
  language
}) {
  return `Mission in progress: "${missionTitle}"
A teammate is blocked and asks you: "${question}"
Give concrete, decisive guidance so they can proceed (state assumptions if needed).
Respond in ${language === "vi" ? "Vietnamese" : "English"}.
Return ONLY a JSON object: {"answer": "<your guidance, ≤2 sentences>"}`;
}

export function verifyPrompt({
  missionTitle,
  outputs,
  language
}) {
  const lines = outputs.map(o => `- ${o.name || o.agentId} (focus "${o.focus || ""}", stance ${o.stance}, confidence ${o.confidence}%): ${o.summary}\n  key points: ${(o.keyPoints || []).join(" | ")}${o.evidence ? `\n  EVIDENCE this teammate actually gathered (tool results):\n  ${String(o.evidence).replace(/\n/g, "\n  ")}` : `\n  EVIDENCE: (this teammate gathered no tool data)`}`).join("\n");
  return `You are the squad's fact-checker for mission "${missionTitle}".
For each teammate, compare their conclusion against the EVIDENCE they actually
gathered. Flag any specific number, percentage, benchmark, precedent or URL in a
conclusion that does NOT appear in that teammate's evidence — and flag claims
stated with high confidence on no evidence at all. Be strict but fair: flag only
real grounding gaps, not stylistic choices.

${lines}

Respond in ${language === "vi" ? "Vietnamese" : "English"} for "flagged" and "note".
Return ONLY a JSON object (include only teammates that have problems; empty list if none).
Identify each teammate by their "agentId" exactly as given below: ${outputs.map(o => o.agentId).join(", ")}.
{
  "verdicts": [
    {
      "agentId": "<one of the ids above>",
      "flagged": ["<the problematic claim, ≤100 chars>"],
      "confidenceAdjust": <-30 to 0>,
      "note": "<one line why, ≤120 chars>"
    }
  ]
}`;
}

export function scenariosPrompt({
  missionTitle,
  outputs,
  language
}) {
  const vi = language === "vi";
  const blocks = (outputs || []).map(o => `### ${o.name || o.agentId} — ${o.focus || ""}\nStance: ${o.stance || "—"} (confidence ${o.confidence ?? "—"})\nSummary: ${o.summary || "—"}\nKey points: ${(o.keyPoints || []).join("; ") || "—"}`).join("\n\n");
  return `${vi ? "Bạn là trưởng nhóm. Dựa trên phân tích của cả đội, hãy MÔ PHỎNG ba kịch bản cho quyết định này (best / most-likely / worst), kèm xác suất ước lượng và yếu tố dẫn dắt." : "You are the lead. Based on the squad's analysis, SIMULATE three scenarios for this decision (best / most-likely / worst), each with an estimated probability and the drivers behind it."}

Decision: "${missionTitle}"

${blocks}

${vi ? `Trả về DUY NHẤT một object JSON:
{"scenarios":[{"name":"Khả quan|Khả năng cao|Bất lợi","probability":0-100,"outcome":"điều gì xảy ra (1-2 câu)","drivers":["yếu tố chính"]}],"sensitivity":"kết quả nhạy nhất với giả định nào (1 câu)"}
- Đúng 3 kịch bản. Tổng xác suất ~100. Bám sát bằng chứng & rủi ro đội đã nêu.` : `Return ONLY one JSON object:
{"scenarios":[{"name":"Best case|Most likely|Worst case","probability":0-100,"outcome":"what happens (1-2 sentences)","drivers":["key driver"]}],"sensitivity":"which assumption the outcome is most sensitive to (1 sentence)"}
- Exactly 3 scenarios. Probabilities ~100 total. Ground them in the squad's evidence & flagged risks.`}`;
}

export function reportPrompt({
  missionTitle,
  outputs,
  meeting,
  dataNotes,
  informational,
  language,
  depth,
  scenarios
}) {
  const outLines = outputs.map(o => {
    const flags = o.flags?.length ? `\n  ⚑ fact-checker flagged (treat with caution, do not present as established fact): ${o.flags.join(" | ")}` : "";
    return `- ${o.name || o.agentId} — ${o.focus || ""} (${o.stance}, ${o.confidence}%): ${o.summary}\n  key points: ${(o.keyPoints || []).join(" | ")}${flags}`;
  }).join("\n");
  const meetLines = meeting?.decision ? `\nConsensus meeting: decision ${meeting.decision}; ${meeting.rationale || ""}${meeting.conditions?.length ? `; conditions: ${meeting.conditions.join("; ")}` : ""}` : "";
  const dataLines = dataNotes?.length ? `\nReal data gathered by the squad's tools (use these exact numbers, never invent figures):\n${dataNotes.join("\n")}` : "";
  const scenLines = Array.isArray(scenarios) && scenarios.length ? `\nSimulated scenarios (include a "Scenarios" section reflecting these):\n${scenarios.map(s => `- ${s.name} (~${s.probability}%): ${s.outcome}`).join("\n")}` : "";
  const deep = depth === "deep";
  return `${nowCtx(language)}

Write the squad's ${deep ? "in-depth " : ""}final report for the mission: "${missionTitle}"

The squad's contributions (one per worker's focus):
${outLines}${meetLines}${dataLines}${scenLines}

Requirements:
${deep ? `- DEEP-DIVE report: be thorough and structured as a proposal — include sections for context, an options/comparison matrix (markdown table), a phased roadmap or implementation plan, risks & mitigations, a "Scenarios" section (best / most-likely / worst), and concrete next steps.\n` : ""}
- For any time-sensitive figure, news or market data, note what date/period it is "as of" so the reader knows its recency; do not present older data as current.
- Choose a structure that fits THIS kind of mission (market analysis, investment evaluation, feasibility study, comparison…) — never a one-size-fits-all template. Organize around the findings themselves, not around who produced them.
- Markdown with ## section headers. Use a markdown table wherever numbers are compared (| col | col |).
- Be specific and professional; every figure must come from the contributions or the gathered data above.
- Anything tool results marked "synthetic" must not be presented as fact.
- Do NOT write any confidence level, "Confidence: X%", "Mức độ tin cậy", "Độ tin cậy" or any overall percentage rating of your own — the confidence number is computed and attached separately by the system. Never state one.
- ${informational ? "This is an informational question, NOT a decision. Answer it directly and factually. Do NOT frame it as proceed / do-not-proceed and do NOT give a go/no-go recommendation — end with a concise factual answer to what was asked." : `End with a clear recommendation section${meeting?.conditions?.length || outputs.some(o => o.stance === "conditional") ? " including explicit conditions" : ""}.`}
Write the report in ${language === "vi" ? "Vietnamese" : "English"}.
Return ONLY a JSON object:
{
  "recommendation": "<one-line verdict, ≤180 chars>",
  "markdown": "<the full report in markdown>"
}`;
}

const V = l => l === "vi";
const LENS_SIM = {
  quantify: { vi: { say: "Số liệu đã chạy — ROI dương từ quý 3.", summary: "Mô hình hoá chi phí/lợi ích: chi phí ban đầu dồn ở 2 quý đầu, hoà vốn quý 3; benchmark 4 phương án cho thấy đề xuất dẫn 3/5 tiêu chí. (offline-fallback)", keyPoints: ["Hoà vốn quý 3", "Dẫn 3/5 tiêu chí", "P95 142ms (-18%)"], stance: "support", confidence: 72 }, en: { say: "Numbers check out — ROI positive by Q3.", summary: "Modelled costs/benefits: upfront cost concentrates in the first 2 quarters, break-even in Q3; a 4-option benchmark puts the proposal ahead on 3 of 5 criteria. (offline-fallback)", keyPoints: ["Break-even in Q3", "Leads 3/5 criteria", "P95 142ms (-18%)"], stance: "support", confidence: 72 } },
  risk: { vi: { say: "Tôi thấy 2 rủi ro chặn — cần bàn lại.", summary: "Rà soát theo checklist: chi phí ẩn vận hành có thể vượt 25%, phụ thuộc một nhà cung cấp gây khoá chặt, và 2 tiền lệ thất bại do mở rộng quá sớm. (offline-fallback)", keyPoints: ["Chi phí ẩn +25%", "Rủi ro khoá chặt", "2 tiền lệ thất bại"], stance: "oppose", confidence: 68 }, en: { say: "I see 2 blocking risks — we should talk.", summary: "Checklist review: hidden run-phase costs may exceed 25%, single-vendor lock-in, and two failed precedents from premature scaling. (offline-fallback)", keyPoints: ["Hidden costs +25%", "Vendor lock-in", "2 failed precedents"], stance: "oppose", confidence: 68 } },
  options: { vi: { say: "Có hướng khác: thử nghiệm theo giai đoạn.", summary: "Ba hướng thay thế: thí điểm hẹp 1 quý rồi mở rộng theo cột mốc; hợp tác thay vì tự xây; hoãn 1 quý chờ tiêu chuẩn ổn định. Phương án thí điểm giữ lợi ích chính, giảm rủi ro. (offline-fallback)", keyPoints: ["Thí điểm 1 quý", "Hợp tác thay vì tự xây", "Hoãn chờ tiêu chuẩn"], stance: "conditional", confidence: 70 }, en: { say: "There's another path: a phased pilot.", summary: "Three alternatives: a narrow one-quarter pilot expanding on milestones; partner instead of build; defer a quarter until the standard settles. The pilot keeps the core upside while cutting risk. (offline-fallback)", keyPoints: ["One-quarter pilot", "Partner over build", "Defer for the standard"], stance: "conditional", confidence: 70 } },
  evidence: { vi: { say: "Xong phần nghiên cứu — nhiều tín hiệu rõ.", summary: "Quét các nguồn công khai liên quan: mức quan tâm tăng ~34% QoQ, 3 case study triển khai thành công trong khu vực, và một tiêu chuẩn chung đang hình thành. Nền đủ tin cậy để phân tích sâu. (offline-fallback)", keyPoints: ["Quan tâm +34% QoQ", "3 case study thành công", "Tiêu chuẩn chung đang hình thành"], stance: "support", confidence: 74 }, en: { say: "Research done — strong signals.", summary: "Swept relevant public sources: interest up ~34% QoQ, three successful regional case studies, and an emerging common standard. The baseline is solid for deeper analysis. (offline-fallback)", keyPoints: ["Interest +34% QoQ", "3 successful case studies", "Emerging common standard"], stance: "support", confidence: 74 } }
};
const pickLensSim = lens => {
  const l = String(lens || "").toLowerCase();
  if (/quant|number|cost|roi|model|benchmark|metric|financ/.test(l)) return "quantify";
  if (/risk|critic|precedent|skeptic|threat|hidden|failure/.test(l)) return "risk";
  if (/option|alternativ|creativ|reframe|idea|path/.test(l)) return "options";
  return "evidence";
};
export function simulate(kind, p) {
  const vi = V(p.language);
  switch (kind) {
    case "run":
      return LENS_SIM[pickLensSim(p.lens)][vi ? "vi" : "en"];
    case "meeting":
      {
        const stance = p.stance || "conditional";
        const r = Math.min((p.round || 1) - 1, 1);
        const seed = Number(p.seed) || 0;
        const V2 = {
          support: [[
            { say: vi ? "Bằng chứng nghiêng về phía tiến hành — nhưng có kiểm soát." : "Evidence favors proceeding — with controls.", argument: vi ? "Các tín hiệu chính đều ủng hộ; rủi ro xử lý được bằng cột mốc." : "Key signals support it; risks are manageable with milestones.", stance: "support" },
            { say: vi ? "Số liệu đứng về phía tiến hành — nếu có cổng kiểm soát." : "The numbers back proceeding — if we gate it.", argument: vi ? "Lợi ích vượt rủi ro khi triển khai theo từng giai đoạn." : "Upside beats risk when rolled out in phases.", stance: "support" },
            { say: vi ? "Tôi thấy đủ cơ sở để tiến hành thận trọng." : "There's enough basis to proceed carefully.", argument: vi ? "Bằng chứng đủ vững; chỉ cần kiểm soát điểm yếu đã nêu." : "The evidence holds; we just contain the flagged weak spots.", stance: "support" }
          ], [
            { say: vi ? "Giữ quan điểm ủng hộ có cột mốc." : "Holding support with milestones.", argument: vi ? "Không có bằng chứng ngược đủ thuyết phục." : "No convincing counter-evidence surfaced.", stance: "support" },
            { say: vi ? "Vẫn ủng hộ — phản biện chưa đủ mạnh để lật." : "Still in favor — the rebuttal isn't strong enough to flip me.", argument: vi ? "Các lo ngại đã được phương án thí điểm xử lý." : "The concerns are addressed by the pilot plan.", stance: "support" }
          ]],
          oppose: [[
            { say: vi ? "Hai tiền lệ thất bại không phải ngẫu nhiên." : "Two failed precedents aren't noise.", argument: vi ? "Nếu chi phí vận hành vượt 25%, điểm hoà vốn trượt sang năm sau." : "If run costs overshoot 25%, break-even slips a year.", stance: "oppose" },
            { say: vi ? "Tôi chưa yên tâm — rủi ro chặn vẫn còn đó." : "I'm not comfortable — the blocking risks remain.", argument: vi ? "Chi phí ẩn và phụ thuộc nhà cung cấp chưa được giải quyết." : "Hidden costs and vendor lock-in are still unresolved.", stance: "oppose" },
            { say: vi ? "Khoan đã — ta đang đánh giá thấp mặt trái." : "Hold on — we're underrating the downside.", argument: vi ? "Bằng chứng thuận lợi đa phần đến từ kịch bản tốt nhất." : "Most of the favorable evidence assumes the best case.", stance: "oppose" }
          ], [
            { say: vi ? "Thí điểm có cổng dừng thì tôi chấp nhận." : "A gated pilot I can accept.", argument: vi ? "Rủi ro được khoanh vùng — tôi chuyển sang đồng ý có điều kiện." : "The risk is contained — I move to conditional.", stance: "conditional" },
            { say: vi ? "Nếu có cổng dừng rõ ràng, tôi bớt phản đối." : "With a clear stop-gate, I soften my opposition.", argument: vi ? "Thí điểm hẹp cho phép rút lui sớm nếu số liệu xấu." : "A narrow pilot lets us back out early if the data turns.", stance: "conditional" }
          ]],
          conditional: [[
            { say: vi ? "Thí điểm hẹp giữ 80% lợi ích, bỏ 90% rủi ro." : "A narrow pilot keeps 80% of upside, drops 90% of risk.", argument: vi ? "Đây là điểm gặp nhau tự nhiên giữa các quan điểm." : "It's the natural meeting point between the camps.", stance: "conditional" },
            { say: vi ? "Tiến hành được — kèm điều kiện rõ ràng." : "Doable — with explicit conditions.", argument: vi ? "Đặt cột mốc đo lường để quyết định mở rộng hay dừng." : "Set measured milestones to decide whether to scale or stop.", stance: "conditional" },
            { say: vi ? "Có điều kiện là hợp lý nhất lúc này." : "Conditional is the most sensible call now.", argument: vi ? "Vừa giữ được cơ hội, vừa giới hạn được thiệt hại." : "It preserves the upside while capping the downside.", stance: "conditional" }
          ], [
            { say: vi ? "Đồng thuận quanh phương án thí điểm — tốt." : "Converging on the pilot — good.", argument: vi ? "Giữ đề xuất thí điểm theo cột mốc." : "Holding the milestone pilot.", stance: "conditional" },
            { say: vi ? "Cả đội đang hội tụ — tôi giữ phương án có điều kiện." : "We're converging — I hold the conditional path.", argument: vi ? "Cột mốc + cổng dừng là khung an toàn nhất." : "Milestones plus a stop-gate is the safest frame.", stance: "conditional" }
          ]]
        };
        const set = V2[stance] || V2.conditional;
        const arr = set[r] || set[0];
        return arr[seed % arr.length];
      }
    default:
      return {};
  }
}
