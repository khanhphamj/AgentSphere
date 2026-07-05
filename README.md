# AgentSphere — VNG Campus

A virtual workspace for AI agents. Ask any *"Should we…?"* question and watch a lead
orchestrator and a pool of five generalist agents — each powered by a different model on
**GreenNode Model-as-a-Service** — split the work into parallel phases, exchange notes,
debate and deliver a recommendation, live on a pixel-art VNG Campus rendered under a
GreenNode **Liquid Glass** UI.

> *Có nên mua cổ phiếu X? Có nên học AWS? Có nên xây tính năng Voice? Có nên dùng MCP cho Agent? Có nên mở quán cafe?*
> — AgentSphere tự tổ chức công việc.

## How a mission runs

There are no fixed specialist roles. **Atlas** is the lead/orchestrator; the other five
agents (**Nova, Quill, Lumi, Echo, Pixel**) are a **generalist worker pool** the lead
assigns dynamically. The lead drives an **adaptive, parallel, phased** loop and acts purely
as a **check + synthesis** layer — it never touches external tools itself.

```
user question
   │
   ▼
🧭 Atlas (lead) ── triages the task (model) and plans PHASE 1: a set of parallel
   │               assignments, each a free-form {focus, lens} (lens = evidence /
   │               quantify / risk / options …) — NO fixed roles. Code falls back
   │               to a generic phase plan if the model call fails.
   │
   ▼   ┌─────────────────────────  PER PHASE  ─────────────────────────┐
   │   │  ① draft — workers run their assignments IN PARALLEL, each     │
   │   │     reading the shared BLACKBOARD (all prior phases' findings   │
   │   │     + the lead's synthesis notes) and grounding claims in tools │
   │   │  ② peer exchange — drafts are shared; each worker reacts to its │
   │   │     teammates' drafts and finalizes (skipped for 1-worker info) │
   │   └────────────────────────────────────────────────────────────────┘
   │                   │
   │                   ▼
   │   🧭 Atlas CHECK + SYNTHESIZE (`/synthesize`): flags weak/unsourced/
   │      contradictory claims, summarizes, and DECIDES — enough to conclude,
   │      or design the NEXT phase's assignments from what's still missing?
   │                   │ not enough (loop, ≤ MAX_PHASES = 3)
   │                   ▲────────────────────┐
   │                   │ enough             │
   ▼                                        │
   🧭 Atlas fact-checks every claim against the evidence each worker gathered —
      unsupported numbers get flagged ⚑ and confidence cut (code applies verdicts)
                   │
                   ▼
            conflict check (code) ──── conflicting stances?
                   │ yes                                │ no
                   ▼                                    │
        🏛 CONSENSUS MEETING — debate rounds (models),   │
          convergence check + decision (code)           │
                   │                                    │
                   ▼                                    ▼
            🧭 Atlas synthesizes the final report from the squad's contributions
                   │
                   ▼
        TL;DR · per-focus sections · verification · recommendation + confidence
```

Everything streams to the browser over WebSocket — the campus is a real-time
visualization of the actual backend pipeline (gathering in the meeting room,
fanning out to desks, comparing notes, debate speech bubbles, the report landing
in the panel).

**Workers exchange information two ways.** Across phases, every worker reads the shared
**blackboard** — the accumulated findings of all earlier phases plus the lead's synthesis
notes — so later work builds on earlier work instead of repeating it. Within a phase, the
workers' drafts are posted to a phase board and each worker runs a second **peer-exchange**
pass (`/run` with `stage:"exchange"`) reacting to its teammates' drafts before finalizing
(emitted as `agent.share`; skipped when a phase has a single assignment).

**Orchestrator as the check + synthesis layer.** After every phase the lead runs
`POST /synthesize` — one model call that judges whether the squad's gathered information is
**sufficient and trustworthy** to conclude, flags weak/unsourced/contradictory claims
(`concerns`), and either stops or returns the **next phase's assignments** aimed at the
remaining gaps (`{ phaseSummary, concerns, sufficient, nextPhase:{goal,assignments} }`, with a
deterministic `synthesizeByCode` fallback so it still works offline). This is **adaptive
phasing**: the lead decides each phase from what the previous one actually found, up to
`MAX_PHASES` (default 3). It emits `phase.started` / `synthesize.started` / `phase.synthesized`
events (live on the campus), records every phase on `mission.phases`, and surfaces a
**"Tổng hợp theo giai đoạn"** card (phase count + last synthesis + concerns) in the report panel.

