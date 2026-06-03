<template>
  <view class="message-page">
    <view class="hero-card">
      <view class="hero-badge">Message Center</view>
      <text class="hero-title">把邀请、未读会话和最近沟通集中到同一个消息中心</text>
      <text class="hero-desc">
        你可以先处理新的组队邀请，再进入具体聊天页查看组内消息和训练协同进度。
      </text>
    </view>

    <view v-if="invitations.length > 0" class="section-card invite-card">
      <view class="section-head">
        <view>
          <text class="section-title">收到的邀请</text>
          <text class="section-subtitle">先处理新的邀请，避免错过最近的组队机会</text>
        </view>
      </view>

      <view class="invite-list">
        <view
          v-for="invite in invitations"
          :key="invite.fromUserId + '_' + invite.groupId"
          class="invite-item"
        >
          <view class="invite-avatar">邀</view>
          <view class="invite-content">
            <text class="invite-name">{{ invite.fromUserName }}</text>
            <text class="invite-desc">
              邀请你加入 {{ invite.groupName || '健身搭子组' }}
            </text>
          </view>
          <view class="invite-actions">
            <view class="invite-btn accept" @tap.stop="acceptInvite(invite.fromUserId, invite.groupId)">接受</view>
            <view class="invite-btn reject" @tap.stop="rejectInvite(invite.fromUserId, invite.groupId)">拒绝</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="groups.length > 0" class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">会话列表</text>
          <text class="section-subtitle">最近消息和未读状态会优先展示在这里</text>
        </view>
      </view>

      <view class="message-list">
        <view v-for="group in groups" :key="group.id" class="message-card" @tap="enterChat(group.id)">
          <view class="group-avatar">组</view>
          <view class="message-content">
            <view class="message-head">
              <text class="group-name">{{ group.groupName || '搭子组' }}</text>
              <text class="message-time" v-if="group.lastMessageTime">{{ formatTime(group.lastMessageTime) }}</text>
            </view>

            <view class="message-preview">
              <text class="message-text" v-if="group.lastMessage">{{ group.lastMessage }}</text>
              <text class="message-text empty" v-else>还没有聊天记录，进去发第一条消息吧。</text>
              <view class="unread-badge" v-if="group.unreadCount > 0">
                <text class="unread-text">{{ group.unreadCount > 99 ? '99+' : group.unreadCount }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="invitations.length === 0" class="empty-card">
      <view class="empty-icon">信</view>
      <text class="empty-title">你还没有任何消息会话</text>
      <text class="empty-desc">加入搭子组后，这里会展示邀请消息、未读会话和最近聊天记录。</text>
    </view>
  </view>
</template>

<script>
import {
  apiMyGroups,
  apiGetUnreadDetail,
  apiGetInvitations,
  apiAcceptInvite,
  apiRejectInvite,
  apiMarkGroupRead
} from '@/common/api.js';
import { requireLogin, getUserIdFromToken } from '@/common/auth.js';

export default {
  data() {
    return {
      groups: [],
      invitations: [],
      userId: null
    };
  },
  onShow() {
    if (!requireLogin()) return;
    this.userId = getUserIdFromToken();
    this.loadInvitations();
    this.loadGroups();
  },
  activated() {
    if (!requireLogin()) return;
    this.userId = getUserIdFromToken();
    this.loadInvitations();
    this.loadGroups();
  },
  methods: {
    async loadInvitations() {
      try {
        const res = await apiGetInvitations();
        this.invitations = res?.data || res || [];
      } catch (error) {
        console.error('加载邀请列表失败:', error);
      }
    },
    refreshInvitations() {
      this.loadInvitations();
      this.loadGroups();
    },
    async acceptInvite(fromUserId) {
      try {
        uni.showLoading({ title: '接受中...' });
        await apiAcceptInvite({ invitationId: fromUserId });
        uni.hideLoading();
        uni.showToast({ title: '已加入搭子组', icon: 'success' });
        this.loadInvitations();
        this.loadGroups();
      } catch (error) {
        uni.hideLoading();
        console.error('接受邀请失败:', error);
        uni.showToast({ title: '接受失败', icon: 'none' });
      }
    },
    async rejectInvite(fromUserId, groupId) {
      try {
        uni.showLoading({ title: '拒绝中...' });
        await apiRejectInvite({
          userId: this.userId,
          invitationId: fromUserId
        });
        uni.hideLoading();

        this.invitations = this.invitations.filter(
          (invite) => !(invite.fromUserId === fromUserId && invite.groupId === groupId)
        );
        uni.showToast({ title: '已拒绝', icon: 'none' });
        this.loadInvitations();
      } catch (error) {
        uni.hideLoading();
        console.error('拒绝邀请失败:', error);
        uni.showToast({ title: '拒绝失败', icon: 'none' });
      }
    },
    async loadGroups() {
      try {
        uni.showLoading({ title: '加载中...' });

        let myGroups = [];
        try {
          const myGroupsRes = await apiMyGroups();
          myGroups = myGroupsRes?.data || myGroupsRes || [];
        } catch (groupsError) {
          console.error('获取群组列表失败:', groupsError);
          uni.hideLoading();
          uni.showToast({
            title: '获取群组列表失败',
            icon: 'none'
          });
          return;
        }

        let unreadData = [];
        try {
          const res = await apiGetUnreadDetail(this.userId);
          unreadData = res?.data || res || [];
        } catch (unreadError) {
          console.error('获取未读详情失败:', unreadError);
        }

        this.groups = myGroups
          .filter((group) => group && group.id)
          .map((group) => {
            const unreadInfo = unreadData.find((item) => item.groupId === group.id);
            return {
              id: group.id,
              groupName: group.groupName || '搭子组',
              lastMessage: unreadInfo?.lastMessage || '',
              lastMessageTime: unreadInfo?.lastMessageTime,
              unreadCount: unreadInfo?.unreadCount || 0
            };
          });

        uni.hideLoading();
      } catch (error) {
        console.error('加载消息会话失败:', error);
        uni.hideLoading();
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },
    enterChat(groupId) {
      this.markGroupMessagesAsRead(groupId);
      uni.navigateTo({
        url: '/pages/group/chat?id=' + groupId
      });
    },
    markGroupMessagesAsRead(groupId) {
      if (!groupId || !this.userId) {
        return;
      }

      apiMarkGroupRead(Number(groupId), Number(this.userId))
        .then(() => {
          const groupIndex = this.groups.findIndex((group) => group.id === Number(groupId));
          if (groupIndex !== -1) {
            this.groups[groupIndex].unreadCount = 0;
          }
        })
        .catch((error) => {
          console.error('标记已读失败:', error);
          uni.showToast({
            title: '同步已读状态失败，请稍后重试',
            icon: 'none',
            duration: 2000
          });
        });
    },
    formatTime(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) {
        return '刚刚';
      }

      if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      }

      if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      }

      if (diff < 604800000) {
        return Math.floor(diff / 86400000) + '天前';
      }

      return `${date.getMonth() + 1}-${date.getDate()}`;
    }
  }
};
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.section-card,
.empty-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-card {
  padding: 34rpx 30rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  box-shadow: 0 20rpx 50rpx rgba(23, 56, 182, 0.22);
}

