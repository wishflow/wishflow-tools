<script setup lang="ts">
import AppFooter from '../components/AppFooter.vue';
import AppHeader from '../components/AppHeader.vue';
import AppSidebar from '../components/AppSidebar.vue';
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <div class="app-workspace">
      <AppSidebar />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
    <AppFooter />
  </div>
</template>
