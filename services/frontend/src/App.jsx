import React from "react";
import AS from "./data.js";
import ASWorld from "./world/engine.js";
import { api, session, connectEvents } from "./api.js";
import { createMissionDriver } from "./missionDriver.js";
import { TopBar, Dock, ZoomControls, ActivityFeed, Login, Onboarding, Toaster } from "./components/chrome.jsx";
import { AgentPanel, AgentDashboard, MissionPanel, TasksPanel, MissionPill, IncidentPill, VerdictReveal, InboxPanel } from "./components/panels.jsx";
import "./styles/agentsphere.css";
const AMBIENT_LOG = {
  cafe: "grabbed a pantry coffee",
  gym: "hit the GreenNode gym",
  pool: "went for a swim in the pool",
  park: "visited cây lộc vừng siuuu to",
  court: "shot some hoops on the basketball court",
  courtyard: "relaxed at the Seating Area",
  atrium: "admired the atrium tree",
  lobby: "hung out in the Main Lobby",
  store: "did a 7-Eleven snack run",
  game: "played a round at the Game Corner",
  nap: "dozed off at their desk",
  resume: "returned to their desk"
};
let __logSeq = 0;
const DEFAULT_AGENTS = AS.AGENTS.map(a => ({
  id: a.id,
  name: a.name,
  model: a.model,
  models: [...a.models],
  provider: a.provider
}));
function applySquad(squad) {
  if (!squad) return;
  squad.forEach(s => {
    const def = AS.AGENTS.find(a => a.id === s.id);
    if (!def) return;
    const models = Array.isArray(s.models) && s.models.length ? s.models : [s.model];
    def.name = s.name;
    def.models = models;
    def.model = models[0];
    def.provider = s.provider || AS.providerOf(models[0]);
    def.mandate = s.mandate || "";
  });
}
const resetSquad = () => applySquad(DEFAULT_AGENTS);
const PHASE_MAP = {
  planning: "planning",
  executing: "executing",
  meeting: "meeting",
  reporting: "reporting",
  clarifying: "clarifying",
  event: "event",
  done: "done",
  failed: "failed",
  cancelled: "failed"
};
const STAGE_MAP = {
  clarifying: 0,
  planning: 0,
  executing: 1,
  meeting: 4,
  reporting: 5,
  event: 1,
  done: 6,
  failed: 6,
  cancelled: 6
};
function missionFromSnapshot(m) {
  if (!m) return null;
  const terminal = m.status === "done" || m.status === "failed" || m.status === "cancelled";
  const outputs = m.outputs || [];
  const outOf = s => outputs.find(o => o.agentId === s.agentId && (o.focus === s.title || o.phase === s.phase));
  const subtasks = (m.subtasks || []).map(s => {
    const o = outOf(s);
    return {
      ...s,
      ...(s.status === "done" && o ? {
        summary: o.summary,
        keyPoints: o.keyPoints,
        stance: o.stance,
        confidence: o.confidence
      } : {})
    };
  });
  const breakdown = outputs.map(o => ({
    agentId: o.agentId,
    name: o.name,
    focus: o.focus,
    lens: o.lens,
    stance: o.stance,
    confidence: o.confidence,
    confidenceBefore: o.confidenceBefore,
    flags: o.flags,
    simulated: o.simulated,
    takeover: o.takeover
  }));
  const evidence = {};
  for (const o of outputs) if (o.agentId && (o.toolCalls || []).length) evidence[o.agentId] = o.toolCalls.map(tc => ({
    server: tc.server,
    tool: tc.tool,
    args: tc.args,
    result: tc.result
  }));
  return {
    id: m.id,
    title: m.title,
    phase: PHASE_MAP[m.status] || "planning",
    done: terminal,
    failed: m.status === "failed",
    stopped: m.status === "cancelled" || !!m.cancelRequested,
    stage: STAGE_MAP[m.status] ?? 0,
    hadDebate: !!m.meeting,
    clarifyQuestion: m.clarifyQuestion || null,
    simulated: outputs.some(o => o.simulated),
    depth: m.depth || "quick",
    scenarios: m.scenarios && m.scenarios.scenarios ? m.scenarios.scenarios : null,
    sensitivity: m.scenarios ? m.scenarios.sensitivity : null,
    subtasks,
    evidence,
    phases: (m.phases || []).map(p => ({ index: p.index, goal: p.goal, summary: p.synthesis?.phaseSummary || "", sufficient: !!p.synthesis?.sufficient, concerns: p.synthesis?.concerns || [] })),
    evaluations: m.evaluations || [],
    fragility: m.fragility || m.meeting?.fragility || null,
    decision: m.decision || m.meeting?.decision || null,
    meeting: m.meeting ? {
      turns: m.meeting.transcript || [],
      decision: m.meeting.decision,
      rationale: m.meeting.rationale,
      conditions: m.meeting.conditions || [],
      fragility: m.meeting.fragility || null
    } : null,
    report: m.report ? {
      markdown: m.report.markdown,
      recommendation: m.report.recommendation,
      confidence: m.report.confidence,
      confidenceRationale: m.report.confidenceRationale,
      breakdown
    } : null
  };
}
export default function App() {
  const [user, setUser] = React.useState(session.user);
  const [onboard, setOnboard] = React.useState(false);
  const [squadLoaded, setSquadLoaded] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [clock, setClock] = React.useState("09:00");
  const [connected, setConnected] = React.useState(false);
  const [online, setOnline] = React.useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [panel, setPanel] = React.useState(null);
  const [selectedAgent, setSelectedAgent] = React.useState(null);
  const [feed, setFeed] = React.useState([]);
  const [agentStates, setAgentStates] = React.useState({});
  const [mission, setMission] = React.useState(null);
  const [composeIntent, setComposeIntent] = React.useState(false);
  const [grantsByRole, setGrantsByRole] = React.useState({});
  const [verdict, setVerdict] = React.useState(null);
  const [briefings, setBriefings] = React.useState({
    briefings: [],
    unread: 0
  });
  const [inboxOpenId, setInboxOpenId] = React.useState(null);
  const [toasts, setToasts] = React.useState([]);
  const toastSeq = React.useRef(0);
  const dismissToast = React.useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  const toast = React.useCallback((msg, kind = "info") => {
    if (!msg) return;
    const id = ++toastSeq.current;
    setToasts(t => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const loadBriefings = React.useCallback(() => {
    api.briefings().then(b => setBriefings(b || {
      briefings: [],
      unread: 0
    })).catch(() => {});
  }, []);
  React.useEffect(() => {
    if (!user) return;
    let dead = false;
    setSquadLoaded(false);
    api.getSquad().then(r => {
      if (dead) return;
      if (r.squad) {
        applySquad(r.squad);
        setOnboard(false);
      } else {
        resetSquad();
        setOnboard(true);
      }
      setSquadLoaded(true);
    }).catch(() => {
      if (dead) return;
      resetSquad();
      setOnboard(true);
      setSquadLoaded(true);
    });
    return () => {
      dead = true;
    };
  }, [user]);
  const canvasRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const driverRef = React.useRef(null);
  const missionRef = React.useRef(null);
  React.useEffect(() => {
    missionRef.current = mission;
  }, [mission]);
  const decideApproval = React.useCallback(decision => {
    const m = missionRef.current;
    if (!m || !m.pendingApproval) return;
    const approvalId = m.pendingApproval.approvalId;
    setMission(cur => cur && cur.pendingApproval && cur.pendingApproval.approvalId === approvalId ? { ...cur, pendingApproval: null } : cur);
    api.approveMission(m.id, approvalId, decision).catch(() => toast("Approval failed", "warn"));
  }, [toast]);
  React.useEffect(() => {
    const onKey = e => {
      if (e.key !== "Escape") return;
      setSelectedAgent(null);
      setPanel(null);
      if (worldRef.current) worldRef.current.selected = null;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const hadReport = React.useRef(false);
  const wasClarifying = React.useRef(false);
  React.useEffect(() => {
    const has = !!mission?.report;
    if (has && !hadReport.current) {
      setSelectedAgent(null);
      if (worldRef.current) worldRef.current.selected = null;
      setPanel("mission");
      setComposeIntent(false);
      setVerdict({
        recommendation: mission.report.recommendation,
        confidence: mission.report.confidence,
        decision: mission.meeting?.decision || mission.decision || null
      });
    }
    hadReport.current = has;
    const clarifying = mission?.phase === "clarifying";
    if (clarifying && !wasClarifying.current && !selectedAgent) {
      setPanel("mission");
      setComposeIntent(false);
    }
    wasClarifying.current = clarifying;
  }, [mission, selectedAgent]);
  React.useEffect(() => {
    const id = mission?.id;
    if (!id || mission.failed || mission.done && mission.report) return;
    let dead = false,
      inflight = false;
    const reconcile = m => {
      const terminal = m.status === "done" || m.status === "failed" || m.status === "cancelled";
      if (!terminal && !m.report) return false;
      const report = m.report ? m.report.breakdown ? m.report : {
        ...m.report,
        breakdown: (m.outputs || [])
      } : null;
      setMission(cur => {
        if (!cur || cur.id !== id) return cur;
        return {
          ...cur,
          done: cur.done || terminal,
          failed: cur.failed || m.status === "failed",
          stopped: cur.stopped || m.status === "cancelled" || !!m.cancelRequested,
          phase: m.status === "failed" || m.status === "cancelled" ? "failed" : m.status === "done" ? "done" : cur.phase,
          decision: cur.decision || m.decision || m.meeting?.decision || null,
          stage: terminal ? 6 : cur.stage || 0,
          report: cur.report || report,
          meeting: cur.meeting || (m.meeting ? {
            turns: m.meeting.transcript || [],
            decision: m.meeting.decision,
            rationale: m.meeting.rationale,
            conditions: m.meeting.conditions || []
          } : null)
        };
      });
      return terminal;
    };
    const tick = () => {
      if (dead || inflight) return;
      inflight = true;
      api.getMission(id).then(m => {
        inflight = false;
        if (dead || !m) return;
        if (reconcile(m)) {
          dead = true;
          clearInterval(iv);
        }
      }).catch(() => {
        inflight = false;
      });
    };
    const iv = setInterval(tick, 7000);
    const t0 = setTimeout(tick, 2500);
    return () => {
      dead = true;
      clearInterval(iv);
      clearTimeout(t0);
    };
  }, [mission?.id, mission?.done, mission?.report, mission?.failed]);
  const log = React.useCallback((agentId, text, kind = "mission") => {
    const w = worldRef.current;
    setFeed(f => [{
      id: ++__logSeq,
      time: w ? w.clockText() : "",
      agentId,
      text,
      kind
    }, ...f].slice(0, 120));
  }, []);
  React.useEffect(() => {
    const world = ASWorld.create(canvasRef.current, {
      onAgentClick: id => {
        setSelectedAgent(id);
        setPanel(null);
      },
      onActivity: ev => {
        if (ev.kind === "huddle") {
          const names = ev.agents.map(id => (AS.AGENTS.find(a => a.id === id) || {}).name).join(", ");
          const place = AS.PLACES[ev.place];
          log(ev.agents[0], `${names} are having a side chat at ${place.label}`, "ambient");
          return;
        }
        const def = AS.AGENTS.find(a => a.id === ev.agentId);
        if (!def) return;
        if (ev.kind === "crash") {
          log(ev.agentId, `⚠ ${def.name} crashed — ${ev.err}`);
        } else if (ev.kind === "revive") {
          log(ev.agentId, `${def.name} is being revived…`);
        } else if (ev.kind === "reviveDone") {
          log(ev.agentId, `${def.name} is back online ✓`);
        } else {
          const part = AMBIENT_LOG[ev.kind];
          if (part) log(ev.agentId, `${def.name} ${part}`, "ambient");
        }
      }
    });
    worldRef.current = world;
    window.ASWORLD = world;
    driverRef.current = createMissionDriver({
      world,
      log,
      setMission: next => setMission(typeof next === "function" ? next(missionRef.current) : next)
    });
    const iv = setInterval(() => {
      setClock(world.clockText());
      const st = {};
      world.agents.forEach(a => {
        const m = missionRef.current;
        const sub = m && !m.done ? (m.subtasks || []).find(s => s.agentId === a.id && s.status !== "done") : null;
        st[a.id] = {
          state: a.state,
          stats: a.stats,
          err: a.crashErr,
          task: sub ? sub.title : null
        };
      });
      setAgentStates(st);
    }, 700);
    return () => {
      clearInterval(iv);
      world.destroy();
    };
  }, []);
  const wsDownRef = React.useRef(false);
  React.useEffect(() => {
    if (!user) return;
    const conn = connectEvents({
      onEvent: ev => driverRef.current && driverRef.current(ev),
      onStatus: s => {
        const open = s === "open";
        setConnected(open);
        if (open && wsDownRef.current) {
          wsDownRef.current = false;
          toast(AS.STR.toast.reconnected, "ok");
        } else if (!open && !wsDownRef.current) {
          wsDownRef.current = true;
          toast(AS.STR.toast.reconnecting, "warn");
        }
      }
    });
    return () => conn.close();
  }, [user, toast]);
  React.useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  React.useEffect(() => {
    if (!user || !squadLoaded || missionRef.current) return;
    let dead = false;
    api.listMissions().then(list => {
      if (dead || missionRef.current) return null;
      const active = (list || []).find(m => m.status !== "done" && m.status !== "failed" && m.status !== "cancelled");
      return active ? api.getMission(active.id) : null;
    }).then(full => {
      if (dead || missionRef.current || !full) return;
      setMission(missionFromSnapshot(full));
      setPanel("mission");
      log("atlas", `Restored your mission in progress: “${full.title}”`);
      toast(AS.STR.toast.restored, "info");
    }).catch(() => {});
    return () => {
      dead = true;
    };
  }, [user, squadLoaded, log, toast]);
  React.useEffect(() => {
    if (!user) return;
    let dead = false;
    (async () => {
      const out = {};
      for (const role of [...new Set(AS.AGENTS.map(a => a.policyRole || "worker"))]) {
        try {
          out[role] = await api.grants(role);
        } catch {}
      }
      if (!dead) setGrantsByRole(out);
    })();
    return () => {
      dead = true;
    };
  }, [user]);
  React.useEffect(() => {
    if (!user) return;
    loadBriefings();
    const iv = setInterval(loadBriefings, 60_000);
    return () => clearInterval(iv);
  }, [user, loadBriefings]);
  const doneToastRef = React.useRef(null);
  React.useEffect(() => {
    if (!mission?.done) return;
    loadBriefings();
    if (doneToastRef.current !== mission.id) {
      doneToastRef.current = mission.id;
      toast(mission.stopped ? "Mission stopped" : mission.failed ? AS.STR.toast.failed : AS.STR.toast.done, mission.stopped ? "info" : mission.failed ? "warn" : "ok");
    }
  }, [mission?.done, mission?.failed, mission?.id, mission?.stopped, loadBriefings, toast]);
  const startMission = React.useCallback(async (title, depth) => {
    const resp = await api.startMission(title, depth);
    setSelectedAgent(null);
    setPanel("mission");
    if (resp && resp.id) {
      setMission(cur => cur && cur.id === resp.id ? cur : {
        id: resp.id,
        title: resp.title || title,
        depth: depth === "deep" ? "deep" : "quick",
        phase: resp.status === "running" ? "planning" : "queued",
        queued: resp.queued ?? 0,
        done: false,
        failed: false,
        stage: 0,
        hadDebate: false,
        subtasks: [],
        meeting: null,
        report: null
      });
      toast(resp.status === "running" ? AS.STR.toast.assigned : AS.STR.toast.queued, "info");
    }
  }, [toast]);
  const cancelMission = React.useCallback(id => {
    if (!id) return;
    toast("Stopping the mission…", "info");
    api.cancelMission(id).catch(() => {});
  }, [toast]);
  const revive = React.useCallback(id => {
    worldRef.current && worldRef.current.revive(id);
  }, []);
  const locate = id => {
    worldRef.current.focusAgent(id);
  };
  const zoom = dir => {
    const w = worldRef.current;
    const zooms = [2, 3, 4, 5];
    const i = zooms.indexOf(w.cam.zoom);
    w.setZoom(zooms[Math.max(0, Math.min(zooms.length - 1, i + dir))]);
  };
  const finishOnboarding = async squad => {
    applySquad(squad);
    const payload = squad.map(s => ({
      id: s.id,
      name: s.name,
      model: s.model,
      models: s.models || [s.model],
      provider: s.provider,
      mandate: s.mandate || ""
    }));
    try {
      await api.saveSquad(payload);
    } catch {}
    setOnboard(false);
    setSettingsOpen(false);
    log(null, `Squad ready — ${AS.AGENTS.length} agents online`);
  };
  const onLogin = React.useCallback((token, u) => {
    session.save(token, u);
    setUser(u);
    log(null, `${u.name} signed in`);
  }, [log]);
  const onLogout = React.useCallback(() => {
    session.clear();
    setUser(null);
    setMission(null);
    setPanel(null);
    setSelectedAgent(null);
    setSettingsOpen(false);
    setOnboard(false);
    setSquadLoaded(false);
  }, []);
  React.useEffect(() => {
    const onUnauth = () => onLogout();
    window.addEventListener("agentsphere:unauthorized", onUnauth);
    return () => window.removeEventListener("agentsphere:unauthorized", onUnauth);
  }, [onLogout]);
  const dockSelect = id => {
    setSelectedAgent(null);
    setPanel(p => p === id ? null : id);
  };
  const dockActive = selectedAgent ? null : panel;
  const openAgent = id => {
    setSelectedAgent(id);
    setPanel(null);
    worldRef.current.selected = id;
  };
  const closeAgent = () => {
    setSelectedAgent(null);
    worldRef.current.selected = null;
  };
  const downId = Object.keys(agentStates).find(id => agentStates[id].state === "down" || agentStates[id].state === "reviving");
  const selectedDef = selectedAgent ? AS.AGENTS.find(a => a.id === selectedAgent) : null;
  const rightContent = selectedAgent ? <AgentPanel agentId={selectedAgent} liveState={agentStates[selectedAgent]} grants={selectedDef ? grantsByRole[selectedDef.policyRole || "worker"] : null} missionId={mission ? mission.id : null} onClose={closeAgent} onLocate={locate} onRevive={revive} onAssignMission={async text => {
    await startMission(text);
    closeAgent();
  }} onOpenLead={() => openAgent("atlas")} /> : panel === "activity" ? <ActivityFeed items={feed} onClose={() => setPanel(null)} onAgent={openAgent} /> : panel === "agents" ? <AgentDashboard states={agentStates} onClose={() => setPanel(null)} onAgent={openAgent} /> : panel === "inbox" ? <InboxPanel briefings={briefings.briefings} onClose={() => setPanel(null)} onMarkAllRead={() => {
    api.markBriefingsRead().catch(() => {});
    setBriefings(b => ({
      ...b,
      unread: 0
    }));
  }} onOpenMission={id => {
    setInboxOpenId(id);
    setPanel("tasks");
  }} onCompose={() => setPanel("mission")} /> : panel === "tasks" ? <TasksPanel liveMission={mission} autoOpenId={inboxOpenId} onCompose={() => setPanel("mission")} onClose={() => {
    setPanel(null);
    setInboxOpenId(null);
  }} /> : panel === "mission" ? <MissionPanel mission={mission} compose={composeIntent} onComposeChange={setComposeIntent} onClose={() => setPanel(null)} onAssign={startMission} onToast={toast} onSteer={(id, text) => api.steerMission(id, text).catch(() => toast(AS.STR.toast.assignFailed, "warn"))} onCancel={cancelMission} /> : null;
  const showApp = user && squadLoaded && !onboard && !settingsOpen;
  return <div>
      <canvas id="world-canvas" ref={canvasRef}></canvas>
      <div className="as-root">
        <Toaster toasts={toasts} onDismiss={dismissToast} />
        {!user && <Login onLogin={onLogin} />}
        {showApp && <TopBar clock={clock} worldName={AS.STR.worldName} onlineCount={AS.AGENTS.length} connected={connected} onSetup={() => setSettingsOpen(true)} user={user} onLogout={onLogout} />}
        {showApp && (!online || !connected) && <div className={"as-conn-bar" + (!online ? " off" : "")} role="status">
            <span className="as-conn-dot"></span>
            {!online ? "You're offline — the squad keeps working on the server. Results will sync when you reconnect." : "Reconnecting to the live feed… your mission keeps running on the server."}
          </div>}
        {showApp && mission && !selectedAgent && panel !== "mission" && <MissionPill mission={mission} onClick={() => {
        setSelectedAgent(null);
        setComposeIntent(false);
        setPanel("mission");
      }} />}
        {showApp && downId && <IncidentPill agentId={downId} state={agentStates[downId].state} offset={mission && !selectedAgent && panel !== "mission" ? 1 : 0} onRevive={revive} onOpen={openAgent} onLocate={locate} />}
        {showApp && mission && mission.pendingApproval && (() => {
        const pa = mission.pendingApproval;
        const who = (AS.AGENTS.find(a => a.id === pa.agentId) || {}).name || pa.agentId;
        return <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1b1f2aee", color: "#fff", border: "1px solid #f5a623", borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 28px #0009", display: "flex", gap: 14, alignItems: "center", maxWidth: 600, backdropFilter: "blur(8px)" }}>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, color: "#f5a623", marginBottom: 2 }}>⏸ Approval needed</div>
              <div><strong>{who}</strong> wants to run <code style={{ background: "#0004", padding: "1px 6px", borderRadius: 4 }}>{pa.tool}</code>{pa.summary ? <span style={{ opacity: 0.8 }}> — {pa.summary}</span> : null}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => decideApproval("allow")} style={{ background: "#2ecc71", color: "#06210f", border: 0, borderRadius: 8, padding: "8px 15px", fontWeight: 700, cursor: "pointer" }}>Approve</button>
              <button onClick={() => decideApproval("deny")} style={{ background: "#e74c3c", color: "#fff", border: 0, borderRadius: 8, padding: "8px 15px", fontWeight: 700, cursor: "pointer" }}>Deny</button>
            </div>
          </div>;
      })()}
        {showApp && rightContent}
        {showApp && <VerdictReveal verdict={verdict} onDismiss={() => setVerdict(null)} />}
        {showApp && <ZoomControls onZoom={zoom} />}
        {showApp && <Dock active={dockActive} unread={briefings.unread} onSelect={dockSelect} onMission={() => {
        setSelectedAgent(null);
        setComposeIntent(true);
        setPanel(p => p === "mission" ? null : "mission");
      }} />}
        {user && squadLoaded && onboard && <Onboarding returning={false} user={user} onLogout={onLogout} onDone={finishOnboarding} onCancel={() => setOnboard(false)} />}
        {user && squadLoaded && !onboard && settingsOpen && <Onboarding returning={true} onDone={finishOnboarding} onCancel={() => setSettingsOpen(false)} />}
      </div>
    </div>;
}
