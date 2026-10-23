FROM node:24.22.1-alpine3.23@sha256:0468540aa58203ff9e40c2aab3907c52644ab818af6176b1c70a026137dc92a2 AS node_runtime
FROM ghcr.io/requarks/wiki@sha256:68f0d1848261ae76492ba358e30a96a76fed5d97a3fff381656082bf90f70d7e
COPY --from=node_runtime /usr/local/bin/node /usr/local/bin/node
RUN node --version
