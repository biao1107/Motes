package com.gym.controller.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatMessageDto {
    private Long id;
    private Long groupId;
    private Long userId;
    private String nickname;
    private String content;
    private String imageUrl;
    private String type;
    private LocalDateTime createTime;
}