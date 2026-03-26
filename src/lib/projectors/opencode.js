import fs from "node:fs";
import path from "node:path";

import { buildMarkerLine, hasManagedFileMarker } from "../markers.js";

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

export function projectOpenCode({
  assets,
  dryRun,
  previousEntries,
  projectRoot,
  version,
}) {
  const opencodeRoot = path.join(projectRoot, ".opencode");
  const commandsDir = path.join(opencodeRoot, "commands");
  const instructionsDir = path.join(opencodeRoot, "instructions");
  const pluginsDir = path.join(opencodeRoot, "plugins");
  const configPath = path.join(opencodeRoot, "opencode.json");
  const instructionsRel = "instructions/iuap-rules-pack.md";
  const entries = [];
  const notes = [];

  if (!dryRun) {
    mkdirp(opencodeRoot);
    mkdirp(commandsDir);
    mkdirp(instructionsDir);
    mkdirp(pluginsDir);

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
    const fileName = `${asset.skillName}.md`;
    const commandPath = path.join(commandsDir, fileName);
    entries.push({
      kind: "skills",
      mode: "path",
      path: commandPath,
      target: "opencode",
    });

    commandEntries[asset.skillName] = {
      description: parseSkillDescription(asset.content, asset.skillName),
      template: `{file:commands/${fileName}}\n\n$ARGUMENTS`,
    };

    if (!dryRun) {
      assertWritableFile(commandPath, previousEntries);
      fs.writeFileSync(commandPath, renderOpenCodeCommand({ asset, version }), "utf8");
    }
  }

  if (assets.hooks.some(hook => hook.definition?.targets?.opencode)) {
    notes.push("OpenCode: hook definitions exist, but plugin generation is not implemented yet.");
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
