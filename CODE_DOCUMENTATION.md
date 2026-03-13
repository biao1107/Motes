# Gym 健身搭子项目 - 代码注释文档

## 📝 已添加详细注释的文件

### ✅ 前端核心文件

#### 1. main.js - 应用入口
**路径**: `Gym_fronted/main.js`

**功能说明**:
- 初始化 uni-app 应用实例
- 支持 Vue2 和 Vue3 两种模式
- 挂载应用到小程序运行时

**关键代码**:
```javascript
// Vue2 模式
const app = new Vue({...App})
app.$mount()

// Vue3 模式  
const app = createSSRApp(App)
```

---

#### 2. App.vue - 应用根组件
**路径**: `Gym_fronted/App.vue`

**功能说明**:
- 管理应用的生命周期（启动、显示、隐藏）
- 定义全局样式
- WebSocket 在登录后初始化，不在这里初始化

**生命周期**:
- `onLaunch()`: 小程序初始化完成时触发（全局只触发一次）
- `onShow()`: 小程序启动或从后台进入前台时触发
- `onHide()`: 小程序从前台进入后台时触发

---

#### 3. config.js - 全局配置
**路径**: `Gym_fronted/common/config.js`

**功能说明**:
- 配置后端 API 接口地址

**配置项**:
```javascript
const BASE_URL = 'http://localhost:8080';  // 后端服务器地址
```

**注意事项**:
- 开发环境使用 localhost:8080
- 生产环境需要修改为实际服务器地址
- 小程序真机调试时，需要使用局域网 IP 地址

---

#### 4. auth.js - 用户认证模块
**路径**: `Gym_fronted/common/auth.js`

**功能说明**:
- 管理 JWT Token（保存、获取、清除）
- 管理用户信息（本地缓存）
- 提供登录校验功能
- 从 JWT Token 中解析用户 ID

**核心函数**:

##### setToken(token)
保存 Token 到本地存储
```javascript
export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token || '');
}
```

##### getToken()
从本地存储获取 Token
```javascript
export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || '';
}
```

##### getUserIdFromToken()
从 JWT Token 中解析用户 ID

**原理**: JWT Token 由三部分组成：header.payload.signature，payload 部分包含用户信息

```javascript
export function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  
  try {
    // JWT Token 格式：header.payload.signature
    const parts = token.split('.');
    
    // 解码 payload 部分（Base64 编码）
    const payload = JSON.parse(
      decodeURIComponent(
        escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      )
    );
    
    // 从 payload 中提取 subject（即 userId）
    return payload.sub ? Number(payload.sub) : null;
  } catch (e) {
    return null;
  }
}
```

##### requireLogin()
检查用户是否已登录，未登录时跳转到登录页

**使用场景**: 在需要登录才能访问的页面中调用

```javascript
export function requireLogin() {
  const token = getToken();
  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/auth/login' });
    }, 500);
    return false;
  }
  return true;
}
```

---

#### 5. http.js - HTTP 请求封装
**路径**: `Gym_fronted/common/http.js`

**功能说明**:
- 封装 uni.request，提供统一的 HTTP 请求接口
- 自动添加 JWT Token 到请求头
- 统一处理后端 ApiResponse 响应格式
- 统一处理错误（401未授权、网络异常等）

**后端 ApiResponse 结构**:
```javascript
{
  code: 0,          // 0-成功，非0-失败
  message: '成功',  // 提示信息
  data: {}          // 实际数据
}
```

**核心函数**:

##### request(options)
基础请求方法

```javascript
export function request({ url, method = 'GET', data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    // 获取 JWT Token
    const token = getToken();
    
    // 构建请求头
    const finalHeader = Object.assign(
      { 'Content-Type': 'application/json' },
      header
    );
    
    // 添加 Authorization 头
    if (token) {
      finalHeader['Authorization'] = 'Bearer ' + token;
    }

    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: finalHeader,
      success(res) {
        // 处理 401 未授权
        if (res.statusCode === 401) {
          clearToken();
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/auth/login' });
          }, 800);
          return reject(res);
        }
        
        // 解析 ApiResponse
        const body = res.data || {};
        if (typeof body.code === 'number') {
          if (body.code === 0) {
            resolve(body.data);  // 成功，返回 data
          } else {
            uni.showToast({ title: body.message || '请求失败', icon: 'none' });
            reject(body);
          }
        } else {
          resolve(body);  // 兼容非统一返回
        }
      },
      fail(err) {
        uni.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      }
    });
  });
}
```

##### get(url, params)
GET 请求快捷方法

