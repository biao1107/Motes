<template>
  <view class="group-page">
    <template v-if="loaded">
      <view class="hero-card">
        <view class="hero-badge">Partner Group</view>
        <text class="hero-title">把搭子关系、固定训练时间和组内协作放在一个地方管理</text>
        <text class="hero-desc">
          这里更像你的“训练小队主页”。你可以创建新的搭子组，也可以查看已有小组的协同安排。
        </text>
      </view>

      <view class="action-bar">
        <view class="create-btn" @tap="showCreate = true">
          <text class="create-btn-text">创建搭子组</text>
        </view>
      </view>

      <view v-if="groups.length > 0" class="section-card">
        <view class="section-head">
          <view>
            <text class="section-title">我的搭子组</text>
            <text class="section-subtitle">优先展示你已经建立好协作关系的小组</text>
          </view>
          <text class="section-count">{{ groups.length }} 个组</text>
        </view>

        <view class="group-list">
          <view v-for="item in groups" :key="item.id" class="group-card">
            <view class="card-main" @tap="goDetail(item.id)">
              <view class="group-icon">组</view>

              <view class="group-content">
                <view class="group-head">
                  <text class="group-name">{{ item.groupName || '未命名搭子组' }}</text>
                  <text class="group-arrow">查看</text>
                </view>

                <view class="meta-row">
                  <text class="meta-chip">{{ item.fixedTime || '未设置固定时间' }}</text>
                  <text class="meta-chip">{{ isAdminInGroup(item.id) ? '你是管理员' : '普通成员' }}</text>
                </view>

                <text v-if="item.desc" class="group-desc">{{ item.desc }}</text>
                <text v-else class="group-desc muted">还没有补充组内说明，可以去详情页完善。</text>
              </view>
            </view>

            <view v-if="isAdminInGroup(item.id)" class="admin-bar">
              <view class="delete-btn" @tap.stop="showDeleteConfirm(item.id, item.groupName)">删除小组</view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-card">
        <view class="empty-icon">组</view>
        <text class="empty-title">你还没有加入任何搭子组</text>
        <text class="empty-desc">先创建一个小组，把固定训练时间和组内协同关系建立起来。</text>
        <view class="empty-action" @tap="showCreate = true">
          <text class="empty-action-text">创建第一个搭子组</text>
        </view>
      </view>

      <view v-if="showCreate" class="modal-mask" @tap="showCreate = false">
        <view class="modal-card" @tap.stop>
          <view class="modal-head">
            <text class="modal-title">创建搭子组</text>
            <text class="modal-close" @tap="showCreate = false">×</text>
          </view>

          <view class="field-block">
            <text class="field-label">小组名称</text>
            <textarea
              class="field-input"
              v-model="createForm.name"
              placeholder="例如：晨跑搭子组、下班力量组"
              :adjust-position="true"
              :show-confirm-bar="false"
              auto-height
            />
          </view>

          <view class="field-block">
            <text class="field-label">固定训练时间</text>
            <textarea
              class="field-input"
              v-model="createForm.fixedTime"
              placeholder="例如：每周一三五晚 8 点"
              :adjust-position="true"
              :show-confirm-bar="false"
              auto-height
            />
          </view>

          <view class="modal-actions">
            <view class="modal-btn secondary" @tap="showCreate = false">取消</view>
            <view class="modal-btn primary" @tap="onCreateGroup">确认创建</view>
          </view>
        </view>
      </view>

      <view v-if="showDeleteConfirmPopup" class="modal-mask" @tap="hideDeleteConfirm">
        <view class="modal-card" @tap.stop>
          <view class="modal-head">
            <text class="modal-title">确认删除</text>
            <text class="modal-close" @tap="hideDeleteConfirm">×</text>
          </view>

          <text class="confirm-copy">
            确定要删除“{{ deleteGroupName }}”吗？这个操作不可恢复，组内成员和协同关系会一起失效。
          </text>

          <view class="modal-actions">
            <view class="modal-btn secondary" @tap="hideDeleteConfirm">取消</view>
            <view class="modal-btn danger" @tap="confirmDeleteGroup">删除小组</view>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="loading-panel">
      <view class="loading-spinner"></view>
      <text class="loading-title">正在加载你的搭子组</text>
      <text class="loading-copy">准备同步你和搭子之间的训练协作关系</text>
    </view>
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
      groupMembers: {}
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
        const userId = getUserIdFromToken();

        if (!userId) {
          this.loaded = true;
          uni.hideLoading();
          return;
        }

        const res = await apiMyGroups(userId);
        this.groups = res?.data || res || [];
        this.loaded = true;
        uni.hideLoading();

        await this.loadAllGroupMembers();
      } catch (error) {
        console.error('加载搭子组失败:', error);
        this.loaded = true;
        uni.hideLoading();
        uni.showToast({
          title: '加载失败，请稍后重试',
          icon: 'none'
        });
      }
    },
    async loadAllGroupMembers() {
      for (const group of this.groups) {
        try {
          const detail = await apiGroupDetailWithMembers(group.id);
          this.groupMembers[group.id] = detail.members || [];
        } catch (error) {
          console.error(`加载组 ${group.id} 成员失败:`, error);
          this.groupMembers[group.id] = [];
        }
      }
    },
    isAdminInGroup(groupId) {
      const members = this.groupMembers[groupId] || [];
      const userId = getUserIdFromToken();
      const userMember = members.find((member) => member.userId == userId);
      return userMember && userMember.role === 'ADMIN';
    },
    async onCreateGroup() {
      if (!this.createForm.name) {
        uni.showToast({ title: '请输入组名', icon: 'none' });
        return;
      }

      if (this.createForm.name.trim().length < 2) {
        uni.showToast({ title: '组名至少需要 2 个字符', icon: 'none' });
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
      } catch (error) {
        uni.hideLoading();
        console.error('创建搭子组失败:', error);
        uni.showToast({
          title: error?.message || '创建失败，请稍后重试',
          icon: 'none'
        });
      }
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/group/detail?id=${id}` });
    },
    showDeleteConfirm(groupId, groupName) {
      this.groupToDelete = groupId;
      this.deleteGroupName = groupName;
      this.showDeleteConfirmPopup = true;
    },
    hideDeleteConfirm() {
      this.showDeleteConfirmPopup = false;
      this.groupToDelete = null;
      this.deleteGroupName = '';
    },
    async confirmDeleteGroup() {
      if (!this.groupToDelete) return;

      try {
        uni.showLoading({ title: '删除中...' });
        const res = await apiDeleteGroup(this.groupToDelete);

        if (res && res.statusCode === 200) {
          uni.hideLoading();
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
          this.hideDeleteConfirm();
          this.loadData();
          return;
        }

        uni.hideLoading();
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
      } catch (error) {
        uni.hideLoading();
        console.error('删除搭子组失败:', error);
        uni.showToast({
          title: error.errMsg || error.message || '删除失败，请稍后重试',
          icon: 'none'
        });
      }
    }
  }
};
</script>

<style scoped>
.group-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.section-card,
.empty-card,
.modal-card {
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

.action-bar {
  margin-bottom: 22rpx;
}

.create-btn,
.empty-action {
  height: 88rpx;
  border-radius: 999rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.create-btn-text,
.empty-action-text {
  font-size: 27rpx;
  font-weight: 700;
  color: #ffffff;
}

.section-card,
.empty-card {
  padding: 30rpx 24rpx;
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

.group-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.group-card {
  padding: 24rpx 22rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.card-main {
  display: flex;
  gap: 18rpx;
}

.group-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6a7dff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 14rpx 26rpx rgba(50, 83, 239, 0.2);
}

.group-content {
  flex: 1;
  min-width: 0;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.group-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
  color: #172233;
}

.group-arrow {
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: 700;
  color: #4564f2;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.meta-chip {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  font-size: 21rpx;
  color: #5f6d83;
}

.group-desc {
  display: block;
  font-size: 23rpx;
  line-height: 1.58;
  color: #5f6d83;
}

.group-desc.muted {
  color: #8692a8;
}

.admin-bar {
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #dfe6f4;
  display: flex;
  justify-content: flex-end;
}

.delete-btn {
  height: 62rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 1rpx solid #ef5350;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #ef5350;
}

.empty-card {
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
  margin-bottom: 24rpx;
  font-size: 24rpx;
  line-height: 1.65;
  color: #74829a;
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

.field-input {
  width: 100%;
  min-height: 92rpx;
  padding: 22rpx 20rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f5f7fc;
  font-size: 26rpx;
  color: #172233;
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
}

.modal-btn.primary {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  color: #ffffff;
}

.modal-btn.secondary {
  background: #f2f5fb;
  color: #4c5b72;
}

.modal-btn.danger {
  background: linear-gradient(150deg, #ef5350 0%, #ff7370 100%);
  color: #ffffff;
}

.confirm-copy {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
  color: #5f6d83;
}

.loading-panel {
  min-height: 100vh;
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

.loading-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1b2537;
}

.loading-copy {
  display: block;
  font-size: 24rpx;
  color: #738198;
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
