<template>
	<view class="container" :style="{ zIndex: showCreateModalFlag ? 9999 : 'auto' }">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="header-title">挑战列表</text>
			<!-- 创建挑战按钮 -->
			<button class="create-challenge-btn" @tap="showCreateModal">
				<text class="btn-plus">+</text>
				<text class="btn-text">创建挑战</text>
			</button>
		</view>
		
		<!-- 搜索和筛选区域 -->
		<view class="filter-section">
			<view class="search-box">
				<input 
					type="text" 
					placeholder="搜索挑战名称..." 
					v-model="searchKeyword" 
					@input="handleSearch"
					class="search-input"
				/>
			</view>
			
			<view class="filter-options">
				<picker @change="onStatusChange" :value="statusIndex" :range="statusOptions">
					<view class="picker-option">
						<text>{{ statusOptions[statusIndex] }}</text>
						<text class="arrow">▼</text>
					</view>
				</picker>
				
				<button class="refresh-btn" @tap="refreshChallengeStatus">
					<text>🔄</text>
				</button>
			</view>
		</view>
		
		<!-- 挑战列表 -->
		<scroll-view 
			class="challenge-list-container" 
			scroll-y="true"
			@scrolltolower="loadMore"
			:lower-threshold="20"
		>
			<view v-if="loading && !challenges.length" class="loading-container">
				<text>加载中...</text>
			</view>
			
			<view v-else-if="!challenges.length" class="empty-container">
				<text>暂无挑战数据</text>
			</view>
			
			<view v-else class="challenge-list">
				<view 
					v-for="challenge in challenges" 
					:key="challenge.id" 
					class="challenge-item"
					@tap="goToDetail(challenge.id)"
				>
					<view class="challenge-card">
						<image 
							v-if="challenge.coverImage" 
							:src="challenge.coverImage" 
							class="cover-image" 
							mode="aspectFill"
						></image>
						<view class="card-content">
							<view class="challenge-header">
								<view class="header-left">
									<text class="challenge-title">{{ challenge.challengeName || challenge.title || challenge.name }}</text>
									<view class="type-badge" :class="getTypeClass(challenge.type, challenge)">
										<text class="type-text">{{ getTypeText(challenge.type, challenge) }}</text>
									</view>
								</view>
								<view class="status-badge" :class="getStatusClass(challenge.status, challenge)">
									<text class="status-text">{{ getStatusText(challenge.status, challenge) }}</text>
								</view>
							</view>
							
							<view class="challenge-meta">
								<text class="meta-item" v-if="challenge.startDate">
									📅 {{ formatDate(challenge.startDate) }}
								</text>
								<text class="meta-item" v-if="challenge.endDate">
									🔚 {{ formatDate(challenge.endDate) }}
								</text>
								<text class="meta-item" v-if="challenge.maxMembers">
									👥 {{ challenge.currentMembers || 0 }}/{{ challenge.maxMembers }}人
								</text>
							</view>
							
							<view class="challenge-brief" v-if="challenge.trainRequire">
								<text class="brief-text">{{ challenge.trainRequire.substring(0, 60) }}{{ challenge.trainRequire.length > 60 ? '...' : '' }}</text>
							</view>
							
							<view class="challenge-footer">
								<text class="created-at" v-if="challenge.createdAt">
									创建时间: {{ formatDate(challenge.createdAt) }}
								</text>
							</view>
						</view>
					</view>
				</view>
				
				<view v-if="loadingMore" class="loading-more">
					<text>加载更多...</text>
				</view>
				
				<view v-if="noMoreData && challenges.length > 0" class="no-more-data">
					<text>没有更多数据了</text>
				</view>
			</view>
		</scroll-view>
		
		<!-- 创建挑战弹窗 -->
		<view v-if="showCreateModalFlag" class="modal-overlay" @tap="hideCreateModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">创建挑战</text>
					<text class="close-btn" @tap="hideCreateModal">×</text>
				</view>
				
				<view class="modal-body">
					<view class="form-group">
						<text class="form-label">挑战类型</text>
						<view class="radio-group">
							<view 
								class="radio-item" 
								:class="{ 'radio-selected': createForm.challengeType === 'public' }"
								@tap="selectChallengeType('public')"
							>
								<text class="radio-circle" :class="{ 'radio-checked': createForm.challengeType === 'public' }"></text>
								<text class="radio-text">公开挑战</text>
							</view>
							<view 
								class="radio-item" 
								:class="{ 'radio-selected': createForm.challengeType === 'group' }"
								@tap="selectChallengeType('group')"
							>
								<text class="radio-circle" :class="{ 'radio-checked': createForm.challengeType === 'group' }"></text>
								<text class="radio-text">组内挑战</text>
							</view>
						</view>
					</view>
					
					<view class="form-group">
						<text class="form-label">挑战名称</text>
						<input 
							type="text" 
							class="form-input" 
							placeholder="请输入挑战名称"
							v-model="createForm.challengeName"
						/>
					</view>
					
					<view class="form-group">
						<text class="form-label">开始日期</text>
						<view @tap="openStartDatePicker" class="picker-view">
							<text v-if="createForm.startDate">{{ createForm.startDate }}</text>
							<text v-else class="placeholder">请选择开始日期</text>
						</view>
					</view>
					
					<view class="form-group">
						<text class="form-label">结束日期</text>
						<view @tap="openEndDatePicker" class="picker-view">
							<text v-if="createForm.endDate">{{ createForm.endDate }}</text>
							<text v-else class="placeholder">请选择结束日期</text>
						</view>
					</view>
					
					<view class="form-group">
						<text class="form-label">最大参与人数</text>
						<input 
							type="number" 
							class="form-input" 
							placeholder="请输入最大参与人数"
							v-model="createForm.maxMembers"
						/>
					</view>
					
					<view class="form-group">
						<text class="form-label">挑战要求</text>
						<textarea 
							class="form-textarea" 
							placeholder="请输入挑战具体要求"
							v-model="createForm.trainRequire"
							:maxlength="200"
						/>
					</view>
					
					<view class="form-group">
						<text class="form-label">挑战封面</text>
						<view class="upload-area" @tap="chooseImage">
							<view v-if="!createForm.coverImage" class="upload-placeholder">
								<text class="upload-icon">+</text>
								<text class="upload-text">点击上传封面图片</text>
							</view>
							<view v-else class="uploaded-image">
								<image :src="createForm.coverImage" mode="aspectFill" class="preview-image"></image>
								<view class="remove-image" @tap.stop="removeImage">×</view>
							</view>
						</view>
					</view>
					
					<!-- 组内挑战时显示群组选择 -->
					<view v-if="createForm.challengeType === 'group'" class="form-group">
						<text class="form-label">选择群组 *</text>
						<view @tap="openGroupPicker" class="picker-view">
							<text v-if="groupIndex >= 0">{{ groups[groupIndex]?.groupName }}</text>
							<text v-else class="placeholder">请选择群组</text>
						</view>
					</view>
				</view>
				
				<view class="modal-footer">
					<button 
						class="submit-btn" 
						:class="{ 'btn-disabled': submitting }"
						:disabled="submitting"
						@tap="submitForm"
					>
						<text v-if="!submitting">创建挑战</text>
						<text v-else>提交中...</text>
					</button>
				</view>
			</view>
		</view>
		
		<!-- 独立的日期选择器弹窗 -->
		<view v-if="showDatePicker" class="date-picker-modal" @tap="hideDatePicker">
			<view class="date-picker-content" @tap.stop>
				<view class="date-picker-header">
					<text class="cancel-btn" @tap="hideDatePicker">取消</text>
					<text class="picker-title">选择日期</text>
					<text class="confirm-btn" @tap="confirmDate">确定</text>
				</view>
				<picker-view 
					:value="datePickerValue" 
					@change="onDateChange"
					class="date-picker-view"
				>
					<picker-view-column>
						<view class="picker-item" v-for="(year, index) in years" :key="index">{{ year }}年</view>
					</picker-view-column>
					<picker-view-column>
						<view class="picker-item" v-for="(month, index) in months" :key="index">{{ month }}月</view>
					</picker-view-column>
					<picker-view-column>
						<view class="picker-item" v-for="(day, index) in days" :key="index">{{ day }}日</view>
					</picker-view-column>
				</picker-view>
			</view>
		</view>
		
		<!-- 独立的群组选择器弹窗 -->
		<view v-if="showGroupPicker" class="group-picker-modal" @tap="hideGroupPicker">
			<view class="group-picker-content" @tap.stop>
				<view class="group-picker-header">
					<text class="cancel-btn" @tap="hideGroupPicker">取消</text>
					<text class="picker-title">选择群组</text>
					<text class="confirm-btn" @tap="confirmGroupSelection">确定</text>
				</view>
				<radio-group @change="onRadioGroupChange" class="group-list">
					<scroll-view scroll-y="true">
						<label 
							class="group-item" 
							v-for="(group, index) in groups" 
							:key="group.id || index"
						>
							<radio 
								:value="index"
								:checked="selectedGroupIndex === index"
								color="#667eea"
							/>
							<text>{{ group.groupName }}</text>
						</label>
					</scroll-view>
				</radio-group>
			</view>
		</view>
	</view>
