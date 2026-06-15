import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://agentsphere:agentsphere@localhost:5433/agentsphere";

const SCHEMA = `CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS briefings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS org_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS standing_missions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

let pool = null;
let ready = null;
let degraded = false;
let lastAttempt = 0;

function init() {
  if (ready && (!degraded || Date.now() - lastAttempt < 10_000)) return ready;
  lastAttempt = Date.now();
  if (!pool) pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 3000
  });
  ready = pool.query(SCHEMA).then(() => {
    if (degraded) console.log("[orchestrator] mission database reconnected");
    else console.log("[orchestrator] mission database ready");
    degraded = false;
    return true;
  }).catch(err => {
    if (!degraded) console.warn(`[orchestrator] mission database unreachable (${err.message}) — history is in-memory only`);
    degraded = true;
    return false;
  });
  return ready;
}

export const missionStore = {
  async loadAll() {
    if (!(await init())) return [];
    try {
      return (await pool.query("SELECT data FROM missions ORDER BY (data->>'createdAt')::bigint")).rows.map(r => r.data);
    } catch (err) {
      console.warn(`[orchestrator] mission load failed (${err.message})`);
      return [];
    }
  },
  async save(mission) {
    if (!(await init())) return;
    try {
      await pool.query(
        "INSERT INTO missions (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [mission.id, JSON.stringify(mission)]
      );
    } catch (err) {
      console.warn(`[orchestrator] mission save failed (${err.message})`);
    }
  }
};

export const briefingStore = {
  async add(b) {
    if (!(await init())) return;
    try {
      await pool.query(
        "INSERT INTO briefings (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
        [b.id, JSON.stringify(b)]
      );
    } catch (err) {
      console.warn(`[orchestrator] briefing save failed (${err.message})`);
    }
  },
  async list(userEmail, limit = 40) {
    if (!(await init())) return [];
    try {
      const r = await pool.query("SELECT data, read FROM briefings WHERE data->>'userEmail' = $1 ORDER BY created_at DESC LIMIT $2", [userEmail || "", limit]);
      return r.rows.map(x => ({ ...x.data, read: x.read }));
    } catch (err) {
      console.warn(`[orchestrator] briefing list failed (${err.message})`);
      return [];
    }
  },
  async markRead(id, userEmail) {
    if (!(await init())) return;
    try {
      if (id) await pool.query("UPDATE briefings SET read = true WHERE id = $1 AND data->>'userEmail' = $2", [id, userEmail || ""]);else await pool.query("UPDATE briefings SET read = true WHERE read = false AND data->>'userEmail' = $1", [userEmail || ""]);
    } catch (err) {
      console.warn(`[orchestrator] briefing markRead failed (${err.message})`);
    }
  }
};

export const configStore = {
  async loadSquad() {
    if (!(await init())) return null;
    try {
      const r = await pool.query("SELECT data FROM org_config WHERE id = 'squad'");
      return r.rows[0]?.data || null;
    } catch (err) {
      console.warn(`[orchestrator] squad load failed (${err.message})`);
      return null;
    }
  },
  async saveSquad(squad) {
    if (!(await init())) return;
    try {
      await pool.query(
        "INSERT INTO org_config (id, data, updated_at) VALUES ('squad', $1, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [JSON.stringify(squad)]
      );
    } catch (err) {
      console.warn(`[orchestrator] squad save failed (${err.message})`);
    }
  }
};

export const standingStore = {
  async list() {
    if (!(await init())) return [];
    try {
      return (await pool.query("SELECT data FROM standing_missions ORDER BY (data->>'createdAt')::bigint")).rows.map(r => r.data);
    } catch (err) {
      console.warn(`[orchestrator] standing list failed (${err.message})`);
      return [];
    }
  },
  async save(s) {
    if (!(await init())) return;
    try {
      await pool.query(
        "INSERT INTO standing_missions (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [s.id, JSON.stringify(s)]
      );
    } catch (err) {
      console.warn(`[orchestrator] standing save failed (${err.message})`);
    }
  },
  async remove(id) {
    if (!(await init())) return;
    try {
      await pool.query("DELETE FROM standing_missions WHERE id = $1", [id]);
    } catch (err) {
      console.warn(`[orchestrator] standing remove failed (${err.message})`);
    }
  }
};
