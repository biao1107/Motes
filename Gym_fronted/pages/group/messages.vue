<template>
  <view class="container">
    <!-- 页面头部 -->
    <view class="page-header">
      <text class="page-subtitle">与搭子们的聊天</text>
    </view>

    <!-- 邀请消息列表 -->
    <view class="invite-section" v-if="invitations.length > 0">
      <view class="section-title">
        <text class="title-text">收到的邀请</text>
      </view>
      <view
        class="invite-item"
        v-for="invite in invitations"
        :key="invite.fromUserId + '_' + invite.groupId"
        @click="handleInvite(invite)"
      >
        <view class="invite-avatar">
          <text class="avatar-icon">👋</text>
        </view>
        <view class="invite-info">
          <text class="invite-name">{{ invite.fromUserName }}</text>
          <text class="invite-desc">邀请你加入 {{ invite.groupName || '健身搭子组' }}</text>
        </view>
        <view class="invite-actions">
          <button class="btn-accept" @click.stop="acceptInvite(invite.fromUserId, invite.groupId)">接受</button>
          <button class="btn-reject" @click.stop="rejectInvite(invite.fromUserId, invite.groupId)">拒绝</button>
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <view class="message-list" v-if="groups.length > 0">
      <view
        class="message-item"
        v-for="group in groups"
        :key="group.id"
        @click="enterChat(group.id)"
      >
        <view class="group-avatar">
          <text class="avatar-icon">💪</text>
        </view>
        <view class="group-info">
          <view class="group-header">
            <text class="group-name">{{ group.groupName || '搭子组' }}</text>
            <text class="last-time" v-if="group.lastMessageTime">{{ formatTime(group.lastMessageTime) }}</text>
          </view>
          <view class="group-preview">
            <text class="last-message" v-if="group.lastMessage">
              {{ group.lastMessage }}
            </text>
            <text class="last-message empty" v-else>暂无消息</text>
            <view class="unread-badge" v-if="group.unreadCount > 0">
              <text class="unread-text">{{ group.unreadCount > 99 ? '99+' : group.unreadCount }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <view class="empty-icon">💬</view>
      <text class="empty-text">还没有任何群组消息</text>
      <text class="empty-subtext">加入搭子组后即可开始聊天</text>
    </view>
  </view>
</template>

<script>
import { apiMyGroups, apiGetUnreadDetail, apiGetInvitations, apiAcceptInvite, apiRejectInvite, apiMarkGroupRead } from '@/common/api.js';
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
  
  // 页面激活时刷新数据（例如从聊天页面返回时）
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
      } catch (e) {
        console.error('加载邀请列表失败:', e);
      }
    },
    
    // 刷新邀请列表的方法，供其他页面调用
    refreshInvitations() {
      console.log('收到刷新邀请列表的请求');
      this.loadInvitations();
      this.loadGroups();
    },

    async acceptInvite(fromUserId, groupId) {
      try {
        uni.showLoading({ title: '接受中...' });
        await apiAcceptInvite({ invitationId: fromUserId });
        uni.hideLoading();
        uni.showToast({ title: '已加入搭子组', icon: 'success' });
        this.loadInvitations();
        this.loadGroups();
      } catch (e) {
        uni.hideLoading();
        uni.showToast({ title: '接受失败', icon: 'none' });
      }
    },

    async rejectInvite(fromUserId, groupId) {
      try {
        uni.showLoading({ title: '拒绝中...' });
        // 调用后端API真正拒绝邀请
        await apiRejectInvite({ 
          userId: this.userId,
          invitationId: fromUserId 
        });
        uni.hideLoading();
        
        // 从本地列表中移除邀请
        this.invitations = this.invitations.filter(i => !(i.fromUserId === fromUserId && i.groupId === groupId));
        uni.showToast({ title: '已拒绝', icon: 'none' });
        
        // 刷新邀请列表以确保数据同步
        this.loadInvitations();
      } catch (e) {
        uni.hideLoading();
        uni.showToast({ title: '拒绝失败', icon: 'none' });
        console.error('拒绝邀请失败:', e);
      }
    },

    handleInvite(invite) {
      // 点击邀请项显示详情
    },

    async loadGroups() {
      try {
        uni.showLoading({ title: '加载中...' });
        
        // 先获取用户的所有组
        let myGroups = [];
        try {
          const myGroupsRes = await apiMyGroups();
          myGroups = myGroupsRes?.data || myGroupsRes || [];
        } catch (groupsError) {
          console.error('获取我的群组失败:', groupsError);
          uni.hideLoading();
          uni.showToast({
            title: '获取群组列表失败',
            icon: 'none'
          });
          return;
        }
        
        // 再获取未读消息详情（有聊天消息的组）
        let unreadData = [];
        try {
          const res = await apiGetUnreadDetail(this.userId);
          unreadData = res?.data || res || [];
        } catch (unreadError) {
          console.error('获取未读消息详情失败:', unreadError);
          // 即使未读消息获取失败，也要显示群组列表
        }
        
        // 合并数据：所有组 + 未读信息，过滤掉无效的群组
        const allGroups = myGroups
          .filter(group => group && group.id) // 过滤掉无效的群组
          .map(group => {
            // 查找对应的未读消息信息，如果找不到则使用默认值
            const unreadInfo = unreadData.find(u => u.groupId === group.id);
            return {
              id: group.id,
              groupName: group.groupName || '搭子组',
              lastMessage: unreadInfo?.lastMessage || '',
              lastMessageTime: unreadInfo?.lastMessageTime,
              unreadCount: unreadInfo?.unreadCount || 0
            };
          });
        
        this.groups = allGroups;
        
        // 添加日志输出，便于调试
        console.log('加载群组完成，群组数量:', this.groups.length);
        console.log('各群组的未读消息数:', this.groups.map(g => ({id: g.id, name: g.groupName, unread: g.unreadCount})));
        
        uni.hideLoading();
      } catch (e) {
        console.error('加载群组列表失败:', e);
        uni.hideLoading();
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },

    goToChat(groupId) {
      uni.navigateTo({
        url: '/pages/group/chat?id=' + groupId
      });
    },

    handleItemClick(groupId) {
      this.goToChat(groupId);
    },

    enterChat(groupId) {
      // 进入聊天页面前先标记该群组消息为已读
      this.markGroupMessagesAsRead(groupId);
      uni.navigateTo({
        url: '/pages/group/chat?id=' + groupId
      });
    },
    
    // 标记指定群组的消息为已读
    markGroupMessagesAsRead(groupId) {
      if (!groupId || !this.userId) {
        console.warn('群组ID或用户ID缺失，无法标记消息为已读');
        return;
      }
      
      console.log('准备标记群组消息为已读:', groupId, '用户ID:', this.userId);
      
      apiMarkGroupRead(Number(groupId), Number(this.userId))
        .then(response => {
          console.log('标记群组消息为已读成功:', groupId, '响应:', response);
          
          // 更新本地UI显示
          const groupIndex = this.groups.findIndex(g => g.id === Number(groupId));
          if (groupIndex !== -1) {
            this.groups[groupIndex].unreadCount = 0;
          }
        })
        .catch(error => {
          console.error('标记群组消息为已读失败:', groupId, '错误:', error);
          // 提示用户标记失败，可以稍后重试
          uni.showToast({
            title: '同步阅读状态失败，请稍后重试',
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
      
      // 小于1分钟
      if (diff < 60000) {
        return '刚刚';
      }
      
      // 小于1小时
      if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      }
      
      // 小于24小时
      if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      }
      
      // 小于7天
      if (diff < 604800000) {
        return Math.floor(diff / 86400000) + '天前';
      }
      
      // 显示日期
      return `${date.getMonth() + 1}-${date.getDate()}`;
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 30rpx 40rpx;
  text-align: center;
}

.page-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  display: block;
}

.page-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
  margin-top: 8rpx;
}

.invite-section {
  padding: 20rpx;
  background: #fff5f5;
  margin-bottom: 10rpx;
}

.section-title {
  margin-bottom: 16rpx;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ff6b6b;
}

.invite-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.invite-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.invite-info {
  flex: 1;
}

.invite-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.invite-desc {
  font-size: 24rpx;
  color: #999;
}

.invite-actions {
  display: flex;
  gap: 12rpx;
}

.btn-accept {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  border: none;
}

.btn-reject {
  background: #f5f5f5;
  color: #666;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  border: none;
}

.message-list {
  padding: 20rpx;
}

.message-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.group-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 40rpx;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.group-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.last-time {
  font-size: 22rpx;
  color: #999;
}

.group-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.last-message {
  font-size: 26rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400rpx;
}

.last-message.empty {
  color: #ccc;
}

.unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  background: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.unread-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.empty-subtext {
  font-size: 26rpx;
  color: #999;
}
</style>
