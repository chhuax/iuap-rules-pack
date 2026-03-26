#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

required_paths=(
  "$repo_root/rules"
  "$repo_root/skills"
  "$repo_root/hooks"
  "$repo_root/README.md"
  "$repo_root/package.json"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "Missing required path: $path" >&2
    exit 1
  fi
done

if ! find "$repo_root/skills" -name SKILL.md -print -quit | grep -q .; then
  echo "At least one skill is required under skills/" >&2
  exit 1
fi

if ! find "$repo_root/rules" -name '*.md' -print -quit | grep -q .; then
  echo "At least one markdown rule is required under rules/" >&2
  exit 1
fi

echo "iuap-rules-pack validation passed."
