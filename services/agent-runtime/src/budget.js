const DEFAULT_LIMIT = { context: 8192, maxOutput: 1024 };

export const MODEL_LIMITS = {
  "deepseek/deepseek-v4-pro": { context: 131072, maxOutput: 8192 },
  "deepseek/deepseek-v4-flash": { context: 131072, maxOutput: 8192 },
  "deepseek/deepseek-r1-qwen3-8b": { context: 65536, maxOutput: 8192, reasoning: true },
  "qwen/qwen3-235b-a22b-instruct-2507": { context: 131072, maxOutput: 8192 },
  "qwen/qwen3-235b-a22b-thinking-2507": { context: 131072, maxOutput: 16384, reasoning: true },
  "qwen/qwen3-30b-a3b-thinking-2507": { context: 131072, maxOutput: 16384, reasoning: true },
  "qwen/qwen3-coder-plus": { context: 131072, maxOutput: 8192, reasoning: true },
  "qwen/qwen3-coder-plus-2025-07-22": { context: 131072, maxOutput: 8192, reasoning: true },
  "qwen/qwen3.7-plus": { context: 131072, maxOutput: 8192, reasoning: true },
  "qwen/qwen3.6-27b": { context: 131072, maxOutput: 8192, reasoning: true },
  "qwen/qwen3-5-27b": { context: 131072, maxOutput: 8192, reasoning: true },
  "openai/gpt-5": { context: 131072, maxOutput: 16384, reasoning: true },
  "openai/gpt-5-mini": { context: 131072, maxOutput: 16384, reasoning: true },
  "openai/gpt-5-nano": { context: 131072, maxOutput: 16384, reasoning: true },
  "openai/gpt-4o": { context: 131072, maxOutput: 8192 },
  "openai/gpt-4o-mini": { context: 131072, maxOutput: 8192 },
  "openai/gpt-oss-120b": { context: 131072, maxOutput: 4096 },
  "openai/gpt-oss-20b": { context: 131072, maxOutput: 4096 },
  "google/gemma-3-27b-it": { context: 131072, maxOutput: 8192 },
  "google/gemma-4-31b-it": { context: 131072, maxOutput: 8192 },
  "minimax/minimax-m2.5": { context: 131072, maxOutput: 8192, reasoning: true },
  "greennode/greenmind-medium-14b-r1": { context: 32768, maxOutput: 8192, reasoning: true },
  "gemini/gemini-2.5-pro": { context: 131072, maxOutput: 16384, reasoning: true },
  "gemini/gemini-2.5-flash": { context: 131072, maxOutput: 8192 },
  "gemini/gemini-2.5-flash-lite": { context: 131072, maxOutput: 8192 },
  "gemini/gemini-3.1-pro-preview": { context: 131072, maxOutput: 16384, reasoning: true },
  "bytedance/seed-1-6-250915": { context: 131072, maxOutput: 8192 },
  "bytedance/seed-1-6-flash-250715": { context: 131072, maxOutput: 8192 }
};

export function limitFor(model) {
  return MODEL_LIMITS[model] || DEFAULT_LIMIT;
}

const CHARS_PER_TOKEN = 3;
const MSG_OVERHEAD = 6;
const SAFETY = 0.9;

export const estimateTokens = text => Math.ceil(String(text || "").length / CHARS_PER_TOKEN);

const messageTokens = m => MSG_OVERHEAD + estimateTokens(m.content) + (m.tool_calls ? estimateTokens(JSON.stringify(m.tool_calls)) : 0);

export const estimateMessages = messages => messages.reduce((sum, m) => sum + messageTokens(m), 0);

export function poolLimit(models) {
  const list = (Array.isArray(models) ? models : [models]).filter(Boolean);
  if (!list.length) return { ...DEFAULT_LIMIT, reasoning: false };
  const limits = list.map(limitFor);
  return {
    context: Math.min(...limits.map(l => l.context)),
    maxOutput: Math.min(...limits.map(l => l.maxOutput)),
    reasoning: !!limitFor(list[0]).reasoning
  };
}

const OUTPUT_TARGET = {
  run: { plain: 900, reasoning: 3000 },
  meeting: { plain: 500, reasoning: 2200 },
  plan: { plain: 300, reasoning: 1600 },
  verify: { plain: 600, reasoning: 2400 },
  lead: { plain: 250, reasoning: 1400 },
  review: { plain: 300, reasoning: 1600 },
  report: { plain: 2200, reasoning: 5000 }
};

export function budgetFor(models, task) {
  const pool = poolLimit(models);
  const target = OUTPUT_TARGET[task] || OUTPUT_TARGET.run;
  const maxTokens = Math.min(pool.reasoning ? target.reasoning : target.plain, pool.maxOutput);
  const input = Math.floor(pool.context * SAFETY) - maxTokens;
  return {
    maxTokens,
    input,
    temperature: pool.reasoning || task === "meeting" ? 0.6 : 0.7,
    toolRounds: pool.context <= 16384 ? 2 : 4,
    toolCallsPerRound: 5,
    toolResultChars: Math.max(800, Math.min(14000, Math.floor(input * CHARS_PER_TOKEN / (2 * 5 + 3))))
  };
}

export function clampMessages(messages, inputBudget) {
  if (estimateMessages(messages) <= inputBudget) return messages;
  const out = messages.map(m => ({ ...m }));
  for (const cap of [1500, 600, 240]) {
    for (const m of out) {
      if (m.role === "tool" && m.content?.length > cap) m.content = m.content.slice(0, cap) + "…";
    }
    if (estimateMessages(out) <= inputBudget) return out;
  }
  for (const m of out) {
    if (m.role === "assistant" && m.content?.length > 1000) m.content = m.content.slice(0, 1000) + "…";
  }
  return out;
}

const clip = (s, n) => {
  const t = String(s ?? "").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
};

const RUN_STANCES = ["support", "oppose", "conditional", "insufficient"];
export function clampRunOutput(parsed) {
  if (!parsed) return parsed;
  return {
    ...parsed,
    stance: RUN_STANCES.includes(parsed.stance) ? parsed.stance : "conditional",
    say: clip(parsed.say, 120),
    summary: clip(parsed.summary, 700),
    keyPoints: (parsed.keyPoints || []).slice(0, 5).map(k => clip(k, 90)),
    insufficientReason: parsed.insufficientReason ? clip(parsed.insufficientReason, 140) : undefined,
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 70))
  };
}

export function clampTurnOutput(parsed) {
  if (!parsed) return parsed;
  return {
    ...parsed,
    say: clip(parsed.say, 130),
    argument: clip(parsed.argument, 400)
  };
}
