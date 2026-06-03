<template>
  <view class="training-today-page">
    <view class="hero-card">
      <view class="hero-badge">Today Record</view>
      <text class="hero-title">把今天的训练记录汇总成一张可复盘的小看板</text>
      <text class="hero-desc">
        你可以快速看到今天做了几次训练、总共完成多少组或次数，以及哪些训练已经完成。
      </text>
      <view class="hero-date">{{ todayDate }}</view>
    </view>

    <view v-if="loading" class="loading-panel">
      <view class="loading-spinner"></view>
      <text class="loading-title">正在加载今日训练记录</text>
      <text class="loading-copy">准备同步今天的训练结果和完成情况</text>
    </view>

    <view v-else-if="trainRecords.length === 0" class="empty-card">
      <view class="empty-icon">今</view>
      <text class="empty-title">今天还没有训练记录</text>
      <text class="empty-desc">先去开始一次训练，回来这里就能看到今天的训练结果。</text>
    </view>

    <template v-else>
      <view class="summary-card">
        <view class="summary-grid">
          <view class="summary-item">
            <text class="summary-label">训练次数</text>
            <text class="summary-value">{{ trainRecords.length }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">总完成量</text>
            <text class="summary-value">{{ totalCompleted }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">已完成</text>
            <text class="summary-value">{{ completedCount }}</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view>
            <text class="section-title">今日训练明细</text>
            <text class="section-subtitle">每条记录都会展示所属组、完成量和创建时间</text>
          </view>
        </view>

        <view class="record-list">
          <view class="record-card" v-for="record in trainRecords" :key="record.id">
            <view class="record-head">
              <text class="record-group">{{ getGroupName(record.groupId) }}</text>
              <view class="status-badge" :class="'status-' + record.status">
                <text class="status-text">{{ getStatusText(record.status) }}</text>
              </view>
            </view>

            <view class="record-grid">
              <view class="record-item">
                <text class="record-label">训练日期</text>
                <text class="record-value">{{ formatDate(record.trainDate) }}</text>
              </view>
              <view class="record-item">
                <text class="record-label">完成次数</text>
                <text class="record-value highlight">{{ record.completeCount || 0 }}</text>
              </view>
              <view class="record-item" v-if="record.score">
                <text class="record-label">获得积分</text>
                <text class="record-value score">{{ record.score }}</text>
              </view>
            </view>

            <text class="record-time">创建于 {{ formatDateTime(record.createTime) }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { apiGetTodayTraining, apiMyGroups } from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

export default {
  data() {
    return {
      loading: false,
      trainRecords: [],
      groups: [],
      todayDate: ''
    };
  },
  computed: {
    totalCompleted() {
      return this.trainRecords.reduce((sum, record) => sum + (record.completeCount || 0), 0);
    },
    completedCount() {
      return this.trainRecords.filter((record) => record.status === 1).length;
    }
  },
  onLoad() {
    this.setTodayDate();
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadTodayTraining();
    this.loadGroups();
  },
  methods: {
    setTodayDate() {
      const now = new Date();
      this.todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
    },
    async loadTodayTraining() {
      this.loading = true;
      try {
        const res = await apiGetTodayTraining();
        this.trainRecords = res.data || res || [];
      } catch (error) {
        console.error('加载训练记录失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadGroups() {
      try {
        const res = await apiMyGroups();
        this.groups = res.data || res || [];
      } catch (error) {
        console.error('加载群组失败:', error);
      }
    },
    getGroupName(groupId) {
      const group = this.groups.find((item) => item.id === groupId);
      return group ? group.groupName : `群组 ${groupId}`;
    },
    getStatusText(status) {
      const statusMap = {
        0: '未完成',
        1: '已完成',
        2: '已放弃'
      };
      return statusMap[status] || '未知';
    },
    formatDate(dateStr) {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
          2,
          '0'
        )}`;
      } catch (error) {
        return dateStr;
      }
    },
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr) return '-';
      try {
        const date = new Date(dateTimeStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
          2,
          '0'
        )} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      } catch (error) {
        return dateTimeStr;
      }
    }
  }
};
</script>

<style scoped>
.training-today-page {
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
.empty-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-card {
  padding: 34rpx 30rpx;
  margin-bottom: 22rpx;
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

.hero-date {
  margin-top: 22rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.loading-panel,
.empty-card {
  min-height: 48vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.loading-spinner {
  width: 72rpx;
  height: 72rpx;
  margin-bottom: 20rpx;
  border: 6rpx solid rgba(61, 97, 242, 0.12);
  border-top-color: #4864f2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-title,
.empty-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1b2537;
}

.loading-copy,
.empty-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: #738198;
}

.empty-card,
.summary-card,
.section-card {
  padding: 30rpx 24rpx;
  margin-bottom: 20rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3354ef 0%, #6c81ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.summary-item {
  padding: 20rpx 14rpx;
  border-radius: 24rpx;
  text-align: center;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
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
  font-weight: 700;
  color: #172233;
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

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-card {
  padding: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.record-group {
  font-size: 28rpx;
  font-weight: 700;
  color: #172233;
}

.status-badge {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
}

.status-text {
  font-size: 21rpx;
  font-weight: 700;
}

.status-0 {
  background: #fff5ea;
}

.status-0 .status-text {
  color: #d67a18;
}

.status-1 {
  background: #eef8f2;
}

.status-1 .status-text {
  color: #2f8a5c;
}

.status-2 {
  background: #fff0ef;
}

.status-2 .status-text {
  color: #d05b4f;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.record-item {
  padding: 18rpx 12rpx;
  border-radius: 22rpx;
  text-align: center;
  background: #ffffff;
}

.record-label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 21rpx;
  color: #738198;
}

.record-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #172233;
}

.record-value.highlight {
  color: #4564f2;
}

.record-value.score {
  color: #f39a27;
}

.record-time {
  display: block;
  margin-top: 16rpx;
  font-size: 21rpx;
  color: #8b96aa;
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
