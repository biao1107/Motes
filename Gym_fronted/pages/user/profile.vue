<template>
  <view class="profile-edit-page" v-if="loaded">
    <!-- 顶部渐变背景（视觉延伸，和首页统一） -->
    <view class="page-top-bg"></view>

    <!-- 主内容区（滚动容器，适配小屏/多内容） -->
    <scroll-view class="main-scroll" scroll-y="true" bounces="true">
      <view class="content-wrapper">
        <!-- 1. 页面标题区 -->
        <view class="page-header">
          <text class="page-title">完善个人档案</text>
          <text class="page-desc">信息越完整，匹配的健身搭子越精准 💪</text>
        </view>

        <!-- 2. 档案编辑卡片（核心表单，轻玻璃拟态） -->
        <view class="edit-card">
          <!-- 用户基本信息显示 -->
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
            <!-- 昵称（选填） -->
            <view class="input-group">
              <text class="input-label">👤 昵称</text>
              <input 
                class="input-field" 
                v-model="form.nickname" 
                placeholder="请输入昵称"
                placeholder-class="input-placeholder"
              />
            </view>

            <!-- 健身目标（必填） -->
            <view class="input-group">
              <view class="label-wrapper">
                <text class="input-label">🎯 健身目标</text>
                <text class="required-tag">*</text>
              </view>
              <input 
                class="input-field" 
                v-model="form.fitnessGoal" 
                placeholder="请填写你的健身目标，如：减脂、增肌、塑形、维持体能"
                placeholder-class="input-placeholder"
              />
            </view>

            <!-- 训练时间（必填） -->
            <view class="input-group">
              <view class="label-wrapper">
                <text class="input-label">⏰ 训练时间</text>
                <text class="required-tag">*</text>
              </view>
              <input 
                class="input-field" 
                v-model="form.trainTime" 
                placeholder="请填写常用训练时间，如：工作日晚上、周末全天、早8点"
                placeholder-class="input-placeholder"
              />
            </view>

            <!-- 训练场景（必填） -->
            <view class="input-group">
              <view class="label-wrapper">
                <text class="input-label">📍 训练场景</text>
                <text class="required-tag">*</text>
              </view>
              <input 
                class="input-field" 
                v-model="form.trainScene" 
                placeholder="请填写训练地点，如：家里、小区健身房、商业健身房、户外"
                placeholder-class="input-placeholder"
              />
            </view>

            <!-- 监督偏好（选填） -->
            <view class="input-group">
              <text class="input-label">👀 监督偏好</text>
              <input 
                class="input-field" 
                v-model="form.superviseDemand" 
                placeholder="选填：如需要严格监督、自我管理即可、偶尔打卡提醒"
                placeholder-class="input-placeholder"
              />
            </view>

            <!-- 基础水平（选填） -->
            <view class="input-group">
              <text class="input-label">💪 健身基础</text>
              <input 
                class="input-field" 
                v-model="form.fitnessLevel" 
                placeholder="选填：如纯新手、入门1-3个月、进阶6个月+、资深"
                placeholder-class="input-placeholder"
              />
            </view>
          </view>
        </view>

        <!-- 3. 保存按钮（视觉突出，呼吸动效） -->
        <view class="btn-wrapper">
          <button 
            class="save-primary-btn" 
            @tap="onSave"
            hover-class="btn-hover"
          >
            <text class="save-btn-text">💾 保存我的档案</text>
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiGetProfile, apiUpdateProfile } from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

// 响应式数据
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

// 获取用户名首字母作为头像
const getInitial = (nickname) => {
  if (!nickname) return '?';
  return nickname.charAt(0).toUpperCase();
};

// 加载用户档案
const loadData = async () => {
  try {
    uni.showLoading({ title: '加载中...', mask: true });
    const data = await apiGetProfile();
    form.value = Object.assign({}, form.value, data || {});
    loaded.value = true;
  } catch (e) {
    console.error('加载用户档案失败:', e);
    uni.showToast({ title: '加载失败', icon: 'none' });
    loaded.value = true;
  } finally {
    uni.hideLoading();
  }
};

