import { Link } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { CartLines,CartSummary } from '../components/store/Cart';
export default function CartPage(){const cart=useCart();return <section className="page-container cart-page"><div className="page-intro"><span className="eyebrow">YOUR SELECTION</span><h1>The bag.</h1><p>{cart.count?`${cart.count} carefully considered ${cart.count===1?'pair':'pairs'}.`:'Your next favorite pair is out there.'}</p></div>{cart.count?<div className="cart-page-layout"><CartLines/><CartSummary/></div>:<div className="empty-state"><p>No pairs in your bag yet.</p><Link className="button dark" to="/collections/all">Explore sneakers</Link></div>}</section>;}
