import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';

const TABS = ['Pending Users', 'All Users', 'Vendors', 'System'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Pending Users');
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAdminUsers(),
      api.getGlobeData(),
      api.getLiveStatus(),
    ]).then(([usersData, vendorData, live]) => {
      setUsers(usersData.users || []);
      setVendors(vendorData.suppliers || []); // Note: Backend returns {suppliers: [...]}
      setLiveStats(live);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const approveUser = async (userId) => {
    await api.approveUser(userId);
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'Approved' } : u));
  };

  const rejectUser = async (userId) => {
    await api.rejectUser(userId);
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'Rejected' } : u));
  };

  const pendingUsers = users.filter(u => u.status === 'Pending');
  const allUsers = users;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const pillStyle = (active) => ({
    padding: '8px 20px', borderRadius: '30px', border: 'none', cursor: 'pointer',
    fontWeight: 500, fontSize: '13px', fontFamily: 'var(--font-family)',
    background: active ? 'var(--text-primary)' : 'transparent',
    color: active ? '#ffffff' : 'var(--text-secondary)', transition: 'all 0.2s ease'
  });

  const statusBadge = (status) => {
    const colors = { Approved: '#0f766e', Pending: '#d97706', Rejected: '#e11d48' };
    return (
      <span style={{ background: `${colors[status]}20`, color: colors[status], padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header style={{ padding: '20px 40px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(248,250,252,0.9)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>GlobalChain</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '12px' }}>System Administration</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="button-primary" onClick={() => navigate('/suppliers/upload')} style={{ padding: '8px 20px', fontSize: '13px', background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0' }}>📦 Bulk Upload</button>
          <button className="button-primary" onClick={handleLogout} style={{ padding: '8px 20px', fontSize: '13px' }}>Logout</button>
        </div>
      </header>

      <div style={{ padding: '40px' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
          {[
            { label: 'Pending Approvals', value: loading ? '...' : pendingUsers.length, color: 'var(--risk-medium)' },
            { label: 'Active Users', value: loading ? '...' : users.filter(u => u.status === 'Approved').length, color: 'var(--risk-safe)' },
            { label: 'Live Disasters', value: loading ? '...' : liveStats?.disasters?.length ?? 0, color: 'var(--risk-high)' },
            { label: 'Active Conflicts', value: loading ? '...' : liveStats?.conflicts?.length ?? 0, color: 'var(--risk-high)' },
          ].map((s, i) => (
            <motion.div key={i} className="glass-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{s.label}</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 700, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '40px', border: '1px solid var(--panel-border)', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={pillStyle(activeTab === tab)}>{tab}</button>
          ))}
        </div>

        {/* Pending Users Tab */}
        {activeTab === 'Pending Users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> :
              pendingUsers.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                  <p style={{ color: 'var(--text-secondary)' }}>No pending approvals</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingUsers.map(user => (
                    <motion.div key={user.id} className="glass-panel" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: '4px' }}>{user.email}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.role} · Requested access</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => approveUser(user.id)} style={{ padding: '8px 20px', borderRadius: '30px', border: 'none', cursor: 'pointer', background: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-family)' }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => rejectUser(user.id)} style={{ padding: '8px 20px', borderRadius: '30px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#b91c1c', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-family)' }}>
                          ✕ Reject
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
          </motion.div>
        )}

        {/* All Users Tab */}
        {activeTab === 'All Users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)', background: '#f8fafc' }}>
                    {['Email', 'Role', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((user, i) => (
                    <tr key={user.id} style={{ borderBottom: i < allUsers.length - 1 ? '1px solid var(--panel-border)' : 'none' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 500 }}>{user.email}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{user.role}</td>
                      <td style={{ padding: '14px 20px' }}>{statusBadge(user.status)}</td>
                      <td style={{ padding: '14px 20px' }}>
                        {user.status === 'Pending' && (
                          <button onClick={() => approveUser(user.id)} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: '12px', fontFamily: 'var(--font-family)' }}>Approve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Vendors Tab */}
        {activeTab === 'Vendors' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {vendors.map((v, i) => {
                const riskLevel = v.risk_score >= 0.7 ? 'High' : v.risk_score >= 0.4 ? 'Medium' : 'Safe';
                const colors = { High: ['#fee2e2', '#b91c1c'], Medium: ['#fef3c7', '#92400e'], Safe: ['#dcfce7', '#15803d'] };
                const [bg, fg] = colors[riskLevel];
                
                return (
                  <motion.div key={v.id} className="glass-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>{v.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>📍 {v.lat?.toFixed(2)}, {v.lng?.toFixed(2)}</p>
                    <span style={{ background: bg, color: fg, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      {riskLevel} Risk
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* System Tab */}
        {activeTab === 'System' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="glass-panel">
              <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Live Disaster Events</h3>
              {liveStats?.disasters?.map((d, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < liveStats.disasters.length - 1 ? '1px solid var(--panel-border)' : 'none' }}>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>{d.title}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>📍 {d.lat?.toFixed(2)}, {d.lng?.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="glass-panel">
              <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Active Conflict Reports</h3>
              {liveStats?.conflicts?.map((c, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < liveStats.conflicts.length - 1 ? '1px solid var(--panel-border)' : 'none' }}>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>{c.title}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>🚩 {c.type}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
