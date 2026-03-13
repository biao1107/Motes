/**
 * ============================================
 * 用户认证与权限管理模块
 * ============================================
 * 作用：
 * 1. 管理用户 JWT Token（保存、获取、清除）
 * 2. 管理用户信息（本地缓存）
 * 3. 提供登录校验功能
 * 4. 从 JWT Token 中解析用户 ID
 * 
 * 存储机制：
 * - 使用 uni.setStorageSync 将数据保存到小程序本地存储
 * - Token 用于身份验证，每次请求都会带上
 * - 用户信息用于页面展示，减少接口调用
 * ============================================
 */

// 存储键名常量
const TOKEN_KEY = 'gym_token';           // JWT Token 存储键
const USER_INFO_KEY = 'gym_user_info';   // 用户信息存储键

/**
 * 保存 Token 到本地存储
 * @param {string} token - JWT Token字符串
 */
export function setToken(token) {
	uni.setStorageSync(TOKEN_KEY, token || '');
}

/**
 * 从本地存储获取 Token
 * @returns {string} JWT Token字符串，没有则返回空字符串
 */
export function getToken() {
	return uni.getStorageSync(TOKEN_KEY) || '';
}

/**
 * 清除本地存储的 Token
 * 用于登出或 Token 过期时
 */
export function clearToken() {
	uni.removeStorageSync(TOKEN_KEY);
}

/**
 * 从 JWT Token 中解析出用户 ID
 * 原理：JWT Token 由三部分组成：header.payload.signature
 * payload 部分包含用户信息，后端将 userId 放在 subject 字段中
 * 
 * @returns {number|null} 用户ID，解析失败返回null
 */
export function getUserIdFromToken() {
	const token = getToken();
	if (!token) return null;
	
	try {
		// JWT Token 格式：header.payload.signature
		const parts = token.split('.');
		if (parts.length < 2) return null;
		
		// 解码 payload 部分（Base64 编码）
		const payload = JSON.parse(
			decodeURIComponent(
				escape(
					atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
				)
			)
		);
		
		// 从 payload 中提取 subject（即 userId）
		return payload.sub ? Number(payload.sub) : null;
	} catch (e) {
		console.error('解析 Token 失败:', e);
		return null;
	}
}

/**
 * 保存用户信息到本地存储
 * @param {Object} userInfo - 用户信息对象（包含 nickname, fitnessLevel 等）
 */
export function setUserInfo(userInfo) {
	uni.setStorageSync(USER_INFO_KEY, userInfo || {});
}

/**
 * 从本地存储获取用户信息
 * @returns {Object} 用户信息对象
 */
export function getUserInfo() {
	return uni.getStorageSync(USER_INFO_KEY) || {};
}

/**
 * 获取用户昵称
 * 如果未设置昵称，则显示默认格式："用户{userId}"
 * @returns {string} 用户昵称
 */
export function getUserNickname() {
	const userInfo = getUserInfo();
	return userInfo.nickname || '用户' + getUserIdFromToken();
}

/**
 * 检查用户是否已登录
 * 未登录时会提示并跳转到登录页
 * 
 * 使用场景：
 * - 在需要登录才能访问的页面中调用
 * - 通常在 onLoad 或 onShow 生命周期中调用
 * 
 * @returns {boolean} true-已登录，false-未登录
 */
export function requireLogin() {
	const token = getToken();
	if (!token) {
		uni.showToast({ title: '请先登录', icon: 'none' });
		setTimeout(() => {
			uni.reLaunch({ url: '/pages/auth/login' });
		}, 500);
		return false;
	}
	return true;
}

