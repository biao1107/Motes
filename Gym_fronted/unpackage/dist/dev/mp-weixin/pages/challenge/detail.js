"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      id: "",
      loaded: false,
      detail: {},
      report: null,
      actionFileUrl: "",
      isTrainingRelatedChallenge: false,
      joining: false,
      punching: false,
      hasJoined: false,
      trainingCompleted: false,
      trainingCheckInterval: null,
      isGroupChallenge: false
    };
  },
  onLoad(query) {
    this.id = query.id;
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.loadData();
    if (this.isGroupChallenge && this.hasJoined) {
      this.startTrainingCheckInterval();
    }
  },
  computed: {
    sortedParticipants() {
      if (!this.report || !this.report.participants)
        return [];
      return [...this.report.participants].sort((a, b) => {
        if (b.completionRate !== a.completionRate) {
          return b.completionRate - a.completionRate;
        }
        return b.punchDays - a.punchDays;
      });
    },
    avgCompletionRate() {
      if (!this.report || !this.report.participants || this.report.participants.length === 0) {
        return 0;
      }
      const total = this.report.participants.reduce((sum, participant) => sum + participant.completionRate, 0);
      return Math.round(total / this.report.participants.length);
    },
    perfectCount() {
      if (!this.report || !this.report.participants)
        return 0;
      return this.report.participants.filter((participant) => participant.completionRate >= 100).length;
    },
    totalPunchDays() {
      if (!this.report || !this.report.participants)
        return 0;
      return this.report.participants.reduce((sum, participant) => sum + participant.punchDays, 0);
    },
    calculateTotalDays() {
      if (!this.report || !this.report.startDate || !this.report.endDate)
        return 0;
      const start = new Date(this.report.startDate);
      const end = new Date(this.report.endDate);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1e3 * 60 * 60 * 24)) + 1;
    }
  },
  methods: {
    formatDateRange(report) {
      if (!report)
        return "";
      const start = report.startDate || this.detail.startDate;
      const end = report.endDate || this.detail.endDate;
      if (!start || !end)
        return "";
      return `${start} 至 ${end}`;
    },
    getRateColor(rate) {
      if (rate >= 80)
        return "#52c41a";
      if (rate >= 60)
        return "#faad14";
      return "#ff4d4f";
    },
    previewImage(url) {
      if (!url)
        return;
      common_vendor.index.previewImage({
        urls: [url],
        current: url
      });
    },
    getAvatarText(userId) {
      if (!userId)
        return "?";
      return userId.toString().slice(-2);
    },
    async loadData() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const res = await common_api.apiChallengeDetail(this.id);
        this.detail = (res == null ? void 0 : res.data) || res || {};
        this.isTrainingRelatedChallenge = !!this.detail.trainingPlanId;
        this.isGroupChallenge = this.detail.groupId && this.detail.groupId > 0;
        await this.checkParticipation();
        await this.checkTrainingCompletion();
        if (this.isGroupChallenge && this.hasJoined) {
          this.startTrainingCheckInterval();
        }
        this.loaded = true;
        await this.loadPunchRecord();
        common_vendor.index.hideLoading();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:289", "加载挑战详情失败:", error);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
        this.loaded = true;
      }
    },
    statusText(status) {
      return ["未开始", "进行中", "已结束"][status] || status || "未知";
    },
    async checkParticipation() {
      try {
        if (!common_auth.requireLogin())
          return;
        const res = await common_api.apiCheckChallengeParticipation(this.id);
        this.hasJoined = (res == null ? void 0 : res.data) ?? res ?? false;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:303", "检查参与状态失败:", error);
        this.hasJoined = false;
      }
    },
    async loadPunchRecord() {
      try {
        if (!common_auth.requireLogin())
          return;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:311", "获取打卡记录失败:", error);
      }
    },
    async checkTrainingCompletion() {
      try {
        if (!this.isGroupChallenge) {
          this.trainingCompleted = true;
          return;
        }
        if (!common_auth.requireLogin())
          return;
        const now = /* @__PURE__ */ new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;
        const res = await common_api.apiGetTodayTraining();
        const todayTrainings = (res == null ? void 0 : res.data) || res || [];
        const completedTraining = todayTrainings.some((record) => record.status === 1 && record.trainDate === date);
        this.trainingCompleted = completedTraining;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:334", "检查训练完成状态失败:", error);
        this.trainingCompleted = false;
      }
    },
    startTrainingCheckInterval() {
      if (this.trainingCheckInterval) {
        clearInterval(this.trainingCheckInterval);
      }
      this.trainingCheckInterval = setInterval(async () => {
        if (this.isGroupChallenge && this.hasJoined && !this.trainingCompleted) {
          await this.checkTrainingCompletion();
        }
      }, 3e4);
    },
    stopTrainingCheckInterval() {
      if (this.trainingCheckInterval) {
        clearInterval(this.trainingCheckInterval);
        this.trainingCheckInterval = null;
      }
    },
    async onJoin() {
      if (this.joining)
        return;
      try {
        this.joining = true;
        if (!common_auth.requireLogin()) {
          common_vendor.index.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        common_vendor.index.showLoading({ title: "参与中..." });
        await common_api.apiChallengeJoin({
          challengeId: this.id
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "已参与", icon: "success" });
        await this.loadData();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:374", "参与挑战失败:", error);
        if (error.message && error.message.includes("已参与该挑战")) {
          common_vendor.index.showToast({ title: "您已参与该挑战", icon: "none" });
        } else {
          common_vendor.index.showToast({ title: error.errMsg || "参与失败，请重试", icon: "none" });
        }
      } finally {
        this.joining = false;
      }
    },
    async onPunch() {
      if (this.punching)
        return;
      try {
        this.punching = true;
        common_vendor.index.chooseImage({
          count: 1,
          sourceType: ["album", "camera"],
          success: async (res) => {
            try {
              if (!common_auth.requireLogin()) {
                common_vendor.index.showToast({ title: "请先登录", icon: "none" });
                return;
              }
              common_vendor.index.showLoading({
                title: "上传中..."
              });
              const uploadRes = await common_api.apiUploadAction(res.tempFilePaths[0]);
              common_vendor.index.hideLoading();
              const now = /* @__PURE__ */ new Date();
              const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
                now.getDate()
              ).padStart(2, "0")}`;
              let objectName = "";
              if (uploadRes && typeof uploadRes === "object") {
                if (uploadRes.data) {
                  objectName = typeof uploadRes.data === "string" ? uploadRes.data : JSON.stringify(uploadRes.data);
                } else {
                  objectName = JSON.stringify(uploadRes);
                }
              } else {
                objectName = uploadRes;
              }
              let accessibleUrl = objectName;
              if (objectName) {
                const urlRes = await common_api.apiGetFileUrl({ objectName });
                accessibleUrl = urlRes.data || urlRes || objectName;
              }
              await common_api.apiChallengePunch({
                challengeId: this.id,
                date,
                actionFile: objectName
              });
              common_vendor.index.showToast({ title: "打卡成功", icon: "success" });
              this.actionFileUrl = accessibleUrl;
            } catch (error) {
              common_vendor.index.hideLoading();
              common_vendor.index.__f__("error", "at pages/challenge/detail.vue:436", "打卡失败:", error);
              common_vendor.index.showToast({ title: error.errMsg || "打卡失败，请重试", icon: "none" });
            }
          },
          fail: () => {
            common_vendor.index.showToast({ title: "取消打卡", icon: "none" });
          }
        });
      } finally {
        this.punching = false;
      }
    },
    onViewReport() {
      common_vendor.index.showLoading({ title: "加载中..." });
      common_api.apiChallengeReport(this.id).then((res) => {
        common_vendor.index.hideLoading();
        this.report = res || {};
        common_vendor.index.showToast({ title: "加载成功", icon: "success" });
      }).catch((error) => {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:458", "加载报告失败:", error);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      });
    },
    onUnload() {
      this.stopTrainingCheckInterval();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loaded
  }, $data.loaded ? common_vendor.e({
    b: $data.detail.coverImage
  }, $data.detail.coverImage ? {
    c: $data.detail.coverImage
  } : {}, {
    d: common_vendor.t($data.detail.challengeName || $data.detail.title || $data.detail.name),
    e: common_vendor.t($data.detail.trainRequire || "查看挑战时间范围、参与状态和打卡进度，决定今天是否参与或继续完成。"),
    f: common_vendor.t($options.statusText($data.detail.status)),
    g: common_vendor.t($data.isGroupChallenge ? "组内挑战" : "公开挑战"),
    h: common_vendor.t($data.detail.startDate || "-"),
    i: common_vendor.t($data.detail.endDate || "-"),
    j: common_vendor.t($data.detail.maxMembers || "-"),
    k: common_vendor.t($data.hasJoined ? "已参与" : "未参与"),
    l: !$data.hasJoined
  }, !$data.hasJoined ? {
    m: common_vendor.t($data.joining ? "参与中..." : "参与挑战"),
    n: $data.joining ? 1 : "",
    o: common_vendor.o((...args) => $options.onJoin && $options.onJoin(...args))
  } : {}, {
    p: $data.hasJoined && !$data.isTrainingRelatedChallenge
  }, $data.hasJoined && !$data.isTrainingRelatedChallenge ? {
    q: common_vendor.t($data.punching ? "打卡中..." : "打卡"),
    r: $data.punching || $data.isGroupChallenge && !$data.trainingCompleted ? 1 : "",
    s: common_vendor.o((...args) => $options.onPunch && $options.onPunch(...args))
  } : {}, {
    t: common_vendor.o((...args) => $options.onViewReport && $options.onViewReport(...args)),
    v: $data.hasJoined && $data.isGroupChallenge && !$data.trainingCompleted && !$data.isTrainingRelatedChallenge
  }, $data.hasJoined && $data.isGroupChallenge && !$data.trainingCompleted && !$data.isTrainingRelatedChallenge ? {} : {}, {
    w: $data.isTrainingRelatedChallenge
  }, $data.isTrainingRelatedChallenge ? {} : {}, {
    x: $data.actionFileUrl
  }, $data.actionFileUrl ? {
    y: $data.actionFileUrl,
    z: common_vendor.o(($event) => $options.previewImage($data.actionFileUrl))
  } : {}, {
    A: $data.report
  }, $data.report ? common_vendor.e({
    B: common_vendor.t($options.formatDateRange($data.report)),
    C: $data.report.participants && $data.report.participants.length > 0
  }, $data.report.participants && $data.report.participants.length > 0 ? {
    D: common_vendor.t($options.avgCompletionRate),
    E: $options.getRateColor($options.avgCompletionRate),
    F: common_vendor.t($options.perfectCount),
    G: common_vendor.t($options.totalPunchDays)
  } : {}, {
    H: common_vendor.t($data.report.participantCount || $data.report.participants && $data.report.participants.length || 0),
    I: common_vendor.t($options.calculateTotalDays),
    J: $data.report.participants && $data.report.participants.length > 0
  }, $data.report.participants && $data.report.participants.length > 0 ? {
    K: common_vendor.f($options.sortedParticipants, (item, index, i0) => {
      return common_vendor.e({
        a: index === 0
      }, index === 0 ? {} : index === 1 ? {} : index === 2 ? {} : {
        d: common_vendor.t(index + 1)
      }, {
        b: index === 1,
        c: index === 2,
        e: common_vendor.t($options.getAvatarText(item.userId)),
        f: common_vendor.t(item.userId),
        g: item.actionFile
      }, item.actionFile ? {
        h: item.actionFile,
        i: common_vendor.o(($event) => $options.previewImage(item.actionFile), index)
      } : {}, {
        j: common_vendor.t(item.punchDays),
        k: item.completionRate + "%",
        l: common_vendor.t(item.completionRate),
        m: index
      });
    })
  } : {}) : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-bec59fb5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/challenge/detail.js.map
