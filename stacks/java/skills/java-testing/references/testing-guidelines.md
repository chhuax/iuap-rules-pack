# Java Testing Guidelines

## 测试分层

- 单元测试：测试单个 Service、Mapper、Util，默认不启动 Spring 上下文，依赖由 Mockito 提供。
- 切片测试：针对 `@WebMvcTest`、`@DataJpaTest` 等局部边界。
- 集成测试：针对关键业务链路使用 `@SpringBootTest` 做全链路验证。

## JUnit 5 模式

```java
class OrderServiceTest {

    @Test
    @DisplayName("下单：下单成功时返回订单 ID")
    void should_return_order_id_when_order_success() {
        // ...
    }

    @Nested
    @DisplayName("取消订单场景")
    class CancelOrderTests {
        @Test
        @DisplayName("已支付订单取消失败")
        void should_fail_when_order_already_paid() {
            // ...
        }
    }
}
```

推荐使用 AssertJ 做断言：

```java
assertThat(user.getName()).isEqualTo("Alice");
assertThat(orderList).hasSize(2).contains(order1, order2);
```

## Mockito 使用

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void should_save_user() {
        User user = new User("Bob");
        when(userRepository.save(any(User.class))).thenReturn(user);

        userService.register(user);

        verify(userRepository, times(1)).save(user);
    }
}
```

## Spring Boot Test

- 集成测试可使用 `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)`
- 数据准备建议使用 `@Sql` 或独立测试数据库

Web 切片测试示例：

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void should_return_200_for_valid_order() throws Exception {
        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }
}
```

## 命名与结构

- 命名建议：`should_预期结果_when_前提条件`
- 结构建议：Given / When / Then

## 覆盖率要求

- 核心业务逻辑：增量覆盖率建议 ≥ 80%
- Controller 路由层：增量覆盖率建议 ≥ 70%
- 公共工具类：增量覆盖率建议 ≥ 90%
- 配置类：通常不强制

JaCoCo 示例：

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.80</minimum>
                    </limit>
                </limits>
            </rule>
        </rules>
    </configuration>
</plugin>
```

## 红线

- 禁止用 `@Disabled` 掩盖失败测试
- 测试之间不得互相依赖
- 测试应可重复运行，不受时间和脏数据偶然性影响
