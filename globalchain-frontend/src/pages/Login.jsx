import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.access_token);
      
      // Fetch user to confirm role/details
      const user = await api.me();
      localStorage.setItem('role', user.role);
      
      if (user.role === 'Admin') navigate('/admin');
      else if (user.role === 'Supplier') navigate('/supplier');
      else navigate('/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 'var(--border-radius-md)',
    background: '#ffffff', border: '1px solid var(--panel-border)', color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)', outline: 'none', fontSize: '14px', marginBottom: '14px',
    boxSizing: 'border-box', display: 'block'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)', padding: '20px' }}>
      <motion.div 
        className="glass-card"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ width: '100%', maxWidth: '400px', padding: '40px' }}
      >
        <Link to="/" style={{ display: 'block', textAlign: 'center', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.04em', color: '#fff', textDecoration: 'none', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
          GlobalChain
        </Link>
        <h2 style={{ marginBottom: '8px', textAlign: 'center', fontSize: '18px', fontWeight: 600, color: '#fff' }}>Welcome back</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '32px' }}>Sign in to your account</p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Email</label>
          <input 
            type="email" 
            placeholder="you@company.com" 
            className="input-field"
            style={{ marginBottom: '16px' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            className="input-field"
            style={{ marginBottom: '24px' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Don't have access? <Link to="/signup" style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Request Access</Link>
        </p>
      </motion.div>
    </div>
  );
}
