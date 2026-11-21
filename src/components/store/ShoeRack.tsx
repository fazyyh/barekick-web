import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { products, type Product } from '../../store/products';

export default function ShoeRack() {
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [zoom, setZoom] = useState({ x: 0, y: 0 });
  const wall = useRef<HTMLElement>(null);
  const close = () => setSelected(null);
  useEffect(() => { if (!selected) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [selected]);
  const open = (product: Product, button: HTMLButtonElement) => {
    const shoe = button.querySelector('.rack-shoe')?.getBoundingClientRect();
    const area = wall.current?.getBoundingClientRect();
    if (shoe && area) setZoom({ x: area.left + area.width * (innerWidth < 760 ? .5 : .42) - (shoe.left + shoe.width / 2), y: area.top + area.height * .48 - (shoe.top + shoe.height / 2) });
    setHover(null); setSelected(product);
  };
  return <section ref={wall} className={`shoe-wall ${hover ? 'has-selection' : ''} ${selected ? 'rack-expanded' : ''}`} aria-label="The bare.kickss shoe gallery">
    <div className="rack-grid" onMouseLeave={() => setHover(null)}>
      {products.slice(0, 10).map((product, index) => <button type="button" key={product.id}
        className={`rack-slot ${hover === product.id ? 'in-focus' : ''} ${selected?.id === product.id ? 'rack-selected' : ''}`}
        style={{ '--delay': `${index * 55}ms`, '--zoom-x': `${zoom.x}px`, '--zoom-y': `${zoom.y}px` } as CSSProperties}
        onMouseEnter={() => setHover(product.id)} onFocus={() => setHover(product.id)} onBlur={() => setHover(null)}
        onClick={event => selected?.id === product.id ? close() : open(product, event.currentTarget)}
        aria-label={`View ${product.name} close up`}>
        <div className="rack-shoe"><img src={product.images[0]} alt={`${product.name} in ${product.colorway}`} width="440" height="250" fetchPriority={index < 5 ? 'high' : 'auto'} decoding="async"/></div>
        <span className="acrylic-shelf" aria-hidden="true"/><div className="rack-label"><span>{product.name}</span></div>
      </button>)}
    </div>
    {selected && <div className="rack-inline-details" key={selected.id} aria-live="polite">
      <button className="rack-inline-close" onClick={close} aria-label="Close shoe details">×</button>
      <span className="eyebrow">BARE.KICKSS / {selected.category.toUpperCase()}</span>
      <h2>{selected.name}</h2><p className="rack-closeup-colorway">{selected.colorway}</p><p>{selected.description}</p>
      <Link to={`/products/${selected.id}`} className="rack-inline-link">View product details →</Link>
    </div>}
  </section>;
}
