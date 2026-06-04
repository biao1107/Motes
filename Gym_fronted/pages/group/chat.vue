<template>
  <view class="chat-page">
    <view v-if="showError" class="error-card">
      <view class="error-icon">
        <image class="error-icon-image" src="/static/icons/home/message-white.svg" mode="aspectFit" />
      </view>
      <text class="error-title">聊天页无法加载</text>
      <text class="error-desc">当前群组 ID 无效。</text>
      <view class="error-action" @tap="goBack">
        <text class="error-action-text">返回群组列表</text>
      </view>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-badge">
          <image class="hero-badge-icon" src="/static/icons/home/message-white.svg" mode="aspectFit" />
          <text class="hero-badge-text">组内聊天</text>
        </view>
        <text class="hero-title">训练沟通和图片分享都在这里</text>
        <text class="hero-desc">向上看历史，向下直接发消息。</text>

        <view class="chat-group-badge">
          <view class="chat-group-avatar">
            <template v-if="getGroupAvatarList().length > 0">
              <view
                v-for="(member, index) in getGroupAvatarList()"
                :key="`chat-${index}`"
                class="chat-avatar-cell"
                :class="`count-${getGroupAvatarList().length}`"
              >
                <view class="chat-avatar-fallback">{{ getAvatarLabel(member.nickname, groupName) }}</view>
                <image
                  v-if="member.avatar && !isBrokenAvatar(index)"
                  :src="member.avatar"
                  class="chat-avatar-image"
                  mode="aspectFill"
                  @error="markBrokenAvatar(index)"
                ></image>
              </view>
            </template>
            <view v-else class="chat-avatar-empty">组</view>
          </view>
          <text class="chat-group-name">{{ groupName }}</text>
        </view>

        <view class="hero-meta">
          <view class="hero-chip">
            <image class="hero-chip-icon" src="/static/icons/home/message-white.svg" mode="aspectFit" />
            <text class="hero-chip-text">{{ messages.length }} 条消息</text>
          </view>
          <view class="hero-chip">
            <image class="hero-chip-icon" src="/static/icons/home/image-blue.svg" mode="aspectFit" />
            <text class="hero-chip-text">支持图片发送</text>
          </view>
        </view>
      </view>

      <scroll-view
        class="chat-container"
        scroll-y="true"
        :scroll-top="scrollTop"
        @scroll="onScroll"
        ref="scrollView"
      >
        <view class="message-list">
          <view v-if="loadingMore" class="loading-more">
            <text class="loading-more-text">正在加载更多消息...</text>
          </view>

          <view
            v-for="(message, index) in messages"
            :key="message.id || index"
            class="message-item"
            :class="{ self: message.isSelf }"
          >
            <view v-if="!message.isSelf" class="other-message">
              <view class="message-header">
                <text class="sender-name">{{ message.nickname }}</text>
                <text class="message-time">{{ formatTime(message.createTime) }}</text>
              </view>
              <view class="message-content other-content" v-if="message.type !== 'IMAGE'">
                <text class="message-text">{{ message.content }}</text>
              </view>
              <image
                v-else
                :src="message.imageUrl"
                class="message-image"
                mode="widthFix"
                @tap="previewImage(message.imageUrl)"
              ></image>
            </view>

            <view v-else class="self-message">
              <view class="message-header self-header">
                <text class="message-time">{{ formatTime(message.createTime) }}</text>
              </view>
              <view class="message-content self-content" v-if="message.type !== 'IMAGE'">
                <text class="message-text">{{ message.content }}</text>
              </view>
              <image
                v-else
                :src="message.imageUrl"
                class="message-image self-image"
                mode="widthFix"
                @tap="previewImage(message.imageUrl)"
              ></image>
            </view>
          </view>

          <view class="bottom-placeholder"></view>
        </view>
      </scroll-view>

        <view class="input-container">
          <view class="input-actions">
            <view class="action-btn" @tap="chooseImage">
              <image class="action-icon-image" src="/static/icons/home/image-blue.svg" mode="aspectFit" />
            </view>
          </view>
        <input
          class="message-input"
          v-model="inputMessage"
          placeholder="说点什么..."
          @confirm="sendMessage"
          :focus="inputFocus"
        />
        <view
          class="send-btn"
          :class="{ disabled: !inputMessage.trim() }"
          @tap="sendMessage"
        >
          <image class="send-icon-image" src="/static/icons/home/send-white.svg" mode="aspectFit" />
          <text class="send-icon-text">发送</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import {
  apiGetGroupChatHistory,
  apiGetLatestMessages,
  apiUploadAction,
  apiGetFileUrl,
  apiMarkGroupRead,
  apiSendChatMessage,
  apiGroupDetailWithMembers
} from '@/common/api.js';
import { requireLogin, getUserIdFromToken, getUserNickname } from '@/common/auth.js';
import { sendChatMessage, subscribeGroupChat, isConnected, initWebSocket } from '@/common/ws.js';

