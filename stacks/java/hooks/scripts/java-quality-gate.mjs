import fs from "node:fs";
import path from "node:path";

const MAX_STDIN = 1024 * 1024;

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

function resolveFilePath(input) {
  const toolInput = input?.tool_input || {};
  if (typeof toolInput.file_path === "string" && toolInput.file_path.length > 0) {
    return toolInput.file_path;
  }

  if (typeof toolInput.file === "string" && toolInput.file.length > 0) {
    return toolInput.file;
  }

  return "";
}

function inspectJavaFile(filePath) {
  if (!filePath.endsWith(".java") || !fs.existsSync(filePath)) {
    return [];
  }

  const warnings = [];
  const content = fs.readFileSync(filePath, "utf8");

  if (/System\.out\.print/.test(content)) {
    warnings.push("avoid System.out.print in delivery code");
  }

  if (/printStackTrace\s*\(/.test(content)) {
    warnings.push("avoid printStackTrace and route exceptions through standard logging");
  }

  if (/throws\s+Exception\b/.test(content)) {
    warnings.push("avoid broad throws Exception on public methods");
  }

  if (/\b(TODO|FIXME)\b/.test(content)) {
    warnings.push("review TODO or FIXME markers before delivery");
  }

  return warnings;
}

const raw = await readStdin();
const input = parseJson(raw);
const filePath = resolveFilePath(input);
const warnings = inspectJavaFile(filePath);

if (warnings.length > 0) {
  process.stderr.write(
    `[IUAP Hook] Java quality gate for ${path.basename(filePath)}: ${warnings.join("; ")}.\n`
  );
}

process.stdout.write(raw);
