# Git Workflow Conventions

## 分支命名规范

| 类型 | 模式 | 用途 |
| --- | --- | --- |
| feature | `feature/{task-id}-{description}` | 新功能 |
| bugfix | `bugfix/{task-id}-{description}` | Bug 修复 |
| hotfix | `hotfix/{task-id}-{description}` | 紧急生产修复 |
| release | `release/{version}` | 发布准备 |

示例：

```text
feature/TASK-001-add-user-auth
bugfix/TASK-002-fix-login-error
hotfix/TASK-003-security-patch
release/v1.2.0
```

## 提交消息标准

格式：

```text
{type}({scope}): {subject}

{body}

{footer}
```

常见类型：

| 类型 | 说明 |
| --- | --- |
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档 |
| style | 代码格式 |
| refactor | 重构 |
| test | 测试 |
| chore | 构建/工具 |
| perf | 性能优化 |

## 预提交检查

- [ ] `git status` 确认没有意外文件
- [ ] `git diff --check` 确认没有冲突标记
- [ ] 本地测试、lint、构建已按项目要求执行
- [ ] 提交粒度合理，没有把无关改动混入

## 合并工作流

建议在合并前先同步目标分支并处理冲突：

```bash
git checkout main
git pull origin main
git checkout feature/TASK-001-add-user-auth
git rebase main
```

合并策略选择：

| 策略 | 场景 |
| --- | --- |
| Merge commit | 需要保留完整分支历史 |
| Squash merge | 希望将零散提交压成一次提交 |
| Rebase | 需要线性历史，但要避免在共享分支改写历史 |

## 冲突解决

1. 用 `git status` 找到冲突文件
2. 手工处理 `<<<<<<<`、`=======`、`>>>>>>>`
3. `git add <file>`
4. `git rebase --continue` 或 `git merge --continue`

## 反模式

- 直接在 `main` 或共享分支上堆开发改动
- 提交消息写成 `fix bug`、`update`
- 把调试日志、临时文件和不相关改动一起提交
- 对共享分支使用强推