**功能**: 自动将参数拼接到 URL 查询字符串中

**例子**:
```javascript
get('/user/list', { page: 1, size: 10 })
// 实际请求：GET /user/list?page=1&size=10
```

**实现**: 
```javascript
export function get(url, params = {}) {
  // 手动实现URL参数拼接，兼容小程序环境（不支持 URLSearchParams）
  const queryArray = [];
  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
      // 使用 encodeURIComponent 编码，防止特殊字符引起问题
      queryArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    }
  }
  const queryString = queryArray.join('&');
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  return request({ url: fullUrl, method: 'GET' });
}
```

**为什么手动拼接**:
- 小程序环境不支持 `URLSearchParams` API
- 需要兼容小程序和 H5 两种环境

##### post(url, data)
POST 请求快捷方法

**功能**: 参数以 JSON 格式放在请求体中

```javascript
export function post(url, data = {}) {
  return request({ url, method: 'POST', data });
}
```

##### put(url, data)
PUT 请求快捷方法

**功能**: 用于更新资源，参数以 JSON 格式放在请求体中

```javascript
export function put(url, data = {}) {
  return request({ url, method: 'PUT', data });
}
```

---

#### 6. api.js - API 接口封装
**路径**: `Gym_fronted/common/api.js`

**功能说明**:
- 封装所有后端接口调用
- 提供统一的 API 调用方式

**模块分类**:
1. 认证模块：注册、登录、验证码
2. 用户模块：用户信息、档案管理
3. 匹配模块：健身搭子匹配
4. 组管理模块：创建组、邀请成员、组详情
5. 训练模块：训练记录、打卡
6. 挑战模块：创建挑战、加入挑战、打卡
7. 统计模块：个人统计、组统计、挑战统计
8. 聊天模块：聊天历史、未读消息
9. 文件模块：文件上传、头像上传
10. 课程模块：课程列表、课程详情、推荐课程

**核心接口示例**:

##### 认证模块
```javascript
// 用户注册
export function apiRegister(data) {
  return post('/auth/register', data);
}

// 密码登录
export function apiLoginByPassword(data) {
  return post('/auth/login', data);
}

// 发送验证码
export function apiSendCode(data) {
  return post('/auth/send-code', data);
}
```

##### 用户模块
```javascript
// 获取用户档案
export function apiGetProfile() {
  return get('/user/profile');
}

// 更新用户档案
export function apiUpdateProfile(data) {
  return put('/user/profile', data);
}
```

##### 组管理模块
```javascript
// 创建组
export function apiCreateGroup(data) {
  return post('/group/create', data);
}

// 邀请成员（通过用户名）
export function apiInviteToGroupByUsername(data) {
  return post('/group/invite-by-username', data);
}

// 我的组列表
export function apiMyGroups() {
  return get('/group/my-groups');
}
```

##### 挑战模块
```javascript
// 创建挑战
export function apiChallengeCreate(data) {
  return post('/challenge/create', data);
}

// 加入挑战
export function apiChallengeJoin(data) {
  return post('/challenge/join', data);
}

// 挑战打卡
export function apiChallengePunch(data) {
  return post('/challenge/punch', data);
}

// 挑战列表
export function apiChallengeList(params = {}) {
  return get('/challenge/list', params);
}
```

---

### ✅ 后端核心文件

#### 1. GymApplication.java - 应用启动类
**路径**: `src/main/java/com/gym/GymApplication.java`

**功能说明**:
- Spring Boot 应用的启动入口
- 应用配置和组件扫描

**注解说明**:

##### @SpringBootApplication
Spring Boot 主注解，包含：
- `@Configuration`: 声明为配置类
- `@EnableAutoConfiguration`: 启用自动配置
- `@ComponentScan`: 扫描当前包及子包的组件

##### @MapperScan("com.gym.mapper")
MyBatis Mapper 扫描
- 扫描 com.gym.mapper 包下所有 Mapper 接口
- 自动生成实现类，不需要手动编写

##### @EnableScheduling
启用定时任务
- 用于执行定时任务（如更新挑战状态）

**启动方式**:
```bash
# 1. IDE：直接运行 main 方法

# 2. Maven
mvn spring-boot:run

# 3. JAR
mvn clean package
java -jar target/gym-0.0.1-SNAPSHOT.jar
```

---

#### 2. 配置类（config 包）

**路径**: `src/main/java/com/gym/config/`

##### ConditionalRedisConfig.java - Redis 配置
**功能**: 配置 RedisTemplate，设置 Key/Value 的序列化方式
- Key: String 序列化（可读）
- Value: JSON 序列化（跨语言兼容）

