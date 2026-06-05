package com.gym.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiActionAnalysisRequest {

    @NotBlank(message = "图片地址不能为空")
    private String imageUrl;

    private String message;
}
