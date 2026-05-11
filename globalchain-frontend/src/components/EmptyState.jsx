import React from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmptyState({ title, message, actionText, actionPath, icon: Icon = Database, style = {} }) {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ 
        padding: '32px 24px', 
        textAlign: 'center', 
        maxWidth: '500px', 
        margin: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        ...style
      }}
    >
      <div style={{ 
        width: '80px', 
        height: '80px', 
        background: 'rgba(59, 130, 246, 0.1)', 
        borderRadius: '24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--accent)',
        marginBottom: '8px'
      }}>
        <Icon size={40} />
      </div>

      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>{title}</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>{message}</p>
      </div>

      {actionText && actionPath && (
        <button 
          onClick={() => navigate(actionPath)}
          className="btn btn-primary"
          style={{ padding: '14px 28px', borderRadius: '12px' }}
        >
          {actionText} <ArrowRight size={18} />
        </button>
      )}
    </motion.div>
  );
}
