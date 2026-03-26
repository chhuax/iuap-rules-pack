import path from "node:path";

const MAX_STDIN = 1024 * 1024;

const PROTECTED_PATTERNS = [
  /^\.eslintrc(\..+)?$/,
  /^eslint\.config\..+$/,
  /^\.prettierrc(\..+)?$/,
  /^prettier\.config\..+$/,
  /^biome\.jsonc?$/,
  /^checkstyle(-.+)?\.xml$/,
  /^pmd(-.+)?\.xml$/,
  /^spotbugs(-.+)?\.xml$/,
  /^sonar-project\.properties$/,
  /^\.golangci\.ya?ml$/,
];

function readStdin() {
  return new Promise(resolve => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => {
      if (raw.length >= MAX_STDIN) {
        return;
      }

      const remaining = MAX_STDIN - raw.length;
      raw += chunk.slice(0, remaining);
    });
    process.stdin.on("end", () => resolve(raw));
  });
}

function parseJson(raw) {
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function collectPaths(input) {
  const toolInput = input?.tool_input || {};
  const paths = [];

  if (typeof toolInput.file_path === "string" && toolInput.file_path.length > 0) {
    paths.push(toolInput.file_path);
  }

  if (typeof toolInput.file === "string" && toolInput.file.length > 0) {
    paths.push(toolInput.file);
  }

  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (typeof edit?.file_path === "string" && edit.file_path.length > 0) {
        paths.push(edit.file_path);
      }
    }
  }

  return [...new Set(paths)];
}

function isProtected(filePath) {
  const baseName = path.basename(filePath);
  return PROTECTED_PATTERNS.some(pattern => pattern.test(baseName));
}

const raw = await readStdin();
const input = parseJson(raw);
const blockedPath = collectPaths(input).find(isProtected);

if (blockedPath) {
  const baseName = path.basename(blockedPath);
  process.stderr.write(
    `[IUAP Hook] BLOCKED: ${baseName} is treated as managed quality or security config. ` +
      "Fix code or request an explicit config change review instead.\n"
  );
  process.exit(2);
}

process.stdout.write(raw);
