<template>
	<view class="container" v-if="loaded">
		<view class="challenge-card">
			<view class="challenge-header">
				<image v-if="detail.coverImage" :src="detail.coverImage" class="cover-image" mode="aspectFit"></image>
				<view class="challenge-info">
					<text class="fitness-title">{{ detail.challengeName || detail.title || detail.name }}</text>
					<view class="challenge-meta">
						<text class="meta-item">ID：{{ detail.id }}</text>
						<text class="meta-item" v-if="detail.status !== undefined">状态：{{ ['未开始', '进行中', '已结束'][detail.status] || detail.status }}</text>
						<text class="meta-item">类型：{{ isGroupChallenge ? '组内挑战' : '公开挑战' }}</text>
						<text class="meta-item" v-if="detail.startDate">开始日期：{{ detail.startDate }}</text>
						<text class="meta-item" v-if="detail.endDate">结束日期：{{ detail.endDate }}</text>
						<text class="meta-item" v-if="detail.maxMembers">最大人数：{{ detail.maxMembers }}</text>
					</view>
				</view>
			</view>
			
			<view v-if="detail.trainRequire" class="challenge-requirements">
				<view class="fitness-subtitle">训练要求</view>
				<text class="requirement-text">{{ detail.trainRequire }}</text>
			</view>
		</view>

		<view class="workout-card">
			<view class="fitness-subtitle">操作面板</view>
			<view class="action-buttons">
				<button v-if="!hasJoined" class="btn-fitness-primary" @tap="onJoin" :disabled="joining">
					<text class="btn-text">参与挑战</text>
				</button>
				<view v-else class="joined-status">
					<text class="joined-text">✓ 已参与挑战</text>
				</view>
				<button v-if="hasJoined && !isTrainingRelatedChallenge" class="btn-fitness-secondary" @tap="onPunch" :disabled="punching || (isGroupChallenge && !trainingCompleted)">
					<text class="btn-text">打卡</text>
				</button>
				<view v-if="hasJoined && isGroupChallenge && !trainingCompleted && !isTrainingRelatedChallenge" class="training-requirement">
					<text class="requirement-text">⚠️组挑战需要完成当日协同训练后才能打卡</text>
					<text class="requirement-text">💡请前往"协同训练"页面完成今日训练任务</text>
				</view>
				<view v-if="isTrainingRelatedChallenge" class="info-text">该挑战通过训练计划完成，无需单独打卡</view>
				<button class="btn-fitness-strength" @tap="onViewReport">
					<text class="btn-text">查看报告</text>
				</button>
			</view>
			<view v-if="actionFileUrl" class="action-file">
				<view class="fitness-subtitle">打卡凭证</view>
				<image :src="actionFileUrl" mode="aspectFit" class="action-image"></image>
			</view>
		</view>

		<!-- 挑战报告卡片 -->
		<view class="report-wrapper" v-if="report">
			<!-- 报告头部 -->
			<view class="report-header-card">
				<view class="header-bg">
					<view class="header-main">
						<text class="report-main-title">挑战报告</text>
						<text class="report-challenge-name">{{ report.challengeName || detail.challengeName }}</text>
					</view>
					<view class="status-tag">
						<text class="status-icon">✓</text>
						<text>已完成</text>
					</view>
				</view>
				<view class="header-footer">
					<view class="period-box">
						<text class="period-icon">📅</text>
						<text class="period-text">{{ formatDateRange(report) }}</text>
					</view>
				</view>
			</view>
			
			<!-- 核心统计数据 -->
			<view class="stats-row" v-if="report.participants && report.participants.length > 0">
				<view class="stat-box">
					<text class="stat-box-value" :style="{ color: getRateColor(avgCompletionRate) }">{{ avgCompletionRate }}%</text>
					<text class="stat-box-label">平均完成率</text>
					<view class="stat-box-bar">
						<view class="stat-box-fill" :style="{ width: avgCompletionRate + '%', background: getRateColor(avgCompletionRate) }"></view>
					</view>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-box">
					<text class="stat-box-value highlight">{{ perfectCount }}</text>
					<text class="stat-box-label">全勤人数</text>
					<text class="stat-box-desc">完成率 100%</text>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-box">
					<text class="stat-box-value">{{ totalPunchDays }}</text>
					<text class="stat-box-label">总打卡次数</text>
					<text class="stat-box-desc">累计打卡</text>
				</view>
			</view>
			
			<!-- 参与情况 -->
			<view class="participation-info">
				<view class="info-row">
					<text class="info-name">参与人数</text>
					<text class="info-value">{{ report.participantCount || (report.participants && report.participants.length) || 0 }} 人</text>
				</view>
				<view class="info-row">
					<text class="info-name">挑战天数</text>
					<text class="info-value">{{ calculateTotalDays }} 天</text>
				</view>
			</view>
			
			<!-- 排行榜 -->
			<view class="ranking-card" v-if="report.participants && report.participants.length > 0">
				<view class="ranking-header">
					<text class="ranking-title">打卡排行榜</text>
					<text class="ranking-count">{{ report.participants.length }} 人参与</text>
				</view>
				
				<view class="ranking-body">
					<!-- 表头 -->
					<view class="ranking-thead">
						<text class="th-rank">排名</text>
						<text class="th-user">用户</text>
						<text class="th-days">打卡天数</text>
						<text class="th-rate">完成率</text>
					</view>
					
					<!-- 列表 -->
					<view class="ranking-tbody">
						<view 
							class="ranking-tr"
							v-for="(item, index) in sortedParticipants" 
							:key="index"
							:class="{ 'top-row': index < 3 }"
						>
							<view class="td-rank">
								<text v-if="index === 0" class="rank-medal gold">🥇</text>
								<text v-else-if="index === 1" class="rank-medal silver">🥈</text>
								<text v-else-if="index === 2" class="rank-medal bronze">🥉</text>
								<text v-else class="rank-num">{{ index + 1 }}</text>
							</view>
							<view class="td-user">
								<view class="user-avatar">{{ getAvatarText(item.userId) }}</view>
								<text class="user-name">用户 {{ item.userId }}</text>
								<!-- 打卡图片缩略图 -->
								<image 
									v-if="item.actionFile" 
									class="punch-thumb" 
									:src="item.actionFile" 
									mode="aspectFill"
									@tap="previewImage(item.actionFile)"
								></image>
							</view>
							<view class="td-days">
								<text class="days-val">{{ item.punchDays }}</text>
								<text class="days-unit">天</text>
							</view>
							<view class="td-rate">
								<view class="rate-bar">
									<view class="rate-fill" :style="{ width: item.completionRate + '%' }"></view>
								</view>
								<text class="rate-text">{{ item.completionRate }}%</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { apiChallengeDetail, apiChallengeJoin, apiChallengePunch, apiChallengeReport, apiUploadAction, apiGetFileUrl, apiCheckChallengeParticipation, apiGetTodayTraining } from '@/common/api.js';
