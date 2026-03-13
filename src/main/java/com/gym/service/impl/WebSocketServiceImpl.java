/**
 * ============================================
 * WebSocket 服务实现
 * ============================================
 * 作用：
 * 同时支持 STOMP（H5）和原生 WebSocket（小程序）的消息推送
 * ============================================
 */
package com.gym.service.impl;

import com.gym.service.NativeWebSocketService;
import com.gym.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketServiceImpl implements WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;
    
    /**
     * 原生 WebSocket 服务（用于小程序）
     */
    private final NativeWebSocketService nativeWebSocketService;

    @Override
    public void sendToGroup(Long groupId, String message, Map<String, Object> data) {
        // 1. 推送到 STOMP（H5 客户端）
        String destination = "/topic/group/" + groupId;
        Map<String, Object> payload = Map.of(
                "message", message,
                "data", data,
                "timestamp", System.currentTimeMillis()
        );
        messagingTemplate.convertAndSend(destination, payload);
        
        // 2. 推送到原生 WebSocket（小程序客户端）
        // 小程序端的消息格式与 STOMP 不同，直接发送 data 部分
        // 使用 HashMap 允许 null 值
        java.util.Map<String, Object> nativePayload = new java.util.HashMap<>();
        nativePayload.put("type", data.get("type"));
        nativePayload.put("message", message);
        nativePayload.put("userId", data.get("userId"));
        nativePayload.put("groupId", data.get("groupId"));
        nativePayload.put("done", data.get("done"));
        nativePayload.put("target", data.get("target"));
        nativePayload.put("progress", data.get("progress"));
        nativePayload.put("timestamp", System.currentTimeMillis());
        nativeWebSocketService.sendToGroup(groupId, nativePayload);
        
        log.info("发送群组消息: groupId={}, destination={}, 同时推送到小程序客户端", groupId, destination);
    }

    @Override
    public void sendToUser(Long userId, String message, Map<String, Object> data) {
        String destination = "/user/" + userId + "/notification";
        Map<String, Object> payload = Map.of(
                "message", message,
                "data", data,
                "timestamp", System.currentTimeMillis()
        );
        messagingTemplate.convertAndSendToUser(userId.toString(), "/notification", payload);
        
        // 推送到原生 WebSocket（小程序客户端）
        // 使用 HashMap 允许 null 值
        java.util.Map<String, Object> nativePayload = new java.util.HashMap<>();
        nativePayload.putAll(data);
        nativePayload.put("message", message);
        nativePayload.put("timestamp", System.currentTimeMillis());
        nativeWebSocketService.sendToUser(userId, nativePayload);
        
        log.info("发送用户消息: userId={}, message={}, destination={}, 同时推送到小程序客户端", userId, message, destination);
    }

    @Override
    public void notifyTrainingStart(Long groupId, Long userId) {
        Map<String, Object> data = Map.of(
                "type", "TRAINING_START",
                "userId", userId,
                "groupId", groupId,
                "timestamp", System.currentTimeMillis()
        );
        sendToGroup(groupId, "用户开始训练", data);
    }

    @Override
    public void notifyProgressUpdate(Long groupId, Long userId, int done, int target) {
        Map<String, Object> data = Map.of(
                "type", "PROGRESS_UPDATE",
                "userId", userId,
                "groupId", groupId,
                "done", done,
                "target", target,
                "progress", Math.round((double) done / target * 100),
                "timestamp", System.currentTimeMillis()
        );
        sendToGroup(groupId, "训练进度更新", data);
    }

    @Override
    public void notifyTrainingAbandon(Long groupId, Long userId) {
        Map<String, Object> data = Map.of(
                "type", "TRAINING_ABANDON",
                "userId", userId,
                "groupId", groupId,
                "timestamp", System.currentTimeMillis()
        );
        sendToGroup(groupId, "用户放弃训练提醒", data);
    }

    @Override
    public void notifyChatMessage(Long groupId, Map<String, Object> messageData) {
        String destination = "/topic/group/" + groupId + "/chat";
        messageData.put("type", "CHAT_MESSAGE");
        messageData.put("timestamp", System.currentTimeMillis());
        messagingTemplate.convertAndSend(destination, messageData);
        log.info("发送聊天消息: groupId={}", groupId);
    }

    @Override
    public void notifyInvitation(Long fromUserId, Long toUserId, String fromUserName, String groupName) {
        Map<String, Object> data = Map.of(
                "type", "INVITATION",
                "fromUserId", fromUserId,
                "toUserId", toUserId,
                "fromUserName", fromUserName,
                "groupName", groupName != null ? groupName : "健身搭子组",
                "timestamp", System.currentTimeMillis()
        );
        sendToUser(toUserId, fromUserName + " 邀请你加入 " + groupName, data);
    }
}