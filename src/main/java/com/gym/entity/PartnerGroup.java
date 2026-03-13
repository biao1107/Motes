/**
 * ============================================
 * 健身搭子组实体类
 * ============================================
 * 作用：
 * 对应数据库表 t_partner_group，存储组的基本信息
 * 
 * 什么是搭子组？
 * 搭子组是2-3人的健身小组，成员可以互相监督训练、分享进度
 * 
 * 数据库表结构：
 * - id: 主键，自增
 * - group_name: 组名称
 * - fixed_time: 固定训练时间（如：早上、晚上、周末）
 * - status: 状态（0=解散，1=正常）
 * - create_time: 创建时间
 * 
 * 关联表：
 * - t_group_member: 存储组成员关系
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
 * @TableName("t_partner_group") 说明：
 * 指定对应的数据库表名
 */
@TableName("t_partner_group")
public class PartnerGroup {
    
    /**
     * 组ID，主键，自增
     * @TableId 标记这是主键字段
     * type = IdType.AUTO 表示数据库自增
     */
    @TableId(type = IdType.AUTO)
    private Long id;
    
    /**
     * 组名称
     * 例如："减脂小分队"、"增肌小队"
     */
    private String groupName;
    
    /**
     * 固定训练时间
     * 例如："早上"、"晚上"、"周末"
     * 表示组员约定一起训练的时间段
     */
    private String fixedTime;
    
    /**
     * 组状态
     * 0 = 解散（已删除）
     * 1 = 正常（使用中）
     */
    private Integer status;
    
    /**
     * 创建时间
     * 记录组创建的时间戳
     */
    private LocalDateTime createTime;
}








