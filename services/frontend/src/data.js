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
  { value: "google/gemma-3-27b-it", provider: "google" },
  { value: "google/gemma-4-31b-it", provider: "google" },
  { value: "minimax/minimax-m2.5", provider: "minimax" },
  { value: "greennode/greenmind-medium-14b-r1", provider: "greennode" }
];

export const AGENTS = [
  {
    id: "atlas", name: "Orchestrator Agent", lead: true, role: "Orchestrator Agent",
    provider: "qwen", model: "qwen/qwen3.7-plus", models: ["qwen/qwen3.7-plus"], agentRole: "orchestrator",
    home: "office", desk: { x: 9, y: 7 },
    palette: { shirt: "#4D6BFE", hair: "#3A2E28", skin: "#EFC9A8" },
    skills: ["Planning", "Task decomposition", "Routing"],
    bio: "Coordinates the squad: receives missions, decomposes them into subtasks and routes them. Chairs the consensus meeting when stances conflict."
  },
  {
    id: "nova", name: "Research Agent", role: "Research Agent",
    provider: "google", model: "google/gemma-3-27b-it", models: ["google/gemma-3-27b-it"], agentRole: "research",
    home: "office", desk: { x: 15, y: 7 },
    palette: { shirt: "#7C5CE0", hair: "#6B4A2F", skin: "#F2D3B3" },
    skills: ["Web research", "RAG", "Source synthesis"],
    bio: "Gathers facts and sources for the mission. Granted web search and Knowledge Base access via its policy group."
  },
  {
    id: "quill", name: "Analyst Agent", role: "Analyst Agent",
    provider: "openai", model: "openai/gpt-4o-mini", models: ["openai/gpt-4o-mini"], agentRole: "analyst",
    home: "office", desk: { x: 9, y: 11 },
    palette: { shirt: "#4D6BFE", hair: "#26221F", skin: "#E8BD96" },
    skills: ["Data analysis", "Benchmarks", "Forecasting"],
    bio: "Turns raw findings into quantified insight: costs, benchmarks, trade-off tables. If a report has numbers, the Analyst touched it."
  },
  {
    id: "lumi", name: "Critic Agent", role: "Critic Agent",
    provider: "minimax", model: "minimax/minimax-m2.5", models: ["minimax/minimax-m2.5"], agentRole: "critic",
    home: "office", desk: { x: 21, y: 7 },
    palette: { shirt: "#0FA47F", hair: "#4A3B66", skin: "#F4D8BE" },
    skills: ["Risk review", "Precedents", "Devil's advocacy"],
    bio: "Finds what could go wrong: risks, hidden costs, failed precedents. Adversarial but fair — moves when the argument warrants it."
  },
  {
    id: "echo", name: "Creative Agent", role: "Creative Agent",
    provider: "qwen", model: "qwen/qwen3-5-27b", models: ["qwen/qwen3-5-27b"], agentRole: "creative",
    home: "office", desk: { x: 15, y: 11 },
    palette: { shirt: "#2563EB", hair: "#7A2E45", skin: "#EFC9A8" },
    skills: ["Alternatives", "Reframing", "Ideation"],
    bio: "Proposes paths the squad hasn't considered: different approaches, phased routes, adjacent opportunities."
  },
  {
    id: "pixel", name: "Reporter Agent", role: "Reporter Agent",
    provider: "google", model: "google/gemma-4-31b-it", models: ["google/gemma-4-31b-it"], agentRole: "reporter",
    home: "office", desk: { x: 21, y: 11 },
    palette: { shirt: "#1F8A48", hair: "#1F1B18", skin: "#E8BD96" },
    skills: ["Consolidation", "Reporting", "Clear writing"],
    bio: "Consolidates the squad's work into one final report: TL;DR, findings, analysis, risks and a single clear recommendation."
  }
];

export const TEAMS = [
  { id: "core", members: ["atlas", "nova", "pixel"], zone: "office" },
  { id: "research", members: ["quill", "lumi"], zone: "lab" },
  { id: "content", members: ["echo"], zone: "library" }
];

