import { getToken, getUserIdFromToken } from './auth.js';

// 检测运行环境
const isH5 = typeof window !== 'undefined' && typeof document !== 'undefined';
const isMiniProgram = typeof wx !== 'undefined' && wx.getSystemInfoSync;

// 使用全局变量存储STOMP库
let Stomp = null;

// 在H5环境下初始化STOMP库
if (isH5 && typeof window !== 'undefined') {
	Stomp = window.Stomp;
}

// 初始化STOMP库（仅H5环境）
async function initStomp() {
	// 小程序环境暂不支持WebSocket STOMP
	if (isMiniProgram) {
		console.warn('小程序环境暂不支持WebSocket STOMP');
		return Promise.reject(new Error('小程序环境暂不支持WebSocket STOMP'));
	}
	
	// 如果STOMP库已经存在，直接返回
	if (Stomp && typeof Stomp.over === 'function') {
		return Stomp;
	}
	
	// 如果已经在加载中，返回同一个Promise
	if (window._stompLoadingPromise) {
		return window._stompLoadingPromise;
	}
	
	// 创建加载Promise
	window._stompLoadingPromise = new Promise((resolve, reject) => {
		// 创建script标签加载本地STOMP库
		const script = document.createElement('script');
		script.src = '/static/js/stomp.umd.min.js';
		script.onload = () => {
			// 尝试多种方式获取Stomp对象
			Stomp = window.Stomp || window["Stomp"] || window["@stomp/stompjs"];
			if (Stomp && typeof Stomp.over === 'function') {
				console.log('STOMP库加载成功');
				resolve(Stomp);
			} else {
				console.error('STOMP库加载失败，未找到Stomp对象');
				reject(new Error('STOMP库加载失败，未找到Stomp对象'));
			}
			// 清理加载Promise
			window._stompLoadingPromise = null;
		};
		script.onerror = (error) => {
			console.error('STOMP库加载失败:', error);
			reject(new Error('STOMP库加载失败'));
			// 清理加载Promise
			window._stompLoadingPromise = null;
		};
		document.head.appendChild(script);
	});
	
	return window._stompLoadingPromise;
}

let stompClient = null;
let connected = false;
let subscription = null;
let heartbeatTimer = null;

// 消息监听者
let messageListeners = [];

// 添加消息监听者
export function addMessageListener(callback) {
	messageListeners.push(callback);
}

// 移除消息监听者
export function removeMessageListener(callback) {
	const index = messageListeners.indexOf(callback);
	if (index > -1) {
		messageListeners.splice(index, 1);
	}
}

// 广播消息
function broadcastMessage(payload) {
	messageListeners.forEach(callback => {
		try {
			callback(payload);
		} catch (e) {
			console.error('消息监听者处理失败:', e);
		}
	});
}

