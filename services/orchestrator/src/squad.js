export const DEFAULT_SQUAD = [{
  id: "atlas",
  role: "orchestrator",
  lead: true,
  name: "Atlas",
  provider: "openai",
  models: ["openai/gpt-5-mini"]
}, {
  id: "nova",
  role: "worker",
  name: "Nova",
  provider: "google",
  models: ["google/gemma-4-31b-it"]
}, {
  id: "quill",
  role: "worker",
  name: "Quill",
  provider: "qwen",
  models: ["qwen/qwen3.6-27b"]
}, {
  id: "lumi",
  role: "worker",
  name: "Lumi",
  provider: "qwen",
  models: ["qwen/qwen3.7-plus"]
}, {
  id: "echo",
  role: "worker",
  name: "Echo",
  provider: "openai",
  models: ["openai/gpt-5-nano"]
}, {
  id: "pixel",
  role: "worker",
  name: "Pixel",
  provider: "minimax",
  models: ["minimax/minimax-m2.5"]
}].map(a => ({
  ...a,
  model: a.models[0]
}));
const clone = sq => sq.map(a => ({
  ...a,
  models: [...a.models]
}));
export function buildSquad(update, base = DEFAULT_SQUAD) {
  const out = clone(base);
  if (!Array.isArray(update)) return out;
  return out.map(a => {
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
}
const squads = new Map();
const keyOf = email => (email || "").toLowerCase().trim();
export function getSquadFor(email) {
  return clone(squads.get(keyOf(email)) || DEFAULT_SQUAD);
}
export function setSquadFor(email, update) {
  const k = keyOf(email);
  const next = buildSquad(update, squads.get(k) || DEFAULT_SQUAD);
  squads.set(k, next);
  return next;
}
export function loadSquadInto(email, squad) {
  if (Array.isArray(squad)) squads.set(keyOf(email), buildSquad(squad));
}
export const leadOf = squad => (squad || DEFAULT_SQUAD).find(a => a.lead) || (squad || DEFAULT_SQUAD)[0];
export const poolOf = squad => (squad || DEFAULT_SQUAD).filter(a => !a.lead);
export const byRoleIn = (squad, role) => (squad || DEFAULT_SQUAD).find(a => a.role === role);
