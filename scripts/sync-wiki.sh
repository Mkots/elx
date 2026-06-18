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

rewrite_wiki_links() {
  local target_dir=$1

  # GitHub Wiki routes pages by filename without the .md suffix. Keeping .md in
  # relative links opens the raw file instead of the rendered wiki page.
  while IFS= read -r -d '' file; do
    perl -0pi -e 's{(?<!\!)\[([^\]]+)\]\((?!https?://|mailto:|#)([^)\s]+?)\.md(#[^)]+)?\)}{"[$1]($2" . (defined $3 ? $3 : q{}) . ")"}ge' "$file"
  done < <(find "$target_dir" -type f -name '*.md' -print0)
}

rsync -a --delete \
  --exclude '.git/' \
  --exclude '.github/' \
  "$docs_dir"/ "$wiki_dir"/

rewrite_wiki_links "$wiki_dir"
