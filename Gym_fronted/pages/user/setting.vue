<template>
  <view class="setting-page">
    <!-- 顶部渐变背景（视觉统一，品牌延伸） -->
    <view class="page-top-bg"></view>

    <!-- 主内容滚动容器（适配小屏/全面屏） -->
    <scroll-view class="main-scroll" scroll-y="true" bounces="true">
      <view class="content-wrapper">
        <!-- 页面标题区 -->
        <view class="page-header" v-if="!isMini">
          <text class="page-title">个人设置</text>
          <text class="page-desc">管理你的账号信息与登录状态</text>
        </view>

        <!-- 1. 用户信息设置卡片（轻玻璃拟态，核心模块） -->
        <view class="setting-card">
          <!-- 头像设置 -->
          <view class="setting-item" @tap="selectAvatar">
            <text class="item-label">头像</text>
            <view class="avatar-wrap">
              <image v-if="form.avatar" :src="form.avatar" class="avatar-img" mode="aspectFill" />
              <view v-else class="avatar-initial">
                <text class="initial-text">{{ getInitial(form.nickname) }}</text>
              </view>
              <text class="item-arrow">›</text>
            </view>
          </view>

          <view class="divider"></view>

          <!-- 用户名设置 -->
          <view class="setting-item">
            <text class="item-label">用户名</text>
            <view class="input-wrap">
              <input 
                class="nickname-input" 
                v-model="form.nickname" 
                placeholder="请输入你的用户名"
                placeholder-class="input-placeholder"
              />
              <text class="item-arrow">›</text>
            </view>
          </view>

          <view class="divider"></view>

          <!-- 手机号（仅展示） -->
          <view class="setting-item">
            <text class="item-label">手机号</text>
            <view class="phone-wrap">
              <text class="phone-text">{{ form.phone || '未绑定' }}</text>
              <text class="item-arrow" v-if="!form.phone">›</text>
            </view>
          </view>
        </view>

        <!-- 2. 退出登录（视觉区分，警示色） -->
        <view class="logout-wrap">
          <button class="logout-btn" @tap="onLogout" hover-class="btn-hover">
            <text class="logout-icon">🚪</text>
            <text class="logout-text">退出登录</text>
          </button>
        </view>
        
        <!-- 3. 消息状态调试 -->
        <view class="logout-wrap">
          <button class="logout-btn" @tap="goToDebug" hover-class="btn-hover">
            <text class="logout-icon">🔧</text>
            <text class="logout-text">消息状态调试</text>
          </button>
        </view>

        <!-- 3. 保存按钮（视觉焦点，呼吸动效） -->
        <view class="save-btn-wrap">
          <button class="save-primary-btn" @tap="onSave" hover-class="btn-hover">
            <text class="save-text">💾 保存设置</text>
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiGetProfile, apiUpdateProfile, apiUploadAvatar, apiGetFileUrl } from '@/common/api.js';
import { requireLogin, clearToken } from '@/common/auth.js';

// 响应式数据
const form = ref({
  nickname: '',
  avatar: '',
  phone: ''
});
const currentProfileData = ref(null);
const isMini = ref(false); // 适配小程序胶囊栏样式，可根据需求调整

// 获取用户名首字母作为默认头像
const getInitial = (nickname) => {
  if (!nickname || !nickname.trim()) return '?';
  return nickname.trim().charAt(0).toUpperCase();
};

