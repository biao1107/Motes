/**
 * ============================================
 * 训练记录实体类
 * ============================================
 * 作用：
 * 映射数据库表 t_train_record，存储用户的训练完成情况
 * 
 * 什么是训练记录？
 * 用户在搭子组里完成训练后，系统会生成一条记录
 * 包含：谁、在哪个组、哪天、完成了多少、状态如何
 * 
 * 数据库表：t_train_record
 * ============================================
 */
package com.gym.entity;

// MyBatis-Plus 主键类型注解
import com.baomidou.mybatisplus.annotation.IdType;
// MyBatis-Plus 主键注解
import com.baomidou.mybatisplus.annotation.TableId;
// MyBatis-Plus 表名注解
import com.baomidou.mybatisplus.annotation.TableName;
// Lombok 自动生成 getter/setter/toString
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * @Data 说明：
 * Lombok 自动生成 getter、setter、toString、equals、hashCode 方法
 */
@Data
/**
 * @TableName("t_train_record") 说明：
 * 指定该实体类对应的数据库表名为 t_train_record
 */
@TableName("t_train_record")
public class TrainRecord {

    /**
     * 主键ID
     * @TableId(type = IdType.AUTO) 表示数据库自增
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 用户ID
     * 表示这条训练记录属于哪个用户
     */
    private Long userId;

    /**
     * 搭子组ID
     * 表示在哪个组完成的训练
     */
    private Long groupId;

    /**
     * 训练日期
     * 表示是哪天的训练（不是创建时间，是训练所属的日期）
     * 例如：2024-01-15
     */
    private LocalDate trainDate;

    /**
     * 完成数量
     * 表示完成了多少个动作/多少次训练
     * 例如：完成了3组俯卧撑
     */
    private Integer completeCount;

    /**
     * 得分（预留字段）
     * 目前未使用，可用于后续积分系统
     */
    private Integer score;

    /**
     * 训练状态
     * 0 - 未完成（进行中）
     * 1 - 已完成（达到目标）
     * 2 - 已放弃（中途放弃）
     */
    private Integer status;

    /**
     * 创建时间
     * 记录首次插入数据库的时间
     */
    private LocalDateTime createTime;

    /**
     * 更新时间
     * 记录最后一次修改的时间
     */
    private LocalDateTime updateTime;
}








