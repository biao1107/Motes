"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  computed: {
    totalUnreadCount() {
      if (!Array.isArray(this.groups))
        return 0;
      return this.groups.reduce((sum, group) => sum + Number((group == null ? void 0 : group.unreadCount) || 0), 0);
    }
  },
  data() {
    return {
      groups: [],
      invitations: [],
      userId: null,
      groupMembers: {},
      brokenAvatarMap: {}
    };
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.userId = common_auth.getUserIdFromToken();
    this.loadInvitations();
    this.loadGroups();
    common_vendor.index.$emit("refresh-home-unread");
  },
  activated() {
    if (!common_auth.requireLogin())
      return;
    this.userId = common_auth.getUserIdFromToken();
    this.loadInvitations();
    this.loadGroups();
    common_vendor.index.$emit("refresh-home-unread");
  },
  methods: {
    async loadInvitations() {
      try {
        const res = await common_api.apiGetInvitations();
        this.invitations = Array.isArray(res) ? res : [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/group/messages.vue:166", "加载邀请列表失败:", error);
        this.invitations = [];
      }
    },
    refreshInvitations() {
      this.loadInvitations();
      this.loadGroups();
    },
    async acceptInvite(fromUserId) {
      try {
        common_vendor.index.showLoading({ title: "接受中..." });
        await common_api.apiAcceptInvite({ invitationId: fromUserId });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "已加入搭子组", icon: "success" });
        this.loadInvitations();
        this.loadGroups();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/messages.vue:184", "接受邀请失败:", error);
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
        this.invitations = this.invitations.filter(
          (invite) => !(invite.fromUserId === fromUserId && invite.groupId === groupId)
        );
        common_vendor.index.showToast({ title: "已拒绝", icon: "none" });
        this.loadInvitations();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/messages.vue:204", "拒绝邀请失败:", error);
        common_vendor.index.showToast({ title: "拒绝失败", icon: "none" });
      }
    },
    async loadGroups() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        let myGroups = [];
        try {
          const myGroupsRes = await common_api.apiMyGroups();
          myGroups = Array.isArray(myGroupsRes) ? myGroupsRes : [];
        } catch (groupsError) {
          common_vendor.index.__f__("error", "at pages/group/messages.vue:217", "获取群组列表失败:", groupsError);
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
          unreadData = Array.isArray(res) ? res : [];
        } catch (unreadError) {
          common_vendor.index.__f__("error", "at pages/group/messages.vue:231", "获取未读详情失败:", unreadError);
          unreadData = [];
        }
        this.groups = myGroups.filter((group) => group && group.id).map((group) => {
          const unreadInfo = unreadData.find((item) => item.groupId === group.id);
          return {
            id: group.id,
            groupName: group.groupName || "搭子组",
            fixedTime: group.fixedTime || "",
            lastMessage: this.formatLastMessagePreview((unreadInfo == null ? void 0 : unreadInfo.lastMessage) || ""),
            lastMessageTime: unreadInfo == null ? void 0 : unreadInfo.lastMessageTime,
            unreadCount: (unreadInfo == null ? void 0 : unreadInfo.unreadCount) || 0
          };
        });
        await this.loadAllGroupMembers();
        common_vendor.index.hideLoading();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/group/messages.vue:253", "加载消息会话失败:", error);
        this.groups = [];
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      }
    },
    async loadAllGroupMembers() {
      const detailList = await Promise.all(
        this.groups.map(async (group) => {
          try {
            const detail = await common_api.apiGroupDetailWithMembers(group.id);
            return { groupId: group.id, members: (detail == null ? void 0 : detail.members) || [] };
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/group/messages.vue:269", `加载消息组 ${group.id} 成员失败:`, error);
            return { groupId: group.id, members: [] };
          }
        })
      );
      detailList.forEach((item) => {
        this.groupMembers = {
          ...this.groupMembers,
          [item.groupId]: item.members
        };
      });
    },
    getGroupAvatarList(groupId) {
      const members = this.groupMembers[groupId] || [];
      return members.slice(0, 4).map((member) => ({
        avatar: (member == null ? void 0 : member.avatar) || "",
        nickname: (member == null ? void 0 : member.nickname) || ""
      }));
    },
    getGroupAvatarCount(groupId) {
      const members = this.groupMembers[groupId] || [];
      return Math.min(members.length, 4);
    },
    getGroupMemberCount(groupId) {
      const members = this.groupMembers[groupId] || [];
      return members.length;
    },
    getGroupAvatarFallback(groupId, index) {
      const members = this.groupMembers[groupId] || [];
      const member = members[index];
      const name = (member == null ? void 0 : member.nickname) || "";
      return name ? name.charAt(0) : "组";
    },
    getAvatarLabel(nickname, groupName) {
      const name = (nickname || "").trim();
      if (name)
        return name.charAt(0);
      const group = (groupName || "").trim();
      if (group)
        return group.charAt(0);
      return "组";
    },
    markBrokenAvatar(groupId, index) {
      this.brokenAvatarMap = {
        ...this.brokenAvatarMap,
        [`${groupId}-${index}`]: true
      };
    },
    isBrokenAvatar(groupId, index) {
      return !!this.brokenAvatarMap[`${groupId}-${index}`];
    },
    formatLastMessagePreview(message) {
      if (!message)
        return "";
      if (message === "[图片]")
        return "发送了一张图片";
      return message;
    },
    enterChat(groupId) {
      this.markGroupMessagesAsRead(groupId);
      const targetGroup = this.groups.find((group) => group.id === Number(groupId));
      if (targetGroup) {
        targetGroup.unreadCount = 0;
      }
      common_vendor.index.$emit("refresh-home-unread");
      common_vendor.index.navigateTo({
        url: "/pages/group/chat?id=" + groupId
      });
    },
    markGroupMessagesAsRead(groupId) {
      if (!groupId || !this.userId) {
        return;
      }
      common_api.apiMarkGroupRead(Number(groupId), Number(this.userId)).then(() => {
        const groupIndex = this.groups.findIndex((group) => group.id === Number(groupId));
        if (groupIndex !== -1) {
          this.groups[groupIndex].unreadCount = 0;
        }
      }).catch((error) => {
        common_vendor.index.__f__("error", "at pages/group/messages.vue:348", "标记已读失败:", error);
        common_vendor.index.showToast({
          title: "同步已读状态失败，请稍后重试",
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
    a: common_assets._imports_0$4,
    b: common_assets._imports_0$4,
    c: common_vendor.t($options.totalUnreadCount),
    d: common_assets._imports_1,
    e: common_vendor.t($data.invitations.length),
    f: Array.isArray($data.invitations) && $data.invitations.length > 0
  }, Array.isArray($data.invitations) && $data.invitations.length > 0 ? {
    g: common_vendor.f($data.invitations, (invite, k0, i0) => {
      return {
        a: common_vendor.t(invite.fromUserName),
        b: common_vendor.t(invite.groupName || "健身搭子组"),
        c: common_vendor.o(($event) => $options.acceptInvite(invite.fromUserId, invite.groupId), invite.fromUserId + "_" + invite.groupId),
        d: common_vendor.o(($event) => $options.rejectInvite(invite.fromUserId, invite.groupId), invite.fromUserId + "_" + invite.groupId),
        e: invite.fromUserId + "_" + invite.groupId
      };
    })
  } : {}, {
    h: Array.isArray($data.groups) && $data.groups.length > 0
  }, Array.isArray($data.groups) && $data.groups.length > 0 ? {
    i: common_vendor.f($data.groups, (group, k0, i0) => {
      return common_vendor.e({
        a: $options.getGroupAvatarCount(group.id) > 0
      }, $options.getGroupAvatarCount(group.id) > 0 ? {
        b: common_vendor.f($options.getGroupAvatarList(group.id), (member, index, i1) => {
          return common_vendor.e({
            a: common_vendor.t($options.getAvatarLabel(member.nickname, group.groupName)),
            b: member.avatar && !$options.isBrokenAvatar(group.id, index)
          }, member.avatar && !$options.isBrokenAvatar(group.id, index) ? {
            c: member.avatar,
            d: common_vendor.o(($event) => $options.markBrokenAvatar(group.id, index), `${group.id}-${index}`)
          } : {}, {
            e: `${group.id}-${index}`
          });
        }),
        c: common_vendor.n(`count-${$options.getGroupAvatarCount(group.id)}`)
      } : {}, {
        d: common_vendor.t(group.groupName || "搭子组"),
        e: group.lastMessageTime
      }, group.lastMessageTime ? {
        f: common_vendor.t($options.formatTime(group.lastMessageTime))
      } : {}, {
        g: group.fixedTime
      }, group.fixedTime ? {
        h: common_vendor.t(group.fixedTime)
      } : {}, {
        i: $options.getGroupMemberCount(group.id)
      }, $options.getGroupMemberCount(group.id) ? {
        j: common_vendor.t($options.getGroupMemberCount(group.id))
      } : {}, {
        k: group.lastMessage
      }, group.lastMessage ? {
        l: common_vendor.t(group.lastMessage)
      } : {}, {
        m: group.unreadCount > 0
      }, group.unreadCount > 0 ? {
        n: common_vendor.t(group.unreadCount > 99 ? "99+" : group.unreadCount)
      } : {}, {
        o: group.id,
        p: common_vendor.o(($event) => $options.enterChat(group.id), group.id)
      });
    })
  } : Array.isArray($data.invitations) && $data.invitations.length === 0 ? {} : {}, {
    j: Array.isArray($data.invitations) && $data.invitations.length === 0
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1ffa5f7a"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/messages.js.map
