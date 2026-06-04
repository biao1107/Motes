<template>
  <view class="register-page">
    <view class="ambient ambient-left"></view>
    <view class="ambient ambient-right"></view>
    <view class="grid-overlay"></view>

    <scroll-view class="main-scroll" scroll-y="true" bounces="false" :style="{ paddingTop: safeAreaTop + 'px' }">
      <view class="content-wrapper">
        <view class="intro-panel">
          <view class="intro-top">
            <view class="logo-shell">
              <image class="logo-img" src="/static/icons/page-style-logo.svg" mode="aspectFit" />
            </view>
            <view class="brand-copy">
              <text class="brand-kicker">Get Started</text>
              <text class="brand-title">新用户注册</text>
              <text class="brand-subtitle">先建立你的账号，再把训练目标、搭子关系和挑战节奏串起来。</text>
            </view>
          </view>

          <view class="feature-list">
            <view class="feature-chip">
              <text class="feature-chip-title">快速建档</text>
              <text class="feature-chip-text">注册后即可完善健身目标和训练偏好，提升匹配准确度</text>
            </view>
            <view class="feature-chip">
              <text class="feature-chip-title">搭子协作</text>
              <text class="feature-chip-text">建立搭子组后，你能更稳定地完成协同训练和挑战打卡</text>
            </view>
            <view class="feature-chip">
              <text class="feature-chip-title">训练记录</text>
              <text class="feature-chip-text">把每天的训练和挑战结果都收进一套连续的运动档案里</text>
            </view>
          </view>
        </view>

        <view class="register-card">
          <view class="card-head">
            <text class="card-title">创建你的训练账号</text>
            <text class="card-subtitle">先完成基础注册，后续再补充档案和训练信息</text>
          </view>

          <view class="input-group">
            <text class="field-label">手机号</text>
            <view class="input-wrapper" :class="{ focused: activeInput === 'phone' }">
              <text class="input-prefix">+86</text>
              <input
                class="input-field"
                type="number"
                maxlength="11"
                v-model="form.phone"
                placeholder="请输入手机号"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('phone')"
                @blur="clearActiveInput"
              />
            </view>
          </view>

          <view class="input-group">
            <text class="field-label">昵称</text>
            <view class="input-wrapper" :class="{ focused: activeInput === 'nickname' }">
              <input
                class="input-field"
                v-model="form.nickname"
                placeholder="请输入 2-12 位昵称"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('nickname')"
                @blur="clearActiveInput"
              />
            </view>
          </view>

          <view class="input-group">
            <text class="field-label">密码</text>
            <view class="input-wrapper" :class="{ focused: activeInput === 'password' }">
              <input
                class="input-field"
                password
                v-model="form.password"
                placeholder="请设置 6-16 位密码"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('password')"
                @blur="clearActiveInput"
              />
            </view>
          </view>

          <view class="input-group">
            <text class="field-label">确认密码</text>
            <view class="input-wrapper" :class="{ focused: activeInput === 'confirmPassword' }">
              <input
                class="input-field"
                password
                v-model="form.confirmPassword"
                placeholder="请再次输入密码"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('confirmPassword')"
                @blur="clearActiveInput"
              />
            </view>
          </view>

          <view class="security-note">
            <text class="security-note-text">注册成功后，你可以继续完善档案，让系统给出更准确的搭子推荐。</text>
          </view>

          <button class="register-primary-btn" @tap="onSubmit" hover-class="btn-hover">
            <text class="register-btn-text">立即注册</text>
            <text class="btn-arrow">→</text>
          </button>

          <view class="quick-actions">
            <text class="action-tip">已经有账号？</text>
            <text class="action-link" @tap="goToLogin" hover-class="link-hover">去登录</text>
          </view>
        </view>

        <view class="agreement-section">
          <text class="agreement-text">点击注册即表示您已阅读并同意</text>
          <text class="agreement-link" @tap="viewTerms" hover-class="link-hover">《用户协议》</text>
          <text class="agreement-text">和</text>
          <text class="agreement-link" @tap="viewPrivacy" hover-class="link-hover">《隐私政策》</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiRegister } from '@/common/api.js';

const form = ref({
  phone: '',
  nickname: '',
  password: '',
  confirmPassword: ''
});
const activeInput = ref('');
const safeAreaTop = ref(0);

onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      safeAreaTop.value = res.safeArea.top;
    }
  });
});

const setActiveInput = (inputName) => {
  activeInput.value = inputName;
};

const clearActiveInput = () => {
  activeInput.value = '';
};

const validateForm = () => {
  if (!form.value.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    uni.showToast({ title: '请输入正确的 11 位手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (!form.value.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  const nickname = form.value.nickname.trim();
  const regNick = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,12}$/;
  if (!regNick.test(nickname)) {
    uni.showToast({ title: '昵称仅支持 2-12 位中英文/数字/下划线', icon: 'none', duration: 2500, mask: true });
    return false;
  }
  if (!form.value.password) {
    uni.showToast({ title: '请设置密码', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (form.value.password.includes(' ')) {
    uni.showToast({ title: '密码不可包含空格', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (form.value.password.length < 6 || form.value.password.length > 16) {
    uni.showToast({ title: '密码需为 6-16 位字符', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (form.value.password !== form.value.confirmPassword) {
    uni.showToast({ title: '两次输入的密码不一致', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  return true;
};

const onSubmit = async () => {
  if (!validateForm()) return;

  try {
    uni.showLoading({ title: '注册中...', mask: true });
    await apiRegister({
      phone: form.value.phone,
      password: form.value.password,
      nickname: form.value.nickname.trim()
    });

    uni.hideLoading();
    uni.showToast({ title: '注册成功', icon: 'success', duration: 1500, mask: true });
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/auth/login' });
    }, 800);
  } catch (error) {
    uni.hideLoading();
    console.error('注册失败：', error);
    const errMsg = error?.msg || error?.message || error?.data?.msg || '注册失败，请稍后重试';
    uni.showToast({ title: errMsg, icon: 'none', duration: 2500, mask: true });
  }
};

const goToLogin = () => {
  uni.redirectTo({ url: '/pages/auth/login' });
};

const viewTerms = () => {
  uni.showModal({
    title: '用户注册协议',
    content: '注册并使用本平台，即表示你同意遵守平台规则，并授权我们在合法范围内使用必要信息完成健身搭子匹配与训练协作服务。',
    showCancel: false,
    confirmText: '我已阅读并同意',
    confirmColor: '#6378f6'
  });
};

const viewPrivacy = () => {
  uni.showModal({
    title: '隐私政策',
    content: '我们仅收集完成服务所需的必要信息，并通过加密存储等方式保障你的个人数据安全，不会擅自向第三方泄露。',
    showCancel: false,
    confirmText: '我已阅读并同意',
    confirmColor: '#6378f6'
  });
};
</script>

<style scoped>
.register-page {
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(150, 255, 214, 0.18), transparent 24%),
    linear-gradient(180deg, #06152d 0%, #0a2347 48%, #eef3fb 48%, #f5f7fc 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  position: relative;
  overflow: hidden;
}

.ambient {
  position: absolute;
  border-radius: 50%;
  filter: blur(120rpx);
  z-index: 1;
}

.ambient-left {
  width: 420rpx;
  height: 420rpx;
  top: -120rpx;
  left: -120rpx;
  background: rgba(90, 142, 255, 0.28);
}

.ambient-right {
  width: 360rpx;
  height: 360rpx;
  right: -100rpx;
  top: 140rpx;
  background: rgba(113, 255, 196, 0.22);
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 28rpx 28rpx;
  z-index: 1;
  opacity: 0.45;
}

.main-scroll {
  width: 100%;
  height: 100vh;
  position: relative;
  z-index: 2;
}

.content-wrapper {
  width: 100%;
  padding: 0 24rpx 60rpx;
  box-sizing: border-box;
}

.intro-panel {
  padding-top: 8rpx;
  margin-bottom: 20rpx;
}

.intro-top {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 16rpx;
}

.logo-shell {
  width: 126rpx;
  height: 126rpx;
  flex-shrink: 0;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 14rpx 40rpx rgba(3, 8, 25, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  backdrop-filter: blur(14rpx);
}

.logo-shell::after {
  content: '';
  position: absolute;
  inset: -6rpx;
  border-radius: 34rpx;
  background: linear-gradient(135deg, rgba(108, 141, 255, 0.26), rgba(127, 255, 205, 0));
  z-index: -1;
}

.logo-img {
  width: 102rpx;
  height: 102rpx;
}

.brand-copy {
  flex: 1;
}

.brand-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40rpx;
  padding: 0 14rpx;
  margin-bottom: 12rpx;
  border-radius: 999rpx;
  background: rgba(133, 255, 206, 0.14);
  color: #92f5cc;
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.brand-title {
  display: block;
  margin-bottom: 6rpx;
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.brand-subtitle {
  display: block;
  font-size: 23rpx;
  line-height: 1.5;
  color: rgba(232, 241, 255, 0.82);
}

.feature-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}

.feature-chip {
  min-width: 0;
  padding: 14rpx 14rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12rpx);
  box-sizing: border-box;
}

.feature-chip-title {
  display: block;
  margin-bottom: 6rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.feature-chip-text {
  display: block;
  font-size: 19rpx;
  line-height: 1.4;
  color: rgba(232, 241, 255, 0.76);
}

.register-card {
  width: 100%;
  max-width: 680rpx;
  margin: 0 auto 26rpx;
  padding: 28rpx 22rpx 26rpx;
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18rpx 48rpx rgba(18, 34, 82, 0.14);
  box-sizing: border-box;
}

.card-head {
  margin-bottom: 18rpx;
}

.card-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 34rpx;
  font-weight: 800;
  color: #14233b;
}

.card-subtitle {
  display: block;
  font-size: 23rpx;
  line-height: 1.6;
  color: #728097;
}

.input-group {
  margin-bottom: 20rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 23rpx;
  font-weight: 600;
  color: #24344f;
}

.input-wrapper {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  padding: 0 18rpx;
  border-radius: 22rpx;
  background: #f5f7fc;
  border: 2rpx solid transparent;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.input-wrapper.focused {
  border-color: #4f70fb;
  background: #ffffff;
  box-shadow: 0 0 0 6rpx rgba(79, 112, 251, 0.1);
}

.input-prefix {
  font-size: 26rpx;
  font-weight: 700;
  color: #3253ef;
  padding-right: 16rpx;
  margin-right: 16rpx;
  border-right: 2rpx solid #dfe6f4;
}

.input-field {
  flex: 1;
  font-size: 27rpx;
  color: #14233b;
  background: transparent;
  min-height: 88rpx;
}

.input-placeholder {
  color: #a0acc1;
  font-size: 25rpx;
}

.security-note {
  margin-top: -2rpx;
  margin-bottom: 18rpx;
  padding: 16rpx 18rpx;
  border-radius: 20rpx;
  background: linear-gradient(180deg, #f7f9ff 0%, #f1f5ff 100%);
}

.security-note-text {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #627188;
}

.register-primary-btn {
  width: 100%;
  height: 98rpx;
  margin-bottom: 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #1638b8 0%, #4c67f4 52%, #79b4ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-shadow: 0 16rpx 32rpx rgba(22, 56, 184, 0.24);
}

.register-btn-text {
  font-size: 31rpx;
  font-weight: 800;
  color: #ffffff;
}

.btn-arrow {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.quick-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.action-tip {
  font-size: 24rpx;
  color: #8692a8;
}

.action-link {
  font-size: 24rpx;
  font-weight: 700;
  color: #3253ef;
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
}

.agreement-section {
  width: 100%;
  max-width: 680rpx;
  margin: 0 auto;
  text-align: center;
  line-height: 1.8;
  padding: 0 16rpx 20rpx;
  box-sizing: border-box;
}

.agreement-text {
  font-size: 22rpx;
  color: rgba(224, 235, 255, 0.78);
}

.agreement-link {
  font-size: 22rpx;
  color: #9ee9cd;
  text-decoration: underline;
  margin: 0 6rpx;
}

.btn-hover {
  transform: scale(0.98) !important;
  opacity: 0.96 !important;
}

.link-hover {
  opacity: 0.8 !important;
  background: rgba(79, 112, 251, 0.08) !important;
}

@media (max-width: 750rpx) {
  .feature-list {
    grid-template-columns: 1fr;
  }

  .intro-top {
    align-items: flex-start;
  }
}
</style>
