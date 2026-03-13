<template>
  <view class="fitness-home">
    <!-- 顶部渐变背景（固定定位，做视觉延伸） -->
    <view class="top-bg"></view>

    <!-- 主内容区（滚动容器，适配小屏手机） -->
    <scroll-view class="main-scroll" scroll-y="true" bounces="true">
      <view class="content-wrapper">
        <!-- 1. 个人信息+Logo区（融合设计，更紧凑） -->
        <view class="user-logo-section">
          <view class="logo-box">
            <image class="logo-img" src="/static/icons/page-style-logo.svg" mode="aspectFit" />
            <view class="logo-glow"></view>
          </view>
          <view class="user-greet">
            <text class="greet-text">嗨，{{ userProfile.nickname || '健身达人' }}</text>
            <text class="greet-subtext" v-if="userProfile.fitnessGoal">
              目标：{{ userProfile.fitnessGoal }}
            </text>
          </view>
          <view class="profile-avatar" @tap="showProfilePopup">
            <image 
              class="avatar-img" 
              :src="userProfile.avatar || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'" 
              mode="aspectFill"
            />
            <view class="avatar-mask"></view>
          </view>
        </view>

        <!-- 2. 核心数据卡片（视觉强化，突出健身成果） -->
        <view class="data-card">
          <view class="card-header">
            <text class="card-title">我的健身数据</text>
            <text class="card-update" @tap="refreshUserData">刷新</text>
          </view>
          <view class="data-list" v-if="!isLoading">
            <view class="data-item" v-for="(item, key) in dataList" :key="key">
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
            <view class="loading-dot" v-for="i in 3" :key="i" :style="{ delay: i*0.2 + 's' }"></view>
          </view>
        </view>

        <!-- 3. 核心功能入口（大按钮+图标，高辨识度） -->
        <view class="core-actions">
          <text class="action-title">快速开始</text>
          <view class="action-grid">
            <!-- 找搭子（核心功能，视觉突出） -->
            <view class="action-item primary" @tap="navigateTo('/pages/match/index')">
              <view class="action-icon">👥</view>
              <text class="action-text">找健身搭子</text>
            </view>
            <!-- 今日训练 -->
            <view class="action-item" @tap="navigateTo('/pages/training/today')">
              <view class="action-icon">🏋️</view>
              <text class="action-text">今日训练</text>
            </view>
            <!-- 健身挑战 -->
            <view class="action-item" @tap="navigateTo('/pages/challenge/index')">
              <view class="action-icon">🎯</view>
              <text class="action-text">健身挑战</text>
            </view>
            <!-- 数据统计 -->
            <view class="action-item" @tap="navigateTo('/pages/stat/index')">
              <view class="action-icon">📊</view>
              <text class="action-text">数据统计</text>
            </view>
          </view>
        </view>

        <!-- 4. 待办提醒（新增模块，贴合健身打卡场景） -->
        <view class="todo-section" v-if="hasTodo">
          <view class="todo-header">
            <text class="todo-title">今日待办</text>
            <text class="todo-tag">{{ todoCount }}件</text>
          </view>
          <view class="todo-item">
            <text class="todo-icon">🔔</text>
            <text class="todo-text">还有{{ todoCount }}个挑战今日未打卡</text>
          </view>
        </view>

        <!-- 5. 底部轻提示 -->
        <view class="footer-tip">
          <text class="tip-text">每一次坚持，都是向更好的自己靠近 💪</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部功能导航栏（市场级设计，替代原悬浮图标，更符合小程序习惯） -->
    <view class="bottom-nav">
      <view class="nav-item" @tap="navigateTo('/pages/course/index')">
        <view class="nav-icon">🎓</view>
        <text class="nav-text">课程</text>
      </view>
      <view class="nav-item active" @tap="navigateTo('/pages/group/messages')">
        <view class="nav-icon" :animation="msgAni">💬</view>
        <text class="nav-text">消息</text>
        <!-- 未读角标（核心交互，市场必备） -->
        <view class="badge" v-if="unreadCount > 0">{{ unreadCount }}</view>
      </view>
      <view class="nav-item main" @tap="navigateTo('/pages/training/index')">
        <view class="main-icon">
          <text class="main-icon-text">开始运动</text>
        </view>
      </view>
      <view class="nav-item" @tap="navigateTo('/pages/group/index')">
        <view class="nav-icon">🤝</view>
        <text class="nav-text">搭子组</text>
      </view>
      <view class="nav-item" @tap="showProfilePopup">
        <view class="nav-icon">👤</view>
        <text class="nav-text">我的</text>
      </view>
    </view>

    <!-- 个人档案弹窗（重构视觉，更精致） -->
    <view v-if="showProfile" class="popup-overlay" @tap="hideProfilePopup">
      <view class="profile-popup" @tap.stop>
        <view class="popup-close" @tap="hideProfilePopup">×</view>
        <view class="popup-avatar-box">
          <image 
            class="popup-avatar" 
            :src="userProfile.avatar || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'" 
            mode="aspectFill"
          />
          <text class="popup-name">{{ userProfile.nickname || '未设置昵称' }}</text>
          <text class="popup-level">健身等级：{{ userProfile.fitnessLevel || '入门' }}</text>
        </view>
        <view class="popup-info-list">
          <view class="info-row">
            <text class="info-label">训练天数</text>
            <text class="info-value">{{ stats.trainDays || 0 }}天</text>
          </view>
          <view class="info-row">
            <text class="info-label">健身搭子</text>
            <text class="info-value">{{ stats.partnersCount || 0 }}位</text>
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
          <button class="popup-btn" @tap="navigateToAndClose('/pages/user/profile')">编辑档案</button>
          <button class="popup-btn outline" @tap="navigateToAndClose('/pages/user/setting')">设置</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, getCurrentInstance } from 'vue';
