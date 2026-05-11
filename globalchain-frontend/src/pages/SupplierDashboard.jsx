import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { api } from '../api';

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { suppliers, fetchSuppliers, alerts, fetchAlerts } = useStore();
  const [mySupplier, setMySupplier] = useState(null);

  useEffect(() => { fetchSuppliers(); fetchAlerts(); }, []);

  useEffect(() => {
    // Find Tier 1 supplier linked to this user (use first Tier 1 as demo)
    const t1 = suppliers.find(s => s.tier === 1);
    if (t1) {
      api.getSupplier(t1.id).then(setMySupplier).catch(() => {});
    }
  }, [suppliers]);

  const myAlerts = alerts.filter(a => mySupplier && a.supplier_id === mySupplier.id && !a.acknowledged);
  const tier2 = suppliers.filter(s => s.tier === 2);
  const risk = mySupplier?.risk_score || 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1>🏭 Supplier Dashboard</h1>
            <p>Tier 1 Supplier — {mySupplier?.name || 'Loading...'} · {mySupplier?.region || ''}</p>
          </div>
          <span className="badge" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px', fontWeight: 700, background: risk >= 0.7 ? '#fee2e2' : risk >= 0.4 ? '#fef3c7' : '#dcfce7', color: risk >= 0.7 ? '#b91c1c' : risk >= 0.4 ? '#92400e' : '#15803d' }}>
            {risk >= 0.7 ? 'HIGH RISK' : risk >= 0.4 ? 'MEDIUM RISK' : 'LOW RISK'}
          </span>
        </div>
        <div className="page-body">
          {mySupplier && (
            <>
              <div className="stat-grid stat-grid-4" style={{ marginBottom: '24px' }}>
                {[
                  { l: 'Risk Score', v: `${Math.round(risk * 100)}%`, c: risk >= 0.7 ? '#e11d48' : risk >= 0.4 ? '#f59e0b' : '#10b981' },
                  { l: 'Quality', v: `${Math.round((mySupplier.quality || 0) * 100)}%`, c: '#10b981' },
                  { l: 'Capacity', v: `${Math.round((mySupplier.capacity || 0) * 100)}%`, c: '#3b82f6' },
                  { l: 'Active Alerts', v: myAlerts.length, c: myAlerts.length > 0 ? '#e11d48' : '#10b981' },
                ].map((s, i) => (
                  <motion.div key={i} className="card stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <p className="stat-label">{s.l}</p>
                    <p className="stat-value" style={{ color: s.c }}>{s.v}</p>
                  </motion.div>
                ))}
              </div>

              {mySupplier.explanation?.reasons?.length > 0 && (
                <div className="card card-pad" style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>🧾 Why Your Risk Score?</h3>
                  {mySupplier.explanation.reasons.map((r, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', marginBottom: '6px', fontSize: '12px', color: '#92400e', lineHeight: 1.4 }}>⚠️ {r}</div>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card card-pad">
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>Your Tier 2 Sub-Suppliers ({tier2.length})</h3>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>Supplier identities masked — region and risk visible only</p>
              {tier2.slice(0, 8).map((s, i) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < tier2.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>Supplier *** ({s.region})</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8' }}>{s.product}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: s.risk_score >= 0.7 ? '#fee2e2' : s.risk_score >= 0.4 ? '#fef3c7' : '#dcfce7', color: s.risk_score >= 0.7 ? '#b91c1c' : s.risk_score >= 0.4 ? '#92400e' : '#15803d' }}>
                    {Math.round(s.risk_score * 100)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="card card-pad">
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>🚨 My Alerts</h3>
              {myAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>No active alerts for your node</p>
                </div>
              ) : myAlerts.map((a, i) => (
                <div key={a.id} style={{ borderLeft: `3px solid ${a.severity === 'Critical' ? '#e11d48' : '#f59e0b'}`, paddingLeft: '10px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: a.severity === 'Critical' ? '#e11d48' : '#f59e0b', marginBottom: '3px' }}>{a.severity}</p>
                  <p style={{ fontSize: '12px', lineHeight: 1.4 }}>{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
