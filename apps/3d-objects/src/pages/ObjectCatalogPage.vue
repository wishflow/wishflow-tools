<script setup lang="ts">
import { objectModules } from '../object-modules';
</script>

<template>
  <section class="catalog-page" aria-labelledby="catalog-title">
    <p class="eyebrow">A COLLECTION OF INTERACTIVE MODELS</p>
    <div class="catalog-heading">
      <div>
        <h1 id="catalog-title">3D Objects</h1>
        <p class="intro-copy">从可交互的三维模型中，观察结构、材质与细节。</p>
      </div>
      <span class="catalog-count"><strong>{{ String(objectModules.length).padStart(2, '0') }}</strong> 个场景</span>
    </div>

    <div class="object-grid">
      <RouterLink
        v-for="(object, index) in objectModules"
        :key="object.slug"
        class="object-card"
        :to="object.route"
      >
        <span class="object-art" aria-hidden="true">
          <img :src="object.thumbnailUrl" alt="" />
        </span>
        <span class="object-card-content">
          <span class="object-kicker">{{ object.category }} · {{ String(index + 1).padStart(2, '0') }}</span>
          <span class="object-card-title">{{ object.titleZh }}</span>
          <span class="object-description">{{ object.descriptionZh }}</span>
          <span class="object-action">打开 3D 场景 <span aria-hidden="true">↗</span></span>
        </span>
      </RouterLink>
    </div>

    <p class="catalog-footnote">场景均以本地静态资源交付，打开后可直接在浏览器中交互。</p>
  </section>
</template>
