import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import '@wishflow/site-shell';
import './locales';
import './styles.css';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error('Missing required page element: ' + selector);
  return element;
}

const viewer = requiredElement<HTMLDivElement>('#viewer');
const status = requiredElement<HTMLDivElement>('#status');
const statusText = requiredElement<HTMLSpanElement>('#status-text');
const stateLabel = requiredElement<HTMLSpanElement>('#scene-state-label');
const errorMessage = requiredElement<HTMLDivElement>('#error-message');
const resetButton = requiredElement<HTMLButtonElement>('#reset-view');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#dfe7ed');
scene.add(new THREE.HemisphereLight('#ffffff', '#738092', 2.2));

const keyLight = new THREE.DirectionalLight('#fff3df', 3.1);
keyLight.position.set(-3.5, 5.5, 6.5);
scene.add(keyLight);

const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
camera.position.set(4, 3, 6);

let renderer: THREE.WebGLRenderer | null = null;
let defaultCameraPosition = camera.position.clone();
let defaultTarget = new THREE.Vector3();

function setStatus(state: 'loading' | 'loaded' | 'error', message: string) {
  status.dataset.state = state;
  viewer.dataset.state = state;
  statusText.textContent = message;
  stateLabel.textContent = state === 'loaded' ? '已就绪' : state === 'error' ? '加载失败' : '准备中';
}

function showError(message: string) {
  setStatus('error', '场景无法加载');
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  resetButton.disabled = true;
}

function resizeViewer() {
  if (!renderer) return;
  const width = Math.max(1, viewer.clientWidth);
  const height = Math.max(1, viewer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

try {
  const activeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer = activeRenderer;
  activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  activeRenderer.setSize(Math.max(1, viewer.clientWidth), Math.max(1, viewer.clientHeight), false);
  activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
  activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  activeRenderer.toneMappingExposure = 1.05;
  activeRenderer.domElement.setAttribute('aria-label', '3D 模型画布');
  viewer.append(activeRenderer.domElement);

  const controls = new OrbitControls(camera, activeRenderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.1;
  controls.maxDistance = 200;
  controls.target.set(0, 0, 0);

  const loader = new GLTFLoader();
  loader.load(
    import.meta.env.BASE_URL + 'models/scene.glb',
    (gltf) => {
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      if (bounds.isEmpty()) {
        showError('模型没有可显示的几何体，请检查 Blender 导出内容。');
        return;
      }

      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      model.position.sub(center);
      scene.add(model);

      const span = Math.max(size.x, size.y, size.z, 0.1);
      const direction = new THREE.Vector3(1.5, 1.0, 1.8).normalize();
      camera.position.copy(direction.multiplyScalar(span * 2.5));
      camera.near = Math.max(span / 1000, 0.01);
      camera.far = Math.max(span * 100, 100);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
      defaultCameraPosition = camera.position.clone();
      defaultTarget = controls.target.clone();

      errorMessage.hidden = true;
      resetButton.disabled = false;
      setStatus('loaded', '场景已就绪');
    },
    undefined,
    (error) => {
      console.error('GLB load failed', error);
      showError('模型文件加载失败。请确认 public/models/scene.glb 已提交并能从当前页面路径访问。');
    },
  );

  resetButton.addEventListener('click', () => {
    camera.position.copy(defaultCameraPosition);
    controls.target.copy(defaultTarget);
    controls.update();
  });
  window.addEventListener('resize', resizeViewer);
  activeRenderer.setAnimationLoop(() => {
    controls.update();
    activeRenderer.render(scene, camera);
  });
} catch (error) {
  const detail = error instanceof Error ? error.message : '当前浏览器无法初始化 3D 视图。';
  showError(detail);
  console.error('WebGL initialization failed', error);
}
