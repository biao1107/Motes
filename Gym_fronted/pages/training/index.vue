<template>
  <view class="training-page">
    <view class="hero-card">
      <image class="hero-photo" src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1400&q=80" mode="aspectFill" />
      <view class="hero-badge">
        <image class="hero-badge-icon" src="/static/icons/home/dumbbell-blue.svg" mode="aspectFit" />
        <text class="hero-badge-text">协同训练</text>
      </view>
      <text class="hero-title">把训练开始、进度上报和协同反馈压缩成一条更顺的单页流程</text>
      <text class="hero-desc">
        先选组和目标，再开始训练；训练中可以实时上报进度，并在页面底部直接看到协同消息反馈。
      </text>
    </view>

    <view class="status-card">
      <view class="status-head">
        <view>
          <text class="section-title">{{ $t('training.todayStatus') }}</text>
          <text class="section-subtitle">当前训练状态会影响你今天能否继续上报和参与挑战</text>
        </view>
        <view class="status-pill" :class="{ active: started }">
          <image
            class="status-pill-icon"
            :src="started ? '/static/icons/home/play-blue.svg' : '/static/icons/home/clock-orange.svg'"
            mode="aspectFit"
          />
          <text class="status-pill-text">{{ started ? $t('training.training') : $t('training.notStarted') }}</text>
        </view>
      </view>

      <view class="progress-grid" v-if="started">
        <view class="progress-card">
          <view class="progress-icon-wrap">
            <image class="progress-icon" src="/static/icons/home/chart-blue.svg" mode="aspectFit" />
          </view>
          <text class="progress-label">{{ $t('training.completed') }}</text>
          <text class="progress-value">{{ report.done || 0 }}</text>
        </view>
        <view class="progress-card">
          <view class="progress-icon-wrap">
            <image class="progress-icon" src="/static/icons/home/target-blue.svg" mode="aspectFit" />
          </view>
          <text class="progress-label">{{ $t('training.target') }}</text>
          <text class="progress-value">{{ form.target || '-' }}</text>
        </view>
        <view class="progress-card">
          <view class="progress-icon-wrap">
            <image class="progress-icon" src="/static/icons/home/trophy-blue.svg" mode="aspectFit" />
          </view>
          <text class="progress-label">{{ $t('training.completionRate') }}</text>
          <text class="progress-value">{{ calculateCompletionRate() }}%</text>
        </view>
      </view>
    </view>

    <view class="form-card">
      <view class="section-head">
        <view>
          <text class="section-title">{{ $t('training.trainingSettings') }}</text>
          <text class="section-subtitle">{{ $t('training.configurePlan') }}</text>
        </view>
      </view>

      <view class="form-group">
        <view class="field-label-row">
          <image class="field-label-icon" src="/static/icons/home/group-blue.svg" mode="aspectFit" />
          <text class="field-label">{{ $t('training.group') }}</text>
        </view>
        <view class="field-help">{{ groups.length > 0 ? `当前可选 ${groups.length} 个组` : '先加载组列表后再开始训练' }}</view>
        <view class="empty-selector" v-if="groups.length === 0" @tap="loadUserGroups">
          <text class="empty-selector-text">{{ $t('training.clickToLoadGroups') }}</text>
        </view>
        <picker v-else @change="bindGroupChange" :value="groupIndex" :range="groups" range-key="groupName">
          <view class="field-picker">
            <text class="field-picker-text">
              {{ groupIndex === -1 ? $t('training.selectGroup') : groups[groupIndex].groupName }}
            </text>
            <text class="field-picker-arrow">选择</text>
          </view>
        </picker>
      </view>

      <view class="form-group" v-if="form.groupId">
        <view class="field-label-row">
          <image class="field-label-icon" src="/static/icons/home/trophy-blue.svg" mode="aspectFit" />
          <text class="field-label">{{ $t('training.relatedChallenge') }}</text>
        </view>
        <view class="field-help">
          {{ challenges.length > 0 ? `当前组可关联 ${challenges.length} 个挑战` : '当前组还没有进行中的挑战' }}
        </view>
        <view class="empty-selector" v-if="challenges.length === 0" @tap="loadGroupChallenges(form.groupId)">
          <text class="empty-selector-text">{{ $t('training.clickToLoadChallenges') }}</text>
        </view>
        <picker v-else @change="bindChallengeChange" :value="challengeIndex" :range="challenges" range-key="displayName">
          <view class="field-picker">
            <text class="field-picker-text">
              {{ challengeIndex === -1 ? $t('training.selectChallenge') : challenges[challengeIndex].displayName }}
            </text>
            <text class="field-picker-arrow">选择</text>
          </view>
        </picker>
      </view>

      <view class="form-group">
        <view class="field-label-row">
          <image class="field-label-icon" src="/static/icons/home/target-blue.svg" mode="aspectFit" />
          <text class="field-label">今日目标</text>
        </view>
        <input
          class="field-input"
          type="number"
          v-model.number="form.target"
          placeholder="请输入今日目标次数"
          @input="validateTargetInput"
        />
      </view>

      <view class="form-group" v-if="started">
        <view class="field-label-row">
          <image class="field-label-icon" src="/static/icons/home/chart-blue.svg" mode="aspectFit" />
          <text class="field-label">已完成次数</text>
        </view>
        <input
          class="field-input"
          type="number"
          v-model.number="report.done"
          placeholder="请输入已完成次数"
          @input="validateDoneInput"
        />
      </view>

      <view class="form-group">
        <view class="field-label-row">
          <image class="field-label-icon" src="/static/icons/home/calendar-blue.svg" mode="aspectFit" />
          <text class="field-label">{{ $t('training.trainingDate') }}</text>
        </view>
        <picker mode="date" :value="form.date" @change="onDateChange">
          <view class="field-picker">
            <text class="field-picker-text">{{ form.date || $t('training.selectDate') }}</text>
            <text class="field-picker-arrow">选择</text>
          </view>
        </picker>
      </view>

      <view class="current-info" v-if="started && (form.groupId || form.challengeId)">
        <text class="current-info-text">当前训练：</text>
        <text class="current-info-main" v-if="groupIndex !== -1">{{ groups[groupIndex].groupName }}</text>
        <text class="current-info-sub" v-if="challengeIndex !== -1"> · {{ challenges[challengeIndex].challengeName }}</text>
      </view>

      <view class="action-row">
        <view class="action-btn primary" :class="{ disabled: !canStartTraining }" v-if="!started" @tap="onStart">
          <image class="action-btn-icon" src="/static/icons/home/play-white.svg" mode="aspectFit" />
          <text class="action-btn-text">{{ $t('training.startTraining') }}</text>
        </view>
        <view class="action-btn danger" v-if="started" @tap="onAbandon">
          <image class="action-btn-icon" src="/static/icons/home/close-white.svg" mode="aspectFit" />
          <text class="action-btn-text">{{ $t('training.abandonTraining') }}</text>
        </view>
        <view
          class="action-btn success"
          :class="{ disabled: !canReportProgress }"
          v-if="started"
          @tap="onReport"
        >
          <image class="action-btn-icon" src="/static/icons/home/chart-white.svg" mode="aspectFit" />
          <text class="action-btn-text">{{ $t('training.reportProgress') }}</text>
        </view>
      </view>
    </view>

    <view class="settings-card" v-if="form.groupId">
      <view class="section-head">
        <view>
          <text class="section-title">{{ $t('training.collaborationSettings') }}</text>
          <text class="section-subtitle">{{ $t('training.manageCollaboration') }}</text>
        </view>
      </view>

      <view class="setting-row">
        <view class="setting-copy">
          <view class="setting-title-row">
            <image class="setting-icon" src="/static/icons/home/eye-blue.svg" mode="aspectFit" />
            <text class="setting-title">{{ $t('training.groupVisibility') }}</text>
          </view>
          <text class="setting-desc">{{ $t('training.visibilityDesc') }}</text>
        </view>
        <switch @change="onVisibilityChange" :checked="visibilitySetting" />
      </view>

      <view class="setting-row">
        <view class="setting-copy">
          <view class="setting-title-row">
            <image class="setting-icon" src="/static/icons/home/sync-blue.svg" mode="aspectFit" />
            <text class="setting-title">{{ $t('training.realTimeSync') }}</text>
          </view>
          <text class="setting-desc">{{ $t('training.syncDesc') }}</text>
        </view>
        <switch @change="onSyncChange" :checked="syncSetting" />
      </view>

      <view class="setting-row">
        <view class="setting-copy">
          <view class="setting-title-row">
            <image class="setting-icon" src="/static/icons/home/chart-blue.svg" mode="aspectFit" />
            <text class="setting-title">{{ $t('training.viewGroupProgress') }}</text>
          </view>
          <text class="setting-desc">{{ $t('training.viewProgressDesc') }}</text>
        </view>
        <view class="inline-btn" @tap="viewGroupProgress">
          <image class="inline-btn-icon" src="/static/icons/home/eye-blue.svg" mode="aspectFit" />
          <text class="inline-btn-text">{{ $t('common.view') }}</text>
        </view>
      </view>
    </view>

    <view class="message-card" v-if="messages.length > 0">
      <view class="section-head">
        <view>
          <text class="section-title">{{ $t('training.messageCenter') }}</text>
          <text class="section-subtitle">这里展示训练开始、进度变化和挑战打卡等实时反馈</text>
        </view>
        <text class="section-count">{{ messages.length }} 条</text>
      </view>

      <view class="message-list">
        <view v-for="(message, index) in messages" :key="index" class="message-item">
          <view class="message-head">
            <view class="message-type-wrap">
              <image class="message-type-icon" src="/static/icons/home/message-blue.svg" mode="aspectFit" />
              <text class="message-type">{{ formatMessageType(message.type) }}</text>
            </view>
            <text class="message-time">{{ message.time }}</text>
          </view>
          <text class="message-text">{{ message.message || $t('training.defaultMessage') }}</text>
          <text class="message-extra" v-if="message.extra">{{ message.extra }}</text>
        </view>
      </view>
    </view>

    <view class="empty-message" v-else-if="started">
      <image class="empty-message-icon" src="/static/icons/home/message-blue.svg" mode="aspectFit" />
      <text class="empty-message-text">{{ $t('training.noMessages') }}</text>
    </view>
  </view>
