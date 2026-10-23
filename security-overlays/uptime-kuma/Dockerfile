FROM louislam/uptime-kuma@sha256:4b95dbe7ac5343b768f8e04e3035ccd59997872b1a35ab9b0f082d2cc279070e
USER root
WORKDIR /app
# Preserve the vendor-tested native SQLite binding while resolving only JS deps.
RUN cp -a node_modules/@louislam/sqlite3/lib/binding /tmp/sqlite-binding
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit \
    && cp -a /tmp/sqlite-binding node_modules/@louislam/sqlite3/lib/binding \
    && rm -rf /tmp/sqlite-binding \
    && node -e "require('@louislam/sqlite3'); require('tar'); require('protobufjs'); if(process.version!=='v22.23.4')process.exit(1)"
