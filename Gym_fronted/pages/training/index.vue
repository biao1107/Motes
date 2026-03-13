<template>
	<view class="container">
		<!-- 训练状态概览卡片 -->
		<view class="status-card">
			<view class="status-header">
				<text class="status-title">{{ $t('training.todayStatus') }}</text>
				<view class="status-indicator" :class="{ 'active': started }">
					<text class="status-text">{{ started ? $t('training.training') : $t('training.notStarted') }}</text>
				</view>
			</view>
			<view class="progress-summary" v-if="started">
				<view class="progress-item">
					<text class="progress-label">{{ $t('training.completed') }}</text>
					<text class="progress-value">{{ report.done || 0 }}</text>
				</view>
				<view class="progress-item">
					<text class="progress-label">{{ $t('training.target') }}</text>
					<text class="progress-value">{{ form.target || '-' }}</text>
				</view>
				<view class="progress-item">
					<text class="progress-label">{{ $t('training.completionRate') }}</text>
					<text class="progress-value">{{ calculateCompletionRate() }}%</text>
				</view>
			</view>
		</view>
		
		<!-- 训练设置卡片 -->
		<view class="setup-card">
			<view class="setup-header">
				<text class="setup-title">{{ $t('training.trainingSettings') }}</text>
				<text class="setup-desc">{{ $t('training.configurePlan') }}</text>
			</view>
			
			<view class="input-section">
				<!-- 搭子组选择 -->
				<view class="input-group">
					<text class="input-label">{{ $t('training.group') }}</text>
					<text class="debug-info">[{{ groups.length }}个组]</text>
					<view class="input-action" v-if="groups.length === 0" @tap="loadUserGroups">
						<text class="action-text">{{ $t('training.clickToLoadGroups') }}</text>
						<text class="action-icon">⬇️</text>
					</view>
					<picker v-else @change="bindGroupChange" :value="groupIndex" :range="groups" range-key="groupName">
						<view class="input-select">
							<text class="select-text">{{ groupIndex === -1 ? $t('training.selectGroup') : groups[groupIndex].groupName }}</text>
							<text class="select-icon">▼</text>
						</view>
					</picker>
				</view>
				
				<!-- 挑战选择 -->
				<view class="input-group" v-if="form.groupId">
					<text class="input-label">{{ $t('training.relatedChallenge') }}</text>
					<text class="debug-info">[当前组ID: {{ form.groupId }}, 挑战数: {{ challenges.length }}]</text>
					<view class="input-action" v-if="challenges.length === 0" @tap="loadGroupChallenges(form.groupId)">
						<text class="action-text">{{ $t('training.clickToLoadChallenges') }}</text>
						<text class="action-icon">⬇️</text>
					</view>
					<picker v-else @change="bindChallengeChange" :value="challengeIndex" :range="challenges" range-key="displayName">
						<view class="input-select">
							<text class="select-text">{{ challengeIndex === -1 ? $t('training.selectChallenge') : challenges[challengeIndex].displayName }}</text>
							<text class="select-icon">▼</text>
						</view>
					</picker>
				</view>
				
				<!-- 目标设置 -->
				<view class="input-group">
					<text class="input-label">🎯 今日目标</text>
					<input 
						class="input-field" 
						type="number" 
						v-model.number="form.target" 
						placeholder="请输入今日目标次数"
						@input="validateTargetInput"
					/>
				</view>
				
				<!-- 已完成次数（仅在开始训练后显示） -->
				<view class="input-group" v-if="started">
					<text class="input-label">✅ 已完成次数</text>
					<input 
						class="input-field" 
						type="number" 
						v-model.number="report.done" 
						placeholder="请输入已完成次数"
						@input="validateDoneInput"
					/>
				</view>
				
				<!-- 日期选择 -->
				<view class="input-group">
					<text class="input-label">{{ $t('training.trainingDate') }}</text>
					<picker mode="date" :value="form.date" @change="onDateChange">
						<view class="input-select">
							<text class="select-text">{{ form.date || $t('training.selectDate') }}</text>
							<text class="select-icon">📅</text>
						</view>
					</picker>
				</view>
				
				<!-- 操作按钮组 -->
				<view class="button-group">
					<!-- 当前训练信息 -->
					<view class="current-info" v-if="started && (form.groupId || form.challengeId)">
						<text class="info-text">当前训练：</text>
						<text class="info-group" v-if="groupIndex !== -1">{{ groups[groupIndex].groupName }}</text>
						<text class="info-challenge" v-if="challengeIndex !== -1"> - {{ challenges[challengeIndex].challengeName }}</text>
					</view>
								
					<button class="action-btn primary" @tap="onStart" v-if="!started" :disabled="!canStartTraining">
						<text class="btn-text">{{ $t('training.startTraining') }}</text>
					</button>
					<button class="action-btn secondary" @tap="onAbandon" v-if="started">
						<text class="btn-text">{{ $t('training.abandonTraining') }}</text>
					</button>
					<button class="action-btn success" @tap="onReport" v-if="started" :disabled="!canReportProgress">
						<text class="btn-text">{{ $t('training.reportProgress') }}</text>
					</button>
				</view>
			</view>
		</view>
		
		<!-- 协同训练设置区域 -->
		<view class="collaboration-card" v-if="form.groupId">
			<view class="collaboration-header">
				<text class="collaboration-title">{{ $t('training.collaborationSettings') }}</text>
				<text class="collaboration-desc">{{ $t('training.manageCollaboration') }}</text>
			</view>
			
			<view class="settings-container">
				<view class="setting-item">
					<view class="setting-content">
						<text class="setting-label">{{ $t('training.groupVisibility') }}</text>
						<text class="setting-desc">{{ $t('training.visibilityDesc') }}</text>
					</view>
					<switch @change="onVisibilityChange" :checked="visibilitySetting" />
				</view>
				
				<view class="setting-item">
					<view class="setting-content">
						<text class="setting-label">{{ $t('training.realTimeSync') }}</text>
						<text class="setting-desc">{{ $t('training.syncDesc') }}</text>
					</view>
					<switch @change="onSyncChange" :checked="syncSetting" />
				</view>
				
				<view class="setting-item" v-if="form.groupId">
					<view class="setting-content">
						<text class="setting-label">{{ $t('training.viewGroupProgress') }}</text>
						<text class="setting-desc">{{ $t('training.viewProgressDesc') }}</text>
					</view>
					<button class="action-btn view" @tap="viewGroupProgress">
						<text class="btn-text">{{ $t('common.view') }}</text>
					</button>
				</view>
				
				<!-- 挑战关联功能 -->
				<view class="setting-item" v-if="challenges.length > 0">
					<view class="setting-content">
						<text class="setting-label">{{ $t('training.challengeAssociation') }}</text>
						<text class="setting-desc">{{ $t('training.challengeDesc') }}</text>
					</view>
					<picker @change="bindChallengeChange" :value="challengeIndex" :range="challenges" range-key="challengeName">
						<view class="input-select small">
							<text class="select-text">{{ challengeIndex === -1 ? $t('training.selectChallenge') : challenges[challengeIndex].challengeName }}</text>
							<text class="select-icon">▼</text>
						</view>
					</picker>
				</view>
			</view>
		</view>

		<!-- 实时消息中心 -->
		<view class="messages-card" v-if="messages.length">
			<view class="messages-header">
				<text class="messages-title">{{ $t('training.messageCenter') }}</text>
				<text class="messages-count">({{ messages.length }})</text>
			</view>
			<view class="messages-container">
				<view v-for="(m, idx) in messages" :key="idx" class="msg-item">
					<view class="msg-row">
						<text class="msg-type">{{ formatMessageType(m.type) }}</text>
						<text class="msg-time">{{ m.time }}</text>
					</view>
					<text class="msg-text">{{ m.message || $t('training.defaultMessage') }}</text>
					<view class="msg-extra" v-if="m.extra">
						<text class="msg-extra-text">{{ m.extra }}</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 空状态提示 -->
		<view class="empty-state" v-if="messages.length === 0 && started">
			<text class="empty-text">{{ $t('training.noMessages') }}</text>
		</view>
	</view>
