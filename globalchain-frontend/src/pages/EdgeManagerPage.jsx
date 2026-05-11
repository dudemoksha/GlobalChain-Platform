import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { api } from '../api';

export default function EdgeManagerPage() {
  const [edges, setEdges] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ from_supplier_id: '', to_supplier_id: '', dependency_weight: 0.8 });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([api.getEdges(), api.getSuppliers()]).then(([e, s]) => {
      setEdges(e.edges || []);
      setSuppliers(s.suppliers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const addEdge = async () => {
    if (!form.from_supplier_id || !form.to_supplier_id) return setMsg('Select both suppliers');
    if (form.from_supplier_id === form.to_supplier_id) return setMsg('Cannot connect to self');
    try {
      await api.createEdge({ from_supplier_id: +form.from_supplier_id, to_supplier_id: +form.to_supplier_id, dependency_weight: +form.dependency_weight });
      setMsg('✅ Connection created');
      const e = await api.getEdges();
      setEdges(e.edges || []);
      setForm({ from_supplier_id: '', to_supplier_id: '', dependency_weight: 0.8 });
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const removeEdge = async (id) => {
    await api.deleteEdge(id);
    setEdges(edges.filter(e => e.id !== id));
  };

  const tierColor = (t) => t === 1 ? '#0f766e' : t === 2 ? '#d97706' : '#e11d48';

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div><h1>🔗 Edge Manager</h1><p>Define supply chain dependencies — who depends on whom</p></div>
        </div>
        <div className="page-body">
          {/* Add Connection */}
          <div className="card card-pad" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Add Supply Chain Connection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">From (Depends On)</label>
                <select className="input-field" value={form.from_supplier_id} onChange={e => setForm(f => ({ ...f, from_supplier_id: e.target.value }))}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>T{s.tier} — {s.name}</option>)}
                </select>
              </div>
              <span style={{ fontSize: '20px', color: '#94a3b8', paddingBottom: '8px' }}>→</span>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">To (Supplies To)</label>
                <select className="input-field" value={form.to_supplier_id} onChange={e => setForm(f => ({ ...f, to_supplier_id: e.target.value }))}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>T{s.tier} — {s.name}</option>)}
                </select>
              </div>
              <button onClick={addEdge} className="btn btn-primary" style={{ marginBottom: '2px' }}>+ Add</button>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label className="input-label">Dependency Weight: <b>{Math.round(form.dependency_weight * 100)}%</b></label>
              <input type="range" min="0.1" max="1.0" step="0.05" value={form.dependency_weight} onChange={e => setForm(f => ({ ...f, dependency_weight: +e.target.value }))} style={{ width: '100%', accentColor: '#0f172a' }} />
            </div>
            {msg && <p style={{ fontSize: '12px', marginTop: '8px', color: msg.startsWith('✅') ? '#15803d' : '#b91c1c' }}>{msg}</p>}
          </div>

          {/* Existing Connections */}
          <div className="card card-pad">
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Existing Connections ({edges.length})</h3>
            {loading ? <div className="loading-spinner" /> : edges.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', fontSize: '13px' }}>No connections yet. Add one above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {edges.map((e, i) => (
                  <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: tierColor(e.from_tier), background: `${tierColor(e.from_tier)}15`, padding: '2px 8px', borderRadius: '10px' }}>T{e.from_tier}</span>
                        <p style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>{e.from_name}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                        <span style={{ fontSize: '18px' }}>→</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, background: '#e2e8f0', padding: '2px 8px', borderRadius: '8px' }}>{Math.round(e.dependency_weight * 100)}%</span>
                        <span style={{ fontSize: '18px' }}>→</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: tierColor(e.to_tier), background: `${tierColor(e.to_tier)}15`, padding: '2px 8px', borderRadius: '10px' }}>T{e.to_tier}</span>
                        <p style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>{e.to_name}</p>
                      </div>
                    </div>
                    <button onClick={() => removeEdge(e.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-family)' }}>Remove</button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
