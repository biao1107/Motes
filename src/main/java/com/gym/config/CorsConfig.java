package com.gym.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * ============================================
 * 全局跨域（CORS）配置
 * ============================================
 *
 * 【什么是跨域？】
 * 浏览器有一个"同源策略"：只有协议、域名、端口完全相同，才算"同源"。
 * 如果不同源，浏览器会拒绝 JavaScript 发起的请求，这就是"跨域"问题。
 *
 * 例如：
 * - 前端：http://localhost:5173（Vue 开发服务器）
 * - 后端：http://localhost:8080（Spring Boot）
 * 端口不同（5173 vs 8080），所以属于跨域，浏览器会拦截请求。
 *
 * 【CORS 如何解决跨域？】
 * CORS（Cross-Origin Resource Sharing，跨域资源共享）是 W3C 标准。
 * 服务器在响应头中添加 Access-Control-Allow-Origin 等字段，
 * 告诉浏览器"我允许这个来源访问"，浏览器就不再拦截。
 *
 * 【为什么小程序不需要配 CORS？】
 * CORS 是浏览器的限制，小程序不是浏览器，没有同源策略，不受影响。
 * 小程序的请求限制由微信平台管理（需在后台配置合法域名）。
 *
 * 【开发 vs 生产环境】
 * - 开发环境：放开所有来源（"*"），方便调试
 * - 生产环境：应替换为具体域名，如 "https://www.yourdomain.com"，提高安全性
 * ============================================
 */
@Configuration
public class CorsConfig {

    /**
     * 创建全局 CORS 过滤器
     *
     * 【CorsFilter 的工作原理】
     * 它是一个 Servlet 过滤器，在请求到达 Controller 之前拦截所有请求，
     * 检查是否跨域，并在响应头中添加 CORS 相关字段。
     *
     * 【OPTIONS 预检请求】
     * 浏览器在发送"复杂请求"（如带 Authorization 头的 POST）前，
     * 会先发一个 OPTIONS 请求询问服务器是否允许。
     * CorsFilter 会自动处理这个预检请求并返回正确的响应头。
     *
     * @return 配置好的 CORS 过滤器 Bean
     */
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // 允许的请求来源（"*" 表示所有来源，生产环境改为具体域名）
        // 注意：不能同时使用 addAllowedOrigin("*") 和 setAllowCredentials(true)，
        // 必须用 addAllowedOriginPattern("*") 才能两者共存
        config.addAllowedOriginPattern("*");

        // 允许携带凭证（Cookie、Authorization 头等）
        // 设为 true 后，前端需用 axios.defaults.withCredentials = true
        config.setAllowCredentials(true);

        // 允许所有请求头（如 Authorization、Content-Type 等）
        config.addAllowedHeader("*");

        // 允许所有 HTTP 方法（GET、POST、PUT、DELETE、OPTIONS 等）
        config.addAllowedMethod("*");

        // 将该配置应用到所有路径（"/**" 匹配所有 URL）
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}

