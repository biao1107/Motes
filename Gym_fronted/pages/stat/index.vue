<template>
	<view class="container">
		<view class="stats-card">
			<view class="fitness-subtitle">个人统计</view>
			<view v-if="!personal" class="stat-empty">
				<text class="hint">暂无数据</text>
			</view>
			<view v-else class="stat-grid">
				<view class="stat-item">
					<text class="stat-label">总训练次数</text>
					<text class="stat-value stat-highlight">{{ personal.totalTrainCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">完成次数</text>
					<text class="stat-value stat-success">{{ personal.completedCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">完成率</text>
					<text class="stat-value stat-rate">{{ personal.completionRate }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">平均分数</text>
					<text class="stat-value stat-score">{{ personal.avgScore }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">协同训练次数</text>
					<text class="stat-value stat-team">{{ personal.collaborativeCount }}</text>
				</view>
			</view>
		</view>

		<view class="stats-card">
			<view class="fitness-subtitle">组统计</view>
			<view v-if="!group" class="stat-empty">
				<text class="hint">暂无数据</text>
			</view>
			<view v-else class="stat-grid">
				<view class="stat-item">
					<text class="stat-label">成员数量</text>
					<text class="stat-value stat-highlight">{{ group.groupMemberCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">总训练次数</text>
					<text class="stat-value stat-count">{{ group.totalTrainCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">完成次数</text>
					<text class="stat-value stat-success">{{ group.completedCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">完成率</text>
					<text class="stat-value stat-rate">{{ group.completionRate }}</text>
				</view>
				<view class="stat-item stat-full-width">
					<text class="stat-label">成员贡献排名</text>
					<text class="stat-value stat-rankings">{{ formatMemberRanking(group.memberRanking) }}</text>
				</view>
			</view>
		</view>

		<view class="stats-card">
			<view class="fitness-subtitle">挑战统计</view>
			<view v-if="!challenge" class="stat-empty">
				<text class="hint">暂无数据</text>
			</view>
			<view v-else class="stat-grid">
				<view class="stat-item">
					<text class="stat-label">参与人数</text>
					<text class="stat-value stat-highlight">{{ challenge.participantCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">总打卡天数</text>
					<text class="stat-value stat-count">{{ challenge.totalPunchDays }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">平均打卡天数</text>
					<text class="stat-value stat-average">{{ challenge.avgPunchDays }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">完成人数</text>
					<text class="stat-value stat-success">{{ challenge.completedCount }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { apiStatPersonal as apiStatPersonalOld, apiStatGroup, apiStatChallenge, apiMyGroups, apiChallengeList } from '@/common/api.js';
import { requireLogin } from '@/common/auth.js';

export default {
	data() {
		return {
			personal: null,
			group: null,
			challenge: null
		};
	},
	onShow() {
		if (!requireLogin()) return;
		this.loadData();
	},
	methods: {
		async loadData() {
			try {
				uni.showLoading({ title: '加载中...' });
				
				// 个人统计
				const personalRes = await apiStatPersonalOld();
				this.personal = personalRes?.data || personalRes || null;
				
				// 获取组统计
				await this.loadGroupStats();
				
				// 获取挑战统计
				await this.loadChallengeStats();
				
				uni.hideLoading();
			} catch (e) {
				uni.hideLoading();
				console.error('加载统计数据失败:', e);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			}
		},
		async loadGroupStats() {
			try {
				// 获取我的组
				const myGroupsRes = await apiMyGroups();
				const groups = myGroupsRes?.data || myGroupsRes || [];
				if (groups && groups.length > 0) {
					// 获取第一个组的统计
					const firstGroup = groups[0];
					if (firstGroup && firstGroup.id) {
						const groupRes = await apiStatGroup({ groupId: firstGroup.id });
						this.group = groupRes?.data || groupRes || null;
					}
				}
			} catch (e) {
				console.log('获取组统计失败', e);
				this.group = null;
			}
		},
		async loadChallengeStats() {
			try {
				// 获取挑战列表
				const challengesRes = await apiChallengeList();
				const challenges = challengesRes?.data || challengesRes || [];
				if (challenges && challenges.length > 0) {
					// 获取第一个挑战的统计
					const firstChallenge = challenges[0];
					if (firstChallenge && firstChallenge.id) {
						const challengeRes = await apiStatChallenge({ challengeId: firstChallenge.id });
						this.challenge = challengeRes?.data || challengeRes || null;
					}
				}
			} catch (e) {
				console.log('获取挑战统计失败', e);
				this.challenge = null;
			}
		},
		formatMemberRanking(ranking) {
			if (!ranking || typeof ranking !== 'object') {
				return '-';
			}
			
			// 将对象转换为数组并排序
			const entries = Object.entries(ranking).sort(([,a], [,b]) => b - a);
			if (entries.length === 0) {
				return '-';
			}
			
			// 返回前几名的信息
			const topEntries = entries.slice(0, 3);
			return topEntries.map(([userId, count]) => `用户${userId}:${count}`).join(', ');
		}
	}
};
</script>

<style scoped>
.container {
	padding: 30rpx;
	background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
	min-height: 100vh;
}

.stat-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 24rpx;
	margin-top: 20rpx;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20rpx;
	background: rgba(255, 255, 255, 0.7);
	border-radius: 16rpx;
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stat-full-width {
	grid-column: 1 / -1;
}

.stat-label {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 8rpx;
	text-align: center;
}

.stat-value {
	font-size: 32rpx;
	font-weight: 700;
	color: #667eea;
}

.stat-highlight {
	color: #667eea;
}

.stat-success {
	color: #4ecdc4;
}

.stat-rate {
	color: #ff6b6b;
	font-weight: 700;
}

.stat-score {
	color: #ffd166;
	font-weight: 700;
}

.stat-team {
	color: #764ba2;
}

.stat-count {
	color: #4db6ac;
}

.stat-average {
	color: #a1887f;
}

.stat-rankings {
	color: #64b5f6;
	word-break: break-all;
	text-align: left;
	width: 100%;
}

.stat-empty {
	text-align: center;
	padding: 60rpx 0;
}

.hint {
	font-size: 28rpx;
	color: #999;
}
</style>