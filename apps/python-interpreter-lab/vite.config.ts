import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { renderGuideMarkdown } from './scripts/render-guide.js';

const appRoot = dirname(fileURLToPath(import.meta.url));
const chineseGuide = readFileSync(resolve(appRoot, 'docs/guide/usage.zh-CN.md'), 'utf8');
const englishGuide = readFileSync(resolve(appRoot, 'docs/guide/usage.en.md'), 'utf8');

function replaceGuidePlaceholder(html: string, placeholder: string, content: string): string {
  if (html.split(placeholder).length !== 2) {
    throw new Error(`help.html must contain exactly one ${placeholder} placeholder.`);
  }
  return html.replace(placeholder, content);
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'python-lab-static-guide',
      transformIndexHtml(html) {
        if (!html.includes('<!-- GUIDE_EN -->') && !html.includes('<!-- GUIDE_ZH -->')) return html;
        return replaceGuidePlaceholder(
          replaceGuidePlaceholder(html, '<!-- GUIDE_EN -->', renderGuideMarkdown(englishGuide)),
          '<!-- GUIDE_ZH -->',
          renderGuideMarkdown(chineseGuide),
        );
      },
    },
  ],
  input: {
    app: 'index.html',
    help: 'help.html',
  },
  base: './',
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
