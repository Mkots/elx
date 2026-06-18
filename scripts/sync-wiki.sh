#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <docs-dir> <wiki-dir>" >&2
  exit 1
fi

docs_dir=$1
wiki_dir=$2

if [[ ! -d "$docs_dir" ]]; then
  echo "docs directory not found: $docs_dir" >&2
  exit 1
fi

if [[ ! -d "$wiki_dir/.git" ]]; then
  echo "wiki directory is not a git checkout: $wiki_dir" >&2
  exit 1
fi

build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT

deno run -A scripts/build_wiki.ts "$docs_dir" "$build_dir"

rsync -a --delete \
  --exclude '.git/' \
  --exclude '.github/' \
  "$build_dir"/ "$wiki_dir"/
