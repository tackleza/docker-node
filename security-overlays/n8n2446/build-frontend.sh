#!/bin/sh
set -eu
frontend_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
frontend_image=urgent-n8n-editor-builder:b58d9e89-markdown14.3.3
mkdir -p "$frontend_dir/frontend-artifacts"
docker build --pull=false --file "$frontend_dir/frontend-builder.Dockerfile" --tag "$frontend_image" "$frontend_dir"
docker run --rm --memory=6g --memory-swap=6g --cpus=2 --volume "$frontend_dir/frontend-artifacts:/out" "$frontend_image"
