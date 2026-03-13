<template>
	<view class="container" v-if="loaded">
		<!-- 组信息卡片 -->
		<view class="challenge-card">
			<view class="group-header">
				<view class="group-info">
					<text class="fitness-title">{{ detail.groupName || '未命名搭子组' }}</text>
					<view class="group-stats">
						<text class="stat-item">👥 {{ detail.members ? detail.members.length : 0 }}人</text>
						<text class="stat-item">⏰ {{ detail.fixedTime || '-' }}</text>
					</view>
				</view>
				<button class="btn-fitness-primary" @tap="showInvite = true">
					<text class="btn-text">邀请搭子</text>
				</button>
			</view>
		</view>

		<!-- 组成员列表 -->
		<view class="workout-card">
			<view class="section-header">
				<text class="fitness-subtitle">组成员</text>
				<text class="section-count">{{ detail.members ? detail.members.length : 0 }}人</text>
			</view>
			<view class="members-list">
				<view class="member-item" v-for="(member, index) in detail.members" :key="member.id">
					<view class="member-avatar">
						<image v-if="member.avatar" :src="member.avatar" class="avatar-img" mode="aspectFill"></image>
						<text v-else class="avatar-text">{{ member.nickname ? member.nickname.charAt(0) : '#' }}</text>
					</view>
					<view class="member-info">
						<view class="member-name-role">
							<text class="member-name">{{ member.nickname || ('搭子 ' + member.userId) }}</text>
							<text class="member-role" v-if="member.role === 'ADMIN'">组长</text>
						</view>
						<text class="member-time" v-if="member.createTime">加入时间: {{ formatDate(member.createTime) }}</text>
					</view>
					<view class="member-badge" v-if="member.role === 'ADMIN'">
						<text class="badge-text">管理员</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 组内挑战列表 -->
		<view class="workout-card">
			<view class="section-header">
				<text class="fitness-subtitle">组内挑战</text>
				<button class="btn-fitness-strength" @tap="showCreateChallenge = true">
					<text class="btn-text">创建挑战</text>
				</button>
			</view>
			<view v-if="groupChallenges.length === 0" class="empty-challenges">
				<text class="empty-text">暂无挑战，快创建第一个挑战吧！</text>
			</view>
			<view v-else class="challenges-list">
				<view class="challenge-item" v-for="challenge in groupChallenges" :key="challenge.id" @tap="goToChallengeDetail(challenge.id)">
					<image v-if="challenge.coverImage" :src="challenge.coverImage" class="challenge-cover" mode="aspectFill"></image>
					<view class="challenge-info">
						<text class="challenge-name">{{ challenge.challengeName || challenge.title || challenge.name }}</text>
						<view class="challenge-meta">
							<text class="challenge-status" :class="'status-' + challenge.status">{{ ['未开始', '进行中', '已结束'][challenge.status] || challenge.status }}</text>
							<text class="challenge-date">{{ challenge.startDate }} 至 {{ challenge.endDate }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部操作按钮 -->
		<view class="bottom-actions">
			<button class="btn-fitness-cardio" @tap="goToChatRoom">
				<text class="btn-text">进入聊天室</text>
			</button>
		</view>

		<!-- 邀请弹层 -->
		<view v-if="showInvite" class="popup-mask" @tap="closeInvitePopup">
			<view class="popup" @tap.stop>
				<view class="popup-header">
					<text class="popup-title">邀请搭子</text>
					<text class="popup-close" @tap.stop="closeInvitePopup">✕</text>
				</view>
				<view class="invite-input-area">
					<view class="input-wrapper">
						<text class="input-icon">👤</text>
						<input
						  class="invite-input"
						  type="text"
						  v-model="inviteForm.username"
						  placeholder="请输入对方用户名"
						/>
					</view>
				</view>
				<view class="popup-actions">
					<button class="btn-fitness-secondary" @tap="closeInvitePopup">
						<text class="btn-text">取消</text>
					</button>
					<button class="btn-fitness-primary" @tap="doInvite">
						<text class="btn-text">发送邀请</text>
					</button>
				</view>
			</view>
		</view>

		<!-- 创建挑战弹层 -->
		<view v-if="showCreateChallenge" class="popup-mask" @tap="showCreateChallenge = false">
			<view class="popup-large" @tap.stop>
				<view class="popup-header">
					<text class="popup-title">创建组内挑战</text>
					<text class="popup-close" @tap="showCreateChallenge = false">✕</text>
				</view>
				<textarea 
				  class="input-fitness" 
				  v-model="createChallengeForm.name" 
				  placeholder="挑战名称"
				  :adjust-position="true"
				  auto-height
				  style="min-height: 70rpx;"
				/>
				<textarea class="input-fitness" v-model="createChallengeForm.desc" placeholder="挑战说明" />
				<view class="date-picker-row">
					<view class="date-input">
						<text class="label">开始日期</text>
						<picker mode="date" :value="createChallengeForm.startDate" @change="onStartDateChange">
							<view class="picker-value">{{ createChallengeForm.startDate || '选择开始日期' }}</view>
						</picker>
					</view>
					<view class="date-input">
						<text class="label">结束日期</text>
						<picker mode="date" :value="createChallengeForm.endDate" @change="onEndDateChange">
							<view class="picker-value">{{ createChallengeForm.endDate || '选择结束日期' }}</view>
						</picker>
					</view>
				</view>
				<input class="input-fitness" v-model.number="createChallengeForm.maxMembers" placeholder="最大参与人数" />
				<button class="btn-fitness-strength" @tap="selectChallengeCoverImage">
					<text class="btn-text">上传封面图片</text>
				</button>
				<view v-if="challengeCoverImageUrl" class="cover-preview">
					<image :src="challengeCoverImageUrl" mode="aspectFit" class="cover-image"></image>
				</view>
				<view class="popup-actions">
					<button class="btn-fitness-secondary" @tap="showCreateChallenge = false">
						<text class="btn-text">取消</text>
					</button>
					<button class="btn-fitness-primary" @tap="onCreateGroupChallenge">
						<text class="btn-text">创建</text>
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { apiGroupDetailWithMembers, apiInviteToGroupByUsername, apiCreateGroupChallenge, apiGetGroupChallenges, apiUploadAction, apiGetFileUrl, apiCheckChallengeParticipation } from '@/common/api.js';
import { requireLogin, getUserIdFromToken } from '@/common/auth.js';

export default {
	data() {
		return {
			id: '',
			loaded: false,
			detail: {},
			groupChallenges: [],
			showInvite: false,
			showCreateChallenge: false,
			inviteForm: {
				username: ''
			},
			createChallengeForm: {
				name: '',
				desc: '',
				startDate: '',
				endDate: '',
				maxMembers: 10
			},
			challengeCoverImageUrl: ''
		};
	},
	onLoad(query) {
		this.id = query && query.id ? Number(query.id) : null;
		console.log('群组详情页加载，groupId:', this.id);
	},
	onShow() {
		if (!requireLogin()) return;
		this.loadData();
	},
	methods: {
		async loadData() {
			try {
				uni.showLoading({ title: '加载中...' });
				const res = await apiGroupDetailWithMembers(this.id);
				this.detail = res?.data || res || {};
				this.loaded = true;
				uni.hideLoading();
				
				// 加载组内挑战
				await this.loadGroupChallenges();
			} catch (e) {
				uni.hideLoading();
				console.error('Failed to load group detail:', e);
				uni.showToast({
					title: '加载组信息失败',
					icon: 'none'
				});
				this.loaded = true;
			}
		},

		async loadGroupChallenges() {
			try {
				const res = await apiGetGroupChallenges(this.id);
				this.groupChallenges = res?.data || res || [];
			} catch (e) {
				console.error('Failed to load group challenges:', e);
				uni.showToast({
					title: '加载组内挑战失败',
					icon: 'none'
				});
			}
		},

		async onInvite() {
			if (!this.inviteForm.username) {
				uni.showToast({ title: '请输入用户名', icon: 'none' });
				return;
			}
						
			if (this.inviteForm.username.trim().length < 2) {
				uni.showToast({ title: '用户名至少需要2个字符', icon: 'none' });
				return;
			}
						
			try {
				uni.showLoading({ title: '发送中...' });
				const userId = getUserIdFromToken();
				await apiInviteToGroupByUsername({
					fromUserId: userId,
					toUsername: this.inviteForm.username,
					groupId: this.id
				});
				uni.hideLoading();
				uni.showToast({ title: '邀请已发送', icon: 'success' });
				this.showInvite = false;
				this.inviteForm.username = '';
			} catch (e) {
				uni.hideLoading();
				uni.showToast({ title: '邀请发送失败', icon: 'none' });
			}
		},

		closeInvitePopup() {
			this.showInvite = false;
			this.inviteForm.username = '';
		},

		doInvite() {
			if (!this.inviteForm.username || this.inviteForm.username.trim().length < 2) {
				uni.showToast({ title: '用户名至少2个字符', icon: 'none' });
				return;
			}
			this.onInvite();
		},

		goToChatRoom() {
			uni.navigateTo({ url: `/pages/group/chat?id=${this.id}` });
		},
		
		// 格式化日期时间
		formatDate(dateString) {
			if (!dateString) return '';
			
			// 处理不同格式的日期
			let date;
			if (typeof dateString === 'string' && dateString.includes('T')) {
				// 处理 ISO 8601 格式 (如: 2023-12-25T10:30:00)
				date = new Date(dateString);
			} else if (typeof dateString === 'number') {
				// 处理时间戳
				date = new Date(dateString);
			} else {
				// 处理其他格式
				date = new Date(dateString);
			}
			
			// 检查日期是否有效
			if (isNaN(date.getTime())) {
				return '';
			}
			
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		},

		onStartDateChange(e) {
			this.createChallengeForm.startDate = e.detail.value;
		},

		onEndDateChange(e) {
			this.createChallengeForm.endDate = e.detail.value;
		},

		async selectChallengeCoverImage() {
			// 选择封面图片上传
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
						// 上传文件
						uni.showLoading({ title: '上传中...' });
						const uploadRes = await apiUploadAction(res.tempFilePaths[0]);
						uni.hideLoading();
						uni.showToast({ title: '上传成功', icon: 'success' });
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
						if (objectName) {
							const urlRes = await apiGetFileUrl({ objectName: objectName });
							this.challengeCoverImageUrl = urlRes.data || urlRes || objectName;
						} else {
							this.challengeCoverImageUrl = objectName;
						}
					} catch (e) {
						uni.hideLoading();
						console.error('封面图片上传失败:', e);
						uni.showToast({ title: e.errMsg || '上传失败，请重试', icon: 'none' });
					}
				},
				fail: () => {
					uni.showToast({ title: '取消上传', icon: 'none' });
				}
			});
		},

		async onCreateGroupChallenge() {
			if (!this.createChallengeForm.name) {
				uni.showToast({ title: '请输入挑战名称', icon: 'none' });
				return;
			}
			
			if (!this.createChallengeForm.startDate || !this.createChallengeForm.endDate) {
				uni.showToast({ title: '请选择开始和结束日期', icon: 'none' });
				return;
			}
			
			if (!this.createChallengeForm.maxMembers || this.createChallengeForm.maxMembers <= 0) {
				uni.showToast({ title: '请输入有效的最大参与人数', icon: 'none' });
				return;
			}

			try {
				uni.showLoading({ title: '创建中...' });
				const challengeData = {
					groupId: parseInt(this.id),
					name: this.createChallengeForm.name,
					startDate: this.createChallengeForm.startDate,
					endDate: this.createChallengeForm.endDate,
					trainRequire: this.createChallengeForm.desc || '每日训练挑战',
					maxMembers: parseInt(this.createChallengeForm.maxMembers),
					coverImage: this.challengeCoverImageUrl
				};

				const res = await apiCreateGroupChallenge(challengeData);
				uni.hideLoading();
				uni.showToast({ title: '挑战创建成功', icon: 'success' });

				// 清空表单
				this.createChallengeForm = {
					name: '',
					desc: '',
					startDate: '',
					endDate: '',
					maxMembers: 10
				};
				this.challengeCoverImageUrl = '';

				// 关闭弹窗
				this.showCreateChallenge = false;

				// 重新加载挑战列表
				await this.loadGroupChallenges();
			} catch (e) {
				uni.hideLoading();
				console.error('创建组内挑战失败:', e);
				uni.showToast({ 
					title: e.errMsg || '创建失败，请重试', 
					icon: 'none' 
				});
			}
		},

		async goToChallengeDetail(challengeId) {
			// 在跳转前可以检查用户是否已参与挑战，但这取决于具体需求
			// 目前我们只是简单跳转，挑战详情页会自行检查参与状态
			uni.navigateTo({ url: `/pages/challenge/detail?id=${challengeId}` });
		}
	}
};
</script>

