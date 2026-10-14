# 站点公共外壳

`@wishflow/site-shell` 为仓库所有公开页面提供一致的顶部栏、应用内侧栏、页脚和中英文语言状态。顶部栏的项目菜单由站点构建脚本从 `apps/catalog.json` 注入；应用内的多页面入口通过 `data-local-nav` 配置，并且只有显式启用侧栏的应用才显示侧栏。

## 页面接入

### Vue / React 应用

将本地包加入应用依赖，并在入口模块导入组件：

```json
{
  "dependencies": {
    "@wishflow/site-shell": "file:../../packages/site-shell"
  }
}
```

```ts
import '@wishflow/site-shell';
```

在 `index.html` 中把应用根节点放入 `content` 插槽：

```html
<wishflow-site-shell
  data-app="app-slug"
  data-base="../"
  data-home-href="../"
  data-title-en="English title"
  data-title-zh="中文标题"
  data-sidebar-enabled="true"
  data-local-nav='[{"href":"#/","en":"Catalog","zh":"目录"}]'
>
  <div id="root" slot="content"></div>
</wishflow-site-shell>
```

`data-sidebar-enabled="true"` 才会显示应用内侧栏；它初始收起，用户可从顶部栏展开。`data-local-nav` 的每项提供双语页面入口。没有启用侧栏的单页应用不会出现空侧栏。静态构建脚本会把 `apps/catalog.json` 中的项目列表注入各页顶部菜单，不要在应用内重复维护全站列表。

使用 `history.pushState` 的单页路由器应在路由完成后调用 `notifySiteRouteChange()`，让共享侧栏及时更新当前页面标记。原生 hash 导航和浏览器前进/后退也会自动刷新标记。

共享页脚随页面内容自然排列，不固定在视口底部。应用可继续通过 `footer-extra` 插槽添加素材署名等补充链接。顶部栏提供项目仓库链接；在正式 Cloudflare Pages 与 GitHub Pages 域名之间会显示当前页面的对应入口，并保留页面路径、查询参数和 hash 路由。本地开发域名不显示部署互链。

### 纯静态页面

静态页面使用相同的 `<wishflow-site-shell>` 标签，在模块入口导入 `site-shell.js`。`scripts/build-site.mjs` 会将包源码复制为站点根目录的 `site-shell.js`；使用自定义静态构建脚本的页面应复制同一文件到输出目录，并为页面保留正确的相对引用。

## 语言接口

- 默认语言为英文；语言状态存储在 `wishflow-tools-language`，取值为 `en` 或 `zh`。
- 页眉提供站点间项目菜单、外部链接和语言切换；语言状态在同一站点各页面间共享。
- 静态文案可用成对的 `data-locale="en"` 和 `data-locale="zh"` 元素。
- 框架动态生成的文案通过 `registerMessages(appSlug, messages, patterns)` 注册；应用只维护自己的词条，不重复实现语言检测、持久化或切换逻辑。
- `subscribeLanguage(listener)` 订阅本页切换和同源其他标签页的语言变化。动态生成文本的应用应使用它更新通知、状态和导出提示等非 DOM 文案。

公共组件不依赖 Vue、React 或其他 UI 框架，语言偏好不会覆盖应用自己的数据存储。
