package com.gym.service;

import java.util.Map;

/**
 * WebSocket推送服务
 */
public interface WebSocketService {
    /**
     * 向组内所有成员推送消息
     */
    void sendToGroup(Long groupId, String message, Map<String, Object> data);

    /**
     * 向指定用户推送消息
     */
    void sendToUser(Long userId, String message, Map<String, Object> data);

    /**
     * 推送训练启动通知
     */
    void notifyTrainingStart(Long groupId, Long userId);

    /**
     * 推送训练进度更新
     */
    void notifyProgressUpdate(Long groupId, Long userId, int done, int target);

    /**
     * 推送放弃训练提醒
     */
    void notifyTrainingAbandon(Long groupId, Long userId);

    /**
     * 推送聊天消息
     */
    void notifyChatMessage(Long groupId, Map<String, Object> messageData);
    
    /**
     * 推送邀请通知
     */
    void notifyInvitation(Long fromUserId, Long toUserId, String fromUserName, String groupName);
}