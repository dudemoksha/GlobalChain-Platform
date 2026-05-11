import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', role: 'Buyer', company: '' });
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role, company: form.company })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Signup failed');
      setStatus('success');
      setMessage('Your request has been submitted. An administrator will review and approve your account shortly.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 'var(--border-radius-md)',
    background: '#ffffff', border: '1px solid var(--panel-border)', color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)', outline: 'none', fontSize: '14px', marginBottom: '16px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--bg-color)' }}>
      <motion.div className="glass-card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: '#fff', fontFamily: 'var(--font-display)' }}>Request Access</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Accounts require admin approval before activation.</p>
        </div>

        {status === 'success' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h3 style={{ marginBottom: '12px', color: '#fff' }}>Request Submitted</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>{message}</p>
            <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ width: '100%', justifyContent: 'center' }}>Back to Sign In</button>
          </motion.div>
        ) : (
          <form onSubmit={handleSignup}>
            {status === 'error' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
                {message}
              </div>
            )}

            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Role</label>
            <select name="role" value={form.role} onChange={handleChange} className="input-field" style={{ cursor: 'pointer', marginBottom: '16px' }}>
              <option value="Buyer">Buyer (Company)</option>
              <option value="Supplier">Supplier</option>
            </select>

            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Company Name</label>
            <input name="company" type="text" placeholder="Acme Corp" value={form.company} onChange={handleChange} required className="input-field" style={{ marginBottom: '16px' }} />

            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Email Address</label>
            <input name="email" type="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required className="input-field" style={{ marginBottom: '16px' }} />

            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Password</label>
            <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required className="input-field" style={{ marginBottom: '16px' }} />

            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Confirm Password</label>
            <input name="confirm" type="password" placeholder="••••••••" value={form.confirm} onChange={handleChange} required className="input-field" style={{ marginBottom: '24px' }} />

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have access? <Link to="/login" style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