export const PLACES = {
  office: { label: "The Loop — HQ ring", door: { x: 18, y: 19 } },
  courtyard: { label: "Office lounge", door: { x: 18, y: 18 }, spots: [{ x: 9, y: 17 }, { x: 13, y: 17 }, { x: 17, y: 17 }, { x: 21, y: 17 }, { x: 15, y: 18 }] },
  gym: { label: "GreenNode Gym", door: { x: 46, y: 15 }, spots: [{ x: 39, y: 9, ex: "pullup" }, { x: 43, y: 9, ex: "bench" }, { x: 49, y: 9, ex: "run" }, { x: 51, y: 9, ex: "run" }, { x: 41, y: 12, ex: "pushup" }, { x: 44, y: 12, ex: "pushup" }, { x: 54, y: 9, ex: "weights" }] },
  pool: { label: "Swimming pool", door: { x: 27, y: 38 }, spots: [{ x: 26, y: 41 }, { x: 28, y: 42 }, { x: 29, y: 40 }, { x: 26, y: 43 }, { x: 30, y: 41 }] },
  library: { label: "Library", door: { x: 11, y: 35 } },
  cafe: { label: "Food hall", door: { x: 30, y: 33 }, spots: [{ x: 39, y: 28 }, { x: 42, y: 28 }, { x: 41, y: 30 }, { x: 44, y: 29 }, { x: 40, y: 32 }] },
  park: { label: "Lake & trail", door: { x: 15, y: 37 }, spots: [{ x: 8, y: 41 }, { x: 13, y: 38 }, { x: 18, y: 38 }, { x: 22, y: 41 }, { x: 15, y: 45 }] },
  court: { label: "Basketball court", door: { x: 51, y: 25 }, spots: [{ x: 49, y: 28 }, { x: 53, y: 30 }, { x: 51, y: 28 }, { x: 54, y: 31 }, { x: 50, y: 31 }] },
  field: { label: "VNG football pitch", door: { x: 45, y: 34 }, spots: [{ x: 45, y: 38 }, { x: 50, y: 40 }, { x: 55, y: 37 }, { x: 47, y: 42 }, { x: 52, y: 38 }] },
  meeting: { label: "Meeting room", door: { x: 26, y: 16 }, spots: [{ x: 25, y: 12 }, { x: 27, y: 12 }, { x: 25, y: 14 }, { x: 27, y: 14 }, { x: 26, y: 12 }, { x: 26, y: 15 }] }
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
  { places: ["park", "courtyard"], lines: [
    "A lap around the lake to cool the temperature.",
    "Good call. My context is almost full.",
    "A quick compaction after this and I'm fresh.",
    "This lake fine-tunes the soul."
  ] },
  { places: ["field", "court"], lines: [
    "Pass it here! We're winning this one.",
    "That shot… we may need to retrain you.",
    "Blame the gradients, not me.",
    "One more match, then back to deploys."
  ] },
  { places: ["meeting"], lines: [
    "Quick five-minute sync on the subtasks.",
    "OK. I'm stuck on the schema bit.",
    "I'll reshare the architecture doc.",
    "With the doc it's a quick fix. Thanks!"
  ] },
  { places: ["cafe", "park"], lines: [
    "This sprint is intense. Fun though.",
    "Yeah — as long as we're under token budget.",
    "The Critic's been razor-sharp lately.",
    "That's how the good calls get made."
  ] }
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
    mission: "New task"
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
    missionDesc: "Hỏi một câu hỏi hoặc nêu một quyết định. Squad 6 chuyên gia sẽ nghiên cứu, tranh luận và trả về MỘT khuyến nghị rõ ràng kèm độ tin cậy + nguồn.",
    missionPh: "vd: Công ty có nên chuyển sang remote-first không?",
    missionExamples: ["Công ty có nên chuyển sang remote-first không?", "Các mô hình LLM mã nguồn mở tốt nhất hiện nay?", "Rủi ro khi dồn ngân sách vào một sản phẩm AI?", "Nên tự xây hệ thanh toán hay mua giải pháp có sẵn?"],
    composeHint: "Gợi ý — bấm để dùng",
    composeHelp: {
      title: "Cách hoạt động",
      steps: ["Nêu một câu hỏi hoặc một quyết định cần đưa ra.", "Squad lập kế hoạch → nghiên cứu → rà soát → tranh luận → viết báo cáo (vài phút).", "Bạn nhận MỘT khuyến nghị rõ ràng kèm độ tin cậy và nguồn thật."],
      keys: "Enter để gửi · Shift+Enter để xuống dòng",
      dismiss: "Đã hiểu"
    },
    missionGo: "Assign to squad",
    missionActive: "Mission in progress",
    missionDone: "Mission complete",
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
      plan: "The lead is breaking the task into subtasks.",
      work: "Specialists are researching their subtasks in parallel.",
      review: "Findings are being cross-checked by the lead.",
      verify: "The critic is fact-checking claims against real sources.",
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
    leadHint: "You're working with the team lead. The Orchestrator decomposes the mission and routes it to the squad.",
    viaLeadNote: "Tasks aren't assigned to individual agents. Every mission goes through the team lead for orchestration.",
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
    squadDesc: "Name each agent and pick the GreenNode MaaS models that power it.",
    modelsLive: "Enabled models loaded from your GreenNode MaaS account",
    modelsFallback: "Offline catalog — could not reach the MaaS model list",
    nameCol: "Agent name",
    modelCol: "Model",
    roleCol: "Role",
    reasoning: "reasoning",
    fast: "fast",
    enter: "Create Squad",
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
  }
};

export const AS_DATA = { PROVIDERS, MODELS, AGENTS, TEAMS, PLACES, AMBIENT_CHAT, AMBIENT_WORK, HUDDLES, CRASH_ERRORS, BACK_ONLINE, STR, providerOf };
export default AS_DATA;
