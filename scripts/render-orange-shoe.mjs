import { readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import * as T from 'three';
const file=await readFile(new URL('../public/models/orange-reference-shoe.glb',import.meta.url));
const jsLength=file.readUInt32LE(12),gltf=JSON.parse(file.toString('utf8',20,20+jsLength)),bin=file.subarray(28+jsLength);
if(file.readUInt32LE(0)!==0x46546c67||file.readUInt32LE(4)!==2||file.readUInt32LE(8)!==file.length)throw Error('Invalid GLB header');
function values(id){const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],n=a.type==='VEC3'?3:a.type==='VEC2'?2:1,off=(v.byteOffset||0)+(a.byteOffset||0);const bytes=a.componentType===5126?4:a.componentType===5125?4:2,view=new DataView(bin.buffer,bin.byteOffset+off,a.count*n*bytes);return Array.from({length:a.count*n},(_,i)=>a.componentType===5126?view.getFloat32(i*4,true):bytes===4?view.getUint32(i*4,true):view.getUint16(i*2,true));}
const png=await readFile(new URL('../public/models/orange-reference.png',import.meta.url));
const width=png.readUInt32BE(16),height=png.readUInt32BE(20),channels=png[25]===6?4:3;if(png[24]!==8||![2,6].includes(png[25]))throw Error('Requires 8-bit RGB/RGBA PNG');
const idat=[];for(let i=8;i<png.length;){const size=png.readUInt32BE(i);if(png.toString('ascii',i+4,i+8)==='IDAT')idat.push(png.subarray(i+8,i+8+size));i+=12+size;}
const data=inflateSync(Buffer.concat(idat)),image=Buffer.alloc(width*height*channels),stride=width*channels;
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
for(let y=0;y<height;y++){const filter=data[y*(stride+1)];for(let x=0;x<stride;x++){const a=x>=channels?image[y*stride+x-channels]:0,b=y?image[(y-1)*stride+x]:0,c=y&&x>=channels?image[(y-1)*stride+x-channels]:0;const predictor=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];image[y*stride+x]=(data[y*(stride+1)+1+x]+predictor)&255;}}
const W=1200,H=900,pixels=new Uint8Array(W*H*3),depth=new Float32Array(W*H).fill(Infinity);
for(let y=0;y<H;y++)for(let x=0;x<W;x++)pixels.set([32,33,30],(y*W+x)*3);
const eye=new T.Vector3(.46,.19,.23),target=new T.Vector3(0,0,.06),f=target.clone().sub(eye).normalize(),right=new T.Vector3().crossVectors(f,new T.Vector3(0,0,1)).normalize(),up=new T.Vector3().crossVectors(right,f),focal=H/(2*Math.tan(32*Math.PI/360));
const key=new T.Vector3(.6,.2,1).normalize();
const project=(x,y,z)=>{const d=new T.Vector3(x,y,z).sub(eye),dist=d.dot(f);return[W/2+d.dot(right)/dist*focal,H/2-d.dot(up)/dist*focal,dist];};
const edge=(a,b,x,y)=>(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
let count=0;
for(const mesh of gltf.meshes)for(const prim of mesh.primitives){
  const p=values(prim.attributes.POSITION),n=values(prim.attributes.NORMAL),uv=values(prim.attributes.TEXCOORD_0),indices=prim.indices!==undefined?values(prim.indices):Array.from({length:p.length/3},(_,i)=>i);
  const mat=gltf.materials[prim.material].pbrMetallicRoughness,color=mat.baseColorFactor??[1,1,1,1],textured=!!mat.baseColorTexture;
  if(!p.every(Number.isFinite))throw Error('Invalid positions');
  for(let i=0;i<indices.length;i+=3){const vi=indices.slice(i,i+3),pts=vi.map(k=>project(...p.slice(k*3,k*3+3))),area=edge(pts[0],pts[1],pts[2][0],pts[2][1]);if(Math.abs(area)<.001)continue;
    const shades=vi.map(k=>.62+.42*Math.max(0,new T.Vector3(...n.slice(k*3,k*3+3)).dot(key)));
    const x0=Math.max(0,Math.floor(Math.min(...pts.map(v=>v[0])))),x1=Math.min(W-1,Math.ceil(Math.max(...pts.map(v=>v[0])))),y0=Math.max(0,Math.floor(Math.min(...pts.map(v=>v[1])))),y1=Math.min(H-1,Math.ceil(Math.max(...pts.map(v=>v[1]))));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const a=edge(pts[1],pts[2],x+.5,y+.5)/area,b=edge(pts[2],pts[0],x+.5,y+.5)/area,c=1-a-b;if(a<0||b<0||c<0)continue;
      const z=a*pts[0][2]+b*pts[1][2]+c*pts[2][2],idx=y*W+x;if(z>=depth[idx])continue;depth[idx]=z;
      const shade=a*shades[0]+b*shades[1]+c*shades[2];let tex=0;
      if(textured){const u=a*uv[vi[0]*2]+b*uv[vi[1]*2]+c*uv[vi[2]*2],v=a*uv[vi[0]*2+1]+b*uv[vi[1]*2+1]+c*uv[vi[2]*2+1];tex=(Math.max(0,Math.min(height-1,Math.round(v*height)))*width+Math.max(0,Math.min(width-1,Math.round(u*width))))*channels;}
      for(let k=0;k<3;k++){const linear=textured?Math.pow(image[tex+k]/255,2.2):color[k];pixels[idx*3+k]=Math.min(255,Math.round(255*Math.pow(linear*shade,1/2.2)));}
    }count++;
  }
}
await writeFile('/private/tmp/orange-reference-shoe.ppm',Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`),pixels]));
console.log(`Valid GLB v2; ${count} rendered triangles, ${gltf.materials.length} materials, ${gltf.images.length} embedded photo. Texture ${width}×${height}.`);
