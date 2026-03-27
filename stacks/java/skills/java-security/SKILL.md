---
name: java-security
description: Use when implementing or reviewing Java and Spring security-sensitive code such as authentication, authorization, input handling, file upload, encryption, or sensitive data processing.
---

# Java Security

## 适用场景

当任务涉及认证授权、输入处理、文件上传、敏感信息处理、反序列化、加密算法或外部系统接入时使用。

## 使用方式

1. 先识别这次是“输入验证 / 认证授权 / 文件上传 / 敏感信息 / 依赖安全”里的哪一类风险。
2. 再查看 `references/security-guidelines.md` 获取禁用模式、示例和基线要求。
3. 输出时区分阻塞问题、建议修复和后续验证项。

## 关注点

- 输入是否经过类型校验、白名单校验或参数化处理
- 权限、租户和资源边界是否被正确校验，没有被绕过或放宽
- 文件和脚本入口是否受控，避免路径穿越、命令注入和恶意内容上传
- 敏感信息是否只在必要范围内使用，并避免出现在日志、异常和响应中

## 详细参考

- 输入校验、密码安全、XSS/CSRF、文件上传、会话与依赖安全：`references/security-guidelines.md`

## 执行清单

1. 先列出不可信输入从哪里来、流向哪里、在哪一层被校验。
2. 明确认证、授权、租户隔离和审计链路是否都还成立。
3. 检查密码、token、密钥和加密算法是否符合当前基线。
4. 输出时区分阻塞问题、建议修复和需要补充的验证或扫描项。
