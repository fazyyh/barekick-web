// Original SOLE Studio court sneaker. All geometry is authored here; no third-party assets.
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { writeFile, mkdir } from 'node:fs/promises';

// GLTFExporter uses the browser FileReader interface for its binary buffer.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const shoe = new T.Group(); shoe.name = 'SOLE_Studio_01_Left';
const materials = {};
function mat(name, color, roughness = .7, metalness = 0) {
  const m = new T.MeshStandardMaterial({ name, color, roughness, metalness }); materials[name] = m; return m;
}
const leather = mat('Ivory pebbled leather', '#e8e2d5', .72);
const suede = mat('Warm stone suede overlays', '#c7baa5', .94);
const heelMat = mat('Forest leather heel tab', '#3e5145', .69);
const rubber = mat('Warm white rubber midsole', '#e9dfcc', .83);
const gum = mat('Natural gum outsole', '#8c6242', .9);
const treadMat = mat('Dark gum tread', '#745036', .95);
const laceMat = mat('Cotton laces and stitching', '#f2ead9', .98);
const lining = mat('Dark padded lining', '#393d34', 1);
const thread = mat('Sand stitching', '#a59882', .96);
const eyeMat = mat('Brushed brass eyelets', '#a99874', .36, .65);
const accent = mat('Terracotta tongue label', '#aa6245', .82);
const perforation = mat('Perforation recesses', '#857d6d', 1);
function mesh(name, geom, material, position) {
  const m = new T.Mesh(geom, material); m.name = name;
  if (position) m.position.set(...position);
  m.castShadow = true; m.receiveShadow = true; shoe.add(m); return m;
}
function tube(name, points, radius, material, segments = 30, closed = false) {
  return mesh(name, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), closed), segments, radius, 6, closed), material);
}
// Left-foot last, heel -Y / toe +Y / up +Z. Dimensions in metres.
const sections = [
  [-.144,.003,.043],[-.135,.027,.074],[-.118,.035,.081],[-.09,.037,.068],
  [-.06,.038,.071],[-.025,.041,.067],[.015,.045,.053],[.055,.049,.037],
  [.095,.048,.030],[.125,.041,.024],[.146,.025,.014],[.156,.001,.002],
];
const base = .027;
function section(y) {
  let i = 0; while (i < sections.length - 2 && y > sections[i + 1][0]) i++;
  const a = sections[i], b = sections[i + 1], t = T.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
  const smooth = t * t * (3 - 2 * t);
  return [T.MathUtils.lerp(a[1], b[1], smooth), T.MathUtils.lerp(a[2], b[2], smooth)];
}
function center(y) { return -.0035 * Math.exp(-Math.pow((y - .07) / .075, 2)); }
function surface(y, theta, lift = 0) {
  const [w, h] = section(y);
  return [center(y) + w * Math.cos(theta) * (1 + lift), y, base + h * Math.pow(Math.max(0, Math.sin(theta)), .72) + lift * .1];
}
function shell(name, y0, y1, a0, a1, material, lift = 0) {
  const pos = [], uv = [], indices = [], rows = 64, cols = 40;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    pos.push(...surface(T.MathUtils.lerp(y0,y1,i/rows), T.MathUtils.lerp(a0,a1,j/cols), lift)); uv.push(j/cols,i/rows);
    if(i < rows && j < cols) { const a = i*(cols+1)+j, b = a+cols+1; indices.push(a,b,a+1,a+1,b,b+1); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(indices); g.computeVertexNormals();
  // The collar is a separate hollow ring; other panels are surface geometry.
  return mesh(name,g,material);
}
// Closed sculpted sole outline, using a smooth spline for rounded toe/heel.
const outline = new T.CatmullRomCurve3([
  [-.029,-.141,0],[.026,-.141,0],[.038,-.105,0],[.04,-.045,0],[.049,.035,0],
  [.048,.105,0],[.029,.148,0],[-.006,.158,0],[-.04,.14,0],[-.054,.09,0],[-.048,.025,0],[-.04,-.06,0],
].map(p=>new T.Vector3(...p)),true);
const outlinePts = outline.getPoints(100);
const shape = new T.Shape(outlinePts.map(p=>new T.Vector2(p.x,p.y)));
function sole(name,z,depth,scale,material) {
  const g = new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.0022,bevelThickness:.0018,curveSegments:30});
  const m = mesh(name,g,material,[0,0,z]); m.scale.set(scale,scale,1); return m;
}
sole('Gum outsole',.003,.006,1.025,gum);
sole('Sculpted rubber midsole',.010,.015,1,rubber);
shell('Leather forefoot',-.063,.156,0,Math.PI,leather);
shell('Leather heel counter',-.144,-.130,0,Math.PI,leather);
shell('Outer collar quarter',-.130,-.055,0,1.20,leather);
shell('Inner collar quarter',-.130,-.055,Math.PI-1.20,Math.PI,leather);
// Leave the centre of the rear foot open, making a genuine visible collar opening.
shell('Outer waist suede panel',-.113,.059,0,.78,suede,.012);
shell('Inner waist suede panel',-.113,.059,Math.PI-.78,Math.PI,suede,.012);
shell('Suede toe guard',.119,.156,0,Math.PI,suede,.012);
shell('Heel reinforcement',-.144,-.127,0,Math.PI,heelMat,.02);

