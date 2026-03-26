# Hooks

这里存放项目级 hook 脚本。

建议约定:

- 使用可移植脚本，优先 `bash`
- 保持无副作用，默认只做检查和提示
- 命名直接表达用途，例如 `pre-commit-check.sh`

如果后续要接入 Git Hooks、CI 或代理运行时，可以在这里继续扩展。
