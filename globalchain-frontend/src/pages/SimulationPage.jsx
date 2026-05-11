import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Globe3D from '../components/Globe3D';
import Sidebar from '../components/Sidebar';
import { useStore, useModeStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_TYPES = [
  { id: 'earthquake',  label: '🌊 Earthquake',   desc: 'Seismic event disrupting facilities' },
  { id: 'typhoon',     label: '🌀 Typhoon',       desc: 'Severe cyclonic storm system' },
  { id: 'flood',       label: '🌧 Flood',          desc: 'River / coastal flooding' },
  { id: 'port_strike', label: '🚢 Port Strike',   desc: 'Labour/logistics disruption' },
  { id: 'war',         label: '🚨 Armed Conflict', desc: 'Geopolitical conflict zone' },
  { id: 'fire',        label: '🔥 Industrial Fire','desc': 'Factory/facility fire' },
];

const KNOWN_CITIES = [
  { name: 'Shenzhen, China',       lat: 22.54, lng: 114.05 },
  { name: 'Shanghai, China',        lat: 31.22, lng: 121.47 },
  { name: 'Tokyo, Japan',           lat: 35.67, lng: 139.65 },
  { name: 'Mumbai, India',          lat: 19.07, lng: 72.87 },
  { name: 'Rotterdam, Netherlands', lat: 51.92, lng: 4.47  },
  { name: 'Singapore',              lat: 1.35,  lng: 103.81 },
  { name: 'Istanbul, Turkey',       lat: 41.00, lng: 28.97 },
  { name: 'Los Angeles, USA',       lat: 34.05, lng: -118.24},
  { name: 'Lagos, Nigeria',         lat: 6.52,  lng: 3.37  },
  { name: 'Karachi, Pakistan',      lat: 24.86, lng: 67.00 },
];

function riskColor(v) {
  if (v >= 0.7) return '#e11d48'; if (v >= 0.4) return '#f59e0b'; return '#10b981';
}

export default function SimulationPage() {
  const navigate = useNavigate();
  const { suppliers, runSimulation, simLoading, simResult, simHistory, fetchSimHistory, recommendations } = useStore();
  const { setMode } = useModeStore();

  const [form, setForm] = useState({ lat: 22.54, lng: 114.05, event_type: 'earthquake', severity: 0.7, label: '' });
  const [selectedLocation, setSelectedLocation] = useState('Shenzhen, China');
  const [showGlobe, setShowGlobe] = useState(true);

  const simChain = simResult?.upstream_chain || [];
  const simRiskMap = simResult?.graph_snapshot?.risk_values
    ? Object.fromEntries(Object.entries(simResult.graph_snapshot.risk_values).map(([k, v]) => [k, v]))
    : {};

  const handleLocationSelect = (e) => {
    const val = e.target.value;
    setSelectedLocation(val);
    
    // Check known cities first
    const city = KNOWN_CITIES.find(c => c.name === val);
    if (city) {
      setForm(f => ({ ...f, lat: city.lat, lng: city.lng }));
      return;
    }

    // Check suppliers
    const supplier = suppliers.find(s => s.name === val);
    if (supplier) {
      setForm(f => ({ ...f, lat: supplier.lat, lng: supplier.lng }));
    }
  };

  // Identify affected Tier 1 nodes and those visible for selection
  const tier1Only = suppliers.filter(s => s.tier === 1);
  const affectedTier1 = tier1Only.filter(s => simChain.includes(s.id) || (simRiskMap && simRiskMap[s.id] > 0.4));
  const handleRun = () => {
    runSimulation({ lat: form.lat, lng: form.lng, event_type: form.event_type, severity: form.severity, label: form.label || undefined });
    setShowGlobe(true);
    fetchSimHistory();
  };

  return (
    <div className="app-shell" style={{ background: 'var(--bg-deep)' }}>
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <div>
            <h1 style={{ color: '#fff' }}>🧪 Disruption Simulation</h1>
            <p>Assess multi-tier impact and discover alternative sourcing strategies.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowGlobe(v => !v)} className="btn btn-outline">
              {showGlobe ? '📋 Impact List' : '🌐 Globe View'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '0', flex: 1, overflow: 'hidden' }}>
          {/* Left control panel */}
          <div style={{ padding: '24px', borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'rgba(2, 6, 23, 0.5)', backdropFilter: 'blur(20px)' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>Simulation Parameters</h3>

            <div className="input-group">
              <label className="input-label">📍 Epicenter Node / City</label>
              <select className="input-field" value={selectedLocation} onChange={handleLocationSelect}>
                <optgroup label="Global Hubs">
                  {KNOWN_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </optgroup>
                <optgroup label="Visible Tier 1 Suppliers">
                  {tier1Only.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </optgroup>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Latitude</label>
                <input className="input-field" type="number" step="0.01" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: +e.target.value }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Longitude</label>
                <input className="input-field" type="number" step="0.01" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: +e.target.value }))} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">⚡ Disruption Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {EVENT_TYPES.map(et => (
                  <button key={et.id} onClick={() => setForm(f => ({ ...f, event_type: et.id }))}
                    style={{ 
                      padding: '10px', 
                      borderRadius: '10px', 
                      border: '1px solid',
                      borderColor: form.event_type === et.id ? 'var(--accent)' : 'var(--border)',
                      background: form.event_type === et.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      color: form.event_type === et.id ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: '12px', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s' 
                    }}>
                    {et.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Severity: <b style={{ color: riskColor(form.severity) }}>{Math.round(form.severity * 100)}%</b></label>
              <input type="range" min="0.1" max="1.0" step="0.05" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: +e.target.value }))}
                style={{ width: '100%', accentColor: riskColor(form.severity) }} />
            </div>

            <button onClick={handleRun} disabled={simLoading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginBottom: '24px' }}>
              {simLoading ? '⏳ Processing...' : '▶ Run Simulation'}
            </button>

            {/* Results summary */}
            <AnimatePresence>
              {simResult && !simResult.error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  {simResult.total_affected_count === 0 ? (
                    <div className="glass-card" style={{ padding: '24px', textAlign: 'center', border: '1px solid var(--green)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                      <h4 style={{ color: '#fff', marginBottom: '8px' }}>System Safe</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No multi-tier impact detected for this event.</p>
                    </div>
                  ) : (
                    <div className="glass-card" style={{ padding: '20px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Impact Analysis</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>AFFECTED</p>
                          <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--red)' }}>{simResult.total_affected_count}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>CRITICAL</p>
                          <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--red)' }}>{simResult.critical_count}</p>
                        </div>
                      </div>

                      <h5 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Decision Analytics</h5>
                      {affectedTier1.length > 0 ? affectedTier1.map((s, i) => {
                        const rec = recommendations.find(r => r.supplier_id === s.id);
                        const backup = suppliers.find(x => x.id === s.backup_supplier_id);
                        
                        // Check if impact is indirect
                        const isDirect = simChain.includes(s.id);
                        const isIndirect = !isDirect && simRiskMap[s.id] > 0.4;
                        
                        const decision = (isDirect || s.risk_score > 0.7) ? 'CHANGE' : 'CONTINUE';

                        return (
                          <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>{s.name}</p>
                                <p style={{ fontSize: '10px', color: isDirect ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
                                  {isDirect ? '🔴 DIRECT IMPACT' : '🟠 INDIRECT IMPACT (Tier 2/3 disruption)'}
                                </p>
                              </div>
                              <span style={{ 
                                padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                                background: decision === 'CHANGE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: decision === 'CHANGE' ? 'var(--red)' : 'var(--green)',
                                border: `1px solid ${decision === 'CHANGE' ? 'var(--red)' : 'var(--green)'}`
                              }}>
                                {decision} VENDOR
                              </span>
                            </div>

                            {(rec || backup) ? (
                              <div style={{ fontSize: '11px', color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '8px', border: '1px border-dashed var(--accent)' }}>
                                💡 <b>Alternative Path:</b> {decision === 'CHANGE' ? 'Switch to ' : 'Monitor and keep '} 
                                <b>{backup?.name || rec?.alternative_name}</b> {backup?.region ? `in ${backup.region}` : ''}.
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                                ⚠️ No backup supplier defined in your upload.
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                          <p style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>✅ All Tier 1 connections nominal.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Globe or list */}
          <div style={{ position: 'relative', background: '#020617' }}>
            {showGlobe ? (
              <Globe3D simulationChain={simChain} simRiskMap={simRiskMap} centerEarth={true} />
            ) : (
              <div style={{ padding: '40px', overflowY: 'auto', height: '100%', background: 'var(--bg-deep)' }}>
                <h3 style={{ color: '#fff', marginBottom: '24px' }}>Detailed Impact Chain</h3>
                {simResult?.impacts?.map((imp, i) => (
                  <div key={i} className="glass-card" style={{ padding: '20px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>{imp.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Risk Index {Math.round(imp.risk_score * 100)}% · Propagation Delay {imp.time_days} days
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '14px', color: 'var(--red)', fontWeight: 800 }}>CRITICAL</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
