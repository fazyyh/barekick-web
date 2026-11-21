// Single-view reconstruction: visible side uses the supplied photograph; hidden surfaces are inferred.
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { readFile, writeFile } from 'node:fs/promises';
globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => {this.result=result;this.onloadend?.();}); } };
const shoe=new T.Group();shoe.name='Orange_Reference_Sneaker';
function material(name,color,roughness=.75){return new T.MeshStandardMaterial({name,color,roughness,metalness:0});}
const photo=material('Photograph projected leather side','#ffffff',.84);
const photoRubber=material('Photograph projected midsole','#ffffff',.9);
const orange=material('Inferred orange leather','#e86637',.72);
const lightOrange=material('Inferred peach toe leather','#ef9169',.8);
const lining=material('Inferred orange padded lining','#d77c56',.94);
const white=material('White cotton laces','#eeeae2',.95);
const tongueMat=material('White padded tongue','#dadbd6',.9);
const black=material('Black rubber','#171616',.94);
const outsole=material('Orange outsole rubber','#de6235',.97);
const recess=material('Perforation recesses','#8d4933',.97);
const thread=material('Orange stitching','#b94c2d',.95);
const base=.024,pxPerMetre=2113;
const profile=[[-.148,.002,.076],[-.139,.025,.094],[-.127,.033,.102],[-.10,.036,.091],[-.075,.037,.089],[-.05,.038,.103],[-.025,.039,.108],[0,.043,.097],[.035,.047,.082],[.065,.049,.071],[.10,.048,.064],[.13,.039,.061],[.148,.020,.049],[.156,.001,.035]];
function last(y){let i=0;while(i<profile.length-2&&y>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1),s=t*t*(3-2*t);return [T.MathUtils.lerp(a[1],b[1],s),T.MathUtils.lerp(a[2],b[2],s)];}
function soleLift(y){return .009*Math.pow(T.MathUtils.clamp((y-.045)/.115,0,1),2);}
function center(y){return -.003*Math.exp(-(((y-.065)/.07)**2));}
function surface(y,a){const [w,h]=last(y),bottom=base+soleLift(y);return [center(y)+w*Math.cos(a),y,bottom+(h-bottom)*Math.pow(Math.max(0,Math.sin(a)),.32)];}
function uvFor(x,y,z){return [T.MathUtils.clamp(850-(y+.145)*pxPerMetre,232,842)/1108,(728-z*pxPerMetre)/1036];}
function mesh(name,g,m,p){const obj=new T.Mesh(g,m);obj.name=name;if(p)obj.position.set(...p);shoe.add(obj);return obj;}
function tube(name,points,radius,mat,steps=22,closed=false){return mesh(name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed),steps,radius,6,closed),mat);}
// Split upper into photo-textured sides and inferred top. Cut a real opening in the collar.
function upper(name,a0,a1,mat){
  const pos=[],uv=[],idx=[],rows=100,cols=24;
  for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const y=T.MathUtils.lerp(-.148,.156,i/rows),a=T.MathUtils.lerp(a0,a1,j/cols),p=surface(y,a);pos.push(...p);uv.push(...uvFor(...p));}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
    const y=T.MathUtils.lerp(-.148,.156,(i+.5)/rows),a=T.MathUtils.lerp(a0,a1,(j+.5)/cols),p=surface(y,a);
    if(((p[0]-center(y))/.027)**2+((y+.091)/.041)**2<1)continue;
    const k=i*(cols+1)+j;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(name,g,mat);
}
upper('Photo textured outer upper',0,1.15,photo);
upper('Inferred upper crown',1.15,Math.PI-1.15,lightOrange);
upper('Mirrored reference inner upper',Math.PI-1.15,Math.PI,photo);
const outline=new T.CatmullRomCurve3([[-.028,-.148,0],[.024,-.148,0],[.037,-.112,0],[.04,-.04,0],[.049,.035,0],[.050,.093,0],[.032,.143,0],[-.002,.159,0],[-.038,.141,0],[-.053,.087,0],[-.048,.025,0],[-.038,-.069,0]].map(p=>new T.Vector3(...p)),true);
const shape=new T.Shape(outline.getPoints(96).map(p=>new T.Vector2(p.x,p.y)));
function sole(name,z,depth,mat){
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.0014,bevelThickness:.001,bevelSegments:3,steps:1});
  const p=g.attributes.position;const uv=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),zz=p.getZ(i)+z+soleLift(y);p.setZ(i,zz);uv.push(...uvFor(x,y,zz));}
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();mesh(name,g,mat);
}
sole('Orange rubber outsole',.002,.0055,outsole);
sole('Photograph textured black cupsole',.008,.0155,photoRubber);
// Inferred padded collar fits the actual cutout in the upper surface.
const rim=[];for(let i=0;i<80;i++){const a=i/80*2*Math.PI,y=-.091+.041*Math.sin(a),x=.027*Math.cos(a),[w]=last(y),theta=Math.acos(T.MathUtils.clamp(x/w,-1,1));const p=surface(y,theta);rim.push([p[0],y,p[2]-.001]);}
tube('Orange padded collar',rim,.0035,lining,96,true);
tube('White collar piping',rim.map(([x,y,z])=>[x*1.02,y,z+.0018]),.0009,tongueMat,96,true);
const inside=mesh('Inferred inner footbed',new T.SphereGeometry(1,32,16),lining,[0,-.09,.046]);inside.scale.set(.027,.040,.005);
// Inner collar lining wall, following its varying rim height.
const wallPos=[],wallIdx=[];
for(let i=0;i<=80;i++){const r=rim[i%80];wallPos.push(r[0],r[1],r[2]-.002,r[0]*.95,r[1],.047);if(i<80){const k=i*2;wallIdx.push(k,k+1,k+2,k+1,k+3,k+2);}}
const wallGeo=new T.BufferGeometry();wallGeo.setAttribute('position',new T.Float32BufferAttribute(wallPos,3));wallGeo.setIndex(wallIdx);wallGeo.computeVertexNormals();const wallMat=lining.clone();wallMat.side=T.DoubleSide;mesh('Inner collar lining walls',wallGeo,wallMat);
// Padded white tongue: visible above the orange eyestays in the photo.
const tc=new T.CatmullRomCurve3([new T.Vector3(0,-.057,.135),new T.Vector3(0,-.043,.124),new T.Vector3(0,-.009,.107),new T.Vector3(0,.033,.089),new T.Vector3(0,.064,.077)]);
const tpos=[],tidx=[];for(let i=0;i<=36;i++){const p=tc.getPoint(i/36);const w=.0195*(.85+.15*Math.sin(i/36*Math.PI));for(let j=0;j<=12;j++){const x=(j/12*2-1)*w;tpos.push(x,p.y,p.z+.002*Math.cos(x/w*Math.PI/2));if(i<36&&j<12){const k=i*13+j;tidx.push(k,k+1,k+13,k+1,k+14,k+13);}}}
const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(tpos,3));tg.setIndex(tidx);tg.computeVertexNormals();mesh('White padded tongue',tg,tongueMat);
const label=mesh('Orange tongue patch',new T.BoxGeometry(.019,.011,.001),orange,[0,-.053,.135]);label.rotation.x=-.45;
// Flat cotton laces, rounded at the ends rather than thick rope loops.
for(let row=0;row<7;row++){
  const y=-.034+row*.0145,z=last(y)[1]+.007;
  for(const side of [-1,1]){
    const p=surface(y,side===1?1.03:Math.PI-1.03);p[2]+=.003;
    const eye=mesh('Dark lace eyelet',new T.CircleGeometry(.0015,12),recess,p);eye.rotation.y=side*.5;
  }
  for(const d of [-1,1])tube('Crossed white cotton lace',[[-.0205,y+d*.004,z-.003],[0,y,z+.002],[.0205,y-d*.004,z-.003]],.0016,white,14);
}
for(const side of [-1,1]){
  const stay=[];for(let i=0;i<32;i++){const y=-.039+i*.0034;stay.push([side*.0215,y,last(y)[1]+.002]);}
  tube('Raised orange leather eyestay',stay,.0027,orange,42);
}
// Toe perforations use recessed dark disks on the inferred crown only.
for(let row=0;row<5;row++)for(let col=-2;col<=2;col++){
  const y=.085+row*.009,x=col*.009,[w]=last(y);if(Math.abs(x)>w*.5)continue;
  const a=Math.acos((x-center(y))/w),p=surface(y,a);p[2]+=.0003;
  const hole=mesh('Toe perforation',new T.CircleGeometry(.00085,10),recess,p);hole.rotation.y=-x/w*.3;
}
// Forefoot mudguard top seam; the side stitching and logo are in the reference texture.
for(const side of [-1,1]){
  const pts=[];for(let i=0;i<35;i++){const y=.057+i*.0024,p=surface(y,side===1?.83:Math.PI-.83);p[2]+=.0005;pts.push(p);}tube('Toe guard rolled seam',pts,.00065,orange,40);
}
for(let row=0;row<19;row++){
  const y=-.136+row*.015,[w]=last(y);
  for(let col=-3;col<=3;col++){const x=col*.012;if(Math.abs(x)>w*.88)continue;const lug=mesh('Inferred outsole grip',new T.BoxGeometry(.010,.004,.0018),outsole,[x,y,soleLift(y)]);lug.rotation.z=col<0?.38:-.38;}
}
shoe.userData={source:'User supplied side photograph',method:'Photo projection with inferred top, opposite side, sole and width',toeAxis:'+Y',upAxis:'+Z',units:'metres',scale:'Assumed 30 cm length; not measured',license:'Reference image and depicted branding retain their original rights; geometry authored for local testing'};
shoe.updateMatrixWorld(true);
const batches=new Map();
for(const part of [...shoe.children]){
  let g=part.geometry.clone();g.applyMatrix4(part.matrixWorld);if(g.index)g=g.toNonIndexed();
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(!batches.has(part.material))batches.set(part.material,[]);batches.get(part.material).push(g);shoe.remove(part);
}
for(const [mat,geos]of batches)mesh(mat.name,mergeVertices(mergeGeometries(geos),.000001),mat);
const scene=new T.Scene();scene.add(shoe);
let buffer=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true}));
// Embed the photograph directly in GLB, retaining original pixels and avoiding browser canvas dependencies.
const jsLength=buffer.readUInt32LE(12),json=JSON.parse(buffer.toString('utf8',20,20+jsLength));
const oldBin=buffer.subarray(28+jsLength),png=await readFile(new URL('../public/models/orange-reference.png',import.meta.url));
const imageOffset=Math.ceil(oldBin.length/4)*4;const binary=Buffer.alloc(Math.ceil((imageOffset+png.length)/4)*4);oldBin.copy(binary);png.copy(binary,imageOffset);
json.bufferViews.push({buffer:0,byteOffset:imageOffset,byteLength:png.length});
json.images=[{name:'User side photograph',bufferView:json.bufferViews.length-1,mimeType:'image/png'}];
json.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];json.textures=[{sampler:0,source:0}];
for(const m of json.materials)if(m.name.startsWith('Photograph projected'))m.pbrMetallicRoughness.baseColorTexture={index:0,texCoord:0};
json.buffers[0].byteLength=binary.length;
const str=Buffer.from(JSON.stringify(json)),jpad=Buffer.alloc(Math.ceil(str.length/4)*4,32);str.copy(jpad);
const head=Buffer.alloc(20);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+jpad.length+binary.length,8);head.writeUInt32LE(jpad.length,12);head.writeUInt32LE(0x4e4f534a,16);
const binHead=Buffer.alloc(8);binHead.writeUInt32LE(binary.length);binHead.writeUInt32LE(0x004e4942,4);
buffer=Buffer.concat([head,jpad,binHead,binary]);
await writeFile(new URL('../public/models/orange-reference-shoe.glb',import.meta.url),buffer);
let triangles=0;shoe.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
console.log(JSON.stringify({triangles,batches:shoe.children.length,bytes:buffer.length,embeddedPhotoBytes:png.length}));
