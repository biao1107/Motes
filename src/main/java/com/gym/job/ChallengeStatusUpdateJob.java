package com.gym.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.gym.config.RabbitConfig;
import com.gym.entity.Challenge;
import com.gym.entity.ChallengeParticipant;
import com.gym.mapper.ChallengeMapper;
import com.gym.mapper.ChallengeParticipantMapper;
import com.gym.service.ChallengeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ============================================
 * 挑战相关定时任务
 * ============================================
 * 
 * 【什么是定时任务？】
 * 定时任务就像闹钟，在指定时间自动执行某些操作。
 * Spring 的 @Scheduled 注解可以让我们轻松定义定时任务。
 * 
 * 【本类包含的任务】
 * 1. 凌晨1点：更新挑战状态（未开始→进行中，进行中→已结束）
 * 2. 凌晨2点：删除过期挑战数据
 * 3. 早上8点：发送打卡提醒通知
 * 
 * 【cron 表达式说明】
 * cron = "秒 分 时 日 月 周"
 * - "0 0 1 * * ?" = 每天凌晨1点
 * - "0 0 8 * * ?" = 每天早上8点
 * - "0 0 2 * * ?" = 每天凌晨2点
 * ============================================
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChallengeStatusUpdateJob {

    private final ChallengeService challengeService;
    private final ChallengeMapper challengeMapper;
    private final ChallengeParticipantMapper challengeParticipantMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RabbitTemplate rabbitTemplate;

    /**
     * 每天凌晨1点执行，更新挑战状态
     * 
     * 【功能说明】
     * 自动检查所有挑战，根据日期更新状态：
     * - 开始日期已到 → 状态改为"进行中"
     * - 结束日期已过 → 状态改为"已结束"
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void updateChallengeStatus() {
        log.info("开始执行挑战状态更新任务");
        try {
            challengeService.updateChallengeStatus();
            log.info("挑战状态更新任务完成");
        } catch (Exception e) {
            log.error("挑战状态更新任务执行失败", e);
        }
    }

    /**
     * 每天凌晨2点执行，删除过期挑战
     * 
     * 【功能说明】
     * 删除结束超过7天的挑战及其参与记录，避免数据堆积
     * 保留7天是为了让用户还能查看最近完成的挑战报告
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupExpiredChallenges() {
        log.info("开始执行过期挑战删除任务");
        try {
            int deleted = challengeService.deleteExpiredChallenges(7);
            log.info("过期挑战删除任务完成，删除 {} 条", deleted);
        } catch (Exception e) {
            log.error("过期挑战删除任务执行失败", e);
        }
    }

    /**
     * 每天早上8点执行，发送打卡提醒
     * 
     * 【功能说明】
     * 遍历所有进行中的挑战，向今天未打卡的参与者发送提醒
     * 
     * 【流程】
     * 1. 查询所有进行中的挑战
     * 2. 遍历每个挑战的参与者
     * 3. 检查参与者今天是否已打卡
     * 4. 未打卡则发送提醒消息到 RabbitMQ 队列
     * 
     * 【为什么用 RabbitMQ？】
     * 如果用户很多，直接发送通知会很慢。
     * 用消息队列可以异步处理，不阻塞主流程。
     */
    @Scheduled(cron = "0 0 8 * * ?")
    public void sendPunchReminders() {
        log.info("开始执行打卡提醒任务");
        try {
            LocalDate today = LocalDate.now();
            int reminderCount = 0;

            // 【第1步：查询所有进行中的挑战】
            // status = 1 表示进行中
            List<Challenge> activeChallenges = challengeMapper.selectList(
                new LambdaQueryWrapper<Challenge>()
                    .eq(Challenge::getStatus, 1)
            );

            // 【第2步：遍历每个挑战】
            for (Challenge challenge : activeChallenges) {
                Long challengeId = challenge.getId();
                
                // 获取该挑战的所有参与者
                List<ChallengeParticipant> participants = challengeParticipantMapper.selectList(
                    new LambdaQueryWrapper<ChallengeParticipant>()
                        .eq(ChallengeParticipant::getChallengeId, challengeId)
                );

                // 【第3步：检查每个参与者是否已打卡】
                for (ChallengeParticipant participant : participants) {
                    Long userId = participant.getUserId();
                    
                    // 构建打卡记录的 Redis key
                    // key 格式：punch:{userId}:{challengeId}:{date}
                    String punchKey = "punch:" + userId + ":" + challengeId + ":" + today;
                    
                    // 检查 Redis 中是否存在这个 key
                    Boolean hasPunched = redisTemplate.hasKey(punchKey);
                    
                    // 如果未打卡，发送提醒
                    if (hasPunched == null || !hasPunched) {
                        sendPunchReminder(userId, challengeId);
                        reminderCount++;
                    }
                }
            }

            log.info("打卡提醒任务完成，发送提醒 {} 条", reminderCount);
        } catch (Exception e) {
            log.error("打卡提醒任务执行失败", e);
        }
    }

    /**
     * 发送打卡提醒消息到 RabbitMQ
     * 
     * 【消息格式】
     * {
     *   "userId": 123,
     *   "challengeId": 456
     * }
     * 
     * 【消费流程】
     * NotifyConsumer.handlePunchRemind() 会接收这个消息，
     * 然后通过 WebSocket 推送给用户。
     * 
     * @param userId 用户ID
     * @param challengeId 挑战ID
     */
    private void sendPunchReminder(Long userId, Long challengeId) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("userId", userId);
            message.put("challengeId", challengeId);
            
            // 发送到打卡提醒队列
            // NotifyConsumer 会监听这个队列并处理消息
            rabbitTemplate.convertAndSend(RabbitConfig.PUNCH_REMIND_QUEUE, message);
            
            log.debug("发送打卡提醒: userId={}, challengeId={}", userId, challengeId);
        } catch (Exception e) {
            log.error("发送打卡提醒失败: userId={}, challengeId={}", userId, challengeId, e);
        }
    }
}
