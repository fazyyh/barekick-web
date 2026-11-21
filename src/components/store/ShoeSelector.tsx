import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Product } from '../../store/products';

const ARC_COUNT = 7;
// Positions follow the reference's broad ellipse, in percentages of the stage.
function arcPose(offset: number) {
  return { x: offset * 15 + offset * offset, y: -offset * 18 + offset * offset * 6, scale: Math.max(.25, 1 - Math.abs(offset) * .34) };
}
const shortestOffset = (value: number) => { let offset = value; while (offset > ARC_COUNT / 2) offset -= ARC_COUNT; while (offset < -ARC_COUNT / 2) offset += ARC_COUNT; return offset; };

export default function ShoeSelector({ products }: { products: Product[] }) {
  const picks = products.slice(0, ARC_COUNT);
  const [position, setPosition] = useState(0), [dragging, setDragging] = useState(false), [playing, setPlaying] = useState(true);
  const startX = useRef(0), startPosition = useRef(0), wheel = useRef<HTMLDivElement>(null), dragDistance = useRef(0);
  const navigate = useNavigate();
  const activeIndex = ((Math.round(position) % ARC_COUNT) + ARC_COUNT) % ARC_COUNT; const current = picks[activeIndex];
  const snapTo = (target: number) => { const start = position; const end = ((target % ARC_COUNT) + ARC_COUNT) % ARC_COUNT; const destination = start + shortestOffset(end - start); const started = performance.now(); const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 160 : 650; const frame = (now: number) => { const progress = Math.min(1, (now - started) / duration), eased = 1 - Math.pow(1 - progress, 3); setPosition(start + (destination - start) * eased); if (progress < 1) requestAnimationFrame(frame); }; requestAnimationFrame(frame); };
  const interact = () => setPlaying(false); const move = (delta: number) => { interact(); snapTo(activeIndex + delta); };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { interact(); setDragging(true); dragDistance.current = 0; startX.current = event.clientX; startPosition.current = position; if (event.currentTarget === wheel.current) event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => { if (!dragging) return; dragDistance.current = Math.max(dragDistance.current, Math.abs(event.clientX - startX.current)); if (dragDistance.current < 8) return; const width = wheel.current?.clientWidth || 500; setPosition(startPosition.current - ((event.clientX - startX.current) / width) * (ARC_COUNT - 1)); };
  const onPointerUp = () => { if (!dragging) return; setDragging(false); if (dragDistance.current >= 8) snapTo(Math.round(position)); };
  useEffect(() => { if (!playing || dragging || picks.length < 2) return; const timer = window.setInterval(() => snapTo(activeIndex + 1), 4000); return () => window.clearInterval(timer); }, [playing, dragging, activeIndex, picks.length]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }; const node = wheel.current; node?.addEventListener('keydown', onKey); return () => node?.removeEventListener('keydown', onKey); });
  if (!current) return null;
  return <section className="arc-selector" aria-labelledby="arc-selector-title">
    <div className="arc-progress"><button onClick={() => move(-1)} aria-label="Previous shoe"><ChevronLeft size={18}/></button><div>{Array.from({ length: 6 }, (_, index) => <span key={index} className={index <= activeIndex ? 'is-on' : ''}/>)}</div><button onClick={() => move(1)} aria-label="Next shoe"><ChevronRight size={18}/></button><button onClick={() => { interact(); setPlaying(value => !value); }} aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}>{playing ? <Pause size={14}/> : <Play size={14}/>}</button></div>
    <div className="arc-layout">
      <div className="arc-product-info"><span className="arc-counter" aria-live="polite">{String(activeIndex + 1).padStart(2, '0')} / {String(picks.length).padStart(2, '0')}</span><h1 id="arc-selector-title" aria-live="polite">{current.name}</h1><p className="arc-colorway">{current.colorway}</p><Link to={`/products/${current.id}`} className="arc-details">View details <ChevronRight size={17}/></Link></div>
      <div className={`arc-stage ${dragging ? 'is-dragging' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={(event) => { if (Math.abs(event.deltaX) > 1) { event.preventDefault(); interact(); setPosition(value => value + event.deltaX / 180); } }} role="group" aria-label="Shoe arc. Drag to select a product."><svg className="arc-line" viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true"><path d="M325 800 C395 220 675 30 1040 265" fill="none" stroke="currentColor" strokeOpacity=".15"/><path d="M425 800 C540 385 790 210 1040 450" fill="none" stroke="currentColor" strokeOpacity=".08" strokeDasharray="4 6"/></svg>{picks.map((product, index) => { const offset = shortestOffset(index - position), distance = Math.abs(offset), pose = arcPose(offset), x = pose.x, y = pose.y, scale = pose.scale, opacity = Math.max(0, 1 - Math.max(0, distance - 2) * 1.8), rotate = offset * 7; return <button key={product.id} className={`arc-shoe ${index === activeIndex ? 'is-active' : ''}`} style={{ transform: `translate3d(calc(-50% + ${x}cqw), calc(-50% + ${y}cqh), 0) scale(${scale}) rotate(${rotate}deg)`, opacity, zIndex: 20 - Math.round(distance * 3), filter: `blur(${Math.max(0, distance - 2) * .4}px)` }} onClick={() => { if (dragDistance.current >= 8) return; interact(); navigate(`/products/${product.id}`); }} aria-label={`View ${product.name} details`}><img src={product.images[0]} alt={`${product.name} sneaker`} draggable={false}/><span/></button>; })}</div>
    </div>
    <div className="arc-wheel-wrap"><div ref={wheel} className={`arc-wheel ${dragging ? 'is-dragging' : ''}`} role="slider" tabIndex={0} aria-label="Shoe selector wheel" aria-valuemin={0} aria-valuemax={6} aria-valuenow={Math.round(position)} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}><span className="arc-wheel-progress" style={{ width: `${(activeIndex / 6) * 100}%` }}/><i style={{ left: `${((position % 6 + 6) % 6) / 6 * 100}%` }}/></div><div className="arc-wheel-labels"><span>01</span><span>DRAG THE WHEEL</span><span>07</span></div></div>
  </section>;
}
