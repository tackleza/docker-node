#!/bin/sh
set -eu
n8n_build_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
n8n_revision=$(cat "$n8n_build_dir/source-revision.txt")
case "$n8n_revision" in ''|*[!0-9a-f]*) echo 'Invalid source revision marker' >&2; exit 1;; esac
n8n_short=$(printf '%.7s' "$n8n_revision")
sh "$n8n_build_dir/build-frontend.sh"
docker build --pull=false --build-arg "N8N_SECURITY_REVISION=$n8n_revision" --tag "urgent-n8n:2.44.6-node24.22.1-security-$n8n_short" "$n8n_build_dir"
