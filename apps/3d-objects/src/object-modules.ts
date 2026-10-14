import type { Component } from 'vue';

export type ObjectManifest = {
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  category: string;
  categoryZh: string;
  thumbnail: string;
};

export type ObjectModule = ObjectManifest & {
  slug: string;
  route: string;
  thumbnailUrl: string;
  loadPage: () => Promise<Component>;
};

const manifests = import.meta.glob<ObjectManifest>('../objects/*/manifest.json', {
  eager: true,
  import: 'default',
});
const pageLoaders = import.meta.glob<Component>('../objects/*/DetailPage.vue', { import: 'default' });
const thumbnails = import.meta.glob<string>('../objects/*/**/thumbnail.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const objectModules: ObjectModule[] = Object.entries(manifests)
  .map(([manifestPath, manifest]) => {
    const modulePath = manifestPath.slice(0, manifestPath.lastIndexOf('/'));
    const slug = modulePath.slice(modulePath.lastIndexOf('/') + 1);
    const pagePath = modulePath + '/DetailPage.vue';
    const thumbnailPath = modulePath + '/' + manifest.thumbnail;
    const loadPage = pageLoaders[pagePath];
    const thumbnailUrl = thumbnails[thumbnailPath];
    if (!loadPage || !thumbnailUrl) return null;
    return {
      ...manifest,
      slug,
      route: '/objects/' + slug,
      thumbnailUrl,
      loadPage,
    };
  })
  .filter((module): module is ObjectModule => module !== null)
  .sort((left, right) => left.slug.localeCompare(right.slug));
