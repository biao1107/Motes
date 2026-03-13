/**
 * ============================================
 * Gym 健身搭子小程序 - 应用入口文件
 * ============================================
 * 作用：
 * 1. 初始化 uni-app 应用实例
 * 2. 支持 Vue2 和 Vue3 两种模式
 * 3. 挂载应用到小程序运行时
 * 
 * 技术栈：
 * - uni-app：跨平台开发框架
 * - Vue.js：前端框架
 * ============================================
 */

import App from './App'

// #ifndef VUE3
// ====== Vue2 模式 ======
import Vue from 'vue'
import './uni.promisify.adaptor'  // uni-app API Promise 化适配器

// 关闭生产提示
Vue.config.productionTip = false

// 设置应用类型为 app
App.mpType = 'app'

// 创建 Vue 实例
const app = new Vue({
  ...App
})

// 挂载应用
app.$mount()
// #endif

// #ifdef VUE3
// ====== Vue3 模式 ======
import { createSSRApp } from 'vue'

/**
 * 创建 SSR 应用实例
 * SSR（Server-Side Rendering）服务端渲染，提升首屏加载速度
 */
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif