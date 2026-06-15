import express from "express";
import cors from "cors";
import { chat, extractJson, listModels, SIM_FORCED } from "./llm.js";
import { executeTool } from "./tools.js";
import { PERSONAS, planPrompt, leadAnswerPrompt, reviewPrompt, runPrompt, meetingPrompt, verifyPrompt, reportPrompt, simulate } from "./prompts.js";
import { planByCode, triageByCode, decideConsensus, assembleReport, buildSources, clampWords, SPECIALISTS } from "./harness.js";
import { budgetFor, clampMessages, clampRunOutput, clampTurnOutput, MODEL_LIMITS } from "./budget.js";
import { loadLongTerm, shortTerm, memoryContext, remember, consolidate } from "./memory.js";
import { health as memoryHealth, memoryConfigured } from "./agentbaseMemory.js";
const PORT = Number(process.env.AGENT_RUNTIME_PORT || 8082);
const trimToolResult = r => {
  if (r == null || typeof r !== "object") return r;
  if (Array.isArray(r.results)) return {
    query: r.query,
    source: r.source,
    dropped: r.dropped,
    lowRelevance: r.lowRelevance,
    ...(r.answer ? { answer: String(r.answer).slice(0, 600) } : {}),
    results: r.results.slice(0, 5).map(x => x && typeof x === "object" ? {
      title: typeof x.title === "string" ? x.title.slice(0, 140) : x.title,
      url: x.url,
      host: x.host,
      published: x.published,
      snippet: typeof x.snippet === "string" ? x.snippet.slice(0, 180) : x.snippet,
      ...(x.content ? { content: String(x.content).slice(0, 700) } : {})
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
const internalHeaders = {
  "content-type": "application/json",
  "x-client-id": CLIENT_ID,
  "x-client-secret": CLIENT_SECRET
};
function internalAuth(req, res, next) {
  if (!CLIENT_ID) return next();
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
function toolDefs(grants) {
  const defs = [];
  for (const s of grants.servers) for (const t of s.tools) {
    defs.push({
      type: "function",
      function: {
        name: encodeTool(s.id, t.name),
        description: `[${s.label}] ${t.description}`,
        parameters: {
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
  return defs;
}
async function runWithTools({
  role,
  model,
  system,
  user,
  grants,
  budget,
  forceTool,
  onTool
}) {
  const tools = toolDefs(grants);
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
      toolChoice: round === 0 ? forceTool : undefined,
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
      const decoded = decodeTool(grants, tc.function?.name || "");
      let result;
      if (!decoded) {
        result = {
          error: "unknown tool"
        };
        toolLog.push({
          server: "?",
          tool: tc.function?.name,
          allowed: false,
          reason: "not in grants"
        });
      } else {
        const auth = await authorize(role, decoded.server, decoded.tool);
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {}
        if (!auth.allowed) {
          result = {
            error: `denied by policy: ${auth.reason}`
          };
          toolLog.push({
            ...decoded,
            args,
            allowed: false,
            reason: auth.reason
          });
        } else {
          result = await executeTool(decoded.server, decoded.tool, args);
          toolLog.push({
            ...decoded,
            args,
            allowed: true,
            result: trimToolResult(result)
          });
          if (onTool) onTool(decoded, result);
        }
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result).slice(0, budget.toolResultChars)
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
  limit: "1mb"
}));
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
  let assessment = null;
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
        content: PERSONAS.orchestrator
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
    const roles = [...new Set((parsed?.roles || []).filter(r => SPECIALISTS.includes(r)))];
    const chosenRoles = roles.length ? roles : informational ? ["research"] : roles;
    if (chosenRoles.length) {
      const titles = {};
      for (const s of parsed.subtasks || []) {
        if (chosenRoles.includes(s.role) && s.title) titles[s.role] = String(s.title).trim().slice(0, 90);
      }
      assessment = {
        type: "work",
        informational,
        complexity: informational ? "simple" : parsed.complexity === "simple" ? "simple" : "standard",
        roles: chosenRoles,
        titles,
        reason: String(parsed.reason || "").slice(0, 160),
        handler: "model"
      };
    }
  }
  const fallback = assessment ? null : triageByCode(title, language);
  const plan = planByCode({
    title,
    language,
    roles: assessment?.roles || fallback?.roles,
    titles: assessment?.titles
  });
  res.json({
    ...plan,
    assessment: assessment || {
      type: "work",
      informational: fallback.informational,
      complexity: fallback.informational ? "simple" : "standard",
      roles: fallback.roles,
      reason: "",
      handler: "code"
    }
  });
});
app.post("/review", internalAuth, async (req, res) => {
  const {
    agent = {},
    missionTitle,
    subtask,
    output,
    language = "en"
  } = req.body || {};
  if (!missionTitle || !output?.summary) return res.status(400).json({
    error: "missionTitle, output required"
  });
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "review");
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
      content: reviewPrompt({
        missionTitle,
        subtask: subtask || missionTitle,
        output,
        language
      })
    }],
    temperature: 0.3,
    maxTokens: budget.maxTokens
  }, () => null);
  const parsed = !simulated && message ? extractJson(message.content) : null;
  if (!parsed || typeof parsed.pass !== "boolean") return res.json({
    pass: true,
    feedback: "",
    skipped: true
  });
  res.json({
    pass: parsed.pass,
    feedback: parsed.pass ? "" : String(parsed.feedback || "").slice(0, 200)
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
    role,
    agent = {},
    subtask = {},
    missionTitle,
    context = "",
    informational = false,
    userEmail = null,
    language = "en"
  } = req.body || {};
  if (!role || !missionTitle) return res.status(400).json({
    error: "role, missionTitle required"
  });
  const grants = await getGrants(role);
  const agentId = agent.id || role;
  const memBudget = req.body?.complexity === "standard" ? 1800 : 900;
  const mem = await memoryContext(missionId, agentId, memBudget, { userEmail, query: missionTitle });
  const mandate = agent.mandate ? `\nStanding mandate from your director (follow it unless it conflicts with the honesty/evidence rules above): "${agent.mandate}"` : "";
  const system = `${PERSONAS[role] || PERSONAS.research}\nYour in-world name is "${agent.name || role}".${mandate}${mem ? `\n${mem}` : ""}`;
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "run");
  const user = runPrompt({
    role,
    missionTitle,
    subtask,
    context: String(context).slice(0, 3600),
    language
  });
  const QUANT = /(đầu tư|invest|tiết kiệm|saving|cổ phiếu|stock|lãi|lời|profit|gửi.*ngân hàng|mỗi tháng.*(k|nghìn|triệu|usd|đồng))/i;
  const hasTool = (server, tool) => grants.servers.some(s => s.id === server && s.tools.some(t => t.name === tool));
  const forceTool = role === "analyst" && !informational && QUANT.test(missionTitle) && hasTool("mcp-data", "data.simulate") ? encodeTool("mcp-data", "data.simulate") : role === "research" && hasTool("mcp-web", "web.search") ? encodeTool("mcp-web", "web.search") : undefined;
  const {
    content,
    toolLog,
    simulated,
    error
  } = await runWithTools({
    role,
    model: models,
    system,
    user,
    grants,
    budget,
    forceTool,
    onTool: (decoded, result) => remember(missionId, agentId, "data", `${decoded.server}/${decoded.tool} → ${JSON.stringify(result)}`)
  });
  let parsed = content ? extractJson(content) : null;
  if (parsed?.questionForLead && !context) {
    return res.json({
      missionId,
      role,
      questionForLead: String(parsed.questionForLead).slice(0, 160),
      toolCalls: toolLog,
      simulated: false
    });
  }
  let finalToolLog = toolLog;
  if (!parsed && content && !error) {
    const retryNotes = await memoryContext(missionId, agentId, 2400, { userEmail, query: missionTitle });
    const {
      message: retryMsg
    } = await chat({
      model: models,
      messages: [{
        role: "system",
        content: `${PERSONAS[role] || PERSONAS.research}\nReturn ONLY one JSON object, no prose, no <think>, no markdown fences.`
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
      role,
      failed: true,
      error: (error || (content ? "model answered in an unusable format" : "model unreachable")).slice(0, 200),
      toolCalls: toolLog,
      simulated: true
    });
  }
  if (!parsed) {
    parsed = simulate("run", {
      role,
      missionTitle,
      language
    });
    if (!toolLog.length) finalToolLog = await simulatedToolTrace(role, grants, missionTitle);
  }
  parsed = clampRunOutput(parsed);
  if (parsed.stance === "insufficient") {
    const attempted = finalToolLog.length > 0;
    const gotData = finalToolLog.some(tc => tc.allowed && tc.result && !tc.result.error);
    if (!attempted || gotData) parsed.stance = "conditional";else parsed.confidence = Math.min(parsed.confidence, 40);
  }
  for (const tc of finalToolLog) remember(missionId, agentId, "tool", `${tc.server}/${tc.tool} ${tc.allowed ? "ok" : "denied"}`);
  remember(missionId, agentId, "conclusion", `${parsed.stance || "done"} (${parsed.confidence ?? "?"}%) — ${parsed.summary || parsed.say || ""}`);
  res.json({
    missionId,
    role,
    policyGroup: grants.policyGroup,
    ...parsed,
    toolCalls: finalToolLog,
    simulated: simulated || !content
  });
});
app.post("/meeting-turn", internalAuth, async (req, res) => {
  const {
    missionId,
    role,
    agent = {},
    missionTitle,
    position,
    others = [],
    round = 1,
    directorNote = "",
    userEmail = null,
    language = "en"
  } = req.body || {};
  if (!role || !missionTitle || !position) return res.status(400).json({
    error: "role, missionTitle, position required"
  });
  const agentId = agent.id || role;
  const mem = await memoryContext(missionId, agentId, req.body?.complexity === "standard" ? 1400 : 700, { userEmail, query: missionTitle });
  const models = agent.models?.length ? agent.models : agent.model || "openai/gpt-4o-mini";
  const budget = budgetFor(models, "meeting");
  const {
    message
  } = await chat({
    model: models,
    messages: clampMessages([{
      role: "system",
      content: `${PERSONAS[role] || PERSONAS.research}\nYour in-world name is "${agent.name || role}".${mem ? `\n${mem}` : ""}`
    }, {
      role: "user",
      content: meetingPrompt({
        role,
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
      role,
      missionTitle,
      round,
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
  res.json({
    source: live ? "maas" : "fallback",
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
  const agentId = agent.id || "critic";
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
      content: `${PERSONAS.critic}\nYour in-world name is "${agent.name || "Critic"}".`
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
  const roles = new Set(outputs.map(o => o.role));
  const asList = v => Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  const verdictList = Array.isArray(parsed?.verdicts) ? parsed.verdicts : [];
  const byRole = new Map();
  for (const v of verdictList) {
    if (!v || !roles.has(v.role)) continue;
    byRole.set(v.role, {
      role: v.role,
      flagged: asList(v.flagged).slice(0, 3).map(f => clip(f, 120)).filter(Boolean),
      confidenceAdjust: Math.max(-30, Math.min(0, Number(v.confidenceAdjust) || 0)),
      note: clip(v.note, 160)
    });
  }
  for (const o of enriched) {
    if (o.role !== "research" && o.role !== "analyst") continue;
    const figs = uncitedFigures(o, o.evidence);
    if (!figs.length) continue;
    const autoFlags = figs.map(f => `${vi ? "số" : "figure"} "${f}" ${vi ? "không thấy trong dữ liệu đã thu thập" : "not in gathered evidence"}`);
    const ex = byRole.get(o.role);
    if (ex) {
      ex.flagged = [...new Set([...ex.flagged, ...autoFlags])].slice(0, 3);
      ex.confidenceAdjust = Math.max(-30, Math.min(ex.confidenceAdjust, -6 * figs.length));
    } else {
      byRole.set(o.role, { role: o.role, flagged: autoFlags, confidenceAdjust: -Math.min(12, 6 * figs.length), note: vi ? "Số liệu chưa có nguồn (tự kiểm)" : "Unsourced figures (auto-check)" });
    }
  }
  const verdicts = [...byRole.values()].filter(v => v.flagged.length);
  if (verdicts.length) remember(missionId, agentId, "verify", `flagged ${verdicts.map(v => v.role).join(", ")}`);
  res.json({
    verdicts,
    simulated: simulated || !parsed
  });
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
  const dataNotes = outputs.flatMap(o => shortTerm(missionId, o.agentId).filter(n => n.kind === "data").map(n => `- [${o.role}] ${n.text}`));
  if (!SIM_FORCED && models && outputs.length) {
    const budget = budgetFor(models, "report");
    const {
      message
    } = await chat({
      model: models,
      messages: clampMessages([{
        role: "system",
        content: `${PERSONAS.reporter}\nYour in-world name is "${agent.name || "Reporter"}".`
      }, {
        role: "user",
        content: reportPrompt({
          missionTitle,
          outputs,
          meeting,
          dataNotes,
          informational,
          language
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
      if (flagged.length && !body.includes("⚑")) body += `\n\n## ${vi ? "Kiểm chứng — Critic" : "Verification — Critic"}\n${flagged.map(o => `**${o.name || o.role}**${o.verifyNote ? ` — ${o.verifyNote}` : ""}\n${o.flags.map(f => `- ⚑ ${f}`).join("\n")}`).join("\n")}`;
      if (!informational && code.confidenceRationale && !/confidence basis|cơ sở đánh giá/i.test(body)) body += `\n\n_${vi ? "Cơ sở đánh giá" : "Confidence basis"}: ${code.confidenceRationale}._`;
      report = {
        markdown: body,
        recommendation: clampWords(stripConfidenceLine(String(parsed.recommendation), null, language).trim(), 200) || code.recommendation,
        confidence: code.confidence,
        say: code.say,
        composed: "model"
      };
    }
  }
  const sources = buildSources(dataNotes, language);
  if (sources) report.markdown += `\n\n${sources}`;
  res.json(report);
});
app.use((err, _req, res, _next) => {
  console.error("[agent-runtime] request error:", err?.message || err);
  if (!res.headersSent) res.status(500).json({ error: "internal error", detail: String(err?.message || err).slice(0, 200) });
});
app.listen(PORT, () => console.log(`[agent-runtime] listening on :${PORT} (policy: ${POLICY_URL})`));
