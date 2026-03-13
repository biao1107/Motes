"use strict";
const common_vendor = require("./vendor.js");
const common_config = require("./config.js");
const common_auth = require("./auth.js");
function request({ url, method = "GET", data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    const token = common_auth.getToken();
    const finalHeader = Object.assign(
      {
        "Content-Type": "application/json"
      },
      header
    );
    if (token) {
      finalHeader["Authorization"] = "Bearer " + token;
    }
    common_vendor.index.request({
      url: common_config.BASE_URL + url,
      // 完整URL = 基础地址 + 相对路径
      method,
      data,
      header: finalHeader,
      success(res) {
        if (res.statusCode === 401) {
          common_auth.clearToken();
          common_vendor.index.showToast({ title: "登录已过期，请重新登录", icon: "none" });
          setTimeout(() => {
            common_vendor.index.reLaunch({ url: "/pages/auth/login" });
          }, 800);
          return reject(res);
        }
        const body = res.data || {};
        if (typeof body.code === "number") {
          if (body.code === 0) {
            resolve(body.data);
          } else {
            common_vendor.index.showToast({ title: body.message || "请求失败", icon: "none" });
            reject(body);
          }
        } else {
          resolve(body);
        }
      },
      fail(err) {
        common_vendor.index.showToast({ title: "网络异常", icon: "none" });
        reject(err);
      }
    });
  });
}
function get(url, params = {}) {
  const queryArray = [];
  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== void 0 && params[key] !== null) {
      queryArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    }
  }
  const queryString = queryArray.join("&");
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  return request({ url: fullUrl, method: "GET" });
}
function post(url, data = {}) {
  return request({ url, method: "POST", data });
}
function put(url, data = {}) {
  return request({ url, method: "PUT", data });
}
exports.get = get;
exports.post = post;
exports.put = put;
//# sourceMappingURL=../../.sourcemap/mp-weixin/common/http.js.map
