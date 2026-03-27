#!/usr/bin/env node
/**
 * check-uid.js
 * 校验候选 UID 是否已存在于 zh_CN 资源文件中，防止 UID 冲突。
 *
 * 环境变量：
 *   ZH_FILE        zh_CN properties 文件的路径（绝对或相对）
 *   CANDIDATE_UID  待校验的 UID，如 UID:P_GPAASMANAGE-BE_1A2B3C4D05E6001F
 *
 * 输出：
 *   OK        UID 不存在，可以使用
 *   CONFLICT  UID 已存在，需重新生成
 *
 * 用法：
 *   ZH_FILE="iuap-yms-manage/src/main/resources/lang/YS_YMSCLOUD_GPAASMANAGE-BE_zh_CN.properties" \
 *   CANDIDATE_UID="UID:P_GPAASMANAGE-BE_1A2B3C4D05E6001F" \
 *   node check-uid.js
 */

'use strict';

const { readProperties } = require('./lib/properties');

const { ZH_FILE, CANDIDATE_UID } = process.env;

if (!ZH_FILE || !CANDIDATE_UID) {
  console.error('ZH_FILE, CANDIDATE_UID env vars are required');
  process.exit(1);
}

const map = readProperties(ZH_FILE);
console.log(map.has(CANDIDATE_UID) ? 'CONFLICT' : 'OK');
