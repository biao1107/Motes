<template>
  <view class="group-detail-page">
    <view v-if="!loaded" class="loading-panel">
      <view class="loading-spinner"></view>
      <text class="loading-title">正在加载组详情</text>
      <text class="loading-copy">准备同步组成员、固定训练时间和组内挑战信息</text>
    </view>

    <template v-else>
      <view v-if="errorMessage" class="error-card">
        <view class="error-icon">组</view>
        <text class="error-title">组详情加载失败</text>
        <text class="error-desc">{{ errorMessage }}</text>
        <view class="error-action" @tap="loadData">
          <text class="error-action-text">重新加载</text>
        </view>
      </view>

      <template v-else>
        <view class="hero-card">
          <view class="hero-top">
            <view>
              <view class="hero-badge">Group Detail</view>
              <text class="hero-title">{{ detail.groupName || '未命名搭子组' }}</text>
              <text class="hero-desc">
                {{ detail.fixedTime ? `固定训练时间：${detail.fixedTime}` : '还没有配置固定训练时间，建议补充后方便大家协同训练。' }}
              </text>
            </view>

            <view class="hero-action" @tap="showInvite = true">
              <text class="hero-action-text">邀请搭子</text>
            </view>
          </view>

          <view class="hero-meta">
            <view class="hero-chip">
              <text class="chip-label">成员数量</text>
              <text class="chip-value">{{ memberCount }}</text>
            </view>
            <view class="hero-chip">
              <text class="chip-label">我的角色</text>
              <text class="chip-value">{{ myRoleLabel }}</text>
            </view>
            <view class="hero-chip">
              <text class="chip-label">创建时间</text>
              <text class="chip-value small">{{ formatDate(detail.createTime) || '未知' }}</text>
            </view>
          </view>
        </view>

        <view class="quick-actions">
          <view class="quick-btn primary" @tap="goToChatRoom">
            <text class="quick-btn-text">进入聊天室</text>
          </view>
          <view class="quick-btn secondary" @tap="showCreateChallenge = true">
            <text class="quick-btn-text secondary-text">创建组内挑战</text>
          </view>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view>
              <text class="section-title">组信息概览</text>
              <text class="section-subtitle">这部分展示当前组的固定节奏和基础状态</text>
            </view>
          </view>

          <view class="summary-grid">
            <view class="summary-card">
              <text class="summary-label">组状态</text>
              <text class="summary-value">{{ detail.status === 1 ? '正常' : '已停用' }}</text>
            </view>
            <view class="summary-card">
              <text class="summary-label">固定训练时间</text>
              <text class="summary-value">{{ detail.fixedTime || '未设置' }}</text>
            </view>
            <view class="summary-card">
              <text class="summary-label">组内挑战</text>
              <text class="summary-value">{{ groupChallenges.length }}</text>
            </view>
          </view>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view>
              <text class="section-title">组成员</text>
              <text class="section-subtitle">查看成员角色、加入时间和当前协作关系</text>
            </view>
            <text class="section-count">{{ memberCount }} 人</text>
          </view>

          <view v-if="memberCount > 0" class="member-list">
            <view class="member-card" v-for="member in detail.members" :key="member.id || member.userId">
              <view class="member-avatar">
                <image v-if="member.avatar" :src="member.avatar" class="avatar-img" mode="aspectFill"></image>
                <text v-else class="avatar-text">{{ member.nickname ? member.nickname.charAt(0) : '#' }}</text>
              </view>

              <view class="member-content">
                <view class="member-head">
                  <text class="member-name">{{ member.nickname || `搭子 ${member.userId}` }}</text>
                  <view class="role-badge" :class="{ admin: member.role === 'ADMIN' }">
                    <text class="role-badge-text">{{ member.role === 'ADMIN' ? '管理员' : '成员' }}</text>
                  </view>
                </view>
                <text class="member-meta">加入时间：{{ formatDate(member.createTime) || '未知' }}</text>
              </view>
            </view>
          </view>

          <view v-else class="empty-inline">
            <text class="empty-inline-text">这个组还没有成员信息。</text>
          </view>
        </view>

        <view class="section-card">
          <view class="section-head">
            <view>
              <text class="section-title">组内挑战</text>
              <text class="section-subtitle">在组里持续发起挑战，会更容易把协同训练节奏固定下来</text>
            </view>
            <view class="inline-action" @tap="showCreateChallenge = true">
              <text class="inline-action-text">创建挑战</text>
            </view>
          </view>

          <view v-if="groupChallenges.length > 0" class="challenge-list">
            <view class="challenge-card" v-for="challenge in groupChallenges" :key="challenge.id" @tap="goToChallengeDetail(challenge.id)">
              <image
                v-if="challenge.coverImage"
                :src="challenge.coverImage"
                class="challenge-cover"
                mode="aspectFill"
              ></image>
              <view v-else class="challenge-cover placeholder-cover">
                <text class="placeholder-text">挑战</text>
              </view>

              <view class="challenge-content">
                <view class="challenge-head">
                  <text class="challenge-name">{{ challenge.challengeName || challenge.title || challenge.name }}</text>
                  <view class="challenge-status" :class="'status-' + challenge.status">
                    <text class="challenge-status-text">{{ statusText(challenge.status) }}</text>
                  </view>
                </view>
                <text class="challenge-date">
                  {{ formatDate(challenge.startDate) || challenge.startDate }} 至 {{ formatDate(challenge.endDate) || challenge.endDate }}
                </text>
              </view>
            </view>
          </view>

          <view v-else class="empty-inline">
            <text class="empty-inline-text">暂时还没有组内挑战，建议创建一个让大家一起打卡。</text>
          </view>
        </view>
      </template>

      <view v-if="showInvite" class="modal-mask" @tap="closeInvitePopup">
        <view class="modal-card small" @tap.stop>
          <view class="modal-head">
            <text class="modal-title">邀请搭子</text>
            <text class="modal-close" @tap.stop="closeInvitePopup">×</text>
          </view>

          <view class="field-block">
            <text class="field-label">对方用户名</text>
            <view class="input-wrapper">
              <text class="input-icon">我</text>
              <input
                class="invite-input"
                type="text"
                v-model="inviteForm.username"
                placeholder="请输入对方用户名"
              />
            </view>
          </view>

          <view class="modal-actions">
            <view class="modal-btn secondary" @tap="closeInvitePopup">取消</view>
            <view class="modal-btn primary" @tap="doInvite">发送邀请</view>
          </view>
        </view>
      </view>

      <view v-if="showCreateChallenge" class="modal-mask" @tap="showCreateChallenge = false">
        <view class="modal-card large" @tap.stop>
          <view class="modal-head">
            <text class="modal-title">创建组内挑战</text>
            <text class="modal-close" @tap="showCreateChallenge = false">×</text>
          </view>

          <view class="field-block">
            <text class="field-label">挑战名称</text>
            <textarea
              class="field-textarea"
              v-model="createChallengeForm.name"
              placeholder="例如：7 天晚训打卡挑战"
              :adjust-position="true"
              auto-height
            ></textarea>
          </view>

          <view class="field-block">
            <text class="field-label">挑战说明</text>
            <textarea class="field-textarea" v-model="createChallengeForm.desc" placeholder="描述挑战规则和完成标准"></textarea>
          </view>

          <view class="date-row">
            <view class="date-item">
              <text class="field-label">开始日期</text>
              <picker mode="date" :value="createChallengeForm.startDate" @change="onStartDateChange">
                <view class="field-picker">{{ createChallengeForm.startDate || '选择开始日期' }}</view>
              </picker>
            </view>
            <view class="date-item">
              <text class="field-label">结束日期</text>
              <picker mode="date" :value="createChallengeForm.endDate" @change="onEndDateChange">
                <view class="field-picker">{{ createChallengeForm.endDate || '选择结束日期' }}</view>
              </picker>
            </view>
          </view>

          <view class="field-block">
            <text class="field-label">最大参与人数</text>
            <input class="field-input" v-model.number="createChallengeForm.maxMembers" placeholder="最大参与人数" />
          </view>

          <view class="field-block">
            <text class="field-label">挑战封面</text>
            <view class="upload-area" @tap="selectChallengeCoverImage">
              <view v-if="!challengeCoverImageUrl" class="upload-placeholder">
                <text class="upload-icon">上传</text>
                <text class="upload-text">点击上传挑战封面图片</text>
              </view>
              <view v-else class="cover-preview">
                <image :src="challengeCoverImageUrl" mode="aspectFill" class="preview-image"></image>
              </view>
            </view>
          </view>

          <view class="modal-actions">
            <view class="modal-btn secondary" @tap="showCreateChallenge = false">取消</view>
            <view class="modal-btn primary" @tap="onCreateGroupChallenge">创建</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import {
  apiGroupDetailWithMembers,
  apiInviteToGroupByUsername,
  apiCreateGroupChallenge,
  apiGetGroupChallenges,
  apiUploadAction,
  apiGetFileUrl
} from '@/common/api.js';
import { requireLogin, getUserIdFromToken } from '@/common/auth.js';

