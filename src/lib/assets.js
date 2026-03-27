import fs from "node:fs";
import path from "node:path";

function listMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map(entry => entry.name)
    .sort();
}

function listSkillDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .filter(name => fs.existsSync(path.join(dirPath, name, "SKILL.md")));
}

function listFilesRecursive(rootPath, currentPath = rootPath) {
  if (!fs.existsSync(currentPath)) {
    return [];
  }

  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(rootPath, fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(rootPath, fullPath));
    }
  }

  return files.sort();
}

function listHookFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
    .map(entry => entry.name)
    .sort();
}

function readText(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(repoRoot, relativePath) {
  return JSON.parse(readText(repoRoot, relativePath));
}

function resolveHookScript(repoRoot, module, definition, sourceRel) {
  if (!definition.script) {
    return { scriptContent: null, scriptRel: null };
  }

  if (typeof definition.script !== "string") {
    throw new Error(`Hook script must be a string in ${sourceRel}`);
  }

  const scriptRel = path.join(module.sourceRoot, "hooks", definition.script);
  const scriptPath = path.join(repoRoot, scriptRel);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Hook script not found for ${sourceRel}: ${scriptRel}`);
  }

  return {
    scriptContent: readText(repoRoot, scriptRel),
    scriptRel,
  };
}

function buildModule(sourceRoot, namespace) {
  return { namespace, sourceRoot };
}

function getSelectedModules(selectedStacks) {
  return [
    buildModule("common", "iuap-common"),
    ...selectedStacks.map(stack => buildModule(path.join("stacks", stack), `iuap-${stack}`)),
  ];
}

function assertUniqueNames({ items, label, getKey }) {
  const seen = new Map();

  for (const item of items) {
    const key = getKey(item);
    const previous = seen.get(key);
    if (previous) {
      throw new Error(
        `Name conflict for ${label} "${key}": ${previous.sourceRel} and ${item.sourceRel}`
      );
    }
    seen.set(key, item);
  }
}

export function collectAssets(repoRoot, selectedStacks) {
  const modules = getSelectedModules(selectedStacks);
  const rules = [];
  const skills = [];
  const hooks = [];

  for (const module of modules) {
    const rulesRoot = path.join(repoRoot, module.sourceRoot, "rules");
    for (const fileName of listMarkdownFiles(rulesRoot)) {
      const sourceRel = path.join(module.sourceRoot, "rules", fileName);
      rules.push({
        content: readText(repoRoot, sourceRel),
        fileName,
        namespace: module.namespace,
        sourceRel,
      });
    }

    const skillsRoot = path.join(repoRoot, module.sourceRoot, "skills");
    for (const skillName of listSkillDirectories(skillsRoot)) {
      const sourceRel = path.join(module.sourceRoot, "skills", skillName, "SKILL.md");
      const skillRootRel = path.join(module.sourceRoot, "skills", skillName);
      const supportFiles = listFilesRecursive(path.join(repoRoot, skillRootRel))
        .filter(relativePath => relativePath !== "SKILL.md")
        .map(relativePath => ({
          content: readText(repoRoot, path.join(skillRootRel, relativePath)),
          relativePath,
          sourceRel: path.join(skillRootRel, relativePath),
        }));
      skills.push({
        content: readText(repoRoot, sourceRel),
        namespace: module.namespace,
        skillName,
        supportFiles,
        sourceRel,
      });
    }

    const hooksRoot = path.join(repoRoot, module.sourceRoot, "hooks");
    for (const fileName of listHookFiles(hooksRoot)) {
      const sourceRel = path.join(module.sourceRoot, "hooks", fileName);
      const definition = readJson(repoRoot, sourceRel);
      const { scriptContent, scriptRel } = resolveHookScript(
        repoRoot,
        module,
        definition,
        sourceRel
      );
      hooks.push({
        definition,
        fileName,
        id: `${module.namespace}:${fileName.replace(/\.json$/, "")}`,
        namespace: module.namespace,
        scriptContent,
        scriptRel,
        sourceRel,
      });
    }
  }

  assertUniqueNames({
    items: rules,
    label: "rule file",
    getKey: item => item.fileName,
  });
  assertUniqueNames({
    items: skills,
    label: "skill",
    getKey: item => item.skillName,
  });
  assertUniqueNames({
    items: hooks,
    label: "hook file",
    getKey: item => item.fileName,
  });

  return { hooks, modules, rules, skills };
}
