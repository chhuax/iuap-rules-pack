import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { installPack } from "../src/lib/install-pack.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const cliPath = path.join(repoRoot, "bin", "iuap-rules-pack.js");

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
}

function createInstallContext(label) {
  const tempRoot = makeTempDir(label);
  const claudeHome = path.join(tempRoot, ".claude");
  const codexHome = path.join(tempRoot, ".codex");
  const projectRoot = path.join(tempRoot, "project");

  fs.mkdirSync(projectRoot, { recursive: true });

  return { claudeHome, codexHome, projectRoot, tempRoot };
}

function runCli(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });

  assert.equal(
    result.status,
    0,
    `CLI exited with ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
  );

  return result;
}

function hasPlanEntryPath(entries, ...segments) {
  const suffix = path.join(...segments);
  return entries.some(entry => entry.path.endsWith(suffix));
}

test("installPack projects rules, skills, and Claude hooks", () => {
  const { claudeHome, codexHome, projectRoot } = createInstallContext("iuap-rules-pack");

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

  assert.ok(hasPlanEntryPath(result.plan.entries, "rules", "core.md"));
  assert.ok(hasPlanEntryPath(result.plan.entries, "commands", "java-code-review.md"));
  assert.ok(
    hasPlanEntryPath(
      result.plan.entries,
      "iuap-rules-pack",
      "hooks",
      "protect-config-files.mjs"
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
  const { claudeHome, codexHome, projectRoot } = createInstallContext("iuap-rules-pack-update");

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

test("installPack projects Codex rules and skills into managed locations", () => {
  const { claudeHome, codexHome, projectRoot } = createInstallContext("iuap-rules-pack-codex");

  installPack({
    claudeHome,
    codexHome,
    dryRun: false,
    packageVersion: "0.2.0-test",
    projectRoot,
    repoRoot,
    selectedStacks: ["java"],
    selectedTargets: ["codex"],
  });

  const codexSkill = fs.readFileSync(
    path.join(codexHome, "skills", "java-code-review", "SKILL.md"),
    "utf8"
  );
  assert.match(codexSkill, /IUAP_RULES_PACKAGE/);
  assert.match(codexSkill, /# java-code-review/);

  const agents = fs.readFileSync(path.join(projectRoot, "AGENTS.md"), "utf8");
  assert.match(agents, /IUAP_RULES_PACK_START/);
  assert.match(agents, /#### java-code-review\.md/);
  assert.match(agents, /- `java-code-review`/);
});

test("installPack projects OpenCode instructions and commands into project config", () => {
  const { claudeHome, codexHome, projectRoot } = createInstallContext(
    "iuap-rules-pack-opencode"
  );

  installPack({
    claudeHome,
    codexHome,
    dryRun: false,
    packageVersion: "0.2.0-test",
    projectRoot,
    repoRoot,
    selectedStacks: ["golang"],
    selectedTargets: ["opencode"],
  });

  const instructions = fs.readFileSync(
    path.join(projectRoot, ".opencode", "instructions", "iuap-rules-pack.md"),
    "utf8"
  );
  assert.match(instructions, /# IUAP Enterprise Rules/);
  assert.match(instructions, /## golang-service-review\.md/);

  const command = fs.readFileSync(
    path.join(projectRoot, ".opencode", "commands", "golang-service-review.md"),
    "utf8"
  );
  assert.match(command, /description: golang-service-review/);
  assert.match(command, /IUAP_RULES_PACKAGE/);

  const config = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".opencode", "opencode.json"), "utf8")
  );
  assert.deepEqual(config.instructions, ["instructions/iuap-rules-pack.md"]);
  assert.equal(
    config.command["golang-service-review"]?.template,
    "{file:commands/golang-service-review.md}\n\n$ARGUMENTS"
  );
});

test("CLI install projects all supported targets with stack selection", () => {
  const { claudeHome, codexHome, projectRoot } = createInstallContext("iuap-rules-pack-cli");

  const result = runCli([
    "install",
    "--stack",
    "java,golang",
    "--target",
    "claude,codex,opencode",
    "--project-root",
    projectRoot,
    "--claude-home",
    claudeHome,
    "--codex-home",
    codexHome,
  ]);

  assert.match(result.stdout, /Installed iuap-rules-pack/);
  assert.equal(
    fs.existsSync(path.join(claudeHome, "rules", "golang-service-review.md")),
    true
  );
  assert.equal(
    fs.existsSync(path.join(codexHome, "skills", "java-code-review", "SKILL.md")),
    true
  );
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, ".opencode", "commands", "golang-service-review.md")
    ),
    true
  );
});
