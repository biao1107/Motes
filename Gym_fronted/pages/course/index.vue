<template>
	<view class="container">
		<!-- 页面头部 -->
		<view class="header-section">
			<view class="header-content">
				<text class="header-title">🎓 精品课程</text>
				<text class="header-subtitle">专业健身指导，科学训练计划</text>
			</view>
		</view>
		
		<!-- 搜索和筛选区域 -->
		<view class="filter-section">
			<view class="search-box">
				<input 
					class="search-input" 
					type="text" 
					placeholder="搜索课程名称或描述" 
					v-model="searchKeyword"
					@confirm="onSearch"
				/>
				<view class="search-icon" @tap="onSearch">🔍</view>
			</view>
			
			<view class="filter-tabs">
				<view 
					class="filter-tab" 
					:class="{ active: activeType === '' }"
					@tap="filterByType('')"
				>
					全部
				</view>
				<view 
					class="filter-tab" 
					:class="{ active: activeType === '有氧' }"
					@tap="filterByType('有氧')"
				>
					有氧
				</view>
				<view 
					class="filter-tab" 
					:class="{ active: activeType === '力量' }"
					@tap="filterByType('力量')"
				>
					力量
				</view>
				<view 
					class="filter-tab" 
					:class="{ active: activeType === '柔韧' }"
					@tap="filterByType('柔韧')"
				>
					柔韧
				</view>
			</view>
			
			<view class="difficulty-filter">
				<view 
					class="difficulty-item" 
					:class="{ active: activeDifficulty === '' }"
					@tap="filterByDifficulty('')"
				>
					全部难度
				</view>
				<view 
					class="difficulty-item" 
					:class="{ active: activeDifficulty === '入门' }"
					@tap="filterByDifficulty('入门')"
				>
					入门
				</view>
				<view 
					class="difficulty-item" 
					:class="{ active: activeDifficulty === '初级' }"
					@tap="filterByDifficulty('初级')"
				>
					初级
				</view>
				<view 
					class="difficulty-item" 
					:class="{ active: activeDifficulty === '中级' }"
					@tap="filterByDifficulty('中级')"
				>
					中级
				</view>
			</view>
		</view>
		
		<!-- 推荐课程区域 -->
		<view class="recommend-section" v-if="recommendCourses.length > 0 && !searchKeyword">
			<view class="section-header">
				<text class="section-title">🔥 热门推荐</text>
			</view>
			<scroll-view class="recommend-scroll" scroll-x="true">
				<view class="recommend-list">
					<view 
						class="course-card recommend-card" 
						v-for="course in recommendCourses" 
						:key="course.id"
						@tap="goToCourseDetail(course.id)"
					>
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
						<view class="course-info">
							<text class="course-name">{{ course.courseName }}</text>
							<text class="course-desc">{{ course.description }}</text>
							<view class="course-meta">
								<text class="meta-item">⏱️ {{ course.duration }}分钟</text>
								<text class="meta-item">🔥 {{ course.calories }}卡路里</text>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>
		
		<!-- 课程列表区域 -->
		<view class="courses-section">
			<view class="section-header">
				<text class="section-title">{{ searchKeyword ? '搜索结果' : '全部课程' }}</text>
				<text class="section-count">{{ courseList.length }}个课程</text>
			</view>
			
			<view class="courses-list">
				<view 
					class="course-item" 
					v-for="course in courseList" 
					:key="course.id"
					@tap="goToCourseDetail(course.id)"
				>
					<!-- 课程封面：有图显示图片，无图显示渐变背景 -->
					<image 
						v-if="course.coverImage"
						class="item-cover" 
						:src="course.coverImage" 
						mode="aspectFill"
					/>
					<view v-else class="item-cover item-cover-placeholder">
						<text class="placeholder-icon">📚</text>
					</view>
					<view class="item-content">
						<view class="item-header">
							<text class="item-name">{{ course.courseName }}</text>
							<view class="item-tags">
								<text class="tag type-tag">{{ course.courseType }}</text>
								<text class="tag difficulty-tag" :class="getDifficultyClass(course.difficulty)">
									{{ course.difficulty }}
								</text>
							</view>
						</view>
						<text class="item-desc">{{ course.description }}</text>
						<view class="item-meta">
							<text class="meta-item">⏱️ {{ course.duration }}分钟</text>
							<text class="meta-item">🔥 {{ course.calories || 0 }}卡路里</text>
							<text class="meta-item" v-if="course.videoUrl">🎥 有视频</text>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 加载更多 -->
			<view class="load-more" v-if="hasMore" @tap="loadMore">
				<text>点击加载更多</text>
			</view>
			
			<!-- 空状态 -->
			<view class="empty-state" v-if="courseList.length === 0 && !loading">
				<text class="empty-icon">📚</text>
				<text class="empty-text">暂无相关课程</text>
				<text class="empty-subtext">试试其他筛选条件吧</text>
			</view>
		</view>
	</view>
