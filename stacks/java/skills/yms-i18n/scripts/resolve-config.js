#!/usr/bin/env node
/**
 * resolve-config.js
 * 根据 Java 文件路径，从 yms-i18n.json 查找对应的 i18n 配置。
 * 向上找第一个含 src 子目录的父目录作为 Maven 子模块根，匹配 modules key；
 * 无匹配则使用 default 配置。
 *
 * 输出：JSON 字符串，包含以下字段：
 *   uidPrefix    UID 前缀，如 P_GPAASYPR-BE_
 *   filePrefix   资源文件名前缀，如 YS_YMSCLOUD_GPAASYPR-BE
 *   resourceDir  资源文件目录（相对于项目根目录）
 *   i18nClass    完整类路径
 *   unicodeEscape  写入 properties 时是否 unicode 转义
 *   zhFile       zh_CN properties 文件的完整路径（相对于项目根目录）
 *
 * 用法：
 *   JAVA_FILE="iuap-ypr/src/main/java/com/example/Foo.java" node resolve-config.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_I18N_CLASS = 'com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault';
const DEFAULT_UNICODE_ESCAPE = true;

function resolveI18nConfig(javaFile) {
  const cfgPath = path.join(process.cwd(), 'yms-i18n.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

  const root = process.cwd();
  let dir = path.dirname(path.resolve(javaFile));
  let moduleConf = null;

  while (dir !== root && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'src'))) {
      const key = path.relative(root, dir);
      moduleConf = (cfg.modules && cfg.modules[key]) ? cfg.modules[key] : null;
      break;
    }
    dir = path.dirname(dir);
  }

  const base = cfg.default || {};
  const override = moduleConf || {};
  const merged = Object.assign({}, base, override);

  if (!('i18nClass' in merged)) merged.i18nClass = base.i18nClass || DEFAULT_I18N_CLASS;
  if (!('unicodeEscape' in merged)) merged.unicodeEscape = ('unicodeEscape' in base) ? base.unicodeEscape : DEFAULT_UNICODE_ESCAPE;

  merged.zhFile = path.join(merged.resourceDir, merged.filePrefix + '_zh_CN.properties');

  return merged;
}

const javaFile = process.env.JAVA_FILE;
if (!javaFile) {
  console.error('JAVA_FILE env var is required');
  process.exit(1);
}

console.log(JSON.stringify(resolveI18nConfig(javaFile)));