// 保存档案
const onSave = async () => {
  // 必填项校验
  if (!form.value.fitnessGoal || !form.value.trainTime || !form.value.trainScene) {
    uni.showToast({ title: '请填写标*的必填项', icon: 'none', duration: 2000 });
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
    // 延迟返回，保证用户看到成功提示
    setTimeout(() => {
      getCurrentPages().length > 1 ? uni.navigateBack() : loadData();
    }, 1500);
  } catch (e) {
    console.error('保存用户档案失败:', e);
    uni.showToast({ title: '保存失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// 页面加载时执行

onMounted(() => {
  if (!requireLogin()) return;
  loadData();
});

// 页面生命周期函数
const onShow = () => {
  if (!requireLogin()) return;
  loadData();
};

// 通过defineExpose暴露页面生命周期函数给uni-app系统
defineExpose({
  onShow
});
</script>

<style scoped>
/* 页面全局样式 */
.profile-edit-page {
  width: 100%;
  height: 100vh;
  background-color: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
  overflow: hidden;
}
/* 滚动容器：预留顶部视觉空间，适配底部操作 */
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
/* 按钮点击反馈（小程序专属，全局统一） */
.btn-hover {
  transform: scale(0.98) !important;
  opacity: 0.95 !important;
}

/* 顶部渐变背景：和首页视觉统一，打造品牌感 */
.page-top-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 200rpx;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  border-radius: 0 0 40rpx 40rpx;
  z-index: 1;
  box-shadow: 0 8rpx 30rpx rgba(99, 120, 246, 0.2);
}

/* 页面标题区：突出主题，引导用户 */
.page-header {
  margin-bottom: 30rpx;
  position: relative;
  z-index: 2;
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

/* 编辑卡片：轻玻璃拟态+微阴影，和首页卡片风格统一 */
.edit-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 36rpx 30rpx;
  box-sizing: border-box;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 2;
  margin-bottom: 40rpx;
}

/* 用户信息区域 */
.user-info-section {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 40rpx;
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #F2F3F5;
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6378f6 0%, #8F5FE8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 6rpx solid #fff;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.1);
}

.avatar-initial {
  font-size: 60rpx;
  color: white;
  font-weight: 600;
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
  color: #1D2129;
}

.user-phone {
  font-size: 26rpx;
  color: #86909C;
}

/* 表单域：统一间距，提升输入体验 */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}
/* 输入组：标签+输入框组合，优化对齐 */
.input-group {
  display: flex;
  flex-direction: column;
}
/* 标签包装器：处理必填标红，视觉更协调 */
.label-wrapper {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.input-label {
  font-size: 28rpx;
  color: #1D2129;
  font-weight: 600;
  margin-bottom: 12rpx;
}
/* 必填标签：醒目红，市场通用设计 */
.required-tag {
  font-size: 24rpx;
  color: #F53F3F;
  font-weight: 700;
}
/* 输入框：圆角+微边框+内边距优化，适配小程序输入体验 */
.input-field {
  width: 100%;
  height: 90rpx;
  background: #F7F8FA;
  border: 1rpx solid #F2F3F5;
  border-radius: 16rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #1D2129;
  transition: all 0.2s ease;
}
/* 输入框聚焦态：主色边框，提升交互感知 */
.input-field:focus {
  border-color: #6378f6;
  background: #fff;
  box-shadow: 0 0 0 4rpx rgba(99, 120, 246, 0.1);
}
/* 占位符：低饱和灰色，提升可读性 */
.input-placeholder {
  color: #86909C;
  font-size: 26rpx;
}

/* 按钮容器：居中+宽度限制，视觉更聚焦 */
.btn-wrapper {
  position: relative;
  z-index: 2;
  padding: 0 10rpx;
}
/* 保存主按钮：渐变主色+呼吸动效+大尺寸，符合市场级操作按钮设计 */
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
  transition: all 0.3s ease;
  animation: breath 3s infinite ease-in-out;
}
/* 呼吸动效：和首页主按钮统一，提升视觉焦点 */
@keyframes breath {
  0%, 100% {
    box-shadow: 0 8rpx 25rpx rgba(99, 120, 246, 0.3);
  }
  50% {
    box-shadow: 0 12rpx 35rpx rgba(99, 120, 246, 0.4);
  }
}
/* 按钮文字：白色+粗体，保证辨识度 */
.save-btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}
</style>