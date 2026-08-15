import { emit } from "./events.js";
import { getSquadFor, leadOf, poolOf } from "./squad.js";
import { briefingStore, calibrationStore, missionStore } from "./db.js";
const RUNTIME_URL = (process.env.AGENT_RUNTIME_URL || "http://localhost:8082").replace(/\/$/, "");
const SELF_URL = (process.env.ORCHESTRATOR_SELF_URL || "http://localhost:8081").replace(/\/$/, "");
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
const MAX_PHASES = Math.max(1, Number(process.env.MAX_PHASES || 3));
const INTERAGENT_BUS = process.env.INTERAGENT_BUS === "on";
const HEADERS = {
  "content-type": "application/json",
  "x-client-id": CLIENT_ID,
  "x-client-secret": CLIENT_SECRET
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TOPIC_MAP = [
  [/hir|tuyển|nhân sự|layoff|sa thải/i, "hiring"],
  [/invest|đầu tư|cổ phiếu|stock|fund|tài chính|finance|budget|ngân sách/i, "finance"],
  [/market|thị trường|launch|ra mắt|product|sản phẩm|pricing|giá/i, "product/market"],
  [/tech|công nghệ|migrat|stack|infra|model|nền tảng/i, "technology"],
  [/partner|hợp tác|acqui|merg|sáp nhập/i, "partnership"],
  [/legal|pháp lý|complian|risk|rủi ro|policy/i, "risk/legal"]
];
const topicOf = title => {
  const t = String(title || "");
  for (const [re, name] of TOPIC_MAP) if (re.test(t)) return name;
  return "general";
};
const fragilityOf = stances => {
  const s = (stances || []).filter(o => o && o.stance);
  const S = s.filter(o => o.stance === "support").length;
  const O = s.filter(o => o.stance === "oppose").length;
  const C = s.filter(o => o.stance === "conditional").length;
  const V = S + O + C;
  if (V < 1) return null;
  const sorted = [S, O, C].sort((a, b) => b - a);
  const margin = (sorted[0] - sorted[1]) / V;
  const robustness = Math.round(100 * (0.5 + margin / 2));
  return {
    robustness,
    label: robustness >= 75 ? "solid" : robustness >= 60 ? "moderate" : "brittle",
    knifeEdge: V >= 2 && sorted[0] - sorted[1] <= 1,
    split: { support: S, oppose: O, conditional: C }
  };
};
export function computeQuorum(outputs) {
  const list = Array.isArray(outputs) ? outputs : [];
  const total = list.length;
  const takenOver = list.filter(o => o && o.takeover).length;
  const simulated = list.filter(o => o && o.simulated).length;
  return { total, byAdvisors: total - takenOver, takenOver, simulated };
}
const pace = (m, ms) => sleep(m && m.auto ? 0 : Math.round(ms * 0.55));
const firstSentence = s => String(s || "").split(/(?<=[.!?。])\s/)[0].slice(0, 200);
async function runtime(path, body, signal, userEmail) {
  const backoffs = [1500, 4000];
  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(360_000);
    let res;
    try {
      res = await fetch(`${RUNTIME_URL}${path}`, {
        method: "POST",
        headers: userEmail ? { ...HEADERS, "x-user-email": userEmail } : HEADERS,
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      const code = err && (err.cause && err.cause.code || err.code);
      const retryable = err && err.name !== "TimeoutError" && ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH", "UND_ERR_CONNECT_TIMEOUT"].includes(code);
      if (retryable && attempt < backoffs.length) {
        await sleep(backoffs[attempt]);
        continue;
      }
      throw err;
    }
    if (!res.ok) throw new Error(`${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
}
const detectLanguage = text => /[àáảãạăâđèéẻẽẹêìíỉĩịòóỏõọôơùúủũụưỳýỷỹỵ]/i.test(text) ? "vi" : "en";
const STATUS_TITLE = /agent unresponsive|unusable format|revive to reload|reload its checkpoint|bring the agent back online|model unreachable|model answered in an|denied by policy|superseded by a new mission|all specialists failed|all workers failed|✗|⚑|model 404|429 too many/i;
export function isStatusTitle(title) {
  const t = String(title || "").trim();
  if (!t) return true;
  if (STATUS_TITLE.test(t)) return true;
  return false;
}
export function createMission(title) {
  return {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    language: detectLanguage(title),
    status: "planning",
    createdAt: Date.now(),
    subtasks: [],
    outputs: [],
    phases: [],
    blackboard: [],
    mailbox: [],
    board: [],
    agentRuns: [],
    steers: [],
    meeting: null,
    report: null
  };
}
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));
function localReport(m, vi, opts = {}) {
  const outs = (m.outputs || []).filter(o => o && !o.failed && !o.simulated);
  if (opts.insufficient || !outs.length) return {
    markdown: vi
      ? "> ⚠️ **Không thể hoàn tất:** các model đều không phản hồi nên chưa có phân tích trực tiếp. Hãy chạy lại nhiệm vụ sau ít phút."
      : "> ⚠️ **Could not complete:** every model was unreachable, so no live analysis was produced. Please retry the mission shortly.",
    recommendation: vi ? "Chưa đủ dữ liệu để kết luận — hãy chạy lại." : "Insufficient data to conclude — please retry.",
    confidence: 10,
    confidenceRationale: vi ? "Không có phân tích trực tiếp nào khả dụng." : "No live analysis was available.",
    say: vi ? "Xin lỗi, tôi chưa hoàn tất được — hãy thử lại." : "Sorry — I couldn't complete this. Please retry."
  };
  const tally = s => outs.filter(o => o.stance === s).length;
  const support = tally("support"), oppose = tally("oppose"), conditional = tally("conditional");
  const rec = oppose > support
    ? (vi ? "Nghiêng về việc KHÔNG tiến hành." : "Leans against proceeding.")
    : conditional >= Math.max(support, oppose)
      ? (vi ? "Tiến hành nhưng có điều kiện." : "Proceed, with conditions.")
      : (vi ? "Nghiêng về việc tiến hành." : "Leans toward proceeding.");
  const confs = outs.map(o => o.confidence).filter(c => typeof c === "number");
  const conf = Math.max(5, Math.min(90, (confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 45) - 12));
  const notes = outs.map(o => `- **${o.name} — ${o.focus}** (${o.stance || "?"}, ${o.confidence ?? "?"}%): ${firstSentence(o.summary || o.say || "")}`).join("\n");
  const banner = vi
    ? "> ⚠️ **Tạm thời:** báo cáo được dựng tại chỗ vì bước tổng hợp cuối không phản hồi — hãy coi là sơ bộ.\n\n"
    : "> ⚠️ **Provisional:** this report was assembled locally because the final rendering step was unavailable — treat it as preliminary.\n\n";
  return {
    markdown: `${banner}## ${m.title}\n\n${rec}\n\n### Advisor notes\n${notes}`,
    recommendation: rec,
    confidence: conf,
    confidenceRationale: vi ? "Dựng tại chỗ từ kết luận của các advisor." : "Assembled locally from advisor conclusions.",
    say: vi ? "Đây là bản tổng hợp tạm thời." : "Here's a provisional synthesis."
  };
}

export async function runMission(mission, { signal } = {}) {
  const m = mission;
  const squad = Array.isArray(m.squad) && m.squad.length ? m.squad : getSquadFor(m.userEmail);
  const rt = (path, body) => runtime(path, body, signal, m.userEmail);
  const lead = leadOf(squad);
  const pool = poolOf(squad);
  const vi = m.language === "vi";
  const agentById = id => squad.find(a => a.id === id) || lead;
  m.subtasks = m.subtasks || [];
  m.outputs = m.outputs || [];
  m.phases = m.phases || [];
  m.blackboard = m.blackboard || [];
  m.mailbox = m.mailbox || [];
  m.board = m.board || [];
  let nextSub = 0;
  const pushBlackboard = (outputs, synthesis) => {
    for (const o of outputs) if (o.summary) m.blackboard.push(`${o.name} — ${o.focus}: ${firstSentence(o.summary)}`);
    if (synthesis?.phaseSummary) m.blackboard.push(`${vi ? "Tổng hợp của lead" : "Lead synthesis"}: ${synthesis.phaseSummary}`);
    m.blackboard = m.blackboard.slice(-14);
  };
  const emitTools = (agentId, out) => {
    for (const tc of out.toolCalls || []) emit(m.id, "agent.tool", {
      agentId,
      server: tc.server,
      tool: tc.tool,
      allowed: tc.allowed,
      reason: tc.reason || null,
      result: tc.result || null,
      args: tc.args || null
    });
  };
  try {
    emit(m.id, "mission.created", { title: m.title, language: m.language, squad });
    const planP = rt("/plan", {
      title: m.title,
      context: m.clarifyAnswer || "",
      language: m.language,
      model: lead.models || lead.model
    });
    await pace(m, 800);
    emit(m.id, "phase.gather", { place: "meeting" });
    let plan;
    try {
      [plan] = await Promise.all([planP, pace(m, 5000)]);
    } catch (err) {
      if (signal?.aborted) throw err;
      console.warn(`[orchestrator] plan failed — degrading to insufficient report: ${err.message}`);
      plan = { approach: "", phase: null, assessment: null };
      m.insufficient = true;
    }
    if (plan.assessment?.type === "unclear" && !m.clarifyAnswer && !m.auto) {
      m.status = "clarifying";
      m.clarifyRequestedAt = Date.now();
      m.clarifyQuestion = plan.assessment.question;
      emit(m.id, "mission.clarify", { agentId: lead.id, question: plan.assessment.question });
      emit(m.id, "phase.disperse", {});
      return;
    }
    if (m.auto && plan.assessment?.type === "unclear") m.clarifyAnswer = m.clarifyAnswer || "Automated scheduled run — proceed with your best interpretation of the standing brief.";
    if (plan.assessment?.type === "event") {
      return await runEvent(m, plan.assessment, signal);
    }
    m.assessment = plan.assessment || null;
    const informational = !!m.assessment?.informational;
    const complexity = m.assessment?.complexity || "standard";
    emit(m.id, "agent.say", { agentId: lead.id, say: plan.approach || (vi ? "Bắt đầu nhé." : "Let's begin."), tone: null });
    await pace(m, 2600);
    m.status = "executing";

    const runWorker = async (sub, stage, blackboard, peerDrafts) => {
      const agent = agentById(sub.agentId);
      let inbox = [];
      if (INTERAGENT_BUS) {
        inbox = (m.mailbox || []).filter(msg => msg.to === agent.id && !msg.read).map(msg => ({ from: msg.from, body: msg.body }));
        for (const msg of m.mailbox || []) if (msg.to === agent.id && !msg.read) msg.read = true;
      }
      const base = {
        missionId: m.id,
        role: "worker",
        agent,
        agentId: agent.id,
        assignment: { focus: sub.title, lens: sub.lens },
        missionTitle: m.title,
        complexity,
        informational,
        userEmail: m.userEmail || null,
        language: m.language,
        ...(INTERAGENT_BUS ? { busUrl: `${SELF_URL}/missions/${m.id}/bus`, roster: squad.map(a => ({ id: a.id, name: a.name })), inbox } : {})
      };
      let out;
      try {
        out = await rt("/run", { ...base, stage, blackboard, peerDrafts, context: m.clarifyAnswer ? `${vi ? "Người dùng làm rõ" : "The user clarified"}: ${m.clarifyAnswer}` : "" });
        if (stage === "draft" && out.questionForLead) {
          emit(m.id, "agent.question", { agentId: agent.id, leadId: lead.id, question: out.questionForLead });
          await pace(m, 4000);
          const guidance = await rt("/lead-answer", { agent: lead, missionTitle: m.title, question: out.questionForLead, language: m.language });
          emit(m.id, "agent.answer", { agentId: lead.id, to: agent.id, answer: guidance.answer });
          await pace(m, 2500);
          out = await rt("/run", { ...base, stage, blackboard, context: `${m.clarifyAnswer ? `${vi ? "Người dùng làm rõ" : "The user clarified"}: ${m.clarifyAnswer}\n` : ""}${vi ? "Lead hướng dẫn" : "Lead's guidance"} ("${out.questionForLead}"): ${guidance.answer}` });
        }
      } catch (e) {
        if (signal?.aborted) throw e;
        out = { failed: true, error: String(e.message || e).slice(0, 200) };
      }
      emitTools(agent.id, out);
      if (stage === "draft" && out.failed) {
        emit(m.id, "agent.progress", { agentId: agent.id, sub: sub.id, status: "failed", error: out.error || "model unreachable" });
        const takeoverCap = Math.max(2, Math.round(pool.length / 2));
        if ((m._leadTakeovers || 0) >= takeoverCap) return null;
        m._leadTakeovers = (m._leadTakeovers || 0) + 1;
        emit(m.id, "agent.takeover", { agentId: lead.id, from: agent.id, sub: sub.id, reason: out.error || "model unreachable" });
        emit(m.id, "agent.say", { agentId: lead.id, say: vi ? `${agent.name} gặp sự cố — để tôi tiếp quản phần việc này.` : `${agent.name} hit an error — I'll take this one over.` });
        await pace(m, 2200);
        emit(m.id, "agent.progress", { agentId: lead.id, sub: sub.id, status: "doing", title: sub.title, takeover: { from: agent.id, fromName: agent.name } });
        try {
          out = await rt("/run", { ...base, agent: lead, agentId: lead.id, stage, blackboard, context: `${m.clarifyAnswer ? `${vi ? "Người dùng làm rõ" : "The user clarified"}: ${m.clarifyAnswer}\n` : ""}${vi ? `Worker được giao không hoàn thành (lỗi: ${out.error || "model lỗi"}). Là lead, hãy tự làm phần việc này.` : `The assigned worker could not complete this (error: ${out.error || "model failure"}). As the lead, take it over and complete it yourself.`}` });
        } catch (e) {
          if (signal?.aborted) throw e;
          out = { failed: true, error: String(e.message || e).slice(0, 200) };
        }
        emitTools(lead.id, out);
        if (out.failed) {
          emit(m.id, "agent.progress", { agentId: lead.id, sub: sub.id, status: "failed", error: String(out.error || "lead takeover failed") });
          return null;
        }
        out._takeover = { from: agent.id, fromName: agent.name };
        out._workerId = lead.id;
        out._workerName = lead.name;
        out._model = lead.model;
        return out;
      }
      out._workerId = agent.id;
      out._workerName = agent.name;
      out._model = agent.model;
      return out;
    };

    const runPhase = async (phaseSpec, phaseIndex) => {
      const assignments = (phaseSpec.assignments || []).slice(0, Math.max(1, pool.length));
      const subs = assignments.map((a, i) => {
        const agent = pool[(phaseIndex + i) % pool.length];
        return { id: nextSub++, agentId: agent.id, title: a.focus, lens: a.lens || "", phase: phaseIndex, status: "todo" };
      });
      for (const s of subs) m.subtasks.push(s);
      const subView = subs.map(s => ({ id: s.id, agentId: s.agentId, title: s.title, lens: s.lens, phase: s.phase, status: s.status }));
      if (phaseIndex === 0) emit(m.id, "mission.plan", { subtasks: subView, assessment: m.assessment, approach: plan.approach || null });
      else emit(m.id, "phase.started", { index: phaseIndex, goal: phaseSpec.goal || "", subtasks: subView });
      await pace(m, 2400);
      emit(m.id, "phase.disperse", {});
      await pace(m, 1800);
      const blackboard = [...m.blackboard];
      for (const s of subs) {
        s.status = "doing";
        emit(m.id, "agent.progress", { agentId: s.agentId, sub: s.id, status: "doing", title: s.title });
      }
      const drafts = await Promise.all(subs.map(async s => ({ sub: s, out: await runWorker(s, "draft", blackboard, []) })));
      let finals = drafts;
      const live = drafts.filter(d => d.out && !d.out.failed);
      const doExchange = live.length >= 2 && complexity !== "simple" && phaseIndex === 0;
      if (doExchange) {
        const peerLines = live.map(d => `${d.out._workerName} — ${d.sub.title}: ${firstSentence(d.out.summary || d.out.say || "")} [${d.out.stance || "?"}, ${d.out.confidence ?? "?"}%]`);
        for (const d of live) emit(m.id, "agent.share", { agentId: d.out._workerId, peers: live.filter(x => x !== d).map(x => x.out._workerId), say: vi ? "Đối chiếu với cả nhóm…" : "Comparing notes with the team…" });
        await pace(m, 3000);
        finals = await Promise.all(drafts.map(async d => {
          if (!d.out || d.out.failed) return d;
          const peers = peerLines.filter((_, i) => live[i] !== d);
          let ex = null;
          try { ex = await runWorker(d.sub, "exchange", blackboard, peers); } catch (e) { if (signal?.aborted) throw e; ex = null; }
          if (ex && !ex.failed) {
            ex._workerId = ex._workerId || d.out._workerId;
            ex._workerName = ex._workerName || d.out._workerName;
            ex._model = ex._model || d.out._model;
            ex._takeover = ex._takeover || d.out._takeover;
            ex.toolCalls = [...(d.out.toolCalls || []), ...(ex.toolCalls || [])];
            return { sub: d.sub, out: ex };
          }
          return d;
        }));
      }
      const phaseOutputs = [];
      for (const { sub, out } of finals) {
        if (!out || out.failed) continue;
        sub.status = "done";
        const record = {
          phase: phaseIndex,
          agentId: out._workerId,
          name: out._workerName,
          model: out._model,
          focus: sub.title,
          lens: sub.lens,
          ...(out._takeover ? { takeover: out._takeover } : {}),
          toolCalls: (out.toolCalls || []).filter(tc => tc.allowed && tc.result).map(tc => ({ server: tc.server, tool: tc.tool, args: tc.args || null, result: tc.result })),
          ...pick(out, ["summary", "keyPoints", "stance", "confidence", "say", "policyGroup", "simulated", "verifyNote"])
        };
        m.outputs.push(record);
        phaseOutputs.push(record);
        if (out.simulated) emit(m.id, "agent.say", { agentId: out._workerId, say: vi ? "⚠ model không phản hồi — trả lời từ offline fallback" : "⚠ model unreachable — answered from offline fallback", tone: "warn" });
        emit(m.id, "agent.progress", {
          agentId: out._workerId,
          sub: sub.id,
          status: "done",
          say: out.say,
          stance: out.stance,
          confidence: out.confidence,
          summary: out.summary,
          keyPoints: out.keyPoints,
          simulated: !!out.simulated,
          takeover: out._takeover || null
        });
        await pace(m, 600);
      }
      return phaseOutputs;
    };

    const drainBoard = async () => {
      if (!INTERAGENT_BUS) return;
      const open = (m.board || []).filter(t => t.status === "open").slice(0, 2);
      let i = 0;
      for (const task of open) {
        if (task.status !== "open") continue;
        const worker = pool[i++ % pool.length];
        task.status = "claimed";
        task.claimedBy = worker.id;
        emit(m.id, "task.claimed", { agentId: worker.id, taskId: task.id, title: task.title });
        await pace(m, 1200);
        let out = null;
        try {
          out = await rt("/run", {
            missionId: m.id, role: "worker", agent: worker, agentId: worker.id,
            assignment: { focus: `${task.title}${task.detail ? " — " + task.detail : ""}`, lens: "" },
            missionTitle: m.title, complexity, informational,
            userEmail: m.userEmail || null, language: m.language, stage: "draft",
            blackboard: [...m.blackboard],
            busUrl: `${SELF_URL}/missions/${m.id}/bus`, roster: squad.map(a => ({ id: a.id, name: a.name })), inbox: []
          });
        } catch (e) { if (signal?.aborted) throw e; out = null; }
        const result = out && !out.failed ? out.summary || out.say || "" : "(could not complete)";
        if (out && !out.failed) emitTools(worker.id, out);
        task.status = "done";
        task.result = String(result).slice(0, 600);
        task.doneBy = worker.id;
        m.blackboard.push(`${worker.name} (picked up board task “${task.title}”): ${firstSentence(result)}`);
        m.blackboard = m.blackboard.slice(-14);
        emit(m.id, "task.completed", { agentId: worker.id, taskId: task.id, title: task.title });
        missionStore.save(m);
        await pace(m, 800);
      }
    };

    let phaseSpec = plan.phase;
    let lastSynthesis = null;
    for (let phaseIndex = 0; phaseIndex < MAX_PHASES && phaseSpec && (phaseSpec.assignments || []).length; phaseIndex++) {
      const phaseOutputs = await runPhase(phaseSpec, phaseIndex);
      if (!phaseOutputs.length && phaseIndex === 0) {
        m.insufficient = true;
        break;
      }
      m.phases.push({ index: phaseIndex, goal: phaseSpec.goal || "", assignments: phaseSpec.assignments, synthesis: null });
      emit(m.id, "phase.gather", { place: "meeting" });
      emit(m.id, "synthesize.started", { agentId: lead.id, iteration: phaseIndex });
      await pace(m, 1800);
      let synthesis;
      try {
        synthesis = await rt("/synthesize", {
          missionId: m.id,
          agent: lead,
          missionTitle: m.title,
          phaseGoal: phaseSpec.goal || "",
          outputs: m.outputs.map(o => pick(o, ["agentId", "name", "focus", "lens", "summary", "keyPoints", "stance", "confidence", "flags"])),
          blackboard: m.blackboard,
          phaseIndex,
          maxPhases: MAX_PHASES,
          informational,
          language: m.language
        });
      } catch (err) {
        if (signal?.aborted) throw err;
        console.warn(`[orchestrator] synthesize skipped: ${err.message}`);
        synthesis = { phaseSummary: "", concerns: [], sufficient: true, nextPhase: null };
      }
      m.phases[m.phases.length - 1].synthesis = { phaseSummary: synthesis.phaseSummary, concerns: synthesis.concerns || [], sufficient: !!synthesis.sufficient };
      pushBlackboard(phaseOutputs, synthesis);
      lastSynthesis = synthesis;
      emit(m.id, "phase.synthesized", {
        agentId: lead.id,
        index: phaseIndex,
        summary: synthesis.phaseSummary || "",
        sufficient: !!synthesis.sufficient,
        concerns: synthesis.concerns || [],
        nextGoal: synthesis.nextPhase?.goal || null
      });
      await pace(m, 2200);
      if (synthesis.sufficient || !synthesis.nextPhase || phaseIndex >= MAX_PHASES - 1) {
        phaseSpec = null;
      } else {
        emit(m.id, "agent.say", { agentId: lead.id, say: vi ? `Còn thiếu vài điểm — mở thêm một giai đoạn: ${synthesis.nextPhase.goal || ""}` : `A few gaps remain — opening another phase: ${synthesis.nextPhase.goal || ""}` });
        await pace(m, 2200);
        phaseSpec = synthesis.nextPhase;
      }
    }
    void lastSynthesis;

    if (!m.outputs.length) {
      m.insufficient = true;
    }

    await drainBoard();

    const verifiable = m.outputs.filter(o => !o.simulated);
    if (verifiable.length) {
      emit(m.id, "verify.started", { agentId: lead.id });
      try {
        const v = await rt("/verify", {
          missionId: m.id,
          agent: lead,
          missionTitle: m.title,
          outputs: verifiable.map(o => pick(o, ["agentId", "name", "focus", "summary", "keyPoints", "stance", "confidence"])),
          language: m.language
        });
        for (const verdict of v.verdicts || []) {
          const o = m.outputs.find(x => x.agentId === verdict.agentId);
          if (!o) continue;
          o.flags = verdict.flagged;
          o.verifyNote = verdict.note || o.verifyNote;
          if (typeof o.confidence === "number" && verdict.confidenceAdjust) {
            o.confidenceBefore = o.confidence;
            o.confidence = Math.max(5, Math.min(100, o.confidence + verdict.confidenceAdjust));
          }
        }
        const flagged = (v.verdicts || []).filter(x => x.flagged.length);
        emit(m.id, "verify.done", { agentId: lead.id, flags: flagged.map(x => ({ agentId: x.agentId, count: x.flagged.length, note: x.note })) });
        if (flagged.length) {
          emit(m.id, "agent.say", { agentId: lead.id, say: vi ? `Tôi đã kiểm chứng số liệu — ${flagged.reduce((n, x) => n + x.flagged.length, 0)} điểm cần dè chừng.` : `Fact-check done — ${flagged.reduce((n, x) => n + x.flagged.length, 0)} claims need caution.` });
          await pace(m, 2600);
        }
      } catch (err) {
        if (signal?.aborted) throw err;
        console.warn(`[orchestrator] verify pass skipped: ${err.message}`);
      }
    }

    const stances = m.outputs;
    const realStances = stances.filter(o => !o.simulated);
    const considered = realStances.length ? realStances : stances;
    const support = considered.filter(o => o.stance === "support");
    const oppose = considered.filter(o => o.stance === "oppose");
    const conditional = considered.filter(o => o.stance === "conditional");
    const camps = (support.length ? 1 : 0) + (oppose.length ? 1 : 0) + (conditional.length ? 1 : 0);
    const conflict = !informational && camps >= 2 && support.length + oppose.length > 0;
    if (conflict) {
      m.status = "meeting";
      const dissent = [...oppose, ...conditional];
      emit(m.id, "conflict.detected", { between: considered.map(o => o.agentId), summary: { support: support.map(o => o.name), oppose: dissent.map(o => o.name) } });
      await pace(m, 1800);
      try {
        await runMeeting(m, signal);
      } catch (err) {
        if (signal?.aborted) throw err;
        console.warn(`[orchestrator] meeting skipped: ${err.message}`);
        m.meeting = null;
        emit(m.id, "conflict.none", {});
      }
    } else {
      m.meeting = null;
      emit(m.id, "conflict.none", {});
    }

    m.status = "reporting";
    for (const s of m.subtasks) if (s.status !== "done") s.status = "failed";
    if (m.depth === "deep" && !informational && !m.insufficient) {
      emit(m.id, "scenarios.started", { agentId: lead.id });
      await pace(m, 1600);
      try {
        const sc = await rt("/scenarios", {
          missionId: m.id,
          agent: lead,
          missionTitle: m.title,
          outputs: m.outputs.map(o => pick(o, ["agentId", "name", "focus", "summary", "keyPoints", "stance", "confidence"])),
          language: m.language
        });
        m.scenarios = sc;
        emit(m.id, "scenarios.done", { agentId: lead.id, scenarios: sc.scenarios, sensitivity: sc.sensitivity });
      } catch (err) {
        if (signal?.aborted) throw err;
        console.warn(`[orchestrator] scenarios skipped: ${err.message}`);
      }
      await pace(m, 1600);
    }
    emit(m.id, "report.started", { agentId: lead.id });
    await pace(m, 3000);
    let report;
    if (m.insufficient) {
      report = localReport(m, vi, { insufficient: true });
    } else {
      try {
        report = await rt("/report", {
          missionId: m.id,
          missionTitle: m.title,
          outputs: m.outputs.map(({ toolCalls, ...o }) => o),
          meeting: m.meeting,
          informational,
          language: m.language,
          depth: m.depth,
          scenarios: m.scenarios ? m.scenarios.scenarios : null,
          agent: lead
        });
      } catch (err) {
        if (signal?.aborted) throw err;
        console.warn(`[orchestrator] report fell back to local assembly: ${err.message}`);
        report = localReport(m, vi);
      }
    }
    m.report = pick(report, ["markdown", "recommendation", "confidence", "confidenceRationale"]);
    if (m.report.markdown && m.outputs.some(o => o.simulated) && !/provisional|tạm thời/i.test(m.report.markdown)) {
      m.report.markdown = (vi
        ? "> ⚠️ **Tạm thời:** một phần báo cáo được tạo offline do phân tích trực tiếp không khả dụng — hãy coi là sơ bộ.\n\n"
        : "> ⚠️ **Provisional:** part of this report was generated offline because live analysis was unavailable — treat as preliminary.\n\n") + m.report.markdown;
    }
    emit(m.id, "agent.say", { agentId: lead.id, say: report.say });
    await pace(m, 1200);
    emit(m.id, "report.ready", {
      ...m.report,
      agentId: lead.id,
      scenarios: m.scenarios ? m.scenarios.scenarios : null,
      sensitivity: m.scenarios ? m.scenarios.sensitivity : null,
      phases: m.phases.map(p => ({ index: p.index, goal: p.goal, synthesis: p.synthesis })),
      quorum: computeQuorum(m.outputs),
      breakdown: m.outputs.map(o => pick(o, ["agentId", "name", "focus", "lens", "stance", "confidence", "confidenceBefore", "flags", "simulated", "takeover"]))
    });
    m.status = "done";
    const decision = m.insufficient ? null : informational ? "informational" : m.meeting?.decision || (oppose.length ? "do-not-proceed" : considered.some(o => o.stance === "conditional") ? "proceed-with-conditions" : "proceed");
    m.decision = decision;
    const fragility = m.insufficient || informational ? null : fragilityOf(m.meeting?.participants?.length ? m.meeting.participants : considered);
    m.fragility = fragility;
    emit(m.id, "mission.completed", { title: m.title, decision, recommendation: m.report.recommendation, fragility, quorum: computeQuorum(m.outputs) });
    const flagCount = m.outputs.reduce((n, o) => n + (o.flags?.length || 0), 0);
    briefingStore.add({
      id: `b_${m.id}`,
      missionId: m.id,
      kind: "result",
      title: m.title,
      decision,
      recommendation: m.report.recommendation,
      confidence: m.report.confidence,
      flagCount,
      simulated: !!m.outputs.some(o => o.simulated),
      severity: decision === "do-not-proceed" || flagCount > 0 || (m.report.confidence ?? 100) < 55 ? "warn" : "info",
      auto: !!m.auto,
      userEmail: m.userEmail || null,
      at: Date.now()
    });
    const calTopic = topicOf(m.title);
    const calEvents = m.outputs.map((o, i) => ({
      id: `cal_${m.id}_${o.agentId}_${i}`,
      missionId: m.id,
      userEmail: m.userEmail || null,
      agentId: o.agentId,
      lens: o.lens || null,
      focus: o.focus || null,
      model: o.model || null,
      topic: calTopic,
      predictedConfidence: o.confidence ?? null,
      confidenceBefore: o.confidenceBefore ?? null,
      stance: o.stance || null,
      flagsCount: o.flags?.length || 0,
      simulated: !!o.simulated,
      decision
    }));
    calEvents.push({
      id: `cal_${m.id}_final`,
      missionId: m.id,
      userEmail: m.userEmail || null,
      agentId: lead.id,
      lens: "synthesize",
      focus: null,
      model: lead.model,
      topic: calTopic,
      predictedConfidence: m.report.confidence ?? null,
      confidenceBefore: null,
      stance: null,
      flagsCount: flagCount,
      simulated: !!m.outputs.some(o => o.simulated),
      decision
    });
    calibrationStore.add(calEvents);
    try {
      const outcomes = m.outputs.map(o => ({
        agentId: o.agentId,
        focus: o.focus,
        simulated: !!o.simulated,
        title: m.title,
        stance: o.stance,
        confidence: o.confidence,
        summary: o.summary,
        keyPoints: o.keyPoints,
        lesson: vi
          ? `Nhiệm vụ “${m.title}”: bạn phụ trách “${o.focus}”, kết luận ${o.stance || "chưa rõ"} (${o.confidence}%); cả đội chốt ${decision || "chưa đủ dữ liệu để kết luận"}.`
          : `Mission “${m.title}”: you owned “${o.focus}”, concluded ${o.stance || "no clear stance"} (${o.confidence}%); the squad decided ${decision || "insufficient data to conclude"}.`
      }));
      outcomes.push({
        agentId: lead.id,
        focus: "orchestration",
        title: m.title,
        lesson: vi
          ? `Nhiệm vụ “${m.title}”: bạn điều phối ${m.phases.length} giai đoạn, tổng hợp và chốt ${decision || "chưa đủ dữ liệu để kết luận"} (độ tin cậy ${m.report.confidence}%).`
          : `Mission “${m.title}”: you orchestrated ${m.phases.length} phase(s), synthesized and concluded ${decision || "insufficient data to conclude"} (confidence ${m.report.confidence}%).`
      });
      await rt("/memory/commit", { missionId: m.id, outcomes, userEmail: m.userEmail || null });
    } catch {}
    await pace(m, 2500);
    emit(m.id, "phase.disperse", {});
  } catch (err) {
    if (m.cancelRequested) {
      m.status = "cancelled";
      emit(m.id, "mission.cancelled", {});
      briefingStore.add({
        id: `b_${m.id}`,
        missionId: m.id,
        kind: "cancelled",
        title: vi ? `Đã dừng: ${m.title}` : `Stopped: ${m.title}`,
        severity: "info",
        auto: !!m.auto,
        userEmail: m.userEmail || null,
        at: Date.now()
      });
    } else {
      console.error(`[orchestrator] mission ${m.id} failed:`, err);
      m.status = "failed";
      emit(m.id, "mission.failed", { error: String(err.message || err) });
      briefingStore.add({
        id: `b_${m.id}`,
        missionId: m.id,
        kind: "failed",
        title: m.title,
        error: String(err.message || err).slice(0, 200),
        severity: "alert",
        auto: !!m.auto,
        userEmail: m.userEmail || null,
        at: Date.now()
      });
    }
  }
}

async function runEvent(m, assessment, _signal) {
  const squad = Array.isArray(m.squad) && m.squad.length ? m.squad : getSquadFor(m.userEmail);
  const lead = leadOf(squad);
  const vi = m.language === "vi";
  const kind = assessment.eventKind;
  m.assessment = assessment;
  m.subtasks = [];
  m.status = "event";
  const nameOf = id => (squad.find(s => s.id === id) || {}).name || id;
  emit(m.id, "event.started", {
    kind,
    agentId: lead.id,
    say: vi ? kind === "swim-race" ? `🏊 Cả đội ra hồ bơi — thi bơi bắt đầu: “${m.title}”!` : kind === "basketball" ? `🏀 Ra sân bóng rổ nào — “${m.title}”!` : `🎉 Tổ chức ngay: “${m.title}” — cả đội ra Food Hall!` : kind === "swim-race" ? `🏊 Everyone to the pool — swim race time: “${m.title}”!` : kind === "basketball" ? `🏀 To the court — “${m.title}”!` : `🎉 Let's do it: “${m.title}” — everyone to the Food Hall!`
  });
  await pace(m, 3000);
  if (kind === "swim-race") {
    const racers = squad.filter(s => !s.lead).map(s => s.id);
    const order = [...racers].sort(() => Math.random() - 0.5);
    emit(m.id, "event.race", { racers, order, leadId: lead.id });
    await pace(m, 26000);
    const winner = order[0];
    emit(m.id, "event.result", { winner, order, agentId: lead.id, say: vi ? `🏆 ${nameOf(winner)} về nhất! Một cuộc đua mãn nhãn.` : `🏆 ${nameOf(winner)} takes it! What a race.` });
    m.eventResult = { kind, winner: nameOf(winner), order: order.map(nameOf) };
    await pace(m, 6000);
  } else {
    emit(m.id, "event.party", { kind, place: kind === "basketball" ? "court" : "cafe", durationMs: 28000 });
    await pace(m, 30000);
    m.eventResult = { kind, participants: squad.map(s => s.name) };
  }
  const recap = vi ? [`## Sự kiện`, `**${m.title}** — đã tổ chức thành công 🎉`, kind === "swim-race" ? `## Kết quả\n${m.eventResult.order.map((n, i) => `${i + 1}. ${n}${i === 0 ? " 🏆" : ""}`).join("\n")}` : `## Tham gia\n${squad.map(s => `- ${s.name}`).join("\n")}`, `## Ghi chú\nCả đội đã có khoảng nghỉ xứng đáng — quay lại làm việc thôi!`].join("\n\n") : [`## Event`, `**${m.title}** — wrapped 🎉`, kind === "swim-race" ? `## Results\n${m.eventResult.order.map((n, i) => `${i + 1}. ${n}${i === 0 ? " 🏆" : ""}`).join("\n")}` : `## Participants\n${squad.map(s => `- ${s.name}`).join("\n")}`, `## Note\nWell-earned break — back to work!`].join("\n\n");
  m.report = {
    markdown: recap,
    recommendation: vi ? `Sự kiện “${m.title}” đã tổ chức thành công 🎉${m.eventResult.winner ? ` — ${m.eventResult.winner} vô địch 🏆` : ""}` : `Event “${m.title}” wrapped 🎉${m.eventResult.winner ? ` — ${m.eventResult.winner} wins 🏆` : ""}`,
    confidence: 100
  };
  m.decision = "event";
  m.status = "done";
  emit(m.id, "event.ended", {});
  emit(m.id, "report.ready", { ...m.report, agentId: lead.id });
  emit(m.id, "mission.completed", { title: m.title, decision: "event", recommendation: m.report.recommendation });
  await pace(m, 2000);
  emit(m.id, "phase.disperse", {});
}

async function runMeeting(m, signal) {
  const squad = Array.isArray(m.squad) && m.squad.length ? m.squad : getSquadFor(m.userEmail);
  const rt = (path, body) => runtime(path, body, signal, m.userEmail);
  const lead = leadOf(squad);
  const agentById = id => squad.find(a => a.id === id) || lead;
  emit(m.id, "meeting.started", { agentIds: squad.map(a => a.id), place: "meeting" });
  await pace(m, 5000);
  emit(m.id, "agent.say", { agentId: lead.id, say: m.language === "vi" ? "Quan điểm đang trái chiều — ta phản biện từng điểm rồi chốt chung." : "We have a split — let's debate the points, then land a shared call." });
  await pace(m, 2500);
  const transcript = [];
  const latest = new Map();
  for (const o of m.outputs) latest.set(o.agentId, o);
  const rank = { oppose: 0, support: 1, conditional: 2, insufficient: 3 };
  const positions = [...latest.values()]
    .sort((a, b) => (rank[a.stance] ?? 4) - (rank[b.stance] ?? 4) || (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 4)
    .map(o => ({ agentId: o.agentId, name: o.name, focus: o.focus, stance: o.stance, summary: o.summary, keyPoints: o.keyPoints || [] }));
  for (let round = 1; round <= 2; round++) {
    for (const pos of positions) {
      const others = positions.filter(p => p.agentId !== pos.agentId);
      const directorNote = (m.steers || []).map(s => s.text).join(" · ");
      const turn = await rt("/meeting-turn", {
        missionId: m.id,
        agent: agentById(pos.agentId),
        missionTitle: m.title,
        position: { stance: pos.stance, summary: pos.summary },
        others,
        directorNote,
        round,
        complexity: m.assessment?.complexity || "standard",
        informational: !!m.assessment?.informational,
        userEmail: m.userEmail || null,
        language: m.language
      });
      if (turn.skip) {
        await pace(m, 800);
        continue;
      }
      const stanceBefore = pos.stance;
      pos.stance = turn.stance || pos.stance;
      const conceded = !!(stanceBefore && pos.stance && stanceBefore !== pos.stance && pos.stance !== "oppose");
      let towardAgentId = null;
      if (conceded) {
        const ally = positions.find(p => p.agentId !== pos.agentId && p.stance === pos.stance) || positions.find(p => p.agentId !== pos.agentId);
        towardAgentId = ally ? ally.agentId : null;
      }
      transcript.push({ round, agentId: pos.agentId, name: pos.name, say: turn.say, argument: turn.argument, stance: pos.stance, stanceBefore, conceded, towardAgentId });
      emit(m.id, "meeting.turn", { round, agentId: pos.agentId, say: turn.say, argument: turn.argument, stance: pos.stance, stanceBefore, conceded, towardAgentId });
      await pace(m, 2800);
    }
    const stillOpposed = positions.some(p => p.stance === "oppose");
    if (!stillOpposed) break;
  }
  const consensus = await rt("/consensus", { missionTitle: m.title, positions, transcript, language: m.language, model: lead.models || lead.model });
  const fragility = fragilityOf(positions);
  m.meeting = { participants: positions, transcript, decision: consensus.decision, rationale: consensus.rationale, conditions: consensus.conditions || [], fragility };
  emit(m.id, "meeting.resolved", { agentId: lead.id, say: consensus.say, decision: consensus.decision, rationale: consensus.rationale, conditions: m.meeting.conditions, fragility });
  await pace(m, 3500);
  emit(m.id, "phase.disperse", {});
  await pace(m, 2000);
}
