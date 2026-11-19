# Moseek

A chat workspace based on the MIT-licensed [DeepSeek Chat Demo](https://github.com/deepseek-ai/chat-demo). [Open GitHub Pages](https://mofan6.github.io/Moseek/) · [简体中文](README.zh-CN.md)

Start the companion service on the computer running your browser. In Moseek, open **Settings → Local connection** and paste the pairing code shown in the terminal. Allow local network access if prompted. The browser connects to the loopback service, which reads your DeepSeek API key locally and forwards requests. Keep the service running during chat.

Moseek retains the demo’s streaming replies, editing and branches, search citations, uploads, voice, language, location, and history management. Chat history is stored in the browser. The pairing code is kept for the current browser tab.

Use Node.js 22.12+ and pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm dev` to work at `http://127.0.0.1:8090`. Run `pnpm type` for type checking and `pnpm build` to generate `dist/`. The [Pages workflow](.github/workflows/pages.yml) deploys that directory from `main` when GitHub Actions is selected as the publishing source.

See the upstream [MIT license](LICENSE).
