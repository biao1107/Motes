<template>
	<view class="container" v-if="loaded">
		<!-- 页面头部 -->
		<view class="page-header">
			<text class="header-subtitle">找到志同道合的健身伙伴</text>
		</view>

		<!-- 创建组按钮 -->
		<view class="create-section">
			<button class="btn-fitness-primary" @tap="showCreate = true">
				<text class="btn-text">创建搭子组</text>
			</button>
		</view>

		<!-- 组列表 -->
		<view class="groups-section" v-if="groups.length > 0">
			<view class="section-header">
				<text class="fitness-subtitle">我的搭子组</text>
				<text class="section-count">{{ groups.length }}个组</text>
			</view>
			<view class="groups-list">
				<view class="group-card" v-for="item in groups" :key="item.id">
					<view class="group-header" @tap="goDetail(item.id)">
						<view class="group-icon">
							<text class="icon-text">💪</text>
						</view>
						<view class="group-info">
							<text class="group-name">{{ item.groupName || '未命名搭子组' }}</text>
							<view class="group-stats">
								<text class="stat-item">⏰ {{ item.fixedTime || '-' }}</text>
							</view>
						</view>
						<text class="arrow">›</text>
					</view>
					<view class="group-meta" v-if="item.desc">
						<text class="group-desc">{{ item.desc }}</text>
					</view>
					<!-- 管理员删除按钮 -->
					<view class="admin-actions" v-if="isAdminInGroup(item.id)">
						<button class="btn-delete" @tap.stop="showDeleteConfirm(item.id, item.groupName)">
							<text class="btn-delete-text">删除</text>
						</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<view class="empty-icon">👥</view>
			<text class="empty-text">还没有加入任何搭子组</text>
			<text class="empty-subtext">创建或加入一个搭子组，开始协同健身之旅</text>
			<button class="btn-fitness-primary" @tap="showCreate = true">
				<text class="btn-text">创建第一个搭子组</text>
			</button>
		</view>

		<!-- 创建组弹窗 -->
		<view v-if="showCreate" class="popup-mask" @tap="showCreate = false">
			<view class="popup" @tap.stop>
				<view class="popup-header">
					<text class="popup-title">创建搭子组</text>
					<text class="popup-close" @tap="showCreate = false">✕</text>
				</view>
				<view class="input-area">
					<textarea
					  class="input-fitness"
					  v-model="createForm.name"
					  placeholder="请输入组名（如：晨跑搭子群）"
					  :adjust-position="true"
					  :show-confirm-bar="false"
					  auto-height
					  style="min-height: 80rpx;"
					/>
				</view>
				<view class="input-area">
					<textarea
					  class="input-fitness"
					  v-model="createForm.fixedTime"
					  placeholder="请输入训练时间（如：每天早上7点）"
					  :adjust-position="true"
					  auto-height
					  style="min-height: 70rpx;"
					/>
				</view>
				<view class="popup-actions">
					<button class="btn-fitness-secondary" @tap="showCreate = false">
						<text class="btn-text">取消</text>
					</button>
					<button class="btn-fitness-primary" @tap="onCreateGroup">
						<text class="btn-text">创建</text>
					</button>
				</view>
			</view>
		</view>

		<!-- 删除确认弹窗 -->
		<view v-if="showDeleteConfirmPopup" class="popup-mask" @tap="hideDeleteConfirm">
			<view class="popup" @tap.stop>
				<view class="popup-header">
					<text class="popup-title">确认删除</text>
					<text class="popup-close" @tap="hideDeleteConfirm">✕</text>
				</view>
				<text class="confirm-text">确定要删除搭子组"{{ deleteGroupName }}"吗？此操作不可恢复。</text>
				<view class="popup-actions">
					<button class="btn-fitness-secondary" @tap="hideDeleteConfirm">
						<text class="btn-text">取消</text>
					</button>
					<button class="btn-fitness-danger" @tap="confirmDeleteGroup">
						<text class="btn-text">删除</text>
					</button>
				</view>
			</view>
		</view>
	</view>

	<!-- 加载状态 -->
	<view v-else class="loading-container">
		<view class="loading-spinner"></view>
		<text class="loading-text">加载中...</text>
	</view>
</template>

<script>
import { apiMyGroups, apiCreateGroup, apiGroupDetailWithMembers, apiDeleteGroup } from '@/common/api.js';
import { requireLogin, getUserIdFromToken } from '@/common/auth.js';

