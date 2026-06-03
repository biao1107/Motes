"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  __name: "setting",
  setup(__props, { expose: __expose }) {
    const form = common_vendor.ref({
      nickname: "",
      avatar: "",
      phone: ""
    });
    const currentProfileData = common_vendor.ref(null);
    const getInitial = (nickname) => {
      if (!nickname || !nickname.trim())
        return "?";
      return nickname.trim().charAt(0).toUpperCase();
    };
    const loadData = async () => {
      try {
        common_vendor.index.showLoading({ title: "加载中...", mask: true });
        const data = await common_api.apiGetProfile();
        form.value = {
          nickname: data.nickname || "",
          avatar: data.avatar || "",
          phone: data.phone || ""
        };
        currentProfileData.value = data;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/setting.vue:102", "加载设置失败:", error);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    };
    const onSave = async () => {
      var _a, _b, _c, _d, _e;
      const nickname = form.value.nickname.trim();
      if (!nickname) {
        common_vendor.index.showToast({ title: "请输入有效的用户名", icon: "none", duration: 2e3 });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "保存中...", mask: true });
        const profileData = {
          nickname,
          avatar: form.value.avatar,
          fitnessGoal: ((_a = currentProfileData.value) == null ? void 0 : _a.fitnessGoal) || "",
          trainTime: ((_b = currentProfileData.value) == null ? void 0 : _b.trainTime) || "",
          trainScene: ((_c = currentProfileData.value) == null ? void 0 : _c.trainScene) || "",
          superviseDemand: ((_d = currentProfileData.value) == null ? void 0 : _d.superviseDemand) || "",
          fitnessLevel: ((_e = currentProfileData.value) == null ? void 0 : _e.fitnessLevel) || ""
        };
        await common_api.apiUpdateProfile(profileData);
        common_vendor.index.showToast({ title: "保存成功", icon: "success", duration: 1500 });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/setting.vue:131", "保存设置失败:", error);
        common_vendor.index.showToast({ title: "保存失败，请重试", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    };
    const onLogout = () => {
      common_vendor.index.showModal({
        title: "确认退出",
        content: "退出后将需要重新登录，确定吗？",
        confirmText: "退出",
        cancelText: "取消",
        confirmColor: "#F53F3F",
        success: (res) => {
          if (res.confirm) {
            common_auth.clearToken();
            common_vendor.index.reLaunch({ url: "/pages/auth/login" });
          }
        }
      });
    };
    const selectAvatar = () => {
      common_vendor.index.chooseImage({
        count: 1,
        sourceType: ["album", "camera"],
        sizeType: ["original", "compressed"],
        success: async (res) => {
          try {
            common_vendor.index.showLoading({ title: "上传中...", mask: true });
            const uploadRes = await common_api.apiUploadAvatar(res.tempFilePaths[0]);
            let avatarUrl = "";
            if (uploadRes && typeof uploadRes === "object") {
              avatarUrl = uploadRes.data ? typeof uploadRes.data === "string" ? uploadRes.data : uploadRes.data.url || uploadRes.data : JSON.stringify(uploadRes);
            } else {
              avatarUrl = uploadRes || "";
            }
            if (avatarUrl) {
              form.value.avatar = avatarUrl;
              common_vendor.index.showToast({ title: "头像更新成功", icon: "success" });
            } else {
              throw new Error("上传响应中未包含有效的 URL");
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/user/setting.vue:182", "头像上传失败:", error);
            common_vendor.index.showToast({ title: error.errMsg || "上传失败", icon: "none" });
          } finally {
            common_vendor.index.hideLoading();
          }
        },
        fail: () => {
          common_vendor.index.showToast({ title: "取消选择", icon: "none", duration: 1e3 });
        }
      });
    };
    common_vendor.onMounted(() => {
      if (!common_auth.requireLogin())
        return;
      loadData();
    });
    const onLoad = () => {
      if (!common_auth.requireLogin())
        return;
      loadData();
    };
    __expose({
      onLoad
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: form.value.avatar
      }, form.value.avatar ? {
        b: form.value.avatar
      } : {
        c: common_vendor.t(getInitial(form.value.nickname))
      }, {
        d: common_vendor.o(selectAvatar),
        e: form.value.nickname,
        f: common_vendor.o(($event) => form.value.nickname = $event.detail.value),
        g: common_vendor.t(form.value.phone || "未绑定"),
        h: common_vendor.o(onSave),
        i: common_vendor.o(onLogout)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-806b15dc"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/setting.js.map
