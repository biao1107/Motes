/**
 * ============================================
 * 训练服务实现类
 * ============================================
 * 作用：
 * 实现训练进度的上报、查询、放弃等核心功能
 * 
 * 核心设计：
 * 1. Redis 缓存优先 - 训练进度先写入 Redis，保证高性能
 * 2. 异步落库 - 同时写入 MySQL 数据库，保证数据持久化
 * 3. 实时推送 - 通过 WebSocket 实时通知组内其他成员
 * 
 * Redis 数据结构：
 * - key: train:progress:{groupId}:{date} （如：train:progress:5:2024-01-15）
 * - type: Hash（哈希表）
 * - field: userId （用户ID）
 * - value: "done/target" （如："3/5" 表示完成3个，目标5个）
 * 
 * 为什么用 Redis Hash？
 * 1. 一个组一天的所有成员进度都存在一个 key 里，查询方便
 * 2. 支持单独更新某个成员的进度，不影响其他人
 * 3. 天然支持并发，配合 WATCH/MULTI/EXEC 事务保证数据一致性
 * ============================================
 */
package com.gym.service.impl;

// MyBatis-Plus 条件构造器
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
// 实体类
import com.gym.entity.*;
// 数据访问层
import com.gym.mapper.*;
// 服务接口
import com.gym.service.TrainingService;
import com.gym.service.WebSocketService;
import com.gym.service.ChallengeService;
import com.gym.service.StatService;
// Lombok 自动生成构造方法
import lombok.RequiredArgsConstructor;
// Lombok 日志注解
import lombok.extern.slf4j.Slf4j;
// Spring 数据访问异常
import org.springframework.dao.DataAccessException;
// Redis 操作模板
import org.springframework.data.redis.core.RedisTemplate;
// Redis 会话回调（用于事务）
import org.springframework.data.redis.core.SessionCallback;
// Spring 服务注解
import org.springframework.stereotype.Service;
// 事务注解
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Objects;

/**
 * @Service 说明：
 * 声明这是一个 Spring 服务类，会被 Spring 扫描并管理
 */
@Service
/**
 * @RequiredArgsConstructor 说明：
 * Lombok 自动生成包含所有 final 字段的构造方法
 * Spring 会自动注入这些依赖
 */
@RequiredArgsConstructor
/**
 * @Slf4j 说明：
 * Lombok 自动生成日志对象 log，可以使用 log.info()、log.debug() 等方法
 */
@Slf4j
public class TrainingServiceImpl implements TrainingService {

    /**
     * 训练进度缓存的 key 前缀
     * 完整 key 格式：train:progress:{groupId}:{date}
     * 示例：train:progress:5:2024-01-15
     */
    private static final String PROGRESS_PREFIX = "train:progress:";

    /**
     * redisTemplate: Redis 操作模板
     * 用于读写 Redis 缓存
     */
    private final RedisTemplate<String, Object> redisTemplate;
    
    /**
     * trainRecordMapper: 训练记录数据访问层
     * 用于操作 t_train_record 表
     */
    private final TrainRecordMapper trainRecordMapper;
    
    /**
     * challengeParticipantMapper: 挑战参与者数据访问层
     * 用于查询用户参与了哪些挑战
     */
    private final ChallengeParticipantMapper challengeParticipantMapper;

    /**
     * challengeMapper: 挑战数据访问层
     * 用于过滤只查询进行中（status=1）的挑战，避免已结束挑战被计入待办
     */
    private final ChallengeMapper challengeMapper;
    
    /**
     * webSocketService: WebSocket 服务
     * 用于实时推送训练进度通知
     */
    private final WebSocketService webSocketService;
    
    /**
     * challengeService: 挑战服务
     * 用于训练完成后自动打卡挑战
     */
    private final ChallengeService challengeService;
    
    /**
     * statService: 统计服务
     * 用于清除统计数据缓存
     */
    private final StatService statService;

