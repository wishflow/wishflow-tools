<template>
  <section class="catalog-page" aria-labelledby="catalog-title">
    <p class="eyebrow">A COLLECTION OF INTERACTIVE MODELS</p>
    <div class="catalog-heading">
      <div>
        <h1 id="catalog-title">3D Objects</h1>
        <p class="intro-copy">从可交互的三维模型中，观察结构、材质与细节。</p>
      </div>
      <span class="catalog-count"><strong>01</strong> 个场景</span>
    </div>

    <div class="object-grid">
      <RouterLink class="object-card" to="/objects/house" aria-label="打开木结构小屋 3D 场景">
        <span class="object-art" aria-hidden="true">
          <svg viewBox="0 0 240 180" fill="none">
            <path d="m43 79 77-46 77 46v63l-77 39-77-39V79Z" fill="#e7e8df" stroke="#879385" stroke-width="1.5" />
            <path d="m43 79 77 43 77-43M120 122v59M43 79l77-46 77 46" stroke="#758579" stroke-width="1.5" />
            <path d="m62 70 58-35 58 35M59 86v46l61 32 61-32V86" stroke="#b77b54" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="m75 94 45-27 45 27v36l-45 24-45-24V94Z" fill="#f2efe6" stroke="#69796e" stroke-width="1.5" />
            <path d="m75 94 45 26 45-26M120 120v34m-45-60 45-27 45 27" stroke="#69796e" stroke-width="1.5" />
            <path d="m82 91 38-23 38 23M91 98v24m58-24v24" stroke="#497663" stroke-width="3" stroke-linecap="round" />
          </svg>
        </span>
        <span class="object-card-content">
          <span class="object-kicker">建筑 · 场景 01</span>
          <span class="object-card-title">木结构小屋</span>
          <span class="object-description">旋转、缩放并拆开屋顶与墙体，查看门窗和内部木构架。</span>
          <span class="object-meta">6.0 × 5.0 m <span>·</span> 约 30 m²</span>
          <span class="object-action">打开 3D 场景 <span aria-hidden="true">↗</span></span>
        </span>
      </RouterLink>
    </div>

    <p class="catalog-footnote">场景均以本地静态资源交付，打开后可直接在浏览器中交互。</p>
  </section>
</template>