export default {
	data() {
		return {
			loaded: false,
			groups: [],
			showCreate: false,
			showDeleteConfirmPopup: false,
			groupToDelete: null,
			deleteGroupName: '',
			createForm: {
				name: '',
				fixedTime: ''
			},
			groupMembers: {} // 缓存组成员信息
		};
	},
	onShow() {
		if (!requireLogin()) return;
		this.loadData();
	},
	methods: {
		onInputFocus() {
			// 强制聚焦输入框
			console.log('输入框聚焦');
		},

		async loadData() {
			try {
				uni.showLoading({ title: '加载中...' });
				console.log('Calling apiMyGroups');
				const userId = getUserIdFromToken();
				if (!userId) {
					console.error('无法获取用户ID');
					this.loaded = true;
					uni.hideLoading();
					return;
				}
				const res = await apiMyGroups(userId);
				console.log('apiMyGroups response:', res);
				this.groups = res?.data || res || [];
				this.loaded = true;
				uni.hideLoading();
				
				// 预加载所有组的成员信息以检查权限
				await this.loadAllGroupMembers();
			} catch (e) {
				console.error('Error loading groups:', e);
				uni.hideLoading();
				this.loaded = true;
				uni.showToast({
					title: '加载失败，请重试',
					icon: 'none'
				});
			}
		},
		
		// 加载所有组的成员信息
		async loadAllGroupMembers() {
			for (const group of this.groups) {
				try {
					const detail = await apiGroupDetailWithMembers(group.id);
					this.groupMembers[group.id] = detail.members || [];
				} catch (e) {
					console.error(`加载组 ${group.id} 成员信息失败:`, e);
					this.groupMembers[group.id] = [];
				}
			}
		},
		
		// 检查用户是否是组的管理员
		isAdminInGroup(groupId) {
			const members = this.groupMembers[groupId] || [];
			const userId = getUserIdFromToken();
			const userMember = members.find(m => m.userId == userId);
			return userMember && userMember.role === 'ADMIN';
		},
		
		async onCreateGroup() {
			if (!this.createForm.name) {
				uni.showToast({ title: '请输入组名', icon: 'none' });
				return;
			}
			
			if (this.createForm.name.trim().length < 2) {
				uni.showToast({ title: '组名至少需要2个字符', icon: 'none' });
				return;
			}
			
			if (!this.createForm.fixedTime) {
				uni.showToast({ title: '请输入训练时间', icon: 'none' });
				return;
			}
			
			try {
				uni.showLoading({ title: '创建中...' });
				const userId = getUserIdFromToken();
				await apiCreateGroup({
					memberIds: [userId],
					fixedTime: this.createForm.fixedTime.trim(),
					name: this.createForm.name.trim()
				});
				uni.hideLoading();
				uni.showToast({ title: '创建成功', icon: 'success' });
				this.showCreate = false;
				this.createForm = { name: '', fixedTime: '' };
				this.loadData();
			} catch (e) {
				uni.hideLoading();
				console.error('创建搭子组失败:', e);
				uni.showToast({
					title: e?.message || '创建失败，请重试',
					icon: 'none'
				});
			}
		},
		
		goDetail(id) {
			uni.navigateTo({ url: `/pages/group/detail?id=${id}` });
		},
		
		// 显示删除确认弹窗
		showDeleteConfirm(groupId, groupName) {
			this.groupToDelete = groupId;
			this.deleteGroupName = groupName;
			this.showDeleteConfirmPopup = true;
		},
		
		// 隐藏删除确认弹窗
		hideDeleteConfirm() {
			this.showDeleteConfirmPopup = false;
			this.groupToDelete = null;
			this.deleteGroupName = '';
		},
		
		// 确认删除搭子组
		async confirmDeleteGroup() {
			if (!this.groupToDelete) return;
			
			try {
				uni.showLoading({ title: '删除中...' });
				const res = await apiDeleteGroup(this.groupToDelete);
				
				// 检查响应状态
				if (res && res.statusCode === 200) {
					uni.hideLoading();
					uni.showToast({
						title: '删除成功',
						icon: 'success'
					});
					this.hideDeleteConfirm();
					this.loadData(); // 重新加载数据
				} else {
					uni.hideLoading();
					// 尝试解析错误信息
					let errorMessage = '删除失败';
					if (res && res.data && typeof res.data === 'object') {
						errorMessage = res.data.message || res.data.msg || errorMessage;
					} else if (res && res.errMsg) {
						errorMessage = res.errMsg;
					} else if (res && res.statusCode) {
						errorMessage = `删除失败 (${res.statusCode})`;
					}
					uni.showToast({
						title: errorMessage,
						icon: 'none'
					});
				}
			} catch (e) {
				uni.hideLoading();
				console.error('删除搭子组失败:', e);
				uni.showToast({
					title: e.errMsg || e.message || '删除失败，请重试',
					icon: 'none'
				});
			}
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

/* 加载状态优化 */
.loading-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100vh;
	background: #f8f9fa;
}

.loading-spinner {
	width: 60rpx;
	height: 60rpx;
	border: 4rpx solid #e0e0e0;
	border-top: 4rpx solid #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-bottom: 20rpx;
	box-shadow: 0 0 16rpx rgba(102, 126, 234, 0.1);
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.loading-text {
	font-size: 28rpx;
	color: #718096;
	letter-spacing: 1rpx;
}

/* 页面头部美化 - 更柔和的渐变和细节 */
.page-header {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 60rpx 30rpx 80rpx;
	text-align: center;
	border-radius: 0 0 32rpx 32rpx;
	box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.2);
	margin-bottom: 20rpx;
}

.fitness-title {
	font-size: 42rpx;
	font-weight: 700;
	color: #fff;
	display: block;
	margin-bottom: 12rpx;
	letter-spacing: 2rpx;
}

.header-subtitle {
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.9);
	letter-spacing: 1rpx;
}

/* 创建按钮区域 */
.create-section {
	padding: 30rpx;
	background: #f8f9fa;
}

/* 组列表区域 */
.groups-section {
	padding: 0 20rpx 40rpx;
}

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

.groups-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

/* 组卡片美化 - 更精致的阴影和交互 */
.group-card {
	background-color: #fff;
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	transition: all 0.2s ease;
	position: relative;
}

.group-card:active {
	transform: translateY(2rpx);
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.group-header {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-bottom: 18rpx;
}

/* 组图标美化 */
.group-icon {
	width: 88rpx;
	height: 88rpx;
	border-radius: 20rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.15);
}

.icon-text {
	color: white;
	font-size: 38rpx;
}

.group-info {
	flex: 1;
}

.group-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #2d3748;
	display: block;
	margin-bottom: 10rpx;
	letter-spacing: 0.5rpx;
}