// 引入原生 WebSocket（支持小程序）
import * as wsNative from '@/common/ws-native.js';
import { getUserIdFromToken, requireLogin } from '@/common/auth.js';
import { apiAcceptInvite, apiGetProfile, apiStatPersonal, apiStatHome, apiGetUnreadCount, apiGetTodoCount, apiGetInvitations } from '@/common/api.js';

// 响应式数据
const userProfile = ref({}); // 用户档案
const stats = ref({}); // 核心统计数据
const showProfile = ref(false); // 档案弹窗
const isLoading = ref(false); // 加载状态
const unreadCount = ref(0); // 消息未读数量
const inviteCount = ref(0); // 邀请未读数量
const msgAni = ref(null); // 消息动效
const hasTodo = ref(false); // 是否有今日待办
const todoCount = ref(0); // 待办数量
const dataList = ref([]); // 格式化后的核心数据
const messageListener = ref(null); // 消息监听器

// 使用 getCurrentInstance 获取页面实例
const instance = getCurrentInstance();

// 登录状态校验，未登录跳登录页
const checkLoginStatus = () => {
  const isLoggedIn = requireLogin();
  if (!isLoggedIn) {
    uni.redirectTo({ url: '/pages/auth/login' });
  }
};

// 刷新所有用户数据
const refreshUserData = async (userData = null) => {
  isLoading.value = true;
  try {
    let profileRes, statsRes;
    
    // 如果有传入的用户数据，优先使用
    if (userData) {
      profileRes = userData.profile || await apiGetProfile();
      statsRes = userData.stats || await apiStatHome();
    } else {
      // 并行请求，提升加载速度
      [profileRes, statsRes] = await Promise.all([
        apiGetProfile(),
        apiStatHome()
      ]);
    }
    
    // 格式化数据
    userProfile.value = profileRes?.data || profileRes || {};
    stats.value = statsRes?.data || statsRes || { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
    // 组装核心数据列表（用于页面渲染）
    formatDataList();
    
    // 如果不是首次加载，显示成功提示
    if (!userData) {
      uni.showToast({ title: '数据刷新成功', icon: 'success', duration: 1000 });
    }
  } catch (error) {
    console.error('数据刷新失败:', error);
    uni.showToast({ title: '数据加载失败', icon: 'none', duration: 1500 });
    // 兜底默认数据
    stats.value = { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
    formatDataList();
  } finally {
    isLoading.value = false;
  }
};

// 格式化核心数据列表，使用实际数据
const formatDataList = () => {
  dataList.value = [
    {
      value: stats.value.trainDays || 0,
      label: '累计训练',
      trend: null // 暂无趋势数据
    },
    {
      value: stats.value.partnersCount || 0,
      label: '健身搭子',
      trend: null // 暂无趋势数据
    },
    {
      value: stats.value.activeChallenges || 0,
      label: '进行中挑战',
      trend: null // 暂无趋势数据
    }
  ];
};

// 初始化WebSocket
const initWS = async () => {
  try {
    // 使用原生 WebSocket（支持小程序）
    await wsNative.initNativeWebSocket();
    // 设置消息回调
    wsNative.setMessageCallback(handleMessage);
    console.log('首页 WebSocket 初始化成功');
  } catch (e) {
    console.error('WS初始化失败:', e);
    // 不显示 toast，避免打扰用户
  }
};

// 处理实时消息
const handleMessage = (payload) => {
  const msgType = payload.type || payload.data?.type;
  switch (msgType) {
    case 'INVITATION':
      handleInvite(payload.data || payload);
      break;
    case 'CHAT':
      // 聊天消息，未读数+1，触发消息动效
      unreadCount.value += 1;
      msgShake();
      break;
    case 'NOTIFICATION':
      msgShake();
      uni.showToast({ title: payload.message || '收到新通知', icon: 'none' });
      break;
    default:
      msgShake();
      break;
  }
};

// 消息图标震动动效
const msgShake = () => {
  if (msgAni.value) {
    msgAni.value.scale(1.3).step();
    msgAni.value.scale(1).step();
  }
};

// 处理搭子邀请
const handleInvite = (payload) => {
  const fromName = payload.fromUserName || '未知好友';
  const groupName = payload.groupName || '健身搭子组';
  msgShake();
  uni.showModal({
    title: '新的搭子邀请',
    content: `${fromName}邀请你加入 ${groupName}，是否接受？`,
    confirmText: '接受',
    cancelText: '拒绝',
    async success(res) {
      if (res.confirm) {
        await acceptInvite(payload.fromUserId);
      }
    }
  });
};

// 接受搭子邀请
const acceptInvite = async (inviterId) => {
  if (!inviterId || !getUserIdFromToken()) return;
  try {
    await apiAcceptInvite({
      userId: getUserIdFromToken(),
      invitationId: inviterId
    });
    uni.showToast({ title: '已成为健身搭子', icon: 'success' });
    // 减少未读计数
    if (unreadCount.value > 0) unreadCount.value -= 1;
    if (inviteCount.value > 0) inviteCount.value -= 1;
    
    // 通知消息页面刷新（如果存在的话）
    try {
      // 获取当前页面栈
      const pages = getCurrentPages();
      const messagePage = pages.find(page => page.route === 'pages/group/messages');
      if (messagePage && messagePage.refreshInvitations) {
        messagePage.refreshInvitations();
      }
    } catch (e) {
      console.log('通知消息页面刷新失败:', e);
    }
    
    await refreshUserData(); // 刷新数据
    
    // 重新获取未读消息数，确保准确性
    await getUnreadCount();
  } catch (error) {
    console.error('接受邀请失败:', error);
    uni.showToast({ title: '操作失败', icon: 'none' });
  }
};

// 获取消息未读数量
const getUnreadCount = async () => {
  try {
    const userId = getUserIdFromToken();
    if (!userId) {
      unreadCount.value = 0;
      return;
    }
    console.log('开始获取用户', userId, '的未读消息数');
    
    // 获取聊天未读数
    const res = await apiGetUnreadCount(userId);
    const chatCount = res?.data || res || 0;
    console.log('获取到聊天未读数:', chatCount);
    
    // 获取邀请未读数
    try {
      const inviteRes = await apiGetInvitations();
      inviteCount.value = inviteRes?.data?.length || inviteRes?.length || 0;
      console.log('获取到邀请未读数:', inviteCount.value);
    } catch (e) {
      console.error('获取邀请列表失败:', e);
      inviteCount.value = 0;
    }
    
    // 聊天未读 + 邀请未读
    unreadCount.value = chatCount + inviteCount.value;
    console.log('总未读消息数:', unreadCount.value, '(聊天:', chatCount, '+ 邀请:', inviteCount.value, ')');
  } catch (error) {
    console.error('获取未读消息数失败:', error);
    unreadCount.value = 0;
  }
};

// 获取今日待办训练数量
const getTodoCount = async () => {
  try {
    const res = await apiGetTodoCount();
    const count = res?.data || res || 0;
    todoCount.value = count;
    hasTodo.value = count > 0;
  } catch (error) {
    console.error('获取待办数量失败:', error);
    todoCount.value = 0;
    hasTodo.value = false;
  }
};

// 页面导航
const navigateTo = (url) => {
  uni.navigateTo({ url });
};

// 显示档案弹窗
const showProfilePopup = () => {
  showProfile.value = true;
};

// 隐藏档案弹窗
const hideProfilePopup = () => {
  showProfile.value = false;
};

// 导航并关闭弹窗
const navigateToAndClose = (url) => {
  hideProfilePopup();
  navigateTo(url);
};

// 页面生命周期 - onReady (使用onMounted模拟)
onMounted(() => {
  // 初始化消息震动动画
  msgAni.value = uni.createAnimation({ duration: 200, timingFunction: 'ease' });
  // 检查登录状态
  checkLoginStatus();
  
  // 首先检查是否有登录页面传递过来的临时数据
  const tempUserData = uni.getStorageSync('temp_user_data');
  if (tempUserData) {
    // 使用临时数据快速填充页面
    userProfile.value = tempUserData.profile || {};
    stats.value = tempUserData.stats || { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
    formatDataList();
    
    // 清除临时数据
    uni.removeStorageSync('temp_user_data');
    
    // 然后在后台异步更新数据
    setTimeout(() => {
      refreshUserData();
    }, 100);
  } else {
    // 页面创建时立即加载数据，提高响应速度
    refreshUserData();
  }
  
  // 初始化WebSocket并绑定监听
  initWS();
  // 获取未读消息数
  getUnreadCount();
  // 获取待办训练数量
  getTodoCount();
});

// 页面生命周期函数定义（供uni-app调用）
const onShow = () => {
  // 页面显示时刷新数据，确保数据是最新的
  refreshUserData();
  // WebSocket可能在后台断开，重新检查连接
  initWS();
  // 获取未读消息数
  getUnreadCount();
  // 获取待办训练数量
  getTodoCount();
};

// 定义页面卸载时的处理
const onUnload = () => {
  // 清理原生 WebSocket 回调
  wsNative.setMessageCallback(null);
};

// 组件卸载前清理
onUnmounted(() => {
  // 页面隐藏移除消息监听，避免内存泄漏
  wsNative.setMessageCallback(null);
});

// 通过defineExpose暴露页面生命周期函数
defineExpose({
  onShow,
  onUnload
});
</script>

<style scoped>
/* 全局样式重置+规范 */
.fitness-home {
  width: 100%;
  height: 100vh;
  background-color: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
  overflow: hidden;
}
.main-scroll {
  width: 100%;
  height: 100vh;
  padding-bottom: 120rpx; /* 为底部导航预留空间 */
  box-sizing: border-box;
}
.content-wrapper {
  width: 100%;
  padding: 30rpx 24rpx;
  box-sizing: border-box;
}
/* 按钮hover反馈（小程序专属） */
.button-hover {
  transform: scale(0.96) !important;
  opacity: 0.9 !important;
}

/* 顶部渐变背景 */
.top-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 320rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  border-radius: 0 0 40rpx 40rpx;
  z-index: 1;
  box-shadow: 0 8rpx 30rpx rgba(99, 120, 246, 0.2);
}

/* 个人信息+Logo区 */
.user-logo-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  margin-bottom: 30rpx;
}
.logo-box {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 6rpx 20rpx rgba(99, 120, 246, 0.3);
}
.logo-img {
  width: 70rpx;
  height: 70rpx;
  z-index: 2;
}
.logo-glow {
  position: absolute;
  top: -5rpx;
  left: -5rpx;
  width: 110rpx;
  height: 110rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%);
  z-index: 1;
}
.user-greet {
  flex: 1;
  margin: 0 24rpx;
}
.greet-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
  display: block;
  margin-bottom: 8rpx;
}
.greet-subtext {
  font-size: 24rpx;
  color: rgba(255,255,255,0.9);
  display: block;
}
.profile-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.1);
}
.avatar-img {
  width: 100%;
  height: 100%;
}
.avatar-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(0deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%);
}

