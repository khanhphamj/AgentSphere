import React from "react";
import AS from "../data.js";
import { api } from "../api.js";
import { buildDossierHtml } from "../dossier.js";
import { GlassPanel, DSIcon, StatusDot, agentPortrait, STATUS_COLOR } from "./chrome.jsx";
const DSLG = () => (window.MSSDesignSystem_fa0208 || {}).LiquidGlass;
function useWide() {
  const [wide, setWide] = React.useState(() => {
    try {
      return localStorage.getItem("as.wide") === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => setWide(w => {
    try {
      localStorage.setItem("as.wide", w ? "0" : "1");
    } catch {}
    return !w;
  });
  return [wide, toggle];
}
function WideToggle({
  wide,
  onToggle
}) {
  return <button className="as-icon-btn as-wide-btn" onClick={onToggle} title={wide ? AS.STR.panel.narrow : AS.STR.panel.widen} aria-label={wide ? AS.STR.panel.narrow : AS.STR.panel.widen}>
      {wide ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>}
    </button>;
}
function Markdown({
  text
}) {
  const html = React.useMemo(() => {
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
    const cells = line => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => inline(c.trim()));
    const confLine = /^\s*\**\s*(confidence|mức độ tin cậy|độ tin cậy)\s*\**\s*[:：]\s*\**\s*\d{1,3}\s*%/i;
    const confInline = /[\s—–-]*[(\[]\s*\d{1,3}\s*%\s*(?:confidence|mức độ tin cậy|độ tin cậy)\s*[)\]]\.?|[\s—–-]*[(\[]?\s*(?:confidence|mức độ tin cậy|độ tin cậy)\s*[:：]?\s*\d{1,3}\s*%\s*[)\]]?\.?/gi;
    const lines = String(text || "").split("\n").filter(l => !confLine.test(l)).map(l => l.replace(confInline, "").replace(/\*\*\s*\*\*/g, ""));
    let out = "",
      inList = false,
      i = 0;
    const closeList = () => {
      if (inList) {
        out += "</ul>";
        inList = false;
      }
    };
    while (i < lines.length) {
      const line = lines[i].trimEnd();
      const isTableRow = /^\s*\|.*\|\s*$/.test(line);
      const nextIsSep = i + 1 < lines.length && /^\s*\|?[\s:\-|]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-");
      if (isTableRow && nextIsSep) {
        closeList();
        const header = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(cells(lines[i]));
          i++;
        }
        out += `<table><thead><tr>${header.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        continue;
      }
      if (/^#{1,4}\s/.test(line)) {
        closeList();
        out += `<h4>${inline(line.replace(/^#{1,4}\s*/, ""))}</h4>`;
      } else if (/^[-*]\s/.test(line)) {
        if (!inList) {
          out += "<ul>";
          inList = true;
        }
        out += `<li>${inline(line.replace(/^[-*]\s*/, ""))}</li>`;
      } else if (line.trim() === "") {
        closeList();
      } else {
        closeList();
        out += `<p>${inline(line)}</p>`;
      }
      i++;
    }
    closeList();
    return out;
  }, [text]);
  return <div className="as-report" dangerouslySetInnerHTML={{
    __html: html
  }} />;
}
export function AgentPanel({
  agentId,
  liveState,
  grants,
  missionId,
  onClose,
  onLocate,
  onRevive,
  onAssignMission,
  onOpenLead
}) {
  const def = AS.AGENTS.find(a => a.id === agentId);
  const [draft, setDraft] = React.useState("");
  const [memory, setMemory] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const P = AS.STR.panel;
  React.useEffect(() => {
    setDraft("");
    setMemory(null);
    let dead = false;
    api.memory(agentId, missionId).then(m => !dead && setMemory(m)).catch(() => {});
    return () => {
      dead = true;
    };
  }, [agentId, missionId]);
  if (!def) return null;
  const isLead = !!def.lead;
  const st = liveState || {};
  const isDown = st.state === "down" || st.state === "reviving";
  const assign = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setErr("");
    setSending(true);
    try {
      await onAssignMission(text);
      setDraft("");
    } catch (e) {
      setErr(e.message || "Could not assign the task — try again.");
    } finally {
      setSending(false);
    }
  };
  return <GlassPanel side="right" label={def.name}>
      <div className="as-panel-head">
        <img className="as-avatar" src={agentPortrait(def)} width="40" height="40" alt={def.name} style={{
        "--as-ring": STATUS_COLOR[st.state] || STATUS_COLOR.idle
      }} />
        <div className="as-col as-grow">
          <span className="as-row" style={{
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap"
        }}>
            <span className="as-name" style={{
            fontSize: 13.5,
            color: AS.PROVIDERS[def.provider].color
          }}>{def.name}</span>
            <StatusDot state={st.state || "idle"} />
          </span>
          {def.name !== def.role && <span className="as-role">{def.role}</span>}
        </div>
        <button className="as-icon-btn" onClick={() => onLocate(def.id)} title={P.viewOnMap} aria-label={P.viewOnMap}>
          <DSIcon name="globe" size={15} />
        </button>
        <button className="as-icon-btn" onClick={onClose} aria-label={P.close}><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body">
        <div className="as-card">
          <p style={{
          font: "400 13px/1.55 var(--font-body)",
          color: "var(--ink-2)",
          margin: 0
        }}>
            {def.bio}
          </p>
        </div>

        {isDown && <div className="as-card as-crash-card">
            <div className="as-row">
              <span className="as-crash-ico"><DSIcon name="zap" size={14} /></span>
              <div className="as-col as-grow">
                <span style={{
              font: "600 13px var(--font-body)",
              color: "#B91C1C"
            }}>{P.crashedTitle}</span>
                {st.err && <span style={{
              font: "500 11.5px var(--font-mono)",
              color: "#DC2626"
            }}>{st.err}</span>}
              </div>
            </div>
            <p style={{
          font: "400 12.5px/1.5 var(--font-body)",
          color: "var(--ink-2)",
          margin: "10px 0 0"
        }}>
              {P.crashedNote}
            </p>
            <button className="as-btn revive" style={{
          marginTop: 12,
          width: "100%"
        }} disabled={st.state === "reviving"} onClick={() => onRevive(def.id)}>
              <DSIcon name="refresh" size={15} />
              {st.state === "reviving" ? P.revivingBtn : P.revive}
            </button>
          </div>}

        <div className="as-eyebrow">{P.currentTask}</div>
        <div className="as-card">
          <span style={{
          font: "500 13px var(--font-body)",
          color: st.task ? "var(--ink)" : "var(--ink-4)"
        }}>
            {st.task ? st.task : P.noTask}
          </span>
        </div>

        <div className="as-eyebrow">{P.skills}</div>
        <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        padding: "0 2px"
      }}>
          {def.skills.map(s => <span key={s} className="as-chip">{s}</span>)}
        </div>

        <div className="as-eyebrow">{P.model}</div>
        <div className="as-model-multi" style={{
        padding: "0 2px"
      }}>
          <span className="as-model-chip on" title={def.model}>
            <i style={{
            background: AS.PROVIDERS[AS.providerOf(def.model)].color
          }}></i>
            {def.model}
          </span>
        </div>

        {grants && grants.servers && <React.Fragment>
            <div className="as-eyebrow">{P.policy} · {grants.policyGroup ? grants.policyGroup.id : "—"}</div>
            <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 5,
          padding: "0 2px"
        }}>
              {grants.servers.length === 0 && <span className="as-policy-chip">no external tools</span>}
              {grants.servers.flatMap(s => s.tools.map(t => <span key={s.id + t.name} className="as-policy-chip">{s.id}/{t.name}</span>))}
            </div>
          </React.Fragment>}

        {memory && <React.Fragment>
            <div className="as-eyebrow">{P.memory} · AgentBase</div>
            <div className="as-card">
              <div className="as-mem-head">
                <span className="as-mem-label">{P.shortTermMem}</span>
                <span className="as-mem-count">{memory.shortTerm.length}</span>
              </div>
              {memory.shortTerm.length === 0 && <p className="as-mem-empty">{P.memEmpty}</p>}
              {memory.shortTerm.slice(-3).map((n, i) => <div key={i} className="as-mem-item">
                  <span className="as-mem-kind">{n.kind}</span>
                  <span className="as-mem-text">{n.text}</span>
                </div>)}
              <div className="as-mem-head" style={{
            marginTop: 10
          }}>
                <span className="as-mem-label">{P.longTermMem}</span>
                <span className="as-mem-count">{memory.longTerm.missions} missions</span>
              </div>
              {memory.longTerm.lessons.length === 0 && <p className="as-mem-empty">{P.memEmpty}</p>}
              {memory.longTerm.lessons.slice(-3).map((l, i) => <div key={i} className="as-mem-item">
                  <span className="as-mem-kind">lesson</span>
                  <span className="as-mem-text">{l.text}</span>
                </div>)}
            </div>
          </React.Fragment>}

        <div className="as-eyebrow">Stats</div>
        <div className="as-stat-grid">
          <div className="as-stat"><b>{st.stats ? st.stats.uptime : "—"}</b><span>{P.uptime}</span></div>
          <div className="as-stat"><b>{st.stats ? st.stats.tasks : "—"}</b><span>{P.tasksDone}</span></div>
          <div className="as-stat"><b>{st.stats ? st.stats.tokens : "—"}</b><span>{P.tokens}</span></div>
        </div>

        {isLead ? <React.Fragment>
            <div className="as-eyebrow">{P.leadCompose}</div>
            <p style={{
          font: "400 12.5px/1.5 var(--font-body)",
          color: "var(--ink-3)",
          margin: "0 4px 4px"
        }}>
              {P.leadHint}
            </p>
          </React.Fragment> : <div className="as-card" style={{
        marginTop: 4
      }}>
            <p style={{
          font: "400 13px/1.55 var(--font-body)",
          color: "var(--ink-2)",
          margin: 0
        }}>
              {P.viaLeadNote}
            </p>
            <button className="as-btn primary" style={{
          marginTop: 12,
          width: "100%",
          justifyContent: "center"
        }} onClick={onOpenLead}>
              <DSIcon name="users" size={15} /> {P.viaLeadBtn}
            </button>
          </div>}
      </div>
      {isLead && <div style={{
      display: "flex",
      gap: 8,
      padding: "8px 16px 16px"
    }}>
          <input className="as-input" value={draft} placeholder={P.missionPh} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && assign()} />
          <button className="as-btn primary" onClick={assign} disabled={sending} style={{
        padding: "10px 14px"
      }}>
            <DSIcon name="send" size={15} />
          </button>
        </div>}
      {err && <div className="as-err" style={{
      margin: "0 16px 16px"
    }}>{err}</div>}
    </GlassPanel>;
}
function EmptyState({ emoji, title, line, cta, onCta }) {
  return <div className="as-empty">
      <div className="as-empty-ico">{emoji}</div>
      <div className="as-empty-title">{title}</div>
      <div className="as-empty-line">{line}</div>
      {cta && onCta && <button className="as-btn primary as-empty-cta" onClick={onCta}>{cta}</button>}
    </div>;
}
export function AgentDashboard({
  states,
  onClose,
  onAgent
}) {
  const [cal, setCal] = React.useState(null);
  React.useEffect(() => {
    api.calibration().then(setCal).catch(() => {});
  }, []);
  const relByAgent = {};
  (cal?.byAgent || []).forEach(r => {
    relByAgent[r.name] = r;
  });
  return <GlassPanel side="right" label={AS.STR.panel.agents}>
      <div className="as-panel-head">
        <span className="as-panel-title">{AS.STR.panel.agents}</span>
        <button className="as-icon-btn" onClick={onClose} aria-label={AS.STR.panel.close}><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body">
        {AS.AGENTS.map(def => {
        const st = states[def.id] || {};
        const rel = relByAgent[def.id];
        return <div key={def.id} className="as-card click" onClick={() => onAgent(def.id)}>
              <div className="as-row">
                <img className="as-avatar" src={agentPortrait(def)} width="40" height="40" alt={def.name} style={{
              "--as-ring": STATUS_COLOR[st.state] || STATUS_COLOR.idle
            }} />
                <div className="as-col as-grow">
                  <span className="as-name" style={{
                color: AS.PROVIDERS[def.provider].color
              }}>{def.name}</span>
                  {def.name !== def.role && <span className="as-role">{def.role}</span>}
                </div>
                <StatusDot state={st.state || "idle"} />
              </div>
              {rel && rel.n > 0 && <div className="as-rel" title={`${rel.n} predictions · ${rel.decided} with a known outcome · avg predicted ${rel.avgPredicted ?? "—"}%`}>
                  <span className="as-rel-label">calibration</span>
                  <div className="as-rel-track"><div className="as-rel-fill" style={{
              width: (rel.hitRate ?? 0) + "%"
            }}></div></div>
                  <span className="as-rel-val">{rel.hitRate != null ? rel.hitRate + "%" : "—"} <i>n={rel.decided}</i></span>
                </div>}
            </div>;
      })}
        {cal && cal.withOutcome === 0 && <EmptyState emoji="🎯" title="No calibration data yet" line="Mark how missions actually panned out (on the report) to build the squad's confidence record — “when an agent says 80%, how often is it right?”." />}
      </div>
    </GlassPanel>;
}
const STANCE_LABEL = {
  support: "support",
  oppose: "oppose",
  conditional: "conditional",
  insufficient: "insufficient"
};
const FRAGILITY_LABEL = { solid: "solid", moderate: "moderate", brittle: "brittle" };
const MISSION_STATUS_LABEL = { done: "Done", failed: "Failed", executing: "Running", planning: "Planning", meeting: "In meeting", reporting: "Reporting", clarifying: "Needs you", queued: "Queued", event: "Event" };
const scrollParent = el => {
  let n = el && el.parentElement;
  while (n) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
    n = n.parentElement;
  }
  return null;
};
const VERDICT_META = decision => {
  if (!decision) return null;
  const d = String(decision);
  if (/do-not-proceed/.test(d)) return {
    kind: "no",
    label: "Do not proceed"
  };
  if (/conditional/.test(d)) return {
    kind: "cond",
    label: "Proceed with conditions"
  };
  if (/proceed/.test(d)) return {
    kind: "go",
    label: "Proceed"
  };
  if (/informational/.test(d)) return {
    kind: "info",
    label: "Informational"
  };
  return {
    kind: "info",
    label: d
  };
};
function RobustnessChip({ f }) {
  if (!f) return null;
  return <span className={"as-robust-chip " + f.label} title={`Robustness = how easily the consensus could flip · support ${f.split.support} · oppose ${f.split.oppose} · conditional ${f.split.conditional}`}>
      <span className="as-robust-dot"></span>{FRAGILITY_LABEL[f.label] || f.label} consensus · {f.robustness}{f.knifeEdge ? " · knife-edge" : ""}
    </span>;
}
const OUTCOME_OPTS = [["right", "✓ Panned out"], ["missed", "✗ Missed"], ["surprising", "! Surprising"], ["untested", "· Not yet"]];
function OutcomeChips({ missionId, initial }) {
  const [val, setVal] = React.useState(initial || null);
  const [busy, setBusy] = React.useState(false);
  const pick = async v => {
    if (busy) return;
    setVal(v);
    setBusy(true);
    try {
      await api.setMissionOutcome(missionId, v);
    } catch {}
    setBusy(false);
  };
  return <div className="as-outcome">
      <span className="as-outcome-q">How did this pan out?</span>
      <div className="as-outcome-btns">
        {OUTCOME_OPTS.map(([v, label]) => <button key={v} className={"as-outcome-btn" + (val === v ? " on" : "")} disabled={busy} onClick={() => pick(v)}>{label}</button>)}
      </div>
    </div>;
}
function MeetingTranscript({
  turns,
  live,
  decision,
  rationale,
  conditions,
  fragility
}) {
  const endRef = React.useRef(null);
  const prevLen = React.useRef(0);
  React.useEffect(() => {
    if ((turns.length > prevLen.current || decision) && endRef.current) {
      const sc = scrollParent(endRef.current);
      const nearBottom = !sc || sc.scrollHeight - sc.scrollTop - sc.clientHeight < 200;
      if (nearBottom) endRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
    prevLen.current = turns.length;
  }, [turns.length, decision]);
  const newestIdx = turns.length - 1;
  const lastStance = {};
  let curRound = null;
  const rows = [];
  turns.forEach((turn, i) => {
    const isNew = live && i === newestIdx;
    if (turn.round != null && turn.round !== curRound) {
      curRound = turn.round;
      rows.push(<div key={"r" + i} className="as-chat-round"><span>Round {curRound}</span></div>);
    }
    if (turn.director) {
      rows.push(<div key={i} className={"as-chat-msg as-chat-msg-you" + (isNew ? " as-chat-in" : "")}>
          <div className="as-chat-col as-chat-col-you">
            <span className="as-chat-name as-chat-name-you">⚖ Director</span>
            <div className="as-chat-bubble as-chat-bubble-you">{turn.text || turn.argument || turn.say}</div>
          </div>
        </div>);
      return;
    }
    const def = AS.AGENTS.find(a => a.id === turn.agentId);
    const color = def ? AS.PROVIDERS[def.provider].color : "var(--ink-4)";
    const prev = lastStance[turn.agentId];
    const changed = prev && turn.stance && prev !== turn.stance;
    if (turn.stance) lastStance[turn.agentId] = turn.stance;
    const towardName = turn.towardAgentId ? (AS.AGENTS.find(a => a.id === turn.towardAgentId) || {}).name : null;
    rows.push(<div key={i} className={"as-chat-msg" + (isNew ? " as-chat-in" : "") + (turn.conceded ? " as-chat-conceded" : "")}>
        {def ? <img className="as-chat-av" src={agentPortrait(def)} width="30" height="30" alt="" style={{
        borderColor: color
      }} /> : <span className="as-chat-av" />}
        <div className="as-chat-col">
          <div className="as-chat-head">
            <span className="as-chat-name" style={{
            color
          }}>{def ? def.name : "?"}</span>
            {def && def.lead && <span className="as-chat-chair">chair</span>}
            {turn.stance && <span className={"as-turn-stance " + turn.stance}>{STANCE_LABEL[turn.stance] || turn.stance}</span>}
            {changed && <span className="as-turn-change">↻ {STANCE_LABEL[prev] || prev} → {STANCE_LABEL[turn.stance] || turn.stance}</span>}
          </div>
          <div className="as-chat-bubble" style={{
          "--accent": color
        }}>{turn.argument || turn.say}</div>
          {turn.conceded && <div className="as-chat-concede">🤝 conceded{towardName ? ` to ${towardName}` : ""} — changed its vote</div>}
        </div>
      </div>);
  });
  const concededCount = turns.filter(t => t.conceded).length;
  let sup = 0,
    opp = 0;
  turns.forEach(t => {
    if (t.stance === "support") sup++;else if (t.stance === "oppose") opp++;
  });
  const tot = sup + opp;
  const pos = decision ? /do-not-proceed/.test(decision) ? -1 : /proceed/.test(decision) ? 1 : 0 : tot ? (sup - opp) / tot : 0;
  const leftPct = 50 + pos * 44;
  const tokColor = pos < -0.05 ? "#E8A53C" : pos > 0.05 ? "#1ED760" : "#E5C46B";
  const verdict = VERDICT_META(decision);
  return <div className="as-chat-wrap">
      {rows.length > 0 && <div className="as-tug">
          <span className="as-tug-end hold">Hold</span>
          <div className="as-tug-track">
            <div className="as-tug-fill" style={{
          width: Math.abs(pos) * 44 + "%",
          left: pos < 0 ? leftPct + "%" : "50%",
          background: tokColor
        }}></div>
            <div className={"as-tug-token" + (decision ? " snap" : "")} style={{
          left: leftPct + "%",
          background: tokColor
        }}></div>
          </div>
          <span className="as-tug-end go">Proceed</span>
        </div>}
      <div className="as-chat">
        {concededCount > 0 && <div className="as-chat-minds">⟳ minds changed: {concededCount}</div>}
        {rows.length === 0 && live && <div className="as-chat-convening"><span className="as-chat-convening-icon">🏛</span> The squad is convening…</div>}
        {rows}
        {live && rows.length > 0 && !decision && <div className="as-chat-typing"><i></i><i></i><i></i><span>debating…</span></div>}
        {verdict && <div className={"as-chat-verdict " + verdict.kind}>
            <div className="as-chat-verdict-top"><span className="as-chat-verdict-badge">Consensus</span><span className="as-chat-verdict-label">{verdict.label}</span></div>
            {fragility && <div className={"as-chat-robust " + fragility.label}><span className="as-robust-dot"></span>Robustness: <b>{FRAGILITY_LABEL[fragility.label] || fragility.label}</b> · {fragility.robustness}/100{fragility.knifeEdge ? " · knife-edge" : ""}</div>}
            {rationale && <div className="as-chat-verdict-why">{rationale}</div>}
            {Array.isArray(conditions) && conditions.length > 0 && <ul className="as-chat-verdict-cond">{conditions.map((c, j) => <li key={j}>{c}</li>)}</ul>}
          </div>}
        <div ref={endRef} style={{
        height: 1
      }}></div>
      </div>
    </div>;
}
function ConfidenceBreakdown({
  breakdown,
  confidence,
  rationale,
  label
}) {
  const [open, setOpen] = React.useState(false);
  const RISK_LENS = /risk|critic|precedent|skeptic|threat|hidden|failure|downside|compliance/i;
  const rows = (breakdown || []).filter(o => o && typeof o.confidence === "number");
  const hasData = rows.length > 0 || !!rationale;
  const flagged = rows.reduce((n, o) => n + (o.flags ? o.flags.length : 0), 0);
  const hasRisk = rows.some(o => RISK_LENS.test(o.lens || o.focus || ""));
  const total = (breakdown || []).length;
  const takenOver = (breakdown || []).filter(b => b.takeover).length;
  const simulated = (breakdown || []).filter(b => b.simulated).length;
  return <span className="as-conf-wrap">
      <button className={"as-report-conf" + (hasData ? " click" : "")} onClick={() => hasData && setOpen(v => !v)} title="Confidence = how sure the recommendation is (penalized for disagreement, flags, or offline fallback)">
        <DSIcon name="shield-check" size={13} />{confidence}% {label || "confidence"}
        {hasData && <svg className={"as-conf-caret" + (open ? " open" : "")} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>}
      </button>
      {open && hasData && <div className="as-conf-pop">
          {total > 0 && (takenOver > 0 || simulated > 0) && <div className="as-conf-note">Advisor quorum: {total - takenOver}/{total} by advisors · {takenOver} lead takeover{simulated ? ` · ${simulated} offline` : ""}</div>}
          <div className="as-conf-note">Weighted average{hasRisk ? " · risk angle ×2" : ""}{flagged ? ` · ${flagged} flag${flagged === 1 ? "" : "s"}` : ""}</div>
          {rows.length > 1 && <div className="as-conf-why">Lower than each agent because points are deducted for disagreement / verification flags / offline mode.</div>}
          {rows.map((o, i) => {
        const def = AS.AGENTS.find(a => a.id === o.agentId);
        const color = def ? AS.PROVIDERS[def.provider].color : "var(--ink-4)";
        const delta = typeof o.confidenceBefore === "number" ? o.confidence - o.confidenceBefore : 0;
        return <div key={i} className="as-conf-row">
                <span className="as-conf-dot" style={{
            background: color
          }}></span>
                <span className="as-conf-name">{def ? def.name : o.name || o.agentId}</span>
                {RISK_LENS.test(o.lens || o.focus || "") && <span className="as-conf-x2">×2</span>}
                {o.stance && <span className={"as-turn-stance " + o.stance}>{STANCE_LABEL[o.stance] || o.stance}</span>}
                <span className="as-grow"></span>
                {delta !== 0 && <span className={"as-conf-delta " + (delta < 0 ? "down" : "up")}>{delta > 0 ? "+" : ""}{delta}</span>}
                <span className="as-conf-pct">{o.confidence}%</span>
              </div>;
      })}
          {rationale && <div className="as-conf-rationale">{rationale}</div>}
        </div>}
    </span>;
}
const hostOf = url => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
function ToolReceipt({
  receipt
}) {
  const {
    server,
    tool,
    args,
    result
  } = receipt;
  if (!result || result.error) return null;
  const q = args && (args.query || args.q || args.symbol || args.docId);
  const links = Array.isArray(result.results) ? result.results.filter(r => r && r.url) : null;
  const rows = links ? [] : Object.entries(result).filter(([k, v]) => v != null && typeof v !== "object" && k !== "source" && k !== "synthetic").slice(0, 6);
  return <div className="as-receipt">
      <div className="as-receipt-head">
        <span className="as-policy-chip">{server}/{tool}</span>
        {q && <span className="as-receipt-q">{String(q)}</span>}
        {result.synthetic && <span className="as-sim-badge">synthetic</span>}
      </div>
      {links && <div className="as-receipt-links">
          {links.slice(0, 5).map((r, i) => {
        const host = hostOf(r.url);
        return <a key={i} className="as-receipt-link" href={r.url} target="_blank" rel="noreferrer">
                <span className="as-receipt-title">{r.title || r.url}</span>
                {host && <span className="as-receipt-host">{host}</span>}
              </a>;
      })}
        </div>}
      {!links && rows.length > 0 && <div className="as-receipt-kv">
          {rows.map(([k, v], i) => <div key={i} className="as-receipt-row">
              <span className="as-receipt-k">{k}</span>
              <span className="as-receipt-v">{String(v)}</span>
            </div>)}
        </div>}
    </div>;
}
function collectRealSources(evidence) {
  if (!evidence) return [];
  const order = [];
  const byKey = {};
  Object.keys(evidence).forEach(agentId => {
    const list = Array.isArray(evidence[agentId]) ? evidence[agentId] : [];
    list.forEach(e => {
      if (!e || !e.result || e.result.error || e.result.synthetic) return;
      const result = e.result;
      const links = Array.isArray(result.results) ? result.results.filter(r => r && r.url) : null;
      let key;
      if (links && links.length > 0) {
        key = links.map(r => (hostOf(r.url) || r.url) + "|" + (r.title || r.url)).sort().join("~");
      } else {
        const q = e.args && (e.args.query || e.args.q || e.args.symbol || e.args.docId);
        key = e.server + "/" + e.tool + "|" + String(q || "");
      }
      const def = AS.AGENTS.find(a => a.id === agentId);
      const who = def ? def.name : agentId;
      if (byKey[key]) {
        if (byKey[key].agents.indexOf(who) === -1) byKey[key].agents.push(who);
        return;
      }
      byKey[key] = {
        receipt: e,
        agents: [who]
      };
      order.push(key);
    });
  });
  return order.map(k => byKey[k]);
}
function SubtaskRow({
  sub,
  evidence,
  openAll
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (openAll) setOpen(openAll.v);
  }, [openAll && openAll.n]);
  const def = AS.AGENTS.find(a => a.id === sub.agentId);
  const kp = Array.isArray(sub.keyPoints) ? sub.keyPoints.filter(Boolean) : [];
  const ev = Array.isArray(evidence) ? evidence.filter(e => e && e.result && !e.result.error) : [];
  const hasDetail = (sub.status === "done" && !!(sub.summary || kp.length > 0)) || ev.length > 0;
  const preview = !open && hasDetail && sub.summary ? String(sub.summary).split(/\n/)[0].trim() : "";
  return <div className="as-subtask-wrap">
      <div className={"as-subtask" + (hasDetail ? " click" : "")} onClick={() => hasDetail && setOpen(v => !v)}>
        <span className={"as-sub-check " + sub.status}>
          {sub.status === "done" && <DSIcon name="check" size={11} />}
          {sub.status === "failed" && <DSIcon name="x" size={11} />}
          {sub.status === "review" && <DSIcon name="search" size={11} />}
          {sub.status === "doing" && <i style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#C77700"
        }}></i>}
        </span>
        <span className={"as-sub-label" + (sub.status === "done" ? " done" : "")}>
          {sub.title}
          {preview && <span className="as-sub-preview">{preview}{sub.confidence != null ? ` · ${sub.confidence}%` : ""}</span>}
        </span>
        {sub.stance && <span className={"as-turn-stance " + sub.stance}>{STANCE_LABEL[sub.stance] || sub.stance}</span>}
        {def && <img src={agentPortrait(def)} width="20" height="20" style={{
        imageRendering: "pixelated",
        borderRadius: 6
      }} title={def.name} alt={def.name} />}
        {hasDetail && <span className="as-sub-tag">{open ? "hide" : "details"}</span>}
        {hasDetail && <svg className={"as-conf-caret" + (open ? " open" : "")} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>}
      </div>
      {open && hasDetail && <div className="as-sub-detail">
          {sub.summary && <p className="as-sub-summary">{sub.summary}</p>}
          {kp.length > 0 && <ul className="as-sub-kp">{kp.slice(0, 4).map((k, j) => <li key={j}>{k}</li>)}</ul>}
          {sub.confidence != null && <span className="as-sub-conf"><DSIcon name="shield-check" size={11} />{sub.confidence}%</span>}
          {ev.length > 0 && <div className="as-evidence">
              <div className="as-evidence-label">Evidence</div>
              {ev.map((e, j) => <ToolReceipt key={j} receipt={e} />)}
            </div>}
        </div>}
    </div>;
}
const fmtTime = ts => {
  if (!ts) return "";
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  return (sameDay ? "" : d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  }) + " ") + d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });
};
const STAGES = [{
  key: "plan",
  label: "Plan"
}, {
  key: "work",
  label: "Work"
}, {
  key: "review",
  label: "Synthesis"
}, {
  key: "verify",
  label: "Fact-check"
}, {
  key: "debate",
  label: "Debate"
}, {
  key: "report",
  label: "Report"
}];
function StageTracker({
  stage,
  hadDebate,
  done,
  paused,
  caption
}) {
  if (stage == null) return null;
  const cap = AS.STR.panel.stageCaption || {};
  const steps = STAGES.map((s, idx) => ({
    ...s,
    idx
  })).filter(s => s.key !== "debate" || hadDebate);
  const shown = caption || (!done && cap[(STAGES[stage] || {}).key]);
  return <React.Fragment>
      <div className={"as-stages" + (paused ? " as-stages-paused" : "")}>
        {steps.map(s => {
        const st = done || s.idx < stage ? "done" : s.idx === stage ? "active" : "todo";
        return <div key={s.key} className={"as-stage " + st} title={cap[s.key] || undefined}>
              <span className="as-stage-dot">{(done || s.idx < stage) && <DSIcon name="check" size={9} />}</span>
              <span className="as-stage-lbl">{s.label}</span>
            </div>;
      })}
      </div>
      {shown && <div className="as-stage-cap">{shown}</div>}
    </React.Fragment>;
}
function StreamingMarkdown({
  text
}) {
  const [shown, setShown] = React.useState(String(text || ""));
  const [done, setDone] = React.useState(true);
  React.useEffect(() => {
    const full = String(text || "");
    const lines = full.split("\n");
    if (lines.length <= 3) {
      setShown(full);
      setDone(true);
      return;
    }
    let i = Math.max(2, Math.ceil(lines.length * 0.18));
    setShown(lines.slice(0, i).join("\n"));
    setDone(false);
    const stepN = Math.max(1, Math.ceil(lines.length / 13));
    const iv = setInterval(() => {
      i += stepN;
      if (i >= lines.length) {
        setShown(full);
        setDone(true);
        clearInterval(iv);
      } else setShown(lines.slice(0, i).join("\n"));
    }, 105);
    return () => clearInterval(iv);
  }, [text]);
  return <div className={"as-stream" + (done ? "" : " typing")}>
      <Markdown text={shown} />
    </div>;
}
function SteerBar({
  onSteer
}) {
  const [draft, setDraft] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSteer(t);
    setDraft("");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };
  const P = AS.STR.panel;
  return <div className="as-steer-wrap">
      <div className="as-steer-hint">{P.steerHint}</div>
      <div className="as-steer">
        <span className="as-steer-ico">⚖</span>
        <input className="as-input" value={draft} placeholder={sent ? P.steerSent : P.steerPh} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
        <button className="as-btn primary" style={{
        padding: "8px 13px"
      }} disabled={!draft.trim()} onClick={send}>{P.steerBtn}</button>
      </div>
    </div>;
}
function downloadReport(mission) {
  const r = mission.report || {};
  const md = `# ${mission.title}\n\n${r.recommendation ? `**Recommendation:** ${r.recommendation}${r.confidence != null ? ` (confidence ${r.confidence}%)` : ""}\n\n` : ""}${r.markdown || ""}`;
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agentsphere-${(mission.title || "report").slice(0, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "") || "report"}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadDossier(mission) {
  const sources = collectRealSources(mission.evidence).map(s => ({
    tool: `${s.receipt.server}/${s.receipt.tool}`,
    query: s.receipt.args && (s.receipt.args.query || s.receipt.args.symbol || s.receipt.args.topic || s.receipt.args.proposal || "") || "",
    via: (s.agents || []).join(", "),
    links: Array.isArray(s.receipt.result && s.receipt.result.results) ? s.receipt.result.results.filter(r => r && r.url).map(r => ({
      title: r.title || r.url,
      url: r.url,
      host: r.host || ""
    })) : []
  }));
  const html = buildDossierHtml(mission, sources);
  const blob = new Blob([html], {
    type: "text/html"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agentsphere-dossier-${(mission.title || "report").slice(0, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "") || "report"}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const fmtElapsed = ms => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};
export function MissionDetail({
  mission,
  stream,
  onSteer,
  onAssign,
  onToast,
  onCancel
}) {
  const P = AS.STR.panel;
  const running = !mission.done && !mission.failed && mission.phase !== "clarifying" && mission.phase !== "queued";
  const stopped = !!mission.stopped;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const elapsed = running && mission.startedAt ? fmtElapsed(now - mission.startedAt) : "";
  const phaseN = mission.phaseIndex != null ? mission.phaseIndex + 1 : null;
  const liveExtra = running ? `${mission.phase === "executing" && phaseN ? ` · Phase ${phaseN}` : ""}${elapsed ? ` · ${elapsed}` : ""}` : "";
  const statusColor = stopped ? "#6B7280" : mission.failed ? "#DC2626" : mission.done ? "#1F8A48" : "#C77700";
  const subs = mission.subtasks || [];
  const subDone = subs.filter(s => s.status === "done").length;
  const subCounter = !mission.done && !mission.failed && subs.length ? ` · ${subDone}/${subs.length} subtasks` : "";
  const statusText = (stopped ? "Stopped" : mission.failed ? P.missionFailed : mission.done ? AS.STR.misc.completed : mission.phase === "clarifying" ? P.waitingForYou : mission.phase === "queued" ? P.queuedAt + (mission.queued ? ` · ${P.queuePos} ${mission.queued}` : "") : mission.phase === "event" ? P.eventRunning : mission.phase === "meeting" ? P.meeting + "…" : "Executing — orchestrated by the lead") + subCounter + liveExtra;
  const meeting = mission.meeting;
  const [subAllOpen, setSubAllOpen] = React.useState(false);
  const [subSignal, setSubSignal] = React.useState(0);
  const [activeSection, setActiveSection] = React.useState(null);
  const realSources = collectRealSources(mission.evidence);
  const hasSources = realSources.length > 0;
  const sourceCount = realSources.length;
  const jumpSections = [{
    id: "as-sec-conclusion",
    label: P.answer,
    show: !!mission.report
  }, {
    id: "as-sec-report",
    label: P.report,
    show: !!mission.report
  }, {
    id: "as-sec-subtasks",
    label: subs.length ? `${P.subtasks} (${subs.length})` : P.subtasks,
    show: subs.length > 0
  }, {
    id: "as-sec-sources",
    label: sourceCount ? `${P.sources} (${sourceCount})` : P.sources,
    show: hasSources
  }, {
    id: "as-sec-debate",
    label: P.meeting,
    show: !!(meeting && meeting.turns.length > 0)
  }].filter(s => s.show);
  React.useEffect(() => {
    if (!mission.done) return undefined;
    const ids = jumpSections.map(s => s.id);
    const nodes = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!nodes.length) return undefined;
    const obs = new IntersectionObserver(entries => {
      const vis = entries.filter(en => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis.length) setActiveSection(vis[0].target.id);
    }, {
      rootMargin: "-44px 0px -55% 0px",
      threshold: 0
    });
    nodes.forEach(n => obs.observe(n));
    return () => obs.disconnect();
  }, [mission.done, mission.id, jumpSections.map(s => s.id).join("|")]);
  const jumpTo = id => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  return <div>
      <div className="as-card">
        <span style={{
        font: "600 14px var(--font-body)",
        color: "var(--ink)"
      }}>{mission.title}</span>
        <div style={{
        marginTop: 6
      }}>
          <span className="as-status">
            <i style={{
            background: statusColor
          }}></i>
            {statusText}
          </span>
          {running && <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 7
      }}>
              <div className="as-bg-hint" style={{
          marginTop: 0
        }}>Runs on the server — you can safely close this tab; the result will land in your Inbox.</div>
              <button type="button" className="as-btn ghost" style={{
          padding: "5px 9px",
          fontSize: 11.5
        }} onClick={() => onCancel && onCancel(mission.id)}>Stop</button>
            </div>}
          {mission.depth === "deep" && <span className="as-deep-badge">🔬 {P.deepBadge}</span>}
        </div>
      </div>

      {mission.phase === "queued" && <div className="as-stage-cap" style={{
      margin: "0 0 10px"
    }}>{P.queued}</div>}
      {(mission.failed || mission.stopped) && onAssign && <button className="as-btn" style={{
      margin: "2px 0 12px"
    }} onClick={() => Promise.resolve(onAssign(mission.title)).then(() => onToast && onToast(AS.STR.toast.retried, "info")).catch(() => onToast && onToast(AS.STR.toast.assignFailed, "warn"))}>↻ {P.retry}</button>}

      {!mission.failed && !mission.stopped && mission.phase !== "queued" && mission.stage != null && <StageTracker stage={mission.stage} hadDebate={mission.hadDebate} done={mission.done} paused={mission.phase === "event"} caption={mission.phase === "event" ? P.eventResume : null} />}

      {mission.done && jumpSections.length > 1 && <nav className="as-jumpbar" aria-label={P.jumpAria}>
          <span className="as-jumpbar-label">Jump to</span>
          {jumpSections.map(s => <button key={s.id} type="button" className={"as-jumplink" + (activeSection === s.id ? " active" : "")} onClick={() => jumpTo(s.id)}>
              {s.label}
            </button>)}
        </nav>}

      {mission.report && <div className="as-decision" id="as-sec-conclusion">
          <span className="ttl"><DSIcon name="check-circle" size={14} />{P.answer}{meeting?.decision ? ` · ${(VERDICT_META(meeting.decision) || {}).label || meeting.decision}` : ""}</span>
          <div className="body">{mission.report.recommendation}</div>
          <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        flexWrap: "wrap"
      }}>
            <ConfidenceBreakdown breakdown={mission.report.breakdown} confidence={mission.report.confidence} rationale={mission.report.confidenceRationale} />
            {mission.fragility && <RobustnessChip f={mission.fragility} />}
            {mission.simulated && <span className="as-sim-badge">{P.simBadge}</span>}
          </div>
          {meeting?.conditions?.length > 0 && <div className="conds">
              {meeting.conditions.map((c, i) => <span key={i} className="as-chip">{c}</span>)}
            </div>}
          <OutcomeChips missionId={mission.id} initial={mission.outcome} />
        </div>}

      {!mission.report && meeting?.decision && <div className="as-decision">
          <span className="ttl"><DSIcon name="check-circle" size={14} />{P.decision} · {(VERDICT_META(meeting.decision) || {}).label || meeting.decision}</span>
          <div className="body">{meeting.rationale}</div>
          {meeting.conditions?.length > 0 && <div className="conds">
              {meeting.conditions.map((c, i) => <span key={i} className="as-chip">{c}</span>)}
            </div>}
        </div>}

      {!mission.report && mission.phase === "reporting" && <React.Fragment>
          <div className="as-eyebrow">{P.report}</div>
          <div className="as-stage-cap as-report-cap">{P.stageCaption.report}</div>
          <div className="as-card">
            <div className="as-skel">
              {[88, 72, 95, 64, 80].map((w, i) => <div key={i} className="as-skel-line" style={{
            width: w + "%"
          }}></div>)}
            </div>
          </div>
        </React.Fragment>}

      {mission.scenarios && mission.scenarios.length > 0 && <div className="as-scenarios" id="as-sec-scenarios">
          <span className="as-scenarios-ttl">🔬 {P.scenariosTitle}</span>
          {mission.scenarios.map((s, i) => <div key={i} className="as-scenario-row">
              <span className="as-scenario-name">{s.name}</span>
              {s.probability != null && <span className="as-scenario-prob">{s.probability}%</span>}
              <span className="as-scenario-out">{s.outcome}</span>
            </div>)}
          {mission.sensitivity && <div className="as-scenario-sens">{P.sensitivityLabel}: {mission.sensitivity}</div>}
        </div>}

      {(() => {
      const phs = mission.phases && mission.phases.length ? mission.phases : null;
      if (phs) {
        const last = phs[phs.length - 1];
        const concerns = (last.concerns || []).length;
        return <div className={"as-quality" + (last.sufficient ? " ok" : "")} id="as-sec-quality">
              <span className="as-quality-ttl">⟳ {P.phaseSynthesis} · {phs.length} {P.phaseWord}</span>
              <span className="as-quality-sub">{last.summary || (last.sufficient ? P.qualitySufficient : "")}{concerns ? ` — ⚑ ${concerns} ${P.concernsLabel}` : ""}</span>
            </div>;
      }
      if (mission.evaluations && mission.evaluations.length > 0) {
        const evs = mission.evaluations;
        const last = evs[evs.length - 1];
        const passes = evs.length;
        return <div className={"as-quality" + (last.sufficient ? " ok" : "")} id="as-sec-quality">
              <span className="as-quality-ttl">⟳ {P.qualityCheck}{last.score != null ? ` · ${last.score}/100` : ""}{passes > 1 ? ` · ${passes} ${P.qualityPass}` : ""}</span>
              <span className="as-quality-sub">{last.sufficient ? P.qualitySufficient : last.reason || ""}{passes > 1 ? ` — ${P.qualityRefined}` : ""}</span>
            </div>;
      }
      return null;
    })()}

      {mission.report && <React.Fragment>
          <div className="as-eyebrow as-eyebrow-row" id="as-sec-report">
            <span>{P.report}</span>
            <span className="as-row" style={{
          gap: 6
        }}>
              <button className="as-eyebrow-act" onClick={() => Promise.resolve(navigator.clipboard && navigator.clipboard.writeText(mission.report.markdown || "")).then(() => onToast && onToast(AS.STR.toast.reportCopied, "ok")).catch(() => onToast && onToast(AS.STR.toast.assignFailed, "warn"))}>{P.copyReport}</button>
              <button className="as-eyebrow-act" onClick={() => {
            downloadReport(mission);
            onToast && onToast(AS.STR.toast.reportDownloaded, "ok");
          }}>{P.downloadReport}</button>
              <button className="as-eyebrow-act" onClick={() => {
            downloadDossier(mission);
            onToast && onToast("Dossier downloaded", "ok");
          }}>Dossier</button>
            </span>
          </div>
          <div className="as-card">
            {stream ? <StreamingMarkdown text={mission.report.markdown} /> : <Markdown text={mission.report.markdown} />}
          </div>
        </React.Fragment>}

      {mission.subtasks.length > 0 && <React.Fragment>
          <div className="as-eyebrow as-eyebrow-row" id="as-sec-subtasks">
            <span>{P.subtasks}</span>
            {mission.subtasks.some(s => s.summary || Array.isArray(s.keyPoints) && s.keyPoints.length > 0 || mission.evidence && mission.evidence[s.agentId]) && <button className="as-eyebrow-act" onClick={() => {
          setSubAllOpen(v => !v);
          setSubSignal(n => n + 1);
        }}>{subAllOpen ? P.collapseAll : P.expandAll}</button>}
          </div>
          <div className="as-card">
            {mission.subtasks.map((sub, i) => <SubtaskRow key={i} sub={sub} evidence={mission.evidence && mission.evidence[sub.agentId]} openAll={subSignal ? {
          v: subAllOpen,
          n: subSignal
        } : null} />)}
          </div>
        </React.Fragment>}

      {mission.done && (realSources.length > 0 || stream) && <React.Fragment>
          <div className="as-eyebrow" id="as-sec-sources">{P.sources}</div>
          <div className="as-card">
            {realSources.length > 0 ? <div className="as-evidence">
                {realSources.map((s, i) => <div key={i}>
                    <ToolReceipt receipt={s.receipt} />
                    <div className="as-evidence-label">{P.sourcesBy} {s.agents.join(", ")}</div>
                  </div>)}
              </div> : <p style={{
          font: "400 12px/1.5 var(--font-body)",
          color: "var(--ink-3)",
          margin: 0
        }}>{P.sourcesNone}</p>}
          </div>
        </React.Fragment>}

      {meeting && (meeting.turns.length > 0 || mission.phase === "meeting" && !mission.done) && <React.Fragment>
          <div className="as-eyebrow" id="as-sec-debate">{P.meeting}</div>
          <div className="as-card">
            <p style={{
          font: "400 12px/1.5 var(--font-body)",
          color: "var(--ink-3)",
          margin: "0 0 6px"
        }}>
              {P.meetingNote}
            </p>
            {onSteer && mission.phase === "meeting" && !mission.done && <SteerBar onSteer={onSteer} />}
            <MeetingTranscript turns={meeting.turns} live={!mission.done} decision={meeting.decision} rationale={meeting.rationale} conditions={meeting.conditions} fragility={meeting.fragility} />
          </div>
        </React.Fragment>}
    </div>;
}
const everyLabel = m => m >= 1440 ? `every ${Math.round(m / 1440)}d` : m >= 60 ? `every ${Math.round(m / 60)}h` : `every ${m}m`;
function StandingMissions() {
  const [list, setList] = React.useState([]);
  const [title, setTitle] = React.useState("");
  const [every, setEvery] = React.useState(1440);
  const [open, setOpen] = React.useState(false);
  const load = React.useCallback(() => {
    api.standing().then(s => setList(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);
  React.useEffect(load, [load]);
  const add = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      await api.addStanding(t, every);
      setTitle("");
      load();
    } catch {}
  };
  const toggle = async s => {
    try {
      await api.updateStanding(s.id, { enabled: !s.enabled });
    } catch {}
    load();
  };
  const del = async id => {
    try {
      await api.deleteStanding(id);
    } catch {}
    load();
  };
  return <div style={{ marginBottom: 6 }}>
      <div className="as-eyebrow as-standing-head" onClick={() => setOpen(v => !v)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <DSIcon name="clock" size={12} />Standing missions{list.length ? ` · ${list.length}` : ""}
        <span className="as-grow"></span>
        <svg className={"as-conf-caret" + (open ? " open" : "")} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      {open && <div className="as-card">
          <p style={{ font: "400 12px/1.5 var(--font-body)", color: "var(--ink-3)", margin: "0 0 8px" }}>
            The squad runs these on a schedule (even when you're offline); results land in the Inbox.
          </p>
          <input className="as-input" value={title} placeholder="e.g. Scan VN fintech M&A news this week" onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <div className="as-row" style={{ gap: 8, marginTop: 8 }}>
            <select className="as-select as-grow" value={every} onChange={e => setEvery(Number(e.target.value))}>
              <option value={10}>Every 10 min (demo)</option>
              <option value={60}>Every hour</option>
              <option value={360}>Every 6 hours</option>
              <option value={1440}>Every 24 hours</option>
            </select>
            <button className="as-btn primary" disabled={!title.trim()} onClick={add} style={{ padding: "9px 14px" }}>Add</button>
          </div>
          {list.map(s => <div key={s.id} className="as-row" style={{ marginTop: 10, alignItems: "center", gap: 8 }}>
              <span className={"as-incident-dot" + (s.enabled ? "" : "")} style={{ width: 8, height: 8, borderRadius: "50%", flex: "none", background: s.enabled ? "var(--gn-vivid-bot)" : "var(--ink-5)" }}></span>
              <div className="as-col as-grow" style={{ minWidth: 0 }}>
                <span style={{ font: "500 12.5px var(--font-body)", color: s.enabled ? "var(--ink)" : "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                <span style={{ font: "500 10.5px var(--font-mono)", color: "var(--ink-4)" }}>{everyLabel(s.schedule?.everyMinutes || 1440)}{s.lastRunAt ? ` · last run ${fmtTime(s.lastRunAt)}` : " · not run yet"}</span>
              </div>
              <button className="as-icon-btn" title={s.enabled ? "Pause" : "Enable"} onClick={() => toggle(s)}>{s.enabled ? "⏸" : "▶"}</button>
              <button className="as-icon-btn" title="Delete" onClick={() => del(s.id)}><DSIcon name="x" size={13} /></button>
            </div>)}
        </div>}
    </div>;
}
export function TasksPanel({
  liveMission,
  onClose,
  onCompose,
  autoOpenId
}) {
  const P = AS.STR.panel;
  const [list, setList] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [wide, toggleWide] = useWide();
  const load = React.useCallback(() => {
    api.listMissions().then(setList).catch(() => setList([]));
  }, []);
  React.useEffect(load, [load]);
  React.useEffect(() => {
    if (liveMission?.done) load();
  }, [liveMission?.done, load]);
  React.useEffect(() => {
    if (autoOpenId) open(autoOpenId);
  }, [autoOpenId]);
  const open = async id => {
    try {
      const m = await api.getMission(id);
      setDetail({
        id: m.id,
        title: m.title,
        done: m.status === "done" || m.status === "failed" || m.status === "cancelled",
        failed: m.status === "failed",
        stopped: m.status === "cancelled" || !!m.cancelRequested,
        phase: m.status,
        stage: 6,
        hadDebate: !!m.meeting,
        simulated: (m.outputs || []).some(o => o.simulated),
        evidence: (() => {
          const ev = {};
          (m.outputs || []).forEach(o => {
            if (o.agentId && Array.isArray(o.toolCalls) && o.toolCalls.length) ev[o.agentId] = o.toolCalls;
          });
          return ev;
        })(),
        phases: (m.phases || []).map(p => ({ index: p.index, goal: p.goal, summary: p.synthesis?.phaseSummary || "", sufficient: !!p.synthesis?.sufficient, concerns: p.synthesis?.concerns || [] })),
        subtasks: (() => {
          return (m.subtasks || []).map(s => {
            const o = (m.outputs || []).find(x => x.agentId === s.agentId && (x.focus === s.title || x.phase === s.phase));
            return o ? {
              ...s,
              summary: o.summary,
              keyPoints: o.keyPoints,
              stance: o.stance,
              confidence: o.confidence
            } : s;
          });
        })(),
        meeting: m.meeting ? {
          turns: m.meeting.transcript || [],
          decision: m.meeting.decision,
          rationale: m.meeting.rationale,
          conditions: m.meeting.conditions || []
        } : null,
        report: m.report ? {
          ...m.report,
          breakdown: (m.outputs || [])
        } : null
      });
    } catch {}
  };
  return <GlassPanel side="right" wide={wide && !!detail} label={P.tasks}>
      <div className="as-panel-head">
        {detail && <button className="as-icon-btn as-back-flip" onClick={() => setDetail(null)} title={P.backToList} aria-label={P.backToList}><DSIcon name="arrow-right" size={15} /></button>}
        <span className="as-panel-title">{P.tasks}</span>
        {detail && <WideToggle wide={wide} onToggle={toggleWide} />}
        <button className="as-icon-btn" onClick={onClose} aria-label={P.close}><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body">
        {detail ? <MissionDetail mission={detail} /> : <React.Fragment>
            <StandingMissions />
            {list && list.length === 0 && <EmptyState emoji="📋" title="No missions yet" line="Assign a question or decision — the squad researches, debates, and returns one recommendation." cta="Create your first mission" onCta={onCompose} />}
            {(list || []).map(t => <div key={t.id} className="as-card click" onClick={() => open(t.id)}>
                <div className="as-row" style={{
            alignItems: "flex-start"
          }}>
                  <div className="as-col as-grow" style={{
            minWidth: 0,
            gap: 4
          }}>
                    <span style={{
              font: "600 13px var(--font-body)",
              color: "var(--ink)"
            }}>{t.title}</span>
                    {t.recommendation && <span className="as-task-rec">{t.recommendation}{t.confidence != null ? ` · ${t.confidence}%` : ""}</span>}
                  </div>
                  <div className="as-col" style={{
            flex: "none",
            alignItems: "flex-end",
            gap: 4
          }}>
                    <span className={"as-task-status " + t.status}>{MISSION_STATUS_LABEL[t.status] || t.status}</span>
                    <span className="as-task-time">{fmtTime(t.createdAt)}</span>
                  </div>
                </div>
              </div>)}
          </React.Fragment>}
      </div>
    </GlassPanel>;
}
export function InboxPanel({
  briefings = [],
  onClose,
  onOpenMission,
  onMarkAllRead,
  onCompose
}) {
  React.useEffect(() => {
    if (briefings.some(b => !b.read)) onMarkAllRead && onMarkAllRead();
  }, []);
  const sevColor = s => s === "alert" ? "#DC2626" : s === "warn" ? "#C77700" : "#1F8A48";
  const fmt = ts => ts ? new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }) : "";
  const icon = b => b.kind === "failed" ? "✗" : b.severity === "warn" ? "⚑" : "✓";
  return <GlassPanel side="right" label="Inbox">
      <div className="as-panel-head">
        <span className="as-panel-title">Reports from the squad</span>
        <button className="as-icon-btn" onClick={onClose} aria-label="close"><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body" aria-live="polite">
        {briefings.length === 0 && <EmptyState emoji="📨" title="No reports yet" line="The squad will post a summary here after each mission." cta="Create a mission to get a report" onCta={onCompose} />}
        {briefings.map(b => <div key={b.id} className={"as-card click as-brief" + (b.read ? "" : " unread")} onClick={() => onOpenMission && b.missionId && onOpenMission(b.missionId)}>
            <div className="as-row" style={{
          alignItems: "flex-start"
        }}>
              <span className="as-brief-dot" style={{
            background: sevColor(b.severity)
          }}></span>
              <div className="as-col as-grow" style={{
            minWidth: 0,
            gap: 3
          }}>
                <span className="as-brief-title">{icon(b)} {b.title}{b.auto ? <span className="as-brief-auto">auto</span> : null}</span>
                <span className="as-brief-meta">{b.kind === "failed" ? b.error : `${b.decision || "—"}${b.confidence != null ? ` · ${b.confidence}%` : ""}${b.flagCount ? ` · ${b.flagCount} flag` : ""}`}</span>
                {b.recommendation && <span className="as-brief-rec">{b.recommendation}</span>}
              </div>
              <span className="as-brief-time">{fmt(b.at)}</span>
            </div>
          </div>)}
      </div>
    </GlassPanel>;
}
export function MissionPanel({
  mission,
  compose,
  onComposeChange,
  onClose,
  onAssign,
  onToast,
  onSteer,
  onCancel
}) {
  const [draft, setDraft] = React.useState("");
  const [err, setErr] = React.useState("");
  const [deep, setDeep] = React.useState(false);
  const [clarify, setClarify] = React.useState("");
  const [wide, toggleWide] = useWide();
  const [seenHelp, setSeenHelp] = React.useState(() => {
    try {
      return localStorage.getItem("as.seenComposeHelp") === "1";
    } catch {
      return false;
    }
  });
  const dismissHelp = () => {
    try {
      localStorage.setItem("as.seenComposeHelp", "1");
    } catch {}
    setSeenHelp(true);
  };
  const taRef = React.useRef(null);
  const bodyRef = React.useRef(null);
  const P = AS.STR.panel;
  const examples = P.missionExamples || [];
  const [phIdx] = React.useState(() => examples.length ? Math.floor(Math.random() * examples.length) : 0);
  const useExample = ex => {
    setDraft(ex);
    setTimeout(autoGrow, 0);
    if (taRef.current) taRef.current.focus();
  };
  const ready = !!(mission && mission.done && mission.report);
  const showForm = !mission || compose && mission.done;
  React.useEffect(() => {
    if (ready && !compose && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [ready, compose]);
  const sendClarify = async () => {
    const a = clarify.trim();
    if (!a || !mission) return;
    setClarify("");
    try {
      await api.clarifyMission(mission.id, a);
    } catch (e) {
      setErr(e.message);
    }
  };
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(320, el.scrollHeight + 2) + "px";
  };
  const assign = async () => {
    const t = draft.trim();
    if (!t) return;
    setErr("");
    try {
      await onAssign(t, deep ? "deep" : "quick");
      setDraft("");
      onComposeChange && onComposeChange(false);
    } catch (e) {
      setErr(e.message);
    }
  };
  return <GlassPanel side="right" wide={wide && !showForm} label={showForm ? P.mission : ready ? P.missionDone : P.missionActive}>
      <div className="as-panel-head">
        <span className="as-panel-title">{showForm ? P.mission : ready ? P.missionDone : P.missionActive}</span>
        {!showForm && <WideToggle wide={wide} onToggle={toggleWide} />}
        <button className="as-icon-btn" onClick={onClose} aria-label={P.close}><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body" ref={bodyRef}>
        {showForm && <div>
            {!seenHelp && <div className="as-card as-compose-help">
                <div className="as-eyebrow as-eyebrow-row" style={{
            marginTop: 0
          }}>
                  <span>{P.composeHelp.title}</span>
                  <button className="as-eyebrow-act" onClick={dismissHelp}>{P.composeHelp.dismiss}</button>
                </div>
                <ol className="as-help-steps">
                  {P.composeHelp.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                <div className="as-help-keys">{P.composeHelp.keys}</div>
              </div>}
            <p style={{
          font: "400 13.5px/1.55 var(--font-body)",
          color: "var(--ink-2)",
          margin: "4px 4px 12px"
        }}>
              {P.missionDesc}
            </p>
            {!draft && examples.length > 0 && <React.Fragment>
                <div className="as-eyebrow" style={{
              marginTop: 0
            }}>{P.composeHint}</div>
                <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: "0 2px",
              marginBottom: 11
            }}>
                  {examples.map((ex, i) => <button key={i} className="as-chip click" onClick={() => useExample(ex)}>{ex}</button>)}
                </div>
              </React.Fragment>}
            <textarea ref={taRef} className="as-textarea" value={draft} placeholder={examples[phIdx] || P.missionPh} autoFocus onChange={e => {
          setDraft(e.target.value);
          autoGrow();
        }} onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), assign())} />
            {err && <div className="as-login-err">{err}</div>}
            <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 10
        }}>
              <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
                {mission && <button className="as-btn ghost" onClick={() => onComposeChange && onComposeChange(false)}>{P.lastResult}</button>}
                <div className="as-mode-seg" role="group" aria-label="Research mode">
                  <button type="button" className={"as-mode-opt" + (!deep ? " on" : "")} aria-pressed={!deep} onClick={() => setDeep(false)}>Quick</button>
                  <button type="button" className={"as-mode-opt" + (deep ? " on" : "")} aria-pressed={deep} onClick={() => setDeep(true)} title={P.deepDiveHint}>🔬 Deep research</button>
                </div>
              </div>
              <button className="as-btn primary" disabled={!draft.trim()} onClick={assign}>{P.missionGo}</button>
            </div>
            <div className="as-eyebrow">Receiving squad</div>
            <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "0 2px"
        }}>
              {AS.AGENTS.map(def => <span key={def.id} className="as-chip" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}>
                  <img src={agentPortrait(def)} width="16" height="16" style={{
              imageRendering: "pixelated",
              borderRadius: 4
            }} alt="" />
                  {def.name}
                </span>)}
            </div>
          </div>}
        {!showForm && <React.Fragment>
            {ready && <div className="as-ready-cue"><DSIcon name="check-circle" size={14} />{P.reportReady}</div>}
            {mission.phase === "clarifying" && <div className="as-clarify">
                <span className="ttl"><DSIcon name="users" size={14} />{P.clarifyTitle}</span>
                <div className="body">{mission.clarifyQuestion}</div>
                <div style={{
            display: "flex",
            gap: 8,
            marginTop: 10
          }}>
                  <input className="as-input" value={clarify} placeholder={P.clarifyPh} autoFocus onChange={e => setClarify(e.target.value)} onKeyDown={e => e.key === "Enter" && sendClarify()} />
                  <button className="as-btn primary" style={{
              padding: "10px 14px"
            }} disabled={!clarify.trim()} onClick={sendClarify}>
                    <DSIcon name="send" size={15} />
                  </button>
                </div>
              </div>}
            <MissionDetail mission={mission} stream onSteer={onSteer ? text => onSteer(mission.id, text) : null} onAssign={onAssign} onToast={onToast} onCancel={onCancel} />
            {mission.done && <button className="as-btn primary" style={{
          width: "100%",
          justifyContent: "center",
          marginTop: 4
        }} onClick={() => onComposeChange && onComposeChange(true)}>
                <DSIcon name="send" size={15} /> {AS.STR.dock.mission}
              </button>}
          </React.Fragment>}
      </div>
    </GlassPanel>;
}
export function VerdictReveal({
  verdict,
  onDismiss
}) {
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    if (!verdict || paused) return;
    const t = setTimeout(onDismiss, 5200);
    return () => clearTimeout(t);
  }, [verdict, onDismiss, paused]);
  if (!verdict) return null;
  const d = verdict.decision;
  const positive = !d || !/do-not-proceed/i.test(d);
  const DEC_LABEL = { proceed: "Proceed", "do-not-proceed": "Do not proceed", "proceed-with-conditions": "Proceed with conditions", informational: "Informational", event: "Event" };
  return <div className="as-verdict-backdrop" onClick={onDismiss}>
      <div className={"as-verdict-card " + (positive ? "ok" : "hold")} onClick={e => e.stopPropagation()} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <button className="as-verdict-close" onClick={onDismiss} aria-label={AS.STR.panel.close}><DSIcon name="x" size={15} /></button>
        <div className="as-verdict-ring" style={{
        "--vp-target": verdict.confidence
      }}>
          <div className="as-verdict-ring-in">
            <span className="as-verdict-pct">{verdict.confidence}<i>%</i></span>
            <span className="as-verdict-lbl">confidence</span>
          </div>
        </div>
        {d && <span className={"as-verdict-stamp " + (positive ? "ok" : "hold")}>{DEC_LABEL[d] || d}</span>}
        <div className="as-verdict-rec">{verdict.recommendation}</div>
        <button className="as-btn primary as-verdict-cta" onClick={onDismiss}>
          View full report<span>report · sources · debate</span>
        </button>
      </div>
    </div>;
}
export function MissionPill({
  mission,
  onClick
}) {
  if (!mission) return null;
  const isEvent = mission.phase === "event";
  const total = mission.subtasks.length;
  const done = mission.subtasks.filter(s => s.status === "done").length;
  const pct = mission.done || isEvent ? 100 : total ? Math.round(done / total * 100) : 6;
  const right = mission.stopped ? "⏹ stopped" : mission.failed ? "✕ failed" : mission.done ? "✓ done" : isEvent ? "live 🎉" : mission.phase === "clarifying" ? "❓ needs you" : total ? `${done}/${total}` : "…";
  const inner = <div className="as-mission-pill" onClick={onClick} style={{
    cursor: "pointer"
  }}>
      <DSIcon name={mission.stopped || mission.failed ? "x" : mission.done ? "check-circle" : "zap"} size={15} />
      <span className="ttl">{mission.title}</span>
      <span className="bar"><i style={{
        width: pct + "%"
      }}></i></span>
      <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--ink-3)",
      whiteSpace: "nowrap"
    }}>{right}</span>
    </div>;
  const Host = DSLG();
  if (!Host) return <div className="as-mission-pill-host">{inner}</div>;
  return <Host className="as-mission-pill-host" radius={999} hoverLift={false} refraction={false}>
      {inner}
    </Host>;
}
export function IncidentPill({
  agentId,
  state,
  offset,
  onRevive,
  onOpen,
  onLocate
}) {
  const def = AS.AGENTS.find(a => a.id === agentId);
  if (!def) return null;
  const reviving = state === "reviving";
  const inner = <div className="as-incident">
      <span className="as-incident-dot"></span>
      <span className="ttl" onClick={() => {
      onOpen(agentId);
      onLocate && onLocate(agentId);
    }}>{def.name}</span>
      <span className="sub">{reviving ? AS.STR.status.reviving + "…" : AS.STR.panel.crashedTitle}</span>
      <button className="as-btn revive sm" disabled={reviving} onClick={() => onRevive(agentId)}>
        {reviving ? AS.STR.panel.revivingBtn : AS.STR.panel.revive}
      </button>
    </div>;
  const Host = DSLG();
  const cls = "as-incident-host" + (offset ? " push" : "");
  if (!Host) return <div className={cls}>{inner}</div>;
  return <Host className={cls} radius={999} hoverLift={false} refraction={false}>
      {inner}
    </Host>;
}
