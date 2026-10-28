// Markdown → PNG：marked 解析，satori 排版成 SVG，resvg 栅格化。
// 主题在 ./themes/，气泡样式与文档样式互相独立。

import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getTheme, DEFAULT_THEME } from './themes/index.mjs';

export const MAX_MD_CHARS = 8000;
export const DEFAULT_WIDTH = 720;

export class MarkdownError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MarkdownError';
  }
}

//  字体

const FONT_CANDIDATES = [
  process.env.MD_FONT || '',
  'C:\\Windows\\Fonts\\Deng.ttf',
  'C:\\Windows\\Fonts\\simhei.ttf',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/Library/Fonts/Arial Unicode.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.otf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
].filter(Boolean);

const BOLD_CANDIDATES = [
  process.env.MD_FONT_BOLD || '',
  'C:\\Windows\\Fonts\\Dengb.ttf',
  'C:\\Windows\\Fonts\\simhei.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
].filter(Boolean);

const MONO_CANDIDATES = [
  process.env.MD_MONO_FONT || '',
  'C:\\Windows\\Fonts\\CascadiaMono.ttf',
  'C:\\Windows\\Fonts\\consola.ttf',
  '/System/Library/Fonts/Supplemental/Menlo.ttc',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
].filter(Boolean);

const SANS_CANDIDATES = [
  process.env.MD_SANS_FONT || '',
  'C:\\Windows\\Fonts\\Deng.ttf',
  'C:\\Windows\\Fonts\\msyh.ttc',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
].filter(Boolean);

const SANS_BOLD_CANDIDATES = [
  process.env.MD_SANS_FONT_BOLD || '',
  'C:\\Windows\\Fonts\\Dengb.ttf',
  'C:\\Windows\\Fonts\\msyhbd.ttc',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
].filter(Boolean);

function firstExisting(candidates) {
  for (const file of candidates) {
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch {
      // 下一个
    }
  }
  return '';
}

export function findFont() {
  return firstExisting(FONT_CANDIDATES);
}

const fontCache = new Map();
function loadFonts(theme) {
  const spec = theme?.fonts ?? {};
  const mainPath = firstExisting([
    process.env.MD_FONT || '',
    ...(spec.main ?? []),
    ...FONT_CANDIDATES,
  ].filter(Boolean));
  if (!mainPath) {
    throw new MarkdownError(
      '找不到字体 —— 中文渲染需要 CJK 字体。用 MD_FONT 指定一个 .ttf/.otf 文件。',
    );
  }

  const boldPath = firstExisting([
    process.env.MD_FONT_BOLD || '',
    ...(spec.bold ?? []),
    ...BOLD_CANDIDATES,
  ].filter(Boolean));
  const monoPath = firstExisting([
    process.env.MD_MONO_FONT || '',
    ...(spec.mono ?? []),
    ...MONO_CANDIDATES,
  ].filter(Boolean));
  const sansPath = firstExisting([
    ...(spec.sans ?? []),
    ...SANS_CANDIDATES,
  ].filter(Boolean));
  const sansBoldPath = firstExisting([
    ...(spec.sansBold ?? []),
    ...SANS_BOLD_CANDIDATES,
  ].filter(Boolean));

  const key = `${mainPath}|${boldPath}|${monoPath}|${sansPath}|${sansBoldPath}`;
  if (fontCache.has(key)) return fontCache.get(key);

  const main = fs.readFileSync(mainPath);
  const fonts = [
    { name: 'main', data: main, weight: 400, style: 'normal' },
    { name: 'main', data: boldPath ? fs.readFileSync(boldPath) : main, weight: 700, style: 'normal' },
  ];
  if (monoPath) {
    fonts.push({ name: 'mono', data: fs.readFileSync(monoPath), weight: 400, style: 'normal' });
  }
  if (sansPath) {
    const sans = fs.readFileSync(sansPath);
    fonts.push({ name: 'sans', data: sans, weight: 400, style: 'normal' });
    fonts.push({
      name: 'sans',
      data: sansBoldPath ? fs.readFileSync(sansBoldPath) : sans,
      weight: 700,
      style: 'normal',
    });
  }

  const loaded = {
    fonts,
    mono: monoPath ? 'mono' : 'main',
    sans: sansPath ? 'sans' : 'main',
    mainPath,
    boldPath,
    monoPath,
    sansPath,
    sansBoldPath,
  };
  fontCache.set(key, loaded);
  return loaded;
}

//  Markdown → satori 元素树

const h = (type, style, children) => ({
  type,
  props: {
    ...(style ? { style } : {}),
    ...(children ? { children } : {}),
  },
});

const span = (style, children) => h('span', style, children);

function inlineText(value) {
  return String(value ?? '').replace(/\n+/g, ' ');
}

