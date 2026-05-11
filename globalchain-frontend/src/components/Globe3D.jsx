import { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { useStore, useModeStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Shield, Zap, Info, X } from 'lucide-react';
import EmptyState from './EmptyState';

const RISK_HIGH = '#ef4444';
const RISK_MED  = '#f59e0b';
const RISK_SAFE = '#10b981';
const LINE_NORMAL = 'rgba(255, 255, 255, 0.4)';
const LINE_MED = 'rgba(245, 158, 11, 0.6)';
const LINE_HIGH = 'rgba(239, 68, 68, 0.8)';

function riskColor(score) {
  if (score >= 0.7) return RISK_HIGH;
  if (score >= 0.4) return RISK_MED;
  return RISK_SAFE;
}

function lineColor(riskFrom, riskTo) {
  const maxRisk = Math.max(riskFrom || 0, riskTo || 0);
  if (maxRisk >= 0.7) return LINE_HIGH;
  if (maxRisk >= 0.4) return LINE_MED;
  return LINE_NORMAL;
}

const TILE_FNS = {
  geographical: (x, y, l) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${l}/${y}/${x}`,
  satellite:    (x, y, l) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`,
};

// The Main Company HQ - All Tier 1 nodes connect here
const HQ_NODE = { id: 'hq', name: 'GlobalChain HQ', lat: 40.7128, lng: -74.0060, tier: 0, _isHQ: true };

export default function Globe3D({ onNodeClick, onArcClick, simulationChain = [], simRiskMap = {}, centerEarth = false }) {
  const containerRef = useRef(null);
  const globeRef = useRef();
  const prevModeRef = useRef(null);
  const { currentMode, liveData } = useModeStore();
  const { suppliers, graphData } = useStore();
  const [clickedInfo, setClickedInfo] = useState(null);
  const [altitude, setAltitude] = useState(2.0);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const onResize = () => {
      if (containerRef.current) {
        setDimensions({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      const initLat = centerEarth ? 20 : 20;
      const initLng = centerEarth ? 0 : 20;
      globeRef.current.pointOfView({ lat: initLat, lng: initLng, altitude: 2 }, 800);
    }
  }, [centerEarth]);

  const supplierNodes = useCallback(() => {
    // Only show Tier 1 nodes on the globe (Multi-Tier Discovery)
    const tier1Suppliers = suppliers.filter(s => s.tier === 1);
    
    // If no Tier 1 suppliers exist, don't even show the HQ (Empty Earth requirement)
    if (tier1Suppliers.length === 0) return [];

    const nodes = tier1Suppliers.map(s => {
      // Propagation logic: If any hidden children (T2/T3) are in simulationChain, 
      // this Tier 1 node should reflect the risk/effect.
      const hasImpactedChild = simulationChain.some(id => {
        const sub = suppliers.find(x => x.id === id);
        return sub && (sub.tier === 2 || sub.tier === 3); 
      });

      const simRisk = simRiskMap[String(s.id)];
      const isInChain = simulationChain.includes(s.id) || hasImpactedChild;
      const risk = simRisk !== undefined ? simRisk : s.risk_score;
      
      return {
        ...s,
        risk_score: risk,
        _inChain: isInChain,
        _color: riskColor(isInChain ? 0.9 : risk), 
        size: 0.85,
      };
    });

    nodes.push({
      ...HQ_NODE,
      _color: '#3b82f6',
      size: 1.2,
      risk_score: 0,
      _inChain: false
    });

    return nodes;
  }, [suppliers, simulationChain, simRiskMap]);

  const pointsData = useCallback(() => {
    if (currentMode === 'disaster') {
      return (liveData.disasters || []).map((d, i) => ({
        id: `d${i}`, lat: d.lat, lng: d.lng, name: d.title,
        _color: RISK_HIGH, size: 0.8, risk_score: 0.9,
      }));
    }
    return supplierNodes();
  }, [currentMode, liveData, supplierNodes]);

  const arcsData = useCallback(() => {
    const tier1Suppliers = suppliers.filter(s => s.tier === 1);
    if (tier1Suppliers.length === 0) return [];

    const arcs = [];

    // All Tier 1 nodes connect EXCLUSIVELY to the HQ on the globe
    tier1Suppliers.forEach(s => {
      // Check if this Tier 1 node or any of its hidden children are impacted
      const hasImpactedChild = simulationChain.some(id => {
        const sub = suppliers.find(x => x.id === id);
        return sub && (sub.tier === 2 || sub.tier === 3);
      });

      const isImpacted = simulationChain.includes(s.id) || hasImpactedChild;
      const risk = simRiskMap[String(s.id)] ?? s.risk_score ?? 0;
      const col = isImpacted ? RISK_HIGH : lineColor(risk, 0);

      arcs.push({
        startLat: s.lat, startLng: s.lng,
        endLat: HQ_NODE.lat, endLng: HQ_NODE.lng,
        color: [col, isImpacted ? RISK_HIGH : '#3b82f6'],
        inChain: isImpacted,
        fromName: s.name, toName: HQ_NODE.name,
        weight: isImpacted ? 2.5 : 1.5,
        arcAlt: 0.3 + (Math.random() * 0.1),
      });
    });

    return arcs;
  }, [currentMode, suppliers, simulationChain, simRiskMap]);

  const ringsData = useCallback(() => {
    if (suppliers.length > 0) {
      // HQ always pulses
      const rings = [{
        lat: HQ_NODE.lat, lng: HQ_NODE.lng,
        maxR: 5, speed: 2, repeat: 1500,
        color: '#3b82f6'
      }];
      
      // Impacted nodes pulse red
      if (simulationChain.length > 0) {
        suppliers
          .filter(s => simulationChain.includes(s.id))
          .forEach(s => {
            rings.push({
              lat: s.lat, lng: s.lng,
              maxR: 3, speed: 4, repeat: 800,
              color: RISK_HIGH
            });
          });
      }
      return rings;
    }
    return [];
  }, [suppliers, simulationChain]);

  const getGlobeTexture = () => {
    switch (currentMode) {
      case 'satellite': return '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
      case 'geographical': return '//unpkg.com/three-globe/example/img/earth-night.jpg';
      case 'disaster': return '//unpkg.com/three-globe/example/img/earth-dark.jpg';
      default: return '//unpkg.com/three-globe/example/img/earth-night.jpg';
    }
  };

  const renderPanel = () => {
    if (!clickedInfo) return null;
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-card"
          style={{ position: 'absolute', bottom: '40px', left: '40px', padding: '24px', minWidth: '320px', zIndex: 200 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="var(--accent)" />
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {clickedInfo._isHQ ? 'Global Operations' : `Tier ${clickedInfo.tier} Supplier`}
              </p>
            </div>
            <button onClick={() => setClickedInfo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>{clickedInfo.name}</h4>
          {clickedInfo.region && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>📍 {clickedInfo.region}</p>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className={`badge badge-${clickedInfo.risk_score >= 0.7 ? 'red' : clickedInfo.risk_score >= 0.4 ? 'yellow' : 'green'}`}>
              Risk: {Math.round(clickedInfo.risk_score * 100)}%
            </span>
            {clickedInfo.has_backup && <span className="badge badge-blue">Backup Active</span>}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: '#020617' }}>
      <Globe
        ref={globeRef}
        width={dimensions.w}
        height={dimensions.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={getGlobeTexture()}
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.15}
        
        pointsData={pointsData()}
        pointLat="lat"
        pointLng="lng"
        pointColor="_color"
        pointRadius="size"
        pointAltitude={0.02}
        pointLabel={d => `
          <div class="glass-card" style="padding: 10px 14px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5)">
            <div style="font-weight: 800; color: #fff; font-size: 14px; margin-bottom: 2px">${d.name}</div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600">
              ${d._isHQ ? 'Global Operations Center' : `Tier ${d.tier} Supplier • ${d.region}`}
            </div>
          </div>
        `}
        onPointClick={d => d._isHQ ? null : setClickedInfo(d)}

        arcsData={arcsData()}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={1}
        arcDashInitialGap={() => Math.random()}
        arcDashAnimateTime={1500}
        arcStroke="weight"
        arcAltitude="arcAlt"
        arcLabel={d => `
          <div class="glass-card" style="padding: 6px 12px">
            <div style="font-size: 11px; font-weight: 700; color: #fff">${d.fromName} → ${d.toName}</div>
          </div>
        `}

        ringsData={ringsData()}
        ringLat="lat"
        ringLng="lng"
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="speed"
        ringRepeatPeriod="repeat"

        onZoom={({ altitude: a }) => setAltitude(a)}
      />

      {suppliers.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <EmptyState 
            title="Initialize Supply Visibility"
            message="Your private workspace is ready. Upload your supplier data to visualize nodes, connections, and live risk propagation on the 3D globe."
            actionText="Bulk Upload Data"
            actionPath="/suppliers/upload"
            icon={Database}
          />
        </div>
      )}

      {renderPanel()}
      
      <div className="globe-overlay" style={{ pointerEvents: 'none', bottom: '40px', right: '40px', left: 'auto' }}>
        <div className="glass-card" style={{ pointerEvents: 'auto', padding: '12px 20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="live-dot" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>System Live</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 700, color: '#fff' }}>{suppliers.length}</span> Nodes Tracked
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRight({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
