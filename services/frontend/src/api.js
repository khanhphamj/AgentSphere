const TOKEN_KEY = "agentsphere.token";
const USER_KEY = "agentsphere.user";
export const session = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};
async function request(path, {
  method = "GET",
  body,
  auth = true
} = {}) {
  const headers = {
    "content-type": "application/json"
  };
  if (auth && session.token) headers.authorization = `Bearer ${session.token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `HTTP ${res.status}`), {
    status: res.status,
    data: json
  });
  return json;
}
export const api = {
  requestCode: email => request("/auth/request-code", {
    method: "POST",
    body: {
      email
    },
    auth: false
  }),
  verifyCode: (email, code) => request("/auth/verify", {
    method: "POST",
    body: {
      email,
      code
    },
    auth: false
  }),
  startMission: title => request("/api/missions", {
    method: "POST",
    body: {
      title
    }
  }),
  getMission: id => request(`/api/missions/${id}`),
  clarifyMission: (id, answer) => request(`/api/missions/${id}/clarify`, {
    method: "POST",
    body: {
      answer
    }
  }),
  steerMission: (id, text) => request(`/api/missions/${id}/steer`, {
    method: "POST",
    body: {
      text
    }
  }),
  listMissions: () => request("/api/missions"),
  standing: () => request("/api/standing"),
  addStanding: (title, everyMinutes) => request("/api/standing", {
    method: "POST",
    body: {
      title,
      everyMinutes
    }
  }),
  updateStanding: (id, body) => request(`/api/standing/${id}`, {
    method: "PATCH",
    body
  }),
  deleteStanding: id => request(`/api/standing/${id}`, {
    method: "DELETE"
  }),
  briefings: () => request("/api/missions/briefings"),
  markBriefingsRead: id => request("/api/missions/briefings/read", {
    method: "POST",
    body: {
      id: id || null
    }
  }),
  getSquad: () => request("/api/squad"),
  saveSquad: squad => request("/api/squad", {
    method: "PUT",
    body: {
      squad
    }
  }),
  policyGroups: () => request("/api/policies/policy-groups"),
  grants: role => request(`/api/policies/grants/${role}`),
  memory: (agentId, missionId) => request(`/api/memory/${agentId}${missionId ? `?missionId=${encodeURIComponent(missionId)}` : ""}`),
  models: () => request("/api/models")
};
export function connectEvents({
  missionId,
  onEvent,
  onStatus
}) {
  let ws = null,
    closed = false,
    retry = 0;
  const open = () => {
    if (closed) return;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const params = new URLSearchParams();
    if (missionId) params.set("missionId", missionId);
    const email = session.user?.email;
    if (email) params.set("u", email);
    const qs = params.toString() ? `?${params.toString()}` : "";
    ws = new WebSocket(`${proto}://${location.host}/ws${qs}`);
    ws.onopen = () => {
      retry = 0;
      onStatus && onStatus("open");
    };
    ws.onmessage = e => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {}
    };
    ws.onclose = () => {
      onStatus && onStatus("closed");
      if (!closed) setTimeout(open, Math.min(8000, 500 * 2 ** retry++));
    };
    ws.onerror = () => ws.close();
  };
  open();
  return {
    close: () => {
      closed = true;
      ws && ws.close();
    }
  };
}