import { requireLogin, getUserIdFromToken } from '@/common/auth.js';

export default {
	data() {
		return {
			id: '',
			loaded: false,
			detail: {},
			report: null,
			actionFileUrl: '',
			isTrainingRelatedChallenge: false,
			joining: false,
			punching: false,
			hasJoined: false,
			trainingCompleted: false,
			trainingCheckInterval: null, //定时检查训练状态
			isGroupChallenge: false
		};
	},
	onLoad(query) {
		this.id = query.id;
	},
	onShow() {
		if (!requireLogin()) return;
		this.loadData();
		
		// 如果是组内挑战，启动定时检查训练状态
		if (this.isGroupChallenge && this.hasJoined) {
			this.startTrainingCheckInterval();
		}
	},
	computed: {
		// 按完成率排序的参与者列表（用于排行榜）
		sortedParticipants() {
			if (!this.report || !this.report.participants) return [];
			// 复制数组并排序：完成率高的在前，相同完成率时打卡天数多的在前
			return [...this.report.participants].sort((a, b) => {
				if (b.completionRate !== a.completionRate) {
					return b.completionRate - a.completionRate;
				}
				return b.punchDays - a.punchDays;
			});
		},
		// 计算平均完成率
		avgCompletionRate() {
			if (!this.report || !this.report.participants || this.report.participants.length === 0) {
				return 0;
			}
			const total = this.report.participants.reduce((sum, p) => sum + p.completionRate, 0);
			return Math.round(total / this.report.participants.length);
		},
		// 计算全勤人数（完成率100%）
		perfectCount() {
			if (!this.report || !this.report.participants) return 0;
			return this.report.participants.filter(p => p.completionRate >= 100).length;
		},
		// 计算总打卡次数
		totalPunchDays() {
			if (!this.report || !this.report.participants) return 0;
			return this.report.participants.reduce((sum, p) => sum + p.punchDays, 0);
		},
		// 计算挑战总天数
		calculateTotalDays() {
			if (!this.report || !this.report.startDate || !this.report.endDate) return 0;
			const start = new Date(this.report.startDate);
			const end = new Date(this.report.endDate);
			const diffTime = Math.abs(end - start);
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
			return diffDays;
		}
	},
	methods: {
		// 格式化日期范围显示
		formatDateRange(report) {
			if (!report) return '';
			// 优先使用报告中的日期，否则使用详情中的日期
			const start = report.startDate || this.detail.startDate;
			const end = report.endDate || this.detail.endDate;
			if (!start || !end) return '';
			return `${start} 至 ${end}`;
		},
		
		// 根据完成率返回颜色
		getRateColor(rate) {
			if (rate >= 80) return '#52c41a'; // 绿色-优秀
			if (rate >= 60) return '#faad14'; // 橙色-良好
			return '#ff4d4f'; // 红色-需努力
		},
		
		// 预览打卡图片
		previewImage(url) {
			if (!url) return;
			uni.previewImage({
				urls: [url],
				current: url
			});
		},
		
		// 获取用户头像文字（取用户ID的最后两位）
		getAvatarText(userId) {
			if (!userId) return '?';
			const str = userId.toString();
			return str.slice(-2);
		},
		
		async loadData() {
			try {
				uni.showLoading({ title: '加载中...' });
				const res = await apiChallengeDetail(this.id);
				this.detail = res?.data || res || {};
				
				// 判断是否为训练关联挑战（仅当有训练计划ID时才认为是训练关联挑战）
				// 只有明确与训练计划关联的挑战才不需要打卡按钮
				this.isTrainingRelatedChallenge = !!this.detail.trainingPlanId;
				
				// 判断是否为组内挑战（使用groupId判断，与列表页保持一致）
				this.isGroupChallenge = this.detail.groupId && this.detail.groupId > 0;
				
				// 检查用户是否已经参与了挑战
				await this.checkParticipation();
				
				//检查训练完成状态（仅对组内挑战）
				await this.checkTrainingCompletion();
				
				// 如果是组内挑战且已参与，启动定时检查
				if (this.isGroupChallenge && this.hasJoined) {
					this.startTrainingCheckInterval();
				}
				
				this.loaded = true;
				// 获取打卡记录
				await this.loadPunchRecord();
				uni.hideLoading();
			} catch (e) {
				uni.hideLoading();
				console.error('加载挑战详情失败:', e);
				uni.showToast({ title: '加载失败', icon: 'none' });
				this.loaded = true;
			}
		},
		
		// 检查用户是否参与了挑战
		async checkParticipation() {
			try {
				if (!requireLogin()) return;
				
				const res = await apiCheckChallengeParticipation(this.id);
				this.hasJoined = res?.data ?? res ?? false;
			} catch (e) {
				console.error('检查参与状态失败:', e);
				// 如果接口调用失败，默认为false，让用户可以尝试加入
				this.hasJoined = false;
			}
		},
		
		async loadPunchRecord() {
			try {
				// 检查登录状态
				if (!requireLogin()) return;
						
				const now = new Date();
				const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
						
				//检查今天的打卡记录，如果有则获取actionFile
				// 由于后端没有提供获取打卡记录的接口，我们暂时跳过这个功能
			} catch (e) {
				console.error('获取打卡记录失败:', e);
			}
		},
				
		async checkTrainingCompletion() {
			try {
				// 如果不是组内挑战，直接返回true
				if (!this.isGroupChallenge) {
					this.trainingCompleted = true;
					return;
				}
						
				//检查登录状态
				if (!requireLogin()) return;
						
				//调用API检查当日训练完成情况
				const now = new Date();
				const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
						
				// 获取今日训练记录，检查是否已完成
				const res = await apiGetTodayTraining();
				const todayTrainings = res?.data || res || [];
						
				//检查是否有已完成的训练记录
				const completedTraining = todayTrainings.some(record => 
					record.status === 1 && //状态为已完成
					record.trainDate === date // 日期为今天
				);
						
				this.trainingCompleted = completedTraining;
						
				if (!completedTraining && this.isGroupChallenge) {
					console.log('组内挑战：用户今日训练未完成，无法打卡');
				}
			} catch (e) {
				console.error('检查训练完成状态失败:', e);
				//出错时默认为未完成，防止用户误打卡
				this.trainingCompleted = false;
			}
		},
		
		//启动定时检查训练状态
		startTrainingCheckInterval() {
			// 如果已有定时器，先清除
			if (this.trainingCheckInterval) {
				clearInterval(this.trainingCheckInterval);
			}
			
			//30秒检查一次训练状态
			this.trainingCheckInterval = setInterval(async () => {
				if (this.isGroupChallenge && this.hasJoined && !this.trainingCompleted) {
					await this.checkTrainingCompletion();
				}
			}, 30000);
		},
		
		//停止定时检查
		stopTrainingCheckInterval() {
			if (this.trainingCheckInterval) {
				clearInterval(this.trainingCheckInterval);
				this.trainingCheckInterval = null;
			}
		},
		
		async onJoin() {
			// 防止重复点击
			if (this.joining) return;
			
			try {
				this.joining = true;
				// 检查登录状态
				if (!requireLogin()) {
					uni.showToast({ title: '请先登录', icon: 'none' });
					return;
				}
				
				uni.showLoading({ title: '参与中...' });
				await apiChallengeJoin({ 
					challengeId: this.id 
				});
				uni.hideLoading();
				uni.showToast({ title: '已参与', icon: 'success' });
				// 刷新详情
				await this.loadData();
			} catch (e) {
				uni.hideLoading();
				console.error('参与挑战失败:', e);
				// 特别处理"已参与该挑战"的错误
				if (e.message && e.message.includes('已参与该挑战')) {
					uni.showToast({ title: '您已参与该挑战', icon: 'none' });
				} else {
					uni.showToast({ title: e.errMsg || '参与失败，请重试', icon: 'none' });
				}
			} finally {
				this.joining = false;
			}
		},
		
		async onPunch() {
			// 防止重复点击
			if (this.punching) return;
			
			try {
				this.punching = true;
				// 选择文件上传
				uni.chooseImage({
					count: 1,
					sourceType: ['album', 'camera'],
					success: async (res) => {
						try {
							// 检查登录状态
							if (!requireLogin()) {
								uni.showToast({ title: '请先登录', icon: 'none' });
								return;
							}
							
							// 显示上传提示
							uni.showLoading({
								title: '上传中...'
							});
							// 上传文件
							const uploadRes = await apiUploadAction(res.tempFilePaths[0]);
							uni.hideLoading();
							// 日期格式处理
							const now = new Date();
							const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
							// 从上传响应中获取对象名
							let objectName = '';
							if (uploadRes && typeof uploadRes === 'object') {
								if (uploadRes.data) {
									objectName = typeof uploadRes.data === 'string' ? uploadRes.data : JSON.stringify(uploadRes.data);
								} else {
									objectName = JSON.stringify(uploadRes);
								}
							} else {
								objectName = uploadRes;
							}
							// 获取可访问的URL
							let accessibleUrl = objectName;
							if (objectName) {
								const urlRes = await apiGetFileUrl({ objectName: objectName });
								accessibleUrl = urlRes.data || urlRes || objectName;
							}
							// 调用打卡接口
							await apiChallengePunch({ 
								challengeId: this.id,
								date: date,
								actionFile: objectName
							});
							uni.showToast({ title: '打卡成功', icon: 'success' });
							// 保存上传的可访问文件URL
							this.actionFileUrl = accessibleUrl;
						} catch (e) {
							uni.hideLoading();
							console.error('打卡失败:', e);
							uni.showToast({ title: e.errMsg || '打卡失败，请重试', icon: 'none' });
						}
					},
					fail: () => {
						// 用户取消选择
						uni.showToast({ title: '取消打卡', icon: 'none' });
					}
				});
			} finally {
				// 重置状态
				this.punching = false;
			}
		},
		
		onViewReport() {
			var self = this;
			uni.showLoading({ title: '加载中...' });
			
			apiChallengeReport(self.id).then(function(res) {
				uni.hideLoading();
				console.log('报告数据:', JSON.stringify(res));
				self.report = res || {};
				uni.showToast({ title: '加载成功', icon: 'success' });
			}).catch(function(err) {
				uni.hideLoading();
				console.error('错误:', err);
				uni.showToast({ title: '加载失败', icon: 'none' });
			});
		},
		
		onUnload() {
			//页面卸载时清理定时器
			this.stopTrainingCheckInterval();
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

.challenge-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(10rpx);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.challenge-header {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.cover-image {
	width: 100%;
	height: 300rpx;
	border-radius: 16rpx;
	margin-bottom: 20rpx;
	object-fit: cover;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);
}

.challenge-info {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.challenge-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 15rpx;
}

.meta-item {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 12rpx 20rpx;
	border-radius: 50rpx;
	font-size: 24rpx;
	color: #fff;
	font-weight: 500;
	box-shadow: 0 4rpx 10rpx rgba(102, 126, 234, 0.3);
}

.challenge-requirements {
	margin-top: 20rpx;
	padding: 25rpx;
	background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
	border-radius: 16rpx;
	border-left: 5rpx solid #667eea;
}

.requirement-text {
	font-size: 28rpx;
	color: #333;
	line-height: 1.6;
	word-break: break-word;
}

.workout-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(10rpx);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.stats-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(10rpx);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
}

/* ==================== 挑战报告样式（清晰版） ==================== */
.report-wrapper {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 30rpx;
	margin-top: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

/* 报告头部卡片 */
.report-header-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20rpx;
	overflow: hidden;
	margin-bottom: 30rpx;
}

.header-bg {
	padding: 40rpx 30rpx;
}

.header-main {
	text-align: center;
}

.report-main-title {
	display: block;
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-bottom: 12rpx;
}

.report-challenge-name {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #fff;
	margin-bottom: 20rpx;
}

.status-tag {
	display: inline-flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.2);
	padding: 10rpx 24rpx;
	border-radius: 30rpx;
	font-size: 24rpx;
	color: #fff;
}

.status-icon {
	margin-right: 8rpx;
	font-weight: 700;
}

.header-footer {
	background: rgba(0, 0, 0, 0.1);
	padding: 20rpx 30rpx;
}

.period-box {
	display: flex;
	align-items: center;
	justify-content: center;
}

.period-icon {
	font-size: 28rpx;
	margin-right: 10rpx;
}

.period-text {
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.9);
}