// 初始化WebSocket连接
export async function initWebSocket() {
	// 小程序环境不支持STOMP，直接返回，不报错
	if (isMiniProgram) {
		console.log('小程序环境，跳过WebSocket STOMP初始化');
		return Promise.resolve();
	}
	
	try {
		// 确保STOMP库已加载
		await initStomp();
		
		if (stompClient && connected) {
			console.log('WebSocket已连接，无需重复初始化');
			return Promise.resolve();
		}
		
		const token = getToken();
		if (!token) {
			console.error('未找到认证令牌，无法初始化WebSocket');
			return Promise.reject(new Error('未找到认证令牌'));
		}
		
		// 检查Stomp是否已正确定义
		if (!Stomp || typeof Stomp.over !== 'function') {
			console.error('STOMP库未正确定义:', Stomp);
			return Promise.reject(new Error('STOMP库未正确定义'));
		}
		
		return new Promise((resolve, reject) => {
			// 创建WebSocket连接，添加更多连接参数
			// 根据当前页面协议确定WebSocket协议
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const wsUrl = `${protocol}//${window.location.hostname}:8080/ws?token=${encodeURIComponent(token)}`;
			const socket = new WebSocket(wsUrl, [
				'v12.stomp',
				'v11.stomp',
				'v10.stomp'
			]);
			
			// 创建STOMP客户端
			stompClient = Stomp.over(socket);
			stompClient.debug = null; // 禁用调试日志
			
			// 设置连接超时
			const timeout = setTimeout(() => {
				console.error('WebSocket连接超时');
				cleanupConnection();
				reject(new Error('WebSocket连接超时'));
			}, 15000); // 增加到15秒超时
			
			// 连接到STOMP服务器，添加更多连接头
			const connectHeaders = {
				'Authorization': `Bearer ${token}`,
				'heart-beat': '30000,30000', // 心跳设置
				'accept-version': '1.1,1.2'
			};
			
			stompClient.connect(connectHeaders, (frame) => {
				clearTimeout(timeout);
				console.log('WebSocket连接成功:', frame);
				connected = true;
				
				// 启动心跳检测
				startHeartbeat();
				
				// 监听WebSocket关闭事件
				socket.onclose = (event) => {
					console.log('WebSocket连接已关闭:', event);
					cleanupConnection();
				};
				
				// 监听WebSocket错误事件
				socket.onerror = (error) => {
					console.error('WebSocket错误:', error);
					cleanupConnection();
				};
				
				// 连接成功后，订阅个人消息
				setTimeout(() => {
					subscribeUserMessages((payload) => {
						// 通过广播机制处理消息，将消息广播给所有监听者
						broadcastMessage(payload);
					});
				}, 100);
				
				// 连接成功后，可以在这里添加全局订阅逻辑
				resolve(frame);
			}, (error) => {
				clearTimeout(timeout);
				console.error('WebSocket连接失败:', error);
				cleanupConnection();
				reject(error);
			});
		});
	} catch (error) {
		console.error('初始化WebSocket时发生异常:', error);
		return Promise.reject(error);
	}
}

// 启动心跳检测
function startHeartbeat() {
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
	}
	
	heartbeatTimer = setInterval(() => {
		if (stompClient && stompClient.connected) {
			try {
				// 发送心跳
				stompClient.send('/app/heartbeat', {}, '{}');
			} catch (e) {
				console.error('心跳检测失败:', e);
				cleanupConnection();
			}
		} else {
			console.log('STOMP客户端未连接，清理连接状态');
			cleanupConnection();
		}
	}, 30000); // 每30秒发送一次心跳
}

// 清理连接状态
function cleanupConnection() {
	connected = false;
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}
	console.log('WebSocket连接状态已清理');
}

// 发送STOMP帧
function sendFrame(command, headers, body) {
	if (!stompClient || !connected) {
		console.error('WebSocket未连接，无法发送消息');
		return;
	}
	
	try {
		// 确保headers对象存在destination属性
		if (!headers.destination) {
			console.error('缺少destination属性');
			return;
		}
		
		stompClient.send(headers.destination, headers, body);
		console.log('STOMP帧发送成功:', command, headers, body);
	} catch (e) {
		console.error('STOMP帧发送失败:', e);
		cleanupConnection();
	}
}

// 订阅组聊天消息
export function subscribeGroupChat(groupId, callback) {
	// 小程序环境不支持
	if (isMiniProgram) {
		console.log('小程序环境，不支持订阅组聊天');
		return null;
	}
	
	if (!stompClient || !connected) {
		console.error('WebSocket未连接，无法订阅消息');
		return null;
	}
	
	const token = getToken();
	const destination = `/topic/group/${groupId}`;
	console.log('订阅组聊天消息:', destination);
	
	// 在订阅时传递认证信息和其他头部
	const headers = {
		'Authorization': `Bearer ${token}`,
		'content-type': 'application/json'
	};
	
	return stompClient.subscribe(destination, (message) => {
		console.log('收到组聊天消息:', message);
		try {
			const payload = JSON.parse(message.body);
			callback(payload);
		} catch (e) {
			console.error('解析消息失败:', e);
		}
	}, headers);
}

