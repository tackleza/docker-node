#!/bin/sh
set -eu
pnpm --filter n8n-editor-ui... --filter @n8n/mcp-apps... install --frozen-lockfile --ignore-scripts > /out/install.log 2>&1
pnpm exec turbo run build --filter='n8n-editor-ui^...' --concurrency=1 --env-mode=loose > /out/dependencies-build.log 2>&1
pnpm exec biome format packages/frontend/@n8n/design-system/src/components/N8nMarkdown/Markdown.rendering.test.ts packages/frontend/editor-ui/src/app/__tests__/markdown-rendering.test.ts > /out/format.log 2>&1
pnpm --filter @n8n/design-system exec eslint src/components/N8nMarkdown/Markdown.rendering.test.ts > /out/design-lint.log 2>&1
pnpm --filter n8n-editor-ui exec eslint src/app/__tests__/markdown-rendering.test.ts > /out/editor-lint.log 2>&1
pnpm --filter @n8n/design-system test src/components/N8nMarkdown/Markdown.test.ts src/components/N8nMarkdown/youtube.test.ts src/components/N8nMarkdown/Markdown.rendering.test.ts --maxWorkers=1 > /out/design-tests.log 2>&1
pnpm --filter n8n-editor-ui test src/app/__tests__/markdown-rendering.test.ts src/features/ai/chatHub/composables/useChatHubMarkdownOptions.test.ts --maxWorkers=1 > /out/editor-tests.log 2>&1
pnpm --filter n8n-editor-ui exec cross-env VUE_APP_PUBLIC_PATH='/{{BASE_PATH}}/' RELEASE='n8n@2.44.6' NODE_OPTIONS='--max-old-space-size=4608' vite build --config rendering.config.mts > /out/editor-build.log 2>&1
pnpm --filter @n8n/mcp-apps build:ui > /out/mcp-ui-build.log 2>&1
node /build/collect-frontend.cjs
