import test from 'node:test';
import assert from 'node:assert/strict';

import { dispatch, exposeUrl, isPrivateHost } from '../src/server.mjs';

test('initialize reports tools capability and server info', async () => {
  const res = await dispatch({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' },
  });
  assert.equal(res.id, 1);
  assert.equal(res.result.serverInfo.name, 'mcp-markdown-image');
  assert.deepEqual(res.result.capabilities, { tools: {} });
});

test('ping returns an empty result', async () => {
  const res = await dispatch({ jsonrpc: '2.0', id: 2, method: 'ping' });
  assert.deepEqual(res, { jsonrpc: '2.0', id: 2, result: {} });
});

test('tools/list exposes markdown_to_image', async () => {
  const res = await dispatch({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  assert.equal(res.result.tools.length, 1);
  assert.equal(res.result.tools[0].name, 'markdown_to_image');
  assert.deepEqual(res.result.tools[0].inputSchema.required, ['markdown']);
  assert.ok(res.result.tools[0].inputSchema.properties.theme.enum.includes('book'));
});

test('notifications do not produce a response', async () => {
  const res = await dispatch({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(res, null);
});

test('unknown method returns JSON-RPC error', async () => {
  const res = await dispatch({ jsonrpc: '2.0', id: 4, method: 'nope' });
  assert.equal(res.error.code, -32601);
});

test('private hosts are detected', () => {
  for (const host of ['127.0.0.1', 'localhost', '192.168.1.2', '10.0.0.1', '172.16.0.1', '::1']) {
    assert.equal(isPrivateHost(host), true, host);
  }
  assert.equal(isPrivateHost('img.example.com'), false);
});

test('local upload URLs are kept by default and can be hidden', () => {
  assert.equal(
    exposeUrl('http://127.0.0.1:3110/m/abc'),
    'http://127.0.0.1:3110/m/abc',
  );
  assert.equal(
    exposeUrl('http://127.0.0.1:3110/m/abc', '', true),
    '',
  );
  assert.equal(
    exposeUrl('http://127.0.0.1:3110/m/abc', 'https://img.example.com'),
    'https://img.example.com/m/abc',
  );
  assert.equal(
    exposeUrl('https://cdn.example.com/m/abc'),
    'https://cdn.example.com/m/abc',
  );
});
