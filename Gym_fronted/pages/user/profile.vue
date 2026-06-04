<template>
  <view class="profile-edit-page" v-if="loaded">
    <view class="page-top-bg"></view>
    <image class="page-bg-photo" src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80" mode="aspectFill" />
    <view class="top-orb orb-left"></view>
    <view class="top-orb orb-right"></view>

    <scroll-view class="main-scroll" scroll-y="true" bounces="true">
      <view class="content-wrapper">
        <view class="page-header">
          <view class="hero-badge">Profile Setup</view>
          <text class="page-title">完善个人档案</text>
          <text class="page-desc">信息越完整，搭子推荐、挑战分发和训练协作都会更准确。</text>
        </view>

        <view class="edit-card">
          <view class="user-info-section">
            <view class="user-avatar">
              <view class="avatar-placeholder">
                <text class="avatar-initial">{{ getInitial(form.nickname) }}</text>
              </view>
            </view>
            <view class="user-details">
              <text class="user-name">{{ form.nickname || '未设置昵称' }}</text>
              <text class="user-phone">{{ form.phone }}</text>
            </view>
          </view>

          <view class="form-fields">
            <view class="input-group">
              <text class="input-label">昵称</text>
              <input
                class="input-field"
                v-model="form.nickname"
                placeholder="请输入昵称"
                placeholder-class="input-placeholder"
              />
            </view>

            <view class="input-group">
              <view class="label-wrapper">
                <text class="input-label">健身目标</text>
                <text class="required-tag">*</text>
              </view>
              <input
                class="input-field"
                v-model="form.fitnessGoal"
                placeholder="例如：减脂、增肌、塑形、维持体能"
                placeholder-class="input-placeholder"
              />
            </view>

            <view class="input-group">
              <view class="label-wrapper">
                <text class="input-label">训练时间</text>
                <text class="required-tag">*</text>
              </view>
              <input
                class="input-field"
                v-model="form.trainTime"
                placeholder="例如：工作日晚间、周末全天、早 8 点"
                placeholder-class="input-placeholder"
              />
            </view>

            <view class="input-group">
              <view class="label-wrapper">
                <text class="input-label">训练场景</text>
                <text class="required-tag">*</text>
              </view>
              <input
                class="input-field"
                v-model="form.trainScene"
                placeholder="例如：家里、小区健身房、商业健身房、户外"
                placeholder-class="input-placeholder"
              />
            </view>

            <view class="input-group">
              <text class="input-label">监督偏好</text>
              <input
                class="input-field"
                v-model="form.superviseDemand"
                placeholder="例如：严格监督、偶尔提醒、自主训练"
                placeholder-class="input-placeholder"
              />
            </view>

            <view class="input-group">
              <text class="input-label">健身基础</text>
              <input
                class="input-field"
                v-model="form.fitnessLevel"
                placeholder="例如：纯新手、入门 1-3 个月、进阶 6 个月+"
                placeholder-class="input-placeholder"
              />
            </view>
          </view>
        </view>

        <view class="action-bar">
          <view class="save-primary-btn" @tap="onSave">
            <text class="save-btn-text">保存我的档案</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiGetProfile, apiUpdateProfile } from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

const loaded = ref(false);
const form = ref({
  id: null,
  phone: '',
  nickname: '',
  fitnessGoal: '',
  trainTime: '',
  trainScene: '',
  superviseDemand: '',
  fitnessLevel: ''
});

const getInitial = (nickname) => {
  if (!nickname) return '?';
  return nickname.charAt(0).toUpperCase();
};

const loadData = async () => {
  try {
    uni.showLoading({ title: '加载中...', mask: true });
    const data = await apiGetProfile();
    form.value = Object.assign({}, form.value, data || {});
    loaded.value = true;
  } catch (error) {
    console.error('加载用户档案失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
    loaded.value = true;
  } finally {
    uni.hideLoading();
  }
};

const onSave = async () => {
  if (!form.value.fitnessGoal || !form.value.trainTime || !form.value.trainScene) {
    uni.showToast({ title: '请填写带 * 的必填项', icon: 'none', duration: 2000, mask: true });
    return;
  }

  try {
    uni.showLoading({ title: '保存中...', mask: true });
    await apiUpdateProfile({
      fitnessGoal: form.value.fitnessGoal,
      trainTime: form.value.trainTime,
      trainScene: form.value.trainScene,
      superviseDemand: form.value.superviseDemand,
      fitnessLevel: form.value.fitnessLevel,
      nickname: form.value.nickname
    });
    uni.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
    setTimeout(() => {
      getCurrentPages().length > 1 ? uni.navigateBack() : loadData();
    }, 1500);
  } catch (error) {
    console.error('保存用户档案失败:', error);
    uni.showToast({ title: '保存失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

onMounted(() => {
  if (!requireLogin()) return;
  loadData();
});

const onShow = () => {
  if (!requireLogin()) return;
  loadData();
};

defineExpose({
  onShow
});
</script>

<style scoped>
.profile-edit-page {
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
  height: 220rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  border-radius: 0 0 48rpx 48rpx;
  z-index: 1;
  box-shadow: 0 18rpx 46rpx rgba(23, 56, 182, 0.22);
}

.page-bg-photo {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 220rpx;
  opacity: 0.14;
  z-index: 1;
  pointer-events: none;
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

.edit-card {
  width: 100%;
  padding: 36rpx 30rpx;
  box-sizing: border-box;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
  margin-bottom: 28rpx;
}

.user-info-section {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 34rpx;
  padding-bottom: 28rpx;
  border-bottom: 1rpx solid #eef1f6;
}

.avatar-placeholder {
  width: 150rpx;
  height: 150rpx;
  border-radius: 50%;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 6rpx solid #ffffff;
  box-shadow: 0 14rpx 34rpx rgba(21, 35, 95, 0.12);
}

.avatar-initial {
  font-size: 54rpx;
  color: #ffffff;
  font-weight: 700;
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #172233;
}

.user-phone {
  font-size: 26rpx;
  color: #8692a8;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 26rpx;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.label-wrapper {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.input-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #172233;
}

.required-tag {
  font-size: 22rpx;
  font-weight: 700;
  color: #ef5350;
}

.input-field {
  width: 100%;
  min-height: 82rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f5f7fc;
  font-size: 26rpx;
  color: #172233;
}

.action-bar {
  padding-bottom: 12rpx;
}

.save-primary-btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.save-btn-text {
  font-size: 27rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
