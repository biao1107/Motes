package com.gym.config;

import com.gym.util.JwtUtils;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

import lombok.extern.slf4j.Slf4j;

/**
 * ============================================
 * WebSocket 握手拦截器（JWT 认证）
 * ============================================
 *
 * 【什么是 WebSocket 握手？】
 * WebSocket 连接不是直接建立的，而是先发送一个 HTTP 请求"升级"为 WebSocket。
 * 这个升级过程就叫"握手"（Handshake）。
 *
 * 就像打电话前要先拨号建立连接，
 * 握手就是 WebSocket 的"拨号"过程。
 *
 * 【为什么需要专门的握手拦截器？】
 * WebSocket 握手是一个特殊的 HTTP 请求，
 * 普通的 JwtAuthFilter 无法处理（因为路径不同）。
 * 所以我们需要 HandshakeInterceptor 在握手阶段进行认证。
 *
 * 【浏览器的限制】
 * 浏览器在创建 WebSocket 时，无法像普通 AJAX 那样自由设置 Header。
 * 虽然可以设置，但某些浏览器/环境下可能不可靠。
 * 因此本拦截器同时支持两种方式传 Token：
 * 1. Header: Authorization: Bearer xxx
 * 2. Query参数: ws://host/ws?token=xxx
 *
 * 【为什么不阻断失败的握手？】
 * 握手阶段只做"尝试认证"，把 userId 存入 attributes 供后续使用。
 * 真正的鉴权在 STOMP CONNECT 阶段通过 ChannelInterceptor 完成。
 * 这样设计是职责分离：握手只管建立连接，鉴权交给消息层。
 *
 * 【@RequiredArgsConstructor 的作用】
 * Lombok 自动生成包含所有 final 字段的构造器。
 * 这里用于注入 JwtUtils，符合 Spring 构造器注入的最佳实践。
 * ============================================
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    /**
     * JWT 工具类，用于解析 Token
     */
    private final JwtUtils jwtUtils;

    /**
     * 握手前执行：尝试解析 JWT 并提取 userId
     *
     * 【执行流程】
     * 1. 尝试从 Header 获取 Authorization
     * 2. 如果 Header 没有，尝试从 URL 查询参数获取 token
     * 3. 解析 JWT 获取 userId
     * 4. 将 userId 存入 attributes（后续 WebSocket 处理器可以获取）
     * 5. 返回 true 放行握手（无论认证成功与否）
     *
     * 【attributes 是什么？】
     * 这是一个 Map，用于在握手阶段传递数据给后续的 WebSocket 处理器。
     * 存入的数据可以在 WebSocketHandler 中通过 session.getAttributes() 获取。
     *
     * @param request    HTTP 握手请求
     * @param response   HTTP 握手响应
     * @param wsHandler  WebSocket 处理器
     * @param attributes 属性 Map，用于传递 userId 给后续处理器
     * @return true 表示放行握手，false 表示拒绝（本类永远返回 true）
     */
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        log.info("WebSocket握手开始，请求URL: {}", request.getURI());

        // 【第1步：尝试从 Header 获取 Authorization】
        // 标准做法：Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.xxx.yyy
        String auth = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        // 【第2步：如果 Header 没有，尝试从 URL 查询参数获取】
        // 兼容做法：ws://localhost:8080/ws?token=eyJhbGciOiJIUzI1NiJ9.xxx.yyy
        if (!StringUtils.hasText(auth)) {
            String query = request.getURI().getQuery();
            log.info("从Header中未找到Authorization，尝试从查询参数中获取token: {}", query);

            if (StringUtils.hasText(query)) {
                // 解析查询字符串：key1=value1&key2=value2
                for (String kv : query.split("&")) {
                    String[] parts = kv.split("=", 2);
                    // 找到 token=xxx 的参数
                    if (parts.length == 2 && "token".equals(parts[0])) {
                        auth = parts[1];
                        log.info("从查询参数中提取到token: {}", auth);
                        break;
                    }
                }
            }
        }

        try {
            // 【第3步：解析 JWT】
            if (StringUtils.hasText(auth)) {
                // 处理 "Bearer " 前缀（如果有）
                String token = auth.startsWith("Bearer ") ? auth.substring(7) : auth;
                log.info("解析token: {}", token);

                // 解析 JWT，获取 Claims
                Claims claims = jwtUtils.parse(token);

                // 【第4步：提取 userId 并存入 attributes】
                Long userId = Long.valueOf(claims.getSubject());
                log.info("解析出userId: {}", userId);

                // 存入 attributes，后续 WebSocket 处理器可以通过 session.getAttributes().get("userId") 获取
                attributes.put("userId", userId);
            } else {
                log.warn("未找到有效的认证信息");
            }

            // 【第5步：放行握手】
            // 无论是否解析出 userId，都返回 true 允许建立连接
            // 真正的鉴权在后续 STOMP CONNECT 阶段完成
            log.info("WebSocket握手完成");
            return true;

        } catch (Exception e) {
            // 解析失败（Token 无效或过期），记录错误但不断开连接
            log.error("WebSocket握手认证失败: ", e);
            return true;
        }
    }

    /**
     * 握手后执行
     *
     * 【作用】
     * 握手成功或失败后调用，通常用于资源清理或记录日志。
     * 本类不需要额外处理，所以是空实现。
     *
     * @param request   HTTP 握手请求
     * @param response  HTTP 握手响应
     * @param wsHandler WebSocket 处理器
     * @param exception 握手过程中抛出的异常（如果有）
     */
    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op：空操作，无需处理
    }
}