/* 核心统计数据行 */
.stats-row {
	display: flex;
	align-items: center;
	background: #f8f9fa;
	border-radius: 16rpx;
	padding: 30rpx 20rpx;
	margin-bottom: 24rpx;
}

.stat-box {
	flex: 1;
	text-align: center;
}

.stat-box-value {
	display: block;
	font-size: 48rpx;
	font-weight: 700;
	color: #333;
	margin-bottom: 8rpx;
}

.stat-box-value.highlight {
	color: #52c41a;
}

.stat-box-label {
	display: block;
	font-size: 24rpx;
	color: #666;
	margin-bottom: 12rpx;
}

.stat-box-bar {
	width: 70%;
	height: 8rpx;
	background: #e8e8e8;
	border-radius: 4rpx;
	margin: 0 auto;
	overflow: hidden;
}

.stat-box-fill {
	height: 100%;
	border-radius: 4rpx;
	transition: width 0.6s ease;
}

.stat-box-desc {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-top: 8rpx;
}

.stat-divider {
	width: 2rpx;
	height: 80rpx;
	background: #e0e0e0;
}

/* 参与情况 */
.participation-info {
	background: #f8f9fa;
	border-radius: 16rpx;
	padding: 24rpx 30rpx;
	margin-bottom: 24rpx;
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16rpx 0;
	border-bottom: 1rpx solid #e8e8e8;
}

