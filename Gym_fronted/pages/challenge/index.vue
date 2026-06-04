<template>
  <view class="challenge-page">
    <view class="hero-card">
      <image class="hero-photo" src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1400&q=80" mode="aspectFill" />
      <view class="hero-top">
        <view>
          <view class="hero-badge">Challenge Hub</view>
          <text class="hero-title">把公开挑战、组内挑战和打卡节奏统一到一个入口里</text>
          <text class="hero-desc">
            你可以在这里筛选挑战、快速查看状态，也可以直接创建新的挑战来驱动搭子组持续训练。
          </text>
        </view>

        <view class="hero-action" @tap="showCreateModal">
          <text class="hero-action-text">创建挑战</text>
        </view>
      </view>

      <view class="hero-meta">
        <view class="hero-chip">
          <text class="chip-label">当前列表</text>
          <text class="chip-value">{{ challenges.length }}</text>
        </view>
        <view class="hero-chip">
          <text class="chip-label">筛选状态</text>
          <text class="chip-value">{{ statusOptions[statusIndex] }}</text>
        </view>
      </view>
    </view>

    <view class="filter-card">
      <view class="search-box">
        <input
          class="search-input"
          type="text"
          placeholder="搜索挑战名称"
          v-model="searchKeyword"
          @input="handleSearch"
        />
      </view>

      <view class="filter-row">
        <picker @change="onStatusChange" :value="statusIndex" :range="statusOptions">
          <view class="picker-chip">
            <text class="picker-text">{{ statusOptions[statusIndex] }}</text>
            <text class="picker-arrow">筛选</text>
          </view>
        </picker>

        <view class="refresh-chip" @tap="refreshChallengeStatus">
          <text class="refresh-chip-text">刷新状态</text>
        </view>
      </view>
    </view>

    <scroll-view
      class="challenge-list-container"
      scroll-y="true"
      @scrolltolower="loadMore"
      :lower-threshold="20"
    >
      <view v-if="loading && !challenges.length" class="loading-panel">
        <view class="loading-spinner"></view>
        <text class="loading-title">正在加载挑战列表</text>
        <text class="loading-copy">准备把挑战状态和活动信息同步到当前页面</text>
      </view>

      <view v-else-if="!challenges.length" class="empty-card">
        <view class="empty-icon">挑</view>
        <text class="empty-title">暂时还没有符合条件的挑战</text>
        <text class="empty-desc">可以换个筛选条件，或者直接创建新的公开挑战和组内挑战。</text>
        <view class="empty-action" @tap="showCreateModal">
          <text class="empty-action-text">创建第一个挑战</text>
        </view>
      </view>

      <view v-else class="list-section">
        <view class="section-head">
          <view>
            <text class="section-title">挑战列表</text>
            <text class="section-subtitle">优先展示挑战状态、时间范围和参与规模，帮助你快速做判断</text>
          </view>
          <text class="section-count">{{ challenges.length }} 个挑战</text>
        </view>

        <view class="challenge-list">
          <view
            v-for="challenge in challenges"
            :key="challenge.id"
            class="challenge-card"
            @tap="goToDetail(challenge.id)"
          >
            <image
              v-if="challenge.coverImage"
              :src="challenge.coverImage"
              class="cover-image"
              mode="aspectFill"
            ></image>
            <view v-else class="cover-image placeholder-cover">
              <text class="placeholder-text">挑战</text>
            </view>

            <view class="card-content">
              <view class="challenge-header">
                <view class="header-left">
                  <text class="challenge-title">
                    {{ challenge.challengeName || challenge.title || challenge.name }}
                  </text>
                  <view class="badge-row">
                    <view class="type-badge" :class="getTypeClass(challenge.type, challenge)">
                      <text class="badge-text">{{ getTypeText(challenge.type, challenge) }}</text>
                    </view>
                    <view class="status-badge" :class="getStatusClass(challenge.status, challenge)">
                      <text class="badge-text">{{ getStatusText(challenge.status, challenge) }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <view class="meta-row">
                <text class="meta-chip" v-if="challenge.startDate">{{ formatDate(challenge.startDate) }} 开始</text>
                <text class="meta-chip" v-if="challenge.endDate">{{ formatDate(challenge.endDate) }} 结束</text>
                <text class="meta-chip" v-if="challenge.maxMembers">
                  {{ challenge.currentMembers || 0 }}/{{ challenge.maxMembers }} 人
                </text>
              </view>

              <text v-if="challenge.trainRequire" class="challenge-brief">
                {{ getBriefText(challenge.trainRequire) }}
              </text>
              <text v-else class="challenge-brief muted">暂未补充挑战要求，可进入详情页查看更完整信息。</text>

              <text class="created-at" v-if="challenge.createdAt">
                创建时间：{{ formatDate(challenge.createdAt) }}
              </text>
            </view>
          </view>
        </view>

        <view v-if="loadingMore" class="list-tip">
          <text class="list-tip-text">正在加载更多...</text>
        </view>

        <view v-if="noMoreData && challenges.length > 0" class="list-tip">
          <text class="list-tip-text">已经到底了</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="showCreateModalFlag" class="modal-mask" @tap="hideCreateModal">
      <view class="modal-card" @tap.stop>
        <view class="modal-head">
          <text class="modal-title">创建挑战</text>
          <text class="modal-close" @tap="hideCreateModal">×</text>
        </view>

        <view class="field-block">
          <text class="field-label">挑战类型</text>
          <view class="segment-row">
            <view
              class="segment-item"
              :class="{ active: createForm.challengeType === 'public' }"
              @tap="selectChallengeType('public')"
            >
              公开挑战
            </view>
            <view
              class="segment-item"
              :class="{ active: createForm.challengeType === 'group' }"
              @tap="selectChallengeType('group')"
            >
              组内挑战
            </view>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">挑战名称</text>
          <input class="field-input" placeholder="请输入挑战名称" v-model="createForm.challengeName" />
        </view>

        <view class="field-block">
          <text class="field-label">开始日期</text>
          <view class="field-picker" @tap="openStartDatePicker">
            <text :class="{ placeholder: !createForm.startDate }">
              {{ createForm.startDate || '请选择开始日期' }}
            </text>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">结束日期</text>
          <view class="field-picker" @tap="openEndDatePicker">
            <text :class="{ placeholder: !createForm.endDate }">
              {{ createForm.endDate || '请选择结束日期' }}
            </text>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">最大参与人数</text>
          <input class="field-input" type="number" placeholder="请输入最大参与人数" v-model="createForm.maxMembers" />
        </view>

        <view class="field-block">
          <text class="field-label">挑战要求</text>
          <textarea
            class="field-textarea"
            placeholder="请输入挑战的具体要求"
            v-model="createForm.trainRequire"
            :maxlength="200"
          ></textarea>
        </view>

        <view class="field-block">
          <text class="field-label">挑战封面</text>
          <view class="upload-area" @tap="chooseImage">
            <view v-if="!createForm.coverImage" class="upload-placeholder">
              <text class="upload-icon">上传</text>
              <text class="upload-text">点击上传挑战封面图</text>
            </view>
            <view v-else class="uploaded-image">
              <image :src="createForm.coverImage" mode="aspectFill" class="preview-image"></image>
              <view class="remove-image" @tap.stop="removeImage">×</view>
            </view>
          </view>
        </view>

        <view v-if="createForm.challengeType === 'group'" class="field-block">
          <text class="field-label">选择群组</text>
          <view class="field-picker" @tap="openGroupPicker">
            <text :class="{ placeholder: groupIndex < 0 }">
              {{ groupIndex >= 0 ? groups[groupIndex]?.groupName : '请选择群组' }}
            </text>
          </view>
        </view>

        <view class="modal-actions">
          <view class="modal-btn secondary" @tap="hideCreateModal">取消</view>
          <view class="modal-btn primary" :class="{ disabled: submitting }" @tap="submitForm">
            {{ submitting ? '提交中...' : '创建挑战' }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="showDatePicker" class="picker-mask" @tap="hideDatePicker">
      <view class="picker-card" @tap.stop>
        <view class="picker-head">
          <text class="picker-action" @tap="hideDatePicker">取消</text>
          <text class="picker-title">选择日期</text>
          <text class="picker-action confirm" @tap="confirmDate">确定</text>
        </view>
        <picker-view :value="datePickerValue" @change="onDateChange" class="picker-view">
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

    <view v-if="showGroupPicker" class="picker-mask" @tap="hideGroupPicker">
      <view class="picker-card group-picker-card" @tap.stop>
        <view class="picker-head">
          <text class="picker-action" @tap="hideGroupPicker">取消</text>
          <text class="picker-title">选择群组</text>
          <text class="picker-action confirm" @tap="confirmGroupSelection">确定</text>
        </view>

        <radio-group @change="onRadioGroupChange" class="group-radio-list">
          <scroll-view scroll-y="true">
            <label class="group-option" v-for="(group, index) in groups" :key="group.id || index">
              <radio :value="index" :checked="selectedGroupIndex === index" color="#4b67f4" />
              <text class="group-option-text">{{ group.groupName }}</text>
            </label>
          </scroll-view>
        </radio-group>
      </view>
    </view>
  </view>
</template>

<script>
import {
  apiChallengeList,
  apiChallengeCreate,
  apiMyGroups,
  apiUploadAction,
  apiGetFileUrl,
  apiCreateGroupChallenge,
  apiUpdateChallengeStatus
} from '@/common/api.js';
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
      statusFilter: null,
      statusIndex: 0,
      statusOptions: ['全部状态', '未开始', '进行中', '已结束'],
      hasMore: true,
      showCreateModalFlag: false,
      submitting: false,
      minDate: '',
      groups: [],
      groupIndex: -1,
      createForm: {
        challengeType: 'public',
        challengeName: '',
        startDate: '',
        endDate: '',
        maxMembers: 10,
        trainRequire: '',
        coverImage: '',
        groupId: null
      },
      showDatePicker: false,
      datePickerType: '',
      datePickerValue: [0, 0, 0],
      years: [],
      months: [],
      days: [],
      indexChangeLog: [],
      showGroupPicker: false,
      selectedGroupIndex: -1
    };
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    if (!requireLogin()) return;
    this.refreshData();
  },
  methods: {
    async loadData() {
      if (!requireLogin()) return;

      if (this.page === 1) {
        this.loading = true;
      } else {
        this.loadingMore = true;
      }

      try {
        const params = {};

        if (this.searchKeyword) {
          params.keyword = this.searchKeyword;
        }

        if (this.statusFilter !== null) {
          params.status = this.statusFilter;
        }

        const res = await apiChallengeList(params);
        const newChallenges = Array.isArray(res?.data) ? res.data : res || [];

        this.challenges = newChallenges;
        this.total = newChallenges.length;
        this.hasMore = false;
        this.noMoreData = true;
      } catch (error) {
        console.error('加载挑战列表失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },
    refreshData() {
      this.page = 1;
      this.noMoreData = false;
      this.loadData();
    },
    loadMore() {
      if (this.loadingMore || this.noMoreData) return;
      uni.showToast({
        title: '已加载全部数据',
        icon: 'none'
      });
    },
    handleSearch(e) {
      this.searchKeyword = e.detail.value;
      this.debounceSearch();
    },
    debounceSearch() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.noMoreData = false;
        this.loadData();
      }, 500);
    },
    onStatusChange(e) {
      this.statusIndex = parseInt(e.detail.value);
      this.statusFilter = this.statusIndex > 0 ? this.statusIndex - 1 : null;
      this.page = 1;
      this.noMoreData = false;
      this.loadData();
    },
    getStatusText(status, challenge) {
      if (challenge && challenge.startDate && challenge.endDate) {
        const calculatedStatus = this.calculateChallengeStatus(challenge);
        const statusMap = ['未开始', '进行中', '已结束'];
        return statusMap[calculatedStatus] || '未知';
      }

      if (typeof status === 'number') {
        const statusMap = ['未开始', '进行中', '已结束'];
        return statusMap[status] || '未知';
      }

      return status || '未知';
    },
    getTypeText(type, challenge) {
      const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
      return isGroupChallenge ? '组内挑战' : '公开挑战';
    },
    getTypeClass(type, challenge) {
      const isGroupChallenge = challenge && challenge.groupId && challenge.groupId > 0;
      return isGroupChallenge ? 'type-group' : 'type-public';
    },
    getStatusClass(status, challenge) {
      if (challenge && challenge.startDate && challenge.endDate) {
        const calculatedStatus = this.calculateChallengeStatus(challenge);
        const classes = ['status-pending', 'status-active', 'status-ended'];
        return classes[calculatedStatus] || '';
      }

      if (typeof status === 'number') {
        const classes = ['status-pending', 'status-active', 'status-ended'];
        return classes[status] || '';
      }

      return '';
    },
    calculateChallengeStatus(challenge) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(challenge.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(challenge.endDate);
      endDate.setHours(0, 0, 0, 0);

      if (today < startDate) {
        return 0;
      }

      if (today >= startDate && today <= endDate) {
        return 1;
      }

      return 2;
    },
    formatDate(dateStr) {
      if (!dateStr) return '';

      try {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`;
      } catch (error) {
        return dateStr;
      }
    },
    getBriefText(text) {
      if (!text) return '';
      return text.length > 60 ? `${text.substring(0, 60)}...` : text;
    },
    goToDetail(challengeId) {
      uni.navigateTo({
        url: `/pages/challenge/detail?id=${challengeId}`
      });
    },
    async selectChallengeType(type) {
      this.createForm.challengeType = type;

      if (type === 'group' && this.groupIndex === -1) {
        await this.loadGroups();
      } else if (type === 'public') {
        this.groupIndex = -1;
        this.createForm.groupId = null;
      }
    },
    async showCreateModal() {
      if (!requireLogin()) {
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      const today = new Date();
      this.minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`;

      this.resetForm();
      await this.loadGroups();
      this.showCreateModalFlag = true;
    },
    hideCreateModal() {
      this.showCreateModalFlag = false;
    },
    async loadGroups() {
      try {
        const res = await apiMyGroups();
        if (res?.data) {
          this.groups = Array.isArray(res.data) ? res.data : res || [];
        } else {
          this.groups = res || [];
        }
      } catch (error) {
        console.error('加载群组列表失败:', error);
        uni.showToast({
          title: '加载群组失败',
          icon: 'none'
        });
      }
    },
    resetForm() {
      this.createForm = {
        challengeType: 'public',
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
    openStartDatePicker() {
      this.datePickerType = 'startDate';
      this.setupDatePicker(this.createForm.startDate);
      this.showDatePicker = true;
    },
    openEndDatePicker() {
      this.datePickerType = 'endDate';
      this.setupDatePicker(this.createForm.endDate);
      this.showDatePicker = true;
    },
    setupDatePicker(selectedDate) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      this.years = [];
      for (let year = currentYear; year <= currentYear + 5; year += 1) {
        this.years.push(year);
      }

      this.months = Array.from({ length: 12 }, (_, index) => index + 1);
      this.days = this.getDaysInMonth(currentYear, currentMonth);

      let targetDate = selectedDate ? new Date(selectedDate) : new Date();
      if (Number.isNaN(targetDate.getTime())) {
        targetDate = new Date();
      }

      const yearIndex = Math.max(0, this.years.indexOf(targetDate.getFullYear()));
      const monthIndex = Math.max(0, targetDate.getMonth());
      const dayIndex = Math.max(0, targetDate.getDate() - 1);

      this.updateDaysByYearMonth(yearIndex, monthIndex, dayIndex);
    },
    getDaysInMonth(year, month) {
      const daysCount = new Date(year, month, 0).getDate();
      return Array.from({ length: daysCount }, (_, index) => index + 1);
    },
    updateDaysByYearMonth(yearIndex, monthIndex, dayIndex = 0) {
      const selectedYear = this.years[yearIndex];
      const selectedMonth = this.months[monthIndex];

      this.days = this.getDaysInMonth(selectedYear, selectedMonth);
      const validDayIndex = Math.max(0, Math.min(dayIndex, this.days.length - 1));
      this.datePickerValue = [yearIndex, monthIndex, validDayIndex];
    },
    onDateChange(e) {
      const [yearIndex, monthIndex, dayIndex] = e.detail.value;
      this.updateDaysByYearMonth(yearIndex, monthIndex, dayIndex);
    },
    validateDate(dateStr) {
      const date = new Date(dateStr);
      return !Number.isNaN(date.getTime());
    },
    confirmDate() {
      const yearIndex = Math.max(0, Math.min(this.datePickerValue[0], this.years.length - 1));
      const monthIndex = Math.max(0, Math.min(this.datePickerValue[1], this.months.length - 1));
      const dayIndex = Math.max(0, Math.min(this.datePickerValue[2], this.days.length - 1));

      const selectedYear = this.years[yearIndex];
      const selectedMonth = this.months[monthIndex];
      const selectedDay = this.days[dayIndex];
      const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(
        selectedDay
      ).padStart(2, '0')}`;

      if (!this.validateDate(selectedDate)) {
        uni.showToast({
          title: '选择的日期无效',
          icon: 'none'
        });
        return;
      }

      if (this.datePickerType === 'startDate') {
        this.createForm.startDate = selectedDate;
      } else if (this.datePickerType === 'endDate') {
        this.createForm.endDate = selectedDate;
      }

      this.hideDatePicker();
    },
    hideDatePicker() {
      this.showDatePicker = false;
    },
    async openGroupPicker() {
      if (this.groups.length === 0) {
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
    onRadioGroupChange(e) {
      this.selectedGroupIndex = parseInt(e.detail.value);
    },
    confirmGroupSelection() {
      this.groupIndex = this.selectedGroupIndex;
      if (this.groupIndex >= 0 && this.groups[this.groupIndex]) {
        this.createForm.groupId = this.groups[this.groupIndex].id;
      } else {
        this.createForm.groupId = null;
      }
      this.hideGroupPicker();
    },
    hideGroupPicker() {
      this.showGroupPicker = false;
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sourceType: ['album', 'camera'],
        success: async (res) => {
          try {
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
              this.createForm.coverImage = urlRes.data || urlRes || objectName;
            }

            uni.showToast({
              title: '上传成功',
              icon: 'success'
            });
          } catch (error) {
            uni.hideLoading();
            console.error('上传失败:', error);
            uni.showToast({
              title: '上传失败',
              icon: 'none'
            });
          }
        }
      });
    },
    removeImage() {
      this.createForm.coverImage = '';
    },
    async submitForm() {
      if (!requireLogin()) {
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

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
          title: '参与人数必须大于 0',
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

      if (new Date(this.createForm.endDate) < new Date(this.createForm.startDate)) {
        uni.showToast({
          title: '结束日期不能早于开始日期',
          icon: 'none'
        });
        return;
      }

      if (this.createForm.challengeType === 'group' && this.groupIndex < 0) {
        uni.showToast({
          title: '请选择群组',
          icon: 'none'
        });
        return;
      }

      if (this.createForm.challengeType === 'group' && this.groupIndex >= 0 && this.groups[this.groupIndex]) {
        this.createForm.groupId = this.groups[this.groupIndex].id;
      } else if (this.createForm.challengeType === 'public') {
        this.createForm.groupId = null;
      }

      this.submitting = true;

      try {
        uni.showLoading({ title: '创建中...' });

        if (this.createForm.challengeType === 'group') {
          const requestData = {
            name: this.createForm.challengeName,
            startDate: this.createForm.startDate,
            endDate: this.createForm.endDate,
            trainRequire: this.createForm.trainRequire,
            maxMembers: parseInt(this.createForm.maxMembers),
            coverImage: this.createForm.coverImage || null,
            groupId: this.createForm.groupId
          };
          await apiCreateGroupChallenge(requestData);
        } else {
          const requestData = {
            name: this.createForm.challengeName,
            startDate: this.createForm.startDate,
            endDate: this.createForm.endDate,
            trainRequire: this.createForm.trainRequire,
            maxMembers: parseInt(this.createForm.maxMembers),
            coverImage: this.createForm.coverImage || null
          };
          await apiChallengeCreate(requestData);
        }

        uni.hideLoading();
        uni.showToast({
          title: '创建成功',
          icon: 'success'
        });

        this.hideCreateModal();
        this.resetForm();
        this.refreshData();
      } catch (error) {
        uni.hideLoading();
        console.error('创建挑战失败:', error);
        uni.showToast({
          title: error.errMsg || '创建失败，请稍后重试',
          icon: 'none'
        });
      } finally {
        this.submitting = false;
      }
    },
    async refreshChallengeStatus() {
      try {
        await apiUpdateChallengeStatus();
        uni.showToast({
          title: '状态已刷新',
          icon: 'success'
        });
        this.refreshData();
      } catch (error) {
        console.error('刷新挑战状态失败:', error);
        uni.showToast({
          title: '刷新失败',
          icon: 'none'
        });
      }
    }
  }
};
</script>

<style scoped>
.challenge-page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(111, 146, 255, 0.16), transparent 24%),
    linear-gradient(180deg, #edf2ff 0%, #f5f7fc 42%, #f4f6fb 100%);
}

.hero-card,
.filter-card,
.list-section,
.empty-card,
.modal-card,
.picker-card {
  border-radius: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.hero-card {
  position: relative;
  padding: 34rpx 30rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(150deg, #1638b8 0%, #4c67f4 46%, #7790ff 100%);
  box-shadow: 0 20rpx 50rpx rgba(23, 56, 182, 0.22);
  overflow: hidden;
}

.hero-photo {
  position: absolute;
  inset: 0;
  opacity: 0.14;
  pointer-events: none;
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

.hero-action {
  flex-shrink: 0;
  min-width: 170rpx;
  height: 82rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.filter-card,
.list-section,
.empty-card {
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18rpx 38rpx rgba(21, 35, 95, 0.08);
}

.filter-card {
  padding: 28rpx 24rpx;
  margin-bottom: 22rpx;
}

.search-box {
  display: flex;
  align-items: center;
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #f4f7ff;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
}

.filter-row {
  display: flex;
  gap: 14rpx;
}

.picker-chip,
.refresh-chip {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-chip {
  background: #eef3ff;
  padding: 0 20rpx;
  justify-content: space-between;
}

.picker-text,
.picker-arrow,
.refresh-chip-text {
  font-size: 24rpx;
  font-weight: 600;
}

.picker-text,
.picker-arrow {
  color: #4564f2;
}

.refresh-chip {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
}

.refresh-chip-text {
  color: #ffffff;
}

.challenge-list-container {
  height: calc(100vh - 420rpx);
}

.loading-panel {
  padding: 80rpx 0;
  text-align: center;
}

.loading-spinner {
  width: 72rpx;
  height: 72rpx;
  margin: 0 auto 20rpx;
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

.empty-card {
  padding: 50rpx 24rpx;
  text-align: center;
}

.empty-icon,
.placeholder-cover {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(150deg, #3354ef 0%, #6c81ff 100%);
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

.empty-action {
  height: 84rpx;
  border-radius: 999rpx;
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 24rpx rgba(50, 83, 239, 0.2);
}

.empty-action-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.list-section {
  padding: 30rpx 24rpx 26rpx;
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

.challenge-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.challenge-card {
  display: flex;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f7ff 100%);
}

.cover-image {
  width: 172rpx;
  height: 172rpx;
  border-radius: 24rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(150deg, #dce5ff 0%, #c9d7ff 100%);
}

.placeholder-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #4363f3;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.challenge-header {
  margin-bottom: 12rpx;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.challenge-title {
  font-size: 30rpx;
  line-height: 1.38;
  font-weight: 700;
  color: #172233;
}

.badge-row,
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.type-badge,
.status-badge,
.meta-chip {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
}

.badge-text {
  font-size: 21rpx;
  font-weight: 700;
}

.type-public {
  background: #edf3ff;
  color: #3151ea;
}

.type-group {
  background: #f6efff;
  color: #7f4ed8;
}

.status-pending {
  background: #fff5ea;
  color: #d67a18;
}

.status-active {
  background: #eef8f2;
  color: #2f8a5c;
}

.status-ended {
  background: #f2f5fb;
  color: #738198;
}

.meta-chip {
  background: #f2f5fb;
  color: #627188;
}

.challenge-brief {
  display: block;
  margin-top: 14rpx;
  font-size: 23rpx;
  line-height: 1.58;
  color: #5f6d83;
}

.challenge-brief.muted {
  color: #8692a8;
}

.created-at {
  display: block;
  margin-top: 14rpx;
  font-size: 21rpx;
  color: #8b96aa;
}

.list-tip {
  padding-top: 20rpx;
  text-align: center;
}

.list-tip-text {
  font-size: 23rpx;
  color: #8692a8;
}

.modal-mask,
.picker-mask {
  position: fixed;
  inset: 0;
  padding: 36rpx;
  background: rgba(10, 16, 44, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-card,
.picker-card {
  width: 100%;
  background: #ffffff;
  box-shadow: 0 24rpx 54rpx rgba(16, 23, 56, 0.18);
}

.modal-card {
  max-height: 88vh;
  padding: 34rpx 28rpx 28rpx;
  overflow-y: auto;
}

.modal-head,
.picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-head {
  margin-bottom: 22rpx;
}

.modal-title,
.picker-title {
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

.segment-row {
  display: flex;
  gap: 12rpx;
}

.segment-item {
  flex: 1;
  height: 78rpx;
  border-radius: 999rpx;
  background: #f2f5fb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  color: #5f6d83;
}

.segment-item.active {
  background: linear-gradient(150deg, #3253ef 0%, #6980ff 100%);
  color: #ffffff;
}

.field-input,
.field-textarea,
.field-picker {
  width: 100%;
  padding: 22rpx 20rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f5f7fc;
  font-size: 26rpx;
  color: #172233;
}

.field-textarea {
  min-height: 150rpx;
}

.field-picker {
  min-height: 84rpx;
  display: flex;
  align-items: center;
}

.placeholder {
  color: #9aa5ba;
}

.upload-area {
  width: 100%;
  height: 220rpx;
  border-radius: 24rpx;
  background: #f5f7fc;
  overflow: hidden;
}

.upload-placeholder {
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

.uploaded-image {
  position: relative;
  width: 100%;
  height: 100%;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.remove-image {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(10, 16, 44, 0.54);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
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

.modal-btn.disabled {
  opacity: 0.65;
}

.picker-card {
  padding: 30rpx 28rpx 26rpx;
}

.picker-head {
  margin-bottom: 18rpx;
}

.picker-action {
  font-size: 28rpx;
  color: #5f6d83;
}

.picker-action.confirm {
  color: #4564f2;
  font-weight: 700;
}

.picker-view {
  height: 420rpx;
}

.picker-item {
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  font-size: 28rpx;
  color: #172233;
}

.group-picker-card {
  max-height: 70vh;
}

.group-radio-list {
  max-height: 52vh;
}

.group-option {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eef1f6;
}

.group-option-text {
  font-size: 28rpx;
  color: #172233;
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
