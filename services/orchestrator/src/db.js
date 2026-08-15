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
);
CREATE TABLE IF NOT EXISTS calibration_events (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  data JSONB NOT NULL,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mission_events (
  mission_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, seq)
);
CREATE INDEX IF NOT EXISTS mission_events_mid ON mission_events (mission_id, seq);
CREATE INDEX IF NOT EXISTS missions_user_updated ON missions ((data->>'userEmail'), updated_at DESC)`;

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

const pgJson = v => JSON.stringify(v).replace(/\\u0000/g, "");
const TERMINAL_SQL = "('done','failed','cancelled')";
export const missionStore = {
  available: () => ready !== null && !degraded,
  async loadBoot(recentLimit = 100) {
    if (!(await init())) return [];
    try {
      const active = await pool.query(`SELECT data FROM missions WHERE COALESCE(data->>'status','') NOT IN ${TERMINAL_SQL}`);
      const recent = await pool.query(`SELECT data FROM missions WHERE data->>'status' IN ${TERMINAL_SQL} AND COALESCE(data->>'userEmail','') <> '' ORDER BY updated_at DESC LIMIT $1`, [recentLimit]);
      const seen = new Set();
      const rows = [];
      for (const r of [...recent.rows.reverse(), ...active.rows]) {
        if (!r.data?.id || seen.has(r.data.id)) continue;
        seen.add(r.data.id);
        rows.push(r.data);
      }
      return rows;
    } catch (err) {
      console.warn(`[orchestrator] mission boot load failed (${err.message})`);
      return [];
    }
  },
  async loadOne(id) {
    if (!id || !(await init())) return null;
    try {
      return (await pool.query("SELECT data FROM missions WHERE id = $1", [id])).rows[0]?.data || null;
    } catch (err) {
      console.warn(`[orchestrator] mission load failed (${err.message})`);
      return null;
    }
  },
  async listForUser(email, limit = 100) {
    if (!(await init())) return null;
    try {
      const r = await pool.query(
        "SELECT data->>'id' AS id, data->>'title' AS title, data->>'status' AS status, data->>'createdAt' AS created_at, data->>'decision' AS decision, data#>>'{meeting,decision}' AS meeting_decision, data#>>'{report,recommendation}' AS recommendation, data#>>'{report,confidence}' AS confidence FROM missions WHERE data->>'userEmail' = $1 ORDER BY updated_at DESC LIMIT $2",
        [email || "", limit]
      );
      return r.rows.map(x => {
        const createdAt = x.created_at == null ? NaN : Number(x.created_at);
        const confidence = x.confidence == null || x.confidence === "" ? NaN : Number(x.confidence);
        return {
          id: x.id,
          title: x.title,
          status: x.status,
          createdAt: Number.isFinite(createdAt) ? createdAt : null,
          decision: x.decision || x.meeting_decision || null,
          recommendation: x.recommendation || null,
          confidence: Number.isFinite(confidence) ? confidence : null
        };
      });
    } catch (err) {
      console.warn(`[orchestrator] mission list failed (${err.message})`);
      return null;
    }
  },
  async save(mission) {
    if (!(await init())) return;
    try {
      await pool.query(
        "INSERT INTO missions (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [mission.id, pgJson(mission)]
      );
    } catch (err) {
      console.warn(`[orchestrator] mission save failed (${err.message})`);
    }
  },
  async setField(id, key, value) {
    if (!(await init())) return;
    try {
      await pool.query(
        "UPDATE missions SET data = jsonb_set(data, $2, $3::jsonb), updated_at = now() WHERE id = $1",
        [id, `{${key}}`, pgJson(value)]
      );
    } catch (err) {
      console.warn(`[orchestrator] mission setField failed (${err.message})`);
    }
  }
};

export const eventStore = {
  async add(ev) {
    if (!(await init())) return;
    try {
      await pool.query(
        "INSERT INTO mission_events (mission_id, seq, data) VALUES ($1, $2, $3) ON CONFLICT (mission_id, seq) DO NOTHING",
        [ev.missionId, ev.seq, pgJson(ev)]
      );
    } catch (err) {
      console.warn(`[orchestrator] event persist failed (${err.message})`);
    }
  },
  async list(missionId) {
    if (!missionId || !(await init())) return [];
    try {
      return (await pool.query("SELECT data FROM mission_events WHERE mission_id = $1 ORDER BY seq", [missionId])).rows.map(r => r.data);
    } catch (err) {
      console.warn(`[orchestrator] event list failed (${err.message})`);
      return [];
    }
  },
  async prune(days = 30) {
    if (!(await init())) return 0;
    try {
      const r = await pool.query("DELETE FROM mission_events WHERE created_at < now() - make_interval(days => $1::int)", [days]);
      return r.rowCount || 0;
    } catch (err) {
      console.warn(`[orchestrator] event prune failed (${err.message})`);
      return 0;
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

export const calibrationStore = {
  async add(events) {
    if (!events?.length || !(await init())) return;
    try {
      for (const e of events) {
        const { id, missionId, ...data } = e;
        await pool.query(
          "INSERT INTO calibration_events (id, mission_id, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
          [id, missionId, JSON.stringify(data)]
        );
      }
    } catch (err) {
      console.warn(`[orchestrator] calibration add failed (${err.message})`);
    }
  },
  async setOutcome(missionId, userEmail, value) {
    if (!(await init())) return;
    try {
      await pool.query("UPDATE calibration_events SET outcome = $1 WHERE mission_id = $2 AND data->>'userEmail' = $3", [value, missionId, userEmail || ""]);
    } catch (err) {
      console.warn(`[orchestrator] calibration setOutcome failed (${err.message})`);
    }
  },
  async list(userEmail, limit = 2000) {
    if (!(await init())) return [];
    try {
      const r = await pool.query("SELECT data, outcome, mission_id FROM calibration_events WHERE data->>'userEmail' = $1 ORDER BY created_at DESC LIMIT $2", [userEmail || "", limit]);
      return r.rows.map(x => ({ ...x.data, outcome: x.outcome, missionId: x.mission_id }));
    } catch (err) {
      console.warn(`[orchestrator] calibration list failed (${err.message})`);
      return [];
    }
  }
};

export const configStore = {
  async loadAllSquads() {
    if (!(await init())) return [];
    try {
      const r = await pool.query("SELECT id, data FROM org_config WHERE id LIKE 'squad:%'");
      return r.rows.map(row => ({ email: row.id.slice("squad:".length), squad: row.data }));
    } catch (err) {
      console.warn(`[orchestrator] squad load failed (${err.message})`);
      return [];
    }
  },
  async saveSquad(email, squad) {
    if (!(await init())) return;
    try {
      await pool.query(
        "INSERT INTO org_config (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [`squad:${(email || "").toLowerCase().trim()}`, JSON.stringify(squad)]
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
  async patchFields(id, fields) {
    if (!(await init())) return;
    try {
      const entries = Object.entries(fields);
      if (!entries.length) return;
      let expr = "data";
      const params = [id];
      entries.forEach(([k, v], i) => {
        expr = `jsonb_set(${expr}, $${params.length + 1}, $${params.length + 2}::jsonb)`;
        params.push(`{${k}}`, JSON.stringify(v));
      });
      await pool.query(`UPDATE standing_missions SET data = ${expr}, updated_at = now() WHERE id = $1`, params);
    } catch (err) {
      console.warn(`[orchestrator] standing patchFields failed (${err.message})`);
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
