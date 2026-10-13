import { createRouter, createWebHashHistory } from 'vue-router';
import AppShell from './layouts/AppShell.vue';
import ObjectCatalogPage from './pages/ObjectCatalogPage.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', name: 'catalog', component: ObjectCatalogPage },
        { path: 'objects/house', name: 'house', component: () => import('./pages/HouseDetailPage.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'catalog' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