// 加载用户信息
const loadData = async () => {
  try {
    uni.showLoading({ title: '加载中...', mask: true });
    const data = await apiGetProfile();
    form.value = {
      nickname: data.nickname || '',
      avatar: data.avatar || '',
      phone: data.phone || ''
    };
    // 保存原始档案数据，用于更新时保持必需字段
    currentProfileData.value = data;
  } catch (e) {
    console.error('加载设置失败:', e);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// 保存设置
const onSave = async () => {
  const nickname = form.value.nickname.trim();
  if (!nickname) {
    uni.showToast({ title: '请输入有效的用户名', icon: 'none', duration: 2000 });
    return;
  }
  try {
    uni.showLoading({ title: '保存中...', mask: true });
    // 保存设置时需要包含所有必需的档案信息
    const profileData = {
      nickname: nickname,
      avatar: form.value.avatar,
      // 使用当前表单中的档案信息，如果不存在则使用空字符串
      fitnessGoal: currentProfileData.value?.fitnessGoal || '',
      trainTime: currentProfileData.value?.trainTime || '',
      trainScene: currentProfileData.value?.trainScene || '',
      superviseDemand: currentProfileData.value?.superviseDemand || '',
      fitnessLevel: currentProfileData.value?.fitnessLevel || ''
    };
    await apiUpdateProfile(profileData);
    uni.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
    // 延迟返回，保证用户看到成功提示
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e) {
    console.error('保存设置失败:', e);
    uni.showToast({ title: '保存失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// 退出登录（确认弹窗）
const onLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '退出后将需要重新登录，确定吗？',
    confirmText: '退出',
    cancelText: '取消',
    confirmColor: '#F53F3F',
    success: (res) => {
      if (res.confirm) {
        clearToken();
        uni.reLaunch({ url: '/pages/auth/login' });
      }
    }
  });
};

// 跳转到消息状态调试页面
const goToDebug = () => {
  uni.navigateTo({
    url: '/pages/user/debug'
  });
};

// 选择并上传头像
const selectAvatar = () => {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    sizeType: ['original', 'compressed'], // 支持压缩，提升上传速度
    success: async (res) => {
      try {
        uni.showLoading({ title: '上传中...', mask: true });
        const uploadRes = await apiUploadAvatar(res.tempFilePaths[0]);
        // 解析上传响应，获取头像URL
        let avatarUrl = '';
        if (uploadRes && typeof uploadRes === 'object') {
          avatarUrl = uploadRes.data ? (typeof uploadRes.data === 'string' ? uploadRes.data : uploadRes.data.url || uploadRes.data) : JSON.stringify(uploadRes);
        } else {
          avatarUrl = uploadRes || '';
        }
        
        if (avatarUrl) {
          form.value.avatar = avatarUrl;
          uni.showToast({ title: '头像更新成功', icon: 'success' });
        } else {
          throw new Error('上传响应中未包含有效的URL');
        }
      } catch (e) {
        console.error('头像上传失败:', e);
        uni.showToast({ title: e.errMsg || '上传失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    fail: () => {
      uni.showToast({ title: '取消选择', icon: 'none', duration: 1000 });
    }
  });
};

// 页面加载时执行
onMounted(() => {
  if (!requireLogin()) return;
  loadData();
  // 适配小程序胶囊栏，可选：隐藏原生标题时设为true
  // isMini.value = true;
});

// 页面生命周期函数
const onLoad = () => {
  if (!requireLogin()) return;
  loadData();
  // 适配小程序胶囊栏，可选：隐藏原生标题时设为true
  // isMini.value = true;
};

// 通过defineExpose暴露页面生命周期函数和方法给uni-app系统
defineExpose({
  onLoad
});
</script>

<style scoped>
/* 页面全局样式：统一背景、字体，适配全屏 */
.setting-page {
  width: 100%;
  height: 100vh;
  background-color: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
  overflow: hidden;
}
/* 滚动容器：适配全屏，预留底部操作空间 */
.main-scroll {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  padding-bottom: 40rpx;
}
.content-wrapper {
  width: 100%;
  padding: 30rpx 24rpx;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}
/* 全局按钮点击反馈：小程序专属，统一缩放+降透 */
.btn-hover {
  transform: scale(0.98) !important;
  opacity: 0.95 !important;
}

/* 顶部渐变背景：和首页/档案页视觉统一，品牌化设计 */
.page-top-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 180rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  border-radius: 0 0 40rpx 40rpx;
  z-index: 1;
  box-shadow: 0 8rpx 30rpx rgba(99, 120, 246, 0.2);
}

/* 页面标题区：渐变背景上的白色文字，和其他页面呼应 */
.page-header {
  margin-bottom: 30rpx;
}
.page-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  display: block;
  margin-bottom: 8rpx;
}
.page-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
  line-height: 1.5;
}

/* 设置卡片：轻玻璃拟态+微阴影，和其他页面卡片质感统一 */
.setting-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 40rpx;
  overflow: hidden;
}
/* 设置项：统一内边距，flex布局适配 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 30rpx;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
/* 设置项轻触背景：提升交互感知 */
.setting-item:active {
  background-color: #F7F8FA;
}
/* 分割线：左对齐，浅灰色，弱化视觉割裂 */
.divider {
  height: 1rpx;
  background-color: #F2F3F5;
  margin: 0 30rpx;
}
/* 项标签：深黑色，粗体，保证辨识度 */
.item-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #1D2129;
  flex-shrink: 0;
  width: 120rpx;
}

/* 头像容器：flex布局，对齐箭头 */
.avatar-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
/* 头像图片：圆形，加轻微边框，提升精致度 */
.avatar-img {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  border: 2rpx solid #F2F3F5;
}
/* 默认头像：主色渐变，替代原粉色，品牌视觉统一 */
.avatar-initial {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #F2F3F5;
}
.initial-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

/* 用户名输入容器：flex布局，对齐箭头 */
.input-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  justify-content: flex-end;
}
/* 用户名输入框：右对齐，无边框，适配设置页风格 */
.nickname-input {
  text-align: right;
  font-size: 28rpx;
  color: #1D2129;
  flex: 1;
  padding: 8rpx 0;
}
/* 输入框占位符：低饱和灰色，区分输入态 */
.input-placeholder {
  color: #86909C;
  font-size: 26rpx;
}

/* 手机号容器：flex布局，适配绑定/未绑定状态 */
.phone-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  justify-content: flex-end;
}
.phone-text {
  font-size: 28rpx;
  color: #86909C;
}
/* 右侧箭头：统一样式，浅灰色，弱化视觉 */
.item-arrow {
  font-size: 32rpx;
  color: #C9CDD4;
  flex-shrink: 0;
}

/* 退出登录容器：间距优化，突出操作 */
.logout-wrap {
  margin-bottom: 30rpx;
  padding: 0 10rpx;
  position: relative;
  z-index: 2;
}
/* 退出登录按钮：白色背景+警示红边框/文字，市场通用设计 */
.logout-btn {
  width: 100%;
  height: 96rpx;
  background: #fff;
  border: 2rpx solid #F53F3F;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 15rpx rgba(245, 63, 63, 0.1);
  transition: all 0.2s ease;
}
.logout-icon {
  font-size: 32rpx;
  color: #F53F3F;
}
.logout-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #F53F3F;
}

/* 保存按钮容器：间距优化，视觉聚焦 */
.save-btn-wrap {
  padding: 0 10rpx;
  position: relative;
  z-index: 2;
}
/* 保存主按钮：蓝紫渐变+呼吸动效，和其他页面主按钮统一 */
.save-primary-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  border: none;
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(99, 120, 246, 0.3);
  animation: breath 3s infinite ease-in-out;
}
/* 呼吸动效：全局统一，提升视觉焦点 */
@keyframes breath {
  0%, 100% {
    box-shadow: 0 8rpx 25rpx rgba(99, 120, 246, 0.3);
  }
  50% {
    box-shadow: 0 12rpx 35rpx rgba(99, 120, 246, 0.4);
  }
}
.save-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}
</style>