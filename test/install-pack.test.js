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
  const opencodeHome = path.join(tempRoot, ".config", "opencode");
  const projectRoot = path.join(tempRoot, "project");

  fs.mkdirSync(projectRoot, { recursive: true });

  return { claudeHome, codexHome, opencodeHome, projectRoot, tempRoot };
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

function runNodeScript(scriptPath, options = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

function hasPlanEntryPath(entries, ...segments) {
  const suffix = path.join(...segments);
  return entries.some(entry => entry.path.endsWith(suffix));
}

test("installPack projects rules, skills, and Claude hooks", () => {
  const { claudeHome, codexHome, opencodeHome, projectRoot } = createInstallContext("iuap-rules-pack");

  const result = installPack({
    claudeHome,
    codexHome,
    opencodeHome,
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
  assert.ok(
    settings.hooks.PostToolUse.some(entry =>
      String(entry.description).includes("Route Java exception i18n handling")
    )
  );

  const installedScript = fs.readFileSync(
    path.join(claudeHome, "iuap-rules-pack", "hooks", "protect-config-files.mjs"),
    "utf8"
  );
  assert.match(installedScript, /IUAP_RULES_PACKAGE/);
});

test("installPack updates Claude assets when selected stacks change", () => {
  const { claudeHome, codexHome, opencodeHome, projectRoot } = createInstallContext("iuap-rules-pack-update");

  installPack({
    claudeHome,
    codexHome,
    opencodeHome,
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
    opencodeHome,
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
  const { claudeHome, codexHome, opencodeHome, projectRoot } = createInstallContext("iuap-rules-pack-codex");

  installPack({
    claudeHome,
    codexHome,
    opencodeHome,
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
  assert.match(agents, /### Codex Hook Notes/);
  assert.match(agents, /When a Java edit introduces a Chinese exception literal/);
  assert.match(agents, /`yms-i18n <current-file>`/);
});

test("installPack projects OpenCode instructions, shared Claude skills, and global plugins", () => {
  const { claudeHome, codexHome, opencodeHome, projectRoot } = createInstallContext(
    "iuap-rules-pack-opencode"
  );

  installPack({
    claudeHome,
    codexHome,
    opencodeHome,
    dryRun: false,
    packageVersion: "0.2.0-test",
    projectRoot,
    repoRoot,
    selectedStacks: ["java"],
    selectedTargets: ["opencode"],
  });

  const instructions = fs.readFileSync(
    path.join(projectRoot, ".opencode", "instructions", "iuap-rules-pack.md"),
    "utf8"
  );
  assert.match(instructions, /# IUAP Enterprise Rules/);
  assert.match(instructions, /## java-code-review\.md/);
  assert.match(instructions, /## Triggered Workflows/);
  assert.match(instructions, /When a Java edit introduces a Chinese exception literal/);
  assert.match(instructions, /`yms-i18n <current-file>`/);

  const sharedSkill = fs.readFileSync(
    path.join(claudeHome, "skills", "yms-i18n", "SKILL.md"),
    "utf8"
  );
  assert.match(sharedSkill, /Java 异常信息多语言处理/);
  assert.match(sharedSkill, /IUAP_RULES_PACKAGE/);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".opencode", "commands", "yms-i18n.md")),
    false
  );

  const config = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".opencode", "opencode.json"), "utf8")
  );
  assert.deepEqual(config.instructions, ["instructions/iuap-rules-pack.md"]);
  assert.deepEqual(config.command, {});

  const globalPlugin = fs.readFileSync(
    path.join(opencodeHome, "plugins", "iuap-rules-pack.js"),
    "utf8"
  );
  assert.match(globalPlugin, /tool\.execute\.before/);
  assert.match(globalPlugin, /tool\.execute\.after/);
  assert.match(globalPlugin, /java-exception-i18n/);

  const globalHookScript = fs.readFileSync(
    path.join(opencodeHome, "iuap-rules-pack", "hooks", "java-exception-i18n.mjs"),
    "utf8"
  );
  assert.match(globalHookScript, /IUAP_RULES_PACKAGE/);
});

test("java exception i18n hook detects Chinese exception literals and routes to yms-i18n", () => {
  const tempRoot = makeTempDir("iuap-rules-pack-java-i18n-hook");
  const javaFile = path.join(tempRoot, "OrderService.java");
  const scriptPath = path.join(
    repoRoot,
    "stacks",
    "java",
    "hooks",
    "scripts",
    "java-exception-i18n.mjs"
  );

  fs.writeFileSync(
    javaFile,
    [
      "public class OrderService {",
      "  void run() {",
      '    throw new RuntimeException("参数不能为空");',
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );

  const payload = JSON.stringify({
    tool_input: {
      file_path: javaFile,
    },
  });

  const result = runNodeScript(scriptPath, {
    input: payload,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, payload);
  assert.match(result.stderr, /yms-i18n/);
  assert.match(result.stderr, /OrderService\.java/);
});

test("CLI install projects all supported targets with stack selection", () => {
  const { claudeHome, codexHome, opencodeHome, projectRoot } = createInstallContext("iuap-rules-pack-cli");

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
    "--opencode-home",
    opencodeHome,
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
    false
  );
  assert.equal(
    fs.existsSync(path.join(claudeHome, "skills", "golang-service-review", "SKILL.md")),
    true
  );
  assert.equal(
    fs.existsSync(path.join(opencodeHome, "plugins", "iuap-rules-pack.js")),
    true
  );
});
