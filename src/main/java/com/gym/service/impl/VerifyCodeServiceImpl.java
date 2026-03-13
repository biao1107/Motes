package com.gym.service.impl;

import com.gym.service.VerifyCodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

/**
 * 验证码服务实现（模拟短信）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyCodeServiceImpl implements VerifyCodeService {

    private static final String CODE_PREFIX = "verify:code:";
    private static final int CODE_EXPIRE_MINUTES = 5;
    private static final int CODE_LENGTH = 6;

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public void sendCode(String phone) {
        // 生成6位随机验证码
        String code = generateCode();
        String key = CODE_PREFIX + phone;

        // 存储到Redis，5分钟过期
        redisTemplate.opsForValue().set(key, code, CODE_EXPIRE_MINUTES, TimeUnit.MINUTES);

        // 模拟发送短信（实际应该调用短信API）
        log.info("【模拟短信】发送验证码到 {}: {}", phone, code);
    }

    @Override
    public boolean verifyCode(String phone, String code) {
        String key = CODE_PREFIX + phone;
        Object storedCode = redisTemplate.opsForValue().get(key);
        if (storedCode == null) {
            return false;
        }
        boolean match = storedCode.toString().equals(code);
        if (match) {
            // 验证成功后删除
            redisTemplate.delete(key);
        }
        return match;
    }

    private String generateCode() {
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}






