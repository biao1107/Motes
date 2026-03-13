"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      groups: [],
      invitations: [],
      userId: null
    };
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.userId = common_auth.getUserIdFromToken();
    this.loadInvitations();
    this.loadGroups();
  },
  // 页面激活时刷新数据（例如从聊天页面返回时）
  activated() {
    if (!common_auth.requireLogin())
      return;
    this.userId = common_auth.getUserIdFromToken();
    this.loadInvitations();
    this.loadGroups();
  },
  methods: {
    async loadInvitations() {
      try {
        const res = await common_api.apiGetInvitations();
        this.invitations = (res == null ? void 0 : res.data) || res || [];
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/group/messages.vue:105", "加载邀请列表失败:", e);
      }
    },
    // 刷新邀请列表的方法，供其他页面调用
    refreshInvitations() {
      common_vendor.index.__f__("log", "at pages/group/messages.vue:111", "收到刷新邀请列表的请求");
      this.loadInvitations();
      this.loadGroups();
    },
    async acceptInvite(fromUserId, groupId) {
      try {
        common_vendor.index.showLoading({ title: "接受中..." });
        await common_api.apiAcceptInvite({ invitationId: fromUserId });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "已加入搭子组", icon: "success" });
        this.loadInvitations();
        this.loadGroups();
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "接受失败", icon: "none" });
      }
    },
    async rejectInvite(fromUserId, groupId) {
      try {
        common_vendor.index.showLoading({ title: "拒绝中..." });
        await common_api.apiRejectInvite({
          userId: this.userId,
          invitationId: fromUserId
        });
        common_vendor.index.hideLoading();
        this.invitations = this.invitations.filter((i) => !(i.fromUserId === fromUserId && i.groupId === groupId));
        common_vendor.index.showToast({ title: "已拒绝", icon: "none" });
        this.loadInvitations();
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "拒绝失败", icon: "none" });
        common_vendor.index.__f__("error", "at pages/group/messages.vue:149", "拒绝邀请失败:", e);
      }
    },
    handleInvite(invite) {
    },
    async loadGroups() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        let myGroups = [];
        try {
          const myGroupsRes = await common_api.apiMyGroups();
          myGroups = (myGroupsRes == null ? void 0 : myGroupsRes.data) || myGroupsRes || [];
        } catch (groupsError) {
          common_vendor.index.__f__("error", "at pages/group/messages.vue:167", "获取我的群组失败:", groupsError);
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "获取群组列表失败",
            icon: "none"
          });
          return;
        }
        let unreadData = [];
        try {
          const res = await common_api.apiGetUnreadDetail(this.userId);
          unreadData = (res == null ? void 0 : res.data) || res || [];
        } catch (unreadError) {
          common_vendor.index.__f__("error", "at pages/group/messages.vue:182", "获取未读消息详情失败:", unreadError);
        }
        const allGroups = myGroups.filter((group) => group && group.id).map((group) => {
          const unreadInfo = unreadData.find((u) => u.groupId === group.id);
          return {
            id: group.id,
            groupName: group.groupName || "搭子组",
            lastMessage: (unreadInfo == null ? void 0 : unreadInfo.lastMessage) || "",
            lastMessageTime: unreadInfo == null ? void 0 : unreadInfo.lastMessageTime,
            unreadCount: (unreadInfo == null ? void 0 : unreadInfo.unreadCount) || 0
          };
        });
        this.groups = allGroups;
        common_vendor.index.__f__("log", "at pages/group/messages.vue:204", "加载群组完成，群组数量:", this.groups.length);
        common_vendor.index.__f__("log", "at pages/group/messages.vue:205", "各群组的未读消息数:", this.groups.map((g) => ({ id: g.id, name: g.groupName, unread: g.unreadCount })));
        common_vendor.index.hideLoading();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/group/messages.vue:209", "加载群组列表失败:", e);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      }
    },
    goToChat(groupId) {
      common_vendor.index.navigateTo({
        url: "/pages/group/chat?id=" + groupId
      });
    },
    handleItemClick(groupId) {
      this.goToChat(groupId);
    },
    enterChat(groupId) {
      this.markGroupMessagesAsRead(groupId);
      common_vendor.index.navigateTo({
        url: "/pages/group/chat?id=" + groupId
      });
    },
    // 标记指定群组的消息为已读
    markGroupMessagesAsRead(groupId) {
      if (!groupId || !this.userId) {
        common_vendor.index.__f__("warn", "at pages/group/messages.vue:239", "群组ID或用户ID缺失，无法标记消息为已读");
        return;
      }
      common_vendor.index.__f__("log", "at pages/group/messages.vue:243", "准备标记群组消息为已读:", groupId, "用户ID:", this.userId);
      common_api.apiMarkGroupRead(Number(groupId), Number(this.userId)).then((response) => {
        common_vendor.index.__f__("log", "at pages/group/messages.vue:247", "标记群组消息为已读成功:", groupId, "响应:", response);
        const groupIndex = this.groups.findIndex((g) => g.id === Number(groupId));
        if (groupIndex !== -1) {
          this.groups[groupIndex].unreadCount = 0;
        }
      }).catch((error) => {
        common_vendor.index.__f__("error", "at pages/group/messages.vue:256", "标记群组消息为已读失败:", groupId, "错误:", error);
        common_vendor.index.showToast({
          title: "同步阅读状态失败，请稍后重试",
          icon: "none",
          duration: 2e3
        });
      });
    },
    formatTime(dateStr) {
      if (!dateStr)
        return "";
      const date = new Date(dateStr);
      const now = /* @__PURE__ */ new Date();
      const diff = now - date;
      if (diff < 6e4) {
        return "刚刚";
      }
      if (diff < 36e5) {
        return Math.floor(diff / 6e4) + "分钟前";
      }
      if (diff < 864e5) {
        return Math.floor(diff / 36e5) + "小时前";
      }
      if (diff < 6048e5) {
        return Math.floor(diff / 864e5) + "天前";
      }
      return `${date.getMonth() + 1}-${date.getDate()}`;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.invitations.length > 0
  }, $data.invitations.length > 0 ? {
    b: common_vendor.f($data.invitations, (invite, k0, i0) => {
      return {
        a: common_vendor.t(invite.fromUserName),
        b: common_vendor.t(invite.groupName || "健身搭子组"),
        c: common_vendor.o(($event) => $options.acceptInvite(invite.fromUserId, invite.groupId), invite.fromUserId + "_" + invite.groupId),
        d: common_vendor.o(($event) => $options.rejectInvite(invite.fromUserId, invite.groupId), invite.fromUserId + "_" + invite.groupId),
        e: invite.fromUserId + "_" + invite.groupId,
        f: common_vendor.o(($event) => $options.handleInvite(invite), invite.fromUserId + "_" + invite.groupId)
      };
    })
  } : {}, {
    c: $data.groups.length > 0
  }, $data.groups.length > 0 ? {
    d: common_vendor.f($data.groups, (group, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(group.groupName || "搭子组"),
        b: group.lastMessageTime
      }, group.lastMessageTime ? {
        c: common_vendor.t($options.formatTime(group.lastMessageTime))
      } : {}, {
        d: group.lastMessage
      }, group.lastMessage ? {
        e: common_vendor.t(group.lastMessage)
      } : {}, {
        f: group.unreadCount > 0
      }, group.unreadCount > 0 ? {
        g: common_vendor.t(group.unreadCount > 99 ? "99+" : group.unreadCount)
      } : {}, {
        h: group.id,
        i: common_vendor.o(($event) => $options.enterChat(group.id), group.id)
      });
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1ffa5f7a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/messages.js.map
