import AS, { humanizeModelError } from "./data.js";
const nameOf = id => (AS.AGENTS.find(a => a.id === id) || {}).name || id;
const stanceLabel = s => ({ support: "support", oppose: "oppose", conditional: "conditional", insufficient: "insufficient" })[s] || s || "done";
export function createMissionDriver({
  world,
  log,
  setMission
}) {
  let gatherAt = 0;
  const gather = () => {
    gatherAt = Date.now();
    const spots = AS.PLACES.meeting.spots;
    AS.AGENTS.forEach((a, i) => world.command(a.id, {
      goto: spots[i % spots.length],
      state: "meeting"
    }));
  };
  const disperse = () => {
    const run = () => AS.AGENTS.forEach(a => world.command(a.id, {
      goto: world.deskOf(a.id),
      state: "working"
    }));
    const wait = Math.max(0, 4000 - (Date.now() - gatherAt));
    if (!wait) return run();
    const token = gatherAt;
    setTimeout(() => {
      if (gatherAt === token) run();
    }, wait);
  };
  const glideTo = place => {
    if (!place || !world.glide) return;
    const spots = place.spots || [];
    let cx, cy;
    if (spots.length) {
      cx = spots.reduce((s, q) => s + q.x, 0) / spots.length;
      cy = spots.reduce((s, q) => s + q.y, 0) / spots.length;
    } else if (place.door) {
      cx = place.door.x;
      cy = place.door.y;
    } else return;
    world.glide(cx * 16, cy * 16);
  };
  const say = (agentId, text, dur = 5.5, tone = null) => {
    if (agentId && text) world.command(agentId, {
      say: text,
      dur,
      tone
    });
  };
  const feel = (agentId, mood, emote = null, moodDur = 6) => {
    if (agentId) world.command(agentId, {
      mood,
      emote,
      moodDur,
      emoteDur: emote ? 2.8 : 0
    });
  };
  const mascot = (kind, opts) => world.mascotReact && world.mascotReact(kind, opts);
  let _toolCd = 0;
  const weather = name => {
    if (world.setWeather) world.setWeather(name);
  };
  const decisionWeather = d => d === "do-not-proceed" ? "cool" : d === "informational" ? "clear" : "warm";
  const bump = idx => setMission(m => m && {
    ...m,
    stage: Math.max(m.stage || 0, idx)
  });
  let confSum = 0,
    confN = 0;
  const setAurora = (confTo, lit) => {
    if (!world._aurora) world._aurora = {
      conf: 0.5,
      confTo: 0.5,
      lit: 0
    };
    if (confTo != null) world._aurora.confTo = Math.max(0, Math.min(1, confTo));
    if (lit != null) world._aurora.lit = Math.max(world._aurora.lit, lit);
  };
  return function handleEvent(ev) {
    const {
      type,
      payload: p
    } = ev;
    switch (type) {
      case "mission.created":
        {
          confSum = 0;
          confN = 0;
          setAurora(0.5, 0.35);
          AS.AGENTS.forEach(a => world.command(a.id, {
            scripted: true
          }));
          setMission({
            id: ev.missionId,
            title: p.title,
            phase: "planning",
            done: false,
            stage: 0,
            hadDebate: false,
            startedAt: Date.now(),
            phaseIndex: null,
            subtasks: [],
            meeting: null,
            report: null
          });
          weather("clear");
          mascot("perk", { x: 18 });
          log("atlas", `${nameOf("atlas")} took on the mission: “${p.title}”`);
          break;
        }
      case "phase.gather":
        gather();
        log(null, "The squad gathers in the meeting room");
        break;
      case "phase.disperse":
        disperse();
        if (world.glide) world.glide(18 * 16, 12 * 16);
        break;
      case "agent.say":
        say(p.agentId, p.say, 6, p.tone);
        break;
      case "mission.plan":
        {
          setMission(m => m && {
            ...m,
            phase: "executing",
            phaseIndex: 0,
            stage: Math.max(m.stage || 0, 1),
            subtasks: p.subtasks.map(s => ({
              ...s
            }))
          });
          const assigned = new Set(p.subtasks.map(s => s.agentId));
          assigned.add("atlas");
          AS.AGENTS.forEach(a => {
            if (!assigned.has(a.id)) world.command(a.id, {
              scripted: false
            });
          });
          const why = p.assessment && p.assessment.handler === "model" ? ` (${p.assessment.complexity === "simple" ? "light mission" : "full squad"}${p.assessment.reason ? ` — ${p.assessment.reason}` : ""})` : "";
          log("atlas", `${nameOf("atlas")} planned phase 1 — ${p.subtasks.length} subtasks running in parallel${why}`);
          break;
        }
      case "phase.started":
        {
          setMission(m => m && {
            ...m,
            phase: "executing",
            phaseIndex: p.index,
            stage: Math.max(m.stage || 0, 1),
            subtasks: [...(m.subtasks || []), ...p.subtasks.map(s => ({ ...s }))]
          });
          const assigned = new Set(p.subtasks.map(s => s.agentId));
          AS.AGENTS.forEach(a => {
            if (assigned.has(a.id)) world.command(a.id, { scripted: true });
          });
          log("atlas", `${nameOf("atlas")} opened phase ${p.index + 1}: ${p.goal || ""} — ${p.subtasks.length} new subtasks`);
          break;
        }
      case "agent.share":
        {
          say(p.agentId, p.say || "Comparing notes…", 4.5, "talk");
          feel(p.agentId, "talk", null, 4);
          log(p.agentId, `${nameOf(p.agentId)} compared notes with ${(p.peers || []).map(nameOf).join(", ") || "the squad"}`);
          break;
        }
      case "agent.progress":
        {
          setMission(m => {
            if (!m) return m;
            const subtasks = m.subtasks.map(s => s.id === p.sub ? {
              ...s,
              status: p.status,
              ...(p.status === "done" ? {
                summary: p.summary,
                keyPoints: p.keyPoints,
                stance: p.stance,
                confidence: p.confidence
              } : {})
            } : s);
            return {
              ...m,
              subtasks,
              simulated: m.simulated || p.status === "done" && !!p.simulated
            };
          });
          if (p.status === "doing") {
            world.command(p.agentId, {
              goto: world.deskOf(p.agentId),
              state: "working",
              mood: "focused",
              emote: "think",
              emoteDur: 3.5
            });
            if (p.title) log(p.agentId, `${nameOf(p.agentId)} started: ${p.title}`);
          } else if (p.status === "done") {
            const wa = world.agents.find(a => a.id === p.agentId);
            if (wa && wa.stats) wa.stats.tasks++;
            if (p.simulated) say(p.agentId, "⚠ model unreachable — answered from offline fallback", 6, "warn");
            else if (p.say) say(p.agentId, p.say);
            log(p.agentId, `${nameOf(p.agentId)} concluded (${stanceLabel(p.stance)}${p.confidence ? ` · ${p.confidence}%` : ""}${p.simulated ? " · offline" : ""})`);
            if (!p.simulated) feel(p.agentId, p.stance === "oppose" ? "skeptical" : "happy", "idea");
            if (!p.simulated) mascot("progress");
            if (p.confidence != null && !p.simulated) {
              confSum += p.confidence;
              confN++;
            }
            setAurora(confN ? confSum / confN / 100 : null, 1);
          } else if (p.status === "failed") {
            world.crash(p.agentId, humanizeModelError(p.error || "model unreachable"));
          }
          break;
        }
      case "agent.tool":
        {
          const mark = p.allowed ? "✓" : "✗ denied";
          log(p.agentId, `${nameOf(p.agentId)} → ${p.server}/${p.tool} ${mark}`);
          if (p.allowed) {
            const tn = world._last || 0;
            if (tn > _toolCd) {
              _toolCd = tn + 6;
              if (world.feelCritter) world.feelCritter("_green", "curious", "question", 3);
            }
          }
          if (p.allowed && p.result) setMission(m => {
            if (!m) return m;
            const evidence = {
              ...(m.evidence || {})
            };
            evidence[p.agentId] = [...(evidence[p.agentId] || []), {
              server: p.server,
              tool: p.tool,
              args: p.args,
              result: p.result
            }];
            return {
              ...m,
              evidence
            };
          });
          break;
        }
      case "mission.clarify":
        {
          setMission(m => m && {
            ...m,
            phase: "clarifying",
            clarifyQuestion: p.question
          });
          say(p.agentId, `❓ ${p.question}`, 9);
          log(p.agentId, `${nameOf(p.agentId)} needs one detail from you: “${p.question}”`);
          break;
        }
      case "mission.clarified":
        log("atlas", `You answered: “${p.answer}” — the squad continues`);
        break;
      case "agent.question":
        {
          const leadDesk = world.deskOf(p.leadId);
          world.command(p.agentId, {
            goto: {
              x: leadDesk.x,
              y: leadDesk.y + 1
            },
            state: "moving"
          });
          setTimeout(() => say(p.agentId, `❓ ${p.question}`, 5.5), 2200);
          feel(p.agentId, "worried", "worry", 7);
          mascot("question", { x: leadDesk.x });
          log(p.agentId, `${nameOf(p.agentId)} walked over to ask the lead: “${p.question}”`);
          break;
        }
      case "agent.answer":
        {
          say(p.agentId, p.answer, 6);
          log(p.agentId, `${nameOf(p.agentId)} answered ${nameOf(p.to)}: “${p.answer}”`);
          setTimeout(() => world.command(p.to, {
            goto: world.deskOf(p.to),
            state: "working"
          }), 3000);
          break;
        }
      case "agent.message":
        {
          const toDesk = world.deskOf(p.to);
          if (toDesk) world.command(p.agentId, {
            goto: { x: toDesk.x, y: toDesk.y + 1 },
            state: "moving"
          });
          setTimeout(() => say(p.agentId, `✉️ ${p.body}`, 5, "talk"), 1800);
          feel(p.agentId, "talk", null, 4);
          log(p.agentId, `${nameOf(p.agentId)} messaged ${nameOf(p.to)}: “${p.body}”`);
          setTimeout(() => {
            const home = world.deskOf(p.agentId);
            if (home) world.command(p.agentId, { goto: home, state: "working" });
          }, 5200);
          break;
        }
      case "task.posted":
        {
          feel(p.agentId, "talk", "idea", 4);
          mascot("perk", {});
          log(p.agentId, `${nameOf(p.agentId)} posted a sub-task to the board: “${p.title}”`);
          break;
        }
      case "agent.ask":
        {
          const toDesk = world.deskOf(p.to);
          if (toDesk) world.command(p.agentId, {
            goto: { x: toDesk.x, y: toDesk.y + 1 },
            state: "moving"
          });
          setTimeout(() => say(p.agentId, `❓ ${p.question}`, 5, "talk"), 1600);
          feel(p.agentId, "talk", "think", 5);
          log(p.agentId, `${nameOf(p.agentId)} asked ${nameOf(p.to)}: “${p.question}”`);
          setTimeout(() => {
            const home = world.deskOf(p.agentId);
            if (home) world.command(p.agentId, { goto: home, state: "working" });
          }, 6000);
          break;
        }
      case "agent.reply":
        {
          say(p.agentId, p.answer, 6, "talk");
          log(p.agentId, `${nameOf(p.agentId)} answered ${nameOf(p.to)}: “${p.answer}”`);
          setTimeout(() => {
            const home = p.to && world.deskOf(p.to);
            if (home) world.command(p.to, { goto: home, state: "working" });
          }, 3000);
          break;
        }
      case "task.claimed":
        {
          world.command(p.agentId, { goto: world.deskOf(p.agentId), state: "working", mood: "focused", emote: "think", emoteDur: 3 });
          feel(p.agentId, "focused", "think", 4);
          log(p.agentId, `${nameOf(p.agentId)} picked up a board task: “${p.title}”`);
          break;
        }
      case "task.completed":
        {
          say(p.agentId, "✓ Done — posted to the board", 4, "happy");
          feel(p.agentId, "happy", "spark", 4);
          log(p.agentId, `${nameOf(p.agentId)} finished the board task: “${p.title}”`);
          break;
        }
      case "approval.request":
        {
          setMission(m => m && { ...m, pendingApproval: { approvalId: p.approvalId, tool: p.tool, summary: p.summary, agentId: p.agentId } });
          feel(p.agentId, "worried", "alert", 9);
          say(p.agentId, `⏸ Need the director's OK to run ${p.tool}`, 8, "warn");
          mascot("question", {});
          log(p.agentId, `${nameOf(p.agentId)} is waiting for your approval to run ${p.tool}`);
          break;
        }
      case "approval.resolved":
        {
          setMission(m => m && (m.pendingApproval && m.pendingApproval.approvalId === p.approvalId ? { ...m, pendingApproval: null } : m));
          log(null, `Approval ${p.decision === "allow" ? "granted ✓" : "denied ✗"}${p.reason ? ` (${p.reason})` : ""}`);
          break;
        }
      case "event.started":
        {
          AS.AGENTS.forEach(a => world.command(a.id, {
            scripted: true
          }));
          setMission(m => m && {
            ...m,
            phase: "event"
          });
          say(p.agentId, p.say, 7);
          log(p.agentId, `${nameOf(p.agentId)} kicked off the event: ${p.say}`);
          break;
        }
      case "event.race":
        {
          glideTo(AS.PLACES.pool);
          const lanes = [40, 41, 42, 43, 40];
          p.racers.forEach((id, i) => world.command(id, {
            goto: {
              x: 25,
              y: lanes[i % lanes.length]
            },
            state: "social",
            relax: "pool"
          }));
          world.command(p.leadId, {
            goto: {
              x: 27,
              y: 38
            },
            state: "social"
          });
          setTimeout(() => world.command(p.leadId, {
            say: "3… 2… 1… GO! 🏁"
          }), 8000);
          p.order.forEach((id, i) => {
            setTimeout(() => world.command(id, {
              goto: {
                x: 30,
                y: lanes[p.racers.indexOf(id) % lanes.length]
              },
              state: "social",
              relax: "pool"
            }), 9500 + i * 1400);
          });
          log(null, `🏊 Swim race: ${p.racers.map(nameOf).join(", ")} line up at the start`);
          break;
        }
      case "event.result":
        {
          say(p.agentId, p.say, 7);
          setTimeout(() => say(p.winner, "🏆", 5), 800);
          log(p.winner, `🏆 ${nameOf(p.winner)} won the swim race!`);
          break;
        }
      case "event.party":
        {
          const place = AS.PLACES[p.place];
          glideTo(place);
          const spots = place?.spots || [];
          AS.AGENTS.forEach((a, i) => {
            const spot = spots.length ? spots[i % spots.length] : place.door;
            world.command(a.id, {
              goto: spot,
              state: "social",
              relax: p.place === "court" ? "court" : "cafe"
            });
          });
          const cheers = ["🎉", "🥤 Cheers!", "🎵", "Best squad ever!", "🍕", "One more game!"];
          AS.AGENTS.forEach((a, i) => setTimeout(() => world.command(a.id, {
            say: cheers[i % cheers.length]
          }), 6000 + i * 2200));
          log(null, `🎉 The squad gathers at ${place.label}`);
          break;
        }
      case "event.ended":
        AS.AGENTS.forEach(a => world.command(a.id, {
          scripted: false
        }));
        if (world.glide) world.glide(18 * 16, 12 * 16);
        log(null, "Event ended — back to free time");
        break;
      case "agent.review":
        {
          setMission(m => m && {
            ...m,
            stage: Math.max(m.stage || 0, 2),
            subtasks: m.subtasks.map(s => s.id === p.sub ? {
              ...s,
              status: "review"
            } : s)
          });
          say(p.agentId, `Let me review ${nameOf(p.target)}'s results…`, 4.5);
          log(p.agentId, `${nameOf(p.agentId)} is reviewing ${nameOf(p.target)}'s results`);
          break;
        }
      case "agent.redo":
        {
          say(p.agentId, `${nameOf(p.target)}, please redo this: ${p.feedback}`, 6);
          setTimeout(() => say(p.target, "Got it, I'll redo it right away.", 4), 1800);
          log(p.agentId, `↻ ${nameOf(p.agentId)} sent it back to ${nameOf(p.target)}: “${p.feedback}”`);
          break;
        }
      case "agent.reviewed":
        if (!p.redone) log(p.agentId, `✓ ${nameOf(p.agentId)} approved ${nameOf(p.target)}'s results`);else log(p.agentId, `✓ ${nameOf(p.agentId)} approved ${nameOf(p.target)}'s revised results`);
        break;
      case "agent.takeover":
        feel(p.from, "skeptical", "mindblown", 4);
        mascot("worryFlag");
        log(p.agentId, `⤴ ${nameOf(p.from)} hit an error (${humanizeModelError(p.reason || "model error")}) — ${nameOf(p.agentId)} is taking over`);
        break;
      case "verify.started":
        bump(3);
        log(p.agentId, `${nameOf(p.agentId)} is fact-checking the squad's figures…`);
        break;
      case "verify.done":
        {
          const total = (p.flags || []).reduce((n, f) => n + f.count, 0);
          log(p.agentId, total ? `⚑ ${nameOf(p.agentId)} flagged ${total} claims (${p.flags.map(f => nameOf(f.agentId)).join(", ")}) — adjusted confidence` : `${nameOf(p.agentId)} fact-checked the figures — no issues`);
          if (total && world._aurora) setAurora(world._aurora.confTo - Math.min(0.3, total * 0.1), 1);else setAurora(null, 1);
          if (total) {
            (p.flags || []).forEach(f => {
              if (f.agentId) feel(f.agentId, "skeptical", "mindblown", 4);
            });
            feel(p.agentId, "happy", "cool", 4);
            mascot("worryFlag");
          }
          break;
        }
      case "synthesize.started":
        {
          bump(2);
          feel(p.agentId, "focused", "think", 4);
          log(p.agentId, `${nameOf(p.agentId)} is checking & synthesizing the phase…${p.iteration ? ` (phase ${p.iteration + 1})` : ""}`);
          break;
        }
      case "phase.synthesized":
        {
          if (p.sufficient) {
            log(p.agentId, `✓ ${nameOf(p.agentId)} synthesized phase ${p.index + 1} — enough to conclude`);
            feel(p.agentId, "happy", "cool", 4);
          } else {
            log(p.agentId, `⚠ ${nameOf(p.agentId)} synthesized phase ${p.index + 1} — opening another phase: ${p.nextGoal || ""}`);
            feel(p.agentId, "skeptical", "think", 4);
          }
          setMission(m => m && {
            ...m,
            phases: [...(m.phases || []).filter(e => e.index !== p.index), {
              index: p.index,
              summary: p.summary,
              sufficient: p.sufficient,
              concerns: p.concerns || [],
              nextGoal: p.nextGoal || null
            }].sort((a, b) => a.index - b.index)
          });
          break;
        }
      case "conflict.detected":
        {
          setMission(m => m && {
            ...m,
            phase: "meeting",
            stage: Math.max(m.stage || 0, 4),
            hadDebate: true,
            meeting: {
              turns: [],
              decision: null,
              rationale: null,
              conditions: []
            }
          });
          weather("storm");
          log(null, `Conflicting views detected (${p.summary.oppose.join(", ")} vs ${p.summary.support.join(", ")}) — summoning the squad`);
          break;
        }
      case "conflict.none":
        log(null, "No conflict — the squad agrees, no meeting needed");
        break;
      case "meeting.started":
        gather();
        if (world.glide) world.glide(25 * 16, 13.5 * 16);
        setTimeout(() => world.faceCenter && world.faceCenter(AS.AGENTS.map(a => a.id)), 3500);
        log(null, "The consensus meeting begins in the meeting room");
        break;
      case "meeting.turn":
        {
          say(p.agentId, p.say, 5);
          feel(p.agentId, p.stance === "oppose" ? "skeptical" : p.stance === "support" ? "happy" : "talk", null, 5);
          if (world.faceCenter) world.faceCenter(AS.AGENTS.map(a => a.id));
          if (p.conceded) {
            const toName = nameOf(p.towardAgentId);
            if (p.towardAgentId && world.walkTo) world.walkTo(p.agentId, p.towardAgentId);
            setTimeout(() => feel(p.agentId, "happy", "cool", 4), 900);
            if (world.cheerWave) setTimeout(() => world.cheerWave(AS.AGENTS.map(a => a.id), 2), 1400);
            log(p.agentId, `🤝 ${nameOf(p.agentId)} conceded${toName ? ` to ${toName}` : ""} — switched stance to ${stanceLabel(p.stance)}`);
          }
          setMission(m => {
            if (!m) return m;
            const meeting = m.meeting || {
              turns: [],
              decision: null,
              rationale: null,
              conditions: []
            };
            return {
              ...m,
              meeting: {
                ...meeting,
                turns: [...meeting.turns, {
                  agentId: p.agentId,
                  say: p.say,
                  argument: p.argument,
                  stance: p.stance,
                  round: p.round,
                  conceded: p.conceded || false,
                  towardAgentId: p.towardAgentId || null
                }]
              }
            };
          });
          break;
        }
      case "steer.applied":
        {
          log("atlas", `⚖ The director stepped into the meeting: “${p.text}”`);
          AS.AGENTS.forEach(a => feel(a.id, "talk", "think", 4));
          if (world.faceCenter) world.faceCenter(AS.AGENTS.map(a => a.id));
          setMission(m => {
            if (!m || !m.meeting) return m;
            const round = m.meeting.turns.reduce((r, t) => t.round != null ? Math.max(r, t.round) : r, 1);
            return {
              ...m,
              meeting: {
                ...m.meeting,
                turns: [...m.meeting.turns, {
                  director: true,
                  text: p.text,
                  round
                }]
              }
            };
          });
          break;
        }
      case "meeting.resolved":
        {
          say(p.agentId, p.say, 6.5);
          setMission(m => m && {
            ...m,
            phase: "reporting",
            meeting: {
              ...(m.meeting || {
                turns: []
              }),
              decision: p.decision,
              rationale: p.rationale,
              conditions: p.conditions || [],
              fragility: p.fragility || null
            }
          });
          weather(decisionWeather(p.decision));
          {
            const fin = /do-not-proceed/.test(p.decision) ? -1 : /proceed/.test(p.decision) ? 1 : 0;
            const tcx = (26 * 16 + 8) + fin * 44;
            if (world.celebrate) setTimeout(() => world.celebrate(tcx, 13 * 16 + 8), 200);
          }
          mascot("relieved");
          log("atlas", `Consensus reached: ${p.decision}`);
          break;
        }
      case "scenarios.started":
        {
          feel(p.agentId, "focused", "think", 4);
          log(p.agentId, `${nameOf(p.agentId)} is simulating best / most-likely / worst scenarios…`);
          break;
        }
      case "scenarios.done":
        {
          log(p.agentId, `${nameOf(p.agentId)} simulated ${(p.scenarios || []).length} scenarios`);
          mascot("progress");
          setMission(m => m && {
            ...m,
            scenarios: p.scenarios && p.scenarios.length ? p.scenarios : m.scenarios,
            sensitivity: p.sensitivity || m.sensitivity
          });
          break;
        }
      case "report.started":
        world.command(p.agentId, {
          goto: world.deskOf(p.agentId),
          state: "working"
        });
        setMission(m => m && {
          ...m,
          phase: "reporting",
          stage: Math.max(m.stage || 0, 5)
        });
        log(p.agentId, `${nameOf(p.agentId)} is writing the final report…`);
        break;
      case "report.ready":
        {
          setMission(m => m && {
            ...m,
            evaluations: p.evaluations && p.evaluations.length ? p.evaluations : m.evaluations,
            scenarios: p.scenarios && p.scenarios.length ? p.scenarios : m.scenarios,
            sensitivity: p.sensitivity || m.sensitivity,
            report: {
              markdown: p.markdown,
              recommendation: p.recommendation,
              confidence: p.confidence,
              confidenceRationale: p.confidenceRationale || null,
              breakdown: p.breakdown || null
            }
          });
          if (p.confidence != null) setAurora(p.confidence / 100, 1);
          if (p.confidence >= 80) feel(p.agentId, "happy", "fire", 5);
          {
            const desk = world.deskOf ? world.deskOf(p.agentId) : null;
            if (desk && world.glide) world.glide(desk.x * 16 + 8, desk.y * 16 + 8);
            if (desk && world.celebrate) setTimeout(() => world.celebrate(desk.x * 16 + 8, desk.y * 16 - 6), 250);
            if (world.playChime) setTimeout(() => world.playChime(), 300);
            if (p.confidence >= 80 && world.takePhoto) {
              world.takePhoto(world._navi ? "_navi" : "_capy", [p.agentId], { dur: 5.5 });
              if (world.cheerWave) world.cheerWave(AS.AGENTS.map(a => a.id), 2);
            } else if (p.confidence >= 80) mascot("reportHi", { desk });else mascot("reportLo");
          }
          log(p.agentId, "The final report is ready — open the mission panel to read it");
          break;
        }
      case "mission.completed":
        {
          setMission(m => m && {
            ...m,
            done: true,
            phase: "done",
            fragility: p.fragility || m.fragility || null
          });
          weather(decisionWeather(p.decision));
          log("atlas", `Mission complete: “${p.title}” ✓`);
          AS.AGENTS.forEach(a => feel(a.id, "celebrate", "party", 6));
          if (world.celebrate) world.celebrate();
          mascot("completed", { x: 18, y: 13 });
          if (world.cheerWave) world.cheerWave(AS.AGENTS.map(a => a.id), 2);
          setTimeout(() => world.mascotReact && world.mascotReact("spinpop", { x: 18, y: 13 }), 3400);
          setTimeout(() => world.groupPhoto && world.groupPhoto({ agentIds: AS.AGENTS.slice(0, 4).map(a => a.id) }), 8500);
          setTimeout(() => AS.AGENTS.forEach(a => world.command(a.id, {
            scripted: false
          })), 4000);
          setTimeout(() => world.mascotClear && world.mascotClear(), 16000);
            break;
        }
      case "mission.failed":
        {
          setMission(m => m && {
            ...m,
            done: true,
            stopped: false,
            phase: "failed"
          });
          weather("cool");
          log(null, `Mission failed: ${p.error}`);
          AS.AGENTS.forEach(a => world.command(a.id, {
            scripted: false
          }));
          disperse();
          mascot("failed");
          break;
        }
      case "mission.cancelled":
        {
          setMission(m => m && {
            ...m,
            done: true,
            failed: false,
            stopped: true,
            phase: "failed"
          });
          weather("cool");
          log(null, "Mission stopped");
          AS.AGENTS.forEach(a => world.command(a.id, {
            scripted: false
          }));
          disperse();
          break;
        }
      default:
        break;
    }
  };
}
