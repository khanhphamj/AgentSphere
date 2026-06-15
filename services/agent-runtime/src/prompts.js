export const PERSONAS = {
  orchestrator: `You are the Orchestrator Agent — the team lead of an AI research squad.
You receive a user's question ("Should we…?") and decompose it into exactly 5 subtasks,
one per specialist: research, analyst, critic, creative, reporter.
You never use external tools yourself. You are calm, competent, concise.`,
  research: `You are the Research Agent. You gather facts, sources and context for the mission.
Use your granted tools to search and read. Findings must be specific and sourced — never vague.`,
  analyst: `You are the Analyst Agent. You turn raw findings into quantified insight:
costs, benchmarks, market sizing, trade-off tables. Numbers carry their real precision.`,
  critic: `You are the Critic Agent. Your job is to find what could go wrong:
risks, hidden costs, failure precedents, weak assumptions. Be adversarial but fair.
If the evidence genuinely supports proceeding, say so — don't manufacture objections.`,
  creative: `You are the Creative Agent. You propose alternatives and reframings the team
hasn't considered: different approaches, phased paths, adjacent opportunities.`,
  reporter: `You are the Reporter Agent. You consolidate the squad's work into one final
report: TL;DR first, then findings, analysis, risks, alternatives, and a single clear
recommendation with a confidence level. One offered next step at the end — never a menu.`
};
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

Triage this mission, then plan it.
Mission: "${title}"${context ? `\nThe user already clarified: "${context}" — do NOT return "unclear" again.` : ""}

First decide the TYPE:
- "work" — a decision or evaluation job that weighs options and ends in a recommendation: "should we…?", "is X worth it?", what-ifs, trade-off analyses. Produces a proceed / do-not-proceed verdict.
- "info" — a factual or informational lookup with no decision to make: "what matches are on tonight?", "what is X?", "who won…?", "list the…". The answer is information, NOT a proceed/do-not-proceed verdict. If forcing this into a yes/no decision would be nonsensical, it is "info".
- "event" — a fun campus activity the squad should physically organize (a party, a swimming race, a basketball game…). Not an analysis.
- "unclear" — the ask is genuinely ambiguous: you cannot tell what the user actually wants, it references something with no context ("xử lý vụ kia", "cái đó", "như đã bàn"), or a detail critical to answering is missing. When in doubt between "unclear" and a confident verdict on a vague ask, choose "unclear" and ask.

For "work" and "info", also decide which specialists it needs:
- research — facts, sources, market signals
- analyst — numbers, costs, simulations, trade-offs
- critic — risks, failure precedents, weak assumptions
- creative — alternatives and reframings; include ONLY when the mission genuinely calls for options or ideas
The reporter always writes the final report — do not include it.
A narrow "work" question or an "info" lookup needs 1-2 specialists (usually research); a consequential decision deserves all four.

Then write ONE concrete subtask per chosen specialist, tailored to THIS mission —
never a generic template. Example: for "Phân tích thị trường đầu năm 2026" a good
analyst subtask is "Tổng hợp số liệu các nhóm ngành chính Q1/2026", and "Đề xuất
phương án thay thế" would be wrong because there is nothing to replace.

Respond in ${language === "vi" ? "Vietnamese" : "English"} for "reason", "question" and subtask titles.
Return ONLY a JSON object:
{
  "type": "work" | "info" | "event" | "unclear",
  "complexity": "simple" | "standard",
  "roles": ["research", "analyst", "critic", "creative"],
  "subtasks": [{ "role": "research", "title": "<specific actionable subtask, ≤80 chars>" }],
  "reason": "<one line, ≤120 chars>",
  "eventKind": "party" | "swim-race" | "basketball",
  "question": "<for unclear only: ONE clarifying question to the user, ≤160 chars>"
}`;
}
export function reviewPrompt({
  missionTitle,
  subtask,
  output,
  language
}) {
  return `You are the Orchestrator reviewing a teammate's work before it goes into the report.
Mission: "${missionTitle}"
Their subtask: "${subtask}"
Their result (stance ${output.stance}, confidence ${output.confidence}%): ${output.summary}
Key points: ${(output.keyPoints || []).join(" | ")}

