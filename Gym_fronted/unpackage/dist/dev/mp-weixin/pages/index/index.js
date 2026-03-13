"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const common_wsNative = require("../../common/ws-native.js");
const common_auth = require("../../common/auth.js");
const common_api = require("../../common/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    const userProfile = common_vendor.ref({});
    const stats = common_vendor.ref({});
    const showProfile = common_vendor.ref(false);
    const isLoading = common_vendor.ref(false);
    const unreadCount = common_vendor.ref(0);
    const inviteCount = common_vendor.ref(0);
    const msgAni = common_vendor.ref(null);
    const hasTodo = common_vendor.ref(false);
    const todoCount = common_vendor.ref(0);
    const dataList = common_vendor.ref([]);
    common_vendor.ref(null);
    const checkLoginStatus = () => {
      const isLoggedIn = common_auth.requireLogin();
      if (!isLoggedIn) {
        common_vendor.index.redirectTo({ url: "/pages/auth/login" });
      }
    };
    const refreshUserData = async (userData = null) => {
      isLoading.value = true;
      try {
        let profileRes, statsRes;
        if (userData) {
          profileRes = userData.profile || await common_api.apiGetProfile();
          statsRes = userData.stats || await common_api.apiStatHome();
        } else {
          [profileRes, statsRes] = await Promise.all([
            common_api.apiGetProfile(),
            common_api.apiStatHome()
          ]);
        }
        userProfile.value = (profileRes == null ? void 0 : profileRes.data) || profileRes || {};
        stats.value = (statsRes == null ? void 0 : statsRes.data) || statsRes || { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        formatDataList();
        if (!userData) {
          common_vendor.index.showToast({ title: "数据刷新成功", icon: "success", duration: 1e3 });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:231", "数据刷新失败:", error);
        common_vendor.index.showToast({ title: "数据加载失败", icon: "none", duration: 1500 });
        stats.value = { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        formatDataList();
      } finally {
        isLoading.value = false;
      }
    };
    const formatDataList = () => {
      dataList.value = [
        {
          value: stats.value.trainDays || 0,
          label: "累计训练",
          trend: null
          // 暂无趋势数据
        },
        {
          value: stats.value.partnersCount || 0,
          label: "健身搭子",
          trend: null
          // 暂无趋势数据
        },
        {
          value: stats.value.activeChallenges || 0,
          label: "进行中挑战",
          trend: null
          // 暂无趋势数据
        }
      ];
    };
    const initWS = async () => {
      try {
        await common_wsNative.initNativeWebSocket();
        common_wsNative.setMessageCallback(handleMessage);
        common_vendor.index.__f__("log", "at pages/index/index.vue:269", "首页 WebSocket 初始化成功");
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:271", "WS初始化失败:", e);
      }
    };
    const handleMessage = (payload) => {
      var _a;
      const msgType = payload.type || ((_a = payload.data) == null ? void 0 : _a.type);
      switch (msgType) {
        case "INVITATION":
          handleInvite(payload.data || payload);
          break;
        case "CHAT":
          unreadCount.value += 1;
          msgShake();
          break;
        case "NOTIFICATION":
          msgShake();
          common_vendor.index.showToast({ title: payload.message || "收到新通知", icon: "none" });
          break;
        default:
          msgShake();
          break;
      }
    };
    const msgShake = () => {
      if (msgAni.value) {
        msgAni.value.scale(1.3).step();
        msgAni.value.scale(1).step();
      }
    };
    const handleInvite = (payload) => {
      const fromName = payload.fromUserName || "未知好友";
      const groupName = payload.groupName || "健身搭子组";
      msgShake();
      common_vendor.index.showModal({
        title: "新的搭子邀请",
        content: `${fromName}邀请你加入 ${groupName}，是否接受？`,
        confirmText: "接受",
        cancelText: "拒绝",
        async success(res) {
          if (res.confirm) {
            await acceptInvite(payload.fromUserId);
          }
        }
      });
    };
    const acceptInvite = async (inviterId) => {
      if (!inviterId || !common_auth.getUserIdFromToken())
        return;
      try {
        await common_api.apiAcceptInvite({
          userId: common_auth.getUserIdFromToken(),
          invitationId: inviterId
        });
        common_vendor.index.showToast({ title: "已成为健身搭子", icon: "success" });
        if (unreadCount.value > 0)
          unreadCount.value -= 1;
        if (inviteCount.value > 0)
          inviteCount.value -= 1;
        try {
          const pages = getCurrentPages();
          const messagePage = pages.find((page) => page.route === "pages/group/messages");
          if (messagePage && messagePage.refreshInvitations) {
            messagePage.refreshInvitations();
          }
        } catch (e) {
          common_vendor.index.__f__("log", "at pages/index/index.vue:346", "通知消息页面刷新失败:", e);
        }
        await refreshUserData();
        await getUnreadCount();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:354", "接受邀请失败:", error);
        common_vendor.index.showToast({ title: "操作失败", icon: "none" });
      }
    };
    const getUnreadCount = async () => {
      var _a;
      try {
        const userId = common_auth.getUserIdFromToken();
        if (!userId) {
          unreadCount.value = 0;
          return;
        }
        common_vendor.index.__f__("log", "at pages/index/index.vue:367", "开始获取用户", userId, "的未读消息数");
        const res = await common_api.apiGetUnreadCount(userId);
        const chatCount = (res == null ? void 0 : res.data) || res || 0;
        common_vendor.index.__f__("log", "at pages/index/index.vue:372", "获取到聊天未读数:", chatCount);
        try {
          const inviteRes = await common_api.apiGetInvitations();
          inviteCount.value = ((_a = inviteRes == null ? void 0 : inviteRes.data) == null ? void 0 : _a.length) || (inviteRes == null ? void 0 : inviteRes.length) || 0;
          common_vendor.index.__f__("log", "at pages/index/index.vue:378", "获取到邀请未读数:", inviteCount.value);
        } catch (e) {
          common_vendor.index.__f__("error", "at pages/index/index.vue:380", "获取邀请列表失败:", e);
          inviteCount.value = 0;
        }
        unreadCount.value = chatCount + inviteCount.value;
        common_vendor.index.__f__("log", "at pages/index/index.vue:386", "总未读消息数:", unreadCount.value, "(聊天:", chatCount, "+ 邀请:", inviteCount.value, ")");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:388", "获取未读消息数失败:", error);
        unreadCount.value = 0;
      }
    };
    const getTodoCount = async () => {
      try {
        const res = await common_api.apiGetTodoCount();
        const count = (res == null ? void 0 : res.data) || res || 0;
        todoCount.value = count;
        hasTodo.value = count > 0;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:401", "获取待办数量失败:", error);
        todoCount.value = 0;
        hasTodo.value = false;
      }
    };
    const navigateTo = (url) => {
      common_vendor.index.navigateTo({ url });
    };
    const showProfilePopup = () => {
      showProfile.value = true;
    };
    const hideProfilePopup = () => {
      showProfile.value = false;
    };
    const navigateToAndClose = (url) => {
      hideProfilePopup();
      navigateTo(url);
    };
    common_vendor.onMounted(() => {
      msgAni.value = common_vendor.index.createAnimation({ duration: 200, timingFunction: "ease" });
      checkLoginStatus();
      const tempUserData = common_vendor.index.getStorageSync("temp_user_data");
      if (tempUserData) {
        userProfile.value = tempUserData.profile || {};
        stats.value = tempUserData.stats || { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        formatDataList();
        common_vendor.index.removeStorageSync("temp_user_data");
        setTimeout(() => {
          refreshUserData();
        }, 100);
      } else {
        refreshUserData();
      }
      initWS();
      getUnreadCount();
      getTodoCount();
    });
    const onShow = () => {
      refreshUserData();
      initWS();
      getUnreadCount();
      getTodoCount();
    };
    const onUnload = () => {
      common_wsNative.setMessageCallback(null);
    };
    common_vendor.onUnmounted(() => {
      common_wsNative.setMessageCallback(null);
    });
    __expose({
      onShow,
      onUnload
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_assets._imports_0,
        b: common_vendor.t(userProfile.value.nickname || "健身达人"),
        c: userProfile.value.fitnessGoal
      }, userProfile.value.fitnessGoal ? {
        d: common_vendor.t(userProfile.value.fitnessGoal)
      } : {}, {
        e: userProfile.value.avatar || "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
        f: common_vendor.o(showProfilePopup),
        g: common_vendor.o(refreshUserData),
        h: !isLoading.value
      }, !isLoading.value ? {
        i: common_vendor.f(dataList.value, (item, key, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.value),
            b: common_vendor.t(item.label),
            c: item.trend !== null
          }, item.trend !== null ? {
            d: common_vendor.t(item.trend > 0 ? "↑" : "↓"),
            e: common_vendor.n(item.trend > 0 ? "up" : "down"),
            f: common_vendor.t(Math.abs(item.trend))
          } : {}, {
            g: key
          });
        })
      } : {
        j: common_vendor.f(3, (i, k0, i0) => {
          return {
            a: i,
            b: i * 0.2 + "s"
          };
        })
      }, {
        k: common_vendor.o(($event) => navigateTo("/pages/match/index")),
        l: common_vendor.o(($event) => navigateTo("/pages/training/today")),
        m: common_vendor.o(($event) => navigateTo("/pages/challenge/index")),
        n: common_vendor.o(($event) => navigateTo("/pages/stat/index")),
        o: hasTodo.value
      }, hasTodo.value ? {
        p: common_vendor.t(todoCount.value),
        q: common_vendor.t(todoCount.value)
      } : {}, {
        r: common_vendor.o(($event) => navigateTo("/pages/course/index")),
        s: msgAni.value,
        t: unreadCount.value > 0
      }, unreadCount.value > 0 ? {
        v: common_vendor.t(unreadCount.value)
      } : {}, {
        w: common_vendor.o(($event) => navigateTo("/pages/group/messages")),
        x: common_vendor.o(($event) => navigateTo("/pages/training/index")),
        y: common_vendor.o(($event) => navigateTo("/pages/group/index")),
        z: common_vendor.o(showProfilePopup),
        A: showProfile.value
      }, showProfile.value ? {
        B: common_vendor.o(hideProfilePopup),
        C: userProfile.value.avatar || "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0",
        D: common_vendor.t(userProfile.value.nickname || "未设置昵称"),
        E: common_vendor.t(userProfile.value.fitnessLevel || "入门"),
        F: common_vendor.t(stats.value.trainDays || 0),
        G: common_vendor.t(stats.value.partnersCount || 0),
        H: common_vendor.t(userProfile.value.trainTime || "未设置"),
        I: common_vendor.t(userProfile.value.trainScene || "未设置"),
        J: common_vendor.t(userProfile.value.superviseDemand || "未设置"),
        K: common_vendor.o(($event) => navigateToAndClose("/pages/user/profile")),
        L: common_vendor.o(($event) => navigateToAndClose("/pages/user/setting")),
        M: common_vendor.o(() => {
        }),
        N: common_vendor.o(hideProfilePopup)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
