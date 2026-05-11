import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { api } from '../api';

export default function BulkUploadPage() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) return;
    setFile(f); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 11).map(line => {
        const vals = line.split(',').map(v => v.trim());
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
      });
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.bulkUpload(file);
      setResult(res);
    } catch (e) { setResult({ error: e.message }); }
    setLoading(false);
  };

  const downloadTemplate = () => {
    const headers = 'name,tier,lat,lng,region,product,cost,capacity,quality,has_backup,backup_supplier_name,parent_supplier_id,revenue_contribution\n';
    const sample = 'Example Corp,1,35.67,139.65,Japan,Electronics,0.5,0.8,0.85,true,Backup-A,,0.22\n';
    const csvContent = headers + sample;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'globalchain_supplier_template.csv'; a.click();
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1 style={{ color: '#fff' }}>📦 Bulk Upload Suppliers</h1>
            <p>Initialize your private multi-tier supply chain via CSV.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => {
              navigator.clipboard.writeText('name,tier,lat,lng,region,product,cost,capacity,quality,has_backup,backup_supplier_name,parent_supplier_id,revenue_contribution');
              alert('Headers copied to clipboard!');
            }} className="btn btn-outline" style={{ fontSize: '12px' }}>📋 Copy Headers</button>
            <button onClick={downloadTemplate} className="btn btn-primary" style={{ padding: '10px 20px' }}>📥 Download Template</button>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', fontSize: '13px' }}>
          <p style={{ fontWeight: 700, color: '#fff', marginBottom: '8px' }}>💡 How to connect your private supply chain:</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            <li><b>parent_supplier_id</b>: Link a sub-supplier to its customer. (e.g. Tier 2 → Tier 1).</li>
            <li><b>backup_supplier_name</b>: Provide the name of a pre-approved backup to enable automatic "Alternative Way" suggestions during simulations.</li>
            <li><b>tier</b>: Set 1 for direct suppliers, 2 for sub-suppliers. Main Company data is <b>auto-approved</b>.</li>
          </ul>
        </div>
        <div className="page-body">
          <div style={{ maxWidth: '800px' }}>
            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#0f172a' : '#cbd5e1'}`, borderRadius: '16px',
                padding: '50px', textAlign: 'center', cursor: 'pointer',
                background: dragOver ? '#f1f5f9' : '#fafafa', transition: 'all 0.2s', marginBottom: '20px',
              }}>
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={e => handleFile(e.target.files[0])} />
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{file ? '📄' : '☁️'}</div>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px', color: '#0f172a' }}>
                {file ? file.name : 'Drop CSV file here or click to browse'}
              </p>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                {file ? `${preview.length} rows previewed` : 'Required columns: name, tier, lat, lng, region, product'}
              </p>
            </div>

            {/* Preview Table */}
            {preview.length > 0 && (
              <div className="card" style={{ marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700 }}>Preview (first {preview.length} rows)</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {Object.keys(preview[0]).map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {file && !result && (
              <button onClick={upload} disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? '⏳ Uploading...' : `📤 Upload ${preview.length}+ Suppliers`}
              </button>
            )}

            {/* Result */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-pad" style={{ textAlign: 'center' }}>
                {result.error ? (
                  <><div style={{ fontSize: '3rem', marginBottom: '8px' }}>❌</div><p style={{ color: '#b91c1c' }}>{result.error}</p></>
                ) : (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>✅</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{result.created} Suppliers Uploaded</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                      {localStorage.getItem('role') === 'Buyer' || localStorage.getItem('role') === 'Admin'
                        ? 'Your supply chain data has been auto-approved and is now live on the globe.'
                        : 'Your supply chain data has been submitted and is awaiting admin approval.'}
                    </p>
                    {result.errors?.length > 0 && (
                      <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>⚠️ {result.errors.length} rows had errors</p>
                      </div>
                    )}
                    <button onClick={() => { setFile(null); setPreview([]); setResult(null); }} className="btn btn-outline">Upload Another</button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
