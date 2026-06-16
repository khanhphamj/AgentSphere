# AgentSphere — VNG Campus

A virtual workspace for AI agents. Ask any *"Should we…?"* question and watch a squad of
six agents — each powered by a different model on **GreenNode Model-as-a-Service** —
research, analyze, debate and deliver a recommendation, live on a pixel-art VNG Campus
rendered under a GreenNode **Liquid Glass** UI.

> *Có nên mua cổ phiếu X? Có nên học AWS? Có nên xây tính năng Voice? Có nên dùng MCP cho Agent? Có nên mở quán cafe?*
> — AgentSphere tự tổ chức công việc.

## How a mission runs

```
user question
   │
   ▼
👨‍💼 Orchestrator (lead) ── assesses the task (model): a narrow question
   │                       gets 1-2 specialists, a consequential decision
   │                       gets all four — plan structure built by code
   │
   ├──▶ 🔍 Research Agent   — web + Knowledge Base      ┐
   ├──▶ 📊 Analyst Agent    — metrics + benchmarks      │  parallel (only the
   ├──▶ ⚠️  Critic Agent     — risks + precedents        │  assigned agents), each
   └──▶ 💡 Creative Agent   — alternatives              │  with policy-gated tools
                                                        ▼
      ⚠️ Critic fact-checks teammates' claims (model) — unsupported
         numbers get flagged ⚑ and confidence cut (code applies verdicts)
                   │
                   ▼
            conflict check (code) ──── conflicting stances?
                   │ yes                                │ no
                   ▼                                    │
        🏛 CONSENSUS MEETING — debate rounds (models),   │
          convergence check + decision (code)           │
                   │                                    │
                   ▼                                    ▼
            📝 Reporter Agent — final report assembled from the squad's output
                   │
                   ▼
        TL;DR · findings · analysis · risks · alternatives · recommendation
```

Everything streams to the browser over WebSocket — the campus is a real-time
visualization of the actual backend pipeline (gathering in the meeting room,
fanning out to desks, debate speech bubbles, the report landing in the panel).

## Microservice architecture

```
┌──────────┐   REST /api/* + WS /ws   ┌─────────────┐    POST /missions    ┌──────────────┐
│ frontend │ ───────────────────────▶ │   gateway   │ ───────────────────▶ │ orchestrator │
│  :5173   │                          │    :8080    │ ◀─── WS /events ──── │    :8081     │
└──────────┘                          │ email→OTP→JWT│                      └──────┬───────┘
                                      └─────────────┘                             │ /run /meeting-turn
                                                                                  ▼
                                      ┌─────────────┐   grants + authorize  ┌──────────────┐
                                      │ mcp-policy  │ ◀──────────────────── │ agent-runtime │
                                      │    :8083    │                       │    :8082      │
                                      └─────────────┘                       └──────┬────────┘
                                       Policy Groups                               │
                                       per agent role                              ▼
                                                                       GreenNode MaaS (LLM)
                                                            https://maas.api.greennode.ai/v1
```

| service | port | responsibility |
|---|---|---|
| `frontend` | 5173 | Pixel campus + Liquid Glass UI (Vite + React, design-system bundle) |
| `gateway` | 8080 | Auth (work email → Google Authenticator TOTP → JWT), REST/WS proxy, attaches internal client credentials |
| `db` | 5433 | Postgres 16 — user accounts (TOTP), per-account squads, mission history |
| `orchestrator` | 8081 | Mission pipeline, consensus meeting, real-time event hub (WS with replay) |
| `agent-runtime` | 8082 | Harness layer: runs one agent step — model calls with policy-gated tools |
| `mcp-policy` | 8083 | MCP server registry + **Policy Groups**: which servers/tools each role may use |

Service-to-service calls authenticate with the internal OAuth-style client
(`CLIENT_ID` / `CLIENT_SECRET` headers); browsers only ever hold a JWT.

## Authentication — Google Authenticator TOTP

Sign-in is real two-factor TOTP (RFC 6238, HMAC-SHA1, 30s steps, ±1 window),
implemented in plain `node:crypto` (`services/gateway/src/totp.js`):

1. Enter a work email → `POST /auth/request-code`. New (or unconfirmed) users
   get `mode: "enroll"` with an `otpauth://` URI + Base32 secret; the login
   screen renders the QR to scan with Google Authenticator (manual key shown
   alongside). Known users get `mode: "totp"` and go straight to the code boxes.
2. Enter the app's 6-digit code → `POST /auth/verify` checks the TOTP, marks
   the user enrolled, stamps the login and returns the JWT.

Users persist in **Postgres** (compose service `db`, table `users`). If the
database is unreachable the gateway logs a warning and degrades to an
in-memory store so the demo keeps working. `AUTH_ACCEPT_ANY_CODE=true`
bypasses TOTP verification (pure demo mode); default is `false`.

