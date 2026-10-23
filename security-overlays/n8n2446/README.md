# n8n 2.44.6 / PostgreSQL 18.6 security release

This maintenance recipe keeps n8n on stable 2.44.6, replaces the official
image's Node 26 Current runtime with patched Node 24.22.1 LTS, and applies
reviewed runtime dependency fixes, including explicitly tested major transitions. It does not publish shared tags.

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
`relink-security.cjs` replaces pinned package instances and records original/target
versions inside the image. Major transitions are rejected unless their original
major and exact target appear in `reviewed-major-transitions.json`. `compat-smoke.cjs` checks
mail streaming, multipart parsing, redirects, HTML/templates, date/query/IP
helpers and an in-memory MCP tool roundtrip. No live notification is sent.

## Reviewed dependency major transitions

- `simple-git` 3 → 4.0.2 removes the critical argv/trailer issues. Version4
  changes its CommonJS factory export and guards explicitly supplied Git
  environment variables. `patch-compatibility.cjs` verifies both original n8n
  consumer files by SHA256, adapts the Git node factory, and allows only the
  exact environment keys already set by each consumer. Existing authentication,
  path, protocol and config restrictions remain in place.
- Nodemailer8 → 10.2.1 is checked through a UTF8/multipart/attachment MIME
  roundtrip using n8n's actual mailparser. No email is sent.
- TOML3 → 5.0.1 is checked through Snowflake SDK's actual connection-file
  loader and normalizer, including null-prototype parsing and duplicate-key
  rejection. Synthetic configuration contains no real account or key.

`major-compat-smoke.cjs` invokes n8n's actual Git node against local repositories:
status, add, commit, log, branch, tag, reflog, configuration, clone and pull.
It verifies blocked paths/config/source arguments and the default refusal to
push to a file remote. The simple-git4 local bare-repository push API and
Promotions token/SSH setup are tested separately with synthetic credentials.
LangChain MongoDB/Redis same-major fixes use mock collections/search clients to
check session equality filters, query-injection rejection and filter escaping.
LangChain MongoDB1.3.1 adds optional driver metadata; its new metadata call is
SHA-guarded and made optional for n8n's existing MongoDB6.11 collections. Both
vendor driver constructors are tested without connecting to a database.
These tests run without any real remote repository, database or mail service.

## Editor Markdown rebuild

The editor uses typography in its Markdown component. The release source also
has a second Markdown13 dependency through `vue-markdown-render`. This recipe
pins Markdown14.3.3 in both the catalog and the transitive override.

`frontend-builder.Dockerfile` downloads n8n2.44.6 source commit
`b58d9e89d60e9a3485bb511c5091d8be0d9511e4` from the official repository and
checks the archive SHA256 before it applies `frontend-source.patch`.
`build-frontend.sh` uses a separate Node24.22.1/pnpm12.4.2 container. It limits
the build to6GB RAM and2CPU. Package builds and tests use one worker.

The build retains the release public path and CSP nonce settings. It rebuilds
the full editor, design-system and MCP preview assets. A Vite hook rejects any
bundled Markdown input outside14.3.3. The final image removes the previous
asset directories before copying the new outputs. It checks every installed
asset against the recorded hashes. No minified file is patched in place.

Renderer checks cover the existing Markdown/YouTube cases, chat plugins and
the Vue wrapper. They also render384KB mixed-quote text with typography enabled.
`browser-check.cjs` checks an isolated synthetic n8n instance in Chromium. It
opens a workflow with that large sticky note, checks browser errors and compares
the fetched Markdown chunk with the build manifest. The fixture has no real
credentials or workflow data. Run it only against the named isolated fixture.

## Build and install

Install this directory as `security-n8n2446/` beside the existing private
n8n start/update scripts. Write the exact reviewed Git commit SHA to
`source-revision.txt` after checking out that commit; the marker is generated
release metadata, not a secret. Run `sh build-image.sh` before a cutover. This first rebuilds and checks the
frontend in its bounded build container, then builds the maintained app image.
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

The stable app and the tested Git, TOML, mail and Markdown changes clear their
current findings. The installed graph still has7moderate package/advisory pairs.
Element Plus link handling still needs a reviewed UI update. Showdown has no
new fixed upstream release. stream-json3 removes `stream-json/Assembler`, which
n8n uses to parse execution data. It needs a reviewed core parser rewrite or a
compatible backport. Keep fresh exact findings in the release journal.

Official sources:
- https://github.com/n8n-io/n8n/releases/tag/n8n%402.44.6
- https://docs.n8n.io/hosting/installation/updating/
- https://www.postgresql.org/docs/release/18.6/
- https://www.postgresql.org/support/security/CVE-2026-16239/
- https://github.com/advisories/GHSA-r7fv-28h4-cvq7
