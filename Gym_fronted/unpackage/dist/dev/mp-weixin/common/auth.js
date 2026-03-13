"use strict";
const common_vendor = require("./vendor.js");
const TOKEN_KEY = "gym_token";
const USER_INFO_KEY = "gym_user_info";
function setToken(token) {
  common_vendor.index.setStorageSync(TOKEN_KEY, token || "");
}
function getToken() {
  return common_vendor.index.getStorageSync(TOKEN_KEY) || "";
}
function clearToken() {
  common_vendor.index.removeStorageSync(TOKEN_KEY);
}
function getUserIdFromToken() {
  const token = getToken();
  if (!token)
    return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2)
      return null;
    const payload = JSON.parse(
      decodeURIComponent(
        escape(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        )
      )
    );
    return payload.sub ? Number(payload.sub) : null;
  } catch (e) {
    common_vendor.index.__f__("error", "at common/auth.js:74", "解析 Token 失败:", e);
    return null;
  }
}
function setUserInfo(userInfo) {
  common_vendor.index.setStorageSync(USER_INFO_KEY, userInfo || {});
}
function getUserInfo() {
  return common_vendor.index.getStorageSync(USER_INFO_KEY) || {};
}
function getUserNickname() {
  const userInfo = getUserInfo();
  return userInfo.nickname || "用户" + getUserIdFromToken();
}
function requireLogin() {
  const token = getToken();
  if (!token) {
    common_vendor.index.showToast({ title: "请先登录", icon: "none" });
    setTimeout(() => {
      common_vendor.index.reLaunch({ url: "/pages/auth/login" });
    }, 500);
    return false;
  }
  return true;
}
exports.clearToken = clearToken;
exports.getToken = getToken;
exports.getUserIdFromToken = getUserIdFromToken;
exports.getUserNickname = getUserNickname;
exports.requireLogin = requireLogin;
exports.setToken = setToken;
exports.setUserInfo = setUserInfo;
//# sourceMappingURL=../../.sourcemap/mp-weixin/common/auth.js.map