</template>

<script>
import { apiChallengeList, apiChallengeCreate, apiMyGroups, apiUploadAction, apiGetFileUrl, apiCreateGroupChallenge, apiUpdateChallengeStatus } from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

export default {
	data() {
		return {
			challenges: [],
			loading: false,
			loadingMore: false,
			noMoreData: false,
			page: 1,
			pageSize: 10,
			total: 0,
			searchKeyword: '',
			statusFilter: null, // null表示全部状态
			statusIndex: 0,
			statusOptions: ['全部状态', '未开始', '进行中', '已结束'],
			hasMore: true,
			// 创建挑战弹窗相关
			showCreateModalFlag: false,
			submitting: false,
			minDate: '',
			groups: [],
			groupIndex: -1,
			createForm: {
				challengeType: 'public', // 'public' 或 'group'
				challengeName: '',
				startDate: '',
				endDate: '',
				maxMembers: 10,
				trainRequire: '',
				coverImage: '',
				groupId: null
			},
			// 独立选择器相关
			showDatePicker: false,
			datePickerType: '', // 'startDate' 或 'endDate'
			datePickerValue: [0, 0, 0], // [yearIndex, monthIndex, dayIndex]
			years: [],
			months: [],
			days: [],
			// 索引变化追踪
			indexChangeLog: [],
			showGroupPicker: false,
			selectedGroupIndex: -1
		};
	},
	
	onLoad() {
		// 页面加载时初始化数据
		this.loadData();
	},
	
	onShow() {
		// 页面显示时刷新数据
		if (!requireLogin()) return;
		this.refreshData();
	},
	
	methods: {
		// 加载挑战数据
		async loadData() {
			if (!requireLogin()) return;
			
			if (this.page === 1) {
				this.loading = true;
			} else {
				this.loadingMore = true;
			}
			
			try {
				const params = {};
				
				// 添加搜索关键词过滤
				if (this.searchKeyword) {
					params.keyword = this.searchKeyword;
				}
				
				// 添加状态过滤（null表示不过滤，其他值为具体状态）
				if (this.statusFilter !== null) {
					params.status = this.statusFilter;
				}
				
				const res = await apiChallengeList(params);
				// 后端返回简单数组格式 [{}, {}]
				const newChallenges = Array.isArray(res?.data) ? res.data : (res || []);
				
				// 直接替换整个列表，后端未实现分页
				this.challenges = newChallenges;
				this.total = newChallenges.length;
				// 由于后端未实现分页，始终认为没有更多数据
				this.hasMore = false;
				this.noMoreData = true;
				
			} catch (e) {
				console.error('加载挑战列表失败:', e);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
				this.loadingMore = false;
			}
		},
		
		// 刷新数据
		refreshData() {
			this.page = 1;
			this.noMoreData = false;
			this.loadData();
		},
		
		// 加载更多数据
		loadMore() {
			if (this.loadingMore || this.noMoreData) return;
			
			// 由于后端未实现分页，不加载更多数据
			uni.showToast({
				title: '已加载全部数据',
				icon: 'none'
			});
		},
		
		// 处理搜索
		handleSearch(e) {
			this.searchKeyword = e.detail.value;
			this.debounceSearch();
		},
		
		// 防抖搜索
		debounceSearch: function() {
			clearTimeout(this.searchTimer);
			this.searchTimer = setTimeout(() => {
				// 搜索时重置分页参数
				this.page = 1;
				this.noMoreData = false;
				this.loadData();
			}, 500);
		},
		
		// 状态筛选变化
		onStatusChange(e) {
			this.statusIndex = parseInt(e.detail.value);
			// 第一个选项是"全部状态"，对应值为null
			// 后续选项分别是"未开始"(0), "进行中"(1), "已结束"(2)
			this.statusFilter = this.statusIndex > 0 ? this.statusIndex - 1 : null;
			// 筛选时重置分页参数
			this.page = 1;
			this.noMoreData = false;
			this.loadData();
		},
		
		// 获取状态文本
		getStatusText(status, challenge) {
			// 如果提供了challenge对象，则优先使用计算的状态
			if (challenge && challenge.startDate && challenge.endDate) {
				const calculatedStatus = this.calculateChallengeStatus(challenge);
				const statusMap = ['未开始', '进行中', '已结束'];
				return statusMap[calculatedStatus] || '未知';
			}
						
			// 否则使用原始状态
			if (typeof status === 'number') {
				const statusMap = ['未开始', '进行中', '已结束'];
				return statusMap[status] || '未知';
			}
			return status || '未知';
		},
		
		// 获取挑战类型文本
		getTypeText(type, challenge) {
			const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
			return isGroupChallenge ? '组内挑战' : '公开挑战';
		},
		
		// 获取挑战类型类名
		getTypeClass(type, challenge) {
			const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
			return isGroupChallenge ? 'type-group' : 'type-public';
		},
					
		// 获取状态类名
		getStatusClass(status, challenge) {
			// 如果提供了challenge对象，则优先使用计算的状态
			if (challenge && challenge.startDate && challenge.endDate) {
				const calculatedStatus = this.calculateChallengeStatus(challenge);
				const classes = ['status-pending', 'status-active', 'status-ended'];
				return classes[calculatedStatus] || '';
			}
						
			// 否则使用原始状态
			if (typeof status === 'number') {
				const classes = ['status-pending', 'status-active', 'status-ended'];
				return classes[status] || '';
			}
			return '';
		},
					
		// 计算挑战状态
		calculateChallengeStatus(challenge) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
						
			const startDate = new Date(challenge.startDate);
			startDate.setHours(0, 0, 0, 0);
						
			const endDate = new Date(challenge.endDate);
			endDate.setHours(0, 0, 0, 0);
						
			if (today < startDate) {
				return 0; // 未开始
			} else if (today >= startDate && today <= endDate) {
				return 1; // 进行中
			} else {
				return 2; // 已结束
			}
		},
		
		// 格式化日期
		formatDate(dateStr) {
			if (!dateStr) return '';
			
			try {
				const date = new Date(dateStr);
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
			} catch (e) {
				return dateStr;
			}
		},
		
		// 跳转到挑战详情页
		goToDetail(challengeId) {
			uni.navigateTo({
				url: `/pages/challenge/detail?id=${challengeId}`
			});
		},
		
		// 选择挑战类型
		async selectChallengeType(type) {
			this.createForm.challengeType = type;
			// 如果切换到组内挑战但还没有选择群组，重置群组选择
			if (type === 'group' && this.groupIndex === -1) {
				// 自动加载群组列表
				await this.loadGroups();
			} else if (type === 'public') {
				// 如果切换到公开挑战，清空群组选择
				this.groupIndex = -1;
				this.createForm.groupId = null;
			}
		},
		
		// 显示创建挑战弹窗
		async showCreateModal() {
			if (!requireLogin()) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				});
				return;
			}
			
			// 设置最小日期为今天
			const today = new Date();
			this.minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
			
			// 重置表单
			this.resetForm();
			
			// 加载用户群组列表
			await this.loadGroups();
			
			// 显示弹窗
			this.showCreateModalFlag = true;
		},
		
		// 隐藏创建挑战弹窗
		hideCreateModal() {
			this.showCreateModalFlag = false;
		},
		
		// 加载用户群组列表
		async loadGroups() {
			try {
				console.log('开始加载群组列表...');
				const res = await apiMyGroups();
				console.log('群组列表API响应:', res);
				
				if (res?.data) {
					this.groups = Array.isArray(res.data) ? res.data : (res || []);
				} else {
					this.groups = res || [];
				}
				
				console.log('加载后的群组数量:', this.groups.length);
				console.log('群组列表:', this.groups);
			} catch (e) {
				console.error('加载群组列表失败:', e);
				uni.showToast({
					title: '加载群组失败',
					icon: 'none'
				});
			}
		},
		
		// 重置表单
		resetForm() {
			this.createForm = {
				challengeType: 'public', // 默认为公开挑战
				challengeName: '',
				startDate: '',
				endDate: '',
				maxMembers: 10,
				trainRequire: '',
				coverImage: '',
				groupId: null
			};
			this.groupIndex = -1;
			this.selectedGroupIndex = -1;
			this.submitting = false;
		},
		
		// 开始日期选择
		onStartDateChange(e) {
			this.createForm.startDate = e.detail.value;
		},
		
		// 结束日期选择
		onEndDateChange(e) {
			this.createForm.endDate = e.detail.value;
		},
		
		// 打开开始日期选择器
		openStartDatePicker() {
			this.datePickerType = 'startDate';
			this.setupDatePicker(this.createForm.startDate);
			this.showDatePicker = true;
		},
		
		// 打开结束日期选择器
		openEndDatePicker() {
			this.datePickerType = 'endDate';
			this.setupDatePicker(this.createForm.endDate);
			this.showDatePicker = true;
		},
		
		// 设置日期选择器数据
		setupDatePicker(selectedDate) {
			console.log('=== 开始设置日期选择器 ===');
			console.log('传入选中日期:', selectedDate);
			
			const now = new Date();
			const currentYear = now.getFullYear();
			const currentMonth = now.getMonth() + 1;
			const currentDay = now.getDate();
			
			console.log('当前实际时间:', { 
				year: currentYear, 
				month: currentMonth, 
				day: currentDay,
				fullDate: now.toString()
			});
			
			// 初始化年份数组
			this.years = [];
			for (let i = currentYear - 10; i <= currentYear + 5; i++) {
				this.years.push(i);
			}
			
			// 初始化月份数组
			this.months = [];
			for (let i = 1; i <= 12; i++) {
				this.months.push(i);
			}
			
			console.log('年份数组:', this.years);
			console.log('月份数组:', this.months);
			
			if (selectedDate && selectedDate !== '') {
				// 处理已选日期
				console.log('处理已选日期:', selectedDate);
				const dateParts = selectedDate.split('-');
				const year = parseInt(dateParts[0]);
				const month = parseInt(dateParts[1]);
				const day = parseInt(dateParts[2]);
				
				console.log('解析结果:', { year, month, day });
				
				// 计算索引
				const yearIndex = this.years.indexOf(year);
				const monthIndex = month - 1;
				const dayIndex = day - 1;
				
				console.log('索引计算:', { yearIndex, monthIndex, dayIndex });
				
				// 验证索引有效性
				if (yearIndex === -1) {
					console.error('年份不在范围内:', year);
					// 如果年份无效，使用当前年份
					this.setDefaultDate(currentYear, currentMonth, currentDay);
					return;
				}
				
				if (monthIndex < 0 || monthIndex > 11) {
					console.error('月份无效:', month);
					this.setDefaultDate(currentYear, currentMonth, currentDay);
					return;
				}
				
				// 先设置年份和月份索引
				this.datePickerValue = [yearIndex, monthIndex, 0];
				console.log('设置初始索引:', this.datePickerValue);
				
				// 更新天数数组
				this.updateDaysForYearMonth(year, month);
				
				// 验证并设置日期索引
				const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
				this.datePickerValue[2] = validDayIndex;
				
				console.log('日期索引处理详情:', {
					inputDay: day,
					calculatedDayIndex: dayIndex,
					daysArrayLength: this.days.length,
					validDayIndex: validDayIndex,
					selectedDay: this.days[validDayIndex]
				});
				
				console.log('最终索引设置:', this.datePickerValue);
				console.log('选中日期:', {
					year: this.years[this.datePickerValue[0]],
					month: this.months[this.datePickerValue[1]],
					day: this.days[this.datePickerValue[2]],
					expectedDay: day
				});
				
				// 验证结果
				const actualSelectedDay = this.days[this.datePickerValue[2]];
				if (actualSelectedDay !== day) {
					console.error('⚠️ 已选日期不匹配!');
					console.error('期望:', day, '实际:', actualSelectedDay);
				}
				
			} else {
				// 默认选择今天
				console.log('设置默认日期为今天');
				this.setDefaultDate(currentYear, currentMonth, currentDay);
			}
			
			console.log('=== 日期选择器设置完成 ===');
		},
		
		// 设置默认日期（今天）
		setDefaultDate(year, month, day) {
			console.log('=== 设置默认日期 ===');
			console.log('输入参数:', { year, month, day });
			
			const yearIndex = this.years.indexOf(year);
			const monthIndex = month - 1;
			const dayIndex = day - 1;
			
			console.log('索引计算详情:', { 
				yearIndex, 
				monthIndex, 
				dayIndex,
				yearInArray: this.years[yearIndex],
				monthInArray: this.months[monthIndex],
				expectedDay: day
			});
			
			// 设置索引
			this.datePickerValue = [
				Math.max(0, Math.min(yearIndex, this.years.length - 1)),
				Math.max(0, Math.min(monthIndex, this.months.length - 1)),
				0 // 临时设置
			];
			
			console.log('临时索引设置:', this.datePickerValue);
			console.log('临时索引对应的值:', {
				year: this.years[this.datePickerValue[0]],
				month: this.months[this.datePickerValue[1]],
				day: '临时(0)'
			});
			
			// 更新天数数组
			this.updateDaysForYearMonth(year, month);
			
			console.log('更新天数数组后:');
			console.log('- 天数数组长度:', this.days.length);
			console.log('- 天数数组内容:', this.days);
			console.log('- 期望的日期索引:', dayIndex);
			console.log('- 期望的日期值:', day);
			
			// 设置正确的日期索引
			const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
			this.datePickerValue[2] = validDayIndex;
			
			console.log('最终日期索引设置:', validDayIndex);
			console.log('最终索引:', this.datePickerValue);
			console.log('最终选中日期:', {
				year: this.years[this.datePickerValue[0]],
				month: this.months[this.datePickerValue[1]],
				day: this.days[this.datePickerValue[2]],
				expectedDay: day
			});
			
			// 验证结果
			const actualDay = this.days[this.datePickerValue[2]];
			if (actualDay !== day) {
				console.error('⚠️ 日期不匹配!');
				console.error('期望:', day, '实际:', actualDay);
			}
			
			console.log('=== 默认日期设置完成 ===');
		},
		
		// 为指定年月更新天数数组
		updateDaysForYearMonth(year, month) {
			console.log('更新天数数组 for:', { year, month });
			
			const maxDays = new Date(year, month, 0).getDate();
			console.log('该月最大天数:', maxDays);
			
			this.days = [];
			for (let i = 1; i <= maxDays; i++) {
				this.days.push(i);
			}
			
			console.log('生成的天数数组:', this.days);
			console.log('天数数组长度:', this.days.length);
		},
		
		// 验证日期有效性
		validateDate(dateString) {
			if (!dateString) return false;
			
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return false;
			
			// 检查日期格式是否正确
			const parts = dateString.split('-');
			if (parts.length !== 3) return false;
			
			const year = parseInt(parts[0]);
			const month = parseInt(parts[1]);
			const day = parseInt(parts[2]);
			
			// 验证年份范围
			if (year < this.years[0] || year > this.years[this.years.length - 1]) return false;
			
			// 验证月份范围
			if (month < 1 || month > 12) return false;
			
			// 验证日期范围
			const maxDays = new Date(year, month, 0).getDate();
			if (day < 1 || day > maxDays) return false;
			
			return true;
		},
		
		// 更新天数（根据月份变化）- 用于日期选择器变化时
		updateDays(month) {
			console.log('=== updateDays 调用（用于选择器变化） ===');
			console.log('传入月份:', month);
			console.log('当前datePickerValue:', this.datePickerValue);
			
			// 使用当前选中的年份来计算天数
			const selectedYear = this.years[this.datePickerValue[0]];
			const maxDays = new Date(selectedYear, month, 0).getDate();
			
			console.log('计算天数:', { 
				selectedYear, 
				month, 
				maxDays
			});
			
			this.days = [];
			for (let i = 1; i <= maxDays; i++) {
				this.days.push(i);
			}
			
			console.log('生成的天数数组:', this.days);
			console.log('天数数组长度:', this.days.length);
			
			// 调整天数索引，防止超出范围
			if (this.datePickerValue[2] >= this.days.length) {
				const newIndex = this.days.length - 1;
				this.datePickerValue[2] = newIndex;
				console.log('调整天数索引到:', newIndex);
			}
			
			console.log('=== updateDays 完成 ===');
		},
		
		// 日期选择器变化
		onDateChange(e) {
			console.log('=== onDateChange 调用 ===');
			console.log('传入的值:', e.detail.value);
			console.log('变化前的索引:', this.datePickerValue);
			
			const value = e.detail.value;
			const [yearIndex, monthIndex, dayIndex] = value;
			
			console.log('解析的索引:', { yearIndex, monthIndex, dayIndex });
			
			// 记录索引变化
			this.indexChangeLog.push({
				timestamp: new Date().toISOString(),
				from: [...this.datePickerValue],
				to: [yearIndex, monthIndex, dayIndex],
				reason: 'picker_change'
			});
			
			// 验证索引范围
			if (yearIndex < 0 || yearIndex >= this.years.length ||
				monthIndex < 0 || monthIndex >= this.months.length) {
				console.log('索引超出范围，忽略变化');
				return;
			}
			
			// 如果月份发生变化，需要更新天数数组
			if (this.datePickerValue[1] !== monthIndex) {
				console.log('月份发生变化，需要更新天数数组');
				const selectedMonth = this.months[monthIndex];
				const selectedYear = this.years[yearIndex];
				this.updateDaysForYearMonth(selectedYear, selectedMonth);
				
				// 如果当前选择的日期超出了该月的最大天数，调整到最大天数
				if (dayIndex >= this.days.length) {
					const adjustedDayIndex = this.days.length - 1;
					this.datePickerValue = [yearIndex, monthIndex, adjustedDayIndex];
					
					// 记录调整
					this.indexChangeLog.push({
						timestamp: new Date().toISOString(),
						from: [yearIndex, monthIndex, dayIndex],
						to: [yearIndex, monthIndex, adjustedDayIndex],
						reason: 'day_overflow_adjust'
					});
					
					return;
				}
			}
			
			// 确保天数索引有效
			const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
			if (validDayIndex !== dayIndex) {
				// 记录调整
				this.indexChangeLog.push({
					timestamp: new Date().toISOString(),
					from: [yearIndex, monthIndex, dayIndex],
					to: [yearIndex, monthIndex, validDayIndex],
					reason: 'day_index_adjust'
				});
			}
			
			this.datePickerValue = [yearIndex, monthIndex, validDayIndex];
		},
		
		// 确认选择日期
		confirmDate() {
			
			// 确保所有索引都在有效范围内
			const yearIndex = Math.max(0, Math.min(this.datePickerValue[0], this.years.length - 1));
			const monthIndex = Math.max(0, Math.min(this.datePickerValue[1], this.months.length - 1));
			const dayIndex = Math.max(0, Math.min(this.datePickerValue[2], this.days.length - 1));
			
			// 重新设置修正后的索引
			this.datePickerValue = [yearIndex, monthIndex, dayIndex];
			
			// 生成选中的日期字符串
			const selectedYear = this.years[yearIndex];
			const selectedMonth = this.months[monthIndex];
			const selectedDay = this.days[dayIndex];
			
			const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
			
			console.log('生成的日期:', selectedDate);
			console.log('日期选择器类型:', this.datePickerType);
			console.log('确认后的索引:', this.datePickerValue);
			
			// 验证生成的日期是否有效
			if (!this.validateDate(selectedDate)) {
				uni.showToast({
					title: '选择的日期无效',
					icon: 'none'
				});
				return;
			}
			
			// 根据选择器类型设置对应表单字段
			if (this.datePickerType === 'startDate') {
				this.createForm.startDate = selectedDate;
			} else if (this.datePickerType === 'endDate') {
				this.createForm.endDate = selectedDate;
			}
			
			this.hideDatePicker();
			console.log('=== 确认选择完成 ===');
		},
		
		// 隐藏日期选择器
		hideDatePicker() {
			this.showDatePicker = false;
		},
		
		// 打开群组选择器
		async openGroupPicker() {
			if (this.groups.length === 0) {
				// 尝试重新加载群组列表
				await this.loadGroups();
				if (this.groups.length === 0) {
					uni.showToast({
						title: '暂无可用群组',
						icon: 'none'
					});
					return;
				}
			}
			this.selectedGroupIndex = this.groupIndex;
			this.showGroupPicker = true;
		},
		
		// radio-group选择变化
		onRadioGroupChange(e) {
			this.selectedGroupIndex = parseInt(e.detail.value);
		},
		
		// 选择群组（保留兼容性）
		selectGroup(index) {
			this.selectedGroupIndex = index;
		},
		
		// 确认群组选择
		confirmGroupSelection() {
			this.groupIndex = this.selectedGroupIndex;
			if (this.groupIndex >= 0 && this.groups[this.groupIndex]) {
				this.createForm.groupId = this.groups[this.groupIndex].id;
			} else {
				this.createForm.groupId = null;
			}
			this.hideGroupPicker();
		},
		
		// 隐藏群组选择器
		hideGroupPicker() {
			this.showGroupPicker = false;
		},
		
		// 群组选择（旧方法，保留兼容性）
		onGroupChange(e) {
			this.groupIndex = parseInt(e.detail.value);
			if (this.groupIndex >= 0) {
				this.createForm.groupId = this.groups[this.groupIndex].id;
			} else {
				this.createForm.groupId = null;
			}
		},
		
		// 选择图片
		chooseImage() {
			uni.chooseImage({
				count: 1,
				sourceType: ['album', 'camera'],
				success: async (res) => {
					try {
						uni.showLoading({ title: '上传中...' });
						
						// 上传图片
						const uploadRes = await apiUploadAction(res.tempFilePaths[0]);
						uni.hideLoading();
						
						// 获取可访问的URL
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
						
						if (objectName) {
							const urlRes = await apiGetFileUrl({ objectName: objectName });
							this.createForm.coverImage = urlRes.data || urlRes || objectName;
						}
						
						uni.showToast({
							title: '上传成功',
							icon: 'success'
						});
					} catch (e) {
						uni.hideLoading();
						console.error('上传失败:', e);
						uni.showToast({
							title: '上传失败',
							icon: 'none'
						});
					}
				}
			});
		},
		
		// 移除图片
		removeImage() {
			this.createForm.coverImage = '';
		},
		
		// 提交表单
		async submitForm() {
			if (!requireLogin()) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				});
				return;
			}
			
			// 表单验证
			if (!this.createForm.challengeName.trim()) {
				uni.showToast({
					title: '请输入挑战名称',
					icon: 'none'
				});
				return;
			}
			
			if (!this.createForm.startDate) {
				uni.showToast({
					title: '请选择开始日期',
					icon: 'none'
				});
				return;
			}
			
			if (!this.createForm.endDate) {
				uni.showToast({
					title: '请选择结束日期',
					icon: 'none'
				});
				return;
			}
			
			if (this.createForm.maxMembers <= 0) {
				uni.showToast({
					title: '参与人数必须大于0',
					icon: 'none'
				});
				return;
			}
			
			if (!this.createForm.trainRequire.trim()) {
				uni.showToast({
					title: '请输入挑战要求',
					icon: 'none'
				});
				return;
			}
			
			// 验证日期
			if (new Date(this.createForm.endDate) < new Date(this.createForm.startDate)) {
				uni.showToast({
					title: '结束日期不能早于开始日期',
					icon: 'none'
				});
				return;
			}
			
			// 如果是组内挑战，必须选择群组
			if (this.createForm.challengeType === 'group' && this.groupIndex < 0) {
				uni.showToast({
					title: '请选择群组',
					icon: 'none'
				});
				return;
			}
			
			// 确保群组ID在表单提交时正确设置
			if (this.createForm.challengeType === 'group' && this.groupIndex >= 0 && this.groups[this.groupIndex]) {
				this.createForm.groupId = this.groups[this.groupIndex].id;
			} else if (this.createForm.challengeType === 'public') {
				this.createForm.groupId = null;
			}
			
			// 调试信息
			console.log('提交表单数据:', {
				...this.createForm,
				groups: this.groups,
				groupIndex: this.groupIndex
			});
			
			this.submitting = true;
			
			try {
				uni.showLoading({ title: '创建中...' });
				
				let res;
				if (this.createForm.challengeType === 'group') {
					// 创建组内挑战
					const requestData = {
						name: this.createForm.challengeName,
						startDate: this.createForm.startDate,
						endDate: this.createForm.endDate,
						trainRequire: this.createForm.trainRequire,
						maxMembers: parseInt(this.createForm.maxMembers),
						coverImage: this.createForm.coverImage || null,
						groupId: this.createForm.groupId
					};
					res = await apiCreateGroupChallenge(requestData);
				} else {
					// 创建公开挑战
					const requestData = {
						name: this.createForm.challengeName,
						startDate: this.createForm.startDate,
						endDate: this.createForm.endDate,
						trainRequire: this.createForm.trainRequire,
						maxMembers: parseInt(this.createForm.maxMembers),
						coverImage: this.createForm.coverImage || null
						// 不传递groupId，表示创建公开挑战
					};
					res = await apiChallengeCreate(requestData);
				}
				
				uni.hideLoading();
				
				uni.showToast({
					title: '创建成功',
					icon: 'success'
				});
				
				// 隐藏弹窗并重置表单
				this.hideCreateModal();
				this.resetForm();
				
				// 刷新挑战列表
				this.refreshData();
			} catch (e) {
				uni.hideLoading();
				console.error('创建挑战失败:', e);
				uni.showToast({
					title: e.errMsg || '创建失败，请重试',
					icon: 'none'
				});
			} finally {
				this.submitting = false;
			}
		},
		
		// 刷新挑战状态
		async refreshChallengeStatus() {
			try {
				// 调用后端API手动触发挑战状态更新
				const res = await apiUpdateChallengeStatus();
				uni.showToast({
					title: '状态已刷新',
					icon: 'success'
				});
				// 重新加载挑战列表
				this.refreshData();
			} catch (e) {
				console.error('刷新挑战状态失败:', e);
				uni.showToast({
					title: '刷新失败',
					icon: 'none'
				});
			}
		},
		
		// 底部导航方法
		goHome() {
			uni.switchTab({
				url: '/pages/index/index'
			});
		},
		
		goTraining() {
			uni.switchTab({
				url: '/pages/training/index'
			});
		},
		
		goChallenge() {
			// 当前页面，无需跳转
		},
		
		goGroup() {
			uni.switchTab({
				url: '/pages/group/index'
			});
		},
		
		goUser() {
			uni.switchTab({
				url: '/pages/user/profile'
			});
		}
	}
};
</script>