**关键配置**:
```java
// 使用 String 作为 key 的序列化器
template.setKeySerializer(new StringRedisSerializer());

// 使用 JSON 作为 value 的序列化器
template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
```

---

##### CorsConfig.java - 跨域配置
**功能**: 配置全局 CORS，允许前端跨域访问

**为什么需要**: 前端（localhost:5173）和后端（localhost:8080）端口不同，浏览器会拦截跨域请求

**配置说明**:
- 允许所有来源（开发环境）
- 允许携带 Cookie/Authorization 头
- 允许所有 HTTP 方法

---

##### JwtAuthFilter.java - JWT 认证过滤器
**功能**: 拦截所有 HTTP 请求，解析 JWT Token 并注入用户身份

**执行流程**:
1. 从 Authorization 头获取 Token
2. 解析 JWT 获取 userId
3. 查询数据库验证用户存在
4. 创建认证对象存入 SecurityContext
5. 放行请求（无论认证成功与否）

**代码示例**:
```java
// 从请求头获取 Token
String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
String token = authHeader.substring(7);  // 去掉 "Bearer "

// 解析 JWT
Claims claims = jwtUtils.parse(token);
Long userId = Long.valueOf(claims.getSubject());

// 存入 SecurityContext，后续代码可通过它获取当前用户
SecurityContextHolder.getContext().setAuthentication(authentication);
```

---

##### JwtHandshakeInterceptor.java - WebSocket 握手拦截器
**功能**: 在 WebSocket 握手阶段验证 JWT Token

**与 JwtAuthFilter 的区别**:
- JwtAuthFilter: 处理普通 HTTP 请求
- JwtHandshakeInterceptor: 处理 WebSocket 握手请求

**特点**:
- 支持两种传 Token 方式：Header 或 Query 参数
- 不阻断失败的握手，只尝试认证
- 将 userId 存入 attributes 供后续使用

---

##### MinioConfig.java - MinIO 对象存储配置
**功能**: 配置 MinIO 客户端，初始化存储桶

**什么是 MinIO**: 兼容 Amazon S3 API 的对象存储服务器，用于存储图片、视频等文件

**初始化流程**:
1. 创建 MinioClient 实例
2. 检查并创建存储桶（actions, trophy, avatars, courses）
3. 设置公开读策略（解决图片 403 问题）

**存储桶说明**:
- actions: 打卡图片
- trophy: 奖杯/徽章图片
- avatars: 用户头像
- courses: 课程封面/视频

---

##### MultipartConfig.java - 文件上传配置
**功能**: 配置文件上传大小限制

**配置参数**:
- maxFileSize: 单个文件最大 50MB
- maxRequestSize: 总请求最大 50MB

**为什么需要**: Spring Boot 默认限制 1MB，不够存储高清图片

---

##### SecurityConfig.java - 安全配置
**功能**: 配置 Spring Security 的安全规则

**核心配置**:
```java
// 禁用 CSRF（使用 JWT 天然免疫 CSRF）
.csrf(csrf -> csrf.disable())

// 无状态 Session（使用 JWT 不需要 Session）
.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

// 白名单路径（无需认证）
.requestMatchers("/auth/**", "/ws/**", "/swagger-ui/**").permitAll()

// 添加 JWT 过滤器
.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
```

**密码加密**:
```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();  // 使用 BCrypt 哈希算法
}
```

---

##### SwaggerConfig.java - API 文档配置
**功能**: 配置 Swagger/OpenAPI 文档信息

**访问地址**: http://localhost:8080/swagger-ui.html

**作用**:
- 自动生成 API 文档
- 提供在线调试界面
- 前后端协作时查看接口定义

---

##### WebConfig.java - Web 配置
**功能**: 配置静态资源处理和视图控制器