.info-row:last-child {
	border-bottom: none;
}

.info-name {
	font-size: 28rpx;
	color: #666;
}

.info-value {
	font-size: 30rpx;
	color: #333;
	font-weight: 600;
}

/* 排行榜卡片 */
.ranking-card {
	background: #fff;
	border: 2rpx solid #f0f0f0;
	border-radius: 16rpx;
	overflow: hidden;
}

.ranking-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 30rpx;
	background: #fafafa;
	border-bottom: 2rpx solid #f0f0f0;
}

.ranking-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #333;
}

.ranking-count {
	font-size: 24rpx;
	color: #999;
}

/* 表头 */
.ranking-thead {
	display: flex;
	padding: 20rpx 30rpx;
	background: #f5f5f5;
	border-bottom: 2rpx solid #e8e8e8;
}

.ranking-thead text {
	font-size: 24rpx;
	color: #666;
	font-weight: 600;
}

.th-rank {
	width: 80rpx;
	text-align: center;
}

.th-user {
	flex: 1;
}

.th-days {
	width: 140rpx;
	text-align: center;
}

.th-rate {
	width: 180rpx;
	text-align: center;
}

/* 表格行 */
.ranking-tr {
	display: flex;
	align-items: center;
	padding: 24rpx 30rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.ranking-tr:last-child {
	border-bottom: none;
}

.ranking-tr.top-row {
	background: #fafafa;
}

.td-rank {
	width: 80rpx;
	text-align: center;
}

.rank-medal {
	font-size: 36rpx;
}

.rank-num {
	font-size: 28rpx;
	color: #999;
	font-weight: 600;
}

.td-user {
	flex: 1;
	display: flex;
	align-items: center;
}

.user-avatar {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	font-size: 22rpx;
	font-weight: 600;
	border-radius: 50%;
	margin-right: 16rpx;
}

.user-name {
	font-size: 28rpx;
	color: #333;
}

/* 打卡图片缩略图 */
.punch-thumb {
	width: 48rpx;
	height: 48rpx;
	border-radius: 8rpx;
	margin-left: 12rpx;
	border: 2rpx solid #e8e8e8;
}

.td-days {
	width: 140rpx;
	text-align: center;
}

.days-val {
	font-size: 32rpx;
	font-weight: 700;
	color: #667eea;
}

.days-unit {
	font-size: 22rpx;
	color: #999;
	margin-left: 4rpx;
}

.td-rate {
	width: 180rpx;
	text-align: center;
}

.rate-bar {
	width: 100rpx;
	height: 10rpx;
	background: #e8e8e8;
	border-radius: 5rpx;
	overflow: hidden;
	margin: 0 auto 8rpx;
}

.rate-fill {
	height: 100%;
	background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
	border-radius: 5rpx;
	transition: width 0.6s ease;
}

.rate-text {
	font-size: 24rpx;
	color: #667eea;
	font-weight: 600;
}

.info-value.highlight {
	color: #ffd700;
	font-weight: 700;
}

/* 排行榜样式 */
.ranking-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 25rpx;
}