const isMiniProgram = typeof wx !== 'undefined' && wx.getSystemInfoSync;

export default {
  data() {
    return {
      id: '',
      messages: [],
      inputMessage: '',
      inputFocus: false,
      userId: null,
      nickname: '',
      groupName: '搭子组',
      groupMembers: [],
      brokenAvatarMap: {},
      scrollTop: 0,
      loadingMore: false,
      hasMore: true,
      lastMessageId: 0,
      firstLoadMap: {},
      subscription: null,
      showError: false,
      pollingTimer: null,
      pollingInterval: 3000
    };
  },
  onLoad(query) {
    this.id = query && query.id ? Number(query.id) : query && query.groupId ? Number(query.groupId) : null;

    if (Number.isNaN(this.id) || this.id === null || this.id <= 0) {
      uni.showToast({
        title: '无效的群组ID',
        icon: 'none'
      });
      this.showError = true;
      return;
    }

    if (!(this.id in this.firstLoadMap)) {
      this.firstLoadMap[this.id] = true;
    }
  },
  mounted() {
    if (!(this.id in this.firstLoadMap)) {
      this.firstLoadMap[this.id] = true;
    }
  },
  onShow() {
    if (!requireLogin()) return;

    if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) {
      this.showError = true;
      return;
    }

    this.userId = getUserIdFromToken();
    this.loadUserProfile();
    this.loadGroupProfile();
    uni.$emit('refresh-home-unread');

    this.$nextTick(() => {
      this.initWebSocketConnection()
        .then(() => {
          this.loadChatHistory();
          this.startListening();
          this.markMessagesAsRead();
        })
        .catch((error) => {
          console.error('WebSocket初始化失败:', error);
          this.loadChatHistory();
          this.markMessagesAsRead();
        });
    });
  },
  onHide() {
    this.stopListening();
  },
  onUnload() {
    this.stopListening();
  },
  beforeDestroy() {
    this.stopListening();
  },
  deactivated() {
    this.stopListening();
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    activated() {
      if (!requireLogin()) return;

      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) {
        this.showError = true;
        return;
      }

      this.userId = getUserIdFromToken();
      this.loadUserProfile();
      this.loadGroupProfile();
      uni.$emit('refresh-home-unread');

      this.$nextTick(() => {
        this.initWebSocketConnection()
          .then(() => {
            this.loadChatHistory();
            this.startListening();
          })
          .catch((error) => {
            console.error('WebSocket初始化失败:', error);
            this.loadChatHistory();
          });
      });
    },
    async initWebSocketConnection() {
      if (!isConnected()) {
        await initWebSocket();
      }
    },
    loadUserProfile() {
      this.nickname = getUserNickname();
    },
    async loadGroupProfile() {
      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) return;

      try {
        const detail = await apiGroupDetailWithMembers(Number(this.id));
        this.groupName = detail?.groupName || '搭子组';
        this.groupMembers = Array.isArray(detail?.members) ? detail.members : [];
      } catch (error) {
        console.error('加载聊天群组信息失败:', error);
        this.groupName = '搭子组';
        this.groupMembers = [];
      }
    },
    getGroupAvatarList() {
      return this.groupMembers.slice(0, 4).map((member) => ({
        avatar: member?.avatar || '',
        nickname: member?.nickname || ''
      }));
    },
    getGroupAvatarFallback(index) {
      const member = this.groupMembers[index];
      const name = member?.nickname || '';
      return name ? name.charAt(0) : '组';
    },
    getAvatarLabel(nickname, groupName) {
      const name = (nickname || '').trim();
      if (name) return name.charAt(0);
      const group = (groupName || '').trim();
      if (group) return group.charAt(0);
      return '组';
    },
    markBrokenAvatar(index) {
      this.brokenAvatarMap = {
        ...this.brokenAvatarMap,
        [`chat-${index}`]: true
      };
    },
    isBrokenAvatar(index) {
      return !!this.brokenAvatarMap[`chat-${index}`];
    },
    async loadChatHistory() {
      if (!this.hasMore || this.loadingMore) return;
      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) {
        uni.showToast({
          title: '无效的群组ID',
          icon: 'none'
        });
        return;
      }

      this.loadingMore = true;
      try {
        const res = await apiGetGroupChatHistory(Number(this.id), 20);
        let history;

        if (res && typeof res === 'object' && 'code' in res && 'data' in res) {
          if (res.code === 200) {
            history = res.data || [];
          } else {
            throw new Error(`API请求失败: ${res.message || '未知错误'}`);
          }
        } else if (Array.isArray(res)) {
          history = res;
        } else {
          history = [];
        }

        if (history.length < 20) {
          this.hasMore = false;
        }

        history.forEach((message) => {
          message.isSelf = message.userId === Number(this.userId);
          if (message.createTime && typeof message.createTime === 'string') {
            message.createTime = new Date(message.createTime);
          } else if (!message.createTime) {
            message.createTime = new Date();
          }

          if (!message.type) {
            message.type = message.imageUrl ? 'IMAGE' : 'TEXT';
          } else {
            message.type = message.type.toUpperCase();
          }
        });

        const isGroupFirstLoad = this.firstLoadMap[this.id] === true;
        if (isGroupFirstLoad) {
          this.messages = history;
          this.firstLoadMap[this.id] = false;
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } else {
          const existingMessageIds = new Set(this.messages.map((message) => message.id));
          const newMessages = history.filter((message) => message.id && !existingMessageIds.has(message.id));
          if (newMessages.length > 0) {
            this.messages = [...newMessages, ...this.messages];
          }
        }

        if (history.length > 0) {
          this.lastMessageId = Math.max(...history.map((message) => message.id));
        }
      } catch (error) {
        console.error('加载聊天历史失败:', error);
        uni.showToast({
          title: '加载聊天历史失败: ' + (error.message || '未知错误'),
          icon: 'none',
          duration: 2000
        });
      } finally {
        this.loadingMore = false;
      }
    },
    sendMessage() {
      if (!this.inputMessage.trim()) return;

      if (isMiniProgram) {
        this.sendMessageHttp(this.inputMessage.trim());
      } else {
        sendChatMessage(Number(this.id), this.inputMessage.trim());
      }

      this.inputMessage = '';
      this.inputFocus = true;
    },
    async sendMessageHttp(content, imageUrl = '', type = 'TEXT') {
      try {
        const res = await apiSendChatMessage({
          groupId: Number(this.id),
          content,
          imageUrl,
          type
        });

        if (res && res.id) {
          const newMessage = {
            id: res.id,
            groupId: res.groupId,
            userId: res.userId,
            nickname: res.nickname,
            content: res.content,
            imageUrl: res.imageUrl,
            type: res.type || 'TEXT',
            createTime: res.createTime ? new Date(res.createTime) : new Date(),
            isSelf: true
          };
          this.messages.push(newMessage);
          this.lastMessageId = res.id;

          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        uni.showToast({
          title: '发送失败',
          icon: 'none'
        });
      }
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          try {
            uni.showLoading({ title: '上传中...' });
            const uploadRes = await apiUploadAction(res.tempFilePaths[0]);

            let imageUrl = '';
            if (uploadRes && typeof uploadRes === 'object') {
              if (uploadRes.data) {
                const objectName = typeof uploadRes.data === 'string' ? uploadRes.data : JSON.stringify(uploadRes.data);
                const urlRes = await apiGetFileUrl({ objectName });
                imageUrl = urlRes.data || urlRes || objectName;
              } else {
                imageUrl = JSON.stringify(uploadRes);
              }
            } else {
              imageUrl = uploadRes;
            }

            if (imageUrl) {
              if (isMiniProgram) {
                await this.sendMessageHttp('[图片]', imageUrl, 'IMAGE');
                uni.showToast({ title: '图片已发送', icon: 'success' });
              } else {
                sendChatMessage(Number(this.id), '[图片]', imageUrl, 'IMAGE');
                uni.showToast({ title: '图片已发送', icon: 'success' });
              }
            } else {
              throw new Error('图片上传失败');
            }
          } catch (error) {
            console.error('图片发送失败:', error);
            uni.showToast({ title: '图片发送失败', icon: 'none' });
          } finally {
            uni.hideLoading();
          }
        }
      });
    },
    startListening() {
      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) return;

      if (isMiniProgram) {
        this.startPolling();
        return;
      }

      if (!isConnected()) {
        initWebSocket()
          .then(() => {
            this.subscription = subscribeGroupChat(this.id, this.handleWsMessage);
          })
          .catch((error) => {
            console.error('WebSocket重新连接失败:', error);
          });
        return;
      }

      this.subscription = subscribeGroupChat(this.id, this.handleWsMessage);
    },
    startPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
      }

      this.pollNewMessages();
      this.pollingTimer = setInterval(() => {
        this.pollNewMessages();
      }, this.pollingInterval);
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    },
    async pollNewMessages() {
      if (!this.lastMessageId || this.lastMessageId <= 0) return;

      try {
        const newMessages = await apiGetLatestMessages(Number(this.id), this.lastMessageId);

        if (newMessages && Array.isArray(newMessages) && newMessages.length > 0) {
          newMessages.forEach((message) => {
            const exists = this.messages.some((item) => item.id === message.id);
            if (!exists) {
              this.messages.push({
                id: message.id,
                groupId: message.groupId,
                userId: message.userId,
                nickname: message.nickname,
                content: message.content,
                imageUrl: message.imageUrl,
                type: message.type || 'TEXT',
                createTime:
                  message.createTime && typeof message.createTime === 'string'
                    ? new Date(message.createTime)
                    : message.createTime || new Date(),
                isSelf: message.userId === Number(this.userId)
              });
            }
          });

          this.lastMessageId = Math.max(...newMessages.map((message) => message.id));
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      } catch (error) {
        console.error('轮询获取新消息失败:', error);
      }
    },
    stopListening() {
      this.stopPolling();

      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
    },
    handleWsMessage(payload) {
      if (payload.groupId === Number(this.id)) {
        const newMessage = {
          id: payload.id,
          groupId: payload.groupId,
          userId: payload.userId,
          nickname: payload.nickname,
          content: payload.content,
          imageUrl: payload.imageUrl,
          type: payload.type || 'TEXT',
          createTime:
            payload.createTime && typeof payload.createTime === 'string'
              ? new Date(payload.createTime)
              : payload.createTime || new Date(),
          isSelf: payload.userId === Number(this.userId)
        };

        this.messages.push(newMessage);
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    onScroll(e) {
      const scrollTop = e.detail.scrollTop;
      if (scrollTop < 50 && this.hasMore && !this.loadingMore) {
        this.loadChatHistory();
      }
    },
    scrollToBottom() {
      this.scrollTop = 999999;
    },
    formatTime(date) {
      if (!date) return '';
      const currentDate = new Date(date);
      const now = new Date();
      const diff = now - currentDate;

      if (currentDate.toDateString() === now.toDateString()) {
        return `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;
      }

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (currentDate.toDateString() === yesterday.toDateString()) {
        return `昨天 ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;
      }

      return `${currentDate.getMonth() + 1}-${currentDate.getDate()} ${String(currentDate.getHours()).padStart(2, '0')}:${String(
        currentDate.getMinutes()
      ).padStart(2, '0')}`;
    },
    previewImage(url) {
      uni.previewImage({
        urls: [url],
        current: url
      });
    },
    markMessagesAsRead() {
      if (!this.id || !this.userId) return;

      apiMarkGroupRead(Number(this.id), Number(this.userId)).catch((error) => {
        console.error('标记群组消息已读失败:', error);
        uni.showToast({
          title: '同步阅读状态失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      });
    }
  }
};
</script>

<style scoped>
.chat-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 160rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.error-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.hero-card {
  padding: 34rpx 30rpx;
  margin-bottom: 20rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  box-shadow: 0 20rpx 50rpx rgba(23, 56, 182, 0.22);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 44rpx;
  padding: 0 16rpx;
  margin-bottom: 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
}

.hero-badge-icon {
  width: 22rpx;
  height: 22rpx;
}

.hero-badge-text {
  color: rgba(255, 255, 255, 0.92);
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.hero-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 40rpx;
  line-height: 1.28;
  font-weight: 700;
  color: #ffffff;
}

.hero-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.84);
}

.chat-group-badge {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 16rpx;
  margin-top: 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.12);
}

.chat-group-avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.12);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 3rpx;
  padding: 4rpx;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
}

