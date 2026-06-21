const PROFILES = {
  "openai/gpt-5": { tier: "frontier", reasoning: 5, quantitative: 5, web: 4, coding: 5, synthesis: 5, vi: 4, speed: 2, cost: 5, rateLimitRisk: 2, jsonNative: false },
  "openai/gpt-5-mini": { tier: "strong", reasoning: 4, quantitative: 4, web: 4, coding: 4, synthesis: 4, vi: 4, speed: 4, cost: 3, rateLimitRisk: 2, jsonNative: false },
  "openai/gpt-5-nano": { tier: "small", reasoning: 2, quantitative: 2, web: 3, coding: 3, synthesis: 2, vi: 3, speed: 5, cost: 1, rateLimitRisk: 1, jsonNative: false },
  "openai/gpt-4o-mini": { tier: "small", reasoning: 2, quantitative: 2, web: 3, coding: 3, synthesis: 2, vi: 3, speed: 5, cost: 1, rateLimitRisk: 1, jsonNative: true },
  "qwen/qwen3.7-plus": { tier: "strong", reasoning: 4, quantitative: 4, web: 3, coding: 4, synthesis: 4, vi: 5, speed: 3, cost: 2, rateLimitRisk: 4, jsonNative: false },
  "qwen/qwen3.6-27b": { tier: "mid", reasoning: 3, quantitative: 3, web: 3, coding: 3, synthesis: 3, vi: 5, speed: 3, cost: 2, rateLimitRisk: 4, jsonNative: false },
  "qwen/qwen3-5-27b": { tier: "mid", reasoning: 3, quantitative: 3, web: 3, coding: 3, synthesis: 3, vi: 5, speed: 3, cost: 2, rateLimitRisk: 4, jsonNative: false },
  "qwen/qwen3-coder-plus": { tier: "coder", reasoning: 3, quantitative: 3, web: 3, coding: 5, synthesis: 3, vi: 4, speed: 3, cost: 2, rateLimitRisk: 3, jsonNative: false },
  "google/gemma-4-31b-it": { tier: "mid", reasoning: 3, quantitative: 2, web: 3, coding: 3, synthesis: 3, vi: 3, speed: 4, cost: 2, rateLimitRisk: 3, jsonNative: false },
  "google/gemma-3-27b-it": { tier: "mid", reasoning: 2, quantitative: 2, web: 3, coding: 2, synthesis: 2, vi: 3, speed: 4, cost: 2, rateLimitRisk: 3, jsonNative: false },
  "minimax/minimax-m2.5": { tier: "mid", reasoning: 3, quantitative: 3, web: 3, coding: 3, synthesis: 3, vi: 3, speed: 3, cost: 2, rateLimitRisk: 4, jsonNative: false },
  "greennode/greenmind-medium-14b-r1": { tier: "small", reasoning: 2, quantitative: 2, web: 2, coding: 2, synthesis: 2, vi: 4, speed: 4, cost: 1, rateLimitRisk: 2, jsonNative: false }
};
const DEFAULT_PROFILE = { tier: "mid", reasoning: 3, quantitative: 3, web: 3, coding: 3, synthesis: 3, vi: 3, speed: 3, cost: 2, rateLimitRisk: 3, jsonNative: false };
const idOf = model => Array.isArray(model) ? model[0] : model;
export function getProfile(model) {
  return PROFILES[idOf(model)] || DEFAULT_PROFILE;
}
export const LENS_CAPABILITY = {
  evidence: "web", research: "web", source: "web", fact: "web", market: "web", trend: "web", news: "web", landscape: "web", signal: "web",
  quantify: "quantitative", number: "quantitative", cost: "quantitative", roi: "quantitative", npv: "quantitative", model: "quantitative", benchmark: "quantitative", metric: "quantitative", pricing: "quantitative", sizing: "quantitative",
  risk: "reasoning", critic: "reasoning", precedent: "reasoning", skeptic: "reasoning", threat: "reasoning", compliance: "reasoning", failure: "reasoning",
  options: "synthesis", alternativ: "synthesis", creative: "synthesis", reframe: "synthesis", idea: "synthesis", synthesize: "synthesis"
};
const TIER_RANK = { small: 0, mid: 1, coder: 1, reasoning: 2, strong: 2, frontier: 3 };
export const tierRank = model => TIER_RANK[getProfile(model).tier] ?? 1;
const SC_SAMPLES = Math.max(2, Math.min(5, Number(process.env.SELF_CONSISTENCY_SAMPLES || 3)));
const SC_TIERS = new Set((process.env.SELF_CONSISTENCY_TIERS || "small").split(",").map(s => s.trim()).filter(Boolean));
export function strategyFor(model, { complexity = "standard", informational = false } = {}) {
  const p = getProfile(model);
  if (SC_TIERS.has(p.tier) && process.env.SELF_CONSISTENCY !== "off") {
    return { mode: "self-consistency", samples: SC_SAMPLES, reason: `${p.tier}-tier model — vote across ${SC_SAMPLES} samples to lift reliability` };
  }
  return { mode: "single" };
}
