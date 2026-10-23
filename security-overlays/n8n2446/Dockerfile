FROM n8nio/n8n@sha256:d02752c6ab446ae9db8deec2f9cc887c378f77cdcad31650814df936b7386dfb AS vendor
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS native_build
RUN apk add --no-cache python3 make g++ linux-headers pkgconf bash openssl-dev zlib-dev cyrus-sasl-dev lz4-dev zstd-dev
COPY --from=vendor /usr/local/lib/node_modules/n8n/node_modules/.pnpm/isolated-vm@7.0.1/node_modules/isolated-vm /native/isolated-vm
WORKDIR /native/isolated-vm
RUN npm install --ignore-scripts --omit=dev --package-lock=false && node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release -j2
WORKDIR /native/kafka
RUN wget -q -O /tmp/kafka-node24.tar.gz https://github.com/confluentinc/confluent-kafka-javascript/releases/download/v1.9.1/confluent-kafka-javascript-v1.9.1-node-v137-linux-musl-x64.tar.gz && echo "c3f322e9c0b6150ed58810a5dd3c659fb17f045005adc9e960aad03b14f737af  /tmp/kafka-node24.tar.gz" | sha256sum -c - && tar xzf /tmp/kafka-node24.tar.gz
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS security_dependencies
WORKDIR /security
COPY security-dependencies/package.json security-dependencies/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
FROM vendor
COPY --from=native_build /usr/local/bin/node /usr/bin/node
COPY --from=native_build /native/isolated-vm/build/Release/isolated_vm.node /usr/local/lib/node_modules/n8n/node_modules/.pnpm/isolated-vm@7.0.1/node_modules/isolated-vm/build/Release/isolated_vm.node
COPY --from=native_build /native/kafka/Release/confluent-kafka-javascript.node /usr/local/lib/node_modules/n8n/node_modules/.pnpm/@confluentinc+kafka-javascript@1.9.1_patch_hash=c597d3e3d9d6d0d33588b7dc1e88d55f270ba15_602b6fdd5199747e8d909d98d456db49/node_modules/@confluentinc/kafka-javascript/build/Release/confluent-kafka-javascript.node
USER root
RUN rm -rf /usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-editor-ui@file++++home+runner+_work+n8n+n8n+packages+frontend+editor-ui/node_modules/n8n-editor-ui/dist /usr/local/lib/node_modules/n8n/node_modules/.pnpm/@n8n+design-system@file++++home+runner+_work+n8n+n8n+packages+frontend+@n8n+design-system/node_modules/@n8n/design-system/dist /usr/local/lib/node_modules/n8n/node_modules/.pnpm/@n8n+mcp-apps@file++++home+runner+_work+n8n+n8n+packages+@n8n+mcp-apps/node_modules/@n8n/mcp-apps/dist/apps
COPY frontend-artifacts/editor-dist/ /usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-editor-ui@file++++home+runner+_work+n8n+n8n+packages+frontend+editor-ui/node_modules/n8n-editor-ui/dist/
COPY frontend-artifacts/design-system-dist/ /usr/local/lib/node_modules/n8n/node_modules/.pnpm/@n8n+design-system@file++++home+runner+_work+n8n+n8n+packages+frontend+@n8n+design-system/node_modules/@n8n/design-system/dist/
COPY frontend-artifacts/mcp-apps/ /usr/local/lib/node_modules/n8n/node_modules/.pnpm/@n8n+mcp-apps@file++++home+runner+_work+n8n+n8n+packages+@n8n+mcp-apps/node_modules/@n8n/mcp-apps/dist/apps/
COPY frontend-artifacts/frontend-build-info.json /opt/n8n-security/frontend-build-info.json
COPY frontend-source.patch /opt/n8n-security/frontend-source.patch
COPY verify-frontend-artifacts.cjs /opt/n8n-security/verify-frontend-artifacts.cjs
RUN node /opt/n8n-security/verify-frontend-artifacts.cjs
COPY --from=security_dependencies /security/node_modules /opt/n8n-security/node_modules
COPY security-dependencies/plan.json /opt/n8n-security/plan.json
COPY security-dependencies/reviewed-major-transitions.json /opt/n8n-security/reviewed-major-transitions.json
COPY patch-compatibility.cjs /opt/n8n-security/patch-compatibility.cjs
COPY relink-security.cjs /opt/n8n-security/relink-security.cjs
RUN node /opt/n8n-security/relink-security.cjs && N8N_GIT_CONSUMER_SHA=4f83e5249d7d69e796e2cc1ccf55d732ee429e14041623e4c55207693474eb44 node /opt/n8n-security/patch-compatibility.cjs
USER node
ENV NODE_VERSION=24.22.1 NODE_ICU_DATA=""
RUN node --version && node -e 'require("/usr/local/lib/node_modules/n8n/node_modules/.pnpm/isolated-vm@7.0.1/node_modules/isolated-vm");require("/usr/local/lib/node_modules/n8n/node_modules/.pnpm/@confluentinc+kafka-javascript@1.9.1_patch_hash=c597d3e3d9d6d0d33588b7dc1e88d55f270ba15_602b6fdd5199747e8d909d98d456db49/node_modules/@confluentinc/kafka-javascript");console.log("LTS native modules loaded")'
COPY compat-smoke.cjs /opt/n8n-security/compat-smoke.cjs
RUN node /opt/n8n-security/compat-smoke.cjs
COPY major-compat-smoke.cjs /opt/n8n-security/major-compat-smoke.cjs
RUN node /opt/n8n-security/major-compat-smoke.cjs
ARG N8N_SECURITY_REVISION=uncommitted
LABEL security.patch.revision=$N8N_SECURITY_REVISION security.node.version=24.22.1 security.app.version=2.44.6 security.markdown.version=14.3.3 security.frontend.upstream=b58d9e89d60e9a3485bb511c5091d8be0d9511e4
