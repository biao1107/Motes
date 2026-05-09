"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const common_auth = require("../../common/auth.js");
const common_ws = require("../../common/ws.js");
const isMiniProgram = typeof common_vendor.wx$1 !== "undefined" && common_vendor.wx$1.getSystemInfoSync;
const _sfc_main = {
  data() {
    return {
      id: "",
      // 组ID
      messages: [],
      inputMessage: "",
      inputFocus: false,
      userId: null,
      nickname: "",
      scrollTop: 0,
      loadingMore: false,
      hasMore: true,
      lastMessageId: 0,
      firstLoadMap: {},
      // 用于跟踪每个群组的加载状态
      subscription: null,
      // 添加订阅引用
      showError: false,
      // 是否显示错误信息
      pollingTimer: null,
      // 轮询定时器（小程序环境使用）
      pollingInterval: 3e3
      // 轮询间隔（毫秒）
    };
  },
  onLoad(query) {
    this.id = query && query.id ? Number(query.id) : query && query.groupId ? Number(query.groupId) : null;
    common_vendor.index.__f__("log", "at pages/group/chat.vue:119", "onLoad 接收到的参数:", query, "群组ID:", this.id);
    if (isNaN(this.id) || this.id === null || this.id <= 0) {
      common_vendor.index.__f__("error", "at pages/group/chat.vue:123", "无效的群组ID:", this.id);
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
  // 页面显示时也检查加载状态
  mounted() {
    if (!(this.id in this.firstLoadMap)) {
      this.firstLoadMap[this.id] = true;
    }
  },
  onShow() {
    if (!common_auth.requireLogin())
      return;
    if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
      common_vendor.index.__f__("error", "at pages/group/chat.vue:149", "无效的群组ID，onShow中停止执行:", this.id);
      this.showError = true;
      return;
    }
    this.userId = common_auth.getUserIdFromToken();
    this.loadUserProfile();
    this.$nextTick(() => {
      this.initWebSocketConnection().then(() => {
        this.loadChatHistory();
        this.startListening();
        this.markMessagesAsRead();
      }).catch((error) => {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:166", "WebSocket初始化失败:", error);
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
  // 页面卸载前保存当前状态
  beforeDestroy() {
    this.stopListening();
  },
  // 页面隐藏时保存当前状态
  deactivated() {
    this.stopListening();
  },
  methods: {
    // 返回群组列表
    goBack() {
      common_vendor.index.navigateBack();
    },
    // 页面激活时恢复状态
    activated() {
      if (!common_auth.requireLogin())
        return;
      if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:205", "无效的群组ID，activated中停止执行:", this.id);
        this.showError = true;
        return;
      }
      this.userId = common_auth.getUserIdFromToken();
      this.loadUserProfile();
      this.$nextTick(() => {
        this.initWebSocketConnection().then(() => {
          this.loadChatHistory();
          this.startListening();
        }).catch((error) => {
          common_vendor.index.__f__("error", "at pages/group/chat.vue:220", "WebSocket初始化失败:", error);
          this.loadChatHistory();
        });
      });
    },
    async initWebSocketConnection() {
      if (!common_ws.isConnected()) {
        common_vendor.index.__f__("log", "at pages/group/chat.vue:228", "初始化WebSocket连接...");
        await common_ws.initWebSocket();
        common_vendor.index.__f__("log", "at pages/group/chat.vue:230", "WebSocket连接初始化完成");
      }
    },
    loadUserProfile() {
      this.nickname = common_auth.getUserNickname();
    },
    async loadChatHistory() {
      if (!this.hasMore || this.loadingMore)
        return;
      if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:243", "无效的群组ID:", this.id);
        common_vendor.index.showToast({
          title: "无效的群组ID",
          icon: "none"
        });
        return;
      }
      this.loadingMore = true;
      try {
        common_vendor.index.__f__("log", "at pages/group/chat.vue:253", "开始加载聊天历史，群组ID:", Number(this.id));
        const res = await common_api.apiGetGroupChatHistory(Number(this.id), 20);
        common_vendor.index.__f__("log", "at pages/group/chat.vue:255", "API响应:", res);
        common_vendor.index.__f__("log", "at pages/group/chat.vue:257", "API响应类型:", typeof res, Array.isArray(res));
        common_vendor.index.__f__("log", "at pages/group/chat.vue:258", "API响应内容:", res);
        let history;
        if (res && typeof res === "object" && "code" in res && "data" in res) {
          if (res.code === 200) {
            history = res.data || [];
            common_vendor.index.__f__("log", "at pages/group/chat.vue:265", "从ApiResponse.data获取消息数量:", history.length);
          } else {
            throw new Error(`API请求失败: ${res.message || "未知错误"}`);
          }
        } else if (Array.isArray(res)) {
          history = res;
          common_vendor.index.__f__("log", "at pages/group/chat.vue:273", "直接从数组获取消息数量:", history.length);
        } else {
          history = [];
          common_vendor.index.__f__("log", "at pages/group/chat.vue:277", "响应格式不匹配，使用空数组");
        }
        common_vendor.index.__f__("log", "at pages/group/chat.vue:279", "获取到历史消息数量:", history.length);
        if (history.length < 20) {
          this.hasMore = false;
        }
        history.forEach((msg) => {
          msg.isSelf = msg.userId === Number(this.userId);
          if (msg.createTime && typeof msg.createTime === "string") {
            msg.createTime = new Date(msg.createTime);
          } else if (!msg.createTime) {
            msg.createTime = /* @__PURE__ */ new Date();
          }
          if (!msg.type) {
            msg.type = msg.imageUrl ? "IMAGE" : "TEXT";
          } else {
            msg.type = msg.type.toUpperCase();
          }
        });
        const isGroupFirstLoad = this.firstLoadMap[this.id] === true;
        common_vendor.index.__f__("log", "at pages/group/chat.vue:305", "群组", this.id, "是否首次加载:", isGroupFirstLoad, "firstLoadMap状态:", this.firstLoadMap, "当前userId:", this.userId);
        if (isGroupFirstLoad) {
          this.messages = history;
          this.firstLoadMap[this.id] = false;
          common_vendor.index.__f__("log", "at pages/group/chat.vue:311", "首次加载，设置消息数量:", history.length);
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } else {
          const existingMessageIds = new Set(this.messages.map((msg) => msg.id));
          const newMessages = history.filter((msg) => msg.id && !existingMessageIds.has(msg.id));
          common_vendor.index.__f__("log", "at pages/group/chat.vue:321", "非首次加载，现有消息数量:", this.messages.length, "新消息数量:", newMessages.length);
          if (newMessages.length > 0) {
            this.messages = [...newMessages, ...this.messages];
            common_vendor.index.__f__("log", "at pages/group/chat.vue:324", "合并后消息数量:", this.messages.length);
          }
        }
        if (history.length > 0) {
          this.lastMessageId = Math.max(...history.map((msg) => msg.id));
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:334", "加载聊天历史失败:", e);
        common_vendor.index.showToast({
          title: "加载聊天历史失败: " + (e.message || "未知错误"),
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
    // HTTP方式发送消息（小程序环境使用）
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
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:393", "发送消息失败:", e);
        common_vendor.index.showToast({
          title: "发送失败",
          icon: "none"
        });
      }
    },
    // 选择图片并发送
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
          } catch (e) {
            common_vendor.index.__f__("error", "at pages/group/chat.vue:443", "图片发送失败:", e);
            common_vendor.index.showToast({ title: "图片发送失败", icon: "none" });
          } finally {
            common_vendor.index.hideLoading();
          }
        }
      });
    },
    startListening() {
      if (!this.id || isNaN(Number(this.id)) || Number(this.id) <= 0) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:455", "无效的群组ID，无法启动监听:", this.id);
        return;
      }
      if (isMiniProgram) {
        common_vendor.index.__f__("log", "at pages/group/chat.vue:461", "小程序环境，启动轮询获取新消息");
        this.startPolling();
        return;
      }
      common_vendor.index.__f__("log", "at pages/group/chat.vue:466", "检查WebSocket连接状态...");
      if (!common_ws.isConnected()) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:469", "WebSocket未连接，无法订阅消息");
        common_ws.initWebSocket().then(() => {
          common_vendor.index.__f__("log", "at pages/group/chat.vue:472", "WebSocket重新连接成功");
          this.subscription = common_ws.subscribeGroupChat(this.id, this.handleWsMessage);
        }).catch((error) => {
          common_vendor.index.__f__("error", "at pages/group/chat.vue:476", "WebSocket重新连接失败:", error);
        });
        return;
      }
      common_vendor.index.__f__("log", "at pages/group/chat.vue:481", "WebSocket已连接，开始订阅消息");
      this.subscription = common_ws.subscribeGroupChat(this.id, this.handleWsMessage);
    },
    // 启动轮询获取新消息（小程序环境）
    startPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
      }
      this.pollNewMessages();
      this.pollingTimer = setInterval(() => {
        this.pollNewMessages();
      }, this.pollingInterval);
      common_vendor.index.__f__("log", "at pages/group/chat.vue:500", "轮询已启动，间隔:", this.pollingInterval, "ms");
    },
    // 停止轮询
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
        common_vendor.index.__f__("log", "at pages/group/chat.vue:508", "轮询已停止");
      }
    },
    // 轮询获取新消息
    async pollNewMessages() {
      if (!this.lastMessageId || this.lastMessageId <= 0) {
        return;
      }
      try {
        const newMessages = await common_api.apiGetLatestMessages(Number(this.id), this.lastMessageId);
        if (newMessages && Array.isArray(newMessages) && newMessages.length > 0) {
          common_vendor.index.__f__("log", "at pages/group/chat.vue:522", "轮询获取到新消息:", newMessages.length);
          newMessages.forEach((msg) => {
            const exists = this.messages.some((m) => m.id === msg.id);
            if (!exists) {
              const newMessage = {
                id: msg.id,
                groupId: msg.groupId,
                userId: msg.userId,
                nickname: msg.nickname,
                content: msg.content,
                imageUrl: msg.imageUrl,
                type: msg.type || "TEXT",
                createTime: msg.createTime && typeof msg.createTime === "string" ? new Date(msg.createTime) : msg.createTime || /* @__PURE__ */ new Date(),
                isSelf: msg.userId === Number(this.userId)
              };
              this.messages.push(newMessage);
            }
          });
          this.lastMessageId = Math.max(...newMessages.map((m) => m.id));
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:553", "轮询获取新消息失败:", e);
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
      common_vendor.index.__f__("log", "at pages/group/chat.vue:569", "收到WebSocket消息:", payload);
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
      const d = new Date(date);
      const now = /* @__PURE__ */ new Date();
      if (d.toDateString() === now.toDateString()) {
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return `昨天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
      return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    },
    // 预览图片
    previewImage(url) {
      common_vendor.index.previewImage({
        urls: [url],
        current: url
      });
    },
    // 标记消息为已读
    markMessagesAsRead() {
      if (!this.id || !this.userId) {
        common_vendor.index.__f__("warn", "at pages/group/chat.vue:640", "群组ID或用户ID缺失，无法标记消息为已读");
        return;
      }
      common_vendor.index.__f__("log", "at pages/group/chat.vue:644", "准备标记群组消息为已读:", this.id, "用户ID:", this.userId);
      common_api.apiMarkGroupRead(Number(this.id), Number(this.userId)).then((response) => {
        common_vendor.index.__f__("log", "at pages/group/chat.vue:648", "标记群组消息为已读成功:", this.id, "响应:", response);
      }).catch((error) => {
        common_vendor.index.__f__("error", "at pages/group/chat.vue:651", "标记群组消息为已读失败:", this.id, "错误:", error);
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
    b: common_vendor.o((...args) => $options.goBack && $options.goBack(...args))
  } : common_vendor.e({
    c: $data.loadingMore
  }, $data.loadingMore ? {} : {}, {
    d: common_vendor.f($data.messages, (message, index, i0) => {
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
    e: $data.scrollTop,
    f: common_vendor.o((...args) => $options.onScroll && $options.onScroll(...args)),
    g: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args)),
    h: common_vendor.o((...args) => $options.sendMessage && $options.sendMessage(...args)),
    i: $data.inputFocus,
    j: $data.inputMessage,
    k: common_vendor.o(($event) => $data.inputMessage = $event.detail.value),
    l: !$data.inputMessage.trim() ? 1 : "",
    m: !$data.inputMessage.trim(),
    n: common_vendor.o((...args) => $options.sendMessage && $options.sendMessage(...args))
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-394fd9eb"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/group/chat.js.map
