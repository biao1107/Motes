-- ==========================================
-- 健身搭子系统数据库初始化脚本
-- 包含表结构定义、索引创建、字段更新和初始数据
-- ==========================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS t_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  nickname VARCHAR(50),
  fitness_goal VARCHAR(20),
  train_time VARCHAR(50),
  train_scene VARCHAR(20),
  supervise_demand VARCHAR(20),
  fitness_level VARCHAR(20),
  avatar VARCHAR(500) COMMENT '用户头像URL',
  role VARCHAR(20) DEFAULT 'USER',
  create_time DATETIME,
  update_time DATETIME,
  INDEX idx_phone (phone)
);

-- 2. 搭子组表
CREATE TABLE IF NOT EXISTS t_partner_group (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_name VARCHAR(50),
  train_freq INT,
  fixed_time VARCHAR(50),
  status TINYINT DEFAULT 1,
  create_time DATETIME
);

-- 3. 组成员表
CREATE TABLE IF NOT EXISTS t_group_member (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) DEFAULT 'MEMBER',
  last_read_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最后阅读时间',
  create_time DATETIME,
  INDEX idx_group (group_id),
  INDEX idx_user (user_id)
);

-- 4. 训练计划表（已废弃）
-- 说明：该表原用于存储组内训练计划，但相关功能未实现
-- 实体类 TrainPlan.java 和 Mapper 已删除
-- 如需清理数据库，可执行：DROP TABLE IF EXISTS t_train_plan;
-- CREATE TABLE IF NOT EXISTS t_train_plan (
--   id BIGINT PRIMARY KEY AUTO_INCREMENT,
--   group_id BIGINT NOT NULL,
--   train_date DATE,
--   train_content VARCHAR(100),
--   target_score INT,
--   create_time DATETIME,
--   INDEX idx_group_date (group_id, train_date)
-- );

-- 5. 训练记录表
CREATE TABLE IF NOT EXISTS t_train_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  group_id BIGINT,
  train_date DATE,
  complete_count INT,
  score INT,
  status TINYINT DEFAULT 0 COMMENT '训练状态：0-未完成 1-完成 2-放弃',
  create_time DATETIME,
  update_time DATETIME,
  UNIQUE KEY uk_user_date (user_id, train_date),
  INDEX idx_group_date (group_id, train_date)
);

-- 6. 挑战表
-- 业务逻辑说明：
-- - 组内挑战（group_id > 0）：需要完成当日协同训练后才能手动打卡
-- - 公开挑战（group_id = 0 或 NULL）：可直接打卡，无需完成协同训练
CREATE TABLE IF NOT EXISTS t_challenge (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  challenge_name VARCHAR(50),
  start_date DATE,
  end_date DATE,
  train_require VARCHAR(100),
  max_members INT,
  status TINYINT DEFAULT 0,
  cover_image VARCHAR(500),
  group_id BIGINT DEFAULT 0 COMMENT '关联的搭子组ID，0表示不属于任何组（公开挑战）',
  training_plan_id BIGINT DEFAULT NULL COMMENT '关联的训练计划ID，NULL表示非训练关联挑战',
  create_time DATETIME,
  INDEX idx_challenge_group (group_id)
);

-- 7. 挑战参与表
CREATE TABLE IF NOT EXISTS t_challenge_participant (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  challenge_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  group_id BIGINT DEFAULT 0,
  punch_days INT DEFAULT 0,
  action_file VARCHAR(500),
  status TINYINT DEFAULT 0,
  create_time DATETIME,
  INDEX idx_challenge_user (challenge_id, user_id)
);

-- 8. 聊天消息表
CREATE TABLE IF NOT EXISTS t_chat_message (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  nickname VARCHAR(50),
  content TEXT,
  message_type TINYINT DEFAULT 0 COMMENT '消息类型：0-文本 1-图片 2-系统消息',
  image_url VARCHAR(500) COMMENT '图片消息URL',
  parent_msg_id BIGINT DEFAULT 0 COMMENT '引用消息ID',
  create_time DATETIME,
  INDEX idx_group_time (group_id, create_time)
);

-- 9. 课程表
CREATE TABLE IF NOT EXISTS t_course (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '课程ID',
    course_name VARCHAR(100) NOT NULL COMMENT '课程名称',
    description TEXT COMMENT '课程描述',
    course_type VARCHAR(20) NOT NULL COMMENT '课程类型（有氧、力量、柔韧、综合）',
    difficulty VARCHAR(10) NOT NULL COMMENT '难度等级（入门、初级、中级、高级）',
    duration INT NOT NULL COMMENT '预估时长（分钟）',
    calories INT COMMENT '消耗卡路里',
    cover_image VARCHAR(255) COMMENT '课程封面图片URL',
    video_url VARCHAR(255) COMMENT '视频教程URL',
    content TEXT COMMENT '课程内容（JSON格式存储动作序列）',
    creator_id BIGINT COMMENT '创建者ID',
    status TINYINT DEFAULT 1 COMMENT '状态（0-下架，1-上架）',
    sort_weight INT DEFAULT 0 COMMENT '排序权重',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_course_type (course_type),
    KEY idx_difficulty (difficulty),
    KEY idx_status (status),
    KEY idx_sort_weight (sort_weight)
);

