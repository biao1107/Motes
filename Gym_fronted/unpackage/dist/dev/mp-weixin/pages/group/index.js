"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
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
      groupMembers: {}
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
        common_vendor.index.__f__("error", "at pages/group/index.vue:172", "加载搭子组失败:", error);
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
          this.groupMembers[group.id] = detail.members || [];
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/group/index.vue:187", `加载组 ${group.id} 成员失败:`, error);
          this.groupMembers[group.id] = [];
        }
      }
    },
    isAdminInGroup(groupId) {
      const members = this.groupMembers[groupId] || [];
      const userId = common_auth.getUserIdFromToken();
      const userMember = members.find((member) => member.userId == userId);
      return userMember && userMember.role === "ADMIN";
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
        common_vendor.index.__f__("error", "at pages/group/index.vue:231", "创建搭子组失败:", error);
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
        common_vendor.index.__f__("error", "at pages/group/index.vue:285", "删除搭子组失败:", error);
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
    b: common_vendor.o(($event) => $data.showCreate = true),
    c: $data.groups.length > 0
  }, $data.groups.length > 0 ? {
    d: common_vendor.t($data.groups.length),
    e: common_vendor.f($data.groups, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(item.groupName || "未命名搭子组"),
        b: common_vendor.t(item.fixedTime || "未设置固定时间"),
        c: common_vendor.t($options.isAdminInGroup(item.id) ? "你是管理员" : "普通成员"),
        d: item.desc
      }, item.desc ? {
        e: common_vendor.t(item.desc)
      } : {}, {
        f: common_vendor.o(($event) => $options.goDetail(item.id), item.id),
        g: $options.isAdminInGroup(item.id)
      }, $options.isAdminInGroup(item.id) ? {
        h: common_vendor.o(($event) => $options.showDeleteConfirm(item.id, item.groupName), item.id)
      } : {}, {
        i: item.id
      });
    })
  } : {
    f: common_vendor.o(($event) => $data.showCreate = true)
  }, {
    g: $data.showCreate
  }, $data.showCreate ? {
    h: common_vendor.o(($event) => $data.showCreate = false),
    i: $data.createForm.name,
    j: common_vendor.o(($event) => $data.createForm.name = $event.detail.value),
    k: $data.createForm.fixedTime,
    l: common_vendor.o(($event) => $data.createForm.fixedTime = $event.detail.value),
    m: common_vendor.o(($event) => $data.showCreate = false),
    n: common_vendor.o((...args) => $options.onCreateGroup && $options.onCreateGroup(...args)),
    o: common_vendor.o(() => {
    }),
    p: common_vendor.o(($event) => $data.showCreate = false)
  } : {}, {
    q: $data.showDeleteConfirmPopup
  }, $data.showDeleteConfirmPopup ? {
    r: common_vendor.o((...args) => $options.hideDeleteConfirm && $options.hideDeleteConfirm(...args)),
    s: common_vendor.t($data.deleteGroupName),
    t: common_vendor.o((...args) => $options.hideDeleteConfirm && $options.hideDeleteConfirm(...args)),
    v: common_vendor.o((...args) => $options.confirmDeleteGroup && $options.confirmDeleteGroup(...args)),
    w: common_vendor.o(() => {
    }),
    x: common_vendor.o((...args) => $options.hideDeleteConfirm && $options.hideDeleteConfirm(...args))
  } : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-191b8d1f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/index.js.map
