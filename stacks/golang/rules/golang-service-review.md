# Golang Service Review Rules

## 目标

统一 Go 服务评审时的关注点，优先发现错误处理、超时治理和可观测性问题。

## 评审重点

1. 错误返回必须携带足够上下文，禁止只返回裸错误字符串。
2. 对外调用要明确 context 传递、超时控制和重试边界。
3. Handler、service、repository 的职责要清晰，避免一个函数同时承担协议、业务和存储逻辑。
4. 日志、metrics、trace 要覆盖关键失败路径，不能只有最终错误没有上下文信息。
5. 配置、常量和 feature flag 要集中管理，避免散落在多个包中。