</template>

<script>
// 导入API和工具函数
import { 
	apiTrainingStart, 
	apiTrainingReport, 
	apiTrainingAbandon, 
	apiMyGroups, 
	apiGetGroupChallenges, 
	apiTrainingPunchChallenge 
} from '@/common/api.js';

import { requireLogin, getUserIdFromToken } from '@/common/auth.js';
import { trackEvent } from '@/common/analytics.js';
// 引入原生 WebSocket（支持小程序）
import * as wsNative from '@/common/ws-native.js';

// 常量配置（便于商业定制）
const CONFIG = {
	MAX_MESSAGE_COUNT: 20,       // 最大消息数量
	MIN_TARGET_VALUE: 1,         // 最小目标值
	MAX_TARGET_VALUE: 9999,      // 最大目标值
	LOADING_DELAY: 300,          // 最小加载提示时间
	TOAST_DURATION: 2000         // 提示框显示时长
};

// 国际化资源（可替换为vue-i18n）
const I18N_RESOURCES = {
	zh_CN: {
		training: {
			todayStatus: '💪 今日训练状态',
			training: '训练中',
			notStarted: '未开始',
			completed: '已完成',
			target: '目标',
			completionRate: '完成度',
			trainingSettings: '🎯 训练设置',
			configurePlan: '配置你的训练计划',
			group: '👥 搭子组',
			clickToLoadGroups: '点击加载搭子组',
			selectGroup: '请选择所在搭子组',
			relatedChallenge: '🏆 关联挑战',
			clickToLoadChallenges: '点击加载挑战',
			selectChallenge: '请选择关联挑战(可选)',
			todayTarget: '🎯 今日目标',
			inputTargetTimes: '请输入今日目标次数',
			trainingDate: '📅 训练日期',
			selectDate: '请选择训练日期，默认今天',
			startTraining: '🚀 开始训练',
			abandonTraining: '❌ 放弃训练',
			reportProgress: '✅ 上报进度',
			collaborationSettings: '🤝 协同训练设置',
			manageCollaboration: '管理你的协作选项',
			groupVisibility: '👥 组员可见性',
			visibilityDesc: '是否允许组员查看你的训练进度',
			realTimeSync: '🔄 进度实时同步',
			syncDesc: '开启后进度将实时同步给组员',
			viewGroupProgress: '📊 查看组员进度',
			viewProgressDesc: '查看其他成员的训练情况',
			challengeAssociation: '챌 挑战任务关联',
			challengeDesc: '将训练与特定挑战关联',
			messageCenter: '💬 实时消息中心',
			defaultMessage: '收到一条训练相关通知',
			noMessages: '暂无实时消息',
			visibilityOn: '组员可见已开启',
			visibilityOff: '组员可见已关闭',
			syncOn: '进度同步已开启',
			syncOff: '进度同步已关闭',
			loginError: '登录信息异常',
			selectGroupFirst: '请选择搭子组',
			completeInfo: '请补全信息',
			doneExceedTarget: '完成次数不能超过目标次数',
			startSuccess: '已开始训练',
			startFailed: '开始训练失败',
			reportSuccess: '上报成功',
			reportFailed: '上报失败',
			abandonSuccess: '已放弃本次训练',
			abandonFailed: '放弃训练失败',
			challengePunchSuccess: '挑战打卡成功',
			challengePunchFailed: '挑战打卡失败',
			loadGroupsFailed: '加载组列表失败',
			loadChallengesFailed: '加载挑战列表失败',
			loadProgressFailed: '获取进度失败',
			functionComingSoon: '此功能即将推出'
		},
		common: {
			view: '查看',
			confirm: '确定',
			cancel: '取消',
			confirmAbandon: '确定要放弃本次训练吗？',
			confirmText: '确定放弃',
			cancelText: '继续训练',
			loading: '加载中...',
			processing: '处理中...',
			reporting: '上报中...',
			startingTraining: '开始训练中...',
			gettingProgress: '获取组员进度...'
		}
	}
};

