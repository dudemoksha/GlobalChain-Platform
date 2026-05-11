import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Globe3D from '../components/Globe3D';
import Sidebar from '../components/Sidebar';
import EmptyState from '../components/EmptyState';
import { Database, Upload } from 'lucide-react';
import { useStore, useModeStore } from '../store';

const MODES = [
  { id: 'geographical', label: '🗺 Map' },
  { id: 'satellite',    label: '🛰 Satellite' },
  { id: 'disaster',     label: '⚠ Disasters' },
  { id: 'war',          label: '🚨 Conflicts' },
  { id: 'traffic',      label: '✈ Traffic' },
];

const TABS = [
  { id: 'overview',      icon: '📊', label: 'Overview'      },
  { id: 'suppliers',     icon: '🔗', label: 'Suppliers'     },
  { id: 'alerts',        icon: '🚨', label: 'Alerts'        },
  { id: 'alternatives',  icon: '🔄', label: 'Alternatives'  },
  { id: 'signals',       icon: '📡', label: 'Live Signals'  },
];

function riskColor(s) {
  if (s >= 0.7) return '#e11d48';
  if (s >= 0.4) return '#f59e0b';
  return '#10b981';
}
function riskLabel(s) {
  if (s >= 0.7) return 'HIGH';
  if (s >= 0.4) return 'MEDIUM';
  return 'LOW';
}
function riskBadgeStyle(s) {
  if (s >= 0.7) return { background: '#fee2e2', color: '#b91c1c' };
  if (s >= 0.4) return { background: '#fef3c7', color: '#92400e' };
  return { background: '#dcfce7', color: '#15803d' };
}