-- ==========================================
-- 清空现有数据（用于重新初始化）
-- ==========================================
TRUNCATE TABLE t_chat_message;
TRUNCATE TABLE t_challenge_participant;
TRUNCATE TABLE t_challenge;
TRUNCATE TABLE t_train_record;
-- TRUNCATE TABLE t_train_plan;  -- 已废弃
TRUNCATE TABLE t_group_member;
TRUNCATE TABLE t_partner_group;
TRUNCATE TABLE t_user;
TRUNCATE TABLE t_course;

-- ==========================================
-- 插入初始数据
-- ==========================================

-- 统一演示密码：password
-- BCrypt("password") 示例值（Spring Security 常用示例）
SET @PWD := '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5gO0a0zY4xXHzkwmo7aX6ixkmKuu';

-- 用户（匹配维度尽量覆盖）
INSERT INTO t_user
(id, phone, password, nickname, fitness_goal, train_time, train_scene, supervise_demand, fitness_level, role, create_time, update_time)
VALUES
    (1, '13800000001', @PWD, '小A', '减脂', '晚间', '居家',   '严格', '新手', 'USER', NOW(), NOW()),
    (2, '13800000002', @PWD, '小B', '减脂', '晚间', '居家',   '中等', '新手', 'USER', NOW(), NOW()),
    (3, '13800000003', @PWD, '小C', '增肌', '晚间', '健身房', '严格', '入门', 'USER', NOW(), NOW()),
    (4, '13800000004', @PWD, '小D', '塑形', '早间', '健身房', '中等', '入门', 'USER', NOW(), NOW()),
    (5, '13800000005', @PWD, '小E', '减脂', '午间', '户外',   '宽松', '进阶', 'USER', NOW(), NOW()),
    (6, '13800000006', @PWD, '管理员', '休闲', '晚间', '居家', '宽松', '入门', 'ADMIN', NOW(), NOW());

-- 搭子组（1个2人组 + 1个3人组）
INSERT INTO t_partner_group (id, group_name, train_freq, fixed_time, status, create_time)
VALUES
    (1, '健身搭子第1组', 3, '每晚7点半', 1, NOW()),
    (2, '健身搭子第2组', 4, '每晚8点',   1, NOW());

-- 组成员
INSERT INTO t_group_member (id, group_id, user_id, role, last_read_time, create_time)
VALUES
    (1, 1, 1, 'ADMIN',  NOW(), NOW()),
    (2, 1, 2, 'MEMBER', NOW(), NOW()),
    (3, 2, 3, 'ADMIN',  NOW(), NOW()),
    (4, 2, 4, 'MEMBER', NOW(), NOW()),
    (5, 2, 5, 'MEMBER', NOW(), NOW());

-- 训练计划（已废弃，相关功能未实现）
-- INSERT INTO t_train_plan (id, group_id, train_date, train_content, target_score, create_time)
-- VALUES
--     (1, 1, CURDATE(),       '15分钟核心训练', 70, NOW()),
--     (2, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '20分钟HIIT', 70, NOW()),
--     (3, 2, CURDATE(),       '20分钟HIIT', 70, NOW());

-- 训练记录（用于挑战打卡）
INSERT INTO t_train_record (id, user_id, group_id, train_date, complete_count, score, status, create_time, update_time)
VALUES
    (1, 1, 1, CURDATE(), 20, 75, 1, NOW(), NOW()),
    (2, 2, 1, CURDATE(), 18, 72, 1, NOW(), NOW()),
    (3, 3, 2, CURDATE(), 25, 80, 1, NOW(), NOW()),
    (4, 4, 2, CURDATE(), 10, 60, 0, NOW(), NOW()),
    (5, 5, 2, CURDATE(), 20, 70, 1, NOW(), NOW());

-- 挑战（7天）
INSERT INTO t_challenge (id, challenge_name, start_date, end_date, train_require, max_members, status, group_id, training_plan_id, create_time)
VALUES
    (1, '7天核心训练打卡', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY), '完成1次训练且动作评分>=70', 10, 1, 0, NULL, NOW());

-- 挑战参与
INSERT INTO t_challenge_participant (id, challenge_id, user_id, group_id, punch_days, status, create_time)
VALUES
    (1, 1, 1, 1, 1, 0, NOW()),
    (2, 1, 2, 1, 1, 0, NOW()),
    (3, 1, 3, 2, 1, 0, NOW()),
    (4, 1, 5, 2, 1, 0, NOW());