.section-title {
	display: flex;
	align-items: center;
	font-size: 32rpx;
	font-weight: 700;
	color: #333;
	margin-bottom: 25rpx;
}

.title-icon {
	font-size: 36rpx;
	margin-right: 12rpx;
}

.ranking-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.ranking-item {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	transition: all 0.3s ease;
}

.ranking-item.top3 {
	background: linear-gradient(135deg, #fff9e6 0%, #fff5d6 100%);
	border: 2rpx solid #ffd700;
}

.rank-number {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #e9ecef;
	border-radius: 50%;
	margin-right: 20rpx;
	font-size: 28rpx;
	font-weight: 700;
	color: #666;
}

.rank-number.top {
	background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
	color: #fff;
	font-size: 32rpx;
}

.rank-info {
	flex: 1;
}

.rank-name {
	font-size: 28rpx;
	color: #333;
	font-weight: 600;
	display: block;
	margin-bottom: 10rpx;
}

.rank-progress {
	display: flex;
	align-items: center;
	gap: 15rpx;
}

.progress-bar {
	flex: 1;
	height: 12rpx;
	background: #e9ecef;
	border-radius: 6rpx;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
	border-radius: 6rpx;
	transition: width 0.5s ease;
}

.progress-text {
	font-size: 24rpx;
	color: #667eea;
	font-weight: 600;
	min-width: 120rpx;
	text-align: right;
}

/* 统计摘要 */
.summary-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 30rpx;
}

