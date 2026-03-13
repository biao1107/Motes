package com.gym.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * RabbitMQ配置
 */
@Configuration
public class RabbitConfig {

    public static final String MATCH_RESULT_QUEUE = "notify.match.result";
    public static final String PUNCH_REMIND_QUEUE = "notify.punch.remind";

    @Bean
    public Queue matchResultQueue() {
        return new Queue(MATCH_RESULT_QUEUE, true);
    }

    @Bean
    public Queue punchRemindQueue() {
        return new Queue(PUNCH_REMIND_QUEUE, true);
    }

    /**
     * 配置消息转换器，允许反序列化 HashMap
     * 解决: java.lang.SecurityException: Attempt to deserialize unauthorized class java.util.HashMap
     */
    @Bean
    public SimpleMessageConverter simpleMessageConverter() {
        SimpleMessageConverter converter = new SimpleMessageConverter();
        // 允许反序列化的类白名单
        converter.setAllowedListPatterns(List.of("java.util.*", "java.lang.*"));
        return converter;
    }
}




