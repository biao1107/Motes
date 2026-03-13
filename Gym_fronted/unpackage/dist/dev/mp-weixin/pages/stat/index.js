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
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/stat/index.vue:122", "加载统计数据失败:", e);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      }
    },
    async loadGroupStats() {
      try {
        const myGroupsRes = await common_api.apiMyGroups();
        const groups = (myGroupsRes == null ? void 0 : myGroupsRes.data) || myGroupsRes || [];
        if (groups && groups.length > 0) {
          const firstGroup = groups[0];
          if (firstGroup && firstGroup.id) {
            const groupRes = await common_api.apiStatGroup({ groupId: firstGroup.id });
            this.group = (groupRes == null ? void 0 : groupRes.data) || groupRes || null;
          }
        }
      } catch (e) {
        common_vendor.index.__f__("log", "at pages/stat/index.vue:143", "获取组统计失败", e);
        this.group = null;
      }
    },
    async loadChallengeStats() {
      try {
        const challengesRes = await common_api.apiChallengeList();
        const challenges = (challengesRes == null ? void 0 : challengesRes.data) || challengesRes || [];
        if (challenges && challenges.length > 0) {
          const firstChallenge = challenges[0];
          if (firstChallenge && firstChallenge.id) {
            const challengeRes = await common_api.apiStatChallenge({ challengeId: firstChallenge.id });
            this.challenge = (challengeRes == null ? void 0 : challengeRes.data) || challengeRes || null;
          }
        }
      } catch (e) {
        common_vendor.index.__f__("log", "at pages/stat/index.vue:161", "获取挑战统计失败", e);
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
      const topEntries = entries.slice(0, 3);
      return topEntries.map(([userId, count]) => `用户${userId}:${count}`).join(", ");
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
