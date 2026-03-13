package com.gym.config;

import com.gym.entity.User;
import com.gym.mapper.UserMapper;
import com.gym.util.JwtUtils;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.List;

import lombok.extern.slf4j.Slf4j;

/**
 * WebSocket认证拦截器：
 * - 处理 WebSocket STOMP 协议的认证
 * - 在连接时验证 token 并设置用户身份
 * - 确保在处理消息时用户身份可用
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtils jwtUtils;
    private final UserMapper userMapper;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();
        
        log.info("处理STOMP消息: {}", command);
        
        // 处理连接请求
        if (StompCommand.CONNECT.equals(command)) {
            handleConnectCommand(accessor);
        } else if (StompCommand.SEND.equals(command) || StompCommand.SUBSCRIBE.equals(command)) {
            // 对于SEND和SUBSCRIBE命令，从头部获取token并设置认证信息
            handleSendMessageCommand(message); // 注意：这里传入原始消息
        }
        
        return message;
    }

    /**
     * 处理CONNECT命令 - 验证用户身份并设置认证信息
     */
    private void handleConnectCommand(StompHeaderAccessor accessor) {
        // 尝试从header中获取认证令牌
        String token = getAuthToken(accessor);
        
        if (StringUtils.hasText(token)) {
            try {
                // 解析JWT令牌
                Claims claims = jwtUtils.parse(token);
                Long userId = Long.valueOf(claims.getSubject());
                log.info("解析出用户ID: {}", userId);
                
                // 查询用户信息
                User user = userMapper.selectById(userId);
                if (user != null) {
                    // 创建认证对象
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole());
                    Principal principal = new UsernamePasswordAuthenticationToken(userId, null, List.of(authority));
                    
                    // 设置用户身份到消息访问器
                    accessor.setUser(principal);
                    log.info("用户认证成功: {}", userId);
                } else {
                    log.warn("未找到用户信息，用户ID: {}", userId);
                }
            } catch (Exception e) {
                log.error("令牌解析失败: ", e);
            }
        } else {
            log.warn("未找到认证令牌");
        }
    }

    /**
     * 处理SEND和SUBSCRIBE命令 - 从头部获取token并设置认证信息
     */
    private void handleSendMessageCommand(Message<?> message) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        
        // 尝试从header中获取认证令牌
        String token = getAuthToken(accessor);
        
        if (StringUtils.hasText(token)) {
            try {
                // 解析JWT令牌
                Claims claims = jwtUtils.parse(token);
                Long userId = Long.valueOf(claims.getSubject());
                log.info("解析出用户ID: {}", userId);
                
                // 查询用户信息
                User user = userMapper.selectById(userId);
                if (user != null) {
                    // 创建认证对象
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole());
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userId, null, List.of(authority));
                    
                    // 设置用户身份到消息访问器
                    accessor.setUser(authentication);
                    log.info("设置消息访问器用户身份: {}", userId);
                    
                    // 重要：更新消息头以确保用户身份能传递到消息处理器
                    MessageHeaderAccessor headerAccessor = MessageHeaderAccessor.getAccessor(message, MessageHeaderAccessor.class);
                    if (headerAccessor != null) {
                        headerAccessor.setHeader("user", authentication);
                    }
                } else {
                    log.warn("未找到用户信息，用户ID: {}", userId);
                }
            } catch (Exception e) {
                log.error("令牌解析失败: ", e);
            }
        } else {
            log.warn("未找到认证令牌");
        }
    }

    /**
     * 从STOMP头部获取认证令牌
     */
    private String getAuthToken(StompHeaderAccessor accessor) {
        // 首先尝试从Authorization头部获取
        String auth = accessor.getFirstNativeHeader("Authorization");
        if (StringUtils.hasText(auth)) {
            log.info("从Authorization头部获取令牌");
            return auth.startsWith("Bearer ") ? auth.substring(7) : auth;
        }
        
        // 如果没有，尝试从token头部获取
        auth = accessor.getFirstNativeHeader("token");
        if (StringUtils.hasText(auth)) {
            log.info("从token头部获取令牌");
            return auth;
        }
        
        return null;
    }
}