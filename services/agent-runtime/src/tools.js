import { isJunkSource } from "./harness.js";
const STOP = new Set("the,a,an,and,or,of,for,to,in,on,at,is,are,be,what,which,how,when,where,who,why,does,do,với,của,là,các,một,và,cho,trong,có,khong,không,duoc,được,nay,này,do,đó,ra,sao,nao,nào,khi,the,như,ve,về,theo,bao,nhieu,nhiêu,gi,gì,ai,hay,thi,thì,ma,mà,da,đã,se,sẽ".split(","));
const deburr = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const queryTerms = q => [...new Set(deburr(q).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w)))];
const relScore = (terms, text) => {
  const t = deburr(text);
  let n = 0;
  for (const w of terms) if (t.includes(w)) n++;
  return n;
};
const isHomepage = url => {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") === "";
  } catch {
    return false;
  }
};
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ h >>> 15, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function makeEvaluator(expr) {
  const src = String(expr || "").slice(0, 400);
  if (!src.trim()) return { error: "empty formula" };
  if (/[^A-Za-z0-9_.\s+\-*/%(),^]/.test(src)) return { error: "formula has illegal characters" };
  const toks = src.match(/[A-Za-z_][A-Za-z0-9_]*|\d+\.?\d*|\.\d+|[-+*/%(),^]/g) || [];
  if (!toks.length) return { error: "empty formula" };
  const FUNCS = { min: Math.min, max: Math.max, abs: Math.abs, sqrt: Math.sqrt, log: Math.log, exp: Math.exp, pow: Math.pow, round: Math.round, floor: Math.floor, ceil: Math.ceil };
  let pos = 0,
    env = {};
  const peek = () => toks[pos];
  const parseExpr = () => {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = toks[pos++];
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const parseTerm = () => {
    let v = parsePow();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = toks[pos++];
      const r = parsePow();
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  };
  const parsePow = () => {
    const v = parseUnary();
    if (peek() === "^") {
      pos++;
      return Math.pow(v, parsePow());
    }
    return v;
  };
  const parseUnary = () => {
    if (peek() === "-") {
      pos++;
      return -parseUnary();
    }
    if (peek() === "+") {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  };
  const parsePrimary = () => {
    const t = peek();
    if (t === undefined) throw new Error("unexpected end");
    if (t === "(") {
      pos++;
      const v = parseExpr();
      if (toks[pos] !== ")") throw new Error("missing )");
      pos++;
      return v;
    }
    if (/^[A-Za-z_]/.test(t)) {
      pos++;
      if (peek() === "(") {
        pos++;
        const args = [];
        if (peek() !== ")") {
          args.push(parseExpr());
          while (peek() === ",") {
            pos++;
            args.push(parseExpr());
          }
        }
        if (toks[pos] !== ")") throw new Error("missing )");
        pos++;
        const fn = FUNCS[t.toLowerCase()];
        if (!fn) throw new Error("unknown function " + t);
        return fn(...args);
      }
      if (!(t in env)) throw new Error("unknown name " + t);
      return env[t];
    }
    const num = parseFloat(t);
    if (Number.isNaN(num)) throw new Error("bad token " + t);
    pos++;
    return num;
  };
  return {
    run(e) {
      env = e || {};
      pos = 0;
      try {
        const v = parseExpr();
        return pos === toks.length ? v : NaN;
      } catch {
        return NaN;
      }
    }
  };
}
const decodeEntities = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");

const UA = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  accept: "application/json"
};
const hostOf = u => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
const TAVILY_KEY = process.env.TAVILY_API_KEY || "";
const LANGSEARCH_KEY = process.env.LANGSEARCH_API_KEY || "";
const NOW_YEAR = new Date().getFullYear();
const TIME_SENSITIVE = /\b(latest|recent|current|today|tonight|now|this (?:week|month|quarter|year)|past (?:week|month)|breaking|news|headline|update|live|upcoming|just (?:announced|released)|mới nhất|hiện nay|gần đây|tin tức|hôm nay|bây giờ|cập nhật|trực tiếp|sắp tới|vừa ra)\b/i;
const isTimeSensitive = q => TIME_SENSITIVE.test(String(q || ""));
async function tavilySearch(query, timeSensitive) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: TAVILY_KEY, query, search_depth: "advanced", max_results: 10, include_answer: true, include_raw_content: true, ...(timeSensitive ? { topic: "news", days: 14 } : {}) }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text().catch(() => "")).slice(0, 120)}`);
  const json = await res.json();
  const clean = (json.results || []).filter(r => r && r.url && !isJunkSource(r.url)).sort((a, b) => (b.score || 0) - (a.score || 0));
  const byHost = new Map();
  for (const r of clean) {
    const h = hostOf(r.url) || r.url;
    if (!byHost.has(h)) byHost.set(h, r);
  }
  const results = [...byHost.values()].slice(0, 8).map(r => ({
    title: String(r.title || "").slice(0, 140),
    url: r.url,
    host: hostOf(r.url),
    published: r.published_date || null,
    snippet: String(r.content || "").replace(/\s+/g, " ").trim().slice(0, 240),
    content: String(r.raw_content || r.content || "").replace(/\s+/g, " ").trim().slice(0, 3000)
  }));
  if (!results.length) throw new Error("Tavily returned no usable results");
  const bestScore = clean[0]?.score ?? 0;
  return { query, source: timeSensitive ? "Tavily news API (real-time, last ~14 days)" : "Tavily search API (real results)", answer: json.answer ? String(json.answer).slice(0, 600) : null, lowRelevance: !json.answer && bestScore < 0.3, results };
}
async function langSearch(query, timeSensitive) {
  const res = await fetch("https://api.langsearch.com/v1/web-search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${LANGSEARCH_KEY}` },
    body: JSON.stringify({ query, summary: true, count: 10, freshness: timeSensitive ? "oneWeek" : "noLimit" }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!res.ok) throw new Error(`LangSearch ${res.status}: ${(await res.text().catch(() => "")).slice(0, 120)}`);
  const json = await res.json();
  const value = json?.data?.webPages?.value || [];
  const clean = value.filter(r => r && r.url && !isJunkSource(r.url));
  const byHost = new Map();
  for (const r of clean) { const h = hostOf(r.url) || r.url; if (!byHost.has(h)) byHost.set(h, r); }
  const results = [...byHost.values()].slice(0, 8).map(r => ({
    title: String(r.name || "").slice(0, 140),
    url: r.url,
    host: hostOf(r.url),
    published: r.datePublished || null,
    snippet: String(r.snippet || "").replace(/\s+/g, " ").trim().slice(0, 240),
    content: String(r.summary || r.snippet || "").replace(/\s+/g, " ").trim().slice(0, 3000)
  }));
  if (!results.length) throw new Error("LangSearch returned no usable results");
  const terms = queryTerms(query);
  const relevant = results.filter(r => relScore(terms, `${r.title} ${r.snippet}`) >= 2);
  return { query, source: timeSensitive ? "LangSearch web API (real-time, full summaries)" : "LangSearch web API (real results, full summaries)", answer: null, lowRelevance: relevant.length === 0, results };
}

