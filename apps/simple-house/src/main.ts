import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './styles.css';

type Layer = 'roof' | 'walls' | 'structure' | 'openings' | 'interior' | 'ground';

type ComponentDetail = {
  layer: Layer;
  title: string;
  material: string;
  description: string;
};

function normalizeObjectName(name: string) {
  // Three.js sanitizes punctuation in node names loaded from the Blender GLB.
  return name.replace(/[^a-z\d]/gi, '').toLowerCase();
}

const COMPONENTS: Record<string, ComponentDetail> = {
  Ground: { layer: 'ground', title: '观察地台', material: '石灰岩', description: '为模型提供尺度参照与柔和接触阴影。拖动时可从任意方向查看整座小屋。' },
  'House.Foundation': { layer: 'structure', title: '基础底座', material: '浅灰石材', description: '将房屋重量传递到地面。基础略宽于墙体，形成清楚的底部收边。' },
  'House.Floor': { layer: 'structure', title: '木地板', material: 'Poly Haven 木板纹理', description: '由平行木板组成，板下的地板梁在拆解后可以单独观察。' },
  'House.Frame': { layer: 'structure', title: '木结构框架', material: '松木与橡木', description: '立柱、上下横梁和地板梁组成房屋骨架，支撑墙板与屋架。' },
  'Wall.Front': { layer: 'walls', title: '正面墙板', material: '暖白灰泥', description: '正面预留入户门和两扇窗。向外移开后，可以看到门窗开口和内部木框架。' },
  'Wall.Back': { layer: 'walls', title: '后侧墙板', material: '暖白灰泥', description: '封闭房屋后侧的外墙。爆炸视图会沿房屋纵深方向将它移开。' },
  'Wall.Left': { layer: 'walls', title: '左侧墙板', material: '暖白灰泥', description: '形成小屋一侧的外立面，拆开后可看到墙板厚度与内部结构。' },
  'Wall.Right': { layer: 'walls', title: '右侧墙板', material: '暖白灰泥', description: '右侧墙体设有一扇侧窗，观察室内采光与墙体构成。' },
  'Door.Front': { layer: 'openings', title: '入户门', material: '木板与黄铜把手', description: '独立门扇和门框嵌在正面墙的开口内，随墙体一起移开。' },
  'Window.Front.Left': { layer: 'openings', title: '正面左窗', material: '木框与浅蓝玻璃', description: '由窗框、分格木条和玻璃片组成，采用简化几何便于近距离查看。' },
  'Window.Front.Right': { layer: 'openings', title: '正面右窗', material: '木框与浅蓝玻璃', description: '与另一扇正面窗共同为室内提供采光，并保持立面均衡。' },
  'Window.Side.Right': { layer: 'openings', title: '侧窗', material: '木框与浅蓝玻璃', description: '位于右侧墙板中部，拆解墙体后可以观察窗框如何嵌入开口。' },
  'Roof.Frame': { layer: 'roof', title: '屋架', material: '浅色木梁', description: '成对椽条从屋脊延伸至檐口，并由屋脊梁和檩条连接。' },
  'Roof.Covering': { layer: 'roof', title: '双坡屋面', material: 'Poly Haven 瓦片纹理', description: '两片坡面覆盖屋架。纹理来自公开 CC0 素材，颜色在 Blender 中调为森林绿。' },
  'Interior.Furnishings': { layer: 'interior', title: '室内陈设', material: '木桌椅与金属细节', description: '简化的桌椅和壁架用于表现空间尺度；可独立隐藏，方便观察地板和框架。' },
};
const COMPONENT_DETAILS = new Map(
  Object.entries(COMPONENTS).map(([name, detail]) => [normalizeObjectName(name), detail]),
);

const LAYER_ROOTS: Record<Layer, string[]> = {
  roof: ['Roof.Frame', 'Roof.Covering'],
  walls: ['Wall.Front', 'Wall.Back', 'Wall.Left', 'Wall.Right'],
  structure: ['House.Foundation', 'House.Floor', 'House.Frame'],
  openings: ['Door.Front', 'Window.Front.Left', 'Window.Front.Right', 'Window.Side.Right'],
  interior: ['Interior.Furnishings'],
  ground: ['Ground'],
};

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error('小屋观察台页面缺少必要元素：' + selector);
  return element;
}