<style scoped>
.container {
	padding: 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	min-height: 100vh;
	padding-bottom: 20rpx; /* 减少底部空间，因为我们移除了底部导航 */
}

.page-header {
	margin-bottom: 30rpx;
	position: relative;
}

.header-title {
	font-size: 48rpx;
	font-weight: bold;
	color: #fff;
	text-align: center;
	display: block;
}

.create-challenge-btn {
	position: absolute;
	right: 20rpx;
	top: 50%;
	transform: translateY(-50%);
	background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);
	border: none;
	border-radius: 50rpx;
	padding: 15rpx 25rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 20rpx rgba(255, 107, 107, 0.3);
}

.btn-plus {
	font-size: 28rpx;
	font-weight: bold;
	color: white;
	margin-right: 8rpx;
}

.btn-text {
	font-size: 24rpx;
	color: white;
	font-weight: 500;
}

.filter-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 20rpx;
	margin-bottom: 20rpx;
	display: flex;
	gap: 20rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(10rpx);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.search-input {
	flex: 1;
	height: 60rpx;
	padding: 0 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 30rpx;
	font-size: 28rpx;
}

.filter-options {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.refresh-btn {
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	border: none;
	border-radius: 30rpx;
	padding: 15rpx 20rpx;
	font-size: 26rpx;
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 10rpx rgba(79, 172, 254, 0.3);
}

.picker-option {
	display: flex;
	align-items: center;
	gap: 10rpx;
	background: #667eea;
	padding: 15rpx 20rpx;
	border-radius: 30rpx;
	color: #fff;
	font-size: 26rpx;
}

.arrow {
	font-size: 20rpx;
	transform: rotate(0deg);
	transition: transform 0.3s;
}

.challenge-list-container {
	height: calc(100vh - 300rpx);
}

.challenge-list {
	padding: 10rpx 0;
}

.challenge-item {
	margin-bottom: 20rpx;
}

.challenge-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 20rpx;
	padding: 25rpx;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(10rpx);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
	display: flex;
	gap: 20rpx;
	overflow: hidden;
}

