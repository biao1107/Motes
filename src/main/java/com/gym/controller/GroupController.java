/**
 * ============================================
 * 健身搭子组管理控制器
 * ============================================
 * 作用：
 * 提供健身搭子组的创建、邀请、加入、删除等管理功能
 * 
 * 什么是搭子组？
 * 搭子组是2-3人的健身小组，成员可以互相监督训练
 * 
 * 核心功能：
 * 1. 创建组 - 创建一个新的健身搭子组
 * 2. 发送邀请 - 邀请其他用户加入组
 * 3. 接受/拒绝邀请 - 处理收到的邀请
 * 4. 查看组列表 - 获取我加入的所有组
 * 5. 查看组详情 - 获取组的详细信息和成员列表
 * 6. 删除组 - 管理员删除搭子组
 * 
 * 权限设计：
 * - ADMIN（管理员）：可以删除组、邀请成员
 * - MEMBER（成员）：只能查看和参与
 * 
 * 接口列表：
 * 1. POST /group/create - 创建组
 * 2. POST /group/invite-by-username - 发送邀请（通过用户名）
 * 3. POST /group/accept - 接受邀请
 * 4. POST /group/reject - 拒绝邀请
 * 5. GET /group/my-groups - 获取我的组列表
 * 6. GET /group/invitations - 获取我的邀请列表
 * 7. GET /group/{groupId}/detail - 获取组详情（含成员）
 * 8. DELETE /group/{groupId} - 删除组
 * ============================================
 */
package com.gym.controller;

// 统一API响应包装类
import com.gym.common.ApiResponse;
// 错误码枚举
import com.gym.common.ErrorCode;
// 组详情DTO
import com.gym.dto.GroupDetailDto;
// 搭子组实体类
import com.gym.entity.PartnerGroup;
// 组服务层
import com.gym.service.GroupService;
// 非空校验注解
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
// Lombok自动生成getter/setter
import lombok.Data;
// Lombok自动生成构造方法
import lombok.RequiredArgsConstructor;
// Spring Security认证对象
import org.springframework.security.core.Authentication;
// 参数校验注解
import org.springframework.validation.annotation.Validated;
// Spring Web注解
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * @RestController 说明：
 * 声明这是一个RESTful控制器，返回JSON数据
 */
@RestController
/**
 * @RequestMapping("/group") 说明：
 * 该控制器下所有接口的URL前缀都是 /group
 */
@RequestMapping("/group")
/**
 * @RequiredArgsConstructor 说明：
 * Lombok自动生成包含所有final字段的构造方法
 * Spring会自动注入GroupService
 */
@RequiredArgsConstructor
/**
 * @Validated 说明：
 * 开启参数校验，配合@NotNull等注解使用
 * 如果参数校验失败，会抛出异常
 */
@Validated
public class GroupController {

    /**
     * groupService: 组服务层
     * 负责组的业务逻辑处理
     */
    private final GroupService groupService;

    /**
     * 创建健身搭子组
     * 
     * @PostMapping("/create") 说明：
     * - 处理POST请求
     * - 完整URL: http://localhost:8080/group/create
     * 
     * @param req 创建组请求参数
     *            @RequestBody 表示从请求体中获取JSON数据
     *            @Validated 表示要进行参数校验
     * 
     * @param auth Spring Security认证对象，用于获取当前登录用户ID
     * 
     * @return ApiResponse<Long> 返回创建的组ID
     * 
     * 业务规则：
     * 1. 组成员2-3人（包含创建者自己）
     * 2. 创建者自动成为ADMIN（管理员）
     * 3. 其他成员为MEMBER（普通成员）
     * 
     * 调用示例：
     * POST http://localhost:8080/group/create
     * Header: Authorization: Bearer {token}
     * Body: {
     *   "memberIds": [1, 2],
     *   "fixedTime": "晚上",
     *   "name": "减脂小分队"
     * }
     */
    @PostMapping("/create")
    public ApiResponse<Long> createGroup(@RequestBody @Validated CreateGroupReq req, Authentication auth) {
        // 从认证信息中获取当前用户ID
        Long userId = (Long) auth.getPrincipal();
        // 调用服务层创建组
        Long groupId = groupService.createGroup(userId, req.getMemberIds(), req.getFixedTime(), req.getName());
        return ApiResponse.ok(groupId);
    }

