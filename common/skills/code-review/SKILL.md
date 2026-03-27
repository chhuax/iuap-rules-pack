---
name: code-review
description: Use when reviewing code changes or doing self-review and you need a consistent checklist for correctness, regression risk, security, performance, readability, and verification evidence.
---

# Code Review

## 适用场景

当任务涉及代码评审、自审、回归风险分析或合并前质量把关时使用。

## 使用方式

先根据变更类型确定重点，再按下面顺序执行：

1. 用本文件确定评审顺序和输出结构。
2. 如需完整检查清单、反馈分级和 PR 描述要求，查看 `references/review-checklist.md`。
3. 结合当前技术栈的 `rules` 和相关 `skills` 输出最终结论。

## 评审顺序

1. 先确认改动目标、范围和关联需求，不要脱离上下文逐行挑风格。
2. 先找正确性、兼容性、安全性、数据风险，再看可读性和风格。
3. 结论必须落到“具体风险 + 触发条件 + 建议验证”。

## 必查项

- 需求是否完整落地，是否遗漏关键场景、失败路径或回滚路径
- 是否引入兼容性风险，包括接口、配置、数据、权限和租户边界
- 是否存在明显的安全、性能或并发问题
- 是否补足了与风险相匹配的验证，包括测试、日志、观测或人工验证步骤
- 代码结构是否沿用现有边界，是否引入不必要复杂度

## 详细参考

- 完整评审清单、反馈分级、自审流程：`references/review-checklist.md`

## 输出要求

- 优先列问题，不先写总结
- 每条问题都要说明影响面
- 如果没有发现问题，也要明确剩余风险和验证空白
