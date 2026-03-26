#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

required_paths=(
  "$repo_root/common"
  "$repo_root/common/rules"
  "$repo_root/common/skills"
  "$repo_root/common/hooks"
  "$repo_root/stacks"
  "$repo_root/stacks/java"
  "$repo_root/stacks/java/rules"
  "$repo_root/stacks/java/skills"
  "$repo_root/stacks/java/hooks"
  "$repo_root/stacks/golang"
  "$repo_root/stacks/golang/rules"
  "$repo_root/stacks/golang/skills"
  "$repo_root/stacks/golang/hooks"
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

if ! find "$repo_root/common/skills" "$repo_root/stacks" -name SKILL.md -print -quit | grep -q .; then
  echo "At least one skill is required under common/skills or stacks/*/skills/" >&2
  exit 1
fi

if ! find "$repo_root/common/rules" "$repo_root/stacks" -name '*.md' -print -quit | grep -q .; then
  echo "At least one markdown rule is required under common/rules or stacks/*/rules/" >&2
  exit 1
fi

if ! find "$repo_root/stacks" -mindepth 1 -maxdepth 1 -type d -print -quit | grep -q .; then
  echo "At least one stack directory is required under stacks/" >&2
  exit 1
fi

if ! find "$repo_root/common/skills" "$repo_root/stacks" -name SKILL.md -print -quit | grep -q .; then
  echo "At least one skill directory is required under common/skills or stacks/*/skills/" >&2
  exit 1
fi

echo "iuap-rules-pack validation passed."
