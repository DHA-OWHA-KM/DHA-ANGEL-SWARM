import { useState } from 'react';
import {
  Activity, ChevronDown, ChevronRight, Crosshair, Layers3, LocateFixed, Menu,
  Minus, Plane, Plus, RotateCcw, ShieldAlert, SlidersHorizontal, Target, X,
} from 'lucide-react';
import './_group.css';
import './AdaptiveControls.css';

type LayerKey = 'casualties' | 'aircraft' | 'routes' | 'threats' | 'launches';

const casualties = [[32,28,0],[36,31,0],[40,34,1],[43,38,0],[54,53,1],[58,57,0],[61,61,0],[50,65,1],[67,69,0],[73,75,0],[28,72,0],[34,78,1]];
const threats = [[39,25],[46,41],[56,48],[63,66],[77,57],[31,67]];
const layerLabels: Record<LayerKey, string> = { casualties: 'Casualties', aircraft: 'Aircraft', routes: 'Routes', threats: 'Threats', launches: 'Launch sites' };

export function AdaptiveControls() {
  const [layersOpen, setLayersOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  const [railOpen, setRailOpen] = useState(true);
  const [arm, setArm] = useState<'angel' | 'current'>('angel');
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ casualties: true, aircraft: true, routes: true, threats: true, launches: true });
  const toggle = (key: LayerKey) => setLayers((current) => ({ ...current, [key]: !current[key] }));
  const reset = () => { setZoom(1); setArm('angel'); setLayers({ casualties: true, aircraft: true, routes: true, threats: true, launches: true }); };

  return (
    <main className="adaptive-map">
      <div className="adaptive-noise" />
      <div className="adaptive-classification"><span>UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA // FOR DEMONSTRATION ONLY</span><span>JOA CORAL · PACOM</span></div>
      <header className="adaptive-header">
        <button className="adaptive-menu" onClick={() => setRailOpen((open) => !open)} aria-label="Toggle application navigation"><Menu size={16} /></button>
        <div className="adaptive-brand"><div className="adaptive-mark" /><div><strong>ANGEL SWARM</strong><small>DHA · PHYSIOLOGICAL DEADLINE BLOOD ALLOCATION</small></div></div>
        <div className="adaptive-run"><i /> <div><b>RUN 07 COMPLETE</b><span>T+180 MIN · 06:42Z</span></div></div>
        <div className="adaptive-header-actions"><div className="adaptive-chip complete"><Target size={12} /> 2 / 3 DECIDED</div><div className="adaptive-chip alert"><ShieldAlert size={12} /> FPCON BRAVO</div><button className="adaptive-btn reset" onClick={reset}><RotateCcw size={11} /> RESET</button><button className="adaptive-btn primary">ALLOCATION AUTHORITY</button></div>
      </header>
      <div className={`adaptive-body ${railOpen ? '' : 'rail-collapsed'}`}>
        <nav className="adaptive-nav" aria-label="Application navigation">
          <div className="nav-section">OPERATIONS</div>
          <button className="nav-item"><Activity size={14} /> <span>Command Overview</span></button>
          <button className="nav-item active"><Crosshair size={14} /> <span>Theater Map</span></button>
          <button className="nav-item"><Target size={14} /> <span>Live Casualties</span></button>
          <button className="nav-item"><ChevronRight size={14} /> <span>Decisions</span><em>2/3</em></button>
          <button className="nav-item"><SlidersHorizontal size={14} /> <span>Analyst Terminal</span></button>
          <button className="nav-item"><ShieldAlert size={14} /> <span>Sensor &amp; Model</span></button>
          <div className="nav-rule" />
          <div className="nav-section">REFERENCE</div>
          <button className="nav-item"><Layers3 size={14} /> <span>Evidence</span></button>
          <button className="nav-item"><LocateFixed size={14} /> <span>War Game</span></button>
          <button className="nav-item"><Activity size={14} /> <span>Ask ANGEL</span></button>
          <div className="nav-spacer" />
          <div className="nav-status"><b>POSTURE · ONE SOURCE</b><span>● ANGEL SWARM deployed</span><span>● Authority delegated</span><span>● Run complete at T+180</span></div>
        </nav>
        <section className="adaptive-workspace">
          <div className="adaptive-toolbar">
            <div className="toolbar-context"><span className="toolbar-kicker">THEATER MAP</span><span>·</span><span>T+180 MIN</span></div>
            <div className="toolbar-controls"><button>◈ GLOBE</button><button>◈ THEATRE</button><button className="selected">▦ TACTICAL 2D</button><button onClick={() => setZoom((v) => Math.max(.9, v - .1))}>− ZOOM OUT</button><button onClick={() => setZoom((v) => Math.min(1.3, v + .1))}>＋ ZOOM IN</button><button onClick={() => setZoom(1)}>FIT</button><button className={layersOpen ? 'selected' : ''} onClick={() => setLayersOpen((v) => !v)}><Layers3 size={11} /> LAYER PANEL</button></div>
          </div>
          <div className="adaptive-subbar"><span>DEAD OF SURVIVABLE WOUNDS</span><strong>23</strong><span className="mint">ANGEL SWARM</span><i /> <strong className="warm">34</strong><span className="warm">CURRENT — TRIAGE &amp; PROXIMITY</span><span>· SAME CASUALTIES, SAME AIRCRAFT, SAME BLOOD</span></div>
          <div className="map-comparison">
            {(['angel', 'current'] as const).map((side) => <article className={`map-panel ${side}`} key={side}>
              <header><span className="status-dot" /> <b>{side === 'angel' ? 'ANGEL SWARM' : 'CURRENT — TRIAGE & PROXIMITY'}</b><small>{side === 'angel' ? 'ALLOCATION ACTIVE' : 'BASELINE METHOD'}</small></header>
              <div className="map-viewport" style={{ transform: `scale(${zoom})` }}>
                {layers.routes && <><div className={`route ${side}`} style={{ left: '34%', top: '31%', width: '35%', transform: 'rotate(28deg)' }} /><div className={`route ${side}`} style={{ left: '55%', top: '57%', width: '26%', transform: 'rotate(42deg)' }} /></>}
                {layers.casualties && casualties.map((point, index) => <i key={index} className={`map-symbol casualty ${point[2] ? 'critical' : ''}`} style={{ left: `${point[0]}%`, top: `${point[1]}%` }} />)}
                {layers.threats && threats.map((point, index) => <b key={index} className="map-symbol threat" style={{ left: `${point[0]}%`, top: `${point[1]}%` }}>×</b>)}
                {layers.launches && <><div className="map-symbol launch" style={{ left: '29%', top: '34%' }}>L1</div><div className="map-symbol launch" style={{ left: '70%', top: '68%' }}>L2</div></>}
                {layers.aircraft && <><Plane className="map-symbol aircraft" size={20} style={{ left: '49%', top: '41%', transform: 'translate(-50%,-50%) rotate(-22deg)' }} /><Plane className="map-symbol aircraft" size={19} style={{ left: '67%', top: '59%', transform: 'translate(-50%,-50%) rotate(24deg)' }} /></>}
                <span className="map-label" style={{ left: '25%', top: '20%' }}>EAST SPIT · 08 CAS</span><span className="map-label" style={{ left: '48%', top: '48%' }}>CENTRAL KEY · 11 CAS</span><span className="map-label" style={{ left: '67%', top: '73%' }}>SOUTH REEF · 04 CAS</span>
              </div>
              <div className="map-total"><span>{side === 'angel' ? '23' : '34'}</span> DEAD OF SURVIVABLE WOUNDS</div>
            </article>)}
          </div>
          <aside className={`instrument-rail ${layersOpen ? 'open' : ''}`}>
            <div className="instrument-head"><div><span>DISPLAY CONTROLS</span><b>Layers &amp; legend</b></div><button onClick={() => setLayersOpen(false)} aria-label="Close layers"><X size={14} /></button></div>
            <div className="layer-list">{(Object.keys(layers) as LayerKey[]).map((key) => <label key={key} className="layer-row"><input type="checkbox" checked={layers[key]} onChange={() => toggle(key)} /><span className="layer-check" />{layerLabels[key]}<em>{key === 'casualties' ? '23' : key === 'aircraft' ? '02' : key === 'threats' ? '06' : 'ON'}</em></label>)}</div>
            <button className="legend-toggle" onClick={() => setLegendOpen((v) => !v)}><span>SYMBOL LEGEND</span><ChevronDown size={14} className={legendOpen ? 'flip' : ''} /></button>
            {legendOpen && <div className="legend"><span><i className="legend-cas" /> Casualty / critical</span><span><i className="legend-threat">×</i> Threat site</span><span><i className="legend-route" /> Allocation route</span><span><i className="legend-launch">L1</i> Launch site</span></div>}
          </aside>
          <div className="adaptive-footer"><div><b>{arm === 'angel' ? 'ANGEL SWARM · ALLOCATION ACTIVE' : 'CURRENT METHOD · TRIAGE & PROXIMITY'}</b><span>{arm === 'angel' ? '23 dead of survivable wounds. Authority delegated; local allocation at T+180 with no reachback.' : '34 dead of survivable wounds. Eleven additional losses under identical operational conditions.'}</span></div><div className="footer-actions"><button onClick={() => setArm('angel')} className={arm === 'angel' ? 'active' : ''}>ANGEL</button><button onClick={() => setArm('current')} className={arm === 'current' ? 'active' : ''}>CURRENT</button><button onClick={() => setZoom(1)}><LocateFixed size={14} /></button><button onClick={() => setLayersOpen((v) => !v)}><Layers3 size={14} /></button></div></div>
        </section>
      </div>
    </main>
  );
}