**Per-account isolation.** Every mission, briefing and standing mission is owned
by the email on the requester's JWT. The gateway forwards that verified identity
to the orchestrator as `x-user-email` (browsers never set it themselves), and the
orchestrator scopes **every** read/write to it: `GET /missions`, `/missions/:id`,
`/clarify`, `/steer`, `/events`, the Briefing Inbox, and Standing Missions all
filter by owner (a mismatched owner gets a `404`, never another account's data).
Scheduled standing-mission runs inherit their creator's email. The live WebSocket
is scoped too — each connection carries `?u=<email>` and `emit()` only delivers a
mission's events to its owner (fail-open only when an identity is unknown), so one
account's campus never animates another's run. Squad config is likewise per-user
(gateway `squads` keyed by email). Missions created before this change have no
owner and are simply hidden rather than shown to everyone.

## Harness layer — code vs model

The runtime routes every action to the cheapest sufficient handler. **If an action
doesn't need a model to process and answer, it's plain code** — instant, free,
reproducible:

| action | handler |
|---|---|
| language detection, choreography | code |
| **mission triage** — work (decision) / info (factual lookup) / fun event / unclear, and which specialists (`/plan`) | **model** (orchestrator) |
| **triage fallback when the plan model fails** (e.g. an upstream `fetch failed`/timeout on the orchestrator model) | code (`triageByCode` — a keyword heuristic that still splits info vs work, so a factual question never falls through to a full decision squad with mismatched cost/risk/alternatives subtasks) |
| plan structure + subtask wording | code |
| **current-date awareness** — every plan/run/report prompt is prefixed with `nowCtx()`: *"Today is `<YYYY-MM-DD>` (year `<Y>`) — this is the CURRENT date, not your training cutoff. For anything time-sensitive use `<Y>` in your search queries, prefer the most recent sources, and state what date the data is as of."* | code injects the live server date (`prompts.js`) — fixes agents searching `2022/2023` for "latest" topics. The stale hardcoded example (`"…trial results 2023"`) and the seeded-tool year (`data.metrics`/`market.trends`) are now the **dynamic current year**; the reporter is told to stamp time-sensitive figures with their "as of" period |
| **clarifying question** back to the user when the ask is ambiguous | **model** asks, code pauses/resumes the mission |
| **specialist reasoning** (`/run`) | **model** (with tools) |
| **subtask review** — orchestrator judges each result pass/fail (`/review`) | **model** (orchestrator) |
| Monte Carlo simulation (`data.simulate` tool) | code (seeded GBM, 2000 paths) — **the analyst's forced simulate now fires only on a quantitative *decision*, never on an informational lookup** (`!informational && QUANT`), so a factual "current savings rate?" no longer triggers a fabricated simulation it has to talk around |
| real web search / market data (`web.search`, `market.*`) | code — web.search uses **Tavily (an AI-native search API) as the primary backend when `TAVILY_API_KEY` is set** (clean, relevance-scored results + extracted `content` + a synthesized `answer`), and **falls back to Bing RSS** automatically when there's no key or Tavily errors. The Bing path **filters junk hosts, dedupes to one freshest result per hostname, captures `pubDate`, fetches the top result's real page content, and RELEVANCE-RANKS** *inside the tool*: navigational pages (sign-in/login/account/homepage) are dropped, results are scored by diacritic-insensitive query-term overlap (≥2 terms = relevant; ≥1 = weak fallback; cross-language queries that match nothing keep the freshest non-navigational results), and the tool returns `dropped` + a `lowRelevance` flag so the agent reports honestly ("search returned nothing convincing") or abstains instead of forcing an answer on off-topic hits. The report's sources are split into **"Real data sources"** (actual URLs + real-data tools) vs **"Modeled / simulated inputs"** (now only `data.simulate`, the Monte-Carlo model) so a model output never masquerades as a real citation. **All formerly-seeded "demo" tools are now real-data-backed**: `kb.query`, `data.metrics`, `data.benchmark`, `market.trends`, `market.competitors`, `risk.checklist`, `risk.precedents` each run a tailored Tavily/Bing search (e.g. risk.precedents → "<topic> real case studies successes failures"), returning live sources instead of RNG fakes; `data.simulate` stays a real Monte-Carlo simulation (uses real symbol history when given a ticker), and `market.quote/history` stay real DNSE/Yahoo prices. **All searches share a 15-min in-process cache** keyed by normalized query — identical queries (across tools/agents/missions) return the cached result, and concurrent identical searches **join the same in-flight request** — so the squad never spends two Tavily credits on the same query (`cachedSearch` in tools.js) |
| **lead guidance** when a specialist is blocked (`/lead-answer`) | **model** (orchestrator) |
| event choreography (party, swim race) | code |
| **final report composition** (`/report`) | **model** (reporter) — structure fits the task, markdown tables; code template fallback |
| report confidence + "Data sources" section | code — **computed from real, non-abstaining outputs only** (simulated fallbacks AND `insufficient`-stance abstainers excluded from the mean), Critic weighted ×2, then **penalized for disagreement (≥2 stance camps), unresolved fact-check flags, each abstainer, and capped at 60 when any contributor was an offline fallback**; the report carries a one-line **"Confidence basis"** footer explaining the number. Single source of truth: the reporter never writes a confidence line, any self-written confidence/"Mức độ tin cậy" line — whole-line **or** inline `(N% confidence)` parenthetical — is stripped before `report.ready`, so the body never states a number that differs from `report.confidence` |
| junk-source filtering on "Data sources" | code (drops dictionaries, schema.org/w3.org, search-engine chrome) — now a **belt-and-suspenders second pass** behind the upstream web.search filter |
| tool execution + policy authorization | code |
| conflict detection, convergence check | code |
| **fact-check pass** (`/verify`) — Critic reviews teammates' claims | **model** (critic) — the Critic now sees **each teammate's actual tool evidence** (their gathered data notes) and is told to flag any number/benchmark/precedent/URL that does **not** appear in that teammate's evidence — it checks claims against evidence, not just prose |
| **deterministic uncited-figure pre-flag** — a **significant statistic** (a percentage, a magnitude with a unit like `tỷ`/`triệu`/`$`, or a 3+ digit number — bare small integers like "32 giờ"/"12 tuần" and years are ignored) in a **research/analyst** conclusion that doesn't appear in that agent's gathered evidence is flagged in code | code (works even when the MaaS drops the JSON schema — the robust, high-precision half of the fact-check) |
| **honest abstention** — a specialist may return stance `insufficient` + `insufficientReason` when its tools returned nothing usable; the runtime honors it **only if tools were actually attempted and all came back empty/errored** (else it's coerced to a low-confidence `conditional`, so a weak model can't dodge work). Abstainers are excluded from consensus camps and the confidence mean, penalized, and listed in an **"Evidence gaps"** report section instead of as findings | code (`/run` guard + `assembleReport`) |
| applying verification verdicts (flags + confidence cuts) | code |
| **per-model circuit breaker** — after 2 consecutive failures a model is skipped for 60s; if all models in a role's chain are open, the runtime drops straight to simulation instead of burning ~18s of backoff per phase. A model that returns **truncated-and-empty even after the larger-budget retry now throws** (fails over to the next model / simulation + trips the breaker) instead of propagating useless empty content | code (`llm.js`) |
| **JSON-mode output** — `response_format: json_object` on capable models (OpenAI family today) with a 400-retry-without guard, so a model can't answer in an "unusable format"; `extractJson` stays as the fallback | code (capability-gated, MaaS-safe) |
| **prompt-policy block** — a provider 400 that flags a prompt as violating usage policy (`PromptBlocked`/`isPromptBlocked` in `llm.js`) is detected specifically: it does **not** trip the circuit breaker (the model is healthy, the prompt was rejected), is **not** retried across every model, and degrades to the offline fallback with a clean `"prompt blocked by provider usage policy"` label (even when `LLM_SIMULATION=off`) — so a flagged question never surfaces a raw 400 or 500-crashes a mission | code (`llm.js`) |
| **synthetic-output marking in memory** — offline-fallback conclusions are tagged in long-term memory and labelled "(synthetic, treat as weak)" when recalled, so fabricated precedents don't masquerade as real experience; lessons dedupe by mission title | code (`memory.js`) |
| **conflict check** — hold a consensus meeting when the squad genuinely disagrees: ≥2 distinct stance camps present **and** at least one definite lean (a `support` or an `oppose`), so a `support`-vs-`conditional` split debates too — not only the rare hard `oppose`-vs-`support` (`pipeline.js`) | code |
| **debate turns** (`/meeting-turn`) | **model** |
| consensus decision + condition harvest | code |
| memory recall + lesson consolidation | code |
| context budgeting + output clamps | code |

### Context budget per model

Every LLM call is budgeted by code (`services/agent-runtime/src/budget.js`) so
the agent's model can never overflow its context window. Limits are explicit
per model id (`MODEL_LIMITS`, no family guessing) covering every chat model
enabled on the MaaS account:

| model | context | max output | reasoning |
|---|---|---|---|
| `deepseek/deepseek-v4-pro` / `-v4-flash` | 128k | 8k | |
| `deepseek/deepseek-r1-qwen3-8b` | 64k | 8k | ✓ |
| `qwen/qwen3-235b-a22b-instruct-2507`, `qwen3.7-plus`, `qwen3.6-27b`, `qwen3-5-27b`, `qwen3-coder-plus(-2025-07-22)` | 128k | 8k | |
| `qwen/qwen3-235b-a22b-thinking-2507`, `qwen3-30b-a3b-thinking-2507` | 128k | 16k | ✓ |
| `openai/gpt-5` | 128k | 16k | ✓ |
| `openai/gpt-4o` / `-mini` | 128k | 8k | |
| `openai/gpt-oss-120b` / `-20b` | 128k | 4k | |
| `google/gemma-4-31b-it` / `gemma-3-27b-it` | 128k | 8k | |
| `minimax/minimax-m2.5` | 128k | 8k | ✓ |
| `greennode/greenmind-medium-14b-r1` | 32k | 8k | ✓ |
| `gemini/gemini-3.1-pro-preview`, `gemini-2.5-pro` | 128k | 16k | ✓ |
| `gemini/gemini-2.5-flash` / `-flash-lite` | 128k | 8k | |
| `bytedance/seed-1-6-250915` / `-flash-250715` | 128k | 8k | |
| *(unknown model)* | 8k | 1k | conservative default |

Reasoning models get a larger generation budget (3000 tokens on `/run`, 2200 on
debate turns) and temperature 0.6, so thinking doesn't truncate the JSON answer.

Enforcement is layered: per-call `max_tokens` sized to the task (run vs debate
turn, reasoning vs plain), tool rounds capped by window size, ≤5 tool calls per
round, tool results sliced to a per-model char cap, and `clampMessages` as the
final guard — progressively truncating tool/assistant messages until the request
fits 90% of the model's window. Model **outputs** are clamped too (`say` ≤120,
`summary` ≤700, `keyPoints` ≤5×90, `argument` ≤400 chars), which keeps every
downstream prompt (meeting `others`, consensus, report) and UI event small —
faster calls, fewer tokens, no compounding growth.

