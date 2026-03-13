package com.gym.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * ============================================
 * 课程实体类 - 健身课程信息
 * ============================================
 * 
 * 【什么是实体类？】
 * 实体类对应数据库中的一张表，每个字段对应表中的一列。
 * 这个类对应数据库表 t_course，存储所有健身课程的信息。
 * 
 * 【课程功能在App中的作用】
 * 想象一个健身App，用户可以在"课程"页面浏览各种健身教程，比如：
 * - "30天腹肌训练"课程
 * - "瑜伽入门"课程
 * - "HIIT燃脂"课程
 * 
 * 每个课程包含：名称、描述、类型、难度、时长、封面图等信息。
 * 
 * 【数据库表结构】
 * 表名：t_course
 * - id: 主键，自增，唯一标识一个课程
 * - course_name: 课程名称，如"30天腹肌训练"
 * - description: 课程描述，详细介绍课程内容
 * - course_type: 课程类型（有氧/力量/柔韧/综合）
 * - difficulty: 难度等级（入门/初级/中级/高级）
 * - duration: 预估时长（分钟），如30分钟
 * - calories: 预计消耗卡路里，如200卡
 * - cover_image: 封面图片URL，用于列表展示
 * - video_url: 视频教程URL（如果有视频）
 * - content: 课程内容，JSON格式存储动作序列
 * - creator_id: 创建者ID（管理员ID）
 * - status: 状态（0=下架，1=上架）
 * - sort_weight: 排序权重，数字越大越靠前
 * - create_time: 创建时间
 * - update_time: 更新时间
 * ============================================
 */
@Data
@TableName("t_course")
public class Course {
    
    /**
     * 课程ID，主键，自增
     * 每个课程的唯一标识，比如 1、2、3...
     */
    @TableId(type = IdType.AUTO)
    private Long id;
    
    /**
     * 课程名称
     * 显示在课程列表和详情页的标题
     * 例如："30天腹肌训练"、"瑜伽入门基础"
     */
    private String courseName;
    
    /**
     * 课程描述
     * 详细介绍课程内容、适合人群、训练效果等
     * 例如："本课程适合初学者，通过30天的系统训练..."
     */
    private String description;
    
    /**
     * 课程类型
     * 用于分类筛选，常见值：
     * - YOGA：瑜伽
     * - CARDIO：有氧运动
     * - STRENGTH：力量训练
     * - FLEXIBILITY：柔韧性训练
     * - COMPREHENSIVE：综合训练
     */
    private String courseType;
    
    /**
     * 难度等级
     * 帮助用户选择适合自己的课程：
     * - BEGINNER：入门（适合新手）
     * - ELEMENTARY：初级（有一点基础）
     * - INTERMEDIATE：中级（有训练经验）
     * - ADVANCED：高级（专业水平）
     */
    private String difficulty;
    
    /**
     * 预估时长（分钟）
     * 告诉用户完成这个课程需要多长时间
     * 例如：15分钟、30分钟、45分钟
     */
    private Integer duration;
    
    /**
     * 预计消耗卡路里
     * 帮助用户了解训练效果
     * 例如：100卡、200卡、500卡
     */
    private Integer calories;
    
    /**
     * 课程封面图片URL
     * 显示在课程列表的缩略图
     * 存储的是MinIO上的图片地址
     */
    private String coverImage;
    
    /**
     * 视频教程URL
     * 如果有视频教学，这里存视频链接
     * 可以是MinIO存储的视频文件URL
     */
    private String videoUrl;
    
    /**
     * 课程内容
     * 用JSON格式存储具体的动作序列
     * 例如：[
     *   {"action": "俯卧撑", "count": 10, "unit": "次"},
     *   {"action": "休息", "duration": 30, "unit": "秒"}
     * ]
     */
    private String content;
    
    /**
     * 创建者ID
     * 哪个管理员创建了这个课程
     * 关联到 t_user 表的 id 字段
     */
    private Long creatorId;
    
    /**
     * 课程状态
     * 0 = 下架（用户看不到）
     * 1 = 上架（正常展示）
     * 管理员可以控制课程是否显示
     */
    private Integer status;
    
    /**
     * 排序权重
     * 数字越大，在列表中显示越靠前
     * 用于推荐重要课程到前面
     */
    private Integer sortWeight;
    
    /**
     * 创建时间
     * 记录课程是什么时候创建的
     */
    private LocalDateTime createTime;
    
    /**
     * 更新时间
     * 记录课程最后一次修改的时间
     */
    private LocalDateTime updateTime;
}