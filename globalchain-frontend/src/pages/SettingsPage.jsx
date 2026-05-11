import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

export default function SettingsPage() {
  const { user } = useStore();
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div><h1>⚙️ Settings</h1><p>Account, notifications, and system configuration</p></div>
        </div>
        <div className="page-body" style={{ maxWidth: '600px' }}>
          <div className="card card-pad" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Profile</h3>
            {[
              { l: 'Email', v: user?.email || localStorage.getItem('token') ? '(logged in)' : '—' },
              { l: 'Role', v: user?.role || localStorage.getItem('role') || '—' },
              { l: 'Company', v: user?.company || 'GlobalTech HQ' },
              { l: 'Status', v: 'Active' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{f.l}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{f.v}</span>
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>System Configuration</h3>
            {[
              { l: 'Risk Update Interval', v: 'Every 5 minutes' },
              { l: 'Alert Threshold (Critical)', v: '≥ 80% risk' },
              { l: 'Alert Threshold (Moderate)', v: '≥ 50% risk' },
              { l: 'Signal Radius', v: '500 km' },
              { l: 'Recommendation Threshold', v: '10% score improvement' },
              { l: 'WebSocket Push', v: 'Enabled' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{f.l}</span>
                <span className="badge badge-blue" style={{ fontSize: '11px' }}>{f.v}</span>
              </div>
            ))}
          </div>
          <div className="card card-pad">
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>API Connections</h3>
            {[
              { l: 'USGS Seismic API', status: '🟢 Live' },
              { l: 'Weather Signals', status: '🟡 Simulated' },
              { l: 'News / Geopolitical', status: '🟡 Simulated' },
              { l: 'OpenSky Traffic', status: '🟢 Live' },
              { l: 'Nominatim Geocoding', status: '🟢 Live' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{f.l}</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{f.status}</span>
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ marginTop: '16px', border: '1px solid #fee2e2' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#b91c1c', marginBottom: '8px' }}>Data Management</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              Wipe all your private supply chain data including suppliers, edges, and related alerts. This action is irreversible.
            </p>
            <button 
              onClick={async (e) => {
                if (window.confirm('Are you absolutely sure you want to purge your workspace? All data will be lost.')) {
                  try {
                    const btn = e.currentTarget;
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '⌛ Purging...';
                    
                    const { api } = await import('../api');
                    await api.purgeWorkspace();
                    
                    alert('Workspace successfully purged.');
                    window.location.reload();
                  } catch (err) {
                    alert('Error: ' + err.message);
                    e.currentTarget.disabled = false;
                    e.currentTarget.innerHTML = '🗑️ Purge All Workspace Data';
                  }
                }
              }}
              className="btn btn-danger" 
              style={{ width: '100%', justifyContent: 'center' }}
            >
              🗑️ Purge All Workspace Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
