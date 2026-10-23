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

The installed production dependency graph audit is **not clean**: 90 distinct
package/advisory pairs remain (0 critical, 28 high, 52 moderate, 10 low;
2026-10-24 snapshot). This active-path follow-up removes 73 pairs from the prior
163-pair graph, including 38 high findings, and introduces zero advisory pairs.

## Active HTTP, authentication and rendering follow-up

The recipe now guards 33 paths. Maintained-series updates include Express4.22.3,
body-parser1.20.9, compression1.8.2, Apollo Server/Express2.26.2, DOMPurify3.4.17,
lodash4.18.1, YAML3.15.2, JSON5 2.2.3, Luxon1.28.1, nanoid3.3.20, ws7.5.13,
immutable3.8.4, tar-fs2.1.5, cache semantics4.3.0, node-fetch2.7.0,
mysql2 3.24.6 and node-uuid1.4.8. Existing WebSocket5 paths are preserved.
Multer2.5.0 retains the application's disk destination and `.array` upload API;
real authenticated PNG upload/storage and malformed multipart tests pass.

The helper Apollo packages share the vendor GraphQL15.3.0 instance to preserve
schema identity; Express's dynamically loaded Pug engine resolves to the same
vendor Pug implementation. This does not change application engines, secrets
or configuration. Normal forms/JSON, parameter/depth rejection, compression,
login/content/authorization, root-account protections and native checks pass.
Playground remains available with its fixed1.7.42 client; its actual HTTP HTML
is checked rather than inferring browser security from server package versions.

DOMPurify3.3.1 was embedded in the shipped webpack vendor artifact. The recipe
parses and guards its exact original SHA256/module ID, replaces the single
self-contained factory with the official3.4.17 CommonJS distribution, parses
the resulting JavaScript and updates entry-template/runtime cache keys using
the new artifact hash. The vendor module ID and other modules remain intact.
`verify-browser.cjs` executes the actual resulting factory against DOM fixtures,
checks detached-parent/sibling hooks, normal HTML and XSS removal, verifies the
actual HTTP-delivered vendor hash and entry/chunk cache keys. Vulnerable lodash
template/full-library modules are absent from the inspected browser bundle.

## Remaining high migration boundaries

The audit still counts dormant provider packages. No provider was removed or
activated to improve these counts. Production has only local authentication,
no storage provider and no SMTP host. Markdown rendering is enabled with
linkification; typography is currently disabled.

- Knex0.21 is active in database/session code. Objection2.2.18 explicitly peers
  on Knex<0.95; a clean install with patchedKnex2.4.0 fails ERESOLVE. This requires
  an ORM/session migration, not a same-series replacement. PostgreSQL and all
  existing application schema/data stay unchanged here.
- GraphQL Tools utility7/8/9 releases have no same-series patch. Patched12.0.1
  no longer exports SchemaDirectiveVisitor, which Wiki's authorization directive
  extends; latest13 additionally requires GraphQL16+ while Wiki uses15.3.0.
  Migration must preserve the directive authorization model and subscriptions.
- Markdown11 and linkify3 are compiled into editor/footer browser modules as
  well as server renderers/comments. Fix boundaries are Markdown14.3.2+ and
  linkify5.0.2+. A coordinated renderer/plugin and browser module rebuild is
  required; changing a server package alone leaves the client artifact affected.
  This is a remaining migration task, not a claim that current majors were
  tested and proved impossible. Smartquotes' typography precondition is absent
  from the current server config; linkification remains enabled.
- Cheerio's css-what4 needs5.0.1+ in its css-select3 parser stack. Call sites
  inspected use application-defined selectors, not a public arbitrary-selector
  endpoint. Changing parser/token contracts needs a coordinated selector-stack
  migration. Installed findings remain counted.
- Optional legacy Azure HTTP/auth, SSH proxy, mail and unused file inspection
  APIs retain old axios0.21/ip-address5/nodemailer6/file-type15/
  image-size0.9. Their patch boundaries span dependency/API majors. Dicer and
  node-forge currently have no patched published release for their findings.
  These installed packages remain documented even when their provider is off.
- The residual Apollo standalone-server advisory is counted by version range;
  Wiki invokes the Express integration and does not export/use the affected
  startStandaloneServer API. Its Playground XSS finding is patched and tested.

Full per-advisory path classification and official fixed-version evidence are
retained in the session's private operational report. Remaining high/moderate/
low findings require follow-up; the image is not an audit-clean application.

Legacy Apollo-fetch now resolves patched node-fetch2.7.0 for its previous1.7.3 copy. The actual client query/variables/response contract and cross-origin credential stripping are tested against disposable local servers. Localization/update/telemetry behavior is preserved; no real outbound job is triggered during clone tests.
