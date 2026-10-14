<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { getLanguage, subscribeLanguage } from '@wishflow/site-shell';
import './styles.css';
import { copy, partDetails, t, type BicycleCopy } from './locales';
import {
  mountBicycleScene,
  type BicycleLayer,
  type BicycleMode,
  type BicyclePartId,
  type BicycleSceneControls,
  type ViewerStatus,
} from './bicycle-viewer';

const viewerHost = ref<HTMLDivElement | null>(null);
const language = ref<'en' | 'zh'>(getLanguage());
const state = reactive({
  status: 'loading' as ViewerStatus,
  errorCode: '' as '' | 'textures' | 'webgl' | 'build',
  selectedPartId: null as BicyclePartId | null,
  explosion: 0,
  mode: 'inspect' as BicycleMode,
  transitioning: false,
  speedKmh: 0,
  gearIndex: 0,
  riding: false,
  kickstand: false,
  fallen: false,
  steeringDegrees: 0,
  frontBrake: 0,
  rearBrake: 0,
  layers: {
    frame: true,
    steering: true,
    frontWheel: true,
    rearWheel: true,
    drivetrain: true,
    frontBrake: true,
    rearBrake: true,
    seatAccessories: true,
  } as Record<BicycleLayer, boolean>,
  panelOpen: typeof window !== 'undefined' && window.matchMedia('(min-width: 820px)').matches,
});

let sceneControls: BicycleSceneControls | undefined;
let unsubscribeLanguage: (() => void) | undefined;
const isReady = computed(() => state.status === 'loaded');
const canInspect = computed(() => isReady.value && state.mode === 'inspect' && !state.transitioning && !state.fallen);
const canOperate = computed(() => isReady.value && state.mode === 'operate' && !state.transitioning && !state.fallen);
const canRecover = computed(() => isReady.value && state.mode === 'operate' && !state.transitioning && state.fallen && state.speedKmh <= 0.35);
const selectedPart = computed(() => state.selectedPartId ? partDetails[state.selectedPartId] : null);
const currentGearNumber = computed(() => 8 - state.gearIndex);
const rideStateCopy = computed(() => state.fallen ? copy.fallen : state.riding ? copy.riding : copy.stopped);
const disabledReason = computed(() => {
  if (state.transitioning) return copy.reasonTransition;
  if (state.fallen) return copy.reasonFallen;
  if (state.speedKmh > 0.35) return copy.reasonMoving;
  if (state.mode !== 'inspect') return copy.reasonOperating;
  return copy.reasonReady;
});
const loadError = computed(() => state.errorCode === 'textures' ? copy.statusTextures : state.errorCode === 'webgl' ? copy.statusWebgl : copy.statusBuild);
const layerItems: Array<{ key: BicycleLayer; label: BicycleCopy; count: string; swatch: string }> = [
  { key: 'frame', label: copy.groupFrame, count: '08', swatch: 'swatch-frame' },
  { key: 'steering', label: copy.groupSteering, count: '09', swatch: 'swatch-steering' },
  { key: 'frontWheel', label: copy.groupFrontWheel, count: '32', swatch: 'swatch-wheel' },
  { key: 'rearWheel', label: copy.groupRearWheel, count: '32', swatch: 'swatch-wheel' },
  { key: 'drivetrain', label: copy.groupDrivetrain, count: '08', swatch: 'swatch-drive' },
  { key: 'frontBrake', label: copy.groupFrontBrake, count: '02', swatch: 'swatch-brake' },
  { key: 'rearBrake', label: copy.groupRearBrake, count: '02', swatch: 'swatch-brake' },
  { key: 'seatAccessories', label: copy.groupSeatAccessories, count: '06', swatch: 'swatch-accessory' },
];

function text(pair: BicycleCopy) {
  return t(pair, language.value);
}

onMounted(() => {
  unsubscribeLanguage = subscribeLanguage((nextLanguage) => { language.value = nextLanguage; });
  if (viewerHost.value) {
    sceneControls = mountBicycleScene(viewerHost.value, (patch) => Object.assign(state, patch), (command) => {
      if (command === 'reset') reset();
    });
  }
});

onBeforeUnmount(() => {
  unsubscribeLanguage?.();
  sceneControls?.dispose();
});

function setMode(mode: BicycleMode) {
  sceneControls?.setMode(mode);
}

function setExplosion(event: Event) {
  const amount = Number((event.currentTarget as HTMLInputElement).value);
  state.explosion = amount;
  sceneControls?.setExplosion(amount);
}

