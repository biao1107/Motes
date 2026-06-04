<template>
  <view class="fitness-home">
    <view class="top-bg"></view>
    <image class="hero-bg-photo" src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=80" mode="aspectFill" />
    <view class="top-orb orb-left"></view>
    <view class="top-orb orb-right"></view>

    <scroll-view class="main-scroll" scroll-y="true" bounces="true">
      <view class="content-wrapper">
        <view class="user-logo-section">
          <view class="logo-box">
            <image class="logo-img" src="/static/icons/page-style-logo.svg" mode="aspectFit" />
            <view class="logo-glow"></view>
          </view>

          <view class="user-greet">
            <text class="greet-text">嗨，{{ userProfile.nickname || '健身达人' }}</text>
            <text class="greet-subtext">
              {{ userProfile.fitnessGoal ? `目标：${userProfile.fitnessGoal}` : '先设定你的训练目标，系统会给出更准的推荐' }}
            </text>
          </view>

          <view class="profile-avatar" @tap="showProfilePopup">
            <image class="avatar-img" :src="userProfile.avatar || defaultAvatar" mode="aspectFill" />
            <view class="avatar-mask"></view>
          </view>
        </view>

        <view class="hero-card">
          <view class="hero-copy">
            <text class="hero-eyebrow">今日重点</text>
            <text class="hero-title">{{ heroTitle }}</text>
            <text class="hero-desc">{{ heroDescription }}</text>
          </view>

          <view class="hero-actions">
            <view class="hero-primary-btn" @tap="navigateTo(primaryAction.url)">
              <image class="btn-icon" :src="primaryAction.icon" mode="aspectFit" />
              <text class="hero-primary-text">{{ primaryAction.label }}</text>
            </view>
          </view>

          <view class="hero-meta">
            <view class="hero-chip">
              <view class="hero-chip-head">
                <image class="hero-chip-icon" src="/static/icons/home/flame-white.svg" mode="aspectFit" />
                <text class="hero-chip-label">活跃挑战</text>
              </view>
              <text class="hero-chip-value">{{ stats.activeChallenges || 0 }}</text>
            </view>
            <view class="hero-chip">
              <view class="hero-chip-head">
                <image class="hero-chip-icon" src="/static/icons/home/message-white.svg" mode="aspectFit" />
                <text class="hero-chip-label">未读消息</text>
              </view>
              <text class="hero-chip-value">{{ unreadCount }}</text>
            </view>
          </view>

          <view class="hero-link-row">
            <view class="hero-link-wrap" @tap="navigateTo('/pages/match/index')">
              <image class="hero-link-icon" src="/static/icons/home/compass-white.svg" mode="aspectFit" />
              <text class="hero-link">查看推荐搭子</text>
            </view>
            <view class="hero-link-wrap subtle" @tap="navigateTo('/pages/group/index')">
              <image class="hero-link-icon" src="/static/icons/home/group-white.svg" mode="aspectFit" />
              <text class="hero-link subtle">查看搭子组</text>
            </view>
          </view>
        </view>

        <view class="data-card">
          <view class="card-header">
            <view class="card-header-copy">
              <text class="card-title">我的健身数据</text>
              <text class="card-subtitle">最近 30 天训练与社交概览</text>
            </view>
            <text class="card-update" @tap="handleManualRefresh">刷新</text>
          </view>

          <view class="data-list" v-if="!isLoading">
            <view class="data-item" v-for="item in dataList" :key="item.label">
              <view class="data-icon-wrap">
                <image class="data-icon" :src="item.icon" mode="aspectFit" />
              </view>
              <text class="data-num">{{ item.value }}</text>
              <text class="data-label">{{ item.label }}</text>
              <view class="data-trend" v-if="item.trend !== null">
                <text class="trend-icon" :class="item.trend > 0 ? 'up' : 'down'">
                  {{ item.trend > 0 ? '↑' : '↓' }}
                </text>
                <text class="trend-text">{{ Math.abs(item.trend) }}%</text>
              </view>
            </view>
          </view>

          <view class="data-loading" v-else>
            <view class="loading-dot" v-for="i in 3" :key="i"></view>
          </view>
        </view>

        <view class="core-actions">
          <view class="section-head">
            <text class="action-title">快速开始</text>
            <text class="section-caption">先做最常用的动作，把训练流程尽量缩短到一步进入</text>
          </view>

          <view class="action-grid">
            <view class="action-item primary" @tap="navigateTo('/pages/match/index')">
              <view class="action-icon">
                <image class="action-icon-image" src="/static/icons/home/group-white.svg" mode="aspectFit" />
              </view>
              <text class="action-text">找健身搭子</text>
              <text class="action-desc">按目标、时段和场景推荐更合适的训练伙伴</text>
            </view>

            <view class="action-item" @tap="navigateTo('/pages/training/today')">
              <view class="action-icon neutral">
                <image class="action-icon-image" src="/static/icons/home/dumbbell-blue.svg" mode="aspectFit" />
              </view>
              <text class="action-text">今日训练</text>
              <text class="action-desc">查看今天的训练记录与完成情况</text>
            </view>

            <view class="action-item" @tap="navigateTo('/pages/challenge/index')">
              <view class="action-icon warm">
                <image class="action-icon-image" src="/static/icons/home/trophy-orange.svg" mode="aspectFit" />
              </view>
              <text class="action-text">健身挑战</text>
              <text class="action-desc">参加公开挑战或组内打卡，保持训练节奏</text>
            </view>

            <view class="action-item" @tap="navigateTo('/pages/stat/index')">
              <view class="action-icon cool">
                <image class="action-icon-image" src="/static/icons/home/chart-cyan.svg" mode="aspectFit" />
              </view>
              <text class="action-text">数据统计</text>
              <text class="action-desc">复盘训练趋势、完成率和协同参与情况</text>
            </view>
          </view>
        </view>

        <view class="todo-section" v-if="hasTodo">
          <view class="todo-header">
            <text class="todo-title">今日待办</text>
            <text class="todo-tag">{{ todoCount }}件</text>
          </view>

          <view class="todo-item" @tap="navigateTo('/pages/challenge/index')">
            <view class="todo-icon-wrap">
              <text class="todo-icon">待</text>
            </view>
            <view class="todo-copy">
              <text class="todo-text">还有 {{ todoCount }} 个挑战今日未打卡</text>
              <text class="todo-subtext">现在去处理，保持连续训练记录</text>
            </view>
            <text class="todo-arrow">去完成</text>
          </view>
        </view>

        <view class="footer-tip">
          <text class="tip-text">每一次坚持，都会让你离更稳定的训练节奏更近一步。</text>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-nav">
      <view class="nav-item" @tap="navigateTo('/pages/course/index')">
        <view class="nav-icon">
          <image class="nav-icon-image" src="/static/icons/home/course-blue.svg" mode="aspectFit" />
        </view>
        <text class="nav-text">课程</text>
      </view>

      <view class="nav-item" @tap="navigateTo('/pages/group/messages')">
        <view class="nav-icon" :animation="msgAni">
          <image class="nav-icon-image" src="/static/icons/home/message-blue.svg" mode="aspectFit" />
        </view>
        <text class="nav-text">消息</text>
        <view class="badge" v-if="unreadCount > 0">{{ unreadCount }}</view>
      </view>

      <view class="nav-item main active" @tap="navigateTo('/pages/training/index')">
        <view class="main-icon" :class="{ urgent: hasTodo }">
          <image class="main-icon-image" src="/static/icons/home/play-white.svg" mode="aspectFit" />
          <text class="main-icon-text">开始</text>
        </view>
      </view>

      <view class="nav-item" @tap="navigateTo('/pages/group/index')">
        <view class="nav-icon">
          <image class="nav-icon-image" src="/static/icons/home/group-blue.svg" mode="aspectFit" />
        </view>
        <text class="nav-text">搭子组</text>
      </view>

      <view class="nav-item" @tap="showProfilePopup">
        <view class="nav-icon">
          <image class="nav-icon-image" src="/static/icons/home/profile-blue.svg" mode="aspectFit" />
        </view>
        <text class="nav-text">我的</text>
      </view>
    </view>

    <view v-if="showProfile" class="popup-overlay" @tap="hideProfilePopup">
      <view class="profile-popup" @tap.stop>
        <view class="popup-close" @tap="hideProfilePopup">×</view>

        <view class="popup-avatar-box">
          <image class="popup-avatar" :src="userProfile.avatar || defaultAvatar" mode="aspectFill" />
          <text class="popup-name">{{ userProfile.nickname || '未设置昵称' }}</text>
          <text class="popup-level">健身等级：{{ userProfile.fitnessLevel || '入门' }}</text>
        </view>

        <view class="popup-info-list">
          <view class="info-row">
            <text class="info-label">训练天数</text>
            <text class="info-value">{{ stats.trainDays || 0 }} 天</text>
          </view>
          <view class="info-row">
            <text class="info-label">健身搭子</text>
            <text class="info-value">{{ stats.partnersCount || 0 }} 位</text>
          </view>
          <view class="info-row">
            <text class="info-label">训练时间</text>
            <text class="info-value">{{ userProfile.trainTime || '未设置' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">训练场景</text>
            <text class="info-value">{{ userProfile.trainScene || '未设置' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">监督需求</text>
            <text class="info-value">{{ userProfile.superviseDemand || '未设置' }}</text>
          </view>
        </view>

        <view class="popup-btn-group">
          <view class="popup-btn" @tap="navigateToAndClose('/pages/user/profile')">编辑档案</view>
          <view class="popup-btn outline" @tap="navigateToAndClose('/pages/user/setting')">设置</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { onShow as onPageShow, onUnload as onPageUnload } from '@dcloudio/uni-app';
import * as wsNative from '@/common/ws-native.js';
import { getUserIdFromToken, requireLogin } from '@/common/auth.js';
import {
  apiAcceptInvite,
  apiGetInvitations,
  apiGetProfile,
  apiGetTodoCount,
  apiGetUnreadCount,
  apiGetUnreadDetail,
  apiStatHome
} from '@/common/api.js';

const defaultAvatar =
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';
const iconMap = {
  completeProfile: '/static/icons/home/profile-blue.svg',
  challenge: '/static/icons/home/trophy-blue.svg',
  training: '/static/icons/home/dumbbell-blue.svg',
  group: '/static/icons/home/group-blue.svg',
  match: '/static/icons/home/compass-blue.svg',
  trainDays: '/static/icons/home/calendar-blue.svg',
  partners: '/static/icons/home/group-blue.svg',
  stats: '/static/icons/home/chart-blue.svg'
};

const userProfile = ref({});
const stats = ref({
  trainDays: 0,
  partnersCount: 0,
  activeChallenges: 0
});
const showProfile = ref(false);
const isLoading = ref(false);
const unreadCount = ref(0);
const inviteCount = ref(0);
const msgAni = ref(null);
const hasTodo = ref(false);
const todoCount = ref(0);
const dataList = ref([]);
let unreadRefreshTimer = null;
const heroTitle = ref('开始今天的协同训练');
const heroDescription = ref('先约到合适的搭子，再把训练、打卡和反馈连成一个连续动作。');
const primaryAction = ref({
  label: '去开始训练',
  url: '/pages/training/index',
  icon: iconMap.training
});

const checkLoginStatus = () => {
  if (!requireLogin()) {
    uni.redirectTo({ url: '/pages/auth/login' });
    return false;
  }
  return true;
};

const updateHeroContent = () => {
  if (!userProfile.value.fitnessGoal) {
    heroTitle.value = '先完善你的训练档案';
    heroDescription.value = '补齐目标、时间和场景信息后，搭子推荐和挑战分发会更准确。';
    primaryAction.value = {
      label: '去完善档案',
      url: '/pages/user/profile',
      icon: iconMap.completeProfile
    };
    return;
  }

  if (hasTodo.value && todoCount.value > 0) {
    heroTitle.value = `今天还有 ${todoCount.value} 个挑战待完成`;
    heroDescription.value = '优先处理今日待办，更容易把训练节奏稳定下来。';
    primaryAction.value = {
      label: '去处理待办',
      url: '/pages/challenge/index',
      icon: iconMap.challenge
    };
    return;
  }

  if ((stats.value.activeChallenges || 0) > 0) {
    heroTitle.value = '保持当前挑战节奏';
    heroDescription.value = '你已经在进行挑战，继续上报训练和打卡，会更快形成正反馈。';
    primaryAction.value = {
      label: '继续训练',
      url: '/pages/training/index',
      icon: iconMap.training
    };
    return;
  }

  if ((stats.value.partnersCount || 0) > 0) {
    heroTitle.value = '和搭子保持训练连续性';
    heroDescription.value = '你已经建立了搭子关系，现在最重要的是把互动和训练形成固定节奏。';
    primaryAction.value = {
      label: '查看搭子组',
      url: '/pages/group/index',
      icon: iconMap.group
    };
    return;
  }

  heroTitle.value = '开始今天的协同训练';
  heroDescription.value = '先约到合适的搭子，再把训练、打卡和反馈连成一个连续动作。';
  primaryAction.value = {
    label: '去找搭子',
    url: '/pages/match/index',
    icon: iconMap.match
  };
};

const formatDataList = () => {
  dataList.value = [
    {
      value: stats.value.trainDays || 0,
      label: '累计训练',
      trend: null,
      icon: iconMap.trainDays
    },
    {
      value: stats.value.partnersCount || 0,
      label: '健身搭子',
      trend: null,
      icon: iconMap.partners
    },
    {
      value: stats.value.activeChallenges || 0,
      label: '进行挑战',
      trend: null,
      icon: iconMap.stats
    }
  ];

  updateHeroContent();
};

const refreshUserData = async ({ userData = null, silent = true } = {}) => {
  isLoading.value = true;

  try {
    let profileRes;
    let statsRes;

    if (userData) {
      profileRes = userData.profile || {};
      statsRes = userData.stats || {};
    } else {
      [profileRes, statsRes] = await Promise.all([apiGetProfile(), apiStatHome()]);
    }

    userProfile.value = profileRes?.data || profileRes || {};
    stats.value = statsRes?.data || statsRes || {
      trainDays: 0,
      partnersCount: 0,
      activeChallenges: 0
    };
    formatDataList();

    if (!silent) {
      uni.showToast({ title: '数据已刷新', icon: 'success', duration: 1000 });
    }
  } catch (error) {
    console.error('数据刷新失败:', error);
    stats.value = { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
    formatDataList();
    uni.showToast({ title: '数据加载失败', icon: 'none', duration: 1500 });
  } finally {
    isLoading.value = false;
  }
};

const getUnreadSummary = async () => {
  const userId = getUserIdFromToken();
  if (!userId) {
    unreadCount.value = 0;
    inviteCount.value = 0;
    return;
  }

  try {
    let chatCount = 0;
    try {
      const unreadDetail = await apiGetUnreadDetail(userId);
      if (Array.isArray(unreadDetail)) {
        chatCount = unreadDetail.reduce((sum, item) => sum + Number(item?.unreadCount || 0), 0);
      } else {
        const chatRes = await apiGetUnreadCount(userId);
        chatCount = Number(chatRes || 0);
      }
    } catch (detailError) {
      console.error('获取未读详情失败，回退到总数接口:', detailError);
      const chatRes = await apiGetUnreadCount(userId);
      chatCount = Number(chatRes || 0);
    }

    let invitations = 0;
    try {
      const inviteRes = await apiGetInvitations();
      invitations = Array.isArray(inviteRes) ? inviteRes.length : 0;
    } catch (error) {
      console.error('获取邀请列表失败:', error);
    }

    inviteCount.value = invitations;
    unreadCount.value = chatCount + invitations;
  } catch (error) {
    console.error('获取未读消息失败:', error);
    unreadCount.value = 0;
    inviteCount.value = 0;
  }
};

const getTodoSummary = async () => {
  try {
    const res = await apiGetTodoCount();
    const count = res?.data || res || 0;
    todoCount.value = count;
    hasTodo.value = count > 0;
    updateHeroContent();
  } catch (error) {
    console.error('获取待办数量失败:', error);
    todoCount.value = 0;
    hasTodo.value = false;
    updateHeroContent();
  }
};

const msgShake = () => {
  if (!msgAni.value) return;
  msgAni.value.scale(1.18).step({ duration: 140 });
  msgAni.value.scale(1).step({ duration: 140 });
};

const acceptInvite = async (inviterId) => {
  const userId = getUserIdFromToken();
  if (!inviterId || !userId) return;

  try {
    await apiAcceptInvite({
      userId,
      invitationId: inviterId
    });

    uni.showToast({ title: '已加入搭子组', icon: 'success', duration: 1200 });
    await Promise.all([refreshUserData(), getUnreadSummary(), getTodoSummary()]);
  } catch (error) {
    console.error('接受邀请失败:', error);
    uni.showToast({ title: '操作失败，请稍后重试', icon: 'none', duration: 1500 });
  }
};

const handleInvite = (payload) => {
  const fromName = payload.fromUserName || '你的好友';
  const groupName = payload.groupName || '健身搭子组';

  msgShake();
  getUnreadSummary();
  uni.showModal({
    title: '新的搭子邀请',
    content: `${fromName} 邀请你加入 ${groupName}，是否接受？`,
    confirmText: '接受',
    cancelText: '稍后',
    async success(res) {
      if (res.confirm) {
        await acceptInvite(payload.fromUserId);
      }
    }
  });
};

const handleMessage = (payload) => {
  const msgType = payload.type || payload.data?.type;

  switch (msgType) {
    case 'INVITATION':
      handleInvite(payload.data || payload);
      break;
    case 'CHAT':
    case 'CHAT_MESSAGE':
      msgShake();
      getUnreadSummary();
      break;
    case 'NOTIFICATION':
      msgShake();
      uni.showToast({
        title: payload.message || '收到新的通知',
        icon: 'none',
        duration: 1200
      });
      break;
    default:
      break;
  }
};

const initWS = async () => {
  try {
    await wsNative.initNativeWebSocket();
    wsNative.setMessageCallback(handleMessage);
  } catch (error) {
    console.error('首页 WebSocket 初始化失败:', error);
  }
};

const navigateTo = (url) => {
  uni.navigateTo({ url });
};

const navigateToAndClose = (url) => {
  showProfile.value = false;
  navigateTo(url);
};

const showProfilePopup = () => {
  showProfile.value = true;
};

const hideProfilePopup = () => {
  showProfile.value = false;
};

const handleManualRefresh = async () => {
  await Promise.all([
    refreshUserData({ silent: false }),
    getUnreadSummary(),
    getTodoSummary()
  ]);
};

onMounted(() => {
  msgAni.value = uni.createAnimation({ duration: 200, timingFunction: 'ease' });
  uni.$on('refresh-home-unread', () => {
    getUnreadSummary();
    unreadRefreshTimer && clearTimeout(unreadRefreshTimer);
    unreadRefreshTimer = setTimeout(() => {
      getUnreadSummary();
    }, 600);
  });

  if (!checkLoginStatus()) {
    return;
  }

  const tempUserData = uni.getStorageSync('temp_user_data');
  if (tempUserData) {
    userProfile.value = tempUserData.profile || {};
    stats.value = tempUserData.stats || {
      trainDays: 0,
      partnersCount: 0,
      activeChallenges: 0
    };
    formatDataList();
    uni.removeStorageSync('temp_user_data');

    setTimeout(() => {
      refreshUserData();
    }, 120);
  } else {
    refreshUserData();
  }

  initWS();
  getUnreadSummary();
  getTodoSummary();
});

onPageShow(() => {
  if (!requireLogin()) return;
  refreshUserData();
  initWS();
  getUnreadSummary();
  getTodoSummary();
});

onPageUnload(() => {
  wsNative.setMessageCallback(null);
});

onUnmounted(() => {
  wsNative.setMessageCallback(null);
  unreadRefreshTimer && clearTimeout(unreadRefreshTimer);
  uni.$off('refresh-home-unread');
});
</script>

<style scoped>
.fitness-home {
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.15), transparent 28%),
    linear-gradient(180deg, #eff3ff 0%, #f7f8fc 42%, #f4f6fb 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  position: relative;
  overflow: hidden;
}

.top-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 368rpx;
  background: linear-gradient(140deg, #1737b6 0%, #4e69f6 46%, #7c93ff 100%);
  border-radius: 0 0 44rpx 44rpx;
  z-index: 1;
  box-shadow: 0 16rpx 42rpx rgba(38, 68, 189, 0.18);
}

.hero-bg-photo {
  position: fixed;
  z-index: 1;
  pointer-events: none;
  top: 0;
  left: 0;
  width: 100%;
  height: 368rpx;
  opacity: 0.12;
}

.top-orb {
  position: fixed;
  z-index: 1;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(8rpx);
}

.orb-left {
  top: 54rpx;
  left: -34rpx;
  width: 140rpx;
  height: 140rpx;
  background: rgba(255, 255, 255, 0.12);
}

.orb-right {
  top: 118rpx;
  right: -26rpx;
  width: 180rpx;
  height: 180rpx;
  background: rgba(187, 215, 255, 0.2);
}

.main-scroll {
  width: 100%;
  height: 100vh;
}

.content-wrapper {
  position: relative;
  z-index: 2;
  padding: 24rpx 24rpx 176rpx;
  box-sizing: border-box;
}

.user-logo-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.logo-box {
  width: 96rpx;
  height: 96rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.16);
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 12rpx 32rpx rgba(13, 28, 95, 0.24);
  backdrop-filter: blur(12rpx);
}

.logo-img {
  width: 62rpx;
  height: 62rpx;
  position: relative;
  z-index: 2;
}

.logo-glow {
  position: absolute;
  inset: 0;
  border-radius: 26rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0));
}

.user-greet {
  flex: 1;
  margin: 0 24rpx;
}

.greet-text {
  display: block;
  margin-bottom: 8rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5rpx;
}

.greet-subtext {
  display: block;
  font-size: 24rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.84);
}