// Padded collar as an elliptical tube with a dark inset footbed inside.
const collarPoints = [];
for(let i=0;i<64;i++) { const a=i/64*Math.PI*2; collarPoints.push([.028*Math.cos(a),-.091+.040*Math.sin(a),.104-.009*Math.sin(a)]); }
tube('Padded collar rim',collarPoints,.0055,leather,96,true);
const innerPoints = collarPoints.map(([x,y,z])=>[x*.91,y,z-.003]);
tube('Collar lining lip',innerPoints,.004,lining,96,true);
const footbed = mesh('Recessed dark footbed',new T.SphereGeometry(1,32,16),lining,[0,-.091,.073]); footbed.scale.set(.025,.037,.007);
// Vertical inside lining, preventing a hollow view through the shoe.
const innerWall = mesh('Inner collar wall',new T.CylinderGeometry(1,1,1,48,1,true),lining,[0,-.091,.086]);
innerWall.rotation.x = Math.PI/2; innerWall.scale.set(.024,.032,.027); lining.side = T.DoubleSide;

// Tongue follows the instep curve, with rounded padded upper end.
const tonguePts = [new T.Vector3(0,-.062,.112),new T.Vector3(0,-.035,.106),new T.Vector3(0,.007,.087),new T.Vector3(0,.053,.064)];
const tongueCurve = new T.CatmullRomCurve3(tonguePts);
const tPos=[], tIdx=[];
for(let i=0;i<=32;i++){ const p=tongueCurve.getPoint(i/32); const width=.020*(.88+.12*Math.sin(i/32*Math.PI)); for(let j=0;j<=12;j++){const x=(j/12*2-1)*width;tPos.push(x,p.y,p.z+.002*Math.cos(x/width*Math.PI/2));if(i<32&&j<12){const k=i*13+j;tIdx.push(k,k+1,k+13,k+1,k+14,k+13);}} }
const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(tPos,3));tg.setIndex(tIdx);tg.computeVertexNormals();mesh('Padded leather tongue',tg,leather);
const label = mesh('Woven terracotta tongue label',new T.BoxGeometry(.023,.016,.0016,1,1,1),accent,[0,-.046,.110]); label.rotation.x=-.30;
for(let i=0;i<3;i++) tube('Tongue label woven mark '+i,[[-.006+i*.006,-.049,.113],[-.006+i*.006,-.041,.1105]],.00065,laceMat,3);

