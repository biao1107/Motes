package com.gym.config;

import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

import jakarta.servlet.MultipartConfigElement;

/**
 * ============================================
 * 文件上传配置类
 * ============================================
 *
 * 【什么是 Multipart？】
 * Multipart 是 HTTP 协议中用于上传文件的数据格式。
 * 当表单中包含文件时，Content-Type 会变成 multipart/form-data，
 * 请求体被分割成多个部分（part），每个部分可以是文本或文件。
 *
 * 【为什么需要配置？】
 * Spring Boot 默认限制上传文件大小为 1MB，总请求大小为 10MB。
 * 对于健身打卡图片、课程视频等场景，这个限制太小，需要调大。
 *
 * 【配置说明】
 * - maxFileSize：单个文件最大大小（如一张图片不能超过 50MB）
 * - maxRequestSize：整个请求最大大小（包含所有文件和表单字段）
 *
 * 【与 application.yml 配置的关系】
 * 本配置类与 application.yml 中的以下配置等效：
 *   server:
 *     servlet:
 *       multipart:
 *         max-file-size: 50MB
 *         max-request-size: 50MB
 *
 * 两者配置一个即可，本类配置优先级更高。
 * ============================================
 */
@Configuration
public class MultipartConfig {

    /**
     * 创建文件上传配置
     *
     * 【参数说明】
     * - maxFileSize = 50MB：单个文件最大 50MB
     *   足够存储高清图片（通常 2-5MB）和短视频（通常 10-30MB）
     *
     * - maxRequestSize = 50MB：整个请求最大 50MB
     *   如果一次上传多个文件，总大小不能超过此限制
     *
     * 【超出限制会怎样？】
     * 如果上传的文件超过限制，Spring 会抛出
     * MaxUploadSizeExceededException，返回 413 Payload Too Large 错误。
     *
     * @return MultipartConfigElement 配置对象
     */
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        MultipartConfigFactory factory = new MultipartConfigFactory();

        // 【设置单个文件最大大小】
        // DataSize.ofMegabytes(50) 创建 50MB 的数据大小对象
        factory.setMaxFileSize(DataSize.ofMegabytes(50));

        // 【设置总请求最大大小】
        // 通常与 maxFileSize 保持一致，或略大（如果有其他表单字段）
        factory.setMaxRequestSize(DataSize.ofMegabytes(50));

        return factory.createMultipartConfig();
    }
}