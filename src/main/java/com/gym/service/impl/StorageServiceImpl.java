package com.gym.service.impl;

import com.gym.service.StorageService;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * MinIO存储服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StorageServiceImpl implements StorageService {

    @Value("${minio.actions-bucket:actions}")
    private String actionsBucket;
    
    @Value("${minio.avatars-bucket:avatars}")
    private String avatarsBucket;

    @Value("${minio.course-videos-bucket:course-videos}")
    private String courseVideosBucket;

    private final MinioClient minioClient;

    @Value("${minio.endpoint}")
    private String endpoint;

    @Override
    public String uploadActionFile(Long userId, MultipartFile file) {
        try {
            ensureBucketExists(actionsBucket);

            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") ?
                    originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
            String objectName = String.format("actions/%s/%s_%s%s",
                    userId,
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")),
                    UUID.randomUUID().toString().substring(0, 8),
                    extension);

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(actionsBucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());

            log.info("上传动作文件成功: userId={}, objectName={}", userId, objectName);
            return objectName;
        } catch (Exception e) {
            log.error("上传动作文件失败: userId={}", userId, e);
            throw new RuntimeException("上传文件失败", e);
        }
    }

    @Override
    public String getFileUrl(String objectName) {
        try {
            if (objectName == null || objectName.isEmpty()) {
                return null;
            }
            // 如果已经是完整 URL，提取对象名重新生成固定直链
            // （避免旧的预签名 URL 过期后 403）
            if (objectName.startsWith("http://") || objectName.startsWith("https://")) {
                try {
                    java.net.URL parsed = new java.net.URL(objectName);
                    String path = parsed.getPath(); // 如 /actions/xxx.jpg
                    String extracted = path.replaceFirst("^/[^/]+/", ""); // 去掉 /bucket/
                    if (!extracted.isEmpty()) {
                        objectName = extracted;
                        log.debug("从完整URL提取对象名: {}", objectName);
                    } else {
                        return objectName; // 无法提取，直接返回原值
                    }
                } catch (Exception e) {
                    return objectName;
                }
            }

            // 根据对象名前缀判断所属 bucket
            String bucket;
            if (objectName.startsWith("actions/")) {
                bucket = actionsBucket;
            } else if (objectName.startsWith("avatars/")) {
                bucket = avatarsBucket;
            } else if (objectName.startsWith("course-videos/")) {
                bucket = courseVideosBucket;
            } else {
                bucket = actionsBucket;
            }

            // 所有 bucket 均已设置公开读策略，直接返回固定直链（不使用预签名，永不过期）
            String url = String.format("%s/%s/%s", endpoint, bucket, objectName);
            log.debug("生成固定直链: objectName={}, url={}", objectName, url);
            return url;
        } catch (Exception e) {
            log.error("生成文件访问URL失败: objectName={}", objectName, e);
            throw new RuntimeException("生成文件访问URL失败", e);
        }
    }

    @Override
    public void ensureBucketExists(String bucketName) throws Exception {
        if (!minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build())) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            log.info("创建Bucket成功: {}", bucketName);
        }
        
        // 设置桶策略为公共读（确保前端可以访问）
        String policy = "{\n" +
                "    \"Version\": \"2012-10-17\",\n" +
                "    \"Statement\": [\n" +
                "        {\n" +
                "            \"Effect\": \"Allow\",\n" +
                "            \"Principal\": \"*\",\n" +
                "            \"Action\": [\n" +
                "                \"s3:GetObject\"\n" +
                "            ],\n" +
                "            \"Resource\": [\n" +
                "                \"arn:aws:s3:::" + bucketName + "/*\"\n" +
                "            ]\n" +
                "        }\n" +
                "    ]\n" +
                "}";
        
        minioClient.setBucketPolicy(io.minio.SetBucketPolicyArgs.builder()
                .bucket(bucketName)
                .config(policy)
                .build());
    }
}
