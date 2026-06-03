"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const _sfc_main = {
  data() {
    return {
      id: "",
      loaded: false,
      errorMessage: "",
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
  computed: {
    memberCount() {
      return Array.isArray(this.detail.members) ? this.detail.members.length : 0;
    },
    myRoleLabel() {
      const currentUserId = common_auth.getUserIdFromToken();
      const currentMember = (this.detail.members || []).find((member) => member.userId === currentUserId);
      if (!currentMember)
        return "未知";
      return currentMember.role === "ADMIN" ? "管理员" : "成员";
    }
  },
  onLoad(query) {
    this.id = query && query.id ? Number(query.id) : null;
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    this.loadData();
  },
  methods: {
    async loadData() {
      if (!this.id) {
        this.loaded = true;
        this.errorMessage = "无效的组 ID";
        return;
      }
      this.loaded = false;
      this.errorMessage = "";
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const [detailRes, challengeRes] = await Promise.all([
          common_api.apiGroupDetailWithMembers(this.id),
          common_api.apiGetGroupChallenges(this.id)
        ]);
        this.detail = (detailRes == null ? void 0 : detailRes.data) || detailRes || {};
        this.groupChallenges = (challengeRes == null ? void 0 : challengeRes.data) || challengeRes || [];
        this.loaded = true;
        common_vendor.index.hideLoading();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/detail.vue:329", "加载组详情失败:", error);
        this.errorMessage = "暂时无法获取组详情，请稍后重试。";
        this.loaded = true;
      }
    },
    async onInvite() {
      if (!this.inviteForm.username) {
        common_vendor.index.showToast({ title: "请输入用户名", icon: "none" });
        return;
      }
      if (this.inviteForm.username.trim().length < 2) {
        common_vendor.index.showToast({ title: "用户名至少需要 2 个字符", icon: "none" });
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
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/detail.vue:359", "发送邀请失败:", error);
        common_vendor.index.showToast({ title: "邀请发送失败", icon: "none" });
      }
    },
    closeInvitePopup() {
      this.showInvite = false;
      this.inviteForm.username = "";
    },
    doInvite() {
      if (!this.inviteForm.username || this.inviteForm.username.trim().length < 2) {
        common_vendor.index.showToast({ title: "用户名至少 2 个字符", icon: "none" });
        return;
      }
      this.onInvite();
    },
    goToChatRoom() {
      common_vendor.index.navigateTo({ url: `/pages/group/chat?id=${this.id}` });
    },
    formatDate(dateString) {
      if (!dateString)
        return "";
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime()))
        return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    statusText(status) {
      return ["未开始", "进行中", "已结束"][status] || status;
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
            common_vendor.index.showToast({ title: "上传成功", icon: "success" });
          } catch (error) {
            common_vendor.index.hideLoading();
            common_vendor.index.__f__("error", "at pages/group/detail.vue:431", "封面上传失败:", error);
            common_vendor.index.showToast({ title: error.errMsg || "上传失败，请重试", icon: "none" });
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
        await common_api.apiCreateGroupChallenge(challengeData);
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
        const challengeRes = await common_api.apiGetGroupChallenges(this.id);
        this.groupChallenges = (challengeRes == null ? void 0 : challengeRes.data) || challengeRes || [];
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/group/detail.vue:486", "创建组内挑战失败:", error);
        common_vendor.index.showToast({
          title: error.errMsg || "创建失败，请重试",
          icon: "none"
        });
      }
    },
    goToChallengeDetail(challengeId) {
      common_vendor.index.navigateTo({ url: `/pages/challenge/detail?id=${challengeId}` });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: !$data.loaded
  }, !$data.loaded ? {} : common_vendor.e({
    b: $data.errorMessage
  }, $data.errorMessage ? {
    c: common_vendor.t($data.errorMessage),
    d: common_vendor.o((...args) => $options.loadData && $options.loadData(...args))
  } : common_vendor.e({
    e: common_vendor.t($data.detail.groupName || "未命名搭子组"),
    f: common_vendor.t($data.detail.fixedTime ? `固定训练时间：${$data.detail.fixedTime}` : "还没有配置固定训练时间，建议补充后方便大家协同训练。"),
    g: common_vendor.o(($event) => $data.showInvite = true),
    h: common_vendor.t($options.memberCount),
    i: common_vendor.t($options.myRoleLabel),
    j: common_vendor.t($options.formatDate($data.detail.createTime) || "未知"),
    k: common_vendor.o((...args) => $options.goToChatRoom && $options.goToChatRoom(...args)),
    l: common_vendor.o(($event) => $data.showCreateChallenge = true),
    m: common_vendor.t($data.detail.status === 1 ? "正常" : "已停用"),
    n: common_vendor.t($data.detail.fixedTime || "未设置"),
    o: common_vendor.t($data.groupChallenges.length),
    p: common_vendor.t($options.memberCount),
    q: $options.memberCount > 0
  }, $options.memberCount > 0 ? {
    r: common_vendor.f($data.detail.members, (member, k0, i0) => {
      return common_vendor.e({
        a: member.avatar
      }, member.avatar ? {
        b: member.avatar
      } : {
        c: common_vendor.t(member.nickname ? member.nickname.charAt(0) : "#")
      }, {
        d: common_vendor.t(member.nickname || `搭子 ${member.userId}`),
        e: common_vendor.t(member.role === "ADMIN" ? "管理员" : "成员"),
        f: member.role === "ADMIN" ? 1 : "",
        g: common_vendor.t($options.formatDate(member.createTime) || "未知"),
        h: member.id || member.userId
      });
    })
  } : {}, {
    s: common_vendor.o(($event) => $data.showCreateChallenge = true),
    t: $data.groupChallenges.length > 0
  }, $data.groupChallenges.length > 0 ? {
    v: common_vendor.f($data.groupChallenges, (challenge, k0, i0) => {
      return common_vendor.e({
        a: challenge.coverImage
      }, challenge.coverImage ? {
        b: challenge.coverImage
      } : {}, {
        c: common_vendor.t(challenge.challengeName || challenge.title || challenge.name),
        d: common_vendor.t($options.statusText(challenge.status)),
        e: common_vendor.n("status-" + challenge.status),
        f: common_vendor.t($options.formatDate(challenge.startDate) || challenge.startDate),
        g: common_vendor.t($options.formatDate(challenge.endDate) || challenge.endDate),
        h: challenge.id,
        i: common_vendor.o(($event) => $options.goToChallengeDetail(challenge.id), challenge.id)
      });
    })
  } : {}), {
    w: $data.showInvite
  }, $data.showInvite ? {
    x: common_vendor.o((...args) => $options.closeInvitePopup && $options.closeInvitePopup(...args)),
    y: $data.inviteForm.username,
    z: common_vendor.o(($event) => $data.inviteForm.username = $event.detail.value),
    A: common_vendor.o((...args) => $options.closeInvitePopup && $options.closeInvitePopup(...args)),
    B: common_vendor.o((...args) => $options.doInvite && $options.doInvite(...args)),
    C: common_vendor.o(() => {
    }),
    D: common_vendor.o((...args) => $options.closeInvitePopup && $options.closeInvitePopup(...args))
  } : {}, {
    E: $data.showCreateChallenge
  }, $data.showCreateChallenge ? common_vendor.e({
    F: common_vendor.o(($event) => $data.showCreateChallenge = false),
    G: $data.createChallengeForm.name,
    H: common_vendor.o(($event) => $data.createChallengeForm.name = $event.detail.value),
    I: $data.createChallengeForm.desc,
    J: common_vendor.o(($event) => $data.createChallengeForm.desc = $event.detail.value),
    K: common_vendor.t($data.createChallengeForm.startDate || "选择开始日期"),
    L: $data.createChallengeForm.startDate,
    M: common_vendor.o((...args) => $options.onStartDateChange && $options.onStartDateChange(...args)),
    N: common_vendor.t($data.createChallengeForm.endDate || "选择结束日期"),
    O: $data.createChallengeForm.endDate,
    P: common_vendor.o((...args) => $options.onEndDateChange && $options.onEndDateChange(...args)),
    Q: $data.createChallengeForm.maxMembers,
    R: common_vendor.o(common_vendor.m(($event) => $data.createChallengeForm.maxMembers = $event.detail.value, {
      number: true
    })),
    S: !$data.challengeCoverImageUrl
  }, !$data.challengeCoverImageUrl ? {} : {
    T: $data.challengeCoverImageUrl
  }, {
    U: common_vendor.o((...args) => $options.selectChallengeCoverImage && $options.selectChallengeCoverImage(...args)),
    V: common_vendor.o(($event) => $data.showCreateChallenge = false),
    W: common_vendor.o((...args) => $options.onCreateGroupChallenge && $options.onCreateGroupChallenge(...args)),
    X: common_vendor.o(() => {
    }),
    Y: common_vendor.o(($event) => $data.showCreateChallenge = false)
  }) : {}));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-858a584d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/detail.js.map
