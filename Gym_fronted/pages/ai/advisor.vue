<template>
  <view class="ai-advisor-page">
    <view class="page-top-bg"></view>
    <image
      class="page-bg-photo"
      src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80"
      mode="aspectFill"
    />
    <view class="top-orb orb-left"></view>
    <view class="top-orb orb-right"></view>

    <scroll-view class="main-scroll" scroll-y="true" :scroll-into-view="scrollIntoView">
      <view class="content-wrapper">
        <view class="hero-card">
          <view class="hero-copy">
            <text class="hero-badge">AI Fitness Advisor</text>
            <text class="hero-title">你的随身 AI 健身顾问</text>
            <text class="hero-desc">
              可以帮你制定训练计划、给健康饮食建议、讲解健身知识，也能结合图片分析动作姿势。
            </text>
          </view>

          <view class="hero-grid">
            <view class="hero-item">
              <text class="hero-item-label">训练计划</text>
              <text class="hero-item-value">结合档案建议</text>
            </view>
            <view class="hero-item">
              <text class="hero-item-label">动作分析</text>
              <text class="hero-item-value">图文统一对话</text>
            </view>
            <view class="hero-item">
              <text class="hero-item-label">饮食建议</text>
              <text class="hero-item-value">更容易执行</text>
            </view>
          </view>
        </view>

        <view class="quick-card">
          <view class="section-head">
            <text class="section-title">快捷问题</text>
            <text class="section-subtitle">点一下就能快速试效果</text>
          </view>

          <view class="quick-tags">
            <view
              v-for="item in quickQuestions"
              :key="item"
              class="quick-tag"
              @tap="useQuickQuestion(item)"
            >
              {{ item }}
            </view>
          </view>
        </view>

        <view class="chat-card">
          <view class="section-head">
            <text class="section-title">顾问对话</text>
            <text class="section-subtitle">支持纯文字、纯图片、图文组合三种方式</text>
          </view>

          <view v-if="messages.length === 0" class="empty-state">
            <view class="empty-icon-wrap">
              <image class="empty-icon" src="/static/icons/home/message-blue.svg" mode="aspectFit" />
            </view>
            <text class="empty-title">还没有对话内容</text>
            <text class="empty-desc">先问一个训练计划、饮食建议，或者上传动作图试试看</text>
          </view>

          <view v-else class="message-list">
            <view
              v-for="(item, index) in messages"
              :id="`msg-${index}`"
              :key="`msg-${index}`"
              class="message-row"
              :class="item.role"
            >
              <view class="message-bubble">
                <text class="message-role">{{ item.role === 'user' ? '我' : 'AI 顾问' }}</text>
                <text class="message-text">{{ item.content }}</text>
                <image
                  v-if="item.image"
                  class="message-image"
                  :src="item.image"
                  mode="aspectFill"
                />
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="composer-bar">
      <view v-if="selectedImage" class="composer-image-preview">
        <image class="composer-preview-image" :src="selectedImage" mode="aspectFill" />
        <view class="composer-preview-close" @tap="removeSelectedImage">×</view>
      </view>

      <textarea
        v-model="inputMessage"
        class="composer-input"
        maxlength="300"
        placeholder="问训练计划、饮食建议、健身知识，或者上传动作图..."
        placeholder-class="composer-placeholder"
      />
      <view class="composer-actions">
        <view class="composer-btn secondary" @tap="chooseActionImage">
          <image class="composer-icon" src="/static/icons/home/image-blue.svg" mode="aspectFit" />
        </view>
        <view class="composer-btn primary" :class="{ disabled: isSubmitting }" @tap="submitQuestion">
          <image class="composer-icon send" src="/static/icons/home/send-white.svg" mode="aspectFit" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { requireLogin } from '@/common/auth.js';
import { apiAiUnifiedChat, apiAiUploadActionImage } from '@/common/api.js';

const quickQuestions = [
  '帮我制定一周减脂训练计划',
  '我想增肌，饮食怎么安排更好',
  '请给我讲一下深蹲的发力逻辑',
  '这是我练腿动作，帮我看看姿势'
];

const memoryId = ref(1);
const inputMessage = ref('');
const messages = ref([]);
const selectedImage = ref('');
const scrollIntoView = ref('');
const isSubmitting = ref(false);

const scrollToLast = () => {
  if (!messages.value.length) return;
  scrollIntoView.value = `msg-${messages.value.length - 1}`;
};

const appendMessage = (role, content, image = '') => {
  messages.value.push({
    role,
    content,
    image
  });
  setTimeout(scrollToLast, 80);
};

const useQuickQuestion = (text) => {
  inputMessage.value = text;
};

const chooseActionImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      selectedImage.value = res.tempFilePaths?.[0] || '';
    }
  });
};

const removeSelectedImage = () => {
  selectedImage.value = '';
};

const submitQuestion = async () => {
  const message = (inputMessage.value || '').trim();
  const currentImage = selectedImage.value || '';
  const hasImage = !!currentImage;
  if ((!message && !hasImage) || isSubmitting.value) {
    return;
  }

  appendMessage('user', message || '请帮我分析这张动作图片。', currentImage);
  inputMessage.value = '';
  selectedImage.value = '';
  isSubmitting.value = true;

  try {
    let imageUrl = '';
    if (hasImage) {
      const uploadRes = await apiAiUploadActionImage(currentImage);
      imageUrl = typeof uploadRes === 'string'
        ? uploadRes
        : uploadRes?.imageUrl || '';
      if (!imageUrl) {
        throw new Error('Image upload result is empty');
      }
    }

    const result = await apiAiUnifiedChat({
      memoryId: memoryId.value,
      message,
      imageUrl
    });
    appendMessage('assistant', normalizeAiResponse(result));
    memoryId.value += 1;
  } catch (error) {
    console.error('AI 咨询失败:', error);
    appendMessage('assistant', '这次咨询暂时失败了，你可以稍后再试一次。');
  } finally {
    isSubmitting.value = false;
  }
};

