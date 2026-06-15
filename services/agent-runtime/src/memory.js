import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recallLessons, writeLesson, memoryConfigured, actorKey } from "./agentbaseMemory.js";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "agentbase");
fs.mkdirSync(DIR, { recursive: true });

const STM_CAP = 30;
const LTM_CAP = 30;
const NOTE_CHARS = {
  data: 800,
  conclusion: 360
};
const stm = new Map();

const ltmPath = key => path.join(DIR, `${key.replace(/[^\w-]/g, "_")}.json`);

export function loadLongTerm(agentId, userEmail = null) {
  try {
    return JSON.parse(fs.readFileSync(ltmPath(actorKey(userEmail, agentId)), "utf8"));
  } catch {
    return { agentId, missions: 0, lessons: [] };
  }
}

function saveLongTerm(m, userEmail = null) {
  try {
    fs.writeFileSync(ltmPath(actorKey(userEmail, m.agentId)), JSON.stringify(m, null, 2));
  } catch (e) {
    console.warn(`[agent-runtime] local memory save failed for ${m.agentId}: ${e.message}`);
  }
}

export function remember(missionId, agentId, kind, text) {
  if (!missionId || !agentId || !text) return;
  if (!stm.has(missionId)) {
    stm.set(missionId, new Map());
    if (stm.size > 20) stm.delete(stm.keys().next().value);
  }
  const byAgent = stm.get(missionId);
  if (!byAgent.has(agentId)) byAgent.set(agentId, []);
  const list = byAgent.get(agentId);
  list.push({ t: Date.now(), kind, text: String(text).slice(0, NOTE_CHARS[kind] || 300) });
  if (list.length > STM_CAP) list.shift();
}

export function shortTerm(missionId, agentId) {
  return stm.get(missionId)?.get(agentId) || [];
}

const NOTE_PRIORITY = { conclusion: 0, verify: 0, data: 1, tool: 2, debate: 2 };

function localLessons(agentId, userEmail) {
  const ltm = loadLongTerm(agentId, userEmail);
  return ltm.lessons.slice(-3).map(l => `- ${l.simulated ? (l.text.startsWith("Nhiệm vụ") ? "(dữ liệu offline, tham khảo yếu) " : "(synthetic, treat as weak) ") : ""}${l.text}`).join("\n");
}

export async function memoryContext(missionId, agentId, charBudget = 900, opts = {}) {
  const { userEmail, query } = opts;
  let lessons = "";
  let lessonsSource = "local";
  if (memoryConfigured()) {
    const recalled = await recallLessons({ userEmail, agentId, query, limit: 4 });
    if (recalled && recalled.length) {
      lessons = recalled.map(t => `- ${t}`).join("\n");
      lessonsSource = "agentbase";
    }
  }
  if (!lessons) lessons = localLessons(agentId, userEmail);
  const notes = shortTerm(missionId, agentId);
  const ranked = [...notes].reverse();
  ranked.sort((a, b) => (NOTE_PRIORITY[a.kind] ?? 3) - (NOTE_PRIORITY[b.kind] ?? 3));
  const picked = [];
  let used = 0;
  for (const n of ranked) {
    const line = `- (${n.kind}) ${n.text}`;
    if (used + line.length > charBudget) continue;
    used += line.length;
    picked.push(n);
  }
  picked.sort((a, b) => a.t - b.t);
  let out = "";
  if (lessons) out += `Long-term memory — lessons from past missions${lessonsSource === "agentbase" ? " (AgentBase, semantically recalled for this task)" : ""}:\n${lessons}\n`;
  if (picked.length) out += `Short-term memory — working notes for this mission (data you already gathered):\n${picked.map(n => `- (${n.kind}) ${n.text}`).join("\n")}\n`;
  return out;
}

export async function consolidate(missionId, outcomes = [], userEmail = null) {
  let pushed = 0;
  for (const o of outcomes) {
    if (!o.agentId || !o.lesson) continue;
    const ltm = loadLongTerm(o.agentId, userEmail);
    ltm.missions += 1;
    const key = String(o.title || "").trim().toLowerCase();
    if (key) ltm.lessons = ltm.lessons.filter(l => String(l.title || "").trim().toLowerCase() !== key);
    ltm.lessons.push({ t: Date.now(), simulated: !!o.simulated, title: o.title || null, text: String(o.lesson).slice(0, 300) });
    if (ltm.lessons.length > LTM_CAP) ltm.lessons.splice(0, ltm.lessons.length - LTM_CAP);
    saveLongTerm(ltm, userEmail);
    if (memoryConfigured() && !o.simulated) {
      const res = await writeLesson({
        userEmail,
        agentId: o.agentId,
        missionId,
        missionTitle: o.title,
        role: o.role,
        lesson: o.lesson,
        stance: o.stance,
        confidence: o.confidence,
        summary: o.summary,
        keyPoints: o.keyPoints
      });
      if (res?.ok) pushed += 1;
    }
  }
  stm.delete(missionId);
  return { ok: true, consolidated: outcomes.length, agentbase: pushed };
}
