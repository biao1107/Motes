package com.gym.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * ============================================
 * 聊天消息数据传输对象（DTO）
 * ============================================
 * 
 * 【什么是 DTO？】
 * DTO = Data Transfer Object，数据传输对象
 * 用于在不同层之间传递数据，特别是给前端返回数据时使用。
 * 
 * 【DTO vs Entity 的区别】
 * - Entity（实体）：对应数据库表，包含所有字段，用于数据持久化
 * - DTO（传输对象）：给前端用的，只包含需要展示的字段
 * 
 * 【为什么要用 DTO？】
 * 1. 安全性：不暴露数据库内部字段（如密码、敏感信息）
 * 2. 灵活性：可以组合多个实体的字段
 * 3. 性能：只传输必要的数据，减少网络开销
 * 
 * 【这个 DTO 的用途】
 * 用于向前端返回聊天消息数据，包含消息的完整信息
 * 
 * 【字段与 Entity 的关系】
 * 这个 DTO 的字段与 ChatMessage 实体基本一致，
 * 因为聊天消息的所有字段都需要展示给用户。
 * ============================================
 */
@Data
public class ChatMessageDto {
    
    /**
     * 消息ID
     * 唯一标识一条消息
     */
    private Long id;
    
    /**
     * 群组ID
     * 表示这条消息属于哪个群组
     */
    private Long groupId;
    
    /**
     * 发送者用户ID
     * 表示这条消息是谁发的
     */
    private Long userId;
    
    /**
     * 发送者昵称
     * 显示在聊天界面上的名字
     */
    private String nickname;
    
    /**
     * 消息文本内容
     */
    private String content;
    
    /**
     * 图片URL
     * 如果是图片消息，这里是图片地址
     */
    private String imageUrl;
    
    /**
     * 消息类型
     * TEXT = 文本消息
     * IMAGE = 图片消息
     */
    private String type;
    
    /**
     * 创建时间（发送时间）
     */
    private LocalDateTime createTime;
}
