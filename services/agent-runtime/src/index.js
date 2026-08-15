import express from "express";
import cors from "cors";
import { chat, extractJson, listModels, modelsMeta, SIM_FORCED, accountStore } from "./llm.js";
import { executeTool } from "./tools.js";
import { LEAD_PERSONA, WORKER_PERSONA, PERSONAS, planPrompt, leadAnswerPrompt, runPrompt, reflectPrompt, meetingPrompt, synthesizePrompt, verifyPrompt, scenariosPrompt, reportPrompt, simulate } from "./prompts.js";
import { planByCode, triageByCode, decideConsensus, assembleReport, buildSources, clampWords, synthesizeByCode, scenariosByCode } from "./harness.js";
import { budgetFor, clampMessages, clampRunOutput, clampTurnOutput, MODEL_LIMITS } from "./budget.js";
import { strategyFor } from "./capabilities.js";
import { loadLongTerm, shortTerm, memoryContext, remember, consolidate } from "./memory.js";
import { health as memoryHealth, memoryConfigured } from "./agentbaseMemory.js";
const PORT = Number(process.env.AGENT_RUNTIME_PORT || 8082);
const mb = v => Math.round(v / 1048576);
console.log(`[agent-runtime] boot rss=${mb(process.memoryUsage().rss)}MB`);
setInterval(() => {
  const mu = process.memoryUsage();
  if (mb(mu.rss) > 700) console.log(`[agent-runtime] rss=${mb(mu.rss)}MB heapUsed=${mb(mu.heapUsed)}MB`);
}, 300_000).unref();
const trimToolResult = r => {
  if (r == null || typeof r !== "object") return r;
  if (Array.isArray(r.results)) return {
    query: r.query,
    source: r.source,
    dropped: r.dropped,
    lowRelevance: r.lowRelevance,
    ...(r.requeried ? { requeried: true } : {}),
    ...(r.linksFollowed ? { linksFollowed: r.linksFollowed } : {}),
    ...(r.answer ? { answer: String(r.answer).slice(0, 600) } : {}),
    results: r.results.slice(0, 8).map(x => x && typeof x === "object" ? {
      title: typeof x.title === "string" ? x.title.slice(0, 140) : x.title,
      url: x.url,
      host: x.host,
      published: x.published,
      ...(x.via ? { via: x.via } : {}),
      snippet: typeof x.snippet === "string" ? x.snippet.slice(0, 180) : x.snippet,
      ...(x.content ? { content: String(x.content).slice(0, 2200) } : {})
    } : x)
  };
  const out = {};
  for (const k of Object.keys(r)) {
    const v = r[k];
    if (v == null) continue;
    if (typeof v === "object") continue;
    out[k] = typeof v === "string" ? v.slice(0, 220) : v;
  }
  return out;
};
const evidenceText = (missionId, agentId) => shortTerm(missionId, agentId).filter(n => n.kind === "data").map(n => n.text).join("\n");
const normNum = s => String(s).replace(/[\s,$%]/g, "");
const STAT_PATTERNS = [
  /\d[\d.,]*\s*%/g,
  /(?:\$|usd|vnd)\s*\d[\d.,]*/gi,
  /\d[\d.,]*\s*(?:tỷ|tỉ|triệu|nghìn|billion|million|usd|vnd|đồng)/gi,
  /\b\d{3,}(?:[.,]\d+)?\b/g
];
const uncitedFigures = (output, evidence) => {
  const text = [output.summary, ...(output.keyPoints || [])].filter(Boolean).join("  ");
  const ev = normNum(evidence || "");
  const flags = [];
  const seen = new Set();
  for (const re of STAT_PATTERNS) {
    for (const tok of text.match(re) || []) {
      const digits = normNum(tok).replace(/[^\d]/g, "");
      if (digits.length < 2 || seen.has(digits)) continue;
      if (/^(19|20)\d\d$/.test(digits)) continue;
      seen.add(digits);
      if (!ev.includes(digits)) flags.push(tok.trim());
      if (flags.length >= 2) return flags;
    }
  }
  return flags;
};
const POLICY_URL = (process.env.MCP_POLICY_URL || "http://localhost:8083").replace(/\/$/, "");
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
if (process.env.NODE_ENV === "production" && (!CLIENT_ID || !CLIENT_SECRET)) {
  console.error("[agent-runtime] refusing to start in production without CLIENT_ID/CLIENT_SECRET");
  process.exit(1);
}
const INTERAGENT_BUS = process.env.INTERAGENT_BUS === "on";
const INTERAGENT_SYNC = process.env.INTERAGENT_SYNC === "on";
const INTERAGENT_SPAWN = process.env.INTERAGENT_SPAWN === "on";
const LOOP_MODE = process.env.LOOP_MODE === "on";
const HUMAN_APPROVAL = process.env.HUMAN_APPROVAL === "on";
const APPROVAL_TOOLS = new Set((process.env.APPROVAL_TOOLS || "spawn_agent,ask_peer").split(",").map(s => s.trim()).filter(Boolean));
const SPAWN_MAX_DEPTH = Math.max(1, Number(process.env.SPAWN_MAX_DEPTH || 1));
const SPAWN_MAX = Math.max(1, Number(process.env.SPAWN_MAX || 2));
const internalHeaders = {
  "content-type": "application/json",
  "x-client-id": CLIENT_ID,
  "x-client-secret": CLIENT_SECRET
};
const BUS_KIND = { send_message: "message", post_task: "task", ask_peer: "ask", "board.read": "board_read", claim_task: "claim", complete_task: "complete" };
async function busCall(bus, fromAgentId, tool, args) {
  const kind = BUS_KIND[tool] || null;
  if (!kind || !bus?.url) return { error: "team mailbox unavailable" };
  try {
    const res = await fetch(bus.url, {
      method: "POST",
      headers: bus.userEmail ? { ...internalHeaders, "x-user-email": bus.userEmail } : internalHeaders,
      body: JSON.stringify({ from: fromAgentId, kind, ...args }),
      signal: AbortSignal.timeout(kind === "ask" ? 180000 : 8000)
    });
    if (!res.ok) return { error: `mailbox ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: `mailbox unreachable: ${String(e.message || e).slice(0, 80)}` };
  }
}
async function requestApproval(bus, agentId, tool, args) {
  if (!bus?.url) return { allowed: true };
  const summary = `${tool} ${JSON.stringify(args || {}).slice(0, 140)}`;
  try {
    const res = await fetch(bus.url, {
      method: "POST",
      headers: bus.userEmail ? { ...internalHeaders, "x-user-email": bus.userEmail } : internalHeaders,
      body: JSON.stringify({ from: agentId, kind: "approval", tool, summary }),
      signal: AbortSignal.timeout(135000)
    });
    if (!res.ok) return { allowed: false, error: `approval ${res.status}` };
    return await res.json();
  } catch {
    return { allowed: false, error: "approval channel failed" };
  }
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
async function getGrants(role) {
  try {
    const res = await fetch(`${POLICY_URL}/grants/${role}`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`policy ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[agent-runtime] grants lookup failed for ${role}: ${e.message}`);
    return {
      role,
      policyGroup: null,
      servers: []
    };
  }
}
async function authorize(role, server, tool) {
  try {
    const res = await fetch(`${POLICY_URL}/authorize`, {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({
        role,
        server,
        tool
      }),
      signal: AbortSignal.timeout(5000)
    });
    return await res.json();
  } catch (e) {
    return {
      allowed: false,
      reason: `policy unreachable: ${e.message}`
    };
  }
}
const encodeTool = (server, tool) => `${server}__${tool.replaceAll(".", "_")}`;
const decodeTool = (grants, name) => {
  for (const s of grants.servers) for (const t of s.tools) if (encodeTool(s.id, t.name) === name) return {
    server: s.id,
    tool: t.name
  };
  return null;
};
const MAILBOX_PARAMS = {
  send_message: {
    type: "object",
    properties: {
      to: { type: "string", description: "teammate id to message (e.g. nova, quill)" },
      body: { type: "string", description: "your message to them" }
    },
    required: ["to", "body"],
    additionalProperties: false
  },
  post_task: {
    type: "object",
    properties: {
      title: { type: "string", description: "short sub-task title" },
      detail: { type: "string", description: "what needs doing and why" }
    },
    required: ["title"],
    additionalProperties: false
  },
  ask_peer: {
    type: "object",
    properties: {
      to: { type: "string", description: "teammate id to ask (e.g. quill)" },
      question: { type: "string", description: "your short question for them" }
    },
    required: ["to", "question"],
    additionalProperties: false
  },
  "board.read": {
    type: "object",
    properties: {},
    additionalProperties: false
  },
  claim_task: {
    type: "object",
    properties: {
      taskId: { type: "string", description: "id of an open board task (from board.read)" }
    },
    required: ["taskId"],
    additionalProperties: false
  },
  complete_task: {
    type: "object",
    properties: {
      taskId: { type: "string", description: "id of the task you claimed" },
      result: { type: "string", description: "your result / answer for the task" }
    },
    required: ["taskId", "result"],
    additionalProperties: false
  },
  spawn_agent: {
    type: "object",
    properties: {
      focus: { type: "string", description: "the focused sub-task to delegate to a fresh helper agent" },
      lens: { type: "string", description: "optional angle hint (evidence / quantify / risk …)" }
    },
    required: ["focus"],
    additionalProperties: false
  }
};
function toolDefs(grants, busEnabled) {
  const defs = [];
  for (const s of grants.servers) {
    if (s.id === "mcp-mailbox" && !busEnabled) continue;
    for (const t of s.tools) {
      if (s.id === "mcp-mailbox" && t.name === "ask_peer" && !INTERAGENT_SYNC) continue;
      if (s.id === "mcp-mailbox" && t.name === "spawn_agent" && !(INTERAGENT_SPAWN && LOOP_MODE)) continue;
      defs.push({
        type: "function",
        function: {
          name: encodeTool(s.id, t.name),
          description: `[${s.label}] ${t.description}`,
          parameters: s.id === "mcp-mailbox" && MAILBOX_PARAMS[t.name] ? MAILBOX_PARAMS[t.name] : {
            type: "object",
            properties: {
              query: {
                type: "string"
              },
              topic: {
                type: "string"
              },
              url: {
                type: "string"
              },
              proposal: {
                type: "string"
              },
              options: {
                type: "array",
                items: {
                  type: "string"
                }
              }
            },
            additionalProperties: true
          }
        }
      });
    }
  }
  return defs;
}
const preToolUse = [
  async call => {
    if (!call.decoded) return { block: true, reason: "not in grants", result: { error: "unknown tool" } };
    const auth = await authorize(call.role, call.decoded.server, call.decoded.tool);
    if (!auth.allowed) return { block: true, reason: auth.reason, result: { error: `denied by policy: ${auth.reason}` } };
    return null;
  },
  call => {
    const caps = call.caps;
    if (!caps || !call.decoded) return null;
    const server = call.decoded.server;
    if (Array.isArray(caps.deny) && caps.deny.includes(server)) return { block: true, reason: `agent profile denies ${server}`, result: { error: `your agent profile does not allow ${server}` } };
    if (Array.isArray(caps.allow) && caps.allow.length && !caps.allow.includes(server)) return { block: true, reason: "agent profile restricts tools", result: { error: `your agent profile only allows: ${caps.allow.join(", ")}` } };
    return null;
  },
  async call => {
    if (!HUMAN_APPROVAL || !call.decoded || !call.bus) return null;
    if (!APPROVAL_TOOLS.has(call.decoded.tool)) return null;
    const v = await requestApproval(call.bus, call.bus.agentId, call.decoded.tool, call.args);
    if (!v.allowed) return { block: true, reason: "director did not approve", result: { error: "the director did not approve this action — proceed without it" } };
    return null;
  }
];
const postToolUse = [
  (call, result) => { if (call.onTool) call.onTool(call.decoded, result); }
];
async function executeToolCall(call) {
  for (const hook of preToolUse) {
    const v = await hook(call);
    if (v && v.block) {
      call.allowed = false;
      call.blockReason = v.reason;
      return v.result;
    }
  }
  call.allowed = true;
  const d = call.decoded;
  let result;
  if (d.tool === "spawn_agent") result = await handleSpawn(call);
  else if (d.server === "mcp-mailbox") result = await busCall(call.bus, call.bus?.agentId, d.tool, call.args);
  else result = await executeTool(d.server, d.tool, call.args);
  for (const hook of postToolUse) await hook(call, result);
  return result;
}
async function handleSpawn(call) {
  const sc = call.spawnCtx;
  if (!INTERAGENT_SPAWN || !sc) return { error: "delegation is disabled" };
  if (sc.depth >= SPAWN_MAX_DEPTH) return { error: "max delegation depth reached — do this part yourself" };
  if (sc.spawnsLeft <= 0) return { error: "delegation budget used up — conclude with what you have" };
  const focus = String(call.args?.focus || "").slice(0, 300);
  if (!focus) return { error: "a focus is required to delegate" };
  sc.spawnsLeft--;
  const childUser = `A teammate delegated a focused sub-task to you. Work ONLY on: "${focus}"${call.args?.lens ? ` (angle: ${call.args.lens})` : ""}. Gather what you need with your tools, then conclude concisely with your finding.`;
  let child;
  try {
    child = await agentLoop({ role: call.role, model: call.model, system: call.system, user: childUser, grants: call.grants, budget: call.budget, onTool: call.onTool, bus: call.bus, spawnCtx: { depth: sc.depth + 1, spawnsLeft: sc.spawnsLeft }, caps: call.caps });
  } catch (e) {
    sc.spawnsLeft++;
    return { error: `delegation failed: ${String(e.message || e).slice(0, 80)}` };
  }
  const parsed = child.content ? extractJson(child.content) : null;
  if (parsed && parsed.summary) return { delegatedFocus: focus, summary: parsed.summary, keyPoints: parsed.keyPoints || [], stance: parsed.stance, confidence: parsed.confidence };
  return { error: "the delegated agent could not return a usable result" };
}
async function runToolCall(tc, ctx) {
  const decoded = decodeTool(ctx.grants, tc.function?.name || "");
  let args = {};
  try {
    args = JSON.parse(tc.function?.arguments || "{}");
  } catch {}
  const call = { role: ctx.role, decoded, args, name: tc.function?.name, bus: ctx.bus, onTool: ctx.onTool, model: ctx.model, system: ctx.system, grants: ctx.grants, budget: ctx.budget, spawnCtx: ctx.spawnCtx, caps: ctx.caps, allowed: false, blockReason: null };
  const result = await executeToolCall(call);
  if (!decoded) {
    ctx.toolLog.push({ server: "?", tool: tc.function?.name, allowed: false, reason: "not in grants" });
  } else if (!call.allowed) {
    ctx.toolLog.push({ ...decoded, args, allowed: false, reason: call.blockReason });
  } else {
    ctx.toolLog.push({ ...decoded, args, allowed: true, result: trimToolResult(result) });
  }
  return JSON.stringify(result).slice(0, ctx.budget.toolResultChars);
}
async function runWithTools({
  role,
  model,
  system,
  user,
  grants,
  budget,
  onTool,
  bus,
  caps
}) {
  const tools = toolDefs(grants, !!bus);
  const messages = [{
    role: "system",
    content: system
  }, {
    role: "user",
    content: user
  }];
  const toolLog = [];
  let simulated = false;
  let lastError = null;
  for (let round = 0; round < budget.toolRounds; round++) {
    const {
      message,
      simulated: sim,
      error
    } = await chat({
      model,
      messages: clampMessages(messages, budget.input),
      tools,
      temperature: budget.temperature,
      maxTokens: budget.maxTokens
    }, () => null);
    if (sim || !message) {
      simulated = true;
      lastError = error || lastError;
      break;
    }
    if (!message.tool_calls?.length) {
      return {
        content: message.content || "",
        toolLog,
        simulated: false
      };
    }
    const calls = message.tool_calls.slice(0, budget.toolCallsPerRound);
    messages.push({
      ...message,
      tool_calls: calls
    });
    for (const tc of calls) {
      const content = await runToolCall(tc, { role, grants, bus, onTool, toolLog, budget, caps });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content
      });
    }
  }
  if (!simulated) {
    const {
      message,
      simulated: sim2,
      error
    } = await chat({
      model,
      messages: clampMessages(messages, budget.input),
      temperature: budget.temperature,
      maxTokens: budget.maxTokens,
      jsonMode: true
    }, () => null);
    if (!sim2 && message) return {
      content: message.content || "",
      toolLog,
      simulated: false
    };
    lastError = error || lastError;
  }
  return {
    content: null,
    toolLog,
    simulated: true,
    error: lastError
  };
}
const FINISH_TOOL = {
  type: "function",
  function: {
    name: "finish",
    description: "Call this ONCE you have gathered enough evidence and are ready to conclude — pass your final conclusion as the arguments. This ends your turn.",
    parameters: {
      type: "object",
      properties: {
        say: { type: "string", description: "one short in-world line (≤90 chars)" },
        summary: { type: "string", description: "your full conclusion, 3-6 sentences" },
        keyPoints: { type: "array", items: { type: "string" } },
        stance: { type: "string", enum: ["support", "oppose", "conditional", "insufficient"] },
        confidence: { type: "number", description: "0-100" },
        insufficientReason: { type: "string", description: "only if stance is insufficient, ≤120 chars" }
      },
      required: ["summary", "stance", "confidence"]
    }
  }
};
function compactLoopMessages(messages, keepRecent) {
  const toolIdx = [];
  for (let i = 0; i < messages.length; i++) if (messages[i].role === "tool") toolIdx.push(i);
  if (toolIdx.length <= keepRecent) return messages;
  const stub = new Set(toolIdx.slice(0, toolIdx.length - keepRecent));
  return messages.map((m, i) => stub.has(i) ? { ...m, content: String(m.content || "").slice(0, 140) + " …[older tool result compacted]" } : m);
}
async function agentLoop({ role, model, system, user, grants, budget, onTool, bus, deadlineAt, spawnCtx, caps }) {
  const tools = [...toolDefs(grants, !!bus), FINISH_TOOL];
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];
  const toolLog = [];
  let lastError = null;
  const sc = spawnCtx || { depth: 0, spawnsLeft: SPAWN_MAX };
  const maxSteps = Math.max(3, Math.min(8, (budget.toolRounds || 3) + 4));
  const deadline = deadlineAt || Date.now() + 90_000;
  let nudged = false;
  for (let step = 0; step < maxSteps; step++) {
    if (Date.now() >= deadline) break;
    if (!nudged && step >= Math.ceil(maxSteps / 2)) {
      nudged = true;
      messages.push({ role: "user", content: "You've gathered substantial evidence now — unless one specific decision-critical fact is still missing, call finish with your conclusion rather than searching further." });
    }
    const { message, simulated: sim, error } = await chat({
      model,
      messages: clampMessages(compactLoopMessages(messages, 6), budget.input),
      tools,
      temperature: budget.temperature,
      maxTokens: budget.maxTokens
    }, () => null);
    if (sim || !message) {
      lastError = error || lastError;
      return { content: null, toolLog, simulated: true, error: lastError };
    }
    if (!message.tool_calls?.length) return { content: message.content || "", toolLog, simulated: false };
    const calls = message.tool_calls.slice(0, (budget.toolCallsPerRound || 2) + 1);
    messages.push({ ...message, tool_calls: calls });
    let finished = null;
    for (const tc of calls) {
      if (tc.function?.name === "finish") {
        try { finished = JSON.parse(tc.function.arguments || "{}"); } catch { finished = {}; }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: true }) });
      } else {
        const content = await runToolCall(tc, { role, grants, bus, onTool, toolLog, budget, model, system, spawnCtx: sc, caps });
        messages.push({ role: "tool", tool_call_id: tc.id, content });
      }
    }
    if (finished && (finished.summary || finished.say)) return { content: JSON.stringify(finished), toolLog, simulated: false };
  }
  const { message, simulated: sim2, error } = await chat({
    model,
    messages: clampMessages([...compactLoopMessages(messages, 6), { role: "user", content: "You've gathered enough — output ONLY your final JSON conclusion now (say, summary, keyPoints, stance, confidence)." }], budget.input),
    temperature: budget.temperature,
    maxTokens: budget.maxTokens,
    jsonMode: true
  }, () => null);
  if (!sim2 && message) return { content: message.content || "", toolLog, simulated: false };
  return { content: null, toolLog, simulated: true, error: error || lastError };
}
async function simulatedToolTrace(role, grants, topic) {
  const log = [];
  for (const s of grants.servers.slice(0, 2)) {
    const t = s.tools[0];
    if (!t) continue;
    const auth = await authorize(role, s.id, t.name);
    if (auth.allowed) {
      await executeTool(s.id, t.name, {
        query: topic,
        topic,
        proposal: topic
      });
      log.push({
        server: s.id,
        tool: t.name,
        args: {
          query: topic
        },
        allowed: true
      });
    } else {
      log.push({
        server: s.id,
        tool: t.name,
        args: {
          query: topic
        },
        allowed: false,
        reason: auth.reason
      });
    }
  }
  return log;
}
const CONF_WORD = "(?:confidence|độ\\s*tin\\s*cậy|mức\\s*độ\\s*tin\\s*cậy|mức\\s*tin\\s*cậy|độ\\s*tin\\s*tưởng)";
const CONF_LINE = new RegExp(`^\\s*[*_#>\\-•\\s]*(?:\\*\\*)?\\s*${CONF_WORD}\\s*(?:\\*\\*)?\\s*[:：=]?\\s*(?:khoảng\\s*|approx\\.?\\s*|~\\s*|là\\s*)?\\d{1,3}\\s*%?.*$`, "im");
const CONF_INLINE = new RegExp(`[\\s—–\\-]*[(\\[]?\\s*${CONF_WORD}\\s*[:：=]?\\s*\\d{1,3}\\s*%\\s*[)\\]]?\\.?`, "ig");
const CONF_PCT_PAREN = new RegExp(`[\\s—–\\-]*[(\\[]\\s*\\d{1,3}\\s*%\\s*${CONF_WORD}\\s*[)\\]]\\.?`, "ig");
function stripConfidenceLine(md, codeConfidence, language) {
  const kept = String(md).split("\n").filter(line => !CONF_LINE.test(line));
  let out = kept.join("\n").replace(CONF_PCT_PAREN, "").replace(CONF_INLINE, "");
  out = out.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  if (typeof codeConfidence === "number") {
    const label = language === "vi" ? "Mức độ tin cậy" : "Confidence";
    out = `**${label}: ${codeConfidence}%**\n\n${out}`;
  }
  return out;
}
process.on("unhandledRejection", err => console.error("[agent-runtime] unhandled rejection (kept alive):", err?.message || err));
process.on("uncaughtException", err => console.error("[agent-runtime] uncaught exception (kept alive):", err?.message || err));
const app = express();
app.use(cors());
app.use(express.json({
  limit: "8mb"
}));
app.use((req, _res, next) => accountStore.run((req.get("x-user-email") || "").toLowerCase().trim() || null, () => next()));
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
for (const method of ["get", "post", "put", "delete"]) {
  const orig = app[method].bind(app);
  app[method] = (path, ...handlers) => orig(path, ...handlers.map(h => typeof h === "function" && h.length < 4 ? wrap(h) : h));
}
app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "agent-runtime"
}));
app.post("/plan", internalAuth, async (req, res) => {
  const {
    title,
    context = "",
    language = "en",
    model
  } = req.body || {};
  if (!title) return res.status(400).json({
    error: "title required"
  });
  const clip = (s, n) => String(s ?? "").trim().slice(0, n);
  const cleanAssignments = arr => (Array.isArray(arr) ? arr : []).map(a => a && a.focus ? { focus: clip(a.focus, 90), lens: clip(a.lens, 24) } : null).filter(Boolean).slice(0, 6);
  let assessment = null;
  let modelPhase = null;
  if (model) {
    const models = Array.isArray(model) ? model : [model];
    const budget = budgetFor(models, "plan");
    const {
      message,
      simulated
    } = await chat({
      model: models,
      messages: [{
        role: "system",
        content: LEAD_PERSONA
      }, {
        role: "user",
        content: planPrompt({
          title,
          context,
          language
        })
      }],
      temperature: 0.3,
      maxTokens: budget.maxTokens,
      jsonMode: true
    }, () => null);
    const parsed = !simulated && message ? extractJson(message.content) : null;
    if (parsed?.type === "unclear" && !context && parsed.question) {
      return res.json({
        assessment: {
          type: "unclear",
          question: String(parsed.question).slice(0, 200),
          handler: "model"
        }
      });
    }
    if (parsed?.type === "event") {
      const kinds = ["party", "swim-race", "basketball"];
      return res.json({
        assessment: {
          type: "event",
          eventKind: kinds.includes(parsed.eventKind) ? parsed.eventKind : "party",
          reason: String(parsed.reason || "").slice(0, 160),
          handler: "model"
        }
      });
    }
    const informational = parsed?.type === "info";
    const assignments = cleanAssignments(parsed?.phase?.assignments);
    if (assignments.length) {
      modelPhase = { goal: clip(parsed.phase?.goal, 100), assignments };
      assessment = {
        type: "work",
        informational,
        complexity: informational ? "simple" : parsed.complexity === "simple" ? "simple" : "standard",
        approach: clip(parsed.approach, 120),
        reason: clip(parsed.reason, 160),
        handler: "model"
      };
    }
  }
  const fallback = assessment ? null : triageByCode(title, language);
  const informational = assessment ? assessment.informational : fallback.informational;
  const codePlan = planByCode({ title, language, informational });
  res.json({
    approach: assessment?.approach || codePlan.approach,
    phase: modelPhase || codePlan.phase,
    assessment: assessment || {
      type: "work",
      informational,
      complexity: informational ? "simple" : "standard",
      reason: "",
      handler: "code"
    }
  });
});
app.post("/lead-answer", internalAuth, async (req, res) => {
  const {
    agent = {},
    missionTitle,
    question,
    language = "en"
  } = req.body || {};
  if (!missionTitle || !question) return res.status(400).json({
    error: "missionTitle, question required"
  });
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "lead");
  const {
    message,
    simulated
  } = await chat({
    model: models,
    messages: [{
      role: "system",
      content: `${PERSONAS.orchestrator}\nYour in-world name is "${agent.name || "Lead"}".`
    }, {
      role: "user",
      content: leadAnswerPrompt({
        missionTitle,
        question,
        language
      })
    }],
    temperature: 0.4,
    maxTokens: budget.maxTokens
  }, () => null);
  const parsed = !simulated && message ? extractJson(message.content) : null;
  const fallback = language === "vi" ? "Cứ giả định phạm vi nội bộ và nguồn lực hiện có; nêu rõ giả định của bạn trong kết luận." : "Assume internal scope and current resources; state your assumptions explicitly in your conclusion.";
  res.json({
    answer: String(parsed?.answer || fallback).slice(0, 300),
    simulated: simulated || !parsed
  });
});
app.post("/run", internalAuth, async (req, res) => {
  const {
    missionId,
    role = "worker",
    agent = {},
    assignment = {},
    stage = "draft",
    blackboard = [],
    peerDrafts = [],
    missionTitle,
    context = "",
    informational = false,
    userEmail = null,
    language = "en",
    busUrl = null,
    roster = [],
    inbox = []
  } = req.body || {};
  if (!missionTitle || !assignment.focus) return res.status(400).json({
    error: "missionTitle, assignment.focus required"
  });
  const lens = assignment.lens || "";
  const complexity = req.body?.complexity || "standard";
  const grants = await getGrants(role);
  const agentId = agent.id || role;
  const caps = agent.caps && typeof agent.caps === "object" ? agent.caps : req.body?.caps && typeof req.body.caps === "object" ? req.body.caps : null;
  const capsBlocks = server => caps ? (Array.isArray(caps.deny) && caps.deny.includes(server)) || (Array.isArray(caps.allow) && caps.allow.length && !caps.allow.includes(server)) : false;
  const bus = INTERAGENT_BUS && busUrl ? { url: busUrl, missionId, agentId, roster, userEmail } : null;
  const memBudget = complexity === "standard" ? 1800 : 900;
  const mem = await memoryContext(missionId, agentId, memBudget, { userEmail, query: missionTitle });
  const mandate = agent.mandate ? `\nStanding mandate from your director (follow it unless it conflicts with the honesty/evidence rules above): "${agent.mandate}"` : "";
  const system = `${WORKER_PERSONA}\nYour in-world name is "${agent.name || agentId}".${mandate}${mem ? `\n${mem}` : ""}`;
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "run");
  const grantsHasWeb = grants.servers?.some(s => s.id === "mcp-web" && s.tools.some(t => t.name === "web.search"));
  const wantsEvidence = !lens || /evidence|research|source|fact|market|trend|news|landscape|signal/i.test(lens);
  const preLog = [];
  let liveEvidence = "";
  if (stage === "draft" && wantsEvidence && grantsHasWeb && !capsBlocks("mcp-web")) {
    try {
      const q = `${missionTitle} ${assignment.focus}`.replace(/\s+/g, " ").trim().slice(0, 200);
      const pre = await executeTool("mcp-web", "web.search", { query: q });
      if (pre && !pre.error && Array.isArray(pre.results) && pre.results.length) {
        preLog.push({ server: "mcp-web", tool: "web.search", allowed: true, result: pre });
        remember(missionId, agentId, "data", `mcp-web/web.search → ${JSON.stringify(pre)}`);
        liveEvidence = `Live sources the system retrieved for you just now (as of today — treat these as the CURRENT state, ground your answer in them, and prefer them over anything you recall). For any source that looks authoritative but you need more than this excerpt, call web.fetch on its URL to read the full page:\n` + pre.results.slice(0, 6).map((r, i) => `[${i + 1}] ${r.title} — ${r.host}${r.published ? ` (${r.published})` : ""} <${r.url}>: ${(r.content || r.snippet || "").slice(0, 650)}`).join("\n") + (pre.answer ? `\nSearch summary: ${pre.answer}` : "");
      }
    } catch {}
  }
  const user = runPrompt({
    assignment,
    missionTitle,
    blackboard,
    peerDrafts,
    stage,
    context: `${liveEvidence ? liveEvidence + "\n\n" : ""}${String(context)}`.slice(0, 4200),
    language,
    inbox: bus ? inbox : [],
    roster: bus ? roster : [],
    agentId
  });
  const runner = LOOP_MODE && stage === "draft" ? agentLoop : runWithTools;
  const {
    content,
    toolLog,
    simulated,
    error
  } = await runner({
    role,
    model: models,
    system,
    user,
    grants,
    budget,
    bus,
    caps,
    onTool: (decoded, result) => remember(missionId, agentId, "data", `${decoded.server}/${decoded.tool} → ${JSON.stringify(result)}`)
  });
  let parsed = content ? extractJson(content) : null;
  if (parsed?.questionForLead && stage === "draft" && !context) {
    return res.json({
      missionId,
      agentId,
      questionForLead: String(parsed.questionForLead).slice(0, 160),
      toolCalls: toolLog,
      simulated: false
    });
  }
  let finalToolLog = [...preLog, ...toolLog];
  if (!parsed && content && !error) {
    const retryNotes = await memoryContext(missionId, agentId, 2400, { userEmail, query: missionTitle });
    const {
      message: retryMsg
    } = await chat({
      model: models,
      messages: [{
        role: "system",
        content: `${WORKER_PERSONA}\nReturn ONLY one JSON object, no prose, no <think>, no markdown fences.`
      }, {
        role: "user",
        content: `${user}\n\n${retryNotes}Based on what you gathered, output ONLY the JSON object now.`
      }],
      temperature: 0.2,
      maxTokens: Math.max(budget.maxTokens, 4000),
      jsonMode: true
    }, () => null);
    if (retryMsg) parsed = extractJson(retryMsg.content);
  }
  if (!parsed && !SIM_FORCED) {
    return res.json({
      missionId,
      agentId,
      failed: true,
      error: (error || (content ? "model answered in an unusable format" : "model unreachable")).slice(0, 200),
      toolCalls: [...preLog, ...toolLog],
      simulated: true
    });
  }
  if (!parsed) {
    parsed = simulate("run", {
      lens,
      missionTitle,
      language
    });
    if (!toolLog.length) finalToolLog = await simulatedToolTrace(role, grants, missionTitle);
  }
  parsed = clampRunOutput(parsed);
  const strategy = strategyFor(models, { complexity, informational });
  if (strategy.mode === "self-consistency" && stage === "draft" && content && !simulated && parsed && parsed.summary && parsed.stance) {
    try {
      const evidence = finalToolLog.filter(tc => tc.allowed && tc.result && !tc.result.error).map(tc => `${tc.server}/${tc.tool}: ${JSON.stringify(trimToolResult(tc.result)).slice(0, 400)}`).join("\n").slice(0, 2400);
      const sampleUser = `${user}\n\n${evidence ? `Evidence already gathered:\n${evidence}\n\n` : ""}Decide now from the evidence above — do NOT call tools. Return ONLY the JSON object.`;
      const samples = [parsed];
      for (let s = 0; s < strategy.samples - 1; s++) {
        const { message: sm } = await chat({ model: models, messages: clampMessages([{ role: "system", content: system }, { role: "user", content: sampleUser }], budget.input), temperature: 0.6, maxTokens: budget.maxTokens, jsonMode: true }, () => null);
        const sp = sm ? extractJson(sm.content) : null;
        if (sp && sp.summary && sp.stance) samples.push(clampRunOutput(sp));
      }
      if (samples.length >= 2) {
        const counts = {};
        for (const o of samples) counts[o.stance] = (counts[o.stance] || 0) + 1;
        const majStance = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const inMaj = samples.filter(o => o.stance === majStance);
        const confs = inMaj.map(o => typeof o.confidence === "number" ? o.confidence : 50).sort((a, b) => a - b);
        const medConf = confs[Math.floor(confs.length / 2)];
        const rep = parsed.stance === majStance ? parsed : inMaj[0];
        parsed = clampRunOutput({ ...rep, stance: majStance, confidence: medConf });
        parsed.selfConsistency = { samples: samples.length, agreement: Math.round(100 * inMaj.length / samples.length) };
        remember(missionId, agentId, "verify", `self-consistency ${samples.length} samples → ${majStance} ${medConf}% (agreement ${parsed.selfConsistency.agreement}%)`);
      }
    } catch {}
  }
  if (process.env.HARNESS_REASONING !== "off" && stage === "draft" && complexity === "standard" && content && !simulated && parsed && parsed.summary && parsed.stance !== "insufficient") {
    const evidence = finalToolLog.filter(tc => tc.allowed && tc.result && !tc.result.error).map(tc => `${tc.server}/${tc.tool}: ${JSON.stringify(trimToolResult(tc.result)).slice(0, 500)}`).join("\n").slice(0, 2600);
    try {
      const { message: revMsg } = await chat({
        model: models,
        messages: clampMessages([{
          role: "system",
          content: `${WORKER_PERSONA}\nYour in-world name is "${agent.name || agentId}". Return ONLY one JSON object.`
        }, {
          role: "user",
          content: reflectPrompt({ assignment, missionTitle, draft: parsed, evidence, language })
        }], budget.input),
        temperature: 0.2,
        maxTokens: budget.maxTokens,
        jsonMode: true
      }, () => null);
      const rev = revMsg ? extractJson(revMsg.content) : null;
      if (rev && rev.summary) {
        const merged = { ...parsed };
        for (const k of ["say", "summary", "keyPoints", "stance", "confidence", "insufficientReason"]) if (k in rev) merged[k] = rev[k];
        parsed = clampRunOutput(merged);
        parsed.verified = true;
        remember(missionId, agentId, "verify", `self-checked draft (${parsed.stance} ${parsed.confidence}%)`);
      }
    } catch {}
  }
  const searches = finalToolLog.filter(tc => tc.allowed && tc.result && Array.isArray(tc.result.results));
  const allLowRel = searches.length > 0 && searches.every(tc => tc.result.lowRelevance === true);
  if (parsed.stance === "insufficient") {
    const attempted = finalToolLog.length > 0;
    const gotData = finalToolLog.some(tc => tc.allowed && tc.result && !tc.result.error && tc.result.lowRelevance !== true);
    if (!attempted || gotData) parsed.stance = "conditional";else parsed.confidence = Math.min(parsed.confidence, 40);
  } else if (allLowRel) {
    parsed.confidence = Math.min(parsed.confidence ?? 50, 45);
    if (parsed.stance === "support" || parsed.stance === "oppose") parsed.stance = "conditional";
  }
  if (parsed.summary && parsed.stance !== "insufficient") {
    const grounded = finalToolLog.some(tc => tc.allowed && tc.result && !tc.result.error && tc.result.lowRelevance !== true);
    if (!grounded && wantsEvidence) {
      parsed.confidence = Math.min(parsed.confidence ?? 50, 45);
      parsed.verifyNote = language === "vi" ? "Chưa dựa trên nguồn tra cứu trực tiếp — có thể lỗi thời" : "Not grounded in a live source — may be outdated";
    }
  }
  if (parsed.summary && parsed.stance !== "insufficient") {
    const evidence = finalToolLog.filter(tc => tc.allowed && tc.result && !tc.result.error).map(tc => JSON.stringify(tc.result)).join("  ");
    const figs = uncitedFigures(parsed, evidence);
    if (figs.length) {
      const vi = language === "vi";
      parsed.flags = [...new Set([...(parsed.flags || []), ...figs.map(f => vi ? `số “${f}” không thấy trong nguồn đã thu thập` : `figure "${f}" not in gathered evidence`)])].slice(0, 3);
      parsed.verifyNote = vi ? "Tự kiểm: số liệu chưa có nguồn" : "Auto-check: unsourced figures";
      parsed.confidence = Math.max(5, Math.min(parsed.confidence ?? 60, 70 - 6 * figs.length));
    }
  }
  if (parsed.stance !== "insufficient" && !String(parsed.summary || "").trim() && !(parsed.keyPoints || []).some(k => String(k).trim()) && !String(parsed.say || "").trim()) {
    return res.json({ missionId, agentId, lens, failed: true, error: "empty output — no summary or key points" });
  }
  for (const tc of finalToolLog) remember(missionId, agentId, "tool", `${tc.server}/${tc.tool} ${tc.allowed ? "ok" : "denied"}`);
  remember(missionId, agentId, "conclusion", `${parsed.stance || "done"} (${parsed.confidence ?? "?"}%) — ${parsed.summary || parsed.say || ""}`);
  res.json({
    missionId,
    agentId,
    lens,
    policyGroup: grants.policyGroup,
    ...parsed,
    toolCalls: finalToolLog,
    simulated: simulated || !content
  });
});
app.post("/reply", internalAuth, async (req, res) => {
  const { missionId, agent = {}, fromName = "a teammate", missionTitle, question, language = "en" } = req.body || {};
  if (!missionTitle || !question) return res.status(400).json({ error: "missionTitle, question required" });
  const agentId = agent.id || "worker";
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "run");
  const vi = language === "vi";
  const system = `${WORKER_PERSONA}\nYour in-world name is "${agent.name || agentId}".`;
  const user = `A teammate (${fromName}) is mid-task on the mission "${missionTitle}" and asks you, briefly:\n"${String(question).slice(0, 400)}"\nAnswer in 1-3 sentences from your own expertise — concrete and honest; if you genuinely don't know, say so plainly. ${vi ? "Trả lời bằng tiếng Việt." : "Answer in English."}\nReturn ONLY {"answer":"..."}.`;
  try {
    const { message } = await chat({ model: models, messages: clampMessages([{ role: "system", content: system }, { role: "user", content: user }], budget.input), temperature: 0.3, maxTokens: Math.min(budget.maxTokens, 700), jsonMode: true }, () => null);
    const parsed = message ? extractJson(message.content) : null;
    const answer = parsed?.answer || (message?.content ? String(message.content) : null);
    if (answer) {
      remember(missionId, agentId, "reply", `answered ${fromName}: ${String(answer).slice(0, 120)}`);
      return res.json({ answer: String(answer).slice(0, 600) });
    }
  } catch {}
  return res.json({ answer: vi ? "(chưa thể trả lời ngay lúc này)" : "(couldn't answer right now)" });
});
app.post("/meeting-turn", internalAuth, async (req, res) => {
  const {
    missionId,
    agent = {},
    missionTitle,
    position,
    others = [],
    round = 1,
    directorNote = "",
    userEmail = null,
    language = "en"
  } = req.body || {};
  if (!missionTitle || !position) return res.status(400).json({
    error: "missionTitle, position required"
  });
  const agentId = agent.id || "worker";
  const mem = await memoryContext(missionId, agentId, req.body?.complexity === "standard" ? 1400 : 700, { userEmail, query: missionTitle });
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "meeting");
  const {
    message
  } = await chat({
    model: models,
    messages: clampMessages([{
      role: "system",
      content: `${WORKER_PERSONA}\nYour in-world name is "${agent.name || agentId}".${mem ? `\n${mem}` : ""}`
    }, {
      role: "user",
      content: meetingPrompt({
        missionTitle,
        position,
        others,
        round,
        directorNote,
        language
      })
    }], budget.input),
    temperature: budget.temperature,
    maxTokens: budget.maxTokens
  }, SIM_FORCED ? () => ({
    content: JSON.stringify(simulate("meeting", {
      stance: position.stance,
      round,
      seed: String(agentId).split("").reduce((a, c) => a + c.charCodeAt(0), 0),
      language
    }))
  }) : () => null);
  const parsedTurn = message ? extractJson(message.content) : null;
  if (!parsedTurn) return res.json({
    skip: true
  });
  const parsed = clampTurnOutput(parsedTurn);
  remember(missionId, agentId, "debate", `round ${round}: ${parsed.stance} — ${parsed.argument || parsed.say || ""}`);
  res.json(parsed);
});
app.get("/models", internalAuth, async (_req, res) => {
  const live = await listModels();
  const meta = modelsMeta();
  const ageMinutes = meta.at ? Math.round((Date.now() - meta.at) / 60_000) : null;
  res.json({
    source: live ? (meta.via === "catalog" ? "maas-catalog" : ageMinutes !== null && ageMinutes <= 10 ? "maas" : "maas-cache") : "fallback",
    fetchedAt: meta.at || null,
    ageMinutes,
    upstream: meta.failing ? "failing" : "ok",
    models: live || Object.keys(MODEL_LIMITS).map(id => ({
      id,
      ownedBy: id.split("/")[0]
    }))
  });
});
app.post("/verify", internalAuth, async (req, res) => {
  const {
    missionId,
    agent = {},
    missionTitle,
    outputs = [],
    language = "en"
  } = req.body || {};
  if (!missionTitle || !outputs.length) return res.status(400).json({
    error: "missionTitle, outputs required"
  });
  const agentId = agent.id || "atlas";
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "verify");
  const vi = language === "vi";
  const enriched = outputs.map(o => ({ ...o, evidence: o.agentId ? evidenceText(missionId, o.agentId).slice(0, 700) : "" }));
  const {
    message,
    simulated
  } = await chat({
    model: models,
    messages: clampMessages([{
      role: "system",
      content: `${LEAD_PERSONA}\nYou are acting as the squad's fact-checker. Your in-world name is "${agent.name || "Lead"}".`
    }, {
      role: "user",
      content: verifyPrompt({
        missionTitle,
        outputs: enriched,
        language
      })
    }], budget.input),
    temperature: 0.3,
    maxTokens: budget.maxTokens,
    jsonMode: true
  }, () => null);
  const parsed = !simulated && message ? extractJson(message.content) : null;
  const clip = (s, n) => String(s ?? "").trim().slice(0, n);
  const ids = new Set(outputs.map(o => o.agentId));
  const asList = v => Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  const verdictList = Array.isArray(parsed?.verdicts) ? parsed.verdicts : [];
  const byAgent = new Map();
  for (const v of verdictList) {
    if (!v || !ids.has(v.agentId)) continue;
    byAgent.set(v.agentId, {
      agentId: v.agentId,
      flagged: asList(v.flagged).slice(0, 3).map(f => clip(f, 120)).filter(Boolean),
      confidenceAdjust: Math.max(-30, Math.min(0, Number(v.confidenceAdjust) || 0)),
      note: clip(v.note, 160)
    });
  }
  for (const o of enriched) {
    const figs = uncitedFigures(o, o.evidence);
    if (!figs.length) continue;
    const autoFlags = figs.map(f => `${vi ? "số" : "figure"} "${f}" ${vi ? "không thấy trong dữ liệu đã thu thập" : "not in gathered evidence"}`);
    const ex = byAgent.get(o.agentId);
    if (ex) {
      ex.flagged = [...new Set([...ex.flagged, ...autoFlags])].slice(0, 3);
      ex.confidenceAdjust = Math.max(-30, Math.min(ex.confidenceAdjust, -6 * figs.length));
    } else {
      byAgent.set(o.agentId, { agentId: o.agentId, flagged: autoFlags, confidenceAdjust: -Math.min(12, 6 * figs.length), note: vi ? "Số liệu chưa có nguồn (tự kiểm)" : "Unsourced figures (auto-check)" });
    }
  }
  const verdicts = [...byAgent.values()].filter(v => v.flagged.length);
  if (verdicts.length) remember(missionId, agentId, "verify", `flagged ${verdicts.map(v => v.agentId).join(", ")}`);
  res.json({
    verdicts,
    simulated: simulated || !parsed
  });
});
app.post("/synthesize", internalAuth, async (req, res) => {
  const {
    missionId,
    agent = {},
    missionTitle,
    phaseGoal = "",
    outputs = [],
    blackboard = [],
    phaseIndex = 0,
    maxPhases = 1,
    informational = false,
    language = "en"
  } = req.body || {};
  if (!missionTitle || !outputs.length) return res.status(400).json({
    error: "missionTitle, outputs required"
  });
  const agentId = agent.id || "atlas";
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "verify");
  const enriched = outputs.map(o => ({ ...o, evidence: o.agentId ? evidenceText(missionId, o.agentId).slice(0, 500) : "" }));
  const {
    message,
    simulated
  } = await chat({
    model: models,
    messages: clampMessages([{
      role: "system",
      content: `${LEAD_PERSONA}\nYour in-world name is "${agent.name || "Lead"}".`
    }, {
      role: "user",
      content: synthesizePrompt({
        missionTitle,
        phaseGoal,
        outputs: enriched,
        blackboard,
        phaseIndex,
        maxPhases,
        informational,
        language
      })
    }], budget.input),
    temperature: 0.3,
    maxTokens: budget.maxTokens,
    jsonMode: true
  }, () => null);
  const parsed = !simulated && message ? extractJson(message.content) : null;
  const clip = (s, n) => String(s ?? "").trim().slice(0, n);
  const isLast = phaseIndex >= maxPhases - 1;
  let result;
  if (parsed && typeof parsed.sufficient !== "undefined") {
    const concerns = (Array.isArray(parsed.concerns) ? parsed.concerns : []).map(c => clip(c, 140)).filter(Boolean).slice(0, 4);
    let nextPhase = null;
    if (!isLast && !parsed.sufficient && parsed.nextPhase && Array.isArray(parsed.nextPhase.assignments)) {
      const assignments = parsed.nextPhase.assignments.map(a => a && a.focus ? { focus: clip(a.focus, 90), lens: clip(a.lens, 24) } : null).filter(Boolean).slice(0, 4);
      if (assignments.length) nextPhase = { goal: clip(parsed.nextPhase.goal, 100), assignments };
    }
    result = { phaseSummary: clip(parsed.phaseSummary, 600), concerns, sufficient: !!parsed.sufficient || !nextPhase, nextPhase, simulated: false };
  } else {
    result = synthesizeByCode(outputs, { phaseIndex, maxPhases, informational, language });
  }
  remember(missionId, agentId, "synthesize", `phase ${phaseIndex + 1} sufficient ${result.sufficient} next ${result.nextPhase ? result.nextPhase.assignments.length : 0}`);
  res.json(result);
});
app.post("/scenarios", internalAuth, async (req, res) => {
  const {
    missionId,
    agent = {},
    missionTitle,
    outputs = [],
    language = "en"
  } = req.body || {};
  if (!missionTitle || !outputs.length) return res.status(400).json({
    error: "missionTitle, outputs required"
  });
  const agentId = agent.id || "atlas";
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "verify");
  const {
    message,
    simulated
  } = await chat({
    model: models,
    messages: clampMessages([{
      role: "system",
      content: `${LEAD_PERSONA}\nYour in-world name is "${agent.name || "Lead"}".`
    }, {
      role: "user",
      content: scenariosPrompt({ missionTitle, outputs, language })
    }], budget.input),
    temperature: 0.4,
    maxTokens: budget.maxTokens,
    jsonMode: true
  }, () => null);
  const parsed = !simulated && message ? extractJson(message.content) : null;
  let result;
  if (parsed && Array.isArray(parsed.scenarios) && parsed.scenarios.length) {
    const clip = (s, n) => String(s ?? "").trim().slice(0, n);
    const scenarios = parsed.scenarios.slice(0, 3).map(s => ({
      name: clip(s.name, 40) || "—",
      probability: Math.max(0, Math.min(100, Math.round(Number(s.probability) || 0))),
      outcome: clip(s.outcome, 280),
      drivers: (Array.isArray(s.drivers) ? s.drivers : []).slice(0, 3).map(d => clip(d, 80)).filter(Boolean)
    }));
    result = { scenarios, sensitivity: clip(parsed.sensitivity, 240), simulated: false };
  } else {
    result = scenariosByCode(outputs, language);
  }
  remember(missionId, agentId, "scenarios", `${result.scenarios.length} scenarios`);
  res.json(result);
});
app.get("/memory/health", internalAuth, wrap(async (_req, res) => {
  res.json(await memoryHealth());
}));
app.get("/memory/:agentId", internalAuth, (req, res) => {
  const { agentId } = req.params;
  const userEmail = req.get("x-user-email") || req.query.userEmail || null;
  res.json({
    agentId,
    source: memoryConfigured() ? "agentbase" : "local",
    longTerm: loadLongTerm(agentId, userEmail),
    shortTerm: shortTerm(req.query.missionId, agentId)
  });
});
app.post("/memory/commit", internalAuth, wrap(async (req, res) => {
  const { missionId, outcomes = [], userEmail = null } = req.body || {};
  res.json(await consolidate(missionId, outcomes, userEmail));
}));
app.post("/consensus", internalAuth, (req, res) => {
  const {
    missionTitle,
    positions = [],
    transcript = [],
    language = "en"
  } = req.body || {};
  res.json(decideConsensus({
    missionTitle,
    positions,
    transcript,
    language
  }));
});
app.post("/report", internalAuth, async (req, res) => {
  const {
    missionId,
    missionTitle,
    outputs = [],
    meeting = null,
    informational = false,
    language = "en",
    depth = "quick",
    scenarios = null,
    agent = {}
  } = req.body || {};
  const code = assembleReport({
    missionTitle,
    outputs,
    meeting,
    informational,
    language
  });
  let report = {
    ...code,
    composed: "code"
  };
  const models = agent.models?.length ? agent.models : agent.model;
  const dataNotes = outputs.flatMap(o => shortTerm(missionId, o.agentId).filter(n => n.kind === "data").map(n => `- [${o.focus || o.name || o.agentId}] ${n.text}`));
  if (!SIM_FORCED && models && outputs.length) {
    const budget = budgetFor(models, "report");
    const {
      message
    } = await chat({
      model: models,
      messages: clampMessages([{
        role: "system",
        content: `${LEAD_PERSONA}\nYou are writing the squad's final report. Your in-world name is "${agent.name || "Lead"}".`
      }, {
        role: "user",
        content: reportPrompt({
          missionTitle,
          outputs,
          meeting,
          dataNotes,
          informational,
          language,
          depth,
          scenarios
        })
      }], budget.input),
      temperature: 0.5,
      maxTokens: budget.maxTokens,
      jsonMode: true
    }, () => null);
    const parsed = message ? extractJson(message.content) : null;
    if (parsed?.markdown && String(parsed.markdown).length > 200 && parsed.recommendation) {
      let body = stripConfidenceLine(String(parsed.markdown).slice(0, 9000), code.confidence, language);
      const vi = language === "vi";
      const flagged = outputs.filter(o => o.flags?.length);
      if (flagged.length && !body.includes("⚑")) body += `\n\n## ${vi ? "Kiểm chứng" : "Verification"}\n${flagged.map(o => `**${o.name || o.agentId}**${o.verifyNote ? ` — ${o.verifyNote}` : ""}\n${o.flags.map(f => `- ⚑ ${f}`).join("\n")}`).join("\n")}`;
      if (!informational && code.confidenceRationale && !/confidence basis|cơ sở đánh giá/i.test(body)) body += `\n\n_${vi ? "Cơ sở đánh giá" : "Confidence basis"}: ${code.confidenceRationale}._`;
      report = {
        markdown: body,
        recommendation: clampWords(stripConfidenceLine(String(parsed.recommendation), null, language).trim(), 200) || code.recommendation,
        confidence: code.confidence,
        confidenceRationale: code.confidenceRationale,
        say: code.say,
        composed: "model"
      };
    }
  }
  const sources = buildSources(dataNotes, language, missionTitle);
  if (sources) report.markdown += `\n\n${sources}`;
  res.json(report);
});
app.use((err, _req, res, _next) => {
  console.error("[agent-runtime] request error:", err?.message || err);
  if (!res.headersSent) res.status(500).json({ error: "internal error", detail: String(err?.message || err).slice(0, 200) });
});
app.listen(PORT, () => console.log(`[agent-runtime] listening on :${PORT} (policy: ${POLICY_URL})`));
const MODELS_REFRESH_MS = Number(process.env.MODELS_REFRESH_MS || 900_000);
listModels().catch(() => {});
setInterval(() => listModels().catch(() => {}), MODELS_REFRESH_MS).unref();
