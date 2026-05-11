import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { api } from '../api';

function riskColor(v) { if (v >= 0.7) return '#e11d48'; if (v >= 0.4) return '#f59e0b'; return '#10b981'; }

function Bar({ value, color }) {
  return (
    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.7 }}
        style={{ height: '100%', background: color, borderRadius: '3px' }} />
    </div>
  );
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSupplier(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="app-shell"><Sidebar />
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    </div>
  );

  if (!data) return (
    <div className="app-shell"><Sidebar />
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-2)' }}>Supplier not found.</p>
      </div>
    </div>
  );

  const risk = data.risk_score || 0;
  const impact = data.impact || {};
  const explanation = data.explanation || { reasons: [], confidence: 0 };
  const consumer = data.consumer_impact || {};
  const drivers = explanation.risk_drivers || {};

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <button onClick={() => navigate(-1)} style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', marginBottom: '4px', display: 'block' }}>← Back</button>
            <h1>{data.name}</h1>
            <p>Tier {data.tier} · {data.product} · {data.region}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px', fontWeight: 700, background: risk >= 0.7 ? '#fee2e2' : risk >= 0.4 ? '#fef3c7' : '#dcfce7', color: risk >= 0.7 ? '#b91c1c' : risk >= 0.4 ? '#92400e' : '#15803d' }}>
              {risk >= 0.7 ? 'HIGH RISK' : risk >= 0.4 ? 'MEDIUM RISK' : 'LOW RISK'}
            </span>
            <button onClick={() => api.deleteSupplier(id).then(() => navigate(-1))} className="btn btn-danger btn-sm">Delete</button>
          </div>
        </div>

        <div className="page-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Key metrics */}
            <div className="card card-pad">
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Risk & Impact Metrics</h3>
              {[
                { l: 'Risk Score', v: Math.round(risk * 100) + '%', color: riskColor(risk), bar: risk },
                { l: 'Damage Score', v: Math.round((impact.damage || 0) * 100) + '%', color: '#f59e0b', bar: impact.damage || 0 },
                { l: 'Confidence', v: Math.round((explanation.confidence || 0) * 100) + '%', color: '#3b82f6', bar: explanation.confidence || 0 },
                { l: 'Dependency Score', v: Math.round((data.dependency_score || 0) * 100) + '%', color: '#8b5cf6', bar: data.dependency_score || 0 },
              ].map((m, i) => (
                <div key={i} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{m.l}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: m.color }}>{m.v}</span>
                  </div>
                  <Bar value={m.bar} color={m.color} />
                </div>
              ))}
              <div className="divider" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { l: 'Est. Delay', v: impact.time_days ? `${impact.time_days}d` : '—' },
                  { l: 'Revenue Impact', v: impact.loss_fraction ? `${Math.round(impact.loss_fraction * 100)}%` : '—' },
                  { l: 'Has Backup', v: data.has_backup ? '✅ Yes' : '❌ No' },
                  { l: 'Quality', v: Math.round((data.quality || 0) * 100) + '%' },
                ].map((m, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>{m.l}</p>
                    <p style={{ fontSize: '15px', fontWeight: 700 }}>{m.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Explainability */}
            <div className="card card-pad">
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>🧾 Why This Risk?</h3>
              {explanation.reasons.length > 0 ? explanation.reasons.map((r, i) => (
                <div key={i} style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: '8px', marginBottom: '8px', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                  ⚠️ {r}
                </div>
              )) : <p style={{ color: '#94a3b8', fontSize: '13px' }}>No specific risk factors identified.</p>}

              {Object.keys(drivers).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Risk Driver Breakdown</p>
                  {Object.entries(drivers).map(([k, v]) => (
                    <div key={k} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k}</span>
                        <span style={{ fontWeight: 700 }}>{Math.round(v * 100)}%</span>
                      </div>
                      <Bar value={v} color={k === 'geopolitical' ? '#8b5cf6' : k === 'natural' ? '#f59e0b' : '#3b82f6'} />
                    </div>
                  ))}
                </div>
              )}

              {consumer && (
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>👤 Consumer Impact ({consumer.product})</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                      { l: 'Shortage Prob', v: `${Math.round((consumer.shortage_probability || 0) * 100)}%`, c: '#e11d48' },
                      { l: 'Price +%', v: `+${consumer.price_increase_pct || 0}%`, c: '#f59e0b' },
                      { l: 'Delivery Delay', v: `${consumer.delivery_delay_days || 0}d`, c: '#3b82f6' },
                    ].map((m, i) => (
                      <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>{m.l}</p>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: m.c }}>{m.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upstream / Downstream */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card card-pad">
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>⬆️ Upstream Nodes ({data.upstream_nodes?.length || 0})</h3>
              {(data.upstream_nodes || []).slice(0, 8).map((id, i) => (
                <div key={i} onClick={() => navigate(`/suppliers/${id}`)} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  Node #{id}
                </div>
              ))}
              {!data.upstream_nodes?.length && <p style={{ fontSize: '12px', color: '#94a3b8' }}>No upstream nodes registered.</p>}
            </div>
            <div className="card card-pad">
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>⬇️ Downstream Nodes ({data.downstream_nodes?.length || 0})</h3>
              {(data.downstream_nodes || []).slice(0, 8).map((id, i) => (
                <div key={i} onClick={() => navigate(`/suppliers/${id}`)} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  Node #{id}
                </div>
              ))}
              {!data.downstream_nodes?.length && <p style={{ fontSize: '12px', color: '#94a3b8' }}>No downstream nodes registered.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
