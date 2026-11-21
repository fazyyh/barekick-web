import { lazy, Suspense, useEffect } from 'react';
import { Routes,Route,useLocation,Link,Outlet } from 'react-router-dom';
import Header from './components/store/Header';
import Footer from './components/store/Footer';
import CartDrawer from './components/store/Cart';
import Home from './pages/Home';
const Collection=lazy(()=>import('./pages/Collection'));
const Product=lazy(()=>import('./pages/Product'));
const CartPage=lazy(()=>import('./pages/CartPage'));
const Checkout=lazy(()=>import('./pages/Checkout'));
const Account=lazy(()=>import('./pages/Account'));
const Info=lazy(()=>import('./pages/Info'));
const ARTryOn=lazy(()=>import('./pages/ARTryOn'));
function Layout(){return <div className="storefront"><a href="#main-content" className="skip-link">Skip to content</a><Header/><main id="main-content" tabIndex={-1}><Outlet/></main><Footer/><CartDrawer/></div>;}
function ScrollReset(){const location=useLocation();useEffect(()=>{window.scrollTo(0,0);document.title=location.pathname==='/ar'?'AR fitting room — bare.kickss':'bare.kickss — A different perspective.';},[location.pathname]);return null;}
export default function App(){return <><ScrollReset/><Suspense fallback={<div className="route-loading" role="status">A different perspective. Loading…</div>}><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="collections" element={<Collection/>}/><Route path="collections/:slug" element={<Collection/>}/><Route path="products/:id" element={<Product/>}/><Route path="cart" element={<CartPage/>}/><Route path="checkout" element={<Checkout/>}/><Route path="account" element={<Account/>}/><Route path="info/:page" element={<Info/>}/><Route path="*" element={<div className="empty-state"><h1>Nothing on this wall.</h1><Link className="button dark" to="/">Back to the gallery</Link></div>}/></Route><Route path="ar" element={<ARTryOn/>}/></Routes></Suspense></>;}