// 发送聊天消息
export function sendChatMessage(groupId, content, imageUrl = '', type = 'TEXT') {
	// 小程序环境不支持
	if (isMiniProgram) {
		console.log('小程序环境，不支持发送聊天消息');
		return;
	}
	
	if (!stompClient || !connected) {
		console.error('WebSocket未连接，无法发送聊天消息');
		return;
	}
	
	doSendChatMessage(groupId, content, imageUrl, type);
}

function doSendChatMessage(groupId, content, imageUrl = '', type = 'TEXT') {
	const token = getToken();
	const message = {
		groupId: parseInt(groupId),
		content: content,
		imageUrl: imageUrl,
		type: type
	};
	
	// 发送STOMP消息到聊天端点
	const destination = '/app/group/chat';
	const headers = {
		'destination': destination,
		'Authorization': `Bearer ${token}`,  // 使用标准的Authorization头部
		'content-type': 'application/json'
	};
	const body = JSON.stringify(message);
	
	console.log('发送聊天消息:', destination, headers, body);
	sendFrame('SEND', headers, body);
}

// 断开WebSocket连接
export function disconnect() {
	// 小程序环境不需要处理
	if (isMiniProgram) {
		return;
	}
	
	// 如果没有连接，直接返回，避免报错
	if (!stompClient || !connected) {
		console.log('WebSocket未连接，无需断开');
		return;
	}
	
	try {
		stompClient.disconnect(() => {
			console.log('WebSocket连接已断开');
			cleanupConnection();
		});
	} catch (e) {
		console.log('断开WebSocket时发生异常（可能连接已关闭）:', e.message);
		cleanupConnection();
	}
}

// 检查WebSocket连接状态
export function isConnected() {
	// 小程序环境始终返回false
	if (isMiniProgram) {
		return false;
	}
	
	// 额外检查STOMP客户端的实际连接状态
	if (connected && stompClient && stompClient.connected) {
		return true;
	} else if (connected) {
		// 如果我们认为已连接，但STOMP客户端未连接，则清理状态
		console.log('检测到连接状态不一致，清理连接状态');
		cleanupConnection();
		return false;
	}
	return false;
}

// 订阅个人消息
let userSubscription = null;
export function subscribeUserMessages(callback) {
	// 小程序环境不支持
	if (isMiniProgram) {
		console.log('小程序环境，不支持订阅个人消息');
		return null;
	}
	
	if (!stompClient || !connected) {
		console.error('WebSocket未连接，无法订阅个人消息');
		return null;
	}
	
	// 如果已经有订阅，先取消之前的订阅
	if (userSubscription) {
		console.log('取消之前的个人消息订阅');
		userSubscription.unsubscribe();
		userSubscription = null;
	}
	
	const token = getToken();
	const userId = getUserIdFromToken();
	if (!userId) {
		console.error('无法获取用户ID，无法订阅个人消息');
		return null;
	}
	
	const destination = `/user/${userId}/notification`;
	console.log('订阅个人消息:', destination);
	
	// 在订阅时传递认证信息和其他头部
	const headers = {
		'Authorization': `Bearer ${token}`,
		'content-type': 'application/json'
	};
	
	userSubscription = stompClient.subscribe(destination, (message) => {
		console.log('收到个人消息:', message);
		try {
			const payload = JSON.parse(message.body);
			// 广播消息到所有监听者
			broadcastMessage(payload);
			callback(payload);
		} catch (e) {
			console.error('解析个人消息失败:', e);
		}
	}, headers);
	
	return userSubscription;
}

// 取消订阅个人消息
export function unsubscribeUserMessages() {
	// 小程序环境不需要处理
	if (isMiniProgram) {
		return;
	}
	
	if (userSubscription) {
		userSubscription.unsubscribe();
		userSubscription = null;
	}
}