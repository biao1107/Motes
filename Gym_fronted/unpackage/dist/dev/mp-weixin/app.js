"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
require("./common/ws.js");
if (!Math) {
  "./pages/auth/login.js";
  "./pages/index/index.js";
  "./pages/auth/register.js";
  "./pages/user/profile.js";
  "./pages/user/setting.js";
  "./pages/match/index.js";
  "./pages/group/index.js";
  "./pages/group/detail.js";
  "./pages/group/chat.js";
  "./pages/group/messages.js";
  "./pages/training/index.js";
  "./pages/training/today.js";
  "./pages/challenge/index.js";
  "./pages/challenge/detail.js";
  "./pages/stat/index.js";
  "./pages/course/index.js";
  "./pages/course/detail.js";
}
const _sfc_main = {
  /**
   * 应用启动生命周期
   * 在小程序初始化完成时触发（全局只触发一次）
   */
  onLaunch() {
    common_vendor.index.__f__("log", "at App.vue:24", "App Launch");
  },
  /**
   * 应用显示生命周期
   * 小程序启动，或从后台进入前台显示时触发
   */
  onShow() {
    common_vendor.index.__f__("log", "at App.vue:32", "App Show");
  },
  /**
   * 应用隐藏生命周期
   * 小程序从前台进入后台时触发
   */
  onHide() {
    common_vendor.index.__f__("log", "at App.vue:40", "App Hide");
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
