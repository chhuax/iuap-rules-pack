# 企业规则包架构设计

## 背景

Praxis DevOS v0.3 使用 `stacks/` 目录在项目级维护企业技术栈规则。该方案存在根本问题：

- 每个项目复制一份规则，更新时逐个同步，维护成本高
- 规则和 skills 混在一起，全部塞进 `.praxis/`，加载策略无法区分轻重
- 依赖 AI 主动读取 `.praxis/skills/` 中的内容，触发不可靠

v0.4 删除了 stacks，用户级投影解决了 OpenSpec 命令和 SuperPowers 的分发问题。企业规则需要一套独立的分发机制。

## 核心思路

企业规则从企业内部仓库统一安装，投影到各 agent 的原生通道。升级时统一拉取，无需逐项目维护。

## 企业规则包结构

当前 `iuap-rules-pack` 原型采用“公共层 + 技术栈层”的目录，而不是把所有资产直接平铺在根目录：

```text
iuap-rules-pack/
├── common/
│   ├── rules/
│   ├── skills/
│   └── hooks/
└── stacks/
    ├── java/
    │   ├── rules/
    │   ├── skills/
    │   └── hooks/
    └── golang/
        ├── rules/
        ├── skills/
        └── hooks/
```

抽象上仍然是三类资产：

```
@company/java-standards/
├── package.json              # name, version, praxis 声明
├── rules/                    # 始终加载（必须精简）
│   ├── coding-essentials.md  # 编码红线，~20 行
│   └── security-redlines.md  # 安全底线，~15 行
├── skills/                   # 按需加载（可以详细）
│   ├── i18n/SKILL.md         # 多语处理流程
│   ├── java-database/SKILL.md
│   ├── java-security/SKILL.md
│   └── java-review/SKILL.md
└── hooks/                    # 机制触发（最强保障）
    ├── post-edit-i18n.json   # 编辑后检测中文硬编码
    └── pre-commit-security.json
```

### 三种资产的区别

| 类型 | 加载时机 | 体量要求 | 触发可靠性 | 适用场景 |
|---|---|---|---|---|
| **Rules** | 始终加载 | 必须精简（< 1KB/文件） | 最高（始终在上下文中） | 编码红线���命名规范 |
| **Skills** | 用户显式触发或门控触发 | 可以详细（~5KB/文件） | 中（依赖触发时机） | 数据库模式、安全审计、评审标准 |
| **Hooks** | 运行时机制自动触发 | 脚本级 | 最高（不依赖 AI 配合） | i18n 检测、提交前安全扫描 |

### 判断标准

- **一句话能说清的约束** → Rule（如"禁止空 catch 块"）
- **需要详细指引的流程** → Skill（如"JPA 事务管理最佳实践"）
- **每次写代码都必须执行的检查** → Hook + Skill（hook 检测并提醒，skill 提供详细流程）

## 安装与投影

### 安装命令

```bash
npx praxis-devos install-rules @company/java-standards
npx praxis-devos install-rules @company/java-standards --registry https://npm.company.com
npx praxis-devos install-rules git+https://git.company.com/standards/java.git
```

### 投影目标

```
企业包资产            Claude Code                          Codex                                   OpenCode
────────────────────────────────────────────────────────────────────────────────────────────────────────────────
rules/*.md          ~/.claude/rules/<原文件名>.md         项目根 AGENTS.md 托管区块                .opencode/instructions/*.md
skills/*/SKILL.md   ~/.claude/commands/<skill>.md         ~/.codex/skills/<skill>/SKILL.md        .opencode/commands/*.md + opencode.json.command
hooks/*.json        ~/.claude/settings.json               预留 Codex-specific hooks / notify        预留 .opencode/plugins/*.ts
```

说明：

- Claude Code 的原生通道最完整，所以 `rules + commands + hooks` 都可以直接投影
- Codex 当前原型采取 “`AGENTS.md + ~/.codex/skills/`” 模式
- OpenCode 当前原型采取 “`.opencode/instructions + .opencode/commands + opencode.json`” 模式
- Codex / OpenCode hooks 能力需要按各自模型单独映射，不能直接照搬 Claude 的 hooks.json 结构

### 投影文件标记

```markdown
<!-- PRAXIS_RULES_PACKAGE source=@company/java-standards version=1.2.0 asset=rules/coding-essentials.md -->
```

标记让 `sync` 知道哪些文件来自哪个包，可以做版本对比和更新。

## 更新机制