.chat-avatar-cell {
  position: relative;
  border-radius: 10rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
}

.chat-avatar-cell.count-1 {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
}

.chat-avatar-cell.count-2:nth-child(1) {
  grid-column: 1;
  grid-row: 1 / -1;
}

.chat-avatar-cell.count-2:nth-child(2) {
  grid-column: 2;
  grid-row: 1 / -1;
}

.chat-avatar-cell.count-3:nth-child(1) {
  grid-column: 1;
  grid-row: 1 / -1;
}

.chat-avatar-image,
.chat-avatar-fallback {
  width: 100%;
  height: 100%;
}

.chat-avatar-image {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.chat-avatar-fallback,
.chat-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 700;
}

.chat-avatar-fallback {
  font-size: 16rpx;
}

.chat-avatar-empty {
  grid-column: 1 / -1;
  font-size: 20rpx;
}

.chat-group-name {
  font-size: 23rpx;
  font-weight: 700;
  color: #ffffff;
}

.hero-meta {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.12);
}

.hero-chip-icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.hero-chip-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.88);
}

.chat-container {
  min-height: calc(100vh - 420rpx);
  padding: 10rpx 0 24rpx;
}

.message-list {
  padding-bottom: 20rpx;
}

.loading-more {
  text-align: center;
  padding: 16rpx 24rpx;
}

