import { registerMessages, type LocalizedText, type LocalePattern } from '@wishflow/site-shell';
import { objectModules } from './object-modules';

type ObjectLocaleModule = {
  messages: Record<string, LocalizedText | string>;
  patterns?: LocalePattern[];
};

const messages: Record<string, LocalizedText | string> = {
  ' 个场景': { en: ' scenes', zh: ' 个场景' },
  '从可交互的三维模型中，观察结构、材质与细节。': {
    en: 'Explore structure, materials, and details in interactive 3D models.',
    zh: '从可交互的三维模型中，观察结构、材质与细节。',
  },
  '打开 3D 场景': { en: 'Open 3D scene', zh: '打开 3D 场景' },
  '场景均以本地静态资源交付，打开后可直接在浏览器中交互。': {
    en: 'Scenes are delivered as local static assets and run directly in your browser.',
    zh: '场景均以本地静态资源交付，打开后可直接在浏览器中交互。',
  },
};
const patterns: LocalePattern[] = [];

for (const module of objectModules) {
  messages[module.titleZh] = { en: module.title, zh: module.titleZh };
  messages[module.descriptionZh] = { en: module.description, zh: module.descriptionZh };
  messages[module.categoryZh] = { en: module.category, zh: module.categoryZh };
}

const moduleLocales = import.meta.glob<ObjectLocaleModule>('../objects/*/locales.ts', {
  eager: true,
  import: 'default',
});
for (const locale of Object.values(moduleLocales)) {
  Object.assign(messages, locale.messages);
  if (locale.patterns) patterns.push(...locale.patterns);
}

registerMessages('3d-objects', messages, patterns);
