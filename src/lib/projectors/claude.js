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

function parseSkillDescription(content, fallback) {
  const lines = content.split("\n").map(line => line.trim()).filter(Boolean);
  const heading = lines.find(line => line.startsWith("# "));
  return heading ? heading.slice(2) : fallback;
}

function renderClaudeCommand({ asset, version }) {
  const description = parseSkillDescription(asset.content, asset.skillName);
  const marker = buildMarkerLine({
    source: asset.sourceRel,
    target: "claude",
    version,
  });

  return `---
description: ${description}
---

${marker}

${asset.content}`;
}

function loadJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

  throw new Error(`Refusing to overwrite unmanaged Claude file: ${filePath}`);
}

function buildHookEntries(hooks) {
  const entries = [];

  for (const hook of hooks) {
    if (!hook.definition?.targets?.claude) {
      continue;
    }

    entries.push(hook);
  }

  return entries;
}

function inferRuntime(scriptPath, runtime) {
  if (runtime) {
    return runtime;
  }

  const extension = path.extname(scriptPath);
  if (extension === ".mjs" || extension === ".js" || extension === ".cjs") {
    return "node";
  }

  if (extension === ".sh") {
    return "bash";
  }

  throw new Error(`Unsupported Claude hook script type: ${scriptPath}`);
}

function buildHookCommand(scriptPath, target = {}) {
  const resolvedRuntime = inferRuntime(scriptPath, target.runtime);
  const suffix = target.mode ? ` --mode ${JSON.stringify(target.mode)}` : "";
  if (resolvedRuntime === "node") {
    return `node "${scriptPath}"${suffix}`;
  }

  if (resolvedRuntime === "bash") {
    return `bash "${scriptPath}"`;
  }

  throw new Error(`Unsupported Claude hook runtime: ${resolvedRuntime}`);
}

function renderManagedScript({ hook, target, version }) {
  const marker = buildLineCommentMarker({
    source: hook.scriptRel,
    target: "claude",
    version,
  });
  const content = hook.scriptContent || "";
  if (content.startsWith("#!")) {
    const firstLineEnd = content.indexOf("\n");
    if (firstLineEnd === -1) {
      return `${content}\n${marker}\n`;
    }

    const shebang = content.slice(0, firstLineEnd + 1);
    const body = content.slice(firstLineEnd + 1);
    return `${shebang}${marker}\n${body}`;
  }

  return `${marker}\n${content}`;
}

function buildClaudeHookEntry({ hook, scriptPath }) {
  const target = hook.definition.targets.claude;
  if (!scriptPath) {
    throw new Error(`Claude hook ${hook.sourceRel} is missing a projected script path`);
  }

  const command = buildHookCommand(scriptPath, target);
  const hookCommand = {
    command,
    type: "command",
  };

  if (target.async === true) {
    hookCommand.async = true;
  }

  if (typeof target.timeout === "number") {
    hookCommand.timeout = target.timeout;
  }

  return {
    _iuap_id: hook.id,
    _iuap_package: "iuap-rules-pack",
    description: target.description,
    event: target.event,
    hooks: [hookCommand],
    matcher: target.matcher || "*",
  };
}

function pruneManagedHooks(hookMap) {
  const nextHookMap = {};

  for (const [eventName, entries] of Object.entries(hookMap)) {
    const retained = (Array.isArray(entries) ? entries : []).filter(
      entry => entry?._iuap_package !== "iuap-rules-pack"
    );

    if (retained.length > 0) {
      nextHookMap[eventName] = retained;
    }
  }

  return nextHookMap;
}

function assertWritableManagedScript(filePath, previousEntries) {
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

  throw new Error(`Refusing to overwrite unmanaged Claude hook script: ${filePath}`);
}

