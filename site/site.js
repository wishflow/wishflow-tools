(() => {
  const storageKey = 'wishflow-tools-language';
  const toggle = document.querySelector('[data-language-toggle]');
  const projectGrid = document.querySelector('[data-project-grid]');
  let language = 'en';
  try {
    language = localStorage.getItem(storageKey) === 'zh' ? 'zh' : 'en';
  } catch {
    language = 'en';
  }

  function applyLanguage(nextLanguage, remember) {
    language = nextLanguage === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = language;
    toggle.textContent = language === 'en' ? '中文' : 'English';
    toggle.setAttribute(
      'aria-label',
      language === 'en' ? 'Switch language to Chinese' : '切换界面语言为英文',
    );
    projectGrid.setAttribute('aria-label', language === 'en' ? 'Projects' : '项目列表');
    if (remember) {
      try {
        localStorage.setItem(storageKey, language);
      } catch {
        // The language still changes for this page when storage is unavailable.
      }
    }
  }

  toggle.addEventListener('click', () => applyLanguage(language === 'en' ? 'zh' : 'en', true));
  applyLanguage(language, false);
})();
