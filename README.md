# iuap-rules-pack

IUAP 企业定制规则包项目，用于沉淀团队自己的 `rules`、`skills`、`hooks`，并通过 npm / Git 仓库命令自动投放到 Claude、Codex、OpenCode。

## 目录结构

```text
iuap-rules-pack/
├── common/                   # 所有技术栈共享资产
│   ├── hooks/
│   ├── rules/
│   └── skills/
├── stacks/                   # 按技术栈组织的可安装模块
│   ├── golang/
│   │   ├── hooks/
│   │   ├── rules/
│   │   └── skills/
│   └── java/
│       ├── hooks/
│       ├── rules/
│       └── skills/
├── bin/                      # CLI 入口
├── src/                      # 安装器实现
├── docs/                     # 设计说明、接入文档、演进记录
├── hooks/                    # 仓库自身的校验脚本，不是投放目标资产
├── .gitignore
├── package.json
└── README.md
```

## 组织原则

- 这个仓库不做技术栈自动检测
- 用户安装时通过 `--stack` 显式选择技术栈
- 仓库目录直接按“公共层 + 技术栈层”组织，方便安装器按模块投放
- 每个模块内部再分 `rules/`、`skills/`、`hooks/`

## 当前内置内容

- `common/rules`
  - `core.md`
  - `security-redlines.md`
  - `release-readiness.md`
- `common/skills`
  - `enterprise-delivery`
  - `change-impact-analysis`
  - `release-readiness`
- `common/hooks`
  - `protect-config-files`
  - `pre-push-reminder`
- `stacks/java`
  - 规则: `java-backend.md`、`java-code-review.md`、`java-database-change.md`
  - skills: `spring-delivery`、`java-code-review`、`java-database-change`
  - hooks: `java-quality-gate`
- `stacks/golang`
  - 规则: `golang-backend.md`、`golang-service-review.md`、`golang-concurrency.md`
  - skills: `service-delivery`、`golang-service-review`、`golang-concurrency-check`
  - hooks: `golang-quality-gate`
- 仓库结构校验脚本: `hooks/pre-commit-check.sh`

## 投放目标

- `claude`
  - rules -> `~/.claude/rules/*.md`
  - skills -> `~/.claude/commands/*.md`
  - hooks -> 合并到 `~/.claude/settings.json`，并把脚本安装到 `~/.claude/iuap-rules-pack/hooks/`
- `codex`
  - rules -> 项目根目录 `AGENTS.md` 受管控区块
  - skills -> `~/.codex/skills/<skill>/SKILL.md`
  - hooks -> 预留 Codex 特定投影能力
- `opencode`
  - rules -> `<project>/.opencode/instructions/iuap-rules-pack.md`
  - skills -> `<project>/.opencode/commands/*.md`
  - hooks -> 预留 OpenCode plugin 投影能力

## 安装方式

一次性直接从 Git 仓库执行:

```bash
npx -y git+ssh://git@github.com/chhuax/iuap-rules-pack.git install --stack java --target claude
npx -y git+ssh://git@github.com/chhuax/iuap-rules-pack.git install --stack java,golang --target claude,codex,opencode --project-root /path/to/project
```

也可以先全局安装，再重复执行更新:

```bash
npm install -g git+ssh://git@github.com/chhuax/iuap-rules-pack.git
iuap-rules-pack install --stack java --target claude
iuap-rules-pack update --stack java,golang --target claude,codex,opencode --project-root /path/to/project
```

安装器会自动把:

- `common/` 作为所有 target 的基础层
- `stacks/<stack>/` 作为按技术栈选择的附加层
- 投放时保留原始 `rule/skill` 名称，不额外添加统一前缀
- 安装清单写入 `~/.claude/iuap-rules-pack/install-manifest.json`
- 当前第一批 hook 已经可投放到 Claude；Codex / OpenCode 的 hook 投影仍是后续补齐项

重复执行 `install` 或 `update` 时，会按 manifest 覆盖对应 target 的旧投影，达到更新效果。
如果选择多个技术栈，包内的 `rule/skill/hook` 名称必须保持唯一，否则安装器会直接报冲突。

## 推荐扩展方式

1. 公共规范放到 `common/`
2. 每新增一个技术栈，就增加 `stacks/<stack>/`
3. 模块内部统一保持 `rules/`、`skills/`、`hooks/`
4. 安装器永远只做两件事: 复制 `common/` 和复制用户选中的 `stacks/<stack>/`
