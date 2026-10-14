import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import sceneUrl from './assets/scene.glb?url';
import { createBicycleModel, SIDE_STAND_AXIS, SIDE_STAND_DEPLOYED_ANGLE, SIDE_STAND_FOLDED_ANGLE, updateChainLinks, type BicycleLayer, type BicycleModel } from './bicycle-model';
import type { BicyclePartId } from './locales';

export type BicycleMode = 'inspect' | 'operate';
export type ViewerStatus = 'loading' | 'loaded' | 'error';
export type BicycleFeedback = {
  status: ViewerStatus;
  errorCode: '' | 'textures' | 'webgl' | 'build';
  selectedPartId: BicyclePartId | null;
  explosion: number;
  mode: BicycleMode;
  speedKmh: number;
  routePhase: number;
  gearIndex: number;
  riding: boolean;
  kickstand: boolean;
  frontTireGroundClearanceMm: number | null;
  rearTireGroundClearanceMm: number | null;
  standGroundClearanceMm: number | null;
  standFootContactErrorMm: number | null;
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
  setSpeedKmh(speed: number): void;
  setBrake(which: 'front' | 'rear', active: boolean): void;
  setSteering(degrees: number): void;
  pedal(turns: number): void;
  shiftGear(direction: -1 | 1): void;
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

const GEAR_TEETH = [32, 28, 24, 21, 18, 16, 14, 12];
const CHAINRING_TEETH = 40;
const WHEEL_RADIUS = 0.349;
const ROUTE_A = 3.75;
const ROUTE_B = 1.75;
const ROUTE_LENGTH = Math.PI * (3 * (ROUTE_A + ROUTE_B) - Math.sqrt((3 * ROUTE_A + ROUTE_B) * (ROUTE_A + 3 * ROUTE_B)));
const STEER_AXIS = new THREE.Vector3(0.325568, -0.945519, 0).normalize();

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
  const cameraDirection = new THREE.Vector3(0.85, 0.92, 3.4).normalize();
  let controls: OrbitControls | null = null;
  let model: BicycleModel | null = null;
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
  let explosion = 0;
  let explosionTarget = 0;
  let routeBlend = 0;
  let routePhase = 0;
  let crankAngle = 0;
  let rearWheelAngle = 0;
  let frontWheelAngle = 0;
  let rearWheelInertia = 0;
  let frontWheelInertia = 0;
  let chainPhase = 0;
  let standAmount = 0;
  let standPoseAngle = SIDE_STAND_FOLDED_ANGLE;
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

  function groundClearanceMm(object: THREE.Object3D | undefined) {
    if (!object) return null;
    object.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(object);
    return bounds.isEmpty() ? null : Math.round(bounds.min.y * 1000);
  }

  function standFootContactErrorMm(object: THREE.Object3D | undefined) {
    if (!(object instanceof THREE.Mesh)) return null;
    const positions = object.geometry.getAttribute('position');
    if (!positions || positions.count < 4) return null;
    object.updateWorldMatrix(true, false);
    const unique = new Map<string, THREE.Vector3>();
    const point = new THREE.Vector3();
    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      const key = `${Math.round(point.x * 1e6)},${Math.round(point.y * 1e6)},${Math.round(point.z * 1e6)}`;
      if (!unique.has(key)) unique.set(key, point.clone());
    }
    const bottomCorners = [...unique.values()].sort((a, b) => a.y - b.y).slice(0, 4);
    if (bottomCorners.length !== 4) return null;
    const errorMm = Math.max(...bottomCorners.map((corner) => Math.abs(corner.y))) * 1000;
    return Math.round(errorMm * 100) / 100;
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
      speedKmh,
      routePhase,
      gearIndex,
      riding,
      kickstand,
      frontTireGroundClearanceMm: groundClearanceMm(model?.partRoots.get('frontTire')),
      rearTireGroundClearanceMm: groundClearanceMm(model?.partRoots.get('rearTire')),
      standGroundClearanceMm: model?.sideStand.visible && standAmount > 0.98 ? groundClearanceMm(model.sideStand) : null,
      standFootContactErrorMm: model?.sideStand.visible && standAmount > 0.98 ? standFootContactErrorMm(model.sideStandFoot) : null,
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
      if (current.userData.hitTarget && current.userData.partId) {
        const partRoot = model?.partRoots.get(current.userData.partId as BicyclePartId);
        if (partRoot) return partRoot;
      }
      if (current.userData.partId && !current.userData.hitTarget) return current;
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
    model.frontRotor.visible = layersVisible.frontBrake;
    model.rearRotor.visible = layersVisible.rearBrake;
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
    }
    let loadedScene: THREE.Object3D | null = null;
    try {
      const gltf = await new GLTFLoader().loadAsync(sceneUrl);
      loadedScene = gltf.scene;
      if (disposed || requestId !== loadRequest) {
        disposeObject(loadedScene);
        return;
      }
    } catch (error) {
      if (disposed || requestId !== loadRequest) return;
      console.error('自行车 GLB 模型加载失败', error);
      setStatus('error', 'build');
      return;
    }

    if (disposed || requestId !== loadRequest) {
      if (loadedScene) disposeObject(loadedScene);
      return;
    }

    try {
      if (!loadedScene) throw new Error('GLB 没有可显示的场景。');
      model = createBicycleModel(loadedScene);
      bikeRoot = new THREE.Group();
      bikeRoot.name = 'BicycleWorldRoot';
      bikeRoot.rotation.order = 'YXZ';
      bikeRoot.add(model.root);
      scene.add(bikeRoot);
      for (const [layer, visible] of Object.entries(layersVisible) as [BicycleLayer, boolean][]) model.layers[layer].visible = visible;
      model.sideStand.quaternion.setFromAxisAngle(SIDE_STAND_AXIS, SIDE_STAND_FOLDED_ANGLE);
      model.frontRotor.visible = layersVisible.frontBrake;
      model.rearRotor.visible = layersVisible.rearBrake;
      updateChainLinks(model, gearIndex, chainPhase);
      setStatus('loaded');
      updateLayerVisibility();
      resizeViewer();
    } catch (error) {
      if (bikeRoot) {
        scene.remove(bikeRoot);
        disposeObject(bikeRoot);
      } else if (loadedScene) {
        disposeObject(loadedScene);
      }
      bikeRoot = null;
      model = null;
      if (disposed || requestId !== loadRequest) return;
      console.error('自行车模型构建失败', error);
      setStatus('error', 'build');
    }
  }

  function setWheelAngle(which: 'front' | 'rear', value: number) {
    if (which === 'front') {
      frontWheelAngle = value;
      if (model) {
        model.frontWheelSpin.rotation.z = frontWheelAngle;
        model.frontRotor.rotation.z = frontWheelAngle;
      }
    } else {
      rearWheelAngle = value;
      if (model) {
        model.rearWheelSpin.rotation.z = rearWheelAngle;
        model.rearRotor.rotation.z = rearWheelAngle;
        model.cassetteSpin.rotation.z = rearWheelAngle;
      }
    }
  }

  function addPedalTurns(turns: number) {
    if (!model || mode !== 'operate' || fallen) return;
    const delta = turns * Math.PI * 2;
    crankAngle += delta;
    model.crankPivot.rotation.z = crankAngle;
    const ratio = CHAINRING_TEETH / GEAR_TEETH[gearIndex];
    rearWheelAngle += delta * ratio;
    setWheelAngle('rear', rearWheelAngle);
    chainPhase = (chainPhase + turns * CHAINRING_TEETH / GEAR_TEETH[gearIndex] * 0.08) % 1;
    updateChainLinks(model, gearIndex, chainPhase);
    publish(true);
  }

  function setMode(nextMode: BicycleMode) {
    if (!model || nextMode === mode || fallen) return;
    mode = nextMode;
    speedKmh = 0;
    riding = false;
    rearWheelInertia = 0;
    frontWheelInertia = 0;
    steeringDegrees = 0;
    frontBrakeTarget = 0;
    rearBrakeTarget = 0;
    steeringTarget = 0;
    frontBrake = 0;
    rearBrake = 0;
    explosion = 0;
    explosionTarget = 0;
    routeBlend = nextMode === 'operate' ? 1 : 0;
    model.steeringPivot.quaternion.setFromAxisAngle(STEER_AXIS, 0);
    updateBrakeMechanism('front', 0);
    updateBrakeMechanism('rear', 0);
    applyExplosion();
    setSelection(null);
    if (nextMode === 'operate') {
      kickstand = false;
      standAmount = 0;
      model.sideStand.visible = false;
      standPoseAngle = SIDE_STAND_FOLDED_ANGLE;
      model.sideStand.quaternion.setFromAxisAngle(SIDE_STAND_AXIS, standPoseAngle);
      routePhase = 0;
    }
    updateBikePose(0);
    if (nextMode === 'inspect') resetCamera();
    publish(true);
  }

  function setSpeedKmh(speed: number) {
    if (!model || mode !== 'operate' || fallen) return;
    speedKmh = THREE.MathUtils.clamp(Number.isFinite(speed) ? speed : 0, 0, 12);
    riding = speedKmh > 0;
    rearWheelInertia = 0;
    frontWheelInertia = 0;
    frontBrakeTarget = 0;
    rearBrakeTarget = 0;
    if (speedKmh > 0 && kickstand) {
      kickstand = false;
      standAmount = 0;
      standPoseAngle = SIDE_STAND_FOLDED_ANGLE;
      model.sideStand.quaternion.setFromAxisAngle(SIDE_STAND_AXIS, standPoseAngle);
      model.sideStand.visible = false;
    }
    publish(true);
  }

  function setBrake(which: 'front' | 'rear', active: boolean) {
    if (mode !== 'operate' || fallen) return;
    if (active) {
      speedKmh = 0;
      riding = false;
      rearWheelInertia = 0;
      frontWheelInertia = 0;
    }
    if (which === 'front') frontBrakeTarget = active ? 1 : 0;
    else rearBrakeTarget = active ? 1 : 0;
    publish(true);
  }

  function setSteering(degrees: number) {
    if (mode !== 'operate' || fallen) return;
    steeringTarget = THREE.MathUtils.clamp(degrees, -35, 35);
  }

  function shiftGear(direction: -1 | 1) {
    if (mode !== 'operate' || fallen) return;
    gearIndex = THREE.MathUtils.clamp(gearIndex + direction, 0, 7);
    if (model) {
      model.chainMeshes.forEach((chain, index) => { chain.visible = index === gearIndex; });
      model.chainLinks.forEach((links, index) => { links.visible = index === gearIndex; });
      updateChainLinks(model, gearIndex, chainPhase);
    }
    publish(true);
  }

  function toggleKickstand() {
    if (mode !== 'operate' || fallen) return;
    if (speedKmh > 0) return;
    if (kickstand) {
      kickstand = false;
    } else {
      kickstand = true;
    }
    publish(true);
  }

  function toggleFall() {
    if (mode !== 'operate') return;
    if (fallen) {
      if (speedKmh > 0) return;
      fallen = false;
      kickstand = false;
      layAngle = 0;
      publish(true);
      return;
    }
    if (speedKmh > 0) return;
    kickstand = false;
    fallen = true;
    publish(true);
  }

  function reset() {
    mode = 'inspect';
    speedKmh = 0;
    gearIndex = 0;
    riding = false;
    kickstand = false;
    fallen = false;
    steeringDegrees = 0;
    steeringTarget = 0;
    frontBrake = 0;
    rearBrake = 0;
    frontBrakeTarget = 0;
    rearBrakeTarget = 0;
    explosion = 0;
    explosionTarget = 0;
    routeBlend = 0;
    routePhase = 0;
    crankAngle = 0;
    rearWheelAngle = 0;
    frontWheelAngle = 0;
    rearWheelInertia = 0;
    frontWheelInertia = 0;
    chainPhase = 0;
    standAmount = 0;
    standPoseAngle = SIDE_STAND_FOLDED_ANGLE;
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
      model.rearRotor.rotation.z = 0;
      model.frontRotor.rotation.z = 0;
      model.cassetteSpin.rotation.z = 0;
      model.sideStand.quaternion.setFromAxisAngle(SIDE_STAND_AXIS, standPoseAngle);
      model.chainMeshes.forEach((chain, index) => { chain.visible = index === 0; });
      model.chainLinks.forEach((links, index) => { links.visible = index === 0; });
      updateChainLinks(model, 0, 0);
      updateLayerVisibility();
    }
    road.visible = false;
    if (bikeRoot) {
      bikeRoot.position.set(0, 0, 0);
      bikeRoot.rotation.set(0, 0, 0, 'YXZ');
    }
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
    const standTarget = kickstand && speedKmh === 0 && !fallen ? 1 : 0;
    standAmount += (standTarget - standAmount) * standAlpha;
    const standAngle = THREE.MathUtils.lerp(SIDE_STAND_FOLDED_ANGLE, SIDE_STAND_DEPLOYED_ANGLE, standAmount);
    standPoseAngle += (standAngle - standPoseAngle) * standAlpha;
    model.sideStand.quaternion.setFromAxisAngle(SIDE_STAND_AXIS, standPoseAngle);
    model.sideStand.visible = standAmount > 0.015;

    const fallTarget = fallen ? Math.PI / 2 : 0;
    const fallAlpha = 1 - Math.exp(-delta * 2.4);
    layAngle += (fallTarget - layAngle) * fallAlpha;
    const ridingLean = !fallen && mode === 'operate' ? -THREE.MathUtils.degToRad(steeringDegrees) * 0.11 * Math.min(speedKmh / 7, 1) : 0;
    const parkedLean = !fallen && kickstand ? -THREE.MathUtils.degToRad(8) * standAmount : 0;
    bikeRoot.rotation.x = fallen ? layAngle : parkedLean || ridingLean;
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

  }

  function updateMotion(delta: number) {
    if (!model) return;
    const dt = Math.min(delta, 0.05);
    riding = speedKmh > 0;

    if (mode === 'operate' && routeBlend > 0.01 && !fallen) {
      const distance = (speedKmh / 3.6) * dt;
      routePhase = (routePhase + distance / ROUTE_LENGTH) % 1;
      const wheelDelta = distance / WHEEL_RADIUS;
      rearWheelAngle += wheelDelta;
      frontWheelAngle += wheelDelta;
      setWheelAngle('rear', rearWheelAngle);
      setWheelAngle('front', frontWheelAngle);
      const cadence = wheelDelta * GEAR_TEETH[gearIndex] / CHAINRING_TEETH;
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
    model.rearRotor.rotation.z = rearWheelAngle;
    model.cassetteSpin.rotation.z = rearWheelAngle;
    model.frontWheelSpin.rotation.z = frontWheelAngle;
    model.frontRotor.rotation.z = frontWheelAngle;
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
    if (mode === 'inspect' || fallen) {
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
    keysDown.delete('w');
    keysDown.delete('arrowup');
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
    if (event.repeat && ['w', 'arrowup', 'p', 'l', 'r', '[', ']'].includes(key)) return;
    if (key === 'r') {
      onCommand('reset');
      return;
    }
    if (key === '[') shiftGear(-1);
    else if (key === ']') shiftGear(1);
    else if (key === 'p') toggleKickstand();
    else if (key === 'l') toggleFall();
    else if (mode === 'operate' && !fallen) {
      keysDown.add(key);
      if (key === 'w' || key === 'arrowup') setSpeedKmh(speedKmh + 1);
      else if (key === 's' || key === 'arrowdown') {
        setBrake('front', true);
        setBrake('rear', true);
      } else if (key === 'a' || key === 'arrowleft') steeringTarget = -35;
      else if (key === 'd' || key === 'arrowright') steeringTarget = 35;
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    if (!renderer || event.target !== renderer.domElement) return;
    const key = event.key.toLowerCase();
    if (!keysDown.delete(key)) return;
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
      if (mode !== 'inspect' || fallen) return;
      explosionTarget = THREE.MathUtils.clamp(amount, 0, 100);
      publish(true);
    },
    setLayer(layer, visible) {
      if (mode !== 'inspect' || fallen) return;
      layersVisible[layer] = visible;
      updateLayerVisibility();
      publish(true);
    },
    showAll() {
      if (mode !== 'inspect' || fallen) return;
      for (const layer of Object.keys(layersVisible) as BicycleLayer[]) layersVisible[layer] = true;
      updateLayerVisibility();
      publish(true);
    },
    reset,
    zoom,
    setSpeedKmh,
    setBrake(which, active) {
      setBrake(which, active);
    },
    setSteering,
    pedal: addPedalTurns,
    shiftGear,
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
      renderer?.dispose();
      renderer?.domElement.remove();
      renderer = null;
    },
  };
}