    /**
     * 上报训练进度
     * 
     * @param userId 用户ID
     * @param groupId 搭子组ID
     * @param date 训练日期
     * @param done 已完成数量
     * @param target 目标数量
     * @param challengeId 关联的挑战ID（可选，用于自动打卡）
     * 
     * @Transactional 说明：
     * 开启事务，保证 Redis 和数据库操作的一致性
     * 如果过程中出现异常，所有操作会回滚
     * 
     * 核心流程：
     * 1. Redis 乐观锁更新（保证并发安全，只更新更大进度）
     * 2. 数据库落库（持久化存储）
     * 3. WebSocket 推送（实时通知组内成员）
     * 4. 自动打卡挑战（如果关联了挑战）
     * 5. 清除统计缓存（保证首页数据最新）
     */
    @Override
    @Transactional
    public void reportProgress(Long userId, Long groupId, LocalDate date, int done, int target, Long challengeId) {
        log.debug("报告训练进度: userId={}, groupId={}, date={}, done={}, target={}", userId, groupId, date, done, target);
        
        // ========== 第1步：构建 Redis key ==========
        // key 格式：train:progress:{groupId}:{date}
        String key = progressKey(groupId, date);
        
        // ========== 第2步：使用 Redis 事务更新进度 ==========
        // 使用 WATCH/MULTI/EXEC 乐观锁机制，保证并发下只更新更大进度
        // 为什么需要乐观锁？多个用户同时上报进度时，防止覆盖别人的更新
        int retry = 3;  // 最多重试3次
        while (retry-- > 0) {
            Object res = redisTemplate.execute(new SessionCallback<Object>() {
                @Override
                public Object execute(org.springframework.data.redis.core.RedisOperations operations) throws DataAccessException {
                    // WATCH：监视 key，如果 key 被其他客户端修改，事务会失败
                    operations.watch(key);
                    
                    // 获取当前进度
                    Object cur = operations.opsForHash().get(key, userId.toString());
                    int curDone = 0;
                    if (cur != null) {
                        // 解析 "done/target" 格式，提取 done 值
                        String[] parts = cur.toString().split("/");
                        curDone = Integer.parseInt(parts[0]);
                    }
                    
                    // 如果当前进度 >= 新进度，不更新（防止进度回退）
                    if (done <= curDone) {
                        operations.unwatch();  // 取消监视
                        return null;  // 返回 null 表示无需更新
                    }
                    
                    // MULTI：开启事务
                    operations.multi();
                    
                    // 组装新的进度值："done/target"
                    String val = done + "/" + target;
                    
                    // 将进度存入 Hash：field=userId, value="done/target"
                    operations.opsForHash().put(key, userId.toString(), val);
                    
                    // EXEC：执行事务，返回事务结果
                    // 如果 key 在 WATCH 后被修改，exec() 返回 null（事务失败）
                    return operations.exec();
                }
            });
            
            // 如果 res 不为 null，说明事务执行成功，跳出重试循环
            if (res != null) {
                break;
            }
            // 如果 res 为 null，说明事务冲突，重试
            log.warn("Redis 事务冲突，重试剩余次数: {}", retry);
        }

        // ========== 第3步：数据库落库（持久化） ==========
        // 查询当日是否已有记录
        TrainRecord record = trainRecordMapper.selectOne(new LambdaQueryWrapper<TrainRecord>()
                .eq(TrainRecord::getUserId, userId)
                .eq(TrainRecord::getTrainDate, date));
        
        if (record == null) {
            // 没有记录，插入新记录
            record = new TrainRecord();
            record.setUserId(userId);
            record.setGroupId(groupId);
            record.setTrainDate(date);
            record.setCompleteCount(done);
            // status: 0-未完成, 1-完成, 2-放弃
            record.setStatus(done >= target ? 1 : 0);
            record.setCreateTime(LocalDateTime.now());
            record.setUpdateTime(LocalDateTime.now());
            trainRecordMapper.insert(record);
        } else {
            // 有记录，仅当进度更大时更新（与 Redis 保持一致）
            if (done > Objects.requireNonNullElse(record.getCompleteCount(), 0)) {
                record.setCompleteCount(done);
                record.setStatus(done >= target ? 1 : 0);
                record.setUpdateTime(LocalDateTime.now());
                trainRecordMapper.updateById(record);
            }
        }

        // ========== 第4步：WebSocket 推送实时通知 ==========
        // 通知组内其他成员，有人更新了训练进度
        webSocketService.notifyProgressUpdate(groupId, userId, done, target);
        
        // ========== 第5步：自动打卡挑战（如果关联了挑战） ==========
        if (challengeId != null) {
            try {
                // 先检查用户是否参与了该挑战（防止未参与却传了 challengeId）
                if (challengeService.checkUserChallengeParticipation(userId, challengeId)) {
                    // 执行打卡
                    challengeService.punch(userId, challengeId, date, null);
                    log.info("自动打卡成功: userId={}, challengeId={}, date={}", userId, challengeId, date);
                } else {
                    log.info("用户未参与该挑战，跳过自动打卡: userId={}, challengeId={}", userId, challengeId);
                }
            } catch (Exception e) {
                // 打卡失败不影响训练进度上报，只记录日志
                log.warn("自动打卡失败（不影响训练进度）: userId={}, challengeId={}, error={}", 
                         userId, challengeId, e.getMessage());
            }
        }
        
        // ========== 第6步：清除统计缓存 ==========
        // 训练记录更新后，清除用户的统计数据缓存
        // 这样下次请求首页统计数据时，会从数据库重新计算，保证数据最新
        try {
            statService.clearHomeStatsCache(userId);
        } catch (Exception e) {
            log.warn("清除用户统计数据缓存失败: {}", e.getMessage());
        }
        
        log.debug("成功报告训练进度: userId={}, groupId={}, date={}", userId, groupId, date);
    }

