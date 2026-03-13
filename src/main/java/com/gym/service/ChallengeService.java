package com.gym.service;

import com.gym.entity.Challenge;
import com.gym.entity.ChallengeParticipant;

import java.time.LocalDate;
import java.util.List;

/**
 * 挑战服务
 */
public interface ChallengeService {
    /**
     * 创建挑战（公开挑战或组内挑战）
     * @param groupId 组ID，为空或0表示公开挑战，否则为组内挑战
     */
    Long createChallenge(Long creatorId, String name, LocalDate startDate, LocalDate endDate,
                        String trainRequire, Integer maxMembers, String coverImage, Long groupId);

    /**
     * 参与挑战
     */
    void joinChallenge(Long userId, Long challengeId, Long groupId);

    /**
     * 打卡
     */
    void punch(Long userId, Long challengeId, LocalDate date, String actionFile);

    /**
     * 获取挑战列表
     */
    List<Challenge> listChallenges(Integer status);

    /**
     * 获取挑战详情
     */
    Challenge getChallengeDetail(Long challengeId);

    /**
     * 生成挑战报告
     * @return 挑战报告DTO，包含结构化数据供前端展示
     */
    com.gym.dto.ChallengeReportDto generateReport(Long challengeId);
    
    /**
     * 更新挑战状态（将过期挑战设置为已结束，将开始日期到达的挑战设置为进行中）
     */
    void updateChallengeStatus();

    /**
     * 获取组内挑战列表
     */
    List<Challenge> getGroupChallenges(Long groupId);
    
    /**
     * 获取挑战参与者列表
     */
    List<ChallengeParticipant> getChallengeParticipants(Long challengeId);
    
    /**
     * 检查用户是否参与了指定挑战
     */
    boolean checkUserChallengeParticipation(Long userId, Long challengeId);

    /**
     * 删除结束超过指定天数的挑战及其参与记录
     */
    int deleteExpiredChallenges(int daysAfterEnd);
}