"use strict";
const common_vendor = require("./vendor.js");
const common_auth = require("./auth.js");
let ws = null;
let connected = false;
let heartbeatTimer = null;
let subscribedGroupId = null;
let messageCallback = null;
const CONFIG = {
  // WebSocket 服务器地址
  WS_URL: "ws://localhost:8080/ws/native",
  // 心跳间隔（毫秒）
  HEARTBEAT_INTERVAL: 3e4,
  // 重连间隔（毫秒）
  RECONNECT_INTERVAL: 5e3,
  // 最大重连次数
  MAX_RECONNECT: 5
};
let reconnectCount = 0;
function initNativeWebSocket() {
  return new Promise((resolve, reject) => {
    const token = common_auth.getToken();
    if (!token) {
      common_vendor.index.__f__("error", "at common/ws-native.js:53", "[NativeWS] 未找到认证令牌");
      reject(new Error("未找到认证令牌"));
      return;
    }
    if (connected && ws) {
      common_vendor.index.__f__("log", "at common/ws-native.js:60", "[NativeWS] 已连接，无需重复初始化");
      resolve();
      return;
    }
    if (ws) {
      ws.close();
    }
    const url = `${CONFIG.WS_URL}?token=${encodeURIComponent(token)}`;
    common_vendor.index.__f__("log", "at common/ws-native.js:72", "[NativeWS] 连接:", url);
    ws = common_vendor.index.connectSocket({
      url,
      success: () => {
        common_vendor.index.__f__("log", "at common/ws-native.js:82", "[NativeWS] 小程序 WebSocket 连接创建成功");
      }
    });
    bindEvents(resolve, reject);
  });
}
function bindEvents(resolve, reject) {
  ws.onOpen((res) => {
    onOpen(res, resolve);
  });
  ws.onMessage((res) => {
    onMessage(res.data);
  });
  ws.onClose((res) => {
    onClose(res);
  });
  ws.onError((error) => {
    onError(error, reject);
  });
}
function onOpen(event, resolve) {
  common_vendor.index.__f__("log", "at common/ws-native.js:131", "[NativeWS] 连接成功");
  connected = true;
  reconnectCount = 0;
  startHeartbeat();
  if (subscribedGroupId) {
    subscribeGroup(subscribedGroupId);
  }
  resolve();
}
function onMessage(data) {
  common_vendor.index.__f__("log", "at common/ws-native.js:150", "[NativeWS] 收到消息:", data);
  try {
    const message = JSON.parse(data);
    if (message.type === "pong") {
      return;
    }
    if (message.type === "CONNECTED") {
      common_vendor.index.__f__("log", "at common/ws-native.js:162", "[NativeWS] 服务器确认连接:", message.message);
      return;
    }
    if (message.type === "SUBSCRIBED") {
      common_vendor.index.__f__("log", "at common/ws-native.js:168", "[NativeWS] 订阅成功:", message.groupId);
      return;
    }
    if (messageCallback) {
      messageCallback(message);
    }
    common_vendor.index.$emit("ws-native-message", message);
  } catch (e) {
    common_vendor.index.__f__("error", "at common/ws-native.js:181", "[NativeWS] 解析消息失败:", e);
  }
}
function onClose(event) {
  common_vendor.index.__f__("log", "at common/ws-native.js:189", "[NativeWS] 连接关闭:", event);
  connected = false;
  stopHeartbeat();
  if (reconnectCount < CONFIG.MAX_RECONNECT) {
    reconnectCount++;
    common_vendor.index.__f__("log", "at common/ws-native.js:196", `[NativeWS] ${CONFIG.RECONNECT_INTERVAL / 1e3}秒后重连 (${reconnectCount}/${CONFIG.MAX_RECONNECT})`);
    setTimeout(() => {
      initNativeWebSocket().catch(() => {
      });
    }, CONFIG.RECONNECT_INTERVAL);
  } else {
    common_vendor.index.__f__("error", "at common/ws-native.js:201", "[NativeWS] 重连次数已达上限");
  }
}
function onError(error, reject) {
  common_vendor.index.__f__("error", "at common/ws-native.js:209", "[NativeWS] 连接错误:", error);
  if (reject) {
    reject(error);
  }
}
function subscribeGroup(groupId) {
  if (!ws || !connected) {
    common_vendor.index.__f__("warn", "at common/ws-native.js:220", "[NativeWS] 未连接，无法订阅");
    subscribedGroupId = groupId;
    return false;
  }
  subscribedGroupId = groupId;
  const message = {
    action: "subscribe",
    groupId
  };
  sendMessage(message);
  common_vendor.index.__f__("log", "at common/ws-native.js:234", "[NativeWS] 发送订阅请求:", groupId);
  return true;
}
function unsubscribeGroup() {
  if (!ws || !connected) {
    return;
  }
  const message = {
    action: "unsubscribe"
  };
  sendMessage(message);
  subscribedGroupId = null;
  common_vendor.index.__f__("log", "at common/ws-native.js:252", "[NativeWS] 取消订阅");
}
function setMessageCallback(callback) {
  messageCallback = callback;
}
function sendMessage(message) {
  if (!ws || !connected) {
    common_vendor.index.__f__("warn", "at common/ws-native.js:267", "[NativeWS] 未连接，无法发送消息");
    return false;
  }
  try {
    const json = JSON.stringify(message);
    ws.send({
      data: json
    });
    return true;
  } catch (e) {
    common_vendor.index.__f__("error", "at common/ws-native.js:286", "[NativeWS] 发送消息失败:", e);
    return false;
  }
}
function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    sendMessage({ action: "ping" });
  }, CONFIG.HEARTBEAT_INTERVAL);
}
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
function isConnected() {
  return connected;
}
exports.initNativeWebSocket = initNativeWebSocket;
exports.isConnected = isConnected;
exports.setMessageCallback = setMessageCallback;
exports.subscribeGroup = subscribeGroup;
exports.unsubscribeGroup = unsubscribeGroup;
//# sourceMappingURL=../../.sourcemap/mp-weixin/common/ws-native.js.map
