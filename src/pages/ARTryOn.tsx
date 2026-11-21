import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, Download, Footprints, Info, LoaderCircle, Orbit, RotateCcw, Settings2, SwitchCamera, X } from 'lucide-react';
import { useWebARFootTracking } from '../hooks/useWebARFootTracking';
import { products, findProduct } from '../store/products';
import { Link, useSearchParams } from 'react-router-dom';
import type { Shoe } from '../models/shoeCatalog';
const shoes: Shoe[] = products.filter(p => p.ar.exact).map(p => ({id:p.id,name:p.name,brand:p.brand,category:p.category,color:'#eee',accent:'#111',price:'TEST',modelUrl:p.ar.modelUrl,thumbnailUrl:p.images[0]}));
import ShoeViewer from '../components/ShoeViewer';
import StepGuide from '../ar/StepGuide';

type Calibration = { scale: number; x: number; y: number; rotation: number };
const DEFAULT: Calibration = { scale: 1, x: 0, y: 0, rotation: 0 };
function readCalibration(): Calibration {
  try {
    const saved = JSON.parse(localStorage.getItem('sole-ar-calibration') || '{}');
    return { scale: clamp(saved.scale, .55, 1.8, 1), x: clamp(saved.x, -100, 100, 0), y: clamp(saved.y, -100, 100, 0), rotation: clamp(saved.rotation, -45, 45, 0) };
  } catch { return { ...DEFAULT }; }
}
function clamp(value: unknown, min: number, max: number, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback; }

