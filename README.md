# node

| Repository | Link |
|-------------|------|
| GitHub | https://github.com/tackleza/docker-node |
| Docker Hub | https://hub.docker.com/r/tackleza/node |

A lightweight Node.js Docker image based on Alpine Linux, with **pnpm** pre-installed globally on all variants.

## Support and security status

**Checked 2026-10-28. Do not use the EOL tags for new builds or production.**
Node.js 20, 21, 23, and 25 have reached end of life and no longer receive
upstream Node.js security patches. Rebuilding an image or running `apk upgrade`
does not fix vulnerabilities in an unsupported Node.js runtime. Migrate those
applications to a supported LTS release and test compatibility.

| Tag / source directory | Dockerfile base | Upstream status | Required action |
|---|---|---|---|
| `20-alpine` | `node:20-alpine` | **EOL — no Node.js security patches** | Migrate to patched Node 22 or 24 LTS |
| `21-alpine` | `node:21-alpine` | **EOL — no Node.js security patches** | Migrate to patched Node 22 or 24 LTS |
| `22-alpine` | `node:22-alpine` | Maintenance LTS | Rebuild with Node **22.23.4 or newer** security release |
| `23-alpine` | `node:23-alpine` | **EOL — no Node.js security patches** | Migrate to patched Node 24 LTS |
| `24-alpine` | `node:24-alpine` | Active LTS | Rebuild with Node **24.22.1 or newer** security release |
| `25-alpine` | `node:25-alpine` | **EOL — no Node.js security patches** | Migrate to patched Node 24 LTS |
| `latest` | `node:24-alpine` | Active LTS (Node 24) | Rebuild with Node **24.22.1 or newer** security release; prefer an explicit major tag |

These are source definitions, **not verification of the currently published
Docker Hub images**. Floating tags do not update an existing local image,
application image, or running container automatically. The October 21, 2026
Node.js security release fixes high-severity issues including a Brotli decoder
out-of-bounds write that permits remote code execution. Treat older runtimes,
including EOL releases, as requiring remediation.

For supported variants, fetch the current base (`docker build --pull`), verify
`node --version` in the resulting image, publish through the established image
workflow, then rebuild and redeploy dependent applications. Verify the actual
runtime inside each deployed container; changing `package.json` engines or
pulling a base image alone does not patch a running application. Preserve a
rollback image digest before deployment.

### Supported image builds

`sh build-supported.sh` builds and smoke-tests `22-alpine`, `24-alpine`, and
`latest` without publishing. It pulls the current base for each build, and the
Dockerfiles reject runtimes older than 22.23.4 / 24.22.1 in their respective
major release lines. All three images must build and pass the Node/pnpm checks
before `sh build-supported.sh --push` publishes any tag. A single variant can
be selected, for example `sh build-supported.sh 22-alpine`.

CI runs this supported build and publish workflow daily, on pushes, and on
manual dispatch. It pulls each supported Alpine base directly on every run;
it does not depend on `node:latest` digest changes. The legacy `build-all.sh`
and EOL directories remain for historical use and are excluded from CI.

Official sources:

- [Node.js release status and support schedule](https://nodejs.org/en/about/previous-releases)
- [Node.js end-of-life guidance](https://nodejs.org/en/about/eol)
- [October 21, 2026 security releases and fixed versions](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)

## What's Included

- **pnpm** — Fast, disk space efficient package manager, installed globally on all variants

## Usage

### Basic example

```dockerfile
FROM tackleza/node:22-alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
CMD ["node", "index.js"]
```

### Run interactively

```bash
docker run -it tackleza/node:22-alpine sh
node --version
pnpm --version
```

### With a volume for a project

```bash
docker run -it -v $(pwd):/app tackleza/node:22-alpine sh
```

## Why Use This Image?

This image is functionally identical to the official [`node`](https://hub.docker.com/_/node) Alpine image, but with **pnpm** pre-installed so you don't need to install it in every layer.

## Parent Image

- [`node:<version>-alpine`](https://hub.docker.com/_/node) — Minimal Alpine Linux-based Node.js images
