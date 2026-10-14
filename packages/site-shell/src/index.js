export const LANGUAGE_STORAGE_KEY = 'wishflow-tools-language';
export const LANGUAGE_CHANGE_EVENT = 'wishflow:language-change';
export const SITE_ROUTE_CHANGE_EVENT = 'wishflow:site-route-change';

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

export function notifySiteRouteChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SITE_ROUTE_CHANGE_EVENT));
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

const GITHUB_REPOSITORY_URL = 'https://github.com/wishflow/wishflow-tools';
const GITHUB_PROFILE_URL = 'https://github.com/wishflow';
const CLOUDFLARE_PAGES_HOST = 'wishflow-tools.pages.dev';
const GITHUB_PAGES_HOST = 'wishflow.github.io';
const GITHUB_PAGES_PREFIX = '/wishflow-tools';
const HTMLElementBase = globalThis.HTMLElement || class {};

export function getAlternateDeploymentUrl(currentLocation = globalThis.location) {
  if (!currentLocation?.hostname) return null;

  const pathname = currentLocation.pathname || '/';
  let destination;
  if (currentLocation.hostname === CLOUDFLARE_PAGES_HOST) {
    destination = new URL('https://' + GITHUB_PAGES_HOST);
    destination.pathname = GITHUB_PAGES_PREFIX + (pathname.startsWith('/') ? pathname : '/' + pathname);
  } else if (currentLocation.hostname === GITHUB_PAGES_HOST) {
    if (pathname === GITHUB_PAGES_PREFIX) {
      destination = new URL('https://' + CLOUDFLARE_PAGES_HOST + '/');
    } else if (pathname.startsWith(GITHUB_PAGES_PREFIX + '/')) {
      destination = new URL('https://' + CLOUDFLARE_PAGES_HOST + pathname.slice(GITHUB_PAGES_PREFIX.length));
    } else {
      return null;
    }
  } else {
    return null;
  }

  destination.search = currentLocation.search || '';
  destination.hash = currentLocation.hash || '';
  return destination.href;
}