export default {
  data() {
    return {
      id: '',
      loaded: false,
      errorMessage: '',
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
  computed: {
    memberCount() {
      return Array.isArray(this.detail.members) ? this.detail.members.length : 0;
    },
    myRoleLabel() {
      const currentUserId = getUserIdFromToken();
      const currentMember = (this.detail.members || []).find((member) => member.userId === currentUserId);
      if (!currentMember) return '未知';
      return currentMember.role === 'ADMIN' ? '管理员' : '成员';
    }
  },
  onLoad(query) {
    this.id = query && query.id ? Number(query.id) : null;
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadData();
  },
  methods: {
    async loadData() {
      if (!this.id) {
        this.loaded = true;
        this.errorMessage = '无效的组 ID';
        return;
      }

      this.loaded = false;
      this.errorMessage = '';

      try {
        uni.showLoading({ title: '加载中...' });
        const [detailRes, challengeRes] = await Promise.all([
          apiGroupDetailWithMembers(this.id),
          apiGetGroupChallenges(this.id)
        ]);

        this.detail = detailRes?.data || detailRes || {};
        this.groupChallenges = challengeRes?.data || challengeRes || [];
        this.loaded = true;
        uni.hideLoading();
      } catch (error) {
        uni.hideLoading();
        console.error('加载组详情失败:', error);
        this.errorMessage = '暂时无法获取组详情，请稍后重试。';
        this.loaded = true;
      }
    },
    async onInvite() {
      if (!this.inviteForm.username) {
        uni.showToast({ title: '请输入用户名', icon: 'none' });
        return;
      }

      if (this.inviteForm.username.trim().length < 2) {
        uni.showToast({ title: '用户名至少需要 2 个字符', icon: 'none' });
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
      } catch (error) {
        uni.hideLoading();
        console.error('发送邀请失败:', error);
        uni.showToast({ title: '邀请发送失败', icon: 'none' });
      }
    },
    closeInvitePopup() {
      this.showInvite = false;
      this.inviteForm.username = '';
    },
    doInvite() {
      if (!this.inviteForm.username || this.inviteForm.username.trim().length < 2) {
        uni.showToast({ title: '用户名至少 2 个字符', icon: 'none' });
        return;
      }
      this.onInvite();
    },
    goToChatRoom() {
      uni.navigateTo({ url: `/pages/group/chat?id=${this.id}` });
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    statusText(status) {
      return ['未开始', '进行中', '已结束'][status] || status;
    },
    onStartDateChange(e) {
      this.createChallengeForm.startDate = e.detail.value;
    },
    onEndDateChange(e) {
      this.createChallengeForm.endDate = e.detail.value;
    },
    async selectChallengeCoverImage() {
      uni.chooseImage({
        count: 1,
        sourceType: ['album', 'camera'],
        success: async (res) => {
          try {
            if (!requireLogin()) {
              uni.showToast({ title: '请先登录', icon: 'none' });
              return;
            }

            uni.showLoading({ title: '上传中...' });
            const uploadRes = await apiUploadAction(res.tempFilePaths[0]);
            uni.hideLoading();

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
              const urlRes = await apiGetFileUrl({ objectName });
              this.challengeCoverImageUrl = urlRes.data || urlRes || objectName;
            } else {
              this.challengeCoverImageUrl = objectName;
            }

            uni.showToast({ title: '上传成功', icon: 'success' });
          } catch (error) {
            uni.hideLoading();
            console.error('封面上传失败:', error);
            uni.showToast({ title: error.errMsg || '上传失败，请重试', icon: 'none' });
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

        await apiCreateGroupChallenge(challengeData);
        uni.hideLoading();
        uni.showToast({ title: '挑战创建成功', icon: 'success' });

        this.createChallengeForm = {
          name: '',
          desc: '',
          startDate: '',
          endDate: '',
          maxMembers: 10
        };
        this.challengeCoverImageUrl = '';
        this.showCreateChallenge = false;

        const challengeRes = await apiGetGroupChallenges(this.id);
        this.groupChallenges = challengeRes?.data || challengeRes || [];
      } catch (error) {
        uni.hideLoading();
        console.error('创建组内挑战失败:', error);
        uni.showToast({
          title: error.errMsg || '创建失败，请重试',
          icon: 'none'
        });
      }
    },
    goToChallengeDetail(challengeId) {
      uni.navigateTo({ url: `/pages/challenge/detail?id=${challengeId}` });
    }
  }
};
</script>

<style scoped>
.group-detail-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.section-card,
.error-card,
.modal-card,
.empty-inline {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-card {
  padding: 34rpx 30rpx;
  margin-bottom: 22rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  box-shadow: 0 20rpx 50rpx rgba(23, 56, 182, 0.22);
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
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

.hero-action,
.quick-btn,
.error-action,
.inline-action,
.modal-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-action {
  flex-shrink: 0;
  min-width: 170rpx;
  height: 82rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
}

.hero-action-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.hero-meta {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}

.hero-chip {
  flex: 1;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.12);
}

.chip-label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}

.chip-value {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

.chip-value.small {
  font-size: 24rpx;
}

.quick-actions {
  display: flex;
  gap: 14rpx;
  margin-bottom: 22rpx;
}

.quick-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
}

.quick-btn.primary {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.quick-btn.secondary {
  border: 1rpx solid #cfd8ec;
  background: #ffffff;
}

.quick-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.secondary-text {
  color: #3657ee;
}

.section-card,
.error-card {
  padding: 30rpx 24rpx;
  margin-bottom: 20rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
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

.section-count {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  font-size: 22rpx;
  font-weight: 600;
  color: #4564f2;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.summary-card {
  padding: 20rpx 14rpx;
  border-radius: 24rpx;
  text-align: center;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.summary-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  color: #738198;
}

.summary-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #172233;
}

.member-list,
.challenge-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.member-card,
.challenge-card {
  display: flex;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.member-avatar,
.challenge-cover {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(150deg, #3253ef 0%, #6a7dff 100%);
}

.member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img,
.preview-image,
.challenge-cover image {
  width: 100%;
  height: 100%;
}

.avatar-text,
.placeholder-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

.member-content,
.challenge-content {
  flex: 1;
  min-width: 0;
}

.member-head,
.challenge-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.member-name,
.challenge-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: #172233;
}

.role-badge,
.challenge-status {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #f2f5fb;
}

.role-badge.admin {
  background: #eef3ff;
}

.role-badge-text,
.challenge-status-text {
  font-size: 21rpx;
  font-weight: 700;
  color: #5f6d83;
}

.role-badge.admin .role-badge-text {
  color: #4564f2;
}

.member-meta,
.challenge-date {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #74829a;
}

.status-0 {
  background: #fff5ea;
}

.status-0 .challenge-status-text {
  color: #d67a18;
}

.status-1 {
  background: #eef8f2;
}

.status-1 .challenge-status-text {
  color: #2f8a5c;
}

.status-2 {
  background: #f2f5fb;
}

.status-2 .challenge-status-text {
  color: #738198;
}

.empty-inline {
  padding: 28rpx 0 8rpx;
  text-align: center;
}

.empty-inline-text {
  font-size: 24rpx;
  color: #8692a8;
}

.inline-action {
  min-width: 120rpx;
  height: 62rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #eef3ff;
}

.inline-action-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #4564f2;
}

.modal-mask {
  position: fixed;
  inset: 0;
  padding: 36rpx;
  background: rgba(10, 16, 44, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-card {
  width: 100%;
  padding: 34rpx 28rpx 28rpx;
  background: #ffffff;
  box-shadow: 0 24rpx 54rpx rgba(16, 23, 56, 0.18);
}

.modal-card.small {
  max-width: 620rpx;
}

.modal-card.large {
  max-height: 88vh;
  overflow-y: auto;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #172233;
}

.modal-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f2f5fb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: #6f7b8f;
}

.field-block + .field-block {
  margin-top: 18rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #172233;
}

.input-wrapper,
.field-input,
.field-picker,
.field-textarea,
.upload-area {
  width: 100%;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f5f7fc;
}

.input-wrapper {
  min-height: 84rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}

.input-icon {
  margin-right: 16rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #4564f2;
}

.invite-input {
  flex: 1;
  font-size: 26rpx;
}

.field-textarea {
  min-height: 90rpx;
  padding: 22rpx 20rpx;
  font-size: 26rpx;
  color: #172233;
}

.date-row {
  display: flex;
  gap: 14rpx;
}

.date-item {
  flex: 1;
}

.field-picker,
.field-input {
  min-height: 82rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: #172233;
}

.upload-area {
  height: 220rpx;
  overflow: hidden;
}

.upload-placeholder,
.cover-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 28rpx;
  font-weight: 700;
  color: #4363f3;
  margin-bottom: 10rpx;
}

.upload-text {
  font-size: 23rpx;
  color: #74829a;
}

.cover-preview {
  padding: 12rpx;
  box-sizing: border-box;
}

.preview-image {
  border-radius: 20rpx;
}

.modal-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 26rpx;
}

.modal-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.modal-btn.primary,
.error-action {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  color: #ffffff;
}

.modal-btn.secondary {
  background: #f2f5fb;
  color: #4c5b72;
}

.loading-panel,
.error-card {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.loading-spinner {
  width: 72rpx;
  height: 72rpx;
  margin-bottom: 20rpx;
  border: 6rpx solid rgba(61, 97, 242, 0.12);
  border-top-color: #4864f2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-title,
.error-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1b2537;
}

.loading-copy,
.error-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: #738198;
}

.error-icon {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3354ef 0%, #6c81ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
}

.error-action {
  min-width: 180rpx;
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  margin-top: 24rpx;
}

.error-action-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