.profile-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  border: 4rpx solid rgba(255, 255, 255, 0.74);
  box-shadow: 0 8rpx 24rpx rgba(10, 21, 71, 0.18);
}

.avatar-img,
.popup-avatar {
  width: 100%;
  height: 100%;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(5, 13, 51, 0.22));
}

.hero-card,
.data-card,
.todo-section {
  position: relative;
  overflow: hidden;
  border-radius: 30rpx;
  margin-bottom: 26rpx;
}

.hero-card {
  padding: 28rpx 28rpx 26rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 14rpx 32rpx rgba(17, 33, 97, 0.14);
  backdrop-filter: blur(18rpx);
}

.hero-copy {
  margin-bottom: 22rpx;
}

.hero-eyebrow {
  display: inline-block;
  margin-bottom: 12rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.12);
}

.hero-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.24;
  color: #ffffff;
}

.hero-desc {
  display: block;
  max-width: 90%;
  font-size: 24rpx;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.82);
}

.hero-actions {
  display: block;
  margin-bottom: 18rpx;
}

.hero-primary-btn,
.popup-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-primary-btn {
  height: 84rpx;
  border-radius: 999rpx;
}

.hero-primary-btn {
  gap: 10rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 20rpx rgba(10, 21, 71, 0.1);
}

