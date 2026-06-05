package com.gym.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Slf4j
@Configuration
public class MinioConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.actions-bucket:actions}")
    private String actionsBucket;

    @Value("${minio.trophy-bucket:trophy}")
    private String trophyBucket;

    @Value("${minio.avatars-bucket:avatars}")
    private String avatarsBucket;

    @Value("${minio.courses-bucket:courses}")
    private String coursesBucket;

    @Bean
    public MinioClient minioClient() {
        try {
            MinioClient client = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();

            List<String> buckets = List.of(actionsBucket, trophyBucket, avatarsBucket, coursesBucket);
            for (String bucket : buckets) {
                initBucketWithPublicRead(client, bucket);
            }

            return client;
        } catch (Exception e) {
            log.warn("MinIO 初始化失败（不影响非存储功能）: {}", e.getMessage());
            return MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();
        }
    }

    private void initBucketWithPublicRead(MinioClient client, String bucketName) {
        try {
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("[MinIO] 创建 bucket: {}", bucketName);
            }

            String policy = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\","
                    + "\"Principal\":\"*\",\"Action\":[\"s3:GetObject\"],"
                    + "\"Resource\":[\"arn:aws:s3:::" + bucketName + "/*\"]}]}";
            client.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(bucketName).config(policy).build());
            log.info("[MinIO] bucket 公开读策略已设置: {}", bucketName);
        } catch (Exception e) {
            log.warn("[MinIO] 初始化 bucket 失败: {}, 原因: {}", bucketName, e.getMessage());
        }
    }
}
