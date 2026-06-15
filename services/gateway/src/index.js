import express from "express";
import cors from "cors";
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
async function pushSquadToOrchestrator(squad) {
  if (!Array.isArray(squad)) return;
  try {
    await fetch(`${ORCHESTRATOR_URL}/squad`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-client-id": CLIENT_ID,
        "x-client-secret": CLIENT_SECRET
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
  await pushSquadToOrchestrator(squad);
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
  await pushSquadToOrchestrator(squad);
  res.json({
    squad
  });
});
app.use("/api/squad", squadRouter);
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
const server = app.listen(PORT, () => console.log(`[gateway] listening on :${PORT} → orchestrator ${ORCHESTRATOR_URL}, policy ${MCP_POLICY_URL}`));
server.on("upgrade", wsProxy.upgrade);