function inline(tokens, ctx) {
  const out = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case 'text':
        if (token.tokens?.length) out.push(...inline(token.tokens, ctx));
        else out.push(inlineText(token.text));
        break;
      case 'escape':
        out.push(inlineText(token.text));
        break;
      case 'strong':
        out.push(span(ctx.theme.strong(), inline(token.tokens, ctx)));
        break;
      case 'em':
        out.push(span(ctx.theme.em(), inline(token.tokens, ctx)));
        break;
      case 'del':
        out.push(span(ctx.theme.del(), inline(token.tokens, ctx)));
        break;
      case 'codespan':
        out.push(span({
          ...ctx.theme.codeSpan(),
          fontFamily: ctx.mono,
        }, [inlineText(token.text)]));
        break;
      case 'link':
        out.push(span(ctx.theme.link(), inline(token.tokens, ctx)));
        break;
      case 'br':
        out.push(h('br'));
        break;
      case 'image':
        out.push(inlineText(token.text || token.href));
        break;
      case 'html':
        out.push(inlineText(String(token.raw ?? '').replace(/<[^>]+>/g, '')));
        break;
      default:
        if (token.tokens?.length) out.push(...inline(token.tokens, ctx));
        else if (token.text) out.push(inlineText(token.text));
    }
  }
  return out;
}

function heading(token, ctx) {
  return h('div', ctx.theme.heading(token.depth), inline(token.tokens, ctx));
}

function paragraph(token, ctx) {
  return h('div', ctx.theme.paragraph(), inline(token.tokens, ctx));
}

function codeBlock(token, ctx) {
  return h('div', {
    ...ctx.theme.code(),
    fontFamily: ctx.mono,
  }, [String(token.text ?? '')]);
}

function quote(token, ctx) {
  return h('div', ctx.theme.quote(), blocks(token.tokens ?? [], ctx));
}

function listBlock(token, ctx) {
  const items = token.items ?? [];
  return h('div', ctx.theme.list(), items.map((item, index) => {
    const marker = token.ordered ? `${Number(token.start || 1) + index}.` : '•';
    const content = [];
    const inlineTokens = (item.tokens ?? []).filter((child) => child.type !== 'list');
    const nested = (item.tokens ?? []).filter((child) => child.type === 'list');

    if (inlineTokens.length) {
      content.push(h('div', ctx.theme.listText(), inline(inlineTokens, ctx)));
    }
    for (const child of nested) content.push(listBlock(child, ctx));

    return h('div', ctx.theme.listItem(), [
      h('div', ctx.theme.marker(), [marker]),
      h('div', { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }, content),
    ]);
  }));
}

function tableBlock(token, ctx) {
  const cols = token.header?.length ?? 0;
  if (!cols) return null;

  const cell = (value, { header = false, last = false } = {}) => h(
    'div',
    ctx.theme.cell(header, last),
    inline(value?.tokens, ctx),
  );

  const row = (cells, header) => h('div', {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
  }, cells.map((value, index) => cell(value, { header, last: index === cols - 1 })));

  return h('div', ctx.theme.table(), [
    row(token.header ?? [], true),
    ...((token.rows ?? []).map((cells) => row(cells, false))),
  ]);
}

function blocks(tokens, ctx) {
  const out = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case 'heading': out.push(heading(token, ctx)); break;
      case 'paragraph': out.push(paragraph(token, ctx)); break;
      case 'code': out.push(codeBlock(token, ctx)); break;
      case 'blockquote': out.push(quote(token, ctx)); break;
      case 'list': out.push(listBlock(token, ctx)); break;
      case 'table': {
        const table = tableBlock(token, ctx);
        if (table) out.push(table);
        break;
      }
      case 'hr':
        out.push(h('div', ctx.theme.hr()));
        break;
      case 'html': {
        const text = String(token.raw ?? '').replace(/<[^>]+>/g, '').trim();
        if (text) out.push(paragraph({ tokens: [{ type: 'text', text }] }, ctx));
        break;
      }
      case 'space':
      default:
        break;
    }
  }
  return out;
}

function buildTree(markdown, { width }, ctx) {
  return ctx.theme.frame(blocks(marked.lexer(markdown), ctx), { width });
}

//  渲染

export async function renderMarkdown(md, { width = DEFAULT_WIDTH, theme = DEFAULT_THEME, timeoutMs = 20_000 } = {}) {
  const started = Date.now();
  const source = String(md ?? '');
  if (!source.trim()) throw new MarkdownError('Markdown 是空的 —— 没东西可渲染。');
  if (source.length > MAX_MD_CHARS) {
    throw new MarkdownError(`内容太长（${source.length} 字符，上限 ${MAX_MD_CHARS}）—— 精简一下，或分几张图。`);
  }

  const selectedTheme = getTheme(theme);
  const ctx = {
    ...loadFonts(selectedTheme),
    theme: selectedTheme,
  };
  const tree = buildTree(source, { width }, ctx);

  const timeout = Number(timeoutMs) > 0 ? Number(timeoutMs) : 20_000;
  const svg = await withTimeout(satori(tree, {
    width,
    fonts: ctx.fonts,
    embedFont: true,
  }), timeout, '排版超时');

  const scale = Number(process.env.MD_SCALE) > 0 ? Number(process.env.MD_SCALE) : 3;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: Math.max(1, Math.round(width * scale)) },
  });
  const image = resvg.render();
  const png = Buffer.from(image.asPng());

  return {
    png,
    width: image.width,
    height: image.height,
    bytes: png.length,
    ms: Date.now() - started,
  };
}

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new MarkdownError(`${message}（${ms}ms）`)), ms);
    }),
  ]);
}
