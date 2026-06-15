import AS from "./data.js";
const nameOf = id => (AS.AGENTS.find(a => a.id === id) || {}).name || id;
export function createMissionDriver({
  world,
  log,
  setMission
}) {
  const gather = () => {
    const spots = AS.PLACES.meeting.spots;
    AS.AGENTS.forEach((a, i) => world.command(a.id, {
      goto: spots[i % spots.length],
      state: "meeting"
    }));
  };
  const disperse = () => {
    AS.AGENTS.forEach(a => world.command(a.id, {
      goto: world.deskOf(a.id),
      state: "working"
    }));
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
  let supVotes = 0,
    oppVotes = 0;
  const setTug = patch => {
    world._tug = Object.assign(world._tug || {
      pos: 0,
      target: 0,
      jolt: 0,
      active: false,
      snap: false
    }, patch);
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
            subtasks: [],
            meeting: null,
            report: null
          });
          weather("clear");
          mascot("perk", { x: 18 });
          log("atlas", `${nameOf("atlas")} received the mission: “${p.title}”`);
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
          log("atlas", `${nameOf("atlas")} decomposed the mission into ${p.subtasks.length} subtasks and assigned them${why}`);
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
            if (p.simulated) say(p.agentId, "⚠ model unreachable — answered from offline fallback", 6, "warn");
            else if (p.say) say(p.agentId, p.say);
            log(p.agentId, `${nameOf(p.agentId)} concluded (${p.stance || "done"}${p.confidence ? ` · ${p.confidence}%` : ""}${p.simulated ? " · offline fallback" : ""})`);
            if (!p.simulated) feel(p.agentId, p.stance === "oppose" ? "skeptical" : "happy", "idea");
            if (!p.simulated) mascot("progress");
            if (p.confidence != null && !p.simulated) {
              confSum += p.confidence;
              confN++;
            }
            setAurora(confN ? confSum / confN / 100 : null, 1);
          } else if (p.status === "failed") {
            world.crash(p.agentId, p.error || "model unreachable");
            log(p.agentId, `✗ ${nameOf(p.agentId)} went down — ${p.error || "model unreachable"}`);
          }
          break;
        }
      case "agent.tool":
        {
          const mark = p.allowed ? "✓" : "✗ denied by policy";
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
        log("atlas", `You answered: “${p.answer}” — the squad resumes`);
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
          log(p.agentId, `${nameOf(p.agentId)} walks over to ask the lead: “${p.question}”`);
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
          log(p.agentId, `${nameOf(p.agentId)} kicks off the event: ${p.say}`);
          break;
        }
      case "event.race":
        {
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
          log(null, `🏊 Swim race: ${p.racers.map(nameOf).join(", ")} line up in the pool`);
          break;
        }
      case "event.result":
        {
          say(p.agentId, p.say, 7);
          setTimeout(() => say(p.winner, "🏆", 5), 800);
          log(p.winner, `🏆 ${nameOf(p.winner)} wins the swim race!`);
          break;
        }
      case "event.party":
        {
          const place = AS.PLACES[p.place];
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
        log(null, "Event wrapped — back to free time");
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
          say(p.agentId, `Để tôi xem lại kết quả của ${nameOf(p.target)}…`, 4.5);
          log(p.agentId, `${nameOf(p.agentId)} is reviewing ${nameOf(p.target)}'s result`);
          break;
        }
      case "agent.redo":
        {
          say(p.agentId, `${nameOf(p.target)}, làm lại nhé: ${p.feedback}`, 6);
          setTimeout(() => say(p.target, "Rõ, tôi làm lại ngay.", 4), 1800);
          log(p.agentId, `↻ ${nameOf(p.agentId)} sent it back to ${nameOf(p.target)}: “${p.feedback}”`);
          break;
        }
      case "agent.reviewed":
        if (!p.redone) log(p.agentId, `✓ ${nameOf(p.agentId)} approved ${nameOf(p.target)}'s result`);else log(p.agentId, `✓ ${nameOf(p.agentId)} approved ${nameOf(p.target)}'s revised result`);
        break;
      case "agent.takeover":
        feel(p.from, "skeptical", "mindblown", 4);
        mascot("worryFlag");
        log(p.agentId, `⤴ ${nameOf(p.from)} hit an error (${p.reason || "model failure"}) — ${nameOf(p.agentId)} is taking over the ${p.role || ""} task`);
        break;
      case "verify.started":
        bump(3);
        log(p.agentId, `${nameOf(p.agentId)} is fact-checking the squad's numbers…`);
        break;
      case "verify.done":
        {
          const total = (p.flags || []).reduce((n, f) => n + f.count, 0);
          log(p.agentId, total ? `⚑ ${nameOf(p.agentId)} flagged ${total} claim${total > 1 ? "s" : ""} (${p.flags.map(f => f.role).join(", ")}) — confidence adjusted` : `${nameOf(p.agentId)} verified the squad's numbers — no issues found`);
          if (total && world._aurora) setAurora(world._aurora.confTo - Math.min(0.3, total * 0.1), 1);else setAurora(null, 1);
          if (total) {
            (p.flags || []).forEach(f => {
              const ag = AS.AGENTS.find(a => a.agentRole === f.role);
              if (ag) feel(ag.id, "skeptical", "mindblown", 4);
            });
            feel(p.agentId, "happy", "cool", 4);
            mascot("worryFlag");
          }
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
          supVotes = 0;
          oppVotes = 0;
          setTug({ pos: 0, target: 0, jolt: 0.5, active: true, snap: false });
          mascot("spectate");
          log(null, `Conflicting stances detected (${p.summary.oppose.join(", ")} vs ${p.summary.support.join(", ")}) — convening the squad`);
          break;
        }
      case "conflict.none":
        log(null, "No conflict — the squad aligned without a meeting");
        break;
      case "meeting.started":
        gather();
        mascot("spectate");
        if (world.glide) world.glide(26 * 16, 13.5 * 16);
        setTimeout(() => world.faceCenter && world.faceCenter(AS.AGENTS.map(a => a.id)), 3500);
        log(null, "Consensus meeting starts in the meeting room");
        break;
      case "meeting.turn":
        {
          say(p.agentId, p.say, 5);
          feel(p.agentId, p.stance === "oppose" ? "skeptical" : p.stance === "support" ? "happy" : "talk", null, 5);
          if (world.faceCenter) world.faceCenter(AS.AGENTS.map(a => a.id));
          if (p.stance === "support") supVotes++;else if (p.stance === "oppose") oppVotes++;
          {
            const tot = supVotes + oppVotes;
            setTug({ active: true, target: tot ? (supVotes - oppVotes) / tot : 0, jolt: 0.55 });
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
                  round: p.round
                }]
              }
            };
          });
          break;
        }
      case "steer.applied":
        {
          log("atlas", `⚖ Giám đốc chen vào cuộc họp: “${p.text}”`);
          AS.AGENTS.forEach(a => feel(a.id, "talk", "think", 4));
          if (world.faceCenter) world.faceCenter(AS.AGENTS.map(a => a.id));
          setTug({ active: true, jolt: 1 });
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
              conditions: p.conditions || []
            }
          });
          weather(decisionWeather(p.decision));
          {
            const fin = /do-not-proceed/.test(p.decision) ? -1 : /proceed/.test(p.decision) ? 1 : 0;
            setTug({ active: true, target: fin, snap: true, jolt: 1 });
            const tcx = (26 * 16 + 8) + fin * 44;
            if (world.celebrate) setTimeout(() => world.celebrate(tcx, 13 * 16 + 8), 200);
            setTimeout(() => setTug({ active: false, snap: false }), 4200);
          }
          mascot("relieved");
          log("atlas", `Consensus reached: ${p.decision}`);
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
            report: {
              markdown: p.markdown,
              recommendation: p.recommendation,
              confidence: p.confidence,
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
          log(p.agentId, "Final report is ready — open the mission panel to read it");
          break;
        }
      case "mission.completed":
        {
          setMission(m => m && {
            ...m,
            done: true,
            phase: "done"
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
      default:
        break;
    }
  };
}
