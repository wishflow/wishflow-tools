import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import colorUrl from './assets/textures/Metal012_1K-JPG_Color.jpg?url';
import normalUrl from './assets/textures/Metal012_1K-JPG_NormalGL.jpg?url';
import roughnessUrl from './assets/textures/Metal012_1K-JPG_Roughness.jpg?url';
import { createBicycleModel, updateChainLinks, type BicycleLayer, type BicycleMaterials, type BicycleModel } from './bicycle-model';
import type { BicyclePartId } from './locales';

export type BicycleMode = 'inspect' | 'operate';
export type ViewerStatus = 'loading' | 'loaded' | 'error';
export type BicycleFeedback = {
  status: ViewerStatus;
  errorCode: '' | 'textures' | 'webgl' | 'build';
  selectedPartId: BicyclePartId | null;
  explosion: number;
  mode: BicycleMode;
  transitioning: boolean;
  speedKmh: number;
  gearIndex: number;
  riding: boolean;
  kickstand: boolean;
  fallen: boolean;
  steeringDegrees: number;
  frontBrake: number;
  rearBrake: number;
  layers: Record<BicycleLayer, boolean>;
};

export type BicycleSceneControls = {
  setMode(mode: BicycleMode): void;
  setExplosion(amount: number): void;
  setLayer(layer: BicycleLayer, visible: boolean): void;
  showAll(): void;
  reset(): void;
  zoom(factor: number): void;
  setThrottle(active: boolean): void;
  setBrake(which: 'front' | 'rear', active: boolean): void;
  setSteering(degrees: number): void;
  pedal(turns: number): void;
  shiftGear(direction: -1 | 1): void;
  toggleRide(): void;
  toggleKickstand(): void;
  toggleFall(): void;
  retry(): void;
  dispose(): void;
};

type SceneCommand = 'reset';
type FeedbackListener = (patch: Partial<BicycleFeedback>) => void;
type CommandListener = (command: SceneCommand) => void;
type DragState = {
  pointerId: number;
  control: string;
  brakeWhich?: 'front' | 'rear';
  partId: BicyclePartId | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startSteering: number;
  startFrontBrake: number;
  startRearBrake: number;
  moved: boolean;
};

const GEAR_TEETH = [32, 28, 24, 21, 18, 15, 13, 11];
const WHEEL_RADIUS = 0.349;
const ROUTE_A = 3.75;
const ROUTE_B = 1.75;
const ROUTE_LENGTH = Math.PI * (3 * (ROUTE_A + ROUTE_B) - Math.sqrt((3 * ROUTE_A + ROUTE_B) * (ROUTE_A + 3 * ROUTE_B)));
const STEER_AXIS = new THREE.Vector3(0.326, 0.946, 0).normalize();

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh || object instanceof THREE.Line)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}

function buildMetalMaterials(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture): BicycleMaterials {
  for (const texture of [colorMap, normalMap, roughnessMap]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy() ?? 1);
  }
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.needsUpdate = true;
  const silver = new THREE.MeshStandardMaterial({
    color: '#aeb7b5',
    metalness: 0.78,
    roughness: 0.3,
    map: colorMap,
    normalMap,
    roughnessMap,
    normalScale: new THREE.Vector2(0.16, 0.16),
  });
  const metal = new THREE.MeshStandardMaterial({
    color: '#737b79',
    metalness: 0.86,
    roughness: 0.34,
    map: colorMap,
    normalMap,
    roughnessMap,
    normalScale: new THREE.Vector2(0.1, 0.1),
  });
  return {
    frame: new THREE.MeshPhysicalMaterial({ color: '#176b69', metalness: 0.28, roughness: 0.34, clearcoat: 0.62, clearcoatRoughness: 0.24 }),
    silver,
    metal,
    rubber: new THREE.MeshStandardMaterial({ color: '#242829', roughness: 0.84, metalness: 0.04 }),
    leather: new THREE.MeshStandardMaterial({ color: '#332820', roughness: 0.68, metalness: 0.02 }),
    black: new THREE.MeshStandardMaterial({ color: '#252a2c', roughness: 0.43, metalness: 0.72 }),
    reflector: new THREE.MeshStandardMaterial({ color: '#d8693d', emissive: '#5b1e08', emissiveIntensity: 0.16, roughness: 0.32 }),
    cable: new THREE.MeshStandardMaterial({ color: '#1f2425', roughness: 0.72, metalness: 0.12 }),
  };
}

let renderer: THREE.WebGLRenderer | null = null;

