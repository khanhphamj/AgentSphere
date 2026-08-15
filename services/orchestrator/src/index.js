import express from "express";
import cors from "cors";
import http from "node:http";
import { attach, timeline, emit, setMissionOwner } from "./events.js";
import { createMission, runMission, isStatusTitle } from "./pipeline.js";
import { getSquadFor, setSquadFor, loadSquadInto, buildSquad } from "./squad.js";
import { missionStore, eventStore, briefingStore, configStore, standingStore, calibrationStore } from "./db.js";
const PORT = Number(process.env.ORCHESTRATOR_PORT || 8081);
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
if (process.env.NODE_ENV === "production" && (!CLIENT_ID || !CLIENT_SECRET)) {
  console.error("[orchestrator] refusing to start in production without CLIENT_ID/CLIENT_SECRET");
  process.exit(1);
}
function internalAuth(req, res, next) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    if (process.env.NODE_ENV === "production") return res.status(503).json({
      error: "internal auth not configured"
    });
    return next();
  }
  if (req.get("x-client-id") === CLIENT_ID && req.get("x-client-secret") === CLIENT_SECRET) return next();
  res.status(401).json({
    error: "invalid client credentials"
  });
}
const RUNTIME_URL = (process.env.AGENT_RUNTIME_URL || "http://localhost:8082").replace(/\/$/, "");
const INTERAGENT_SYNC = process.env.INTERAGENT_SYNC === "on";
const APPROVAL_WAIT_MS = Math.max(15000, Number(process.env.APPROVAL_WAIT_MS || 120000));
const pendingApprovals = new Map();
const RT_HEADERS = { "content-type": "application/json", "x-client-id": CLIENT_ID, "x-client-secret": CLIENT_SECRET };
async function callRuntime(path, body, userEmail) {
  const res = await fetch(`${RUNTIME_URL}${path}`, { method: "POST", headers: userEmail ? { ...RT_HEADERS, "x-user-email": userEmail } : RT_HEADERS, body: JSON.stringify(body), signal: AbortSignal.timeout(190000) });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}
