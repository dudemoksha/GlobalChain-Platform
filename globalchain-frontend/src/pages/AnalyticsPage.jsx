import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import EmptyState from '../components/EmptyState';
import { BarChart, PieChart, TrendingUp, AlertTriangle, ShieldCheck, DollarSign, Activity, Upload, Database } from 'lucide-react';
import { useStore } from '../store';

function riskColor(v) { if (v >= 0.7) return '#e11d48'; if (v >= 0.4) return '#f59e0b'; return '#10b981'; }

function MiniBar({ value, color }) {
  return (
    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '4px' }}>
      <div style={{ width: `${value * 100}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { suppliers, fetchSuppliers, alerts, fetchAlerts, recommendations } = useStore();
  const [tab, setTab] = useState('intelligence');

  useEffect(() => { fetchSuppliers(); fetchAlerts(); }, []);

  const highRiskCount = suppliers.filter(s => s.risk_score >= 0.7).length;
  const avgRisk = suppliers.length ? (suppliers.reduce((a, s) => a + s.risk_score, 0) / suppliers.length) : 0;
  
  // Industrial Analytics
  const totalRev = suppliers.reduce((a, s) => a + (s.revenue_contribution || 0.05), 0) * 1000; // Mock $1B scale
  const revAtRisk = suppliers.filter(s => s.risk_score >= 0.6).reduce((a, s) => a + (s.revenue_contribution || 0.05), 0) * 1000;
  const networkDensity = suppliers.length > 0 ? (suppliers.filter(s => s.has_backup).length / suppliers.length) : 0;
  const recoverySavings = (recommendations || []).length * 4.2; // $4.2M per rec

  return (
    <div className="app-shell" style={{ background: '#020617', color: '#fff' }}>
      <Sidebar />
      <div className="main-content">
        <div className="page-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Activity size={24} color="var(--accent)" />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Supply Intelligence Hub</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Advanced network analytics, financial exposure, and resilience modeling.</p>
        </div>

        <div className="page-body" style={{ padding: '24px 0' }}>
          {suppliers.length === 0 ? (
            <div style={{ padding: '40px 0' }}>
              <EmptyState 
                title="Intelligence Hub Offline"
                message="Analytics and financial exposure modeling require a populated supply chain network. Upload your data to activate AI insights."
                actionText="Go to Bulk Upload"
                actionPath="/suppliers/upload"
                icon={Activity}
              />
            </div>
          ) : (
            <>
              {/* KPI Row - Industrial Standard */}
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
            {[
              { l: 'Network Resilience', v: `${Math.round(networkDensity * 100)}%`, c: '#3b82f6', icon: ShieldCheck },
              { l: 'Revenue at Risk', v: `$${revAtRisk.toFixed(1)}M`, c: '#e11d48', icon: AlertTriangle },
              { l: 'Mitigated Value', v: `$${recoverySavings.toFixed(1)}M`, c: '#10b981', icon: DollarSign },
              { l: 'Average Node Risk', v: `${Math.round(avgRisk * 100)}%`, c: riskColor(avgRisk), icon: TrendingUp },
            ].map((s, i) => (
              <motion.div key={i} className="glass-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</span>
                  <s.icon size={16} color={s.c} />
                </div>
                <p style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: 0 }}>{s.v}</p>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '12px' }}>
                  <div style={{ width: s.v.includes('%') ? s.v : '60%', height: '100%', background: s.c, borderRadius: '2px' }} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Sub Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
            {[['intelligence', 'Network Intel'], ['exposure', 'Financial Exposure'], ['tier', 'Tier Analysis']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} 
                style={{ 
                  padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                  background: tab === id ? 'var(--accent)' : 'transparent', color: tab === id ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>{label}</button>
            ))}
          </div>

          {tab === 'intelligence' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="var(--green)" /> Risk Distribution by Region
                </h3>
                <div className="table-wrap">
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Operational Region</th>
                        <th>Node Count</th>
                        <th>Mean Risk</th>
                        <th>Resilience Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(suppliers.map(s => s.region))).map((r, i) => {
                        const rs = suppliers.filter(s => s.region === r);
                        const mean = rs.length ? rs.reduce((a, s) => a + s.risk_score, 0) / rs.length : 0;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '16px 12px', fontWeight: 700 }}>{r || 'Global'}</td>
                            <td>{rs.length}</td>
                            <td style={{ color: riskColor(mean), fontWeight: 800 }}>{Math.round(mean * 100)}%</td>
                            <td style={{ width: '180px' }}><MiniBar value={mean} color={riskColor(mean)} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Critical Path Vulnerabilities</h3>
                {suppliers.filter(s => s.risk_score >= 0.7).slice(0, 6).map((s, i) => (
                  <div key={i} style={{ padding: '14px', background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(229, 68, 68, 0.1)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{s.name}</span>
                      <span style={{ color: 'var(--red)', fontSize: '11px', fontWeight: 800 }}>HIGH EXPOSURE</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Impact: {s.product} chain in {s.region}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'exposure' && (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ width: '80px', height: '80px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <DollarSign size={40} color="var(--accent)" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Revenue Impact Modeling</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '32px' }}>
                  Our AI models estimate that a major disruption in your Tier 2 network would result in a 
                  <span style={{ color: 'var(--red)', fontWeight: 800 }}> {Math.round(revAtRisk / (totalRev || 1) * 100)}% </span> 
                  global revenue drop. Implementing all recommendations would secure approximately 
                  <span style={{ color: 'var(--green)', fontWeight: 800 }}> ${recoverySavings.toFixed(1)}M </span> in quarterly EBITDA.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PROJECTED LOSS (UNMITIGATED)</p>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--red)' }}>-${revAtRisk.toFixed(1)}M</p>
                  </div>
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PROJECTED LOSS (MITIGATED)</p>
                    <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--green)' }}>-${(revAtRisk - recoverySavings).toFixed(1)}M</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'tier' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {[1, 2, 3].map(t => {
                const ts = suppliers.filter(s => s.tier === t);
                const avg = ts.length ? ts.reduce((a, s) => a + s.risk_score, 0) / ts.length : 0;
                return (
                  <div key={t} className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '20px' }}>TIER {t} ANALYSIS</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '32px', fontWeight: 900 }}>{ts.length}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nodes</span>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>Vulnerability Index</span>
                        <span style={{ fontWeight: 800, color: riskColor(avg) }}>{Math.round(avg * 100)}%</span>
                      </div>
                      <MiniBar value={avg} color={riskColor(avg)} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                      {t === 1 ? 'Primary strategic partners with direct financial impact.' : 
                       t === 2 ? 'Hidden tier dependencies with high propagation risk.' :
                       'Raw material nodes requiring extreme visibility monitoring.'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
