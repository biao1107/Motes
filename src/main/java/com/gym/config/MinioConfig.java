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

/**
 * ============================================
 * MinIO 对象存储配置类
 * ============================================
 *
 * 【什么是 MinIO？】
 * MinIO 是一个高性能的对象存储服务器，兼容 Amazon S3 API。
 * 简单说，它就是一个自己搭建的"图床"或"文件服务器"，
 * 可以存储图片、视频、文档等文件，并通过 HTTP 访问。
 *
 * 【为什么不用数据库存文件？】
 * - 数据库适合存结构化数据（用户信息、订单等）
 * - 文件适合用对象存储：大文件不拖慢数据库，支持 CDN 加速
 *
 * 【Bucket（存储桶）是什么？】
 * Bucket 是 MinIO 中存储对象的容器，类似文件夹，但有独立权限。
 * 本项目使用多个 bucket 分类存储：
 * - actions：打卡图片
 * - trophy：奖杯/徽章图片
 * - avatars：用户头像
 * - courses：课程封面/视频
 *
 * 【公开读策略是什么？】
 * 默认创建的 bucket 是私有的，访问需要签名。
 * 设置公开读策略后，任何人都可以通过 URL 直接访问文件（如图片）。
 * 这是图片能在前端正常显示的关键。
 *
 * 【配置来源】
 * 所有配置从 application.yml 读取：
 *   minio:
 *     endpoint: http://localhost:9000
 *     access-key: minioadmin
 *     secret-key: minioadmin123
 * ============================================
 */
@Slf4j
@Configuration
public class MinioConfig {

    /**
     * MinIO 服务地址，如 http://localhost:9000
     */
    @Value("${minio.endpoint}")
    private String endpoint;

    /**
     * 访问密钥（类似用户名）
     */
    @Value("${minio.access-key}")
    private String accessKey;

    /**
     * 秘密密钥（类似密码）
     */
    @Value("${minio.secret-key}")
    private String secretKey;

    /**
     * 打卡图片存储桶名称，默认 "actions"
     */
    @Value("${minio.actions-bucket:actions}")
    private String actionsBucket;

    /**
     * 奖杯图片存储桶名称，默认 "trophy"
     */
    @Value("${minio.trophy-bucket:trophy}")
    private String trophyBucket;

    /**
     * 用户头像存储桶名称，默认 "avatars"
     */
    @Value("${minio.avatars-bucket:avatars}")
    private String avatarsBucket;

    /**
     * 课程资源存储桶名称，默认 "courses"
     */
    @Value("${minio.courses-bucket:courses}")
    private String coursesBucket;

    /**
     * 创建 MinIO 客户端 Bean
     *
     * 【执行流程】
     * 1. 创建 MinioClient 实例
     * 2. 初始化所有 bucket（不存在则创建）
     * 3. 设置每个 bucket 的公开读策略
     * 4. 返回配置好的客户端
     *
     * 【容错设计】
     * 如果 MinIO 服务未启动，记录警告但不阻断应用启动。
     * 这样非存储功能（如用户登录）仍能正常使用。
     * 当真正需要上传/下载文件时，操作会报错提示。
     *
     * @return 配置好的 MinioClient 实例
     */
    @Bean
    public MinioClient minioClient() {
        try {
            // 【第1步：创建客户端】
            // endpoint("localhost", 9000, false) 表示连接本地 9000 端口，不使用 HTTPS
            MinioClient client = MinioClient.builder()
                    .endpoint("localhost", 9000, false)
                    .credentials(accessKey, secretKey)
                    .build();

            // 【第2步：初始化所有 bucket】
            // 应用启动时自动检查并创建 bucket，确保后续操作不会报错
            List<String> buckets = List.of(actionsBucket, trophyBucket, avatarsBucket, coursesBucket);
            for (String bucket : buckets) {
                initBucketWithPublicRead(client, bucket);
            }

            return client;
        } catch (Exception e) {
            // 【容错处理】MinIO 未启动时记录警告，返回客户端实例
            // 这样应用可以启动，只是存储功能不可用
            log.warn("MinIO初始化失败（可能服务未启动，不影响非存储功能）: {}", e.getMessage());
            return MinioClient.builder()
                    .endpoint("localhost", 9000, false)
                    .credentials(accessKey, secretKey)
                    .build();
        }
    }

    /**
     * 初始化 bucket 并设置公开读策略
     *
     * 【功能】
     * 1. 检查 bucket 是否存在，不存在则创建
     * 2. 设置 bucket 的公开读策略（解决图片 403 问题）
     *
     * 【什么是公开读策略？】
     * 这是一个 JSON 格式的 AWS S3 兼容策略，含义：
     * - Effect: Allow（允许）
     * - Principal: *（任何人）
     * - Action: s3:GetObject（只能读取，不能写入/删除）
     * - Resource: arn:aws:s3:::bucketName/*（该 bucket 下的所有对象）
     *
     * 【为什么每次启动都要设置？】
     * 确保策略始终正确，防止手动修改后导致图片无法访问。
     *
     * @param client     MinioClient 实例
     * @param bucketName 要初始化的 bucket 名称
     */
    private void initBucketWithPublicRead(MinioClient client, String bucketName) {
        try {
            // 【检查 bucket 是否存在】
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());

            // 【不存在则创建】
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("[MinIO] 创建 bucket: {}", bucketName);
            }

            // 【设置公开读策略】
            // 这是解决图片 403 问题的关键：允许匿名用户通过 URL 直接访问图片
            String policy = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\","
                    + "\"Principal\":\"*\",\"Action\":[\"s3:GetObject\"],"
                    + "\"Resource\":[\"arn:aws:s3:::" + bucketName + "/*\"]}]}";
            client.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(bucketName).config(policy).build());
            log.info("[MinIO] bucket 公开读策略已设置: {}", bucketName);

        } catch (Exception e) {
            // 单个 bucket 初始化失败不影响其他 bucket
            log.warn("[MinIO] 初始化 bucket 失败: {}, 原因: {}", bucketName, e.getMessage());
        }
    }
}









