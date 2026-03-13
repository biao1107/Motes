package com.gym.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户表实体
 */
@Data
@TableName("t_user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String phone;
    private String password;
    private String nickname;
    private String avatar;
    private String fitnessGoal;
    private String trainTime;
    private String trainScene;
    private String superviseDemand;
    private String fitnessLevel;
    private String role; // USER / ADMIN
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}








