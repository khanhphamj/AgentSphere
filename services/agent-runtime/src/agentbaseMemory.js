import { createHash } from "node:crypto";

const IAM_TOKEN_URL = (process.env.IAM_TOKEN_URL || "https://iam.api.vngcloud.vn/accounts-api/v2/auth/token").replace(/\/$/, "");
const MEMORY_BASE_URL = (process.env.MEMORY_BASE_URL || "https://agentbase.api.vngcloud.vn/memory").replace(/\/$/, "");
const CLIENT_ID = process.env.GREENNODE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GREENNODE_CLIENT_SECRET || "";
const MEMORY_ID = process.env.MEMORY_ID || "";
const STRATEGY_ID = process.env.MEMORY_STRATEGY_ID || "";
const SWITCH = (process.env.AGENTBASE_MEMORY || "auto").toLowerCase();

export const memoryEnabled = () => SWITCH !== "off" && !!(CLIENT_ID && CLIENT_SECRET);
export const memoryConfigured = () => memoryEnabled() && !!MEMORY_ID;

let tokenCache = { token: "", exp: 0 };
let warned = { token: false, recall: false, write: false };
const warnOnce = (k, msg) => { if (!warned[k]) { warned[k] = true; console.warn(`[agentbase-memory] ${msg}`); } };

function jwtExp(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Number(payload.exp) || 0;
  } catch {
    return 0;
  }
}
const pickToken = obj => obj && (obj.access_token || obj.accessToken || obj.token || obj.data?.access_token || obj.data?.accessToken || obj.data?.token || "");

async function fetchToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  let res;
  try {
    res = await fetch(IAM_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${basic}` },
      body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
      signal: AbortSignal.timeout(8000)
    });
  } catch (e) {
    throw new Error(`IAM token exchange failed (${e.message})`);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`IAM token exchange failed (${res.status}: ${text.slice(0, 160)})`);
  let json = null;
  try { json = JSON.parse(text); } catch { throw new Error("IAM token exchange failed (response not JSON)"); }
  const token = pickToken(json);
  if (!token) throw new Error("IAM token exchange failed (access_token not found in response)");
  return token;
}

let tokenBreakerUntil = 0;
const TOKEN_BREAKER_MS = 30_000;

async function getToken(force = false) {
  const now = Math.floor(Date.now() / 1000);
  if (!force && tokenCache.token && tokenCache.exp - 60 > now) return tokenCache.token;
  if (!force && Date.now() < tokenBreakerUntil) throw new Error("IAM token breaker open (recent failure)");
  try {
    const token = await fetchToken();
    const exp = jwtExp(token) || now + 1800;
    tokenCache = { token, exp };
    tokenBreakerUntil = 0;
    return token;
  } catch (e) {
    tokenBreakerUntil = Date.now() + TOKEN_BREAKER_MS;
    throw e;
  }
}

export const iamCredsPresent = () => !!(CLIENT_ID && CLIENT_SECRET);
export const getIamToken = getToken;

async function api(method, path, { body, query, timeout = 8000 } = {}) {
  if (!memoryEnabled()) throw new Error("agentbase memory not enabled (missing IAM credentials)");
  let url = `${MEMORY_BASE_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== "")).toString();
    if (qs) url += `?${qs}`;
  }
  const send = async token => fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeout)
  });
  let res = await send(await getToken());
  if (res.status === 401) res = await send(await getToken(true));
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

