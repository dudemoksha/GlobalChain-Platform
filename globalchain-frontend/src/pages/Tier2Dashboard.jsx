import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

export default function Tier2Dashboard() {
  const { suppliers } = useStore();
  const tier3 = suppliers.filter(s => s.tier === 3);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1>🏗️ Tier 2 Supplier View</h1>
            <p>Limited visibility — your risk profile and direct upstream connections only</p>
          </div>
          <span className="badge badge-gray">TIER 2 ACCESS</span>
        </div>
        <div className="page-body" style={{ maxWidth: '600px' }}>
          <div className="card card-pad" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Your Access Level</h3>
            {[
              { l: 'View own risk score', allowed: true },
              { l: 'View Tier 3 sub-suppliers (masked)', allowed: true },
              { l: 'View Tier 1 buyer identity', allowed: false },
              { l: 'View full supply chain map', allowed: false },
              { l: 'Run simulations', allowed: false },
              { l: 'View recommendations', allowed: false },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ fontSize: '16px' }}>{item.allowed ? '✅' : '🔒'}</span>
                <span style={{ fontSize: '13px', color: item.allowed ? '#0f172a' : '#94a3b8' }}>{item.l}</span>
              </div>
            ))}
          </div>
          <div className="card card-pad">
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Tier 3 Sub-Suppliers (Masked)</h3>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>Identity hidden — region and risk level only</p>
            {tier3.slice(0, 6).map((s, i) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < Math.min(tier3.length, 6) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Supplier *** · {s.region}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>{s.product}</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: s.risk_score >= 0.7 ? '#fee2e2' : s.risk_score >= 0.4 ? '#fef3c7' : '#dcfce7', color: s.risk_score >= 0.7 ? '#b91c1c' : s.risk_score >= 0.4 ? '#92400e' : '#15803d' }}>
                  {s.risk_score >= 0.7 ? 'HIGH' : s.risk_score >= 0.4 ? 'MED' : 'LOW'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
