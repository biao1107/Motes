# Gym 健身搭子

<p align="center">
  一个面向微信小程序 / uni-app 场景的健身社交项目，围绕
  <strong>找搭子、一起练、挑战打卡、消息协同、AI 辅助</strong>
  搭建完整训练闭环。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-17-1677ff?style=flat-square" alt="Java 17" />
  <img src="https://img.shields.io/badge/Spring%20Boot-3.2.5-65b045?style=flat-square" alt="Spring Boot 3.2.5" />
  <img src="https://img.shields.io/badge/uni--app-Vue%203-4c6fff?style=flat-square" alt="uni-app Vue 3" />
  <img src="https://img.shields.io/badge/MySQL-8%2B-2f6feb?style=flat-square" alt="MySQL 8+" />
  <img src="https://img.shields.io/badge/Redis-RabbitMQ-MinIO-f08c00?style=flat-square" alt="Redis RabbitMQ MinIO" />
</p>

## 项目简介

Gym 是一个“健身搭子 + 协同训练 + AI 顾问”的综合项目，分为：

- `Spring Boot` 后端：提供认证、匹配、组队、挑战、训练、课程、统计、消息、AI 等能力
- `uni-app` 前端：适配移动端 / 小程序场景，承载核心业务页面和交互
- `screenshots/`：项目效果图，适合直接用于 GitHub README 展示

项目重点不是“单次训练”，而是帮助用户持续训练：

- 找到更合适的健身搭子
- 建立固定训练小组
- 通过挑战和打卡保持节奏
- 用消息和实时通知增强协作
- 借助 AI 获取训练、饮食和动作分析建议

## 效果预览

### 首页 / 地图 / AI

<table>
  <tr>
    <td align="center">
      <img src="./screenshots/index.png" alt="首页" width="240" />
    </td>
    <td align="center">
      <img src="./screenshots/map.png" alt="附近健身房地图页" width="240" />
    </td>
    <td align="center">
      <img src="./screenshots/ai-chat2.png" alt="AI 顾问页" width="240" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>首页</strong><br />快捷入口、训练数据、待办提醒</td>
    <td align="center"><strong>附近健身房</strong><br />地图定位、筛选、搜索、导航</td>
    <td align="center"><strong>AI 顾问</strong><br />训练计划、饮食建议、动作分析</td>
  </tr>
</table>

### 组队 / 聊天 / 课程

<table>
  <tr>
    <td align="center">
      <img src="./screenshots/Snipaste_2026-03-13_14-22-53.png" alt="搭子组详情页" width="240" />
    </td>
    <td align="center">
      <img src="./screenshots/Snipaste_2026-03-13_15-16-48.png" alt="组内聊天页" width="240" />
    </td>
    <td align="center">
      <img src="./screenshots/图片4.png" alt="课程页" width="240" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>搭子组详情</strong><br />固定训练时间、成员、挑战概览</td>
    <td align="center"><strong>组内聊天</strong><br />交流训练进度与图片内容</td>
    <td align="center"><strong>课程中心</strong><br />按类型与难度筛选课程</td>
  </tr>
</table>

### 地图细节 / 个人档案 / 登录

<table>
  <tr>
    <td align="center">
      <img src="./screenshots/map1.png" alt="健身房列表" width="240" />
    </td>
    <td align="center">
      <img src="./screenshots/Snipaste_2026-03-13_14-22-19.png" alt="个人档案页" width="240" />
    </td>
    <td align="center">
      <img src="./screenshots/图片1.png" alt="登录页" width="240" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>场馆卡片</strong><br />距离、评分、导航、电话咨询</td>
    <td align="center"><strong>个人档案</strong><br />目标、时间、场景、监督偏好</td>
    <td align="center"><strong>认证页</strong><br />密码登录与验证码登录入口</td>
  </tr>
</table>

## 核心功能

### 1. 智能匹配

- 根据健身目标、训练时间、训练场景、健身基础等维度推荐搭子
- 首页可直接进入匹配页，缩短从“打开应用”到“开始训练”的路径

### 2. 搭子组协作

- 创建 2~3 人训练小组
- 支持按用户名邀请成员
- 展示固定训练时间、成员关系和组内挑战情况

### 3. 协同训练

- 开始训练、上报进度、放弃训练
- 支持查看今日训练记录
- 训练过程可以和组队协作、挑战打卡联动

### 4. 挑战与打卡

- 支持公开挑战和组内挑战
- 支持加入挑战、每日打卡、进度统计
- 首页展示待办数量，帮助形成持续训练节奏

### 5. 实时消息

- H5 环境支持 `WebSocket + STOMP`
- 组内聊天、进度通知、打卡提醒等能力可实时触达
- 小程序环境已做兼容处理，不强依赖 STOMP

### 6. 数据统计

- 统计训练天数、挑战参与度、搭子数量等信息
- 首页和统计页联合展示个人训练表现

### 7. 课程中心

- 支持课程列表、课程详情、推荐课程
- 支持按课程类型、难度等级和关键词检索

### 8. 地图找健身房

- 基于当前位置搜索附近健身房 / 私教工作室 / 体育馆
- 支持关键字搜索、半径筛选、卡片聚焦、电话咨询、导航前往
- 地图页效果图在 `screenshots/map.png`、`screenshots/map1.png`、`screenshots/map2.png`

### 9. AI 健身顾问

- 支持文字咨询训练计划、饮食建议、健身知识
- 支持上传动作图片进行姿势分析
- 后端通过 `LangChain4j + DashScope/Qwen` 提供统一对话与图文分析能力