.loading-more-text {
  font-size: 23rpx;
  color: #738198;
}

.message-item {
  margin-bottom: 28rpx;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.sender-name {
  font-size: 24rpx;
  font-weight: 700;
  color: #3a4b67;
}

.message-time {
  font-size: 21rpx;
  color: #8a96aa;
}

.self-header {
  justify-content: flex-end;
}

.other-message,
.self-message {
  display: flex;
  flex-direction: column;
}

.self-message {
  align-items: flex-end;
}

.message-content {
  max-width: calc(100% - 80rpx);
  padding: 24rpx 28rpx;
  border-radius: 24rpx;
  font-size: 27rpx;
  line-height: 1.7;
  box-shadow: 0 10rpx 24rpx rgba(21, 35, 95, 0.08);
}

.other-content {
  background: #ffffff;
  color: #172233;
  border-top-left-radius: 10rpx;
}

.self-content {
  background: linear-gradient(150deg, #3253ef 0%, #6a7dff 100%);
  color: #ffffff;
  border-top-right-radius: 10rpx;
}

.message-image {
  max-width: 420rpx;
  border-radius: 20rpx;
  box-shadow: 0 10rpx 24rpx rgba(21, 35, 95, 0.08);
}

.self-image {
  margin-left: auto;
}

.bottom-placeholder {
  height: 20rpx;
}

.input-container {
  position: fixed;
  left: 18rpx;
  right: 18rpx;
  bottom: 18rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 42rpx rgba(21, 35, 95, 0.14);
  backdrop-filter: blur(18rpx);
}

.input-actions {
  display: flex;
}

.action-btn,
.send-btn,
.error-action {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: #eef3ff;
}

.action-icon-image {
  width: 24rpx;
  height: 24rpx;
}

.message-input {
  flex: 1;
  min-height: 72rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f5f7fc;
  font-size: 26rpx;
}

.send-btn {
  min-width: 108rpx;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  gap: 8rpx;
}

.send-btn.disabled {
  opacity: 0.6;
}

.send-icon-image {
  width: 22rpx;
  height: 22rpx;
}

.send-icon-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.error-card {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30rpx 24rpx;
}

.error-icon {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3354ef 0%, #6c81ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-icon-image {
  width: 42rpx;
  height: 42rpx;
}

.error-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1b2537;
}

.error-desc {
  display: block;
  margin-bottom: 24rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #738198;
}

.error-action {
  min-width: 200rpx;
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
}

.error-action-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