```bash
# 检查已安装的规则包是否有新版本
npx praxis-devos doctor

# 拉取最新版并刷新投影
npx praxis-devos sync

# 或显式升级某个包
npx praxis-devos install-rules @company/java-standards@latest
```

- `sync` 读取已安装包的版本信息，与 registry/repo 对比
- 有新版本时自动拉取并重新投影
- 投影文件有标记，只更新 Praxis 管理的文件，不覆盖用户自建文件

## 已安装包的元数据

```json
// 当前原型: ~/.claude/iuap-rules-pack/install-manifest.json
{
  "packageVersion": "0.2.0",
  "selectedStacks": ["java"],
  "selectedTargets": ["claude", "codex", "opencode"],
  "targets": {
    "claude": { "entries": [] },
    "codex": { "entries": [] },
    "opencode": { "entries": [] }
  }
}
```

## Hook 详细设计

### Hook 定义格式

```json
// hooks/post-edit-i18n.json
{
  "event": "PostToolUse",
  "matcher": "Edit|Write",
  "command": "grep -rl '[\\u4e00-\\u9fff]' \"$CLAUDE_FILE_PATH\" && echo 'ATTENTION: 检测到中文硬编码，请运行 /java-i18n 处理多语' || true",
  "description": "编辑文件后检测中文硬编码，提醒运行 i18n skill"
}
```

### 投影方式

Praxis 将 hook 定义合并到 `.claude/settings.json` 的 `hooks` 字段中，标记来源以便管理：

```jsonc
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "...",
        "_praxis_source": "@company/java-standards/hooks/post-edit-i18n.json"
      }
    ]
  }
}
```

### Hook vs Rule vs Skill 触发链

以 i18n 多语为例的完整触发链：

```
开发者编辑代码文件
    │
    ▼
Hook 检测到中文硬编码（机制触发，100% 可靠）
    │
    ▼
提示 AI: "检测到中文硬编码，请运行 /java-i18n"
    │
    ▼
AI 加载 java-i18n skill（~5KB 详细流程）
    │
    ▼
执行多语处理：提取中文 → 翻译 → 注册资源文件 → 替换为方法调用
```

## 与现有流程的关系

```
┌─────────────────────────────────────┐
│  企业 Rules（~1KB，始终在上下文中）   │  ← 自动加载
│  ~/.claude/rules/*.md               │     编码红线、安全底线
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│           AI 工作上下文              │
│                                     │
│  写代码 → 自动遵守企业红线          │
│  review → Rule 约束 + Skill ��细流程│
│  Hook 触发 → 强制执行检查           │
└─────────────��────▲──────────────────┘
                   │
┌──────────────────┴──────────────────┐
│  Praxis 托管区（~0.5KB，路由+门控）  │  ← 自动加载
│  CLAUDE.md / AGENTS.md              │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│  OpenSpec 命令 + 企业 Skills         │  ← 显式/Hook 触发
│  ~/.claude/commands/opsx-*.md       │
│  ~/.claude/commands/*.md            │
└─────────────────────────────────────┘
```

三层互不侵入：
- **企业 Rules** 通过 agent 原生 rules 通道始终生效
- **企业 Skills** 通过 agent 原生 commands 通道按需加载
- **企业 Hooks** 通过 agent 原生 hooks 机制自动触发
- **Praxis 托管区** 只负责框架级路由和门控

## 实施阶段

### 阶段一（当前）
- 定义企业包格式规范（common/、stacks/、rules/、skills/、hooks/）
- 实现独立于 `praxis-devos` 的企业包安装器
- 实现 Claude / Codex / OpenCode 三套基础投影

### 阶段二
- 实现 hooks 投影（合并到 .claude/settings.json）
- 实现 Codex hooks / notify 投影
- 实现 OpenCode plugin hooks 投影
- 完善版本对比与自动更新

### 阶段三
- 支持多个企业包共存（命名空间隔离）
- 支持包依赖关系（A 包依赖 B 包的 rules）
- 在 `praxis-devos` 中提供薄封装入口，例如 `install-rules`

## 开放问题

1. **包格式**：纯 npm 包？还是支持裸 git repo？还是两者都支持？
2. **Hook 跨 agent 兼容**：Codex 和 OpenCode 是否支持类似 Claude Code 的 hook 机制？如果不支持，降级为 rule 提醒？
3. **冲突处理**：两个企业包定义了冲突的 rules 怎么办？后安装覆盖？还是报错？
4. **项目级覆盖**：企业包是用户级的，项目需要覆盖某条规则时怎么处理？
