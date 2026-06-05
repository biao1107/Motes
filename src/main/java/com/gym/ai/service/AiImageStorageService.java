package com.gym.ai.service;

import org.springframework.web.multipart.MultipartFile;

public interface AiImageStorageService {
    String uploadActionImage(Long userId, MultipartFile file);
}
