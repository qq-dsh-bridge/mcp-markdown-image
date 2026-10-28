import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderMarkdown,
  findFont,
  MarkdownError,
  DEFAULT_WIDTH,
  MAX_MD_CHARS,
} from '../src/render.mjs';

const hasFont = Boolean(findFont());

test('constants are sane', () => {
  assert.equal(DEFAULT_WIDTH, 720);
  assert.equal(MAX_MD_CHARS, 8000);
});

test('empty or oversized markdown is rejected', async () => {
  await assert.rejects(() => renderMarkdown('   '), MarkdownError);
  await assert.rejects(() => renderMarkdown('x'.repeat(MAX_MD_CHARS + 1)), MarkdownError);
});

test('renders headings, tables, lists and code to PNG', { skip: !hasFont }, async () => {
  const md = [
    '# 标题',
    '',
    '这是**中文**和 `code`。',
    '',
    '| 队伍 | 伤害 |',
    '|---|---|',
    '| 薇斯纳 | 97.9 万 |',
    '',
    '- 第一项',
    '- 第二项',
    '',
    '```js',
    'const x = 1;',
    '```',
  ].join('\n');

  const result = await renderMarkdown(md, { width: 620 });
  assert.equal(result.png.subarray(1, 4).toString('latin1'), 'PNG');
  assert.ok(result.width >= 620);
  assert.ok(result.height > 0);
  assert.ok(result.bytes > 0);
});

test('document theme renders too', { skip: !hasFont }, async () => {
  const result = await renderMarkdown('# hi\n\nplain', { width: 400, theme: 'document' });
  assert.equal(result.png.subarray(1, 4).toString('latin1'), 'PNG');
  assert.ok(result.width >= 400);
});
