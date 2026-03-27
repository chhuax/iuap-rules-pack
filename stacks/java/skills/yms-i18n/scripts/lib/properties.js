#!/usr/bin/env node
/**
 * lib/properties.js
 * 读取 .properties 文件的公共工具函数。
 * 被 check-duplicate.js / check-uid.js 共用。
 */

'use strict';

const fs = require('fs');

/**
 * 从 zh_CN properties 文件内容中解析出 { uid → value } 映射。
 * key 中的转义冒号 \: 会还原为 :，value 中的 \uXXXX 会还原为 Unicode 字符。
 *
 * @param {string} content  文件原始文本
 * @returns {Map<string, string>}  key = UID:P_xxx（还原后），value = 中文消息
 */
function parseProperties(content) {
  const map = new Map();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const rawKey = trimmed.slice(0, eq).trim();
    const rawVal = trimmed.slice(eq + 1).trim();
    const key = rawKey.replace(/\\:/g, ':');
    const val = rawVal.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    map.set(key, val);
  }
  return map;
}

/**
 * 读取文件并返回解析后的 Map；文件不存在时返回空 Map。
 *
 * @param {string} filePath  绝对或相对路径
 * @returns {Map<string, string>}
 */
function readProperties(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  return parseProperties(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { parseProperties, readProperties };
