---
name: yms-i18n
description: YMS 项目 Java 异常国际化处理。扫描含中文的 throw 语句，自动复用或生成 UID，将异常消息包裹为 InternationalUtils.getMessageWithDefault() 并写入四种语言 .properties 资源文件。触发词：i18n、国际化、多语言、throw 中文、异常翻译、properties 写入。
arguments:
  - name: target
    description: 要处理的目标，可以是 package 路径、具体类名或模块名
    required: false
---

# Java 异常信息多语言处理

## 使用方式

```
/yms-i18n <target>
```

**target** 参数支持以下格式：

| 格式     | 示例                                        | 说明               |
| -------- | ------------------------------------------- | ------------------ |
| 完整类名 | `com.example.service.impl.OrderServiceImpl` | 处理单个类         |
| 简单类名 | `OrderServiceImpl`                          | 搜索并处理匹配的类 |
| 包路径   | `com.example.service`                       | 处理该包下所有类   |
| 模块名   | `order-service`                             | 处理该模块下所有类 |
| 通配符   | `com.example.service.*`                     | 处理匹配的包/类    |

---

## 执行流程

### 第 0 步：初始化配置（仅首次或配置缺失时执行）

配置统一保存在**项目根目录**（即执行命令时的工作目录）下的 `yms-i18n.json`。

**配置结构：**
```json
{
  "default": {
    "uidPrefix": "P_GPAASMANAGE-BE_",
    "filePrefix": "YS_YMSCLOUD_GPAASMANAGE-BE",
    "resourceDir": "iuap-yms-manage/src/main/resources/lang",
    "i18nClass": "com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault",
    "unicodeEscape": true
  },
  "modules": {
    "iuap-ypr": {
      "uidPrefix": "P_GPAASYPR-BE_",
      "filePrefix": "YS_YMSCLOUD_GPAASYPR-BE",
      "resourceDir": "iuap-ypr/src/main/resources/lang"
    }
  }
}
```

| 字段           | 说明                                                                 |
| -------------- | -------------------------------------------------------------------- |
| `default`      | 默认配置，适用于所有未单独配置的模块                                 |
| `modules`      | 按 Maven 子模块根目录路径覆盖默认配置，key 为相对于项目根目录的路径  |
| `resourceDir`  | 相对于项目根目录的完整路径（含模块名）                               |
| `i18nClass`    | 多语处理方法的完整类路径（通常无需修改，项目使用不同工具类时覆盖）   |
| `unicodeEscape`| 写入 properties 时是否将中文转为 unicode 转义，默认 `true`           |
| `filePrefix`   | 资源文件名前缀（去掉语言后缀部分），用于拼接实际文件路径，如 `YS_YMSCLOUD_GPAASMANAGE-BE`       |

**读取流程：**
- **找到** `yms-i18n.json` → 读取配置，直接进入第 1 步
- **未找到** → 执行初始化流程，询问用户获取方式：

```
未找到 yms-i18n.json，需要初始化项目配置。
请选择资源文件目录的获取方式：
  1. 手动提供路径（直接告诉我资源文件目录）
  2. 自动扫描项目（扫描所有 .properties 文件所在目录）
请输入编号：
```

**选项 1（手动提供）：** 用户提供路径 → 若只有一个目录则直接作为 `default.resourceDir`，多个则询问哪个作 `default`，其余存入 `modules`，前缀从文件名自动提取。

**选项 2（自动扫描）：** 执行 `node scripts/scan-resources.js`，结果处理同上。

**前缀推断规则：**
- `filePrefix` = 文件名去掉语言后缀（如 `_zh_CN`）
- `uidPrefix` = `P_` + `filePrefix` 最后一个 `_` 后的部分 + `_`
  - 例：`YS_YMSCLOUD_GPAASMANAGE-BE` → `P_GPAASMANAGE-BE_`

> `yms-i18n.json` 建议加入 `.gitignore`，避免提交到版本控制。

