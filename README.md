# tackleza/node

Docker Hub: https://hub.docker.com/r/tackleza/node

A lightweight Node.js Docker image based on Alpine Linux, enhanced with additional development tools.

This image is functionally identical to the official [`node`](https://hub.docker.com/_/node) image, but includes some extra software that is commonly needed in modern JavaScript/Node.js development environments.

## What's Included

In addition to the official Node.js image features, this image includes:

* pnpm – Fast, disk space efficient package manager

*More tools will be added over time. This list will be updated accordingly.*

## Base Image

* `node:<version>-alpine` – Small, efficient, and secure Alpine Linux-based image

## Usage

You can use this image just like the official Node.js image:

```bash
# Example using pnpm
FROM tackleza/node:20-alpine

WORKDIR /app
COPY . .
RUN pnpm install
CMD ["node", "index.js"]
```

---

Feel free to contribute or suggest more tools to be included!
