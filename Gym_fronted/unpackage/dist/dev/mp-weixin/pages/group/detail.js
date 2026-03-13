"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      id: "",
      loaded: false,
      detail: {},
      groupChallenges: [],
      showInvite: false,
      showCreateChallenge: false,
      inviteForm: {
        username: ""
      },
      createChallengeForm: {
        name: "",
        desc: "",
        startDate: "",
        endDate: "",
        maxMembers: 10
      },
      challengeCoverImageUrl: ""
    };
  },
  onLoad(query) {
    this.id = query && query.id ? Number(query.id) : null;
    common_vendor.index.__f__("log", "at pages/group/detail.vue:184", "群组详情页加载，groupId:", this.id);
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
        const res = await common_api.apiGroupDetailWithMembers(this.id);
        this.detail = (res == null ? void 0 : res.data) || res || {};
        this.loaded = true;
        common_vendor.index.hideLoading();
        await this.loadGroupChallenges();
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/detail.vue:203", "Failed to load group detail:", e);
        common_vendor.index.showToast({
          title: "加载组信息失败",
          icon: "none"
        });
        this.loaded = true;
      }
    },
    async loadGroupChallenges() {
      try {
        const res = await common_api.apiGetGroupChallenges(this.id);
        this.groupChallenges = (res == null ? void 0 : res.data) || res || [];
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/group/detail.vue:217", "Failed to load group challenges:", e);
        common_vendor.index.showToast({
          title: "加载组内挑战失败",
          icon: "none"
        });
      }
    },
    async onInvite() {
      if (!this.inviteForm.username) {
        common_vendor.index.showToast({ title: "请输入用户名", icon: "none" });
        return;
      }
      if (this.inviteForm.username.trim().length < 2) {
        common_vendor.index.showToast({ title: "用户名至少需要2个字符", icon: "none" });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "发送中..." });
        const userId = common_auth.getUserIdFromToken();
        await common_api.apiInviteToGroupByUsername({
          fromUserId: userId,
          toUsername: this.inviteForm.username,
          groupId: this.id
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "邀请已发送", icon: "success" });
        this.showInvite = false;
        this.inviteForm.username = "";
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "邀请发送失败", icon: "none" });
      }
    },
    closeInvitePopup() {
      this.showInvite = false;
      this.inviteForm.username = "";
    },
    doInvite() {
      if (!this.inviteForm.username || this.inviteForm.username.trim().length < 2) {
        common_vendor.index.showToast({ title: "用户名至少2个字符", icon: "none" });
        return;
      }
      this.onInvite();
    },
    goToChatRoom() {
      common_vendor.index.navigateTo({ url: `/pages/group/chat?id=${this.id}` });
    },
    // 格式化日期时间
    formatDate(dateString) {
      if (!dateString)
        return "";
      let date;
      if (typeof dateString === "string" && dateString.includes("T")) {
        date = new Date(dateString);
      } else if (typeof dateString === "number") {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      if (isNaN(date.getTime())) {
        return "";
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    onStartDateChange(e) {
      this.createChallengeForm.startDate = e.detail.value;
    },
    onEndDateChange(e) {
      this.createChallengeForm.endDate = e.detail.value;
    },
    async selectChallengeCoverImage() {
      common_vendor.index.chooseImage({
        count: 1,
        sourceType: ["album", "camera"],
        success: async (res) => {
          try {
            if (!common_auth.requireLogin()) {
              common_vendor.index.showToast({ title: "请先登录", icon: "none" });
              return;
            }
            common_vendor.index.showLoading({ title: "上传中..." });
            const uploadRes = await common_api.apiUploadAction(res.tempFilePaths[0]);
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({ title: "上传成功", icon: "success" });
            let objectName = "";
            if (uploadRes && typeof uploadRes === "object") {
              if (uploadRes.data) {
                objectName = typeof uploadRes.data === "string" ? uploadRes.data : JSON.stringify(uploadRes.data);
              } else {
                objectName = JSON.stringify(uploadRes);
              }
            } else {
              objectName = uploadRes;
            }
            if (objectName) {
              const urlRes = await common_api.apiGetFileUrl({ objectName });
              this.challengeCoverImageUrl = urlRes.data || urlRes || objectName;
            } else {
              this.challengeCoverImageUrl = objectName;
            }
          } catch (e) {
            common_vendor.index.hideLoading();
            common_vendor.index.__f__("error", "at pages/group/detail.vue:344", "封面图片上传失败:", e);
            common_vendor.index.showToast({ title: e.errMsg || "上传失败，请重试", icon: "none" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ title: "取消上传", icon: "none" });
        }
      });
    },
    async onCreateGroupChallenge() {
      if (!this.createChallengeForm.name) {
        common_vendor.index.showToast({ title: "请输入挑战名称", icon: "none" });
        return;
      }
      if (!this.createChallengeForm.startDate || !this.createChallengeForm.endDate) {
        common_vendor.index.showToast({ title: "请选择开始和结束日期", icon: "none" });
        return;
      }
      if (!this.createChallengeForm.maxMembers || this.createChallengeForm.maxMembers <= 0) {
        common_vendor.index.showToast({ title: "请输入有效的最大参与人数", icon: "none" });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "创建中..." });
        const challengeData = {
          groupId: parseInt(this.id),
          name: this.createChallengeForm.name,
          startDate: this.createChallengeForm.startDate,
          endDate: this.createChallengeForm.endDate,
          trainRequire: this.createChallengeForm.desc || "每日训练挑战",
          maxMembers: parseInt(this.createChallengeForm.maxMembers),
          coverImage: this.challengeCoverImageUrl
        };
        const res = await common_api.apiCreateGroupChallenge(challengeData);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "挑战创建成功", icon: "success" });
        this.createChallengeForm = {
          name: "",
          desc: "",
          startDate: "",
          endDate: "",
          maxMembers: 10
        };
        this.challengeCoverImageUrl = "";
        this.showCreateChallenge = false;
        await this.loadGroupChallenges();
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/detail.vue:403", "创建组内挑战失败:", e);
        common_vendor.index.showToast({
          title: e.errMsg || "创建失败，请重试",
          icon: "none"
        });
      }
    },
    async goToChallengeDetail(challengeId) {
      common_vendor.index.navigateTo({ url: `/pages/challenge/detail?id=${challengeId}` });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loaded
  }, $data.loaded ? common_vendor.e({
    b: common_vendor.t($data.detail.groupName || "未命名搭子组"),
    c: common_vendor.t($data.detail.members ? $data.detail.members.length : 0),
    d: common_vendor.t($data.detail.fixedTime || "-"),
    e: common_vendor.o(($event) => $data.showInvite = true),
    f: common_vendor.t($data.detail.members ? $data.detail.members.length : 0),
    g: common_vendor.f($data.detail.members, (member, index, i0) => {
      return common_vendor.e({
        a: member.avatar
      }, member.avatar ? {
        b: member.avatar
      } : {
        c: common_vendor.t(member.nickname ? member.nickname.charAt(0) : "#")
      }, {
        d: common_vendor.t(member.nickname || "搭子 " + member.userId),
        e: member.role === "ADMIN"
      }, member.role === "ADMIN" ? {} : {}, {
        f: member.createTime
      }, member.createTime ? {
        g: common_vendor.t($options.formatDate(member.createTime))
      } : {}, {
        h: member.role === "ADMIN"
      }, member.role === "ADMIN" ? {} : {}, {
        i: member.id
      });
    }),
    h: common_vendor.o(($event) => $data.showCreateChallenge = true),
    i: $data.groupChallenges.length === 0
  }, $data.groupChallenges.length === 0 ? {} : {
    j: common_vendor.f($data.groupChallenges, (challenge, k0, i0) => {
      return common_vendor.e({
        a: challenge.coverImage
      }, challenge.coverImage ? {
        b: challenge.coverImage
      } : {}, {
        c: common_vendor.t(challenge.challengeName || challenge.title || challenge.name),
        d: common_vendor.t(["未开始", "进行中", "已结束"][challenge.status] || challenge.status),
        e: common_vendor.n("status-" + challenge.status),
        f: common_vendor.t(challenge.startDate),
        g: common_vendor.t(challenge.endDate),
        h: challenge.id,
        i: common_vendor.o(($event) => $options.goToChallengeDetail(challenge.id), challenge.id)
      });
    })
  }, {
    k: common_vendor.o((...args) => $options.goToChatRoom && $options.goToChatRoom(...args)),
    l: $data.showInvite
  }, $data.showInvite ? {
    m: common_vendor.o((...args) => $options.closeInvitePopup && $options.closeInvitePopup(...args)),
    n: $data.inviteForm.username,
    o: common_vendor.o(($event) => $data.inviteForm.username = $event.detail.value),
    p: common_vendor.o((...args) => $options.closeInvitePopup && $options.closeInvitePopup(...args)),
    q: common_vendor.o((...args) => $options.doInvite && $options.doInvite(...args)),
    r: common_vendor.o(() => {
    }),
    s: common_vendor.o((...args) => $options.closeInvitePopup && $options.closeInvitePopup(...args))
  } : {}, {
    t: $data.showCreateChallenge
  }, $data.showCreateChallenge ? common_vendor.e({
    v: common_vendor.o(($event) => $data.showCreateChallenge = false),
    w: $data.createChallengeForm.name,
    x: common_vendor.o(($event) => $data.createChallengeForm.name = $event.detail.value),
    y: $data.createChallengeForm.desc,
    z: common_vendor.o(($event) => $data.createChallengeForm.desc = $event.detail.value),
    A: common_vendor.t($data.createChallengeForm.startDate || "选择开始日期"),
    B: $data.createChallengeForm.startDate,
    C: common_vendor.o((...args) => $options.onStartDateChange && $options.onStartDateChange(...args)),
    D: common_vendor.t($data.createChallengeForm.endDate || "选择结束日期"),
    E: $data.createChallengeForm.endDate,
    F: common_vendor.o((...args) => $options.onEndDateChange && $options.onEndDateChange(...args)),
    G: $data.createChallengeForm.maxMembers,
    H: common_vendor.o(common_vendor.m(($event) => $data.createChallengeForm.maxMembers = $event.detail.value, {
      number: true
    })),
    I: common_vendor.o((...args) => $options.selectChallengeCoverImage && $options.selectChallengeCoverImage(...args)),
    J: $data.challengeCoverImageUrl
  }, $data.challengeCoverImageUrl ? {
    K: $data.challengeCoverImageUrl
  } : {}, {
    L: common_vendor.o(($event) => $data.showCreateChallenge = false),
    M: common_vendor.o((...args) => $options.onCreateGroupChallenge && $options.onCreateGroupChallenge(...args)),
    N: common_vendor.o(() => {
    }),
    O: common_vendor.o(($event) => $data.showCreateChallenge = false)
  }) : {}) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-858a584d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/detail.js.map
