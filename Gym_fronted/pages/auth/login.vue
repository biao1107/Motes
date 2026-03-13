<template>
  <view class="login-page">
    <!-- 双背景装饰层：提升层次感和高级感 -->
    <view class="bg-decoration bg-left"></view>
    <view class="bg-decoration bg-right"></view>
    
    <!-- 主内容区（滚动容器，适配小屏/键盘弹出/全面屏） -->
    <scroll-view class="main-scroll" scroll-y="true" bounces="false" :style="{ paddingTop: safeAreaTop + 'px' }">
      <view class="content-wrapper">
        <!-- 1. Logo+品牌区：视觉焦点，强化品牌认知 -->
        <view class="brand-section">
          <view class="logo-container">
            <image class="logo-img" src="/static/icons/page-style-logo.svg" mode="aspectFit" />
            <view class="logo-glow"></view>
            <view class="logo-border"></view>
          </view>
          <text class="brand-title">健身搭子</text>
          <text class="brand-subtitle">找到你的专属健身伙伴 💪</text>
        </view>

        <!-- 2. 登录卡片：轻玻璃拟态，核心操作区 -->
        <view class="login-card">
          <!-- 登录方式切换：胶囊式设计+光效 -->
          <view class="login-tabs">
            <view 
              :class="['tab-item', loginType === 'password' ? 'active' : '']" 
              @tap="switchLoginType('password')"
              hover-class="tab-hover"
            >
              <text class="tab-icon">🔒</text>
              <text class="tab-text">密码登录</text>
            </view>
            <view 
              :class="['tab-item', loginType === 'code' ? 'active' : '']" 
              @tap="switchLoginType('code')"
              hover-class="tab-hover"
            >
              <text class="tab-icon">📱</text>
              <text class="tab-text">验证码登录</text>
            </view>
          </view>
          
          <!-- 手机号输入 -->
          <view class="input-group">
            <view class="input-wrapper" :class="{'focused': activeInput === 'phone'}">
              <text class="input-prefix">🇨🇳 +86</text>
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
              <text class="input-icon">📱</text>
            </view>
          </view>
          
          <!-- 密码输入 -->
          <view class="input-group" v-if="loginType === 'password'">
            <view class="input-wrapper" :class="{'focused': activeInput === 'password'}">
              <input 
                class="input-field" 
                password 
                v-model="formData.password" 
                placeholder="请输入密码（6-16位）"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('password')"
                @blur="clearActiveInput"
              />
              <text class="input-icon">🔑</text>
            </view>
          </view>
          
          <!-- 验证码输入 -->
          <view class="input-group" v-else>
            <view class="verification-row">
              <view class="input-wrapper flex-1" :class="{'focused': activeInput === 'code'}">
                <input 
                  class="input-field" 
                  type="number" 
                  maxlength="6" 
                  v-model="formData.code" 
                  placeholder="请输入6位验证码"
                  placeholder-class="input-placeholder"
                  @focus="setActiveInput('code')"
                  @blur="clearActiveInput"
                />
                <text class="input-icon">📧</text>
              </view>
              <button 
                class="code-btn" 
                :class="{'disabled': isCodeBtnDisabled}"
                :disabled="isCodeBtnDisabled" 
                @tap="sendVerificationCode"
                hover-class="btn-hover"
              >
                <text class="code-btn-text">{{ codeBtnText }}</text>
              </button>
            </view>
          </view>
          
          <!-- 登录按钮：视觉焦点，呼吸动效+箭头 -->
          <button class="login-primary-btn" @tap="handleLogin" hover-class="btn-hover">
            <text class="login-btn-text">立即登录</text>
            <text class="btn-arrow">➡️</text>
          </button>
          
          <!-- 快捷操作 -->
          <view class="quick-actions">
            <text class="action-link" @tap="goToRegister" hover-class="link-hover">👤 新用户注册</text>
          </view>
        </view>
        
        <!-- 3. 底部协议：合规+轻量化 -->
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

// 响应式数据（Vue3 ref替代data）
const loginType = ref('password'); // password | code
const formData = ref({
  phone: '',
  password: '',
  code: ''
});
const codeCountdown = ref(0);
const codeTimer = ref(null);
const activeInput = ref('');
const safeAreaTop = ref(0); // 适配全面屏安全区

// 页面挂载时获取全面屏安全区高度
onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      safeAreaTop.value = res.safeArea.top;
    }
  });
});