.summary-grid {
	display: flex;
	justify-content: space-around;
}

.summary-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20rpx;
}

.summary-value {
	font-size: 48rpx;
	font-weight: 700;
	color: #667eea;
	margin-bottom: 10rpx;
}

.summary-label {
	font-size: 24rpx;
	color: #666;
}

.action-buttons {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	margin-top: 20rpx;
}

.btn-fitness-primary {
	width: 100%;
	height: 80rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border: none;
	border-radius: 40rpx;
	color: white;
	font-size: 32rpx;
	font-weight: 600;
	box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
	position: relative;
	overflow: hidden;
}

.btn-fitness-primary::after {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 100%;
	height: 100%;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
	transition: left 0.5s;
}

.btn-fitness-primary:active::after {
	left: 100%;
}

.btn-fitness-primary:active {
	transform: scale(0.95);
}

.btn-fitness-secondary {
	width: 100%;
	height: 80rpx;
	background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
	border: none;
	border-radius: 40rpx;
	color: #52c41a;
	font-size: 32rpx;
	font-weight: 600;
	box-shadow: 0 8rpx 20rpx rgba(82, 196, 26, 0.2);
	position: relative;
	overflow: hidden;
}

.btn-fitness-secondary::after {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 100%;
	height: 100%;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
	transition: left 0.5s;
}

