<template>
  <view class="login-page">
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
              <text class="brand-kicker">Fitness Social</text>
              <text class="brand-title">健身搭子</text>
              <text class="brand-subtitle">把匹配、训练、挑战和聊天放进同一个行动流里。</text>
            </view>
          </view>

          <view class="feature-list">
            <view class="feature-chip">
              <text class="feature-chip-title">智能匹配</text>
              <text class="feature-chip-text">按目标、时间和场景推荐更合适的训练伙伴</text>
            </view>
            <view class="feature-chip">
              <text class="feature-chip-title">协同训练</text>
              <text class="feature-chip-text">实时上报训练进度，让搭子之间真正形成监督关系</text>
            </view>
            <view class="feature-chip">
              <text class="feature-chip-title">挑战打卡</text>
              <text class="feature-chip-text">把坚持训练这件事，变成有反馈、有节奏的日常动作</text>
            </view>
          </view>
        </view>

        <view class="login-card">
          <view class="card-head">
            <text class="card-title">登录你的训练空间</text>
            <text class="card-subtitle">继续查看搭子、挑战和今天的训练进度</text>
          </view>

          <view class="login-tabs">
            <view
              :class="['tab-item', loginType === 'password' ? 'active' : '']"
              @tap="switchLoginType('password')"
              hover-class="tab-hover"
            >
              <text class="tab-text">密码登录</text>
            </view>
            <view
              :class="['tab-item', loginType === 'code' ? 'active' : '']"
              @tap="switchLoginType('code')"
              hover-class="tab-hover"
            >
              <text class="tab-text">验证码登录</text>
            </view>
          </view>

          <view class="input-group">
            <text class="field-label">手机号</text>
            <view class="input-wrapper" :class="{ focused: activeInput === 'phone' }">
              <text class="input-prefix">+86</text>
              <input
                class="input-field"
                type="number"
                maxlength="11"
                v-model="formData.phone"
                placeholder="请输入手机号"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('phone')"
                @blur="clearActiveInput"
              />
            </view>
          </view>

          <view class="input-group" v-if="loginType === 'password'">
            <text class="field-label">密码</text>
            <view class="input-wrapper" :class="{ focused: activeInput === 'password' }">
              <input
                class="input-field"
                password
                v-model="formData.password"
                placeholder="请输入密码（6-16位）"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('password')"
                @blur="clearActiveInput"
              />
            </view>
          </view>

          <view class="input-group" v-else>
            <text class="field-label">验证码</text>
            <view class="verification-row">
              <view class="input-wrapper flex-1" :class="{ focused: activeInput === 'code' }">
                <input
                  class="input-field"
                  type="number"
                  maxlength="6"
                  v-model="formData.code"
                  placeholder="请输入 6 位验证码"
                  placeholder-class="input-placeholder"
                  @focus="setActiveInput('code')"
                  @blur="clearActiveInput"
                />
              </view>
              <button
                class="code-btn"
                :class="{ disabled: isCodeBtnDisabled }"
                :disabled="isCodeBtnDisabled"
                @tap="sendVerificationCode"
                hover-class="btn-hover"
              >
                <text class="code-btn-text">{{ codeBtnText }}</text>
              </button>
            </view>
          </view>

          <view class="security-note">
            <text class="security-note-text">登录后将自动同步你的个人档案、训练统计和未读消息。</text>
          </view>

          <button class="login-primary-btn" @tap="handleLogin" hover-class="btn-hover">
            <text class="login-btn-text">立即登录</text>
            <text class="btn-arrow">→</text>
          </button>

          <view class="quick-actions">
            <text class="action-tip">还没有账号？</text>
            <text class="action-link" @tap="goToRegister" hover-class="link-hover">去注册</text>
          </view>
        </view>

        <view class="agreement-section">
          <text class="agreement-text">登录即表示您同意</text>
          <text class="agreement-link" @tap="viewTerms" hover-class="link-hover">《用户协议》</text>
          <text class="agreement-text">和</text>
          <text class="agreement-link" @tap="viewPrivacy" hover-class="link-hover">《隐私政策》</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { apiLoginByPassword, apiLoginByCode, apiSendCode, apiGetUserInfo, apiStatPersonal } from '@/common/api.js';
import { setToken, setUserInfo } from '@/common/auth.js';
import { initWebSocket } from '@/common/ws.js';

const loginType = ref('password');
const formData = ref({
  phone: '',
  password: '',
  code: ''
});
const codeCountdown = ref(0);
const codeTimer = ref(null);
const activeInput = ref('');
const safeAreaTop = ref(0);

onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      safeAreaTop.value = res.safeArea.top;
    }
  });
});

onUnmounted(() => {
  codeTimer.value && clearInterval(codeTimer.value);
});

const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(formData.value.phone));
const isCodeBtnDisabled = computed(() => !formData.value.phone || codeCountdown.value > 0 || !isValidPhone.value);
const codeBtnText = computed(() => (codeCountdown.value > 0 ? `${codeCountdown.value}s 后重试` : '获取验证码'));

const getUserIdFromToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return payload.sub ? Number(payload.sub) : null;
  } catch (error) {
    return null;
  }
};

const switchLoginType = (type) => {
  loginType.value = type;
  if (type === 'password') {
    formData.value.code = '';
  } else {
    formData.value.password = '';
  }
};

const setActiveInput = (inputName) => {
  activeInput.value = inputName;
};

const clearActiveInput = () => {
  activeInput.value = '';
};

const validateForm = () => {
  if (!formData.value.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (!isValidPhone.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (loginType.value === 'password' && !formData.value.password) {
    uni.showToast({ title: '请输入密码', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (loginType.value === 'code' && !formData.value.code) {
    uni.showToast({ title: '请输入验证码', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  return true;
};

const sendVerificationCode = async () => {
  try {
    uni.showLoading({ title: '发送中...', mask: true });
    await apiSendCode({ phone: formData.value.phone });
    uni.hideLoading();
    uni.showToast({ title: '验证码已发送', icon: 'success', duration: 1500, mask: true });

    codeCountdown.value = 60;
    codeTimer.value && clearInterval(codeTimer.value);
    codeTimer.value = setInterval(() => {
      if (codeCountdown.value <= 1) {
        clearInterval(codeTimer.value);
        codeTimer.value = null;
        codeCountdown.value = 0;
      } else {
        codeCountdown.value -= 1;
      }
    }, 1000);
  } catch (error) {
    uni.hideLoading();
    console.error('发送验证码失败:', error);
    const errMsg = error?.msg || error?.message || '发送失败，请重试';
    uni.showToast({ title: errMsg, icon: 'none', duration: 2000, mask: true });
  }
};

const handleLogin = async () => {
  if (!validateForm()) return;

  try {
    uni.showLoading({ title: '登录中...', mask: true });

    let token;
    if (loginType.value === 'password') {
      token = await apiLoginByPassword({
        phone: formData.value.phone,
        password: formData.value.password
      });
    } else {
      token = await apiLoginByCode({
        phone: formData.value.phone,
        code: formData.value.code
      });
    }

    if (token) {
      setToken(token);

      try {
        const [userResponse, statsResponse] = await Promise.all([apiGetUserInfo(), apiStatPersonal()]);
        const userInfo = userResponse.data || {
          id: getUserIdFromToken(token),
          nickname: '用户' + getUserIdFromToken(token)
        };
        const userStats = statsResponse.data || { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        setUserInfo(userInfo);
        uni.setStorageSync('temp_user_data', {
          profile: userResponse.data || userInfo,
          stats: userStats
        });
      } catch (error) {
        const fallbackUser = {
          id: getUserIdFromToken(token),
          nickname: '用户' + getUserIdFromToken(token)
        };
        setUserInfo(fallbackUser);
        console.error('获取用户信息失败:', error);
      }

      try {
        await initWebSocket();
      } catch (error) {
        console.error('WebSocket 初始化失败:', error);
      }

      uni.hideLoading();
      uni.showToast({ title: '登录成功', icon: 'success', duration: 1500, mask: true });
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/index/index' });
      }, 500);
    } else {
      uni.hideLoading();
      uni.showToast({ title: '登录失败', icon: 'none', duration: 2000, mask: true });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('登录失败:', error);
    const errMsg = error?.msg || error?.message || '登录失败，请重试';
    uni.showToast({ title: errMsg, icon: 'none', duration: 2000, mask: true });
  }
};

const goToRegister = () => {
  uni.navigateTo({ url: '/pages/auth/register' });
};

const viewTerms = () => {
  uni.showModal({
    title: '用户协议',
    content: '使用本服务即表示你同意遵守平台规则，并授权我们在合法范围内使用必要数据来完成匹配、训练和消息功能。',
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
.login-page {
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

.login-card {
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

.login-tabs {
  display: flex;
  padding: 8rpx;
  margin-bottom: 24rpx;
  border-radius: 999rpx;
  background: #f1f4fb;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18rpx 0;
  border-radius: 999rpx;
  transition: all 0.25s ease;
}

.tab-item.active {
  background: linear-gradient(135deg, #2752ef 0%, #5877ff 100%);
  box-shadow: 0 10rpx 20rpx rgba(39, 82, 239, 0.2);
}

.tab-text {
  font-size: 25rpx;
  font-weight: 700;
  color: #7d899e;
}

.tab-item.active .tab-text {
  color: #ffffff;
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

.verification-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.flex-1 {
  flex: 1;
}

.code-btn {
  width: 200rpx;
  height: 88rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #1638b8 0%, #4c67f4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.code-btn.disabled {
  background: #e9edf6;
  opacity: 0.88;
}

.code-btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.code-btn.disabled .code-btn-text {
  color: #8591a7;
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

.login-primary-btn {
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

.login-btn-text {
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
