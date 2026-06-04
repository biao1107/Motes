<template>
  <view class="course-detail-page">
    <view class="hero-card">
      <image v-if="course.coverImage" class="hero-cover" :src="course.coverImage" mode="aspectFill" />
      <view v-else class="hero-cover placeholder-cover">
        <text class="placeholder-text">课程</text>
      </view>

      <view class="hero-overlay">
        <view class="hero-badge">
          <image class="hero-badge-icon" src="/static/icons/home/course-white.svg" mode="aspectFit" />
          <text class="hero-badge-text">课程详情</text>
        </view>
        <text class="hero-title">{{ course.courseName || '课程详情' }}</text>
        <text class="hero-desc">{{ course.description || '查看动作结构、时长和视频。' }}</text>
      </view>
    </view>

    <view class="summary-card">
      <view class="summary-grid">
        <view class="summary-item">
          <view class="summary-icon-wrap">
            <image class="summary-icon" src="/static/icons/home/clock-orange.svg" mode="aspectFit" />
          </view>
          <text class="summary-label">时长</text>
          <text class="summary-value">{{ course.duration || 0 }} 分钟</text>
        </view>
        <view class="summary-item">
          <view class="summary-icon-wrap">
            <image class="summary-icon" src="/static/icons/home/flame-white.svg" mode="aspectFit" />
          </view>
          <text class="summary-label">卡路里</text>
          <text class="summary-value">{{ course.calories || 0 }} kcal</text>
        </view>
        <view class="summary-item">
          <view class="summary-icon-wrap">
            <image class="summary-icon" src="/static/icons/home/course-blue.svg" mode="aspectFit" />
          </view>
          <text class="summary-label">类型</text>
          <text class="summary-value">{{ course.courseType || '未分类' }}</text>
        </view>
        <view class="summary-item">
          <view class="summary-icon-wrap">
            <image class="summary-icon" src="/static/icons/home/target-blue.svg" mode="aspectFit" />
          </view>
          <text class="summary-label">难度</text>
          <text class="summary-value difficulty" :class="difficultyClass">{{ course.difficulty || '入门' }}</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">课程内容</text>
          <text class="section-subtitle">动作和节奏拆开看</text>
        </view>
      </view>

      <view v-if="courseContent.length > 0" class="content-list">
        <view class="content-card" v-for="(item, index) in courseContent" :key="index">
          <view class="content-index">{{ index + 1 }}</view>
          <view class="content-body">
            <text class="content-title">{{ item.action }}</text>
            <view class="tag-row">
              <text v-if="item.time" class="meta-tag">{{ item.time }} 分钟</text>
              <text v-if="item.sets" class="meta-tag">{{ item.sets }} 组</text>
              <text v-if="item.count" class="meta-tag">{{ item.count }} 次</text>
              <text v-if="item.rest" class="meta-tag">休息 {{ item.rest }} 秒</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-inline">
        <image class="empty-inline-icon" src="/static/icons/home/course-blue.svg" mode="aspectFit" />
        <text class="empty-inline-text">当前课程还没有结构化内容说明。</text>
      </view>
    </view>

    <view class="section-card" v-if="course.videoUrl && !videoError">
      <view class="section-head">
        <view>
          <text class="section-title">视频教程</text>
          <text class="section-subtitle">训练前快速过一遍动作</text>
        </view>
      </view>

      <view class="video-box">
        <video
          :src="course.videoUrl"
          class="course-video"
          controls
          autoplay="false"
          :poster="course.coverImage"
          @error="onVideoError"
        ></video>
      </view>
    </view>

    <view class="error-card" v-if="videoError">
      <view class="error-icon">
        <image class="error-icon-image" src="/static/icons/home/play-white.svg" mode="aspectFit" />
      </view>
      <text class="error-title">视频加载失败</text>
      <text class="error-desc">检查网络后再试一次。</text>
      <view class="error-action" @tap="retryVideoLoad">
        <text class="error-action-text">重新加载视频</text>
      </view>
    </view>

    <view class="action-bar">
      <view class="action-btn secondary" @tap="addToFavorites">
        <image class="action-btn-icon" src="/static/icons/home/bookmark-blue.svg" mode="aspectFit" />
        <text class="action-btn-text secondary-text">收藏课程</text>
      </view>
    </view>
  </view>
</template>

<script>
import { apiGetCourseById } from '@/common/api.js';