const sanitize = s => String(s || "").toLowerCase().replace(/[^a-z0-9._]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "x";
const acctHash = email => createHash("sha256").update(String(email || "").toLowerCase().trim()).digest("hex").slice(0, 16);
export const actorKey = (userEmail, agentId) => `acct-${userEmail ? acctHash(userEmail) : "shared"}--${sanitize(agentId)}`;
const namespaceOf = actor => `/strategies/${STRATEGY_ID}/actors/${actor}`;

const recordText = r => (typeof r === "string" ? r : (r?.memory || r?.content || r?.text || r?.fact || "")).trim();

export async function recallLessons({ userEmail, agentId, query, limit = 5 }) {
  if (!memoryConfigured() || !STRATEGY_ID) return null;
  try {
    const actor = actorKey(userEmail, agentId);
    const out = await api("POST", `/memories/${MEMORY_ID}/memory-records:search`, {
      query: { namespace: namespaceOf(actor) },
      body: { query: String(query || "").slice(0, 400) || agentId, limit: Math.max(5, Math.min(limit, 50)) },
      timeout: 6000
    });
    const list = Array.isArray(out) ? out : (out?.listData || out?.records || out?.data || out?.results || []);
    const texts = list.map(recordText).filter(Boolean);
    return texts.slice(0, limit);
  } catch (e) {
    warnOnce("recall", `recall fell back to local (${e.message})`);
    return null;
  }
}

export async function writeLesson({ userEmail, agentId, missionId, missionTitle, role, lesson, stance, confidence, summary, keyPoints }) {
  if (!memoryConfigured()) return { ok: false, skipped: "not configured" };
  const actor = actorKey(userEmail, agentId);
  const sessionId = sanitize(missionId) || "m";
  const base = `/memories/${MEMORY_ID}/actors/${encodeURIComponent(actor)}/sessions/${encodeURIComponent(sessionId)}/events`;
  const userMsg = `Mission "${String(missionTitle || "").slice(0, 200)}". You are the ${role || agentId} specialist.`;
  const points = Array.isArray(keyPoints) && keyPoints.length ? `\nKey points: ${keyPoints.slice(0, 4).map(p => String(p).slice(0, 160)).join("; ")}` : "";
  const meta = [stance ? `stance=${stance}` : "", confidence != null ? `confidence=${confidence}%` : ""].filter(Boolean).join(", ");
  const assistantMsg = `${lesson || ""}${summary ? `\nWhat I found: ${String(summary).slice(0, 400)}` : ""}${points}${meta ? `\n(${meta})` : ""}`.trim();
  try {
    await api("POST", base, { body: { payload: { type: "conversational", role: "user", message: userMsg.slice(0, 4000) } } });
    await api("POST", base, { body: { payload: { type: "conversational", role: "assistant", message: assistantMsg.slice(0, 8000) } } });
    if (STRATEGY_ID) {
      try {
        await api("POST", `/memories/${MEMORY_ID}/memory-records:generate-from-session`, {
          query: { actorId: actor, sessionId, longTermMemoryStrategyId: STRATEGY_ID }
        });
      } catch (e) {
        warnOnce("gen", `generate-from-session failed, relying on auto-generation (${e.message})`);
      }
    }
    return { ok: true };
  } catch (e) {
    warnOnce("write", `event write failed, kept local mirror (${e.message})`);
    return { ok: false, error: e.message };
  }
}

export async function health() {
  const status = { enabled: memoryEnabled(), configured: memoryConfigured(), memoryId: MEMORY_ID || null, strategyId: STRATEGY_ID || null, base: MEMORY_BASE_URL };
  if (!memoryEnabled()) return { ...status, ok: false, reason: "no IAM credentials — set GREENNODE_CLIENT_ID and GREENNODE_CLIENT_SECRET (GreenNode IAM service account)" };
  try { await getToken(true); status.token = "ok"; } catch (e) { return { ...status, ok: false, reason: `token: ${e.message}` }; }
  if (!MEMORY_ID) return { ...status, ok: false, reason: "MEMORY_ID not set — run `npm run memory:provision`" };
  try {
    const mem = await api("GET", `/memories/${MEMORY_ID}`);
    return { ...status, ok: true, memoryName: mem?.name || mem?.data?.name || null };
  } catch (e) {
    return { ...status, ok: false, reason: `memory get: ${e.message}` };
  }
}

export const CUSTOM_FACT_PROMPT = `You are distilling durable, reusable lessons for an AI agent specialist on a multi-agent decision squad. From the conversation, extract concise long-term memory records that help THIS agent on FUTURE, similar missions. Capture: (1) which approach or evidence worked and produced a well-supported, confident conclusion; (2) what failed, was flagged as unsupported, or led to low confidence, and why; (3) the squad's final decision and any conditions attached; (4) reusable heuristics phrased as "for missions about X, do Y". Each record must be a single self-contained, generalizable sentence. Do NOT store ephemeral one-off numbers or dates unless they are a durable fact. Ignore greetings, process chatter, and anything not useful as future guidance.`;

export async function provisionMemory({ name = "agentsphere-ltm", description = "AgentSphere agent long-term mission lessons", expiryDays = 30, strategyName = "agent-mission-lessons" } = {}) {
  if (!memoryEnabled()) throw new Error("no IAM credentials in env — set GREENNODE_CLIENT_ID and GREENNODE_CLIENT_SECRET (GreenNode IAM service account)");
  const body = {
    name,
    description,
    eventExpiryDuration: expiryDays,
    longTermMemoryStrategies: [{
      name: strategyName,
      type: "CUSTOM",
      namespaceTemplate: "/strategies/{memoryStrategyId}/actors/{actorId}",
      enableAutomaticMemoryRecordGeneration: true,
      customFactExtractionPrompt: CUSTOM_FACT_PROMPT
    }]
  };
  const created = await api("POST", "/memories", { body, timeout: 20000 });
  const memoryId = created?.id || created?.data?.id || created?.memoryId;
  if (!memoryId) throw new Error(`create returned no id: ${JSON.stringify(created).slice(0, 200)}`);
  let strategyId = created?.longTermMemoryStrategies?.[0]?.id || created?.data?.longTermMemoryStrategies?.[0]?.id || null;
  if (!strategyId) {
    const strategies = await api("GET", `/memories/${memoryId}/long-term-memory-strategies`);
    const list = Array.isArray(strategies) ? strategies : (strategies?.listData || strategies?.data || []);
    strategyId = list[0]?.id || null;
  }
  return { memoryId, strategyId, raw: created };
}
