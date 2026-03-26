# iuap-rules-pack

IUAP 企业定制规则包项目，用于沉淀团队自己的 `rules`、`skills`、`hooks` 与配套文档。

## 目录结构

```text
iuap-rules-pack/
├── docs/                     # 设计说明、接入文档、演进记录
├── hooks/                    # 可执行 hook 脚本
├── rules/                    # 企业规则正文
├── skills/                   # 企业定制 skill
├── .gitignore
├── package.json
└── README.md
```

## 初始约定

- `rules/` 放企业级规范，例如研发流程、安全基线、发布要求
- `skills/` 放可被代理直接消费的能力卡片，每个 skill 独立目录并包含 `SKILL.md`
- `hooks/` 放自动校验和辅助脚本
- `docs/` 放背景说明、接入方式和维护约定

## 当前内置内容

- 一个企业基础规则示例: `rules/core.md`
- 一个企业交付 skill 示例: `skills/enterprise-delivery/SKILL.md`
- 一个基础校验 hook: `hooks/pre-commit-check.sh`

## 建议下一步

1. 把你们现有的研发规范拆进 `rules/`
2. 把常见工作流抽成 `skills/`
3. 把必须自动化校验的动作放进 `hooks/`
4. 之后再补 CI、版本发布和安装方式
