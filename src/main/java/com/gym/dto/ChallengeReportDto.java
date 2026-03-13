package com.gym.dto;

import lombok.Data;

import java.util.List;

/**
 * 挑战报告数据传输对象
 * 
 * 【什么是DTO？】
 * DTO = Data Transfer Object，数据传输对象
 * 用于封装后端返回给前端的数据结构，让数据格式更清晰
 */
@Data
public class ChallengeReportDto {
    
    /**
     * 挑战名称
     */
    private String challengeName;
    
    /**
     * 开始日期
     */
    private String startDate;
    
    /**
     * 结束日期
     */
    private String endDate;
    
    /**
     * 参与人数
     */
    private int participantCount;
    
    /**
     * 参与者列表
     */
    private List<ParticipantDto> participants;
    
    /**
     * 参与者信息
     */
    @Data
    public static class ParticipantDto {
        /**
         * 用户ID
         */
        private Long userId;
        
        /**
         * 打卡天数
         */
        private int punchDays;
        
        /**
         * 完成率（百分比，如 83.3）
         */
        private double completionRate;
        
        /**
         * 打卡图片URL（用户最近一次打卡的图片）
         */
        private String actionFile;
    }
}
