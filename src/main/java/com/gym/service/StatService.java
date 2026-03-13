package com.gym.service;

import java.util.Map;

/**
 * 数据统计服务
 */
public interface StatService {
    /**
     * 获取个人统计数据
     */
    Map<String, Object> getPersonalStats(Long userId);

    /**
     * 获取组统计数据
     */
    Map<String, Object> getGroupStats(Long groupId);

    /**
     * 获取挑战统计数据
     */
    Map<String, Object> getChallengeStats(Long challengeId);
    
    /**
     * 获取首页核心统计数据（训练天数、健身搭子数量、进行中挑战）
     */
    Map<String, Object> getHomeStats(Long userId);
    
    /**
     * 清除首页统计数据缓存
     */
    void clearHomeStatsCache(Long userId);
}






