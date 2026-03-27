# scripts 使用说明

所有脚本均使用 Node.js，跨平台可用（Windows / macOS / Linux）。
在项目根目录下执行，或通过 `workdir` 参数指定项目根目录。

---

## scan-resources.js

扫描项目中所有 `.properties` 资源文件，按目录分组输出前缀列表。用于在创建 `yms-i18n.json` 前辅助发现资源目录。

```bash
node scripts/scan-resources.js
```

**输出格式（每行一条）：**
```
<相对目录>\t<前缀1>,<前缀2>,...
```

**示例输出：**
```
iuap-yms-manage/src/main/resources/lang	YS_YMSCLOUD_GPAASMANAGE-BE
iuap-ypr/src/main/resources/lang	YS_YMSCLOUD_GPAASYPR-BE
```

---

## resolve-config.js

根据 Java 文件路径，从已存在的 `yms-i18n.json` 查找对应的 i18n 配置。

```bash
JAVA_FILE="<Java文件路径>" node scripts/resolve-config.js
```

**输出 JSON 字段：**

| 字段            | 说明                                      |
| --------------- | ----------------------------------------- |
| `uidPrefix`     | UID 前缀，如 `P_GPAASYPR-BE_`            |
| `filePrefix`    | 资源文件名前缀，如 `YS_YMSCLOUD_GPAASYPR-BE` |
| `resourceDir`   | 资源文件目录（相对于项目根目录）          |
| `i18nClass`     | 多语处理方法完整类路径                    |
| `unicodeEscape` | 写入 properties 时是否 unicode 转义       |
| `zhFile`        | zh_CN properties 文件完整路径（直接传给 check-*.js） |

**示例：**
```bash
JAVA_FILE="iuap-ypr/src/main/java/com/example/Foo.java" node scripts/resolve-config.js
# 输出：
# {"uidPrefix":"P_GPAASYPR-BE_","filePrefix":"YS_YMSCLOUD_GPAASYPR-BE",
#  "resourceDir":"iuap-ypr/src/main/resources/lang",
#  "i18nClass":"com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault",
#  "unicodeEscape":true,
#  "zhFile":"iuap-ypr/src/main/resources/lang/YS_YMSCLOUD_GPAASYPR-BE_zh_CN.properties"}
```

---

## check-duplicate.js

在 zh_CN 资源文件中查找是否已存在相同的中文消息。

```bash
ZH_FILE="<zhFile>" SEARCH_TEXT="<中文消息>" node scripts/check-duplicate.js
```

**输出：**
- `FOUND:<uid>` — 已存在，直接复用该 UID，无需写入资源文件
- `NOT_FOUND` — 不存在，需生成新 UID

**示例：**
```bash
ZH_FILE="iuap-yms-manage/src/main/resources/lang/YS_YMSCLOUD_GPAASMANAGE-BE_zh_CN.properties" \
SEARCH_TEXT="参数不能为空" \
node scripts/check-duplicate.js
# 输出：FOUND:UID:P_GPAASMANAGE-BE_17FA020605C00033
```

---

## check-uid.js

校验候选 UID 是否已存在于 zh_CN 资源文件中，防止 UID 冲突。

```bash
ZH_FILE="<zhFile>" CANDIDATE_UID="<候选UID>" node scripts/check-uid.js
```

**输出：**
- `OK` — UID 不存在，可以使用
- `CONFLICT` — UID 已存在，需重新生成

**示例：**
```bash
ZH_FILE="iuap-yms-manage/src/main/resources/lang/YS_YMSCLOUD_GPAASMANAGE-BE_zh_CN.properties" \
CANDIDATE_UID="UID:P_GPAASMANAGE-BE_1A2B3C4D05E6001F" \
node scripts/check-uid.js
# 输出：OK
```

---

## 典型调用链（供参考）

```bash
# 1. 获取配置（包含 zhFile）
CONF=$(JAVA_FILE="/path/to/Foo.java" node scripts/resolve-config.js)
ZH_FILE=$(node -e "console.log(JSON.parse(process.env.C).zhFile)" C="$CONF")

# 2. 重复检查
ZH_FILE="$ZH_FILE" SEARCH_TEXT="参数不能为空" node scripts/check-duplicate.js

# 3. UID 去重校验
ZH_FILE="$ZH_FILE" CANDIDATE_UID="UID:P_GPAASMANAGE-BE_1A2B3C4D05E6001F" node scripts/check-uid.js
```

> AI 执行时通常直接从 `resolve-config.js` 的 JSON 输出中读取 `zhFile`，无需手动拼接。
