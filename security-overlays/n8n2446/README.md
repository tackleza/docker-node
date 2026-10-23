# n8n 2.44.6 / PostgreSQL 18.6 security release

This maintenance recipe keeps n8n on stable 2.44.6, replaces the official
image's Node 26 Current runtime with patched Node 24.22.1 LTS, and applies
reviewed same-major runtime dependency fixes. It does not publish shared tags.

The vendor requires Node >=24. Node 22 is therefore no longer a valid runtime
for this app version. Two V8 native bindings need attention when selecting LTS:

- Exact isolated-vm 7.0.1 vendor source is rebuilt against pinned Node 24.
- Exact Confluent Kafka 1.9.1 official Node ABI137/Linux-musl prebuilt is used,
  with its GitHub-published SHA256 verified. The vendor's Kafka patch changes
  only the installer script; the application JS remains the vendor's code.

SQLite/Oracle native loading, a real isolated Code workflow, credential
decryption and database migration were tested on a private restored database.
The test network has no outbound route or published ports; all copied workflows
and webhook/pending execution triggers are disabled before app startup.

`security-dependencies/package-lock.json` pins the isolated override tree.
`relink-security.cjs` replaces only reviewed same-major package instances and
records original/target versions inside the image. `compat-smoke.cjs` checks
mail streaming, multipart parsing, redirects, HTML/templates, date/query/IP
helpers and an in-memory MCP tool roundtrip. No live notification is sent.

## Build and install

Install this directory as `security-n8n2446/` beside the existing private
n8n start/update scripts. Write the exact reviewed Git commit SHA to
`source-revision.txt` after checking out that commit; the marker is generated
release metadata, not a secret. Run `sh build-image.sh` before a cutover.
The image is uniquely tagged with the source SHA and labelled with exact source,
Node and app versions. Keep the existing private environment/config outside Git.

The existing start script must select that exact image. Replace only its
n8n image reference; retain every connection/key/retention/timezone setting,
network, mount, restart policy and published port. In the existing update script,
replace the floating n8n pull command with the build helper, retaining the
original stop/start ordering. Pin PostgreSQL in both scripts to:

```
postgres@sha256:898c60cb390d1085bc97bdd6a1ae968757421df394b071848b52b1c09c89d6a5
```

That image was measured as PostgreSQL 18.6. Keep the existing major18 PGDATA
mount at `/var/lib/postgresql`; changing only a tag must not move data storage.

## Rollout and rollback

1. Save exact prior Docker configuration privately and verify dependencies.
2. Back up database/globals/config and test restore on isolated PG18.6.
3. Stop n8n before a consistent cold PGDATA backup and the same-major PG update;
   verify record counts, PG version and existing n8n readiness before proceeding.
4. Before the app migration, stop n8n and take a fresh consistent database/config
   backup. Retain the stopped original app container and its image.
5. Update only the selected app image. Preserve custom environment/labels;
   refresh only image-provided runtime defaults and provenance from the new image.
6. Verify actual app/Node/PG versions, migrated counts/credentials, readiness,
   public HTTPS and bounded logs. A running container alone is insufficient.

**App schema migrations are not image-reversible.** A failed app upgrade needs
an inspected restore of the pre-app database plus previous app/config. Stop all
writers, preserve failed state, recreate/restore the scoped database, then start
the prior app; do not run old code against the migrated schema or overwrite
newer production writes automatically. Same-major PG rollback images and cold
backups remain available separately.

## Remaining dependency work

The stable app fixes its known first-party advisories, and the compatible
runtime fixes reduce dependency findings substantially. This is not a claim
that every vendor dependency is clean. Git/argv-parser, TOML, Nodemailer and
Markdown still require separate dependency-major compatibility work; Showdown
has no newer upstream release fixing its reported issue. Precompiled editor
assets require an editor rebuild/backport rather than a misleading runtime-only
package replacement. Keep exact fresh findings in the operator release journal.

Official sources:
- https://github.com/n8n-io/n8n/releases/tag/n8n%402.44.6
- https://docs.n8n.io/hosting/installation/updating/
- https://www.postgresql.org/docs/release/18.6/
- https://www.postgresql.org/support/security/CVE-2026-16239/
