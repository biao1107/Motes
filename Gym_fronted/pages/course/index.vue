<template>
  <view class="course-page">
    <view class="hero-card">
      <view class="hero-badge">Course Library</view>
      <text class="hero-title">把课程内容做成可筛选、可浏览、可快速进入的训练内容库</text>
      <text class="hero-desc">
        你可以先按训练类型和难度缩小范围，再进入课程详情页决定今天练什么。
      </text>
    </view>

    <view class="filter-card">
      <view class="search-box">
        <input
          class="search-input"
          type="text"
          placeholder="搜索课程名称或课程描述"
          v-model="searchKeyword"
          @confirm="onSearch"
        />
        <view class="search-trigger" @tap="onSearch">搜索</view>
      </view>

      <view class="filter-group">
        <text class="filter-label">训练类型</text>
        <scroll-view class="chip-scroll" scroll-x="true">
          <view class="chip-row">
            <view class="filter-chip" :class="{ active: activeType === '' }" @tap="filterByType('')">全部</view>
            <view class="filter-chip" :class="{ active: activeType === '有氧' }" @tap="filterByType('有氧')">有氧</view>
            <view class="filter-chip" :class="{ active: activeType === '力量' }" @tap="filterByType('力量')">力量</view>
            <view class="filter-chip" :class="{ active: activeType === '柔韧' }" @tap="filterByType('柔韧')">柔韧</view>
          </view>
        </scroll-view>
      </view>

      <view class="filter-group">
        <text class="filter-label">难度等级</text>
        <view class="difficulty-row">
          <view class="difficulty-chip" :class="{ active: activeDifficulty === '' }" @tap="filterByDifficulty('')">全部</view>
          <view class="difficulty-chip" :class="{ active: activeDifficulty === '入门' }" @tap="filterByDifficulty('入门')">入门</view>
          <view class="difficulty-chip" :class="{ active: activeDifficulty === '初级' }" @tap="filterByDifficulty('初级')">初级</view>
          <view class="difficulty-chip" :class="{ active: activeDifficulty === '中级' }" @tap="filterByDifficulty('中级')">中级</view>
        </view>
      </view>
    </view>

    <view class="recommend-section" v-if="recommendCourses.length > 0 && !searchKeyword">
      <view class="section-head">
        <view>
          <text class="section-title">热门推荐</text>
          <text class="section-subtitle">更适合作为第一次尝试或快速开始的课程</text>
        </view>
      </view>

      <scroll-view class="recommend-scroll" scroll-x="true">
        <view class="recommend-list">
          <view
            v-for="course in recommendCourses"
            :key="course.id"
            class="recommend-card"
            @tap="goToCourseDetail(course.id)"
          >
            <image v-if="course.coverImage" class="recommend-cover" :src="course.coverImage" mode="aspectFill" />
            <view v-else class="recommend-cover placeholder-cover">
              <text class="placeholder-text">课程</text>
            </view>

            <view class="recommend-body">
              <text class="course-name">{{ course.courseName }}</text>
              <text class="course-desc">{{ course.description }}</text>
              <view class="meta-row">
                <text class="meta-item">{{ course.duration }} 分钟</text>
                <text class="meta-item">{{ course.calories || 0 }} 卡路里</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="list-section">
      <view class="section-head">
        <view>
          <text class="section-title">{{ searchKeyword ? '搜索结果' : '全部课程' }}</text>
          <text class="section-subtitle">按目标和强度选择更适合今天训练安排的课程</text>
        </view>
        <text class="section-count">{{ courseList.length }} 门</text>
      </view>

      <view v-if="courseList.length > 0" class="course-list">
        <view
          v-for="course in courseList"
          :key="course.id"
          class="course-card"
          @tap="goToCourseDetail(course.id)"
        >
          <image v-if="course.coverImage" class="course-cover" :src="course.coverImage" mode="aspectFill" />
          <view v-else class="course-cover placeholder-cover">
            <text class="placeholder-text">训练</text>
          </view>

          <view class="course-body">
            <view class="course-head">
              <text class="course-title">{{ course.courseName }}</text>
              <view class="tag-group">
                <text class="tag type-tag">{{ course.courseType }}</text>
                <text class="tag difficulty-tag" :class="getDifficultyClass(course.difficulty)">
                  {{ course.difficulty }}
                </text>
              </view>
            </view>

            <text class="course-copy">{{ course.description }}</text>

            <view class="meta-row compact">
              <text class="meta-item">{{ course.duration }} 分钟</text>
              <text class="meta-item">{{ course.calories || 0 }} 卡路里</text>
              <text class="meta-item" v-if="course.videoUrl">含视频</text>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="load-more" @tap="loadMore">
          <text class="load-more-text">{{ loading ? '加载中...' : '点击加载更多' }}</text>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-card">
        <view class="empty-icon">课</view>
        <text class="empty-title">没有找到相关课程</text>
        <text class="empty-desc">可以切换筛选条件，或者换一个更宽泛的关键词继续搜索。</text>
      </view>
    </view>
  </view>
</template>

<script>
import { apiGetCourseList, apiGetRecommendCourses, apiSearchCourses } from '@/common/api.js';