/* 核心数据卡片 */
.data-card {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx 24rpx;
  box-sizing: border-box;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
  position: relative;
  z-index: 2;
  margin-bottom: 30rpx;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1D2129;
}
.card-update {
  font-size: 24rpx;
  color: #6378f6;
  font-weight: 500;
  cursor: pointer;
}
.data-list {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.data-item {
  text-align: center;
  flex: 1;
}
.data-num {
  font-size: 48rpx;
  font-weight: 800;
  color: #6378f6;
  line-height: 1.2;
  display: block;
  margin-bottom: 8rpx;
}
.data-label {
  font-size: 22rpx;
  color: #86909C;
  display: block;
}
.data-trend {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 6rpx;
}
.trend-icon {
  font-size: 20rpx;
  margin-right: 4rpx;
}
.trend-icon.up {
  color: #00B42A;
}
.trend-icon.down {
  color: #F53F3F;
}
.trend-text {
  font-size: 20rpx;
  color: #86909C;
}
/* 数据加载动画 */
.data-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120rpx;
  gap: 16rpx;
}
.loading-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #6378f6;
  animation: loading 1.2s infinite ease-in-out;
}
@keyframes loading {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-16rpx);
    opacity: 1;
  }
}

/* 核心功能入口 */
.core-actions {
  width: 100%;
  position: relative;
  z-index: 2;
  margin-bottom: 30rpx;
}
.action-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1D2129;
  display: block;
  margin-bottom: 20rpx;
}
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.action-item {
  height: 180rpx;
  border-radius: 20rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.05);
  transition: all 0.2s ease;
  cursor: pointer;
}
.action-item.primary {
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  color: #fff;
}
.action-item.primary .action-text {
  color: #fff;
}
.action-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}
.action-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #1D2129;
}
.action-item:active {
  transform: scale(0.96);
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.08);
}

