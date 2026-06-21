import express from "express";
import cors from "cors";
import path from "path";
import jwt from "jsonwebtoken";
import { createProxyMiddleware } from "http-proxy-middleware";
import { users, squads } from "./db.js";
import { generateSecret, verifyTotp, otpauthUri } from "./totp.js";
const PORT = Number(process.env.GATEWAY_PORT || 8080);
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "dev-secret";
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://localhost:8081";
const MCP_POLICY_URL = process.env.MCP_POLICY_URL || "http://localhost:8083";
const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL || "http://localhost:8082";
const ACCEPT_ANY = (process.env.AUTH_ACCEPT_ANY_CODE || "true") === "true";
const JWT_TTL_H = Number(process.env.JWT_TTL_HOURS || 72);
const app = express();
app.use(cors());
const nameFromEmail = email => {
  const local = email.split("@")[0] || "user";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim() || "User";
};
const authRouter = express.Router();
authRouter.use(express.json());
authRouter.post("/request-code", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({
    error: "invalid email"
  });
  let user = await users.get(email);
  if (!user) user = await users.create({
    email,
    name: nameFromEmail(email),
    totpSecret: generateSecret()
  });
  if (!user.totpConfirmed) {
    return res.json({
      mode: "enroll",
      otpauth: otpauthUri(email, user.totpSecret),
      secret: user.totpSecret
    });
  }
  res.json({
    mode: "totp"
  });
});
authRouter.post("/verify", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();
  if (!/^\d{6}$/.test(code)) return res.status(400).json({
    error: "code must be 6 digits"
  });
  const record = await users.get(email);
  if (!record) return res.status(401).json({
    error: "unknown user — request a code first"
  });
  const valid = ACCEPT_ANY || verifyTotp(record.totpSecret, code);
  if (!valid) return res.status(401).json({
    error: "invalid authenticator code"
  });
  await users.confirmAndTouch(email);
  const user = {
    email,
    name: record.name,
    tenant: "GreenNode · Enterprise"
  };
  const token = jwt.sign(user, CLIENT_SECRET, {
    expiresIn: `${JWT_TTL_H}h`
  });
  res.json({
    token,
    user
  });
});
app.use("/auth", authRouter);
app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "gateway"
}));
function requireSession(req, res, next) {
  const h = req.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({
    error: "missing token"
  });
  try {
    req.user = jwt.verify(token, CLIENT_SECRET);
    next();
  } catch {
    res.status(401).json({
      error: "invalid token"
    });
  }
}
const withInternalCreds = {
  proxyReq: (proxyReq, req) => {
    proxyReq.setHeader("x-client-id", CLIENT_ID);
    proxyReq.setHeader("x-client-secret", CLIENT_SECRET);
    if (req.user?.email) proxyReq.setHeader("x-user-email", req.user.email);
  }
};
app.use("/api/policies", requireSession, createProxyMiddleware({
  target: MCP_POLICY_URL,
  changeOrigin: true,
  on: withInternalCreds
}));
app.use("/api/memory", requireSession, createProxyMiddleware({
  target: AGENT_RUNTIME_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/": "/memory/"
  },
  on: withInternalCreds
}));
app.use("/api/models", requireSession, createProxyMiddleware({
  target: AGENT_RUNTIME_URL,
  changeOrigin: true,
  pathRewrite: () => "/models",
  on: withInternalCreds
}));
async function pushSquadToOrchestrator(email, squad) {
  if (!Array.isArray(squad) || !email) return;
  try {
    await fetch(`${ORCHESTRATOR_URL}/squad`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-client-id": CLIENT_ID,
        "x-client-secret": CLIENT_SECRET,
        "x-user-email": email
      },
      body: JSON.stringify({
        squad
      }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (err) {
    console.warn(`[gateway] squad push to orchestrator failed: ${err.message}`);
  }
}
const squadRouter = express.Router();
squadRouter.use(express.json());
squadRouter.get("/", requireSession, async (req, res) => {
  const squad = await squads.get(req.user.email);
  await pushSquadToOrchestrator(req.user.email, squad);
  res.json({
    squad
  });
});
squadRouter.put("/", requireSession, async (req, res) => {
  const squad = req.body?.squad;
  if (!Array.isArray(squad)) return res.status(400).json({
    error: "squad array required"
  });
  await squads.save(req.user.email, squad);
  await pushSquadToOrchestrator(req.user.email, squad);
  res.json({
    squad
  });
});
app.use("/api/squad", squadRouter);
app.post("/api/missions", requireSession, express.json(), async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "title required" });
  const depth = req.body?.depth === "deep" ? "deep" : "quick";
  let squad = null;
  try {
    squad = await squads.get(req.user.email);
  } catch {}
  try {
    const r = await fetch(`${ORCHESTRATOR_URL}/missions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-client-id": CLIENT_ID,
        "x-client-secret": CLIENT_SECRET,
        "x-user-email": req.user.email
      },
      body: JSON.stringify({ title, squad, depth }),
      signal: AbortSignal.timeout(10000)
    });
    const json = await r.json().catch(() => ({}));
    res.status(r.status).json(json);
  } catch (err) {
    res.status(502).json({ error: `orchestrator unreachable: ${err.message}` });
  }
});
app.use("/api", requireSession, createProxyMiddleware({
  target: ORCHESTRATOR_URL,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader("x-client-id", CLIENT_ID);
      proxyReq.setHeader("x-client-secret", CLIENT_SECRET);
      if (req.user?.email) proxyReq.setHeader("x-user-email", req.user.email);
    }
  }
}));
const wsProxy = createProxyMiddleware({
  target: ORCHESTRATOR_URL,
  changeOrigin: true,
  ws: true,
  proxyTimeout: 600_000,
  timeout: 600_000,
  pathRewrite: {
    "^/ws": "/events"
  }
});
app.use("/ws", wsProxy);
if (process.env.FRONTEND_DIST) {
  const dist = process.env.FRONTEND_DIST;
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  console.log(`[gateway] serving frontend from ${dist}`);
}
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "invalid JSON body" });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "request body too large" });
  console.warn(`[gateway] request error: ${err?.message || err}`);
  res.status(err?.status || err?.statusCode || 500).json({ error: "internal error" });
});
const server = app.listen(PORT, () => console.log(`[gateway] listening on :${PORT} → orchestrator ${ORCHESTRATOR_URL}, policy ${MCP_POLICY_URL}`));
server.on("upgrade", (req, socket, head) => {
  if (!req.url || !req.url.startsWith("/ws")) {
    socket.destroy();
    return;
  }
  try {
    const token = new URL(req.url, "http://x").searchParams.get("token");
    if (!token) throw new Error("missing token");
    const payload = jwt.verify(token, CLIENT_SECRET);
    req.headers["x-user-email"] = String(payload.email || "").toLowerCase().trim();
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wsProxy.upgrade(req, socket, head);
});