export default {
  data() {
    return {
      searchKeyword: '',
      activeType: '',
      activeDifficulty: '',
      page: 1,
      size: 10,
      courseList: [],
      recommendCourses: [],
      loading: false,
      hasMore: true,
      total: 0
    };
  },
  onLoad() {
    this.loadRecommendCourses();
    this.loadCourseList();
  },
  methods: {
    getDifficultyClass(difficulty) {
      const difficultyMap = {
        入门: 'diff-beginner',
        初级: 'diff-elementary',
        中级: 'diff-intermediate',
        高级: 'diff-advanced'
      };
      return difficultyMap[difficulty] || 'diff-beginner';
    },
    async loadRecommendCourses() {
      try {
        const res = await apiGetRecommendCourses(6);
        this.recommendCourses = res || [];
      } catch (error) {
        console.error('加载推荐课程失败:', error);
      }
    },
    async loadCourseList(reset = false) {
      if (this.loading) return;

      this.loading = true;
      if (reset) {
        this.page = 1;
        this.courseList = [];
        this.hasMore = true;
      }

      try {
        const res = await apiGetCourseList(this.page, this.size, this.activeType, this.activeDifficulty);
        const newList = res.records || res || [];

        if (reset) {
          this.courseList = newList;
        } else {
          this.courseList = [...this.courseList, ...newList];
        }

        this.total = res.total || 0;
        this.hasMore = this.courseList.length < this.total;
        this.page += 1;
      } catch (error) {
        console.error('加载课程列表失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    async onSearch() {
      if (!this.searchKeyword.trim()) {
        this.loadCourseList(true);
        return;
      }

      this.loading = true;
      this.courseList = [];

      try {
        const res = await apiSearchCourses(this.searchKeyword, 1, 20);
        this.courseList = res.records || res || [];
        this.total = res.total || 0;
        this.hasMore = false;
      } catch (error) {
        console.error('搜索课程失败:', error);
        uni.showToast({
          title: '搜索失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    filterByType(type) {
      this.activeType = type;
      this.loadCourseList(true);
    },
    filterByDifficulty(difficulty) {
      this.activeDifficulty = difficulty;
      this.loadCourseList(true);
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.loadCourseList();
      }
    },
    goToCourseDetail(courseId) {
      uni.navigateTo({
        url: `/pages/course/detail?id=${courseId}`
      });
    }
  }
};
</script>

<style scoped>
.course-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.filter-card,
.list-section,
.empty-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-card {
  padding: 34rpx 30rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  box-shadow: 0 20rpx 50rpx rgba(23, 56, 182, 0.22);
}

.hero-badge {
  display: inline-flex;
  height: 42rpx;
  padding: 0 16rpx;
  margin-bottom: 18rpx;
  border-radius: 999rpx;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.14);
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

.filter-card,
.list-section {
  padding: 28rpx 24rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.filter-card {
  margin-bottom: 22rpx;
}

.search-box {
  display: flex;
  align-items: center;
  height: 84rpx;
  padding: 0 10rpx 0 24rpx;
  border-radius: 999rpx;
  background: #f4f7ff;
  margin-bottom: 24rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
}

.search-trigger {
  min-width: 120rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
}

.filter-group + .filter-group {
  margin-top: 18rpx;
}

.filter-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #172233;
}

.chip-scroll {
  white-space: nowrap;
}

.chip-row {
  display: flex;
  gap: 12rpx;
}

.filter-chip,
.difficulty-chip {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #f3f5fa;
  color: #5f6d83;
  font-size: 24rpx;
}

.filter-chip.active,
.difficulty-chip.active {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  color: #ffffff;
}

.difficulty-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.recommend-section {
  margin-bottom: 22rpx;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
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

.recommend-scroll {
  width: 100%;
  white-space: nowrap;
}

.recommend-list {
  display: inline-flex;
  width: max-content;
  gap: 16rpx;
  padding: 4rpx 0 6rpx;
}

.recommend-card {
  width: 420rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 28rpx rgba(21, 35, 95, 0.08);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.recommend-cover,
.course-cover {
  background: linear-gradient(150deg, #dce5ff 0%, #c9d7ff 100%);
}

.recommend-cover {
  width: 100%;
  height: 210rpx;
  display: block;
}

.placeholder-cover {
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #4363f3;
}

.recommend-body {
  padding: 22rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.course-name,
.course-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #172233;
  min-width: 0;
}

.course-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-desc,
.course-copy {
  display: block;
  font-size: 23rpx;
  line-height: 1.58;
  color: #74829a;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-desc {
  -webkit-line-clamp: 2;
}

.course-copy {
  -webkit-line-clamp: 3;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.meta-row.compact {
  margin-top: 14rpx;
}

.meta-item {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #f3f6fb;
  font-size: 21rpx;
  color: #627188;
  white-space: nowrap;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.course-card {
  display: flex;
  align-items: stretch;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
  min-height: 208rpx;
}

.course-cover {
  width: 168rpx;
  height: 168rpx;
  border-radius: 22rpx;
  overflow: hidden;
  flex-shrink: 0;
  display: block;
}

.course-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-head {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
}

.type-tag {
  background: #edf3ff;
  color: #3151ea;
}

.difficulty-tag {
  background: #f4f6fb;
  color: #5f6d83;
}

.difficulty-tag.diff-beginner {
  background: #eef8f2;
  color: #2f8a5c;
}

.difficulty-tag.diff-elementary {
  background: #fff5ea;
  color: #d67a18;
}

.difficulty-tag.diff-intermediate {
  background: #fff0ef;
  color: #d05b4f;
}

.difficulty-tag.diff-advanced {
  background: #f6efff;
  color: #7f4ed8;
}

.load-more {
  margin-top: 22rpx;
  text-align: center;
}

.load-more-text {
  font-size: 24rpx;
  color: #4564f2;
}

.empty-card {
  padding: 50rpx 24rpx;
  margin-top: 12rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
  text-align: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3354ef 0%, #6c81ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
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

@media (max-width: 750rpx) {
  .recommend-card {
    width: 360rpx;
  }

  .course-card {
    flex-direction: column;
    min-height: auto;
  }

  .course-cover {
    width: 100%;
    height: 220rpx;
  }

  .meta-row.compact {
    margin-top: 12rpx;
  }
}
</style>