    /**
     * 发送邀约（通过用户名）
     * 
     * @PostMapping("/invite-by-username") 说明：
     * - 处理POST请求
     * - 完整URL: http://localhost:8080/group/invite-by-username
     * 
     * @param req 邀请请求参数
     *            - toUsername: 被邀请用户的用户名（昵称）
     *            - groupId: 要加入的组ID
     * 
     * @param auth Spring Security认证对象
     * 
     * @return ApiResponse<Void> 空响应，表示成功
     * 
     * 业务流程：
     * 1. 根据用户名查找用户
     * 2. 调用sendInvitation方法发送邀请
     * 
     * 调用示例：
     * POST http://localhost:8080/group/invite-by-username
     * Header: Authorization: Bearer {token}
     * Body: {
     *   "toUsername": "张三",
     *   "groupId": 1
     * }
     */
    @PostMapping("/invite-by-username")
    public ApiResponse<Void> sendInvitationByUsername(@RequestBody @Validated InviteByUsernameReq req, Authentication auth) {
        Long fromUserId = (Long) auth.getPrincipal();
        groupService.sendInvitationByUsername(fromUserId, req.getToUsername(), req.getGroupId());
        return ApiResponse.ok();
    }

    /**
     * 接受邀约
     * 
     * @PostMapping("/accept") 说明：
     * - 处理POST请求
     * - 完整URL: http://localhost:8080/group/accept
     * 
     * @param req 接受邀请请求参数
     *            - invitationId: 邀请人的用户ID（不是邀请记录ID）
     * 
     * @param auth Spring Security认证对象
     * 
     * @return ApiResponse<Long> 返回加入的组ID
     * 
     * 业务流程：
     * 1. 从Redis中查找邀请记录
     * 2. 检查用户是否已在组中（防止重复加入）
     * 3. 将用户添加到组成员表
     * 4. 更新用户组缓存
     * 5. 清除用户统计数据缓存
     * 6. 删除Redis中的邀请记录
     * 
     * 调用示例：
     * POST http://localhost:8080/group/accept
     * Header: Authorization: Bearer {token}
     * Body: {
     *   "invitationId": 1
     * }
     */
    @PostMapping("/accept")
    public ApiResponse<Long> acceptInvite(@RequestBody @Validated AcceptReq req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        Long groupId = groupService.acceptInvitation(userId, req.getInvitationId());
        return ApiResponse.ok(groupId);
    }

    /**
     * 获取我的组列表
     * 
     * @GetMapping("/my-groups") 说明：
     * - 处理GET请求
     * - 完整URL: http://localhost:8080/group/my-groups
     * 
     * @param authentication Spring Security认证对象
     * 
     * @return ApiResponse<List<PartnerGroup>> 我加入的所有组列表
     * 
     * 数据流程：
     * 1. 先尝试从Redis缓存获取
     * 2. 缓存不存在则查询数据库
     * 3. 将查询结果回写缓存
     */
    @GetMapping("/my-groups")
    public ApiResponse<List<PartnerGroup>> myGroups(Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        return ApiResponse.ok(groupService.getUserGroups(userId));
    }

    /**
     * 获取我的邀请列表
     * 
     * @GetMapping("/invitations") 说明：
     * - 处理GET请求
     * - 完整URL: http://localhost:8080/group/invitations
     * 
     * @param auth Spring Security认证对象
     * 
     * @return ApiResponse<List<Map<String, Object>>> 我的邀请列表
     *         每个邀请包含：fromUserId, groupId, fromUserName, fromUserAvatar, groupName
     * 
     * 数据来源：
     * - 从Redis中查询以 "group:invitation:{userId}:" 开头的key
     * - 解析JSON获取邀请详情
     */
    @GetMapping("/invitations")
    public ApiResponse<List<Map<String, Object>>> getMyInvitations(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ApiResponse.ok(groupService.getUserInvitations(userId));
    }

