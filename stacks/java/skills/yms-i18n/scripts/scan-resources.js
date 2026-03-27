#!/usr/bin/env node
/**
 * scan-resources.js
 * 扫描项目中所有 .properties 资源文件，按目录分组输出前缀列表。
 * 用于在创建 yms-i18n.json 前辅助发现资源目录。
 *
 * 输出格式（每行一条）：
 *   <相对目录>\t<前缀1>,<前缀2>,...
 *
 * 用法：
 *   node scan-resources.js
 */

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'build', 'dist', '.idea', '.mvn']);

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const f of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(f)) continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full, result);
    else if (f.endsWith('.properties')) result.push(full);
  }
  return result;
}

const files = walk('.');
const dirMap = {};
files.forEach(f => {
  const name = path.basename(f, '.properties');
  const m = name.match(/^(.+)_([a-z]{2}_[A-Z]{2})$/);
  if (!m) return;
  const dir = path.relative('.', path.dirname(f));
  if (!dirMap[dir]) dirMap[dir] = new Set();
  dirMap[dir].add(m[1]);
});

Object.entries(dirMap).forEach(([d, ps]) => console.log(d + '\t' + [...ps].join(',')));