export default {
  data() {
    return {
      courseId: null,
      course: {},
      courseContent: [],
      videoError: false
    };
  },
  computed: {
    difficultyClass() {
      const difficultyMap = {
        入门: 'diff-beginner',
        初级: 'diff-elementary',
        中级: 'diff-intermediate',
        高级: 'diff-advanced'
      };
      return difficultyMap[this.course.difficulty] || 'diff-beginner';
    }
  },
  onLoad(options) {
    this.courseId = options.id;
    this.loadCourseDetail();
  },
  methods: {
    async loadCourseDetail() {
      if (!this.courseId) return;

      try {
        const res = await apiGetCourseById(this.courseId);
        this.course = res || {};

        if (this.course.content) {
          try {
            this.courseContent = JSON.parse(this.course.content);
          } catch (error) {
            console.error('解析课程内容失败:', error);
            this.courseContent = [];
          }
        }

        uni.setNavigationBarTitle({
          title: this.course.courseName || '课程详情'
        });
      } catch (error) {
        console.error('加载课程详情失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    },
    addToFavorites() {
      uni.showToast({
        title: '已收藏',
        icon: 'success'
      });
    },
    onVideoError(error) {
      console.error('视频加载失败:', error);
      this.videoError = true;
    },
    retryVideoLoad() {
      this.videoError = false;
      this.loadCourseDetail();
    }
  }
};
</script>

<style scoped>
.course-detail-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.summary-card,
.section-card,
.error-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-card {
  position: relative;
  height: 430rpx;
  margin-bottom: 22rpx;
  box-shadow: 0 20rpx 50rpx rgba(21, 35, 95, 0.16);
}

.hero-cover {
  width: 100%;
  height: 100%;
  display: block;
}

.placeholder-cover {
  background: linear-gradient(150deg, #dce5ff 0%, #c9d7ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #4363f3;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 34rpx 30rpx;
  background: linear-gradient(180deg, rgba(9, 18, 48, 0.1), rgba(9, 18, 48, 0.72));
}

.hero-badge {
  display: inline-flex;
  width: fit-content;
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

.summary-card,
.section-card,
.error-card {
  padding: 30rpx 24rpx;
  margin-bottom: 20rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.summary-item {
  padding: 20rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.summary-icon-wrap {
  width: 52rpx;
  height: 52rpx;
  margin-bottom: 10rpx;
  border-radius: 16rpx;
  background: #eef3ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-icon {
  width: 28rpx;
  height: 28rpx;
}

.summary-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  color: #738198;
}

.summary-value {
  display: block;
  font-size: 30rpx;
  line-height: 1.4;
  font-weight: 700;
  color: #172233;
}

.difficulty {
  width: fit-content;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  color: #ffffff;
}

.diff-beginner {
  background: #3cab67;
}

.diff-elementary {
  background: #f39a27;
}

.diff-intermediate {
  background: #f05c4f;
}

.diff-advanced {
  background: #7c5bd6;
}

.section-head {
  margin-bottom: 20rpx;
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

.content-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.content-card {
  display: flex;
  gap: 16rpx;
  padding: 18rpx;
  border-radius: 26rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.content-index {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
}

.content-body {
  flex: 1;
  min-width: 0;
}

.content-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #172233;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.meta-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  font-size: 21rpx;
  color: #5f6d83;
}

.video-box {
  border-radius: 24rpx;
  overflow: hidden;
}

.course-video {
  width: 100%;
  height: 420rpx;
  display: block;
}

.error-card {
  text-align: center;
}

.error-icon {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 20rpx;
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

.error-action,
.action-btn {
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-action {
  min-width: 200rpx;
  padding: 0 24rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  margin: 0 auto;
}

.error-action-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.action-bar {
  padding-bottom: 12rpx;
}

.action-btn.secondary {
  border: 1rpx solid #cfd8ec;
  background: #ffffff;
  gap: 8rpx;
}

.action-btn-icon {
  width: 22rpx;
  height: 22rpx;
}

.action-btn-text {
  font-size: 26rpx;
  font-weight: 700;
}

.secondary-text {
  color: #3657ee;
}

.empty-inline {
  text-align: center;
}

.empty-inline-icon {
  width: 36rpx;
  height: 36rpx;
  margin-bottom: 10rpx;
}

.empty-inline-text {
  font-size: 24rpx;
  color: #8692a8;
}

@media (max-width: 750rpx) {
  .hero-card {
    height: 380rpx;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .course-video {
    height: 360rpx;
  }
}
</style>