const viewer = requiredElement<HTMLDivElement>('#viewer');
const status = requiredElement<HTMLDivElement>('#status');
const statusText = requiredElement<HTMLSpanElement>('#status-text');
const errorMessage = requiredElement<HTMLDivElement>('#error-message');
const errorDetail = requiredElement<HTMLSpanElement>('#error-detail');
const retryButton = requiredElement<HTMLButtonElement>('#retry-load');
const resetButton = requiredElement<HTMLButtonElement>('#reset-view');
const zoomInButton = requiredElement<HTMLButtonElement>('#zoom-in');
const zoomOutButton = requiredElement<HTMLButtonElement>('#zoom-out');
const explosionRange = requiredElement<HTMLInputElement>('#explode-range');
const explosionOutput = requiredElement<HTMLOutputElement>('#explode-value');
const componentTitle = requiredElement<HTMLHeadingElement>('#component-title');
const componentDescription = requiredElement<HTMLParagraphElement>('#component-description');
const componentMaterial = requiredElement<HTMLSpanElement>('#component-material');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e7df');
scene.add(new THREE.HemisphereLight('#fffdf6', '#899386', 2.15));

const keyLight = new THREE.DirectionalLight('#fff1dc', 3.2);
keyLight.position.set(-6, 10, 7);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight('#d8e7e0', 1.25);
fillLight.position.set(6, 5, -6);
scene.add(fillLight);

const camera = new THREE.PerspectiveCamera(37, 1, 0.05, 100);
camera.up.set(0, 1, 0);

let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let modelRoot: THREE.Group | null = null;
let selectionBox: THREE.BoxHelper | null = null;
let selectedRoot: THREE.Object3D | null = null;
const componentRoots = new Map<string, THREE.Object3D>();
const originalPositions = new Map<string, THREE.Vector3>();
const layerState: Record<Layer, boolean> = {
  roof: true,
  walls: true,
  structure: true,
  openings: true,
  interior: true,
  ground: true,
};

function setStatus(state: 'loading' | 'loaded' | 'error', message: string) {
  status.dataset.state = state;
  viewer.dataset.state = state;
  statusText.textContent = message;
}

function setControlsEnabled(enabled: boolean) {
  resetButton.disabled = !enabled;
  zoomInButton.disabled = !enabled;
  zoomOutButton.disabled = !enabled;
  explosionRange.disabled = !enabled;
  document.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) => {
    input.disabled = !enabled;
  });
  document.querySelectorAll<HTMLButtonElement>('.preset-button, #show-all').forEach((button) => {
    button.disabled = !enabled;
  });
}

function renderScene() {
  if (renderer) renderer.render(scene, camera);
}

function showError(message: string) {
  setStatus('error', '场景无法加载');
  errorDetail.textContent = message;
  errorMessage.hidden = false;
  retryButton.disabled = false;
  setControlsEnabled(false);
}

