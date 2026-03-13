/**
 * ============================================
 * 原生 WebSocket 封装（用于小程序）
 * ============================================
 * 作用：
 * 为小程序提供原生 WebSocket 支持，替代 STOMP
 * 
 * 与 ws.js 的区别：
 * - ws.js：STOMP 协议，仅支持 H5
 * - ws-native.js：原生 WebSocket，支持小程序和 H5
 * 
 * 连接地址：ws://host:port/ws/native?token=xxx
 * ============================================
 */

import { getToken, getUserIdFromToken } from './auth.js';

// WebSocket 实例
let ws = null;
// 连接状态
let connected = false;
// 重连定时器
let reconnectTimer = null;
// 心跳定时器
let heartbeatTimer = null;
// 当前订阅的组ID
let subscribedGroupId = null;
// 消息回调函数
let messageCallback = null;

// 配置
const CONFIG = {
	// WebSocket 服务器地址
	WS_URL: 'ws://localhost:8080/ws/native',
	// 心跳间隔（毫秒）
	HEARTBEAT_INTERVAL: 30000,
	// 重连间隔（毫秒）
	RECONNECT_INTERVAL: 5000,
	// 最大重连次数
	MAX_RECONNECT: 5
};

// 当前重连次数
let reconnectCount = 0;

/**
 * 初始化 WebSocket 连接
 */
export function initNativeWebSocket() {
	return new Promise((resolve, reject) => {
		const token = getToken();
		if (!token) {
			console.error('[NativeWS] 未找到认证令牌');
			reject(new Error('未找到认证令牌'));
			return;
		}
		
		// 如果已连接，直接返回
		if (connected && ws) {
			console.log('[NativeWS] 已连接，无需重复初始化');
			resolve();
			return;
		}
		
		// 关闭旧连接
		if (ws) {
			ws.close();
		}
		
		// 创建 WebSocket 连接
		const url = `${CONFIG.WS_URL}?token=${encodeURIComponent(token)}`;
		console.log('[NativeWS] 连接:', url);
		
		// #ifdef H5
		ws = new WebSocket(url);
		// #endif
		
		// #ifdef MP-WEIXIN
		ws = uni.connectSocket({
			url: url,
			success: () => {
				console.log('[NativeWS] 小程序 WebSocket 连接创建成功');
			}
		});
		// #endif
		
		// 绑定事件
		bindEvents(resolve, reject);
	});
}

/**
 * 绑定 WebSocket 事件
 */
function bindEvents(resolve, reject) {
	// #ifdef H5
	ws.onopen = (event) => {
		onOpen(event, resolve);
	};
	ws.onmessage = (event) => {
		onMessage(event.data);
	};
	ws.onclose = (event) => {
		onClose(event);
	};
	ws.onerror = (error) => {
		onError(error, reject);
	};
	// #endif
	
	// #ifdef MP-WEIXIN
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
	// #endif
}

/**
 * 连接打开
 */
function onOpen(event, resolve) {
	console.log('[NativeWS] 连接成功');
	connected = true;
	reconnectCount = 0;
	
	// 启动心跳
	startHeartbeat();
	
	// 如果之前有订阅的组，重新订阅
	if (subscribedGroupId) {
		subscribeGroup(subscribedGroupId);
	}
	
	resolve();
}

/**
 * 收到消息
 */
function onMessage(data) {
	console.log('[NativeWS] 收到消息:', data);
	
	try {
		const message = JSON.parse(data);
		
		// 处理心跳响应
		if (message.type === 'pong') {
			return;
		}
		
		// 处理连接成功消息
		if (message.type === 'CONNECTED') {
			console.log('[NativeWS] 服务器确认连接:', message.message);
			return;
		}
		
		// 处理订阅成功消息
		if (message.type === 'SUBSCRIBED') {
			console.log('[NativeWS] 订阅成功:', message.groupId);
			return;
		}
		
		// 其他消息通过回调通知业务层
		if (messageCallback) {
			messageCallback(message);
		}
		
		// 同时通过 uni.$emit 广播，兼容旧代码
		uni.$emit('ws-native-message', message);
		
	} catch (e) {
		console.error('[NativeWS] 解析消息失败:', e);
	}
}

