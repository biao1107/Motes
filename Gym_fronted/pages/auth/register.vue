<template>
  <view class="register-page">
    <!-- 背景渐变装饰+光效层 -->
    <view class="bg-decoration bg-left"></view>
    <view class="bg-decoration bg-right"></view>
    
    <!-- 主内容滚动容器（适配键盘弹出/小屏/全面屏） -->
    <scroll-view class="main-scroll" scroll-y="true" bounces="false" :style="{ paddingTop: safeAreaTop + 'px' }">
      <view class="content-wrapper">
        <!-- 品牌Logo区：视觉焦点+光效质感 -->
        <view class="brand-section">
          <view class="logo-container">
            <image class="logo-img" src="/static/icons/page-style-logo.svg" mode="aspectFit" />
            <!-- Logo光晕动效 -->
            <view class="logo-glow"></view>
            <!-- Logo玻璃边框 -->
            <view class="logo-border"></view>
          </view>
          <text class="brand-title">新用户注册</text>
          <text class="brand-subtitle">加入健身搭子，遇见志同道合的运动伙伴 💪</text>
        </view>

        <!-- 注册表单卡片：轻玻璃拟态+悬浮阴影+圆角优化 -->
        <view class="register-card">
          <!-- 手机号输入 -->
          <view class="input-group">
            <view class="input-wrapper" :class="{'focused': activeInput === 'phone'}">
              <text class="input-prefix">🇨🇳 +86</text>
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
              <text class="input-icon">📱</text>
            </view>
          </view>
          
          <!-- 昵称输入 -->
          <view class="input-group">
            <view class="input-wrapper" :class="{'focused': activeInput === 'nickname'}">
              <input 
                class="input-field" 
                v-model="form.nickname" 
                placeholder="请输入2-12位昵称（中英文/数字）"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('nickname')"
                @blur="clearActiveInput"
              />
              <text class="input-icon">👤</text>
            </view>
          </view>
          
          <!-- 密码输入 -->
          <view class="input-group">
            <view class="input-wrapper" :class="{'focused': activeInput === 'password'}">
              <input 
                class="input-field" 
                password 
                v-model="form.password" 
                placeholder="请设置6-16位密码（字母+数字组合更佳）"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('password')"
                @blur="clearActiveInput"
              />
              <text class="input-icon">🔑</text>
            </view>
          </view>
          
          <!-- 确认密码输入 -->
          <view class="input-group">
            <view class="input-wrapper" :class="{'focused': activeInput === 'confirmPassword'}">
              <input 
                class="input-field" 
                password 
                v-model="form.confirmPassword" 
                placeholder="请再次输入密码"
                placeholder-class="input-placeholder"
                @focus="setActiveInput('confirmPassword')"
                @blur="clearActiveInput"
              />
              <text class="input-icon">🔒</text>
            </view>
          </view>
          
          <!-- 注册主按钮：渐变+呼吸动效+悬浮反馈 -->
          <button class="register-primary-btn" @tap="onSubmit" hover-class="btn-hover">
            <text class="register-btn-text">立即注册</text>
            <!-- 按钮右侧小箭头 -->
            <text class="btn-arrow">➡️</text>
          </button>
          
          <!-- 快捷操作：已有账号登录 -->
          <view class="quick-actions">
            <text class="action-link" @tap="goToLogin" hover-class="link-hover">
              <text class="link-icon">🔙</text>
              已有账号？立即登录
            </text>
          </view>
        </view>
        
        <!-- 底部协议：合规+轻量化+文字优化 -->
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

// 响应式数据（Vue3 ref）
const form = ref({
  phone: '',
  nickname: '',
  password: '',
  confirmPassword: ''
});
const activeInput = ref('');
const safeAreaTop = ref(0); // 适配全面屏安全区

// 页面挂载时获取全面屏安全区高度（适配刘海屏/灵动岛）
onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      safeAreaTop.value = res.safeArea.top;
    }
  });
});

// 设置激活的输入框
const setActiveInput = (inputName) => {
  activeInput.value = inputName;
};

