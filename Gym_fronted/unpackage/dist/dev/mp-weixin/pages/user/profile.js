"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  __name: "profile",
  setup(__props, { expose: __expose }) {
    const loaded = common_vendor.ref(false);
    const form = common_vendor.ref({
      id: null,
      phone: "",
      nickname: "",
      fitnessGoal: "",
      trainTime: "",
      trainScene: "",
      superviseDemand: "",
      fitnessLevel: ""
    });
    const getInitial = (nickname) => {
      if (!nickname)
        return "?";
      return nickname.charAt(0).toUpperCase();
    };
    const loadData = async () => {
      try {
        common_vendor.index.showLoading({ title: "加载中...", mask: true });
        const data = await common_api.apiGetProfile();
        form.value = Object.assign({}, form.value, data || {});
        loaded.value = true;
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:155", "加载用户档案失败:", e);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
        loaded.value = true;
      } finally {
        common_vendor.index.hideLoading();
      }
    };
    const onSave = async () => {
      if (!form.value.fitnessGoal || !form.value.trainTime || !form.value.trainScene) {
        common_vendor.index.showToast({ title: "请填写标*的必填项", icon: "none", duration: 2e3 });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "保存中...", mask: true });
        await common_api.apiUpdateProfile({
          fitnessGoal: form.value.fitnessGoal,
          trainTime: form.value.trainTime,
          trainScene: form.value.trainScene,
          superviseDemand: form.value.superviseDemand,
          fitnessLevel: form.value.fitnessLevel,
          nickname: form.value.nickname
        });
        common_vendor.index.showToast({ title: "保存成功", icon: "success", duration: 1500 });
        setTimeout(() => {
          getCurrentPages().length > 1 ? common_vendor.index.navigateBack() : loadData();
        }, 1500);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:186", "保存用户档案失败:", e);
        common_vendor.index.showToast({ title: "保存失败，请重试", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    };
    common_vendor.onMounted(() => {
      if (!common_auth.requireLogin())
        return;
      loadData();
    });
    const onShow = () => {
      if (!common_auth.requireLogin())
        return;
      loadData();
    };
    __expose({
      onShow
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: loaded.value
      }, loaded.value ? {
        b: common_vendor.t(getInitial(form.value.nickname)),
        c: common_vendor.t(form.value.nickname || "未设置昵称"),
        d: common_vendor.t(form.value.phone),
        e: form.value.nickname,
        f: common_vendor.o(($event) => form.value.nickname = $event.detail.value),
        g: form.value.fitnessGoal,
        h: common_vendor.o(($event) => form.value.fitnessGoal = $event.detail.value),
        i: form.value.trainTime,
        j: common_vendor.o(($event) => form.value.trainTime = $event.detail.value),
        k: form.value.trainScene,
        l: common_vendor.o(($event) => form.value.trainScene = $event.detail.value),
        m: form.value.superviseDemand,
        n: common_vendor.o(($event) => form.value.superviseDemand = $event.detail.value),
        o: form.value.fitnessLevel,
        p: common_vendor.o(($event) => form.value.fitnessLevel = $event.detail.value),
        q: common_vendor.o(onSave)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-036958a5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/profile.js.map
