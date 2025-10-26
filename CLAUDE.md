# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 MCP (Model Context Protocol) 服务器,为 Claude Code 提供网页内容获取功能。通过 `web-fetch` 工具,可以获取任意 URL 的网页内容并自动转换为 Markdown 格式,大幅减少内容长度,避免超过上下文限制。

## 技术架构

### 核心组件

- **MCP 服务器** (`index.js`): 使用 `@modelcontextprotocol/sdk` 实现的 MCP 服务器
- **通信方式**: stdio (标准输入输出),与 Claude Code 通过 stdio transport 进行通信
- **HTTP 客户端**: 使用 `node-fetch` 进行网页内容获取
- **HTML 解析**: 使用 `jsdom` 解析和清理 HTML,提取主要内容
- **HTML 转换**: 使用 `turndown` 将 HTML 转换为 Markdown 格式

### 关键实现细节

1. **HTML 清理函数** (index.js:38-86)
   - 使用 jsdom 解析 HTML
   - 移除无关元素:script, style, nav, header, footer, aside, ads, forms 等
   - 智能定位主要内容区域:main, article, .content 等
   - 大幅减少内容长度,避免超过 token 限制

2. **Turndown 初始化** (index.js:31-36)
   - 创建 TurndownService 实例用于 HTML 到 Markdown 转换
   - 配置 Markdown 样式(ATX 标题、围栏式代码块等)

3. **服务器初始化** (index.js:88-99)
   - 使用 `Server` 类创建 MCP 服务器实例
   - 声明 `tools` capability,表明这是一个提供工具的服务器

4. **工具注册** (index.js:175-195)
   - 通过 `ListToolsRequestSchema` 处理器注册 `web-fetch` 工具
   - 工具接受一个 `url` 参数(必需)

5. **工具执行** (index.js:200-227)
   - 通过 `CallToolRequestSchema` 处理器处理工具调用请求
   - 调用 `webFetch()` 函数执行实际的 HTTP 请求

6. **HTTP 请求与转换** (index.js:106-173)
   - 根据 useProxy 参数动态设置 HTTPS_PROXY 环境变量 (index.js:117-124)
   - 超时设置为 30 秒
   - 使用 Chrome User-Agent 避免被网站拦截
   - 清理 HTML 提取主要内容 (index.js:145-146)
   - 获取 HTML 后使用 turndown 转换为 Markdown (index.js:149)
   - 使用 finally 块恢复原始代理设置,确保不影响其他请求 (index.js:158-165)
   - 错误处理:URL 验证、HTTP 状态码检查、异常捕获

## 常用命令

### 安装依赖
```bash
npm install
```

### 启动服务
```bash
npm start
# 或直接运行
node index.js
```

### 确保执行权限
```bash
chmod +x index.js
```

## 配置说明

### 在 Claude Code 中配置此服务

在 `~/.claude/config.json` 中添加:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "node",
      "args": ["/Users/xuyang/demo/mcp-fetch/index.js"]
    }
  }
}
```

注意:需要使用绝对路径指向 `index.js` 文件。

## 依赖说明

- `@modelcontextprotocol/sdk`: MCP SDK,提供服务器和传输层实现
- `node-fetch`: HTTP 请求库,用于获取网页内容,自动支持 HTTPS_PROXY 环境变量
- `jsdom`: DOM 解析库,用于智能提取网页主要内容
- `turndown`: HTML 到 Markdown 转换库,减少内容长度
- Node.js 版本要求: >= 18.0.0 (使用 ES modules)

## 代理使用

- **默认行为**: 不使用代理,直接访问
- **启用代理**: 当用户明确说"加代理"、"使用代理"时,设置 `useProxy: true`
- **代理地址**: `socks5://127.0.0.1:7897` (硬编码在 index.js:52)
- **实现方式**: 通过设置 `process.env.HTTPS_PROXY` 环境变量,node-fetch 自动使用
- **清理机制**: 请求完成后自动恢复原始代理设置,不影响后续请求

## 错误处理

服务使用 `McpError` 抛出标准化错误:

- `InvalidRequest`: URL 格式无效或缺少必需参数
- `InternalError`: HTTP 请求失败或网络错误
- `MethodNotFound`: 调用未知工具
