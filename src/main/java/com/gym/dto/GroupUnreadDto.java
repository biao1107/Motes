package com.gym.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * ============================================
 * 群组未读消息详情 DTO
 * ============================================
 * 
 * 【这个 DTO 的用途】
 * 用于消息列表页面，展示每个群组的未读情况和最新消息。
 * 就像微信的消息列表，显示每个群的名字、未读红点、最后一条消息。
 * 
 * 【使用场景】
 * 用户打开"消息"页面时，后端返回这个 DTO 的列表，
 * 前端用这个数据渲染消息列表。
 * 
 * 【字段设计说明】
 * 这个 DTO 组合了多个数据源的信息：
 * - 群组信息：groupId、groupName
 * - 未读统计：unreadCount
 * - 最新消息：lastMessage、lastMessageTime、lastMessageUserId 等
 * 
 * 【为什么需要这么多 lastMessage 字段？】
 * 消息列表需要显示：
 * - 消息内容（或 [图片]）
 * - 发送时间
 * - 发送者昵称
 * 这些信息一起构成消息预览。
 * ============================================
 */
@Data
public class GroupUnreadDto {
    
    /**
     * 群组ID
     * 唯一标识一个群组
     */
    private Long groupId;
    
    /**
     * 群组名称
     * 显示在消息列表上的群组名字
     */
    private String groupName;
    
    /**
     * 未读消息数量
     * 显示在群组名称旁边的红点数字
     * 0 表示没有未读消息
     */
    private Integer unreadCount;
    
    /**
     * 最新消息内容
     * 显示在群组名称下方的消息预览
     * 如果是图片消息，显示 "[图片]"
     */
    private String lastMessage;
    
    /**
     * 最新消息类型
     * TEXT = 文本消息
     * IMAGE = 图片消息
     * 用于前端判断如何显示消息预览
     */
    private String lastMessageType;
    
    /**
     * 最新消息发送时间
     * 显示在消息列表右侧的时间
     * 用于排序（最新的消息排在最上面）
     */
    private LocalDateTime lastMessageTime;
    
    /**
     * 最新消息发送者ID
     * 发送者的用户ID
     */
    private Long lastMessageUserId;
    
    /**
     * 最新消息发送者昵称
     * 显示在消息预览前面，如 "张三: 消息内容"
     */
    private String lastMessageNickname;
}
