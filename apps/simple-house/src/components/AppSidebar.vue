<template>
  <aside class="app-sidebar" aria-label="3D Objects 导航">
    <p class="sidebar-label">探索</p>
    <nav class="sidebar-nav" aria-label="主要页面">
      <RouterLink class="sidebar-link" to="/" exact-active-class="is-active">
        <span class="sidebar-link-icon" aria-hidden="true">⌂</span>
        <span>物体库</span>
      </RouterLink>
      <RouterLink class="sidebar-link" to="/objects/house" active-class="is-active">
        <span class="sidebar-link-index">01</span>
        <span>木结构小屋</span>
      </RouterLink>
    </nav>
    <div class="sidebar-note">
      <span class="sidebar-note-kicker">当前收录</span>
      <strong>1 个 3D 场景</strong>
      <span>更多物体将继续加入。</span>
    </div>
  </aside>
</template>