<style scoped>
/* 基础容器样式优化 */
.container {
	padding: 0;
	background: #f8f9fa;
	min-height: 100vh;
}

/* 组信息卡片美化 - 渐变更柔和，增加阴影和圆角 */
.challenge-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 40rpx 30rpx;
	color: white;
	border-radius: 0 0 32rpx 32rpx;
	box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.2);
	margin-bottom: 20rpx;
}

.group-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 20rpx;
}

.group-info {
	flex: 1;
}

.fitness-title {
	font-size: 38rpx;
	font-weight: 700;
	display: block;
	margin-bottom: 20rpx;
	letter-spacing: 1rpx;
}

.group-stats {
	display: flex;
	flex-wrap: wrap;
	gap: 20rpx;
}

.stat-item {
	font-size: 26rpx;
	opacity: 0.95;
	display: flex;
	align-items: center;
	gap: 8rpx;
}

/* 卡片通用样式优化 - 更精致的阴影和圆角 */
.workout-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin: 0 20rpx 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.workout-card:active {
	transform: translateY(2rpx);
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

/* 分区头部样式优化 */
.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
	padding-bottom: 16rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.fitness-subtitle {
	font-size: 32rpx;
	font-weight: 600;
	color: #2d3748;
}

.section-count {
	font-size: 24rpx;
	color: #718096;
}

/* 成员列表样式优化 */
.members-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.member-item {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background-color: #fafafa;
	border-radius: 16rpx;
	gap: 20rpx;
	transition: background-color 0.2s ease;
}

.member-item:hover {
	background-color: #f5f5f5;
}

.member-avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
	box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.15);
}

