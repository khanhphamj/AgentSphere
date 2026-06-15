import { emit } from "./events.js";
import { getSquad, byRole } from "./squad.js";
import { briefingStore } from "./db.js";
const RUNTIME_URL = (process.env.AGENT_RUNTIME_URL || "http://localhost:8082").replace(/\/$/, "");
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
const HEADERS = {
  "content-type": "application/json",
  "x-client-id": CLIENT_ID,
  "x-client-secret": CLIENT_SECRET
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pace = (m, ms) => sleep(m && m.auto ? 0 : ms);
async function runtime(path, body) {
  const res = await fetch(`${RUNTIME_URL}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000)
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
const detectLanguage = text => /[àáảãạăâđèéẻẽẹêìíỉĩịòóỏõọôơùúủũụưỳýỷỹỵ]/i.test(text) ? "vi" : "en";
const STATUS_TITLE = /agent unresponsive|unusable format|revive to reload|reload its checkpoint|bring the agent back online|model unreachable|model answered in an|denied by policy|superseded by a new mission|all specialists failed|✗|⚑|model 404|429 too many/i;
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
    steers: [],
    meeting: null,
    report: null
  };
}
export async function runMission(mission) {
  const m = mission;
  const lead = byRole("orchestrator");
  try {
    emit(m.id, "mission.created", {
      title: m.title,
      language: m.language,
      squad: getSquad()
    });
    const planP = runtime("/plan", {
      title: m.title,
      context: m.clarifyAnswer || "",
      language: m.language,
      model: lead.models || lead.model
    });
    await pace(m, 800);
    emit(m.id, "phase.gather", {
      place: "meeting"
    });
    const [plan] = await Promise.all([planP, pace(m, 9000)]);
    if (plan.assessment?.type === "unclear" && !m.clarifyAnswer && !m.auto) {
      m.status = "clarifying";
      m.clarifyQuestion = plan.assessment.question;
      emit(m.id, "mission.clarify", {
        agentId: lead.id,
        question: plan.assessment.question
      });
      emit(m.id, "phase.disperse", {});
      return;
    }
    if (m.auto && plan.assessment?.type === "unclear") m.clarifyAnswer = m.clarifyAnswer || "Automated scheduled run — proceed with your best interpretation of the standing brief.";
    if (plan.assessment?.type === "event") {
      return await runEvent(m, plan.assessment);
    }
    emit(m.id, "agent.say", {
      agentId: lead.id,
      say: plan.announce,
      tone: null
    });
    await pace(m, 3200);
    m.subtasks = plan.subtasks.map((s, i) => {
      const agent = byRole(s.role) || byRole("research");
      return {
        id: i,
        role: s.role,
        agentId: agent.id,
        title: s.title,
        status: "todo"
      };
    });
    m.assessment = plan.assessment || null;
    m.status = "executing";
    emit(m.id, "mission.plan", {
      subtasks: m.subtasks,
      assessment: m.assessment
    });
    await pace(m, 2600);
    emit(m.id, "phase.disperse", {});
    await pace(m, 2500);
    const working = m.subtasks.filter(s => s.role !== "reporter").map(s => s.role);
    const results = {};
    await Promise.all(working.map(async (role, i) => {
      const agent = byRole(role);
      const sub = m.subtasks.find(s => s.role === role);
      let workerAgent = agent;
      let takenOver = false;
      await pace(m, 1200 + i * 2300);
      sub.status = "doing";
      emit(m.id, "agent.progress", {
        agentId: agent.id,
        sub: sub.id,
        status: "doing",
        title: sub.title
      });
      let out = await runtime("/run", {
        missionId: m.id,
        role,
        agent,
        subtask: {
          id: sub.id,
          title: sub.title
        },
        missionTitle: m.title,
        context: m.clarifyAnswer ? `The user clarified: ${m.clarifyAnswer}` : "",
        complexity: m.assessment?.complexity || "standard",
        informational: !!m.assessment?.informational,
        userEmail: m.userEmail || null,
        language: m.language
      });
      if (out.questionForLead) {
        emit(m.id, "agent.question", {
          agentId: agent.id,
          leadId: lead.id,
          question: out.questionForLead
        });
        await pace(m, 5000);
        const guidance = await runtime("/lead-answer", {
          agent: lead,
          missionTitle: m.title,
          question: out.questionForLead,
          language: m.language
        });
        emit(m.id, "agent.answer", {
          agentId: lead.id,
          to: agent.id,
          answer: guidance.answer
        });
        await pace(m, 3000);
        out = await runtime("/run", {
          missionId: m.id,
          role,
          agent,
          subtask: {
            id: sub.id,
            title: sub.title
          },
          missionTitle: m.title,
          context: `${m.clarifyAnswer ? `The user clarified: ${m.clarifyAnswer}\n` : ""}Lead's guidance for your question "${out.questionForLead}": ${guidance.answer}`,
          complexity: m.assessment?.complexity || "standard",
        informational: !!m.assessment?.informational,
          userEmail: m.userEmail || null,
          language: m.language
        });
      }
      results[role] = out;
      for (const tc of out.toolCalls || []) {
        emit(m.id, "agent.tool", {
          agentId: agent.id,
          server: tc.server,
          tool: tc.tool,
          allowed: tc.allowed,
          reason: tc.reason || null,
          result: tc.result || null,
          args: tc.args || null
        });
        await pace(m, 700);
      }
      if (out.failed) {
        const vi = m.language === "vi";
        emit(m.id, "agent.progress", {
          agentId: agent.id,
          sub: sub.id,
          status: "failed",
          error: out.error || "model unreachable"
        });
        emit(m.id, "agent.takeover", {
          agentId: lead.id,
          from: agent.id,
          sub: sub.id,
          role,
          reason: out.error || "model unreachable"
        });
        emit(m.id, "agent.say", {
          agentId: lead.id,
          say: vi
            ? `${agent.name} gặp sự cố (${out.error || "model lỗi"}) — để tôi tiếp quản phần việc ${role} này.`
            : `${agent.name} hit an error (${out.error || "model failure"}) — I'll take over this ${role} task.`
        });
        await pace(m, 2500);
        sub.status = "doing";
        emit(m.id, "agent.progress", {
          agentId: lead.id,
          sub: sub.id,
          status: "doing",
          title: sub.title,
          takeover: { from: agent.id, fromName: agent.name }
        });
        try {
          out = await runtime("/run", {
            missionId: m.id,
            role,
            agent: lead,
            subtask: {
              id: sub.id,
              title: sub.title
            },
            missionTitle: m.title,
            context: `${m.clarifyAnswer ? `The user clarified: ${m.clarifyAnswer}\n` : ""}The assigned ${role} specialist could not complete this subtask (error: ${out.error || "model unreachable"}). As the lead Orchestrator, take over and complete this ${role} work yourself now, keeping the same standards.`,
            complexity: m.assessment?.complexity || "standard",
            informational: !!m.assessment?.informational,
            userEmail: m.userEmail || null,
            language: m.language
          });
        } catch (e) {
          out = { failed: true, error: String(e.message || e).slice(0, 200) };
        }
        results[role] = out;
        if (out.failed || out.questionForLead) {
          sub.status = "failed";
          emit(m.id, "agent.progress", {
            agentId: lead.id,
            sub: sub.id,
            status: "failed",
            error: String(out.error || "lead takeover failed")
          });
          return;
        }
        workerAgent = lead;
        takenOver = true;
        for (const tc of out.toolCalls || []) {
          emit(m.id, "agent.tool", {
            agentId: lead.id,
            server: tc.server,
            tool: tc.tool,
            allowed: tc.allowed,
            reason: tc.reason || null,
            result: tc.result || null,
            args: tc.args || null
          });
          await pace(m, 700);
        }
      }
      if (!out.simulated && !takenOver) {
        sub.status = "review";
        emit(m.id, "agent.review", {
          agentId: lead.id,
          target: agent.id,
          sub: sub.id
        });
        try {
          const review = await runtime("/review", {
            agent: lead,
            missionTitle: m.title,
            subtask: sub.title,
            output: pick(out, ["summary", "keyPoints", "stance", "confidence"]),
            language: m.language
          });
          if (review.pass === false && review.feedback) {
            emit(m.id, "agent.redo", {
              agentId: lead.id,
              target: agent.id,
              sub: sub.id,
              feedback: review.feedback
            });
            await pace(m, 3500);
            sub.status = "doing";
            emit(m.id, "agent.progress", {
              agentId: agent.id,
              sub: sub.id,
              status: "doing",
              title: sub.title
            });
            const redo = await runtime("/run", {
              missionId: m.id,
              role,
              agent,
              subtask: {
                id: sub.id,
                title: sub.title
              },
              missionTitle: m.title,
              context: `${m.clarifyAnswer ? `The user clarified: ${m.clarifyAnswer}\n` : ""}The Orchestrator reviewed your first attempt and asked you to redo it: ${review.feedback}`,
              complexity: m.assessment?.complexity || "standard",
        informational: !!m.assessment?.informational,
              userEmail: m.userEmail || null,
              language: m.language
            });
            if (!redo.failed && !redo.questionForLead) {
              out = redo;
              for (const tc of redo.toolCalls || []) {
                emit(m.id, "agent.tool", {
                  agentId: agent.id,
                  server: tc.server,
                  tool: tc.tool,
                  allowed: tc.allowed,
                  reason: tc.reason || null,
                  result: tc.result || null,
                  args: tc.args || null
                });
                await pace(m, 600);
              }
            }
            emit(m.id, "agent.reviewed", {
              agentId: lead.id,
              target: agent.id,
              sub: sub.id,
              pass: true,
              redone: true
            });
          } else {
            emit(m.id, "agent.reviewed", {
              agentId: lead.id,
              target: agent.id,
              sub: sub.id,
              pass: true,
              redone: false
            });
          }
        } catch (err) {
          console.warn(`[orchestrator] review skipped for ${role}: ${err.message}`);
        }
      }
      sub.status = "done";
      m.outputs.push({
        role,
        agentId: workerAgent.id,
        name: workerAgent.name,
        ...(takenOver ? { takeover: { from: agent.id, fromName: agent.name } } : {}),
        toolCalls: (out.toolCalls || []).filter(tc => tc.allowed && tc.result).map(tc => ({
          server: tc.server,
          tool: tc.tool,
          args: tc.args || null,
          result: tc.result
        })),
        ...pick(out, ["summary", "keyPoints", "stance", "confidence", "say", "policyGroup", "simulated"])
      });
      emit(m.id, "agent.progress", {
        agentId: workerAgent.id,
        sub: sub.id,
        status: "done",
        say: out.say,
        stance: out.stance,
        confidence: out.confidence,
        summary: out.summary,
        keyPoints: out.keyPoints,
        simulated: !!out.simulated,
        takeover: takenOver ? { from: agent.id, fromName: agent.name } : null
      });
    }));
    if (!m.outputs.filter(o => o.role !== "reporter").length) {
      throw new Error(m.language === "vi" ? "tất cả specialist đều lỗi — model không phản hồi" : "all specialists failed — models unreachable");
    }
    const repAgent = byRole("reporter");
    const repSub = m.subtasks.find(s => s.role === "reporter");
    const criticAgent = byRole("critic");
    const verifiable = m.outputs.filter(o => o.role !== "reporter" && o.role !== "critic" && !o.simulated);
    if (results.critic && !results.critic.simulated && verifiable.length) {
      emit(m.id, "verify.started", {
        agentId: criticAgent.id
      });
      try {
        const v = await runtime("/verify", {
          missionId: m.id,
          agent: criticAgent,
          missionTitle: m.title,
          outputs: verifiable.map(o => pick(o, ["role", "agentId", "summary", "keyPoints", "stance", "confidence"])),
          language: m.language
        });
        for (const verdict of v.verdicts || []) {
          const o = m.outputs.find(x => x.role === verdict.role);
          if (!o) continue;
          o.flags = verdict.flagged;
          o.verifyNote = verdict.note;
          if (typeof o.confidence === "number" && verdict.confidenceAdjust) {
            o.confidenceBefore = o.confidence;
            o.confidence = Math.max(5, Math.min(100, o.confidence + verdict.confidenceAdjust));
          }
        }
        const flagged = (v.verdicts || []).filter(x => x.flagged.length);
        emit(m.id, "verify.done", {
          agentId: criticAgent.id,
          flags: flagged.map(x => ({
            role: x.role,
            count: x.flagged.length,
            note: x.note
          }))
        });
        if (flagged.length) {
          emit(m.id, "agent.say", {
            agentId: criticAgent.id,
            say: m.language === "vi" ? `Tôi đã kiểm chứng số liệu — ${flagged.reduce((n, x) => n + x.count, 0)} điểm cần dè chừng.` : `Fact-check done — ${flagged.reduce((n, x) => n + x.count, 0)} claims need caution.`
          });
          await pace(m, 3000);
        }
      } catch (err) {
        console.warn(`[orchestrator] verify pass skipped: ${err.message}`);
      }
    }
    const informational = !!m.assessment?.informational;
    const stances = m.outputs.filter(o => o.role !== "reporter");
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
      emit(m.id, "conflict.detected", {
        between: considered.map(o => o.agentId),
        summary: {
          support: support.map(o => o.role),
          oppose: dissent.map(o => o.role)
        }
      });
      await pace(m, 1800);
      await runMeeting(m);
    } else {
      m.meeting = null;
      emit(m.id, "conflict.none", {});
    }
    m.status = "reporting";
    repSub.status = "doing";
    emit(m.id, "agent.progress", {
      agentId: repAgent.id,
      sub: repSub.id,
      status: "doing",
      title: repSub.title
    });
    emit(m.id, "report.started", {
      agentId: repAgent.id
    });
    await pace(m, 3000);
    const report = await runtime("/report", {
      missionId: m.id,
      missionTitle: m.title,
      outputs: m.outputs.filter(o => o.role !== "reporter"),
      meeting: m.meeting,
      informational,
      language: m.language,
      agent: repAgent
    });
    m.report = pick(report, ["markdown", "recommendation", "confidence"]);
    emit(m.id, "agent.say", {
      agentId: repAgent.id,
      say: report.say
    });
    await pace(m, 1200);
    repSub.status = "done";
    emit(m.id, "agent.progress", {
      agentId: repAgent.id,
      sub: repSub.id,
      status: "done",
      say: null
    });
    emit(m.id, "report.ready", {
      ...m.report,
      agentId: repAgent.id,
      breakdown: m.outputs.filter(o => o.role !== "reporter").map(o => pick(o, ["role", "agentId", "name", "stance", "confidence", "confidenceBefore", "flags", "simulated", "takeover"]))
    });
    m.status = "done";
    const decision = informational ? "informational" : m.meeting?.decision || (oppose.length ? "do-not-proceed" : considered.some(o => o.stance === "conditional") ? "proceed-with-conditions" : "proceed");
    m.decision = decision;
    emit(m.id, "mission.completed", {
      title: m.title,
      decision,
      recommendation: m.report.recommendation
    });
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
    try {
      const vi = m.language === "vi";
      const outcomes = m.outputs.map(o => ({
        agentId: o.agentId,
        role: o.role,
        simulated: !!o.simulated,
        title: m.title,
        stance: o.stance,
        confidence: o.confidence,
        summary: o.summary,
        keyPoints: o.keyPoints,
        lesson: vi
          ? `Nhiệm vụ “${m.title}”: bạn kết luận ${o.stance} (${o.confidence}%); cả đội chốt ${decision}.`
          : `Mission “${m.title}”: you concluded ${o.stance} (${o.confidence}%); the squad decided ${decision}.`
      }));
      outcomes.push({
        agentId: lead.id,
        role: "orchestrator",
        title: m.title,
        lesson: vi
          ? `Nhiệm vụ “${m.title}”: bạn phân rã ${m.subtasks.length} subtask; ${m.meeting ? "có họp đồng thuận" : "không cần họp"}; kết luận ${decision}.`
          : `Mission “${m.title}”: you decomposed ${m.subtasks.length} subtasks; ${m.meeting ? "a consensus meeting was held" : "no meeting needed"}; decision ${decision}.`
      }, {
        agentId: repAgent.id,
        role: "reporter",
        title: m.title,
        lesson: vi
          ? `Nhiệm vụ “${m.title}”: bạn tổng hợp báo cáo cuối với độ tin cậy ${m.report.confidence}%.`
          : `Mission “${m.title}”: you assembled the final report at ${m.report.confidence}% confidence.`
      });
      await runtime("/memory/commit", { missionId: m.id, outcomes, userEmail: m.userEmail || null });
    } catch {}
    await pace(m, 2500);
    emit(m.id, "phase.disperse", {});
  } catch (err) {
    console.error(`[orchestrator] mission ${m.id} failed:`, err);
    m.status = "failed";
    emit(m.id, "mission.failed", {
      error: String(err.message || err)
    });
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
async function runEvent(m, assessment) {
  const lead = byRole("orchestrator");
  const vi = m.language === "vi";
  const kind = assessment.eventKind;
  m.assessment = assessment;
  m.subtasks = [];
  m.status = "event";
  const squad = getSquad();
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
    emit(m.id, "event.race", {
      racers,
      order,
      leadId: lead.id
    });
    await pace(m, 26000);
    const winner = order[0];
    emit(m.id, "event.result", {
      winner,
      order,
      agentId: lead.id,
      say: vi ? `🏆 ${nameOf(winner)} về nhất! Một cuộc đua mãn nhãn.` : `🏆 ${nameOf(winner)} takes it! What a race.`
    });
    m.eventResult = {
      kind,
      winner: nameOf(winner),
      order: order.map(nameOf)
    };
    await pace(m, 6000);
  } else {
    emit(m.id, "event.party", {
      kind,
      place: kind === "basketball" ? "court" : "cafe",
      durationMs: 28000
    });
    await pace(m, 30000);
    m.eventResult = {
      kind,
      participants: squad.map(s => s.name)
    };
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
  emit(m.id, "report.ready", {
    ...m.report,
    agentId: lead.id
  });
  emit(m.id, "mission.completed", {
    title: m.title,
    decision: "event",
    recommendation: m.report.recommendation
  });
  await pace(m, 2000);
  emit(m.id, "phase.disperse", {});
}
async function runMeeting(m) {
  const lead = byRole("orchestrator");
  const participants = m.outputs.filter(o => o.role !== "reporter");
  emit(m.id, "meeting.started", {
    agentIds: getSquad().map(a => a.id),
    place: "meeting"
  });
  await pace(m, 9000);
  emit(m.id, "agent.say", {
    agentId: lead.id,
    say: m.language === "vi" ? "Quan điểm đang trái chiều — ta phản biện từng điểm rồi chốt chung." : "We have a split — let's debate the points, then land a shared call."
  });
  await pace(m, 3500);
  const transcript = [];
  const positions = participants.map(o => ({
    role: o.role,
    agentId: o.agentId,
    name: o.name,
    stance: o.stance,
    summary: o.summary,
    keyPoints: o.keyPoints || []
  }));
  for (let round = 1; round <= 2; round++) {
    const order = ["critic", "analyst", "research", "creative"].filter(r => positions.find(p => p.role === r));
    for (const role of order) {
      const pos = positions.find(p => p.role === role);
      const others = positions.filter(p => p.role !== role);
      const directorNote = (m.steers || []).map(s => s.text).join(" · ");
      const turn = await runtime("/meeting-turn", {
        missionId: m.id,
        role,
        agent: byRole(role),
        missionTitle: m.title,
        position: {
          stance: pos.stance,
          summary: pos.summary
        },
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
      pos.stance = turn.stance || pos.stance;
      transcript.push({
        round,
        role,
        agentId: pos.agentId,
        name: pos.name,
        say: turn.say,
        argument: turn.argument,
        stance: pos.stance
      });
      emit(m.id, "meeting.turn", {
        round,
        agentId: pos.agentId,
        say: turn.say,
        argument: turn.argument,
        stance: pos.stance
      });
      await pace(m, 4200);
    }
    const stillOpposed = positions.some(p => p.stance === "oppose");
    if (!stillOpposed) break;
  }
  const consensus = await runtime("/consensus", {
    missionTitle: m.title,
    positions,
    transcript,
    language: m.language,
    model: lead.models || lead.model
  });
  m.meeting = {
    participants: positions,
    transcript,
    decision: consensus.decision,
    rationale: consensus.rationale,
    conditions: consensus.conditions || []
  };
  emit(m.id, "meeting.resolved", {
    agentId: lead.id,
    say: consensus.say,
    decision: consensus.decision,
    rationale: consensus.rationale,
    conditions: m.meeting.conditions
  });
  await pace(m, 3500);
  emit(m.id, "phase.disperse", {});
  await pace(m, 2000);
}
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));
