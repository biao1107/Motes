<template>
  <view class="setting-page">
    <view class="page-top-bg"></view>
    <view class="top-orb orb-left"></view>
    <view class="top-orb orb-right"></view>

    <scroll-view class="main-scroll" scroll-y="true" bounces="true">
      <view class="content-wrapper">
        <view class="page-header">
          <view class="hero-badge">Account Setting</view>
          <text class="page-title">个人设置</text>
          <text class="page-desc">集中管理头像、昵称、手机号和登录状态，保证账号信息始终可控。</text>
        </view>

        <view class="setting-card">
          <view class="setting-item" @tap="selectAvatar">
            <text class="item-label">头像</text>
            <view class="avatar-wrap">
              <image v-if="form.avatar" :src="form.avatar" class="avatar-img" mode="aspectFill" />
              <view v-else class="avatar-initial">
                <text class="initial-text">{{ getInitial(form.nickname) }}</text>
              </view>
              <text class="item-arrow">编辑</text>
            </view>
          </view>

          <view class="divider"></view>

          <view class="setting-item">
            <text class="item-label">用户名</text>
            <view class="input-wrap">
              <input
                class="nickname-input"
                v-model="form.nickname"
                placeholder="请输入你的用户名"
                placeholder-class="input-placeholder"
              />
              <text class="item-arrow">可修改</text>
            </view>
          </view>

          <view class="divider"></view>

          <view class="setting-item">
            <text class="item-label">手机号</text>
            <view class="phone-wrap">
              <text class="phone-text">{{ form.phone || '未绑定' }}</text>
            </view>
          </view>
        </view>

        <view class="tips-card">
          <text class="tips-title">建议</text>
          <text class="tips-desc">保持头像和昵称稳定，有助于搭子快速识别你，也能减少组内沟通成本。</text>
        </view>

        <view class="action-bar">
          <view class="save-primary-btn" @tap="onSave">
            <text class="save-text">保存设置</text>
          </view>
        </view>

        <view class="logout-wrap">
          <view class="logout-btn" @tap="onLogout">
            <text class="logout-icon">退</text>
            <text class="logout-text">退出登录</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiGetProfile, apiUpdateProfile, apiUploadAvatar } from '@/common/api.js';
import { requireLogin, clearToken } from '@/common/auth.js';

const form = ref({
  nickname: '',
  avatar: '',
  phone: ''
});
const currentProfileData = ref(null);

const getInitial = (nickname) => {
  if (!nickname || !nickname.trim()) return '?';
  return nickname.trim().charAt(0).toUpperCase();
};

const loadData = async () => {
  try {
    uni.showLoading({ title: '加载中...', mask: true });
    const data = await apiGetProfile();
    form.value = {
      nickname: data.nickname || '',
      avatar: data.avatar || '',
      phone: data.phone || ''
    };
    currentProfileData.value = data;
  } catch (error) {
    console.error('加载设置失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const onSave = async () => {
  const nickname = form.value.nickname.trim();
  if (!nickname) {
    uni.showToast({ title: '请输入有效的用户名', icon: 'none', duration: 2000 });
    return;
  }

  try {
    uni.showLoading({ title: '保存中...', mask: true });
    const profileData = {
      nickname,
      avatar: form.value.avatar,
      fitnessGoal: currentProfileData.value?.fitnessGoal || '',
      trainTime: currentProfileData.value?.trainTime || '',
      trainScene: currentProfileData.value?.trainScene || '',
      superviseDemand: currentProfileData.value?.superviseDemand || '',
      fitnessLevel: currentProfileData.value?.fitnessLevel || ''
    };
    await apiUpdateProfile(profileData);
    uni.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (error) {
    console.error('保存设置失败:', error);
    uni.showToast({ title: '保存失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

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

const selectAvatar = () => {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    sizeType: ['original', 'compressed'],
    success: async (res) => {
      try {
        uni.showLoading({ title: '上传中...', mask: true });
        const uploadRes = await apiUploadAvatar(res.tempFilePaths[0]);
        let avatarUrl = '';

        if (uploadRes && typeof uploadRes === 'object') {
          avatarUrl = uploadRes.data
            ? typeof uploadRes.data === 'string'
              ? uploadRes.data
              : uploadRes.data.url || uploadRes.data
            : JSON.stringify(uploadRes);
        } else {
          avatarUrl = uploadRes || '';
        }

        if (avatarUrl) {
          form.value.avatar = avatarUrl;
          uni.showToast({ title: '头像更新成功', icon: 'success' });
        } else {
          throw new Error('上传响应中未包含有效的 URL');
        }
      } catch (error) {
        console.error('头像上传失败:', error);
        uni.showToast({ title: error.errMsg || '上传失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    fail: () => {
      uni.showToast({ title: '取消选择', icon: 'none', duration: 1000 });
    }
  });
};

onMounted(() => {
  if (!requireLogin()) return;
  loadData();
});

const onLoad = () => {
  if (!requireLogin()) return;
  loadData();
};

defineExpose({
  onLoad
});
</script>

<style scoped>
.setting-page {
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
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
  height: 200rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  border-radius: 0 0 48rpx 48rpx;
  z-index: 1;
  box-shadow: 0 18rpx 46rpx rgba(23, 56, 182, 0.22);
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
  padding-bottom: 40rpx;
}

.content-wrapper {
  width: 100%;
  padding: 30rpx 24rpx;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}

.page-header {
  margin-bottom: 28rpx;
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

.page-title {
  font-size: 38rpx;
  font-weight: 800;
  color: #ffffff;
  display: block;
  margin-bottom: 8rpx;
}

.page-desc {
  font-size: 24rpx;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
}

.setting-card,
.tips-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 32rpx;
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
  margin-bottom: 24rpx;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 28rpx;
}

.divider {
  height: 1rpx;
  background-color: #eef1f6;
  margin: 0 28rpx;
}

.item-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #172233;
  flex-shrink: 0;
  width: 120rpx;
}

.avatar-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.avatar-img {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
}

.avatar-initial {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.initial-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.input-wrap,
.phone-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  justify-content: flex-end;
}

.nickname-input {
  text-align: right;
  font-size: 28rpx;
  color: #172233;
  flex: 1;
}

.input-placeholder,
.phone-text {
  color: #8692a8;
  font-size: 26rpx;
}

.item-arrow {
  font-size: 22rpx;
  font-weight: 700;
  color: #4564f2;
  flex-shrink: 0;
}

.tips-card {
  padding: 24rpx 24rpx 26rpx;
  box-sizing: border-box;
}

.tips-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #172233;
}

.tips-desc {
  display: block;
  font-size: 23rpx;
  line-height: 1.6;
  color: #74829a;
}

.action-bar,
.logout-wrap {
  margin-bottom: 24rpx;
}

.save-primary-btn,
.logout-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-primary-btn {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.save-text {
  font-size: 27rpx;
  font-weight: 700;
  color: #ffffff;
}

.logout-btn {
  background: #ffffff;
  border: 2rpx solid #ef5350;
  gap: 10rpx;
}

.logout-icon,
.logout-text {
  color: #ef5350;
}

.logout-icon {
  font-size: 24rpx;
  font-weight: 700;
}

.logout-text {
  font-size: 27rpx;
  font-weight: 700;
}
</style>