</template>

<script>
import { apiGetCourseList, apiGetRecommendCourses, apiSearchCourses } from '@/common/api.js';

export default {
	data() {
		return {
			searchKeyword: '',
			activeType: '',
			activeDifficulty: '',
			page: 1,
			size: 10,
			courseList: [],
			recommendCourses: [],
			loading: false,
			hasMore: true,
			total: 0
		};
	},
	
	onLoad() {
		this.loadRecommendCourses();
		this.loadCourseList();
	},
	
	methods: {
		// 获取难度class名称（将中文映射为英文）
		getDifficultyClass(difficulty) {
			const difficultyMap = {
				'入门': 'diff-beginner',
				'初级': 'diff-elementary',
				'中级': 'diff-intermediate',
				'高级': 'diff-advanced'
			};
			return difficultyMap[difficulty] || 'diff-beginner';
		},
		// 加载推荐课程
		async loadRecommendCourses() {
			try {
				const res = await apiGetRecommendCourses(6);
				// res已经是data字段的内容，应该是Course数组
				this.recommendCourses = res || [];
			} catch (error) {
				console.error('加载推荐课程失败:', error);
			}
		},
		
		// 加载课程列表
		async loadCourseList(reset = false) {
			if (this.loading) return;
			
			this.loading = true;
			if (reset) {
				this.page = 1;
				this.courseList = [];
				this.hasMore = true;
			}
			
			try {
				const res = await apiGetCourseList(this.page, this.size, this.activeType, this.activeDifficulty);
				// res已经是data字段的内容，对于分页数据应该是IPage对象
				const newList = res.records || res || [];
				
				if (reset) {
					this.courseList = newList;
				} else {
					this.courseList = [...this.courseList, ...newList];
				}
				
				this.total = res.total || 0;
				this.hasMore = this.courseList.length < this.total;
				this.page++;
				
			} catch (error) {
				console.error('加载课程列表失败:', error);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},
		
		// 搜索课程
		async onSearch() {
			if (!this.searchKeyword.trim()) {
				this.loadCourseList(true);
				return;
			}
			
			this.loading = true;
			this.courseList = [];
			
			try {
				const res = await apiSearchCourses(this.searchKeyword, 1, 20);
				// res已经是data字段的内容，对于分页数据应该是IPage对象
				this.courseList = res.records || res || [];
				this.total = res.total || 0;
				this.hasMore = false;
			} catch (error) {
				console.error('搜索课程失败:', error);
				uni.showToast({
					title: '搜索失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},
		
		// 按类型筛选
		filterByType(type) {
			this.activeType = type;
			this.loadCourseList(true);
		},
		
		// 按难度筛选
		filterByDifficulty(difficulty) {
			this.activeDifficulty = difficulty;
			this.loadCourseList(true);
		},
		
		// 加载更多
		loadMore() {
			if (this.hasMore && !this.loading) {
				this.loadCourseList();
			}
		},
		
		// 跳转到课程详情
		goToCourseDetail(courseId) {
			uni.navigateTo({
				url: `/pages/course/detail?id=${courseId}`
			});
		}
	}
};
</script>

<style scoped>
.container {
	padding: 20rpx;
	background-color: #f5f5f5;
	min-height: 100vh;
}

/* 头部区域 */
.header-section {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20rpx;
	padding: 40rpx 30rpx;
	margin-bottom: 30rpx;
	color: white;
}

.header-title {
	font-size: 36rpx;
	font-weight: bold;
	display: block;
	margin-bottom: 10rpx;
}

.header-subtitle {
	font-size: 28rpx;
	opacity: 0.9;
}

/* 筛选区域 */
.filter-section {
	background: white;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
}

.search-box {
	display: flex;
	align-items: center;
	background: #f0f0f0;
	border-radius: 50rpx;
	padding: 0 30rpx;
	margin-bottom: 30rpx;
}

.search-input {
	flex: 1;
	height: 70rpx;
	font-size: 28rpx;
}

.search-icon {
	font-size: 32rpx;
	margin-left: 20rpx;
}

.filter-tabs {
	display: flex;
	gap: 20rpx;
	margin-bottom: 20rpx;
}

.filter-tab {
	padding: 15rpx 30rpx;
	background: #f0f0f0;
	border-radius: 50rpx;
	font-size: 26rpx;
	transition: all 0.3s;
}

.filter-tab.active {
	background: #667eea;
	color: white;
}

.difficulty-filter {
	display: flex;
	flex-wrap: wrap;
	gap: 15rpx;
}

.difficulty-item {
	padding: 10rpx 25rpx;
	background: #f8f8f8;
	border-radius: 40rpx;
	font-size: 24rpx;
	border: 1rpx solid #e0e0e0;
}

.difficulty-item.active {
	background: #667eea;
	color: white;
	border-color: #667eea;
}

/* 推荐区域 */
.recommend-section {
	margin-bottom: 30rpx;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.recommend-scroll {
	white-space: nowrap;
}

.recommend-list {
	display: flex;
	gap: 20rpx;
	padding: 10rpx 0;
}

.recommend-card {
	width: 400rpx;
	background: white;
	border-radius: 20rpx;
	overflow: hidden;
	flex-shrink: 0;
	box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1);
}

.course-cover {
	width: 100%;
	height: 200rpx;
}

.course-info {
	padding: 20rpx;
}

.course-name {
	font-size: 28rpx;
	font-weight: bold;
	display: block;
	margin-bottom: 10rpx;
	color: #333;
}

.course-desc {
	font-size: 24rpx;
	color: #666;
	display: block;
	margin-bottom: 15rpx;
	lines: 2;
	text-overflow: ellipsis;
}

.course-meta {
	display: flex;
	justify-content: space-between;
	font-size: 22rpx;
	color: #888;
}

/* 课程列表 */
.courses-section {
	background: white;
	border-radius: 20rpx;
	padding: 30rpx;
}

.section-count {
	font-size: 26rpx;
	color: #888;
}

.courses-list {
	display: flex;
	flex-direction: column;
	gap: 30rpx;
}

.course-item {
	display: flex;
	gap: 20rpx;
	background: #fafafa;
	border-radius: 15rpx;
	padding: 20rpx;
	transition: all 0.3s;
}

.course-item:active {
	transform: scale(0.98);
	background: #f0f0f0;
}

.item-cover {
	width: 180rpx;
	height: 180rpx;
	border-radius: 10rpx;
	flex-shrink: 0;
}

.item-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.item-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 15rpx;
}

.item-name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	flex: 1;
	margin-right: 20rpx;
}

.item-tags {
	display: flex;
	gap: 10rpx;
}

.tag {
	padding: 5rpx 15rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
}

.type-tag {
	background: #e3f2fd;
	color: #1976d2;
}

.difficulty-tag {
	background: #fce4ec;
	color: #c2185b;
}

.difficulty-tag.diff-beginner {
	background: #e8f5e8;
	color: #388e3c;
}

.difficulty-tag.diff-elementary {
	background: #fff3e0;
	color: #f57c00;
}

.difficulty-tag.diff-intermediate {
	background: #ffebee;
	color: #d32f2f;
}

.difficulty-tag.diff-advanced {
	background: #f3e5f5;
	color: #7b1fa2;
}

.item-desc {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 15rpx;
	lines: 2;
	text-overflow: ellipsis;
}

.item-meta {
	display: flex;
	gap: 20rpx;
	font-size: 22rpx;
	color: #888;
}

.meta-item {
	display: flex;
	align-items: center;
	gap: 5rpx;
}

/* 加载更多 */
.load-more {
	text-align: center;
	padding: 30rpx;
	color: #667eea;
	font-size: 28rpx;
}

/* 空状态 */
.empty-state {
	text-align: center;
	padding: 100rpx 0;
}

.empty-icon {
	font-size: 80rpx;
	display: block;
	margin-bottom: 20rpx;
}

.empty-text {
	font-size: 32rpx;
	color: #666;
	display: block;
	margin-bottom: 10rpx;
}

.empty-subtext {
	font-size: 26rpx;
	color: #999;
}
</style>