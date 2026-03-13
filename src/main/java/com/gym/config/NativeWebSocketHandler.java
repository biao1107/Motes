/**
 * ============================================
 * 原生 WebSocket 处理器（用于小程序）
 * ============================================
 * 作用：
 * 处理小程序的原生 WebSocket 连接、消息接收和推送
 * 
 * 协议设计：
 * 1. 连接：ws://host:port/ws/native?token=xxx
 * 2. 订阅组：发送 { "action": "subscribe", "groupId": 8 }
 * 3. 接收消息：服务器推送 JSON 消息
 * 4. 心跳：客户端定期发送 { "action": "ping" }
 * ============================================
 */
package com.gym.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class NativeWebSocketHandler extends TextWebSocketHandler {

    /**
     * 存储所有连接的会话
     * key: sessionId, value: WebSocketSession
     */
    private static final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    /**
     * 存储用户ID到会话的映射
     * key: userId, value: sessionId
     */
    private static final Map<Long, String> userSessions = new ConcurrentHashMap<>();
    
    /**
     * 存储会话订阅的组
     * key: sessionId, value: groupId
     */
    private static final Map<String, Long> sessionGroups = new ConcurrentHashMap<>();
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 连接建立后
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        Long userId = getUserIdFromSession(session);
        
        sessions.put(sessionId, session);
        if (userId != null) {
            userSessions.put(userId, sessionId);
        }
        
        log.info("原生 WebSocket 连接建立: sessionId={}, userId={}, 当前连接数={}", 
                sessionId, userId, sessions.size());
        
        // 发送连接成功消息
        sendMessage(session, Map.of(
            "type", "CONNECTED",
            "message", "连接成功",
            "sessionId", sessionId
        ));
    }

    /**
     * 收到文本消息
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        String sessionId = session.getId();
        
        log.debug("收到消息: sessionId={}, payload={}", sessionId, payload);
        
        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String action = (String) data.get("action");
            
            switch (action) {
                case "subscribe":
                    handleSubscribe(session, data);
                    break;
                case "unsubscribe":
                    handleUnsubscribe(session);
                    break;
                case "ping":
                    sendMessage(session, Map.of("type", "pong", "timestamp", System.currentTimeMillis()));
                    break;
                default:
                    log.warn("未知 action: {}", action);
            }
        } catch (Exception e) {
            log.error("处理消息失败: {}", payload, e);
            sendMessage(session, Map.of("type", "ERROR", "message", "消息格式错误"));
        }
    }

    /**
     * 处理订阅请求
     */
    private void handleSubscribe(WebSocketSession session, Map<String, Object> data) {
        String sessionId = session.getId();
        Object groupIdObj = data.get("groupId");
        
        if (groupIdObj == null) {
            sendMessage(session, Map.of("type", "ERROR", "message", "缺少 groupId"));
            return;
        }
        
        Long groupId = Long.valueOf(groupIdObj.toString());
        sessionGroups.put(sessionId, groupId);
        
        log.info("用户订阅组频道: sessionId={}, groupId={}", sessionId, groupId);
        
        sendMessage(session, Map.of(
            "type", "SUBSCRIBED",
            "groupId", groupId,
            "message", "订阅成功"
        ));
    }

    /**
     * 处理取消订阅
     */
    private void handleUnsubscribe(WebSocketSession session) {
        String sessionId = session.getId();
        Long groupId = sessionGroups.remove(sessionId);
        
        log.info("用户取消订阅: sessionId={}, groupId={}", sessionId, groupId);
        
        sendMessage(session, Map.of("type", "UNSUBSCRIBED", "message", "取消订阅成功"));
    }

    /**
     * 连接关闭后
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        Long userId = getUserIdFromSession(session);
        
        sessions.remove(sessionId);
        sessionGroups.remove(sessionId);
        if (userId != null) {
            userSessions.remove(userId);
        }
        
        log.info("原生 WebSocket 连接关闭: sessionId={}, userId={}, 当前连接数={}", 
                sessionId, userId, sessions.size());
    }

    /**
     * 发送消息给指定会话
     */
    private void sendMessage(WebSocketSession session, Map<String, Object> message) {
        if (!session.isOpen()) {
            return;
        }
        
        try {
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            log.error("发送消息失败: sessionId={}", session.getId(), e);
        }
    }

    /**
     * 从 session 中获取用户ID
     */
    private Long getUserIdFromSession(WebSocketSession session) {
        Object userId = session.getAttributes().get("userId");
        return userId != null ? Long.valueOf(userId.toString()) : null;
    }

    // ==================== 对外提供的消息推送方法 ====================

    /**
     * 推送消息给指定组的所有订阅者
     */
    public void sendToGroup(Long groupId, Map<String, Object> message) {
        int count = 0;
        for (Map.Entry<String, Long> entry : sessionGroups.entrySet()) {
            if (entry.getValue().equals(groupId)) {
                WebSocketSession session = sessions.get(entry.getKey());
                if (session != null && session.isOpen()) {
                    sendMessage(session, message);
                    count++;
                }
            }
        }
        log.debug("推送给组 {} 的消息已发送给 {} 个客户端", groupId, count);
    }

    /**
     * 推送消息给指定用户
     */
    public void sendToUser(Long userId, Map<String, Object> message) {
        String sessionId = userSessions.get(userId);
        if (sessionId != null) {
            WebSocketSession session = sessions.get(sessionId);
            if (session != null && session.isOpen()) {
                sendMessage(session, message);
            }
        }
    }
}