.cover-image {
	width: 180rpx;
	height: 180rpx;
	border-radius: 16rpx;
	object-fit: cover;
	flex-shrink: 0;
}

.card-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.challenge-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
}

.header-left {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.challenge-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	flex: 1;
	line-height: 1.4;
}

.type-badge {
	padding: 4rpx 12rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
	font-weight: 500;
	align-self: flex-start;
}

.type-public {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
}

.type-group {
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	color: #fff;
}

.status-badge {
	padding: 8rpx 16rpx;
	border-radius: 30rpx;
	font-size: 24rpx;
	font-weight: 500;
	margin-left: 20rpx;
	flex-shrink: 0;
}

.status-pending {
	background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
	color: #d46b08;
}

.status-active {
	background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
	color: #52c41a;
}

.status-ended {
	background: linear-gradient(135deg, #dfe9f3 0%, #cac5e0 100%);
	color: #8c8c8c;
}

.challenge-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 15rpx;
}

.meta-item {
	background: rgba(102, 126, 234, 0.1);
	padding: 8rpx 16rpx;
	border-radius: 30rpx;
	font-size: 24rpx;
	color: #667eea;
}

.challenge-brief {
	margin-top: 10rpx;
}

.brief-text {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.challenge-footer {
	margin-top: 10rpx;
}

.created-at {
	font-size: 22rpx;
	color: #999;
}

.loading-container, .empty-container {
	text-align: center;
	padding: 100rpx 0;
	color: #999;
	font-size: 28rpx;
}

.loading-more, .no-more-data {
	text-align: center;
	padding: 30rpx 0;
	color: #999;
	font-size: 26rpx;
}

/* 弹窗样式 */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999999; /* 极高层级 */
	padding: 30rpx;
}