const normalizeAiResponse = (result) => {
  if (typeof result === 'string') {
    return result;
  }
  if (result == null) {
    return 'AI 没有返回有效内容。';
  }
  return JSON.stringify(result);
};

onLoad(() => {
  if (!requireLogin()) {
    uni.redirectTo({ url: '/pages/auth/login' });
  }
});
</script>

<style scoped>
.ai-advisor-page {
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(54, 126, 255, 0.15), transparent 26%),
    linear-gradient(180deg, #edf3ff 0%, #f7f9fc 46%, #f4f7fb 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  position: relative;
  overflow: hidden;
}

.page-top-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 260rpx;
  background: linear-gradient(145deg, #1535b0 0%, #3254ef 48%, #78a5ff 100%);
  border-radius: 0 0 48rpx 48rpx;
  z-index: 1;
  box-shadow: 0 18rpx 46rpx rgba(25, 54, 176, 0.18);
}

.page-bg-photo {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 260rpx;
  opacity: 0.12;
  z-index: 1;
  pointer-events: none;
}

.top-orb {
  position: fixed;
  z-index: 1;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(8rpx);
}

.orb-left {
  top: 48rpx;
  left: -30rpx;
  width: 140rpx;
  height: 140rpx;
  background: rgba(255, 255, 255, 0.14);
}

.orb-right {
  top: 110rpx;
  right: -24rpx;
  width: 180rpx;
  height: 180rpx;
  background: rgba(172, 215, 255, 0.18);
}

.main-scroll {
  width: 100%;
  height: 100vh;
}

.content-wrapper {
  position: relative;
  z-index: 2;
  padding: 26rpx 24rpx 220rpx;
  box-sizing: border-box;
}

.hero-card,
.quick-card,
.chat-card {
  margin-bottom: 24rpx;
  border-radius: 30rpx;
  overflow: hidden;
}

.hero-card {
  padding: 28rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
  border: 1rpx solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 16rpx 34rpx rgba(16, 31, 94, 0.14);
  backdrop-filter: blur(18rpx);
}

.hero-copy {
  margin-bottom: 22rpx;
}

.hero-badge {
  display: inline-flex;
  padding: 8rpx 16rpx;
  margin-bottom: 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.94);
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.hero-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
}

.hero-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.84);
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.hero-item {
  padding: 18rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(8, 21, 79, 0.18);
}

.hero-item-label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}

.hero-item-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.quick-card,
.chat-card {
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 28rpx rgba(28, 46, 110, 0.07);
}

.section-head {
  margin-bottom: 18rpx;
}

.section-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #182338;
}

.section-subtitle {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #7a869c;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.quick-tag {
  padding: 14rpx 18rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  color: #2d4de4;
  font-size: 23rpx;
  line-height: 1.35;
}

.empty-state {
  padding: 32rpx 18rpx 22rpx;
  text-align: center;
}

.empty-icon-wrap {
  width: 92rpx;
  height: 92rpx;
  margin: 0 auto 16rpx;
  border-radius: 28rpx;
  background: #eef3ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  width: 42rpx;
  height: 42rpx;
}

.empty-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #182338;
}

.empty-desc {
  display: block;
  font-size: 22rpx;
  line-height: 1.6;
  color: #7a869c;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.message-row {
  display: flex;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 88%;
  padding: 18rpx 18rpx 16rpx;
  border-radius: 24rpx;
}

.message-row.user .message-bubble {
  background: linear-gradient(160deg, #3558ef 0%, #6f83ff 100%);
  box-shadow: 0 10rpx 22rpx rgba(53, 88, 239, 0.18);
}

.message-row.assistant .message-bubble {
  background: #f5f7fc;
}

.message-role {
  display: block;
  margin-bottom: 8rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.message-row.user .message-role,
.message-row.user .message-text {
  color: #ffffff;
}

.message-row.assistant .message-role {
  color: #2f4fdf;
}

.message-row.assistant .message-text {
  color: #182338;
}

.message-text {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-image {
  width: 100%;
  height: 280rpx;
  margin-top: 14rpx;
  border-radius: 20rpx;
}

.composer-bar {
  position: fixed;
  left: 18rpx;
  right: 18rpx;
  bottom: 18rpx;
  z-index: 99;
  padding: 18rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16rpx 34rpx rgba(17, 31, 92, 0.14);
  backdrop-filter: blur(18rpx);
}

.composer-image-preview {
  position: relative;
  width: 180rpx;
  height: 180rpx;
  margin-bottom: 16rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.composer-preview-image {
  width: 100%;
  height: 100%;
}

.composer-preview-close {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(10, 16, 44, 0.6);
  color: #ffffff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.composer-input {
  width: 100%;
  min-height: 112rpx;
  max-height: 180rpx;
  padding: 18rpx 18rpx 0;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f5f7fc;
  font-size: 25rpx;
  color: #182338;
}

.composer-placeholder {
  color: #8c98ac;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  margin-top: 14rpx;
}

.composer-btn {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.composer-btn.secondary {
  background: #eef3ff;
}

.composer-btn.primary {
  background: linear-gradient(160deg, #3558ef 0%, #6f83ff 100%);
  box-shadow: 0 12rpx 24rpx rgba(48, 80, 234, 0.2);
}

.composer-btn.disabled {
  opacity: 0.55;
}

.composer-icon {
  width: 34rpx;
  height: 34rpx;
}

.composer-icon.send {
  width: 28rpx;
  height: 28rpx;
}
</style>