function resizeViewer() {
  if (!renderer) return;
  const width = Math.max(1, viewer.clientWidth);
  const height = Math.max(1, viewer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateExplosion(value: number) {
  const amount = THREE.MathUtils.clamp(value / 100, 0, 1);
  explosionOutput.value = `${Math.round(amount * 100)}%`;
  explosionRange.value = String(Math.round(amount * 100));
  document.querySelectorAll<HTMLButtonElement>('.preset-button').forEach((button) => {
    button.classList.toggle('is-active', (button.id === 'assemble-all' && amount === 0) || (button.id === 'explode-all' && amount === 1));
  });

  if (!modelRoot) return;
  const offsets: Record<string, THREE.Vector3> = {
    'Roof.Covering': new THREE.Vector3(0, 1.05, 0),
    'Roof.Frame': new THREE.Vector3(0, 0.55, 0),
    'Wall.Front': new THREE.Vector3(0, 0, -0.78),
    'Wall.Back': new THREE.Vector3(0, 0, 0.78),
    'Wall.Left': new THREE.Vector3(-0.78, 0, 0),
    'Wall.Right': new THREE.Vector3(0.78, 0, 0),
  };

  for (const [name, offset] of Object.entries(offsets)) {
    const key = normalizeObjectName(name);
    const root = componentRoots.get(key);
    const initial = originalPositions.get(key);
    if (root && initial) root.position.copy(initial).addScaledVector(offset, amount);
  }
  renderScene();
}

function applyLayerVisibility() {
  if (!modelRoot) return;
  for (const [layer, names] of Object.entries(LAYER_ROOTS) as [Layer, string[]][]) {
    for (const name of names) {
      const root = componentRoots.get(normalizeObjectName(name));
      if (root) root.visible = layerState[layer];
    }
  }
  renderScene();
}

function isEffectivelyVisible(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current && current !== modelRoot) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function showComponent(root: THREE.Object3D | null) {
  if (selectionBox) {
    scene.remove(selectionBox);
    selectionBox.geometry.dispose();
    const helperMaterial = selectionBox.material;
    if (Array.isArray(helperMaterial)) helperMaterial.forEach((material) => material.dispose());
    else helperMaterial.dispose();
    selectionBox = null;
  }
  selectedRoot = root;

  if (!root) {
    componentTitle.textContent = '一座紧凑的小屋';
    componentDescription.textContent = '选择屋顶、墙板或木构件，查看它在房屋中的位置与作用。';
    componentMaterial.textContent = '整体';
    renderScene();
    return;
  }

  const detail = COMPONENT_DETAILS.get(normalizeObjectName(root.name));
  if (!detail) return;
  componentTitle.textContent = detail.title;
  componentDescription.textContent = detail.description;
  componentMaterial.textContent = detail.material;

  selectionBox = new THREE.BoxHelper(root, '#2f7867');
  selectionBox.material.depthTest = false;
  selectionBox.material.transparent = true;
  selectionBox.material.opacity = 0.92;
  selectionBox.renderOrder = 3;
  scene.add(selectionBox);
  renderScene();
}

function findComponentRoot(object: THREE.Object3D): THREE.Object3D | null {
  let current: THREE.Object3D | null = object;
  while (current && current !== modelRoot) {
    if (COMPONENT_DETAILS.has(normalizeObjectName(current.name))) return current;
    current = current.parent;
  }
  return null;
}

function installPicking(root: THREE.Group, canvas: HTMLCanvasElement) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPosition: { x: number; y: number } | null = null;

  canvas.addEventListener('pointerdown', (event) => {
    downPosition = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!downPosition || Math.hypot(event.clientX - downPosition.x, event.clientY - downPosition.y) > 6) {
      downPosition = null;
      return;
    }
    downPosition = null;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(root, true).find((intersection) => findComponentRoot(intersection.object));
    showComponent(hit ? findComponentRoot(hit.object) : null);
  });
}

function fitCamera(root: THREE.Group) {
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) throw new Error('模型中没有可显示的几何体。');

  const center = bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const centeredBounds = new THREE.Box3().setFromObject(root);
  const size = centeredBounds.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z, 1);
  const target = new THREE.Vector3(0, 0, 0);
  const direction = new THREE.Vector3(1.2, 0.95, -1.55).normalize();
  camera.position.copy(target).addScaledVector(direction, span * 2.5);
  camera.near = Math.max(span / 1000, 0.01);
  camera.far = span * 30;
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(target);
    controls.minDistance = span * 0.62;
    controls.maxDistance = span * 5.2;
    controls.maxTargetRadius = span * 1.5;
    controls.update();
    controls.saveState();
  }
}

