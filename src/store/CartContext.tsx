import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { findProduct } from './products';
export type CartLine = { id: string; size: number; quantity: number };
type CartState = { lines: CartLine[]; count: number; add: (id:string,size:number)=>void; change:(id:string,size:number,quantity:number)=>void; clear:()=>void; open:boolean; setOpen:(open:boolean)=>void };
const Context = createContext<CartState | null>(null);
function readCart(): CartLine[] {
  try { const parsed=JSON.parse(localStorage.getItem('bare-kickss-cart')||'[]'); return Array.isArray(parsed) ? parsed.filter((l:CartLine)=>findProduct(l.id)?.sizes.includes(l.size)&&Number.isInteger(l.quantity)&&l.quantity>0&&l.quantity<=10) : []; } catch { return []; }
}
export function CartProvider({children}:{children:ReactNode}) {
  const [lines,setLines]=useState<CartLine[]>(readCart),[open,setOpen]=useState(false);
  useEffect(()=>{try{localStorage.setItem('bare-kickss-cart',JSON.stringify(lines));}catch{/* Storage may be unavailable. */}},[lines]);
  const add=(id:string,size:number)=>{if(!findProduct(id)?.sizes.includes(size))return;setLines(ls=>{const line=ls.find(l=>l.id===id&&l.size===size);return line?ls.map(l=>l===line?{...l,quantity:Math.min(10,l.quantity+1)}:l):[...ls,{id,size,quantity:1}];});setOpen(true);};
  const change=(id:string,size:number,quantity:number)=>setLines(ls=>ls.flatMap(l=>l.id===id&&l.size===size?(quantity<=0?[]:[{...l,quantity:Math.min(10,quantity)}]):[l]));
  return <Context.Provider value={{lines,count:lines.reduce((n,l)=>n+l.quantity,0),add,change,clear:()=>setLines([]),open,setOpen}}>{children}</Context.Provider>;
}
export function useCart(){const cart=useContext(Context);if(!cart)throw new Error('CartProvider missing');return cart;}
