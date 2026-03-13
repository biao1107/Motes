<template>
	<view class="container">
		<!-- 错误提示区域 -->
		<view v-if="showError" class="error-container">
			<text class="error-text">无效的群组ID，无法加载聊天</text>
			<button class="back-btn" @tap="goBack">返回群组列表</button>
		</view>
		
		<view v-else>
			<!-- 聊天记录区域 -->
			<scroll-view 
				class="chat-container" 
				scroll-y="true" 
				:scroll-top="scrollTop"
				@scroll="onScroll"
				ref="scrollView"
			>
				<view class="message-list">
					<!-- 加载更多提示 -->
					<view v-if="loadingMore" class="loading-more">
						<text>加载中...</text>
					</view>
					
					<!-- 消息列表 -->
					<view 
						v-for="(message, index) in messages" 
						:key="message.id || index"
						class="message-item"
						:class="{'self': message.isSelf}"
					>
						<!-- 其他用户消息 -->
						<view v-if="!message.isSelf" class="other-message">
							<view class="message-header">
								<text class="sender-name">{{ message.nickname }}</text>
								<text class="message-time">{{ formatTime(message.createTime) }}</text>
							</view>
							<view class="message-content other-content" v-if="message.type !== 'IMAGE'">
								<text class="message-text">{{ message.content }}</text>
							</view>
							<image v-else :src="message.imageUrl" class="message-image" mode="widthFix" @tap="previewImage(message.imageUrl)"></image>
						</view>
											
						<!-- 自己发送的消息 -->
						<view v-else class="self-message">
							<view class="message-header self-header">
								<text class="message-time">{{ formatTime(message.createTime) }}</text>
							</view>
							<view class="message-content self-content" v-if="message.type !== 'IMAGE'">
								<text class="message-text">{{ message.content }}</text>
							</view>
							<image v-else :src="message.imageUrl" class="message-image self-image" mode="widthFix" @tap="previewImage(message.imageUrl)"></image>
						</view>
					</view>
				
					<!-- 底部占位 -->
					<view class="bottom-placeholder"></view>
				</view>
			</scroll-view>
			
			<!-- 输入区域 -->
			<view class="input-container">
				<view class="input-actions">
					<view class="action-btn" @tap="chooseImage">
						<text class="action-icon">📷</text>
					</view>
				</view>
				<input 
					class="message-input" 
					v-model="inputMessage" 
					placeholder="说点什么..." 
					@confirm="sendMessage"
					:focus="inputFocus"
				/>
				<button 
					class="send-btn" 
					:class="{'btn-disabled': !inputMessage.trim()}"
					:disabled="!inputMessage.trim()"
					@tap="sendMessage"
				>
					<text class="send-icon">➤</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import { apiGetGroupChatHistory, apiGetLatestMessages, apiUploadAction, apiGetFileUrl, apiMarkGroupRead } from '@/common/api.js';
import { requireLogin, getUserIdFromToken, getUserNickname } from '@/common/auth.js';
import { sendChatMessage, subscribeGroupChat, isConnected, initWebSocket } from '@/common/ws.js';
import { initNativeWebSocket, subscribeGroup, setMessageCallback, isConnected as isNativeConnected } from '@/common/ws-native.js';