export default function ARTryOn() {
  const [mode, setMode] = useState<'3d' | 'ar'>('ar');
  const [params] = useSearchParams();
  const requested = findProduct(params.get('product') || undefined);
  const [selected, setSelected] = useState(() => Math.max(0, shoes.findIndex(s => s.id === (requested?.ar.modelId || 'studio-01'))));
  const shoe = shoes[selected];
  const [calibration, setCalibration] = useState<Calibration>(readCalibration);
  const [size, setSize] = useState(40);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [debug, setDebug] = useState(false);
  const [footMode, setFootMode] = useState<'barefoot' | 'shoes'>('barefoot');
  const [occlusion, setOcclusion] = useState(true);
  const camera = useWebARFootTracking(shoe, calibration, size, footMode, occlusion);
  const { captured, setCaptured, captureError, setCaptureError, feet, modelReady, modelLoading, fps, trackingState, modelStatus } = camera;
  const trackingError = camera.error;
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const tracking = camera.active && feet.length > 0 && trackingState === 'tracking';
  const live = mode === 'ar' && camera.active;
  useEffect(() => { try { localStorage.setItem('sole-ar-calibration', JSON.stringify(calibration)); } catch { /* Private browsing can disable persistence. */ } }, [calibration]);
  useEffect(() => { thumbnails.current[selected]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }, [selected]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSettings(false); setHelp(false); setCaptured(''); } };
    addEventListener('keydown', close); return () => removeEventListener('keydown', close);
  }, []);
  function changeMode(next: '3d' | 'ar') {
    setMode(next); setCaptureError('');
    if (next === '3d') camera.stop();
    else if (!camera.active && !camera.loading) void camera.start();
  }
  const capture = camera.capture;
  function select(index: number) { setSelected((index + shoes.length) % shoes.length); }
  const adjust = (key: keyof Calibration, value: number) => setCalibration(c => ({ ...c, [key]: value }));

  return <main className={`tryon-app mode-${mode} ${tracking ? 'is-tracking' : ''}`}>
    <div className="experience-stage">
      {live && <iframe key={camera.session} ref={camera.frameRef} onLoad={camera.onLoad} src="/vendor/webar-rocks/engine.html" className="foot-tracker-frame" title="WebAR.rocks real-time foot tracking" allow="camera; fullscreen"/>}
      {mode === '3d' && <ShoeViewer shoe={shoe}/>}
      <div className="stage-shade"/>
      {live && !tracking && !trackingError && <div className="guide-dimmer"/>}
      <StepGuide state={trackingState} visible={live && !tracking && !trackingError}/>
      {mode === 'ar' && !camera.active && <div className="camera-welcome">
        <span className="welcome-eyebrow">BARE.KICKSS / AR TRY-ON</span>
        <h1>See them<br/><em>on your feet.</em></h1>
        <p>Point your camera at your feet to begin.</p>
        <button className="primary-button" onClick={() => camera.start()} disabled={camera.loading}>{camera.loading ? <LoaderCircle className="spin" size={19}/> : <Camera size={19}/>} {camera.loading ? 'Opening camera…' : 'Start try-on'}</button>
        <span className="privacy-note">Camera processing stays on your device</span>
      </div>}
    </div>

    <Link className="ar-store-back" to={requested ? `/products/${requested.id}` : '/'}>{requested ? 'Back to product' : 'Back to the gallery'}</Link>
    {requested && !requested.ar.exact && <div className="ar-context-note" role="status">{requested.name} has no matching 3D model yet. You are trying the {shoe.name} demo.</div>}
    <header className="experience-header">
      <Link className="sole-badge" to="/" aria-label="bare.kickss home">bare.kickss</Link>
      <div className="header-actions"><button className="round-action" onClick={() => setHelp(true)} aria-label="How to try on"><Info size={19}/></button><button className={`round-action ${settings ? 'active' : ''}`} onClick={() => setSettings(s => !s)} aria-label="Fit and alignment settings" aria-expanded={settings}><Settings2 size={19}/></button></div>
    </header>
    <nav className="mode-toggle" aria-label="Experience mode"><button aria-pressed={mode === '3d'} onClick={() => changeMode('3d')}><Orbit size={24}/><span>3D</span></button><button aria-pressed={mode === 'ar'} onClick={() => changeMode('ar')}><Footprints size={23}/><span>AR</span></button></nav>
    {live && <div className={`tracking-chip ${tracking ? 'locked' : ''}`} role="status"><span/>{modelStatus === 'loading' ? 'Loading shoe' : tracking ? `${feet.length === 1 ? 'One foot' : 'Both feet'} tracked` : modelLoading ? 'Loading tracker' : 'Looking for feet'}</div>}
    {live && <div className="camera-actions"><button className="round-action" onClick={camera.switchCamera} disabled={camera.loading} aria-label="Switch camera"><SwitchCamera size={20}/></button><button className="round-action capture-action" onClick={capture} disabled={modelStatus !== 'ready' || camera.loading} aria-label="Capture try-on screenshot"><Camera size={22}/></button><button className="round-action" onClick={camera.stop} aria-label="Stop camera"><X size={20}/></button></div>}

    <footer className="product-dock">
      <div className="product-info" aria-live="polite"><h2>{shoe.name}</h2></div>
      <div className="carousel-wrap"><button className="carousel-arrow" onClick={() => select(selected - 1)} aria-label="Previous shoe"><ChevronLeft size={21}/></button><div className="shoe-carousel" role="group" aria-label="Choose your shoe">{shoes.map((item, index) => <button key={item.id} ref={element => { thumbnails.current[index] = element; }} className={`shoe-option ${selected === index ? 'selected' : ''}`} onClick={() => select(index)} aria-pressed={selected === index} aria-label={`${item.name}${item.modelUrl ? '' : ' (demo geometry)'}`}>
        <span className="shoe-circle">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt=""/> : <span className="thumbnail-shoe" style={{ '--shoe': item.color, '--trim': item.accent } as CSSProperties}><i/><b/><em/></span>}</span><span className="shoe-option-name">{item.name}</span>{selected === index && <span className="selection-dot"/>}
      </button>)}</div><button className="carousel-arrow" onClick={() => select(selected + 1)} aria-label="Next shoe"><ChevronRight size={21}/></button></div>
    </footer>

    {(camera.error && mode === 'ar' || live && trackingError || captureError || modelStatus === 'error' && live) && <div className="experience-error" role="alert"><Info size={17}/><span>{camera.error || trackingError || captureError || 'Shoe asset failed to load. Please choose another pair.'}</span></div>}
    {debug && live && <aside className="debug-readout"><b>POSE TRACKER / {fps} FPS</b><span>{modelReady ? 'WEBAR.ROCKS READY' : 'INITIALIZING'} · {trackingState}</span>{feet.map(f => <span key={f.side}>{f.side} · {Math.round(f.confidence * 100)}% · x {f.x.toFixed(2)} y {f.y.toFixed(2)} · angle {(f.angle * 180 / Math.PI).toFixed(0)}° · size {f.length.toFixed(3)}</span>)}</aside>}
    {settings && <div className="panel-backdrop" onClick={() => setSettings(false)}><aside className="fit-panel" role="dialog" aria-modal="true" aria-label="Fit and alignment" onClick={e => e.stopPropagation()}><div className="panel-title"><div><span>MAKE IT YOURS</span><h2>Fit & alignment</h2></div><button className="round-action" onClick={() => setSettings(false)} aria-label="Close settings"><X size={20}/></button></div><p>Fine-tune the overlay for your camera angle.</p>
      <label className="size-control">Track feet <select value={footMode} onChange={e => setFootMode(e.target.value as 'barefoot' | 'shoes')}><option value="barefoot">Bare feet</option><option value="shoes">Wearing shoes</option></select></label><label className="debug-switch">Approximate ankle occlusion<input type="checkbox" checked={occlusion} onChange={e => setOcclusion(e.target.checked)}/></label><label className="size-control">Shoe size <select value={size} onChange={e => setSize(Number(e.target.value))}>{Array.from({length: 13}, (_, i) => i + 35).map(n => <option key={n} value={n}>EU {n}</option>)}</select></label>
      {([['scale', 'Scale', .55, 1.8, .01], ['x', 'Left / right', -100, 100, 1], ['y', 'Down / up', -100, 100, 1], ['rotation', 'Rotation', -45, 45, 1]] as const).map(([key,label,min,max,step]) => <label className="fit-slider" key={key}><span>{label}<b>{key === 'scale' ? `${Math.round(calibration.scale * 100)}%` : `${calibration[key]}${key === 'rotation' ? '°' : ' px'}`}</b></span><input type="range" min={min} max={max} step={step} value={calibration[key]} onChange={e => adjust(key, Number(e.target.value))}/></label>)}
      <button className="reset-fit" onClick={() => {setCalibration({...DEFAULT}); setSize(40);}}><RotateCcw size={16}/> Reset alignment</button>
      <label className="debug-switch">Developer overlay<input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)}/></label><small>Alignment is saved on this device. Size changes the visual overlay, not a physical fit measurement.</small>
    </aside></div>}
    {help && <div className="panel-backdrop" onClick={() => setHelp(false)}><section className="help-panel" role="dialog" aria-modal="true" aria-label="How to try on" onClick={e => e.stopPropagation()}><button className="round-action panel-close" onClick={() => setHelp(false)} aria-label="Close help"><X size={20}/></button><span className="welcome-eyebrow">A LITTLE GUIDANCE</span><h2>Your personal<br/>fitting room.</h2><ol><li><b>Pick a pair.</b> Explore it in 3D, then switch to AR.</li><li><b>Point down.</b> Show both feet clearly in good light.</li><li><b>Move naturally.</b> Shoes appear when foot landmarks are detected and hide when tracking is lost.</li></ol><p>This prototype uses WebAR.rocks dedicated foot landmarks and 3D pose fitting. Choose Bare feet or Wearing shoes in settings to match your feet. Crossings and strong camera angles can still lose tracking. Ankle occlusion is an approximate geometric mask, not a segmented outline of your leg. The orange model uses a side photo with estimated unseen surfaces.</p><button className="primary-button" onClick={() => setHelp(false)}><Check size={16}/> Got it</button></section></div>}
    {captured && <div className="panel-backdrop" onClick={() => setCaptured('')}><section className="snapshot-panel" role="dialog" aria-modal="true" aria-label="Your try-on snapshot" onClick={e => e.stopPropagation()}><div className="panel-title"><h2>Your look, captured.</h2><button className="round-action" onClick={() => setCaptured('')} aria-label="Close snapshot"><X size={20}/></button></div><img src={captured} alt="Captured camera feed and virtual shoes"/><a className="primary-button" download="bare-kickss-try-on.png" href={captured}><Download size={17}/> Save photo</a></section></div>}
  </main>;
}
