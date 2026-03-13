# Motes
Gym健身搭子智能匹配与协同训练
>>>>>>> 81d03c1cb8e458ae507da772e62d9d42f456afca
# 健身搭子智能匹配与协同训练系统

## 项目简介

聚焦"找搭子难、监督弱、易放弃"的健身痛点，打造「多维度精准匹配 + 实时协同训练 + 趣味激励」的闭环系统。

## 核心功能

### 1. 用户认证模块
- ✅ 手机号+密码登录
- ✅ 手机号+验证码登录（模拟短信）
- ✅ 用户注册
- ✅ JWT Token认证
- ✅ Spring Security权限控制

### 2. 用户档案模块
- ✅ 个人健身档案CRUD
- ✅ 档案信息缓存（Redis）
- ✅ 档案更新自动刷新匹配池

### 3. 搭子匹配模块（核心创新）
- ✅ 多维度匹配算法（目标30% + 时间25% + 场景20% + 监督15% + 基础10%）
- ✅ Redis分桶粗筛优化
- ✅ 匹配结果缓存（1小时）
- ✅ 支持1v1和3人组匹配

### 4. 组管理模块
- ✅ 创建搭子组
- ✅ 发送/接受邀约
- ✅ 组信息查询
- ✅ 组成员管理

### 5. 协同训练模块（实时交互）
- ✅ 训练进度实时上报
- ✅ Redis事务保证并发一致性
- ✅ WebSocket实时推送进度
- ✅ 训练启动/放弃通知
- ✅ 定时任务同步Redis到MySQL

### 6. 挑战模块
- ✅ 创建挑战（组内/公开）
- ✅ 参与挑战
- ✅ 打卡防重（Redis + DB唯一索引）
- ✅ 挑战报告生成
- ✅ 挑战类型区分（组内挑战/公开挑战）
- ✅ 差异化打卡规则（组内挑战需完成协同训练，公开挑战可直接打卡）

#### 挑战类型说明
- **组内挑战（type=0）**：仅限指定搭子组成员参与，需完成当日协同训练后方可手动打卡
- **公开挑战（type=1）**：面向所有用户开放，可直接打卡无需前置条件

### 7. 消息通知模块
- ✅ WebSocket实时推送（训练进度、邀约、提醒）
- ✅ RabbitMQ异步处理（打卡提醒、挑战报告）
- ✅ 站内信支持

### 8. 数据统计模块
- ✅ 个人统计数据（训练次数、完成率、平均分数）
- ✅ 组统计数据（完成率、成员排名）
- ✅ 挑战统计数据
- ✅ Redis缓存热点数据（30天）

### 9. 文件存储模块
- ✅ MinIO集成
- ✅ 动作照片/视频上传
- ✅ 奖杯图片生成

## 技术栈

- **框架**: Spring Boot 3.2.5
- **安全**: Spring Security + JWT
- **数据库**: MySQL 8 + MyBatis-Plus
- **缓存**: Redis（匹配池、进度缓存、统计缓存）
- **消息队列**: RabbitMQ（异步通知）
- **实时通信**: WebSocket (STOMP)
- **文件存储**: MinIO
- **API文档**: Swagger/OpenAPI
- **工具**: Lombok

## 快速开始

### 环境要求
- JDK 17+
- Maven 3.6+
- MySQL 8.0+
- Redis 6.0+
- RabbitMQ 3.8+
- MinIO（可选）

### 数据库初始化
```sql
-- 执行 docs/schema.sql 创建表结构
```

### 配置文件
修改 `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/gym
    username: root
    password: root
  data:
    redis:
      host: localhost
      port: 6379
  rabbitmq:
    host: localhost
    port: 5672
    # 5672 = AMQP 端口（Spring AMQP 连接使用）；15672 = RabbitMQ 管理后台端口（HTTP UI）
    virtual-host: /gym
    username: gym
    password: 123

minio:
  endpoint: http://localhost:9000
  access-key: minioadmin
  secret-key: minioadmin
```

