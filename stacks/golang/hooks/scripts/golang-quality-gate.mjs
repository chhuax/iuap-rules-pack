import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function inspectGoFile(filePath) {
  if (!filePath.endsWith(".go") || !fs.existsSync(filePath)) {
    return [];
  }

  const warnings = [];
  const formatCheck = spawnSync("gofmt", ["-l", filePath], {
    encoding: "utf8",
    timeout: 5000,
  });

  if (formatCheck.status === 0 && String(formatCheck.stdout || "").trim().length > 0) {
    warnings.push("run gofmt before delivery");
  }

  const content = fs.readFileSync(filePath, "utf8");

  if (/\bpanic\s*\(/.test(content) && !filePath.endsWith("_test.go")) {
    warnings.push("review panic usage in non-test code");
  }

  if (/\b(TODO|FIXME)\b/.test(content)) {
    warnings.push("review TODO or FIXME markers before delivery");
  }

  return warnings;
}

const raw = await readStdin();
const input = parseJson(raw);
const filePath = resolveFilePath(input);
const warnings = inspectGoFile(filePath);

if (warnings.length > 0) {
  process.stderr.write(
    `[IUAP Hook] Golang quality gate for ${path.basename(filePath)}: ${warnings.join("; ")}.\n`
  );
}

process.stdout.write(raw);
