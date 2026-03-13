package com.gym.controller;

import com.gym.common.ApiResponse;
import com.gym.dto.ChatMessageDto;
import com.gym.dto.GroupUnreadDto;
import com.gym.service.ChatService;
import com.gym.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * ============================================
 * 聊天控制器
 * ============================================
 * 
 * 【什么是聊天控制器？】
 * 这个控制器负责处理群组聊天相关的所有请求。
 * 就像微信群的聊天服务器，负责接收、存储、推送消息。
 * 
 * 【两种通信方式】
 * 1. HTTP 请求（@GetMapping/@PostMapping）
 *    - 获取历史消息、未读数量等
 *    - 特点：客户端主动请求，服务器响应
 * 
 * 2. WebSocket 消息（@MessageMapping）
 *    - 实时发送和接收聊天消息
 *    - 特点：双向通信，服务器可以主动推送
 * 
 * 【WebSocket 是什么？】
 * WebSocket 是一种持久化连接协议，类似打电话：
 * - HTTP：像发短信，一问一答，每次都要重新建立连接
 * - WebSocket：像打电话，连接保持，随时可以双向通话
 * 
 * 【核心功能】
 * 1. 发送群组消息（WebSocket）
 * 2. 获取聊天历史记录
 * 3. 获取最新消息（下拉刷新用）
 * 4. 获取未读消息数量
 * 5. 标记消息为已读
 * ============================================
 */
