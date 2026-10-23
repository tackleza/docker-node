FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS node_runtime
FROM n8nio/n8n@sha256:9220846479a40e3df1bc12e673cf38d33d0800afbea68b9bc90109babf594547
COPY --from=node_runtime /usr/local/bin/node /opt/nodejs/node-v22.22.0/bin/node
RUN node --version
