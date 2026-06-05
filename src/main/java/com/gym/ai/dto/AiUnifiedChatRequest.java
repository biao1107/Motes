package com.gym.ai.dto;

import lombok.Data;

@Data
public class AiUnifiedChatRequest {

    private Integer memoryId = 1;

    private String message;

    private String imageUrl;
}
