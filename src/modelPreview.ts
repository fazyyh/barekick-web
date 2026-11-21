import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './modelPreview.css';
import { shoes } from './models/shoeCatalog';

const selected = shoes.find(s => s.id === new URLSearchParams(location.search).get('shoe') && s.modelUrl) ?? shoes[0];
document.title = `${selected.name} — 3D shoe preview`;
document.querySelector('.caption h1')!.textContent = selected.name;
document.querySelector('.caption p')!.textContent = selected.id === 'orange-reference' ? 'SINGLE PHOTO · RECONSTRUCTED MODEL' : 'ORIGINAL 3D ASSET';
document.querySelector('.caption div')!.textContent = selected.id === 'orange-reference' ? 'Side photo texture. Top, inside and outsole approximated.' : 'Ivory leather. Stone suede. Forest details.';
const download = document.querySelector<HTMLAnchorElement>('.actions a')!;
download.href = selected.modelUrl!;
document.querySelector<HTMLAnchorElement>('.back')!.href = `/ar?product=${selected.id}`;
document.querySelector('.back')!.textContent = 'Try on in AR';

const canvas = document.querySelector('canvas')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#111111');
const environment = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = environment.fromScene(room, .04).texture;
room.dispose(); environment.dispose();
const camera = new THREE.PerspectiveCamera(36, 1, .001, 10);
camera.up.set(0, 0, 1); camera.position.set(.34, .35, .28);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, .05); controls.enableDamping = true;
controls.autoRotate = true; controls.autoRotateSpeed = .65;
controls.minDistance = .23; controls.maxDistance = .85;
controls.maxPolarAngle = Math.PI * .92; controls.update();
const key = new THREE.DirectionalLight('#ffffff', 3.5);
key.position.set(-.25, .2, .55); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -.4; key.shadow.camera.right = .4;
key.shadow.camera.top = .4; key.shadow.camera.bottom = -.4;
key.shadow.camera.near = .01; key.shadow.camera.far = 2;
key.shadow.bias = -.0002; scene.add(key);
const fill = new THREE.DirectionalLight('#ffffff', 1); fill.position.set(.3, -.4, .2); scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .23 }));
ground.position.z = -.003; ground.receiveShadow = true; scene.add(ground);
const status = document.querySelector('#status')!;
let model: THREE.Object3D | undefined;
new GLTFLoader().load(selected.modelUrl!, gltf => {
  model = gltf.scene;
  let triangles = 0, batches = 0;
  model.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; batches++; } });
  scene.add(model); status.textContent = `LOCAL GLB · ${Math.round(triangles / 1000)}K TRIANGLES · ${batches} MATERIAL BATCHES`;
}, undefined, error => { status.textContent = `Model failed to load: ${String(error)}`; });
document.querySelector('#spin')!.addEventListener('click', e => {
  controls.autoRotate = !controls.autoRotate;
  (e.target as HTMLButtonElement).textContent = controls.autoRotate ? 'Pause rotation' : 'Auto rotate';
});
let wireframe = false;
document.querySelector('#wireframe')!.addEventListener('click', e => {
  wireframe = !wireframe;
  model?.traverse(o => { if (o instanceof THREE.Mesh) (o.material as THREE.MeshStandardMaterial).wireframe = wireframe; });
  (e.target as HTMLButtonElement).textContent = wireframe ? 'Show materials' : 'Wireframe';
});
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