// 组件卸载前清理定时器
onUnmounted(() => {
  codeTimer.value && clearInterval(codeTimer.value);
});

// 计算属性（Vue3 computed）
const isValidPhone = computed(() => {
  return /^1[3-9]\d{9}$/.test(formData.value.phone);
});

const isCodeBtnDisabled = computed(() => {
  return !formData.value.phone || codeCountdown.value > 0 || !isValidPhone.value;
});

const codeBtnText = computed(() => {
  return codeCountdown.value > 0 ? `${codeCountdown.value}s后重试` : '获取验证码';
});

// 从JWT中解析userId
const getUserIdFromToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return payload.sub ? Number(payload.sub) : null;
  } catch (e) {
    return null;
  }
};

// 切换登录方式
const switchLoginType = (type) => {
  loginType.value = type;
  // 切换时清空对应输入框，提升体验
  if (type === 'password') {
    formData.value.code = '';
  } else {
    formData.value.password = '';
  }
};

// 设置激活的输入框
const setActiveInput = (inputName) => {
  activeInput.value = inputName;
};

// 清空激活状态
const clearActiveInput = () => {
  activeInput.value = '';
};

// 表单校验
const validateForm = () => {
  // 手机号为空
  if (!formData.value.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  
  // 手机号格式错误
  if (!isValidPhone.value) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  
  // 密码登录：密码为空
  if (loginType.value === 'password' && !formData.value.password) {
    uni.showToast({ title: '请输入密码', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  
  // 验证码登录：验证码为空
  if (loginType.value === 'code' && !formData.value.code) {
    uni.showToast({ title: '请输入验证码', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  
  return true;
};

// 发送验证码
const sendVerificationCode = async () => {
  try {
    uni.showLoading({ title: '发送中...', mask: true });
    await apiSendCode({ phone: formData.value.phone });
    uni.hideLoading();
    uni.showToast({ title: '验证码已发送', icon: 'success', duration: 1500, mask: true });
    
    // 开始60秒倒计时
    codeCountdown.value = 60;
    codeTimer.value && clearInterval(codeTimer.value);
    codeTimer.value = setInterval(() => {
      if (codeCountdown.value <= 1) {
        clearInterval(codeTimer.value);
        codeTimer.value = null;
        codeCountdown.value = 0;
      } else {
        codeCountdown.value--;
      }
    }, 1000);
  } catch (error) {
    uni.hideLoading();
    console.error('发送验证码失败:', error);
    const errMsg = error?.msg || error?.message || '发送失败，请重试';
    uni.showToast({ title: errMsg, icon: 'none', duration: 2000, mask: true });
  }
};

// 处理登录逻辑
const handleLogin = async () => {
  if (!validateForm()) return;
  
  try {
    uni.showLoading({ title: '登录中...', mask: true });
    
    let token;
    // 密码登录/验证码登录分支
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
    
    // 登录成功处理
    if (token) {
      setToken(token);
      
      // 获取并保存用户信息
      let userInfo = null;
      let userStats = null;
      try {
        // 并行获取用户信息和统计数据
        const [userResponse, statsResponse] = await Promise.all([
          apiGetUserInfo(),
          apiStatPersonal()
        ]);
        
        userInfo = userResponse.data || {
          id: getUserIdFromToken(token),
          nickname: '用户' + getUserIdFromToken(token)
        };
        userStats = statsResponse.data || { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        
        setUserInfo(userInfo);
        
        // 将统计数据临时存储到本地，供首页使用
        uni.setStorageSync('temp_user_data', {
          profile: userResponse.data || userInfo,
          stats: userStats
        });
      } catch (e) {
        // 降级处理：使用默认信息
        userInfo = {
          id: getUserIdFromToken(token),
          nickname: '用户' + getUserIdFromToken(token)
        };
        userStats = { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        setUserInfo(userInfo);
        console.error('获取用户信息失败:', e);
      }
      
      // 初始化WebSocket
      try {
        await initWebSocket();
      } catch (e) {
        console.error('WebSocket初始化失败:', e);
      }
      
      uni.hideLoading();
      uni.showToast({ title: '登录成功', icon: 'success', duration: 1500, mask: true });
      
      // 延迟跳转，保证用户看到成功提示
      setTimeout(() => {
        // 跳转到首页
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

// 跳转到注册页
const goToRegister = () => {
  uni.navigateTo({ url: '/pages/auth/register' });
};

// 查看用户协议（模态框+主色确认按钮）
const viewTerms = () => {
  uni.showModal({
    title: '用户协议',
    content: '【健身搭子】用户协议：\n1. 您承诺使用本服务时遵守相关法律法规；\n2. 您授权我们收集必要的健身数据用于匹配搭子；\n3. 您需对自己的账号安全负责；\n4. 平台有权根据运营需要调整服务规则。',
    showCancel: false,
    confirmText: '我已阅读并同意',
    confirmColor: '#6378f6'
  });
};

// 查看隐私政策（模态框+主色确认按钮）
const viewPrivacy = () => {
  uni.showModal({
    title: '隐私政策',
    content: '【健身搭子】隐私政策：\n1. 我们仅收集必要的个人信息用于服务提供；\n2. 您的健身数据仅用于匹配搭子，不会泄露给第三方；\n3. 您可随时删除自己的个人数据；\n4. 我们采用加密方式保护您的信息安全。',
    showCancel: false,
    confirmText: '我已阅读并同意',
    confirmColor: '#6378f6'
  });
};
</script>

<style scoped>
/* 页面全局样式：全屏+渐变背景+抗锯齿，适配登录场景 */
.login-page {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #f8f9fb 0%, #eef1f8 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 双背景装饰层：提升层次感和高级感 */
.bg-decoration {
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  border-radius: 50%;
  filter: blur(120rpx);
  opacity: 0.2;
  z-index: 1;
}
.bg-left {
  top: -100rpx;
  left: -100rpx;
}
.bg-right {
  top: -100rpx;
  right: -100rpx;
}

/* 滚动容器：适配键盘弹出+全面屏，禁止弹性回弹 */
.main-scroll {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  z-index: 2;
}

/* 内容容器：居中+内边距，适配不同屏幕 */
.content-wrapper {
  width: 100%;
  padding: 0 30rpx 60rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 品牌区：视觉焦点，强化品牌认知 */
.brand-section {
  text-align: center;
  margin-bottom: 60rpx;
  width: 100%;
  padding-top: 20rpx;
}

/* Logo容器：玻璃拟态+光效+边框，提升精致度 */
.logo-container {
  width: 180rpx;
  height: 180rpx;
  margin: 0 auto 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 40rpx;
  box-shadow: 0 15rpx 40rpx rgba(99, 120, 246, 0.15);
  position: relative;
  z-index: 1;
}

/* Logo光效：渐变高光+旋转动效，提升质感 */
.logo-glow {
  position: absolute;
  top: -8rpx;
  left: -8rpx;
  width: 196rpx;
  height: 196rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, rgba(99,120,246,0.2) 0%, rgba(143,95,232,0) 70%);
  z-index: -1;
  animation: logoGlow 8s infinite linear;
}

/* Logo玻璃边框：细白边，提升精致度 */
.logo-border {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 40rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  box-sizing: border-box;
  z-index: -1;
}

.logo-img {
  width: 140rpx;
  height: 140rpx;
  z-index: 2;
}

/* 品牌标题：大字号+粗体+字间距，强化记忆 */
.brand-title {
  font-size: 48rpx;
  font-weight: 800;
  color: #1D2129;
  display: block;
  margin-bottom: 12rpx;
  letter-spacing: 3rpx;
}

/* 品牌副标题：轻量级，场景化 */
.brand-subtitle {
  font-size: 28rpx;
  color: #7B8794;
  display: block;
  line-height: 1.6;
  padding: 0 20rpx;
}

/* 登录卡片：轻玻璃拟态+悬浮阴影+大圆角，核心操作区 */
.login-card {
  width: 100%;
  max-width: 600rpx;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 28rpx;
  padding: 48rpx 36rpx;
  box-sizing: border-box;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.06), 0 2rpx 10rpx rgba(99, 120, 246, 0.04);
  backdrop-filter: blur(15rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  margin-bottom: 40rpx;
  position: relative;
}

/* 登录方式切换：胶囊式设计，市场主流+过渡动画 */
.login-tabs {
  display: flex;
  background: #F9FAFB;
  border-radius: 50rpx;
  padding: 8rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 0;
  border-radius: 42rpx;
  font-size: 28rpx;
  color: #86909C;
  transition: all 0.25s ease-in-out;
}

/* 激活态：主色渐变+白色文字+阴影，视觉突出 */
.tab-item.active {
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4rpx 15rpx rgba(99, 120, 246, 0.35);
  transform: translateY(-2rpx);
}

/* 点击反馈：小程序专属 */
.tab-hover {
  opacity: 0.9 !important;
}

.tab-icon {
  font-size: 24rpx;
}

/* 输入组：统一间距+最后一个无下间距 */
.input-group {
  margin-bottom: 32rpx;
}
.input-group:last-child {
  margin-bottom: 0;
}

/* 输入框容器：圆角+浅灰背景+聚焦态强化+过渡动画 */
.input-wrapper {
  display: flex;
  align-items: center;
  height: 100rpx;
  background: #F9FAFB;
  border-radius: 18rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  transition: all 0.25s ease-in-out;
}

/* 聚焦态：主色边框+白色背景+轻阴影+微缩放，提升交互感知 */
.input-wrapper.focused {
  border-color: #6378f6;
  background: #fff;
  box-shadow: 0 0 0 4rpx rgba(99, 120, 246, 0.1), 0 4rpx 12rpx rgba(99, 120, 246, 0.08);
  transform: translateY(-2rpx);
}

/* 手机号前缀：主色+粗体+分隔线，视觉区分 */
.input-prefix {
  font-size: 28rpx;
  color: #6378f6;
  font-weight: 600;
  padding-right: 20rpx;
  margin-right: 20rpx;
  border-right: 2rpx solid #F2F3F5;
  flex-shrink: 0;
}

/* 输入框：自适应宽度，统一样式 */
.input-field {
  flex: 1;
  font-size: 28rpx;
  color: #1D2129;
  background: transparent;
  height: 100%;
  font-weight: 500;
}

/* 占位符：低饱和灰色，提升可读性 */
.input-placeholder {
  color: #C9CDD4;
  font-size: 26rpx;
  font-weight: 400;
}

/* 输入框图标：浅灰色，弱化干扰 */
.input-icon {
  font-size: 32rpx;
  color: #BFC8D2;
  flex-shrink: 0;
}

/* 验证码行：flex布局，适配按钮 */
.verification-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.flex-1 {
  flex: 1;
}

/* 验证码按钮：主色渐变+圆角+过渡，市场级设计 */
.code-btn {
  width: 200rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  border: none;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

/* 禁用态：灰色+降透，视觉区分 */
.code-btn.disabled {
  background: #F2F3F5;
  opacity: 0.7;
}

.code-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

.code-btn.disabled .code-btn-text {
  color: #86909C;
}

/* 登录主按钮：全宽+呼吸动效+箭头，视觉焦点 */
.login-primary-btn {
  width: 100%;
  height: 108rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  border: none;
  border-radius: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-shadow: 0 10rpx 30rpx rgba(99, 120, 246, 0.35);
  margin-top: 30rpx;
  margin-bottom: 30rpx;
  animation: breath 4s infinite ease-in-out;
  position: relative;
  overflow: hidden;
}

/* 呼吸动效：更柔和的阴影变化 */
@keyframes breath {
  0%, 100% {
    box-shadow: 0 10rpx 30rpx rgba(99, 120, 246, 0.35);
  }
  50% {
    box-shadow: 0 12rpx 40rpx rgba(99, 120, 246, 0.45);
  }
}

/* Logo光晕旋转动效 */
@keyframes logoGlow {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.login-btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

/* 按钮箭头：小字号+白色 */
.btn-arrow {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}

/* 快捷操作：居中，轻量化 */
.quick-actions {
  text-align: center;
}

.action-link {
  font-size: 26rpx;
  color: #6378f6;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  border-radius: 10rpx;
}

/* 协议区：底部轻量化，合规设计 */
.agreement-section {
  width: 100%;
  text-align: center;
  padding: 0 20rpx;
  box-sizing: border-box;
  line-height: 1.8;
}

.agreement-text {
  font-size: 22rpx;
  color: #86909C;
}

.agreement-link {
  font-size: 22rpx;
  color: #6378f6;
  text-decoration: underline;
  margin: 0 6rpx;
}

/* 全局点击反馈：小程序专属+过渡动画 */
.btn-hover {
  transform: scale(0.97) !important;
  opacity: 0.95 !important;
  transition: all 0.15s ease !important;
}

.link-hover {
  opacity: 0.8 !important;
  background: rgba(99, 120, 246, 0.08) !important;
  transition: all 0.15s ease !important;
}
</style>