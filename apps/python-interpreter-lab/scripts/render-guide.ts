function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function isRepositoryNavigation(line: string): boolean {
  return /^\s*(?:\[[^\]]+\]\([^)]+\.md\)(?:\s*[·|]\s*)?)+\s*$/.test(line);
}

function renderInline(markdown: string): string {
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const output: string[] = [];
  let offset = 0;

  for (const match of markdown.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    output.push(escapeHtml(markdown.slice(offset, index)));
    if (token.startsWith('`')) {
      output.push(`<code>${escapeHtml(token.slice(1, -1))}</code>`);
    } else if (token.startsWith('**')) {
      output.push(`<strong>${escapeHtml(token.slice(2, -2))}</strong>`);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (!link) {
        output.push(escapeHtml(token));
      } else {
        const [, label, destination] = link;
        const href = safeGuideHref(destination);
        output.push(href
          ? `<a href="${escapeHtml(href)}"${href.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`
          : escapeHtml(label));
      }
    }
    offset = index + token.length;
  }

  output.push(escapeHtml(markdown.slice(offset)));
  return output.join('');
}

function safeGuideHref(destination: string): string | null {
  const trimmed = destination.trim();
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#')) return trimmed;
  if (/\.md(?:$|#)/i.test(trimmed)) return './';
  if (/^(?:\.\/|\.\.\/)[^\s"']*$/.test(trimmed)) return trimmed;
  return null;
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return line.includes('|') && cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? '';
  return /^#{1,6}\s+/.test(line)
    || /^\s*```/.test(line)
    || /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line)
    || Boolean(lines[index + 1] && isTableSeparator(lines[index + 1]) && line.includes('|'));
}

/** Render the finite Markdown subset used by the two public usage guides. */
export function renderGuideMarkdown(markdown: string): string {
  const lines = markdown.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const output: string[] = [];
  let index = 0;
  let skippedTitle = false;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || isRepositoryNavigation(line)) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      index += 1;
      if (!skippedTitle && heading[1].length === 1) {
        skippedTitle = true;
        continue;
      }
      const level = Math.min(heading[1].length, 4);
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const fence = /^\s*```([\w-]*)\s*$/.exec(line);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index === lines.length) throw new Error('Unclosed fenced code block in usage guide.');
      index += 1;
      const languageClass = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      output.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.includes('|') && lines[index + 1] && isTableSeparator(lines[index + 1])) {
      const headers = tableCells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      const headerHtml = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
      const rowsHtml = rows.map((row) => `<tr>${headers.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] ?? '')}</td>`).join('')}</tr>`).join('');
      output.push(`<div class="guide-table-scroll"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`);
      continue;
    }

    const listItem = /^\s*([-*+]|\d+[.)])\s+(.+)$/.exec(line);
    if (listItem) {
      const ordered = /^\d/.test(listItem[1]);
      const tag = ordered ? 'ol' : 'ul';
      const items: string[] = [];
      while (index < lines.length) {
        const item = /^\s*([-*+]|\d+[.)])\s+(.+)$/.exec(lines[index]);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(`<li>${renderInline(item[2])}</li>`);
        index += 1;
      }
      output.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
  }

  return output.join('\n');
}
