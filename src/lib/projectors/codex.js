import fs from "node:fs";
import path from "node:path";

import { buildMarkerLine, hasManagedFileMarker, replaceManagedBlock } from "../markers.js";

function mkdirp(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { force: true, recursive: true });
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

  throw new Error(`Refusing to overwrite unmanaged Codex skill: ${skillMdPath}`);
}

function renderCodexSkill({ asset, version }) {
  const marker = buildMarkerLine({
    source: asset.sourceRel,
    target: "codex",
    version,
  });

  return `${marker}\n\n${asset.content}`;
}

function compileRulesBlock({ assets, projectRoot, version }) {
  const sections = [
    "## IUAP Enterprise Rules",
    "",
    `- Package version: ${version}`,
    `- Project root: ${projectRoot}`,
    "",
    "### Active Rules",
    "",
  ];

  for (const asset of assets.rules) {
    sections.push(`#### ${asset.fileName}`);
    sections.push("");
    sections.push(asset.content.trim());
    sections.push("");
  }

  sections.push("### Available IUAP Skills");
  sections.push("");
  for (const asset of assets.skills) {
    sections.push(`- \`${asset.skillName}\``);
  }

  if (assets.hooks.some(hook => hook.definition?.targets?.codex)) {
    sections.push("");
    sections.push("### Codex Hook Notes");
    sections.push("");
    sections.push("- Codex hook payloads are defined, but only notify-style Codex hooks are currently planned in this package.");
  }

  return sections.join("\n").trim();
}

export function projectCodex({
  assets,
  codexHome,
  dryRun,
  previousEntries,
  projectRoot,
  version,
}) {
  const skillsDir = path.join(codexHome, "skills");
  const agentsPath = path.join(projectRoot, "AGENTS.md");
  const entries = [];
  const notes = [];

  if (!dryRun) {
    mkdirp(skillsDir);

    for (const entry of previousEntries.filter(item => item.mode === "path")) {
      removePath(entry.path);
    }
  }

  for (const asset of assets.skills) {
    const skillDir = path.join(skillsDir, asset.skillName);
    const skillMdPath = path.join(skillDir, "SKILL.md");
    entries.push({
      kind: "skills",
      mode: "path",
      path: skillDir,
      target: "codex",
    });

    if (!dryRun) {
      assertWritableSkillFile(skillMdPath, previousEntries);
      mkdirp(skillDir);
      fs.writeFileSync(skillMdPath, renderCodexSkill({ asset, version }), "utf8");
    }
  }

  entries.push({
    kind: "rules",
    mode: "managed-block",
    path: agentsPath,
    target: "codex",
  });

  if (!dryRun) {
    const existing = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, "utf8") : "";
    const managedBlock = compileRulesBlock({ assets, projectRoot, version });
    const next = replaceManagedBlock(existing, managedBlock);
    fs.writeFileSync(agentsPath, next, "utf8");
  }

  if (assets.hooks.length > 0) {
    notes.push("Codex: hook projection is limited and no Codex-specific hook payloads are installed yet.");
  }

  return { entries, notes };
}
