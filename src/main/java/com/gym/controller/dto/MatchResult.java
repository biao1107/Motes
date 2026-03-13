/**
 * ============================================
 * 匹配结果数据传输对象（DTO）
 * ============================================
 * 作用：
 * 封装匹配结果的数据，用于从后端传输到前端
 * 
 * 什么是DTO？
 * DTO（Data Transfer Object）是数据传输对象
 * 用于在不同层之间传递数据，这里用于Controller返回给前端
 * 
 * 为什么需要DTO？
 * 1. 只返回需要的数据，不暴露全部User信息（如密码）
 * 2. 可以组合多个实体类的数据
 * 3. 便于前端统一处理数据结构
 * 
 * 与User实体类的区别：
 * - User：对应数据库表，包含所有字段（包括敏感信息）
 * - MatchResult：仅包含展示需要的数据，用于API响应
 * ============================================
 */
package com.gym.controller.dto;

// Lombok的@Data注解，自动生成getter、setter、toString等方法
import lombok.Data;

/**
 * @Data 说明：
 * Lombok注解，会自动生成：
 * - 所有字段的getter方法
 * - 所有非final字段的setter方法
 * - toString() 方法
 * - equals() 和 hashCode() 方法
 */
@Data
public class MatchResult {
    
    /**
     * 用户ID
     * 用于唯一标识匹配到的用户
     * 前端可用此ID进行后续操作（如查看详情、发起邀请）
     */
    private Long userId;
    
    /**
     * 用户昵称
     * 用于展示在匹配结果列表中
     */
    private String nickname;
    
    /**
     * 用户头像URL
     * 用于在匹配结果中显示头像
     */
    private String avatar;
    
    /**
     * 匹配分数
     * 范围：0-100，分数越高表示匹配度越高
     * 前端可用分数进行排序或显示匹配度百分比
     */
    private Double score;
    
    /**
     * 匹配模式
     * 默认值："1v1"（一对一匹配）
     * 预留字段，未来可扩展为群匹配等模式
     */
    private String mode = "1v1";
    
    /**
     * 健身目标
     * 用户的健身目标，如：减脂、增肌、塑形
     * 用于前端展示，让用户了解对方的健身方向
     */
    private String goal;
    
    /**
     * 训练时间偏好
     * 用户的训练时间，如：早上、晚上、周末
     * 用于前端展示，判断时间是否合适
     */
    private String preferTime;
    
    /**
     * 训练场景
     * 用户的训练场景，如：健身房、户外、家里
     * 用于前端展示，判断场景是否合适
     */
    private String scene;
    
    /**
     * 无参构造方法
     * 为什么需要？
     * Spring在反序列化JSON时需要无参构造方法创建对象
     * 例如：前端传JSON，后端自动转换为MatchResult对象
     */
    public MatchResult() {}
    
    /**
     * 带参数的构造方法
     * 
     * @param userId   用户ID
     * @param nickname 昵称
     * @param avatar   头像URL
     * @param score    匹配分数
     * 
     * 为什么需要？
     * 方便在代码中快速创建对象，不需要逐个调用setter
     * 
     * 使用示例：
     * MatchResult result = new MatchResult(1L, "张三", "http://xxx.jpg", 85.5);
     */
    public MatchResult(Long userId, String nickname, String avatar, Double score) {
        this.userId = userId;
        this.nickname = nickname;
        this.avatar = avatar;
        this.score = score;
    }
}