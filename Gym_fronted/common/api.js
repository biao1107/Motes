/**
 * ============================================
 * API 接口封装模块
 * ============================================
 * 作用：
 * 封装所有后端接口调用，提供统一的 API 调用方式
 * 
 * 模块分类：
 * 1. 认证模块：注册、登录、验证码
 * 2. 用户模块：用户信息、档案管理
 * 3. 匹配模块：健身搭子匹配
 * 4. 组管理模块：创建组、邀请成员、组详情
 * 5. 训练模块：训练记录、打卡
 * 6. 挑战模块：创建挑战、加入挑战、打卡
 * 7. 统计模块：个人统计、组统计、挑战统计
 * 8. 聊天模块：聊天历史、未读消息
 * 9. 文件模块：文件上传、头像上传
 * 10. 课程模块：课程列表、课程详情、推荐课程
 * 
 * 注意事项：
 * - 所有函数返回 Promise
 * - 请求成功时直接返回 data 字段
 * - 请求失败时会自动显示错误信息
 * ============================================
 */

import { get, post, put } from './http.js';
import { BASE_URL } from './config.js';

// ==================== 认证模块 ====================

/**
 * 用户注册
 * @param {Object} data - 注册信息
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @param {string} data.phone - 手机号
 * @returns {Promise}
 */
export function apiRegister(data) {
	return post('/auth/register', data);
}

/**
 * 密码登录
 * @param {Object} data - 登录信息
 * @param {string} data.username - 用户名
 * @param {string} data.password - 密码
 * @returns {Promise<{token: string}>} 返回 JWT Token
 */
export function apiLoginByPassword(data) {
	return post('/auth/login', data);
}

/**
 * 验证码登录
 * @param {Object} data - 登录信息
 * @param {string} data.phone - 手机号
 * @param {string} data.code - 验证码
 * @returns {Promise<{token: string}>}
 */
export function apiLoginByCode(data) {
	return post('/auth/login/code', data);
}

/**
 * 发送验证码
 * @param {Object} data - 请求信息
 * @param {string} data.phone - 手机号
 * @returns {Promise}
 */
export function apiSendCode(data) {
	return post('/auth/send-code', data);
}

// ==================== 用户模块 ====================

/**
 * 获取用户档案（详细信息）
 * @returns {Promise<Object>} 用户档案对象
 */
export function apiGetProfile() {
	return get('/user/profile');
}

export function apiGetUserInfo() {
	return get('/user/info');
}

export function apiUpdateProfile(data) {
	return put('/user/profile', data);
}

// 匹配
export function apiGetTopMatch(limit = 3) {
	return get(`/match/top?limit=${limit}`);
}

// 组管理
export function apiCreateGroup(data) {
	return post('/group/create', data);
}
export function apiInviteToGroupByUsername(data) {
	return post('/group/invite-by-username', data);
}

export function apiAcceptInvite(data) {
	return post('/group/accept', data);
}

export function apiRejectInvite(data) {
	return post('/group/reject', data);
}

export function apiMyGroups() {
	return get('/group/my-groups');
}

export function apiGetInvitations() {
	return get('/group/invitations');
}
export function apiGroupDetailWithMembers(groupId) {
	return get(`/group/${groupId}/detail`);
}