function installClaudeHookScripts({ claudeHome, dryRun, hooks, previousEntries, version }) {
  const hooksDir = path.join(claudeHome, "iuap-rules-pack", "hooks");
  const entries = [];
  const installedScripts = new Map();

  if (!dryRun) {
    mkdirp(hooksDir);
  }

  for (const hook of hooks) {
    const target = hook.definition.targets.claude;
    if (!target) {
      continue;
    }

    if (!hook.scriptRel || !hook.scriptContent) {
      throw new Error(`Claude hook ${hook.sourceRel} must declare a script asset`);
    }

    const extension = path.extname(hook.scriptRel) || ".mjs";
    const scriptPath = path.join(
      hooksDir,
      `${hook.fileName.replace(/\.json$/, "")}${extension}`
    );

    entries.push({
      kind: "hooks",
      mode: "path",
      path: scriptPath,
      target: "claude",
    });

    installedScripts.set(hook.id, scriptPath);

    if (!dryRun) {
      assertWritableManagedScript(scriptPath, previousEntries);
      fs.writeFileSync(
        scriptPath,
        renderManagedScript({ hook, target, version }),
        "utf8"
      );
    }
  }

  return { entries, installedScripts };
}

export function projectClaude({
  assets,
  claudeHome,
  dryRun,
  previousEntries,
  version,
}) {
  const rulesDir = path.join(claudeHome, "rules");
  const commandsDir = path.join(claudeHome, "commands");
  const settingsPath = path.join(claudeHome, "settings.json");
  const entries = [];
  const notes = [];

  if (!dryRun) {
    mkdirp(rulesDir);
    mkdirp(commandsDir);

    for (const entry of previousEntries.filter(item => item.mode === "path")) {
      removePath(entry.path);
    }
  }

  for (const asset of assets.rules) {
    const filePath = path.join(claudeHome, "rules", asset.fileName);
    entries.push({
      kind: "rules",
      mode: "path",
      path: filePath,
      target: "claude",
    });

    if (!dryRun) {
      assertWritableFile(filePath, previousEntries);
      const marker = buildMarkerLine({
        source: asset.sourceRel,
        target: "claude",
        version,
      });
      fs.writeFileSync(filePath, `${marker}\n\n${asset.content}`, "utf8");
    }
  }

  for (const asset of assets.skills) {
    const filePath = path.join(claudeHome, "commands", `${asset.skillName}.md`);
    entries.push({
      kind: "skills",
      mode: "path",
      path: filePath,
      target: "claude",
    });

    if (!dryRun) {
      assertWritableFile(filePath, previousEntries);
      fs.writeFileSync(filePath, renderClaudeCommand({ asset, version }), "utf8");
    }
  }

  const hooks = buildHookEntries(assets.hooks);
  const { entries: hookScriptEntries, installedScripts } = installClaudeHookScripts({
    claudeHome,
    dryRun,
    hooks,
    previousEntries,
    version,
  });
  entries.push(...hookScriptEntries);

  const hookEntries = hooks.map(hook =>
    buildClaudeHookEntry({
      hook,
      scriptPath: installedScripts.get(hook.id),
    })
  );
  const hadPreviousHookConfig = previousEntries.some(
    entry => entry.kind === "hooks" && entry.mode === "json-merge"
  );
  if (hookEntries.length > 0 || hadPreviousHookConfig) {
    entries.push({
      kind: "hooks",
      mode: "json-merge",
      path: settingsPath,
      target: "claude",
    });

    if (!dryRun) {
      const settings = loadJsonFile(settingsPath, {});
      const rawHookMap =
        settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {};
      const hookMap = pruneManagedHooks(rawHookMap);

      for (const hookEntry of hookEntries) {
        const eventName = hookEntry.event;
        const existing = Array.isArray(hookMap[eventName]) ? hookMap[eventName] : [];
        const { event, ...resolvedHookEntry } = hookEntry;
        hookMap[eventName] = [...existing, resolvedHookEntry];
      }

      settings.hooks = hookMap;
      fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    }
  } else {
    notes.push("Claude: no hook definitions with targets.claude were found.");
  }

  return { entries, notes };
}
