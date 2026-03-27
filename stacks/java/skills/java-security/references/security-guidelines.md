# Java Security Guidelines

## 输入验证

### 禁止动态拼接 SQL

```java
// ❌ 禁止
String sql = "SELECT * FROM user WHERE name = '" + name + "'";

// ✅ 使用预编译
var sql = """
        SELECT id, name
        FROM user
        WHERE name = ?
        """;
var ps = conn.prepareStatement(sql);
ps.setString(1, name);
```

### 禁止动态构建 XPath

```java
// ❌ 禁止
String xpath = "//user[name='" + userInput + "']";
```

### 不可信输入必须按输出位置编码

| 输出位置 | 编码方式 |
| --- | --- |
| HTML 标签内 | HTML 实体编码 |
| HTML 属性内 | HTML 属性编码 |
| JavaScript | JavaScript 编码 |
| URL | URL 编码 |
| CSS | CSS 编码 |

### 禁止命令注入

```java
// ❌ 禁止
Runtime.exec("cmd " + userInput);
```

## 密码与密钥安全

### 禁止弱算法

```text
❌ MD5
❌ SHA-1
❌ 3DES
❌ AES-128
❌ RSA-1024
❌ DES

✅ SHA-256（密码）
✅ AES-256（数据加密）
✅ RSA-2048 / ECC（签名）
```

### 密码复杂度建议

```text
长度 ≥ 8 位
包含大写、小写、数字、特殊字符中的至少 3 类
禁止包含手机号、企业名、用户名
定期轮换
```

### 禁止硬编码密钥

```java
// ❌ 禁止
String apiKey = "sk-1234567890";
```

## 输出安全

### HTML 输出转义

```java
var html = """
        <div>%s</div>
        """.formatted(HtmlUtils.htmlEscape(userInput));
```

### JSON 输出

禁止手工拼接 JSON 字符串，统一使用 JSON 库。

### 敏感信息脱敏

| 信息类型 | 脱敏规则 |
| --- | --- |
| 身份证 | 仅保留首尾少量字符 |
| 手机号 | 隐藏中间位 |
| 银行卡 | 仅显示后 4 位 |
| 地址 | 最多到区级 |

## XSS / CSRF

### 前端

- 禁止把用户输入直接塞进 `innerHTML`
- 优先使用框架默认转义或 `textContent`

### 后端

- 设置 `X-Content-Type-Options: nosniff`
- 设置 `X-Frame-Options`
- 结合场景配置 CSP
- 对关键表单或状态变更操作校验 CSRF Token

## 文件上传安全

1. 不只看扩展名，要校验文件魔数或 MIME。
2. 限制大小。
3. 不直接使用用户文件名，重命名为随机串。
4. 禁止路径穿越，过滤 `..` 等非法路径片段。

## 会话管理

1. Token 应来自安全随机源，长度足够。
2. Cookie 默认设置 `HttpOnly`、`Secure`。
3. 设置无活动超时和绝对超时。
4. 登录失败要有锁定或限流机制。

## 依赖安全

```text
❌ 禁止使用已知高危漏洞组件
❌ 禁止继续依赖 EOM 组件
❌ fastjson 需使用安全版本或替换

✅ 使用自动扫描工具持续检查漏洞
```
