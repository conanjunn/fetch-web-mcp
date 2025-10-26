# MCP Web Fetch 服务

这是一个 MCP (Model Context Protocol) 服务，为 Claude Code 提供网页内容获取功能。

## 功能特性

- 通过 URL 获取网页内容并转换为 Markdown 格式
- **智能内容提取**: 自动移除导航、页脚、广告等无关内容,只保留主要内容
- 支持 HTTP 和 HTTPS 协议
- 自动将 HTML 转换为清晰易读的 Markdown 文本
- 大幅减少内容长度,避免超过上下文限制
- 内置错误处理和超时保护(30 秒超时)
- 可选的 SOCKS5 代理支持
- 自动设置标准的 User-Agent 头
- 支持 Claude Code 集成

## 安装

### 前置要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn

### 步骤

1. 安装依赖：

```bash
npm install
```

2. 确保文件有执行权限：

```bash
chmod +x index.js
```

## 使用方法

### 1. 本地运行测试

```bash
npm start
```

### 2. 在 Claude Code 中配置

#### 方法一：使用 claude mcp add 命令（推荐）

```bash
claude mcp add fetch node /your/path/mcp-fetch/index.js
```

**注意：** 将路径替换为你的实际安装路径。此命令会自动添加配置到 `~/.claude/config.json`。

#### 方法二：手动编辑配置文件

编辑 Claude Code 的配置文件 `~/.claude/config.json`，添加以下配置：

```json
{
  "mcpServers": {
    "fetch": {
      "command": "node",
      "args": ["/path/to/mcp-fetch/index.js"]
    }
  }
}
```

**注意：** 将 `/path/to/mcp-fetch/index.js` 替换为实际的服务文件绝对路径。

### 3. 在 Claude Code 中使用

配置完成后，Claude Code 会自动识别 `web-fetch` 工具。你可以在 Claude Code 中请求：

```
获取这个网址的 HTML 内容：https://example.com
```

## 工具说明

### web-fetch

**描述：** 获取指定 URL 的网页内容并转换为 Markdown 格式

**参数：**
- `url` (必需，字符串): 要获取的网页完整 URL
- `useProxy` (可选，布尔值): 是否使用代理 (默认: false)
  - 设置为 `true` 时使用 SOCKS5 代理: `socks5://127.0.0.1:7897`
  - 仅在用户明确要求"加代理"或"使用代理"时才设置为 true

**返回值：** 网页内容转换后的 Markdown 文本

**示例请求：**
```
请获取 https://www.example.com 的内容
```

或使用代理:
```
加代理获取 https://www.google.com 的内容
```

**返回结果：** 清晰易读的 Markdown 格式文本

## 技术细节

- **框架：** Node.js 18+
- **MCP SDK：** @modelcontextprotocol/sdk ^1.20.0
- **HTTP 库：** node-fetch ^3.3.2 (自动支持 HTTPS_PROXY 环境变量)
- **HTML 解析：** jsdom ^25.0.1 (智能提取主要内容)
- **HTML 转换：** turndown ^7.2.2 (HTML 到 Markdown 转换)
- **通信方式：** stdio (标准输入输出)
- **超时设置：** 30 秒
- **代理支持：** SOCKS5 代理 (127.0.0.1:7897),仅在明确要求时启用
- **User-Agent：** Chrome 浏览器标准头，避免被某些网站拦截

## 错误处理

服务会返回以下类型的错误：

- **无效 URL 格式：** 验证失败的 URL
- **HTTP 错误：** 服务器返回非 200 状态码
- **网络错误：** 连接失败、超时等
- **内部错误：** 其他未预期的错误

## 文件结构

```
mcp-fetch/
├── package.json       # 项目配置和依赖
├── index.js          # MCP 服务器主文件
└── README.md         # 本文档
```

## 许可证

MIT
