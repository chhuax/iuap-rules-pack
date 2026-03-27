# Java Redis Guidelines

## 禁止命令

```text
❌ keys *
❌ flushdb / flushall
❌ monitor
❌ smembers（大数据量）
❌ hgetall（大数据量）
❌ config
❌ 多 DB（公有云场景）
❌ multi 事务
❌ 短连接
```

## 推荐命令

| 操作 | 推荐命令 | 说明 |
| --- | --- | --- |
| 查询 Key | scan | 每次取 1000 |
| Hash 查询 | hscan | 每次取 1000 |
| Set 查询 | sscan | 每次取 1000 |
| ZSet 查询 | zscan | 每次取 1000 |
| 批量执行 | pipeline | 每次不超过 100 个 key |
| 删除 | unlink | Redis 4.0+ 异步删除 |

## Key 设计规范

命名格式建议：

```text
Region:租户ID:用户自定义Key
示例：iuap_apcom_xx:hsnukb4g:resource123
```

要求：

1. Key 具备业务含义和可读性
2. Key 长度不超过 2KB，推荐不超过 64 字符
3. 禁止中文和全角字符
4. 禁止特殊字符：`, " ' ` \\ < > { } [ ] & ^ % ~`
5. 缺少租户时显式使用占位值而不是留空

分布式锁命名建议：

```text
Region:租户ID:lock:资源名
```

锁时长建议不超过 10 分钟。

## 过期时间规范

避免集中失效，建议使用“基础 TTL + 抖动”：

```java
int baseExpire = 3600;
int randomExpire = ThreadLocalRandom.current().nextInt(-360, 361);
redis.expire(key, baseExpire + randomExpire);
```

## 连接与执行规范

1. 使用长连接池，不要手写短连接。
2. 大量数据操作应分批、渐进式执行。
3. 原子性要求高的逻辑优先用 Lua 脚本。
4. 大 Key 应拆分，不要让单个 Key 承担无界业务数据。

## Value 大小建议

| 类型 | 上限 | 建议 |
| --- | --- | --- |
| String | 512MB | 推荐不超过 10KB |
| Hash | 2^32-1 键值对 | 单个 Hash 建议不超过 1000 字段 |
| List | 2^32-1 元素 | 单个 List 建议不超过 10000 元素 |
| Set | 2^32-1 元素 | 单个 Set 建议不超过 10000 元素 |
| ZSet | 2^32-1 元素 | 单个 ZSet 建议不超过 10000 元素 |

## 淘汰策略

| 策略 | 说明 | 推荐度 |
| --- | --- | --- |
| volatile-lru | 过期 key 中 LRU | 推荐 |
| allkeys-lru | 所有 key 中 LRU | 一般推荐 |
| noeviction | 不删除，返回错误 | 默认 |

## 典型场景

| 场景 | 推荐方案 |
| --- | --- |
| 分布式锁 | `SET NX EX` + Lua |
| 限流 | Lua + `INCR` |
| 幂等性 | Token + Redis |
| 热点数据 | Redis + TTL |
| 排行榜 | ZSet |
| 计数器 | String + `INCR` |
