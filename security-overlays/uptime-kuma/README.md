# Uptime Kuma 2.5.7 dependency overlay

Retains the immutable vendor 2.5.7 image, patched Node 22.23.4, runtime source and
built UI. The runtime-only manifest drops development dependency declarations to
resolve the vendor TypeScript peer conflict without ignoring peers. Production
npm ci uses the committed lock and disabled lifecycle scripts, then restores the
exact tested vendor SQLite native binding. SQLite package major, app release,
schema and monitor settings remain unchanged.

Reviewed pins include protobuf 7.6.6, Axios 0.34.0, grpc-js 1.14.6, Liquid 10.30.0,
MySQL2 3.24.6, qs 6.16.1, ws 8.22.0 and transitive fixes. tar 6→7 and Nodemailer
7→10 are explicit tested compatibility changes; no npm audit force-fix is used.
All notification/monitor features are retained.

Build and validate from this directory:

```sh
docker build -t uptime-kuma-dependencies:REVIEWED_REVISION .
docker run --rm --entrypoint node -v "$PWD/compatibility-test.cjs:/check.cjs:ro" uptime-kuma-dependencies:REVIEWED_REVISION /check.cjs
docker run --rm --entrypoint npm -w /app uptime-kuma-dependencies:REVIEWED_REVISION audit --omit=dev --json
```

Tests use disposable scratch data and loopback endpoints: SQLite read/write,
tar create/extract/traversal rejection, Axios HTTP/redirects, real Kuma gRPC keyword
and SMTP monitors, SMTP notification delivery, templates, full app startup/new
scratch database, UI, setup/login and an authenticated HTTP monitor UP heartbeat.
Synthetic test credentials never access production. The installed candidate
production audit has zero findings; optional integrations and OS packages are
not universally validated by this result.

Use ../deploy-kuma.py only after a serialized stop gate. It records rollback,
verifies a full cold backup by restoring content/ownership/modes and SQLite
integrity, compares hashed user/monitor/notification/settings tables, then
replaces the bare Docker container with exact prior configuration, retaining the
previous stopped container. No environment or credentials are logged. A failed
acceptance restores the prior container without automatic live-data rollback.

Source: https://github.com/louislam/uptime-kuma/releases/tag/2.5.7.