/**
 * 连接关闭
 */
function onClose(event) {
	console.log('[NativeWS] 连接关闭:', event);
	connected = false;
	stopHeartbeat();
	
	// 自动重连
	if (reconnectCount < CONFIG.MAX_RECONNECT) {
		reconnectCount++;
		console.log(`[NativeWS] ${CONFIG.RECONNECT_INTERVAL / 1000}秒后重连 (${reconnectCount}/${CONFIG.MAX_RECONNECT})`);
		reconnectTimer = setTimeout(() => {
			initNativeWebSocket().catch(() => {});
		}, CONFIG.RECONNECT_INTERVAL);
	} else {
		console.error('[NativeWS] 重连次数已达上限');
	}
}

/**
 * 连接错误
 */
function onError(error, reject) {
	console.error('[NativeWS] 连接错误:', error);
	if (reject) {
		reject(error);
	}
}

/**
 * 订阅组频道
 */
export function subscribeGroup(groupId) {
	if (!ws || !connected) {
		console.warn('[NativeWS] 未连接，无法订阅');
		// 保存组ID，连接成功后自动订阅
		subscribedGroupId = groupId;
		return false;
	}
	
	subscribedGroupId = groupId;
	
	const message = {
		action: 'subscribe',
		groupId: groupId
	};
	
	sendMessage(message);
	console.log('[NativeWS] 发送订阅请求:', groupId);
	return true;
}

/**
 * 取消订阅
 */
export function unsubscribeGroup() {
	if (!ws || !connected) {
		return;
	}
	
	const message = {
		action: 'unsubscribe'
	};
	
	sendMessage(message);
	subscribedGroupId = null;
	console.log('[NativeWS] 取消订阅');
}

/**
 * 设置消息回调
 */
export function setMessageCallback(callback) {
	messageCallback = callback;
}

/**
 * 发送消息
 */
function sendMessage(message) {
	if (!ws || !connected) {
		console.warn('[NativeWS] 未连接，无法发送消息');
		return false;
	}
	
	try {
		const json = JSON.stringify(message);
		
		// #ifdef H5
		ws.send(json);
		// #endif
		
		// #ifdef MP-WEIXIN
		ws.send({
			data: json
		});
		// #endif
		
		return true;
	} catch (e) {
		console.error('[NativeWS] 发送消息失败:', e);
		return false;
	}
}

/**
 * 启动心跳
 */
function startHeartbeat() {
	stopHeartbeat();
	heartbeatTimer = setInterval(() => {
		sendMessage({ action: 'ping' });
	}, CONFIG.HEARTBEAT_INTERVAL);
}

/**
 * 停止心跳
 */
function stopHeartbeat() {
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}
}

/**
 * 断开连接
 */
export function disconnect() {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
	
	stopHeartbeat();
	
	// 只有在有连接且已连接状态下才尝试关闭
	if (ws && connected) {
		try {
			// #ifdef H5
			ws.close();
			// #endif
			
			// #ifdef MP-WEIXIN
			uni.closeSocket();
			// #endif
		} catch (e) {
			console.log('[NativeWS] 关闭连接时发生异常:', e.message);
		}
	}
	
	ws = null;
	connected = false;
	subscribedGroupId = null;
	messageCallback = null;
	reconnectCount = 0;
	
	console.log('[NativeWS] 已断开连接');
}

/**
 * 获取连接状态
 */
export function isConnected() {
	return connected;
}

/**
 * 获取当前订阅的组ID
 */
export function getSubscribedGroupId() {
	return subscribedGroupId;
}
