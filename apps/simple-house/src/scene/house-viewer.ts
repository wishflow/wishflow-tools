import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type HouseLayer = 'roof' | 'walls' | 'structure' | 'openings' | 'interior' | 'ground';
export type ViewerStatus = 'loading' | 'loaded' | 'error';

export type ComponentDetail = {
  layer: HouseLayer;
  title: string;
  material: string;
  description: string;
};

export type HouseViewerFeedback = {
  status: ViewerStatus;
  message: string;
  errorMessage: string;
  selected: ComponentDetail | null;
};

export type HouseSceneControls = {
  setExplosion(value: number): void;
  setLayer(layer: HouseLayer, visible: boolean): void;
  showAll(): void;
  reset(): void;
  zoom(factor: number): void;
  retry(): void;
  dispose(): void;
};

type FeedbackListener = (patch: Partial<HouseViewerFeedback>) => void;

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

const LAYER_ROOTS: Record<HouseLayer, string[]> = {
  roof: ['Roof.Frame', 'Roof.Covering'],
  walls: ['Wall.Front', 'Wall.Back', 'Wall.Left', 'Wall.Right'],
  structure: ['House.Foundation', 'House.Floor', 'House.Frame'],
  openings: ['Door.Front', 'Window.Front.Left', 'Window.Front.Right', 'Window.Side.Right'],
  interior: ['Interior.Furnishings'],
  ground: ['Ground'],
};

function disposeModel(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

export function mountHouseScene(viewer: HTMLElement, onFeedback: FeedbackListener): HouseSceneControls {
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
  let disposed = false;
  const componentRoots = new Map<string, THREE.Object3D>();
  const originalPositions = new Map<string, THREE.Vector3>();
  const layerState: Record<HouseLayer, boolean> = {
    roof: true,
    walls: true,
    structure: true,
    openings: true,
    interior: true,
    ground: true,
  };

  function setStatus(status: ViewerStatus, message: string, errorMessage = '') {
    onFeedback({ status, message, errorMessage });
  }

  function renderScene() {
    renderer?.render(scene, camera);
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
      const objectRoot = componentRoots.get(key);
      const initial = originalPositions.get(key);
      if (objectRoot && initial) objectRoot.position.copy(initial).addScaledVector(offset, amount);
    }
    renderScene();
  }

  function applyLayerVisibility() {
    if (!modelRoot) return;
    for (const [layer, names] of Object.entries(LAYER_ROOTS) as [HouseLayer, string[]][]) {
      for (const name of names) {
        const objectRoot = componentRoots.get(normalizeObjectName(name));
        if (objectRoot) objectRoot.visible = layerState[layer];
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

  function showComponent(objectRoot: THREE.Object3D | null) {
    if (selectionBox) {
      scene.remove(selectionBox);
      selectionBox.geometry.dispose();
      const helperMaterial = selectionBox.material;
      if (Array.isArray(helperMaterial)) helperMaterial.forEach((material) => material.dispose());
      else helperMaterial.dispose();
      selectionBox = null;
    }
    selectedRoot = objectRoot;
    const detail = objectRoot ? COMPONENT_DETAILS.get(normalizeObjectName(objectRoot.name)) ?? null : null;
    onFeedback({ selected: detail });

    if (!objectRoot || !detail) {
      renderScene();
      return;
    }

    selectionBox = new THREE.BoxHelper(objectRoot, '#2f7867');
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

  function installPicking(model: THREE.Group, canvas: HTMLCanvasElement) {
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
      const hit = raycaster.intersectObject(model, true).find((intersection) => findComponentRoot(intersection.object));
      showComponent(hit ? findComponentRoot(hit.object) : null);
    });
  }

  function fitCamera(model: THREE.Group) {
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) throw new Error('模型中没有可显示的几何体。');

    const center = bounds.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const centeredBounds = new THREE.Box3().setFromObject(model);
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
    if (!activeRenderer || !controls || disposed) return;
    setStatus('loading', '正在加载小屋模型…');
    onFeedback({ selected: null });

    const loader = new GLTFLoader();
    loader.load(
      import.meta.env.BASE_URL + 'models/scene.glb',
      (gltf) => {
        if (disposed) {
          disposeModel(gltf.scene);
          return;
        }
        if (modelRoot) {
          scene.remove(modelRoot);
          disposeModel(modelRoot);
        }
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
          disposeModel(modelRoot);
          modelRoot = null;
          setStatus('error', '场景无法加载', '模型缺少可交互构件：' + missingComponents.join('、'));
          return;
        }

        fitCamera(modelRoot);
        scene.add(modelRoot);
        installPicking(modelRoot, activeRenderer.domElement);
        applyLayerVisibility();
        showComponent(null);
        setStatus('loaded', '小屋模型已就绪');
      },
      (progress) => {
        if (disposed) return;
        if (progress.total > 0) {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          setStatus('loading', `正在加载小屋模型 ${percentage}%`);
        }
      },
      (error) => {
        if (disposed) return;
        console.error('小屋 GLB 加载失败', error);
        setStatus('error', '场景无法加载', '模型文件无法读取。请检查网络后重试；模型与贴图均随网页静态发布。');
      },
    );
  }

  function zoom(factor: number) {
    if (!controls) return;
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor);
    camera.position.copy(controls.target).add(offset);
    controls.update();
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

    window.addEventListener('resize', resizeViewer);
    activeRenderer.setAnimationLoop(() => {
      controls?.update();
      if (selectionBox && selectedRoot) selectionBox.update();
      activeRenderer.render(scene, camera);
    });
    loadModel();
  } catch (error) {
    const detail = error instanceof Error ? error.message : '当前浏览器无法初始化 3D 视图。';
    setStatus('error', '场景无法加载', detail);
    console.error('小屋 WebGL 初始化失败', error);
  }

  return {
    setExplosion: updateExplosion,
    setLayer(layer, visible) {
      layerState[layer] = visible;
      applyLayerVisibility();
      if (selectedRoot && !isEffectivelyVisible(selectedRoot)) showComponent(null);
    },
    showAll() {
      for (const layer of Object.keys(layerState) as HouseLayer[]) layerState[layer] = true;
      applyLayerVisibility();
    },
    reset() {
      updateExplosion(0);
      for (const layer of Object.keys(layerState) as HouseLayer[]) layerState[layer] = true;
      applyLayerVisibility();
      controls?.reset();
      showComponent(null);
    },
    zoom,
    retry() {
      if (!renderer) {
        window.location.reload();
        return;
      }
      loadModel();
    },
    dispose() {
      disposed = true;
      window.removeEventListener('resize', resizeViewer);
      renderer?.setAnimationLoop(null);
      controls?.dispose();
      if (selectionBox) {
        scene.remove(selectionBox);
        selectionBox.geometry.dispose();
        const helperMaterial = selectionBox.material;
        if (Array.isArray(helperMaterial)) helperMaterial.forEach((material) => material.dispose());
        else helperMaterial.dispose();
      }
      if (modelRoot) {
        scene.remove(modelRoot);
        disposeModel(modelRoot);
      }
      renderer?.dispose();
      renderer?.domElement.remove();
    },
  };
}
