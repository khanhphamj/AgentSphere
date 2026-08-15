export const PROVIDERS = {
  deepseek: { label: "deepseek", color: "#4D6BFE", soft: "#E0E6FF" },
  qwen: { label: "qwen", color: "#7C5CE0", soft: "#EAE3FB" },
  openai: { label: "openai", color: "#0FA47F", soft: "#D9F2EA" },
  microsoft: { label: "microsoft", color: "#2563EB", soft: "#DBEAFE" },
  greennode: { label: "greennode", color: "#1F8A48", soft: "#D9F2E4" },
  google: { label: "google", color: "#4285F4", soft: "#DCE8FC" },
  gemini: { label: "gemini", color: "#7B61FF", soft: "#E8E3FF" },
  bytedance: { label: "bytedance", color: "#00B2C2", soft: "#D8F4F7" },
  minimax: { label: "minimax", color: "#E0457B", soft: "#FBDFEA" },
  kimi: { label: "kimi", color: "#16161A", soft: "#E9E9EE" },
  "z-ai": { label: "z.ai", color: "#3B3F46", soft: "#E7E9ED" },
  anthropic: { label: "anthropic", color: "#C96342", soft: "#F7E3DB" }
};

export function providerOf(modelId) {
  const org = (modelId || "").split("/")[0].toLowerCase();
  if (org.startsWith("deepseek")) return "deepseek";
  if (org === "qwen") return "qwen";
  if (org === "openai") return "openai";
  if (org === "microsoft") return "microsoft";
  if (org === "greennode") return "greennode";
  if (org === "google") return "google";
  if (org === "gemini") return "gemini";
  if (org === "bytedance") return "bytedance";
  if (org.startsWith("minimax")) return "minimax";
  if (org === "kimi" || org === "moonshot") return "kimi";
  if (org === "z-ai" || org === "zai" || org === "zhipu") return "z-ai";
  if (org === "anthropic") return "anthropic";
  return "greennode";
}

export const MODELS = [
  { value: "qwen/qwen3.7-plus", provider: "qwen" },
  { value: "qwen/qwen3.6-27b", provider: "qwen" },
  { value: "qwen/qwen3-5-27b", provider: "qwen" },
  { value: "qwen/qwen3-coder-plus", provider: "qwen" },
  { value: "openai/gpt-4o-mini", provider: "openai" },
  { value: "openai/gpt-5", provider: "openai" },
  { value: "openai/gpt-5-mini", provider: "openai" },
  { value: "openai/gpt-5-nano", provider: "openai" },
  { value: "gemini/gemini-3-flash-preview", provider: "gemini" },
  { value: "gemini/gemini-3.1-flash-lite", provider: "gemini" },
  { value: "gemini/gemini-2.5-flash", provider: "gemini" },
  { value: "gemini/gemini-2.5-flash-lite", provider: "gemini" },
  { value: "kimi/kimi-k2.6", provider: "kimi" },
  { value: "kimi/kimi-k2.7-code", provider: "kimi" },
  { value: "z-ai/glm-5.2", provider: "z-ai" },
  { value: "minimax/minimax-m3", provider: "minimax" },
  { value: "deepseek/deepseek-v4-flash", provider: "deepseek" },
  { value: "deepseek/deepseek-chat", provider: "deepseek" },
  { value: "google/gemma-3-27b-it", provider: "google" },
  { value: "google/gemma-4-31b-it", provider: "google" },
  { value: "minimax/minimax-m2.5", provider: "minimax" },
  { value: "greennode/greenmind-medium-14b-r1", provider: "greennode" }
];

