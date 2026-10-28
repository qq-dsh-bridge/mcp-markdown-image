#!/usr/bin/env node


import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, MarkdownError, MAX_MD_CHARS, DEFAULT_WIDTH } from './render.mjs';
import { DEFAULT_THEME, themeNames } from './themes/index.mjs';

const VERSION = '0.1.0';
const log = (...args) => process.stderr.write(`[mcp-markdown-image] ${args.join(' ')}\n`);

const TIMEOUT_MS = Number(process.env.MD_TIMEOUT_MS) > 0
  ? Number(process.env.MD_TIMEOUT_MS)
  : undefined;
const WIDTH = Number(process.env.MD_WIDTH) > 0 ? Number(process.env.MD_WIDTH) : DEFAULT_WIDTH;
const THEMES = themeNames();
const THEME = THEMES.includes(String(process.env.MD_THEME ?? ''))
  ? String(process.env.MD_THEME)
  : DEFAULT_THEME;
const OUTPUT_DIR = String(process.env.MD_OUTPUT_DIR ?? '').trim();
const INCLUDE_FILE = /^(1|true|yes)$/i.test(String(process.env.MD_INCLUDE_FILE ?? '').trim());
const UPLOAD_URL = String(process.env.MD_UPLOAD_URL ?? '').trim();
const UPLOAD_TOKEN = String(process.env.MD_UPLOAD_TOKEN ?? '').trim();
const UPLOAD_MODE = String(process.env.MD_UPLOAD_MODE ?? 'simple').trim().toLowerCase();
const PUBLIC_BASE_URL = String(process.env.MD_PUBLIC_BASE_URL ?? '').trim();
const HIDE_LOCAL_URL = /^(1|true|yes)$/i.test(String(process.env.MD_HIDE_LOCAL_URL ?? '').trim());

const TOOL = {
  name: 'markdown_to_image',
  description:
    'Render Markdown to a PNG image and return it as an image block.\n'
    + 'Use it when structure matters (tables, steps, nested lists, emphasis) and plain text would be hard to read.\n'
    + 'Do not use it for short chat messages: images are formal and their text cannot be copied.\n'
    + `Supports headings, bold, italic, inline code, fenced code, lists, quotes, tables and horizontal rules (max ${MAX_MD_CHARS} characters).`,
  inputSchema: {
    type: 'object',
    properties: {
      markdown: {
        type: 'string',
        description: `Markdown source. Max ${MAX_MD_CHARS} characters.`,
      },
      width: {
        type: 'integer',
        description: 'Logical page width in CSS pixels. Defaults to MD_WIDTH or 720.',
      },
      theme: {
        type: 'string',
        enum: THEMES,
        default: DEFAULT_THEME,
        description: 'Defaults to book. bubble = white card; document = plain white page; book = serif book paper.',
      },
    },
    required: ['markdown'],
  },
};

async function savePng(png, width) {
  if (!OUTPUT_DIR) return '';
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  const name = `md-${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${width}.png`;
  const file = path.join(OUTPUT_DIR, name);
  await fs.promises.writeFile(file, png);
  return file;
}

