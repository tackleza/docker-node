# Wiki.js maintained 2.x stable release; security fixes landed in 2.5.315.
FROM node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS node_runtime
FROM ghcr.io/requarks/wiki:2.5.316@sha256:fffff288a52f76e5b8c19a4fbcd0f3e538e96edea642c4f2d813d54d59a876de
COPY --from=node_runtime /usr/local/bin/node /usr/local/bin/node
RUN node --version && node -e "if(require('./package.json').version!=='2.5.316')process.exit(1);for(const name of ['sqlite3','cpu-features','ssh2'])require(name)"
