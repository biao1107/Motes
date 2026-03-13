package com.gym.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * 文件存储服务
 */
public interface StorageService {
    /**
     * 上传文件（动作照片/视频）
     */
    String uploadActionFile(Long userId, MultipartFile file);

    /**
     * 获取文件访问URL
     */
    String getFileUrl(String objectName);

    /**
     * 确保存储桶存在
     */
    void ensureBucketExists(String bucketName) throws Exception;
}