.btn-fitness-secondary:active::after {
	left: 100%;
}

.btn-fitness-secondary:active {
	transform: scale(0.95);
}

.btn-fitness-strength {
	width: 100%;
	height: 80rpx;
	background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
	border: none;
	border-radius: 40rpx;
	color: #d46b08;
	font-size: 32rpx;
	font-weight: 600;
	box-shadow: 0 8rpx 20rpx rgba(212, 107, 8, 0.2);
	position: relative;
	overflow: hidden;
}

.btn-fitness-strength::after {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 100%;
	height: 100%;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
	transition: left 0.5s;
}

.btn-fitness-strength:active::after {
	left: 100%;
}

.btn-fitness-strength:active {
	transform: scale(0.95);
}

.btn-fitness-primary:disabled,
.btn-fitness-secondary:disabled,
.btn-fitness-strength:disabled {
	opacity: 0.6;
	transform: none;
	pointer-events: none;
}

.btn-text {
	color: white;
	font-weight: 600;
	font-size: 32rpx;
}

.info-text {
	font-size: 28rpx;
	color: #666;
	padding: 16rpx 24rpx;
	background: linear-gradient(135deg, #fef9d7 0%, #d299c2 100%);
	border-radius: 16rpx;
	margin: 12rpx 0;
	text-align: center;
	font-weight: 500;
}

.action-file {
	margin-top: 25rpx;
}

.action-image {
	width: 100%;
	height: 200rpx;
	border-radius: 16rpx;
	border: 2rpx solid #f5576c;
	box-shadow: 0 8rpx 20rpx rgba(245, 87, 108, 0.2);
	object-fit: cover;
}

/* 为新添加的元素添加额外样式 */
.fitness-title {
	font-size: 40rpx;
	text-align: center;
	font-weight: 700;
	color: #333;
	margin-bottom: 10rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
}

.fitness-subtitle {
	font-size: 32rpx;
	color: #667eea;
	margin: 20rpx 0 16rpx 0;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.fitness-subtitle::before {
	content: "▶";
	font-size: 24rpx;
	color: #f5576c;
	transform: scale(0.8);
}

.sub {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #666;
	font-style: italic;
	word-break: break-word;
	background: #f8f9fa;
	padding: 15rpx;
	border-radius: 12rpx;
	border-left: 4rpx solid #667eea;
}

.joined-status {
	padding: 20rpx;
	text-align: center;
	background: #e8f5e9;
	border-radius: 16rpx;
	margin-bottom: 20rpx;
}

.joined-text {
	font-size: 28rpx;
	color: #4caf50;
	font-weight: 500;
}

.training-requirement {
	padding: 15rpx;
	background: #fff3cd;
	border-radius: 12rpx;
	margin: 15rpx 0;
	border-left: 4rpx solid #ffc107;
}

.requirement-text {
	font-size: 26rpx;
	color: #856404;
	line-height: 1.4;
}
</style>