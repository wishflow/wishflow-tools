<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import './styles.css';
import {
  mountHouseScene,
  type ComponentDetail,
  type HouseLayer,
  type HouseSceneControls,
  type ViewerStatus,
} from './house-viewer';

const viewerHost = ref<HTMLDivElement | null>(null);
const layerItems: Array<{ key: HouseLayer; label: string; count: string; swatch: string }> = [
  { key: 'roof', label: '屋顶与屋架', count: '02', swatch: 'swatch-roof' },
  { key: 'walls', label: '四面墙体', count: '04', swatch: 'swatch-wall' },
  { key: 'structure', label: '基础与木结构', count: '03', swatch: 'swatch-wood' },
  { key: 'openings', label: '门与窗', count: '04', swatch: 'swatch-glass' },
  { key: 'interior', label: '室内陈设', count: '01', swatch: 'swatch-interior' },
  { key: 'ground', label: '观察地台', count: '01', swatch: 'swatch-ground' },
];

const state = reactive({
  status: 'loading' as ViewerStatus,
  message: '正在准备模型…',
  errorMessage: '',
  selected: null as ComponentDetail | null,
  explosion: 0,
  layers: {
    roof: true,
    walls: true,
    structure: true,
    openings: true,
    interior: true,
    ground: true,
  } as Record<HouseLayer, boolean>,
});

const isReady = computed(() => state.status === 'loaded');
let sceneControls: HouseSceneControls | undefined;

onMounted(() => {
  if (viewerHost.value) {
    sceneControls = mountHouseScene(viewerHost.value, (feedback) => Object.assign(state, feedback));
  }
});

onBeforeUnmount(() => sceneControls?.dispose());

function setExplosion(event: Event) {
  const amount = Number((event.currentTarget as HTMLInputElement).value);
  state.explosion = amount;
  sceneControls?.setExplosion(amount);
}

function setLayer(layer: HouseLayer, event: Event) {
  const visible = (event.currentTarget as HTMLInputElement).checked;
  state.layers[layer] = visible;
  sceneControls?.setLayer(layer, visible);
}

function showAll() {
  for (const layer of Object.keys(state.layers) as HouseLayer[]) state.layers[layer] = true;
  sceneControls?.showAll();
}

function reset() {
  state.explosion = 0;
  for (const layer of Object.keys(state.layers) as HouseLayer[]) state.layers[layer] = true;
  sceneControls?.reset();
}

function zoom(factor: number) {
  sceneControls?.zoom(factor);
}
</script>

