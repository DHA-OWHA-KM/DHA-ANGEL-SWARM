import { useState } from 'react';
import { Crosshair, Layers3, LocateFixed, Minus, Plane, Plus, RotateCcw, ShieldAlert, SlidersHorizontal, Target, X } from 'lucide-react';
import './_group.css';
import './FocusedMap.css';

type Arm = 'angel' | 'current';

const casualties = [
  [32, 28, 0], [36, 31, 0], [40, 34, 1], [43, 38, 0], [54, 53, 1], [58, 57, 0],
  [61, 61, 0], [50, 65, 1], [67, 69, 0], [73, 75, 0], [28, 72, 0], [34, 78, 1],
];
const threats = [[39,25],[46,41],[56,48],[63,66],[77,57],[31,67]];

export function FocusedMap() {
  const [arm, setArm] = useState<Arm>('angel');
  const [layersOpen, setLayersOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState({ casualties:true, aircraft:true, routes:true, threats:true, launches:true });
  const toggle = (key: keyof typeof layers) => setLayers(v => ({...v, [key]:!v[key]}));
  const reset = () => { setArm('angel'); setZoom(1); setLayersOpen(false); };

  return (
    <main className="focused-map">
      <div className="fm-noise" />
      <div className="fm-classification"><span>UNCLASSIFIED // PUBLIC RELEASE // SYNTHETIC DATA</span><span>JOA CORAL · PACOM</span></div>
      <header className="fm-header">
        <div className="fm-brand"><div className="fm-mark"/><div><strong>ANGEL SWARM</strong><small>DHA · PHYSIOLOGICAL DEADLINE BLOOD ALLOCATION</small></div></div>
        <div className="fm-run"><i className="pulse"/><div><b>RUN 07 COMPLETE</b><span>T+180 MIN · 06:42Z</span></div></div>
        <div className="fm-header-actions">
          <div className="fm-chip complete"><Target size={12}/> 2 / 3 DECIDED</div>
          <div className="fm-chip"><ShieldAlert size={12}/> FPCON BRAVO</div>
          <button className="fm-btn danger" onClick={reset}><RotateCcw size={11}/> RESET</button>
          <button className="fm-btn primary" onClick={() => setDecisionOpen(true)}>DECISION QUEUE</button>
        </div>
      </header>
      <div className="fm-body">
        <nav className="fm-rail" aria-label="Map tools">
          <button title="Theater map" className="fm-iconbtn active"><Crosshair size={17}/></button>
          <button title="Aircraft" className="fm-iconbtn" onClick={() => toggle('aircraft')}><Plane size={17}/></button>
          <button title="Threats" className="fm-iconbtn" onClick={() => toggle('threats')}><ShieldAlert size={17}/></button>
          <button title="Display settings" className="fm-iconbtn" onClick={() => setLayersOpen(v=>!v)}><SlidersHorizontal size={17}/></button>
          <div className="fm-spacer"/>
          <button title="Layers and legend" className={`fm-iconbtn ${layersOpen?'active':''}`} onClick={() => setLayersOpen(v=>!v)}><Layers3 size={17}/></button>
        </nav>
        <section className="fm-stage">
          <div className={`fm-map ${arm}`} style={{transform:`scale(${zoom})`}}>
            {layers.routes && <><div className={`fm-route ${arm}`} style={{left:'35%',top:'31%',width:'34%',transform:'rotate(28deg)'}}/><div className={`fm-route ${arm}`} style={{left:'56%',top:'56%',width:'25%',transform:'rotate(42deg)'}}/></>}
            {layers.casualties && casualties.map((p,i)=><i key={`c${i}`} className={`fm-symbol fm-cas ${p[2]?'critical':''}`} style={{left:`${p[0]}%`,top:`${p[1]}%`}} />)}
            {layers.threats && threats.map((p,i)=><b key={`t${i}`} className="fm-symbol fm-threat" style={{left:`${p[0]}%`,top:`${p[1]}%`}}>×</b>)}
            {layers.launches && <><div className="fm-symbol fm-launch" style={{left:'29%',top:'34%'}}><i>L1</i></div><div className="fm-symbol fm-launch" style={{left:'70%',top:'68%'}}><i>L2</i></div></>}
            {layers.aircraft && <><Plane className="fm-symbol fm-air" size={22} style={{left:'49%',top:'41%',transform:'translate(-50%,-50%) rotate(-22deg)'}}/><Plane className="fm-symbol fm-air" size={20} style={{left:'67%',top:'59%',transform:'translate(-50%,-50%) rotate(24deg)'}}/></>}
            <span className="fm-label" style={{left:'25%',top:'20%'}}>EAST SPIT · 08 CAS</span><span className="fm-label" style={{left:'48%',top:'48%'}}>CENTRAL KEY · 11 CAS</span><span className="fm-label" style={{left:'67%',top:'73%'}}>SOUTH REEF · 04 CAS</span>
          </div>
          <div className="fm-topbar">
            <div className="fm-view-switch" aria-label="Comparison arm">
              <button className={arm==='angel'?'active':''} onClick={()=>setArm('angel')}>ANGEL SWARM</button>
              <button className={arm==='current'?'active':''} onClick={()=>setArm('current')}>CURRENT METHOD</button>
            </div>
            <aside className="fm-compare">
              <header><span>Same casualties · aircraft · blood</span><strong>RUN COMPLETE</strong></header>
              <div className="fm-metrics"><div className="fm-metric">23<span>ANGEL SURVIVORS</span></div><div className="fm-metric bad">34<span>CURRENT SURVIVORS</span></div><div className="fm-metric">−22m<span>MEDIAN DELIVERY</span></div></div>
            </aside>
          </div>
          <aside className={`fm-layer-drawer ${layersOpen?'open':''}`}>
            <div className="fm-drawer-head"><b>LAYERS & LEGEND</b><button className="fm-iconbtn" onClick={()=>setLayersOpen(false)}><X size={15}/></button></div>
            {(Object.keys(layers) as (keyof typeof layers)[]).map((key)=><label className="fm-layer" key={key}><input type="checkbox" checked={layers[key]} onChange={()=>toggle(key)}/>{key.toUpperCase()}<span>{key==='casualties'?'23':key==='aircraft'?'02':key==='threats'?'06':'ON'}</span></label>)}
          </aside>
          <div className="fm-bottom">
            <div className="fm-summary"><h2>{arm==='angel'?'ANGEL SWARM · ALLOCATION ACTIVE':'CURRENT METHOD · TRIAGE & PROXIMITY'}</h2><p>{arm==='angel'?'23 dead of survivable wounds. Authority delegated; local allocation at T+180 with no reachback.':'34 dead of survivable wounds. Eleven additional losses under identical operational conditions.'}</p></div>
            <div className="fm-tools"><button className="fm-iconbtn" title="Zoom out" onClick={()=>setZoom(z=>Math.max(.9,z-.1))}><Minus size={16}/></button><button className="fm-iconbtn" title="Fit theater" onClick={()=>setZoom(1)}><LocateFixed size={16}/></button><button className="fm-iconbtn" title="Zoom in" onClick={()=>setZoom(z=>Math.min(1.4,z+.1))}><Plus size={16}/></button></div>
          </div>
          <div className={`fm-decision ${decisionOpen?'open':''}`} onClick={()=>setDecisionOpen(false)}>
            <div className="fm-modal" onClick={e=>e.stopPropagation()}><h3>DECISION QUEUE · 2 OF 3</h3><p>Approve local blood allocation for CENTRAL KEY. ANGEL recommends redirecting AIR-2 from SOUTH REEF, preserving an estimated 7 additional survivable casualties.</p><footer><button className="fm-btn" onClick={()=>setDecisionOpen(false)}>HOLD</button><button className="fm-btn primary" onClick={()=>setDecisionOpen(false)}>APPROVE ALLOCATION</button></footer></div>
          </div>
        </section>
      </div>
    </main>
  );
}