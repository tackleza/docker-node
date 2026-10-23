FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
# pnpm12 must install its native launcher so Turbo can start it.
RUN apk add --no-cache git bash patch python3 make g++ && npm install --global pnpm@12.4.2
RUN wget -q -O /tmp/upstream.tar.gz https://codeload.github.com/n8n-io/n8n/tar.gz/b58d9e89d60e9a3485bb511c5091d8be0d9511e4 && echo "0fc814db5450bf2a94290cc7e11da0411b69ae344c50305f29731c88449b7a83  /tmp/upstream.tar.gz" | sha256sum -c - && mkdir /src && tar xzf /tmp/upstream.tar.gz --strip-components=1 -C /src && rm /tmp/upstream.tar.gz
WORKDIR /src
COPY frontend-source.patch /build/frontend-source.patch
RUN patch -p1 < /build/frontend-source.patch
COPY rendering.config.mts /src/packages/frontend/editor-ui/rendering.config.mts
COPY build-frontend-in-container.sh collect-frontend.cjs /build/
ENV CI=true TURBO_TELEMETRY_DISABLED=1 N8N_USER_FOLDER=/tmp/n8n-rendering-tests NODE_OPTIONS=--max-old-space-size=4096
CMD ["sh", "/build/build-frontend-in-container.sh"]