**Deep-Dive mode + scenario simulation.** A mission can be assigned in **Deep-Dive** mode
(🔬 toggle on the compose form → `depth:"deep"` flows frontend → gateway → orchestrator). In
deep mode the pipeline runs an extra **scenario simulation** step before the report —
`POST /scenarios` has the lead model project **best / most-likely / worst** outcomes with
estimated probabilities + a sensitivity note (model call, deterministic `scenariosByCode`
fallback) — and the lead writes a **structured in-depth proposal** (context, options/comparison
matrix, phased roadmap, risks & mitigations, a Scenarios section, next steps) instead of a short
recommendation. The scenarios surface as a card in the report and ride `mission.scenarios`
(restored on reload); events `scenarios.started` / `scenarios.done` animate it live. Quick mode
keeps the fast single-recommendation flow. Tunable via `MAX_PHASES`; deep adds the
scenario pass on top of the adaptive phase loop.

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
| `frontend` | 5173 | Pixel campus + Liquid Glass UI (Vite + React, design-system bundle). World art follows a **Mistral-icon pixel craft**: every object (trees, furniture, water bodies, agent sprites, turbines, brand letters) keeps its natural template color but is drawn with a 1px outline in the darkest step of its *own* hue, 3-4 flat shade tones (light top-left → dark bottom-right, derived from the base hex via the local `shade`/`shadeHex` helpers), sparse 1-2px white glints on glass/water/metal, and stair-stepped corners; ground tiles stay flat. Scheduled world fx (e.g. the delayed basketball `flash`) are skipped by the render loop until their `t0` arrives — a future-scheduled fx previously fed a negative radius into `ctx.arc` and aborted the frame's fx pass. **The map is the real VNG Campus floor plan** (user-provided layout): central skylit ATRIUM (glass-grid tile + spotlit planter island modeled on the real lobby photos), MAIN LOBBY (charcoal slate, white slat feature walls, red WE ARE VNG lettering) opening to CỬA CHÍNH and two car parks (bãi xe 8/10 chỗ with pixel sedans), meeting band + GAME CORNER arcade row north of the atrium, Seating Area lounge, Văn Phòng 02 squad office (six desks) + decorative VP offices, east service wing (IT Helpdesk, Pantry, Phòng Y Tế, Phòng Đa Năng housing the gym), outdoor NE swimming pool + round spa, 7-Eleven street-facing store, delivery-road roundabout with the giant "Cây Lộc Vừng SIUUU TO", and a basketball court; football pitch/lake were removed with the engine's sport/photo/plane/camera systems retargeted (new tiles ATRIUM/LOBBY/SLAT/PARK/CORR ids 18-22, PLACES/HUDDLES/deskTiles rewritten to the new coordinates, BFS-verified walkability over every door/spot/desk). **Agents are social**: an ambient duo-chat system (`stepDuos`) sends pairs of free agents to face each other at lobby/atrium/pantry/seating spots exchanging `AMBIENT_DUO` lines with nod/laugh reactions, passing agents pause and wave at each other (60s per-pair cooldown), bus-message walk-overs slide a paper pixel between sender and recipient, celebrations trigger paired high-fives with a gold-star burst, and morning hours bias relaxation toward the lobby/atrium hubs. **Animation layer** (pixel-anim-life): humans walk a 4-phase weighted gait with counter-phase arm swing and shadow squash, idle with per-agent-phase breathing/blink/weight-shift, type with alternating hands + laptop glints, swim a 4-phase stroke with splash particles, and exercise with staged bar/dumbbell sequences + sweat drops; the world adds viewport-only water shimmer, butterflies over flowers, occasional bird flocks with ground shadows, coffee steam, blinking desk monitors, speech-bubble pop-in, and varied leaf flutter — all integer-snapped with hard particle caps so the rAF loop stays at 60fps. **The environment is natively reactive**: doors slide open when someone approaches (3-state overlay per DOOR tile), desk monitors are dark until their agent sits (with a 1-frame boot flash), night brings warm light pools under the atrium/lobby spotlights and office windows, swimmers leave fading wet footprints on the deck, and slate floors give shine ticks instead of grass dust; agents also USE the world — pantry visits brew a coffee they carry back and sip at their desk (`a.coffeeUntil`), Game Corner sessions play out with screen-flash + button-mash and win/lose (or versus) endings, seating-area visitors sit ON the sofas, 7-Eleven runs end with bench snacking, the lộc vừng sheds petals that can land on a visitor's head, revived agents rest on the Phòng Y Tế medbed, and once per in-world day a car commutes into the parking lot dropping off a staff extra who walks through Cửa Chính into the lobby. **Premium elevation pass**: porcelain floor grade with per-zone materials (corridor porcelain, sage meeting carpet, bordered rugs), a run-aware wall system (greige face + dark cap + ink outline + baseboard + ambient-occlusion contact shadows), window strips casting daylight patches, atrium benches/corner planters/diagonal skylight bands, lobby pendants + reception rug + door sheen, wall art/bookshelves/storage so no room reads empty, large/small tree variety over a desaturated mow-striped lawn, curbs + zebra crosswalk + numbered parking bays, an always-on 4-step vignette, NW-unified shadows, and indoor zone labels as wall plaques (outdoor keep wooden posts); the Liquid-Glass chrome runs on a token system (radius/8pt spacing/ink scale/glass blur+saturate/two-layer shadows/150ms easing) with tabular clock, status-ring avatars, micro-label headers, dock glow-pill active state and ink-green CTAs |
| `gateway` | 8080 | Auth (work email → Google Authenticator TOTP → JWT), REST/WS proxy (verifies the JWT on the `/ws` upgrade and injects a trusted `x-user-email`), attaches internal client credentials, snapshots the user's squad onto `POST /missions`, returns clean JSON errors (a JSON-parse-error handler avoids leaking stack traces) |
| `db` | 5433 | Postgres 16 — user accounts (TOTP), per-account squads, mission history |
| `orchestrator` | 8081 | Bounded per-account mission scheduler (watchdog + deadline), consensus meeting, fail-closed real-time event hub (WS with per-owner replay from a DB-persisted `mission_events` log) |
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
Scheduled standing-mission runs inherit their creator's email.

The live WebSocket is **authenticated and fail-closed**: the `/ws` upgrade carries
`?token=<JWT>`, the gateway verifies it and injects a trusted `x-user-email` on the
proxied upgrade (an unauthenticated or invalid socket is rejected with `401` — the
identity is never taken from a client-supplied query param), and `emit()` only
delivers a mission's events to a socket whose verified email matches the mission
owner. An unknown identity or unknown owner receives **nothing**, so one account's
campus can never animate — or eavesdrop on — another's run.

**Squad is snapshotted per mission.** The gateway sends the requester's squad with
`POST /api/missions` and the orchestrator freezes it onto `mission.squad`; the
pipeline resolves every agent (names, models, standing mandates) from that frozen
snapshot. A second account opening the app or editing its roster can no longer
change the agents — or leak its mandates into the system prompt — of someone else's
in-flight mission. Squads persist per-account (`squad:<email>` rows in `org_config`);
standing-mission runs snapshot their creator's squad.

**Concurrency.** The orchestrator runs missions through a bounded scheduler, not a
single global slot: up to `MAX_CONCURRENT_MISSIONS` (default 3) run at once, capped
at `MAX_CONCURRENT_PER_USER` (default 1) per account, so one user's mission never
blocks another's. Each run is guarded by a watchdog (`MISSION_DEADLINE_MS`, default
10 min — the adaptive phase loop does more model work than a flat run) that aborts its
in-flight model calls via an `AbortController` and marks the
mission failed if it overruns. On restart, missions that were in flight are marked
failed, persisted, and pushed to the owner's Briefing Inbox (no silent loss). The
standing-mission scheduler is gated on per-account in-flight count, not the global
queue, so a busy campus can't starve scheduled runs.

**Reload restores the active mission.** Mission state lives server-side (DB-backed
snapshot + a **DB-backed event log**). On load the frontend calls `GET /api/missions`,
finds the most recent non-terminal mission, rehydrates the live panel from its
`GET /api/missions/:id` snapshot, and the authenticated WebSocket resumes streaming —
so refreshing the page no longer loses the in-progress run.

**Durable event log.** Every emitted event is persisted to a `mission_events`
table (`(mission_id, seq)`), in addition to a small in-memory buffer used as a
fast-path/degraded-mode fallback. WS reconnect replay and `GET /missions/:id/events`
serve from the DB, so a mission's full transcript survives an orchestrator restart and
is not subject to the in-memory buffer's 30-mission cap. (A mission that was *executing*
when the orchestrator restarted is still marked failed — execution does not auto-resume —
but its transcript is now replayable and the owner gets a failure briefing.)

