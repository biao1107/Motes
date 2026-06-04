"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      personal: null,
      group: null,
      challenge: null
    };
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const personalRes = await common_api.apiStatPersonal();
        this.personal = (personalRes == null ? void 0 : personalRes.data) || personalRes || null;
        await this.loadGroupStats();
        await this.loadChallengeStats();
        common_vendor.index.hideLoading();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/stat/index.vue:156", "加载统计数据失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      }
    },
    async loadGroupStats() {
      var _a;
      try {
        const myGroupsRes = await common_api.apiMyGroups();
        const groups = (myGroupsRes == null ? void 0 : myGroupsRes.data) || myGroupsRes || [];
        if (groups.length > 0 && ((_a = groups[0]) == null ? void 0 : _a.id)) {
          const groupRes = await common_api.apiStatGroup({ groupId: groups[0].id });
          this.group = (groupRes == null ? void 0 : groupRes.data) || groupRes || null;
        } else {
          this.group = null;
        }
      } catch (error) {
        common_vendor.index.__f__("log", "at pages/stat/index.vue:175", "获取组统计失败:", error);
        this.group = null;
      }
    },
    async loadChallengeStats() {
      var _a;
      try {
        const challengeRes = await common_api.apiChallengeList();
        const challenges = (challengeRes == null ? void 0 : challengeRes.data) || challengeRes || [];
        if (challenges.length > 0 && ((_a = challenges[0]) == null ? void 0 : _a.id)) {
          const statsRes = await common_api.apiStatChallenge({ challengeId: challenges[0].id });
          this.challenge = (statsRes == null ? void 0 : statsRes.data) || statsRes || null;
        } else {
          this.challenge = null;
        }
      } catch (error) {
        common_vendor.index.__f__("log", "at pages/stat/index.vue:191", "获取挑战统计失败:", error);
        this.challenge = null;
      }
    },
    formatMemberRanking(ranking) {
      if (!ranking || typeof ranking !== "object") {
        return "-";
      }
      const entries = Object.entries(ranking).sort(([, a], [, b]) => b - a);
      if (entries.length === 0) {
        return "-";
      }
      return entries.slice(0, 3).map(([userId, count], index) => `TOP${index + 1} 用户${userId} · ${count}次`).join(" / ");
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.personal
  }, !$data.personal ? {} : {
    b: common_vendor.t($data.personal.totalTrainCount),
    c: common_vendor.t($data.personal.completedCount),
    d: common_vendor.t($data.personal.completionRate),
    e: common_vendor.t($data.personal.avgScore),
    f: common_vendor.t($data.personal.collaborativeCount)
  }, {
    g: !$data.group
  }, !$data.group ? {} : {
    h: common_vendor.t($data.group.groupMemberCount),
    i: common_vendor.t($data.group.totalTrainCount),
    j: common_vendor.t($data.group.completedCount),
    k: common_vendor.t($data.group.completionRate),
    l: common_vendor.t($options.formatMemberRanking($data.group.memberRanking))
  }, {
    m: !$data.challenge
  }, !$data.challenge ? {} : {
    n: common_vendor.t($data.challenge.participantCount),
    o: common_vendor.t($data.challenge.totalPunchDays),
    p: common_vendor.t($data.challenge.avgPunchDays),
    q: common_vendor.t($data.challenge.completedCount)
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-71b48efc"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/stat/index.js.map
