FROM node:24-alpine
# Fail closed if a stale registry mirror serves a runtime before the security release.
RUN node -e 'const [major, minor, patch] = process.versions.node.split(".").map(Number); if (major !== 24 || minor < 22 || (minor === 22 && patch < 1)) throw new Error("Node 24.22.1 or newer in the 24.x line is required")' \
    && npm install -g pnpm
