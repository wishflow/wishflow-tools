import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { renderGuideMarkdown } from '../scripts/render-guide';

const appRoot = new URL('../', import.meta.url);
const chineseGuide = readFileSync(new URL('docs/guide/usage.zh-CN.md', appRoot), 'utf8');
const englishGuide = readFileSync(new URL('docs/guide/usage.en.md', appRoot), 'utf8');

test('renders both usage guides with matching semantic sections and structures', () => {
  const chinese = renderGuideMarkdown(chineseGuide);
  const english = renderGuideMarkdown(englishGuide);

  assert.equal((chinese.match(/<h2>/g) ?? []).length, 7);
  assert.equal((english.match(/<h2>/g) ?? []).length, 7);
  assert.match(chinese, /<h2>快速开始<\/h2>/);
  assert.match(english, /<h2>Quick start<\/h2>/);
  assert.match(chinese, /<ol>[\s\S]*?<li>/);
  assert.match(english, /<ul>[\s\S]*?<li>/);
  assert.match(chinese, /<div class="guide-table-scroll"><table>/);
  assert.match(english, /<thead><tr><th>Control<\/th>/);
  assert.match(chinese, /<pre><code class="language-python">x = 1 \+ 2 \* 3/);
  assert.match(english, /<strong>Real CPython<\/strong>/);
});

test('filters repository navigation and rewrites Markdown links for the public page', () => {
  const rendered = renderGuideMarkdown(
    '# Help\n\n[English](usage.en.md) · [返回应用说明](../../README.md)\n\nSee [app overview](../../README.md).',
  );

  assert.doesNotMatch(rendered, /usage\.en\.md|README\.md|href="[^"]+\.md/);
  assert.doesNotMatch(rendered, /English|返回应用说明/);
  assert.match(rendered, /See <a href="\.\/">app overview<\/a>\./);
});

test('escapes code examples and renders only supported inline formatting', () => {
  const rendered = renderGuideMarkdown(
    '# Help\n\n```html\n<script>alert("unsafe")</script>\n```\n\nUse `x < y` and **bold**.',
  );

  assert.match(rendered, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(rendered, /<script>/);
  assert.match(rendered, /<code>x &lt; y<\/code>/);
  assert.match(rendered, /<strong>bold<\/strong>/);
});

test('keeps only safe guide links and escapes raw HTML', () => {
  const rendered = renderGuideMarkdown(
    '# Help\n\n[external](https://example.com/guide) [script](javascript:alert(1)) [protocol](//evil.example)\n\n<img src=x onerror=alert(1)>',
  );

  assert.match(rendered, /<a href="https:\/\/example\.com\/guide" target="_blank" rel="noopener noreferrer">external<\/a>/);
  assert.doesNotMatch(rendered, /href="(?:javascript:|\/\/)/);
  assert.match(rendered, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(rendered, /<img /);
});

test('rejects an unterminated fenced code block', () => {
  assert.throws(() => renderGuideMarkdown('# Help\n\n```python\nx = 1'), /Unclosed fenced code block/);
});
