/**
 * ============================================
 * 原生 WebSocket 配置（用于小程序）
 * ============================================
 * 作用：
 * 为小程序提供原生 WebSocket 支持（不使用 STOMP 协议）
 * 
 * 与 STOMP WebSocket 的区别：
 * - STOMP WebSocket (/ws)：使用 STOMP 协议，适合 H5
 * - 原生 WebSocket (/ws/native)：纯文本/JSON 通信，适合小程序
 * 
 * 小程序连接方式：
 * wx.connectSocket({ url: 'ws://localhost:8080/ws/native?token=xxx' })
 * ============================================
 */
package com.gym.config;

import com.gym.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
@Slf4j
public class NativeWebSocketConfig implements WebSocketConfigurer {

    private final NativeWebSocketHandler nativeWebSocketHandler;
    private final JwtUtils jwtUtils;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(nativeWebSocketHandler, "/ws/native")
                .addInterceptors(new JwtHandshakeInterceptor(jwtUtils))  // JWT 认证
                .setAllowedOriginPatterns("*");
        
        log.info("原生 WebSocket 端点已注册: /ws/native");
    }
}