// Eye stays, brass eyelets, six crossed lace rows, bow loops and lace tips.
for(const side of [-1,1]) {
  const pts=[]; for(let i=0;i<6;i++){const y=-.041+i*.0165;const p=surface(y,side===1?.98:Math.PI-.98,.018);pts.push(p);}
  tube((side===1?'Outer':'Inner')+' leather eyestay',pts,.0046,suede,40);
  for(let i=0;i<6;i++) {
    const y=-.041+i*.0165, p=surface(y,side===1?1.0:Math.PI-1.0,.03);
    const eye=mesh('Brass eyelet '+side+' '+i,new T.TorusGeometry(.0021,.00065,6,12),eyeMat,p);eye.rotation.y=side*.5;
  }
}
for(let i=0;i<6;i++) {
  const y=-.041+i*.0165; const z=surface(y,Math.PI/2)[2]+.004;
  for(const d of [-1,1]) tube('Cotton crossed lace '+i+' '+d,[[-.021,y+d*.004,z-.003],[0,y,z+.005],[.021,y-d*.004,z-.003]],.00135,laceMat,12);
}
for(const side of [-1,1]) {
  tube('Lace bow loop '+side,[[0,-.034,.115],[side*.022,-.025,.122],[side*.027,-.040,.117],[side*.012,-.044,.114],[0,-.034,.115]],.00125,laceMat,28);
  tube('Lace tail '+side,[[0,-.034,.116],[side*.011,-.018,.115],[side*.024,.005,.107]],.0013,laceMat,16);
  tube('Lace aglet '+side,[[side*.024,.005,.107],[side*.025,.010,.104]],.0015,heelMat,3);
}
// Actual inset toe perforation marks and collars, in staggered rows.
for(let row=0;row<5;row++) for(let col=-2;col<=2;col++) {
  const y=.079+row*.010, x=col*.010+(row%2?.002:0);const [w,h]=section(y);
  if(Math.abs(x)>w*.72)continue;
  const z=base+h*Math.pow(Math.sqrt(1-Math.pow((x-center(y))/w,2)),.72)+.0003;
  const hole=mesh('Toe perforation '+row+' '+col,new T.CircleGeometry(.00105,10),perforation,[x,y,z]);
  hole.rotation.y=-(x/w)*.35;
}
// Embossed abstract original side badges (not a third-party logo).
for(const side of [-1,1]) {
  for(let i=0;i<3;i++) {
    const y=-.027+i*.012;
    tube('Studio side chevron '+side+' '+i,[[side*.040,y-.007,.043],[side*.044,y,.055],[side*.045,y+.007,.048]],.0018,heelMat,12);
  }
  // Dashed double seam along the side overlay.
  for(let i=0;i<38;i++) {
    const y=-.119+i*.006;
    for(const theta of [side===1?.25:Math.PI-.25,side===1?.33:Math.PI-.33]) {
      const p=surface(y,theta,.022), q=surface(y+.0029,theta,.022);
      tube('Individual upper stitch', [p,q],.00036,thread,2);
    }
  }
}
for(let i=0;i<100;i++) {
  const p=outline.getPoint(i/100),q=outline.getPoint((i+.53)/100);
  tube('Midsole welt stitch',[[p.x*1.018,p.y*1.018,.020],[q.x*1.018,q.y*1.018,.020]],.00038,thread,2);
}
// Outsole grip blocks, heel grooves and forefoot flex grooves.
for(let row=0;row<17;row++){
  const y=-.128+row*.016;const [w]=section(y);
  for(let col=-2;col<=2;col++) {const x=col*.016;if(Math.abs(x)>w*.87)continue;const b=mesh('Herringbone outsole lug',new T.BoxGeometry(.013,.005,.002),treadMat,[x,y,.0005]);b.rotation.z=(col<=0?1:-1)*.45;}
}
for(let i=0;i<6;i++){
  const y=.037+i*.016;
  for(const side of [-1,1]) tube('Midsole forefoot flex detail',[[side*.049,y,.0105],[side*.048,y+.003,.018]],.00055,gum,3);
}
shoe.userData={author:'SOLE AR original procedural design',license:'CC0-1.0',units:'metres',toeAxis:'+Y',upAxis:'+Z',foot:'left',description:'Ivory court sneaker with stone suede, forest accents, gum tread, brass eyelets, crossed cotton laces and individual stitches.'};
shoe.updateMatrixWorld(true);
// Bake transforms and batch by material: 13 draw calls instead of hundreds on mobile.
const batches = new Map();
for (const part of [...shoe.children]) {
  let geometry=part.geometry.clone(); geometry.applyMatrix4(part.matrixWorld);
  if(geometry.index){const flat=geometry.toNonIndexed();geometry.dispose();geometry=flat;}
  geometry.deleteAttribute('uv');
  if(!batches.has(part.material)) batches.set(part.material,[]);
  batches.get(part.material).push(geometry);shoe.remove(part);part.geometry.dispose();
}
for(const [material, geometries] of batches){mesh(material.name,mergeGeometries(geometries),material);geometries.forEach(g=>g.dispose());}
const scene=new T.Scene();scene.add(shoe);
const exporter=new GLTFExporter();
const result=await exporter.parseAsync(scene,{binary:true,onlyVisible:true});
await mkdir(new URL('../public/models/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/models/sole-studio-01.glb',import.meta.url),Buffer.from(result));
let triangles=0;shoe.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
console.log(JSON.stringify({meshes:shoe.children.length,triangles,bytes:result.byteLength,bounds:new T.Box3().setFromObject(shoe).getSize(new T.Vector3())}));