const SHELL_STYLE = `
:host{--shell-ink:#26352f;--shell-muted:#72796f;--shell-line:#d8ded3;--shell-paper:#f8faf5;--shell-accent:#467c2c;display:block;width:100%;min-height:100dvh;color:var(--shell-ink);background:var(--shell-paper);font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}
button{font:inherit}
.shell{display:flex;min-height:100dvh;width:100%;flex-direction:column;background:var(--shell-paper)}
.topbar{position:relative;z-index:20;display:flex;min-height:62px;align-items:center;gap:18px;padding:0 24px;border-bottom:1px solid var(--shell-line);background:rgba(255,255,255,.92)}
.topbar-leading{display:flex;flex:none;align-items:center;gap:12px}
.home-link{display:inline-flex;align-items:center;gap:10px;color:var(--shell-ink);font-size:13px;font-weight:760;text-decoration:none;white-space:nowrap}
.mark{display:grid;width:30px;height:30px;place-items:center;border:1px solid #b8c6af;border-radius:8px;color:var(--shell-accent);font-size:11px;font-weight:850;letter-spacing:-.04em}
.sidebar-toggle{display:grid;width:34px;height:34px;place-items:center;border:1px solid #d7e0cf;border-radius:7px;background:#fff;color:#36512a;cursor:pointer}
.sidebar-toggle[hidden],.project-menu[hidden],.deployment-switch[hidden],.sidebar[hidden]{display:none}
.sidebar-toggle:hover,.language-toggle:hover{border-color:#8aa872;background:#f7faf3}
.sidebar-toggle:focus-visible,.language-toggle:focus-visible,a:focus-visible,.project-menu-button:focus-visible{outline:3px solid #74a34c;outline-offset:3px}
.sidebar-toggle-icon{font-size:17px;line-height:1}
.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;clip-path:inset(50%);border:0}
.topnav-wrap{flex:none}
.project-menu{position:relative}
.project-menu-button{display:flex;min-height:36px;align-items:center;gap:9px;padding:0 11px;border:1px solid transparent;border-radius:7px;color:#4c5e4c;font-size:12px;font-weight:680;list-style:none;cursor:pointer;white-space:nowrap}
.project-menu-button::-webkit-details-marker{display:none}
.project-menu-button:hover,.project-menu[open] .project-menu-button{border-color:#d7e0cf;background:#f7faf3;color:#294f41}
.menu-caret{color:#83907e;font-size:13px;transition:transform .16s ease}
.project-menu[open] .menu-caret{transform:rotate(180deg)}
.project-menu-panel{position:absolute;top:calc(100% + 9px);left:0;z-index:50;width:min(300px,calc(100vw - 24px));max-height:min(70vh,520px);overflow:auto;padding:7px;border:1px solid var(--shell-line);border-radius:10px;background:#fff;box-shadow:0 14px 34px rgba(38,53,47,.14)}
.project-list{display:grid;gap:3px;margin:0;padding:0;list-style:none}
.project-menu-link{display:flex;min-height:39px;align-items:center;padding:0 10px;border-radius:6px;color:#596858;font-size:12px;text-decoration:none;transition:background .16s ease,color .16s ease}
.project-menu-link:hover,.project-menu-link[aria-current="page"]{background:#e8efe3;color:#294f41}
.project-menu-link[aria-current="page"]{font-weight:700}
.page-title{flex:1;min-width:0;overflow:hidden;color:#687264;font-size:13px;text-overflow:ellipsis;white-space:nowrap}
.top-actions{display:flex;flex:none;align-items:center;gap:10px;margin-left:auto}
.external-link{display:inline-flex;min-height:34px;align-items:center;gap:5px;padding:0 8px;border-radius:6px;color:#586553;font-size:11px;font-weight:650;text-decoration:none;white-space:nowrap}
.external-link:hover{background:#eef3e9;color:#294f41}
.external-arrow{color:#819078;font-size:12px}
.language-toggle{min-height:34px;padding:0 12px;border:1px solid #d7e0cf;border-radius:7px;background:#fff;color:#36512a;font-size:12px;font-weight:680;cursor:pointer}
.workspace{display:grid;flex:1 0 auto;min-width:0;min-height:0;grid-template-columns:minmax(0,1fr)}
.workspace.sidebar-expanded{grid-template-columns:216px minmax(0,1fr)}
.sidebar{display:flex;min-width:0;min-height:0;flex-direction:column;gap:22px;overflow-y:auto;padding:22px 14px;border-right:1px solid var(--shell-line);background:#f5f7f1}
.nav-group{display:grid;gap:7px}
.nav-heading{margin:0 8px 2px;color:#899087;font-size:10px;font-weight:760;letter-spacing:.12em;text-transform:uppercase}
.nav-list{display:grid;gap:3px;margin:0;padding:0;list-style:none}
.local-nav-link{display:flex;min-height:38px;align-items:center;gap:10px;padding:0 10px;border-radius:6px;color:#5f6b5d;font-size:12px;text-decoration:none;transition:background .16s ease,color .16s ease}
.local-nav-link:hover,.local-nav-link[aria-current="page"]{background:#e5ecdf;color:#294f41}
.local-nav-link[aria-current="page"]{font-weight:700}
.nav-icon{width:16px;color:#668355;text-align:center}
.page-content{min-width:0;min-height:0;background:var(--shell-paper)}
::slotted([slot="content"]){display:block;min-width:0;min-height:0}
::slotted(#root),::slotted(#app){min-width:0;min-height:100%}
.footer{display:flex;min-width:0;min-height:50px;flex:none;align-items:center;justify-content:space-between;gap:16px;padding:9px 22px;border-top:1px solid var(--shell-line);background:#fff;color:#7b8575;font-size:10px}
.footer-identity{display:flex;min-width:0;flex-wrap:wrap;align-items:center;gap:6px 14px}
.footer-copy{color:#7b8575}
.footer-profile{color:#526a48;font-weight:650;text-decoration:none;white-space:nowrap}
.footer-profile:hover,.footer-extra slot::slotted(a:hover){color:#294f41;text-decoration:underline}
.footer-extra{display:flex;min-width:0;align-items:center;justify-content:flex-end;gap:14px}
.footer-extra slot::slotted(a){color:#526a48;text-decoration:none}
.footer-extra:empty{display:none}
@media(max-width:760px){
  .topbar{min-height:56px;flex-wrap:wrap;gap:7px 12px;padding:8px 12px}
  .topbar-leading{flex:1 1 auto;gap:8px}
  .home-label,.page-title{display:none}
  .mark{width:28px;height:28px}
  .topnav-wrap{flex:0 0 100%;order:3}
  .top-actions{gap:5px;margin-left:auto}
  .external-link{padding:0 6px;font-size:10px}
  .workspace.sidebar-expanded{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}
  .sidebar{flex-direction:row;gap:18px;overflow-x:auto;overflow-y:hidden;padding:8px 10px;border-right:0;border-bottom:1px solid var(--shell-line)}
  .nav-group{display:flex;min-width:max-content;align-items:center;gap:6px}
  .nav-heading{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%)}
  .nav-list{display:flex;gap:4px}
  .local-nav-link{min-height:34px;gap:7px;padding:0 9px;font-size:11px;white-space:nowrap}
  .footer{padding:10px 12px;font-size:9px}
  .footer-extra{gap:7px}
}
@media(max-width:420px){
  .topbar{gap:6px 8px;padding:7px 10px}
  .sidebar-toggle{width:31px;height:31px}
  .top-actions{gap:2px}
  .external-link{gap:3px;padding:0 5px;font-size:9px}
  .language-toggle{min-height:31px;padding:0 8px;font-size:10px}
  .footer{align-items:flex-start;gap:7px}
  .footer-extra{max-width:48%;flex-wrap:wrap;overflow-wrap:anywhere}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
`;

