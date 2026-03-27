# Java Database Guidelines

## 强制规则

### 基础规范

1. 所有业务表必须带 `ytenant_id` 字段
   - 类型建议 `varchar(36)`
   - `NOT NULL`
   - 应建立租户相关索引
2. 表名长度建议不超过 48 字符。
3. 禁止使用数据库关键字和保留字。
4. 对象名统一使用小写字母、数字、下划线。
5. 临时表、备份表、待删除表应使用前缀：
   - `tmp_{YYYYMMDD}_表名`
   - `bak_{YYYYMMDD}_表名`
   - `del_{YYYYMMDD}_表名`

### 常用数据类型建议

| Java 类型 | 数据库类型建议 | 说明 |
| --- | --- | --- |
| Boolean | smallint | 0=false, 1=true |
| Integer | int |  |
| Long | bigint |  |
| String | varchar(36) | 主键、外键或编码 |
| String | varchar(255) | 普通字符串 |
| String | text/clob | 大文本 |
| BigDecimal | decimal(20,8) | 金额 |
| Date/Timestamp | timestamp/datetime | 时间 |

## SQL 编写规范

### 性能优化规则

1. WHERE 条件尽量命中索引，避免全表扫描。
2. 避免隐式类型转换。
3. 避免三层以上嵌套循环和无必要的笛卡尔积。
4. 必须使用预编译和绑定变量。
5. 避免 `SELECT *`，只查需要字段。
6. `IN` 列表不宜超过 1000 个元素。
7. 逻辑删除字段应与核心过滤条件建立联合索引。

### 常见禁止模式

```sql
-- ❌ 禁止动态拼接 SQL
SELECT * FROM table WHERE name = '${param}'

-- ❌ 不推荐用 OR 串大量同字段条件
WHERE a = 1 OR a = 2 OR a = 3

-- ❌ 禁止左模糊
WHERE name LIKE '%abc'

-- ✅ 更合理
WHERE name LIKE 'abc%'

-- ❌ 禁止在过滤字段上做函数
WHERE DATE(create_time) = '2024-01-01'

-- ✅ 更合理
WHERE create_time >= '2024-01-01' AND create_time < '2024-01-02'
```

## 索引设计

1. 区分度高的字段优先建索引。
2. 联合索引遵循最左前缀原则。
3. 联合索引字段建议不超过 5 个，最多不超过 7 个。
4. 单表索引总数建议不超过 5 个。
5. 禁止重复索引和无业务意义索引。

索引命名建议：

```text
i_表名_字段名_字段名
```

## 分页规范

优先使用框架或统一分页工具，避免手写多数据库差异 SQL：

```java
PageHelper.startPage(pageNum, pageSize);
var users = userMapper.selectUsers();
```

## 多数据库适配

需要特别留意：

1. 数据类型差异
2. 分页语法差异
3. 日期函数差异
4. 自增 / 序列差异

推荐优先使用 MyBatis Plus、统一 DAO 框架或项目封装的多数据库适配工具，而不是在业务代码里散落方言判断。
