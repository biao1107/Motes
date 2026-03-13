package com.gym.service;

import com.gym.dto.GroupDetailDto;
import com.gym.entity.PartnerGroup;

import java.util.List;
import java.util.Map;

/**
 * 组管理服务
 */
public interface GroupService {
    /**
     * 创建搭子组（1v1或3人组）
     */
    Long createGroup(Long creatorId, List<Long> memberIds, String fixedTime, String name);

    /**
     * 通过用户名发送邀约
     */
    void sendInvitationByUsername(Long fromUserId, String toUsername, Long groupId);

    /**
     * 同意邀约
     */
    Long acceptInvitation(Long userId, Long invitationId);

    /**
     * 获取用户的组列表
     */
    List<PartnerGroup> getUserGroups(Long userId);

    /**
     * 获取用户收到的邀请列表
     */
    List<Map<String, Object>> getUserInvitations(Long userId);

    /**
     * 获取组详情（包含成员信息）
     */
    GroupDetailDto getGroupDetailWithMembers(Long groupId);
    
    /**
     * 删除搭子组
     */
    void deleteGroup(Long groupId);
    
    /**
     * 拒绝邀约
     */
    void rejectInvitation(Long userId, Long invitationId);
}