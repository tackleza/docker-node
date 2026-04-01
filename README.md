# node

Docker Hub: https://hub.docker.com/r/tackleza/node

A lightweight Node.js Docker image based on Alpine Linux, with **pnpm** pre-installed globally on all variants.

## Available Tags

| Tag | Node.js Version |
|-----|----------------|
| `20-alpine` | Node.js 20 |
| `21-alpine` | Node.js 21 |
| `22-alpine` | Node.js 22 |
| `23-alpine` | Node.js 23 |
| `24-alpine` | Node.js 24 |
| `25-alpine` | Node.js 25 |
| `latest` | Node.js 25 |

All images are based on the official `node:<version>-alpine` images.

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
