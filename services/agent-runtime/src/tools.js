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
const NOW_YEAR = new Date().getFullYear();
async function tavilySearch(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: TAVILY_KEY, query, search_depth: "basic", max_results: 6, include_answer: true, include_raw_content: false }),
    signal: AbortSignal.timeout(12_000)
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text().catch(() => "")).slice(0, 120)}`);
  const json = await res.json();
  const results = (json.results || []).filter(r => r && r.url && !isJunkSource(r.url)).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 6).map(r => ({
    title: String(r.title || "").slice(0, 140),
    url: r.url,
    host: hostOf(r.url),
    published: r.published_date || null,
    snippet: String(r.content || "").replace(/\s+/g, " ").trim().slice(0, 240),
    content: String(r.content || "").replace(/\s+/g, " ").trim().slice(0, 800)
  }));
  if (!results.length) throw new Error("Tavily returned no usable results");
  return { query, source: "Tavily search API (real results)", answer: json.answer ? String(json.answer).slice(0, 600) : null, lowRelevance: false, results };
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
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}.VN?range=${Math.min(60, Math.max(1, months))}mo&interval=1d`, {
      headers: UA,
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) throw new Error(`DNSE failed (${e1.message}) and Yahoo ${res.status}`);
    const json = await res.json();
    const r = json.chart?.result?.[0];
    const closes = (r?.indicators?.quote?.[0]?.close || []).filter(c => c != null);
    return historyStats(sym, closes, (r?.timestamp || []).slice(-1)[0], "Yahoo Finance (real market data)", months);
  }
}

const EXECUTORS = {
  "mcp-web": {
    "web.search": async ({
      query
    }) => {
      if (TAVILY_KEY) {
        try {
          return await tavilySearch(query);
        } catch (e) {
          console.warn(`[agent-runtime] Tavily failed (${e.message}) — falling back to Bing RSS`);
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
        const chosen = (relevant.length ? relevant : weak.length ? weak : nonHome.length ? nonHome : ranked).slice(0, 6);
        const lowRelevance = relevant.length === 0;
        const results = chosen.map(({ ts, _rel, _home, ...r }) => r);
        if (!results.length) throw new Error(dropped ? "only junk/navigational results" : "no results parsed");
        try {
          const top = results[0];
          const r2 = await fetch(top.url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(6000) });
          if (r2.ok) {
            const html = await r2.text();
            top.content = decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim().slice(0, 800);
          }
        } catch {}
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
          signal: AbortSignal.timeout(8000),
          redirect: "follow"
        });
        const text = await res.text();
        return {
          url,
          status: res.status,
          content: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 4000)
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
    "data.metrics": async ({ topic }) => doWebSearch(`${topic} key statistics metrics adoption cost benchmark ${NOW_YEAR - 1} ${NOW_YEAR}`),
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
    "data.benchmark": async ({ options, topic }) => doWebSearch(`compare ${Array.isArray(options) && options.length ? options.join(" vs ") : topic || ""} cost speed risk pros cons`)
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
    "market.trends": async ({ topic }) => doWebSearch(`${topic} market trend growth forecast statistics ${NOW_YEAR - 1} ${NOW_YEAR}`),
    "market.competitors": async ({ topic }) => doWebSearch(`${topic} top competitors market leaders comparison`)
  },
  "mcp-risk": {
    "risk.checklist": async ({ proposal }) => doWebSearch(`${proposal} risks pitfalls challenges what could go wrong`),
    "risk.precedents": async ({ topic }) => doWebSearch(`${topic} real case study examples successes failures lessons learned`)
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
EXECUTORS["mcp-web"]["web.search"] = ({ query }) => {
  const q = String(query || "").replace(/\s+/g, " ").trim().slice(0, 380);
  return cachedSearch(q, () => _rawWebSearch({ query: q }));
};
const doWebSearch = q => EXECUTORS["mcp-web"]["web.search"]({ query: q });
export async function executeTool(server, tool, args) {
  const fn = EXECUTORS[server]?.[tool];
  if (!fn) return {
    error: `no executor for ${server}/${tool}`
  };
  return fn(args || {});
}
