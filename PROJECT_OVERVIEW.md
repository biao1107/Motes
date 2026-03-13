# Gym 健身搭子项目 - 项目概览

## 📋 项目简介

**Gym 健身搭子**是一个基于微信小程序的健身社交平台，旨在帮助健身爱好者找到志同道合的训练伙伴，通过组队训练、挑战打卡等功能提升健身效果和坚持度。

### 核心功能
- 🤝 **智能匹配**: 根据健身目标、时间、地点等多维度匹配搭子
- 👥 **组队训练**: 创建健身小组，邀请好友一起训练
- 🎯 **挑战系统**: 创建和参与健身挑战，每日打卡记录
- 📊 **数据统计**: 个人训练数据、组内统计、挑战进度追踪
- 💬 **实时聊天**: 组内实时聊天，分享健身心得
- 📚 **课程学习**: 浏览推荐课程，学习健身知识

---

## 🏗️ 技术架构

### 前端技术栈
- **框架**: uni-app (Vue 2/3)
- **小程序**: 微信小程序
- **样式**: SCSS
- **状态管理**: 本地存储 (uni.storage)
- **网络请求**: uni.request (已封装)
- **实时通信**: WebSocket (仅H5)

### 后端技术栈
- **框架**: Spring Boot 3.2.5
- **数据库**: MySQL 8.0+
- **缓存**: Redis 6.0+ (图片URL缓存)
- **ORM**: MyBatis Plus
- **消息队列**: RabbitMQ 3.8+
- **对象存储**: MinIO 8.5.7
- **认证**: JWT (JSON Web Token)
- **实时通信**: WebSocket + STOMP

---

## 📁 项目目录结构

```
Gym/
├── src/main/java/com/gym/           # 后端代码
│   ├── common/                      # 通用类（异常、响应）
│   ├── config/                      # 配置类（Security、WebSocket、Redis等）
│   ├── controller/                  # 控制器（处理HTTP请求）
│   ├── entity/                      # 实体类（数据库表映射）
│   ├── mapper/                      # MyBatis Mapper接口
│   ├── service/                     # 服务层（业务逻辑）
│   ├── util/                        # 工具类
│   ├── consumer/                    # 消息队列消费者
│   ├── job/                         # 定时任务
│   └── GymApplication.java          # Spring Boot 启动类
│
├── Gym_fronted/                     # 前端代码（微信小程序）
│   ├── common/                      # 通用模块
│   │   ├── api.js                   # API接口封装
│   │   ├── http.js                  # HTTP请求封装
│   │   ├── auth.js                  # 认证模块
│   │   ├── ws.js                    # WebSocket封装
│   │   └── config.js                # 全局配置
│   ├── pages/                       # 页面文件
│   │   ├── auth/                    # 登录注册页
│   │   ├── index/                   # 首页
│   │   ├── match/                   # 匹配页
│   │   ├── group/                   # 组管理页
│   │   ├── challenge/               # 挑战页
│   │   ├── training/                # 训练页
│   │   ├── course/                  # 课程页
│   │   ├── stat/                    # 统计页
│   │   └── user/                    # 用户中心
│   ├── components/                  # 组件
│   ├── static/                      # 静态资源
│   ├── App.vue                      # 应用根组件
│   ├── main.js                      # 应用入口
│   └── pages.json                   # 页面配置
│
├── docs/                            # 文档
│   └── gym.sql                      # 数据库初始化脚本
│
└── README.md                        # 项目说明
```

---

## 🗄️ 数据库设计

### 核心表结构

#### 1. t_user (用户表)
存储用户基本信息、健身档案

#### 2. t_fitness_group (健身组表)
存储健身小组信息

#### 3. t_group_member (组成员表)
存储组成员关系

#### 4. t_challenge (挑战表)
存储挑战信息（公开挑战 + 组内挑战）

#### 5. t_training_record (训练记录表)
存储用户训练记录

#### 6. t_chat_message (聊天消息表)
存储组内聊天消息

#### 7. t_course (课程表)
存储健身课程信息

#### 8. t_match_score (匹配分数表)
存储用户间的匹配分数

---

## 🔑 核心功能模块详解

### 1. 认证模块 (Auth)
- **功能**: 用户注册、登录、JWT Token管理
- **接口**: 
  - `POST /auth/register` - 注册
  - `POST /auth/login` - 密码登录
  - `POST /auth/login/code` - 验证码登录
