import React from "react";
import AS from "../data.js";
import { api } from "../api.js";
import { GlassPanel, DSIcon, StatusDot, agentPortrait } from "./chrome.jsx";
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
  const assign = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onAssignMission(text);
  };
  return <GlassPanel side="right" label={def.name}>
      <div className="as-panel-head">
        <img className="as-avatar" src={agentPortrait(def)} width="40" height="40" alt={def.name} />
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
      padding: "10px 14px 14px"
    }}>
          <input className="as-input" value={draft} placeholder={P.missionPh} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && assign()} />
          <button className="as-btn primary" onClick={assign} style={{
        padding: "10px 14px"
      }}>
            <DSIcon name="send" size={15} />
          </button>
        </div>}
    </GlassPanel>;
}
export function AgentDashboard({
  states,
  onClose,
  onAgent
}) {
  return <GlassPanel side="right" label={AS.STR.panel.agents}>
      <div className="as-panel-head">
        <span className="as-panel-title">{AS.STR.panel.agents}</span>
        <button className="as-icon-btn" onClick={onClose} aria-label={AS.STR.panel.close}><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body">
        {AS.AGENTS.map(def => {
        const st = states[def.id] || {};
        return <div key={def.id} className="as-card click" onClick={() => onAgent(def.id)}>
              <div className="as-row">
                <img className="as-avatar" src={agentPortrait(def)} width="40" height="40" alt={def.name} />
                <div className="as-col as-grow">
                  <span className="as-name" style={{
                color: AS.PROVIDERS[def.provider].color
              }}>{def.name}</span>
                  {def.name !== def.role && <span className="as-role">{def.role}</span>}
                </div>
                <StatusDot state={st.state || "idle"} />
              </div>
            </div>;
      })}
      </div>
    </GlassPanel>;
}
const STANCE_LABEL = {
  support: "support",
  oppose: "oppose",
  conditional: "conditional"
};
const scrollParent = el => {
  let n = el && el.parentElement;
  while (n) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
    n = n.parentElement;
  }
  return null;
};
function MeetingTranscript({
  turns,
  live,
  decision
}) {
  const endRef = React.useRef(null);
  const prevLen = React.useRef(0);
  React.useEffect(() => {
    if (turns.length > prevLen.current && endRef.current) {
      const sc = scrollParent(endRef.current);
      const nearBottom = !sc || sc.scrollHeight - sc.scrollTop - sc.clientHeight < 160;
      if (nearBottom) endRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
    prevLen.current = turns.length;
  }, [turns.length]);
  const newestIdx = turns.length - 1;
  const lastStance = {};
  let curRound = null;
  const rows = [];
  turns.forEach((turn, i) => {
    if (turn.round != null && turn.round !== curRound) {
      curRound = turn.round;
      rows.push(<div key={"r" + i} className="as-round-head">Round {curRound}</div>);
    }
    const def = AS.AGENTS.find(a => a.id === turn.agentId);
    const color = def ? AS.PROVIDERS[def.provider].color : "var(--ink-4)";
    const prev = lastStance[turn.agentId];
    const changed = prev && turn.stance && prev !== turn.stance;
    if (turn.stance) lastStance[turn.agentId] = turn.stance;
    rows.push(<div key={i} className={"as-turn" + (live && i === newestIdx ? " as-turn-new" : "")}>
        <span className="as-turn-dot" style={{
        background: color
      }}></span>
        <div className="as-turn-body">
          <span className="as-turn-name" style={{
          color
        }}>{def ? def.name : "?"}</span>
          <span className="as-turn-text">{turn.argument || turn.say}</span>
          <div className="as-turn-tags">
            {turn.stance && <span className={"as-turn-stance " + turn.stance}>{STANCE_LABEL[turn.stance] || turn.stance}</span>}
            {changed && <span className="as-turn-change">↻ {STANCE_LABEL[prev] || prev} → {STANCE_LABEL[turn.stance] || turn.stance}</span>}
          </div>
        </div>
      </div>);
  });
  let sup = 0,
    opp = 0;
  turns.forEach(t => {
    if (t.stance === "support") sup++;else if (t.stance === "oppose") opp++;
  });
  const tot = sup + opp;
  const pos = decision ? /do-not-proceed/.test(decision) ? -1 : /proceed/.test(decision) ? 1 : 0 : tot ? (sup - opp) / tot : 0;
  const leftPct = 50 + pos * 44;
  const tokColor = pos < -0.05 ? "#E8A53C" : pos > 0.05 ? "#1ED760" : "#E5C46B";
  return <div>
      <div className="as-tug">
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
      </div>
      {rows}<div ref={endRef} style={{
      height: 1
    }}></div>
    </div>;
}
function ConfidenceBreakdown({
  breakdown,
  confidence,
  label
}) {
  const [open, setOpen] = React.useState(false);
  const rows = (breakdown || []).filter(o => o && o.role !== "reporter" && typeof o.confidence === "number");
  const hasData = rows.length > 0;
  const flagged = rows.reduce((n, o) => n + (o.flags ? o.flags.length : 0), 0);
  return <span className="as-conf-wrap">
      <button className={"as-report-conf" + (hasData ? " click" : "")} onClick={() => hasData && setOpen(v => !v)} title={hasData ? "View confidence breakdown" : undefined}>
        <DSIcon name="shield-check" size={13} />{confidence}% {label || "confidence"}
        {hasData && <svg className={"as-conf-caret" + (open ? " open" : "")} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>}
      </button>
      {open && hasData && <div className="as-conf-pop">
          <div className="as-conf-note">Weighted average · Critic ×2{flagged ? ` · ${flagged} critic flag${flagged === 1 ? "" : "s"}` : ""}</div>
          {rows.map((o, i) => {
        const def = AS.AGENTS.find(a => a.id === o.agentId);
        const color = def ? AS.PROVIDERS[def.provider].color : "var(--ink-4)";
        const delta = typeof o.confidenceBefore === "number" ? o.confidence - o.confidenceBefore : 0;
        return <div key={i} className="as-conf-row">
                <span className="as-conf-dot" style={{
            background: color
          }}></span>
                <span className="as-conf-name">{def ? def.name : o.name || o.role}</span>
                {o.role === "critic" && <span className="as-conf-x2">×2</span>}
                {o.stance && <span className={"as-turn-stance " + o.stance}>{STANCE_LABEL[o.stance] || o.stance}</span>}
                <span className="as-grow"></span>
                {delta !== 0 && <span className={"as-conf-delta " + (delta < 0 ? "down" : "up")}>{delta > 0 ? "+" : ""}{delta}</span>}
                <span className="as-conf-pct">{o.confidence}%</span>
              </div>;
      })}
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
  label: "Review"
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
export function MissionDetail({
  mission,
  stream,
  onSteer
}) {
  const P = AS.STR.panel;
  const statusColor = mission.failed ? "#DC2626" : mission.done ? "#1F8A48" : "#C77700";
  const subs = mission.subtasks || [];
  const subDone = subs.filter(s => s.status === "done").length;
  const subCounter = !mission.done && !mission.failed && subs.length ? ` · ${subDone}/${subs.length} subtasks` : "";
  const statusText = (mission.failed ? P.missionFailed : mission.done ? AS.STR.misc.completed : mission.phase === "clarifying" ? P.waitingForYou : mission.phase === "event" ? P.eventRunning : mission.phase === "meeting" ? P.meeting + "…" : "Executing — orchestrated by the lead") + subCounter;
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
        </div>
      </div>

      {!mission.failed && mission.stage != null && <StageTracker stage={mission.stage} hadDebate={mission.hadDebate} done={mission.done} paused={mission.phase === "event"} caption={mission.phase === "event" ? P.eventResume : null} />}

      {mission.done && jumpSections.length > 1 && <nav className="as-jumpbar" aria-label={P.jumpAria}>
          {jumpSections.map(s => <button key={s.id} type="button" className={"as-chip click" + (activeSection === s.id ? " active" : "")} onClick={() => jumpTo(s.id)}>
              {s.label}
            </button>)}
        </nav>}

      {mission.report && <div className="as-decision" id="as-sec-conclusion">
          <span className="ttl"><DSIcon name="check-circle" size={14} />{P.answer}{meeting?.decision ? ` · ${meeting.decision}` : ""}</span>
          <div className="body">{mission.report.recommendation}</div>
          <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        flexWrap: "wrap"
      }}>
            <ConfidenceBreakdown breakdown={mission.report.breakdown} confidence={mission.report.confidence} />
            {mission.simulated && <span className="as-sim-badge">{P.simBadge}</span>}
          </div>
          {meeting?.conditions?.length > 0 && <div className="conds">
              {meeting.conditions.map((c, i) => <span key={i} className="as-chip">{c}</span>)}
            </div>}
        </div>}

      {!mission.report && meeting?.decision && <div className="as-decision">
          <span className="ttl"><DSIcon name="check-circle" size={14} />{P.decision} · {meeting.decision}</span>
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

      {mission.report && <React.Fragment>
          <div className="as-eyebrow" id="as-sec-report">{P.report}</div>
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
            <MeetingTranscript turns={meeting.turns} live={!mission.done} decision={meeting.decision} />
          </div>
        </React.Fragment>}
    </div>;
}
const everyLabel = m => m >= 1440 ? `mỗi ${Math.round(m / 1440)} ngày` : m >= 60 ? `mỗi ${Math.round(m / 60)} giờ` : `mỗi ${m} phút`;
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
        <DSIcon name="clock" size={12} />Nhiệm vụ định kỳ{list.length ? ` · ${list.length}` : ""}
        <span className="as-grow"></span>
        <svg className={"as-conf-caret" + (open ? " open" : "")} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      {open && <div className="as-card">
          <p style={{ font: "400 12px/1.5 var(--font-body)", color: "var(--ink-3)", margin: "0 0 8px" }}>
            Squad tự chạy theo lịch (kể cả khi bạn offline); kết quả tự gửi vào Inbox.
          </p>
          <input className="as-input" value={title} placeholder="vd: Quét tin M&A fintech VN tuần này" onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <div className="as-row" style={{ gap: 8, marginTop: 8 }}>
            <select className="as-select as-grow" value={every} onChange={e => setEvery(Number(e.target.value))}>
              <option value={10}>Mỗi 10 phút (demo)</option>
              <option value={60}>Mỗi giờ</option>
              <option value={360}>Mỗi 6 giờ</option>
              <option value={1440}>Mỗi 24 giờ</option>
            </select>
            <button className="as-btn primary" disabled={!title.trim()} onClick={add} style={{ padding: "9px 14px" }}>Thêm</button>
          </div>
          {list.map(s => <div key={s.id} className="as-row" style={{ marginTop: 10, alignItems: "center", gap: 8 }}>
              <span className={"as-incident-dot" + (s.enabled ? "" : "")} style={{ width: 8, height: 8, borderRadius: "50%", flex: "none", background: s.enabled ? "var(--gn-vivid-bot)" : "var(--ink-5)" }}></span>
              <div className="as-col as-grow" style={{ minWidth: 0 }}>
                <span style={{ font: "500 12.5px var(--font-body)", color: s.enabled ? "var(--ink)" : "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                <span style={{ font: "500 10.5px var(--font-mono)", color: "var(--ink-4)" }}>{everyLabel(s.schedule?.everyMinutes || 1440)}{s.lastRunAt ? ` · chạy lần cuối ${fmtTime(s.lastRunAt)}` : " · chưa chạy"}</span>
              </div>
              <button className="as-icon-btn" title={s.enabled ? "Tạm dừng" : "Bật"} onClick={() => toggle(s)}>{s.enabled ? "⏸" : "▶"}</button>
              <button className="as-icon-btn" title="Xoá" onClick={() => del(s.id)}><DSIcon name="x" size={13} /></button>
            </div>)}
        </div>}
    </div>;
}
export function TasksPanel({
  liveMission,
  onClose,
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
        done: m.status === "done" || m.status === "failed",
        failed: m.status === "failed",
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
        subtasks: (() => {
          const byRole = {};
          (m.outputs || []).forEach(o => {
            if (o.role) byRole[o.role] = o;
          });
          return (m.subtasks || []).map(s => {
            const o = byRole[s.role];
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
          breakdown: (m.outputs || []).filter(o => o.role !== "reporter")
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
            {list && list.length === 0 && <div style={{
          padding: "20px 8px",
          textAlign: "center",
          font: "400 13px var(--font-body)",
          color: "var(--ink-4)"
        }}>
                {P.noTasks}
              </div>}
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
                    <span className={"as-task-status " + t.status}>{t.status}</span>
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
  onMarkAllRead
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
        <span className="as-panel-title">Báo cáo từ squad</span>
        <button className="as-icon-btn" onClick={onClose} aria-label="close"><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body" aria-live="polite">
        {briefings.length === 0 && <div style={{
        padding: "26px 8px",
        textAlign: "center",
        font: "400 13px var(--font-body)",
        color: "var(--ink-4)"
      }}>
            Chưa có báo cáo — squad sẽ tự gửi tóm tắt vào đây sau mỗi nhiệm vụ.
          </div>}
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
  onSteer
}) {
  const [draft, setDraft] = React.useState("");
  const [err, setErr] = React.useState("");
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
      await onAssign(t);
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
          justifyContent: mission ? "space-between" : "flex-end",
          marginTop: 10
        }}>
              {mission && <button className="as-btn ghost" onClick={() => onComposeChange && onComposeChange(false)}>
                  {P.lastResult}
                </button>}
              <button className="as-btn primary" disabled={!draft.trim()} onClick={assign}>
                {P.missionGo}
              </button>
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
            <MissionDetail mission={mission} stream onSteer={onSteer ? text => onSteer(mission.id, text) : null} />
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
  return <div className="as-verdict-backdrop" onClick={onDismiss}>
      <div className={"as-verdict-card " + (positive ? "ok" : "hold")} onClick={e => e.stopPropagation()} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="as-verdict-ring" style={{
        "--vp-target": verdict.confidence
      }}>
          <div className="as-verdict-ring-in">
            <span className="as-verdict-pct">{verdict.confidence}<i>%</i></span>
            <span className="as-verdict-lbl">confidence</span>
          </div>
        </div>
        {d && <span className={"as-verdict-stamp " + (positive ? "ok" : "hold")}>{d}</span>}
        <div className="as-verdict-rec">{verdict.recommendation}</div>
        <button className="as-btn primary as-verdict-cta" onClick={onDismiss}>
          Xem đầy đủ<span>báo cáo · nguồn · phản biện</span>
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
  const right = mission.done ? "✓ done" : isEvent ? "live 🎉" : mission.phase === "clarifying" ? "❓ needs you" : total ? `${done}/${total}` : "…";
  const inner = <div className="as-mission-pill" onClick={onClick} style={{
    cursor: "pointer"
  }}>
      <DSIcon name={mission.done ? "check-circle" : "zap"} size={15} />
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