.hero-badge {
  display: inline-flex;
  height: 42rpx;
  padding: 0 16rpx;
  margin-bottom: 18rpx;
  border-radius: 999rpx;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.hero-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 40rpx;
  line-height: 1.28;
  font-weight: 700;
  color: #ffffff;
}

.hero-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.82);
}

.section-card,
.empty-card {
  padding: 30rpx 24rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.invite-card {
  margin-bottom: 22rpx;
}

.section-head {
  margin-bottom: 18rpx;
}

.section-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #172233;
}

.section-subtitle {
  display: block;
  font-size: 22rpx;
  line-height: 1.55;
  color: #74829a;
}

.invite-list,
.message-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.invite-item,
.message-card {
  display: flex;
  gap: 16rpx;
  padding: 22rpx 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.invite-avatar,
.group-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 26rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.invite-avatar {
  background: linear-gradient(150deg, #ff8a72 0%, #ffb28c 100%);
}

.group-avatar {
  background: linear-gradient(150deg, #3253ef 0%, #6a7dff 100%);
}

.invite-content,
.message-content {
  flex: 1;
  min-width: 0;
}

.invite-name,
.group-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #172233;
}

.invite-name {
  margin-bottom: 8rpx;
}

.invite-desc,
.message-text {
  display: block;
  font-size: 23rpx;
  line-height: 1.58;
  color: #74829a;
}

.invite-actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.invite-btn {
  min-width: 104rpx;
  height: 58rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
}

.invite-btn.accept {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  color: #ffffff;
}

.invite-btn.reject {
  background: #f2f5fb;
  color: #5f6d83;
}

.message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.message-time {
  flex-shrink: 0;
  font-size: 21rpx;
  color: #8b96aa;
}

.message-preview {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.message-text {
  flex: 1;
  min-width: 0;
}

.message-text.empty {
  color: #9ba6bb;
}

.unread-badge {
  min-width: 38rpx;
  height: 38rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #ef4b4b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.unread-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #ffffff;
}

.empty-card {
  margin-top: 12rpx;
  text-align: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3354ef 0%, #6c81ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
}

.empty-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #172233;
}

.empty-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.65;
  color: #74829a;
}
</style>