- **前端**: `pages/auth/login.vue`, `pages/auth/register.vue`
- **后端**: `AuthController.java`, `SecurityConfig.java`

### 2. 用户模块 (User)
- **功能**: 用户信息管理、个人档案
- **接口**:
  - `GET /user/profile` - 获取个人档案
  - `PUT /user/profile` - 更新个人档案
- **前端**: `pages/user/profile.vue`
- **后端**: `UserController.java`, `UserService.java`

### 3. 匹配模块 (Match)
- **功能**: 智能匹配健身搭子
- **算法**: 基于健身目标、时间、地点、经验等多维度计算匹配分数
- **接口**: `GET /match/top?limit=3` - 获取Top匹配用户
- **前端**: `pages/match/index.vue`
- **后端**: `MatchController.java`, `MatchService.java`

### 4. 组管理模块 (Group)
- **功能**: 创建组、邀请成员、组详情、组内聊天
- **核心流程**:
  1. 用户创建组
  2. 通过用户名邀请其他用户
  3. 被邀请用户接受/拒绝邀请
  4. 组内成员查看组详情、聊天
- **接口**:
  - `POST /group/create` - 创建组
  - `POST /group/invite-by-username` - 邀请成员
  - `GET /group/my-groups` - 我的组列表
  - `GET /group/{id}/detail` - 组详情
- **前端**: `pages/group/index.vue`, `pages/group/detail.vue`, `pages/group/chat.vue`
- **后端**: `GroupController.java`, `GroupService.java`

### 5. 挑战模块 (Challenge)
- **功能**: 创建挑战、加入挑战、每日打卡、挑战统计
- **挑战类型**:
  - **公开挑战**: groupId = 0，所有人可见可加入
  - **组内挑战**: groupId > 0，仅组内成员可见可加入
- **打卡逻辑**:
  - 训练关联挑战：通过训练记录自动打卡
  - 普通挑战：手动打卡
- **接口**:
  - `POST /challenge/create` - 创建挑战
  - `POST /challenge/join` - 加入挑战
  - `POST /challenge/punch` - 打卡
  - `GET /challenge/list` - 挑战列表
- **前端**: `pages/challenge/index.vue`, `pages/challenge/detail.vue`
- **后端**: `ChallengeController.java`, `ChallengeService.java`

### 6. 训练模块 (Training)
- **功能**: 开始训练、上报训练数据、放弃训练
- **训练流程**:
  1. 用户选择挑战（可选）
  2. 开始训练（记录开始时间）
  3. 完成训练并上报数据（时长、卡路里等）
  4. 如果关联挑战，自动打卡
- **接口**:
  - `POST /training/start` - 开始训练
  - `POST /training/report` - 上报训练数据
  - `GET /training/today` - 今日训练记录
  - `GET /training/todo/count` - 待办数量
- **前端**: `pages/training/index.vue`, `pages/training/today.vue`
- **后端**: `TrainingController.java`, `TrainingService.java`

### 7. 统计模块 (Stat)
- **功能**: 个人统计、组统计、挑战统计、首页统计
- **接口**:
  - `GET /stat/personal` - 个人统计
  - `GET /stat/group` - 组统计
  - `GET /stat/challenge` - 挑战统计
  - `GET /stat/home` - 首页统计
- **前端**: `pages/stat/index.vue`, `pages/index/index.vue`
- **后端**: `StatController.java`, `StatService.java`

### 8. 聊天模块 (Chat)
- **功能**: 组内实时聊天、聊天历史、未读消息
- **技术**:
  - H5: WebSocket + STOMP
  - 小程序: 轮询 (暂不支持WebSocket STOMP)
- **接口**:
  - `GET /chat/group/{groupId}/history` - 聊天历史
  - `GET /chat/unread/count` - 未读消息数
  - `POST /chat/group/{groupId}/read` - 标记已读
- **前端**: `pages/group/chat.vue`, `common/ws.js`
- **后端**: `ChatController.java`, `WebSocketService.java`

### 9. 课程模块 (Course)
- **功能**: 浏览课程、推荐课程、课程详情
- **课程类型**: 力量训练、有氧训练、柔韧性训练、HIIT等
- **难度等级**: 入门、初级、中级、高级
- **接口**:
  - `GET /course/list` - 课程列表
  - `GET /course/{id}` - 课程详情
  - `GET /course/recommend` - 推荐课程
- **前端**: `pages/course/index.vue`, `pages/course/detail.vue`
- **后端**: `CourseController.java`, `CourseService.java`

---

