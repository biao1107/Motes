"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      loaded: false,
      matchResult: null
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
        common_vendor.index.showLoading({ title: "匹配中..." });
        const userId = common_auth.getUserIdFromToken();
        if (!userId) {
          common_vendor.index.__f__("error", "at pages/match/index.vue:97", "无法获取用户ID");
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
      } catch (e) {
        common_vendor.index.hideLoading();
        this.loaded = true;
        common_vendor.index.showToast({
          title: "匹配失败，请重试",
          icon: "none"
        });
      }
    },
    goProfile() {
      common_vendor.index.navigateTo({ url: "/pages/user/profile" });
    },
    onAvatarLoadError(e) {
      common_vendor.index.__f__("log", "at pages/match/index.vue:125", "头像加载失败:", e);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loaded
  }, $data.loaded ? common_vendor.e({
    b: $data.matchResult && $data.matchResult.length > 0
  }, $data.matchResult && $data.matchResult.length > 0 ? {
    c: common_vendor.t($data.matchResult ? $data.matchResult.length : 0),
    d: common_vendor.f($data.matchResult, (item, index, i0) => {
      return common_vendor.e({
        a: item.avatar && item.avatar.trim() !== ""
      }, item.avatar && item.avatar.trim() !== "" ? {
        b: item.avatar,
        c: common_vendor.o((...args) => $options.onAvatarLoadError && $options.onAvatarLoadError(...args), index)
      } : {
        d: common_vendor.t(item.nickname ? item.nickname.charAt(0) : "#")
      }, {
        e: common_vendor.t(item.nickname || "搭子 " + (index + 1)),
        f: common_vendor.t(item.score || 0),
        g: (item.score || 0) + "%",
        h: item.mode
      }, item.mode ? {
        i: common_vendor.t(item.mode)
      } : {}, {
        j: item.goal
      }, item.goal ? {
        k: common_vendor.t(item.goal)
      } : {}, {
        l: item.preferTime
      }, item.preferTime ? {
        m: common_vendor.t(item.preferTime)
      } : {}, {
        n: item.scene
      }, item.scene ? {
        o: common_vendor.t(item.scene)
      } : {}, {
        p: index
      });
    })
  } : {
    e: common_vendor.o((...args) => $options.goProfile && $options.goProfile(...args))
  }, {
    f: common_vendor.o((...args) => $options.loadData && $options.loadData(...args))
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-edf061ca"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/match/index.js.map
