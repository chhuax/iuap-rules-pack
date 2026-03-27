# iuap-rules-pack

`iuap-rules-pack` 是一个企业规则包仓库，用来沉淀并分发企业级 `rules`、`skills`、`hooks`。它面向 Claude、Codex、OpenCode 三类运行时，按“公共层 + 技术栈层”的方式组织资产，并通过 CLI 自动投放到各自的原生入口。

当前仓库已经提供可直接使用的自安装命令。它同时被设计成 `praxis-devos` 的附属包，后续可以由 `praxis-devos` 提供统一入口来调用本仓库的安装器。

## 当前状态

- 已支持从本仓库直接安装
- 已支持 `common + stacks/<stack>` 组合安装
- 已支持 `claude / codex / opencode` 三类基础投影
- 已支持 Claude hooks 的实际投放
- 已支持 OpenCode hooks 的全局 plugin 投放
- Codex hooks 仍处于后续补齐阶段

## 目录结构

```text
iuap-rules-pack/
├── common/
│   ├── hooks/
│   ├── rules/
│   └── skills/
├── stacks/
│   ├── golang/
│   │   ├── hooks/
│   │   ├── rules/
│   │   └── skills/
│   └── java/
│       ├── hooks/
│       ├── rules/
│       └── skills/
├── bin/
├── scripts/
├── src/
├── docs/
├── package.json
└── README.md
```

## 设计原则

- 不做技术栈自动检测
- 用户安装时通过 `--stack` 显式选择技术栈
- 仓库按“公共层 + 技术栈层”组织，方便安装器按模块投放
- 每个模块内部再细分为 `rules/`、`skills/`、`hooks/`
- 投放时保留原始 `rule/skill` 名称，不额外添加统一前缀

## 当前内置内容

### Common

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

### Java

- `stacks/java/rules`
  - `java-backend.md`
  - `java-code-review.md`
  - `java-database-change.md`
- `stacks/java/skills`
  - `spring-delivery`
  - `java-code-review`
  - `java-database-change`
  - `yms-i18n`
- `stacks/java/hooks`
  - `java-quality-gate`
  - `java-exception-i18n`

### Golang

- `stacks/golang/rules`
  - `golang-backend.md`
  - `golang-service-review.md`
  - `golang-concurrency.md`
- `stacks/golang/skills`
  - `service-delivery`
  - `golang-service-review`
  - `golang-concurrency-check`
- `stacks/golang/hooks`
  - `golang-quality-gate`

## 投放矩阵

| Target | Rules | Skills | Hooks |
|---|---|---|---|
| Claude | `~/.claude/rules/*.md` | `~/.claude/commands/*.md` | 合并到 `~/.claude/settings.json`，脚本安装到 `~/.claude/iuap-rules-pack/hooks/` |
| Codex | 项目根 `AGENTS.md` 受管区块 | `~/.codex/skills/<skill>/SKILL.md` | 预留 target-specific 投影 |
| OpenCode | `<project>/.opencode/instructions/iuap-rules-pack.md` | 复用 `~/.claude/skills/<skill>/SKILL.md` 作为共享 skills 落点 | `~/.config/opencode/plugins/*.js` 与 `~/.config/opencode/iuap-rules-pack/hooks/*` |

## 快速开始

### 1. 直接从 Git 仓库安装

只安装到 Claude:

```bash
npx -y git+ssh://git@github.com/chhuax/iuap-rules-pack.git install --stack java --target claude
```

同时安装到 Claude、Codex、OpenCode:

```bash
npx -y git+ssh://git@github.com/chhuax/iuap-rules-pack.git install \
  --stack java,golang \
  --target claude,codex,opencode \
  --opencode-home ~/.config/opencode \
  --project-root /path/to/project
```

更新已安装内容:

```bash
npx -y git+ssh://git@github.com/chhuax/iuap-rules-pack.git update \
  --stack java \
  --target claude,codex \
  --project-root /path/to/project
```

