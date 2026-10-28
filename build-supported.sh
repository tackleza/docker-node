#!/bin/sh
# Build every supported image, verify all of them, then optionally publish.
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
publish=false
if [ "${1:-}" = "--push" ]; then
    publish=true
    shift
fi
if [ "$#" -eq 0 ]; then
    set -- 22-alpine 24-alpine latest
fi
# Validate the complete request before building anything.
for tag do
    case "$tag" in
        22-alpine|24-alpine|latest) ;;
        *) echo "Unsupported image variant: $tag" >&2; exit 2 ;;
    esac
done
for tag do
    docker build --pull -t "tackleza/node:$tag" "$SCRIPT_DIR/$tag"
    # The Dockerfile enforces the patched minimum; smoke-test the resulting runtime.
    docker run --rm "tackleza/node:$tag" node --version
    docker run --rm "tackleza/node:$tag" pnpm --version
done
if [ "$publish" = true ]; then
    for tag do
        docker push "tackleza/node:$tag"
    done
fi
