# Moseek

A chat workspace based on the MIT-licensed [DeepSeek Chat Demo](https://github.com/deepseek-ai/chat-demo). [Open GitHub Pages](https://mofan6.github.io/Moseek/) · [简体中文](README.zh-CN.md)

In Moseek, open **Settings → API settings**, enter your DeepSeek API key, and confirm. The browser verifies the key directly with DeepSeek and saves it in localStorage. Moseek reads the key each time you reopen the same site in the same browser profile.

Moseek retains the demo’s streaming replies, editing and branches, search citations, uploads, voice, language, location, and history management. The browser saves chat history and attachments in IndexedDB. Clearing the site’s browser data removes both the API key and the chat history.

Choose DeepSeek V4.1 Flash or V4 Pro and select off, low, high, or max reasoning in the composer. Reply and chat usage show total tokens, output, cached input, and uncached input. Chat totals include every branch and continuation with usage reported by the API. Moseek history backups preserve the recorded usage.

Use Node.js 22.12+ and pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm dev` to work at `http://127.0.0.1:8090`. Run `pnpm type` for type checking and `pnpm build` to generate `dist/`. The [Pages workflow](.github/workflows/pages.yml) deploys that directory from `main` when GitHub Actions is selected as the publishing source.

See the upstream [MIT license](LICENSE).