export function apiDeleteGroup(groupId) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${BASE_URL}/group/${groupId}`,
			method: 'DELETE',
			header: {
				'Content-Type': 'application/json',
				'Authorization': uni.getStorageSync('gym_token') ? `Bearer ${uni.getStorageSync('gym_token')}` : ''
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

// 训练
export function apiTrainingStart(data) {
	return post('/training/start', data);
}

export function apiTrainingReport(data) {
	return post('/training/report', data);
}

export function apiTrainingAbandon(data) {
	return post('/training/abandon', data);
}

// 新增：挑战打卡接口
export function apiTrainingPunchChallenge(data) {
	return post('/challenge/punch', data);
}

// 新增：获取用户挑战列表接口
export function apiGetUserTrainingChallenges(params) {
	return get('/training/user-challenges', params);
}

// 新增：获取今日训练记录
export function apiGetTodayTraining() {
	return get('/training/today');
}

// 新增：获取今日待办训练任务数量
export function apiGetTodoCount() {
	return get('/training/todo/count');
}

// 挑战
export function apiChallengeCreate(data) {
	return post('/challenge/create', data);
}

export function apiChallengeJoin(data) {
	return post('/challenge/join', data);
}

export function apiChallengePunch(data) {
	return post('/challenge/punch', data);
}

export function apiChallengeList(params = {}) {
	return get('/challenge/list', params);
}

export function apiChallengeDetail(id) {
	return get(`/challenge/${id}`);
}

export function apiChallengeReport(id) {
	return get(`/challenge/${id}/report`);
}

export function apiCheckChallengeParticipation(challengeId) {
	return get(`/challenge/${challengeId}/participation`);
}

// 统计
export function apiStatPersonal() {
	return get('/stat/personal');
}

// 首页统计数据
export function apiStatHome() {
	return get('/stat/home');
}

export function apiStatGroup(params) {
	return get('/stat/group', params);
}

export function apiStatChallenge(params) {
	return get('/stat/challenge', params);
}

// 聊天
export function apiGetGroupChatHistory(groupId, limit = 50) {
	return get(`/chat/group/${groupId}/history?limit=${limit}`);
}

export function apiGetLatestMessages(groupId, lastMessageId) {
	return get(`/chat/group/${groupId}/latest?lastMessageId=${lastMessageId}`);
}

// 获取未读消息数量
export function apiGetUnreadCount(userId) {
	return get(`/chat/unread/count?userId=${userId}`);
}

// 获取未读消息详情列表
export function apiGetUnreadDetail(userId) {
	return get(`/chat/unread/detail?userId=${userId}`);
}

// 标记群组消息为已读
export function apiMarkGroupRead(groupId, userId) {
	return post(`/chat/group/${groupId}/read?userId=${userId}`, {});
}

// 发送聊天消息（小程序专用HTTP接口）
export function apiSendChatMessage(data) {
	return post('/chat/send', data);
}

// 重置群组消息阅读状态
export function apiResetGroupReadStatus(groupId, userId) {
	return post(`/chat/group/${groupId}/reset-read?userId=${userId}`, {});
}

// ==================== 文件模块 ====================

/**
 * 通用文件上传
 * 用于上传图片、视频等文件到 MinIO 存储
 * 
 * @param {string} filePath - 本地文件临时路径（从 uni.chooseImage 等API获取）
 * @returns {Promise<Object>} 返回包含文件URL的对象 { url: string, filename: string }
 * 
 * @example
 * // 选择图片并上传
 * uni.chooseImage({
 *   count: 1,
 *   success: async (res) => {
 *     const result = await apiUploadAction(res.tempFilePaths[0]);
 *     console.log('文件URL:', result.url);
 *   }
 * });
 */
export function apiUploadAction(filePath) {
	return new Promise((resolve, reject) => {
		// 参数校验：确保filePath是正确的字符串格式
		if (!filePath || typeof filePath !== 'string') {
			reject(new Error('Invalid file path'));
			return;
		}
		// 使用 uni.uploadFile 进行文件上传（小程序专用API）
		uni.uploadFile({
			url: BASE_URL + '/storage/upload/action',
			filePath,           // 要上传的文件路径
			name: 'file',       // 后端接收文件的字段名
			header: {
				// 携带 JWT Token 进行身份认证
				'Authorization': uni.getStorageSync('gym_token') ? `Bearer ${uni.getStorageSync('gym_token')}` : ''
			},
			success: (res) => {
				try {
					// 尝试解析 JSON 响应
					const data = JSON.parse(res.data || '{}');
					resolve(data);
				} catch (e) {
					// 非 JSON 响应，直接返回原始数据
					resolve(res.data);
				}
			},
			fail: reject        // 上传失败时拒绝 Promise
		});
	});
}

/**
 * 获取文件访问URL
 * 用于获取 MinIO 存储中文件的临时访问链接
 * 
 * @param {Object} params - 查询参数
 * @param {string} params.filename - 文件名
 * @returns {Promise<string>} 文件访问URL
 */
export function apiGetFileUrl(params) {
	return get('/storage/url', params);
}

// 头像上传
export function apiUploadAvatar(filePath) {
	return new Promise((resolve, reject) => {
		// 确保filePath是正确的字符串格式
		if (!filePath || typeof filePath !== 'string') {
			reject(new Error('Invalid file path'));
			return;
		}
		uni.uploadFile({
			url: BASE_URL + '/storage/upload/avatar',
			filePath,
			name: 'file',
			header: {
				'Authorization': uni.getStorageSync('gym_token') ? `Bearer ${uni.getStorageSync('gym_token')}` : ''
			},
			success: (res) => {
				try {
					const data = JSON.parse(res.data || '{}');
					resolve(data);
				} catch (e) {
					resolve(res.data);
				}
			},
			fail: reject
		});
	});
}

// 组内挑战
export function apiCreateGroupChallenge(data) {
	return post('/challenge/create-group-challenge', data);
}

export function apiGetGroupChallenges(groupId) {
	return get(`/challenge/group/${groupId}`);
}

// 挑战状态更新
export function apiUpdateChallengeStatus() {
	return post('/challenge/update-status', {});
}

// 课程相关接口
export function apiGetCourseList(page = 1, size = 10, courseType = null, difficulty = null) {
	let url = `/course/list?page=${page}&size=${size}`;
	if (courseType) url += `&courseType=${courseType}`;
	if (difficulty) url += `&difficulty=${difficulty}`;
	return get(url);
}

export function apiGetCourseById(id) {
	return get(`/course/${id}`);
}

export function apiGetRecommendCourses(limit = 6) {
	return get(`/course/recommend?limit=${limit}`);
}

export function apiGetCoursesByType(courseType, limit = 10) {
	return get(`/course/type/${courseType}?limit=${limit}`);
}

export function apiSearchCourses(keyword, page = 1, size = 10) {
	return get(`/course/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`);
}




