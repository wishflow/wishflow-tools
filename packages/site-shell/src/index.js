export const LANGUAGE_STORAGE_KEY = 'wishflow-tools-language';
export const LANGUAGE_CHANGE_EVENT = 'wishflow:language-change';

const localeListeners = new Set();
const messageCatalogs = new Map();
const observedShells = new WeakMap();
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
let localeStylesInstalled = false;

export function normalizeLanguage(value) {
  return String(value || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getLanguage() {
  try {
    return normalizeLanguage(globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return 'en';
  }
}

export function localize(text, language = getLanguage()) {
  if (typeof text === 'string') return text;
  return text?.[normalizeLanguage(language)] ?? text?.en ?? text?.zh ?? '';
}

export function setLanguage(value) {
  const language = normalizeLanguage(value);
  try {
    globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The current page can still switch languages if storage is disabled.
  }

  applyDocumentLanguage(language);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language } }));
  }

  if (typeof window === 'undefined') {
    for (const listener of localeListeners) listener(language);
  }
  refreshRegisteredShells(language);
  return language;
}

export function initializeLanguage() {
  const language = getLanguage();
  applyDocumentLanguage(language);
  return language;
}

function applyDocumentLanguage(language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  installLocaleStyles();
}

export function subscribeLanguage(listener) {
  localeListeners.add(listener);
  if (typeof window === 'undefined') return () => localeListeners.delete(listener);

  const handleChange = (event) => listener(normalizeLanguage(event.detail?.language));
  const handleStorage = (event) => {
    if (event.key === LANGUAGE_STORAGE_KEY) listener(normalizeLanguage(event.newValue));
  };
  window.addEventListener(LANGUAGE_CHANGE_EVENT, handleChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    localeListeners.delete(listener);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleChange);
    window.removeEventListener('storage', handleStorage);
  };
}

function installLocaleStyles() {
  if (localeStylesInstalled || typeof document === 'undefined' || !document.head) return;
  const style = document.createElement('style');
  style.dataset.wishflowLocale = 'true';
  style.textContent = 'html[lang="en"] [data-locale="zh"],html[lang="zh"] [data-locale="en"]{display:none!important}';
  document.head.append(style);
  localeStylesInstalled = true;
}

function buildMessageIndex(messages) {
  const index = new Map();
  for (const [key, value] of Object.entries(messages || {})) {
    if (typeof value === 'string') {
      index.set(key.trim(), { en: key, zh: value });
      index.set(value.trim(), { en: key, zh: value });
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    if (value.en) index.set(value.en.trim(), value);
    if (value.zh) index.set(value.zh.trim(), value);
    index.set(key.trim(), value);
  }
  return index;
}

function translatedValue(value, appSlug, language) {
  const catalog = messageCatalogs.get(appSlug);
  if (!catalog) return value;
  const normalized = value.trim();
  const direct = catalog.index.get(normalized);
  if (direct) return preserveSpacing(value, localize(direct, language));

  for (const rule of catalog.patterns) {
    const match = normalized.match(rule.pattern);
    if (match) return preserveSpacing(value, rule[language](match));
  }
  return value;
}

function preserveSpacing(original, translated) {
  const leading = original.match(/^\s*/)?.[0] || translated.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || translated.match(/\s*$/)?.[0] || '';
  return leading + translated.trim() + trailing;
}

function getOriginalText(node) {
  const current = node.nodeValue || '';
  let record = originalText.get(node);
  if (!record) {
    record = { source: current, rendered: current };
    originalText.set(node, record);
  } else if (current !== record.rendered) {
    record.source = current;
  }
  return record;
}

function getOriginalAttribute(element, attribute) {
  const current = element.getAttribute(attribute);
  let records = originalAttributes.get(element);
  if (!records) {
    records = new Map();
    originalAttributes.set(element, records);
  }
  let record = records.get(attribute);
  if (!record) {
    record = { source: current, rendered: current };
    records.set(attribute, record);
  } else if (current !== record.rendered) {
    record.source = current;
  }
  return record;
}

function translateTree(root, appSlug, language) {
  const catalog = messageCatalogs.get(appSlug);
  if (!catalog || !root) return;

  const visit = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const current = node.nodeValue || '';
      const record = getOriginalText(node);
      const next = translatedValue(record.source, appSlug, language);
      record.rendered = next;
      if (next !== current) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node;
    if (['CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'].includes(element.tagName)) return;

    for (const attribute of ['aria-label', 'title', 'placeholder', 'alt']) {
      const previous = element.getAttribute(attribute);
      if (previous === null) continue;
      const record = getOriginalAttribute(element, attribute);
      const next = translatedValue(record.source, appSlug, language);
      record.rendered = next;
      if (next !== previous) element.setAttribute(attribute, next);
    }
    for (const child of element.childNodes) visit(child);
  };

  for (const child of root.childNodes) visit(child);
}