-- 聊天消息
INSERT INTO t_chat_message (id, group_id, user_id, nickname, content, message_type, parent_msg_id, create_time)
VALUES
    (1, 1, 1, '小A', '大家好，我是小A，很高兴加入这个健身小组！', 0, 0, NOW()),
    (2, 1, 2, '小B', '你好小A，我是小B，我们今天一起做核心训练吧！', 0, 0, NOW()),
    (3, 1, 1, '小A', '好的，我已经完成了今天的训练，打卡成功！', 0, 0, DATE_SUB(NOW(), INTERVAL 1 MINUTE)),
    (4, 2, 3, '小C', '各位，明天的训练计划是什么？', 0, 0, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
    (5, 2, 4, '小D', '明天晚上8点，一起做HIIT训练', 0, 0, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
    (6, 2, 5, '小E', '我已经准备好了，期待明天的训练！', 0, 0, DATE_SUB(NOW(), INTERVAL 20 MINUTE));

-- 课程数据
INSERT INTO t_course (id, course_name, description, course_type, difficulty, duration, calories, cover_image, video_url, content, creator_id, status, sort_weight, create_time, update_time) VALUES
(1, '新手入门有氧操', '适合零基础的有氧健身课程，轻松上手，循序渐进', '有氧', '入门', 30, 200, 'http://localhost:9000/courses/course-images/1/course_1_a1b2c3d4.jpg', 'https://example.com/video1.mp4', '[{"action":"热身运动","time":5},{"action":"有氧操","time":20},{"action":"拉伸放松","time":5}]', 6, 1, 100, NOW(), NOW()),
(2, '腹肌强化训练', '专注核心肌群的训练，打造马甲线', '力量', '初级', 25, 150, 'http://localhost:9000/courses/course-images/2/course_2_e5f6g7h8.jpg', 'https://example.com/video2.mp4', '[{"action":"卷腹","sets":3,"count":15},{"action":"平板支撑","sets":3,"time":30}]', 6, 1, 90, NOW(), NOW()),
(3, '全身拉伸放松', '舒缓肌肉紧张，提高身体柔韧性', '柔韧', '入门', 20, 50, 'http://localhost:9000/courses/course-images/3/course_3_i9j0k1l2.jpg', 'https://example.com/video3.mp4', '[{"action":"颈部拉伸","time":2},{"action":"肩部拉伸","time":3},{"action":"背部拉伸","time":3},{"action":"腿部拉伸","time":5}]', 6, 1, 80, NOW(), NOW()),
(4, '燃脂HIIT训练', '高强度间歇训练，快速燃脂', '有氧', '中级', 35, 400, 'http://localhost:9000/courses/course-images/4/course_4_m3n4o5p6.jpg', 'https://example.com/video4.mp4', '[{"action":"开合跳","time":30,"rest":10},{"action":"波比跳","time":30,"rest":10},{"action":"高抬腿","time":30,"rest":10}]', 6, 1, 110, NOW(), NOW()),
(5, '办公室瑜伽', '专为久坐上班族设计，在办公室也能轻松练习', '柔韧', '入门', 15, 80, 'http://localhost:9000/courses/course-images/5/course_5_q7r8s9t0.jpg', 'https://example.com/video5.mp4', '[{"action":"颈部转动","time":2},{"action":"肩部环绕","time":2},{"action":"腰部扭转","time":3},{"action":"腿部伸展","time":3}]', 6, 1, 70, NOW(), NOW()),
(6, '力量循环训练', '全身肌肉群综合训练，提升整体力量', '力量', '中级', 45, 350, 'http://localhost:9000/courses/course-images/6/course_6_u1v2w3x4.jpg', 'https://example.com/video6.mp4', '[{"action":"深蹲","sets":4,"count":12},{"action":"俯卧撑","sets":4,"count":10},{"action":"哑铃推举","sets":4,"count":12}]', 6, 1, 95, NOW(), NOW());

-- ==========================================
-- 验证查询（可选，用于确认数据初始化成功）
-- ==========================================

-- 验证表数据
SELECT '数据库初始化完成，各表记录数:' as info;
SELECT 't_user' as table_name, COUNT(*) as record_count FROM t_user
UNION ALL
SELECT 't_partner_group', COUNT(*) FROM t_partner_group
UNION ALL
SELECT 't_group_member', COUNT(*) FROM t_group_member
-- UNION ALL
-- SELECT 't_train_plan', COUNT(*) FROM t_train_plan  -- 已废弃
UNION ALL
SELECT 't_train_record', COUNT(*) FROM t_train_record
UNION ALL
SELECT 't_challenge', COUNT(*) FROM t_challenge
UNION ALL
SELECT 't_challenge_participant', COUNT(*) FROM t_challenge_participant
UNION ALL
SELECT 't_chat_message', COUNT(*) FROM t_chat_message
UNION ALL
SELECT 't_course', COUNT(*) FROM t_course;
