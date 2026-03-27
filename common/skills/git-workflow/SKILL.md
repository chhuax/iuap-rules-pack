---
name: git-workflow
description: Use when creating branches, preparing commits, deciding merge or rebase strategy, or finishing a change in a collaborative git repository.
---

# Git 工作流

## 适用场景

当任务涉及建分支、整理提交、准备 PR、处理冲突、合并分支或收尾发布时使用。

## 使用方式

1. 用本文件判断当前处于“建分支 / 提交 / 合并 / 冲突解决”的哪个阶段。
2. 需要具体命名规范、提交格式或合并命令时，查看 `references/git-conventions.md`。
3. 结合当前仓库规则决定是否需要拆提交、补验证或调整合并策略。

## 基本要求

1. 分支要表达任务意图，避免在主分支直接堆开发改动。
2. 提交消息使用 Conventional Commits，标题能独立说明变更意图。
3. 提交前先看 `git diff --staged`，确认没有把调试代码、临时文件和无关改动带进去。
4. 合并策略要和仓库现状一致，不在共享分支上随意改写历史。

## 常用检查

- 改动是否按功能边界拆成可读的提交
- 提交说明是否包含影响范围和验证方式
- 冲突解决后是否重新跑过必要验证
- 合并前是否已经补齐评审意见、测试证据和回滚关注点

## 详细参考

- 分支命名、提交模板、rebase 与冲突解决：`references/git-conventions.md`

## 输出要求

- 给出建议的分支名、提交类型或合并策略
- 明确哪些提交应拆分，哪些改动不该进入本次提交
