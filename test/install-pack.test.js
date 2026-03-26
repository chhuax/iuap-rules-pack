import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { installPack } from "../src/lib/install-pack.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
}

test("installPack projects rules, skills, and Claude hooks", () => {
  const tempRoot = makeTempDir("iuap-rules-pack");
  const claudeHome = path.join(tempRoot, ".claude");
  const codexHome = path.join(tempRoot, ".codex");
  const projectRoot = path.join(tempRoot, "project");

  fs.mkdirSync(projectRoot, { recursive: true });

  const result = installPack({
    claudeHome,
    codexHome,
    dryRun: false,
    packageVersion: "0.2.0-test",
    projectRoot,
    repoRoot,
    selectedStacks: ["java"],
    selectedTargets: ["claude"],
  });

  assert.ok(result.plan.entries.some(entry => entry.path.endsWith("rules/core.md")));
  assert.ok(
    result.plan.entries.some(entry =>
      entry.path.endsWith("commands/java-code-review.md")
    )
  );
  assert.ok(
    result.plan.entries.some(entry =>
      entry.path.endsWith("iuap-rules-pack/hooks/protect-config-files.mjs")
    )
  );

  const settings = JSON.parse(
    fs.readFileSync(path.join(claudeHome, "settings.json"), "utf8")
  );
  assert.ok(Array.isArray(settings.hooks.PreToolUse));
  assert.ok(Array.isArray(settings.hooks.PostToolUse));
  assert.ok(
    settings.hooks.PreToolUse.some(entry =>
      String(entry.description).includes("Protect enterprise config files")
    )
  );
  assert.ok(
    settings.hooks.PostToolUse.some(entry =>
      String(entry.description).includes("Run lightweight Java delivery checks")
    )
  );

  const installedScript = fs.readFileSync(
    path.join(claudeHome, "iuap-rules-pack", "hooks", "protect-config-files.mjs"),
    "utf8"
  );
  assert.match(installedScript, /IUAP_RULES_PACKAGE/);
});

test("installPack updates Claude assets when selected stacks change", () => {
  const tempRoot = makeTempDir("iuap-rules-pack-update");
  const claudeHome = path.join(tempRoot, ".claude");
  const codexHome = path.join(tempRoot, ".codex");
  const projectRoot = path.join(tempRoot, "project");

  fs.mkdirSync(projectRoot, { recursive: true });

  installPack({
    claudeHome,
    codexHome,
    dryRun: false,
    packageVersion: "0.2.0-test",
    projectRoot,
    repoRoot,
    selectedStacks: ["java"],
    selectedTargets: ["claude"],
  });

  installPack({
    claudeHome,
    codexHome,
    dryRun: false,
    packageVersion: "0.2.0-test",
    projectRoot,
    repoRoot,
    selectedStacks: ["golang"],
    selectedTargets: ["claude"],
  });

  assert.equal(
    fs.existsSync(path.join(claudeHome, "rules", "java-code-review.md")),
    false
  );
  assert.equal(
    fs.existsSync(path.join(claudeHome, "rules", "golang-service-review.md")),
    true
  );

  const settings = JSON.parse(
    fs.readFileSync(path.join(claudeHome, "settings.json"), "utf8")
  );
  assert.ok(
    settings.hooks.PostToolUse.every(
      entry => !String(entry.description).includes("Java delivery checks")
    )
  );
  assert.ok(
    settings.hooks.PostToolUse.some(entry =>
      String(entry.description).includes("Golang delivery checks")
    )
  );
});
