package com.gym.ai.service;

public interface AiUnifiedChatService {

    String chat(Long userId, Integer memoryId, String message, String imageUrl);
}