export function mountBicycleScene(viewer: HTMLElement, onFeedback: FeedbackListener, onCommand: CommandListener): BicycleSceneControls {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e7df');
  scene.add(new THREE.HemisphereLight('#fffdf7', '#8c8d83', 1.85));

  const keyLight = new THREE.DirectionalLight('#fff2dd', 3.2);
  keyLight.position.set(-3, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  keyLight.shadow.bias = -0.00025;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight('#dce8e4', 1.15);
  fillLight.position.set(4, 3, -5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight('#f0e4d1', 0.8);
  rimLight.position.set(2, 4, 4);
  scene.add(rimLight);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), new THREE.MeshStandardMaterial({ color: '#dfddd5', roughness: 0.92, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.012;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Group();
  road.name = 'closed-test-loop-8x4m';
  road.visible = false;
  const roadShape = new THREE.Shape();
  roadShape.absellipse(0, 0, 4, 2, 0, Math.PI * 2, false, 0);
  const inner = new THREE.Path();
  inner.absellipse(0, 0, 3.5, 1.5, 0, Math.PI * 2, true, 0);
  roadShape.holes.push(inner);
  const roadSurface = new THREE.Mesh(new THREE.ShapeGeometry(roadShape, 64), new THREE.MeshStandardMaterial({ color: '#b9b8af', roughness: 0.94, side: THREE.DoubleSide }));
  roadSurface.rotation.x = -Math.PI / 2;
  roadSurface.position.y = 0.002;
  roadSurface.receiveShadow = true;
  road.add(roadSurface);
  const routeCurve = new THREE.EllipseCurve(0, 0, ROUTE_A, ROUTE_B, 0, Math.PI * 2, false, 0);
  const routePoints = routeCurve.getPoints(192).map((point) => new THREE.Vector3(point.x, 0.012, point.y));
  const routeMarking = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(routePoints), new THREE.LineDashedMaterial({ color: '#f5f1e8', dashSize: 0.16, gapSize: 0.12, linewidth: 1, transparent: true, opacity: 0.88 }));
  routeMarking.computeLineDistances();
  road.add(routeMarking);
  scene.add(road);

  const camera = new THREE.PerspectiveCamera(37, 1, 0.05, 80);
  camera.up.set(0, 1, 0);
  const defaultTarget = new THREE.Vector3(0.55, 0.52, 0);
  const cameraDirection = new THREE.Vector3(1.4, 1.0, 2.8).normalize();
  let controls: OrbitControls | null = null;
  let model: BicycleModel | null = null;
  let materials: BicycleMaterials | null = null;
  let bikeRoot: THREE.Group | null = null;
  let selectionHelper: THREE.Box3Helper | null = null;
  let selectedRoot: THREE.Object3D | null = null;
  let hoveredRoot: THREE.Object3D | null = null;
  let drag: DragState | null = null;
  let disposed = false;
  let loadRequest = 0;
  let currentStatus: ViewerStatus = 'loading';
  let errorCode: BicycleFeedback['errorCode'] = '';
  let mode: BicycleMode = 'inspect';
  let transitioning = false;
  let speedKmh = 0;
  let gearIndex = 0;
  let riding = false;
  let kickstand = false;
  let fallen = false;
  let steeringDegrees = 0;
  let steeringTarget = 0;
  let frontBrake = 0;
  let rearBrake = 0;
  let frontBrakeTarget = 0;
  let rearBrakeTarget = 0;
  let throttle = false;
  let cruise = false;
  let parkingRequest = false;
  let pendingFall = false;
  let explosion = 0;
  let explosionTarget = 0;
  let routeBlend = 0;
  let routeBlendTarget = 0;
  let routePhase = 0;
  let crankAngle = 0;
  let rearWheelAngle = 0;
  let frontWheelAngle = 0;
  let rearWheelInertia = 0;
  let frontWheelInertia = 0;
  let chainPhase = 0;
  let standAmount = 0;
  let layAngle = 0;
  let lastFrame = 0;
  let lastFeedback = 0;
  let previousBikePosition = defaultTarget.clone();
  let lastPointer = new THREE.Vector2();
  const layersVisible: Record<BicycleLayer, boolean> = {
    frame: true,
    steering: true,
    frontWheel: true,
    rearWheel: true,
    drivetrain: true,
    frontBrake: true,
    rearBrake: true,
    seatAccessories: true,
  };
  const keysDown = new Set<string>();
  function renderScene() {
    if (renderer) renderer.render(scene, camera);
  }

  function publish(force = false) {
    const now = performance.now();
    if (!force && now - lastFeedback < 90) return;
    lastFeedback = now;
    onFeedback({
      status: currentStatus,
      errorCode,
      selectedPartId: selectedRoot?.userData.partId ?? null,
      explosion: Math.round(explosionTarget),
      mode,
      transitioning,
      speedKmh,
      gearIndex,
      riding,
      kickstand,
      fallen,
      steeringDegrees,
      frontBrake,
      rearBrake,
      layers: { ...layersVisible },
    });
  }

  function setStatus(status: ViewerStatus, nextError: BicycleFeedback['errorCode'] = '') {
    currentStatus = status;
    errorCode = nextError;
    publish(true);
  }

  function resizeViewer() {
    if (!renderer) return;
    const width = Math.max(1, viewer.clientWidth);
    const height = Math.max(1, viewer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const horizontalFit = 1.92 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(camera.aspect, 0.62));
    const distance = Math.max(2.75, horizontalFit * 1.05);
    camera.position.copy(defaultTarget).addScaledVector(cameraDirection, distance);
    if (controls && mode === 'inspect') {
      controls.target.copy(defaultTarget);
      controls.update();
      controls.saveState();
    }
    renderScene();
  }

  function createSelectionHelper(color: THREE.ColorRepresentation) {
    if (selectionHelper) {
      scene.remove(selectionHelper);
      selectionHelper.geometry.dispose();
      for (const material of Array.isArray(selectionHelper.material) ? selectionHelper.material : [selectionHelper.material]) material.dispose();
      selectionHelper = null;
    }
    if (!selectedRoot && !hoveredRoot) return;
    selectionHelper = new THREE.Box3Helper(new THREE.Box3(), color);
    for (const material of Array.isArray(selectionHelper.material) ? selectionHelper.material : [selectionHelper.material]) {
      material.depthTest = false;
      material.transparent = true;
      material.opacity = selectedRoot ? 0.9 : 0.45;
    }
    selectionHelper.renderOrder = 4;
    scene.add(selectionHelper);
  }

  function setSelection(root: THREE.Object3D | null) {
    if (root && model && !isEffectivelyVisible(root)) root = null;
    selectedRoot = root;
    createSelectionHelper('#2f7867');
    publish(true);
  }

  function isEffectivelyVisible(object: THREE.Object3D) {
    let current: THREE.Object3D | null = object;
    while (current && current !== bikeRoot) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  function findPartRoot(object: THREE.Object3D | undefined) {
    let current: THREE.Object3D | null = object ?? null;
    while (current && current !== bikeRoot) {
      if (current.userData.partId) return current;
      current = current.parent;
    }
    return null;
  }

  function findInteraction(object: THREE.Object3D | undefined) {
    let current: THREE.Object3D | null = object ?? null;
    while (current && current !== bikeRoot) {
      if (current.userData.control) {
        return {
          control: String(current.userData.control),
          brakeWhich: current.userData.brakeWhich as 'front' | 'rear' | undefined,
          partId: (current.userData.partId ?? findPartRoot(current)?.userData.partId ?? null) as BicyclePartId | null,
        };
      }
      current = current.parent;
    }
    return null;
  }

  function pick(clientX: number, clientY: number) {
    if (!renderer || !bikeRoot) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(bikeRoot, true).find((hit) => isEffectivelyVisible(hit.object)) ?? null;
  }

  function applyExplosion() {
    if (!model) return;
    const amount = THREE.MathUtils.clamp(explosion / 100, 0, 1);
    for (const [layerName, layer] of Object.entries(model.layers) as [BicycleLayer, THREE.Group][]) {
      layer.position.copy(model.layerRestPositions[layerName]).addScaledVector(model.explodeOffsets[layerName], amount);
    }
  }

  function updateLayerVisibility() {
    if (!model) return;
    for (const [layer, object] of Object.entries(model.layers) as [BicycleLayer, THREE.Group][]) object.visible = layersVisible[layer];
    model.frontRotor.visible = layersVisible.frontBrake && layersVisible.frontWheel;
    model.rearRotor.visible = layersVisible.rearBrake && layersVisible.rearWheel;
    if (selectedRoot && !isEffectivelyVisible(selectedRoot)) setSelection(null);
  }

  function updateBrakeMechanism(which: 'front' | 'rear', value: number) {
    if (!model) return;
    const mechanism = which === 'front' ? model.frontBrakeMechanism : model.rearBrakeMechanism;
    const stroke = THREE.MathUtils.clamp(value, 0, 1);
    for (const [index, lever] of mechanism.levers.entries()) {
      lever.rotation.z = mechanism.leverRest[index] - stroke * 0.28;
    }
    for (const [index, pad] of mechanism.pads.entries()) {
      const direction = index === 0 ? -1 : 1;
      pad.position.z = mechanism.padRest[index] - direction * stroke * 0.006;
    }
  }

  function resetCamera() {
    if (!controls) return;
    controls.reset();
    controls.target.copy(defaultTarget);
    camera.position.copy(defaultTarget).addScaledVector(cameraDirection, 4.1);
    controls.update();
    controls.saveState();
  }

  async function loadModel() {
    const requestId = ++loadRequest;
    if (!renderer || disposed) return;
    setStatus('loading');
    setSelection(null);
    if (bikeRoot) {
      scene.remove(bikeRoot);
      disposeObject(bikeRoot);
      bikeRoot = null;
      model = null;
      materials = null;
    }
    const loaded: THREE.Texture[] = [];
    let colorMap: THREE.Texture;
    let normalMap: THREE.Texture;
    let roughnessMap: THREE.Texture;
    try {
      const loader = new THREE.TextureLoader();
      const [colorResult, normalResult, roughnessResult] = await Promise.allSettled([colorUrl, normalUrl, roughnessUrl].map((url) => loader.loadAsync(url)));
      for (const result of [colorResult, normalResult, roughnessResult]) {
        if (result.status === 'fulfilled') loaded.push(result.value);
      }
      if (colorResult.status === 'rejected') throw colorResult.reason;
      if (normalResult.status === 'rejected') throw normalResult.reason;
      if (roughnessResult.status === 'rejected') throw roughnessResult.reason;
      colorMap = colorResult.value;
      normalMap = normalResult.value;
      roughnessMap = roughnessResult.value;
      if (disposed || requestId !== loadRequest) {
        for (const texture of loaded) texture.dispose();
        return;
      }
    } catch (error) {
      for (const texture of loaded) texture.dispose();
      if (disposed || requestId !== loadRequest) return;
      console.error('自行车本地材质加载失败', error);
      setStatus('error', 'textures');
      return;
    }

    if (disposed || requestId !== loadRequest) {
      for (const texture of loaded) texture.dispose();
      return;
    }

    try {
      materials = buildMetalMaterials(colorMap, normalMap, roughnessMap);
      model = createBicycleModel(materials);
      bikeRoot = new THREE.Group();
      bikeRoot.name = 'BicycleWorldRoot';
      bikeRoot.rotation.order = 'YXZ';
      bikeRoot.add(model.root);
      scene.add(bikeRoot);
      for (const [layer, visible] of Object.entries(layersVisible) as [BicycleLayer, boolean][]) model.layers[layer].visible = visible;
      model.frontRotor.visible = true;
      model.rearRotor.visible = true;
      updateChainLinks(model, gearIndex, chainPhase);
      setStatus('loaded');
      updateLayerVisibility();
      resizeViewer();
    } catch (error) {
      if (bikeRoot) {
        scene.remove(bikeRoot);
        disposeObject(bikeRoot);
      }
      bikeRoot = null;
      model = null;
      if (materials) for (const material of Object.values(materials)) material.dispose();
      materials = null;
      for (const texture of loaded) texture.dispose();
      if (disposed || requestId !== loadRequest) return;
      console.error('自行车模型构建失败', error);
      setStatus('error', 'build');
    }
  }

  function setWheelAngle(which: 'front' | 'rear', value: number) {
    if (which === 'front') {
      frontWheelAngle = value;
      if (model) model.frontWheelSpin.rotation.z = frontWheelAngle;
    } else {
      rearWheelAngle = value;
      if (model) {
        model.rearWheelSpin.rotation.z = rearWheelAngle;
        model.cassetteSpin.rotation.z = rearWheelAngle;
      }
    }
  }

  function addPedalTurns(turns: number) {
    if (!model || mode !== 'operate' || fallen || transitioning) return;
    const delta = turns * Math.PI * 2;
    crankAngle += delta;
    model.crankPivot.rotation.z = crankAngle;
    const ratio = 42 / GEAR_TEETH[gearIndex];
    rearWheelAngle += delta * ratio;
    setWheelAngle('rear', rearWheelAngle);
    chainPhase = (chainPhase + turns * 42 / GEAR_TEETH[gearIndex] * 0.08) % 1;
    updateChainLinks(model, gearIndex, chainPhase);
    publish(true);
  }

  function setMode(nextMode: BicycleMode) {
    if (!model || nextMode === mode || fallen || transitioning) return;
    mode = nextMode;
    transitioning = true;
    throttle = false;
    cruise = false;
    parkingRequest = nextMode === 'inspect' && speedKmh > 0.15;
    frontBrakeTarget = parkingRequest ? 1 : 0;
    rearBrakeTarget = parkingRequest ? 1 : 0;
    steeringTarget = 0;
    explosionTarget = 0;
    routeBlendTarget = nextMode === 'operate' ? 1 : 0;
    setSelection(null);
    if (nextMode === 'operate') {
      kickstand = false;
      standAmount = 0;
      if (model) model.sideStand.visible = false;
    }
    publish(true);
  }

  function setThrottle(active: boolean) {
    if (!model || mode !== 'operate' || transitioning || fallen) return;
    throttle = active;
    if (active && kickstand) toggleKickstand();
    if (active) cruise = false;
  }

  function setBrake(which: 'front' | 'rear', active: boolean) {
    if (mode !== 'operate' || transitioning || fallen) return;
    if (active) {
      throttle = false;
      cruise = false;
    }
    if (which === 'front') frontBrakeTarget = active ? 1 : 0;
    else rearBrakeTarget = active ? 1 : 0;
  }

  function setSteering(degrees: number) {
    if (mode !== 'operate' || transitioning || fallen) return;
    steeringTarget = THREE.MathUtils.clamp(degrees, -35, 35);
  }

  function shiftGear(direction: -1 | 1) {
    if (mode !== 'operate' || transitioning || fallen) return;
    gearIndex = THREE.MathUtils.clamp(gearIndex + direction, 0, 7);
    if (model) {
      model.chainMeshes.forEach((chain, index) => { chain.visible = index === gearIndex; });
      updateChainLinks(model, gearIndex, chainPhase);
    }
    publish(true);
  }

  function toggleRide() {
    if (mode !== 'operate' || transitioning || fallen) return;
    if (riding || cruise || speedKmh > 0.2) {
      cruise = false;
      throttle = false;
      parkingRequest = true;
      frontBrakeTarget = 1;
      rearBrakeTarget = 1;
    } else {
      kickstand = false;
      parkingRequest = false;
      cruise = true;
      frontBrakeTarget = 0;
      rearBrakeTarget = 0;
    }
  }

  function toggleKickstand() {
    if (mode !== 'operate' || transitioning || fallen) return;
    if (speedKmh > 0.35 || riding) {
      toggleRide();
      return;
    }
    if (kickstand) {
      kickstand = false;
    } else {
      throttle = false;
      cruise = false;
      kickstand = true;
    }
    publish(true);
  }

  function toggleFall() {
    if (mode !== 'operate' || transitioning) return;
    if (fallen) {
      if (speedKmh > 0.35) return;
      fallen = false;
      kickstand = false;
      layAngle = 0;
      publish(true);
      return;
    }
    if (speedKmh > 0.35) {
      pendingFall = true;
      toggleRide();
      return;
    }
    throttle = false;
    cruise = false;
    kickstand = false;
    fallen = true;
    publish(true);
  }

  function reset() {
    mode = 'inspect';
    transitioning = false;
    speedKmh = 0;
    gearIndex = 0;
    riding = false;
    kickstand = false;
    fallen = false;
    throttle = false;
    cruise = false;
    parkingRequest = false;
    pendingFall = false;
    steeringDegrees = 0;
    steeringTarget = 0;
    frontBrake = 0;
    rearBrake = 0;
    frontBrakeTarget = 0;
    rearBrakeTarget = 0;
    explosion = 0;
    explosionTarget = 0;
    routeBlendTarget = 0;
    routePhase = 0;
    crankAngle = 0;
    rearWheelAngle = 0;
    frontWheelAngle = 0;
    rearWheelInertia = 0;
    frontWheelInertia = 0;
    chainPhase = 0;
    standAmount = 0;
    layAngle = 0;
    for (const layer of Object.keys(layersVisible) as BicycleLayer[]) layersVisible[layer] = true;
    if (model) {
      model.layers.frontWheel.visible = true;
      model.layers.rearWheel.visible = true;
      model.layers.frontBrake.visible = true;
      model.layers.rearBrake.visible = true;
      model.layers.steering.visible = true;
      model.layers.frame.visible = true;
      model.layers.drivetrain.visible = true;
      model.layers.seatAccessories.visible = true;
      model.sideStand.visible = false;
      model.crankPivot.rotation.z = 0;
      model.rearWheelSpin.rotation.z = 0;
      model.frontWheelSpin.rotation.z = 0;
      model.cassetteSpin.rotation.z = 0;
      model.chainMeshes.forEach((chain, index) => { chain.visible = index === 0; });
      updateChainLinks(model, 0, 0);
      updateLayerVisibility();
    }
    road.visible = false;
    if (bikeRoot) bikeRoot.rotation.set(0, 0, 0, 'YXZ');
    setSelection(null);
    resetCamera();
    publish(true);
  }

  function zoom(factor: number) {
    if (!controls) return;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  function moveTargetToRoute(phase: number) {
    const angle = phase * Math.PI * 2;
    const x = Math.cos(angle) * ROUTE_A;
    const z = Math.sin(angle) * ROUTE_B;
    const tangentX = -Math.sin(angle) * ROUTE_A;
    const tangentZ = Math.cos(angle) * ROUTE_B;
    const yaw = Math.atan2(-tangentZ, tangentX);
    return { x, z, yaw };
  }

  function updateBikePose(delta: number) {
    if (!model || !bikeRoot) return;
    const steeringAlpha = 1 - Math.exp(-delta * 7.5);
    steeringDegrees += (steeringTarget - steeringDegrees) * steeringAlpha;
    model.steeringPivot.quaternion.setFromAxisAngle(STEER_AXIS, THREE.MathUtils.degToRad(steeringDegrees));
    const brakeAlpha = 1 - Math.exp(-delta * 10);
    frontBrake += (frontBrakeTarget - frontBrake) * brakeAlpha;
    rearBrake += (rearBrakeTarget - rearBrake) * brakeAlpha;
    updateBrakeMechanism('front', frontBrake);
    updateBrakeMechanism('rear', rearBrake);

    const explosionAlpha = 1 - Math.exp(-delta * 5.5);
    explosion += (explosionTarget - explosion) * explosionAlpha;
    if (Math.abs(explosionTarget - explosion) < 0.08) explosion = explosionTarget;
    applyExplosion();

    const routeAlpha = 1 - Math.exp(-delta * 2.8);
    routeBlend += (routeBlendTarget - routeBlend) * routeAlpha;
    if (Math.abs(routeBlendTarget - routeBlend) < 0.002) routeBlend = routeBlendTarget;
    if (mode === 'operate' || routeBlend > 0.001) {
      const point = moveTargetToRoute(routePhase);
      bikeRoot.position.x = point.x * routeBlend;
      bikeRoot.position.z = point.z * routeBlend;
      bikeRoot.rotation.y = point.yaw * routeBlend;
    } else {
      bikeRoot.position.x = 0;
      bikeRoot.position.z = 0;
      bikeRoot.rotation.y = 0;
    }

    const standAlpha = 1 - Math.exp(-delta * 7);
    const standTarget = kickstand && speedKmh < 0.35 && !fallen ? 1 : 0;
    standAmount += (standTarget - standAmount) * standAlpha;
    model.sideStand.rotation.z += ((-2.0 + standAmount * 0.85) - model.sideStand.rotation.z) * standAlpha;
    model.sideStand.visible = standAmount > 0.015;

    const fallTarget = fallen ? Math.PI / 2 : 0;
    const fallAlpha = 1 - Math.exp(-delta * 2.4);
    layAngle += (fallTarget - layAngle) * fallAlpha;
    const lean = !fallen && mode === 'operate' ? -THREE.MathUtils.degToRad(steeringDegrees) * 0.11 * Math.min(speedKmh / 7, 1) : 0;
    bikeRoot.rotation.x = fallen ? layAngle : lean;
    bikeRoot.position.y = fallen ? 0.039 : 0;

    if (mode === 'operate' && routeBlend > 0.01) {
      road.visible = true;
      const current = defaultTarget.clone().applyQuaternion(bikeRoot.quaternion).add(bikeRoot.position);
      const offset = current.clone().sub(previousBikePosition);
      if (controls && offset.lengthSq() > 0.0000005) {
        controls.target.add(offset);
        camera.position.add(offset);
      }
      previousBikePosition.copy(current);
    } else {
      road.visible = false;
      if (controls) {
        controls.target.lerp(defaultTarget, 1 - Math.exp(-delta * 1.4));
      }
      previousBikePosition.copy(defaultTarget);
    }

    if (transitioning) {
      const neutral = Math.abs(explosion) < 0.08
        && Math.abs(steeringDegrees) < 0.5
        && Math.abs(frontBrake) < 0.02
        && Math.abs(rearBrake) < 0.02
        && Math.abs(layAngle) < 0.01
        && (mode === 'operate' ? routeBlend > 0.995 : routeBlend < 0.005)
        && speedKmh < 0.06;
      if (neutral) {
        transitioning = false;
        parkingRequest = false;
        publish(true);
      }
    }
  }

  function updateMotion(delta: number) {
    if (!model) return;
    const dt = Math.min(delta, 0.05);
    if (mode === 'operate' && !transitioning && !fallen) {
      if (throttle) speedKmh += 3.4 * dt;
      else if (cruise) speedKmh += THREE.MathUtils.clamp(6.5 - speedKmh, -1.8, 1.8) * dt;
      else speedKmh -= 0.42 * dt;
      const brakeForce = Math.max(frontBrake, rearBrake, parkingRequest ? 1 : 0);
      if (brakeForce > 0.015) speedKmh -= (3.8 + brakeForce * 7.2) * dt;
    } else if (mode === 'inspect') {
      speedKmh = Math.max(0, speedKmh - 6.5 * dt);
    }
    speedKmh = THREE.MathUtils.clamp(speedKmh, 0, 12);
    if (speedKmh < 0.04) speedKmh = 0;
    riding = speedKmh > 0.28;

    if (parkingRequest && speedKmh === 0) {
      parkingRequest = false;
      frontBrakeTarget = 0;
      rearBrakeTarget = 0;
      if (pendingFall) {
        pendingFall = false;
        fallen = true;
        kickstand = false;
      }
    }

    if (mode === 'operate' && routeBlend > 0.01 && !fallen) {
      const distance = (speedKmh / 3.6) * dt;
      routePhase = (routePhase + distance / ROUTE_LENGTH) % 1;
      const wheelDelta = distance / WHEEL_RADIUS;
      rearWheelAngle += wheelDelta;
      frontWheelAngle += wheelDelta;
      setWheelAngle('rear', rearWheelAngle);
      setWheelAngle('front', frontWheelAngle);
      const cadence = wheelDelta * GEAR_TEETH[gearIndex] / 42;
      crankAngle += cadence;
      model.crankPivot.rotation.z = crankAngle;
      chainPhase = (chainPhase + Math.abs(cadence) * 0.08) % 1;
    }

    if (!riding && rearWheelInertia !== 0) {
      rearWheelAngle += rearWheelInertia * dt;
      rearWheelInertia *= Math.exp(-2.8 * dt);
      if (Math.abs(rearWheelInertia) < 0.015) rearWheelInertia = 0;
      setWheelAngle('rear', rearWheelAngle);
    }
    if (!riding && frontWheelInertia !== 0) {
      frontWheelAngle += frontWheelInertia * dt;
      frontWheelInertia *= Math.exp(-2.8 * dt);
      if (Math.abs(frontWheelInertia) < 0.015) frontWheelInertia = 0;
      setWheelAngle('front', frontWheelAngle);
    }
    model.rearWheelSpin.rotation.z = rearWheelAngle;
    model.cassetteSpin.rotation.z = rearWheelAngle;
    model.frontWheelSpin.rotation.z = frontWheelAngle;
    model.crankPivot.rotation.z = crankAngle;
    updateChainLinks(model, gearIndex, chainPhase);
    publish();
  }

  function animate(now: number) {
    if (disposed || !renderer) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
    lastFrame = now;
    updateMotion(delta);
    updateBikePose(delta);
    controls?.update();
    const highlighted = selectedRoot ?? hoveredRoot;
    if (selectionHelper && highlighted) {
      (selectionHelper as THREE.Box3Helper).box.setFromObject(highlighted);
    }
    renderScene();
  }

  function onPointerDown(event: PointerEvent) {
    if (!renderer || !model || !bikeRoot || event.button !== 0) return;
    const canvas = renderer.domElement;
    canvas.focus({ preventScroll: true });
    const hit = pick(event.clientX, event.clientY);
    if (!hit) return;
    const interaction = findInteraction(hit.object);
    if (!interaction || !['inspect', 'operate'].includes(mode)) return;
    if (mode === 'inspect' || transitioning || fallen) {
      setSelection(findPartRoot(hit.object));
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    controls && (controls.enabled = false);
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Browser pointer capture is optional. */ }
    drag = {
      pointerId: event.pointerId,
      control: interaction.control,
      brakeWhich: interaction.brakeWhich,
      partId: interaction.partId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startSteering: steeringTarget,
      startFrontBrake: frontBrakeTarget,
      startRearBrake: rearBrakeTarget,
      moved: false,
    };
    setSelection(findPartRoot(hit.object));
    if (interaction.control === 'brake') {
      const which = interaction.brakeWhich ?? 'front';
      setBrake(which, true);
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!renderer || !model) return;
    if (drag && drag.pointerId === event.pointerId) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const stepX = event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      if (drag.control === 'steer') setSteering(drag.startSteering + dx * 0.22);
      else if (drag.control === 'crank') addPedalTurns((dx - dy) / 250);
      else if (drag.control === 'chain') addPedalTurns(stepX / 245);
      else if (drag.control === 'frontWheel') {
        frontWheelInertia = stepX * 0.11;
        setWheelAngle('front', frontWheelAngle + stepX * 0.045);
      } else if (drag.control === 'rearWheel') {
        rearWheelInertia = stepX * 0.11;
        setWheelAngle('rear', rearWheelAngle + stepX * 0.045);
      } else if (drag.control === 'brake') {
        const amount = THREE.MathUtils.clamp(dy / 58, 0, 1);
        setBrake(drag.brakeWhich ?? 'front', amount > 0.08);
        if (drag.brakeWhich === 'rear') rearBrakeTarget = Math.max(drag.startRearBrake, amount);
        else frontBrakeTarget = Math.max(drag.startFrontBrake, amount);
      }
      return;
    }
    const hit = pick(event.clientX, event.clientY);
    const nextHover = hit ? findPartRoot(hit.object) : null;
    if (nextHover !== hoveredRoot) {
      hoveredRoot = nextHover;
      if (!selectedRoot) createSelectionHelper('#6f9787');
    }
    lastPointer.set(event.clientX, event.clientY);
  }

  function onPointerUp(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId || !renderer) return;
    const currentDrag = drag;
    drag = null;
    if (controls) controls.enabled = true;
    try { renderer.domElement.releasePointerCapture(event.pointerId); } catch { /* Browser pointer capture is optional. */ }
    if (currentDrag.control === 'brake') setBrake(currentDrag.brakeWhich ?? 'front', false);
    if (currentDrag.control === 'frontWheel') frontWheelInertia *= 1.8;
    if (currentDrag.control === 'rearWheel') rearWheelInertia *= 1.8;
    if (!currentDrag.moved) setSelection(currentDrag.partId ? model?.partRoots.get(currentDrag.partId) ?? null : null);
  }

  function onCanvasClick(event: PointerEvent) {
    if (drag) return;
    const hit = pick(event.clientX, event.clientY);
    setSelection(hit ? findPartRoot(hit.object) : null);
  }

  function releaseKeyboardControls() {
    if (keysDown.delete('w') || keysDown.delete('arrowup')) throttle = false;
    if (keysDown.delete('s') || keysDown.delete('arrowdown')) {
      frontBrakeTarget = 0;
      rearBrakeTarget = 0;
    }
    if (keysDown.delete('a') || keysDown.delete('arrowleft') || keysDown.delete('d') || keysDown.delete('arrowright')) steeringTarget = 0;
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!renderer || event.target !== renderer.domElement || document.activeElement !== renderer.domElement) return;
    const key = event.key.toLowerCase();
    const handled = ['w', 'arrowup', 's', 'arrowdown', 'a', 'arrowleft', 'd', 'arrowright', '[', ']', 'p', 'l', 'r'].includes(key);
    if (!handled) return;
    event.preventDefault();
    if (event.repeat && ['p', 'l', 'r', '[', ']'].includes(key)) return;
    if (key === 'r') {
      onCommand('reset');
      return;
    }
    if (key === '[') shiftGear(-1);
    else if (key === ']') shiftGear(1);
    else if (key === 'p') {
      if (speedKmh > 0.35 || riding) toggleRide();
      else toggleKickstand();
    } else if (key === 'l') toggleFall();
    else if (mode === 'operate' && !transitioning && !fallen) {
      keysDown.add(key);
      if (key === 'w' || key === 'arrowup') setThrottle(true);
      else if (key === 's' || key === 'arrowdown') {
        frontBrakeTarget = 1;
        rearBrakeTarget = 1;
      } else if (key === 'a' || key === 'arrowleft') steeringTarget = -35;
      else if (key === 'd' || key === 'arrowright') steeringTarget = 35;
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    if (!renderer || event.target !== renderer.domElement) return;
    const key = event.key.toLowerCase();
    if (!keysDown.delete(key)) return;
    if (key === 'w' || key === 'arrowup') throttle = false;
    if (key === 's' || key === 'arrowdown') {
      frontBrakeTarget = 0;
      rearBrakeTarget = 0;
    }
    if (['a', 'arrowleft', 'd', 'arrowright'].includes(key)) steeringTarget = 0;
    event.preventDefault();
  }

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.07;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', '可旋转、可拆解、可骑行操作的城市自行车 3D 模型');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.tabIndex = 0;
    renderer.domElement.dataset.model = 'urban-commuter-bicycle';
    viewer.append(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.minDistance = 2.15;
    controls.maxDistance = 10;
    controls.minPolarAngle = 0.16;
    controls.maxPolarAngle = 1.47;
    controls.target.copy(defaultTarget);
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    renderer.domElement.addEventListener('pointerdown', onPointerDown, { capture: true });
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('keydown', onKeyDown);
    renderer.domElement.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('blur', releaseKeyboardControls);
    window.addEventListener('resize', resizeViewer);
    resizeViewer();
    renderer.setAnimationLoop(animate);
    loadModel();
  } catch (error) {
    const detail = error instanceof Error ? error.message : '无法创建 WebGL 渲染器。';
    console.error('自行车 WebGL 初始化失败', detail);
    setStatus('error', 'webgl');
  }

  return {
    setMode,
    setExplosion(amount) {
      if (mode !== 'inspect' || transitioning || fallen) return;
      explosionTarget = THREE.MathUtils.clamp(amount, 0, 100);
      publish(true);
    },
    setLayer(layer, visible) {
      if (mode !== 'inspect' || transitioning || fallen) return;
      layersVisible[layer] = visible;
      updateLayerVisibility();
      publish(true);
    },
    showAll() {
      if (mode !== 'inspect' || transitioning || fallen) return;
      for (const layer of Object.keys(layersVisible) as BicycleLayer[]) layersVisible[layer] = true;
      updateLayerVisibility();
      publish(true);
    },
    reset,
    zoom,
    setThrottle,
    setBrake(which, active) {
      setBrake(which, active);
    },
    setSteering,
    pedal: addPedalTurns,
    shiftGear,
    toggleRide,
    toggleKickstand,
    toggleFall,
    retry() {
      if (!renderer) {
        window.location.reload();
        return;
      }
      loadModel();
    },
    dispose() {
      disposed = true;
      loadRequest += 1;
      window.removeEventListener('resize', resizeViewer);
      if (renderer) {
        renderer.setAnimationLoop(null);
        const canvas = renderer.domElement;
        canvas.removeEventListener('pointerdown', onPointerDown, true);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('click', onCanvasClick);
        canvas.removeEventListener('keydown', onKeyDown);
        canvas.removeEventListener('keyup', onKeyUp);
        canvas.removeEventListener('blur', releaseKeyboardControls);
      }
      controls?.dispose();
      if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper.geometry.dispose();
        for (const material of Array.isArray(selectionHelper.material) ? selectionHelper.material : [selectionHelper.material]) material.dispose();
      }
      if (bikeRoot) {
        scene.remove(bikeRoot);
        disposeObject(bikeRoot);
      }
      if (materials) {
        for (const material of Object.values(materials)) material.dispose();
      }
      renderer?.dispose();
      renderer?.domElement.remove();
      renderer = null;
    },
  };
}