.btn-icon {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

.hero-primary-text {
  font-size: 27rpx;
  font-weight: 700;
  color: #2340c3;
}

.hero-meta {
  display: flex;
  gap: 14rpx;
}

.hero-chip {
  flex: 1;
  padding: 20rpx 22rpx;
  border-radius: 22rpx;
  background: rgba(6, 19, 79, 0.16);
}

.hero-chip-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.hero-chip-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.hero-chip-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}

.hero-chip-value {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.hero-link-row {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-top: 18rpx;
}

.hero-link-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.hero-link-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
  opacity: 0.92;
}

.hero-link {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

.hero-link.subtle {
  color: rgba(255, 255, 255, 0.72);
}

.data-card,
.todo-section {
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 28rpx rgba(28, 46, 110, 0.07);
}

.data-card {
  padding: 26rpx 22rpx;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
}

.card-header-copy {
  flex: 1;
}

.card-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #182338;
}

.card-subtitle {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #7a869c;
}

.card-update {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  font-size: 22rpx;
  font-weight: 600;
  color: #4565f6;
}

.data-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.data-item {
  padding: 18rpx 10rpx;
  border-radius: 20rpx;
  text-align: center;
  background: linear-gradient(180deg, #f8faff 0%, #f3f6ff 100%);
}

.data-icon-wrap {
  width: 52rpx;
  height: 52rpx;
  margin: 0 auto 10rpx;
  border-radius: 16rpx;
  background: #eef3ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.data-icon {
  width: 28rpx;
  height: 28rpx;
}

.data-num {
  display: block;
  margin-bottom: 8rpx;
  font-size: 48rpx;
  font-weight: 800;
  line-height: 1.1;
  color: #3152ef;
}

.data-label {
  display: block;
  font-size: 22rpx;
  color: #6e7a90;
}

.data-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}

