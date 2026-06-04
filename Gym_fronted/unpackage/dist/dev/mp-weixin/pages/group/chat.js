"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_ws = require("../../common/ws.js");
const common_assets = require("../../common/assets.js");
const isMiniProgram = typeof common_vendor.wx$1 !== "undefined" && common_vendor.wx$1.getSystemInfoSync;
const _sfc_main = {
  data() {
    return {
      id: "",
      messages: [],
      inputMessage: "",
      inputFocus: false,
      userId: null,
      nickname: "",
      groupName: "搭子组",
      groupMembers: [],
      brokenAvatarMap: {},
      scrollTop: 0,
      loadingMore: false,
      hasMore: true,
      lastMessageId: 0,
      firstLoadMap: {},
      subscription: null,
      showError: false,
      pollingTimer: null,
      pollingInterval: 3e3
    };
  },
  onLoad(query) {
    this.id = query && query.id ? Number(query.id) : query && query.groupId ? Number(query.groupId) : null;
    if (Number.isNaN(this.id) || this.id === null || this.id <= 0) {
      common_vendor.index.showToast({
        title: "无效的群组ID",
        icon: "none"
      });
      this.showError = true;
      return;
    }
    if (!(this.id in this.firstLoadMap)) {
      this.firstLoadMap[this.id] = true;
    }
  },
  mounted() {
    if (!(this.id in this.firstLoadMap)) {
      this.firstLoadMap[this.id] = true;
    }
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) {
      this.showError = true;
      return;
    }
    this.userId = common_auth.getUserIdFromToken();
    this.loadUserProfile();
    this.loadGroupProfile();
    common_vendor.index.$emit("refresh-home-unread");
    this.$nextTick(() => {
      this.initWebSocketConnection().then(() => {
        this.loadChatHistory();
        this.startListening();
        this.markMessagesAsRead();
      }).catch((error) => {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:221", "WebSocket初始化失败:", error);
        this.loadChatHistory();
        this.markMessagesAsRead();
      });
    });
  },
  onHide() {
    this.stopListening();
  },
  onUnload() {
    this.stopListening();
  },
  beforeDestroy() {
    this.stopListening();
  },
  deactivated() {
    this.stopListening();
  },
  methods: {
    goBack() {
      common_vendor.index.navigateBack();
    },
    activated() {
      if (!common_auth.requireLogin())
        return;
      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) {
        this.showError = true;
        return;
      }
      this.userId = common_auth.getUserIdFromToken();
      this.loadUserProfile();
      this.loadGroupProfile();
      common_vendor.index.$emit("refresh-home-unread");
      this.$nextTick(() => {
        this.initWebSocketConnection().then(() => {
          this.loadChatHistory();
          this.startListening();
        }).catch((error) => {
          common_vendor.index.__f__("error", "at pages/group/chat.vue:263", "WebSocket初始化失败:", error);
          this.loadChatHistory();
        });
      });
    },
    async initWebSocketConnection() {
      if (!common_ws.isConnected()) {
        await common_ws.initWebSocket();
      }
    },
    loadUserProfile() {
      this.nickname = common_auth.getUserNickname();
    },
    async loadGroupProfile() {
      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0)
        return;
      try {
        const detail = await common_api.apiGroupDetailWithMembers(Number(this.id));
        this.groupName = (detail == null ? void 0 : detail.groupName) || "搭子组";
        this.groupMembers = Array.isArray(detail == null ? void 0 : detail.members) ? detail.members : [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:284", "加载聊天群组信息失败:", error);
        this.groupName = "搭子组";
        this.groupMembers = [];
      }
    },
    getGroupAvatarList() {
      return this.groupMembers.slice(0, 4).map((member) => ({
        avatar: (member == null ? void 0 : member.avatar) || "",
        nickname: (member == null ? void 0 : member.nickname) || ""
      }));
    },
    getGroupAvatarFallback(index) {
      const member = this.groupMembers[index];
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
    markBrokenAvatar(index) {
      this.brokenAvatarMap = {
        ...this.brokenAvatarMap,
        [`chat-${index}`]: true
      };
    },
    isBrokenAvatar(index) {
      return !!this.brokenAvatarMap[`chat-${index}`];
    },
    async loadChatHistory() {
      if (!this.hasMore || this.loadingMore)
        return;
      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0) {
        common_vendor.index.showToast({
          title: "无效的群组ID",
          icon: "none"
        });
        return;
      }
      this.loadingMore = true;
      try {
        const res = await common_api.apiGetGroupChatHistory(Number(this.id), 20);
        let history;
        if (res && typeof res === "object" && "code" in res && "data" in res) {
          if (res.code === 200) {
            history = res.data || [];
          } else {
            throw new Error(`API请求失败: ${res.message || "未知错误"}`);
          }
        } else if (Array.isArray(res)) {
          history = res;
        } else {
          history = [];
        }
        if (history.length < 20) {
          this.hasMore = false;
        }
        history.forEach((message) => {
          message.isSelf = message.userId === Number(this.userId);
          if (message.createTime && typeof message.createTime === "string") {
            message.createTime = new Date(message.createTime);
          } else if (!message.createTime) {
            message.createTime = /* @__PURE__ */ new Date();
          }
          if (!message.type) {
            message.type = message.imageUrl ? "IMAGE" : "TEXT";
          } else {
            message.type = message.type.toUpperCase();
          }
        });
        const isGroupFirstLoad = this.firstLoadMap[this.id] === true;
        if (isGroupFirstLoad) {
          this.messages = history;
          this.firstLoadMap[this.id] = false;
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } else {
          const existingMessageIds = new Set(this.messages.map((message) => message.id));
          const newMessages = history.filter((message) => message.id && !existingMessageIds.has(message.id));
          if (newMessages.length > 0) {
            this.messages = [...newMessages, ...this.messages];
          }
        }
        if (history.length > 0) {
          this.lastMessageId = Math.max(...history.map((message) => message.id));
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:381", "加载聊天历史失败:", error);
        common_vendor.index.showToast({
          title: "加载聊天历史失败: " + (error.message || "未知错误"),
          icon: "none",
          duration: 2e3
        });
      } finally {
        this.loadingMore = false;
      }
    },
    sendMessage() {
      if (!this.inputMessage.trim())
        return;
      if (isMiniProgram) {
        this.sendMessageHttp(this.inputMessage.trim());
      } else {
        common_ws.sendChatMessage(Number(this.id), this.inputMessage.trim());
      }
      this.inputMessage = "";
      this.inputFocus = true;
    },
    async sendMessageHttp(content, imageUrl = "", type = "TEXT") {
      try {
        const res = await common_api.apiSendChatMessage({
          groupId: Number(this.id),
          content,
          imageUrl,
          type
        });
        if (res && res.id) {
          const newMessage = {
            id: res.id,
            groupId: res.groupId,
            userId: res.userId,
            nickname: res.nickname,
            content: res.content,
            imageUrl: res.imageUrl,
            type: res.type || "TEXT",
            createTime: res.createTime ? new Date(res.createTime) : /* @__PURE__ */ new Date(),
            isSelf: true
          };
          this.messages.push(newMessage);
          this.lastMessageId = res.id;
          this.$nextTick(() => {
            this.scrollToBottom();
          });
          this.markMessagesAsRead();
          common_vendor.index.$emit("refresh-home-unread");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:435", "发送消息失败:", error);
        common_vendor.index.showToast({
          title: "发送失败",
          icon: "none"
        });
      }
    },
    chooseImage() {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          try {
            common_vendor.index.showLoading({ title: "上传中..." });
            const uploadRes = await common_api.apiUploadAction(res.tempFilePaths[0]);
            let imageUrl = "";
            if (uploadRes && typeof uploadRes === "object") {
              if (uploadRes.data) {
                const objectName = typeof uploadRes.data === "string" ? uploadRes.data : JSON.stringify(uploadRes.data);
                const urlRes = await common_api.apiGetFileUrl({ objectName });
                imageUrl = urlRes.data || urlRes || objectName;
              } else {
                imageUrl = JSON.stringify(uploadRes);
              }
            } else {
              imageUrl = uploadRes;
            }
            if (imageUrl) {
              if (isMiniProgram) {
                await this.sendMessageHttp("[图片]", imageUrl, "IMAGE");
                common_vendor.index.showToast({ title: "图片已发送", icon: "success" });
              } else {
                common_ws.sendChatMessage(Number(this.id), "[图片]", imageUrl, "IMAGE");
                common_vendor.index.showToast({ title: "图片已发送", icon: "success" });
              }
            } else {
              throw new Error("图片上传失败");
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/group/chat.vue:477", "图片发送失败:", error);
            common_vendor.index.showToast({ title: "图片发送失败", icon: "none" });
          } finally {
            common_vendor.index.hideLoading();
          }
        }
      });
    },
    startListening() {
      if (!this.id || Number.isNaN(Number(this.id)) || Number(this.id) <= 0)
        return;
      if (isMiniProgram) {
        this.startPolling();
        return;
      }
      if (!common_ws.isConnected()) {
        common_ws.initWebSocket().then(() => {
          this.subscription = common_ws.subscribeGroupChat(this.id, this.handleWsMessage);
        }).catch((error) => {
          common_vendor.index.__f__("error", "at pages/group/chat.vue:499", "WebSocket重新连接失败:", error);
        });
        return;
      }
      this.subscription = common_ws.subscribeGroupChat(this.id, this.handleWsMessage);
    },
    startPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
      }
      this.pollNewMessages();
      this.pollingTimer = setInterval(() => {
        this.pollNewMessages();
      }, this.pollingInterval);
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    },
    async pollNewMessages() {
      if (!this.lastMessageId || this.lastMessageId <= 0)
        return;
      try {
        const newMessages = await common_api.apiGetLatestMessages(Number(this.id), this.lastMessageId);
        if (newMessages && Array.isArray(newMessages) && newMessages.length > 0) {
          newMessages.forEach((message) => {
            const exists = this.messages.some((item) => item.id === message.id);
            if (!exists) {
              this.messages.push({
                id: message.id,
                groupId: message.groupId,
                userId: message.userId,
                nickname: message.nickname,
                content: message.content,
                imageUrl: message.imageUrl,
                type: message.type || "TEXT",
                createTime: message.createTime && typeof message.createTime === "string" ? new Date(message.createTime) : message.createTime || /* @__PURE__ */ new Date(),
                isSelf: message.userId === Number(this.userId)
              });
            }
          });
          this.lastMessageId = Math.max(...newMessages.map((message) => message.id));
          this.$nextTick(() => {
            this.scrollToBottom();
          });
          this.markMessagesAsRead();
          common_vendor.index.$emit("refresh-home-unread");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:558", "轮询获取新消息失败:", error);
      }
    },
    stopListening() {
      this.stopPolling();
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
    },
    handleWsMessage(payload) {
      if (payload.groupId === Number(this.id)) {
        const newMessage = {
          id: payload.id,
          groupId: payload.groupId,
          userId: payload.userId,
          nickname: payload.nickname,
          content: payload.content,
          imageUrl: payload.imageUrl,
          type: payload.type || "TEXT",
          createTime: payload.createTime && typeof payload.createTime === "string" ? new Date(payload.createTime) : payload.createTime || /* @__PURE__ */ new Date(),
          isSelf: payload.userId === Number(this.userId)
        };
        this.messages.push(newMessage);
        this.$nextTick(() => {
          this.scrollToBottom();
        });
        this.markMessagesAsRead();
        common_vendor.index.$emit("refresh-home-unread");
      }
    },
    onScroll(e) {
      const scrollTop = e.detail.scrollTop;
      if (scrollTop < 50 && this.hasMore && !this.loadingMore) {
        this.loadChatHistory();
      }
    },
    scrollToBottom() {
      this.scrollTop = 999999;
    },
    formatTime(date) {
      if (!date)
        return "";
      const currentDate = new Date(date);
      const now = /* @__PURE__ */ new Date();
      if (currentDate.toDateString() === now.toDateString()) {
        return `${String(currentDate.getHours()).padStart(2, "0")}:${String(currentDate.getMinutes()).padStart(2, "0")}`;
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (currentDate.toDateString() === yesterday.toDateString()) {
        return `昨天 ${String(currentDate.getHours()).padStart(2, "0")}:${String(currentDate.getMinutes()).padStart(2, "0")}`;
      }
      return `${currentDate.getMonth() + 1}-${currentDate.getDate()} ${String(currentDate.getHours()).padStart(2, "0")}:${String(
        currentDate.getMinutes()
      ).padStart(2, "0")}`;
    },
    previewImage(url) {
      common_vendor.index.previewImage({
        urls: [url],
        current: url
      });
    },
    markMessagesAsRead() {
      if (!this.id || !this.userId)
        return;
      common_api.apiMarkGroupRead(Number(this.id), Number(this.userId)).then(() => {
        common_vendor.index.$emit("refresh-home-unread");
      }).catch((error) => {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:638", "标记群组消息已读失败:", error);
        common_vendor.index.showToast({
          title: "同步阅读状态失败，请稍后重试",
          icon: "none",
          duration: 2e3
        });
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.showError
  }, $data.showError ? {
    b: common_assets._imports_0$3,
    c: common_vendor.o((...args) => $options.goBack && $options.goBack(...args))
  } : common_vendor.e({
    d: common_assets._imports_0$3,
    e: $options.getGroupAvatarList().length > 0
  }, $options.getGroupAvatarList().length > 0 ? {
    f: common_vendor.f($options.getGroupAvatarList(), (member, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getAvatarLabel(member.nickname, $data.groupName)),
        b: member.avatar && !$options.isBrokenAvatar(index)
      }, member.avatar && !$options.isBrokenAvatar(index) ? {
        c: member.avatar,
        d: common_vendor.o(($event) => $options.markBrokenAvatar(index), `chat-${index}`)
      } : {}, {
        e: `chat-${index}`
      });
    }),
    g: common_vendor.n(`count-${$options.getGroupAvatarList().length}`)
  } : {}, {
    h: common_vendor.t($data.groupName),
    i: common_assets._imports_0$3,
    j: common_vendor.t($data.messages.length),
    k: common_assets._imports_1$4,
    l: $data.loadingMore
  }, $data.loadingMore ? {} : {}, {
    m: common_vendor.f($data.messages, (message, index, i0) => {
      return common_vendor.e({
        a: !message.isSelf
      }, !message.isSelf ? common_vendor.e({
        b: common_vendor.t(message.nickname),
        c: common_vendor.t($options.formatTime(message.createTime)),
        d: message.type !== "IMAGE"
      }, message.type !== "IMAGE" ? {
        e: common_vendor.t(message.content)
      } : {
        f: message.imageUrl,
        g: common_vendor.o(($event) => $options.previewImage(message.imageUrl), message.id || index)
      }) : common_vendor.e({
        h: common_vendor.t($options.formatTime(message.createTime)),
        i: message.type !== "IMAGE"
      }, message.type !== "IMAGE" ? {
        j: common_vendor.t(message.content)
      } : {
        k: message.imageUrl,
        l: common_vendor.o(($event) => $options.previewImage(message.imageUrl), message.id || index)
      }), {
        m: message.id || index,
        n: message.isSelf ? 1 : ""
      });
    }),
    n: $data.scrollTop,
    o: common_vendor.o((...args) => $options.onScroll && $options.onScroll(...args)),
    p: common_assets._imports_1$4,
    q: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args)),
    r: common_vendor.o((...args) => $options.sendMessage && $options.sendMessage(...args)),
    s: $data.inputFocus,
    t: $data.inputMessage,
    v: common_vendor.o(($event) => $data.inputMessage = $event.detail.value),
    w: common_assets._imports_2$2,
    x: !$data.inputMessage.trim() ? 1 : "",
    y: common_vendor.o((...args) => $options.sendMessage && $options.sendMessage(...args))
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-394fd9eb"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/chat.js.map
