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

const raw = await readStdin();
const input = parseJson(raw);
const command = String(input?.tool_input?.command || "");

if (/\bgit\s+push\b/.test(command)) {
  process.stderr.write("[IUAP Hook] Reminder: confirm review result, verification scope, and rollback note before push.\n");
}

process.stdout.write(raw);
