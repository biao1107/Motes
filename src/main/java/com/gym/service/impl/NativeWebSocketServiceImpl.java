/**
 * ============================================
 * 原生 WebSocket 服务实现（用于小程序）
 * ============================================
 * 作用：
 * 实现向小程序原生 WebSocket 客户端推送消息
 * 
 * 通过 NativeWebSocketHandler 实际发送消息
 * ============================================
 */
package com.gym.service.impl;

import com.gym.config.NativeWebSocketHandler;
import com.gym.service.NativeWebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NativeWebSocketServiceImpl implements NativeWebSocketService {

    private final NativeWebSocketHandler nativeWebSocketHandler;

    @Override
    public void sendToGroup(Long groupId, Map<String, Object> message) {
        nativeWebSocketHandler.sendToGroup(groupId, message);
    }

    @Override
    public void sendToUser(Long userId, Map<String, Object> message) {
        nativeWebSocketHandler.sendToUser(userId, message);
    }
}
