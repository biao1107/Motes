<template>
	<view class="container">
		<!-- 课程封面 -->
		<view class="course-header">
			<!-- 课程封面：有图显示图片，无图显示渐变背景 -->
			<image 
				v-if="course.coverImage"
				class="course-cover" 
				:src="course.coverImage" 
				mode="aspectFill"
			/>
			<view v-else class="course-cover course-cover-placeholder">
				<text class="placeholder-icon">📚</text>
			</view>
			<view class="course-overlay">
				<text class="course-title">{{ course.courseName }}</text>
				<text class="course-subtitle">{{ course.description }}</text>
			</view>
		</view>
		
		<!-- 课程信息卡片 -->
		<view class="info-card">
			<view class="info-grid">
				<view class="info-item">
					<text class="info-label">⏱️ 时长</text>
					<text class="info-value">{{ course.duration }}分钟</text>
				</view>
				<view class="info-item">
					<text class="info-label">🔥 卡路里</text>
					<text class="info-value">{{ course.calories || 0 }}kcal</text>
				</view>
				<view class="info-item">
					<text class="info-label">🎯 类型</text>
					<text class="info-value">{{ course.courseType }}</text>
				</view>
				<view class="info-item">
					<text class="info-label">📊 难度</text>
					<text class="info-value difficulty" :class="difficultyClass">
						{{ course.difficulty }}
					</text>
				</view>
			</view>
		</view>
		
		<!-- 课程内容 -->
		<view class="content-section">
			<view class="section-header">
				<text class="section-title">📋 课程内容</text>
			</view>
			<view class="content-list">
				<view 
					class="content-item" 
					v-for="(item, index) in courseContent" 
					:key="index"
				>
					<view class="item-number">{{ index + 1 }}</view>
					<view class="item-content">
						<text class="item-title">{{ item.action }}</text>
						<view class="item-details">
							<text v-if="item.time" class="detail-item">⏱️ {{ item.time }}分钟</text>
							<text v-if="item.sets" class="detail-item">🔁 {{ item.sets }}组</text>
							<text v-if="item.count" class="detail-item">🔢 {{ item.count }}次</text>
							<text v-if="item.rest" class="detail-item">⏸️ 休息{{ item.rest }}秒</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 视频教程 -->
		<view class="video-section" v-if="course.videoUrl">
			<view class="section-header">
				<text class="section-title">🎥 视频教程</text>
			</view>
			<view class="video-container">
				<video 
					:src="course.videoUrl" 
					class="course-video"
					controls
					autoplay="false"
					:poster="course.coverImage"
					@error="onVideoError"
				></video>
			</view>
		</view>
		
		<!-- 视频加载失败提示 -->
		<view class="video-error" v-if="videoError">
			<text class="error-icon">⚠️</text>
			<text class="error-text">视频加载失败，请检查网络连接</text>
			<button class="retry-btn" @tap="retryVideoLoad">重新加载</button>
		</view>
		
		<!-- 操作按钮 -->
		<view class="action-section">
			<button class="action-btn secondary" @tap="addToFavorites">
				❤️ 收藏课程
			</button>
		</view>
	</view>
</template>

<script>
import { apiGetCourseById } from '@/common/api.js';

export default {
	data() {
		return {
			courseId: null,
			course: {},
			courseContent: [],
			videoError: false
		};
	},
	
	computed: {
		// 将中文难度映射为英文class名称
		difficultyClass() {
			const difficultyMap = {
				'入门': 'diff-beginner',
				'初级': 'diff-elementary',
				'中级': 'diff-intermediate',
				'高级': 'diff-advanced'
			};
			return difficultyMap[this.course.difficulty] || 'diff-beginner';
		}
	},
	
	onLoad(options) {
		this.courseId = options.id;
		this.loadCourseDetail();
	},
	
	methods: {
		// 加载课程详情
		async loadCourseDetail() {
			if (!this.courseId) return;
			
			try {
				const res = await apiGetCourseById(this.courseId);
				// res已经是data字段的内容，应该是Course对象
				this.course = res || {};
				
				// 解析课程内容
				if (this.course.content) {
					try {
						this.courseContent = JSON.parse(this.course.content);
					} catch (e) {
						console.error('解析课程内容失败:', e);
						this.courseContent = [];
					}
				}
				
				// 设置页面标题
				uni.setNavigationBarTitle({
					title: this.course.courseName || '课程详情'
				});
				
			} catch (error) {
				console.error('加载课程详情失败:', error);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
				setTimeout(() => {
					uni.navigateBack();
				}, 1500);
			}
		},
		

		
		// 添加收藏
		addToFavorites() {
			// 这里可以实现收藏功能
			uni.showToast({
				title: '已收藏',
				icon: 'success'
			});
		},
		
		// 视频加载错误处理
		onVideoError(e) {
			console.error('视频加载失败:', e);
			this.videoError = true;
		},
		
		// 重新加载视频
		retryVideoLoad() {
			this.videoError = false;
			// 强制刷新页面
			this.loadCourseDetail();
		}
	}
};
</script>

