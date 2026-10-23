FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
RUN apk add --no-cache chromium && npm install --global --ignore-scripts playwright@1.62.1
WORKDIR /fixture
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