.modal-content {
	background: white;
	border-radius: 20rpx;
	width: 100%;
	max-width: 600rpx;
	max-height: 85vh;
	overflow-y: auto;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
	z-index: 999999; /* 极高层级 */
	position: relative;
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx 30rpx 20rpx;
	border-bottom: 1rpx solid #eee;
}

.modal-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.close-btn {
	font-size: 48rpx;
	color: #999;
	line-height: 1;
	cursor: pointer;
	width: 50rpx;
	height: 50rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal-body {
	padding: 30rpx;
}

.form-group {
	margin-bottom: 30rpx;
}

.form-label {
	display: block;
	font-size: 30rpx;
	color: #333;
	margin-bottom: 15rpx;
	font-weight: 500;
}

/* 单选按钮组样式 */
.radio-group {
	display: flex;
	gap: 30rpx;
}

.radio-item {
	display: flex;
	align-items: center;
	padding: 15rpx 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	background: #f8f9fa;
	flex: 1;
	justify-content: center;
}

.radio-selected {
	border-color: #667eea;
	background: rgba(102, 126, 234, 0.1);
}

.radio-circle {
	width: 30rpx;
	height: 30rpx;
	border: 2rpx solid #ccc;
	border-radius: 50%;
	margin-right: 10rpx;
	position: relative;
}

.radio-checked {
	border-color: #667eea;
	background: #667eea;
}

.radio-checked::after {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 12rpx;
	height: 12rpx;
	background: white;
	border-radius: 50%;
}

.radio-text {
	font-size: 28rpx;
	color: #333;
}

.form-input {
	width: 100%;
	height: 80rpx;
	padding: 0 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	font-size: 28rpx;
	background: #f8f9fa;
}

.form-textarea {
	width: 100%;
	height: 150rpx;
	padding: 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	font-size: 28rpx;
	background: #f8f9fa;
}

.picker-view {
	width: 100%;
	height: 80rpx;
	padding: 0 20rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	background: #f8f9fa;
	font-size: 28rpx;
	color: #333;
}

.placeholder {
	color: #999;
}

.upload-area {
	width: 100%;
	height: 200rpx;
	border: 2rpx dashed #e0e0e0;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f8f9fa;
}

.upload-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.upload-icon {
	font-size: 60rpx;
	color: #ccc;
	margin-bottom: 10rpx;
}

.upload-text {
	font-size: 26rpx;
	color: #999;
}

.uploaded-image {
	position: relative;
	width: 100%;
	height: 100%;
}

.preview-image {
	width: 100%;
	height: 100%;
	border-radius: 12rpx;
	object-fit: cover;
}

.remove-image {
	position: absolute;
	top: 10rpx;
	right: 10rpx;
	width: 40rpx;
	height: 40rpx;
	background: rgba(0, 0, 0, 0.6);
	border-radius: 50%;
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: bold;
}

.modal-footer {
	padding: 20rpx 30rpx 30rpx;
}

.submit-btn {
	width: 100%;
	height: 90rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border: none;
	border-radius: 45rpx;
	color: white;
	font-size: 32rpx;
	font-weight: 600;
	box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
}

.btn-disabled {
	opacity: 0.6;
}

/* 独立日期选择器样式 */
.date-picker-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 1000000; /* 更高的层级 */
}

