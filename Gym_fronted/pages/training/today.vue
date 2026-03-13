<template>
	<view class="container">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="header-title">📅 今日训练记录</text>
			<text class="header-date">{{ todayDate }}</text>
		</view>

		<!-- 加载状态 -->
		<view v-if="loading" class="loading-container">
			<text>加载中...</text>
		</view>

		<!-- 无记录状态 -->
		<view v-else-if="trainRecords.length === 0" class="empty-container">
			<text class="empty-icon">🏋️</text>
			<text class="empty-text">今日暂无训练记录</text>
			<text class="empty-subtext">开始训练来记录你的进度吧</text>
		</view>

		<!-- 训练记录列表 -->
		<view v-else class="records-container">
			<view 
				class="record-card" 
				v-for="record in trainRecords" 
				:key="record.id"
			>
				<view class="record-header">
					<view class="group-info">
						<text class="group-name">{{ getGroupName(record.groupId) }}</text>
						<view class="status-badge" :class="'status-' + record.status">
							<text class="status-text">{{ getStatusText(record.status) }}</text>
						</view>
					</view>
				</view>
				
				<view class="record-body">
					<view class="record-item">
						<text class="item-label">训练日期</text>
						<text class="item-value">{{ formatDate(record.trainDate) }}</text>
					</view>
					<view class="record-item">
						<text class="item-label">完成次数</text>
						<text class="item-value highlight">{{ record.completeCount || 0 }}</text>
					</view>
					<view class="record-item" v-if="record.score">
						<text class="item-label">获得积分</text>
						<text class="item-value score">{{ record.score }}</text>
					</view>
				</view>
				
				<view class="record-footer">
					<text class="create-time">创建于: {{ formatDateTime(record.createTime) }}</text>
				</view>
			</view>
		</view>

		<!-- 统计信息 -->
		<view class="stats-card" v-if="trainRecords.length > 0">
			<view class="stats-title">📊 今日统计</view>
			<view class="stats-content">
				<view class="stat-item">
					<text class="stat-value">{{ trainRecords.length }}</text>
					<text class="stat-label">训练次数</text>
				</view>
				<view class="stat-item">
					<text class="stat-value">{{ totalCompleted }}</text>
					<text class="stat-label">总完成</text>
				</view>
				<view class="stat-item">
					<text class="stat-value">{{ completedCount }}</text>
					<text class="stat-label">已完成</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { apiGetTodayTraining, apiMyGroups } from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

export default {
	data() {
		return {
			loading: false,
			trainRecords: [],
			groups: [],
			todayDate: ''
		};
	},

	computed: {
		totalCompleted() {
			return this.trainRecords.reduce((sum, record) => {
				return sum + (record.completeCount || 0);
			}, 0);
		},
		completedCount() {
			return this.trainRecords.filter(record => record.status === 1).length;
		}
	},

	onLoad() {
		this.setTodayDate();
	},

	onShow() {
		if (!requireLogin()) return;
		this.loadTodayTraining();
		this.loadGroups();
	},

	methods: {
		setTodayDate() {
			const now = new Date();
			this.todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		},

		async loadTodayTraining() {
			this.loading = true;
			try {
				const res = await apiGetTodayTraining();
				this.trainRecords = res.data || res || [];
			} catch (error) {
				console.error('加载训练记录失败:', error);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},

		async loadGroups() {
			try {
				const res = await apiMyGroups();
				this.groups = res.data || res || [];
			} catch (error) {
				console.error('加载群组失败:', error);
			}
		},

		getGroupName(groupId) {
			const group = this.groups.find(g => g.id === groupId);
			return group ? group.groupName : `群组 ${groupId}`;
		},

		getStatusText(status) {
			const statusMap = {
				0: '未完成',
				1: '已完成',
				2: '已放弃'
			};
			return statusMap[status] || '未知';
		},

		formatDate(dateStr) {
			if (!dateStr) return '-';
			try {
				const date = new Date(dateStr);
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
			} catch (e) {
				return dateStr;
			}
		},

		formatDateTime(dateTimeStr) {
			if (!dateTimeStr) return '-';
			try {
				const date = new Date(dateTimeStr);
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
			} catch (e) {
				return dateTimeStr;
			}
		}
	}
};
</script>

<style scoped>
.container {
	padding: 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	min-height: 100vh;
}

.page-header {
	margin-bottom: 30rpx;
	text-align: center;
}

.header-title {
	font-size: 40rpx;
	font-weight: bold;
	color: #fff;
	display: block;
}

.header-date {
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-top: 10rpx;
	display: block;
}

.loading-container,
.empty-container {
	text-align: center;
	padding: 100rpx 0;
	color: #fff;
}

.empty-icon {
	font-size: 100rpx;
	display: block;
	margin-bottom: 20rpx;
}

.empty-text {
	font-size: 32rpx;
	display: block;
	margin-bottom: 10rpx;
}

.empty-subtext {
	font-size: 26rpx;
	opacity: 0.8;
}

.records-container {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.record-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.15);
}

.record-header {
	margin-bottom: 20rpx;
}

.group-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.group-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.status-badge {
	padding: 8rpx 20rpx;
	border-radius: 30rpx;
	font-size: 24rpx;
	font-weight: 500;
}

.status-0 {
	background: #fff3e0;
	color: #f57c00;
}

.status-1 {
	background: #e8f5e9;
	color: #4caf50;
}

.status-2 {
	background: #ffebee;
	color: #f44336;
}

.record-body {
	display: flex;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.record-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.item-label {
	font-size: 24rpx;
	color: #999;
	margin-bottom: 8rpx;
}

.item-value {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.item-value.highlight {
	color: #667eea;
}

.item-value.score {
	color: #ffa500;
}

.record-footer {
	border-top: 1rpx solid #eee;
	padding-top: 20rpx;
}

.create-time {
	font-size: 22rpx;
	color: #999;
}

.stats-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-top: 30rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.15);
}

.stats-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
}

.stats-content {
	display: flex;
	justify-content: space-around;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stat-value {
	font-size: 48rpx;
	font-weight: bold;
	color: #667eea;
}

.stat-label {
	font-size: 24rpx;
	color: #999;
	margin-top: 10rpx;
}
</style>
