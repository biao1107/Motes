package com.gym.controller.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 群组未读消息详情DTO
 */
@Data
public class GroupUnreadDto {
    private Long groupId;
    private String groupName;
    private Integer unreadCount;
    private String lastMessage;
    private String lastMessageType;
    private LocalDateTime lastMessageTime;
    private Long lastMessageUserId;
    private String lastMessageNickname;
}
