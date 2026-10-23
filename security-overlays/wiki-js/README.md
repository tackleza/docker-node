# Wiki.js 2.x security maintenance

Verified 2026-10-24 against the maintained [Wiki.js v2.5.316 release](https://github.com/requarks/wiki-v2/releases/tag/v2.5.316).
The maintained 2.x source is now `requarks/wiki-v2`; do not select the 3.x beta.
The pinned official 2.5.316 image ships Node24.21.0. This recipe replaces that
executable with official Node24.22.1 from the matching Alpine3.24 family,
retaining ABI137 and all other vendor files. Both image sources are pinned by digest.

The application release includes the security fixes introduced in2.5.315:
[delegated administrator takeover/TFA bypass](https://github.com/requarks/wiki/security/advisories/GHSA-45cp-v5ph-2jhm)
and [author-controlled Vue slot expressions](https://github.com/requarks/wiki/security/advisories/GHSA-98c8-px3r-68c6).

Build using this directory, then run the verification script mounted read-only
inside the resulting image with `--network none`. It checks actual versions,
native module loading and sanitization of Vue bindings while preserving tabsets.
No production credentials are needed for that verification.

## Database and application rollout order

Keep the existing PostgreSQL15 major. Security minor target:
`postgres:15.19-alpine@sha256:a8e042598834300dfaa17a54f695b87b7f25d3490433bbbe2ef3bffbb9747f24`.
[Official15.19 notes](https://www.postgresql.org/docs/release/15.19/) require
checking logical decoding plugin configuration and relevant contributed indexes.
The inspected Wiki database has pg_trgm/plpgsql only, no btree_gist/ltree,
no replication slots and no invalid indexes. Retain existing data paths,
roles, credentials, network aliases, anonymous content volume and configuration.

Before each production cutover, coordinate the shared maintenance window,
stop the Wiki writer, take a fresh protected logical database dump/globals
and Wiki data archive, preserve exact old image/configuration references,
and record the rollback method. Upgrade only the selected database service
first and verify the old application against it. Then take a fresh pre-app
backup and upgrade only Wiki. Do not start two application writers.

Isolated validation restored the same logical dump into15.17 and15.19:
all34 table fingerprints matched (1,346 pages,2,860 history records). Both the
old2.5.314 and new2.5.316 applications passed login/content/render/authorization
checks on15.19. Negative security tests confirm delegated user managers cannot
change the root password, disable root TFA or remove its administrative group;
ordinary delegated user management still works. Vue sanitization checks pass.
A pre-migration dump restored into15.17 also passes old-application checks.

Test clones use an internal-only network, disabled external providers and
fresh clone signing keys/synthetic credentials. No provider jobs may reach
production or external services. Production credentials/content stay outside
this repository. Restore testing does not authorize restoring an older dump
over newer production writes: stop writers and assess data compatibility first.

## Focused dependency maintenance

Nine exact vendor paths are replaced with pinned package versions. The earlier
same-major multipart/underscore/Babel fixes remain. Three explicitly validated
major migrations now replace tar 6.2.1 with 7.5.22, simple-git 3.30.0 with 4.0.2,
and unscoped passport-saml 3.2.4 with @node-saml/passport-saml 5.1.1. The lockfile
includes complete helper dependency resolution; the vendor tree and native
binaries are not reinstalled. Guards reject any unexpected old version, package
name or unapproved major transition.

Git 4 exports a named factory and rejects core.sshCommand by default. The
pinned Wiki adapter is patched at its exact expected import/factory expressions.
Only SSH-authenticated storage enables the SSH-command exception needed by its
existing administrator-controlled key configuration. Protocol/trailer guards
remain enabled. `verify-git-storage.cjs` exercises the actual Wiki adapter with
local HTTP Basic and SSH transport fixtures: initialization, raw configuration,
key command construction, remote setup, pull/rebase/diff and push/force modes.
Trailer-command and unsafe-protocol configuration are rejected. The SSH fixture
replaces the transport command with a temporary local Git server; it never uses
real keys or a remote host. Run with no external network. Its HTTP fixture needs
Alpine git-daemon's git-http-backend in the test image.

Scoped SAML uses idpCert rather than cert and a separate logout verifier. The
adapter preserves existing Wiki configuration field names, mappings and local
authentication. Signed-assertion-only responses remain supported as in 3.x;
valid signature verification remains mandatory. Audience validation remains
controlled by the existing audience field, matching 3.x behavior. If supplied,
idpIssuer additionally checks the authenticated issuer. Logout only acknowledges
the matching provider/current user; it does not create a new user. Existing
inactive providers stay inactive; no production IdP settings are modified.

`verify-saml.cjs` generates an ephemeral certificate and signed SAML messages,
then runs the actual adapter: sign-on, profile/group mapping, signed assertion
compatibility and sign-out. Tampered/unsigned messages, incorrect configured
issuer/audience and a mismatched logout user are rejected. It requires openssl
only in the isolated test image. Fixtures never contain real IdP keys.

`verify-native.Dockerfile` compiles the vendor sqlite3 source against the exact
Node 24 headers and patched tar extraction, then performs SQLite read/write.
The vendor's old node-gyp needs Python setuptools in the test toolchain. Compiler
packages and rebuilt test binaries do not enter the deployed application.

Run `verify-compatible.cjs` without external network for pinned path versions,
multipart crypto/API, underscore, Babel/GraphQL, native loads and Git guards.
Also restore the isolated database and repeat login/content/permissions and
first-party security regressions before production rollout. Clones must have
no outbound access and must retain only synthetic signing keys/credentials.

The installed production dependency graph audit is **not clean**: 163 distinct
package/advisory pairs remain (0 critical, 66 high, 75 moderate, 22 low;
2026-10-24 snapshot). This follow-up removes 32 pairs from the previously accepted
195-pair graph, introduces zero pairs, and removes all three critical findings.
Remaining legacy high/moderate/low dependencies need focused follow-up rather
than blind force upgrades. Counts include installed dormant providers and are
not proof of publicly reachable exploits.