### 2. 全局安装后复用命令

```bash
npm install -g git+ssh://git@github.com/chhuax/iuap-rules-pack.git
```

```bash
iuap-rules-pack install --stack java --target claude
iuap-rules-pack update --stack golang --target codex,opencode --project-root /path/to/project
iuap-rules-pack list-stacks
iuap-rules-pack list-targets
```

## 命令说明

### `install`

执行首次安装或重新投放。

```bash
iuap-rules-pack install --stack <stack[,stack...]> --target <target[,target...]> [--project-root <path>] [--claude-home <path>] [--codex-home <path>] [--opencode-home <path>] [--dry-run]
```

### `update`

按当前选择的技术栈与目标重新投放，覆盖已由本包管理的旧文件。

```bash
iuap-rules-pack update --stack <stack[,stack...]> --target <target[,target...]> [--project-root <path>] [--claude-home <path>] [--codex-home <path>] [--opencode-home <path>] [--dry-run]
```

### `list-stacks`

列出当前仓库支持的技术栈。

```bash
iuap-rules-pack list-stacks
```

### `list-targets`

列出当前安装器支持的 target。

```bash
iuap-rules-pack list-targets
```

## 参数约定

- `--stack` 必填，当前支持 `java`、`golang`
- `--target` 必填，当前支持 `claude`、`codex`、`opencode`
- `--project-root` 在涉及 `codex` 或 `opencode` 时建议显式传入
- `--claude-home`、`--codex-home`、`--opencode-home` 主要用于测试或自定义目录
- `--dry-run` 只输出投放计划，不实际写入文件

## 安装结果与更新行为

安装器会自动：

- 始终安装 `common/`
- 再安装用户选择的 `stacks/<stack>/`
- 为每个 target 生成对应的原生投影
- 将安装清单写入 `~/.claude/iuap-rules-pack/install-manifest.json`

重复执行 `install` 或 `update` 时，会按 manifest 覆盖同一 target 下由本包管理的旧投影。

如果选择多个技术栈，则包内的 `rule/skill/hook` 名称必须唯一；一旦冲突，安装器会直接报错，不做覆盖。

## 与 Praxis DevOS 的关系

这个仓库被设计成 `praxis-devos` 的附属包，但需要区分“当前已实现”和“后续规划”。

### 当前已实现

- 安装器实现位于当前仓库
- 用户可以直接通过 `npx git+ssh://...` 或全局安装后的 `iuap-rules-pack` 命令完成安装
- `praxis-devos` 当前还没有集成本仓库的统一封装命令

### 规划中的 Praxis 入口

后续可以在 `praxis-devos` 中增加一个薄封装入口，例如：

```bash
npx praxis-devos install-rules git+ssh://git@github.com/chhuax/iuap-rules-pack.git --stack java --target claude
```

这里的职责边界是：

- `iuap-rules-pack` 负责包格式、资产内容和 target-specific 投影逻辑
- `praxis-devos` 负责统一入口、规则包管理、状态检查、后续 `sync / doctor / uninstall` 等工作流

当前请以本仓库自带安装命令为准，不要把 `praxis-devos install-rules` 视为已经落地的现成功能。

## 开发与验证

运行结构校验和所有投放测试：

```bash
npm run check
```

单独运行测试：

```bash
npm test
```

当前测试覆盖：

- Claude 的 `rules / commands / hook scripts / settings.json`
- Codex 的 `AGENTS.md` 托管区块和 `~/.codex/skills`
- OpenCode 的 `.opencode/instructions`、共享 `~/.claude/skills`、`opencode.json` 和全局 `plugins`

CI 配置见 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)。

## 推荐扩展方式

1. 公共规范放到 `common/`
2. 每新增一个技术栈，就增加 `stacks/<stack>/`
3. 模块内部统一保持 `rules/`、`skills/`、`hooks/`
4. 只有 target-specific projector 才决定最终落到哪个运行时目录
