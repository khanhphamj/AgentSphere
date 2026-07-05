function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeHref(url) {
  const raw = String(url == null ? "" : url).trim();
  const ok = /^(https?:|mailto:|#|\/)/i.test(raw);
  return esc(ok ? raw : "#");
}

function inlineMd(value) {
  let raw = String(value == null ? "" : value);
  const stash = [];
  const save = html => {
    const key = "\x01" + stash.length + "\x02";
    stash.push(html);
    return key;
  };
  raw = raw.replace(/`([^`]+)`/g, (_, code) => save(`<code>${esc(code)}</code>`));
  raw = raw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => save(`<a href="${safeHref(url)}" target="_blank" rel="noopener">${esc(label)}</a>`));
  let html = esc(raw);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  stash.forEach((item, i) => {
    html = html.split("\x01" + i + "\x02").join(item);
  });
  return html;
}

function tableCells(line) {
  return String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => inlineMd(c.trim()));
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(String(line || ""));
}

function isTableSep(line) {
  if (!isTableLine(line)) return false;
  const cells = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
  return cells.length > 0 && cells.every(c => /^:?-{3,}:?$/.test(c));
}

function isBlockStart(lines, i) {
  const line = lines[i] || "";
  return /^\s*$/.test(line) || /^#{1,3}\s+/.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^>\s?/.test(line) || /^\s*---+\s*$/.test(line) || isTableLine(line) && i + 1 < lines.length && isTableSep(lines[i + 1]);
}

function mdToHtml(md) {
  const lines = String(md == null ? "" : md).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] || "";
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    if (isTableLine(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = tableCells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(tableCells(lines[i]));
        i++;
      }
      out.push(`<table><thead><tr>${header.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      out.push(`<h${heading[1].length}>${inlineMd(heading[2])}</h${heading[1].length}>`);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${quote.filter(q => q.trim()).map(q => `<p>${inlineMd(q)}</p>`).join("")}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map(item => `<li>${inlineMd(item)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${items.map(item => `<li>${inlineMd(item)}</li>`).join("")}</ol>`);
      continue;
    }
    const para = [];
    while (i < lines.length && !isBlockStart(lines, i)) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) out.push(`<p>${inlineMd(para.join(" "))}</p>`);
  }
  return out.join("");
}

function textBlock(value) {
  return esc(value).replace(/\n/g, "<br>");
}

function hasText(value) {
  return String(value == null ? "" : value).trim() !== "";
}

function section(title, body) {
  return body ? `<section class="card"><h2>${esc(title)}</h2>${body}</section>` : "";
}

