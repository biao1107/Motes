package com.gym.ai.controller;

import com.gym.ai.dto.AiImageUploadResponse;
import com.gym.ai.dto.AiUnifiedChatRequest;
import com.gym.ai.service.AiImageStorageService;
import com.gym.ai.service.AiUnifiedChatService;
import com.gym.common.ApiResponse;
import com.gym.common.ErrorCode;
import com.gym.common.exception.BizException;
import com.gym.controller.BaseAuthenticatedController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * AI 健身顾问控制器
 *
 * <p>提供 AI 相关的所有 REST API 接口，包括：
 * <ul>
 *   <li>图文统一对话</li>
 *   <li>动作图片上传</li>
 * </ul>
 *
 * <p>所有接口都需要登录认证（JWT Token），用户信息通过 {@link BaseAuthenticatedController#requireUserId} 获取。
 *
 * @see AiUnifiedChatService
 */
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Validated
public class AiController extends BaseAuthenticatedController {

    private final AiImageStorageService aiImageStorageService;
    private final AiUnifiedChatService aiUnifiedChatService;

    /**
     * 统一图文对话接口
     *
     * <p>支持同时传入文本和图片进行多模态对话，仅传文本时自动跳过图片处理。
     * 图片需要先通过 {@link #uploadActionImage} 上传获取 URL。
     *
     * <p>如果 {@code imageUrl} 不为空：
     * <ol>
     *   <li>校验图片 URL 格式合法性</li>
     *   <li>调用 {@link AiUnifiedChatService} 进行图文分析</li>
     * </ol>
     * 如果 {@code imageUrl} 为空，则仅处理文本对话。
     *
     * @param request       请求体（包含 memoryId、message、imageUrl）
     * @param authentication Spring Security 认证对象，自动注入
     * @return AI 分析结果的统一响应
     */
    @PostMapping(value = "/chat-unified", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<String> chatUnified(
            @RequestBody @Valid AiUnifiedChatRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
            validateImageUrl(request.getImageUrl());
        }
        String result = aiUnifiedChatService.chat(
                userId,
                request.getMemoryId(),
                request.getMessage(),
                request.getImageUrl()
        );
        return ApiResponse.ok(result);
    }

    /**
     * 上传动作图片
     *
     * <p>用户拍摄或选择健身动作照片（如深蹲、卧推），上传到 OSS 存储，
     * 返回可访问的图片 URL，供后续 {@link #chatUnified} 进行动作分析使用。
     *
     * <p>校验规则：
     * <ul>
     *   <li>文件不能为空</li>
     *   <li>仅支持图片类型（MIME 以 "image/" 开头）</li>
     * </ul>
     *
     * @param file          上传的图片文件（Multipart）
     * @param authentication Spring Security 认证对象，自动注入
     * @return 包含图片 URL 的统一响应
     */
    @PostMapping(value = "/upload-action-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<AiImageUploadResponse> uploadActionImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.BAD_REQUEST, "请上传动作图片");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BizException(ErrorCode.BAD_REQUEST, "仅支持图片文件");
        }
        Long userId = requireUserId(authentication);
        String imageUrl = aiImageStorageService.uploadActionImage(userId, file);
        return ApiResponse.ok(new AiImageUploadResponse(imageUrl));
    }

    /**
     * 校验图片 URL 格式
     *
     * <p>检查图片地址是否为空，以及是否以 http://、https:// 或 data:image/ 开头。
     * 被 {@link #chatUnified} 调用。
     *
     * @param imageUrl 待校验的图片 URL
     * @throws BizException 如果 URL 为空或格式不正确
     */
    private void validateImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new BizException(ErrorCode.BAD_REQUEST, "图片地址不能为空");
        }
        boolean valid = imageUrl.startsWith("http://")
                || imageUrl.startsWith("https://")
                || imageUrl.startsWith("data:image/");
        if (!valid) {
            throw new BizException(ErrorCode.BAD_REQUEST, "图片地址格式不正确");
        }
    }
}