import { getLanguage, initializeLanguage, subscribeLanguage } from './site-shell.js';

const projectGrid = document.querySelector('[data-project-grid]');
const applyLanguage = (language) => {
  projectGrid?.setAttribute('aria-label', language === 'zh' ? '项目列表' : 'Projects');
};

initializeLanguage();
applyLanguage(getLanguage());
subscribeLanguage(applyLanguage);
