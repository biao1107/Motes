# 组内聊天室功能说明

## 功能概述

组内聊天室功能允许同一个搭子组的成员之间进行实时文字交流，增强组内成员的互动性和协作性。

## 技术实现

### 后端实现

1. **数据库设计**
   - 新增 `t_chat_message` 表存储聊天消息
   - 包含字段：id, group_id, user_id, nickname, content, create_time

2. **服务层**
   - `ChatService` 接口及其实现 `ChatServiceImpl`
   - 提供消息发送、历史记录查询等功能

3. **控制器层**
   - `ChatController` 处理聊天相关HTTP请求
   - 通过WebSocket STOMP协议实现实时消息推送

4. **WebSocket支持**
   - 使用Spring WebSocket + STOMP实现
   - 消息通过 `/topic/group/{groupId}` 主题广播给组内所有成员

### 前端实现

1. **页面结构**
   - 新增 `pages/group/chat.vue` 聊天室页面
   - 在组详情页面添加进入聊天室的入口

2. **实时通信**
   - 使用现有的WebSocket连接
   - 通过STOMP协议发送和接收消息

3. **用户界面**
   - 消息列表展示区
   - 消息输入框和发送按钮
   - 支持消息上拉加载更多历史记录

## API接口

### 后端接口

1. **发送聊天消息**
   - 路径：`/app/group/chat`
   - 方法：STOMP SEND
   - 参数：
     - groupId: 组ID
     - content: 消息内容

2. **获取聊天历史记录**
   - 路径：`GET /chat/group/{groupId}/history`
   - 参数：
     - limit: 返回记录数（默认50）

3. **获取最新消息**
   - 路径：`GET /chat/group/{groupId}/latest`
   - 参数：
     - lastMessageId: 最后一条消息ID

### 前端接口

1. **apiGetGroupChatHistory(groupId, limit)**
   - 获取组聊天历史记录

2. **apiGetLatestMessages(groupId, lastMessageId)**
   - 获取最新消息

## 使用说明

1. **进入聊天室**
   - 在组详情页面点击"进入聊天室"按钮

2. **发送消息**
   - 在输入框中输入消息内容
   - 点击"发送"按钮或按回车键发送

3. **查看历史消息**
   - 聊天页面会自动加载最近的历史消息
   - 向上滚动可加载更多历史消息

## 安全性

1. **身份验证**
   - 所有聊天消息都经过JWT Token验证
   - 只有组内成员才能发送和接收消息

2. **数据保护**
   - 消息内容存储在数据库中
   - 敏感信息不会被记录

## 扩展功能建议

1. **多媒体支持**
   - 支持图片、语音等多媒体消息

2. **消息状态**
   - 显示消息已读/未读状态

3. **@功能**
   - 支持@特定成员提醒

4. **消息撤回**
   - 允许用户撤回刚刚发送的消息

5. **聊天记录搜索**
   - 支持按关键字搜索聊天记录