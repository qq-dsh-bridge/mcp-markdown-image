# mcp-markdown-image

Markdown → PNG 的 MCP 服务。

## 安装

```sh
npm install
```

## 启动

```sh
node src/server.mjs
```

MCP 客户端用 stdio 连接上面的命令。

需要 CJK 字体；找不到系统字体时用 `MD_FONT` 指定 `.ttf` / `.otf`。
