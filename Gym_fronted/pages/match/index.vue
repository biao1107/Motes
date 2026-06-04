<template>
  <view class="match-page">
    <view class="hero-section">
      <image class="hero-photo" src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80" mode="aspectFill" />
      <view class="hero-badge">
        <image class="hero-badge-icon" src="/static/icons/home/compass-white.svg" mode="aspectFit" />
        <text class="hero-badge-text">智能匹配</text>
      </view>
      <text class="hero-title">为你推荐更适合长期坚持的健身搭子</text>
      <text class="hero-desc">
        推荐会综合训练目标、偏好时段、训练场景和监督需求，让第一次发起邀请更有把握。
      </text>
      <view class="hero-meta">
        <view class="hero-chip">
          <view class="chip-head">
            <image class="chip-icon" src="/static/icons/home/group-white.svg" mode="aspectFit" />
            <text class="chip-label">推荐数量</text>
          </view>
          <text class="chip-value">{{ matchResult.length }}</text>
        </view>
        <view class="hero-chip">
          <view class="chip-head">
            <image class="chip-icon" src="/static/icons/home/chart-white.svg" mode="aspectFit" />
            <text class="chip-label">当前状态</text>
          </view>
          <text class="chip-value">{{ loaded ? '已生成' : '匹配中' }}</text>
        </view>
      </view>
    </view>

    <view v-if="!loaded" class="loading-panel">
      <view class="loading-spinner"></view>
      <text class="loading-title">正在生成匹配推荐</text>
      <text class="loading-copy">结合你的档案信息筛选更合适的训练伙伴</text>
    </view>

    <template v-else>
      <view v-if="hasMatchResult" class="section-card">
        <view class="section-head">
          <view>
            <text class="section-title">推荐结果</text>
            <text class="section-subtitle">优先展示更适合立即开始训练配对的用户</text>
          </view>
          <text class="section-count">{{ matchResult.length }} 位搭子</text>
        </view>

        <view class="match-list">
          <view
            v-for="(item, index) in matchResult"
            :key="item.id || item.userId || index"
            class="match-card"
          >
            <view class="card-top">
              <view class="match-avatar">
                <image
                  v-if="item.avatar && item.avatar.trim()"
                  :src="item.avatar"
                  class="avatar-image"
                  mode="aspectFill"
                  @error="onAvatarLoadError"
                />
                <text v-else class="avatar-text">{{ getAvatarText(item, index) }}</text>
              </view>

              <view class="match-main">
                <view class="name-row">
                  <text class="match-name">{{ item.nickname || `搭子 ${index + 1}` }}</text>
                  <view class="score-pill">
                    <text class="score-pill-text">{{ formatScore(item.score) }}%</text>
                  </view>
                </view>

                <text class="match-reason">{{ getMatchReason(item) }}</text>

                <view class="score-track">
                  <view class="score-fill" :style="{ width: `${formatScore(item.score)}%` }"></view>
                </view>
              </view>
            </view>

                <view class="tag-group">
              <view v-if="item.goal" class="tag-item goal">
                <image class="tag-icon" src="/static/icons/home/target-blue.svg" mode="aspectFit" />
                <text class="tag-text">{{ item.goal }}</text>
              </view>
              <view v-if="item.preferTime" class="tag-item time">
                <image class="tag-icon" src="/static/icons/home/clock-orange.svg" mode="aspectFit" />
                <text class="tag-text">{{ item.preferTime }}</text>
              </view>
              <view v-if="item.scene" class="tag-item scene">
                <image class="tag-icon" src="/static/icons/home/location-green.svg" mode="aspectFit" />
                <text class="tag-text">{{ item.scene }}</text>
              </view>
              <view v-if="item.mode" class="tag-item mode">
                <image class="tag-icon" src="/static/icons/home/chart-blue.svg" mode="aspectFit" />
                <text class="tag-text">{{ item.mode }}</text>
              </view>
            </view>

            <view class="card-actions">
              <view class="action-btn secondary" @tap="goProfile">
                <image class="action-btn-icon" src="/static/icons/home/profile-blue.svg" mode="aspectFit" />
                <text class="action-btn-text secondary-text">完善档案</text>
              </view>
              <view class="action-btn primary" @tap="goToGroups">
                <image class="action-btn-icon" src="/static/icons/home/group-white.svg" mode="aspectFit" />
                <text class="action-btn-text">去发起组队</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-card">
        <view class="empty-icon">
          <image class="empty-icon-image" src="/static/icons/home/compass-white.svg" mode="aspectFit" />
        </view>
        <text class="empty-title">暂时还没有合适的匹配结果</text>
        <text class="empty-desc">
          可以先补充你的目标、训练时间和训练场景，系统会给出更准确的推荐。
        </text>
        <view class="empty-actions">
          <view class="action-btn primary" @tap="goProfile">
            <image class="action-btn-icon" src="/static/icons/home/profile-white.svg" mode="aspectFit" />
            <text class="action-btn-text">去完善档案</text>
          </view>
          <view class="action-btn secondary" @tap="loadData">
            <image class="action-btn-icon" src="/static/icons/home/compass-blue.svg" mode="aspectFit" />
            <text class="action-btn-text secondary-text">重新匹配</text>
          </view>
        </view>
      </view>

      <view class="refresh-bar">
        <view class="refresh-btn" @tap="loadData">
          <image class="refresh-icon" src="/static/icons/home/sync-blue.svg" mode="aspectFit" />
          <text class="refresh-text">刷新推荐</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { apiGetTopMatch } from '@/common/api.js';
