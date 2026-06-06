/**
 * ============================================
 * API 鎺ュ彛灏佽妯″潡
 * ============================================
 * 浣滅敤锛?
 * 灏佽鎵€鏈夊悗绔帴鍙ｈ皟鐢紝鎻愪緵缁熶竴鐨?API 璋冪敤鏂瑰紡
 * 
 * 妯″潡鍒嗙被锛?
 * 1. 璁よ瘉妯″潡锛氭敞鍐屻€佺櫥褰曘€侀獙璇佺爜
 * 2. 鐢ㄦ埛妯″潡锛氱敤鎴蜂俊鎭€佹。妗堢鐞?
 * 3. 鍖归厤妯″潡锛氬仴韬惌瀛愬尮閰?
 * 4. 缁勭鐞嗘ā鍧楋細鍒涘缓缁勩€侀個璇锋垚鍛樸€佺粍璇︽儏
 * 5. 璁粌妯″潡锛氳缁冭褰曘€佹墦鍗?
 * 6. 鎸戞垬妯″潡锛氬垱寤烘寫鎴樸€佸姞鍏ユ寫鎴樸€佹墦鍗?
 * 7. 缁熻妯″潡锛氫釜浜虹粺璁°€佺粍缁熻銆佹寫鎴樼粺璁?
 * 8. 鑱婂ぉ妯″潡锛氳亰澶╁巻鍙层€佹湭璇绘秷鎭?
 * 9. 鏂囦欢妯″潡锛氭枃浠朵笂浼犮€佸ご鍍忎笂浼?
 * 10. 璇剧▼妯″潡锛氳绋嬪垪琛ㄣ€佽绋嬭鎯呫€佹帹鑽愯绋?
 * 
 * 娉ㄦ剰浜嬮」锛?
 * - 鎵€鏈夊嚱鏁拌繑鍥?Promise
 * - 璇锋眰鎴愬姛鏃剁洿鎺ヨ繑鍥?data 瀛楁
 * - 璇锋眰澶辫触鏃朵細鑷姩鏄剧ず閿欒淇℃伅
 * ============================================
 */

import { get, post, put } from './http.js';
import { BASE_URL } from './config.js';

// ==================== 璁よ瘉妯″潡 ====================

/**
 * 鐢ㄦ埛娉ㄥ唽
 * @param {Object} data - 娉ㄥ唽淇℃伅
 * @param {string} data.username - 鐢ㄦ埛鍚?
 * @param {string} data.password - 瀵嗙爜
 * @param {string} data.phone - 鎵嬫満鍙?
 * @returns {Promise}
 */
export function apiRegister(data) {
	return post('/auth/register', data);
}

/**
 * 瀵嗙爜鐧诲綍
 * @param {Object} data - 鐧诲綍淇℃伅
 * @param {string} data.username - 鐢ㄦ埛鍚?
 * @param {string} data.password - 瀵嗙爜
 * @returns {Promise<{token: string}>} 杩斿洖 JWT Token
 */
export function apiLoginByPassword(data) {
	return post('/auth/login', data);
}

/**
 * 楠岃瘉鐮佺櫥褰?
 * @param {Object} data - 鐧诲綍淇℃伅
 * @param {string} data.phone - 鎵嬫満鍙?
 * @param {string} data.code - 楠岃瘉鐮?
 * @returns {Promise<{token: string}>}
 */
export function apiLoginByCode(data) {
	return post('/auth/login/code', data);
}

/**
 * 鍙戦€侀獙璇佺爜
 * @param {Object} data - 璇锋眰淇℃伅
 * @param {string} data.phone - 鎵嬫満鍙?
 * @returns {Promise}
 */
export function apiSendCode(data) {
	return post('/auth/send-code', data);
}

// ==================== 鐢ㄦ埛妯″潡 ====================

/**
 * 鑾峰彇鐢ㄦ埛妗ｆ锛堣缁嗕俊鎭級
 * @returns {Promise<Object>} 鐢ㄦ埛妗ｆ瀵硅薄
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

// 鍖归厤
export function apiGetTopMatch(limit = 3) {
	return get(`/match/top?limit=${limit}`);
}

// 缁勭鐞?
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

// 璁粌
export function apiTrainingStart(data) {
	return post('/training/start', data);
}

export function apiTrainingReport(data) {
	return post('/training/report', data);
}

export function apiTrainingAbandon(data) {
	return post('/training/abandon', data);
}

// 鏂板锛氭寫鎴樻墦鍗℃帴鍙?
export function apiTrainingPunchChallenge(data) {
	return post('/challenge/punch', data);
}

// 鏂板锛氳幏鍙栫敤鎴锋寫鎴樺垪琛ㄦ帴鍙?
export function apiGetUserTrainingChallenges(params) {
	return get('/training/user-challenges', params);
}

// 鏂板锛氳幏鍙栦粖鏃ヨ缁冭褰?
export function apiGetTodayTraining() {
	return get('/training/today');
}

// 鏂板锛氳幏鍙栦粖鏃ュ緟鍔炶缁冧换鍔℃暟閲?
export function apiGetTodoCount() {
	return get('/training/todo/count');
}

// 鎸戞垬
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

// 缁熻
export function apiStatPersonal() {
	return get('/stat/personal');
}

// 棣栭〉缁熻鏁版嵁
export function apiStatHome() {
	return get('/stat/home');
}

export function apiStatGroup(params) {
	return get('/stat/group', params);
}

export function apiStatChallenge(params) {
	return get('/stat/challenge', params);
}

// 鑱婂ぉ
export function apiGetGroupChatHistory(groupId, limit = 50) {
	return get(`/chat/group/${groupId}/history?limit=${limit}`);
}

export function apiGetLatestMessages(groupId, lastMessageId) {
	return get(`/chat/group/${groupId}/latest?lastMessageId=${lastMessageId}`);
}

// 鑾峰彇鏈娑堟伅鏁伴噺
export function apiGetUnreadCount(userId) {
	return get(`/chat/unread/count?userId=${userId}`);
}

// 鑾峰彇鏈娑堟伅璇︽儏鍒楄〃
export function apiGetUnreadDetail(userId) {
	return get(`/chat/unread/detail?userId=${userId}`);
}

// 鏍囪缇ょ粍娑堟伅涓哄凡璇?
export function apiMarkGroupRead(groupId, userId) {
	return post(`/chat/group/${groupId}/read?userId=${userId}`, {});
}

// 鍙戦€佽亰澶╂秷鎭紙灏忕▼搴忎笓鐢℉TTP鎺ュ彛锛?
export function apiSendChatMessage(data) {
	return post('/chat/send', data);
}

// ==================== 鏂囦欢妯″潡 ====================

/**
 * 閫氱敤鏂囦欢涓婁紶
 * 鐢ㄤ簬涓婁紶鍥剧墖銆佽棰戠瓑鏂囦欢鍒?MinIO 瀛樺偍
 * 
 * @param {string} filePath - 鏈湴鏂囦欢涓存椂璺緞锛堜粠 uni.chooseImage 绛堿PI鑾峰彇锛?
 * @returns {Promise<Object>} 杩斿洖鍖呭惈鏂囦欢URL鐨勫璞?{ url: string, filename: string }
 * 
 * @example
 * // 閫夋嫨鍥剧墖骞朵笂浼?
 * uni.chooseImage({
 *   count: 1,
 *   success: async (res) => {
 *     const result = await apiUploadAction(res.tempFilePaths[0]);
 *     console.log('鏂囦欢URL:', result.url);
 *   }
 * });
 */
export function apiUploadAction(filePath) {
	return new Promise((resolve, reject) => {
		// 鍙傛暟鏍￠獙锛氱‘淇漟ilePath鏄纭殑瀛楃涓叉牸寮?
		if (!filePath || typeof filePath !== 'string') {
			reject(new Error('Invalid file path'));
			return;
		}
		// 浣跨敤 uni.uploadFile 杩涜鏂囦欢涓婁紶锛堝皬绋嬪簭涓撶敤API锛?
		uni.uploadFile({
			url: BASE_URL + '/storage/upload/action',
			filePath,           // 瑕佷笂浼犵殑鏂囦欢璺緞
			name: 'file',       // 鍚庣鎺ユ敹鏂囦欢鐨勫瓧娈靛悕
			header: {
				// 鎼哄甫 JWT Token 杩涜韬唤璁よ瘉
				'Authorization': uni.getStorageSync('gym_token') ? `Bearer ${uni.getStorageSync('gym_token')}` : ''
			},
			success: (res) => {
				try {
					// 灏濊瘯瑙ｆ瀽 JSON 鍝嶅簲
					const data = JSON.parse(res.data || '{}');
					resolve(data);
				} catch (e) {
					// 闈?JSON 鍝嶅簲锛岀洿鎺ヨ繑鍥炲師濮嬫暟鎹?
					resolve(res.data);
				}
			},
			fail: reject        // 涓婁紶澶辫触鏃舵嫆缁?Promise
		});
	});
}

/**
 * 鑾峰彇鏂囦欢璁块棶URL
 * 鐢ㄤ簬鑾峰彇 MinIO 瀛樺偍涓枃浠剁殑涓存椂璁块棶閾炬帴
 * 
 * @param {Object} params - 鏌ヨ鍙傛暟
 * @param {string} params.filename - 鏂囦欢鍚?
 * @returns {Promise<string>} 鏂囦欢璁块棶URL
 */
export function apiGetFileUrl(params) {
	return get('/storage/url', params);
}

// 澶村儚涓婁紶
export function apiUploadAvatar(filePath) {
	return new Promise((resolve, reject) => {
		// 纭繚filePath鏄纭殑瀛楃涓叉牸寮?
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

// 缁勫唴鎸戞垬
export function apiCreateGroupChallenge(data) {
	return post('/challenge/create-group-challenge', data);
}

export function apiGetGroupChallenges(groupId) {
	return get(`/challenge/group/${groupId}`);
}

// 鎸戞垬鐘舵€佹洿鏂?
export function apiUpdateChallengeStatus() {
	return post('/challenge/update-status', {});
}

// 璇剧▼鐩稿叧鎺ュ彛
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

// ==================== AI 鍋ヨ韩椤鹃棶 ====================

export function apiAiUnifiedChat(data) {
	return post('/ai/chat-unified', data);
}

export function apiAiUploadActionImage(filePath) {
	return new Promise((resolve, reject) => {
		if (!filePath || typeof filePath !== 'string') {
			reject(new Error('Invalid file path'));
			return;
		}

		uni.uploadFile({
			url: BASE_URL + '/ai/upload-action-image',
			filePath,
			name: 'file',
			header: {
				'Authorization': uni.getStorageSync('gym_token') ? `Bearer ${uni.getStorageSync('gym_token')}` : ''
			},
			success: (res) => {
				try {
					const body = JSON.parse(res.data || '{}');
					if (typeof body.code === 'number') {
						if (body.code === 0) {
							resolve(body.data);
						} else {
							uni.showToast({ title: body.message || '涓婁紶澶辫触', icon: 'none' });
							reject(body);
						}
						return;
					}
					resolve(body);
				} catch (error) {
					resolve(res.data);
				}
			},
			fail: reject
		});
	});
}