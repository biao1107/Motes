/**
 * ============================================
 * 组成员实体类
 * ============================================
 * 作用：
 * 对应数据库表 t_group_member，存储用户和组的关联关系
 * 
 * 这是一个关联表（中间表），用于实现多对多关系：
 * - 一个用户可以加入多个组
 * - 一个组可以有多个用户
 * 
 * 数据库表结构：
 * - id: 主键，自增
 * - group_id: 组ID，关联t_partner_group表
 * - user_id: 用户ID，关联t_user表
 * - role: 角色（ADMIN=管理员，MEMBER=普通成员）
 * - create_time: 加入时间
 * - last_read_time: 最后阅读消息时间（用于消息未读数统计）
 * 
 * 权限设计：
 * - ADMIN（管理员）：可以删除组、邀请新成员
 * - MEMBER（成员）：只能查看和参与
 * ============================================
 */
package com.gym.entity;

// MyBatis-Plus主键注解
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
// MyBatis-Plus表名注解
import com.baomidou.mybatisplus.annotation.TableName;
// Lombok自动生成getter/setter
import lombok.Data;

import java.time.LocalDateTime;

/**
 * @Data 说明：
 * Lombok注解，自动生成getter、setter、toString、equals、hashCode方法
 */
@Data
/**
 * @TableName("t_group_member") 说明：
 * 指定对应的数据库表名
 */
@TableName("t_group_member")
public class GroupMember {
    
    /**
     * 记录ID，主键，自增
     * 这只是关联记录的唯一标识，业务上很少使用
     */
    @TableId(type = IdType.AUTO)
    private Long id;
    
    /**
     * 组ID
     * 关联PartnerGroup的id字段
     * 表示用户加入了哪个组
     */
    private Long groupId;
    
    /**
     * 用户ID
     * 关联User的id字段
     * 表示哪个用户加入了组
     */
    private Long userId;
    
    /**
     * 用户在组中的角色
     * ADMIN = 管理员（创建者），可以删除组、邀请成员
     * MEMBER = 普通成员，只能参与
     */
    private String role;
    
    /**
     * 加入时间
     * 记录用户何时加入该组
     */
    private LocalDateTime createTime;
    
    /**
     * 最后阅读消息时间
     * 用于统计未读消息数量
     * 当用户查看组内消息时，会更新这个时间
     */
    private LocalDateTime lastReadTime;
}