export function humanizeModelError(err) {
  const s = String(err || "");
  if (/403|access denied|quota|credit|budget/i.test(s)) return "model access blocked (quota/credit — 403)";
  if (/429|rate.?limit/i.test(s)) return "model rate-limited (429)";
  if (/timeout|timed out|abort/i.test(s)) return "model timed out";
  if (/unreachable|fetch failed|network|ENOTFOUND|ECONN/i.test(s)) return "model unreachable";
  if (/unusable format|truncated/i.test(s)) return "model answered in an unusable format";
  const m = s.match(/LLM \d+:\s*(.{1,80})/);
  return (m ? m[1].trim() : s.replace(/[{}"]/g, "").slice(0, 90).trim()) || "model error";
}

export const AGENTS = [
  {
    id: "atlas", name: "Atlas", lead: true, role: "Lead orchestrator",
    provider: "openai", model: "openai/gpt-5", models: ["openai/gpt-5"], agentRole: "orchestrator", policyRole: "orchestrator",
    home: "office", desk: { x: 10, y: 14 },
    palette: { shirt: "#4D6BFE", hair: "#3A2E28", skin: "#EFC9A8" },
    skills: ["Planning", "Phasing", "Check & synthesis"],
    bio: "The lead. Splits a mission into phases, hands each worker a concrete focus, then after every phase checks the findings, synthesizes them, and decides whether the squad needs another phase. Writes the final report. Uses no tools itself."
  },
  {
    id: "nova", name: "Nova", role: "Generalist agent",
    provider: "google", model: "google/gemma-4-31b-it", models: ["google/gemma-4-31b-it"], agentRole: "research", policyRole: "worker",
    home: "office", desk: { x: 14, y: 14 },
    palette: { shirt: "#7C5CE0", hair: "#6B4A2F", skin: "#F2D3B3" },
    skills: ["Web & sources", "Data & models", "Risk & options"],
    bio: "A generalist worker. Takes whatever focus the lead assigns each phase — facts, numbers, risks or alternatives — with the full toolbox, builds on what teammates found, and grounds every claim."
  },
  {
    id: "quill", name: "Quill", role: "Generalist agent",
    provider: "qwen", model: "qwen/qwen3.6-27b", models: ["qwen/qwen3.6-27b"], agentRole: "analyst", policyRole: "worker",
    home: "office", desk: { x: 18, y: 14 },
    palette: { shirt: "#4D6BFE", hair: "#26221F", skin: "#E8BD96" },
    skills: ["Web & sources", "Data & models", "Risk & options"],
    bio: "A generalist worker. Takes whatever focus the lead assigns each phase, runs in parallel with the squad, and exchanges notes with teammates before finalizing its conclusion."
  },
  {
    id: "lumi", name: "Lumi", role: "Generalist agent",
    provider: "qwen", model: "qwen/qwen3.7-plus", models: ["qwen/qwen3.7-plus"], agentRole: "critic", policyRole: "worker",
    home: "office", desk: { x: 10, y: 18 },
    palette: { shirt: "#0FA47F", hair: "#4A3B66", skin: "#F4D8BE" },
    skills: ["Web & sources", "Data & models", "Risk & options"],
    bio: "A generalist worker. Equally at home gathering evidence, stress-testing risks, or quantifying trade-offs — whatever the phase's focus calls for."
  },
  {
    id: "echo", name: "Echo", role: "Generalist agent",
    provider: "openai", model: "openai/gpt-5-nano", models: ["openai/gpt-5-nano"], agentRole: "creative", policyRole: "worker",
    home: "office", desk: { x: 14, y: 18 },
    palette: { shirt: "#2563EB", hair: "#7A2E45", skin: "#EFC9A8" },
    skills: ["Web & sources", "Data & models", "Risk & options"],
    bio: "A generalist worker. Picks up any assignment the lead hands out, reads the shared blackboard, and reconciles with peers before concluding."
  },
  {
    id: "pixel", name: "Pixel", role: "Generalist agent",
    provider: "minimax", model: "minimax/minimax-m2.5", models: ["minimax/minimax-m2.5"], agentRole: "reporter", policyRole: "worker",
    home: "office", desk: { x: 18, y: 18 },
    palette: { shirt: "#1F8A48", hair: "#1F1B18", skin: "#E8BD96" },
    skills: ["Web & sources", "Data & models", "Risk & options"],
    bio: "A generalist worker. Takes whatever focus the lead assigns each phase and grounds every figure and source in a real tool result."
  }
];

export const TEAMS = [
  { id: "core", members: ["atlas", "nova", "pixel"], zone: "office" },
  { id: "research", members: ["quill", "lumi"], zone: "lab" },
  { id: "content", members: ["echo"], zone: "library" }
];

export const PLACES = {
  office: { label: "Văn Phòng 02 — The Loop", door: { x: 15, y: 22 } },
  courtyard: { label: "Seating Area", door: { x: 31, y: 13 }, spots: [{ x: 30, y: 16 }, { x: 32, y: 16 }, { x: 30, y: 19 }, { x: 32, y: 19 }, { x: 31, y: 20 }] },
  atrium: { label: "Atrium", door: { x: 41, y: 12 }, spots: [{ x: 40, y: 16 }, { x: 43, y: 16 }, { x: 40, y: 18 }, { x: 43, y: 18 }, { x: 41, y: 19 }, { x: 42, y: 14 }] },
  lobby: { label: "Main Lobby", door: { x: 44, y: 29 }, spots: [{ x: 41, y: 27 }, { x: 43, y: 27 }, { x: 46, y: 27 }, { x: 42, y: 28 }, { x: 45, y: 26 }] },
  cafe: { label: "Pantry", door: { x: 54, y: 16 }, spots: [{ x: 55, y: 17 }, { x: 56, y: 17 }, { x: 57, y: 17 }, { x: 55, y: 18 }] },
  gym: { label: "Phòng Đa Năng — Gym", door: { x: 54, y: 26 }, spots: [{ x: 56, y: 24, ex: "pullup" }, { x: 57, y: 26, ex: "bench" }, { x: 55, y: 26, ex: "run" }, { x: 56, y: 27, ex: "weights" }, { x: 55, y: 28, ex: "pushup" }] },
  pool: { label: "Swimming Pool", door: { x: 59, y: 13 }, spots: [{ x: 55, y: 12 }, { x: 58, y: 12 }, { x: 53, y: 6 }, { x: 61, y: 8 }] },
  park: { label: "Cây Lộc Vừng", door: { x: 5, y: 28 }, spots: [{ x: 4, y: 24 }, { x: 7, y: 24 }, { x: 4, y: 27 }, { x: 7, y: 27 }] },
  store: { label: "7-Eleven", door: { x: 8, y: 26 }, spots: [{ x: 9, y: 26 }, { x: 10, y: 25 }] },
  game: { label: "Game Corner", door: { x: 41, y: 10 }, spots: [{ x: 37, y: 9 }, { x: 39, y: 9 }, { x: 41, y: 9 }, { x: 43, y: 9 }, { x: 45, y: 9 }] },
  court: { label: "Basketball", door: { x: 6, y: 38 }, spots: [{ x: 5, y: 35 }, { x: 8, y: 36 }, { x: 6, y: 37 }] },
  meeting: { label: "Meeting Room", door: { x: 39, y: 7 }, spots: [{ x: 37, y: 5 }, { x: 41, y: 5 }, { x: 37, y: 6 }, { x: 38, y: 6 }, { x: 40, y: 6 }, { x: 41, y: 6 }] }
};

export const AMBIENT_CHAT = [
  "Context window feels roomy today.",
  "Just finished indexing 2,547 chunks.",
  "P95 is at 142ms — looking good.",
  "This coffee has strong embeddings.",
  "Pickup football on the pitch later?",
  "A park walk to lower my temperature.",
  "We're under token budget this month.",
  "New benchmark run finished — clean results.",
  "Fresh MaaS release — inference feels snappier."
];

export const AMBIENT_WORK = [
  "Refactoring the retrieval module…",
  "Writing test cases…",
  "Summarizing the Q2 report…",
  "Rebuilding the dashboard…",
  "Reading the architecture docs…",
  "Evaluating 3 options…"
];

export const HUDDLES = [
  { places: ["cafe"], lines: [
    "Heard the new build cut latency 18%?",
    "Yeah — the new KV cache. Impressive stuff.",
    "I'll send you my benchmark notes later.",
    "Deal. This coffee has dense embeddings."
  ] },
  { places: ["courtyard"], lines: [
    "These sofas beat any standing desk.",
    "Good call. My context is almost full.",
    "A quick compaction after this and I'm fresh.",
    "The atrium tree fine-tunes the soul."
  ] },
  { places: ["atrium", "lobby"], lines: [
    "Have you seen the lộc vừng blooming?",
    "Pink tassels everywhere — great photo op.",
    "The skylight makes the island tree glow.",
    "One more lap, then back to deploys."
  ] },
  { places: ["lobby"], lines: [
    "Quick five-minute sync on the subtasks.",
    "OK. I'm stuck on the schema bit.",
    "I'll reshare the architecture doc.",
    "With the doc it's a quick fix. Thanks!"
  ] },
  { places: ["cafe", "lobby"], lines: [
    "This sprint is intense. Fun though.",
    "Yeah — as long as we're under token budget.",
    "The Critic's been razor-sharp lately.",
    "That's how the good calls get made."
  ] }
];

export const AMBIENT_DUO = [
  ["Cà phê pantry không?", "5 phút nữa nhé."],
  ["Demo hồi nãy mượt thật.", "Nhờ retry logic đó."],
  ["Atrium hôm nay mát ghê.", "Cây lộc vừng ra hoa kìa."],
  ["Trưa nay ghé 7-Eleven nha?", "Ok, tiện lấy thêm cà phê sữa."],
  ["P95 sáng nay còn 140ms.", "Đẹp. Giữ vậy tới lúc release nhé."],
  ["Game Corner làm ván không?", "Thua thì dọn blackboard đó nha."],
  ["Hồ bơi giờ này vắng lắm.", "Tan ca mình bơi vài vòng đi."],
  ["Token budget tháng này sao rồi?", "Còn dư 12% — thoải mái."],
  ["Mission sáng chạy ổn không?", "Một phase là xong, lead khen nữa."],
  ["Benchmark mới vừa drop đó.", "Để mình chạy thử trên staging."],
  ["Ghế seating area êm thiệt.", "Ngồi đây compact context là khỏe liền."],
  ["Chiều đi gym không?", "Giữ giùm mình cái treadmill nhé."],
  ["Lobby treo chữ WE ARE VNG đỏ rực kìa.", "Chụp một tấm làm avatar thôi."],
  ["Web search hôm nay lẹ ghê.", "Cache vừa được warm lại đó."]
];

export const CRASH_ERRORS = [
  "RuntimeError: context window overflow",
  "429 — rate limit exceeded",
  "CUDA out of memory on the GPU node",
  "Timeout: no response from the model"
];

export const BACK_ONLINE = [
  "Back online! Checkpoint restored ✓",
  "Recovery complete. Back to work ✓"
];

export const STR = {
  appName: "AgentSphere",
  worldName: "VNG Campus",
  dock: {
    agents: "Agents",
    activity: "Activity",
    tasks: "Missions",
    inbox: "Inbox",
    mission: "New task"
  },
  guide: {
    title: "Your squad is ready",
    line: "Ask a decision — the squad researches, debates, and returns one recommendation.",
    examples: [
      "Nên chọn Postgres hay MongoDB cho log 50GB/ngày?",
      "Slack vs Zalo cho team 12 người?",
      "Có nên mở POD service mới ở HCM?"
    ]
  },
  theme: {
    toDark: "Switch to dark mode",
    toLight: "Switch to light mode"
  },
  status: {
    working: "Working",
    moving: "Moving",
    meeting: "In a meeting",
    social: "On a break",
    idle: "Idle",
    down: "Crashed",
    reviving: "Reviving"
  },
  panel: {
    agents: "Agent dashboard",
    activity: "Live activity",
    mission: "New task",
    missionDesc: "Ask a question or state a decision. The Orchestrator splits the work into phases, the agents run in parallel and exchange information, then return ONE clear recommendation with confidence + sources.",
    missionPh: "e.g. Should the company go remote-first?",
    missionExamples: ["Should the company go remote-first?", "What are the best open-source LLMs right now?", "Risks of betting the budget on one AI product?", "Build our own payments or buy a solution?"],
    composeHint: "Suggestions — tap to use",
    composeHelp: {
      title: "How it works",
      steps: ["State a question or a decision to make.", "The lead splits the work into phases → agents run in parallel & exchange notes → the lead checks and synthesizes → (a debate if stances conflict) → report (a few minutes).", "You get ONE clear recommendation with a confidence level and real sources."],
      keys: "Enter to send · Shift+Enter for a new line",
      dismiss: "Got it"
    },
    missionGo: "Assign to squad",
    missionActive: "Mission in progress",
    missionDone: "Mission complete",
    queued: "Waiting in line — received, will run as soon as a slot opens",
    queuedAt: "Waiting for a slot",
    queuePos: "position",
    retry: "Retry",
    copyReport: "Copy",
    downloadReport: "Download .md",
    deepDive: "Deep-dive",
    deepDiveHint: "Deeper research + scenario simulation + a roadmap proposal (takes longer)",
    deepBadge: "Deep-dive",
    scenariosTitle: "Simulated scenarios",
    sensitivityLabel: "Most sensitive to",
    qualityCheck: "Quality check",
    qualitySufficient: "Sufficient quality to conclude",
    qualityRefined: "strengthened before concluding",
    qualityPass: "review pass(es)",
    phaseSynthesis: "Phase synthesis",
    phaseWord: "phase(s)",
    concernsLabel: "to watch",
    evaluating: "Checking whether the information is sufficient…",
    reportReady: "Report ready — conclusion first",
    subtasks: "Subtasks",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    sources: "Sources",
    sourcesNone: "No external data was pulled — the squad answered from reasoning alone.",
    sourcesBy: "via",
    jumpAria: "Jump to section",
    meeting: "Consensus meeting",
    meetingNote: "Stances conflicted — the squad debates before concluding.",
    stageCaption: {
      plan: "The lead is planning the first phase of work.",
      work: "Workers run the phase's assignments in parallel, then compare notes.",
      review: "The lead checks and synthesizes the phase — and decides if another is needed.",
      verify: "The lead fact-checks the squad's claims against the gathered evidence.",
      debate: "Stances conflict — the squad debates to reach consensus.",
      report: "Writing the final recommendation, confidence and sources."
    },
    steerHint: "You can steer this debate — add a constraint or pick a side and the squad reconsiders live.",
    steerPh: "Step in: add a constraint or pick a side…",
    steerSent: "Sent to the meeting ✓",
    steerBtn: "Steer",
    widen: "Widen the panel",
    narrow: "Narrow the panel",
    decision: "Consensus decision",
    answer: "Conclusion",
    report: "Full report",
    tasks: "Missions",
    searchMissions: "Search missions…",
    filterAll: "All",
    filterDone: "Done",
    filterFailed: "Failed",
    filterCancelled: "Cancelled",
    searchEmptyTitle: "No matches",
    searchEmptyLine: "No missions match your search or filter — clear them to see the full history.",
    noTasks: "No missions yet — assign the first one from the dock.",
    backToList: "Back to the list",
    missionFailed: "Mission failed",
    waitingForYou: "Waiting for your answer",
    eventRunning: "Event in progress",
    eventResume: "Event in progress — the mission picks up right after.",
    clarifyTitle: "The lead needs one detail",
    clarifyPh: "Type your answer…",
    lastResult: "View last result",
    simBadge: "Contains offline-fallback content",
    viewOnMap: "View on map",
    model: "Model",
    skills: "Skills",
    currentTask: "Current task",
    noTask: "No mission — free roaming",
    close: "Close",
    uptime: "Uptime",
    tasksDone: "Tasks done",
    tokens: "Tokens today",
    policy: "MCP access",
    memory: "Memory",
    shortTermMem: "Short-term — current mission",
    longTermMem: "Long-term — accumulated lessons",
    memEmpty: "Nothing yet — forms as missions run.",
    leadCompose: "Assign a task to the squad",
    leadHint: "You're working with the team lead. The Orchestrator plans the work in phases, gives each worker a focus, and synthesizes the results.",
    viaLeadNote: "Tasks aren't assigned to individual agents. Every mission goes through the team lead, who decides who works on what.",
    viaLeadBtn: "Assign via team lead",
    revive: "Revive",
    revivingBtn: "Reviving…",
    crashedTitle: "Agent unresponsive",
    crashedNote: "Revive to reload its checkpoint and bring the agent back online."
  },
  auth: {
    signInTitle: "Sign in to AgentSphere",
    signInSub: "Run your AI organization — data never leaves your tenant.",
    emailLabel: "Work email",
    emailPh: "yourdomain@vng.com.vn",
    sendCode: "Continue",
    sending: "Checking…",
    authTitle: "Authenticator code",
    authProvider: "GOOGLE AUTHENTICATOR",
    enterCodeFor: "Enter the 6-digit code for",
    enrollTitle: "Set up Google Authenticator",
    enrollDesc: "Scan the QR code with Google Authenticator, then enter the 6-digit code it shows.",
    manualKey: "Manual key",
    useDiffEmail: "Use a different email",
    verifying: "Verifying…",
    badEmail: "Enter a valid email to continue.",
    badCode: "The code is 6 digits.",
    tenant: "GreenNode · Enterprise",
    logout: "Log out"
  },
  onboarding: {
    squadDesc: "Each agent runs a different GreenNode MaaS model for diverse perspectives. Name them and pick models as you like — all changeable later.",
    leadTip: "Tip: keep a frontier-tier lead (gpt-5) — workers can stay fast/cheap.",
    onbNext: "Optional — click “Create squad” to use the defaults. Next step: assign your first mission.",
    modelsLive: "Enabled models loaded from your GreenNode MaaS account",
    modelsCached: "Model list from your MaaS account (cached — MaaS is currently unreachable)",
    modelsCatalog: "Live MaaS catalog (via management API) — model calls are quota-blocked right now, some models may not answer until quota is restored",
    modelsFallback: "Offline catalog — could not reach the MaaS model list",
    nameCol: "Agent name",
    modelCol: "Model",
    roleCol: "Role",
    reasoning: "reasoning",
    fast: "fast",
    enter: "Create squad",
    createdSquad: "Creating squad…",
    save: "Save changes",
    saving: "Saving…",
    setupTitle: "Squad setup"
  },
  misc: {
    online: "online",
    disclaimer: "AgentSphere is a simulation — agents may surprise you.",
    assigned: "Mission assigned to the squad",
    completed: "Mission complete"
  },
  toast: {
    assigned: "Mission assigned to the squad",
    queued: "Received — waiting for a slot",
    restored: "Restored your running mission",
    done: "Mission complete ✓",
    failed: "Mission failed",
    reportCopied: "Report copied (Markdown)",
    reportDownloaded: "Report downloaded (.md)",
    retried: "Mission re-assigned",
    assignFailed: "Could not assign the mission",
    reconnecting: "Connection lost — reconnecting…",
    reconnected: "Reconnected ✓"
  }
};

export const AS_DATA = { PROVIDERS, MODELS, AGENTS, TEAMS, PLACES, AMBIENT_CHAT, AMBIENT_WORK, AMBIENT_DUO, HUDDLES, CRASH_ERRORS, BACK_ONLINE, STR, providerOf };
export default AS_DATA;
