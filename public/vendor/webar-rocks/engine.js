/* SOLE AR integration. Upstream runtime and helper remain unmodified; see LICENSE. */
'use strict';
let initialized=false, starting=false, three=null, config={}, model=null, loadVersion=0, lastReport=0, frames=0, lastFps=performance.now(), fps=0, captureRequested=false;
const send=(type,extra={})=>parent.postMessage({source:'sole-webar',type,...extra},location.origin);
const canvases=[document.getElementById('video'),document.getElementById('shoes')];
function dimensions(){const dpr=Math.min(devicePixelRatio||1,2);return [Math.round(innerWidth*dpr),Math.round(innerHeight*dpr)];}
function size(){const [w,h]=dimensions();if(initialized)HandTrackerThreeHelper.resize(w,h);else canvases.forEach(c=>{c.width=w;c.height=h;});}
function fail(error){send('error',{message:error instanceof Error?error.message:String(error)});}
function dispose(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.isMesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ms.add(m);Object.values(m).forEach(v=>{if(v&&v.isTexture)ts.add(v);});});}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
let installed=[];
function clearModels(){if(!three)return;const objects=[];[...three.trackersRight,...three.trackersLeft].forEach(t=>objects.push(...t.children));HandTrackerThreeHelper.clear_threeObjects(true);objects.forEach(dispose);installed=[];}
function fit(){if(!model||!three)return;clearModels();const b=new THREE.Box3().setFromObject(model),c=b.getCenter(new THREE.Vector3()),factor=1.05/Math.max(.001,b.max.y-b.min.y),cal=config.calibration||{};
  const mesh=model.clone(true);mesh.scale.multiplyScalar(factor);mesh.position.set(-c.x*factor,-.05-c.y*factor,-.19-b.min.z*factor);
  const placement=new THREE.Group();placement.add(mesh);placement.scale.setScalar((cal.scale||1)*(config.size||40)/40);placement.position.set((cal.x||0)/400,(cal.y||0)/400,0);placement.rotation.z=(cal.rotation||0)*Math.PI/180;
  HandTrackerThreeHelper.add_threeObject(placement);
  // Geometric lower-leg occlusion in the trained model's foot coordinate system. Approximate, not segmentation.
  if(config.occlusion!==false){const g=new THREE.CylinderGeometry(.105,.105,.70,24);g.rotateX(Math.PI/2);const leg=new THREE.Mesh(g);leg.position.set(0,-.32,.43);leg.scale.setScalar((cal.scale||1)*(config.size||40)/40);leg.position.x+=(cal.x||0)/400;leg.position.y+=(cal.y||0)/400;HandTrackerThreeHelper.add_threeOccluder(leg);}
  [...three.trackersRight,...three.trackersLeft].forEach(t=>installed.push(...t.children));
}
function selectModel(){const version=++loadVersion;clearModels();if(model){dispose(model);model=null;}send('model',{status:'loading'});new THREE.GLTFLoader().load(config.modelUrl,gltf=>{if(version!==loadVersion){dispose(gltf.scene);return;}clearModels();if(model)dispose(model);model=gltf.scene;model.traverse(o=>{if(o.isMesh&&!o.geometry.index){o.geometry.setIndex(Array.from({length:o.geometry.attributes.position.count},(_,i)=>i));}});fit();send('model',{status:'ready'});},undefined,()=>send('model',{status:'error'}));}
function onTrack(raw){frames++;const now=performance.now();if(now-lastFps>=1000){fps=Math.round(frames*1000/(now-lastFps));frames=0;lastFps=now;}
  if(captureRequested){captureRequested=false;try{three.renderer.render(three.scene,three.camera);const out=document.createElement('canvas');out.width=canvases[0].width;out.height=canvases[0].height;const ctx=out.getContext('2d');ctx.drawImage(canvases[0],0,0);ctx.drawImage(canvases[1],0,0);send('capture',{url:out.toDataURL('image/png')});}catch(e){send('capture-error',{message:String(e)});}}
  if(now-lastReport<100)return;lastReport=now;
  const states=Array.isArray(raw)?raw:[raw];
  const feet=states.flatMap((d,i)=>{if(!d||!d.isDetected||!three.trackersParent[i].visible)return[];return[{side:d.isRightHand?'right':'left',x:(d.x+1)/2,y:(1-d.y)/2,confidence:d.detected,angle:d.rz||0,length:d.s,depthRatio:0}];});send('tracking',{feet,fps});
}
async function start(){if(starting)return;starting=true;size();send('loading');try{
  three=await HandTrackerThreeHelper.init({
    handTrackerCanvas:canvases[0],VTOCanvas:canvases[1],maxHandsDetected:2,enableFlipObject:true,cameraZoom:1,freeZRot:false,
    videoSettings:{facingMode:config.facing||'environment'},
    poseLandmarksLabels:['ankleBack','ankleOut','ankleIn','ankleFront','heelBackOut','heelBackIn','pinkyToeBaseTop','middleToeBaseTop','bigToeBaseTop'],
    NNsPaths:[config.footMode==='shoes'?'neuralNets/NN_FOOT_31.json':'neuralNets/NN_BAREFOOT_3.json'],threshold:config.footMode==='shoes'?.9:.6,
    scanSettings:{multiDetectionSearchSlotsRate:.5,multiDetectionMaxOverlap:.3,multiDetectionOverlapScaleXY:[.5,1],multiDetectionEqualizeSearchSlotScale:true,multiDetectionForceSearchOnOtherSide:true,multiDetectionForceChirality:1,disableIsRightHandNNEval:true,overlapFactors:[1,1,1],translationScalingFactors:[.3,.3,1],nScaleLevels:2,scale0Factor:.5},
    stabilizationSettings:{NNSwitchMask:{isRightHand:false,isFlipped:false}},landmarksStabilizerSpec:{minCutOff:.001,beta:5},hideTrackerIfDetectionLost:true,callbackTrack:onTrack
  });
  initialized=true;three.renderer.toneMapping=THREE.ACESFilmicToneMapping;three.renderer.outputEncoding=THREE.sRGBEncoding;three.scene.add(new THREE.HemisphereLight(0xffffff,0x666666,1.3));const light=new THREE.DirectionalLight(0xffffff,1.5);light.position.set(1,1,3);three.scene.add(light);
  send('ready');selectModel();size();
}catch(e){fail(e);}finally{starting=false;}}
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.source!=='sole-parent')return;const m=e.data;
  if(m.type==='start'){config=m.config;start();}
  if(m.type==='configure'){const previous=config;config=m.config;if(initialized){if(previous.modelUrl!==config.modelUrl)selectModel();else fit();}}
  if(m.type==='capture')captureRequested=true;
});
addEventListener('resize',size);
addEventListener('pagehide',()=>{loadVersion++;if(initialized)HandTrackerThreeHelper.destroy().catch(()=>{});});
