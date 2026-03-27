# 结构说明

`iuap-rules-pack` 现在以“可安装模块 + 多 target 投放”为中心组织，而不是只围绕某一个 agent 的目录结构。

## 顶层结构

```text
common/
  hooks/
  rules/
  skills/
scripts/
  validate-structure.mjs
stacks/
  java/
    hooks/
    rules/
    skills/
  golang/
    hooks/
    rules/
    skills/
```

## 为什么这样设计

因为安装时不需要自动识别技术栈，而是由用户显式指定:

```bash
iuap-rules-pack install --stack java --target claude
iuap-rules-pack install --stack java,golang --target claude,codex,opencode
```

这意味着安装器只需要:

1. 永远安装 `common/`
2. 再安装用户指定的 `stacks/<stack>/`
3. 根据 `--target` 把同一份资产投到不同运行时的原生入口

这样目录和安装逻辑一一对应，复杂度最低。

## 安装后的投放原则

- `common/rules/core.md` -> `~/.claude/rules/core.md`
- `stacks/java/rules/java-backend.md` -> `~/.claude/rules/java-backend.md`
- `common + stack rules` -> `<project>/AGENTS.md` managed block for Codex
- `common + stack rules` -> `<project>/.opencode/instructions/iuap-rules-pack.md`
- `common/skills/enterprise-delivery` -> `~/.claude/commands/enterprise-delivery.md`
- `stacks/golang/skills/service-delivery` -> `~/.codex/skills/service-delivery/`
- `stacks/*/skills/*` -> `~/.claude/skills/<skill>/SKILL.md`（供 OpenCode 复用）

## 后续方向

- 新增技术栈时，只需要新增 `stacks/<stack>/`
- 已支持 Claude hook 的脚本投放和 `settings.json` 合并
- 补齐 hooks 的 Codex / OpenCode target-specific 投影
- 后续可以继续补 `status`、`uninstall`、`doctor` 之类命令