</template>

<script>
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
import * as wsNative from '@/common/ws-native.js';

const CONFIG = {
  MAX_MESSAGE_COUNT: 20,
  MIN_TARGET_VALUE: 1,
  MAX_TARGET_VALUE: 9999,
  LOADING_DELAY: 300,
  TOAST_DURATION: 2000
};

const I18N_RESOURCES = {
  zh_CN: {
    training: {
      todayStatus: '今日训练状态',
      training: '训练中',
      notStarted: '未开始',
      completed: '已完成',
      target: '目标',
      completionRate: '完成度',
      trainingSettings: '训练设置',
      configurePlan: '配置你的训练计划',
      group: '搭子组',
      clickToLoadGroups: '点击加载搭子组',
      selectGroup: '请选择所在搭子组',
      relatedChallenge: '关联挑战',
      clickToLoadChallenges: '点击加载挑战',
      selectChallenge: '请选择关联挑战(可选)',
      todayTarget: '今日目标',
      inputTargetTimes: '请输入今日目标次数',
      trainingDate: '训练日期',
      selectDate: '请选择训练日期，默认今天',
      startTraining: '开始训练',
      abandonTraining: '放弃训练',
      reportProgress: '上报进度',
      collaborationSettings: '协同训练设置',
      manageCollaboration: '管理你的协作选项',
      groupVisibility: '组员可见性',
      visibilityDesc: '是否允许组员查看你的训练进度',
      realTimeSync: '进度实时同步',
      syncDesc: '开启后进度将实时同步给组员',
      viewGroupProgress: '查看组员进度',
      viewProgressDesc: '查看其他成员的训练情况',
      challengeAssociation: '挑战任务关联',
      challengeDesc: '将训练与特定挑战关联',
      messageCenter: '实时消息中心',
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
  name: 'TrainingCollaborationPage',
  data() {
    return {
      form: {
        groupId: null,
        date: this.formatDate(new Date()),
        target: null,
        challengeId: null,
        reportDone: null
      },
      report: {
        done: 0
      },
      started: false,
      messages: [],
      groups: [],
      groupIndex: -1,
      challenges: [],
      challengeIndex: -1,
      visibilitySetting: true,
      syncSetting: true,
      loading: {
        groups: false,
        challenges: false,
        progress: false
      },
      groupSubscription: null
    };
  },
  computed: {
    canStartTraining() {
      return !!this.form.groupId && !!this.form.target && this.form.target >= CONFIG.MIN_TARGET_VALUE;
    },
    canReportProgress() {
      return (
        !!this.form.groupId &&
        !!this.form.target &&
        !!this.report.done &&
        this.report.done <= this.form.target &&
        this.report.done >= 0
      );
    },
    $t() {
      return (key) => {
        const keys = key.split('.');
        let value = I18N_RESOURCES.zh_CN;
        for (const currentKey of keys) {
          value = value[currentKey];
          if (!value) break;
        }
        return value || key;
      };
    }
  },
  onShow() {
    if (!requireLogin()) {
      uni.showToast({
        title: this.$t('training.loginError'),
        icon: 'none',
        duration: CONFIG.TOAST_DURATION
      });
      return;
    }

    uni.$on('ws-message', this.handleWsMessage);

    if (this.form.groupId) {
      this.subscribeGroupChannel(this.form.groupId);
    }

    trackEvent('training_page_show', {
      userId: this.getUserId(),
      page: 'training_collaboration'
    });

    this.loadUserGroups();
  },
  onHide() {
    uni.$off('ws-message', this.handleWsMessage);
    uni.$off('ws-native-message', this.handleWsMessage);
    wsNative.unsubscribeGroup();
  },
  onUnload() {
    uni.$off('ws-message', this.handleWsMessage);
    uni.$off('ws-native-message', this.handleWsMessage);
    wsNative.unsubscribeGroup();
  },
  methods: {
    calculateCompletionRate() {
      if (!this.report.done || !this.form.target || this.form.target <= 0) return 0;
      return Math.min(Math.round((this.report.done / this.form.target) * 100), 100);
    },
    async loadUserGroups() {
      if (this.loading.groups) return;

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
        const rawData = res?.data || res || [];
        this.groups = Array.isArray(rawData) ? rawData : [];

        trackEvent('load_groups_success', {
          userId,
          groupCount: this.groups.length
        });

        if (this.groupIndex === -1 && this.groups.length > 0) {
          const firstGroup = this.groups[0];
          this.groupIndex = 0;
          this.form.groupId = firstGroup.id;
          this.subscribeGroupChannel(firstGroup.id);
          this.loadGroupChallenges(firstGroup.id);
        } else if (this.groupIndex !== -1 && this.form.groupId) {
          this.loadGroupChallenges(this.form.groupId);
        }
      } catch (error) {
        console.error('加载组列表失败:', error);
        uni.showToast({
          title: this.$t('training.loadGroupsFailed'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });

        trackEvent('load_groups_failed', {
          userId,
          error: error.message || JSON.stringify(error)
        });
      } finally {
        clearTimeout(loadingTimer);
        uni.hideLoading();
        this.loading.groups = false;
      }
    },
    bindGroupChange(e) {
      const index = Number(e.detail.value);
      if (Number.isNaN(index) || index < 0 || index >= this.groups.length) return;

      this.groupIndex = index;
      const selectedGroup = this.groups[index];

      if (selectedGroup) {
        this.form.groupId = selectedGroup.id;
        this.subscribeGroupChannel(selectedGroup.id);

        trackEvent('select_group', {
          userId: this.getUserId(),
          groupId: selectedGroup.id,
          groupName: selectedGroup.groupName
        });

        this.loadGroupChallenges(selectedGroup.id);
      }
    },
    bindChallengeChange(e) {
      const index = Number(e.detail.value);
      if (Number.isNaN(index) || index < 0 || index >= this.challenges.length) return;

      this.challengeIndex = index;
      const selectedChallenge = this.challenges[index];

      if (selectedChallenge) {
        this.form.challengeId = selectedChallenge.id;

        trackEvent('select_challenge', {
          userId: this.getUserId(),
          challengeId: selectedChallenge.id,
          challengeName: selectedChallenge.challengeName,
          groupId: this.form.groupId
        });
      }
    },
    async loadGroupChallenges(groupId) {
      if (!groupId || this.loading.challenges) return;

      this.loading.challenges = true;
      const loadingTimer = setTimeout(() => {
        uni.showLoading({ title: this.$t('common.loading') });
      }, CONFIG.LOADING_DELAY);

      try {
        const res = await apiGetGroupChallenges(groupId);
        const rawData = res?.data || res || [];
        const allChallenges = Array.isArray(rawData) ? rawData : [];
        this.challenges = allChallenges
          .filter((challenge) => challenge.status === 1)
          .map((challenge) => ({
            ...challenge,
            displayName: this.getChallengeDisplayName(challenge)
          }));

        trackEvent('load_challenges_success', {
          userId: this.getUserId(),
          groupId,
          challengeCount: this.challenges.length
        });
      } catch (error) {
        console.error('加载挑战列表失败:', error);
        uni.showToast({
          title: this.$t('training.loadChallengesFailed'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });

        trackEvent('load_challenges_failed', {
          userId: this.getUserId(),
          groupId,
          error: error.message || JSON.stringify(error)
        });
      } finally {
        clearTimeout(loadingTimer);
        uni.hideLoading();
        this.loading.challenges = false;
        this.challengeIndex = -1;
        this.form.challengeId = null;
      }
    },
    formatDate(date) {
      const currentDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    getUserId() {
      try {
        return getUserIdFromToken();
      } catch (error) {
        console.error('获取用户ID失败:', error);
        return null;
      }
    },
    async subscribeGroupChannel(groupId) {
      if (!groupId) return;

      wsNative.unsubscribeGroup();

      try {
        const connected = wsNative.isConnected();
        if (!connected) {
          await wsNative.initNativeWebSocket();
        }

        wsNative.setMessageCallback((message) => {
          this.handleWsMessage(message);
        });

        wsNative.subscribeGroup(groupId);
      } catch (error) {
        console.warn('订阅组频道失败（不影响基本功能）:', error.message);
      }
    },
    handleWsMessage(payload) {
      try {
        const type = payload.type || '';
        if (!type || !(type.startsWith('TRAINING_') || type === 'PROGRESS_UPDATE')) {
          return;
        }

        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
          now.getSeconds()
        ).padStart(2, '0')}`;

        const extraParts = [];
        if (payload.groupId) extraParts.push(`组: ${payload.groupId}`);
        if (payload.userId) extraParts.push(`搭子: ${payload.userId}`);
        if (typeof payload.done === 'number' && typeof payload.target === 'number') {
          extraParts.push(`进度: ${payload.done}/${payload.target}`);
        }

        this.messages.unshift({
          type,
          message: payload.message,
          time,
          extra: extraParts.join('  ')
        });

        if (this.messages.length > CONFIG.MAX_MESSAGE_COUNT) {
          this.messages.pop();
        }

        trackEvent('receive_training_message', {
          userId: this.getUserId(),
          messageType: type,
          groupId: payload.groupId
        });
      } catch (error) {
        console.error('处理WebSocket消息失败:', error);
      }
    },
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
        this.report.done = 0;

        uni.showToast({
          title: this.$t('training.startSuccess'),
          icon: 'success',
          duration: CONFIG.TOAST_DURATION
        });

        trackEvent('start_training_success', {
          userId,
          groupId: this.form.groupId
        });
      } catch (error) {
        uni.hideLoading();
        console.error('开始训练失败:', error);
        uni.showToast({
          title: this.$t('training.startFailed'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });

        trackEvent('start_training_failed', {
          userId,
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
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

      if (!this.canReportProgress) {
        uni.showToast({
          title: this.$t('training.completeInfo'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }

      trackEvent('click_report_progress', {
        userId,
        groupId: this.form.groupId,
        done: this.report.done,
        target: this.form.target,
        completionRate: this.calculateCompletionRate()
      });

      try {
        uni.showLoading({ title: this.$t('common.reporting') });

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

        trackEvent('report_progress_success', {
          userId,
          groupId: this.form.groupId,
          done: this.report.done,
          target: this.form.target
        });
      } catch (error) {
        uni.hideLoading();
        console.error('上报失败:', error);

        let errorMsg = this.$t('training.reportFailed');
        if (error.message && error.message.includes('请先完成今日协同训练后再打卡')) {
          errorMsg = error.message;
        }

        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });

        trackEvent('report_progress_failed', {
          userId,
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
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

        trackEvent('abandon_training_success', {
          userId,
          groupId: this.form.groupId
        });

        uni.showToast({
          title: this.$t('training.abandonSuccess'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });
      } catch (error) {
        uni.hideLoading();
        console.error('放弃训练失败:', error);
        uni.showToast({
          title: this.$t('training.abandonFailed'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });

        trackEvent('abandon_training_failed', {
          userId,
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
    onVisibilityChange(e) {
      this.visibilitySetting = e.detail.value;

      trackEvent('toggle_visibility_setting', {
        userId: this.getUserId(),
        visibility: this.visibilitySetting
      });

      uni.showToast({
        title: this.visibilitySetting ? this.$t('training.visibilityOn') : this.$t('training.visibilityOff'),
        icon: 'none',
        duration: CONFIG.TOAST_DURATION
      });
    },
    onSyncChange(e) {
      this.syncSetting = e.detail.value;

      trackEvent('toggle_sync_setting', {
        userId: this.getUserId(),
        sync: this.syncSetting
      });

      uni.showToast({
        title: this.syncSetting ? this.$t('training.syncOn') : this.$t('training.syncOff'),
        icon: 'none',
        duration: CONFIG.TOAST_DURATION
      });
    },
    async viewGroupProgress() {
      if (!this.form.groupId) {
        uni.showToast({
          title: this.$t('training.selectGroupFirst'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }

      trackEvent('click_view_group_progress', {
        userId: this.getUserId(),
        groupId: this.form.groupId
      });

      try {
        uni.showLoading({ title: this.$t('common.gettingProgress') });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        uni.hideLoading();
        uni.showToast({
          title: this.$t('training.functionComingSoon'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });
      } catch (error) {
        uni.hideLoading();
        console.error('获取组员进度失败:', error);
        uni.showToast({
          title: this.$t('training.loadProgressFailed'),
          icon: 'none',
          duration: CONFIG.TOAST_DURATION
        });

        trackEvent('get_group_progress_failed', {
          userId: this.getUserId(),
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
    validateTargetInput() {
      if (this.form.target === null || this.form.target === undefined) return;

      if (this.form.target < CONFIG.MIN_TARGET_VALUE) {
        this.form.target = CONFIG.MIN_TARGET_VALUE;
      }

      if (this.form.target > CONFIG.MAX_TARGET_VALUE) {
        this.form.target = CONFIG.MAX_TARGET_VALUE;
      }
    },
    validateDoneInput() {
      if (this.report.done === null || this.report.done === undefined) return;

      if (this.report.done < 0) {
        this.report.done = 0;
      }

      if (this.form.target && this.report.done > this.form.target) {
        this.report.done = this.form.target;
      }
    },
    getChallengeDisplayName(challenge) {
      const isGroupChallenge = challenge.groupId && challenge.groupId > 0;
      const typeText = isGroupChallenge ? '[组内]' : '[公开]';
      return `${typeText} ${challenge.challengeName}`;
    },
    onDateChange(e) {
      this.form.date = e.detail.value;

      trackEvent('select_training_date', {
        userId: this.getUserId(),
        date: this.form.date
      });
    },
    formatMessageType(type) {
      const typeMap = {
        TRAINING_START: '训练开始',
        TRAINING_ABANDON: '训练放弃',
        TRAINING_COMPLETE: '训练完成',
        PROGRESS_UPDATE: '进度更新',
        TRAINING_REPORT: '进度上报',
        CHALLENGE_PUNCH: '挑战打卡'
      };
      return typeMap[type] || type;
    }
  }
};
</script>

<style scoped>
.training-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.status-card,
.form-card,
.settings-card,
.message-card,
.empty-message {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.hero-card {
  position: relative;
  padding: 34rpx 30rpx;
  margin-bottom: 22rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  box-shadow: 0 20rpx 50rpx rgba(23, 56, 182, 0.22);
  overflow: hidden;
}

.hero-photo {
  position: absolute;
  inset: 0;
  opacity: 0.17;
  pointer-events: none;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 44rpx;
  padding: 0 16rpx;
  margin-bottom: 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
}

.hero-badge-icon {
  width: 22rpx;
  height: 22rpx;
}

.hero-badge-text {
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

.status-card,
.form-card,
.settings-card,
.message-card,
.empty-message {
  padding: 30rpx 24rpx;
}

.status-card,
.form-card,
.settings-card,
.message-card {
  margin-bottom: 20rpx;
}

.status-head,
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
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

.status-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #f2f5fb;
}

.status-pill-icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.status-pill.active {
  background: #eef3ff;
}

.status-pill-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #5f6d83;
}

.status-pill.active .status-pill-text {
  color: #4564f2;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 20rpx;
}

.progress-card {
  padding: 20rpx 14rpx;
  border-radius: 24rpx;
  text-align: center;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.progress-icon-wrap {
  width: 52rpx;
  height: 52rpx;
  margin: 0 auto 10rpx;
  border-radius: 16rpx;
  background: #eef3ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-icon {
  width: 28rpx;
  height: 28rpx;
}

.field-label-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.field-label-icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.progress-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  color: #738198;
}

.progress-value {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #172233;
}

.form-group + .form-group {
  margin-top: 20rpx;
}

.field-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #172233;
}

.field-help {
  margin-bottom: 10rpx;
  font-size: 22rpx;
  color: #8692a8;
}

.field-picker,
.field-input,
.empty-selector {
  width: 100%;
  min-height: 82rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f5f7fc;
  display: flex;
  align-items: center;
}

.field-picker {
  justify-content: space-between;
}

.field-picker-text {
  flex: 1;
  font-size: 26rpx;
  color: #172233;
}

.field-picker-arrow {
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: 700;
  color: #4564f2;
}

.field-input {
  font-size: 26rpx;
  color: #172233;
}

.empty-selector {
  justify-content: center;
}

.empty-selector-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #4564f2;
}

.current-info {
  margin-top: 20rpx;
  padding: 20rpx 22rpx;
  border-radius: 24rpx;
  background: linear-gradient(150deg, #edf3ff 0%, #e8efff 100%);
}

.current-info-text,
.current-info-main,
.current-info-sub {
  font-size: 24rpx;
}

.current-info-text {
  color: #5f6d83;
}

.current-info-main {
  color: #172233;
  font-weight: 700;
}

.current-info-sub {
  color: #4564f2;
}

.action-row {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}

.action-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.action-btn-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.action-btn.primary {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.action-btn.success {
  background: linear-gradient(150deg, #2f8a5c 0%, #48b37a 100%);
}

.action-btn.danger {
  background: linear-gradient(150deg, #ef5350 0%, #ff7370 100%);
}

.action-btn.disabled {
  opacity: 0.65;
}

.action-btn-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.setting-row + .setting-row {
  margin-top: 18rpx;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #eef1f6;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-copy {
  flex: 1;
}

.setting-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.setting-icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.setting-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #172233;
}

.setting-desc {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #74829a;
}

.inline-btn {
  min-width: 120rpx;
  height: 62rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.inline-btn-icon {
  width: 20rpx;
  height: 20rpx;
}

.inline-btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #4564f2;
}

.section-count {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eef3ff;
  font-size: 22rpx;
  font-weight: 600;
  color: #4564f2;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 18rpx;
}

.message-item {
  padding: 18rpx 18rpx 16rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.message-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.message-type-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.message-type-icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.message-type {
  font-size: 23rpx;
  font-weight: 700;
  color: #4564f2;
}

.message-time {
  font-size: 21rpx;
  color: #8b96aa;
}

.message-text {
  display: block;
  font-size: 24rpx;
  line-height: 1.58;
  color: #172233;
}

.message-extra {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #74829a;
}

.empty-message {
  text-align: center;
}

.empty-message-icon {
  width: 36rpx;
  height: 36rpx;
  margin-bottom: 10rpx;
}

.empty-message-text {
  font-size: 24rpx;
  color: #8692a8;
}

@media (max-width: 750rpx) {
  .action-row {
    flex-direction: column;
  }
}
</style>