### 运行项目
```bash
mvn clean package
java -jar target/gym-0.0.1-SNAPSHOT.jar
```

或直接运行：
```bash
mvn spring-boot:run
```

### 访问Swagger文档
```
http://localhost:8080/swagger-ui/index.html
```

## API接口说明

### 认证接口
- `POST /auth/register` - 注册
- `POST /auth/login` - 密码登录
- `POST /auth/login/code` - 验证码登录
- `POST /auth/send-code` - 发送验证码

### 用户接口
- `GET /user/profile` - 获取档案
- `PUT /user/profile` - 更新档案

### 匹配接口
- `GET /match/top` - 获取Top匹配结果

### 组管理接口
- `POST /group/create` - 创建组
- `POST /group/invite` - 发送邀约
- `POST /group/accept` - 同意邀约
- `GET /group/my-groups/me` - 我的组列表
- `GET /group/{groupId}` - 组详情
- `GET /group/{groupId}/detail` - 组详情（包含成员信息）
- `GET /group/{groupId}/members` - 组成员列表（调试用）

### 训练接口
- `POST /training/report` - 上报进度
- `POST /training/start` - 开始训练
- `POST /training/abandon` - 放弃训练

### 挑战接口
- `POST /challenge/create` - 创建挑战
- `POST /challenge/join` - 参与挑战
- `POST /challenge/punch` - 打卡
- `GET /challenge/list` - 挑战列表
- `GET /challenge/{challengeId}` - 挑战详情
- `GET /challenge/{challengeId}/report` - 生成报告

### 统计接口
- `GET /stat/personal` - 个人统计
- `GET /stat/group` - 组统计
- `GET /stat/challenge` - 挑战统计

### 文件接口
- `POST /storage/upload/action` - 上传动作文件
- `GET /storage/url` - 获取文件URL

## 核心技术亮点

### 1. 匹配算法优化
- Redis分桶粗筛，减少计算范围
- 权重打分算法，多维度匹配
- 结果缓存1小时，避免重复计算

### 2. 并发一致性保障
- Redis事务（WATCH/MULTI/EXEC）保证进度更新不覆盖
- 定时任务同步Redis到MySQL，最终一致性
- 打卡防重：Redis + DB唯一索引双重保障

### 3. WebSocket长连接管理
- JWT握手鉴权
- 心跳检测（前端30s，后端60s超时）
- 组播消息推送

### 4. 异步消息处理
- RabbitMQ队列：打卡提醒、挑战报告
- 消息重试机制
- 失败降级处理

## 项目结构

