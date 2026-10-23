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

## Contended-disk rollout

On a busy host use `../deploy-node-red-brief.py` instead of holding the app down
for a full dependency-tree archive/restore. Its `prepare` phase runs while the
original service remains available: restore and content/ownership/mode-check the
immutable old dependency archive, pre-extract the candidate to a hidden stage,
verify it against the immutable image, and revalidate the original lock. No
concurrent palette installs are allowed. The archive is used only for immutable
dependencies, not accepted as a final mutable-state snapshot.

After the coordinator grants the stop gate, `cutover` revalidates image/lock and
stage hashes, takes and restores a brief cold mutable-state archive, verifies all
state content/ownership/modes, then atomically renames dependency paths and starts
the candidate. The mutable archive excludes node_modules (separately verified),
.npm/.cache (rebuildable) and .security-* staging/rollback directories. It includes
flows, settings, encrypted credentials, context and other runtime data. Previous
dependency directories remain untouched for immediate rollback.

`../verify-tree-test.cjs` checks full restores, allowed state-only exclusions,
protected flow tampering and permission differences. The original full-cold
helper remains available for quiet hosts; do not retry an unknown execution.

BusyBox tar restores regular-file owners but can leave symlink inodes root-owned.
The brief helper reapplies numeric symlink UID/GID from the archive with
`fs.lchownSync`, validates that the parent resolves inside the owned restore tree,
and never follows the symlink target. Tests reject absolute/escaping paths and
symlink ancestors outside the restore root. Exact owner/mode/content validation
then remains strict; differences are not waived.