/* 今日待办 */
.todo-section {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
  position: relative;
  z-index: 2;
  margin-bottom: 40rpx;
}
.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.todo-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1D2129;
}
.todo-tag {
  font-size: 22rpx;
  color: #fff;
  background: #FF7D00;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}
.todo-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  cursor: pointer;
}
.todo-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}
.todo-text {
  flex: 1;
  font-size: 26rpx;
  color: #1D2129;
}
.todo-arrow {
  font-size: 24rpx;
  color: #86909C;
}

/* 底部轻提示 */
.footer-tip {
  width: 100%;
  text-align: center;
  position: relative;
  z-index: 2;
}
.tip-text {
  font-size: 24rpx;
  color: #86909C;
  line-height: 1.5;
}

/* 底部功能导航栏（市场级核心设计） */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100rpx;
  background: #fff;
  border-top: 1rpx solid #F2F3F5;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 99;
  box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.03);
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  position: relative;
  height: 100%;
  cursor: pointer;
}
.nav-item.active .nav-text {
  color: #6378f6;
  font-weight: 600;
}
.nav-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}
.nav-text {
  font-size: 20rpx;
  color: #86909C;
  transition: all 0.2s ease;
}
/* 未读角标 */
.badge {
  position: absolute;
  top: 10rpx;
  right: 20rpx;
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background: #F53F3F;
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
  box-sizing: border-box;
}
/* 中间主按钮（视觉突出，核心操作） */
.nav-item.main {
  flex: 0 0 140rpx;
  margin-top: -40rpx;
}
.main-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(99, 120, 246, 0.4);
  position: relative;
  animation: breath 3s infinite ease-in-out;
}
.main-icon-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  text-align: center;
}
/* 呼吸动效 */
@keyframes breath {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 8rpx 30rpx rgba(99, 120, 246, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 12rpx 40rpx rgba(99, 120, 246, 0.5);
  }
}