---

### 第 1 步：解析 target，定位文件，确定配置

- 完整类名 → 定位具体 Java 文件
- 简单类名 → glob 搜索 `**/<ClassName>.java`
- 包路径 → 转换为目录路径搜索
- 模块名 → 对应模块目录下搜索

**配置查找（调用 `scripts/resolve-config.js`）：**

```bash
JAVA_FILE="/absolute/path/to/CurrentFile.java" node scripts/resolve-config.js
```

输出 JSON，含 `uidPrefix`、`filePrefix`、`resourceDir`、`i18nClass`、`unicodeEscape`、`zhFile`（zh_CN 文件完整路径）。

查找规则：从文件路径向上找第一个含 `src` 子目录的父目录作为 Maven 子模块根 → 查 `modules` key → 命中则用模块配置，否则用 `default`。

---

### 第 2 步：扫描待处理异常

搜索目标范围内包含中文字符串的异常抛出语句，**排除**：
- 已包含 `i18nClass` 配置中指定方法调用的
- 已有 `// @notranslate` 注释的

---

### 第 3 步：重复检查

调用 `scripts/check-duplicate.js`，传入 `resolve-config.js` 输出的 `zhFile`：

```bash
ZH_FILE="<zhFile>" SEARCH_TEXT="参数不能为空" node scripts/check-duplicate.js
```

- 输出 `FOUND:<uid>` → 复用该 UID，跳过资源文件写入
- 输出 `NOT_FOUND` → 进入第 4 步生成新 UID

---

### 第 4 步：生成新 UID（含去重校验）

**格式：** `UID:{uidPrefix}{RANDOM_HEX}`，例：`uidPrefix` 为 `P_GPAASMANAGE-BE_` 时，生成 `UID:P_GPAASMANAGE-BE_1A2B3C4D05E6001F`

**`{RANDOM_HEX}`：** 16 位大写十六进制，由当前时间戳毫秒（取低 32 位）+ 4 字节随机数拼接。

**去重校验（调用 `scripts/check-uid.js`）：**

```bash
ZH_FILE="<zhFile>" CANDIDATE_UID="UID:P_GPAASMANAGE-BE_1A2B3C4D05E6001F" node scripts/check-uid.js
```

- 输出 `OK` → 使用该 UID
- 输出 `CONFLICT` → 重新生成，最多重试 5 次

---

### 第 5 步：执行转换并输出汇总

无需用户确认，直接执行所有转换：

1. 修改 Java 代码（见"核心转换示例"）
2. 仅对**新增条目**追加写入所有语言资源文件（复用的跳过）

完成后输出简洁汇总：

```
完成（共 N 项）：新增 X 条，复用 Y 条
```

---

## 支持的异常类型

| 异常类型                          | 示例                                               |
| --------------------------------- | -------------------------------------------------- |
| 任意静态工厂方法异常              | `throw XxxException.create("消息", ...)`           |
| `RuntimeException`                | `throw new RuntimeException("消息")`               |
| `Exception`                       | `throw new Exception("消息")`                      |
| `IllegalArgumentException`        | `throw new IllegalArgumentException("消息")`       |
| `IllegalStateException`           | `throw new IllegalStateException("消息")`          |
| `NullPointerException`            | `throw new NullPointerException("消息")`           |
| `UnsupportedOperationException`   | `throw new UnsupportedOperationException("消息")`  |
| `BaseException` / 自定义异常      | `throw new XxxException("消息")`                   |
| `AssertUtils.throwException(...)` | `AssertUtils.getInstance().throwException("消息")` |

---

## 核心转换示例

> 以下示例使用占位前缀 `P_MODULE-A-BE_`，实际运行时替换为项目配置的前缀。

### 示例 1：普通异常