**Per-account LLM circuit breaker.** The agent-runtime breaker (`llm.js`) is keyed by
`account|model`, with the account derived from the gateway-/pipeline-forwarded
`x-user-email` via an `AsyncLocalStorage` context — so one account tripping a model
(repeated 404/timeout/etc.) no longer forces every other account onto that model's
cooldown. Standing-mission and mission-outcome writes use **targeted `jsonb_set`
updates** (`standingStore.patchFields`, `missionStore.setField`) instead of
whole-object upserts, so the 60s scheduler's `lastRunAt` write can't clobber a
concurrent enable/schedule PATCH (and vice-versa).

> **Intentional design note.** The web-search cache is shared across accounts **by
> design** — it only caches *public* web results (keyed by normalized query), so
> account-keying it would just triple Tavily spend with no private-data benefit.

## Harness layer — code vs model

The runtime routes every action to the cheapest sufficient handler. **If an action
doesn't need a model to process and answer, it's plain code** — instant, free,
reproducible:

| action | handler |
|---|---|
| language detection, choreography | code |
| **mission triage** — work (decision) / info (factual lookup) / fun event / unclear, and the phase-1 parallel assignments (`/plan`) | **model** (orchestrator) |
| **triage fallback when the plan model fails** (e.g. an upstream `fetch failed`/timeout on the orchestrator model) | code (`triageByCode` — a keyword heuristic that still splits info vs work, so a factual question never falls through to a full decision squad with mismatched cost/risk/alternatives subtasks) |
| phase-plan fallback + generic assignment wording when the plan model fails | code (`planByCode`) |
| **current-date awareness** — every plan/run/report prompt is prefixed with `nowCtx()`: *"Today is `<YYYY-MM-DD>` (year `<Y>`) — this is the CURRENT date, not your training cutoff. For anything time-sensitive use `<Y>` in your search queries, prefer the most recent sources, and state what date the data is as of."* | code injects the live server date (`prompts.js`) — fixes agents searching `2022/2023` for "latest" topics. The stale hardcoded example (`"…trial results 2023"`) and the seeded-tool year (`data.metrics`/`market.trends`) are now the **dynamic current year**; the reporter is told to stamp time-sensitive figures with their "as of" period |
| **clarifying question** back to the user when the ask is ambiguous | **model** asks, code pauses/resumes the mission |
| **compound-ask split** — a mission that bundles 2+ SEPARATE decisions ("hire devs AND migrate DB AND rebrand?") can't share one proceed/do-not-proceed verdict, so the planner routes it through the clarify channel: it names the separate decisions and asks which ONE to tackle first (each is best run as its own mission for a clean, separately-calibrated verdict). A single A-vs-B *choice* ("React or Vue?") stays one decision | **model** (planner) detects, reuses the clarify pause/resume |
| **worker reasoning** — draft + peer-exchange (`/run`, `stage:"draft"|"exchange"`) | **model** (with tools), prompted to work the focus as an **agent loop** (decide what evidence the focus needs → gather it with tools → reason from what it actually found, not assumptions → conclude, with every figure traced back to gathered evidence) |
| **worker self-verification** — a second "verify your own work" turn after the draft (`reflectPrompt`, gated `HARNESS_REASONING != "off"` + `stage:"draft"` + `complexity:"standard"` + real non-simulated output + non-`insufficient` stance) | **model** (the same worker) re-reads ONLY the evidence it actually gathered (the real, non-error tool results) against its own draft and checks, step by step: is every claim/number/source grounded, does the reasoning follow without leaps, did it answer the focus at the right scope, is confidence calibrated to evidence strength — then keeps or returns a corrected `{say,summary,keyPoints,stance,confidence}`; the merged result is flagged `verified:true`. This is the agent-loop "verify work" step: it catches ungrounded figures and over-confidence *before* the lead's synthesis, raising reasoning quality without adding a tool round. Skipped for `simple` info lookups and offline-sim runs to control LLM volume |
| **phase check + synthesis + next-phase decision** (`/synthesize`) | **model** (lead), deterministic `synthesizeByCode` fallback |
| Monte Carlo simulation (`data.simulate` tool) | code (seeded GBM, 2000 paths) — **a worker with a quantify lens is prompted (not hard-forced) to call simulate only for a quantitative what-if, never an informational lookup**, so a factual "current savings rate?" no longer triggers a fabricated simulation it has to talk around |
| real web search / market data (`web.search`, `market.*`) | code — web.search runs a **3-provider fallback chain**: **Tavily** (AI-native, relevance-scored, synthesized `answer`) → **LangSearch** (`api.langsearch.com/v1/web-search`, Bing-compatible AI search; called with `summary:true` so each result carries a **full long-text summary** ~3000 chars, not just a snippet — granted by `LANGSEARCH_API_KEY`) → **Bing RSS**. Each tier is tried in order and the first that returns usable results wins, so when Tavily's plan is exhausted (HTTP 432) LangSearch's rich summaries serve instead of dropping straight to the weaker Bing path. The whole chain then runs through the agentic `deepenSearch` (auto-requery + link-following). The Bing path **filters junk hosts, dedupes to one freshest result per hostname, captures `pubDate`, fetches the top result's real page content, and RELEVANCE-RANKS** *inside the tool*: navigational pages (sign-in/login/account/homepage) are dropped, results are scored by diacritic-insensitive query-term overlap (≥2 terms = relevant; ≥1 = weak fallback; cross-language queries that match nothing keep the freshest non-navigational results), and the tool returns `dropped` + a `lowRelevance` flag so the agent reports honestly ("search returned nothing convincing") or abstains instead of forcing an answer on off-topic hits. The report's sources are split into **"Real data sources"** (actual URLs + real-data tools) vs **"Modeled / simulated inputs"** (now only `data.simulate`, the Monte-Carlo model) so a model output never masquerades as a real citation. **All formerly-seeded "demo" tools are now real-data-backed**: `kb.query`, `data.metrics`, `data.benchmark`, `market.trends`, `market.competitors`, `risk.checklist`, `risk.precedents` each run a tailored Tavily/Bing search (e.g. risk.precedents → "<topic> real case studies successes failures"), returning live sources instead of RNG fakes; **`data.benchmark` is domain-aware** — when the compared options are AI / coding models or dev tools it queries for the **latest coding-benchmark leaderboards** (freshness-led: "…benchmark comparison latest leaderboard results &lt;year&gt;", deliberately *not* a hardcoded list of benchmark names so new benchmarks surface and old ones don't pin the result), so a "qwen-code vs codex" comparison actually returns current leaderboard numbers instead of generic pros/cons; science comparisons similarly bias to latest peer-reviewed results. The Analyst prompt tells it to call `data.benchmark` with `options:[…]` and cite whatever the current standard benchmarks are (research's web.search is likewise nudged to search the latest leaderboards for the year); `data.simulate` stays a real Monte-Carlo simulation (uses real symbol history when given a ticker), and `market.quote/history` stay real DNSE/Yahoo prices. **All searches share a 15-min in-process cache** keyed by normalized query — identical queries (across tools/agents/missions) return the cached result, and concurrent identical searches **join the same in-flight request** — so the squad never spends two Tavily credits on the same query (`cachedSearch` in tools.js). **No narrow/stale framing is baked in:** every `data.*`/`market.*`/`risk.*` search tool accepts a caller-supplied `query`, so the agent (which has the current date via `nowCtx`) steers a specific, current, domain-appropriate search; each tool's *fallback* template is freshness-led (`<topic> … <year>`) rather than a fixed business/keyword list that ages out. `market.quote`/`market.history` try VN first (DNSE, then Yahoo `.VN`) then fall back to the bare global ticker, so non-Vietnamese symbols resolve too. **Time-sensitive queries get real-time treatment** — when the query signals recency (latest / news / current / today / `tin tức` / `giá` / `mới nhất` …) web.search switches Tavily to its **news topic with a ~14-day window** and re-ranks the Bing fallback by freshest `pubDate` first, so "latest…" questions pull current news rather than stale pages. **Tavily fetching is tuned**: it pulls a wider candidate set, **dedupes by host** for source diversity, and derives `lowRelevance` from Tavily's own relevance score (so a weak/off-topic search now correctly biases the agent toward "insufficient" instead of always reporting confident). **Depth upgrade**: Tavily runs at **`search_depth:"advanced"` with `include_raw_content`** (full page text, up to 8 results × ~3000 chars, not just snippets); the Bing fallback fetches the **top 3 pages' full content** (≤2500 chars each) not just one; `web.fetch` reads up to **12000 chars**. **Agentic deepening** (in `deepenSearch`, `WEB_DEEP`=on): when a search comes back `lowRelevance` or thin (<3 results) it **auto-requeries** once with a refined query and merges new hosts; and for *relevant* base results it **follows the most on-topic in-content link** (anchor-text relevance ≥2, skipping nav/junk/homepages) from the top 2 results and fetches that page too — so the squad crawls one hop deeper into primary sources. Deepening is **skipped when results stay low-relevance** (no point crawling junk), and each enriched result is tagged `via:"linked from <host>"`; the tool surfaces `requeried`/`linksFollowed` for transparency |
| **lead guidance** when a worker is blocked (`/lead-answer`) | **model** (orchestrator) |
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
| **robust JSON extraction** — the #1 cause of "agent unresponsive / model answered in an unusable format" was a usable answer the parser couldn't read. `extractJson` now strips `<think>`/reasoning wrappers, scans for **string-aware balanced objects** (braces inside string values no longer break brace-counting), tries longest-first, and salvages near-miss JSON (trailing commas, smart quotes, stray control chars / raw newlines in strings). Only genuinely-absent JSON now falls through to the one strict-JSON retry → lead takeover | code (`llm.js`) |
| **flexible tool choice (`tool_choice: "auto"`)** — the runtime never hard-forces a tool (`required`/`{type:function}`); it always sends `auto` and lets the model decide whether to call a tool, guided by the role prompt. This keeps the squad's **thinking-mode** models (qwen3, R1-style, etc.) working — forcing a tool there returns `<400> InvalidParameter: tool_choice ... not supported ... in thinking mode`. Callers already cope with a no-tool-call response (return the prose + `extractJson` fallback), so it stays flexible across providers | code (`llm.js`) |
| **informational fact-check** — info-only missions run just `[research]` with no Critic, so they used to skip `/verify` entirely and a factual answer's unsourced numbers went out unchecked. The deterministic uncited-figure pre-flag (`uncitedFigures`, no model) now also runs on the lone research output when `informational` — gated so it never double-counts with the decision-mission `/verify` path — flagging figures absent from gathered evidence and denting confidence | code (`index.js`) |
| **search grounding enforced** — if every search a specialist ran came back `lowRelevance`, the run is treated as not-grounded: confidence is capped and a support/oppose stance is softened to conditional, and low-relevance hits are excluded from the "did we get data?" test, so the model can't project confidence onto off-topic results | code (`index.js`) |
| **anti-stale-knowledge (harness-enforced grounding)** — the model used to answer current-state questions from its *training memory* (e.g. naming "qwen2.5" when the current release is newer). Rather than *instruct* the model to search, the **harness pre-fetches**: for the Research role it runs a recency-aware `web.search` itself (server-side, deterministic, before the model reasons) and injects the live results into the agent's context, so it grounds in current data regardless of what it recalls or whether it would have chosen to search. The pre-fetched result is recorded as real evidence (cached, shared with later searches). Any research/analyst run that *still* produced an answer with **no grounded tool result** has its confidence capped and is labelled "not grounded in a live source — may be outdated" | code (`index.js`) |
| **prompt-policy block** — a provider 400 that flags a prompt as violating usage policy (`PromptBlocked`/`isPromptBlocked` in `llm.js`) is detected specifically: it does **not** trip the circuit breaker (the model is healthy, the prompt was rejected), is **not** retried across every model, and degrades to the offline fallback with a clean `"prompt blocked by provider usage policy"` label (even when `LLM_SIMULATION=off`) — so a flagged question never surfaces a raw 400 or 500-crashes a mission | code (`llm.js`) |
| **synthetic-output marking in memory** — offline-fallback conclusions are tagged in long-term memory and labelled "(synthetic, treat as weak)" when recalled, so fabricated precedents don't masquerade as real experience; lessons dedupe by mission title | code (`memory.js`) |
| **conflict check** — hold a consensus meeting when the squad genuinely disagrees: ≥2 distinct stance camps present **and** at least one definite lean (a `support` or an `oppose`), so a `support`-vs-`conditional` split debates too — not only the rare hard `oppose`-vs-`support` (`pipeline.js`) | code |
| **debate turns** (`/meeting-turn`) | **model** |
| consensus decision + condition harvest | code |
| memory recall + lesson consolidation | code |
| context budgeting + output clamps | code |

