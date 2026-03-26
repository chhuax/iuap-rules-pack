const BLOCK_START = "<!-- IUAP_RULES_PACK_START -->";
const BLOCK_END = "<!-- IUAP_RULES_PACK_END -->";
const FILE_MARKER = "IUAP_RULES_PACKAGE ";

export function buildMarkerLine({ source, target, version }) {
  return `<!-- IUAP_RULES_PACKAGE source=${source} target=${target} version=${version} -->`;
}

export function buildLineCommentMarker({ source, target, version }) {
  return `// IUAP_RULES_PACKAGE source=${source} target=${target} version=${version}`;
}

export function getManagedBlockMarkers() {
  return { end: BLOCK_END, start: BLOCK_START };
}

export function hasManagedFileMarker(content) {
  return content.includes(FILE_MARKER);
}

export function replaceManagedBlock(content, replacement) {
  const pattern = new RegExp(
    `${escapeForRegex(BLOCK_START)}[\\s\\S]*?${escapeForRegex(BLOCK_END)}\\n?`,
    "g"
  );
  const nextContent = content.replace(pattern, "").trimEnd();
  const suffix = nextContent.length > 0 ? "\n\n" : "";
  return `${nextContent}${suffix}${BLOCK_START}\n${replacement}\n${BLOCK_END}\n`;
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
