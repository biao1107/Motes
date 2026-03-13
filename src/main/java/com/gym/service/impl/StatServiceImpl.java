package com.gym.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.gym.entity.Challenge;
import com.gym.entity.ChallengeParticipant;
import com.gym.entity.GroupMember;
import com.gym.entity.TrainRecord;
import com.gym.mapper.ChallengeMapper;
import com.gym.mapper.ChallengeParticipantMapper;
import com.gym.mapper.GroupMemberMapper;
import com.gym.mapper.TrainRecordMapper;
import com.gym.service.StatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ============================================
 * 数据统计服务实现类
 * ============================================
 * 
 * 【什么是统计服务？】
 * 这个类负责统计和汇总系统中的各类数据，为前端提供数据看板。
 * 就像学校的教务处，统计学生的出勤、成绩等信息。
 * 
 * 【统计的数据类型】
 * 1. 个人统计：用户的训练次数、完成率、平均分等
 * 2. 组统计：小组内成员的训练情况、排名等
 * 3. 挑战统计：参与人数、打卡天数、完成人数等
 * 4. 首页统计：训练天数、搭子数量、进行中挑战
 * 
 * 【缓存策略】
 * 使用 Redis 缓存统计结果，减少数据库查询压力：
 * - 缓存 key 格式：stat:30d:{类型}:{ID}
 * - 缓存时间：30分钟
 * - 降级方案：Redis 不可用时直接查数据库
 * 
 * 【为什么用 30 天作为统计周期？】
 * 健身习惯的养成需要持续跟踪，30 天（一个月）是合理的周期：
 * - 足够长：能看出趋势和习惯
 * - 不会太长：避免历史数据干扰当前状态
 * ============================================
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StatServiceImpl implements StatService {

    /**
     * 统计缓存的 key 前缀
     * 完整 key 格式：stat:30d:{类型}:{ID}
     * 示例：stat:30d:user:1（用户1的30天统计）
     */
    private static final String STAT_PREFIX = "stat:30d:";

    // ==================== 数据访问层依赖 ====================
    
    /**
     * 训练记录 Mapper
     * 用于查询用户的训练历史数据
     */
    private final TrainRecordMapper trainRecordMapper;
    
    /**
     * 组成员 Mapper
     * 用于查询用户所在组及组内成员
     */
    private final GroupMemberMapper groupMemberMapper;
    
    /**
     * 挑战参与者 Mapper
     * 用于查询用户参与的挑战
     */
    private final ChallengeParticipantMapper challengeParticipantMapper;
    
    /**
     * 挑战 Mapper
     * 用于查询挑战详情和状态
     */
    private final ChallengeMapper challengeMapper;
    
    /**
     * Redis 操作模板
     * 用于缓存统计结果，提高查询性能
     */
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 获取个人统计数据
     * 
     * 【统计维度】
     * 1. 总训练次数（30天内）
     * 2. 已完成次数（状态=1）
     * 3. 完成率（完成次数/总次数）
     * 4. 平均动作标准度分数
     * 5. 协同训练次数（有 groupId 的记录）
     * 
     * 【使用场景】
     * 个人中心页面展示用户的训练概况
     * 
     * @param userId 用户ID
     * @return 包含各项统计数据的 Map
     */
    @Override
    public Map<String, Object> getPersonalStats(Long userId) {
        // 构建缓存 key
        String cacheKey = STAT_PREFIX + "user:" + userId;
        
        // 【第1步：尝试从 Redis 缓存获取】
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) cached;
                log.debug("从缓存获取个人统计: userId={}", userId);
                return result;
            }
        } catch (Exception e) {
            // Redis 不可用时不影响主流程，继续查数据库
            log.warn("Redis获取缓存失败，使用降级方案: {}", e.getMessage());
        }

        // 【第2步：查询数据库计算统计数据】
        // 计算30天前的日期
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        
        // 查询30天内的训练记录
        List<TrainRecord> records = trainRecordMapper.selectList(
                new LambdaQueryWrapper<TrainRecord>()
                        .eq(TrainRecord::getUserId, userId)
                        .ge(TrainRecord::getTrainDate, thirtyDaysAgo));

        // 计算总次数
        int totalCount = records.size();
        
        // 计算已完成次数（status=1表示完成）
        long completedCount = records.stream()
                .filter(r -> r.getStatus() != null && r.getStatus() == 1)
                .count();
        
        // 计算完成率（百分比）
        double completionRate = totalCount > 0 ? (double) completedCount / totalCount * 100 : 0;

        // 计算平均动作标准度分数
        List<Integer> scores = records.stream()
                .filter(r -> r.getScore() != null)
                .map(TrainRecord::getScore)
                .collect(Collectors.toList());
        double avgScore = scores.isEmpty() ? 0 : 
                scores.stream().mapToInt(Integer::intValue).average().orElse(0);

        // 计算协同训练次数（有 groupId 表示是组队训练）
        long collaborativeCount = records.stream()
                .filter(r -> r.getGroupId() != null && r.getGroupId() > 0)
                .count();

        // 【第3步：组装结果】
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTrainCount", totalCount);
        stats.put("completedCount", completedCount);
        stats.put("completionRate", String.format("%.1f%%", completionRate));
        stats.put("avgScore", String.format("%.1f", avgScore));
        stats.put("collaborativeCount", collaborativeCount);

        // 【第4步：写入缓存（如果 Redis 可用）】
        try {
            redisTemplate.opsForValue().set(cacheKey, stats, 
                    java.time.Duration.ofMinutes(30));
        } catch (Exception e) {
            log.warn("Redis设置缓存失败，继续执行: {}", e.getMessage());
        }
        
        return stats;
    }

    /**
     * 获取组统计数据
     * 
     * 【统计维度】
     * 1. 组成员数量
     * 2. 组内总训练次数
     * 3. 已完成次数
     * 4. 完成率
     * 5. 成员贡献排名（谁训练最多）
     * 
     * 【使用场景】
     * 组详情页面展示小组整体训练情况
     * 
     * @param groupId 组ID
     * @return 包含各项统计数据的 Map
     */
    @Override
    public Map<String, Object> getGroupStats(Long groupId) {
        String cacheKey = STAT_PREFIX + "group:" + groupId;
        
        // 尝试从缓存获取
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) cached;
                return result;
            }
        } catch (Exception e) {
            log.warn("Redis获取缓存失败，使用降级方案: {}", e.getMessage());
        }

        // 获取组成员列表
        List<GroupMember> members = groupMemberMapper.selectList(
                new LambdaQueryWrapper<GroupMember>()
                        .eq(GroupMember::getGroupId, groupId));
        
        // 提取成员用户ID列表
        List<Long> userIds = members.stream()
                .map(GroupMember::getUserId)
                .collect(Collectors.toList());

        // 查询30天内的组训练记录
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        List<TrainRecord> records = trainRecordMapper.selectList(
                new LambdaQueryWrapper<TrainRecord>()
                        .eq(TrainRecord::getGroupId, groupId)
                        .ge(TrainRecord::getTrainDate, thirtyDaysAgo));

        // 计算统计数据
        int totalCount = records.size();
        long completedCount = records.stream()
                .filter(r -> r.getStatus() != null && r.getStatus() == 1)
                .count();
        double completionRate = totalCount > 0 ? 
                (double) completedCount / totalCount * 100 : 0;

        // 计算成员贡献排名（按完成训练次数排序）
        Map<Long, Long> userCounts = records.stream()
                .filter(r -> r.getStatus() != null && r.getStatus() == 1)
                .collect(Collectors.groupingBy(
                        TrainRecord::getUserId, 
                        Collectors.counting()));

        // 组装结果
        Map<String, Object> stats = new HashMap<>();
        stats.put("groupMemberCount", members.size());
        stats.put("totalTrainCount", totalCount);
        stats.put("completedCount", completedCount);
        stats.put("completionRate", String.format("%.1f%%", completionRate));
        stats.put("memberRanking", userCounts);

        // 写入缓存
        try {
            redisTemplate.opsForValue().set(cacheKey, stats, 
                    java.time.Duration.ofMinutes(30));
        } catch (Exception e) {
            log.warn("Redis设置缓存失败，继续执行: {}", e.getMessage());
        }
        
        return stats;
    }

    /**
     * 获取挑战统计数据
     * 
     * 【统计维度】
     * 1. 参与人数
     * 2. 总打卡天数（所有人打卡天数之和）
     * 3. 平均打卡天数
     * 4. 已完成人数（status=1）
     * 
     * 【使用场景】
     * 挑战详情页面展示挑战的参与情况
     * 
     * @param challengeId 挑战ID
     * @return 包含各项统计数据的 Map
     */
    @Override
    public Map<String, Object> getChallengeStats(Long challengeId) {
        // 查询所有参与者
        List<ChallengeParticipant> participants = challengeParticipantMapper.selectList(
                new LambdaQueryWrapper<ChallengeParticipant>()
                        .eq(ChallengeParticipant::getChallengeId, challengeId));

        // 组装统计结果
        Map<String, Object> stats = new HashMap<>();
        stats.put("participantCount", participants.size());
        stats.put("totalPunchDays", participants.stream()
                .mapToInt(ChallengeParticipant::getPunchDays)
                .sum());
        stats.put("avgPunchDays", participants.isEmpty() ? 0 :
                participants.stream()
                        .mapToInt(ChallengeParticipant::getPunchDays)
                        .average()
                        .orElse(0));

        // 计算已完成人数（status=1 表示已完成挑战）
        long completedCount = participants.stream()
                .filter(p -> p.getStatus() != null && p.getStatus() == 1)
                .count();
        stats.put("completedCount", completedCount);

        return stats;
    }
    
    /**
     * 获取首页核心统计数据
     * 
     * 【统计维度】
     * 1. 训练天数：30天内完成的训练记录数
     * 2. 健身搭子数量：用户所在组中的其他成员（去重）
     * 3. 进行中挑战数量：用户参与且状态为进行中的挑战数
     * 
     * 【什么是"健身搭子"？】
     * 搭子 = 用户所在组中的其他成员
     * 例如：用户在组A（成员：我、张三、李四）和组B（成员：我、张三、王五）
     * 搭子数量 = 张三、李四、王五 = 3人（张三只算一次）
     * 
     * 【使用场景】
     * 首页顶部展示用户的核心数据概览
     * 
     * @param userId 用户ID
     * @return 包含三项统计数据的 Map
     */
    @Override
    public Map<String, Object> getHomeStats(Long userId) {
        String cacheKey = STAT_PREFIX + "home:" + userId;
        
        // 尝试从缓存获取
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) cached;
                return result;
            }
        } catch (Exception e) {
            log.warn("Redis获取缓存失败，使用降级方案: {}", e.getMessage());
        }

        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        
        // 【第1步：统计训练天数】
        // 查询30天内已完成的训练记录
        List<TrainRecord> completedRecords = trainRecordMapper.selectList(
                new LambdaQueryWrapper<TrainRecord>()
                        .eq(TrainRecord::getUserId, userId)
                        .eq(TrainRecord::getStatus, 1) // 只统计完成的训练
                        .ge(TrainRecord::getTrainDate, thirtyDaysAgo));
        int trainDays = completedRecords.size();

        // 【第2步：统计健身搭子数量（去重）】
        // 第一步：获取用户所在的所有组ID
        List<GroupMember> userGroups = groupMemberMapper.selectList(
                new LambdaQueryWrapper<GroupMember>()
                        .eq(GroupMember::getUserId, userId)
                        .select(GroupMember::getGroupId)); // 只查groupId，提高效率
        
        List<Long> groupIds = userGroups.stream()
                .map(GroupMember::getGroupId)
                .collect(java.util.stream.Collectors.toList());
        
        // 第二步：获取这些组中的所有其他成员（排除自己）
        int partnersCount = 0;
        if (!groupIds.isEmpty()) {
            List<GroupMember> allMembers = groupMemberMapper.selectList(
                    new LambdaQueryWrapper<GroupMember>()
                            .in(GroupMember::getGroupId, groupIds)
                            .ne(GroupMember::getUserId, userId)); // 排除自己
            
            // 第三步：按用户ID去重，统计唯一搭子数量
            partnersCount = (int) allMembers.stream()
                    .map(GroupMember::getUserId)
                    .distinct() // 去重：同一个人在多个组只算一个搭子
                    .count();
        }

        // 【第3步：统计进行中的挑战数量】
        // 查询用户参与的所有挑战
        List<ChallengeParticipant> userChallenges = challengeParticipantMapper.selectList(
                new LambdaQueryWrapper<ChallengeParticipant>()
                        .eq(ChallengeParticipant::getUserId, userId));
        
        // 检查每个挑战的状态，统计进行中的数量
        int activeChallengesCount = 0;
        for (ChallengeParticipant participant : userChallenges) {
            Challenge challenge = challengeMapper.selectById(participant.getChallengeId());
            if (challenge != null && challenge.getStatus() != null && challenge.getStatus() == 1) {
                // 挑战状态为1表示进行中
                activeChallengesCount++;
            }
        }

        // 【第4步：组装结果并缓存】
        Map<String, Object> stats = new HashMap<>();
        stats.put("trainDays", trainDays);
        stats.put("partnersCount", partnersCount);
        stats.put("activeChallenges", activeChallengesCount);

        // 写入缓存
        try {
            redisTemplate.opsForValue().set(cacheKey, stats, 
                    java.time.Duration.ofMinutes(30));
        } catch (Exception e) {
            log.warn("Redis设置缓存失败，继续执行: {}", e.getMessage());
        }
        
        return stats;
    }
    
    /**
     * 清除首页统计数据缓存
     * 
     * 【使用场景】
     * 当用户的训练数据发生变化时（如完成训练、加入新组等），
     * 需要清除缓存，确保下次查询获取最新数据。
     * 
     * 【调用时机】
     * - 训练完成后
     * - 加入/退出组后
     * - 参与/退出挑战后
     * 
     * @param userId 用户ID
     */
    @Override
    public void clearHomeStatsCache(Long userId) {
        String cacheKey = STAT_PREFIX + "home:" + userId;
        try {
            redisTemplate.delete(cacheKey);
            log.debug("已清除用户首页统计数据缓存: userId={}, cacheKey={}", userId, cacheKey);
        } catch (Exception e) {
            log.warn("清除用户首页统计数据缓存失败: userId={}, error={}", userId, e.getMessage());
        }
    }
}
