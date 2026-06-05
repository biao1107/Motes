package com.gym.ai.controller;

import com.gym.ai.AiFitnessAdvisor;
import com.gym.ai.AiFitnessAdvisorService;
import com.gym.ai.AiFitnessContextBuilder;
import com.gym.ai.dto.AiActionAnalysisRequest;
import com.gym.ai.dto.AiImageUploadResponse;
import com.gym.ai.dto.AiUnifiedChatRequest;
import com.gym.ai.service.AiImageStorageService;
import com.gym.ai.service.AiUnifiedChatService;
import com.gym.common.ApiResponse;
import com.gym.common.ErrorCode;
import com.gym.common.exception.BizException;
import com.gym.controller.BaseAuthenticatedController;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Validated
public class AiController extends BaseAuthenticatedController {

    private final AiFitnessAdvisorService aiFitnessAdvisorService;
    private final AiFitnessAdvisor aiFitnessAdvisor;
    private final AiFitnessContextBuilder aiFitnessContextBuilder;
    private final AiImageStorageService aiImageStorageService;
    private final AiUnifiedChatService aiUnifiedChatService;

    @GetMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> chat(
            @RequestParam @Min(1) int memoryId,
            @RequestParam @NotBlank String message,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        String prompt = aiFitnessContextBuilder.buildChatPrompt(userId, message);
        return aiFitnessAdvisorService.chatStream(memoryId, prompt)
                .map(chunk -> ServerSentEvent.<String>builder().data(chunk).build());
    }

    @GetMapping("/chat/sync")
    public ApiResponse<String> chatSync(
            @RequestParam @Min(1) int memoryId,
            @RequestParam @NotBlank String message,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        String prompt = aiFitnessContextBuilder.buildChatPrompt(userId, message);
        return ApiResponse.ok(aiFitnessAdvisorService.chat(memoryId, prompt));
    }

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

    @PostMapping(value = "/analyze-action", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<String> analyzeAction(
            @RequestBody @Valid AiActionAnalysisRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        validateImageUrl(request.getImageUrl());
        String prompt = aiFitnessContextBuilder.buildActionAnalysisPrompt(userId, request.getMessage());
        String result = aiFitnessAdvisor.analyzeActionImageByUrl(prompt, request.getImageUrl());
        return ApiResponse.ok(result);
    }

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
