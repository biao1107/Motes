"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_ws = require("../../common/ws.js");
const _sfc_main = {
  __name: "login",
  setup(__props) {
    const loginType = common_vendor.ref("password");
    const formData = common_vendor.ref({
      phone: "",
      password: "",
      code: ""
    });
    const codeCountdown = common_vendor.ref(0);
    const codeTimer = common_vendor.ref(null);
    const activeInput = common_vendor.ref("");
    const safeAreaTop = common_vendor.ref(0);
    common_vendor.onMounted(() => {
      common_vendor.index.getSystemInfo({
        success: (res) => {
          safeAreaTop.value = res.safeArea.top;
        }
      });
    });
    common_vendor.onUnmounted(() => {
      codeTimer.value && clearInterval(codeTimer.value);
    });
    const isValidPhone = common_vendor.computed(() => {
      return /^1[3-9]\d{9}$/.test(formData.value.phone);
    });
    const isCodeBtnDisabled = common_vendor.computed(() => {
      return !formData.value.phone || codeCountdown.value > 0 || !isValidPhone.value;
    });
    const codeBtnText = common_vendor.computed(() => {
      return codeCountdown.value > 0 ? `${codeCountdown.value}s后重试` : "获取验证码";
    });
    const getUserIdFromToken = (token) => {
      if (!token)
        return null;
      try {
        const parts = token.split(".");
        if (parts.length < 2)
          return null;
        const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))));
        return payload.sub ? Number(payload.sub) : null;
      } catch (e) {
        return null;
      }
    };
    const switchLoginType = (type) => {
      loginType.value = type;
      if (type === "password") {
        formData.value.code = "";
      } else {
        formData.value.password = "";
      }
    };
    const setActiveInput = (inputName) => {
      activeInput.value = inputName;
    };
    const clearActiveInput = () => {
      activeInput.value = "";
    };
    const validateForm = () => {
      if (!formData.value.phone) {
        common_vendor.index.showToast({ title: "请输入手机号", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (!isValidPhone.value) {
        common_vendor.index.showToast({ title: "请输入正确的手机号", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (loginType.value === "password" && !formData.value.password) {
        common_vendor.index.showToast({ title: "请输入密码", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (loginType.value === "code" && !formData.value.code) {
        common_vendor.index.showToast({ title: "请输入验证码", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      return true;
    };
    const sendVerificationCode = async () => {
      try {
        common_vendor.index.showLoading({ title: "发送中...", mask: true });
        await common_api.apiSendCode({ phone: formData.value.phone });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "验证码已发送", icon: "success", duration: 1500, mask: true });
        codeCountdown.value = 60;
        codeTimer.value && clearInterval(codeTimer.value);
        codeTimer.value = setInterval(() => {
          if (codeCountdown.value <= 1) {
            clearInterval(codeTimer.value);
            codeTimer.value = null;
            codeCountdown.value = 0;
          } else {
            codeCountdown.value--;
          }
        }, 1e3);
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/auth/login.vue:259", "发送验证码失败:", error);
        const errMsg = (error == null ? void 0 : error.msg) || (error == null ? void 0 : error.message) || "发送失败，请重试";
        common_vendor.index.showToast({ title: errMsg, icon: "none", duration: 2e3, mask: true });
      }
    };
    const handleLogin = async () => {
      if (!validateForm())
        return;
      try {
        common_vendor.index.showLoading({ title: "登录中...", mask: true });
        let token;
        if (loginType.value === "password") {
          token = await common_api.apiLoginByPassword({
            phone: formData.value.phone,
            password: formData.value.password
          });
        } else {
          token = await common_api.apiLoginByCode({
            phone: formData.value.phone,
            code: formData.value.code
          });
        }
        if (token) {
          common_auth.setToken(token);
          let userInfo = null;
          let userStats = null;
          try {
            const [userResponse, statsResponse] = await Promise.all([
              common_api.apiGetUserInfo(),
              common_api.apiStatPersonal()
            ]);
            userInfo = userResponse.data || {
              id: getUserIdFromToken(token),
              nickname: "用户" + getUserIdFromToken(token)
            };
            userStats = statsResponse.data || { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
            common_auth.setUserInfo(userInfo);
            common_vendor.index.setStorageSync("temp_user_data", {
              profile: userResponse.data || userInfo,
              stats: userStats
            });
          } catch (e) {
            userInfo = {
              id: getUserIdFromToken(token),
              nickname: "用户" + getUserIdFromToken(token)
            };
            userStats = { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
            common_auth.setUserInfo(userInfo);
            common_vendor.index.__f__("error", "at pages/auth/login.vue:321", "获取用户信息失败:", e);
          }
          try {
            await common_ws.initWebSocket();
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/auth/login.vue:328", "WebSocket初始化失败:", e);
          }
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "登录成功", icon: "success", duration: 1500, mask: true });
          setTimeout(() => {
            common_vendor.index.reLaunch({ url: "/pages/index/index" });
          }, 500);
        } else {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "登录失败", icon: "none", duration: 2e3, mask: true });
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/auth/login.vue:345", "登录失败:", error);
        const errMsg = (error == null ? void 0 : error.msg) || (error == null ? void 0 : error.message) || "登录失败，请重试";
        common_vendor.index.showToast({ title: errMsg, icon: "none", duration: 2e3, mask: true });
      }
    };
    const goToRegister = () => {
      common_vendor.index.navigateTo({ url: "/pages/auth/register" });
    };
    const viewTerms = () => {
      common_vendor.index.showModal({
        title: "用户协议",
        content: "【健身搭子】用户协议：\n1. 您承诺使用本服务时遵守相关法律法规；\n2. 您授权我们收集必要的健身数据用于匹配搭子；\n3. 您需对自己的账号安全负责；\n4. 平台有权根据运营需要调整服务规则。",
        showCancel: false,
        confirmText: "我已阅读并同意",
        confirmColor: "#6378f6"
      });
    };
    const viewPrivacy = () => {
      common_vendor.index.showModal({
        title: "隐私政策",
        content: "【健身搭子】隐私政策：\n1. 我们仅收集必要的个人信息用于服务提供；\n2. 您的健身数据仅用于匹配搭子，不会泄露给第三方；\n3. 您可随时删除自己的个人数据；\n4. 我们采用加密方式保护您的信息安全。",
        showCancel: false,
        confirmText: "我已阅读并同意",
        confirmColor: "#6378f6"
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_assets._imports_0,
        b: common_vendor.n(loginType.value === "password" ? "active" : ""),
        c: common_vendor.o(($event) => switchLoginType("password")),
        d: common_vendor.n(loginType.value === "code" ? "active" : ""),
        e: common_vendor.o(($event) => switchLoginType("code")),
        f: common_vendor.o(($event) => setActiveInput("phone")),
        g: common_vendor.o(clearActiveInput),
        h: formData.value.phone,
        i: common_vendor.o(($event) => formData.value.phone = $event.detail.value),
        j: activeInput.value === "phone" ? 1 : "",
        k: loginType.value === "password"
      }, loginType.value === "password" ? {
        l: common_vendor.o(($event) => setActiveInput("password")),
        m: common_vendor.o(clearActiveInput),
        n: formData.value.password,
        o: common_vendor.o(($event) => formData.value.password = $event.detail.value),
        p: activeInput.value === "password" ? 1 : ""
      } : {
        q: common_vendor.o(($event) => setActiveInput("code")),
        r: common_vendor.o(clearActiveInput),
        s: formData.value.code,
        t: common_vendor.o(($event) => formData.value.code = $event.detail.value),
        v: activeInput.value === "code" ? 1 : "",
        w: common_vendor.t(codeBtnText.value),
        x: isCodeBtnDisabled.value ? 1 : "",
        y: isCodeBtnDisabled.value,
        z: common_vendor.o(sendVerificationCode)
      }, {
        A: common_vendor.o(handleLogin),
        B: common_vendor.o(goToRegister),
        C: common_vendor.o(viewTerms),
        D: common_vendor.o(viewPrivacy),
        E: safeAreaTop.value + "px"
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-2cc9f8c3"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/auth/login.js.map
