"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const common_wsNative = require("../../common/ws-native.js");
const common_auth = require("../../common/auth.js");
const common_api = require("../../common/api.js");
const defaultAvatar = "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0";
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    const userProfile = common_vendor.ref({});
    const stats = common_vendor.ref({
      trainDays: 0,
      partnersCount: 0,
      activeChallenges: 0
    });
    const showProfile = common_vendor.ref(false);
    const isLoading = common_vendor.ref(false);
    const unreadCount = common_vendor.ref(0);
    const inviteCount = common_vendor.ref(0);
    const msgAni = common_vendor.ref(null);
    const hasTodo = common_vendor.ref(false);
    const todoCount = common_vendor.ref(0);
    const dataList = common_vendor.ref([]);
    const heroTitle = common_vendor.ref("开始今天的协同训练");
    const heroDescription = common_vendor.ref("先约到合适的搭子，再把训练、打卡和反馈连成一个连续动作。");
    const primaryAction = common_vendor.ref({
      label: "去开始训练",
      url: "/pages/training/index"
    });
    const checkLoginStatus = () => {
      if (!common_auth.requireLogin()) {
        common_vendor.index.redirectTo({ url: "/pages/auth/login" });
        return false;
      }
      return true;
    };
    const updateHeroContent = () => {
      if (!userProfile.value.fitnessGoal) {
        heroTitle.value = "先完善你的训练档案";
        heroDescription.value = "补齐目标、时间和场景信息后，搭子推荐和挑战分发会更准确。";
        primaryAction.value = {
          label: "去完善档案",
          url: "/pages/user/profile"
        };
        return;
      }
      if (hasTodo.value && todoCount.value > 0) {
        heroTitle.value = `今天还有 ${todoCount.value} 个挑战待完成`;
        heroDescription.value = "优先处理今日待办，更容易把训练节奏稳定下来。";
        primaryAction.value = {
          label: "去处理待办",
          url: "/pages/challenge/index"
        };
        return;
      }
      if ((stats.value.activeChallenges || 0) > 0) {
        heroTitle.value = "保持当前挑战节奏";
        heroDescription.value = "你已经在进行挑战，继续上报训练和打卡，会更快形成正反馈。";
        primaryAction.value = {
          label: "继续训练",
          url: "/pages/training/index"
        };
        return;
      }
      if ((stats.value.partnersCount || 0) > 0) {
        heroTitle.value = "和搭子保持训练连续性";
        heroDescription.value = "你已经建立了搭子关系，现在最重要的是把互动和训练形成固定节奏。";
        primaryAction.value = {
          label: "查看搭子组",
          url: "/pages/group/index"
        };
        return;
      }
      heroTitle.value = "开始今天的协同训练";
      heroDescription.value = "先约到合适的搭子，再把训练、打卡和反馈连成一个连续动作。";
      primaryAction.value = {
        label: "去找搭子",
        url: "/pages/match/index"
      };
    };
    const formatDataList = () => {
      dataList.value = [
        {
          value: stats.value.trainDays || 0,
          label: "累计训练",
          trend: null
        },
        {
          value: stats.value.partnersCount || 0,
          label: "健身搭子",
          trend: null
        },
        {
          value: stats.value.activeChallenges || 0,
          label: "进行挑战",
          trend: null
        }
      ];
      updateHeroContent();
    };
    const refreshUserData = async ({ userData = null, silent = true } = {}) => {
      isLoading.value = true;
      try {
        let profileRes;
        let statsRes;
        if (userData) {
          profileRes = userData.profile || {};
          statsRes = userData.stats || {};
        } else {
          [profileRes, statsRes] = await Promise.all([common_api.apiGetProfile(), common_api.apiStatHome()]);
        }
        userProfile.value = (profileRes == null ? void 0 : profileRes.data) || profileRes || {};
        stats.value = (statsRes == null ? void 0 : statsRes.data) || statsRes || {
          trainDays: 0,
          partnersCount: 0,
          activeChallenges: 0
        };
        formatDataList();
        if (!silent) {
          common_vendor.index.showToast({ title: "数据已刷新", icon: "success", duration: 1e3 });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:353", "数据刷新失败:", error);
        stats.value = { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        formatDataList();
        common_vendor.index.showToast({ title: "数据加载失败", icon: "none", duration: 1500 });
      } finally {
        isLoading.value = false;
      }
    };
    const getUnreadSummary = async () => {
      var _a;
      const userId = common_auth.getUserIdFromToken();
      if (!userId) {
        unreadCount.value = 0;
        inviteCount.value = 0;
        return;
      }
      try {
        const chatRes = await common_api.apiGetUnreadCount(userId);
        const chatCount = (chatRes == null ? void 0 : chatRes.data) || chatRes || 0;
        let invitations = 0;
        try {
          const inviteRes = await common_api.apiGetInvitations();
          invitations = ((_a = inviteRes == null ? void 0 : inviteRes.data) == null ? void 0 : _a.length) || (inviteRes == null ? void 0 : inviteRes.length) || 0;
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/index/index.vue:379", "获取邀请列表失败:", error);
        }
        inviteCount.value = invitations;
        unreadCount.value = chatCount + invitations;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:385", "获取未读消息失败:", error);
        unreadCount.value = 0;
        inviteCount.value = 0;
      }
    };
    const getTodoSummary = async () => {
      try {
        const res = await common_api.apiGetTodoCount();
        const count = (res == null ? void 0 : res.data) || res || 0;
        todoCount.value = count;
        hasTodo.value = count > 0;
        updateHeroContent();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:399", "获取待办数量失败:", error);
        todoCount.value = 0;
        hasTodo.value = false;
        updateHeroContent();
      }
    };
    const msgShake = () => {
      if (!msgAni.value)
        return;
      msgAni.value.scale(1.18).step({ duration: 140 });
      msgAni.value.scale(1).step({ duration: 140 });
    };
    const acceptInvite = async (inviterId) => {
      const userId = common_auth.getUserIdFromToken();
      if (!inviterId || !userId)
        return;
      try {
        await common_api.apiAcceptInvite({
          userId,
          invitationId: inviterId
        });
        common_vendor.index.showToast({ title: "已加入搭子组", icon: "success", duration: 1200 });
        await Promise.all([refreshUserData(), getUnreadSummary(), getTodoSummary()]);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:425", "接受邀请失败:", error);
        common_vendor.index.showToast({ title: "操作失败，请稍后重试", icon: "none", duration: 1500 });
      }
    };
    const handleInvite = (payload) => {
      const fromName = payload.fromUserName || "你的好友";
      const groupName = payload.groupName || "健身搭子组";
      msgShake();
      common_vendor.index.showModal({
        title: "新的搭子邀请",
        content: `${fromName} 邀请你加入 ${groupName}，是否接受？`,
        confirmText: "接受",
        cancelText: "稍后",
        async success(res) {
          if (res.confirm) {
            await acceptInvite(payload.fromUserId);
          }
        }
      });
    };
    const handleMessage = (payload) => {
      var _a;
      const msgType = payload.type || ((_a = payload.data) == null ? void 0 : _a.type);
      switch (msgType) {
        case "INVITATION":
          handleInvite(payload.data || payload);
          break;
        case "CHAT":
        case "CHAT_MESSAGE":
          unreadCount.value += 1;
          msgShake();
          break;
        case "NOTIFICATION":
          msgShake();
          common_vendor.index.showToast({
            title: payload.message || "收到新的通知",
            icon: "none",
            duration: 1200
          });
          break;
      }
    };
    const initWS = async () => {
      try {
        await common_wsNative.initNativeWebSocket();
        common_wsNative.setMessageCallback(handleMessage);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:478", "首页 WebSocket 初始化失败:", error);
      }
    };
    const navigateTo = (url) => {
      common_vendor.index.navigateTo({ url });
    };
    const navigateToAndClose = (url) => {
      showProfile.value = false;
      navigateTo(url);
    };
    const showProfilePopup = () => {
      showProfile.value = true;
    };
    const hideProfilePopup = () => {
      showProfile.value = false;
    };
    const handleManualRefresh = async () => {
      await Promise.all([
        refreshUserData({ silent: false }),
        getUnreadSummary(),
        getTodoSummary()
      ]);
    };
    common_vendor.onMounted(() => {
      msgAni.value = common_vendor.index.createAnimation({ duration: 200, timingFunction: "ease" });
      if (!checkLoginStatus()) {
        return;
      }
      const tempUserData = common_vendor.index.getStorageSync("temp_user_data");
      if (tempUserData) {
        userProfile.value = tempUserData.profile || {};
        stats.value = tempUserData.stats || {
          trainDays: 0,
          partnersCount: 0,
          activeChallenges: 0
        };
        formatDataList();
        common_vendor.index.removeStorageSync("temp_user_data");
        setTimeout(() => {
          refreshUserData();
        }, 120);
      } else {
        refreshUserData();
      }
      initWS();
      getUnreadSummary();
      getTodoSummary();
    });
    const onShow = () => {
      if (!common_auth.requireLogin())
        return;
      refreshUserData();
      initWS();
      getUnreadSummary();
      getTodoSummary();
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
        c: common_vendor.t(userProfile.value.fitnessGoal ? `目标：${userProfile.value.fitnessGoal}` : "先设定你的训练目标，系统会给出更准的推荐"),
        d: userProfile.value.avatar || defaultAvatar,
        e: common_vendor.o(showProfilePopup),
        f: common_vendor.t(heroTitle.value),
        g: common_vendor.t(heroDescription.value),
        h: common_vendor.t(primaryAction.value.label),
        i: common_vendor.o(($event) => navigateTo(primaryAction.value.url)),
        j: common_vendor.o(($event) => navigateTo("/pages/match/index")),
        k: common_vendor.t(stats.value.activeChallenges || 0),
        l: common_vendor.t(unreadCount.value),
        m: common_vendor.o(handleManualRefresh),
        n: !isLoading.value
      }, !isLoading.value ? {
        o: common_vendor.f(dataList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.value),
            b: common_vendor.t(item.label),
            c: item.trend !== null
          }, item.trend !== null ? {
            d: common_vendor.t(item.trend > 0 ? "↑" : "↓"),
            e: common_vendor.n(item.trend > 0 ? "up" : "down"),
            f: common_vendor.t(Math.abs(item.trend))
          } : {}, {
            g: item.label
          });
        })
      } : {
        p: common_vendor.f(3, (i, k0, i0) => {
          return {
            a: i
          };
        })
      }, {
        q: common_vendor.o(($event) => navigateTo("/pages/match/index")),
        r: common_vendor.o(($event) => navigateTo("/pages/training/today")),
        s: common_vendor.o(($event) => navigateTo("/pages/challenge/index")),
        t: common_vendor.o(($event) => navigateTo("/pages/stat/index")),
        v: hasTodo.value
      }, hasTodo.value ? {
        w: common_vendor.t(todoCount.value),
        x: common_vendor.t(todoCount.value),
        y: common_vendor.o(($event) => navigateTo("/pages/challenge/index"))
      } : {}, {
        z: common_vendor.o(($event) => navigateTo("/pages/course/index")),
        A: msgAni.value,
        B: unreadCount.value > 0
      }, unreadCount.value > 0 ? {
        C: common_vendor.t(unreadCount.value)
      } : {}, {
        D: common_vendor.o(($event) => navigateTo("/pages/group/messages")),
        E: common_vendor.o(($event) => navigateTo("/pages/training/index")),
        F: common_vendor.o(($event) => navigateTo("/pages/group/index")),
        G: common_vendor.o(showProfilePopup),
        H: showProfile.value
      }, showProfile.value ? {
        I: common_vendor.o(hideProfilePopup),
        J: userProfile.value.avatar || defaultAvatar,
        K: common_vendor.t(userProfile.value.nickname || "未设置昵称"),
        L: common_vendor.t(userProfile.value.fitnessLevel || "入门"),
        M: common_vendor.t(stats.value.trainDays || 0),
        N: common_vendor.t(stats.value.partnersCount || 0),
        O: common_vendor.t(userProfile.value.trainTime || "未设置"),
        P: common_vendor.t(userProfile.value.trainScene || "未设置"),
        Q: common_vendor.t(userProfile.value.superviseDemand || "未设置"),
        R: common_vendor.o(($event) => navigateToAndClose("/pages/user/profile")),
        S: common_vendor.o(($event) => navigateToAndClose("/pages/user/setting")),
        T: common_vendor.o(() => {
        }),
        U: common_vendor.o(hideProfilePopup)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
