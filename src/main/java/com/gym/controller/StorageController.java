package com.gym.controller;

import com.gym.common.ApiResponse;
import com.gym.entity.User;
import com.gym.service.StorageService;
import com.gym.service.UserService;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Slf4j
@RequestMapping("/storage")
@RequiredArgsConstructor
@Validated
public class StorageController {

    private final StorageService storageService;
    private final UserService userService;

    @Autowired
    private MinioClient minioClient;

    @Value("${minio.public-endpoint:${minio.endpoint}}")
    private String publicEndpoint;

    @Value("${minio.avatars-bucket:avatars}")
    private String avatarsBucket;

    @Value("${minio.challenges-bucket:challenges}")
    private String challengesBucket;

    @PostMapping("/upload/action")
    public ApiResponse<String> uploadActionFile(@RequestParam("file") MultipartFile file, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String objectName = storageService.uploadActionFile(userId, file);
        String url = storageService.getFileUrl(objectName);
        return ApiResponse.ok(url);
    }

    @GetMapping("/url")
    public ApiResponse<String> getFileUrl(@RequestParam @NotNull String objectName) {
        return ApiResponse.ok(storageService.getFileUrl(objectName));
    }

    @PostMapping("/upload/avatar")
    public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            log.info("开始上传头像: userId={}, fileName={}", userId, file.getOriginalFilename());

            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";
            String objectName = String.format("avatars/%d/avatar_%s%s", userId, System.currentTimeMillis(), extension);

            storageService.ensureBucketExists(avatarsBucket);

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(avatarsBucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());

            String url = normalizeEndpoint(publicEndpoint) + "/" + avatarsBucket + "/" + objectName;

            User user = userService.getProfile(userId);
            if (user != null) {
                user.setAvatar(url);
                userService.updateProfile(user);
            }

            return ApiResponse.ok(url);
        } catch (Exception e) {
            log.error("上传头像失败", e);
            return ApiResponse.error(500, "上传头像失败: " + e.getMessage());
        }
    }

    @GetMapping("/avatar-url/{userId}")
    public ApiResponse<String> getAvatarUrl(@PathVariable Long userId) {
        try {
            User user = userService.getProfile(userId);
            if (user != null && user.getAvatar() != null) {
                return ApiResponse.ok(user.getAvatar());
            } else {
                return ApiResponse.error(404, "用户头像不存在");
            }
        } catch (Exception e) {
            log.error("获取头像URL失败", e);
            return ApiResponse.error(500, "获取头像URL失败");
        }
    }

    @PostMapping("/upload/challenge-image")
    public ApiResponse<String> uploadChallengeImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long challengeId,
            Authentication authentication
    ) {
        try {
            Long userId = (Long) authentication.getPrincipal();

            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";
            String objectName = String.format(
                    "challenge-images/%d/challenge_%s_%s%s",
                    challengeId != null ? challengeId : userId,
                    challengeId != null ? challengeId : System.currentTimeMillis(),
                    java.util.UUID.randomUUID().toString().substring(0, 8),
                    extension
            );

            storageService.ensureBucketExists(challengesBucket);

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(challengesBucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());

            String url = normalizeEndpoint(publicEndpoint) + "/" + challengesBucket + "/" + objectName;
            return ApiResponse.ok(url);
        } catch (Exception e) {
            log.error("上传挑战图片失败", e);
            return ApiResponse.error(500, "上传挑战图片失败: " + e.getMessage());
        }
    }

    private String normalizeEndpoint(String endpoint) {
        if (endpoint.endsWith("/")) {
            return endpoint.substring(0, endpoint.length() - 1);
        }
        return endpoint;
    }
}