const missions = new Map();
const queue = [];
const inflight = new Map();
const controllers = new Map();
const GLOBAL_MAX = Math.max(1, Number(process.env.MAX_CONCURRENT_MISSIONS || 3));
const PER_USER_MAX = Math.max(1, Number(process.env.MAX_CONCURRENT_PER_USER || 1));
const MISSION_DEADLINE_MS = Math.max(60_000, Number(process.env.MISSION_DEADLINE_MS || 1_800_000));
const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);
const isTerminal = m => TERMINAL_STATUSES.has(m?.status);
const MISSION_CACHE_MAX = Math.max(20, Number(process.env.MISSION_CACHE_MAX || 200));
const MISSION_RAM_ONLY_MAX = Math.max(MISSION_CACHE_MAX, Number(process.env.MISSION_RAM_ONLY_MAX || 300));
let evictionAnnounced = false;
function touchMission(m) {
  missions.delete(m.id);
  missions.set(m.id, m);
  return m;
}
function enforceMissionCap() {
  const dbMode = missionStore.available();
  const cap = dbMode ? MISSION_CACHE_MAX : MISSION_RAM_ONLY_MAX;
  let terminal = 0;
  for (const m of missions.values()) if (isTerminal(m)) terminal++;
  if (terminal <= cap) return;
  for (const [id, m] of missions) {
    if (terminal <= cap) break;
    if (!isTerminal(m)) continue;
    missions.delete(id);
    terminal--;
    if (!evictionAnnounced) {
      evictionAnnounced = true;
      console.log(`[orchestrator] mission cache reached ${cap} finished missions — evicting oldest from RAM${dbMode ? " (rows stay in the database, reloaded on demand)" : " (no database: oldest history is dropped)"}`);
    }
  }
}
async function getMission(id) {
  const hit = missions.get(id);
  if (hit) return touchMission(hit);
  const row = await missionStore.loadOne(id);
  if (!row) return null;
  const raced = missions.get(id);
  if (raced) return touchMission(raced);
  missions.set(row.id, row);
  setMissionOwner(row.id, row.userEmail);
  enforceMissionCap();
  return row;
}
const ownerKey = email => (email || "").toLowerCase().trim() || "_anon";
function userInflight(email) {
  const k = ownerKey(email);
  let n = 0;
  for (const e of inflight.values()) if (ownerKey(e) === k) n++;
  return n;
}
function startMission(m) {
  inflight.set(m.id, m.userEmail || null);
  const ac = new AbortController();
  controllers.set(m.id, ac);
  const timer = setTimeout(() => ac.abort(new Error("mission deadline exceeded")), MISSION_DEADLINE_MS);
  runMission(m, { signal: ac.signal }).catch(err => console.error(`[orchestrator] mission ${m.id} crashed:`, err?.message || err)).finally(() => {
    clearTimeout(timer);
    controllers.delete(m.id);
    inflight.delete(m.id);
    missionStore.save(m);
    if (missions.has(m.id)) touchMission(m);
    enforceMissionCap();
    pump();
  });
}
function pump() {
  for (let i = 0; i < queue.length && inflight.size < GLOBAL_MAX; i++) {
    const id = queue[i];
    const m = missions.get(id);
    if (!m) {
      queue.splice(i, 1);
      i--;
      continue;
    }
    if (userInflight(m.userEmail) >= PER_USER_MAX) continue;
    queue.splice(i, 1);
    i--;
    startMission(m);
  }
}
function enqueue(id, { priority = false } = {}) {
  if (inflight.has(id) || queue.includes(id)) return;
  if (priority) queue.unshift(id);else queue.push(id);
  pump();
}
const userOf = req => (req.get("x-user-email") || "").toLowerCase().trim() || null;
for (const m of await missionStore.loadBoot(100)) {
  if (!isTerminal(m)) {
    m.status = "failed";
    missionStore.save(m);
    briefingStore.add({
      id: `b_${m.id}`,
      missionId: m.id,
      kind: "failed",
      title: m.title,
      error: "orchestrator restarted while this mission was in progress",
      severity: "alert",
      auto: !!m.auto,
      userEmail: m.userEmail || null,
      at: Date.now()
    });
  }
  missions.set(m.id, m);
  setMissionOwner(m.id, m.userEmail);
}
enforceMissionCap();
if (missions.size) console.log(`[orchestrator] restored ${missions.size} recent missions from database (older history loads on demand)`);
const savedSquads = await configStore.loadAllSquads();
for (const { email, squad } of savedSquads) loadSquadInto(email, squad);
if (savedSquads.length) console.log(`[orchestrator] restored squad config for ${savedSquads.length} account(s)`);
const EVENT_TTL_DAYS = Math.max(1, Number(process.env.MISSION_EVENTS_TTL_DAYS || 30));
async function pruneEvents() {
  try {
    const n = await eventStore.prune(EVENT_TTL_DAYS);
    if (n > 0) console.log(`[orchestrator] pruned ${n} mission events older than ${EVENT_TTL_DAYS} days`);
  } catch {}
}
pruneEvents();
setInterval(pruneEvents, 86_400_000).unref();
process.on("unhandledRejection", err => console.error("[orchestrator] unhandled rejection (kept alive):", err?.message || err));
process.on("uncaughtException", err => console.error("[orchestrator] uncaught exception (kept alive):", err?.message || err));
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "orchestrator",
  activeMission: inflight.size ? [...inflight.keys()][0] : null,
  active: inflight.size,
  globalMax: GLOBAL_MAX,
  queued: queue.length
}));
app.get("/squad", internalAuth, (req, res) => res.json(getSquadFor(userOf(req))));
app.put("/squad", internalAuth, (req, res) => {
  const owner = userOf(req);
  const squad = setSquadFor(owner, req.body?.squad || req.body);
  configStore.saveSquad(owner, squad);
  res.json(squad);
});
app.post("/missions", internalAuth, (req, res) => {
  const title = (req.body?.title || "").trim();
  if (!title) return res.status(400).json({
    error: "title required"
  });
  if (isStatusTitle(title)) return res.status(400).json({
    error: "invalid mission title — looks like a status or error message, not a request"
  });
  const mission = createMission(title);
  mission.userEmail = userOf(req);
  mission.squad = buildSquad(req.body?.squad || null);
  mission.depth = req.body?.depth === "deep" ? "deep" : "quick";
  missions.set(mission.id, mission);
  setMissionOwner(mission.id, mission.userEmail);
  missionStore.save(mission);
  enqueue(mission.id, { priority: true });
  res.status(201).json({
    id: mission.id,
    title: mission.title,
    language: mission.language,
    status: inflight.has(mission.id) ? "running" : "queued",
    queued: queue.length
  });
});
app.post("/missions/:id/clarify", internalAuth, async (req, res) => {
  const m = await getMission(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  if (m.status !== "clarifying") return res.status(409).json({
    error: "mission is not waiting for clarification"
  });
  const answer = String(req.body?.answer || "").trim();
  if (!answer) return res.status(400).json({
    error: "answer required"
  });
  m.clarifyAnswer = answer;
  m.status = "planning";
  emit(m.id, "mission.clarified", {
    answer
  });
  enqueue(m.id, { priority: true });
  res.json({
    ok: true,
    status: m.status
  });
});
app.post("/missions/:id/steer", internalAuth, async (req, res) => {
  const m = await getMission(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  if (m.status !== "meeting") return res.status(409).json({
    error: "no live debate to steer"
  });
  const text = String(req.body?.text || "").trim().slice(0, 240);
  if (!text) return res.status(400).json({
    error: "text required"
  });
  if (!m.steers) m.steers = [];
  m.steers.push({
    text,
    at: Date.now()
  });
  emit(m.id, "steer.applied", {
    text
  });
  res.json({
    ok: true,
    count: m.steers.length
  });
});
const CLARIFY_TTL_MS = Math.max(300_000, Number(process.env.CLARIFY_TTL_MS || 1_800_000));
setInterval(() => {
  const now = Date.now();
  for (const m of missions.values()) {
    if (m.status === "clarifying" && m.clarifyRequestedAt && now - m.clarifyRequestedAt > CLARIFY_TTL_MS) {
      m.status = "cancelled";
      emit(m.id, "mission.cancelled", {});
      missionStore.save(m);
      briefingStore.add({ id: `b_${m.id}`, missionId: m.id, kind: "cancelled", title: `Expired — no answer: ${m.title}`, severity: "info", auto: !!m.auto, userEmail: m.userEmail || null, at: now });
    }
  }
  enforceMissionCap();
}, 300_000).unref();
app.post("/missions/:id/cancel", internalAuth, async (req, res) => {
  const m = await getMission(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  if (m.status === "done" || m.status === "failed" || m.status === "cancelled") return res.json({
    ok: true,
    already: true
  });
  m.cancelRequested = true;
  const qi = queue.indexOf(m.id);
  if (qi >= 0) queue.splice(qi, 1);
  const ac = controllers.get(m.id);
  if (ac) {
    ac.abort(new Error("cancelled by user"));
  } else {
    m.status = "cancelled";
    emit(m.id, "mission.cancelled", {});
    missionStore.save(m);
    enforceMissionCap();
  }
  res.json({
    ok: true
  });
});
app.post("/missions/:id/bus", internalAuth, async (req, res) => {
  const m = await getMission(req.params.id);
  if (!m) return res.status(404).json({ error: "mission not found" });
  const reqUser = userOf(req);
  if ((m.userEmail || null) !== (reqUser || null)) return res.status(403).json({ error: "forbidden" });
  const kind = String(req.body?.kind || "");
  const from = String(req.body?.from || "").trim() || "?";
  const squadIds = new Set((Array.isArray(m.squad) ? m.squad : []).map(a => a.id));
  if (kind === "approval") {
    const tool = String(req.body?.tool || "action");
    const summary = String(req.body?.summary || "").slice(0, 200);
    const approvalId = `ap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    emit(m.id, "approval.request", { agentId: from, tool, summary, approvalId });
    const decision = await new Promise(resolve => {
      const timer = setTimeout(() => {
        pendingApprovals.delete(approvalId);
        emit(m.id, "approval.resolved", { approvalId, decision: "deny", reason: "timeout" });
        resolve("deny");
      }, APPROVAL_WAIT_MS);
      pendingApprovals.set(approvalId, { missionId: m.id, resolve: d => { clearTimeout(timer); pendingApprovals.delete(approvalId); resolve(d); } });
    });
    return res.json({ allowed: decision === "allow", decision });
  }
  if (kind === "board_read") {
    const openTasks = (m.board || []).filter(t => t.status === "open").map(t => ({ id: t.id, title: t.title, detail: t.detail, by: t.by }));
    const recentMessages = (m.mailbox || []).slice(-5).map(x => ({ from: x.from, to: x.to, body: x.body }));
    return res.json({ openTasks, recentMessages });
  }
  if (kind === "ask") {
    if (!INTERAGENT_SYNC) return res.json({ error: "synchronous ask is disabled — share findings with send_message instead" });
    const to = String(req.body?.to || "").trim();
    const question = String(req.body?.question || "").trim().slice(0, 400);
    if (!to || !question) return res.json({ error: "to and question are required" });
    if (squadIds.size && !squadIds.has(to)) return res.json({ error: `unknown teammate "${to}" — reachable ids: ${[...squadIds].join(", ")}` });
    if (to === from) return res.json({ error: "cannot ask yourself" });
    m.askLog = m.askLog || [];
    if (m._askInFlight) return res.json({ error: "another ask is in progress — conclude with what you have" });
    if (m.askLog.filter(a => a.from === from).length >= 2) return res.json({ error: "ask limit reached (2 per agent) — conclude with what you have" });
    if (m.askLog.length >= 6) return res.json({ error: "team ask budget reached — conclude" });
    m._askInFlight = true;
    m.askLog.push({ from, to, ts: Date.now() });
    emit(m.id, "agent.ask", { agentId: from, to, question });
    try {
      const target = (Array.isArray(m.squad) ? m.squad : []).find(a => a.id === to) || {};
      const reply = await callRuntime("/reply", { missionId: m.id, agent: target, fromName: from, missionTitle: m.title, question, language: m.language }, m.userEmail);
      const answer = String(reply?.answer || "").slice(0, 600) || "(no answer)";
      emit(m.id, "agent.reply", { agentId: to, to: from, answer });
      return res.json({ answer });
    } catch (e) {
      emit(m.id, "agent.reply", { agentId: to, to: from, answer: "(could not answer)" });
      return res.json({ error: `peer did not answer: ${String(e.message || e).slice(0, 80)}` });
    } finally {
      m._askInFlight = false;
      missionStore.save(m);
    }
  }
  if (kind === "message") {
    const to = String(req.body?.to || "").trim();
    const body = String(req.body?.body || "").trim().slice(0, 600);
    if (!to || !body) return res.json({ error: "to and body are required" });
    if (squadIds.size && !squadIds.has(to)) return res.json({ error: `unknown teammate "${to}" — reachable ids: ${[...squadIds].join(", ")}` });
    if (to === from) return res.json({ error: "cannot message yourself" });
    const msg = { id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, from, to, body, ts: Date.now(), read: false };
    m.mailbox = m.mailbox || [];
    m.mailbox.push(msg);
    if (m.mailbox.length > 200) m.mailbox = m.mailbox.slice(-200);
    emit(m.id, "agent.message", { agentId: from, to, body });
    missionStore.save(m);
    return res.json({ delivered: true, to });
  }
  if (kind === "task") {
    const title = String(req.body?.title || "").trim().slice(0, 160);
    const detail = String(req.body?.detail || "").trim().slice(0, 600);
    if (!title) return res.json({ error: "title is required" });
    const task = { id: `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, by: from, title, detail, status: "open", claimedBy: null, ts: Date.now() };
    m.board = m.board || [];
    m.board.push(task);
    if (m.board.length > 100) m.board = m.board.slice(-100);
    emit(m.id, "task.posted", { agentId: from, taskId: task.id, title });
    missionStore.save(m);
    return res.json({ posted: true, taskId: task.id });
  }
  if (kind === "claim") {
    const taskId = String(req.body?.taskId || "");
    const task = (m.board || []).find(t => t.id === taskId);
    if (!task) return res.json({ error: "task not found" });
    if (task.status !== "open") return res.json({ error: `task already ${task.status}${task.claimedBy ? ` by ${task.claimedBy}` : ""}` });
    task.status = "claimed";
    task.claimedBy = from;
    emit(m.id, "task.claimed", { agentId: from, taskId, title: task.title });
    missionStore.save(m);
    return res.json({ claimed: true, taskId, title: task.title, detail: task.detail });
  }
  if (kind === "complete") {
    const taskId = String(req.body?.taskId || "");
    const result = String(req.body?.result || "").trim().slice(0, 600);
    const task = (m.board || []).find(t => t.id === taskId);
    if (!task) return res.json({ error: "task not found" });
    task.status = "done";
    task.result = result;
    task.doneBy = from;
    emit(m.id, "task.completed", { agentId: from, taskId, title: task.title });
    missionStore.save(m);
    return res.json({ completed: true, taskId });
  }
  return res.json({ error: `unknown bus kind "${kind}"` });
});
app.post("/missions/:id/approve", internalAuth, async (req, res) => {
  const m = await getMission(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({ error: "not found" });
  const approvalId = String(req.body?.approvalId || "");
  const decision = req.body?.decision === "allow" ? "allow" : "deny";
  const p = pendingApprovals.get(approvalId);
  if (!p) return res.json({ ok: false, error: "no pending approval with that id (it may have timed out)" });
  emit(m.id, "approval.resolved", { approvalId, decision });
  p.resolve(decision);
  res.json({ ok: true, decision });
});
const missionListShape = m => ({
  id: m.id,
  title: m.title,
  status: m.status,
  createdAt: m.createdAt,
  decision: m.decision || m.meeting?.decision || null,
  recommendation: m.report?.recommendation || null,
  confidence: m.report?.confidence ?? null
});
app.get("/missions", internalAuth, async (req, res) => {
  const u = userOf(req);
  const rows = missionStore.available() ? await missionStore.listForUser(u, 100) : null;
  if (rows) {
    const byId = new Map(rows.map(r => [r.id, r]));
    for (const m of missions.values()) if (m.userEmail === u) byId.set(m.id, missionListShape(m));
    return res.json([...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 100));
  }
  res.json([...missions.values()].filter(m => m.userEmail === u).sort((a, b) => b.createdAt - a.createdAt).map(missionListShape));
});
app.get("/missions/briefings", internalAuth, async (req, res) => {
  const list = await briefingStore.list(userOf(req), 40);
  res.json({
    briefings: list,
    unread: list.filter(b => !b.read).length
  });
});
app.post("/missions/briefings/read", internalAuth, async (req, res) => {
  await briefingStore.markRead(req.body?.id || null, userOf(req));
  res.json({ ok: true });
});
app.get("/calibration/stats", internalAuth, async (req, res) => {
  const rows = await calibrationStore.list(userOf(req));
  const tally = key => {
    const map = new Map();
    for (const r of rows) {
      const k = r[key] || "—";
      const g = map.get(k) || { name: k, n: 0, right: 0, missed: 0, sumPred: 0, predN: 0 };
      g.n++;
      if (r.predictedConfidence != null) {
        g.sumPred += r.predictedConfidence;
        g.predN++;
      }
      if (r.outcome === "right") g.right++;else if (r.outcome === "missed") g.missed++;
      map.set(k, g);
    }
    return [...map.values()].map(g => ({
      name: g.name,
      n: g.n,
      decided: g.right + g.missed,
      hitRate: g.right + g.missed >= 1 ? Math.round(100 * g.right / (g.right + g.missed)) : null,
      avgPredicted: g.predN ? Math.round(g.sumPred / g.predN) : null
    })).sort((a, b) => b.n - a.n);
  };
  res.json({
    total: rows.length,
    withOutcome: rows.filter(r => r.outcome === "right" || r.outcome === "missed").length,
    byAgent: tally("agentId"),
    byLens: tally("lens"),
    byModel: tally("model"),
    byTopic: tally("topic")
  });
});
app.post("/missions/:id/outcome", internalAuth, async (req, res) => {
  const u = userOf(req);
  const m = await getMission(req.params.id);
  if (!m || m.userEmail !== u) return res.status(404).json({
    error: "not found"
  });
  const value = String(req.body?.value || "").toLowerCase();
  if (!["right", "missed", "surprising", "untested"].includes(value)) return res.status(400).json({
    error: "invalid outcome"
  });
  m.outcome = value;
  missionStore.setField(m.id, "outcome", value);
  await calibrationStore.setOutcome(m.id, u, value);
  res.json({ ok: true, outcome: value });
});
app.get("/missions/:id", internalAuth, async (req, res) => {
  const m = await getMission(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  res.json(m);
});
app.get("/missions/:id/events", internalAuth, async (req, res) => {
  const m = await getMission(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  res.json(await timeline(req.params.id));
});
const STANDING_MAX = 12;
const clampMinutes = v => Math.max(5, Math.min(43200, Number(v) || 1440));
app.get("/standing", internalAuth, async (req, res) => {
  const u = userOf(req);
  res.json((await standingStore.list()).filter(s => s.userEmail === u));
});
app.post("/standing", internalAuth, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title || isStatusTitle(title)) return res.status(400).json({
    error: "valid title required"
  });
  const u = userOf(req);
  const list = (await standingStore.list()).filter(s => s.userEmail === u);
  if (list.length >= STANDING_MAX) return res.status(400).json({
    error: `max ${STANDING_MAX} standing missions`
  });
  const s = {
    id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    schedule: { everyMinutes: clampMinutes(req.body?.everyMinutes) },
    enabled: true,
    lastRunAt: 0,
    userEmail: u,
    createdAt: Date.now()
  };
  await standingStore.save(s);
  res.status(201).json(s);
});
app.patch("/standing/:id", internalAuth, async (req, res) => {
  const list = await standingStore.list();
  const s = list.find(x => x.id === req.params.id);
  if (!s || s.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  const fields = {};
  if (typeof req.body?.enabled === "boolean") {
    s.enabled = req.body.enabled;
    fields.enabled = s.enabled;
  }
  if (req.body?.everyMinutes) {
    s.schedule = { everyMinutes: clampMinutes(req.body.everyMinutes) };
    fields.schedule = s.schedule;
  }
  await standingStore.patchFields(s.id, fields);
  res.json(s);
});
app.delete("/standing/:id", internalAuth, async (req, res) => {
  const s = (await standingStore.list()).find(x => x.id === req.params.id);
  if (!s || s.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  await standingStore.remove(req.params.id);
  res.json({ ok: true });
});
const SCHED_MS = 60_000;
setInterval(async () => {
  try {
    if (inflight.size >= GLOBAL_MAX) return;
    const list = await standingStore.list();
    if (!list.length) return;
    const now = Date.now();
    const due = list.find(s => s.enabled && s.title && now - (s.lastRunAt || 0) >= (s.schedule?.everyMinutes || 1440) * 60_000 && userInflight(s.userEmail) < PER_USER_MAX);
    if (!due) return;
    const mission = createMission(due.title);
    mission.auto = true;
    mission.standingId = due.id;
    mission.userEmail = due.userEmail || null;
    mission.squad = getSquadFor(due.userEmail);
    missions.set(mission.id, mission);
    setMissionOwner(mission.id, mission.userEmail);
    missionStore.save(mission);
    due.lastRunAt = now;
    await standingStore.patchFields(due.id, { lastRunAt: now });
    console.log(`[orchestrator] standing mission due → "${due.title}" (auto, headless)`);
    enqueue(mission.id);
  } catch (err) {
    console.warn(`[orchestrator] scheduler tick failed (${err.message})`);
  }
}, SCHED_MS);
const mb = v => Math.round(v / 1048576);
console.log(`[orchestrator] boot rss=${mb(process.memoryUsage().rss)}MB`);
setInterval(() => {
  const mu = process.memoryUsage();
  if (mb(mu.rss) > 700) console.log(`[orchestrator] rss=${mb(mu.rss)}MB heapUsed=${mb(mu.heapUsed)}MB`);
}, 300_000).unref();
const server = http.createServer(app);
attach(server);
server.listen(PORT, () => console.log(`[orchestrator] listening on :${PORT}`));