**静态资源映射**:
- /static/** → classpath:/static/
- /public/** → classpath:/public/
- /webjars/** → classpath:/META-INF/resources/webjars/

**根路径重定向**:
```java
// 访问 / 自动转发到 /index.html
registry.addViewController("/").setViewName("forward:/index.html");
```

---

##### WebSocketConfig.java - STOMP WebSocket 配置
**功能**: 配置 STOMP 协议的 WebSocket（用于 H5/浏览器）

**什么是 STOMP**: 简单文本消息协议，类似 HTTP，用于 WebSocket 消息通信

**消息路径前缀**:
- /topic/**: 广播消息（群聊）
- /queue/**: 点对点消息
- /user/**: 用户专属路径
- /app/**: 应用前缀（客户端发送时需加此前缀）

**端点配置**:
```java
registry.addEndpoint("/ws")           // WebSocket 端点 URL
        .addInterceptors(jwtHandshakeInterceptor)  // 认证拦截
        .setAllowedOriginPatterns("*");            // 允许跨域
```

---

##### WebSocketAuthInterceptor.java - WebSocket 认证拦截器
**功能**: 在 STOMP 消息发送阶段验证用户身份

**拦截时机**:
- CONNECT: 客户端连接时
- SUBSCRIBE: 客户端订阅时
- SEND: 客户端发送消息时

**与 JwtHandshakeInterceptor 的分工**:
- JwtHandshakeInterceptor: 握手阶段认证（建立连接时）
- WebSocketAuthInterceptor: 消息阶段认证（后续通信时）

---

##### RabbitConfig.java - RabbitMQ 配置
**功能**: 配置消息队列

**队列定义**:
- notify.match.result: 匹配结果通知
- notify.punch.remind: 打卡提醒通知

**用途**: 异步处理通知，避免阻塞主流程

---

#### 3. 工具类（util 包）

**路径**: `src/main/java/com/gym/util/`

##### JwtUtils.java - JWT 工具类
**功能**: 生成和解析 JWT Token

**JWT 结构**: Header.Payload.Signature

**核心方法**:
```java
// 生成 Token
public String generateToken(Long userId) {
    return Jwts.builder()
        .setSubject(String.valueOf(userId))  // 存入 userId
        .setIssuedAt(now)                     // 签发时间
        .setExpiration(exp)                   // 过期时间
        .signWith(key, SignatureAlgorithm.HS256)  // 签名
        .compact();
}

// 解析 Token
public Claims parse(String token) {
    return Jwts.parserBuilder()
        .setSigningKey(key)
        .build()
        .parseClaimsJws(token)
        .getBody();
}
```

---

## 📚 代码规范说明

### 前端命名规范

#### 文件命名
- 页面文件：小写字母 + 连字符，如 `login.vue`, `group-detail.vue`
- 组件文件：大驼峰命名，如 `FitnessCard.vue`
- JS文件：小写字母 + 连字符，如 `api.js`, `http.js`

#### 变量命名
- 普通变量：小驼峰命名，如 `userInfo`, `challengeList`
- 常量：全大写 + 下划线，如 `BASE_URL`, `TOKEN_KEY`

#### 函数命名
- API 函数：`api + 操作 + 资源`，如 `apiGetUserInfo`, `apiCreateChallenge`
- 事件处理函数：`on + 事件名`或 `handle + 事件名`，如 `onLogin`, `handleSubmit`

#### CSS 类命名
- 使用 `kebab-case` 命名：如 `user-info`, `challenge-card`
- **禁止使用中文**：微信小程序不支持 class 名称中使用中文
- 语义化命名：如 `container`, `header`, `title`

### 后端命名规范

#### 类命名
- Controller：`资源名 + Controller`，如 `UserController`, `ChallengeController`
- Service：`资源名 + Service`，如 `UserService`, `ChallengeService`
- Entity：资源名，如 `User`, `Challenge`
- Mapper：`资源名 + Mapper`，如 `UserMapper`, `ChallengeMapper`

#### 方法命名
- 查询：`get + 资源`或 `list + 资源`，如 `getUserById`, `listChallenges`
- 创建：`create + 资源`，如 `createChallenge`
- 更新：`update + 资源`，如 `updateProfile`
- 删除：`delete + 资源`，如 `deleteGroup`

---

## 🎯 关键技术点说明

### 1. JWT Token 认证流程

```
┌─────────┐                  ┌─────────┐
│  前端   │                  │  后端   │
└────┬────┘                  └────┬────┘
     │                            │
     │  1. 用户登录               │
     ├──────────────────────────>│
     │  POST /auth/login          │
     │  {username, password}      │
     │                            │
     │  2. 验证成功，返回 Token   │
     │<──────────────────────────┤
     │  {token: "eyJhbGc..."}     │
     │                            │
     │  3. 保存 Token 到本地      │
     │                            │
     │  4. 请求带 Token           │
     ├──────────────────────────>│
     │  GET /user/info            │
     │  Authorization: Bearer ... │
     │                            │
     │  5. 验证 Token，返回数据   │
     │<──────────────────────────┤
     │  {code:0, data:{...}}      │
     │                            │
```

### 2. 小程序环境兼容处理

#### URLSearchParams 不支持
**问题**: 小程序不支持 `URLSearchParams` API

**解决**: 手动实现 URL 参数拼接
```javascript
// 不使用 URLSearchParams
const queryArray = [];
for (const key in params) {
  if (params[key] !== undefined && params[key] !== null) {
    queryArray.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    );
  }
}
const queryString = queryArray.join('&');
```

#### CSS class 中文不支持
**问题**: 微信小程序不支持 class 名称中使用中文

**解决**: 使用英文映射
```javascript
// 错误写法
:class="'diff-' + course.difficulty"  // 会生成 diff-入门

// 正确写法
computed: {
  difficultyClass() {
    const map = {
      '入门': 'diff-beginner',
      '初级': 'diff-elementary',
      '中级': 'diff-intermediate',
      '高级': 'diff-advanced'
    };
    return map[this.course.difficulty] || 'diff-beginner';
  }
}
```

#### WebSocket STOMP 不支持
**问题**: 小程序不支持 STOMP 库

**解决**: 添加环境检测
```javascript
// 检测运行环境
const isMiniProgram = typeof wx !== 'undefined' && wx.getSystemInfoSync;

if (isMiniProgram) {
  console.warn('小程序环境暂不支持WebSocket STOMP');
  return Promise.reject(new Error('小程序环境暂不支持WebSocket STOMP'));
}
```

### 3. Redis 缓存优化

**目的**: 减少数据库查询，提升性能

**应用场景**: 缓存课程和挑战的图片 URL（MinIO 预签名URL）

**实现**:
```java
// 1. 尝试从 Redis 获取
String cacheKey = "course:image:" + courseId;
String cachedUrl = redisTemplate.opsForValue().get(cacheKey);

if (cachedUrl != null) {
    // 缓存命中
    return cachedUrl;
} else {
    // 缓存未命中，从 MinIO 获取
    String url = storageService.getFileUrl(imagePath);
    
    // 存入 Redis，有效期 6 小时
    redisTemplate.opsForValue().set(cacheKey, url, 6, TimeUnit.HOURS);
    
    return url;
}
```

---

## 🔍 常见问题解答

### Q1: 为什么要手动拼接 URL 参数？
**A**: 因为微信小程序不支持 `URLSearchParams` API，为了兼容小程序环境，需要手动实现参数拼接。

### Q2: JWT Token 存储在哪里？
**A**: 存储在小程序本地存储中，使用 `uni.setStorageSync` API。

### Q3: 如何区分公开挑战和组内挑战？
**A**: 通过 `groupId` 字段：
- `groupId = 0`: 公开挑战
- `groupId > 0`: 组内挑战

### Q4: Redis 缓存什么时候更新？
**A**: 
- 缓存有效期：6 小时
- 超过有效期后，下次请求会重新从数据库获取并更新缓存

### Q5: 小程序如何实现实时聊天？
**A**: 目前小程序环境使用轮询方式获取最新消息，H5 环境使用 WebSocket + STOMP。

---

## 📖 学习建议

### 前端学习路径
1. 学习 uni-app 基础知识
2. 了解微信小程序开发规范
3. 学习 Vue.js 框架
4. 掌握 Promise 和 async/await
5. 理解组件化开发思想

### 后端学习路径
1. 学习 Spring Boot 基础
2. 了解 RESTful API 设计
3. 学习 MyBatis Plus ORM 框架
4. 掌握 JWT 认证机制
5. 理解分层架构（Controller -> Service -> Mapper）

### 推荐阅读顺序
1. 阅读 PROJECT_OVERVIEW.md 了解项目整体
2. 阅读本文档了解代码注释
3. 从简单页面开始（如登录页）
4. 逐步学习复杂模块（如挑战系统）

---

**最后更新**: 2026年2月27日

---

## 🗑️ 已删除的废弃文件

### 后端删除文件清单

| 文件路径 | 删除原因 | 替代方案 |
|---------|---------|---------|
| `RedisHealthConfig.java` | 与 `ConditionalRedisConfig` 重复，导致 Bean 冲突 | 保留 `ConditionalRedisConfig` |
| `FallbackRedisConfig.java` | 未设置 ConnectionFactory，无法正常使用 | 删除，使用标准配置 |
| `RedisLockHelper.java` | 未使用 | 删除 |
| `RedisUtil.java` | 未使用 | 删除 |
| `ChallengeMapper.xml` | 已迁移到 MyBatis-Plus | 使用 LambdaQueryWrapper |

### 清理原则
1. **无调用即删除**: 使用 `grep_code` 确认无调用后删除
2. **重复配置合并**: 多个配置类冲突时保留最合理的
3. **过时注释同步清理**: 删除功能时同步删除相关注释