function historyStats(symbol, closes, lastTs, source, months) {
  if (closes.length < 10) throw new Error(`not enough price history for ${symbol}`);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return {
    symbol,
    source,
    bars: closes.length,
    periodMonths: months,
    firstClose: first,
    lastClose: last,
    periodReturnPct: +((last / first - 1) * 100).toFixed(1),
    annualReturnPct: +((Math.exp(mean * 252) - 1) * 100).toFixed(1),
    annualVolPct: +(Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1),
    high: Math.max(...closes),
    low: Math.min(...closes),
    lastDate: lastTs ? new Date(lastTs * 1000).toISOString().slice(0, 10) : null
  };
}

async function fetchHistory(symbol, months = 12) {
  const sym = symbol.toUpperCase().trim();
  const to = Math.floor(Date.now() / 1000);
  const from = to - Math.round(months * 30.44 * 86400);
  try {
    const res = await fetch(`https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${from}&to=${to}&symbol=${encodeURIComponent(sym)}&resolution=1D`, {
      headers: UA,
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) throw new Error(`DNSE ${res.status}`);
    const json = await res.json();
    const closes = json.c || [];
    return historyStats(sym, closes, (json.t || [])[closes.length - 1], "DNSE chart API (real HOSE/HNX data)", months);
  } catch (e1) {
    const variants = /\.[A-Z]+$/.test(sym) ? [sym] : [`${sym}.VN`, sym];
    for (const v of variants) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(v)}?range=${Math.min(60, Math.max(1, months))}mo&interval=1d`, {
          headers: UA,
          signal: AbortSignal.timeout(10_000)
        });
        if (!res.ok) continue;
        const json = await res.json();
        const r = json.chart?.result?.[0];
        const closes = (r?.indicators?.quote?.[0]?.close || []).filter(c => c != null);
        if (!closes.length) continue;
        return historyStats(sym, closes, (r?.timestamp || []).slice(-1)[0], `Yahoo Finance (real market data${v.endsWith(".VN") ? ", HOSE/HNX" : ""})`, months);
      } catch {}
    }
    throw new Error(`no price history for ${sym} (DNSE: ${e1.message}; Yahoo tried ${variants.join(", ")})`);
  }
}

const EXECUTORS = {
  "mcp-web": {
    "web.search": async ({
      query
    }) => {
      const ts = isTimeSensitive(query);
      if (TAVILY_KEY) {
        try {
          return await tavilySearch(query, ts);
        } catch (e) {
          console.warn(`[agent-runtime] Tavily failed (${e.message}) — trying LangSearch / Bing`);
        }
      }
      if (LANGSEARCH_KEY) {
        try {
          return await langSearch(query, ts);
        } catch (e) {
          console.warn(`[agent-runtime] LangSearch failed (${e.message}) — falling back to Bing RSS`);
        }
      }
      try {
        const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query || "")}&format=rss&count=8`, {
          headers: {
            ...UA,
            accept: "application/rss+xml, text/xml"
          },
          signal: AbortSignal.timeout(10_000)
        });
        if (!res.ok) throw new Error(`Bing ${res.status}`);
        const xml = await res.text();
        const re = /<item>([\s\S]*?)<\/item>/g;
        const grab = (block, tag) => {
          const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
          return m ? decodeEntities(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "")).trim() : "";
        };
        const hostOf = u => {
          try {
            return new URL(u).hostname.replace(/^www\./, "");
          } catch {
            return "";
          }
        };
        const byHost = new Map();
        let dropped = 0,
          block;
        while ((block = re.exec(xml))) {
          const url = grab(block[1], "link");
          if (!url) continue;
          if (isJunkSource(url)) {
            dropped++;
            continue;
          }
          const host = hostOf(url) || url;
          const pub = grab(block[1], "pubDate");
          const ts = pub ? Date.parse(pub) : NaN;
          const item = {
            title: grab(block[1], "title").slice(0, 140),
            url,
            host,
            published: pub || null,
            ts: Number.isFinite(ts) ? ts : 0,
            snippet: grab(block[1], "description").slice(0, 240)
          };
          const prev = byHost.get(host);
          if (!prev || item.ts > prev.ts) byHost.set(host, item);
        }
        const terms = queryTerms(query);
        const ranked = [...byHost.values()].map(r => ({ ...r, _rel: relScore(terms, `${r.title} ${r.snippet} ${r.url}`), _home: isHomepage(r.url) ? 1 : 0 })).sort((a, b) => b._rel - a._rel || a._home - b._home || b.ts - a.ts);
        const relevant = ranked.filter(r => r._rel >= 2 && !r._home);
        const weak = ranked.filter(r => r._rel >= 1 && !r._home);
        const nonHome = ranked.filter(r => !r._home);
        const pool = relevant.length ? relevant : weak.length ? weak : nonHome.length ? nonHome : ranked;
        const chosen = (ts ? [...pool].sort((a, b) => (b.ts || 0) - (a.ts || 0)) : pool).slice(0, 6);
        const lowRelevance = relevant.length === 0;
        const results = chosen.map(({ ts, _rel, _home, ...r }) => r);
        if (!results.length) throw new Error(dropped ? "only junk/navigational results" : "no results parsed");
        await Promise.all(results.slice(0, 3).map(async top => {
          try {
            const r2 = await fetch(top.url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(9000) });
            if (r2.ok) {
              const html = await r2.text();
              top.content = decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim().slice(0, 2500);
            }
          } catch {}
        }));
        return {
          query,
          source: "Bing web search (real results)",
          dropped,
          lowRelevance,
          results
        };
      } catch (e) {
        return {
          query,
          error: `web search failed: ${e.message}`
        };
      }
    },
    "web.fetch": async ({
      url
    }) => {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(12000),
          redirect: "follow"
        });
        const text = await res.text();
        return {
          url,
          status: res.status,
          content: text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000)
        };
      } catch (e) {
        return {
          url,
          error: `fetch failed: ${e.message}`
        };
      }
    }
  },
  "mcp-knowledge": {
    "kb.query": async ({ query }) => doWebSearch(query),
    "kb.document": async ({ docId, url }) => /^https?:\/\//.test(url || docId || "") ? EXECUTORS["mcp-web"]["web.fetch"]({ url: url || docId }) : doWebSearch(docId)
  },
  "mcp-data": {
    "data.metrics": async ({ topic, query }) => doWebSearch(query || `${topic} latest statistics metrics data ${NOW_YEAR}`),
    "data.simulate": async ({
      monthlyAmount = 500000,
      months = 12,
      annualReturnPct = 10,
      annualVolPct = 30,
      initialAmount = 0,
      symbol,
      label
    }) => {
      let basis = "user-stated assumptions";
      if (symbol) {
        try {
          const h = await fetchHistory(symbol, Math.max(12, months));
          annualReturnPct = h.annualReturnPct;
          annualVolPct = h.annualVolPct;
          basis = `real ${h.symbol} history via ${h.source} (${h.bars} daily bars, last close ${h.lastClose} on ${h.lastDate})`;
        } catch (e) {
          basis = `requested ${symbol} history unavailable (${e.message}) — fell back to stated assumptions`;
        }
      }
      const paths = 2000;
      const rnd = seeded(`${label || ""}|${monthlyAmount}|${months}|${annualReturnPct}|${annualVolPct}|${initialAmount}`);
      const gauss = () => Math.sqrt(-2 * Math.log(Math.max(rnd(), 1e-9))) * Math.cos(2 * Math.PI * rnd());
      const mu = annualReturnPct / 100 / 12;
      const sigma = annualVolPct / 100 / Math.sqrt(12);
      const contributed = initialAmount + monthlyAmount * months;
      const finals = [];
      let profitCount = 0;
      for (let p = 0; p < paths; p++) {
        let price = 1;
        let units = initialAmount;
        for (let m = 0; m < months; m++) {
          units += monthlyAmount / price;
          price *= Math.exp(mu - sigma * sigma / 2 + sigma * gauss());
        }
        const v = units * price;
        finals.push(v);
        if (v > contributed) profitCount++;
      }
      finals.sort((a, b) => a - b);
      const at = q => Math.round(finals[Math.min(paths - 1, Math.floor(q * paths))]);
      return {
        model: `Monte Carlo GBM, dollar-cost averaging, ${paths} paths`,
        assumptionsBasis: basis,
        assumptions: {
          monthlyAmount,
          months,
          annualReturnPct,
          annualVolPct,
          initialAmount
        },
        totalContributed: contributed,
        finalValue: {
          p10: at(0.1),
          p50: at(0.5),
          p90: at(0.9)
        },
        probProfit: +(profitCount / paths).toFixed(2),
        expectedGainP50: at(0.5) - contributed,
        note: "Simulation depends entirely on the stated return/volatility assumptions — not investment advice."
      };
    },
    "data.model": async ({ output, drivers = [], samples = 2000, target, label }) => {
      const ds = (Array.isArray(drivers) ? drivers : []).filter(d => d && d.name && Number.isFinite(+d.base)).slice(0, 12).map(d => ({
        name: String(d.name).replace(/[^A-Za-z0-9_]/g, "_"),
        base: +d.base,
        low: Number.isFinite(+d.low) ? +d.low : null,
        high: Number.isFinite(+d.high) ? +d.high : null,
        unit: d.unit ? String(d.unit).slice(0, 16) : ""
      }));
      if (!ds.length || !output) return { error: "data.model needs drivers:[{name,base,low?,high?}] and an output formula over those names (e.g. \"(benefit - cost) / cost * 100\")" };
      const ev = makeEvaluator(output);
      if (ev.error) return { error: `formula error: ${ev.error}` };
      const baseEnv = {};
      ds.forEach(d => baseEnv[d.name] = d.base);
      if (!Number.isFinite(ev.run(baseEnv))) return { error: "formula did not evaluate — every name in it must be a listed driver, and use only + - * / % ^ ( ) and min/max/abs/sqrt/log/exp/pow" };
      const rnd = seeded(`${label || output}|${ds.map(d => `${d.name}:${d.base}:${d.low}:${d.high}`).join("|")}`);
      const sample = d => {
        if (d.low == null && d.high == null) return d.base;
        const lo = d.low == null ? d.base : d.low;
        const hi = d.high == null ? d.base : d.high;
        if (hi <= lo) return d.base;
        const mode = Math.min(Math.max(d.base, lo), hi);
        const u = rnd();
        const c = (mode - lo) / (hi - lo);
        return u < c ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
      };
      const N = Math.min(5000, Math.max(200, samples | 0));
      const outs = [];
      let meet = 0;
      const hasTarget = Number.isFinite(+target);
      for (let i = 0; i < N; i++) {
        const env = {};
        for (const d of ds) env[d.name] = sample(d);
        const v = ev.run(env);
        if (Number.isFinite(v)) {
          outs.push(v);
          if (hasTarget && v >= +target) meet++;
        }
      }
      if (!outs.length) return { error: "formula produced no finite results" };
      outs.sort((a, b) => a - b);
      const at = q => outs[Math.min(outs.length - 1, Math.floor(q * outs.length))];
      const round = x => !Number.isFinite(x) ? null : Math.abs(x) >= 100 ? Math.round(x) : +x.toFixed(2);
      const sensitivity = ds.map(d => {
        const lo = d.low == null ? d.base * 0.85 : d.low;
        const hi = d.high == null ? d.base * 1.15 : d.high;
        const swing = Math.abs(ev.run({ ...baseEnv, [d.name]: hi }) - ev.run({ ...baseEnv, [d.name]: lo }));
        return { driver: d.name, swing: round(swing) || 0 };
      }).sort((a, b) => b.swing - a.swing);
      return {
        model: `Monte Carlo over ${ds.length} driver(s), ${N} samples (triangular spread)`,
        formula: String(output).slice(0, 200),
        assumptionsBasis: "user/research-stated driver values — the estimate depends entirely on these assumptions, it is not a guarantee",
        assumptions: ds.map(d => `${d.name} = ${d.base}${d.unit}${d.low != null || d.high != null ? ` [${d.low ?? d.base}–${d.high ?? d.base}]` : ""}`),
        result: { p10: round(at(0.1)), p50: round(at(0.5)), p90: round(at(0.9)), mean: round(outs.reduce((s, x) => s + x, 0) / outs.length) },
        ...(hasTarget ? { target: +target, probMeetsTarget: +(meet / outs.length).toFixed(2) } : {}),
        sensitivityRanking: sensitivity,
        note: "Transparent estimate over stated assumptions — vary the top sensitivity driver to test how fragile the number is."
      };
    },
    "data.benchmark": async ({ options, topic, query }) => {
      if (query) return doWebSearch(query);
      const subject = Array.isArray(options) && options.length ? options.join(" vs ") : topic || "";
      const blob = `${subject} ${topic || ""}`;
      const coding = /\b(code|coding|codex|copilot|qwen|gpt|llm|model|gemma|claude|deepseek|mistral|cursor|aider|swe[- ]?bench|humaneval|mbpp|developer|programming|software engineer)\b/i.test(blob);
      const science = /\b(arxiv|scientific|physics|chemistry|biology|materials|genomics|clinical|peer.?review|catalyst|algorithm|dataset)\b/i.test(blob);
      return doWebSearch(coding
        ? `${subject} coding model benchmark comparison latest leaderboard results ${NOW_YEAR}`
        : science
        ? `${subject} comparison latest peer-reviewed study results ${NOW_YEAR}`
        : `compare ${subject} cost speed risk pros cons benchmark ${NOW_YEAR}`);
    }
  },
  "mcp-market": {
    "market.quote": async ({
      symbol
    }) => {
      if (!symbol) return {
        error: "symbol required (e.g. SHB, FPT, VNM)"
      };
      try {
        const h = await fetchHistory(symbol, 3);
        return {
          symbol: h.symbol,
          source: h.source,
          lastClose: h.lastClose,
          lastDate: h.lastDate,
          threeMonthReturnPct: h.periodReturnPct,
          high3m: h.high,
          low3m: h.low
        };
      } catch (e) {
        return {
          symbol,
          error: `quote failed: ${e.message}`
        };
      }
    },
    "market.history": async ({
      symbol,
      months = 12
    }) => {
      if (!symbol) return {
        error: "symbol required (e.g. SHB, FPT, VNM)"
      };
      try {
        return await fetchHistory(symbol, Math.max(1, Math.min(60, months)));
      } catch (e) {
        return {
          symbol,
          error: `history failed: ${e.message}`
        };
      }
    },
    "market.trends": async ({ topic, query }) => doWebSearch(query || `${topic} market trend growth forecast ${NOW_YEAR}`),
    "market.competitors": async ({ topic, query }) => doWebSearch(query || `${topic} top competitors alternatives landscape ${NOW_YEAR}`)
  },
  "mcp-risk": {
    "risk.checklist": async ({ proposal, query }) => doWebSearch(query || `${proposal} risks pitfalls what could go wrong ${NOW_YEAR}`),
    "risk.precedents": async ({ topic, query }) => doWebSearch(query || `${topic} real case study examples successes failures lessons learned ${NOW_YEAR}`)
  },
  "mcp-docs": {
    "docs.compose": async ({
      section,
      bullets
    }) => ({
      section,
      draft: `### ${section}\n${(bullets || []).map(b => `- ${b}`).join("\n")}`
    }),
    "docs.export": async ({
      title
    }) => ({
      exported: true,
      path: `/workspace/reports/${(title || "report").replace(/\W+/g, "-").toLowerCase()}.md`
    })
  }
};
const SEARCH_TTL = 900_000;
const searchCache = new Map();
async function cachedSearch(query, realFn) {
  const key = String(query || "").trim().toLowerCase();
  if (!key) return realFn();
  const hit = searchCache.get(key);
  if (hit && (hit.inflight || Date.now() - hit.at < SEARCH_TTL)) {
    console.log(`[agent-runtime] web.search cache ${hit.inflight ? "join" : "hit"}: ${key.slice(0, 60)}`);
    return hit.promise.then(v => v && !v.error ? { ...v, cached: true } : v);
  }
  const promise = Promise.resolve().then(realFn);
  searchCache.set(key, { at: Date.now(), inflight: true, promise });
  if (searchCache.size > 200) searchCache.delete(searchCache.keys().next().value);
  promise.then(v => {
    const e = searchCache.get(key);
    if (!e) return;
    if (v && v.error) searchCache.delete(key);else {
      e.inflight = false;
      e.at = Date.now();
    }
  }, () => searchCache.delete(key));
  return promise;
}
const _rawWebSearch = EXECUTORS["mcp-web"]["web.search"];
const NAV_LINK = /\b(log[\s-]?in|sign[\s-]?in|sign[\s-]?up|register|subscribe|cookie|privacy|terms|contact|about\s?us|careers|advertise|newsletter|share|comment|facebook|twitter|linkedin|instagram|youtube|pinterest|whatsapp|sitemap|rss|app\s?store|google\s?play)\b/i;
const htmlToText = html => decodeEntities(String(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
async function fetchHtml(url, ms = 8000) {
  const res = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return await res.text();
}
function extractLinks(html, baseUrl, terms) {
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m, count = 0;
  while ((m = re.exec(html)) && count < 600) {
    count++;
    const href = m[1];
    if (/^(javascript|mailto|tel|data):/i.test(href)) continue;
    let abs;
    try { abs = new URL(href, baseUrl).toString().split("#")[0]; } catch { continue; }
    if (!/^https?:/i.test(abs) || seen.has(abs) || isJunkSource(abs) || isHomepage(abs)) continue;
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (text.length < 10 || NAV_LINK.test(text) || NAV_LINK.test(abs)) continue;
    const rel = relScore(terms, `${text} ${abs}`);
    if (rel < 2) continue;
    seen.add(abs);
    out.push({ url: abs, text: text.slice(0, 140), rel });
  }
  return out.sort((a, b) => b.rel - a.rel);
}
async function deepenSearch(query, base) {
  if (process.env.WEB_DEEP === "off" || !base || base.error || !Array.isArray(base.results)) return base;
  const terms = queryTerms(query);
  const results = base.results.slice();
  const seenHosts = new Set(results.map(r => hostOf(r.url)));
  const seenUrls = new Set(results.map(r => r.url));
  let requeried = false, linksFollowed = 0;
  if (base.lowRelevance || results.length < 3) {
    try {
      const refined = `${query} ${NOW_YEAR} detailed report official source`.replace(/\s+/g, " ").trim().slice(0, 380);
      const alt = await _rawWebSearch({ query: refined });
      if (alt && !alt.error) {
        for (const r of alt.results || []) { const h = hostOf(r.url); if (h && !seenHosts.has(h)) { seenHosts.add(h); seenUrls.add(r.url); results.push(r); } }
        if (alt.answer && !base.answer) base.answer = alt.answer;
        if (alt.lowRelevance === false) base.lowRelevance = false;
        requeried = true;
      }
    } catch {}
  }
  const followed = base.lowRelevance ? [] : await Promise.all(results.slice(0, 2).map(async tgt => {
    if (!tgt || !tgt.url) return null;
    try {
      const links = extractLinks(await fetchHtml(tgt.url, 8000), tgt.url, terms).filter(l => !seenUrls.has(l.url));
      const link = links[0];
      if (!link) return null;
      const text = htmlToText(await fetchHtml(link.url, 8000));
      if (text.length < 200) return null;
      return { title: link.text || link.url, url: link.url, host: hostOf(link.url), published: null, snippet: text.slice(0, 240), content: text.slice(0, 3000), via: `linked from ${tgt.host || hostOf(tgt.url)}` };
    } catch { return null; }
  }));
  for (const f of followed) if (f && !seenUrls.has(f.url)) { seenUrls.add(f.url); results.push(f); linksFollowed++; }
  return { ...base, results: results.slice(0, 12), requeried, linksFollowed };
}
EXECUTORS["mcp-web"]["web.search"] = ({ query }) => {
  const q = String(query || "").replace(/\s+/g, " ").trim().slice(0, 380);
  return cachedSearch(q, async () => deepenSearch(q, await _rawWebSearch({ query: q })));
};
const doWebSearch = q => EXECUTORS["mcp-web"]["web.search"]({ query: q });
export async function executeTool(server, tool, args) {
  const fn = EXECUTORS[server]?.[tool];
  if (!fn) return {
    error: `no executor for ${server}/${tool}`
  };
  return fn(args || {});
}
