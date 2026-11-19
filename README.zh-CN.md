# Moseek

Moseek 是基于 [DeepSeek Chat Demo](https://github.com/deepseek-ai/chat-demo) 的聊天工作台。[打开 GitHub Pages](https://mofan6.github.io/Moseek/) · [English](README.md)

## 开始聊天

1. 打开 Moseek，进入「设置 → API 设置」。
2. 输入 DeepSeek API Key 并点击「确定」。DeepSeek 校验通过后，浏览器会保存密钥。
3. 发送消息。下次在同一浏览器资料中打开同一个网址时，Moseek 会自动读取密钥和历史对话。

API Key 保存在浏览器的 localStorage，历史对话和附件保存在 IndexedDB。网页直接请求 DeepSeek API，密钥用于请求鉴权。清除该站点的浏览器数据会同时清除密钥和历史对话。

## 功能

- 流式回答、停止生成、继续、重新生成、编辑提问和切换回复分支。
- 深度思考、联网搜索、引用、附件、语音输入与朗读。
- 主题跟随系统或手动选择深浅色，支持简体中文和英文，提供朗读音色与位置选择。
- 对话保存在当前浏览器。数据管理支持导入、导出和清空历史记录。导入前会要求确认，成功后替换本机历史。

## 开发与部署

需要 Node.js 22.12+ 和 pnpm。运行 `pnpm install --frozen-lockfile` 安装依赖，运行 `pnpm dev` 在 `http://127.0.0.1:8090` 预览。运行 `pnpm type` 检查类型，`pnpm build` 构建静态资源到 `dist/`。

将仓库的 Pages 来源设为 GitHub Actions。推送至 `main` 会由 [Pages 工作流](.github/workflows/pages.yml) 构建并部署 `dist/`。

保留原项目的 [MIT 许可证](LICENSE)。
