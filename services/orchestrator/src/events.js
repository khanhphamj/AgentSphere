import { WebSocketServer } from "ws";
import { eventStore } from "./db.js";
const buffers = new Map();
const owners = new Map();
let wss = null;
let seq = 0;
export function setMissionOwner(missionId, userEmail) {
  if (missionId) owners.set(missionId, (userEmail || "").toLowerCase().trim() || null);
}
export function attach(server) {
  wss = new WebSocketServer({
    server,
    path: "/events"
  });
  wss.on("connection", async (ws, req) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("error", () => {});
    const url = new URL(req.url, "http://x");
    const missionId = url.searchParams.get("missionId");
    ws.userEmail = (req.headers["x-user-email"] || "").toString().toLowerCase().trim() || null;
    if (missionId && ws.userEmail) {
      const owner = owners.get(missionId);
      if (owner && owner === ws.userEmail) {
        const persisted = await eventStore.list(missionId);
        const replay = persisted.length ? persisted : buffers.get(missionId) || [];
        for (const ev of replay) {
          if (ws.readyState === 1) ws.send(JSON.stringify(ev));
        }
      }
    }
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {}
    }
  }, 30_000);
  wss.on("close", () => clearInterval(heartbeat));
}
export function emit(missionId, type, payload = {}) {
  const ev = {
    seq: ++seq,
    t: Date.now(),
    missionId,
    type,
    payload
  };
  if (!buffers.has(missionId)) buffers.set(missionId, []);
  buffers.get(missionId).push(ev);
  if (buffers.size > 30) buffers.delete(buffers.keys().next().value);
  eventStore.add(ev);
  if (wss) {
    const data = JSON.stringify(ev);
    const owner = owners.get(missionId);
    for (const client of wss.clients) {
      if (client.readyState !== 1) continue;
      if (!owner || !client.userEmail || owner !== client.userEmail) continue;
      client.send(data);
    }
  }
  console.log(`[orchestrator] ${type}${payload.agentId ? ` · ${payload.agentId}` : ""}`);
  return ev;
}
export async function timeline(missionId) {
  const persisted = await eventStore.list(missionId);
  return persisted.length ? persisted : buffers.get(missionId) || [];
}
