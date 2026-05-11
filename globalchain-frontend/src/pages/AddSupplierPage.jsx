import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { api } from '../api';
import { useStore } from '../store';

const REGIONS = ['China','Japan','South Korea','India','Thailand','Vietnam','Malaysia','Singapore','Netherlands','Germany','Turkey','UK','USA','Bangladesh','Indonesia','Pakistan','Nigeria','Kenya','South Africa','Chile','Peru','Italy','Belgium','Taiwan'];
const PRODUCTS = ['Electronics','Semiconductors','Logistics','Manufacturing','Raw Materials','Textiles','Pharmaceuticals','Chemicals','Automotive','Food'];

export default function AddSupplierPage() {
  const navigate = useNavigate();
  const { fetchSuppliers, role, suppliers } = useStore();
  const [form, setForm] = useState({ name: '', tier: 1, lat: 0, lng: 0, region: 'China', product: 'Electronics', cost: 0.5, capacity: 0.7, quality: 0.8, has_backup: false, revenue_contribution: 0.05 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await api.addSupplier({ ...form, tier: +form.tier, lat: +form.lat, lng: +form.lng, cost: +form.cost, capacity: +form.capacity, quality: +form.quality, revenue_contribution: +form.revenue_contribution, backup_supplier_id: form.backup_supplier_id ? +form.backup_supplier_id : null, parent_supplier_id: form.parent_supplier_id ? +form.parent_supplier_id : null });
      setSuccess(result);
      fetchSuppliers();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  if (success) return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card card-pad" style={{ textAlign: 'center', maxWidth: '440px', padding: '40px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{success.supplier?.status === 'pending' ? '⏳' : '✅'}</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            {success.supplier?.status === 'pending' ? 'Supplier Submitted!' : 'Supplier Added!'}
          </h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '16px' }}>
            <b>{success.supplier?.name}</b> {success.supplier?.status === 'pending' ? 'has been submitted and is pending admin approval.' : 'has been added to the graph.'}
          </p>
          {success.recommendations_triggered > 0 && (
            <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>🤖 {success.recommendations_triggered} AI recommendations triggered automatically!</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {role === 'Admin' && <button onClick={() => navigate('/admin/approvals')} className="btn btn-primary">Review Approvals</button>}
            <button onClick={() => navigate('/dashboard')} className="btn btn-outline">Go to Dashboard</button>
            <button onClick={() => { setSuccess(null); setForm({ name: '', tier: 1, lat: 0, lng: 0, region: 'China', product: 'Electronics', cost: 0.5, capacity: 0.7, quality: 0.8, has_backup: false, revenue_contribution: 0.05, backup_supplier_id: '', parent_supplier_id: '' }); }} className="btn btn-primary">Add Another</button>
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div><h1>➕ Add Supplier</h1><p>Register a new supplier to the supply chain graph</p></div>
        </div>
        <div className="page-body">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit}>
              <div className="card card-pad" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Basic Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Supplier Name</label>
                    <input type="text" className="input-field" required placeholder="e.g. Tokyo Precision" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tier Level</label>
                    <select className="input-field" value={form.tier} onChange={e => set('tier', e.target.value)}>
                      <option value={1}>Tier 1 (Direct)</option>
                      <option value={2}>Tier 2 (Indirect)</option>
                      <option value={3}>Tier 3 (Raw Materials)</option>
                    </select>
                  </div>
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>Connections & Backup</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Depends On (Auto-create Edge)</label>
                    <select className="input-field" value={form.parent_supplier_id || ''} onChange={e => set('parent_supplier_id', e.target.value)}>
                      <option value="">None (Independent)</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>T{s.tier} — {s.name}</option>)}
                    </select>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Creates a default dependency edge to this supplier.</p>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Backup / Alternative Supplier</label>
                    <select className="input-field" value={form.backup_supplier_id || ''} onChange={e => { set('backup_supplier_id', e.target.value); set('has_backup', !!e.target.value); }}>
                      <option value="">None</option>
                      {suppliers.filter(s => s.tier === +form.tier).map(s => <option key={s.id} value={s.id}>{s.name} (Risk {Math.round(s.risk_score * 100)}%)</option>)}
                    </select>
                  </div>
                </div>

                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>Location & Product</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Region/Country</label>
                    <input type="text" className="input-field" required value={form.region} onChange={e => set('region', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Product/Component Category</label>
                    <input type="text" className="input-field" required value={form.product} onChange={e => set('product', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Latitude</label>
                    <input type="number" step="any" required className="input-field" value={form.lat} onChange={e => set('lat', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Longitude</label>
                    <input type="number" step="any" required className="input-field" value={form.lng} onChange={e => set('lng', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="card card-pad" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Operational Parameters</h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>These metrics are used by the recommendation engine and risk propagation model.</p>
                {[
                  { k: 'cost', l: 'Cost Competitiveness', min: 0.1, max: 1.0, desc: 'Lower is better. 0.5 = industry average.' },
                  { k: 'capacity', l: 'Capacity & Throughput', min: 0.1, max: 1.0, desc: 'Higher is better. 0.7 = 70% utilization safe.' },
                  { k: 'quality', l: 'Quality Rating', min: 0.1, max: 1.0, desc: 'Higher is better. Defect rate proxy.' },
                  { k: 'revenue_contribution', l: 'Revenue Contribution', min: 0.01, max: 1.0, desc: 'Fraction of total revenue dependent on this node.' },
                ].map(({ k, l, min, max, desc }) => (
                  <div key={k} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="input-label" style={{ marginBottom: 0 }}>{l}</label>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{Math.round(form[k] * 100)}%</span>
                    </div>
                    <input type="range" min={min} max={max} step="0.01" value={form[k]} onChange={e => set(k, e.target.value)}
                      style={{ width: '100%', accentColor: '#0f172a' }} />
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{desc}</p>
                  </div>
                ))}
              </div>

              {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? '⏳ Submitting...' : '✓ Submit Supplier'}
                </button>
                <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
