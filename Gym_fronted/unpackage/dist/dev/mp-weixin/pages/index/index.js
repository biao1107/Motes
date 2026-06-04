"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const common_wsNative = require("../../common/ws-native.js");
const common_auth = require("../../common/auth.js");
const common_api = require("../../common/api.js");
const defaultAvatar = "https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0";
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const iconMap = {
      completeProfile: "/static/icons/home/profile-blue.svg",
      challenge: "/static/icons/home/trophy-blue.svg",
      training: "/static/icons/home/dumbbell-blue.svg",
      group: "/static/icons/home/group-blue.svg",
      match: "/static/icons/home/compass-blue.svg",
      trainDays: "/static/icons/home/calendar-blue.svg",
      partners: "/static/icons/home/group-blue.svg",
      stats: "/static/icons/home/chart-blue.svg"
    };
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
    let unreadRefreshTimer = null;
    const heroTitle = common_vendor.ref("开始今天的协同训练");
    const heroDescription = common_vendor.ref("先约到合适的搭子，再把训练、打卡和反馈连成一个连续动作。");
    const primaryAction = common_vendor.ref({
      label: "去开始训练",
      url: "/pages/training/index",
      icon: iconMap.training
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
          url: "/pages/user/profile",
          icon: iconMap.completeProfile
        };
        return;
      }
      if (hasTodo.value && todoCount.value > 0) {
        heroTitle.value = `今天还有 ${todoCount.value} 个挑战待完成`;
        heroDescription.value = "优先处理今日待办，更容易把训练节奏稳定下来。";
        primaryAction.value = {
          label: "去处理待办",
          url: "/pages/challenge/index",
          icon: iconMap.challenge
        };
        return;
      }
      if ((stats.value.activeChallenges || 0) > 0) {
        heroTitle.value = "保持当前挑战节奏";
        heroDescription.value = "你已经在进行挑战，继续上报训练和打卡，会更快形成正反馈。";
        primaryAction.value = {
          label: "继续训练",
          url: "/pages/training/index",
          icon: iconMap.training
        };
        return;
      }
      if ((stats.value.partnersCount || 0) > 0) {
        heroTitle.value = "和搭子保持训练连续性";
        heroDescription.value = "你已经建立了搭子关系，现在最重要的是把互动和训练形成固定节奏。";
        primaryAction.value = {
          label: "查看搭子组",
          url: "/pages/group/index",
          icon: iconMap.group
        };
        return;
      }
      heroTitle.value = "开始今天的协同训练";
      heroDescription.value = "先约到合适的搭子，再把训练、打卡和反馈连成一个连续动作。";
      primaryAction.value = {
        label: "去找搭子",
        url: "/pages/match/index",
        icon: iconMap.match
      };
    };
    const formatDataList = () => {
      dataList.value = [
        {
          value: stats.value.trainDays || 0,
          label: "累计训练",
          trend: null,
          icon: iconMap.trainDays
        },
        {
          value: stats.value.partnersCount || 0,
          label: "健身搭子",
          trend: null,
          icon: iconMap.partners
        },
        {
          value: stats.value.activeChallenges || 0,
          label: "进行挑战",
          trend: null,
          icon: iconMap.stats
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
        common_vendor.index.__f__("error", "at pages/index/index.vue:410", "数据刷新失败:", error);
        stats.value = { trainDays: 0, partnersCount: 0, activeChallenges: 0 };
        formatDataList();
        common_vendor.index.showToast({ title: "数据加载失败", icon: "none", duration: 1500 });
      } finally {
        isLoading.value = false;
      }
    };
    const getUnreadSummary = async () => {
      const userId = common_auth.getUserIdFromToken();
      if (!userId) {
        unreadCount.value = 0;
        inviteCount.value = 0;
        return;
      }
      try {
        let chatCount = 0;
        try {
          const unreadDetail = await common_api.apiGetUnreadDetail(userId);
          if (Array.isArray(unreadDetail)) {
            chatCount = unreadDetail.reduce((sum, item) => sum + Number((item == null ? void 0 : item.unreadCount) || 0), 0);
          } else {
            const chatRes = await common_api.apiGetUnreadCount(userId);
            chatCount = Number(chatRes || 0);
          }
        } catch (detailError) {
          common_vendor.index.__f__("error", "at pages/index/index.vue:438", "获取未读详情失败，回退到总数接口:", detailError);
          const chatRes = await common_api.apiGetUnreadCount(userId);
          chatCount = Number(chatRes || 0);
        }
        let invitations = 0;
        try {
          const inviteRes = await common_api.apiGetInvitations();
          invitations = Array.isArray(inviteRes) ? inviteRes.length : 0;
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/index/index.vue:448", "获取邀请列表失败:", error);
        }
        inviteCount.value = invitations;
        unreadCount.value = chatCount + invitations;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:454", "获取未读消息失败:", error);
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
        common_vendor.index.__f__("error", "at pages/index/index.vue:468", "获取待办数量失败:", error);
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
        common_vendor.index.__f__("error", "at pages/index/index.vue:494", "接受邀请失败:", error);
        common_vendor.index.showToast({ title: "操作失败，请稍后重试", icon: "none", duration: 1500 });
      }
    };
    const handleInvite = (payload) => {
      const fromName = payload.fromUserName || "你的好友";
      const groupName = payload.groupName || "健身搭子组";
      msgShake();
      getUnreadSummary();
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
          msgShake();
          getUnreadSummary();
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
        common_vendor.index.__f__("error", "at pages/index/index.vue:548", "首页 WebSocket 初始化失败:", error);
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
      common_vendor.index.$on("refresh-home-unread", () => {
        getUnreadSummary();
        unreadRefreshTimer && clearTimeout(unreadRefreshTimer);
        unreadRefreshTimer = setTimeout(() => {
          getUnreadSummary();
        }, 600);
      });
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
    common_vendor.onShow(() => {
      if (!common_auth.requireLogin())
        return;
      refreshUserData();
      initWS();
      getUnreadSummary();
      getTodoSummary();
    });
    common_vendor.onUnload(() => {
      common_wsNative.setMessageCallback(null);
    });
    common_vendor.onUnmounted(() => {
      common_wsNative.setMessageCallback(null);
      unreadRefreshTimer && clearTimeout(unreadRefreshTimer);
      common_vendor.index.$off("refresh-home-unread");
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
        h: primaryAction.value.icon,
        i: common_vendor.t(primaryAction.value.label),
        j: common_vendor.o(($event) => navigateTo(primaryAction.value.url)),
        k: common_assets._imports_2,
        l: common_vendor.t(stats.value.activeChallenges || 0),
        m: common_assets._imports_0$3,
        n: common_vendor.t(unreadCount.value),
        o: common_assets._imports_0$1,
        p: common_vendor.o(($event) => navigateTo("/pages/match/index")),
        q: common_assets._imports_1,
        r: common_vendor.o(($event) => navigateTo("/pages/group/index")),
        s: common_vendor.o(handleManualRefresh),
        t: !isLoading.value
      }, !isLoading.value ? {
        v: common_vendor.f(dataList.value, (item, k0, i0) => {
          return common_vendor.e({
            a: item.icon,
            b: common_vendor.t(item.value),
            c: common_vendor.t(item.label),
            d: item.trend !== null
          }, item.trend !== null ? {
            e: common_vendor.t(item.trend > 0 ? "↑" : "↓"),
            f: common_vendor.n(item.trend > 0 ? "up" : "down"),
            g: common_vendor.t(Math.abs(item.trend))
          } : {}, {
            h: item.label
          });
        })
      } : {
        w: common_vendor.f(3, (i, k0, i0) => {
          return {
            a: i
          };
        })
      }, {
        x: common_assets._imports_1,
        y: common_vendor.o(($event) => navigateTo("/pages/match/index")),
        z: common_assets._imports_0$2,
        A: common_vendor.o(($event) => navigateTo("/pages/training/today")),
        B: common_assets._imports_6,
        C: common_vendor.o(($event) => navigateTo("/pages/challenge/index")),
        D: common_assets._imports_7,
        E: common_vendor.o(($event) => navigateTo("/pages/stat/index")),
        F: hasTodo.value
      }, hasTodo.value ? {
        G: common_vendor.t(todoCount.value),
        H: common_vendor.t(todoCount.value),
        I: common_vendor.o(($event) => navigateTo("/pages/challenge/index"))
      } : {}, {
        J: common_assets._imports_3,
        K: common_vendor.o(($event) => navigateTo("/pages/course/index")),
        L: common_assets._imports_11,
        M: msgAni.value,
        N: unreadCount.value > 0
      }, unreadCount.value > 0 ? {
        O: common_vendor.t(unreadCount.value)
      } : {}, {
        P: common_vendor.o(($event) => navigateTo("/pages/group/messages")),
        Q: common_assets._imports_5,
        R: hasTodo.value ? 1 : "",
        S: common_vendor.o(($event) => navigateTo("/pages/training/index")),
        T: common_assets._imports_4,
        U: common_vendor.o(($event) => navigateTo("/pages/group/index")),
        V: common_assets._imports_10,
        W: common_vendor.o(showProfilePopup),
        X: showProfile.value
      }, showProfile.value ? {
        Y: common_vendor.o(hideProfilePopup),
        Z: userProfile.value.avatar || defaultAvatar,
        aa: common_vendor.t(userProfile.value.nickname || "未设置昵称"),
        ab: common_vendor.t(userProfile.value.fitnessLevel || "入门"),
        ac: common_vendor.t(stats.value.trainDays || 0),
        ad: common_vendor.t(stats.value.partnersCount || 0),
        ae: common_vendor.t(userProfile.value.trainTime || "未设置"),
        af: common_vendor.t(userProfile.value.trainScene || "未设置"),
        ag: common_vendor.t(userProfile.value.superviseDemand || "未设置"),
        ah: common_vendor.o(($event) => navigateToAndClose("/pages/user/profile")),
        ai: common_vendor.o(($event) => navigateToAndClose("/pages/user/setting")),
        aj: common_vendor.o(() => {
        }),
        ak: common_vendor.o(hideProfilePopup)
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-1cf27b2a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
