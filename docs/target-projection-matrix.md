# Target Projection Matrix

## 目的

这份文档只回答一个问题：**同一份企业资产，最终应该投到哪个目标目录，才能在同机多工具场景下不重复、不串扰。**

这里讨论的是**投放目标目录**，不是仓库内部源资产目录。

---

## 基本原则

1. 源资产可以统一建模，投放目录必须按 target 原生发现机制决定。
2. 一份资产如果被多个工具兼容扫描，必须只选**一个共享落点**，不能重复镜像。
3. `skills`、`commands`、`rules`、`hooks` 是四种不同运行时语义，不能混投。
4. `OpenCode` 会兼容扫描部分 Claude / Agents 路径，因此它是同机冲突治理的关键约束。

---

## 四类资产投放矩阵

| 资产类型 | Claude | Codex | OpenCode | 推荐策略 |
|---|---|---|---|---|
| `rules` | `~/.claude/rules/*.md` | 项目根 `AGENTS.md` | `.opencode/instructions/*.md` 或项目根 `AGENTS.md` | `rules` 允许多投，但内容要分“原生规则”和“共享规则”两层 |
| `skills` | `~/.claude/skills/<name>/SKILL.md` | `~/.codex/skills/<name>/SKILL.md` | 会兼容扫描 `.opencode/skills`、`.claude/skills`、`.agents/skills` | `Claude + OpenCode` 共享 skill 时，只选一个落点，推荐 `~/.claude/skills` |
| `commands` | `~/.claude/commands/*.md` | 无统一原生命令目录 | `<project>/.opencode/commands/*.md` + `opencode.json.command` | `commands` 走各自原生目录，不共享 |
| `hooks` | `~/.claude/settings.json` + `~/.claude/iuap-rules-pack/hooks/*` | 当前无稳定原生 hook 入口 | `~/.config/opencode/plugins/*.js` + `~/.config/opencode/iuap-rules-pack/hooks/*` | `hooks` 完全按 target-specific runtime 投放，不共享目录 |

---

## Skill 投放结论

### 结论

如果一份 `skill` 同时要给 `Claude` 和 `OpenCode` 用，并且两边接受同一份 `SKILL.md` 格式，那么：

- **可以只投一份**
- **不需要再给 OpenCode 单独投一份**
- 共享落点推荐选：`~/.claude/skills/<name>/SKILL.md`

原因不是因为 `OpenCode` 自己的 skills 目录不能用，而是因为它会兼容扫描：

- `.opencode/skills`
- `~/.config/opencode/skills`
- `.claude/skills`
- `~/.claude/skills`
- `.agents/skills`
- `~/.agents/skills`

因此，一份共享 `skill` 一旦同时落到两个兼容扫描目录，就会造成重复发现或命名冲突。

### 单落点原则

对 `Claude + OpenCode` 共享 skill，执行下面这条即可：

- 只投 `~/.claude/skills/<name>/SKILL.md`
- 不再投 `.opencode/skills`
- 不再投 `.agents/skills`

### Codex

`Codex` 仍然单独投到：

- `~/.codex/skills/<name>/SKILL.md`

不要把 `Codex` 和 `Claude/OpenCode` 的 skill 落点混在一起。

---

## Command 投放结论

`commands` 不适合共享目录，因为：

- `Claude` 原生走 `~/.claude/commands`
- `OpenCode` 原生走 `.opencode/commands`
- `Codex` 没有与之等价的统一原生命令目录

因此：

- `Claude` command 只投 `~/.claude/commands`
- `OpenCode` command 只投 `.opencode/commands`
- 不把 command 当成 skill 镜像到兼容 skills 路径

---

## Rule 投放结论

`rules` 可以分成两层：

### 共享规则

适合跨 agent 共享的项目规则，可以统一维护在：

- 项目根 `AGENTS.md`

这类内容应该尽量是跨工具都能接受的通用约束。

### 原生规则

各 target 自己的始终加载规则，仍然走原生入口：

- Claude: `~/.claude/rules/*.md`
- OpenCode: `.opencode/instructions/*.md`
- Codex: 项目根 `AGENTS.md`

`rules` 可以多投，但必须避免把**完全相同的大段内容**同时复制到多个 always-on 通道，防止重复约束。

---

## Hook 投放结论

`hooks` 不存在跨工具共享目录这一说，必须按 target-specific runtime 落地：

- Claude: `settings.json` + hook script
- OpenCode: global plugin + hook script
- Codex: 当前没有稳定原生 hook 入口，暂不做共享设计

因此：

- 不要尝试把 hooks 投到 `.agents`
- 不要尝试让一个 hook 目录同时被多个 target 直接消费

---

## 同机多工具安全策略

### 推荐策略

| 目标 | 投放策略 |
|---|---|
| Claude | `rules -> ~/.claude/rules`，`skills -> ~/.claude/skills`，`commands -> ~/.claude/commands` |
| Codex | `rules -> AGENTS.md`，`skills -> ~/.codex/skills` |
| OpenCode | `rules -> AGENTS.md + .opencode/instructions`，`skills -> 复用 ~/.claude/skills`，`commands -> 当前仓库未投放`，`hooks -> ~/.config/opencode/plugins` |

### 不要这样做

- 同一份共享 skill 同时投到 `~/.claude/skills` 和 `.opencode/skills`
- 同一份共享 skill 同时投到 `~/.claude/skills` 和 `~/.agents/skills`
- 为了“多工具兼容”把 `commands` 再镜像到 skills 目录
- 把 hooks 当成共享目录资产处理

---

## 最终决策

对当前仓库，推荐采用以下默认策略：

1. `rules`：保留 target-native 投影，同时允许项目级 `AGENTS.md` 承载共享规则。
2. `skills`：`Claude + OpenCode` 共享一份，默认只投到 `~/.claude/skills`。
3. `commands`：继续按 target-native 目录投放，不共享。
4. `hooks`：继续按 target-specific runtime 投放，不共享。

这套策略的核心不是“所有工具都投一样”，而是：

**在保证原生体验的前提下，利用重叠扫描区做最小共享，并严格避免重复落点。**