    /**
     * 开始训练
     * 
     * @param userId 用户ID
     * @param groupId 搭子组ID
     * 
     * 作用：
     * 用户点击"开始训练"时调用，通过 WebSocket 通知组内其他成员
     * 让其他人知道有人开始训练了，起到互相监督的作用
     */
    @Override
    public void startTraining(Long userId, Long groupId) {
        log.info("用户开始训练: userId={}, groupId={}", userId, groupId);
        
        // 推送训练启动通知给组内其他成员
        // 前端收到通知后，可以在页面上显示"某某开始训练了"
        webSocketService.notifyTrainingStart(groupId, userId);
    }

    /**
     * 放弃训练
     * 
     * @param userId 用户ID
     * @param groupId 搭子组ID
     * @param date 训练日期
     * 
     * @Transactional 说明：
     * 开启事务，保证数据库操作的原子性
     * 
     * 作用：
     * 用户中途放弃训练时调用，将训练记录状态改为"放弃"
     * 并通过 WebSocket 通知组内其他成员
     */
    @Override
    @Transactional
    public void abandonTraining(Long userId, Long groupId, LocalDate date) {
        log.info("用户放弃训练: userId={}, groupId={}, date={}", userId, groupId, date);
        
        // ========== 第1步：查询训练记录 ==========
        TrainRecord record = trainRecordMapper.selectOne(new LambdaQueryWrapper<TrainRecord>()
                .eq(TrainRecord::getUserId, userId)
                .eq(TrainRecord::getGroupId, groupId)
                .eq(TrainRecord::getTrainDate, date));
        
        // ========== 第2步：更新状态为放弃 ==========
        if (record != null) {
            record.setStatus(2); // status: 2-放弃
            record.setUpdateTime(LocalDateTime.now());
            trainRecordMapper.updateById(record);
        }

        // ========== 第3步：推送放弃通知 ==========
        // 通知组内其他成员，有人放弃了训练
        webSocketService.notifyTrainingAbandon(groupId, userId);
        
        // ========== 第4步：清除统计缓存 ==========
        // 训练状态变更后，清除统计数据缓存，保证首页数据最新
        try {
            statService.clearHomeStatsCache(userId);
        } catch (Exception e) {
            log.warn("清除用户统计数据缓存失败: {}", e.getMessage());
        }
    }
    
