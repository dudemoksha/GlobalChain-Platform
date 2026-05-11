// GlobalChain — Centralized API Client
// GlobalChain — Centralized API Client
const getBase = () => {
  // Hardcoded for local development with mobile APK
  return 'http://10.44.251.141:8000';
};

const BASE = getBase();

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
  login: (email, password) => {
    const form = new URLSearchParams({ username: email, password });
    return fetch(`${BASE}/token`, { method: 'POST', body: form }).then(r => r.json());
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
  const ws = new WebSocket('ws://10.44.251.141:8000/ws');
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  ws.onerror = () => {};
  return ws;
}
