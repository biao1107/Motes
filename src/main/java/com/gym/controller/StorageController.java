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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import io.minio.http.Method;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.GetPresignedObjectUrlArgs;

import java.io.InputStream;

/**
 * ============================================
 * 文件存储控制器
 * ============================================
 * 
 * 【什么是控制器？】
 * 控制器负责接收前端发来的HTTP请求，处理后返回响应。
 * 就像餐厅的服务员，接收顾客点单，通知厨房做菜，最后上菜。
 * 
 * 【这个控制器负责什么？】
 * 处理所有文件上传请求，包括：
 * - 用户头像上传
 * - 课程图片上传
 * - 挑战图片上传
 * - 打卡动作文件上传
 * 
 * 【文件存储方案：MinIO】
 * MinIO是一个开源的对象存储服务，类似云盘。
 * 上传的图片/视频都存在MinIO中，通过URL访问。
 * 
 * 【核心流程】
 * 1. 前端上传文件 → 2. 生成唯一文件名 → 3. 存入MinIO → 4. 返回访问URL
 * 
 * 【用到的技术】
 * - @RestController：标记这是RESTful API控制器
 * - @RequestMapping：设置接口路径前缀（/storage）
 * - MultipartFile：Spring提供的文件上传对象
 * - MinioClient：MinIO的Java客户端，用于操作文件
 * ============================================
 */
@RestController
@Slf4j
@RequestMapping("/storage")
@RequiredArgsConstructor
@Validated
public class StorageController {

    // ==================== 依赖注入 ====================
    
    private final StorageService storageService;   // 文件存储服务
    private final UserService userService;         // 用户服务（更新头像用）
    
    @Autowired
    private MinioClient minioClient;               // MinIO客户端
    
    // ==================== 配置参数 ====================
    
    @Value("${minio.endpoint}")
    private String endpoint;                       // MinIO服务地址，如 http://localhost:9000
    
    @Value("${minio.avatars-bucket:avatars}")
    private String avatarsBucket;                  // 头像存储桶名称
    
    @Value("${minio.challenges-bucket:challenges}")
    private String challengesBucket;               // 挑战图片存储桶名称

    /**
     * 上传动作文件（打卡照片/视频）
     * 
     * 【接口地址】POST /storage/upload/action
     * 【参数】file: 文件（图片或视频）
     * 【返回】文件的完整访问URL
     * 
     * 【使用场景】用户完成挑战打卡时上传证明照片
     */
    @PostMapping("/upload/action")
    public ApiResponse<String> uploadActionFile(@RequestParam("file") MultipartFile file, Authentication authentication) {
        // 从Authentication中获取用户ID
        Long userId = (Long) authentication.getPrincipal();
        
        // 调用Service层处理上传
        String objectName = storageService.uploadActionFile(userId, file);
        
        // 生成访问URL
        String url = storageService.getFileUrl(objectName);
        return ApiResponse.ok(url);
    }

    /**
     * 获取文件访问URL
     * 
     * 【接口地址】GET /storage/url?objectName=xxx
     * 【参数】objectName: 文件在MinIO中的路径
     * 【返回】可访问的完整URL
     */
    @GetMapping("/url")
    public ApiResponse<String> getFileUrl(@RequestParam @NotNull String objectName) {
        return ApiResponse.ok(storageService.getFileUrl(objectName));
    }
    
    /**
     * 上传用户头像
     * 
     * 【接口地址】POST /storage/upload/avatar
     * 【参数】file: 头像图片文件
     * 【返回】头像的完整访问URL
     * 
     * 【流程】
     * 1. 生成头像存储路径
     * 2. 上传到MinIO
     * 3. 更新用户表中的avatar字段
     * 
     * 【存储路径格式】
     * avatars/{用户ID}/avatar_{时间戳}.jpg
     */
    @PostMapping("/upload/avatar")
    public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file, Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            log.info("开始上传头像: userId={}, fileName={}", userId, file.getOriginalFilename());
			
            // 【第1步：生成头像存储路径】
            // 路径格式：avatars/{用户ID}/avatar_{时间戳}.jpg
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") ?
                    originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
            String objectName = String.format("avatars/%d/avatar_%s%s",
                    userId,
                    System.currentTimeMillis(),
                    extension);
			
            log.info("生成对象名: {}", objectName);
			
            // 【第2步：确保桶存在并上传】
            storageService.ensureBucketExists(avatarsBucket);
            log.info("确保桶存在: {}", avatarsBucket);
			
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(avatarsBucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
			
            log.info("文件上传到MinIO成功");
			
            // 【第3步：生成访问URL】
            String url = String.format("%s/%s/%s", endpoint, avatarsBucket, objectName);
            log.info("生成访问URL: {}", url);
			
            // 【第4步：更新用户头像字段】
            // 把URL存到数据库，下次查询用户信息时就能获取头像
            User user = userService.getProfile(userId);
            if (user != null) {
                user.setAvatar(url);
                userService.updateProfile(user);
                log.info("用户头像字段更新成功: userId={}", userId);
            } else {
                log.warn("用户不存在: userId={}", userId);
            }
			
            return ApiResponse.ok(url);
        } catch (Exception e) {
            log.error("上传头像失败", e);
            return ApiResponse.error(500, "上传头像失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取用户头像URL
     * 
     * 【接口地址】GET /storage/avatar-url/{userId}
     * 【参数】userId: 用户ID（路径参数）
     * 【返回】用户头像URL
     */
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
    
    /**
     * 上传挑战图片
     * 
     * 【接口地址】POST /storage/upload/challenge-image
     * 【参数】file: 图片文件，challengeId: 挑战ID（可选）
     * 【返回】图片的完整访问URL
     * 
     * 【存储路径格式】
     * challenge-images/{挑战ID}/challenge_{挑战ID}_{随机UUID}.jpg
     */
    @PostMapping("/upload/challenge-image")
    public ApiResponse<String> uploadChallengeImage(@RequestParam("file") MultipartFile file,
                                                   @RequestParam(required = false) Long challengeId,
                                                   Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            
            // 生成挑战图片存储路径
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") ?
                    originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
            String objectName = String.format("challenge-images/%d/challenge_%s_%s%s",
                    challengeId != null ? challengeId : userId,
                    challengeId != null ? challengeId : System.currentTimeMillis(),
                    java.util.UUID.randomUUID().toString().substring(0, 8),
                    extension);
            
            // 上传到MinIO的challenges桶
            storageService.ensureBucketExists(challengesBucket);
            
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(challengesBucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
            
            // 获取访问URL
            String url = String.format("%s/%s/%s", endpoint, challengesBucket, objectName);
            
            return ApiResponse.ok(url);
        } catch (Exception e) {
            log.error("上传挑战图片失败", e);
            return ApiResponse.error(500, "上传挑战图片失败: " + e.getMessage());
        }
    }

}