/* 档案弹窗遮罩 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 40rpx;
  box-sizing: border-box;
}
/* 档案弹窗主体 */
.profile-popup {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 30rpx;
  padding: 40rpx 30rpx;
  box-sizing: border-box;
  position: relative;
  animation: popupShow 0.3s ease-in-out;
}
@keyframes popupShow {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.popup-close {
  position: absolute;
  top: 30rpx;
  right: 30rpx;
  font-size: 40rpx;
  color: #86909C;
  cursor: pointer;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.popup-avatar-box {
  text-align: center;
  margin-bottom: 40rpx;
}
.popup-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 8rpx solid #F7F8FA;
  box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.1);
  margin-bottom: 20rpx;
}
.popup-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #1D2129;
  display: block;
  margin-bottom: 8rpx;
}
.popup-level {
  font-size: 24rpx;
  color: #86909C;
  display: block;
}
.popup-info-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 40rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #F2F3F5;
}
.info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.info-label {
  font-size: 28rpx;
  color: #4E5969;
  font-weight: 500;
}
.info-value {
  font-size: 28rpx;
  color: #1D2129;
}
.popup-btn-group {
  display: flex;
  gap: 20rpx;
}
.popup-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(99, 120, 246, 0.3);
}
.popup-btn.outline {
  background: #fff;
  color: #6378f6;
  border: 2rpx solid #6378f6;
  box-shadow: none;
}
.popup-btn:active {
  transform: scale(0.96);
}
</style>