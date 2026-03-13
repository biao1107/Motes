package com.gym.dto;

import lombok.Data;

/**
 * 匹配结果数据传输对象（DTO）
 * 
 * 【什么是DTO？】
 * DTO（Data Transfer Object）是数据传输对象
 * 用于在不同层之间传递数据，这里用于Controller返回给前端
 * 
 * 【为什么需要DTO？】
 * 1. 只返回需要的数据，不暴露全部User信息（如密码）
 * 2. 可以组合多个实体类的数据
 * 3. 便于前端统一处理数据结构
 */
@Data
public class MatchResult {
    
    /**
     * 用户ID
     */
    private Long userId;
    
    /**
     * 用户昵称
     */
    private String nickname;
    
    /**
     * 用户头像URL
     */
    private String avatar;
    
    /**
     * 匹配分数
     * 范围：0-100，分数越高表示匹配度越高
     */
    private Double score;
    
    /**
     * 匹配模式
     * 默认值："1v1"（一对一匹配）
     */
    private String mode = "1v1";
    
    /**
     * 健身目标
     */
    private String goal;
    
    /**
     * 训练时间偏好
     */
    private String preferTime;
    
    /**
     * 训练场景
     */
    private String scene;
    
    /**
     * 无参构造方法
     */
    public MatchResult() {}
    
    /**
     * 带参数的构造方法
     */
    public MatchResult(Long userId, String nickname, String avatar, Double score) {
        this.userId = userId;
        this.nickname = nickname;
        this.avatar = avatar;
        this.score = score;
    }
}
