import { createRouter, createWebHashHistory } from 'vue-router';
import { notifySiteRouteChange } from '@wishflow/site-shell';
import ObjectCatalogPage from './pages/ObjectCatalogPage.vue';
import { objectModules } from './object-modules';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'catalog',
      component: ObjectCatalogPage,
    },
    ...objectModules.map((module) => ({
      path: module.route,
      name: 'object-' + module.slug,
      component: module.loadPage,
    })),
    { path: '/:pathMatch(.*)*', redirect: { name: 'catalog' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach(() => notifySiteRouteChange());