<style scoped>
.container {
	background-color: #f5f5f5;
	min-height: 100vh;
}

/* 课程封面 */
.course-header {
	position: relative;
	height: 400rpx;
}

.course-cover {
	width: 100%;
	height: 100%;
}

.course-overlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background: linear-gradient(transparent, rgba(0,0,0,0.7));
	padding: 40rpx 30rpx 30rpx;
	color: white;
}

.course-title {
	font-size: 36rpx;
	font-weight: bold;
	display: block;
	margin-bottom: 10rpx;
}

.course-subtitle {
	font-size: 28rpx;
	opacity: 0.9;
}

/* 信息卡片 */
.info-card {
	background: white;
	margin: -30rpx 20rpx 20rpx;
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1);
}

.info-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 30rpx;
}

.info-item {
	text-align: center;
}

.info-label {
	font-size: 26rpx;
	color: #888;
	display: block;
	margin-bottom: 10rpx;
}

.info-value {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.info-value.difficulty {
	padding: 8rpx 20rpx;
	border-radius: 30rpx;
	color: white;
}

.info-value.diff-beginner {
	background: #4caf50;
}

.info-value.diff-elementary {
	background: #ff9800;
}

.info-value.diff-intermediate {
	background: #f44336;
}

.info-value.diff-advanced {
	background: #9c27b0;
}

/* 内容区域 */
.content-section {
	background: white;
	margin: 0 20rpx 20rpx;
	border-radius: 20rpx;
	padding: 30rpx;
}

.section-header {
	margin-bottom: 30rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.content-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.content-item {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
	padding: 20rpx;
	background: #fafafa;
	border-radius: 15rpx;
}

.item-number {
	width: 50rpx;
	height: 50rpx;
	background: #667eea;
	color: white;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: bold;
	flex-shrink: 0;
}

.item-content {
	flex: 1;
}

.item-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 10rpx;
}

.item-details {
	display: flex;
	flex-wrap: wrap;
	gap: 15rpx;
}

.detail-item {
	font-size: 24rpx;
	color: #666;
	background: white;
	padding: 5rpx 15rpx;
	border-radius: 20rpx;
}

/* 视频区域 */
.video-section {
	background: white;
	margin: 0 20rpx 20rpx;
	border-radius: 20rpx;
	padding: 30rpx;
}

.video-container {
	background: #000;
	border-radius: 15rpx;
	overflow: hidden;
}

.course-video {
	width: 100%;
	height: 400rpx;
}

/* 视频错误提示 */
.video-error {
	padding: 40rpx 30rpx;
	text-align: center;
	background: #fff5f5;
	border-radius: 20rpx;
	margin: 20rpx;
}

.error-icon {
	font-size: 60rpx;
	display: block;
	margin-bottom: 20rpx;
}

.error-text {
	font-size: 28rpx;
	color: #f44336;
	display: block;
	margin-bottom: 30rpx;
}

.retry-btn {
	background: #f44336;
	color: white;
	border: none;
	padding: 15rpx 40rpx;
	border-radius: 50rpx;
	font-size: 26rpx;
}

/* 操作按钮 */
.action-section {
	padding: 20rpx;
	display: flex;
	justify-content: center;
}

.action-btn {
	width: 60%;
	height: 80rpx;
	border-radius: 40rpx;
	font-size: 30rpx;
	font-weight: bold;
	display: flex;
	align-items: center;
	justify-content: center;
}

.action-btn.secondary {
	background: white;
	color: #667eea;
	border: 2rpx solid #667eea;
}
</style>