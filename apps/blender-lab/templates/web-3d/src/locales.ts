import { registerMessages } from '@wishflow/site-shell';

registerMessages('scene-project', {
  '3D 场景预览': { en: '3D scene preview', zh: '3D 场景预览' },
  '正在加载场景…': { en: 'Loading the scene…', zh: '正在加载场景…' },
  '重置模型视角': { en: 'Reset the model view', zh: '重置模型视角' },
  '重置视角': { en: 'Reset view', zh: '重置视角' },
  '拖动旋转': { en: 'Drag to rotate', zh: '拖动旋转' },
  '滚轮缩放': { en: 'Scroll to zoom', zh: '滚轮缩放' },
  'BLENDER / WEBGL': { en: 'BLENDER / WEBGL', zh: 'BLENDER / WEBGL' },
  '你的 3D 场景': { en: 'Your 3D scene', zh: '你的 3D 场景' },
  '在 Blender 中构建场景并导出 GLB。这里展示可以直接部署到静态站点的交互式模型。': {
    en: 'Build a scene in Blender and export it as a GLB. This page presents an interactive model ready for static hosting.',
    zh: '在 Blender 中构建场景并导出 GLB。这里展示可以直接部署到静态站点的交互式模型。',
  },
  '场景状态': { en: 'Scene status', zh: '场景状态' },
  '准备中': { en: 'Preparing', zh: '准备中' },
  '已就绪': { en: 'Ready', zh: '已就绪' },
  '加载失败': { en: 'Load failed', zh: '加载失败' },
  '操作方式': { en: 'Controls', zh: '操作方式' },
  '拖动 · 缩放 · 重置': { en: 'Drag · zoom · reset', zh: '拖动 · 缩放 · 重置' },
  '替换项目标题、介绍和 Blender 导出的场景，即可开始一个新的 Idea 页面。': {
    en: 'Replace the title, introduction, and Blender export to start a new idea page.',
    zh: '替换项目标题、介绍和 Blender 导出的场景，即可开始一个新的 Idea 页面。',
  },
  '场景已就绪': { en: 'The scene is ready', zh: '场景已就绪' },
  '场景无法加载': { en: 'The scene could not be loaded', zh: '场景无法加载' },
  '模型没有可显示的几何体，请检查 Blender 导出内容。': {
    en: 'The model has no visible geometry. Check the Blender export.',
    zh: '模型没有可显示的几何体，请检查 Blender 导出内容。',
  },
  '模型文件加载失败。请确认 public/models/scene.glb 已提交并能从当前页面路径访问。': {
    en: 'The model could not be loaded. Check that public/models/scene.glb is committed and reachable from this page.',
    zh: '模型文件加载失败。请确认 public/models/scene.glb 已提交并能从当前页面路径访问。',
  },
  '当前浏览器无法初始化 3D 视图。': {
    en: 'This browser could not initialize the 3D view.',
    zh: '当前浏览器无法初始化 3D 视图。',
  },
  '3D 模型画布': { en: '3D model canvas', zh: '3D 模型画布' },
});
