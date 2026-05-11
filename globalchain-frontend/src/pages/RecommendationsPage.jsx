import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { api } from '../api';

function riskColor(v) { if (v >= 0.7) return '#e11d48'; if (v >= 0.4) return '#f59e0b'; return '#10b981'; }

export default function RecommendationsPage() {
  const { recommendations, fetchRecommendations, fetchSuppliers } = useStore();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchRecommendations(); fetchSuppliers(); }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await api.refreshRecommendations().catch(() => {});
    await fetchRecommendations();
    setLoading(false);
  };

  const filtered = recommendations.filter(r => {
    if (filter === 'cost') return r.cost_saving_pct > 0;
    if (filter === 'risk') return r.risk_reduction_pct > 5;
    if (filter === 'quality') return r.quality_improvement > 2;
    return true;
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1>🤖 AI Recommendations</h1>
            <p>Supplier switch recommendations ranked by composite benefit score</p>
          </div>
          <button onClick={handleRefresh} disabled={loading} className="btn btn-primary">
            {loading ? '⏳ Refreshing...' : '🔄 Refresh Analysis'}
          </button>
        </div>

        <div className="page-body">
          {/* Summary row */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '24px' }}>
            {[
              { l: 'Total Recommendations', v: recommendations.length, c: '#0f172a' },
              { l: 'Avg Risk Reduction', v: recommendations.length ? `${(recommendations.reduce((a, r) => a + r.risk_reduction_pct, 0) / recommendations.length).toFixed(1)}%` : '—', c: '#10b981' },
              { l: 'Avg Cost Saving', v: recommendations.length ? `${(recommendations.reduce((a, r) => a + r.cost_saving_pct, 0) / recommendations.length).toFixed(1)}%` : '—', c: '#3b82f6' },
              { l: 'Avg Profit Gain', v: recommendations.length ? `${(recommendations.reduce((a, r) => a + r.profit_gain_pct, 0) / recommendations.length).toFixed(1)}%` : '—', c: '#8b5cf6' },
            ].map((s, i) => (
              <motion.div key={i} className="card stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <p className="stat-label">{s.l}</p>
                <p className="stat-value" style={{ color: s.c }}>{s.v}</p>
              </motion.div>
            ))}
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {[['all', 'All'], ['cost', '💰 Cost Saving'], ['risk', '🛡 Risk Reduction'], ['quality', '⭐ Quality']].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} className={`btn btn-sm ${filter === id ? 'btn-primary' : 'btn-outline'}`}>{label}</button>
            ))}
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🤖</div>
              <p style={{ color: 'var(--text-2)' }}>No recommendations available. Click "Refresh Analysis" to generate.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map((rec, i) => (
                <motion.div key={rec.id || i} className="card" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <div style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setExpanded(expanded === i ? null : i)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e11d48' }} />
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>{rec.supplier_name}</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>→</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#10b981' }}>{rec.alternative_name}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {rec.risk_reduction_pct > 0 && <span className="badge badge-green">🛡 Risk -{rec.risk_reduction_pct}%</span>}
                        {rec.cost_saving_pct > 0 && <span className="badge badge-blue">💰 Cost -{rec.cost_saving_pct}%</span>}
                        {rec.quality_improvement > 0 && <span className="badge badge-purple">⭐ Quality +{rec.quality_improvement}%</span>}
                        {rec.profit_gain_pct > 0 && <span className="badge badge-green">📈 Profit +{rec.profit_gain_pct}%</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confidence</p>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: riskColor(1 - rec.confidence) }}>{Math.round(rec.confidence * 100)}%</p>
                      </div>
                      <span style={{ fontSize: '18px', color: '#94a3b8' }}>{expanded === i ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px 20px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            {[
                              { l: 'Risk Reduction', v: `${rec.risk_reduction_pct}%`, c: '#10b981', icon: '🛡' },
                              { l: 'Cost Saving', v: `${rec.cost_saving_pct}%`, c: '#3b82f6', icon: '💰' },
                              { l: 'Quality Gain', v: `${rec.quality_improvement}%`, c: '#8b5cf6', icon: '⭐' },
                              { l: 'Profit Gain', v: `${rec.profit_gain_pct}%`, c: '#10b981', icon: '📈' },
                            ].map((m, j) => (
                              <div key={j} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                <p style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>{m.l}</p>
                                <p style={{ fontSize: '22px', fontWeight: 800, color: m.c }}>{m.v}</p>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline btn-sm">View Supplier →</button>
                            <button className="btn btn-primary btn-sm">✓ Accept Switch</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
