import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  installPack,
  listSupportedStacks,
  listSupportedTargets,
  resolveManualStacks,
  resolveManualTargets,
} from "./lib/install-pack.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
);

function printHelp() {
  console.log(`iuap-rules-pack v${packageJson.version}

Usage:
  iuap-rules-pack install --stack <java,golang> --target <claude,codex,opencode> [--project-root <path>] [--claude-home <path>] [--codex-home <path>] [--opencode-home <path>] [--dry-run]
  iuap-rules-pack update --stack <java,golang> --target <claude,codex,opencode> [--project-root <path>] [--claude-home <path>] [--codex-home <path>] [--opencode-home <path>] [--dry-run]
  iuap-rules-pack list-stacks
  iuap-rules-pack list-targets
  iuap-rules-pack help

Examples:
  iuap-rules-pack install --stack java --target claude
  iuap-rules-pack install --stack java,golang --target claude,codex,opencode
  iuap-rules-pack update --stack golang --target codex --project-root ~/workspace/my-service
`);
}

function parseArgs(argv) {
  const [command = "install", ...rest] = argv;
  const options = {
    claudeHome: path.join(os.homedir(), ".claude"),
    codexHome: path.join(os.homedir(), ".codex"),
    opencodeHome: path.join(os.homedir(), ".config", "opencode"),
    dryRun: false,
    projectRoot: process.cwd(),
    stack: "",
    target: "",
  };

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];

    if (value === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (value === "--stack") {
      options.stack = rest[index + 1] || "";
      index += 1;
      continue;
    }

    if (value === "--target") {
      options.target = rest[index + 1] || "";
      index += 1;
      continue;
    }

    if (value === "--claude-home") {
      options.claudeHome = rest[index + 1];
      index += 1;
      continue;
    }

    if (value === "--codex-home") {
      options.codexHome = rest[index + 1];
      index += 1;
      continue;
    }

    if (value === "--project-root") {
      options.projectRoot = rest[index + 1];
      index += 1;
      continue;
    }

    if (value === "--opencode-home") {
      options.opencodeHome = rest[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  return { command, options };
}

export async function main(argv) {
  const { command, options } = parseArgs(argv);
  const claudeHome = path.resolve(options.claudeHome);
  const codexHome = path.resolve(options.codexHome);
  const opencodeHome = path.resolve(options.opencodeHome);
  const projectRoot = path.resolve(options.projectRoot);

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "list-stacks") {
    console.log(listSupportedStacks(repoRoot).join("\n"));
    return;
  }

  if (command === "list-targets") {
    console.log(listSupportedTargets().join("\n"));
    return;
  }

  if (command !== "install" && command !== "update") {
    throw new Error(`Unknown command: ${command}`);
  }

  const selectedStacks = resolveManualStacks(options.stack, repoRoot);
  const selectedTargets = resolveManualTargets(options.target);
  if (selectedStacks.length === 0) {
    throw new Error("Missing required argument: --stack <java,golang>");
  }
  if (selectedTargets.length === 0) {
    throw new Error("Missing required argument: --target <claude,codex,opencode>");
  }

  const result = installPack({
    claudeHome,
    codexHome,
    opencodeHome,
    dryRun: options.dryRun,
    packageVersion: packageJson.version,
    projectRoot,
    repoRoot,
    selectedStacks,
    selectedTargets,
  });

  const action = options.dryRun ? "Planned" : "Installed";
  console.log(`${action} iuap-rules-pack ${packageJson.version}`);
  console.log(`Claude home: ${claudeHome}`);
  console.log(`Codex home: ${codexHome}`);
  console.log(`OpenCode home: ${opencodeHome}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`Selected stacks: ${selectedStacks.join(", ")}`);
  console.log(`Selected targets: ${selectedTargets.join(", ")}`);

  console.log("Install plan:");
  for (const entry of result.plan.entries) {
    console.log(`- ${entry.target} ${entry.kind}: ${entry.path}`);
  }

  if (result.plan.notes.length > 0) {
    console.log("Notes:");
    for (const note of result.plan.notes) {
      console.log(`- ${note}`);
    }
  }
}
