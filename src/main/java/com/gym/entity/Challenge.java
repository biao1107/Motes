package com.gym.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 挑战
 */
@Data
@TableName("t_challenge")
public class Challenge {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String challengeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String trainRequire;
    private Integer maxMembers;
    private Integer status; // 0 未开始 1 进行中 2 已结束
    private String coverImage;  // 挑战封面图片
    private Long groupId;  // 关联的搭子组ID
    @TableField(exist = false, select = false)  // 暂时标记为不存在，直到数据库更新完成
    private Long trainingPlanId;  // 关联的训练计划ID
    // 确保该字段在数据库中不存在时也能正常处理
    private LocalDateTime createTime;
}








