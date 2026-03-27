# Java Error Handling Guidelines

## 标准异常组件

### Maven 依赖示例

```xml
<dependency>
    <groupId>com.yonyou.iuap</groupId>
    <artifactId>yms-core-api</artifactId>
    <version>${version}</version>
</dependency>
```

### 异常码格式

```text
{产品编码}-{二级分类}-{6位序号}
示例：120-230-100006
```

## 异常等级

| level | 含义 | displayCode | message | detailMsg |
| --- | --- | --- | --- | --- |
| 0 | 错误 | √ | √ | √ |
| 1 | 警告 | √ | √ | × |
| 2 | 询问 | √ | √ | × |
| 3-99 | 系统预留 | - | - | - |
| 100-999 | 领域扩展 | - | - | √ |
| 1000+ | 领域扩展 | - | - | × |

## 标准异常响应格式

```json
{
  "code": "xxx",
  "displayCode": "120-230-100006",
  "message": "会计平台未查询到该单据的相关消息",
  "detailMsg": "请检查是否已经推送会计平台",
  "level": 0,
  "traceId": "sd00034129",
  "uploadable": 0
}
```

## 公共异常码

### 运行时异常

| 异常码 | 异常类型 |
| --- | --- |
| 999-999-000001 | IllegalArgumentException |
| 999-999-000002 | NullPointerException |
| 999-999-000003 | SQLSyntaxErrorException |
| 999-999-000004 | NumberFormatException |
| 999-999-000005 | IllegalStateException |
| 999-999-000006 | ClassCastException |
| 999-999-000010 | UnsupportedOperationException |

### 分类异常

| 异常码 | 类别 |
| --- | --- |
| 999-999-100001 | 数据库异常 |
| 999-999-100002 | 网络异常 |
| 999-999-100003 | 框架异常 |
| 999-999-100004 | Redis 异常 |
| 999-999-100005 | 消息队列异常 |
| 999-999-100006 | RPC 请求异常 |
| 999-999-100007 | REST 请求异常 |

### 兜底异常

| 异常码 | 说明 |
| --- | --- |
| 999-999-999999 | 未知异常兜底 |

## 处理规范

### 业务异常

```java
throw new BusinessException(
        "120-230-100006",
        "会计平台未查询到该单据的相关消息",
        "请检查是否已经推送会计平台");
```

### 统一兜底捕获

```java
@ExceptionHandler(Exception.class)
public Result handleException(Exception e) {
    if (e instanceof BusinessException be) {
        return Result.error(be);
    }

    log.error("[统一捕获异常]-[异常类型:{}]", e.getClass().getName(), e);

    var be = new BusinessException();
    be.setDisplayCode("999-999-999999");
    be.setMessage("系统异常，请稍后重试");
    be.setLevel(0);
    be.setTraceId(MDC.get("traceId"));

    return Result.error(be);
}
```

### 禁止的异常处理

```java
// ❌ 只打印不处理
catch (Exception e) {
    e.printStackTrace();
}

// ❌ 直接吞掉
catch (Exception e) {
}

// ❌ 无语义的 RuntimeException
throw new RuntimeException("错误");
```

## HTTP 状态码建议

| 状态码 | 含义 | 处理方式 |
| --- | --- | --- |
| 200 | 成功 | 前端不显示 |
| 500 | 标准异常码 | 错误/警告提示 |
| 401 | 未登录 | 跳转登录页 |
| 403 | 拒绝访问 | 无权限提醒 |
| 404 | 页面找不到 | 友好提示 |
| 502/503/504 | 网关或服务异常 | 友好提示 |

## 日志要求

### 应该做

- 保留 traceId、关键业务主键和必要上下文
- 只输出关键参数和可定位信息

### 不应该做

```java
// ❌ Error 级别序列化整个大对象
log.error("响应: {}", AppContext.toJson(responseObject));

// ❌ 输出密码等敏感信息
log.error("密码错误: {}", password);
```
