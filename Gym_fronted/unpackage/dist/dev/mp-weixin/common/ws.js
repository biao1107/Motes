"use strict";
const common_vendor = require("./vendor.js");
const common_auth = require("./auth.js");
const isH5 = typeof window !== "undefined" && typeof document !== "undefined";
const isMiniProgram = typeof common_vendor.wx$1 !== "undefined" && common_vendor.wx$1.getSystemInfoSync;
let Stomp = null;
if (isH5 && typeof window !== "undefined") {
  Stomp = window.Stomp;
}
async function initStomp() {
  if (isMiniProgram) {
    common_vendor.index.__f__("warn", "at common/ws.js:19", "小程序环境暂不支持WebSocket STOMP");
    return Promise.reject(new Error("小程序环境暂不支持WebSocket STOMP"));
  }
  if (Stomp && typeof Stomp.over === "function") {
    return Stomp;
  }
  if (window._stompLoadingPromise) {
    return window._stompLoadingPromise;
  }
  window._stompLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/static/js/stomp.umd.min.js";
    script.onload = () => {
      Stomp = window.Stomp || window["Stomp"] || window["@stomp/stompjs"];
      if (Stomp && typeof Stomp.over === "function") {
        common_vendor.index.__f__("log", "at common/ws.js:42", "STOMP库加载成功");
        resolve(Stomp);
      } else {
        common_vendor.index.__f__("error", "at common/ws.js:45", "STOMP库加载失败，未找到Stomp对象");
        reject(new Error("STOMP库加载失败，未找到Stomp对象"));
      }
      window._stompLoadingPromise = null;
    };
    script.onerror = (error) => {
      common_vendor.index.__f__("error", "at common/ws.js:52", "STOMP库加载失败:", error);
      reject(new Error("STOMP库加载失败"));
      window._stompLoadingPromise = null;
    };
    document.head.appendChild(script);
  });
  return window._stompLoadingPromise;
}
let stompClient = null;
let connected = false;
let heartbeatTimer = null;
let messageListeners = [];
function broadcastMessage(payload) {
  messageListeners.forEach((callback) => {
    try {
      callback(payload);
    } catch (e) {
      common_vendor.index.__f__("error", "at common/ws.js:90", "消息监听者处理失败:", e);
    }
  });
}
async function initWebSocket() {
  if (isMiniProgram) {
    common_vendor.index.__f__("log", "at common/ws.js:99", "小程序环境，跳过WebSocket STOMP初始化");
    return Promise.resolve();
  }
  try {
    await initStomp();
    if (stompClient && connected) {
      common_vendor.index.__f__("log", "at common/ws.js:108", "WebSocket已连接，无需重复初始化");
      return Promise.resolve();
    }
    const token = common_auth.getToken();
    if (!token) {
      common_vendor.index.__f__("error", "at common/ws.js:114", "未找到认证令牌，无法初始化WebSocket");
      return Promise.reject(new Error("未找到认证令牌"));
    }
    if (!Stomp || typeof Stomp.over !== "function") {
      common_vendor.index.__f__("error", "at common/ws.js:120", "STOMP库未正确定义:", Stomp);
      return Promise.reject(new Error("STOMP库未正确定义"));
    }
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.hostname}:8080/ws?token=${encodeURIComponent(token)}`;
      const socket = new WebSocket(wsUrl, [
        "v12.stomp",
        "v11.stomp",
        "v10.stomp"
      ]);
      stompClient = Stomp.over(socket);
      stompClient.debug = null;
      const timeout = setTimeout(() => {
        common_vendor.index.__f__("error", "at common/ws.js:141", "WebSocket连接超时");
        cleanupConnection();
        reject(new Error("WebSocket连接超时"));
      }, 15e3);
      const connectHeaders = {
        "Authorization": `Bearer ${token}`,
        "heart-beat": "30000,30000",
        // 心跳设置
        "accept-version": "1.1,1.2"
      };
      stompClient.connect(connectHeaders, (frame) => {
        clearTimeout(timeout);
        common_vendor.index.__f__("log", "at common/ws.js:155", "WebSocket连接成功:", frame);
        connected = true;
        startHeartbeat();
        socket.onclose = (event) => {
          common_vendor.index.__f__("log", "at common/ws.js:163", "WebSocket连接已关闭:", event);
          cleanupConnection();
        };
        socket.onerror = (error) => {
          common_vendor.index.__f__("error", "at common/ws.js:169", "WebSocket错误:", error);
          cleanupConnection();
        };
        setTimeout(() => {
          subscribeUserMessages((payload) => {
            broadcastMessage(payload);
          });
        }, 100);
        resolve(frame);
      }, (error) => {
        clearTimeout(timeout);
        common_vendor.index.__f__("error", "at common/ws.js:185", "WebSocket连接失败:", error);
        cleanupConnection();
        reject(error);
      });
    });
  } catch (error) {
    common_vendor.index.__f__("error", "at common/ws.js:191", "初始化WebSocket时发生异常:", error);
    return Promise.reject(error);
  }
}
function startHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  heartbeatTimer = setInterval(() => {
    if (stompClient && stompClient.connected) {
      try {
        stompClient.send("/app/heartbeat", {}, "{}");
      } catch (e) {
        common_vendor.index.__f__("error", "at common/ws.js:208", "心跳检测失败:", e);
        cleanupConnection();
      }
    } else {
      common_vendor.index.__f__("log", "at common/ws.js:212", "STOMP客户端未连接，清理连接状态");
      cleanupConnection();
    }
  }, 3e4);
}
function cleanupConnection() {
  connected = false;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  common_vendor.index.__f__("log", "at common/ws.js:225", "WebSocket连接状态已清理");
}
function sendFrame(command, headers, body) {
  if (!stompClient || !connected) {
    common_vendor.index.__f__("error", "at common/ws.js:231", "WebSocket未连接，无法发送消息");
    return;
  }
  try {
    if (!headers.destination) {
      common_vendor.index.__f__("error", "at common/ws.js:238", "缺少destination属性");
      return;
    }
    stompClient.send(headers.destination, headers, body);
    common_vendor.index.__f__("log", "at common/ws.js:243", "STOMP帧发送成功:", command, headers, body);
  } catch (e) {
    common_vendor.index.__f__("error", "at common/ws.js:245", "STOMP帧发送失败:", e);
    cleanupConnection();
  }
}
function subscribeGroupChat(groupId, callback) {
  if (isMiniProgram) {
    common_vendor.index.__f__("log", "at common/ws.js:254", "小程序环境，不支持订阅组聊天");
    return null;
  }
  if (!stompClient || !connected) {
    common_vendor.index.__f__("error", "at common/ws.js:259", "WebSocket未连接，无法订阅消息");
    return null;
  }
  const token = common_auth.getToken();
  const destination = `/topic/group/${groupId}`;
  common_vendor.index.__f__("log", "at common/ws.js:265", "订阅组聊天消息:", destination);
  const headers = {
    "Authorization": `Bearer ${token}`,
    "content-type": "application/json"
  };
  return stompClient.subscribe(destination, (message) => {
    common_vendor.index.__f__("log", "at common/ws.js:274", "收到组聊天消息:", message);
    try {
      const payload = JSON.parse(message.body);
      callback(payload);
    } catch (e) {
      common_vendor.index.__f__("error", "at common/ws.js:279", "解析消息失败:", e);
    }
  }, headers);
}
function sendChatMessage(groupId, content, imageUrl = "", type = "TEXT") {
  if (isMiniProgram) {
    common_vendor.index.__f__("log", "at common/ws.js:288", "小程序环境，不支持发送聊天消息");
    return;
  }
  if (!stompClient || !connected) {
    common_vendor.index.__f__("error", "at common/ws.js:293", "WebSocket未连接，无法发送聊天消息");
    return;
  }
  doSendChatMessage(groupId, content, imageUrl, type);
}
function doSendChatMessage(groupId, content, imageUrl = "", type = "TEXT") {
  const token = common_auth.getToken();
  const message = {
    groupId: parseInt(groupId),
    content,
    imageUrl,
    type
  };
  const destination = "/app/group/chat";
  const headers = {
    "destination": destination,
    "Authorization": `Bearer ${token}`,
    // 使用标准的Authorization头部
    "content-type": "application/json"
  };
  const body = JSON.stringify(message);
  common_vendor.index.__f__("log", "at common/ws.js:318", "发送聊天消息:", destination, headers, body);
  sendFrame("SEND", headers, body);
}
function isConnected() {
  if (isMiniProgram) {
    return false;
  }
  if (connected && stompClient && stompClient.connected) {
    return true;
  } else if (connected) {
    common_vendor.index.__f__("log", "at common/ws.js:358", "检测到连接状态不一致，清理连接状态");
    cleanupConnection();
    return false;
  }
  return false;
}
let userSubscription = null;
function subscribeUserMessages(callback) {
  if (isMiniProgram) {
    common_vendor.index.__f__("log", "at common/ws.js:370", "小程序环境，不支持订阅个人消息");
    return null;
  }
  if (!stompClient || !connected) {
    common_vendor.index.__f__("error", "at common/ws.js:375", "WebSocket未连接，无法订阅个人消息");
    return null;
  }
  if (userSubscription) {
    common_vendor.index.__f__("log", "at common/ws.js:381", "取消之前的个人消息订阅");
    userSubscription.unsubscribe();
    userSubscription = null;
  }
  const token = common_auth.getToken();
  const userId = common_auth.getUserIdFromToken();
  if (!userId) {
    common_vendor.index.__f__("error", "at common/ws.js:389", "无法获取用户ID，无法订阅个人消息");
    return null;
  }
  const destination = `/user/${userId}/notification`;
  common_vendor.index.__f__("log", "at common/ws.js:394", "订阅个人消息:", destination);
  const headers = {
    "Authorization": `Bearer ${token}`,
    "content-type": "application/json"
  };
  userSubscription = stompClient.subscribe(destination, (message) => {
    common_vendor.index.__f__("log", "at common/ws.js:403", "收到个人消息:", message);
    try {
      const payload = JSON.parse(message.body);
      broadcastMessage(payload);
      callback(payload);
    } catch (e) {
      common_vendor.index.__f__("error", "at common/ws.js:410", "解析个人消息失败:", e);
    }
  }, headers);
  return userSubscription;
}
exports.initWebSocket = initWebSocket;
exports.isConnected = isConnected;
exports.sendChatMessage = sendChatMessage;
exports.subscribeGroupChat = subscribeGroupChat;
//# sourceMappingURL=../../.sourcemap/mp-weixin/common/ws.js.map
