# golang-service-review

## 适用场景

当任务涉及 Go 服务代码评审、故障定位或交付风险分析时使用。

## 执行要求

1. 先梳理 handler、service、repository、client 等包的边界。
2. 检查 context、timeout、error wrapping、日志和指标埋点是否完整。
3. 标出可能引发回归的并发点、缓存点和外部依赖调用。
4. 输出必须明确已验证项、缺失验证项和上线观察点。

## 输出模板

- 评审范围
- 主要风险
- 验证与观察项
- 建议修正
- 结论
