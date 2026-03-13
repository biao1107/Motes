<template>
	<view class="container" v-if="loaded">
		<view class="match-header">
			<text class="fitness-title">智能匹配</text>
			<text class="header-subtitle">为您推荐最佳健身搭子</text>
		</view>

		<!-- 匹配结果区域 -->
		<view class="workout-card" v-if="matchResult && matchResult.length > 0">
			<view class="section-header">
				<text class="fitness-subtitle">为您推荐</text>
				<text class="section-count">{{ matchResult ? matchResult.length : 0 }}位搭子</text>
			</view>
			<view class="match-list">
				<view class="match-item" v-for="(item, index) in matchResult" :key="index">
					<view class="match-avatar">
						<image 
							v-if="item.avatar && item.avatar.trim() !== ''" 
							:src="item.avatar" 
							class="avatar-image"
							mode="aspectFill"
							@error="onAvatarLoadError"
						/>
						<text v-else class="avatar-text">{{ item.nickname ? item.nickname.charAt(0) : '#' }}</text>
					</view>
					<view class="match-info">
						<view class="match-basic">
							<text class="match-name">{{ item.nickname || ('搭子 ' + (index + 1)) }}</text>
							<view class="match-score">
								<text class="score-text">{{ item.score || 0 }}%</text>
								<view class="score-bar">
									<view class="score-fill" :style="{ width: (item.score || 0) + '%' }"></view>
								</view>
							</view>
						</view>
						<view class="match-details">
							<text class="match-mode" v-if="item.mode">{{ item.mode }}</text>
							<view class="match-tags">
								<text class="tag-item" v-if="item.goal">🎯 {{ item.goal }}</text>
								<text class="tag-item" v-if="item.preferTime">⏰ {{ item.preferTime }}</text>
								<text class="tag-item" v-if="item.scene">📍 {{ item.scene }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 暂无匹配结果 -->
		<view class="workout-card" v-else>
			<view class="empty-state">
				<view class="empty-icon">🔍</view>
				<text class="empty-text">暂无匹配结果</text>
				<text class="empty-subtext">先完善个人档案，提高匹配精准度</text>
				<button class="btn-fitness-primary" @tap="goProfile">
					<text class="btn-text">去完善档案</text>
				</button>
			</view>
		</view>

		<!-- 底部操作 -->
		<view class="bottom-actions">
			<button class="btn-fitness-strength" @tap="loadData">
				<text class="btn-text">刷新匹配</text>
			</button>
		</view>
	</view>

	<!-- 加载状态 -->
	<view v-else class="loading-container">
		<view class="loading-spinner"></view>
		<text class="loading-text">正在匹配中...</text>
	</view>
</template>

<script>
import { apiGetTopMatch } from '@/common/api.js';
import { requireLogin, getUserIdFromToken } from '@/common/auth.js';

export default {
	data() {
		return {
			loaded: false,
			matchResult: null
		};
	},
	onShow() {
		if (!requireLogin()) return;
		this.loadData();
	},
	methods: {
		async loadData() {
			try {
				uni.showLoading({ title: '匹配中...' });
				const userId = getUserIdFromToken();
				if (!userId) {
					console.error('无法获取用户ID');
					this.loaded = true;
					uni.hideLoading();
					uni.showToast({
						title: '登录信息异常',
						icon: 'none'
					});
					return;
				}
				
				const res = await apiGetTopMatch(8);  // 获取8个匹配搭子
				// 根据实际返回结构适配，这里假设 data 是数组
				this.matchResult = res?.data || res || [];
				this.loaded = true;
				uni.hideLoading();
			} catch (e) {
				uni.hideLoading();
				this.loaded = true;
				uni.showToast({
					title: '匹配失败，请重试',
					icon: 'none'
				});
			}
		},
		goProfile() {
			uni.navigateTo({ url: '/pages/user/profile' });
		},
		onAvatarLoadError(e) {
			console.log('头像加载失败:', e);
		}
	}
};
</script>

<style scoped>
.container {
	padding: 20rpx;
	background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
	min-height: 100vh;
}

.loading-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100vh;
	background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
}

.loading-spinner {
	width: 60rpx;
	height: 60rpx;
	border: 4rpx solid #e0e0e0;
	border-top: 4rpx solid #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-bottom: 20rpx;
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.loading-text {
	font-size: 28rpx;
	color: #666;
}

.match-header {
	text-align: center;
	margin-bottom: 30rpx;
	padding: 0 20rpx;
}

.header-subtitle {
	font-size: 28rpx;
	color: #666;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.section-count {
	font-size: 24rpx;
	color: #999;
	background-color: #f0f0f0;
	padding: 4rpx 12rpx;
	border-radius: 20rpx;
}

.match-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.match-item {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background-color: #fafafa;
	border-radius: 16rpx;
	gap: 20rpx;
}

.match-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	position: relative;
	overflow: hidden;
}

.avatar-image {
	width: 100%;
	height: 100%;
}

.avatar-text {
	color: white;
	font-weight: 600;
	font-size: 32rpx;
}

.match-info {
	flex: 1;
}

.match-basic {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 10rpx;
}

.match-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	flex: 1;
}

.match-score {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.score-text {
	font-size: 28rpx;
	font-weight: 600;
	color: #667eea;
	margin-bottom: 6rpx;
}

.score-bar {
	width: 120rpx;
	height: 8rpx;
	background-color: #e0e0e0;
	border-radius: 4rpx;
	overflow: hidden;
}

.score-fill {
	height: 100%;
	background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
	border-radius: 4rpx;
	transition: width 0.3s ease;
}

.match-details {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
}

.match-mode {
	font-size: 20rpx;
	color: #ff6b6b;
	background-color: #ffe0e0;
	padding: 4rpx 10rpx;
	border-radius: 10rpx;
	flex-shrink: 0;
	margin-right: 10rpx;
}

.match-tags {
	flex: 1;
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}

.tag-item {
	font-size: 20rpx;
	color: #666;
	background-color: #f0f0f0;
	padding: 4rpx 10rpx;
	border-radius: 10rpx;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 60rpx 40rpx;
	text-align: center;
}

.empty-icon {
	font-size: 80rpx;
	margin-bottom: 30rpx;
}

.empty-text {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 10rpx;
}

.empty-subtext {
	font-size: 26rpx;
	color: #999;
	margin-bottom: 40rpx;
}

.bottom-actions {
	padding: 0 20rpx;
	margin-top: 20rpx;
}
</style>