### Inter-agent harness — agents that talk to each other

AgentSphere is migrating from a **star topology** (every signal relayed by the orchestrator — a 14-line blackboard digest, a single phase-0 peer-draft swap, a scripted debate) toward a **Claude-Code-style harness where agents interact directly**: addressable teammates an agent can message or hand work to, mid-loop, as a tool the model itself chooses to call. The migration is **phased and flag-gated** (`INTERAGENT_BUS`), so the proven scripted pipeline stays as the fallback and the live demo never breaks; with the flag **off** (default), behavior is exactly as before.

**Phase 0 (shipped) — the mailbox bus + shared task board:**

| piece | how it works |
|---|---|
| **`send_message(to, body)`** / **`post_task(title, detail)`** — model-facing tools | Exposed to every worker through the normal `toolDefs`/`runWithTools` tool loop (real per-tool JSON schemas, not the generic shape), gated on `INTERAGENT_BUS=on`. The **model decides** to message a peer or post a sub-task — the authentic Claude-Code mental model, not an out-of-band script. Served by a new virtual policy server **`mcp-mailbox`** in `registry.json`, granted to `pg-worker`. |
| **orchestrator `POST /missions/:id/bus`** — the single writer/router | When a worker calls a mailbox tool, the runtime's `busCall()` POSTs to this endpoint instead of running a local executor, so the **orchestrator stays the sole owner of mission state and the sole event emitter** (the runtime is stateless). `kind:"message"` appends to `m.mailbox` (validates the recipient against the squad, rejects self-messages and unknown ids with a helpful error the model can act on); `kind:"task"` appends to `m.board`. Both ride the existing mission JSONB blob — **no DB migration**. **Ownership-gated:** beyond `internalAuth`, the endpoint requires `m.userEmail === x-user-email`, and the runtime threads the mission's `userEmail` through `bus` → `busCall` so its own calls pass while a cross-account caller gets `403` — inter-agent state mutation can't cross account boundaries, matching the owner-scoped event emit. |
| **delivery** | Async, between-turn: a worker reads its **unread inbox** (messages addressed to it) injected as an `inboxBlock` at the top of its next `/run`, and the orchestrator marks them read on delivery. Within-phase parallel workers see each other's messages on the next phase; the visible interaction fires immediately on send. |
| **events → pixel world** | Every bus op emits `agent.message` / `task.posted` on the WS stream; the frontend animates the sender **walking to the recipient's desk** to deliver the note (reusing the `agent.question`/`agent.answer` walk-over) and logs it, so agent-to-agent interaction is something you watch happen on the VNG Campus. |
| **adoption is model-driven** | Like Claude Code, peer messaging/delegation scales with model capability: in testing `gpt-5-mini` and `qwen3.7-plus` reach for `send_message` when their focus overlaps a teammate's; weaker models (e.g. `gpt-4o-mini`) tend to just research and answer. The scripted phase-0 exchange remains the collaboration floor so the squad still reconciles even if no one uses the bus. |