<template>
  <div class="house-detail">
    <section class="page-intro" aria-labelledby="page-title">
      <div>
        <p class="eyebrow">建筑 · 场景 01</p>
        <h1 id="page-title">木结构小屋</h1>
        <p class="intro-copy">从屋面瓦片到木结构框架，沿着构造一层层观察。</p>
      </div>
      <div class="project-stamp" aria-label="房屋基本信息">
        <span>STUDY NO. 01</span>
        <strong>6.0 × 5.0 m</strong>
        <small>单层木结构 · 约 30 m²</small>
      </div>
    </section>

    <section class="workbench" aria-label="小屋 3D 观察与控制">
      <div class="viewer-column">
        <div class="viewer-frame">
          <div id="viewer" ref="viewerHost" class="viewer" :data-state="state.status">
            <div class="viewer-topline" aria-hidden="true">
              <span>ASSEMBLY VIEW</span><span>01 / 01</span>
            </div>
            <div class="viewer-grid" aria-hidden="true"></div>
            <div id="status" class="status" role="status" aria-live="polite" :data-state="state.status">
              <span class="status-dot" aria-hidden="true"></span>
              <span id="status-text">{{ state.message }}</span>
            </div>
            <div v-if="state.status === 'error'" id="error-message" class="error-message" role="alert">
              <strong>模型暂时无法显示</strong>
              <span id="error-detail">{{ state.errorMessage }}</span>
              <button id="retry-load" type="button" @click="sceneControls?.retry()">重新加载</button>
            </div>
            <button id="reset-view" class="reset-button" type="button" aria-label="复位视角、拆解进度和构件显隐" :disabled="!isReady" @click="reset">
              <span aria-hidden="true">↺</span> 复位
            </button>
            <div class="viewer-bottomline" aria-hidden="true">
              <span>ORBIT · ZOOM · PAN</span><span>DRAG TO EXPLORE</span>
            </div>
          </div>
        </div>
        <div class="viewer-toolbar" aria-label="视图快捷操作">
          <p><span class="toolbar-key">拖动</span> 旋转 <span class="toolbar-separator">·</span> <span class="toolbar-key">滚轮</span> 缩放 <span class="toolbar-separator">·</span> 右键拖动平移</p>
          <div class="zoom-controls">
            <button id="zoom-out" type="button" aria-label="缩小模型" :disabled="!isReady" @click="zoom(1.22)">−</button>
            <button id="zoom-in" type="button" aria-label="放大模型" :disabled="!isReady" @click="zoom(0.82)">＋</button>
          </div>
        </div>
      </div>

      <aside class="inspector" aria-label="模型控制面板">
        <section class="control-section explode-section">
          <div class="section-heading">
            <div><span class="section-index">01</span><h2>拆解视图</h2></div>
            <output id="explode-value" for="explode-range">{{ state.explosion }}%</output>
          </div>
          <p class="section-copy">让屋顶与四面墙体沿构造方向移开。</p>
          <label class="range-label" for="explode-range">
            <span class="sr-only">拆解进度</span>
            <input id="explode-range" type="range" min="0" max="100" step="1" :value="state.explosion" :disabled="!isReady" @input="setExplosion" />
          </label>
          <div class="range-scale"><span>组装</span><span>拆解</span></div>
          <div class="preset-row">
            <button id="assemble-all" type="button" class="preset-button" :class="{ 'is-active': state.explosion === 0 }" :disabled="!isReady" @click="state.explosion = 0; sceneControls?.setExplosion(0)">整体</button>
            <button id="explode-all" type="button" class="preset-button" :class="{ 'is-active': state.explosion === 100 }" :disabled="!isReady" @click="state.explosion = 100; sceneControls?.setExplosion(100)">完全拆解</button>
          </div>
        </section>

        <section class="control-section layer-section">
          <div class="section-heading">
            <div><span class="section-index">02</span><h2>构件显隐</h2></div>
            <button id="show-all" class="text-button" type="button" :disabled="!isReady" @click="showAll">显示全部</button>
          </div>
          <div class="layer-list">
            <label v-for="item in layerItems" :key="item.key" class="layer-item">
              <input type="checkbox" :data-layer="item.key" :checked="state.layers[item.key]" :disabled="!isReady" @change="setLayer(item.key, $event)" />
              <span class="layer-swatch" :class="item.swatch"></span><span>{{ item.label }}</span><span class="layer-count">{{ item.count }}</span>
            </label>
          </div>
        </section>

        <section class="component-card" aria-live="polite" aria-atomic="true">
          <div class="component-card-top"><span class="section-index">03 / SELECTED PART</span><span id="component-material" class="material-chip">{{ state.selected?.material ?? '整体' }}</span></div>
          <h2 id="component-title">{{ state.selected?.title ?? '一座紧凑的小屋' }}</h2>
          <p id="component-description">{{ state.selected?.description ?? '选择屋顶、墙板或木构件，查看它在房屋中的位置与作用。' }}</p>
        </section>

        <div class="inspector-footnote"><span class="footnote-mark">i</span><p>点击模型中的任意构件查看说明。键盘用户可通过上方显隐清单逐组检查。</p></div>
      </aside>
    </section>
    <p class="asset-credit"><a href="https://polyhaven.com/" target="_blank" rel="noopener noreferrer">Poly Haven · CC0</a></p>
  </div>
</template>
