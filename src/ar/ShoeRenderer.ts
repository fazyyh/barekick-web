import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { FootPose } from '../hooks/useFootTracking';
import type { Shoe } from '../models/shoeCatalog';

type Calibration = { scale: number; x: number; y: number; rotation: number };
type Rig = { group: THREE.Group; shadow: THREE.Mesh; upper: THREE.Mesh; sole: THREE.Mesh; accent: THREE.Mesh; debug: THREE.Group; alpha: number; model?: THREE.Object3D };
export class ShoeRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 2000);
  private loadVersion = 0;
  private rigs: Rig[] = [];
  private width = 1;
  private height = 1;
  private forward = new THREE.Vector3(0, 0, 1);
  private direction = new THREE.Vector3();
  private sideways = new THREE.Vector3();
  private normal = new THREE.Vector3();
  private basis = new THREE.Matrix4();
  private orientation = new THREE.Quaternion();
  private correction = new THREE.Quaternion();
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x665a4b, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-2, 4, 6); this.scene.add(key);
    this.camera.position.z = 500;
    this.resize();
  }
  resize() { this.width = this.canvas.clientWidth || 1; this.height = this.canvas.clientHeight || 1; this.renderer.setSize(this.width, this.height, false); this.camera.left = -this.width / 2; this.camera.right = this.width / 2; this.camera.top = this.height / 2; this.camera.bottom = -this.height / 2; this.camera.updateProjectionMatrix(); }
  private makeRig(shoe: Shoe): Rig {
    const group = new THREE.Group();
    const material = (color: string, roughness = .68) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .02, transparent: true, opacity: .95 });
    const sole = new THREE.Mesh(new THREE.BoxGeometry(31, 82, 9), material('#f6f4ef'));
    sole.position.z = 3; sole.castShadow = true; group.add(sole);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material(shoe.color)); upper.scale.set(15, 37, 9); upper.position.set(0, 4, 9); upper.castShadow = true; group.add(upper);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material(shoe.color)); toe.scale.set(14.5, 17, 7.5); toe.position.set(0, 29, 8); group.add(toe);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(27, 2.8, 1.2), material(shoe.accent, .48)); accent.position.set(0, -25, 8); group.add(accent);
    for (let i = 0; i < 4; i++) { const lace = new THREE.Mesh(new THREE.BoxGeometry(15, 1.1, 1.1), material('#f9f7f2')); lace.position.set(0, 13 - i * 6, 16); lace.rotation.z = i % 2 ? .08 : -.08; group.add(lace); }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .14, depthWrite: false })); shadow.scale.set(20, 43, 1); shadow.position.z = -2; group.add(shadow);
    const debug = new THREE.Group();
    const debugMaterial = new THREE.LineBasicMaterial({ color: 0xc7fc69, transparent: true, opacity: .9 });
    const corners = [new THREE.Vector3(-22, -38, 23), new THREE.Vector3(22, -38, 23), new THREE.Vector3(22, 38, 23), new THREE.Vector3(-22, 38, 23)];
    const box = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(corners), debugMaterial);
    const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -34, 23), new THREE.Vector3(0, 34, 23)]), debugMaterial);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xc7fc69 });
    const heel = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), dotMat); heel.position.set(0, -34, 23);
    const debugToe = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), dotMat); debugToe.position.set(0, 34, 23);
    debug.add(box, axis, heel, debugToe); debug.visible = false; group.add(debug);
    this.scene.add(group);
    return { group, shadow, upper, sole, accent, debug, alpha: 0 };
  }
  setShoe(shoe: Shoe, modelUrl?: string, onStatus?: (state: string) => void) {
    const version = ++this.loadVersion;
    this.releaseRigs();
    this.rigs = [this.makeRig(shoe), this.makeRig(shoe)];
    this.rigs.forEach(r => { r.group.visible = false; });
    onStatus?.(modelUrl ? 'loading' : 'demo');
    if (modelUrl) {
      const loader = new GLTFLoader(); loader.load(modelUrl, gltf => {
        if (version !== this.loadVersion) { this.disposeObjects([gltf.scene]); return; }
        const bounds = new THREE.Box3().setFromObject(gltf.scene);
        const length = bounds.max.y - bounds.min.y;
        const center = bounds.getCenter(new THREE.Vector3());
        const factor = 82 / Math.max(length, .0001);
        this.rigs.forEach((r, index) => {
          r.group.children.filter(c => c !== r.shadow && c !== r.debug).forEach(c => c.visible = false);
          const model = gltf.scene.clone(true);
          model.traverse(o => { if (o instanceof THREE.Mesh) {
            o.material = (o.material as THREE.Material).clone();
            (o.material as THREE.Material).transparent = true;
          } });
          model.scale.set(index === 0 ? factor : -factor, factor, factor);
          model.position.set((index === 0 ? -1 : 1) * center.x * factor, -center.y * factor, -bounds.min.z * factor);
          r.group.add(model); r.model = model;
        });
        onStatus?.('ready');
      }, undefined, () => { if (version === this.loadVersion) onStatus?.('error'); });
    }
  }
  render(feet: FootPose[], calibration: Calibration, mirrored: boolean, size: number, sourceWidth: number, sourceHeight: number, showDebug: boolean) {
    const cover = Math.max(this.width / Math.max(1, sourceWidth), this.height / Math.max(1, sourceHeight));
    const drawnWidth = sourceWidth * cover, drawnHeight = sourceHeight * cover;
    for (let i = 0; i < this.rigs.length; i++) {
      const rig = this.rigs[i]; const foot = feet.find(f => f.side === (i === 0 ? 'left' : 'right'));
      if (!foot) {
        rig.alpha = Math.max(0, rig.alpha - .08);
        this.setOpacity(rig);
        rig.group.visible = rig.alpha > .02;
        continue;
      }
      rig.group.visible = true;
      const rawX = foot.x * drawnWidth - (drawnWidth - this.width) / 2;
      const rawY = foot.y * drawnHeight - (drawnHeight - this.height) / 2;
      const sx = mirrored ? this.width - rawX : rawX;
      const target = new THREE.Vector3(sx - this.width / 2 + calibration.x, this.height / 2 - rawY + calibration.y, 0);
      if (rig.alpha < .02) rig.group.position.copy(target); else rig.group.position.lerp(target, .42);
      const confidence = THREE.MathUtils.clamp((foot.confidence - .30) / .35, 0, 1);
      rig.alpha += (confidence - rig.alpha) * .24;
      const depth = THREE.MathUtils.clamp(foot.depthRatio || 0, -.65, .65);
      const horizontal = Math.sqrt(1 - depth * depth);
      rig.group.scale.setScalar(THREE.MathUtils.clamp((foot.length * sourceWidth * cover / 82) * 1.4 * calibration.scale * (size / 40) / horizontal, .15, 8));
      const screenAngle = mirrored ? Math.atan2(Math.sin(foot.angle), -Math.cos(foot.angle)) : foot.angle;
      this.direction.set(Math.cos(screenAngle) * horizontal, -Math.sin(screenAngle) * horizontal, depth);
      this.sideways.crossVectors(this.direction, this.forward).normalize();
      this.normal.crossVectors(this.sideways, this.direction).normalize();
      this.basis.makeBasis(this.sideways, this.direction, this.normal);
      this.orientation.setFromRotationMatrix(this.basis);
      this.correction.setFromAxisAngle(this.forward, calibration.rotation * Math.PI / 180);
      this.orientation.premultiply(this.correction);
      if (rig.alpha < .1) rig.group.quaternion.copy(this.orientation); else rig.group.quaternion.slerp(this.orientation, .28);
      rig.debug.visible = showDebug;
      this.setOpacity(rig);
      rig.group.visible = rig.alpha > .02;
    }
    this.renderer.render(this.scene, this.camera);
  }
  private setOpacity(rig: Rig) {
    rig.group.traverse(o => { if (o instanceof THREE.Mesh) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.transparent) m.opacity = rig.alpha * (o === rig.shadow ? .14 : 1); });
    } });
  }
  private disposeObjects(roots: THREE.Object3D[]) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    roots.forEach(root => root.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        materials.add(m); Object.values(m).forEach(v => { if (v instanceof THREE.Texture) textures.add(v); });
      });
    } }));
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  }
  private releaseRigs() {
    this.rigs.forEach(r => this.scene.remove(r.group)); this.disposeObjects(this.rigs.map(r => r.group)); this.rigs = [];
  }
  dispose() { this.loadVersion++; this.releaseRigs(); this.renderer.dispose(); }
}
