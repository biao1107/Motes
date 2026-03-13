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
    const isMini = common_vendor.ref(false);
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
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/user/setting.vue:117", "加载设置失败:", e);
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
          // 使用当前表单中的档案信息，如果不存在则使用空字符串
          fitnessGoal: ((_a = currentProfileData.value) == null ? void 0 : _a.fitnessGoal) || "",
          trainTime: ((_b = currentProfileData.value) == null ? void 0 : _b.trainTime) || "",
          trainScene: ((_c = currentProfileData.value) == null ? void 0 : _c.trainScene) || "",
          superviseDemand: ((_d = currentProfileData.value) == null ? void 0 : _d.superviseDemand) || "",
          fitnessLevel: ((_e = currentProfileData.value) == null ? void 0 : _e.fitnessLevel) || ""
        };
        await common_api.apiUpdateProfile(profileData);
        common_vendor.index.showToast({ title: "保存成功", icon: "success", duration: 1500 });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/user/setting.vue:149", "保存设置失败:", e);
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
    const goToDebug = () => {
      common_vendor.index.navigateTo({
        url: "/pages/user/debug"
      });
    };
    const selectAvatar = () => {
      common_vendor.index.chooseImage({
        count: 1,
        sourceType: ["album", "camera"],
        sizeType: ["original", "compressed"],
        // 支持压缩，提升上传速度
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
              throw new Error("上传响应中未包含有效的URL");
            }
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/user/setting.vue:205", "头像上传失败:", e);
            common_vendor.index.showToast({ title: e.errMsg || "上传失败", icon: "none" });
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
        a: !isMini.value
      }, !isMini.value ? {} : {}, {
        b: form.value.avatar
      }, form.value.avatar ? {
        c: form.value.avatar
      } : {
        d: common_vendor.t(getInitial(form.value.nickname))
      }, {
        e: common_vendor.o(selectAvatar),
        f: form.value.nickname,
        g: common_vendor.o(($event) => form.value.nickname = $event.detail.value),
        h: common_vendor.t(form.value.phone || "未绑定"),
        i: !form.value.phone
      }, !form.value.phone ? {} : {}, {
        j: common_vendor.o(onLogout),
        k: common_vendor.o(goToDebug),
        l: common_vendor.o(onSave)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-806b15dc"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/setting.js.map
