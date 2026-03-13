"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_analytics = require("../../common/analytics.js");
const common_wsNative = require("../../common/ws-native.js");
const CONFIG = {
  MAX_MESSAGE_COUNT: 20,
  // 最大消息数量
  MIN_TARGET_VALUE: 1,
  // 最小目标值
  MAX_TARGET_VALUE: 9999,
  // 最大目标值
  LOADING_DELAY: 300,
  // 最小加载提示时间
  TOAST_DURATION: 2e3
  // 提示框显示时长
};
const I18N_RESOURCES = {
  zh_CN: {
    training: {
      todayStatus: "💪 今日训练状态",
      training: "训练中",
      notStarted: "未开始",
      completed: "已完成",
      target: "目标",
      completionRate: "完成度",
      trainingSettings: "🎯 训练设置",
      configurePlan: "配置你的训练计划",
      group: "👥 搭子组",
      clickToLoadGroups: "点击加载搭子组",
      selectGroup: "请选择所在搭子组",
      relatedChallenge: "🏆 关联挑战",
      clickToLoadChallenges: "点击加载挑战",
      selectChallenge: "请选择关联挑战(可选)",
      todayTarget: "🎯 今日目标",
      inputTargetTimes: "请输入今日目标次数",
      trainingDate: "📅 训练日期",
      selectDate: "请选择训练日期，默认今天",
      startTraining: "🚀 开始训练",
      abandonTraining: "❌ 放弃训练",
      reportProgress: "✅ 上报进度",
      collaborationSettings: "🤝 协同训练设置",
      manageCollaboration: "管理你的协作选项",
      groupVisibility: "👥 组员可见性",
      visibilityDesc: "是否允许组员查看你的训练进度",
      realTimeSync: "🔄 进度实时同步",
      syncDesc: "开启后进度将实时同步给组员",
      viewGroupProgress: "📊 查看组员进度",
      viewProgressDesc: "查看其他成员的训练情况",
      challengeAssociation: "챌 挑战任务关联",
      challengeDesc: "将训练与特定挑战关联",
      messageCenter: "💬 实时消息中心",
      defaultMessage: "收到一条训练相关通知",
      noMessages: "暂无实时消息",
      visibilityOn: "组员可见已开启",
      visibilityOff: "组员可见已关闭",
      syncOn: "进度同步已开启",
      syncOff: "进度同步已关闭",
      loginError: "登录信息异常",
      selectGroupFirst: "请选择搭子组",
      completeInfo: "请补全信息",
      doneExceedTarget: "完成次数不能超过目标次数",
      startSuccess: "已开始训练",
      startFailed: "开始训练失败",
      reportSuccess: "上报成功",
      reportFailed: "上报失败",
      abandonSuccess: "已放弃本次训练",
      abandonFailed: "放弃训练失败",
      challengePunchSuccess: "挑战打卡成功",
      challengePunchFailed: "挑战打卡失败",
      loadGroupsFailed: "加载组列表失败",
      loadChallengesFailed: "加载挑战列表失败",
      loadProgressFailed: "获取进度失败",
      functionComingSoon: "此功能即将推出"
    },
    common: {
      view: "查看",
      confirm: "确定",
      cancel: "取消",
      confirmAbandon: "确定要放弃本次训练吗？",
      confirmText: "确定放弃",
      cancelText: "继续训练",
      loading: "加载中...",
      processing: "处理中...",
      reporting: "上报中...",
      startingTraining: "开始训练中...",
      gettingProgress: "获取组员进度..."
    }
  }
};
const _sfc_main = {
  name: "TrainingCollaborationPage",
  // 标准化组件名
  data() {
    return {
      form: {
        groupId: null,
        date: this.formatDate(/* @__PURE__ */ new Date()),
        target: null,
        challengeId: null,
        reportDone: null
        // 分离上报的完成数，避免和展示的report混淆
      },
      report: {
        done: 0
        // 初始化默认值，避免undefined
      },
      started: false,
      messages: [],
      groups: [],
      groupIndex: -1,
      challenges: [],
      challengeIndex: -1,
      // 协同训练设置
      visibilitySetting: true,
      // 组员可见性设置
      syncSetting: true,
      // 进度同步设置
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
      return !!this.form.groupId && !!this.form.target && !!this.report.done && this.report.done <= this.form.target && this.report.done >= 0;
    },
    // 国际化快捷访问
    $t() {
      return (key) => {
        const keys = key.split(".");
        let value = I18N_RESOURCES.zh_CN;
        for (const k of keys) {
          value = value[k];
          if (!value)
            break;
        }
        return value || key;
      };
    }
  },
  onShow() {
    if (!common_auth.requireLogin()) {
      common_vendor.index.showToast({
        title: this.$t("training.loginError"),
        icon: "none",
        duration: CONFIG.TOAST_DURATION
      });
      return;
    }
    common_vendor.index.$on("ws-message", this.handleWsMessage);
    if (this.form.groupId) {
      this.subscribeGroupChannel(this.form.groupId);
    }
    common_analytics.trackEvent("training_page_show", {
      userId: this.getUserId(),
      page: "training_collaboration"
    });
    this.loadUserGroups();
  },
  onHide() {
    common_vendor.index.$off("ws-message", this.handleWsMessage);
    common_vendor.index.$off("ws-native-message", this.handleWsMessage);
    common_wsNative.unsubscribeGroup();
  },
  onUnload() {
    common_vendor.index.$off("ws-message", this.handleWsMessage);
    common_vendor.index.$off("ws-native-message", this.handleWsMessage);
    common_wsNative.unsubscribeGroup();
  },
  methods: {
    /**
     * 计算完成度百分比
     * @returns {Number} 完成度百分比
     */
    calculateCompletionRate() {
      if (!this.report.done || !this.form.target || this.form.target <= 0)
        return 0;
      return Math.min(Math.round(this.report.done / this.form.target * 100), 100);
    },
    /**
     * 加载用户所属的组列表
     */
    async loadUserGroups() {
      if (this.loading.groups)
        return;
      const userId = this.getUserId();
      if (!userId) {
        common_vendor.index.showToast({
          title: this.$t("training.loginError"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }
      this.loading.groups = true;
      const loadingTimer = setTimeout(() => {
        common_vendor.index.showLoading({ title: this.$t("common.loading") });
      }, CONFIG.LOADING_DELAY);
      try {
        const res = await common_api.apiMyGroups();
        common_vendor.index.__f__("log", "at pages/training/index.vue:440", "加载组列表返回:", res);
        const rawData = (res == null ? void 0 : res.data) || res || [];
        this.groups = Array.isArray(rawData) ? rawData : [];
        common_vendor.index.__f__("log", "at pages/training/index.vue:443", "组列表长度:", this.groups.length);
        common_vendor.index.__f__("log", "at pages/training/index.vue:444", "组列表内容:", JSON.stringify(this.groups));
        common_analytics.trackEvent("load_groups_success", {
          userId,
          groupCount: this.groups.length
        });
        if (this.groupIndex === -1 && this.groups.length > 0) {
          const firstGroup = this.groups[0];
          this.groupIndex = 0;
          this.form.groupId = firstGroup.id;
          common_vendor.index.__f__("log", "at pages/training/index.vue:457", "自动选择第一个组:", firstGroup.id, firstGroup.groupName);
          this.subscribeGroupChannel(firstGroup.id);
          this.loadGroupChallenges(firstGroup.id);
        } else if (this.groupIndex !== -1 && this.form.groupId) {
          this.loadGroupChallenges(this.form.groupId);
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/training/index.vue:469", "加载组列表失败:", e);
        common_vendor.index.showToast({
          title: this.$t("training.loadGroupsFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("load_groups_failed", {
          userId,
          error: e.message || JSON.stringify(e)
        });
      } finally {
        clearTimeout(loadingTimer);
        common_vendor.index.hideLoading();
        this.loading.groups = false;
      }
    },
    /**
     * 绑定组选择事件
     * @param {Object} e - 选择事件对象
     */
    bindGroupChange(e) {
      const index = Number(e.detail.value);
      if (isNaN(index) || index < 0 || index >= this.groups.length)
        return;
      this.groupIndex = index;
      const selectedGroup = this.groups[index];
      if (selectedGroup) {
        this.form.groupId = selectedGroup.id;
        this.subscribeGroupChannel(selectedGroup.id);
        common_analytics.trackEvent("select_group", {
          userId: this.getUserId(),
          groupId: selectedGroup.id,
          groupName: selectedGroup.groupName
        });
        this.loadGroupChallenges(selectedGroup.id);
      }
    },
    /**
     * 绑定挑战选择事件
     * @param {Object} e - 选择事件对象
     */
    bindChallengeChange(e) {
      const index = Number(e.detail.value);
      if (isNaN(index) || index < 0 || index >= this.challenges.length)
        return;
      this.challengeIndex = index;
      const selectedChallenge = this.challenges[index];
      if (selectedChallenge) {
        this.form.challengeId = selectedChallenge.id;
        common_analytics.trackEvent("select_challenge", {
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
      if (!groupId || this.loading.challenges)
        return;
      this.loading.challenges = true;
      const loadingTimer = setTimeout(() => {
        common_vendor.index.showLoading({ title: this.$t("common.loading") });
      }, CONFIG.LOADING_DELAY);
      try {
        const res = await common_api.apiGetGroupChallenges(groupId);
        common_vendor.index.__f__("log", "at pages/training/index.vue:555", "加载挑战返回:", res);
        const rawData = (res == null ? void 0 : res.data) || res || [];
        const allChallenges = Array.isArray(rawData) ? rawData : [];
        this.challenges = allChallenges.filter((c) => c.status === 1).map((c) => ({
          ...c,
          displayName: this.getChallengeDisplayName(c)
        }));
        common_vendor.index.__f__("log", "at pages/training/index.vue:562", "挑战列表:", this.challenges);
        common_analytics.trackEvent("load_challenges_success", {
          userId: this.getUserId(),
          groupId,
          challengeCount: this.challenges.length
        });
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/training/index.vue:571", "加载挑战列表失败:", e);
        common_vendor.index.showToast({
          title: this.$t("training.loadChallengesFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("load_challenges_failed", {
          userId: this.getUserId(),
          groupId,
          error: e.message || JSON.stringify(e)
        });
      } finally {
        clearTimeout(loadingTimer);
        common_vendor.index.hideLoading();
        this.loading.challenges = false;
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
        d = /* @__PURE__ */ new Date();
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    /**
     * 获取当前用户ID
     * @returns {String|Number|null} 用户ID
     */
    getUserId() {
      try {
        return common_auth.getUserIdFromToken();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/training/index.vue:617", "获取用户ID失败:", e);
        return null;
      }
    },
    /**
     * 订阅组的 WebSocket 频道
     * 用于接收后端推送的训练进度、开始、放弃等实时消息
     * @param {Number} groupId - 组ID
     */
    async subscribeGroupChannel(groupId) {
      common_vendor.index.__f__("log", "at pages/training/index.vue:628", "subscribeGroupChannel 被调用, groupId=", groupId);
      if (!groupId) {
        common_vendor.index.__f__("warn", "at pages/training/index.vue:631", "groupId 为空，取消订阅");
        return;
      }
      common_wsNative.unsubscribeGroup();
      try {
        const connected = common_wsNative.isConnected();
        common_vendor.index.__f__("log", "at pages/training/index.vue:641", "原生 WebSocket 连接状态:", connected);
        if (!connected) {
          common_vendor.index.__f__("log", "at pages/training/index.vue:644", "原生 WebSocket 未连接，尝试初始化...");
          await common_wsNative.initNativeWebSocket();
          common_vendor.index.__f__("log", "at pages/training/index.vue:646", "原生 WebSocket 初始化完成");
        }
        common_wsNative.setMessageCallback((message) => {
          common_vendor.index.__f__("log", "at pages/training/index.vue:651", "原生 WebSocket 收到消息:", message);
          this.handleWsMessage(message);
        });
        const success = common_wsNative.subscribeGroup(groupId);
        if (success) {
          common_vendor.index.__f__("log", "at pages/training/index.vue:659", "已订阅组训练频道: groupId=", groupId);
        }
      } catch (e) {
        common_vendor.index.__f__("warn", "at pages/training/index.vue:662", "订阅组频道失败（不影响基本功能）:", e.message);
      }
    },
    /**
     * 处理WebSocket消息
     * @param {Object} payload - 消息载荷
     */
    handleWsMessage(payload) {
      common_vendor.index.__f__("log", "at pages/training/index.vue:671", "handleWsMessage 收到消息:", payload);
      try {
        const type = payload.type || "";
        common_vendor.index.__f__("log", "at pages/training/index.vue:676", "消息类型:", type, "是否匹配:", type.startsWith("TRAINING_") || type === "PROGRESS_UPDATE");
        if (!type || !(type.startsWith("TRAINING_") || type === "PROGRESS_UPDATE")) {
          common_vendor.index.__f__("log", "at pages/training/index.vue:679", "消息类型不匹配，忽略");
          return;
        }
        const now = /* @__PURE__ */ new Date();
        const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        const extraParts = [];
        if (payload.groupId)
          extraParts.push(`组: ${payload.groupId}`);
        if (payload.userId)
          extraParts.push(`搭子: ${payload.userId}`);
        if (typeof payload.done === "number" && typeof payload.target === "number") {
          extraParts.push(`进度: ${payload.done}/${payload.target}`);
        }
        const newMessage = {
          type,
          message: payload.message,
          time,
          extra: extraParts.join("  ")
        };
        this.messages.unshift(newMessage);
        common_vendor.index.__f__("log", "at pages/training/index.vue:706", "消息已添加到列表:", newMessage, "当前消息数:", this.messages.length);
        if (this.messages.length > CONFIG.MAX_MESSAGE_COUNT) {
          this.messages.pop();
        }
        common_analytics.trackEvent("receive_training_message", {
          userId: this.getUserId(),
          messageType: type,
          groupId: payload.groupId
        });
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/training/index.vue:720", "处理WebSocket消息失败:", e);
      }
    },
    /**
     * 开始训练
     */
    async onStart() {
      const userId = this.getUserId();
      if (!userId) {
        common_vendor.index.showToast({
          title: this.$t("training.loginError"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }
      if (!this.form.groupId) {
        common_vendor.index.showToast({
          title: this.$t("training.selectGroupFirst"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }
      common_analytics.trackEvent("click_start_training", {
        userId,
        groupId: this.form.groupId,
        target: this.form.target
      });
      try {
        common_vendor.index.showLoading({ title: this.$t("common.startingTraining") });
        await common_api.apiTrainingStart({
          userId,
          groupId: this.form.groupId,
          target: this.form.target,
          date: this.form.date
        });
        common_vendor.index.hideLoading();
        this.started = true;
        this.report.done = 0;
        common_vendor.index.showToast({
          title: this.$t("training.startSuccess"),
          icon: "success",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("start_training_success", {
          userId,
          groupId: this.form.groupId
        });
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:783", "开始训练失败:", e);
        common_vendor.index.showToast({
          title: this.$t("training.startFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("start_training_failed", {
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
        common_vendor.index.showToast({
          title: this.$t("training.loginError"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }
      if (!this.canReportProgress) {
        common_vendor.index.showToast({
          title: this.$t("training.completeInfo"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }
      common_analytics.trackEvent("click_report_progress", {
        userId,
        groupId: this.form.groupId,
        done: this.report.done,
        target: this.form.target,
        completionRate: this.calculateCompletionRate()
      });
      try {
        common_vendor.index.showLoading({ title: this.$t("common.reporting") });
        await common_api.apiTrainingReport({
          userId,
          groupId: this.form.groupId,
          date: this.form.date,
          done: Number(this.report.done),
          target: Number(this.form.target),
          challengeId: this.form.challengeId || null
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: this.$t("training.reportSuccess"),
          icon: "success",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("report_progress_success", {
          userId,
          groupId: this.form.groupId,
          done: this.report.done,
          target: this.form.target
        });
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:862", "上报失败:", e);
        let errorMsg = this.$t("training.reportFailed");
        if (e.message && e.message.includes("请先完成今日协同训练后再打卡")) {
          errorMsg = e.message;
        }
        common_vendor.index.showToast({
          title: errorMsg,
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("report_progress_failed", {
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
      common_vendor.index.showModal({
        title: this.$t("common.confirm"),
        content: this.$t("common.confirmAbandon"),
        confirmText: this.$t("common.confirmText"),
        cancelText: this.$t("common.cancelText"),
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
        common_vendor.index.showToast({
          title: this.$t("training.loginError"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }
      if (!this.form.groupId)
        return;
      common_analytics.trackEvent("click_abandon_training", {
        userId,
        groupId: this.form.groupId
      });
      try {
        common_vendor.index.showLoading({ title: this.$t("common.processing") });
        await common_api.apiTrainingAbandon({
          userId,
          groupId: this.form.groupId,
          date: this.form.date
        });
        common_vendor.index.hideLoading();
        this.started = false;
        common_analytics.trackEvent("abandon_training_success", {
          userId,
          groupId: this.form.groupId
        });
        common_vendor.index.showToast({
          title: this.$t("training.abandonSuccess"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:948", "放弃训练失败:", e);
        common_vendor.index.showToast({
          title: this.$t("training.abandonFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("abandon_training_failed", {
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
      common_analytics.trackEvent("toggle_visibility_setting", {
        userId: this.getUserId(),
        visibility: this.visibilitySetting
      });
      common_vendor.index.showToast({
        title: this.visibilitySetting ? this.$t("training.visibilityOn") : this.$t("training.visibilityOff"),
        icon: "none",
        duration: CONFIG.TOAST_DURATION
      });
    },
    /**
     * 进度同步切换
     * @param {Object} e - 切换事件对象
     */
    onSyncChange(e) {
      this.syncSetting = e.detail.value;
      common_analytics.trackEvent("toggle_sync_setting", {
        userId: this.getUserId(),
        sync: this.syncSetting
      });
      common_vendor.index.showToast({
        title: this.syncSetting ? this.$t("training.syncOn") : this.$t("training.syncOff"),
        icon: "none",
        duration: CONFIG.TOAST_DURATION
      });
    },
    /**
     * 查看组员进度
     */
    async viewGroupProgress() {
      if (!this.form.groupId) {
        common_vendor.index.showToast({
          title: this.$t("training.selectGroupFirst"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        return;
      }
      common_analytics.trackEvent("click_view_group_progress", {
        userId: this.getUserId(),
        groupId: this.form.groupId
      });
      try {
        common_vendor.index.showLoading({ title: this.$t("common.gettingProgress") });
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: this.$t("training.functionComingSoon"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:1054", "获取组员进度失败:", e);
        common_vendor.index.showToast({
          title: this.$t("training.loadProgressFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("get_group_progress_failed", {
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
      if (this.form.target === null || this.form.target === void 0)
        return;
      if (this.form.target < CONFIG.MIN_TARGET_VALUE) {
        this.form.target = CONFIG.MIN_TARGET_VALUE;
      }
      if (this.form.target > CONFIG.MAX_TARGET_VALUE) {
        this.form.target = CONFIG.MAX_TARGET_VALUE;
      }
    },
    validateDoneInput() {
      if (this.report.done === null || this.report.done === void 0)
        return;
      if (this.report.done < 0) {
        this.report.done = 0;
      }
      if (this.form.target && this.report.done > this.form.target) {
        this.report.done = this.form.target;
      }
    },
    getChallengeDisplayName(challenge) {
      const isGroupChallenge = challenge.groupId && challenge.groupId > 0;
      const typeText = isGroupChallenge ? "[组内]" : "[公开]";
      return `${typeText} ${challenge.challengeName}`;
    },
    /**
     * 日期选择事件
     * @param {Object} e - 选择事件对象
     */
    onDateChange(e) {
      this.form.date = e.detail.value;
      common_analytics.trackEvent("select_training_date", {
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
        "TRAINING_START": "训练开始",
        "TRAINING_ABANDON": "训练放弃",
        "TRAINING_COMPLETE": "训练完成",
        "PROGRESS_UPDATE": "进度更新",
        "TRAINING_REPORT": "进度上报",
        "CHALLENGE_PUNCH": "挑战打卡"
      };
      return typeMap[type] || type;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($options.$t("training.todayStatus")),
    b: common_vendor.t($data.started ? $options.$t("training.training") : $options.$t("training.notStarted")),
    c: $data.started ? 1 : "",
    d: $data.started
  }, $data.started ? {
    e: common_vendor.t($options.$t("training.completed")),
    f: common_vendor.t($data.report.done || 0),
    g: common_vendor.t($options.$t("training.target")),
    h: common_vendor.t($data.form.target || "-"),
    i: common_vendor.t($options.$t("training.completionRate")),
    j: common_vendor.t($options.calculateCompletionRate())
  } : {}, {
    k: common_vendor.t($options.$t("training.trainingSettings")),
    l: common_vendor.t($options.$t("training.configurePlan")),
    m: common_vendor.t($options.$t("training.group")),
    n: common_vendor.t($data.groups.length),
    o: $data.groups.length === 0
  }, $data.groups.length === 0 ? {
    p: common_vendor.t($options.$t("training.clickToLoadGroups")),
    q: common_vendor.o((...args) => $options.loadUserGroups && $options.loadUserGroups(...args))
  } : {
    r: common_vendor.t($data.groupIndex === -1 ? $options.$t("training.selectGroup") : $data.groups[$data.groupIndex].groupName),
    s: common_vendor.o((...args) => $options.bindGroupChange && $options.bindGroupChange(...args)),
    t: $data.groupIndex,
    v: $data.groups
  }, {
    w: $data.form.groupId
  }, $data.form.groupId ? common_vendor.e({
    x: common_vendor.t($options.$t("training.relatedChallenge")),
    y: common_vendor.t($data.form.groupId),
    z: common_vendor.t($data.challenges.length),
    A: $data.challenges.length === 0
  }, $data.challenges.length === 0 ? {
    B: common_vendor.t($options.$t("training.clickToLoadChallenges")),
    C: common_vendor.o(($event) => $options.loadGroupChallenges($data.form.groupId))
  } : {
    D: common_vendor.t($data.challengeIndex === -1 ? $options.$t("training.selectChallenge") : $data.challenges[$data.challengeIndex].displayName),
    E: common_vendor.o((...args) => $options.bindChallengeChange && $options.bindChallengeChange(...args)),
    F: $data.challengeIndex,
    G: $data.challenges
  }) : {}, {
    H: common_vendor.o([common_vendor.m(($event) => $data.form.target = $event.detail.value, {
      number: true
    }), (...args) => $options.validateTargetInput && $options.validateTargetInput(...args)]),
    I: $data.form.target,
    J: $data.started
  }, $data.started ? {
    K: common_vendor.o([common_vendor.m(($event) => $data.report.done = $event.detail.value, {
      number: true
    }), (...args) => $options.validateDoneInput && $options.validateDoneInput(...args)]),
    L: $data.report.done
  } : {}, {
    M: common_vendor.t($options.$t("training.trainingDate")),
    N: common_vendor.t($data.form.date || $options.$t("training.selectDate")),
    O: $data.form.date,
    P: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args)),
    Q: $data.started && ($data.form.groupId || $data.form.challengeId)
  }, $data.started && ($data.form.groupId || $data.form.challengeId) ? common_vendor.e({
    R: $data.groupIndex !== -1
  }, $data.groupIndex !== -1 ? {
    S: common_vendor.t($data.groups[$data.groupIndex].groupName)
  } : {}, {
    T: $data.challengeIndex !== -1
  }, $data.challengeIndex !== -1 ? {
    U: common_vendor.t($data.challenges[$data.challengeIndex].challengeName)
  } : {}) : {}, {
    V: !$data.started
  }, !$data.started ? {
    W: common_vendor.t($options.$t("training.startTraining")),
    X: common_vendor.o((...args) => $options.onStart && $options.onStart(...args)),
    Y: !$options.canStartTraining
  } : {}, {
    Z: $data.started
  }, $data.started ? {
    aa: common_vendor.t($options.$t("training.abandonTraining")),
    ab: common_vendor.o((...args) => $options.onAbandon && $options.onAbandon(...args))
  } : {}, {
    ac: $data.started
  }, $data.started ? {
    ad: common_vendor.t($options.$t("training.reportProgress")),
    ae: common_vendor.o((...args) => $options.onReport && $options.onReport(...args)),
    af: !$options.canReportProgress
  } : {}, {
    ag: $data.form.groupId
  }, $data.form.groupId ? common_vendor.e({
    ah: common_vendor.t($options.$t("training.collaborationSettings")),
    ai: common_vendor.t($options.$t("training.manageCollaboration")),
    aj: common_vendor.t($options.$t("training.groupVisibility")),
    ak: common_vendor.t($options.$t("training.visibilityDesc")),
    al: common_vendor.o((...args) => $options.onVisibilityChange && $options.onVisibilityChange(...args)),
    am: $data.visibilitySetting,
    an: common_vendor.t($options.$t("training.realTimeSync")),
    ao: common_vendor.t($options.$t("training.syncDesc")),
    ap: common_vendor.o((...args) => $options.onSyncChange && $options.onSyncChange(...args)),
    aq: $data.syncSetting,
    ar: $data.form.groupId
  }, $data.form.groupId ? {
    as: common_vendor.t($options.$t("training.viewGroupProgress")),
    at: common_vendor.t($options.$t("training.viewProgressDesc")),
    av: common_vendor.t($options.$t("common.view")),
    aw: common_vendor.o((...args) => $options.viewGroupProgress && $options.viewGroupProgress(...args))
  } : {}, {
    ax: $data.challenges.length > 0
  }, $data.challenges.length > 0 ? {
    ay: common_vendor.t($options.$t("training.challengeAssociation")),
    az: common_vendor.t($options.$t("training.challengeDesc")),
    aA: common_vendor.t($data.challengeIndex === -1 ? $options.$t("training.selectChallenge") : $data.challenges[$data.challengeIndex].challengeName),
    aB: common_vendor.o((...args) => $options.bindChallengeChange && $options.bindChallengeChange(...args)),
    aC: $data.challengeIndex,
    aD: $data.challenges
  } : {}) : {}, {
    aE: $data.messages.length
  }, $data.messages.length ? {
    aF: common_vendor.t($options.$t("training.messageCenter")),
    aG: common_vendor.t($data.messages.length),
    aH: common_vendor.f($data.messages, (m, idx, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.formatMessageType(m.type)),
        b: common_vendor.t(m.time),
        c: common_vendor.t(m.message || $options.$t("training.defaultMessage")),
        d: m.extra
      }, m.extra ? {
        e: common_vendor.t(m.extra)
      } : {}, {
        f: idx
      });
    })
  } : {}, {
    aI: $data.messages.length === 0 && $data.started
  }, $data.messages.length === 0 && $data.started ? {
    aJ: common_vendor.t($options.$t("training.noMessages"))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ab00163c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/training/index.js.map