.group-stats {
	display: flex;
	gap: 24rpx;
	flex-wrap: wrap;
}

.stat-item {
	font-size: 24rpx;
	color: #718096;
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.arrow {
	font-size: 38rpx;
	color: #cbd5e0;
	flex-shrink: 0;
	transition: color 0.2s ease;
}

.group-header:active .arrow {
	color: #667eea;
}

/* 组描述区域 */
.group-meta {
	margin-top: 18rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid #f0f0f0;
}

.group-desc {
	font-size: 26rpx;
	color: #718096;
	line-height: 1.6;
}

/* 管理员操作按钮区域 */
.admin-actions {
	margin-top: 20rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid #f0f0f0;
	display: flex;
	justify-content: flex-end;
}

/* 删除按钮样式 */
.btn-delete {
	background: transparent;
	border: 1rpx solid #ff4757;
	border-radius: 12rpx;
	padding: 12rpx 24rpx;
	margin: 0;
	line-height: 1;
}

.btn-delete-text {
	font-size: 26rpx;
	color: #ff4757;
}

/* 空状态美化 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 40rpx;
	text-align: center;
}

.empty-icon {
	font-size: 120rpx;
	margin-bottom: 30rpx;
	opacity: 0.8;
}

.empty-text {
	font-size: 32rpx;
	font-weight: 500;
	color: #2d3748;
	margin-bottom: 12rpx;
}

.empty-subtext {
	font-size: 26rpx;
	color: #718096;
	margin-bottom: 40rpx;
	line-height: 1.5;
	max-width: 600rpx;
}

/* 弹窗样式优化 - 统一风格 */
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
	z-index: 9999;
	backdrop-filter: blur(4rpx);
}

.popup {
	width: 80%;
	background-color: #fff;
	border-radius: 24rpx;
	padding: 40rpx 30rpx;
	animation: popupSlideIn 0.3s ease-out;
	z-index: 10000;
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

.popup-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 30rpx;
}

.confirm-text {
	font-size: 28rpx;
	color: #2d3748;
	line-height: 1.6;
	margin-bottom: 20rpx;
}

/* 输入框样式统一 */
.input-fitness {
	width: 100%;
	padding: 24rpx 20rpx;
	border-radius: 16rpx;
	border: 2rpx solid #e9ecef;
	margin-bottom: 20rpx;
	font-size: 28rpx;
	box-sizing: border-box;
	transition: border-color 0.2s ease;
	z-index: 10005;
	position: relative;
	background: #fff;
}

.input-area {
	position: relative;
	z-index: 10006;
}

.input-fitness:focus {
	border-color: #667eea;
	outline: none;
}

.input-fitness::placeholder {
	color: #cbd5e0;
}

/* 按钮样式统一优化 */
.btn-fitness-primary,
.btn-fitness-secondary,
.btn-fitness-danger {
	border-radius: 16rpx;
	padding: 20rpx;
	font-weight: 600;
	transition: all 0.2s ease;
	flex: 1;
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

/* 危险按钮美化 */
.btn-fitness-danger {
	background: linear-gradient(135deg, #ff4757 0%, #ff3838 100%);
	color: white;
	border: none;
	box-shadow: 0 4rpx 12rpx rgba(255, 71, 87, 0.2);
}

.btn-fitness-danger:active {
	opacity: 0.9;
	transform: translateY(2rpx);
	box-shadow: 0 2rpx 8rpx rgba(255, 71, 87, 0.25);
}

.btn-text {
	font-size: 28rpx;
}
</style>