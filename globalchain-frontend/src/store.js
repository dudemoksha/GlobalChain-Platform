import { create } from 'zustand';
import { api, createWS } from './api';

export const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  user: null,
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  setAuth: (token, role, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    set({ token, role, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    set({ token: null, role: null, user: null });
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: null,
  fetchDashboard: async () => {
    try { set({ dashboard: await api.dashboard() }); } catch {}
  },

  // ── Suppliers ─────────────────────────────────────────────────────────────
  suppliers: [],
  suppliersLoading: false,
  fetchSuppliers: async () => {
    set({ suppliersLoading: true });
    try {
      const data = await api.getSuppliers();
      set({ suppliers: data.suppliers || [] });
    } catch {}
    set({ suppliersLoading: false });
  },

  // ── Graph ─────────────────────────────────────────────────────────────────
  graphData: null,
  fetchGraph: async () => {
    try { set({ graphData: await api.getGraph() }); } catch {}
  },

  // ── Alerts ────────────────────────────────────────────────────────────────
  alerts: [],
  fetchAlerts: async () => {
    try {
      const data = await api.getAlerts();
      set({ alerts: data.alerts || [] });
    } catch {}
  },
  acknowledgeAlert: async (id) => {
    await api.acknowledgeAlert(id);
    set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a) }));
  },

  // ── Recommendations ───────────────────────────────────────────────────────
  recommendations: [],
  fetchRecommendations: async () => {
    try {
      const data = await api.getRecommendations();
      set({ recommendations: data.recommendations || [] });
    } catch {}
  },

  // ── Simulation ────────────────────────────────────────────────────────────
  simResult: null,
  simLoading: false,
  simHistory: [],
  runSimulation: async (params) => {
    set({ simLoading: true, simResult: null });
    try {
      const result = await api.simulate(params);
      set({ simResult: result });
    } catch (e) { set({ simResult: { error: e.message } }); }
    set({ simLoading: false });
  },
  fetchSimHistory: async () => {
    try {
      const data = await api.getSimHistory();
      set({ simHistory: data.simulations || [] });
    } catch {}
  },

  // ── Live signals / status ─────────────────────────────────────────────────
  liveStatus: { status: 'CONNECTING' },
  signals: { earthquake: [], weather: [], geopolitical: [], total: 0 },
  fetchLiveStatus: async () => {
    try { set({ liveStatus: await api.getLiveStatus() }); } catch {}
  },
  fetchSignals: async () => {
    try { set({ signals: await api.getSignals() }); } catch {}
  },

  // ── Globe mode ────────────────────────────────────────────────────────────
  globeMode: 'geographical',
  setGlobeMode: (mode) => set({ globeMode: mode }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // ── WebSocket ─────────────────────────────────────────────────────────────
  ws: null,
  wsConnected: false,
  initWS: () => {
    const ws = createWS((msg) => {
      const { event, data } = msg;
      if (event === 'connected') set({ wsConnected: true });
      if (event === 'risk_update') {
        get().fetchSuppliers();
        get().fetchGraph();
      }
      if (event === 'alert_triggered') {
        set(s => ({
          alerts: [...(data.alerts || []), ...s.alerts].slice(0, 100),
        }));
      }
      if (event === 'recommendation_generated') {
        get().fetchRecommendations();
      }
      if (event === 'simulation_completed') {
        get().fetchSimHistory();
      }
    });
    ws.onopen = () => set({ wsConnected: true });
    ws.onclose = () => set({ wsConnected: false });
    set({ ws });
  },
  closeWS: () => {
    const ws = get().ws;
    if (ws) ws.close();
    set({ ws: null, wsConnected: false });
  },
}));

// Legacy store compatibility
export const useModeStore = create((set) => ({
  currentMode: 'geographical',
  setMode: (mode) => set({ currentMode: mode }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  liveData: { status: 'CONNECTING', disasters: [], conflicts: [], traffic: [] },
  fetchLiveData: async () => {
    try {
      const data = await api.getLiveStatus();
      set({ liveData: { ...data, status: data.status || 'NOMINAL' } });
    } catch {}
  },
}));
