import React from "react";
import AS from "./data.js";
import ASWorld from "./world/engine.js";
import { api, session, connectEvents } from "./api.js";
import { createMissionDriver } from "./missionDriver.js";
import { TopBar, Dock, ZoomControls, ActivityFeed, Login, Onboarding } from "./components/chrome.jsx";
import { AgentPanel, AgentDashboard, MissionPanel, TasksPanel, MissionPill, IncidentPill, VerdictReveal, InboxPanel } from "./components/panels.jsx";
import "./styles/agentsphere.css";
const AMBIENT_LOG = {
  cafe: "took a break at the food hall",
  gym: "hit the GreenNode gym",
  pool: "went for a swim in the pool",
  park: "went for a walk around the lake",
  field: "kicked a ball around the VNG pitch",
  court: "shot some hoops on the basketball court",
  courtyard: "relaxed in The Loop's inner courtyard",
  nap: "dozed off at their desk for a minute",
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
export default function App() {
  const [user, setUser] = React.useState(session.user);
  const [onboard, setOnboard] = React.useState(false);
  const [squadLoaded, setSquadLoaded] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [clock, setClock] = React.useState("09:00");
  const [connected, setConnected] = React.useState(false);
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
      const terminal = m.status === "done" || m.status === "failed";
      if (!terminal && !m.report) return false;
      const report = m.report ? m.report.breakdown ? m.report : {
        ...m.report,
        breakdown: (m.outputs || []).filter(o => o.role !== "reporter")
      } : null;
      setMission(cur => {
        if (!cur || cur.id !== id) return cur;
        return {
          ...cur,
          done: cur.done || terminal,
          failed: cur.failed || m.status === "failed",
          phase: m.status === "failed" ? "failed" : m.status === "done" ? "done" : cur.phase,
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
  const log = React.useCallback((agentId, text) => {
    const w = worldRef.current;
    setFeed(f => [{
      id: ++__logSeq,
      time: w ? w.clockText() : "",
      agentId,
      text
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
          log(ev.agents[0], `${names} are having a side chat at ${place.label}`);
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
          if (part) log(ev.agentId, `${def.name} ${part}`);
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
  React.useEffect(() => {
    if (!user) return;
    const conn = connectEvents({
      onEvent: ev => driverRef.current && driverRef.current(ev),
      onStatus: s => setConnected(s === "open")
    });
    return () => conn.close();
  }, [user]);
  React.useEffect(() => {
    if (!user) return;
    let dead = false;
    (async () => {
      const out = {};
      for (const a of AS.AGENTS) {
        try {
          out[a.agentRole] = await api.grants(a.agentRole);
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
  React.useEffect(() => {
    if (mission?.done) loadBriefings();
  }, [mission?.done, loadBriefings]);
  const startMission = React.useCallback(async title => {
    await api.startMission(title);
    setSelectedAgent(null);
    setPanel("mission");
  }, []);
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
    log(null, "Squad ready — 6 agents online");
  };
  const onLogin = React.useCallback((token, u) => {
    session.save(token, u);
    setUser(u);
    log(null, `${u.name} signed in`);
  }, [log]);
  const onLogout = React.useCallback(() => {
    session.clear();
    setUser(null);
    setPanel(null);
    setSelectedAgent(null);
    setSettingsOpen(false);
    setOnboard(false);
    setSquadLoaded(false);
  }, []);
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
  const rightContent = selectedAgent ? <AgentPanel agentId={selectedAgent} liveState={agentStates[selectedAgent]} grants={selectedDef ? grantsByRole[selectedDef.agentRole] : null} missionId={mission ? mission.id : null} onClose={closeAgent} onLocate={locate} onRevive={revive} onAssignMission={async text => {
    closeAgent();
    await startMission(text);
  }} onOpenLead={() => openAgent("atlas")} /> : panel === "activity" ? <ActivityFeed items={feed} onClose={() => setPanel(null)} onAgent={openAgent} /> : panel === "agents" ? <AgentDashboard states={agentStates} onClose={() => setPanel(null)} onAgent={openAgent} /> : panel === "inbox" ? <InboxPanel briefings={briefings.briefings} onClose={() => setPanel(null)} onMarkAllRead={() => {
    api.markBriefingsRead().catch(() => {});
    setBriefings(b => ({
      ...b,
      unread: 0
    }));
  }} onOpenMission={id => {
    setInboxOpenId(id);
    setPanel("tasks");
  }} /> : panel === "tasks" ? <TasksPanel liveMission={mission} autoOpenId={inboxOpenId} onClose={() => {
    setPanel(null);
    setInboxOpenId(null);
  }} /> : panel === "mission" ? <MissionPanel mission={mission} compose={composeIntent} onComposeChange={setComposeIntent} onClose={() => setPanel(null)} onAssign={startMission} onSteer={(id, text) => api.steerMission(id, text).catch(() => {})} /> : null;
  const showApp = user && squadLoaded && !onboard && !settingsOpen;
  return <div>
      <canvas id="world-canvas" ref={canvasRef}></canvas>
      <div className="as-root">
        {!user && <Login onLogin={onLogin} />}
        {showApp && <TopBar clock={clock} worldName={AS.STR.worldName} onlineCount={AS.AGENTS.length} connected={connected} onSetup={() => setSettingsOpen(true)} user={user} onLogout={onLogout} />}
        {showApp && mission && !selectedAgent && panel !== "mission" && <MissionPill mission={mission} onClick={() => {
        setSelectedAgent(null);
        setComposeIntent(false);
        setPanel("mission");
      }} />}
        {showApp && downId && <IncidentPill agentId={downId} state={agentStates[downId].state} offset={mission && !selectedAgent && panel !== "mission" ? 1 : 0} onRevive={revive} onOpen={openAgent} onLocate={locate} />}
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
