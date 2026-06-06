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

/**
 * 统一图文对话服务实现
 *
 * <p>根据请求参数自动路由到不同的 AI 处理逻辑：
 * <ul>
 *   <li><b>有图片 →</b> 调用 {@link AiFitnessAdvisor#analyzeActionImageByUrl} 进行多模态动作分析</li>
 *   <li><b>纯文本 →</b> 调用 {@link AiFitnessAdvisorService#chat} 进行文本对话</li>
 * </ul>
 *
 * <p>图文均未提供时将抛出 {@link BizException}。
 *
 * @see AiUnifiedChatService
 * @see AiFitnessAdvisor
 * @see AiFitnessAdvisorService
 */
@Service
@RequiredArgsConstructor
public class AiUnifiedChatServiceImpl implements AiUnifiedChatService {

    /** AI 健身顾问服务（纯文本对话） */
    private final AiFitnessAdvisorService aiFitnessAdvisorService;

    /** AI 健身顾问（多模态图文分析） */
    private final AiFitnessAdvisor aiFitnessAdvisor;

    /** AI 上下文构建器（构建带用户档案的提示词） */
    private final AiFitnessContextBuilder aiFitnessContextBuilder;

    /**
     * 统一图文对话入口
     *
     * <p>根据是否提供图片自动选择处理分支：
     * <ol>
     *   <li><b>有图片：</b>构建动作分析提示词 → 调用多模态模型分析</li>
     *   <li><b>无图片：</b>构建聊天提示词 → 调用纯文本模型对话</li>
     * </ol>
     *
     * @param userId   当前登录用户 ID，用于获取用户档案
     * @param memoryId 对话记忆 ID（为 null 或 <1 时默认 1）
     * @param message  用户消息文本（可选，但不可与 imageUrl 同时为空）
     * @param imageUrl 动作图片 URL（可选，但不可与 message 同时为空）
     * @return AI 分析结果或聊天回复
     * @throws BizException 如果消息和图片同时为空
     */
    @Override
    public String chat(Long userId, Integer memoryId, String message, String imageUrl) {
        boolean hasMessage = StringUtils.hasText(message);
        boolean hasImage = StringUtils.hasText(imageUrl);

        if (!hasMessage && !hasImage) {
            throw new BizException(ErrorCode.BAD_REQUEST, "消息和图片不能同时为空");
        }

        if (hasImage) {
            // 图文分支：用多模态模型分析动作图片
            String prompt = aiFitnessContextBuilder.buildActionAnalysisPrompt(userId, message);
            return aiFitnessAdvisor.analyzeActionImageByUrl(prompt, imageUrl);
        }

        // 纯文本分支：用文本模型对话
        String prompt = aiFitnessContextBuilder.buildChatPrompt(userId, message);
        int safeMemoryId = memoryId == null || memoryId < 1 ? 1 : memoryId;
        return aiFitnessAdvisorService.chat(safeMemoryId, prompt);
    }
}