## 技术栈

### 前端

- `uni-app`
- `Vue 3`
- `SCSS`
- `uni.request`
- `WebSocket + STOMP`（H5）

### 后端

- `Java 17`
- `Spring Boot 3.2.5`
- `Spring Security`
- `MyBatis-Plus`
- `MySQL`
- `Redis`
- `RabbitMQ`
- `MinIO`
- `Spring WebSocket`
- `SpringDoc OpenAPI`
- `LangChain4j`

## 项目结构

```text
Gym
├─ src/main/java/com/gym
│  ├─ ai/                 # AI 顾问、图像上传、统一对话
│  ├─ common/             # 通用响应、异常、错误码
│  ├─ config/             # 安全、WebSocket、Swagger、MinIO 等配置
│  ├─ controller/         # 认证、用户、匹配、组队、挑战、训练、课程、统计
│  ├─ dto/                # 数据传输对象
│  ├─ entity/             # 实体类
│  ├─ mapper/             # MyBatis Mapper
│  ├─ service/            # 业务服务
│  ├─ consumer/           # MQ 消费者
│  └─ job/                # 定时任务
├─ src/main/resources
│  ├─ application.yml
│  ├─ application-local.yml
│  └─ system-prompt.txt
├─ Gym_fronted
│  ├─ common/             # API、HTTP、认证、WebSocket、配置
│  ├─ pages/              # 业务页面
│  ├─ static/             # 图标、背景图、脚本资源
│  ├─ App.vue
│  ├─ main.js
│  └─ pages.json
├─ screenshots/           # README 效果图素材
├─ PROJECT_OVERVIEW.md    # 项目概览
├─ CODE_DOCUMENTATION.md  # 代码讲解文档
└─ README.md
```

## 主要页面与模块

| 模块 | 前端页面 | 后端接口/能力 |
| --- | --- | --- |
| 认证 | `pages/auth/login.vue` `pages/auth/register.vue` | `AuthController` / JWT / 验证码 |
| 首页 | `pages/index/index.vue` | `StatController` / 待办与概览统计 |
| 匹配 | `pages/match/index.vue` | `MatchController` |
| 搭子组 | `pages/group/*` | `GroupController` |
| 训练 | `pages/training/*` | `TrainingController` |
| 挑战 | `pages/challenge/*` | `ChallengeController` |
| 课程 | `pages/course/*` | `CourseController` |
| 统计 | `pages/stat/index.vue` | `StatController` |
| 地图 | `pages/map/index.vue` | 高德地图 Web API |
| AI 顾问 | `pages/ai/advisor.vue` | `AiController` |

## 快速开始

### 环境要求

- `JDK 17+`
- `Maven 3.9+`
- `MySQL 8+`
- `Redis 6+`
- `RabbitMQ 3.8+`
- `MinIO` 或兼容对象存储
- `Node.js 16+`
- `HBuilderX` 或 `uni-app CLI`

### 1. 启动后端

先根据你的本地环境修改以下配置：

- `src/main/resources/application.yml`
- `src/main/resources/application-local.yml`

重点检查：

- MySQL 连接
- Redis 连接
- RabbitMQ 连接
- MinIO / OSS 配置
- JWT 密钥
- AI 模型 API Key

启动命令：

```bash
mvn spring-boot:run
```

或：

```bash
mvn clean package
java -jar target/gym-0.0.1-SNAPSHOT.jar
```

启动后默认地址：

- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui.html`

### 2. 启动前端

先修改：

- `Gym_fronted/common/config.js`

默认配置为：

```js
const BASE_URL = 'http://localhost:8080';
```

如果是真机调试或局域网访问，请改成你的本机 IP。

在 `Gym_fronted` 目录下：

```bash
npm install
npm run dev:h5
```

也可以直接使用 `HBuilderX` 打开 `Gym_fronted` 目录运行到：

- H5 浏览器
- 微信开发者工具
- 手机真机

## 运行说明

### 地图能力

地图页位于：

- `Gym_fronted/pages/map/index.vue`

当前页面依赖两个高德配置项：

- `amap-key`
- `webKey`

如果你要部署自己的版本，建议替换为自己的 Key，并在对应平台开通地图、周边搜索、逆地理解析等能力。

### WebSocket

- H5 环境连接入口：`/ws`
- 前端封装：`Gym_fronted/common/ws.js`
- 登录后携带 JWT 建立 STOMP 连接
- 小程序环境已做兼容判断，不会强制初始化 STOMP

### AI 顾问

- 前端页面：`Gym_fronted/pages/ai/advisor.vue`
- 后端控制器：`src/main/java/com/gym/ai/controller/AiController.java`
- 支持文字对话、统一图文对话、动作图片上传与分析

## 开发建议

- 根目录 README 用于 GitHub 展示和快速上手
- 更完整的背景说明可以查看 `PROJECT_OVERVIEW.md`
- 代码讲解和注释说明可以查看 `CODE_DOCUMENTATION.md`

## 注意事项

- 当前仓库中未看到数据库初始化 SQL 脚本，落地时需要自行准备建表脚本或补充初始化数据
- 地图导航、定位、电话咨询建议优先在真机环境测试
- 提交到 GitHub 前，建议把本地 AI / OSS 密钥改为环境变量或本地私有配置，避免泄露敏感信息

## License

本项目当前更适合作为学习、演示和课程设计项目使用，如需商用请自行补充授权、合规和安全治理策略。
