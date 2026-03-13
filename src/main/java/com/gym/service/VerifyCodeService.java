package com.gym.service;

/**
 * 验证码服务
 */
public interface VerifyCodeService {
    /**
     * 发送验证码（模拟短信）
     */
    void sendCode(String phone);

    /**
     * 验证验证码
     */
    boolean verifyCode(String phone, String code);
}






