# Gym_fronted 前端（uni-app）

基于 uni-app 的健身搭子前端，已对接后端 Spring Boot 项目的所有核心接口，并适配统一返回结构 `ApiResponse<T> { code, message, data }`。

## 一、环境要求

- Node.js 16+
- HBuilderX（推荐）或 uni-app CLI
- 后端服务已在 `http://localhost:8080` 启动（可在 `common/config.js` 中修改 `BASE_URL`）。

## 二、项目结构

- `main.js` / `App.vue`：应用入口
- `pages/`：业务页面
  - `pages/auth/`：登录、注册
  - `pages/index/index.vue`：首页导航
  - `pages/map/index.vue`：附近健身房地图、搜索、导航与电话咨询
  - `pages/user/profile.vue`：用户档案
  - `pages/match/index.vue`：智能匹配
  - `pages/group/`：搭子组列表、详情和邀请
  - `pages/training/index.vue`：协同训练开始/上报/放弃
  - `pages/challenge/`：挑战列表、详情、参与、打卡、报告
  - `pages/stat/index.vue`：个人/组/挑战统计
- `common/`
  - `config.js`：`BASE_URL` 后端地址配置
  - `http.js`：HTTP 封装（自动解析 `ApiResponse`，统一处理 token、401 等）
  - `api.js`：按模块划分的业务接口封装
  - `auth.js`：token 读写与 `getUserIdFromToken()`
  - `ws.js`：WebSocket + STOMP 客户端（订阅 `/queue/user/{userId}` 实时消息）

## 三、运行方式

### 1. 使用 HBuilderX 运行

1. 打开 HBuilderX，选择“打开目录”，选择 `Gym_fronted` 目录。
2. 确认 `common/config.js` 中 `BASE_URL` 指向你的后端地址，如：
   ```js
   const BASE_URL = 'http://localhost:8080';
   ```
3. 在 HBuilderX 中选择“运行到浏览器”或“运行到手机模拟器/真机”。
4. 如需使用地图定位和系统导航，建议优先在手机真机环境测试，并允许定位权限。

### 2. 使用 uni-app CLI 运行（如已初始化为 Vite 项目）

如果你有 `package.json` 并已配置脚本，可在 `Gym_fronted` 目录执行：

```bash
npm install
npm run dev:h5
```

> 若当前目录尚未初始化为 npm 项目，可在 `Gym_fronted` 下执行 `npm init -y`，再按 uni-app 官方文档添加依赖和脚本。

## 四、打包

- **H5 打包**：在 HBuilderX 中选择“发行”→“网站-H5”，根据向导打包。
- **App 小程序打包**：按 uni-app 官方文档选择目标平台（微信小程序、App 等）进行打包。

## 五、接口与返回结构说明

- 所有通过 `common/http.js` 发送的请求默认按以下结构解析：
  ```json
  {
    "code": 0,
    "message": "ok",
    "data": { /* 业务数据 */ }
  }
  ```
- 当 `code === 0` 时，封装会直接返回 `data` 给调用者；否则会弹出 `message` 并抛出错误。

## 六、地图找健身房页面说明

- 路由入口：`/pages/map/index`
- 首页入口：`pages/index/index.vue` 的“快捷开始 -> 附近健身房”
- 页面能力：
  - 获取当前位置并搜索附近健身房
  - 支持关键词搜索，例如“健身房”“私教工作室”“体育馆”
  - 支持按距离范围筛选（1/3/5/8 公里）
  - 支持点击卡片聚焦地图
  - 支持“导航前往”和“电话咨询”

### 页面效果图

![地图找健身房页面效果图](./docs/map-page-preview.svg)

### 1. 高德 Key 配置

当前地图页在 `pages/map/index.vue` 中直接使用了两个 Key：

- `amap-key`：地图组件显示地图使用
- `webKey`：调用高德 Web API（周边搜索、逆地理解析）使用

如需更换为你自己的 Key，请修改 `pages/map/index.vue` 中以下字段：

```js
amapKey: '你的高德地图 key',
webKey: '你的高德 Web API key'
```

同时请确保在高德开放平台已开通对应能力：

- 地图 JS / uni-app 地图展示
- 周边搜索
- 逆地理编码
- 对应平台的定位与导航能力

### 2. 导航能力说明

- `App 真机`：优先唤起高德原生导航，失败时回退到系统地图。
- `H5 浏览器`：使用高德网页导航 URI。
- `小程序/其他端`：走 `uni.openLocation()`。

注意：

- 在 `普通浏览器预览`、`微信开发者工具`、`微信/QQ 内置浏览器` 中，系统导航唤起可能被环境限制。
- 如果当前环境不能直接打开导航，页面会提示复制地址，作为兜底方案。
- 真正验证“能否打开系统导航”，建议使用 `HBuilderX 真机运行` 或对应平台真机测试。

## 七、WebSocket 实时消息

- 连接端点：`/ws`（对应后端 `WebSocketConfig`）。
- 鉴权方式：
  - 握手：`ws://host/ws?token=JWT_TOKEN`
  - STOMP CONNECT 帧头：`token: JWT_TOKEN`
- 订阅目的地：`/queue/user/{userId}`，用于接收：
  - 训练开始 (`TRAINING_START`)
  - 训练进度更新 (`PROGRESS_UPDATE`)
  - 训练放弃 (`TRAINING_ABANDON`)
  - 打卡提醒 (`PUNCH_REMIND`) 等消息。
- 前端在 `App.vue` 的 `onLaunch` 中调用 `initWebSocket()` 自动建立连接并通过 `uni.$emit('ws-message', payload)` 广播消息，页面可以通过 `uni.$on('ws-message', handler)` 监听。

## 八、与后端字段对齐的示例

- 用户档案接口 `GET /user/profile` / `PUT /user/profile`：
  - 使用字段：`fitnessGoal`、`trainTime`、`trainScene`、`superviseDemand`、`fitnessLevel`、`nickname`，与后端 `User` 实体和 `UpdateReq` 完全一致。
- 训练接口：
  - `POST /training/start`：`{ userId, groupId }`
  - `POST /training/report`：`{ userId, groupId, date, done, target }`
  - `POST /training/abandon`：`{ userId, groupId, date }`

后续如有更多字段或接口调整，可直接在 `common/api.js` 与对应页面中按需扩展。