    /**
     * 获取今日训练记录
     * 
     * @param userId 用户ID
     * @return 今日训练记录列表
     * 
     * 作用：
     * 查询用户今天的所有训练记录，用于"今日训练"页面展示
     * 按创建时间倒序排列，最新的排在前面
     */
    @Override
    public List<TrainRecord> getTodayTraining(Long userId) {
        log.info("获取今日训练记录: userId={}", userId);
        
        // 获取今天的日期
        LocalDate today = LocalDate.now();
        
        // ========== 构建查询条件 ==========
        LambdaQueryWrapper<TrainRecord> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(TrainRecord::getUserId, userId)      // 指定用户
                   .eq(TrainRecord::getTrainDate, today)     // 今天
                   .orderByDesc(TrainRecord::getCreateTime); // 按创建时间倒序
        
        // ========== 执行查询 ==========
        List<TrainRecord> records = trainRecordMapper.selectList(queryWrapper);
        
        log.info("获取到今日训练记录数量: {}", records.size());
        return records;
    }

    /**
     * 获取今日待办挑战数量
     * 
     * @param userId 用户ID
     * @return 待办数量（今天还没打卡的挑战数）
     * 
     * 作用：
     * 用于首页显示"今日待办"指标，提醒用户还有多少挑战没完成
     * 
     * 业务逻辑：
     * 1. 查询用户参与的「进行中」挑战（status=1）
     * 2. 逐个检查今天是否已打卡
     * 3. 统计未打卡的挑战数量
     * 
     * 注意：只统计进行中的挑战，已结束（status=2）的挑战不计入待办
     */
    @Override
    public int getTodoCount(Long userId) {
        log.info("获取今日待办挑战数量: userId={}", userId);
        
        LocalDate today = LocalDate.now();
        
        // ========== 第1步：查询用户参与的「进行中」挑战 ==========
        // 先查询用户参与的所有挑战ID
        List<Long> userChallengeIds = challengeParticipantMapper.selectList(
            new LambdaQueryWrapper<ChallengeParticipant>()
                .eq(ChallengeParticipant::getUserId, userId)
        ).stream()
         .map(ChallengeParticipant::getChallengeId)
         .collect(Collectors.toList());
        
        // 如果用户没有参与任何挑战，直接返回0
        if (userChallengeIds.isEmpty()) {
            log.info("用户 {} 没有参与任何挑战", userId);
            return 0;
        }
        
        // 再过滤出「进行中」的挑战（status=1）
        List<Challenge> activeChallenges = challengeMapper.selectList(
            new LambdaQueryWrapper<Challenge>()
                .in(Challenge::getId, userChallengeIds)
                .eq(Challenge::getStatus, 1)  // 1=进行中，2=已结束
        );
        
        // 如果没有进行中的挑战，直接返回0
        if (activeChallenges.isEmpty()) {
            log.info("用户 {} 没有进行中的挑战", userId);
            return 0;
        }
        
        // ========== 第2步：统计未打卡的挑战数量 ==========
        int todoCount = 0;
        
        try {
            for (Challenge challenge : activeChallenges) {
                Long challengeId = challenge.getId();
                
                // 构建打卡记录的 Redis key
                // key 格式：punch:{userId}:{challengeId}:{date}
                String punchKey = "punch:" + userId + ":" + challengeId + ":" + today;
                
                // 检查 Redis 中是否存在这个 key
                // 存在说明今天已打卡，不存在说明未打卡
                Boolean hasPunchedToday = redisTemplate.hasKey(punchKey);
                
                // 如果未打卡，待办数+1
                if (hasPunchedToday == null || !hasPunchedToday) {
                    todoCount++;
                }
            }
        } catch (Exception e) {
            // Redis 不可用时的降级方案：假设所有挑战都未打卡
            // 这样用户会看到待办数量，但可能包含已打卡的挑战
            log.warn("Redis 连接失败，待办统计使用降级方案: {}", e.getMessage());
            todoCount = activeChallenges.size();
        }
        
        log.info("用户 {} 今日待办挑战数量（进行中）: {}/{}", userId, todoCount, activeChallenges.size());
        return todoCount;
    }

    /**
     * 构建训练进度的 Redis key
     * 
     * @param groupId 组ID
     * @param date 日期
     * @return Redis key 字符串
     * 
     * key 格式：train:progress:{groupId}:{date}
     * 示例：train:progress:5:2024-01-15
     */
    private String progressKey(Long groupId, LocalDate date) {
        return PROGRESS_PREFIX + groupId + ":" + date;
    }
}