package com.gym.consumer;

import com.gym.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * RabbitMQ消息消费者：处理异步通知
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotifyConsumer {

    private final WebSocketService webSocketService;

    /**
     * 处理打卡提醒
     */
    @RabbitListener(queues = "notify.punch.remind")
    public void handlePunchRemind(Map<String, Object> message) {
        try {
            Long userId = Long.valueOf(message.get("userId").toString());
            Long challengeId = Long.valueOf(message.get("challengeId").toString());
            String msg = "挑战打卡提醒：今天是挑战日，记得完成训练并打卡哦！";
            Map<String, Object> data = new HashMap<>();
            data.put("type", "PUNCH_REMIND");
            data.put("challengeId", challengeId);
            webSocketService.sendToUser(userId, msg, data);
            log.info("打卡提醒推送成功: userId={}, challengeId={}", userId, challengeId);
        } catch (Exception e) {
            log.error("处理打卡提醒失败", e);
        }
    }


}
