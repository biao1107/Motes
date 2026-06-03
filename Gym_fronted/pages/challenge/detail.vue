<template>
  <view class="challenge-detail-page" v-if="loaded">
    <view class="hero-card">
      <image v-if="detail.coverImage" :src="detail.coverImage" class="hero-cover" mode="aspectFill"></image>
      <view v-else class="hero-cover placeholder-cover">
        <text class="placeholder-text">挑战</text>
      </view>

      <view class="hero-overlay">
        <view class="hero-badge">Challenge Detail</view>
        <text class="hero-title">{{ detail.challengeName || detail.title || detail.name }}</text>
        <text class="hero-desc">
          {{ detail.trainRequire || '查看挑战时间范围、参与状态和打卡进度，决定今天是否参与或继续完成。' }}
        </text>
      </view>
    </view>

    <view class="summary-card">
      <view class="summary-grid">
        <view class="summary-item">
          <text class="summary-label">挑战状态</text>
          <text class="summary-value">{{ statusText(detail.status) }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">挑战类型</text>
          <text class="summary-value">{{ isGroupChallenge ? '组内挑战' : '公开挑战' }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">开始日期</text>
          <text class="summary-value">{{ detail.startDate || '-' }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">结束日期</text>
          <text class="summary-value">{{ detail.endDate || '-' }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">最大人数</text>
          <text class="summary-value">{{ detail.maxMembers || '-' }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">参与状态</text>
          <text class="summary-value">{{ hasJoined ? '已参与' : '未参与' }}</text>
        </view>
      </view>
    </view>

    <view class="action-card">
      <view class="section-head">
        <view>
          <text class="section-title">挑战操作</text>
          <text class="section-subtitle">在这里完成参与、打卡和查看报告这些关键动作</text>
        </view>
      </view>

      <view class="action-row">
        <view v-if="!hasJoined" class="action-btn primary" :class="{ disabled: joining }" @tap="onJoin">
          <text class="action-btn-text">{{ joining ? '参与中...' : '参与挑战' }}</text>
        </view>
        <view v-else class="joined-pill">
          <text class="joined-pill-text">已参与挑战</text>
        </view>

        <view
          v-if="hasJoined && !isTrainingRelatedChallenge"
          class="action-btn secondary"
          :class="{ disabled: punching || (isGroupChallenge && !trainingCompleted) }"
          @tap="onPunch"
        >
          <text class="action-btn-text secondary-text">{{ punching ? '打卡中...' : '打卡' }}</text>
        </view>

        <view class="action-btn ghost" @tap="onViewReport">
          <text class="action-btn-text ghost-text">查看报告</text>
        </view>
      </view>

      <view v-if="hasJoined && isGroupChallenge && !trainingCompleted && !isTrainingRelatedChallenge" class="info-box warning">
        <text class="info-text">组内挑战需要先完成当天协同训练，才能进行打卡。</text>
        <text class="info-subtext">请先前往“协同训练”页面完成今日训练任务。</text>
      </view>

      <view v-if="isTrainingRelatedChallenge" class="info-box">
        <text class="info-text">这是一个训练关联挑战，完成训练计划后会自动计入进度。</text>
      </view>

      <view v-if="actionFileUrl" class="action-proof">
        <text class="proof-title">打卡凭证</text>
        <image :src="actionFileUrl" mode="aspectFill" class="proof-image" @tap="previewImage(actionFileUrl)"></image>
      </view>
    </view>

    <view class="report-card" v-if="report">
      <view class="section-head">
        <view>
          <text class="section-title">挑战报告</text>
          <text class="section-subtitle">{{ formatDateRange(report) }}</text>
        </view>
        <view class="status-tag">
          <text class="status-tag-text">已生成</text>
        </view>
      </view>

      <view class="report-stats" v-if="report.participants && report.participants.length > 0">
        <view class="report-stat">
          <text class="report-stat-value" :style="{ color: getRateColor(avgCompletionRate) }">{{ avgCompletionRate }}%</text>
          <text class="report-stat-label">平均完成率</text>
        </view>
        <view class="report-stat">
          <text class="report-stat-value highlight">{{ perfectCount }}</text>
          <text class="report-stat-label">全勤人数</text>
        </view>
        <view class="report-stat">
          <text class="report-stat-value">{{ totalPunchDays }}</text>
          <text class="report-stat-label">总打卡次数</text>
        </view>
      </view>

      <view class="report-info">
        <view class="report-info-row">
          <text class="report-info-label">参与人数</text>
          <text class="report-info-value">{{ report.participantCount || (report.participants && report.participants.length) || 0 }} 人</text>
        </view>
        <view class="report-info-row">
          <text class="report-info-label">挑战天数</text>
          <text class="report-info-value">{{ calculateTotalDays }} 天</text>
        </view>
      </view>

      <view class="ranking-card" v-if="report.participants && report.participants.length > 0">
        <text class="ranking-title">打卡排行榜</text>
        <view class="ranking-list">
          <view class="ranking-item" v-for="(item, index) in sortedParticipants" :key="index">
            <view class="ranking-rank">
              <text v-if="index === 0" class="rank-medal">🥇</text>
              <text v-else-if="index === 1" class="rank-medal">🥈</text>
              <text v-else-if="index === 2" class="rank-medal">🥉</text>
              <text v-else class="rank-num">{{ index + 1 }}</text>
            </view>

            <view class="ranking-user">
              <view class="user-avatar">{{ getAvatarText(item.userId) }}</view>
              <text class="user-name">用户 {{ item.userId }}</text>
              <image
                v-if="item.actionFile"
                class="punch-thumb"
                :src="item.actionFile"
                mode="aspectFill"
                @tap="previewImage(item.actionFile)"
              ></image>
            </view>

            <view class="ranking-days">
              <text class="days-value">{{ item.punchDays }}</text>
              <text class="days-unit">天</text>
            </view>

            <view class="ranking-rate">
              <view class="rate-bar">
                <view class="rate-fill" :style="{ width: item.completionRate + '%' }"></view>
              </view>
              <text class="rate-text">{{ item.completionRate }}%</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  apiChallengeDetail,
  apiChallengeJoin,
  apiChallengePunch,
  apiChallengeReport,
  apiUploadAction,
  apiGetFileUrl,
  apiCheckChallengeParticipation,
  apiGetTodayTraining
} from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

export default {
  data() {
    return {
      id: '',
      loaded: false,
      detail: {},
      report: null,
      actionFileUrl: '',
      isTrainingRelatedChallenge: false,
      joining: false,
      punching: false,
      hasJoined: false,
      trainingCompleted: false,
      trainingCheckInterval: null,
      isGroupChallenge: false
    };
  },
  onLoad(query) {
    this.id = query.id;
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadData();

    if (this.isGroupChallenge && this.hasJoined) {
      this.startTrainingCheckInterval();
    }
  },
  computed: {
    sortedParticipants() {
      if (!this.report || !this.report.participants) return [];
      return [...this.report.participants].sort((a, b) => {
        if (b.completionRate !== a.completionRate) {
          return b.completionRate - a.completionRate;
        }
        return b.punchDays - a.punchDays;
      });
    },
    avgCompletionRate() {
      if (!this.report || !this.report.participants || this.report.participants.length === 0) {
        return 0;
      }
      const total = this.report.participants.reduce((sum, participant) => sum + participant.completionRate, 0);
      return Math.round(total / this.report.participants.length);
    },
    perfectCount() {
      if (!this.report || !this.report.participants) return 0;
      return this.report.participants.filter((participant) => participant.completionRate >= 100).length;
    },
    totalPunchDays() {
      if (!this.report || !this.report.participants) return 0;
      return this.report.participants.reduce((sum, participant) => sum + participant.punchDays, 0);
    },
    calculateTotalDays() {
      if (!this.report || !this.report.startDate || !this.report.endDate) return 0;
      const start = new Date(this.report.startDate);
      const end = new Date(this.report.endDate);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  },
  methods: {
    formatDateRange(report) {
      if (!report) return '';
      const start = report.startDate || this.detail.startDate;
      const end = report.endDate || this.detail.endDate;
      if (!start || !end) return '';
      return `${start} 至 ${end}`;
    },
    getRateColor(rate) {
      if (rate >= 80) return '#52c41a';
      if (rate >= 60) return '#faad14';
      return '#ff4d4f';
    },
    previewImage(url) {
      if (!url) return;
      uni.previewImage({
        urls: [url],
        current: url
      });
    },
    getAvatarText(userId) {
      if (!userId) return '?';
      return userId.toString().slice(-2);
    },
    async loadData() {
      try {
        uni.showLoading({ title: '加载中...' });
        const res = await apiChallengeDetail(this.id);
        this.detail = res?.data || res || {};

        this.isTrainingRelatedChallenge = !!this.detail.trainingPlanId;
        this.isGroupChallenge = this.detail.groupId && this.detail.groupId > 0;

        await this.checkParticipation();
        await this.checkTrainingCompletion();

        if (this.isGroupChallenge && this.hasJoined) {
          this.startTrainingCheckInterval();
        }

        this.loaded = true;
        await this.loadPunchRecord();
        uni.hideLoading();
      } catch (error) {
        uni.hideLoading();
        console.error('加载挑战详情失败:', error);
        uni.showToast({ title: '加载失败', icon: 'none' });
        this.loaded = true;
      }
    },
    statusText(status) {
      return ['未开始', '进行中', '已结束'][status] || status || '未知';
    },
    async checkParticipation() {
      try {
        if (!requireLogin()) return;
        const res = await apiCheckChallengeParticipation(this.id);
        this.hasJoined = res?.data ?? res ?? false;
      } catch (error) {
        console.error('检查参与状态失败:', error);
        this.hasJoined = false;
      }
    },
    async loadPunchRecord() {
      try {
        if (!requireLogin()) return;
      } catch (error) {
        console.error('获取打卡记录失败:', error);
      }
    },
    async checkTrainingCompletion() {
      try {
        if (!this.isGroupChallenge) {
          this.trainingCompleted = true;
          return;
        }

        if (!requireLogin()) return;

        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')}`;

        const res = await apiGetTodayTraining();
        const todayTrainings = res?.data || res || [];
        const completedTraining = todayTrainings.some((record) => record.status === 1 && record.trainDate === date);

        this.trainingCompleted = completedTraining;
      } catch (error) {
        console.error('检查训练完成状态失败:', error);
        this.trainingCompleted = false;
      }
    },
    startTrainingCheckInterval() {
      if (this.trainingCheckInterval) {
        clearInterval(this.trainingCheckInterval);
      }

      this.trainingCheckInterval = setInterval(async () => {
        if (this.isGroupChallenge && this.hasJoined && !this.trainingCompleted) {
          await this.checkTrainingCompletion();
        }
      }, 30000);
    },
    stopTrainingCheckInterval() {
      if (this.trainingCheckInterval) {
        clearInterval(this.trainingCheckInterval);
        this.trainingCheckInterval = null;
      }
    },
    async onJoin() {
      if (this.joining) return;

      try {
        this.joining = true;
        if (!requireLogin()) {
          uni.showToast({ title: '请先登录', icon: 'none' });
          return;
        }

        uni.showLoading({ title: '参与中...' });
        await apiChallengeJoin({
          challengeId: this.id
        });
        uni.hideLoading();
        uni.showToast({ title: '已参与', icon: 'success' });
        await this.loadData();
      } catch (error) {
        uni.hideLoading();
        console.error('参与挑战失败:', error);
        if (error.message && error.message.includes('已参与该挑战')) {
          uni.showToast({ title: '您已参与该挑战', icon: 'none' });
        } else {
          uni.showToast({ title: error.errMsg || '参与失败，请重试', icon: 'none' });
        }
      } finally {
        this.joining = false;
      }
    },
    async onPunch() {
      if (this.punching) return;

      try {
        this.punching = true;
        uni.chooseImage({
          count: 1,
          sourceType: ['album', 'camera'],
          success: async (res) => {
            try {
              if (!requireLogin()) {
                uni.showToast({ title: '请先登录', icon: 'none' });
                return;
              }

              uni.showLoading({
                title: '上传中...'
              });
              const uploadRes = await apiUploadAction(res.tempFilePaths[0]);
              uni.hideLoading();
              const now = new Date();
              const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
                now.getDate()
              ).padStart(2, '0')}`;

              let objectName = '';
              if (uploadRes && typeof uploadRes === 'object') {
                if (uploadRes.data) {
                  objectName = typeof uploadRes.data === 'string' ? uploadRes.data : JSON.stringify(uploadRes.data);
                } else {
                  objectName = JSON.stringify(uploadRes);
                }
              } else {
                objectName = uploadRes;
              }

              let accessibleUrl = objectName;
              if (objectName) {
                const urlRes = await apiGetFileUrl({ objectName });
                accessibleUrl = urlRes.data || urlRes || objectName;
              }

              await apiChallengePunch({
                challengeId: this.id,
                date,
                actionFile: objectName
              });

              uni.showToast({ title: '打卡成功', icon: 'success' });
              this.actionFileUrl = accessibleUrl;
            } catch (error) {
              uni.hideLoading();
              console.error('打卡失败:', error);
              uni.showToast({ title: error.errMsg || '打卡失败，请重试', icon: 'none' });
            }
          },
          fail: () => {
            uni.showToast({ title: '取消打卡', icon: 'none' });
          }
        });
      } finally {
        this.punching = false;
      }
    },
    onViewReport() {
      uni.showLoading({ title: '加载中...' });
      apiChallengeReport(this.id)
        .then((res) => {
          uni.hideLoading();
          this.report = res || {};
          uni.showToast({ title: '加载成功', icon: 'success' });
        })
        .catch((error) => {
          uni.hideLoading();
          console.error('加载报告失败:', error);
          uni.showToast({ title: '加载失败', icon: 'none' });
        });
    },
    onUnload() {
      this.stopTrainingCheckInterval();
    }
  }
};
</script>

<style scoped>
.challenge-detail-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.summary-card,
.action-card,
.report-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
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
  color: rgba(255, 255, 255, 0.84);
}

.summary-card,
.action-card,
.report-card {
  padding: 30rpx 24rpx;
  margin-bottom: 20rpx;
}

.summary-grid,
.report-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-item,
.report-stat {
  padding: 20rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.summary-label,
.report-stat-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  color: #738198;
}

.summary-value,
.report-stat-value {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #172233;
}

.section-head {
  margin-bottom: 20rpx;
}

.section-title,
.ranking-title {
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

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.action-btn {
  min-width: 180rpx;
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.action-btn.secondary {
  border: 1rpx solid #cfd8ec;
  background: #ffffff;
}

.action-btn.ghost {
  background: #eef3ff;
}

.action-btn.disabled {
  opacity: 0.65;
}

.action-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.secondary-text {
  color: #3657ee;
}

.ghost-text {
  color: #3657ee;
}

.joined-pill {
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #eef8f2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.joined-pill-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #2f8a5c;
}

.info-box {
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 24rpx;
  background: #f4f7ff;
}

.info-box.warning {
  background: #fff5ea;
}

.info-text {
  display: block;
  font-size: 24rpx;
  line-height: 1.55;
  color: #172233;
}

.info-subtext {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #74829a;
}

.action-proof {
  margin-top: 18rpx;
}

.proof-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #172233;
}

.proof-image {
  width: 180rpx;
  height: 180rpx;
  border-radius: 22rpx;
}

.report-info {
  margin-top: 18rpx;
}

.report-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eef1f6;
}

.report-info-row:last-child {
  border-bottom: none;
}

.report-info-label {
  font-size: 24rpx;
  color: #738198;
}

.report-info-value {
  font-size: 26rpx;
  font-weight: 700;
  color: #172233;
}

.status-tag {
  display: inline-flex;
  height: 42rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  align-items: center;
  justify-content: center;
  background: #eef8f2;
}

.status-tag-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #2f8a5c;
}

.ranking-card {
  margin-top: 18rpx;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 14rpx;
}

.ranking-item {
  display: grid;
  grid-template-columns: 72rpx 1fr 120rpx 180rpx;
  gap: 12rpx;
  align-items: center;
  padding: 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.ranking-rank,
.ranking-days {
  text-align: center;
}

.rank-medal,
.rank-num,
.days-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #172233;
}

.days-unit,
.rate-text {
  font-size: 22rpx;
  color: #738198;
}

.ranking-user {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.user-avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
}

.user-name {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #172233;
}

.punch-thumb {
  width: 44rpx;
  height: 44rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
}

.rate-bar {
  width: 100%;
  height: 10rpx;
  border-radius: 999rpx;
  background: #dde4f2;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.rate-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #3658ef 0%, #6d82ff 100%);
}

@media (max-width: 750rpx) {
  .summary-grid,
  .report-stats {
    grid-template-columns: 1fr;
  }

  .ranking-item {
    grid-template-columns: 60rpx 1fr;
  }

  .ranking-days,
  .ranking-rate {
    grid-column: 2;
  }
}
</style>
