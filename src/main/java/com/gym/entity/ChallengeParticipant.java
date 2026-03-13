package com.gym.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 挑战参与
 */
@Data
@TableName("t_challenge_participant")
public class ChallengeParticipant {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long challengeId;
    private Long userId;
    private Long groupId;
    private Integer punchDays;
    private Integer status; // 0 未完成 1 已完成
    private String actionFile;
    private LocalDateTime createTime;
}








