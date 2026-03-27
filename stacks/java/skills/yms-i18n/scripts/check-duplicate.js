#!/usr/bin/env node
/**
 * check-duplicate.js
 * 在 zh_CN 资源文件中查找是否已存在相同的中文消息。
 *
 * 环境变量：
 *   ZH_FILE      zh_CN properties 文件的路径（绝对或相对）
 *   SEARCH_TEXT  要查找的中文消息
 *
 * 输出：
 *   FOUND:<uid>  已存在，<uid> 为完整 key（如 UID:P_MODULE-A-BE_xxx）
 *   NOT_FOUND    不存在
 *
 * 用法：
 *   ZH_FILE="iuap-yms-manage/src/main/resources/lang/YS_YMSCLOUD_GPAASMANAGE-BE_zh_CN.properties" \
 *   SEARCH_TEXT="参数不能为空" \
 *   node check-duplicate.js
 */

'use strict';

const { readProperties } = require('./lib/properties');

const { ZH_FILE, SEARCH_TEXT } = process.env;

if (!ZH_FILE || !SEARCH_TEXT) {
  console.error('ZH_FILE, SEARCH_TEXT env vars are required');
  process.exit(1);
}

const map = readProperties(ZH_FILE);
for (const [key, val] of map) {
  if (val === SEARCH_TEXT) {
    console.log('FOUND:' + key);
    process.exit(0);
  }
}

console.log('NOT_FOUND');
