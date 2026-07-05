import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "registry.json");
const PORT = Number(process.env.MCP_POLICY_PORT || 8083);
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
if (process.env.NODE_ENV === "production" && (!CLIENT_ID || !CLIENT_SECRET)) {
  console.error("[mcp-policy] refusing to start in production without CLIENT_ID/CLIENT_SECRET");
  process.exit(1);
}
let registry = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(registry, null, 2));
}
function internalAuth(req, res, next) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    if (process.env.NODE_ENV === "production") return res.status(503).json({
      error: "internal auth not configured"
    });
    return next();
  }
  if (req.get("x-client-id") === CLIENT_ID && req.get("x-client-secret") === CLIENT_SECRET) return next();
  res.status(401).json({
    error: "invalid client credentials"
  });
}
function groupFor(role) {
  const groupId = registry.roleBindings[role];
  return registry.policyGroups.find(g => g.id === groupId) || null;
}
function resolveGrants(role) {
  const group = groupFor(role);
  if (!group) return {
    role,
    policyGroup: null,
    servers: []
  };
  const servers = group.grants.map(grant => {
    const server = registry.servers.find(s => s.id === grant.server);
    if (!server) return null;
    const tools = grant.tools.includes("*") ? server.tools : server.tools.filter(t => grant.tools.includes(t.name));
    return {
      id: server.id,
      label: server.label,
      url: server.url,
      tools
    };
  }).filter(Boolean);
  return {
    role,
    policyGroup: {
      id: group.id,
      label: group.label
    },
    servers
  };
}
function isAllowed(role, serverId, toolName) {
  const group = groupFor(role);
  if (!group) return {
    allowed: false,
    reason: `no policy group bound to role "${role}"`
  };
  const grant = group.grants.find(g => g.server === serverId);
  if (!grant) return {
    allowed: false,
    reason: `policy group ${group.id} has no grant for server ${serverId}`
  };
  if (!grant.tools.includes("*") && !grant.tools.includes(toolName)) {
    return {
      allowed: false,
      reason: `tool ${toolName} not granted to ${group.id} on ${serverId}`
    };
  }
  return {
    allowed: true,
    policyGroup: group.id
  };
}
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "mcp-policy"
}));
app.get("/servers", internalAuth, (_req, res) => res.json(registry.servers));
app.get("/policy-groups", internalAuth, (_req, res) => res.json(registry.policyGroups.map(g => ({
  ...g,
  roles: Object.entries(registry.roleBindings).filter(([, v]) => v === g.id).map(([k]) => k)
}))));
app.get("/policy-groups/:id", internalAuth, (req, res) => {
  const g = registry.policyGroups.find(x => x.id === req.params.id);
  if (!g) return res.status(404).json({
    error: "not found"
  });
  res.json(g);
});
app.put("/policy-groups/:id", internalAuth, (req, res) => {
  const i = registry.policyGroups.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({
    error: "not found"
  });
  const {
    label,
    description,
    grants
  } = req.body || {};
  if (grants && !Array.isArray(grants)) return res.status(400).json({
    error: "grants must be an array"
  });
  registry.policyGroups[i] = {
    ...registry.policyGroups[i],
    ...(label != null ? {
      label
    } : {}),
    ...(description != null ? {
      description
    } : {}),
    ...(grants != null ? {
      grants
    } : {})
  };
  persist();
  res.json(registry.policyGroups[i]);
});
app.get("/grants/:role", internalAuth, (req, res) => res.json(resolveGrants(req.params.role)));
app.post("/authorize", internalAuth, (req, res) => {
  const {
    role,
    server,
    tool
  } = req.body || {};
  if (!role || !server || !tool) return res.status(400).json({
    error: "role, server, tool required"
  });
  res.json({
    role,
    server,
    tool,
    ...isAllowed(role, server, tool)
  });
});
app.listen(PORT, () => console.log(`[mcp-policy] listening on :${PORT}`));
