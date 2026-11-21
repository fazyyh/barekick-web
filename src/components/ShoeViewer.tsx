import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Shoe } from '../models/shoeCatalog';

export default function ShoeViewer({ shoe }: { shoe: Shoe }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Loading your pair…');
  useEffect(() => {
    const element = canvas.current!;
    let cancelled = false;
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas: element, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const camera = new THREE.PerspectiveCamera(34, 1, .001, 10);
    camera.up.set(0, 0, 1); camera.position.set(.38, .21, .25);
    const controls = new OrbitControls(camera, element);
    controls.target.set(0, 0, .055); controls.enableDamping = true;
    controls.minDistance = .30; controls.maxDistance = .85;
    controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = .5;
    const env = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    const environment = env.fromScene(room, .04); scene.environment = environment.texture;
    env.dispose(); room.dispose();
    scene.add(new THREE.HemisphereLight('#ffffff', '#8a8a8a', 1.1));
    const light = new THREE.DirectionalLight('#ffffff', 2); light.position.set(.3, .1, .6); scene.add(light);
    const resources = new THREE.Group(); scene.add(resources);
    setStatus('Loading your pair…');
    if (shoe.modelUrl) {
      new GLTFLoader().load(shoe.modelUrl, gltf => {
        if (cancelled) { disposeObject(gltf.scene); return; }
        const bounds = new THREE.Box3().setFromObject(gltf.scene), center = bounds.getCenter(new THREE.Vector3());
        const factor = .30 / Math.max(.001, bounds.max.y - bounds.min.y);
        gltf.scene.scale.setScalar(factor);
        gltf.scene.position.set(-center.x * factor, -center.y * factor, -bounds.min.z * factor);
        resources.add(gltf.scene); setStatus('');
      }, undefined, () => { if (!cancelled) setStatus('Could not load this model. Choose another pair.'); });
    } else {
      const sole = new THREE.Mesh(new THREE.CapsuleGeometry(.041, .21, 6, 24), new THREE.MeshStandardMaterial({ color: '#eee9df', roughness: .85 }));
      sole.scale.z = .23; sole.position.z = .013; resources.add(sole);
      const upper = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshStandardMaterial({ color: shoe.color, roughness: .7 }));
      upper.scale.set(.041, .139, .033); upper.position.z = .039; resources.add(upper);
      for (let i = 0; i < 5; i++) {
        const lace = new THREE.Mesh(new THREE.BoxGeometry(.038, .003, .003), new THREE.MeshStandardMaterial({ color: '#f8f4ec' }));
        lace.position.set(0, .035 - i * .015, .071); resources.add(lace);
      }
      setStatus('Demo geometry · not the branded product');
    }
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => {
      cancelled = true; observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose();
      disposeObject(resources); environment.dispose(); renderer.dispose();
    };
  }, [shoe]);
  return <div className="product-viewer"><canvas ref={canvas} aria-label={`Rotate and zoom ${shoe.name} in 3D`}/><span className="viewer-hint">{status || 'Drag to rotate · Pinch to zoom'}</span></div>;
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(o => { if (o instanceof THREE.Mesh) {
    geometries.add(o.geometry);
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => {
      materials.add(m); Object.values(m).forEach(v => { if (v instanceof THREE.Texture) textures.add(v); });
    });
  } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}
