---
name: java-database
description: Use when designing Java database schema, writing or reviewing SQL and ORM mappings, planning indexes, or evaluating batch data change risk.
---

# Java Database

## 适用场景

当任务涉及表结构设计、SQL 调整、索引优化、分页方案、批量回填或 ORM 映射联动时使用。

## 使用方式

1. 先用本文件确定这次是“结构设计 / SQL 编写 / 索引分页 / 数据修复”哪一类问题。
2. 再查看 `references/database-guidelines.md` 获取具体规范、禁令和示例。
3. 输出时区分实现建议、上线风险和回滚验证。

## 关注点

- 表结构是否满足租户隔离、主键策略、字段长度和可扩展性要求
- SQL 是否参数化、命中索引、限制返回规模，并避免在应用层兜底过滤
- 分页、排序、批量处理是否有明确的边界和性能预估
- 数据库脚本、实体映射、DAO 查询和业务代码是否同步调整

## 详细参考

- 表设计、SQL 禁令、索引、分页、多数据库适配：`references/database-guidelines.md`

## 执行清单

1. 列出受影响的表、索引、约束、Mapper/Repository 和调用链。
2. 判断是结构变更、查询变更还是数据修复，不同类型分别评估兼容窗口和回滚方式。
3. 对大表、历史数据修复、批量更新说明批次、事务、锁和执行窗口。
4. 输出时区分实现建议、验证项和上线观察点。
