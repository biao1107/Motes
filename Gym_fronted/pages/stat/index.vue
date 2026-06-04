<template>
  <view class="stats-page">
    <view class="hero-card">
      <image class="hero-photo" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80" mode="aspectFill" />
      <view class="hero-badge">Training Insight</view>
      <text class="hero-title">把训练表现、组队协同和挑战完成度放到同一张看板里</text>
      <text class="hero-desc">
        这页更适合做复盘，而不是单纯看数字。你可以很快判断最近训练是否稳定、挑战是否推进、组内是否真正协同起来。
      </text>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">个人统计</text>
          <text class="section-subtitle">关注训练频次、完成率和协同训练参与度</text>
        </view>
      </view>

      <view v-if="!personal" class="empty-box">
        <text class="empty-text">暂无个人统计数据</text>
      </view>

      <view v-else class="stats-grid">
        <view class="stat-card primary">
          <text class="stat-label">总训练次数</text>
          <text class="stat-value">{{ personal.totalTrainCount }}</text>
        </view>
        <view class="stat-card success">
          <text class="stat-label">完成次数</text>
          <text class="stat-value">{{ personal.completedCount }}</text>
        </view>
        <view class="stat-card warning">
          <text class="stat-label">完成率</text>
          <text class="stat-value">{{ personal.completionRate }}</text>
        </view>
        <view class="stat-card cool">
          <text class="stat-label">平均分数</text>
          <text class="stat-value">{{ personal.avgScore }}</text>
        </view>
        <view class="stat-card full">
          <text class="stat-label">协同训练次数</text>
          <text class="stat-value">{{ personal.collaborativeCount }}</text>
          <text class="stat-note">你与搭子共同参与的训练次数</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">组内表现</text>
          <text class="section-subtitle">默认展示你第一个搭子组的协同结果</text>
        </view>
      </view>

      <view v-if="!group" class="empty-box">
        <text class="empty-text">暂无组内统计数据</text>
      </view>

      <view v-else class="stats-grid">
        <view class="stat-card primary">
          <text class="stat-label">成员数量</text>
          <text class="stat-value">{{ group.groupMemberCount }}</text>
        </view>
        <view class="stat-card neutral">
          <text class="stat-label">总训练次数</text>
          <text class="stat-value">{{ group.totalTrainCount }}</text>
        </view>
        <view class="stat-card success">
          <text class="stat-label">完成次数</text>
          <text class="stat-value">{{ group.completedCount }}</text>
        </view>
        <view class="stat-card warning">
          <text class="stat-label">完成率</text>
          <text class="stat-value">{{ group.completionRate }}</text>
        </view>
        <view class="stat-card full ranking-card">
          <text class="stat-label">成员贡献排名</text>
          <text class="stat-value ranking-text">{{ formatMemberRanking(group.memberRanking) }}</text>
          <text class="stat-note">当前展示前 3 名的训练贡献结果</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">挑战统计</text>
          <text class="section-subtitle">默认展示第一个挑战的参与与完成情况</text>
        </view>
      </view>

      <view v-if="!challenge" class="empty-box">
        <text class="empty-text">暂无挑战统计数据</text>
      </view>

      <view v-else class="stats-grid">
        <view class="stat-card primary">
          <text class="stat-label">参与人数</text>
          <text class="stat-value">{{ challenge.participantCount }}</text>
        </view>
        <view class="stat-card neutral">
          <text class="stat-label">总打卡天数</text>
          <text class="stat-value">{{ challenge.totalPunchDays }}</text>
        </view>
        <view class="stat-card cool">
          <text class="stat-label">平均打卡天数</text>
          <text class="stat-value">{{ challenge.avgPunchDays }}</text>
        </view>
        <view class="stat-card success">
          <text class="stat-label">完成人数</text>
          <text class="stat-value">{{ challenge.completedCount }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  apiStatPersonal as apiStatPersonalOld,
  apiStatGroup,
  apiStatChallenge,
  apiMyGroups,
  apiChallengeList
} from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

export default {
  data() {
    return {
      personal: null,
      group: null,
      challenge: null
    };
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        uni.showLoading({ title: '加载中...' });

        const personalRes = await apiStatPersonalOld();
        this.personal = personalRes?.data || personalRes || null;

        await this.loadGroupStats();
        await this.loadChallengeStats();

        uni.hideLoading();
      } catch (error) {
        uni.hideLoading();
        console.error('加载统计数据失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },
    async loadGroupStats() {
      try {
        const myGroupsRes = await apiMyGroups();
        const groups = myGroupsRes?.data || myGroupsRes || [];

        if (groups.length > 0 && groups[0]?.id) {
          const groupRes = await apiStatGroup({ groupId: groups[0].id });
          this.group = groupRes?.data || groupRes || null;
        } else {
          this.group = null;
        }
      } catch (error) {
        console.log('获取组统计失败:', error);
        this.group = null;
      }
    },
    async loadChallengeStats() {
      try {
        const challengeRes = await apiChallengeList();
        const challenges = challengeRes?.data || challengeRes || [];

        if (challenges.length > 0 && challenges[0]?.id) {
          const statsRes = await apiStatChallenge({ challengeId: challenges[0].id });
          this.challenge = statsRes?.data || statsRes || null;
        } else {
          this.challenge = null;
        }
      } catch (error) {
        console.log('获取挑战统计失败:', error);
        this.challenge = null;
      }
    },
    formatMemberRanking(ranking) {
      if (!ranking || typeof ranking !== 'object') {
        return '-';
      }

      const entries = Object.entries(ranking).sort(([, a], [, b]) => b - a);
      if (entries.length === 0) {
        return '-';
      }

      return entries
        .slice(0, 3)
        .map(([userId, count], index) => `TOP${index + 1} 用户${userId} · ${count}次`)
        .join(' / ');
    }
  }
};
</script>

<style scoped>
.stats-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.section-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-card {
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

.section-card {
  padding: 30rpx 24rpx;
  margin-bottom: 22rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.stat-card {
  padding: 22rpx 20rpx;
  border-radius: 26rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.stat-card.full {
  grid-column: 1 / -1;
}

.stat-card.primary {
  background: linear-gradient(150deg, #edf3ff 0%, #e8efff 100%);
}

.stat-card.success {
  background: linear-gradient(150deg, #edfbf5 0%, #e5f7ef 100%);
}

.stat-card.warning {
  background: linear-gradient(150deg, #fff7eb 0%, #fff1dd 100%);
}

.stat-card.cool {
  background: linear-gradient(150deg, #edf7ff 0%, #e6f2ff 100%);
}

.stat-card.neutral {
  background: linear-gradient(150deg, #f3f5fa 0%, #edf1f8 100%);
}

.stat-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 22rpx;
  color: #738198;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  line-height: 1.2;
  font-weight: 700;
  color: #172233;
}

.ranking-text {
  font-size: 26rpx;
  line-height: 1.6;
  word-break: break-all;
}

.stat-note {
  display: block;
  margin-top: 10rpx;
  font-size: 21rpx;
  line-height: 1.5;
  color: #8692a8;
}

.empty-box {
  padding: 42rpx 0 24rpx;
  text-align: center;
}

.empty-text {
  font-size: 25rpx;
  color: #7a869c;
}
</style>
