"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const common_api = require("../../common/api.js");
const _sfc_main = {
  __name: "register",
  setup(__props) {
    const form = common_vendor.ref({
      phone: "",
      nickname: "",
      password: "",
      confirmPassword: ""
    });
    const activeInput = common_vendor.ref("");
    const safeAreaTop = common_vendor.ref(0);
    common_vendor.onMounted(() => {
      common_vendor.index.getSystemInfo({
        success: (res) => {
          safeAreaTop.value = res.safeArea.top;
        }
      });
    });
    const setActiveInput = (inputName) => {
      activeInput.value = inputName;
    };
    const clearActiveInput = () => {
      activeInput.value = "";
    };
    const validateForm = () => {
      if (!form.value.phone) {
        common_vendor.index.showToast({ title: "请输入手机号", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
        common_vendor.index.showToast({ title: "请输入正确的 11 位手机号", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (!form.value.nickname) {
        common_vendor.index.showToast({ title: "请输入昵称", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      const nickname = form.value.nickname.trim();
      const regNick = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,12}$/;
      if (!regNick.test(nickname)) {
        common_vendor.index.showToast({ title: "昵称仅支持 2-12 位中英文/数字/下划线", icon: "none", duration: 2500, mask: true });
        return false;
      }
      if (!form.value.password) {
        common_vendor.index.showToast({ title: "请设置密码", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (form.value.password.includes(" ")) {
        common_vendor.index.showToast({ title: "密码不可包含空格", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (form.value.password.length < 6 || form.value.password.length > 16) {
        common_vendor.index.showToast({ title: "密码需为 6-16 位字符", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      if (form.value.password !== form.value.confirmPassword) {
        common_vendor.index.showToast({ title: "两次输入的密码不一致", icon: "none", duration: 2e3, mask: true });
        return false;
      }
      return true;
    };
    const onSubmit = async () => {
      var _a;
      if (!validateForm())
        return;
      try {
        common_vendor.index.showLoading({ title: "注册中...", mask: true });
        await common_api.apiRegister({
          phone: form.value.phone,
          password: form.value.password,
          nickname: form.value.nickname.trim()
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "注册成功", icon: "success", duration: 1500, mask: true });
        setTimeout(() => {
          common_vendor.index.redirectTo({ url: "/pages/auth/login" });
        }, 800);
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/auth/register.vue:215", "注册失败：", error);
        const errMsg = (error == null ? void 0 : error.msg) || (error == null ? void 0 : error.message) || ((_a = error == null ? void 0 : error.data) == null ? void 0 : _a.msg) || "注册失败，请稍后重试";
        common_vendor.index.showToast({ title: errMsg, icon: "none", duration: 2500, mask: true });
      }
    };
    const goToLogin = () => {
      common_vendor.index.redirectTo({ url: "/pages/auth/login" });
    };
    const viewTerms = () => {
      common_vendor.index.showModal({
        title: "用户注册协议",
        content: "注册并使用本平台，即表示你同意遵守平台规则，并授权我们在合法范围内使用必要信息完成健身搭子匹配与训练协作服务。",
        showCancel: false,
        confirmText: "我已阅读并同意",
        confirmColor: "#6378f6"
      });
    };
    const viewPrivacy = () => {
      common_vendor.index.showModal({
        title: "隐私政策",
        content: "我们仅收集完成服务所需的必要信息，并通过加密存储等方式保障你的个人数据安全，不会擅自向第三方泄露。",
        showCancel: false,
        confirmText: "我已阅读并同意",
        confirmColor: "#6378f6"
      });
    };
    return (_ctx, _cache) => {
      return {
        a: common_assets._imports_0,
        b: common_vendor.o(($event) => setActiveInput("phone")),
        c: common_vendor.o(clearActiveInput),
        d: form.value.phone,
        e: common_vendor.o(($event) => form.value.phone = $event.detail.value),
        f: activeInput.value === "phone" ? 1 : "",
        g: common_vendor.o(($event) => setActiveInput("nickname")),
        h: common_vendor.o(clearActiveInput),
        i: form.value.nickname,
        j: common_vendor.o(($event) => form.value.nickname = $event.detail.value),
        k: activeInput.value === "nickname" ? 1 : "",
        l: common_vendor.o(($event) => setActiveInput("password")),
        m: common_vendor.o(clearActiveInput),
        n: form.value.password,
        o: common_vendor.o(($event) => form.value.password = $event.detail.value),
        p: activeInput.value === "password" ? 1 : "",
        q: common_vendor.o(($event) => setActiveInput("confirmPassword")),
        r: common_vendor.o(clearActiveInput),
        s: form.value.confirmPassword,
        t: common_vendor.o(($event) => form.value.confirmPassword = $event.detail.value),
        v: activeInput.value === "confirmPassword" ? 1 : "",
        w: common_vendor.o(onSubmit),
        x: common_vendor.o(goToLogin),
        y: common_vendor.o(viewTerms),
        z: common_vendor.o(viewPrivacy),
        A: safeAreaTop.value + "px"
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-4bb68961"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/auth/register.js.map
