export const DEFAULT_SQUAD = [{
  id: "atlas",
  role: "orchestrator",
  lead: true,
  name: "Orchestrator Agent",
  provider: "qwen",
  models: ["qwen/qwen3.7-plus"]
}, {
  id: "nova",
  role: "research",
  name: "Research Agent",
  provider: "google",
  models: ["google/gemma-3-27b-it"]
}, {
  id: "quill",
  role: "analyst",
  name: "Analyst Agent",
  provider: "openai",
  models: ["openai/gpt-4o-mini"]
}, {
  id: "lumi",
  role: "critic",
  name: "Critic Agent",
  provider: "minimax",
  models: ["minimax/minimax-m2.5"]
}, {
  id: "echo",
  role: "creative",
  name: "Creative Agent",
  provider: "qwen",
  models: ["qwen/qwen3-5-27b"]
}, {
  id: "pixel",
  role: "reporter",
  name: "Reporter Agent",
  provider: "google",
  models: ["google/gemma-4-31b-it"]
}].map(a => ({
  ...a,
  model: a.models[0]
}));
let squad = DEFAULT_SQUAD.map(a => ({
  ...a,
  models: [...a.models]
}));
export function getSquad() {
  return squad;
}
export function setSquad(update) {
  if (!Array.isArray(update)) return squad;
  squad = squad.map(a => {
    const u = update.find(x => x.id === a.id);
    if (!u) return a;
    const models = Array.isArray(u.models) && u.models.length ? u.models : u.model ? [u.model] : a.models;
    return {
      ...a,
      name: u.name ?? a.name,
      models,
      model: models[0],
      provider: u.provider ?? a.provider,
      mandate: u.mandate !== undefined ? String(u.mandate).slice(0, 240).trim() : a.mandate
    };
  });
  return squad;
}
export const byRole = role => getSquad().find(a => a.role === role);