.date-picker-content {
	width: 100%;
	background: white;
	border-radius: 20rpx 20rpx 0 0;
	padding: 30rpx;
	box-sizing: border-box;
}

.date-picker-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 20rpx;
	border-bottom: 1rpx solid #eee;
	margin-bottom: 20rpx;
}

.cancel-btn, .confirm-btn {
	font-size: 32rpx;
	color: #667eea;
	font-weight: 500;
	padding: 20rpx;
}

.picker-title {
	font-size: 32rpx;
	color: #333;
	font-weight: 600;
}

.date-picker-view {
	height: 400rpx;
}

.picker-item {
	height: 80rpx;
	line-height: 80rpx;
	text-align: center;
	font-size: 30rpx;
	color: #333;
}

/* 独立群组选择器样式 */
.group-picker-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 1000000; /* 更高的层级 */
}

.group-picker-content {
	width: 100%;
	background: white;
	border-radius: 20rpx 20rpx 0 0;
	padding: 30rpx;
	box-sizing: border-box;
	max-height: 70vh;
	display: flex;
	flex-direction: column;
}

.group-picker-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 20rpx;
	border-bottom: 1rpx solid #eee;
	margin-bottom: 20rpx;
}

.group-list {
	flex: 1;
	overflow-y: auto;
}

.group-item {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.group-item radio {
	margin-right: 20rpx;
}

.group-item text {
	font-size: 30rpx;
	color: #333;
}

/* 移除原来的底部导航栏样式，因为我们不再显示它 */
</style>