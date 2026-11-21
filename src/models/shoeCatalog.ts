import { products } from '../store/products';
export type Shoe = { id: string; name: string; brand: string; category: string; color: string; accent: string; price: string; tag?: string; modelUrl?: string; thumbnailUrl?: string };
export const shoes: Shoe[] = products.filter(p => p.ar.exact).map(p => ({ id:p.id, name:p.name, brand:p.brand, category:p.category, color:'#eeeeee', accent:'#111111', price:String(p.price), modelUrl:p.ar.modelUrl, thumbnailUrl:p.images[0] }));
