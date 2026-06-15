import express from "express";
import cors from "cors";
import http from "node:http";
import { attach, timeline, emit, setMissionOwner } from "./events.js";
import { createMission, runMission, isStatusTitle } from "./pipeline.js";
import { getSquad, setSquad } from "./squad.js";
import { missionStore, briefingStore, configStore, standingStore } from "./db.js";
const PORT = Number(process.env.ORCHESTRATOR_PORT || 8081);
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
function internalAuth(req, res, next) {
  if (!CLIENT_ID) return next();
  if (req.get("x-client-id") === CLIENT_ID && req.get("x-client-secret") === CLIENT_SECRET) return next();
  res.status(401).json({
    error: "invalid client credentials"
  });
}
const missions = new Map();
const queue = [];
let running = null;
function pump() {
  if (running || !queue.length) return;
  const id = queue.shift();
  const m = missions.get(id);
  if (!m) return pump();
  running = id;
  runMission(m).catch(err => console.error(`[orchestrator] mission ${id} crashed:`, err?.message || err)).finally(() => {
    missionStore.save(m);
    running = null;
    pump();
  });
}
function enqueue(id, { priority = false } = {}) {
  if (running === id || queue.includes(id)) return;
  if (priority) queue.unshift(id);else queue.push(id);
  pump();
}
const userOf = req => (req.get("x-user-email") || "").toLowerCase().trim() || null;
for (const m of await missionStore.loadAll()) {
  if (m.status !== "done" && m.status !== "failed") m.status = "failed";
  missions.set(m.id, m);
  setMissionOwner(m.id, m.userEmail);
}
if (missions.size) console.log(`[orchestrator] restored ${missions.size} missions from database`);
const savedSquad = await configStore.loadSquad();
if (Array.isArray(savedSquad)) {
  setSquad(savedSquad);
  console.log("[orchestrator] restored squad config (mandates) from database");
}
process.on("unhandledRejection", err => console.error("[orchestrator] unhandled rejection (kept alive):", err?.message || err));
process.on("uncaughtException", err => console.error("[orchestrator] uncaught exception (kept alive):", err?.message || err));
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "orchestrator",
  activeMission: running,
  queued: queue.length
}));
app.get("/squad", internalAuth, (_req, res) => res.json(getSquad()));
app.put("/squad", internalAuth, (req, res) => {
  const squad = setSquad(req.body?.squad || req.body);
  configStore.saveSquad(squad);
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
  missions.set(mission.id, mission);
  setMissionOwner(mission.id, mission.userEmail);
  missionStore.save(mission);
  enqueue(mission.id, { priority: true });
  res.status(201).json({
    id: mission.id,
    title: mission.title,
    language: mission.language,
    status: running === mission.id ? "running" : "queued",
    queued: queue.length
  });
});
app.post("/missions/:id/clarify", internalAuth, (req, res) => {
  const m = missions.get(req.params.id);
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
app.post("/missions/:id/steer", internalAuth, (req, res) => {
  const m = missions.get(req.params.id);
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
app.get("/missions", internalAuth, (req, res) => {
  const u = userOf(req);
  res.json([...missions.values()].filter(m => m.userEmail === u).sort((a, b) => b.createdAt - a.createdAt).map(m => ({
    id: m.id,
    title: m.title,
    status: m.status,
    createdAt: m.createdAt,
    decision: m.decision || m.meeting?.decision || null,
    recommendation: m.report?.recommendation || null,
    confidence: m.report?.confidence ?? null
  })));
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
app.get("/missions/:id", internalAuth, (req, res) => {
  const m = missions.get(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  res.json(m);
});
app.get("/missions/:id/events", internalAuth, (req, res) => {
  const m = missions.get(req.params.id);
  if (!m || m.userEmail !== userOf(req)) return res.status(404).json({
    error: "not found"
  });
  res.json(timeline(req.params.id));
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
  if (typeof req.body?.enabled === "boolean") s.enabled = req.body.enabled;
  if (req.body?.everyMinutes) s.schedule = { everyMinutes: clampMinutes(req.body.everyMinutes) };
  await standingStore.save(s);
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
    if (running || queue.length) return;
    const list = await standingStore.list();
    if (!list.length) return;
    const now = Date.now();
    const due = list.find(s => s.enabled && s.title && now - (s.lastRunAt || 0) >= (s.schedule?.everyMinutes || 1440) * 60_000);
    if (!due) return;
    const mission = createMission(due.title);
    mission.auto = true;
    mission.standingId = due.id;
    mission.userEmail = due.userEmail || null;
    missions.set(mission.id, mission);
    setMissionOwner(mission.id, mission.userEmail);
    missionStore.save(mission);
    due.lastRunAt = now;
    await standingStore.save(due);
    console.log(`[orchestrator] standing mission due → "${due.title}" (auto, headless)`);
    enqueue(mission.id);
  } catch (err) {
    console.warn(`[orchestrator] scheduler tick failed (${err.message})`);
  }
}, SCHED_MS);
const server = http.createServer(app);
attach(server);
server.listen(PORT, () => console.log(`[orchestrator] listening on :${PORT}`));
