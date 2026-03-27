import fs from "node:fs";
import path from "node:path";

const MAX_STDIN = 1024 * 1024;
const CHINESE_LITERAL_REGEX = /"([^"\n]*[\u4e00-\u9fff][^"\n]*)"/g;

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

function parseMode(argv) {
  const modeIndex = argv.indexOf("--mode");
  if (modeIndex === -1) {
    return "semi-auto";
  }

  return argv[modeIndex + 1] || "semi-auto";
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

function hasExceptionTrigger(beforeText) {
  return /(throw\b[\s\S]{0,200}|AssertUtils[\s\S]{0,200})$/u.test(beforeText);
}

function isIgnoredContext(windowText) {
  return (
    /getMessageWithDefault\s*\(/u.test(windowText) ||
    /@notranslate/u.test(windowText)
  );
}

function detectChineseExceptionLiteral(content) {
  for (const match of content.matchAll(CHINESE_LITERAL_REGEX)) {
    const index = match.index ?? -1;
    if (index < 0) {
      continue;
    }

    const before = content.slice(Math.max(0, index - 240), index);
    const after = content.slice(index, index + 240);
    const windowText = `${before}${after}`;

    if (isIgnoredContext(windowText)) {
      continue;
    }

    if (hasExceptionTrigger(before)) {
      return match[1];
    }
  }

  return "";
}

function buildMessage({ filePath, literal, mode }) {
  const base = `[IUAP Hook] ${path.basename(filePath)} contains a Chinese exception literal "${literal}".`;
  if (mode === "reminder") {
    return `${base} Run yms-i18n <current-file> if this exception must be internationalized.\n`;
  }

  return `${base} Immediately run yms-i18n <current-file> before continuing implementation.\n`;
}

const raw = await readStdin();
const input = parseJson(raw);
const filePath = resolveFilePath(input);
const mode = parseMode(process.argv.slice(2));

if (filePath.endsWith(".java") && fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, "utf8");
  const literal = detectChineseExceptionLiteral(content);
  if (literal) {
    process.stderr.write(buildMessage({ filePath, literal, mode }));
  }
}

process.stdout.write(raw);
