/**
 * ============================================
 * 组详情数据传输对象（DTO）
 * ============================================
 * 作用：
 * 封装组详情数据，包含组基本信息和成员详细信息
 * 
 * 什么是DTO？
 * DTO（Data Transfer Object）是数据传输对象
 * 用于在不同层之间传递数据，这里用于Service返回给Controller
 * 
 * 为什么需要这个DTO？
 * 1. 组合多个实体类的数据（PartnerGroup + GroupMember + User）
 * 2. 避免直接暴露数据库实体类
 * 3. 便于前端统一处理数据结构
 * 
 * 数据结构：
 * - 组基本信息（id, groupName, fixedTime, status, createTime）
 * - 成员列表（members）：每个成员包含用户信息和角色信息
 * 
 * 与实体类的区别：
 * - PartnerGroup: 只包含组基本信息
 * - GroupMember: 只包含关联关系
 * - GroupDetailDto: 组合了组信息、成员信息、用户信息
 * ============================================
 */
package com.gym.controller.dto;

// Lombok自动生成getter/setter
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @Data 说明：
 * Lombok注解，自动生成getter、setter、toString、equals、hashCode方法
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
     * 
     * @Data 说明：
     * Lombok注解，自动生成getter、setter等方法
     */
    @Data
    public static class GroupMemberInfo {
        
        /**
         * 组成员记录ID
         * 对应GroupMember表的id字段
         */
        private Long id;
        
        /**
         * 用户ID
         * 对应User表的id字段
         */
        private Long userId;
        
        /**
         * 用户昵称
         * 从User表查询获得
         */
        private String nickname;
        
        /**
         * 用户头像URL
         * 从User表查询获得，经过StorageService处理
         */
        private String avatar;
        
        /**
         * 用户在组中的角色
         * ADMIN = 管理员，MEMBER = 普通成员
         */
        private String role;
        
        /**
         * 加入时间
         * 记录用户何时加入该组
         */
        private LocalDateTime createTime;
    }
}