## GreenNode Model-as-a-Service

LLM calls go to GreenNode MaaS on VNG Cloud (OpenAI-compatible):

```
LLM_BASE_URL=https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1
LLM_API_KEY=<from https://aiplatform.console.greennode.ai/api-keys>
```

**Model catalog is live and verified.** The squad-setup dropdown shows only
models that *actually answer* on your MaaS account: agent-runtime `GET /models`
fetches `GET /v1/models`, filters out non-chat models (whisper, embeddings,
rerankers, TTS, image, IDP), then **probes each remaining model** and keeps only
the callable ones. OpenAI **GPT-5 family** (`gpt-5`, `gpt-5-mini`, `gpt-5-nano`)
is served through the MaaS **Responses API** (`/v1/responses`, with reasoning
effort) instead of Chat Completions — the runtime auto-routes those models and
normalizes the response (including tool calls) so the rest of the pipeline is
unchanged — the platform list contains
catalog models that return 404 until added to your project. The result is
cached 10 min in memory, persisted to `data/models.json`, and proxied as
`/api/models`. The platform catalog can lag behind enablement, so model ids
from `MODEL_LIMITS` that are missing from the catalog are probed too — a
freshly enabled model appears within one cache cycle either way. If MaaS is
unreachable the last persisted list (or the static fallback in
`services/frontend/src/data.js`) ships instead, and the UI labels the source.
This account: 9 callable — qwen3.7-plus, qwen3.6-27b, qwen3-5-27b,
qwen3-coder-plus, gpt-4o-mini, gemma-3-27b-it, gemma-4-31b-it, minimax-m2.5,
greenmind-medium-14b-r1.

**One agent, one model.** Each agent runs exactly one model, chosen from the
callable list in Squad setup at first login and locked afterwards (names stay
editable via ⚙️).

**Honest failure.** A model that can't answer means a **failed agent, not fake
content**: in `LLM_SIMULATION=auto`/`off` the agent crashes on campus with the
*real* error (`LLM 404 …`, `429 …`), its subtask is marked ✗ failed, it
contributes nothing to the report, and the mission completes from the surviving
agents (it only fails when *every* specialist is down). A crashed agent stays
down until you hit **Revive**. Meeting turns that fail are skipped, not faked.
`LLM_SIMULATION=on` remains a deliberate full-offline demo mode with canned
content (marked with the offline-fallback badge). **Transient network blips**
(`fetch failed` / `ECONNRESET` / timeouts to the MaaS endpoint) are retried with
backoff inside `fetchWithRetry` (`llm.js`) — same 2s/5s/11s schedule as the
429/503 branch — so a single dropped socket no longer crashes an agent or aborts
a long multi-specialist run; only a genuine, repeated failure becomes a ✗.

## Mission types

The Orchestrator's model triages every mission before any work starts:

