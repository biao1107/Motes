"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      loaded: false,
      matchResult: []
    };
  },
  computed: {
    hasMatchResult() {
      return Array.isArray(this.matchResult) && this.matchResult.length > 0;
    }
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.loadData();
  },
  methods: {
    async loadData() {
      this.loaded = false;
      try {
        common_vendor.index.showLoading({ title: "匹配中..." });
        const userId = common_auth.getUserIdFromToken();
        if (!userId) {
          this.loaded = true;
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "登录信息异常",
            icon: "none"
          });
          return;
        }
        const res = await common_api.apiGetTopMatch(8);
        this.matchResult = (res == null ? void 0 : res.data) || res || [];
        this.loaded = true;
        common_vendor.index.hideLoading();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/match/index.vue:187", "加载匹配结果失败:", error);
        this.matchResult = [];
        this.loaded = true;
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "匹配失败，请稍后重试",
          icon: "none"
        });
      }
    },
    formatScore(score) {
      const num = Number(score || 0);
      return Math.max(0, Math.min(100, Math.round(num)));
    },
    getAvatarText(item, index) {
      if (item.nickname && item.nickname.length > 0) {
        return item.nickname.charAt(0);
      }
      return `${index + 1}`;
    },
    getMatchReason(item) {
      const reasons = [];
      if (item.goal)
        reasons.push(`目标偏向 ${item.goal}`);
      if (item.preferTime)
        reasons.push(`时间更适合 ${item.preferTime}`);
      if (item.scene)
        reasons.push(`训练场景偏好 ${item.scene}`);
      return reasons.length > 0 ? reasons.join(" · ") : "与你的训练目标和节奏更接近";
    },
    goProfile() {
      common_vendor.index.navigateTo({ url: "/pages/user/profile" });
    },
    goToGroups() {
      common_vendor.index.navigateTo({ url: "/pages/group/index" });
    },
    onAvatarLoadError(error) {
      common_vendor.index.__f__("log", "at pages/match/index.vue:221", "头像加载失败:", error);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_assets._imports_0$1,
    b: common_assets._imports_1,
    c: common_vendor.t($data.matchResult.length),
    d: common_assets._imports_8,
    e: common_vendor.t($data.loaded ? "已生成" : "匹配中"),
    f: !$data.loaded
  }, !$data.loaded ? {} : common_vendor.e({
    g: $options.hasMatchResult
  }, $options.hasMatchResult ? {
    h: common_vendor.t($data.matchResult.length),
    i: common_vendor.f($data.matchResult, (item, index, i0) => {
      return common_vendor.e({
        a: item.avatar && item.avatar.trim()
      }, item.avatar && item.avatar.trim() ? {
        b: item.avatar,
        c: common_vendor.o((...args) => $options.onAvatarLoadError && $options.onAvatarLoadError(...args), item.id || item.userId || index)
      } : {
        d: common_vendor.t($options.getAvatarText(item, index))
      }, {
        e: common_vendor.t(item.nickname || `搭子 ${index + 1}`),
        f: common_vendor.t($options.formatScore(item.score)),
        g: common_vendor.t($options.getMatchReason(item)),
        h: `${$options.formatScore(item.score)}%`,
        i: item.goal
      }, item.goal ? {
        j: common_assets._imports_4$1,
        k: common_vendor.t(item.goal)
      } : {}, {
        l: item.preferTime
      }, item.preferTime ? {
        m: common_assets._imports_1$2,
        n: common_vendor.t(item.preferTime)
      } : {}, {
        o: item.scene
      }, item.scene ? {
        p: common_assets._imports_0$4,
        q: common_vendor.t(item.scene)
      } : {}, {
        r: item.mode
      }, item.mode ? {
        s: common_assets._imports_1$3,
        t: common_vendor.t(item.mode)
      } : {}, {
        v: common_vendor.o((...args) => $options.goProfile && $options.goProfile(...args), item.id || item.userId || index),
        w: common_vendor.o((...args) => $options.goToGroups && $options.goToGroups(...args), item.id || item.userId || index),
        x: item.id || item.userId || index
      });
    }),
    j: common_assets._imports_10,
    k: common_assets._imports_1
  } : {
    l: common_assets._imports_0$1,
    m: common_assets._imports_2$1,
    n: common_vendor.o((...args) => $options.goProfile && $options.goProfile(...args)),
    o: common_assets._imports_9,
    p: common_vendor.o((...args) => $options.loadData && $options.loadData(...args))
  }, {
    q: common_assets._imports_1$1,
    r: common_vendor.o((...args) => $options.loadData && $options.loadData(...args))
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-edf061ca"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/match/index.js.map
