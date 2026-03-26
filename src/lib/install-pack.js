import fs from "node:fs";
import path from "node:path";

import { collectAssets } from "./assets.js";
import { projectClaude } from "./projectors/claude.js";
import { projectCodex } from "./projectors/codex.js";
import { projectOpenCode } from "./projectors/opencode.js";

const MANIFEST_DIR = "iuap-rules-pack";
const MANIFEST_FILE = "install-manifest.json";
const SUPPORTED_TARGETS = ["claude", "codex", "opencode"];

const PROJECTORS = {
  claude: projectClaude,
  codex: projectCodex,
  opencode: projectOpenCode,
};

function mkdirp(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

export function listSupportedStacks(repoRoot) {
  const stacksRoot = path.join(repoRoot, "stacks");
  if (!fs.existsSync(stacksRoot)) {
    return [];
  }

  return fs
    .readdirSync(stacksRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

export function resolveManualStacks(stackValue, repoRoot) {
  if (!stackValue) {
    return [];
  }

  const supportedStacks = listSupportedStacks(repoRoot);
  const stackIds = stackValue
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  for (const stackId of stackIds) {
    if (!supportedStacks.includes(stackId)) {
      throw new Error(`Unsupported stack: ${stackId}`);
    }
  }

  return [...new Set(stackIds)];
}

export function listSupportedTargets() {
  return [...SUPPORTED_TARGETS];
}

export function resolveManualTargets(targetValue) {
  if (!targetValue) {
    return [];
  }

  const targetIds = targetValue
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  for (const targetId of targetIds) {
    if (!SUPPORTED_TARGETS.includes(targetId)) {
      throw new Error(`Unsupported target: ${targetId}`);
    }
  }

  return [...new Set(targetIds)];
}

export function installPack({
  claudeHome,
  codexHome,
  dryRun,
  packageVersion,
  projectRoot,
  repoRoot,
  selectedStacks,
  selectedTargets,
}) {
  const manifestRoot = path.join(claudeHome, MANIFEST_DIR);
  const manifestPath = path.join(manifestRoot, MANIFEST_FILE);
  const previousManifest = readManifest(manifestPath);
  const previousTargets = previousManifest?.targets || {};
  const assets = collectAssets(repoRoot, selectedStacks);
  const targets = { ...previousTargets };
  const notes = [];

  if (!dryRun) {
    mkdirp(manifestRoot);
  }

  for (const target of selectedTargets) {
    const projector = PROJECTORS[target];
    const result = projector({
      assets,
      claudeHome,
      codexHome,
      dryRun,
      previousEntries: previousTargets[target]?.entries || [],
      projectRoot,
      repoRoot,
      version: packageVersion,
    });

    targets[target] = {
      entries: result.entries,
    };
    notes.push(...result.notes);
  }

  const plan = {
    entries: Object.entries(targets).flatMap(([target, value]) =>
      value.entries.map(entry => ({ ...entry, target }))
    ),
    notes,
  };

  if (!dryRun) {
    const manifest = {
      claudeHome,
      codexHome,
      installedAt: new Date().toISOString(),
      packageVersion,
      projectRoot,
      selectedStacks,
      selectedTargets,
      targets,
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  return { plan };
}
