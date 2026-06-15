import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://agentsphere:agentsphere@localhost:5433/agentsphere";

const SCHEMA = `CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  totp_secret TEXT NOT NULL,
  totp_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS squads (
  email TEXT PRIMARY KEY,
  squad JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

const memory = new Map();
let pool = null;
let ready = null;
let degraded = false;
let lastAttempt = 0;

function init() {
  if (ready && (!degraded || Date.now() - lastAttempt < 10_000)) return ready;
  lastAttempt = Date.now();
  if (!pool) pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 3000
  });
  ready = pool.query(SCHEMA).then(() => {
    if (degraded) console.log("[gateway] user database reconnected");
    else console.log("[gateway] user database ready");
    degraded = false;
    return true;
  }).catch(err => {
    if (!degraded) console.warn(`[gateway] user database unreachable (${err.message}) — using in-memory store`);
    degraded = true;
    return false;
  });
  return ready;
}

const rowToUser = r => r ? {
  email: r.email,
  name: r.name,
  totpSecret: r.totp_secret,
  totpConfirmed: r.totp_confirmed,
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at
} : null;

async function withDb(dbFn, memFn) {
  if (await init()) {
    try {
      return await dbFn();
    } catch (err) {
      if (!degraded) {
        degraded = true;
        console.warn(`[gateway] user database error (${err.message}) — using in-memory store`);
      }
    }
  }
  return memFn();
}

const memorySquads = new Map();

export const squads = {
  get: email => withDb(
    async () => (await pool.query("SELECT squad FROM squads WHERE email = $1", [email])).rows[0]?.squad || null,
    () => memorySquads.get(email) || null
  ),
  save: (email, squad) => withDb(
    async () => (await pool.query(
      "INSERT INTO squads (email, squad, updated_at) VALUES ($1, $2, now()) ON CONFLICT (email) DO UPDATE SET squad = EXCLUDED.squad, updated_at = now() RETURNING squad",
      [email, JSON.stringify(squad)]
    )).rows[0].squad,
    () => {
      memorySquads.set(email, squad);
      return squad;
    }
  )
};

export const users = {
  get: email => withDb(
    async () => rowToUser((await pool.query("SELECT * FROM users WHERE email = $1", [email])).rows[0]),
    () => memory.get(email) || null
  ),
  create: ({ email, name, totpSecret }) => withDb(
    async () => rowToUser((await pool.query(
      "INSERT INTO users (email, name, totp_secret) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING *",
      [email, name, totpSecret]
    )).rows[0]),
    () => {
      if (!memory.has(email)) memory.set(email, { email, name, totpSecret, totpConfirmed: false, createdAt: new Date(), lastLoginAt: null });
      return memory.get(email);
    }
  ),
  confirmAndTouch: email => withDb(
    async () => rowToUser((await pool.query(
      "UPDATE users SET totp_confirmed = TRUE, last_login_at = now() WHERE email = $1 RETURNING *",
      [email]
    )).rows[0]),
    () => {
      const u = memory.get(email);
      if (u) {
        u.totpConfirmed = true;
        u.lastLoginAt = new Date();
      }
      return u || null;
    }
  )
};