export default {
	name: 'TrainingCollaborationPage', // 标准化组件名
	data() {
		return {
			form: {
				groupId: null,
				date: this.formatDate(new Date()),
				target: null,
				challengeId: null,
				reportDone: null // 分离上报的完成数，避免和展示的report混淆
			},
			report: {
				done: 0 // 初始化默认值，避免undefined
			},
			started: false,
			messages: [],
			groups: [],
			groupIndex: -1,
			challenges: [],
			challengeIndex: -1,
			// 协同训练设置
			visibilitySetting: true,  // 组员可见性设置
			syncSetting: true,        // 进度同步设置
			// 加载状态管理
			loading: {
				groups: false,
				challenges: false,
				progress: false
			},
			// 组频道订阅对象（用于取消订阅）
			groupSubscription: null
		};
	},

	computed: {
		// 计算是否可以开始训练
		canStartTraining() {
			return !!this.form.groupId && !!this.form.target && this.form.target >= CONFIG.MIN_TARGET_VALUE;
		},
		
		// 计算是否可以上报进度
		canReportProgress() {
			return !!this.form.groupId && !!this.form.target && 
				!!this.report.done && this.report.done <= this.form.target && 
				this.report.done >= 0;
		},
		
		// 国际化快捷访问
		$t() {
			// 实际项目中替换为vue-i18n的this.$t
			return (key) => {
				const keys = key.split('.');
				let value = I18N_RESOURCES.zh_CN;
				for (const k of keys) {
					value = value[k];
					if (!value) break;
				}
				return value || key;
			};
		}
	},

	onShow() {
		// 登录校验
		if (!requireLogin()) {
			uni.showToast({ 
				title: this.$t('training.loginError'), 
				icon: 'none',
				duration: CONFIG.TOAST_DURATION
			});
			return;
		}

		// 监听 WebSocket 推送的训练相关消息（个人消息频道）
		uni.$on('ws-message', this.handleWsMessage);
		
		// 订阅组频道（接收训练进度推送）
		// 如果已选择组，立即订阅；否则在选组后订阅
		if (this.form.groupId) {
			this.subscribeGroupChannel(this.form.groupId);
		}

		// 埋点：页面展示
		trackEvent('training_page_show', {
			userId: this.getUserId(),
			page: 'training_collaboration'
		});

		// 加载用户组列表
		this.loadUserGroups();
	},

	onHide() {
		uni.$off('ws-message', this.handleWsMessage);
		uni.$off('ws-native-message', this.handleWsMessage);
		// 取消组频道订阅
		wsNative.unsubscribeGroup();
	},

	onUnload() {
		uni.$off('ws-message', this.handleWsMessage);
		uni.$off('ws-native-message', this.handleWsMessage);
		// 取消组频道订阅并断开连接
		wsNative.unsubscribeGroup();
	},

	methods: {
		/**
		 * 计算完成度百分比
		 * @returns {Number} 完成度百分比
		 */
		calculateCompletionRate() {
			if (!this.report.done || !this.form.target || this.form.target <= 0) return 0;
			return Math.min(Math.round((this.report.done / this.form.target) * 100), 100);
		},

		/**
		 * 加载用户所属的组列表
		 */
		async loadUserGroups() {
			if (this.loading.groups) return; // 防止重复加载
			
			const userId = this.getUserId();
			if (!userId) {
				uni.showToast({ 
					title: this.$t('training.loginError'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				return;
			}
			
			this.loading.groups = true;
			const loadingTimer = setTimeout(() => {
				uni.showLoading({ title: this.$t('common.loading') });
			}, CONFIG.LOADING_DELAY);
			
			try {
				const res = await apiMyGroups();
				console.log('加载组列表返回:', res);
				const rawData = res?.data || res || [];
				this.groups = Array.isArray(rawData) ? rawData : [];
				console.log('组列表长度:', this.groups.length);
				console.log('组列表内容:', JSON.stringify(this.groups));
				
				// 埋点：加载组成功
				trackEvent('load_groups_success', {
					userId,
					groupCount: this.groups.length
				});
				
				// 如果还没有选择组，自动选择第一个组并订阅
				if (this.groupIndex === -1 && this.groups.length > 0) {
					const firstGroup = this.groups[0];
					this.groupIndex = 0;
					this.form.groupId = firstGroup.id;
					console.log('自动选择第一个组:', firstGroup.id, firstGroup.groupName);
					
					// 订阅该组的训练进度推送
					this.subscribeGroupChannel(firstGroup.id);
					
					// 加载该组的挑战
					this.loadGroupChallenges(firstGroup.id);
				} else if (this.groupIndex !== -1 && this.form.groupId) {
					// 如果已选择组，加载该组的挑战
					this.loadGroupChallenges(this.form.groupId);
				}
			} catch (e) {
				console.error('加载组列表失败:', e);
				uni.showToast({ 
					title: this.$t('training.loadGroupsFailed'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：加载组失败
				trackEvent('load_groups_failed', {
					userId,
					error: e.message || JSON.stringify(e)
				});
			} finally {
				clearTimeout(loadingTimer);
				uni.hideLoading();
				this.loading.groups = false;
			}
		},

		/**
		 * 绑定组选择事件
		 * @param {Object} e - 选择事件对象
		 */
		bindGroupChange(e) {
			const index = Number(e.detail.value);
			if (isNaN(index) || index < 0 || index >= this.groups.length) return;
			
			this.groupIndex = index;
			const selectedGroup = this.groups[index];
			
			if (selectedGroup) {
				this.form.groupId = selectedGroup.id;
				
				// 订阅新选择的组频道（接收训练进度推送）
				this.subscribeGroupChannel(selectedGroup.id);
				
				// 埋点：选择组
				trackEvent('select_group', {
					userId: this.getUserId(),
					groupId: selectedGroup.id,
					groupName: selectedGroup.groupName
				});
				
				// 当组改变时，重新加载该组的挑战
				this.loadGroupChallenges(selectedGroup.id);
			}
		},
		
		/**
		 * 绑定挑战选择事件
		 * @param {Object} e - 选择事件对象
		 */
		bindChallengeChange(e) {
			const index = Number(e.detail.value);
			if (isNaN(index) || index < 0 || index >= this.challenges.length) return;
			
			this.challengeIndex = index;
			const selectedChallenge = this.challenges[index];
		
			if (selectedChallenge) {
				this.form.challengeId = selectedChallenge.id;
				
				// 埋点：选择挑战
				trackEvent('select_challenge', {
					userId: this.getUserId(),
					challengeId: selectedChallenge.id,
					challengeName: selectedChallenge.challengeName,
					groupId: this.form.groupId
				});
			}
		},
		
		/**
		 * 加载指定组的挑战列表
		 * @param {String|Number} groupId - 组ID
		 */
		async loadGroupChallenges(groupId) {
			if (!groupId || this.loading.challenges) return;
			
			this.loading.challenges = true;
			const loadingTimer = setTimeout(() => {
				uni.showLoading({ title: this.$t('common.loading') });
			}, CONFIG.LOADING_DELAY);
			
			try {
				const res = await apiGetGroupChallenges(groupId);
				console.log('加载挑战返回:', res);
				const rawData = res?.data || res || [];
				const allChallenges = Array.isArray(rawData) ? rawData : [];
				this.challenges = allChallenges.filter(c => c.status === 1).map(c => ({
					...c,
					displayName: this.getChallengeDisplayName(c)
				}));
				console.log('挑战列表:', this.challenges);
				
				// 埋点：加载挑战成功
				trackEvent('load_challenges_success', {
					userId: this.getUserId(),
					groupId,
					challengeCount: this.challenges.length
				});
			} catch (e) {
				console.error('加载挑战列表失败:', e);
				uni.showToast({ 
					title: this.$t('training.loadChallengesFailed'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：加载挑战失败
				trackEvent('load_challenges_failed', {
					userId: this.getUserId(),
					groupId,
					error: e.message || JSON.stringify(e)
				});
			} finally {
				clearTimeout(loadingTimer);
				uni.hideLoading();
				this.loading.challenges = false;
				// 重置选择
				this.challengeIndex = -1;
				this.form.challengeId = null;
			}
		},

		/**
		 * 格式化日期为YYYY-MM-DD格式
		 * @param {Date} d - 日期对象
		 * @returns {String} 格式化后的日期字符串
		 */
		formatDate(d) {
			if (!(d instanceof Date) || isNaN(d.getTime())) {
				d = new Date();
			}
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			return `${y}-${m}-${day}`;
		},

		/**
		 * 获取当前用户ID
		 * @returns {String|Number|null} 用户ID
		 */
		getUserId() {
			try {
				return getUserIdFromToken();
			} catch (e) {
				console.error('获取用户ID失败:', e);
				return null;
			}
		},
		
		/**
		 * 订阅组的 WebSocket 频道
		 * 用于接收后端推送的训练进度、开始、放弃等实时消息
		 * @param {Number} groupId - 组ID
		 */
		async subscribeGroupChannel(groupId) {
			console.log('subscribeGroupChannel 被调用, groupId=', groupId);
			
			if (!groupId) {
				console.warn('groupId 为空，取消订阅');
				return;
			}
			
			// 取消之前的订阅（切换组时）
			wsNative.unsubscribeGroup();
			
			try {
				// 确保 WebSocket 已连接
				const connected = wsNative.isConnected();
				console.log('原生 WebSocket 连接状态:', connected);
				
				if (!connected) {
					console.log('原生 WebSocket 未连接，尝试初始化...');
					await wsNative.initNativeWebSocket();
					console.log('原生 WebSocket 初始化完成');
				}
				
				// 设置消息回调
				wsNative.setMessageCallback((message) => {
					console.log('原生 WebSocket 收到消息:', message);
					this.handleWsMessage(message);
				});
				
				// 订阅组频道
				const success = wsNative.subscribeGroup(groupId);
				
				if (success) {
					console.log('已订阅组训练频道: groupId=', groupId);
				}
			} catch (e) {
				console.warn('订阅组频道失败（不影响基本功能）:', e.message);
			}
		},

		/**
		 * 处理WebSocket消息
		 * @param {Object} payload - 消息载荷
		 */
		handleWsMessage(payload) {
			console.log('handleWsMessage 收到消息:', payload);
			
			try {
				// 只关心训练相关类型
				const type = payload.type || '';
				console.log('消息类型:', type, '是否匹配:', type.startsWith('TRAINING_') || type === 'PROGRESS_UPDATE');
				
				if (!type || !(type.startsWith('TRAINING_') || type === 'PROGRESS_UPDATE')) {
					console.log('消息类型不匹配，忽略');
					return;
				}
				
				// 格式化时间
				const now = new Date();
				const time = `${now.getHours().toString().padStart(2, '0')}:${now
					.getMinutes()
					.toString()
					.padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
				
				// 构建额外信息
				const extraParts = [];
				if (payload.groupId) extraParts.push(`组: ${payload.groupId}`);
				if (payload.userId) extraParts.push(`搭子: ${payload.userId}`);
				if (typeof payload.done === 'number' && typeof payload.target === 'number') {
					extraParts.push(`进度: ${payload.done}/${payload.target}`);
				}
				
				// 添加新消息到顶部
				const newMessage = {
					type,
					message: payload.message,
					time,
					extra: extraParts.join('  ')
				};
				this.messages.unshift(newMessage);
				console.log('消息已添加到列表:', newMessage, '当前消息数:', this.messages.length);
				
				// 限制消息数量
				if (this.messages.length > CONFIG.MAX_MESSAGE_COUNT) {
					this.messages.pop();
				}
				
				// 埋点：接收消息
				trackEvent('receive_training_message', {
					userId: this.getUserId(),
					messageType: type,
					groupId: payload.groupId
				});
			} catch (e) {
				console.error('处理WebSocket消息失败:', e);
			}
		},

		/**
		 * 开始训练
		 */
		async onStart() {
			const userId = this.getUserId();
			if (!userId) {
				uni.showToast({ 
					title: this.$t('training.loginError'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				return;
			}
			
			if (!this.form.groupId) {
				uni.showToast({ 
					title: this.$t('training.selectGroupFirst'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				return;
			}
			
			// 埋点：点击开始训练
			trackEvent('click_start_training', {
				userId,
				groupId: this.form.groupId,
				target: this.form.target
			});
			
			try {
				uni.showLoading({ title: this.$t('common.startingTraining') });
				
				await apiTrainingStart({
					userId,
					groupId: this.form.groupId,
					target: this.form.target,
					date: this.form.date
				});
				
				uni.hideLoading();
				this.started = true;
				
				// 重置上报进度
				this.report.done = 0;
				
				uni.showToast({ 
					title: this.$t('training.startSuccess'), 
					icon: 'success',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：开始训练成功
				trackEvent('start_training_success', {
					userId,
					groupId: this.form.groupId
				});
			} catch (e) {
				uni.hideLoading();
				console.error('开始训练失败:', e);
				uni.showToast({ 
					title: this.$t('training.startFailed'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：开始训练失败
				trackEvent('start_training_failed', {
					userId,
					groupId: this.form.groupId,
					error: e.message || JSON.stringify(e)
				});
			}
		},

		/**
		 * 上报训练进度
		 */
		async onReport() {
			const userId = this.getUserId();
			if (!userId) {
				uni.showToast({ 
					title: this.$t('training.loginError'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				return;
			}
			
			// 输入验证
			if (!this.canReportProgress) {
				uni.showToast({ 
					title: this.$t('training.completeInfo'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				return;
			}

			// 埋点：点击上报进度
			trackEvent('click_report_progress', {
				userId,
				groupId: this.form.groupId,
				done: this.report.done,
				target: this.form.target,
				completionRate: this.calculateCompletionRate()
			});
			
			try {
				uni.showLoading({ title: this.$t('common.reporting') });

				// 上报进度
				await apiTrainingReport({
					userId,
					groupId: this.form.groupId,
					date: this.form.date,
					done: Number(this.report.done),
					target: Number(this.form.target),
					challengeId: this.form.challengeId || null
				});
				
				uni.hideLoading();
				uni.showToast({ 
					title: this.$t('training.reportSuccess'), 
					icon: 'success',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：上报进度成功
				trackEvent('report_progress_success', {
					userId,
					groupId: this.form.groupId,
					done: this.report.done,
					target: this.form.target
				});
				
			} catch (e) {
				uni.hideLoading();
				console.error('上报失败:', e);
				
				let errorMsg = this.$t('training.reportFailed');
				if (e.message && e.message.includes('请先完成今日协同训练后再打卡')) {
					errorMsg = e.message;
				}
				
				uni.showToast({ 
					title: errorMsg, 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：上报进度失败
				trackEvent('report_progress_failed', {
					userId,
					groupId: this.form.groupId,
					error: e.message || JSON.stringify(e)
				});
			}
		},

		/**
		 * 放弃训练
		 */
		onAbandon() {
			uni.showModal({
				title: this.$t('common.confirm'),
				content: this.$t('common.confirmAbandon'),
				confirmText: this.$t('common.confirmText'),
				cancelText: this.$t('common.cancelText'),
				success: (res) => {
					if (res.confirm) {
						this.performAbandon();
					}
				}
			});
		},
		
		/**
		 * 执行放弃训练操作
		 */
		async performAbandon() {
			const userId = this.getUserId();
			if (!userId) {
				uni.showToast({ 
					title: this.$t('training.loginError'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				return;
			}

			if (!this.form.groupId) return;

			// 埋点：点击放弃训练
			trackEvent('click_abandon_training', {
				userId,
				groupId: this.form.groupId
			});
			
			try {
				uni.showLoading({ title: this.$t('common.processing') });
				
				await apiTrainingAbandon({
					userId,
					groupId: this.form.groupId,
					date: this.form.date
				});
				
				uni.hideLoading();
				this.started = false;
				
				// 埋点：放弃训练成功
				trackEvent('abandon_training_success', {
					userId,
					groupId: this.form.groupId
				});
				
				uni.showToast({ 
					title: this.$t('training.abandonSuccess'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
			} catch (e) {
				uni.hideLoading();
				console.error('放弃训练失败:', e);
				uni.showToast({ 
					title: this.$t('training.abandonFailed'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：放弃训练失败
				trackEvent('abandon_training_failed', {
					userId,
					groupId: this.form.groupId,
					error: e.message || JSON.stringify(e)
				});
			}
		},

		/**
		 * 组员可见性切换
		 * @param {Object} e - 切换事件对象
		 */
		onVisibilityChange(e) {
			this.visibilitySetting = e.detail.value;
			
			// 埋点：切换可见性
			trackEvent('toggle_visibility_setting', {
				userId: this.getUserId(),
				visibility: this.visibilitySetting
			});
			
			uni.showToast({
				title: this.visibilitySetting 
					? this.$t('training.visibilityOn') 
					: this.$t('training.visibilityOff'),
				icon: 'none',
				duration: CONFIG.TOAST_DURATION
			});
		},

		/**
		 * 进度同步切换
		 * @param {Object} e - 切换事件对象
		 */
		onSyncChange(e) {
			this.syncSetting = e.detail.value;
			
			// 埋点：切换同步设置
			trackEvent('toggle_sync_setting', {
				userId: this.getUserId(),
				sync: this.syncSetting
			});
			
			uni.showToast({
				title: this.syncSetting 
					? this.$t('training.syncOn') 
					: this.$t('training.syncOff'),
				icon: 'none',
				duration: CONFIG.TOAST_DURATION
			});
		},

		/**
		 * 查看组员进度
		 */
		async viewGroupProgress() {
			if (!this.form.groupId) {
				uni.showToast({ 
					title: this.$t('training.selectGroupFirst'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				return;
			}
			
			// 埋点：点击查看组员进度
			trackEvent('click_view_group_progress', {
				userId: this.getUserId(),
				groupId: this.form.groupId
			});
			
			try {
				uni.showLoading({ title: this.$t('common.gettingProgress') });
				
				// TODO: 替换为真实的API调用
				// const progressData = await apiGetGroupTrainingProgress({
				//   userId: this.getUserId(),
				//   groupId: this.form.groupId,
				//   date: this.form.date
				// });
				
				// 模拟加载
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				uni.hideLoading();
				uni.showToast({ 
					title: this.$t('training.functionComingSoon'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				
				// // 跳转到组员进度页面
				// uni.navigateTo({
				//   url: `/pages/training/group-progress?groupId=${this.form.groupId}&date=${this.form.date}`
				// });
				
			} catch (e) {
				uni.hideLoading();
				console.error('获取组员进度失败:', e);
				uni.showToast({ 
					title: this.$t('training.loadProgressFailed'), 
					icon: 'none',
					duration: CONFIG.TOAST_DURATION
				});
				
				// 埋点：获取进度失败
				trackEvent('get_group_progress_failed', {
					userId: this.getUserId(),
					groupId: this.form.groupId,
					error: e.message || JSON.stringify(e)
				});
			}
		},
		
		/**
		 * 验证目标值输入
		 */
		validateTargetInput() {
			if (this.form.target === null || this.form.target === undefined) return;
			
			// 限制最小值
			if (this.form.target < CONFIG.MIN_TARGET_VALUE) {
				this.form.target = CONFIG.MIN_TARGET_VALUE;
			}
			
			// 限制最大值
			if (this.form.target > CONFIG.MAX_TARGET_VALUE) {
				this.form.target = CONFIG.MAX_TARGET_VALUE;
			}
		},
		
		validateDoneInput() {
			if (this.report.done === null || this.report.done === undefined) return;
			
			// 限制最小值
			if (this.report.done < 0) {
				this.report.done = 0;
			}
			
			// 限制最大值不能超过目标
			if (this.form.target && this.report.done > this.form.target) {
				this.report.done = this.form.target;
			}
		},
		
		getChallengeDisplayName(challenge) {
			const isGroupChallenge = challenge.groupId && challenge.groupId > 0;
			const typeText = isGroupChallenge ? '[组内]' : '[公开]';
			return `${typeText} ${challenge.challengeName}`;
		},
		
		/**
		 * 日期选择事件
		 * @param {Object} e - 选择事件对象
		 */
		onDateChange(e) {
			this.form.date = e.detail.value;
			
			// 埋点：选择日期
			trackEvent('select_training_date', {
				userId: this.getUserId(),
				date: this.form.date
			});
		},
		
		/**
		 * 格式化消息类型显示
		 * @param {String} type - 消息类型
		 * @returns {String} 格式化后的类型名称
		 */
		formatMessageType(type) {
			const typeMap = {
				'TRAINING_START': '训练开始',
				'TRAINING_ABANDON': '训练放弃',
				'TRAINING_COMPLETE': '训练完成',
				'PROGRESS_UPDATE': '进度更新',
				'TRAINING_REPORT': '进度上报',
				'CHALLENGE_PUNCH': '挑战打卡'
			};
			return typeMap[type] || type;
		}
	}
};
</script>

<style scoped>
/* 基础容器样式 */
.container {
	padding: 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	min-height: 100vh;
}

/* 状态卡片样式 */
.status-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.06);
}

.status-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.status-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
}

.status-indicator {
	padding: 8rpx 16rpx;
	border-radius: 20rpx;
	background: #f5f5f5;
}

.status-indicator.active {
	background: rgba(102, 126, 234, 0.15);
}

.status-text {
	font-size: 24rpx;
	color: #666;
}

.status-indicator.active .status-text {
	color: #667eea;
}

.progress-summary {
	display: flex;
	justify-content: space-around;
	padding: 20rpx 0;
	border-top: 1rpx solid #f0f0f0;
}

.progress-item {
	text-align: center;
}

.progress-label {
	display: block;
	font-size: 24rpx;
	color: #999;
	margin-bottom: 8rpx;
}

.progress-value {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: #667eea;
}

/* 设置卡片样式 */
.setup-card, .collaboration-card, .messages-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.06);
}

.setup-header, .collaboration-header, .messages-header {
	margin-bottom: 20rpx;
}

.setup-title, .collaboration-title, .messages-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333;
	display: block;
	margin-bottom: 8rpx;
}

.setup-desc, .collaboration-desc {
	font-size: 24rpx;
	color: #999;
}

.input-section, .settings-container {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.input-group {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.input-label {
	font-size: 26rpx;
	color: #666;
}

.debug-info {
	font-size: 20rpx;
	color: #999;
	margin-left: 10rpx;
}

.input-action {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20rpx;
	border: 1rpx dashed #ddd;
	border-radius: 12rpx;
	gap: 8rpx;
}

.action-text {
	font-size: 24rpx;
	color: #999;
}

.action-icon {
	font-size: 20rpx;
	color: #999;
}

.input-select {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	border: 1rpx solid #e9ecef;
	border-radius: 12rpx;
	background: #f8f9fa;
}

.input-select.small {
	padding: 12rpx 16rpx;
}

.select-text {
	font-size: 26rpx;
	color: #333;
}

.select-icon {
	font-size: 24rpx;
	color: #999;
}

.input-field {
	padding: 20rpx;
	border: 1rpx solid #e9ecef;
	border-radius: 12rpx;
	font-size: 26rpx;
	background: #f8f9fa;
}

.button-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-top: 10rpx;
}

.current-info {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	padding: 16rpx 24rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 16rpx;
	margin-bottom: 16rpx;
}

.info-text {
	color: rgba(255, 255, 255, 0.9);
	font-size: 26rpx;
	margin-right: 8rpx;
}

.info-group {
	color: #fff;
	font-size: 28rpx;
	font-weight: 600;
}

.info-challenge {
	color: rgba(255, 255, 255, 0.9);
	font-size: 26rpx;
}

.action-btn {
	flex: 1;
	padding: 20rpx;
	border-radius: 12rpx;
	border: none;
}

.action-btn:disabled {
	opacity: 0.6;
}

.action-btn.primary {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.action-btn.secondary {
	background: linear-gradient(135deg, #ef476f 0%, #ffd166 100%);
}

.action-btn.success {
	background: linear-gradient(135deg, #4ecdc4 0%, #1a936f 100%);
}

.action-btn.view {
	background: #f5f5f5;
	padding: 12rpx 20rpx;
}

.btn-text {
	font-size: 26rpx;
	color: #ffffff;
}

.action-btn.view .btn-text {
	color: #333;
	font-size: 24rpx;
}

/* 设置项样式 */
.setting-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #eee;
}

.setting-item:last-child {
	border-bottom: none;
}

.setting-content {
	flex: 1;
}

.setting-label {
	font-size: 28rpx;
	color: #333;
	display: block;
	margin-bottom: 4rpx;
}

.setting-desc {
	font-size: 22rpx;
	color: #999;
}

/* 消息中心样式 */
.messages-container {
	max-height: 400rpx;
	overflow-y: auto;
}

.messages-count {
	font-size: 22rpx;
	color: #667eea;
}

.msg-item {
	background: linear-gradient(to bottom, #ffffff, #fafafa);
	padding: 20rpx;
	border-radius: 16rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	border: 1rpx solid #e9ecef;
}

.msg-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 6rpx;
}

.msg-type {
	font-size: 24rpx;
	color: #667eea;
	font-weight: 600;
}

.msg-time {
	font-size: 22rpx;
	color: #999;
}

.msg-text {
	font-size: 26rpx;
	color: #333;
}

.msg-extra {
	margin-top: 4rpx;
}

.msg-extra-text {
	font-size: 22rpx;
	color: #666;
}

/* 空状态样式 */
.empty-state {
	text-align: center;
	padding: 40rpx;
}

.empty-text {
	font-size: 26rpx;
	color: #999;
}

/* 响应式适配 */
@media (max-width: 750rpx) {
	.container {
		padding: 20rpx;
	}
	
	.button-group {
		flex-direction: column;
	}
}
</style>