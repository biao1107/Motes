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
      // 缓存组成员信息
    };
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.loadData();
  },
  methods: {
    onInputFocus() {
      common_vendor.index.__f__("log", "at pages/group/index.vue:151", "输入框聚焦");
    },
    async loadData() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        common_vendor.index.__f__("log", "at pages/group/index.vue:157", "Calling apiMyGroups");
        const userId = common_auth.getUserIdFromToken();
        if (!userId) {
          common_vendor.index.__f__("error", "at pages/group/index.vue:160", "无法获取用户ID");
          this.loaded = true;
          common_vendor.index.hideLoading();
          return;
        }
        const res = await common_api.apiMyGroups(userId);
        common_vendor.index.__f__("log", "at pages/group/index.vue:166", "apiMyGroups response:", res);
        this.groups = (res == null ? void 0 : res.data) || res || [];
        this.loaded = true;
        common_vendor.index.hideLoading();
        await this.loadAllGroupMembers();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/group/index.vue:174", "Error loading groups:", e);
        common_vendor.index.hideLoading();
        this.loaded = true;
        common_vendor.index.showToast({
          title: "加载失败，请重试",
          icon: "none"
        });
      }
    },
    // 加载所有组的成员信息
    async loadAllGroupMembers() {
      for (const group of this.groups) {
        try {
          const detail = await common_api.apiGroupDetailWithMembers(group.id);
          this.groupMembers[group.id] = detail.members || [];
        } catch (e) {
          common_vendor.index.__f__("error", "at pages/group/index.vue:191", `加载组 ${group.id} 成员信息失败:`, e);
          this.groupMembers[group.id] = [];
        }
      }
    },
    // 检查用户是否是组的管理员
    isAdminInGroup(groupId) {
      const members = this.groupMembers[groupId] || [];
      const userId = common_auth.getUserIdFromToken();
      const userMember = members.find((m) => m.userId == userId);
      return userMember && userMember.role === "ADMIN";
    },
    async onCreateGroup() {
      if (!this.createForm.name) {
        common_vendor.index.showToast({ title: "请输入组名", icon: "none" });
        return;
      }
      if (this.createForm.name.trim().length < 2) {
        common_vendor.index.showToast({ title: "组名至少需要2个字符", icon: "none" });
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
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/index.vue:236", "创建搭子组失败:", e);
        common_vendor.index.showToast({
          title: (e == null ? void 0 : e.message) || "创建失败，请重试",
          icon: "none"
        });
      }
    },
    goDetail(id) {
      common_vendor.index.navigateTo({ url: `/pages/group/detail?id=${id}` });
    },
    // 显示删除确认弹窗
    showDeleteConfirm(groupId, groupName) {
      this.groupToDelete = groupId;
      this.deleteGroupName = groupName;
      this.showDeleteConfirmPopup = true;
    },
    // 隐藏删除确认弹窗
    hideDeleteConfirm() {
      this.showDeleteConfirmPopup = false;
      this.groupToDelete = null;
      this.deleteGroupName = "";
    },
    // 确认删除搭子组
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
        } else {
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
        }
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/index.vue:297", "删除搭子组失败:", e);
        common_vendor.index.showToast({
          title: e.errMsg || e.message || "删除失败，请重试",
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
        b: common_vendor.t(item.fixedTime || "-"),
        c: common_vendor.o(($event) => $options.goDetail(item.id), item.id),
        d: item.desc
      }, item.desc ? {
        e: common_vendor.t(item.desc)
      } : {}, {
        f: $options.isAdminInGroup(item.id)
      }, $options.isAdminInGroup(item.id) ? {
        g: common_vendor.o(($event) => $options.showDeleteConfirm(item.id, item.groupName), item.id)
      } : {}, {
        h: item.id
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
