/**
 * ============================================
 * HTTP 请求封装模块
 * ============================================
 * 作用：
 * 1. 封装 uni.request，提供统一的 HTTP 请求接口
 * 2. 自动添加 JWT Token 到请求头
 * 3. 统一处理后端 ApiResponse 响应格式
 * 4. 统一处理错误（401未授权、网络异常等）
 * 5. 提供 GET/POST/PUT 等快捷方法
 * 
 * 后端 ApiResponse 结构：
 * {
 *   code: 0,          // 0-成功，非0-失败
 *   message: '成功', // 提示信息
 *   data: {}          // 实际数据
 * }
 * 
 * 注意事项：
 * - 所有接口调用都返回 Promise
 * - code=0 时解析为成功，直接返回 data 字段
 * - codeⅠ0 时显示 message 并 reject
 * - 401 未授权时自动清除 token 并跳转到登录页
 * ============================================
 */

import { BASE_URL } from './config.js';
import { getToken, clearToken } from './auth.js';

/**
 * 基础请求方法
 * @param {Object} options - 请求配置
 * @param {string} options.url - 请求URL（相对路径）
 * @param {string} options.method - 请求方法（GET/POST/PUT/DELETE）
 * @param {Object} options.data - 请求数据
 * @param {Object} options.header - 额外的请求头
 * @returns {Promise} 返回 Promise，成功时resolve data字段
 */

export function request({ url, method = 'GET', data = {}, header = {} }) {
	return new Promise((resolve, reject) => {
		// 获取本地存储的 JWT Token
		const token = getToken();
		
		// 构建请求头，默认使用 JSON 格式
		const finalHeader = Object.assign(
			{
				'Content-Type': 'application/json'
			},
			header
		);
		
		// 如果有 token，添加到请求头的 Authorization 字段
		if (token) {
			finalHeader['Authorization'] = 'Bearer ' + token;
		}

		// 发起 uni-app 请求
		uni.request({
			url: BASE_URL + url,  // 完整URL = 基础地址 + 相对路径
			method,
			data,
			header: finalHeader,
			success(res) {
				// 处理 401 未授权错误
				if (res.statusCode === 401) {
					clearToken();  // 清除过期的 token
					uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/auth/login' });  // 跳转到登录页
					}, 800);
					return reject(res);
				}
				
				// 解析响应体
				const body = res.data || {};
				
				// 统一按照 ApiResponse 结构解析
				if (typeof body.code === 'number') {
					if (body.code === 0) {
						// code=0 表示成功，直接返回 data 字段
						resolve(body.data);
					} else {
						// codeⅠ0 表示业务失败，显示错误信息
						uni.showToast({ title: body.message || '请求失败', icon: 'none' });
						reject(body);
					}
				} else {
					// 兼容非统一返回格式
					resolve(body);
				}
			},
			fail(err) {
				// 网络请求失败（如网络不通、超时等）
				uni.showToast({ title: '网络异常', icon: 'none' });
				reject(err);
			}
		});
	});
}

/**
 * GET 请求快捷方法
 * 自动将参数拼接到 URL 查询字符串中
 * 
 * 例如：get('/user/list', { page: 1, size: 10 })
 * 实际请求：GET /user/list?page=1&size=10
 * 
 * @param {string} url - 请求URL
 * @param {Object} params - 查询参数对象
 * @returns {Promise}
 */
export function get(url, params = {}) {
	// 对于GET请求，将参数附加到URL
	// 手动实现URL参数拼接，兼容小程序环境（不支持 URLSearchParams）
	const queryArray = [];
	for (const key in params) {
		if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
			// 使用 encodeURIComponent 编码，防止特殊字符引起问题
			queryArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
		}
	}
	const queryString = queryArray.join('&');
	const fullUrl = queryString ? `${url}?${queryString}` : url;
	return request({ url: fullUrl, method: 'GET' });
}

/**
 * POST 请求快捷方法
 * 参数会以 JSON 格式放在请求体中
 * 
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @returns {Promise}
 */
export function post(url, data = {}) {
	return request({ url, method: 'POST', data });
}

/**
 * PUT 请求快捷方法
 * 用于更新资源，参数以 JSON 格式放在请求体中
 * 
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @returns {Promise}
 */

export function put(url, data = {}) {
	return request({ url, method: 'PUT', data });
}