    /**
     * 拒绝邀约
     * 
     * @PostMapping("/reject") 说明：
     * - 处理POST请求
     * - 完整URL: http://localhost:8080/group/reject
     * 
     * @param req 拒绝邀请请求参数
     *            - invitationId: 邀请人的用户ID
     * 
     * @param auth Spring Security认证对象
     * 
     * @return ApiResponse<Void> 空响应，表示成功
     * 
     * 业务流程：
     * 1. 从Redis中查找邀请记录
     * 2. 删除邀请记录
     */
    @PostMapping("/reject")
    public ApiResponse<Void> rejectInvite(@RequestBody @Validated AcceptReq req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        groupService.rejectInvitation(userId, req.getInvitationId());
        return ApiResponse.ok();
    }
    
    /**
     * 获取组详情（包含成员信息）
     * 
     * @GetMapping("/{groupId}/detail") 说明：
     * - 处理GET请求
     * - 完整URL: http://localhost:8080/group/1/detail
     * 
     * @param groupId 组ID
     * 
     * @return ApiResponse<GroupDetailDto> 组详情，包含成员列表
     *         成员信息包括：昵称、头像、角色、加入时间
     */
    @GetMapping("/{groupId}/detail")
    public ApiResponse<GroupDetailDto> getGroupDetailWithMembers(@PathVariable @NotNull Long groupId) {
        return ApiResponse.ok(groupService.getGroupDetailWithMembers(groupId));
    }
    
    /**
     * 删除搭子组
     * 
     * @DeleteMapping("/{groupId}") 说明：
     * - 处理DELETE请求
     * - 完整URL: http://localhost:8080/group/1
     * 
     * @param groupId 组ID
     * 
     * @param auth Spring Security认证对象
     * 
     * @return ApiResponse<Void> 空响应，表示成功
     * 
     * 权限检查：
     * - 只有ADMIN（管理员）才能删除组
     * - 普通成员会收到403错误
     * 
     * 删除流程：
     * 1. 检查当前用户是否为管理员
     * 2. 删除组成员关系
     * 3. 删除组记录
     * 4. 清除相关Redis缓存
     */
    @DeleteMapping("/{groupId}")
    public ApiResponse<Void> deleteGroup(@PathVariable @NotNull Long groupId, Authentication auth) {
        // 从认证信息中获取当前用户ID
        Long currentUserId = (Long) auth.getPrincipal();
        
        // 获取组详情，检查当前用户是否为管理员
        GroupDetailDto groupDetail = groupService.getGroupDetailWithMembers(groupId);
        boolean isAdmin = groupDetail.getMembers().stream()
            .anyMatch(member -> member.getUserId().equals(currentUserId) && "ADMIN".equals(member.getRole()));
        
        // 如果不是管理员，返回权限不足错误
        if (!isAdmin) {
            return ApiResponse.error(ErrorCode.FORBIDDEN.getCode(), "只有管理员才能删除搭子组");
        }
        
        // 调用服务层删除组
        groupService.deleteGroup(groupId);
        return ApiResponse.ok();
    }

    /**
     * 创建组请求参数
     * 
     * @Data 说明：
     * Lombok自动生成getter、setter、toString等方法
     */
    @Data
    public static class CreateGroupReq {
        /**
         * 成员ID列表
         * @NotEmpty 表示不能为空列表
         * 必须包含创建者自己，总共2-3人
         */
        @NotEmpty
        private List<Long> memberIds;
        
        /**
         * 固定训练时间
         * @NotNull 表示不能为null
         * 例如："早上"、"晚上"、"周末"
         */
        @NotNull
        private String fixedTime;
        
        /**
         * 组名称（可选）
         * 如果不传，会自动生成默认名称
         */
        private String name;
    }

    /**
     * 邀请请求参数（通过用户名）
     */
    @Data
    public static class InviteByUsernameReq {
        /**
         * 被邀请用户用户名（昵称）
         */
        @NotNull
        private String toUsername;
        
        /**
         * 组ID
         */
        @NotNull
        private Long groupId;
    }

    /**
     * 接受/拒绝邀请请求参数
     */
    @Data
    public static class AcceptReq {
        /**
         * 邀请人的用户ID
         * 注意：不是邀请记录ID，而是发送邀请的用户ID
         */
        @NotNull
        private Long invitationId;
    }
}