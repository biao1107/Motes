# 数据库初始化指南

## 1. 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS gym CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. 执行完整数据库初始化脚本

```bash
mysql -u root -p gym < docs/gym.sql
```

> 注意：gym.sql文件已包含所有必要的表结构创建、字段添加、数据初始化和验证查询

## 3. 验证数据库配置

确保 application.yml 中的数据库配置正确：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/gym?useSSL=false&useUnicode=true&characterEncoding=utf-8&serverTimezone=UTC
    username: root
    password: 123456
```

## 4. 默认用户信息

初始化后的默认用户：
- 手机号：13800000001-13800000006
- 密码：password

## 5. 数据库结构说明

执行gym.sql后将创建以下核心表：
- t_user：用户表
- t_partner_group：搭子组表
- t_group_member：组成员表
- t_train_plan：训练计划表
- t_train_record：训练记录表
- t_challenge：挑战表（包含type字段）
- t_challenge_participant：挑战参与表
- t_chat_message：聊天消息表
- t_course：课程表

## 6. 挑战类型业务逻辑

- **组内挑战（type=0）**：需要完成当日协同训练后才能手动打卡
- **公开挑战（type=1）**：可直接打卡，无需完成协同训练