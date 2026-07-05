import { AsyncLocalStorage } from "node:async_hooks";
export const accountStore = new AsyncLocalStorage();
const BASE_URL = (process.env.LLM_BASE_URL || "").replace(/\/$/, "");
const API_KEY = process.env.LLM_API_KEY || "";
const SIM_MODE = (process.env.LLM_SIMULATION || "auto").toLowerCase();
export const SIM_FORCED = SIM_MODE === "on";
const FALLBACK_MODELS = (process.env.LLM_FALLBACK_MODELS ?? "gemini/gemini-3.1-flash-lite,openai/gpt-5-mini").split(",").map(s => s.trim()).filter(Boolean);
export class SimulationRequested extends Error {}
export class PromptBlocked extends Error {}
const isPromptBlocked = (status, text) => status === 400 && /usage policy|flagged|moderat|invalid[ _-]?prompt|content[ _-]?(filter|policy)|safety system|prohibited|violat/i.test(text || "");
const usesResponsesApi = model => /^openai\/gpt-5/.test(model);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NO_JSON_MODE = new Set();
const jsonModeCapable = model => !usesResponsesApi(model) && !NO_JSON_MODE.has(model);
const BREAKER_FAILS = 2,
  BREAKER_OPEN_MS = 60_000;
const breaker = new Map();
const bkey = (account, model) => `${account || "_global"}|${model}`;
const breakerOpen = (account, model) => {
  const b = breaker.get(bkey(account, model));
  return !!(b && b.openUntil > Date.now());
};
const breakerFail = (account, model) => {
  const k = bkey(account, model);
  const b = breaker.get(k) || { fails: 0, openUntil: 0 };
  b.fails += 1;
  if (b.fails >= BREAKER_FAILS) {
    b.openUntil = Date.now() + BREAKER_OPEN_MS;
    b.fails = 0;
    console.warn(`[agent-runtime] circuit breaker OPEN for ${model} (account ${account || "_global"}) — skipping for ${BREAKER_OPEN_MS / 1000}s`);
  }
  breaker.set(k, b);
};
const breakerOk = (account, model) => breaker.delete(bkey(account, model));
async function fetchWithRetry(url, options, label) {
  const backoffs = [2000, 5000, 11000];
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (err) {
      const code = err && (err.cause && err.cause.code || err.code);
      const transient = err && (["AbortError", "TimeoutError", "TypeError"].includes(err.name) || ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH", "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"].includes(code));
      if (transient && attempt < backoffs.length) {
        console.warn(`[agent-runtime] ${label} network error "${err.message}" — retry ${attempt + 1}/${backoffs.length} in ${Math.round(backoffs[attempt] / 1000)}s`);
        await sleep(backoffs[attempt]);
        continue;
      }
      throw err;
    }
    if ((res.status === 429 || res.status === 503 || res.status === 500 || res.status === 502 || res.status === 504) && attempt < backoffs.length) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? Math.min(retryAfter * 1000, 20000) : backoffs[attempt];
      console.warn(`[agent-runtime] ${label} ${res.status} rate-limited — retry ${attempt + 1}/${backoffs.length} in ${Math.round(wait / 1000)}s`);
      await res.text().catch(() => {});
      await sleep(wait);
      continue;
    }
    return res;
  }
}
async function callResponsesApi({
  model,
  messages,
  tools,
  maxTokens = 1400
}, attempt = 0) {
  const instructions = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const input = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      input.push({ type: "function_call_output", call_id: m.tool_call_id, output: String(m.content ?? "") });
    } else if (m.role === "assistant" && m.tool_calls?.length) {
      for (const tc of m.tool_calls) input.push({ type: "function_call", call_id: tc.id, name: tc.function.name, arguments: tc.function.arguments || "{}" });
      if (m.content) input.push({ role: "assistant", content: m.content });
    } else {
      input.push({ role: m.role, content: String(m.content ?? "") });
    }
  }
  const body = {
    model,
    input,
    max_output_tokens: maxTokens,
    reasoning: { effort: maxTokens <= 1000 ? "low" : "medium" },
    ...(instructions ? { instructions } : {}),
    ...(tools && tools.length ? {
      tools: tools.map(t => ({ type: "function", name: t.function.name, description: t.function.description, parameters: t.function.parameters })),
      tool_choice: "auto"
    } : {})
  };
  const res = await fetchWithRetry(`${BASE_URL}/responses`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000)
  }, model);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (isPromptBlocked(res.status, text)) throw new PromptBlocked("prompt blocked by provider usage policy");
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  let content = "";
  const tool_calls = [];
  for (const item of json.output || []) {
    if (item.type === "message") {
      for (const c of item.content || []) if (c.type === "output_text") content += c.text || "";
    } else if (item.type === "function_call") {
      tool_calls.push({ id: item.call_id, type: "function", function: { name: item.name, arguments: item.arguments || "{}" } });
    }
  }
  const msg = { role: "assistant", content, ...(tool_calls.length ? { tool_calls } : {}) };
  const empty = !tool_calls.length && !content.trim();
  if (json.status === "incomplete" && empty) {
    if (attempt < 1) {
      console.warn(`[agent-runtime] model ${model} (responses) truncated — retrying with larger budget`);
      return callResponsesApi({ model, messages, tools, maxTokens: Math.min(16384, maxTokens * 3) }, attempt + 1);
    }
    throw new Error(`LLM ${model}: truncated with empty output after retry`);
  }
  return msg;
}
async function callApi({
  model,
  messages,
  tools,
  temperature = 0.7,
  maxTokens = 1400,
  jsonMode = false
}, attempt = 0) {
  if (SIM_MODE === "on" || !BASE_URL || !API_KEY) throw new SimulationRequested("simulation mode");
  if (usesResponsesApi(model)) return callResponsesApi({ model, messages, tools, maxTokens });
  const useJson = jsonMode && jsonModeCapable(model) && !(tools && tools.length);
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(useJson ? { response_format: { type: "json_object" } } : {}),
    ...(tools && tools.length ? {
      tools,
      tool_choice: "auto"
    } : {})
  };
  const res = await fetchWithRetry(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000)
  }, model);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 400 && useJson && /response_format|json|format/i.test(text)) {
      NO_JSON_MODE.add(model);
      console.warn(`[agent-runtime] ${model} rejected response_format — retrying without JSON mode`);
      return callApi({ model, messages, tools, temperature, maxTokens, jsonMode: false }, attempt);
    }
    if (isPromptBlocked(res.status, text)) throw new PromptBlocked("prompt blocked by provider usage policy");
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const choice = json.choices?.[0];
  const msg = choice?.message;
  if (!msg) throw new Error("LLM returned no message");
  const empty = !msg.tool_calls?.length && !(msg.content || "").trim();
  if (choice.finish_reason === "length" && empty) {
    if (attempt < 1) {
      console.warn(`[agent-runtime] model ${model} truncated by token limit — retrying with larger budget`);
      return callApi({ model, messages, tools, temperature, maxTokens: Math.min(16384, maxTokens * 3), jsonMode }, attempt + 1);
    }
    throw new Error(`LLM ${model}: truncated with empty output after retry`);
  }
  return msg;
}
export async function chat(opts, simulate) {
  const account = opts.account || accountStore.getStore() || null;
  const models = (Array.isArray(opts.model) ? opts.model : [opts.model]).filter(Boolean);
  if (models.length) for (const f of FALLBACK_MODELS) if (!models.includes(f)) models.push(f);
  let lastErr = new SimulationRequested("no model configured");
  const live = models.filter(m => !breakerOpen(account, m));
  if (!live.length && models.length && SIM_MODE !== "off" && simulate) {
    console.warn(`[agent-runtime] all models circuit-open — using simulation without retry`);
    return {
      message: simulate(opts),
      simulated: true,
      error: "models temporarily circuit-open",
      model: models[0]
    };
  }
  const pool = live.length ? live : models;
  for (const model of pool) {
    try {
      const message = await callApi({
        ...opts,
        model
      });
      breakerOk(account, model);
      return {
        message,
        simulated: false,
        model
      };
    } catch (err) {
      lastErr = err;
      if (err instanceof SimulationRequested) break;
      if (err instanceof PromptBlocked) {
        console.warn(`[agent-runtime] model ${model} blocked the prompt (provider usage policy) — not a model fault, skipping remaining models`);
        break;
      }
      breakerFail(account, model);
      console.warn(`[agent-runtime] model ${model} failed (${err.message})${pool.indexOf(model) < pool.length - 1 ? " — trying next enabled model" : ""}`);
    }
  }
  if (!simulate) throw lastErr;
  if (SIM_MODE === "off" && !(lastErr instanceof PromptBlocked)) throw lastErr;
  if (lastErr instanceof PromptBlocked) {
    console.warn(`[agent-runtime] prompt blocked by provider usage policy — using offline fallback`);
  } else if (!(lastErr instanceof SimulationRequested)) {
    console.warn(`[agent-runtime] all enabled models failed — using simulation`);
  }
  return {
    message: simulate(opts),
    simulated: true,
    error: lastErr instanceof SimulationRequested ? "no model configured" : lastErr instanceof PromptBlocked ? "prompt blocked by provider usage policy" : String(lastErr.message || lastErr).slice(0, 200),
    model: models[0] || null
  };
}
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL_LIMITS } from "./budget.js";
const MODELS_CACHE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "models.json");
let modelsCache = {
  at: 0,
  list: null
};
try {
  modelsCache = JSON.parse(fs.readFileSync(MODELS_CACHE_PATH, "utf8"));
} catch {}
async function probeModel(id) {
  try {
    const res = usesResponsesApi(id) ? await fetch(`${BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: id,
        input: [{
          role: "user",
          content: "OK"
        }],
        max_output_tokens: 16
      }),
      signal: AbortSignal.timeout(30_000)
    }) : await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: id,
        messages: [{
          role: "user",
          content: "OK"
        }],
        max_tokens: 1
      }),
      signal: AbortSignal.timeout(30_000)
    });
    return res.ok || res.status === 429 || res.status === 503;
  } catch {
    return false;
  }
}
export async function listModels() {
  if (modelsCache.list && Date.now() - modelsCache.at < 600_000) return modelsCache.list;
  if (!BASE_URL || !API_KEY) return modelsCache.list;
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: {
        authorization: `Bearer ${API_KEY}`
      },
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) {
      console.warn(`[agent-runtime] MaaS /models → ${res.status} ${(await res.text().catch(() => "")).slice(0, 120)} — serving ${modelsCache.list ? "cached" : "fallback"} list`);
      return modelsCache.list;
    }
    const json = await res.json();
    const raw = Array.isArray(json) ? json : json.data || json.models || [];
    const NON_CHAT = /whisper|embedding|reranker|tts|image|bge|\/idp/i;
    const chat = raw.map(m => ({
      id: m.id || m.model || m.name,
      ownedBy: m.owned_by || String(m.id || m.model || m.name || "").split("/")[0]
    })).filter(m => m.id && !NON_CHAT.test(m.id));
    const known = Object.keys(MODEL_LIMITS).filter(id => !chat.some(m => m.id === id)).map(id => ({
      id,
      ownedBy: id.split("/")[0]
    }));
    const candidates = [...chat, ...known];
    const probes = await Promise.all(candidates.map(m => probeModel(m.id)));
    const list = candidates.filter((_, i) => probes[i]);
    if (!list.length) {
      console.warn(`[agent-runtime] MaaS /models: no callable models (${candidates.length} candidates) — serving ${modelsCache.list ? "cached" : "fallback"} list`);
      return modelsCache.list;
    }
    modelsCache = {
      at: Date.now(),
      list
    };
    fs.writeFileSync(MODELS_CACHE_PATH, JSON.stringify(modelsCache, null, 2));
    console.log(`[agent-runtime] MaaS /models → ${chat.length} in catalog + ${known.length} known extras, ${list.length} callable`);
    return list;
  } catch (err) {
    console.warn(`[agent-runtime] MaaS /models unreachable (${err.message}) — serving ${modelsCache.list ? "cached" : "fallback"} list`);
    return modelsCache.list;
  }
}
const stripReasoning = s => String(s).replace(/<think>[\s\S]*?<\/think>/gi, " ").replace(/<\/?(?:think|reasoning|scratchpad|thought)>/gi, " ");
const cleanJsonish = s => s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/[\u0000-\u001f]+/g, " ").replace(/,\s*([}\]])/g, "$1");
function balancedObjects(text) {
  const objs = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    let depth = 0,
      inStr = false,
      esc = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (c === "{") depth++;else if (c === "}") {
        depth--;
        if (depth === 0) {
          objs.push(text.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return objs;
}
export function extractJson(text) {
  if (!text) return null;
  const cleaned = stripReasoning(text);
  const fences = [...cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m => m[1]);
  const candidates = [];
  for (const src of [...fences, cleaned]) for (const obj of balancedObjects(src)) candidates.push(obj);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.length - a.length);
  for (const c of candidates) {
    let o = null;
    try {
      o = JSON.parse(c);
    } catch {
      try {
        o = JSON.parse(cleanJsonish(c));
      } catch {
        o = null;
      }
    }
    if (o && typeof o === "object" && !Array.isArray(o)) return o;
  }
  return null;
}
