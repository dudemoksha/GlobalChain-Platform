// GlobalChain — Centralized API Client
// GlobalChain — Centralized API Client
const getBase = () => {
  // Permanent Cloud Backend on Vercel (Free)
  return 'https://globalchain-platform.vercel.app';
};

const BASE = getBase();

// --- GUEST MODE / DEMO DATA ---
const IS_GUEST = () => localStorage.getItem('isGuest') === 'true';

const MOCK_DATA = {
  dashboard: {
    total_suppliers: 142,
    high_risk_count: 8,
    moderate_risk_count: 24,
    active_alerts: 5,
    recommendations_count: 12,
    signal_count: 156,
    status: "ELEVATED",
    alert_summary: { "Critical": 2, "Warning": 3 }
  },
  suppliers: [
    { id: 1, name: "NanoLink Semiconductors", tier: 1, lat: 35.6895, lng: 139.6917, region: "Japan", product: "AI Chips", risk_score: 0.12, dependency_score: 0.88, status: "approved" },
    { id: 2, name: "LithiumCore Energy", tier: 2, lat: -23.5505, lng: -46.6333, region: "Brazil", product: "Batteries", risk_score: 0.65, dependency_score: 0.72, status: "approved" },
    { id: 3, name: "Valyrian Steel Works", tier: 1, lat: 51.5074, lng: -0.1278, region: "UK", product: "High-grade Steel", risk_score: 0.05, dependency_score: 0.45, status: "approved" },
    { id: 4, name: "Shenzhen Precision", tier: 3, lat: 22.5431, lng: 114.0579, region: "China", product: "Connectors", risk_score: 0.82, dependency_score: 0.95, status: "approved" }
  ],
  graph: {
    nodes: [
      { id: 1, name: "NanoLink", tier: 1, lat: 35.6, lng: 139.6, risk: 0.12 },
      { id: 2, name: "LithiumCore", tier: 2, lat: -23.5, lng: -46.6, risk: 0.65 },
      { id: 4, name: "Shenzhen", tier: 3, lat: 22.5, lng: 114.0, risk: 0.82 }
    ],
    edges: [
      { from: 2, to: 1, weight: 0.8 },
      { from: 4, to: 2, weight: 0.9 }
    ]
  },
  signals: {
    total: 156,
    earthquake: [{ lat: 35.6, lng: 139.6, severity: 0.4, label: "Minor Tremor" }],
    geopolitical: [{ lat: 22.5, lng: 114.0, severity: 0.8, label: "Trade Restriction" }],
    weather: []
  }
};

function headers() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authOnly() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(method, path, body) {
  if (IS_GUEST()) {
    console.log(`[Guest Mode] Mocking ${method} ${path}`);
    if (path === '/dashboard') return MOCK_DATA.dashboard;
    if (path === '/suppliers') return { suppliers: MOCK_DATA.suppliers };
    if (path === '/graph') return MOCK_DATA.graph;
    if (path === '/signals') return MOCK_DATA.signals;
    if (path === '/me') return { id: 999, email: 'guest@demo.com', role: 'Buyer', tier: 0, status: 'Approved' };
    return { status: "ok", message: "Mocked action successful" };
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: headers(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return res.json();
  } catch (e) {
    if (e.message === 'Failed to fetch') {
      throw new Error('Connection failed. Please ensure the backend server is running on ' + BASE);
    }
    throw e;
  }
}

export const api = {
  // Auth
  login: async (email, password) => {
    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      
      const res = await fetch(`${BASE}/token`, { 
        method: 'POST', 
        body: form,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Login failed: ${res.status}`);
      }
      return res.json();
    } catch (e) {
      if (e.message === 'Failed to fetch') {
        throw new Error('Connection error: Cannot reach the backend server at ' + BASE + '. Check your internet or CORS settings.');
      }
      throw e;
    }
  },
  guestLogin: () => {
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('token', 'guest-demo-token');
    localStorage.setItem('role', 'Buyer');
    return Promise.resolve({ access_token: 'guest-demo-token', role: 'Buyer' });
  },
  signup: (data) => req('POST', '/signup', data),
  me: () => req('GET', '/me'),

  // Dashboard
  dashboard: () => req('GET', '/dashboard'),

  // Suppliers
  getSuppliers: () => req('GET', '/suppliers'),
  getSupplier: (id) => req('GET', `/suppliers/${id}`),
  addSupplier: (data) => req('POST', '/supplier', data),
  deleteSupplier: (id) => req('DELETE', `/suppliers/${id}`),

  // Supplier Approval (Admin)
  getPendingSuppliers: () => req('GET', '/admin/suppliers/pending'),
  getAllAdminSuppliers: () => req('GET', '/admin/suppliers/all'),
  approveSupplier: (id) => req('POST', `/admin/suppliers/${id}/approve`),
  rejectSupplier: (id) => req('POST', `/admin/suppliers/${id}/reject`),

  // CSV Bulk Upload
  bulkUpload: (file) => {
    if (IS_GUEST()) return Promise.resolve({ created: 1, errors: [], names: ["Demo Supplier"] });
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/suppliers/bulk-upload`, {
      method: 'POST', body: form, headers: authOnly(),
    }).then(r => r.json());
  },

  // Backup Supplier
  setBackup: (supplierId, backupId) => req('POST', `/suppliers/${supplierId}/set-backup/${backupId}`),
  getBackupOverview: () => req('GET', '/suppliers/backup-overview'),

  // Hidden Tier Impact
  getHiddenImpact: () => req('GET', '/impact/hidden'),

  // Graph
  getGraph: () => req('GET', '/graph'),
  getNodeDetail: (id) => req('GET', `/graph/node/${id}`),

  // Edges
  getEdges: () => req('GET', '/edges'),
  createEdge: (data) => req('POST', '/edges', data),
  deleteEdge: (id) => req('DELETE', `/edges/${id}`),

  // Alerts
  getAlerts: () => req('GET', '/alerts'),
  acknowledgeAlert: (alertId) => req('POST', '/alerts/acknowledge', { alert_id: alertId }),

  // Recommendations
  getRecommendations: () => req('GET', '/recommendations'),
  refreshRecommendations: () => req('POST', '/recommendations/refresh'),

  // Simulation
  simulate: (data) => req('POST', '/simulate', data),
  getSimHistory: () => req('GET', '/simulate/history'),

  // Signals
  getSignals: () => req('GET', '/signals'),
  getLiveStatus: () => req('GET', '/api/live-status'),
  getGlobeData: () => req('GET', '/api/globe-data'),

  // Admin
  getAdminUsers: () => req('GET', '/admin/users'),
  approveUser: (id) => req('POST', `/admin/users/${id}/approve`),
  rejectUser: (id) => req('POST', `/admin/users/${id}/reject`),
  getAdminStats: () => req('GET', '/admin/stats'),
  purgeWorkspace: () => req('POST', '/api/purge'),
};

// WebSocket factory
export function createWS(onMessage) {
  if (IS_GUEST()) return { close: () => {}, send: () => {} };
  const ws = new WebSocket('wss://globalchain-platform.vercel.app/ws');
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  ws.onerror = () => {};
  return ws;
}
