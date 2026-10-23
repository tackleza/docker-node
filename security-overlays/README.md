# Emergency vendor Node runtime patches — 2026-10-23

These recipes retain the exact installed vendor application and replace only
its Node executable with an official patched release in the same supported
major. They do not publish or move the shared `tackleza/node` tags. Pin every
base/runtime image by immutable digest and record the resulting image ID.

| Application | Retained version | Patched Node | Runtime source |
|---|---|---|---|
| Wiki.js | 2.5.316 | 24.22.1 | Official Node Alpine 3.24, matching maintained vendor image |
| n8n | 2.7.5 | 22.23.4 | Official Node Alpine musl, tested on original DHI Alpine 3.22 |

The n8n image retains its existing executable path under
`/opt/nodejs/node-v22.22.0/bin/node` so inherited PATH/entrypoint symlinks remain
valid. The directory name is historical; `node --version` must report 22.23.4.
The original Node ABI stays 127. Wiki keeps ABI 137. Verify native modules and
isolated startup before connecting either image to production data.

For Node-RED and Uptime Kuma, patched official images are available and preferred:

| Application | Patched official image | Actual Node verified |
|---|---|---|
| Node-RED | `nodered/node-red@sha256:e085d4a06591fd0aca2ea2a91364d27f1a0e31e885675f77935e10f95412a963` (5.0.9-24) | 24.22.1 |
| Uptime Kuma | `louislam/uptime-kuma@sha256:4b95dbe7ac5343b768f8e04e3035ccd59997872b1a35ab9b0f082d2cc279070e` (2.5.7) | 22.23.4 |

## Scope and remaining dependency risk

A patched Node executable does not fix all vendor application dependencies.
The production dependency audits for these installed applications and Node-RED
flow packages still report high/critical advisories. Keep those findings in
the remediation queue, assess applicability, and prefer tested upstream fixes.
Do not apply blind `npm audit fix --force` to a running vendor installation.
That can alter protocols, plugins, migrations and workflow behavior.

## Deployment and recovery

Use the application's existing Compose or Docker deployment definition. Before
each rollout, save the exact prior image, selected configuration and persistent
data backup where appropriate. Keep secrets outside this repository. Preserve
all environments, network modes/aliases, published ports, mounts, restart
policies, user IDs and commands. Change only the selected image.

For bare containers, retain the stopped prior container under a unique rollback
name until the replacement's readiness, logs, public endpoint and actual Node
version pass. Recreate network aliases including the original service name.
If the replacement fails, inspect it, stop it, restore the prior container name
and start the prior image. Never start two writers against the same data.
Image rollback retains current persistent data; database restoration is a
separate operation and must not silently overwrite newer data.

Node-RED validation must use safe mode and an isolated network/data directory
so tests cannot trigger real flows. Wiki/n8n validation must use disposable
storage and no production credentials. Kuma SQLite backup uses the live
SQLite backup API and integrity verification before upgrade.

Sources:

- https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- https://github.com/louislam/uptime-kuma/releases/tag/2.5.7
- https://github.com/node-red/node-red/releases/tag/5.0.9

Wiki.js application/PG maintenance and residual dependency risks are documented in [wiki-js/README.md](wiki-js/README.md).
