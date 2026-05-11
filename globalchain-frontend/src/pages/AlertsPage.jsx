import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

function riskColor(v) { if (v >= 0.7) return '#e11d48'; if (v >= 0.4) return '#f59e0b'; return '#10b981'; }

export default function AlertsPage() {
  const { alerts, fetchAlerts, acknowledgeAlert } = useStore();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAlerts(); }, []);

  const displayed = alerts.filter(a => {
    if (filter !== 'All' && a.severity !== filter) return false;
    if (search && !a.message.toLowerCase().includes(search.toLowerCase()) && !(a.supplier_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unread = alerts.filter(a => !a.acknowledged);
  const critical = alerts.filter(a => a.severity === 'Critical' && !a.acknowledged);
  const moderate = alerts.filter(a => a.severity === 'Moderate' && !a.acknowledged);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1>🚨 Alert Center</h1>
            <p>Real-time supply chain disruption alerts ranked by severity</p>
          </div>
          <button onClick={() => fetchAlerts()} className="btn btn-outline">↻ Refresh</button>
        </div>
        <div className="page-body">
          {/* Summary */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '24px' }}>
            {[
              { l: 'Total Active', v: unread.length, c: '#0f172a' },
              { l: 'Critical', v: critical.length, c: '#e11d48' },
              { l: 'Moderate', v: moderate.length, c: '#f59e0b' },
              { l: 'Acknowledged', v: alerts.length - unread.length, c: '#10b981' },
            ].map((s, i) => (
              <motion.div key={i} className="card stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <p className="stat-label">{s.l}</p>
                <p className="stat-value" style={{ color: s.c }}>{s.v}</p>
              </motion.div>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['All', 'Critical', 'Moderate', 'Low'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>{f}</button>
              ))}
            </div>
            <input placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field" style={{ width: '220px', padding: '7px 14px' }} />
          </div>

          {/* Alert list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AnimatePresence>
              {displayed.length === 0 && (
                <div className="card card-pad" style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                  <p style={{ color: 'var(--text-2)' }}>No alerts match your filter</p>
                </div>
              )}
              {displayed.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.03 }}
                  className="card"
                  style={{ borderLeft: `4px solid ${a.severity === 'Critical' ? '#e11d48' : a.severity === 'Moderate' ? '#f59e0b' : '#10b981'}`, opacity: a.acknowledged ? 0.55 : 1 }}>
                  <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                        <span className={`badge severity-${a.severity}`}>{a.severity}</span>
                        {a.supplier_name && <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{a.supplier_name}</span>}
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#0f172a', lineHeight: 1.5 }}>{a.message}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <span className="badge badge-gray">Risk {Math.round(a.risk_value * 100)}%</span>
                        {a.acknowledged && <span className="badge badge-gray">✓ Acknowledged</span>}
                      </div>
                    </div>
                    {!a.acknowledged && (
                      <button onClick={() => acknowledgeAlert(a.id)} className="btn btn-outline btn-sm" style={{ marginLeft: '16px', flexShrink: 0 }}>
                        Acknowledge
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
