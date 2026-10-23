# Node-RED 5.0.9 dependency overlay

Retains the immutable official Node-RED 5.0.9 / Node 24.22.1 image and every
installed plugin version. A locked `/opt/flow-dependencies` artifact replaces
only the persistent `/data` dependency files offline during a selected Compose
service stop. Flows, credentials, settings and networks are preserved.

The sole plugin metadata change is email `3.1.0-security.1`: runtime JS/HTML and
licenses are unchanged from npm 3.1.0. Bundled dependency directories/declaration
were removed so reviewed root overrides can resolve security fixes;
`email-provenance.json` records upstream integrity and local SHA-256. Cast remains
installed; protobuf 7.6.6 passes an exact original protobuf 6 Cast wire-byte
comparison and parse round trip. HA remains at 0.77.2 to avoid flow migrations.

The immutable vendor image already ships top-level ip-address 10.7.4. Those exact
bytes replace npm's stale bundled copy, clearing the moderate finding in the
separate actual installed core graph. npm is not upgraded. Lifecycle scripts are
disabled; reviewed Dashboard fixgrid.js reproduces its vendor postinstall cleanup.

Build and validate from this directory:

```sh
docker build -t node-red-dependencies:REVIEWED_REVISION .
docker run --rm --entrypoint node -v "$PWD/compatibility-test.cjs:/check.cjs:ro" node-red-dependencies:REVIEWED_REVISION /check.cjs
docker run --rm --entrypoint npm -w /opt/flow-dependencies node-red-dependencies:REVIEWED_REVISION audit --omit=dev --json
```

Isolated tests cover all 26 plugins and active flow types registering, an HTTP
function flow, real email output to a loopback SMTP server, mocked HA WebSocket
authentication/state requests, MIME parsing, Cast wire protocol, native SerialPort
loading and UUID/time helpers. They do not operate real speakers, serial hardware
or production HA entities. Candidate installed plugin audit and actual installed
core graph both have zero applicable findings. This is not a full OS/SBOM scan.
Dashboard remains deprecated; its future product migration is separate.

Use ../deploy-node-red.py only after a serialized stop gate. It verifies expected
image/lock, saves Compose and a full cold data archive, restores and verifies
content/ownership/modes, then swaps only dependency files and selected image.
Protected flow/settings/credential hashes and readiness must pass. On failure,
previous dependencies/image are restored without overwriting flows.

Sources: https://github.com/advisories/GHSA-xq3m-2v4x-88gg and
https://github.com/node-red/node-red/releases/tag/5.0.9.