// 清空输入框激活状态
const clearActiveInput = () => {
  activeInput.value = '';
};

// 表单校验（强化版：更精准的提示+规则）
const validateForm = () => {
  // 1. 手机号校验
  if (!form.value.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    uni.showToast({ title: '请输入正确的11位手机号', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  
  // 2. 昵称校验：去空格+2-12位+禁止特殊字符
  if (!form.value.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  const nickname = form.value.nickname.trim();
  const regNick = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,12}$/;
  if (!regNick.test(nickname)) {
    uni.showToast({ title: '昵称仅支持2-12位中英文/数字/下划线', icon: 'none', duration: 2500, mask: true });
    return false;
  }
  
  // 3. 密码校验：6-16位+禁止空格
  if (!form.value.password) {
    uni.showToast({ title: '请设置密码', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (form.value.password.includes(' ')) {
    uni.showToast({ title: '密码不可包含空格', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  if (form.value.password.length < 6 || form.value.password.length > 16) {
    uni.showToast({ title: '密码需为6-16位字符', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  
  // 4. 确认密码校验
  if (form.value.password !== form.value.confirmPassword) {
    uni.showToast({ title: '两次输入的密码不一致', icon: 'none', duration: 2000, mask: true });
    return false;
  }
  
  return true;
};

// 提交注册：强化错误处理+加载态
const onSubmit = async () => {
  if (!validateForm()) return;
  
  try {
    uni.showLoading({ title: '注册中...', mask: true });
    // 提交注册（昵称去空格）
    await apiRegister({
      phone: form.value.phone,
      password: form.value.password,
      nickname: form.value.nickname.trim()
    });
    
    uni.hideLoading();
    uni.showToast({ title: '注册成功', icon: 'success', duration: 1500, mask: true });
    // 延迟跳转，保证用户看到成功提示
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/auth/login' });
    }, 800);
  } catch (e) {
    uni.hideLoading();
    console.error('注册失败：', e);
    // 精准错误提示（适配后端返回的msg/前端捕获）
    const errMsg = e?.msg || e?.message || e?.data?.msg || '注册失败，请稍后重试';
    uni.showToast({ title: errMsg, icon: 'none', duration: 2500, mask: true });
  }
};

// 跳转到登录页
const goToLogin = () => {
  uni.redirectTo({ url: '/pages/auth/login' });
};

// 查看用户协议（模态框+滚动内容，合规化）
const viewTerms = () => {
  uni.showModal({
    title: '用户注册协议',
    content: `【健身搭子】用户注册协议
1. 您承诺年满16周岁，填写的信息真实、有效、完整；
2. 您授权平台使用您的健身相关信息用于搭子匹配，不泄露给第三方；
3. 您需遵守社区规范，不得发布违法、违规、低俗等不良内容；
4. 您对自己的账号安全负责，请勿转借、出租、出售账号；
5. 平台有权根据法律法规及运营需要调整协议，您可选择继续使用或注销账号。`,
    showCancel: false,
    confirmText: '我已阅读并同意',
    confirmColor: '#6378f6'
  });
};

// 查看隐私政策（模态框+滚动内容，合规化）
const viewPrivacy = () => {
  uni.showModal({
    title: '隐私政策',
    content: `【健身搭子】隐私政策
1. 收集范围：仅收集手机号、昵称等必要注册信息，及健身数据用于搭子匹配；
2. 数据存储：采用加密存储方式，保护您的个人信息安全；
3. 数据使用：仅用于平台服务，不会向第三方出售、泄露您的信息；
4. 数据管理：您可在个人中心修改、删除个人信息，或申请账号注销；
5. 儿童保护：不向16周岁以下未成年人提供服务，不收集儿童信息。`,
    showCancel: false,
    confirmText: '我已阅读并同意',
    confirmColor: '#6378f6'
  });
};
</script>

<style scoped>
/* 页面全局样式：全屏+双渐变背景+抗锯齿 */
.register-page {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #f8f9fb 0%, #eef1f8 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 双背景渐变装饰：左右各一个，提升层次感 */
.bg-decoration {
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  filter: blur(120rpx);
  opacity: 0.2;
  z-index: 1;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
}
.bg-left {
  top: -100rpx;
  left: -100rpx;
}
.bg-right {
  bottom: -100rpx;
  right: -100rpx;
}

/* 滚动容器：适配全面屏+键盘弹出 */
.main-scroll {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  z-index: 2;
}

/* 内容容器：居中+内边距+适配不同屏幕 */
.content-wrapper {
  width: 100%;
  padding: 0 30rpx 60rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 品牌区：视觉焦点+居中对齐 */
.brand-section {
  text-align: center;
  margin-bottom: 60rpx;
  width: 100%;
  padding-top: 20rpx;
}

/* Logo容器：玻璃拟态+光效+边框+悬浮阴影 */
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
/* Logo光晕动效：缓慢旋转，提升精致度 */
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
/* Logo玻璃边框：细白边+渐变，提升质感 */
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

/* 品牌标题：大字号+粗体+字间距+主色点缀 */
.brand-title {
  font-size: 48rpx;
  font-weight: 800;
  color: #1D2129;
  display: block;
  margin-bottom: 12rpx;
  letter-spacing: 3rpx;
}
/* 品牌副标题：轻量级+场景化+低饱和色 */
.brand-subtitle {
  font-size: 28rpx;
  color: #7B8794;
  display: block;
  line-height: 1.6;
  padding: 0 20rpx;
}

/* 注册卡片：轻玻璃拟态+悬浮阴影+大圆角+内边距优化 */
.register-card {
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
/* 聚焦态：主色边框+白色背景+轻阴影+缩放微效果 */
.input-wrapper.focused {
  border-color: #6378f6;
  background: #fff;
  box-shadow: 0 0 0 4rpx rgba(99, 120, 246, 0.1), 0 4rpx 12rpx rgba(99, 120, 246, 0.08);
  transform: translateY(-2rpx);
}

/* 手机号前缀：主色+粗体+分隔线+间距优化 */
.input-prefix {
  font-size: 28rpx;
  color: #6378f6;
  font-weight: 600;
  padding-right: 20rpx;
  margin-right: 20rpx;
  border-right: 2rpx solid #F2F3F5;
  flex-shrink: 0;
}

/* 输入框：自适应宽度+字体+颜色+背景透明 */
.input-field {
  flex: 1;
  font-size: 28rpx;
  color: #1D2129;
  background: transparent;
  height: 100%;
  font-weight: 500;
}
/* 占位符：低饱和灰色+小字号+轻字体 */
.input-placeholder {
  color: #C9CDD4;
  font-size: 26rpx;
  font-weight: 400;
}
/* 输入框图标：浅灰色+固定大小+flex不收缩 */
.input-icon {
  font-size: 32rpx;
  color: #BFC8D2;
  flex-shrink: 0;
}

/* 注册主按钮：渐变+大圆角+呼吸动效+内边距+弹性布局 */
.register-primary-btn {
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
/* 按钮文字：白色+粗体+大字号 */
.register-btn-text {
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

/* 快捷操作：居中+轻量化 */
.quick-actions {
  text-align: center;
}
/* 操作链接：主色+小字号+弹性布局+内边距 */
.action-link {
  font-size: 26rpx;
  color: #6378f6;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  border-radius: 10rpx;
}
/* 链接图标：小字号 */
.link-icon {
  font-size: 22rpx;
}

/* 协议区：底部轻量化+文字居中+字号优化 */
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

/* 动画：Logo光晕旋转 */
@keyframes logoGlow {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
/* 动画：按钮呼吸动效 */
@keyframes breath {
  0%, 100% {
    box-shadow: 0 10rpx 30rpx rgba(99, 120, 246, 0.35);
  }
  50% {
    box-shadow: 0 12rpx 40rpx rgba(99, 120, 246, 0.45);
  }
}
</style>