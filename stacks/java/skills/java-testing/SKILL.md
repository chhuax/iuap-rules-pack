---
name: java-testing
description: Use when adding or reviewing automated tests for Java and Spring services, including unit tests, slice tests, integration tests, and regression coverage.
---

# Java Testing

## 适用场景

当任务涉及补测试、设计验证方案、处理回归风险，或评估 Java / Spring 代码的测试覆盖时使用。

## 使用方式

1. 先判断这次验证最合适的层级：单元、切片还是集成。
2. 再查看 `references/testing-guidelines.md` 获取 JUnit 5、Mockito、Spring Boot Test 和覆盖率细则。
3. 输出时明确当前验证已覆盖什么，剩余风险在哪里。

## 分层建议

- 单元测试：验证 Service、Util、Mapper 逻辑，默认不启动 Spring 上下文
- 切片测试：只验证 Web、JPA、消息等局部集成边界
- 集成测试：用于关键业务链路、配置联动和真实基础设施交互

## 详细参考

- 测试分层、示例、命名、覆盖率要求：`references/testing-guidelines.md`

## 执行清单

1. 先按风险拆出必须覆盖的成功路径、失败路径和边界条件。
2. 优先写最小、确定性的测试，不用完整上下文去验证纯业务逻辑。
3. 断言业务结果、状态变化和外部副作用，不只盯住内部调用次数。
4. 对异步、时间和并发场景给出稳定的结束条件，避免脆弱测试。

## 输出要求

- 说明测试层级选择
- 标出仍未覆盖的风险点
- 给出建议补的自动化验证或人工验证
