import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const {assets}=JSON.parse(await readFile('assets/generated-shoes/prompts.json','utf8'));
for(const {id} of assets){
 await sharp(`assets/generated-shoes/${id}.png`).trim({threshold:10}).resize({width:900,height:540,fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:85,alphaQuality:100}).toFile(`public/images/products/${id}.webp`);
 console.log(`Optimized ${id}`);
}
