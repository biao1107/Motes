"use strict";
const common_vendor = require("./vendor.js");
const common_http = require("./http.js");
const common_config = require("./config.js");
function apiRegister(data) {
  return common_http.post("/auth/register", data);
}
function apiLoginByPassword(data) {
  return common_http.post("/auth/login", data);
}
function apiLoginByCode(data) {
  return common_http.post("/auth/login/code", data);
}
function apiSendCode(data) {
  return common_http.post("/auth/send-code", data);
}
function apiGetProfile() {
  return common_http.get("/user/profile");
}
function apiGetUserInfo() {
  return common_http.get("/user/info");
}
function apiUpdateProfile(data) {
  return common_http.put("/user/profile", data);
}
function apiGetTopMatch(limit = 3) {
  return common_http.get(`/match/top?limit=${limit}`);
}
function apiCreateGroup(data) {
  return common_http.post("/group/create", data);
}
function apiInviteToGroupByUsername(data) {
  return common_http.post("/group/invite-by-username", data);
}
function apiAcceptInvite(data) {
  return common_http.post("/group/accept", data);
}
function apiRejectInvite(data) {
  return common_http.post("/group/reject", data);
}
function apiMyGroups() {
  return common_http.get("/group/my-groups");
}
function apiGetInvitations() {
  return common_http.get("/group/invitations");
}
function apiGroupDetailWithMembers(groupId) {
  return common_http.get(`/group/${groupId}/detail`);
}
function apiDeleteGroup(groupId) {
  return new Promise((resolve, reject) => {
    common_vendor.index.request({
      url: `${common_config.BASE_URL}/group/${groupId}`,
      method: "DELETE",
      header: {
        "Content-Type": "application/json",
        "Authorization": common_vendor.index.getStorageSync("gym_token") ? `Bearer ${common_vendor.index.getStorageSync("gym_token")}` : ""
      },
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}
function apiTrainingStart(data) {
  return common_http.post("/training/start", data);
}
function apiTrainingReport(data) {
  return common_http.post("/training/report", data);
}
function apiTrainingAbandon(data) {
  return common_http.post("/training/abandon", data);
}
function apiGetTodayTraining() {
  return common_http.get("/training/today");
}
function apiGetTodoCount() {
  return common_http.get("/training/todo/count");
}
function apiChallengeCreate(data) {
  return common_http.post("/challenge/create", data);
}
function apiChallengeJoin(data) {
  return common_http.post("/challenge/join", data);
}
function apiChallengePunch(data) {
  return common_http.post("/challenge/punch", data);
}
function apiChallengeList(params = {}) {
  return common_http.get("/challenge/list", params);
}
function apiChallengeDetail(id) {
  return common_http.get(`/challenge/${id}`);
}
function apiChallengeReport(id) {
  return common_http.get(`/challenge/${id}/report`);
}
function apiCheckChallengeParticipation(challengeId) {
  return common_http.get(`/challenge/${challengeId}/participation`);
}
function apiStatPersonal() {
  return common_http.get("/stat/personal");
}
function apiStatHome() {
  return common_http.get("/stat/home");
}
function apiStatGroup(params) {
  return common_http.get("/stat/group", params);
}
function apiStatChallenge(params) {
  return common_http.get("/stat/challenge", params);
}
function apiGetGroupChatHistory(groupId, limit = 50) {
  return common_http.get(`/chat/group/${groupId}/history?limit=${limit}`);
}
function apiGetUnreadCount(userId) {
  return common_http.get(`/chat/unread/count?userId=${userId}`);
}
function apiGetUnreadDetail(userId) {
  return common_http.get(`/chat/unread/detail?userId=${userId}`);
}
function apiMarkGroupRead(groupId, userId) {
  return common_http.post(`/chat/group/${groupId}/read?userId=${userId}`, {});
}
function apiUploadAction(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath || typeof filePath !== "string") {
      reject(new Error("Invalid file path"));
      return;
    }
    common_vendor.index.uploadFile({
      url: common_config.BASE_URL + "/storage/upload/action",
      filePath,
      // 要上传的文件路径
      name: "file",
      // 后端接收文件的字段名
      header: {
        // 携带 JWT Token 进行身份认证
        "Authorization": common_vendor.index.getStorageSync("gym_token") ? `Bearer ${common_vendor.index.getStorageSync("gym_token")}` : ""
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data || "{}");
          resolve(data);
        } catch (e) {
          resolve(res.data);
        }
      },
      fail: reject
      // 上传失败时拒绝 Promise
    });
  });
}
function apiGetFileUrl(params) {
  return common_http.get("/storage/url", params);
}
function apiUploadAvatar(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath || typeof filePath !== "string") {
      reject(new Error("Invalid file path"));
      return;
    }
    common_vendor.index.uploadFile({
      url: common_config.BASE_URL + "/storage/upload/avatar",
      filePath,
      name: "file",
      header: {
        "Authorization": common_vendor.index.getStorageSync("gym_token") ? `Bearer ${common_vendor.index.getStorageSync("gym_token")}` : ""
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data || "{}");
          resolve(data);
        } catch (e) {
          resolve(res.data);
        }
      },
      fail: reject
    });
  });
}
function apiCreateGroupChallenge(data) {
  return common_http.post("/challenge/create-group-challenge", data);
}
function apiGetGroupChallenges(groupId) {
  return common_http.get(`/challenge/group/${groupId}`);
}
function apiUpdateChallengeStatus() {
  return common_http.post("/challenge/update-status", {});
}
function apiGetCourseList(page = 1, size = 10, courseType = null, difficulty = null) {
  let url = `/course/list?page=${page}&size=${size}`;
  if (courseType)
    url += `&courseType=${courseType}`;
  if (difficulty)
    url += `&difficulty=${difficulty}`;
  return common_http.get(url);
}
function apiGetCourseById(id) {
  return common_http.get(`/course/${id}`);
}
function apiGetRecommendCourses(limit = 6) {
  return common_http.get(`/course/recommend?limit=${limit}`);
}
function apiSearchCourses(keyword, page = 1, size = 10) {
  return common_http.get(`/course/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`);
}
exports.apiAcceptInvite = apiAcceptInvite;
exports.apiChallengeCreate = apiChallengeCreate;
exports.apiChallengeDetail = apiChallengeDetail;
exports.apiChallengeJoin = apiChallengeJoin;
exports.apiChallengeList = apiChallengeList;
exports.apiChallengePunch = apiChallengePunch;
exports.apiChallengeReport = apiChallengeReport;
exports.apiCheckChallengeParticipation = apiCheckChallengeParticipation;
exports.apiCreateGroup = apiCreateGroup;
exports.apiCreateGroupChallenge = apiCreateGroupChallenge;
exports.apiDeleteGroup = apiDeleteGroup;
exports.apiGetCourseById = apiGetCourseById;
exports.apiGetCourseList = apiGetCourseList;
exports.apiGetFileUrl = apiGetFileUrl;
exports.apiGetGroupChallenges = apiGetGroupChallenges;
exports.apiGetGroupChatHistory = apiGetGroupChatHistory;
exports.apiGetInvitations = apiGetInvitations;
exports.apiGetProfile = apiGetProfile;
exports.apiGetRecommendCourses = apiGetRecommendCourses;
exports.apiGetTodayTraining = apiGetTodayTraining;
exports.apiGetTodoCount = apiGetTodoCount;
exports.apiGetTopMatch = apiGetTopMatch;
exports.apiGetUnreadCount = apiGetUnreadCount;
exports.apiGetUnreadDetail = apiGetUnreadDetail;
exports.apiGetUserInfo = apiGetUserInfo;
exports.apiGroupDetailWithMembers = apiGroupDetailWithMembers;
exports.apiInviteToGroupByUsername = apiInviteToGroupByUsername;
exports.apiLoginByCode = apiLoginByCode;
exports.apiLoginByPassword = apiLoginByPassword;
exports.apiMarkGroupRead = apiMarkGroupRead;
exports.apiMyGroups = apiMyGroups;
exports.apiRegister = apiRegister;
exports.apiRejectInvite = apiRejectInvite;
exports.apiSearchCourses = apiSearchCourses;
exports.apiSendCode = apiSendCode;
exports.apiStatChallenge = apiStatChallenge;
exports.apiStatGroup = apiStatGroup;
exports.apiStatHome = apiStatHome;
exports.apiStatPersonal = apiStatPersonal;
exports.apiTrainingAbandon = apiTrainingAbandon;
exports.apiTrainingReport = apiTrainingReport;
exports.apiTrainingStart = apiTrainingStart;
exports.apiUpdateChallengeStatus = apiUpdateChallengeStatus;
exports.apiUpdateProfile = apiUpdateProfile;
exports.apiUploadAction = apiUploadAction;
exports.apiUploadAvatar = apiUploadAvatar;
//# sourceMappingURL=../../.sourcemap/mp-weixin/common/api.js.map
