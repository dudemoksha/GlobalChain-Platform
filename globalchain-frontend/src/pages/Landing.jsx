import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const stats = [
  { value: '2.4B+', label: 'Supply Events Tracked' },
  { value: '180+', label: 'Countries Monitored' },
  { value: '99.97%', label: 'Uptime SLA' },
  { value: '<2s', label: 'Real-time Latency' }
];

const features = [
  {
    icon: '🌐',
    title: 'Live 3D Intelligence',
    desc: 'Interactive globe with real-time disaster, conflict and traffic overlays from authoritative UN, USGS and aviation data sources.'
  },
  {
    icon: '⚡',
    title: 'Risk Detection Engine',
    desc: 'Proactively surfaces geopolitical disruptions, natural disasters and shipping bottlenecks across your entire vendor network.'
  },
  {
    icon: '🔐',
    title: 'Role-Based Access Control',
    desc: 'Separate secure environments for Buyers, Suppliers and System Administrators with admin-approval onboarding.'
  },
  {
    icon: '📊',
    title: 'DataCo Intelligence Layer',
    desc: 'Powered by the DataCo Smart Supply Chain dataset, providing deep historical context to augment real-time signals.'
  }
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(248,250,252,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--panel-border)' }}>
        <span style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '-0.03em' }}>GlobalChain</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid var(--panel-border)', padding: '8px 20px', borderRadius: '30px', cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font-family)', fontSize: '14px', color: 'var(--text-primary)' }}>
            Sign In
          </button>
          <button onClick={() => navigate('/signup')} className="button-primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
            Request Access
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '120px 48px 80px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: 'inline-block', background: '#f1f5f9', border: '1px solid var(--panel-border)', borderRadius: '30px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '28px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Fortune 500 Supply Chain Intelligence
          </div>
          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '24px', maxWidth: '800px' }}>
            See every risk.<br />Before it sees you.
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '560px', lineHeight: 1.7, marginBottom: '40px', margin: '0 auto 40px' }}>
            Real-time supply chain intelligence powered by live satellite, geopolitical conflict, disaster and aviation data — visualized on an interactive 3D globe.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/signup')} className="button-primary" style={{ padding: '16px 36px', fontSize: '16px' }}>
              Request Access
            </button>
            <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid var(--panel-border)', padding: '16px 36px', fontSize: '16px', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font-family)', color: 'var(--text-primary)' }}>
              Sign In →
            </button>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section style={{ padding: '60px 48px', borderTop: '1px solid var(--panel-border)', borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', maxWidth: '960px', margin: '0 auto' }}>
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '100px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '16px' }}>Built for enterprise-grade decisions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Every layer of GlobalChain is designed with Fortune 500 procurement teams in mind.</p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {features.map((f, i) => (
            <motion.div key={i} className="glass-panel" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '14px' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 48px', textAlign: 'center', borderTop: '1px solid var(--panel-border)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '16px' }}>Ready to secure your supply chain?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '36px', fontSize: '1.1rem' }}>Request access as a Buyer or Supplier. Our admin team will review and approve within 24hrs.</p>
          <button onClick={() => navigate('/signup')} className="button-primary" style={{ padding: '16px 40px', fontSize: '16px' }}>
            Get Started Free
          </button>
        </motion.div>
      </section>

      <footer style={{ padding: '32px 48px', borderTop: '1px solid var(--panel-border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        © 2026 GlobalChain Inc. — Supply Chain Intelligence Platform
      </footer>
    </div>
  );
}
