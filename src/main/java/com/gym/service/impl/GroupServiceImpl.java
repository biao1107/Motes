/**
 * ============================================
 * 健身搭子组服务实现类
 * ============================================
 * 作用：
 * 实现健身搭子组的业务逻辑，包括创建、邀请、加入、删除等功能
 * 
 * 核心功能：
 * 1. 创建组 - 创建新的健身搭子组，2-3人一组
 * 2. 发送邀请 - 通过用户名查找用户，用Redis存储邀请信息（24小时过期）
 * 3. 接受邀请 - 将用户加入组，更新缓存
 * 4. 拒绝邀请 - 删除Redis中的邀请记录
 * 5. 获取组列表 - 支持Redis缓存
 * 6. 获取组详情 - 包含成员详细信息
 * 7. 删除组 - 清理所有相关数据
 * 
 * 缓存设计：
 * - group:invitation:{toUserId}:{fromUserId}_{groupId} - 邀请信息（24小时过期）
 * - user:groups:{userId} - 用户的组列表（Set结构）
 * - train:progress:{groupId}* - 训练进度数据
 * 
 * 数据库表：
 * - t_partner_group - 组基本信息
 * - t_group_member - 组成员关系
 * ============================================
 */
package com.gym.service.impl;

// MyBatis-Plus条件构造器
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
// 错误码枚举
import com.gym.common.ErrorCode;
// 业务异常类
import com.gym.common.exception.BizException;
// 组详情DTO
import com.gym.dto.GroupDetailDto;
// 组成员实体类
import com.gym.entity.GroupMember;
// 搭子组实体类
import com.gym.entity.PartnerGroup;
// 用户实体类
import com.gym.entity.User;
// 组成员数据访问层
import com.gym.mapper.GroupMemberMapper;
// 组数据访问层
import com.gym.mapper.PartnerGroupMapper;
// 用户数据访问层
import com.gym.mapper.UserMapper;
// 组服务接口
import com.gym.service.GroupService;
// 文件存储服务
import com.gym.service.StorageService;
// 统计服务
import com.gym.service.StatService;
// WebSocket服务
import com.gym.service.WebSocketService;
// Lombok自动生成构造方法
import lombok.RequiredArgsConstructor;
// Lombok日志注解
import lombok.extern.slf4j.Slf4j;
// Spring的Service注解
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
// Lombok日志注解
import lombok.extern.slf4j.Slf4j;
// Redis操作模板
import org.springframework.data.redis.core.RedisTemplate;
// Spring的Service注解
import org.springframework.stereotype.Service;
// 事务注解
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * @Slf4j 说明：
 * Lombok自动生成日志对象，可以使用log.info()、log.error()等方法
 */
@Slf4j
/**
 * @Service 说明：
 * 声明这是一个Spring服务类，会被Spring扫描并管理
 */
@Service
/**
 * @RequiredArgsConstructor 说明：
 * Lombok自动生成包含所有final字段的构造方法
 */
@RequiredArgsConstructor
public class GroupServiceImpl implements GroupService {

    /**
     * 邀请信息缓存的key前缀
     * 完整key格式：group:invitation:{toUserId}:{fromUserId}_{groupId}
     * 示例：group:invitation:2:1_5 （用户1邀请用户2加入组5）
     * 过期时间：24小时
     */
    private static final String INVITATION_PREFIX = "group:invitation:";
    
    /**
     * 用户组列表缓存的key前缀
     * 完整key格式：user:groups:{userId}
     * 使用Redis的Set结构存储，存储用户加入的所有组ID
     */
    private static final String USER_GROUPS_PREFIX = "user:groups:";

    /**
     * groupMapper: 组数据访问层
     * 用于操作t_partner_group表
     */
    private final PartnerGroupMapper groupMapper;
    
    /**
     * memberMapper: 组成员数据访问层
     * 用于操作t_group_member表
     */
    private final GroupMemberMapper memberMapper;
    
    /**
     * userMapper: 用户数据访问层
     * 用于查询用户信息
     */
    private final UserMapper userMapper;
    