function loadModel() {
  const activeRenderer = renderer;
  if (!activeRenderer || !controls) return;
  setStatus('loading', '正在加载小屋模型…');
  errorMessage.hidden = true;
  retryButton.disabled = true;
  setControlsEnabled(false);
  const loader = new GLTFLoader();

  loader.load(
    import.meta.env.BASE_URL + 'models/scene.glb',
    (gltf) => {
      if (modelRoot) scene.remove(modelRoot);
      modelRoot = gltf.scene;
      componentRoots.clear();
      originalPositions.clear();
      modelRoot.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
        const key = normalizeObjectName(object.name);
        if (COMPONENT_DETAILS.has(key)) {
          componentRoots.set(key, object);
          originalPositions.set(key, object.position.clone());
        }
      });

      const missingComponents = Object.keys(COMPONENTS).filter((name) => !componentRoots.has(normalizeObjectName(name)));
      if (missingComponents.length > 0) {
        showError('模型缺少可交互构件：' + missingComponents.join('、'));
        return;
      }

      fitCamera(modelRoot);
      scene.add(modelRoot);
      installPicking(modelRoot, activeRenderer.domElement);
      updateExplosion(Number(explosionRange.value));
      applyLayerVisibility();
      showComponent(null);
      setControlsEnabled(true);
      retryButton.disabled = true;
      errorMessage.hidden = true;
      setStatus('loaded', '小屋模型已就绪');
    },
    (progress) => {
      if (progress.total > 0) {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        setStatus('loading', `正在加载小屋模型 ${percentage}%`);
      }
    },
    (error) => {
      console.error('小屋 GLB 加载失败', error);
      showError('模型文件无法读取。请检查网络后重试；模型与贴图均随网页静态发布。');
    },
  );
}

try {
  const activeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer = activeRenderer;
  activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  activeRenderer.setSize(Math.max(1, viewer.clientWidth), Math.max(1, viewer.clientHeight), false);
  activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
  activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  activeRenderer.toneMappingExposure = 1.08;
  activeRenderer.shadowMap.enabled = true;
  activeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  activeRenderer.domElement.setAttribute('aria-label', '可旋转、缩放和拆解的小屋 3D 模型');
  activeRenderer.domElement.setAttribute('role', 'img');
  viewer.append(activeRenderer.domElement);

  const orbitControls = new OrbitControls(camera, activeRenderer.domElement);
  controls = orbitControls;
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.075;
  orbitControls.enablePan = true;
  orbitControls.minPolarAngle = 0.12;
  orbitControls.maxPolarAngle = 1.48;
  orbitControls.cursor.set(0, 0, 0);
  orbitControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  orbitControls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  orbitControls.mouseButtons.RIGHT = THREE.MOUSE.PAN;

  explosionRange.addEventListener('input', () => updateExplosion(Number(explosionRange.value)));
  document.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) => {
    input.addEventListener('change', () => {
      const layer = input.dataset.layer as Layer | undefined;
      if (!layer || !(layer in layerState)) return;
      layerState[layer] = input.checked;
      applyLayerVisibility();
      if (selectedRoot && !isEffectivelyVisible(selectedRoot)) showComponent(null);
    });
  });

  document.querySelector('#assemble-all')?.addEventListener('click', () => updateExplosion(0));
  document.querySelector('#explode-all')?.addEventListener('click', () => updateExplosion(100));
  document.querySelector('#show-all')?.addEventListener('click', () => {
    for (const layer of Object.keys(layerState) as Layer[]) layerState[layer] = true;
    document.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) => { input.checked = true; });
    applyLayerVisibility();
  });

  resetButton.addEventListener('click', () => {
    updateExplosion(0);
    for (const layer of Object.keys(layerState) as Layer[]) layerState[layer] = true;
    document.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) => { input.checked = true; });
    applyLayerVisibility();
    controls?.reset();
    showComponent(null);
  });

  function zoom(factor: number) {
    if (!controls) return;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }
  zoomInButton.addEventListener('click', () => zoom(0.82));
  zoomOutButton.addEventListener('click', () => zoom(1.22));
  retryButton.addEventListener('click', loadModel);
  window.addEventListener('resize', resizeViewer);

  activeRenderer.setAnimationLoop(() => {
    controls?.update();
    if (selectionBox && selectedRoot) selectionBox.update();
    activeRenderer.render(scene, camera);
  });
  loadModel();
} catch (error) {
  const detail = error instanceof Error ? error.message : '当前浏览器无法初始化 3D 视图。';
  showError(detail);
  retryButton.onclick = () => window.location.reload();
  console.error('小屋 WebGL 初始化失败', error);
}
