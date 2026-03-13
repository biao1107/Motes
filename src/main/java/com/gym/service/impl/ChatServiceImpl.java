package com.gym.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.gym.dto.ChatMessageDto;
import com.gym.dto.GroupUnreadDto;
import com.gym.entity.ChatMessage;
import com.gym.entity.GroupMember;
import com.gym.dto.GroupDetailDto;
import com.gym.mapper.ChatMessageMapper;
import com.gym.mapper.GroupMemberMapper;
import com.gym.service.ChatService;
import com.gym.service.GroupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ============================================
 * 聊天服务实现类
 * ============================================
 * 
 * 【什么是聊天服务？】
 * 这个类负责处理群组聊天的核心业务逻辑。
 * 就像邮局，负责接收、存储、分发消息。
 * 
 * 【核心功能】
 * 1. 消息存储：将聊天消息保存到数据库
 * 2. 历史查询：获取群组的聊天记录
 * 3. 未读统计：计算用户有多少未读消息
 * 4. 已读管理：更新用户的阅读状态
 * 
 * 【未读消息计算原理】
 * 系统不直接记录"哪些消息未读"，而是记录"用户最后阅读时间"。
 * 未读消息 = 发送时间 > 最后阅读时间 的消息（排除自己发的）
 * 
 * 这种设计的优点：
 * - 不需要为每条消息记录每个用户的已读状态
 * - 存储效率高，查询简单
 * 
 * 【数据库表】
 * - t_chat_message：存储聊天消息
 * - t_group_member：存储群组成员关系（包含 last_read_time 字段）
 * ============================================
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    // ==================== 依赖注入 ====================
    
    /**
     * 聊天消息 Mapper
     * 用于操作 t_chat_message 表
     */
    private final ChatMessageMapper chatMessageMapper;
    
    /**
     * 群组成员 Mapper
     * 用于查询用户的群组关系和更新阅读时间
     */
    private final GroupMemberMapper groupMemberMapper;
    
    /**
     * 群组服务
     * 用于获取群组详情信息
     */
    private final GroupService groupService;

    /**
     * 发送群组聊天消息
     * 
     * 【流程】
     * 1. 创建消息实体对象
     * 2. 设置消息属性（群组、用户、内容、类型等）
     * 3. 保存到数据库
     * 4. 转换为 DTO 返回（包含数据库生成的 ID）
     * 
     * @param groupId   群组ID
     * @param userId    发送者用户ID
     * @param nickname  发送者昵称
     * @param content   消息内容
     * @param imageUrl  图片URL
     * @param type      消息类型（TEXT/IMAGE）
     * @return 包含ID的消息DTO
     */
    @Override
    public ChatMessageDto sendGroupMessage(Long groupId, Long userId, String nickname, 
                                            String content, String imageUrl, String type) {
        try {
            // 【第1步：创建消息实体】
            ChatMessage message = new ChatMessage();
            message.setGroupId(groupId);
            message.setUserId(userId);
            message.setNickname(nickname);
            message.setContent(content);
            message.setImageUrl(imageUrl);
            // 默认消息类型为文本
            message.setType(type != null ? type : "TEXT");
            message.setCreateTime(LocalDateTime.now());
            
            log.debug("准备插入聊天消息: groupId={}, userId={}, content={}", groupId, userId, content);
            
            // 【第2步：保存到数据库】
            // MyBatis-Plus 的 insert 方法会自动填充主键 ID
            int result = chatMessageMapper.insert(message);
            
            log.debug("数据库插入结果: {}, 生成的ID: {}", result, message.getId());
            
            if (result <= 0) {
                throw new RuntimeException("插入聊天消息失败");
            }
            
            // 【第3步：转换为 DTO 返回】
            // DTO 与实体的区别：DTO 是给前端用的，实体是给数据库用的
            ChatMessageDto messageDto = new ChatMessageDto();
            messageDto.setId(message.getId());           // 数据库生成的主键
            messageDto.setGroupId(groupId);
            messageDto.setUserId(userId);
            messageDto.setNickname(nickname);
            messageDto.setContent(content);
            messageDto.setImageUrl(imageUrl);
            messageDto.setType(type != null ? type : "TEXT");
            messageDto.setCreateTime(message.getCreateTime());
            
            log.info("发送聊天消息成功: groupId={}, userId={}", groupId, userId);
            return messageDto;
        } catch (Exception e) {
            log.error("保存聊天消息失败: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 获取群组聊天历史记录
     * 
     * 【查询逻辑】
     * 1. 按时间倒序查询（最新的消息在前）
     * 2. 限制返回数量
     * 3. 反转列表（使旧消息在前，便于前端显示）
     * 
     * 【为什么要反转？】
     * 数据库查询是倒序（最新在前），但聊天界面需要正序（旧消息在上）。
     * 所以先倒序查询获取最新的N条，再反转为正序返回。
     * 
     * @param groupId 群组ID
     * @param limit   返回消息数量限制
     * @return 消息列表（按时间正序）
     */
    @Override
    public List<ChatMessageDto> getGroupChatHistory(Long groupId, int limit) {
        log.debug("查询群组聊天历史: groupId={}, limit={}", groupId, limit);
        
        try {
            // 【第1步：查询消息】
            // 按创建时间倒序，获取最新的消息
            List<ChatMessage> messages = chatMessageMapper.selectList(
                new LambdaQueryWrapper<ChatMessage>()
                    .eq(ChatMessage::getGroupId, groupId)
                    .orderByDesc(ChatMessage::getCreateTime)
            );
            
            // 【第2步：限制数量】
            // 使用 stream 的 limit 方法截取前 N 条
            messages = messages.stream().limit(limit).collect(Collectors.toList());
            
            log.debug("查询到聊天消息数量: {}", messages.size());
            
            // 【第3步：转换为 DTO 并反转顺序】
            List<ChatMessageDto> result = messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
            
            // 反转列表：最新在前 → 旧消息在前
            java.util.Collections.reverse(result);
            
            log.debug("返回消息数量: {}", result.size());
            return result;
        } catch (Exception e) {
            log.error("查询群组聊天历史失败: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 获取最新消息
     * 
     * 【使用场景】
     * 用户在聊天页面时，通过轮询或下拉刷新获取新消息
     * 
     * 【查询逻辑】
     * 查询 ID 大于 lastMessageId 的消息
     * 
     * @param groupId       群组ID
     * @param lastMessageId 客户端已有的最后一条消息ID
     * @return 新消息列表
     */
    @Override
    public List<ChatMessageDto> getLatestMessages(Long groupId, Long lastMessageId) {
        log.debug("查询最新消息: groupId={}, lastMessageId={}", groupId, lastMessageId);
        
        // 查询 ID 大于 lastMessageId 的消息，按时间正序
        List<ChatMessage> messages = chatMessageMapper.selectList(
            new LambdaQueryWrapper<ChatMessage>()
                .eq(ChatMessage::getGroupId, groupId)
                .gt(ChatMessage::getId, lastMessageId)  // ID 大于 lastMessageId
                .orderByAsc(ChatMessage::getCreateTime)  // 按时间正序
        );
        
        log.debug("查询到最新消息数量: {}", messages.size());
        
        return messages.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    /**
     * 获取用户未读消息总数
     * 
     * 【计算逻辑】
     * 1. 获取用户加入的所有群组
     * 2. 遍历每个群组，统计未读消息数
     * 3. 未读消息 = 发送时间 > 最后阅读时间 且 发送者不是自己
     * 
     * 【注意事项】
     * - 如果群组已被删除，跳过该群组
     * - 如果用户没有阅读记录，使用加入群组时间作为基准
     * 
     * @param userId 用户ID
     * @return 未读消息总数
     */
    @Override
    public int getUnreadMessageCount(Long userId) {
        log.debug("计算用户未读消息数: userId={}", userId);

        // 【第1步：获取用户加入的所有群组】
        List<GroupMember> memberships = groupMemberMapper.selectList(
            new LambdaQueryWrapper<GroupMember>()
                .eq(GroupMember::getUserId, userId)
        );

        if (memberships == null || memberships.isEmpty()) {
            return 0;
        }

        // 【第2步：遍历群组统计未读消息】
        int totalUnread = 0;

        for (GroupMember member : memberships) {
            Long groupId = member.getGroupId();
            LocalDateTime lastReadTime = member.getLastReadTime();

            // 如果没有阅读记录，使用加入群组时间作为基准
            LocalDateTime sinceTime = (lastReadTime != null) 
                    ? lastReadTime 
                    : member.getCreateTime();

            // 检查群组是否存在（可能已被删除）
            try {
                groupService.getGroupDetailWithMembers(groupId);
            } catch (Exception e) {
                log.debug("群组 {} 不存在，跳过统计", groupId);
                continue;
            }

            // 统计该群组中未读消息数
            // 条件：群组ID匹配 + 时间晚于最后阅读时间 + 不是自己发的
            long unreadCount = chatMessageMapper.selectCount(
                new LambdaQueryWrapper<ChatMessage>()
                    .eq(ChatMessage::getGroupId, groupId)
                    .gt(ChatMessage::getCreateTime, sinceTime)
                    .ne(ChatMessage::getUserId, userId)  // 排除自己的消息
            );

            totalUnread += unreadCount;
            log.debug("群组 {} 未读消息数: {}", groupId, unreadCount);
        }

        log.debug("用户 {} 总未读消息数: {}", userId, totalUnread);
        return totalUnread;
    }

    /**
     * 标记消息为已读
     * 
     * 【实现方式】
     * 更新群组成员表中的 last_read_time 字段为当前时间
     * 之后查询未读消息时，此时间之前的消息不再计入未读
     * 
     * @param groupId 群组ID
     * @param userId  用户ID
     */
    @Override
    public void markMessagesAsRead(Long groupId, Long userId) {
        log.debug("标记消息为已读: groupId={}, userId={}", groupId, userId);
        
        // 检查用户是否是群组成员
        GroupMember member = groupMemberMapper.selectOne(
            new LambdaQueryWrapper<GroupMember>()
                .eq(GroupMember::getGroupId, groupId)
                .eq(GroupMember::getUserId, userId)
        );
        
        if (member == null) {
            log.warn("用户 {} 不是群组 {} 的成员", userId, groupId);
            return;
        }

        log.debug("更新前的最后阅读时间: {}", member.getLastReadTime());

        // 更新最后阅读时间为当前时间
        int result = groupMemberMapper.update(null,
            new LambdaUpdateWrapper<GroupMember>()
                .eq(GroupMember::getGroupId, groupId)
                .eq(GroupMember::getUserId, userId)
                .set(GroupMember::getLastReadTime, LocalDateTime.now())
        );

        if (result > 0) {
            log.debug("成功标记群组 {} 消息为已读，用户 {}", groupId, userId);
        } else {
            log.warn("未能更新群组 {} 的阅读状态，用户 {}", groupId, userId);
        }
    }
    
    /**
     * 重置用户阅读状态
     * 
     * 【功能说明】
     * 与 markMessagesAsRead 功能相同，将最后阅读时间设为当前时间。
     * 提供此方法是为了语义清晰：
     * - markMessagesAsRead：用户阅读消息时调用
     * - resetUserReadStatus：管理员或特殊操作时调用
     * 
     * @param groupId 群组ID
     * @param userId  用户ID
     */
    @Override
    public void resetUserReadStatus(Long groupId, Long userId) {
        log.debug("重置用户阅读状态: groupId={}, userId={}", groupId, userId);
        
        // 检查用户是否是群组成员
        GroupMember member = groupMemberMapper.selectOne(
            new LambdaQueryWrapper<GroupMember>()
                .eq(GroupMember::getGroupId, groupId)
                .eq(GroupMember::getUserId, userId)
        );
        
        if (member == null) {
            log.warn("用户 {} 不是群组 {} 的成员", userId, groupId);
            return;
        }

        log.debug("重置前的最后阅读时间: {}", member.getLastReadTime());

        // 将最后阅读时间设置为当前时间
        int result = groupMemberMapper.update(null,
            new LambdaUpdateWrapper<GroupMember>()
                .eq(GroupMember::getGroupId, groupId)
                .eq(GroupMember::getUserId, userId)
                .set(GroupMember::getLastReadTime, LocalDateTime.now())
        );

        if (result > 0) {
            log.debug("成功重置群组 {} 的阅读状态，用户 {}", groupId, userId);
        } else {
            log.warn("未能重置群组 {} 的阅读状态，用户 {}", groupId, userId);
        }
    }

    /**
     * 获取用户未读消息详情
     * 
     * 【返回内容】
     * 每个群组的：
     * - 群组ID和名称
     * - 未读消息数量
     * - 最新消息内容、时间、发送者
     * 
     * 【使用场景】
     * 消息列表页面，展示所有群组的未读情况
     * 
     * @param userId 用户ID
     * @return 群组未读详情列表（按最新消息时间排序）
     */
    @Override
    public List<GroupUnreadDto> getUnreadMessageDetail(Long userId) {
        log.debug("获取用户未读消息详情: userId={}", userId);

        // 获取用户加入的所有群组
        List<GroupMember> memberships = groupMemberMapper.selectList(
            new LambdaQueryWrapper<GroupMember>()
                .eq(GroupMember::getUserId, userId)
        );

        if (memberships == null || memberships.isEmpty()) {
            return new ArrayList<>();
        }

        List<GroupUnreadDto> result = new ArrayList<>();

        for (GroupMember member : memberships) {
            Long groupId = member.getGroupId();
            LocalDateTime lastReadTime = member.getLastReadTime();
            LocalDateTime sinceTime = (lastReadTime != null) 
                    ? lastReadTime 
                    : member.getCreateTime();

            // 获取群组信息
            GroupDetailDto group = null;
            try {
                group = groupService.getGroupDetailWithMembers(groupId);
            } catch (Exception e) {
                log.debug("群组 {} 不存在，跳过", groupId);
                continue;
            }

            // 统计未读消息数
            long unreadCount = chatMessageMapper.selectCount(
                new LambdaQueryWrapper<ChatMessage>()
                    .eq(ChatMessage::getGroupId, groupId)
                    .gt(ChatMessage::getCreateTime, sinceTime)
                    .ne(ChatMessage::getUserId, userId)
            );

            // 获取最新一条消息
            List<ChatMessage> latestMessages = chatMessageMapper.selectList(
                new LambdaQueryWrapper<ChatMessage>()
                    .eq(ChatMessage::getGroupId, groupId)
                    .orderByDesc(ChatMessage::getCreateTime)
                    .last("LIMIT 1")
            );

            // 组装 DTO
            GroupUnreadDto dto = new GroupUnreadDto();
            dto.setGroupId(groupId);
            dto.setGroupName(group != null ? group.getGroupName() : "搭子组");
            dto.setUnreadCount((int) unreadCount);

            // 填充最新消息信息
            if (latestMessages != null && !latestMessages.isEmpty()) {
                ChatMessage lastMsg = latestMessages.get(0);
                // 图片消息显示 [图片]，文本消息显示内容
                dto.setLastMessage(
                    "IMAGE".equals(lastMsg.getType()) ? "[图片]" : lastMsg.getContent()
                );
                dto.setLastMessageType(lastMsg.getType());
                dto.setLastMessageTime(lastMsg.getCreateTime());
                dto.setLastMessageUserId(lastMsg.getUserId());
                dto.setLastMessageNickname(lastMsg.getNickname());
            }

            result.add(dto);
        }

        // 按最后消息时间排序（最新的在前）
        result.sort((a, b) -> {
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        });

        log.debug("返回群组未读详情数: {}", result.size());
        return result;
    }

    /**
     * 将实体转换为 DTO
     * 
     * 【为什么需要转换？】
     * - Entity（实体）：对应数据库表结构，包含所有字段
     * - DTO（数据传输对象）：给前端用的，只包含需要的字段
     * 
     * 【BeanUtils.copyProperties 说明】
     * Spring 提供的工具方法，自动复制同名属性
     * 相当于：dto.setId(entity.getId()); dto.setContent(entity.getContent()); ...
     * 
     * @param entity 聊天消息实体
     * @return 聊天消息DTO
     */
    private ChatMessageDto convertToDto(ChatMessage entity) {
        ChatMessageDto dto = new ChatMessageDto();
        BeanUtils.copyProperties(entity, dto);
        return dto;
    }
}