export function registerMessages(appSlug, messages, patterns = []) {
  const catalog = {
    index: buildMessageIndex(messages),
    patterns,
  };
  messageCatalogs.set(appSlug, catalog);

  if (typeof document === 'undefined') return;
  const shell = document.querySelector('wishflow-site-shell[data-app="' + appSlug + '"]');
  if (!shell) return;

  translateTree(shell, appSlug, getLanguage());
  if (!observedShells.has(shell) && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => translateTree(shell, appSlug, getLanguage()));
    observer.observe(shell, { subtree: true, childList: true, characterData: true });
    observedShells.set(shell, observer);
  }
}

function refreshRegisteredShells(language) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('wishflow-site-shell[data-app]').forEach((shell) => {
    translateTree(shell, shell.dataset.app || '', language);
  });
}

function safeBase(value, fallback) {
  return value === './' || value === '../' ? value : fallback;
}

function parseJsonAttribute(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isSafeLocalHref(value) {
  return typeof value === 'string' && (value.startsWith('#') || value.startsWith('./') || value.startsWith('../'));
}

const SHELL_STYLE = [
  ':host{--shell-ink:#26352f;--shell-muted:#72796f;--shell-line:#d8ded3;--shell-paper:#f8faf5;--shell-accent:#467c2c;display:block;width:100%;height:100dvh;min-height:320px;color:var(--shell-ink);background:var(--shell-paper);font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
  '*{box-sizing:border-box}',
  '.shell{display:grid;width:100%;height:100%;grid-template-rows:62px minmax(0,1fr) 40px;overflow:hidden}',
  '.topbar{display:flex;align-items:center;gap:22px;padding:0 24px;border-bottom:1px solid var(--shell-line);background:rgba(255,255,255,.9)}',
  '.home-link{display:inline-flex;align-items:center;gap:10px;color:var(--shell-ink);font-size:13px;font-weight:760;text-decoration:none;white-space:nowrap}',
  '.mark{display:grid;width:30px;height:30px;place-items:center;border:1px solid #b8c6af;border-radius:8px;color:var(--shell-accent);font-size:11px;font-weight:850;letter-spacing:-.04em}',
  '.page-title{min-width:0;overflow:hidden;color:#687264;font-size:13px;text-overflow:ellipsis;white-space:nowrap}',
  '.top-actions{display:flex;align-items:center;gap:14px;margin-left:auto}',
  '.home-hint{color:#828b7c;font-size:11px}',
  'button{font:inherit}',
  '.language-toggle{min-height:34px;padding:0 12px;border:1px solid #d7e0cf;border-radius:7px;background:#fff;color:#36512a;font-size:12px;font-weight:680;cursor:pointer}',
  '.language-toggle:hover{border-color:#8aa872;background:#f7faF3}',
  '.language-toggle:focus-visible,a:focus-visible{outline:3px solid #74a34c;outline-offset:3px}',
  '.workspace{display:grid;min-width:0;min-height:0;grid-template-columns:204px minmax(0,1fr)}',
  '.sidebar{display:flex;min-height:0;flex-direction:column;gap:22px;overflow-y:auto;padding:22px 14px;border-right:1px solid var(--shell-line);background:#f5f7f1}',
  '.nav-group{display:grid;gap:7px}',
  '.nav-heading{margin:0 8px 2px;color:#899087;font-size:10px;font-weight:760;letter-spacing:.12em;text-transform:uppercase}',
  '.nav-list{display:grid;gap:3px;margin:0;padding:0;list-style:none}',
  '.nav-link{display:flex;min-height:38px;align-items:center;gap:10px;padding:0 10px;border-radius:6px;color:#5f6b5d;font-size:12px;text-decoration:none;transition:background .16s ease,color .16s ease}',
  '.nav-link:hover,.nav-link[aria-current="page"]{background:#e5ecdf;color:#294f41}',
  '.nav-link[aria-current="page"]{font-weight:700}',
  '.nav-icon{width:16px;color:#668355;text-align:center}',
  '.page-content{min-width:0;min-height:0;overflow:auto;background:var(--shell-paper)}',
  '::slotted([slot="content"]){display:block;min-width:0;min-height:100%;}',
  '::slotted(#root),::slotted(#app){height:100%;min-height:0;overflow:hidden}',
  '.footer{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:16px;padding:0 22px;border-top:1px solid var(--shell-line);background:#fff;color:#7b8575;font-size:10px}',
  '.footer-extra{display:flex;min-width:0;align-items:center;justify-content:flex-end;gap:14px}',
  '.footer-extra:empty{display:none}',
  '@media(max-width:760px){:host{height:100dvh}.shell{grid-template-rows:56px minmax(0,1fr) 38px}.topbar{gap:12px;padding:0 12px}.mark{width:28px;height:28px}.page-title{font-size:11px}.home-hint{display:none}.workspace{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}.sidebar{flex-direction:row;gap:18px;overflow-x:auto;overflow-y:hidden;padding:7px 10px;border-right:0;border-bottom:1px solid var(--shell-line)}.nav-group{display:flex;min-width:max-content;align-items:center;gap:6px}.nav-heading{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.nav-list{display:flex;gap:4px}.nav-link{min-height:34px;gap:7px;padding:0 9px;font-size:11px;white-space:nowrap}.page-content{min-height:0}.footer{padding:0 10px;font-size:9px}.footer-extra{gap:7px}}',
  '@media(max-width:420px){.topbar{gap:8px}.home-link{gap:6px;font-size:11px}.top-actions{gap:6px}.language-toggle{min-height:30px;padding:0 9px;font-size:11px}.footer{gap:6px}.footer-extra{max-width:55%;overflow:hidden}}',
  '@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}',
].join('\n');

class WishflowSiteShell extends HTMLElement {
  connectedCallback() {
    initializeLanguage();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot.querySelector('.shell')) this.render();
    this.update();
    this.onLanguageChange = () => this.update();
    this.onHashChange = () => this.updateActiveLinks();
    this.onStorageChange = (event) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      const language = normalizeLanguage(event.newValue);
      applyDocumentLanguage(language);
      this.update();
      refreshRegisteredShells(language);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, this.onLanguageChange);
    window.addEventListener('hashchange', this.onHashChange);
    window.addEventListener('storage', this.onStorageChange);
    this._onClick = (event) => {
      const button = event.target.closest('.language-toggle');
      if (button) setLanguage(getLanguage() === 'en' ? 'zh' : 'en');
    };
    this.shadowRoot.addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    if (this.onLanguageChange) window.removeEventListener(LANGUAGE_CHANGE_EVENT, this.onLanguageChange);
    if (this.onHashChange) window.removeEventListener('hashchange', this.onHashChange);
    if (this.onStorageChange) window.removeEventListener('storage', this.onStorageChange);
    if (this._onClick) this.shadowRoot?.removeEventListener('click', this._onClick);
  }

  render() {
    this.shadowRoot.innerHTML = '<style>' + SHELL_STYLE + '</style>' +
      '<div class="shell">' +
        '<header class="topbar">' +
          '<a class="home-link"><span class="mark" aria-hidden="true">WF</span><span>WishFlow Tools</span></a>' +
          '<span class="page-title"></span>' +
          '<div class="top-actions"><span class="home-hint"></span>' +
            '<button class="language-toggle" type="button"></button>' +
          '</div>' +
        '</header>' +
        '<div class="workspace">' +
          '<aside class="sidebar">' +
            '<section class="nav-group local-group" hidden><h2 class="nav-heading local-heading" id="local-heading"></h2><nav aria-labelledby="local-heading"><ul class="nav-list local-list"></ul></nav></section>' +
            '<section class="nav-group project-group"><h2 class="nav-heading project-heading" id="project-heading"></h2><nav aria-labelledby="project-heading"><ul class="nav-list project-list"></ul></nav></section>' +
          '</aside>' +
          '<div class="page-content"><slot name="content"></slot></div>' +
        '</div>' +
        '<footer class="footer"><span class="footer-copy"></span><div class="footer-extra"><slot name="footer-extra"></slot></div></footer>' +
      '</div>';
  }

  update() {
    const language = getLanguage();
    const isChinese = language === 'zh';
    const app = this.dataset.app || '';
    const base = safeBase(this.dataset.base, app === 'home' ? './' : '../');
    const homeHref = safeBase(this.dataset.homeHref, base);
    const title = isChinese ? (this.dataset.titleZh || this.dataset.titleEn) : this.dataset.titleEn;
    const homeLink = this.shadowRoot.querySelector('.home-link');
    homeLink.href = homeHref;
    homeLink.setAttribute('aria-label', isChinese ? '返回 WishFlow Tools 首页' : 'Back to WishFlow Tools home');
    this.shadowRoot.querySelector('.page-title').textContent = title || '';
    this.shadowRoot.querySelector('.home-hint').textContent = isChinese ? '独立交互项目' : 'Independent projects';

    const toggle = this.shadowRoot.querySelector('.language-toggle');
    toggle.textContent = isChinese ? 'English' : '中文';
    toggle.setAttribute('aria-label', isChinese ? '切换界面语言为英文' : 'Switch interface language to Chinese');
    toggle.setAttribute('aria-pressed', String(isChinese));

    this.shadowRoot.querySelector('.local-heading').textContent = isChinese ? '本页导航' : 'On this page';
    this.shadowRoot.querySelector('.project-heading').textContent = isChinese ? '项目' : 'Projects';
    this.shadowRoot.querySelector('.footer-copy').textContent = isChinese
      ? 'WishFlow Tools · 独立交互项目'
      : 'WishFlow Tools · Independent interactive projects';
    document.title = (title || 'WishFlow Tools') + ' · WishFlow Tools';

    this.renderLocalNavigation(parseJsonAttribute(this.dataset.localNav, []), language);
    this.renderProjectNavigation(parseJsonAttribute(this.dataset.projects, []), language, base);
    translateTree(this, app, language);
  }

  renderLocalNavigation(items, language) {
    const group = this.shadowRoot.querySelector('.local-group');
    const list = this.shadowRoot.querySelector('.local-list');
    list.replaceChildren();
    const validItems = items.filter((item) => item && isSafeLocalHref(item.href));
    group.hidden = validItems.length === 0;

    for (const item of validItems) {
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = item.href;
      link.textContent = localize({ en: item.en || '', zh: item.zh || item.en || '' }, language);
      if (item.icon) {
        const icon = document.createElement('span');
        icon.className = 'nav-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = item.icon;
        link.prepend(icon);
      }
      row.append(link);
      list.append(row);
    }
    this.updateActiveLinks();
  }

  renderProjectNavigation(projects, language, base) {
    const list = this.shadowRoot.querySelector('.project-list');
    list.replaceChildren();
    const home = document.createElement('li');
    const homeLink = document.createElement('a');
    homeLink.className = 'nav-link';
    homeLink.href = safeBase(this.dataset.homeHref, base);
    homeLink.dataset.app = 'home';
    homeLink.textContent = language === 'zh' ? '项目总览' : 'Project overview';
    home.append(homeLink);
    list.append(home);

    for (const project of projects) {
      if (!project || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug || '')) continue;
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = base + project.slug + '/';
      link.dataset.app = project.slug;
      link.textContent = language === 'zh' ? (project.titleZh || project.title) : project.title;
      row.append(link);
      list.append(row);
    }
    this.updateActiveLinks();
  }

  updateActiveLinks() {
    const app = this.dataset.app || '';
    const route = window.location.hash || '#/';
    this.shadowRoot.querySelectorAll('.nav-link').forEach((link) => {
      const isCurrentApp = link.dataset.app && link.dataset.app === app;
      const href = link.getAttribute('href') || '';
      const isCurrentRoute = href.startsWith('#') && href === route;
      if (isCurrentApp || isCurrentRoute) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined' && !customElements.get('wishflow-site-shell')) {
  customElements.define('wishflow-site-shell', WishflowSiteShell);
}