function setLayer(layer: BicycleLayer, event: Event) {
  const visible = (event.currentTarget as HTMLInputElement).checked;
  state.layers[layer] = visible;
  sceneControls?.setLayer(layer, visible);
}

function showAll() {
  for (const layer of Object.keys(state.layers) as BicycleLayer[]) state.layers[layer] = true;
  sceneControls?.showAll();
}

function assemble() {
  state.explosion = 0;
  sceneControls?.setExplosion(0);
}

function explodeAll() {
  state.explosion = 100;
  sceneControls?.setExplosion(100);
}

function reset() {
  state.explosion = 0;
  state.mode = 'inspect';
  state.transitioning = false;
  state.speedKmh = 0;
  state.gearIndex = 0;
  state.riding = false;
  state.kickstand = false;
  state.fallen = false;
  state.steeringDegrees = 0;
  state.frontBrake = 0;
  state.rearBrake = 0;
  state.selectedPartId = null;
  for (const layer of Object.keys(state.layers) as BicycleLayer[]) state.layers[layer] = true;
  sceneControls?.reset();
}

function setLayerVisibility(layer: BicycleLayer, event: Event) {
  setLayer(layer, event);
}

function holdAccelerator(active: boolean) {
  sceneControls?.setThrottle(active);
}

function holdBrake(which: 'front' | 'rear', active: boolean) {
  sceneControls?.setBrake(which, active);
}

function setSteering(event: Event) {
  const value = Number((event.currentTarget as HTMLInputElement).value);
  sceneControls?.setSteering(value);
}

function onPanelToggle(event: Event) {
  state.panelOpen = (event.currentTarget as HTMLDetailsElement).open;
}
</script>