async function uploadPng(png) {
  if (!UPLOAD_URL) return '';
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(UPLOAD_TOKEN ? { authorization: `Bearer ${UPLOAD_TOKEN}` } : {}),
    },
    body: JSON.stringify(UPLOAD_MODE === 'bridge'
      ? { op: 'imagePublish', args: { base64: png.toString('base64'), mimeType: 'image/png' } }
      : { base64: png.toString('base64'), mimeType: 'image/png' }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`upload returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`upload failed (HTTP ${res.status}): ${json?.error ?? text.slice(0, 200)}`);
  const url = String(json?.url ?? json?.result?.url ?? '');
  if (!url) throw new Error('upload response has no url');
  return url;
}

export function isPrivateHost(hostname) {
  const host = String(hostname ?? '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true;
  if (host === 'host.docker.internal' || host.endsWith('.local')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

/**
 * 返回给调用方的 URL 必须是公网可访问的。
 * MD_PUBLIC_BASE_URL 只改 origin，保留上传服务返回的 path。
 * 没配 public base 时，loopback/私网 URL 直接丢弃，不把本机地址写进结果。
 */
export function exposeUrl(raw, publicBase = PUBLIC_BASE_URL, hideLocal = HIDE_LOCAL_URL) {
  if (!raw) return '';
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }

  if (publicBase) {
    const base = publicBase.endsWith('/') ? publicBase : `${publicBase}/`;
    return new URL(parsed.pathname.replace(/^\//, '') + parsed.search, base).href;
  }

  return hideLocal && isPrivateHost(parsed.hostname) ? '' : parsed.href;
}

function toContent(result, { url, file, suppressedUrl }) {
  const lines = [
    `Rendered ${result.width}x${result.height}px, ${result.bytes} bytes, ${result.ms}ms.`,
    'The image below is the result.',
  ];
  if (url) lines.push(`url: ${url}`);
  if (suppressedUrl) lines.push('url omitted: upload returned a local address (set MD_PUBLIC_BASE_URL to expose it).');
  // 本机路径默认不返回：WSL/容器里的调用方读不到 Windows 路径。
  if (file && INCLUDE_FILE) lines.push(`file: ${file}`);
  return [
    { type: 'text', text: lines.join('\n') },
    { type: 'image', data: result.png.toString('base64'), mimeType: 'image/png' },
  ];
}

async function callTool(name, args) {
  if (name !== TOOL.name) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }

  const markdown = String(args?.markdown ?? '');
  const width = Number.isInteger(args?.width) && args.width > 0 && args.width <= 4096
    ? args.width
    : WIDTH;
  const theme = THEMES.includes(String(args?.theme ?? '')) ? String(args.theme) : THEME;

  try {
    const result = await renderMarkdown(markdown, {
      width,
      theme,
      ...(TIMEOUT_MS ? { timeoutMs: TIMEOUT_MS } : {}),
    });

    let file = '';
    let rawUrl = '';
    try {
      file = await savePng(result.png, result.width);
    } catch (error) {
      log('save failed:', String(error?.message ?? error));
    }
    try {
      rawUrl = await uploadPng(result.png);
    } catch (error) {
      log('upload failed:', String(error?.message ?? error));
    }

    const url = exposeUrl(rawUrl);
    return {
      content: toContent(result, {
        url,
        file,
        suppressedUrl: Boolean(rawUrl && !url),
      }),
    };
  } catch (error) {
    const message = error instanceof MarkdownError
      ? error.message
      : String(error?.message ?? error);
    return { content: [{ type: 'text', text: `Render failed: ${message}` }], isError: true };
  }
}

export async function dispatch(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'mcp-markdown-image', version: VERSION },
        instructions:
          'Render Markdown to a PNG when structure matters (tables, steps, nested lists). '
          + 'Do not use it for short chat messages.',
      },
    };
  }

  if (method === 'notifications/initialized' || method === 'initialized') return null;
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: [TOOL] } };
  if (method === 'tools/call') {
    return {
      jsonrpc: '2.0',
      id,
      result: await callTool(params?.name, params?.arguments ?? {}),
    };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

function start() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  let chain = Promise.resolve();
  const send = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);

  rl.on('line', (line) => {
    const text = line.trim();
    if (!text) return;

    chain = chain.then(async () => {
      let req;
      try {
        req = JSON.parse(text);
      } catch {
        return;
      }
      const response = await dispatch(req);
      if (response) send(response);
    }).catch((error) => {
      log('request failed:', String(error?.message ?? error));
    });
  });

  rl.on('close', () => {
    chain.finally(() => process.exit(0));
  });

  log(`ready (width ${WIDTH}, theme ${THEME}, timeout ${TIMEOUT_MS ?? 20000}ms)`);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) start();

