<script>
/**
 * ============================================
 * App.vue - 应用根组件
 * ============================================
 * 作用：
 * 1. 应用的生命周期管理（启动、显示、隐藏）
 * 2. 定义全局样式（全部页面共享）
 * 3. WebSocket 连接在登录后初始化，不在这里初始化
 * 
 * 注意事项：
 * - 不要在 onLaunch 中初始化 WebSocket，因为此时可能没有 token
 * - WebSocket 应该在登录成功后，在首页 index.vue 中调用
 * ============================================
 */
import { initWebSocket } from '@/common/ws.js';

export default {
	/**
	 * 应用启动生命周期
	 * 在小程序初始化完成时触发（全局只触发一次）
	 */
	onLaunch() {
		console.log('App Launch');
	},
	
	/**
	 * 应用显示生命周期
	 * 小程序启动，或从后台进入前台显示时触发
	 */
	onShow() {
		console.log('App Show');
	},
	
	/**
	 * 应用隐藏生命周期
	 * 小程序从前台进入后台时触发
	 */
	onHide() {
		console.log('App Hide');
	}
};
</script>

<style>
/* 每个页面公共 css 可写在这里 */

/* 全局健身主题样式 */

/* 页面背景 */
.page-bg {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
  min-height: 100vh;
}

/* 健身主题卡片 */
.fitness-card {
  background: white;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  padding: 30rpx;
  margin: 20rpx;
}

/* 健身主题标题 */
.fitness-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}

/* 健身主题分割线 */
.fitness-divider {
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent);
  margin: 30rpx 0;
}

/* 健身主题标签 */
.fitness-tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin: 10rpx;
}

/* 健身主题徽章 */
.fitness-badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  background: #ff6b6b;
  color: white;
  border-radius: 50%;
  width: 36rpx;
  height: 36rpx;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 健身主题动画 */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.pulse-animation {
  animation: pulse 2s infinite;
}

</style>