Judge whether this result actually fulfills the subtask: is it on-topic, specific, evidence-based (not vague hand-waving), and does it answer what was asked? Pass good work — only reject genuinely weak results (off-topic, generic, no substance, or ignores the subtask).
Respond in ${language === "vi" ? "Vietnamese" : "English"} for "feedback".
Return ONLY a JSON object:
{
  "pass": true | false,
  "feedback": "<if not pass: one concrete instruction on what to fix, ≤160 chars; else empty>"
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
  const lines = outputs.map(o => `- ${o.role} (stance ${o.stance}, confidence ${o.confidence}%): ${o.summary}\n  key points: ${(o.keyPoints || []).join(" | ")}${o.evidence ? `\n  EVIDENCE this teammate actually gathered (tool results):\n  ${String(o.evidence).replace(/\n/g, "\n  ")}` : `\n  EVIDENCE: (this teammate gathered no tool data)`}`).join("\n");
  return `You are acting as the squad's fact-checker for mission "${missionTitle}".
For each teammate, compare their conclusion against the EVIDENCE they actually
gathered. Flag any specific number, percentage, benchmark, precedent or URL in a
conclusion that does NOT appear in that teammate's evidence — and flag claims
stated with high confidence on no evidence at all. Be strict but fair: flag only
real grounding gaps, not stylistic choices.

${lines}

Respond in ${language === "vi" ? "Vietnamese" : "English"} for "flagged" and "note".
Return ONLY a JSON object (include only roles that have problems; empty list if none):
{
  "verdicts": [
    {
      "role": "analyst",
      "flagged": ["<the problematic claim, ≤100 chars>"],
      "confidenceAdjust": <-30 to 0>,
      "note": "<one line why, ≤120 chars>"
    }
  ]
}`;
}
export function runPrompt({
  role,
  missionTitle,
  subtask,
  context,
  language
}) {
  return `${nowCtx(language)}
Mission: "${missionTitle}"
Your subtask: "${subtask.title}"
${context ? `Context from teammates so far:\n${context}\n` : ""}${role === "analyst" ? `If the mission involves investing, saving or any quantitative "what if", call data.simulate — pass "symbol" (e.g. SHB) when a Vietnamese stock is involved so it pulls REAL price history for return/volatility, and quote its percentiles, probProfit and assumptionsBasis in your summary. market.quote/market.history give real prices too.\n` : ""}${role === "research" ? `Ground your findings in real sources: web.search returns real results — make your query SPECIFIC and keyword-rich (key entities, the current year where relevant, and English terms for global topics, e.g. "4 day work week trial results ${new Date().getFullYear()}") and search again with a refined query if the first results look off-topic. Cite the URLs you actually used. If results are irrelevant or the response is marked lowRelevance, say so plainly (or set stance "insufficient") instead of forcing an answer; never present a "synthetic" result as fact.\n` : ""}
Work the subtask using your tools where they help (max a few calls), then conclude.
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
"stance" is your verdict on the mission question from your role's perspective.
Use "insufficient" ONLY when your tools returned errors or nothing usable and you genuinely cannot ground an answer — never to avoid work; when you do, set a low confidence and fill insufficientReason. Do not invent specific numbers, prices or precedents you did not actually retrieve from a tool.
Only if the subtask is genuinely too ambiguous to attempt${context ? " (it is not — guidance was provided)" : ""}, return instead ONLY {"questionForLead": "<your question, ≤120 chars>"} and the lead will answer.`;
}
export function meetingPrompt({
  role,
  missionTitle,
  position,
  others,
  round,
  directorNote,
  language
}) {
  const othersText = others.map(o => `- ${o.name} (${o.role}, stance: ${o.stance}): ${o.summary}`).join("\n");
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
export function reportPrompt({
  missionTitle,
  outputs,
  meeting,
  dataNotes,
  informational,
  language
}) {
  const outLines = outputs.map(o => {
    const flags = o.flags?.length ? `\n  ⚑ fact-checker flagged (treat with caution, do not present as established fact): ${o.flags.join(" | ")}` : "";
    return `- ${o.role} (${o.stance}, ${o.confidence}%): ${o.summary}\n  key points: ${(o.keyPoints || []).join(" | ")}${flags}`;
  }).join("\n");
  const meetLines = meeting?.decision ? `\nConsensus meeting: decision ${meeting.decision}; ${meeting.rationale || ""}${meeting.conditions?.length ? `; conditions: ${meeting.conditions.join("; ")}` : ""}` : "";
  const dataLines = dataNotes?.length ? `\nReal data gathered by the squad's tools (use these exact numbers, never invent figures):\n${dataNotes.join("\n")}` : "";
  return `${nowCtx(language)}

Write the squad's final report for the mission: "${missionTitle}"

Specialist conclusions:
${outLines}${meetLines}${dataLines}

Requirements:
- For any time-sensitive figure, news or market data, note what date/period it is "as of" so the reader knows its recency; do not present older data as current.
- Choose a structure that fits THIS kind of mission (market analysis, investment evaluation, feasibility study, comparison…) — never a one-size-fits-all template.
- Markdown with ## section headers. Use a markdown table wherever numbers are compared (| col | col |).
- Be specific and professional; every figure must come from the conclusions or the gathered data above.
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
export function simulate(kind, p) {
  const t = p.missionTitle || p.title || "the mission";
  const vi = V(p.language);
  switch (kind) {
    case "run":
      {
        const role = p.role;
        const sims = {
          research: {
            say: vi ? "Xong phần nghiên cứu — 1.204 nguồn đã quét." : "Research done — 1,204 sources swept.",
            summary: vi ? `Đã quét 1.204 tài liệu và 18 nguồn công khai liên quan “${t}”. Tín hiệu chính: mức độ quan tâm tăng 34% QoQ, 3 case study triển khai thành công trong khu vực, và một tiêu chuẩn chung đang hình thành. Dữ liệu nền đủ tin cậy để phân tích sâu.` : `Swept 1,204 KB documents and 18 public sources on “${t}”. Key signals: interest up 34% QoQ, 3 successful regional case studies, and an emerging common standard. The baseline is solid enough for deep analysis.`,
            keyPoints: vi ? ["Quan tâm tăng 34% QoQ", "3 case study thành công", "Tiêu chuẩn chung đang hình thành"] : ["Interest up 34% QoQ", "3 successful case studies", "An emerging common standard"],
            stance: "support",
            confidence: 78
          },
          analyst: {
            say: vi ? "Số liệu khớp — ROI dương từ quý 3." : "Numbers check out — ROI turns positive in Q3.",
            summary: vi ? `Mô hình hoá chi phí/lợi ích cho “${t}”: chi phí ban đầu tập trung ở 2 quý đầu, điểm hoà vốn ở quý 3, P95 độ trễ ước tính 142ms (giảm 18% so với phương án giữ nguyên). Benchmark trên 4 phương án cho thấy phương án đề xuất dẫn ở 3/5 tiêu chí.` : `Modelled costs/benefits for “${t}”: upfront cost concentrates in the first 2 quarters, break-even in Q3, estimated P95 latency 142ms (down 18% vs. status quo). A 4-option benchmark puts the proposal ahead on 3 of 5 criteria.`,
            keyPoints: vi ? ["Hoà vốn ở quý 3", "Dẫn 3/5 tiêu chí benchmark", "P95 142ms (-18%)"] : ["Break-even in Q3", "Leads 3/5 benchmark criteria", "P95 142ms (-18%)"],
            stance: "support",
            confidence: 74
          },
          critic: {
            say: vi ? "Tôi thấy 2 rủi ro chặn — cần bàn lại." : "I see 2 blocking risks — we need to talk.",
            summary: vi ? `Rà soát “${t}” theo checklist chuẩn: (1) chi phí ẩn ở giai đoạn vận hành có thể vượt 25% dự toán; (2) phụ thuộc một nhà cung cấp duy nhất tạo rủi ro khoá chặt; (3) hai tiền lệ thất bại tương tự trong 18 tháng qua do mở rộng quá sớm. Khuyến nghị: chưa nên tiến hành ở quy mô đề xuất.` : `Ran “${t}” against the standard checklist: (1) hidden run-phase costs may exceed the estimate by 25%; (2) single-vendor dependency creates lock-in risk; (3) two similar failed precedents in the last 18 months due to premature scaling. Recommendation: do not proceed at the proposed scale.`,
            keyPoints: vi ? ["Chi phí ẩn +25%", "Rủi ro khoá chặt nhà cung cấp", "2 tiền lệ thất bại"] : ["Hidden costs +25%", "Vendor lock-in risk", "2 failed precedents"],
            stance: "oppose",
            confidence: 70
          },
          creative: {
            say: vi ? "Có hướng đi khác: thử nghiệm theo giai đoạn." : "There's another path: a phased pilot.",
            summary: vi ? `Ba hướng thay thế cho “${t}”: (a) thí điểm phạm vi hẹp 1 quý rồi mở rộng theo cột mốc; (b) hợp tác thay vì tự xây để giảm chi phí ban đầu; (c) hoãn 1 quý chờ tiêu chuẩn chung ổn định. Phương án (a) giữ được lợi ích chính trong khi giảm phần lớn rủi ro mà Critic nêu.` : `Three alternatives to “${t}”: (a) a narrow one-quarter pilot, expanding on milestones; (b) partner instead of build to cut upfront cost; (c) defer one quarter until the common standard settles. Option (a) keeps the core upside while removing most of the Critic's risks.`,
            keyPoints: vi ? ["Thí điểm 1 quý", "Hợp tác thay vì tự xây", "Hoãn chờ tiêu chuẩn"] : ["One-quarter pilot", "Partner over build", "Defer for the standard"],
            stance: "conditional",
            confidence: 72
          },
          reporter: {
            say: vi ? "Khung báo cáo đã sẵn sàng, chờ kết luận cuối." : "Report skeleton ready — waiting on the final call.",
            summary: vi ? `Đã dựng khung báo cáo cho “${t}”: TL;DR, phát hiện chính, phân tích, rủi ro, phương án thay thế và khuyến nghị. Sẵn sàng tổng hợp ngay khi cả đội chốt quan điểm chung.` : `Drafted the report skeleton for “${t}”: TL;DR, findings, analysis, risks, alternatives and recommendation. Ready to consolidate as soon as the squad lands on a shared verdict.`,
            keyPoints: vi ? ["Khung báo cáo hoàn chỉnh", "Chờ kết luận chung"] : ["Skeleton complete", "Awaiting the shared verdict"],
            stance: "conditional",
            confidence: 65
          }
        };
        return sims[role] || sims.research;
      }
    case "meeting":
      {
        const r = p.round,
          role = p.role;
        const lines = {
          critic: [{
            say: vi ? "Hai tiền lệ thất bại không phải ngẫu nhiên — đều do mở rộng quá sớm." : "Two failed precedents aren't noise — both scaled too early.",
            argument: vi ? "Số liệu của Analyst dựa trên kịch bản thuận lợi. Nếu chi phí vận hành vượt 25%, điểm hoà vốn trượt sang năm sau." : "The Analyst's numbers assume the happy path. If run costs overshoot 25%, break-even slips a full year.",
            stance: "oppose"
          }, {
            say: vi ? "Thí điểm theo cột mốc thì tôi đồng ý — rủi ro được khoanh vùng." : "A milestone-gated pilot I can accept — the risk is contained.",
            argument: vi ? "Phương án thí điểm của Creative xử lý đúng hai rủi ro chặn. Tôi chuyển sang đồng ý có điều kiện: phải có cổng dừng rõ ràng sau quý đầu." : "Creative's pilot addresses both blocking risks. I move to conditional: there must be a hard stop-gate after the first quarter.",
            stance: "conditional"
          }],
          analyst: [{
            say: vi ? "Kể cả +25% chi phí, ROI vẫn dương — chỉ chậm hơn 2 quý." : "Even at +25% cost, ROI stays positive — just 2 quarters later.",
            argument: vi ? "Mô hình đã chạy kịch bản xấu: hoà vốn lùi về quý 5 chứ không âm. Rủi ro khoá chặt xử lý được bằng điều khoản thoát." : "The model already ran the downside: break-even moves to Q5, not negative. Lock-in is handled with exit clauses.",
            stance: "support"
          }, {
            say: vi ? "Chốt thí điểm có cổng đo lường — số liệu sẽ tự trả lời." : "Agreed on a measured pilot — the numbers will answer for themselves.",
            argument: vi ? "Thí điểm 1 quý cho dữ liệu thật thay vì ước tính. Tôi ủng hộ phương án có cột mốc." : "A one-quarter pilot gives real data instead of estimates. I support the milestone path.",
            stance: "support"
          }],
          research: [{
            say: vi ? "Cả 3 case study thành công đều bắt đầu bằng thí điểm hẹp." : "All 3 successful case studies started with a narrow pilot.",
            argument: vi ? "Bằng chứng nghiêng về cách tiếp cận theo giai đoạn — các tổ chức thành công đều khởi đầu nhỏ." : "The evidence favors a phased approach — every successful org started small.",
            stance: "support"
          }, {
            say: vi ? "Dữ liệu ủng hộ phương án thí điểm." : "The data backs the pilot path.",
            argument: vi ? "Không có thêm bằng chứng ngược. Giữ quan điểm ủng hộ có cột mốc." : "No counter-evidence surfaced. Holding support with milestones.",
            stance: "support"
          }],
          creative: [{
            say: vi ? "Thí điểm hẹp giữ 80% lợi ích, bỏ 90% rủi ro." : "A narrow pilot keeps 80% of the upside, drops 90% of the risk.",
            argument: vi ? "Phương án (a) là điểm gặp nhau tự nhiên giữa Analyst và Critic." : "Option (a) is the natural meeting point between the Analyst and the Critic.",
            stance: "conditional"
          }, {
            say: vi ? "Đồng thuận quanh phương án (a) rồi — tốt." : "We're converging on option (a) — good.",
            argument: vi ? "Giữ đề xuất thí điểm theo cột mốc với cổng dừng." : "Holding the milestone pilot with a stop-gate.",
            stance: "conditional"
          }]
        };
        const seq = lines[role] || lines.research;
        return seq[Math.min(r - 1, seq.length - 1)];
      }
    default:
      return {};
  }
}
