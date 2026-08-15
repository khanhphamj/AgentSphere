import { getIamToken, iamCredsPresent } from "./agentbaseMemory.js";

const AIP_MANAGEMENT_URL = (process.env.AIP_MANAGEMENT_URL || "https://aiplatform-hcm.api.vngcloud.vn").replace(/\/$/, "");
const NON_CHAT = /whisper|embedding|reranker|tts|image|bge|\/idp/i;

export async function fetchCatalog() {
  if (!iamCredsPresent()) return null;
  const token = await getIamToken();
  const res = await fetch(`${AIP_MANAGEMENT_URL}/v1/models?page=1&size=200`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000)
  });
  if (!res.ok) throw new Error(`AIP catalog ${res.status}`);
  const json = await res.json();
  const rows = json.listData || json.data || [];
  const CHAT_APIS = ["chat", "responses", "messages"];
  const list = rows
    .filter(r => {
      if (r.isEnabled === false || String(r.modelStatus || "").toUpperCase() === "DISABLED") return false;
      if (!r.path || NON_CHAT.test(r.path)) return false;
      const et = r.enabledTypes && r.enabledTypes.length ? r.enabledTypes : r.types || [];
      return CHAT_APIS.some(t => et.includes(t));
    })
    .map(r => ({ id: r.path, ownedBy: String(r.path).split("/")[0] }));
  return list.length ? list : null;
}
