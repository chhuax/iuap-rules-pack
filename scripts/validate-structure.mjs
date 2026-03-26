import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const requiredPaths = [
  "common",
  "common/rules",
  "common/skills",
  "common/hooks",
  "stacks",
  "stacks/java",
  "stacks/java/rules",
  "stacks/java/skills",
  "stacks/java/hooks",
  "stacks/golang",
  "stacks/golang/rules",
  "stacks/golang/skills",
  "stacks/golang/hooks",
  "scripts",
  "README.md",
  "package.json",
];

function requirePath(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required path: ${fullPath}`);
  }
}

function findFirstMatch(startPaths, predicate) {
  const queue = [...startPaths];

  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (!fs.existsSync(currentPath)) {
      continue;
    }

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (predicate(fullPath, entry.name)) {
        return fullPath;
      }
    }
  }

  return null;
}

for (const relativePath of requiredPaths) {
  requirePath(relativePath);
}

const skillMatch = findFirstMatch(
  [path.join(repoRoot, "common", "skills"), path.join(repoRoot, "stacks")],
  (_fullPath, name) => name === "SKILL.md"
);
if (!skillMatch) {
  throw new Error("At least one skill is required under common/skills or stacks/*/skills/");
}

const ruleMatch = findFirstMatch(
  [path.join(repoRoot, "common", "rules"), path.join(repoRoot, "stacks")],
  (_fullPath, name) => name.endsWith(".md")
);
if (!ruleMatch) {
  throw new Error("At least one markdown rule is required under common/rules or stacks/*/rules/");
}

const stackRoot = path.join(repoRoot, "stacks");
const stackDirs = fs
  .readdirSync(stackRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory());
if (stackDirs.length === 0) {
  throw new Error("At least one stack directory is required under stacks/");
}

console.log("iuap-rules-pack validation passed.");
