// Offline inspection image made from the exported GLB buffers, without a GPU dependency.
import { readFile, writeFile } from 'node:fs/promises';
import * as T from 'three';
const file=await readFile(new URL('../public/models/sole-studio-01.glb',import.meta.url));
if(file.readUInt32LE(0)!==0x46546c67||file.readUInt32LE(4)!==2)throw Error('Invalid GLB');
const jsonSize=file.readUInt32LE(12), gltf=JSON.parse(file.toString('utf8',20,20+jsonSize));
const bin=file.subarray(28+jsonSize);
function accessor(id){const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView];if(a.componentType!==5126)throw Error('Expected float');return new Float32Array(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*3);}
const W=1200,H=900,pixels=new Uint8Array(W*H*3),depth=new Float32Array(W*H).fill(Infinity);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=28+(1-y/H)*7;pixels.set([v*.94,v,v*.87],(y*W+x)*3);}
const eye=new T.Vector3(.34,.35,.28),target=new T.Vector3(0,0,.052),f=target.clone().sub(eye).normalize();
const right=new T.Vector3().crossVectors(f,new T.Vector3(0,0,1)).normalize(),up=new T.Vector3().crossVectors(right,f);
const key=new T.Vector3(-.4,.4,1).normalize(),fill=new T.Vector3(1,-.3,.4).normalize(),focal=H/(2*Math.tan(32*Math.PI/360));
const project=(x,y,z)=>{const d=new T.Vector3(x,y,z).sub(eye),dist=d.dot(f);return [W/2+d.dot(right)/dist*focal,H/2-d.dot(up)/dist*focal,dist];};
const edge=(a,b,x,y)=>(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
let count=0;
for(const mesh of gltf.meshes)for(const prim of mesh.primitives){
  const p=accessor(prim.attributes.POSITION),n=accessor(prim.attributes.NORMAL),color=gltf.materials[prim.material].pbrMetallicRoughness.baseColorFactor;
  for(let i=0;i<p.length;i+=9){
    const pts=[project(...p.subarray(i,i+3)),project(...p.subarray(i+3,i+6)),project(...p.subarray(i+6,i+9))];
    const area=edge(pts[0],pts[1],pts[2][0],pts[2][1]);if(Math.abs(area)<.001)continue;
    const shades=[];for(let j=0;j<3;j++){const normal=new T.Vector3(...n.subarray(i+j*3,i+j*3+3));shades.push(.42+.65*Math.max(0,normal.dot(key))+.20*Math.max(0,normal.dot(fill)));}
    const x0=Math.max(0,Math.floor(Math.min(...pts.map(v=>v[0])))),x1=Math.min(W-1,Math.ceil(Math.max(...pts.map(v=>v[0]))));
    const y0=Math.max(0,Math.floor(Math.min(...pts.map(v=>v[1])))),y1=Math.min(H-1,Math.ceil(Math.max(...pts.map(v=>v[1]))));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const a=edge(pts[1],pts[2],x+.5,y+.5)/area,b=edge(pts[2],pts[0],x+.5,y+.5)/area,c=1-a-b;
      if(a<0||b<0||c<0)continue;const z=a*pts[0][2]+b*pts[1][2]+c*pts[2][2],idx=y*W+x;
      if(z>=depth[idx])continue;depth[idx]=z;const shade=a*shades[0]+b*shades[1]+c*shades[2];
      for(let k=0;k<3;k++)pixels[idx*3+k]=Math.min(255,Math.round(255*Math.pow(color[k]*shade,1/2.2)));
    }count++;
  }
}
await writeFile('/private/tmp/sole-studio-01.ppm',Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`),pixels]));
console.log(`Inspected GLB v2: ${count} triangles, ${gltf.materials.length} materials, ${file.length} bytes. Rendered 1200×900 preview.`);
