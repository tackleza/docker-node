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

## Remaining vendor dependencies

This is an upstream application and runtime security patch, **not a clean
production dependency audit**. The installed production graph for this image
still has202 applicable package/advisory pairs:7critical,93high,80moderate,
22low (snapshot2026-10-24). These counts identify installed dependencies,
not proof of reachable exploits. Remaining critical packages include form-data,
underscore, tar, Babel traverse, passport-saml and simple-git. Assess focused
compatible fixes separately with provider and rendering regression checks;
do not use blind force-upgrades or change feature majors in production.
