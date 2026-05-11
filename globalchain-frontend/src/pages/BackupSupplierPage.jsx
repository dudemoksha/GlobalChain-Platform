import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { api } from '../api';

function riskColor(v) { if (v >= 0.7) return '#e11d48'; if (v >= 0.4) return '#f59e0b'; return '#10b981'; }

export default function BackupSupplierPage() {
  const [data, setData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState('');

  useEffect(() => {
    Promise.all([api.getBackupOverview(), api.getSuppliers()]).then(([b, s]) => {
      setData(b.suppliers || []);
      setSuppliers(s.suppliers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const assignBackup = async (supplierId) => {
    if (!selectedBackup) return;
    await api.setBackup(supplierId, +selectedBackup);
    const b = await api.getBackupOverview();
    setData(b.suppliers || []);
    setAssigning(null); setSelectedBackup('');
  };

  const needsSwitch = data.filter(s => s.needs_switch);
  const noBackup = data.filter(s => !s.has_backup);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div><h1>🔄 Backup Suppliers</h1><p>Manage backup suppliers and switch during disruptions</p></div>
        </div>
        <div className="page-body">
          {/* Alert for switches needed */}
          {needsSwitch.length > 0 && (
            <div style={{ background: '#fee2e2', borderRadius: '12px', padding: '16px', marginBottom: '20px', borderLeft: '4px solid #e11d48' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c', marginBottom: '6px' }}>⚠️ {needsSwitch.length} supplier(s) recommended for backup switch</p>
              {needsSwitch.map(s => (
                <p key={s.id} style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '2px' }}>• {s.name}: {s.recommendation}</p>
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { l: 'With Backup', v: data.filter(s => s.has_backup).length, c: '#10b981', bg: '#dcfce7' },
              { l: 'No Backup', v: noBackup.length, c: '#e11d48', bg: '#fee2e2' },
              { l: 'Needs Switch', v: needsSwitch.length, c: '#d97706', bg: '#fef3c7' },
            ].map((s, i) => (
              <div key={i} className="card card-pad" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{s.l}</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: s.c }}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Supplier List */}
          {loading ? <div className="loading-spinner" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.map((s, i) => (
                <motion.div key={s.id} className="card card-pad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{s.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b' }}>T{s.tier}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: riskColor(s.risk_score) }}>Risk {Math.round(s.risk_score * 100)}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {s.has_backup ? (
                        <span>✅ Backup: <b>{s.backup_name}</b> (Risk {Math.round((s.backup_risk || 0) * 100)}%)</span>
                      ) : (
                        <span style={{ color: '#e11d48' }}>❌ No backup configured</span>
                      )}
                    </div>
                    {s.needs_switch && s.recommendation && (
                      <p style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, marginTop: '4px' }}>💡 {s.recommendation}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {assigning === s.id ? (
                      <>
                        <select className="input-field" value={selectedBackup} onChange={e => setSelectedBackup(e.target.value)} style={{ width: '200px', fontSize: '12px' }}>
                          <option value="">Select backup...</option>
                          {suppliers.filter(x => x.id !== s.id && x.tier === s.tier).map(x => (
                            <option key={x.id} value={x.id}>{x.name} (Risk {Math.round(x.risk_score * 100)}%)</option>
                          ))}
                        </select>
                        <button onClick={() => assignBackup(s.id)} className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }}>Set</button>
                        <button onClick={() => setAssigning(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#94a3b8' }}>✕</button>
                      </>
                    ) : (
                      <button onClick={() => setAssigning(s.id)} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-family)', color: '#64748b' }}>
                        {s.has_backup ? '✏️ Change' : '+ Assign'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