.avatar-img {
	width: 100%;
	height: 100%;
}

.avatar-text {
	color: white;
	font-weight: 600;
	font-size: 34rpx;
}

.member-info {
	flex: 1;
}

.member-name-role {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 8rpx;
}

.member-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #2d3748;
}

.member-role {
	font-size: 22rpx;
	color: #667eea;
	background-color: rgba(102, 126, 234, 0.1);
	padding: 6rpx 12rpx;
	border-radius: 12rpx;
	font-weight: 500;
}

.member-time {
	font-size: 24rpx;
	color: #718096;
}

.member-badge {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 8rpx 16rpx;
	border-radius: 12rpx;
	font-size: 22rpx;
	flex-shrink: 0;
	box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.2);
}

/* 底部操作按钮样式 */
.bottom-actions {
	padding: 30rpx 30rpx 60rpx;
}

/* 弹窗样式优化 */
.popup-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 999;
	backdrop-filter: blur(4rpx);
}

.popup {
	width: 80%;
	background-color: #fff;
	border-radius: 24rpx;
	padding: 40rpx 30rpx;
	animation: popupSlideIn 0.3s ease-out;
	z-index: 1002;
	box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15);
}

.popup-large {
	width: 90%;
	background-color: #fff;
	border-radius: 24rpx;
	padding: 40rpx 30rpx;
	animation: popupSlideIn 0.3s ease-out;
	max-height: 85vh;
	overflow-y: auto;
	z-index: 1002;
	margin-top: 5vh;
	box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15);
}