    /**
     * redisTemplate: Redis操作模板
     * 用于读写Redis缓存
     */
    private final RedisTemplate<String, Object> redisTemplate;
    
    /**
     * webSocketService: WebSocket服务
     * 用于实时推送邀请通知
     */
    private final WebSocketService webSocketService;
    
    /**
     * storageService: 文件存储服务
     * 用于获取头像的完整URL
     */
    private final StorageService storageService;
    
    /**
     * statService: 统计服务
     * 用于清除统计数据缓存
     */
    private final StatService statService;

    /**
     * 创建健身搭子组
     * 
     * @param creatorId 创建者用户ID
     * @param memberIds 成员ID列表（包含创建者）
     * @param fixedTime 固定训练时间
     * @param name 组名称（可选）
     * @return 创建的组ID
     * 
     * @Transactional 说明：
     * 开启事务，如果过程中出现异常，所有数据库操作会回滚
     * 
     * 业务规则校验：
     * 1. 成员列表不能为空
     * 2. 成员列表必须包含创建者自己
     * 3. 最多3人一组（2-3人）
     * 
     * 创建流程：
     * 1. 创建组记录（t_partner_group表）
     * 2. 添加成员记录（t_group_member表）
     * 3. 创建者为ADMIN，其他为MEMBER
     * 4. 更新Redis缓存
     */
    @Override
    @Transactional
    public Long createGroup(Long creatorId, List<Long> memberIds, String fixedTime, String name) {
        // 校验成员列表有效性
        if (memberIds == null || memberIds.isEmpty() || !memberIds.contains(creatorId)) {
            throw new BizException(ErrorCode.BAD_REQUEST, "成员列表无效");
        }
        // 校验人数限制
        if (memberIds.size() > 3) {
            throw new BizException(ErrorCode.BAD_REQUEST, "最多3人一组");
        }

        // ========== 第1步：创建组记录 ==========
        PartnerGroup group = new PartnerGroup();
        // 如果未传名称，自动生成默认名称
        group.setGroupName(name != null && !name.isEmpty() ? name : "健身搭子第" + System.currentTimeMillis() + "组");
        group.setFixedTime(fixedTime);
        group.setStatus(1); // 1表示正常状态
        group.setCreateTime(LocalDateTime.now());
        groupMapper.insert(group);

        // ========== 第2步：添加组成员 ==========
        for (Long userId : memberIds) {
            GroupMember member = new GroupMember();
            member.setGroupId(group.getId());
            member.setUserId(userId);
            // 创建者为管理员，其他为普通成员
            member.setRole(userId.equals(creatorId) ? "ADMIN" : "MEMBER");
            member.setCreateTime(LocalDateTime.now());
            memberMapper.insert(member);

            // ========== 第3步：更新Redis缓存 ==========
            String key = USER_GROUPS_PREFIX + userId;
            redisTemplate.opsForSet().add(key, group.getId());
        }

        log.info("创建搭子组成功: groupId={}, members={}", group.getId(), memberIds);
        return group.getId();
    }
 
