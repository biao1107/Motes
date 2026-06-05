package com.gym.ai.service.impl;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.CannedAccessControlList;
import com.gym.ai.service.AiImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiImageStorageServiceImpl implements AiImageStorageService {

    private final OSS aiOssClient;

    @Value("${ai.oss.bucket}")
    private String bucket;

    @Value("${ai.oss.public-endpoint}")
    private String publicEndpoint;

    @Override
    public String uploadActionImage(Long userId, MultipartFile file) {
        try {
            ensureBucketPublicRead();

            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";
            String objectKey = String.format(
                    "ai-actions/%s/%s_%s%s",
                    userId,
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")),
                    UUID.randomUUID().toString().substring(0, 8),
                    extension
            );

            aiOssClient.putObject(bucket, objectKey, file.getInputStream());
            String url = normalizeEndpoint(publicEndpoint) + "/" + objectKey;
            log.info("AI 动作图上传 OSS 成功: userId={}, objectKey={}, url={}", userId, objectKey, url);
            return url;
        } catch (Exception e) {
            log.error("AI 动作图上传 OSS 失败: userId={}", userId, e);
            throw new RuntimeException("AI 动作图上传失败", e);
        }
    }

    private void ensureBucketPublicRead() {
        if (!aiOssClient.doesBucketExist(bucket)) {
            aiOssClient.createBucket(bucket);
        }
        aiOssClient.setBucketAcl(bucket, CannedAccessControlList.PublicRead);
    }

    private String normalizeEndpoint(String endpoint) {
        if (endpoint.endsWith("/")) {
            return endpoint.substring(0, endpoint.length() - 1);
        }
        return endpoint;
    }
}
