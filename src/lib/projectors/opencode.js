import fs from "node:fs";
import path from "node:path";

import {
  buildLineCommentMarker,
  buildMarkerLine,
  hasManagedFileMarker,
} from "../markers.js";

function mkdirp(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { force: true, recursive: true });
}

function assertWritableFile(filePath, previousEntries) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  if (previousEntries.some(entry => entry.path === filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  if (hasManagedFileMarker(content)) {
    return;
  }

  throw new Error(`Refusing to overwrite unmanaged OpenCode file: ${filePath}`);
}

function assertWritableSkillFile(skillMdPath, previousEntries) {
  if (!fs.existsSync(skillMdPath)) {
    return;
  }

  if (previousEntries.some(entry => path.join(entry.path, "SKILL.md") === skillMdPath)) {
    return;
  }

  const content = fs.readFileSync(skillMdPath, "utf8");
  if (hasManagedFileMarker(content)) {
    return;
  }

  throw new Error(`Refusing to overwrite unmanaged shared skill: ${skillMdPath}`);
}

function parseSkillDescription(content, fallback) {
  const lines = content.split("\n").map(line => line.trim()).filter(Boolean);
  const heading = lines.find(line => line.startsWith("# "));
  return heading ? heading.slice(2) : fallback;
}

function renderOpenCodeCommand({ asset, version }) {
  const description = parseSkillDescription(asset.content, asset.skillName);
  const marker = buildMarkerLine({
    source: asset.sourceRel,
    target: "opencode",
    version,
  });

  return `---
description: ${description}
---

${marker}

${asset.content}`;
}

function renderManagedScript({ hook, version }) {
  const marker = buildLineCommentMarker({
    source: hook.scriptRel,
    target: "opencode",
    version,
  });
  return `${marker}\n${hook.scriptContent || ""}`;
}

function renderSharedSkill({ asset, version }) {
  const marker = buildMarkerLine({
    source: asset.sourceRel,
    target: "opencode",
    version,
  });

  return `${marker}\n\n${asset.content}`;
}

function collectHookTargets(hooks, targetName) {
  return hooks
    .map(hook => ({
      hook,
      target: hook.definition?.targets?.[targetName],
    }))
    .filter(item => item.target);
}

function compileInstructions({ assets, version }) {
  const lines = [
    "# IUAP Enterprise Rules",
    "",
    `Package version: ${version}`,
    "",
  ];

  for (const asset of assets.rules) {
    lines.push(`## ${asset.fileName}`);
    lines.push("");
    lines.push(asset.content.trim());
    lines.push("");
  }

  const opencodeHooks = collectHookTargets(assets.hooks, "opencode");
  if (opencodeHooks.length > 0) {
    lines.push("## Triggered Workflows");
    lines.push("");
    for (const { target } of opencodeHooks) {
      lines.push(`- ${target.trigger} ${target.action}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function loadJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function createBaseConfig() {
  return {
    $schema: "https://opencode.ai/config.json",
    instructions: [],
    plugin: [],
    command: {},
  };
}

function canonicalToolName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function inferToolMatcher(matcher = "*") {
  if (matcher === "*" || matcher.trim().length === 0) {
    return null;
  }

  return matcher
    .split("|")
    .map(item => canonicalToolName(item))
    .filter(Boolean);
}

function renderPlugin({ hooks, version }) {
  const marker = buildLineCommentMarker({
    source: "generated:opencode-plugin",
    target: "opencode",
    version,
  });

  const records = hooks.map(({ fileName, scriptPath, target }) => ({
    event: target.event,
    matcher: target.matcher || "*",
    scriptPath,
    id: fileName.replace(/\.json$/, ""),
  }));

  return `${marker}
import { spawn } from "bun";

const HOOKS = ${JSON.stringify(records, null, 2)};

function canonicalToolName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toSnakeCaseKey(value) {
  return value.replace(/[A-Z]/g, match => \`_\${match.toLowerCase()}\`);
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [toSnakeCaseKey(key), normalizeValue(entryValue)])
  );
}

function matchesTool(hook, toolName) {
  if (!hook.matcher || hook.matcher === "*") {
    return true;
  }

  const allowed = hook.matcher
    .split("|")
    .map(item => canonicalToolName(item))
    .filter(Boolean);
  return allowed.includes(canonicalToolName(toolName));
}

function buildPayload(input, output) {
  return JSON.stringify({
    tool_name: input?.tool || "",
    tool_input: normalizeValue(output?.args || input?.args || {}),
  });
}

async function runHook(hook, input, output) {
  const payload = buildPayload(input, output);
  const proc = spawn(["node", hook.scriptPath], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const writer = proc.stdin.getWriter();
  await writer.write(new TextEncoder().encode(payload));
  await writer.close();

  const [stderrText, exitCode] = await Promise.all([
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (stderrText.trim().length > 0) {
    console.error(stderrText.trim());
  }

  if (exitCode !== 0) {
    throw new Error(stderrText.trim() || \`IUAP hook \${hook.id} failed with exit code \${exitCode}\`);
  }
}

export const IuapRulesPackPlugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      for (const hook of HOOKS) {
        if (hook.event !== "PreToolUse") continue;
        if (!matchesTool(hook, input?.tool)) continue;
        await runHook(hook, input, output);
      }
    },
    "tool.execute.after": async (input, output) => {
      for (const hook of HOOKS) {
        if (hook.event !== "PostToolUse") continue;
        if (!matchesTool(hook, input?.tool)) continue;
        await runHook(hook, input, output);
      }
    },
  };
};
`;
}

export function projectOpenCode({
  assets,
  claudeHome,
  dryRun,
  opencodeHome,
  previousEntries,
  projectRoot,
  version,
}) {
  const opencodeRoot = path.join(projectRoot, ".opencode");
  const instructionsDir = path.join(opencodeRoot, "instructions");
  const configPath = path.join(opencodeRoot, "opencode.json");
  const sharedSkillsDir = path.join(claudeHome, "skills");
  const globalPluginsDir = path.join(opencodeHome, "plugins");
  const globalHooksDir = path.join(opencodeHome, "iuap-rules-pack", "hooks");
  const instructionsRel = "instructions/iuap-rules-pack.md";
  const entries = [];
  const notes = [];

  if (!dryRun) {
    mkdirp(opencodeRoot);
    mkdirp(instructionsDir);
    mkdirp(sharedSkillsDir);
    mkdirp(globalPluginsDir);
    mkdirp(globalHooksDir);

    for (const entry of previousEntries.filter(item => item.mode === "path")) {
      removePath(entry.path);
    }
  }

  const instructionsPath = path.join(instructionsDir, "iuap-rules-pack.md");
  entries.push({
    kind: "rules",
    mode: "path",
    path: instructionsPath,
    target: "opencode",
  });

  if (!dryRun) {
    assertWritableFile(instructionsPath, previousEntries);
    fs.writeFileSync(
      instructionsPath,
      compileInstructions({ assets, version }),
      "utf8"
    );
  }

  const commandEntries = {};
  for (const asset of assets.skills) {
    const skillDir = path.join(sharedSkillsDir, asset.skillName);
    const skillMdPath = path.join(skillDir, "SKILL.md");
    entries.push({
      kind: "skills",
      mode: "path",
      path: skillDir,
      target: "opencode",
    });

    if (!dryRun) {
      assertWritableSkillFile(skillMdPath, previousEntries);
      mkdirp(skillDir);
      fs.writeFileSync(skillMdPath, renderSharedSkill({ asset, version }), "utf8");
    }
  }

  if (collectHookTargets(assets.hooks, "opencode").length > 0) {
    const opencodeHooks = collectHookTargets(assets.hooks, "opencode").filter(
      ({ target }) => typeof target.event === "string"
    );
    const pluginPath = path.join(globalPluginsDir, "iuap-rules-pack.js");
    const renderedHooks = [];

    for (const { hook, target } of opencodeHooks) {
      if (!hook.scriptRel || !hook.scriptContent) {
        throw new Error(`OpenCode hook ${hook.sourceRel} must declare a script asset`);
      }

      const scriptPath = path.join(
        globalHooksDir,
        `${hook.fileName.replace(/\.json$/, "")}${path.extname(hook.scriptRel) || ".mjs"}`
      );
      entries.push({
        kind: "hooks",
        mode: "path",
        path: scriptPath,
        target: "opencode",
      });
      renderedHooks.push({ fileName: hook.fileName, scriptPath, target });

      if (!dryRun) {
        assertWritableFile(scriptPath, previousEntries);
        fs.writeFileSync(scriptPath, renderManagedScript({ hook, version }), "utf8");
      }
    }

    if (renderedHooks.length > 0) {
      entries.push({
        kind: "hooks",
        mode: "path",
        path: pluginPath,
        target: "opencode",
      });

      if (!dryRun) {
        assertWritableFile(pluginPath, previousEntries);
        fs.writeFileSync(pluginPath, renderPlugin({ hooks: renderedHooks, version }), "utf8");
      }
    }

    notes.push("OpenCode: global plugin hooks are installed under the user config directory.");
  }

  entries.push({
    kind: "config",
    managedCommandNames: Object.keys(commandEntries),
    mode: "json-merge",
    path: configPath,
    target: "opencode",
  });

  if (!dryRun) {
    const config = loadJsonFile(configPath, createBaseConfig());
    const instructions = Array.isArray(config.instructions) ? config.instructions : [];
    const retainedInstructions = instructions.filter(item => item !== instructionsRel);
    config.instructions = [...retainedInstructions, instructionsRel];

    const commandMap = config.command && typeof config.command === "object" ? config.command : {};
    const previousConfigEntry = previousEntries.find(entry => entry.kind === "config");
    for (const key of previousConfigEntry?.managedCommandNames || []) {
      delete commandMap[key];
    }

    Object.assign(commandMap, commandEntries);
    config.command = commandMap;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }

  return { entries, notes };
}
