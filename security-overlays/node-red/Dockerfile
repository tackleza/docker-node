FROM nodered/node-red@sha256:e085d4a06591fd0aca2ea2a91364d27f1a0e31e885675f77935e10f95412a963
USER root
# The immutable vendor base already ships ip-address 10.7.4 at the top level;
# use those exact patched bytes for npm's stale bundled copy as well.
RUN test "$(node -p "require('/usr/src/node-red/node_modules/ip-address/package.json').version")" = 10.7.4 \
    && for target in /usr/src/node-red/node_modules/npm/node_modules/ip-address /usr/local/lib/node_modules/npm/node_modules/ip-address; do \
         if [ -d "$target" ]; then rm -rf "$target" && cp -a /usr/src/node-red/node_modules/ip-address "$target"; fi; \
       done
RUN mkdir /opt/flow-dependencies && chown node-red:node-red /opt/flow-dependencies
WORKDIR /opt/flow-dependencies
COPY --chown=node-red:node-red package.json package-lock.json ./
COPY --chown=node-red:node-red vendor/ ./vendor/
USER node-red
RUN npm ci --omit=dev --ignore-scripts --no-audit \
    && (cd node_modules/node-red-dashboard && node fixgrid.js) \
    && node -e "if(process.version!=='v24.22.1')process.exit(1);require('protobufjs');require('castv2');require('node-red-node-serialport/package.json')"
WORKDIR /usr/src/node-red