@Slf4j
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    /**
     * 聊天服务
     * 处理消息的存储、查询、已读状态等业务逻辑
     */
    private final ChatService chatService;
    
    /**
     * WebSocket 消息推送模板
     * 用于向订阅了特定主题的客户端推送消息
     */
    private final SimpMessagingTemplate messagingTemplate;
    
    /**
     * 用户服务
     * 用于获取用户昵称等信息
     */
    private final UserService userService;

    /**
     * 发送群组聊天消息（WebSocket 接口）
     * 
     * 【@MessageMapping 说明】
     * 这是 WebSocket 的消息映射注解，类似 @GetMapping
     * 客户端发送到 /app/group/chat 的消息会被这个方法处理
     * 
     * 【为什么是 /app/group/chat？】
     * Spring WebSocket 默认配置：
     * - 客户端发送消息前缀：/app
     * - 客户端订阅消息前缀：/topic
     * 所以 @MessageMapping("/group/chat") 对应 /app/group/chat
     * 
     * 【消息流程】
     * 1. 客户端通过 WebSocket 发送消息
     * 2. 服务器验证用户身份
     * 3. 保存消息到数据库
     * 4. 推送给订阅了该群组的所有成员
     * 
     * @param request 聊天消息请求（包含群组ID、内容、图片等）
     * @param headerAccessor WebSocket 消息头访问器，用于获取用户信息
     */
    @MessageMapping("/group/chat")
    public void sendGroupMessage(@Payload ChatMessageRequest request, 
                                  SimpMessageHeaderAccessor headerAccessor) {
        try {
            // 【第1步：获取用户身份】
            // WebSocket 连接时已经过认证，从消息头获取用户信息
            Principal user = headerAccessor.getUser();
            if (user == null || !(user instanceof UsernamePasswordAuthenticationToken)) {
                // 尝试从消息头中获取用户信息（备用方案）
                Object userObj = headerAccessor.getHeader("user");
                if (userObj instanceof UsernamePasswordAuthenticationToken) {
                    user = (UsernamePasswordAuthenticationToken) userObj;
                } else {
                    throw new IllegalStateException("未找到认证信息");
                }
            }
            
            // 从认证信息中提取用户ID
            Long userId = (Long) ((UsernamePasswordAuthenticationToken) user).getPrincipal();
            
            // 获取用户昵称（用于显示在聊天界面）
            String nickname = userService.getUserNickname(userId);
            
            log.debug("收到聊天消息: groupId={}, userId={}, content={}", 
                    request.getGroupId(), userId, request.getContent());
            
            // 【第2步：保存消息到数据库】
            ChatMessageDto messageDto = chatService.sendGroupMessage(
                request.getGroupId(),      // 群组ID
                userId,                     // 发送者ID
                nickname,                   // 发送者昵称
                request.getContent(),       // 消息内容
                request.getImageUrl(),      // 图片URL（如果有）
                request.getType()           // 消息类型（TEXT/IMAGE）
            );
            
            log.debug("消息保存成功，ID: {}", messageDto.getId());
            
            // 【第3步：推送给群组内所有成员】
            // convertAndSend 会将消息发送给所有订阅了 /topic/group/{groupId} 的客户端
            messagingTemplate.convertAndSend(
                "/topic/group/" + request.getGroupId(), 
                messageDto
            );
        } catch (Exception e) {
            log.error("发送聊天消息失败: {}", e.getMessage(), e);
        }
    }

    /**
     * HTTP 发送群组聊天消息（供小程序使用）
     * 
     * 【接口地址】POST /chat/group/{groupId}/send
     * 【参数】groupId: 群组ID，content: 消息内容，type: 消息类型（TEXT/IMAGE）
     * 【返回】发送成功的消息对象
     * 
     * 【使用场景】
     * 小程序环境不支持 WebSocket STOMP，通过 HTTP 发送消息
     * 
     * @param groupId 群组ID
     * @param request 消息请求
     * @return 发送成功的消息
     */
    @PostMapping("/group/{groupId}/send")
    public ApiResponse<ChatMessageDto> sendMessageByHttp(
            @PathVariable Long groupId,
            @RequestBody ChatMessageRequest request) {
        try {
            // 从 SecurityContext 获取当前用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof Long)) {
                return ApiResponse.error(401, "未认证或认证信息无效");
            }
            
            Long userId = (Long) authentication.getPrincipal();
            String nickname = userService.getUserNickname(userId);
            
            log.debug("HTTP发送聊天消息: groupId={}, userId={}, content={}", 
                    groupId, userId, request.getContent());
            
            // 保存消息到数据库
            ChatMessageDto messageDto = chatService.sendGroupMessage(
                groupId,
                userId,
                nickname,
                request.getContent(),
                request.getImageUrl(),
                request.getType() != null ? request.getType() : "TEXT"
            );
            
            // 推送给群组内所有成员（WebSocket）
            messagingTemplate.convertAndSend(
                "/topic/group/" + groupId, 
                messageDto
            );
            
            log.debug("HTTP消息发送成功，ID: {}", messageDto.getId());
            return ApiResponse.ok(messageDto);
            
        } catch (Exception e) {
            log.error("HTTP发送聊天消息失败: {}", e.getMessage(), e);
            return ApiResponse.error(500, "发送失败: " + e.getMessage());
        }
    }

    /**
     * 获取群组聊天历史记录
     * 
     * 【接口地址】GET /chat/group/{groupId}/history
     * 【参数】groupId: 群组ID，limit: 返回消息数量（默认50）
     * 【返回】消息列表（按时间正序，旧消息在前）
     * 
     * 【使用场景】
     * 用户进入聊天页面时，加载历史消息
     * 
     * @param groupId 群组ID
     * @param limit 返回消息数量限制
     * @return 聊天消息列表
     */
    @GetMapping("/group/{groupId}/history")
    public ApiResponse<List<ChatMessageDto>> getGroupChatHistory(
            @PathVariable Long groupId, 
            @RequestParam(defaultValue = "50") int limit) {
        log.debug("获取群组聊天历史: groupId={}, limit={}", groupId, limit);
        List<ChatMessageDto> history = chatService.getGroupChatHistory(groupId, limit);
        return ApiResponse.ok(history);
    }

    /**
     * 获取最新消息
     * 
     * 【接口地址】GET /chat/group/{groupId}/latest
     * 【参数】groupId: 群组ID，lastMessageId: 客户端已有的最后一条消息ID
     * 【返回】比 lastMessageId 更新的消息列表
     * 
     * 【使用场景】
     * 用户下拉刷新或长轮询获取新消息
     * 
     * @param groupId 群组ID
     * @param lastMessageId 客户端已有的最后一条消息ID
     * @return 新消息列表
     */
    @GetMapping("/group/{groupId}/latest")
    public ApiResponse<List<ChatMessageDto>> getLatestMessages(
            @PathVariable Long groupId,
            @RequestParam Long lastMessageId) {
        log.debug("获取最新消息: groupId={}, lastMessageId={}", groupId, lastMessageId);
        List<ChatMessageDto> messages = chatService.getLatestMessages(groupId, lastMessageId);
        return ApiResponse.ok(messages);
    }

    /**
     * 获取用户所有群组的未读消息总数
     * 
     * 【接口地址】GET /chat/unread/count
     * 【参数】userId: 用户ID
     * 【返回】未读消息总数
     * 
     * 【使用场景】
     * 首页或消息列表显示未读红点数字
     * 
     * @param userId 用户ID
     * @return 未读消息总数
     */
    @GetMapping("/unread/count")
    public ApiResponse<Integer> getUnreadCount(@RequestParam Long userId) {
        log.debug("获取用户未读消息数: userId={}", userId);
        int count = chatService.getUnreadMessageCount(userId);
        return ApiResponse.ok(count);
    }

    /**
     * 获取用户所有群组的未读消息详情列表
     * 
     * 【接口地址】GET /chat/unread/detail
     * 【参数】userId: 用户ID
     * 【返回】每个群组的未读消息详情
     * 
     * 【使用场景】
     * 消息列表页面，展示每个群组的未读情况和最新消息
     * 
     * @param userId 用户ID
     * @return 群组未读消息详情列表
     */
    @GetMapping("/unread/detail")
    public ApiResponse<List<GroupUnreadDto>> getUnreadDetail(@RequestParam Long userId) {
        log.debug("获取用户未读消息详情: userId={}", userId);
        List<GroupUnreadDto> list = chatService.getUnreadMessageDetail(userId);
        return ApiResponse.ok(list);
    }

    /**
     * 标记群组消息为已读
     * 
     * 【接口地址】POST /chat/group/{groupId}/read
     * 【参数】groupId: 群组ID，userId: 用户ID
     * 【返回】操作结果
     * 
     * 【使用场景】
     * 用户进入聊天页面时调用，清除该群组的未读标记
     * 
     * @param groupId 群组ID
     * @param userId 用户ID
     * @return 操作结果
     */
    @PostMapping("/group/{groupId}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long groupId, @RequestParam Long userId) {
        log.debug("标记消息为已读: groupId={}, userId={}", groupId, userId);
        chatService.markMessagesAsRead(groupId, userId);
        return ApiResponse.ok(null);
    }
    
    /**
     * 重置用户在群组的阅读状态
     * 
     * 【接口地址】POST /chat/group/{groupId}/reset-read
     * 【参数】groupId: 群组ID，userId: 用户ID
     * 【返回】操作结果
     * 
     * 【使用场景】
     * 管理员或用户本人重置阅读状态（将最后阅读时间设为当前时间）
     * 
     * @param groupId 群组ID
     * @param userId 用户ID
     * @return 操作结果
     */
    @PostMapping("/group/{groupId}/reset-read")
    public ApiResponse<Void> resetReadStatus(@PathVariable Long groupId, @RequestParam Long userId) {
        log.debug("重置用户阅读状态: groupId={}, userId={}", groupId, userId);
        chatService.resetUserReadStatus(groupId, userId);
        return ApiResponse.ok(null);
    }

    /**
     * 聊天消息请求对象
     * 
     * 【@Data 说明】
     * Lombok 自动生成 getter、setter、toString 等方法
     * 
     * 【字段说明】
     * - groupId: 目标群组ID
     * - content: 消息文本内容
     * - imageUrl: 图片URL（如果是图片消息）
     * - type: 消息类型（TEXT/IMAGE）
     */
    @Data
    public static class ChatMessageRequest {
        private Long groupId;
        private String content;
        private String imageUrl;
        private String type;
    }
}