export default {
	data() {
		return {
			id: '', // 组ID
			messages: [],
			inputMessage: '',
			inputFocus: false,
			userId: null,
			nickname: '',
			scrollTop: 0,
			loadingMore: false,
			hasMore: true,
			lastMessageId: 0,
			firstLoadMap: {}, // 用于跟踪每个群组的加载状态
			subscription: null, // 添加订阅引用
			showError: false // 是否显示错误信息
		};
	},
	
	onLoad(query) {
		// 获取群组ID，兼容不同平台
		this.id = query && query.id ? Number(query.id) : (query && query.groupId ? Number(query.groupId) : null);
		console.log('onLoad 接收到的参数:', query, '群组ID:', this.id);
		
		// 检查groupId是否有效
		if (isNaN(this.id) || this.id === null || this.id <= 0) {
			console.error('无效的群组ID:', this.id);
			uni.showToast({
				title: '无效的群组ID',
				icon: 'none'
			});
			// 设置错误状态
			this.showError = true;
			return;
		}
		// 初始化该群组的首次加载状态
		if (!(this.id in this.firstLoadMap)) {
			this.firstLoadMap[this.id] = true;
		}
	},
	
	// 页面显示时也检查加载状态
	mounted() {
		if (!(this.id in this.firstLoadMap)) {
			this.firstLoadMap[this.id] = true;
		}
	},
	
	onShow() {
		if (!requireLogin()) return;
		// 检查groupId是否有效
		if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
			console.error('无效的群组ID，onShow中停止执行:', this.id);
			// 设置错误状态
			this.showError = true;
			return;
		}
		this.userId = getUserIdFromToken();
		this.loadUserProfile();
		
		// 确保用户信息加载完成后再初始化WebSocket和加载历史记录
		this.$nextTick(() => {
			// 初始化WebSocket连接（H5用STOMP，小程序用原生WebSocket）
			this.initWebSocketConnection().then(() => {
				this.loadChatHistory();
				this.startListening();
				// 进入聊天页面后标记消息为已读
				this.markMessagesAsRead();
			}).catch((error) => {
				console.error('WebSocket初始化失败:', error);
				// 即使WebSocket连接失败，也加载历史记录
				this.loadChatHistory();
				// 进入聊天页面后标记消息为已读
				this.markMessagesAsRead();
			});
		});
	},
	
	
	onHide() {
		this.stopListening();
	},
	
	onUnload() {
		this.stopListening();
	},
	
	// 页面卸载前保存当前状态
	beforeDestroy() {
		this.stopListening();
	},
	
	// 页面隐藏时保存当前状态
	deactivated() {
		this.stopListening();
	},
	
	methods: {
		// 返回群组列表
		goBack() {
			uni.navigateBack();
		},
		
		// 页面激活时恢复状态
		activated() {
			if (!requireLogin()) return;
			// 检查groupId是否有效
			if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
				console.error('无效的群组ID，activated中停止执行:', this.id);
				// 设置错误状态
				this.showError = true;
				return;
			}
			this.userId = getUserIdFromToken();
			this.loadUserProfile();
					
			// 确保用户信息加载完成后再初始化WebSocket和加载历史记录
			this.$nextTick(() => {
				// 初始化WebSocket连接
				this.initWebSocketConnection().then(() => {
					this.loadChatHistory();
					this.startListening();
				}).catch((error) => {
					console.error('WebSocket初始化失败:', error);
					// 即使WebSocket连接失败，也加载历史记录
					this.loadChatHistory();
				});
			});
		},
		async initWebSocketConnection() {
			// #ifdef H5
			if (!isConnected()) {
				console.log('H5环境：初始化STOMP WebSocket连接...');
				await initWebSocket();
				console.log('H5环境：WebSocket连接初始化完成');
			}
			// #endif
			
			// #ifdef MP-WEIXIN
			if (!isNativeConnected()) {
				console.log('小程序环境：初始化原生WebSocket连接...');
				await initNativeWebSocket();
				console.log('小程序环境：原生WebSocket连接初始化完成');
			}
			// #endif
		},
		
		loadUserProfile() {
			// 从认证信息获取用户昵称
			this.nickname = getUserNickname();
		},
		
		async loadChatHistory() {
			if (!this.hasMore || this.loadingMore) return;
			// 检查groupId是否有效
			if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
				console.error('无效的群组ID:', this.id);
				uni.showToast({
					title: '无效的群组ID',
					icon: 'none'
				});
				return;
			}
			
			this.loadingMore = true;
			try {
				console.log('开始加载聊天历史，群组ID:', Number(this.id));
				const res = await apiGetGroupChatHistory(Number(this.id), 20);
				console.log('API响应:', res);
				// 检查响应结构
				console.log('API响应类型:', typeof res, Array.isArray(res));
				console.log('API响应内容:', res);
				// 根据实际响应结构处理数据
				let history;
				if (res && typeof res === 'object' && 'code' in res && 'data' in res) {
					// 如果返回ApiResponse格式 {code, message, data}
					if (res.code === 200) {
						history = res.data || [];
						console.log('从ApiResponse.data获取消息数量:', history.length);
					} else {
						// 如果不是200状态码，说明请求失败
						throw new Error(`API请求失败: ${res.message || '未知错误'}`);
					}
				} else if (Array.isArray(res)) {
					// 如果直接返回数组（兼容模式）
					history = res;
					console.log('直接从数组获取消息数量:', history.length);
				} else {
					// 默认为空数组
					history = [];
					console.log('响应格式不匹配，使用空数组');
				}
				console.log('获取到历史消息数量:', history.length);
				
				if (history.length < 20) {
					this.hasMore = false;
				}
				
				// 标记消息发送者
				history.forEach(msg => {
					msg.isSelf = msg.userId === Number(this.userId);
					// 如果有时间戳，转换为日期对象
					if (msg.createTime && typeof msg.createTime === 'string') {
						msg.createTime = new Date(msg.createTime);
					} else if (!msg.createTime) {
						msg.createTime = new Date(); // 如果没有时间戳，使用当前时间
					}
					// 处理图片消息
					if (!msg.type) {
						msg.type = msg.imageUrl ? 'IMAGE' : 'TEXT';
					} else {
						// 统一转换为大写
						msg.type = msg.type.toUpperCase();
					}
				});
				
				// 检查当前群组是否是首次加载
				const isGroupFirstLoad = this.firstLoadMap[this.id] === true;
				console.log('群组', this.id, '是否首次加载:', isGroupFirstLoad, 'firstLoadMap状态:', this.firstLoadMap, '当前userId:', this.userId);
				
				if (isGroupFirstLoad) {
					// 首次加载：直接设置消息
					this.messages = history;
					this.firstLoadMap[this.id] = false; // 标记该群组已加载过
					console.log('首次加载，设置消息数量:', history.length);
					// 滚动到底部
					this.$nextTick(() => {
						this.scrollToBottom();
					});
				} else {
					// 非首次加载：避免重复消息，只添加不存在的消息
					const existingMessageIds = new Set(this.messages.map(msg => msg.id));
					const newMessages = history.filter(msg => msg.id && !existingMessageIds.has(msg.id));
					
					console.log('非首次加载，现有消息数量:', this.messages.length, '新消息数量:', newMessages.length);
					if (newMessages.length > 0) {
						this.messages = [...newMessages, ...this.messages];
						console.log('合并后消息数量:', this.messages.length);
					}
				}
				
				// 更新最后消息ID
				if (history.length > 0) {
					this.lastMessageId = Math.max(...history.map(msg => msg.id));
				}
				
			} catch (e) {
				console.error('加载聊天历史失败:', e);
				uni.showToast({
					title: '加载聊天历史失败: ' + (e.message || '未知错误'),
					icon: 'none',
					duration: 2000
				});
			} finally {
				this.loadingMore = false;
			}
		},
		
		sendMessage() {
			if (!this.inputMessage.trim()) return;
			
			// #ifdef H5
			// H5环境使用STOMP发送
			sendChatMessage(Number(this.id), this.inputMessage.trim());
			// #endif
			
			// #ifdef MP-WEIXIN
			// 小程序环境使用HTTP API发送消息（因为原生WebSocket只支持接收）
			this.sendMessageByHttp(this.inputMessage.trim());
			// #endif
			
			// 清空输入框
			this.inputMessage = '';
			this.inputFocus = true;
		},
		
		// 小程序环境通过HTTP发送消息
		async sendMessageByHttp(content) {
			try {
				const { apiSendChatMessage } = require('@/common/api.js');
				await apiSendChatMessage({
					groupId: Number(this.id),
					content: content,
					type: 'TEXT'
				});
				console.log('小程序环境：消息发送成功');
				// 发送成功后立即刷新消息列表
				this.loadChatHistory();
			} catch (e) {
				console.error('小程序环境：消息发送失败:', e);
				uni.showToast({
					title: '发送失败',
					icon: 'none'
				});
			}
		},
		
		// 选择图片并发送
		chooseImage() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					try {
						uni.showLoading({ title: '上传中...' });
						
						// 上传图片
						const uploadRes = await apiUploadAction(res.tempFilePaths[0]);
						
						// 获取可访问的URL
						let imageUrl = '';
						if (uploadRes && typeof uploadRes === 'object') {
							if (uploadRes.data) {
								const objectName = typeof uploadRes.data === 'string' ? uploadRes.data : JSON.stringify(uploadRes.data);
								const urlRes = await apiGetFileUrl({ objectName });
								imageUrl = urlRes.data || urlRes || objectName;
							} else {
								imageUrl = JSON.stringify(uploadRes);
							}
						} else {
							imageUrl = uploadRes;
						}
						
						if (imageUrl) {
							// 发送图片消息
							sendChatMessage(Number(this.id), '[图片]', imageUrl, 'IMAGE');
							uni.showToast({ title: '图片已发送', icon: 'success' });
						} else {
							throw new Error('图片上传失败');
						}
					} catch (e) {
						console.error('图片发送失败:', e);
						uni.showToast({ title: '图片发送失败', icon: 'none' });
					} finally {
						uni.hideLoading();
					}
				}
			});
		},
		
		startListening() {
			// 检查groupId是否有效
			if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
				console.error('无效的群组ID，无法启动监听:', this.id);
				return;
			}
			
			// #ifdef H5
			console.log('H5环境：检查STOMP WebSocket连接状态...');
			if (!isConnected()) {
				console.error('H5环境：WebSocket未连接，无法订阅消息');
				initWebSocket().then(() => {
					console.log('H5环境：WebSocket重新连接成功');
					this.subscription = subscribeGroupChat(this.id, this.handleWsMessage);
				}).catch((error) => {
					console.error('H5环境：WebSocket重新连接失败:', error);
				});
				return;
			}
			console.log('H5环境：WebSocket已连接，开始订阅消息');
			this.subscription = subscribeGroupChat(this.id, this.handleWsMessage);
			// #endif
			
			// #ifdef MP-WEIXIN
			console.log('小程序环境：检查原生WebSocket连接状态...');
			if (!isNativeConnected()) {
				console.error('小程序环境：原生WebSocket未连接，无法订阅消息');
				initNativeWebSocket().then(() => {
					console.log('小程序环境：原生WebSocket重新连接成功');
					subscribeGroup(this.id);
					setMessageCallback(this.handleWsMessage);
				}).catch((error) => {
					console.error('小程序环境：原生WebSocket重新连接失败:', error);
				});
				return;
			}
			console.log('小程序环境：原生WebSocket已连接，开始订阅消息');
			subscribeGroup(this.id);
			setMessageCallback(this.handleWsMessage);
			// #endif
		},
		
		stopListening() {
			// 取消订阅
			if (this.subscription) {
				this.subscription.unsubscribe();
				this.subscription = null;
			}
		},
		
		handleWsMessage(payload) {
			console.log('收到WebSocket消息:', payload);
			// 检查是否是聊天消息
			if (payload.groupId === Number(this.id)) {
				// 添加新消息
				const newMessage = {
					id: payload.id,
					groupId: payload.groupId,
					userId: payload.userId,
					nickname: payload.nickname,
					content: payload.content,
					imageUrl: payload.imageUrl,
					type: payload.type || 'TEXT',
					createTime: payload.createTime && typeof payload.createTime === 'string' ? new Date(payload.createTime) : (payload.createTime || new Date()),
					isSelf: payload.userId === Number(this.userId)
				};
				
				this.messages.push(newMessage);
				
				// 滚动到底部
				this.$nextTick(() => {
					this.scrollToBottom();
				});
			}
		},
		
		onScroll(e) {
			// 实现上拉加载更多
			const scrollTop = e.detail.scrollTop;
			if (scrollTop < 50 && this.hasMore && !this.loadingMore) {
				this.loadChatHistory();
			}
		},
		
		scrollToBottom() {
			// 滚动到底部
			this.scrollTop = 999999;
		},
		
		formatTime(date) {
			if (!date) return '';
			const d = new Date(date);
			const now = new Date();
			const diff = now - d;
			
			// 如果是今天，只显示时间
			if (d.toDateString() === now.toDateString()) {
				return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
			}
			
			// 如果是昨天，显示"昨天"
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);
			if (d.toDateString() === yesterday.toDateString()) {
				return `昨天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
			}
			
			// 其他情况显示日期和时间
			return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
		},
		
		// 预览图片
		previewImage(url) {
			uni.previewImage({
				urls: [url],
				current: url
			});
		},
		
		// 标记消息为已读
		markMessagesAsRead() {
			if (!this.id || !this.userId) {
				console.warn('群组ID或用户ID缺失，无法标记消息为已读');
				return;
			}
			
			console.log('准备标记群组消息为已读:', this.id, '用户ID:', this.userId);
			
			apiMarkGroupRead(Number(this.id), Number(this.userId))
				.then(response => {
					console.log('标记群组消息为已读成功:', this.id, '响应:', response);
				})
				.catch(error => {
					console.error('标记群组消息为已读失败:', this.id, '错误:', error);
					// 提示用户标记失败，可以稍后重试
					uni.showToast({
						title: '同步阅读状态失败，请稍后重试',
						icon: 'none',
						duration: 2000
					});
				});
		}
	}
};
</script>

<style scoped>
/* 基础容器样式 - 高级渐变+细腻质感 */
.container {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background: linear-gradient(135deg, #f5f7fa 0%, #e4eaf5 100%);
	position: relative;
}

/* 聊天容器样式 - 半透磨砂质感 */
.chat-container {
	flex: 1;
	padding: 30rpx 24rpx;
	background: rgba(255, 255, 255, 0.2);
	backdrop-filter: blur(12rpx);
	box-sizing: border-box;
	overflow: hidden;
	border-radius: 0;
}

.message-list {
	padding-bottom: 30rpx;
}

/* 加载更多提示 - 精致卡片+动效 */
.loading-more {
	text-align: center;
	padding: 16rpx 24rpx;
	font-size: 24rpx;
	color: #6e7c94;
	background-color: rgba(255, 255, 255, 0.8);
	border-radius: 16rpx;
	margin: 16rpx 0;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
	animation: pulse 1.5s infinite ease-in-out;
}

/* 消息项样式 - 更自然的间距+流畅动画 */
.message-item {
	margin-bottom: 36rpx;
	animation: fadeInUp 0.4s ease-out;
	display: flex;
	flex-direction: column;
	width: 100%;
}

/* 消息头部样式优化 */
.message-header {
	display: flex;
	align-items: center;
	margin-bottom: 10rpx;
	flex-wrap: wrap;
	width: 100%;
}

.sender-name {
	font-size: 26rpx;
	color: #3a4b67;
	font-weight: 600;
	margin-right: 12rpx;
	letter-spacing: 0.5rpx;
	text-shadow: 0 1rpx 0 rgba(0,0,0,0.02);
}

.message-time {
	font-size: 22rpx;
	color: #8a96aa;
	margin-left: 8rpx;
	font-style: italic;
	z-index: 1;
	position: relative;
	max-width: 30%;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
}

/* 他人消息布局优化 */
.other-message {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;
	margin-bottom: 8rpx;
}

/* 自己消息布局优化 */
.self-message {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	width: 100%;
	margin-bottom: 8rpx;
}

.self-header {
	justify-content: flex-end;
	align-self: flex-end;
	margin-bottom: 8rpx;
	min-height: 32rpx;
	width: 100%;
	text-align: right;
}

/* 消息内容容器 - 极致精致的视觉效果 */
.message-content {
	width: fit-content;
	max-width: calc(100% - 80rpx);
	min-width: 120rpx;
	padding: 26rpx 30rpx;
	border-radius: 24rpx;
	word-wrap: break-word;
	word-break: break-word;
	box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.08);
	font-size: 28rpx;
	line-height: 1.7;
	display: inline-block;
	box-sizing: border-box;
	position: relative;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 他人消息气泡 - 纯白+细腻质感 */
.other-content {
	background-color: #ffffff;
	color: #2d3748;
	z-index: 0;
	margin-left: 16rpx;
	border-top-left-radius: 10rpx; /* 差异化圆角更自然 */
}

.other-content:hover {
	box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1);
}

.other-content:active {
	transform: scale(0.985);
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

/* 自己消息气泡 - 高级渐变+光泽感 */
.self-content {
	background: linear-gradient(135deg, #6a7ef8 0%, #7b68ee 100%);
	color: #ffffff;
	margin-left: auto;
	margin-right: 16rpx;
	border-top-right-radius: 10rpx; /* 差异化圆角更自然 */
}

.self-content:hover {
	box-shadow: 0 8rpx 24rpx rgba(106, 126, 248, 0.2);
}

.self-content:active {
	transform: scale(0.985);
	box-shadow: 0 4rpx 16rpx rgba(106, 126, 248, 0.15);
}

/* 消息文字样式优化 */
.message-text {
	word-wrap: break-word;
	word-break: break-word;
	white-space: pre-wrap;
	font-size: inherit;
	line-height: inherit;
	max-width: 100%;
	overflow-wrap: break-word;
}

/* 他人消息气泡尖角 - 更自然的样式 */
.other-content:before {
	content: '';
	position: absolute;
	left: -14rpx;
	top: 22rpx;
	width: 0;
	height: 0;
	border-right: 14rpx solid #ffffff;
	border-top: 12rpx solid transparent;
	border-bottom: 12rpx solid transparent;
	z-index: -1;
	filter: drop-shadow(0 3rpx 3rpx rgba(0,0,0,0.06));
}

/* 自己消息气泡尖角 - 渐变匹配 */
.self-content:after {
	content: '';
	position: absolute;
	right: -14rpx;
	top: 22rpx;
	width: 0;
	height: 0;
	border-left: 14rpx solid #6a7ef8;
	border-top: 12rpx solid transparent;
	border-bottom: 12rpx solid transparent;
	z-index: -1;
	filter: drop-shadow(0 3rpx 3rpx rgba(106, 126, 248, 0.1));
}

/* 输入区域 - 卡片式悬浮效果 */
.input-container {
	display: flex;
	align-items: center;
	padding: 20rpx 24rpx;
	background: #fff;
	border-top: 1rpx solid #eee;
}

.input-actions {
	display: flex;
	gap: 16rpx;
	margin-right: 16rpx;
}

.action-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: #f5f5f5;
	display: flex;
	align-items: center;
	justify-content: center;
}

.action-icon {
	font-size: 36rpx;
}

/* 输入框 - 高级质感+聚焦动效 */
.message-input {
	flex: 1;
	padding: 20rpx 24rpx;
	border-radius: 40rpx;
	font-size: 28rpx;
	background: #f5f5f5;
	border: none;
}

.message-input:focus {
	background: #fff;
	box-shadow: 0 0 0 2rpx #667eea;
}

.message-input::placeholder {
	color: #999;
	font-size: 26rpx;
}

/* 发送按钮 - 圆形渐变+精致动效 */
.send-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: 16rpx;
	padding: 0;
	border: none;
}

.send-btn:not(.btn-disabled):hover {
	box-shadow: 0 6rpx 20rpx rgba(106, 126, 248, 0.35);
	transform: translateY(-2rpx);
}

.send-btn:not(.btn-disabled):active {
	transform: translateY(1rpx);
	box-shadow: 0 2rpx 10rpx rgba(106, 126, 248, 0.2);
}

/* 禁用状态样式优化 */
.send-btn.btn-disabled {
	background: #e9ecef;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
	cursor: not-allowed;
}

.send-icon {
	color: #fff;
	font-size: 32rpx;
	font-weight: 600;
	transition: all 0.2s ease;
}

.send-btn.btn-disabled .send-icon {
	color: #adb5bd;
}

/* 图片消息样式 */
.message-image {
	max-width: 400rpx;
	border-radius: 16rpx;
	margin-left: 16rpx;
}

.message-image.self-image {
	margin-left: auto;
	margin-right: 16rpx;
}

.bottom-placeholder {
	height: 24rpx;
}

/* 动画效果优化 */
@keyframes fadeInUp {
	0% {
		opacity: 0;
		transform: translateY(16rpx);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes pulse {
	0% {
		opacity: 0.8;
		transform: scale(0.98);
	}
	50% {
		opacity: 1;
		transform: scale(1);
	}
	100% {
		opacity: 0.8;
		transform: scale(0.98);
	}
}

/* 滚动条样式 - 更精致的自定义样式 */
::-webkit-scrollbar {
	width: 6rpx;
	height: 6rpx;
}

::-webkit-scrollbar-track {
	background: rgba(255, 255, 255, 0.6);
	border-radius: 8rpx;
	margin: 10rpx 0;
}

::-webkit-scrollbar-thumb {
	background: #d1d9e6;
	border-radius: 8rpx;
	transition: all 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
	background: #6a7ef8;
}

/* 错误提示区域 - 高级卡片+居中样式 */
.error-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	padding: 80rpx 40rpx;
	text-align: center;
	background-color: rgba(255, 255, 255, 0.9);
	border-radius: 24rpx;
	margin: 40rpx;
	box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.1);
	backdrop-filter: blur(8rpx);
}

.error-text {
	font-size: 32rpx;
	color: #6e7c94;
	margin-bottom: 50rpx;
	line-height: 1.8;
	font-weight: 500;
}

.back-btn {
	padding: 24rpx 48rpx;
	border-radius: 16rpx;
	background: linear-gradient(135deg, #f8f9fc 0%, #e8ebf2 100%);
	color: #3a4b67;
	border: 1rpx solid #e0e7ff;
	font-size: 28rpx;
	font-weight: 600;
	transition: all 0.2s ease;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}

.back-btn:hover {
	transform: translateY(-2rpx);
	box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.08);
}

.back-btn:active {
	background: #f0f2f5;
	transform: translateY(1rpx);
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}
</style>