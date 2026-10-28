FROM node:22-alpine
# Fail closed if a stale registry mirror serves a runtime before the security release.
RUN node -e 'const [major, minor, patch] = process.versions.node.split(".").map(Number); if (major !== 22 || minor < 23 || (minor === 23 && patch < 4)) throw new Error("Node 22.23.4 or newer in the 22.x line is required")' \
    && npm install -g pnpm
