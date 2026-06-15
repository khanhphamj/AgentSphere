import React from "react";
import ReactDOM from "react-dom";
import QRCode from "qrcode";
import AS from "../data.js";
import { api } from "../api.js";
import { PixelIcon } from "./pixelIcons.jsx";
const DS = window.MSSDesignSystem_fa0208 || {};
export const DSIcon = DS.Icon || (({
  name
}) => <span>{name}</span>);
const LG = DS.LiquidGlass;
const LGDock = DS.GlassDock;
export function GlassPanel({
  side,
  label,
  wide,
  children
}) {
  const cls = "as-panel-host " + side + (wide ? " wide" : "");
  const inner = <div className="as-panel" role="dialog" aria-modal="false" aria-label={label}>{children}</div>;
  if (!LG) return <div className={cls}>{inner}</div>;
  return <LG className={cls} radius={20} intensity="heavy" hoverLift={false} refraction={false}>
      {inner}
    </LG>;
}
export const STATUS_COLOR = {
  working: "var(--status-ok)",
  moving: "var(--status-info)",
  meeting: "var(--status-warn)",
  social: "#7C5CE0",
  idle: "var(--ink-4)",
  down: "#DC2626",
  reviving: "#C77700"
};
const __portraitCache = {};
export function agentPortrait(def) {
  const key = def.id + (def.provider || "");
  if (__portraitCache[key]) return __portraitCache[key];
  const cv = document.createElement("canvas");
  cv.width = 16;
  cv.height = 16;
  const c = cv.getContext("2d");
  const p = def.palette || {
    shirt: "#1F8A48",
    hair: "#3A2E28",
    skin: "#EFC9A8"
  };
  c.fillStyle = (AS.PROVIDERS[def.provider] || AS.PROVIDERS.greennode).soft;
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = p.shirt;
  c.fillRect(3, 11, 10, 5);
  c.fillStyle = p.skin;
  c.fillRect(4, 3, 8, 8);
  c.fillStyle = p.hair;
  c.fillRect(4, 2, 8, 3);
  c.fillRect(4, 4, 2, 3);
  c.fillRect(10, 4, 2, 3);
  c.fillStyle = "#2A2622";
  c.fillRect(6, 7, 1, 2);
  c.fillRect(9, 7, 1, 2);
  __portraitCache[key] = cv.toDataURL();
  return __portraitCache[key];
}
export function StatusDot({
  state,
}) {
  return <span className="as-status">
      <i style={{
      background: STATUS_COLOR[state] || STATUS_COLOR.idle
    }}></i>
      {AS.STR.status[state] || AS.STR.status.idle}
    </span>;
}
export function TopBar({
  clock,
  worldName,
  onlineCount,
  connected,
  onSetup,
  user,
  onLogout
}) {
  const left = <div className="as-topbar">
      <div className="as-brand">
        <img className="as-brand-logo" src="/assets/greennode-logo.png" alt="GreenNode" />
        <span className="as-brand-name">AgentSphere</span>
      </div>
      <div className="as-world-chip">
        <span className={"as-live-dot" + (connected ? "" : " offline")}></span>
        {worldName}
        <span className="as-world-sub" style={{
        color: "var(--ink-4)"
      }}>· {onlineCount} agent {AS.STR.misc.online}</span>
      </div>
    </div>;
  const right = <div className="as-topbar">
      <div className="as-clock">
        <DSIcon name="clock" size={14} />
        {clock}
      </div>
      {onSetup && <button className="as-icon-btn" onClick={onSetup} title="Squad setup — agent names & models">
          <DSIcon name="settings" size={15} />
        </button>}
      {user && <UserChip user={user} onLogout={onLogout} />}
    </div>;
  if (!LG) {
    return <React.Fragment>
        <div className="as-tb-left">{left}</div>
        <div className="as-tb-right">{right}</div>
      </React.Fragment>;
  }
  return <React.Fragment>
      <LG className="as-tb-left" radius={999} hoverLift={false} refraction={false}>{left}</LG>
      <LG className="as-tb-right" radius={999} hoverLift={false} refraction={false}>{right}</LG>
    </React.Fragment>;
}
export function Dock({
  active,
  onSelect,
  onMission,
  unread = 0
}) {
  const items = [{
    id: "agents",
    icon: "users"
  }, {
    id: "inbox",
    icon: "mail",
    label: "Inbox"
  }, {
    id: "activity",
    icon: "zap"
  }, {
    id: "tasks",
    icon: "check-circle"
  }];
  const wrapRef = React.useRef(null);
  const [ind, setInd] = React.useState(null);
  React.useLayoutEffect(() => {
    let raf;
    const measure = () => {
      const root = wrapRef.current;
      if (!root) return;
      const content = root.querySelector(".lg__content") || root.querySelector(".as-dock");
      const btn = content && content.querySelector(".as-dock-btn.on");
      if (content && btn) {
        setInd({
          left: btn.offsetLeft,
          width: btn.offsetWidth,
          top: btn.offsetTop,
          height: btn.offsetHeight
        });
      } else {
        setInd(prev => prev ? {
          ...prev,
          hidden: true
        } : null);
      }
    };
    raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [active]);
  const show = ind && !ind.hidden;
  const buttons = <React.Fragment>
      <span className="as-dock-indicator" data-show={show ? "1" : "0"} style={ind ? {
      left: ind.left,
      top: ind.top,
      width: ind.width,
      height: ind.height
    } : undefined}></span>
      {items.map(it => <button key={it.id} data-id={it.id} className={"as-dock-btn" + (active === it.id ? " on" : "")} onClick={() => onSelect(active === it.id ? null : it.id)}>
          <span style={{
        position: "relative",
        display: "inline-flex"
      }}>
            <PixelIcon name={it.id} size={22} />
            {it.id === "inbox" && unread > 0 && <span className="as-dock-badge">{unread > 9 ? "9+" : unread}</span>}
          </span>
          {AS.STR.dock[it.id] || it.label}
        </button>)}
      <button className={"as-dock-btn cta" + (active === "mission" ? " on" : "")} data-id="mission" onClick={onMission}>
        <PixelIcon name="mission" size={22} />
        {AS.STR.dock.mission}
      </button>
    </React.Fragment>;
  return <div className="as-dock-wrap" ref={wrapRef}>
      {LGDock ? <LGDock refraction={false} springPress={false}>{buttons}</LGDock> : <div className="as-dock">{buttons}</div>}
    </div>;
}
export function ZoomControls({
  onZoom
}) {
  return <div className="as-zoom">
      <button onClick={() => onZoom(1)} aria-label="Zoom in">+</button>
      <button onClick={() => onZoom(-1)} aria-label="Zoom out">−</button>
    </div>;
}
export function ActivityFeed({
  items,
  onClose,
  onAgent
}) {
  return <GlassPanel side="right" label={AS.STR.panel.activity}>
      <div className="as-panel-head">
        <span className="as-panel-title">{AS.STR.panel.activity}</span>
        <button className="as-icon-btn" onClick={onClose} aria-label={AS.STR.panel.close}><DSIcon name="x" size={15} /></button>
      </div>
      <div className="as-panel-body" aria-live="polite">
        {items.length === 0 && <div style={{
        padding: "26px 8px",
        textAlign: "center",
        font: "400 13px var(--font-body)",
        color: "var(--ink-4)"
      }}>
            No activity yet — assign a mission to get things moving.
          </div>}
        {items.map(it => {
        const def = it.agentId ? AS.AGENTS.find(a => a.id === it.agentId) : null;
        const color = def ? AS.PROVIDERS[def.provider].color : "var(--ink-5)";
        return <div key={it.id} className="as-feed-item" style={{
          cursor: def ? "pointer" : "default"
        }} onClick={() => def && onAgent(def.id)}>
              <span className="as-feed-time">{it.time}</span>
              <span className="as-feed-dot" style={{
            background: color
          }}></span>
              <span className="as-feed-text">{it.text}</span>
            </div>;
      })}
      </div>
    </GlassPanel>;
}
export function userFromEmail(email) {
  const local = (email || "").split("@")[0] || "user";
  const name = local.replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim() || "User";
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return {
    email,
    name,
    initials
  };
}
export function UserChip({
  user,
  onLogout
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const ref = React.useRef(null);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const place = React.useCallback(() => {
    const b = btnRef.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    setPos({
      top: r.bottom + 10,
      right: Math.max(12, window.innerWidth - r.right)
    });
  }, []);
  React.useEffect(() => {
    if (!open) return;
    place();
    const onDoc = e => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onMove = () => place();
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);
  const A = AS.STR.auth;
  const menu = open && pos ? <div className="as-user-menu" ref={menuRef} style={{
    top: pos.top,
    right: pos.right
  }}>
      <div className="as-user-meta">
        <div className="as-col" style={{
        minWidth: 0
      }}>
          <span className="as-user-mname">{user.name}</span>
          <span className="as-user-mmail">{user.email}</span>
        </div>
      </div>
      <div className="as-user-tenant"><DSIcon name="shield-check" size={13} />{A.tenant}</div>
      <div className="as-user-divider"></div>
      <button className="as-user-item danger" onClick={() => {
      setOpen(false);
      onLogout();
    }}>
        <DSIcon name="logout" size={15} />{A.logout}
      </button>
    </div> : null;
  return <div className="as-userchip-wrap" ref={ref}>
      <button ref={btnRef} className={"as-userchip" + (open ? " open" : "")} onClick={() => setOpen(o => !o)}>
        <span className="as-user-av">{user.initials}</span>
        <span className="as-user-name">{user.name}</span>
        <svg className="as-user-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      {menu && ReactDOM.createPortal(menu, document.body)}
    </div>;
}
export function OtpInput({
  value,
  onChange,
  onComplete
}) {
  const refs = React.useRef([]);
  const digits = Array.from({
    length: 6
  }, (_, i) => value[i] || "");
  const setAt = (i, d) => {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).replace(/\D/g, "").slice(0, 6);
    onChange(next);
    return next;
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setAt(i, "");
      } else if (i > 0) {
        const n = value.slice(0, i - 1) + value.slice(i);
        onChange(n);
        refs.current[i - 1] && refs.current[i - 1].focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1].focus();else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1].focus();else if (e.key === "Enter" && value.length === 6 && onComplete) onComplete(value);
  };
  const onInput = (i, e) => {
    const d = e.target.value.replace(/\D/g, "");
    if (!d) return;
    if (d.length > 1) {
      const next = (value.slice(0, i) + d).replace(/\D/g, "").slice(0, 6);
      onChange(next);
      const last = Math.min(next.length, 5);
      refs.current[last] && refs.current[last].focus();
      if (next.length === 6 && onComplete) setTimeout(() => onComplete(next), 60);
      return;
    }
    const next = setAt(i, d);
    if (i < 5) refs.current[i + 1] && refs.current[i + 1].focus();
    if (next.length === 6 && onComplete) setTimeout(() => onComplete(next), 60);
  };
  const onPaste = (i, e) => {
    e.preventDefault();
    const d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!d) return;
    onChange(d);
    const last = Math.min(d.length, 5);
    refs.current[last] && refs.current[last].focus();
    if (d.length === 6 && onComplete) setTimeout(() => onComplete(d), 60);
  };
  return <div className="as-otp">
      {digits.map((d, i) => <input key={i} ref={el => refs.current[i] = el} className={"as-otp-box" + (d ? " filled" : "")} inputMode="numeric" maxLength={1} value={d} autoFocus={i === 0} onChange={e => onInput(i, e)} onKeyDown={e => onKey(i, e)} onPaste={e => onPaste(i, e)} onFocus={e => e.target.select()} />)}
    </div>;
}
export function Login({
  onLogin
}) {
  const A = AS.STR.auth;
  const [step, setStep] = React.useState(0);
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [enroll, setEnroll] = React.useState(null);
  const [qr, setQr] = React.useState(null);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  React.useEffect(() => {
    if (!enroll) {
      setQr(null);
      return;
    }
    let dead = false;
    QRCode.toDataURL(enroll.otpauth, {
      width: 164,
      margin: 1
    }).then(url => !dead && setQr(url)).catch(() => {});
    return () => {
      dead = true;
    };
  }, [enroll]);
  const sendCode = async () => {
    if (!validEmail) {
      setErr(A.badEmail);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const r = await api.requestCode(email.trim());
      setEnroll(r.mode === "enroll" ? {
        otpauth: r.otpauth,
        secret: r.secret
      } : null);
      setStep(1);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const verify = async submitted => {
    const c = (typeof submitted === "string" ? submitted : code).trim();
    if (!/^\d{6}$/.test(c)) {
      setErr(A.badCode);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const {
        token,
        user
      } = await api.verifyCode(email.trim(), c);
      onLogin(token, {
        ...userFromEmail(user.email),
        ...user,
        initials: userFromEmail(user.email).initials
      });
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  const emailCard = <div className="as-login">
      <img src="/assets/greennode-logo.png" alt="GreenNode" className="as-login-logo" />
      <h1 className="as-login-title">{A.signInTitle}</h1>
      <p className="as-login-sub">{A.signInSub}</p>
      <div className="as-eyebrow" style={{
      margin: "4px 0 6px"
    }}>{A.emailLabel}</div>
      <div className="as-field">
        <DSIcon name="mail" size={16} />
        <input className="as-input as-input-bare" type="email" value={email} placeholder={A.emailPh} autoFocus onChange={e => {
        setEmail(e.target.value);
        setErr("");
      }} onKeyDown={e => e.key === "Enter" && sendCode()} />
      </div>
      {err && <div className="as-login-err">{err}</div>}
      <button className="as-btn primary as-login-cta" disabled={busy} onClick={sendCode}>
        {busy ? A.sending : A.sendCode}
        {!busy && <DSIcon name="arrow-right" size={16} />}
      </button>
    </div>;
  const backBtn = <button className="as-auth-back" onClick={() => {
    setStep(0);
    setCode("");
    setErr("");
    setBusy(false);
    setEnroll(null);
  }}>
      <DSIcon name="arrow-right" size={14} />{A.useDiffEmail}
    </button>;
  const codeCard = <div className="as-login as-otp-card">
      <div className="as-auth-head">
        <span className="as-auth-ico"><DSIcon name="shield-check" size={17} /></span>
        <div className="as-col">
          <span className="as-auth-title">{A.authTitle}</span>
          <span className="as-auth-provider">{A.authProvider}</span>
        </div>
      </div>
      <p className="as-auth-sub">{A.enterCodeFor} <b>{email.trim()}</b></p>
      <OtpInput value={code} onChange={v => {
      setCode(v);
      setErr("");
    }} onComplete={verify} />
      {err && <div className="as-login-err">{err}</div>}
      {busy && <div className="as-auth-verifying"><span className="as-auth-spin"></span>{A.verifying}</div>}
      {backBtn}
    </div>;
  const enrollCard = <div className="as-login as-otp-card">
      <div className="as-auth-head">
        <span className="as-auth-ico"><DSIcon name="shield-check" size={17} /></span>
        <div className="as-col">
          <span className="as-auth-title">{A.enrollTitle}</span>
          <span className="as-auth-provider">{A.authProvider}</span>
        </div>
      </div>
      <p className="as-auth-sub">{A.enrollDesc}</p>
      <div className="as-enroll">
        {qr && <img className="as-enroll-qr" src={qr} width="164" height="164" alt="TOTP QR" />}
        <div className="as-enroll-key">
          <span className="as-eyebrow">{A.manualKey}</span>
          <code>{enroll && enroll.secret}</code>
        </div>
      </div>
      <OtpInput value={code} onChange={v => {
      setCode(v);
      setErr("");
    }} onComplete={verify} />
      {err && <div className="as-login-err">{err}</div>}
      {busy && <div className="as-auth-verifying"><span className="as-auth-spin"></span>{A.verifying}</div>}
      {backBtn}
    </div>;
  const card = step === 0 ? emailCard : enroll ? enrollCard : codeCard;
  return <div className="as-login-backdrop">
      {LG ? <LG className="as-login-host" radius={26} intensity="heavy" hoverLift={false} refraction={false}>
          {card}
        </LG> : <div className="as-login-host">{card}</div>}
    </div>;
}
function modelTier(id) {
  const m = (id || "").toLowerCase();
  if (/(mini|nano|fast|flash|lite|gemma|gpt-4o-mini)/.test(m)) return "fast";
  if (/(r1|reason|think|plus|coder|gpt-5|m2|medium|27b|31b|14b)/.test(m)) return "reasoning";
  return "fast";
}
export function Onboarding({
  onDone,
  onCancel,
  returning,
  user,
  onLogout
}) {
  const [creating, setCreating] = React.useState(false);
  const [models, setModels] = React.useState(AS.MODELS);
  const [modelSource, setModelSource] = React.useState(null);
  const initialRef = React.useRef(AS.AGENTS.map(a => ({
    id: a.id,
    name: a.name,
    model: a.model,
    mandate: a.mandate || ""
  })));
  const [squad, setSquad] = React.useState(() => AS.AGENTS.map(a => ({
    id: a.id,
    name: a.name,
    model: a.model,
    models: [a.model],
    provider: a.provider,
    role: a.role,
    palette: a.palette,
    bio: a.bio,
    skills: a.skills,
    mandate: a.mandate || ""
  })));
  const O = AS.STR.onboarding;
  React.useEffect(() => {
    api.models().then(r => {
      const list = (r.models || []).map(m => ({
        value: m.id,
        provider: AS.providerOf(m.id)
      }));
      if (list.length) {
        setModels(list);
        setModelSource(r.source);
      }
    }).catch(() => {});
  }, []);
  const dirty = React.useMemo(() => squad.some(a => {
    const o = initialRef.current.find(x => x.id === a.id);
    return !o || o.name !== a.name || o.model !== a.model || (o.mandate || "") !== (a.mandate || "");
  }), [squad]);
  const setModel = (id, value) => {
    setSquad(s => s.map(a => a.id === id ? {
      ...a,
      model: value,
      provider: AS.providerOf(value),
      models: [value]
    } : a));
  };
  const setAgentName = (id, value) => setSquad(s => s.map(a => a.id === id ? {
    ...a,
    name: value
  } : a));
  const setAgentMandate = (id, value) => setSquad(s => s.map(a => a.id === id ? {
    ...a,
    mandate: value.slice(0, 240)
  } : a));
  const create = async () => {
    setCreating(true);
    try {
      await onDone(squad);
    } finally {
      setCreating(false);
    }
  };
  const agentCard = a => <div key={a.id} className="as-card as-onb-card" style={{
    marginBottom: 0
  }}>
      <div className="as-row" style={{
      alignItems: "center"
    }}>
        <img className="as-avatar" src={agentPortrait(a)} width="34" height="34" style={{
        width: 34,
        height: 34
      }} alt="" />
        <div className="as-col as-grow" style={{
        gap: 7
      }}>
          <input className="as-input as-input-sm" value={a.name} onChange={e => setAgentName(a.id, e.target.value)} aria-label={O.nameCol} />
          <div className="as-model-pick">
            <span className="as-model-dot" style={{
            background: AS.PROVIDERS[a.provider].color
          }}></span>
            <select className="as-select" value={a.model} onChange={e => setModel(a.id, e.target.value)} aria-label={O.modelCol}>
              {!models.some(m => m.value === a.model) && <option value={a.model}>{a.model}</option>}
              {models.map(m => <option key={m.value} value={m.value}>{m.value}</option>)}
            </select>
            <span className={"as-model-hint " + modelTier(a.model)}>{O[modelTier(a.model)]}</span>
          </div>
        </div>
      </div>
      {a.name !== a.role && <div className="as-onb-eyebrow">{O.roleCol} · {a.role}</div>}
      <p className="as-onb-bio">{a.bio}</p>
      <div className="as-onb-skills">
        {(a.skills || []).map(s => <span key={s} className="as-chip">{s}</span>)}
      </div>
      <div className="as-onb-eyebrow" style={{
      marginTop: 10
    }}>Mandate thường trực</div>
      <input className="as-input as-input-sm" value={a.mandate || ""} placeholder="vd: chỉ tin nguồn chính thống VN; luôn nêu rủi ro pháp lý…" onChange={e => setAgentMandate(a.id, e.target.value)} aria-label="mandate" />
    </div>;
  return <div className="as-onb-backdrop">
      {LG ? <LG className="as-onb-host" radius={24} intensity="heavy" hoverLift={false} refraction={false}>
          <div className="as-onb" role="dialog" aria-modal="true" aria-label={O.setupTitle}>
            <div className="as-onb-header">
              {returning ? <React.Fragment>
                  {LG ? <LG className="as-onb-back" radius={999} hoverLift={true} refraction={false}>
                      <button className="as-onb-back-btn" onClick={onCancel} aria-label="Back"><DSIcon name="arrow-right" size={18} /></button>
                    </LG> : <button className="as-onb-close" onClick={onCancel} aria-label="Back"><DSIcon name="arrow-right" size={18} /></button>}
                  <img src="/assets/greennode-logo.png" alt="GreenNode" className="as-onb-logo" />
                </React.Fragment> : <React.Fragment>
                  <img src="/assets/greennode-logo.png" alt="GreenNode" className="as-onb-logo" />
                  {user && <div className="as-onb-account">
                      <span className="as-user-av sm">{user.initials}</span>
                      <span className="as-onb-acct-mail">{user.email}</span>
                      <button className="as-onb-logout" onClick={onLogout}>
                        <DSIcon name="logout" size={13} />{AS.STR.auth.logout}
                      </button>
                    </div>}
                </React.Fragment>}
            </div>
            <div>
              <h1>{O.setupTitle}</h1>
              <p className="lead">{O.squadDesc}</p>
              {modelSource && <div className="as-onb-source">{modelSource === "maas" ? O.modelsLive : O.modelsFallback}</div>}
              <div className="as-onb-squad">
                {squad.map(agentCard)}
              </div>
              <div className="as-onb-foot" style={{
            justifyContent: "flex-end"
          }}>
                {(!returning || dirty) && <button className="as-btn primary" onClick={create} disabled={creating}>
                    {creating ? returning ? O.saving : O.createdSquad : returning ? O.save : O.enter}
                  </button>}
              </div>
              <div className="as-disclaimer">{AS.STR.misc.disclaimer}</div>
            </div>
          </div>
        </LG> : null}
    </div>;
}
