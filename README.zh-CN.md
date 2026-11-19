# Moseek

Moseek 是基于 [DeepSeek Chat Demo](https://github.com/deepseek-ai/chat-demo) 的聊天工作台。[打开 GitHub Pages](https://mofan6.github.io/Moseek/) · [English](README.md)

## 开始聊天

1. 在运行浏览器的电脑上启动配套的 Moseek 本机服务。
2. 在网页的「设置 → 本机连接」中粘贴终端显示的配对码。Chrome 询问本地网络访问权限时，选择允许。
3. 验证成功后发送消息。使用深度思考、智能搜索、附件或语音时，也需要保持本机服务运行。

GitHub Pages 提供静态界面，网页只连接本机回环地址。DeepSeek API Key 和上游请求由配套本机服务处理。当前标签页记住配对码，重新打开标签页时可以再次配对。

## 功能

- 流式回答、停止生成、继续、重新生成、编辑提问和切换回复分支。
- 深度思考、联网搜索、引用、附件、语音输入与朗读。
- 主题跟随系统或手动选择深浅色，支持简体中文和英文，提供朗读音色与位置选择。
- 对话保存在当前浏览器。数据管理支持导入、导出和清空历史记录。导入前会要求确认，成功后替换本机历史。

## 开发与部署

需要 Node.js 22.12+ 和 pnpm。运行 `pnpm install --frozen-lockfile` 安装依赖，运行 `pnpm dev` 在 `http://127.0.0.1:8090` 预览。运行 `pnpm type` 检查类型，`pnpm build` 构建静态资源到 `dist/`。

将仓库的 Pages 来源设为 GitHub Actions。推送至 `main` 会由 [Pages 工作流](.github/workflows/pages.yml) 构建并部署 `dist/`。如需在另一个域名使用网页，请将新来源加入配套本机服务的允许列表。

保留原项目的 [MIT 许可证](LICENSE)。