```java
// 转换前
throw new RuntimeException("操作失败，用户名或密码错误");

// 转换后
throw new RuntimeException(
        com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault(
                "UID:P_MODULE-A-BE_194A2B3C05D8001F", "操作失败，用户名或密码错误")); // @notranslate
```

### 示例 2：带异常链

```java
// 转换前
throw new RuntimeException("加密失败,请确认数据正确性", e);

// 转换后
throw new RuntimeException(
        com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault(
                "UID:P_MODULE-A-BE_194A2B3C05D80023", "加密失败,请确认数据正确性"), e); // @notranslate
```

### 示例 3：已有 String.format

```java
// 转换前
throw new RuntimeException(String.format("流量组[ID:%s]不存在", ruleId));

// 转换后
throw new RuntimeException(
        String.format(com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault(
                "UID:P_MODULE-A-BE_194A2B3C05D80022", "流量组[ID:%s]不存在"), ruleId)); // @notranslate
```


### 示例 4：复用已有 UID

```java
// 资源文件中已有：UID\:P_MODULE-A-BE_17FA020605C00029=参数错误
// 转换后（无需更新资源文件）
throw new IllegalArgumentException(
        com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault(
                "UID:P_MODULE-A-BE_17FA020605C00029", "参数错误")); // @notranslate
```

---

## 资源文件写入规则

每次新增条目时，向所有语言文件追加一行：

```properties
UID\:P_MODULE-A-BE_1A2B3C4D05E6001F=<对应语言的翻译>
```

- `zh_CN`：原始中文（若 `unicodeEscape: true`，写入前先将中文转为 unicode 转义，如 `参数错误` → `\u53C2\u6570\u9519\u8BEF`）
- `en_US`：英文翻译（纯 ASCII，无需转义）
- 其他语言：对应翻译（若含非 ASCII 字符同样按 `unicodeEscape` 配置处理；参考 [docs/translation-glossary.md](docs/translation-glossary.md)）
- 冒号必须转义：`UID\:P_`
- **只追加新增条目，复用的 UID 不写入任何文件**
- **追加前后不得出现空行**，若文件末尾已有空行须先清除

实际需要更新哪些语言文件，以 `resourceDir` 下实际存在的文件为准，不要假设固定语言数量。

---

## 参考资料

- 支持的语言列表：[docs/supported-languages.md](docs/supported-languages.md)
- 常用术语翻译对照：[docs/translation-glossary.md](docs/translation-glossary.md)
- 脚本详细用法：[scripts/README.md](scripts/README.md)

---

## 关键规则

### 规则 1：始终使用完整类路径

```java
// 正确 ✓
com.yonyou.iuap.ucf.common.i18n.InternationalUtils.getMessageWithDefault(...)

// 错误 ✗（不能使用短类名）
InternationalUtils.getMessageWithDefault(...)
```

### 规则 2：@notranslate 注释

转换后，`getMessageWithDefault` 调用中的中文字符串若与方法调用不在同一行，在含中文的行尾加 ` // @notranslate`。

### 规则 3：行长度限制

遵循项目格式化配置（如 palantirJavaFormat 默认 200 字符），超限时换行缩进。

### 规则 4：保持异常结构

- 异常类型不变
- 异常链 (cause) 保持不变
- 原有 String.format 包裹保持不变


---

## 验证清单

- [ ] `yms-i18n.json` 已有当前项目配置
- [ ] Java 代码使用完整类路径
- [ ] `getMessageWithDefault` 调用中的中文字符串若换行，行尾有 `// @notranslate`
- [ ] 重复检查通过脚本执行
- [ ] 新增 UID 经过去重校验（最多重试 5 次）
- [ ] **新增条目**：写入前已按 `unicodeEscape` 配置完成转义，所有实际存在的语言文件均已更新
- [ ] **复用条目**：未写入任何资源文件
- [ ] properties 文件冒号已转义（`UID\:P_`）
- [ ] 资源文件新增条目前后无空行
- [ ] 异常结构保持不变