## 🔐 认证流程

### JWT Token 认证机制

1. **用户登录**:
   - 前端: 输入用户名密码，调用 `apiLoginByPassword()`
   - 后端: 验证成功后生成 JWT Token
   - 前端: 保存 Token 到本地存储

2. **请求携带Token**:
   - 前端 `http.js` 自动在请求头中添加 `Authorization: Bearer <token>`
   - 后端 `JwtAuthFilter` 拦截请求，验证 Token 有效性

3. **Token 过期处理**:
   - 后端返回 401 状态码
   - 前端自动清除 Token 并跳转到登录页

### Token 结构
```javascript
// JWT Token 由三部分组成: header.payload.signature
{
  sub: "123",        // 用户ID
  iat: 1234567890,   // 签发时间
  exp: 1234567890    // 过期时间
}
```

---

## 📡 WebSocket 实时通信

### H5 环境
- 使用 WebSocket + STOMP 协议
- 连接地址: `ws://localhost:8080/ws`
- 支持订阅组内聊天、系统通知

### 小程序环境
- 小程序不支持 STOMP 库
- 使用轮询方式获取最新消息
- 未来可能支持原生 WebSocket

---

## 🎨 前端开发规范

### 页面结构
```vue
<template>
  <!-- 页面DOM结构 -->
</template>

<script>
// 1. 导入依赖
// 2. 定义组件
export default {
  data() {
    return {
      // 数据定义
    }
  },
  onLoad() {
    // 页面加载时执行
  },
  methods: {
    // 方法定义
  }
}
</script>

<style scoped>
/* 页面样式 */
</style>
```

### API 调用规范
```javascript
// 1. 导入 API 方法
import { apiGetUserInfo } from '@/common/api.js';

// 2. 调用 API
async loadData() {
  try {
    const data = await apiGetUserInfo();
    this.userInfo = data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
}
```

### 样式命名规范
- 使用语义化的 class 名称
- 避免在 class 名称中使用中文（小程序不支持）
- 使用 `kebab-case` 命名方式

---

## 🚀 快速开始

### 环境要求
- **前端**: 
  - HBuilderX (推荐)
  - 微信开发者工具
- **后端**:
  - JDK 17+
  - MySQL 8.0+
  - Redis 6.0+
  - RabbitMQ 3.8+
  - MinIO (可选)

### 启动步骤

#### 1. 后端启动
```bash
# 1. 导入数据库
mysql -u root -p < docs/gym.sql

# 2. 修改配置
# 编辑 src/main/resources/application.yml
# 修改数据库、Redis、RabbitMQ 连接信息

# 3. 启动后端
mvn spring-boot:run
# 或者
mvn clean package
java -jar target/gym-0.0.1-SNAPSHOT.jar
```

#### 2. 前端启动
```bash
# 1. 修改配置
# 编辑 Gym_fronted/common/config.js
# 修改 BASE_URL 为后端地址

# 2. 在 HBuilderX 中打开项目
# 3. 运行 -> 运行到小程序模拟器 -> 微信开发者工具
```

---

## 🔍 常见问题

### Q1: 小程序显示 "URLSearchParams is not defined"
**A**: 已修复。小程序不支持 `URLSearchParams`，我们手动实现了 URL 参数拼接。

### Q2: 小程序显示 CSS class 中文字符错误
**A**: 已修复。微信小程序不支持 class 名称中使用中文，已改为英文映射。

### Q3: 小程序 WebSocket STOMP 错误
**A**: 正常。小程序环境不支持 STOMP，已添加环境检测，仅在 H5 环境使用。

### Q4: Redis 缓存的作用
**A**: 用于缓存课程和挑战的图片 URL（MinIO 预签名URL），避免频繁查询数据库，缓存有效期 6 小时。

### Q5: 挑战类型如何区分
**A**: 通过 `groupId` 字段区分：
- `groupId = 0`: 公开挑战
- `groupId > 0`: 组内挑战

---

## 📚 学习资源

### uni-app 文档
- [uni-app 官方文档](https://uniapp.dcloud.net.cn/)
- [uni-app API 文档](https://uniapp.dcloud.net.cn/api/)

### Spring Boot 文档
- [Spring Boot 官方文档](https://spring.io/projects/spring-boot)
- [MyBatis Plus 文档](https://baomidou.com/)

### 微信小程序文档
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

---

## 👥 贡献指南

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

本项目仅供学习交流使用。

---

**最后更新**: 2026年2月27日