@keyframes popupSlideIn {
	from {
		transform: translateY(100%);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

.popup-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30rpx;
	padding-bottom: 16rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.popup-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #2d3748;
}

.popup-close {
	font-size: 38rpx;
	color: #718096;
	padding: 10rpx;
	transition: color 0.2s ease;
}

.popup-close:active {
	color: #4a5568;
}

/* 日期选择器样式优化 */
.date-picker-row {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
	margin-bottom: 24rpx;
}

.date-input {
	width: 100%;
	margin-bottom: 12rpx;
	position: relative;
	z-index: 1003;
}

.label {
	display: block;
	font-size: 28rpx;
	color: #4a5568;
	margin-bottom: 10rpx;
	font-weight: 500;
}

.picker-value {
	width: 100%;
	padding: 24rpx 20rpx;
	background-color: #f8f9fa;
	border-radius: 16rpx;
	border: 2rpx solid #e9ecef;
	font-size: 28rpx;
	text-align: left;
	min-height: 44px;
	box-sizing: border-box;
	transition: border-color 0.2s ease;
}

.picker-value:active {
	border-color: #667eea;
}

.popup-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 30rpx;
}

/* 空状态样式优化 */
.empty-challenges {
	text-align: center;
	padding: 80rpx 0;
}

.empty-text {
	color: #718096;
	font-size: 28rpx;
}