<template>
  <main class="bicycle-page" :data-mode="state.mode">
    <section class="page-intro" aria-labelledby="bicycle-title">
      <div class="intro-copy-block">
        <p class="eyebrow">{{ text(copy.eyebrow) }}</p>
        <h1 id="bicycle-title">{{ text(copy.title) }}</h1>
        <p class="intro-description">{{ text(copy.intro) }}</p>
      </div>
      <div class="project-stamp" :aria-label="text(copy.dimensions)">
        <span>700C / 01</span>
        <strong>{{ text(copy.dimensions) }}</strong>
        <small>{{ text(copy.axisNote) }}</small>
      </div>
    </section>

    <div class="mode-row" :aria-label="text(copy.modeLabel)">
      <span>{{ text(copy.modeLabel) }}</span>
      <div class="mode-switch" role="group" :aria-label="text(copy.modeLabel)">
        <button id="mode-inspect" type="button" :aria-pressed="state.mode === 'inspect'" :disabled="!isReady || state.fallen" @click="setMode('inspect')">{{ text(copy.inspect) }}</button>
        <button id="mode-operate" type="button" :aria-pressed="state.mode === 'operate'" :disabled="!isReady || state.fallen" @click="setMode('operate')">{{ text(copy.operate) }}</button>
      </div>
      <span class="mode-caption">{{ text(state.mode === 'inspect' ? copy.inspect : copy.operate) }}</span>
    </div>

    <section class="workbench" :aria-label="text(copy.title)">
      <div class="viewer-column">
        <div class="viewer-frame">
          <div id="viewer" ref="viewerHost" class="viewer" :data-state="state.status" :data-mode="state.mode">
            <div class="viewer-topline" aria-hidden="true">
              <span>URBAN / 700C</span><span>{{ state.mode === 'inspect' ? 'ASSEMBLY VIEW' : 'RIDE LOOP · 8 × 4 M' }}</span>
            </div>
            <div class="viewer-ground-grid" aria-hidden="true"></div>
            <div id="status" class="status" role="status" aria-live="polite" :data-state="state.status">
              <span class="status-dot" aria-hidden="true"></span>
              <span>{{ text(state.status === 'loaded' ? copy.loaded : copy.loading) }}</span>
            </div>
            <div v-if="state.status === 'error'" id="error-message" class="error-message" role="alert">
              <strong>{{ text(copy.errorTitle) }}</strong>
              <span>{{ text(loadError) }}</span>
              <button id="retry-load" type="button" @click="sceneControls?.retry()">{{ text(copy.retry) }}</button>
            </div>
            <button id="reset-view" class="reset-button" type="button" :aria-label="text(copy.reset)" :disabled="!isReady" @click="reset">
              <span aria-hidden="true">↺</span>{{ text(copy.reset) }}
            </button>
            <div class="viewer-bottomline" aria-hidden="true">
              <span>{{ text(copy.orbitHint) }}</span><span>{{ text(state.mode === 'operate' ? copy.track : copy.selectionHint) }}</span>
            </div>
          </div>
        </div>
        <p class="canvas-instructions">{{ text(copy.mouseHelp) }}</p>
      </div>

      <aside class="inspector" :aria-label="text(copy.panelTitle)">
        <details id="control-panel" class="control-panel" :open="state.panelOpen" @toggle="onPanelToggle">
          <summary><span>{{ text(state.mode === 'inspect' ? copy.panelTitle : copy.controlsTitle) }}</span><span class="summary-mark" aria-hidden="true">⌄</span></summary>
          <div v-if="state.mode === 'inspect'" class="inspect-controls">
            <section class="control-section explode-section">
              <div class="section-heading">
                <div><span class="section-index">01</span><h2>{{ text(copy.explodeTitle) }}</h2></div>
                <output id="explode-value" for="explode-range">{{ state.explosion }}%</output>
              </div>
              <p class="section-copy">{{ text(copy.explodeHint) }}</p>
              <label class="range-label" for="explode-range">
                <span class="sr-only">{{ text(copy.explodeRange) }}</span>
                <input id="explode-range" type="range" min="0" max="100" step="1" :value="state.explosion" :disabled="!canInspect" @input="setExplosion" />
              </label>
              <div class="range-scale"><span>0 · {{ text(copy.assembled) }}</span><span>100 · {{ text(copy.explodeAll) }}</span></div>
              <div class="preset-row">
                <button id="assemble-all" type="button" class="preset-button" :class="{ 'is-active': state.explosion === 0 }" :disabled="!canInspect" @click="assemble">{{ text(copy.assembled) }}</button>
                <button id="explode-all" type="button" class="preset-button" :class="{ 'is-active': state.explosion === 100 }" :disabled="!canInspect" @click="explodeAll">{{ text(copy.explodeAll) }}</button>
              </div>
            </section>

            <section class="control-section layer-section">
              <div class="section-heading">
                <div><span class="section-index">02</span><h2>{{ text(copy.componentsTitle) }}</h2></div>
                <button id="show-all" class="text-button" type="button" :disabled="!canInspect" @click="showAll">{{ text(copy.showAll) }}</button>
              </div>
              <div class="layer-list">
                <label v-for="item in layerItems" :key="item.key" class="layer-item">
                  <input type="checkbox" :data-layer="item.key" :checked="state.layers[item.key]" :disabled="!canInspect" @change="setLayerVisibility(item.key, $event)" />
                  <span class="layer-swatch" :class="item.swatch" aria-hidden="true"></span><span>{{ text(item.label) }}</span><span class="layer-count">{{ item.count }}</span>
                </label>
              </div>
            </section>
          </div>

          <div v-else class="operate-controls">
            <section class="control-section ride-summary">
              <div class="section-heading">
                <div><span class="section-index">01</span><h2>{{ text(copy.controlsTitle) }}</h2></div>
                <span id="ride-state" class="ride-badge" :data-riding="state.riding">{{ text(rideStateCopy) }}</span>
              </div>
              <div class="speed-display">
                <strong id="speed-value">{{ state.speedKmh.toFixed(1) }} km/h</strong>
                <span>{{ text(copy.speedLabel) }} · {{ text(copy.track) }}</span>
              </div>
              <div class="speed-meter" role="meter" :aria-valuenow="state.speedKmh" aria-valuemin="0" aria-valuemax="12" :aria-label="text(copy.speedLabel)">
                <span :style="{ width: `${(state.speedKmh / 12) * 100}%` }"></span>
              </div>
              <button id="ride-toggle" type="button" class="primary-control" :disabled="!canOperate || state.fallen" @click="sceneControls?.toggleRide()">{{ text(state.riding ? copy.park : copy.ride) }}</button>
            </section>

            <section class="control-section gear-section">
              <div class="section-heading">
                <div><span class="section-index">02</span><h2>{{ text(copy.gearLabel) }}</h2></div>
                <strong id="gear-value">{{ currentGearNumber }} / 8 <small>{{ [32, 28, 24, 21, 18, 15, 13, 11][state.gearIndex] }}T</small></strong>
              </div>
              <div class="gear-controls">
                <button id="gear-down" type="button" :aria-label="text(copy.lowerGear)" :disabled="!canOperate || state.gearIndex === 0" @click="sceneControls?.shiftGear(-1)">−</button>
                <div class="gear-scale" aria-hidden="true"><span v-for="gear in 8" :key="gear" :class="{ 'is-current': currentGearNumber === gear }"></span></div>
                <button id="gear-up" type="button" :aria-label="text(copy.higherGear)" :disabled="!canOperate || state.gearIndex === 7" @click="sceneControls?.shiftGear(1)">＋</button>
              </div>
            </section>

            <section class="control-section action-section">
              <div class="section-heading"><div><span class="section-index">03</span><h2>{{ text(copy.accelerate) }} / {{ text(copy.brake) }}</h2></div></div>
              <div class="two-button-row">
                <button id="accelerate-control" type="button" class="touch-control accelerate-control" :disabled="!canOperate" @pointerdown.prevent="holdAccelerator(true)" @pointerup="holdAccelerator(false)" @pointercancel="holdAccelerator(false)" @pointerleave="holdAccelerator(false)">{{ text(copy.accelerate) }}</button>
                <button id="pedal-control" type="button" class="touch-control pedal-control" :disabled="!canOperate" @click="sceneControls?.pedal(1)">{{ text(copy.pedalOnce) }}</button>
              </div>
              <div class="two-button-row brake-row">
                <button type="button" class="touch-control brake-control" :disabled="!canOperate" @pointerdown.prevent="holdBrake('front', true)" @pointerup="holdBrake('front', false)" @pointercancel="holdBrake('front', false)" @pointerleave="holdBrake('front', false)">{{ text(copy.frontBrake) }}</button>
                <button type="button" class="touch-control brake-control" :disabled="!canOperate" @pointerdown.prevent="holdBrake('rear', true)" @pointerup="holdBrake('rear', false)" @pointercancel="holdBrake('rear', false)" @pointerleave="holdBrake('rear', false)">{{ text(copy.rearBrake) }}</button>
              </div>
            </section>

            <section class="control-section steering-section">
              <div class="section-heading">
                <div><span class="section-index">04</span><h2>{{ text(copy.steering) }}</h2></div>
                <output>{{ Math.round(state.steeringDegrees) }}°</output>
              </div>
              <label class="range-label" for="steering-range"><span class="sr-only">{{ text(copy.steering) }}</span>
                <input id="steering-range" type="range" min="-35" max="35" step="1" :value="state.steeringDegrees" :disabled="!canOperate" @input="setSteering" />
              </label>
              <button id="steering-center" type="button" class="text-button" :disabled="!canOperate" @click="sceneControls?.setSteering(0)">{{ text(copy.centerHandlebar) }}</button>
            </section>

            <section class="control-section park-section">
              <div class="two-button-row">
                <button id="kickstand-toggle" type="button" class="secondary-control" :disabled="!canOperate || state.speedKmh > 0.35 || state.fallen" @click="sceneControls?.toggleKickstand()">{{ text(state.kickstand ? copy.raiseStand : copy.lowerStand) }}</button>
                <button id="fall-toggle" type="button" class="secondary-control" :disabled="state.fallen ? !canRecover : !canOperate || state.speedKmh > 0.35" @click="sceneControls?.toggleFall()">{{ text(state.fallen ? copy.getUp : copy.layDown) }}</button>
              </div>
            </section>
          </div>
        </details>

        <section class="component-card" aria-live="polite" aria-atomic="true">
          <div class="component-card-top"><span class="section-index">{{ text(copy.selectedPart) }}</span><span class="material-chip">{{ selectedPart ? text(selectedPart.material) : text(copy.materialLabel) }}</span></div>
          <h2 id="component-title">{{ selectedPart ? text(selectedPart.title) : text(copy.wholeBike) }}</h2>
          <p id="component-description">{{ selectedPart ? text(selectedPart.description) : text(copy.wholeBikeHint) }}</p>
          <div v-if="selectedPart" class="related-system"><span>{{ text(copy.relatedLabel) }}</span><strong>{{ text(selectedPart.related) }}</strong></div>
        </section>

        <p class="control-reason" :data-state="state.fallen ? 'warning' : 'normal'">{{ text(disabledReason) }}</p>
        <div class="instruction-list">
          <p>{{ text(copy.keyboardHelp) }}</p>
          <p>{{ text(copy.touchHelp) }}</p>
        </div>
      </aside>
    </section>

    <p class="asset-credit"><a href="https://ambientcg.com/view?id=Metal012" target="_blank" rel="noopener noreferrer">{{ text(copy.assetCredit) }}</a></p>
  </main>
</template>
