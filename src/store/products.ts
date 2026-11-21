/** Local sample catalog. Replace getProducts() with a Shopify Storefront API adapter later.
 * Images are original generated concept shoes; prices and inventory are illustrative. */
export type Product = {
  id: string; name: string; brand: string; category: 'Court' | 'Running' | 'Terrace' | 'Canvas';
  audience: ('Men' | 'Women' | 'Kids')[]; price: number; sizes: number[]; images: string[];
  colorway: string; description: string; collection: string; isNew: boolean; bestSeller: boolean;
  ar: { modelId: 'studio-01' | 'orange-reference'; modelUrl: string; exact: boolean };
};
const adult = [36,37,38,39,40,41,42,43,44,45];
const rows: [string,string,Product['category'],string,number,Product['audience'],string][] = [
  ['court-01','Court 01','Court','Chalk / Ivory',7499,['Men','Women'],'court-ivory'],
  ['velocity-02','Velocity 02','Running','Silver / Graphite',10999,['Men','Women'],'runner-silver'],
  ['terrace-03','Terrace 03','Terrace','Forest / Gum',8499,['Men','Women'],'retro-green'],
  ['courtside-04','Courtside 04','Court','Varsity Red / Chalk',9499,['Men','Women'],'court-red'],
  ['pace-05','Pace 05','Running','Cobalt / Silver',11499,['Men'],'runner-blue'],
  ['terrace-06','Terrace 06','Terrace','Camel / Espresso',8499,['Men','Women'],'terrace-tan'],
  ['highline-07','Highline 07','Court','Black / Chalk',10499,['Men','Women'],'high-black'],
  ['terrain-08','Terrain 08','Running','Sand / Stone',12499,['Men','Women'],'runner-sand'],
  ['court-09','Court 09','Court','Peach / Burnt Orange',9999,['Women','Men'],'court-peach'],
  ['canvas-10','Canvas 10','Canvas','Cream / Black',5499,['Men','Women'],'canvas-cream'],
  ['court-01-junior','Court 01 Junior','Court','Chalk / Ivory',4499,['Kids'],'court-ivory'],
  ['pace-05-junior','Pace 05 Junior','Running','Cobalt / Silver',5499,['Kids'],'runner-blue'],
  ['canvas-10-junior','Canvas 10 Junior','Canvas','Cream / Black',3499,['Kids'],'canvas-cream'],
  ['velocity-02-studio','Velocity 02 Studio','Running','Silver / Graphite',11999,['Women'],'runner-silver'],
  ['terrace-03-studio','Terrace 03 Studio','Terrace','Forest / Gum',8999,['Women'],'retro-green'],
  ['highline-07-studio','Highline 07 Studio','Court','Black / Chalk',10999,['Women'],'high-black'],
  ['courtside-04-junior','Courtside 04 Junior','Court','Varsity Red / Chalk',4999,['Kids'],'court-red'],
  ['terrain-08-studio','Terrain 08 Studio','Running','Sand / Stone',12999,['Women'],'runner-sand'],
  ['studio-01','Studio 01','Court','Ivory / Forest',7999,['Men','Women'],'studio-01'],
  ['orange-reference','Orange Study','Court','Orange / Black',8999,['Men','Women'],'orange-reference'],
];
export const products: Product[] = rows.map(([id,name,category,colorway,price,audience,image],i) => ({
  id,name,brand:'bare.kickss',category,colorway,price,audience,
  sizes: audience.includes('Kids') ? [28,29,30,31,32,33,34,35] : adult,
  images: [image === 'studio-01' ? '/models/sole-studio-01-preview.png' : image === 'orange-reference' ? '/models/orange-reference-shoe-preview.png' : `/images/products/${image}.webp`],
  description: `A considered take on the ${category.toLowerCase()} silhouette. ${colorway} tones, tactile materials, and a profile that speaks for itself. Part of the bare.kickss concept collection.`,
  collection: category === 'Running' ? 'In Motion' : category === 'Terrace' || category === 'Canvas' ? 'Everyday Objects' : 'Court Culture',
  isNew: i < 8 || i === 18, bestSeller: [0,2,3,5,6,9,18,19].includes(i),
  ar: {modelId: id === 'orange-reference' ? 'orange-reference' : 'studio-01',modelUrl:id === 'orange-reference' ? '/models/orange-reference-shoe.glb' : '/models/sole-studio-01.glb',exact: i >= 18},
}));
export const collections = [
  {id:'court-culture',name:'Court Culture',caption:'Familiar forms. A fresh perspective.',category:'Court'},
  {id:'in-motion',name:'In Motion',caption:'Built around the art of moving.',category:'Running'},
  {id:'everyday-objects',name:'Everyday Objects',caption:'The pairs you reach for. Every day.',category:'Terrace'},
];
export const money = (value: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);
export async function getProducts(): Promise<Product[]> { return products; }
export function findProduct(id?: string) { return products.find(p => p.id === id); }
