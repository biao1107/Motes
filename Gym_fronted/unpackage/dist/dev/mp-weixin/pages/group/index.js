"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      loaded: false,
      groups: [],
      showCreate: false,
      showDeleteConfirmPopup: false,
      groupToDelete: null,
      deleteGroupName: "",
      createForm: {
        name: "",
        fixedTime: ""
      },
      groupMembers: {},
      brokenAvatarMap: {}
    };
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const userId = common_auth.getUserIdFromToken();
        if (!userId) {
          this.loaded = true;
          common_vendor.index.hideLoading();
          return;
        }
        const res = await common_api.apiMyGroups(userId);
        this.groups = (res == null ? void 0 : res.data) || res || [];
        this.loaded = true;
        common_vendor.index.hideLoading();
        await this.loadAllGroupMembers();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/group/index.vue:200", "加载搭子组失败:", error);
        this.loaded = true;
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "加载失败，请稍后重试",
          icon: "none"
        });
      }
    },
    async loadAllGroupMembers() {
      for (const group of this.groups) {
        try {
          const detail = await common_api.apiGroupDetailWithMembers(group.id);
          this.groupMembers = {
            ...this.groupMembers,
            [group.id]: (detail == null ? void 0 : detail.members) || []
          };
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/group/index.vue:218", `加载组 ${group.id} 成员失败:`, error);
          this.groupMembers = {
            ...this.groupMembers,
            [group.id]: []
          };
        }
      }
    },
    isAdminInGroup(groupId) {
      const members = this.groupMembers[groupId] || [];
      const userId = common_auth.getUserIdFromToken();
      const userMember = members.find((member) => member.userId == userId);
      return userMember && userMember.role === "ADMIN";
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
    async onCreateGroup() {
      if (!this.createForm.name) {
        common_vendor.index.showToast({ title: "请输入组名", icon: "none" });
        return;
      }
      if (this.createForm.name.trim().length < 2) {
        common_vendor.index.showToast({ title: "组名至少需要 2 个字符", icon: "none" });
        return;
      }
      if (!this.createForm.fixedTime) {
        common_vendor.index.showToast({ title: "请输入训练时间", icon: "none" });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "创建中..." });
        const userId = common_auth.getUserIdFromToken();
        await common_api.apiCreateGroup({
          memberIds: [userId],
          fixedTime: this.createForm.fixedTime.trim(),
          name: this.createForm.name.trim()
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "创建成功", icon: "success" });
        this.showCreate = false;
        this.createForm = { name: "", fixedTime: "" };
        this.loadData();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/index.vue:304", "创建搭子组失败:", error);
        common_vendor.index.showToast({
          title: (error == null ? void 0 : error.message) || "创建失败，请稍后重试",
          icon: "none"
        });
      }
    },
    goDetail(id) {
      common_vendor.index.navigateTo({ url: `/pages/group/detail?id=${id}` });
    },
    showDeleteConfirm(groupId, groupName) {
      this.groupToDelete = groupId;
      this.deleteGroupName = groupName;
      this.showDeleteConfirmPopup = true;
    },
    hideDeleteConfirm() {
      this.showDeleteConfirmPopup = false;
      this.groupToDelete = null;
      this.deleteGroupName = "";
    },
    async confirmDeleteGroup() {
      if (!this.groupToDelete)
        return;
      try {
        common_vendor.index.showLoading({ title: "删除中..." });
        const res = await common_api.apiDeleteGroup(this.groupToDelete);
        if (res && res.statusCode === 200) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "删除成功",
            icon: "success"
          });
          this.hideDeleteConfirm();
          this.loadData();
          return;
        }
        common_vendor.index.hideLoading();
        let errorMessage = "删除失败";
        if (res && res.data && typeof res.data === "object") {
          errorMessage = res.data.message || res.data.msg || errorMessage;
        } else if (res && res.errMsg) {
          errorMessage = res.errMsg;
        } else if (res && res.statusCode) {
          errorMessage = `删除失败 (${res.statusCode})`;
        }
        common_vendor.index.showToast({
          title: errorMessage,
          icon: "none"
        });
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/index.vue:358", "删除搭子组失败:", error);
        common_vendor.index.showToast({
          title: error.errMsg || error.message || "删除失败，请稍后重试",
          icon: "none"
        });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loaded
  }, $data.loaded ? common_vendor.e({
    b: common_assets._imports_1,
    c: common_vendor.o(($event) => $data.showCreate = true),
    d: $data.groups.length > 0
  }, $data.groups.length > 0 ? {
    e: common_vendor.t($data.groups.length),
    f: common_vendor.f($data.groups, (item, k0, i0) => {
      return common_vendor.e({
        a: $options.getGroupAvatarCount(item.id) > 0
      }, $options.getGroupAvatarCount(item.id) > 0 ? {
        b: common_vendor.f($options.getGroupAvatarList(item.id), (member, index, i1) => {
          return common_vendor.e({
            a: common_vendor.t($options.getAvatarLabel(member.nickname, item.groupName)),
            b: member.avatar && !$options.isBrokenAvatar(item.id, index)
          }, member.avatar && !$options.isBrokenAvatar(item.id, index) ? {
            c: member.avatar,
            d: common_vendor.o(($event) => $options.markBrokenAvatar(item.id, index), `${item.id}-${index}`)
          } : {}, {
            e: `${item.id}-${index}`
          });
        }),
        c: common_vendor.n(`count-${$options.getGroupAvatarCount(item.id)}`)
      } : {}, {
        d: common_vendor.t(item.groupName || "未命名搭子组"),
        e: $options.isAdminInGroup(item.id)
      }, $options.isAdminInGroup(item.id) ? {
        f: common_vendor.o(($event) => $options.showDeleteConfirm(item.id, item.groupName), item.id)
      } : {}, {
        g: common_vendor.t(item.fixedTime || "未设置固定时间"),
        h: common_vendor.t($options.getGroupMemberCount(item.id)),
        i: common_vendor.t($options.isAdminInGroup(item.id) ? "管理员" : "成员"),
        j: item.desc
      }, item.desc ? {
        k: common_vendor.t(item.desc)
      } : {}, {
        l: common_vendor.o(($event) => $options.goDetail(item.id), item.id),
        m: item.id
      });
    })
  } : {
    g: common_vendor.o(($event) => $data.showCreate = true)
  }, {
    h: $data.showCreate
  }, $data.showCreate ? {
    i: common_vendor.o(($event) => $data.showCreate = false),
    j: $data.createForm.name,
    k: common_vendor.o(($event) => $data.createForm.name = $event.detail.value),
    l: $data.createForm.fixedTime,
    m: common_vendor.o(($event) => $data.createForm.fixedTime = $event.detail.value),
    n: common_vendor.o(($event) => $data.showCreate = false),
    o: common_vendor.o((...args) => $options.onCreateGroup && $options.onCreateGroup(...args)),
    p: common_vendor.o(() => {
    }),
    q: common_vendor.o(($event) => $data.showCreate = false)
  } : {}, {
    r: $data.showDeleteConfirmPopup
  }, $data.showDeleteConfirmPopup ? {
    s: common_vendor.o((...args) => $options.hideDeleteConfirm && $options.hideDeleteConfirm(...args)),
    t: common_vendor.t($data.deleteGroupName),
    v: common_vendor.o((...args) => $options.hideDeleteConfirm && $options.hideDeleteConfirm(...args)),
    w: common_vendor.o((...args) => $options.confirmDeleteGroup && $options.confirmDeleteGroup(...args)),
    x: common_vendor.o(() => {
    }),
    y: common_vendor.o((...args) => $options.hideDeleteConfirm && $options.hideDeleteConfirm(...args))
  } : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-191b8d1f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/index.js.map
