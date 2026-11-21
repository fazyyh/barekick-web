import { useRef, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '../../store/products';
import ProductCard from './ProductCard';
export default function Carousel({title,subtitle,products,to,showPrice=true}:{title:string;subtitle?:string;products:Product[];to:string;showPrice?:boolean}){
 const row=useRef<HTMLDivElement>(null);const scroll=(direction:number)=>row.current?.scrollBy({left:direction*row.current.clientWidth*.85,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 const key=(e:KeyboardEvent)=>{if(e.target===e.currentTarget&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();scroll(e.key==='ArrowRight'?1:-1);}};
 return <section className="carousel-section"><div className="section-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><div className="section-actions"><Link className="text-link" to={to}>View all</Link><div className="carousel-controls"><button className="icon-btn" onClick={()=>scroll(-1)} aria-label={`Previous ${title}`}><ChevronLeft size={20}/></button><button className="icon-btn" onClick={()=>scroll(1)} aria-label={`Next ${title}`}><ChevronRight size={20}/></button></div></div></div><div ref={row} className="product-carousel" tabIndex={0} onKeyDown={key} role="region" aria-label={`${title} carousel. Use left and right arrow keys to scroll.`}>{products.map(p=><ProductCard key={p.id} product={p} showPrice={showPrice}/>)}</div></section>;
}