**Phase 1 (shipped) — PreToolUse / PostToolUse hooks:** the worker tool loop's inline `decode → authorize → execute → log/remember` is now an ordered **hook pipeline** — `preToolUse[]` (a hook can **block** a call before it runs, returning a model-visible error; the default hook is the policy `authorize()` gate) and `postToolUse[]` (side-effects after a call; the default records the result to memory) — wrapped in a single reusable `executeToolCall(call)` (`index.js`). Behavior-preserving (verified: tool calls flow through unchanged, normal `stance`/`confidence` output, deny path intact), but it gives the **seams** the rest of the migration plugs into: P2's loop reuses `executeToolCall`; P4 adds a human-approval (`always_ask`) `preToolUse` hook and **per-agent permission profiles** without touching the loop; honesty checks become a mandatory pre-finish `postToolUse`/finalize hook.

**Phase 2 (shipped) — autonomous agent loop (`LOOP_MODE`):** alongside the bounded `runWithTools` (a fixed 2-4 tool rounds → forced-JSON turn), there is now an open-ended `agentLoop` (`index.js`) — a real ReAct loop where the **model decides when it's done** by calling a **`finish` tool** whose arguments *are* the structured conclusion (`say`/`summary`/`keyPoints`/`stance`/`confidence`). It iterates gather→reason→act until `finish`, or the model stops calling tools, or a **step + wall-clock-deadline budget** is hit (then a forced-JSON turn coerces an answer — never sinks the mission). **Context compaction** (`compactLoopMessages`) stubs older tool results so a long loop doesn't overflow the window. It reuses the P1 `runToolCall`/`executeToolCall` hook pipeline verbatim (same authorize gate, same mailbox routing, same logging), so every tool — including `send_message` — works identically inside the loop. Gated by `LOOP_MODE=on` and only for the substantive `draft` stage; **off by default** so real missions stay on the proven bounded path until P3/P4 land. Verified: the loop runs multi-step gather then concludes with a calibrated result (`gemma-4-31b-it`: 5 search steps → honest low-confidence conclusion when evidence was thin).

**Phase 3 (shipped) — synchronous `ask_peer` + `board.read`:** the bus gains two more model-facing tools. **`board.read`** (read-only) returns the open sub-tasks + recent messages so an agent can see what the squad is doing. **`ask_peer(to, question)`** is the **synchronous call-and-await** primitive — the closest thing to a Claude-Code subagent call: the asker's tool call **blocks**, the orchestrator runs the *target* peer's new bounded **`/reply`** endpoint (a single tool-less model turn → a 1-3 sentence answer), emits `agent.ask`/`agent.reply` (the frontend animates the walk-over + reply), and returns the answer into the asker's turn so it reasons with it before concluding. Because a nested call fans out model load on a rate-limited backend, it ships **`INTERAGENT_SYNC`-gated, off by default**, with hard caps enforced orchestrator-side: **≤2 asks per agent**, **≤6 per mission**, an **in-flight mutex** (one ask at a time — no A→B→A storms), unknown-peer/self-ask rejection, and a per-ask timeout. `/reply` is deliberately tool-less and single-turn, so it cannot recurse. Verified: a real peer answer round-trips and every cap fires.

