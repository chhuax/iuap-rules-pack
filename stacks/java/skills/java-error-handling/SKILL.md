---
name: java-error-handling
description: Use when defining Java service exception patterns, global handlers, error response contracts, or user-facing message behavior.
---

# Java Error Handling

## 适用场景

当任务涉及业务异常建模、全局异常处理、错误码设计、接口错误响应或用户可见报错文案时使用。

## 使用方式

1. 先用本文件判断当前问题属于“异常建模 / 全局兜底 / 响应契约 / 用户文案”中的哪一类。
2. 再查看 `references/error-handling-guidelines.md` 获取错误码、响应结构、日志要求和禁止模式。
3. 如果涉及中文异常硬编码，结合 `yms-i18n` 决定是否需要立即处理。

## 关注点

- 异常是否按参数错误、业务失败、系统故障分层表达
- 对外响应是否稳定、可观测，且不泄露底层实现细节
- 日志是否保留必要上下文，但避免重复打点和敏感信息泄露
- 用户可见中文报错是否需要接入多语处理

## 详细参考

- 异常码格式、统一响应、公共异常码、日志要求：`references/error-handling-guidelines.md`

## 执行清单

1. 先识别异常的归属边界：接口层、服务层、基础设施层分别承担什么责任。
2. 明确哪些异常应直接返回业务语义，哪些应统一转成兜底错误。
3. 说明错误响应字段、日志位置、traceId 传递和审计要求。
4. 如果存在中文硬编码异常，按项目流程决定是否触发 `yms-i18n`。