function RiskBar({ value }) {
  const color = riskColor(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
        <div style={{ width: `${value * 100}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, width: '32px', textAlign: 'right' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { currentMode, setMode, searchQuery, setSearchQuery, liveData, fetchLiveData } = useModeStore();
  const { suppliers, alerts, recommendations, dashboard, signals,
          fetchSuppliers, fetchAlerts, fetchRecommendations, fetchDashboard, fetchSignals,
          wsConnected, initWS, closeWS } = useStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [hiddenImpacts, setHiddenImpacts] = useState([]);

  useEffect(() => {
    fetchSuppliers();
    fetchAlerts();
    fetchRecommendations();
    fetchDashboard();
    fetchLiveData();
    fetchSignals();
    initWS();
    
    // Fetch hidden tier impact
    import('../api').then(({ api }) => {
      api.getHiddenImpact().then(res => setHiddenImpacts(res.impacts || []));
    });

    const iv = setInterval(() => { fetchDashboard(); fetchAlerts(); }, 30000);
    return () => { clearInterval(iv); closeWS(); };
  }, []);

  const handleNodeClick = useCallback(async (node) => {
    if (!node.id || !node.tier) return;
    setSelectedNode(node);
    setActiveTab('overview');
    setPanelOpen(true);
    setLoadingDetail(true);
    try {
      const { api } = await import('../api');
      const detail = await api.getNodeDetail(node.id);
      setNodeDetail(detail);
    } catch {}
    setLoadingDetail(false);
  }, []);

  const unreadAlerts = (alerts || []).filter(a => !a.acknowledged);
  const criticalAlerts = unreadAlerts.filter(a => a.severity === 'Critical');
  const highRisk = suppliers.filter(s => s.risk_score >= 0.7);
  
  // Hoist definitions to top of component to avoid reference errors in renderPanel
  const uniqueRecs = Array.from(new Map((recommendations || []).map(r => [r.supplier_id, r])).values());
  const tier1Only = suppliers.filter(s => s.tier === 1);
  const avgRisk = tier1Only.length > 0 ? tier1Only.reduce((a, s) => a + s.risk_score, 0) / tier1Only.length : 0;

  const renderPanel = () => {
    // Node detail view
    if (selectedNode && activeTab === 'overview' && nodeDetail) {
      return (
        <div>
          <button onClick={() => { setSelectedNode(null); setNodeDetail(null); }}
            style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px', fontFamily: 'Inter,sans-serif' }}>
            ← Back to overview
          </button>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{selectedNode.name}</h3>
                <p style={{ fontSize: '12px', color: '#64748b' }}>Tier {selectedNode.tier} · {selectedNode.region}</p>
              </div>
              <span className="badge" style={{ ...riskBadgeStyle(nodeDetail.risk), fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                {riskLabel(nodeDetail.risk)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {[
                { l: 'Risk', v: `${Math.round(nodeDetail.risk * 100)}%`, c: riskColor(nodeDetail.risk) },
                { l: 'Damage', v: `${Math.round(nodeDetail.damage * 100)}%`, c: '#0f172a' },
                { l: 'Est. Delay', v: nodeDetail.time, c: '#0f172a' },
                { l: 'Confidence', v: `${Math.round(nodeDetail.confidence * 100)}%`, c: '#3b82f6' },
              ].map((m, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>{m.l}</p>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: m.c }}>{m.v}</p>
                </div>
              ))}
            </div>
            {loadingDetail ? <p style={{ fontSize: '12px', color: '#94a3b8' }}>Loading explanation...</p> : (
              nodeDetail.why?.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Why this risk?</p>
                  {nodeDetail.why.map((r, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#0f172a', padding: '6px 10px', background: '#fef3c7', borderRadius: '6px', marginBottom: '4px', lineHeight: 1.4 }}>
                      ⚠️ {r}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview': 
        if (tier1Only.length === 0) {
          return (
            <EmptyState 
              title="Welcome to GlobalChain"
              message="Your digital supply chain twin is currently empty. Initialize your network to start monitoring risk."
              actionText="Bulk Upload CSV"
              actionPath="/suppliers/upload"
              icon={Upload}
              style={{ padding: '24px 16px', gap: '16px' }}
            />
          );
        }
        return (
          <div>
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>🛰️ Orbital Status</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nodes Active</p>
                  <p style={{ fontSize: '18px', fontWeight: 900 }}>{tier1Only.length}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Network Risk</p>
                  <p style={{ fontSize: '18px', fontWeight: 900, color: riskColor(avgRisk) }}>{Math.round(avgRisk * 100)}%</p>
                </div>
              </div>
            </div>

            {criticalAlerts.length > 0 && (
              <div style={{ background: 'rgba(225, 29, 72, 0.1)', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', borderLeft: '3px solid var(--red)' }}>
                <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--red)', marginBottom: '4px' }}>🚨 MITIGATION REQUIRED</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{criticalAlerts[0]?.message}</p>
                <button onClick={() => navigate('/alerts')} className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff', border: 'none', width: '100%', marginTop: '10px' }}>Resolve Alert</button>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Recent Intelligence</p>
              {uniqueRecs.slice(0, 2).map((r, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', marginBottom: '8px' }}>
                   <p style={{ fontSize: '12px', fontWeight: 700 }}>{r.supplier_name}</p>
                   <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Recommendation: {r.alternative_name}</p>
                </div>
              ))}
              <button onClick={() => navigate('/analytics')} className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: '8px' }}>Open Intelligence Hub →</button>
            </div>
          </div>
        );

      case 'suppliers': 
        if (tier1Only.length === 0) {
          return (
            <EmptyState 
              title="No Suppliers Found"
              message="Connect your suppliers to begin mapping dependencies and visualizing multi-tier risk propagation."
              actionText="Add First Supplier"
              actionPath="/suppliers/upload"
              icon={Database}
              style={{ padding: '24px 16px', gap: '16px' }}
            />
          );
        }
        return (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {tier1Only.length} Direct Suppliers Monitoring
          </p>
          {tier1Only.slice(0, 20).map(s => (
            <div key={s.id} onClick={() => navigate(`/suppliers/${s.id}`)}
              style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{s.name}</span>
                <span className="badge" style={{ ...riskBadgeStyle(s.risk_score), fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 800 }}>
                  {riskLabel(s.risk_score)}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{s.region} · {s.product}</p>
              <RiskBar value={s.risk_score} />
            </div>
          ))}
        </div>
      );

      case 'alerts': return (
        <div>
          {unreadAlerts.length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>✅ No active alerts</p>}
          {unreadAlerts.slice(0, 15).map(a => (
            <div key={a.id} className={`alert-item ${a.severity}`} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="badge" style={{ ...riskBadgeStyle(a.severity === 'Critical' ? 0.9 : a.severity === 'Moderate' ? 0.55 : 0.2), fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>
                  {a.severity}
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(a.created_at).toLocaleTimeString()}</span>
              </div>
              <p style={{ fontSize: '12px', lineHeight: 1.5 }}>{a.message}</p>
            </div>
          ))}
          <button onClick={() => navigate('/alerts')} className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: '4px' }}>View All Alerts →</button>
        </div>
      );

      case 'alternatives': return (
        <div>
          {recommendations.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>No recommendations yet. Run a risk update.</p>
          ) : recommendations.slice(0, 8).map((r, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{r.supplier_name}</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>+{r.profit_gain_pct}% profit</span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Switch to: <b>{r.alternative_name}</b></p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {r.risk_reduction_pct > 0 && <span className="badge badge-green" style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px' }}>Risk -{r.risk_reduction_pct}%</span>}
                {r.cost_saving_pct > 0 && <span className="badge badge-blue" style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px' }}>Cost -{r.cost_saving_pct}%</span>}
              </div>
            </div>
          ))}
        </div>
      );

      case 'signals': return (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {[
              { l: 'Seismic', v: (signals?.earthquake || liveData.disasters || []).length, c: '#e11d48' },
              { l: 'Weather', v: (signals?.weather || []).length, c: '#f59e0b' },
              { l: 'Conflict', v: (signals?.geopolitical || liveData.conflicts || []).length, c: '#8b5cf6' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>{s.l}</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: s.c }}>{s.v}</p>
              </div>
            ))}
          </div>
          {(liveData.disasters || []).slice(0, 5).map((d, i) => (
            <div key={i} style={{ borderLeft: '3px solid #e11d48', paddingLeft: '10px', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{d.title}</p>
              <p style={{ fontSize: '10px', color: '#94a3b8' }}>📍 {d.lat?.toFixed(2)}, {d.lng?.toFixed(2)}</p>
            </div>
          ))}
        </div>
      );

      default: return null;
    }
  };

  const handleSearchClick = () => {
    if (!searchQuery) return;
    // Security: Only allow finding Tier 1 nodes for the Buyer
    const match = suppliers.find(s => s.tier === 1 && s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (match) {
      handleNodeClick(match);
    }
  };

  // Definitions moved to top of component

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', background: '#020617' }}>
      <Globe3D onNodeClick={handleNodeClick} currentMode={currentMode} />

      {/* Overlay controls */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', right: panelOpen ? '424px' : '24px', zIndex: 10, pointerEvents: 'none' }}>
        
        {/* Hidden Tier Impact Banner */}
        {hiddenImpacts.length > 0 && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            style={{ background: 'rgba(239, 68, 68, 0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 8px 30px rgba(225,29,72,0.15)', pointerEvents: 'auto', marginBottom: '16px' }}>
            <div style={{ fontSize: '24px' }}>🛡️</div>
            <div>
              <h3 style={{ color: 'var(--red)', fontSize: '14px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.01em' }}>Network Resilience Warning</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                {hiddenImpacts[0].message} 
                {hiddenImpacts.length > 1 && ` (+${hiddenImpacts.length - 1} other vulnerabilities detected)`}
              </p>
              <button onClick={() => navigate('/alerts')} className="btn btn-primary btn-sm" style={{ marginTop: '10px', background: 'var(--red)', borderColor: 'var(--red)' }}>Execute Risk Mitigation</button>
            </div>
            <button onClick={() => setHiddenImpacts([])} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px' }}>×</button>
          </motion.div>
        )}
      </div>

      {/* Top header - Industry Standard */}
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff' }}>G</div>
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#fff', letterSpacing: '-0.03em' }}>GlobalChain</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>Command Center</span>
            <button onClick={() => setPanelOpen(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              {panelOpen ? 'Collapse Explorer ←' : 'Expand Explorer →'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Enhanced Search Bar */}
          <div style={{ display: 'flex', gap: '0', background: 'rgba(255,255,255,0.05)', borderRadius: '30px', border: '1px solid var(--border)', overflow: 'hidden', padding: '2px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', fontSize: '14px', opacity: 0.6 }}>🔍</span>
              <input type="text" placeholder="Locate node or supplier..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'none', border: 'none', padding: '8px 12px 8px 34px', color: '#fff', fontSize: '13px', width: '220px', outline: 'none' }} />
            </div>
            <button onClick={handleSearchClick} 
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0 18px', borderRadius: '28px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
              FIND NODE
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '30px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: '11px', fontWeight: 800, color: wsConnected ? 'var(--green)' : 'var(--red)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: wsConnected ? 'var(--green)' : 'var(--red)', boxShadow: `0 0 10px ${wsConnected ? 'var(--green)' : 'var(--red)'}` }} />
            {wsConnected ? 'SECURE FEED' : 'OFFLINE'}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => navigate('/simulation')} className="btn btn-primary btn-sm" style={{ borderRadius: '30px', padding: '8px 16px' }}>🧪 Simulation</button>
            <button onClick={() => navigate('/alerts')} className="btn btn-outline btn-sm" style={{ borderRadius: '30px', padding: '8px 16px', position: 'relative' }}>
              🚨 Alerts
              {criticalAlerts.length > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--red)', color: '#fff', fontSize: '9px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{criticalAlerts.length}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Right panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            style={{ position: 'absolute', top: '56px', right: 0, bottom: '72px', zIndex: 40, width: '340px', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', borderLeft: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', fontFamily: 'Inter,sans-serif' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedNode(null); }} title={tab.label}
                  style={{ flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '16px', background: activeTab === tab.id ? '#f8fafc' : '#fff', borderBottom: activeTab === tab.id ? '2px solid #0f172a' : '2px solid transparent', transition: 'all 0.15s' }}>
                  {tab.icon}
                </button>
              ))}
            </div>
            <div style={{ padding: '12px 16px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {selectedNode && activeTab === 'overview' ? selectedNode.name : TABS.find(t => t.id === activeTab)?.label}
              </h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              <AnimatePresence mode="wait">
                <motion.div key={activeTab + (selectedNode?.id || '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                  {renderPanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode selector */}
      <div style={{ position: 'absolute', bottom: '24px', left: panelOpen ? 'calc(50% - 170px)' : '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(16px)', padding: '6px', borderRadius: '50px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', transition: 'left 0.4s' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{ padding: '7px 14px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '12px', fontWeight: 700, background: currentMode === m.id ? '#0f172a' : 'transparent', color: currentMode === m.id ? '#fff' : '#64748b', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