**Timeout hierarchy** (raised so a synchronous `ask_peer` can't be cut off by an outer timeout): a whole **mission** runs up to **1800s** (`MISSION_DEADLINE_MS`, env-overridable); each orchestrator→runtime call (`/run`, `/synthesize`, `/report`, …) up to **360s**; the `/reply` an `ask_peer` triggers up to **190s**; the `ask_peer` wait itself up to **180s**; the autonomous `agentLoop` up to **90s** of its own iterations (a trailing ask still fits inside the 360s `/run`). Ordering invariant: mission(1800) > /run(360) > /reply(190) > ask(180).

**Phase 4 (partial — work-stealing shipped) — the shared board becomes a work queue:** `post_task` items now have a lifecycle — `open → claimed → done` — driven by two new model-facing tools (`claim_task(taskId)`, `complete_task(taskId, result)`) and three bus kinds (`claim`/`complete`/`board_read`). A second claim on an already-claimed task is rejected, so two agents never duplicate. Two ways work gets stolen: an agent in `LOOP_MODE` can `board.read` then `claim_task` itself, and — for the scripted pipeline — the orchestrator runs a bounded **drain** after the phase loop (`drainBoard`, ≤2 open tasks) where idle pool workers claim, run, and post results back, feeding the blackboard. Events `task.claimed`/`task.completed` animate on the campus. Verified: the full claim→reject-double-claim→complete state machine.

**`spawn_agent` (shipped, `INTERAGENT_SPAWN`+`LOOP_MODE`-gated):** the literal Claude-Code **Task tool** — inside the agent loop, a worker can call `spawn_agent(focus, lens?)` to delegate a focused sub-question to a **fresh child agent** that runs its *own* bounded loop (reusing the same model/grants/hooks) and returns only its structured finding as the tool result, so any agent becomes a fan-out point, not just the orchestrator. Recursion is **structurally bounded** — `handleSpawn` enforces `SPAWN_MAX_DEPTH` (1, so a child can't spawn) and `SPAWN_MAX` (2 delegations per loop) *before* recursing, the tool is removed from the toolset once exhausted, and the same step/deadline budget applies per child. Off by default. Verified: granted + exposed only with the flag, caps wired. (Live delegation is model-dependent — like `send_message`, weaker models tend to research directly; the same verification round surfaced that the open-ended loop **over-searches** on weak models, so `agentLoop` now caps `maxSteps` ≤8 and injects a mid-loop "call `finish` now" nudge.)

**Per-agent permission profiles (shipped):** a second `preToolUse` hook enforces an optional per-agent `caps` profile *on top of* the role's policy grants — `caps.allow` (an allowlist of server ids — the agent may use only these) and/or `caps.deny` (a denylist) — passed through `/run` from the squad member and threaded into every tool call (the deterministic pre-search respects it too). So two workers on the same `pg-worker` role can have different reach (e.g. one web-only, one data-only). Verified: an agent with `deny:["mcp-market"]` has its market calls blocked while web passes; an agent with `allow:["mcp-knowledge"]` is blocked from everything but the KB. Default (no `caps`) = role grants unchanged.

**Interactive human-approval (shipped, `HUMAN_APPROVAL`-gated):** an `always_ask` gate over designated tools (`APPROVAL_TOOLS`, default `spawn_agent,ask_peer`). When on, a `preToolUse` hook (after authorize + caps) **pauses** the agent mid-loop and calls the bus `kind:"approval"` → the orchestrator emits `approval.request`, registers a pending promise, and **blocks** until the director answers via `POST /missions/:id/approve` (or an `APPROVAL_WAIT_MS`=120s timeout → auto-deny). The campus shows a **director approval banner** (Approve / Deny) wired through `missionDriver` → `mission.pendingApproval` → `api.approveMission`; the worker's tool proceeds only on allow, otherwise gets a model-visible "director did not approve" so it routes around it. Timeout chain keeps it safe: ask/approval wait (≤120-135s) < `/run` (360s) < mission (1800s). Verified: allow→tool runs, deny→blocked, unknown/late approval id rejected.

**`PIPELINE_MODE=loop` scheduler — satisfied by existing pieces (no rewrite):** the goal ("orchestrator as a thin scheduler over autonomous agents") is **already achieved** without a from-scratch rewrite — with `LOOP_MODE=on`, the pipeline's per-assignment `/run` calls already run as open-ended `agentLoop`s (autonomous agents), they coordinate live via the bus (message/ask/board), the lead's `/synthesize` **is** the adaptive stopping signal (sufficient → stop; else another phase, capped by `MAX_PHASES`), and `drainBoard` clears leftover work-stealing tasks. A separate emergent-`settled` rewrite would duplicate this while risking never-settle/deadlock, so it's a deliberate **non-goal**. State present for any future variant: `m.mailbox`, `m.board`, `m.agentRuns`.

### Capability amplification — a model-agnostic, domain-optimized harness

The guiding thesis: AgentSphere's harness is to **decision/research** what Claude Code's is to **coding** — point it at *any* model and the harness extracts that model's best work *for this domain*. You already swap models freely (per-agent in Squad setup), and the harness handles any of them robustly (per-model budgets, circuit breaker, JSON coercion, thinking-mode `tool_choice:auto`, code/simulate fallback). On top of that sits a **capability layer** that applies the right strategy per model.

| piece | what it does |
|---|---|
| **`capabilities.js`** — per-model profiles | A static `CAPABILITY_PROFILES` registry keyed by the same model ids as `MODEL_LIMITS`, scoring each model 0-5 on reasoning / quantitative / web / coding / synthesis / Vietnamese / speed / cost plus `{tier, rateLimitRisk, jsonNative}`. `getProfile(model)`, a `LENS_CAPABILITY` map (lens → required capability, for future routing), and `strategyFor(model, {complexity, informational})` which picks the per-model execution strategy. |
| **self-consistency** (shipped quick win) | For small/shallow-tier models (the cheap, fast, low-rate-limit ones), `/run` samples the conclusion **N times** (default 3, from the evidence already gathered — *no extra tool calls*), then **votes**: majority stance + median confidence, surfaced as `selfConsistency:{samples, agreement}`. This lifts a shallow model's unstable single-shot reasoning toward a reliable answer for nearly-free, since the extra calls hit the cheapest model. Strong/frontier models stay single-shot. Configurable: `SELF_CONSISTENCY` (on by default), `SELF_CONSISTENCY_TIERS` (default `small`), `SELF_CONSISTENCY_SAMPLES` (default 3). Verified: a mid-tier model ran 3 samples and voted (`{samples:3, agreement:100}`); a strong model correctly stayed single-shot. |

This is the foundation of the capability-amplification roadmap (the rest — capability-aware **routing** of task→model-strength, mid-tier **decompose-then-recompose**, mandatory **verify** on high-stakes, and a cost-aware **escalation ladder** small→strong on low confidence — all reuse the existing breaker, lead-takeover, self-verify, budgets and code-vs-model fallback). All additive; default behavior unchanged for strong models.

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
| `gemini/gemini-3.1-flash-lite`, `gemini-3-flash-preview` | 128k | 8k | |
| `bytedance/seed-1-6-250915` / `-flash-250715` | 128k | 8k | |
| *(unknown model)* | 8k | 1k | conservative default |

Reasoning models get a larger generation budget (3000 tokens on `/run`, 2200 on
debate turns) and temperature 0.6, so thinking doesn't truncate the JSON answer.

Enforcement is layered: per-call `max_tokens` sized to the task (run vs debate
turn, reasoning vs plain), tool rounds capped by window size, ≤5 tool calls per
round, tool results sliced to a per-model char cap, and `clampMessages` as the
final guard — progressively truncating tool/assistant messages until the request
fits 90% of the model's window. Model **outputs** are clamped too (`say` ≤120,
`summary` ≤700, `keyPoints` ≤5×240, `argument` ≤400 chars), which keeps every
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

- **work** — analysis & decision questions. The lead designs **phase 1 as a set of
  mission-specific parallel assignments** (each a free-form `{focus, lens}`, e.g. for
  *"Phân tích thị trường đầu năm 2026"* one worker gets *"Định giá và dự báo xu hướng
  các nhóm ngành dẫn dắt Q1/2026"* with `lens:"quantify"` — never a generic template),
  then adaptively decides each later phase from what came back. If the plan model call
  itself fails (an upstream `fetch failed`/timeout on the orchestrator model), a code
  heuristic (`triageByCode`) still classifies the ask as **info vs work** and
  `planByCode` emits a sensible generic phase so a factual question doesn't get the full
  decision treatment. Runs the full pipeline. For quantitative "what ifs" (e.g.
  *"đầu tư 500k/tháng vào SHB thì cuối năm lời không?"*) a worker with a `quantify` lens
  calls the real `data.simulate` tool — a seeded
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

**Real data, honest tools.** `web.search` hits Bing (real results + URLs; a worker with an
evidence lens is pre-seeded with a live search and every worker is strongly prompted to ground
before concluding), `market.quote`/`market.history` pull real HOSE/HNX prices via DNSE (Yahoo
fallback) and compute true period returns and annualized volatility,
`data.simulate` accepts a `symbol` to drive the Monte Carlo with that real
history, and `web.fetch` reads any URL. The remaining demo tools (`kb.*`,
`market.trends`, `data.metrics`, `risk.*`) label their payloads
`synthetic: true` so models must not present them as fact —
`risk.precedents` picks a domain-appropriate set of illustrative precedents
(sports, investing, engineering migrations, remote work, opening a venue, or a
generic fallback) from the topic rather than always returning the same cases. The final report is
**synthesized by the lead's model** — structure tailored to the task, sections organized around
the findings (one per worker's focus), markdown tables for numbers, flagged claims handled with
caution — with the code template as fallback, and a code-built **"Nguồn dữ liệu"** section
listing the tools and URLs actually used.

Mid-mission, a **worker that finds its assignment ambiguous doesn't guess**:
it walks over to the lead's desk and asks (`agent.question`), the lead's model
answers (`/lead-answer`), and the worker retries once with that guidance —
all visible on campus and in the activity feed.

**The Orchestrator checks the work at every phase boundary**, not per subtask: after each
phase, `/synthesize` judges the squad's gathered information, flags weak or unsourced claims,
and decides whether to conclude or open another phase. A final `/verify` pass then re-checks
every figure against the evidence each worker actually gathered — unsupported numbers get
flagged ⚑ and confidence cut (deterministic figure-grounding auto-check on top of the model
verdicts).

**Orchestrator takeover on worker failure.** If a worker's `/run` comes
back as a hard failure (`failed: true` — e.g. a `429 too many`, model
unreachable, or an unusable-format answer), the assignment is **not** abandoned:
the lead Orchestrator re-runs that exact assignment with **its own model** (a
different model than the rate-limited worker, so it usually goes through),
with the full worker toolbox. It emits `agent.takeover`, the lead announces it on campus, and the
result fills the worker's slot — flagged `takeover: { from, fromName }` on the output and
breakdown, attributed to the lead. Only if the lead's attempt also fails is the assignment
finally dropped. Even if **every** assignment fails the mission no longer errors out (see
**Graceful degradation** below). This keeps a single rate-limited model from silently dropping
a section of the mission.

**Graceful degradation over hard failure — a mission ends with an answer, not a red error.**
Forensics on the "failed mission" state found that model failures almost never fail a mission
(every `chat()` call has a code/simulate fallback) — the hard failures came from a handful of
**unwrapped `throw` sites**: the draft `/run`, the lead-guidance exchange, the debate
(`runMeeting`), the final `/report`, and the "all workers failed" guard. Each now **degrades in
place** instead of discarding the run:
- **`runtime()` (orchestrator→runtime) retries** connect-phase errors (`ECONNREFUSED`/DNS/host
  unreachable, backoff 1.5 s→4 s), so a runtime restart/redeploy window no longer kills in-flight
  missions — it never retries a real timeout or a user cancel (idempotency-safe: only calls that
  provably never landed are retried).
- A **thrown draft `/run` becomes a lead takeover** (it used to abort the whole `Promise.all`); a
  **failed debate** falls back to the code consensus; a **failed `/report`** is rebuilt locally
  from the collected outputs (`localReport`) so a final-render blip never loses completed work.
- **Total outage → an honest completed report.** If planning fails, or every worker *and* its
  lead takeover fail (all models unreachable), the mission finishes as **`done`** with a
  ~10%-confidence *"couldn't complete — please retry"* report and **no verdict** — a Retry
  affordance, not a dead 'failed' card. (Verified: dead-LLM mission → `status:"done"`, confidence
  10, honest report + a `warn` briefing.)
- **The fallback ladder is provider-diverse.** `LLM_FALLBACK_MODELS` now leads with a *different
  provider* than the lead's `gpt-5-mini` (`gemini/gemini-3.1-flash-lite,openai/gpt-5-mini`), so a
  rate-limited worker's fallback stops piling onto the lead's own model — the mechanism that was
  collapsing a six-model squad down to one and starving the lead. (Verified on the same prompt:
  lead takeovers **3→0**, mission time **~14 min→~8 min**, confidence **33%→50%**.)
- **Cancel and the 30-minute deadline still stop promptly** — every degradation catch re-checks
  `signal.aborted` and re-throws, so graceful handling never swallows a stop (measured: Stop
  terminates the run in a few milliseconds).

**Source & confidence hygiene (QA-hardened).** A 12-scenario end-user QA (sub-agents + codex,
cross-reviewed) surfaced pre-existing quality gaps that are now closed:
- **The "Real data sources" list only shows structured result URLs.** `buildSources` used to
  regex-scrape every `http(s)://` out of the serialized tool JSON, so links buried in a result's
  *content/snippet* (once even an adult and a gaming URL for unrelated queries) leaked in as
  "sources". It now extracts only `"url":` values, `isJunkSource` also blocks adult/gaming/social/
  dictionary hosts and malformed hostnames, and `web.search` no longer falls back to raw unranked
  results when nothing scores relevant.
- **Confidence is recalibrated.** The disagreement penalty scales with the *margin* — a
  near-unanimous squad is barely penalized instead of a flat −8 that made an 8-of-9-agree mission
  read as 56% — and the fact-check-flag penalty scales with the *total* flag count, so one weak
  figure no longer looks like twenty.
- **The code-fallback recommendation actually decides.** It no longer echoes the whole question
  back (`Proceed with "<question>" under conditions: …`) or pastes advisor *benefits* as
  "conditions"; it states the stance and points to a clean Conditions section.
- **Empty advisor outputs are dropped, not counted.** A worker that returns no summary and no key
  points is treated as a failed subtask (routed to takeover, then dropped) instead of a phantom
  `conditional 70%` vote that diluted consensus and confidence.
- **A user-stopped mission is `status:"cancelled"`, not `failed`** — rendered as **Stopped** with a
  Retry affordance everywhere — and a `clarifying` mission left unanswered is reaped after
  `CLARIFY_TTL_MS`. Lead takeovers are capped per mission (`max(2, ⌈pool/2⌉)`) so one overloaded run
  can't monopolize the lead.

## MCP Policy Groups

`mcp-policy` owns an MCP server registry (`mcp-web`, `mcp-knowledge`, `mcp-data`,
`mcp-market`, `mcp-risk`, `mcp-docs`) and **Policy Groups** binding roles to
server/tool grants (`services/mcp-policy/data/registry.json`). Because workers are now
generalists the lead assigns dynamically, there are only **two live roles**:

| policy group | role | granted |
|---|---|---|
| `pg-orchestrator` | `orchestrator` (Atlas, the lead) | *no external tools — planning, check & synthesis only* |
| `pg-worker` | `worker` (the whole pool) | full toolbox: `mcp-web/*`, `mcp-knowledge/*`, `mcp-data/*`, `mcp-market/*`, `mcp-risk/*` |

(The legacy per-specialty groups `pg-research`/`pg-analyst`/`pg-critic`/`pg-creative`/`pg-reporter`
still exist in the registry for reference but are no longer bound to running agents.)

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

**Concurrency tuning (optional `.env`):** `MAX_CONCURRENT_MISSIONS` (default `3`) —
total missions running at once; `MAX_CONCURRENT_PER_USER` (default `1`) — per-account
cap so one user can't monopolise the squad; `MISSION_DEADLINE_MS` (default `600000`) —
watchdog ceiling after which a mission's model calls are aborted and it is marked failed;
`MAX_PHASES` (default `3`) — max adaptive phases the lead can open before it must conclude.

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
(internal runtime: /plan /run /synthesize /lead-answer /verify /scenarios /meeting-turn /consensus /report /memory/commit /memory/health)
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
- **Decision Dossier export** — the report action row now offers a self-contained
  `.html` dossier for offline sharing. It bundles verdict, confidence, advisor
  quorum, per-advisor stances, the full report, cited sources, dissent/debate and
  scenarios in one portable file (`buildDossierHtml`, `downloadDossier`).
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
- **Live debate group chat** — the consensus meeting renders as a real
  **group-chat conversation** (`MeetingTranscript`): each agent speaks in a chat
  bubble with its pixel avatar (`agentPortrait`) and brand-colored name, the lead
  wears a `chair` tag, and `Round 1` / `Round 2` appear as chat-divider pills.
  Every message carries a stance chip (support / oppose / conditional) and — the
  signature moment — a `↻ oppose → conditional` pill the instant an agent
  **changes its mind** between rounds. The human **Director**'s Live-Gavel steer
  drops in as a right-aligned "you" message (green gradient bubble), so steering
  reads as a participant joining the chat. New turns slide in and flash; a
  `••• debating…` typing indicator runs while live; and the final consensus is a
  pinned **verdict card** (decision + rationale + conditions, colored by outcome).
  A thin Hold ↔ Proceed meter sits atop the thread. Auto-scrolls to the newest
  turn (and to the verdict) only when you're already near the bottom; renders the
  same way live and retroactively in mission history
- **The Concession** — the single clearest proof the squad is genuinely *different
  minds* debating: when an agent changes its stance toward agreement between rounds
  (`stanceBefore !== stance && stance !== "oppose"` in `pipeline.js runMeeting`),
  the `meeting.turn` event carries `conceded` + `towardAgentId`, and on screen the
  conceding agent **walks across the meeting room** to stand by the model it now
  agrees with (`world.walkTo`), its mood flips to a happy/star emote, the squad does
  a cheer wave, and a **gold "🤝 conceded to <Model>" banner** + a "⟳ minds changed: N"
  counter appear in the chat. A single-LLM chatbot has nobody to concede *to*. a thin in-panel bar above the transcript shows
  the stance balance: a token slides **green→Proceed / amber→Hold** as the turns
  accumulate and **snaps** to the winning side when consensus resolves. Panel-only:
  the `.as-tug` bar derives purely from the turns + final decision (the earlier
  on-campus tug-of-war *rope* drawn in the World Engine was removed — it cluttered
  the meeting room and overlapped the agents)
- **Consensus robustness (fragility) score** — a verdict that won 6-0 and one that
  scraped through 3-2 look identical otherwise, so the squad now scores how close
  the decision was to flipping. `fragilityOf()` in `pipeline.js` derives a 0-100
  robustness from the final support/oppose/conditional split (margin between the
  top two camps), labels it **solid / moderate / brittle**, and flags **knife-edge**
  when one flip would change the call. Emitted on `meeting.resolved` + `mission.completed`,
  shown as a meter in the debate verdict card and a chip on the mission decision.
- **Calibration Ledger** — the product is built on a confidence number, so it now
  keeps score on that number. At `mission.completed` every agent's predicted
  confidence (+ the final report confidence) is persisted to a `calibration_events`
  table (`calibrationStore` in `db.js`, mirroring `briefingStore`), tagged by
  role / model / topic. A one-tap **"How did this pan out?"** chip on the report
  (`right / missed / surprising / not yet`, `POST /missions/:id/outcome`) records
  the real outcome, and the Squad panel shows a **per-agent reliability bar** —
  *"when this agent says 80%, it's right X% of the time (n=…)"* — from
  `GET /calibration/stats` (hit-rate over deciding outcomes, per role/model/topic).
  All scoped by `x-user-email` like every other route; turns asserted trust into a
  measured track record.
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
  agents swim real laps back and forth (slower in water, with a freestyle
  arm stroke, flutter-kick splash and bow wave), and a **basketball court** +
  **football pitch** where the squad plays a real game — one shared ball
  passed between players (`sportTick`), teammates running into space,
  dribbling, and shots at the hoop/goal that pop a score flash + a shout,
  central plaza + fountain,
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
  mission events (perk/cheer/party via `world.mascotReact`). Built procedurally
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
  and models stay editable** (Save changes appears only when dirty). Each card
  shows a `Role ·` eyebrow with the agent's standing label (`Lead orchestrator` /
  `Generalist agent`). Squads persist **per account** in Postgres — a new sign-in never sees
  another user's squad, and your own squad follows you across browsers.
- Agents default to named characters (`Atlas` the lead, plus `Nova`, `Quill`, `Lumi`,
  `Echo`, `Pixel` — generalist workers the lead assigns dynamically), are freely
  renameable and colored by the primary model's provider; tasks are
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
