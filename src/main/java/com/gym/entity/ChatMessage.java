package com.gym.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * ============================================
 * 聊天消息实体类
 * ============================================
 * 
 * 【什么是实体类？】
 * 实体类对应数据库中的一张表，每个字段对应表中的一列。
 * 就像 Excel 表格的一行数据，有 ID、内容、时间等属性。
 * 
 * 【数据库表】t_chat_message
 * 
 * 【字段说明】
 * - id: 消息唯一标识（主键，自增）
 * - groupId: 所属群组ID（哪条群的消息）
 * - userId: 发送者用户ID（谁发的）
 * - nickname: 发送者昵称（显示用的名字）
 * - content: 消息文本内容
 * - imageUrl: 图片URL（如果是图片消息）
 * - type: 消息类型（TEXT=文本，IMAGE=图片）
 * - createTime: 发送时间
 * 
 * 【@TableName("t_chat_message") 说明】
 * 指定这个类对应数据库的 t_chat_message 表
 * 
 * 【@TableId(type = IdType.AUTO) 说明】
 * 指定 id 字段是主键，使用数据库自增生成
 * 
 * 【@Data 说明】
 * Lombok 注解，自动生成 getter、setter、toString、equals、hashCode 方法
 * 这样我们就不用写一堆 getXxx() setXxx() 方法了
 * ============================================
 */
@Data
@TableName("t_chat_message")
public class ChatMessage {
    
    /**
     * 消息ID（主键）
     * 数据库自动生成，每条消息的唯一标识
     */
    @TableId(type = IdType.AUTO)
    private Long id;
    
    /**
     * 群组ID
     * 表示这条消息属于哪个群组
     */
    private Long groupId;
    
    /**
     * 发送者用户ID
     * 表示这条消息是谁发的
     */
    private Long userId;
    
    /**
     * 发送者昵称
     * 显示在聊天界面上的名字
     * 存储昵称而不是每次查询用户表，提高效率
     */
    private String nickname;
    
    /**
     * 消息文本内容
     * 如果是文本消息，这里是消息文字
     * 如果是图片消息，这里可能为空或图片描述
     */
    private String content;
    
    /**
     * 图片URL
     * 如果是图片消息，这里是图片的访问地址
     * 文本消息时此字段为 null
     */
    private String imageUrl;
    
    /**
     * 消息类型
     * TEXT = 文本消息
     * IMAGE = 图片消息
     */
    private String type;
    
    /**
     * 创建时间（发送时间）
     * 记录消息是什么时候发送的
     */
    private LocalDateTime createTime;
}
