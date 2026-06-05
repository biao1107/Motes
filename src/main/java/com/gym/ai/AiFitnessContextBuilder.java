package com.gym.ai;

import com.gym.entity.User;
import com.gym.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class AiFitnessContextBuilder {

    private final UserService userService;

    public String buildChatPrompt(Long userId, String message) {
        return buildProfileContext(userId)
                + "\n用户当前问题：\n"
                + safe(message, "请根据我的档案给我建议");
    }

    public String buildActionAnalysisPrompt(Long userId, String message) {
        String userMessage = StringUtils.hasText(message)
                ? message.trim()
                : "请分析这张健身动作图，指出动作问题并给我纠正建议。";
        return buildProfileContext(userId)
                + "\n本次任务：请结合动作图片分析用户姿势、发力、稳定性和动作幅度问题，给出具体纠正建议。"
                + "\n用户补充说明：\n"
                + userMessage;
    }

    private String buildProfileContext(Long userId) {
        User user = userService.getProfile(userId);
        String profileSummary = user == null
                ? "未读取到用户档案"
                : "昵称=" + safe(user.getNickname(), "未设置")
                + "，健身目标=" + safe(user.getFitnessGoal(), "未设置")
                + "，训练时间=" + safe(user.getTrainTime(), "未设置")
                + "，训练场景=" + safe(user.getTrainScene(), "未设置")
                + "，监督偏好=" + safe(user.getSuperviseDemand(), "未设置")
                + "，健身水平=" + safe(user.getFitnessLevel(), "未设置");

        return "当前用户档案：\n" + profileSummary;
    }

    private String safe(String value, String defaultValue) {
        return StringUtils.hasText(value) ? value.trim() : defaultValue;
    }
}