```
Gym/
├── src/
│   ├── main/java/com/gym/
│   │   ├── common/          # 通用类（响应、异常、错误码）
│   │   ├── config/          # 配置类
│   │   │   ├── ConditionalRedisConfig.java    # Redis配置
│   │   │   ├── CorsConfig.java                # 跨域配置
│   │   │   ├── JwtAuthFilter.java             # JWT认证过滤器
│   │   │   ├── JwtHandshakeInterceptor.java   # WebSocket握手拦截器
│   │   │   ├── MinioConfig.java               # MinIO对象存储配置
│   │   │   ├── MultipartConfig.java           # 文件上传配置
│   │   │   ├── NativeWebSocketConfig.java     # 原生WebSocket配置（小程序）
│   │   │   ├── NativeWebSocketHandler.java    # 原生WebSocket处理器
│   │   │   ├── RabbitConfig.java              # RabbitMQ配置
│   │   │   ├── SecurityConfig.java            # Spring Security配置
│   │   │   ├── SwaggerConfig.java             # API文档配置
│   │   │   ├── WebConfig.java                 # Web配置
│   │   │   ├── WebSocketAuthInterceptor.java  # WebSocket认证拦截器
│   │   │   └── WebSocketConfig.java           # STOMP WebSocket配置
│   │   ├── controller/      # 控制器层
│   │   ├── service/         # 服务接口
│   │   ├── service/impl/    # 服务实现
│   │   ├── entity/          # 实体类
│   │   ├── mapper/          # MyBatis-Plus Mapper
│   │   ├── consumer/        # RabbitMQ消费者
│   │   ├── job/             # 定时任务
│   │   │   ├── ChallengeStatusUpdateJob.java  # 挑战状态更新
│   │   │   └── TrainingSyncJob.java           # 训练进度同步
│   │   └── util/            # 工具类
│   │       └── JwtUtils.java                  # JWT工具类
│   └── resources/
│       ├── application.yml   # 配置文件
│       └── mapper/           # MyBatis XML（已迁移到MyBatis-Plus）
├── Gym_fronted/              # 前端uni-app项目
│   ├── pages/                # 页面文件
│   │   ├── auth/             # 认证页面
│   │   │   ├── login.vue     # 登录页
│   │   │   └── register.vue  # 注册页
│   │   ├── index/            # 首页
│   │   ├── user/             # 用户中心
│   │   ├── match/            # 智能匹配
│   │   ├── group/            # 搭子组
│   │   ├── training/         # 协同训练
│   │   ├── challenge/        # 挑战系统
│   │   ├── stat/             # 数据统计
│   │   └── course/           # 课程系统
│   ├── components/           # 通用组件
│   ├── common/               # 通用工具
│   │   ├── api.js            # API接口封装
│   │   ├── auth.js           # 认证工具
│   │   ├── config.js         # 全局配置
│   │   ├── http.js           # HTTP请求封装
│   │   ├── ws.js             # WebSocket封装（STOMP）
│   │   └── ws-native.js      # 原生WebSocket封装（小程序）
│   ├── static/               # 静态资源
│   └── unpackage/            # 构建产物
├── docs/                     # 文档目录
│   ├── gym.sql              # 数据库脚本
│   ├── DATABASE_SETUP.md    # 数据库设置指南
│   └── CHAT_FEATURE.md      # 聊天功能说明
├── CODE_DOCUMENTATION.md    # 代码注释文档
└── target/                   # Maven构建输出
```

## 面试重点

### 匹配算法设计
- 多维度权重打分
- Redis分桶优化
- 缓存策略

### 并发处理
- Redis事务保证一致性
- 定时任务最终一致性
- 防重机制

### 实时通信
- WebSocket长连接管理
- 心跳检测
- 消息推送

## 数据库设置

所有数据库相关脚本已整合到单个文件中：
- `docs/gym.sql`：包含完整的数据库结构、字段添加、数据初始化和验证查询

执行方式：
```bash
mysql -u root -p gym < docs/gym.sql
```

## 代码文档

详细代码注释文档见：[CODE_DOCUMENTATION.md](./CODE_DOCUMENTATION.md)

包含内容：
- 前端核心文件说明（main.js, App.vue, api.js, http.js 等）
- 后端配置类详解（Security, Redis, WebSocket, MinIO 等）
- 工具类使用说明（JwtUtils）
- 代码规范和命名约定
- 关键技术点详解（JWT认证、小程序兼容、Redis缓存）

## 后续优化方向

1. AI动作标准度评分（MediaPipe集成）
2. ~~分布式锁优化（Redisson）~~ - 已删除未使用的 RedisLockHelper
3. ✅ 消息队列延迟队列（打卡提醒）- 已实现
4. 数据可视化（ECharts前端）
5. 性能优化（索引优化、缓存预热）

## 近期优化记录

### 2026年2月
- ✅ 添加详细代码注释（config包、util包）
- ✅ 清理未使用的配置类（RedisHealthConfig, FallbackRedisConfig）
- ✅ 清理未使用的工具类（RedisLockHelper, RedisUtil）
- ✅ 迁移 ChallengeMapper 从 XML 到 MyBatis-Plus
- ✅ 完善挑战报告推送功能
- ✅ 添加打卡提醒定时任务

## 许可证

MIT License
=======
# Motes
Gym健身搭子智能匹配与协同训练
>>>>>>> 81d03c1cb8e458ae507da772e62d9d42f456afca