/* 挑战列表样式优化 */
.challenges-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.challenge-item {
	display: flex;
	gap: 20rpx;
	padding: 20rpx;
	background-color: #f8f9fa;
	border-radius: 16rpx;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.challenge-item:active {
	transform: translateY(2rpx);
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.challenge-cover {
	width: 120rpx;
	height: 120rpx;
	border-radius: 16rpx;
	flex-shrink: 0;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.challenge-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.challenge-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #2d3748;
	display: block;
	margin-bottom: 12rpx;
}

.challenge-meta {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.challenge-status {
	display: inline-block;
	font-size: 22rpx;
	padding: 6rpx 12rpx;
	border-radius: 12rpx;
	align-self: flex-start;
	font-weight: 500;
}

.status-0 {
	background-color: #e3f2fd;
	color: #2196f3;
}

.status-1 {
	background-color: #e8f5e9;
	color: #4caf50;
}

.status-2 {
	background-color: #f5f5f5;
	color: #9e9e9e;
}

.challenge-date {
	font-size: 24rpx;
	color: #718096;
}

/* 封面预览样式 */
.cover-preview {
	margin-top: 20rpx;
	text-align: center;
}

.cover-image {
	width: 180rpx;
	height: 180rpx;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

/* 按钮样式统一优化 (假设主题样式里的按钮样式也同步优化) */
.btn-fitness-primary,
.btn-fitness-secondary,
.btn-fitness-strength,
.btn-fitness-cardio {
	border-radius: 16rpx;
	padding: 20rpx;
	font-weight: 600;
	transition: all 0.2s ease;
}

.btn-fitness-primary {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border: none;
}

.btn-fitness-primary:active {
	opacity: 0.9;
	transform: translateY(2rpx);
}

.btn-fitness-secondary {
	background: #f8f9fa;
	color: #4a5568;
	border: 1rpx solid #e9ecef;
}

.btn-fitness-secondary:active {
	background: #f0f0f0;
}

.btn-fitness-strength {
	background: #fdf2f8;
	color: #9f7aea;
	border: 1rpx solid #fef7fb;
}

.btn-fitness-strength:active {
	background: #fef7fb;
}

.btn-fitness-cardio {
	background: linear-gradient(135deg, #38b2ac 0%, #4299e1 100%);
	color: #fff;
	border: none;
	width: 100%;
}

.btn-fitness-cardio:active {
	opacity: 0.9;
	transform: translateY(2rpx);
}

.btn-text {
	font-size: 28rpx;
}

/* 输入框样式优化 */
.input-fitness {
	width: 100%;
	padding: 24rpx 20rpx;
	border-radius: 16rpx;
	border: 2rpx solid #e9ecef;
	margin-bottom: 20rpx;
	font-size: 28rpx;
	box-sizing: border-box;
	transition: border-color 0.2s ease;
	z-index: 1005;
	position: relative;
	background: #fff;
}

.invite-input-box {
	position: relative;
	z-index: 1006;
}

.invite-info {
	padding: 20rpx 0;
	text-align: center;
}

.invite-tip {
	font-size: 28rpx;
	color: #666;
}

.invite-input-area {
	margin: 20rpx 0;
}

.input-wrapper {
	display: flex;
	align-items: center;
	background: #f8f9fa;
	border: 2rpx solid #e9ecef;
	border-radius: 16rpx;
	padding: 0 20rpx;
	transition: border-color 0.2s ease;
}

.input-wrapper:focus-within {
	border-color: #667eea;
	background: #fff;
}

.input-icon {
	font-size: 32rpx;
	margin-right: 16rpx;
}

.invite-input {
	flex: 1;
	height: 88rpx;
	font-size: 28rpx;
	background: transparent;
}

.input-fitness:focus {
	border-color: #667eea;
	outline: none;
}

.input-fitness::placeholder {
	color: #cbd5e0;
}
</style>