package com.gym.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * ============================================
 * Redis 核心配置类
 * ============================================
 *
 * 【什么是 RedisTemplate？】
 * RedisTemplate 是 Spring 提供的 Redis 操作工具，类似 JDBC 中的 JdbcTemplate。
 * 通过它可以方便地执行 set、get、delete 等 Redis 操作，
 * 而不需要手动管理连接和序列化。
 *
 * 【为什么需要自定义配置？】
 * Spring Boot 默认提供的 RedisTemplate<Object, Object> 使用 JDK 序列化，
 * 存储的数据在 Redis 中是乱码（二进制格式），不可读且不跨语言兼容。
 *
 * 本配置自定义了序列化方式：
 * - Key   → String 格式（可读的字符串，如 "punch:123:456:2024-01-01"）
 * - Value → JSON 格式（可读的 JSON，如 {"name":"张三","score":100}）
 *
 * 【@ConditionalOnClass 是什么？】
 * 这个注解表示"只有当 RedisTemplate 类存在于 classpath 时，才创建这个配置"。
 * 作用是防止在没有引入 Redis 依赖的情况下报错。
 * 因为我们的 pom.xml 已引入 spring-boot-starter-data-redis，
 * 所以这个条件永远成立，配置一定生效。
 * ============================================
 */
@Configuration
@ConditionalOnClass(RedisTemplate.class)
public class ConditionalRedisConfig {

    /**
     * 创建 RedisTemplate Bean，配置序列化方式
     *
     * 【什么是序列化？】
     * Redis 只能存储字节（byte[]），不能直接存 Java 对象或字符串。
     * 序列化就是把 Java 数据转换成字节的过程，反序列化则是反过来。
     *
     * 【序列化方案说明】
     * ┌────────────┬──────────────────────────────┬───────────────────┐
     * │  数据类型   │      序列化器                  │  存储示例          │
     * ├────────────┼──────────────────────────────┼───────────────────┤
     * │ Key（键）   │ StringRedisSerializer        │ "punch:123:456"   │
     * │ Value（值） │ GenericJackson2JsonSerializer │ {"done":3}        │
     * │ Hash Key   │ StringRedisSerializer        │ "field_name"      │
     * │ Hash Value │ GenericJackson2JsonSerializer │ "value_content"   │
     * └────────────┴──────────────────────────────┴───────────────────┘
     *
     * 【什么是 Hash？】
     * Redis 的 Hash 类似 Java 的 HashMap，一个 key 下存多个 field:value 对。
     * 本项目用 Hash 存储训练进度，如：
     *   key: "train:progress:1:2024-01-01"
     *   field: "userId123" → value: "3/5"（已完成3组/共5组）
     *
     * @param factory Redis 连接工厂（由 Spring Boot 自动创建，读取 application.yml 配置）
     * @return 配置好序列化方式的 RedisTemplate
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();

        // 【第1步：绑定连接工厂】
        // RedisConnectionFactory 负责管理与 Redis 服务器的连接
        // 底层使用 Lettuce 客户端，支持连接池和异步操作
        template.setConnectionFactory(factory);

        // 【第2步：配置 Key 的序列化器】
        // Key 使用纯字符串格式，方便在 Redis 客户端（如 RedisInsight）中直接查看
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);       // 普通 key
        template.setHashKeySerializer(stringSerializer);   // Hash 类型的 field

        // 【第3步：配置 Value 的序列化器】
        // Value 使用 JSON 格式，存储时自动序列化，读取时自动反序列化
        // GenericJackson2JsonRedisSerializer 会在 JSON 中保存类型信息，
        // 这样反序列化时能还原为正确的 Java 类型（而不是 LinkedHashMap）
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();
        template.setValueSerializer(jsonSerializer);       // 普通 value
        template.setHashValueSerializer(jsonSerializer);   // Hash 类型的 value

        // 【第4步：完成初始化】
        // afterPropertiesSet 会检查配置是否完整，并做必要的初始化工作
        template.afterPropertiesSet();

        return template;
    }
}