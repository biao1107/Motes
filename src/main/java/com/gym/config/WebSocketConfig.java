package com.gym.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * ============================================
 * STOMP WebSocket 配置类（用于 H5/浏览器）
 * ============================================
 *
 * 【什么是 STOMP？】
 * STOMP（Simple Text Oriented Messaging Protocol）是一种简单的文本消息协议，
 * 类似 HTTP，但用于 WebSocket 消息通信。
 *
 * 就像 HTTP 有 GET/POST 方法和 URL 路径，
 * STOMP 有 SEND/SUBSCRIBE 命令和 destination 路径（如 /topic/chat）。
 *
 * 【为什么需要 STOMP？】
 * 原生 WebSocket 只提供传输层（类似 TCP），没有消息格式约定。
 * STOMP 在 WebSocket 之上定义了消息格式，提供：
 * - 订阅/发布模式（Pub/Sub）
 * - 点对点消息
 * - 消息确认机制
 *
 * 【本配置的作用】
 * 配置 STOMP 消息代理，定义消息路由规则，设置 WebSocket 端点。
 *
 * 【与 NativeWebSocketConfig 的区别】
 * - WebSocketConfig（本类）：使用 STOMP 协议，适合 H5/浏览器
 * - NativeWebSocketConfig：使用原生 WebSocket，适合小程序
 * 两者共存，分别处理不同客户端的连接。
 *
 * 【消息路径前缀说明】
 * - /topic/**：广播消息，所有订阅者都能收到（如群聊消息）
 * - /queue/**：点对点消息，只有特定用户能收到
 * - /user/**：用户专属路径，用于向指定用户发送消息
 * - /app/**：应用前缀，客户端发送消息时需加此前缀
 * ============================================
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * JWT 握手拦截器，在 WebSocket 握手阶段验证 Token
     */
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    /**
     * WebSocket 认证拦截器，在 STOMP 消息发送阶段验证权限
     */
    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    /**
     * 配置消息代理（Message Broker）
     *
     * 【什么是消息代理？】
     * 消息代理是 WebSocket 服务器的核心组件，负责：
     * 1. 接收客户端发送的消息
     * 2. 根据 destination 路由到正确的订阅者
     * 3. 管理订阅关系（谁订阅了哪个路径）
     *
     * 【配置说明】
     * - enableSimpleBroker("/topic", "/queue", "/user")：
     *   启用简单内存消息代理，支持这三个前缀的路径
     *
     * - setUserDestinationPrefix("/user")：
     *   设置用户专属路径前缀，用于 convertAndSendToUser
     *   例如：发送给用户 123 的消息会路由到 /user/123/queue/notifications
     *
     * - setApplicationDestinationPrefixes("/app")：
     *   设置应用前缀，客户端发送消息时需以 /app 开头
     *   例如：客户端发送 /app/chat，服务器 @MessageMapping("/chat") 接收
     *
     * @param config 消息代理配置对象
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 【启用简单消息代理】
        // 支持 /topic（广播）、/queue（点对点）、/user（用户专属）三种前缀
        config.enableSimpleBroker("/topic", "/queue", "/user");

        // 【设置用户路径前缀】
        // 用于向指定用户发送消息，如 messagingTemplate.convertAndSendToUser(userId, "/notify", msg)
        config.setUserDestinationPrefix("/user");

        // 【设置应用前缀】
        // 客户端发送消息的目标路径需以 /app 开头
        config.setApplicationDestinationPrefixes("/app");
    }

    /**
     * 配置客户端入站通道拦截器
     *
     * 【作用】
     * 在客户端发送 STOMP 消息到服务器时进行拦截，
     * 用于验证消息发送者的身份和权限。
     *
     * 【执行时机】
     * - CONNECT：客户端连接时
     * - SUBSCRIBE：客户端订阅时
     * - SEND：客户端发送消息时
     *
     * @param registration 通道注册对象
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // 添加认证拦截器，验证 STOMP 消息的发送者身份
        registration.interceptors(webSocketAuthInterceptor);
    }

    /**
     * 注册 STOMP WebSocket 端点
     *
     * 【什么是端点？】
     * 端点是客户端连接 WebSocket 的入口 URL，
     * 类似 HTTP 的接口地址，但用于 WebSocket 握手。
     *
     * 【本端点】
     * - URL：ws://localhost:8080/ws
     * - 协议：STOMP over WebSocket
     * - 适用：H5/浏览器客户端
     *
     * 【与 /ws/native 的区别】
     * - /ws：STOMP 协议，适合 H5
     * - /ws/native：原生 WebSocket，适合小程序
     *
     * @param registry STOMP 端点注册表
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")                           // WebSocket 端点 URL
                .addInterceptors(jwtHandshakeInterceptor)     // 添加握手拦截器（认证）
                .setAllowedOriginPatterns("*");               // 允许所有来源（开发环境）
    }
}