.trend-icon,
.trend-text {
  font-size: 20rpx;
}

.trend-icon {
  margin-right: 4rpx;
}

.trend-icon.up {
  color: #1fa45a;
}

.trend-icon.down {
  color: #e55045;
}

.trend-text {
  color: #7a869c;
}

.data-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14rpx;
  height: 138rpx;
}

.loading-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #5070f7;
  animation: loading 1.1s infinite ease-in-out;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.core-actions {
  margin-bottom: 26rpx;
}

.section-head {
  margin-bottom: 16rpx;
}

.action-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #182338;
}

.section-caption {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #7a869c;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.action-item {
  min-height: 204rpx;
  padding: 22rpx 20rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12rpx 24rpx rgba(24, 35, 56, 0.06);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.action-item.primary {
  background: linear-gradient(160deg, #405ff2 0%, #6b7cff 100%);
  color: #ffffff;
}

.action-item.primary .action-text,
.action-item.primary .action-desc {
  color: #ffffff;
}

.action-icon {
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 18rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon-image {
  width: 32rpx;
  height: 32rpx;
}

.action-item:not(.primary) .action-icon {
  background: #eef3ff;
  color: #3050ea;
}

.action-icon.neutral {
  color: #3050ea;
}

.action-icon.warm {
  background: #fff3e8;
  color: #ea6a1a;
}

.action-icon.cool {
  background: #e8f8ff;
  color: #0d8ccf;
}

.action-text {
  display: block;
  margin-bottom: 10rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #182338;
}

.action-desc {
  font-size: 22rpx;
  line-height: 1.55;
  color: #7a869c;
}

.todo-section {
  padding: 24rpx;
}

.todo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.todo-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #182338;
}

.todo-tag {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #ff8f1f;
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.todo-item {
  display: flex;
  align-items: center;
  border-radius: 24rpx;
  padding: 18rpx 18rpx 18rpx 10rpx;
  background: linear-gradient(180deg, #fff7ec 0%, #fffdf9 100%);
}

.todo-icon-wrap {
  width: 78rpx;
  height: 78rpx;
  border-radius: 24rpx;
  background: #ffe1bc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.todo-icon {
  font-size: 28rpx;
  font-weight: 700;
  color: #cf6a11;
}

.todo-copy {
  flex: 1;
  min-width: 0;
}

.todo-text {
  display: block;
  margin-bottom: 6rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #182338;
}

.todo-subtext {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #8d774d;
}

.todo-arrow {
  margin-left: 16rpx;
  font-size: 23rpx;
  font-weight: 700;
  color: #cf6a11;
}

.footer-tip {
  padding: 28rpx 22rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
}

.tip-text {
  font-size: 24rpx;
  line-height: 1.7;
  color: #7a869c;
}

.bottom-nav {
  position: fixed;
  left: 18rpx;
  right: 18rpx;
  bottom: 18rpx;
  height: 108rpx;
  padding: 0 8rpx calc(env(safe-area-inset-bottom, 0) + 4rpx);
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 14rpx 30rpx rgba(21, 35, 95, 0.13);
  display: flex;
  align-items: center;
  z-index: 99;
  backdrop-filter: blur(18rpx);
}

.nav-item {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.nav-item.active .nav-text {
  color: #2e4ee9;
  font-weight: 700;
}

.nav-icon {
  width: 42rpx;
  height: 42rpx;
  margin-bottom: 8rpx;
  border-radius: 14rpx;
  background: #eef3ff;
  color: #3152ef;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon-image {
  width: 24rpx;
  height: 24rpx;
}

.nav-text {
  font-size: 20rpx;
  color: #7a869c;
}

.nav-item.main {
  flex: 0 0 138rpx;
  margin-top: -28rpx;
}

.main-icon {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(160deg, #3558ef 0%, #7084ff 100%);
  box-shadow: 0 12rpx 26rpx rgba(48, 80, 234, 0.24);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.main-icon-image {
  width: 30rpx;
  height: 30rpx;
  margin-bottom: 6rpx;
}

.main-icon.urgent {
  animation: breath 3s infinite ease-in-out;
  box-shadow: 0 16rpx 30rpx rgba(48, 80, 234, 0.3);
}

.main-icon-text {
  width: auto;
  font-size: 20rpx;
  line-height: 1.1;
  text-align: center;
  font-weight: 700;
  color: #ffffff;
}

.badge {
  position: absolute;
  top: 12rpx;
  right: 16rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  background: #ef4b4b;
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-overlay {
  position: fixed;
  inset: 0;
  padding: 36rpx;
  background: rgba(10, 16, 44, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.profile-popup {
  width: 100%;
  max-width: 620rpx;
  border-radius: 34rpx;
  padding: 40rpx 30rpx 30rpx;
  box-sizing: border-box;
  background: #ffffff;
  box-shadow: 0 24rpx 54rpx rgba(16, 23, 56, 0.18);
  position: relative;
  animation: popupShow 0.22s ease-out;
}

.popup-close {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #f2f5fb;
  color: #6f7b8f;
  font-size: 38rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-avatar-box {
  text-align: center;
  margin-bottom: 34rpx;
}

.popup-avatar {
  width: 168rpx;
  height: 168rpx;
  margin: 0 auto 18rpx;
  border-radius: 50%;
  border: 8rpx solid #edf2ff;
  box-shadow: 0 14rpx 34rpx rgba(41, 62, 141, 0.12);
}

.popup-name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #182338;
}

.popup-level {
  display: block;
  font-size: 24rpx;
  color: #7a869c;
}

.popup-info-list {
  margin-bottom: 28rpx;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #eef1f6;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 27rpx;
  color: #516075;
}

.info-value {
  font-size: 27rpx;
  font-weight: 600;
  color: #182338;
}

.popup-btn-group {
  display: flex;
  gap: 18rpx;
}

.popup-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  background: linear-gradient(160deg, #3558ef 0%, #7084ff 100%);
  color: #ffffff;
  font-size: 27rpx;
  font-weight: 700;
  box-shadow: 0 12rpx 28rpx rgba(48, 80, 234, 0.26);
}

.popup-btn.outline {
  background: #ffffff;
  color: #3558ef;
  border: 2rpx solid #3558ef;
  box-shadow: none;
}

@keyframes loading {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.55;
  }

  50% {
    transform: translateY(-12rpx);
    opacity: 1;
  }
}

@keyframes breath {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 18rpx 38rpx rgba(48, 80, 234, 0.34);
  }

  50% {
    transform: scale(1.04);
    box-shadow: 0 22rpx 44rpx rgba(48, 80, 234, 0.42);
  }
}

@keyframes popupShow {
  from {
    opacity: 0;
    transform: translateY(20rpx) scale(0.97);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