class WishflowSiteShell extends HTMLElementBase {
  connectedCallback() {
    initializeLanguage();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot.querySelector('.shell')) this.render();
    if (this._sidebarOpen === undefined) this._sidebarOpen = false;
    this.update();
    this.onLanguageChange = () => this.update();
    this.onHashChange = () => this.updateActiveLinks();
    this.onRouteChange = () => this.updateActiveLinks();
    this.onStorageChange = (event) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      const language = normalizeLanguage(event.newValue);
      applyDocumentLanguage(language);
      this.update();
      refreshRegisteredShells(language);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, this.onLanguageChange);
    window.addEventListener('hashchange', this.onHashChange);
    window.addEventListener('popstate', this.onHashChange);
    window.addEventListener(SITE_ROUTE_CHANGE_EVENT, this.onRouteChange);
    window.addEventListener('storage', this.onStorageChange);
    this._onClick = (event) => {
      const button = event.target.closest('.language-toggle');
      if (button) setLanguage(getLanguage() === 'en' ? 'zh' : 'en');
      const sidebarButton = event.target.closest('.sidebar-toggle');
      if (sidebarButton) this.setSidebarOpen(!this._sidebarOpen);
      if (event.target.closest('.project-menu-link')) {
        this.shadowRoot.querySelector('.project-menu').open = false;
      }
    };
    this.shadowRoot.addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    if (this.onLanguageChange) window.removeEventListener(LANGUAGE_CHANGE_EVENT, this.onLanguageChange);
    if (this.onHashChange) window.removeEventListener('hashchange', this.onHashChange);
    if (this.onHashChange) window.removeEventListener('popstate', this.onHashChange);
    if (this.onRouteChange) window.removeEventListener(SITE_ROUTE_CHANGE_EVENT, this.onRouteChange);
    if (this.onStorageChange) window.removeEventListener('storage', this.onStorageChange);
    if (this._onClick) this.shadowRoot?.removeEventListener('click', this._onClick);
  }

  render() {
    this.shadowRoot.innerHTML = '<style>' + SHELL_STYLE + '</style>' +
      '<div class="shell">' +
        '<header class="topbar">' +
          '<div class="topbar-leading">' +
            '<button class="sidebar-toggle" type="button" aria-controls="site-sidebar" aria-expanded="false" hidden><span class="sidebar-toggle-icon" aria-hidden="true">☰</span><span class="sr-only"></span></button>' +
            '<a class="home-link"><span class="mark" aria-hidden="true">WF</span><span class="home-label">WishFlow Tools</span></a>' +
          '</div>' +
          '<div class="topnav-wrap"><details class="project-menu" hidden>' +
            '<summary class="project-menu-button"><span class="project-menu-label"></span><span class="menu-caret" aria-hidden="true">⌄</span></summary>' +
            '<nav class="project-menu-panel project-navigation" aria-label=""><ul class="project-list"></ul></nav>' +
          '</details></div>' +
          '<span class="page-title"></span>' +
          '<div class="top-actions">' +
            '<a class="external-link github-repo" href="https://github.com/wishflow/wishflow-tools" target="_blank" rel="noopener noreferrer"><span>GitHub</span><span class="external-arrow" aria-hidden="true">↗</span></a>' +
            '<a class="external-link deployment-switch" hidden><span class="deployment-switch-label"></span><span class="external-arrow" aria-hidden="true">↗</span></a>' +
            '<button class="language-toggle" type="button"></button>' +
          '</div>' +
        '</header>' +
        '<div class="workspace">' +
          '<aside class="sidebar" id="site-sidebar" hidden>' +
            '<section class="nav-group local-group"><h2 class="nav-heading local-heading" id="local-heading"></h2><nav class="local-navigation" aria-labelledby="local-heading"><ul class="nav-list local-list"></ul></nav></section>' +
          '</aside>' +
          '<div class="page-content"><slot name="content"></slot></div>' +
        '</div>' +
        '<footer class="footer"><div class="footer-identity"><span class="footer-copy"></span><a class="footer-profile" href="https://github.com/wishflow" target="_blank" rel="noopener noreferrer"></a></div><div class="footer-extra"><slot name="footer-extra"></slot></div></footer>' +
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

    const projectMenu = this.shadowRoot.querySelector('.project-menu');
    const projectLabel = this.shadowRoot.querySelector('.project-menu-label');
    projectLabel.textContent = isChinese ? '项目' : 'Projects';
    this.shadowRoot.querySelector('.project-navigation').setAttribute('aria-label', isChinese ? '站点导航' : 'Site navigation');

    const githubRepo = this.shadowRoot.querySelector('.github-repo');
    githubRepo.href = GITHUB_REPOSITORY_URL;
    githubRepo.setAttribute('aria-label', isChinese ? '打开 WishFlow Tools GitHub 仓库' : 'Open WishFlow Tools on GitHub');
    const footerProfile = this.shadowRoot.querySelector('.footer-profile');
    footerProfile.href = GITHUB_PROFILE_URL;
    const deploymentSwitch = this.shadowRoot.querySelector('.deployment-switch');
    const alternateUrl = getAlternateDeploymentUrl();
    deploymentSwitch.hidden = !alternateUrl;
    if (alternateUrl) {
      const targetName = window.location.hostname === CLOUDFLARE_PAGES_HOST ? 'GitHub Pages' : 'Cloudflare Pages';
      deploymentSwitch.href = alternateUrl;
      this.shadowRoot.querySelector('.deployment-switch-label').textContent = targetName;
      deploymentSwitch.setAttribute('aria-label', isChinese ? '在 ' + targetName + ' 打开当前页面' : 'Open this page on ' + targetName);
    }

    const toggle = this.shadowRoot.querySelector('.language-toggle');
    toggle.textContent = isChinese ? 'English' : '中文';
    toggle.setAttribute('aria-label', isChinese ? '切换界面语言为英文' : 'Switch interface language to Chinese');
    toggle.setAttribute('aria-pressed', String(isChinese));

    this.shadowRoot.querySelector('.local-heading').textContent = isChinese ? '应用内导航' : 'In this project';
    this.shadowRoot.querySelector('.footer-copy').textContent = isChinese
      ? 'WishFlow Tools · 独立交互项目'
      : 'WishFlow Tools · Independent interactive projects';
    footerProfile.textContent = isChinese ? 'GitHub · WishFlow' : 'GitHub · WishFlow';
    document.title = (title || 'WishFlow Tools') + ' · WishFlow Tools';

    this.renderLocalNavigation(parseJsonAttribute(this.dataset.localNav, []), language);
    this.renderProjectNavigation(parseJsonAttribute(this.dataset.projects, []), language, base);
    projectMenu.hidden = parseJsonAttribute(this.dataset.projects, []).length === 0;
    this.updateSidebarState();
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
      link.className = 'local-nav-link';
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
    homeLink.className = 'project-menu-link';
    homeLink.href = safeBase(this.dataset.homeHref, base);
    homeLink.dataset.app = 'home';
    homeLink.textContent = language === 'zh' ? '项目总览' : 'Project overview';
    home.append(homeLink);
    list.append(home);

    for (const project of projects) {
      if (!project || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug || '')) continue;
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'project-menu-link';
      link.href = base + project.slug + '/';
      link.dataset.app = project.slug;
      link.textContent = language === 'zh' ? (project.titleZh || project.title) : project.title;
      row.append(link);
      list.append(row);
    }
    this.updateActiveLinks();
  }

  updateSidebarState() {
    const sidebar = this.shadowRoot.querySelector('.sidebar');
    const toggle = this.shadowRoot.querySelector('.sidebar-toggle');
    const workspace = this.shadowRoot.querySelector('.workspace');
    const enabled = this.dataset.sidebarEnabled === 'true' && !this.shadowRoot.querySelector('.local-group').hidden;
    if (!enabled) this._sidebarOpen = false;

    sidebar.hidden = !enabled || !this._sidebarOpen;
    workspace.classList.toggle('sidebar-expanded', Boolean(enabled && this._sidebarOpen));
    toggle.hidden = !enabled;
    toggle.setAttribute('aria-expanded', String(enabled && this._sidebarOpen));
    const isChinese = getLanguage() === 'zh';
    const label = this._sidebarOpen
      ? (isChinese ? '收起应用内导航' : 'Collapse project navigation')
      : (isChinese ? '展开应用内导航' : 'Expand project navigation');
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    this.shadowRoot.querySelector('.sidebar-toggle .sr-only').textContent = label;
  }

  setSidebarOpen(open) {
    this._sidebarOpen = Boolean(open);
    this.updateSidebarState();
  }

  updateActiveLinks() {
    const app = this.dataset.app || '';
    const route = window.location.hash || '#/';
    this.shadowRoot.querySelectorAll('.project-menu-link, .local-nav-link').forEach((link) => {
      const isCurrentApp = link.dataset.app && link.dataset.app === app;
      const href = link.getAttribute('href') || '';
      const isCurrentRoute = href.startsWith('#') && href.split('?')[0] === route.split('?')[0];
      if (isCurrentApp || isCurrentRoute) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined' && !customElements.get('wishflow-site-shell')) {
  customElements.define('wishflow-site-shell', WishflowSiteShell);
}
