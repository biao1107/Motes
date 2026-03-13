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
      //定时检查训练状态
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
    // 按完成率排序的参与者列表（用于排行榜）
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
    // 计算平均完成率
    avgCompletionRate() {
      if (!this.report || !this.report.participants || this.report.participants.length === 0) {
        return 0;
      }
      const total = this.report.participants.reduce((sum, p) => sum + p.completionRate, 0);
      return Math.round(total / this.report.participants.length);
    },
    // 计算全勤人数（完成率100%）
    perfectCount() {
      if (!this.report || !this.report.participants)
        return 0;
      return this.report.participants.filter((p) => p.completionRate >= 100).length;
    },
    // 计算总打卡次数
    totalPunchDays() {
      if (!this.report || !this.report.participants)
        return 0;
      return this.report.participants.reduce((sum, p) => sum + p.punchDays, 0);
    },
    // 计算挑战总天数
    calculateTotalDays() {
      if (!this.report || !this.report.startDate || !this.report.endDate)
        return 0;
      const start = new Date(this.report.startDate);
      const end = new Date(this.report.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
  },
  methods: {
    // 格式化日期范围显示
    formatDateRange(report) {
      if (!report)
        return "";
      const start = report.startDate || this.detail.startDate;
      const end = report.endDate || this.detail.endDate;
      if (!start || !end)
        return "";
      return `${start} 至 ${end}`;
    },
    // 根据完成率返回颜色
    getRateColor(rate) {
      if (rate >= 80)
        return "#52c41a";
      if (rate >= 60)
        return "#faad14";
      return "#ff4d4f";
    },
    // 预览打卡图片
    previewImage(url) {
      if (!url)
        return;
      common_vendor.index.previewImage({
        urls: [url],
        current: url
      });
    },
    // 获取用户头像文字（取用户ID的最后两位）
    getAvatarText(userId) {
      if (!userId)
        return "?";
      const str = userId.toString();
      return str.slice(-2);
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
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:306", "加载挑战详情失败:", e);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
        this.loaded = true;
      }
    },
    // 检查用户是否参与了挑战
    async checkParticipation() {
      try {
        if (!common_auth.requireLogin())
          return;
        const res = await common_api.apiCheckChallengeParticipation(this.id);
        this.hasJoined = (res == null ? void 0 : res.data) ?? res ?? false;
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:320", "检查参与状态失败:", e);
        this.hasJoined = false;
      }
    },
    async loadPunchRecord() {
      try {
        if (!common_auth.requireLogin())
          return;
        const now = /* @__PURE__ */ new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:337", "获取打卡记录失败:", e);
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
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const res = await common_api.apiGetTodayTraining();
        const todayTrainings = (res == null ? void 0 : res.data) || res || [];
        const completedTraining = todayTrainings.some(
          (record) => record.status === 1 && //状态为已完成
          record.trainDate === date
          // 日期为今天
        );
        this.trainingCompleted = completedTraining;
        if (!completedTraining && this.isGroupChallenge) {
          common_vendor.index.__f__("log", "at pages/challenge/detail.vue:369", "组内挑战：用户今日训练未完成，无法打卡");
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:372", "检查训练完成状态失败:", e);
        this.trainingCompleted = false;
      }
    },
    //启动定时检查训练状态
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
    //停止定时检查
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
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:423", "参与挑战失败:", e);
        if (e.message && e.message.includes("已参与该挑战")) {
          common_vendor.index.showToast({ title: "您已参与该挑战", icon: "none" });
        } else {
          common_vendor.index.showToast({ title: e.errMsg || "参与失败，请重试", icon: "none" });
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
              const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
            } catch (e) {
              common_vendor.index.hideLoading();
              common_vendor.index.__f__("error", "at pages/challenge/detail.vue:491", "打卡失败:", e);
              common_vendor.index.showToast({ title: e.errMsg || "打卡失败，请重试", icon: "none" });
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
      var self = this;
      common_vendor.index.showLoading({ title: "加载中..." });
      common_api.apiChallengeReport(self.id).then(function(res) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("log", "at pages/challenge/detail.vue:512", "报告数据:", JSON.stringify(res));
        self.report = res || {};
        common_vendor.index.showToast({ title: "加载成功", icon: "success" });
      }).catch(function(err) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/challenge/detail.vue:517", "错误:", err);
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
    e: common_vendor.t($data.detail.id),
    f: $data.detail.status !== void 0
  }, $data.detail.status !== void 0 ? {
    g: common_vendor.t(["未开始", "进行中", "已结束"][$data.detail.status] || $data.detail.status)
  } : {}, {
    h: common_vendor.t($data.isGroupChallenge ? "组内挑战" : "公开挑战"),
    i: $data.detail.startDate
  }, $data.detail.startDate ? {
    j: common_vendor.t($data.detail.startDate)
  } : {}, {
    k: $data.detail.endDate
  }, $data.detail.endDate ? {
    l: common_vendor.t($data.detail.endDate)
  } : {}, {
    m: $data.detail.maxMembers
  }, $data.detail.maxMembers ? {
    n: common_vendor.t($data.detail.maxMembers)
  } : {}, {
    o: $data.detail.trainRequire
  }, $data.detail.trainRequire ? {
    p: common_vendor.t($data.detail.trainRequire)
  } : {}, {
    q: !$data.hasJoined
  }, !$data.hasJoined ? {
    r: common_vendor.o((...args) => $options.onJoin && $options.onJoin(...args)),
    s: $data.joining
  } : {}, {
    t: $data.hasJoined && !$data.isTrainingRelatedChallenge
  }, $data.hasJoined && !$data.isTrainingRelatedChallenge ? {
    v: common_vendor.o((...args) => $options.onPunch && $options.onPunch(...args)),
    w: $data.punching || $data.isGroupChallenge && !$data.trainingCompleted
  } : {}, {
    x: $data.hasJoined && $data.isGroupChallenge && !$data.trainingCompleted && !$data.isTrainingRelatedChallenge
  }, $data.hasJoined && $data.isGroupChallenge && !$data.trainingCompleted && !$data.isTrainingRelatedChallenge ? {} : {}, {
    y: $data.isTrainingRelatedChallenge
  }, $data.isTrainingRelatedChallenge ? {} : {}, {
    z: common_vendor.o((...args) => $options.onViewReport && $options.onViewReport(...args)),
    A: $data.actionFileUrl
  }, $data.actionFileUrl ? {
    B: $data.actionFileUrl
  } : {}, {
    C: $data.report
  }, $data.report ? common_vendor.e({
    D: common_vendor.t($data.report.challengeName || $data.detail.challengeName),
    E: common_vendor.t($options.formatDateRange($data.report)),
    F: $data.report.participants && $data.report.participants.length > 0
  }, $data.report.participants && $data.report.participants.length > 0 ? {
    G: common_vendor.t($options.avgCompletionRate),
    H: $options.getRateColor($options.avgCompletionRate),
    I: $options.avgCompletionRate + "%",
    J: $options.getRateColor($options.avgCompletionRate),
    K: common_vendor.t($options.perfectCount),
    L: common_vendor.t($options.totalPunchDays)
  } : {}, {
    M: common_vendor.t($data.report.participantCount || $data.report.participants && $data.report.participants.length || 0),
    N: common_vendor.t($options.calculateTotalDays),
    O: $data.report.participants && $data.report.participants.length > 0
  }, $data.report.participants && $data.report.participants.length > 0 ? {
    P: common_vendor.t($data.report.participants.length),
    Q: common_vendor.f($options.sortedParticipants, (item, index, i0) => {
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
        m: index,
        n: index < 3 ? 1 : ""
      });
    })
  } : {}) : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-bec59fb5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/challenge/detail.js.map
