import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  AlertTriangle, 
  Cpu, 
  BarChart3, 
  PlusSquare, 
  Package, 
  Link2, 
  RefreshCw, 
  Settings, 
  LogOut,
  ShieldCheck,
  ClipboardList,
  Factory
} from 'lucide-react';

const NAV = {
  Buyer: [
    { section: 'Intelligence' },
    { to: '/dashboard',       icon: Globe, label: 'Globe & Dashboard' },
    { to: '/alerts',          icon: AlertTriangle, label: 'Alerts',      badge: true },
    { to: '/recommendations', icon: Cpu, label: 'Recommendations' },
    { section: 'Operations' },
    { to: '/simulation',      icon: RefreshCw, label: 'Simulation' },
    { to: '/analytics',       icon: BarChart3, label: 'Analytics' },
    { section: 'Supply Chain' },
    { to: '/suppliers/add',   icon: PlusSquare, label: 'Add Supplier' },
    { to: '/suppliers/upload', icon: Package, label: 'Bulk Upload' },
    { to: '/edges',           icon: Link2, label: 'Edge Manager' },
    { to: '/backup',          icon: ShieldCheck, label: 'Backup Suppliers' },
    { section: 'Account' },
    { to: '/settings',        icon: Settings, label: 'Settings' },
  ],
  Admin: [
    { section: 'Administration' },
    { to: '/admin',           icon: ShieldCheck, label: 'Admin Panel' },
    { to: '/admin/approvals', icon: ClipboardList, label: 'Supplier Approvals' },
    { to: '/dashboard',       icon: Globe, label: 'Globe' },
    { to: '/alerts',          icon: AlertTriangle, label: 'Alerts', badge: true },
    { section: 'Operations' },
    { to: '/simulation',      icon: RefreshCw, label: 'Simulation' },
    { to: '/analytics',       icon: BarChart3, label: 'Analytics' },
    { section: 'Supply Chain' },
    { to: '/suppliers/add',   icon: PlusSquare, label: 'Add Supplier' },
    { to: '/suppliers/upload', icon: Package, label: 'Bulk Upload' },
    { to: '/edges',           icon: Link2, label: 'Edge Manager' },
    { to: '/backup',          icon: ShieldCheck, label: 'Backup Suppliers' },
    { section: 'Account' },
    { to: '/settings',        icon: Settings, label: 'Settings' },
  ],
  Supplier: [
    { section: 'My Workspace' },
    { to: '/supplier',        icon: Factory, label: 'My Dashboard' },
    { to: '/suppliers/add',   icon: PlusSquare, label: 'Add Supplier' },
    { to: '/suppliers/upload', icon: Package, label: 'Bulk Upload' },
    { to: '/alerts',          icon: AlertTriangle, label: 'Alerts', badge: true },
    { section: 'Account' },
    { to: '/settings',        icon: Settings, label: 'Settings' },
  ],
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { role, logout, alerts } = useStore();
  const unread = (alerts || []).filter(a => !a.acknowledged && a.severity === 'Critical').length;
  const nav = NAV[role] || NAV.Buyer;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="sidebar"
    >
      <div className="sidebar-logo">
        <div style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Globe size={20} color="#fff" />
        </div>
        <span>GlobalChain</span>
      </div>

      <nav className="sidebar-nav">
        {nav.map((item, i) =>
          item.section ? (
            <motion.div 
              key={`sec-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="nav-section-label"
            >
              {item.section}
            </motion.div>
          ) : (
            <NavLink
              key={`nav-${i}`} to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="icon">
                <item.icon size={18} strokeWidth={2} />
              </span>
              <span>{item.label}</span>
              {item.badge && unread > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="badge-dot" 
                  style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)' }}
                />
              )}
            </NavLink>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <span className="icon"><LogOut size={18} /></span>
          <span>Sign Out</span>
        </button>
      </div>
    </motion.aside>
  );
}

