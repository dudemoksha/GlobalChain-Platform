import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { api } from '../api';

const STATUS_COLORS = { pending: '#d97706', approved: '#0f766e', rejected: '#e11d48' };

export default function SupplierApprovalPage() {
  const [tab, setTab] = useState('pending');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = tab === 'pending' ? await api.getPendingSuppliers() : await api.getAllAdminSuppliers();
      setSuppliers(data.suppliers || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const approve = async (id) => {
    await api.approveSupplier(id);
    setSuppliers(s => s.map(x => x.id === id ? { ...x, status: 'approved' } : x));
  };
  const reject = async (id) => {
    await api.rejectSupplier(id);
    setSuppliers(s => s.map(x => x.id === id ? { ...x, status: 'rejected' } : x));
  };

  const pending = suppliers.filter(s => s.status === 'pending');
  const shown = tab === 'pending' ? pending : suppliers;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div><h1>📋 Supplier Approvals</h1><p>Review and approve pending supplier submissions</p></div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.7)', padding: '4px', borderRadius: '30px', border: '1px solid var(--border)' }}>
            {['pending', 'all'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: '26px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'var(--font-family)', background: tab === t ? '#0f172a' : 'transparent', color: tab === t ? '#fff' : '#64748b', transition: 'all 0.2s', textTransform: 'capitalize' }}>{t}</button>
            ))}
          </div>
        </div>
        <div className="page-body">
          {loading ? <div className="loading-spinner" /> : shown.length === 0 ? (
            <div className="card card-pad" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
              <p style={{ color: 'var(--text-2)' }}>{tab === 'pending' ? 'No pending suppliers' : 'No suppliers found'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {shown.map((s, i) => (
                <motion.div key={s.id} className="card card-pad" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{s.name}</h4>
                      <span style={{ background: `${STATUS_COLORS[s.status]}18`, color: STATUS_COLORS[s.status], padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{s.status}</span>
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>Tier {s.tier}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>
                      📍 {s.region} · 🔧 {s.product} · Submitted by {s.owner_email || 'System'}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Cost: {Math.round((s.cost || 0) * 100)}%</span>
                      <span>Capacity: {Math.round((s.capacity || 0) * 100)}%</span>
                      <span>Quality: {Math.round((s.quality || 0) * 100)}%</span>
                      <span>📍 {s.lat?.toFixed(2)}, {s.lng?.toFixed(2)}</span>
                    </div>
                  </div>
                  {s.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button onClick={() => approve(s.id)} style={{ padding: '8px 18px', borderRadius: '24px', border: 'none', cursor: 'pointer', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '12px', fontFamily: 'var(--font-family)' }}>✓ Approve</button>
                      <button onClick={() => reject(s.id)} style={{ padding: '8px 18px', borderRadius: '24px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '12px', fontFamily: 'var(--font-family)' }}>✕ Reject</button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
