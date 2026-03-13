package com.gym.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 组详情数据传输对象（DTO）
 * 
 * 【什么是DTO？】
 * DTO（Data Transfer Object）是数据传输对象
 * 用于在不同层之间传递数据，这里用于Service返回给Controller
 * 
 * 【为什么需要这个DTO？】
 * 1. 组合多个实体类的数据（PartnerGroup + GroupMember + User）
 * 2. 避免直接暴露数据库实体类
 * 3. 便于前端统一处理数据结构
 */
@Data
public class GroupDetailDto {
    
    /**
     * 组ID
     */
    private Long id;
    
    /**
     * 组名称
     */
    private String groupName;
    
    /**
     * 固定训练时间
     * 例如："早上"、"晚上"、"周末"
     */
    private String fixedTime;
    
    /**
     * 组状态
     * 0 = 解散，1 = 正常
     */
    private Integer status;
    
    /**
     * 创建时间
     */
    private LocalDateTime createTime;
    
    /**
     * 成员列表
     * 包含组内所有成员的详细信息
     */
    private List<GroupMemberInfo> members;

    /**
     * 组成员信息内部类
     * 封装单个成员的完整信息
     */
    @Data
    public static class GroupMemberInfo {
        
        /**
         * 组成员记录ID
         */
        private Long id;
        
        /**
         * 用户ID
         */
        private Long userId;
        
        /**
         * 用户昵称
         */
        private String nickname;
        
        /**
         * 用户头像URL
         */
        private String avatar;
        
        /**
         * 用户在组中的角色
         * ADMIN = 管理员，MEMBER = 普通成员
         */
        private String role;
        
        /**
         * 加入时间
         */
        private LocalDateTime createTime;
    }
}
