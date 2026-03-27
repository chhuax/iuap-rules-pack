---
name: java-redis
description: Use when adding or reviewing Redis access in Java services, especially for key design, expiration strategy, distributed locks, and large-key operations.
---

# Java Redis

## 适用场景

当任务涉及缓存设计、Redis 命令选择、分布式锁、Key 设计、TTL 策略或大 Key 风险评估时使用。

## 使用方式

1. 先判断本次 Redis 用途是缓存、锁、限流、幂等还是集合查询。
2. 再查看 `references/redis-guidelines.md` 获取禁用命令、Key 设计、TTL 和连接规范。
3. 输出时写清楚 Key 结构、过期策略、失败降级和监控点。

## 关注点

- Key 是否可读、可隔离，并包含必要的业务前缀或租户信息
- 是否设置合理 TTL，并避免集中失效
- 批量读写是否使用 pipeline、scan 或 Lua，而不是阻塞式全量命令
- 分布式锁是否具备过期、续约、释放保护和失败兜底

## 详细参考

- 禁止命令、推荐命令、TTL、Value 大小、淘汰策略：`references/redis-guidelines.md`

## 执行清单

1. 识别本次 Redis 的用途：缓存、幂等、锁、计数器还是队列辅助。
2. 明确每类 Key 的命名、TTL、淘汰影响和监控方式。
3. 对大集合和热点 Key 给出访问边界，避免把 Redis 当成无上限数据库。
4. 输出里要写清楚失效后的降级行为和数据一致性取舍。