export function buildDossierHtml(mission, sources) {
  const m = mission || {};
  const report = m.report || {};
  const meeting = m.meeting || {};
  const breakdown = Array.isArray(report.breakdown) ? report.breakdown : [];
  const sourceGroups = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const scenarios = Array.isArray(m.scenarios) ? m.scenarios.filter(Boolean) : [];
  const turns = Array.isArray(meeting.turns) ? meeting.turns : [];
  const verdicts = {
    proceed: "Proceed",
    "do-not-proceed": "Do not proceed",
    "proceed-with-conditions": "Proceed with conditions",
    informational: "Informational"
  };
  const decision = m.decision || meeting.decision || "";
  const verdict = verdicts[decision] || decision || "No verdict recorded";
  const total = breakdown.length;
  const takenOver = breakdown.filter(o => o && o.takeover).length;
  const simulated = breakdown.filter(o => o && o.simulated).length;
  const byAdvisors = total - takenOver;
  const fragility = m.fragility || null;
  const robustness = fragility ? [hasText(fragility.label) ? esc(fragility.label) : "", fragility.robustness != null ? `${esc(fragility.robustness)}/100` : "", fragility.knifeEdge ? "knife-edge" : ""].filter(hasText).join(" &middot; ") : "";
  const quorum = total > 0 ? `Advisor quorum: ${byAdvisors}/${total} by advisors &middot; ${takenOver} lead takeover${simulated ? ` &middot; ${simulated} offline` : ""}` : "";
  const advisorRows = breakdown.filter(Boolean).map(o => {
    const notes = [];
    if (Array.isArray(o.flags) && o.flags.length) notes.push(`${o.flags.length} flag(s)`);
    if (o.takeover) notes.push("lead takeover");
    if (o.simulated) notes.push("offline");
    return `<tr><td>${esc(o.name || o.agentId || "Advisor")}</td><td>${hasText(o.focus || o.lens) ? esc(o.focus || o.lens) : "&mdash;"}</td><td>${hasText(o.stance) ? esc(o.stance) : "&mdash;"}</td><td>${o.confidence != null ? esc(`${o.confidence}%`) : "&mdash;"}</td><td>${notes.length ? esc(notes.join(", ")) : "&mdash;"}</td></tr>`;
  }).join("");
  const reportHtml = hasText(report.markdown) ? mdToHtml(report.markdown) : "";
  const sourcesHtml = sourceGroups.map(group => {
    const links = Array.isArray(group.links) ? group.links.filter(link => link && link.url) : [];
    const query = hasText(group.query) ? ` <span class="pill">${esc(group.query)}</span>` : "";
    const via = hasText(group.via) ? ` <span class="muted">via ${esc(group.via)}</span>` : "";
    const linkHtml = links.length ? `<ul class="source-links">${links.map(link => `<li><a href="${safeHref(link.url)}" target="_blank" rel="noopener">${esc(link.title || link.url)}${hasText(link.host) ? ` <span>${esc(link.host)}</span>` : ""}</a></li>`).join("")}</ul>` : "";
    return `<div class="source-group"><div class="source-head"><strong>${esc(group.tool || "Source")}</strong>${query}${via}</div>${linkHtml}</div>`;
  }).join("");
  const debateItems = turns.map(turn => {
    const text = turn && (turn.text || turn.argument || turn.say || "");
    if (!hasText(text)) return "";
    const speaker = turn.name || turn.agentId || "Agent";
    const stance = hasText(turn.stance) ? ` <span class="muted">&mdash; (${esc(turn.stance)})</span>` : "";
    return `<li><strong>${esc(speaker)}</strong>${stance} <span class="muted">&mdash;</span> ${textBlock(text)}</li>`;
  }).filter(Boolean).join("");
  const debateHtml = debateItems ? `${hasText(meeting.rationale) ? `<div class="callout"><strong>Rationale</strong><p>${textBlock(meeting.rationale)}</p></div>` : ""}<ul class="debate">${debateItems}</ul>` : "";
  const scenarioHtml = scenarios.length || hasText(m.sensitivity) ? `${scenarios.length ? `<ul class="scenarios">${scenarios.map(s => `<li><strong>${esc(s.name || "Scenario")}</strong>${s.probability != null && hasText(s.probability) ? ` <span class="muted">(${esc(s.probability)}%)</span>` : ""}${hasText(s.outcome) ? `<p>${textBlock(s.outcome)}</p>` : ""}</li>`).join("")}</ul>` : ""}${hasText(m.sensitivity) ? `<div class="callout"><strong>Sensitivity</strong><p>${textBlock(m.sensitivity)}</p></div>` : ""}` : "";
  const css = "body{margin:0;background:#f6f7f4;color:#172117;font:15px/1.55 -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif}main{max-width:820px;margin:0 auto;padding:40px 20px 32px}.hero{margin-bottom:18px}.kicker{color:#607062;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}h1{font-size:34px;line-height:1.1;margin:6px 0 8px}h2{font-size:17px;margin:0 0 14px}h3{font-size:15px;margin:18px 0 8px}.muted,.meta{color:#66736a}.meta{font-size:13px}.card{background:#fff;border:1px solid #dfe5dc;border-radius:8px;padding:20px;margin:14px 0;box-shadow:0 8px 24px rgba(23,33,23,.05)}.verdict{border-top:4px solid #1F8A48}.verdict-title{color:#1F8A48;font-size:30px;font-weight:800;line-height:1.1;margin-bottom:14px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.metric{border:1px solid #e4e9e1;border-radius:8px;padding:11px;background:#fbfcfa}.metric span{display:block;color:#66736a;font-size:12px}.metric strong{display:block;font-size:18px;margin-top:2px}.callout{background:#eef8f1;border:1px solid #cce8d4;border-left:4px solid #1F8A48;border-radius:8px;padding:13px 14px}.callout p{margin:5px 0 0}table{width:100%;border-collapse:collapse;margin:8px 0 2px;font-size:14px}th,td{border:1px solid #dfe5dc;padding:9px;text-align:left;vertical-align:top}th{background:#f0f4ee;color:#253225}.report h1{font-size:24px}.report h2{font-size:19px}.report h3{font-size:16px}.report p{margin:10px 0}.report ul,.report ol{padding-left:22px}.report code{background:#eef1ec;border:1px solid #dfe5dc;border-radius:5px;padding:1px 5px}.report blockquote{border-left:4px solid #cbd8cc;margin:12px 0;padding:2px 0 2px 12px;color:#4d5b51}.report hr{border:0;border-top:1px solid #dfe5dc;margin:18px 0}a{color:#176f3a;text-decoration:none}a:hover{text-decoration:underline}.pill{display:inline-block;border:1px solid #dfe5dc;border-radius:999px;padding:1px 8px;margin-left:5px;color:#4d5b51;background:#f7f9f6;font-size:12px}.source-group{border-top:1px solid #e7ece4;padding-top:12px;margin-top:12px}.source-group:first-child{border-top:0;padding-top:0;margin-top:0}.source-head{font-size:13px}.source-links{list-style:none;padding:0;margin:8px 0 0}.source-links li{margin:6px 0}.source-links span{color:#7c887f;font-size:12px}.debate,.scenarios{padding-left:20px;margin:0}.debate li,.scenarios li{margin:10px 0}.scenarios p{margin:4px 0 0}.footer{font-size:12px;color:#66736a;text-align:center;margin-top:24px}";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.title || "Decision Dossier")}</title><style>${css}</style></head><body><main><header class="hero"><div class="kicker">Decision Dossier</div><h1>${esc(m.title || "Untitled mission")}</h1><div class="meta">Generated by AgentSphere &middot; GreenNode &middot; ${esc(new Date().toISOString())}</div></header><section class="card verdict"><div class="verdict-title">${esc(verdict)}</div><div class="metrics">${report.confidence != null ? `<div class="metric"><span>Confidence</span><strong>${esc(report.confidence)}%</strong></div>` : ""}${robustness ? `<div class="metric"><span>Robustness</span><strong>${robustness}</strong></div>` : ""}${quorum ? `<div class="metric"><span>Advisor quorum</span><strong>${esc(`${byAdvisors}/${total}`)}</strong></div>` : ""}</div>${quorum ? `<p class="meta">${quorum}</p>` : ""}</section>${hasText(report.recommendation) ? section("Recommendation", `<div class="callout">${textBlock(report.recommendation)}</div>`) : ""}${advisorRows ? section("Advisor Stances", `<table><thead><tr><th>Advisor</th><th>Focus</th><th>Stance</th><th>Confidence</th><th>Notes</th></tr></thead><tbody>${advisorRows}</tbody></table>`) : ""}${reportHtml ? section("Full Report", `<div class="report">${reportHtml}</div>`) : ""}${sourcesHtml ? section("Evidence Sources", sourcesHtml) : ""}${debateHtml ? section("Dissent / Debate", debateHtml) : ""}${scenarioHtml ? section("Scenarios", scenarioHtml) : ""}<footer class="footer">Confidence is calibrated &mdash; penalized for disagreement, verification flags, and offline fallback. AgentSphere is a decision-support simulation.</footer></main></body></html>`;
}
