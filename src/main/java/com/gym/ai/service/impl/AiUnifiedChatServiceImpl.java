package com.gym.ai.service.impl;

import com.gym.ai.AiFitnessAdvisor;
import com.gym.ai.AiFitnessAdvisorService;
import com.gym.ai.AiFitnessContextBuilder;
import com.gym.ai.service.AiUnifiedChatService;
import com.gym.common.ErrorCode;
import com.gym.common.exception.BizException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AiUnifiedChatServiceImpl implements AiUnifiedChatService {

    private final AiFitnessAdvisorService aiFitnessAdvisorService;
    private final AiFitnessAdvisor aiFitnessAdvisor;
    private final AiFitnessContextBuilder aiFitnessContextBuilder;

    @Override
    public String chat(Long userId, Integer memoryId, String message, String imageUrl) {
        boolean hasMessage = StringUtils.hasText(message);
        boolean hasImage = StringUtils.hasText(imageUrl);

        if (!hasMessage && !hasImage) {
            throw new BizException(ErrorCode.BAD_REQUEST, "消息和图片不能同时为空");
        }

        if (hasImage) {
            String prompt = aiFitnessContextBuilder.buildActionAnalysisPrompt(userId, message);
            return aiFitnessAdvisor.analyzeActionImageByUrl(prompt, imageUrl);
        }

        String prompt = aiFitnessContextBuilder.buildChatPrompt(userId, message);
        int safeMemoryId = memoryId == null || memoryId < 1 ? 1 : memoryId;
        return aiFitnessAdvisorService.chat(safeMemoryId, prompt);
    }
}
