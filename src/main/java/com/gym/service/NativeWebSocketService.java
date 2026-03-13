/**
 * ============================================
 * 原生 WebSocket 服务接口（用于小程序）
 * ============================================
 * 作用：
 * 定义向小程序原生 WebSocket 客户端推送消息的接口
 * 
 * 与 WebSocketService 的区别：
 * - WebSocketService：STOMP 协议，用于 H5
 * - NativeWebSocketService：原生 WebSocket，用于小程序
 * ============================================
 */
package com.gym.service;

import java.util.Map;

public interface NativeWebSocketService {
    
    /**
     * 推送消息给指定组的所有订阅者
     * @param groupId 组ID
     * @param message 消息内容
     */
    void sendToGroup(Long groupId, Map<String, Object> message);
    
    /**
     * 推送消息给指定用户
     * @param userId 用户ID
     * @param message 消息内容
     */
    void sendToUser(Long userId, Map<String, Object> message);
}
