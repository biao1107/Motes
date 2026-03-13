package com.gym.service;

import com.gym.dto.ChatMessageDto;
import com.gym.dto.GroupUnreadDto;

import java.util.List;

/**
 * ============================================
 * 聊天服务接口
 * ============================================
 * 
 * 【什么是服务接口？】
 * 服务接口定义了聊天功能的所有操作，就像餐厅的菜单，
 * 列出了所有可以点的菜（方法），但具体怎么做由后厨（实现类）负责。
 * 
 * 【为什么要定义接口？】
 * 1. 解耦：控制器只依赖接口，不依赖具体实现
 * 2. 可测试：可以轻松模拟（Mock）接口进行单元测试
 * 3. 可扩展：未来可以换不同的实现方式
 * 
 * 【核心功能】
 * 1. 发送消息：保存消息到数据库
 * 2. 获取历史：查询群组的聊天记录
 * 3. 未读统计：计算用户有多少未读消息
 * 4. 已读管理：标记消息为已读
 * ============================================
 */
public interface ChatService {
    
    /**
     * 发送聊天消息到群组
     * 
     * 【功能说明】
     * 将消息保存到数据库，并返回包含ID的消息对象
     * 
     * 【参数说明】
     * @param groupId   群组ID
     * @param userId    发送者用户ID
     * @param nickname  发送者昵称
     * @param content   消息文本内容
     * @param imageUrl  图片URL（图片消息时使用）
     * @param type      消息类型（TEXT/IMAGE）
     * 
     * @return 包含数据库生成ID的消息DTO
     */
    ChatMessageDto sendGroupMessage(Long groupId, Long userId, String nickname, 
                                     String content, String imageUrl, String type);

    /**
     * 获取群组聊天历史记录
     * 
     * 【功能说明】
     * 查询指定群组的聊天记录，按时间正序返回（旧消息在前）
     * 
     * 【参数说明】
     * @param groupId 群组ID
     * @param limit   返回消息数量限制
     * 
     * @return 消息列表（按时间正序）
     */
    List<ChatMessageDto> getGroupChatHistory(Long groupId, int limit);

    /**
     * 获取最新的聊天消息
     * 
     * 【功能说明】
     * 获取指定消息ID之后的新消息，用于下拉刷新或长轮询
     * 
     * 【参数说明】
     * @param groupId      群组ID
     * @param lastMessageId 客户端已有的最后一条消息ID
     * 
     * @return 新消息列表
     */
    List<ChatMessageDto> getLatestMessages(Long groupId, Long lastMessageId);

    /**
     * 获取用户所有群组的未读消息总数
     * 
     * 【功能说明】
     * 统计用户在所有群组中的未读消息数量
     * 
     * 【计算逻辑】
     * 遍历用户加入的所有群组，统计每个群组中：
     * - 发送时间晚于用户最后阅读时间的消息
     * - 排除自己发送的消息
     * 
     * @param userId 用户ID
     * @return 未读消息总数
     */
    int getUnreadMessageCount(Long userId);

    /**
     * 获取用户所有群组的未读消息详情
     * 
     * 【功能说明】
     * 返回每个群组的未读数量、最新消息等信息
     * 用于消息列表页面展示
     * 
     * @param userId 用户ID
     * @return 群组未读详情列表
     */
    List<GroupUnreadDto> getUnreadMessageDetail(Long userId);

    /**
     * 标记用户在群组的消息为已读
     * 
     * 【功能说明】
     * 更新用户在该群组的最后阅读时间为当前时间
     * 之后查询未读消息时，此时间之前的消息不再计入未读
     * 
     * @param groupId 群组ID
     * @param userId  用户ID
     */
    void markMessagesAsRead(Long groupId, Long userId);
    
    /**
     * 重置用户在群组的阅读状态
     * 
     * 【功能说明】
     * 将最后阅读时间设为当前时间，效果与 markMessagesAsRead 相同
     * 提供此方法是为了语义清晰：重置状态 vs 标记已读
     * 
     * @param groupId 群组ID
     * @param userId  用户ID
     */
    void resetUserReadStatus(Long groupId, Long userId);
}
