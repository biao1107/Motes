"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_analytics = require("../../common/analytics.js");
const common_wsNative = require("../../common/ws-native.js");
const common_assets = require("../../common/assets.js");
const CONFIG = {
  MAX_MESSAGE_COUNT: 20,
  MIN_TARGET_VALUE: 1,
  MAX_TARGET_VALUE: 9999,
  LOADING_DELAY: 300,
  TOAST_DURATION: 2e3
};
const I18N_RESOURCES = {
  zh_CN: {
    training: {
      todayStatus: "今日训练状态",
      training: "训练中",
      notStarted: "未开始",
      completed: "已完成",
      target: "目标",
      completionRate: "完成度",
      trainingSettings: "训练设置",
      configurePlan: "配置你的训练计划",
      group: "搭子组",
      clickToLoadGroups: "点击加载搭子组",
      selectGroup: "请选择所在搭子组",
      relatedChallenge: "关联挑战",
      clickToLoadChallenges: "点击加载挑战",
      selectChallenge: "请选择关联挑战(可选)",
      todayTarget: "今日目标",
      inputTargetTimes: "请输入今日目标次数",
      trainingDate: "训练日期",
      selectDate: "请选择训练日期，默认今天",
      startTraining: "开始训练",
      abandonTraining: "放弃训练",
      reportProgress: "上报进度",
      collaborationSettings: "协同训练设置",
      manageCollaboration: "管理你的协作选项",
      groupVisibility: "组员可见性",
      visibilityDesc: "是否允许组员查看你的训练进度",
      realTimeSync: "进度实时同步",
      syncDesc: "开启后进度将实时同步给组员",
      viewGroupProgress: "查看组员进度",
      viewProgressDesc: "查看其他成员的训练情况",
      challengeAssociation: "挑战任务关联",
      challengeDesc: "将训练与特定挑战关联",
      messageCenter: "实时消息中心",
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
  data() {
    return {
      form: {
        groupId: null,
        date: this.formatDate(/* @__PURE__ */ new Date()),
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
      return !!this.form.groupId && !!this.form.target && !!this.report.done && this.report.done <= this.form.target && this.report.done >= 0;
    },
    $t() {
      return (key) => {
        const keys = key.split(".");
        let value = I18N_RESOURCES.zh_CN;
        for (const currentKey of keys) {
          value = value[currentKey];
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
    calculateCompletionRate() {
      if (!this.report.done || !this.form.target || this.form.target <= 0)
        return 0;
      return Math.min(Math.round(this.report.done / this.form.target * 100), 100);
    },
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
        const rawData = (res == null ? void 0 : res.data) || res || [];
        this.groups = Array.isArray(rawData) ? rawData : [];
        common_analytics.trackEvent("load_groups_success", {
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
        common_vendor.index.__f__("error", "at pages/training/index.vue:474", "加载组列表失败:", error);
        common_vendor.index.showToast({
          title: this.$t("training.loadGroupsFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("load_groups_failed", {
          userId,
          error: error.message || JSON.stringify(error)
        });
      } finally {
        clearTimeout(loadingTimer);
        common_vendor.index.hideLoading();
        this.loading.groups = false;
      }
    },
    bindGroupChange(e) {
      const index = Number(e.detail.value);
      if (Number.isNaN(index) || index < 0 || index >= this.groups.length)
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
    bindChallengeChange(e) {
      const index = Number(e.detail.value);
      if (Number.isNaN(index) || index < 0 || index >= this.challenges.length)
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
    async loadGroupChallenges(groupId) {
      if (!groupId || this.loading.challenges)
        return;
      this.loading.challenges = true;
      const loadingTimer = setTimeout(() => {
        common_vendor.index.showLoading({ title: this.$t("common.loading") });
      }, CONFIG.LOADING_DELAY);
      try {
        const res = await common_api.apiGetGroupChallenges(groupId);
        const rawData = (res == null ? void 0 : res.data) || res || [];
        const allChallenges = Array.isArray(rawData) ? rawData : [];
        this.challenges = allChallenges.filter((challenge) => challenge.status === 1).map((challenge) => ({
          ...challenge,
          displayName: this.getChallengeDisplayName(challenge)
        }));
        common_analytics.trackEvent("load_challenges_success", {
          userId: this.getUserId(),
          groupId,
          challengeCount: this.challenges.length
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/training/index.vue:554", "加载挑战列表失败:", error);
        common_vendor.index.showToast({
          title: this.$t("training.loadChallengesFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("load_challenges_failed", {
          userId: this.getUserId(),
          groupId,
          error: error.message || JSON.stringify(error)
        });
      } finally {
        clearTimeout(loadingTimer);
        common_vendor.index.hideLoading();
        this.loading.challenges = false;
        this.challengeIndex = -1;
        this.form.challengeId = null;
      }
    },
    formatDate(date) {
      const currentDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : /* @__PURE__ */ new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    getUserId() {
      try {
        return common_auth.getUserIdFromToken();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/training/index.vue:585", "获取用户ID失败:", error);
        return null;
      }
    },
    async subscribeGroupChannel(groupId) {
      if (!groupId)
        return;
      common_wsNative.unsubscribeGroup();
      try {
        const connected = common_wsNative.isConnected();
        if (!connected) {
          await common_wsNative.initNativeWebSocket();
        }
        common_wsNative.setMessageCallback((message) => {
          this.handleWsMessage(message);
        });
        common_wsNative.subscribeGroup(groupId);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/training/index.vue:606", "订阅组频道失败（不影响基本功能）:", error.message);
      }
    },
    handleWsMessage(payload) {
      try {
        const type = payload.type || "";
        if (!type || !(type.startsWith("TRAINING_") || type === "PROGRESS_UPDATE")) {
          return;
        }
        const now = /* @__PURE__ */ new Date();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
          now.getSeconds()
        ).padStart(2, "0")}`;
        const extraParts = [];
        if (payload.groupId)
          extraParts.push(`组: ${payload.groupId}`);
        if (payload.userId)
          extraParts.push(`搭子: ${payload.userId}`);
        if (typeof payload.done === "number" && typeof payload.target === "number") {
          extraParts.push(`进度: ${payload.done}/${payload.target}`);
        }
        this.messages.unshift({
          type,
          message: payload.message,
          time,
          extra: extraParts.join("  ")
        });
        if (this.messages.length > CONFIG.MAX_MESSAGE_COUNT) {
          this.messages.pop();
        }
        common_analytics.trackEvent("receive_training_message", {
          userId: this.getUserId(),
          messageType: type,
          groupId: payload.groupId
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/training/index.vue:645", "处理WebSocket消息失败:", error);
      }
    },
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
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:700", "开始训练失败:", error);
        common_vendor.index.showToast({
          title: this.$t("training.startFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("start_training_failed", {
          userId,
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
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
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:769", "上报失败:", error);
        let errorMsg = this.$t("training.reportFailed");
        if (error.message && error.message.includes("请先完成今日协同训练后再打卡")) {
          errorMsg = error.message;
        }
        common_vendor.index.showToast({
          title: errorMsg,
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("report_progress_failed", {
          userId,
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
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
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:844", "放弃训练失败:", error);
        common_vendor.index.showToast({
          title: this.$t("training.abandonFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("abandon_training_failed", {
          userId,
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
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
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/training/index.vue:912", "获取组员进度失败:", error);
        common_vendor.index.showToast({
          title: this.$t("training.loadProgressFailed"),
          icon: "none",
          duration: CONFIG.TOAST_DURATION
        });
        common_analytics.trackEvent("get_group_progress_failed", {
          userId: this.getUserId(),
          groupId: this.form.groupId,
          error: error.message || JSON.stringify(error)
        });
      }
    },
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
    onDateChange(e) {
      this.form.date = e.detail.value;
      common_analytics.trackEvent("select_training_date", {
        userId: this.getUserId(),
        date: this.form.date
      });
    },
    formatMessageType(type) {
      const typeMap = {
        TRAINING_START: "训练开始",
        TRAINING_ABANDON: "训练放弃",
        TRAINING_COMPLETE: "训练完成",
        PROGRESS_UPDATE: "进度更新",
        TRAINING_REPORT: "进度上报",
        CHALLENGE_PUNCH: "挑战打卡"
      };
      return typeMap[type] || type;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_assets._imports_0$2,
    b: common_vendor.t($options.$t("training.todayStatus")),
    c: $data.started ? "/static/icons/home/play-blue.svg" : "/static/icons/home/clock-orange.svg",
    d: common_vendor.t($data.started ? $options.$t("training.training") : $options.$t("training.notStarted")),
    e: $data.started ? 1 : "",
    f: $data.started
  }, $data.started ? {
    g: common_assets._imports_1$2,
    h: common_vendor.t($options.$t("training.completed")),
    i: common_vendor.t($data.report.done || 0),
    j: common_assets._imports_4$1,
    k: common_vendor.t($options.$t("training.target")),
    l: common_vendor.t($data.form.target || "-"),
    m: common_assets._imports_3$2,
    n: common_vendor.t($options.$t("training.completionRate")),
    o: common_vendor.t($options.calculateCompletionRate())
  } : {}, {
    p: common_vendor.t($options.$t("training.trainingSettings")),
    q: common_vendor.t($options.$t("training.configurePlan")),
    r: common_assets._imports_4,
    s: common_vendor.t($options.$t("training.group")),
    t: common_vendor.t($data.groups.length > 0 ? `当前可选 ${$data.groups.length} 个组` : "先加载组列表后再开始训练"),
    v: $data.groups.length === 0
  }, $data.groups.length === 0 ? {
    w: common_vendor.t($options.$t("training.clickToLoadGroups")),
    x: common_vendor.o((...args) => $options.loadUserGroups && $options.loadUserGroups(...args))
  } : {
    y: common_vendor.t($data.groupIndex === -1 ? $options.$t("training.selectGroup") : $data.groups[$data.groupIndex].groupName),
    z: common_vendor.o((...args) => $options.bindGroupChange && $options.bindGroupChange(...args)),
    A: $data.groupIndex,
    B: $data.groups
  }, {
    C: $data.form.groupId
  }, $data.form.groupId ? common_vendor.e({
    D: common_assets._imports_3$2,
    E: common_vendor.t($options.$t("training.relatedChallenge")),
    F: common_vendor.t($data.challenges.length > 0 ? `当前组可关联 ${$data.challenges.length} 个挑战` : "当前组还没有进行中的挑战"),
    G: $data.challenges.length === 0
  }, $data.challenges.length === 0 ? {
    H: common_vendor.t($options.$t("training.clickToLoadChallenges")),
    I: common_vendor.o(($event) => $options.loadGroupChallenges($data.form.groupId))
  } : {
    J: common_vendor.t($data.challengeIndex === -1 ? $options.$t("training.selectChallenge") : $data.challenges[$data.challengeIndex].displayName),
    K: common_vendor.o((...args) => $options.bindChallengeChange && $options.bindChallengeChange(...args)),
    L: $data.challengeIndex,
    M: $data.challenges
  }) : {}, {
    N: common_assets._imports_4$1,
    O: common_vendor.o([common_vendor.m(($event) => $data.form.target = $event.detail.value, {
      number: true
    }), (...args) => $options.validateTargetInput && $options.validateTargetInput(...args)]),
    P: $data.form.target,
    Q: $data.started
  }, $data.started ? {
    R: common_assets._imports_1$2,
    S: common_vendor.o([common_vendor.m(($event) => $data.report.done = $event.detail.value, {
      number: true
    }), (...args) => $options.validateDoneInput && $options.validateDoneInput(...args)]),
    T: $data.report.done
  } : {}, {
    U: common_assets._imports_5$2,
    V: common_vendor.t($options.$t("training.trainingDate")),
    W: common_vendor.t($data.form.date || $options.$t("training.selectDate")),
    X: $data.form.date,
    Y: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args)),
    Z: $data.started && ($data.form.groupId || $data.form.challengeId)
  }, $data.started && ($data.form.groupId || $data.form.challengeId) ? common_vendor.e({
    aa: $data.groupIndex !== -1
  }, $data.groupIndex !== -1 ? {
    ab: common_vendor.t($data.groups[$data.groupIndex].groupName)
  } : {}, {
    ac: $data.challengeIndex !== -1
  }, $data.challengeIndex !== -1 ? {
    ad: common_vendor.t($data.challenges[$data.challengeIndex].challengeName)
  } : {}) : {}, {
    ae: !$data.started
  }, !$data.started ? {
    af: common_assets._imports_5,
    ag: common_vendor.t($options.$t("training.startTraining")),
    ah: !$options.canStartTraining ? 1 : "",
    ai: common_vendor.o((...args) => $options.onStart && $options.onStart(...args))
  } : {}, {
    aj: $data.started
  }, $data.started ? {
    ak: common_assets._imports_7$2,
    al: common_vendor.t($options.$t("training.abandonTraining")),
    am: common_vendor.o((...args) => $options.onAbandon && $options.onAbandon(...args))
  } : {}, {
    an: $data.started
  }, $data.started ? {
    ao: common_assets._imports_8,
    ap: common_vendor.t($options.$t("training.reportProgress")),
    aq: !$options.canReportProgress ? 1 : "",
    ar: common_vendor.o((...args) => $options.onReport && $options.onReport(...args))
  } : {}, {
    as: $data.form.groupId
  }, $data.form.groupId ? {
    at: common_vendor.t($options.$t("training.collaborationSettings")),
    av: common_vendor.t($options.$t("training.manageCollaboration")),
    aw: common_assets._imports_9$1,
    ax: common_vendor.t($options.$t("training.groupVisibility")),
    ay: common_vendor.t($options.$t("training.visibilityDesc")),
    az: common_vendor.o((...args) => $options.onVisibilityChange && $options.onVisibilityChange(...args)),
    aA: $data.visibilitySetting,
    aB: common_assets._imports_10$1,
    aC: common_vendor.t($options.$t("training.realTimeSync")),
    aD: common_vendor.t($options.$t("training.syncDesc")),
    aE: common_vendor.o((...args) => $options.onSyncChange && $options.onSyncChange(...args)),
    aF: $data.syncSetting,
    aG: common_assets._imports_1$2,
    aH: common_vendor.t($options.$t("training.viewGroupProgress")),
    aI: common_vendor.t($options.$t("training.viewProgressDesc")),
    aJ: common_assets._imports_9$1,
    aK: common_vendor.t($options.$t("common.view")),
    aL: common_vendor.o((...args) => $options.viewGroupProgress && $options.viewGroupProgress(...args))
  } : {}, {
    aM: $data.messages.length > 0
  }, $data.messages.length > 0 ? {
    aN: common_vendor.t($options.$t("training.messageCenter")),
    aO: common_vendor.t($data.messages.length),
    aP: common_vendor.f($data.messages, (message, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.formatMessageType(message.type)),
        b: common_vendor.t(message.time),
        c: common_vendor.t(message.message || $options.$t("training.defaultMessage")),
        d: message.extra
      }, message.extra ? {
        e: common_vendor.t(message.extra)
      } : {}, {
        f: index
      });
    }),
    aQ: common_assets._imports_11
  } : $data.started ? {
    aS: common_assets._imports_11,
    aT: common_vendor.t($options.$t("training.noMessages"))
  } : {}, {
    aR: $data.started
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ab00163c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/training/index.js.map