    /**
     * 发送邀请（通过用户名）
     * 
     * @param fromUserId 发送邀请的用户ID
     * @param toUsername 被邀请用户的用户名（昵称）
     * @param groupId 组ID
     * 
     * 业务流程：
     * 1. 校验用户名不能为空
     * 2. 通过用户名查询用户ID
     * 3. 检查不能邀请自己
     * 4. 构建 Redis key，存储邀请信息（24小时过期）
     * 5. 通过WebSocket推送实时通知
     * 
     * 异常处理：
     * - 用户不存在时抛出业务异常
     */
    @Override
    public void sendInvitationByUsername(Long fromUserId, String toUsername, Long groupId) {
        // 校验用户名不能为空
        if (toUsername == null || toUsername.trim().isEmpty()) {
            throw new BizException(ErrorCode.BAD_REQUEST, "用户名不能为空");
        }
            
        // ========== 第1步：通过用户名查找用户 ==========
        User toUser = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getNickname, toUsername));
        if (toUser == null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "该用户名不存在");
        }
        Long toUserId = toUser.getId();
            
        // ========== 第2步：验证不能邀请自己 ==========
        if (fromUserId.equals(toUserId)) {
            throw new BizException(ErrorCode.BAD_REQUEST, "不能邀请自己");
        }
            
        // ========== 第3步：构建 Redis key ==========
        // key格式: group:invitation:toUserId:fromUserId_groupId
        String key = INVITATION_PREFIX + toUserId + ":" + fromUserId + "_" + groupId;
        log.info("存储邀请的key: {}", key);
            
        // ========== 第4步：存储邀请信息 ==========
        String jsonData = String.format("{\"fromUserId\":%d,\"groupId\":%d}", fromUserId, groupId);
        // 设罒24小时过期时间
        redisTemplate.opsForValue().set(key, jsonData, java.time.Duration.ofHours(24));
        log.info("发送邀约: from={}, to={}, groupId={}", fromUserId, toUserId, groupId);
            
        // ========== 第5步：推送WebSocket通知 ==========
        User fromUser = userMapper.selectById(fromUserId);
        PartnerGroup group = groupMapper.selectById(groupId);
        if (fromUser != null) {
            webSocketService.notifyInvitation(fromUserId, toUserId, fromUser.getNickname(), 
                    group != null ? group.getGroupName() : "健身搭子组");
        }
    }

    /**
     * 接受邀请
     * 
     * @param userId 当前用户ID（接受邀请的人）
     * @param invitationId 邀请人的用户ID
     * @return 加入的组ID
     * 
     * @Transactional 说明：
     * 开启事务，确保数据库操作的原子性
     * 
     * 业务流程：
     * 1. 从Redis中查找邀请记录（使用pattern匹配）
     * 2. 解析JSON获取groupId
     * 3. 删除Redis中的邀请记录
     * 4. 检查用户是否已在组中（防止重复加入）
     * 5. 添加组成员记录
     * 6. 更新Redis缓存
     * 7. 清除统计数据缓存
     * 
     * 异常处理：
     * - 邀请不存在或已过期
     * - 用户已在组中
     * - JSON解析失败
     */
    @Override
    @Transactional
    public Long acceptInvitation(Long userId, Long invitationId) {
        // ========== 第1步：查找邀请记录 ==========
        // key格式: group:invitation:toUserId:fromUserId_groupId
        // 当前用户是toUserId，invitationId是fromUserId
        // 使用pattern匹配，因为groupId部分不确定
        String pattern = INVITATION_PREFIX + userId + ":" + invitationId + "_*";
        log.info("接受邀请查找pattern: {}", pattern);
        Set<String> keys = redisTemplate.keys(pattern);
        log.info("找到的key: {}", keys);
        if (keys == null || keys.isEmpty()) {
            log.warn("未找到匹配的邀请key，pattern: {}", pattern);
            throw new BizException(ErrorCode.BAD_REQUEST, "邀约不存在或已过期");
        }
        
        // 获取第一个匹配的key（理论上只有一个）
        String key = keys.iterator().next();//获取迭代器，取第一个元素
        Object inviteDataObj = redisTemplate.opsForValue().get(key);
        if (inviteDataObj == null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "邀约不存在或已过期");
        }
        
        // ========== 第2步：解析JSON数据 ==========
        String jsonStr = inviteDataObj.toString();
        log.info("接受邀请解析JSON: {}", jsonStr);
        Long fromUserId = null;
        Long groupId = null;
        // 使用正则表达式提取fromUserId
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"fromUserId\"\\s*:\\s*(\\d+)");//定义正则表达式规则
        java.util.regex.Matcher m = p.matcher(jsonStr);//用正则去匹配目标字符串
        if (m.find()) {
            fromUserId = Long.parseLong(m.group(1));
        }
        // 使用正则表达式提取groupId
        p = java.util.regex.Pattern.compile("\"groupId\"\\s*:\\s*(\\d+)");//定义正则表达式规则
        m = p.matcher(jsonStr);//用正则去匹配目标字符串             
        if (m.find()) {
            groupId = Long.parseLong(m.group(1));
        }
        
        // 校验解析结果
        if (fromUserId == null || groupId == null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "邀约数据格式错误");
        }
        
        // ========== 第3步：删除邀请记录 ==========
        redisTemplate.delete(key);

        // ========== 第4步：检查是否已在组中 ==========
        // 查询是否已有该用户在该组的记录
        GroupMember existingMember = memberMapper.selectOne(
            new LambdaQueryWrapper<GroupMember>()
                .eq(GroupMember::getGroupId, groupId)
                .eq(GroupMember::getUserId, userId)
        );
        if (existingMember != null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "你已经在该组中");
        }
        
        // ========== 第5步：添加组成员 ==========
        GroupMember member = new GroupMember();
        member.setGroupId(groupId);
        member.setUserId(userId);
        member.setRole("MEMBER"); // 被邀请加入的为普通成员
        member.setCreateTime(LocalDateTime.now());
        memberMapper.insert(member);
        
        log.info("数据库插入GroupMember记录: groupId={}, userId={}", groupId, userId);
        log.info("用户 {} 已加入组 {}, 尝试添加到Redis缓存", userId, groupId);
        
        // ========== 第6步：更新Redis缓存 ==========
        try {
            String cacheKey = USER_GROUPS_PREFIX + userId;
            redisTemplate.opsForSet().add(cacheKey, groupId);
            log.info("用户组缓存已更新: {}", cacheKey);
        } catch (Exception e) {
            log.warn("更新Redis缓存失败: {}", e.getMessage());
        }
        
        // 用户加入组后，清除其统计数据缓存，确保首页显示最新数据
        try {
            statService.clearHomeStatsCache(userId);
        } catch (Exception e) {
            log.warn("清除用户统计数据缓存失败: {}", e.getMessage());
        }
        
        return groupId;
    }

    /**
     * 获取用户的组列表
     * 
     * @param userId 用户ID
     * @return 该用户加入的所有组列表
     * 
     * 缓存策略（Cache-Aside模式）：
     * 1. 先尝试从Redis缓存获取组ID列表
     * 2. 缓存命中：直接返回缓存数据
     * 3. 缓存未命中：查询数据库，并回写缓存
     * 
     * 容错处理：
     * - Redis操作失败时，降级为数据库查询
     * - 不影响主要业务流程
     */
    @Override
    public List<PartnerGroup> getUserGroups(Long userId) {
        Set<Object> groupIds = null;
        
        log.info("获取用户 {} 的组列表", userId);
        
        // ========== 第1步：尝试从缓存获取 ==========
        try {
            String key = USER_GROUPS_PREFIX + userId;
            // 使用Set的members方法获取所有成员
            groupIds = redisTemplate.opsForSet().members(key);
            log.info("从Redis缓存获取组IDs: {}", groupIds);
        } catch (Exception e) {
            // Redis操作失败，记录日志，继续执行数据库查询
            log.warn("Redis操作失败，使用数据库查询: {}", e.getMessage());
        }
        
        // ========== 第2步：缓存未命中，查询数据库 ==========
        if (groupIds == null || groupIds.isEmpty()) {
            log.info("从数据库查询用户的组");
            // 查询t_group_member表，获取该用户的所有组ID
            List<GroupMember> members = memberMapper.selectList(
                    new LambdaQueryWrapper<GroupMember>().eq(GroupMember::getUserId, userId));
            log.info("数据库查询结果: {}", members);
            // 提取组ID
            groupIds = members.stream().map(GroupMember::getGroupId).collect(Collectors.toSet());
            
            // ========== 第3步：回写缓存 ==========
            if (!groupIds.isEmpty()) {
                try {
                    String key = USER_GROUPS_PREFIX + userId;
                    redisTemplate.opsForSet().add(key, groupIds.toArray());
                } catch (Exception e) {
                    // 缓存回写失败不影响主要流程
                    log.warn("Redis写入失败，不影响主要流程: {}", e.getMessage());
                }
            }
        }

        // ========== 第4步：查询组详情 ==========
        // 如果没有组ID，直接返回空列表
        if (groupIds == null || groupIds.isEmpty()) {
            return new ArrayList<>();
        }

        // 将Object类型的ID转换为Long类型
        List<Long> ids = groupIds.stream().map(o -> Long.valueOf(o.toString())).collect(Collectors.toList());
        // 批量查询组详情
        return groupMapper.selectBatchIds(ids);
    }

    @Override
    public List<Map<String, Object>> getUserInvitations(Long userId) {
        List<Map<String, Object>> invitations = new ArrayList<>();
        
        try {
            // 先列出所有包含 invitation 的key看看
            Set<String> allKeys = redisTemplate.keys("*invitation*");
            log.info("所有包含invitation的key: {}", allKeys);
            
            // 获取当前用户的邀请 (新格式)
            String pattern = INVITATION_PREFIX + userId + ":*_*";
            log.info("查询邀请的key pattern: {}", pattern);
            Set<String> keys = redisTemplate.keys(pattern);
            log.info("找到的key数量: {}", keys != null ? keys.size() : 0);
            if (keys != null && !keys.isEmpty()) {
                for (String key : keys) {
                    log.info("处理key: {}", key);
                    Object inviteDataObj = redisTemplate.opsForValue().get(key);
                    log.info("原始数据: {}", inviteDataObj);
                    if (inviteDataObj != null) {
                        // 解析JSON字符串
                        String jsonStr = inviteDataObj.toString();
                        log.info("解析JSON: {}", jsonStr);
                        Long fromUserId = null;
                        Long groupId = null;
                        // 简单解析
                        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"fromUserId\"\\s*:\\s*(\\d+)");
                        java.util.regex.Matcher m = p.matcher(jsonStr);
                        if (m.find()) {
                            fromUserId = Long.parseLong(m.group(1));
                        }
                        p = java.util.regex.Pattern.compile("\"groupId\"\\s*:\\s*(\\d+)");
                        m = p.matcher(jsonStr);
                        if (m.find()) {
                            groupId = Long.parseLong(m.group(1));
                        }
                        
                        if (fromUserId != null && groupId != null) {
                            User fromUser = userMapper.selectById(fromUserId);
                            PartnerGroup group = groupMapper.selectById(groupId);
                            
                            Map<String, Object> invitation = new HashMap<>();
                            invitation.put("fromUserId", fromUserId);
                            invitation.put("groupId", groupId);
                            invitation.put("fromUserName", fromUser != null ? fromUser.getNickname() : "未知用户");
                            invitation.put("fromUserAvatar", fromUser != null ? fromUser.getAvatar() : null);
                            invitation.put("groupName", group != null ? group.getGroupName() : "健身搭子组");
                            invitations.add(invitation);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("获取邀请列表失败: {}", e.getMessage());
        }
        
        return invitations;
    }

    @Override
    public GroupDetailDto getGroupDetailWithMembers(Long groupId) {
        PartnerGroup group = groupMapper.selectById(groupId);
        if (group == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "组不存在");
        }
        
        GroupDetailDto dto = new GroupDetailDto();
        dto.setId(group.getId());
        dto.setGroupName(group.getGroupName());
        dto.setFixedTime(group.getFixedTime());
        dto.setStatus(group.getStatus());
        dto.setCreateTime(group.getCreateTime());
        
        // 获取组成员信息
        List<GroupMember> members = memberMapper.selectList(
            new LambdaQueryWrapper<GroupMember>().eq(GroupMember::getGroupId, groupId));
        
        List<GroupDetailDto.GroupMemberInfo> memberInfos = members.stream().map(member -> {
            GroupDetailDto.GroupMemberInfo memberInfo = new GroupDetailDto.GroupMemberInfo();
            memberInfo.setId(member.getId());
            memberInfo.setUserId(member.getUserId());
            memberInfo.setRole(member.getRole());
            memberInfo.setCreateTime(member.getCreateTime());
            
            // 获取用户昵称
            User user = userMapper.selectById(member.getUserId());
            if (user != null) {
                memberInfo.setNickname(user.getNickname());
                // 处理头像URL
                if (user.getAvatar() != null && !user.getAvatar().isEmpty()) {
                    try {
                        memberInfo.setAvatar(storageService.getFileUrl(user.getAvatar()));
                    } catch (Exception e) {
                        log.warn("处理头像URL失败: userId={}, avatar={}", member.getUserId(), user.getAvatar(), e);
                        memberInfo.setAvatar(user.getAvatar());
                    }
                }
            }
            return memberInfo;
        }).collect(Collectors.toList());
        
        dto.setMembers(memberInfos);
        
        return dto;
    }
    
    @Override
    @Transactional
    public void deleteGroup(Long groupId) {
        PartnerGroup group = groupMapper.selectById(groupId);
        if (group == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "组不存在");
        }
        
        // 注意：管理员权限验证已在 Controller 层完成，此处直接执行删除
        
        // 删除组成员关系
        memberMapper.delete(new LambdaQueryWrapper<GroupMember>()
                .eq(GroupMember::getGroupId, groupId));
        
        // 删除组
        groupMapper.deleteById(groupId);
        
        // 清除用户组缓存
        List<Long> affectedUserIds = new ArrayList<>();
        try {
            List<GroupMember> members = memberMapper.selectList(
                    new LambdaQueryWrapper<GroupMember>().eq(GroupMember::getGroupId, groupId));
            for (GroupMember member : members) {
                affectedUserIds.add(member.getUserId());
                String userGroupsKey = USER_GROUPS_PREFIX + member.getUserId();
                redisTemplate.opsForSet().remove(userGroupsKey, groupId);
            }
        } catch (Exception e) {
            log.warn("清除用户组缓存失败，不影响主要流程: {}", e.getMessage());
        }
                
        // 清除Redis中的训练进度数据
        try {
            Set<String> keys = redisTemplate.keys("train:progress:" + groupId + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception e) {
            log.warn("清除Redis训练进度数据失败，不影响主要流程: {}", e.getMessage());
        }
        
        // 清除受影响用户的统计数据缓存，确保首页显示最新数据
        try {
            for (Long userId : affectedUserIds) {
                statService.clearHomeStatsCache(userId);
            }
        } catch (Exception e) {
            log.warn("清除用户统计数据缓存失败，不影响主要流程: {}", e.getMessage());
        }
        
        log.info("删除搭子组成功: groupId={}", groupId);
    }
    
    @Override
    @Transactional
    public void rejectInvitation(Long userId, Long invitationId) {
        // 查找邀约 key格式: group:invitation:toUserId:fromUserId_groupId
        // 当前用户是 toUserId, invitationId 是 fromUserId
        String pattern = INVITATION_PREFIX + userId + ":" + invitationId + "_*";
        log.info("拒绝邀请查找pattern: {}", pattern);
        Set<String> keys = redisTemplate.keys(pattern);
        log.info("找到的key: {}", keys);
        if (keys == null || keys.isEmpty()) {
            log.warn("未找到匹配的邀请key，pattern: {}", pattern);
            throw new BizException(ErrorCode.BAD_REQUEST, "邀约不存在或已过期");
        }
        
        String key = keys.iterator().next();
        Object inviteDataObj = redisTemplate.opsForValue().get(key);
        if (inviteDataObj == null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "邀约不存在或已过期");
        }
        
        // 解析JSON字符串
        String jsonStr = inviteDataObj.toString();
        log.info("拒绝邀请解析JSON: {}", jsonStr);
        Long fromUserId = null;
        Long groupId = null;
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\"fromUserId\"\\s*:\\s*(\\d+)");
        java.util.regex.Matcher m = p.matcher(jsonStr);
        if (m.find()) {
            fromUserId = Long.parseLong(m.group(1));
        }
        p = java.util.regex.Pattern.compile("\"groupId\"\\s*:\\s*(\\d+)");
        m = p.matcher(jsonStr);
        if (m.find()) {
            groupId = Long.parseLong(m.group(1));
        }
        
        if (fromUserId == null || groupId == null) {
            throw new BizException(ErrorCode.BAD_REQUEST, "邀约数据格式错误");
        }
        
        // 删除Redis中的邀请记录
        redisTemplate.delete(key);
        log.info("成功拒绝邀请，删除Redis记录: key={}", key);
    }
}