import { requireLogin, getUserIdFromToken } from '@/common/auth.js';

export default {
  data() {
    return {
      loaded: false,
      matchResult: []
    };
  },
  computed: {
    hasMatchResult() {
      return Array.isArray(this.matchResult) && this.matchResult.length > 0;
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadData();
  },
  methods: {
    async loadData() {
      this.loaded = false;

      try {
        uni.showLoading({ title: '匹配中...' });
        const userId = getUserIdFromToken();

        if (!userId) {
          this.loaded = true;
          uni.hideLoading();
          uni.showToast({
            title: '登录信息异常',
            icon: 'none'
          });
          return;
        }

        const res = await apiGetTopMatch(8);
        this.matchResult = res?.data || res || [];
        this.loaded = true;
        uni.hideLoading();
      } catch (error) {
        console.error('加载匹配结果失败:', error);
        this.matchResult = [];
        this.loaded = true;
        uni.hideLoading();
        uni.showToast({
          title: '匹配失败，请稍后重试',
          icon: 'none'
        });
      }
    },
    formatScore(score) {
      const num = Number(score || 0);
      return Math.max(0, Math.min(100, Math.round(num)));
    },
    getAvatarText(item, index) {
      if (item.nickname && item.nickname.length > 0) {
        return item.nickname.charAt(0);
      }
      return `${index + 1}`;
    },
    getMatchReason(item) {
      const reasons = [];
      if (item.goal) reasons.push(`目标偏向 ${item.goal}`);
      if (item.preferTime) reasons.push(`时间更适合 ${item.preferTime}`);
      if (item.scene) reasons.push(`训练场景偏好 ${item.scene}`);
      return reasons.length > 0 ? reasons.join(' · ') : '与你的训练目标和节奏更接近';
    },
    goProfile() {
      uni.navigateTo({ url: '/pages/user/profile' });
    },
    goToGroups() {
      uni.navigateTo({ url: '/pages/group/index' });
    },
    onAvatarLoadError(error) {
      console.log('头像加载失败:', error);
    }
  }
};
</script>

<style scoped>
.match-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.18), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-section,
.section-card,
.empty-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-section {
  position: relative;
  padding: 34rpx 30rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  box-shadow: 0 20rpx 50rpx rgba(23, 56, 182, 0.22);
  overflow: hidden;
}

.hero-photo {
  position: absolute;
  inset: 0;
  opacity: 0.16;
  pointer-events: none;
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
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.82);
}

.hero-meta {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}

.hero-chip {
  flex: 1;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.12);
}

.chip-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.chip-icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.chip-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}

.chip-value {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.loading-panel {
  margin-top: 60rpx;
  text-align: center;
}

.loading-spinner {
  width: 72rpx;
  height: 72rpx;
  margin: 0 auto 20rpx;
  border: 6rpx solid rgba(61, 97, 242, 0.12);
  border-top-color: #4864f2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1b2537;
}

.loading-copy {
  display: block;
  font-size: 24rpx;
  color: #738198;
}

.section-card,
.empty-card {
  padding: 30rpx 24rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 22rpx;
}

.section-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #172233;
}

.section-subtitle {
  display: block;
  font-size: 22rpx;
  line-height: 1.55;
  color: #74829a;
}

.section-count {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  font-size: 22rpx;
  font-weight: 600;
  color: #4564f2;
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.match-card {
  padding: 24rpx 22rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.card-top {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
}

.match-avatar {
  width: 92rpx;
  height: 92rpx;
  border-radius: 28rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(150deg, #3253ef 0%, #6a7dff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 26rpx rgba(50, 83, 239, 0.2);
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.match-main {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.match-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
  color: #172233;
}

.score-pill {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #e9efff;
}

.score-pill-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #3557ef;
}

.match-reason {
  display: block;
  margin-bottom: 14rpx;
  font-size: 23rpx;
  line-height: 1.55;
  color: #75829a;
}

.score-track {
  width: 100%;
  height: 10rpx;
  border-radius: 999rpx;
  background: #dde4f2;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #3658ef 0%, #6d82ff 100%);
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  line-height: 1;
}

.tag-icon {
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
}

.tag-text {
  font-size: 21rpx;
  line-height: 1;
}

.tag-item.goal {
  background: #eef4ff;
  color: #3151ea;
}

.tag-item.time {
  background: #fff4e7;
  color: #d97a12;
}

.tag-item.scene {
  background: #eefaf7;
  color: #198a63;
}

.tag-item.mode {
  background: #f7efff;
  color: #7a42d9;
}

.card-actions,
.empty-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 20rpx;
}

.action-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.action-btn-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.action-btn.primary {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.action-btn.secondary {
  border: 1rpx solid #cfd8ec;
  background: #ffffff;
}

.action-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.secondary-text {
  color: #3657ee;
}

.empty-card {
  text-align: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 22rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3354ef 0%, #6c81ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon-image {
  width: 42rpx;
  height: 42rpx;
}

.empty-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #172233;
}

.empty-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.65;
  color: #74829a;
}

.refresh-bar {
  padding: 26rpx 10rpx 12rpx;
}

.refresh-btn {
  height: 84rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.84);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-shadow: 0 10rpx 24rpx rgba(21, 35, 95, 0.08);
}

.refresh-icon {
  width: 24rpx;
  height: 24rpx;
}

.refresh-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #3657ee;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