- **work** — analysis & decision questions. The lead writes a **mission-specific
  subtask for each chosen specialist** (e.g. for *"Phân tích thị trường đầu năm
  2026"* the analyst gets *"Định giá và dự báo xu hướng các nhóm ngành dẫn dắt
  Q1/2026"* — never a generic template), with code falling back to role
  defaults if the model fails. If the plan model call itself fails (an upstream
  `fetch failed`/timeout on the orchestrator model), a code heuristic
  (`triageByCode`) still classifies the ask as **info vs work** so a factual
  question doesn't get the full decision squad with mismatched
  cost/risk/alternatives subtasks. Runs the full pipeline. For
  quantitative "what ifs" (e.g. *"đầu tư 500k/tháng vào SHB thì cuối năm lời
  không?"*) the Analyst calls the real `data.simulate` tool — a seeded
  Monte Carlo (GBM, dollar-cost averaging, 2000 paths) that returns final-value
  percentiles (p10/p50/p90), probability of profit and the assumptions used —
  and quotes those numbers in the report.
- **info** — a factual or informational lookup with no decision to make (e.g.
  *"Tối nay có trận bóng đá nào hay không?"*, *"X là gì?"*). Runs a light
  research-led pipeline but is **never forced into a proceed / do-not-proceed
  verdict**: the decision is `informational`, the report answers the question
  directly (no go/no-go recommendation, no consensus meeting), and history shows
  it as an informational answer rather than a confident yes/no.
- **event** — fun campus activities (*"tổ chức tiệc"*, *"thi bơi"*). No
  specialists, no report pipeline: the squad physically organizes it on the
  campus — a swim race lines everyone up in pool lanes, the lead counts down
  "3…2…1 GO 🏁", agents race across, a winner is crowned 🏆 and the recap
  (with the final ranking) lands in Missions; parties gather the squad at the
  Food Hall or court with cheers and games.
- **unclear** — the ask is genuinely ambiguous (references something with no
  context — *"Giúp tôi xử lý vụ kia với nhé"* — or a critical detail is
  missing). Rather than guess a confident verdict, the lead pauses the mission
  (`status: clarifying`) and asks you ONE question (speech bubble on campus + an
  answer box in the mission panel); your answer resumes the mission
  (`POST /api/missions/:id/clarify`). Posting a new mission supersedes a stuck
  clarifying one.

Mission titles come straight from the user; the orchestrator rejects a
`POST /missions` whose title is actually a status/error string (e.g. a crashed
agent's "Agent unresponsive… Revive to reload…" banner) so it can never be
stored as a mission title.

**Real data, honest tools.** `web.search` hits Bing (real results + URLs, the
research agent is structurally forced to search before concluding),
`market.quote`/`market.history` pull real HOSE/HNX prices via DNSE (Yahoo
fallback) and compute true period returns and annualized volatility,
`data.simulate` accepts a `symbol` to drive the Monte Carlo with that real
history, and `web.fetch` reads any URL. The remaining demo tools (`kb.*`,
`market.trends`, `data.metrics`, `risk.*`) label their payloads
`synthetic: true` so models must not present them as fact —
`risk.precedents` picks a domain-appropriate set of illustrative precedents
(sports, investing, engineering migrations, remote work, opening a venue, or a
generic fallback) from the topic rather than always returning the same cases. The final report is
**composed by the Reporter's model** — structure tailored to the task, markdown
tables for numbers, flagged claims handled with caution — with the code
template as fallback, and a code-built **"Nguồn dữ liệu"** section listing the
tools and URLs actually used.

Mid-mission, a **specialist that finds its subtask ambiguous doesn't guess**:
it walks over to the lead's desk and asks (`agent.question`), the lead's model
answers (`/lead-answer`), and the specialist retries once with that guidance —
all visible on campus and in the activity feed.

**Every finished subtask is reviewed by the Orchestrator** before it counts: the
lead's model judges the result against the subtask (`/review`) and either
approves it or sends it back with one concrete instruction — the specialist then
redoes the subtask once with that feedback (`agent.review` → `agent.redo` →
re-run, shown as a 🔍 review state on the subtask and bubbles on campus).
Simulated/failed outputs skip review; redo is capped at once per subtask.

**Orchestrator takeover on specialist failure.** If a specialist's `/run` comes
back as a hard failure (`failed: true` — e.g. a `429 too many`, model
unreachable, or an unusable-format answer), the subtask is **not** abandoned:
the lead Orchestrator re-runs that exact subtask with **its own model** (a
different model than the rate-limited specialist, so it usually goes through),
keeping the role's persona and standards. It emits `agent.takeover`, the lead
announces it on campus, and the result fills the specialist's slot — flagged
`takeover: { from, fromName }` on the output and breakdown, attributed to the
lead, and skipping the self-review step. Only if the lead's attempt also fails
is the subtask finally marked failed. This keeps a single rate-limited model
from silently dropping a section of the mission.

## MCP Policy Groups

`mcp-policy` owns an MCP server registry (`mcp-web`, `mcp-knowledge`, `mcp-data`,
`mcp-market`, `mcp-risk`, `mcp-docs`) and six **Policy Groups** binding roles to
server/tool grants (`services/mcp-policy/data/registry.json`):

| policy group | role | granted |
|---|---|---|
| `pg-orchestrator` | Orchestrator | *no external tools — planning only* |
| `pg-research` | Research | `mcp-web/*`, `mcp-knowledge/*`, `market.trends` |
| `pg-analyst` | Analyst | `mcp-data/*`, `mcp-market/*`, `kb.query` |
| `pg-critic` | Critic | `mcp-risk/*`, `kb.query`, `web.fetch` |
| `pg-creative` | Creative | `market.trends`, `market.competitors`, `kb.query` |
| `pg-reporter` | Reporter | `mcp-docs/*` |

Enforcement is two-layer: the runtime only *exposes* granted tools to the model,
and every call is *re-authorized* (`POST /authorize`) at execution time. Denied
calls surface in the activity feed (`✗ denied by policy`). Edit groups live via
`PUT /policy-groups/:id`. The agent panel shows each agent's grants.

## Agent memory

Each agent accumulates memory in two layers:

| layer | scope | storage | written by |
|---|---|---|---|
| short-term | current mission | runtime RAM, 30 notes/agent | **tool results** (the actual data found, as `data` notes), conclusions, fact-check verdicts and debate turns |
| long-term | across missions | **GreenNode AgentBase Memory Service** (semantic records), mirrored to `data/agentbase/<agentId>.json` as offline fallback | one distilled lesson per agent on mission completion |

**Long-term memory is the real AgentBase Memory Service**
(`services/agent-runtime/src/agentbaseMemory.js`) — not a local file. When a
mission completes, the orchestrator commits each agent's outcome
(`POST /memory/commit`); the runtime writes it as conversational **Events**
(`POST /memories/{id}/actors/{actorId}/sessions/{sessionId}/events`) under a
**CUSTOM long-term-memory strategy** whose `customFactExtractionPrompt` distills
durable, transferable mission lessons into **memory records** (automatic
generation plus an explicit `generate-from-session` nudge). On the next `/run`
or `/meeting-turn`, the agent recalls by **semantic search**
(`POST /memory-records:search`) keyed on the current mission title — relevance-
ranked vector recall, a strict upgrade over the old "last 3 lessons" slice.

**Partitioned per account + agent** — `actorId = acct-<sha256(userEmail)>--<persona>`
(the email is hashed, so distinct accounts can never alias onto the same key),
so one user's `atlas` never sees another user's `atlas`, and each persona keeps
its own lessons. The `userEmail` is threaded gateway → orchestrator → runtime;
the **same `actorKey` keys both** the AgentBase namespace
(`/strategies/{memoryStrategyId}/actors/{actorId}`) **and the local JSON mirror**,
so the per-account guarantee holds on the fallback path too.

**Synthetic runs are never taught** — offline-fallback (simulated) outcomes are
mirrored locally and labelled "(synthetic, treat as weak)" on recall, but are
**not** written to AgentBase, so fabricated precedents can't masquerade as real
platform experience.

**Graceful degradation** — if AgentBase is unreachable or unconfigured (no
`MEMORY_ID` / IAM credentials), every memory op falls back to the local JSON
mirror; a mission never blocks on the memory service (recall returns `null` and
the prompt uses local lessons; commit always keeps the local mirror). A 30s
token circuit-breaker means that after the first failure, subsequent recalls
fall back in milliseconds. Set `AGENTBASE_MEMORY=off` to force local-only.

Both layers are injected into every `/run` and `/meeting-turn` system prompt
with a **budget-aware selection**: complex (`standard`) missions get a larger
working-notes budget (1800 chars on `/run`, 1400 on debate turns) than simple
ones (900/700), and when notes exceed the budget the harness keeps the most
valuable first (conclusions and verify verdicts, then gathered data, then
tool/debate traces), newest first within each kind — so a deep-analysis agent
re-enters its retry or the meeting still holding the numbers it dug up. The
agent panel shows both layers live (Memory · AgentBase).

**Enable it once:** AgentBase memory needs a **GreenNode IAM service account**,
read from `GREENNODE_CLIENT_ID` / `GREENNODE_CLIENT_SECRET`. These are **not** the
same as `CLIENT_ID` / `CLIENT_SECRET` — those are the project's internal
service-to-service secret (JWT signing + inter-service headers) and will not
authenticate against IAM. Add real IAM creds to `.env`, then provision and verify:

```bash
# .env:  GREENNODE_CLIENT_ID=...   GREENNODE_CLIENT_SECRET=...
npm run memory:provision     # creates the CUSTOM memory + strategy, prints MEMORY_ID + MEMORY_STRATEGY_ID
# add to .env:  MEMORY_ID=mem_...   MEMORY_STRATEGY_ID=strat_...
npm run memory:health        # checks IAM token + memory round-trip (also live at GET /memory/health)
```

Until `GREENNODE_CLIENT_ID`/`SECRET` and `MEMORY_ID` are set, AgentSphere runs
exactly as before on the local JSON mirror — no behavior change, no errors.

## Run it

```bash
npm install
docker compose up -d db          # Postgres for user accounts

# everything (4 backend services + frontend)
npm run dev
# open http://localhost:5173

# or backend only
npm run dev:backend
```

Docker (full stack): `docker compose up --build` → frontend on http://localhost:5173.

### Deploy to GreenNode AgentBase (all-in-one container)

AgentBase Custom Agent runs **one** container on port 8080 with `/health`, so the
whole app is packaged into a single image by the root **`Dockerfile`**: it builds
the frontend, runs the 4 Node backends via `concurrently` under `tini` (see
**`start.sh`**), and **bundles Postgres** (started in-container by `start.sh`). The
**gateway** serves the built frontend as static files + SPA fallback when
`FRONTEND_DIST` is set (so `:8080` serves UI + `/api` + `/ws` + `/health`
same-origin); this is inert in normal compose mode. `.dockerignore` keeps `.env`
and `.greennode.json` out of the image.

```bash
TAG=v$(date +%Y%m%d%H%M%S)
docker build --platform linux/amd64 -t vcr.vngcloud.vn/<cr-repo>/agentsphere:$TAG .
bash .claude/skills/agentbase/scripts/cr.sh credentials docker-login
docker push vcr.vngcloud.vn/<cr-repo>/agentsphere:$TAG
bash .claude/skills/agentbase/scripts/runtime.sh create --name agentsphere \
  --image vcr.vngcloud.vn/<cr-repo>/agentsphere:$TAG \
  --flavor runtime-s2-general-2x4 --env-file .env --from-cr \
  --network-mode PUBLIC --min-replicas 1 --max-replicas 1
```

Keep replicas at **1** (the bundled Postgres + in-memory session state are
per-container). The bundled Postgres is **ephemeral** — its data is lost on pod
restart/redeploy; for durable storage point `DATABASE_URL` at an external managed
Postgres in the deploy env file (it overrides the baked localhost one). Redeploys
use `runtime.sh update <runtime-id> ...` with the same flags.

**Login:** work email → scan the QR with Google Authenticator (first time) →
enter the 6-digit app code. Re-logins skip straight to the code.
**First login:** Squad setup — name each agent and pick its model → **Create Squad**.
**New task** in the dock (or message the lead agent) → watch the campus work.
The campus clock and day/night tint follow real time in UTC+7 (Asia/Ho_Chi_Minh).

## API quick reference

```
POST /auth/request-code {email}            → {mode:"enroll", otpauth, secret} | {mode:"totp"}
POST /auth/verify       {email, code}      → {token, user}   (code = Google Authenticator TOTP)
GET  /api/models                           → {source, models[]}   (enabled MaaS models, cached)
POST /api/missions      {title}            → {id, language, status}   (one at a time)
POST /api/missions/:id/clarify {answer}    → resumes a clarifying mission
GET  /api/missions                         → mission history (status, decision, confidence)
GET  /api/missions/:id                     → full mission state + report
GET  /api/missions/:id/events              → buffered event timeline
GET  /api/squad                            → {squad | null}   (per-account, Postgres)
PUT  /api/squad         {squad:[{id,name,model}]}      (saves per-account + activates)
GET  /api/policies/policy-groups           → policy groups + role bindings
GET  /api/policies/grants/:role            → resolved tool grants
GET  /api/memory/:agentId?missionId=…      → short-term + long-term memory (source: agentbase|local)
(internal runtime: /plan /run /review /lead-answer /verify /meeting-turn /report /memory/commit /memory/health)
WS   /ws?missionId=…                       → live events (replays the timeline)
```

Event types: `mission.created` `phase.gather` `mission.plan` `phase.disperse`
`agent.progress` `agent.tool` `agent.say` `agent.takeover` `conflict.detected|none`
`meeting.started` `meeting.turn` `meeting.resolved` `report.started`
`report.ready` `mission.completed|failed`.

## Beyond chat — a company, not a prompt box

Three features make AgentSphere a persistent agent *organization* you run, not a stateless Q&A — each does something a linear chat app structurally cannot:

- **Briefing Inbox** — the squad reports to you *unprompted*. Every terminal mission writes a durable briefing to Postgres (`briefingStore`, tapped at `mission.completed`/`mission.failed` in `pipeline.js`); the Dock shows an unread badge and the Inbox panel ("Báo cáo từ squad") stacks agent-pushed cards — decision · confidence · flag-count · recommendation, severity-tagged (⚑ when flagged/low-confidence/do-not-proceed, ✗ when failed). Because it's DB-backed (not the in-memory 30-mission event buffer), a run that finishes while you're away is waiting when you return — the persistence layer every autonomous feature needs. Pull → push.
- **Live Gavel** — you steer the debate mid-round. While the consensus meeting runs (a real 2-round loop with a ~4.2s gap per turn), a steer bar — now fronted by a labeled hint ("You can steer this debate — add a constraint or pick a side and the squad reconsiders live.") so it's discoverable — lets you inject a constraint or take a side; `POST /missions/:id/steer` appends to `m.steers`, the meeting loop drains them into a `directorNote` passed to the *next* agent's turn (`meetingPrompt`), and the very next arguments bend toward it — then consensus recomputes the verdict for free. Buffered to the next scheduled turn, so it costs **zero extra model calls**. A chat app's "thinking" is one opaque, uninterruptible block; here the reasoning is an addressable timeline you act inside.
- **Standing Missions** — the company works while you're away. Define a recurring brief in Squad → "Nhiệm vụ định kỳ" (e.g. "scan VN fintech M&A", every 6h/daily); a 60-second scheduler (`standingStore`, `standing_missions` table) fires it **headless** when the system is idle — the squad wakes itself, runs the full pipeline with `pace()` collapsing the cosmetic animation sleeps (no viewer to slow down for), and pushes the result to the Inbox tagged `auto`. **MaaS guards**: a user-priority **FIFO queue** (replacing the old single-active 409 lock) caps concurrency at 1; the scheduler only fires when idle (never piles on), fires each due mission once, defers when the DB is degraded, and turns failures into an alert briefing. A chat app has no process when the tab is closed; here the org has its own clock.
- **Org Charter** — per-agent *standing mandates*. In Squad setup, give any agent a durable directive ("only trust VN primary sources; always flag legal risk"); it persists to Postgres (`org_config`, restored on restart) and is injected into that agent's system prompt on every future mission (augmenting, never overriding, the honesty rules). One system prompt for one assistant becomes six named agents each carrying a charter that survives every session. (Per-agent tool-layer guardrails at `mcp-policy` are a planned follow-up.)

## Live mission theatre

The mission panel and the world dramatize what the squad is actually doing —
every beat below is driven 1:1 by real pipeline events (no faked progress):

- **Confidence Aurora** — a soft aurora drifts over the campus whose **hue tracks
  the squad's running confidence live**: faint green as confident specialists
  report in, warming toward amber/red as it drops, flickering more when low. The
  signature moment — the fact-checker flags two numbers (`verify.done`) and the
  sky **visibly cools before the report says a word**, then `report.ready` crowns
  it in the final-confidence color and it slowly fades after the run. The
  invisible internal confidence number becomes a continuous, ambient signal a
  chat app structurally cannot show. Frontend-only: `world._aurora` eased in the
  engine tick + drawn in the render post-pass (`engine.js`), fed by
  `agent.progress`/`verify.done`/`report.ready` events already on the WS bus
  (`missionDriver.js`); decays to nothing when idle

- **Self-teaching compose box** — the New-task form opens with a plain-language
  line (*"ask a question or state a decision — the squad researches, debates and
  returns ONE recommendation with confidence + sources"*), a randomised
  placeholder, and a row of **tappable example chips** (remote-first, open LLMs,
  budget risk, build-vs-buy). A first-timer faced with a blank textarea sees real
  questions they can click — one tap fills the box, the chips collapse, and
  *Assign* enables. Turns "what do I even ask?" into a starting point
  (`MissionPanel`, `STR.panel.missionExamples`)
- **Live subtask counter** — while a mission executes, the status row appends
  `· N/M subtasks`, ticking up as each specialist finishes (same
  `subtasks[].status` the agent pills already track). The abstract "Executing…"
  gains a concrete sense of *how far in* you are (`MissionDetail`)
- **Real data sources section** — a completed mission gets a consolidated
  **"Sources (N)"** section that flattens every tool receipt across *all* agents
  into one deduped list (dedup by host+title for web results, by tool+query for
  data calls), each annotated *via &lt;agent&gt;* so you see who surfaced it —
  synthetic/offline-fallback receipts are excluded so only **real** data counts.
  Reuses the existing `ToolReceipt`/`hostOf`; no more opening six subtasks to
  answer "what did the squad base this on?" Tool receipts are now **persisted**
  on `mission.outputs[].toolCalls` (trimmed) so the section — and each subtask's
  Evidence — also render in the **Missions history**, not just live. Missions run
  before this change show no Sources section rather than a misleading empty note
  (`collectRealSources`; persisted in `pipeline.js`, rebuilt in `TasksPanel`)
- **Sticky jump bar** — once a report lands, a thin sticky table-of-contents bar
  sits under the status card: chips for the sections that actually exist —
  *Conclusion / Full report / Subtasks (N) / Sources (N) / Debate*. Clicking
  smooth-scrolls that section into view; an `IntersectionObserver` highlights the
  in-view chip as you scroll. It stops users treating the green Conclusion card as
  the whole answer when report, sources and debate sit below (`MissionDetail`,
  `.as-jumpbar`)
- **Self-announcing reasoning** — collapsed subtask rows and the confidence chip
  now *look* openable: the caret is always visible on rows that have detail, a
  muted **`details`/`hide`** tag and a one-line summary preview ride on the title,
  and a resting inset affordance + hover signal the click. An **Expand all /
  Collapse all** toggle in the Subtasks header opens every detailed row at once (a
  signal-keyed `openAll` prop preserves per-row manual toggling). Detail-less rows
  stay flat so the cue stays meaningful (`SubtaskRow`, `ConfidenceBreakdown`)
- **Pipeline stage tracker** — a compact `Plan · Work · Review · Fact-check ·
  Debate · Report` rail at the top of the mission detail. The active stage
  pulses, finished stages get a green check, and the **Debate** segment only
  appears when a consensus meeting actually fires. The stage is a **monotonic**
  field on the mission (it only advances, never regresses on WS replay), derived
  from the events the driver already handles (`StageTracker` in `panels.jsx`,
  `bump()` in `missionDriver.js`). Each dot carries a **hover tooltip** naming
  what that stage does, and a present-tense **caption beneath the rail** narrates
  the active stage ("Specialists are researching their subtasks in parallel.",
  "The critic is fact-checking claims against real sources.") so a long phase
  never reads as frozen. When a campus **event** interrupts a run the tracker
  stays mounted but **dims and stops pulsing**, with an "the mission picks up
  right after" caption — you keep your place instead of the pipeline vanishing
  (`STR.panel.stageCaption`, `as-stages-paused`)
- **Readable reports** — the report panel has a **widen toggle** (⤢ in the panel
  header) that grows it from 384px to ~760px for comfortable reading of long
  reports and wide tables; the preference persists (`localStorage`) and the
  campus stays visible beside it. Long content no longer forces a runaway
  horizontal scrollbar — subtask labels clamp, report tables use fixed layout,
  and long URLs/words break (`useWide`/`WideToggle`, `as-panel-host.wide`)
- **Live debate transcript** — the consensus meeting renders as a streaming,
  **round-grouped** transcript: `Round 1` / `Round 2` headers, each new turn
  sliding in and flash-highlighting as the agent speaks on the campus, stance
  chips (support / oppose / conditional), and — the signature moment — a
  `↻ oppose → conditional` tag the instant an agent **changes its mind** between
  rounds. Auto-scrolls to the newest turn only when you're already near the
  bottom (`MeetingTranscript`)
- **Tug-of-War verdict** — the debate is a literal rope. A glowing token sits on
  a rope strung across the meeting room on the campus, sliding **green→Proceed /
  amber→Hold** as each turn's stance pulls it; the **Live Gavel** steer yanks it
  (the token jolts); and consensus **snaps** it to the winning side with a
  confetti burst at the token. A thin **Hold ↔ Proceed** bar above the transcript
  mirrors it in-panel. The abstract stance balance becomes a physical pull you
  watch resolve (`world._tug` eased in the engine, drawn in render; driven by
  `conflict.detected`/`meeting.turn`/`steer.applied`/`meeting.resolved`; the
  `.as-tug` bar derives from the turns + final decision)
- **Per-agent reasoning cards** — every completed subtask is expandable: each
  specialist's one-line summary, key-point bullets and stance chip, so you can
  read each agent's verdict before the blend. Works live and retroactively in
  the Missions history (server now carries `summary`/`keyPoints` on the
  `agent.progress` done event; history rebuilds them from `m.outputs`)
- **Tool-call receipts** — under each subtask, the real tool **results** the
  agent fetched: `web.search` returns become clickable links with host names,
  market/simulation calls become key→value rows, and anything self-labelled
  `synthetic` carries a badge. The runtime trims each result to a safe size
  (`trimToolResult`) and the orchestrator forwards it on `agent.tool`
- **Confidence provenance** — the conclusion's confidence badge is clickable and
  decomposes into the **real weighted vote**: each contributor with its
  provider-coloured dot, stance and %, the Critic marked `×2`, a `Weighted
  average · Critic ×2 · N critic flags` note, and a per-agent `−N` delta showing how the fact-check pass moved
  that agent's confidence. The footer math (weighted mean, Critic double) equals
  the badge exactly — the number is auditable, not arbitrary (`ConfidenceBreakdown`;
  server emits the breakdown on `report.ready` and records `confidenceBefore` in
  the verify pass)
- **Report streaming** — while the Reporter writes, a shimmer **skeleton** holds
  the space; when the report lands it **reveals progressively** (line-by-line
  with a blinking caret) instead of popping in. A finished mission whose report
  the live stream missed is recovered by a **backed-off** `getMission` retry
  (0.4 / 1.5 / 3 / 6s, stops on `failed`) that also re-attaches the confidence
  breakdown, so the conclusion never strands on a null report
- **The Verdict Reveal** — the instant the report is ready, the camera swoops to
  the Reporter's desk, pixel **confetti** bursts over the squad, a soft Web-Audio
  **chime** plays (gated behind a first user gesture; `world.settings.sound`),
  and a full-screen card sweeps in: the recommendation in large type, a conic
  **confidence ring** that fills to N%, and a `proceed` / `do-not-proceed` stamp
  (green for go, amber for hold). Instead of a bare "tap to close" hint, the card
  carries a **"Xem đầy đủ" doorway button** (sub-labelled *báo cáo · nguồn ·
  phản biện*) that dismisses the overlay onto the report — already scrolled to
  the conclusion — so the reveal becomes a *threshold into the detail*, not a
  dead-end you click away. Auto-dismiss is **hover-paused**: the 5.2s timer
  clears while the pointer is over the card and restarts when it leaves, so the
  number never vanishes mid-read (`VerdictReveal`, `world.celebrate`/`playChime`)
- **Decision weather** — the whole campus sky reacts to the pipeline: a
  desaturated **storm** wash when stances conflict and the debate convenes, a
  warm **golden** bloom on `proceed`, a cool **blue** calm on `do-not-proceed`,
  clear otherwise — an additive, slowly-lerped tint composited over the
  time-of-day light (`world.setWeather`, driven from the driver's phase events)

## Design fidelity

The UI implements the Claude Design handoff (`AgentSphere.html`) 1:1:

- **Distinct per-role avatars + live expressions** — each agent is recognizable
  at a glance: a role prop (🧭 Orchestrator headset, 🔍 Research magnifier,
  📊 Analyst glasses, 🛡️ Critic red scarf, 💡 Creative beret, 📝 Reporter notepad)
  on top of the provider-coloured shirt, a name tag (lead marked ★), and a
  blinking face whose **mood** (focused / happy / skeptical / worried / talk /
  celebrate) + emote bubble (💭 think, 💡 idea, 🎉 party, 💧 worry) are driven
  live by the mission pipeline — an agent thinks while it `/run`s, smiles when it
  concludes, frowns when it walks over to ask the lead, and the whole squad
  celebrates when the report lands (`engine.js drawFace/drawProp`, moods mapped
  in `missionDriver.js`)
- **VNG Campus** pixel world — The Loop HQ is a **modern open-plan office**: the
  six agents sit in parallel **bench-desk rows** divided by green
  **planter-box-on-cabinet islands** (wooden planters full of potted plants atop
  low white storage), with a meeting room at the end — modelled on a real
  Vietnamese tech-campus floor (`planterbox` furniture + generated desk/planter
  rows in `map.js`). The desk rows are deliberately **sparse** — the six agents'
  desks are anchored, but the rest of each row is a relaxed mix of a few desks,
  **potted plants**, the odd coffee machine and open floor (hashed in the row
  generator) so the office reads airy instead of a cramped wall of monitors. Plus the **GreenNode Gym** (pull-up bar,
  bench press, treadmills, dumbbell rack, mats — agents do animated pull-ups,
  presses, push-ups, treadmill runs and curls), a **swimming pool** where
  agents swim real laps back and forth (slower in water, stroke + splash
  animation), a **basketball court** with live dribbling and arcing shots at
  the hoop, ground passes on the football pitch, central plaza + fountain,
  Food Hall terrace, lake & trail, campus bikes, **tree-lined green avenues,
  flower meadows, rooftop + ground solar arrays, spinning wind turbines, planted
  green roofs, and a lily-pad eco pond crossed by a wooden bridge** (eco-friendly
  bigtech campus), and a **main-lobby logo
  monument** at the HQ entrance — the four VNG-ecosystem names as chunky extruded
  3D block letters in brand colours (VNG · GREENNODE on the left, ZALO · ZALOPAY
  on the right) sitting on stone plinths and **flanking a central walkway aligned
  to the office door** via `stampLogoBlocks(canvas)`; the monument tiles are
  **solid (non-walkable)** — agents path around the blocks and through the
  gateway, never over them — while the central passage and the side paths stay
  clear; the work buildings carry no logos
- **Zone signposts** — each area is marked by a cute **wooden pixel signpost**
  (a wood board with a dark outline on a post planted in the grass with a little
  grass tuft) naming it (HQ · Open Office, Meeting Room, GreenNode Gym, Food Hall,
  Library, Basketball, Football Pitch, Swimming Pool, Lake & Trail) so a
  first-time viewer instantly reads the campus. They show at the default/overview
  zoom and **fade out as you zoom in close** (`ZONES` in `engine.js`, drawn in the
  render pass with a zoom-based alpha)
- **Grounded characters** — every agent and mascot casts a soft pixel **ground
  shadow** (a flattened oval at the feet; per-mascot vertical offset via
  `CRIT_SHADOW` since each critter's feet sit differently) so they read as
  standing in the world rather than floating, matching the Mistral drop-shadow look
- **Warm "Mistral pixel" world** — the World Engine is styled after Mistral's
  warm pixel-art: a flat **cream base** (`#F2EFE6`) with a gentle **sunset wash**
  (warm cream top → soft amber bottom) and a faint warm vignette (no more cool
  lavender/mint gradient or dark-purple vignette); grass/path/plaza/floor sit in
  a warmer, fresher palette; **trees and hedges are chunky** with bold dark
  outlines, a hard ground **drop shadow** and 3-tone foliage; desks use warmer
  wood with a top highlight, front-edge shade and a soft shadow. Every room's
  furniture was redrawn chunky with a **bold dark outline + 2-3 tone shading**:
  the **library** bookshelves (dark wood frame + colourful book spines on two
  shelves), the **gym** kit (pull-up bar, bench-press with barbell + weights,
  treadmills with a console screen, a wooden dumbbell rack with coloured plates,
  purple yoga mats, basketball hoop), and shared **tables / benches /
  whiteboards** (Food Hall, meeting room, cafe). All grounded objects also get a
  soft ground **drop shadow** (`GROUND_SHADOW`). The **swimming pool and lake**
  are crisper Mistral water — a richer blue with bold wave dashes and a darker
  **bounding outline** on every open edge. **Building roofs** get a dark
  roof-matched outline + a soft cast shadow onto the floor below so they read as
  chunky volumes, and the grass is dotted with the occasional tiny **flower**
  (pink/yellow/cream) for life. Slow floating
  **gold motes** (`world._sparkles`) and drifting **falling leaves**
  (`world._leaves`) keep it alive. A **time-of-day light** (`dayTint`, UTC+7)
  washes the world golden at dawn (≈5–7h) and dusk (≈17–19.5h), clear by day and
  deep blue at night. Agents follow a **daily routine** — coffee/courtyard in the
  morning, sports midday, park/pool in the afternoon (ambient relax weighted by
  the clock). A **cinematic camera** (`world.glide`, smooth lerp) auto-frames the
  action — panning to the meeting room when a consensus debate starts (agents
  turning to **face the centre**, `world.faceCenter`) and back to The Loop when
  they disperse; any manual pan cancels the auto-follow (engine `render()`/`step()`)
- **Playful animations** — the campus has a sense of humour. Agents **react** to
  the pipeline with pixel emotes: a specialist whose claim gets fact-check-flagged
  goes 🤯 (`mindblown`) while the critic who caught it goes 😎 (`cool`); a report
  that lands at ≥80% confidence puts the reporter 🔥 (`fire`); and celebratory
  emotes (💡 idea, 🎉 party, 🔥, ❤️) make the agent **hop** in place. Between
  missions, relaxing agents randomly throw a 😎/❤️/🔥/🎉 (with the same little
  hop), and **paper planes** periodically glide across the open office between
  desks (`world.fx` `plane` kind, throttled, daytime-only) — small surprise-and-
  delight touches that make the world feel alive (`EMOTE_MAPS`, `drawAgent` hop,
  `tryPlane` in `engine.js`)
- **NAVI mascot** — VNG Games' orange **flame** mascot roams the campus as an
  articulated, expressive pixel character (`world._navi`, `drawNavi`/`pose`/
  `drawLimb` in `engine.js`): a chubby round flame wrapping a bright yellow folder-face
  (winky `><` eyes, blush, big open mouth) with a **"Navi" name tag** above its head
  (`drawCritterLabel`), drawn from movable parts so its limbs swing
  when walking, it waves to greet agents, pumps its arms when excited, and reacts to
  mission events (perk/cheer/spectate/party via `world.mascotReact`). Built procedurally
  with crisp `fillRect` art (no baked sprites); brand artwork is reference only
- **CapyZalo mascot** — Zalo's chubby **capybara** (`world._capy`, `drawCapy`): a big
  round brown head with a cream face patch, big round eyes, pink blush, whiskers and a
  happy open mouth, wearing a navy **"Zalo"** tee over a cream belly. Same articulated
  rig/behaviour as NAVI (roams, greets agents, reacts to missions)
- **TêTê mascot** — GreenNode's chubby green-and-blue **parrot** (`world._green`,
  `drawGreen`): a round two-tone body (green with **blue** wing/tail/crest accents and
  blue belly chevrons) drawn with a bold **navy outline**, **round light glasses**,
  an **orange hooked beak**, **orange feet**, a swept crest and a **raised waving wing
  with little orange spark dashes**. Same roams-and-greets behaviour as the others. Each new mascot is one
  `CRIT`/`CRITTER_DEFS`/`MASCOT_DRAW` entry + a world instance + a `step` call; the
  draw/step loops are guarded so only instantiated mascots appear (**NAVI + CapyZalo +
  TêTê** currently active). Each carries a **colour-coded name tag** (`CRITTER_LABEL`,
  drawn by `drawCritterLabel`): NAVI **orange**, CapyZalo **ocean blue**, TêTê **green**
- **Mascot mini-moments ("Snapshots & Sparkle")** — playful animations built on the
  `world.fx` system (`engine.js`): a **photo session** (`world.takePhoto` / `mascotReact("photo")`)
  where an agent walks up beside a mascot, both pose facing the lens, a little **camera
  drone** appears, a **flash** fires, and a **polaroid snapshot** pops + floats up trailing
  hearts (new `camera`/`flash`/`polaroid` fx kinds). It fires ambiently every ~70-130s
  (`tryPhoto`, picking a free mascot + nearby agent) and on a high-confidence report.
  Mission complete adds a **spin-pop** finale (both mascots spin with confetti +
  `discobeam` rays via `mascotReact("spinpop")`) and a **group photo**, plus a **cheer
  wave** (`world.cheerWave` → `stepWave`) that rolls a star/party emote down the line of
  agents while nearby mascots wave
- **Liquid Glass** chrome from the MSS/GreenNode design system bundle: split top-bar
  islands, dock with the water-glide white indicator (Agents · Activity ·
  Missions · New task), right-side sliding panels, iOS-26 one-panel-at-a-time
  behavior
- **World Pixel icon set**: the dock and Mission CTA use chunky multi-tone
  **Mistral-style pixel-art objects** (`components/pixelIcons.jsx`) instead of
  vector design-system icons — each is a 16×16 bitmap where every cell is a
  palette key, rendered as merged same-colour `<rect>` runs in an SVG with
  `shapeRendering="crispEdges"`, plus a 1px hard **drop shadow** and bold dark
  outlines so each reads as a little game sprite. Glyphs: `agents` (orange robot
  with a navy visor), `inbox` (envelope), `activity` (lightning bolt), `tasks`
  (clipboard checklist), `mission` (rocket). The warm sunset/cream `--px-*`
  palette tokens live in `agentsphere.css`; the rest of the Liquid-Glass chrome
  (top bar, panels) is unchanged
- **Missions panel**: history of every mission with status, creation time and a
  one-line verdict; open any of them to revisit the conclusion, full report,
  subtasks and the debate transcript. History persists in Postgres and survives
  restarts (a mission interrupted mid-run is marked `failed`). When a live
  mission finishes, the mission panel **opens itself conclusion-first** and
  takes over from any other open panel or agent view: a "Report ready" cue,
  then verdict + decision + confidence on top (scrolled to top), then the full
  report, subtasks and meeting below. The completed report is fetched from the
  server as a fallback if the live event stream did not already carry it, so the
  conclusion always lands. If any agent's answer came from offline simulation,
  the conclusion card carries a "Contains offline-fallback content" badge — and
  the activity feed tags those conclusions with `· offline fallback`
- **Confidence is single-source**: the only number shown is the
  `mission.report.confidence` badge on the conclusion card. The report body's
  Markdown renderer strips any leftover `Confidence: X%` / `Mức độ tin cậy: X%` /
  `Độ tin cậy: X%` — standalone line **or** inline `(N% …)` parenthetical — so a
  second number never appears (the server strips it at source; this is the
  belt-and-suspenders pass)
- **Conclusion never truncates mid-word**: the recommendation/conclusion snippet
  is clamped at a word boundary with an ellipsis (`clampWords`), so an
  informational answer or a long recommendation reads cleanly instead of cutting
  off mid-word
- **Login**: email → Google Authenticator (QR enrolment on first login) →
  6-box code, auto-verifies on the 6th digit
- **Squad setup**: one screen on first login — each agent card shows a name
  field, a model dropdown (live list of callable MaaS models, one model per
  agent) with a `reasoning`/`fast` tier hint, the agent's one-line role bio and
  its skill chips so you know what each agent does before picking its model —
  then Create Squad; the same screen reopens anytime via ⚙️ where both **names
  and models stay editable** (Save changes appears only when dirty). When an
  agent's name still matches its role the role label is hidden (no duplicate
  "Orchestrator Agent / Orchestrator Agent"); rename it and a `Role ·` eyebrow
  appears. Squads persist **per account** in Postgres — a new sign-in never sees
  another user's squad, and your own squad follows you across browsers.
- Agent names default to their role (`Orchestrator Agent`, `Research Agent`, …),
  are freely renameable and colored by the primary model's provider; tasks are
  assigned **only through the team lead**; campus life (huddles, coffee emotes,
  gym sessions, pool laps, pickup basketball) runs between missions — pure
  engine code, **zero model calls outside a mission**. Agents never fake-crash:
  when a real model call fails mid-mission the agent shows a ⚠ offline-fallback
  bubble instead (random staged incidents are off by default,
  `world.settings.incidents`)
- The campus **opens framed on The Loop HQ** (`world.centerOnHQ()` on init) so
  the first view is the squad's office, not empty grass
- **Responsive** (single breakpoint at ≤640px; tablet ≥768px and desktop are
  unchanged, the original 384px right-side sliding panel): the top bar collapses
  to brand + account (the world chip and clock hide so the brand never clips);
  side panels become a full-width **bottom-sheet** (anchored bottom, ~82vh,
  rounded top); the Squad-setup card lays its name input and model select full
  width with no right-edge overflow; the dock and zoom controls stay within the
  viewport. There are no other media queries besides `prefers-reduced-motion`
- **Accessibility basics**: the Onboarding overlay and every side panel are
  `role="dialog"` with an `aria-label` (the onboarding overlay is also
  `aria-modal`); icon-only buttons (close ✕, back, view-on-map, zoom) carry
  `aria-label`s; the activity feed announces realtime events via
  `aria-live="polite"`

Secrets live in `.env` (git-ignored); see `.env.example`. Optional: set **`TAVILY_API_KEY`** in `.env` to use the Tavily search API for `web.search` (clean, relevance-scored, real sources); without it the runtime falls back to free Bing RSS.
